// =============================================================================
// /compute/: the compute page
// -----------------------------------------------------------------------------
// Roadmap II Prompt 101 (COMPUTE.md). Runs one of a few reviewed Python
// notebooks on a Gravitas observation, in a Worker inside a sandboxed frame
// served from the compute origin, and records the run as a compute capsule.
// Opt-in and online only: nothing here fetches the frame or the runtime until
// the reader presses "Start the runtime", after the page has said what it
// downloads. The page runs no Python and no notebook cell; it sends text, and
// checks every byte that comes back (js/compute/check.js) before drawing it,
// as text and as a data: image, never as markup.
// The page's prose is in its markup in both languages; the strings built here
// come as English/Spanish pairs.
// =============================================================================

import { mountShell } from './shell.js';
import { sha256Hex } from './hash.js';
import { NOTEBOOKS, entryOf, paramsText } from './compute/catalogue.js';
import {
  ComputeError,
  checkInput,
  checkParams,
  loadNotebook,
} from './compute/prepare.js';
import { createSession } from './compute/session.js';
import { connect, fetchFrame } from './compute/transport.js';
import { FRAME_PIN } from './compute/framePin.js';
import { RUNTIME, downloadBytes } from './compute/runtime.js';
import { LIMITS } from './compute/messages.js';
import {
  capsuleFile,
  localNotebook,
  readCapsule,
  verifyCapsule,
} from './compute/capsule.js';

const $ = id => document.getElementById(id);
const es = () => document.documentElement.lang.startsWith('es');
/** A string in the page's language. */
const L = (en, sp) => (es() ? sp : en);
/** A {en, es} pair in the page's language. */
const say = p => (es() ? p.es : p.en);

/** What each failure is called and what to do, in both languages. */
const FAILURES = {
  offline: [
    'You are offline. The runtime is downloaded from the internet, so this page needs a connection. Nothing else on Gravitas needs one. You can still open a capsule file below.',
    'Estás sin conexión. El entorno se descarga de internet, así que esta página necesita conexión. Nada más en Gravitas la necesita. Aun así puedes abrir un archivo de cápsula más abajo.',
  ],
  'frame-unreachable': [
    'The sandboxed frame could not be reached. Check your connection and try again.',
    'No se pudo acceder al marco aislado. Revisa tu conexión e inténtalo de nuevo.',
  ],
  'frame-version': [
    'The frame is not the build this page expects, so it was not started. A newer version of Gravitas may be needed: reload the page.',
    'El marco no es la versión que espera esta página, así que no se inició. Puede hacer falta una versión más reciente de Gravitas: recarga la página.',
  ],
  'handshake-timeout': [
    'The frame did not answer in time. Try again.',
    'El marco no respondió a tiempo. Inténtalo de nuevo.',
  ],
  'runtime-download': [
    'The Python runtime could not be downloaded, or a file did not match its hash. Check your connection and try again.',
    'No se pudo descargar el entorno de Python, o un archivo no coincidía con su hash. Revisa tu conexión e inténtalo de nuevo.',
  ],
  'version-mismatch': [
    'The runtime is not the release this page pins, so nothing was run. Reload the page; if it persists, the runtime network is serving something else.',
    'El entorno no es la versión que fija esta página, así que no se ejecutó nada. Recarga la página; si persiste, la red del entorno sirve otra cosa.',
  ],
  'notebook-refused': [
    'This notebook is not in the catalogue of reviewed notebooks (its hash is not there), so it was not sent.',
    'Este cuaderno no está en el catálogo de cuadernos revisados (su hash no está), así que no se envió.',
  ],
  'params-refused': [
    'One of the settings is outside its allowed range.',
    'Uno de los ajustes está fuera de su rango permitido.',
  ],
  timeout: [
    'It did not finish in time and was stopped. The runtime was removed; start it again to continue. A large input or a slow connection can do this.',
    'No terminó a tiempo y se detuvo. Se quitó el entorno; inícialo de nuevo para continuar. Una entrada grande o una conexión lenta pueden causarlo.',
  ],
  memory: [
    'The runtime ran out of memory. Try a smaller input, or a computer with more memory.',
    'El entorno se quedó sin memoria. Prueba con una entrada más pequeña, o con un ordenador con más memoria.',
  ],
  'notebook-error': [
    'The notebook stopped with an error:',
    'El cuaderno se detuvo con un error:',
  ],
  'output-refused': [
    'What the notebook returned is not what its catalogue entry declares, so it was not shown:',
    'Lo que devolvió el cuaderno no es lo que declara su entrada del catálogo, así que no se mostró:',
  ],
  cancelled: [
    'Stopped. The runtime was removed; start it again to continue.',
    'Detenido. Se quitó el entorno; inícialo de nuevo para continuar.',
  ],
  busy: [
    'Still working on the last request.',
    'Todavía trabajando en la solicitud anterior.',
  ],
  input: [
    'That file is not an input this notebook reads:',
    'Ese archivo no es una entrada que lea este cuaderno:',
  ],
  capsule: ['That capsule was not opened:', 'Esa cápsula no se abrió:'],
};

const STATES = {
  verifying: ['Checking the frame…', 'Comprobando el marco…'],
  starting: ['Starting the frame…', 'Iniciando el marco…'],
  loading: [
    'Downloading and checking the runtime…',
    'Descargando y comprobando el entorno…',
  ],
  ready: ['The runtime is ready.', 'El entorno está listo.'],
  running: ['Running the notebook…', 'Ejecutando el cuaderno…'],
  stopped: ['The runtime is stopped.', 'El entorno está detenido.'],
};
const PHASES = {
  runtime: ['Starting Python…', 'Iniciando Python…'],
  packages: ['Loading the packages…', 'Cargando los paquetes…'],
  cells: ['Running the cells…', 'Ejecutando las celdas…'],
};

const state = {
  entry: NOTEBOOKS[0],
  session: null,
  started: null, // packages the runtime was started with
  last: null, // {capsule, parts, entry, stdout, input?}
  busy: false,
};

const mb = bytes => `${(bytes / 1e6).toFixed(1)} MB`;
const num = (v, digits = 8) =>
  new Intl.NumberFormat(es() ? 'es' : 'en', {
    maximumSignificantDigits: digits,
  }).format(v);
const ms = v => `${(v / 1000).toFixed(1)} s`;

function showFailure(err, extra = '') {
  const code = err instanceof ComputeError ? err.code : 'notebook-error';
  const [en, sp] = FAILURES[code] ?? FAILURES['notebook-error'];
  const detail = [
    'notebook-error',
    'output-refused',
    'input',
    'capsule',
  ].includes(code)
    ? ` ${err.message ?? ''}`
    : '';
  const box = $('cpState');
  box.hidden = false;
  box.textContent = `${L(en, sp)}${detail}${extra}`;
  $('cpStatus').textContent = '';
}
const clearFailure = () => {
  $('cpState').hidden = true;
  $('cpState').textContent = '';
};

function saveFile(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const fetchText = async path => {
  const r = await fetch(path);
  if (!r.ok) throw new Error(String(r.status));
  return r.text();
};

// --- The notebook, its facts and its settings --------------------------------

function fillNotebooks() {
  const sel = $('cpNotebook');
  const keep = sel.value || state.entry.id;
  sel.textContent = '';
  for (const e of NOTEBOOKS) {
    const o = document.createElement('option');
    o.value = e.id;
    o.textContent = say(e.title);
    sel.append(o);
  }
  sel.value = keep;
  const kind = $('cpInputKind');
  kind.options[0].textContent = L(
    'The example Gravitas vendors',
    'El ejemplo que incluye Gravitas'
  );
  kind.options[1].textContent = L('A file of my own', 'Un archivo mío');
}

function fact(dl, term, value) {
  const dt = document.createElement('dt');
  dt.textContent = term;
  const dd = document.createElement('dd');
  dd.textContent = value;
  dl.append(dt, dd);
}

function describeEntry() {
  const e = state.entry;
  $('cpSummary').textContent = `${say(e.summary)} ${say(e.note)}`;
  const dl = $('cpFacts');
  dl.textContent = '';
  fact(
    dl,
    L('Reads', 'Lee'),
    `${e.input.format}/${e.input.version} (${e.input.kind})`
  );
  fact(
    dl,
    L('Returns', 'Devuelve'),
    [
      L(
        'numbers with units and uncertainties',
        'números con unidades e incertidumbres'
      ) +
        ` (${e.outputs.envelope.quantities.map(q => say(q.label).toLowerCase()).join(', ')})`,
      e.outputs.table ? L('a table', 'una tabla') : null,
      e.outputs.figure ? L('a plot', 'un gráfico') : null,
    ]
      .filter(Boolean)
      .join('; ')
  );
  fact(dl, L('Packages', 'Paquetes'), e.packages.join(', '));
  fact(dl, L('Notebook hash', 'Hash del cuaderno'), e.cellsSha256);
  fact(
    dl,
    L('Example input', 'Entrada de ejemplo'),
    say(e.input.example.title)
  );
  const box = $('cpParams');
  const had = Object.fromEntries(
    [...box.querySelectorAll('input')].map(i => [i.dataset.id, i.value])
  );
  box.textContent = '';
  for (const p of e.params) {
    const label = document.createElement('label');
    label.append(document.createTextNode(say(p.label)));
    const input = document.createElement('input');
    input.className = 'ui-input';
    input.type = 'number';
    input.min = p.min;
    input.max = p.max;
    input.step = p.step;
    input.value = had[p.id] ?? p.default;
    input.dataset.id = p.id;
    label.append(input);
    box.append(label);
  }
  const bytes = downloadBytes(e.packages);
  $('cpCost').textContent = L(
    `Pressing "Start the runtime" downloads about ${mb(bytes)} (Pyodide ${RUNTIME.version}, ${e.packages.join(' and ')}), once, from the internet. The runtime holds about 80 MB of memory before your data. Nothing is installed on your computer, and your browser may keep the files in its cache.`,
    `Pulsar "Iniciar el entorno" descarga unos ${mb(bytes)} (Pyodide ${RUNTIME.version}, ${e.packages.join(' y ')}), una vez, de internet. El entorno ocupa unos 80 MB de memoria antes de tus datos. No se instala nada en tu ordenador, y tu navegador puede guardar los archivos en su caché.`
  );
  $('cpStart').textContent = L(
    `Start the runtime (about ${mb(bytes)})`,
    `Iniciar el entorno (unos ${mb(bytes)})`
  );
  $('cpRun').textContent = L('Run the notebook', 'Ejecutar el cuaderno');
  $('cpStop').textContent = L('Stop', 'Detener');
  $('cpFileLabel').hidden = $('cpInputKind').value !== 'file';
}

function paramValues() {
  return Object.fromEntries(
    [...$('cpParams').querySelectorAll('input')].map(i => [
      i.dataset.id,
      Number(i.value),
    ])
  );
}

function sync() {
  const started =
    state.started && state.entry.packages.every(p => state.started.includes(p));
  const s = state.session?.state ?? 'idle';
  const working = ['verifying', 'starting', 'loading', 'running'].includes(s);
  $('cpStart').disabled = working || (s === 'ready' && started);
  $('cpRun').disabled = !(s === 'ready' && started) || state.busy;
  $('cpStop').disabled = !working;
}

// --- The session -------------------------------------------------------------

function newSession() {
  state.session?.dispose();
  state.started = null;
  state.session = createSession({
    fetchFrame,
    connect: () =>
      connect(
        document,
        $('main'),
        L('Notebook runner', 'Ejecutor de cuadernos')
      ),
    pin: FRAME_PIN,
    onState: s => {
      const w = STATES[s];
      if (w) $('cpStatus').textContent = L(...w);
      sync();
    },
    onProgress: phase => {
      $('cpStatus').textContent = L(...PHASES[phase]);
    },
  });
}

async function start() {
  clearFailure();
  newSession();
  try {
    await state.session.start(state.entry.packages);
    state.started = [...state.entry.packages];
    $('cpStatus').textContent = L(...STATES.ready);
  } catch (err) {
    showFailure(err);
  }
  sync();
}

async function inputText() {
  if ($('cpInputKind').value === 'file') {
    const f = $('cpFile').files?.[0];
    if (!f)
      throw new ComputeError(
        'input',
        L('choose a file first', 'elige un archivo primero')
      );
    if (f.size > LIMITS.input)
      throw new ComputeError(
        'input',
        L('it is larger than 2 MB', 'es mayor que 2 MB')
      );
    return {
      text: await f.text(),
      source: 'file',
      title: f.name.slice(0, 120),
    };
  }
  const e = state.entry;
  const text = await fetchText(`/${e.input.example.path}`);
  if ((await sha256Hex(text)) !== e.example.sha256)
    throw new ComputeError(
      'input',
      L('the example is not the vendored one', 'el ejemplo no es el incluido')
    );
  return { text, source: 'example', title: e.input.example.title.en };
}

async function run() {
  clearFailure();
  const e = state.entry;
  state.busy = true;
  sync();
  try {
    const bad = checkParams(e, paramValues());
    if (bad) throw bad;
    const notebook = await loadNotebook(e, fetchText);
    const input = await inputText();
    const ok = checkInput(e, input.text);
    if (!ok.ok) throw new ComputeError('input', `${ok.message} (${ok.code})`);
    const values = paramValues();
    const out = await state.session.run({
      entry: e,
      notebook,
      input,
      params: values,
      paramsText: paramsText(e, values),
      at: new Date().toISOString(),
      inputCitations: (ok.doc.citations ?? [])
        .filter(c => typeof c?.text === 'string')
        .slice(0, 20),
    });
    state.last = {
      ...out,
      entry: e,
      input,
      cells: notebook.cells,
      paramsText: paramsText(e, values),
    };
    show(state.last);
    $('cpStatus').textContent = L('Done.', 'Hecho.');
  } catch (err) {
    showFailure(err);
  } finally {
    state.busy = false;
    sync();
  }
}

// --- Showing a result and its capsule ----------------------------------------

function uncertaintyText(u) {
  if (u.kind === 'sigma') return `± ${num(u.sigma, 3)}`;
  if (u.kind === 'interval') return `${num(u.lo, 5)} – ${num(u.hi, 5)}`;
  return '–';
}

function drawTable(headId, rowsId, cols, caption, capId) {
  const head = $(headId);
  const body = $(rowsId);
  head.textContent = '';
  body.textContent = '';
  $(capId).textContent = caption;
  for (const c of cols) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = c.head;
    head.append(th);
  }
  const n = Math.min(cols[0].values.length, 500);
  for (let i = 0; i < n; i++) {
    const tr = document.createElement('tr');
    for (const c of cols) {
      const td = document.createElement('td');
      td.textContent = c.values[i];
      if (c.numeric) td.className = 'num';
      tr.append(td);
    }
    body.append(tr);
  }
}

function show({ capsule, parts, entry, stdout }) {
  const env = parts.envelope;
  const q = Object.fromEntries(
    entry.outputs.envelope.quantities.map(x => [x.id, x])
  );
  const cols = [
    { head: L('Quantity', 'Cantidad'), values: [], numeric: false },
    { head: L('Value', 'Valor'), values: [], numeric: true },
    { head: L('Uncertainty', 'Incertidumbre'), values: [], numeric: true },
    { head: L('Unit', 'Unidad'), values: [], numeric: false },
    { head: L('Kind', 'Tipo'), values: [], numeric: false },
  ];
  for (const x of env.quantities) {
    cols[0].values.push(q[x.id] ? say(q[x.id].label) : x.id);
    cols[1].values.push(num(x.value));
    cols[2].values.push(uncertaintyText(x.uncertainty));
    cols[3].values.push(
      x.unit === '' ? L('(dimensionless)', '(sin dimensión)') : x.unit
    );
    cols[4].values.push(x.origin);
  }
  drawTable(
    'cpQuantHead',
    'cpQuantRows',
    cols,
    `${say(entry.title)}: ${L('the numbers returned', 'los números devueltos')}`,
    'cpQuantCap'
  );
  $('cpResult').hidden = false;

  const tb = parts.table;
  $('cpTableBox').hidden = !tb;
  if (tb) {
    const names = tb.columns.map(c =>
      c.unit ? `${c.name} (${c.unit})` : c.name
    );
    const view = tb.columns.map((c, i) => ({
      head: names[i],
      numeric: c.role !== 'label',
      values: c.values.map(v =>
        typeof v === 'number' ? num(v, 8) : v === null ? '–' : String(v)
      ),
    }));
    drawTable('cpTableHead', 'cpTableRows', view, tb.title, 'cpTableCap');
    const rows = tb.columns[0].values.length;
    $('cpTableSummary').textContent = L(
      `The table the notebook returned (${rows} rows${rows > 500 ? ', the first 500 shown' : ''})`,
      `La tabla que devolvió el cuaderno (${rows} filas${rows > 500 ? ', se muestran las 500 primeras' : ''})`
    );
    $('cpTableBox').open = Boolean(parts.figure);
  }
  const fig = parts.figure;
  $('cpFigure').hidden = !fig;
  if (fig) {
    $('cpFigureImg').src = `data:image/png;base64,${fig.base64}`;
    const headline = env.quantities[0];
    const alt = L(
      `${say(entry.title)}: a plot. Its numbers are in the table below; the headline value is ${q[headline.id] ? say(q[headline.id].label).toLowerCase() : headline.id} ${num(headline.value, 6)} ${headline.unit}.`,
      `${say(entry.title)}: un gráfico. Sus números están en la tabla de abajo; el valor principal es ${q[headline.id] ? say(q[headline.id].label).toLowerCase() : headline.id} ${num(headline.value, 6)} ${headline.unit}.`
    );
    $('cpFigureImg').alt = alt;
    $('cpFigureCap').textContent = alt;
  }
  $('cpStdoutBox').hidden = !stdout;
  $('cpStdout').textContent = stdout ?? '';

  // The capsule.
  $('cpCapsule').hidden = false;
  const dl = $('cpCapsuleFacts');
  dl.textContent = '';
  const t = capsule.timing;
  fact(dl, L('Digest', 'Resumen'), capsule.digest);
  fact(
    dl,
    L('Notebook', 'Cuaderno'),
    `${capsule.notebook.id} v${capsule.notebook.version}, ${capsule.notebook.cellsSha256}`
  );
  for (const i of capsule.inputs)
    fact(
      dl,
      L('Input', 'Entrada'),
      `${i.format}, ${i.bytes} bytes, ${i.sha256} (${i.source === 'example' ? L('example', 'ejemplo') : L('your file', 'tu archivo')})`
    );
  fact(dl, L('Settings', 'Ajustes'), JSON.stringify(capsule.params));
  fact(
    dl,
    L('Runtime', 'Entorno'),
    `${capsule.runtime.name} ${capsule.runtime.version}, Python ${capsule.runtime.python}, ${Object.entries(
      capsule.runtime.packages
    )
      .map(([k, v]) => `${k} ${v}`)
      .join(', ')}`
  );
  fact(
    dl,
    L('Frame', 'Marco'),
    `${capsule.frame.origin}, ${capsule.frame.build.slice(0, 12)}`
  );
  fact(
    dl,
    L('Time', 'Tiempo'),
    L(
      `${ms(t.totalMs)} in all (runtime ${ms(t.runtimeMs)}, packages ${ms(t.packagesMs)}, cells ${ms(t.cellsMs)}); about ${mb(t.downloadBytes)} downloaded when cold`,
      `${ms(t.totalMs)} en total (entorno ${ms(t.runtimeMs)}, paquetes ${ms(t.packagesMs)}, celdas ${ms(t.cellsMs)}); unos ${mb(t.downloadBytes)} descargados en frío`
    )
  );
  fact(dl, L('Cite', 'Citas'), capsule.citations.map(c => c.text).join('; '));
  $('cpSaveCapsule').textContent = L(
    'Download the capsule (JSON)',
    'Descargar la cápsula (JSON)'
  );
  $('cpKeep').textContent = L('Keep in My work', 'Guardar en Mi trabajo');
  $('cpLocal').textContent = L(
    'Run it yourself: download a notebook for Jupyter',
    'Ejecútalo tú: descargar un cuaderno para Jupyter'
  );
  $('cpLocal').disabled = !state.last?.input && !state.last?.cells;
  $('cpKeepNote').textContent = '';
}

async function keep() {
  const last = state.last;
  if (!last) return;
  try {
    const { capsuleEntry, keepEntry } = await import('./compute/keep.js');
    const entry = capsuleEntry(
      last.capsule,
      last.parts.envelope,
      last.entry,
      say
    );
    const r = keepEntry(entry);
    if (!r.ok) throw new Error(r.reason);
    $('cpKeepNote').textContent = L(
      'Kept in My work as evidence. Your report can cite it, and its envelope names the capsule’s input and the notebook’s hash.',
      'Guardado en Mi trabajo como evidencia. Tu informe puede citarlo, y su sobre nombra la entrada de la cápsula y el hash del cuaderno.'
    );
  } catch (err) {
    $('cpKeepNote').textContent = L(
      `It could not be kept: ${err.message}`,
      `No se pudo guardar: ${err.message}`
    );
  }
}

function runItYourself() {
  const l = state.last;
  if (!l?.cells || !l.input) return;
  const nb = localNotebook({
    capsule: l.capsule,
    cells: l.cells,
    inputs: { [l.entry.input.name]: l.input.text },
    params: l.paramsText,
  });
  saveFile(
    `${l.capsule.notebook.id}-${l.capsule.digest.slice(0, 8)}.ipynb`,
    `${JSON.stringify(nb, null, 1)}\n`,
    'application/x-ipynb+json'
  );
}

async function openCapsule(file) {
  clearFailure();
  try {
    if (file.size > 12_000_000)
      throw new ComputeError(
        'capsule',
        L('it is larger than a capsule is', 'es más grande que una cápsula')
      );
    const read = readCapsule(await file.text());
    if (!read.ok) throw new ComputeError('capsule', read.message);
    const v = await verifyCapsule(read.capsule, entryOf);
    if (!v.ok) throw new ComputeError('capsule', v.problems.join('; '));
    const entry = entryOf(read.capsule.notebook.id);
    state.last = { capsule: read.capsule, parts: v.parts, entry, stdout: '' };
    // The "run it yourself" export needs the input's text, which a capsule
    // holds only by hash: it is available when the input was the vendored example.
    if (read.capsule.inputs[0].sha256 === entry.example.sha256) {
      const text = await fetchText(`/${entry.input.example.path}`);
      const nb = await loadNotebook(entry, fetchText);
      state.last.input = {
        text,
        source: 'example',
        title: entry.input.example.title.en,
      };
      state.last.cells = nb.cells;
      state.last.paramsText = JSON.stringify(read.capsule.params);
    }
    state.entry = entry;
    $('cpNotebook').value = entry.id;
    describeEntry();
    show(state.last);
    $('cpStatus').textContent = L(
      `Capsule opened and checked.${v.warnings.length ? ` ${v.warnings.join('; ')}.` : ''}`,
      `Cápsula abierta y comprobada.${v.warnings.length ? ` ${v.warnings.join('; ')}.` : ''}`
    );
  } catch (err) {
    showFailure(err);
  }
}

// --- Start-up ----------------------------------------------------------------

function render() {
  fillNotebooks();
  describeEntry();
  sync();
  if (state.last) show(state.last);
}

async function init() {
  try {
    const stored = window.localStorage.getItem('gravitas_locale');
    if (stored)
      document.documentElement.lang = stored.startsWith('es') ? 'es' : 'en';
  } catch {
    /* storage unavailable: the page stays in English */
  }
  mountShell({ onLanguage: render });
  render();
  $('cpNotebook').addEventListener('change', () => {
    state.entry = entryOf($('cpNotebook').value);
    describeEntry();
    sync();
  });
  $('cpInputKind').addEventListener('change', () => {
    $('cpFileLabel').hidden = $('cpInputKind').value !== 'file';
  });
  $('cpStart').addEventListener('click', start);
  $('cpRun').addEventListener('click', run);
  $('cpStop').addEventListener('click', () => {
    state.session?.cancel();
    state.started = null;
    sync();
  });
  $('cpKeep').addEventListener('click', keep);
  $('cpLocal').addEventListener('click', runItYourself);
  $('cpSaveCapsule').addEventListener('click', () => {
    if (state.last)
      saveFile(
        `capsule-${state.last.capsule.digest.slice(0, 12)}.json`,
        capsuleFile(state.last.capsule),
        'application/json'
      );
  });
  $('cpOpenFile').addEventListener('change', e => {
    const f = e.target.files?.[0];
    if (f) openCapsule(f);
  });
  window.gravitasCompute = state;
  window.computeReady = true;
}

init();
