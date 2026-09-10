// =============================================================================
// What each modelled star ends as
// -----------------------------------------------------------------------------
// The bundled MIST tracks do not answer this question and were never meant to.
// Three of them run through to a cooling white dwarf and so answer it
// themselves; the rest stop while the star is still burning, and what happens
// afterwards has to come from somewhere else.
//
// This module is that somewhere else, kept deliberately separate so that the
// two kinds of statement cannot be confused:
//
//   fromTrack: true    the bundled track reaches this state and these numbers
//                      are read off it
//   fromTrack: false   the track stopped earlier. This is a published
//                      prescription applied to the track's final mass, with a
//                      citation and a stated uncertainty, and it is not a
//                      calculation this project performed
//
// Why there is a 40 solar-mass track at all
// -----------------------------------------------------------------------------
// Because explodability is not a monotonic function of mass, and a black hole
// asserted from a mass cut would be teaching the opposite of what the
// literature says. Sukhbold et al. (2016) find interleaved islands of
// explosion and collapse: nearly everything below about fifteen solar masses
// explodes and leaves a neutron star, the twenties are patchy and
// engine-dependent, and by forty the models agree. So the neutron star comes
// from the ten solar-mass track, the black hole from the forty, and the
// twenty is left as the honest boundary case it is.
//
// What is deliberately not here
// -----------------------------------------------------------------------------
// A formula from initial mass to remnant mass. Every entry below is one
// representative outcome for one modelled star, with the range the source
// reports, and nothing interpolates between them.
// =============================================================================

import { trackSamples } from './tracks.js';

/** Where the prescriptions come from, and what they cover. */
export const ENDPOINT_PROVENANCE = Object.freeze({
  sources: Object.freeze([
    Object.freeze({
      key: 'sukhbold2016',
      cite: 'Sukhbold, Ertl, Woosley, Brown & Lattimer (2016), ApJ 821, 38',
      url: 'https://ui.adsabs.harvard.edu/abs/2016ApJ...821...38S',
      covers:
        'Which single stars of solar composition explode when their cores collapse, and what they leave, from 9 to 120 solar masses, under neutrino-driven explosion engines calibrated on SN 1987A and the Crab.',
    }),
    Object.freeze({
      key: 'ertl2016',
      cite: 'Ertl, Janka, Woosley, Sukhbold & Ugliano (2016), ApJ 818, 124',
      url: 'https://ui.adsabs.harvard.edu/abs/2016ApJ...818..124E',
      covers:
        'The two-parameter criterion that separates exploding from collapsing progenitors, and why a single threshold in initial mass does not.',
    }),
    Object.freeze({
      key: 'cummings2018',
      cite: 'Cummings, Kalirai, Tremblay, Ramirez-Ruiz & Choi (2018), ApJ 866, 21',
      url: 'https://ui.adsabs.harvard.edu/abs/2018ApJ...866...21C',
      covers:
        'The semi-empirical initial-to-final mass relation for white dwarfs, measured in open clusters. Used here only as a check on the white-dwarf masses the tracks produce, not as their source.',
    }),
  ]),
  scope:
    'Single stars, solar composition, no rotation, no binary companion. A star with a close companion can lose its envelope, gain mass, or merge, and none of those paths is modelled anywhere in this project.',
  notCalculated:
    'Nothing here was computed by Gravitas. The white-dwarf masses are read off the bundled tracks; the neutron-star and black-hole outcomes are published results quoted for the nearest modelled progenitor.',
});

/** The final state of a bundled track, read from the track itself. */
function finalOf(trackId) {
  const t = trackSamples(trackId);
  if (!t) return null;
  const i = t.count - 1;
  return Object.freeze({
    massSun: t.massSun[i],
    teffK: t.teffK[i],
    luminositySun: t.luminositySun[i],
    radiusSun: t.radiusSun[i],
    ageYr: t.ageYr[i],
    phase: t.phase[i],
  });
}

/**
 * What each modelled star ends as.
 *
 * `kind` is one of:
 *   white-dwarf     the track reaches one
 *   neutron-star    the prescription says the core collapses and the star
 *                   explodes
 *   black-hole      the prescription says the core collapses and it does not
 *   uncertain       the sources disagree, and that is the finding
 *   unfinished      the track stops while the star is still fusing hydrogen
 *
 * `supernova` is one of 'expected', 'uncertain', 'unlikely' or 'none', and is
 * kept separate from `kind` on purpose: a black hole does not require a bright
 * explosion and a failed one is the likelier way to make one at this mass.
 */
const PRESCRIPTIONS = {
  m020: {
    kind: 'unfinished',
    supernova: 'none',
    reason: 'still-on-the-main-sequence',
    remnantMassSun: null,
    remnantRange: null,
    source: null,
    note: 'The model stops at the end of core hydrogen burning, at 1.14 trillion years. The Universe is 13.8 billion years old, so no star of this mass has finished its main sequence anywhere, and no observation constrains what happens next. What theory expects - that it contracts to a helium white dwarf without ever becoming a giant - is a prediction about a future eighty times longer than the past.',
  },
  m050: {
    kind: 'unfinished',
    supernova: 'none',
    reason: 'still-on-the-main-sequence',
    remnantMassSun: null,
    remnantRange: null,
    source: null,
    note: 'The model stops at the end of core hydrogen burning, at 96 billion years - seven times the present age of the Universe. Everything after that is outside both this bundle and the observable record.',
  },
  m100: {
    kind: 'white-dwarf',
    supernova: 'none',
    reason: 'reached-by-the-track',
    fromTrack: true,
    source: 'cummings2018',
    note: 'The track itself runs to a cooling white dwarf: the star sheds its envelope on the asymptotic giant branch, the exposed core crosses the diagram at almost constant luminosity, and then cools. About 46 per cent of the star is left behind as expanding gas.',
  },
  m200: {
    kind: 'white-dwarf',
    supernova: 'none',
    reason: 'reached-by-the-track',
    fromTrack: true,
    source: 'cummings2018',
    note: 'The same route as a solar-mass star and a thousand times quicker, leaving a slightly heavier white dwarf.',
  },
  m500: {
    kind: 'white-dwarf',
    supernova: 'none',
    reason: 'reached-by-the-track',
    fromTrack: true,
    source: 'cummings2018',
    note: 'Five solar masses in, 0.89 out: more than four fifths of the star is returned to the interstellar medium. This is the heaviest star in the bundle that ends as a white dwarf rather than collapsing.',
  },
  m1000: {
    kind: 'neutron-star',
    supernova: 'expected',
    reason: 'core-collapse',
    fromTrack: false,
    remnantMassSun: 1.4,
    remnantRange: [1.2, 1.6],
    source: 'sukhbold2016',
    note: 'The track stops when carbon ignites in the core, with 9.4 of the original 10 solar masses left. What follows is not in it. Published neutrino-driven explosion models put a star of this mass firmly among those that explode, leaving a neutron star of roughly 1.2 to 1.6 solar masses and returning the rest.',
  },
  m2000: {
    kind: 'uncertain',
    supernova: 'uncertain',
    reason: 'core-collapse',
    fromTrack: false,
    remnantMassSun: null,
    remnantRange: [1.4, 14],
    source: 'sukhbold2016',
    note: 'The honest answer for twenty solar masses is that it depends on the explosion engine. Sukhbold et al. find explodability alternating in bands through the late teens and twenties rather than switching once: some calibrations explode a star of this mass and leave a neutron star, others fail and leave a black hole of most of its 14 remaining solar masses. This is not a gap in the bundle - it is the state of the subject, and it is why the black-hole example here is a forty solar-mass star instead.',
  },
  m4000: {
    kind: 'black-hole',
    supernova: 'unlikely',
    reason: 'core-collapse',
    fromTrack: false,
    remnantMassSun: 15,
    remnantRange: [10, 35],
    source: 'sukhbold2016',
    note: 'This track stops early, while helium is igniting, with 35 of the original 40 solar masses still present - so the gap between where the model ends and where the star ends is wider here than anywhere else in the bundle. At this mass the published models agree the core collapses to a black hole, and mostly agree it does so without a bright supernova: the envelope is not expelled, it falls in. How much of the 35 solar masses ends up inside depends on how much is lost to winds first and on whether any explosion develops at all, which is why the range below is as wide as it is.',
  },
};

/**
 * What a modelled star ends as, and how much of that is a model output.
 *
 * @param {string} trackId - A bundled track
 * @returns {?object} The endpoint, or null for an unknown track
 */
export function endpointFor(trackId) {
  const p = PRESCRIPTIONS[trackId];
  if (!p) return null;
  const final = finalOf(trackId);
  const source =
    p.source && ENDPOINT_PROVENANCE.sources.find(s => s.key === p.source);
  return Object.freeze({
    trackId,
    kind: p.kind,
    supernova: p.supernova,
    reason: p.reason,
    fromTrack: Boolean(p.fromTrack),
    // For a white dwarf this is what the track says. For anything else it is
    // what the prescription says, and `fromTrack` is how a caller tells them
    // apart without reading the prose.
    remnantMassSun: p.fromTrack ? final?.massSun : (p.remnantMassSun ?? null),
    remnantRange: p.remnantRange ? Object.freeze([...p.remnantRange]) : null,
    // What the star loses on the way. For a collapsing star this is only what
    // the track itself recorded losing: whatever the explosion ejects is not
    // in the track and is not guessed at here.
    lostBeforeEndYr: final ? final.ageYr : null,
    initialMassSun: trackSamples(trackId)?.initialMassSun ?? null,
    massAtTrackEndSun: final?.massSun ?? null,
    trackEndsAtPhase: final?.phase ?? null,
    // A remnant with no photosphere has no place on an H-R diagram, and
    // plotting one at log(0) or at an invented temperature is the mistake this
    // flag exists to prevent.
    plottable: p.kind === 'white-dwarf' || p.kind === 'unfinished',
    source: source || null,
    note: p.note,
  });
}

/** Every endpoint, in track order. @returns {Array<object>} */
export const allEndpoints = () =>
  Object.keys(PRESCRIPTIONS).map(id => endpointFor(id));

/**
 * How much material a star returns before the track stops.
 *
 * Only what the model recorded. An explosion's ejecta are not included,
 * because the tracks stop before any explosion and nothing here computes one.
 *
 * @param {string} trackId - A bundled track
 * @returns {number} Solar masses lost by the end of the track
 */
export function massLostOnTrack(trackId) {
  const t = trackSamples(trackId);
  if (!t) return 0;
  return t.initialMassSun - t.massSun[t.count - 1];
}
