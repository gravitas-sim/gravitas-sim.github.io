// =============================================================================
// The Jupiter-moons instruments
// -----------------------------------------------------------------------------
// Three instruments for "Weighing Jupiter From Its Moons" (Prompt 193,
// SATELLITE_EPHEMERIS.md), each standing on the kernel in js/satellites/:
//
//   moon-frames     the synthetic sequence, one frame at a time, with the
//                   ephemeris overlay as the identity check and each moon's
//                   measured distance from Jupiter in Jupiter radii
//   moon-fit        one moon's measured distances against time and the
//                   sinusoid that fits best, with the periods the points fit
//                   as well (the alias) and the sampling's Nyquist period
//   jupiter-weigh   Kepler's third law on the fitted period and orbit radius:
//                   Jupiter's GM and mass with their uncertainty, one moon or
//                   all four with a consistency test
//
// No arithmetic is repeated here: every number is the kernel's, and
// tests/galileanMoons.test.js recomputes each one a lesson states. The frames
// are synthetic (JPL Horizons positions through the CCD forward model) and the
// instruments say so. Two files arrive asynchronously, behind `jovianReady`
// (which never rejects): the moons' pack and the planets' pack, whose
// Earth–Jupiter direction the projection needs.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_JOVIAN } from './i18n/en.jovian.js';
import { ES_JOVIAN } from './i18n/es.jovian.js';
import { fixed, withUnit } from './format.js';
import {
  surface,
  responsiveHeight,
  palette,
  TYPE,
  typeAt,
} from './widgetCanvas.js';
import {
  GM_JUPITER,
  MOON_IDS,
  R_JUPITER_KM,
  REFERENCE,
  moonsAt,
  openGalilean,
} from './satellites/galilean.js';
import {
  aliasAnalysis,
  designEpochs,
  meanFrameRate,
  siderealPeriod,
} from './satellites/cadence.js';
import { SEQUENCE, measureFrame, renderFrame } from './satellites/sequence.js';
import { combine, fitSinusoid, kepler } from './satellites/weigh.js';

registerMessages('en', EN_JOVIAN);
registerMessages('es', ES_JOVIAN);

const fix = (v, d = 2) => (Number.isFinite(v) ? fixed(v, d) : '-');
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const SIGMA_MARK = SEQUENCE.seeingSigmaRj;
const LETTER = { io: 'I', europa: 'E', ganymede: 'G', callisto: 'C' };

// -----------------------------------------------------------------------------
// What arrives later
// -----------------------------------------------------------------------------

let model = null;
let failed = false;
let derived = null;

/** A test or a page that already has the two packs hands the model in. */
export const provideModel = m => {
  model = m;
  derived = null;
};

async function load() {
  if (model) return;
  try {
    const [moons, planets] = await Promise.all([
      fetch('/sky/galilean-moons.json').then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
      import('./kernels/sky/packs.js').then(p => p.loadEphemerisFile()),
    ]);
    model = openGalilean(moons, planets);
  } catch (err) {
    failed = true;
    console.warn('The moons’ positions could not be loaded:', err);
  }
}

/** Resolves true when the packs are in; never rejects. */
export const jovianReady = load().then(
  () => true,
  () => false
);

/** The plan, its frames and their measured marks, made once. */
export function sequenceOf(m = model) {
  if (!m) return null;
  if (derived && derived.model === m) return derived;
  const epochs = designEpochs(m);
  const frames = epochs.map((e, i) => renderFrame(m, e, i));
  const measured = epochs.map((e, i) => measureFrame(m, e, frames[i]));
  derived = {
    model: m,
    epochs,
    frames,
    measured,
    rate: meanFrameRate(m, epochs),
  };
  return derived;
}

const stretch = (c, max) =>
  Math.min(
    255,
    (255 * Math.asinh(Math.max(0, c) / 800)) / Math.asinh(max / 800)
  );

function utText(jdUt) {
  const d = new Date((jdUt - 2440587.5) * 86400000);
  return d.toISOString().replace('T', ' ').slice(0, 16);
}

const names = id => t(`jovW.moon.${id}`);

// -----------------------------------------------------------------------------
// The frames
// -----------------------------------------------------------------------------

export function framesView(v, seq = sequenceOf()) {
  if (!seq) return null;
  const n = seq.epochs.length;
  const index = clamp(Math.round(v.frame ?? 1), 1, n) - 1;
  const epoch = seq.epochs[index];
  const frame = seq.frames[index];
  const meas = seq.measured[index];
  const truthMoons = moonsAt(seq.model, epoch.jdTt).moons;
  return {
    index,
    n,
    epoch,
    frame,
    meas,
    overlay: v.overlay >= 0.5,
    predicted: Object.fromEntries(MOON_IDS.map(id => [id, truthMoons[id].x])),
  };
}

let stripCache = null;
function stripOf(frame) {
  if (stripCache?.frame === frame) return stripCache.canvas;
  const { width: w, height: h, counts } = frame;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  let max = 0;
  for (const x of counts) if (x > max) max = x;
  for (let j = 0; j < h; j += 1)
    for (let i = 0; i < w; i += 1) {
      const k = 4 * (j * w + i);
      const val = stretch(counts[(h - 1 - j) * w + i], max);
      img.data[k] = img.data[k + 1] = img.data[k + 2] = val;
      img.data[k + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  stripCache = { frame, canvas: c };
  return c;
}

function drawFrames(canvas, v) {
  const f = framesView(v);
  const colors = palette();
  const height = responsiveHeight(150, 110);
  const { ctx: g, w } = surface(canvas, height);
  g.textBaseline = 'top';
  g.font = typeAt(TYPE.TICK);
  if (!f) {
    g.fillStyle = colors.muted;
    g.fillText(t(failed ? 'jovW.failed' : 'jovW.waiting'), 8, 8);
    return;
  }
  const k = w / SEQUENCE.width;
  const h = SEQUENCE.height * k;
  const y0 = Math.max(0, (height - h) / 2);
  g.fillStyle = '#0b0e16';
  g.fillRect(0, y0, w, h);
  g.imageSmoothingEnabled = false;
  g.drawImage(stripOf(f.frame), 0, y0, w, h);
  if (f.overlay) {
    g.strokeStyle = colors.accent;
    g.fillStyle = colors.accent;
    g.lineWidth = 1;
    for (const id of MOON_IDS) {
      const p = f.meas.overlay[id];
      const X = (p.px - 0.5) * k;
      g.beginPath();
      g.moveTo(X, y0 + h * 0.5 - 14);
      g.lineTo(X, y0 + h * 0.5 - 6);
      g.stroke();
      g.fillText(LETTER[id], X - 3, y0 + h * 0.5 - 28);
    }
  }
  g.fillStyle = colors.warn;
  g.fillText(t('jovW.f.legend'), 6, 4);
}

const FRAMES = {
  id: 'moon-frames',
  get title() {
    return t('jovW.f.title');
  },
  get note() {
    return t('jovW.f.note');
  },
  animated: false,
  controls: [
    {
      id: 'frame',
      get label() {
        return t('jovW.f.control.frame');
      },
      min: 1,
      max: 51,
      step: 1,
      value: 1,
      decimals: 0,
      format: v => String(Math.round(v)),
    },
    {
      id: 'overlay',
      get label() {
        return t('jovW.f.control.overlay');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => String(Math.round(v)),
    },
  ],
  draw: drawFrames,
  readout(v) {
    const f = framesView(v);
    if (!f)
      return [
        {
          label: t('jovW.row.how'),
          value: t(failed ? 'jovW.failed' : 'jovW.waiting'),
        },
      ];
    const ppr = f.meas.pixelsPerRj;
    const hourly = f.epoch.kind === 'hourly';
    const rows = [
      {
        label: t('jovW.f.row.when'),
        value: utText(f.epoch.jdUt),
        emphasis: true,
      },
      {
        label: t('jovW.f.row.kind'),
        value: t(hourly ? 'jovW.f.value.hourly' : 'jovW.f.value.nightly'),
      },
      {
        label: t('jovW.f.row.scale'),
        value: t('jovW.f.value.scale', { px: fix(ppr, 2) }),
      },
    ];
    for (const id of MOON_IDS) {
      const m = f.meas.moons[id];
      const pred = `${fix(f.predicted[id], 2)} R`;
      rows.push({
        label: t('jovW.f.row.moon', { moon: names(id) }),
        value: m
          ? t('jovW.f.value.moon', {
              x: fix(Math.abs(m.x), 2),
              side: t(m.x >= 0 ? 'jovW.f.value.east' : 'jovW.f.value.west'),
              pred,
            })
          : t('jovW.f.value.hidden', { pred }),
        emphasis: Boolean(m),
      });
    }
    const hourlyCount = f.epoch ? hourlyOf() : 0;
    rows.push(
      {
        label: t('jovW.f.row.frames'),
        value: t('jovW.f.value.frames', {
          n: f.n,
          hourly: hourlyCount,
          nightly: f.n - hourlyCount,
        }),
      },
      { label: t('jovW.row.how'), value: t('jovW.f.value.how') }
    );
    return rows;
  },
};

const hourlyOf = () =>
  (sequenceOf()?.epochs ?? []).filter(e => e.kind === 'hourly').length;

// -----------------------------------------------------------------------------
// The marks of one moon, and the fit
// -----------------------------------------------------------------------------

/** The measured marks of a moon: days, Jupiter radii, for the chosen sampling. */
export function marksFor(id, designed, seq = sequenceOf()) {
  if (!seq) return null;
  const t0 = seq.epochs[0].jdTt;
  const t = [];
  const x = [];
  seq.epochs.forEach((e, i) => {
    if (!designed && e.kind !== 'nightly') return;
    const m = seq.measured[i].moons[id];
    if (!m) return;
    t.push(e.jdTt - t0);
    x.push(m.x);
  });
  return { t: Float64Array.from(t), x: Float64Array.from(x), t0 };
}

/** One moon's fit from the measured marks, or the refusal. */
export function fitMoon(id, designed, seq = sequenceOf()) {
  const marks = marksFor(id, designed, seq);
  if (!marks) return null;
  try {
    const fit = fitSinusoid(marks.t, marks.x, SIGMA_MARK, {
      minPeriodDays: designed ? 0.3 : 2,
    });
    return { ok: true, fit, marks, designed };
  } catch (err) {
    return { ok: false, why: err.message, marks, designed };
  }
}

export function fitView(v, seq = sequenceOf()) {
  if (!seq) return null;
  const moon = MOON_IDS[clamp(Math.round(v.moon ?? 1), 1, 4) - 1];
  const designed = (v.cadence ?? 1) >= 0.5;
  return { moon, designed, result: fitMoon(moon, designed, seq) };
}

function drawFit(canvas, v) {
  const f = fitView(v);
  const colors = palette();
  const height = responsiveHeight(240, 180);
  const { ctx: g, w } = surface(canvas, height);
  g.font = typeAt(TYPE.TICK);
  g.textBaseline = 'top';
  if (!f?.result) {
    g.fillStyle = colors.muted;
    g.fillText(t(failed ? 'jovW.failed' : 'jovW.waiting'), 8, 8);
    return;
  }
  const { marks } = f.result;
  const pad = { l: 36, r: 8, t: 20, b: 18 };
  const span = 40;
  const amp = REFERENCE[f.moon].aKm / R_JUPITER_KM;
  const lim = Math.ceil(amp * 1.2);
  const X = d => pad.l + (d / span) * (w - pad.l - pad.r);
  const Y = x => pad.t + (1 - (x + lim) / (2 * lim)) * (height - pad.t - pad.b);
  g.strokeStyle = colors.muted;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(pad.l, Y(0));
  g.lineTo(w - pad.r, Y(0));
  g.stroke();
  g.fillStyle = colors.muted;
  g.fillText(`${lim}`, 6, pad.t - 4);
  g.fillText(`-${lim}`, 4, height - pad.b - 10);
  if (f.result.ok) {
    const r = f.result.fit;
    // The fitted sinusoid by its own parameters: refit the three linear terms at the best period.
    const w2 = (2 * Math.PI) / r.periodDays;
    const t0 = marks.t.reduce((p, q) => p + q, 0) / marks.t.length;
    // The three linear terms at the best period, by the normal equations.
    let ss = 0,
      sc = 0,
      s1 = 0,
      cc = 0,
      c1 = 0,
      n1 = 0,
      bx = 0,
      by = 0,
      bz = 0;
    for (let i = 0; i < marks.t.length; i++) {
      const ph = w2 * (marks.t[i] - t0);
      const sn = Math.sin(ph);
      const cs = Math.cos(ph);
      ss += sn * sn;
      sc += sn * cs;
      s1 += sn;
      cc += cs * cs;
      c1 += cs;
      n1 += 1;
      bx += sn * marks.x[i];
      by += cs * marks.x[i];
      bz += marks.x[i];
    }
    const det =
      ss * (cc * n1 - c1 * c1) -
      sc * (sc * n1 - c1 * s1) +
      s1 * (sc * c1 - cc * s1);
    const a =
      (bx * (cc * n1 - c1 * c1) -
        sc * (by * n1 - c1 * bz) +
        s1 * (by * c1 - cc * bz)) /
      det;
    const b =
      (ss * (by * n1 - c1 * bz) -
        bx * (sc * n1 - c1 * s1) +
        s1 * (sc * bz - by * s1)) /
      det;
    const c =
      (ss * (cc * bz - by * c1) -
        sc * (sc * bz - by * s1) +
        bx * (sc * c1 - cc * s1)) /
      det;
    g.strokeStyle = colors.good;
    g.lineWidth = 2;
    g.beginPath();
    for (let k = 0; k <= 400; k++) {
      const d = (span * k) / 400;
      const ph = w2 * (d - t0);
      const yy = Y(a * Math.sin(ph) + b * Math.cos(ph) + c);
      if (k === 0) g.moveTo(X(d), yy);
      else g.lineTo(X(d), yy);
    }
    g.stroke();
  }
  g.fillStyle = colors.accent;
  for (let i = 0; i < marks.t.length; i++) {
    g.beginPath();
    g.arc(X(marks.t[i]), Y(marks.x[i]), 3, 0, 2 * Math.PI);
    g.fill();
  }
  g.fillStyle = colors.warn;
  g.fillText(t('jovW.p.legend'), pad.l, 2);
}

const FIT = {
  id: 'moon-fit',
  get title() {
    return t('jovW.p.title');
  },
  get note() {
    return t('jovW.p.note');
  },
  animated: false,
  controls: [
    {
      id: 'moon',
      get label() {
        return t('jovW.p.control.moon');
      },
      min: 1,
      max: 4,
      step: 1,
      value: 1,
      decimals: 0,
      format: v => names(MOON_IDS[Math.round(v) - 1]),
    },
    {
      id: 'cadence',
      get label() {
        return t('jovW.p.control.cadence');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 1,
      decimals: 0,
      format: v => String(Math.round(v)),
    },
  ],
  draw: drawFit,
  readout(v) {
    const f = fitView(v);
    if (!f?.result)
      return [
        {
          label: t('jovW.row.how'),
          value: t(failed ? 'jovW.failed' : 'jovW.waiting'),
        },
      ];
    const r = f.result;
    const rows = [
      { label: t('jovW.p.row.marks'), value: String(r.marks.t.length) },
      {
        label: t('jovW.p.row.search'),
        value: t(
          f.designed
            ? 'jovW.p.value.searchDesigned'
            : 'jovW.p.value.searchNightly'
        ),
      },
    ];
    if (!r.ok) {
      rows.push({
        label: t('jovW.p.row.period'),
        value: t('jovW.p.value.refused', { why: r.why }),
        emphasis: true,
      });
    } else {
      const q = r.fit;
      rows.push(
        {
          label: t('jovW.p.row.period'),
          value: `${fix(q.periodDays, 4)} ± ${fix(q.sigmaPeriodDays, 4)} d`,
          emphasis: true,
        },
        {
          label: t('jovW.p.row.amplitude'),
          value: `${fix(q.amplitude, 3)} ± ${fix(q.sigmaAmplitude, 3)} R`,
          emphasis: true,
        },
        {
          label: t('jovW.p.row.amplitudeKm'),
          value: withUnit(fix(q.amplitude * R_JUPITER_KM, 0), 'km'),
        },
        {
          label: t('jovW.p.row.fit'),
          value: `${fix(q.chi2, 1)}, ${q.dof}`,
        }
      );
      const rivals = q.candidates.filter(
        c =>
          Math.abs(c.periodDays - q.periodDays) / q.periodDays > 0.01 &&
          c.deltaChi2 < 9
      );
      rows.push({
        label: t('jovW.p.row.alias'),
        value: rivals.length
          ? rivals
              .map(c =>
                t('jovW.p.value.alias', {
                  p: fix(c.periodDays, 3),
                  d: fix(c.deltaChi2, 1),
                })
              )
              .join('; ')
          : t('jovW.p.value.noAlias'),
      });
    }
    rows.push({
      label: t('jovW.p.row.nyquist'),
      value: f.designed
        ? t('jovW.p.value.nyquistDesigned')
        : t('jovW.p.value.nyquist', { dt: '1', p: '2' }),
    });
    if (!f.designed) {
      const a = aliasAnalysis(REFERENCE[f.moon].periodDays, 1);
      const below = a.aliases.filter(x => x.belowNyquist && a.aliased);
      if (below.length)
        rows.push({
          label: t('jovW.p.row.aliasTable'),
          value: below
            .map(x => t('jovW.p.value.aliasTable', { p: fix(x.periodDays, 3) }))
            .join('; '),
        });
    }
    rows.push({ label: t('jovW.row.how'), value: t('jovW.p.value.how') });
    return rows;
  },
};

// -----------------------------------------------------------------------------
// Weighing Jupiter
// -----------------------------------------------------------------------------

/** Each moon's Kepler value from the designed sampling, with or without the frame correction. */
export function weighAll(correct, seq = sequenceOf()) {
  if (!seq) return null;
  const rows = {};
  for (const id of MOON_IDS) {
    const r = fitMoon(id, true, seq);
    if (!r?.ok) {
      rows[id] = { ok: false, why: r?.why };
      continue;
    }
    const q = r.fit;
    const P = correct ? siderealPeriod(q.periodDays, seq.rate) : q.periodDays;
    const sP = correct
      ? q.sigmaPeriodDays * (P / q.periodDays) ** 2
      : q.sigmaPeriodDays;
    const k = kepler({ ...q, periodDays: P, sigmaPeriodDays: sP });
    rows[id] = { ok: true, fit: q, periodDays: P, sigmaPeriodDays: sP, ...k };
  }
  return rows;
}

export function weighView(v, seq = sequenceOf()) {
  if (!seq) return null;
  const correct = (v.correct ?? 0) >= 0.5;
  const pick = clamp(Math.round(v.moon ?? 0), 0, 4);
  const rows = weighAll(correct, seq);
  const good = MOON_IDS.filter(id => rows[id].ok);
  return {
    correct,
    pick,
    rows,
    combined: good.length > 1 ? combine(good.map(id => rows[id])) : null,
    rate: seq.rate,
  };
}

function drawWeigh(canvas, v) {
  const f = weighView(v);
  const colors = palette();
  const height = responsiveHeight(200, 150);
  const { ctx: g, w } = surface(canvas, height);
  g.font = typeAt(TYPE.TICK);
  g.textBaseline = 'top';
  if (!f) {
    g.fillStyle = colors.muted;
    g.fillText(t(failed ? 'jovW.failed' : 'jovW.waiting'), 8, 8);
    return;
  }
  const lo = GM_JUPITER * 0.985;
  const hi = GM_JUPITER * 1.015;
  const pad = { l: 8, r: 8, t: 22, b: 22 };
  const X = gm => pad.l + ((gm - lo) / (hi - lo)) * (w - pad.l - pad.r);
  g.strokeStyle = colors.good;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(X(GM_JUPITER), pad.t);
  g.lineTo(X(GM_JUPITER), height - pad.b);
  g.stroke();
  g.lineWidth = 1;
  MOON_IDS.forEach((id, i) => {
    const r = f.rows[id];
    const y = pad.t + 14 + i * ((height - pad.t - pad.b - 20) / 3);
    g.fillStyle = colors.muted;
    g.fillText(LETTER[id], pad.l, y - 6);
    if (!r.ok) return;
    g.strokeStyle = colors.accent;
    g.beginPath();
    g.moveTo(clamp(X(r.gm - r.sigmaGm), 0, w), y);
    g.lineTo(clamp(X(r.gm + r.sigmaGm), 0, w), y);
    g.stroke();
    g.fillStyle = colors.accent;
    g.beginPath();
    g.arc(clamp(X(r.gm), 0, w), y, 3, 0, 2 * Math.PI);
    g.fill();
  });
  g.fillStyle = colors.warn;
  g.fillText(t('jovW.w.legend'), pad.l, 2);
}

const sci = (x, d = 4) =>
  Number.isFinite(x) ? x.toExponential(d).replace('e+', ' × 10^') : '-';

const WEIGH = {
  id: 'jupiter-weigh',
  get title() {
    return t('jovW.w.title');
  },
  get note() {
    return t('jovW.w.note');
  },
  animated: false,
  controls: [
    {
      id: 'moon',
      get label() {
        return t('jovW.w.control.moon');
      },
      min: 0,
      max: 4,
      step: 1,
      value: 0,
      decimals: 0,
      format: v =>
        Math.round(v) === 0
          ? t('jovW.moon.all')
          : names(MOON_IDS[Math.round(v) - 1]),
    },
    {
      id: 'correct',
      get label() {
        return t('jovW.w.control.correct');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => String(Math.round(v)),
    },
  ],
  draw: drawWeigh,
  readout(v) {
    const f = weighView(v);
    if (!f)
      return [
        {
          label: t('jovW.row.how'),
          value: t(failed ? 'jovW.failed' : 'jovW.waiting'),
        },
      ];
    const gmText = r => `${sci(r.gm, 4)} ± ${sci(r.sigmaGm, 1)} km³/s²`;
    const rows = [];
    if (f.pick > 0) {
      const id = MOON_IDS[f.pick - 1];
      const r = f.rows[id];
      if (!r.ok)
        rows.push({
          label: t('jovW.w.row.gm'),
          value: t('jovW.p.value.refused', { why: r.why }),
        });
      else
        rows.push(
          {
            label: t('jovW.w.row.period'),
            value: `${fix(r.periodDays, 4)} ± ${fix(r.sigmaPeriodDays, 4)} d`,
          },
          {
            label: t('jovW.w.row.a'),
            value: `${fix(r.fit.amplitude, 3)} ± ${fix(r.fit.sigmaAmplitude, 3)} R = ${fix(r.aKm, 0)} km`,
          },
          { label: t('jovW.w.row.gm'), value: gmText(r), emphasis: true },
          {
            label: t('jovW.w.row.mass'),
            value: `${sci(r.massKg, 3)} ± ${sci(r.sigmaMassKg, 1)} kg`,
            emphasis: true,
          },
          { label: t('jovW.w.row.ratio'), value: fix(r.gm / GM_JUPITER, 4) }
        );
    } else {
      for (const id of MOON_IDS) {
        const r = f.rows[id];
        rows.push({
          label: t('jovW.w.row.moonValue', { moon: names(id) }),
          value: r.ok
            ? `${gmText(r)} (${fix(r.gm / GM_JUPITER, 4)})`
            : t('jovW.p.value.refused', { why: r.why }),
        });
      }
      if (f.combined) {
        const c = f.combined;
        rows.push(
          {
            label: t('jovW.w.row.mean'),
            value: `${sci(c.gm, 4)} ± ${sci(c.sigmaGm, 1)} km³/s² = ${sci(c.massKg, 3)} kg`,
            emphasis: true,
          },
          {
            label: t('jovW.w.row.consistency'),
            value: t(
              c.consistent
                ? 'jovW.w.value.consistent'
                : 'jovW.w.value.inconsistent',
              {
                chi2: fix(c.chi2, 2),
                dof: c.dof,
                p: fix(c.p, 3),
              }
            ),
          }
        );
      }
    }
    rows.push(
      { label: t('jovW.w.row.ref'), value: `${sci(GM_JUPITER, 4)} km³/s²` },
      {
        label: t('jovW.w.row.rate'),
        value: f.correct
          ? t('jovW.w.value.rate', { rate: fix(f.rate, 3) })
          : '-',
      },
      { label: t('jovW.row.how'), value: t('jovW.w.value.how') }
    );
    return rows;
  },
};

export const JOVIAN_WIDGETS = [FRAMES, FIT, WEIGH];
