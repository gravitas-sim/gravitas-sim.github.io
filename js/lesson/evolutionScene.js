// =============================================================================
// What a star's life looks like, as shapes
// -----------------------------------------------------------------------------
// "Lives of Stars" draws the same moment twice: once in the H-R panel, small,
// beside the diagram, and once around the protagonist on the main canvas. This
// is the one description both of them paint from.
//
// It exists because the alternative is two descriptions. The lesson had one -
// the panel's - and the main scene showed an ordinary yellow disc while the
// panel beside it depicted a collapsing cloud, so a reader who looked at the
// canvas at the moment the prose said "this is not a star yet" saw a star.
// Writing a second cloud painter for the canvas would have fixed that screen
// and left the two free to drift apart at every other one.
//
// What this is, and what it is not
// -----------------------------------------------------------------------------
// It is a *bounded illustration*, driven by model time. Everything here is a
// handful of ellipses whose positions come from a seeded generator, so the
// same model time always produces the same picture: seeking back and forth,
// replaying, or reloading the page reproduces the frame exactly.
//
// It is NOT a calculation. There is no hydrodynamics here, no radiative
// transfer, no relativity, and no attempt at one. A collapsing cloud does not
// really have fourteen blobs in it. The number of shells around an AGB star is
// three because three reads clearly at the size the canvas draws it, and the
// tracks contain no shell structure to take it from. What IS carried from the
// model is the part that means something: which stage the star is in, how far
// through it is, and how much mass the track records it having lost. Callers
// label the rest as illustration, and js/data/investigations/lives-of-stars.js
// says so on every screen that shows one.
//
// Units
// -----------------------------------------------------------------------------
// Everything is in units of `room` - the radius the star is being drawn at -
// and relative to its centre. So the same shapes work at a panel's forty
// pixels and at the canvas's four hundred without a second set of numbers, and
// a test can check them without a canvas at all.
// =============================================================================

import { mulberry32, normalizeSeed } from '../rng.js';

/** The stages this module draws. Mirrors STAGE in js/stellar/evolution.js. */
export const SCENE = Object.freeze({
  CLOUD: 'cloud',
  STAR: 'star',
  REMNANT: 'remnant',
});

/**
 * How many blobs a cloud is drawn with.
 *
 * A constant, and deliberately a small one. The instruction this file was
 * written against says "restrained deterministic particles or cached shapes,
 * never thousands of gravitating bodies", and the way to keep that true is for
 * the count not to be a function of anything.
 */
const CLOUD_BLOBS = 14;

/** Shells of lost material. Three reads as "several" and stays legible. */
const SHELL_COUNT = 3;

/** Expanding fronts in the supernova illustration. */
const FRONT_COUNT = 3;

/** How far into the stage each following front is emitted. */
const DELAY = 0.15;

/**
 * Where the reduced-motion setting parks an animating stage.
 *
 * Part-way through, so the stage still shows what it is about - a cloud that
 * has begun to contract, a shell that has begun to expand - rather than being
 * frozen at its first frame, which would look like nothing happening.
 */
const STILL_AT = 0.55;

/**
 * The scene at one moment of a star's life.
 *
 * Pure: the same arguments always produce the same shapes, which is what makes
 * seek, replay and reset reproducible. Nothing here reads a clock, a canvas or
 * the DOM.
 *
 * @param {object} frame - From frameOf() in js/stellar/evolution.js
 * @param {string} frame.stage - 'cloud', 'track' or 'remnant'
 * @param {number} frame.within - How far through that stage, 0 to 1
 * @param {?object} [frame.endpoint] - From endpointFor(), at the remnant
 * @param {object} [opts] - Options
 * @param {string} [opts.seed] - Seeds the blob positions; same seed, same picture
 * @param {boolean} [opts.stillFrame] - Reduced motion: park rather than animate
 * @param {number} [opts.lostFraction] - Share of initial mass the track has shed
 * @returns {object} A description in units of the star's drawn radius
 */
export function sceneFor(frame, opts = {}) {
  const { seed = 'lives', stillFrame = false, lostFraction = 0 } = opts;
  const stage = frame?.stage ?? 'track';
  const within = clamp01(Number(frame?.within) || 0);
  const at = stillFrame ? STILL_AT : within;

  if (stage === 'cloud') {
    return Object.freeze({
      kind: SCENE.CLOUD,
      // The star itself is not drawn: there is no photosphere yet, and drawing
      // one is the single most misleading thing this feature could do.
      hideStar: true,
      // And with no photosphere there is no drawn radius to scale from. A
      // cloud is enormously larger than the star it becomes, so its size comes
      // from the view rather than from the body: taking it from the body gave
      // a twenty-six pixel smudge where the lesson had just said "this is a
      // cloud light-years across".
      roomHint: 'scene',
      blobs: cloudBlobs(seed, at),
      // A brightening centre, which is a contracting core and not a surface.
      glow: Object.freeze({
        r: Math.max(0.12, 0.12 * (0.4 + at)),
        alpha: 0.25 + 0.55 * at,
      }),
      shells: EMPTY,
      fronts: EMPTY,
      label: 'cloud',
      // Said out loud wherever this is drawn: the tracks begin at a star that
      // already has a photosphere, so everything before that is illustration.
      modelled: false,
    });
  }

  if (stage === 'remnant') {
    const end = frame?.endpoint ?? null;
    const kind = end?.kind ?? 'unfinished';
    return Object.freeze({
      kind: SCENE.REMNANT,
      hideStar: kind !== 'white-dwarf' && kind !== 'unfinished',
      // Ejecta leave the star far behind within seconds of model time, and a
      // neutron star is a few pixels across, so this is a view-scale
      // illustration too.
      roomHint: 'scene',
      blobs: EMPTY,
      glow: null,
      // Ejecta, only where the endpoint prescription says there is an
      // explosion. Expanding away from the star's own centre, so the picture
      // moves with the protagonist rather than with the camera.
      fronts: end?.supernova === 'expected' ? explosionFronts(seed, at) : EMPTY,
      shells: EMPTY,
      remnant: Object.freeze({
        kind,
        // A white dwarf is a star and is drawn as one. A neutron star and a
        // black hole have no photosphere, so they are marks with their size
        // given in words rather than discs drawn to a scale nothing supports.
        drawn:
          kind === 'black-hole' || kind === 'neutron-star' ? 'mark' : 'star',
      }),
      label: `remnant.${kind}`,
      // The remnant is a prescription, not a track sample. Every caller has to
      // be able to say which, and this is how.
      modelled: false,
      prescribed: true,
    });
  }

  // On the track. The star is drawn by the ordinary painter; what this adds is
  // the material it has already lost, which the track does record.
  const lost = clamp01(Number(lostFraction) || 0);
  return Object.freeze({
    kind: SCENE.STAR,
    hideStar: false,
    // A wind blows off the star's own surface, so the shells are drawn against
    // the size the star is actually drawn at - which is the point on the AGB
    // screens, where the star is enormous and the shells are just outside it.
    roomHint: 'star',
    blobs: EMPTY,
    glow: null,
    shells: lost > 0.005 ? lostShells(seed, lost) : EMPTY,
    fronts: EMPTY,
    label: 'track',
    modelled: true,
  });
}

/** Frozen empty list, so callers never have to guard on null. */
const EMPTY = Object.freeze([]);

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * The blobs of a collapsing cloud, contracting as the stage runs.
 *
 * Seeded from the caller's string, so one track's cloud looks like itself
 * every time and two different tracks do not look identical.
 *
 * @param {string} seed - Seeds the layout
 * @param {number} at - How far through the stage, 0 to 1
 * @returns {Array<object>} Blobs in units of the drawn radius
 */
function cloudBlobs(seed, at) {
  const rand = mulberry32(normalizeSeed(`cloud:${seed}`));
  const shrink = 1 - 0.75 * at;
  const out = [];
  for (let i = 0; i < CLOUD_BLOBS; i++) {
    const angle = rand() * Math.PI * 2;
    const d = (0.35 + rand() * 0.65) * shrink;
    const size = (0.12 + rand() * 0.22) * (0.6 + 0.4 * shrink);
    out.push(
      Object.freeze({
        dx: Math.cos(angle) * d,
        // Squashed, so it reads as a cloud seen edge-on rather than as a
        // ring of dots.
        dy: Math.sin(angle) * d * 0.7,
        r: size,
        alpha: 0.13,
      })
    );
  }
  return Object.freeze(out);
}

/**
 * Shells of material the star has already shed.
 *
 * Their number is fixed and their radii are chosen to be legible. What comes
 * from the model is whether there are any at all and how far out they have
 * got, which follows the track's own record of the mass it has lost.
 *
 * @param {string} seed - Seeds the slight ellipticity
 * @param {number} lost - Share of the initial mass shed so far, 0 to 1
 * @returns {Array<object>} Shells in units of the drawn radius
 */
function lostShells(seed, lost) {
  const rand = mulberry32(normalizeSeed(`shells:${seed}`));
  const out = [];
  for (let i = 0; i < SHELL_COUNT; i++) {
    const phase = (i + 1) / (SHELL_COUNT + 1);
    // Outside the star, and further out the more it has shed. The radii used
    // to top out a hair over one drawn radius, which put every shell inside
    // the disc of the star that blew them off - invisible, on the screens
    // where losing mass is the whole subject.
    const rx = (1.25 + 0.55 * phase) * (0.8 + 0.7 * Math.min(1, lost));
    out.push(
      Object.freeze({
        rx,
        ry: rx * (0.8 + 0.2 * rand()),
        alpha: Math.max(0.04, 0.28 - i * 0.06),
        dash: true,
      })
    );
  }
  return Object.freeze(out);
}

/**
 * Expanding fronts, for an endpoint whose prescription expects an explosion.
 *
 * Three shells leaving at slightly different times, fading as they go. An
 * illustration of an event, bounded and seeded - not a blast calculation, and
 * not a particle system that could grow without limit.
 *
 * @param {string} seed - Seeds the slight ellipticity
 * @param {number} at - How far through the remnant stage, 0 to 1
 * @returns {Array<object>} Fronts in units of the drawn radius
 */
function explosionFronts(seed, at) {
  const rand = mulberry32(normalizeSeed(`sn:${seed}`));
  const out = [];
  for (let i = 0; i < FRONT_COUNT; i++) {
    // The leading front exists from the first instant of the stage. It used
    // to start at zero radius AND zero opacity, so the moment the lesson's
    // own "next phase" button lands on - the start of the remnant, which is
    // the collapse itself - showed nothing at all, and a reader had to drag
    // the playhead to find the most dramatic thing in the lesson.
    if (at < i * DELAY) continue;
    const lead = clamp01(at - i * DELAY);
    const rx = 0.35 + 1.5 * lead;
    // Fading as it expands, but never to nothing inside the stage: a remnant
    // card parked at the far end still shows where the ejecta went.
    const alpha = Math.max(0.08, 0.55 * (1 - lead)) - i * 0.06;
    if (alpha <= 0) continue;
    out.push(
      Object.freeze({
        rx,
        ry: rx * (0.85 + 0.15 * rand()),
        alpha,
        width: 2,
      })
    );
  }
  return Object.freeze(out);
}

/**
 * How much of its initial mass the track says the star has shed by now.
 *
 * From the track and nothing else: this is the one number in the mass-loss
 * illustration that is a measurement rather than a drawing choice, so it is
 * computed here and the caller passes it in rather than the shapes inventing
 * one.
 *
 * @param {?number} initialMassSun - What it started with
 * @param {?number} massSun - What it weighs now
 * @returns {number} 0 to 1, and 0 where either mass is missing
 */
export function lostFractionOf(initialMassSun, massSun) {
  if (!Number.isFinite(initialMassSun) || initialMassSun <= 0) return 0;
  if (!Number.isFinite(massSun) || massSun < 0) return 0;
  return clamp01((initialMassSun - massSun) / initialMassSun);
}

/**
 * How far the illustration reaches from the star, in drawn radii.
 *
 * A caller needs this to know how much room to leave and whether anything is
 * about to be drawn off the edge of a panel. Bounded by construction: the
 * largest thing here is the outermost supernova front.
 *
 * @param {object} scene - From sceneFor()
 * @returns {number} The outer extent, in units of the drawn radius
 */
export function extentOf(scene) {
  let out = 1;
  for (const b of scene.blobs) {
    out = Math.max(out, Math.hypot(b.dx, b.dy) + b.r);
  }
  for (const s of scene.shells) out = Math.max(out, s.rx, s.ry);
  for (const f of scene.fronts) out = Math.max(out, f.rx, f.ry);
  return out;
}
