// =============================================================================
// Seeded randomness
// -----------------------------------------------------------------------------
// Scenario setup draws on Math.random in about 180 places: planet masses,
// ring phases, cluster positions, compositions. That is fine for a sandbox and
// fatal for a shared link: two students opening the same URL would get two
// different systems, so no question about the result would have one answer.
//
// Rather than thread a generator through 180 call sites, withSeed() swaps
// Math.random for a seeded stream around the world-building call and restores
// it afterwards. Every draw made during setup then comes from the same stream
// in the same order, so the same seed rebuilds the same universe exactly.
//
// This is only sound around *synchronous* work. JavaScript is single-threaded,
// so nothing else can draw from the stream while a synchronous call is on the
// stack; an await or a timer inside the region would let the render loop's
// particle effects consume from it and desynchronise the world. initialize_-
// simulation() is synchronous throughout, which is what makes this safe: see
// the guard in withSeed().
// =============================================================================

/**
 * Mulberry32: a small, fast, well-distributed 32-bit generator.
 * Chosen over an LCG because the low bits of an LCG are visibly patterned,
 * and ring placement uses exactly those low bits for phase angles.
 * @param {number} a - Seed
 * @returns {Function} A function returning floats in [0, 1)
 */
export function mulberry32(a) {
  let s = a >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Turn any seed the user might type into a 32-bit integer.
 *
 * Seeds are shown and accepted as text so an instructor can say "use seed
 * kepler-3" out loud. A plain integer is kept as itself, so numeric seeds
 * still read naturally in a URL.
 *
 * @param {string|number} value - Seed as typed
 * @returns {number} Unsigned 32-bit seed
 */
export function normalizeSeed(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.abs(Math.trunc(value)) >>> 0;
  }
  const text = String(value ?? '').trim();
  if (text === '') return 0;
  if (/^\d+$/.test(text)) {
    const n = Number(text);
    if (Number.isSafeInteger(n)) return n >>> 0;
  }
  // FNV-1a, so that similar words ("orbit1", "orbit2") land far apart.
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** @returns {number} A fresh unsigned 32-bit seed */
export function randomSeed() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

let depth = 0;

/**
 * Run fn with Math.random replaced by a stream seeded from `seed`.
 *
 * Restores the real Math.random in a finally block, so a throw inside fn
 * cannot leave the page running on a deterministic generator, which would be
 * a genuinely baffling bug to inherit.
 *
 * @param {number} seed - Unsigned 32-bit seed
 * @param {Function} fn - Synchronous function to run
 * @returns {*} Whatever fn returns
 */
export function withSeed(seed, fn) {
  const real = Math.random;
  const gen = mulberry32(seed);
  Math.random = gen;
  depth++;
  try {
    const out = fn();
    // A thenable escaping here means the caller went async inside the seeded
    // region, so later draws came from the real generator and the seed no
    // longer reproduces the result. Say so rather than shipping silent
    // irreproducibility.
    if (out && typeof out.then === 'function') {
      console.warn(
        'withSeed() was given an async function. Only the synchronous part is ' +
          'seeded, so this world will not reproduce from its seed.'
      );
    }
    return out;
  } finally {
    depth--;
    Math.random = real;
  }
}

/** @returns {boolean} True while a seeded region is on the stack */
export const isSeeded = () => depth > 0;

// --- The seed that built the world currently on screen -----------------------
// Held here rather than in the settings object because it is not a setting:
// changing it does nothing until the world is rebuilt, and it must survive the
// settings reset that applyPreset() performs on every scenario change.

let worldSeed = randomSeed();

/** @returns {number} Seed that generated the current world */
export const getWorldSeed = () => worldSeed;

/**
 * Set the seed the next world build will use.
 * @param {string|number} value - Seed as typed, or as a raw integer
 * @returns {number} The normalized seed actually stored
 */
export function setWorldSeed(value) {
  worldSeed = normalizeSeed(value);
  return worldSeed;
}

/**
 * Render a seed as the short text shown in the interface and carried in links.
 * @param {number} seed - Unsigned 32-bit seed
 * @returns {string} Base-36 text, e.g. "1z9k4p"
 */
export const formatSeed = seed => (seed >>> 0).toString(36);

/**
 * Parse the text form back to an integer.
 *
 * Round-trips formatSeed(), and falls back to hashing so a seed a student
 * typed by hand ("my-lab") still works when it is not valid base-36.
 *
 * @param {string} text - Seed text from a URL or an input
 * @returns {number} Unsigned 32-bit seed
 */
export function parseSeed(text) {
  const t = String(text ?? '').trim();
  if (/^[0-9a-z]{1,7}$/.test(t)) {
    const n = parseInt(t, 36);
    if (Number.isFinite(n) && n <= 0xffffffff) return n >>> 0;
  }
  return normalizeSeed(t);
}
