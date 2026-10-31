// =============================================================================
// The image-measurement instruments
// -----------------------------------------------------------------------------
// Instruments for the investigations that close the image-
// measurement phase (Prompt 191, IMAGE_INVESTIGATIONS.md). Each one stands on
// a tool the Observatory has already shipped and states what that tool will and
// will not say:
//
//   moon-marks       the Galileo picture of the Moon (a display-only pack), a
//                    reference pair across the disc and a circle on a feature:
//                    the scale and a size in kilometers, by js/measure/marks.js
//                    and js/measure/scale.js, with the refusal of a sky scale
//                    that the pack's contract carries
//   star-parallax    fourteen positions of one synthetic star: a two-epoch
//                    shift, a straight proper motion, or a proper motion with
//                    a parallax, by js/measure/astrometric-series.js, with its
//                    refusals and its reference-frame statement
//   binary-orbit     twelve relative positions of a synthetic binary: a
//                    circular or an elliptical orbit and the mass sum, by
//                    js/measure/orbit-fit.js
//   field-sources    one synthetic star field (js/imagingField.js): the sources
//                    at a threshold, the width of the stars among them, and on
//                    request the stars that were really placed, by
//                    js/measure/detect.js
//   field-completeness
//                    sources of chosen magnitudes injected into a copy of that
//                    field and looked for again: the share found by magnitude,
//                    the magnitudes at 50 and 90 percent, and whether the curve
//                    applies to another search, by js/measure/inject.js
//
// No arithmetic of the tools is repeated here: every number is the tool's own,
// and tests/imageInvestigations.test.js recomputes each one a lesson states.
// The star's and the binary's tables are fixed (made once from the exact
// geometry with a seeded stream, tools/astrometric-series-synth.mjs), and the
// field is made from a fixed table of stars with a seeded detector, so the
// numbers a lesson states are the numbers every student sees. Everything but
// the Moon is synthetic and says so; the truth is withheld until the lesson
// reveals it.
//
// Two things arrive asynchronously, behind `imagingReady` (which never
// rejects): the Moon's pixels, checked against the pack's checksum, and the
// Earth's position for the parallax fit. Until they land the picture and the
// parallax rows say they are loading; nothing else waits.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_IMAGING } from './i18n/en.imaging.js';
import { ES_IMAGING } from './i18n/es.imaging.js';
import { fixed, withUnit } from './format.js';
import {
  surface,
  responsiveHeight,
  palette,
  TYPE,
  typeAt,
} from './widgetCanvas.js';
import { emptyState, place } from './measure/marks.js';
import { scaleOf, sizeOf } from './measure/scale.js';
import {
  createEarth,
  fitJoint,
  fitMotion,
  predict,
  prepare,
  twoEpochShift,
} from './measure/astrometric-series.js';
import { fitOrbit, massSum, orbitCurve } from './measure/orbit-fit.js';
import {
  completenessOf,
  expectedFound,
  FIELD,
  fieldFrame,
  INJECTION,
  searchOf,
  STARS,
} from './imagingField.js';
import * as MOON_PACK from './data/observations/galileoMoon19921207.js';
import { readFrames } from './observatory/imagePacks.js';

registerMessages('en', EN_IMAGING);
registerMessages('es', ES_IMAGING);

const fix = (v, d = 2) => (Number.isFinite(v) ? fixed(v, d) : '-');
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const YEAR = 365.25;

// -----------------------------------------------------------------------------
// What arrives later
// -----------------------------------------------------------------------------

let moonFrame = null;
let moonPicture = null;
let earth = null;
let moonFailed = false;

/** A test or a page that already has the Earth's position hands it in. */
export const provideEarth = e => {
  earth = e;
};

async function loadMoon() {
  try {
    const res = await fetch(`/${MOON_PACK.SIDECAR.file}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { data } = await readFrames(
      await res.arrayBuffer(),
      MOON_PACK.SIDECAR,
      MOON_PACK.PACK
    );
    moonFrame = {
      width: MOON_PACK.PACK.image.width,
      height: MOON_PACK.PACK.image.height,
      data,
    };
    // A copy with row 1 at the bottom, the way the Observatory draws it: y runs up.
    const { width: w, height: h } = moonFrame;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    const img = g.createImageData(w, h);
    for (let j = 0; j < h; j += 1)
      for (let i = 0; i < w; i += 1) {
        const v = data[(h - 1 - j) * w + i];
        const k = 4 * (j * w + i);
        img.data[k] = img.data[k + 1] = img.data[k + 2] = v;
        img.data[k + 3] = 255;
      }
    g.putImageData(img, 0, 0);
    moonPicture = c;
  } catch (err) {
    moonFailed = true;
    console.warn('The picture of the Moon could not be loaded:', err);
  }
}

async function loadEarth() {
  if (earth) return;
  try {
    const [packs, eph, planets] = await Promise.all([
      import('./kernels/sky/packs.js'),
      import('./mission/ephemeris.js'),
      import('./kernels/sky/planets.js'),
    ]);
    const file = await packs.loadEphemerisFile();
    earth = createEarth({
      ephemeris: eph.createEphemeris(file.pack, file.data),
      heliocentric: planets.heliocentric,
    });
  } catch (err) {
    console.warn('The Earth’s position could not be loaded:', err);
  }
}

/** Resolves true when the pictures and positions are in; never rejects. */
export const imagingReady = Promise.all([loadMoon(), loadEarth()]).then(
  () => true,
  () => false
);

// -----------------------------------------------------------------------------
// Marking the Moon
// -----------------------------------------------------------------------------

/** The picture, and the one length every scale here is taken from. */
export const MOON = Object.freeze({
  size: 496,
  /** The Moon's mean diameter, kilometers: the length a reference pair across the disc is taken to span. */
  diameterKm: 3474.8,
  /** The row of the pair: the middle of the disc. */
  pairY: 245,
});

/** The marks the controls make, and what the tools read from them. */
export function moonView(v) {
  const x1 = clamp(Math.round(v.x1 ?? 60), 1, MOON.size);
  const x2 = clamp(Math.round(v.x2 ?? 440), 1, MOON.size);
  const cx = clamp(Math.round(v.cx ?? 250), 1, MOON.size);
  const cy = clamp(Math.round(v.cy ?? 250), 1, MOON.size);
  const r = clamp(Math.round(v.r ?? 20), 1, 200);
  let s = emptyState();
  s = place(s, {
    kind: 'reference-pair',
    tag: 'disc',
    pts: [
      [x1, MOON.pairY],
      [x2, MOON.pairY],
    ],
    length: { value: MOON.diameterKm, sigma: 0, unit: 'km' },
  });
  s = place(s, {
    kind: 'circle',
    tag: 'feature',
    pts: [
      [cx, cy],
      [cx + r, cy],
    ],
  });
  const [pair, circle] = s.marks;
  const scale = x1 === x2 ? null : scaleOf(s);
  const size = scale?.value ? sizeOf(circle, scale) : null;
  const pairPx = Math.abs(x2 - x1);
  // Where the circle sits on the disc, taking the pair's middle as the disc's center.
  const R = pairPx / 2;
  const mx = (x1 + x2) / 2;
  const off = R > 0 ? Math.hypot(cx - mx, cy - MOON.pairY) / R : NaN;
  return {
    x1,
    x2,
    cx,
    cy,
    r,
    pair,
    circle,
    scale,
    pairPx,
    radiusPx: r,
    diameterPx: 2 * r,
    diameterKm: size?.phys ? 2 * size.phys : NaN,
    diameterSigmaKm:
      size?.phys && scale ? 2 * scale.value * circle.sigma * Math.SQRT2 : NaN,
    offset: off,
    foreshorten: off < 1 ? Math.sqrt(1 - off * off) : NaN,
  };
}

function drawMoon(canvas, v) {
  const f = moonView(v);
  const colors = palette();
  const side = Math.min(responsiveHeight(300, 220), canvas.clientWidth || 300);
  const { ctx: g, w } = surface(canvas, side);
  const S = MOON.size;
  const k = side / S;
  const ox = Math.max(0, (w - side) / 2);
  const X = x => ox + (x - 0.5) * k;
  const Y = y => (S - y + 0.5) * k;
  g.fillStyle = '#0b0e16';
  g.fillRect(ox, 0, side, side);
  g.textBaseline = 'top';
  g.textAlign = 'left';
  g.font = typeAt(TYPE.TICK);
  if (moonPicture) g.drawImage(moonPicture, ox, 0, side, side);
  else {
    g.fillStyle = colors.muted;
    g.fillText(t(moonFailed ? 'imgW.m.failed' : 'imgW.m.loading'), ox + 8, 24);
  }
  // The reference pair: a line with a tick at each end.
  g.lineWidth = 2;
  g.strokeStyle = colors.accent;
  g.beginPath();
  g.moveTo(X(f.x1), Y(MOON.pairY));
  g.lineTo(X(f.x2), Y(MOON.pairY));
  for (const x of [f.x1, f.x2]) {
    g.moveTo(X(x), Y(MOON.pairY) - 6);
    g.lineTo(X(x), Y(MOON.pairY) + 6);
  }
  g.stroke();
  // The circle.
  g.strokeStyle = colors.good;
  g.beginPath();
  g.arc(X(f.cx), Y(f.cy), f.r * k, 0, 2 * Math.PI);
  g.stroke();
  g.fillStyle = colors.warn;
  g.fillText(t('imgW.m.legend'), ox + 6, 6);
}

const MOON_CONTROL = (id, min, max, value, labelKey) => ({
  id,
  get label() {
    return t(labelKey);
  },
  min,
  max,
  step: 1,
  value,
  decimals: 0,
  format: v => withUnit(String(Math.round(v)), 'px'),
});

const MOON_MARKS = {
  id: 'moon-marks',
  get title() {
    return t('imgW.m.title');
  },
  get note() {
    return t('imgW.m.note');
  },
  animated: false,
  controls: [
    MOON_CONTROL('x1', 1, MOON.size, 60, 'imgW.m.control.x1'),
    MOON_CONTROL('x2', 1, MOON.size, 440, 'imgW.m.control.x2'),
    MOON_CONTROL('cx', 1, MOON.size, 250, 'imgW.m.control.cx'),
    MOON_CONTROL('cy', 1, MOON.size, 250, 'imgW.m.control.cy'),
    MOON_CONTROL('r', 1, 200, 20, 'imgW.m.control.r'),
  ],
  presets: [
    {
      values: { cx: 250, cy: 250, r: 20 },
      get label() {
        return t('imgW.m.preset.reset');
      },
    },
  ],
  draw: drawMoon,
  readout(v) {
    const f = moonView(v);
    const px = x => withUnit(fix(x, 0), 'px');
    const rows = [
      {
        label: t('imgW.row.source'),
        value: t('imgW.m.value.source'),
        emphasis: true,
      },
      { label: t('imgW.m.row.pair'), value: px(f.pairPx), emphasis: true },
      {
        label: t('imgW.m.row.assumed'),
        value: t('imgW.m.value.assumed', { km: fix(MOON.diameterKm, 1) }),
      },
      {
        label: t('imgW.m.row.scale'),
        value: f.scale?.value
          ? `${fix(f.scale.value, 2)} ± ${fix(f.scale.sigma, 3)} km/px`
          : t('imgW.m.value.none'),
        emphasis: true,
      },
      { label: t('imgW.m.row.radius'), value: px(f.radiusPx) },
      { label: t('imgW.m.row.diameterPx'), value: px(f.diameterPx) },
      {
        label: t('imgW.m.row.diameterKm'),
        value: Number.isFinite(f.diameterKm)
          ? `${fix(f.diameterKm, 0)} ± ${fix(f.diameterSigmaKm, 0)} km`
          : t('imgW.m.value.none'),
        emphasis: true,
      },
      { label: t('imgW.m.row.offset'), value: fix(f.offset, 2) },
      {
        label: t('imgW.m.row.foreshort'),
        value: Number.isFinite(f.foreshorten)
          ? `${fix(100 * f.foreshorten, 0)} %`
          : '-',
      },
      { label: t('imgW.row.how'), value: t('imgW.m.value.how') },
    ];
    return rows;
  },
};

// -----------------------------------------------------------------------------
// The path of a star
// -----------------------------------------------------------------------------

/** Fourteen epochs (TDB Julian dates) and positions (degrees) of one synthetic star, 4 milliarcseconds per axis. */
export const STAR = Object.freeze({
  ra: 150.0,
  dec: 20.0,
  sigmaArcsec: 0.004,
  rows: Object.freeze([
    [2461045.5, 150.00001101, 19.99999693],
    [2461099.3, 150.00000747, 19.99999824],
    [2461153.2, 150.00000732, 19.99999594],
    [2461207.0, 150.00001632, 19.99998973],
    [2461260.9, 150.00003987, 19.9999797],
    [2461314.7, 150.00006504, 19.99996994],
    [2461368.6, 150.00008274, 19.99996508],
    [2461422.4, 150.00008412, 19.9999663],
    [2461476.3, 150.00008145, 19.99996525],
    [2461530.1, 150.00008264, 19.99996251],
    [2461584.0, 150.00009486, 19.99995452],
    [2461637.8, 150.00012192, 19.99994251],
    [2461691.7, 150.00014431, 19.99993497],
    [2461745.5, 150.00015699, 19.99993019],
  ]),
});
/** The size and the source of the correction to absolute parallax a lesson may apply, in milliarcseconds. */
export const ZERO_POINT = Object.freeze({
  sigmaMas: 0.5,
  source: 'a value the lesson states, not a measurement',
});
const FITS = ['shift', 'motion', 'joint'];

/** The epochs of a star series, the first `n`. */
export const starEpochs = n =>
  STAR.rows.slice(0, n).map(([jd, ra, dec]) => ({
    time: { value: jd, format: 'jd', scale: 'tdb' },
    ra,
    dec,
    sigma: STAR.sigmaArcsec,
  }));

/** What the controls ask of the tools, and what comes back. `provided` is the Earth, or null while it loads. */
export function parallaxView(v, provided = earth) {
  const n = clamp(Math.round(v.n ?? 14), 2, STAR.rows.length);
  const fit = clamp(Math.round(v.fit ?? 2), 0, 2);
  const zero = Math.max(0, v.zero ?? 0);
  const epochs = starEpochs(n);
  const prep = prepare({ epochs });
  const spanYears = (STAR.rows[n - 1][0] - STAR.rows[0][0]) / YEAR;
  let res = null;
  let waiting = false;
  if (fit === 0)
    res = twoEpochShift(epochs[0], epochs[n - 1], { earth: provided });
  else if (fit === 1) res = fitMotion({ epochs });
  else if (!provided) waiting = true;
  else
    res = fitJoint(
      {
        epochs,
        ...(zero > 0
          ? {
              reference: {
                name: 'the reference stars',
                correction: {
                  value: zero / 1000,
                  sigma: ZERO_POINT.sigmaMas / 1000,
                  source: ZERO_POINT.source,
                },
              },
            }
          : {}),
      },
      provided
    );
  const rows = prep.ok
    ? prep.rows.map(r => ({
        x: (r.x - prep.rows[0].x) * 1000,
        y: (r.y - prep.rows[0].y) * 1000,
      }))
    : [];
  let curve = [];
  if (res?.ok && res.params && prep.ok) {
    const j0 = prep.rows[0].jd;
    const j1 = prep.rows[prep.rows.length - 1].jd;
    for (let k = 0; k <= 160; k += 1) {
      const p = predict(res, j0 + ((j1 - j0) * k) / 160, provided);
      if (p)
        curve.push({
          x: (p.x - prep.rows[0].x) * 1000,
          y: (p.y - prep.rows[0].y) * 1000,
        });
    }
  }
  return { n, fit, zero, spanYears, res, rows, curve, waiting };
}

/** Axes for a set of points: equal scale, east to the right, north up, with room around them. */
function frameOf(points, w, h, pad) {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const spanX = Math.max(x1 - x0, 1e-9);
  const spanY = Math.max(y1 - y0, 1e-9);
  const k = Math.min((w - 2 * pad) / spanX, (h - 2 * pad) / spanY);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return {
    X: x => w / 2 + (x - cx) * k,
    Y: y => h / 2 - (y - cy) * k,
    k,
  };
}

function drawPlot(canvas, rows, curve, legend, closed = false) {
  const colors = palette();
  const height = responsiveHeight(300, 220);
  const { ctx: g, w, h } = surface(canvas, height);
  g.fillStyle = '#0b0e16';
  g.fillRect(0, 0, w, h);
  g.font = typeAt(TYPE.TICK);
  g.textBaseline = 'top';
  g.textAlign = 'left';
  g.fillStyle = colors.warn;
  g.fillText(legend, 8, 6);
  if (!rows.length) return;
  const f = frameOf([...rows, ...curve], w, h - 16, 28);
  const Y = y => f.Y(y) + 16;
  if (curve.length) {
    g.strokeStyle = colors.good;
    g.lineWidth = 2;
    g.beginPath();
    curve.forEach((p, i) =>
      i ? g.lineTo(f.X(p.x), Y(p.y)) : g.moveTo(f.X(p.x), Y(p.y))
    );
    if (closed) g.closePath();
    g.stroke();
  }
  g.strokeStyle = colors.accent;
  g.fillStyle = colors.accent;
  g.lineWidth = 1.5;
  rows.forEach((p, i) => {
    const x = f.X(p.x);
    const y = Y(p.y);
    g.beginPath();
    g.moveTo(x - 4, y);
    g.lineTo(x + 4, y);
    g.moveTo(x, y - 4);
    g.lineTo(x, y + 4);
    g.stroke();
    if (rows.length <= 14) g.fillText(String(i + 1), x + 6, y - 14);
  });
}

function drawStar(canvas, v) {
  const f = parallaxView(v);
  const shown = f.fit === 0 && f.rows.length > 1;
  const pts = shown ? [f.rows[0], f.rows[f.rows.length - 1]] : f.rows;
  drawPlot(canvas, pts, shown ? pts : f.curve, t('imgW.p.legend'));
}

const interval = (iv, d = 2) => {
  if (!iv || iv.empty) return '-';
  const lo = Number.isFinite(iv.lo) ? fix(iv.lo, d) : '0';
  const hi = iv.open?.[1] || !Number.isFinite(iv.hi) ? '∞' : fix(iv.hi, d);
  return `${lo} to ${hi} pc`;
};

const STAR_FIT = {
  id: 'star-parallax',
  get title() {
    return t('imgW.p.title');
  },
  get note() {
    return t('imgW.p.note');
  },
  animated: false,
  controls: [
    {
      id: 'fit',
      get label() {
        return t('imgW.p.control.fit');
      },
      min: 0,
      max: 2,
      step: 1,
      value: 2,
      decimals: 0,
      format: v => t(`imgW.p.fit.${FITS[Math.round(v)]}`),
    },
    {
      id: 'n',
      get label() {
        return t('imgW.p.control.n');
      },
      min: 2,
      max: STAR.rows.length,
      step: 1,
      value: STAR.rows.length,
      decimals: 0,
      format: v => String(Math.round(v)),
    },
    {
      id: 'zero',
      get label() {
        return t('imgW.p.control.zero');
      },
      min: 0,
      max: 3,
      step: 0.5,
      value: 0,
      decimals: 1,
      format: v =>
        v > 0 ? withUnit(fix(v, 1), 'mas') : t('imgW.p.value.noCorrection'),
    },
  ],
  presets: [
    {
      values: { fit: 0, n: 14, zero: 0 },
      get label() {
        return t('imgW.p.preset.shift');
      },
    },
    {
      values: { fit: 1, n: 14, zero: 0 },
      get label() {
        return t('imgW.p.preset.motion');
      },
    },
    {
      values: { fit: 2, n: 14, zero: 0 },
      get label() {
        return t('imgW.p.preset.joint');
      },
    },
  ],
  draw: drawStar,
  readout(v) {
    const f = parallaxView(v);
    const mas = (p, d = 1) =>
      `${fix(p.value * 1000, d)} ± ${fix(p.sigma * 1000, d)} mas`;
    const rows = [
      {
        label: t('imgW.row.source'),
        value: t('imgW.p.value.source'),
        emphasis: true,
      },
      { label: t('imgW.p.row.n'), value: String(f.n) },
      { label: t('imgW.p.row.span'), value: `${fix(f.spanYears, 2)} yr` },
    ];
    const r = f.res;
    if (f.waiting) {
      rows.push({ label: t('imgW.row.how'), value: t('imgW.waiting') });
      return rows;
    }
    if (r && r.ok === false) {
      const d = r.data ?? {};
      const key = ['too-few-epochs', 'span', 'phase-coverage'].includes(r.code)
        ? `imgW.p.no.${r.code}`
        : 'imgW.p.no.other';
      rows.push(
        { label: t('imgW.refused'), value: r.code, emphasis: true },
        {
          label: t('imgW.p.row.no'),
          value: t(key, {
            n: d.n ?? '',
            min: d.min ?? '',
            spanYears: fix(d.spanYears, 2),
            code: r.code,
          }),
        }
      );
      return rows;
    }
    if (f.fit === 0) {
      rows.push(
        {
          label: t('imgW.p.row.label'),
          value: t('imgW.p.value.shiftLabel'),
          emphasis: true,
        },
        { label: t('imgW.p.row.dx'), value: mas(r.displacement.x) },
        { label: t('imgW.p.row.dy'), value: mas(r.displacement.y) },
        {
          label: t('imgW.p.row.sep'),
          value: `${fix(r.separation * 1000, 1)} mas`,
          emphasis: true,
        },
        {
          label: t('imgW.p.row.rate'),
          value: `${fix(Math.hypot(r.rate.x.value, r.rate.y.value), 4)} arcsec/yr`,
        },
        {
          label: t('imgW.p.row.lever'),
          value: r.parallaxLever
            ? `${fix(100 * Math.hypot(r.parallaxLever.x, r.parallaxLever.y), 0)} mas`
            : '-',
        }
      );
    } else {
      if (f.fit === 1)
        rows.push(
          {
            label: t('imgW.p.row.mux'),
            value: `${fix(r.params.mux.value * 1000, 1)} ± ${fix(r.params.mux.sigma * 1000, 1)} mas/yr`,
          },
          {
            label: t('imgW.p.row.muy'),
            value: `${fix(r.params.muy.value * 1000, 1)} ± ${fix(r.params.muy.sigma * 1000, 1)} mas/yr`,
          }
        );
      else {
        const d = r.distance;
        rows.push(
          {
            label: t('imgW.p.row.parallax'),
            value: mas(r.params.parallax, 2),
            emphasis: true,
          },
          {
            label: t('imgW.p.row.correction'),
            value: r.zeroPoint?.correction
              ? t('imgW.p.value.correction', {
                  value: fix(r.zeroPoint.correction.value * 1000, 1),
                  sigma: fix(r.zeroPoint.correction.sigma * 1000, 1),
                })
              : t('imgW.p.value.noCorrection'),
          }
        );
        if (d.parallax.absolute)
          rows.push({
            label: t('imgW.p.row.absolute'),
            value: mas(d.parallax.absolute, 2),
            emphasis: true,
          });
        rows.push(
          {
            label: t('imgW.p.row.distance'),
            value: d.value ? `${fix(d.value, 2)} pc` : '-',
            emphasis: true,
          },
          {
            label: t('imgW.p.row.interval68'),
            value: interval(d.intervals[0]?.distance),
          },
          {
            label: t('imgW.p.row.interval95'),
            value: interval(d.intervals[1]?.distance),
          },
          { label: t('imgW.p.row.signif'), value: fix(d.significance, 1) }
        );
      }
      rows.push(
        { label: t('imgW.p.row.chi2'), value: fix(r.chi2, 1) },
        { label: t('imgW.p.row.dof'), value: String(r.dof) },
        {
          label: t('imgW.p.row.pValue'),
          value: r.p < 0.001 ? '< 0.001' : fix(r.p, 3),
        },
        {
          label: t('imgW.p.row.verdict'),
          value: t(`imgW.p.verdict.${r.verdict}`),
          emphasis: true,
        }
      );
      if (f.fit === 2)
        rows.push({
          label: t('imgW.p.row.frame'),
          value: t(
            r.zeroPoint?.correction
              ? 'imgW.p.value.corrected'
              : 'imgW.p.value.relative'
          ),
        });
    }
    rows.push({ label: t('imgW.row.how'), value: t('imgW.p.value.how') });
    return rows;
  },
};

// -----------------------------------------------------------------------------
// The orbit of a binary
// -----------------------------------------------------------------------------

/** Twelve relative positions of one synthetic binary: epoch (Julian year), north and east offsets in arcseconds, 15 milliarcseconds each. */
export const BINARY = Object.freeze({
  sigmaArcsec: 0.015,
  parallaxSigmaMas: 4,
  rows: Object.freeze([
    [1998.0, 0.8044, -0.0857],
    [1999.43, 0.9243, 0.1657],
    [2000.79, 0.892, 0.3569],
    [2002.38, 0.606, 0.5017],
    [2004.32, -0.3086, 0.0668],
    [2005.0, -0.4929, -0.2236],
    [2006.88, -0.3067, -0.6095],
    [2008.5, 0.0481, -0.5859],
    [2009.85, 0.3632, -0.4635],
    [2011.55, 0.7332, -0.1979],
    [2012.84, 0.8753, 0.0563],
    [2014.33, 0.9637, 0.2912],
  ]),
});

/** The series of the first `n` epochs. */
export const binarySeries = n => ({
  epochs: BINARY.rows.slice(0, n).map(([year, x, y]) => ({
    time: { value: year, format: 'year' },
    x,
    y,
    sx: BINARY.sigmaArcsec,
    sy: BINARY.sigmaArcsec,
  })),
});

/** What the controls ask of the orbit tool, and what comes back. */
export function orbitView(v) {
  const n = clamp(Math.round(v.n ?? 12), 5, BINARY.rows.length);
  const depth = (v.model ?? 0) >= 0.5 ? 'circular' : 'elliptical';
  const plx = Math.max(1, v.plx ?? 100);
  const fit = fitOrbit(binarySeries(n), { depth });
  const mass = fit.ok
    ? massSum(fit, {
        value: plx,
        sigma: BINARY.parallaxSigmaMas,
        unit: 'mas',
        frame: 'relative',
      })
    : null;
  return {
    n,
    depth,
    plx,
    fit,
    mass,
    spanYears: BINARY.rows[n - 1][0] - BINARY.rows[0][0],
    rows: BINARY.rows.slice(0, n).map(([, x, y]) => ({ x: y, y: x })),
    curve: fit.ok ? orbitCurve(fit, 160).map(p => ({ x: p.y, y: p.x })) : [],
  };
}

function drawBinary(canvas, v) {
  const f = orbitView(v);
  drawPlot(canvas, f.rows, f.curve, t('imgW.o.legend'), true);
}

const BINARY_FIT = {
  id: 'binary-orbit',
  get title() {
    return t('imgW.o.title');
  },
  get note() {
    return t('imgW.o.note');
  },
  animated: false,
  controls: [
    {
      id: 'n',
      get label() {
        return t('imgW.o.control.n');
      },
      min: 5,
      max: BINARY.rows.length,
      step: 1,
      value: BINARY.rows.length,
      decimals: 0,
      format: v => String(Math.round(v)),
    },
    {
      id: 'model',
      get label() {
        return t('imgW.o.control.model');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(v >= 0.5 ? 'imgW.o.model.circle' : 'imgW.o.model.ellipse'),
    },
    {
      id: 'plx',
      get label() {
        return t('imgW.o.control.plx');
      },
      min: 40,
      max: 160,
      step: 10,
      value: 100,
      decimals: 0,
      format: v => withUnit(String(Math.round(v)), 'mas'),
    },
  ],
  presets: [
    {
      values: { n: 12, model: 0, plx: 100 },
      get label() {
        return t('imgW.o.preset.all');
      },
    },
    {
      values: { n: 6, model: 0, plx: 100 },
      get label() {
        return t('imgW.o.preset.six');
      },
    },
  ],
  draw: drawBinary,
  readout(v) {
    const f = orbitView(v);
    const rows = [
      {
        label: t('imgW.row.source'),
        value: t('imgW.o.value.source'),
        emphasis: true,
      },
      { label: t('imgW.o.row.n'), value: String(f.n) },
      { label: t('imgW.o.row.span'), value: `${fix(f.spanYears, 1)} yr` },
    ];
    const r = f.fit;
    if (!r.ok) {
      const d = r.data ?? {};
      const key = ['epochs', 'inconsistent', 'coverage'].includes(r.code)
        ? `imgW.o.no.${r.code}`
        : 'imgW.o.no.other';
      rows.push(
        { label: t('imgW.refused'), value: r.code, emphasis: true },
        {
          label: t('imgW.o.row.no'),
          value: t(key, {
            depth: t(
              f.depth === 'circular'
                ? 'imgW.o.model.circle'
                : 'imgW.o.model.ellipse'
            ),
            need: d.need ?? '',
            n: d.epochs ?? f.n,
            chi2: fix(d.chi2, 0),
            dof: d.dof ?? '',
            code: r.code,
          }),
        }
      );
      rows.push({ label: t('imgW.row.how'), value: t('imgW.o.value.how') });
      return rows;
    }
    const el = r.elements;
    const pm = (e, d, u = '') => `${fix(e.value, d)} ± ${fix(e.sigma, d)}${u}`;
    rows.push(
      {
        label: t('imgW.o.row.period'),
        value: `${pm(el.P, 2)} yr`,
        emphasis: true,
      },
      {
        label: t('imgW.o.row.a'),
        value: `${pm(el.a, 3)} arcsec`,
        emphasis: true,
      },
      { label: t('imgW.o.row.e'), value: pm(el.e, 3), emphasis: true },
      { label: t('imgW.o.row.i'), value: `${pm(el.i, 1)}°` },
      { label: t('imgW.o.row.node'), value: `${pm(el.Omega, 1)}°` },
      { label: t('imgW.o.row.omega'), value: `${pm(el.omega, 1)}°` },
      { label: t('imgW.o.row.T'), value: pm(el.T, 2) },
      {
        label: t('imgW.o.row.chi2'),
        value: `${fix(r.chi2, 1)}, ${r.dof}`,
      },
      {
        label: t('imgW.o.row.pValue'),
        value: r.pValue < 0.001 ? '< 0.001' : fix(r.pValue, 3),
      },
      {
        label: t('imgW.o.row.coverage'),
        value: fix(r.criterion.coverage, 2),
      },
      {
        label: t('imgW.o.row.plx'),
        value: t('imgW.o.value.plx', {
          value: fix(f.plx, 0),
          sigma: fix(BINARY.parallaxSigmaMas, 0),
        }),
      }
    );
    const m = f.mass;
    if (m?.ok) {
      const iv = x => `${fix(x.lo, 2)} to ${fix(x.hi, 2)} M☉`;
      rows.push(
        {
          label: t('imgW.o.row.mass'),
          value: `${fix(m.value, 2)} M☉`,
          emphasis: true,
        },
        { label: t('imgW.o.row.mass68'), value: iv(m.intervals[0]) },
        { label: t('imgW.o.row.mass95'), value: iv(m.intervals[1]) },
        { label: t('imgW.o.row.frame'), value: t('imgW.o.value.frame') }
      );
    }
    if (r.nodeAmbiguity)
      rows.push({
        label: t('imgW.o.row.nodeNote'),
        value: t('imgW.o.value.nodeNote'),
      });
    rows.push({ label: t('imgW.row.how'), value: t('imgW.o.value.how') });
    return rows;
  },
};

// -----------------------------------------------------------------------------
// A field of stars
// -----------------------------------------------------------------------------

/** The thresholds the first instrument offers, in sigma of the smoothed noise. */
const SIGMAS = Object.freeze({ min: 2, max: 6, step: 0.5 });
const WIDTHS = Object.freeze({ min: 2, max: 4.5, step: 0.5 });

let fieldPicture = null;
/** The frame as a picture: sky near black, an inverse hyperbolic sine stretch so the faint stars show beside the bright. */
function pictureOf() {
  if (fieldPicture) return fieldPicture;
  const { frame } = fieldFrame();
  const { width: w, height: h, data } = frame;
  const sky = (FIELD.skyRate * FIELD.exposure) / FIELD.gain;
  const noiseAdu = Math.sqrt(sky + (FIELD.readNoise / FIELD.gain) ** 2);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  const top = Math.asinh(100);
  for (let i = 0; i < w * h; i += 1) {
    const u = (data[i] - sky) / noiseAdu;
    const v = clamp(Math.round((255 * Math.asinh(u / 2)) / top), 0, 255);
    const k = 4 * i;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = v;
    img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  fieldPicture = c;
  return c;
}

/** What the first instrument's controls ask of the tools, and what comes back. */
export function sourcesView(v) {
  const sigma = clamp(
    Math.round((v.sigma ?? 4) / SIGMAS.step) * SIGMAS.step,
    SIGMAS.min,
    SIGMAS.max
  );
  return { ...searchOf({ sigma }), sigma, showTruth: (v.truth ?? 0) >= 0.5 };
}

function drawField(canvas, v) {
  const f = sourcesView(v);
  const colors = palette();
  const side = Math.min(responsiveHeight(320, 240), canvas.clientWidth || 320);
  const { ctx: g, w } = surface(canvas, side);
  const k = side / FIELD.width;
  const ox = Math.max(0, (w - side) / 2);
  g.fillStyle = '#0b0e16';
  g.fillRect(ox, 0, side, side);
  g.imageSmoothingEnabled = false;
  g.drawImage(pictureOf(), ox, 0, side, side);
  g.lineWidth = 1.5;
  g.strokeStyle = colors.accent;
  for (const s of f.sources ?? []) {
    g.beginPath();
    g.arc(ox + (s.x + 0.5) * k, (s.y + 0.5) * k, 7 * k, 0, 2 * Math.PI);
    g.stroke();
  }
  if (f.showTruth) {
    g.strokeStyle = colors.warn;
    for (const s of STARS) {
      const x = ox + (s.x + 0.5) * k;
      const y = (s.y + 0.5) * k;
      g.beginPath();
      g.moveTo(x - 4, y);
      g.lineTo(x + 4, y);
      g.moveTo(x, y - 4);
      g.lineTo(x, y + 4);
      g.stroke();
    }
  }
  g.font = typeAt(TYPE.TICK);
  g.textBaseline = 'top';
  g.textAlign = 'left';
  g.fillStyle = colors.warn;
  g.fillText(
    t(f.showTruth ? 'imgW.f.legendTruth' : 'imgW.f.legend'),
    ox + 6,
    6
  );
}

const FIELD_SOURCES = {
  id: 'field-sources',
  get title() {
    return t('imgW.f.title');
  },
  get note() {
    return t('imgW.f.note');
  },
  animated: false,
  controls: [
    {
      id: 'sigma',
      get label() {
        return t('imgW.f.control.sigma');
      },
      min: SIGMAS.min,
      max: SIGMAS.max,
      step: SIGMAS.step,
      value: 4,
      decimals: 1,
      format: v => withUnit(fix(v, 1), 'σ'),
    },
    {
      id: 'truth',
      get label() {
        return t('imgW.f.control.truth');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(v >= 0.5 ? 'imgW.f.truth.on' : 'imgW.f.truth.off'),
    },
  ],
  presets: [
    {
      values: { sigma: 4, truth: 0 },
      get label() {
        return t('imgW.f.preset.default');
      },
    },
    {
      values: { sigma: 2.5, truth: 1 },
      get label() {
        return t('imgW.f.preset.low');
      },
    },
  ],
  draw: drawField,
  readout(v) {
    const f = sourcesView(v);
    const rows = [
      {
        label: t('imgW.row.source'),
        value: t('imgW.f.value.source'),
        emphasis: true,
      },
      {
        label: t('imgW.f.row.sigma'),
        value: withUnit(fix(f.sigma, 1), 'σ'),
      },
    ];
    if (!f.ok) {
      rows.push({ label: t('imgW.refused'), value: f.det?.code ?? '-' });
      return rows;
    }
    rows.push(
      {
        label: t('imgW.f.row.sources'),
        value: String(f.sources.length),
        emphasis: true,
      },
      { label: t('imgW.f.row.flagged'), value: String(f.flagged) }
    );
    const p = f.psf;
    if (p.ok) {
      rows.push(
        { label: t('imgW.f.row.stars'), value: String(p.stars.length) },
        {
          label: t('imgW.f.row.width'),
          value: `${fix(p.fwhm.mean, 2)} ± ${fix(p.fwhm.sigma, 2)} px`,
          emphasis: true,
        },
        {
          label: t('imgW.f.row.check'),
          value: t(
            p.modelLimited ? 'imgW.f.value.limited' : 'imgW.f.value.agree',
            { chi2: fix(p.chi2red, 2) }
          ),
        }
      );
    } else
      rows.push({
        label: t('imgW.f.row.width'),
        value: t('imgW.f.value.nostars'),
        emphasis: true,
      });
    if (f.showTruth) {
      const m = f.truth;
      rows.push(
        { label: t('imgW.f.row.placed'), value: String(STARS.length) },
        { label: t('imgW.f.row.found'), value: String(m.found) },
        { label: t('imgW.f.row.missed'), value: String(m.missed.length) },
        {
          label: t('imgW.f.row.false'),
          value: String(m.false.length),
          emphasis: true,
        }
      );
    }
    rows.push({ label: t('imgW.row.how'), value: t('imgW.f.value.how') });
    return rows;
  },
};

/** What the second instrument's controls ask of the tools, and what comes back. */
export function completenessView(v) {
  const sigma = clamp(
    Math.round((v.sigma ?? 4) / SIGMAS.step) * SIGMAS.step,
    SIGMAS.min,
    SIGMAS.max
  );
  const width = clamp(
    Math.round((v.width ?? 3) / WIDTHS.step) * WIDTHS.step,
    WIDTHS.min,
    WIDTHS.max
  );
  const c = completenessOf({ sigma, width });
  const search = searchOf({ sigma });
  return {
    sigma,
    width,
    showTruth: (v.truth ?? 0) >= 0.5,
    ...c,
    measured: searchOf({ sigma: INJECTION.reference.sigma }).psf,
    found: search.ok ? search.truth.found : null,
    expected: c.ok ? expectedFound(c.curve) : null,
  };
}

function drawCurve(canvas, v) {
  const f = completenessView(v);
  const colors = palette();
  const height = responsiveHeight(300, 220);
  const { ctx: g, w, h } = surface(canvas, height);
  g.fillStyle = '#0b0e16';
  g.fillRect(0, 0, w, h);
  g.font = typeAt(TYPE.TICK);
  g.textBaseline = 'top';
  g.textAlign = 'left';
  g.fillStyle = colors.warn;
  g.fillText(t('imgW.c.legend'), 8, 6);
  if (!f.ok) return;
  const { min, max } = INJECTION.magnitude;
  const left = 40;
  const right = w - 12;
  const top = 26;
  const bottom = h - 30;
  const X = m => left + ((m - min) / (max - min)) * (right - left);
  const Y = p => bottom - p * (bottom - top);
  g.strokeStyle = colors.muted;
  g.lineWidth = 1;
  g.setLineDash([4, 4]);
  for (const p of [0.5, 0.9]) {
    g.beginPath();
    g.moveTo(left, Y(p));
    g.lineTo(right, Y(p));
    g.stroke();
  }
  g.setLineDash([]);
  g.beginPath();
  g.moveTo(left, top);
  g.lineTo(left, bottom);
  g.lineTo(right, bottom);
  g.stroke();
  g.fillStyle = colors.muted;
  g.textAlign = 'right';
  for (const p of [0, 0.5, 1]) g.fillText(fix(p, 1), left - 4, Y(p) - 6);
  g.textAlign = 'center';
  for (let m = -3; m <= -2; m += 1) g.fillText(fix(m, 0), X(m), bottom + 4);
  g.fillText(t('imgW.c.axis'), (left + right) / 2, bottom + 16);
  const live = f.curve.bins.filter(b => b.n);
  g.strokeStyle = colors.accent;
  g.fillStyle = colors.accent;
  g.lineWidth = 1.5;
  g.beginPath();
  live.forEach((b, i) =>
    i ? g.lineTo(X(b.center), Y(b.p)) : g.moveTo(X(b.center), Y(b.p))
  );
  g.stroke();
  for (const b of live) {
    g.beginPath();
    g.moveTo(X(b.center), Y(b.interval.lo));
    g.lineTo(X(b.center), Y(b.interval.hi));
    g.stroke();
    g.beginPath();
    g.arc(X(b.center), Y(b.p), 3, 0, 2 * Math.PI);
    g.fill();
  }
}

const bin = b => `${fix(b.lo, 1)} to ${fix(b.hi, 1)}`;

const COMPLETENESS = {
  id: 'field-completeness',
  get title() {
    return t('imgW.c.title');
  },
  get note() {
    return t('imgW.c.note');
  },
  animated: false,
  controls: [
    {
      id: 'sigma',
      get label() {
        return t('imgW.c.control.sigma');
      },
      min: SIGMAS.min,
      max: SIGMAS.max,
      step: SIGMAS.step,
      value: 4,
      decimals: 1,
      format: v => withUnit(fix(v, 1), 'σ'),
    },
    {
      id: 'width',
      get label() {
        return t('imgW.c.control.width');
      },
      min: WIDTHS.min,
      max: WIDTHS.max,
      step: WIDTHS.step,
      value: 3,
      decimals: 1,
      format: v => withUnit(fix(v, 1), 'px'),
    },
    {
      id: 'truth',
      get label() {
        return t('imgW.c.control.truth');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(v >= 0.5 ? 'imgW.f.truth.on' : 'imgW.f.truth.off'),
    },
  ],
  presets: [
    {
      values: { sigma: 4, width: 3, truth: 0 },
      get label() {
        return t('imgW.c.preset.default');
      },
    },
    {
      values: { sigma: 3, width: 3, truth: 0 },
      get label() {
        return t('imgW.c.preset.three');
      },
    },
  ],
  draw: drawCurve,
  readout(v) {
    const f = completenessView(v);
    const rows = [
      {
        label: t('imgW.row.source'),
        value: t('imgW.c.value.source'),
        emphasis: true,
      },
      {
        label: t('imgW.f.row.sigma'),
        value: withUnit(fix(f.sigma, 1), 'σ'),
      },
      {
        label: t('imgW.c.row.width'),
        value: t('imgW.c.value.width', { width: fix(f.width, 1) }),
      },
    ];
    const p = f.measured;
    if (p?.ok)
      rows.push({
        label: t('imgW.c.row.measured'),
        value: `${fix(p.fwhm.mean, 2)} ± ${fix(p.fwhm.sigma, 2)} px`,
      });
    if (!f.ok) {
      rows.push({
        label: t('imgW.refused'),
        value: t('imgW.c.no.other', { code: f.code ?? '-' }),
      });
      return rows;
    }
    const c = f.curve;
    rows.push({
      label: t('imgW.c.row.injected'),
      value: t('imgW.c.value.injected', {
        n: c.injected,
        trials: c.trials,
      }),
    });
    for (const b of c.bins.filter(x => x.n))
      rows.push({
        label: t('imgW.c.row.bin', { bin: bin(b) }),
        value: t('imgW.c.value.bin', {
          k: b.k,
          n: b.n,
          p: fix(100 * b.p, 0),
          lo: fix(100 * b.interval.lo, 0),
          hi: fix(100 * b.interval.hi, 0),
        }),
      });
    const at = (cross, key) =>
      cross.m === null
        ? { label: t(key), value: t('imgW.c.value.never') }
        : {
            label: t(key),
            value: t('imgW.c.value.cross', {
              m: fix(cross.m, 2),
              lo: fix(cross.lo, 2),
              hi: fix(cross.hi, 2),
            }),
            emphasis: true,
          };
    rows.push(at(c.m50, 'imgW.c.row.m50'), at(c.m90, 'imgW.c.row.m90'), {
      label: t('imgW.c.row.extra'),
      value: fix(c.extraPerTrial, 2),
    });
    rows.push({
      label: t('imgW.c.row.applies'),
      value: f.applies.ok
        ? t('imgW.c.value.applies')
        : t('imgW.c.value.differs', { what: f.applies.differs.join(', ') }),
      emphasis: true,
    });
    if (f.showTruth && f.found !== null && f.width === INJECTION.reference.fwhm)
      rows.push(
        {
          label: t('imgW.c.row.expected'),
          value: fix(f.expected, 1),
        },
        { label: t('imgW.c.row.found'), value: String(f.found) }
      );
    rows.push({ label: t('imgW.row.how'), value: t('imgW.c.value.how') });
    return rows;
  },
};

export const IMAGING_WIDGETS = [
  MOON_MARKS,
  STAR_FIT,
  BINARY_FIT,
  FIELD_SOURCES,
  COMPLETENESS,
];
