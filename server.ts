import bodyParser from 'body-parser';
import config from 'config';
import crypto from 'crypto';
import express from 'express';

var _ = require('lodash');

var app = express();
app.use(
  bodyParser.json({
    verify: verifyRequestSignature,
  })
);
app.use(express.static('public'));

//tokens for facebook
const PAGE_ACCESS_TOKEN = ;
const VALIDATION_TOKEN = config.get('validationToken');
const APP_SECRET = config.get('appSecret');

const SKYSCANNER_KEY = config.get('skyscannerApiKey');

console.log('validation token is ' + VALIDATION_TOKEN);
console.log('page access token is ' + PAGE_ACCESS_TOKEN);
console.log('skyscanner key is ' + SKYSCANNER_KEY);

const entityValue = (entities, entity, order) => {
  const val =
    entities &&
    entities[entity] &&
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
  minutes = minutes < 10 ? '0' + minutes : minutes;
  //var strTime = hours + ':' + minutes + ' ' + ampm;
  if (date.getMonth() + 1 < 10 && date.getDate() + 1 < 10) {
    return (
      '0' +
      (date.getDate() + 1) +
      '/0' +
      (date.getMonth() + 1) +
      '/' +
      date.getFullYear()
    );
  } else if (date.getMonth() + 1 >= 10 && date.getDate() + 1 < 10) {
    return (
      '0' +
      (date.getDate() + 1) +
      '/' +
      (date.getMonth() + 1) +
      '/' +
      date.getFullYear()
    );
  } else if (date.getMonth() + 1 < 10 && date.getDate() + 1 >= 10) {
    return (
      date.getDate() +
      1 +
      '/0' +
      (date.getMonth() + 1) +
      '/' +
      date.getFullYear()
    );
  } else {
    return (
      date.getDate() +
      1 +
      '/' +
      (date.getMonth() + 1) +
      '/' +
      date.getFullYear()
    );
  }
}

function formatDateForSkyScanner(date) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0' + minutes : minutes;
  //var strTime = hours + ':' + minutes + ' ' + ampm;
  if (date.getMonth() + 1 < 10 && date.getDate() + 1 < 10) {
    return (
      date.getFullYear() +
      '-0' +
      (date.getMonth() + 1) +
      '-0' +
      (date.getDate() + 1)
    );
  } else if (date.getMonth() + 1 >= 10 && date.getDate() + 1 < 10) {
    return (
      date.getFullYear() +
      '-' +
      (date.getMonth() + 1) +
      '-0' +
      (date.getDate() + 1)
    );
  } else if (date.getMonth() + 1 < 10 && date.getDate() + 1 >= 10) {
    return (
      date.getFullYear() +
      '-0' +
      (date.getMonth() + 1) +
      '-' +
      (date.getDate() + 1)
    );
  } else {
    return (
      date.getFullYear() +
      '-' +
      (date.getMonth() + 1) +
      '-' +
      (date.getDate() + 1)
    );
  }
}

function getLocationCode(data) {
  var code = '';
  if (data.length > 0) {
    code = data[0].id;
  }
  return code;
}

function formatFlightMessage(flightInfo) {
  var i,
    toReturn = '';
  var anyFlight = false;
  for (i = 0; i < flightInfo.Quotes.length; i++) {
    var quote = flightInfo.Quotes[i];

    console.log(JSON.stringify(quote));
    toReturn += '\n';

    toReturn += quote.MinPrice + 'TL - ';

    if (quote.Direct) {
      toReturn += 'Direct Flight';
    } else {
      toReturn += 'Not a Direct Flight';
    }

    toReturn += ' - ';
    if (quote.hasOwnProperty('OutboundLeg')) {
      anyFlight = true;
      toReturn +=
        'Time : ' + formatDate(new Date(quote.OutboundLeg.DepartureDate));
    } else if (quote.hasOwnProperty('InboundLeg')) {
      anyFlight = true;
      toReturn +=
        'Time : ' + formatDate(new Date(quote.InboundLeg.DepartureDate));
    }
  }
  if (anyFlight) {
    return toReturn;
  } else {
    return 'There is no flight';
  }
}



//webhook endpoints
app.get('/flights', function (req, res) {
  if (
    req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === VALIDATION_TOKEN
  ) {
    console.log('Validating webhook');
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error('Failed validation. Make sure the validation tokens match.');
    res.sendStatus(403);
  }
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
  console.log('a request has come!');
  console.log('request ' + req);
  console.log('data ' + data);
  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function (pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function (messagingEvent) {
        console.log(
          'Webhook received unknown messagingEvent: ',
          messagingEvent
        );
        if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        }
        if (messagingEvent.optin) {
          //receivedAuthentication(messagingEvent);
        }
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
  console.console.log('Received authentication!');

  var senderID = event.sender.id;

  // We retrieve the user's current session, or create one if it doesn't exist
  // This is needed for our bot to figure out the conversation history
  const sessionId = findOrCreateSession(senderID);
  sessions[sessionId] = {};

  sendTextMessage(
    senderID,
    'Welcome to Flight Bot! I can help you to find flights for you!'
  );
}

function verifyRequestSignature(req, res, buf) {
  var signature = req.headers['x-hub-signature'];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto
      .createHmac('sha1', APP_SECRET)
      .update(buf)
      .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

app.get('/policy', function (req, res) {
  res.render('policy');
  res.status(200).json({
    success: true,
  });
});

var server = app.listen(process.env.PORT || 5050, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('App is listening at http://%s:%s', host, port);
});
