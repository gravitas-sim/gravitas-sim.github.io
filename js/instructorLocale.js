// =============================================================================
// Every lesson in Spanish, at once, for the documents
// -----------------------------------------------------------------------------
// Prompt 79. The Spanish guides and keys read the lesson as a Spanish student
// does: the lesson's shadow (data/investigations/es) laid over the English by
// mergeTranslation, and the deeper steps (data/investigations/depth) laid in
// with their own shadow (depth/es). The application loads these one at a time
// and on demand (registry.js, depth.js); the documents want all of them and
// cannot await anything, so this is the static door, as depthAll.js is for the
// English deeper steps. Static imports, so the digest of what a build was made
// from (tools/instructor-freshness.mjs) follows every file.
//
// Not imported by any route: the build and the tests read it.
// =============================================================================
import {
  mergeTranslation,
  translationCoverage,
} from './data/investigations/i18n.js';
import { DEEPER } from './investigations/depthAll.js';
import { layDepth, overlay } from './investigations/depthPure.js';
import A_UNIVERSE_OF_STARS from './data/investigations/es/a-universe-of-stars.js';
import BINARY_STAR_PLANETS from './data/investigations/es/binary-star-planets.js';
import BLACK_HOLES from './data/investigations/es/black-holes.js';
import BUTTERFLY_EFFECT from './data/investigations/es/butterfly-effect.js';
import DESIGN_THE_SCHEDULE from './data/investigations/es/design-the-schedule.js';
import DETECT_THIS_PLANET from './data/investigations/es/detect-this-planet.js';
import GOLDILOCKS_QUESTION from './data/investigations/es/goldilocks-question.js';
import GRAVITY_ASSIST from './data/investigations/es/gravity-assist.js';
import HOHMANN_TRANSFER from './data/investigations/es/hohmann-transfer.js';
import KEPLERS_LAWS from './data/investigations/es/keplers-laws.js';
import LAGRANGE_POINTS from './data/investigations/es/lagrange-points.js';
import LISTENING_TO_SPACETIME from './data/investigations/es/listening-to-spacetime.js';
import LIVES_OF_STARS from './data/investigations/es/lives-of-stars.js';
import MISSING_MASS from './data/investigations/es/missing-mass.js';
import ORBITAL_ENERGY from './data/investigations/es/orbital-energy.js';
import POWER_LAW_GRAVITY from './data/investigations/es/power-law-gravity.js';
import RADIAL_VELOCITY from './data/investigations/es/radial-velocity.js';
import RETROGRADE_MOTION from './data/investigations/es/retrograde-motion.js';
import TIDES from './data/investigations/es/tides.js';
import TRANSIT_PHOTOMETRY from './data/investigations/es/transit-photometry.js';
import TWELVE_NIGHTS from './data/investigations/es/twelve-nights.js';
import WEIGHING_STARS from './data/investigations/es/weighing-stars.js';
import WHAT_IS_A_GRAVITATIONAL_WAVE from './data/investigations/es/what-is-a-gravitational-wave.js';
import WHEN_ORBITS_LOCK from './data/investigations/es/when-orbits-lock.js';
import KEPLERS_LAWS_DEEPER from './data/investigations/depth/es/keplers-laws.js';
import MISSING_MASS_DEEPER from './data/investigations/depth/es/missing-mass.js';
import TRANSIT_PHOTOMETRY_DEEPER from './data/investigations/depth/es/transit-photometry.js';
import WEIGHING_STARS_DEEPER from './data/investigations/depth/es/weighing-stars.js';

/** The Spanish shadow of each lesson, by lesson id. */
export const SHADOWS = Object.freeze({
  'a-universe-of-stars': A_UNIVERSE_OF_STARS,
  'binary-star-planets': BINARY_STAR_PLANETS,
  'black-holes': BLACK_HOLES,
  'butterfly-effect': BUTTERFLY_EFFECT,
  'design-the-schedule': DESIGN_THE_SCHEDULE,
  'detect-this-planet': DETECT_THIS_PLANET,
  'goldilocks-question': GOLDILOCKS_QUESTION,
  'gravity-assist': GRAVITY_ASSIST,
  'hohmann-transfer': HOHMANN_TRANSFER,
  'keplers-laws': KEPLERS_LAWS,
  'lagrange-points': LAGRANGE_POINTS,
  'listening-to-spacetime': LISTENING_TO_SPACETIME,
  'lives-of-stars': LIVES_OF_STARS,
  'missing-mass': MISSING_MASS,
  'orbital-energy': ORBITAL_ENERGY,
  'power-law-gravity': POWER_LAW_GRAVITY,
  'radial-velocity': RADIAL_VELOCITY,
  'retrograde-motion': RETROGRADE_MOTION,
  tides: TIDES,
  'transit-photometry': TRANSIT_PHOTOMETRY,
  'twelve-nights': TWELVE_NIGHTS,
  'weighing-stars': WEIGHING_STARS,
  'what-is-a-gravitational-wave': WHAT_IS_A_GRAVITATIONAL_WAVE,
  'when-orbits-lock': WHEN_ORBITS_LOCK,
});

/** The Spanish shadow of each lesson's deeper steps, by lesson id. */
export const DEEPER_SHADOWS = Object.freeze({
  'keplers-laws': KEPLERS_LAWS_DEEPER,
  'missing-mass': MISSING_MASS_DEEPER,
  'transit-photometry': TRANSIT_PHOTOMETRY_DEEPER,
  'weighing-stars': WEIGHING_STARS_DEEPER,
});

/**
 * A lesson as a Spanish student reads it, every depth laid in.
 * @param {id: string} inv - The English lesson (core steps)
 * @returns <class 'object'> The Spanish lesson; the English one where there is no shadow
 */
export function spanishLesson(inv, withDepths = true) {
  const shadow = SHADOWS[inv.id];
  const base = shadow ? mergeTranslation(inv, shadow) : inv;
  const deeper = DEEPER[inv.id];
  if (!deeper || !withDepths) return base;
  const words = DEEPER_SHADOWS[inv.id];
  return layDepth(base, words ? overlay(deeper, words.steps) : deeper);
}

/**
 * How much of a lesson's own words are in Spanish: the prose a key prints,
 * counted as strings (data/investigations/i18n.js translationCoverage).
 * @param {id: string} inv - The English lesson
 * @returns {{translated: number, total: number}}
 */
export function lessonCoverage(inv) {
  const shadow = SHADOWS[inv.id];
  const { translated, total } = translationCoverage(inv, shadow);
  const deeper = DEEPER[inv.id];
  if (!deeper) return { translated, total };
  const words = DEEPER_SHADOWS[inv.id];
  const extra = translationCoverage(deeper, words?.steps);
  return {
    translated: translated + extra.translated,
    total: total + extra.total,
  };
}
