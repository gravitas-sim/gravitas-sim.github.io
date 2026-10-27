// =============================================================================
// The crater instruments (Prompt 195, CRATER_COUNTING.md)
// -----------------------------------------------------------------------------
// Three instruments for three investigations, each standing on the kernel in
// js/measure/craters.js and the four regions of frames/craters-regions.json
// (a lunar highland and mare, a Martian highland and plains):
//
//   crater-regions   two regions, the diameter above which to count, the
//                    densities with their Poisson intervals and the relative
//                    age as a density ratio with its interval
//   crater-sfd       one region's cumulative size-frequency plot with its
//                    intervals, the power-law index with its interval, and the
//                    check for a roll-off
//   crater-budget    one circle on the Moon's highland frame: the diameter and the
//                    four terms of its uncertainty
//
// No arithmetic of the kernel is repeated here: every number is its own, and
// tests/craterLessons.test.js recomputes each one a lesson states. The circles
// drawn on a picture are the catalogue's (LU78287GT, Robbins), made by their
// authors from other data: no one has marked these frames, and nothing here
// pretends so. The circle of crater-budget is the reader's. No absolute age is
// computed anywhere (Prompt 196's gate).
//
// The lists (8 KB) arrive behind `craterReady`, which never rejects; a picture
// is fetched when first drawn and kept by the service worker after that.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_CRATERS } from './i18n/en.craters.js';
import { ES_CRATERS } from './i18n/es.craters.js';
import { fixed } from './format.js';
import {
  surface,
  responsiveHeight,
  palette,
  TYPE,
  typeAt,
} from './widgetCanvas.js';
import { createChart } from './plot/mount.js';
import {
  MIN_PIXELS,
  cumulative,
  defaultThresholds,
  diameterOf,
  powerLaw,
  relativeAge,
} from './measure/craters.js';
import { PLACE_SIGMA } from './measure/marks.js';

registerMessages('en', EN_CRATERS);
registerMessages('es', ES_CRATERS);

const DEG = Math.PI / 180;
const fix = (v, d = 2) => (Number.isFinite(v) ? fixed(v, d) : '-');
const clampIndex = (v, n) => Math.max(0, Math.min(n - 1, Math.round(v ?? 0)));
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/** The four regions, in the order the controls use. */
export const REGION_IDS = Object.freeze([
  'moon-highland',
  'moon-mare',
  'mars-highland',
  'mars-plains',
]);
/** The two comparisons: the older-looking region first. */
export const PAIRS = Object.freeze([
  ['moon-highland', 'moon-mare'],
  ['mars-highland', 'mars-plains'],
]);
/** The cut of the committed lists (km): no diameter below it is in them. */
export const CUT_KM = 20;

// -----------------------------------------------------------------------------
// What arrives later: the lists, then a picture when one is drawn
// -----------------------------------------------------------------------------

let regions = null;
let listsFailed = false;
const pictures = new Map();
let last = null;

/** A test or a page that already has the lists hands them in. */
export const provideRegions = json => {
  regions = json?.regions ?? json ?? null;
};

async function loadLists() {
  try {
    const res = await fetch('/frames/craters-regions.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    regions = (await res.json()).regions;
  } catch (err) {
    listsFailed = true;
    console.warn('The crater lists could not be loaded:', err);
  }
}

/** Resolves true when the lists are in; never rejects. */
export const craterReady = loadLists().then(
  () => true,
  () => false
);

/** The picture of a region: a canvas with the top row first, or null while it loads. */
function pictureOf(id) {
  const have = pictures.get(id);
  if (have) return have.canvas ?? null;
  const entry = { canvas: null, failed: false };
  pictures.set(id, entry);
  (async () => {
    try {
      const file = regions?.[id]?.frame;
      if (!file) throw new Error('no such region');
      const res = await fetch(`/${file.file}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const bin = atob(body.planes.display.base64);
      if (bin.length !== file.width * file.height)
        throw new Error(`${file.file}: ${bin.length} pixels, not the recorded`);
      const c = document.createElement('canvas');
      c.width = file.width;
      c.height = file.height;
      const g = c.getContext('2d');
      const img = g.createImageData(file.width, file.height);
      // The rows are stored from the bottom, as in FITS: the top row is the last.
      for (let j = 0; j < file.height; j += 1)
        for (let i = 0; i < file.width; i += 1) {
          const v = bin.charCodeAt((file.height - 1 - j) * file.width + i);
          const k = 4 * (j * file.width + i);
          img.data[k] = img.data[k + 1] = img.data[k + 2] = v;
          img.data[k + 3] = 255;
        }
      g.putImageData(img, 0, 0);
      entry.canvas = c;
      if (last) last.redraw();
    } catch (err) {
      entry.failed = true;
      console.warn('A crater picture could not be loaded:', err);
      if (last) last.redraw();
    }
  })();
  return null;
}

// -----------------------------------------------------------------------------
// Where a crater is in its picture
// -----------------------------------------------------------------------------

/** The region record, or null while the lists load. */
export const regionOf = id => regions?.[id] ?? null;

/** A crater's centre in the region's picture (pixels, y down from the top). */
export function pixelOf(region, lon, lat) {
  const g = region.geometry;
  const [ox, oy] = g.cropOriginPx;
  if (region.body === 'moon') {
    const [cx, cy] = g.centrePx;
    return {
      x: cx + g.radiusPx * Math.cos(lat * DEG) * Math.sin(lon * DEG) - ox,
      y: cy - g.radiusPx * Math.sin(lat * DEG) - oy,
    };
  }
  const [w, h] = g.mosaicPx;
  return { x: ((lon + 180) * w) / 360 - ox, y: ((90 - lat) * h) / 180 - oy };
}

/** The scale of a region's picture, kilometers per pixel (at the disc centre on the Moon). */
export const scaleOf = region =>
  region.geometry.kmPerPixelAtCentre ?? region.geometry.kmPerPixel;

/**
 * How the view stretches a place: on the Moon the radial direction is
 * compressed by cos E; on Mars the east-west direction is stretched by 1/cos(lat).
 * @returns {{cosE: number, axis: number, rho: number}} the image axis that is compressed, in radians
 */
export function viewAt(region, x, y) {
  const g = region.geometry;
  if (region.body === 'moon') {
    const [ox, oy] = g.cropOriginPx;
    const dx = x + ox - g.centrePx[0];
    const dy = y + oy - g.centrePx[1];
    const rho = Math.min(0.999, Math.hypot(dx, dy) / g.radiusPx);
    return { cosE: Math.sqrt(1 - rho * rho), axis: Math.atan2(dy, dx), rho };
  }
  return { cosE: 1, axis: 0, rho: 0 };
}

/** The footprint of a crater as an ellipse in its picture: centre, semi-axes, rotation. */
export function footprint(region, lon, lat, D) {
  const { x, y } = pixelOf(region, lon, lat);
  const rg = D / 2 / scaleOf(region);
  if (region.body === 'moon') {
    const { cosE, axis } = viewAt(region, x, y);
    return { x, y, rx: rg * cosE, ry: rg, rot: axis };
  }
  return { x, y, rx: rg / Math.cos(lat * DEG), ry: rg, rot: 0 };
}

const listOf = region => region.craters.map(c => c[0]);
const areaOf = region => ({
  km2: region.areaKm2,
  relSigma: region.areaRelSigma,
});
const nameOf = id => t(`crW.region.${id}`);

// -----------------------------------------------------------------------------
// Drawing a picture and the catalogue's circles on it
// -----------------------------------------------------------------------------

/** Which canvas shows which region, so a picture that lands later can be drawn. */
function drawPicture(canvas, id, circles, extra) {
  const colors = palette();
  const region = regionOf(id);
  const file = region?.frame;
  const ratio = file ? file.height / file.width : 0.6;
  const wide = canvas.clientWidth || 420;
  const side = Math.min(wide, responsiveHeight(330, 220) / ratio);
  const { ctx: g, w } = surface(
    canvas,
    Math.max(120, Math.round(side * ratio))
  );
  const k = file ? side / file.width : 1;
  const ox = Math.max(0, (w - side) / 2);
  g.fillStyle = '#0b0e16';
  g.fillRect(ox, 0, side, side * ratio);
  g.font = typeAt(TYPE.TICK);
  g.textBaseline = 'top';
  g.textAlign = 'left';
  const pic = region ? pictureOf(id) : null;
  if (pic) g.drawImage(pic, ox, 0, side, side * ratio);
  else {
    g.fillStyle = colors.muted;
    const failed = listsFailed || pictures.get(id)?.failed;
    g.fillText(t(failed ? 'crW.failed' : 'crW.loading'), ox + 8, 8);
  }
  if (region) {
    g.lineWidth = 1.5;
    for (const [D, lon, lat] of circles ?? []) {
      const e = footprint(region, lon, lat, D);
      g.strokeStyle = colors.good;
      g.beginPath();
      g.ellipse(
        ox + e.x * k,
        e.y * k,
        e.rx * k,
        e.ry * k,
        e.rot,
        0,
        2 * Math.PI
      );
      g.stroke();
    }
  }
  extra?.(g, { k, ox, region });
  return { k, ox };
}

const hosts = new WeakMap();
/** The plot component's host, mounted beside the tool canvas (which it hides). */
function hostOf(canvas, label) {
  let h = hosts.get(canvas);
  if (!h) {
    h = { el: document.createElement('div') };
    canvas.after(h.el);
    canvas.style.display = 'none';
    h.chart = createChart(h.el, {
      height: 260,
      legendMinHeight: 24,
      number: v => fixed(v, v >= 100 ? 0 : 2),
      labels: { legend: label },
      theme: true,
    });
    hosts.set(canvas, h);
  }
  return h;
}
const SERIES = { blue: '#1c7ed6', orange: '#e8590c', green: '#2f9e44' };

const bareControl = (id, labelKey, min, max, step, value, format) => ({
  id,
  get label() {
    return t(labelKey);
  },
  min,
  max,
  step,
  value,
  decimals: step < 1 ? 1 : 0,
  format,
});
const toggleControl = (id, labelKey, value = 1) =>
  bareControl(id, labelKey, 0, 1, 1, value, x =>
    t(x >= 0.5 ? 'crW.on' : 'crW.off')
  );
const kmFormat = x => `${fix(x, 0)} km`;

/** A statement about the region's circles for the picture's alternative text. */
const alt = (id, key, params) => t(`crW.${key}.${id}`, params);

// -----------------------------------------------------------------------------
// crater-regions
// -----------------------------------------------------------------------------

/** What the controls ask of the kernel, and what comes back. Null while the lists load. */
export function regionsView(v) {
  const pair = PAIRS[clampIndex(v.pair, PAIRS.length)];
  const [ia, ib] = pair;
  const ra = regionOf(ia);
  const rb = regionOf(ib);
  if (!ra || !rb) return null;
  const view = clampIndex(v.view, 2);
  const dMin = clamp(Math.round(v.dmin ?? 30), CUT_KM, 100);
  const side = region => ({
    craters: listOf(region),
    area: areaOf(region),
    completeFrom: region.completeFromKm,
  });
  const age = relativeAge(side(ra), side(rb), { dMin });
  const one = region => {
    const c = cumulative(listOf(region), {
      area: areaOf(region),
      thresholds: [dMin],
    });
    return c.rows[0];
  };
  return {
    pair,
    view,
    shown: pair[view],
    dMin,
    circles: (v.circles ?? 1) >= 0.5,
    age,
    a: one(ra),
    b: one(rb),
    ra,
    rb,
  };
}

const perMillion = x => x * 1e6;
const interval = row =>
  t('crW.value.interval', {
    lo: fix(perMillion(row.lo), 1),
    hi: fix(perMillion(row.hi), 1),
  });

const REGIONS = {
  id: 'crater-regions',
  get title() {
    return t('crW.r.title');
  },
  get note() {
    return t('crW.r.note');
  },
  animated: false,
  controls: [
    bareControl('pair', 'crW.r.control.pair', 0, 1, 1, 0, x =>
      t(`crW.pair.${Math.round(x)}`)
    ),
    bareControl('view', 'crW.r.control.view', 0, 1, 1, 0, x =>
      t(`crW.view.${Math.round(x)}`)
    ),
    bareControl('dmin', 'crW.r.control.dmin', CUT_KM, 100, 5, 30, kmFormat),
    toggleControl('circles', 'crW.r.control.circles'),
  ],
  draw(canvas, v) {
    const run = () => {
      const f = regionsView(v);
      const id = f?.shown ?? PAIRS[clampIndex(v.pair, PAIRS.length)][0];
      const region = regionOf(id);
      const circles = f?.circles
        ? region?.craters.filter(c => c[0] >= f.dMin)
        : [];
      drawPicture(canvas, id, circles);
    };
    last = { canvas, redraw: run };
    run();
  },
  readout(v) {
    const f = regionsView(v);
    if (!f)
      return [
        {
          label: t('crW.row.how'),
          value: t(listsFailed ? 'crW.failed' : 'crW.loading'),
        },
      ];
    const body = f.ra.body;
    const row = (region, id, r) => ({
      label: t('crW.r.row.region', { region: nameOf(id) }),
      value: t('crW.r.value.region', {
        n: r.n,
        dmin: fix(f.dMin, 0),
        area: fix(region.areaKm2 / 1e3, 0),
        density: fix(perMillion(r.density), 1),
        iv: interval(r),
      }),
      emphasis: true,
    });
    const rows = [
      {
        label: t('crW.row.picture'),
        value: alt(f.shown, 'alt', {
          n: f.circles
            ? regionOf(f.shown).craters.filter(c => c[0] >= f.dMin).length
            : 0,
          dmin: fix(f.dMin, 0),
        }),
      },
      { label: t('crW.row.source'), value: t(`crW.source.${body}`) },
      row(f.ra, f.pair[0], f.a),
      row(f.rb, f.pair[1], f.b),
    ];
    const age = f.age;
    if (age.status !== 'ok')
      rows.push({
        label: t('crW.r.row.ratio'),
        value: t(`crW.refused.${age.code}`, {
          km: fix(f.ra.completeFromKm, 0),
        }),
        emphasis: true,
      });
    else {
      rows.push(
        {
          label: t('crW.r.row.ratio'),
          value:
            age.ratio === null
              ? t('crW.r.value.noratio', { lo: fix(age.lo, 2) })
              : t('crW.r.value.ratio', {
                  r: fix(age.ratio, 2),
                  lo: fix(age.lo, 2),
                  hi: age.hi === null ? '∞' : fix(age.hi, 1),
                }),
          emphasis: true,
        },
        {
          label: t('crW.r.row.verdict'),
          value: t(
            `crW.r.verdict.${age.verdict === 'a older' ? 'a' : age.verdict === 'b older' ? 'b' : 'none'}`,
            { a: nameOf(f.pair[0]), b: nameOf(f.pair[1]) }
          ),
          emphasis: true,
        }
      );
    }
    rows.push({ label: t('crW.row.assumes'), value: t('crW.r.assumes') });
    return rows;
  },
};

// -----------------------------------------------------------------------------
// crater-sfd
// -----------------------------------------------------------------------------

/** The list with the smallest craters below the completeness limit left out, as a count that stops short. */
export function stoppedShort(diameters, completeFrom, share) {
  const sorted = diameters.slice().sort((a, b) => a - b);
  const below = sorted.filter(d => d < completeFrom).length;
  const gone = Math.round(clamp(share, 0, 1) * below);
  return { list: sorted.slice(gone), gone, below };
}

/** What the controls ask of the kernel for one region's size-frequency distribution. Null while the lists load. */
export function sfdView(v) {
  const id = REGION_IDS[clampIndex(v.region, REGION_IDS.length)];
  const region = regionOf(id);
  if (!region) return null;
  const dMin = clamp(Math.round(v.dmin ?? region.completeFromKm), CUT_KM, 100);
  const miss = clamp((v.miss ?? 0) / 100, 0, 1);
  const all = listOf(region);
  const { list, gone, below } = stoppedShort(all, region.completeFromKm, miss);
  const largest = Math.max(...all);
  const sfd = cumulative(list, {
    area: areaOf(region),
    thresholds: defaultThresholds(CUT_KM, largest),
  });
  const fit = powerLaw(list, { dMin });
  const atMin = cumulative(list, { area: areaOf(region), thresholds: [dMin] })
    .rows[0];
  return { id, region, dMin, list, gone, below, sfd, fit, atMin, largest };
}

const SFD = {
  id: 'crater-sfd',
  get title() {
    return t('crW.s.title');
  },
  get note() {
    return t('crW.s.note');
  },
  animated: false,
  controls: [
    bareControl('region', 'crW.s.control.region', 0, 3, 1, 0, x =>
      nameOf(REGION_IDS[Math.round(x)])
    ),
    bareControl('dmin', 'crW.s.control.dmin', CUT_KM, 100, 5, 30, kmFormat),
    bareControl(
      'miss',
      'crW.s.control.miss',
      0,
      100,
      10,
      0,
      x => `${fix(x, 0)} %`
    ),
  ],
  draw(canvas, v) {
    const f = sfdView(v);
    const host = hostOf(canvas, t('crW.s.title'));
    if (!f) return undefined;
    const rows = f.sfd.rows.filter(r => r.n >= 1);
    const lim = f.region.completeFromKm;
    const pick = keep => rows.filter(r => keep(r.D));
    const series = (id, label, color, picked) => ({
      id,
      label,
      x: picked.map(r => Math.log10(r.D)),
      y: picked.map(r => Math.log10(perMillion(r.density))),
      sigma: picked.map(r => Math.log10(r.hi / r.density)),
      sigmaLow: picked.map(r => Math.log10(r.density / r.lo)),
      color,
      mode: 'points',
      radius: 4,
    });
    const out = [
      series(
        'counted',
        t('crW.s.legend.counted'),
        SERIES.blue,
        pick(D => D >= lim)
      ),
    ];
    const under = pick(D => D < lim);
    if (under.length)
      out.push(series('under', t('crW.s.legend.under'), SERIES.orange, under));
    if (f.fit.status === 'ok' && f.atMin.n > 0) {
      const dens = perMillion(f.atMin.density);
      const xs = [f.dMin, f.largest];
      out.push({
        id: 'fit',
        label: t('crW.s.legend.fit', { b: fix(f.fit.index, 2) }),
        x: xs.map(Math.log10),
        y: xs.map(d => Math.log10(dens * (d / f.dMin) ** -f.fit.index)),
        color: SERIES.green,
        width: 2,
        dash: [5, 3],
        mode: 'line',
      });
    }
    const spec = {
      label: t('crW.s.title'),
      xTitle: t('crW.s.axis.x'),
      yTitle: t('crW.s.axis.y'),
      xNumber: x => fix(10 ** x, x >= 2 ? 0 : 1),
      yNumber: y => fix(10 ** y, y >= 2 ? 0 : y >= 0 ? 1 : 2),
      series: out,
    };
    host.chart.draw(spec);
    return spec;
  },
  readout(v) {
    const f = sfdView(v);
    if (!f)
      return [
        {
          label: t('crW.row.how'),
          value: t(listsFailed ? 'crW.failed' : 'crW.loading'),
        },
      ];
    const lim = f.region.completeFromKm;
    const fit = f.fit;
    const rows = [
      { label: t('crW.row.source'), value: t(`crW.source.${f.region.body}`) },
      {
        label: t('crW.s.row.list'),
        value: t('crW.s.value.list', {
          n: f.list.length,
          all: f.region.craters.length,
          area: fix(f.region.areaKm2 / 1e3, 0),
        }),
      },
      {
        label: t('crW.s.row.limit'),
        value: t('crW.s.value.limit', { km: fix(lim, 0) }),
      },
    ];
    if (f.gone > 0)
      rows.push({
        label: t('crW.s.row.missed'),
        value: t('crW.s.value.missed', {
          k: f.gone,
          of: f.below,
          km: fix(lim, 0),
        }),
        emphasis: true,
      });
    if (f.dMin < lim)
      rows.push({
        label: t('crW.s.row.warn'),
        value: t('crW.s.value.warn', { dmin: fix(f.dMin, 0), km: fix(lim, 0) }),
      });
    if (fit.status !== 'ok')
      rows.push({
        label: t('crW.s.row.index'),
        value: t(`crW.refused.${fit.code}`, { n: fix(f.atMin.n, 0) }),
        emphasis: true,
      });
    else {
      rows.push(
        {
          label: t('crW.s.row.n'),
          value: t('crW.s.value.n', { n: fit.n, dmin: fix(f.dMin, 0) }),
        },
        {
          label: t('crW.s.row.index'),
          value: t('crW.s.value.index', {
            b: fix(fit.index, 2),
            lo: fix(fit.lo, 2),
            hi: fix(fit.hi, 2),
          }),
          emphasis: true,
        },
        {
          label: t('crW.s.row.unbiased'),
          value: fix(fit.unbiased, 2),
        },
        {
          label: t('crW.s.row.constancy'),
          value:
            fit.constancy.status === 'ok'
              ? t(
                  fit.constancy.flag
                    ? 'crW.s.value.constancy.flag'
                    : 'crW.s.value.constancy.ok',
                  {
                    b2: fix(fit.constancy.b2, 2),
                    z: fix(fit.constancy.z, 2),
                    d2: fix(2 * f.dMin, 0),
                  }
                )
              : t('crW.s.value.constancy.none', { d2: fix(2 * f.dMin, 0) }),
          emphasis: Boolean(fit.constancy.flag),
        }
      );
    }
    rows.push({ label: t('crW.row.assumes'), value: t('crW.s.assumes') });
    return rows;
  },
};

// -----------------------------------------------------------------------------
// crater-budget
// -----------------------------------------------------------------------------

/** The frame of the budget instrument, and the one thing every lesson step starts from. */
export const BUDGET_REGION = 'moon-highland';
/** The one-pixel allowance on where the disc's centre is, entering cos E. */
const SIGMA_PIXELS_ON_DISC = 1;

/** What the controls ask of the kernel for one circle on the mare frame. Null while the lists load. */
export function budgetView(v) {
  const region = regionOf(BUDGET_REGION);
  if (!region) return null;
  const file = region.frame;
  const cx = clamp(Math.round(v.cx ?? 113), 1, file.width);
  const cy = clamp(Math.round(v.cy ?? 76), 1, file.height);
  const r = clamp(Math.round(v.r ?? 25), 1, 80);
  const angle = (Math.round(v.angle ?? 95) % 360) * DEG;
  const recognition = clamp((v.recognition ?? 5) / 100, 0, 0.5);
  const apply = (v.correct ?? 1) >= 0.5;
  const dMin = clamp(Math.round(v.dmin ?? 110), CUT_KM, 150);
  const view = viewAt(region, cx, cy);
  const sigmaCosE =
    (view.rho / view.cosE) * (SIGMA_PIXELS_ON_DISC / region.geometry.radiusPx);
  const s = scaleOf(region);
  const mark = {
    kind: 'circle',
    pts: [
      [cx, cy],
      [cx + r * Math.cos(angle), cy + r * Math.sin(angle)],
    ],
    sigma: PLACE_SIGMA,
  };
  const scale = {
    value: s,
    sigma: region.geometry.kmPerPixelSigma,
    unit: 'km/pix',
  };
  const diameter = diameterOf(mark, {
    scale,
    recognition,
    foreshortening: apply
      ? { cosE: view.cosE, axis: view.axis, sigmaCosE }
      : undefined,
  });
  const flat = diameterOf(mark, { scale, recognition });
  const chance =
    diameter.status === 'ok'
      ? cumulative([{ D: diameter.diameter, sigma: diameter.sigma }], {
          area: areaOf(region),
          thresholds: [dMin],
        }).rows[0].boundary.expected
      : NaN;
  // The catalogue's crater under the circle's centre, if there is one.
  let nearest = null;
  for (const [D, lon, lat] of region.craters) {
    const e = footprint(region, lon, lat, D);
    const d = Math.hypot(e.x - cx, e.y - cy);
    if (d <= e.ry && (!nearest || d < nearest.d)) nearest = { D, d };
  }
  return {
    region,
    cx,
    cy,
    r,
    angle,
    recognition,
    apply,
    dMin,
    view,
    scale,
    diameter,
    flat,
    chance,
    nearest,
    pixelsAcross: 2 * r,
  };
}

const BUDGET = {
  id: 'crater-budget',
  get title() {
    return t('crW.b.title');
  },
  get note() {
    return t('crW.b.note');
  },
  animated: false,
  controls: [
    bareControl(
      'cx',
      'crW.b.control.cx',
      1,
      350,
      1,
      113,
      x => `${fix(x, 0)} px`
    ),
    bareControl(
      'cy',
      'crW.b.control.cy',
      1,
      200,
      1,
      76,
      x => `${fix(x, 0)} px`
    ),
    bareControl('r', 'crW.b.control.r', 1, 80, 1, 25, x => `${fix(x, 0)} px`),
    bareControl(
      'angle',
      'crW.b.control.angle',
      0,
      355,
      5,
      95,
      x => `${fix(x, 0)}°`
    ),
    bareControl(
      'recognition',
      'crW.b.control.recognition',
      0,
      20,
      1,
      5,
      x => `${fix(x, 0)} %`
    ),
    toggleControl('correct', 'crW.b.control.correct'),
    bareControl('dmin', 'crW.b.control.dmin', CUT_KM, 150, 5, 110, kmFormat),
    toggleControl('catalogue', 'crW.b.control.catalogue', 0),
  ],
  draw(canvas, v) {
    const run = () => {
      const f = budgetView(v);
      const circles = f && (v.catalogue ?? 0) >= 0.5 ? f.region.craters : [];
      drawPicture(canvas, BUDGET_REGION, circles, (g, { k, ox }) => {
        if (!f) return;
        const colors = palette();
        g.lineWidth = 2;
        g.strokeStyle = colors.accent;
        g.beginPath();
        if (f.apply) {
          // The ground circle seen at this angle: r along the compressed direction, r / cos E across it.
          g.ellipse(
            ox + f.cx * k,
            f.cy * k,
            f.r * k,
            (f.r / f.view.cosE) * k,
            f.view.axis,
            0,
            2 * Math.PI
          );
        } else g.arc(ox + f.cx * k, f.cy * k, f.r * k, 0, 2 * Math.PI);
        g.stroke();
        // The rim point the diameter is read from.
        g.fillStyle = colors.warn;
        g.beginPath();
        g.arc(
          ox + (f.cx + f.r * Math.cos(f.angle)) * k,
          (f.cy + f.r * Math.sin(f.angle)) * k,
          3,
          0,
          2 * Math.PI
        );
        g.fill();
      });
    };
    last = { canvas, redraw: run };
    run();
  },
  readout(v) {
    const f = budgetView(v);
    if (!f)
      return [
        {
          label: t('crW.row.how'),
          value: t(listsFailed ? 'crW.failed' : 'crW.loading'),
        },
      ];
    const d = f.diameter;
    const rows = [
      {
        label: t('crW.row.picture'),
        value: alt(BUDGET_REGION, 'alt', {
          n: (v.catalogue ?? 0) >= 0.5 ? f.region.craters.length : 0,
          dmin: fix(CUT_KM, 0),
        }),
      },
      {
        label: t('crW.b.row.scale'),
        value: t('crW.b.value.scale', {
          s: fix(f.scale.value, 3),
          sigma: fix(f.scale.sigma, 4),
        }),
      },
      {
        label: t('crW.b.row.view'),
        value: t('crW.b.value.view', {
          rho: fix(f.view.rho, 2),
          cosE: fix(f.view.cosE, 3),
        }),
      },
      {
        label: t('crW.b.row.across'),
        value: t('crW.b.value.across', { px: fix(f.pixelsAcross, 0) }),
      },
    ];
    if (d.status !== 'ok') {
      rows.push({
        label: t('crW.b.row.diameter'),
        value: t(`crW.refused.${d.code}`),
        emphasis: true,
      });
      return rows;
    }
    const pct = x => `${fix(100 * x, 1)} %`;
    const budget = d.budget;
    const parts = Object.entries(budget);
    const biggest = parts.reduce((m, p) => (p[1] > m[1] ? p : m), parts[0]);
    rows.push(
      {
        label: t('crW.b.row.diameter'),
        value: t('crW.b.value.diameter', {
          D: fix(d.diameter, 1),
          sigma: fix(d.sigma, 1),
          rel: pct(d.relative),
        }),
        emphasis: true,
      },
      { label: t('crW.b.row.scaleTerm'), value: pct(budget.scale) },
      { label: t('crW.b.row.fitTerm'), value: pct(budget.fit) },
      { label: t('crW.b.row.recognitionTerm'), value: pct(budget.recognition) },
      {
        label: t('crW.b.row.foreshorteningTerm'),
        value: pct(budget.foreshortening),
      },
      {
        label: t('crW.b.row.biggest'),
        value: t(`crW.b.term.${biggest[0]}`),
        emphasis: true,
      },
      {
        label: t('crW.b.row.correction'),
        value: f.apply
          ? t('crW.b.value.correction', {
              factor: fix(d.factor, 3),
              D: fix(f.flat.diameter, 1),
            })
          : t('crW.b.value.nocorrection', { D: fix(d.diameter, 1) }),
      },
      {
        label: t('crW.b.row.chance', { dmin: fix(f.dMin, 0) }),
        value: `${fix(100 * f.chance, 0)} %`,
      }
    );
    if (f.nearest)
      rows.push({
        label: t('crW.b.row.catalogue'),
        value: t('crW.b.value.catalogue', { D: fix(f.nearest.D, 1) }),
      });
    if (f.pixelsAcross < MIN_PIXELS)
      rows.push({
        label: t('crW.b.row.small'),
        value: t('crW.b.value.small', { px: MIN_PIXELS }),
      });
    rows.push(
      { label: t('crW.b.row.age'), value: t('crW.b.value.age') },
      { label: t('crW.row.assumes'), value: t('crW.b.assumes') }
    );
    return rows;
  },
};

export const CRATER_WIDGETS = [REGIONS, SFD, BUDGET];
