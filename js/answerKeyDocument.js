// =============================================================================
// The answer key document
// -----------------------------------------------------------------------------
// Prompt 79. The key's layout, apart from the instructor guide's prose
// (js/data/instructorContent.js, 360 KB), so a page can print a key from a
// lesson in the browser: the composer's pack key (js/composer/packKey.js) loads
// this and not the guides. The caller gives `source`, whose `expectations` (by
// step id) the key prints; js/instructorDocs.js supplies the shipped ones.
// =============================================================================

import { createDocument } from './pdf.js';
import { answerKeyFor, questionCounts, plainText } from './answerKey.js';
import { criteriaOf } from './rubric.js';
import { labelsFor } from './data/instructorLabels.js';
import { lessonAt } from './investigations/depthPure.js';

/**
 * Instructor prose as plain text, paragraph by paragraph.
 *
 * The longer prose in instructorContent.js is written in template literals, so
 * a newline is only where the source line wrapped and a blank line is a
 * paragraph break - what prose() makes of it on screen. js/pdf.js breaks the
 * printed line at every newline it is given, and plainText() folds every one
 * into a space, so each paragraph is flattened on its own and one blank line
 * is kept between them.
 *
 * @param {string} text - Instructor prose
 * @returns {string} Plain text, paragraphs separated by a blank line
 */
export const plainProse = text =>
  String(text ?? '')
    .split(/\n\s*\n/)
    .map(plainText)
    .filter(Boolean)
    .join('\n\n');

/**
 * A lesson's instructor content with every string in it through plainProse().
 * Converted whole rather than field by field, so a field added later cannot
 * reach the page as markup: one lesson's guide and key printed "<em>motion</em>".
 *
 * @param {*} value - instructorContentFor(), or any part of it
 * @returns {*} The same shape, holding plain text
 */
export const plainContent = value => {
  if (typeof value === 'string') return plainProse(value);
  if (Array.isArray(value)) return value.map(plainContent);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, plainContent(v)])
    );
  }
  return value;
};

/** The depth names a key prints, from the label table. */
export const depthLabel = (L, d) => L(`key.depth.${d}`);
const capital = s => `${s[0].toUpperCase()}${s.slice(1)}`;

/** A translation-status block: what is in the language and what is not. */
export function statusBlock(doc, L, kind, status) {
  const base = kind === 'key' ? 'key' : 'guide';
  doc.heading(L(`${base}.status.title`), { size: 10.5, spaceBefore: 14 });
  if (L.locale === 'en' || !status) {
    doc.paragraph(L(`${base}.status.none`), { size: 9, color: '0.4 0.4 0.46' });
    return;
  }
  const rows = [];
  const add = (label, part) =>
    rows.push([
      label,
      `${part.translated} / ${part.total}`,
      part.translated >= part.total
        ? L('guide.status.done')
        : L('guide.status.english'),
    ]);
  add(L('guide.status.lesson'), status.lesson);
  if (kind === 'guide') add(L('guide.status.prose'), status.guide);
  add(L('guide.status.expectations'), status.expectations);
  doc.paragraph(
    L(`${base}.status.some`, {
      done: status.done,
      total: status.total,
      rest: status.total - status.done,
    }),
    { size: 9, color: '0.4 0.4 0.46' }
  );
  doc.table({
    columns: [
      L('guide.status.col.part'),
      L('guide.status.col.count'),
      L('guide.status.col.state'),
    ],
    widths: [3.4, 0.9, 1.1],
    rows,
    size: 8.5,
  });
}

/**
 * The answer key for one investigation, or for one cut of it.
 *
 * @param {Object} inv - Investigation definition, every depth laid in, in the
 *   document's language
 * @param {Object} [opts]
 * @param {string} [opts.version] - The stamp printed in the footer
 * @param {string} [opts.locale] - 'en' or 'es'
 * @param {string} [opts.depth] - A key for a student reading at this depth: only
 *   the steps at or above none deeper, numbered as that student sees them
 * @param {{title: string, steps: string[]}} [opts.activity] - A key cut to an
 *   activity's steps (sids), numbered as in the full key
 * @param {Object} [opts.source] - guideSource(inv, locale), by default
 * @param {Object} [opts.status] - How much of the document is in the language
 * @returns {Uint8Array} PDF bytes
 */
export function answerKeyDocument(
  inv,
  {
    version = '',
    locale = 'en',
    depth,
    activity,
    source = { expectations: {} },
    status,
  } = {}
) {
  const L = labelsFor(locale);
  const expectations = plainContent(source.expectations);
  const whole = answerKeyFor(inv);
  const key = depth ? answerKeyFor(inv, depth) : whole;
  const counts = questionCounts(depth ? lessonAt(inv, depth) : inv);
  const title = plainText(inv.title);
  // A lesson with deeper steps prints each depth's key: the core steps numbered
  // as every student sees them, and the steps a deeper reading adds marked by
  // the depth that adds them (DEPTH.md).
  const depths = depth
    ? []
    : [...new Set(key.entries.map(e => e.depth).filter(Boolean))];
  const cut = activity ? new Set(activity.steps) : null;
  const entries = cut ? key.entries.filter(e => cut.has(e.sid)) : key.entries;
  const nameOf = depth ? depthLabel(L, depth) : '';

  const doc = createDocument({
    title: activity
      ? L('key.docTitleActivity', { title, activity: activity.title })
      : depth
        ? L('key.docTitleDepth', { title, depth: nameOf })
        : L('key.docTitle', { title }),
    subject: L('key.subject', { title }),
    footer: `${
      activity
        ? L('key.footerActivity', { title, activity: activity.title })
        : depth
          ? L('key.footerDepth', { title, depth: nameOf })
          : L('key.footer', { title })
    }${version ? `  |  ${version}` : ''}`,
    lang: locale === 'es' ? 'es' : 'en-US',
  });

  const shallow = key.entries.filter(e => !e.depth).length;
  doc.titleBlock({
    kicker: L('key.kicker'),
    title,
    subtitle: `${L.count(depth ? key.entries.length : shallow, 'step')}${depths
      .map(
        d =>
          `, ${L('key.subtitle.depths', {
            n: key.entries.filter(e => e.depth === d).length,
            depth: depthLabel(L, d),
          })}`
      )
      .join('')}  |  ${plainText(inv.duration)}  |  ${L('key.subtitle.graded', {
      graded: L.count(counts.graded, 'graded'),
      pred: L.count(counts.predictions, 'prediction'),
    })}`,
  });

  doc.paragraph(L('key.intro1'), { size: 9, color: '0.35 0.35 0.42' });
  doc.paragraph(L('key.intro2'), { size: 9, color: '0.35 0.35 0.42' });
  if (depth)
    doc.paragraph(L('key.introDepth', { depth: nameOf }), {
      size: 9,
      color: '0.35 0.35 0.42',
    });
  if (activity)
    doc.paragraph(
      L('key.introActivity', {
        activity: activity.title,
        n: entries.length,
        total: shallow,
      }),
      { size: 9, color: '0.35 0.35 0.42' }
    );
  doc.rule({ gap: 8, shade: 0.85 });

  for (const e of entries) {
    // A reading step asks for nothing, so there is no answer to print. Some
    // put an instrument or a readout in front of the class, though, and what
    // they should see there is the expectation. Skipping every reading step
    // dropped those from the key, and the guide prints no expectations, so
    // they reached no document at all.
    const expected = expectations[e.sid];
    if (e.category === 'reading' && !expected) continue;

    const number =
      depth || !e.depth
        ? depth
          ? e.step
          : key.entries.filter(x => !x.depth && x.step <= e.step).length
        : 0;
    doc.heading(
      `${
        e.depth && !depth
          ? L('key.depthName', { depth: capital(depthLabel(L, e.depth)) })
          : L('key.step', { n: number })
      }: ${e.title}`,
      { size: 11, spaceBefore: 16, keepWith: 60 }
    );
    doc.paragraph(L(`key.cat.${e.category}`), {
      size: 8,
      gap: 5,
      color: '0.13 0.55 0.75',
    });

    if (e.prompt) doc.paragraph(e.prompt, { size: 10 });

    if (e.options) {
      doc.bullets(
        e.options.map(
          (opt, i) =>
            `${String.fromCharCode(65 + i)}. ${opt}${i === e.answerIndex ? `     ${L('key.correct')}` : ''}`
        ),
        { size: 9.5, gap: 1 }
      );
      doc.row(
        e.category === 'prediction'
          ? L('key.rowConclusion')
          : L('key.rowCorrect'),
        `${e.answerLabel}. ${e.answerText}`
      );
    }

    if (e.answerValue !== undefined) {
      doc.row(
        L('key.rowValue'),
        `${e.answerValue}${e.unit ? ` ${e.unit}` : ''}`
      );
      doc.row(
        L('key.rowRange'),
        `${L('key.rangeTo', { low: round(e.acceptedLow), high: round(e.acceptedHigh) })}${e.unit ? ` ${e.unit}` : ''}`
      );
    }

    if (e.rubric) {
      doc.paragraph(L('key.lookFor'), {
        size: 9,
        gap: 3,
        color: '0.35 0.35 0.42',
      });
      doc.paragraph(e.rubric, { size: 9.5 });
    }

    if (e.criteria?.length) {
      doc.paragraph(
        e.reflect ? L('key.rubricOnReflection') : `${L('key.rubric')}:`,
        { size: 9, gap: 3, color: '0.35 0.35 0.42' }
      );
      doc.table({
        columns: [L('key.rubric.criterion'), L('key.rubric.levels')],
        widths: [1.4, 4.2],
        rows: criteriaOf({ rubricCriteria: e.criteria }).map(c => [
          c.name,
          c.levels
            .map(
              l =>
                `${l.label}${
                  l.points === null
                    ? ''
                    : ` (${L(l.points === 1 ? 'key.rubric.points' : 'key.rubric.pointsMany', { points: l.points })})`
                }: ${l.text}`
            )
            .join('\n'),
        ]),
        size: 8.5,
      });
    }

    if (e.fields?.length) {
      doc.paragraph(L('key.fields'), {
        size: 9,
        gap: 4,
        color: '0.35 0.35 0.42',
      });
      doc.bullets(
        e.fields.map(
          f =>
            `${f.label}${f.unit ? ` (${f.unit})` : ''}${f.derived ? L('key.derived') : ''}`
        ),
        { size: 9, gap: 1 }
      );
      if (e.hasValidator) {
        doc.paragraph(L('key.validator'), {
          size: 8.5,
          color: '0.4 0.4 0.46',
        });
      }
    }

    if (e.checklist?.length) {
      doc.paragraph(L('key.checklist'), {
        size: 9,
        gap: 4,
        color: '0.35 0.35 0.42',
      });
      doc.bullets(e.checklist, { size: 9, gap: 1 });
    }

    if (expected) {
      doc.paragraph(L('key.expected'), {
        size: 9,
        gap: 3,
        color: '0.35 0.35 0.42',
      });
      doc.paragraph(expected, { size: 9.5 });
    }

    if (e.reflect) {
      doc.paragraph(L('key.reflection'), {
        size: 9,
        color: '0.35 0.35 0.42',
      });
    }

    if (e.help?.hints?.length) {
      doc.paragraph(L('key.hints'), {
        size: 9,
        gap: 3,
        color: '0.35 0.35 0.42',
      });
      doc.bullets(e.help.hints, { size: 9, gap: 1 });
    }

    if (e.feedback?.length) {
      doc.paragraph(L('key.feedback'), {
        size: 9,
        gap: 3,
        color: '0.35 0.35 0.42',
      });
      doc.bullets(
        e.feedback.map(f => `${L(`key.fb.${f.class}`)}: ${f.text}`),
        { size: 9, gap: 1 }
      );
    }

    if (e.mistakes?.length) {
      doc.paragraph(L('key.mistakes'), {
        size: 9,
        gap: 3,
        color: '0.35 0.35 0.42',
      });
      doc.bullets(
        e.mistakes.map(
          m =>
            `${m.option ? L('key.option', { letter: m.option }) : ''}${m.text}`
        ),
        { size: 9, gap: 1 }
      );
    }

    if (e.explanation) {
      doc.paragraph(L('key.why'), { size: 9, gap: 3, color: '0.35 0.35 0.42' });
      doc.paragraph(e.explanation, { size: 9.5 });
    }
  }

  statusBlock(doc, L, 'key', status);
  return doc.build();
}

const round = v =>
  Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(4)));
