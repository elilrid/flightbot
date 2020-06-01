import config from 'config';
import request from 'then-request';
import { FacebookSession } from './models/facebook-session.model';
import { MessageData } from './models/message-data.model';
import { formatDate } from './util';
import { FlightWit } from './wit/flight-wit';

export class MessageHandler {
  private static _instance: MessageHandler | undefined;
  public static get Instance(): MessageHandler {
    if (!this._instance) {
      this._instance = new MessageHandler();
    }
    return this._instance;
  }

  private constructor() { }

  // This will contain all user sessions.
  // Each session has an entry:
  // sessionId -> {fbid: facebookUserId, context: sessionState}
  private sessions: FacebookSession[] = [];

  public findOrCreateSession(fbid: string): number {
    // Let's see if we already have a session for the user fbid
    let sessionId = this.sessions.findIndex(ses => ses.fbid === fbid);

    if (sessionId === -1) {
      // No session found for user fbid, let's create a new one
      const facebookSession = new FacebookSession();
      facebookSession.fbid = fbid;
      facebookSession.context = {};
      sessionId = this.sessions.push(facebookSession);
    }
    return sessionId;
  };

  public getSession(sessionId: number): FacebookSession | undefined {
    if (this.sessions.length < sessionId) {
      return undefined;
    }
    return this.sessions[sessionId];
  }

  //this function is called when a user sends message from messenger
  public receivedMessage(event: any): void {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;
    console.log(
      'Received message for user %d and page %d at %d with message:',
      senderID,
      recipientID,
      timeOfMessage
    );
    console.log(JSON.stringify(message));

    var messageId = message.mid;
    var appId = message.app_id;
    var metadata = message.metadata;

    // We retrieve the user's current session, or create one if it doesn't exist
    // This is needed for our bot to figure out the conversation history
    const sessionId = this.findOrCreateSession(senderID);

    // You may get a text or attachment but not both
    var messageText = message.text;
    var messageAttachments = message.attachments;

    if (messageText) {
      this.sendTextMessage(senderID, "Searching for available flights according to given parameters!");

      this.sessions[sessionId].context.sessionId = sessionId;

      // Let's forward the message to the Wit.ai Bot Engine
      // This will run all actions until our bot has nothing left to do
      FlightWit.Wit.runActions(
        sessionId.toString(), // the user's current session
        messageText, // the user's message
        this.sessions[sessionId].context // the user's current session state
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
        this.sessions[sessionId].context = context;
      }).catch((err: Error) => {
        console.error('Oops! Got an error from Wit: ', err.stack || err);
      });
      return;
    } else if (messageAttachments) {
      this.sendTextMessage(
        senderID,
        'Sorry I can only process text messages for now.'
      );
    }
  }

  /*
  * Authorization Event
  *
  * The value for 'optin.ref' is defined in the entry point. For the "Send to
  * Messenger" plugin, it is the 'data-ref' field. Read more at
  * https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
  *
  */
  public receivedAuthentication(event: any) {
    console.log('Received authentication!');

    var senderID = event.sender.id;

    // We retrieve the user's current session, or create one if it doesn't exist
    // This is needed for our bot to figure out the conversation history
    const sessionId = MessageHandler.Instance.findOrCreateSession(senderID);
    this.sessions[sessionId] = new FacebookSession();

    this.sendTextMessage(
      senderID,
      'Welcome to Flight Bot! I can help you to find flights for you!'
    );
  }

  private formatFlightMessage(flightInfo: any): string {
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


  /*
   * Send a text message using the Send API.
   *
   */
  public sendTextMessage(recipientId: string, messageText: string): void {
    if (messageText.length > 640) {
      messageText = messageText.substring(0, 639);
    }
    var messageData = {
      recipient: {
        id: recipientId,
      },
      message: {
        text: messageText,
        metadata: 'DEVELOPER_DEFINED_METADATA',
      },
    };

    this.callSendAPI(messageData);
  }

  /*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 *
 */
  private callSendAPI(messageData: MessageData): void {
    request('POST', 'https://graph.facebook.com/v2.6/me/messages',
      {
        qs: {
          access_token: config.get('pageAccessToken'),
        },
        json: messageData,
      }).then(response => {
        const body = JSON.parse(response.getBody().toString());
        var recipientId = body.recipient_id;
        var messageId = body.message_id;

        if (messageId) {
          console.log(
            'Successfully sent message with id %s to recipient %s',
            messageId,
            recipientId
          );
        } else {
          console.log(
            'Successfully called Send API for recipient %s',
            recipientId
          );
        }
      })
      .catch(error => {
        console.error(
          'Failed calling Send API',
          error
        );
      });
  }
}