// =============================================================================
// The Hertzsprung-Russell diagram, as geometry
// -----------------------------------------------------------------------------
// Axis arithmetic, the approximate regions, the constant-radius guides, and the
// search for a model near a point. No canvas and no state: js/stellarWidgets.js
// draws what this returns.
//
// The two conventions
// -----------------------------------------------------------------------------
// Both axes are logarithmic, and temperature increases to the LEFT. The second
// is a historical accident - the diagram grew out of spectral type, which ran
// O B A F G K M before anybody knew it was a temperature sequence - and it
// catches every student once. It is a property of the plot, so it lives here
// rather than in the drawing, and the drawing cannot get it wrong on its own.
//
// On the regions
// -----------------------------------------------------------------------------
// The main sequence, the giants, the supergiants and the white dwarfs are drawn
// as approximate regions and not as classification boundaries. A star does not
// become a giant by crossing a line on a diagram; it is drawn in the giant
// region because it is large, and the region is a summary of where large stars
// end up. The boundaries here are the conventional teaching ones and are stated
// on the plot.
// =============================================================================

import { radiusFromLuminosityAndTemperature, TEFF_SUN_K } from './geometry.js';
import { trackIds, trackSamples, mainSequenceAt } from './tracks.js';

/** The plotting range. Wide enough for a white dwarf and a supergiant. */
export const AXES = Object.freeze({
  teffMinK: 2000,
  teffMaxK: 50000,
  luminosityMin: 1e-5,
  luminosityMax: 1e6,
});

/** Where a temperature falls across the plot, 0 at the left edge. */
export function xForTemperature(teffK, axes = AXES) {
  // Reversed: the hottest stars are on the left. This one line is the whole
  // convention, and everything that plots on this diagram goes through it.
  const hi = Math.log10(axes.teffMaxK);
  const lo = Math.log10(axes.teffMinK);
  return (hi - Math.log10(teffK)) / (hi - lo);
}

/** And back again. */
export const temperatureForX = (x, axes = AXES) => {
  const hi = Math.log10(axes.teffMaxK);
  const lo = Math.log10(axes.teffMinK);
  return 10 ** (hi - x * (hi - lo));
};

/** Where a luminosity falls, 0 at the bottom edge. */
export function yForLuminosity(luminositySun, axes = AXES) {
  const lo = Math.log10(axes.luminosityMin);
  const hi = Math.log10(axes.luminosityMax);
  return (Math.log10(luminositySun) - lo) / (hi - lo);
}

/** And back again. */
export const luminosityForY = (y, axes = AXES) => {
  const lo = Math.log10(axes.luminosityMin);
  const hi = Math.log10(axes.luminosityMax);
  return 10 ** (lo + y * (hi - lo));
};

/** Whether a point is inside the plotted range at all. */
export const inRange = (teffK, luminositySun, axes = AXES) =>
  teffK >= axes.teffMinK &&
  teffK <= axes.teffMaxK &&
  luminositySun >= axes.luminosityMin &&
  luminositySun <= axes.luminosityMax;

/**
 * A line of constant radius, as points across the plotted temperature range.
 *
 * Straight on these axes, which is the reason to draw them: log L = 2 log R +
 * 4 log(Teff/Teff_sun), so a fixed radius is a line of slope 4 in log Teff, and
 * a student who has seen that has seen why the diagram separates giants from
 * dwarfs at all.
 *
 * @param {number} radiusSun - The radius the line is drawn for
 * @param {object} [axes] - The plotting range
 * @param {number} [n] - How many points
 * @returns {Array<{teffK: number, luminositySun: number}>} The line
 */
export function constantRadiusLine(radiusSun, axes = AXES, n = 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const teffK =
      10 **
      (Math.log10(axes.teffMinK) +
        (i / (n - 1)) *
          (Math.log10(axes.teffMaxK) - Math.log10(axes.teffMinK)));
    out.push({
      teffK,
      luminositySun: radiusSun ** 2 * (teffK / TEFF_SUN_K) ** 4,
    });
  }
  return out;
}

/** The radii the guides are drawn at, in solar radii. */
export const GUIDE_RADII = Object.freeze([0.01, 0.1, 1, 10, 100, 1000]);

/**
 * The approximate regions, as closed polygons in (teffK, luminositySun).
 *
 * Every one is a summary and the plot says so. The main sequence is traced from
 * the bundled tracks' own zero-age and terminal-age points rather than drawn by
 * hand, so it cannot drift away from the models plotted on top of it.
 *
 * @returns {Array<{key: string, points: Array<object>}>} The regions
 */
export function regions() {
  const zams = [];
  const tams = [];
  for (const id of trackIds()) {
    const a = mainSequenceAt(trackMass(id), 0);
    const b = mainSequenceAt(trackMass(id), 1);
    if (a) zams.push({ teffK: a.teffK, luminositySun: a.luminositySun });
    if (b) tams.push({ teffK: b.teffK, luminositySun: b.luminositySun });
  }
  return [
    {
      key: 'main-sequence',
      // Down one side and back the other: the band between where stars arrive
      // and where they leave.
      points: [...zams, ...tams.reverse()],
    },
    {
      key: 'giants',
      points: [
        { teffK: 5500, luminositySun: 30 },
        { teffK: 3400, luminositySun: 30 },
        { teffK: 3000, luminositySun: 3000 },
        { teffK: 5200, luminositySun: 3000 },
      ],
    },
    {
      key: 'supergiants',
      points: [
        { teffK: 30000, luminositySun: 1e4 },
        { teffK: 3000, luminositySun: 1e4 },
        { teffK: 3000, luminositySun: 6e5 },
        { teffK: 30000, luminositySun: 6e5 },
      ],
    },
    {
      key: 'white-dwarfs',
      points: [
        { teffK: 40000, luminositySun: 1e-1 },
        { teffK: 5000, luminositySun: 1e-5 },
        { teffK: 40000, luminositySun: 1e-3 },
      ],
    },
  ];
}

/** The initial mass a track id stands for. */
function trackMass(id) {
  const s = trackSamples(id);
  return s ? s.initialMassSun : NaN;
}

/**
 * Models near a point on the diagram.
 *
 * The answer to "what could this be?", and it is deliberately a list. A point
 * on an H-R diagram does not determine a mass or an age: a 1 solar-mass star
 * on its way up the giant branch and a 5 solar-mass star burning helium can sit
 * within a whisker of each other, and telling a student the first is *the*
 * answer would be teaching them something false. The caller shows the
 * alternatives; nothing snaps.
 *
 * Distance is measured in the plot's own coordinates, so "near" means near on
 * screen, which is what a reader pointing at the diagram means.
 *
 * @param {number} teffK - Where the reader is pointing
 * @param {number} luminositySun - and how bright
 * @param {object} [opts]
 * @param {number} [opts.within] - Radius in plot units, 0 to 1 across the axes
 * @param {number} [opts.limit] - Most matches to return
 * @param {object} [opts.axes] - The plotting range
 * @returns {Array<object>} Matches, nearest first
 */
export function nearbyModels(
  teffK,
  luminositySun,
  { within = 0.04, limit = 6, axes = AXES } = {}
) {
  const x0 = xForTemperature(teffK, axes);
  const y0 = yForLuminosity(luminositySun, axes);
  const found = [];
  for (const id of trackIds()) {
    const s = trackSamples(id);
    if (!s) continue;
    // One match per track at most, and per phase within it: a track passes
    // through a neighbourhood many times and six samples of the same moment
    // are not six alternatives.
    const bestByPhase = new Map();
    for (let i = 0; i < s.count; i++) {
      const d = Math.hypot(
        xForTemperature(s.teffK[i], axes) - x0,
        yForLuminosity(s.luminositySun[i], axes) - y0
      );
      if (d > within) continue;
      const key = `${id}:${s.phase[i]}`;
      const prev = bestByPhase.get(key);
      if (!prev || d < prev.distance) {
        bestByPhase.set(key, {
          trackId: id,
          initialMassSun: s.initialMassSun,
          index: i,
          distance: d,
          ageYr: s.ageYr[i],
          massSun: s.massSun[i],
          teffK: s.teffK[i],
          luminositySun: s.luminositySun[i],
          radiusSun: s.radiusSun[i],
          phase: s.phase[i],
        });
      }
    }
    found.push(...bestByPhase.values());
  }
  found.sort((a, b) => a.distance - b.distance);
  return found.slice(0, limit);
}

/**
 * A point the reader chose, described as much as it can honestly be.
 *
 * Temperature, luminosity and radius, because those three are one relation and
 * two of them fix the third. Not a mass, not an age and not a lifetime: those
 * need a model, and a point is not a model. `ambiguous` is true when more than
 * one bundled track passes nearby, which is the case a student should see
 * rather than be protected from.
 *
 * @param {number} teffK - Effective temperature
 * @param {number} luminositySun - Bolometric luminosity
 * @returns {object} A description of a hypothetical star
 */
export function hypotheticalAt(teffK, luminositySun) {
  const radiusSun = radiusFromLuminosityAndTemperature(luminositySun, teffK);
  const near = nearbyModels(teffK, luminositySun);
  const masses = new Set(near.map(m => m.initialMassSun));
  return Object.freeze({
    source: 'hypothetical',
    teffK,
    luminositySun,
    radiusSun,
    /** Never a mass or an age. A point on this diagram fixes neither. */
    massSun: null,
    ageYr: null,
    nearby: Object.freeze(near),
    ambiguous: masses.size > 1,
    inRange: inRange(teffK, luminositySun),
  });
}
