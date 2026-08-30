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
import { instructorContentFor } from './data/instructorContent.js';

const SITE = 'https://gravitas-sim.online';

/** Numbered section heading, so a guide's sections can be referred to aloud. */
const section = (doc, n, title) =>
  doc.heading(`${n}. ${title}`, { size: 12.5, spaceBefore: 20, keepWith: 46 });

/**
 * The instructor guide for one investigation.
 * @param {Object} inv - Investigation definition
 * @param {Object} [opts] - {version}
 * @returns {Uint8Array} PDF bytes
 */
export function instructorGuide(inv, { version = '' } = {}) {
  const c = instructorContentFor(inv.id);
  if (!c) throw new Error(`No instructor content for ${inv.id}`);
  const key = answerKeyFor(inv);
  const counts = questionCounts(inv);

  const doc = createDocument({
    title: `${inv.title}: Instructor Guide`,
    footer: `Gravitas Instructor Guide  |  ${plainText(inv.title)}${version ? `  |  ${version}` : ''}`,
  });

  doc.titleBlock({
    kicker: 'Gravitas Investigation | Instructor Guide',
    title: plainText(inv.title),
    subtitle: plainText(inv.subtitle),
  });

  doc.table({
    columns: ['', ''],
    widths: [1, 2],
    rows: [
      ['Estimated time', inv.duration],
      ['Student level', inv.level],
      ['Primary topic', c.topic],
      ['Difficulty', c.difficulty],
      ['Length', `${inv.steps.length} steps`],
      [
        'Student input',
        `${counts.graded} graded questions, ${counts.predictions} predictions, ` +
          `${counts.measurements} measurement screens, ${counts.written} written answers`,
      ],
      ['Recommended placement', c.placement],
    ],
    size: 9,
  });

  section(doc, 1, 'Overview');
  doc.paragraph(c.overview);

  section(doc, 2, 'Learning objectives');
  doc.paragraph(
    'After completing this investigation, students should be able to:',
    {
      gap: 6,
    }
  );
  doc.bullets(key.objectives);

  section(doc, 3, 'Prior knowledge');
  doc.bullets(c.priorKnowledge);

  section(doc, 4, 'Key concepts');
  for (const k of c.keyConcepts) {
    doc.heading(k.heading, { size: 10.5, spaceBefore: 8, keepWith: 34 });
    doc.paragraph(k.body, { size: 9.5 });
  }

  section(doc, 5, 'Investigation flow');
  doc.table({
    columns: ['Steps', 'What students do'],
    widths: [1, 5.4],
    rows: c.flow.map(f => [f.steps, f.text]),
  });

  section(doc, 6, 'Interactive features');
  doc.table({
    columns: ['Feature', 'Notes'],
    widths: [1.5, 4.2],
    rows: c.features.map(f => [f.name, f.text]),
  });

  section(doc, 7, 'Common misconceptions');
  doc.table({
    columns: ['Students often think', 'How to address it'],
    widths: [1.8, 3.4],
    rows: c.misconceptions.map(m => [m.claim, m.response]),
  });

  section(doc, 8, 'Teaching notes');
  doc.bullets(c.teachingNotes);

  section(doc, 9, 'Discussion questions');
  doc.paragraph(
    'Optional. Suitable before the investigation, during class, or as a wrap-up.',
    { size: 9.5, gap: 6, color: '0.35 0.35 0.42' }
  );
  doc.bullets(c.discussion);

  section(doc, 10, 'Optional extensions');
  doc.paragraph(
    'For interested or advanced students. None of these is a prerequisite for the investigation itself.',
    { size: 9.5, gap: 6, color: '0.35 0.35 0.42' }
  );
  doc.bullets(c.extensions);

  section(doc, 11, 'Model notes');
  doc.paragraph(c.modelNotes);
  doc.link('How Gravitas Models the Universe', `${SITE}/model/`);

  doc.space(14);
  doc.rule({ gap: 6, shade: 0.85 });
  doc.paragraph(
    `The answer key for this investigation is a separate document. ` +
      `Every answer in it is generated from the lesson itself and checked against ` +
      `the same grading rule the website applies.`,
    { size: 8.5, color: '0.4 0.4 0.46' }
  );

  return doc.build();
}

/** How an entry is introduced in the key. */
const CATEGORY_LABEL = {
  graded: 'Question',
  prediction: 'Prediction',
  measurement: 'Measurement',
  activity: 'Activity',
  written: 'Written answer',
};

/**
 * The answer key for one investigation.
 * @param {Object} inv - Investigation definition
 * @param {Object} [opts] - {version}
 * @returns {Uint8Array} PDF bytes
 */
export function answerKeyDocument(inv, { version = '' } = {}) {
  const c = instructorContentFor(inv.id);
  const key = answerKeyFor(inv);
  const counts = questionCounts(inv);

  const doc = createDocument({
    title: `${inv.title}: Answer Key`,
    footer: `Gravitas Answer Key  |  ${plainText(inv.title)}  |  Instructor copy${version ? `  |  ${version}` : ''}`,
  });

  doc.titleBlock({
    kicker: 'Gravitas Investigation | Answer Key',
    title: plainText(inv.title),
    subtitle: `${inv.steps.length} steps  |  ${inv.duration}  |  ${counts.graded} graded questions, ${counts.predictions} predictions`,
  });

  doc.paragraph(
    'Instructor copy. Every answer below is generated from the live lesson definition and ' +
      'verified against the same rule the website uses to mark it, so this key and the site ' +
      'cannot disagree. Steps that only ask students to read or watch are omitted.',
    { size: 9, color: '0.35 0.35 0.42' }
  );
  doc.paragraph(
    'Predictions are recorded but never marked wrong: their purpose is to make students ' +
      'commit before they experiment. The answer given is the conclusion they should reach ' +
      'afterwards.',
    { size: 9, color: '0.35 0.35 0.42' }
  );
  doc.rule({ gap: 8, shade: 0.85 });

  for (const e of key.entries) {
    if (e.category === 'reading') continue;

    doc.heading(`Step ${e.step}: ${e.title}`, {
      size: 11,
      spaceBefore: 16,
      keepWith: 60,
    });
    doc.paragraph(CATEGORY_LABEL[e.category] ?? e.category, {
      size: 8,
      gap: 5,
      color: '0.13 0.55 0.75',
    });

    if (e.prompt) doc.paragraph(e.prompt, { size: 10 });

    if (e.options) {
      doc.bullets(
        e.options.map(
          (opt, i) =>
            `${String.fromCharCode(65 + i)}. ${opt}${i === e.answerIndex ? '     (correct answer)' : ''}`
        ),
        { size: 9.5, gap: 1 }
      );
      doc.row(
        e.category === 'prediction'
          ? 'Conclusion after experimenting'
          : 'Correct answer',
        `${e.answerLabel}. ${e.answerText}`
      );
    }

    if (e.answerValue !== undefined) {
      doc.row(
        'Expected value',
        `${e.answerValue}${e.unit ? ` ${e.unit}` : ''}`
      );
      doc.row(
        'Accepted range',
        `${round(e.acceptedLow)} to ${round(e.acceptedHigh)}${e.unit ? ` ${e.unit}` : ''}`
      );
    }

    if (e.rubric) {
      doc.paragraph('What to look for:', {
        size: 9,
        gap: 3,
        color: '0.35 0.35 0.42',
      });
      doc.paragraph(e.rubric, { size: 9.5 });
    }

    if (e.fields?.length) {
      doc.paragraph('Fields on this screen:', {
        size: 9,
        gap: 4,
        color: '0.35 0.35 0.42',
      });
      doc.bullets(
        e.fields.map(
          f =>
            `${f.label}${f.unit ? ` (${f.unit})` : ''}${f.derived ? ' (worked out for the student)' : ''}`
        ),
        { size: 9, gap: 1 }
      );
      if (e.hasValidator) {
        doc.paragraph(
          'This screen checks the entered values as they are typed and explains what is wrong ' +
            'when they do not hang together.',
          { size: 8.5, color: '0.4 0.4 0.46' }
        );
      }
    }

    if (e.checklist?.length) {
      doc.paragraph('Students are asked to:', {
        size: 9,
        gap: 4,
        color: '0.35 0.35 0.42',
      });
      doc.bullets(e.checklist, { size: 9, gap: 1 });
    }

    const expected = c?.expectations?.[e.step];
    if (expected) {
      doc.paragraph('Expected observation:', {
        size: 9,
        gap: 3,
        color: '0.35 0.35 0.42',
      });
      doc.paragraph(expected, { size: 9.5 });
    }

    if (e.explanation) {
      doc.paragraph('Why:', { size: 9, gap: 3, color: '0.35 0.35 0.42' });
      doc.paragraph(e.explanation, { size: 9.5 });
    }
  }

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
    'An investigation is a guided lesson that runs in a panel beside the live simulation. Students ' +
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
      instructorContentFor(inv.id)?.topic ?? '',
      inv.duration,
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
      'also carries links that reopen the exact simulation state each step used.'
  );
  doc.bullets([
    'Because progress lives in the browser, a student who switches machines starts again. Say so when assigning.',
    'The report is the deliverable. There is no instructor-side gradebook and no account system.',
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
        'Marked immediately, with an explanation shown once answered.',
      ],
      [
        'Numeric',
        'Yes',
        'Marked against a stated tolerance. Units in the typed answer are ignored.',
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
    'A laptop or desktop is strongly recommended. The lessons work on a tablet and are usable on a phone, but the instrument panels share the screen with the lesson text on small displays.',
    'A screen of at least 1000 pixels wide gives the intended side-by-side layout of lesson and instrument.',
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
      'documented publicly and in detail, with a per-investigation note about which parts each lesson ' +
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
      const c = instructorContentFor(inv.id);
      return [
        plainText(inv.title),
        c.topic,
        inv.duration,
        String(inv.steps.length),
        c.difficulty,
      ];
    }),
    size: 8.5,
  });

  for (const inv of investigations) {
    const c = instructorContentFor(inv.id);
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
    doc.row('Time', inv.duration);
    doc.row('Length', `${inv.steps.length} steps`);
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
