import bodyParser from 'body-parser';
import config from 'config';
import crypto from 'crypto';
import express from 'express';
import { MessageHandler } from './message-handler';

var app = express();
app.use(
  bodyParser.json({
    verify: verifyRequestSignature,
  })
);
app.use(express.static('public'));

//tokens for facebook
const VALIDATION_TOKEN = config.get('validationToken') as string;
const APP_SECRET = config.get('appSecret') as string;


console.log('validation token is ' + VALIDATION_TOKEN);

const entityValue = (entities: any, entity: any, order: any) => {
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
    data.entry.forEach((pageEntry: any) => {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach((messagingEvent: any) => {
        console.log(
          'Webhook received unknown messagingEvent: ',
          messagingEvent
        );
        if (messagingEvent.message) {
          MessageHandler.Instance.receivedMessage(messagingEvent);
        }
        if (messagingEvent.optin) {
          MessageHandler.Instance.receivedAuthentication(messagingEvent);
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

function verifyRequestSignature(req: any, res: any, buf: any) {
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
  if (!server) {
    console.log('Failed to start application...');
    return;
  }

  let addressStr = '';
  if (server.address() && (typeof server.address()) == 'string') {
    const address = server.address() as string;
    addressStr = `http:\\\\${address}`;
  } else if (server.address()) {
    const address = server.address() as any;
    addressStr = `http:\\\\${address.address}:${address.port}`;
  }

  console.log('App is listening at http://%s', addressStr);
});
