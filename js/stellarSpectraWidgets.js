// =============================================================================
// Four observed spectra
// -----------------------------------------------------------------------------
// Two instruments over js/data/spectra/sdssSpectra.js: four stars observed by
// SDSS in 2008, one each of spectral type A, G, K and M. A comparison of all
// four, and a single anonymous one to be identified from its features.
//
// These are OBSERVATIONS, and the distinction is the reason this file exists
// separately from js/stellarWidgets.js next door. That one draws MIST
// evolutionary tracks - models, computed by a stellar-structure code. This one
// draws photons. Both appear in the same lesson and the lesson depends on a
// reader being able to tell which is which, so the readouts here say so on
// every screen rather than once in a note.
//
// The one thing this file is careful about
// -----------------------------------------------------------------------------
// The curves are NOT drawn in the colors of their stars. A blue curve for the A
// star and a red one for the M star would hand a reader the answer to the
// question the lesson is asking, which is whether a spectrum carries anything a
// color does not. The four are told apart by a neutral hue, a dash pattern and
// a label at the end of the line - three ways, none of them a temperature -
// and every number a step asks for is in the readout underneath.
//
// The data arrives lazily
// -----------------------------------------------------------------------------
// Thirteen kilobytes of flux is not something to download for a reader who
// never opens this lesson, so the data module is behind a dynamic import
// started when this one loads. Everything here draws a stated waiting state
// until it lands. `spectraReady` is what a test or the scene audit awaits;
// nothing in the lesson engine does, so no other lesson waits for it.
//
// What the display does to the data, and what it does not
// -----------------------------------------------------------------------------
// Each curve is scaled to its own maximum inside the window being shown. That
// is a display decision and it is the right one: the absolute flux of a star
// is mostly a statement about how far away it is, which is not what any of
// these steps is about, and the shape - which is - is unchanged by it. Band
// depth is a ratio and is unaffected. Nothing else happens to the numbers: no
// smoothing, no continuum fit, no shift. The committed data is untouched.
// =============================================================================

import { t } from './i18n/index.js';
import { loadBuiltin } from './platform/resolver.js';
import { ensureDeferredMessages } from './i18n/deferredMessages.js';

ensureDeferredMessages().catch(() => {});

import {
  surface,
  responsiveHeight,
  palette,
  TYPE,
  typeAt,
} from './widgetCanvas.js';
import {
  SPECTRAL_FEATURES,
  airToVacuum,
  bandDepth,
  vacuumToAir,
} from './stellar/spectrumIndex.js';

// -----------------------------------------------------------------------------
// The data, when it arrives
// -----------------------------------------------------------------------------

/** The decoded module, or null until the import resolves. */
let data = null;

/**
 * Resolves true when the spectra are usable, false when they could not be
 * fetched. Never rejects: a widget that cannot draw has to be able to say so,
 * and a rejected promise nobody awaited is a console error and a blank canvas.
 */
export const spectraReady = loadBuiltin('builtin:data/sdss-spectra')
  .then(mod => {
    data = mod;
    return true;
  })
  .catch(err => {
    console.warn('The SDSS spectra could not be loaded:', err);
    return false;
  });

/** The windows a step can put the instrument in. Air Angstroms, as quoted. */
const WINDOWS = [
  { id: 'full', from: 3815, to: 9170, feature: null },
  { id: 'cak', from: 3860, to: 4010, feature: 'cak' },
  { id: 'hbeta', from: 4780, to: 4950, feature: 'hbeta' },
  { id: 'nad', from: 5820, to: 5965, feature: 'nad' },
  { id: 'tio', from: 6950, to: 7250, feature: 'tio' },
];

/**
 * How the four are told apart, and deliberately not by temperature.
 *
 * `hue` indexes the palette below. The dash is what carries the distinction
 * when the hues do not - on a monochrome printout, for a reader with a color
 * vision deficiency, and for anybody whose screen is washed out by a projector.
 */
const STROKES = [
  { hue: 'accent', dash: [] },
  { hue: 'good', dash: [7, 4] },
  { hue: 'warn', dash: [2, 3] },
  { hue: 'ink', dash: [10, 3, 2, 3] },
];

/** Anonymous names for the comparison, in the order the spectra are stored. */
const TAGS = ['W', 'X', 'Y', 'Z'];

/**
 * Anonymous names for the identification, which are deliberately NOT the ones
 * above.
 *
 * The two instruments present the four in different orders, so a shared tag
 * set would put "star W" on the A spectrum in one widget and on the K spectrum
 * in the other - a correspondence a reader would quite reasonably assume and
 * which would be false. Different letters say there is nothing to carry across.
 */
const ID_TAGS = ['P', 'Q', 'R', 'S'];

/**
 * The order the identification widget presents the four in.
 *
 * Not the storage order, which is A G K M and would let a reader who noticed
 * that get every answer right without looking at a spectrum. Fixed rather than
 * shuffled at run time so that a step's `star` value means the same thing on
 * every machine, and so that an instructor guide can say which is which.
 */
const IDENTIFY_ORDER = ['k', 'a', 'm', 'g'];

/** Every spectrum, decoded, in storage order. Empty until the import lands. */
function allSpectra() {
  if (!data) return [];
  return data.SPECTRUM_IDS.map(id => data.decodeSpectrum(id));
}

/** The wavelength of a sample, without building the whole axis. */
const lambdaAt = i => 10 ** (data.GRID.logStart + i * data.GRID.logStep);

/** The sample range covering a window, clamped to the grid. */
function sampleRange(from, to) {
  const lo = airToVacuum(from);
  const hi = airToVacuum(to);
  const iOf = w => (Math.log10(w) - data.GRID.logStart) / data.GRID.logStep;
  return {
    i0: Math.max(0, Math.floor(iOf(lo))),
    i1: Math.min(data.GRID.count - 1, Math.ceil(iOf(hi))),
  };
}

/** A wavelength range as a reader will type it into a table: 3,927-3,940. */
const span = w => `${w[0].toLocaleString()}\u2013${w[1].toLocaleString()}`;

/**
 * Where a depth was measured, in words.
 *
 * The number alone is not the evidence: a reader who cannot see the shaded
 * band still has to know which stretch of spectrum the depth is about and what
 * it is measured against, or "56% deep" is a claim with nothing to check it
 * against. The TiO band has one reference window, not two, and says so.
 */
function whereMeasured(f) {
  const same = f.blue[0] === f.red[0] && f.blue[1] === f.red[1];
  return same
    ? t('specW.value.regionHead', { line: span(f.line), ref: span(f.blue) })
    : t('specW.value.region', {
        line: span(f.line),
        blue: span(f.blue),
        red: span(f.red),
      });
}

/** A percentage, the way every readout row here prints one. */
const pct = v => (Number.isFinite(v) ? `${(v * 100).toFixed(1)}%` : '—');

/** The window a control value selects. */
const windowAt = v =>
  WINDOWS[Math.min(WINDOWS.length - 1, Math.max(0, Math.round(v || 0)))];

/**
 * What a spectrum is called on screen.
 *
 * Anonymous by default. A lesson step turns the names on when it is ready for
 * them to be on, which is after the reader has committed to an answer.
 */
const nameOf = (spec, index, named) =>
  named
    ? t('specW.name.class', { letter: spec.letter, sub: spec.subClass })
    : t('specW.name.tag', { tag: TAGS[index] });

// -----------------------------------------------------------------------------
// Drawing
// -----------------------------------------------------------------------------

/** The plot frame, its axes and its grid. */
function frame(g, r, colors, win) {
  g.strokeStyle = colors.grid;
  g.lineWidth = 1;
  g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  g.font = typeAt(TYPE.TICK);
  g.fillStyle = colors.muted;
  g.textAlign = 'center';
  g.textBaseline = 'top';

  // Round wavelengths across the bottom. Five at most: this canvas is 400px
  // wide on a phone and six labels at TYPE.TICK collide there.
  const span = win.to - win.from;
  const step = span > 3000 ? 1000 : span > 500 ? 100 : span > 200 ? 50 : 25;
  const first = Math.ceil(win.from / step) * step;
  for (let w = first; w <= win.to; w += step) {
    const x = r.x + ((w - win.from) / span) * r.w;
    g.strokeStyle = colors.grid;
    g.globalAlpha = 0.45;
    g.beginPath();
    g.moveTo(x, r.y);
    g.lineTo(x, r.y + r.h);
    g.stroke();
    g.globalAlpha = 1;
    g.fillText(String(w), x, r.y + r.h + 4);
  }
  g.textAlign = 'left';
  g.fillText(t('specW.axis.wavelength'), r.x, r.y + r.h + 18);
  g.textAlign = 'right';
  g.fillText(t('specW.axis.flux'), r.x + r.w, r.y + r.h + 18);
}

/**
 * The marker for one absorption feature.
 *
 * Drawn as the band it is measured over rather than as a line at its center,
 * because the band is what the number under the canvas is a number about. A
 * reader who marks the middle of the shaded strip has marked what was measured.
 */
function drawFeature(g, r, colors, win, feature, label) {
  const span = win.to - win.from;
  const xOf = w => r.x + ((w - win.from) / span) * r.w;
  const a = Math.max(r.x, xOf(feature.line[0]));
  const b = Math.min(r.x + r.w, xOf(feature.line[1]));
  if (b <= r.x || a >= r.x + r.w) return;
  g.fillStyle = colors.muted;
  g.globalAlpha = 0.16;
  g.fillRect(a, r.y, Math.max(2, b - a), r.h);
  g.globalAlpha = 1;
  if (label) {
    g.font = typeAt(TYPE.MIN);
    g.fillStyle = colors.muted;
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.fillText(label, (a + b) / 2, r.y + 3);
  }
}

/** One spectrum, scaled to its own maximum in the window. */
function drawCurve(g, r, colors, win, spec, stroke, emphasis) {
  const { i0, i1 } = sampleRange(win.from, win.to);
  let peak = 0;
  for (let i = i0; i <= i1; i++) if (spec.flux[i] > peak) peak = spec.flux[i];
  if (!(peak > 0)) return;
  const span = win.to - win.from;
  g.save();
  g.beginPath();
  g.rect(r.x, r.y, r.w, r.h);
  g.clip();
  g.strokeStyle = colors[stroke.hue];
  g.lineWidth = emphasis ? 2 : 1.2;
  g.globalAlpha = emphasis ? 1 : 0.62;
  g.setLineDash(stroke.dash);
  g.beginPath();
  for (let i = i0; i <= i1; i++) {
    // The window is quoted in air and the grid is vacuum; converting the
    // wavelength back rather than the window keeps the axis labels the numbers
    // a reader will look up.
    const air = vacuumToAir(lambdaAt(i));
    const x = r.x + ((air - win.from) / span) * r.w;
    const y = r.y + r.h - (spec.flux[i] / peak) * (r.h - 8) - 4;
    if (i === i0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  g.setLineDash([]);
  g.globalAlpha = 1;
  g.restore();
}

/** The legend, on the plot, naming each curve the way its stroke is drawn. */
function legend(g, r, colors, entries) {
  g.font = typeAt(TYPE.TICK);
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  let y = r.y + 10;
  for (const e of entries) {
    g.strokeStyle = colors[e.stroke.hue];
    g.lineWidth = e.emphasis ? 2 : 1.2;
    g.setLineDash(e.stroke.dash);
    g.beginPath();
    g.moveTo(r.x + r.w - 76, y);
    g.lineTo(r.x + r.w - 52, y);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = e.emphasis ? colors.ink : colors.muted;
    g.fillText(e.name, r.x + r.w - 46, y);
    y += 15;
  }
}

/** What every canvas here says while the data is still on its way. */
function drawWaiting(g, w, h, colors, failed) {
  g.fillStyle = colors.muted;
  g.font = typeAt(TYPE.LABEL);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(t(failed ? 'specW.failed' : 'specW.loading'), w / 2, h / 2);
}

/** Whether the import has settled, and how. */
let failed = false;
spectraReady.then(ok => {
  failed = !ok;
});

// -----------------------------------------------------------------------------
// The comparison
// -----------------------------------------------------------------------------

const SPECTRA_COMPARE = {
  id: 'spectra-compare',
  get title() {
    return t('specW.compare.title');
  },
  get note() {
    return t('specW.compare.note');
  },
  animated: false,
  controls: [
    {
      id: 'window',
      get label() {
        return t('specW.control.window');
      },
      min: 0,
      max: WINDOWS.length - 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(`specW.window.${windowAt(v).id}`),
    },
    {
      id: 'focus',
      get label() {
        return t('specW.control.focus');
      },
      min: 0,
      max: 4,
      step: 1,
      value: 0,
      decimals: 0,
      format: v =>
        Math.round(v) === 0
          ? t('specW.focus.all')
          : t('specW.focus.one', { tag: TAGS[Math.round(v) - 1] }),
    },
    {
      id: 'named',
      get label() {
        return t('specW.control.named');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(v >= 0.5 ? 'specW.named.on' : 'specW.named.off'),
    },
  ],

  draw(canvas, v, ctx, spec = {}) {
    const colors = palette();
    const height = responsiveHeight(300, 210);
    const { ctx: g, w, h } = surface(canvas, height);
    if (!data) return drawWaiting(g, w, h, colors, failed);

    const win = windowAt(v.window);
    const named = v.named >= 0.5;
    const focus = Math.round(v.focus ?? 0);
    const r = { x: 44, y: 10, w: w - 56, h: h - 34 };
    frame(g, r, colors, win);

    // The marked bands. In the whole-range view all four are marked and none
    // is labeled - at that width a label is unreadable and the bands are two
    // pixels wide. In a feature window the one feature is marked and named.
    if (spec.marks !== false) {
      for (const f of SPECTRAL_FEATURES) {
        const inWindow = !win.feature || win.feature === f.id;
        if (inWindow) {
          drawFeature(
            g,
            r,
            colors,
            win,
            f,
            win.feature ? t(`specW.feature.${f.id}`) : ''
          );
        }
      }
    }

    const list = allSpectra();
    const entries = list.map((s, i) => ({
      name: nameOf(s, i, named),
      stroke: STROKES[i],
      emphasis: focus === 0 || focus === i + 1,
    }));
    // Emphasised last, so the curve a reader is looking at is on top.
    for (const [i, s] of list.entries()) {
      if (!entries[i].emphasis)
        drawCurve(g, r, colors, win, s, STROKES[i], false);
    }
    for (const [i, s] of list.entries()) {
      if (entries[i].emphasis)
        drawCurve(g, r, colors, win, s, STROKES[i], true);
    }
    legend(g, r, colors, entries);
  },

  readout(v) {
    const rows = [];
    if (!data) {
      rows.push({
        label: t('specW.row.state'),
        value: t(failed ? 'specW.failed' : 'specW.loading'),
        emphasis: true,
      });
      return rows;
    }
    const win = windowAt(v.window);
    const named = v.named >= 0.5;
    const focus = Math.round(v.focus ?? 0);
    const list = allSpectra();

    // What kind of thing this is, first and on every screen. The lesson runs
    // this instrument beside one that draws stellar models and the difference
    // between them is a thing the lesson is teaching.
    rows.push({
      label: t('specW.row.kind'),
      value: t('specW.value.kind'),
      emphasis: true,
    });
    rows.push({
      label: t('specW.row.window'),
      value: t('specW.value.window', {
        name: t(`specW.window.${win.id}`),
      }),
    });

    // The numbers the canvas is a picture of. Every band depth the lesson can
    // ask for is here, for every spectrum, whether or not a reader can see the
    // plot - which is what makes these steps completable from the keyboard.
    for (const [i, s] of list.entries()) {
      if (focus !== 0 && focus !== i + 1) continue;
      const depths = SPECTRAL_FEATURES.map(
        f => `${t(`specW.feature.${f.id}`)} ${pct(bandDepth(s, f))}`
      ).join(', ');
      rows.push({
        label: nameOf(s, i, named),
        value: depths,
        emphasis: focus === i + 1,
      });
    }

    if (focus !== 0) {
      const s = list[focus - 1];
      if (s) {
        rows.push({
          label: t('specW.row.source'),
          value: t('specW.value.source', {
            plate: s.plate,
            mjd: s.mjd,
            fiber: s.fiberID,
            date: s.observed,
          }),
        });
        if (named) {
          rows.push({
            label: t('specW.row.classified'),
            value: t('specW.value.classified', {
              sub: s.subClass,
              elodie: s.elodieSpType,
            }),
          });
        }
      }
    }
    if (win.feature) {
      const f = SPECTRAL_FEATURES.find(x => x.id === win.feature);
      rows.push({
        label: t('specW.row.measured', { feature: t(`specW.feature.${f.id}`) }),
        value: whereMeasured(f),
      });
    }
    rows.push({ label: t('specW.row.cite'), value: data.CITATION });
    rows.push({ label: t('specW.row.limits'), value: t('specW.value.limits') });
    return rows;
  },
};

// -----------------------------------------------------------------------------
// One spectrum, to be identified
// -----------------------------------------------------------------------------

const SPECTRA_IDENTIFY = {
  id: 'spectra-identify',
  get title() {
    return t('specW.identify.title');
  },
  get note() {
    return t('specW.identify.note');
  },
  animated: false,
  controls: [
    {
      id: 'star',
      get label() {
        return t('specW.control.star');
      },
      min: 1,
      max: 4,
      step: 1,
      value: 1,
      decimals: 0,
      format: v => t('specW.star.nth', { tag: ID_TAGS[Math.round(v) - 1] }),
    },
    {
      id: 'window',
      get label() {
        return t('specW.control.window');
      },
      // Starts at 1: this instrument has no whole-range setting, because a
      // whole-range view of one spectrum is a picture of its color and this
      // widget exists to ask a question a color cannot answer.
      min: 1,
      max: WINDOWS.length - 1,
      step: 1,
      value: 1,
      decimals: 0,
      format: v => t(`specW.window.${windowAt(v).id}`),
    },
    {
      id: 'reveal',
      get label() {
        return t('specW.control.reveal');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(v >= 0.5 ? 'specW.reveal.on' : 'specW.reveal.off'),
    },
  ],

  /**
   * Which spectrum a `star` value is, in the presentation order.
   *
   * Not called `pick`: that key is the lesson engine's canvas-pointer hook,
   * and a widget that declares one gets pointer events routed into it.
   */
  spectrumFor(v) {
    const n = Math.min(4, Math.max(1, Math.round(v.star ?? 1)));
    return IDENTIFY_ORDER[n - 1];
  },

  draw(canvas, v) {
    const colors = palette();
    const height = responsiveHeight(290, 200);
    const { ctx: g, w, h } = surface(canvas, height);
    if (!data) return drawWaiting(g, w, h, colors, failed);

    const id = SPECTRA_IDENTIFY.spectrumFor(v);
    const s = data.decodeSpectrum(id);
    const win = windowAt(v.window ?? 1);
    const revealed = v.reveal >= 0.5;
    const r = { x: 44, y: 10, w: w - 56, h: h - 34 };
    frame(g, r, colors, win);
    for (const f of SPECTRAL_FEATURES) {
      if (!win.feature || win.feature === f.id) {
        drawFeature(g, r, colors, win, f, t(`specW.feature.${f.id}`));
      }
    }
    drawCurve(g, r, colors, win, s, STROKES[0], true);
    legend(g, r, colors, [
      {
        name: revealed
          ? t('specW.name.class', { letter: s.letter, sub: s.subClass })
          : t('specW.name.idTag', {
              tag: ID_TAGS[Math.round(v.star ?? 1) - 1],
            }),
        stroke: STROKES[0],
        emphasis: true,
      },
    ]);
  },

  readout(v) {
    const rows = [];
    if (!data) {
      rows.push({
        label: t('specW.row.state'),
        value: t(failed ? 'specW.failed' : 'specW.loading'),
        emphasis: true,
      });
      return rows;
    }
    const id = SPECTRA_IDENTIFY.spectrumFor(v);
    const s = data.decodeSpectrum(id);
    const win = windowAt(v.window ?? 1);
    const revealed = v.reveal >= 0.5;

    rows.push({
      label: t('specW.row.kind'),
      value: t('specW.value.kind'),
      emphasis: true,
    });
    rows.push({
      label: t('specW.row.window'),
      value: t('specW.value.window', {
        name: t(`specW.window.${win.id}`),
      }),
    });
    // All four depths, not just the one in view: the question is which star
    // this is, and a reader answering it from the readout should have the same
    // evidence as one who steps the window control across four settings.
    for (const f of SPECTRAL_FEATURES) {
      rows.push({
        label: t(`specW.feature.${f.id}`),
        value: `${t('specW.value.depth', {
          depth: pct(bandDepth(s, f)),
          at: Math.round(f.centerAir).toLocaleString(),
        })}; ${whereMeasured(f)}`,
        emphasis: win.feature === f.id,
      });
    }
    rows.push({
      label: t('specW.row.source'),
      value: t('specW.value.source', {
        plate: s.plate,
        mjd: s.mjd,
        fiber: s.fiberID,
        date: s.observed,
      }),
    });
    rows.push({ label: t('specW.row.cite'), value: data.CITATION });
    rows.push({
      label: t('specW.row.answer'),
      value: revealed
        ? t('specW.value.answer', { sub: s.subClass, elodie: s.elodieSpType })
        : t('specW.value.held'),
      emphasis: revealed,
    });
    return rows;
  },
};

export const SPECTRA_WIDGETS = [SPECTRA_COMPARE, SPECTRA_IDENTIFY];
export { WINDOWS, TAGS, ID_TAGS, IDENTIFY_ORDER, allSpectra };
