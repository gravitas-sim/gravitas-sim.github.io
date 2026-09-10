// =============================================================================
// Classroom activity documents
// -----------------------------------------------------------------------------
// Two kinds, both derived rather than written twice:
//
//   the activity guide   one per activity, covering all three formats
//   a student worksheet  one per format that has students writing anything
//
// What is NOT here is a second answer key. js/instructorDocs.js already builds
// one from the lesson, question by question with tolerances, and an activity is
// a subset of that lesson: duplicating it would create two documents that
// disagree the first time a rubric is edited. The guide points at it instead.
//
// The worksheets are generated from the RESOLVED steps, so the order and the
// wording on paper are the order and the wording on screen - including the
// steps the resolver added, which a worksheet written by hand from the format
// definition would have missed.
// =============================================================================

import { createDocument } from './pdf.js';
import { plainText } from './answerKey.js';
import { instructorContentFor } from './data/instructorContent.js';
import { activityTeachingFor, RECOVERY } from './data/activityTeaching.js';
import { resolvedSteps } from './activities/activities.js';

/** Numbered section heading, matching the investigation guides. */
const section = (doc, n, title) =>
  doc.heading(`${n}. ${title}`, { size: 12.5, spaceBefore: 20, keepWith: 46 });

/** The English text of a message id, for a document that is always English. */
const say = (messages, id) => plainText(messages[id] || id);

/**
 * The instructor guide for one activity, covering every format.
 *
 * @param {Object} activity - From js/data/activities.js
 * @param {Object} lesson - The merged investigation it is cut from
 * @param {Object} messages - EN_TEACHING
 * @param {Object} [opts] - {version}
 * @returns {Uint8Array} PDF bytes
 */
export function activityGuide(
  activity,
  lesson,
  messages,
  { version = '' } = {}
) {
  const shared = instructorContentFor(activity.lesson);
  const title = say(messages, activity.titleId);

  const doc = createDocument({
    title: `${title}: Classroom Activity Guide`,
    footer: `Gravitas Classroom Activity  |  ${title}${version ? `  |  ${version}` : ''}`,
  });

  doc.titleBlock({
    kicker: 'Gravitas Classroom Activity | Instructor Guide',
    title,
    subtitle: say(messages, activity.questionId),
  });

  doc.table({
    columns: ['', ''],
    widths: [1, 2],
    rows: [
      ['Cut from', `${plainText(lesson.title)} (${lesson.steps.length} steps)`],
      ['Scenario', activity.scenario],
      ['Audience', say(messages, activity.audienceId)],
      [
        'Formats',
        activity.formats
          .map(
            f => `${say(messages, f.nameId)} (${say(messages, f.durationId)})`
          )
          .join('; '),
      ],
    ],
    size: 9,
  });

  doc.paragraph(
    'Every duration in this document is an estimate. They are reasoned from ' +
      'what each step asks a student to do and have not yet been timed with a ' +
      'class; treat them as a starting point and adjust from your own room.',
    { size: 9, color: '0.35 0.35 0.4' }
  );

  section(doc, 1, 'Learning objectives');
  doc.paragraph('Students who complete any format should be able to:', {
    gap: 6,
  });
  doc.bullets(activity.objectiveIds.map(id => say(messages, id)));

  section(doc, 2, 'Assumed beforehand');
  doc.paragraph(say(messages, activity.prerequisitesId));
  if (shared?.priorKnowledge?.length) {
    doc.paragraph(
      'The full investigation assumes a little more, and its guide lists it:',
      { size: 9.5, gap: 4 }
    );
    doc.bullets(shared.priorKnowledge, { size: 9.5, gap: 1 });
  }

  let n = 3;
  for (const format of activity.formats) {
    const teaching = activityTeachingFor(activity.id, format.id);
    const resolved = resolvedSteps(lesson, format);
    const byId = new Map(lesson.steps.map(s => [s.sid, s]));

    doc.pageBreak();
    section(doc, n++, `${say(messages, format.nameId)}`);
    doc.table({
      columns: ['', ''],
      widths: [1, 2.6],
      rows: [
        ['Estimated time', `${say(messages, format.durationId)} (estimate)`],
        ['For', say(messages, format.forId)],
        [
          'Steps',
          `${resolved.sids.length} of the lesson's ${lesson.steps.length}`,
        ],
        ['Open with', teaching?.launch || ''],
      ],
      size: 9,
    });

    doc.paragraph(say(messages, format.introId));

    if (teaching?.setup) {
      doc.heading('Before the class', {
        size: 10.5,
        spaceBefore: 10,
        keepWith: 34,
      });
      doc.paragraph(teaching.setup, { size: 9.5 });
    }

    if (teaching?.beats?.length) {
      doc.heading('What to ask, and when to stop', {
        size: 10.5,
        spaceBefore: 12,
        keepWith: 40,
      });
      doc.table({
        columns: ['At', 'What is on screen', 'Ask', 'Why'],
        widths: [0.6, 1.7, 2.2, 2.4],
        rows: teaching.beats.map(b => [b.at, b.what, b.ask, b.note]),
      });
    }

    doc.heading('The steps it runs', {
      size: 10.5,
      spaceBefore: 12,
      keepWith: 40,
    });
    doc.table({
      columns: ['#', 'Step', 'What it asks for'],
      widths: [0.4, 2.4, 4],
      rows: resolved.sids.map((sid, i) => {
        const step = byId.get(sid);
        const added = resolved.added.some(a => a.sid === sid);
        return [
          String(i + 1),
          plainText(step?.title || sid) + (added ? ' (required)' : ''),
          describeStep(step),
        ];
      }),
    });
    if (resolved.added.length) {
      doc.paragraph(
        'Steps marked (required) were not chosen for this format: they build ' +
          'the world a later step asks about, so they come with it. They are ' +
          'included in the estimate above.',
        { size: 9, color: '0.35 0.35 0.4' }
      );
    }

    if (teaching?.expected) {
      doc.heading('Expected reasoning', {
        size: 10.5,
        spaceBefore: 12,
        keepWith: 34,
      });
      doc.paragraph(teaching.expected, { size: 9.5 });
    }

    if (teaching?.rubric?.length) {
      doc.heading('A short rubric', {
        size: 10.5,
        spaceBefore: 12,
        keepWith: 40,
      });
      doc.table({
        columns: ['Band', 'What it looks like'],
        widths: [1, 4.6],
        rows: teaching.rubric.map(r => [r.band, r.looks]),
      });
    }

    doc.paragraph(`Closing: ${say(messages, format.closingId)}`, { size: 9.5 });
  }

  // Shared, not repeated per format: these are properties of the physics and
  // of the lesson, and three copies would be three things to keep in step.
  doc.pageBreak();
  if (shared?.misconceptions?.length) {
    section(doc, n++, 'Common misconceptions');
    doc.paragraph(
      'From the full investigation, and all of them are live in the shorter ' +
        'formats too.',
      { size: 9.5, gap: 6 }
    );
    doc.table({
      columns: ['Misconception', 'What helps'],
      widths: [2, 4],
      rows: shared.misconceptions.map(m => [
        m.wrong ?? m.heading ?? '',
        m.right ?? m.body ?? m.text ?? '',
      ]),
    });
  }

  section(doc, n++, 'If something goes wrong');
  doc.table({
    columns: ['Problem', 'What to do'],
    widths: [2, 4],
    rows: RECOVERY.map(r => [r.problem, r.fix]),
  });

  section(doc, n++, 'Answers');
  doc.paragraph(
    `Every question in these formats is a question of ${plainText(lesson.title)}, ` +
      'and its answer key covers all of them with tolerances and worked ' +
      'reasoning. There is no separate key for the activities, deliberately: a ' +
      'second copy would be a second thing to keep correct.'
  );
  if (shared?.modelNotes) {
    doc.heading('What the model does and does not do', {
      size: 10.5,
      spaceBefore: 12,
      keepWith: 34,
    });
    doc.paragraph(shared.modelNotes, { size: 9.5 });
  }

  return doc.build();
}

/** One line saying what a step asks a student to do. */
function describeStep(step) {
  if (!step) return '';
  switch (step.type) {
    case 'read':
      return 'Reading, and the world it sets up';
    case 'predict':
      return 'A prediction, multiple choice';
    case 'question':
      return step.kind === 'short' ? 'A written answer' : 'A question';
    case 'measure':
      return step.pauseAt
        ? `Measurement, with the event tool armed for ${step.pauseAt.kind}`
        : `Measurement: ${(step.fields || []).length} values`;
    case 'explore':
      return 'Free observation, with a live readout';
    case 'wedges':
      return 'The swept-area overlay';
    case 'ellipse':
      return 'The eccentricity slider';
    default:
      return step.type || '';
  }
}

/**
 * A printable worksheet for one format.
 *
 * Generated from the resolved steps so the order and the wording match the
 * screen. Fields a student fills in on paper are the same fields the step
 * captures, which is what lets a class work on paper and a class work in the
 * notebook produce comparable work.
 *
 * @param {Object} activity - From js/data/activities.js
 * @param {Object} format - One of its formats
 * @param {Object} lesson - The merged investigation
 * @param {Object} messages - EN_TEACHING
 * @param {Object} [opts] - {version}
 * @returns {Uint8Array} PDF bytes
 */
export function activityWorksheet(
  activity,
  format,
  lesson,
  messages,
  { version = '' } = {}
) {
  const title = say(messages, activity.titleId);
  const formatName = say(messages, format.nameId);
  const resolved = resolvedSteps(lesson, format);
  const byId = new Map(lesson.steps.map(s => [s.sid, s]));

  const doc = createDocument({
    title: `${title}: ${formatName} worksheet`,
    footer: `Gravitas  |  ${title} - ${formatName}${version ? `  |  ${version}` : ''}`,
  });

  doc.titleBlock({
    kicker: `Gravitas Classroom Activity | ${formatName}`,
    title,
    subtitle: say(messages, activity.questionId),
  });

  doc.row('Name', '');
  doc.row('Date', '');
  doc.row('Open', activityTeachingFor(activity.id, format.id)?.launch || '');
  doc.rule();

  doc.paragraph(say(messages, format.introId), { size: 9.5 });

  let number = 0;
  for (const sid of resolved.sids) {
    const step = byId.get(sid);
    if (!step) continue;
    // A worksheet is for what a student writes. Steps that only set the scene
    // are named in one line so the paper and the screen stay in step, and are
    // not given an answer box they do not need.
    const writes =
      step.type === 'predict' ||
      step.type === 'question' ||
      step.type === 'measure';

    number += 1;
    doc.heading(`${number}. ${plainText(step.title || sid)}`, {
      size: 11,
      spaceBefore: 14,
      keepWith: 60,
    });

    if (!writes) {
      doc.paragraph(describeStep(step), {
        size: 9,
        color: '0.35 0.35 0.4',
      });
      continue;
    }

    if (step.prompt) doc.paragraph(plainText(step.prompt), { size: 9.5 });

    if (step.type === 'predict' && Array.isArray(step.options)) {
      doc.bullets(
        step.options.map(o => `(  )  ${plainText(o)}`),
        { size: 9.5, gap: 2 }
      );
      doc.field('Why do you think so?', '');
      doc.field('', '');
    } else if (step.type === 'measure') {
      doc.table({
        columns: ['Quantity', 'Value', 'Unit'],
        widths: [3, 1.6, 0.9],
        rows: (step.fields || []).map(f => [
          plainText(f.label),
          '',
          f.unit || '',
        ]),
      });
    } else {
      for (let i = 0; i < 3; i++) doc.field('', '');
    }
  }

  doc.heading('Before you finish', { size: 11, spaceBefore: 16, keepWith: 50 });
  doc.paragraph(say(messages, format.closingId), { size: 9.5 });
  for (let i = 0; i < 3; i++) doc.field('', '');

  return doc.build();
}
