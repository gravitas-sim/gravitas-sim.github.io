// =============================================================================
// The motion inventory (Roadmap III Prompt 279)
// -----------------------------------------------------------------------------
// tools/motion-inventory.json names every source of time-based change in the
// sources and what each does when the reader asks for reduced motion. This
// holds the file to the sources: a new keyframes or a new scheduler that is not
// listed fails, a listed one that has gone fails, a source that says it follows
// the setting must read it, and a gap must say why and what would close it.
// e2e/a11ySweepII.spec.js runs the pages with reduced motion and reads the same
// file.
// =============================================================================

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, test, expect } from '@jest/globals';

import { pages } from '../tools/csp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8');
const inventory = JSON.parse(read('tools/motion-inventory.json'));

const withoutComments = text =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

/** Every .js file under js/, the vendored libraries and message catalogs aside. */
const sources = (dir = 'js') =>
  readdirSync(path.join(ROOT, dir)).flatMap(name => {
    const rel = `${dir}/${name}`;
    if (statSync(path.join(ROOT, rel)).isDirectory())
      return name === 'vendor' || name === 'i18n' ? [] : sources(rel);
    return name.endsWith('.js') ? [rel] : [];
  });

const SCHEDULES =
  /\brequestAnimationFrame\(|\bsetInterval\(|\banimated:\s*true|\.animate\(/;
const READS_THE_SETTING =
  /prefersReducedMotion|reducedMotion|prefers-reduced-motion|data-motion|isReduced|autorun|reduced\(\)/;

const scheduled = () =>
  sources()
    .filter(rel => SCHEDULES.test(withoutComments(read(rel))))
    .sort();

describe('the motion inventory against the sources', () => {
  test('every file that schedules motion is listed, and every listed file schedules', () => {
    expect(inventory.js.map(e => e.file).sort()).toEqual(scheduled());
  });

  test('every keyframes in the stylesheets and the pages is listed, and the file says where', () => {
    const found = [];
    for (const rel of [
      ...readdirSync(path.join(ROOT, 'css'))
        .filter(f => f.endsWith('.css'))
        .map(f => `css/${f}`),
      ...pages(),
    ])
      for (const m of read(rel).matchAll(/@keyframes\s+([\w-]+)/g))
        found.push(`${rel}#${m[1]}`);
    expect(
      inventory.css.keyframes.map(k => `${k.file}#${k.name}`).sort()
    ).toEqual(found.sort());
  });

  test('the blanket rules that stop every animation and transition are in place', () => {
    for (const rel of inventory.css.blanket) {
      const css = read(rel);
      expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
      expect(css).toMatch(/animation-iteration-count: 1/);
      expect(css).toMatch(/transition-duration: (0\.01|1)ms/);
    }
    // The reader's own override, outside every layer so it outranks them.
    expect(read('css/components.css')).toMatch(
      /:root\[data-motion\] \*,[\s\S]*?animation-duration: 0\.01ms/
    );
  });

  test('no important rule gives a transition or an animation a literal duration', () => {
    // It would beat both blanket rules: this is how .scenario-info-close kept
    // its 0.2 s transition under reduced motion until this sweep.
    for (const f of readdirSync(path.join(ROOT, 'css')).filter(n =>
      n.endsWith('.css')
    )) {
      const css = withoutComments(read(`css/${f}`));
      const literal = css.match(
        /(?:transition|animation)(?:-duration)?\s*:[^;{}]*\d(?:\.\d+)?m?s[^;{}]*!important/g
      );
      // The blanket rules themselves are the intended exception.
      expect(
        (literal ?? []).filter(l => !/0\.01ms|1ms|:\s*none/.test(l))
      ).toEqual([]);
    }
  });
});

test('no script writes a transition or an animation with a literal duration into a style', () => {
  // An inline style outranks the reader's own Settings, Motion override (an
  // unlayered rule that is not important); a token does not, because the
  // override collapses the tokens. This is how the settings tooltips kept a
  // 0.3 s transition under "Reduced" until this sweep.
  const literal = /(?:transition|animation)\s*:[^;`'"]*\d(?:\.\d+)?m?s\b/;
  const found = sources().filter(rel =>
    literal.test(withoutComments(read(rel)))
  );
  expect(found).toEqual([]);
});

describe('what each entry promises', () => {
  const treatments = new Set(inventory.treatments);

  test('every entry has a known treatment and says what it is', () => {
    for (const e of inventory.js) {
      expect([e.file, treatments.has(e.treatment)]).toEqual([e.file, true]);
      expect(e.what.length).toBeGreaterThan(10);
    }
  });

  test('a source that follows the setting reads it, and says what it does', () => {
    for (const e of inventory.js.filter(x => x.treatment === 'follows')) {
      expect([e.file, READS_THE_SETTING.test(read(e.file))]).toEqual([
        e.file,
        true,
      ]);
      expect(e.reduced.length).toBeGreaterThan(10);
      expect(statSync(path.join(ROOT, e.test)).isFile()).toBe(true);
    }
  });

  test('motion that is the content has a pause control, a reduced behaviour and a test', () => {
    for (const e of inventory.js.filter(x => x.treatment === 'content')) {
      expect(e.pause.length).toBeGreaterThan(5);
      expect(e.reduced.length).toBeGreaterThan(10);
      expect(statSync(path.join(ROOT, e.test)).isFile()).toBe(true);
    }
  });

  test('a gap says why and what would close it, and the instruments are the ones that lack a Run control', () => {
    const gaps = inventory.js.filter(x => x.treatment === 'gap');
    expect(gaps.map(g => g.file)).toEqual(['js/resonanceWidgets.js']);
    for (const g of gaps) {
      expect(g.reason.length).toBeGreaterThan(30);
      expect(g.proposed.length).toBeGreaterThan(30);
      // The gap is real: neither file reads the setting or takes an autorun.
      expect(READS_THE_SETTING.test(read(g.file))).toBe(false);
    }
  });

  test('the sources that need no reduction say why', () => {
    for (const e of inventory.js.filter(x =>
      ['opt-in', 'timer', 'workload', 'once', 'capture'].includes(x.treatment)
    ))
      expect([e.file, e.reason.length > 15]).toEqual([e.file, true]);
  });
});

describe("a step's instrument starts still under reduced motion", () => {
  test('autoruns follows the step and then the setting', async () => {
    const { autoruns } = await import('../js/widgets.js');
    const { setMotionPreference } = await import('../js/quality.js');
    setMotionPreference('system', { remember: false });
    expect(autoruns({})).toBe(true);
    expect(autoruns({ autorun: true })).toBe(true);
    // A prediction step sits still whatever the setting.
    expect(autoruns({ autorun: false })).toBe(false);
    // Step by step is a reduction the reader chose.
    setMotionPreference('step', { remember: false });
    expect(autoruns({})).toBe(false);
    expect(autoruns({ autorun: true })).toBe(false);
    setMotionPreference('reduce', { remember: false });
    expect(autoruns({})).toBe(false);
    setMotionPreference('system', { remember: false });
  });
});

describe('the two exoplanet instruments wait for Run', () => {
  const instruments = async () => {
    const { MOTION_WIDGETS } = await import('../js/exoplanetMotionWidgets.js');
    return MOTION_WIDGETS;
  };
  const engineOpens = (w, v, motion) =>
    // What the engine does when a step opens: the step's say and the Motion choice, as `autoruns` reads them.
    w.reset(v, { autorun: motion, spec: {} });

  test('they are the two the inventory names', async () => {
    expect((await instruments()).map(w => w.id)).toEqual([
      'reflex-motion',
      'rv-observer',
    ]);
  });

  test('they open still whatever the step and the Motion choice say, and move only after Run', async () => {
    const { setMotionPreference } = await import('../js/quality.js');
    for (const w of await instruments()) {
      for (const motion of ['system', 'reduce', 'step']) {
        setMotionPreference(motion, { remember: false });
        const v = { _phase: 2 };
        engineOpens(w, v, motion === 'system');
        w.step(v, 1);
        expect([w.id, motion, v._phase]).toEqual([w.id, motion, 0]);
        w.act('run', v);
        w.step(v, 0.5);
        expect(v._phase).toBeGreaterThan(0);
        w.act('run', v);
      }
    }
    setMotionPreference('system', { remember: false });
  });

  test('Pause stops, a slider or a preset neither starts nor rewinds, and opening a step stops and rewinds', async () => {
    for (const w of await instruments()) {
      const v = {};
      engineOpens(w, v, true);
      w.act('run', v);
      w.step(v, 0.5);
      const ran = v._phase;
      w.reset(v, { autorun: true, spec: {}, fromControl: true });
      expect(v._phase).toBe(ran);
      w.step(v, 0.5);
      expect(v._phase).toBeGreaterThan(ran);
      w.act('run', v);
      const paused = v._phase;
      w.step(v, 1);
      expect(v._phase).toBe(paused);
      w.reset(v, { autorun: true, spec: {}, fromControl: true });
      w.step(v, 1);
      expect(v._phase).toBe(paused);
      w.act('run', v);
      engineOpens(w, v, true);
      w.step(v, 1);
      expect(v._phase).toBe(0);
    }
  });

  test('each offers one action, Run, and a step can withhold the preset that names the planet', async () => {
    for (const w of await instruments()) {
      expect(w.actions.map(a => a.id)).toEqual(['run']);
    }
    const [reflex] = await instruments();
    const { EXOPLANET_WIDGETS } = await import('../js/exoplanetWidgets.js');
    const mass = EXOPLANET_WIDGETS.find(w => w.id === 'rv-mass');
    for (const w of [reflex, mass]) {
      const named = p => p.label === 'HD 209458 b';
      expect(w.presets({}).some(named)).toBe(true);
      expect(w.presets({ noSystem: true }).some(named)).toBe(false);
    }
  });
});
