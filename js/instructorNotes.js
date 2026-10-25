// =============================================================================
// Spanish structured notes: what can be generated, and nothing that cannot
// -----------------------------------------------------------------------------
// Prompt 170. The instructor guides and answer keys are written in English and
// their Spanish copies still carry that prose in English (js/instructorSource.js
// counts it). D-ADOPT-03 declined a Spanish user manual. These notes are
// neither: one short page per investigation, made entirely from the lesson's
// structured fields and the Spanish that exists for them, so a Spanish-speaking
// instructor can see what an investigation is for, what it asks, which steps are
// marked and which wrong answers it names, with no word written or translated.
//
//   from the lesson         objectives, title, time band, student level, step
//                           titles and kinds, the marking, named misconceptions
//   from the Library facts  course level, textbook chapter, mathematics,
//                           prerequisites, depths, the version
//   from the shadows        the Spanish of those words (js/instructorLocale.js);
//                           a text with no Spanish prints in English with [EN]
//
// Nothing here is machine-translated. The Spanish labels around the generated
// text (js/data/instructorLabels.js) are short fixed phrases that no fluent
// reader has read, and the page says so. The guide prose and every answer key
// stay English, and the first line of each page says that.
//
// Freshness: the page prints two digests, of the English texts it was made from
// and of the Spanish it printed, with the ledger's function (js/composer/
// compile.js digest, repeated below), so the same pair can be compared.
//
// Not imported by any route: the build and the tests read it.
// =============================================================================

import { createDocument } from './pdf.js';
import { entryFor, plainText } from './answerKey.js';
import { labelsFor } from './data/instructorLabels.js';
import { lessonFacts } from './instructorFacts.js';
import { SHADOW_MARK, spanishLesson } from './instructorLocale.js';
import { withAllDepths } from './investigations/depthAll.js';

/**
 * FNV-1a as eight hex digits: the ledger's digest (js/composer/compile.js
 * `digest`, js/hash.js `fnvHex8`), written out again because importing either
 * adds files to the instructor bundle's source closure, which the digest test
 * holds under 278 files (277 are in use; D-R10-67, D-R10-74, and KEPT in
 * tests/sharedHelpers.test.js). tests/instructorNotes.test.js holds this
 * equal to the original on every text the notes print.
 *
 * @param {string} text - What to digest
 * @returns {string} Eight hex digits
 */
export function digest(text) {
  let h = 0x811c9dc5;
  const s = String(text ?? '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** The marker printed after a text that has no Spanish. */
export const ENGLISH_MARK = '[EN]';

/** A shadow-marked string as plain text, and whether the shadow supplied it. */
function said(raw) {
  const s = String(raw ?? '');
  const spanish = s.startsWith(SHADOW_MARK);
  return {
    spanish,
    text: plainText(spanish ? s.slice(SHADOW_MARK.length) : s),
  };
}

/**
 * How a step is marked, from the step itself.
 * @param {object} step - The English step
 * @param {string} category - answerKey.js's category for it
 * @returns {{kind: string, mark: string, criteria?: number}} Label keys
 */
function marking(step, category) {
  if (category === 'prediction')
    return { kind: 'prediction', mark: step.reveal ? 'held' : 'auto' };
  if (category === 'graded')
    return {
      kind: step.kind === 'numeric' ? 'numeric' : 'choice',
      mark: 'auto',
    };
  if (category === 'written') {
    if (step.reflect) return { kind: 'written', mark: 'reflect' };
    const n = step.rubricCriteria?.length ?? 0;
    return { kind: 'written', mark: n ? 'criteria' : 'hand', criteria: n };
  }
  return { kind: category, mark: 'none' };
}

/**
 * Everything a page prints, as data: the one place that decides what the notes
 * say, so the document and the tests read the same answer.
 *
 * @param {object} base - The English lesson (core steps)
 * @param {(id: string) => object} lessonOf - A lesson by id, for prerequisites
 * @returns {{id: string, title: {text: string, spanish: boolean}, ...}} The model
 */
export function notesModel(base, lessonOf) {
  const english = withAllDepths(base);
  const es = spanishLesson(base, true, true);
  const facts = lessonFacts(base, id => id);
  const counted = []; // every text printed, for the status and the digests
  const take = (en, raw) => {
    const spoken = said(raw);
    counted.push({
      en: plainText(en),
      es: spoken.text,
      spanish: spoken.spanish,
    });
    return spoken;
  };

  const title = take(english.title, es.title);
  const subtitle = take(english.subtitle, es.subtitle);
  const duration = take(english.duration, es.duration);
  const level = take(english.level, es.level);
  const objectives = (english.objectives ?? []).map((o, i) =>
    take(o, es.objectives?.[i])
  );
  const prerequisites = facts.prerequisites.map(id => {
    const other = lessonOf(id);
    const marked = spanishLesson(other, false, true);
    return take(other.title, marked.title);
  });

  const steps = english.steps.map((step, i) => {
    const entry = entryFor(step, i);
    const esStep = es.steps[i];
    const named = (step.misconceptions ?? [])
      .map((m, j) => ({ m, j }))
      .filter(({ m }) => m?.say)
      .map(({ m, j }) => ({
        id: m.id,
        say: take(m.say, esStep.misconceptions?.[j]?.say),
      }));
    return {
      n: i + 1,
      sid: step.sid,
      depth: step.depth ?? 'core',
      title: take(step.title, esStep.title),
      ...marking(step, entry.category),
      reveal: step.reveal
        ? english.steps.findIndex(x => x.sid === step.reveal) + 1 || null
        : null,
      misconceptions: named,
    };
  });
  // A held prediction whose reveal step is not in the lesson is marked at once.
  for (const s of steps) if (s.mark === 'held' && !s.reveal) s.mark = 'auto';

  const done = counted.filter(c => c.spanish).length;
  return {
    id: base.id,
    title,
    subtitle,
    duration,
    level,
    objectives,
    prerequisites,
    facts,
    steps,
    marked: steps.filter(s => !['none', 'reflect'].includes(s.mark)).length,
    status: { done, total: counted.length, rest: counted.length - done },
    digests: {
      en: digest(counted.map(c => c.en).join('\n')),
      es: digest(counted.map(c => c.es).join('\n')),
    },
  };
}

/** A text for print: its Spanish, or its English with the marker. */
const shown = t => (t.spanish ? t.text : `${t.text} ${ENGLISH_MARK}`);

/**
 * The Spanish structured notes for one investigation.
 *
 * @param {object} base - The English lesson (core steps)
 * @param {object} [opts]
 * @param {string} [opts.version] - The stamp printed in the footer
 * @param {(id: string) => object} opts.lessonOf - A lesson by id
 * @returns {Uint8Array} PDF bytes
 */
export function structuredNotes(base, { version = '', lessonOf } = {}) {
  const L = labelsFor('es');
  const m = notesModel(base, lessonOf);
  const titleText = m.title.text;

  const doc = createDocument({
    title: L('notes.docTitle', { title: titleText }),
    subject: L('notes.subject', { title: titleText }),
    footer: `${L('notes.footer', { title: titleText })}${version ? `  |  ${version}` : ''}`,
    lang: 'es',
  });

  // The kicker is the first line on the page, and it is the disclaimer.
  doc.titleBlock({
    kicker: L('notes.kicker'),
    title: shown(m.title),
    subtitle: m.subtitle.text ? shown(m.subtitle) : '',
  });
  doc.paragraph(L('notes.about'), { size: 9.5 });
  doc.paragraph(L('notes.untranslated'), {
    size: 9,
    color: '0.4 0.4 0.46',
  });

  const f = m.facts;
  const rows = [
    [L('guide.row.time'), shown(m.duration)],
    [L('guide.row.level'), shown(m.level)],
    [L('guide.row.length'), L.count(m.steps.length, 'step')],
    [
      L('notes.row.marked'),
      L('notes.marked', { marked: m.marked, total: m.steps.length }),
    ],
  ];
  if (f.courseLevel)
    rows.push([
      L('guide.row.courseLevel'),
      L(`fact.courseLevel.${f.courseLevel}`),
    ]);
  if (f.textbook)
    rows.push([
      L('guide.row.textbook'),
      f.textbook.section
        ? L('guide.textbook', f.textbook)
        : L('guide.textbookChapter', f.textbook),
    ]);
  if (f.mathematics)
    rows.push([L('guide.row.mathematics'), L(`fact.math.${f.mathematics}`)]);
  rows.push([
    L('guide.row.prerequisites'),
    m.prerequisites.length
      ? m.prerequisites.map(shown).join('; ')
      : L('guide.none'),
  ]);
  if (f.depths?.length > 1)
    rows.push([
      L('guide.row.depths'),
      f.depths.map(d => L(`key.depth.${d}`)).join(', '),
    ]);
  rows.push([L('guide.row.version'), f.version]);

  const section = (n, key) =>
    doc.heading(`${n}. ${L(key)}`, {
      size: 12.5,
      spaceBefore: 18,
      keepWith: 46,
    });

  section(1, 'notes.s.facts');
  doc.table({ columns: ['', ''], widths: [1, 2], rows, size: 9 });

  section(2, 'notes.s.objectives');
  doc.bullets(m.objectives.map(shown));

  section(3, 'notes.s.steps');
  doc.paragraph(L('notes.steps.intro'), {
    size: 9.5,
    gap: 6,
    color: '0.35 0.35 0.42',
  });
  doc.table({
    columns: [
      L('notes.col.n'),
      L('notes.col.step'),
      L('notes.col.kind'),
      L('notes.col.marked'),
    ],
    widths: [0.5, 3.4, 1.3, 1.6],
    rows: m.steps.map(s => [
      String(s.n),
      shown(s.title) +
        (s.depth === 'core' ? '' : ` (${L(`key.depth.${s.depth}`)})`),
      L(`notes.kind.${s.kind}`),
      L(`notes.mark.${s.mark}`, { n: s.reveal ?? s.criteria ?? 0 }),
    ]),
    size: 8.5,
  });

  section(4, 'notes.s.misc');
  const named = m.steps.flatMap(s =>
    s.misconceptions.map(x => [String(s.n), x.id, shown(x.say)])
  );
  doc.paragraph(L('notes.misc.intro'), {
    size: 9.5,
    gap: 6,
    color: '0.35 0.35 0.42',
  });
  if (named.length)
    doc.table({
      columns: [
        L('notes.misc.step'),
        L('notes.misc.name'),
        L('notes.misc.say'),
      ],
      widths: [0.5, 1.9, 3.9],
      rows: named,
      size: 8.5,
    });
  else doc.paragraph(L('notes.misc.none'), { size: 9.5 });

  section(5, 'notes.s.where');
  const en = labelsFor('en');
  const englishTitle = plainText(base.title);
  doc.paragraph(
    L('notes.where', {
      guide: en('doc.guide', { title: englishTitle }),
      key: en('doc.key', { title: englishTitle }),
    }),
    { size: 9.5 }
  );

  section(6, 'notes.s.status');
  doc.paragraph(L('notes.status.counts', m.status), { size: 9.5, gap: 4 });
  doc.paragraph(L('notes.status.digest', m.digests), {
    size: 9,
    color: '0.4 0.4 0.46',
  });

  return doc.build();
}
