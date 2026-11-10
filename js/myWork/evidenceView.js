// =============================================================================
// My work: review and compare the evidence (Prompt 275, part A)
// -----------------------------------------------------------------------------
// The page (js/myWorkPage.js) loads this after it has drawn, and only when the
// evidence notebook holds something, so the route stays small. It reads the
// notebook's entries (the same record the Evidence list above it counts), and
// offers: filters by investigation, kind and date; a link to the page that made
// each entry; a mark for a report; an annotation (the student's own words, the
// snapshot untouched); and a comparison of two entries of one kind, or of two
// quantities of one entry, with the covariance where the record states one and
// "independence assumed" where it does not (./evidenceReview.js). Under it,
// when an entry is marked or a report was made, the report composed from the
// marked entries (./reportView.js, part B), which this loads only then.
//
// Nothing here is sent anywhere. A mark and an annotation are written to the
// notebook's own record, through the student store, like an attachment is.
// Strings are English and Spanish pairs, as the rest of this page's are; the
// comparison's statement is Prompt 151's (js/i18n/en.compare.js).
// =============================================================================

import { KEY_EVIDENCE_NOTEBOOK, KEY_MADE_PREFIX } from '../names.js';
import { annotate, mark } from '../notebook/entry.js';
import {
  commonQuantities,
  compareEntries,
  dayBounds,
  distinct,
  filterRows,
  reviewRows,
  sharedBasis,
} from './evidenceReview.js';
import { envelopeOf } from '../notebook/ledger.js';

const NOTEBOOK = KEY_EVIDENCE_NOTEBOOK;
/** The made record of the composed report (./composedReport.js COMPOSED_KEY). */
const REPORT = `${KEY_MADE_PREFIX}composed-report`;
/** What the report card's buttons ask of ./reportView.js (its ACTIONS). */
const REPORT_ACTIONS =
  'up down dropcmp addcmp make remark pdf html csv file'.split(' ');
const es = () => document.documentElement.lang.startsWith('es');
const L = (en, sp) => (es() ? sp : en);
const esc = s =>
  String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const day = ms =>
  ms
    ? new Date(ms).toLocaleDateString(es() ? 'es' : 'en', {
        dateStyle: 'medium',
      })
    : '';

const SURFACES = {
  sandbox: ['the Sandbox', 'la simulación libre'],
  observatory: ['the Observatory', 'el Observatorio'],
  experiments: ['the experiment bench', 'el banco de experimentos'],
  lab3d: ['the 3-D lab', 'el laboratorio 3-D'],
  mission: ['the mission lab', 'el laboratorio de misiones'],
  compute: ['the compute page', 'la página de cálculo'],
};

/** What the student has set: it survives a redraw, not a new visit. */
const fresh = () => ({
  investigation: '',
  kind: '',
  from: '',
  to: '',
  ticked: [],
  qa: '',
  qb: '',
  rho: '',
  shared: false,
  noting: '',
  say: '',
  focus: '',
  // The report: null until the student changes it, so the made one is shown.
  order: null,
  title: null,
  carried: null,
  refocus: null,
});
let v = fresh();
let lastBox = null;
let current = null;
let tools = null;
let reportMod = null;
/** The comparison on screen, as the report would carry it; null when refused. */
let cmpSpec = null;

/** Where in the student's work an entry was kept, in this page's words. */
function whereOf(r) {
  const c = r.ctx;
  if (c?.lesson)
    return L(
      `investigation ${c.lesson}, step ${c.step ?? '-'}`,
      `investigación ${c.lesson}, paso ${c.step ?? '-'}`
    );
  if (c?.guide) return L(`activity ${c.guide}`, `actividad ${c.guide}`);
  if (c?.page && SURFACES[c.page]) return L(...SURFACES[c.page]);
  return r.sourceId;
}

/** The control of one kind for one entry (no selector escaping needed). */
const control = (box, kind, id) =>
  [...box.querySelectorAll(`[data-rv="${kind}"]`)].find(
    c => (c.dataset.id ?? '') === id
  );

/** The notebook's entries, as My work's snapshot holds them. */
const docOf = records => records.find(r => r.id === NOTEBOOK)?.value;
const entriesOf = records =>
  Array.isArray(docOf(records)?.entries) ? docOf(records).entries : [];

async function loadTools() {
  if (tools) return tools;
  const [i18n, deferred, led, unc, fmt] = await Promise.all([
    import('../i18n/index.js'),
    import('../i18n/deferredMessages.js'),
    import('../notebook/ledger.js'),
    import('../platform/uncertain.js'),
    import('../format.js'),
  ]);
  // This page says its own strings from the document's language and never set
  // the catalog's, so a Spanish page named kinds and methods in English. Set
  // for this visit only: nothing is stored.
  const lang = es() ? 'es' : 'en';
  if (i18n.getLocale() !== lang) await i18n.setLocale(lang, { persist: false });
  await deferred.ensureDeferredMessages();
  // A value in the one pattern a number is printed in ("X ± Y (method)"), as
  // the report prints it (js/notebook/ledgerReport.js rowValue, which this does
  // not import: its imports would move two shared modules onto the page's
  // start-up path).
  const line = (r, loc) =>
    !r.uncertainty || r.uncertainty.kind === 'none'
      ? fmt.formatNumber(r.value, { sig: 6, locale: loc })
      : unc.describeUncertain(
          { value: r.value, uncertainty: r.uncertainty },
          i18n.t,
          { locale: loc }
        ).line;
  tools = { t: i18n.t, locale: i18n.getLocale, led, line };
  return tools;
}

/** Prompt 151's words for a comparison, from its own catalog, in this page's language. */
async function statement(result, unit) {
  const [{ describeComparison }, en, sp] = await Promise.all([
    import('../compare/estimates.js'),
    import('../i18n/en.compare.js'),
    import('../i18n/es.compare.js'),
  ]);
  const catalog = es() ? sp.ES_COMPARE : en.EN_COMPARE;
  const tt = (id, vars = {}) =>
    String(catalog[id] ?? id).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  return describeComparison(result, tt, {
    locale: es() ? 'es' : 'en',
    unit,
  });
}

const REFUSALS = {
  entries: ['Choose an entry to compare.', 'Elige una entrada para comparar.'],
  kind: [
    'These two entries are of different kinds, so they are not compared.',
    'Estas dos entradas son de tipos distintos, así que no se comparan.',
  ],
  quantity: [
    'The two do not hold a quantity to compare.',
    'Las dos no tienen una cantidad que comparar.',
  ],
  unit: [
    'The two quantities are in different units, so they are not compared.',
    'Las dos cantidades están en unidades distintas, así que no se comparan.',
  ],
};

function filters(rows) {
  const f = { investigation: v.investigation, kind: v.kind };
  const b = dayBounds(v.from, v.to);
  return filterRows(rows, { ...f, ...b });
}

function menu(id, label, values, labelOf, current) {
  return `<div class="ui-field"><label for="${id}">${esc(label)}</label><select id="${id}" class="ui-select" data-rv="${id}"><option value="">${esc(L('All', 'Todos'))}</option>${values
    .map(
      x =>
        `<option value="${esc(x)}"${x === current ? ' selected' : ''}>${esc(labelOf(x))}</option>`
    )
    .join('')}</select></div>`;
}

function rowItem(r, t, { SURFACE_ROUTE, surfaceOf }) {
  const surface = surfaceOf(r.kind);
  const name = L(...SURFACES[surface]);
  const kindText = t(`nb.source.${r.kind}`);
  const kind = kindText === `nb.source.${r.kind}` ? r.kind : kindText;
  const where = whereOf(r);
  const checked = v.ticked.includes(r.id);
  const full = v.ticked.length >= 2 && !checked;
  return `<li class="mw-item"><div class="mw-what"><div class="mw-title">${esc(r.title)}</div>
<div class="mw-facts"><span>${esc(kind)}</span><span>${esc(where)}</span>${r.when ? `<span>${esc(day(r.when))}</span>` : ''}<span>${esc(r.quantities === 1 ? L('1 quantity', '1 cantidad') : L(`${r.quantities} quantities`, `${r.quantities} cantidades`))}</span>${r.marked ? `<span>${esc(L('marked for a report', 'marcada para un informe'))}</span>` : ''}${r.tampered ? `<span>${esc(L('its checksum no longer matches', 'su suma de control ya no coincide'))}</span>` : ''}</div></div>
<div class="mw-actions"><label class="ui-choice"><input type="checkbox" data-rv="compare" data-id="${esc(r.id)}"${checked ? ' checked' : ''}${full ? ' disabled' : ''} /> <span>${esc(L('Compare', 'Comparar'))}<span class="visually-hidden"> ${esc(r.title)}</span></span></label>
<label class="ui-choice"><input type="checkbox" data-rv="mark" data-id="${esc(r.id)}"${r.marked ? ' checked' : ''} /> <span>${esc(L('For a report', 'Para un informe'))}<span class="visually-hidden"> ${esc(r.title)}</span></span></label>
<button type="button" class="ui-button is-small" data-rv="note" data-id="${esc(r.id)}" aria-label="${esc(`${L('Annotate', 'Anotar')}: ${r.title}`)}">${esc(L('Annotate', 'Anotar'))}</button>
<a class="ui-button is-small" href="${SURFACE_ROUTE[surface]}" aria-label="${esc(`${L('Open in', 'Abrir en')} ${name}: ${r.title}`)}">${esc(L('Open in', 'Abrir en'))} ${esc(name)}</a></div></li>`;
}

function noteForm(entry) {
  const f = (id, label, value, max) =>
    `<div class="ui-field"><label for="rvN_${id}">${esc(label)}</label><textarea id="rvN_${id}" class="ui-textarea" rows="3" maxlength="${max}" data-rv-field="${id}">${esc(value)}</textarea></div>`;
  return `<form class="mw-card" data-rv="noteform" aria-labelledby="rvNoteTitle"><h3 id="rvNoteTitle" tabindex="-1">${esc(L('Annotate', 'Anotar'))}: ${esc(entry.title)}</h3>
<p class="ui-hint">${esc(L('These are your own words. The numbers and how they were made do not change.', 'Son tus propias palabras. Los números y cómo se obtuvieron no cambian.'))}</p>
<div class="ui-field"><label for="rvN_title">${esc(L('Heading', 'Título'))}</label><input id="rvN_title" class="ui-input" type="text" maxlength="120" value="${esc(entry.title)}" data-rv-field="title" /></div>
${f('claim', L('What this shows', 'Qué muestra'), entry.prose?.claim, 600)}${f('evidence', L('What supports it', 'Qué lo respalda'), entry.prose?.evidence, 900)}${f('limitations', L('What limits it', 'Qué lo limita'), entry.prose?.limitations, 600)}
<div class="mw-actions"><button type="submit" class="ui-button is-primary is-small">${esc(L('Save', 'Guardar'))}</button> <button type="button" class="ui-button is-small" data-rv="notecancel">${esc(L('Cancel', 'Cancelar'))}</button></div></form>`;
}

async function compareBox(entries) {
  cmpSpec = null;
  const [a, b] = v.ticked.map(id => entries.find(e => e.id === id));
  if (!a) return '';
  const second = b ?? a;
  const [ea, eb] = [envelopeOf(a), envelopeOf(second)];
  const ids = e =>
    e.quantities.map(q => q.id).filter(i => !i.startsWith('assumed:'));
  const common = commonQuantities(ea, eb);
  const qa = ids(ea).includes(v.qa) ? v.qa : (common[0]?.id ?? ids(ea)[0]);
  let qb = ids(eb).includes(v.qb) ? v.qb : qa;
  if (!ids(eb).includes(qb)) qb = ids(eb)[0];
  if (second === a && qa === qb)
    qb =
      ids(eb).find(
        i =>
          i !== qa &&
          eb.quantities.find(q => q.id === i).unit ===
            ea.quantities.find(q => q.id === qa)?.unit
      ) ?? qb;
  const detected = sharedBasis(ea, eb);
  const shared = v.shared || !!detected ? (detected ?? 'data') : null;
  const rho = v.rho === '' ? null : Number(v.rho);
  const result = compareEntries(a, second, {
    idA: qa,
    idB: qb,
    ...(Number.isFinite(rho) ? { rho } : {}),
    shared: shared ?? undefined,
  });
  const { t, locale, led, line } = await loadTools();
  const loc = locale();
  const one = (entry, id) => {
    const row = led.evidenceRows([entry], t, loc).find(r => r.id === id);
    return row
      ? `${row.label}: ${line(row, loc)}${row.unit ? ` ${row.unit}` : ''}`
      : id;
  };
  const sel = (name, entry, id) =>
    `<div class="ui-field"><label for="rv_${name}">${esc(name === 'qa' ? L('Quantity of the first entry', 'Cantidad de la primera entrada') : L('Quantity of the second entry', 'Cantidad de la segunda entrada'))}</label><select id="rv_${name}" class="ui-select" data-rv="${name}">${led
      .evidenceRows([entry], t, loc)
      .filter(r => !r.id.startsWith('assumed:'))
      .map(
        r =>
          `<option value="${esc(r.id)}"${r.id === id ? ' selected' : ''}>${esc(r.label)}</option>`
      )
      .join('')}</select></div>`;
  const unit = result.ok
    ? (led.evidenceRows([a], t, loc).find(r => r.id === qa)?.unit ?? '')
    : '';
  const text =
    !result.ok && REFUSALS[result.reason]
      ? L(...REFUSALS[result.reason])
      : await statement(result, unit);
  const flag = !result.ok
    ? ''
    : result.independent
      ? L('Independence assumed.', 'Independencia supuesta.')
      : result.covarianceFrom === 'record'
        ? L(
            'Covariance used, as the record states it.',
            'Covarianza usada, tal como la declara el registro.'
          )
        : L(
            'Covariance used, from the correlation you gave.',
            'Covarianza usada, a partir de la correlación que diste.'
          );
  if (result.ok)
    cmpSpec = {
      a: a.id,
      b: second.id,
      idA: qa,
      idB: qb,
      rho: Number.isFinite(rho) ? rho : null,
      stated: v.shared === true,
    };
  const carry = !result.ok
    ? ''
    : a.marked === true && second.marked === true
      ? `<div class="mw-actions"><button type="button" class="ui-button is-small" data-rv="addcmp">${esc(L('Add this comparison to your report', 'Añadir esta comparación a tu informe'))}</button></div>`
      : `<p class="ui-hint">${esc(L('Tick "For a report" on what you compare to carry this comparison into your report.', 'Marca «Para un informe» en lo que comparas para llevar esta comparación a tu informe.'))}</p>`;
  return `<div class="mw-card" role="group" aria-labelledby="rvCmpTitle"><h3 id="rvCmpTitle">${esc(L('Comparison', 'Comparación'))}</h3>
<p>${esc(L('First', 'Primera'))}: ${esc(a.title)}. ${esc(one(a, qa))}</p>
<p>${esc(L('Second', 'Segunda'))}: ${esc(second.title)}${second === a ? esc(L(' (the same entry)', ' (la misma entrada)')) : ''}. ${esc(one(second, qb))}</p>
${sel('qa', a, qa)}${sel('qb', second, qb)}
<div class="ui-field"><label for="rv_rho">${esc(L('Correlation between the two, from -1 to 1 (leave empty if you do not know)', 'Correlación entre las dos, de -1 a 1 (déjala vacía si no la conoces)'))}</label><input id="rv_rho" class="ui-input" type="number" step="any" min="-1" max="1" inputmode="decimal" value="${esc(v.rho)}" data-rv="rho" /></div>
<label class="ui-choice"><input type="checkbox" data-rv="shared"${shared ? ' checked' : ''}${detected ? ' disabled' : ''} /> <span>${esc(detected ? L(`The records share their ${detected === 'data' ? 'data' : 'calibration'}.`, `Los registros comparten ${detected === 'data' ? 'sus datos' : 'su calibración'}.`) : L('I know these share data or calibration.', 'Sé que estos comparten datos o calibración.'))}</span></label>
<p class="ui-state ${result.ok ? 'is-ok' : 'is-warning'}" data-rv="result" tabindex="-1">${flag ? `<strong>${esc(flag)}</strong> ` : ''}${esc(text)}</p>${carry}</div>`;
}

/** What ./reportView.js is handed: the page, the entries and this view's words. */
async function reportCtx(page, entries) {
  // The report's modules arrive with the idle install, not the first visit:
  // offline before then, the import fails and the card says why.
  try {
    reportMod ??= await import('./reportView.js');
  } catch {
    return null;
  }
  const t = await loadTools();
  return {
    page,
    entries,
    v,
    lang: es() ? 'es' : 'en',
    L,
    esc,
    tools: t,
    write,
    comparison: cmpSpec,
    kindName: k => {
      const x = t.t(`nb.source.${k}`);
      return x === `nb.source.${k}` ? k : x;
    },
  };
}

/**
 * Draw the review into its section.
 * @param {{state: {records: Array<object>, store: object}, refresh: Function}} page
 */
export async function show(page) {
  const { state } = page;
  const box = document.getElementById('mwReview');
  if (box !== lastBox) [lastBox, v] = [box, fresh()];
  current = page;
  const entries = entriesOf(state.records);
  box.hidden = entries.length === 0;
  if (!entries.length) return;
  const { t } = await loadTools();
  const rows = reviewRows(entries);
  v.ticked = v.ticked.filter(id => rows.some(r => r.id === id));
  const shown = filters(rows);
  const kindName = k => {
    const x = t(`nb.source.${k}`);
    return x === `nb.source.${k}` ? k : x;
  };
  const invName = k => {
    const r = rows.find(x => x.investigation === k);
    return r ? whereOf(r) : k;
  };
  const noting = entries.find(e => e.id === v.noting);
  const had = document.activeElement?.closest?.('#mwReview')
    ? [
        document.activeElement.dataset.rv,
        document.activeElement.dataset.id ?? '',
      ]
    : null;
  const comparison = await compareBox(entries);
  const report =
    entries.some(e => e.marked === true) ||
    state.records.some(r => r.id === REPORT)
      ? await reportCard(page, entries)
      : '';
  box.querySelector('.mw-body').innerHTML =
    `<div class="mw-actions" role="group" aria-label="${esc(L('Filters', 'Filtros'))}">${menu('rvInv', L('Investigation', 'Investigación'), distinct(rows, 'investigation'), invName, v.investigation)}${menu('rvKind', L('Kind', 'Tipo'), distinct(rows, 'kind'), kindName, v.kind)}
<div class="ui-field"><label for="rvFrom">${esc(L('From', 'Desde'))}</label><input id="rvFrom" class="ui-input" type="date" value="${esc(v.from)}" data-rv="from" /></div>
<div class="ui-field"><label for="rvTo">${esc(L('To', 'Hasta'))}</label><input id="rvTo" class="ui-input" type="date" value="${esc(v.to)}" data-rv="to" /></div>
<button type="button" class="ui-button is-small" data-rv="clear">${esc(L('Clear filters', 'Quitar filtros'))}</button></div>
<p class="ui-hint" role="status" aria-live="polite" id="rvStatus">${esc(v.say || L(`${shown.length} of ${rows.length} entries shown. ${rows.filter(r => r.marked).length} marked for a report.`, `${shown.length} de ${rows.length} entradas a la vista. ${rows.filter(r => r.marked).length} marcadas para un informe.`))}${v.ticked.length ? ` <a href="#rvCompare">${esc(L('Go to the comparison', 'Ir a la comparación'))}</a>` : ''}</p>
<ul class="mw-list">${shown.map(r => rowItem(r, t, page.surfaces)).join('')}</ul>
${shown.length ? '' : `<p class="ui-state is-empty">${esc(L('No entry matches these filters.', 'Ninguna entrada coincide con estos filtros.'))}</p>`}
<p class="ui-hint">${esc(L('Compare one entry with another of the same kind, or tick one entry to compare two of its quantities. A mark is kept with the entry; the marked entries make up your report, below.', 'Compara una entrada con otra del mismo tipo, o marca una sola para comparar dos de sus cantidades. La marca se guarda con la entrada; las entradas marcadas forman tu informe, abajo.'))}</p>
<div id="rvCompare">${comparison}</div>
${noting ? noteForm(noting) : ''}${report}`;
  if (noting && v.focus === 'note') {
    box.querySelector('#rvNoteTitle')?.focus();
  } else if (v.refocus) {
    control(box, ...v.refocus)?.focus({ preventScroll: true });
  } else if (had) {
    const [kind, id] = had;
    control(box, kind, id)?.focus({ preventScroll: true });
  }
  v.focus = '';
  v.refocus = null;
  wire(box);
}

/** The report card (./reportView.js), as HTML. */
async function reportCard(page, entries) {
  const ctx = await reportCtx(page, entries);
  return ctx
    ? reportMod.card(ctx)
    : `<p class="ui-state is-warning" id="rvReport">${esc(L('Your report could not be loaded. It needs a connection the first time; reload this page when you have one.', 'No se pudo cargar tu informe. Necesita conexión la primera vez; recarga esta página cuando la tengas.'))}</p>`;
}

/** Write the notebook with its entries changed, through the student store. */
async function write(change) {
  const page = current;
  const { state } = page;
  const rec = state.records.find(r => r.id === NOTEBOOK);
  if (!rec) return false;
  const doc = rec.value;
  const entries = doc.entries.map(change);
  const kept = await state.store
    .collection(rec.collection)
    .put(NOTEBOOK, { ...doc, entries });
  await page.refresh();
  return !!kept?.ok;
}

const wiredBoxes = new WeakSet();

function wire(box) {
  if (wiredBoxes.has(box)) return;
  wiredBoxes.add(box);
  const again = () => show(current);
  box.addEventListener('change', async e => {
    const c = e.target.closest('[data-rv]');
    if (!c) return;
    const k = c.dataset.rv;
    v.say = '';
    if (k === 'rvInv') v.investigation = c.value;
    else if (k === 'rvKind') v.kind = c.value;
    else if (k === 'from') v.from = c.value;
    else if (k === 'to') v.to = c.value;
    else if (k === 'qa') v.qa = c.value;
    else if (k === 'qb') v.qb = c.value;
    else if (k === 'rho') v.rho = c.value.trim();
    else if (k === 'shared') v.shared = c.checked;
    else if (k === 'reptitle') v.title = c.value.trim();
    else if (k === 'compare') {
      v.ticked = c.checked
        ? [...new Set([...v.ticked, c.dataset.id])].slice(0, 2)
        : v.ticked.filter(x => x !== c.dataset.id);
      v.qa = v.qb = '';
    } else if (k === 'mark') {
      const ok = await write(x =>
        x.id === c.dataset.id ? mark(x, c.checked) : x
      );
      v.say = ok
        ? c.checked
          ? L('Marked for a report.', 'Marcada para un informe.')
          : L('Mark removed.', 'Marca quitada.')
        : L(
            'This browser did not keep the mark.',
            'Este navegador no guardó la marca.'
          );
      return again();
    } else return;
    again();
  });
  box.addEventListener('click', async e => {
    const b = e.target.closest('button[data-rv]');
    if (!b) return;
    v.say = '';
    if (REPORT_ACTIONS.includes(b.dataset.rv)) {
      const ctx = await reportCtx(current, entriesOf(current.state.records));
      if (ctx) await reportMod.act(b.dataset.rv, b.dataset.id ?? '', ctx);
      return again();
    }
    if (b.dataset.rv === 'clear') {
      v.investigation = v.kind = v.from = v.to = '';
    } else if (b.dataset.rv === 'note') {
      v.noting = b.dataset.id;
      v.focus = 'note';
    } else if (b.dataset.rv === 'notecancel') {
      const id = v.noting;
      v.noting = '';
      v.focus = '';
      again().then(() => control(box, 'note', id)?.focus());
      return;
    } else return;
    again();
  });
  box.addEventListener('submit', async e => {
    const f = e.target.closest('[data-rv="noteform"]');
    if (!f) return;
    e.preventDefault();
    const changes = {};
    for (const el of f.querySelectorAll('[data-rv-field]'))
      changes[el.dataset.rvField] = el.value;
    const id = v.noting;
    v.noting = '';
    const ok = await write(x => (x.id === id ? annotate(x, changes) : x));
    v.say = ok
      ? L('Annotation saved.', 'Anotación guardada.')
      : L(
          'This browser did not keep the annotation.',
          'Este navegador no guardó la anotación.'
        );
    await again();
    control(box, 'note', id)?.focus();
  });
}
