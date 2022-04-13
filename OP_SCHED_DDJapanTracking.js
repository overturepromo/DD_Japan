/*
 *Author: Jacob Goodall
 *Date: 03/02/2022
 *Description: Create fulfillment record and add tracking number
 */

/*
load saved search (se: DoorDash Japan Orders to Fulfill with Tracking ) that targets orders pending fulfillment under specific customers
call endpoint to retrieve tracking data for those orders
fulfill those orders, adding the tracking data to the Item Fulfillment records
*/

function createRecord() {

    var header = {
      'Cache-Control' : 'no-cache',
      'Content-Type' : 'application/json',
      'Authorization':'f249d7fc-9471-4a0a-a55d-6fbfa14ddbb2'
    };
  
  
    var results = nlapiSearchRecord('salesorder','customsearch5273');
  
    if(results) {
  
      var checkGovernance = function() {
  
        var governanceThreshold = 500;
        var context = nlapiGetContext();
  
        if(context.getRemainingUsage() < governanceThreshold) {
  
          try{
            
            var script = nlapiScheduleScript('customscript_op_sched_ddjapantracking');
  
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
  
          var rec = nlapiLoadRecord('salesorder',results[i].getValue('internalid',null,'GROUP'));
  
          //SO internal id
          var internalId = rec.getId();
  
          //Build array of unique order ids
          var orderIds = [];
          var prevId = null;
          var thisId = null;

          for(var x=1; x<=rec.getLineItemCount('item'); x++){
            if(rec.getLineItemValue('item','custcol_3rd_party_order_id',x) != '' && rec.getLineItemValue('item','custcol_3rd_party_order_id',x) != null){
              if(Number(rec.getLineItemValue('item', 'quantityfulfilled', x ) == 0)){
                thisId = rec.getLineItemValue('item','custcol_3rd_party_order_id',x);
                if(thisId != prevId){
                  orderIds.push(rec.getLineItemValue('item','custcol_3rd_party_order_id',x));
                }
                prevId = thisId;
              }
            }
          } 

          //update get to right request
          if(orderIds.length > 0) {
            for(var j = 0; j < orderIds.length; j++){
              var response = nlapiRequestURL(
                'https://api.jplogisticshub.com/callback/sandbox/order.php' + orderIds[j],
                null,
                header,
                null,
                'GET'
              );
      
              var resCode = response.getCode();
              var resBody = response.getBody();
              var resBodyJson = JSON.parse(resBody);
  
              nlapiLogExecution('AUDIT','FARO Response',resBody);
  
              if(resCode == 200){
                var shippedStatus = resBodyJson.orderid[orderIds[j].toString()].statuscode;
                var carrierName = resBodyJson.orderid[orderIds[j].toString()].carrier_name;
                var shippingNumber = resBodyJson.orderid[orderIds[j].toString()].shipping_number;
                var stopBug = 'stop';
                //check status to see if order is shipped
                if(shippedStatus == 4 || shippedStatus == 5){
                  var fulfillRecord = nlapiTransformRecord('salesorder', internalId, 'itemfulfillment');
                  fulfillRecord.setFieldText('shipstatus','Shipped');
                  for(var t = 1; t <= fulfillRecord.getLineItemCount('item'); t++){
                    if(fulfillRecord.getLineItemValue('item','custcol_3rd_party_order_id',t) == orderIds[j]){
                      fulfillRecord.setLineItemValue('item','itemreceive',t,'T');
                    }
                  }
                  if(shippingNumber != null && shippingNumber != ''){
                    fulfillRecord.selectNewLineItem('package');
                    fulfillRecord.setCurrentLineItemValue('package','packageweight','0.01');
                    fulfillRecord.setCurrentLineItemValue('package','packagetrackingnumber', shippingNumber);
                    fulfillRecord.setCurrentLineItemValue('package','packagedescr', carrierName);
                    fulfillRecord.commitLineItem('package');
                  }
  
                  var newFufillmentId =  nlapiSubmitRecord(fulfillRecord);
                  nlapiLogExecution('AUDIT','SUCCESS', newFufillmentId +' successfully Created');
                }
              }else{
                throw new nlapiCreateError('NOT_200','FARO Response was not 200');
              }
            }
          }
          else {
            nlapiLogExecution('AUDIT','No orderIds','No Lines Ready to Fulfill');
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
            '6',
            'jacobg@overturepromo.com',
            'Faro Error Main Try/Catch Error',
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