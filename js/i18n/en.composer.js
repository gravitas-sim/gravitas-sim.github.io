// =============================================================================
// The words for the Investigation Composer (/studio/lesson/), in English
// -----------------------------------------------------------------------------
// Imported by js/composerPage.js alone. The page also reads the Scenario
// Studio's fragment (./en.studio.js) for what the two pages share - drafts,
// the raw view, the import conflict, most of the format's complaints - and
// the application's catalog for scenario titles and lesson names, so what is
// here is only what the composer says that nothing else does.
// =============================================================================

export const EN_COMPOSER = {
  'composer.title': 'Investigation Composer',
  'composer.intro':
    'Compose a guided investigation as data: what students read, predict, try, measure and answer, which scenario and instrument each step opens, and what they see when an answer is wrong. It is checked by the same rules as every lesson Gravitas ships, and it never runs anything you write.',
  'composer.toStudio': 'The Scenario Studio',
  'composer.toolbar.label': 'Investigation file',
  'composer.action.new': 'New investigation',
  'composer.action.saveBank': 'Save the question bank',
  'composer.action.export': 'Export the lesson file',
  'composer.action.exportEs': 'Export its Spanish file',
  'composer.raw.label': 'The investigation file, as JSON',

  'composer.section.about': 'About the investigation',
  'composer.section.steps': 'Steps',
  'composer.section.bank': 'Question bank',
  'composer.hint.bank':
    'Questions a step can ask by name. Each has a version, its points and which attempt counts, and may come in variants: shuffled options, or numbers taken from a relation Gravitas computes. The seed decides which variant this investigation gets.',
  'composer.pair.en': 'English',
  'composer.pair.es': 'Spanish',
  'composer.state.done': 'Translated',
  'composer.state.missing': 'No Spanish yet',
  'composer.state.stale': 'Spanish out of date',
  'composer.field.id': 'Identifier',
  'composer.hint.id':
    'Lower-case words joined by hyphens. It may not be the id of a lesson Gravitas already has.',
  'composer.field.version': 'Version',
  'composer.field.title': 'Title',
  'composer.field.subtitle': 'Subtitle',
  'composer.field.summary': 'Summary',
  'composer.field.level': 'Level',
  'composer.field.duration': 'Duration',
  'composer.hint.duration':
    'A range such as 20-25 min, as the lesson card prints it.',
  'composer.field.thumbnail': 'Card picture',
  'composer.thumbnail.first': 'The first step’s scenario',
  'composer.field.objectives': 'Objectives',
  'composer.objective': 'Objective {n}',
  'composer.objective.add': 'Add an objective',
  'composer.objective.remove': 'Remove objective {n}',
  'composer.field.prerequisites': 'Before this',
  'composer.prereq.lesson': 'A Gravitas lesson',
  'composer.prereq.text': 'Something else, in words',
  'composer.prereq.add': 'Add a prerequisite',
  'composer.prereq.remove': 'Remove prerequisite {n}',
  'composer.field.seed': 'Variant seed',
  'composer.hint.seed':
    'Which variant of each bank question this investigation asks. The same seed always builds the same investigation; record it with anything you give a class.',

  'composer.type.read': 'Read',
  'composer.type.predict': 'Predict',
  'composer.type.explore': 'Explore',
  'composer.type.measure': 'Measure',
  'composer.type.question': 'Question',
  'composer.step.legend': '{n}. {type}',
  'composer.step.sid': 'Step id',
  'composer.hint.sid':
    'What saved answers are keyed by. Keep it once students have used the investigation.',
  'composer.step.title': 'Title',
  'composer.step.body': 'Text',
  'composer.step.tip': 'Tip (optional)',
  'composer.step.setup': 'Scenario',
  'composer.setup.keep': 'Keep the previous step’s scene',
  'composer.setup.seed': 'World seed (optional)',
  'composer.hint.setupSeed':
    'A word such as orbit-1: the same word builds the same world.',
  'composer.setup.paused': 'Start paused',
  'composer.setup.zoom': 'Zoom (optional)',
  'composer.step.tool': 'Instrument',
  'composer.tool.none': 'None',
  'composer.step.when': 'Shown to',
  'composer.when.everyone': 'Every student',
  'composer.when.incorrect': 'Students who answered step {n} wrongly',
  'composer.when.correct': 'Students who answered step {n} rightly',
  'composer.hint.when':
    'Remediation: this step is passed over unless the answer to that step is wrong (or right) when the student gets here.',
  'composer.step.checklist': 'Things to do',
  'composer.checklist.item': 'Item {n}',
  'composer.checklist.add': 'Add an item',
  'composer.checklist.remove': 'Remove item {n}',
  'composer.step.fields': 'Numbers to record',
  'composer.measure.id': 'Name',
  'composer.measure.label': 'Label',
  'composer.measure.unit': 'Unit (optional)',
  'composer.measure.add': 'Add a number',
  'composer.measure.remove': 'Remove number {n}',
  'composer.step.prompt': 'Question',
  'composer.step.options': 'Options',
  'composer.option': 'Option {n}',
  'composer.option.add': 'Add an option',
  'composer.option.remove': 'Remove option {n}',
  'composer.option.right': 'The right one',
  'composer.step.because': 'Why (shown after an answer)',
  'composer.step.reveal': 'Marked at',
  'composer.reveal.choose': 'Choose a later step',
  'composer.question.source': 'Question',
  'composer.source.choice': 'Written here: a choice',
  'composer.source.numeric': 'Written here: a number',
  'composer.source.short': 'Written here: a short answer',
  'composer.source.bank': 'From the bank: {id}',
  'composer.numeric.answer': 'Answer',
  'composer.numeric.tolerance': 'Tolerance (same unit)',
  'composer.numeric.unit': 'Unit',
  'composer.expect.dimension': 'Units a student may use',
  'composer.expect.none': 'Only the unit above',
  'composer.expect.unit': 'Graded in',
  'composer.expect.accept': 'Also accepted (comma-separated)',
  'composer.hints.concept': 'Hint: the idea',
  'composer.hints.method': 'Hint: the method',
  'composer.step.worked': 'Worked answer',
  'composer.step.rubric': 'Rubric (for whoever marks it)',
  'composer.scoring.points': 'Points',
  'composer.scoring.attempts': 'Counts',
  'composer.attempts.first': 'The first attempt',
  'composer.attempts.best': 'The best attempt',
  'composer.steps.openAll': 'Open every step',
  'composer.steps.closeAll': 'Close every step',
  'composer.step.up': 'Move step {n} up',
  'composer.step.down': 'Move step {n} down',
  'composer.step.duplicate': 'Duplicate step {n}',
  'composer.step.remove': 'Remove step {n}',
  'composer.step.addType': 'Kind of step',
  'composer.step.add': 'Add a step',

  'composer.item.legend': 'Bank item {id}',
  'composer.item.id': 'Identifier',
  'composer.item.version': 'Version',
  'composer.hint.itemVersion':
    'Raise it whenever a change could change a grade.',
  'composer.item.kind': 'Kind',
  'composer.kind.choice': 'Choice',
  'composer.kind.numeric': 'Number',
  'composer.kind.short': 'Short answer',
  'composer.item.variants': 'Variants',
  'composer.variants.none': 'None: one question',
  'composer.variants.shuffle': 'Shuffle the options',
  'composer.variants.relation': 'Numbers from a relation',
  'composer.item.relation': 'Relation',
  'composer.relation.kepler3':
    'Kepler’s third law: the period in years, from a (AU) and M (solar masses)',
  'composer.relation.circularSpeed':
    'Circular orbit speed in km/s, from a (AU) and M (solar masses)',
  'composer.relation.escapeSpeed':
    'Escape speed in km/s, from a (AU) and M (solar masses)',
  'composer.relation.inverseSquare':
    'Inverse square: how many times stronger gravity is at r1 than at r2 (AU)',
  'composer.relation.transitDepth':
    'Transit depth in percent, from Rp (Earth radii) and Rs (solar radii)',
  'composer.hint.relation':
    'Write each input in the question as {a}, {M} and so on. Gravitas computes each variant’s answer; nothing you type is evaluated.',
  'composer.item.tolerancePct': 'Tolerance (percent of the answer)',
  'composer.item.values': 'Variant {n}',
  'composer.values.add': 'Add a variant',
  'composer.values.remove': 'Remove variant {n}',
  'composer.values.answer': 'Answer: {answer} {unit}',
  'composer.a11y.textOnly': 'Answerable from its text alone',
  'composer.a11y.note': 'For a reader who cannot use the simulation',
  'composer.item.add': 'Add a bank item',
  'composer.item.remove': 'Remove item {id}',
  'composer.item.duplicate': 'Duplicate item {id}',

  'composer.estimate.heading': 'Estimates',
  'composer.estimate.minutes':
    'About {minutes} minutes of work, with {words} words to read.',
  'composer.estimate.card': 'The card says {duration}.',
  'composer.estimate.outside':
    'Caution: that is outside the {duration} the card says. Change the duration, or the investigation.',
  'composer.estimate.steps': '{count} steps: {list}.',
  'composer.estimate.graded': '{count} graded, worth {points} points in all.',
  'composer.translation.heading': 'Translation',
  'composer.translation.summary':
    '{done} of {total} texts translated; {missing} with no Spanish, {stale} out of date.',
  'composer.translation.complete':
    'Every text is in both languages and up to date.',
  'composer.translation.item': '{where}: {state}',
  'composer.preview.hint':
    'The investigation in the real lesson engine, from this browser only: nothing is saved there, and nothing is published.',
  'composer.preview.student': 'Preview as a student',
  'composer.preview.author': 'Open with the author bar',
  'composer.preview.frame':
    'Gravitas, running this investigation as a student meets it',
  'composer.key.heading': 'Answer key',
  'composer.key.hint':
    'What an instructor sees: every graded step, its answer and its points.',
  'composer.key.step': 'Step',
  'composer.key.answer': 'Answer',
  'composer.key.points': 'Points',
  'composer.key.variant': 'Variant {index} of {count}',
  'composer.key.shuffled': 'Options shuffled',
  'composer.key.none': 'Nothing is graded yet.',
  'composer.key.rubric': 'Marked by rubric: {rubric}',
  'composer.key.prediction': 'Prediction, marked at step {n}',
  'composer.report.heading': 'Report evidence',
  'composer.report.hint':
    'The lab report a student hands in, made from the answer key, so you can see what it will show.',
  'composer.report.make': 'Make a sample report',
  'composer.report.open': 'Open the sample report',
  'composer.report.made': 'The sample report is ready.',
  'composer.report.failed': 'The sample report could not be made: {error}',
  'composer.checks.format':
    'Fix these first; the lesson checks run once the file is sound.',
  'composer.checks.rule': 'Step {n}: {message}',
  'composer.checks.lesson': 'The lesson: {message}',
  'composer.checks.count':
    '{count} problem(s) to fix before the investigation can be saved.',
  'composer.checks.valid': 'The investigation is valid.',
  'composer.checks.running': 'Checking…',

  'composer.status.example':
    'The example investigation, to learn from: it uses every part of the format once. New starts from nothing.',
  'composer.status.new':
    'A new investigation. It is saved in this browser as you go.',
  'composer.status.saved': 'Saved {file}.',
  'composer.status.bankSaved': 'Saved {file}.',
  'composer.status.exported':
    'Saved {file}: the lesson, for js/data/investigations/.',
  'composer.status.exportedEs':
    'Saved {file}: its Spanish, for js/data/investigations/es/ (rename it {id}.js there).',
  'composer.status.previewed':
    'The preview shows the investigation as a student meets it.',
  'composer.status.bankMerged': 'Added {count} question(s) to the bank.',
  'composer.status.bankClash':
    'The bank already has {ids} with different contents; nothing was added. Rename them in the file, or remove them here first.',
  'composer.file.notPack':
    'That file is neither a Gravitas investigation nor a question bank.',

  'composer.error.textUnsafe':
    'Only the tags strong, em, sub and sup; no other markup and no web addresses.',
  'composer.error.entity': '&{entity}; is not one of the entities lessons use.',
  'composer.error.esOf':
    'The record of which English the Spanish translates is damaged.',
  'composer.error.tooLarge': 'The file is larger than any investigation needs.',
  'composer.error.tooDeep':
    'The file is nested deeper than any investigation is.',
  'composer.error.unsafeKey': '“{key}” may not be a key.',
  'composer.error.notData': 'This is not plain data.',
  'composer.error.idTaken': 'That is the id of a lesson Gravitas already has.',
  'composer.error.duration': 'A range such as 20-25 min.',
  'composer.error.scenario': 'Choose a scenario Gravitas has.',
  'composer.error.objectives': 'From one to eight objectives.',
  'composer.error.prerequisite': 'Either a lesson or a text.',
  'composer.error.lesson': 'Choose a lesson Gravitas has.',
  'composer.error.steps': 'From 2 to {max} steps.',
  'composer.error.repeat': 'Another one already has this id.',
  'composer.error.closing':
    'The last step closes the investigation: make it a read or an explore step.',
  'composer.error.stepType': 'One of: {options}.',
  'composer.error.sid':
    'Up to 80 lowercase letters, digits and single hyphens, and not only digits.',
  'composer.error.firstSetup': 'The first step opens a scenario.',
  'composer.error.widget': 'Choose an instrument Gravitas has.',
  'composer.error.earlier': 'Choose an earlier step.',
  'composer.error.checklist': 'From one to eight things to do.',
  'composer.error.fields': 'From one to six numbers to record.',
  'composer.error.fieldId': 'A short name such as period, used once.',
  'composer.error.unit': 'A unit such as days.',
  'composer.error.options': 'From {min} to {max} options.',
  'composer.error.choiceAnswer': 'Mark the right option.',
  'composer.error.reveal':
    'Choose a later step, where the prediction is marked.',
  'composer.error.revealConditional':
    'Marked at a step every student reaches: not a remediation step.',
  'composer.error.notHere': 'This does not belong here.',
  'composer.error.bankItem': 'Choose an item in the bank.',
  'composer.error.bankRepeat': 'Another step asks this item.',
  'composer.error.setupSeed':
    'A word such as orbit-1: letters, digits and hyphens.',
  'composer.error.whenIs': 'Wrongly or rightly.',
  'composer.error.whenGraded':
    'Choose a graded step: a prediction, or a choice or number question.',
  'composer.error.whenNested':
    'Choose a step every student reaches: remediation is one level deep.',
  'composer.error.whenHeld':
    'Move this step after step {n}, where that prediction is marked: before then, showing it or passing it over gives the answer away.',
  'composer.error.whenLast': 'The last step is one every student reaches.',
  'composer.error.kind': 'One of: {options}.',
  'composer.error.itemVersion': 'A whole number from 1.',
  'composer.error.numericAnswer': 'A number, not zero.',
  'composer.error.tolerance': 'A positive number, in the unit of the answer.',
  'composer.error.misconception':
    'Either a factor the answer is off by, or the number it equals.',
  'composer.error.hintsOrder': 'A method hint comes after an idea hint.',
  'composer.error.scoring': 'How many points, and which attempt counts.',
  'composer.error.points': 'A whole number from 1 to {max}.',
  'composer.error.attempts': 'The first or the best attempt.',
  'composer.error.a11y': 'Say whether it can be answered from its text alone.',
  'composer.error.dimension': 'One of: {options}.',
  'composer.error.expectUnit': 'A {dimension} unit the answer parser reads.',
  'composer.error.acceptUnit':
    'Include {unit}, the unit it is graded in: the parser takes only the units listed.',
  'composer.error.relation': 'Choose a relation.',
  'composer.error.tolerancePct': 'From 0.5 to 25 percent.',
  'composer.error.variantValues': 'From 1 to {max} variants.',
  'composer.error.relationUnit': 'The relation answers in “{unit}”.',
  'composer.error.variantsClose':
    'This variant’s answer is within the tolerance of variant {other}’s: a student could copy it.',
  'composer.error.placeholder': 'The question must say {{name}}.',
  'composer.error.placeholderUnknown':
    '{{name}} is not an input of this relation.',
  'composer.error.shuffle': 'Shuffle, or no variants.',
  'composer.error.inputUnknown': '“{input}” is not an input of this relation.',
  'composer.error.inputNumber': 'A number.',
  'composer.error.inputRange': 'From {min} to {max} {unit}.',
  'composer.error.values': 'Each variant gives its inputs as numbers.',
  'composer.error.answer': 'These inputs give no usable answer.',
};
