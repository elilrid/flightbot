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

export const getLocationCode = (data) => {
  var code = '';
  if (data.length > 0) {
    code = data[0].id;
  }
  return code;
}