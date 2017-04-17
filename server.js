var express = require('express');
var bodyParser = require('body-parser');
var config = require('config');
var https = require('https');
var request = require('request');
var app = express();
var fs = require("fs");

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/webhook', function(req, res) {
  /*
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }*/

  res.status(200).send(req.query['hub.challenge']);
});

/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page.
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post('/webhook', function (req, res) {
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        /*if (messagingEvent.optin) {
          receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else if (messagingEvent.read) {
          receivedMessageRead(messagingEvent);
        } else if (messagingEvent.account_linking) {
          receivedAccountLink(messagingEvent);
        } else {

        }*/
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
});

app.get('/getFlights', function (req, res) {
   //res.status(code || 500).json({"error": message});
   fs.readFile( __dirname + "/" + "flights.json", 'utf8', function (err, data) {
       console.log( data );
       res.end( data );
   });
})

app.post('/postFlights', function (req, res) {
   res.status(200).json({"success": true});
})

app.get('/policy', function (req, res) {
   res.render('policy');
   res.status(200).json({"success": true});
})

var server = app.listen(process.env.PORT || 8080, function () {

  var host = server.address().address
  var port = server.address().port

  console.log("Example app listening at http://%s:%s", host, port)

})
