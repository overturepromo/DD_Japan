/*
 *Author: Jacob Goodall
 *Date: 03/01/2022
 *Description: Scheduled Script to send Sales Orders to DoorDash Japan
 */

function sendSO() {

	//define header object for nlapiRequestURL() call
	var header = {
    'Cache-Control' : 'no-cache',
		'Content-Type' : 'application/json',
		'Authorization':'f249d7fc-9471-4a0a-a55d-6fbfa14ddbb2'
	};

  //se: FARO Orders for Integration
  //Mine search
    //var results = nlapiSearchRecord('salesorder','customsearch5273');
    //Kevin's search.
    var results = nlapiSearchRecord('salesorder','customsearch4764');
	if(results) {

    var checkGovernance = function() {

			var governanceThreshold = 500;
			var context = nlapiGetContext();

			if(context.getRemainingUsage() < governanceThreshold) {

				try{
					
					var script = nlapiScheduleScript('customscript_op_sched_ddjapanorders');

          if(script == 'QUEUED') {
            nlapiLogExecution('ERROR','Re-scheduling due to governance', 'Successful re-schedule.');
            return true;
          }
          else {
            nlapiLogExecution('ERROR','Problem re-scheduling.', e.code+' : '+e.message);
            return true;
          }
					
				}
				catch(e) {
					nlapiLogExecution('ERROR','Problem re-scheduling.', e.code+' : '+e.message);
					return true;
				}
			}
			else {
				return false;
			}

		};

    for(var i = 0; i<results.length; i++) {

      try {

        var payload = { 
            custbody_webstoreordernumber: '',
            tranid: '',
	          internalid: '',
            shipaddressee: '', 
            shipattention: '',
            shipaddr1: '',
            shipaddr2: '',
            shipcity: '', 
            shipstate: '',
            shipzip: '',
            shipphone: '',
            shipcountry: '',
            receivebydate: '',
            email: '',
            specialinstructions: '',
            lines: [] 
        }

        // tranid: "",
        // internalid: "",
        // name: "",
        // email: "",
        // shipaddressee: "",
        // shipattention: "",
        // shipphone: "",
        // shipaddr1: "",
        // shipaddr2: "",
        // shipaddr3: "",
        // shipcity: "",
        // shipstate: "",
        // shipzip: "",
        // shipcountry: "",
        // items: []

        //Old Search
        var rec = nlapiLoadRecord('salesorder', results[i].getId());

        //New Search
        //var rec = nlapiLoadRecord('salesorder',results[i].getValue('internalid',null,'GROUP'));
        var tranId = rec.getFieldValue('tranid');

        payload.custbody_webstoreordernumber = rec.getFieldValue('otherrefnum');
        payload.tranid = rec.getFieldValue('tranid');
        payload.internalid = rec.getId();
        payload.shipaddressee =  rec.getFieldValue('shipaddressee');
        payload.shipattention = rec.getFieldValue('shipattention');
        payload.shipaddr1 = rec.getFieldValue('shipaddr1')
        payload.shipaddr2 = rec.getFieldValue('shipaddr2')
        payload.shipcity = rec.getFieldValue('shipcity');
        payload.shipstate = rec.getFieldValue('shipstate');
        payload.shipzip = rec.getFieldValue('shipzip');
        payload.shipphone = rec.getFieldValue('custbody_shiptophone');
        payload.shipcountry = rec.getFieldValue('shipcountry');
        payload.receivebydate = rec.getFieldValue('enddate'); 
        payload.email = rec.getFieldValue('custbody_customer_email');
        payload.specialinstructions = rec.getFieldValue('custbody_special_instructions');

        // payload.tranid = rec.getFieldValue("tranid");
        // payload.internalid = rec.id;
        // payload.name = rec.getFieldValue("custbody_customer_name");
        // payload.email = rec.getFieldValue('custbody_customer_email');
        // payload.shipaddressee = rec.getFieldValue('shipaddressee');
        // payload.shipattention = rec.getFieldValue('shipattention');
        // payload.shipphone = rec.getFieldValue('custbody_shiptophone');
        // payload.shipaddr1 = rec.getFieldValue("shipaddr1");
        // payload.shipaddr2 = rec.getFieldValue("shipaddr2");
        // payload.shipaddr3 = rec.getFieldValue("shipaddr3");
        // payload.shipcity = rec.getFieldValue('shipcity');
        // payload.shipstate = rec.getFieldValue('shipstate');
        // payload.shipzip = rec.getFieldValue('shipzip');
        // payload.shipcountry = rec.getFieldValue('shipcountry');
        
        var modifyTranId = false;

        for(var x=1; x<=rec.getLineItemCount('item'); x++) {
            var item = rec.getLineItemText('item','item',x);
            //check if in stock
            if((rec.getLineItemValue('item','quantitybackordered',x) < 1 && rec.getLineItemValue('item','quantitycommitted',x) > 0) || rec.getLineItemValue('item', 'quantityfulfilled', x) > 0) {
              //check if matrix item, strip out parent item if so
              if(item.indexOf(':') !== -1) {
                item = item.substring(item.indexOf(':')+2);
              }
              //Check to see if item has been given an order id
              if(rec.getLineItemValue('item','custcol_3rd_party_order_id',x) == '' || rec.getLineItemValue('item','custcol_3rd_party_order_id',x) == null) {
                payload.lines.push(
                  {
                    item: item,
                    quantity: Number(rec.getLineItemValue('item','quantitycommitted',x)),
                    description: rec.getLineItemValue('item','description',x)
                  }
                );
              }
              else {
                modifyTranId = true;
              }  
            }
        }

        if(payload.lines.length > 0) {

          if(modifyTranId) {
            var boNum = rec.getFieldValue('custbody_backorder_doc_number');
            if(boNum){
                boNum = Number(boNum)+1;
                tranId = tranId +'-BO' + boNum;
                payload.tranid = tranId;
            } else{
              tranId = tranId + '-BO';
              payload.tranid = tranId;
            }
            rec.setFieldValue('custbody_backorder_doc_number', boNum+1); 
          }
          else {
            payload.tranid = tranId;
          }

          //json callback function to make null fields to an empty string
          rec.setFieldValue('custbody_ariba_cxml_message',JSON.stringify(payload, function (key, value) { return (value === null) ? '' : value;}));
          nlapiLogExecution('AUDIT','Outbound Payload',JSON.stringify(payload, function (key, value) { return (value === null) ? '' : value;}));



          var response = nlapiRequestURL(
            'https://api.jplogisticshub.com/callback/sandbox/order.php',
            JSON.stringify(payload, function (key, value) { return (value === null) ? '' : value;}),
            header,
            null,
            'POST'
          );

          var fullResponse = JSON.stringify(response);
  
          var resCode = response.getCode();
          var resBody = response.getBody();
          var resBodyJson = JSON.parse(resBody);
          var resString = resCode+'\n'+JSON.stringify(resBody);
  
          nlapiLogExecution('AUDIT','DDJapan Response',resBody);

  
          if(resCode === 201) {

            var orderIdObj = resBodyJson.orderid;
            var orderIdLength = Object.keys(orderIdObj).length;
            var newOrderId = Object.keys(orderIdObj)[orderIdLength-1];
            // var newOrderId = Object.keys(orderIdObj)[0];

            //set DDJapan's orderid in new custom line field custcol_3rd_party_order_id
            for(var x=1; x<=rec.getLineItemCount('item'); x++) {
                if(rec.getLineItemValue('item','quantitybackordered',x) < 1) {
                  if(rec.getLineItemValue('item','custcol_3rd_party_order_id',x) == '' || rec.getLineItemValue('item','custcol_3rd_party_order_id',x) == null) {
                    rec.setLineItemValue('item','custcol_3rd_party_order_id', x, newOrderId);
                  }
                }
            }
  
            nlapiSubmitRecord(rec);
            nlapiLogExecution('AUDIT','SUCCESS', tranId +' created successfully in DDJapans system');

          }
  
          //else if errors are present, log them and email jacobg@overturepromo.com or kevind@overturepromo.com
          else {
  
            nlapiLogExecution('ERROR','FARO Error',resString);
  
            nlapiSendEmail(
              '5009366',
              'jacobg@overturepromo.com',
              'DDJapan Error '+ tranId,
              tranId+'\r\n'+resString,
              null,
              null,
              null,
              null
            );
            
            //still need to submit record to store outbound payload
            nlapiSubmitRecord(rec);
  
          }
        }

        if(i % 10 == 0) {
          if(checkGovernance() == true) {
            break;
          }	
        }
      }

      catch(e) {
        var error = e.code+' :: '+e.message;
        nlapiLogExecution('ERROR','Try / Catch Error',error);
        nlapiSendEmail(
          '5009366',
          'jacobg@overturepromo.com',
          'DDJapan Error Main Try/Catch Error',
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

