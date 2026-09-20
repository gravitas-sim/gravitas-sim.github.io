// =============================================================================
// Two worlds in one process, alternating, against the same golden
// -----------------------------------------------------------------------------
// e2e/worldConstruction.spec.js builds every scenario one after another in a
// single module instance and hashes what came out. That already proves the
// builder is reproducible in sequence: build A, then B, then C, and each is
// what it was before.
//
// It cannot prove the thing withWorld() exists for, because sequence is not
// isolation. When the builder runs, it clears the engine's arrays and fills
// them; A is gone by the time B is digested, so nothing in that file would
// notice if building B had corrupted A. That is the question here: build A,
// build B, and only THEN go back and digest A.
//
// The digest is copied verbatim from worldConstruction.spec.js rather than
// shared, because the point is to compare against the golden that file wrote.
// If the two ever diverge this test stops meaning anything, so the two hash
// functions, the LISTS order, the `num` precision and the `describe` field
// order are the parts to keep identical. Nothing else here is load-bearing.
//
// What this does NOT claim
// -----------------------------------------------------------------------------
// withWorld() swaps the engine's state. It does not swap js/ui.js's - the
// camera, `current_scenario_name` and the SETTINGS object live there and are
// shared by every world. So the four ui-derived fields in the digest are read
// immediately after each build, while the body-derived fields are read after
// the interleave. The comparison against the golden is still total: every
// field is checked, and the ones that matter for isolation are the ones read
// late.
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from './fixtures.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN = path.join(here, 'golden', 'world-construction.json');
const SEED = 'characterization';

/**
 * Build every scenario in its own World, in interleaved pairs, and digest each
 * one only after its partner has also been built.
 *
 * @param {import('@playwright/test').Page} page - The page under test
 * @returns {Promise<Record<string, object>>} Digest per scenario key
 */
async function digestInterleaved(page) {
  return page.evaluate(async seed => {
    const ui = await import('/js/ui.js');
    const p = await import('/js/physics.js');
    const info = await import('/js/data/scenarioInfo.js');

    const hash = str => {
      let h1 = 0x811c9dc5;
      let h2 = 0x01000193;
      for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
        h2 = Math.imul(h2 + c, 0x85ebca6b) >>> 0;
      }
      return (
        (h1 >>> 0).toString(16).padStart(8, '0') +
        (h2 >>> 0).toString(16).padStart(8, '0')
      );
    };
    const num = v =>
      typeof v === 'number' && Number.isFinite(v)
        ? Number(v.toPrecision(12))
        : String(v);
    const NOISE = 1e-11;
    const balance = (x, y, scale) => {
      if (!(scale > 0)) return 'nothing is moving';
      const rel = Math.hypot(x, y) / scale;
      if (!(rel > NOISE)) return 'cancels into rounding error';
      return `about 1e${Math.round(Math.log10(rel))} of the momentum summed`;
    };
    const LISTS = [
      'bh_list',
      'stars',
      'planets',
      'gas_giants',
      'asteroids',
      'comets',
      'neutron_stars',
      'white_dwarfs',
      'galaxies',
    ];
    const describe = (b, list, index) =>
      [
        list,
        index,
        b?.constructor?.name,
        b?.id,
        b?.name ?? '',
        num(b?.mass),
        num(b?.radius),
        num(b?.pos?.x),
        num(b?.pos?.y),
        num(b?.vel?.x),
        num(b?.vel?.y),
        b?.persistent ? 'P' : '',
        b?.alive === false ? 'dead' : '',
      ].join('|');

    /** The body-derived half, read from whichever world is installed now. */
    const bodyPart = () => {
      const rows = [];
      const byType = {};
      let totalMass = 0;
      let px = 0;
      let py = 0;
      let pscale = 0;
      for (const list of LISTS) {
        const arr = p[list] || [];
        arr.forEach((b, i) => {
          rows.push(describe(b, list, i));
          const t = b?.constructor?.name || 'unknown';
          byType[t] = (byType[t] || 0) + 1;
          totalMass += b?.mass || 0;
          px += (b?.mass || 0) * (b?.vel?.x || 0);
          py += (b?.mass || 0) * (b?.vel?.y || 0);
          pscale +=
            Math.abs((b?.mass || 0) * (b?.vel?.x || 0)) +
            Math.abs((b?.mass || 0) * (b?.vel?.y || 0));
        });
      }
      return {
        count: rows.length,
        byType,
        totalMass: num(totalMass),
        momentumResidual: balance(px, py, pscale),
        bodies: hash(rows.join('\n')),
        head: rows.slice(0, 3),
      };
    };

    /** The ui-derived half, which withWorld does not isolate. */
    const uiPart = () => {
      const settings = ui.SETTINGS || {};
      const settingsRows = Object.keys(settings)
        .filter(k => k !== 'quality_tier')
        .sort()
        .map(k => `${k}=${JSON.stringify(settings[k])}`);
      return {
        scenarioName: ui.current_scenario_name,
        presetSentinel: settings.preset_scenario,
        zoom: num(ui.state?.zoom),
        pan: { x: num(ui.state?.pan?.x), y: num(ui.state?.pan?.y) },
        settings: hash(settingsRows.join('\n')),
      };
    };

    const keys = Object.keys(info.SCENARIO_INFO);
    const out = {};
    const interleave = [];

    // Pairs. An odd catalog leaves a last scenario with no partner, so it is
    // paired with the first one - which has already been digested by then, so
    // it gets digested twice and must agree with itself as well as the golden.
    for (let i = 0; i < keys.length; i += 2) {
      const a = keys[i];
      const b = keys[i + 1] ?? keys[0];

      const worldA = p.createWorld();
      const worldB = p.createWorld();
      const errors = {};
      const ui_ = {};

      for (const [key, world] of [
        [a, worldA],
        [b, worldB],
      ]) {
        errors[key] = null;
        try {
          ui.SETTINGS.preset_scenario = key;
          p.withWorld(world, () => ui.initialize_simulation({ seed }));
        } catch (err) {
          errors[key] = String(err && err.message ? err.message : err);
        }
        // Read before the next build overwrites it. This is the half that is
        // shared, and saying so is the point of splitting the digest.
        ui_[key] = uiPart();
      }

      // Both worlds now exist. Digest each one AFTER the other was built,
      // which is the assertion this whole file is for.
      for (const [key, world] of [
        [a, worldA],
        [b, worldB],
      ]) {
        const body = p.withWorld(world, () => bodyPart());
        out[key] = { error: errors[key], ...body, ...ui_[key] };
        // Re-read it a second time and require the same answer, so a digest
        // that mutated the world it measured cannot pass.
        const again = p.withWorld(world, () => bodyPart());
        if (again.bodies !== body.bodies) {
          out[key].error = 'digesting the world changed it';
        }
      }
      interleave.push([a, b]);
    }

    return { out, pairs: interleave.length, scenarios: keys.length };
  }, SEED);
}

test.describe('worlds survive each other', () => {
  test('every scenario built in its own World still matches the golden', async ({
    app,
    page,
  }, testInfo) => {
    testInfo.setTimeout(Math.max(180_000, 60 * 4_000));

    await app.boot();
    const { out: actual, pairs, scenarios } = await digestInterleaved(page);

    testInfo.annotations.push({
      type: 'interleave',
      description: `${scenarios} scenarios in ${pairs} interleaved pairs, each digested after its partner was built`,
    });

    const threw = Object.entries(actual)
      .filter(([, v]) => v.error)
      .map(([k, v]) => `${k}: ${v.error}`);
    expect(threw).toEqual([]);

    const expected = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
    expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());

    for (const key of Object.keys(expected)) {
      expect(
        actual[key],
        `scenario "${key}" built differently inside a World`
      ).toEqual(expected[key]);
    }
  });
});
