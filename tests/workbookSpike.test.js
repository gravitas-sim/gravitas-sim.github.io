// =============================================================================
// The workbook spike: does the printed number agree with the running lesson?
// -----------------------------------------------------------------------------
// tools/build-workbook.mjs prints engine-computed measurements for one lesson,
// Kepler's Laws. This suite holds it to the four claims that make it worth
// having, and would make it worthless if any one of them were quietly untrue:
//
//   1. the numbers come from the real engine and the real world builder, not
//      from a second implementation living in the tool;
//   2. the run is deterministic - same source, same table, byte for byte;
//   3. every number is accepted by the LESSON's own validators, the same
//      functions that mark a student's work in the browser;
//   4. and that acceptance is a real check: corrupt a value and it fails.
//
// (4) is the one that matters. A check that cannot fail is decoration, so
// there is a test here that deliberately breaks a reading and requires the
// lesson to reject it.
//
// Why a child process for most of this
// -----------------------------------------------------------------------------
// tests/setup.js gives every suite a jsdom `document`. The workbook tool is
// supposed to run where there is none. Asserting that under jsdom would prove
// nothing, so the headless claims are made in a `node` child with no setup
// file, the same technique and for the same reason as
// tests/workerCompatibility.test.js.
// =============================================================================

import { describe, test, expect, beforeAll } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TABLE = path.join(REPO, 'workbooks', 'keplers-laws.json');
const PDF = path.join(REPO, 'workbooks', 'keplers-laws.pdf');

/** Run an ES module snippet in a realm with no DOM and no jest setup. */
const inCleanRealm = source =>
  execFileSync(process.execPath, ['--input-type=module', '-e', source], {
    cwd: REPO,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024,
  }).trim();

/**
 * A source file with its comments removed.
 *
 * These files explain at length what they must not do - "nothing here may read
 * Date.now()" - so a scan of the raw text finds the prohibition and calls it
 * the offence. The scan has to look at the code.
 *
 * @param {string} rel - Repo-relative path
 * @returns {string} The source, comments blanked
 */
const codeOf = rel =>
  readFileSync(path.join(REPO, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

let table;
beforeAll(() => {
  expect(existsSync(TABLE)).toBe(true);
  table = JSON.parse(readFileSync(TABLE, 'utf8'));
});

describe('the workbook runs headlessly on the real engine', () => {
  test('the seam builds a world with no document and no window', () => {
    const out = inCleanRealm(`
      const W = await import('./tools/workbook/world.mjs');
      const w = await W.buildScenario("Kepler's 2nd Law", 'test');
      const names = W.allBodies(w.physics).map(b => b.name).sort().join('|');
      console.log([
        typeof document === 'undefined' && typeof window === 'undefined',
        names,
        w.physics.getSimulationTime(),
      ].join(','));
    `);
    // No shim was installed and none was needed: the Worker guards in
    // js/physics.js and js/world/build.js carry it.
    expect(out).toBe('true,Circular Orbiter|Eccentric Orbiter|Kepler Star,0');
  });

  test('the world came from applyPreset and buildWorld, not from the tool', () => {
    // The scenario's own settings are stamped by js/scenarios.js. If the tool
    // were constructing bodies itself these would still be the defaults.
    const out = inCleanRealm(`
      const W = await import('./tools/workbook/world.mjs');
      const { DEFAULT_SETTINGS } = await import('./js/appState.js');
      const w = await W.buildScenario('TRAPPIST-1 System', 'test');
      console.log([
        w.settings.max_timestep,
        DEFAULT_SETTINGS.max_timestep,
        w.scenario,
        // applyPreset clears the trigger key once it has fired
        // (js/scenarios.js:1756), which is itself evidence it ran.
        w.settings.preset_scenario,
        w.physics.planets.length,
      ].join(','));
    `);
    expect(out).toBe('0.0006,0,TRAPPIST-1 System,None,7');
  });

  test('a rebuilt world starts its clock at zero', () => {
    // js/world/build.js does not reset the clock; js/ui.js does, immediately
    // after calling it. A headless host that forgets has a second scenario
    // starting hundreds of simulated days in, which is how this was found.
    const out = inCleanRealm(`
      const W = await import('./tools/workbook/world.mjs');
      const a = await W.buildScenario("Kepler's 2nd Law", 'test');
      W.advanceToDay(a, 50);
      const moved = W.clockDays(a.physics) > 40;
      const b = await W.buildScenario('Solar System', 'test');
      console.log([moved, W.clockDays(b.physics)].join(','));
    `);
    expect(out).toBe('true,0');
  });

  test("the panel's clock is not the integrator's, headlessly", () => {
    // Guards a fix that would look like an improvement. js/pauseAtEvent.js is
    // handed `currentTimeDays` from js/lightCurve.js in the browser, so
    // reusing it here reads as the more faithful choice - but it reports the
    // timeline recorder's clock, and nothing feeds the recorder outside a
    // render loop. Pointing the watcher at it would not throw: it would hand
    // back the same reading every step, the watcher would drop every sample
    // as a duplicate, and no event would ever fire.
    const out = inCleanRealm(`
      const W = await import('./tools/workbook/world.mjs');
      const lc = await import('./js/lightCurve.js');
      const w = await W.buildScenario("Kepler's 2nd Law", 'test');
      W.advanceToDay(w, 100);
      console.log([
        Math.round(W.clockDays(w.physics)),
        lc.currentTimeDays(),
      ].join(','));
    `);
    expect(out).toBe('100,0');
  });

  test('stepping is fixed and frame-rate free', () => {
    // The browser's step comes from frameAdvance(realSeconds, ...). Nothing in
    // the workbook path may read a wall clock.
    const source = codeOf('tools/workbook/world.mjs');
    expect(source).not.toMatch(
      /Date\.now|performance\.now|requestAnimationFrame/
    );
    expect(source).not.toMatch(/frameAdvance/);
    // And it must go through the application's own substep rule.
    expect(source).toMatch(/substepPlan/);
  });

  test('the tool opens no network connection', () => {
    for (const file of [
      'tools/build-workbook.mjs',
      'tools/workbook/world.mjs',
      'tools/workbook/kepler.mjs',
    ]) {
      const source = codeOf(file);
      expect(source).not.toMatch(
        /\bfetch\s*\(|node:https?|require\('https?'\)/
      );
    }
  });

  test('...and cannot, with the socket taken away', () => {
    // The grep above proves nothing about what the engine modules do once they
    // are loaded, so this breaks the only two ways out - `fetch`, and the
    // socket every http client in node is built on - and then measures and
    // grades the whole lesson anyway. Anything that reached for the network
    // would throw rather than quietly succeed from a cache.
    const out = inCleanRealm(`
      const net = await import('node:net');
      const tls = await import('node:tls');
      const boom = () => { throw new Error('network access attempted'); };
      net.Socket.prototype.connect = boom;
      tls.TLSSocket.prototype.connect = boom;
      globalThis.fetch = boom;
      globalThis.XMLHttpRequest = boom;

      const K = await import('./tools/workbook/kepler.mjs');
      const science = await K.measure();
      const graded = await K.gradeAll(science);
      console.log([
        graded.length,
        graded.every(g => g.level === 'ok'),
        Object.keys(science.samples).length,
      ].join(','));
    `);
    expect(out).toBe('11,true,6');
  });
});

describe('the scientific table', () => {
  test('samples are taken at named simulated times and named conditions', () => {
    const ids = table.schedule.map(s => s.id);
    expect(ids).toEqual([
      'kepler-t0',
      'kepler-periapsis',
      'kepler-apoapsis',
      'solar-t0',
      'solar-one-year',
      'trappist-t0',
    ]);
    // Every scheduled moment is either an explicit simulated day or a named
    // physical condition. Nothing is "wherever the run happened to be".
    for (const entry of table.schedule) {
      const named = typeof entry.at.day === 'number' || Boolean(entry.at.event);
      expect(named).toBe(true);
    }
    // The two event samples carry the time the watcher interpolated, and the
    // bracket it was found in, so a reader can see the resolution.
    for (const id of ['kepler-periapsis', 'kepler-apoapsis']) {
      expect(table.samples[id].event.timeDays).toBeGreaterThan(0);
      expect(table.samples[id].event.bracketDays).toBeGreaterThan(0);
    }
    // The one-year sample is a whole number of identical steps, not a duration.
    expect(table.samples['solar-one-year'].steps).toBeGreaterThan(1000);
    expect(table.samples['solar-one-year'].day).toBeCloseTo(365.25, 1);
  });

  test('it carries no wall clock, no path and no commit', () => {
    // Anything that moves without the physics moving would make --check a
    // permanent failure and the table useless as a regression signal.
    const text = readFileSync(TABLE, 'utf8');
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    expect(text).not.toMatch(/\/Users\/|\/home\//);
    expect(text).not.toMatch(/"commit"/);
  });

  test('the values are the physics they claim to be', () => {
    // Not a second answer key: three sanity anchors on the printed table, at
    // tolerances far looser than the lesson's own, so this test fails only if
    // the table has stopped being about orbits at all.
    const solar = Object.fromEntries(
      table.samples['solar-t0'].rows.map(r => [r[0], r])
    );
    expect(Number(solar.Earth[1])).toBeCloseTo(1.0, 2);
    expect(Number(solar.Earth[2])).toBeCloseTo(1.0, 2);

    // The eccentric orbit is at periapsis when the watcher says it is.
    const peri = table.samples['kepler-periapsis'];
    const apo = table.samples['kepler-apoapsis'];
    expect(peri.distanceAu).toBeLessThan(apo.distanceAu);
    expect(peri.speedKms).toBeGreaterThan(apo.speedKms);
  });

  test('an orbital element does not drift between the two named times', () => {
    const at = id =>
      Object.fromEntries(table.samples[id].rows.map(r => [r[0], r]));
    const t0 = at('solar-t0');
    const t1 = at('solar-one-year');
    for (const name of Object.keys(t0)) {
      expect(t1[name][1]).toBe(t0[name][1]);
      expect(t1[name][2]).toBe(t0[name][2]);
    }
  });
});

describe('the lesson marks its own workbook', () => {
  test('every reading was graded by a step that exists in the lesson', async () => {
    const { INVESTIGATIONS } = await import('../js/data/investigations.js');
    const lesson = INVESTIGATIONS.find(i => i.id === 'keplers-laws');
    const sids = new Set(lesson.steps.map(s => s.sid));
    expect(table.agreement.length).toBeGreaterThanOrEqual(5);
    for (const record of table.agreement) {
      expect(sids.has(record.sid)).toBe(true);
      // The verdict came from the step's own validate, which is the only
      // thing that produces these levels.
      expect(record.level).toBe('ok');
    }
  });

  test('all five graded steps are covered', () => {
    expect([...new Set(table.agreement.map(r => r.sid))].sort()).toEqual([
      'fast-and-slow-in-numbers',
      'measure-four-planets',
      'measure-the-two-orbits',
      'weigh-trappist-1-yourself',
      'work-the-law-out-step',
    ]);
  });

  test('no tolerance or expected value was copied out of the lesson', () => {
    // The numbers the lesson marks against - 0.0898 for TRAPPIST-1, the 0.25
    // band on P^2/a^3, the 0.15 band on the speed ratio - must live only in
    // js/data/investigations/keplers-laws.js.
    for (const file of [
      'tools/workbook/kepler.mjs',
      'tools/workbook/world.mjs',
    ]) {
      const source = codeOf(file);
      expect(source).not.toMatch(/0\.0898/);
      expect(source).not.toMatch(/TRUE_MASS/);
    }
  });

  test("the workbook's elements come from the same module the panel reads", async () => {
    // The seam. js/investigations.js builds its probe context privately and
    // cannot be imported outside a browser, so tools/workbook/world.mjs
    // rebuilds the two members the Kepler validators use. This pins the two
    // together: if the application ever sources a readout's orbital elements
    // from somewhere other than js/orbital.js, the workbook stops agreeing
    // with the screen and this test says so.
    const app = readFileSync(
      path.join(REPO, 'js', 'investigations.js'),
      'utf8'
    );
    expect(app).toMatch(
      /import \{[^}]*orbitalElements[^}]*dominantPrimary[^}]*\} from '\.\/orbital\.js'/s
    );
    const seam = readFileSync(
      path.join(REPO, 'tools', 'workbook', 'world.mjs'),
      'utf8'
    );
    expect(seam).toMatch(/from '\.\.\/\.\.\/js\/orbital\.js'/);
  });

  test('corrupting a printed value makes the lesson reject it', () => {
    // The regression test the whole exercise rests on. Take the period the
    // workbook printed for TRAPPIST-1e and move it by five percent, which is
    // four digits of 6.0808 looking entirely plausible on paper, then require
    // the lesson's own validator to refuse it.
    //
    // Five and not one: the lesson's band is +/- 0.008 solar masses about
    // 0.0898, and mass goes as a^3/P^2, so it tolerates a period out by 4.5%
    // and a semi-major axis out by 2%. That asymmetry is the lesson author's
    // call and is not this suite's to tighten - what matters is that some
    // corruption is caught, and that the number here is measured rather than
    // guessed.
    const out = inCleanRealm(`
      const K = await import('./tools/workbook/kepler.mjs');
      const step = K.stepOf('weigh-trappist-1-yourself');
      const honest = { w_name: 'TRAPPIST-1e', w_a: '0.0292', w_Pd: '6.0808' };
      const bent = { ...honest, w_Pd: '6.3848' };
      const a = K.gradeWithLesson(step, honest, null).verdict;
      const b = K.gradeWithLesson(step, bent, null).verdict;
      console.log([a.level, b.level].join(','));
    `);
    expect(out).toBe('ok,warn');
  });

  test('a corrupted table fails the build, not just a validator', () => {
    // And end to end: the same five percent, applied through the real
    // grading path the tool runs before it writes anything.
    const out = inCleanRealm(`
      const K = await import('./tools/workbook/kepler.mjs');
      const science = await K.measure();
      const row = science.samples['trappist-t0'].rows.find(r => r.name === 'TRAPPIST-1e');
      row.periodDays = (Number(row.periodDays) * 1.05).toFixed(4);
      const graded = await K.gradeAll(science);
      const bad = graded.filter(g => g.level !== 'ok');
      console.log([bad.length, bad[0]?.subject ?? '-'].join(','));
    `);
    expect(out).toBe('1,TRAPPIST-1e');
  });
});

describe('the artifacts', () => {
  test('the committed table is what this source revision produces', () => {
    // The determinism claim, made the only way it can be: regenerate and
    // compare. This is `npm run workbook:check`.
    execFileSync(
      process.execPath,
      ['tools/build-workbook.mjs', '--check', '--quiet'],
      { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }
    );
  });

  test('the printable artifact is a PDF that names its own revision', () => {
    // Generated rather than committed: a file that carries its own commit hash
    // can never be up to date in the commit that contains it, so it is built
    // here and then read. That makes this the artifact-generation test as well.
    execFileSync(process.execPath, ['tools/build-workbook.mjs', '--quiet'], {
      cwd: REPO,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(existsSync(PDF)).toBe(true);
    const bytes = readFileSync(PDF);
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    const text = bytes.toString('latin1');
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: REPO,
      encoding: 'utf8',
    }).trim();
    // The provenance block carries the full commit, and the footer carries
    // the digest of the scientific table.
    expect(text).toContain(commit);
    expect(text).toMatch(/Scientific table digest/);
    expect(text).toMatch(/World seed/);
  });

  test('the workbook is not shipped to visitors', () => {
    // A Node-only generator must not change what a browser downloads.
    const build = readFileSync(path.join(REPO, 'build.js'), 'utf8');
    const lists = build.slice(0, build.indexOf('async function'));
    expect(lists).not.toMatch(/workbooks/);
  });
});
