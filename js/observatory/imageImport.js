// =============================================================================
// A picture or a FITS frame from the reader's own device (Prompt 188)
// -----------------------------------------------------------------------------
// The Observatory's file box takes CSV and JSON as before and now also a FITS
// image, a PNG or a JPEG. This is that path, loaded when such a file is first
// chosen (most visitors never choose one):
//
//   size first        a file over the bound is refused with no byte of it read
//   structure         the format is the file's bytes, never its name; the header
//                     is checked on the page (js/dataKinds/fits.js, raster.js)
//                     and the bounds apply before any pixel exists
//   decode            on the Worker pool under the page's memory ledger
//                     (js/workers/pool.js): the file moves into a disposable
//                     realm and the plane moves back; cancelling terminates the
//                     realm, which is the whole of the release
//   describe          what the file claims, each with the card it came from, and
//                     the fields the reader may fill (time with its scale, pixel
//                     scale, orientation, and, for light, the pixel contract),
//                     each with what it does; the verdict on marks, photometry
//                     and astrometry is the contract's own (`permits`)
//   open              an `image` observation (js/observatory/schema.js), its
//                     sidecar a gravitas.image (js/dataKinds/contract.js)
//
// A PNG or a JPEG is display-only whatever it holds: marks, and nothing that
// needs light or the sky. A FITS frame is as quantitative as its header and the
// reader's statements make it, and the form says what is missing. Nothing
// leaves the device: no request is made with the file. A refusal is a sentence
// in the reader's language and, beside it, the reader's own English message.
//
// Not a table or a cube: a FITS file with more than two axes, or a table, is
// refused by name. IMAGE_IMPORT.md.
// =============================================================================

import { LIMITS } from '../dataKinds/limits.js';
import {
  CALIBRATION_STATES,
  FLUX_UNITS,
  IMAGE_FORMAT,
  FORMAT_VERSION as IMAGE_VERSION,
  permits,
  validateImage,
} from '../dataKinds/contract.js';
import { sniff, unknownFormat } from '../dataKinds/raster.js';
import { createPool, ledger as book } from '../workers/pool.js';
import { readFitsOnPool } from '../dataKinds/fitsJob.js';
import { readRasterOnPool } from '../dataKinds/rasterJob.js';
import { sha256Hex } from '../hash.js';
import { ID_OBSERVATION } from '../names.js';
import { roundSig } from '../format.js';

// ---- words --------------------------------------------------------------------

const WORDS = {
  en: () => import('../i18n/en.imageImport.js').then(m => m.EN_IMAGEIMPORT),
  es: () => import('../i18n/es.imageImport.js').then(m => m.ES_IMAGEIMPORT),
};
const have = new Set();
const words = async ctx => {
  const id = ctx.language();
  if (have.has(id) || !WORDS[id]) return;
  ctx.registerMessages({ [id]: await WORDS[id]() });
  have.add(id);
};

// ---- the pure part: what a file claims, what a reader states, what that makes ---

/** The units the form offers for light, and the header spellings of each. */
export const LIGHT_UNITS = Object.freeze([...FLUX_UNITS]);
const BUNIT = new Map(
  Object.entries({
    adu: 'adu',
    'adu/s': 'adu/s',
    electron: 'electron',
    electrons: 'electron',
    'e-': 'electron',
    'electron/s': 'electron/s',
    'electrons/s': 'electron/s',
    'e-/s': 'electron/s',
    count: 'count',
    counts: 'count',
    'count/s': 'count/s',
    'counts/s': 'count/s',
    'ct/s': 'count/s',
  })
);
/** The unit a header's BUNIT names, or null when it is not one the contract knows. */
export const unitOfBunit = text =>
  BUNIT.get(
    String(text ?? '')
      .trim()
      .toLowerCase()
  ) ?? null;

/** The column unit the workspace's registry has for each pixel unit (the sidecar names the rest). */
const COLUMN_UNIT = { count: 'count', 'electron/s': 'electron/s' };

/** Which sidecar field a gap in the contract names, and the id of its words. */
export const GAP_WORD = {
  'pixels.linearity': 'linearity',
  'pixels.saturation': 'saturation',
  noise: 'noise',
  'calibration.state': 'calibration',
  time: 'time',
  exposure: 'exposure',
};

const SCALES = ['UTC', 'TAI', 'TT', 'TDB', 'TCB', 'UT1', 'local'];
export const TIME_SCALE_CHOICES = SCALES;
const ISO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?)?Z?$/;

/** The fields the form starts with, from what the file claims. */
export function proposeFields(read) {
  const c = read.claims ?? {};
  const unit = unitOfBunit(c.unit?.value);
  const f = {
    pixelsAre: read.kind === 'fits' && unit ? 'light' : 'display',
    unit: unit ?? '',
    time: { value: '', scale: '', reference: 'start' },
    scale: '',
    orientation: { angle: '', east: 'left' },
    exposure: '',
    gain: '',
    readNoise: '',
    saturation: '',
    linearLimit: '',
    linearHow: '',
    calibration: '',
  };
  const from = {};
  const take = (name, claim, set) => {
    if (claim === undefined) return;
    set(claim.value);
    from[name] = claim.source;
  };
  take('exposure', c.exposureSeconds, v => (f.exposure = String(v)));
  take('gain', c.gain, v => (f.gain = String(v)));
  take('readNoise', c.readNoise, v => (f.readNoise = String(v)));
  take('saturation', c.saturation, v => (f.saturation = String(v)));
  if (typeof c.dateObs?.value === 'string' && ISO.test(c.dateObs.value)) {
    f.time.value = c.dateObs.value.replace(/Z$/, '');
    from.time = c.dateObs.source;
    const scale = String(c.timeScale?.value ?? '').toUpperCase();
    if (SCALES.includes(scale)) {
      f.time.scale = scale;
      from.timeScale = c.timeScale.source;
    }
  }
  return { fields: f, from };
}

const num = v => (v === '' || v === null ? null : Number(v));

/**
 * What is wrong with the fields, each with the field it belongs to, before a
 * sidecar is built. An empty field is not wrong; it is not stated.
 * @returns {Array<{field: string, code: string}>}
 */
export function fieldProblems(f) {
  const out = [];
  const bad = (field, code) => out.push({ field, code });
  const t = f.time;
  if (t.value !== '' || t.scale !== '') {
    if (t.value === '') bad('time', 'timeValue');
    else if (
      !ISO.test(t.value) ||
      Number.isNaN(Date.parse(`${t.value.replace(/Z$/, '')}Z`))
    )
      bad('time', 'timeFormat');
    else if (t.scale === '') bad('timeScale', 'timeScale');
    else if (!SCALES.includes(t.scale)) bad('timeScale', 'timeScale');
  }
  const positive = (field, v, max = Infinity) => {
    if (v === '') return;
    const n = Number(v);
    if (!(Number.isFinite(n) && n > 0 && n <= max)) bad(field, `${field}Range`);
  };
  positive('scale', f.scale, 3600);
  if (f.orientation.angle !== '') {
    const a = Number(f.orientation.angle);
    if (!(Number.isFinite(a) && a >= 0 && a < 360))
      bad('orientation', 'orientationRange');
  }
  if (f.pixelsAre === 'light') {
    positive('exposure', f.exposure);
    positive('gain', f.gain);
    positive('saturation', f.saturation);
    positive('linearLimit', f.linearLimit);
    if (f.readNoise !== '') {
      const n = Number(f.readNoise);
      if (!(Number.isFinite(n) && n >= 0)) bad('readNoise', 'readNoiseRange');
    }
    if (f.linearLimit !== '' && f.linearHow.trim() === '')
      bad('linearHow', 'linearHow');
  }
  return out;
}

/** Which header card a field's value came from, for the sidecar's own `source` words. */
const sourceOf = (from, name) =>
  from?.[name] ?? 'stated by the reader on import';

/**
 * The gravitas.image sidecar for what was read and what the reader stated.
 * @param {{kind: string, width: number, height: number, wcs?: object, nanPixels?: number}} read
 * @param {object} f - fields (proposeFields)
 * @param {{id: string, from?: object, title?: string}} o
 */
export function buildSidecar(read, f, { id, from = {}, title }) {
  const light = read.kind === 'fits' && f.pixelsAre === 'light';
  const pixels = {
    unit:
      light && f.unit ? f.unit : read.kind === 'fits' ? 'unknown' : 'display',
  };
  const doc = {
    format: IMAGE_FORMAT,
    formatVersion: IMAGE_VERSION,
    id,
    ...(title ? { title } : {}),
    use: light ? 'quantitative' : 'display-only',
    width: read.width,
    height: read.height,
    pixels,
    planes: { data: { encoding: 'float64-le' } },
    history: [
      read.kind === 'fits'
        ? {
            step: 'decode',
            tool: 'Gravitas FITS reader',
            version: '157',
            lossy: false,
          }
        : {
            step: 'decode',
            tool: 'the browser image decoder',
            version: 'createImageBitmap',
            // 8-bit gray levels from a JPEG (lossy) or a 16-bit PNG (reduced).
            lossy: read.kind === 'jpeg' || read.depth === 16,
          },
      ...(read.rotated
        ? [
            {
              step: 'rotate',
              tool: 'the browser image decoder (the file’s orientation tag)',
              version: 'createImageBitmap',
              lossy: false,
              wcsUpdated: true,
            },
          ]
        : []),
    ],
    source: { kind: read.kind === 'fits' ? 'fits' : 'upload' },
  };
  if (light) {
    const lim = num(f.linearLimit);
    if (lim !== null)
      pixels.linearity = {
        status: 'linear',
        limit: lim,
        source: f.linearHow.trim() || 'stated by the reader',
      };
    const sat = num(f.saturation);
    if (sat !== null)
      pixels.saturation = { level: sat, source: sourceOf(from, 'saturation') };
    const term = (name, unit, v) => ({
      value: v,
      unit,
      source: from[name] ? 'header' : 'assumed',
      ...(from[name] ? {} : { note: 'typed by the reader on import' }),
    });
    const gain = num(f.gain);
    if (gain !== null) pixels.gain = term('gain', 'electron/adu', gain);
    const rn = num(f.readNoise);
    if (rn !== null) pixels.readNoise = term('readNoise', 'electron', rn);
    const exp = num(f.exposure);
    if (exp !== null) doc.exposure = { seconds: exp, kind: 'nominal' };
    if (CALIBRATION_STATES.includes(f.calibration))
      doc.calibration = { state: f.calibration };
  }
  if (f.time.value !== '' && f.time.scale !== '')
    doc.time = {
      value: f.time.value,
      scale: f.time.scale,
      format: 'iso',
      reference: f.time.reference,
    };
  const s = num(f.scale);
  if (s !== null) doc.scale = { arcsecPerPixel: s };
  if (read.wcs) doc.wcs = read.wcs;
  return doc;
}

/**
 * What the contract says of the sidecar for each use.
 * @returns {{valid: boolean, problems: object[], marking: object, photometry: object, astrometry: object}}
 */
export function verdictOf(sidecar) {
  const v = validateImage(sidecar);
  if (!v.ok) {
    const no = { ok: false, code: 'invalid', message: v.problems[0].message };
    return {
      valid: false,
      problems: v.problems,
      marking: no,
      photometry: no,
      astrometry: no,
    };
  }
  return {
    valid: true,
    problems: [],
    marking: permits(sidecar, 'marking'),
    photometry: permits(sidecar, 'photometry'),
    astrometry: permits(sidecar, 'astrometry'),
  };
}

/** Pixel coordinates 1 to n, as the observation's two position columns. */
function axisColumns(width, height) {
  const x = new Uint16Array(width * height);
  const y = new Uint16Array(width * height);
  for (let j = 0, k = 0; j < height; j++)
    for (let i = 0; i < width; i++, k++) {
      x[k] = i + 1;
      y[k] = j + 1;
    }
  return { x, y };
}

/**
 * The observation a read becomes. FITS orientation: row 1 is the bottom of
 * the picture, and a PNG or JPEG is turned over to that order on the way in.
 * @param {{kind: string, width: number, height: number, values: Float64Array, wcs?: object}} read
 * @param {object} sidecar
 * @param {{name: string, bytes: number, digest: string, fields: object, from: object, read: object}} o
 */
export function buildObservation(
  read,
  sidecar,
  { name, bytes, digest, fields, from }
) {
  const { x, y } = axisColumns(read.width, read.height);
  const fits = read.kind === 'fits';
  const light = sidecar.use === 'quantitative';
  const stem = name.replace(/\.[^.]+$/, '') || 'image';
  const stated = ['time', 'scale', 'orientation']
    .filter(k =>
      k === 'time'
        ? fields.time.value !== ''
        : k === 'orientation'
          ? fields.orientation.angle !== ''
          : fields.scale !== ''
    )
    .map(String);
  return {
    format: ID_OBSERVATION,
    formatVersion: 1,
    kind: 'image',
    id: `import:image-${digest.slice(0, 12)}`,
    title: stem.slice(0, 120),
    object: null,
    facility: null,
    origin: 'imported',
    source: {
      kind: 'import',
      id: name,
      version: null,
      file: { name, bytes, digest },
    },
    credit: null,
    license: null,
    retrieved: null,
    citations: [],
    reductions: fits
      ? [
          'The pixels are as the file holds them, with BSCALE and BZERO applied; a blank (NaN or BLANK) is a missing value.',
          ...(read.hdu
            ? [`The image is in unit ${read.hdu} of the file.`]
            : []),
        ]
      : [
          'Display levels from 0 to 255: the gray of the decoder’s red, green and blue (weights 0.299, 0.587, 0.114), transparency drawn over white, the rows turned over so that row 1 is the bottom.',
          ...(read.rotated
            ? [
                'The decoder turned the picture as the file’s orientation tag says.',
              ]
            : []),
        ],
    columns: [
      { id: 'x', name: 'column', unit: 'pix', role: 'x', values: x },
      { id: 'y', name: 'row', unit: 'pix', role: 'x', values: y },
      {
        id: 'v',
        name: light ? 'pixel value' : 'display level',
        unit: light ? (COLUMN_UNIT[sidecar.pixels.unit] ?? null) : '',
        role: 'value',
        values: read.values,
      },
    ],
    axes: { x: 'x', y: 'y' },
    image: {
      width: read.width,
      height: read.height,
      ...(read.wcs ? { wcs: read.wcs } : {}),
      x: 'x',
      y: 'y',
      value: 'v',
      sidecar,
      ...(sidecar.time ? { time: sidecar.time } : {}),
      import: {
        kind: read.kind,
        orientation:
          fields.orientation.angle === ''
            ? null
            : {
                angle: Number(fields.orientation.angle),
                east: fields.orientation.east,
              },
        statedByReader: stated,
        fromHeader: from,
      },
    },
    masks: [],
    annotations: [],
  };
}

// ---- the pool: the page's ledger, one pool, for the page's life -----------------

let pool = null;
const poolFor = ctx =>
  (pool ??= createPool({
    book,
    concurrency: 1,
    // The page's ledger, so the cap holds across every Worker it has; this
    // pool's realms may hold the decoded images of one page and one file.
    memoryBytes: LIMITS.maxDecodedBytes + LIMITS.maxFileBytes,
    spawn:
      ctx.spawn ??
      (() =>
        new Worker(new URL('../js/dataKinds/fitsWorker.js', document.baseURI), {
          type: 'module',
        })),
  }));

/** What the page's import holds in Workers now (the memory probe and the specs read it). */
export const ledgerSnapshot = () => book.snapshot();

// ---- saving: what the workspace file can hold ----------------------------------

/** The rows a saved workspace reads back: the table import's own limit (js/observatory/import.js LIMITS.rows; a test holds the two equal). */
export const SAVE_ROWS = 200000;

/**
 * An image of more pixels than a saved workspace reads back cannot be saved as
 * one (it writes every pixel as text): the two save buttons are off, with the
 * reason beside them, until anything else is opened.
 */
const saves = { big: false, own: false, n: 0, ctx: null };
function renderSaves() {
  const note = document.getElementById('obsImageSaveNote');
  for (const id of ['obsExportJson', 'obsExportCsv'])
    document.getElementById(id).disabled = saves.big;
  note.hidden = !saves.big;
  note.textContent = saves.big
    ? saves.ctx.t('obs.imp.noSave', {
        n: saves.ctx.number(saves.n),
        max: saves.ctx.number(SAVE_ROWS),
      })
    : '';
}
function guardSaves(o, ctx) {
  saves.big = o.columns[0].values.length > SAVE_ROWS;
  saves.n = o.columns[0].values.length;
  saves.ctx = ctx;
  saves.own = true;
  renderSaves();
}
let savesWatch = null;
function watchSaves() {
  if (savesWatch) return;
  // The page counts every opening in <html data-opens>: one that is not ours
  // gives the buttons back.
  savesWatch = new MutationObserver(() => {
    if (saves.own) saves.own = false;
    else if (saves.big) {
      saves.big = false;
      renderSaves();
    }
  });
  savesWatch.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-opens'],
  });
}

// ---- the panel ------------------------------------------------------------------

const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
};

/** The refusal codes the panel has a sentence for (tools/image-import-cases.mjs REFUSAL_CODES; a test holds the two equal). */
export const CODES = Object.freeze([
  'not-fits',
  'truncated',
  'header-too-large',
  'card-malformed',
  'duplicate-card',
  'missing-card',
  'dimension-overflow',
  'nonfinite-header',
  'axis-invalid',
  'hdu-unsupported',
  'bitpix-unsupported',
  'compressed',
  'axes-unsupported',
  'too-large',
  'file-too-large',
  'too-many-hdus',
  'no-image',
  'scale-invalid',
  'blank-invalid',
  'nonfinite-pixel',
  'canceled',
  'wcs-projection',
  'wcs-distortion',
  'wcs-incomplete',
  'wcs-ambiguous',
  'empty-file',
  'unknown-format',
  'png-malformed',
  'jpeg-malformed',
  'raster-unsupported',
  'undecodable',
  'dimension-mismatch',
  'no-decoder',
  'unreadable',
  'timeout',
  'resourceLimit',
  'workerFailed',
]);
/** The contract's refusal codes, each with a sentence of its own for a use. */
export const WHY = Object.freeze([
  'display-only',
  'not-flux',
  'incomplete-contract',
  'no-wcs',
  'wcs-unsupported',
  'lossy-history',
  'geometry-unrecorded',
  'invalid',
]);

let panel = null;

/**
 * Begin importing one image file. The first call builds the panel and wires its
 * one language watcher; every call starts a new read, ending any in flight.
 * @param {File} file
 * @param {{t: Function, registerMessages: Function, language: Function,
 *   number: Function, pixelScale: Function, root: HTMLElement,
 *   open: (o: object) => void, status: (m: string) => void, reset: () => void,
 *   spawn?: Function}} ctx
 */
export async function importImage(file, ctx) {
  await words(ctx);
  const page = {
    ...ctx,
    root: document.getElementById('obsImageImport'),
    reset: () => {
      document.getElementById('obsFile').value = '';
    },
  };
  panel ??= createPanel(page);
  document.getElementById('obsImport').hidden = true;
  panel.begin(file, page);
}

function createPanel(first) {
  const root = first.root;
  const run = { abort: null, token: 0 };
  const s = {
    phase: 'idle',
    file: null,
    ctx: first,
    progress: 0,
    read: null,
    geometry: null,
    digest: '',
    bytes: 0,
    fields: null,
    from: {},
    refusal: null,
    problems: [],
    focus: null,
  };
  const t = (id, p) => s.ctx.t(id, p);
  let heading = null;

  function render() {
    root.hidden = s.phase === 'idle';
    root.setAttribute('aria-busy', String(s.phase === 'reading'));
    if (s.phase === 'idle') {
      root.replaceChildren();
      return;
    }
    heading = el('h2', {
      id: 'obsImpTitle',
      tabIndex: -1,
      textContent: t('obs.imp.title'),
    });
    root.setAttribute('aria-labelledby', 'obsImpTitle');
    const kids = [
      heading,
      el('p', { className: 'ui-hint', textContent: t('obs.imp.local') }),
    ];
    if (s.phase === 'reading') kids.push(reading());
    if (s.phase === 'refused') kids.push(refusal());
    if (s.phase === 'canceled')
      kids.push(
        el('p', { role: 'status', textContent: t('obs.imp.canceled') }),
        done()
      );
    if (s.phase === 'ready') kids.push(...form());
    root.replaceChildren(...kids);
    if (s.focus) {
      root.querySelector(`#${s.focus}`)?.focus();
      s.focus = null;
    }
  }

  const done = () =>
    el(
      'div',
      { className: 'ui-toolbar' },
      el('button', {
        type: 'button',
        className: 'ui-button',
        textContent: t('obs.imp.close'),
        onclick: close,
      })
    );

  function close() {
    cancel(false);
    s.phase = 'idle';
    s.read = null;
    s.fields = null;
    s.ctx.reset();
    render();
  }

  function reading() {
    const p = el('progress', {
      max: 1,
      value: s.progress,
      id: 'obsImpProgress',
    });
    p.setAttribute(
      'aria-label',
      t('obs.imp.reading', { name: s.file?.name ?? '' })
    );
    return el(
      'div',
      { role: 'status' },
      el('p', {
        textContent: t('obs.imp.reading', { name: s.file?.name ?? '' }),
      }),
      p,
      el(
        'div',
        { className: 'ui-toolbar' },
        el('button', {
          type: 'button',
          id: 'obsImpCancel',
          className: 'ui-button',
          textContent: t('obs.imp.cancel'),
          onclick: () => cancel(true),
        })
      )
    );
  }

  function cancel(show) {
    run.token++;
    run.abort?.abort();
    run.abort = null;
    if (show && s.phase === 'reading') {
      s.phase = 'canceled';
      s.focus = 'obsImpTitle';
      s.ctx.reset();
      render();
      heading?.focus();
    }
  }

  function refusal() {
    const r = s.refusal;
    const sentence = t(
      `obs.imp.no.${CODES.includes(r.code) ? r.code : 'other'}`
    );
    const box = el(
      'div',
      { className: 'ui-alert is-error', role: 'alert' },
      el('p', { textContent: sentence }),
      el(
        'p',
        { className: 'ui-hint' },
        el('span', { textContent: `${t('obs.imp.readerSays')} ` }),
        el('span', { lang: 'en', textContent: r.message })
      )
    );
    box.dataset.code = r.code;
    return el('div', {}, box, done());
  }

  /** The file's facts, claims and the form. */
  function form() {
    const r = s.read;
    const g = s.geometry;
    const kind = t(`obs.imp.kind.${r.kind}`);
    const facts = el('dl', { className: 'ui-meta' });
    const fact = (k, v) =>
      facts.append(el('dt', { textContent: k }), el('dd', { textContent: v }));
    fact(t('obs.imp.fact.file'), s.file.name);
    fact(t('obs.imp.fact.kind'), kind);
    fact(
      t('obs.imp.fact.size'),
      t('obs.imp.fact.sizeValue', { w: r.width, h: r.height, bytes: s.bytes })
    );
    fact(
      t('obs.imp.fact.use'),
      t(
        r.kind === 'fits' && s.fields.pixelsAre === 'light'
          ? 'obs.imp.quantitative'
          : 'obs.imp.useDisplay'
      )
    );
    fact(t('obs.imp.fact.digest'), s.digest.slice(0, 16));
    if (r.kind === 'fits') {
      fact(t('obs.imp.fact.bitpix'), String(g.bitpix));
      if (r.hdu) fact(t('obs.imp.fact.hdu'), String(r.hdu));
      if (r.nanPixels) fact(t('obs.imp.fact.blank'), String(r.nanPixels));
      if (r.wcs) {
        const [a, b] = s.ctx.pixelScale(r.wcs);
        fact(
          t('obs.imp.fact.wcs'),
          t('obs.imp.fact.wcsValue', {
            scale: s.ctx.number(roundSig((a + b) / 2, 4)),
          })
        );
      } else fact(t('obs.imp.fact.wcs'), t('obs.imp.fact.noWcs'));
    }
    const out = [facts];
    if (r.kind !== 'fits')
      out.push(
        el('p', { id: 'obsImpWhy', textContent: t('obs.imp.displayOnly') })
      );
    const claims = claimRows();
    if (claims) out.push(claims);
    out.push(fieldset());
    out.push(verdict());
    out.push(
      el(
        'div',
        { className: 'ui-toolbar' },
        el('button', {
          type: 'button',
          id: 'obsImpOpen',
          className: 'ui-button',
          textContent: t('obs.imp.open'),
          onclick: openIt,
        }),
        el('button', {
          type: 'button',
          id: 'obsImpClose',
          className: 'ui-button',
          textContent: t('obs.imp.close'),
          onclick: close,
        })
      )
    );
    return out;
  }

  function claimRows() {
    const c = s.read.claims;
    if (!c) return null;
    const names = [
      'unit',
      'exposureSeconds',
      'dateObs',
      'mjdObs',
      'timeScale',
      'gain',
      'readNoise',
      'saturation',
      'object',
    ];
    const rows = names.filter(n => c[n] !== undefined);
    const d = el(
      'div',
      { id: 'obsImpClaims' },
      el('p', { textContent: t('obs.imp.claims') })
    );
    if (!rows.length) {
      d.append(
        el('p', { className: 'ui-hint', textContent: t('obs.imp.claimsNone') })
      );
      return d;
    }
    const ul = el('ul');
    for (const n of rows) {
      const li = el('li');
      li.append(
        el('span', {
          textContent: `${t(`obs.imp.claim.${n}`)}: ${c[n].value}`,
        }),
        el('span', {
          className: 'ui-hint',
          textContent: ` (${t('obs.imp.fromCard', { card: c[n].source.replace(/^header /, '') })})`,
        })
      );
      ul.append(li);
    }
    d.append(ul);
    return d;
  }

  const fieldIds = {
    time: 'obsImpTime',
    timeScale: 'obsImpTimeScale',
    scale: 'obsImpScale',
    orientation: 'obsImpOrientation',
    exposure: 'obsImpExposure',
    gain: 'obsImpGain',
    readNoise: 'obsImpReadNoise',
    saturation: 'obsImpSaturation',
    linearLimit: 'obsImpLinear',
    linearHow: 'obsImpLinearHow',
  };

  function input(id, label, value, onchange, props = {}) {
    const i = el('input', { id, className: 'ui-input', value, ...props });
    i.addEventListener('change', () => onchange(i.value));
    return el(
      'label',
      { className: 'ui-field' },
      el('span', { textContent: label }),
      i
    );
  }
  const numberInput = (id, label, value, set, props = {}) =>
    input(
      id,
      label,
      value,
      v => {
        set(v);
        update();
      },
      { type: 'number', step: 'any', ...props }
    );
  function select(id, label, value, choices, onchange) {
    const sel = el('select', { id, className: 'ui-select' });
    for (const [v, text] of choices)
      sel.append(el('option', { value: v, textContent: text }));
    sel.value = value;
    sel.addEventListener('change', () => onchange(sel.value));
    return el(
      'label',
      { className: 'ui-field' },
      el('span', { textContent: label }),
      sel
    );
  }
  const effect = (id, text) =>
    el('p', { className: 'ui-hint', id, textContent: text });
  function fieldset() {
    const f = s.fields;
    const fs = el(
      'fieldset',
      { className: 'ui-fieldset', id: 'obsImpFields' },
      el('legend', { textContent: t('obs.imp.fields') })
    );
    const grid = el('div', { className: 'ui-grid is-end' });
    grid.append(
      input(
        fieldIds.time,
        t('obs.imp.field.time'),
        f.time.value,
        v => {
          f.time.value = v.trim();
          update();
        },
        {
          type: 'text',
          placeholder: '2026-03-14T02:15:30',
          autocomplete: 'off',
          spellcheck: false,
        }
      ),
      select(
        fieldIds.timeScale,
        t('obs.imp.field.timeScale'),
        f.time.scale,
        [['', t('obs.imp.notStated')], ...SCALES.map(x => [x, x])],
        v => {
          f.time.scale = v;
          update();
        }
      ),
      select(
        'obsImpTimeRef',
        t('obs.imp.field.timeRef'),
        f.time.reference,
        ['start', 'mid', 'end'].map(x => [x, t(`obs.imp.ref.${x}`)]),
        v => {
          f.time.reference = v;
          update();
        }
      )
    );
    fs.append(grid, effect('obsImpTimeEffect', t('obs.imp.effect.time')));
    const g2 = el('div', { className: 'ui-grid is-end' });
    g2.append(
      numberInput(
        fieldIds.scale,
        t('obs.imp.field.scale'),
        f.scale,
        v => (f.scale = v),
        { min: 0, max: 3600 }
      ),
      numberInput(
        fieldIds.orientation,
        t('obs.imp.field.orientation'),
        f.orientation.angle,
        v => (f.orientation.angle = v),
        { min: 0, max: 359.9999 }
      ),
      select(
        'obsImpEast',
        t('obs.imp.field.east'),
        f.orientation.east,
        [
          ['left', t('obs.imp.east.left')],
          ['right', t('obs.imp.east.right')],
        ],
        v => {
          f.orientation.east = v;
          update();
        }
      )
    );
    fs.append(
      g2,
      effect('obsImpScaleEffect', t('obs.imp.effect.scale')),
      effect('obsImpOrientationEffect', t('obs.imp.effect.orientation'))
    );
    if (s.read.kind === 'fits') {
      fs.append(
        select(
          'obsImpPixelsAre',
          t('obs.imp.field.pixelsAre'),
          f.pixelsAre,
          [
            ['light', t('obs.imp.pixelsAre.light')],
            ['display', t('obs.imp.pixelsAre.display')],
          ],
          v => {
            f.pixelsAre = v;
            s.focus = 'obsImpPixelsAre';
            render();
          }
        ),
        effect('obsImpPixelsEffect', t('obs.imp.effect.pixelsAre'))
      );
      if (f.pixelsAre === 'light') {
        const g3 = el('div', { className: 'ui-grid is-end' });
        g3.append(
          select(
            'obsImpUnit',
            t('obs.imp.field.unit'),
            f.unit,
            [['', t('obs.imp.notStated')], ...LIGHT_UNITS.map(x => [x, x])],
            v => {
              f.unit = v;
              update();
            }
          ),
          select(
            'obsImpCalibration',
            t('obs.imp.field.calibration'),
            f.calibration,
            [
              ['', t('obs.imp.notStated')],
              ...CALIBRATION_STATES.map(x => [x, t(`obs.imp.cal.${x}`)]),
            ],
            v => {
              f.calibration = v;
              update();
            }
          ),
          numberInput(
            fieldIds.exposure,
            t('obs.imp.field.exposure'),
            f.exposure,
            v => (f.exposure = v),
            { min: 0 }
          ),
          numberInput(
            fieldIds.saturation,
            t('obs.imp.field.saturation'),
            f.saturation,
            v => (f.saturation = v),
            { min: 0 }
          ),
          numberInput(
            fieldIds.gain,
            t('obs.imp.field.gain'),
            f.gain,
            v => (f.gain = v),
            { min: 0 }
          ),
          numberInput(
            fieldIds.readNoise,
            t('obs.imp.field.readNoise'),
            f.readNoise,
            v => (f.readNoise = v),
            { min: 0 }
          ),
          numberInput(
            fieldIds.linearLimit,
            t('obs.imp.field.linearLimit'),
            f.linearLimit,
            v => (f.linearLimit = v),
            { min: 0 }
          ),
          input(
            fieldIds.linearHow,
            t('obs.imp.field.linearHow'),
            f.linearHow,
            v => {
              f.linearHow = v;
              update();
            },
            { type: 'text', autocomplete: 'off' }
          )
        );
        fs.append(
          g3,
          effect('obsImpContractEffect', t('obs.imp.effect.contract'))
        );
      }
    }
    return fs;
  }

  /** The live verdict, rebuilt without rebuilding the form (focus stays where it is). */
  function verdict() {
    const box = el('div', { id: 'obsImpVerdict', role: 'status' });
    fillVerdict(box);
    return box;
  }
  function sidecarNow() {
    return buildSidecar(s.read, s.fields, {
      id: `import:image-${s.digest.slice(0, 12)}`,
      from: s.from,
    });
  }
  function fillVerdict(box) {
    const problems = fieldProblems(s.fields);
    const kids = [el('p', { textContent: t('obs.imp.verdict') })];
    if (problems.length) {
      const ul = el('ul', {
        className: 'ui-alert is-error',
        id: 'obsImpProblems',
      });
      for (const p of problems)
        ul.append(el('li', { textContent: t(`obs.imp.problem.${p.code}`) }));
      kids.push(ul);
    }
    const v = verdictOf(sidecarNow());
    const line = (use, ok) => {
      const li = el('li', {
        textContent: `${t(`obs.imp.use.${use}`)}: ${ok.ok ? t('obs.imp.allowed') : t('obs.imp.refused')}`,
      });
      if (!ok.ok)
        li.append(
          el('span', {
            className: 'ui-hint',
            textContent: ` ${refusedWhy(ok)}`,
          })
        );
      li.dataset.use = use;
      li.dataset.ok = String(ok.ok);
      return li;
    };
    const ul = el(
      'ul',
      { id: 'obsImpUses' },
      line('marking', v.marking),
      line('photometry', v.photometry),
      line('astrometry', v.astrometry)
    );
    kids.push(ul);
    if (!v.photometry.ok && v.photometry.code === 'incomplete-contract')
      kids.push(
        el('p', {
          className: 'ui-hint',
          id: 'obsImpMissing',
          textContent: t('obs.imp.missing', {
            list: v.photometry.missing
              .map(m => t(`obs.imp.gap.${GAP_WORD[m] ?? m}`))
              .join('; '),
          }),
        })
      );
    if (!v.photometry.ok && v.photometry.code === 'display-only')
      kids.push(
        el('p', {
          className: 'ui-hint',
          id: 'obsImpNeeds',
          textContent: t('obs.imp.needs'),
        })
      );
    box.replaceChildren(...kids);
  }
  const refusedWhy = ok =>
    WHY.includes(ok.code) ? t(`obs.imp.why.${ok.code}`) : '';
  function update() {
    const box = root.querySelector('#obsImpVerdict');
    if (box) fillVerdict(box);
  }

  async function openIt() {
    const problems = fieldProblems(s.fields);
    if (problems.length) {
      update();
      root.querySelector(`#${fieldIds[problems[0].field]}`)?.focus();
      return;
    }
    const sidecar = sidecarNow();
    const check = validateImage(sidecar);
    if (!check.ok) {
      update();
      return;
    }
    const o = buildObservation(s.read, sidecar, {
      name: s.file.name,
      bytes: s.bytes,
      digest: s.digest,
      fields: s.fields,
      from: s.from,
    });
    s.ctx.reset();
    const take = s.read;
    s.phase = 'idle';
    s.read = null;
    s.fields = null;
    render();
    watchSaves();
    guardSaves(o, s.ctx);
    s.ctx.open(o);
    s.ctx.status(
      s.ctx.t('obs.imp.opened', {
        name: s.file.name,
        w: take.width,
        h: take.height,
      })
    );
  }

  async function begin(file, ctx) {
    cancel(false);
    s.ctx = ctx;
    s.file = file;
    s.read = null;
    s.fields = null;
    s.refusal = null;
    s.progress = 0;
    const token = ++run.token;
    const ctl = new AbortController();
    run.abort = ctl;
    s.phase = 'reading';
    render();
    heading?.focus();
    const live = () => run.token === token && !ctl.signal.aborted;
    const refuse = (code, message) => {
      if (!live()) return;
      s.phase = 'refused';
      s.refusal = { code, message };
      s.ctx.reset();
      render();
      heading?.focus();
    };
    // 1. Size, before a byte is read.
    if (file.size === 0)
      return refuse('empty-file', 'the file is empty: it holds no bytes');
    if (file.size > LIMITS.maxFileBytes)
      return refuse(
        'file-too-large',
        `the file is ${file.size} bytes; the most a frame and its headers can take is ${LIMITS.maxFileBytes}`
      );
    let bytes;
    try {
      bytes = await file.arrayBuffer();
    } catch {
      return refuse('unreadable', 'the browser could not read that file');
    }
    if (!live()) return;
    // 2. The format is in the bytes.
    const view = new Uint8Array(bytes);
    const kind = sniff(view);
    if (!kind) {
      const e = unknownFormat(view);
      return refuse(e.code, e.message);
    }
    s.bytes = view.length;
    // Taken before the buffer moves into the realm.
    s.digest = await sha256Hex(view);
    if (!live()) return;
    // 3. The header on the page, then the decode in a realm.
    const onProgress = f => {
      if (!live()) return;
      s.progress = f;
      const p = root.querySelector('#obsImpProgress');
      if (p) p.value = f;
    };
    let out;
    try {
      const pool = poolFor(ctx);
      out = await (kind === 'fits' ? readFitsOnPool : readRasterOnPool)(
        pool,
        bytes,
        {
          signal: ctl.signal,
          channel: 'image-import',
          onProgress,
        }
      );
    } catch (e) {
      out = {
        ok: false,
        code: 'workerFailed',
        message: String(e?.message || e),
      };
    }
    if (!live()) return;
    if (!out.ok) {
      if (out.code === 'canceled') return;
      return refuse(out.code, out.message);
    }
    const im = out.image;
    s.read = { ...im, kind };
    s.geometry = out.geometry;
    const { fields, from } = proposeFields(s.read);
    s.fields = fields;
    s.from = from;
    s.phase = 'ready';
    s.focus = 'obsImpTitle';
    render();
    heading?.focus();
    s.ctx.status(t('obs.imp.ready', { name: file.name }));
  }

  // A language chosen on the page changes the words here (the page sets <html lang>).
  const watch = new MutationObserver(async () => {
    await words(s.ctx);
    render();
    if (saves.big) renderSaves();
  });
  watch.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
  });

  return { begin, state: s };
}
