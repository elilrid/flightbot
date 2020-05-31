import config from 'config';
import request from 'then-request';
import { FacebookSession } from './models/facebook-session.model';
import { MessageData } from './models/message-data.model';
import { FlightWit } from './wit/flight-wit';

export class MessageHandler {
  private _instance: MessageHandler | undefined;
  public get Instance(): MessageHandler {
    if (!this._instance) {
      this._instance = new MessageHandler();
    }
    return this._instance;
  }

  // This will contain all user sessions.
  // Each session has an entry:
  // sessionId -> {fbid: facebookUserId, context: sessionState}
  sessions: FacebookSession[] = [];

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