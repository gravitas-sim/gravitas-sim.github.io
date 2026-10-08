// =============================================================================
// /my-work/: the one place a student sees and manages what they have made
// -----------------------------------------------------------------------------
// Roadmap II Prompt 69 (MY_WORK.md). Everything is read through the storage
// module's store over the student's own keys (openStudentStore), so the page
// lists, exports, imports and deletes exactly what the writers keep, in the
// keys and formats they already use. Nothing is written on the way in, nothing
// leaves the browser (a backup is a file the student saves), and the page needs
// no account. The prose that does not change is in the page's markup, in both
// languages; the strings built here come as English/Spanish pairs.
//
// Packages installed from the Catalog live in IndexedDB (js/catalog/store.js),
// which the store does not cover: they are listed through that module and are
// not in a backup file.
// =============================================================================

import { EXPORT_FORMAT, openStudentStore } from './storage/index.js';
import {
  drop as dropText,
  get as getText,
  put as putText,
} from './storage/local.js';
import { SURFACE_ROUTE, describe, surfaceOf, total } from './myWork/model.js';
import {
  INDEX_KEY,
  LAST_EXPORT_KEY,
  fileName,
  flatten,
  merged,
  only,
  tally,
  work,
} from './myWork/transfer.js';
import { mountShell } from './shell.js';

const $ = id => document.getElementById(id);
const es = () => document.documentElement.lang.startsWith('es');
/** A string in the page's language. */
const L = (en, sp) => (es() ? sp : en);
const pick = v =>
  v && typeof v === 'object' ? (v[es() ? 'es' : 'en'] ?? v.en) : v;
const esc = s =>
  String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const num = n => new Intl.NumberFormat(es() ? 'es' : 'en').format(n);
const size = bytes =>
  bytes < 1024 * 100
    ? `${num(Math.round(bytes / 102.4) / 10)} KB`
    : `${num(Math.round(bytes / 104857.6) / 10)} MB`;
const day = iso => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(es() ? 'es' : 'en', { dateStyle: 'medium' });
};

const s = {
  store: null,
  library: new Map(),
  file: null,
  records: [],
  model: null,
  estimate: null,
  packages: null,
  kept: true,
  say: '',
  pending: null,
  exported: new Set(),
};
let everything = false;

const KINDS = {
  lesson: ['Investigation', 'Investigación'],
  observatory: ['Observatory investigation', 'Investigación del Observatorio'],
  lab3d: ['3-D lab investigation', 'Investigación del laboratorio 3-D'],
  mission: [
    'Mission lab investigation',
    'Investigación del laboratorio de misiones',
  ],
  studio: ['Scenario draft', 'Borrador de escenario'],
  composer: ['Investigation draft', 'Borrador de investigación'],
  course: ['Course draft', 'Borrador de curso'],
  evaluation: ['Evaluation draft', 'Borrador de evaluación'],
  notes: ['Teaching notes', 'Notas de enseñanza'],
  checkpoint: ['Experiment in progress', 'Experimento en curso'],
  world: ['Saved world', 'Mundo guardado'],
};
const kind = k => L(...KINDS[k]);
const SURFACES = {
  sandbox: ['Sandbox', 'Simulación libre'],
  observatory: ['Observatory', 'Observatorio'],
  experiments: ['Experiments', 'Experimentos'],
};

// --- Reading -----------------------------------------------------------------

async function refresh() {
  s.file = await s.store.exportAll();
  s.records = flatten(s.file);
  s.model = describe(s.records, s.library);
  s.estimate = await s.store.estimate();
  render();
}

function lastExport() {
  const r = s.records.find(x => x.id === LAST_EXPORT_KEY);
  return r?.value?.at ? r.value : null;
}

const bytesOf = collection =>
  s.records
    .filter(r => r.collection === collection)
    .reduce((n, r) => n + JSON.stringify(r.value).length, 0);

// --- Drawing -----------------------------------------------------------------

/** One thing, with what can be done to it. */
function item({
  title,
  facts = [],
  href,
  open,
  ids,
  sub,
  extra = '',
  buttons = true,
}) {
  const act = (a, label) =>
    `<button type="button" class="ui-button is-small" data-act="${a}" data-ids="${esc(JSON.stringify(ids))}" data-sub="${esc(sub ?? '')}" aria-label="${esc(`${label}: ${title}`)}">${label}</button>`;
  return `<li class="mw-item"><div class="mw-what"><div class="mw-title">${esc(title)}</div>
<div class="mw-facts">${facts
    .filter(Boolean)
    .map(f => `<span>${esc(f)}</span>`)
    .join('')}</div>${extra}</div>
<div class="mw-actions">${href ? `<a class="ui-button is-small" href="${esc(href)}" aria-label="${esc(`${open}: ${title}`)}">${open}</a>` : ''}${
    buttons
      ? act('export', L('Export', 'Exportar')) +
        act('delete', L('Delete', 'Borrar'))
      : ''
  }</div></li>`;
}

const since = iso =>
  iso ? L(`started ${day(iso)}`, `empezada el ${day(iso)}`) : '';
const saved = iso =>
  iso ? L(`saved ${day(iso)}`, `guardado el ${day(iso)}`) : '';

function lessonItem(x) {
  const steps =
    x.kind === 'lesson'
      ? x.total
        ? L(
            `${x.seen} of ${x.total} steps seen`,
            `${x.seen} de ${x.total} pasos vistos`
          )
        : L(`${x.seen} steps seen`, `${x.seen} pasos vistos`)
      : L('opened', 'abierta');
  const ids = [x.key];
  if (s.records.some(r => r.id === `${x.key}:v1`)) ids.push(`${x.key}:v1`);
  return item({
    title: pick(x.title),
    facts: [
      kind(x.kind),
      steps,
      x.kind === 'lesson'
        ? x.done
          ? L(
              'Report: ready on the last step',
              'Informe: listo en el último paso'
            )
          : L(
              'Report: finish the investigation first',
              'Informe: termina primero la investigación'
            )
        : '',
      since(x.since),
    ],
    href: x.href,
    open: x.done ? L('Open', 'Abrir') : L('Resume', 'Continuar'),
    ids,
    sub: x.kind === 'observatory' ? x.id : '',
  });
}

function sections() {
  const m = s.model;
  const out = {};
  out.mwLessons = m.lessons.map(lessonItem);
  out.mwAssignments = m.assignments.map(a =>
    item({
      title: pick(a.title),
      facts: [
        L(`${a.answered} answers kept`, `${a.answered} respuestas guardadas`),
        L(`${a.seen} steps seen`, `${a.seen} pasos vistos`),
        since(a.since),
      ],
      ids: [a.key],
    })
  );
  out.mwCourses = m.courses.map(c =>
    item({
      title: pick(c.title),
      href: c.href,
      open: L('Open course', 'Abrir curso'),
      ids: [],
      buttons: false,
      extra: `<ul class="mw-units">${c.units
        .map(
          u =>
            `<li>${esc(pick(u.title))}: ${esc(
              L(
                `${u.finished} of ${u.total} finished, ${u.begun} begun`,
                `${u.finished} de ${u.total} terminadas, ${u.begun} empezadas`
              )
            )}</li>`
        )
        .join('')}</ul>`,
    })
  );
  out.mwExperiments = m.experiments.map(x =>
    item({
      title: x.title,
      facts: [saved(x.when)],
      href: '/',
      open: L('Open the bench', 'Abrir el banco'),
      ids: [x.key],
    })
  );
  out.mwDrafts = [...m.saved, ...m.drafts].map(x =>
    item({
      title: x.title || kind(x.kind),
      facts: [kind(x.kind), saved(x.when)],
      href: x.href ?? '/',
      open: L('Open', 'Abrir'),
      ids: [x.key],
    })
  );
  const ev = m.evidence;
  const entries = Object.entries(ev.groups).filter(([, g]) => g.length);
  out.mwEvidence = ev.notebook
    ? [
        item({
          title: L('Evidence notebook', 'Cuaderno de evidencia'),
          facts: [
            L(`${ev.notebook.count} entries`, `${ev.notebook.count} entradas`),
          ],
          ids: [ev.notebook.key],
          extra: entries
            .map(
              ([g, list]) =>
                `<h3>${esc(L(...SURFACES[g]))}</h3><ul class="mw-units">${list
                  .map(
                    e =>
                      `<li>${esc(e.title)} (${esc(e.source.replace(/-/g, ' '))}${e.when ? `, ${esc(day(e.when))}` : ''}) <a href="${SURFACE_ROUTE[surfaceOf(e.source)]}" aria-label="${esc(`${L('Open in', 'Abrir en')} ${L(...SURFACES[g])}: ${e.title}`)}">${esc(L('Open in', 'Abrir en'))} ${esc(L(...SURFACES[g]))}</a></li>`
                  )
                  .join('')}</ul>`
            )
            .join(''),
        }),
      ]
    : [];
  return out;
}

function render() {
  const m = s.model;
  const n = total(m);
  $('mwSummary').textContent =
    s.say ||
    (n
      ? L(
          `${n} things saved on this device.`,
          `${n} cosas guardadas en este dispositivo.`
        )
      : L(
          'Nothing is saved on this device yet.',
          'Todavía no hay nada guardado en este dispositivo.'
        ));
  const list = sections();
  for (const [id, items] of Object.entries(list)) fill(id, items);
  fillPackages();
  const e = s.estimate;
  const last = lastExport();
  const rows = [
    [
      L('Kept in', 'Guardado en'),
      !s.kept
        ? L(
            'nothing: this browser is not keeping anything, so your work is lost when you close the tab',
            'nada: este navegador no guarda nada, así que tu trabajo se pierde al cerrar la pestaña'
          )
        : L(
            "this browser's local storage, on this device",
            'el almacenamiento local de este navegador, en este dispositivo'
          ),
    ],
    [
      L('Your work takes', 'Tu trabajo ocupa'),
      size(s.records.reduce((a, r) => a + JSON.stringify(r.value).length, 0)),
    ],
    e?.known
      ? [
          L('This site uses', 'Este sitio usa'),
          L(
            `${size(e.usage)} of ${size(e.quota)}; ${size(e.available)} can still be used before the reserve of ${size(e.reserve)}`,
            `${size(e.usage)} de ${size(e.quota)}; se pueden usar ${size(e.available)} antes de la reserva de ${size(e.reserve)}`
          ),
        ]
      : [
          L('Room left', 'Espacio disponible'),
          L('this browser does not say', 'este navegador no lo indica'),
        ],
    [
      L('Last backup file', 'Último archivo de copia'),
      last
        ? L(
            `${day(last.at)}, ${last.all ? 'everything' : `${last.n} item${last.n === 1 ? '' : 's'}`}`,
            `${day(last.at)}, ${last.all ? 'todo' : `${last.n} elemento${last.n === 1 ? '' : 's'}`}`
          )
        : L('none made yet', 'ninguno todavía'),
    ],
    ...(s.model.name
      ? [[L('Name for reports', 'Nombre para los informes'), s.model.name]]
      : []),
    ...Object.keys(s.file.collections).map(c => [c, size(bytesOf(c))]),
  ];
  $('mwStorageList').innerHTML = rows
    .map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`)
    .join('');
  const full = e?.known && e.available < 262144;
  const note = $('mwNotice');
  note.hidden = s.kept && !full && !s.notice;
  if (!note.hidden) {
    note.innerHTML = `${esc(s.notice || (!s.kept ? L('This browser is not keeping your work (a private window does this). Download a backup before you leave.', 'Este navegador no está guardando tu trabajo (una ventana privada hace esto). Descarga una copia antes de salir.') : L('This device has little room left. New work may stop saving. Download a backup, then free some space or work in another browser.', 'A este dispositivo le queda poco espacio. El trabajo nuevo podría dejar de guardarse. Descarga una copia y luego libera espacio o trabaja en otro navegador.')))} <button type="button" class="ui-button is-small" data-act="export-all">${esc(L('Download everything', 'Descargar todo'))}</button>`;
  }
  $('main').removeAttribute('aria-busy');
}

function fill(id, items) {
  const box = $(id);
  box.hidden = false;
  const body = box.querySelector('.mw-body');
  box.querySelector('.mw-none').hidden = items.length > 0;
  body.innerHTML = items.length
    ? `<ul class="mw-list">${items.join('')}</ul>`
    : '';
}

async function fillPackages() {
  const box = $('mwPackages');
  box.hidden = false;
  try {
    s.packages ??= await (
      await import('./catalog/store.js')
    )
      .openStore()
      .then(st => st.list());
  } catch {
    s.packages = [];
  }
  box.querySelector('.mw-none').hidden = s.packages.length > 0;
  box.querySelector('.mw-body').innerHTML = s.packages.length
    ? `<ul class="mw-list">${s.packages
        .map(p =>
          item({
            title: pick(p.title) || p.id,
            facts: [p.type, p.version, size(p.bytes || 0)],
            href: '/catalog/',
            open: L('Open the Catalog', 'Abrir el Catálogo'),
            ids: [],
            buttons: false,
          })
        )
        .join('')}</ul>`
    : '';
}

// --- Files -------------------------------------------------------------------

function download(file, name) {
  const blob = new Blob([JSON.stringify(file, null, 2)], {
    type: 'application/json',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Make a backup file: everything, or the keys of one thing. */
async function exportFile(ids, sub, label) {
  const whole = await s.store.exportAll();
  let file = ids ? only(whole, ids) : whole;
  if (sub) {
    for (const list of Object.values(file.collections))
      for (const r of list)
        if (r.id === ids[0]) r.value = { [sub]: r.value[sub] };
  }
  const n = Object.values(file.collections).reduce((a, l) => a + l.length, 0);
  if (!n) return false;
  download(file, fileName(label || 'everything'));
  if (!ids) everything = true;
  for (const k of ids ?? []) s.exported.add(sub ? `${k}#${sub}` : k);
  try {
    putText(
      LAST_EXPORT_KEY,
      JSON.stringify({ at: new Date().toISOString(), all: !ids, n }),
      'preferences'
    );
  } catch {
    /* the file is made either way; only the note of it is not kept */
  }
  s.notice = '';
  s.say = L(
    'The backup file was made. Keep it somewhere you can find it.',
    'Se creó el archivo de copia. Guárdalo donde puedas encontrarlo.'
  );
  await refresh();
  return true;
}

const REASONS = {
  quota: [
    'this browser has too little room',
    'este navegador tiene muy poco espacio',
  ],
  collectionFull: [
    'that part of your work is at its size limit',
    'esa parte de tu trabajo llegó a su límite de tamaño',
  ],
  itemTooLarge: [
    'it is larger than one saved item may be',
    'es más grande de lo que puede ser un elemento guardado',
  ],
};

const labelOf = (model, key) => {
  const all = [
    ...model.lessons,
    ...model.assignments,
    ...model.experiments,
    ...model.saved,
    ...model.drafts,
  ].find(x => x.key === key);
  if (all) return pick(all.title) || (all.kind && kind(all.kind)) || key;
  if (model.evidence.notebook?.key === key)
    return L('Evidence notebook', 'Cuaderno de evidencia');
  return key === 'gravitas_student_name' ? L('Your name', 'Tu nombre') : key;
};

let incoming = null;

async function preview() {
  const mode = document.querySelector('input[name="mwMode"]:checked').value;
  const prepared = merged(
    work(incoming, $('mwPrefs').checked),
    s.records,
    mode
  );
  const res = await s.store.importAll(prepared, { mode, dryRun: true });
  const box = $('mwPreviewBody');
  if (!res.ok) {
    box.textContent =
      L(
        'This file cannot be imported: ',
        'No se puede importar este archivo: '
      ) + res.message;
    $('mwApply').disabled = true;
    return;
  }
  const t = tally(res.plan);
  const fileModel = describe(flatten(prepared), s.library);
  const ACTION = {
    add: ['Added', 'Se añade'],
    replace: ['Replaced by the file', 'Se sustituye por el archivo'],
    skip: ['Left as it is', 'Se deja como está'],
    same: ['Already the same', 'Ya es igual'],
  };
  box.innerHTML = `<p>${esc(L(`${t.add} to add, ${t.replace} to replace, ${t.skip} to leave as they are, ${t.same} already the same.`, `${t.add} por añadir, ${t.replace} por sustituir, ${t.skip} por dejar como están, ${t.same} ya iguales.`))}</p><table class="ui-table"><caption>${esc(L('What the file holds', 'Qué contiene el archivo'))}</caption><thead><tr><th scope="col">${esc(L('Item', 'Elemento'))}</th><th scope="col">${esc(L('What would happen', 'Qué ocurriría'))}</th></tr></thead><tbody>${res.plan
    .filter(p => p.action !== 'same')
    .map(
      p =>
        `<tr><td>${esc(labelOf(fileModel, p.id))}</td><td>${esc(L(...(ACTION[p.action] ?? [p.action, p.action])))}${p.reason ? ` (${esc(p.reason)})` : ''}</td></tr>`
    )
    .join('')}</tbody></table>`;
  $('mwApply').disabled = t.add + t.replace === 0;
}

async function readFile(file) {
  const bad = msg => {
    s.say = msg;
    render();
  };
  if (file.size > 24 * 1048576)
    return bad(
      L(
        'That file is too large to be a Gravitas backup.',
        'Ese archivo es demasiado grande para ser una copia de Gravitas.'
      )
    );
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return bad(
      L(
        'That file is not a backup: it is not readable JSON.',
        'Ese archivo no es una copia: no es JSON legible.'
      )
    );
  }
  if (data?.kind === 'gravitas.investigation.progress')
    return bad(
      L(
        'That is a backup of one investigation. Restore it from inside that investigation.',
        'Esa es una copia de una sola investigación. Restáurala desde dentro de esa investigación.'
      )
    );
  if (data?.format !== EXPORT_FORMAT)
    return bad(
      L(
        'That is not a Gravitas backup file.',
        'Ese no es un archivo de copia de Gravitas.'
      )
    );
  incoming = data;
  $('mwPreview').hidden = false;
  $('mwApply').disabled = false;
  await preview();
  $('mwPreviewTitle').focus();
}

async function applyImport() {
  const mode = document.querySelector('input[name="mwMode"]:checked').value;
  const prepared = merged(
    work(incoming, $('mwPrefs').checked),
    s.records,
    mode
  );
  const res = await s.store.importAll(prepared, { mode });
  $('mwPreview').hidden = true;
  incoming = null;
  const refused = res.plan.filter(p => REASONS[p.reason]);
  const done = res.plan.filter(p =>
    ['add', 'replace'].includes(p.action)
  ).length;
  s.say = L(`Imported ${done} items.`, `Se importaron ${done} elementos.`);
  s.notice = refused.length
    ? L(
        `${refused.length} items were not imported: ${L(...REASONS[refused[0].reason])}. Nothing here was changed by them. Download a backup of what is here, then free some space and import again.`,
        `${refused.length} elementos no se importaron: ${L(...REASONS[refused[0].reason])}. No cambiaron nada de lo que hay aquí. Descarga una copia de lo que hay, libera espacio e importa de nuevo.`
      )
    : '';
  await refresh();
  $('mwSummary').focus();
}

// --- Deleting, with the file first ---------------------------------------------

function ask({ title, text, ids, sub, label, all }) {
  const d = $('mwDialog');
  $('mwDialogTitle').textContent = title;
  $('mwDialogBody').innerHTML = `<p>${esc(text)}</p>`;
  $('mwDialogExport').textContent = L(
    'Download a copy first',
    'Descargar una copia primero'
  );
  $('mwDialogGo').textContent = L('Delete', 'Borrar');
  $('mwDialogCancel').textContent = L('Cancel', 'Cancelar');
  const ready = () =>
    all
      ? everything
      : ids.every(k => s.exported.has(sub ? `${k}#${sub}` : k)) || everything;
  $('mwDialogGo').disabled = !ready();
  s.pending = { ids, sub, all, label, ready };
  d.showModal();
}

async function remove({ ids, sub, all }) {
  const store = s.store;
  const keys = all
    ? s.records.filter(r => r.collection !== 'preferences').map(r => r.id)
    : ids;
  for (const key of keys) {
    const rec = s.records.find(r => r.id === key);
    if (!rec) continue;
    const c = store.collection(rec.collection);
    if (sub && key === 'gravitas_guides') {
      const { [sub]: _gone, ...rest } = rec.value;
      void _gone;
      if (Object.keys(rest).length) await c.put(key, rest);
      else await c.delete(key);
    } else {
      await c.delete(key);
    }
    if (key.startsWith('gravitas_experiment_') && !key.includes('checkpoint')) {
      const index = s.records.find(r => r.id === INDEX_KEY);
      if (index) {
        const items = (index.value.items ?? []).filter(
          i => `gravitas_experiment_${i.id}` !== key
        );
        index.value = { ...index.value, items };
        await store.collection('experiments').put(INDEX_KEY, index.value);
      }
    }
  }
  s.say = L('Deleted.', 'Borrado.');
  await refresh();
  $('mwSummary').focus();
}

// --- Wiring --------------------------------------------------------------------

function wire() {
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'export-all') return void exportFile(null);
    const ids = JSON.parse(b.dataset.ids || '[]');
    const sub = b.dataset.sub || '';
    const row =
      b.closest('.mw-item')?.querySelector('.mw-title')?.textContent ?? '';
    if (act === 'export') {
      if (!(await exportFile(ids, sub, row))) {
        s.say = L('There is nothing to export.', 'No hay nada que exportar.');
        render();
      }
    } else if (act === 'delete') {
      ask({
        title: L(
          'Delete this from this device?',
          '¿Borrar esto de este dispositivo?'
        ),
        text: L(
          `"${row}" will be removed from this browser. It cannot be undone. Download a copy first; you can import it again later.`,
          `«${row}» se quitará de este navegador. No se puede deshacer. Descarga primero una copia; podrás importarla de nuevo después.`
        ),
        ids,
        sub,
        label: row,
      });
    }
  });
  $('mwExport').addEventListener('click', () => exportFile(null));
  $('mwDelete').addEventListener('click', () =>
    ask({
      title: L(
        'Delete everything on this device?',
        '¿Borrar todo en este dispositivo?'
      ),
      text: L(
        'Every investigation, note, experiment and draft listed on this page will be removed from this browser. Your language and theme stay. This cannot be undone. Download everything first; you can import it again later.',
        'Todas las investigaciones, notas, experimentos y borradores de esta página se quitarán de este navegador. El idioma y el tema se conservan. No se puede deshacer. Descarga primero todo; podrás importarlo de nuevo después.'
      ),
      ids: [],
      all: true,
    })
  );
  $('mwDialogExport').addEventListener('click', async () => {
    const p = s.pending;
    await exportFile(p.all ? null : p.ids, p.sub, p.label);
    $('mwDialogGo').disabled = !p.ready();
  });
  $('mwDialogGo').addEventListener('click', async () => {
    $('mwDialog').close();
    await remove(s.pending);
  });
  $('mwFile').addEventListener('change', e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (f) readFile(f);
  });
  for (const el of document.querySelectorAll('input[name="mwMode"], #mwPrefs'))
    el.addEventListener('change', () => incoming && preview());
  $('mwApply').addEventListener('click', applyImport);
  $('mwCancel').addEventListener('click', () => {
    incoming = null;
    $('mwPreview').hidden = true;
    $('mwFile').focus();
  });
  // Another tab's change reaches this list.
  s.store.addEventListener('change', e => e.detail.remote && refresh());
}

/** A Storage that forgets, for a browser that will not give us its own. */
const memory = () => {
  const m = new Map();
  return {
    get length() {
      return m.size;
    },
    key: i => [...m.keys()][i] ?? null,
    getItem: k => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: k => void m.delete(k),
  };
};

async function start() {
  try {
    const stored = getText('gravitas_locale') || navigator.language;
    document.documentElement.lang = stored.startsWith('es') ? 'es' : 'en';
  } catch {
    /* the page's own language stands */
  }
  mountShell({ onLanguage: () => s.model && render() });
  $('mwPreviewTitle').tabIndex = -1;
  $('mwSummary').tabIndex = -1;
  try {
    const r = await fetch(new URL('/library/library.json', document.baseURI));
    if (r.ok) s.library = new Map((await r.json()).entries.map(x => [x.id, x]));
  } catch {
    /* items list under their ids */
  }
  try {
    // Write back what is there (or nothing) under the note's own key.
    const was = getText(LAST_EXPORT_KEY);
    putText(LAST_EXPORT_KEY, was ?? '', 'preferences');
    if (was === null) dropText(LAST_EXPORT_KEY);
  } catch {
    s.kept = false;
  }
  let storage;
  try {
    storage = globalThis.localStorage ?? undefined;
  } catch {
    s.kept = false;
  }
  s.store = openStudentStore(storage ? { storage } : { storage: memory() });
  wire();
  await refresh();
  document.documentElement.dataset.ready = 'true';
}

start();
