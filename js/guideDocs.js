// =============================================================================
// A suite of guided investigations, as instructor documents
// -----------------------------------------------------------------------------
// Two PDFs per suite for the encrypted instructor bundle (tools/build-
// instructor-materials.js), rendered in Node and never loaded by a page:
//
//   the instructor guide   the curriculum map, the data and their terms, each
//                          investigation's steps, teaching notes and an
//                          assignment sheet, and what remains an
//                          approximation
//   the answer key         every step's answer on the advanced path, from the
//                          suite's committed key (its reference run)
//
// The step words are the suite's own catalog, so the documents and the page
// cannot say different things. What a suite writes for itself is only what
// no data structure holds: its teaching notes, its data inventory, its
// approximations and its introduction (js/exoplanetGuideDocs.js is one).
// =============================================================================

import { createDocument } from './pdf.js';
import { stepsOn } from './observatory/guides/core.js';

const KIND = {
  read: 'Read',
  do: 'Do, and checked',
  answer: 'Answer, checked',
  choose: 'Choose',
};
const kindOf = s =>
  s.kind === 'choose' && s.correct === null
    ? 'Predict (recorded)'
    : KIND[s.kind];

/** What the curriculum map calls each tool a check names. */
const TOOL_NAMES = {
  box: 'box search',
  period: 'period search',
  aperture: 'aperture tool',
  line: 'line tool',
  band: 'band index',
  filter: 'filter',
  match: 'cross-match',
  curve: 'model comparison',
  describe: 'column summary',
};
/** And each change a check looks for. */
const CHANGE_NAMES = { derive: 'new column', crop: 'crop' };

/**
 * @typedef {object} SuiteDocs
 * @property {Record<string, string>} messages - The suite's words, in English,
 *   with the runner's
 * @property {string} name - The suite's name, for footers
 * @property {string} title - The guide's title
 * @property {string} subtitle - The line under it
 * @property {string[]} intro - Its opening paragraphs
 * @property {string} [dataNote] - A paragraph under the data table
 * @property {Record<string, string[]>} notes - Teaching notes, by guide id
 * @property {Array<{name: string, source: string, license: string}>} datasets
 * @property {string[]} approximations - What remains an approximation
 * @property {string} keyTool - The command that writes the answer key
 */

function words(docs) {
  const say = id => docs.messages[id] ?? id;
  return { say, step: (g, s, part) => say(`gd.${g.id}.${s.id}.${part}`) };
}

/** What each investigation reads, and with which tools. */
function usesOf(g, say) {
  const targets = new Set();
  const tools = new Set();
  for (const s of g.steps) {
    const t = s.check?.target ?? s.go?.open ?? s.target;
    if (t) targets.add(say(`gd.target.${t}`));
    if (s.check?.kind === 'measured')
      tools.add(TOOL_NAMES[s.check.tool] ?? s.check.tool);
    if (s.check?.kind === 'fitted') tools.add('model fit');
    if (s.check?.kind === 'folded') tools.add('fold');
    if (s.check?.kind === 'changed')
      tools.add(CHANGE_NAMES[s.check.op] ?? s.check.op);
    // A tool a step sends the reader to without checking its node: its
    // answer is checked instead.
    for (const u of s.uses || []) tools.add(TOOL_NAMES[u] ?? u);
    if (s.show) tools.add('computed panels');
  }
  return { targets: [...targets], tools: [...tools] };
}

const footer = (name, what, version) =>
  `Gravitas ${name}  |  ${what}  |  Instructor copy${version ? `  |  ${version}` : ''}`;

/**
 * The instructor guide, with the curriculum map and assignment sheets.
 * @param {object} suite - A suite's SUITE
 * @param {SuiteDocs} docs
 */
export function suiteInstructorGuide(suite, docs, { version = '' } = {}) {
  const { say, step } = words(docs);
  const doc = createDocument({
    title: `${docs.title}: Instructor Guide`,
    subject: `Instructor guide for ${docs.title}: a curriculum map, the data and their terms, teaching notes, assignment sheets and the approximations that remain.`,
    footer: footer(docs.name, 'Instructor Guide', version),
  });
  doc.titleBlock({
    kicker: 'Gravitas Observatory | Instructor Guide',
    title: docs.title,
    subtitle: docs.subtitle,
  });
  for (const p of docs.intro) doc.paragraph(p);
  doc.paragraph(
    'The advanced path is the introductory one with steps added: the same data, the same checks and the same answers, and more of them. A student can move on without passing a step, and after a wrong answer can ask to see the right one; the progress list, and the notebook entry, say which steps were passed and which were shown.'
  );

  doc.heading('The curriculum map', { size: 13 });
  doc.table({
    columns: [
      'Investigation',
      'Question',
      'Data and tools',
      'Intro',
      'Advanced',
    ],
    widths: [1.3, 2, 2.2, 0.8, 0.9],
    rows: suite.GUIDES.map(g => {
      const u = usesOf(g, say);
      return [
        say(`gd.${g.id}.title`),
        say(`gd.${g.id}.summary`),
        `${u.targets.join('; ')}. Tools: ${u.tools.join(', ') || 'none'}.`,
        `${stepsOn(g, 'intro').length} steps, ~${g.minutes.intro} min`,
        `${stepsOn(g, 'advanced').length} steps, ~${g.minutes.advanced} min`,
      ];
    }),
    size: 8,
  });
  doc.paragraph(
    'Every duration is an estimate reasoned from what each step asks; none has yet been timed with a class.',
    { size: 9, color: '0.35 0.35 0.4' }
  );

  doc.heading('The data, and on what terms', { size: 13 });
  doc.table({
    columns: ['Data', 'Where it comes from', 'Terms'],
    widths: [2, 2.4, 1.3],
    rows: docs.datasets.map(d => [d.name, d.source, d.license]),
    size: 8,
  });
  if (docs.dataNote) doc.paragraph(docs.dataNote);

  for (const g of suite.GUIDES) {
    doc.pageBreak();
    doc.heading(say(`gd.${g.id}.title`), { size: 13 });
    doc.paragraph(say(`gd.${g.id}.summary`));
    doc.table({
      columns: ['#', 'Step', 'Kind', 'Path'],
      widths: [0.3, 3.2, 1.3, 0.8],
      rows: stepsOn(g, 'advanced').map((s, n) => [
        String(n + 1),
        step(g, s, 'title'),
        kindOf(s),
        s.path === 'advanced' ? 'Advanced' : 'Both',
      ]),
      size: 8.5,
    });
    doc.heading('Teaching notes', { size: 11 });
    doc.bullets(docs.notes[g.id] ?? []);
    doc.heading('Assignment sheet', { size: 11 });
    doc.paragraph(
      `Open /observatory/?guide=${g.id} for the introductory path, or /observatory/?guide=${g.id}&path=advanced for the advanced one. Hand in:`
    );
    doc.bullets(
      stepsOn(g, 'advanced')
        .filter(s => s.kind === 'answer' || s.kind === 'choose')
        .map(
          s =>
            `${step(g, s, 'title')}${s.path === 'advanced' ? ' (advanced)' : ''}: ${
              s.kind === 'answer'
                ? 'the number, and how you found it'
                : 'your choice, and why'
            }.`
        )
    );
    doc.paragraph(
      'At the last step, “Add my answers to the notebook” records the answers as an Observatory entry, with which were checked and which were shown; the notebook’s report can then be handed in with them.',
      { size: 9 }
    );
  }

  doc.pageBreak();
  doc.heading('What remains an approximation', { size: 13 });
  doc.bullets(docs.approximations);
  return doc.build();
}

/**
 * The answer key, from the suite's committed key.
 * @param {object} suite - A suite's SUITE
 * @param {Array<object>} rows - Its committed key
 * @param {SuiteDocs} docs
 */
export function suiteAnswerKey(suite, rows, docs, { version = '' } = {}) {
  const { say, step } = words(docs);
  const doc = createDocument({
    title: `${docs.title}: Answer Key`,
    subject: `Answer key for ${docs.title}, worked out from a reference run on the same data with each panel’s default settings.`,
    footer: footer(docs.name, 'Answer Key', version),
  });
  doc.titleBlock({
    kicker: 'Gravitas Observatory | Answer Key',
    title: `${docs.title}: Answer Key`,
    subtitle:
      'Every step, on the advanced path, which includes the introductory one',
  });
  doc.paragraph(
    `Instructor copy. These answers were worked out by ${docs.keyTool}, which does what a student does with each panel’s default settings and then applies the guides’ own answer functions to the results. The page checks each student against their own measurements and fits, not against this key: a student who chose other settings is checked against what they found. Predictions are recorded and never marked.`,
    { size: 9, color: '0.35 0.35 0.42' }
  );
  const fmt = v =>
    typeof v === 'number' ? String(Number(v.toPrecision(6))) : String(v);
  for (const g of suite.GUIDES) {
    doc.heading(say(`gd.${g.id}.title`), { size: 12, spaceBefore: 16 });
    const mine = rows.filter(r => r.guide === g.id && r.path === 'advanced');
    doc.table({
      columns: ['Step', 'Kind', 'Answer', 'Why'],
      widths: [1.6, 1, 1.2, 3.4],
      rows: mine
        .filter(r => r.kind !== 'read')
        .map(r => {
          const s = g.steps.find(x => x.id === r.step);
          const answer =
            r.kind === 'choose'
              ? r.expected === null
                ? 'Any (a prediction)'
                : step(g, s, `opt.${r.expected}`)
              : r.expected === null
                ? r.kind === 'do'
                  ? 'Done'
                  : 'Not computed'
                : `${fmt(r.expected)}${r.tolerance !== undefined ? ` (+/- ${r.tolerance})` : ''}`;
          const why =
            r.kind === 'choose' && r.expected === null
              ? 'Answered by a later step.'
              : step(g, s, 'ok').replace(
                  /\{value\}/g,
                  r.expected === null ? '' : fmt(r.expected)
                );
          return [
            `${step(g, s, 'title')}${s.path === 'advanced' ? ' (advanced)' : ''}`,
            kindOf(s),
            answer,
            why,
          ];
        }),
      size: 8,
    });
  }
  doc.paragraph(
    `Targets: ${Object.keys(suite.TARGETS)
      .map(t => say(`gd.target.${t}`))
      .join('; ')}.`,
    { size: 8.5 }
  );
  return doc.build();
}
