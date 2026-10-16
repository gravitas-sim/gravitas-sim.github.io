#!/usr/bin/env node
// =============================================================================
// The answers the reviewed notebooks gave, as fixtures for the tests
// -----------------------------------------------------------------------------
//   node tools/compute-answers.mjs <id> [<id> ...]
//   node tools/compute-answers.mjs --runs
//   node tools/compute-answers.mjs --sampler
//
// With ids, one answer per notebook. With --runs, the declared quantities of
// the few other runs the companion investigations ask a student to make
// (settings differ from the defaults), to
// tests/fixtures/compute/investigation-runs.json; tests/computeInvestigations
// checks each investigation's graded step against them. With --sampler, the
// posterior-sampling notebook's sampler is run on the analytic cases of the
// Prompt 103 gate (tools/compute-sampler-cases.py) and what it got is written to
// tests/fixtures/compute/sampler-cases.json, which tests/computeSampler holds
// to the exact answers.
//
// Roadmap II Prompt 102 (COMPUTE.md). Runs a notebook's code cells under the
// machine's CPython with its example input and default settings, and writes
// the answer exactly as the frame's wrapper writes one (sorted keys, no
// spaces, no NaN) to tests/fixtures/compute/<id>.answer.json. Jest reads that
// file instead of running Python: the tests check that the page accepts what
// a real run returns and that its numbers are the catalogue's `expected`
// ones. It is not a check (CPython and NumPy differ from the pinned runtime in
// the last digits, and only a real run in the frame can say the runtime
// agrees: COMPUTE_ONLINE=1 e2e/computeOnline.spec.js). Needs a Python 3 with
// numpy, matplotlib, scipy and astropy (astropy needs pyyaml too): python3, or
// the interpreter named by GRAVITAS_PYTHON.
// =============================================================================

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CATALOGUE_DATA } from '../js/compute/catalogueData.js';
import { HASHES } from '../js/compute/catalogueHashes.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PYTHON = process.env.GRAVITAS_PYTHON || 'python3';
const ids = process.argv.slice(2).filter(a => !a.startsWith('--'));
const runsMode = process.argv.includes('--runs');
const samplerMode = process.argv.includes('--sampler');
if (!ids.length && !runsMode && !samplerMode) {
  console.error(
    'Usage: node tools/compute-answers.mjs <notebook id> ... | --runs | --sampler'
  );
  process.exit(2);
}

const RUN = `
import contextlib, io, json, sys
spec = json.load(sys.stdin)
g = {"gravitas_input": spec["input"], "gravitas_params": spec["params"]}
with contextlib.redirect_stdout(io.StringIO()):
    for cell in spec["cells"]:
        exec(cell, g)
o = g["gravitas_output"]
print(json.dumps({k: json.dumps(o[k], sort_keys=True, separators=(",", ":"), allow_nan=False) for k in o}, allow_nan=False))
`;

/** The frame's answer text for a notebook run with these settings. */
function answerFor(e, set = {}) {
  const nb = JSON.parse(readFileSync(path.join(ROOT, e.notebook), 'utf8'));
  const cells = nb.cells
    .filter(c => c.cell_type === 'code')
    .map(c => [].concat(c.source ?? []).join(''));
  const params = {
    ...Object.fromEntries(e.params.map(p => [p.id, p.default])),
    ...set,
  };
  const input = readFileSync(path.join(ROOT, e.input.example.path), 'utf8');
  return execFileSync(PYTHON, ['-c', RUN], {
    input: JSON.stringify({
      cells,
      input,
      params: JSON.stringify(
        Object.fromEntries(e.params.map(p => [p.id, params[p.id]]))
      ),
    }),
    encoding: 'utf8',
    maxBuffer: 64e6,
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

/** The runs the investigations ask for: notebook, name, settings. */
const RUNS = [
  ['integrators-compared', 'steps1000', { steps: 1000 }],
  ['integrators-compared', 'steps438', { steps: 438 }],
  ['population-at-scale', 'slope0', { slope: 0 }],
  ['population-at-scale', 'cutoff6', { cutoff: 6 }],
  ['refit-transit', 'limb0', { limb: 0 }],
];

if (runsMode) {
  const out = {};
  for (const [id, name, set] of RUNS) {
    const e = CATALOGUE_DATA.find(x => x.id === id);
    const env = JSON.parse(JSON.parse(answerFor(e, set)).envelope);
    out[`${id}/${name}`] = Object.fromEntries(
      env.quantities.map(q => [
        q.id,
        {
          value: q.value,
          sigma: q.uncertainty.sigma ?? null,
          ...(q.uncertainty.kind === 'interval'
            ? { lo: q.uncertainty.lo, hi: q.uncertainty.hi }
            : {}),
        },
      ])
    );
  }
  writeFileSync(
    path.join(ROOT, 'tests/fixtures/compute/investigation-runs.json'),
    `${JSON.stringify(out, null, 2)}\n`
  );
  console.log(`${Object.keys(out).length} runs`);
}

for (const id of ids) {
  const e = CATALOGUE_DATA.find(x => x.id === id);
  if (!e) throw new Error(`no notebook ${id}`);
  const out = answerFor(e);
  const file = path.join(ROOT, `tests/fixtures/compute/${id}.answer.json`);
  writeFileSync(file, out);
  console.log(`${id}: ${out.length} characters`);
}

if (samplerMode) {
  const e = CATALOGUE_DATA.find(x => x.id === 'posterior-sampling');
  execFileSync(
    PYTHON,
    [
      path.join(ROOT, 'tools/compute-sampler-cases.py'),
      path.join(ROOT, e.notebook),
      HASHES[e.id].cellsSha256,
      path.join(ROOT, 'tests/fixtures/compute/sampler-cases.json'),
    ],
    { stdio: 'inherit', maxBuffer: 64e6 }
  );
  // The same notebook, run on the transit with far too few steps, must refuse
  // to report an interval and say why (it raises; the frame reports the last
  // lines of the traceback). The message is what a student reads.
  let refusal = null;
  try {
    answerFor(e, { steps: 1000 });
  } catch (err) {
    refusal = String(err.stderr ?? err.message)
      .trim()
      .split('\n')
      .at(-1);
  }
  if (!refusal?.includes('refused'))
    throw new Error('a 1000-step run was not refused');
  writeFileSync(
    path.join(ROOT, 'tests/fixtures/compute/posterior-sampling.refusal.json'),
    `${JSON.stringify({ steps: 1000, message: refusal }, null, 2)}\n`
  );
}
