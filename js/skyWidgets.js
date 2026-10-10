// =============================================================================
// The Sky Lab's lesson instruments
// -----------------------------------------------------------------------------
// Six instruments that dock the Sky Lab kernel (js/kernels/sky, SKY_LAB.md) in
// the introductory sky sequence (Roadmap II, Prompt 89). Every number a lesson
// asks for is read off the kernel by the `*Facts` function the instrument and
// the tests share, and listed in the readout: the canvas is a picture of the
// rows under it, never the only place a value is.
//
// The clock is Universal Time at a site on the Greenwich meridian (longitude
// 0), so "local time" is UT and nothing in a lesson needs a time-zone table.
// UTC stands in for UT1 (SKY_LAB.md). The stars come from the Sky Lab's
// catalogue sidecar, fetched once; their proper motion is neglected here (under
// 0.1 degree over the dates a lesson uses).
// =============================================================================

import { t, registerMessages } from './i18n/index.js';
import { EN_SKY } from './i18n/en.sky.js';
import { ES_SKY } from './i18n/es.sky.js';
import { fixed, withUnit, MINUS } from './format.js';
import {
  surface,
  responsiveHeight,
  palette,
  TYPE,
  typeAt,
} from './widgetCanvas.js';
import {
  julianDate,
  calendarDate,
  ttFromUt,
  siderealClock,
  riseTransitSet,
  twilightTimes,
  bodyTrack,
  apparentSun,
  apparentMoon,
  eclipticToEquatorial,
  nextSyzygies,
  geocentricEcliptic,
  heliocentric,
  planetPhase,
  phaseReading,
  altAzReading,
  loadStars,
  HORIZON_REFRACTION_DEG,
  SUN_SEMIDIAMETER_DEG,
} from './kernels/sky/index.js';
import { loadStarFile } from './kernels/sky/packs.js';
import { L_SUN_W, AU_M } from './kernels/radiation/constants.js';

registerMessages('en', EN_SKY);
registerMessages('es', ES_SKY);

const DEG = Math.PI / 180;

/** Day 0 of every instrument: 2025 January 1, 0h UT. */
export const REF_JD = julianDate(2025, 1, 1, 0);
/** Where the clock is: the Greenwich meridian, so local time is UT. */
const LON = 0;
const site = latDeg => ({ latDeg, lonDeg: LON });

// ---- the stars ---------------------------------------------------------------

/** Harvard Revised numbers of the stars the lessons use, in menu order. */
export const STAR_HR = [2491, 5340, 7001, 1708, 5056, 7557, 1457, 3982];
let starsByHr = null;

/** Supply the catalogue (a test, or a page that already has it). */
export function setSkyStars(doc) {
  starsByHr = new Map(loadStars(doc).map(s => [s.hr, s]));
}

/**
 * Resolves true once the star file has been tried. A failure is logged and the
 * star rows keep reading "loading" (the sky kernel itself needs no catalogue),
 * so a missing file never blocks the other instruments or the audits that wait
 * for every family. Never rejects.
 */
export const skyReady = loadStarFile()
  .then(doc => {
    setSkyStars(doc);
    return true;
  })
  .catch(err => {
    console.warn('The star catalogue could not be loaded:', err);
    return true;
  });

const starAt = i => starsByHr?.get(STAR_HR[Math.round(i)]) ?? null;
const fixedTarget = s => ({ type: 'fixed', raDeg: s.raDeg, decDeg: s.decDeg });
const starName = i => {
  const s = starAt(i);
  return s ? s.name || s.desig : t('skyW.loading');
};

// ---- small shared helpers ----------------------------------------------------

const pad2 = n => String(n).padStart(2, '0');
/** "2025-03-20 09:01 UT" for a Julian date. */
export function stamp(jd) {
  const c = calendarDate(jd + 0.5 / 1440);
  return `${c.year}-${pad2(c.month)}-${pad2(c.day)} ${pad2(c.hours)}:${pad2(c.minutes)} UT`;
}
const dateOnly = jd => stamp(jd).slice(0, 10);
/** Clock time of a Julian date, hh:mm. */
const clock = jd => stamp(jd).slice(11, 16);
const signed = (v, d = 1) => `${v < 0 ? MINUS : '+'}${fixed(Math.abs(v), d)}`;
const deg = (v, d = 1) => `${fixed(v, d)}°`;
const sgnDeg = (v, d = 1) => `${signed(v, d)}°`;
const hours = (h, d = 2) => withUnit(h, 'h', { sig: d + 1 });
const wrap360 = x => ((x % 360) + 360) % 360;
const wrap180 = x => wrap360(x + 180) - 180;

function frame(canvas, base, min) {
  const colors = palette();
  const { ctx: g, w, h } = surface(canvas, responsiveHeight(base, min));
  return { colors, g, w, h };
}

/** A plot rectangle with a border and ticks; returns its mappers. */
function axes(g, colors, r, x0, x1, y0, y1, xTicks, yTicks) {
  const X = x => r.x + ((x - x0) / (x1 - x0)) * r.w;
  const Y = y => r.y + r.h - ((y - y0) / (y1 - y0)) * r.h;
  g.strokeStyle = colors.grid;
  g.lineWidth = 1;
  g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  g.font = typeAt(TYPE.TICK);
  g.fillStyle = colors.muted;
  g.textBaseline = 'top';
  g.textAlign = 'center';
  for (const [v, label] of xTicks) g.fillText(label, X(v), r.y + r.h + 3);
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  for (const [v, label] of yTicks) {
    g.beginPath();
    g.moveTo(r.x, Y(v) + 0.5);
    g.lineTo(r.x + r.w, Y(v) + 0.5);
    g.globalAlpha = 0.35;
    g.stroke();
    g.globalAlpha = 1;
    g.fillText(label, r.x - 4, Y(v));
  }
  return { X, Y };
}

function line(g, pts, color, width = 1.8, dash = []) {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.setLineDash(dash);
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
  g.setLineDash([]);
}

const dot = (g, x, y, color, rad = 4) => {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, rad, 0, 2 * Math.PI);
  g.fill();
};

const lat = {
  id: 'lat',
  get label() {
    return t('skyW.control.lat');
  },
  min: -60,
  max: 70,
  step: 1,
  value: 40,
  decimals: 0,
  format: v => sgnDeg(v, 0).replace('+0°', '0°'),
};

// =============================================================================
// 1. The turning sky
// =============================================================================

/**
 * What the turning-sky instrument shows: when a star rises, crosses the
 * meridian and sets on a night, and the sidereal time at the middle of it.
 * A "night" starts at noon of its date (UT), so a rising time is read as
 * minutes after noon and never wraps through midnight.
 */
export function turningFacts({ lat: latDeg, nights, star }) {
  const s = starAt(star);
  const jdNoon = REF_JD + nights + 0.5;
  const midnight = REF_JD + nights + 1;
  const clk = siderealClock(midnight, LON);
  const out = {
    nights,
    jdNoon,
    star: s,
    lstMidnightH: clk.lastDeg / 15,
    lmstMidnightH: clk.lmstDeg / 15,
  };
  if (!s) return { ...out, ready: false };
  const target = fixedTarget(s);
  const here = riseTransitSet(target, jdNoon, site(latDeg));
  // One passage: the rise in this window, then the transit and the set that
  // follow it (which may fall in the next window, after the next noon).
  const next = riseTransitSet(target, jdNoon + 1, site(latDeg));
  const after = (a, b) =>
    a !== null && (here.riseJd === null || a > here.riseJd) ? a : b;
  const r = {
    ...here,
    transitJd: after(here.transitJd, next.transitJd),
    setJd: after(here.setJd, next.setJd),
  };
  const min = jd => (jd === null ? null : (jd - jdNoon) * 1440);
  return {
    ...out,
    ready: true,
    status: here.status,
    riseJd: r.riseJd,
    transitJd: r.transitJd,
    setJd: r.setJd,
    riseMinAfterNoon: min(r.riseJd),
    transitMinAfterNoon: min(r.transitJd),
    setMinAfterNoon: min(r.setJd),
    aboveHours:
      r.riseJd !== null && r.setJd !== null ? (r.setJd - r.riseJd) * 24 : null,
    transitAltDeg: here.transitAltDeg ?? next.transitAltDeg,
    hourAngleMidnightDeg: wrap180(clk.lastDeg - s.raDeg),
  };
}

function drawTurning(canvas, v) {
  const { colors, g, w, h } = frame(canvas, 270, 210);
  const f = turningFacts(v);
  const r = { x: 38, y: 10, w: w - 50, h: h - 38 };
  const { X, Y } = axes(
    g,
    colors,
    r,
    0,
    24,
    -40,
    90,
    [0, 6, 12, 18, 24].map(x => [x, pad2((x + 12) % 24)]),
    [-30, 0, 30, 60, 90].map(y => [y, `${y}°`])
  );
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillStyle = colors.muted;
  g.fillText(t('skyW.turning.axis'), r.x, r.y + r.h + 18);
  if (!f.ready) return;
  const trace = (jdStart, target) => {
    const track = bodyTrack(target, site(v.lat));
    const pts = [];
    for (let i = 0; i <= 96; i++)
      pts.push([
        X(i / 4),
        Y(Math.max(-40, track.at(jdStart + i / 96).altGeom)),
      ]);
    return pts;
  };
  const target = fixedTarget(f.star);
  g.strokeStyle = colors.warn;
  g.setLineDash([2, 3]);
  g.beginPath();
  g.moveTo(r.x, Y(0));
  g.lineTo(r.x + r.w, Y(0));
  g.stroke();
  g.setLineDash([]);
  line(g, trace(REF_JD + 0.5, { type: 'sun' }), colors.warn, 1.2);
  if (v.nights > 0)
    line(g, trace(REF_JD + 0.5, target), colors.muted, 1.4, [4, 3]);
  line(g, trace(f.jdNoon, target), colors.ink, 2);
  if (f.riseMinAfterNoon !== null)
    dot(g, X(f.riseMinAfterNoon / 60), Y(0), colors.accent, 4.5);
}

const TURNING = {
  id: 'sky-turning',
  get title() {
    return t('skyW.turning.title');
  },
  get note() {
    return t('skyW.turning.note');
  },
  animated: false,
  controls: [
    lat,
    {
      id: 'nights',
      get label() {
        return t('skyW.control.nights');
      },
      min: 0,
      max: 60,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => `${Math.round(v)}`,
    },
    {
      id: 'star',
      get label() {
        return t('skyW.control.star');
      },
      min: 0,
      max: STAR_HR.length - 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => starName(v),
    },
  ],
  presets: [
    {
      values: { nights: 0 },
      get label() {
        return t('skyW.turning.preset0');
      },
    },
    {
      values: { nights: 30 },
      get label() {
        return t('skyW.turning.preset30');
      },
    },
  ],
  draw: drawTurning,
  readout(v) {
    const f = turningFacts(v);
    const rows = [
      {
        label: t('skyW.row.kind'),
        value: t('skyW.value.kind'),
        emphasis: true,
      },
      { label: t('skyW.row.date'), value: dateOnly(f.jdNoon) },
    ];
    if (!f.ready)
      return [...rows, { label: t('skyW.row.star'), value: t('skyW.loading') }];
    const when = (m, jd) =>
      jd === null
        ? t('skyW.none')
        : t('skyW.turning.when', {
            clock: clock(jd),
            min: fixed(m, 1),
          });
    return [
      ...rows,
      {
        label: t('skyW.row.star'),
        value: t('skyW.value.star', {
          name: starName(v.star),
          ra: fixed(f.star.raDeg / 15, 3),
          dec: signed(f.star.decDeg, 1),
        }),
      },
      {
        label: t('skyW.row.lst'),
        value: hours(f.lstMidnightH, 3),
        emphasis: true,
      },
      {
        label: t('skyW.row.rise'),
        value: when(f.riseMinAfterNoon, f.riseJd),
        emphasis: true,
      },
      {
        label: t('skyW.row.transit'),
        value: when(f.transitMinAfterNoon, f.transitJd),
      },
      { label: t('skyW.row.set'), value: when(f.setMinAfterNoon, f.setJd) },
      {
        label: t('skyW.row.above'),
        value: f.aboveHours === null ? t('skyW.none') : hours(f.aboveHours, 3),
      },
      {
        label: t('skyW.row.transitAlt'),
        value:
          f.transitAltDeg === null ? t('skyW.none') : deg(f.transitAltDeg, 1),
      },
      {
        label: t('skyW.row.status'),
        value: t(`skyW.status.${f.status}`),
      },
    ];
  },
};

// =============================================================================
// 2. The Sun through the year
// =============================================================================

export const TRUE_TILT = 23.44;
/** Top-of-atmosphere solar constant, W/m2, from the radiation kernel's Sun. */
export const SOLAR_CONSTANT = L_SUN_W / (4 * Math.PI * AU_M * AU_M);
const H0_SUN = -(HORIZON_REFRACTION_DEG + SUN_SEMIDIAMETER_DEG);

/**
 * The Sun at local noon of a day: its declination (from the ecliptic and the
 * tilt, a "what if" the instrument lets a student change), the altitude at
 * noon, the length of the day and the daily mean insolation at the top of the
 * atmosphere.
 */
export function seasonFacts({ lat: latDeg, day, tilt }) {
  const jd = REF_JD + day + 0.5;
  const sun = apparentSun(ttFromUt(jd));
  const dec = eclipticToEquatorial(sun.longitudeDeg, 0, tilt).decDeg;
  const phi = latDeg * DEG;
  const d = dec * DEG;
  const cosH =
    (Math.sin(H0_SUN * DEG) - Math.sin(phi) * Math.sin(d)) /
    (Math.cos(phi) * Math.cos(d));
  const H = cosH <= -1 ? Math.PI : cosH >= 1 ? 0 : Math.acos(cosH);
  const cos0 = -Math.tan(phi) * Math.tan(d);
  const H0 = cos0 <= -1 ? Math.PI : cos0 >= 1 ? 0 : Math.acos(cos0);
  const insolation =
    (SOLAR_CONSTANT / Math.PI / (sun.distanceAu * sun.distanceAu)) *
    (H0 * Math.sin(phi) * Math.sin(d) +
      Math.cos(phi) * Math.cos(d) * Math.sin(H0));
  const noonAlt = 90 - Math.abs(latDeg - dec);
  let sunrise = null;
  if (H > 0 && H < Math.PI) {
    const c = Math.sin(d) / Math.cos(phi);
    if (Math.abs(c) <= 1) sunrise = Math.acos(c) / DEG;
  }
  return {
    jd,
    longitudeDeg: sun.longitudeDeg,
    decDeg: dec,
    distanceAu: sun.distanceAu,
    noonAltDeg: noonAlt,
    dayLengthH: (2 * H) / DEG / 15,
    sunriseAzDeg: sunrise,
    insolationWm2: insolation,
    polar: H === 0 ? 'night' : H === Math.PI ? 'day' : null,
  };
}

function drawSeasons(canvas, v) {
  const { colors, g, w, h } = frame(canvas, 290, 230);
  const cur = seasonFacts(v);
  const gap = 26;
  const ph = (h - 40 - gap) / 2;
  const mon = [0, 90, 181, 273, 365];
  const labels = ['1 Jan', '1 Apr', '1 Jul', '1 Oct', '1 Jan'];
  const xt = mon.map((d, i) => [d, labels[i]]);
  const top = { x: 38, y: 8, w: w - 50, h: ph };
  const bot = { x: 38, y: 8 + ph + gap, w: w - 50, h: ph };
  const a = axes(
    g,
    colors,
    top,
    0,
    365,
    -10,
    90,
    [],
    [
      [0, '0°'],
      [30, '30°'],
      [60, '60°'],
      [90, '90°'],
    ]
  );
  const b = axes(g, colors, bot, 0, 365, 0, 24, xt, [
    [0, '0'],
    [12, '12'],
    [24, '24'],
  ]);
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillStyle = colors.muted;
  g.fillText(t('skyW.seasons.altLabel'), top.x + 4, top.y + 2);
  g.fillText(t('skyW.seasons.lenLabel'), bot.x + 4, bot.y + 2);
  const A = [];
  const B = [];
  for (let d = 0; d <= 365; d += 5) {
    const f = seasonFacts({ ...v, day: d });
    A.push([a.X(d), a.Y(Math.max(-10, f.noonAltDeg))]);
    B.push([b.X(d), b.Y(f.dayLengthH)]);
  }
  line(g, A, colors.accent, 2);
  line(g, B, colors.good, 2);
  g.strokeStyle = colors.warn;
  g.setLineDash([2, 3]);
  g.beginPath();
  g.moveTo(a.X(v.day), top.y);
  g.lineTo(a.X(v.day), bot.y + bot.h);
  g.stroke();
  g.setLineDash([]);
  dot(g, a.X(v.day), a.Y(Math.max(-10, cur.noonAltDeg)), colors.warn);
  dot(g, b.X(v.day), b.Y(cur.dayLengthH), colors.warn);
}

const SEASONS = {
  id: 'sky-seasons',
  get title() {
    return t('skyW.seasons.title');
  },
  get note() {
    return t('skyW.seasons.note');
  },
  animated: false,
  controls: [
    lat,
    {
      id: 'day',
      get label() {
        return t('skyW.control.day');
      },
      min: 0,
      max: 364,
      step: 1,
      value: 78,
      decimals: 0,
      format: v => dateOnly(REF_JD + Math.round(v)),
    },
    {
      id: 'tilt',
      get label() {
        return t('skyW.control.tilt');
      },
      min: 0,
      max: 45,
      step: 0.01,
      value: TRUE_TILT,
      decimals: 2,
      format: v => deg(v, 2),
    },
  ],
  presets: [
    {
      values: { day: 78 },
      get label() {
        return t('skyW.seasons.pMarch');
      },
    },
    {
      values: { day: 171 },
      get label() {
        return t('skyW.seasons.pJune');
      },
    },
    {
      values: { day: 264 },
      get label() {
        return t('skyW.seasons.pSep');
      },
    },
    {
      values: { day: 354 },
      get label() {
        return t('skyW.seasons.pDec');
      },
    },
    {
      values: { tilt: 0 },
      get label() {
        return t('skyW.seasons.pNoTilt');
      },
    },
    {
      values: { tilt: TRUE_TILT },
      get label() {
        return t('skyW.seasons.pTilt');
      },
    },
  ],
  draw: drawSeasons,
  readout(v) {
    const f = seasonFacts(v);
    return [
      {
        label: t('skyW.row.kind'),
        value: t('skyW.value.kind'),
        emphasis: true,
      },
      { label: t('skyW.row.date'), value: dateOnly(f.jd) },
      { label: t('skyW.row.sunLon'), value: deg(f.longitudeDeg, 1) },
      { label: t('skyW.row.dec'), value: sgnDeg(f.decDeg, 1), emphasis: true },
      {
        label: t('skyW.row.noonAlt'),
        value: deg(f.noonAltDeg, 1),
        emphasis: true,
      },
      {
        label: t('skyW.row.dayLen'),
        value:
          f.polar === 'day'
            ? t('skyW.seasons.polarDay')
            : f.polar === 'night'
              ? t('skyW.seasons.polarNight')
              : hours(f.dayLengthH, 3),
        emphasis: true,
      },
      {
        label: t('skyW.row.sunriseAz'),
        value:
          f.sunriseAzDeg === null ? t('skyW.none') : deg(f.sunriseAzDeg, 1),
      },
      {
        label: t('skyW.row.sunDist'),
        value: withUnit(f.distanceAu, 'au', { sig: 5 }),
      },
      {
        label: t('skyW.row.insol'),
        value: withUnit(f.insolationWm2, 'W/m²', { sig: 3 }),
      },
    ];
  },
};

// =============================================================================
// 3. Phases
// =============================================================================

let newMoon0 = null;
/** The new Moon the phases instrument counts from: 2025 January 29. */
export const refNewMoon = () =>
  (newMoon0 ??= nextSyzygies(julianDate(2025, 1, 20, 0)).newMoonJd);

const PHASE_NAMES = [
  'new',
  'waxingCrescent',
  'firstQuarter',
  'waxingGibbous',
  'full',
  'waningGibbous',
  'lastQuarter',
  'waningCrescent',
];
/** The name of the phase for an ecliptic elongation east of the Sun. */
export const phaseName = e =>
  PHASE_NAMES[Math.floor(((wrap360(e) + 22.5) % 360) / 45)];

export function phaseFacts({ day }) {
  const jd = refNewMoon() + day;
  const p = phaseReading(jd);
  const m = apparentMoon(ttFromUt(jd));
  return {
    jd,
    ageDays: day,
    ...p,
    moonLatDeg: m.latitudeDeg,
    name: phaseName(p.eclipticElongationDeg),
  };
}

function drawPhases(canvas, v) {
  const { colors, g, w, h } = frame(canvas, 250, 200);
  const f = phaseFacts(v);
  const cx = w * 0.3;
  const cy = h / 2;
  const R = Math.min(h / 2 - 22, w * 0.22);
  g.strokeStyle = colors.grid;
  g.lineWidth = 1;
  g.beginPath();
  g.arc(cx, cy, R, 0, 2 * Math.PI);
  g.stroke();
  // Sunlight comes from the left, drawn as arrows.
  g.strokeStyle = colors.warn;
  for (let k = -1; k <= 1; k++) {
    const y = cy + k * 22;
    g.beginPath();
    g.moveTo(8, y);
    g.lineTo(34, y);
    g.moveTo(28, y - 4);
    g.lineTo(34, y);
    g.lineTo(28, y + 4);
    g.stroke();
  }
  dot(g, cx, cy, colors.accent, 7);
  // The Moon is toward the Sun (left) when new and swings counterclockwise.
  const ex = cx - R * Math.cos(f.eclipticElongationDeg * DEG);
  const ey = cy + R * Math.sin(f.eclipticElongationDeg * DEG);
  g.fillStyle = colors.muted;
  g.beginPath();
  g.arc(ex, ey, 6, 0, 2 * Math.PI);
  g.fill();
  g.font = typeAt(TYPE.TICK);
  g.textAlign = 'center';
  g.textBaseline = 'top';
  g.fillStyle = colors.muted;
  g.fillText(t('skyW.phases.earth'), cx, cy + 10);
  g.fillText(t('skyW.phases.toSun'), 22, cy + 40);
  // The disc as seen from Earth, with its terminator.
  const dx = w * 0.75;
  const dr = Math.min(h / 2 - 26, w * 0.15);
  g.fillStyle = colors.grid;
  g.beginPath();
  g.arc(dx, cy, dr, 0, 2 * Math.PI);
  g.fill();
  g.save();
  g.beginPath();
  g.arc(dx, cy, dr, 0, 2 * Math.PI);
  g.clip();
  const lit = f.waxing ? 1 : -1; // lit limb on the right when waxing (north up, northern sky)
  const k = Math.cos(f.phaseAngleDeg * DEG); // -1 new .. +1 full
  g.fillStyle = colors.ink;
  g.beginPath();
  g.rect(dx - (lit === 1 ? 0 : dr), cy - dr, dr, 2 * dr);
  g.fill();
  g.fillStyle = k >= 0 ? colors.ink : colors.grid;
  g.beginPath();
  g.ellipse(dx, cy, Math.abs(k) * dr, dr, 0, 0, 2 * Math.PI);
  g.fill();
  g.restore();
  g.fillStyle = colors.muted;
  g.fillText(t('skyW.phases.disc'), dx, cy + dr + 6);
}

const PHASES = {
  id: 'sky-phases',
  get title() {
    return t('skyW.phases.title');
  },
  get note() {
    return t('skyW.phases.note');
  },
  animated: false,
  controls: [
    {
      id: 'day',
      get label() {
        return t('skyW.control.age');
      },
      min: 0,
      max: 29.5,
      step: 0.1,
      value: 0,
      decimals: 1,
      format: v => withUnit(v, 'd', { sig: 3 }),
    },
  ],
  presets: [
    {
      values: { day: 0 },
      get label() {
        return t('skyW.phases.p0');
      },
    },
    {
      values: { day: 7.4 },
      get label() {
        return t('skyW.phases.p7');
      },
    },
    {
      values: { day: 14.8 },
      get label() {
        return t('skyW.phases.p15');
      },
    },
    {
      values: { day: 22.1 },
      get label() {
        return t('skyW.phases.p22');
      },
    },
  ],
  draw: drawPhases,
  readout(v) {
    const f = phaseFacts(v);
    return [
      {
        label: t('skyW.row.kind'),
        value: t('skyW.value.kind'),
        emphasis: true,
      },
      { label: t('skyW.row.date'), value: stamp(f.jd) },
      {
        label: t('skyW.row.elong'),
        value: deg(f.eclipticElongationDeg, 1),
        emphasis: true,
      },
      { label: t('skyW.row.phaseAngle'), value: deg(f.phaseAngleDeg, 1) },
      {
        label: t('skyW.row.lit'),
        value: fixed(f.illuminated, 3),
        emphasis: true,
      },
      { label: t('skyW.row.phaseName'), value: t(`skyW.phase.${f.name}`) },
      { label: t('skyW.row.moonLat'), value: sgnDeg(f.moonLatDeg, 2) },
    ];
  },
};

// =============================================================================
// 4. Eclipse seasons
// =============================================================================

/**
 * The Moon's ecliptic latitude at new and full Moon: an eclipse is possible
 * when it is smaller than this. A rough limit for a lesson (the Sun's and
 * Moon's half-widths and the Moon's parallax add to about 1.5 degrees), stated
 * as one, not a prediction of which eclipse is seen from where.
 */
export const ECLIPSE_LIMIT_DEG = 1.5;
const WINDOW_DAYS = 183;

/** Every new and full Moon in the half year from month `month` of 2025 on. */
export function eclipseList({ month }) {
  const start = julianDate(2025, 1, 1, 0) + Math.round(month) * 30.4375;
  const events = [];
  let jd = start;
  while (jd < start + WINDOW_DAYS) {
    const n = nextSyzygies(jd);
    for (const [kind, at] of [
      ['new', n.newMoonJd],
      ['full', n.fullMoonJd],
    ]) {
      if (at < start + WINDOW_DAYS) {
        const beta = apparentMoon(ttFromUt(at)).latitudeDeg;
        events.push({
          kind,
          jd: at,
          betaDeg: beta,
          possible: Math.abs(beta) < ECLIPSE_LIMIT_DEG,
        });
      }
    }
    jd = Math.max(n.newMoonJd, n.fullMoonJd) + 1;
  }
  events.sort((a, b) => a.jd - b.jd);
  return { start, events };
}

function drawEclipses(canvas, v) {
  const { colors, g, w, h } = frame(canvas, 250, 200);
  const { start, events } = eclipseList(v);
  const r = { x: 38, y: 10, w: w - 50, h: h - 34 };
  const { X, Y } = axes(
    g,
    colors,
    r,
    0,
    WINDOW_DAYS,
    -6,
    6,
    [],
    [-5, -2.5, 0, 2.5, 5].map(y => [y, `${y}°`])
  );
  g.fillStyle = colors.good;
  g.globalAlpha = 0.14;
  g.fillRect(
    r.x,
    Y(ECLIPSE_LIMIT_DEG),
    r.w,
    Y(-ECLIPSE_LIMIT_DEG) - Y(ECLIPSE_LIMIT_DEG)
  );
  g.globalAlpha = 1;
  const pts = [];
  for (let d = 0; d <= WINDOW_DAYS; d += 1)
    pts.push([X(d), Y(apparentMoon(ttFromUt(start + d)).latitudeDeg)]);
  line(g, pts, colors.muted, 1.6);
  g.font = typeAt(TYPE.TICK);
  g.textAlign = 'center';
  g.textBaseline = 'top';
  g.fillStyle = colors.muted;
  for (let d = 0; d <= WINDOW_DAYS; d += 30)
    g.fillText(dateOnly(start + d).slice(2, 7), X(d), r.y + r.h + 3);
  for (const e of events) {
    const x = X(e.jd - start);
    const y = Y(e.betaDeg);
    g.strokeStyle = e.possible ? colors.good : colors.ink;
    g.fillStyle = e.possible ? colors.good : colors.ink;
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(x, y, e.possible ? 5 : 3.5, 0, 2 * Math.PI);
    if (e.kind === 'new') g.fill();
    else g.stroke();
  }
}

const ECLIPSES = {
  id: 'sky-eclipses',
  get title() {
    return t('skyW.eclipses.title');
  },
  get note() {
    return t('skyW.eclipses.note');
  },
  animated: false,
  controls: [
    {
      id: 'month',
      get label() {
        return t('skyW.control.month');
      },
      min: 0,
      max: 24,
      step: 1,
      value: 0,
      decimals: 0,
      format: v =>
        dateOnly(julianDate(2025, 1, 1, 0) + Math.round(v) * 30.4375).slice(
          0,
          7
        ),
    },
  ],
  presets: [
    {
      values: { month: 0 },
      get label() {
        return t('skyW.eclipses.p0');
      },
    },
    {
      values: { month: 6 },
      get label() {
        return t('skyW.eclipses.p6');
      },
    },
    {
      values: { month: 12 },
      get label() {
        return t('skyW.eclipses.p12');
      },
    },
  ],
  draw: drawEclipses,
  readout(v) {
    const { events } = eclipseList(v);
    return [
      {
        label: t('skyW.row.kind'),
        value: t('skyW.value.kind'),
        emphasis: true,
      },
      {
        label: t('skyW.row.limit'),
        value: t('skyW.eclipses.limit', { v: ECLIPSE_LIMIT_DEG }),
      },
      ...events.map(e => ({
        label: `${stamp(e.jd)} ${t(`skyW.eclipses.${e.kind}`)}`,
        value: t(e.possible ? 'skyW.eclipses.yes' : 'skyW.eclipses.no', {
          beta: signed(e.betaDeg, 2),
        }),
        emphasis: e.possible,
      })),
    ];
  },
};

// =============================================================================
// 5. Wanderers
// =============================================================================

export const WANDERERS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];
/** Day 0 of the wanderers instrument: 2024 October 1, 0h UT. */
export const WANDER_JD = julianDate(2024, 10, 1, 0);
const eclLonLat = (body, jd) => {
  const [x, y, z] = geocentricEcliptic(body, ttFromUt(jd));
  return [
    wrap360(Math.atan2(y, x) / DEG),
    Math.atan2(z, Math.hypot(x, y)) / DEG,
  ];
};

export function wandererFacts({ planet, day }) {
  const body = WANDERERS[Math.round(planet)];
  const jd = WANDER_JD + day;
  const [lon, latDeg] = eclLonLat(body, jd);
  const rate =
    wrap180(eclLonLat(body, jd + 1)[0] - eclLonLat(body, jd - 1)[0]) / 2;
  const ph = planetPhase(body, ttFromUt(jd));
  return {
    body,
    jd,
    lonDeg: lon,
    latDeg,
    rateDegPerDay: rate,
    retrograde: rate < 0,
    elongationDeg: ph.elongationDeg,
    illuminated: ph.illuminated,
    distanceAu: ph.distanceAu,
    earth: heliocentric('earth', ttFromUt(jd)),
    planetXyz: heliocentric(body, ttFromUt(jd)),
  };
}

function drawWanderers(canvas, v) {
  const { colors, g, w, h } = frame(canvas, 260, 210);
  const f = wandererFacts(v);
  const half = Math.floor(w / 2);
  // Left: the path on the sky, 120 days either side.
  const r = { x: 34, y: 12, w: half - 44, h: h - 40 };
  const span = 120;
  const track = [];
  for (let d = -span; d <= span; d += 2)
    track.push(eclLonLat(f.body, f.jd + d));
  const lons = track.map(p => wrap180(p[0] - f.lonDeg));
  const lats = track.map(p => p[1] - f.latDeg);
  const rx = Math.max(2, ...lons.map(Math.abs)) * 1.15;
  const ry = Math.max(0.5, ...lats.map(Math.abs)) * 1.15;
  const { X, Y } = axes(g, colors, r, -rx, rx, -ry, ry, [], [[0, '0°']]);
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillStyle = colors.muted;
  g.font = typeAt(TYPE.TICK);
  g.fillText(t('skyW.wander.skyLabel'), r.x + 3, r.y + r.h + 3);
  line(
    g,
    lons.map((x, i) => [X(-x), Y(lats[i])]),
    colors.ink,
    1.6
  );
  dot(g, X(0), Y(0), f.retrograde ? colors.warn : colors.accent, 5);
  // Right: the orbits from above.
  const cx = half + (w - half) / 2;
  const cy = h / 2 - 8;
  const [px, py] = f.planetXyz;
  const [ex, ey] = f.earth;
  const R = Math.min((w - half) / 2 - 10, h / 2 - 28);
  const big = Math.max(1.1, Math.hypot(px, py) * 1.08);
  const S = R / big;
  g.strokeStyle = colors.grid;
  for (const a of [1, Math.hypot(px, py)]) {
    g.beginPath();
    g.arc(cx, cy, a * S, 0, 2 * Math.PI);
    g.stroke();
  }
  dot(g, cx, cy, colors.warn, 5);
  const E = [cx + ex * S, cy - ey * S];
  const P = [cx + px * S, cy - py * S];
  line(g, [E, P], colors.muted, 1, [3, 3]);
  dot(g, E[0], E[1], colors.good, 4);
  dot(g, P[0], P[1], colors.accent, 4);
  g.textAlign = 'center';
  g.fillStyle = colors.muted;
  g.fillText(t('skyW.wander.orbitLabel'), cx, cy + R + 8);
}

const WANDERER = {
  id: 'sky-wanderers',
  get title() {
    return t('skyW.wander.title');
  },
  get note() {
    return t('skyW.wander.note');
  },
  animated: false,
  controls: [
    {
      id: 'planet',
      get label() {
        return t('skyW.control.planet');
      },
      min: 0,
      max: 4,
      step: 1,
      value: 2,
      decimals: 0,
      format: v => t(`skyW.planet.${WANDERERS[Math.round(v)]}`),
    },
    {
      id: 'day',
      get label() {
        return t('skyW.control.dayFrom');
      },
      min: 0,
      max: 800,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => `${Math.round(v)}: ${dateOnly(WANDER_JD + Math.round(v))}`,
    },
  ],
  presets: [
    {
      values: { planet: 2, day: 0 },
      get label() {
        return t('skyW.wander.pMars');
      },
    },
    {
      values: { planet: 1, day: 0 },
      get label() {
        return t('skyW.wander.pVenus');
      },
    },
    {
      values: { planet: 0, day: 0 },
      get label() {
        return t('skyW.wander.pMercury');
      },
    },
  ],
  draw: drawWanderers,
  readout(v) {
    const f = wandererFacts(v);
    return [
      {
        label: t('skyW.row.kind'),
        value: t('skyW.value.kind'),
        emphasis: true,
      },
      {
        label: t('skyW.row.date'),
        value: `${dateOnly(f.jd)} (${t('skyW.wander.dayNo', { n: Math.round(f.jd - WANDER_JD) })})`,
      },
      { label: t('skyW.row.eclLon'), value: deg(f.lonDeg, 2) },
      { label: t('skyW.row.eclLat'), value: sgnDeg(f.latDeg, 2) },
      {
        label: t('skyW.row.rate'),
        value: t('skyW.wander.rate', { v: signed(f.rateDegPerDay, 3) }),
        emphasis: true,
      },
      {
        label: t('skyW.row.motion'),
        value: t(f.retrograde ? 'skyW.wander.retro' : 'skyW.wander.direct'),
        emphasis: true,
      },
      {
        label: t('skyW.row.elong'),
        value: deg(f.elongationDeg, 1),
        emphasis: true,
      },
      { label: t('skyW.row.lit'), value: fixed(f.illuminated, 3) },
      {
        label: t('skyW.row.dist'),
        value: withUnit(f.distanceAu, 'au', { sig: 4 }),
      },
    ];
  },
};

// =============================================================================
// 6. An observing plan
// =============================================================================

const STEP_H = 0.25;

/** The sine of altitude and azimuth to an angle between two directions. */
const separationDeg = (a, b) => {
  const s = x => Math.sin(x * DEG);
  const c = x => Math.cos(x * DEG);
  const cosd =
    s(a.altDeg) * s(b.altDeg) +
    c(a.altDeg) * c(b.altDeg) * c(a.azDeg - b.azDeg);
  return Math.acos(Math.max(-1, Math.min(1, cosd))) / DEG;
};

/**
 * One night's plan: the dark (Sun below 18 degrees), the Moon, and for each
 * candidate star the hours it is usable: above the airmass limit, inside the
 * dark, and (while the Moon is up) farther from the Moon than the limit.
 */
export function planFacts({ lat: latDeg, day, airmassMax, moonSep }) {
  const s = site(latDeg);
  const jd0 = REF_JD + day;
  const dusk = twilightTimes(jd0, s).astronomical.duskJd;
  const dawn = twilightTimes(jd0 + 1, s).astronomical.dawnJd;
  const mid = jd0 + 0.75;
  const ph = phaseReading(jd0 + 0.9);
  const out = {
    jd0,
    duskJd: dusk,
    dawnJd: dawn,
    dark: dusk !== null && dawn !== null,
    darkHours: dusk !== null && dawn !== null ? (dawn - dusk) * 24 : 0,
    moonLit: ph.illuminated,
    moonUpHours: 0,
    targets: [],
    mid,
  };
  if (!out.dark) return out;
  const n = Math.max(1, Math.floor(out.darkHours / STEP_H));
  const times = Array.from(
    { length: n + 1 },
    (_, i) => dusk + (i * (dawn - dusk)) / n
  );
  const moons = times.map(jd => altAzReading({ type: 'moon' }, jd, s));
  out.moonUpHours =
    (moons.filter(m => m.altDeg > 0).length / (n + 1)) * out.darkHours;
  out.moonAlt = moons.map(m => m.altDeg);
  out.times = times;
  out.targets = STAR_HR.map((hr, k) => {
    const star = starAt(k);
    if (!star) return { hr, name: null, usableHours: 0, cells: [] };
    const tgt = fixedTarget(star);
    const cells = times.map((jd, i) => {
      const a = altAzReading(tgt, jd, s);
      const up = a.altDeg > 0;
      const am = up ? a.airmass : Infinity;
      const sep = moons[i].altDeg > 0 ? separationDeg(a, moons[i]) : 180;
      let state = 'down';
      if (up) state = am > airmassMax ? 'low' : sep < moonSep ? 'moon' : 'ok';
      return { state, airmass: am, sepDeg: sep };
    });
    const usable = cells.filter(c => c.state === 'ok');
    return {
      hr,
      name: star.name || star.desig,
      cells,
      usableHours: (usable.length / (n + 1)) * out.darkHours,
      bestAirmass: usable.length
        ? Math.min(...usable.map(c => c.airmass))
        : null,
    };
  });
  return out;
}

function drawPlan(canvas, v) {
  const { colors, g, w, h } = frame(canvas, 270, 220);
  const f = planFacts(v);
  g.font = typeAt(TYPE.TICK);
  g.textBaseline = 'middle';
  if (!f.dark || !f.targets.length || !f.targets[0].name) {
    g.fillStyle = colors.muted;
    g.textAlign = 'center';
    g.fillText(
      f.dark ? t('skyW.loading') : t('skyW.plan.noDark'),
      w / 2,
      h / 2
    );
    return;
  }
  const rows = f.targets.length + 1;
  const left = 62;
  const top = 8;
  const rh = (h - top - 22) / rows;
  const n = f.times.length;
  const cw = (w - left - 8) / n;
  const colorOf = {
    ok: colors.good,
    moon: colors.warn,
    low: colors.muted,
    down: 'transparent',
  };
  const label = (txt, row) => {
    g.fillStyle = colors.muted;
    g.textAlign = 'right';
    g.fillText(txt, left - 6, top + row * rh + rh / 2);
  };
  f.targets.forEach((tg, k) => {
    label(tg.name, k);
    tg.cells.forEach((c, i) => {
      g.globalAlpha = c.state === 'low' ? 0.35 : 1;
      g.fillStyle = colorOf[c.state];
      g.fillRect(left + i * cw, top + k * rh + 2, Math.ceil(cw), rh - 4);
    });
    g.globalAlpha = 1;
  });
  label(t('skyW.plan.moon'), f.targets.length);
  f.moonAlt.forEach((a, i) => {
    g.fillStyle = a > 0 ? colors.warn : 'transparent';
    g.globalAlpha = 0.6;
    g.fillRect(
      left + i * cw,
      top + f.targets.length * rh + 2,
      Math.ceil(cw),
      rh - 4
    );
    g.globalAlpha = 1;
  });
  g.strokeStyle = colors.grid;
  g.strokeRect(left + 0.5, top + 0.5, n * cw - 1, rows * rh - 1);
  g.textAlign = 'center';
  g.textBaseline = 'top';
  g.fillStyle = colors.muted;
  g.fillText(clock(f.duskJd), left, top + rows * rh + 4);
  g.fillText(clock(f.dawnJd), left + n * cw, top + rows * rh + 4);
}

const PLAN = {
  id: 'sky-plan',
  get title() {
    return t('skyW.plan.title');
  },
  get note() {
    return t('skyW.plan.note');
  },
  animated: false,
  controls: [
    lat,
    {
      id: 'day',
      get label() {
        return t('skyW.control.night');
      },
      min: 0,
      max: 364,
      step: 1,
      value: 45,
      decimals: 0,
      format: v => dateOnly(REF_JD + Math.round(v)),
    },
    {
      id: 'airmassMax',
      get label() {
        return t('skyW.control.airmass');
      },
      min: 1.1,
      max: 3,
      step: 0.1,
      value: 2,
      decimals: 1,
      format: v => fixed(v, 1),
    },
    {
      id: 'moonSep',
      get label() {
        return t('skyW.control.moonSep');
      },
      min: 0,
      max: 90,
      step: 5,
      value: 30,
      decimals: 0,
      format: v => deg(v, 0),
    },
  ],
  presets: [],
  draw: drawPlan,
  readout(v) {
    const f = planFacts(v);
    const rows = [
      {
        label: t('skyW.row.kind'),
        value: t('skyW.value.kind'),
        emphasis: true,
      },
      { label: t('skyW.row.date'), value: dateOnly(f.jd0) },
    ];
    if (!f.dark)
      return [
        ...rows,
        {
          label: t('skyW.row.dark'),
          value: t('skyW.plan.noDark'),
          emphasis: true,
        },
      ];
    return [
      ...rows,
      {
        label: t('skyW.row.dark'),
        value: t('skyW.plan.dark', {
          dusk: clock(f.duskJd),
          dawn: clock(f.dawnJd),
          h: fixed(f.darkHours, 2),
        }),
        emphasis: true,
      },
      { label: t('skyW.row.moonLit'), value: fixed(f.moonLit, 2) },
      { label: t('skyW.row.moonUp'), value: hours(f.moonUpHours, 2) },
      ...f.targets.map(tg => ({
        label: tg.name || t('skyW.loading'),
        value: tg.name
          ? t('skyW.plan.usable', {
              h: fixed(tg.usableHours, 2),
              am:
                tg.bestAirmass === null
                  ? t('skyW.none')
                  : fixed(tg.bestAirmass, 2),
            })
          : t('skyW.loading'),
        emphasis: tg.usableHours > 0,
      })),
      { label: t('skyW.row.key'), value: t('skyW.plan.key') },
    ];
  },
};

export const SKY_WIDGETS = [TURNING, SEASONS, PHASES, ECLIPSES, WANDERER, PLAN];
