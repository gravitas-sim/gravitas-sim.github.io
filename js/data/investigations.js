// =============================================================================
// Investigations: the guided lessons, all ten at once
// -----------------------------------------------------------------------------
// The lessons themselves live one per file in ./investigations/, and the
// application loads them one at a time through ./investigations/registry.js.
// This module is the other door: it imports all ten statically and hands back
// the whole catalogue, synchronously.
//
// That path exists for the callers that genuinely need every lesson in hand and
// cannot await anything:
//
//   js/answerKey.js                    reads every question, answer, tolerance
//                                      and explanation out of the steps
//   tools/build-instructor-materials.js  renders ten PDFs at build time
//   tests/                             assert across the whole catalogue
//
// Nothing on the start-up path imports this file, and nothing in the running
// application should: importing it is asking for 225KB of lesson text. The
// browser draws its cards from the manifest and the panel loads the one lesson
// a student actually opened.
//
// A step is one screen in the panel. The shapes:
//
//   read      explanation, optionally with a scenario to set up
//   predict   commit to an outcome *before* running it: the point is the
//             commitment, so these are always recorded even when wrong
//   explore   free play, with a checklist of things to try
//   measure   record numbers read off the live probe
//   question  short answer, multiple choice, or numeric with a tolerance
//
// `setup` is a declarative state the engine applies through the same code path
// as a shared link, which means every step of every lesson is also a link that
// can be handed out on its own.
//
// On predict steps: interactive simulations only produce a measurable learning
// gain when the student commits to an answer first. Without that, they watch,
// see whatever happens, and remember having known it all along. Predict steps
// are therefore never optional and never graded on correctness.
//
// Two fields exist for the lesson browser rather than for the lesson:
//
//   thumbnail  the capture of the scenario the lesson opens in, borrowed from
//              images/scenarios/. Not a separate render: a card that shows the
//              system a student is about to be dropped into is telling the
//              truth, and it stays true when `npm run thumbnails` reruns.
//   series     lessons that build on each other. The position within a series
//              is derived from the order of INVESTIGATIONS, not written down,
//              so inserting a lesson renumbers the sequence by itself.
// =============================================================================

import KEPLER from './investigations/keplers-laws.js';
import RETROGRADE from './investigations/retrograde-motion.js';
import TRANSITS from './investigations/transit-photometry.js';
import ENERGY from './investigations/orbital-energy.js';
import WEIGHING from './investigations/weighing-stars.js';
import BLACK_HOLES from './investigations/black-holes.js';
import RADIAL_VELOCITY from './investigations/radial-velocity.js';
import GOLDILOCKS from './investigations/goldilocks-question.js';
import DARK_MATTER from './investigations/missing-mass.js';
import TIDES from './investigations/tides.js';
import BUTTERFLY from './investigations/butterfly-effect.js';
import RESONANCE from './investigations/when-orbits-lock.js';

import { gradedSteps, positionIn } from './investigations/catalogue.js';

// Order matters: the browser lists them in this order, and the three exoplanet
// lessons form a sequence. Shadows measures a radius, Tug measures a mass and
// turns the pair into a density, and Goldilocks asks what that buys. Each still
// stands alone, but a student working straight down the list meets them in the
// order the inference chain is actually built.
//
// The Missing Mass sits after all of them. It belongs to no sequence, it is
// half the length of the others, and it uses an instrument none of them touch,
// so it reads as what it is: a short, self-contained argument at the end.
//
// This array and MANIFEST in ./investigations/manifest.js are the same order,
// and a test holds them to it: the browser reads one and the build reads the
// other, and a catalogue that disagreed with itself would renumber a series in
// one place and not the other.
export const INVESTIGATIONS = [
  KEPLER,
  RETROGRADE,
  TRANSITS,
  ENERGY,
  WEIGHING,
  BLACK_HOLES,
  RADIAL_VELOCITY,
  GOLDILOCKS,
  DARK_MATTER,
  TIDES,
  BUTTERFLY,
  RESONANCE,
];

/**
 * Find an investigation by id.
 * @param {string} id - Investigation id
 * @returns {Object|undefined} The investigation
 */
export const getInvestigation = id => INVESTIGATIONS.find(i => i.id === id);

/**
 * Where a lesson sits in its series, if it belongs to one.
 *
 * Bound to the full catalogue here, and to the manifest in the registry. Both
 * are the same list in the same order, and a test holds them to that.
 *
 * @param {Object} inv - Investigation
 * @returns {{label: string, index: number, of: number}|null} Position, or null
 */
export const seriesPosition = inv => positionIn(INVESTIGATIONS, inv);

// A pure function of one lesson's steps; shared with the registry so the panel
// and the answer key count the same steps as graded.
export { gradedSteps };
