// =============================================================================
// Five real mergers, compared
// -----------------------------------------------------------------------------
// One instrument over js/data/gw/gwoscEvents.js: whitened GWOSC strain from
// five compact-binary mergers, one detector each, drawn as a time-frequency
// map and read, slice by slice, for the loudest frequency before the chirp
// ends. The lesson that uses it asks for a comparison between events, not a
// tour of them.
//
// Four kinds of number, and they are never on one line
// -----------------------------------------------------------------------------
// The readout is organised under headings, because the whole value of this
// instrument is that a reader can tell which kind of claim each number is:
//
//   Observed strain       what the detector recorded, whitened here by its own
//                         noise. The picture.
//   Measured here         read off that strain by this project, in the
//                         browser: the noise level, where the chirp ends, and
//                         the loudest frequency at each time before the end.
//   GWOSC catalog value   masses, distance, signal-to-noise ratio. Copied, and
//                         held back until the reader turns them on, so that a
//                         prediction can be made from the measurement first.
//   Model                 the leading-order chirp track for the catalog's chirp
//                         mass. Drawn only on request, dashed, and never
//                         fitted to anything.
//
// There is no chirp mass measured here. One was built and rejected: the 0PN
// relation inverted from two points on the track failed on two of the five
// events and ran 16 per cent high on the one where it was stable. See the
// provenance record, notDone.
//
// The data arrives lazily
// -----------------------------------------------------------------------------
// The same pattern as js/stellarSpectraWidgets.js: the strain is behind a
// dynamic import started when this module loads, and everything here draws a
// stated waiting state until it lands. `eventsReady` is what the tests and the
// scene audit await; nothing in the lesson engine does, so no other lesson
// waits for it.
// =============================================================================

import { t } from './i18n/index.js';
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
  qScan,
  loudestFrequencyAt,
  signalEnd,
  noiseCeiling,
} from './gw/qscan.js';
import { frequencyAt, timeToCoalescence } from './gw/waveform.js';

/** The decoded data module, or null until the import resolves. */
let data = null;
let failed = false;

/**
 * Resolves true when the events are usable and false when they could not be
 * fetched. Never rejects, for the reason js/stellarSpectraWidgets.js gives.
 */
export const eventsReady = import('./data/gw/gwoscEvents.js')
  .then(mod => {
    data = mod;
    return true;
  })
  .catch(err => {
    console.warn('The GWOSC events could not be loaded:', err);
    failed = true;
    return false;
  });

/** The map the widget draws: the same rows the build chose detectors on. */
const SCAN = { fMin: 30, fMax: 400, rows: 48 };

/** Scans and measurements, made once per event. */
const measured = new Map();

/**
 * Everything this instrument reads off one event's strain.
 * @param {string} id - Event name
 * @returns {object} scan, the measured end, and the slice table
 */
export function measureEvent(id) {
  if (measured.has(id)) return measured.get(id);
  const e = data.decodeEvent(id);
  const scan = qScan(e.samples, { sampleRate: e.sampleRate, q: e.q, ...SCAN });
  const tc = e.gps - e.t0;
  const end = signalEnd(scan, tc - 0.1, tc + 0.1);
  const slices = data.BEFORE_MERGER.map(tau => ({
    tau,
    freq:
      end.time === null ? null : loudestFrequencyAt(scan, end.time - tau).freq,
  }));
  const out = {
    event: e,
    scan,
    tc,
    // Seconds from the catalog time; null when nothing clears the noise.
    end: end.time === null ? null : end.time - tc,
    slices,
    noiseAt100: e.asd.value[e.asd.freq.indexOf(100)],
  };
  measured.set(id, out);
  return out;
}

/**
 * The detector-frame chirp mass, from two catalog values.
 *
 * The frequency a detector sees is set by the chirp mass redshifted by the
 * expansion of the Universe, Mc (1 + z). GWOSC publishes the source-frame
 * value and the redshift, the latter to two decimals, so this is a product of
 * two catalog numbers and is labelled as that - not as something measured.
 */
export function detectorFrameChirpMass(e) {
  const mc = e.catalog.chirp_mass_source.value;
  const z = e.catalog.redshift.value;
  return mc > 0 && z >= 0 ? mc * (1 + z) : null;
}

/** The event a control value selects. */
const idAt = v =>
  data.EVENT_IDS[
    Math.min(data.EVENT_IDS.length - 1, Math.max(0, Math.round(v || 0)))
  ];

/** Decimal places a catalog literal was written with. */
const placesOf = x => {
  const text = String(Math.abs(x));
  if (text.includes('e')) return 4;
  return (text.split('.')[1] || '').length;
};

/**
 * A number with its catalog interval, to the precision GWOSC published it.
 *
 * Not a fixed count of decimals. At two places GW170817's chirp mass,
 * 1.186 +0.001 -0.001, read "+0.00 / -0.00" - the most precisely measured mass
 * in the catalog shown as if it had no uncertainty - and GW150914's 27.9 read
 * 27.90, a digit nobody measured. The catalog literals are what the build
 * pinned, and the shortest form of each is how GWOSC wrote it, so the value
 * and both offsets are printed with the most places any of the three has.
 */
export function withInterval(x) {
  if (!x || x.value === null || x.value === undefined) return t('gwE.missing');
  const hasInterval =
    Number.isFinite(x.upper) &&
    Number.isFinite(x.lower) &&
    (x.upper !== 0 || x.lower !== 0);
  const parts = hasInterval ? [x.value, x.upper, x.lower] : [x.value];
  const places = Math.min(4, Math.max(...parts.map(placesOf)));
  const v = x.value.toFixed(places);
  if (!hasInterval) return v;
  return `${v} (+${x.upper.toFixed(places)} / \u2212${Math.abs(x.lower).toFixed(places)})`;
}

/** Hz, to the precision the map supports. */
const hz = f => (f === null ? '—' : `${Math.round(f)} Hz`);

/** Seconds, signed, as the readout prints them. */
const sec = s => `${s >= 0 ? '+' : '−'}${Math.abs(s).toFixed(3)} s`;

// -----------------------------------------------------------------------------
// Drawing
// -----------------------------------------------------------------------------

function drawWaiting(g, w, h, colors) {
  g.fillStyle = colors.muted;
  g.font = typeAt(TYPE.LABEL);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(t(failed ? 'gwE.failed' : 'gwE.loading'), w / 2, h / 2);
}

/** The time-frequency map, the measured end and slices, and the model. */
function drawMap(g, r, colors, m, v) {
  const e = m.event;
  const seconds = e.count / e.sampleRate;
  const t0 = -m.tc; // catalog time is zero on the axis
  const t1 = t0 + seconds;
  const xOf = s => r.x + ((s - t0) / (t1 - t0)) * r.w;
  const lf = Math.log(SCAN.fMax / SCAN.fMin);
  const yOf = f => r.y + r.h - (Math.log(f / SCAN.fMin) / lf) * r.h;

  // Energy as the accent colour's opacity: a quiet pixel is the background,
  // one at the noise ceiling is half-strength, and above it is full. Colour
  // carries energy and nothing else; every number is in the readout.
  // The ceiling for one instant searched across every row.
  const ceiling = noiseCeiling(SCAN.rows);
  const cols = Math.max(40, Math.floor(r.w / 3));
  const per = Math.max(1, Math.floor(e.count / cols));
  const rowH = r.h / SCAN.rows;
  g.fillStyle = colors.accent;
  for (let row = 0; row < SCAN.rows; row++) {
    const energy = m.scan.energy[row];
    for (let c = 0; c * per < e.count; c++) {
      let peak = 0;
      for (let i = c * per; i < Math.min(e.count, (c + 1) * per); i++) {
        if (energy[i] > peak) peak = energy[i];
      }
      const a = Math.min(1, peak / (2 * ceiling));
      if (a < 0.08) continue;
      g.globalAlpha = a;
      // Placed by sample, not by column number: \`per\` is floored, so there
      // can be more columns than \`cols\`, and dividing by \`cols\` would draw
      // the last of them past the right-hand axis.
      const x = r.x + ((c * per) / e.count) * r.w;
      g.fillRect(
        x,
        r.y + r.h - (row + 1) * rowH,
        (per / e.count) * r.w + 0.5,
        rowH + 0.5
      );
    }
  }
  g.globalAlpha = 1;

  // Axes.
  g.strokeStyle = colors.grid;
  g.lineWidth = 1;
  g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  g.font = typeAt(TYPE.TICK);
  g.fillStyle = colors.muted;
  g.textBaseline = 'middle';
  g.textAlign = 'right';
  for (const f of [30, 50, 100, 200, 400]) {
    g.fillText(String(f), r.x - 4, yOf(f));
  }
  g.textAlign = 'center';
  g.textBaseline = 'top';
  const step = seconds > 4 ? 1 : 0.5;
  for (let s = Math.ceil(t0 / step) * step; s <= t1; s += step) {
    g.fillText(s.toFixed(1), xOf(s), r.y + r.h + 4);
  }
  g.textAlign = 'left';
  g.fillText(t('gwE.axis.time'), r.x, r.y + r.h + 18);
  g.save();
  g.translate(r.x - 32, r.y + r.h / 2);
  g.rotate(-Math.PI / 2);
  g.textAlign = 'center';
  g.fillText(t('gwE.axis.freq'), 0, 0);
  g.restore();

  // The measured end, and the slices read before it: rings, not dots, so they
  // stay visible over a bright map.
  if (m.end !== null) {
    g.strokeStyle = colors.ink;
    g.setLineDash([2, 3]);
    g.beginPath();
    g.moveTo(xOf(m.end), r.y);
    g.lineTo(xOf(m.end), r.y + r.h);
    g.stroke();
    g.setLineDash([]);
    for (const s of m.slices) {
      if (s.freq === null) continue;
      g.beginPath();
      g.arc(xOf(m.end - s.tau), yOf(s.freq), 4, 0, 2 * Math.PI);
      g.stroke();
    }
  }

  // The model, only when asked for and only when the catalog value it needs is
  // on the screen: drawing it with the catalog held would give the catalog away.
  if (v.model >= 0.5 && v.catalog >= 0.5) {
    const mc = detectorFrameChirpMass(e);
    const anchor = m.end ?? 0;
    g.strokeStyle = colors.warn;
    g.setLineDash([6, 4]);
    g.lineWidth = 1.5;
    g.beginPath();
    let started = false;
    for (let s = t0; s < anchor - 0.004; s += 0.002) {
      const f = frequencyAt(anchor - s, mc);
      if (!(f >= SCAN.fMin && f <= SCAN.fMax)) continue;
      if (!started) g.moveTo(xOf(s), yOf(f));
      else g.lineTo(xOf(s), yOf(f));
      started = true;
    }
    g.stroke();
    g.setLineDash([]);
    g.lineWidth = 1;
  }
}

// -----------------------------------------------------------------------------
// The instrument
// -----------------------------------------------------------------------------

const GW_EVENTS = {
  id: 'gw-events',
  get title() {
    return t('gwE.title');
  },
  get note() {
    return t('gwE.note');
  },
  animated: false,
  controls: [
    {
      id: 'event',
      get label() {
        return t('gwE.control.event');
      },
      min: 0,
      max: 4,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => (data ? idAt(v) : t('gwE.loading')),
    },
    {
      id: 'catalog',
      get label() {
        return t('gwE.control.catalog');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(v >= 0.5 ? 'gwE.shown' : 'gwE.held'),
    },
    {
      id: 'model',
      get label() {
        return t('gwE.control.model');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(v >= 0.5 ? 'gwE.on' : 'gwE.off'),
    },
  ],

  draw(canvas, v) {
    const colors = palette();
    const height = responsiveHeight(300, 220);
    const { ctx: g, w, h } = surface(canvas, height);
    if (!data) return drawWaiting(g, w, h, colors);
    const m = measureEvent(idAt(v.event));
    drawMap(g, { x: 48, y: 10, w: w - 60, h: h - 44 }, colors, m, v);
  },

  readout(v) {
    if (!data) {
      return [
        {
          label: t('gwE.row.state'),
          value: t(failed ? 'gwE.failed' : 'gwE.loading'),
          emphasis: true,
        },
      ];
    }
    const id = idAt(v.event);
    const m = measureEvent(id);
    const e = m.event;
    const rows = [];
    const heading = key =>
      rows.push({ label: t(key), value: '', emphasis: true });

    heading('gwE.head.observed');
    rows.push({
      label: t('gwE.row.event'),
      value: t('gwE.value.event', {
        id,
        det: e.detector,
        gps: e.gps.toFixed(1),
      }),
    });
    rows.push({
      label: t('gwE.row.drawn'),
      value: t('gwE.value.drawn', { det: e.detector }),
    });

    heading('gwE.head.measured');
    rows.push({
      label: t('gwE.row.end'),
      value:
        m.end === null
          ? t('gwE.value.noEnd')
          : t('gwE.value.end', { s: sec(m.end) }),
    });
    rows.push({
      label: t('gwE.row.slices'),
      value: m.slices.map(s => `${s.tau} s: ${hz(s.freq)}`).join(', '),
    });
    rows.push({
      label: t('gwE.row.noise'),
      value: t('gwE.value.noise', { asd: m.noiseAt100.toExponential(1) }),
    });

    // The comparison the lesson is about, across all five, from the strain.
    const at = tau => {
      const i = data.BEFORE_MERGER.indexOf(tau);
      return data.EVENT_IDS.map(
        other => `${other} ${hz(measureEvent(other).slices[i].freq)}`
      ).join(', ');
    };
    rows.push({ label: t('gwE.row.compare', { tau: 0.1 }), value: at(0.1) });
    rows.push({ label: t('gwE.row.compare', { tau: 0.05 }), value: at(0.05) });

    heading('gwE.head.catalog');
    if (v.catalog >= 0.5) {
      const c = e.catalog;
      rows.push({
        label: t('gwE.row.version'),
        value: t('gwE.value.version', {
          values: e.catalogVersion,
          strain: e.strainVersion,
        }),
      });
      rows.push({
        label: t('gwE.row.chirp'),
        value: `${withInterval(c.chirp_mass_source)} M☉`,
      });
      rows.push({
        label: t('gwE.row.masses'),
        value: `${withInterval(c.mass_1_source)} M☉, ${withInterval(c.mass_2_source)} M☉`,
      });
      rows.push({
        label: t('gwE.row.distance'),
        value: `${withInterval(c.luminosity_distance)} Mpc`,
      });
      rows.push({
        label: t('gwE.row.snr'),
        value: t('gwE.value.snr', {
          snr: withInterval(c.network_matched_filter_snr),
        }),
      });
    } else {
      rows.push({ label: t('gwE.row.held'), value: t('gwE.value.held') });
    }

    if (v.model >= 0.5) {
      heading('gwE.head.model');
      if (v.catalog < 0.5) {
        rows.push({
          label: t('gwE.row.model'),
          value: t('gwE.value.modelHeld'),
        });
      } else {
        const mc = detectorFrameChirpMass(e);
        rows.push({
          label: t('gwE.row.model'),
          value: t('gwE.value.model', {
            mc: mc.toFixed(2),
            at: m.end === null ? t('gwE.anchor.catalog') : t('gwE.anchor.end'),
            f1: hz(frequencyAt(0.1, mc)),
            f2: hz(frequencyAt(0.05, mc)),
          }),
        });
        rows.push({
          label: t('gwE.row.inBand'),
          value: t('gwE.value.inBand', {
            s: timeToCoalescence(30, mc).toPrecision(2),
          }),
        });
      }
    }

    rows.push({ label: t('gwE.row.source'), value: data.CITATION });
    rows.push({ label: t('gwE.row.limits'), value: t('gwE.value.limits') });
    return rows;
  },
};

export const GW_EVENT_WIDGETS = [GW_EVENTS];
