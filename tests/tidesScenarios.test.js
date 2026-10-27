// =============================================================================
// The two ring scenarios, judged against bounds committed before they were built
// (Roadmap III, Prompt 204 part 2)
// -----------------------------------------------------------------------------
// tests/fixtures/tides/display-thresholds.json holds the legs and their bounds,
// committed before either scenario, instrument or lesson existed (and a recorded
// revision after s4 failed). tools/tides-scenarios.mjs runs the engine on each
// scenario in a process of its own, and tests/fixtures/tides/display-record.json
// is what it wrote. This suite
//
//   - checks the record against the kernel and the declarations (no engine);
//   - runs the tool again and requires the same legs to pass and fail, and the
//     same numbers, so a change to the engine, the geometry table or the
//     scenarios that moves a leg fails here with the leg named;
//   - holds the failed legs as FAILED: s2, s3 and s4b did not pass their
//     committed bounds and are reported, not moved. A fix that makes one pass
//     is welcome and changes the list below on purpose.
//
// The control (r3) is the one leg that depends on the exact periapsis (sixty
// bodies, and one that escapes sets the largest extent), so it is held to the
// range the recorded sweep spans, not to one value.
// =============================================================================

/* global URL, process */
import { describe, test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import * as K from '../js/kernels/tides/index.js';
import { ENGINE_GEOMETRY } from '../js/world/build.js';
import THRESHOLDS from './fixtures/tides/display-thresholds.json' with { type: 'json' };

const REC = JSON.parse(
  readFileSync(
    new URL('./fixtures/tides/display-record.json', import.meta.url),
    'utf8'
  )
);
const FAILED = ['s2.eccentricity', 's3.thinning', 's4b.lane'];

describe('the record agrees with the kernel and the declarations', () => {
  test('both scenarios are declared through the geometry table', () => {
    expect(Object.keys(ENGINE_GEOMETRY)).toEqual(
      expect.arrayContaining(['ring-gap', 'roche-pass'])
    );
    expect(THRESHOLDS.scenarios['ring-gap'].declaration.particles).toBe(200);
  });

  test('s1: the ring’s 2:1 radius is the kernel’s resonanceRadius', () => {
    const r = K.resonanceRadius({
      semiMajorAxis: REC.ring.aMoon,
      p: 2,
      q: 1,
    }).radius;
    expect(REC.ring.aResonance).toBeCloseTo(r, 2);
    expect(REC.ring.kernelResonance).toBeCloseTo(r, 2);
    expect(REC.ring.ringInner).toBeLessThan(r);
  });

  test('r1: the limits are the kernel’s for the declared densities, and the pass lies inside both', () => {
    const base = {
      primaryRadius: 1,
      primaryDensity: REC.pass.densityRatio,
      satelliteDensity: 1,
    };
    expect(K.rocheLimit({ ...base, kind: 'rigid' }).inPrimaryRadii).toBeCloseTo(
      REC.pass.kernelRigidRadii,
      3
    );
    expect(K.rocheLimit({ ...base, kind: 'fluid' }).inPrimaryRadii).toBeCloseTo(
      REC.pass.kernelFluidRadii,
      3
    );
    expect(REC.pass.periapsisRadii).toBeLessThan(REC.pass.rigidLimitRadii);
    expect(REC.ctl.periapsisRadii).toBeGreaterThan(
      1.4 * REC.pass.fluidLimitRadii
    );
  });

  test('the legs are exactly the committed ones, and the failed ones are recorded as failed', () => {
    expect(REC.legs.map(l => l.id)).toEqual([
      's1.resonance.radius',
      's2.eccentricity',
      's3.thinning',
      's4b.lane',
      's5.control.thinning',
      's5.control.eccentricity',
      's6.bodies',
      'r1.limits',
      'r2.stretch',
      'r3.control',
      'r4.bodies',
    ]);
    expect(REC.legs.filter(l => !l.pass).map(l => l.id)).toEqual(FAILED);
    expect(THRESHOLDS.scenarios['ring-gap'].checks['s4.shepherd']).toBeTruthy();
    expect(
      THRESHOLDS.scenarios['ring-gap'].revision.checks['s4b.lane']
    ).toBeTruthy();
  });

  test('the control’s sweep is recorded: most nearby periapses hold the clump together, and not all', () => {
    expect(REC.ctlSweep.runs).toBe(8);
    expect(REC.ctlSweep.underBound).toBeGreaterThanOrEqual(4);
    expect(REC.ctlSweep.underBound).toBeLessThan(REC.ctlSweep.runs);
    expect(REC.ctlSweep.ratios.map(r => r.toFixed(2))).toContain(
      REC.ctl.ratio.toFixed(2)
    );
  });
});

describe('the engine, run again in a process of its own per leg', () => {
  test('every leg comes out as recorded', () => {
    const out = execFileSync(process.execPath, ['tools/tides-scenarios.mjs'], {
      cwd: new URL('..', import.meta.url).pathname,
      encoding: 'utf8',
      maxBuffer: 1 << 26,
    });
    const got = Object.fromEntries(
      out
        .split('\n')
        .map(l => l.match(/^(pass|FAIL)\s+(\S+)\s+(\S+)$/))
        .filter(Boolean)
        .map(m => [m[2], { pass: m[1] === 'pass', value: Number(m[3]) }])
    );
    const ratios = REC.ctlSweep.ratios;
    for (const leg of REC.legs) {
      expect(got[leg.id]).toBeDefined();
      if (leg.id === 'r3.control') {
        expect(got[leg.id].value).toBeGreaterThanOrEqual(
          Math.min(...ratios) - 1e-3
        );
        expect(got[leg.id].value).toBeLessThanOrEqual(
          Math.max(...ratios) + 1e-3
        );
        continue;
      }
      expect({ id: leg.id, pass: got[leg.id].pass }).toEqual({
        id: leg.id,
        pass: leg.pass,
      });
      expect(got[leg.id].value).toBeCloseTo(leg.value, 3);
    }
  }, 300000);
});
