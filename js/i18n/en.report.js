// =============================================================================
// The lab report, in English
// -----------------------------------------------------------------------------
// Fetched with ./es.report.js only when a report is built (reportMessages()
// in js/labReport.js), so no lesson pays for them at start. The ids are short
// because each is written three times.
// =============================================================================

export const EN_REPORT = {
  'rp.by': 'Submitted by',
  'rp.inv': 'Investigation',
  'rp.start': 'Started',
  'rp.made': 'Report generated',
  'rp.steps': 'Steps completed',
  'rp.nOf': '{n} of {total}',
  'rp.asg': 'Assignment',
  'rp.asgV': 'Assignment version',
  'rp.asgIssued': 'v{v}, issued {date}',
  'rp.asgSteps': 'Steps in this assignment',
  'rp.since': 'Since this was set',
  'rp.sinceV': '{changed} step(s) rewritten, {missing} no longer in the lesson',
  'rp.obj': 'Learning objectives',
  'rp.resp': 'Responses',
  'rp.check': 'Exploration checklist',
  'rp.checkV': '{done} of {total} completed',
  'rp.pred': 'Prediction: {prompt}',
  'rp.noPred': '(no prediction)',
  'rp.noAns': '(not answered)',
  'rp.result': 'Result',
  'rp.none': 'not answered',
  'rp.right': 'correct',
  'rp.wrong': 'incorrect',
  'rp.wrongChoice': 'incorrect (answer: {answer})',
  'rp.expected': '{verdict} - expected {answer}',
  'rp.tries': ', {n} attempts',
  'rp.rubric': 'Marking note: {note}',
  'rp.plot': 'Your measurements, plotted',
  'rp.plotNote':
    'Each point is a value you measured. The dashed line is a least-squares fit through the origin; a straight line through the origin is what a power law looks like once the axes are chosen correctly.',
  'rp.sum': 'Summary',
  'rp.auto': 'Automatically checked answers',
  'rp.autoV': '{right} of {total} correct',
  'rp.written': 'Written answers',
  'rp.writtenV': 'to be marked by the instructor',
  'rp.code': 'Completion code',
  'rp.codeNote':
    'The completion code is a checksum of the answers above. It changes if the report is edited, so it can be used to spot alterations, but it is generated in the browser and is not proof of authorship.',
  'rp.token': 'Submission token',
  'rp.tokenNote':
    'For the instructor. Drop this PDF on the submission review page, or copy the block below and paste it there. It carries the answers in this report and nothing else - no name beyond the one above, and no proof of authorship, which a browser cannot provide.',
  'rp.links': 'Reproduce this investigation',
  'rp.linksNote':
    'Each link below reopens the exact simulation used in that step, so the measurements in this report can be checked independently.',
  'rp.link': 'Step {n}: {title}',
};
