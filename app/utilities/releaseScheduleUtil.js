'use strict';

// Release schedules are 5-field cron expressions (minute hour day-of-month month day-of-week).
// Six- and seven-field Spring/Quartz expressions are accepted as well.
// "L" in the day-of-month field means the last day of that month.
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

  function parseField(expr, min, max, allowLast, fieldName) {
    if (expr === '*' || expr === '?') {
      return {any: true, values: {}, last: false};
    }
    var values = {};
    var last = false;
    var parts = expr.split(',');
    var i;
    for (i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (!part) {
        throw new Error('Invalid ' + fieldName + ' in release schedule');
      }
      if (part === 'L') {
        if (!allowLast) {
          throw new Error('L is only valid in the day-of-month field');
        }
        last = true;
        continue;
      }
      if (part.indexOf('L') !== -1) {
        throw new Error('Only a bare L is supported in the day-of-month field');
      }
      var step = 1;
      var rangePart = part;
      if (part.indexOf('/') !== -1) {
        var stepSplit = part.split('/');
        if (stepSplit.length !== 2) {
          throw new Error('Invalid ' + fieldName + ' in release schedule');
        }
        rangePart = stepSplit[0];
        step = parseInt(stepSplit[1], 10);
        if (!step || step < 1) {
          throw new Error('Invalid step in ' + fieldName);
        }
      }
      var start;
      var end;
      if (rangePart === '*' || rangePart === '?') {
        start = min;
        end = max;
      } else if (rangePart.indexOf('-') !== -1) {
        var bounds = rangePart.split('-');
        if (bounds.length !== 2) {
          throw new Error('Invalid ' + fieldName + ' in release schedule');
        }
        start = parseInt(bounds[0], 10);
        end = parseInt(bounds[1], 10);
      } else {
        start = parseInt(rangePart, 10);
        end = start;
      }
      if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
        throw new Error('Invalid ' + fieldName + ' "' + expr + '"');
      }
      var n;
      for (n = start; n <= end; n += step) {
        values[n] = true;
      }
    }
    return {any: false, values: values, last: last};
  }

  function parse(expression) {
    if (!expression || !String(expression).trim()) {
      return null;
    }
    var fields = String(expression).trim().split(/\s+/);
    var domExpr;
    var monthExpr;
    var dowExpr;
    var yearExpr = null;
    if (fields.length === 5) {
      parseField(fields[0], 0, 59, false, 'minute');
      parseField(fields[1], 0, 23, false, 'hour');
      domExpr = fields[2];
      monthExpr = fields[3];
      dowExpr = fields[4];
    } else if (fields.length === 6 || fields.length === 7) {
      parseField(fields[0], 0, 59, false, 'second');
      parseField(fields[1], 0, 59, false, 'minute');
      parseField(fields[2], 0, 23, false, 'hour');
      domExpr = fields[3];
      monthExpr = fields[4];
      dowExpr = fields[5];
      if (fields.length === 7) {
        yearExpr = fields[6];
      }
    } else {
      throw new Error('Release schedule must have 5 fields (minute hour day-of-month month day-of-week), or 6 fields with a leading second');
    }
    return {
      expression: String(expression).trim(),
      dom: parseField(domExpr, 1, 31, true, 'day-of-month'),
      month: parseField(monthExpr, 1, 12, false, 'month'),
      dow: parseField(dowExpr, 0, 7, false, 'day-of-week'),
      year: yearExpr ? parseField(yearExpr, 1970, 2199, false, 'year') : {any: true, values: {}, last: false}
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

  function dayOfWeekMatches(field, date) {
    if (field.any) {
      return true;
    }
    var day = date.getDay();
    return !!(field.values[day] || (day === 0 && field.values[7]));
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
    if (!fieldMatches(schedule.month, date.getMonth() + 1) || !fieldMatches(schedule.year, date.getFullYear())) {
      return false;
    }
    var domAny = schedule.dom.any && !schedule.dom.last;
    var dowAny = schedule.dow.any;
    if (domAny && dowAny) {
      return true;
    }
    if (domAny) {
      return dayOfWeekMatches(schedule.dow, date);
    }
    if (dowAny) {
      return dayOfMonthMatches(schedule.dom, date);
    }
    return dayOfMonthMatches(schedule.dom, date) || dayOfWeekMatches(schedule.dow, date);
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
