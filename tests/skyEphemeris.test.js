// =============================================================================
// The Sky Lab's planet positions from the ephemeris pack (Roadmap II, Prompt 106)
// -----------------------------------------------------------------------------
// The mission lab's pack (JPL DE441: Venus, Earth, Mars, the Jupiter system
// barycenter, 2025 to 2045) is the planets' source wherever it covers the
// date; the elements stay elsewhere and for Mercury and Saturn.
//
// The independent reference is JPL Horizons itself: astrometric geocentric
// RA and Dec of Venus, Mars and the Jupiter barycenter at fourteen TT epochs,
// fetched by tools/sky-horizons-astrometric.mjs and pinned in
// tests/fixtures/sky/horizons-astrometric.json. Horizons integrates its own
// light-time on DE441; the kernel solves it from the pack's 4 to 7 km fits, so
// agreement is a check of the geocenter, the light-time, the frame and the
// fits together. Measured at the first run: 0.0106 arcsecond at worst; the
// limit below is 0.05 arcsecond, five times that, and far inside the 0.2
// degree the elements are held to.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import * as K from '../js/kernels/sky/index.js';
import { loadEphemerisFile, EPHEMERIS_URL } from '../js/kernels/sky/packs.js';
import { createEphemeris } from '../js/mission/ephemeris.js';
import { PACK, DATA } from '../js/data/ephemeris/solarSystem2025.js';
import {
  altAzEnvelope,
  phaseEnvelope,
  positionBoundDeg,
} from '../js/sky/evidence.js';
import { validateArtifact } from '../js/platform/artifact.js';

const root = f => path.resolve(process.cwd(), f);
const HORIZONS = JSON.parse(
  readFileSync(root('tests/fixtures/sky/horizons-astrometric.json'), 'utf8')
);
const SIDECAR_TEXT = readFileSync(root('sky/ephemeris.json'), 'utf8');
const MANIFEST = JSON.parse(
  readFileSync(root('ephemeris-packs/solar-system-2025-2045.json'), 'utf8')
);
const eph = createEphemeris(PACK, DATA);
const source = K.createPlanetSource(eph);
const stars = K.loadStars(
  JSON.parse(readFileSync(root('sky/bright-stars.json'), 'utf8'))
).filter(s => s.v <= 3);

const DEG = Math.PI / 180;
const sep = (a, b) => {
  const c =
    Math.sin(a.decDeg * DEG) * Math.sin(b.decDeg * DEG) +
    Math.cos(a.decDeg * DEG) *
      Math.cos(b.decDeg * DEG) *
      Math.cos((a.raDeg - b.raDeg) * DEG);
  return Math.acos(Math.min(1, c)) / DEG;
};
const site = { latDeg: 31.6, lonDeg: -94.65 };
const JD = K.julianDate(2026, 10, 12, 3);

describe('against JPL Horizons, astrometric and geocentric', () => {
  for (const id of ['venus', 'mars', 'jupiter']) {
    test(`${id}: the kernel's place from the pack is within 0.05 arcsecond`, () => {
      let worst = 0;
      HORIZONS.epochsJdTt.forEach((jd, i) => {
        const h = HORIZONS.bodies[id][i];
        const k = K.geocentricEquatorial(id, jd, source);
        worst = Math.max(worst, sep(k, h) * 3600);
        // The distance too: 0.5e-6 au is 75 km.
        expect(Math.abs(k.distanceAu - h.distanceAu)).toBeLessThan(5e-7);
      });
      expect(worst).toBeLessThan(0.05);
    });
    test(`${id}: the elements alone stay within the tolerance the gate stated`, () => {
      let worst = 0;
      HORIZONS.epochsJdTt.forEach(
        (jd, i) =>
          (worst = Math.max(
            worst,
            sep(K.geocentricEquatorial(id, jd, null), HORIZONS.bodies[id][i])
          ))
      );
      expect(worst).toBeLessThan(0.2);
    });
  }
  test('the fixture says where it came from', () => {
    expect(HORIZONS.meta.source).toMatch(/Horizons/);
    expect(HORIZONS.meta.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(HORIZONS.epochsJdTt).toHaveLength(14);
  });
});

describe('switching the source', () => {
  test('where the pack covers a planet it is used, and Mercury and Saturn stay on the elements', () => {
    const m = K.skyAt(JD, site, [], { source });
    const via = Object.fromEntries(
      m.objects.filter(o => o.type === 'planet').map(o => [o.id, o.via])
    );
    expect(via).toEqual({
      mercury: 'elements',
      venus: 'ephemeris',
      mars: 'ephemeris',
      jupiter: 'ephemeris',
      saturn: 'elements',
    });
  });
  test('with no source the sky is what it always was, and says so', () => {
    const a = K.skyAt(JD, site, stars);
    const b = K.skyAt(JD, site, stars, { source: null });
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    for (const o of a.objects.filter(o => o.type === 'planet'))
      expect(o.via).toBe('elements');
  });
  test('the two sources agree on every planet within the elements’ tolerance, and differ', () => {
    const a = K.skyAt(JD, site, [], { source: null });
    const b = K.skyAt(JD, site, [], { source });
    for (const id of ['venus', 'mars', 'jupiter']) {
      const pa = a.objects.find(o => o.id === id);
      const pb = b.objects.find(o => o.id === id);
      const d = sep(pa, pb);
      expect(d).toBeGreaterThan(1e-4);
      expect(d).toBeLessThan(0.2);
    }
    for (const id of ['mercury', 'saturn'])
      expect(b.objects.find(o => o.id === id)).toEqual(
        a.objects.find(o => o.id === id)
      );
  });
  test('outside the pack the source steps aside, to the byte', () => {
    for (const jd of [
      K.julianDate(2024, 6, 1, 0),
      K.julianDate(2046, 1, 1, 0),
      K.julianDate(1950, 3, 4, 5),
    ]) {
      const a = K.skyAt(jd, site, [], { source: null });
      const b = K.skyAt(jd, site, [], { source });
      expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    }
  });
  test('the pack’s edges: the light-time margin at the start, the last day at the end', () => {
    const { startJd, stopJd } = source.info;
    expect(source.covers('mars', startJd)).toBe(false);
    expect(source.covers('mars', startJd + 0.04)).toBe(false);
    expect(source.covers('mars', startJd + 0.06)).toBe(true);
    expect(source.covers('mars', stopJd)).toBe(true);
    expect(source.covers('mars', stopJd + 0.001)).toBe(false);
    expect(source.covers('mercury', startJd + 100)).toBe(false);
    expect(source.covers('saturn', startJd + 100)).toBe(false);
    expect(source.covers('earth', startJd + 100)).toBe(false);
    // Just inside the start the whole light-time still lies in the pack.
    expect(() => source.geocentric('jupiter', startJd + 0.06)).not.toThrow();
    expect(() => source.geocentric('jupiter', stopJd)).not.toThrow();
  });
  test('provenance: which source, and how well it knows the planet', () => {
    const jd = HORIZONS.epochsJdTt[3];
    const e = K.planetProvenance(source, 'mars', jd);
    expect(e.via).toBe('ephemeris');
    // 1.04 + 4.18 km (the pack's bounds for Mars and the Earth) at Mars's distance.
    expect(e.positionBoundKm).toBeCloseTo(5.22, 6);
    expect(e.boundDeg).toBeLessThan(1e-4);
    expect(e.boundDeg).toBeGreaterThan(0);
    const o = K.planetProvenance(source, 'saturn', jd);
    expect(o).toEqual({
      via: 'elements',
      boundDeg: 0.2,
      positionBoundKm: null,
    });
    expect(K.planetProvenance(null, 'mars', jd).via).toBe('elements');
  });
  test('the light-time is the distance over c', () => {
    const jd = HORIZONS.epochsJdTt[0];
    const au = K.geocentricEquatorial('mars', jd, source).distanceAu;
    expect(source.lightTimeSeconds('mars', jd)).toBeCloseTo(
      (au * 149597870.7) / 299792.458,
      1
    );
  });
});

describe('readings and events read the same source', () => {
  const jd = K.julianDate(2026, 11, 1, 4);
  test('the altitude-azimuth reader of a planet equals the reader of its Horizons place', () => {
    const t = HORIZONS.epochsJdTt[1];
    const i = 1;
    const jdUt = t - K.deltaT(t) / 86400; // an instant whose TT is the epoch (to 1 ms)
    const h = HORIZONS.bodies.mars[i];
    const viaPlanet = K.altAzReading(
      { type: 'planet', id: 'mars', source },
      jdUt,
      site
    );
    const viaFixed = K.altAzReading(
      { type: 'fixed', raDeg: h.raDeg, decDeg: h.decDeg },
      jdUt,
      site
    );
    expect(Math.abs(viaPlanet.altGeomDeg - viaFixed.altGeomDeg)).toBeLessThan(
      2e-5
    );
    expect(Math.abs(viaPlanet.azDeg - viaFixed.azDeg)).toBeLessThan(2e-5);
  });
  test('rise, transit and set with the source are near the elements’ and not the same', () => {
    const a = K.riseTransitSet({ type: 'planet', id: 'jupiter' }, jd, site);
    const b = K.riseTransitSet(
      { type: 'planet', id: 'jupiter', source },
      jd,
      site
    );
    expect(b.status).toBe(a.status);
    for (const k of ['riseJd', 'transitJd', 'setJd']) {
      expect(b[k]).not.toBeNull();
      // Jupiter's 0.05 degree in the elements is 12 seconds of its transit.
      expect(Math.abs(b[k] - a[k]) * 1440).toBeLessThan(2);
    }
  });
  test('the phase of a planet follows the source, and is close to the elements’', () => {
    const a = K.phaseReading(jd, null);
    const b = K.phaseReading(jd, source);
    for (const id of ['venus', 'mars', 'jupiter']) {
      expect(
        Math.abs(a.planets[id].elongationDeg - b.planets[id].elongationDeg)
      ).toBeLessThan(0.3);
      expect(
        Math.abs(a.planets[id].illuminated - b.planets[id].illuminated)
      ).toBeLessThan(0.01);
      expect(b.planets[id].elongationDeg).not.toBe(a.planets[id].elongationDeg);
    }
    expect(b.planets.saturn).toEqual(a.planets.saturn);
    expect(b.planets.mercury).toEqual(a.planets.mercury);
  });
});

describe('the evidence says where a planet came from', () => {
  const reading = K.altAzReading(
    { type: 'planet', id: 'mars', source },
    JD,
    site
  );
  const viaOf = (src, id) => K.planetProvenance(src, id, K.ttFromUt(JD));
  // A reading well above the horizon, where the refraction spread is not the bound.
  const high = r => ({ ...r, altGeomDeg: 40, altDeg: 40 });
  const ids = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  const ctx = (src, extra = {}) => ({
    site,
    jdUt: JD,
    type: 'planet',
    key: 'mars',
    planet: 'mars',
    planets: {
      pack: src ? `${PACK.id}@${PACK.version}` : null,
      by: Object.fromEntries(ids.map(id => [id, viaOf(src, id)])),
    },
    ...extra,
  });
  test('a planet from the pack is held to the sky chain, one from the elements to 0.2 degree', () => {
    expect(positionBoundDeg('planet', 40, 'ephemeris').deg).toBeCloseTo(
      1 / 60,
      12
    );
    expect(positionBoundDeg('planet', 40, 'elements').deg).toBe(0.2);
    expect(positionBoundDeg('planet', 40).deg).toBe(0.2);
    // Near the horizon it is the weather's either way.
    expect(positionBoundDeg('planet', 2, 'ephemeris').deg).toBeCloseTo(
      20 / 60,
      12
    );
  });
  test('an altitude-azimuth envelope names the pack, the version and each planet’s source', () => {
    const env = altAzEnvelope(high(reading), ctx(source));
    expect(validateArtifact(env)).toEqual([]);
    expect(env.made.sky.pack).toBe(`${PACK.id}@${PACK.version}`);
    expect(env.made.sky.planets).toEqual({
      mercury: 'elements',
      venus: 'ephemeris',
      mars: 'ephemeris',
      jupiter: 'ephemeris',
      saturn: 'elements',
    });
    const alt = env.quantities.find(q => q.id === 'altitude.apparent');
    expect(alt.uncertainty.hi - alt.value).toBeCloseTo(1 / 60, 9);
  });
  test('the same reading from the elements is a different envelope with the wider bound', () => {
    const viaElements = K.altAzReading(
      { type: 'planet', id: 'mars', source: null },
      JD,
      site
    );
    const a = altAzEnvelope(high(reading), ctx(source));
    const b = altAzEnvelope(high(viaElements), ctx(null));
    expect(b.id).not.toBe(a.id);
    expect(b.made.sky.pack).toBeUndefined();
    const alt = b.quantities.find(q => q.id === 'altitude.apparent');
    expect(alt.uncertainty.hi - alt.value).toBeCloseTo(0.2, 9);
  });
  test('the phase envelope says which planets came from the pack', () => {
    const p = K.phaseReading(JD, source);
    const env = phaseEnvelope(p, {
      ...ctx(source),
      type: 'moon',
      planet: null,
    });
    expect(validateArtifact(env)).toEqual([]);
    expect(env.warnings.join(' ')).toMatch(
      /ephemeris pack for venus, mars, jupiter/
    );
    const none = phaseEnvelope(K.phaseReading(JD, null), {
      ...ctx(null),
      type: 'moon',
      planet: null,
    });
    expect(none.warnings.join(' ')).toMatch(/from the same elements/);
  });
});

describe('the sidecar', () => {
  const doc = JSON.parse(SIDECAR_TEXT);
  test('is the module’s runtime part and data, byte for byte, and the manifest knows it', () => {
    expect(SIDECAR_TEXT).toBe(
      `${JSON.stringify({ pack: PACK, data: DATA })}\n`
    );
    expect(MANIFEST.output.sidecar).toBe('sky/ephemeris.json');
    expect(MANIFEST.output.sidecarBytes).toBe(
      globalThis.Buffer.byteLength(SIDECAR_TEXT)
    );
  });
  test('reads to the same states as the module', () => {
    const fromFile = createEphemeris(doc.pack, doc.data);
    for (const id of ['venus', 'earth', 'mars', 'jupiter'])
      expect(fromFile.stateAt(id, 2461234.25)).toEqual(
        eph.stateAt(id, 2461234.25)
      );
  });
  test('the loader asks for the sidecar and refuses a bad answer', async () => {
    const asked = [];
    const ok = await loadEphemerisFile(async url => {
      asked.push(url);
      return { ok: true, json: async () => doc };
    });
    expect(asked).toEqual([EPHEMERIS_URL]);
    expect(ok.pack.id).toBe(PACK.id);
    await expect(
      loadEphemerisFile(async () => ({ ok: false, status: 404 }))
    ).rejects.toThrow(/404/);
  });
});
