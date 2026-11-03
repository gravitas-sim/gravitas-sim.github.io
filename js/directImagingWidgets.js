// =============================================================================
// The direct-imaging panels (Prompt 230, IMAGING.md)
// -----------------------------------------------------------------------------
// Two panels in a lazy family.
//   imaging-contrast       one planet beside its star: its separation on the sky, the telescope's
//                          diffraction scale, an example instrument's inner working angle and contrast
//                          floor, the contrast (thermal and reflected) and whether this instrument could
//                          see it. A chart of the contrast against wavelength.
//   imaging-architectures  the Solar System's planets and the archive's imaged planets on one log
//                          diagram: orbit against mass, or angle on the sky against mass.
//
// Nothing is calculated here: every number is js/directImagingField.js's, over js/kernels/imaging/.
// The instruments are teaching examples and the panels say so; the planet temperature of a young
// giant is stated and flagged, never derived from a blackbody at the irradiation equilibrium.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_DIRECTIMAGING } from './i18n/en.directImaging.js';
import { ES_DIRECTIMAGING } from './i18n/es.directImaging.js';
import { fixed, scientific } from './format.js';
import { createChart } from './plot/mount.js';
import { surface, token } from './widgetCanvas.js';
import {
  ARCS,
  CONTRASTS,
  DESIGN,
  SYSTEMS as ORBIT_SYSTEMS,
  orbitView,
  subtractionView,
} from './directImagingSubtractField.js';
import { orbitCurve } from './measure/orbit-fit.js';
import {
  SYSTEMS,
  INSTRUMENTS,
  PLOT_FLOOR,
  AU_M,
  contrastView,
  architecturesView,
} from './directImagingField.js';

registerMessages('en', EN_DIRECTIMAGING);
registerMessages('es', ES_DIRECTIMAGING);

const COLOR = {
  blue: '#1c7ed6',
  orange: '#e8590c',
  grey: '#495057',
  green: '#2b8a3e',
};
const sci = x => scientific(x, 2);
const ang = x => (x < 0.1 ? fixed(x, 4) : x < 10 ? fixed(x, 3) : fixed(x, 1));
const log10 = x => Math.log10(Math.max(x, PLOT_FLOOR));
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
      legendMinHeight: 24, // WCAG 2.2 target size: the legend toggles are controls
      number: v => fixed(v, Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 1 ? 1 : 2),
      labels: { legend: label },
      theme: true,
    });
    hosts.set(canvas, h);
  }
  return h;
}

const toggle = (id, label, value = 0) => ({
  id,
  get label() {
    return t(label);
  },
  min: 0,
  max: 1,
  step: 1,
  value,
  decimals: 0,
  format: x => t(x >= 0.5 ? 'dirW.on' : 'dirW.off'),
});

const picker = (id, label, count, key, value = 0) => ({
  id,
  get label() {
    return t(label);
  },
  min: 0,
  max: count - 1,
  step: 1,
  value,
  decimals: 0,
  format: x => t(`${key}.${Math.max(0, Math.min(count - 1, Math.round(x)))}`),
});

function contrastSpec(v) {
  const x = v.curve.map(p => log10(p.wavelengthM * 1e6));
  const col = k => v.curve.map(p => log10(p[k]));
  const floor = log10(v.telescope.contrastFloor);
  const at = {
    id: 'at',
    label: t('dirW.legend.at'),
    x: [log10(v.lambdaM * 1e6)],
    y: [log10(v.contrast.total)],
    color: COLOR.green,
    mode: 'points',
    radius: 5,
  };
  const series = [
    {
      id: 'reflected',
      label: t('dirW.legend.reflected'),
      x,
      y: col('reflected'),
      color: COLOR.blue,
      width: 2,
    },
    {
      id: 'thermal',
      label: t('dirW.legend.thermal'),
      x,
      y: col('thermal'),
      color: COLOR.orange,
      width: 2,
    },
    {
      id: 'total',
      label: t('dirW.legend.total'),
      x,
      y: col('total'),
      color: COLOR.grey,
      width: 2,
      dash: [5, 3],
    },
    {
      id: 'floor',
      label: t('dirW.legend.floor'),
      x: [x[0], x[x.length - 1]],
      y: [floor, floor],
      color: COLOR.green,
      width: 1,
      dash: [2, 3],
    },
    at,
  ];
  return {
    xTitle: t('dirW.axis.wavelength'),
    yTitle: t('dirW.axis.contrast'),
    xRange: [x[0], x[x.length - 1]],
    yRange: [-16, 0],
    series,
  };
}

const CONTRAST = {
  id: 'imaging-contrast',
  get title() {
    return t('dirW.contrast.title');
  },
  get note() {
    return t('dirW.contrast.note');
  },
  animated: false,
  controls: [
    picker('system', 'dirW.control.system', SYSTEMS.length, 'dirW.system', 0),
    {
      id: 'distance',
      get label() {
        return t('dirW.control.distance');
      },
      min: 1,
      max: 100,
      step: 1,
      value: 10,
      decimals: 0,
      format: x => `${fixed(x, 0)} pc`,
    },
    picker(
      'telescope',
      'dirW.control.telescope',
      INSTRUMENTS.length,
      'dirW.tel',
      3
    ),
    {
      id: 'phase',
      get label() {
        return t('dirW.control.phase');
      },
      min: 0,
      max: 180,
      step: 15,
      value: 90,
      decimals: 0,
      format: x => `${fixed(x, 0)}°`,
    },
    {
      id: 'band',
      get label() {
        return t('dirW.control.band');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: x => t(x >= 0.5 ? 'dirW.band.1' : 'dirW.band.0'),
    },
    toggle('plots', 'dirW.control.plots', 1),
  ],
  draw(canvas, vals) {
    const v = contrastView(vals);
    const spec = { label: t('dirW.contrast.title'), ...contrastSpec(v) };
    const h = hostOf(canvas, t('dirW.contrast.title'));
    const show = Math.round(vals.plots ?? 1) === 1;
    h.el.hidden = !show;
    if (show) h.chart.draw(spec);
    return spec;
  },
  readout(vals) {
    const v = contrastView(vals);
    const c = v.contrast;
    const i = SYSTEMS.indexOf(v.system);
    const w = fixed(v.lambdaM * 1e6, v.lambdaM < 1e-6 ? 2 : 2);
    const rows = [
      {
        label: t('dirW.row.system'),
        value: t('dirW.v.system', {
          n: t(`dirW.systemName.${i}`),
          d: fixed(v.distancePc, 0),
          a: fixed(v.alphaDeg, 0),
          r: fixed(
            v.system.semiMajorM / AU_M,
            v.system.semiMajorM / AU_M < 1 ? 2 : 1
          ),
          t: fixed(v.system.starTeffK, 0),
        }),
      },
      {
        label: t('dirW.row.separation'),
        value: t('dirW.v.separation', {
          s: ang(v.separation.arcsec),
          r: fixed(v.separationAu, 3),
        }),
        emphasis: true,
      },
      {
        label: t('dirW.row.scale'),
        value: t('dirW.v.scale', {
          x: ang(v.scale.lambdaOverDArcsec),
          D: fixed(v.telescope.apertureM, v.telescope.apertureM < 1 ? 2 : 1),
          w,
          k: fixed(v.separationOverScale, 1),
        }),
        emphasis: true,
      },
      {
        label: t('dirW.row.iwa'),
        value: t('dirW.v.iwa', {
          n: fixed(v.telescope.innerWorkingLambdaOverD, 0),
          a: ang(v.innerWorkingArcsec),
        }),
      },
      {
        label: t('dirW.row.contrast'),
        value: t('dirW.v.contrast', {
          r: sci(c.reflected),
          t: sci(c.thermal),
          c: sci(c.total),
          k: scientific(1 / c.total, 2),
          w,
        }),
        emphasis: true,
      },
      {
        label: t('dirW.row.verdict'),
        value: v.verdict.observable
          ? t('dirW.v.observable', { f: sci(v.telescope.contrastFloor) })
          : t('dirW.v.notObservable', {
              r: t(`dirW.reason.${v.verdict.code}`, {
                f: sci(v.telescope.contrastFloor),
              }),
            }),
        emphasis: true,
      },
      {
        label: t('dirW.row.temperature'),
        value: c.planetTeffStated
          ? t('dirW.v.selfLuminous', {
              t: fixed(c.planetTeffK, 0),
              e: fixed(c.irradiationTeqK, 0),
            })
          : t('dirW.v.irradiated', {
              t: fixed(c.planetTeffK, 0),
              b: fixed(Math.min(1, 1.5 * v.system.geometricAlbedo), 2),
            }),
      },
      { label: t('dirW.row.assumes'), value: t('dirW.a') },
    ];
    return rows;
  },
};

function archSpec(v) {
  const m = p => log10(p.massJup);
  const xs = p => (v.view === 0 ? log10(p.semiMajorAu) : log10(p.arcsec));
  const solar = v.solar;
  const imaged =
    v.view === 0 ? v.imaged : v.imaged.filter(p => p.arcsec != null);
  const series = [
    {
      id: 'imaged',
      label: t('dirW.legend.imaged'),
      x: imaged.map(xs),
      y: imaged.map(m),
      color: COLOR.orange,
      mode: 'points',
      radius: 3,
    },
    {
      id: 'solar',
      label: t('dirW.legend.solar'),
      x: solar.map(xs),
      y: solar.map(m),
      color: COLOR.blue,
      mode: 'points',
      radius: 5,
    },
  ];
  if (v.view === 1) {
    const x = log10(v.innerWorkingArcsec);
    series.push({
      id: 'iwa',
      label: t('dirW.legend.iwa'),
      x: [x, x],
      y: [-4, 2],
      color: COLOR.green,
      width: 1,
      dash: [4, 3],
    });
  }
  return {
    xTitle: t(v.view === 0 ? 'dirW.axis.axis' : 'dirW.axis.angle'),
    yTitle: t('dirW.axis.mass'),
    xRange: v.view === 0 ? [-1.5, 3.6] : [-3.2, 1.3],
    yRange: [-4, 2],
    series,
  };
}

const ARCH = {
  id: 'imaging-architectures',
  get title() {
    return t('dirW.arch.title');
  },
  get note() {
    return t('dirW.arch.note');
  },
  animated: false,
  controls: [
    picker('view', 'dirW.control.view', 2, 'dirW.view', 0),
    picker(
      'telescope',
      'dirW.control.telescope',
      INSTRUMENTS.length,
      'dirW.tel',
      3
    ),
    {
      id: 'distance',
      get label() {
        return t('dirW.control.distance');
      },
      min: 1,
      max: 100,
      step: 1,
      value: 10,
      decimals: 0,
      format: x => `${fixed(x, 0)} pc`,
    },
  ],
  draw(canvas, vals) {
    const v = architecturesView(vals);
    const spec = { label: t('dirW.arch.title'), ...archSpec(v) };
    const h = hostOf(canvas, t('dirW.arch.title'));
    h.chart.draw(spec);
    return spec;
  },
  readout(vals) {
    const v = architecturesView(vals);
    const c = v.counts;
    const sun = v.solar;
    return [
      {
        label: t('dirW.row.table'),
        value: t('dirW.v.table', {
          n: c.table,
          m: c.withAxisAndMass,
          k: c.withDistanceToo,
        }),
      },
      {
        label: t('dirW.row.imaged'),
        value: t('dirW.v.imaged', {
          a: fixed(v.median.imagedAxisAu, 0),
          m: fixed(v.median.imagedMassJup, 1),
          h: v.imagedHeavierThanJupiter,
          n: c.withAxisAndMass,
          b: v.imagedBeyondNeptune,
        }),
        emphasis: true,
      },
      {
        label: t('dirW.row.solar'),
        value: t('dirW.v.solar', {
          d: fixed(v.distancePc, 0),
          lo: ang(sun[0].arcsec),
          hi: ang(sun[sun.length - 1].arcsec),
        }),
      },
      {
        label: t('dirW.row.window'),
        value: t('dirW.v.window', {
          a: ang(v.innerWorkingArcsec),
          i: c.imagedOutside,
          k: c.withDistanceToo,
          s: c.solarOutside,
        }),
        emphasis: true,
      },
      { label: t('dirW.row.source'), value: t('dirW.v.source') },
    ];
  },
};

// ---- subtraction (Prompt 230 Part B) ---------------------------------------------------------

const clamp01 = x => Math.max(0, Math.min(1, x));
const IMG_BIAS = DESIGN.detector.biasLevel;
const IMG_GAIN = DESIGN.detector.gain;

/** An image into a context: values to 0..1 by `shade`, nearest-neighbour, in a square at (x0, y0). */
function paintFrame(ctx, w, h, shade, x0, y0, size) {
  const buf = document.createElement('canvas');
  buf.width = w;
  buf.height = h;
  const b = buf.getContext('2d');
  const img = b.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const g = Math.round(255 * clamp01(shade(i)));
    img.data[i * 4] = g;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = g;
    img.data[i * 4 + 3] = 255;
  }
  b.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buf, x0, y0, size, size);
}

function ring(ctx, cx, cy, r, color, dash = []) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.setLineDash([]);
}

const SUB = {
  id: 'imaging-subtraction',
  get title() {
    return t('dirW.sub.title');
  },
  get note() {
    return t('dirW.sub.note');
  },
  animated: false,
  controls: [
    {
      id: 'sep',
      get label() {
        return t('dirW.control.sep');
      },
      min: 1,
      max: 10,
      step: 0.5,
      value: 6,
      decimals: 1,
      format: x => `${fixed(x, 1)} FWHM`,
    },
    picker('contrast', 'dirW.control.contrast', CONTRASTS.length, 'dirW.cn', 2),
    picker('mismatch', 'dirW.control.mismatch', 3, 'dirW.mm', 1),
    {
      id: 'scene',
      get label() {
        return t('dirW.control.scene');
      },
      min: 0,
      max: 5,
      step: 1,
      value: 0,
      decimals: 0,
      format: x => fixed(x + 1, 0),
    },
  ],
  draw(canvas, vals) {
    const v = subtractionView(vals);
    const { ctx, w } = surface(canvas, 236);
    const ink = token('--text', '#1f2937');
    const muted = token('--text-muted', '#6b7280');
    const gap = 14;
    const size = Math.max(80, Math.min(200, Math.floor((w - 3 * gap) / 2)));
    const x1 = gap;
    const x2 = 2 * gap + size;
    const y0 = 26;
    const px = size / v.size;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = ink;
    ctx.textAlign = 'left';
    ctx.fillText(t('dirW.sub.target'), x1, 16);
    ctx.fillText(t('dirW.sub.residual'), x2, 16);
    const sky = DESIGN.sky * DESIGN.exposure;
    const top = Math.asinh(25000 / 30);
    paintFrame(
      ctx,
      v.size,
      v.size,
      i => Math.asinh(((v.target[i] - IMG_BIAS) * IMG_GAIN - sky) / 30) / top,
      x1,
      y0,
      size
    );
    ring(
      ctx,
      x1 + (v.planet.x + 0.5) * px,
      y0 + (v.planet.y + 0.5) * px,
      9 * px,
      '#e8590c'
    );
    if (v.refusal) {
      ctx.fillStyle = muted;
      ctx.fillText(t(`dirW.sub.refused.${v.refusal.code}`), x2, y0 + size / 2);
    } else {
      const sig = Math.max(v.noise || 18, 1);
      paintFrame(
        ctx,
        v.size,
        v.size,
        i => (v.reduction.residual[i] + 4 * sig) / (10 * sig),
        x2,
        y0,
        size
      );
      ring(
        ctx,
        x2 + (v.size / 2 + 0.5) * px,
        y0 + (v.size / 2 + 0.5) * px,
        v.workingFwhm * DESIGN.fwhm * px,
        '#2b8a3e',
        [4, 3]
      );
      ring(
        ctx,
        x2 + (v.planet.x + 0.5) * px,
        y0 + (v.planet.y + 0.5) * px,
        9 * px,
        '#e8590c'
      );
    }
    ctx.fillStyle = muted;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(t('dirW.sub.key'), x1, y0 + size + 16);
  },
  readout(vals) {
    const v = subtractionView(vals);
    const rows = [];
    if (v.refusal) {
      rows.push({
        label: t('dirW.row.subtraction'),
        value: t(`dirW.v.refused.${v.refusal.code}`, {
          d: fixed(v.refusal.depth ?? 0, 2),
          l: fixed(v.depthLimit, 2),
        }),
        emphasis: true,
      });
    } else {
      rows.push({
        label: t('dirW.row.subtraction'),
        value: t('dirW.v.subtraction', {
          k: fixed(v.scale, 3),
          d: fixed(100 * v.depth, 1),
        }),
      });
      rows.push({
        label: t('dirW.row.noise'),
        value: t('dirW.v.noise', { n: fixed(v.noise, 1) }),
      });
      const m = v.measure;
      rows.push({
        label: t('dirW.row.planet'),
        value: m.ok
          ? t('dirW.v.measured', {
              snr: fixed(m.snr, 1),
              f: fixed(m.flux, 0),
              sf: fixed(m.sigmaFlux, 0),
              inj: fixed(v.injected, 0),
              tp: fixed(m.flux / v.injected, 2),
              de: fixed(Math.hypot(m.x - v.planet.x, m.y - v.planet.y), 2),
            })
          : t('dirW.v.inside', {
              s: fixed(v.sepFwhm, 1),
              w: fixed(v.workingFwhm, 1),
            }),
        emphasis: true,
      });
      const s = v.search;
      rows.push({
        label: t('dirW.row.search'),
        value: v.found
          ? t('dirW.v.search.found', { snr: fixed(s.snr, 1) })
          : v.foundElsewhere
            ? t('dirW.v.search.elsewhere', {
                d: fixed(Math.hypot(s.x - v.planet.x, s.y - v.planet.y), 0),
                snr: fixed(s.snr, 1),
              })
            : t('dirW.v.search.none', { snr: fixed(s.snr, 1) }),
      });
      rows.push({
        label: t('dirW.row.limit'),
        value: t('dirW.v.limit', {
          c: sci(v.limit.contrast),
          f: fixed(v.limit.flux, 0),
        }),
      });
    }
    rows.push({
      label: t('dirW.row.assumes'),
      value: t('dirW.v.subassumes', { star: sci(v.starFlux) }),
    });
    return rows;
  },
};

// ---- orbit (Prompt 230 Part B) -----------------------------------------------------------

const RANGE_ARCSEC = 1.7;

const ORB = {
  id: 'imaging-orbit',
  get title() {
    return t('dirW.orb.title');
  },
  get note() {
    return t('dirW.orb.note');
  },
  animated: false,
  controls: [
    picker(
      'system',
      'dirW.control.orbsys',
      ORBIT_SYSTEMS.length,
      'dirW.orbsys',
      0
    ),
    picker('arc', 'dirW.control.orbarc', ARCS.length, 'dirW.orbarc', 1),
    toggle('reveal', 'dirW.control.reveal', 0),
  ],
  draw(canvas, vals) {
    const o = orbitView(vals);
    const { ctx, w } = surface(canvas, 250);
    const ink = token('--text', '#1f2937');
    const muted = token('--text-muted', '#6b7280');
    const gap = 14;
    const size = Math.max(90, Math.min(210, Math.floor((w - 3 * gap) / 2)));
    const x1 = gap;
    const x2 = 2 * gap + size;
    const y0 = 28;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = ink;
    ctx.textAlign = 'left';
    ctx.fillText(t('dirW.orb.sky'), x1, 16);
    ctx.fillText(t('dirW.orb.map'), x2, 16);
    // the sky: north up, east to the right
    const cx = x1 + size / 2;
    const cy = y0 + size / 2;
    const k = size / (2 * RANGE_ARCSEC);
    ctx.strokeStyle = muted;
    ctx.lineWidth = 1;
    ctx.strokeRect(x1 + 0.5, y0 + 0.5, size - 1, size - 1);
    const pt = p => [cx + p.y * k, cy - p.x * k];
    const path = (curve, color, dash) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash(dash);
      ctx.beginPath();
      curve.forEach((p, i) => {
        const [x, y] = pt(p);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };
    if (vals.reveal >= 0.5) path(o.truthCurve, '#2b8a3e', [4, 3]);
    if (o.fit.ok) path(orbitCurve(o.fit, 160), '#1c7ed6', []);
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = ink;
    for (const e of o.epochs)
      if (e.ok) {
        const [x, y] = pt(e);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    // the map: period (log) across, eccentricity up
    const m = o.map;
    if (m) {
      const nP = m.periods.length;
      const nE = m.eccentricities.length;
      const cw = size / nP;
      const ch = size / nE;
      for (let i = 0; i < nP; i++)
        for (let j = 0; j < nE; j++) {
          const d = m.chi2[i][j] - m.min;
          ctx.fillStyle =
            d <= 2.3
              ? '#1c7ed6'
              : d <= 5.99
                ? '#74a9e6'
                : d <= 11.83
                  ? '#c5d8f2'
                  : '#e9ecef';
          ctx.fillRect(
            x2 + i * cw,
            y0 + size - (j + 1) * ch,
            cw + 0.5,
            ch + 0.5
          );
        }
      ctx.strokeStyle = muted;
      ctx.strokeRect(x2 + 0.5, y0 + 0.5, size - 1, size - 1);
      const lo = Math.log10(m.periods[0]);
      const hi = Math.log10(m.periods[nP - 1]);
      const at = P => x2 + ((Math.log10(P) - lo) / (hi - lo)) * size;
      ctx.fillStyle = muted;
      ctx.font = '10px system-ui, sans-serif';
      for (let d = Math.ceil(lo); d <= Math.floor(hi); d++) {
        const x = at(10 ** d);
        ctx.fillRect(x, y0 + size - 4, 1, 4);
        ctx.fillText(fixed(10 ** d, d < 0 ? 1 : 0), x - 6, y0 + size + 12);
      }
      ctx.fillText(t('dirW.orb.axis'), x2, y0 + size + 24);
      const mark = (P, e, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        const x = at(P);
        const y = y0 + size - (e / m.eccentricities[nE - 1]) * size;
        ctx.beginPath();
        ctx.moveTo(x - 5, y);
        ctx.lineTo(x + 5, y);
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x, y + 5);
        ctx.stroke();
      };
      if (o.fit.ok)
        mark(o.fit.elements.P.value, o.fit.elements.e.value, '#d9480f');
      if (vals.reveal >= 0.5) mark(o.truth.P, o.truth.e, '#2b8a3e');
    }
  },
  readout(vals) {
    const o = orbitView(vals);
    const rows = [
      {
        label: t('dirW.row.epochs'),
        value: t('dirW.v.epochs', { k: o.kept, l: o.lost }),
      },
    ];
    const f = o.fit;
    if (f.ok) {
      const el = f.elements;
      rows.push({
        label: t('dirW.row.orbit'),
        value: t('dirW.v.orbit.ok', {
          p: fixed(el.P.value, 2),
          lo: fixed(el.P.interval68[0], 2),
          hi: fixed(el.P.interval68[1], 2),
          e: fixed(el.e.value, 2),
          circ: f.depth === 'circular' ? t('dirW.v.orbit.circ') : '',
          a: fixed(el.a.value, 3),
          sa: fixed(el.a.sigma, 3),
        }),
        emphasis: true,
      });
    } else {
      rows.push({
        label: t('dirW.row.orbit'),
        value: t('dirW.v.orbit.no', {
          code: f.code,
          why: t(`dirW.orb.code.${f.code}`),
        }),
        emphasis: true,
      });
    }
    if (o.map)
      rows.push({
        label: t('dirW.row.map'),
        value: t('dirW.v.map', {
          lo: fixed(o.periodRange95[0], 1),
          hi: fixed(o.periodRange95[1], 1),
          f: fixed(o.periodRange95[1] / o.periodRange95[0], 1),
          elo: fixed(o.eccentricityRange95[0], 2),
          ehi: fixed(o.eccentricityRange95[1], 2),
        }),
      });
    rows.push({
      label: t('dirW.row.truth'),
      value:
        vals.reveal >= 0.5
          ? t('dirW.v.truth', {
              p: fixed(o.truth.P, 1),
              e: fixed(o.truth.e, 2),
              a: fixed(o.truth.a, 2),
            })
          : t('dirW.v.hidden'),
    });
    rows.push({ label: t('dirW.row.assumes'), value: t('dirW.v.orbassumes') });
    return rows;
  },
};

export const DIRECT_IMAGING_WIDGETS = [CONTRAST, ARCH, SUB, ORB];
