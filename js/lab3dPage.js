// =============================================================================
// The 3-D dynamics diagnostics page (/lab3d/)
// -----------------------------------------------------------------------------
// A harness for the 3-D kernel (js/lab3d/, LAB3D.md), not a student view:
// run a reference problem, or any system file, in a Worker of its own; read
// the residuals, the checks against the validation's tolerances, the events
// and the warnings as tables; see the conserved-quantity errors and the
// bodies' paths as plain plots; and measure the kernel's speed on this
// device. The page never integrates: every run, and every check's extra
// run, is the Worker's.
// =============================================================================

import {
  LANGUAGES,
  language,
  loadLanguage,
  preferred,
  setLanguage,
  t,
  translatePage,
} from './lab3d/i18n.js';
import { createLab3d } from './lab3d/api.js';
import { migrateSystem, validateSystem } from './lab3d/state.js';
import { REFERENCES } from './lab3d/references.js';

const $ = id => document.getElementById(id);
const SVG = 'http://www.w3.org/2000/svg';
const lab = createLab3d({
  spawn: () =>
    new Worker(new URL('./lab3d/worker.js', import.meta.url), {
      type: 'module',
    }),
});
const SCHEMES = ['yoshida4c', 'yoshida4', 'leapfrog', 'rk4', 'dopri5'];
const MAX_FILE = 1024 * 1024;
let current = null;
let fileSystem = null;
let last = null;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat())
    if (c !== null && c !== undefined && c !== false) node.append(c);
  return node;
}
const svg = (tag, attrs = {}) => {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};
const num = v =>
  typeof v !== 'number' || !Number.isFinite(v)
    ? String(v)
    : v === 0
      ? '0'
      : Math.abs(v) >= 0.01 && Math.abs(v) < 1e5
        ? new Intl.NumberFormat(language(), {
            maximumSignificantDigits: 4,
          }).format(v)
        : v.toExponential(2);
const status = text => ($('lb-status').textContent = text);

// --- Controls -------------------------------------------------------------------

function fillControls() {
  const problem = $('lb-problem');
  const keep = problem.value;
  problem.replaceChildren(
    ...REFERENCES.map(r =>
      el('option', { value: r.id, text: `${r.id}: ${r.title}` })
    ),
    el('option', { value: 'file', text: t('lab3d.problem.file') })
  );
  problem.value = keep || 'R5';
  const scheme = $('lb-scheme');
  const keepScheme = scheme.value;
  scheme.replaceChildren(
    el('option', { value: '', text: t('lab3d.scheme.default') }),
    ...SCHEMES.map(s =>
      el('option', { value: s, text: t(`lab3d.scheme.${s}`) })
    )
  );
  scheme.value = keepScheme;
  syncControls();
}

function syncControls() {
  const file = $('lb-problem').value === 'file';
  $('lb-file-row').hidden = !file;
  $('lb-span-row').hidden = !file;
  $('lb-go').disabled = file && !fileSystem;
}

/** The integrator the controls ask for, or undefined for the problem's own. */
function integratorAsked() {
  const scheme = $('lb-scheme').value;
  if (!scheme) return undefined;
  const value = Number($('lb-step').value.replace(',', '.'));
  if (!(value > 0)) return null;
  return scheme === 'dopri5' ? { scheme, tol: value } : { scheme, h: value };
}

// --- Running --------------------------------------------------------------------

async function go() {
  const integrator = integratorAsked();
  if (integrator === null)
    return status(t('lab3d.status.refused', { why: t('lab3d.step') }));
  const started = performance.now();
  $('lb-go').disabled = true;
  $('lb-cancel').disabled = false;
  $('lb-progress').value = 0;
  const onProgress = f => {
    $('lb-progress').value = f;
    status(t('lab3d.status.running', { percent: Math.round(f * 100) }));
  };
  const problem = $('lb-problem').value;
  try {
    if (problem === 'file') {
      const system = integrator ? { ...fileSystem, integrator } : fileSystem;
      const span = Number($('lb-span').value.replace(',', '.'));
      const samples = Math.round(Number($('lb-samples').value));
      current = lab.run(
        system,
        { span, samples, positions: true },
        { onProgress }
      );
      const result = await current.done;
      last = { result, checks: null, bodies: system.bodies.map(b => b.id) };
    } else {
      current = lab.reference(problem, { integrator, onProgress });
      const answer = await current.done;
      last = {
        result: answer.result,
        checks: answer.checks,
        bodies: answer.system.bodies,
      };
    }
    const seconds = ((performance.now() - started) / 1000).toFixed(1);
    status(
      last.result.status === 'canceled'
        ? t('lab3d.status.canceled')
        : t('lab3d.status.done', { status: last.result.status, seconds })
    );
    render();
  } catch (err) {
    const why = err.problems
      ? err.problems.map(p => `${p.path}: ${p.code}`).join('; ')
      : err.message;
    status(
      t(
        err.code === 'refused' ? 'lab3d.status.refused' : 'lab3d.status.failed',
        { why }
      )
    );
  } finally {
    current = null;
    $('lb-go').disabled = false;
    $('lb-cancel').disabled = true;
    syncControls();
  }
}

async function openFile(file) {
  fileSystem = null;
  syncControls();
  if (!file || file.size > MAX_FILE) return status(t('lab3d.status.fileBad'));
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return status(t('lab3d.status.fileBad'));
  }
  const m = migrateSystem(data);
  if (!m.ok || validateSystem(m.system).length)
    return status(t('lab3d.status.fileBad'));
  fileSystem = m.system;
  status(
    m.migrated
      ? t('lab3d.status.migrated')
      : t('lab3d.status.fileOpened', { n: m.system.bodies.length })
  );
  syncControls();
}

// --- Results ---------------------------------------------------------------------

function table(caption, head, rows) {
  return el(
    'table',
    { class: 'ui-table' },
    el('caption', { text: caption }),
    el(
      'thead',
      {},
      el('tr', {}, ...head.map(h => el('th', { scope: 'col', text: h })))
    ),
    el(
      'tbody',
      {},
      ...rows.map(r =>
        el(
          'tr',
          {},
          ...r.map((c, i) =>
            el(
              i === 0 ? 'th' : 'td',
              i === 0 ? { scope: 'row', text: c } : { text: c }
            )
          )
        )
      )
    )
  );
}

function render() {
  if (!last) return;
  const { result, checks } = last;
  const r = result.residuals;
  const s = result.stats;
  $('lb-results').replaceChildren(
    table(
      t('lab3d.results.caption'),
      [t('lab3d.results.quantity'), t('lab3d.results.value')],
      [
        [t('lab3d.r.status'), result.status],
        [t('lab3d.r.energy'), num(r.energy)],
        [t('lab3d.r.angularMomentum'), num(r.angularMomentum)],
        [t('lab3d.r.momentum'), num(r.momentum)],
        [t('lab3d.r.evals'), num(s.evals)],
        [t('lab3d.r.steps'), num(s.steps)],
        [t('lab3d.r.wall'), num(s.wallMs / 1000)],
        [
          t('lab3d.r.rate'),
          num(s.wallMs > 0 ? (s.steps / s.wallMs) * 1000 : 0),
        ],
      ]
    )
  );
  $('lb-checks').replaceChildren(
    checks
      ? table(
          t('lab3d.checks.caption'),
          [
            t('lab3d.checks.what'),
            t('lab3d.checks.value'),
            t('lab3d.checks.tolerance'),
            t('lab3d.checks.result'),
          ],
          checks.map(c => [
            c.what,
            num(c.value),
            c.diagnostic
              ? ''
              : c.tolerance !== undefined
                ? `≤ ${num(c.tolerance)}`
                : c.atLeast !== undefined
                  ? `≥ ${num(c.atLeast)}`
                  : `= ${c.exactly}`,
            c.diagnostic
              ? t('lab3d.checks.diagnostic')
              : c.ok
                ? t('lab3d.checks.pass')
                : t('lab3d.checks.fail'),
          ])
        )
      : el('p', { text: t('lab3d.checks.none') })
  );
  $('lb-events').replaceChildren(
    result.events.length
      ? table(
          t('lab3d.events.caption'),
          [
            t('lab3d.events.time'),
            t('lab3d.events.kind'),
            t('lab3d.events.bodies'),
            t('lab3d.events.detail'),
          ],
          result.events
            .slice(0, 200)
            .map(e => [
              num(e.t),
              t(`lab3d.event.${e.kind}`),
              e.bodies.join(', '),
              e.kind === 'merger'
                ? num(e.keLost)
                : e.kind === 'crossing'
                  ? e.direction
                  : num(e.distance),
            ])
        )
      : el('p', { text: t('lab3d.events.none') })
  );
  $('lb-warnings').replaceChildren(
    ...(result.warnings.length
      ? result.warnings.map(w =>
          el('li', {
            text: t(`lab3d.warning.${w.code}`, {
              scheme: w.scheme,
              bodies: (w.bodies || []).join(' and '),
            }),
          })
        )
      : [el('li', { text: t('lab3d.warnings.none') })])
  );
  plots(result);
}

// --- Plots -----------------------------------------------------------------------

/** A log10 plot of one sampled error against time. */
function errorPlot(host, samples, key, label) {
  const W = 520;
  const H = 180;
  const pad = 36;
  const pts = samples
    .filter(s => s[key] > 0)
    .map(s => [s.t, Math.log10(s[key])]);
  const box = svg('svg', {
    viewBox: `0 0 ${W} ${H}`,
    role: 'img',
    'aria-label': label,
    class: 'ui-plot',
  });
  if (pts.length > 1) {
    const [t0, t1] = [pts[0][0], pts.at(-1)[0]];
    const ys = pts.map(p => p[1]);
    const lo = Math.floor(Math.min(...ys));
    const hi = Math.ceil(Math.max(...ys)) || lo + 1;
    const X = x => pad + ((x - t0) / (t1 - t0 || 1)) * (W - 2 * pad);
    const Y = y => H - pad + ((lo - y) / (hi - lo || 1)) * (H - 2 * pad);
    box.append(
      svg('path', {
        d: pts
          .map(
            (p, i) =>
              `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`
          )
          .join(''),
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': 1.2,
      })
    );
    for (const [y, text] of [
      [hi, `1e${hi}`],
      [lo, `1e${lo}`],
    ]) {
      const label = svg('text', {
        x: 2,
        y: Y(y) + 4,
        'font-size': 11,
        fill: 'currentColor',
      });
      label.textContent = text;
      box.append(label);
    }
  }
  host.append(el('figure', {}, box, el('figcaption', { text: label })));
}

/** The bodies' paths in one projection. */
function pathPlot(host, samples, bodies, [a, b], label) {
  const W = 260;
  const box = svg('svg', {
    viewBox: `0 0 ${W} ${W}`,
    role: 'img',
    'aria-label': label,
    class: 'ui-plot lb-square',
  });
  const withX = samples.filter(s => s.x);
  if (withX.length) {
    let span = 0;
    for (const s of withX)
      for (let i = 0; i < bodies; i++)
        span = Math.max(
          span,
          Math.abs(s.x[3 * i + a]),
          Math.abs(s.x[3 * i + b])
        );
    span = span || 1;
    const P = v => W / 2 + (v / span) * (W / 2 - 8);
    for (let i = 0; i < bodies; i++) {
      const d = withX
        .map(
          (s, k) =>
            `${k ? 'L' : 'M'}${P(s.x[3 * i + a]).toFixed(1)},${(W - P(s.x[3 * i + b])).toFixed(1)}`
        )
        .join('');
      box.append(
        svg('path', {
          d,
          fill: 'none',
          stroke: `hsl(${(i * 67) % 360} 70% 60%)`,
          'stroke-width': 1,
        })
      );
    }
  }
  host.append(el('figure', {}, box, el('figcaption', { text: label })));
}

function plots(result) {
  const host = $('lb-plots');
  host.replaceChildren();
  errorPlot(host, result.samples, 'energy', t('lab3d.plot.energy'));
  errorPlot(host, result.samples, 'angularMomentum', t('lab3d.plot.angular'));
  const n = last.bodies.length;
  pathPlot(host, result.samples, n, [0, 1], t('lab3d.plot.xy'));
  pathPlot(host, result.samples, n, [0, 2], t('lab3d.plot.xz'));
}

// --- Speed ----------------------------------------------------------------------

async function bench() {
  $('lb-bench-go').disabled = true;
  $('lb-bench').replaceChildren(el('p', { text: t('lab3d.bench.running') }));
  try {
    const bodies = [3, 10, 50];
    const results = await lab.bench({ bodies, ms: 400 }).done;
    const schemes = [
      ...new Set(Object.keys(results).map(k => k.split('/')[0])),
    ];
    $('lb-bench').replaceChildren(
      table(
        t('lab3d.bench.caption'),
        [
          t('lab3d.bench.scheme'),
          ...bodies.map(n => t('lab3d.bench.bodies', { n })),
        ],
        schemes.map(s => [
          t(`lab3d.scheme.${s}`),
          ...bodies.map(n => num(results[`${s}/${n}`])),
        ])
      )
    );
    window.__lab3dBench = results;
  } catch (err) {
    $('lb-bench').replaceChildren(
      el('p', { text: t('lab3d.status.failed', { why: err.message }) })
    );
  } finally {
    $('lb-bench-go').disabled = false;
  }
}

// --- Start-up --------------------------------------------------------------------

function languageSwitch() {
  $('langSwitch').replaceChildren(
    ...LANGUAGES.map(({ id, endonym }) => {
      const b = el('button', {
        type: 'button',
        class: 'ui-button',
        lang: id,
        text: endonym,
      });
      b.setAttribute('aria-pressed', String(language() === id));
      b.addEventListener('click', async () => {
        await loadLanguage(id);
        useLanguage(id);
      });
      return b;
    })
  );
}

function useLanguage(id) {
  setLanguage(id);
  translatePage();
  document.title = t('lab3d.doc.title');
  languageSwitch();
  fillControls();
  render();
}

$('lb-problem').addEventListener('change', syncControls);
$('lb-go').addEventListener('click', go);
$('lb-cancel').addEventListener('click', () => current?.cancel());
$('lb-file').addEventListener('change', () =>
  openFile($('lb-file').files?.[0])
);
$('lb-bench-go').addEventListener('click', bench);
// A Spanish reader's catalog, before anything is written in it.
loadLanguage(preferred()).then(() => {
  useLanguage(preferred());
  status(t('lab3d.status.idle'));
  document.documentElement.dataset.ready = 'true';
});
