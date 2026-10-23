// =============================================================================
// The printable activity list (an instructor module, Roadmap III Prompt 174)
// -----------------------------------------------------------------------------
// A course package in, a plan out: units, items, links, depths, time bands, what
// builds on what, textbook chapters, objectives, what students hand in, and the
// matrix of the instructor's own outcomes against the items. `buildPlan` reads
// the package and what the page knows; `toHtml` and `toMarkdown` write it, as a
// page to print and as text to paste into a learning platform's page. Both are
// made in the browser, from the course on the page, and nothing is committed or
// sent.
//
// Honest by construction:
//  - a time is a band (js/data/instructorTimeBands.js), never a measurement, and
//    the plan says "editorial estimate; no observed class data" wherever it
//    shows one, until the evidence-status record holds an observed value;
//  - the outcome matrix is the instructor's mapping of what the course intends,
//    and it says so: it is not evidence that any student attained an outcome;
//  - what students hand in is what the project's lessons produce (a lab report
//    as a PDF, or its token), not anything Gravitas collects.
//
// Pure: no DOM, no import of a page module. What the page owns comes in as
// arguments, as js/instructorCartridge.js takes it, so this module adds no
// request to the course builder's route (a shared import would split a chunk).
// =============================================================================

import {
  BANDS,
  OBSERVED,
  STATEMENT,
  bandOfMinutes,
  lessonBand,
  shareBand,
} from './data/instructorTimeBands.js';
import { tr } from './instructorPlanText.js';

/** What each course level reads at (js/course/pack.js LEVEL_DEPTH; a test holds them equal). */
const LEVEL_DEPTH = {
  survey: 'core',
  majors: 'quantitative',
  upper: 'advanced',
};

/** The kinds whose depth is the item's own. */
const DEPTH_KINDS = new Set(['lesson', 'assignment', 'guide']);
const LAB_REPORT_KINDS = new Set(['lesson', 'assignment', 'pack']);

/** The statement every time carries, or nothing once the record holds an observed value. */
export const statementFor = locale => (OBSERVED ? '' : STATEMENT[locale]);

/** The id the lesson engine knows an item by (js/course/pack.js lessonKeyOf; a test holds them equal). */
export const keyOf = item =>
  item?.kind === 'pack'
    ? `rx-${item.pack}-${String(item.version).replace(/\./g, '-')}`
    : item?.lesson;

const pick = (v, locale) => (v ? v[locale] || v.en || '' : '');

/**
 * The plan for a course.
 *
 * @param {object} pack - A valid /2 pack (not a collection's profile: a collection has no units to time, and prints as one unit)
 * @param {object} ctx - What the page owns
 * @param {'en'|'es'} ctx.locale - The language to write in
 * @param {{itemsOf: Function}} ctx.lib - js/course/pack.js's
 * @param {object} ctx.facts - js/course/api.js courseFacts()
 * @param {{course: {home?: string}, items: Array<{id: string, links: object}>}} ctx.links - A manifest, or what the kit makes of one
 * @param {(item: object) => string} ctx.name - What an item is called
 * @param {Map<string, object>} [ctx.cards] - The investigation manifest's cards by lesson id (step and marked-step counts)
 * @param {Map<string, string[]>} [ctx.own] - Each investigation's own objectives, in `locale`, by lesson id
 * @param {Map<string, object>} [ctx.entries] - The Library's entries by id (`investigation:<id>`): textbook chapter and prerequisites
 * @returns {object} The plan
 */
export function buildPlan(pack, ctx) {
  const { locale: L, lib, facts } = ctx;
  const T = (id, vars) => tr(L, id, vars);
  const all = lib.itemsOf(pack);
  const byId = new Map(all.map(x => [x.item.id, x.item]));
  const links = new Map(
    (ctx.links?.items || []).map(i => [i.id, i.links || {}])
  );
  const objectives = new Map(
    (pack.objectives || []).map(o => [o.id, { ...o, text: pick(o.text, L) }])
  );

  const depthOf = item =>
    !DEPTH_KINDS.has(item.kind)
      ? null
      : (item.depth ??
        (item.kind === 'guide' ? 'core' : LEVEL_DEPTH[pack.courseLevel]) ??
        'core');

  /** The band an item falls in, or null. */
  function timeOf(item, depth) {
    let band = null;
    const fact = facts?.lessons?.get(keyOf(item));
    if (Number.isInteger(item.minutes)) band = bandOfMinutes(item.minutes);
    else if (item.kind === 'lesson')
      band =
        lessonBand(item.lesson, depth) ??
        (fact?.duration ? bandOfMinutes(fact.duration.hi) : null);
    else if (item.kind === 'assignment') {
      const share = fact?.n ? (item.steps?.length || 0) / fact.n : 1;
      band =
        shareBand(item.lesson, depth, share) ??
        (fact?.duration
          ? bandOfMinutes(Math.max(5, Math.round(fact.duration.hi * share)))
          : null);
    } else if (item.kind === 'pack' && fact?.duration)
      band = bandOfMinutes(fact.duration.hi);
    return band ? { band, lo: BANDS[band].lo, hi: BANDS[band].hi } : null;
  }

  const entry = item =>
    item.lesson ? ctx.entries?.get(`investigation:${item.lesson}`) : null;

  /** A textbook chapter, in words. */
  const chapterOf = item => {
    const tb = entry(item)?.textbook;
    if (!tb?.chapter) return '';
    return tb.section
      ? T('doc.chapter', { chapter: tb.chapter, section: tb.section })
      : T('doc.chapter.only', { chapter: tb.chapter });
  };

  const prerequisitesOf = item =>
    (entry(item)?.prerequisites || [])
      .map(id => ctx.entries?.get(id))
      .filter(Boolean)
      .map(e => pick(e.title, L));

  const nameOf = item => ctx.name(item) || item.id;

  const units = (pack.units || []).map(u => {
    const items = (u.items || []).map(item => {
      const depth = depthOf(item);
      const time = timeOf(item, depth);
      const own =
        item.lesson && ctx.own?.get(item.lesson)
          ? ctx.own.get(item.lesson)
          : [];
      const made = links.get(item.id) || {};
      return {
        id: item.id,
        kind: item.kind,
        kindLabel: T(`k.${item.kind}`),
        name: nameOf(item),
        path: item.path || 'core',
        pathLabel: T(`p.${item.path || 'core'}`),
        depth,
        depthLabel: depth ? T(`d.${depth}`) : '',
        time,
        timeText: time
          ? T('b.range', {
              band: T(`b.${time.band}`),
              lo: time.lo,
              hi: time.hi,
            })
          : T('b.none'),
        link: made[L] || made.en || Object.values(made)[0] || '',
        after: (item.needs || []).map(id =>
          byId.has(id) ? nameOf(byId.get(id)) : id
        ),
        builtOn: prerequisitesOf(item),
        chapter: chapterOf(item),
        objectives: (item.objectives || [])
          .filter(id => objectives.has(id))
          .map(id => ({ id, text: objectives.get(id).text })),
        own,
        studentNote: pick(item.studentNote, L),
        teacherNote: pick(item.teacherNote, L),
      };
    });
    const sum = pred => {
      let lo = 0;
      let hi = 0;
      for (const i of items)
        if (i.time && pred(i)) {
          lo += i.time.lo;
          hi += i.time.hi;
        }
      return { lo, hi };
    };
    return {
      id: u.id,
      title: pick(u.title, L),
      summary: pick(u.summary, L),
      items,
      core: sum(i => i.path === 'core'),
      optional: sum(i => i.path !== 'core'),
    };
  });

  const total = { lo: 0, hi: 0 };
  const optional = { lo: 0, hi: 0 };
  for (const u of units) {
    total.lo += u.core.lo;
    total.hi += u.core.hi;
    optional.lo += u.optional.lo;
    optional.hi += u.optional.hi;
  }

  // --- What students hand in ------------------------------------------------
  const handIn = [];
  const nothing = [];
  const bySource = new Map(all.map(x => [x.item.id, x.item]));
  for (const u of units)
    for (const i of u.items) {
      const item = bySource.get(i.id);
      if (!LAB_REPORT_KINDS.has(item.kind)) {
        nothing.push(i.name);
        continue;
      }
      const card = item.lesson ? ctx.cards?.get(item.lesson) : null;
      const deep = i.depth && i.depth !== 'core';
      handIn.push({
        id: i.id,
        text:
          item.kind === 'assignment'
            ? T('doc.handin.assignment', {
                name: i.name,
                n: item.steps?.length || 0,
              })
            : item.kind === 'lesson' && deep
              ? T('doc.handin.lessonDeep', {
                  name: i.name,
                  depth: T(`d.${i.depth}`),
                })
              : item.kind === 'lesson' && card?.gradedCount
                ? T('doc.handin.lesson', { name: i.name, n: card.gradedCount })
                : T('doc.handin.pack', { name: i.name }),
      });
    }

  // --- The instructor's outcomes against the items ------------------------------
  const outcomes = (pack.outcomes || []).map(o => ({
    id: o.id,
    text: pick(o.text, L),
  }));
  let matrix = null;
  if (outcomes.length) {
    const map = new Map(
      (pack.objectives || []).map(o => [o.id, new Set(o.outcomes || [])])
    );
    const rows = [];
    const unmapped = [];
    for (const u of units)
      for (const i of u.items) {
        if (!i.objectives.length) {
          unmapped.push(i.name);
          continue;
        }
        const served = new Set();
        for (const o of i.objectives)
          for (const out of map.get(o.id) || []) served.add(out);
        rows.push({
          unit: u.title,
          item: i.name,
          cells: outcomes.map(o => served.has(o.id)),
        });
      }
    matrix = {
      outcomes,
      rows,
      unmapped,
      unserved: outcomes
        .filter((o, k) => !rows.some(r => r.cells[k]))
        .map(o => o.text),
      mapping: (pack.objectives || []).map((o, n) => ({
        n: n + 1,
        text: objectives.get(o.id).text,
        outcomes: (o.outcomes || [])
          .map(id => outcomes.findIndex(x => x.id === id) + 1)
          .filter(Boolean),
      })),
    };
  }

  return {
    locale: L,
    title: pick(pack.title, L),
    term: pack.term || '',
    summary: pick(pack.summary, L),
    audience: pick(pack.audience, L),
    home: ctx.links?.course?.home || '',
    statement: statementFor(L),
    prerequisites: (pack.prerequisites || []).map(p =>
      p.lesson
        ? T('doc.prereq.lesson', {
            name: pick(facts?.lessons?.get(p.lesson)?.title, L) || p.lesson,
          })
        : pick(p.text, L)
    ),
    objectives: (pack.objectives || []).map(o => objectives.get(o.id)),
    bands: Object.fromEntries(
      Object.entries(BANDS).map(([b, r]) => [b, `${r.lo}–${r.hi} min`])
    ),
    units,
    total,
    optional,
    handIn,
    nothing,
    outcomes,
    matrix,
  };
}

/** A range of minutes in words. */
export const rangeText = (r, locale) =>
  tr(locale, 'b.rangeOnly', { lo: r.lo, hi: r.hi });

// --- Text out ---------------------------------------------------------------------

const mdCell = s =>
  String(s ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[\\|*_[\]`]/g, c => `\\${c}`);
const mdText = s => String(s ?? '').replace(/[\\*_[\]`]/g, c => `\\${c}`);

/**
 * The plan as Markdown, to paste into a page of a learning platform.
 * @param {object} plan - buildPlan()
 * @returns {string}
 */
export function toMarkdown(plan) {
  const L = plan.locale;
  const T = (id, vars) => tr(L, id, vars);
  const out = [];
  const line = (s = '') => out.push(s);
  line(`# ${mdText(T('doc.title', { title: plan.title }))}`);
  line();
  if (plan.term) line(`${mdText(T('doc.term', { term: plan.term }))}  `);
  if (plan.audience)
    line(`${mdText(T('doc.audience', { audience: plan.audience }))}  `);
  if (plan.home) line(`${T('doc.home')}: <${plan.home}>`);
  line();
  if (plan.summary) {
    line(mdText(plan.summary));
    line();
  }
  line(`*${mdText(T('doc.generated'))}*`);
  line();
  line(timeNote(plan, T));
  line();
  if (plan.prerequisites.length) {
    line(`## ${T('doc.prereq')}`);
    line();
    for (const p of plan.prerequisites) line(`- ${mdText(p)}`);
    line();
  }
  if (plan.objectives.length) {
    line(`## ${T('doc.objectives')}`);
    line();
    plan.objectives.forEach((o, n) => line(`${n + 1}. ${mdText(o.text)}`));
    line();
  }
  line(`## ${T('doc.glance')}`);
  line();
  line(
    `| ${T('doc.glance.unit')} | ${T('doc.glance.items')} | ${T('doc.glance.time')} |`
  );
  line('| --- | ---: | --- |');
  for (const u of plan.units)
    line(
      `| ${mdCell(u.title)} | ${u.items.length} | ${mdCell(rangeText(u.core, L))} |`
    );
  line(
    `| **${mdCell(T('doc.glance.total'))}** | ${plan.units.reduce((n, u) => n + u.items.length, 0)} | ${mdCell(rangeText(plan.total, L))} |`
  );
  if (plan.optional.hi)
    line(
      `\n${mdText(T('doc.glance.optional', { lo: plan.optional.lo, hi: plan.optional.hi }))}`
    );
  line();
  line(`## ${T('doc.units')}`);
  for (const u of plan.units) {
    line();
    line(`### ${mdText(u.title)}`);
    line();
    if (u.summary) {
      line(mdText(u.summary));
      line();
    }
    line(mdText(T('doc.unit.time', { range: rangeText(u.core, L) })));
    if (u.optional.hi)
      line(
        `  ${mdText(T('doc.unit.optional', { range: rangeText(u.optional, L) }))}`
      );
    for (const i of u.items) {
      line();
      line(`#### ${mdText(i.name)}`);
      line();
      line(
        `- **${T('doc.item.kind')}:** ${mdText(i.kindLabel)}${i.depthLabel ? `, ${mdText(i.depthLabel)}` : ''}. ${mdText(i.pathLabel)}.`
      );
      line(`- **${T('doc.item.time')}:** ${mdText(i.timeText)}`);
      if (i.link) line(`- **${T('doc.item.link')}:** <${i.link}>`);
      if (i.after.length)
        line(`- **${T('doc.item.after')}:** ${mdText(i.after.join('; '))}`);
      if (i.builtOn.length)
        line(`- **${T('doc.item.prereq')}:** ${mdText(i.builtOn.join('; '))}`);
      if (i.chapter)
        line(`- **${T('doc.item.chapter')}:** ${mdText(i.chapter)}`);
      if (i.objectives.length)
        line(
          `- **${T('doc.item.objectives')}:** ${mdText(i.objectives.map(o => o.text).join('; '))}`
        );
      if (i.own.length) {
        line(`- **${T('doc.item.own')}:**`);
        for (const o of i.own) line(`  - ${mdText(o)}`);
      }
      if (i.studentNote)
        line(`- **${T('doc.item.note')}:** ${mdText(i.studentNote)}`);
      if (i.teacherNote)
        line(`- **${T('doc.item.teacher')}:** ${mdText(i.teacherNote)}`);
    }
  }
  line();
  line(`## ${T('doc.handin')}`);
  line();
  line(mdText(T('doc.handin.lede')));
  line();
  if (plan.handIn.length)
    for (const h of plan.handIn) line(`- ${mdText(h.text)}`);
  else line(mdText(T('doc.handin.empty')));
  if (plan.nothing.length && plan.handIn.length) {
    line();
    line(mdText(T('doc.handin.none', { names: plan.nothing.join('; ') })));
  }
  line();
  line(`## ${T('doc.out')}`);
  line();
  if (!plan.matrix) line(mdText(T('doc.out.none')));
  else {
    const m = plan.matrix;
    line(mdText(T('doc.out.lede')));
    line();
    line(`**${T('doc.out.list')}**`);
    line();
    m.outcomes.forEach((o, n) => line(`${n + 1}. ${mdText(o.text)}`));
    line();
    line(`**${T('doc.out.map')}**`);
    line();
    for (const o of m.mapping)
      line(
        `- ${mdText(T('doc.out.objective', { n: o.n }))}: ${mdText(o.text)} → ${o.outcomes.length ? o.outcomes.join(', ') : mdText(T('doc.out.unmapped'))}`
      );
    line();
    line(
      `| ${T('doc.out.item')} | ${m.outcomes.map((_, n) => n + 1).join(' | ')} |`
    );
    line(`| --- | ${m.outcomes.map(() => ':---:').join(' | ')} |`);
    for (const r of m.rows)
      line(
        `| ${mdCell(`${r.unit}: ${r.item}`)} | ${r.cells.map(c => (c ? 'x' : '')).join(' | ')} |`
      );
    if (m.unserved.length) {
      line();
      line(mdText(T('doc.out.unserved', { names: m.unserved.join('; ') })));
    }
    if (m.unmapped.length) {
      line();
      line(mdText(T('doc.out.itemNone', { names: m.unmapped.join('; ') })));
    }
  }
  line();
  return `${out.join('\n')}\n`;
}

/** The time note: the bands' ranges, and the statement. */
function timeNote(plan, T) {
  return `> ${mdText(
    T('doc.time.note', {
      s: plan.bands.short,
      m: plan.bands.medium,
      l: plan.bands.long,
      statement: plan.statement,
    })
  )}`;
}

// --- HTML out -----------------------------------------------------------------------

/** Longest link printed as its own text; a longer one shows as a word. */
const LONG_LINK = 120;
const esc = s =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** A link, as text when it is short enough to print and as a word when it is not. */
const anchor = (href, T) =>
  /^https?:\/\//.test(href)
    ? `<a href="${esc(href)}">${esc(href.length > LONG_LINK ? T('doc.link.open') : href)}</a>`
    : esc(href);

/** The stylesheet of the list, for the saved page and for the print path. */
export const PLAN_CSS = `
.plan{font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#111;background:#fff;max-width:56rem;margin:0 auto;padding:1rem}
.plan h1{font-size:1.6rem;margin:.2em 0}.plan h2{font-size:1.25rem;margin:1.6em 0 .4em;border-bottom:1px solid #999}
.plan h3{font-size:1.1rem;margin:1.2em 0 .3em}.plan h4{font-size:1rem;margin:.9em 0 .2em}
.plan table{border-collapse:collapse;width:100%}.plan th,.plan td{border:1px solid #888;padding:.25em .5em;text-align:left;vertical-align:top}
.plan td.plan-yes,.plan th.plan-col{text-align:center}
.plan .plan-note{border-left:4px solid #555;padding:.1em .8em;background:#f2f2f2}
.plan dl.plan-item{margin:.2em 0 .8em;display:grid;grid-template-columns:max-content 1fr;gap:.1em 1em}
.plan dl.plan-item dt{font-weight:600}.plan dl.plan-item dd{margin:0;overflow-wrap:anywhere}
.plan a{color:#0b3d91;overflow-wrap:anywhere}
.plan .plan-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.plan-scroll{overflow-x:auto}
@media (max-width:40rem){.plan dl.plan-item{display:block}.plan dl.plan-item dd{margin:0 0 .4em}}
@media print{.plan{max-width:none;padding:0;font-size:11pt}.plan a{color:#000}.plan h2,.plan h3,.plan h4{break-after:avoid}.plan dl.plan-item,.plan tr{break-inside:avoid}.plan .plan-note{background:none}}
`;

/**
 * The plan as HTML.
 *
 * @param {object} plan - buildPlan()
 * @param {{document?: boolean, headingLevel?: number}} [opts] - `document`
 *   wraps it as a page of its own, with its stylesheet, to save; `headingLevel`
 *   is the level of the title (1) when it sits in another page
 * @returns {string}
 */
export function toHtml(plan, { document = false, headingLevel = 1 } = {}) {
  const L = plan.locale;
  const T = (id, vars) => tr(L, id, vars);
  const h = n => Math.min(6, headingLevel + n);
  const p = [];
  const add = s => p.push(s);
  add(`<article class="plan" lang="${L}" aria-labelledby="plan-title">`);
  add(
    `<h${h(0)} id="plan-title">${esc(T('doc.title', { title: plan.title }))}</h${h(0)}>`
  );
  if (plan.term) add(`<p>${esc(T('doc.term', { term: plan.term }))}</p>`);
  if (plan.audience)
    add(`<p>${esc(T('doc.audience', { audience: plan.audience }))}</p>`);
  if (plan.home) add(`<p>${esc(T('doc.home'))}: ${anchor(plan.home, T)}</p>`);
  if (plan.summary) add(`<p>${esc(plan.summary)}</p>`);
  add(`<p><em>${esc(T('doc.generated'))}</em></p>`);
  add(
    `<p class="plan-note" id="plan-time-note">${esc(
      T('doc.time.note', {
        s: plan.bands.short,
        m: plan.bands.medium,
        l: plan.bands.long,
        statement: plan.statement,
      })
    )}</p>`
  );
  if (plan.prerequisites.length) {
    add(`<h${h(1)}>${esc(T('doc.prereq'))}</h${h(1)}>`);
    add(
      `<ul>${plan.prerequisites.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`
    );
  }
  if (plan.objectives.length) {
    add(`<h${h(1)}>${esc(T('doc.objectives'))}</h${h(1)}>`);
    add(
      `<ol>${plan.objectives.map(o => `<li>${esc(o.text)}</li>`).join('')}</ol>`
    );
  }
  add(`<h${h(1)}>${esc(T('doc.glance'))}</h${h(1)}>`);
  add(
    `<div class="plan-scroll" tabindex="0" role="region" aria-label="${esc(T('doc.glance'))}"><table><thead><tr><th scope="col">${esc(T('doc.glance.unit'))}</th><th scope="col">${esc(T('doc.glance.items'))}</th><th scope="col">${esc(T('doc.glance.time'))}</th></tr></thead><tbody>${plan.units
      .map(
        u =>
          `<tr><th scope="row">${esc(u.title)}</th><td>${u.items.length}</td><td>${esc(rangeText(u.core, L))}</td></tr>`
      )
      .join(
        ''
      )}<tr><th scope="row">${esc(T('doc.glance.total'))}</th><td>${plan.units.reduce((n, u) => n + u.items.length, 0)}</td><td>${esc(rangeText(plan.total, L))}</td></tr></tbody></table></div>`
  );
  if (plan.optional.hi)
    add(
      `<p>${esc(T('doc.glance.optional', { lo: plan.optional.lo, hi: plan.optional.hi }))}</p>`
    );
  add(`<h${h(1)}>${esc(T('doc.units'))}</h${h(1)}>`);
  for (const u of plan.units) {
    add(`<section aria-label="${esc(u.title)}">`);
    add(`<h${h(2)}>${esc(u.title)}</h${h(2)}>`);
    if (u.summary) add(`<p>${esc(u.summary)}</p>`);
    add(
      `<p>${esc(T('doc.unit.time', { range: rangeText(u.core, L) }))}${
        u.optional.hi
          ? ` ${esc(T('doc.unit.optional', { range: rangeText(u.optional, L) }))}`
          : ''
      }</p>`
    );
    for (const i of u.items) {
      const rows = [
        [
          T('doc.item.kind'),
          `${esc(i.kindLabel)}${i.depthLabel ? `, ${esc(i.depthLabel)}` : ''}. ${esc(i.pathLabel)}.`,
        ],
        [T('doc.item.time'), esc(i.timeText)],
      ];
      if (i.link) rows.push([T('doc.item.link'), anchor(i.link, T)]);
      if (i.after.length)
        rows.push([T('doc.item.after'), esc(i.after.join('; '))]);
      if (i.builtOn.length)
        rows.push([T('doc.item.prereq'), esc(i.builtOn.join('; '))]);
      if (i.chapter) rows.push([T('doc.item.chapter'), esc(i.chapter)]);
      if (i.objectives.length)
        rows.push([
          T('doc.item.objectives'),
          esc(i.objectives.map(o => o.text).join('; ')),
        ]);
      if (i.own.length)
        rows.push([
          T('doc.item.own'),
          `<ul>${i.own.map(o => `<li>${esc(o)}</li>`).join('')}</ul>`,
        ]);
      if (i.studentNote) rows.push([T('doc.item.note'), esc(i.studentNote)]);
      if (i.teacherNote) rows.push([T('doc.item.teacher'), esc(i.teacherNote)]);
      add(`<h${h(3)}>${esc(i.name)}</h${h(3)}>`);
      add(
        `<dl class="plan-item">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`
      );
    }
    add('</section>');
  }
  if (
    plan.home.length > LONG_LINK ||
    plan.units.some(u => u.items.some(i => i.link.length > LONG_LINK))
  )
    add(`<p>${esc(T('doc.longlink'))}</p>`);
  add(`<h${h(1)}>${esc(T('doc.handin'))}</h${h(1)}>`);
  add(`<p>${esc(T('doc.handin.lede'))}</p>`);
  if (plan.handIn.length)
    add(`<ul>${plan.handIn.map(x => `<li>${esc(x.text)}</li>`).join('')}</ul>`);
  else add(`<p>${esc(T('doc.handin.empty'))}</p>`);
  if (plan.nothing.length && plan.handIn.length)
    add(
      `<p>${esc(T('doc.handin.none', { names: plan.nothing.join('; ') }))}</p>`
    );
  add(`<h${h(1)}>${esc(T('doc.out'))}</h${h(1)}>`);
  if (!plan.matrix) add(`<p>${esc(T('doc.out.none'))}</p>`);
  else {
    const m = plan.matrix;
    add(`<p class="plan-note">${esc(T('doc.out.lede'))}</p>`);
    add(`<h${h(2)}>${esc(T('doc.out.list'))}</h${h(2)}>`);
    add(`<ol>${m.outcomes.map(o => `<li>${esc(o.text)}</li>`).join('')}</ol>`);
    add(`<h${h(2)}>${esc(T('doc.out.map'))}</h${h(2)}>`);
    add(
      `<ul>${m.mapping
        .map(
          o =>
            `<li>${esc(T('doc.out.objective', { n: o.n }))}: ${esc(o.text)} &rarr; ${
              o.outcomes.length
                ? esc(o.outcomes.join(', '))
                : esc(T('doc.out.unmapped'))
            }</li>`
        )
        .join('')}</ul>`
    );
    add(
      `<div class="plan-scroll" tabindex="0" role="region" aria-label="${esc(T('doc.out'))}"><table><thead><tr><th scope="col">${esc(T('doc.out.item'))}</th>${m.outcomes
        .map((_, n) => `<th scope="col" class="plan-col">${n + 1}</th>`)
        .join('')}</tr></thead><tbody>${m.rows
        .map(
          r =>
            `<tr><th scope="row">${esc(r.unit)}: ${esc(r.item)}</th>${r.cells
              .map(c =>
                c
                  ? `<td class="plan-yes"><span aria-hidden="true">&#10003;</span><span class="plan-sr">${esc(T('doc.out.yes'))}</span></td>`
                  : `<td class="plan-yes"><span class="plan-sr">${esc(T('doc.out.no'))}</span></td>`
              )
              .join('')}</tr>`
        )
        .join('')}</tbody></table></div>`
    );
    if (m.unserved.length)
      add(
        `<p>${esc(T('doc.out.unserved', { names: m.unserved.join('; ') }))}</p>`
      );
    if (m.unmapped.length)
      add(
        `<p>${esc(T('doc.out.itemNone', { names: m.unmapped.join('; ') }))}</p>`
      );
  }
  add('</article>');
  const body = p.join('\n');
  if (!document) return body;
  return `<!doctype html>
<html lang="${L}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(T('doc.title', { title: plan.title }))}</title>
<style>${PLAN_CSS}</style>
</head>
<body>
${body}
</body>
</html>
`;
}

/** A file name for the plan, from the course's id: `<id>.activity-list.<locale>.<ext>`. */
export const fileName = (pack, locale, ext) =>
  `${pack.id}.activity-list.${locale}.${ext}`;
