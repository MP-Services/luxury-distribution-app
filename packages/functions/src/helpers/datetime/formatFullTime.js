const monthList = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

const fullMonthList = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

/**
 *
 * @param number
 * @return {string}
 */
function getOrdinalSuffix(number) {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const remainder = number % 100;
  const suffix = suffixes[(remainder - 20) % 10] || suffixes[remainder] || suffixes[0];
  return number + suffix;
}

/**
 *
 * @param datetime
 * @param timezone
 * @returns {string}
 */
export function formatDateOnly(datetime, timezone = '') {
  if (!datetime) return '';
  let result = new Date(datetime);
  if (timezone !== '') {
    result = new Date(result.toLocaleString('en-US', {timeZone: timezone}));
  }
  return (
    fullMonthList[result.getMonth()] +
    ' ' +
    getOrdinalSuffix(result.getDate()) +
    ', ' +
    result.getFullYear()
  );
}

export function formatDateOnlyNoSuffix(datetime, timezone = '') {
  if (!datetime) return '';
  let result = new Date(datetime);
  if (timezone !== '') {
    result = new Date(result.toLocaleString('en-US', {timeZone: timezone}));
  }
  return fullMonthList[result.getMonth()] + ' ' + result.getDate() + ', ' + result.getFullYear();
}

/**
 *
 * @param datetime
 * @param timezone
 * @returns {string}
 */
export function formatDatePlainText(datetime, timezone = '') {
  if (!datetime) return '';
  let result = new Date(datetime);
  if (timezone !== '') {
    result = new Date(result.toLocaleString('en-US', {timeZone: timezone}));
  }
  return [
    String(result.getMonth() + 1).padStart(2, '0'),
    String(result.getDate()).padStart(2, '0'),
    result.getFullYear()
  ].join('/');
}

/**
 *
 * @param datetime
 * @param timezone
 * @returns {string}
 */

export function formatTimeOnly(datetime, timezone = '') {
  let result = new Date(datetime);
  if (timezone !== '') {
    result = new Date(result.toLocaleString('en-US', {timeZone: timezone}));
  }
  return result.toLocaleString('en-US', {hour: 'numeric', minute: 'numeric', hour12: true});
}

/**
 *
 * @param datetime
 * @param timezone
 * @returns {string}
 */

export function formatDateOnlyWithShortMonth(datetime, timezone = '') {
  let result = new Date(datetime);

  if (timezone !== '') {
    result = new Date(result.toLocaleString('en-US', {timeZone: timezone}));
  }
  return monthList[result.getMonth()] + ' ' + result.getDate() + ', ' + result.getFullYear();
}

/**
 *
 * @param datetime
 * @param timezone
 * @returns {string}
 */

export function formatDateTimeWithShortMonth(datetime, timezone = '') {
  let result = new Date(datetime);

  if (timezone !== '') {
    result = new Date(result.toLocaleString('en-US', {timeZone: timezone}));
  }
  return (
    monthList[result.getMonth()] +
    ' ' +
    result.getDate() +
    ', ' +
    result.getFullYear() +
    ' ' +
    formatTimeOnly(datetime)
  );
}

/**
 *
 * @param datetime
 * @return {string}
 */
function formatDateTimezone(datetime) {
  const timezoneOffset = new Date(datetime).getTimezoneOffset();
  const sign = timezoneOffset <= 0 ? '+' : '-';
  const absoluteOffset = Math.abs(timezoneOffset);
  const hours = Math.floor(absoluteOffset / 60);
  const minutes = absoluteOffset % 60;

  return 'GMT' + sign + [hours, minutes].filter(Boolean).join(':');
}

export function formatFullDateTime(datetime) {
  if (!datetime) return '';

  return [formatDateOnly(datetime), formatFullTime(datetime)].join(' ');
}

export function formatFullTime(datetime) {
  if (!datetime) return '';

  return [formatTimeOnly(datetime), formatDateTimezone(datetime)].join(' ');
}

export function formatDatePlainTextWithOnlyTime(datetime) {
  if (!datetime) return '';
  return [formatDatePlainText(datetime), formatTimeOnly(datetime)].join(' ');
}
