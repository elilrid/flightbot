/* jshint node: true, devel: true */
'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var config = require('config');
var https = require('https');
var request = require('request');
var crypto = require('crypto');
var Wit = require('node-wit').Wit;
var log = require('node-wit').log;
var Sequence = require('sequence').Sequence;

var skyscanner = require('./skyscanner');
var _ = require('lodash');


var sequence = Sequence.create();
var app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static('public'));

//tokens for facebook
const PAGE_ACCESS_TOKEN = config.get('pageAccessToken');
const VALIDATION_TOKEN = config.get('validationToken');
const APP_SECRET = config.get('appSecret');

const SKYSCANNER_KEY = config.get('skyscannerApiKey');
const WIT_TOKEN = config.get('witApiToken');

console.log("validation token is " + VALIDATION_TOKEN);
console.log("page access token is " + PAGE_ACCESS_TOKEN);
console.log("skyscanner key is " + SKYSCANNER_KEY);


// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState}
const sessions = {};

const findOrCreateSession = (fbid) => {
  let sessionId;
  // Let's see if we already have a session for the user fbid
  Object.keys(sessions).forEach(k => {
    if (sessions[k].fbid === fbid) {
      // Yep, got it!
      sessionId = k;
    }
  });
  if (!sessionId) {
    // No session found for user fbid, let's create a new one
    sessionId = new Date().toISOString();
    sessions[sessionId] = {fbid: fbid, context: {}};
  }
  return sessionId;
};

const entityValue = (entities, entity, order) => {
  const val = entities && entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity][order - 1].value;
  if (!val) {
    return null;
  }
  return typeof val === 'object' ? val.value : val;
};

function formatDate(date) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0'+minutes : minutes;
  //var strTime = hours + ':' + minutes + ' ' + ampm;
  return (date.getDate() + 1) + "/" + (date.getMonth() + 1) + "/" + date.getFullYear();
}

function formatDateForSkyScanner(date) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0'+minutes : minutes;
  //var strTime = hours + ':' + minutes + ' ' + ampm;
  return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + (date.getDate() + 1) ;
}

// Our bot actions
const actions = {
  send({sessionId}, {text}) {
    // Our bot has something to say!
    // Let's retrieve the Facebook user whose session belongs to
    const recipientId = sessions[sessionId].fbid;
    if (recipientId) {
      // Yay, we found our recipient!
      // Let's forward our bot response to her.
      // We return a promise to let our bot know when we're done sending
      return sendTextMessage(recipientId, text);
    } else {
      console.error('Oops! Couldn\'t find user for session:', sessionId);
      // Giving the wheel back to our bot
      return Promise.resolve()
    }
  },
  findFlights({context, entities}) {

    var sessionId = context.sessionId;
    var oldContext = sessions[sessionId].context;

    var oldDeparture = oldContext.departure;
    var oldArrival = oldContext.arrival;
    var oldDate = oldContext.date;

    if(oldDeparture == null && entityValue(entities,'departure',1) == null) {
      context.missingDeparture = true;
    } else if(oldDeparture == null) {
      context.departure = entityValue(entities,'departure',1);
      delete context.missingDeparture;
    } else {
      context.departure = oldDeparture;
      delete context.missingDeparture;
    }
    if(oldArrival == null && entityValue(entities,'arrival',1) == null) {
      context.missingArrival = true;
    } else if(oldArrival == null) {
      context.arrival = entityValue(entities,'arrival',1);
      delete context.missingArrival;
    } else {
      context.arrival = oldArrival;
      delete context.missingArrival;
    }
    if(oldDate == null && entityValue(entities,'datetime',1) == null) {
      context.missingDate = true;
    } else if(oldDate == null) {
      context.date = entityValue(entities,'datetime',1);
      delete context.missingDate;
    } else {
      context.date = oldDate;
      delete context.missingDate;
    }

    if(context.missingDate == null  && context.missingArrival == null && context.missingDate == null) {
      //If everything is OK, find flights

      var departure = context.departure;
      var arrival = context.arrival;
      var date = context.date;

      var departureCode, arrivalCode;

      console.log('departure : ' + departure + ' arrival : ' + arrival + ' date : ' + date);

      var err, detailInformation;

      sequence
        .then(function (next) {
          // This API key is shared in API documentation, you should register your own
          skyscanner.setApiKey(SKYSCANNER_KEY);
          console.log("syscanner api key is set");
          next(err);
        })
        .then(function (next,err) {
          console.log("getting departure");
            skyscanner.getLocation(departure).then(function (data) {
                //departureCode = data;
                if(data.length > 0) {
                  departureCode = data[0].id;
                } else {
                  departureCode = "";
                }
                console.log(JSON.stringify(data));
                //console.log("found departure" + data);
                next(err);
            });
        })
        .then(function (next, err) {
          console.log("getting arrival");
            skyscanner.getLocation(arrival).then(function (data) {
                //arrivalCode = data;
                if(data.length > 0) {
                  arrivalCode = data[0].id;
                } else {
                  arrivalCode = "";
                }
                console.log(JSON.stringify(data));
                //console.log("found arrival" + data);
                next(err);
            });
        })
        .then(function (next, err) {
            console.log("now got departure as " + departureCode + " and arrival as " + arrivalCode + ". Searching for flights!");
            skyscanner.searchCache(departureCode,arrivalCode, formatDateForSkyScanner(new Date(date)), formatDateForSkyScanner(new Date(date))).then(function (data){
                console.log(JSON.stringify(data));
                //data is the response of skyscanner
                //console.log is a function that prints the terminal.
                //console.log(data);
                //priceAndDate is the splitted version of data.
                detailInformation = data.Quotes.map(function (quote) {

                    var segments = [quote.OutboundLeg, quote.InboundLeg].map(function (segment, index) {

                        var departPlace = _.filter(data.Places, { PlaceId: segment.OriginId })[0];
                        var arrivePlace = _.filter(data.Places, { PlaceId: segment.DestinationId })[0];
                        var carriers = segment.CarrierIds.map(c => _.filter(data.Carriers, { CarrierId: c })[0].Name);

                        return {
                            group: index + 1,
                            departAirport: { code: departPlace.IataCode, name: departPlace.Name },
                            arriveAirport: { code: arrivePlace.IataCode, name: arrivePlace.Name },
                            departCity: { code: departPlace.CityId, name: departPlace.CityName },
                            arriveCity: { code: arrivePlace.CityId, name: arrivePlace.CityName },
                            departTime: segment.DepartureDate,
                            carriers: carriers
                        };
                    });
                    console.log(segments);
                    return {
                        //segments: segments,
                        price: quote.MinPrice,
                        direct: quote.Direct,
                    }
                });
                console.log(detailInformation);

                next(err);
            });

        })
        .then(function (next, err) {
          context.foundFlights = '\nFlights from ' + departureCode + " to " + arrivalCode + " on " + formatDate(new Date(date)); // we should call a weather API here
          //when everything is OK, clean up data
          delete context.arrival;
          delete context.departure;
          delete context.date;
          next();
        });
    }  else {
      return context;
    }

  },
  // You should implement your custom actions here
  // See https://wit.ai/docs/quickstart
};

// Setting up our bot
const wit = new Wit({
  accessToken: WIT_TOKEN,
  actions,
  logger: new log.Logger(log.INFO)
});

//webhook endpoints
app.get('/flights', function(req, res) {

  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }

  //res.status(200).send(req.query['hub.challenge']);
});

/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page.
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post('/flights', function (req, res) {
  var data = req.body;
  console.log("a request has come!");
  console.log("request " + req);
  console.log("data " + data);
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
        if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        }
        if (messagingEvent.optin) {
          //receivedAuthentication(messagingEvent);
        }
        /*else if (messagingEvent.message) {
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

/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to
 * Messenger" plugin, it is the 'data-ref' field. Read more at
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
 *
 */
function receivedAuthentication(event) {

  console.console.log("Received authentication!");

  var senderID = event.sender.id;


  // We retrieve the user's current session, or create one if it doesn't exist
  // This is needed for our bot to figure out the conversation history
  const sessionId = findOrCreateSession(senderID);
  sessions[sessionId] = {};

  sendTextMessage(senderID, "Welcome to Flight Bot! I can help you to find flights for you!");
}

//this function is called when a user sends message from messenger
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;
  console.log("Received message for user %d and page %d at %d with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;
  var appId = message.app_id;
  var metadata = message.metadata;

  // We retrieve the user's current session, or create one if it doesn't exist
  // This is needed for our bot to figure out the conversation history
  const sessionId = findOrCreateSession(senderID);

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;

  if (messageText) {
        //sendTextMessage(senderID,"Searching for available flights according to given parameters!");

        sessions[sessionId].context.sessionId = sessionId;

        // Let's forward the message to the Wit.ai Bot Engine
        // This will run all actions until our bot has nothing left to do
        wit.runActions(
          sessionId, // the user's current session
          messageText, // the user's message
          sessions[sessionId].context // the user's current session state
        ).then((context) => {
          // Our bot did everything it has to do.
          // Now it's waiting for further messages to proceed.
          console.log('Waiting for next user messages');

          // Based on the session state, you might want to reset the session.
          // This depends heavily on the business logic of your bot.
          // Example:
          // if (context['done']) {
          //   delete sessions[sessionId];
          // }

          // Updating the user's current session state
          sessions[sessionId].context = context;
        })
        .catch((err) => {
          console.error('Oops! Got an error from Wit: ', err.stack || err);
        })
        return;
  }
  else if (messageAttachments) {
    sendTextMessage(senderID, "Sorry I can only process text messages for now.");
  }
}

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };

  callSendAPI(messageData);
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 *
 */
function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s",
          messageId, recipientId);
      } else {
      console.log("Successfully called Send API for recipient %s",
        recipientId);
      }
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });
}

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', APP_SECRET)
                        .update(buf)
                        .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

// app.get('/getFlights', function (req, res) {
//    //res.status(code || 500).json({"error": message});
//    fs.readFile( __dirname + "/" + "flights.json", 'utf8', function (err, data) {
//        console.log( data );
//        res.end( data );
//    });
// })
//
// app.post('/postFlights', function (req, res) {
//    res.status(200).json({"success": true});
// })

app.get('/policy', function (req, res) {
   res.render('policy');
   res.status(200).json({"success": true});
})

var server = app.listen(process.env.PORT || 8080, function () {

  var host = server.address().address
  var port = server.address().port

  console.log("Example app listening at http://%s:%s", host, port)

})
