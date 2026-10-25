// =============================================================================
// The label golden, second family: what an instrument widget prints
// -----------------------------------------------------------------------------
// Roadmap III Prompt 144 moves number formatting onto js/format.js one consumer
// family at a time, and a label that was right must print the same afterwards.
// tests/labelGolden/record.mjs records the first family, the lesson data. This
// records the second: the instrument widgets, every `js/*Widgets.js` module
// (the families js/widgets.js fetches on demand), in English and Spanish.
//
// What a widget prints, and where the engine reads it (js/investigations.js):
//
//   readout   the rows under the canvas: `label`, `value`, `emphasis`
//   canvas    the text its draw() paints (axis ticks, marker labels, titles),
//             caught from a stand-in 2-D context: fillText and strokeText
//   controls  the number beside each slider, written the way paintTool() writes
//             it (`format(value)`, or `value.toFixed(decimals ?? 2)` and the
//             unit), and each slider's label and unit
//   static    title, note, preset and action labels, preset notes
//
// Every one is taken the way a student meets it. The step's own `tool` spec
// decides which rows a widget shows (`rows: ['masses']`), so the specs are
// harvested from every lesson with its depth laid in, in each locale, and
// every widget is also run with its bare spec. For each spec:
//
//   values    the controls at the step's defaults, at both ends, at the middle,
//             at five places along each control with the rest at their
//             defaults, and at eight seeded places over all of them
//   run       an animated widget, reset and stepped forward, read after the
//             1st, 2nd, 4th, 8th, 16th and 24th frame
//   actions   each button pressed, the widget stepped, pressed again
//   presets   each preset button pressed
//
// A widget that reads the live simulation (`live: true`) is given the same
// four synthetic worlds the lesson recording uses; the others are given none,
// as the engine does. The data packs behind a few families (the sky, the
// Galactic and variable-star samples) are served from the repository by a
// stand-in fetch, so the readouts do not depend on a network.
//
// Nothing is random and nothing reads a clock: the values come from a seed
// keyed by the widget id and the widgets read neither Math.random nor a clock.
// As in the lesson recording, a many-case output is kept as a digest of every
// distinct result plus the first two of each shape (digits masked), so a
// reviewer reads what is printed and the digest moves when one digit does.
// Coverage is measured: every toFixed and toPrecision call in js/*Widgets.js
// is reported by the line that made it, and the recording says which ran.
// =============================================================================

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  LOCALES,
  distinct,
  hashText,
  num,
  outcome,
  precisionFindings,
  seeded,
  summarize,
  syntheticContexts,
} from './record.mjs';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const load = rel => import(pathToFileURL(path.join(ROOT, rel)).href);

/** Where the sites to reach live. */
export const WIDGET_GLOB = /^js\/[A-Za-z]+Widgets\.js$/;

// The recorder's own rounding and slider text use the engine's methods as they
// were when this module loaded, so a call-site report or a candidate formatter
// swapped onto the prototype changes what the widgets print and not what the
// recorder writes down.
const toFixedOnce = Number.prototype.toFixed;
const toPrecisionOnce = Number.prototype.toPrecision;
const roundTo = (x, figures) => Number(toPrecisionOnce.call(x, figures));

// --- The environment ------------------------------------------------------------

/**
 * What a widget needs of a browser, where there is none (the command line): the
 * same jsdom Jest gives the tests, so the two recordings see one environment.
 * Jest's own jsdom is left alone.
 */
async function ensureBrowser() {
  const g = globalThis;
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
  ])
    Object.defineProperty(g, key, {
      value: dom.window[key],
      configurable: true,
      writable: true,
    });
}

/** A fetch that reads the repository, for the data packs behind a family. */
function localFetch(url) {
  const file = path.join(ROOT, String(url).split('?')[0].replace(/^\/+/, ''));
  try {
    const body = readFileSync(file);
    const text = body.toString('utf8');
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => JSON.parse(text),
      text: async () => text,
      arrayBuffer: async () =>
        body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
    });
  } catch {
    return Promise.resolve({
      ok: false,
      status: 404,
      headers: { get: () => null },
      json: async () => {
        throw new Error('404');
      },
      text: async () => '',
    });
  }
}

// --- A stand-in canvas ----------------------------------------------------------

/** A 2-D context that keeps the text it is asked to paint, and does nothing else. */
function fakeContext(texts, canvasOf) {
  const gradient = () => ({ addColorStop() {} });
  const set = {};
  return new Proxy(set, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'fillText' || key === 'strokeText')
        return text => {
          texts.push(String(text));
        };
      if (key === 'measureText')
        return text => ({
          width: String(text).length * 6,
          actualBoundingBoxAscent: 8,
          actualBoundingBoxDescent: 2,
        });
      if (/^create.*Gradient$/.test(String(key))) return gradient;
      if (key === 'createImageData' || key === 'getImageData')
        return (...a) => {
          const [w, h] = key === 'getImageData' ? a.slice(2) : a;
          return {
            width: w,
            height: h,
            data: new Uint8ClampedArray(Math.max(0, w * h * 4)),
          };
        };
      if (key === 'canvas') return canvasOf?.();
      if (typeof key === 'symbol' || key === 'then') return undefined;
      return () => undefined;
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    },
  });
}

/** A canvas whose 2-D context keeps the text it is asked to paint. */
function fakeCanvas(texts) {
  const context = fakeContext(texts, () => canvas);
  const canvas = {
    clientWidth: 420,
    clientHeight: 300,
    width: 420,
    height: 300,
    style: {},
    getContext: () => context,
    setAttribute() {},
    getAttribute: () => null,
    addEventListener() {},
    removeEventListener() {},
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: 420,
      height: 300,
      right: 420,
      bottom: 300,
    }),
  };
  return canvas;
}

/**
 * A canvas a widget makes for itself (an off-screen buffer) gets a context
 * that does nothing, in jsdom as under Jest's own mock, for the duration of
 * the recording.
 */
function withOffscreenContext(fn) {
  const proto = globalThis.window?.HTMLCanvasElement?.prototype;
  if (!proto) return fn();
  const original = proto.getContext;
  proto.getContext = function getContext() {
    return fakeContext([], () => this);
  };
  const restore = () => {
    proto.getContext = original;
  };
  return Promise.resolve(fn()).finally(restore);
}

// --- A synthetic experiment for the divergence instrument ------------------------

/**
 * Two runs of one body that part company as `gap(t)` says, for the chaos
 * widget, which reads a finished experiment from the live context. Five gaps
 * give it each verdict it can write (identical, bounded, linear, saturated,
 * exponential), with and without a perturbation and refinement controls.
 */
function chaosExperiments() {
  const times = Array.from({ length: 60 }, (_, i) => i * 0.5);
  const gaps = {
    identical: () => 0,
    bounded: t => 1e-3 * (1 + 0.1 * Math.sin(t)),
    linear: t => 1e-3 * (t + 1),
    saturated: t => Math.min(1e-9 * Math.exp(0.9 * t), 1.5),
    exponential: t => 1e-9 * Math.exp(0.5 * t),
  };
  const samples = (gap, offset) =>
    times.map(t => ({
      t,
      __bodies: [
        {
          id: 1,
          x: Math.cos(t) + (offset ? gap(t) : 0),
          y: Math.sin(t),
          vx: 0,
          vy: 0,
        },
      ],
    }));
  const out = [];
  for (const [name, gap] of Object.entries(gaps)) {
    const base = {
      runs: {
        A: { samples: samples(gap, false) },
        B: { samples: samples(gap, true) },
      },
    };
    out.push(base);
    if (name === 'exponential')
      out.push({
        ...base,
        perturbation: { bodyName: 'Moon', axisLabel: 'x', km: 1.5 },
        numericalControls: [
          { tau: 2, behavior: 'exponential' },
          { tau: 2.1, behavior: 'exponential' },
        ],
      });
  }
  // A run that has not recorded anything yet, and one that never overlaps.
  out.push({ runs: { A: { samples: [] }, B: { samples: [] } } });
  return out;
}

// --- Values ---------------------------------------------------------------------

/** A control's range as a count of steps, guarding a degenerate one. */
const stepsOf = c => {
  const n = Math.round((c.max - c.min) / (c.step || 1));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const at = (c, index) => roundTo(c.min + index * (c.step || 1), 10);

/**
 * The control values a widget is read at, for one step spec: the step's
 * defaults, both ends, the middle, five places along each control with the
 * others at their defaults, and eight seeded places over all of them.
 */
export function valueSets(widget, spec, defaults, full = true) {
  const controls = widget.controls || [];
  const sets = [{ ...defaults }];
  const everywhere = pick => {
    const v = { ...defaults };
    for (const c of controls) v[c.id] = pick(c);
    sets.push(v);
  };
  everywhere(c => at(c, 0));
  everywhere(c => at(c, stepsOf(c)));
  everywhere(c => at(c, Math.round(stepsOf(c) / 2)));
  if (!full) return unique(sets);
  for (const c of controls)
    for (const f of [0, 0.25, 0.5, 0.75, 1])
      sets.push({ ...defaults, [c.id]: at(c, Math.round(stepsOf(c) * f)) });
  for (let j = 0; j < 8; j++) {
    const rand = seeded(hashText(`${widget.id}#${j}`));
    everywhere(c => at(c, Math.floor(rand() * (stepsOf(c) + 1))));
  }
  return unique(sets);
}

const unique = sets => {
  const seen = new Set();
  return sets.filter(v => {
    const key = JSON.stringify(v);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// --- One frame --------------------------------------------------------------------

/** What a student reads at one instant: rows, painted text, slider numbers. */
function frame(widget, v, ctx, spec) {
  const texts = [];
  const drawn = outcome(() => {
    widget.draw(fakeCanvas(texts), v, ctx, spec);
    return 'drawn';
  });
  const clean = x =>
    noiseFloor && typeof x === 'string' ? maskNoise(x, noiseFloor) : x;
  const rows = outcome(() =>
    widget.readout(v, ctx, spec).map(r => ({
      label: clean(r.label),
      value: clean(r.value),
      ...(r.emphasis ? { emphasis: true } : {}),
    }))
  );
  const controls = (widget.controls || []).map(c =>
    outcome(() =>
      clean(
        c.format
          ? c.format(Number(v[c.id]))
          : `${toFixedOnce.call(Number(v[c.id]), c.decimals ?? 2)}${c.unit ? ` ${c.unit}` : ''}`
      )
    )
  );
  return {
    rows,
    canvas: drawn === 'drawn' ? texts.map(clean) : { drew: drawn, texts },
    controls,
  };
}

const listOf = (x, spec) => (typeof x === 'function' ? x(spec) : x) || [];

// --- One widget --------------------------------------------------------------------

/** The text of a widget that does not depend on a step. */
function staticOf(widget, specs, defaults) {
  const control = c => ({
    id: c.id,
    label: outcome(() => c.label),
    unit: c.unit ?? null,
    min: c.min,
    max: c.max,
    step: c.step,
    value: c.value,
    decimals: c.decimals ?? null,
  });
  const labels = (list, pick) =>
    distinct(
      specs.flatMap(spec => outcome(() => listOf(list, spec).map(pick)))
    );
  return {
    title: outcome(() => widget.title),
    note: outcome(() => widget.note),
    controls: (widget.controls || []).map(control),
    presets: labels(widget.presets, p => ({
      label: p.label,
      values: p.values,
      note: typeof p.note === 'string' ? p.note : null,
    })),
    actions: labels(widget.actions, a => ({ id: a.id, label: a.label })),
    defaults: normalizeDefaults(defaults),
  };
}

const normalizeDefaults = d =>
  Object.fromEntries(Object.entries(d).map(([k, x]) => [k, num(x)]));

/**
 * The families whose printed numbers include integration noise: the precession
 * of a Newtonian ellipse is exactly zero, and what the power-law instrument
 * prints for it is the rounding error of the run ("-0.00000 °", "3.79e-15 of
 * total |p|"). That error has a different sign and different digits on Node 20
 * and Node 24, whose Math.pow, log and atan2 differ in the last place, and CI
 * failed on it. Whatever such a family prints with a magnitude below its floor
 * is recorded as a zero of the same shape: the sign and the digits are dropped,
 * the number of decimals and the exponent's presence are kept. Everything
 * above the floor is recorded as printed.
 */
let noiseFloor = 0;
const NOISE_FLOOR = new Map([['powerLaw', 1e-4]]);

const NUMBER_TOKEN = /[-\u2212]?(?:\d+\.\d+(?:e[-+]?\d+)?|\d+e[-+]?\d+)/gi;

/** A text with each number below `floor` in magnitude written as a zero. */
export function maskNoise(text, floor) {
  return text.replace(NUMBER_TOKEN, token => {
    const value = Number(token.replace('\u2212', '-'));
    if (!Number.isFinite(value) || Math.abs(value) >= floor) return token;
    return token
      .replace(/^[-\u2212]/, '')
      .replace(/e[-+]?\d+/i, 'e-N')
      .replace(/\d/g, '0');
  });
}

const FRAMES = new Set([1, 2, 4, 8, 16, 24]);
const FEW_FRAMES = new Set([4, 24]);
const DT = 0.25;

/**
 * Everything one widget prints, in the locale that is current, for each of
 * the step specs that name it.
 */
function recordWidget(widget, specs, contexts, widgets) {
  const rows = [];
  const canvas = [];
  const controls = [];
  const extras = [];
  const keep = (f, phase) => {
    rows.push(f.rows);
    canvas.push(f.canvas);
    controls.push(f.controls);
    if (phase) extras.push(phase);
  };
  const reset = (v, spec, fromControl = false) =>
    outcome(() => widget.reset?.(v, { autorun: true, spec, fromControl }));
  const live = widget.live
    ? widget.id === 'chaos-divergence'
      ? chaosExperiments().map(
          experiment =>
            new Proxy(contexts[1], {
              get: (target, key) =>
                key === 'experiment' ? () => experiment : target[key],
            })
        )
      : contexts
    : [undefined];
  const first = widgets.widgetDefaults(widget, specs[0]?.values);

  // The first spec is the bare one and is read at every value set; a step's own
  // spec is read at the four corner sets, because it changes which rows show
  // and not how a number is written. Its buttons and presets are run once per
  // distinct set of them.
  const done = new Set();
  for (const [index, spec] of specs.entries()) {
    const defaults = widgets.widgetDefaults(widget, spec.values);
    const buttons = JSON.stringify([
      outcome(() => listOf(widget.actions, spec).map(a => [a.id, a.label])),
      outcome(() => listOf(widget.presets, spec).map(p => [p.label, p.values])),
    ]);
    const first_ = index === 0;
    const withButtons = first_ || !done.has(buttons);
    done.add(buttons);
    for (const ctx of live) {
      // The values: the engine resets an animated widget when a control moves.
      for (const v of valueSets(widget, spec, defaults, first_)) {
        reset({ ...v }, spec, true);
        keep(frame(widget, { ...v }, ctx, spec));
      }
      // The run.
      if (widget.step && widget.animated !== false) {
        const v = { ...defaults };
        reset(v, spec);
        for (let n = 1; n <= 24; n++) {
          const stepped = outcome(() => widget.step(v, DT, spec, ctx));
          if ((first_ ? FRAMES : FEW_FRAMES).has(n))
            keep(frame(widget, { ...v }, ctx, spec), {
              run: n,
              ...(stepped ? { stepped } : {}),
            });
        }
      }
      // The buttons.
      for (const action of withButtons ? listOf(widget.actions, spec) : []) {
        const v = { ...defaults };
        reset(v, spec);
        const press = label =>
          keep(frame(widget, { ...v }, ctx, spec), {
            action: action.id,
            after: label,
            button: outcome(() => action.label),
          });
        for (let n = 0; n < 6; n++)
          outcome(() => widget.step?.(v, DT, spec, ctx));
        outcome(() => widget.act?.(action.id, v, spec, ctx));
        press('press');
        for (let n = 0; n < 6; n++)
          outcome(() => widget.step?.(v, DT, spec, ctx));
        press('step');
        outcome(() => widget.act?.(action.id, v, spec, ctx));
        press('press again');
      }
      // The presets.
      for (const preset of withButtons ? listOf(widget.presets, spec) : []) {
        const v = { ...defaults, ...preset.values };
        reset(v, spec, true);
        keep(frame(widget, { ...v }, ctx, spec), {
          preset: outcome(() => preset.label),
          note: typeof preset.note === 'string' ? preset.note : null,
        });
      }
    }
  }
  // Written to more places than an uncertainty printed beside it supports:
  // listed, never fixed (a correction is a visible change, and Carl's call).
  const printed = new Set();
  for (const list of rows)
    for (const row of Array.isArray(list) ? list : [])
      for (const x of [row.label, row.value])
        if (typeof x === 'string') printed.add(x);
  for (const list of canvas)
    for (const x of Array.isArray(list) ? list : []) printed.add(String(x));
  return {
    static: staticOf(widget, specs, first),
    precision: precisionFindings({ answers: [], decimals: [] }, printed),
    specs: specs.length,
    frames: rows.length,
    readout: summarize(rows),
    canvas: summarize(canvas),
    controls: summarize(controls),
    phases: summarize(extras),
  };
}

// --- Harvesting the step specs --------------------------------------------------

/** A spec as it is kept: functions dropped, long prose cut to its start. */
const short = value => {
  if (typeof value === 'string')
    return value.length > 60 ? value.slice(0, 60) : value;
  if (Array.isArray(value)) return value.map(short);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, x]) => typeof x !== 'function')
        .map(([k, x]) => [k, short(x)])
    );
  return value;
};

/**
 * The row names a family's readouts choose among (`has('masses')`): one extra
 * spec per family asks for all of them, so a row no lesson happens to request
 * is still read.
 */
function rowKeysOf(entry) {
  const file = path.join(ROOT, 'js', entry.path.replace(/^\.\//, ''));
  const source = readFileSync(file, 'utf8');
  return [
    ...new Set([...source.matchAll(/\bhas\('([\w-]+)'\)/g)].map(m => m[1])),
  ].sort();
}

/**
 * Every `tool` spec a lesson step gives a widget, by widget id, in each locale.
 */
async function harvestSpecs() {
  const reg = await load('js/data/investigations/registry.js');
  const { withDepth } = await load('js/investigations/depth.js');
  const byLocale = {};
  for (const locale of LOCALES) {
    await reg.setLessonLocale(locale);
    const map = new Map();
    for (const id of [...reg.investigationIds()].sort()) {
      const lesson = await withDepth(
        await reg.loadInvestigation(id, locale),
        locale
      );
      for (const step of lesson.steps) {
        const tool = step.tool;
        if (!tool || typeof tool !== 'object' || !tool.id) continue;
        const list = map.get(tool.id) ?? [];
        const key = JSON.stringify(short(tool));
        if (!list.some(s => s.key === key)) list.push({ key, spec: tool });
        map.set(tool.id, list);
      }
    }
    byLocale[locale] = map;
  }
  await reg.setLessonLocale('en');
  return byLocale;
}

// --- Call-site coverage ---------------------------------------------------------

/**
 * The caller of the function that calls this, as `file:line:column`. Read from
 * the call sites themselves, because building and splitting the text of a
 * stack for every toFixed call in a recording cost as much as the recording.
 */
function callerOf() {
  const prepare = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, sites) => sites;
  try {
    const site = new Error().stack[2];
    return site
      ? `${site.getFileName()}:${site.getLineNumber()}:${site.getColumnNumber()}`
      : '';
  } finally {
    Error.prepareStackTrace = prepare;
  }
}

const SITE_AT = /\/(js\/[A-Za-z]+Widgets\.js):(\d+):(\d+)\)?$/;

/**
 * Run `fn` while toFixed and toPrecision report which widget line called them.
 * Besides the line, each site keeps what a swap for js/format.js's `fixed()`
 * would change there: a result that begins with a hyphen (fixed() writes a true
 * minus) and a receiver that is not finite (fixed() writes '' for it, toFixed
 * 'NaN' and 'Infinity'). The returned map is `site -> {calls, negative,
 * nonFinite}`.
 */
export async function withWidgetCoverage(fn) {
  const sites = new Map();
  const { toFixed, toPrecision } = Number.prototype;
  const watch = original =>
    function watched(...args) {
      const frameText = callerOf();
      const result = original.apply(this, args);
      const m = SITE_AT.exec(frameText);
      if (m) {
        const key = `${m[1]}:${m[2]}:${m[3]}`;
        const seen = sites.get(key) ?? { calls: 0, negative: 0, nonFinite: 0 };
        seen.calls++;
        if (typeof result === 'string' && result.startsWith('-'))
          seen.negative++;
        if (!Number.isFinite(Number(this))) seen.nonFinite++;
        sites.set(key, seen);
      }
      return result;
    };
  Number.prototype.toFixed = watch(toFixed);
  Number.prototype.toPrecision = watch(toPrecision);
  // Only the caller's frame is read, so only three are built.
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

/** The lines of js/*Widgets.js that call toFixed or toPrecision. */
export function widgetSites() {
  const out = [];
  for (const entry of readdirSync(path.join(ROOT, 'js'))) {
    const rel = `js/${entry}`;
    if (!WIDGET_GLOB.test(rel)) continue;
    readFileSync(path.join(ROOT, rel), 'utf8')
      .split('\n')
      .forEach((line, i) => {
        const code = line.replace(/\/\/.*$/, '');
        for (const m of code.matchAll(/\.(to(?:Fixed|Precision))\s*\(/g))
          out.push(`${rel}:${i + 1}:${m.index + 2}`);
      });
  }
  return out.sort();
}

// --- The whole family -----------------------------------------------------------

/**
 * Record every widget of every family, both locales.
 *
 * @param {{coverage?: boolean, toFixed?: Function}} [options] - `coverage:
 *   false` skips the call-site report; `toFixed` runs the recording with
 *   Number.prototype's toFixed replaced, to try a candidate formatter against
 *   the golden before any file changes
 * @returns {Promise<{families: Record<string, object>, reached: string[],
 *   sites: string[]}>}
 */
export async function recordWidgets({
  coverage = true,
  toFixed = null,
  only = null,
} = {}) {
  await ensureBrowser();
  const realFetch = globalThis.fetch;
  globalThis.fetch = localFetch;
  const swapped = async fn => {
    if (!toFixed) return fn();
    const original = Number.prototype.toFixed;
    Number.prototype.toFixed = toFixed;
    try {
      return await fn();
    } finally {
      Number.prototype.toFixed = original;
    }
  };
  const watching = coverage
    ? withWidgetCoverage
    : async fn => {
        await fn();
        return new Map();
      };
  const families = {};
  let reached;
  try {
    const i18n = await load('js/i18n/index.js');
    const deferred = await load('js/i18n/deferredMessages.js');
    const widgets = await load('js/widgets.js');
    // The staged stellar sample is a model the lesson recording has no use for:
    // an empty one is what a lesson that has not staged a population holds.
    const contexts = (await syntheticContexts()).map(
      c =>
        new Proxy(c, {
          get: (target, key) =>
            key === 'stagedSample' ? () => [] : target[key],
        })
    );
    const specsBy = await harvestSpecs();
    reached = await watching(async () =>
      withOffscreenContext(async () =>
        swapped(async () => {
          await widgets.whenWidgetsReady();
          const perLocale = {};
          for (const locale of LOCALES) {
            await i18n.setLocale(locale, { persist: false });
            await deferred.awaitDeferredMessages();
            perLocale[locale] = {};
            for (const [family, entry] of Object.entries(
              widgets.LAZY_FAMILIES
            )) {
              if (only && !only.includes(family)) continue;
              const recordFamily = () => {
                for (const widget of entry.ids.map(id =>
                  widgets.getWidget(id)
                )) {
                  const harvested = (specsBy[locale].get(widget.id) ?? []).map(
                    s => s.spec
                  );
                  const keys = rowKeysOf(entry);
                  const specs = [
                    { id: widget.id },
                    ...(keys.length ? [{ id: widget.id, rows: keys }] : []),
                    ...harvested,
                  ];
                  (perLocale[locale][family] ??= {})[widget.id] = recordWidget(
                    widget,
                    specs,
                    contexts,
                    widgets
                  );
                }
              };
              // No await in this loop, on purpose: gw-lab's Listen button
              // starts a dynamic import whose answer lands at the next await,
              // so a recording that yielded mid-run would read that lab before
              // or after it by chance.
              noiseFloor = NOISE_FLOOR.get(family) ?? 0;
              try {
                recordFamily();
              } finally {
                noiseFloor = 0;
              }
            }
          }
          await i18n.setLocale('en', { persist: false });
          for (const family of Object.keys(perLocale.en)) {
            const out = {};
            for (const [id, en] of Object.entries(perLocale.en[family])) {
              const es = perLocale.es[family][id];
              out[id] = {
                en,
                es: JSON.stringify(es) === JSON.stringify(en) ? 'same' : es,
              };
            }
            families[family] = out;
          }
        })
      )
    );
  } finally {
    globalThis.fetch = realFetch;
  }
  return {
    families,
    reached: [...reached.keys()].sort(),
    hazards: Object.fromEntries(
      [...reached].sort(([a], [b]) => (a < b ? -1 : 1))
    ),
    sites: widgetSites(),
  };
}
