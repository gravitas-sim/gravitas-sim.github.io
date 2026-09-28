// The bridge's host side (spike): the Gravitas page. It never runs a cell.
// It sends a public-schema input and a notebook's code to the sandboxed
// runner over a MessagePort, takes back only a size-bounded, typed result,
// checks it as it would a file a reader chose, and records the whole run as
// a compute capsule.
import { validateObservation } from '../../js/observatory/schema.js';

const PROTOCOL = 'gravitas-notebook';
const MAX_RESULT = 4_000_000;
const MAX_FIGURE = 1_000_000;
const params = new URLSearchParams(location.search);
const RUNNER = params.get('runner') || 'runner.html';
const NOTEBOOK = params.get('notebook') || 'transit-times.ipynb';
const TIMEOUT = Number(params.get('timeout') || 180_000);
const $ = id => document.getElementById(id);
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha256 = async text => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
const status = s => ($('status').textContent = s);

/** The notebook's code, in order: what the capsule's code hash covers. */
const cellsOf = nb => nb.cells.filter(c => c.cell_type === 'code').map(c => [].concat(c.source).join(''));

/** A number column's values back from JSON, where a missing value is null. */
const revive = o => ({
  ...o,
  columns: o.columns.map(c => ({
    ...c,
    values: c.role === 'label' ? c.values : c.values.map(v => (v === null ? NaN : v)),
  })),
});

function check(result) {
  if (result.output.length > MAX_RESULT) throw new Error('the result is larger than a result may be');
  const out = JSON.parse(result.output);
  const allowed = ['table', 'values', 'figure'];
  for (const k of Object.keys(out)) if (!allowed.includes(k)) throw new Error(`"${k}" is not part of a result`);
  if (!out.table || typeof out.table !== 'object' || !Array.isArray(out.table.columns))
    throw new Error('a result needs a table');
  const problems = validateObservation(revive(out.table));
  if (problems.length) throw new Error(`the table is not an observation: ${JSON.stringify(problems[0])}`);
  const fig = out.figure;
  if (fig) {
    if (fig.type !== 'image/png' || typeof fig.base64 !== 'string' || fig.base64.length > MAX_FIGURE)
      throw new Error('the figure is not a PNG of a bounded size');
    if (!atob(fig.base64.slice(0, 12)).startsWith('\x89PNG')) throw new Error('the figure is not a PNG');
  }
  return out;
}

// The page's own heartbeat: whether it stays responsive while a notebook runs.
let ticks = 0;
setInterval(() => ticks++, 100);
const stray = [];
window.addEventListener('message', e => stray.push(String(e.data).slice(0, 80)));

async function main() {
  const t0 = performance.now();
  const [inputText, nbText] = await Promise.all([
    fetch('observation.json').then(r => r.text()),
    fetch(NOTEBOOK).then(r => r.text()),
  ]);
  const input = JSON.parse(inputText);
  const inputProblems = validateObservation(revive(input));
  if (inputProblems.length) throw new Error('the input is not an observation');
  const cells = cellsOf(JSON.parse(nbText));

  const frame = document.createElement('iframe');
  frame.sandbox = 'allow-scripts';
  frame.referrerPolicy = 'no-referrer';
  frame.title = 'Notebook runner';
  frame.src = RUNNER;
  document.body.append(frame);
  await new Promise(ok => frame.addEventListener('load', ok, { once: true }));
  const channel = new MessageChannel();
  const ready = new Promise(ok => {
    channel.port1.onmessage = ({ data }) => data?.type === 'ready' && ok(data);
  });
  frame.contentWindow.postMessage({ protocol: PROTOCOL, v: 1, type: 'hello' }, '*', [channel.port2]);
  const hello = await ready;
  window.__bridge = { probes: hello.probes, ready: performance.now() - t0 };
  status('Running the notebook.');

  const id = crypto.randomUUID();
  const reply = await new Promise((ok, bad) => {
    const timer = setTimeout(() => {
      frame.remove(); // A runaway notebook is ended by removing its frame.
      bad(new Error('the notebook did not finish in time'));
    }, TIMEOUT);
    channel.port1.onmessage = ({ data }) => {
      if (data?.protocol !== PROTOCOL || data.id !== id) return;
      clearTimeout(timer);
      if (data.type === 'result') ok(data);
      else bad(new Error(data.error || 'the notebook failed'));
    };
    channel.port1.postMessage({ protocol: PROTOCOL, v: 1, type: 'run', id, input: inputText, cells, packages: ['numpy', 'matplotlib'] });
  });
  window.__bridge.raw = reply.output.slice(0, 4000);
  window.__bridge.rawLength = reply.output.length;
  window.__bridge.stdout = reply.stdout;
  const out = check(reply);

  $('figure').src = `data:image/png;base64,${out.figure.base64}`;
  $('caption').textContent = out.table.title;
  const table = $('table');
  const cols = out.table.columns;
  const head = table.createTHead().insertRow();
  for (const c of cols) head.insertCell().textContent = c.unit ? `${c.name} (${c.unit})` : c.name;
  const body = table.createTBody();
  for (let i = 0; i < cols[0].values.length; i++) {
    const row = body.insertRow();
    for (const c of cols) row.insertCell().textContent = String(c.values[i]);
  }

  const capsule = {
    format: 'gravitas.compute-capsule',
    formatVersion: 1,
    inputs: [{ name: 'observation', format: `${input.format}/${input.formatVersion}`, sha256: await sha256(inputText), bytes: inputText.length }],
    code: { kind: 'ipynb', name: NOTEBOOK, cells: cells.length, sha256: await sha256(JSON.stringify(cells)) },
    runtime: reply.runtime,
    outputs: [
      { name: 'table', format: 'gravitas.observation/1', sha256: await sha256(JSON.stringify(out.table)) },
      { name: 'values', sha256: await sha256(JSON.stringify(out.values)) },
      { name: 'figure', format: 'image/png', sha256: await sha256(out.figure.base64) },
    ],
    citations: [
      ...input.citations,
      { text: 'Pyodide: Python compiled to WebAssembly (pyodide.org)', url: 'https://pyodide.org' },
    ],
  };
  $('capsule').textContent = JSON.stringify(capsule, null, 2);
  window.__bridge = { ...window.__bridge, capsule, values: out.values, stdout: reply.stdout, heapBytes: reply.heapBytes, marks: reply.marks, total: performance.now() - t0, ticks, stray, done: true };
  status('Done.');
}

main().catch(err => {
  status(`Failed: ${err.message}`);
  window.__bridge = { ...(window.__bridge || {}), error: err.message, ticks, stray, frameGone: !document.querySelector('iframe'), done: true };
});
