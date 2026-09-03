// =============================================================================
// Shareable state URLs
// -----------------------------------------------------------------------------
// Encodes a simulation into the URL fragment so an activity can be handed out
// as a link: "open this, then answer these questions". Everything lives in the
// hash, so nothing is ever sent to a server and the whole thing keeps working
// on GitHub Pages.
//
// Two payload kinds, because the two things people want to share are different
// sizes:
//
//   seeded  scenario + seed + whatever settings differ from that scenario's
//           defaults. Rebuilt by re-running world generation under the seed.
//           Typically 120-300 characters. This is what an instructor sends.
//
//   full    every body's position, velocity and mass, written out. Needed once
//           the simulation has been *run*: bodies have moved and merged, and
//           no seed reproduces that. This is what a student sends back.
//
// The kind is chosen automatically (see chooseKind) but can be forced, because
// "share the setup" and "share what I ended up with" are both legitimate and
// only the author knows which they mean.
//
// This module is deliberately pure: it takes the world as arguments and hands
// back strings. ui.js owns the live state and calls in. Keeping the dependency
// one-directional is what stops this becoming a cycle, the same reason
// scenarios.js takes its settings object as a parameter.
// =============================================================================

import { applyPreset } from './scenarios.js';
import { formatSeed, parseSeed } from './rng.js';

const VERSION = 1;

// Above this the link starts getting refused or line-wrapped by mail clients,
// LMS text fields and chat apps. Browsers themselves handle far more, so this
// is a warning threshold rather than a limit.
export const COMFORTABLE_URL_LENGTH = 8000;

// --- base64url ---------------------------------------------------------------

function bytesToBase64Url(bytes) {
  let bin = '';
  // Chunked: String.fromCharCode(...bytes) blows the argument limit somewhere
  // around 100k bodies' worth of payload, and fails as a RangeError that looks
  // nothing like the actual cause.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(text) {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// --- Compression -------------------------------------------------------------
// CompressionStream is in every current browser. Where it is missing the
// payload simply goes uncompressed and the marker byte says so, so a link made
// in one browser always opens in the other.

/**
 * Drain a stream into one Uint8Array.
 *
 * Read with a reader rather than `new Response(stream).arrayBuffer()`: that is
 * the shorter spelling, but it drags in the Fetch API for what is a two-line
 * concatenation, and it is missing in enough non-browser environments to make
 * the compression path silently fall back: including the one the tests run
 * in, where it would have hidden this code from them entirely.
 */
async function drain(stream) {
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

async function deflate(bytes) {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(bytes);
    writer.close();
    return await drain(cs.readable);
  } catch {
    return null;
  }
}

async function inflate(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot read compressed links.');
  }
  try {
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    // Errors surface on the read side, so a rejection here is the stream
    // already having failed; the read below reports it properly.
    writer.write(bytes);
    writer.close().catch(() => {});
    return await drain(ds.readable);
  } catch {
    // A cut-short payload surfaces from the stream as an opaque low-level
    // error, which tells a student handed a broken link nothing at all. Half a
    // URL is by far the likeliest way this fails: mail clients and chat apps
    // wrap long ones, so say that instead.
    throw new Error('That link is incomplete or was cut short in transit.');
  }
}

// --- Number hygiene ----------------------------------------------------------

/**
 * Round to 7 significant figures, recursively.
 *
 * Float arithmetic leaves positions like 123.40000000000001. Those extra
 * digits are noise, but they cost bytes and: worse: they compress badly,
 * because deflate finds no repetition in random mantissa tails. Trimming them
 * roughly halves a full payload and changes no orbit anyone can see.
 */
function trim(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    if (value === 0) return 0;
    return Number(value.toPrecision(7));
  }
  if (Array.isArray(value)) return value.map(trim);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = trim(value[k]);
    return out;
  }
  return value;
}

// --- Settings deltas ---------------------------------------------------------

/**
 * The settings a scenario produces on its own, with nothing customised.
 *
 * applyPreset() resets to defaults and then applies the scenario, so running
 * it against a scratch object reproduces exactly what a fresh load of that
 * scenario would give. Anything the live settings hold beyond this is a
 * deliberate change by the author and is the only part worth transmitting.
 *
 * @param {string} scenario - Scenario name
 * @param {Object} DEFAULT_SETTINGS - The baseline settings object
 * @returns {Object} Settings as the scenario alone would leave them
 */
export function pristineSettingsFor(scenario, DEFAULT_SETTINGS) {
  const scratch = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  scratch.preset_scenario = scenario;
  // A scratch view object, so probing the preset cannot move the real camera.
  const scratchView = { zoom: 1, pan: { x: 0, y: 0 } };
  try {
    applyPreset(scratch, DEFAULT_SETTINGS, scratchView);
  } catch (err) {
    console.warn('Could not derive baseline settings for', scenario, err);
  }
  // applyPreset signs off by setting preset_scenario to 'None', a sentinel that
  // stops the preset re-applying on every later settings change. Left alone it
  // would make this baseline claim to be a different scenario than the one it
  // describes, and every delta would then be computed against the wrong thing.
  scratch.preset_scenario = scenario;
  return scratch;
}

/**
 * Settings that differ from what the scenario alone would produce.
 *
 * The scenario is passed in rather than read from settings.preset_scenario,
 * which holds the 'None' sentinel applyPreset leaves behind and so names no
 * scenario at all once one has been loaded.
 *
 * @param {Object} settings - Live settings
 * @param {Object} DEFAULT_SETTINGS - Baseline settings object
 * @param {string} scenario - The scenario actually on screen
 * @returns {Object} Only the changed keys
 */
export function settingsDelta(settings, DEFAULT_SETTINGS, scenario) {
  const base = pristineSettingsFor(scenario, DEFAULT_SETTINGS);
  const delta = {};
  for (const key of Object.keys(settings)) {
    // Carried separately in the payload; duplicating it wastes bytes.
    if (key === 'preset_scenario') continue;
    const a = JSON.stringify(trim(settings[key]));
    const b = JSON.stringify(trim(base[key]));
    if (a !== b) delta[key] = trim(settings[key]);
  }
  return delta;
}

// --- Bodies ------------------------------------------------------------------

// Fields worth carrying. Everything else in get_state() is either derivable
// (radius follows from mass), cosmetic per-frame state (accretion intensity),
// or restored by the constructor when set_state leaves it alone.
const BODY_FIELDS = [
  'type',
  'pos',
  'vel',
  'mass',
  'radius',
  'name',
  'massInSuns',
  'massInEarths',
  'baseColor',
];

/**
 * Reduce a body's saved state to the parts worth transmitting.
 *
 * `id` is carried only when asked for. A share link does not need it - the
 * bodies are rebuilt in order and nothing downstream refers to them by number
 * - and it is four wasted characters per body in a payload that pays for every
 * one. The A/B bench does need it: a measurement that names "body 7" has to
 * mean the same body after the state is restored, or Run B measures something
 * else and says nothing about it. set_state() honours an incoming id, so
 * carrying it here is the whole of identity preservation.
 *
 * @param {Object} s - Result of a body's get_state()
 * @param {Object} [opts]
 * @param {boolean} [opts.withId] - Carry the object's stable id
 * @returns {Object} Trimmed state
 */
export function packBody(s, { withId = false } = {}) {
  const out = {};
  for (const f of BODY_FIELDS) {
    if (s[f] !== undefined && s[f] !== null) out[f] = trim(s[f]);
  }
  if (withId && Number.isFinite(s.id)) out.id = s.id;
  return out;
}

// --- Encode / decode ---------------------------------------------------------

/**
 * Settings that changed between two snapshots.
 * @param {Object} from - Earlier settings
 * @param {Object} to - Later settings
 * @returns {Object} Only the keys that differ
 */
export function diffSettings(from, to) {
  const out = {};
  if (!from || !to) return out;
  for (const key of Object.keys(to)) {
    if (key === 'preset_scenario') continue;
    if (JSON.stringify(trim(to[key])) !== JSON.stringify(trim(from[key]))) {
      out[key] = trim(to[key]);
    }
  }
  return out;
}

/**
 * Build the payload object for a simulation.
 *
 * Settings are carried in two parts, because *when* a setting was applied
 * changes the world it produces. Scenario generation reads some settings: * Kepler's 2nd Law computes its launch velocities from the gravitational
 * constant, while others, gravity among them, can also be changed afterwards
 * and take effect live without a rebuild. A link that collapsed both into one
 * set would rebuild "a circular orbit at G = 8" where the author had "a
 * circular orbit at G = 1, with gravity later turned up to 8": the same
 * numbers describing a quite different experiment.
 *
 * So `d` holds the settings as they stood when the world was generated and is
 * applied during the rebuild, and `a` holds what the author changed afterwards
 * and is applied once the bodies exist.
 *
 * @param {Object} opts
 * @param {string} opts.scenario - Scenario name
 * @param {number} opts.seed - Seed that generated the world
 * @param {Object} opts.settings - Live settings
 * @param {Object} [opts.generationSettings] - Settings as of the last build
 * @param {Object} opts.DEFAULT_SETTINGS - Baseline settings
 * @param {Object} [opts.camera] - {zoom, pan:{x,y}}; omitted if not wanted
 * @param {Array}  [opts.bodies] - Packed bodies; omitted for a seeded link
 * @param {boolean} [opts.paused] - Whether to open paused
 * @param {Object} [opts.extras] - Experiment extras; see experiments/canonicalState.js
 * @param {Object} [opts.experiment] - An A/B setup to reproduce; see below
 * @returns {Object} Payload
 */
export function buildPayload({
  scenario,
  seed,
  settings,
  generationSettings,
  DEFAULT_SETTINGS,
  camera,
  bodies,
  paused,
  extras,
  experiment,
}) {
  const payload = { v: VERSION, s: scenario, seed: formatSeed(seed) };
  const atBuild = generationSettings || settings;
  const delta = settingsDelta(atBuild, DEFAULT_SETTINGS, scenario);
  if (Object.keys(delta).length) payload.d = delta;
  if (generationSettings) {
    const after = diffSettings(generationSettings, settings);
    if (Object.keys(after).length) payload.a = after;
  }
  if (camera) {
    payload.c = [
      trim(camera.zoom),
      trim(camera.pan?.x ?? 0),
      trim(camera.pan?.y ?? 0),
    ];
  }
  if (bodies && bodies.length) payload.b = bodies;
  if (paused) payload.p = 1;
  // The clock, the frame, the observer and the tools an experiment has to
  // restore. Written by experiments/canonicalState.js:withExtras(), which owns
  // the shape; this only carries it. A reader that does not know the key
  // ignores it, which is what keeps older builds able to open a newer link.
  if (extras && Object.keys(extras).length) payload.x = extras;
  // An A/B experiment's *definition*: what was measured and what one variable
  // was changed between the runs. Deliberately not the recorded samples - a
  // link is for reproducing the setup, and two runs of numbers belong in the
  // CSV, not in an address bar.
  if (experiment && Object.keys(experiment).length) payload.xp = experiment;
  return payload;
}

/**
 * Encode a payload to the string that goes after the '#'.
 * @param {Object} payload - From buildPayload
 * @returns {Promise<string>} Fragment text
 */
export async function encodePayload(payload) {
  const json = JSON.stringify(payload);
  const raw = new TextEncoder().encode(json);
  const packed = await deflate(raw);
  // Compression can lose on very short payloads: deflate has overhead and a
  // 120-byte seeded link has little to find. Keep whichever is shorter.
  if (packed && packed.length < raw.length) {
    return `${VERSION}z${bytesToBase64Url(packed)}`;
  }
  return `${VERSION}r${bytesToBase64Url(raw)}`;
}

/**
 * Decode a fragment back to a payload.
 *
 * Throws with a message fit to show a user: a mangled link is the most likely
 * failure here (mail clients wrap long URLs) and "that link looks incomplete"
 * is more use than a SyntaxError.
 *
 * @param {string} fragment - Text after the '#', with or without a 'g=' prefix
 * @returns {Promise<Object>} Payload
 */
export async function decodePayload(fragment) {
  const text = String(fragment || '').replace(/^#/, '');
  const match = /^(\d+)([zr])(.*)$/s.exec(text);
  if (!match) throw new Error('That does not look like a Gravitas link.');

  const [, versionText, mode, body] = match;
  const version = Number(versionText);
  if (version > VERSION) {
    throw new Error(
      'This link was made by a newer version of Gravitas. Reload the page and try again.'
    );
  }

  let bytes;
  try {
    bytes = base64UrlToBytes(body);
  } catch {
    throw new Error('That link is incomplete or was cut short in transit.');
  }

  if (mode === 'z') bytes = await inflate(bytes);
  const json = new TextDecoder().decode(bytes);

  let payload;
  try {
    payload = JSON.parse(json);
  } catch {
    throw new Error('That link is incomplete or was cut short in transit.');
  }
  if (!payload || typeof payload !== 'object' || !payload.s) {
    throw new Error('That link does not contain a simulation.');
  }
  return payload;
}

/**
 * Read the payload's seed back as an integer.
 * @param {Object} payload - Decoded payload
 * @returns {number} Unsigned 32-bit seed
 */
export const payloadSeed = payload => parseSeed(payload.seed);

/**
 * Assemble the full URL for a fragment.
 * @param {string} fragment - From encodePayload
 * @param {string} [base] - Base URL; defaults to the current page
 * @returns {string} Shareable URL
 */
export function shareUrl(fragment, base) {
  const origin =
    base || `${location.origin}${location.pathname}${location.search}`;
  return `${origin}#${fragment}`;
}

/**
 * Decide which kind of link to offer by default.
 *
 * The test is whether a seed can describe where this world came from, not
 * whether the world has since moved. A seeded link is never inaccurate: it
 * faithfully rebuilds the starting configuration, which is what an instructor
 * handing out an activity actually wants, and it does so in a tenth of the
 * characters. Elapsed time is deliberately not consulted: a scenario that has
 * been running for ten seconds while the author reads it still has a perfectly
 * good starting setup to share, and defaulting to a 2,000-character link there
 * would penalise the most common case in the name of a distinction the two
 * clearly-labeled options already draw.
 *
 * Once anything has been placed or edited by hand there is no starting setup a
 * seed reproduces, so the bodies have to travel with the link.
 *
 * @param {Object} opts
 * @param {boolean} opts.touched - Author added, removed or edited a body
 * @returns {'seeded'|'full'} Recommended kind
 */
export function chooseKind({ touched }) {
  return touched ? 'full' : 'seeded';
}
