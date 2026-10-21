// =============================================================================
// The class summary on the submission review page, in English (Prompt 173)
// -----------------------------------------------------------------------------
// Its own fragment, beside en.submissions.js and for the same reason: only the
// instructor's review page reads it. Unlike that file it is installed in the
// idle tier with the instructor modules (tools/build-service-worker.mjs), not
// at a first visit. js/submission/i18n.js merges the two.
// =============================================================================

export const EN_CLASSSUMMARY = {
  'sub.sum.title': 'Class summary',
  'sub.sum.note':
    'This is what the reports you opened here say about the class, worked out in this page and nowhere else: nothing is sent and nothing is kept. It has no names, roster ids or file names. Each report counts once and an exact duplicate not at all. It never changes a mark, a score or a gradebook file, and it describes the reports in front of you; it is not a study of learning.',
  'sub.sum.empty': 'Read at least one report to see the class summary.',
  'sub.sum.counts':
    '{n} reports counted on {date}; {dup} exact duplicates left out; {rep} of the reports are repeated attempts, and each attempt counts.',
  'sub.sum.csv': 'Download the class summary (CSV)',
  'sub.sum.print': 'Print the class summary',
  'sub.sum.lesson.one': '{title}: 1 report',
  'sub.sum.lesson.many': '{title}: {n} reports',
  'sub.sum.reading':
    'How far they got: the middle report visited {median} of the steps, and the reports range from {min} to {max}.',
  'sub.sum.depths': 'Depth read: {list}.',
  'sub.sum.steps': 'Steps, in order',
  'sub.sum.col.step': 'Step',
  'sub.sum.col.answered': 'Answered',
  'sub.sum.col.right': 'Right, of the answers Gravitas can check',
  'sub.sum.col.written': 'Written answers marked',
  'sub.sum.col.mark': 'Mean mark',
  'sub.sum.of': '{a} of {n}',
  'sub.sum.stale':
    '{n} answers belong to steps this build no longer has and are not counted above.',
  'sub.sum.criteria': 'Rubric criteria, by what each claims',
  'sub.sum.col.criterion': 'Criterion',
  'sub.sum.col.claims': 'Claims',
  'sub.sum.col.marked': 'Marked',
  'sub.sum.col.marks': 'Marks',
  'sub.sum.kinds': 'By kind of claim',
  'sub.sum.kinds.none': 'No criterion has a mark yet',
  'sub.sum.criteria.note':
    'Each mark is your own reading, taken as a share of the points the criterion could earn. A criterion’s mark is never added to a step’s mark or to a gradebook score.',
  'sub.sum.wrong': 'Most frequent wrong answers',
  'sub.sum.wrong.none':
    'No wrong answers among the answers Gravitas can check.',
  'sub.sum.col.question': 'Question',
  'sub.sum.col.given': 'Answer given',
  'sub.sum.col.times': 'Times',
  'sub.sum.col.share': 'Share of the wrong answers to that question',
  'sub.sum.col.misconception': 'Misconception the author named',
  'sub.sum.unreadable': 'not a readable answer',
  'sub.sum.none': 'none named',
  'sub.sum.wrong.more':
    'The {n} most frequent are shown; the CSV has every one kept, up to three for each question.',
  'sub.sum.wrong.note':
    'Only answers Gravitas can check appear here. A mistake is named only where the investigation’s author wrote it down, in the investigation’s own English words; every other wrong answer is shown as given and not explained.',
  'sub.sum.time': 'Time the reports record',
  'sub.sum.time.line':
    'From {n} reports that record both times: the middle is {median}, the middle half runs from {q1} to {q3}, and the range is {min} to {max}.',
  'sub.sum.time.none':
    'No report records both a first opening and a last save.',
  'sub.sum.time.missing':
    '{n} reports do not record both times and are left out.',
  'sub.sum.time.note':
    'This is the span from the first opening to the last save a report records. It includes every hour away and says nothing about time spent working.',
  'sub.sum.col.time': 'Time',
  'sub.sum.col.reports': 'Reports',
  'sub.sum.min': '{v} min',
  'sub.sum.hours': '{v} h',
  'sub.sum.days': '{v} days',
  'sub.sum.band.under': 'under {to}',
  'sub.sum.band.between': '{from} to {to}',
  'sub.sum.band.over': 'more than a day',
  'sub.sum.measured': 'Measured quantities',
  'sub.sum.measured.none':
    'No report carried a measured quantity in an evidence table that checked out.',
  'sub.sum.measured.line':
    '{n} values: median {median}, range {min} to {max}. {bars} state an uncertainty (mean {sigma}).',
  'sub.sum.measured.left':
    'Left out of the plot: {limit} limits, {failed} failed fits, {nc} not constrained.',
  'sub.sum.measured.caption':
    '{name}: one row for each report, ordered by value',
  'sub.sum.col.rank': 'Rank',
  'sub.sum.col.value': 'Value',
  'sub.sum.col.uncertainty': 'Stated uncertainty',
  'sub.sum.col.origin': 'Origin',
  'sub.sum.plot.label':
    '{name}: {n} values, one for each report, ordered by value, each with the uncertainty its own report states as a bar. The same numbers are in the table below.',
  'sub.sum.plot.x': 'Reports, ordered by value',
  'sub.sum.measured.more':
    'The {shown} quantities with the most values are shown, of {n}; the CSV has all of them.',
  'sub.sum.measured.single':
    '{n} quantities have a single value and are not shown as a distribution.',
  'sub.sum.measured.mismatch':
    '{n} reports whose evidence table did not match its digest are left out.',
  'sub.sum.measured.note':
    'A report states a value for a quantity once. The spread here is the spread of the class’s reports, with each report’s own uncertainty beside it; Gravitas does not combine them into one number.',
};
