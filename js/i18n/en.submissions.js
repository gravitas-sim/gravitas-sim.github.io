// =============================================================================
// The instructor submission review page, in English
// -----------------------------------------------------------------------------
// Its own catalog because it is its own page: /instructors/submissions/ is a
// separate bundle that almost nobody opens, and its strings have no business in
// the application's start-up or deferred catalogs. js/submission/i18n.js reads
// this and ./es.submissions.js and nothing else.
// =============================================================================

export const EN_SUBMISSIONS = {
  'sub.doc.title': 'Submission review | Gravitas',
  'sub.title': 'Submission review',
  'sub.lang.label': 'Language',
  'sub.intro':
    'Drop the lab reports your students handed in and this page will tell you which question the class got wrong. It reads the PDF itself, the JSON progress backup, or a token pasted out of the last page of a report.',
  'sub.privacy':
    'Nothing leaves your browser and nothing is saved. Close the tab and it is gone. What you read here can be downloaded as a spreadsheet or as JSON; there is no roster and no gradebook.',
  'sub.drop.title': 'Drop reports, backups or tokens here',
  'sub.drop.picker': 'Choose reports, backups or token files',
  'sub.paste.label': 'or paste one token',
  'sub.paste.go': 'Read this token',
  'sub.clear': 'Clear everything',
  'sub.count.none': 'nothing yet',
  'sub.count.one': '1 submission',
  'sub.count.many': '{n} submissions',
  'sub.rates.title': 'Per-question failure rate',
  'sub.rates.note':
    'Hardest first. “Marked” counts only the answers Gravitas can check itself; written answers are yours to read and are counted under “unmarkable” rather than as failures. An exact duplicate is counted once.',
  'sub.rates.empty': 'Drop reports, backups or tokens above.',
  'sub.col.question': 'Question',
  'sub.col.lesson': 'Investigation',
  'sub.col.wrong': 'Wrong',
  'sub.col.marked': 'Marked',
  'sub.col.rate': 'Failure rate',
  'sub.col.unmarkable': 'Unmarkable',
  'sub.read.title': 'Read',
  'sub.read.noName': '(no name)',
  'sub.read.duplicate': 'exact duplicate of #{n}',
  'sub.read.attempt': 'attempt {n} of {of}',
  'sub.refused.title': 'Not read',
  'sub.reason.empty': 'nothing to read',
  'sub.reason.wrongKind': 'not a Gravitas submission token',
  'sub.reason.newerVersion': 'made by a newer version of Gravitas',
  'sub.reason.corrupt': 'truncated or altered in transit',
  'sub.reason.mangled':
    'characters were changed in transit - a rich-text box turns "--" into a dash. Paste into a plain-text field, or drop the PDF instead.',
  'sub.reason.notAnObject': 'not a submission',
  'sub.reason.noVersion': 'no schema version',
  'sub.reason.noBackup': 'no answers inside',
  'sub.reason.noLesson': 'does not say which investigation',
  'sub.reason.noResponses': 'no answers inside',
  'sub.reason.noSteps': 'no step list to check against',
  'sub.reason.notABackup': 'not a Gravitas progress backup',
  'sub.reason.unknownLesson': 'names an investigation this build does not have',
  'sub.reason.noTokenInPdf': 'no token in this PDF',
  'sub.reason.notJson': 'not JSON and not a token',
  'sub.paste.source': 'pasted token',
  'sub.reason.badAttempts': 'the attempt counts inside are malformed',
  'sub.reason.badPosition': 'the saved position inside is malformed',
  'sub.reason.badResponses': 'the answers inside are malformed',
  'sub.reason.badStartedAt': 'the start time inside is malformed',
  'sub.reason.badSteps': 'the step list inside is malformed',
  'sub.reason.badVisited': 'the list of visited steps is malformed',
  'sub.reason.noProgress': 'no answers inside',
  'sub.reason.tooNew': 'made by a newer version of Gravitas',
  'sub.reason.other': 'could not be read ({code})',
  'sub.export.title': 'Download the results',
  'sub.export.note':
    'The summary has one row per report; the question file has one row per question per report. Exact duplicates and repeated attempts are kept and marked, never merged or chosen between. Reports are grouped as attempts only by roster id: a typed name is not an identity, so without one nothing is grouped.',
  'sub.export.written': 'Include written answers (the students’ own words)',
  'sub.export.writtenNote':
    'Off by default. Numbers and chosen options are always included, because they are what each verdict was reached from.',
  'sub.export.summaryCsv': 'Summary (CSV)',
  'sub.export.questionsCsv': 'Question by question (CSV)',
  'sub.export.json': 'Everything (JSON)',
  'sub.export.empty': 'Read at least one report to download results.',
  'sub.export.done': 'Downloaded {file}.',
  'sub.export.failed': 'The file could not be made: {reason}',
  'sub.notice':
    'A submission token says what a student answered. It is not proof of who answered: it is computed in a browser, and anything a browser computes, whoever controls the browser can forge. What it saves you is typing.',
};
