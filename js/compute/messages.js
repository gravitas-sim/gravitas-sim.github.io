// =============================================================================
// The messages the compute page and its frame exchange: gravitas-compute/1
// -----------------------------------------------------------------------------
// Pure: what a message may look like. Whether one is obeyed at all (the window
// it came from, the port it arrived on) is the page's and the frame's to decide
// before anything here reads it. The frame and the page both import this file,
// so the contract each reads is the contract the other writes
// (tools/build-compute-frame.mjs bundles it into the frame).
//
// Every message is a plain object { protocol, version, type, ... }. A message
// is refused, not partly read, for another key, a field of the wrong type or
// a string past its bound: a small contract that refuses what it does not
// define is one that can grow later without an old message meaning something
// new. sdk/schemas/compute-messages-1.schema.json states it for outside
// readers, and tests/computeMessages.test.js holds the two to agreement.
//
//   the page's first message, to the frame's window:  hello (carries a port)
//   the page, on that port:  load | run | cancel
//   the frame, on that port: ready | loaded | progress | result | error
//
// `input` is the text of one public-schema document the notebook reads, and
// `params` the text of its few named numbers; the notebook sees both as
// strings, parses them itself, and returns text the page checks again.
// =============================================================================

export const PROTOCOL = 'gravitas-compute';
export const PROTOCOL_VERSION = 1;

/** The bounds, in characters (every string here is JSON text or ASCII). */
export const LIMITS = Object.freeze({
  id: 64,
  input: 2_000_000,
  params: 4_000,
  cell: 20_000,
  cells: 40,
  output: 4_000_000,
  figure: 1_000_000,
  stdout: 64_000,
  message: 2_000,
  probe: 80,
  probes: 12,
  packages: 4,
});

export const PACKAGE_NAMES = Object.freeze(['numpy', 'matplotlib']);
export const PHASES = Object.freeze(['runtime', 'packages', 'cells']);

/**
 * Why the frame says no.
 *   invalid-request   a message that is not one of these
 *   busy              a run was asked for while another is going
 *   runtime-download  the runtime or a package could not be fetched or checked
 *   runtime-version   the runtime is not the release the page pins
 *   notebook-error    the notebook raised, or returned nothing it should
 *   memory            the runtime ran out of memory
 *   output-too-large  the notebook's answer is past the bound
 *   cancelled         the page asked it to stop
 */
export const ERROR_CODES = Object.freeze([
  'invalid-request',
  'busy',
  'runtime-download',
  'runtime-version',
  'notebook-error',
  'memory',
  'output-too-large',
  'cancelled',
]);

const ID = /^[A-Za-z0-9_.:-]{1,64}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const PROBE_KEY = /^[A-Za-z][A-Za-z0-9.]{0,31}$/;
const NAME = /^[a-z][a-z0-9_-]{0,31}$/;
const VERSION = /^[0-9A-Za-z.+_-]{1,32}$/;

/** A plain object of any realm: its prototype's prototype is null. */
const isObj = v => {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const p = Object.getPrototypeOf(v);
  return p === null || Object.getPrototypeOf(p) === null;
};
const str = max => v => typeof v === 'string' && v.length <= max;
const re =
  (r, max = 128) =>
  v =>
    typeof v === 'string' && v.length <= max && r.test(v);
const int = (min, max) => v => Number.isInteger(v) && v >= min && v <= max;
const num = (min, max) => v =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const oneOf = list => v => list.includes(v);
const list = (item, max) => v =>
  Array.isArray(v) && v.length <= max && v.every(item);
const packages = list(oneOf(PACKAGE_NAMES), LIMITS.packages);
const dict = (key, value, max) => v =>
  isObj(v) &&
  Object.keys(v).length <= max &&
  Object.entries(v).every(([k, x]) => key.test(k) && value(x));
const shape =
  (fields, optional = []) =>
  v =>
    isObj(v) &&
    Object.keys(v).every(k => Object.hasOwn(fields, k)) &&
    Object.entries(fields).every(([k, ok]) =>
      Object.hasOwn(v, k) ? ok(v[k]) : optional.includes(k)
    );

const marks = shape(
  { runtime: num(0, 1e9), packages: num(0, 1e9), cells: num(0, 1e9) },
  ['runtime', 'packages', 'cells']
);
const runtime = shape(
  {
    name: re(NAME, 32),
    version: re(VERSION, 32),
    python: re(VERSION, 32),
    lockSha256: re(HEX64, 64),
    packages: dict(NAME, v => v === null || re(VERSION, 32)(v), 16),
  },
  []
);

/** What each message carries, beyond protocol, version and type. */
const SPEC = Object.freeze({
  // The page's.
  hello: { fields: {}, from: 'page' },
  load: { fields: { id: re(ID, 64), packages }, from: 'page' },
  run: {
    fields: {
      id: re(ID, 64),
      input: str(LIMITS.input),
      params: str(LIMITS.params),
      cells: list(str(LIMITS.cell), LIMITS.cells),
      packages,
    },
    from: 'page',
  },
  cancel: { fields: { id: re(ID, 64) }, from: 'page' },
  // The frame's.
  ready: {
    fields: {
      build: re(HEX64, 64),
      probes: dict(PROBE_KEY, str(LIMITS.probe), LIMITS.probes),
    },
    from: 'frame',
  },
  loaded: {
    fields: {
      id: re(ID, 64),
      runtime,
      marks,
      heapBytes: int(0, 2 ** 32),
    },
    from: 'frame',
  },
  progress: {
    fields: { id: re(ID, 64), phase: oneOf(PHASES) },
    from: 'frame',
  },
  result: {
    fields: {
      id: re(ID, 64),
      output: str(LIMITS.output),
      stdout: str(LIMITS.stdout),
      heapBytes: int(0, 2 ** 32),
      marks,
      runtime,
    },
    from: 'frame',
  },
  error: {
    fields: {
      id: v => v === null || re(ID, 64)(v),
      code: oneOf(ERROR_CODES),
      message: str(LIMITS.message),
    },
    from: 'frame',
  },
});

export const PAGE_TYPES = Object.freeze(
  Object.keys(SPEC).filter(t => SPEC[t].from === 'page')
);
export const FRAME_TYPES = Object.freeze(
  Object.keys(SPEC).filter(t => SPEC[t].from === 'frame')
);

/** A message of this type, as the page or the frame writes it. */
export const message = (type, fields = {}) => ({
  protocol: PROTOCOL,
  version: PROTOCOL_VERSION,
  type,
  ...fields,
});

/**
 * Read a message sent by `from`.
 * @param {*} data - MessageEvent.data, as the structured clone delivered it
 * @param {'page'|'frame'} from - Who is allowed to send it
 * @returns {{ok: true, message: object} | {ok: false, code: string, id: ?string}}
 *   code is bad-message, unsupported-version, unknown-type or bad-field
 */
export function readMessage(data, from) {
  const id = isObj(data) && re(ID, 64)(data.id) ? data.id : null;
  if (!isObj(data)) return { ok: false, code: 'bad-message', id };
  if (data.protocol !== PROTOCOL) return { ok: false, code: 'bad-message', id };
  if (data.version !== PROTOCOL_VERSION)
    return { ok: false, code: 'unsupported-version', id };
  const spec =
    typeof data.type === 'string' && Object.hasOwn(SPEC, data.type)
      ? SPEC[data.type]
      : null;
  if (!spec || spec.from !== from)
    return { ok: false, code: 'unknown-type', id };
  const rest = { ...data };
  for (const k of ['protocol', 'version', 'type']) delete rest[k];
  const body = shape(spec.fields, [])(rest);
  return body
    ? { ok: true, message: data }
    : { ok: false, code: 'bad-field', id };
}
