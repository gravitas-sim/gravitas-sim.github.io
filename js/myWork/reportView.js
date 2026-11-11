// =============================================================================
// My work: the report composed from marked entries (Prompt 275, part B)
// -----------------------------------------------------------------------------
// The card under the evidence review (./evidenceView.js, which loads this only
// when an entry is marked or a report was made). It lists the marked entries
// as the report's sections, in an order the student changes with two buttons
// each (no dragging: a keyboard and one finger do the same thing), the
// comparisons carried in from the comparison above, and a title. "Make the
// report" writes it: one record among the things made (./made.js, kind
// `report`), holding a gravitas.composed-report/1 (./composedReport.js). The
// downloads are of that made report, so the PDF, the HTML, the CSV and the
// file for the instructor all carry the digest a submission token will state.
//
// The record is its own key, so a build from before it, which drops a mark it
// does not know when it saves the notebook, leaves the report and the list of
// its entries alone; "Mark them again" restores the marks from it.
//
// Nothing is sent anywhere.
// =============================================================================

import {
  MADE_FORMAT,
  MADE_VERSION,
  buildOf,
  fileOf,
  readMade,
} from './made.js';
import {
  COMPOSED_ID,
  COMPOSED_KEY,
  CSV_TYPE,
  comparisonOf,
  composeReport,
  fillReport,
  loadSay,
  readComposed,
  reportCsv,
  reportOrder,
  sectionOf,
  wordsOf,
} from './composedReport.js';
import { compareEntries, sharedBasis } from './evidenceReview.js';
import { envelopeOf } from '../notebook/ledger.js';
import { mark } from '../notebook/entry.js';

/** The report made here before, if one is kept and readable. */
function savedOf(ctx) {
  const raw = ctx.page.state.records.find(r => r.id === COMPOSED_KEY)?.value;
  const r = readMade(raw);
  return r.ok && r.record.kind === 'report' && readComposed(r.record.report).ok
    ? r.record
    : null;
}

const orderOf = (ctx, saved) =>
  ctx.v.order ?? saved?.report.sections.map(s => s.id) ?? [];
const titleOf = (ctx, saved) =>
  ctx.v.title ?? saved?.report.title ?? wordsOf(ctx.lang).title;
const carriedOf = (ctx, saved) =>
  ctx.v.carried ??
  (saved?.report.comparisons ?? []).map(c => ({
    a: c.a.entry,
    b: c.b.entry,
    idA: c.a.id,
    idB: c.b.id,
    rho: Number.isFinite(c.rho) ? c.rho : null,
    stated: c.stated === true,
  }));

const sameSpec = (x, y) =>
  x.a === y.a && x.b === y.b && x.idA === y.idA && x.idB === y.idB;

/** The comparison a spec gives now, from the records as they are. */
function compared(spec, byId) {
  const [a, b] = [byId.get(spec.a), byId.get(spec.b)];
  if (!a || !b) return null;
  const detected = sharedBasis(envelopeOf(a), envelopeOf(b));
  const r = compareEntries(a, b, {
    idA: spec.idA,
    idB: spec.idB,
    ...(Number.isFinite(spec.rho) ? { rho: spec.rho } : {}),
    shared: spec.stated || detected ? (detected ?? 'data') : undefined,
  });
  return r.ok ? r : null;
}

/** The report the marks, the order and the carried comparisons give now. */
async function build(ctx, saved, at, app) {
  const { entries, tools } = ctx;
  const loc = tools.locale();
  const ordered = reportOrder(entries, orderOf(ctx, saved));
  const sections = ordered.map(e =>
    sectionOf(e, envelopeOf(e), tools.led.evidenceRows([e], tools.t, loc))
  );
  const byId = new Map(ordered.map(e => [e.id, e]));
  const comparisons = carriedOf(ctx, saved).flatMap(spec => {
    const r = compared(spec, byId);
    return r ? [comparisonOf(r, spec, sections)] : [];
  });
  return composeReport({
    title: titleOf(ctx, saved),
    at,
    app,
    sections,
    comparisons,
  });
}

/**
 * The card, as HTML; '' when nothing is marked and no report was made.
 * @param {object} ctx - {page, entries, v, lang, L, esc, tools, kindName}
 * @returns {Promise<string>}
 */
export async function card(ctx) {
  const { entries, L, esc } = ctx;
  const saved = savedOf(ctx);
  const ordered = reportOrder(entries, orderOf(ctx, saved));
  if (!ordered.length && !saved) return '';
  const byId = new Map(ordered.map(e => [e.id, e]));
  const button = (kind, id, label, title, off) =>
    `<button type="button" class="ui-button is-small" data-rv="${kind}" data-id="${esc(id)}"${off ? ' disabled' : ''} aria-label="${esc(`${label}: ${title}`)}">${esc(label)}</button>`;
  const items = ordered
    .map((e, i) => {
      const title = e.title || e.id;
      return `<li class="mw-item"><div class="mw-what"><div class="mw-title">${i + 1}. ${esc(title)}</div><div class="mw-facts"><span>${esc(ctx.kindName(e.source))}</span></div></div>
<div class="mw-actions">${button('up', e.id, L('Move up', 'Subir'), title, i === 0)}${button('down', e.id, L('Move down', 'Bajar'), title, i === ordered.length - 1)}</div></li>`;
    })
    .join('');
  const carried = carriedOf(ctx, saved)
    .map((spec, i) => [spec, i, compared(spec, byId)])
    .filter(x => x[2]);
  const cmp = carried
    .map(([spec, i]) => {
      const name = `${byId.get(spec.a).title} / ${byId.get(spec.b).title}`;
      return `<li class="mw-item"><div class="mw-what"><div class="mw-title">${esc(L('Comparison', 'Comparación'))}: ${esc(name)}</div></div><div class="mw-actions">${button('dropcmp', String(i), L('Remove', 'Quitar'), name, false)}</div></li>`;
    })
    .join('');

  let made = '';
  if (saved) {
    const r = saved.report;
    const now = ordered.length
      ? await build(ctx, saved, r.madeAt, r.app)
      : null;
    const stale = now?.digest !== r.digest;
    const lost = r.sections.filter(s =>
      entries.some(e => e.id === s.id && e.marked !== true)
    ).length;
    const when = new Date(r.madeAt).toLocaleDateString(ctx.lang, {
      dateStyle: 'medium',
    });
    made = `<p class="ui-state ${stale ? 'is-warning' : 'is-ok'}" data-rv="repstate">${esc(
      L(
        `Report made on ${when}: "${r.title}", ${r.sections.length} sections, ${r.comparisons.length} comparisons. Its digest starts ${r.digest.slice(0, 16)}.`,
        `Informe hecho el ${when}: «${r.title}», ${r.sections.length} secciones, ${r.comparisons.length} comparaciones. Su resumen empieza por ${r.digest.slice(0, 16)}.`
      )
    )}${
      stale
        ? ` ${esc(L('Your marks, their order or your notes have changed since. Make the report again to include the changes; the downloads below are of the report as it was made.', 'Tus marcas, su orden o tus notas han cambiado desde entonces. Haz el informe de nuevo para incluir los cambios; las descargas de abajo son del informe tal como se hizo.'))}`
        : ''
    }</p>
${
  lost
    ? `<p class="ui-hint">${esc(L(`${lost} of its entries are no longer marked. An older version of Gravitas drops the mark when it saves the notebook; the report keeps the list.`, `${lost} de sus entradas ya no están marcadas. Una versión anterior de Gravitas pierde la marca al guardar el cuaderno; el informe conserva la lista.`))} <button type="button" class="ui-button is-small" data-rv="remark">${esc(L('Mark them again', 'Marcarlas de nuevo'))}</button></p>`
    : ''
}
<div class="mw-actions" role="group" aria-label="${esc(L('Download the report', 'Descargar el informe'))}">${[
      ['pdf', L('Download PDF', 'Descargar PDF')],
      ['html', L('Download accessible HTML', 'Descargar HTML accesible')],
      ['csv', L('Download the numbers (CSV)', 'Descargar los números (CSV)')],
      [
        'file',
        L(
          'Download the report file for your instructor',
          'Descargar el archivo del informe para tu docente'
        ),
      ],
    ]
      .map(
        ([k, label]) =>
          `<button type="button" class="ui-button is-small" data-rv="${k}">${esc(label)}</button>`
      )
      .join('')}</div>
<p class="ui-hint">${esc(L('The next submission you make in an investigation states this digest. Hand in the report file with it, so your instructor can read the report and check it is the one you made. Nothing is sent from here.', 'La próxima entrega que hagas en una investigación declara este resumen. Entrega con ella el archivo del informe, para que tu docente pueda leerlo y comprobar que es el que hiciste. Nada se envía desde aquí.'))}</p>`;
  }

  return `<div class="mw-card" id="rvReport" role="group" aria-labelledby="rvRepTitle"><h3 id="rvRepTitle">${esc(L('Your report', 'Tu informe'))}</h3>
<p class="ui-hint">${esc(L('A report made from the entries you marked, across investigations, in the order you choose. The report of each investigation stays as it is.', 'Un informe hecho con las entradas que marcaste, de varias investigaciones, en el orden que elijas. El informe de cada investigación queda como está.'))}</p>
${
  ordered.length
    ? `<div class="ui-field"><label for="rvRepName">${esc(L('Title of the report', 'Título del informe'))}</label><input id="rvRepName" class="ui-input" type="text" maxlength="120" value="${esc(titleOf(ctx, saved))}" data-rv="reptitle" /></div>
<ol class="mw-list" aria-label="${esc(L('Sections, in order', 'Secciones, en orden'))}">${items}</ol>
${cmp ? `<ul class="mw-list" aria-label="${esc(L('Comparisons in the report', 'Comparaciones del informe'))}">${cmp}</ul>` : ''}
<div class="mw-actions"><button type="button" class="ui-button is-primary is-small" data-rv="make">${esc(L('Make the report', 'Hacer el informe'))}</button></div>`
    : `<p class="ui-state is-empty">${esc(L('No entry is marked. Tick "For a report" on an entry above to put it in.', 'Ninguna entrada está marcada. Marca «Para un informe» en una entrada de arriba para incluirla.'))}</p>`
}
${made}</div>`;
}

function save(data, name, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type }));
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

const slugOf = title =>
  String(title)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'report';

/** What the page says a made report with: the words, and the notebook's figures. */
function sayFor(ctx) {
  const { entries, tools } = ctx;
  const said = (id, vars, raw) => {
    if (!id) return raw;
    const s = tools.t(id, vars);
    return s === id ? raw : s;
  };
  return loadSay(ctx.lang, {
    figure: id => {
      const f = entries.find(e => e.id === id)?.snapshot?.figure;
      return f?.series?.length
        ? {
            series: f.series,
            logX: f.logX,
            title: said(f.tid, f.tv, f.title),
            xLabel: said(f.xid, f.xv, f.xLabel),
            yLabel: said(f.yid, f.yv, f.yLabel),
          }
        : null;
    },
  });
}

/** The actions this card answers. */
export const ACTIONS = [
  'up',
  'down',
  'dropcmp',
  'addcmp',
  'make',
  'remark',
  'pdf',
  'html',
  'csv',
  'file',
];

/**
 * Do what a button of the card (or "Add this comparison to the report") asks.
 * Sets `v.say` to what a screen reader is told; the caller redraws.
 * @param {string} kind - One of ACTIONS
 * @param {string} id - The button's data-id, if it has one
 * @param {object} ctx - As card(), with `write` and, for addcmp, `comparison`
 * @returns {Promise<void>}
 */
export async function act(kind, id, ctx) {
  const { entries, v, L } = ctx;
  const saved = savedOf(ctx);
  const ordered = reportOrder(entries, orderOf(ctx, saved));
  if (kind === 'up' || kind === 'down') {
    const ids = ordered.map(e => e.id);
    const i = ids.indexOf(id);
    const j = kind === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    v.order = ids;
    const title = ordered[i].title || id;
    v.say = L(
      `${title} is now section ${j + 1} of ${ids.length}.`,
      `${title} es ahora la sección ${j + 1} de ${ids.length}.`
    );
    // The same entry keeps the focus; at an end, its other button does.
    v.refocus = [
      (kind === 'up' && j === 0) || (kind === 'down' && j === ids.length - 1)
        ? kind === 'up'
          ? 'down'
          : 'up'
        : kind,
      id,
    ];
    return;
  }
  if (kind === 'dropcmp') {
    v.carried = carriedOf(ctx, saved).filter((_, i) => String(i) !== id);
    v.say = L(
      'Comparison removed from the report.',
      'Comparación quitada del informe.'
    );
    v.refocus = ['make', ''];
    return;
  }
  if (kind === 'addcmp') {
    const spec = ctx.comparison;
    if (!spec) return;
    const list = carriedOf(ctx, saved).filter(x => !sameSpec(x, spec));
    v.carried = [...list, spec];
    v.say = L(
      'Comparison added to your report, with its covariance statement. Make the report to keep it.',
      'Comparación añadida a tu informe, con su enunciado de covarianza. Haz el informe para conservarla.'
    );
    return;
  }
  if (kind === 'remark') {
    const ids = new Set(saved?.report.sections.map(s => s.id));
    const ok = await ctx.write(x => (ids.has(x.id) ? mark(x, true) : x));
    v.say = ok
      ? L('Marked again.', 'Marcadas de nuevo.')
      : L(
          'This browser did not keep the marks.',
          'Este navegador no guardó las marcas.'
        );
    v.refocus = ['make', ''];
    return;
  }
  if (kind === 'make') {
    if (!ordered.length) return;
    const report = await build(ctx, saved, new Date().toISOString(), buildOf());
    const kept = await ctx.page.state.store
      .collection('made')
      .put(COMPOSED_KEY, {
        format: MADE_FORMAT,
        formatVersion: MADE_VERSION,
        id: COMPOSED_ID,
        kind: 'report',
        from: 'my-work',
        name: report.title,
        savedAt: report.madeAt,
        app: report.app,
        attachedTo: [],
        report,
      });
    if (kept?.ok) v.order = v.title = v.carried = null;
    v.say = kept?.ok
      ? L(
          `Report made: ${report.sections.length} sections, ${report.comparisons.length} comparisons. Its digest starts ${report.digest.slice(0, 16)}.`,
          `Informe hecho: ${report.sections.length} secciones, ${report.comparisons.length} comparaciones. Su resumen empieza por ${report.digest.slice(0, 16)}.`
        )
      : L(
          'This browser did not keep the report.',
          'Este navegador no guardó el informe.'
        );
    await ctx.page.refresh();
    return;
  }
  if (!saved) return;
  const report = saved.report;
  const name = `gravitas-report-${slugOf(report.title)}`;
  if (kind === 'file') {
    const f = fileOf(saved);
    save(JSON.stringify(f.json, null, 2), f.name, 'application/json');
  } else {
    const say = await sayFor(ctx);
    const head = {
      title: report.title,
      footer: wordsOf(ctx.lang).footer,
      lang: ctx.lang === 'es' ? 'es-ES' : 'en-US',
    };
    if (kind === 'csv') save(reportCsv(report, say), `${name}.csv`, CSV_TYPE);
    else if (kind === 'html') {
      const { createHtmlDocument } = await import('../htmlReport.js');
      save(
        fillReport(createHtmlDocument(head), report, say).build(),
        `${name}.html`,
        'text/html;charset=utf-8'
      );
    } else if (kind === 'pdf') {
      const { createDocument } = await import('../pdf.js');
      save(
        fillReport(
          createDocument({ ...head, tagged: true }),
          report,
          say
        ).build(),
        `${name}.pdf`,
        'application/pdf'
      );
    } else return;
  }
  v.say = L('The file was made.', 'El archivo se hizo.');
}
