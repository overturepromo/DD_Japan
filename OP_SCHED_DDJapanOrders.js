/*
 *Author: Jacob Goodall
 *Date: 03/01/2022
 *Description: Scheduled Script to send Sales Orders to DoorDash Japan
 */



/*
High Level
-Load a saved search
-Loop through results
-Load records
-Create payload, send to third party. 
-Send Payload
-Evaluate response from third party, handle accordingly.
*/
function sendSO() {

  //define header object for nlapiRequestURL() call
  var header = {
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/json'
    // 'Authorization': '9661B173-E407-4793-9BC3-E7896554DAE6'
  };

  //DoorDash Japan Orders to Send via Integration
  var results = nlapiSearchRecord('salesorder', 'customsearch4722');

  if (results) {

    var checkGovernance = function () {

      var governanceThreshold = 500;
      var context = nlapiGetContext();

      if (context.getRemainingUsage() < governanceThreshold) {

        try {

          var script = nlapiScheduleScript('customscript_op_sched_doordashaustralia');

          if (script == 'QUEUED') {
            nlapiLogExecution('ERROR', 'Re-scheduling due to governance', 'Successful re-schedule.');
            return true;
          } else {
            nlapiLogExecution('ERROR', 'Problem re-scheduling.', e.code + ' : ' + e.message);
            return true;
          }

        } catch (e) {
          nlapiLogExecution('ERROR', 'Problem re-scheduling.', e.code + ' : ' + e.message);
          return true;
        }
      } else {
        return false;
      }

    };

    //check if ALL of the items are backordered
    /*****  REVIEW THIS   *******/
    var allBackordered = function (rec) {
      for (var i = 1; i <= rec.getLineItemCount('item'); i++) {
        if (rec.getLineItemValue('item', 'quantitycommitted', i) > 0) {
          return false;
        }
      }
      return true;
    };

    var dateConversion = function (date) {
      //convert date to YYYY-MM-DDT00:00:00
      var dateObject = nlapiStringToDate(date);
      var dateMonth = null;
      var dateDay = null;
      if ((dateObject.getMonth() + 1).toString().length < 2) {
        dateMonth = '0' + (dateObject.getMonth() + 1).toString();
      } else {
        dateMonth = (dateObject.getMonth() + 1).toString();
      }
      if ((dateObject.getDate()).toString().length < 2) {
        dateDay = '0' + (dateObject.getDate()).toString();
      } else {
        dateDay = (dateObject.getDate()).toString();
      }
      return dateObject.getFullYear() + '-' + dateMonth + '-' + dateDay + 'T00:00:00';
    };

    for (var i = 0; i < results.length; i++) {

      try {

        var rec = null;
        var docNumber = null;

        var payload = {
          tranid: "",
          internalid: "",
          name: "",
          email: "",
          shipaddressee: "",
          shipattention: "",
          shipphone: "",
          shipaddr1: "",
          shipaddr2: "",
          shipaddr3: "",
          shipcity: "",
          shipstate: "",
          shipzip: "",
          shipcountry: "",
          items: []
        }

        var backorderedLines = {
          lines: []
        };

        rec = nlapiLoadRecord('salesorder', results[i].getId());

        //Do we need this? No customer reference in the payload. Maybe important
        if (allBackordered(rec)) {
          docNumber = rec.getFieldValue('tranid') + '-BO';
          //payload.CustomerReference = docNumber;
        } else {
          docNumber = rec.getFieldValue('tranid');
          //payload.CustomerReference = docNumber;
        }

        payload.tranid = rec.getFieldValue("tranid");
        payload.internalid = rec.id;
        payload.name = rec.getFieldValue("custbody_customer_name");
        payload.email = rec.getFieldValue('custbody_customer_email');
        payload.shipaddressee = rec.getFieldValue('shipaddressee');
        payload.shipattention = rec.getFieldValue('shipattention');
        payload.shipphone = rec.getFieldValue('custbody_shiptophone');
        payload.shipaddr1 = rec.getFieldValue("shipaddr1");
        payload.shipaddr2 = rec.getFieldValue("shipaddr2");
        payload.shipaddr3 = rec.getFieldValue("shipaddr3");
        payload.shipcity = rec.getFieldValue('shipcity');
        payload.shipstate = rec.getFieldValue('shipstate');
        payload.shipzip = rec.getFieldValue('shipzip');
        payload.shipcountry = rec.getFieldValue('shipcountry');
        

        for (var x = 1; x <= rec.getLineItemCount('item'); x++) {
          var item = rec.getLineItemText('item', 'item', x);
          //check if backordered
          if (rec.getLineItemValue('item', 'quantitybackordered', x) < 1) {
            //exclude DDHAU-FRT and DDH-FRT
            if (rec.getLineItemValue('item', 'item', x) !== '337433' && rec.getLineItemValue('item', 'item', x) !== '215188') {
              //check if matrix item, strip out parent item if so
              if (item.indexOf(':') !== -1) {
                item = item.substring(item.indexOf(':') + 2);
              }
              payload.items.push({
                sku: item,
                quantity: Number(rec.getLineItemValue('item', 'quantitycommitted', x))
              });
            }

          } else {
            //check if matrix item, strip out parent item if so
            if (item.indexOf(':') !== -1) {
              item = item.substring(item.indexOf(':') + 2);
            }
            backorderedLines.lines.push({
              sku: item,
              quantity: Number(rec.getLineItemValue('item', 'quantitybackordered', x))
            });
          }
        }

        if (payload.items.length > 0) {

          rec.setFieldValue('custbody_ariba_cxml_message', JSON.stringify(payload));
          nlapiLogExecution('AUDIT', 'Outbound Payload', JSON.stringify(payload));

            var response = nlapiRequestURL(
              'https://544356-sb2.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=1745&deploy=1',
              JSON.stringify(payload),
              header,
              null,
              'POST'
            );

            var resCode = response.getCode();
            var resBody = response.getBody();
            var resString = resCode+'\n'+JSON.stringify(resBody);

            nlapiLogExecution('AUDIT','WMS Response',resString);

          //   if(resCode === 200) {

          rec.setFieldValue('custbody_outbound_processing_complete', 'T');

          //if there are backordered lines
          //save them in custom field
          if (backorderedLines.lines.length > 0) {
            rec.setFieldValue('custbody_backordered_lines_pending', 'T');
            rec.setFieldValue('custbody_backordered_lines_data', JSON.stringify(backorderedLines));
            rec.setFieldValue('custbody_backorder_doc_number', rec.getFieldValue('tranid') + '-BO');
          }

          nlapiSubmitRecord(rec);
          nlapiLogExecution('AUDIT', 'SUCCESS', rec.getFieldValue('tranid') + ' created successfully in WMS');

          //   }

          //else if errors are present, log them and email kevind@overturepromo.com
          //   else {

          //     nlapiLogExecution('ERROR','WMS Error',response.toString());

          //     nlapiSendEmail(
          //       '6',
          //       'kevind@overturepromo.com',
          //       'WMS Doordash Australia Error '+docNumber,
          //       docNumber+'\r\n'+resString,
          //       null,
          //       null,
          //       null,
          //       null
          //     );

          //     //still need to submit record to store outbound payload
          //     nlapiSubmitRecord(rec);

          //   }
        }
        //if no payload.items, all items are backordered
        // else {
        //   rec.setFieldValue('custbody_backordered_lines_pending','T');
        //   rec.setFieldValue('custbody_backordered_lines_data', JSON.stringify(backorderedLines));
        //   rec.setFieldValue('custbody_backorder_doc_number', rec.getFieldValue('tranid')+'-BO');

        //   nlapiSubmitRecord(rec);
        //   nlapiLogExecution('AUDIT','All backorder order NOT sent.',rec.getFieldValue('tranid'));

        // }

        if (i % 10 == 0) {
          if (checkGovernance() == true) {
            break;
          }
        }
      } catch (e) {
        var error = e.code + ' :: ' + e.message;
        nlapiLogExecution('ERROR', 'Try / Catch Error', error);
        nlapiSendEmail(
          '6',
          'jacobg@overturepromo.com',
          'WMS Doordash Error Error Main Try/Catch Error',
          error.toString(),
          null,
          null,
          null,
          null
        );
      }
    }
  }
}