// =============================================================================
// Model-checked expectations (Prompt 66, step 7)
// -----------------------------------------------------------------------------
// A numeric question in a lesson carries its expected value as a literal:
// `answer: 84`. A literal is a claim about the model that nothing checks, so
// it drifts when the model moves and nobody finds out. Every literal numeric
// answer is therefore exactly one of:
//
//   MODELS     recomputed from the lesson's own kernel, widget or probe
//              function by tests/modelCheckedExpectations.test.js, which is
//              generated from this table: one test per entry, each proving the
//              literal by the SAME value (the recomputed number rounded to the
//              literal's own significant digits equals the literal, and sits
//              inside the step's tolerance). A tolerance is never loosened to
//              make an entry pass; a mismatch is a finding.
//   SOURCED    a published value, carried with its source (the same
//              {text, doi | bibcode | url} shape js/data/realSystemSources.js
//              uses for the `sources` field of Prompt 62).
//   UNCHECKED  an explicit, justified allowlist of what is not yet either.
//              It can only shrink: the author check refuses a numeric literal
//              that is in none of the three, refuses an allowlist entry for a
//              step that is not there or is now checked, and
//              tests/modelCheckedExpectations.test.js pins its size.
//
// These live here and not on the steps for the reason D-SRC-01 gives for the
// real-system sources: bytes. Every lesson route is at its ceiling, a
// recomputation is code, and nothing shipped needs to read any of it. The
// check is Node-only (author:check and Jest), so it costs no route a byte.
// Entries are keyed `lesson-id/step-sid`; a sid is stable (id/step), so
// inserting a step above one moves nothing here.
// =============================================================================

import {
  G_SI,
  SOLAR_MASS_KG,
  SOLAR_RADIUS_M,
  EARTH_MASS_KG,
  EARTH_RADIUS_M,
  JUPITER_MASS_KG,
  JUPITER_RADIUS_M,
  AU_METERS,
  tidalAcceleration,
  tidalToSelfGravity,
  bulkDensity,
  massFromDensity,
} from '../../js/tidalPhysics.js';
import { schwarzschildRadiusM } from '../../js/blackHolePhysics.js';
import { radialVelocitySemiAmplitude } from '../../js/exoplanetObservables.js';
import { HD209458 } from '../../js/data/exoplanetSystems.js';
import { relativeInsolation } from '../../js/habitability.js';
import {
  asymptoticSpeed as mondAsymptoticSpeed,
  A0_GALACTIC,
} from '../../js/mond.js';
import { virialMass } from '../../js/darkMatter.js';
import { hohmann } from '../../js/maneuver.js';
import { maximumDeltaV } from '../../js/gravityAssist.js';
import { laplaceArgument } from '../../js/resonance/elements.js';
import { lagrangePoints } from '../../js/cr3bp.js';
import {
  criticalSemiMajorSType,
  criticalSemiMajorPType,
} from '../../js/binaryStability.js';
import { expectedKeplerSlope } from '../../js/powerLawGravity.js';
import { LIGHT_MODELS } from './lightModels.mjs';
import { allWidgets, whenWidgetsReady } from '../../js/widgets.js';

export const RULE_ID = 'instructor/model-checked';
export const RULE_DESCRIPTION =
  "A literal numeric answer is recomputed from the lesson's own model by a fixture test, carries a published source, or is on the shrinking allowlist";

/** The numeric questions with a literal answer, in lesson order. */
export function numericLiterals(investigations) {
  const out = [];
  for (const inv of investigations) {
    inv.steps.forEach((step, index) => {
      if (
        step.type === 'question' &&
        step.kind === 'numeric' &&
        typeof step.answer === 'number'
      ) {
        out.push({
          key: `${inv.id}/${step.sid}`,
          lesson: inv.id,
          sid: step.sid,
          index,
          step,
        });
      }
    });
  }
  return out;
}

/**
 * The significant digits a literal is written to: 8.686 has four, 780 two
 * (trailing zeros of an integer are not significant), 0.177 three.
 */
export function significantDigits(x) {
  const t = String(x).replace('-', '').replace(/e.*$/i, '');
  const digits = t.replace('.', '').replace(/^0+/, '');
  return Math.max(
    1,
    (t.includes('.') ? digits : digits.replace(/0+$/, '')).length
  );
}

/** True when `value`, rounded to the literal's own digits, is the literal. */
export function reproduces(value, literal) {
  return (
    Number.isFinite(value) &&
    Number(value.toPrecision(significantDigits(literal))) === literal
  );
}

/**
 * Findings for the rule: a literal in none of the three tables, and an
 * allowlist entry that is stale (no such step, or it is checked now).
 */
export function modelCheckFindings(
  investigations,
  { models, sourced, unchecked }
) {
  const findings = [];
  const literals = numericLiterals(investigations);
  const known = new Set(literals.map(l => l.key));
  for (const l of literals) {
    if (models[l.key] || sourced[l.key] || unchecked[l.key]) continue;
    findings.push({
      where: l.lesson,
      step: l.index,
      message: `the numeric answer ${l.step.answer} is a literal that nothing checks: recompute it from the lesson's own model in MODELS, give it a published source in SOURCED (tools/authoring/modelChecked.mjs), or - only with a justification - allowlist it`,
    });
  }
  for (const [key, why] of Object.entries(unchecked)) {
    const [lesson] = key.split('/');
    if (!known.has(key)) {
      findings.push({
        where: lesson,
        step: null,
        message: `the unchecked allowlist names ${key}, which is not a numeric literal in this catalog: remove it`,
      });
    } else if (models[key] || sourced[key]) {
      findings.push({
        where: lesson,
        step: null,
        message: `${key} is checked now: remove it from the unchecked allowlist, which only shrinks`,
      });
    } else if (typeof why !== 'string' || why.trim().length < 20) {
      findings.push({
        where: lesson,
        step: null,
        message: `${key} is allowlisted without a justification`,
      });
    }
  }
  for (const [key, entry] of Object.entries(sourced)) {
    const ok =
      Array.isArray(entry.sources) &&
      entry.sources.length > 0 &&
      entry.sources.every(s => s.text && (s.doi || s.bibcode || s.url));
    if (!ok) {
      findings.push({
        where: key.split('/')[0],
        step: null,
        message: `${key}: a sourced value needs sources [{text, doi | bibcode | url}]`,
      });
    }
  }
  return findings;
}

/** A lesson instrument's own compute(), by widget id (the families load lazily). */
const widget = async id => {
  await whenWidgetsReady();
  return allWidgets().find(w => w.id === id);
};

/** Julian year, the unit the lessons' periods are quoted in. */
const YEAR_S = 3.15576e7;
const DAY_S = 86400;
const GM_SUN = G_SI * SOLAR_MASS_KG;

/** A Keplerian period about the Sun, seconds, for a in AU. */
const periodAboutSun = aAU =>
  2 * Math.PI * Math.sqrt((aAU * AU_METERS) ** 3 / GM_SUN);

/** The Hohmann transfer of the lesson: 1 AU to 2.5 AU about the Sun. */
const earthToStation = () =>
  hohmann({ r1: 1 * AU_METERS, r2: 2.5 * AU_METERS, mu: GM_SUN });

/** Bisection on a monotone function: the x in [lo, hi] where f(x) = target. */
const solve = (f, target, lo, hi) => {
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < target === f(lo) < f(hi)) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};

const MU_BINARY = 0.5 / 1.5;
const E_BINARY = 0.4;

/**
 * Recomputed from the lesson's own kernel. `via` names the module the value
 * comes from; `value` returns it in the unit the step asks for. The test that
 * reads this table is generated from it.
 */
export const MODELS = {
  ...LIGHT_MODELS,
  'keplers-laws/use-the-law': {
    via: "js/tidalPhysics.js (G, solar mass, AU): Newton's form of the third law",
    value: () => periodAboutSun(4) / YEAR_S,
  },
  'keplers-laws/weighing-another-star': {
    via: 'js/tidalPhysics.js (G, solar mass, AU): M = 4 pi^2 a^3 / (G P^2)',
    value: () =>
      (4 * Math.PI ** 2 * (0.24 * AU_METERS) ** 3) /
      (G_SI * (0.123 * YEAR_S) ** 2) /
      SOLAR_MASS_KG,
  },
  'retrograde-motion/how-often-does-earth-catch': {
    via: 'js/tidalPhysics.js: the two Keplerian periods about the Sun, then 1/S = 1/P1 - 1/P2',
    value: () =>
      1 / (1 / periodAboutSun(1) - 1 / periodAboutSun(1.5237)) / DAY_S,
  },
  'transit-photometry/how-lucky-do-you-have': {
    via: 'js/tidalPhysics.js: solar radius over the astronomical unit',
    value: () => AU_METERS / SOLAR_RADIUS_M,
  },
  'black-holes/where-the-room-comes-from': {
    via: 'js/blackHolePhysics.js schwarzschildRadiusM: zeros gained by the volume of a 1000-fold mass',
    value: () =>
      Math.log10(
        (schwarzschildRadiusM(1000 * SOLAR_MASS_KG) /
          schwarzschildRadiusM(SOLAR_MASS_KG)) **
          3
      ),
  },
  'radial-velocity/weigh-hd-209458-b': {
    via: 'js/exoplanetObservables.js radialVelocitySemiAmplitude, inverted for the planet mass that gives K = 84 m/s',
    value: () =>
      solve(
        m =>
          radialVelocitySemiAmplitude({
            starMassSolar: HD209458.star.massSolar,
            planetMassJupiter: m,
            periodDays: HD209458.planet.periodDays,
          }),
        84,
        0.01,
        5
      ),
  },
  'radial-velocity/how-dense-is-it': {
    via: 'js/tidalPhysics.js bulkDensity of the published mass and radius, g/cm^3',
    value: () =>
      bulkDensity(
        HD209458.planet.massJupiter * JUPITER_MASS_KG,
        HD209458.planet.radiusJupiter * JUPITER_RADIUS_M
      ) / 1000,
  },
  'goldilocks-question/writing-it-down-then-using': {
    via: 'js/habitability.js relativeInsolation at 3 AU of a 1 L_sun star',
    value: () => relativeInsolation(1, 3),
  },
  'missing-mass/the-prediction-mond-makes': {
    via: 'js/mond.js asymptoticSpeed of the 2.15e10 solar-mass disc and bulge at A0_GALACTIC',
    value: () => mondAsymptoticSpeed(2.15e10, A0_GALACTIC),
  },
  'transit-photometry/from-a-depth-to-a': {
    via: 'js/transitWidgets.js depth-size compute(): the radius ratio of a planet whose transit is 1% deep',
    value: async () => {
      const w = await widget('depth-size');
      const rp = solve(r => w.compute({ rp: r, rs: 1 }).depth, 0.01, 0.3, 15);
      return w.compute({ rp, rs: 1 }).k;
    },
  },
  'missing-mass/how-much-of-it-is': {
    via: 'js/darkMatterWidgets.js dm-fit compute() at the published decomposition (disc 3.3, halo 150 km/s, core 6 kpc): halo over visible mass inside 30 kpc',
    value: async () =>
      (await widget('dm-fit')).compute({
        discMass: 3.3,
        discScale: 2.6,
        haloVFlat: 150,
        haloCore: 6,
      }).ratio,
  },
  'missing-mass/weigh-the-cluster-by-its': {
    via: "js/darkMatter.js virialMass at the step's printed mean square speed 418.7 and R = 2516 (simulation units, G = 1), 1000 simulation masses to a solar mass",
    value: () => virialMass(418.7, 2516, 1) / 1000,
  },
  'tides/how-steeply-does-it-fall': {
    via: "js/tidalPhysics.js tidalAcceleration at the Moon's distance and half of it",
    value: () =>
      tidalAcceleration(EARTH_MASS_KG, 3.844e8 / 2, 1.7374e6) /
      tidalAcceleration(EARTH_MASS_KG, 3.844e8, 1.7374e6),
  },
  'tides/where-the-balance-tips': {
    via: 'js/tidalPhysics.js tidalToSelfGravity: the distance where stretch equals grip for a 3300 kg/m^3 moon, in Earth radii',
    value: () => {
      const R = 1.7374e6;
      const m = massFromDensity(3300, R);
      return (
        solve(d => tidalToSelfGravity(EARTH_MASS_KG, m, R, d), 1, 1e6, 1e9) /
        EARTH_RADIUS_M
      );
    },
  },
  'when-orbits-lock/what-180-means': {
    via: 'js/resonance/elements.js laplaceArgument: the Ganymede-Europa angle that puts it at 180 when Io and Europa are in conjunction',
    value: () => {
      for (let x = 0; x <= 180; x += 0.5)
        if (Math.abs(laplaceArgument(0, 0, x) - 180) < 1e-9) return x;
      return NaN;
    },
  },
  'detect-this-planet/why-it-failed': {
    via: "js/data/exoplanetSystems.js: schedule B's 3.52 d over HD 209458 b's period",
    value: () => 3.52 / HD209458.planet.periodDays,
  },
  'detect-this-planet/how-deep-is-an-earth': {
    via: 'js/transitWidgets.js depth-size compute() at the Earth-Sun preset, in ppm',
    value: async () =>
      (await widget('depth-size')).compute({ rp: 1, rs: 1 }).depth * 1e6,
  },
  'binary-star-planets/work-out-the-boundary': {
    via: 'js/binaryStability.js criticalSemiMajorSType at mu = 1/3, e = 0.4',
    value: () => criticalSemiMajorSType(MU_BINARY, E_BINARY).a,
  },
  'binary-star-planets/circumbinary-boundary': {
    via: 'js/binaryStability.js criticalSemiMajorPType at mu = 1/3, e = 0.4',
    value: () => criticalSemiMajorPType(MU_BINARY, E_BINARY).a,
  },
  'gravity-assist/the-ceiling': {
    via: 'js/gravityAssist.js maximumDeltaV at the 4.343 km/s approach',
    value: () => maximumDeltaV(4.343),
  },
  'hohmann-transfer/transfer-semi-major': {
    via: 'js/maneuver.js hohmann, 1 AU to 2.5 AU',
    value: () => earthToStation().aTransfer / AU_METERS,
  },
  'hohmann-transfer/vis-viva-departure': {
    via: 'js/maneuver.js hohmann: speed at departure on the transfer ellipse, km/s',
    value: () => earthToStation().transfer.depart / 1000,
  },
  'hohmann-transfer/transfer-time': {
    via: 'js/maneuver.js hohmann transferTime, days',
    value: () => earthToStation().transferTime / DAY_S,
  },
  'hohmann-transfer/second-burn-size': {
    via: 'js/maneuver.js hohmann dv2, km/s',
    value: () => earthToStation().dv2 / 1000,
  },
  'hohmann-transfer/total-cost': {
    via: 'js/maneuver.js hohmann total, km/s',
    value: () => earthToStation().total / 1000,
  },
  'lagrange-points/l4-distance': {
    via: 'js/cr3bp.js lagrangePoints: L4 to the primary, in units of the separation',
    value: () => {
      const mu = 0.1;
      const l4 = lagrangePoints(mu).find(p => p.name === 'L4');
      return Math.hypot(l4.x + mu, l4.y);
    },
  },
  'power-law-gravity/predict-the-slope': {
    via: 'js/powerLawGravity.js expectedKeplerSlope at n = 2.9',
    value: () => expectedKeplerSlope(2.9),
  },
};

/** Carries a published source. */
export const SOURCED = {};

/** The ceiling the allowlist may never exceed: its size when the rule landed. */
export const UNCHECKED_CEILING = 34;

/**
 * Not yet recomputed or sourced, each with the reason. Where the model gives a
 * value that differs from the literal at the literal's own digits, the
 * difference is stated: those are findings for Carl (the literal is inside the
 * step's tolerance, so no student is marked wrongly), not edits to make here.
 */
export const UNCHECKED = {
  'retrograde-motion/a-lap-gained':
    "The literal 783 is 360 / 0.46, with the 0.46 deg/day the step quotes rounded; the model's own rate (Keplerian periods of the Earth and Mars) is 0.4616 deg/day, a lap of 779.8 days. Inside the tolerance of 60, but not the same value at the literal's digits, so it is not claimed as checked. STOP finding.",
  'retrograde-motion/counting-the-machinery':
    'A count of four devices per planet, five planets, stated in the step body; no model computes it. Its source would be a history of the Almagest, which no entry in the data modules carries yet.',
  'goldilocks-question/venus-by-the-rule-you':
    "The literal 1.92 is 1 / 0.52, with 0.72 squared rounded to 0.52; js/habitability.js relativeInsolation(1, 0.72) is 1.929, which is 1.93 at the literal's digits. Inside the tolerance of 0.12. STOP finding.",
  'missing-mass/now-compare':
    "The ratio of the cluster scale model's dynamical mass to the visible mass its panel reports; the visible mass is a seeded scale model that has no headless path, so nothing recomputes it in Node yet.",
  'butterfly-effect/linear-in-numbers':
    'Arithmetic on a hypothetical premise the step states (1,500 km growing to 100,000 km in four orbits, proportionally, then forty orbits); there is no model behind a supposition.',
  'butterfly-effect/how-long-does-a-prediction':
    "The literal 95 is 11.5 x 8.3 s; with ln(1e5) = 11.513 and the same tau it is 95.6, which is 96 at the literal's digits. Inside the tolerance of 12, and tau is itself a measurement. STOP finding.",
  'hohmann-transfer/first-burn-size':
    "The literal 5.815 is 35.60 - 29.787 from the step's own rounded figures; js/maneuver.js hohmann gives 5.8156 km/s (5.816 at the literal's digits) because the lesson quotes Earth's actual 29.787 km/s where the model circular speed is 29.789. Inside the tolerance of 0.15. STOP finding.",
};
