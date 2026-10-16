// =============================================================================
// The guided investigations' runner, in English
// -----------------------------------------------------------------------------
// js/observatory/guidePanel.js registers these when a reader first opens the
// guides: the words every suite shares (the buttons, the checks' reasons, the
// progress and the notebook) and each suite's title for the chooser. A
// suite's own words are its catalog pair, loaded with it (./en.exoplanet.js).
// =============================================================================

export const EN_GUIDES = {
  'gd.suite': 'Suite',
  'gd.suite.exoplanet': 'The Exoplanet Observatory: from photons to a planet',
  'gd.suite.populations':
    'Stars and their populations: spectra, clusters and variables',
  'gd.loading': 'Loading the investigations…',
  'gd.intro':
    'Guided investigations with real observations, done with this page’s own tools. Choose a suite, then an investigation and a path: the introductory path is the core, and the advanced path adds steps to it. Every number a step checks comes from the data or from a cited source it names.',
  'gd.pick': 'Investigation',
  'gd.path': 'Path',
  'gd.path.intro': 'Introductory',
  'gd.path.advanced': 'Advanced (adds steps)',
  'gd.start': 'Start',
  'gd.meta': '{steps} steps, about {minutes} minutes.',
  'gd.stepOf': 'Step {n} of {of}: {title}',
  'gd.advanced': 'Advanced',
  'gd.checkWork': 'Check my work',
  'gd.check': 'Check',
  'gd.record': 'Record my prediction',
  'gd.answer': 'Your answer',
  'gd.choose': 'Choose one',
  'gd.back': 'Back',
  'gd.next': 'Next',
  'gd.finish': 'Finish',
  'gd.done': 'Finished: {done} of {of} steps done.',
  'gd.reveal': 'Show the answer',
  'gd.revealed': 'The data give {value}.',
  'gd.revealedChoice': 'The answer: {option}.',
  'gd.progress': 'Steps',
  'gd.return': 'Back to the investigation: step {n} of {of}',
  'gd.link': 'A link to this investigation, for an activity',
  'gd.installing': 'Installing {title} from the catalog…',
  'gd.go.open': 'Open {target}',
  'gd.go.install': 'Install {target} from the catalog and open it',
  'gd.go.panel.measure': 'Open the measurement panel',
  'gd.go.panel.fit': 'Open the fit panel',
  'gd.go.failed': 'That did not work: {why}',
  'gd.go.missing': 'it is not installed, and could not be installed',
  'gd.go.noPanel': 'that panel does not apply to the observation open now',
  'gd.check.notOpened': '{target} is not the observation open now.',
  'gd.check.noFold': 'The light curve is not folded yet.',
  'gd.check.foldPeriod':
    'It is folded at {value} days, which is not near the search’s period.',
  'gd.check.noMeasurement':
    'There is no current measurement of this kind on this observation yet.',
  'gd.check.outside':
    'The result is {value}, not what this step asks for: look at the settings you used.',
  'gd.check.noFit': 'There is no fit of this observation yet.',
  'gd.check.noChange':
    'The workspace does not hold that change yet: the step says what to make.',
  'gd.check.fitSettings':
    'There is a fit, but not with the settings this step asks for.',
  'gd.check.unknown': 'This step cannot be checked.',
  'gd.check.notANumber': 'Type a number, such as 0.5 or 3.52.',
  'gd.check.notYet':
    'An earlier step comes first: this answer is worked out from its result.',
  'gd.check.choose': 'Choose an option first.',
  'gd.check.recorded': 'Recorded. A later step shows what the data say.',
  'gd.state.todo': 'not started',
  'gd.state.done': 'done',
  'gd.state.tried': 'not right yet',
  'gd.state.shown': 'answer shown',
  'gd.nb.add': 'Add my answers to the notebook',
  'gd.nb.title': 'Investigation: {guide}',
  'gd.nb.added': 'Added to the notebook.',
  'gd.nb.failed': 'Could not add it to the notebook: {why}',
  'gd.nb.shown': 'typed after the answer was shown',
  'gd.nb.checked': 'typed, and checked against the data',
  'gd.nb.unchecked': 'typed, and not right yet',
  'gd.show.notOpened': 'open it first',
};
