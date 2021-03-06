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
  //My search
  //var results = nlapiSearchRecord('salesorder','customsearch5273');
  //Kevin's search because it has some SO's in there
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

        // This feels like what is to be send to a dasher.. Not what we should send for orders. So what is their API really expecting?
        // Either way, i'll create it for now as it can't hurt. 
        var payload2 = {
          orders:[
            {
              id: '',
              name: '',
              eligibility:{
                onDates: '',
                startTimeWindows: '',
                endTimeWindows: ''
              },
              trackingNumber: '',
              status: '',
              pickup: {
                location:{
                  address: '',
                  address2: '',
                  geocoordinates: {
                    latitude: '',
                    longitude: ''
                  },
                  city: '',
                  country: '',
                  region: '',
                  postalCode: ''
                },
                notes: '',
                email: '',
                phone: '',
                pickupContactName: '',
                pickupContactName: '',
                pickupRestaurant_id: ''
              },
              delivery: {
                location: {
                  address: '',
                  address2: '',
                  geocoordinates: {
                    latitude: '',
                    longitude: ''
                  },
                  city: '',
                  country: '',
                  region: '',
                  postalCode: ''
                },
                notes: '',
                email: '',
                phone: '',
                deliveryContactName: '',
                deliveryOrderNumber: '',
                deliveryRestaurant_id: ''
              },
              line_items: [{}],
              device_serial_number: '',
              callbacks: {
                created: '',
                "in-process": '',
                "out-for-delivery": '',
                done: '',
                unsuccessful: '',
                reschedule: '',
                "returned-to-sender": ''
              }
            }
          ]
        }

        // {
        //   "orders": [
        //     {
        //       "id": "1ca59080-fcca-11eb-9a03-0242ac130003 | 0025",
        //       "name": "Japan Logistics Hub | null (If null it will get the registered company name)",
        //       "eligibility": {
        //         "onDates": "YYYYMMDD | 20210810",
        //         "startTimeWindows": "H:i | 14:00",
        //         "endTimeWindows": "H:i | 16:30"
        //       },
        //       "trackingNumber": "JLH20210611968df29506 | null | '' ",
        //       "status": "Created | In-process | Out for Delivery | Done | Reschedule | Unsuccessful| Successfully returned to sender | null | '' ",
        //       "pickup": {
        //         "location": {
        //           "address": "1056-7 Yamada,Togane, Chiba Prefecture,283-0823 Japan",
        //           "address2": "Japan Logistics Hub",
        //           "geocoordinates": {
        //             "latitude": "13.721126 | null | '' ",
        //             "longitude": "100.515605 | null | '' "
        //           },
        //           "city": "Tokyo",
        //           "country": "Japan",
        //           "region": "region | null | '' ",
        //           "postalCode": "629196"
        //         },
        //         "notes": "Pickup Order Number 1234 put some ribbon",
        //         "email": "orders@jplogisticshub.com",
        //         "phone": "+65956458796",
        //         "pickupContactName": "Warehouse Person In-charge | null | '' ",
        //         "pickupOrderNumber": "Order-12345 | null | '' ",
        //         "pickupRestaurant_id": "restaurant-12345 | null | '' "
        //       },
        //       "delivery": {
        //         "location": {
        //           "address": "1056-7 Yamada,Togane, Chiba Prefecture,283-0823 Japan",
        //           "address2": "Japan Logistics Hub",
        //           "geocoordinates": {
        //             "latitude": "13.721126 | null | '' ",
        //             "longitude": "100.515605 | null | '' "
        //           },
        //           "city": "Tokyo",
        //           "country": "Japan",
        //           "region": "region | null | '' ",
        //           "postalCode": "629196"
        //         },
        //         "notes": "Leave at the door",
        //         "email": "orders@jplogisticshub.com",
        //         "phone": "+65956458796",
        //         "deliveryContactName": "John Doe | null | '' ",
        //         "deliveryOrderNumber": "Order-12345 | null | '' ",
        //         "deliveryRestaurant_id": "restaurant-12345 | null | '' "
        //       },
        //       "line_items": [
        //         {
        //           "id": "Product-1234",
        //           "name": "Sample Product Name Here",
        //           "quantity": 2,
        //           "sku": "SKU-1234 | null | ''",
        //           "price": "24",
        //           "unit_price": "12"
        //         }
        //       ],
        //       "device_serial_number": "FPSG-1234-001",
        //       "callbacks": {
        //         "created": "https://YourDomainURLhere.com",
        //         "in-process": "https://YourDomainURLhere.com",
        //         "out-for-delivery": "https://YourDomainURLhere.com",
        //         "done": "https://YourDomainURLhere.com",
        //         "unsuccessful": "https://YourDomainURLhere.com",
        //         "reschedule": "https://YourDomainURLhere.com",
        //         "returned-to-sender": "https://YourDomainURLhere.com"
        //       }
        //     }
        //   ]
        // }

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

