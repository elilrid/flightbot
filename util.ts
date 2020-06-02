export const formatDate = (date: Date): string => {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  //var strTime = hours + ':' + minutesStr + ' ' + ampm;
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

export const formatDateForSkyScanner = (date: Date): string => {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  //var strTime = hours + ':' + minutesStr + ' ' + ampm;
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

export const getLocationCode = (data: any) => {
  var code = '';
  if (data.length > 0) {
    code = data[0].id;
  }
  return code;
}

export const entityValue = (entities: any, entity: string, order: number) => {
  const val =
    entities &&
    entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length >= order &&
    entities[entity][order - 1].value;
  if (!val) {
    return null;
  }
  return typeof val === 'object' ? val.value : val;
};

export const formatFlightMessage = (flightInfo: any): string => {
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