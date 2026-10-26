// The planetary parameter pack (Prompt 200): six bodies with the values the
// energy-balance, greenhouse and scale-height models take. A lazy module
// (NEVER_PRECACHED), so it costs the first-visit tier nothing.
//
// PROVENANCE, stated plainly: every number is typed from the NASA Planetary
// Fact Sheets (NSSDCA, public domain as a U.S. Government work) or from the
// cited publications and was NOT checked against them: no table was
// downloaded and so no retrieval date can be recorded, and `checked` stays
// false. What happened instead: Carl read the typed values and said they look
// correct (chat, 2026-10-25; a reader's review, recorded as `reviewedBy` and
// `reviewNote` on every body). That is not a source check and must not be
// quoted as one. There are no exobase conditions here and no escape fields
// (Prompt 199, verdict B).
import { AU_M } from './constants.js';
import { fluxAt, equilibriumTemperature } from './equilibrium.js';

const FACT = 'NASA Planetary Fact Sheets (NSSDCA)';
const REVIEWER = 'Carl, chat 2026-10-25';
const REVIEW_NOTE =
  'reviewed by Carl, chat 2026-10-25: looks correct (a reader, not a check against the source)';

export const PACK_PROVENANCE = Object.freeze({
  source: FACT,
  basis: 'public domain (a U.S. Government work); single values, attributed',
  retrieved: null,
  checked: false,
  reviewedBy: REVIEWER,
  reviewNote: REVIEW_NOTE,
  note: 'typed, not retrieved; semi-major axis in 10^6 km, Bond albedo, measured temperature, gravity and mean molecular weight as the fact sheets list them',
});

/**
 * a: semi-major axis, 10^6 km. albedo: Bond. measuredK: the surface
 * temperature (terrestrial) or the 1-bar level (giants, which have no
 * surface). g: surface or 1-bar gravity, m/s^2. mu: mean molecular weight, u.
 * gases: major constituents, fractions by number, rounded.
 */
export const BODIES = Object.freeze({
  venus: {
    name: 'Venus',
    kind: 'terrestrial',
    reviewedBy: REVIEWER,
    reviewNote: REVIEW_NOTE,
    a: 108.21,
    albedo: 0.76,
    measuredK: 737,
    measuredAt: 'surface',
    g: 8.87,
    mu: 43.45,
    gases: { CO2: 0.965, N2: 0.035 },
  },
  earth: {
    name: 'Earth',
    kind: 'terrestrial',
    reviewedBy: REVIEWER,
    reviewNote: REVIEW_NOTE,
    a: 149.6,
    albedo: 0.306,
    measuredK: 288,
    measuredAt: 'surface',
    g: 9.81,
    mu: 28.97,
    gases: { N2: 0.78, O2: 0.21, Ar: 0.01 },
  },
  mars: {
    name: 'Mars',
    kind: 'terrestrial',
    reviewedBy: REVIEWER,
    reviewNote: REVIEW_NOTE,
    a: 227.92,
    albedo: 0.25,
    measuredK: 210,
    measuredAt: 'surface',
    g: 3.71,
    mu: 43.34,
    gases: { CO2: 0.953, N2: 0.027, Ar: 0.016 },
  },
  jupiter: {
    name: 'Jupiter',
    kind: 'giant',
    reviewedBy: REVIEWER,
    reviewNote: REVIEW_NOTE,
    a: 778.57,
    albedo: 0.343,
    measuredK: 165,
    measuredAt: '1 bar level',
    g: 24.79,
    mu: 2.22,
    gases: { H2: 0.898, He: 0.102 },
    effectiveK: 124.4,
    powerRatio: 1.668,
  },
  uranus: {
    name: 'Uranus',
    kind: 'giant',
    reviewedBy: REVIEWER,
    reviewNote: REVIEW_NOTE,
    a: 2872.46,
    albedo: 0.3,
    measuredK: 76,
    measuredAt: '1 bar level',
    g: 8.87,
    mu: 2.64,
    gases: { H2: 0.825, He: 0.152, CH4: 0.023 },
    effectiveK: 59.1,
    powerRatio: 1.06,
  },
  neptune: {
    name: 'Neptune',
    kind: 'giant',
    reviewedBy: REVIEWER,
    reviewNote: REVIEW_NOTE,
    a: 4495.06,
    albedo: 0.29,
    measuredK: 72,
    measuredAt: '1 bar level',
    g: 11.15,
    mu: 2.53,
    gases: { H2: 0.8, He: 0.19, CH4: 0.015 },
    effectiveK: 59.3,
    powerRatio: 2.61,
  },
});

export const BODY_IDS = Object.freeze(Object.keys(BODIES));

/** Semi-major axis in AU (the IAU astronomical unit, exact). */
export const distanceAu = id => (BODIES[id].a * 1e9) / AU_M;

/**
 * The emission temperature of a body (its own albedo and distance unless
 * overridden) beside its measured temperature, the difference labelled. A giant
 * planet has no surface and emits internal heat, so its row says what it is
 * comparing and that the model leaves the internal heat out.
 */
export function compareWithMeasured(id, { albedo, redistribution = 1 } = {}) {
  const b = BODIES[id];
  if (!b)
    return {
      refused: true,
      model: 'energy balance',
      reason: `no body "${id}"`,
    };
  const flux = fluxAt(1, distanceAu(id));
  const eq = equilibriumTemperature({
    flux,
    bondAlbedo: albedo ?? b.albedo,
    redistribution,
  });
  if (eq.refused) return eq;
  const gap = b.measuredK - eq.temperature;
  return {
    model: eq.model,
    assumes: eq.assumes,
    body: b.name,
    emissionK: eq.temperature,
    measuredK: b.measuredK,
    measuredAt: b.measuredAt,
    differenceK: gap,
    ratio: b.measuredK / eq.temperature,
    label:
      b.kind === 'terrestrial'
        ? gap >= 0
          ? 'measured surface above the emission temperature: warming the energy balance alone does not explain'
          : 'measured surface at or below the emission temperature'
        : 'a giant planet has no surface: the measured value is its 1 bar level, and the model leaves out its internal heat',
  };
}
