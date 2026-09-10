// =============================================================================
// The shared stellar model
// -----------------------------------------------------------------------------
// Three claims are worth testing and one is not. It is not worth testing that
// MIST integrated a star correctly - that is their work and it is published.
// What is worth testing is that the reduction did not damage it, that the
// relations this project layers on top are the ones it says they are, and that
// nothing here will answer a question outside what the models cover.
//
// The reference values below are independent: they come from the published
// literature or from exact analytic limits, never from re-running the same
// expression the implementation uses. Where a number comes from a track, the
// check is against a physical fact about that kind of star rather than against
// the track's own arithmetic.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  PROVENANCE,
  TRACKS,
  TRACK_IDS,
  decodeTrack,
} from '../js/data/stellar/mistTracks.js';
import {
  TEFF_SUN_K,
  R_SUN_M,
  radiusFromLuminosityAndTemperature,
  luminosityFromRadiusAndTemperature,
  temperatureFromLuminosityAndRadius,
  isSelfConsistent,
  luminosityClass,
} from '../js/stellar/geometry.js';
import {
  estimateLuminosityFromMass,
  estimateTeffFromMass,
  estimateMainSequenceLifetime,
} from '../js/stellar/mainSequence.js';
import {
  trackIds,
  trackBounds,
  stateAtAge,
  stateAtEep,
  mainSequenceAt,
  nearestTrack,
  trackSamples,
} from '../js/stellar/tracks.js';
import {
  stellarState,
  stellarStateFor,
  supportsHabitableZone,
  supportsTransitPhotometry,
  spectralType,
  PHASES,
} from '../js/stellar/state.js';

const near = (a, b, rel) => Math.abs(a / b - 1) <= rel;

describe('the Stefan-Boltzmann relation', () => {
  test('the Sun comes out at one solar radius, by construction', () => {
    expect(radiusFromLuminosityAndTemperature(1, TEFF_SUN_K)).toBeCloseTo(
      1,
      12
    );
  });

  test('a solar radius is the IAU nominal value', () => {
    expect(R_SUN_M).toBe(6.957e8);
  });

  test('the three forms invert each other', () => {
    for (const [L, T] of [
      [1, 5772],
      [1e5, 3600],
      [0.0005, 2550],
      [4e4, 35000],
    ]) {
      const R = radiusFromLuminosityAndTemperature(L, T);
      expect(luminosityFromRadiusAndTemperature(R, T)).toBeCloseTo(L, 6);
      expect(temperatureFromLuminosityAndRadius(L, R)).toBeCloseTo(T, 6);
    }
  });

  test('radius goes as the square root of luminosity at fixed temperature', () => {
    const a = radiusFromLuminosityAndTemperature(100, 5772);
    const b = radiusFromLuminosityAndTemperature(400, 5772);
    expect(b / a).toBeCloseTo(2, 9);
  });

  test('radius goes as the inverse square of temperature at fixed luminosity', () => {
    const a = radiusFromLuminosityAndTemperature(1, 5772);
    const b = radiusFromLuminosityAndTemperature(1, 11544);
    expect(a / b).toBeCloseTo(4, 9);
  });

  test('published stars land where the literature puts them', () => {
    // Two anchors whose three published numbers actually close, which is not
    // true of every star in a reference table. Betelgeuse: 1.26e5 Lsun at
    // 3600 K, radius usually quoted near 900 Rsun. Vega: 40 Lsun at 9600 K,
    // mean radius 2.36 Rsun.
    expect(
      near(radiusFromLuminosityAndTemperature(1.26e5, 3600), 900, 0.1)
    ).toBe(true);
    expect(near(radiusFromLuminosityAndTemperature(40, 9600), 2.36, 0.1)).toBe(
      true
    );
  });

  test('nonsense in gives NaN out rather than a number', () => {
    expect(Number.isNaN(radiusFromLuminosityAndTemperature(0, 5772))).toBe(
      true
    );
    expect(Number.isNaN(radiusFromLuminosityAndTemperature(1, 0))).toBe(true);
    expect(Number.isNaN(radiusFromLuminosityAndTemperature(-1, 5772))).toBe(
      true
    );
  });

  test('consistency is checked, not assumed', () => {
    expect(isSelfConsistent(1, 5772, 1)).toBe(true);
    expect(isSelfConsistent(1, 5772, 2)).toBe(false);
  });

  test('the size classes are the stated thresholds', () => {
    expect(luminosityClass(900, 1.26e5)).toBe('supergiant');
    expect(luminosityClass(170, 2400)).toBe('giant');
    expect(luminosityClass(0.0084, 0.056)).toBe('degenerate');
    expect(luminosityClass(1, 1)).toBe('dwarf');
    expect(luminosityClass(NaN, 1)).toBe('unknown');
  });
});

describe('the main-sequence estimates, which are estimates', () => {
  test('the Sun is one of everything', () => {
    expect(estimateLuminosityFromMass(1)).toBeCloseTo(1, 12);
    expect(estimateTeffFromMass(1)).toBeCloseTo(TEFF_SUN_K, 9);
  });

  test('the mass-luminosity relation is steeper than linear everywhere useful', () => {
    for (const m of [0.2, 0.5, 1, 2, 5, 10]) {
      const slope =
        (Math.log(estimateLuminosityFromMass(m * 1.01)) -
          Math.log(estimateLuminosityFromMass(m))) /
        Math.log(1.01);
      expect(slope).toBeGreaterThan(2);
      expect(slope).toBeLessThan(4.5);
    }
  });

  test('the lifetime falls steeply with mass, as fuel over rate', () => {
    // The often-quoted figures: about 10 Gyr for the Sun, about 10 Myr for a
    // twenty solar-mass star. Both come out of M/L rather than being asserted.
    expect(near(estimateMainSequenceLifetime(1) / 1e9, 10, 0.05)).toBe(true);
    expect(estimateMainSequenceLifetime(20) / 1e6).toBeGreaterThan(3);
    expect(estimateMainSequenceLifetime(20) / 1e6).toBeLessThan(40);
    // A tenth of a solar mass outlives the Universe by a wide margin. The
    // exact figure is not worth asserting - see the track comparison below,
    // where the crude estimate and the integrated model differ by a factor of
    // three and the model is the one to believe.
    expect(estimateMainSequenceLifetime(0.2)).toBeGreaterThan(1e11);
  });

  test('a smaller star always lives longer', () => {
    let last = 0;
    for (const m of [20, 10, 5, 2, 1, 0.5, 0.2]) {
      const life = estimateMainSequenceLifetime(m);
      expect(life).toBeGreaterThan(last);
      last = life;
    }
  });
});

describe('the bundled tracks are the published ones, reduced', () => {
  test('provenance names the grid, the composition and the citation', () => {
    expect(PROVENANCE.grid).toBe('MIST v1.2');
    expect(PROVENANCE.composition.feH).toBe(0);
    expect(PROVENANCE.rotation).toMatch(/v\/vcrit = 0/);
    expect(PROVENANCE.cite.join(' ')).toMatch(/Choi/);
    expect(PROVENANCE.cite.join(' ')).toMatch(/Dotter/);
    expect(PROVENANCE.sourceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(PROVENANCE.source).toMatch(/^https:\/\//);
  });

  test('the grid says what it does not model', () => {
    expect(PROVENANCE.notModelled.join(' ')).toMatch(/rotation/i);
    expect(PROVENANCE.notModelled.join(' ')).toMatch(/core collapse/i);
  });

  test('the seven masses are the seven asked for', () => {
    expect(trackIds().map(id => TRACKS[id].initialMassSun)).toEqual([
      0.2, 0.5, 1, 2, 5, 10, 20,
    ]);
  });

  test('the Stefan-Boltzmann check that licences deriving the radius was made', () => {
    expect(PROVENANCE.stefanBoltzmannCheck.rows).toBeGreaterThan(7000);
    expect(PROVENANCE.stefanBoltzmannCheck.impliedTeffSunSpreadK).toBeLessThan(
      1e-6
    );
    expect(near(PROVENANCE.teffSunK, 5772, 0.001)).toBe(true);
  });

  test('the reduction stayed inside its stated tolerance on every track', () => {
    for (const id of TRACK_IDS) {
      expect(TRACKS[id].thinning.logL).toBeLessThanOrEqual(0.01);
      expect(TRACKS[id].thinning.logTeff).toBeLessThanOrEqual(0.005);
      expect(TRACKS[id].count).toBeLessThan(TRACKS[id].sourceRows);
    }
  });

  test('age increases along every track and mass never does', () => {
    for (const id of TRACK_IDS) {
      const t = decodeTrack(id);
      for (let i = 1; i < t.count; i++) {
        expect(t.logAgeYr[i]).toBeGreaterThanOrEqual(t.logAgeYr[i - 1]);
        expect(t.massSun[i]).toBeLessThanOrEqual(t.massSun[i - 1] + 1e-6);
      }
    }
  });

  test('every quantity on every track is finite and positive', () => {
    for (const id of TRACK_IDS) {
      const s = trackSamples(id);
      for (const key of [
        'ageYr',
        'massSun',
        'luminositySun',
        'teffK',
        'radiusSun',
      ]) {
        for (const v of s[key]) {
          expect(Number.isFinite(v)).toBe(true);
          expect(v).toBeGreaterThan(0);
        }
      }
    }
  });

  test('the phase segments are in order and cover the track', () => {
    for (const id of TRACK_IDS) {
      const b = trackBounds(id);
      expect(b.segments.length).toBeGreaterThanOrEqual(2);
      let lastIndex = -1;
      for (const seg of b.segments) {
        expect(PHASES).toContain(seg.key);
        expect(seg.fromIndex).toBeGreaterThanOrEqual(lastIndex);
        expect(seg.toIndex).toBeGreaterThan(seg.fromIndex);
        expect(seg.durationYr).toBeGreaterThan(0);
        lastIndex = seg.toIndex;
      }
      expect(b.segments[0].fromIndex).toBe(0);
      expect(b.segments[b.segments.length - 1].toIndex).toBe(b.samples - 1);
    }
  });

  test('a low-mass track does not pretend to have a giant branch', () => {
    // 0.2 and 0.5 solar masses stop at the end of core hydrogen burning,
    // because MESA stopped them there. There is no red giant branch, no white
    // dwarf, and no invented endpoint after it.
    for (const id of ['m020', 'm050']) {
      const b = trackBounds(id);
      expect(b.segments.map(s => s.key)).toEqual([
        'pre-main-sequence',
        'main-sequence',
      ]);
      expect(b.complete).toBe(false);
      expect(b.endsAtEep).toBe('tams');
      expect(b.endsBecause).toMatch(/core hydrogen/);
    }
  });

  test('a massive track stops before core collapse and says so', () => {
    for (const id of ['m1000', 'm2000']) {
      const b = trackBounds(id);
      expect(b.complete).toBe(false);
      expect(b.endsAtEep).toBe('carbon-burning');
      expect(b.endsBecause).toMatch(/before core collapse/);
      expect(b.segments.map(s => s.key)).not.toContain('red-giant-branch');
    }
  });

  test('the intermediate tracks do reach a white dwarf', () => {
    for (const id of ['m100', 'm200', 'm500']) {
      expect(trackBounds(id).complete).toBe(true);
      expect(trackBounds(id).endsAtEep).toBe('wd-cooling');
    }
  });
});

describe('the tracks against independently known numbers', () => {
  test("the Sun's main-sequence lifetime is about ten billion years", () => {
    const ms = trackBounds('m100').segments.find(
      s => s.key === 'main-sequence'
    );
    expect(near(ms.durationYr / 1e9, 10, 0.15)).toBe(true);
  });

  test('the Sun today is about one solar radius at about 5800 K', () => {
    // The published solar age is 4.57 Gyr. This is a grid model rather than a
    // solar-calibrated one, so a few percent is the right tolerance and a few
    // tens of percent would not be.
    const now = stateAtAge('m100', 4.57e9);
    expect(near(now.radiusSun, 1, 0.06)).toBe(true);
    expect(near(now.teffK, 5772, 0.03)).toBe(true);
    expect(near(now.luminositySun, 1, 0.15)).toBe(true);
    expect(now.phase).toBe('main-sequence');
  });

  test('the Sun brightens across its main sequence, as the standard model says', () => {
    const zams = stateAtEep('m100', 'zams');
    const tams = stateAtEep('m100', 'tams');
    expect(tams.luminositySun / zams.luminositySun).toBeGreaterThan(1.5);
    expect(tams.radiusSun).toBeGreaterThan(zams.radiusSun);
  });

  test('the red giant branch tip is a couple of thousand solar luminosities', () => {
    const tip = stateAtEep('m100', 'rgb-tip');
    expect(tip.luminositySun).toBeGreaterThan(1000);
    expect(tip.luminositySun).toBeLessThan(4000);
    expect(tip.radiusSun).toBeGreaterThan(100);
    expect(tip.teffK).toBeLessThan(3500);
    expect(tip.luminosityClass).toBe('giant');
  });

  test('a Sun-like star ends as a white dwarf of about half a solar mass', () => {
    const b = trackBounds('m100');
    expect(b.finalMassSun).toBeGreaterThan(0.4);
    expect(b.finalMassSun).toBeLessThan(0.7);
  });

  test('a five solar-mass star leaves a heavier white dwarf than a one', () => {
    // The initial-final mass relation, which is monotonic.
    expect(trackBounds('m500').finalMassSun).toBeGreaterThan(
      trackBounds('m200').finalMassSun
    );
    expect(trackBounds('m200').finalMassSun).toBeGreaterThan(
      trackBounds('m100').finalMassSun
    );
  });

  test('a twenty solar-mass star loses several solar masses to its wind', () => {
    const b = trackBounds('m2000');
    expect(b.initialMassSun - b.finalMassSun).toBeGreaterThan(3);
  });

  test('a twenty solar-mass star ends as a red supergiant', () => {
    const end = stateAtAge('m2000', trackBounds('m2000').endYr);
    expect(end.radiusSun).toBeGreaterThan(500);
    expect(end.teffK).toBeLessThan(5000);
    expect(end.luminosityClass).toBe('supergiant');
  });

  test('main-sequence lifetime falls steeply with mass across the grid', () => {
    let last = 0;
    for (const id of [...trackIds()].reverse()) {
      const ms = trackBounds(id).segments.find(s => s.key === 'main-sequence');
      expect(ms.durationYr).toBeGreaterThan(last);
      last = ms.durationYr;
    }
  });

  test('a small star is predicted to outlive the Universe, and that is a prediction', () => {
    const ms = trackBounds('m020').segments.find(
      s => s.key === 'main-sequence'
    );
    expect(ms.durationYr).toBeGreaterThan(1e12);
    // ...and the track stops there rather than continuing into an invented
    // endpoint, which is the thing this test is really guarding.
    expect(trackBounds('m020').complete).toBe(false);
  });

  test('the crude estimate and the integrated model disagree, and by how much', () => {
    // Worth pinning rather than glossing over. The main-sequence estimate is
    // fuel over rate with a fixed burnable fraction; a 0.2 solar-mass star is
    // fully convective and burns very nearly all of its hydrogen rather than a
    // tenth of it, so the model gives about three times the estimate. The
    // estimate is what a star with nothing but a mass gets, and the interface
    // marks those numbers as estimated for exactly this reason.
    const modelled = trackBounds('m020').segments.find(
      s => s.key === 'main-sequence'
    ).durationYr;
    const estimated = estimateMainSequenceLifetime(0.2);
    expect(modelled / estimated).toBeGreaterThan(2);
    expect(modelled / estimated).toBeLessThan(5);

    // For a solar-mass star, where the fixed fraction is about right, they
    // agree to within a few tens of percent.
    const sun = trackBounds('m100').segments.find(
      s => s.key === 'main-sequence'
    ).durationYr;
    expect(near(sun / estimateMainSequenceLifetime(1), 1, 0.35)).toBe(true);
  });
});

describe('querying a track', () => {
  test('an age inside the track gives a state, and outside gives null', () => {
    const b = trackBounds('m100');
    expect(stateAtAge('m100', b.startYr)).toBeTruthy();
    expect(stateAtAge('m100', b.endYr)).toBeTruthy();
    expect(stateAtAge('m100', b.endYr * 10)).toBe(null);
    expect(stateAtAge('m100', -1)).toBe(null);
    expect(stateAtAge('nope', 1e9)).toBe(null);
  });

  test('the state at a sample age is exactly that sample, on every track', () => {
    // Every sample whose stored age is its own. The ones that share an age with
    // a neighbour are skipped and counted below rather than fudged with a loose
    // tolerance: an interval of three hundred years at an age of a billion is
    // not something a stored age can express, and pretending otherwise with a
    // one-percent tolerance would hide it.
    let checked = 0;
    for (const id of trackIds()) {
      const s = trackSamples(id);
      for (let i = 0; i < s.count; i++) {
        if (i > 0 && s.ageYr[i] === s.ageYr[i - 1]) continue;
        if (i < s.count - 1 && s.ageYr[i] === s.ageYr[i + 1]) continue;
        const at = stateAtAge(id, s.ageYr[i]);
        expect(at.luminositySun).toBeCloseTo(s.luminositySun[i], 12);
        expect(at.teffK).toBeCloseTo(s.teffK[i], 9);
        expect(at.radiusSun).toBeCloseTo(s.radiusSun[i], 9);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(1500);
  });

  test('the samples an age cannot reach are counted, and are where they should be', () => {
    // Only the three tracks with an asymptotic giant branch have any, and every
    // one of them is in the thermal pulses. A track with none must have none.
    for (const id of ['m020', 'm050', 'm1000', 'm2000']) {
      expect(trackBounds(id).unreachableByAge).toBe(0);
    }
    for (const id of ['m100', 'm200', 'm500']) {
      expect(trackBounds(id).unreachableByAge).toBeGreaterThan(0);
      expect(trackBounds(id).unreachableByAge).toBeLessThan(
        trackBounds(id).samples / 2
      );
    }
  });

  test('a tied age resolves to the most evolved sample, reproducibly', () => {
    const s = trackSamples('m200');
    const tie = s.ageYr.findIndex((a, i) => i > 0 && a === s.ageYr[i - 1]);
    expect(tie).toBeGreaterThan(0);
    let end = tie;
    while (end + 1 < s.count && s.ageYr[end + 1] === s.ageYr[tie]) end++;
    const at = stateAtAge('m200', s.ageYr[tie]);
    expect(at.luminositySun).toBeCloseTo(s.luminositySun[end], 12);
    // Twice, because "reproducibly" is the claim.
    expect(stateAtAge('m200', s.ageYr[tie]).luminositySun).toBe(
      at.luminositySun
    );
  });

  test('the radius reported is the one Stefan-Boltzmann gives', () => {
    const at = stateAtAge('m500', 1e8);
    expect(at.radiusSun).toBeCloseTo(
      radiusFromLuminosityAndTemperature(at.luminositySun, at.teffK),
      12
    );
  });

  test('the four kinds of time are four different numbers', () => {
    const at = stateAtAge('m100', 6e9);
    expect(at.ageYr).toBe(6e9);
    expect(at.mainSequenceYr).toBeGreaterThan(9e9);
    expect(at.remainingMainSequenceYr).toBeLessThan(at.mainSequenceYr);
    expect(at.remainingMainSequenceYr).toBeGreaterThan(0);
    expect(at.phaseDurationYr).toBeGreaterThan(0);
    // The main sequence is not the whole track and the phase is not the whole
    // main sequence, so these must not be equal by accident.
    expect(at.phaseDurationYr).not.toBe(at.ageYr);
  });

  test('the main-sequence fraction runs 0 to 1 and is null outside', () => {
    expect(stateAtEep('m100', 'zams').mainSequenceFraction).toBeCloseTo(0, 6);
    expect(stateAtEep('m100', 'tams').mainSequenceFraction).toBeCloseTo(1, 6);
    expect(stateAtEep('m100', 'rgb-tip').mainSequenceFraction).toBe(null);
    expect(stateAtEep('m100', 'pms').mainSequenceFraction).toBe(null);
  });

  test('an unknown equivalent evolutionary point gives null, not a guess', () => {
    expect(stateAtEep('m020', 'rgb-tip')).toBe(null);
    expect(stateAtEep('m2000', 'wd-cooling')).toBe(null);
    expect(stateAtEep('m100', 'nonsense')).toBe(null);
  });

  test('every state carries the composition and the grid it came from', () => {
    const at = stateAtAge('m100', 1e9);
    expect(at.grid).toBe('MIST v1.2');
    expect(at.composition.feH).toBe(0);
    expect(at.rotation).toMatch(/v\/vcrit = 0/);
    expect(at.trackId).toBe('m100');
    expect(at.estimated).toBe(false);
  });
});

describe('interpolating a main-sequence star between tracks', () => {
  test('at a grid mass it reproduces that track', () => {
    const grid = stateAtEep('m200', 'zams');
    const interp = mainSequenceAt(2, 0);
    expect(near(interp.luminositySun, grid.luminositySun, 1e-6)).toBe(true);
    expect(near(interp.teffK, grid.teffK, 1e-6)).toBe(true);
  });

  test('between two grid masses it lands between the two tracks', () => {
    const a = stateAtEep('m100', 'zams');
    const b = stateAtEep('m200', 'zams');
    const mid = mainSequenceAt(1.4, 0);
    expect(mid.luminositySun).toBeGreaterThan(a.luminositySun);
    expect(mid.luminositySun).toBeLessThan(b.luminositySun);
    expect(mid.teffK).toBeGreaterThan(a.teffK);
    expect(mid.teffK).toBeLessThan(b.teffK);
    expect(mid.between).toEqual(['m100', 'm200']);
  });

  test('it refuses outside the grid rather than extrapolating', () => {
    expect(mainSequenceAt(0.05, 0)).toBe(null);
    expect(mainSequenceAt(50, 0)).toBe(null);
    expect(mainSequenceAt(NaN, 0)).toBe(null);
  });

  test('the fraction moves it along the main sequence and nowhere else', () => {
    const zams = mainSequenceAt(1.5, 0);
    const tams = mainSequenceAt(1.5, 1);
    expect(tams.luminositySun).toBeGreaterThan(zams.luminositySun);
    expect(zams.phase).toBe('main-sequence');
    expect(tams.phase).toBe('main-sequence');
    expect(tams.remainingMainSequenceYr).toBeCloseTo(0, 6);
    expect(near(zams.remainingMainSequenceYr, zams.mainSequenceYr, 1e-9)).toBe(
      true
    );
  });

  test('a 1.5 solar-mass main-sequence star is where the literature puts it', () => {
    const s = mainSequenceAt(1.5, 0);
    expect(near(s.luminositySun, 5, 0.3)).toBe(true);
    expect(near(s.teffK, 7300, 0.12)).toBe(true);
    expect(near(s.mainSequenceYr / 1e9, 2.7, 0.4)).toBe(true);
  });

  test('the nearest track is the nearest in log mass', () => {
    expect(nearestTrack(0.9)).toBe('m100');
    expect(nearestTrack(0.3)).toBe('m020');
    // In log mass, not linear: 15 is closer to 20 than to 10 on a log axis,
    // which is the right axis for a quantity spanning two decades.
    expect(nearestTrack(13)).toBe('m1000');
    expect(nearestTrack(15)).toBe('m2000');
    expect(nearestTrack(NaN)).toBe(null);
  });
});

describe('the shared description of a star', () => {
  test('a mass and nothing else gives estimates, and names them', () => {
    const s = stellarState({ massSun: 1 });
    expect(s.estimated).toBe(true);
    expect(s.estimatedFields).toEqual(['luminositySun', 'teffK', 'radiusSun']);
    expect(s.luminositySun).toBeCloseTo(1, 9);
    expect(s.teffK).toBeCloseTo(TEFF_SUN_K, 9);
    expect(s.radiusSun).toBeCloseTo(1, 9);
  });

  test('a declared value is never overwritten by an estimate', () => {
    const s = stellarState({
      massSun: 0.0898,
      teffK: 2566,
      luminositySun: 0.000553,
    });
    expect(s.teffK).toBe(2566);
    expect(s.luminositySun).toBe(0.000553);
    expect(s.estimated).toBe(false);
    expect(s.estimatedFields).toEqual([]);
  });

  test('two of the three close the third exactly', () => {
    const fromLT = stellarState({ massSun: 1, luminositySun: 1, teffK: 5772 });
    expect(fromLT.radiusSun).toBeCloseTo(1, 9);
    const fromRT = stellarState({ massSun: 1, radiusSun: 1, teffK: 5772 });
    expect(fromRT.luminositySun).toBeCloseTo(1, 9);
    const fromLR = stellarState({ massSun: 1, luminositySun: 1, radiusSun: 1 });
    expect(fromLR.teffK).toBeCloseTo(5772, 6);
  });

  test('a declared radius is kept even when it disagrees with the other two', () => {
    // Not silently corrected: three numbers that do not close is somebody's
    // half-finished edit, and it is better seen than smoothed over.
    const s = stellarState({
      massSun: 1,
      luminositySun: 1,
      teffK: 5772,
      radiusSun: 2,
    });
    expect(s.radiusSun).toBe(2);
    expect(isSelfConsistent(s.luminositySun, s.teffK, s.radiusSun)).toBe(false);
  });

  test('it reads a simulation body, in either mass unit', () => {
    const bySuns = stellarStateFor({ massInSuns: 2 });
    const byUnits = stellarStateFor({ mass: 2000 }, 1000);
    expect(bySuns.currentMassSun).toBe(2);
    expect(byUnits.currentMassSun).toBe(2);
    expect(bySuns.luminositySun).toBeCloseTo(byUnits.luminositySun, 9);
  });

  test('it reads the modelled fields a star carries', () => {
    const s = stellarStateFor({
      massInSuns: 1,
      temperature: 3070,
      luminosityInSuns: 2386,
      stellarPhase: 'red-giant-branch',
    });
    expect(s.teffK).toBe(3070);
    expect(s.phase).toBe('red-giant-branch');
    expect(s.radiusSun).toBeGreaterThan(150);
    expect(s.luminosityClass).toBe('giant');
    expect(s.estimated).toBe(false);
  });

  test('the state is frozen, so a panel cannot edit a star by editing its card', () => {
    const s = stellarState({ massSun: 1 });
    expect(Object.isFrozen(s)).toBe(true);
    expect(Object.isFrozen(s.estimatedFields)).toBe(true);
  });

  test('an unrecognised phase is not accepted as one', () => {
    expect(stellarState({ massSun: 1, phase: 'wibble' }).phase).toBe(
      'main-sequence'
    );
  });
});

describe('the tools say when they do not apply', () => {
  test('the habitable zone works for a main-sequence star in its fitted range', () => {
    expect(supportsHabitableZone(stellarState({ massSun: 1 })).ok).toBe(true);
  });

  test('and refuses for a giant, for the right reason', () => {
    const giant = stellarState({
      massSun: 1,
      teffK: 3070,
      luminositySun: 2386,
      phase: 'red-giant-branch',
    });
    expect(supportsHabitableZone(giant)).toEqual({
      ok: false,
      reason: 'not-main-sequence',
    });
  });

  test('and refuses outside the temperature range the fit covers', () => {
    const hot = stellarState({
      massSun: 10,
      teffK: 20000,
      luminositySun: 5000,
    });
    expect(supportsHabitableZone(hot).reason).toBe('outside-fit');
  });

  test('transit photometry refuses on a pulsating giant', () => {
    const agb = stellarState({
      massSun: 1,
      teffK: 3000,
      luminositySun: 5000,
      phase: 'thermally-pulsing-agb',
    });
    expect(supportsTransitPhotometry(agb).reason).toBe('phase-unstable');
  });

  test('and accepts an ordinary star', () => {
    expect(supportsTransitPhotometry(stellarState({ massSun: 1 })).ok).toBe(
      true
    );
  });
});

describe('spectral type comes from temperature, not from mass', () => {
  test.each([
    [40000, 'O'],
    [20000, 'B'],
    [8500, 'A'],
    [6500, 'F'],
    [5772, 'G'],
    [4500, 'K'],
    [3000, 'M'],
  ])('%i K is type %s', (teff, type) => {
    expect(spectralType(teff)).toBe(type);
  });

  test('a red giant is an M star however heavy it is', () => {
    // The point of doing this from temperature: the inspector used to derive
    // it from mass, which called a 3000 K solar-mass red giant a G star.
    expect(spectralType(3070)).toBe('M');
  });

  test('nonsense gives a question mark rather than a letter', () => {
    expect(spectralType(NaN)).toBe('?');
    expect(spectralType(0)).toBe('?');
  });
});
