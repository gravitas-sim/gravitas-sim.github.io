/* global document, window, TextEncoder, ReadableStream, setTimeout */
// =============================================================================
// The label golden, third family: what the lesson engine's figures and the
// Observatory print
// -----------------------------------------------------------------------------
// Roadmap III Prompt 144 moves number formatting onto js/format.js one consumer
// family at a time, and a label that was right must print the same afterwards.
// tests/labelGolden/record.mjs records the lesson data, tests/labelGolden/
// widgets.mjs (Prompt 144, second family) the instrument widgets. This records
// the third: js/investigations/*, js/lesson/* and the Observatory's printed
// labels (js/observatory/**, js/observatoryPage.js), in English and Spanish.
//
// What those files print, and how each is reached here:
//
//   ellipse      the readout `drawEllipse` paints on the eccentricity figure
//                ("e = 0.017", "b/a = 1.000"), at every position of the slider
//                (0 to 0.98 in steps of 0.001, js/fragments/lesson.html), and
//                at each lesson preset;
//   plots        `drawPlot`, the lesson's scatter figure: the table under it
//                (the point numbers to three decimals), its tick labels, its
//                axis titles, its "slope" label, over every lesson step that
//                has a plot, at the field values record.mjs deals out, plain,
//                transformed and on log axes;
//   fieldNumbers `formatFieldNumber`, the text a computed lesson field holds,
//                over a ladder that includes the signs and the not-a-number
//                case, to the decimals a field can ask for, in both locales;
//   aladin       `aladinLink`, the URL the archive panel opens (machine text);
//   rounded      the committed numbers of an answer key (`rounded`);
//   fixtures     the built-in light-curve observation's reduction notes;
//   archive      the archive panel's position label for a name Sesame
//                resolves, built from a stand-in fetch (the panel's own code,
//                the repository's Sesame fixture with its position changed).
//
// Calls the recording cannot reach are listed in coverage-investigations.json,
// by file, line and column, and the test fails if a call is added that nobody
// ran. Three of them stay unreachable on purpose and are named there: a timer
// label (a clock), a file size in the source panel (the page's own script) and
// two roundings that sit inside panel closures.
//
// Nothing here is random and nothing reads a clock. The figures read
// Math.log10 and Math.pow (the log axes and the tick step), whose last place
// can differ between Node 20 and Node 24. What is stored is rounded far above
// that noise (the table's three decimals), masked (maskNoise: a slope that
// should be zero) or not stored at all (the tick labels, whose step is a
// logarithm at a whole number and which are js/format.js's already); the test
// perturbs log10, pow, log, exp and atan2 by one unit in the last
// place on every sixteenth call to show the recording does not move
// (tests/labelGoldenInvestigations.test.js).
// =============================================================================

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import {
  LOCALES,
  distinct,
  num,
  outcome,
  syntheticContexts,
  valueVectors,
} from './record.mjs';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const load = rel => import(pathToFileURL(path.join(ROOT, rel)).href);

/** Where the sites to reach live. */
export const FAMILY_ROOTS = [
  'js/investigations',
  'js/lesson',
  'js/observatory',
  'js/observatoryPage.js',
];
const SITE_AT =
  /\/(js\/(?:investigations|lesson|observatory)\/[^\s():]+\.js|js\/observatoryPage\.js):(\d+):(\d+)\)?$/;

// --- The environment ------------------------------------------------------------

/** What a figure needs of a browser, where there is none (the command line). */
async function ensureBrowser() {
  const g = globalThis;
  // What a page has and Jest's jsdom does not: the archive panel hashes with
  // SubtleCrypto and reads a response as a stream.
  const { webcrypto } = await import('node:crypto');
  const { ReadableStream } = await import('node:stream/web');
  const { TextDecoder, TextEncoder } = await import('node:util');
  if (!g.crypto?.subtle)
    Object.defineProperty(g, 'crypto', {
      value: webcrypto,
      configurable: true,
    });
  g.TextEncoder ??= TextEncoder;
  g.TextDecoder ??= TextDecoder;
  g.ReadableStream ??= ReadableStream;
  if (g.window?.document?.documentElement && g.getComputedStyle) return;
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
  });
  for (const key of [
    'window',
    'document',
    'getComputedStyle',
    'Node',
    'Element',
    'HTMLElement',
    'CustomEvent',
    'Event',
    'DOMParser',
    'HTMLFormElement',
  ])
    Object.defineProperty(g, key, {
      value: dom.window[key],
      configurable: true,
      writable: true,
    });
}

/** A canvas whose 2-D context keeps the text it is asked to paint. */
function fakeCanvas(texts) {
  const set = {};
  const context = new Proxy(set, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'fillText' || key === 'strokeText')
        return text => {
          texts.push(String(text));
        };
      if (key === 'measureText')
        return text => ({ width: String(text).length * 6 });
      if (typeof key === 'symbol' || key === 'then') return undefined;
      return () => undefined;
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    },
  });
  return {
    clientWidth: 420,
    clientHeight: 300,
    width: 420,
    height: 300,
    style: {},
    getContext: () => context,
    setAttribute() {},
    getAttribute: () => null,
  };
}

/** The elements `drawPlot` writes its table into. */
const plotElements = () => ({
  plotTableWrap: { hidden: true },
  plotTable: { innerHTML: '' },
});

// --- Call sites -------------------------------------------------------------------

/** The lines of the family that call toFixed or toPrecision. */
export function familySites() {
  const out = [];
  const read = rel =>
    readFileSync(path.join(ROOT, rel), 'utf8')
      .split('\n')
      .forEach((line, i) => {
        const code = line.replace(/\/\/.*$/, '');
        // The column V8 reports for a call is its method name.
        for (const m of code.matchAll(/\.(to(?:Fixed|Precision))\s*\(/g))
          out.push(`${rel}:${i + 1}:${m.index + 2}`);
      });
  const walk = rel => {
    for (const entry of readdirSync(path.join(ROOT, rel), {
      withFileTypes: true,
    })) {
      const next = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(next);
      else if (entry.name.endsWith('.js')) read(next);
    }
  };
  for (const rel of FAMILY_ROOTS) {
    if (rel.endsWith('.js')) read(rel);
    else walk(rel);
  }
  return out.sort();
}

/**
 * Run `fn` while toFixed and toPrecision report which line called them, and
 * whether the call ever wrote a hyphen or was handed a number that is not
 * finite: the two things js/format.js's fixed() writes differently (a true
 * minus sign, and '' where toFixed writes "NaN" or "Infinity"). A site where
 * neither ever happened, on every input the recording gives it, can move to
 * fixed() and print the same.
 * @param {() => Promise<void>|void} fn
 * @returns {Promise<Map<string, {hyphen: boolean, nonFinite: boolean}>>}
 *   `path:line:column` of every caller seen
 */
export async function withSiteCoverage(fn) {
  const sites = new Map();
  const { toFixed, toPrecision } = Number.prototype;
  const watch = original =>
    function watched(...args) {
      const text = original.apply(this, args);
      const frame = new Error().stack.split('\n')[2] ?? '';
      const m = SITE_AT.exec(frame.trim());
      if (m) {
        const key = `${m[1]}:${m[2]}:${m[3]}`;
        const seen = sites.get(key) ?? { hyphen: false, nonFinite: false };
        if (text.startsWith('-')) seen.hyphen = true;
        if (!Number.isFinite(Number(this))) seen.nonFinite = true;
        sites.set(key, seen);
      }
      return text;
    };
  Number.prototype.toFixed = watch(toFixed);
  Number.prototype.toPrecision = watch(toPrecision);
  const limit = Error.stackTraceLimit;
  Error.stackTraceLimit = 3;
  try {
    await fn();
  } finally {
    Error.stackTraceLimit = limit;
    Number.prototype.toFixed = toFixed;
    Number.prototype.toPrecision = toPrecision;
  }
  return sites;
}

// --- Noise below a floor ----------------------------------------------------------

/**
 * The slope of a fitted line through points that lie on a level is zero, and
 * what the figure prints for it is the rounding error of the fit: "slope
 * 0.000" on one engine, "slope -0.000" on another whose Math.log10 differs in
 * the last place. A slope below `floor` in magnitude is recorded as a zero of
 * the same shape: the sign is dropped and the decimals kept. The same device as
 * maskNoise in tests/labelGolden/widgets.mjs (Prompt 144, second family), for
 * the one number here that is a computed residual.
 */
export const NOISE_FLOOR = 1e-9;
export function maskNoise(text, floor = NOISE_FLOOR) {
  return text.replace(/[-\u2212]?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi, token => {
    const value = Number(token.replace('\u2212', '-'));
    return Number.isFinite(value) && Math.abs(value) < floor
      ? token.replace(/^[-\u2212]/, '').replace(/\d/g, '0')
      : token;
  });
}

// --- Summaries --------------------------------------------------------------------

/**
 * What a reading looks like with its numbers' values taken out and their
 * decimals kept: "Point|#.###|#.###" and "e = #.###". The whole part of a
 * number collapses to one mark, so the shapes of a figure are few (the number
 * of decimals, a minus sign or a hyphen, an exponent, a comma) and a change in
 * any of them is a new shape that is always shown.
 */
export const shapeOf = text =>
  text.replace(/\d+(?:[.,](\d+))?/g, (m, f) =>
    f ? `#.${'#'.repeat(f.length)}` : '#'
  );

/**
 * A many-case output as a digest of every distinct reading, in order, with the
 * first two of each shape in the clear (see shapeOf), so a reviewer reads what
 * is printed and the digest moves when one digit anywhere does.
 */
export function summarize(list, keyOf = item => shapeOf(JSON.stringify(item))) {
  const all = distinct(list);
  const byShape = new Map();
  for (const item of all) {
    const shape = keyOf(item);
    const kept = byShape.get(shape) ?? [];
    if (kept.length < 2) {
      kept.push(item);
      byShape.set(shape, kept);
    }
  }
  return {
    calls: list.length,
    distinct: all.length,
    shapes: byShape.size,
    digest: createHash('sha256')
      .update(JSON.stringify(all))
      .digest('hex')
      .slice(0, 16),
    samples: [...byShape.values()].flat(),
  };
}

// --- The ellipse figure ------------------------------------------------------------

/** The slider's own positions, js/fragments/lesson.html: 0 to 0.98 by 0.001. */
const ECCENTRICITIES = Array.from({ length: 981 }, (_, k) => k / 1000);

function recordEllipse(stepView, presets) {
  const read = e => {
    const texts = [];
    const r = outcome(() => {
      stepView.drawEllipse(fakeCanvas(texts), e);
      return texts.filter(t => /[0-9]/.test(t));
    });
    return { e: String(e), read: r };
  };
  const all = ECCENTRICITIES.map(read);
  const rows = [...new Set([0, 0.017, 0.5, 0.98, ...presets])]
    .sort((a, b) => a - b)
    .map(read);
  return { positions: all.length, rows, all: summarize(all) };
}

// --- The scatter figure --------------------------------------------------------------

function recordPlot(stepView, step, vectors) {
  const spec = step.plot;
  const variants = {};
  const options = [
    ['plain', false, false],
    ['log', false, true],
  ];
  if (spec.transform) {
    options.push(['transformed', true, false], ['transformed+log', true, true]);
  }
  for (const [name, transformed, log] of options) {
    const list = [];
    for (const vals of vectors) {
      const texts = [];
      const els = plotElements();
      const canvas = fakeCanvas(texts);
      const r = outcome(() => {
        stepView.drawPlot(step, vals, { canvas, els, transformed, log });
        return null;
      });
      list.push({
        // The table's numbers (its headings are the lesson's own words and
        // are recorded with the lesson), the tick labels and the slope.
        table: [...els.plotTable.innerHTML.matchAll(/<td>([^<]*)<\/td>/g)].map(
          m => m[1]
        ),
        // Only the slope is kept of what is painted: the ticks are
        // tickLabel's, already on js/format.js, and their step is a
        // logarithm at a whole number, which differs between engines.
        slope: texts.filter(x => /^slope [\u2212-]?\d/.test(x)).map(maskNoise),
        ...(r ? { threw: r.threw } : {}),
      });
    }
    // Shape of a reading: which forms of number it holds, not how many.
    variants[name] = {
      ...summarize(list, item =>
        JSON.stringify(
          [...new Set([...item.table, ...item.slope].map(shapeOf))].sort()
        )
      ),
    };
  }
  return {
    variants,
  };
}

// --- A computed field ---------------------------------------------------------------

const FIELD_LADDER = [
  0,
  -0,
  1,
  -1,
  0.5,
  -0.5,
  0.0004,
  -0.0004,
  0.005,
  1.005,
  2.5,
  -2.5,
  12.3456,
  -12.3456,
  99.9996,
  1234.5678,
  -1234.5678,
  12345.6789,
  -12345.6789,
  123456.789,
  1e-7,
  -1e-7,
  1e21,
  -1e21,
  4.07,
  3.605,
  0.91,
  0.91049,
  Number.NaN,
  Infinity,
  -Infinity,
];

function recordFieldNumbers(stepView, locale) {
  const out = {};
  for (const decimals of [0, 1, 2, 3, 4])
    out[decimals] = FIELD_LADDER.map(x => [
      num(x),
      outcome(() => stepView.formatFieldNumber(x, decimals, locale)),
    ]);
  return out;
}

// --- The Observatory -----------------------------------------------------------------

const ALADIN = [
  [0, 0],
  [0, 90],
  [0, -90],
  [1e-6, 1e-7],
  [174.48586303, 67.32973892],
  [174.48586303, -67.32973892],
  [210.5, -0.00001],
  [359.99999, 0.5],
  [83.82208, -5.39111],
  [0.123456789, -89.987654321],
];

/** CROWDSAP and FLFRCSAP values: a TESS header holds both in (0, 1]. */
const CROWDING = [
  [1, 1],
  [0.9923, 0.8641],
  [0.995, 0.9949],
  [0.8641, 0.5],
  [0.5, 0.123],
  [0.1234, 0.0456],
  [0.99999, 0.00051],
];

const ROUNDED = [
  0,
  1,
  -1,
  0.1,
  0.123456789,
  1234.56789,
  1234567.891,
  -0.000123456789,
  6.0221409e23,
  1e-9,
  2.99792458e8,
  Number.NaN,
  Infinity,
];

/** Sesame's answer for a position, in the repository fixture's own words. */
function sesameAt(name, ra, dec) {
  return readFileSync(
    path.join(ROOT, 'tests/fixtures/archive/sesame-su-dra.xml'),
    'utf8'
  )
    .replace('<name>SU Dra</name>', `<name>${name}</name>`)
    .replace('174.48586303', String(ra))
    .replace('67.32973892', String(dec));
}

const TAP_CONE = `<?xml version="1.0"?><VOTABLE><RESOURCE><INFO name="QUERY_STATUS" value="OK"/><TABLE>
<FIELD name="Source" datatype="long"/><FIELD name="RA_ICRS" datatype="double"/><FIELD name="DE_ICRS" datatype="double"/><FIELD name="Gmag" datatype="double"/><FIELD name="VarFlag" datatype="char" arraysize="*"/>
<DATA><TABLEDATA><TR><TD>2</TD><TD>1</TD><TD>1</TD><TD>15.1</TD><TD>NOT_AVAILABLE</TD></TR></TABLEDATA></DATA></TABLE></RESOURCE></VOTABLE>`;

/** A fetch response as js/archive/net.js reads one. */
function reply(body, type, url) {
  const bytes = new TextEncoder().encode(body);
  const headers = new Map([
    ['content-type', type],
    ['content-length', String(bytes.length)],
  ]);
  return {
    status: 200,
    ok: true,
    url,
    redirected: false,
    headers: { get: k => headers.get(k.toLowerCase()) ?? null },
    body: new ReadableStream({
      start(c) {
        c.enqueue(bytes);
        c.close();
      },
    }),
  };
}

/** What the archive panel writes about a position, for each of several. */
async function recordArchive() {
  const panel = await load('js/observatory/archivePanel.js');
  const { memoryStore } = await load('js/archive/cache.js');
  const names = await load('js/observatory/i18n.js');
  const { SESAME, VIZIER_TAP } = await load('js/archive/cds.js');
  const out = [];
  for (const [name, ra, dec] of [
    ['SU Dra', 174.48586303, 67.32973892],
    ['Nowhere A', 0, 0],
    ['Nowhere B', 0.00001, -0.00001],
    ['Nowhere C', 359.999999, -89.999999],
    ['Nowhere D', 83.82208, -5.39111],
    ['Nowhere E', 12.3456789, 45],
  ]) {
    const root = document.createElement('details');
    root.append(document.createElement('summary'));
    document.body.append(root);
    const fetchImpl = async url =>
      String(url).startsWith(SESAME)
        ? reply(sesameAt(name, ra, dec), 'text/plain', String(url))
        : reply(
            TAP_CONE,
            'application/x-votable+xml',
            String(url).startsWith(VIZIER_TAP) ? String(url) : VIZIER_TAP
          );
    const mounted = panel.mountArchivePanel(root, {
      t: names.t,
      number: n => String(n),
      language: names.language,
      registerMessages: names.registerMessages,
      createPlot: () => ({ destroy() {}, update() {} }),
      open() {},
      status() {},
      store: memoryStore(),
      fetchImpl,
    });
    root.querySelector('#arcName').value = name;
    root
      .querySelector('#arcForm')
      .dispatchEvent(new window.Event('submit', { cancelable: true }));
    const read = () => root.querySelector('#arcPosition')?.textContent ?? null;
    for (let i = 0; i < 60 && read() === null; i++)
      await new Promise(r => setTimeout(r, 5));
    out.push({
      name,
      position: read(),
      aladin: root.querySelector('a[href*="aladin"]')?.getAttribute('href'),
    });
    mounted.destroy();
    root.remove();
  }
  return out;
}

// --- The whole family -------------------------------------------------------------------

/**
 * Record the family, both locales.
 * @param {{coverage?: boolean}} [options]
 * @returns {Promise<{surfaces: Record<string, object>, reached: string[],
 *   sites: string[]}>}
 */
export async function recordInvestigations({ coverage = true } = {}) {
  await ensureBrowser();
  const i18n = await load('js/i18n/index.js');
  const deferred = await load('js/i18n/deferredMessages.js');
  const reg = await load('js/data/investigations/registry.js');
  const { withDepth } = await load('js/investigations/depth.js');
  const stepView = await load('js/investigations/stepView.js');
  const core = await load('js/observatory/guides/core.js');
  const archive = await load('js/observatory/archivePanel.js');
  const fixtures = await load('js/observatory/fixtures.js');
  const names = await load('js/observatory/i18n.js');
  await names.loadLanguage('es');
  const profiles = await syntheticContexts();

  const watching = coverage
    ? withSiteCoverage
    : async fn => {
        await fn();
        return new Map();
      };

  const perLocale = {};
  const reached = await watching(async () => {
    for (const locale of LOCALES) {
      await i18n.setLocale(locale, { persist: false });
      await deferred.awaitDeferredMessages();
      names.setLanguage(locale);
      const here = {};
      // The ellipse step's presets, as the lesson declares them.
      await reg.setLessonLocale(locale);
      const presets = [];
      const plots = {};
      for (const id of [...reg.investigationIds()].sort()) {
        const lesson = await withDepth(
          await reg.loadInvestigation(id, locale),
          locale
        );
        for (const step of lesson.steps) {
          if (step.type === 'ellipse')
            for (const p of step.presets || []) presets.push(p.e);
          if (!step.plot) continue;
          const vectors = profiles.flatMap(ctx =>
            valueVectors(step, ctx.truthPool())
          );
          const unique = [
            ...new Map(vectors.map(v => [JSON.stringify(v), v])).values(),
          ];
          (plots[id] ??= {})[step.sid ?? step.title] = recordPlot(
            stepView,
            step,
            unique
          );
        }
      }
      here.ellipse = recordEllipse(stepView, presets);
      here.plots = plots;
      here.fieldNumbers = recordFieldNumbers(stepView, locale);
      here.aladin = ALADIN.map(([ra, dec]) => [
        `${ra} ${dec}`,
        archive.aladinLink({ ra, dec }),
      ]);
      here.rounded = ROUNDED.map(x => [
        num(x),
        outcome(() => core.rounded({ id: 'k', expected: x }).expected),
      ]);
      here.rounded.push([
        'text',
        outcome(() => core.rounded({ id: 'k', expected: 'a text' }).expected),
      ]);
      // The built-in pack has no crowding record; a catalogue pack made with
      // `crowding: true` does (tools/data-packs/tess-light-curve.mjs), so the
      // note is read for a pack that carries one at several CROWDSAP values.
      const tessPack = await load('js/data/observations/tessHd209458S56.js');
      const crowded = {};
      for (const [crowdsap, flfrcsap] of CROWDING)
        crowded[`${crowdsap}/${flfrcsap}`] = (
          await fixtures.lightCurveObservation(
            {
              ...tessPack,
              PACK: { ...tessPack.PACK, crowding: { crowdsap, flfrcsap } },
            },
            {}
          )
        ).reductions.filter(x => x.startsWith('crowding'));
      here.fixtures = {
        'tess-light-curve': (await fixtures.openFixture('tess-light-curve'))
          .reductions,
        crowded,
      };
      here.archive = await recordArchive();
      perLocale[locale] = here;
    }
    await i18n.setLocale('en', { persist: false });
    names.setLanguage('en');
    await reg.setLessonLocale('en');
  });

  // One file per surface, English first, Spanish only where it differs.
  const surfaces = {};
  for (const surface of Object.keys(perLocale.en)) {
    const en = perLocale.en[surface];
    const es = perLocale.es[surface];
    surfaces[surface] = {
      en,
      es: JSON.stringify(es) === JSON.stringify(en) ? 'same' : es,
    };
  }
  return {
    surfaces,
    reached: [...reached.keys()].sort(),
    hazards: Object.fromEntries(
      [...reached].sort(([a], [b]) => (a < b ? -1 : 1))
    ),
    sites: familySites(),
  };
}
