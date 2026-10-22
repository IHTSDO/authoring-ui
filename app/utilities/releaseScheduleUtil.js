'use strict';

// Release schedules are 5 fields: minute hour day-of-month month day-of-week.
// Day-of-week must be *. Day-of-month may use L for the last day of the month.
// Comma-separated lists are allowed. Steps (/) and ranges (-) are not.
var releaseScheduleUtil = (function () {

  var METADATA_KEY = 'releaseScheduleCron';
  var SEARCH_DAYS = 366 * 4;

  function expressionFromMetadata(metadata) {
    if (!metadata || metadata[METADATA_KEY] === null || typeof metadata[METADATA_KEY] === 'undefined') {
      return null;
    }
    var stored = String(metadata[METADATA_KEY]).trim();
    return stored || null;
  }

  function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  function dateOrNull(year, month, day) {
    var date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }
    return date;
  }

  function parseDate(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    if (Object.prototype.toString.call(value) === '[object Date]') {
      if (isNaN(value.getTime())) {
        return null;
      }
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    var str = String(value).trim();
    var iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
    if (iso) {
      return dateOrNull(+iso[1], +iso[2], +iso[3]);
    }
    var compact = /^(\d{4})(\d{2})(\d{2})$/.exec(str);
    if (compact) {
      return dateOrNull(+compact[1], +compact[2], +compact[3]);
    }
    return null;
  }

  function formatDate(date) {
    var month = date.getMonth() + 1;
    var day = date.getDate();
    return date.getFullYear() + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
  }

  function addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  function parseList(expr, min, max, allowLast, fieldName) {
    if (expr.indexOf('/') !== -1) {
      throw new Error(fieldName + ' does not allow /');
    }
    if (expr.indexOf('-') !== -1) {
      throw new Error(fieldName + ' does not allow ranges');
    }
    if (expr === '*') {
      return {any: true, values: {}, last: false};
    }
    var values = {};
    var last = false;
    var parts = expr.split(',');
    var i;
    for (i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (part === 'L') {
        if (!allowLast) {
          throw new Error('L is only valid in the day-of-month field');
        }
        last = true;
        continue;
      }
      if (!/^\d+$/.test(part)) {
        throw new Error('Invalid ' + fieldName + ' "' + expr + '"');
      }
      var value = parseInt(part, 10);
      if (value < min || value > max) {
        throw new Error('Invalid ' + fieldName + ' "' + expr + '"');
      }
      values[value] = true;
    }
    return {any: false, values: values, last: last};
  }

  function parse(expression) {
    if (!expression || !String(expression).trim()) {
      return null;
    }
    var fields = String(expression).trim().split(/\s+/);
    if (fields.length !== 5) {
      throw new Error('Release schedule must have 5 fields: minute hour day-of-month month day-of-week');
    }
    if (fields[4] !== '*') {
      throw new Error('Day-of-week must be *');
    }
    return {
      expression: String(expression).trim(),
      dom: parseList(fields[2], 1, 31, true, 'day-of-month'),
      month: parseList(fields[3], 1, 12, false, 'month'),
      minute: parseList(fields[0], 0, 59, false, 'minute'),
      hour: parseList(fields[1], 0, 23, false, 'hour')
    };
  }

  function validate(expression) {
    if (!expression || !String(expression).trim()) {
      return {ok: true, message: null};
    }
    try {
      parse(expression);
      return {ok: true, message: null};
    } catch (error) {
      return {ok: false, message: error.message};
    }
  }

  function fieldMatches(field, value) {
    return !!(field.any || field.values[value]);
  }

  function dayOfMonthMatches(field, date) {
    if (field.any) {
      return true;
    }
    if (field.values[date.getDate()]) {
      return true;
    }
    if (field.last) {
      return date.getDate() === daysInMonth(date.getFullYear(), date.getMonth());
    }
    return false;
  }

  function matchesSchedule(schedule, date) {
    return fieldMatches(schedule.month, date.getMonth() + 1) && dayOfMonthMatches(schedule.dom, date);
  }

  function matches(expression, dateValue) {
    var schedule = parse(expression);
    var date = parseDate(dateValue);
    if (!schedule || !date) {
      return false;
    }
    return matchesSchedule(schedule, date);
  }

  function nextEffectiveDate(expression, latestEffectiveDate) {
    var schedule = parse(expression);
    var after = parseDate(latestEffectiveDate);
    if (!schedule || !after) {
      return null;
    }
    var cursor = addDays(after, 1);
    var i;
    for (i = 0; i < SEARCH_DAYS; i++) {
      if (matchesSchedule(schedule, cursor)) {
        return new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
      }
      cursor = addDays(cursor, 1);
    }
    return null;
  }

  function versionEffectiveDate(version) {
    if (!version) {
      return null;
    }
    if (version.effectiveDate !== null && typeof version.effectiveDate !== 'undefined' && version.effectiveDate !== '') {
      return parseDate(version.effectiveDate);
    }
    return parseDate(version.version);
  }

  function latestEffectiveDate(codeSystem) {
    if (!codeSystem) {
      return null;
    }
    return versionEffectiveDate(codeSystem.latestVersion);
  }

  function latestEffectiveDateFromVersions(versions) {
    if (!versions || !versions.length) {
      return null;
    }
    var latest = null;
    var i;
    for (i = 0; i < versions.length; i++) {
      var date = versionEffectiveDate(versions[i]);
      if (date && (!latest || date.getTime() > latest.getTime())) {
        latest = date;
      }
    }
    return latest;
  }

  return {
    metadataKey: METADATA_KEY,
    expressionFromMetadata: expressionFromMetadata,
    validate: validate,
    matches: matches,
    nextEffectiveDate: nextEffectiveDate,
    formatDate: formatDate,
    latestEffectiveDate: latestEffectiveDate,
    latestEffectiveDateFromVersions: latestEffectiveDateFromVersions
  };
}());

if (typeof module === 'object' && module.exports) {
  module.exports = releaseScheduleUtil;
}
