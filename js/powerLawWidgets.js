// =============================================================================
// The instruments for the power-law investigation
// -----------------------------------------------------------------------------
// Three tools, one exponent between them. Each takes n, runs the model in
// js/powerLawGravity.js, and reports what it measured.
//
// Everything a tool shows is in its `readout`, which is a list of labels and
// values rendered as text. That is the whole accessibility story for this
// lesson and it is structural rather than an addition: there is no number on a
// canvas that is not also in a readout row, because the canvas and the readout
// are drawn from the same measurement and the readout is the one the model
// hands over.
//
// The exponent slider stops at 2.9 rather than 3. A circular orbit under r^-n
// is stable only for n < 3; at the boundary the apsidal angle diverges and a
// body nudged off a circle spirals instead of oscillating. The lesson says so
// in words, and the slider declines to put a student inside it wondering
// whether the simulation is broken.
// =============================================================================

import {
  EXPONENT_RANGE,
  LESSON_ECCENTRICITY,
  STABILITY_EXPONENT,
} from './powerLawGravity.js';
import {
  PRESETS,
  conservationRows,
  keplerRows,
  measureAt,
  precessionRows,
  referenceRadius,
  refinementRows,
} from './powerLawLab.js';

/**
 * The exponent control, shared by all three instruments.
 *
 * Step of 0.05 rather than something finer: the measurements take tens of
 * milliseconds each and are cached per exponent, so a continuous slider would
 * fill the cache with values nobody asked for. 0.05 is also about the smallest
 * change whose effect on the precession a student can see without reading the
 * number, which makes the grain of the control match the grain of the result.
 */
const exponentControl = () => ({
  id: 'n',
  label: 'Force-law exponent n',
  unit: '',
  min: EXPONENT_RANGE.min,
  max: EXPONENT_RANGE.max,
  step: 0.05,
  value: 2,
  decimals: 2,
});

/**
 * The preset exponents, with a sentence each saying why that one is offered.
 *
 * @returns {Array<object>} Preset descriptors
 */
const exponentPresets = () =>
  PRESETS.map(n => ({
    label: `n = ${n}`,
    values: { n },
    note:
      n === 2
        ? 'Newton. The control: a closed ellipse that does not turn.'
        : n < 2
          ? 'Shallower than Newton. The orbit turns backwards.'
          : n < 2.1
            ? 'Two and a half percent steeper than Newton, and already visible.'
            : n < 2.3
              ? 'Steeper. The ellipse turns about forty degrees every time round.'
              : 'Steep enough that the orbit never looks like it is closing.',
  }));

// =============================================================================
// 1. Does the ellipse close? The apsidal-precession bench
// =============================================================================

const PRECESSION = {
  id: 'power-law-precession',
  title: 'Does the ellipse close?',
  note: `One planet on a mildly eccentric orbit, started at the same place every time. The reference radius is ${referenceRadius().text}, and at that radius the pull is exactly Newtonian no matter what n is — so moving n changes the shape of the field, not its strength.`,
  controls: [exponentControl()],
  presets: exponentPresets(),
  compute(v) {
    return measureAt(v.n);
  },
  readout(v) {
    return precessionRows(v.n);
  },
};

// =============================================================================
// 2. Is it real? The timestep-refinement bench
// =============================================================================

const REFINEMENT = {
  id: 'power-law-refinement',
  title: 'Is the turning real, or is it the computer?',
  note: 'The same orbit, integrated four times at four different timesteps. Integration error depends on the timestep. A property of the force law does not.',
  controls: [exponentControl()],
  presets: exponentPresets(),
  compute(v) {
    return measureAt(v.n);
  },
  readout(v) {
    return refinementRows(v.n);
  },
};

// =============================================================================
// 3. The period-radius slope
// =============================================================================

const KEPLER = {
  id: 'power-law-kepler',
  title: 'How period depends on distance',
  note: 'Six circular orbits, each launched at the correct circular speed for the law that is switched on — not at the Newtonian one, which would not be a circle. Their periods are timed, not calculated.',
  controls: [exponentControl()],
  presets: exponentPresets(),
  compute(v) {
    return measureAt(v.n);
  },
  readout(v) {
    return keplerRows(v.n);
  },
};

// =============================================================================
// 4. What has not changed
// =============================================================================

const CONSERVATION = {
  id: 'power-law-conservation',
  title: 'What has not changed',
  note: 'Three unequal masses, all of them free to move, run under whatever law is selected. Two of these numbers do not care what n is, and that is the result.',
  controls: [exponentControl()],
  presets: exponentPresets(),
  compute(v) {
    return measureAt(v.n);
  },
  readout(v) {
    return conservationRows(v.n);
  },
};

export const POWER_LAW_WIDGETS = [PRECESSION, REFINEMENT, KEPLER, CONSERVATION];

/** Test seam: the exponent the instruments refuse to reach. @returns {number} The boundary */
export const stabilityBoundary = () => STABILITY_EXPONENT;
/** Test seam: the eccentricity the precession bench runs at. @returns {number} Eccentricity */
export const benchEccentricity = () => LESSON_ECCENTRICITY;
