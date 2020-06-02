import { MessageHandler } from "../message-handler";
import { SkyScanner } from "../skyscanner";
import { entityValue, formatDate, formatDateForSkyScanner, formatFlightMessage, getLocationCode } from "../util";

// Our bot actions
export const actions = {
  send(session: { sessionId: string }, message: { text: string }) {
    // Our bot has something to say!
    // Let's retrieve the Facebook user whose session belongs to
    const recipientId = MessageHandler.Instance.getSession(Number.parseInt(session.sessionId))?.fbid;
    if (recipientId) {
      // Yay, we found our recipient!
      // Let's forward our bot response to her.
      // We return a promise to let our bot know when we're done sending
      return MessageHandler.Instance.sendTextMessage(recipientId, message.text);
    } else {
      console.error("Oops! Couldn't find user for session:", session.sessionId);
      // Giving the wheel back to our bot
      return Promise.resolve();
    }
  },
  findFlights(res: { context: any, entities: any }) {
    const context = res.context;
    const entities = res.entities;

    delete context.foundFlights;

    let sessionId = res.context.sessionId;
    let oldContext = MessageHandler.Instance.getSession(Number.parseInt(sessionId))?.context;
    if (oldContext) {
      const oldDeparture = oldContext.departure;
      const oldArrival = oldContext.arrival;
      const oldDate = oldContext.date;

      if (oldDeparture == null && entityValue(entities, 'departure', 1) == null) {
        context.missingDeparture = true;
      } else if (oldDeparture == null) {
        context.departure = entityValue(entities, 'departure', 1);
        delete context.missingDeparture;
      } else {
        context.departure = oldDeparture;
        delete context.missingDeparture;
      }
      if (oldArrival == null && entityValue(entities, 'arrival', 1) == null) {
        context.missingArrival = true;
      } else if (oldArrival == null) {
        context.arrival = entityValue(entities, 'arrival', 1);
        delete context.missingArrival;
      } else {
        context.arrival = oldArrival;
        delete context.missingArrival;
      }
      if (oldDate == null && entityValue(entities, 'datetime', 1) == null) {
        context.missingDate = true;
      } else if (oldDate == null) {
        context.date = entityValue(entities, 'datetime', 1);
        delete context.missingDate;
      } else {
        context.date = oldDate;
        delete context.missingDate;
      }
    }

    if (
      context.missingDate == null &&
      context.missingArrival == null &&
      context.missingDate == null
    ) {
      //If everything is OK, find flights

      var departure = context.departure;
      var arrival = context.arrival;
      var date = context.date;

      var departureCode, arrivalCode;

      console.log(
        'departure : ' + departure + ' arrival : ' + arrival + ' date : ' + date
      );

      var err, detailInformation;
      var done = false;

      const skyscanner = SkyScanner.Instance;
      console.log('syscanner api key is set');
      console.log('getting departure');
      let departureCode = getLocationCode(skyscanner.getLocations(departure));

      console.log('Departure Code : ' + departureCode);

      let arrivalCode = getLocationCode(skyscanner.getLocations(arrival));

      console.log('Arrival Code : ' + arrivalCode);

      let flightInfo = formatFlightMessage(
        skyscanner.searchCache(
          departureCode,
          arrivalCode,
          formatDateForSkyScanner(new Date(date)),
          formatDateForSkyScanner(new Date(date))
        )
      );

      if (flightInfo == '') {
        console.log('if detailInfo is null');
        context.noFlight = true;
        delete context.foundFlights;
        //when everything is OK, clean up data
        delete context.arrival;
        delete context.departure;
        delete context.date;
      } else {
        console.log('else detailInfo is not null');
        delete context.noFlight;
        context.foundFlights =
          '\nFlights from ' +
          departureCode +
          ' to ' +
          arrivalCode +
          ' on ' +
          formatDate(new Date(date)) +
          '\n----------' +
          flightInfo; // we should call a weather API here

        //when everything is OK, clean up data
        delete context.arrival;
        delete context.departure;
        delete context.date;

        console.log(JSON.stringify(context));
      }

      return context;
    } else {
      return context;
    }
  },
  // You should implement your custom actions here
  // See https://wit.ai/docs/quickstart
};