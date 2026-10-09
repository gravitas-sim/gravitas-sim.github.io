// =============================================================================
// Instructor documents
// -----------------------------------------------------------------------------
// Turns structured lesson data into printable PDFs. No DOM, no browser: this
// runs in Node at build time, from tools/build-instructor-materials.js.
//
// The split that keeps these documents honest:
//
//   answerKey.js   derives every question, answer and tolerance from the
//                  lessons themselves, and proves each one against the site's
//                  own grading function
//   instructorContent.js  holds only the prose a person has to write
//   this file      lays the two out
//
// Nothing is typed twice, so editing a lesson updates its guide and its key.
//
// Print design: black on white with one accent rule. These are documents a
// department prints thirty copies of, and a dark Gravitas-styled page would be
// a page of toner.
// =============================================================================

import { createDocument } from './pdf.js';
import { answerKeyFor, questionCounts, plainText } from './answerKey.js';
import { plural } from './format.js';
import { instructorContentFor } from './data/instructorContent.js';
import { labelsFor } from './data/instructorLabels.js';
import { guideSource } from './instructorSource.js';
import { lessonAt } from './investigations/depthPure.js';

const SITE = 'https://gravitas-sim.online';
const ACCESSIBILITY_URL =
  'https://github.com/gravitas-sim/gravitas-sim.github.io/blob/main/ACCESSIBILITY.md';

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
const plainProse = text =>
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
const plainContent = value => {
  if (typeof value === 'string') return plainProse(value);
  if (Array.isArray(value)) return value.map(plainContent);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, plainContent(v)])
    );
  }
  return value;
};

/** Numbered section heading, so a guide's sections can be referred to aloud. */
const section = (doc, n, title) =>
  doc.heading(`${n}. ${title}`, { size: 12.5, spaceBefore: 20, keepWith: 46 });

/** The depth names a key prints, from the label table. */
const depthLabel = (L, d) => L(`key.depth.${d}`);
const capital = s => `${s[0].toUpperCase()}${s.slice(1)}`;

/** A translation-status block: what is in the language and what is not. */
function statusBlock(doc, L, kind, status) {
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
 * The instructor guide for one investigation.
 * @param {Object} inv - Investigation definition, in the document's language
 * @param {Object} [opts]
 * @param {string} [opts.version] - The stamp printed in the footer
 * @param {string} [opts.locale] - 'en' or 'es'
 * @param {Object} [opts.source] - guideSource(inv, locale), by default
 * @param {Object} [opts.facts] - lessonFacts(): textbook, level, mathematics,
 *   prerequisite titles and the investigation's version
 * @param {Object} [opts.status] - How much of the document is in the language
 * @returns {Uint8Array} PDF bytes
 */
export function instructorGuide(
  inv,
  { version = '', locale = 'en', source, facts = {}, status } = {}
) {
  const L = labelsFor(locale);
  const src = source ?? guideSource(inv, locale);
  const c = plainContent(src.content);
  if (!c) throw new Error(`No instructor content for ${inv.id}`);
  const key = answerKeyFor(inv);
  const counts = questionCounts(inv);
  const title = plainText(inv.title);

  const doc = createDocument({
    title: L('guide.docTitle', { title }),
    subject: L('guide.subject', { title }),
    footer: `${L('guide.footer', { title })}${version ? `  |  ${version}` : ''}`,
    lang: locale === 'es' ? 'es' : 'en-US',
  });

  doc.titleBlock({
    kicker: L('guide.kicker'),
    title,
    subtitle: plainText(inv.subtitle),
  });

  const rows = [
    [L('guide.row.time'), plainText(inv.duration)],
    [L('guide.row.level'), plainText(inv.level)],
    [L('guide.row.topic'), c.topic],
    [L('guide.row.difficulty'), c.difficulty],
    [L('guide.row.length'), L.count(inv.steps.length, 'step')],
    [
      L('guide.row.input'),
      `${L.count(counts.graded, 'graded')}, ` +
        `${L.count(counts.predictions, 'prediction')}, ` +
        `${L.count(counts.measurements, 'measurement')}, ` +
        `${L.count(counts.written, 'written')}`,
    ],
    [L('guide.row.placement'), c.placement],
  ];
  if (facts.courseLevel)
    rows.push([
      L('guide.row.courseLevel'),
      L(`fact.courseLevel.${facts.courseLevel}`),
    ]);
  if (facts.textbook)
    rows.push([
      L('guide.row.textbook'),
      facts.textbook.section
        ? L('guide.textbook', facts.textbook)
        : L('guide.textbookChapter', facts.textbook),
    ]);
  if (facts.mathematics)
    rows.push([
      L('guide.row.mathematics'),
      L(`fact.math.${facts.mathematics}`),
    ]);
  if (facts.prerequisites)
    rows.push([
      L('guide.row.prerequisites'),
      facts.prerequisites.length
        ? facts.prerequisites.join('; ')
        : L('guide.none'),
    ]);
  if (facts.depths?.length > 1)
    rows.push([
      L('guide.row.depths'),
      L('guide.depthsValue', {
        depths: facts.depths.map(d => depthLabel(L, d)).join(', '),
      }),
    ]);
  if (facts.version) rows.push([L('guide.row.version'), facts.version]);
  doc.table({ columns: ['', ''], widths: [1, 2], rows, size: 9 });

  section(doc, 1, L('guide.s.overview'));
  doc.paragraph(c.overview);

  section(doc, 2, L('guide.s.objectives'));
  doc.paragraph(L('guide.objectivesIntro'), { gap: 6 });
  doc.bullets(key.objectives);

  section(doc, 3, L('guide.s.prior'));
  doc.bullets(c.priorKnowledge);

  section(doc, 4, L('guide.s.concepts'));
  for (const k of c.keyConcepts) {
    doc.heading(k.heading, { size: 10.5, spaceBefore: 8, keepWith: 34 });
    doc.paragraph(k.body, { size: 9.5 });
  }

  section(doc, 5, L('guide.s.flow'));
  doc.table({
    columns: [L('guide.flow.steps'), L('guide.flow.what')],
    widths: [1, 5.4],
    // Printed from the sids the block names, so the numbers follow the lesson.
    rows: src.flow.map(f => [f.steps, plainProse(f.text)]),
  });

  // Generated from the lesson rather than written per lesson, because it is a
  // fact about the step data and a hand-written copy would go stale the first
  // time a prediction moved. Instructors need it: a student who picks an
  // option and is told nothing has not hit a bug.
  const held = inv.steps
    .map((s, i) => ({ s, n: i + 1 }))
    .filter(({ s }) => s.reveal);
  if (held.length) {
    doc.paragraph(L('guide.held.note'), {
      size: 9.5,
      gap: 6,
      color: '0.35 0.35 0.42',
    });
    doc.table({
      columns: [L('guide.held.prediction'), L('guide.held.markedAt')],
      widths: [1, 1],
      rows: held.map(({ s, n }) => {
        const at = inv.steps.findIndex(x => x.sid === s.reveal);
        return [
          L('guide.held.step', { n, title: plainText(s.title) }),
          at < 0
            ? '—'
            : L('guide.held.step', {
                n: at + 1,
                title: plainText(inv.steps[at].title),
              }),
        ];
      }),
      size: 9,
    });
  }

  section(doc, 6, L('guide.s.features'));
  doc.table({
    columns: [L('guide.features.feature'), L('guide.features.notes')],
    widths: [1.5, 4.2],
    rows: c.features.map(f => [f.name, f.text]),
  });

  section(doc, 7, L('guide.s.misconceptions'));
  doc.table({
    columns: [L('guide.misc.think'), L('guide.misc.address')],
    widths: [1.8, 3.4],
    rows: c.misconceptions.map(m => [m.claim, m.response]),
  });

  section(doc, 8, L('guide.s.scoring'));
  doc.paragraph(L('guide.scoring.intro'), {
    size: 9.5,
    gap: 6,
    color: '0.35 0.35 0.42',
  });
  doc.table({
    columns: [
      L('guide.scoring.kind'),
      L('guide.scoring.count'),
      L('guide.scoring.who'),
    ],
    widths: [1.3, 0.7, 3.6],
    rows: scoringRows(key, L),
    size: 9,
  });

  section(doc, 9, L('guide.s.accessibility'));
  const tools = inv.steps.filter(s => s.tool).length;
  doc.bullets(
    [
      tools
        ? L('guide.access.instruments', { n: tools })
        : L('guide.access.noInstruments'),
      L('guide.access.simulation'),
      L('guide.access.report'),
    ],
    { size: 9.5 }
  );
  doc.paragraph(L('guide.access.statement'), { size: 9.5, gap: 3 });
  doc.link(L('guide.access.link'), ACCESSIBILITY_URL);

  section(doc, 10, L('guide.s.notes'));
  doc.bullets(c.teachingNotes);

  section(doc, 11, L('guide.s.discussion'));
  doc.paragraph(L('guide.discussion.hint'), {
    size: 9.5,
    gap: 6,
    color: '0.35 0.35 0.42',
  });
  doc.bullets(c.discussion);

  section(doc, 12, L('guide.s.extensions'));
  doc.paragraph(L('guide.extensions.hint'), {
    size: 9.5,
    gap: 6,
    color: '0.35 0.35 0.42',
  });
  doc.bullets(c.extensions);

  section(doc, 13, L('guide.s.model'));
  doc.paragraph(c.modelNotes);
  doc.link(L('guide.modelLink'), `${SITE}/model/`);

  doc.space(14);
  doc.rule({ gap: 6, shade: 0.85 });
  doc.paragraph(L('guide.closing'), { size: 8.5, color: '0.4 0.4 0.46' });
  statusBlock(doc, L, 'guide', status);

  return doc.build();
}

/** The rows of "what is scored automatically", counted from the key. */
function scoringRows(key, L) {
  const n = pick => key.entries.filter(pick).length;
  const choice = n(e => e.category === 'graded' && e.options);
  const numeric = n(
    e => e.category === 'graded' && e.answerValue !== undefined
  );
  const prediction = n(e => e.category === 'prediction');
  const measurement = n(e => e.category === 'measurement');
  const written = n(e => e.category === 'written' && !e.reflect);
  const reflect = n(e => e.reflect);
  return [
    [L('guide.scoring.choice'), String(choice), L('guide.scoring.site')],
    [L('guide.scoring.numeric'), String(numeric), L('guide.scoring.site')],
    [
      L('guide.scoring.prediction'),
      String(prediction),
      L('guide.scoring.recorded'),
    ],
    [
      L('guide.scoring.measurement'),
      String(measurement),
      L('guide.scoring.checked'),
    ],
    [L('guide.scoring.written'), String(written), L('guide.scoring.person')],
    [
      L('guide.scoring.reflect'),
      String(reflect),
      L('guide.scoring.reflection'),
    ],
  ].filter(r => r[1] !== '0');
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
  { version = '', locale = 'en', depth, activity, source, status } = {}
) {
  const L = labelsFor(locale);
  const expectations = plainContent(
    (source ?? guideSource(inv, locale)).expectations
  );
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
        rows: e.criteria.map(c => [
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

/**
 * The adopter's guide: one document covering the whole library.
 * @param {Array} investigations - Every implemented investigation
 * @param {Object} [opts] - {version}
 * @returns {Uint8Array} PDF bytes
 */
export function adoptersGuide(investigations, { version = '' } = {}) {
  const doc = createDocument({
    title: 'Teaching with Gravitas: Instructor Adopter’s Guide',
    subject:
      'How to adopt Gravitas in an introductory astronomy course: what it is, who it is for, how to assign it, and what is graded automatically.',
    footer: `Gravitas Adopter's Guide${version ? `  |  ${version}` : ''}`,
  });

  doc.titleBlock({
    kicker: 'Gravitas | Instructor Adopter\u2019s Guide',
    title: 'Teaching with Gravitas',
    subtitle:
      'What Gravitas is, how the investigations work, and how to assign them in an introductory astronomy course.',
  });

  doc.heading('What Gravitas is', { size: 12.5, keepWith: 46 });
  doc.paragraph(
    'Gravitas is a browser-based gravitational sandbox with a library of guided investigations ' +
      'built on top of it. Students place and watch objects, run scenarios drawn from real systems, ' +
      'and measure what they see. It runs entirely in a web browser with nothing to install and no ' +
      'account to create.'
  );
  doc.paragraph(
    'An investigation is a guided investigation that runs in a panel beside the live simulation. Students ' +
      'read a short screen, commit to a prediction, run an experiment, measure something, and answer ' +
      'a question that is checked immediately. At the end they can download a lab report containing ' +
      'their own answers, which is what an instructor collects.'
  );

  doc.heading('Who it is for', { size: 12.5, keepWith: 46 });
  doc.paragraph(
    'Undergraduate introductory astronomy, and particularly general-education courses for ' +
      'non-science majors. No calculus is required anywhere in the library, and the two most recent ' +
      'investigations are written specifically for students who are uncomfortable with algebra. ' +
      'The material also works for advanced high school astronomy and for physics students as a ' +
      'qualitative complement to a quantitative course.'
  );

  doc.heading('The investigation library', { size: 12.5, keepWith: 60 });
  doc.table({
    columns: ['Investigation', 'Topic', 'Time', 'Steps'],
    widths: [2.6, 1.9, 1.1, 0.7],
    rows: investigations.map(inv => [
      plainText(inv.title),
      plainProse(instructorContentFor(inv.id)?.topic),
      plainText(inv.duration),
      String(inv.steps.length),
    ]),
  });
  doc.paragraph(
    'A fuller version of this table, with prerequisites and objectives, is in the Curriculum Map.',
    { size: 9, color: '0.4 0.4 0.46' }
  );

  doc.heading('How to use it in a course', { size: 12.5, keepWith: 46 });
  doc.table({
    columns: ['Mode', 'How it works'],
    widths: [1.4, 4.4],
    rows: [
      [
        'Homework',
        'Assign one investigation before the matching lecture. Students submit the generated lab report.',
      ],
      [
        'Computer lab',
        'One investigation fills a typical lab period. The longer ones split cleanly in two.',
      ],
      [
        'In-class activity',
        'Project the simulation and work through the prediction steps as a class, then let students finish individually.',
      ],
      [
        'Small groups',
        'Two or three students per machine works well: the prediction steps generate real argument.',
      ],
      [
        'Lecture demonstration',
        'Any scenario can be opened directly and driven from the front without starting an investigation.',
      ],
      [
        'Pre-lab',
        'Assign the first half as preparation for a hands-on or observational lab.',
      ],
    ],
  });

  doc.heading('Assigning and collecting work', { size: 12.5, keepWith: 46 });
  doc.paragraph(
    'Progress is saved in the student’s own browser, so an investigation can be started, left, and ' +
      'resumed. When a student finishes, they enter their name and download a PDF lab report listing ' +
      'every question, their answer, and whether the automatically checked ones matched. The report ' +
      'also carries links that reopen the exact simulation state each step used, and a submission ' +
      'token, which the finish dialog also offers to copy or save for a learning management system ' +
      'that takes text rather than a file.'
  );
  doc.paragraph(
    'To read the class’s work back, drop the reports, progress files or pasted tokens on the ' +
      'submission review page. It needs no passphrase and returns one table of how often each question ' +
      'was answered wrongly, hardest first, which can be downloaded as a spreadsheet. It keeps nothing ' +
      'and sends nothing: close the tab and it is gone.'
  );
  doc.link('Submission review', `${SITE}/instructors/submissions/`);
  doc.bullets([
    'Progress lives in the browser. A student who switches machines can download a progress file on one and restore it on the other; without one they start again. Say so when assigning.',
    'The report is the deliverable. The review page reads it but is not a gradebook: there is no roster and no account system, and it checks answers, not identity.',
    'Multiple-choice and numeric answers are checked automatically. Written answers, predictions and measurements are not, and are where an instructor’s attention is best spent.',
    'A useful assignment pattern: "complete the investigation and submit the report, then answer these two discussion questions in a paragraph each."',
  ]);

  doc.heading('What is assessed automatically', { size: 12.5, keepWith: 46 });
  doc.table({
    columns: ['Screen type', 'Checked by the site?', 'Notes'],
    widths: [1.3, 1.3, 3.2],
    rows: [
      [
        'Multiple choice',
        'Yes',
        'Marked immediately, with an explanation shown once answered. A student can change the answer, and the report says how many tries it took.',
      ],
      [
        'Numeric',
        'Yes',
        'Marked against a stated tolerance. A unit typed with the answer is read: an equivalent one is converted, and one of the wrong kind is reported rather than marked wrong.',
      ],
      [
        'Prediction',
        'Recorded only',
        'Never marked wrong. The point is the commitment before experimenting.',
      ],
      [
        'Measurement',
        'Sanity-checked',
        'Values are checked for consistency and the student is told what does not hang together, but there is no single right number.',
      ],
      [
        'Written answer',
        'No',
        'Collected in the report for the instructor to read. Rubrics are in each answer key.',
      ],
      ['Explore / read', 'No', 'Checklists are for the student’s own use.'],
    ],
  });

  doc.heading('Technical requirements', { size: 12.5, keepWith: 46 });
  doc.bullets([
    'A current version of Chrome, Firefox, Safari or Edge. No plugins, no installation, no account.',
    'An internet connection to load the site. Once loaded, an investigation runs locally.',
    'A laptop or desktop is strongly recommended. The investigations work on a tablet and are usable on a phone, but the instrument panels share the screen with the investigation text on small displays.',
    'A screen of at least 1000 pixels wide gives the intended side-by-side layout of investigation and instrument.',
    'Sound is optional and off by default.',
    'Downloading the lab report requires the browser to be allowed to save files.',
  ]);

  doc.heading('Accessibility', { size: 12.5, keepWith: 46 });
  doc.bullets([
    'Keyboard shortcuts cover the main controls; a full list is available from the Shortcuts button and with the ? key.',
    'Four visual themes, including a light theme for bright rooms and projectors, and a red-chrome theme that preserves night vision in an observatory.',
    'A physical/simulation units toggle, so quantities can be read in AU, solar masses, km/s and years.',
    'Simulation speed is adjustable, and the timeline can be paused and scrubbed backward, which matters for students who need longer to read a changing value.',
    'The generated lab report is real text, not an image, so it can be read by a screen reader.',
    'The simulation is a canvas animation. Students who are sensitive to motion can pause it at any point without losing progress.',
  ]);

  doc.heading('What the model does and does not do', {
    size: 12.5,
    keepWith: 46,
  });
  doc.paragraph(
    'Gravitas simulates Newtonian gravity between point masses in two dimensions, integrated ' +
      'numerically. Collisions merge objects. A number of features are analytic models evaluated for ' +
      'display rather than dynamical simulations, and a few are illustrative visuals. All of this is ' +
      'documented publicly and in detail, with a per-investigation note about which parts each investigation ' +
      'relies on.'
  );
  doc.link('How Gravitas Models the Universe', `${SITE}/model/`);

  doc.heading('Project links', { size: 12.5, keepWith: 40 });
  doc.link('Gravitas', SITE);
  doc.link('Instructor resources', `${SITE}/instructors/`);
  doc.link(
    'Source code and issue tracker',
    'https://github.com/gravitas-sim/gravitas-sim.github.io'
  );

  return doc.build();
}

/**
 * The curriculum map: every investigation, side by side.
 * @param {Array} investigations - Every implemented investigation
 * @param {Object} [opts] - {version}
 * @returns {Uint8Array} PDF bytes
 */
export function curriculumMap(investigations, { version = '' } = {}) {
  const doc = createDocument({
    title: 'Gravitas Investigation Curriculum Map',
    subject:
      'Every Gravitas investigation side by side: topic, timing, difficulty, prerequisites and objectives.',
    footer: `Gravitas Curriculum Map${version ? `  |  ${version}` : ''}`,
  });

  doc.titleBlock({
    kicker: 'Gravitas | Curriculum Map',
    title: 'Investigation Curriculum Map',
    subtitle:
      'Every implemented investigation, with the topic it covers, where it fits in a course, and what students should already know.',
  });

  doc.table({
    columns: ['Investigation', 'Topic', 'Time', 'Steps', 'Difficulty'],
    widths: [2.4, 1.7, 0.95, 0.6, 1.5],
    rows: investigations.map(inv => {
      const c = plainContent(instructorContentFor(inv.id));
      return [
        plainText(inv.title),
        c.topic,
        plainText(inv.duration),
        String(inv.steps.length),
        c.difficulty,
      ];
    }),
    size: 8.5,
  });

  for (const inv of investigations) {
    const c = plainContent(instructorContentFor(inv.id));
    const key = answerKeyFor(inv);
    doc.heading(plainText(inv.title), {
      size: 12,
      spaceBefore: 20,
      keepWith: 90,
    });
    doc.paragraph(plainText(inv.subtitle), {
      size: 9.5,
      gap: 8,
      color: '0.35 0.35 0.42',
    });
    doc.row('Topic', c.topic);
    doc.row('Time', plainText(inv.duration));
    doc.row('Length', plural(inv.steps.length, 'step'));
    doc.row('Difficulty', c.difficulty);
    doc.space(6);
    doc.paragraph('Recommended course point', {
      size: 9,
      gap: 3,
      color: '0.35 0.35 0.42',
    });
    doc.paragraph(c.placement, { size: 9.5 });
    doc.paragraph('Prerequisite concepts', {
      size: 9,
      gap: 3,
      color: '0.35 0.35 0.42',
    });
    doc.bullets(c.priorKnowledge, { size: 9.5, gap: 1 });
    doc.paragraph('Learning objectives', {
      size: 9,
      gap: 3,
      color: '0.35 0.35 0.42',
    });
    doc.bullets(key.objectives, { size: 9.5, gap: 1 });
  }

  return doc.build();
}
