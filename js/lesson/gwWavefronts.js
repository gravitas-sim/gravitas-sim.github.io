// =============================================================================
// Where the crests are, at one moment of a model's time
// -----------------------------------------------------------------------------
// The beginner gravitational-wave lesson asks a reader to watch a disturbance
// leave a source and travel outward. That picture has to come from the model
// the rest of the screen is showing - the same timeline the waveform is
// plotted from and the same phase the two bodies are placed by - or the canvas
// is telling a different story from the panel beside it.
//
// So this takes the source's own emission history and returns rings. A crest
// leaves the source each time the wave phase passes a multiple of 2*pi, and at
// a later model time it sits at a radius proportional to how long ago it left.
// Pause, seek and restart all follow, because nothing here reads a clock: the
// only input is the model time the caller is drawing.
//
// What this is not
// -----------------------------------------------------------------------------
// It is not a solution of anything. There is no metric perturbation computed
// here, no polarisation content, no radiation pattern and no falloff with
// angle - the rings are circles and a real quadrupole's emission is not
// isotropic. It is a propagation *illustration*: the thing it gets right is
// that crests leave a source at a finite speed, keep going, and arrive later
// further away, which is the whole point of the screens that use it.
//
// The propagation speed on screen is a display choice and every caller labels
// it as one. Drawing it at the real ratio of the speed of light to an orbital
// separation would put the first crest off the edge of the canvas before the
// second one existed.
//
// Two things it deliberately refuses
// -----------------------------------------------------------------------------
// A source with no changing quadrupole gets no crests at all. That is not an
// oversight to be tidied up later: a static mass and a spherically pulsating
// one both radiate nothing, and the lesson's whole argument is that motion is
// not the criterion. `crestsFor` is given the emission times and a static or
// spherical source simply has none.
// =============================================================================

/** How many crests may be on screen at once. A constant, so nothing grows. */
export const MAX_CRESTS = 12;

/**
 * When each crest left the source.
 *
 * A crest per cycle of the wave, which for the dominant quadrupole mode is
 * twice per orbit - so a reader counting rings against orbits finds two, which
 * is the measurement screen 6 of the advanced lesson asks for.
 *
 * Computed by inverting the model's own phase rather than by stepping a clock:
 * the answer for a given timeline is a fixed list, so seeking away and back
 * reproduces the same rings in the same places.
 *
 * @param {object} timeline - From js/gw/timeline.js; needs timeAtPhase
 * @param {object} [opts] - Options
 * @param {number} [opts.from] - Earliest time to consider
 * @param {number} [opts.to] - Latest time to consider
 * @param {number} [opts.max] - How many to return, most recent last
 * @returns {Array<number>} Emission times, ascending
 */
export function emissionTimes(timeline, { from, to, max = 256 } = {}) {
  if (typeof timeline?.timeAtPhase !== 'function') return [];
  const out = [];
  // The model's phase convention runs negative up to the merger at zero, so
  // walking k upward walks backwards in time from the end.
  //
  // Both ends of the window return NaN and they mean different things. The
  // first few cycles are inside the merger, past where the inspiral model is
  // defined at all - those are skipped, because there are earlier cycles that
  // do exist. Once a real one has been found, the next NaN is the start of the
  // model's window and there is nothing earlier to emit.
  let started = false;
  for (let k = 0; k < 4096 && out.length < max; k++) {
    const t = timeline.timeAtPhase(-2 * Math.PI * k);
    if (!Number.isFinite(t)) {
      if (started) break;
      continue;
    }
    started = true;
    if (Number.isFinite(to) && t > to) continue;
    if (Number.isFinite(from) && t < from) break;
    out.push(t);
  }
  return out.reverse();
}

/**
 * The crests visible at one model time.
 *
 * @param {Array<number>} times - From emissionTimes()
 * @param {number} now - The model time being drawn
 * @param {object} [opts] - Options
 * @param {number} [opts.speed] - Illustrative propagation, radii per second of model time
 * @param {number} [opts.maxRadius] - Beyond this a crest has left the picture
 * @param {number} [opts.max] - Cap on how many are returned
 * @returns {Array<{r: number, alpha: number, age: number}>} Rings, innermost first
 */
export function crestsFor(times, now, opts = {}) {
  const { speed = 1, maxRadius = 1, max = MAX_CRESTS } = opts;
  if (!Array.isArray(times) || !Number.isFinite(now) || !(maxRadius > 0)) {
    return [];
  }
  const out = [];
  // Backwards from the most recent, so the cap keeps the crests nearest the
  // source - the ones a reader is watching leave - rather than the faint ones
  // about to go off the edge.
  for (let i = times.length - 1; i >= 0 && out.length < max; i--) {
    const age = now - times[i];
    if (age < 0) continue;
    const r = age * speed;
    if (r > maxRadius) break;
    out.push({
      r,
      // Fading with distance, because a spherical wave's amplitude falls as
      // 1/r and a ring drawn at constant brightness would say otherwise. The
      // floor keeps the outermost ring visible rather than vanishing a pixel
      // before the edge.
      alpha: Math.max(0.08, 0.55 * (1 - r / maxRadius)),
      age,
    });
  }
  return out.reverse();
}

/**
 * A propagation speed that puts a useful number of crests on screen.
 *
 * Illustrative, and the readout says so wherever it is used. Chosen from the
 * emission spacing rather than from physics: the aim is that a reader can see
 * several rings at once and watch a new one leave, which is a statement about
 * the picture and not about the wave.
 *
 * @param {Array<number>} times - From emissionTimes()
 * @param {number} maxRadius - The room available, in the caller's units
 * @param {number} [wanted] - How many rings should fit
 * @returns {number} Radii per second of model time
 */
export function illustrativeSpeed(times, maxRadius, wanted = 4) {
  if (!Array.isArray(times) || times.length < 2 || !(maxRadius > 0)) {
    return maxRadius > 0 ? maxRadius : 1;
  }
  // The median spacing rather than the first or the last. An inspiral's cycles
  // are six times further apart at the start of the window than at the end, so
  // a speed set by the last gap leaves one lonely ring early on and a speed set
  // by the first bunches them into a smudge at the merger. The median puts the
  // asked-for number on screen through the middle of the inspiral and lets the
  // ends do what the physics says: crests crowd together as it speeds up, and
  // that crowding is the chirp made visible.
  const gaps = [];
  for (let i = 1; i < times.length; i++) {
    const g = Math.abs(times[i] - times[i - 1]);
    if (g > 0) gaps.push(g);
  }
  if (!gaps.length) return maxRadius;
  gaps.sort((a, b) => a - b);
  const gap = gaps[Math.floor(gaps.length / 2)];
  return maxRadius / (wanted * gap);
}
