// =============================================================================
// Characterization: what world construction actually produces
// -----------------------------------------------------------------------------
// This test asserts nothing about whether a scenario is *right*. It asserts that
// building it produces exactly what it produced before, body for body, in the
// same order, from the same seed.
//
// It exists to make a refactor of the world builder safe. `build_simulation` is
// two thousand lines of population, placement and per-scenario special cases,
// and almost none of it is reachable from a unit test: every branch reads the
// live settings object and writes into the engine's own body arrays. The only
// honest way to know that moving it changed nothing is to record what it emits
// for every scenario in the catalog and compare.
//
// What the digest covers, and why each part is here:
//
//   order      Bodies are hashed in list order, and the lists in a fixed order.
//              Several lessons match bodies across runs by index, and the
//              inspector's pinned cards hold ids. Reordering the construction
//              of a scenario would be invisible to every other test here.
//   identity   Each body's id and name go into the digest. Ids come from a
//              counter that restarts with the world, so a body created one step
//              earlier or later shifts every id after it.
//   state      Position, velocity, mass and radius at t=0, before a single step
//              runs, which is precisely the output of construction.
//   settings   The settings object as it stands once the build returns,
//              including the 'None' sentinel that applyPreset leaves behind.
//   camera     Zoom and pan, which several scenarios set themselves.
//   balance    Whether the world is built momentum-balanced - as an order of
//              magnitude, not as digits. See the note on momentumResidual.
//
// The golden file is committed. Regenerate it deliberately, never to make a red
// test green:
//
//   GRAVITAS_UPDATE_WORLD_GOLDEN=1 GRAVITAS_E2E_PORT=4199 \
//     npx playwright test worldConstruction --project=chromium
//
// A diff in this file is a behavior change in world construction. If that
// change was intended, the commit that regenerates the golden should say what
// moved and why.
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from './fixtures.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN = path.join(here, 'golden', 'world-construction.json');
const UPDATING = process.env.GRAVITAS_UPDATE_WORLD_GOLDEN === '1';

// One fixed seed for the whole sweep. The point is reproducibility, not
// coverage of the seed space - `e2e/robustness.spec.js` covers seeds.
const SEED = 'characterization';

/**
 * Build every scenario in the catalog and digest the result.
 *
 * Runs entirely inside one page evaluation: 53 builds over 53 round trips is
 * slower than the whole rest of the file, and nothing here needs the harness
 * between builds.
 *
 * @param {import('@playwright/test').Page} page - The page under test
 * @returns {Promise<Record<string, object>>} Digest per scenario key
 */
async function digestCatalog(page) {
  return page.evaluate(async seed => {
    const ui = await import('/js/ui.js');
    const p = await import('/js/physics.js');
    const info = await import('/js/data/scenarioInfo.js');

    // A stable string hash. Not cryptographic - this only has to change when
    // the input changes, and be identical across runs of the same build.
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

    // Twelve significant digits. Construction is arithmetic on doubles and is
    // bit-reproducible for a given build, but pinning all seventeen would make
    // the golden hostage to a last-bit change in an unrelated constant.
    const num = v =>
      typeof v === 'number' && Number.isFinite(v)
        ? Number(v.toPrecision(12))
        : String(v);

    // How well the net momentum cancels, as an order of magnitude relative to
    // the terms that went into it.
    //
    // Not as a number, because there is no number there. These worlds are built
    // balanced, so the sum is catastrophic cancelation: Hungry Hungry Holes
    // sums 1.9 million units of |m*v| down to 4e-11, a relative residual of
    // 2e-17 - a tenth of a double's epsilon. Every digit of that is rounding,
    // in whatever order the additions happened to land, and pinning twelve of
    // them pins noise. It duly reproduced to the last digit on one machine and
    // differed in the fifth on another, with every body row identical, which is
    // how this was found.
    //
    // Nothing is lost by not pinning it. The bodies hash above already carries
    // every mass and velocity to twelve significant digits, so a construction
    // change that moved a body is caught there. What the balance adds is the
    // claim this line is actually for - that the world is built with no net
    // momentum - and a break in that shows up orders of magnitude away, not in
    // the fifth digit.
    // Below this there is nothing to report. Summing a few hundred terms
    // accumulates rounding of order n * epsilon, which is about 1e-13 here, so
    // the floor is a decade above that. It sits in the middle of an empty gap:
    // across the whole catalog the balanced worlds come out at 1e-13 and
    // below, and the next one up is 1e-9, so no scenario is near enough to the
    // edge for a last-bit difference to move it across.
    const NOISE = 1e-11;
    const balance = (x, y, scale) => {
      if (!(scale > 0)) return 'nothing is moving';
      const rel = Math.hypot(x, y) / scale;
      if (!(rel > NOISE)) return 'cancels into rounding error';
      // Rounded to the nearest decade, not up to the next one. Rounding up
      // puts the bucket edges on the decades themselves, and four scenarios
      // sit exactly on one: everything in them moves the same way, so the net
      // momentum is the summed momentum and the ratio is exactly 1. A last-bit
      // difference either side of that edge would relabel them. The half-decade
      // edges this uses instead are empty - the closest any scenario comes is
      // Jupiter Trojans, which would have to move nine per cent to cross one.
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

    const out = {};
    for (const key of Object.keys(info.SCENARIO_INFO)) {
      let error = null;
      try {
        ui.SETTINGS.preset_scenario = key;
        ui.initialize_simulation({ seed });
      } catch (err) {
        error = String(err && err.message ? err.message : err);
      }

      const rows = [];
      const byType = {};
      let totalMass = 0;
      let px = 0;
      let py = 0;
      // The size of the terms being canceled, so the residual below can be
      // stated as a fraction of them rather than in absolute units.
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

      // Settings are digested rather than stored: the object carries ~90 keys
      // and the golden would be unreadable. Sorted so key order cannot matter.
      const settings = ui.SETTINGS || {};
      // quality_tier is excluded because it is a property of the machine
      // running the test, not of the world being built. It is pinned to 'full'
      // by the boot fixture, so construction here is measured at a known tier;
      // digesting the pin as well would bake a test-harness choice into the
      // golden and make every scenario's hash change if that choice ever did.
      const settingsRows = Object.keys(settings)
        .filter(k => k !== 'quality_tier')
        .sort()
        .map(k => `${k}=${JSON.stringify(settings[k])}`);

      out[key] = {
        error,
        count: rows.length,
        byType,
        totalMass: num(totalMass),
        momentumResidual: balance(px, py, pscale),
        scenarioName: ui.current_scenario_name,
        presetSentinel: settings.preset_scenario,
        zoom: num(ui.state?.zoom),
        pan: { x: num(ui.state?.pan?.x), y: num(ui.state?.pan?.y) },
        bodies: hash(rows.join('\n')),
        settings: hash(settingsRows.join('\n')),
        // Kept in the clear so a failure names something a reader recognizes
        // instead of only a changed hash.
        head: rows.slice(0, 3),
      };
    }
    return out;
  }, SEED);
}

test.describe('world construction is reproducible', () => {
  test('every scenario builds exactly what it built before', async ({
    app,
    page,
  }, testInfo) => {
    // One build per scenario, all in one evaluation. Budget grows with the
    // catalog for the same reason the sweep in robustness.spec.js does.
    const scale = 3_000;
    testInfo.setTimeout(Math.max(120_000, 53 * scale));

    await app.boot();
    const actual = await digestCatalog(page);

    expect(Object.keys(actual).length).toBeGreaterThan(30);

    // A scenario that throws during construction is a failure regardless of
    // what the golden says, so this is checked before the comparison.
    const threw = Object.entries(actual)
      .filter(([, v]) => v.error)
      .map(([k, v]) => `${k}: ${v.error}`);
    expect(threw).toEqual([]);

    if (UPDATING || !fs.existsSync(GOLDEN)) {
      fs.mkdirSync(path.dirname(GOLDEN), { recursive: true });
      fs.writeFileSync(GOLDEN, `${JSON.stringify(actual, null, 2)}\n`);
      test.info().annotations.push({
        type: 'golden',
        description: `wrote ${Object.keys(actual).length} scenarios to ${path.relative(process.cwd(), GOLDEN)}`,
      });
      // Writing the golden is not a passing comparison, and saying so keeps a
      // regeneration run from reading as a verification run.
      expect(UPDATING, 'golden file was missing; regenerated').toBe(true);
      return;
    }

    const expected = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));

    // Compared key by key so a failure names the scenario rather than dumping
    // the whole catalog as one unreadable object diff.
    expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());
    for (const key of Object.keys(expected)) {
      expect(actual[key], `scenario "${key}" builds differently`).toEqual(
        expected[key]
      );
    }
  });
});
