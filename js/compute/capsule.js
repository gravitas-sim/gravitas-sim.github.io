// =============================================================================
// gravitas.compute-capsule/1: one run, recorded so it can be checked again
// -----------------------------------------------------------------------------
// A capsule says which reviewed notebook ran (by the hash of its cells), on
// which inputs (by the hash of each, exactly as it was sent), with which
// numbers it was asked for, on which runtime and frame, and what came back:
// the notebook's answer as the exact text it returned, so anyone can hash it
// again, with its timing and citations. It is enough to say whether a later
// run is the same computation. It is not enough to repeat one if the CDN stops
// serving the pinned release; COMPUTE.md says so.
//
// Three things are built here, none of which touches the DOM:
//
//   buildCapsule   from a finished run
//   verifyCapsule  from a file: structure, every hash, the notebook against
//                  the catalogue, and the answer checked again as a result
//   localNotebook  the "run it yourself" export: one .ipynb holding the
//                  inputs, the notebook's cells and a last cell that checks a
//                  researcher's own outputs against the capsule's hashes
//
// The digest covers the notebook, inputs, parameters, runtime and the hash of
// each output. It leaves out the frame, the timing, the clock and the
// citations, so two runs of the same computation share it.
// =============================================================================

import { canonicalJsonExact, sha256Hex } from '../hash.js';
import { checkOutput } from './check.js';
import { RUNTIME } from './runtime.js';

export const FORMAT = 'gravitas.compute-capsule';
export const FORMAT_VERSION = 1;
/** The largest capsule file read at all, in characters. */
export const MAX_CAPSULE_CHARS = 12_000_000;

const HEX64 = /^[0-9a-f]{64}$/;
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const bytesOf = text => new TextEncoder().encode(text).length;

/** The cells a notebook runs, in order: what its hash covers. */
export const cellsOf = nb =>
  (nb?.cells ?? [])
    .filter(c => c.cell_type === 'code')
    .map(c => [].concat(c.source ?? []).join(''));

/** The hash of a notebook's cells, as the capsule and the catalogue record it. */
export const cellsHash = cells => sha256Hex(JSON.stringify(cells));

/** What the digest covers, in the one order it is written. */
const digestBody = c => ({
  notebook: c.notebook,
  inputs: c.inputs,
  params: c.params,
  runtime: c.runtime,
  outputs: c.outputs.map(o => ({ name: o.name, sha256: o.sha256 })),
});

/** Citations once each, by their words, in the order given. */
const uniqueCitations = list => {
  const seen = new Set();
  return list.filter(c => !seen.has(c.text) && seen.add(c.text));
};

/**
 * A capsule for a finished run.
 *
 * @param {object} a
 * @param {object} a.entry - The catalogue entry (js/compute/catalogue.js)
 * @param {Array<{name: string, text: string, format: string, source: string, title: string}>} a.inputs
 * @param {object} a.params - Name to number, as asked
 * @param {{texts: object}} a.checked - checkOutput's ok result
 * @param {object} a.runtime - The frame's runtime record
 * @param {{origin: string, build: string}} a.frame
 * @param {object} a.timing - Milliseconds: runtime, packages, cells, total; and downloadBytes
 * @param {string} a.cellsSha256 - The hash of the cells that ran
 * @param {number} a.cellCount
 * @param {string} [a.at] - ISO time, kept out of the digest
 * @param {Array<{text: string, url?: string}>} [a.citations] - The notebook's, then the input's; default the notebook's
 * @returns {Promise<object>} The capsule
 */
export async function buildCapsule({
  entry,
  inputs,
  params,
  checked,
  runtime,
  frame,
  timing,
  cellsSha256,
  cellCount,
  at,
  citations = entry.citations,
}) {
  const outputs = [];
  for (const name of ['envelope', 'table', 'figure']) {
    const text = checked.texts[name];
    if (text === undefined) continue;
    outputs.push({
      name,
      format:
        name === 'envelope'
          ? 'gravitas.artifact/1'
          : name === 'table'
            ? 'gravitas.observation/1'
            : 'image/png',
      sha256: await sha256Hex(text),
      bytes: bytesOf(text),
      text,
    });
  }
  const capsule = {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    digest: '',
    notebook: {
      id: entry.id,
      version: entry.version,
      title: entry.title.en,
      cells: cellCount,
      cellsSha256,
    },
    inputs: await Promise.all(
      inputs.map(async i => ({
        name: i.name,
        format: i.format,
        sha256: await sha256Hex(i.text),
        bytes: bytesOf(i.text),
        source: i.source,
        title: i.title,
      }))
    ),
    params,
    runtime,
    frame,
    outputs,
    timing,
    citations: uniqueCitations(citations),
    ...(at ? { made: { app: 'gravitas', at } } : { made: { app: 'gravitas' } }),
  };
  capsule.digest = await sha256Hex(canonicalJsonExact(digestBody(capsule)));
  return capsule;
}

/**
 * Everything structurally wrong with a capsule, as {path, code, message}. It
 * does not hash anything: verifyCapsule does.
 * @param {unknown} doc
 * @returns {Array<{path: string, code: string, message: string}>}
 */
export function validateCapsule(doc) {
  const problems = [];
  const need = (ok, path, code, message) => {
    if (!ok) problems.push({ path, code, message });
    return ok;
  };
  if (!need(isObj(doc), '', 'notObject', 'is not an object')) return problems;
  need(doc.format === FORMAT, 'format', 'format', `is not "${FORMAT}"`);
  need(
    doc.formatVersion === FORMAT_VERSION,
    'formatVersion',
    'version',
    `is not ${FORMAT_VERSION}; this reads /${FORMAT_VERSION}`
  );
  need(HEX64.test(doc.digest ?? ''), 'digest', 'digest', 'is not a SHA-256');
  const text = v => typeof v === 'string' && v !== '';
  if (need(isObj(doc.notebook), 'notebook', 'required', 'is required')) {
    need(text(doc.notebook.id), 'notebook.id', 'required', 'is required');
    need(
      Number.isInteger(doc.notebook.version),
      'notebook.version',
      'number',
      'is not an integer'
    );
    need(
      HEX64.test(doc.notebook.cellsSha256 ?? ''),
      'notebook.cellsSha256',
      'digest',
      'is not a SHA-256'
    );
  }
  if (need(Array.isArray(doc.inputs), 'inputs', 'required', 'is a list'))
    doc.inputs.forEach((i, k) => {
      need(
        isObj(i) && text(i.name) && HEX64.test(i.sha256 ?? ''),
        `inputs[${k}]`,
        'input',
        'needs a name and a SHA-256'
      );
    });
  need(isObj(doc.params), 'params', 'required', 'is required');
  if (need(isObj(doc.runtime), 'runtime', 'required', 'is required')) {
    need(
      text(doc.runtime.version),
      'runtime.version',
      'required',
      'is required'
    );
    need(
      HEX64.test(doc.runtime.lockSha256 ?? ''),
      'runtime.lockSha256',
      'digest',
      'is not a SHA-256'
    );
  }
  if (need(Array.isArray(doc.outputs), 'outputs', 'required', 'is a list'))
    doc.outputs.forEach((o, k) => {
      need(
        isObj(o) &&
          ['envelope', 'table', 'figure'].includes(o.name) &&
          HEX64.test(o.sha256 ?? '') &&
          typeof o.text === 'string',
        `outputs[${k}]`,
        'output',
        'needs a name, a SHA-256 and the text returned'
      );
    });
  need(Array.isArray(doc.citations), 'citations', 'required', 'is a list');
  return problems;
}

/**
 * A capsule from a file's text.
 * @param {string} text
 * @returns {{ok: true, capsule: object} | {ok: false, code: string, message: string}}
 */
export function readCapsule(text) {
  if (typeof text !== 'string' || text.length > MAX_CAPSULE_CHARS)
    return {
      ok: false,
      code: 'too-large',
      message: 'is larger than a capsule is',
    };
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    return { ok: false, code: 'not-json', message: 'is not JSON' };
  }
  const problems = validateCapsule(doc);
  if (problems.length) {
    const p = problems[0];
    return {
      ok: false,
      code:
        JSON.parse(text).formatVersion > FORMAT_VERSION ? 'newer' : 'invalid',
      message: `${p.path} ${p.message}`.trim(),
    };
  }
  return { ok: true, capsule: doc };
}

/**
 * Whether a capsule is what it says: every hash, the notebook against the
 * catalogue, and its answer checked again as a result.
 *
 * @param {object} capsule - Passed readCapsule
 * @param {(id: string) => ?object} entryOf - The catalogue's entry for an id
 * @returns {Promise<{ok: boolean, problems: string[], warnings: string[],
 *   parts: ?object}>} `problems` are reasons to refuse; `warnings` say what
 *   differs without making it wrong (another runtime release)
 */
export async function verifyCapsule(capsule, entryOf) {
  const problems = [];
  const warnings = [];
  const entry = entryOf(capsule.notebook.id);
  if (!entry) problems.push(`"${capsule.notebook.id}" is not in the catalogue`);
  else {
    if (entry.version !== capsule.notebook.version)
      warnings.push(
        `made by version ${capsule.notebook.version} of the notebook; the catalogue has ${entry.version}`
      );
    if (entry.cellsSha256 !== capsule.notebook.cellsSha256)
      problems.push(
        'the notebook it names is not the one in the catalogue (its hash differs)'
      );
  }
  for (const o of capsule.outputs)
    if ((await sha256Hex(o.text)) !== o.sha256)
      problems.push(`the ${o.name} does not match its hash`);
  const digest = await sha256Hex(canonicalJsonExact(digestBody(capsule)));
  if (digest !== capsule.digest) problems.push('the digest does not match');
  if (capsule.runtime.version !== RUNTIME.version)
    warnings.push(
      `run on Pyodide ${capsule.runtime.version}; this page pins ${RUNTIME.version}`
    );
  let parts = null;
  if (entry) {
    const texts = Object.fromEntries(
      capsule.outputs.map(o => [o.name, o.text])
    );
    const checked = checkOutput(JSON.stringify(texts), entry.outputs);
    if (!checked.ok) problems.push(checked.message);
    else parts = checked.parts;
  }
  return { ok: problems.length === 0, problems, warnings, parts };
}

/** The capsule as the file a reader saves. */
export const capsuleFile = capsule => `${JSON.stringify(capsule, null, 2)}\n`;

const b64 = text => {
  const bytes = new TextEncoder().encode(text);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
const lines = text => {
  const out = text.split('\n');
  return out.map((l, i) => (i < out.length - 1 ? `${l}\n` : l));
};
const mdCell = text => ({
  cell_type: 'markdown',
  metadata: {},
  source: lines(text),
});
const codeCell = text => ({
  cell_type: 'code',
  metadata: {},
  execution_count: null,
  outputs: [],
  source: lines(text),
});

const PACKAGE_WORDS = {
  numpy: 'NumPy',
  matplotlib: 'Matplotlib',
  scipy: 'SciPy',
  astropy: 'Astropy',
};

/** "NumPy", "NumPy and SciPy": the packages a local Python needs, in words. */
const needs = names => {
  const words = names.map(n => PACKAGE_WORDS[n] ?? n);
  return words.length < 2
    ? (words[0] ?? 'NumPy')
    : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
};

/**
 * The "run it yourself" export: one notebook for a local Jupyter that holds
 * the inputs, the reviewed notebook's cells and a last cell that compares the
 * researcher's own outputs with the capsule's hashes.
 *
 * @param {object} a
 * @param {object} a.capsule - A verified capsule
 * @param {string[]} a.cells - The reviewed notebook's code cells
 * @param {Object<string, string>} a.inputs - Input name to its exact text
 * @param {string} a.params - The text of the parameters, as sent
 * @returns {object} An nbformat 4 notebook
 */
export function localNotebook({ capsule, cells, inputs, params }) {
  const pkgs = Object.entries(capsule.runtime.packages)
    .map(([k, v]) => `${k}==${v}`)
    .join(', ');
  const hashes = Object.fromEntries(
    capsule.outputs.map(o => [o.name, o.sha256])
  );
  const head = [
    `# ${capsule.notebook.title}`,
    '',
    `A Gravitas compute capsule, as a notebook for your own Jupyter. It holds the input the run read, the reviewed notebook's code cells exactly as Gravitas ran them, and a last cell that compares what your Python returns with the capsule.`,
    '',
    `- Capsule digest: \`${capsule.digest}\``,
    `- Notebook: \`${capsule.notebook.id}\`, version ${capsule.notebook.version}, cells hash \`${capsule.notebook.cellsSha256}\``,
    `- Gravitas ran it on Pyodide ${capsule.runtime.version} (Python ${capsule.runtime.python})${pkgs ? `, with ${pkgs}` : ''}.`,
    `- You need Python 3 with ${needs(Object.keys(capsule.runtime.packages))}. Run the cells in order.`,
    '',
    'The same bytes need the same package versions; a different NumPy can differ in the last digits, and the last cell says by how much.',
  ].join('\n');
  const setup = [
    '# The input and parameters, exactly as Gravitas sent them to the notebook.',
    'import base64',
    ...Object.entries(inputs).map(
      ([name, text]) =>
        `gravitas_input = base64.b64decode(${JSON.stringify(b64(text))}).decode("utf-8")  # ${name}`
    ),
    `gravitas_params = base64.b64decode(${JSON.stringify(b64(params))}).decode("utf-8")`,
  ].join('\n');
  const verify = [
    '# Compare your outputs with the capsule.',
    'import hashlib, json',
    `CAPSULE_HASHES = ${JSON.stringify(hashes, null, 2)}`,
    `CAPSULE_ENVELOPE = base64.b64decode(${JSON.stringify(b64(capsule.outputs.find(o => o.name === 'envelope')?.text ?? '{}'))}).decode("utf-8")`,
    'texts = {k: json.dumps(gravitas_output[k], sort_keys=True, separators=(",", ":"), allow_nan=False) for k in gravitas_output}',
    'for name, want in CAPSULE_HASHES.items():',
    '    got = hashlib.sha256(texts[name].encode("utf-8")).hexdigest() if name in texts else None',
    '    print(f"{name:9s}", "MATCH" if got == want else "DIFFERENT", got)',
    'mine = {q["id"]: q["value"] for q in json.loads(texts["envelope"])["quantities"]}',
    'theirs = {q["id"]: q["value"] for q in json.loads(CAPSULE_ENVELOPE)["quantities"]}',
    'for k in sorted(theirs):',
    '    a, b = mine.get(k), theirs[k]',
    '    rel = abs(a - b) / max(abs(b), 1e-300) if a is not None else None',
    '    print(f"  {k:24s} yours {a!r:>24}  capsule {b!r:>24}  relative difference {rel if rel is None else format(rel, \'.2e\')}")',
  ].join('\n');
  return {
    nbformat: 4,
    nbformat_minor: 4,
    metadata: {
      kernelspec: {
        display_name: 'Python 3',
        language: 'python',
        name: 'python3',
      },
      language_info: { name: 'python' },
      gravitas: { capsule: capsule.digest, notebook: capsule.notebook.id },
    },
    cells: [
      mdCell(head),
      codeCell(setup),
      ...cells.map(codeCell),
      codeCell(verify),
    ],
  };
}
