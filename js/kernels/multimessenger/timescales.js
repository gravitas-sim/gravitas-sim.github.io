// =============================================================================
// Time systems: GPS, Fermi mission elapsed time, UTC and MJD(UTC) on one scale
// -----------------------------------------------------------------------------
// A delay between a gravitational-wave time (GPS) and a gamma-ray time (Fermi
// mission elapsed time, or a UTC string) is only a subtraction once both are on
// one continuous scale. UTC is not one: it steps by leap seconds. This module
// puts every system on T72, the SI seconds elapsed since 1972-01-01T00:00:00
// UTC, using a leap-second table THE CALLER SUPPLIES. No table is embedded: the
// table is data (the IERS list), and a table typed from memory is exactly the
// error this module exists to avoid.
//
//   GPS        seconds since 1980-01-06T00:00:00 UTC on a continuous scale
//              (GPS = TAI - 19 s), so T72 = GPS + T72(GPS epoch).
//   FERMI_MET  SI seconds since 2001-01-01T00:00:00 UTC (the mission's epoch
//              is that UTC instant; leap seconds are counted), so
//              T72 = MET + T72(2001-01-01).
//   UTC        an ISO 8601 string 'YYYY-MM-DDThh:mm:ss[.fff][Z]' or a calendar
//              object; second 60 is accepted on the day before a table step.
//   MJD_UTC    days, a day taken as 86400 s; refused on the day of a leap
//              second (the day has no single length).
//
// Limits. A double at 1.2e9 s resolves 2.4e-7 s, so conversions are good to
// about a microsecond and no better. Dates before 1972-01-01 are refused (UTC
// before that is a different, drifting, definition). The table must satisfy the
// definition of GPS: TAI - UTC is 19 s at 1980-01-06.
// =============================================================================

import { DAY_S, finite, refuse } from './constants.js';

export const SYSTEMS = Object.freeze(['GPS', 'FERMI_MET', 'UTC', 'MJD_UTC']);

const GPS_EPOCH = Object.freeze({ year: 1980, month: 1, day: 6 });
const FERMI_EPOCH = Object.freeze({ year: 2001, month: 1, day: 1 });
/** Days from 1970-01-01 to 1972-01-01. */
const DAYS_1970_TO_1972 = 730;
/** Days from 1858-11-17 (MJD 0) to 1970-01-01. */
const MJD_OF_1970 = 40587;

/** Days since 1970-01-01 of a proleptic Gregorian date (Hinnant's civil-from-days inverse). */
function daysFromCivil(y, m, d) {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** The date of a day count since 1970-01-01. */
function civilFromDays(z0) {
  const z = z0 + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe -
      Math.floor(doe / 1460) +
      Math.floor(doe / 36524) -
      Math.floor(doe / 146096)) /
      365
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  return { year: yoe + era * 400 + (m <= 2 ? 1 : 0), month: m, day: d };
}

const pad = (n, w) => String(n).padStart(w, '0');

/**
 * Parse an ISO 8601 UTC string into a calendar object.
 * @param {string} s - 'YYYY-MM-DDThh:mm:ss[.fff][Z]' (a space may replace the T)
 */
export function parseUtc(s) {
  const m =
    typeof s === 'string' &&
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)Z?$/.exec(
      s.trim()
    );
  if (!m) refuse('invalid-utc', `not an ISO 8601 UTC time: ${String(s)}`);
  return {
    year: +m[1],
    month: +m[2],
    day: +m[3],
    hour: +m[4],
    minute: +m[5],
    second: +m[6],
  };
}

/** A calendar object as an ISO string with `digits` decimals in the seconds (second 60 is kept). */
export function formatUtc(cal, digits = 3) {
  const sec = cal.second.toFixed(digits);
  const [whole, frac] = sec.split('.');
  return (
    `${pad(cal.year, 4)}-${pad(cal.month, 2)}-${pad(cal.day, 2)}T` +
    `${pad(cal.hour, 2)}:${pad(cal.minute, 2)}:${pad(+whole, 2)}${frac ? `.${frac}` : ''}`
  );
}

/**
 * Validate and freeze a leap-second table.
 * @param {{from: string, taiMinusUtc: number}[]} entries - the table: each entry's date (YYYY-MM-DD) is the first day
 *   on which TAI - UTC has the stated value; ascending; the first is 1972-01-01 with 10 s
 * @returns {{entries: {from: string, day72: number, taiMinusUtc: number}[]}}
 */
export function makeLeapTable(entries) {
  if (!Array.isArray(entries) || entries.length < 2)
    refuse('bad-leap-table', 'a leap-second table needs at least two entries');
  const rows = entries.map(e => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(e?.from));
    if (!m || !Number.isInteger(e.taiMinusUtc))
      refuse(
        'bad-leap-table',
        'each entry is {from: YYYY-MM-DD, taiMinusUtc: integer}'
      );
    return {
      from: e.from,
      day72: daysFromCivil(+m[1], +m[2], +m[3]) - DAYS_1970_TO_1972,
      taiMinusUtc: e.taiMinusUtc,
    };
  });
  if (rows[0].day72 !== 0 || rows[0].taiMinusUtc !== 10)
    refuse(
      'bad-leap-table',
      'the table starts at 1972-01-01 with TAI - UTC = 10 s'
    );
  for (let i = 1; i < rows.length; i++)
    if (
      rows[i].day72 <= rows[i - 1].day72 ||
      rows[i].taiMinusUtc <= rows[i - 1].taiMinusUtc
    )
      refuse('bad-leap-table', 'entries must ascend in date and in TAI - UTC');
  const table = Object.freeze({ entries: Object.freeze(rows) });
  const gps = taiMinusUtcOnDay(
    table,
    daysFromCivil(1980, 1, 6) - DAYS_1970_TO_1972
  );
  if (gps !== 19)
    refuse(
      'bad-leap-table',
      `TAI - UTC must be 19 s at the GPS epoch 1980-01-06 (the table says ${gps})`
    );
  return table;
}

/** TAI - UTC in force during the UTC day with this index (days since 1972-01-01). */
function taiMinusUtcOnDay(table, day72) {
  let v = null;
  for (const e of table.entries) if (e.day72 <= day72) v = e.taiMinusUtc;
  return v;
}

/** How many seconds are inserted at the end of the UTC day with this index (0 on an ordinary day). */
function insertedAtEndOfDay(table, day72) {
  const a = taiMinusUtcOnDay(table, day72);
  const b = taiMinusUtcOnDay(table, day72 + 1);
  return b - a;
}

/** The last day the table can speak for is not bounded (the last offset holds), but a day before 1972 is refused. */
function checkAfter1972(day72) {
  if (day72 < 0)
    refuse('before-1972', 'UTC before 1972-01-01 is not supported');
}

/**
 * A UTC calendar time on T72.
 * @param {{year,month,day,hour,minute,second}} cal
 * @param {object} table - from makeLeapTable
 */
export function utcToT72(cal, table) {
  const { year, month, day, hour, minute, second } = cal;
  for (const [k, v] of Object.entries({
    year,
    month,
    day,
    hour,
    minute,
    second,
  }))
    finite(v, k);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0
  )
    refuse('invalid-utc', 'calendar field out of range');
  const d1970 = daysFromCivil(year, month, day);
  const back = civilFromDays(d1970);
  if (back.year !== year || back.month !== month || back.day !== day)
    refuse('invalid-utc', 'no such calendar date');
  const day72 = d1970 - DAYS_1970_TO_1972;
  checkAfter1972(day72);
  if (second >= 60) {
    const inserted = insertedAtEndOfDay(table, day72);
    if (!(hour === 23 && minute === 59 && second < 60 + inserted))
      refuse(
        'invalid-utc',
        `second ${second} is not a leap second on ${year}-${pad(month, 2)}-${pad(day, 2)}`
      );
  }
  const off = taiMinusUtcOnDay(table, day72);
  return day72 * DAY_S + hour * 3600 + minute * 60 + second + (off - 10);
}

/**
 * A T72 time as a UTC calendar time (second 60 on a leap second).
 * @param {number} t72
 * @param {object} table
 */
export function t72ToUtc(t72, table) {
  finite(t72, 't72');
  const d0 = Math.floor(t72 / DAY_S);
  for (const day72 of [d0, d0 - 1, d0 + 1]) {
    if (day72 < 0) continue;
    const off = taiMinusUtcOnDay(table, day72);
    const sod = t72 - day72 * DAY_S - (off - 10);
    const length = DAY_S + insertedAtEndOfDay(table, day72);
    if (sod >= 0 && sod < length) {
      const d = civilFromDays(day72 + DAYS_1970_TO_1972);
      if (sod >= DAY_S)
        return { ...d, hour: 23, minute: 59, second: sod - DAY_S + 60 };
      const hour = Math.floor(sod / 3600);
      const minute = Math.floor((sod - hour * 3600) / 60);
      return { ...d, hour, minute, second: sod - hour * 3600 - minute * 60 };
    }
  }
  return refuse('before-1972', 'UTC before 1972-01-01 is not supported');
}

const epochT72 = (epoch, table) =>
  utcToT72({ ...epoch, hour: 0, minute: 0, second: 0 }, table);

/**
 * A stamp in one of the systems on T72, SI seconds since 1972-01-01T00:00:00 UTC.
 * @param {{value: number|string|object, system: string}} time
 * @param {object} table - from makeLeapTable
 */
export function toT72({ value, system }, table) {
  switch (system) {
    case 'GPS':
      return finite(value, 'GPS time') + epochT72(GPS_EPOCH, table);
    case 'FERMI_MET':
      return finite(value, 'Fermi MET') + epochT72(FERMI_EPOCH, table);
    case 'UTC':
      return utcToT72(
        typeof value === 'string' ? parseUtc(value) : value,
        table
      );
    case 'MJD_UTC': {
      finite(value, 'MJD');
      const day = Math.floor(value);
      const day72 = day - MJD_OF_1970 - DAYS_1970_TO_1972;
      checkAfter1972(day72);
      if (insertedAtEndOfDay(table, day72) !== 0)
        refuse(
          'mjd-leap-day',
          'an MJD on the day of a leap second has no single day length; give UTC'
        );
      return (
        day72 * DAY_S +
        (value - day) * DAY_S +
        (taiMinusUtcOnDay(table, day72) - 10)
      );
    }
    default:
      return refuse(
        'unknown-system',
        `unknown time system: ${String(system)}`,
        { system }
      );
  }
}

/**
 * T72 expressed in one of the systems (UTC as a calendar object).
 * @param {number} t72
 * @param {string} system
 * @param {object} table
 */
export function fromT72(t72, system, table) {
  switch (system) {
    case 'GPS':
      return t72 - epochT72(GPS_EPOCH, table);
    case 'FERMI_MET':
      return t72 - epochT72(FERMI_EPOCH, table);
    case 'UTC':
      return t72ToUtc(t72, table);
    case 'MJD_UTC': {
      const cal = t72ToUtc(t72, table);
      if (cal.second >= 60) refuse('mjd-leap-day', 'a leap second has no MJD');
      const day72 =
        daysFromCivil(cal.year, cal.month, cal.day) - DAYS_1970_TO_1972;
      if (insertedAtEndOfDay(table, day72) !== 0)
        refuse(
          'mjd-leap-day',
          'an MJD on the day of a leap second has no single day length; give UTC'
        );
      return (
        day72 +
        DAYS_1970_TO_1972 +
        MJD_OF_1970 +
        (cal.hour * 3600 + cal.minute * 60 + cal.second) / DAY_S
      );
    }
    default:
      return refuse(
        'unknown-system',
        `unknown time system: ${String(system)}`,
        { system }
      );
  }
}

/**
 * The time from `a` to `b` in SI seconds (positive when b is later), whatever the systems.
 * @param {{value, system}} a
 * @param {{value, system}} b
 * @param {object} table
 */
export const delaySeconds = (a, b, table) => toT72(b, table) - toT72(a, table);
