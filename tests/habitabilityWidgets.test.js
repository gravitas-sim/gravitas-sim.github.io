import { describe, test, expect } from '@jest/globals';
import {
  relativeInsolation,
  insolationWm2,
  distanceForInsolation,
  habitableZoneBounds,
  habitableZoneStatus,
  effectiveFluxAt,
  estimateLuminosityFromMass,
  stellarPropertiesFor,
  orbitalStateAt,
  orbitExtremes,
  eccentricAnomaly,
  fractionOfYearInZone,
  EARTH_INSOLATION_WM2,
  HZ_TEFF_RANGE,
} from '../js/habitability.js';
import {
  TRAPPIST1_STAR,
  TRAPPIST1_PLANETS,
  trappistPlanet,
} from '../js/data/trappist1.js';
import {
  HABITABILITY_WIDGETS,
  candidatePlanets,
  comparisonStars,
} from '../js/habitabilityWidgets.js';
import { getWidget, widgetDefaults } from '../js/widgets.js';
import { INVESTIGATIONS, getInvestigation } from '../js/data/investigations.js';
import { SIM_UNITS_PER_AU, auToSim, simToAu } from '../js/units.js';
import { SCENARIO_INFO } from '../js/data/scenarioInfo.js';

const SUN = { luminositySolar: 1, teffK: 5772 };
const TRAPPIST = {
  luminositySolar: TRAPPIST1_STAR.luminosityInSuns,
  teffK: TRAPPIST1_STAR.temperatureK,
};

describe('the inverse-square law', () => {
  test('the three distances the lesson has students measure', () => {
    // These exact numbers are quoted on the lesson screens, so if the physics
    // ever moved the lesson would be telling students something false.
    expect(relativeInsolation(1, 0.5)).toBeCloseTo(4, 10);
    expect(relativeInsolation(1, 1)).toBeCloseTo(1, 10);
    expect(relativeInsolation(1, 2)).toBeCloseTo(0.25, 10);
  });

  test('three times further gives a ninth', () => {
    expect(relativeInsolation(1, 3)).toBeCloseTo(1 / 9, 10);
  });

  test('doubling the distance always quarters the insolation', () => {
    for (const d of [0.2, 0.7, 1.4, 5]) {
      expect(
        relativeInsolation(1, 2 * d) / relativeInsolation(1, d)
      ).toBeCloseTo(0.25, 10);
    }
  });

  test('insolation scales with luminosity at fixed distance', () => {
    expect(relativeInsolation(4, 1)).toBeCloseTo(4, 10);
    expect(relativeInsolation(0.25, 1)).toBeCloseTo(0.25, 10);
  });

  test('the physical unit agrees with the relative one', () => {
    expect(insolationWm2(1, 1)).toBeCloseTo(EARTH_INSOLATION_WM2, 6);
    expect(insolationWm2(1, 0.5)).toBeCloseTo(4 * EARTH_INSOLATION_WM2, 6);
  });

  test('distance and insolation invert each other', () => {
    for (const d of [0.05, 0.5, 1, 2.5]) {
      const s = relativeInsolation(1, d);
      expect(distanceForInsolation(1, s)).toBeCloseTo(d, 10);
    }
  });

  test('a nonsensical distance gives no answer rather than a wrong one', () => {
    expect(Number.isNaN(relativeInsolation(1, 0))).toBe(true);
    expect(Number.isNaN(relativeInsolation(1, -1))).toBe(true);
  });
});

describe('the distance scale is the one the rest of Gravitas uses', () => {
  test('one hundred simulation units to the astronomical unit', () => {
    // The habitable-zone renderer used to carry its own constant, 160, left
    // over from a Solar System scenario that has since been rebuilt at 100.
    // The ring was drawn sixty percent too far out, which put Earth inside the
    // inner edge.
    expect(SIM_UNITS_PER_AU).toBe(100);
    expect(auToSim(1)).toBe(100);
    expect(auToSim(0.387)).toBeCloseTo(38.7, 10);
    expect(simToAu(100)).toBe(1);
  });

  test('the conversion round-trips', () => {
    for (const au of [0.0115, 0.387, 1, 30.07]) {
      expect(simToAu(auToSim(au))).toBeCloseTo(au, 12);
    }
  });

  test('Earth sits inside the Sun conservative zone at this scale', () => {
    const b = habitableZoneBounds(SUN, 'conservative');
    expect(auToSim(b.innerAU)).toBeLessThan(100);
    expect(auToSim(b.outerAU)).toBeGreaterThan(100);
  });
});

describe('habitable zone boundaries', () => {
  test('the Sun comes out where the published prescription says', () => {
    // Kopparapu et al. (2013): conservative 0.99-1.70 AU, optimistic 0.75-1.77.
    const c = habitableZoneBounds(SUN, 'conservative');
    const o = habitableZoneBounds(SUN, 'optimistic');
    expect(c.innerAU).toBeCloseTo(0.98, 2);
    expect(c.outerAU).toBeCloseTo(1.69, 2);
    expect(o.innerAU).toBeCloseTo(0.75, 2);
    expect(o.outerAU).toBeCloseTo(1.77, 2);
  });

  test('the optimistic zone contains the conservative one', () => {
    for (const star of [SUN, TRAPPIST, { luminositySolar: 5, teffK: 6600 }]) {
      const c = habitableZoneBounds(star, 'conservative');
      const o = habitableZoneBounds(star, 'optimistic');
      expect(o.innerAU).toBeLessThan(c.innerAU);
      expect(o.outerAU).toBeGreaterThan(c.outerAU);
    }
  });

  test('inner is always inside outer, and both are finite and positive', () => {
    for (const L of [0.0001, 0.001, 0.1, 1, 10, 100]) {
      for (const T of [2600, 3200, 4500, 5772, 7000]) {
        const b = habitableZoneBounds({ luminositySolar: L, teffK: T });
        expect(Number.isFinite(b.innerAU)).toBe(true);
        expect(Number.isFinite(b.outerAU)).toBe(true);
        expect(b.innerAU).toBeGreaterThan(0);
        expect(b.innerAU).toBeLessThan(b.outerAU);
      }
    }
  });

  test('a brighter star pushes the same boundary further out', () => {
    const dim = habitableZoneBounds({ luminositySolar: 0.01, teffK: 5772 });
    const sun = habitableZoneBounds(SUN);
    const bright = habitableZoneBounds({ luminositySolar: 25, teffK: 5772 });
    expect(dim.innerAU).toBeLessThan(sun.innerAU);
    expect(sun.innerAU).toBeLessThan(bright.innerAU);
    expect(dim.outerAU).toBeLessThan(sun.outerAU);
    expect(sun.outerAU).toBeLessThan(bright.outerAU);
  });

  test('at fixed temperature the zone moves as the square root of luminosity', () => {
    // Hundred times the luminosity, ten times the distance: the relation the
    // lesson states in words after students have watched it happen.
    const a = habitableZoneBounds({ luminositySolar: 1, teffK: 5772 });
    const b = habitableZoneBounds({ luminositySolar: 100, teffK: 5772 });
    expect(b.innerAU / a.innerAU).toBeCloseTo(10, 6);
    expect(b.outerAU / a.outerAU).toBeCloseTo(10, 6);
  });

  test('the four named boundaries stay in order', () => {
    for (const T of [2600, 4000, 5772, 7200]) {
      const rv = effectiveFluxAt('recentVenus', T);
      const rg = effectiveFluxAt('runawayGreenhouse', T);
      const mg = effectiveFluxAt('maximumGreenhouse', T);
      const em = effectiveFluxAt('earlyMars', T);
      // More incident light is needed at the hot edge than the cold one.
      expect(rv).toBeGreaterThan(rg);
      expect(rg).toBeGreaterThan(mg);
      expect(mg).toBeGreaterThan(em);
    }
  });

  test('a star outside the published fit is flagged, not silently extrapolated', () => {
    const cool = habitableZoneBounds({ luminositySolar: 1e-4, teffK: 2100 });
    expect(cool.extrapolated).toBe(true);
    expect(cool.teffUsed).toBe(HZ_TEFF_RANGE.min);
    expect(Number.isFinite(cool.innerAU)).toBe(true);
    const sun = habitableZoneBounds(SUN);
    expect(sun.extrapolated).toBe(false);
  });

  test('the boundaries carry the names the lesson uses', () => {
    const c = habitableZoneBounds(SUN, 'conservative');
    const o = habitableZoneBounds(SUN, 'optimistic');
    expect(c.innerLabel).toBe('Runaway Greenhouse');
    expect(c.outerLabel).toBe('Maximum Greenhouse');
    expect(o.innerLabel).toBe('Recent Venus');
    expect(o.outerLabel).toBe('Early Mars');
  });
});

describe('where a planet sits', () => {
  test('inside, too close and too far are told apart', () => {
    const b = habitableZoneBounds(SUN, 'conservative');
    expect(habitableZoneStatus(1.0, b).status).toBe('inside');
    expect(habitableZoneStatus(0.4, b).status).toBe('inner');
    expect(habitableZoneStatus(5, b).status).toBe('outer');
  });

  test('the status is described in words, not by colour alone', () => {
    const b = habitableZoneBounds(SUN);
    for (const d of [0.4, 1.0, 5]) {
      expect(habitableZoneStatus(d, b).label.length).toBeGreaterThan(8);
    }
  });

  test('position within the zone runs from zero at the inner edge to one at the outer', () => {
    const b = habitableZoneBounds(SUN, 'conservative');
    expect(habitableZoneStatus(b.innerAU, b).positionInZone).toBeCloseTo(0, 6);
    expect(habitableZoneStatus(b.outerAU, b).positionInZone).toBeCloseTo(1, 6);
  });
});

describe('stellar properties', () => {
  test('a measured luminosity is used, never overwritten by a mass relation', () => {
    // The old renderer derived L from mass and floored it at 0.01. For
    // TRAPPIST-1 that is eighteen times its real luminosity, which moves its
    // habitable zone out by more than a factor of four.
    const star = {
      massInSuns: TRAPPIST1_STAR.massInSuns,
      luminosityInSuns: TRAPPIST1_STAR.luminosityInSuns,
      temperature: TRAPPIST1_STAR.temperatureK,
    };
    const p = stellarPropertiesFor(star);
    expect(p.luminositySolar).toBe(0.000553);
    expect(p.luminosityEstimated).toBe(false);
    expect(p.teffK).toBe(2566);
    expect(p.teffEstimated).toBe(false);
    expect(p.luminositySolar).toBeLessThan(0.01);
  });

  test('a star with no measured luminosity gets a labelled estimate', () => {
    const p = stellarPropertiesFor({ massInSuns: 1 });
    expect(p.luminosityEstimated).toBe(true);
    expect(p.luminositySolar).toBeCloseTo(1, 6);
  });

  test('mass is read from simulation units when massInSuns is absent', () => {
    const p = stellarPropertiesFor({ mass: 2000 }, 1000);
    expect(p.massSolar).toBe(2);
  });

  test('the fallback relation is monotonic and has no floor', () => {
    let last = 0;
    for (const m of [0.05, 0.1, 0.3, 0.5, 1, 3, 10]) {
      const L = estimateLuminosityFromMass(m);
      expect(L).toBeGreaterThan(last);
      last = L;
    }
    // No 0.01 floor: a very small star must be allowed to be very faint.
    expect(estimateLuminosityFromMass(0.09)).toBeLessThan(0.01);
  });
});

describe('TRAPPIST-1', () => {
  test('the shared data has all seven planets, in order', () => {
    expect(TRAPPIST1_PLANETS).toHaveLength(7);
    expect(TRAPPIST1_PLANETS.map(p => p.name)).toEqual([
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
    ]);
    for (let i = 1; i < TRAPPIST1_PLANETS.length; i++) {
      expect(TRAPPIST1_PLANETS[i].a).toBeGreaterThan(
        TRAPPIST1_PLANETS[i - 1].a
      );
      expect(TRAPPIST1_PLANETS[i].periodDays).toBeGreaterThan(
        TRAPPIST1_PLANETS[i - 1].periodDays
      );
    }
    expect(trappistPlanet('e').a).toBeCloseTo(0.0292, 4);
  });

  test('the star carries measured values, not derived ones', () => {
    expect(TRAPPIST1_STAR.luminosityInSuns).toBeCloseTo(0.000553, 6);
    expect(TRAPPIST1_STAR.temperatureK).toBe(2566);
    // The renderer used to derive luminosity as M^3.5 with a floor of 0.01,
    // which for this star is eighteen times its real value and moves its
    // habitable zone out by more than a factor of four.
    const oldWay = Math.max(0.01, TRAPPIST1_STAR.massInSuns ** 3.5);
    expect(oldWay / TRAPPIST1_STAR.luminosityInSuns).toBeGreaterThan(15);
    const oldZone = habitableZoneBounds({
      luminositySolar: oldWay,
      teffK: TRAPPIST1_STAR.temperatureK,
    });
    expect(
      oldZone.innerAU / habitableZoneBounds(TRAPPIST).innerAU
    ).toBeGreaterThan(4);
    // Even the better fallback is only good to tens of percent here, which is
    // why a measured luminosity must always win.
    const guessed = estimateLuminosityFromMass(TRAPPIST1_STAR.massInSuns);
    expect(guessed / TRAPPIST1_STAR.luminosityInSuns).toBeGreaterThan(1.3);
  });

  test('the planets classify against the model, and the model puts three inside', () => {
    // Classification, not a hardcoded verdict: the test asks the model where
    // each planet falls rather than asserting that any planet is habitable.
    const b = habitableZoneBounds(TRAPPIST, 'conservative');
    const status = Object.fromEntries(
      TRAPPIST1_PLANETS.map(p => [p.name, habitableZoneStatus(p.a, b).status])
    );
    expect(status).toEqual({
      b: 'inner',
      c: 'inner',
      d: 'inner',
      e: 'inside',
      f: 'inside',
      g: 'inside',
      h: 'outer',
    });
  });

  test('its zone is far closer in than the Sun’s', () => {
    const t = habitableZoneBounds(TRAPPIST, 'conservative');
    const s = habitableZoneBounds(SUN, 'conservative');
    expect(t.outerAU).toBeLessThan(s.innerAU / 10);
    // The whole system fits well inside Mercury's orbit.
    expect(TRAPPIST1_PLANETS.at(-1).a).toBeLessThan(0.387);
  });

  test('the insolations match the published values', () => {
    const S = a => relativeInsolation(TRAPPIST1_STAR.luminosityInSuns, a);
    expect(S(trappistPlanet('e').a)).toBeCloseTo(0.65, 2);
    expect(S(trappistPlanet('f').a)).toBeCloseTo(0.37, 2);
    expect(S(trappistPlanet('g').a)).toBeCloseTo(0.25, 2);
    expect(S(trappistPlanet('b').a)).toBeGreaterThan(4);
  });
});

describe('eccentric orbits', () => {
  const orbit = { semiMajorAU: 1.2, eccentricity: 0.45, luminositySolar: 1 };

  test('Kepler’s equation is solved, not approximated away', () => {
    for (const e of [0, 0.2, 0.6, 0.9]) {
      for (const M of [0, 1, 3, 5.5]) {
        const E = eccentricAnomaly(M, e);
        expect(E - e * Math.sin(E)).toBeCloseTo(M, 9);
      }
    }
  });

  test('a circular orbit has constant distance and constant insolation', () => {
    const circ = { semiMajorAU: 1, eccentricity: 0, luminositySolar: 1 };
    for (const phase of [0, 0.13, 0.5, 0.77, 0.99]) {
      const s = orbitalStateAt(circ, phase);
      expect(s.distanceAU).toBeCloseTo(1, 10);
      expect(s.insolation).toBeCloseTo(1, 10);
    }
  });

  test('insolation peaks at periapsis and bottoms at apoapsis', () => {
    const peri = orbitalStateAt(orbit, 0);
    const apo = orbitalStateAt(orbit, 0.5);
    expect(peri.distanceAU).toBeCloseTo(1.2 * 0.55, 8);
    expect(apo.distanceAU).toBeCloseTo(1.2 * 1.45, 8);
    let max = -Infinity;
    let min = Infinity;
    for (let i = 0; i < 500; i++) {
      const s = orbitalStateAt(orbit, i / 500);
      max = Math.max(max, s.insolation);
      min = Math.min(min, s.insolation);
    }
    expect(peri.insolation).toBeCloseTo(max, 4);
    expect(apo.insolation).toBeCloseTo(min, 4);
  });

  test('the extremes agree with the sampled orbit', () => {
    const e = orbitExtremes(orbit);
    expect(e.periapsisAU).toBeCloseTo(0.66, 8);
    expect(e.apoapsisAU).toBeCloseTo(1.74, 8);
    expect(e.periapsisInsolation).toBeCloseTo(1 / 0.66 ** 2, 6);
    expect(e.apoapsisInsolation).toBeCloseTo(1 / 1.74 ** 2, 6);
  });

  test('the planet spends more of its year in the outer half', () => {
    // Kepler's second law. An animation that moved the planet at a constant
    // angular rate would get this backwards, and the whole section depends on
    // it being right.
    let outer = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) {
      if (orbitalStateAt(orbit, (i + 0.5) / n).distanceAU > orbit.semiMajorAU)
        outer++;
    }
    expect(outer / n).toBeGreaterThan(0.55);
  });

  test('the fraction of the year inside the zone is a fraction', () => {
    const bounds = habitableZoneBounds(SUN, 'conservative');
    for (const e of [0, 0.1, 0.3, 0.5, 0.6]) {
      for (const a of [0.7, 1, 1.2, 1.6]) {
        const f = fractionOfYearInZone(
          { semiMajorAU: a, eccentricity: e, luminositySolar: 1 },
          bounds
        );
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(1);
      }
    }
  });

  test('an orbit entirely inside the zone spends all of its year there', () => {
    const bounds = habitableZoneBounds(SUN, 'conservative');
    const inside = { semiMajorAU: 1.3, eccentricity: 0.05, luminositySolar: 1 };
    expect(fractionOfYearInZone(inside, bounds)).toBe(1);
  });

  test('an orbit entirely outside the zone spends none of it there', () => {
    const bounds = habitableZoneBounds(SUN, 'conservative');
    const outside = { semiMajorAU: 8, eccentricity: 0.05, luminositySolar: 1 };
    expect(fractionOfYearInZone(outside, bounds)).toBe(0);
  });

  test('time inside differs from arc inside, which is why it is measured in time', () => {
    const bounds = habitableZoneBounds(SUN, 'conservative');
    const o = { semiMajorAU: 1.2, eccentricity: 0.45, luminositySolar: 1 };
    const byTime = fractionOfYearInZone(o, bounds);
    // Sampling evenly in true anomaly samples the path, not the year.
    let arc = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) {
      const nu = (2 * Math.PI * (i + 0.5)) / n;
      const r =
        (o.semiMajorAU * (1 - o.eccentricity ** 2)) /
        (1 + o.eccentricity * Math.cos(nu));
      if (r >= bounds.innerAU && r <= bounds.outerAU) arc++;
    }
    expect(Math.abs(byTime - arc / n)).toBeGreaterThan(0.02);
  });
});

describe('the instruments', () => {
  test('every one is registered and reachable by id', () => {
    for (const w of HABITABILITY_WIDGETS) {
      expect(getWidget(w.id)).toBe(w);
      expect(typeof w.draw).toBe('function');
      expect(typeof w.readout).toBe('function');
    }
  });

  test('readouts survive both ends of every slider', () => {
    for (const w of HABITABILITY_WIDGETS) {
      for (const end of ['min', 'max']) {
        for (const spec of [
          {},
          { showZone: true },
          { compare: true },
          { reveal: true },
        ]) {
          const v = widgetDefaults(w);
          for (const c of w.controls) v[c.id] = c[end];
          w.reset?.(v, { autorun: false, spec });
          const rows = w.readout(v, undefined, spec);
          for (const row of rows) {
            expect(String(row.value)).not.toMatch(/NaN|undefined|Infinity/);
          }
        }
      }
    }
  });

  test('every preset only sets controls the widget has, within range', () => {
    for (const w of HABITABILITY_WIDGETS) {
      for (const p of w.presets || []) {
        for (const [key, value] of Object.entries(p.values)) {
          const c = w.controls.find(x => x.id === key);
          expect(c).toBeTruthy();
          expect(value).toBeGreaterThanOrEqual(c.min);
          expect(value).toBeLessThanOrEqual(c.max);
        }
      }
    }
  });

  test('the closing activity offers one clearly better first target', () => {
    const cands = candidatePlanets();
    expect(cands).toHaveLength(3);
    // All three receive similar starlight: the choice is about everything else.
    const S = cands.map(c => c.insolation);
    expect(Math.max(...S) / Math.min(...S)).toBeLessThan(1.2);
    for (const c of cands) {
      expect(c.facts.length).toBeGreaterThanOrEqual(3);
      // No candidate is claimed to be habitable, inhabited, or known to have
      // water. Careful negations such as "nothing here shows the planet is
      // habitable" are the wording that is wanted, so the test looks for
      // assertions rather than for the word itself.
      expect(c.verdict).not.toMatch(
        /\bhas life\b|\bproves\b|\bwe know\b|\bconfirmed\b|\bhas (liquid )?water\b/i
      );
      expect(c.verdict).not.toMatch(
        /^(?!.*\bnot?h?i?n?g?\b).*\bis habitable\b/i
      );
    }
  });

  test('the comparison stars span a useful range of luminosity', () => {
    const stars = comparisonStars();
    expect(stars.length).toBeGreaterThanOrEqual(3);
    const L = stars.map(s => s.L);
    expect(Math.max(...L) / Math.min(...L)).toBeGreaterThan(100);
    for (const s of stars) {
      expect(s.teff).toBeGreaterThan(0);
      expect(s.L).toBeGreaterThan(0);
    }
  });

  test('the orbit instrument keeps time with Kepler, not with a constant rate', () => {
    const w = getWidget('hz-orbit');
    const v = widgetDefaults(w, { ecc: 0.5, semi: 1.2 });
    w.reset(v, { autorun: true, spec: {} });
    // A quarter of the year in: a constant-rate planet would be at 90 degrees.
    w.step(v, 0.25 / 0.11, {});
    const c = w.compute(v, {});
    expect(c.now.distanceAU).toBeGreaterThan(1.2);
  });
});

describe('the Goldilocks investigation', () => {
  const inv = getInvestigation('goldilocks-question');

  test('is registered and substantial', () => {
    expect(inv).toBeTruthy();
    expect(inv.steps.length).toBeGreaterThanOrEqual(26);
    expect(inv.title).toBe('The Goldilocks Question');
    expect(INVESTIGATIONS.at(-1).id).toBe('goldilocks-question');
  });

  test('every tool it names resolves through the registry', () => {
    for (const step of inv.steps) {
      if (!step.tool) continue;
      expect(getWidget(step.tool.id)).toBeTruthy();
    }
    // And it exercises all six of the instruments built for it.
    const used = new Set(inv.steps.filter(s => s.tool).map(s => s.tool.id));
    for (const w of HABITABILITY_WIDGETS) expect(used.has(w.id)).toBe(true);
  });

  test('the numbers on its screens match the physics module', () => {
    const text = inv.steps
      .map(s => `${s.body} ${s.because || ''} ${s.tip || ''}`)
      .join(' ')
      .replace(/\s+/g, ' ');
    // Quoted values that would silently rot if the model changed. The prose is
    // free to phrase the range however it likes; what is pinned is that the
    // numbers on the page are the numbers the module produces.
    const sun = habitableZoneBounds(SUN, 'conservative');
    expect(sun.innerAU.toFixed(2)).toBe('0.98');
    expect(sun.outerAU.toFixed(2)).toBe('1.69');
    expect(text).toContain('0.98');
    expect(text).toContain('1.69');

    const sunWide = habitableZoneBounds(SUN, 'optimistic');
    expect(sunWide.innerAU.toFixed(2)).toBe('0.75');
    expect(sunWide.outerAU.toFixed(2)).toBe('1.77');
    expect(text).toContain('0.75');
    expect(text).toContain('1.77');

    // The red dwarf and bright star ranges quoted in the tips.
    expect(text).toContain('0.042 to 0.080 AU');
    const red = habitableZoneBounds({ luminositySolar: 0.0015, teffK: 3000 });
    expect(red.innerAU.toFixed(3)).toBe('0.042');
    expect(red.outerAU.toFixed(3)).toBe('0.080');
  });

  test('the live-simulation steps load scenarios that exist', () => {
    const scenarios = new Set(
      inv.steps.filter(s => s.setup).map(s => s.setup.scenario)
    );
    // The three the lesson depends on. A rename in scenarios.js that missed
    // the lesson would leave a step showing whatever was on screen before it.
    expect(scenarios.has('Habitable Zone Lab')).toBe(true);
    expect(scenarios.has('TRAPPIST-1 System')).toBe(true);
    for (const name of scenarios) expect(SCENARIO_INFO[name]).toBeTruthy();
  });

  test('the numeric answer is the inverse-square value', () => {
    const step = inv.steps.find(s => s.kind === 'numeric');
    expect(step.answer).toBeCloseTo(relativeInsolation(1, 3), 3);
  });

  test('the TRAPPIST-1 measurement step matches the model', () => {
    const step = inv.steps.find(s => s.tool?.id === 'hz-trappist' && s.fields);
    const bounds = habitableZoneBounds(TRAPPIST, 'conservative');
    const inside = TRAPPIST1_PLANETS.filter(
      p => habitableZoneStatus(p.a, bounds).status === 'inside'
    ).map(p => p.name);
    // The step asks students to record the three planets the model puts inside
    // the zone, and nothing else. If the model ever reclassifies one, the field
    // list stops matching and this fails rather than the lesson quietly asking
    // for a reading that is no longer on the panel.
    const asked = step.fields
      .map(f => f.id)
      .filter(id => /^[b-h]$/.test(id))
      .sort();
    expect(asked).toEqual(inside.sort());

    // Every hint is the value the panel actually shows, to the precision the
    // student will read it at.
    for (const f of step.fields) {
      if (/^[b-h]$/.test(f.id)) {
        const p = TRAPPIST1_PLANETS.find(x => x.name === f.id);
        expect(Number(f.hint)).toBeCloseTo(
          relativeInsolation(TRAPPIST.luminositySolar, p.a),
          2
        );
      }
    }
    expect(Number(step.fields.find(f => f.id === 'inner').hint)).toBeCloseTo(
      bounds.innerAU,
      4
    );
    expect(Number(step.fields.find(f => f.id === 'outer').hint)).toBeCloseTo(
      bounds.outerAU,
      4
    );

    // And the validate function accepts exactly those readings.
    const ok = step.validate({
      e: 0.65,
      f: 0.37,
      g: 0.25,
      inner: bounds.innerAU,
      outer: bounds.outerAU,
    });
    expect(ok.level).toBe('ok');
    const bad = step.validate({
      e: 4.18,
      f: 0.37,
      g: 0.25,
      inner: bounds.innerAU,
      outer: bounds.outerAU,
    });
    expect(bad.level).toBe('warn');
  });

  test('the short-answer step carries both a rubric and a model answer', () => {
    const step = inv.steps.find(s => s.kind === 'short');
    // The rubric is for the instructor and reaches the answer key; the because
    // is the model answer a student can unlock after writing their own.
    expect(step.rubric).toBeTruthy();
    expect(step.because).toBeTruthy();
    expect(step.rubric).not.toBe(step.because);
  });

  test('it never claims a planet is habitable or inhabited', () => {
    // The single most important scientific-language requirement in this lesson.
    const text = inv.steps
      .map(
        s =>
          `${s.body} ${s.because || ''} ${s.tip || ''} ${(s.options || []).join(' ')}`
      )
      .join(' ')
      .replace(/\s+/g, ' ');
    // Affirmative claims only. The lesson says "it is not the answer to whether
    // a world is habitable" and "none of this establishes that B is habitable",
    // which are exactly the wording that is wanted, so a bare search for the
    // word would fail on the careful sentences and pass on nothing useful.
    expect(text).not.toMatch(/\bhabitable planets?\b/i);
    expect(text).not.toMatch(/\bwhere life (can|could|might) exist\b/i);
    expect(text).not.toMatch(
      /\b(known|shown|proven|confirmed) to be habitable\b/i
    );
    expect(text).not.toMatch(
      /\b(proves|confirms|establishes) (that )?(it|the planet) is habitable\b/i
    );
    expect(text).not.toMatch(/\btidally locked\b.{0,80}\buninhabitable\b/i);
    expect(text).not.toMatch(/\bmagnetic field\b.{0,60}\brequired\b/i);
    // A green ring is never described as a place.
    expect(text).not.toMatch(/\bregion of space\b(?!.{0,30}\bnot\b)/i);
    // And it does say the careful version.
    expect(text).toMatch(/could potentially maintain liquid water/i);
    expect(text).toMatch(/range of orbital distances/i);
  });

  test('predictions are never presented as graded', () => {
    const predicts = inv.steps.filter(s => s.type === 'predict');
    expect(predicts.length).toBeGreaterThanOrEqual(4);
    for (const p of predicts) {
      expect(typeof p.answer).toBe('number');
      expect(p.because).toBeTruthy();
    }
  });
});
