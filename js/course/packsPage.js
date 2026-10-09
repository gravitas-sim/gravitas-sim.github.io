// =============================================================================
// Investigations in a course (/studio/course/packs/)
// -----------------------------------------------------------------------------
// Prompt 78 (c), REMIX.md. A course item of kind `pack` carries an instructor's
// investigation as its link. Opening that link as a student's browser does, and
// judging it by the format and by what a remix may not change, needs the lesson
// engine's checks, which the course builder's route has no room for; this page
// is where it happens:
//
//   make    a link becomes the course item that carries it, with the pin (the
//           digest of its compiled steps) the course review compares;
//   check   a course file's investigations are opened and each pin compared
//           with the steps the pack has now.
//
// Nothing is sent anywhere. Words are in two tables read by id.
// =============================================================================

import { mountShell } from '../shell.js';
import { parseDocument } from '../shareState.js';
import { loadInvestigation } from '../data/investigations/registry.js';
import {
  itemsOf,
  lessonKeyOf,
  migrateCoursePack,
  validateCoursePack,
} from './pack.js';
import { STATUS, pinFor, reviewCoursePack } from './review.js';
import { PLATFORM_API, courseApi, courseFacts, lessonFacts } from './api.js';
import { openedLink, openedPack } from './packItems.js';
import { collectTexts } from '../composer/compile.js';

export const WORDS = {
  en: {
    'page.title': 'Investigations in a course | Gravitas',
    h1: 'Investigations in a course',
    lede: 'An instructor’s version of an investigation reaches students as a link. A course can carry that link as one of its items. Here the link is opened as a student’s browser opens it, judged by the format and by what a remix may not change, and either made into a course item with its pin, or checked inside a course you already have. Nothing is uploaded.',
    'mk.h': 'Make a course item',
    'mk.label': 'Paste the investigation link the Composer’s Publish made',
    'mk.go': 'Open and check it',
    'mk.item':
      'The course item: paste it into the course builder’s item for an instructor’s investigation',
    'mk.copy': 'Copy the item',
    'mk.copied': 'Copied.',
    'mk.fail': 'No key made.',
    'mk.facts':
      '“{title}” ({id} {version}): {steps} steps{from}. Pinned to {fp}.',
    'mk.from': ', made from “{original}”',
    'ck.h': 'Check a course',
    'ck.note':
      'Paste a course file, or choose one. Each investigation it carries is opened and its pin compared with the digest of the steps it has now.',
    'ck.label': 'A course file',
    'ck.go': 'Check the course',
    'ck.file': 'or choose a course file',
    'ck.none': 'That course carries no investigation pack.',
    'ck.notCourse': 'That is not a course file: {why}',
    'ck.col.item': 'Item',
    'ck.col.pack': 'Investigation',
    'ck.col.status': 'Standing',
    'ck.col.then': 'Steps pinned',
    'ck.col.now': 'Steps now',
    'ck.col.fix': 'Item with the pin it has now',
    'ck.caption': 'Investigations in this course',
    'ck.opened': 'Opened {n} investigations.',
    'status.same': 'As pinned.',
    'status.changed': 'The steps are not the ones pinned.',
    'status.unpinned': 'Not pinned.',
    'status.missing': 'Does not open: {why}',
    'status.unchecked': 'Not checked.',
    'why.corrupt': 'the link is incomplete or damaged.',
    'why.wrongKind': 'it is not an investigation link.',
    'why.newerVersion': 'it was made by a newer Gravitas.',
    'why.tooLarge': 'it holds more than a link can carry.',
    'why.notPack': 'it holds no investigation.',
    'why.installed':
      'it names a package installed in one browser; publish the investigation as a link.',
    'why.noOriginal':
      'it was made from “{what}”, which this Gravitas does not have.',
    'why.delta': 'its changes do not apply to the original: {what}',
    'why.invalid': 'it is not a valid investigation: {what}',
    'why.identity': 'it holds “{what}”, not the investigation the item names.',
    'why.other': 'it cannot be used.',
  },
  es: {
    'page.title': 'Investigaciones en un curso | Gravitas',
    h1: 'Investigaciones en un curso',
    lede: 'La versión de un instructor de una investigación llega a los estudiantes como un enlace. Un curso puede llevar ese enlace como uno de sus elementos. Aquí el enlace se abre como lo abre el navegador de un estudiante, se juzga con el formato y con lo que una versión propia no puede cambiar, y se convierte en un elemento de curso con su ficha, o se comprueba dentro de un curso que ya tienes. No se sube nada.',
    'mk.h': 'Hacer un elemento de curso',
    'mk.label':
      'Pega el enlace de investigación que hizo Publicar en el Compositor',
    'mk.go': 'Abrir y comprobar',
    'mk.item':
      'El elemento de curso: pégalo en el elemento del creador de cursos para la investigación de un instructor',
    'mk.copy': 'Copiar el elemento',
    'mk.copied': 'Copiado.',
    'mk.fail': 'Sin clave.',
    'mk.facts': '«{title}» ({id} {version}): {steps} pasos{from}. Ficha: {fp}.',
    'mk.from': ', hecha a partir de «{original}»',
    'ck.h': 'Comprobar un curso',
    'ck.note':
      'Pega un archivo de curso, o elige uno. Cada investigación que lleva se abre y su ficha se compara con el resumen de los pasos que tiene ahora.',
    'ck.label': 'Un archivo de curso',
    'ck.go': 'Comprobar el curso',
    'ck.file': 'o elige un archivo de curso',
    'ck.none': 'Ese curso no lleva ningún paquete de investigación.',
    'ck.notCourse': 'Eso no es un archivo de curso: {why}',
    'ck.col.item': 'Elemento',
    'ck.col.pack': 'Investigación',
    'ck.col.status': 'Estado',
    'ck.col.then': 'Pasos fijados',
    'ck.col.now': 'Pasos ahora',
    'ck.col.fix': 'Elemento con la ficha que tiene ahora',
    'ck.caption': 'Investigaciones de este curso',
    'ck.opened': 'Se abrieron {n} investigaciones.',
    'status.same': 'Como estaba fijada.',
    'status.changed': 'Los pasos no son los fijados.',
    'status.unpinned': 'Sin ficha.',
    'status.missing': 'No se abre: {why}',
    'status.unchecked': 'Sin comprobar.',
    'why.corrupt': 'el enlace está incompleto o dañado.',
    'why.wrongKind': 'no es un enlace de investigación.',
    'why.newerVersion': 'lo hizo una versión más nueva de Gravitas.',
    'why.tooLarge': 'contiene más de lo que un enlace puede llevar.',
    'why.notPack': 'no contiene ninguna investigación.',
    'why.installed':
      'nombra un paquete instalado en un solo navegador; publica la investigación como enlace.',
    'why.noOriginal':
      'se hizo a partir de «{what}», que esta versión de Gravitas no tiene.',
    'why.delta': 'sus cambios no se aplican al original: {what}',
    'why.invalid': 'no es una investigación válida: {what}',
    'why.identity':
      'contiene «{what}», no la investigación que nombra el elemento.',
    'why.other': 'no se puede usar.',
  },
};

const $ = id => document.getElementById(id);
const lang = () =>
  document.documentElement.lang.startsWith('es') ? 'es' : 'en';
const T = (id, vars = {}) =>
  (WORDS[lang()][id] ?? WORDS.en[id] ?? id).replace(
    /\{(\w+)\}/g,
    (_, k) => vars[k] ?? ''
  );
const why = got =>
  WORDS.en[`why.${got.reason}`]
    ? T(`why.${got.reason}`, { what: got.message || '' })
    : T('why.other');

/** The address a link was pasted as, or its fragment: what follows the `#`. */
const fragmentOf = text =>
  String(text)
    .trim()
    .replace(/^[^#]*#/, '');

/** A text without anything a course text refuses. */
const plain = s => String(s).replace(/[<>&]/g, '').slice(0, 120);

let made = null;
let checked = null;

function words() {
  document.title = T('page.title');
  for (const el of document.querySelectorAll('[data-k]'))
    el.textContent = T(el.dataset.k);
}

/** A pasted link, opened and judged; the item that carries it. */
async function make() {
  const link = fragmentOf($('pkLink').value);
  $('pkMade').hidden = true;
  const got = await openedLink(link);
  if (!got.ok) {
    made = null;
    $('pkStatus').textContent = why(got);
    return;
  }
  $('pkStatus').textContent = '';
  const facts = lessonFacts(got.lesson);
  const { pack } = got;
  const title = Object.fromEntries(
    ['en', 'es']
      .filter(l => typeof pack.title?.[l] === 'string')
      .map(l => [l, plain(pack.title[l])])
  );
  const item = {
    kind: 'pack',
    pack: pack.id,
    version: pack.version,
    link,
    title,
    pin: pinFor({ kind: 'pack' }, facts),
  };
  made = { item, pack, facts, compiled: got.compiled };
  $('pkItem').value = JSON.stringify(item, null, 2);
  showFacts();
  $('pkMade').hidden = false;
}

function showFacts() {
  if (!made) return;
  const { pack, facts, item } = made;
  $('pkFacts').textContent = T('mk.facts', {
    title: pack.title?.[lang()] || pack.title?.en || pack.id,
    id: pack.id,
    version: pack.version,
    steps: facts.n,
    fp: item.pin.fp,
    from: pack.derivedFrom
      ? T('mk.from', { original: pack.derivedFrom.id })
      : '',
  });
}

/** The key of the opened investigation, made here (js/composer/packKey.js). */
async function key(locale) {
  const { saveKey } = await import('../composer/packKey.js');
  const { pack, compiled } = made;
  try {
    await saveKey(pack, compiled, collectTexts(pack), locale);
  } catch {
    $('pkStatus').textContent = T('mk.fail');
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText($('pkItem').value);
    $('pkStatus').textContent = T('mk.copied');
  } catch {
    $('pkItem').select();
  }
}

/** A course's investigation packs, opened and compared with their pins. */
async function check(text) {
  const out = $('pkCheckStatus');
  const table = $('pkTable');
  table.replaceChildren();
  out.textContent = '';
  let course;
  try {
    course = migrateCoursePack(parseDocument(text, true), {
      platform: PLATFORM_API,
    });
  } catch (err) {
    return (out.textContent = T('ck.notCourse', { why: err.message }));
  }
  const errors = validateCoursePack(course, courseApi());
  if (errors.length)
    return (out.textContent = T('ck.notCourse', {
      why: `${errors[0].path} ${errors[0].message}`,
    }));
  const packs = itemsOf(course).filter(({ item }) => item.kind === 'pack');
  if (!packs.length) return (out.textContent = T('ck.none'));
  // Only the packs: the lessons a course names are the builder's to pin.
  const subset = {
    pinning: course.pinning,
    units: [{ items: packs.map(p => p.item) }],
  };
  const reasons = new Map();
  const facts = await courseFacts(subset, {
    load: id => loadInvestigation(id, 'en'),
    openPack: async item => {
      const got = await openedPack(item);
      if (!got.ok) reasons.set(item.id, got);
      return got;
    },
  });
  checked = { subset, facts, reasons };
  showCheck();
}

function showCheck() {
  if (!checked) return;
  const { subset, facts, reasons } = checked;
  const rows = reviewCoursePack(subset, facts);
  const th = id =>
    Object.assign(document.createElement('th'), {
      scope: 'col',
      textContent: T(id),
    });
  const t = document.createElement('table');
  t.className = 'ui-table';
  t.append(
    Object.assign(document.createElement('caption'), {
      textContent: T('ck.caption'),
    })
  );
  const head = document.createElement('tr');
  head.append(
    th('ck.col.item'),
    th('ck.col.pack'),
    th('ck.col.status'),
    th('ck.col.then'),
    th('ck.col.now'),
    th('ck.col.fix')
  );
  const thead = document.createElement('thead');
  thead.append(head);
  const body = document.createElement('tbody');
  for (const { item } of itemsOf(subset)) {
    const r = rows.find(x => x.id === item.id);
    const lesson = facts.lessons.get(lessonKeyOf(item));
    const tr = document.createElement('tr');
    const cell = (v, node) => {
      const td = document.createElement('td');
      if (node) td.append(node);
      else td.textContent = v;
      tr.append(td);
    };
    cell(item.id);
    cell(`${item.pack} ${item.version}`);
    cell(
      r.status === STATUS.MISSING
        ? T('status.missing', { why: why(reasons.get(item.id) || {}) })
        : T(`status.${r.status}`)
    );
    cell(String(item.pin?.n ?? ''));
    cell(String(lesson?.n ?? ''));
    if (lesson && r.status !== STATUS.SAME) {
      const area = Object.assign(document.createElement('textarea'), {
        className: 'ui-textarea is-code',
        readOnly: true,
        rows: 4,
        value: JSON.stringify(
          { ...item, pin: pinFor({ kind: 'pack' }, lesson) },
          null,
          2
        ),
      });
      area.setAttribute('aria-label', `${T('ck.col.fix')}: ${item.id}`);
      cell('', area);
    } else cell('');
    body.append(tr);
  }
  t.append(thead, body);
  $('pkTable').replaceChildren(t);
  $('pkCheckStatus').textContent = T('ck.opened', {
    n: facts.lessons.size,
  });
}

function wire() {
  $('pkMake').addEventListener('click', make);
  $('pkCopy').addEventListener('click', copy);
  $('pkKeyEn').addEventListener('click', () => key('en'));
  $('pkKeyEs').addEventListener('click', () => key('es'));
  $('pkCheck').addEventListener('click', () => check($('pkCourse').value));
  $('pkFile').addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    $('pkCourse').value = await file.text();
    check($('pkCourse').value);
  });
}

function init() {
  wire();
  words();
  mountShell({
    onLanguage: () => {
      words();
      showFacts();
      showCheck();
    },
  });
  document.body.dataset.ready = 'true';
}

init();
