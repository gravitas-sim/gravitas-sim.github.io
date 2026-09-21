// =============================================================================
// The showcase page's words, in English
// -----------------------------------------------------------------------------
// /teaching/ has about a hundred strings and the application has nearly three
// thousand. Merging the two would put this page's prose into the start-up
// download of every visitor who never opens it, and put the application's into
// a page that is one HTML file and one small module. So the showcase page
// carries its own catalog and its own three-line translator
// (js/teaching/i18n.js); the id namespace is `teach.` and nothing outside this
// page reads it.
//
// What this file may and may not say
// -----------------------------------------------------------------------------
// It may describe what the software does. It may not describe what it achieves.
// There is no evidence that using Gravitas improves learning - no study, no
// control group, no measurement - and a page addressed to people evaluating it
// for adoption is the last place to imply otherwise. Every claim here is either
// a fact about the interface that a reader can check on the same page, or is
// attributed to the thing that establishes it.
//
// The same applies to accessibility. "Keyboard operable, and tested against
// axe-core in continuous integration" is a fact. "Accessible" is a conclusion
// nobody here is entitled to draw on a reader's behalf; the page says what was
// done and links to the checks.
//
// Counts never appear as words. `{n}`-style placeholders are filled at render
// time from the manifest and from validation/data.json. See js/data/teaching.js.
// =============================================================================

import { EN_ACTIVITIES } from './en.activities.js';

export const EN_TEACHING = {
  ...EN_ACTIVITIES,
  'teach.title': 'Teaching with Gravitas',
  'teach.meta.description':
    'How Gravitas is used in an introductory astronomy course: guided investigations, an evidence notebook, controlled experiments, and six demonstrations you can run in the page.',
  'teach.nav.simulation': 'Simulation',
  'teach.nav.model': 'The model',
  'teach.nav.validation': 'Validation',
  'teach.nav.teaching': 'Teaching',
  'teach.nav.instructors': 'Instructors',
  'teach.skip': 'Skip to content',
  'teach.eyebrow': 'For instructors and adopters',
  'teach.lede':
    'Gravitas is a browser-based gravitational simulator built for teaching. Students do not watch a demonstration of a result; they predict it, run it, measure it, and write down what they found. This page shows how that works, what it costs to adopt, and where to check the physics.',

  // --- Language --------------------------------------------------------------
  'teach.lang.label': 'Language',
  'teach.lang.en': 'English',
  'teach.lang.es': 'Español',
  'teach.lang.switched': 'Page language changed to English.',

  // --- At a glance -----------------------------------------------------------
  'teach.glance.investigations': 'Guided investigations',
  'teach.glance.graded': 'Steps that are marked',
  'teach.glance.graded.value': '{graded} of {total}',
  'teach.glance.scenarios': 'Built-in scenarios',
  'teach.glance.checks': 'Physics checks passing',
  'teach.glance.checks.value': '{passed} of {total}',
  'teach.glance.cost': 'Cost, accounts, install',
  'teach.glance.cost.value': 'None, none, none',
  'teach.glance.languages': 'Interface languages',
  'teach.glance.note':
    'Every number on this page is read from the catalog and the validation results when the page loads. None of them is typed into it.',

  // --- Contents --------------------------------------------------------------
  'teach.toc': 'On this page',
  'teach.section.cycle': 'The cycle a student works through',
  'teach.section.journey': 'From a prediction to a submitted report',
  'teach.section.instruments': 'What each instrument is for',
  'teach.section.demos': 'Six demonstrations you can run here',
  'teach.section.patterns': 'Five ways to use it in a course',
  'teach.section.access': 'Access, language and reproducibility',
  'teach.section.evidence': 'Where to check the physics',

  // --- The cycle -------------------------------------------------------------
  'teach.cycle.intro':
    'Every investigation is built on the same five moves, and the interface enforces the order: the prediction is recorded before the evidence exists, and it is not editable afterwards. A student who guessed wrong still has their guess in front of them when the measurement arrives, which is the moment the lesson is actually about.',
  'teach.cycle.predict.verb': 'Predict',
  'teach.cycle.predict.student':
    'Commit to an answer before anything runs — in a sentence, a number, or a choice between sketched outcomes.',
  'teach.cycle.predict.tool':
    'Prediction steps are stored against a permanent step id and locked once submitted. Later steps can quote the prediction back verbatim.',
  'teach.cycle.test.verb': 'Test',
  'teach.cycle.test.student':
    'Set the system up and run it — or change exactly one thing and run it twice.',
  'teach.cycle.test.tool':
    'A lesson step can set the scenario, the seed and the settings itself, so twenty students start from the identical world rather than from twenty attempts at the same slider.',
  'teach.cycle.measure.verb': 'Measure',
  'teach.cycle.measure.student':
    'Read a number off the simulation with a ruler, a protractor, a stopwatch, a light curve or a velocity plot.',
  'teach.cycle.measure.tool':
    'Measurements carry their own provenance: which integrator, what timestep, which reference frame, at what simulated time.',
  'teach.cycle.revise.verb': 'Revise',
  'teach.cycle.revise.student':
    'Compare the measurement with the prediction and say which one has to change, and why.',
  'teach.cycle.revise.tool':
    'The original prediction is shown beside the result. Nothing overwrites it, and a wrong prediction is kept rather than quietly replaced.',
  'teach.cycle.explain.verb': 'Explain',
  'teach.cycle.explain.student':
    'Write the account: what was measured, under what conditions, and what it does and does not establish.',
  'teach.cycle.explain.tool':
    'The evidence notebook assembles the run into a report with its numbers, its settings and its caveats attached.',

  // --- The journey -----------------------------------------------------------
  'teach.journey.intro':
    'This is the same cycle seen from the student’s side — the five things that actually happen between opening a link and handing something in.',
  'teach.journey.open.title': 'They open a link',
  'teach.journey.open.text':
    'A Gravitas link carries the whole world in the address bar: scenario, seed, settings, camera, and the clock. There is no account to create, nothing to install, and no upload. Paste the link into an LMS page and every student who follows it gets the identical system.',
  'teach.journey.predict.title': 'They record a prediction',
  'teach.journey.predict.text':
    'The lesson asks first and shows second. Predictions are answered in the page and stored in the browser against step ids that do not change when the lesson is edited, so a lesson revised mid-semester does not throw away work already done.',
  'teach.journey.evidence.title': 'They generate evidence',
  'teach.journey.evidence.text':
    'They run the system, pause it at an event, measure it, run a controlled A/B comparison, or sweep one parameter across a handful of values. Each of those produces numbers rather than an impression.',
  'teach.journey.notebook.title': 'They capture it to the notebook',
  'teach.journey.notebook.text':
    'A capture takes the measurement together with the conditions that produced it — integrator, timestep, substeps, frame, observer geometry, simulated time, world seed — as one atomic entry. An entry cannot be half-written.',
  'teach.journey.submit.title': 'They hand in a report',
  'teach.journey.submit.text':
    'The notebook exports a report as PDF or CSV, with the entries, their provenance and the limitations of the run stated in it. Instructors who prefer a smaller unit of work can cut a short assignment out of any lesson with the assignment builder and take the same export.',

  // --- Instruments -----------------------------------------------------------
  'teach.instruments.intro':
    'These are the parts an instructor is choosing between. Each exists to make one specific piece of scientific practice possible for a first-year student.',
  'teach.instruments.investigations.name': 'Guided investigations',
  'teach.instruments.investigations.text':
    'Multi-step lessons that set up their own worlds. Steps are numbered, marked where they have a right answer, and carry learning objectives. Prerequisites between lessons are declared rather than assumed.',
  'teach.instruments.notebook.name': 'The evidence notebook',
  'teach.instruments.notebook.text':
    'A running record of what the student measured and under what conditions. It is the difference between "the orbit looked stable" and a table of separations with the timestep that produced them.',
  'teach.instruments.experiments.name': 'A/B experiments',
  'teach.instruments.experiments.text':
    'Two runs over the same interval of simulated time, differing in exactly one variable, with the difference reported rather than eyeballed. Students meet the idea of a controlled comparison on a system where holding everything else fixed is actually possible.',
  'teach.instruments.sweeps.name': 'Parameter sweeps',
  'teach.instruments.sweeps.text':
    'The same measurement repeated across a short series of values for one parameter, tabulated. This is where a relationship stops being one anecdote and becomes a trend a student can describe.',
  'teach.instruments.pause.name': 'Pause at an event',
  'teach.instruments.pause.text':
    'Stop at closest approach, at a transit, at a node crossing. The moment worth discussing is usually the moment that is hardest to catch by hand, and a class cannot talk about a frame that has already gone past.',
  'teach.instruments.reliability.name': 'Numerical reliability checks',
  'teach.instruments.reliability.text':
    'Re-run the same measurement with a smaller timestep or a different integrator and see whether the answer moves. A result that changes when the step is halved is a result about the arithmetic, and students are shown how to tell the two apart.',
  'teach.instruments.stellarLab.name': 'The Stellar Lab',
  'teach.instruments.stellarLab.text':
    'An H-R diagram carrying eight published MIST evolutionary tracks, a comparison stage that draws pinned stars at true relative sizes, and a reproducible synthetic population. It is where “A Universe of Stars” and “Lives of Stars” are taught, and it keeps apart two things students merge: a modeled star, which has a mass and an age, and a point on the diagram, which has a radius and nothing else.',
  'teach.instruments.uncertainty.name': 'Uncertainty analysis',
  'teach.instruments.uncertainty.text':
    'Measurements come with the spread that produced them, and fits report their parameters with intervals rather than as single numbers. A student is asked what their number is good to, not only what it is.',
  'teach.instruments.more': 'How this is computed',

  // --- Demonstrations --------------------------------------------------------
  'teach.demos.intro':
    'Each demonstration below opens a real, reproducible Gravitas state — the same kind of link the share dialog produces — as an interactive figure. They open paused on purpose: the question comes before the evidence. Press play when the class has committed to an answer.',
  'teach.demos.note':
    'The figures are the simulation itself, embedded, not a video or an animation. Nothing loads until you press Run, and each one can also be opened full-size, where the measuring tools, the notebook and the settings are available.',
  'teach.demo.question': 'The question, and the usual wrong answer',
  'teach.demo.instructor': 'What you do',
  'teach.demo.predict': 'What the class predicts first',
  'teach.demo.visible': 'What becomes visible',
  'teach.demo.run': 'Run it here',
  'teach.demo.stop': 'Close the figure',
  'teach.demo.open': 'Open full size',
  'teach.demo.lesson': 'The full investigation',
  // --- Classroom activities ---------------------------------------------------
  // One activity in three teaching formats, cut from the Kepler's Laws
  // investigation. Durations are estimates and say so: none of these has been
  // timed with a class, and a number presented as fact would be a small lie
  // told to somebody planning a lesson around it.
  'teach.activities.heading': 'Classroom activities',
  'teach.activities.lede':
    'Prepared teaching formats, chosen by what you want students to do and how long you have. Each one opens a real investigation cut to length — the same steps, the same measurements, the same evidence in the notebook.',
  'teach.activities.vs.investigations':
    'Looking for the whole topic instead? The investigations are the complete lessons, browsable by subject.',
  'teach.activities.browse': 'Browse all investigations',
  'teach.activities.fallback.activity':
    'There is no classroom activity called “{id}”. The ones that exist are below.',
  'teach.activities.fallback.format':
    'There is no “{id}” format for this activity. Its formats are below.',
  'teach.activities.formats.heading': 'Formats',
  'teach.activities.launch': 'Start',
  'teach.activities.launch.label': 'Start the {format} format of {activity}',
  'teach.activities.instructor': 'Instructor materials',
  'teach.activities.instructor.note':
    'Presenter notes, expected reasoning, misconceptions and a rubric. Kept separate from what students see.',
  'teach.activities.fullLesson': 'Open the full investigation',
  'teach.activities.audience': 'Who it is for',
  'teach.activities.prerequisites': 'Assumed beforehand',
  'teach.activities.objectives': 'By the end, students can',
  'teach.activities.estimate': 'Estimated, not yet timed with a class',

  'teach.demo.frameTitle': '{name}, running in Gravitas',
  'teach.demo.meta':
    'Full investigation: {duration} · {steps} steps · {graded} marked',
  'teach.demo.opened': 'The figure for {name} is now loaded and paused.',
  'teach.demo.closed': 'The figure for {name} has been closed.',
  'teach.demos.sequence': 'Copy all six as a lecture sequence',
  'teach.demos.sequence.note':
    'Lecture mode takes a list of links, one per line, and steps through them with the arrow keys on a projector. This copies these six in order.',
  'teach.demos.sequence.done':
    'Six links copied. Paste them into Lecture Mode.',
  'teach.demos.sequence.failed':
    'The clipboard was not available. The links are listed below; copy them by hand.',

  'teach.demo.retrograde.question':
    'Mars slows down, stops, and reverses direction in its orbit.',
  'teach.demo.retrograde.instructor':
    'Open the figure with both orbits drawn and the trails on, and ask the class to sketch the path of Mars as seen from Earth before anything moves.',
  'teach.demo.retrograde.predict':
    'Does Mars actually reverse in space, or does something else produce the loop?',
  'teach.demo.retrograde.visible':
    'Mars never reverses. Earth, on the inside track, overtakes it, and the line of sight swings backwards for a few weeks. The loop is in the direction we are looking, not in the motion.',
  'teach.demo.assist.question':
    'A gravity assist creates energy — the planet’s gravity gives the spacecraft speed for free.',
  'teach.demo.assist.instructor':
    'Run a single flyby with velocity vectors on, then read the before and after speeds in the planet’s frame and in the star’s frame.',
  'teach.demo.assist.predict':
    'After the encounter, is the craft faster, slower, or unchanged? Ask for an answer in each frame separately.',
  'teach.demo.assist.visible':
    'Its speed relative to the planet is the same going out as coming in; its speed relative to the star is not. The energy came from the planet, which is measurably slower afterwards.',
  'teach.demo.chaos.question':
    'A tiny change in the starting conditions makes a tiny difference in the outcome.',
  'teach.demo.chaos.instructor':
    'Run two three-body systems whose initial positions differ in the fourth decimal place, over the same interval of simulated time.',
  'teach.demo.chaos.predict':
    'How long before the two paths are visibly different? Take a show of hands on orbits, not seconds.',
  'teach.demo.chaos.visible':
    'The separation grows roughly exponentially, and it keeps doing so when the timestep is halved. That second part is the point: the divergence is the physics, not the arithmetic.',
  'teach.demo.rotation.question':
    'Stars far from the center of a galaxy must orbit more slowly, the way the outer planets do.',
  'teach.demo.rotation.instructor':
    'Show the disc with velocity vectors on, and measure orbital speed at several radii.',
  'teach.demo.rotation.predict':
    'Sketch the rotation curve: speed against distance from the center.',
  'teach.demo.rotation.visible':
    'The visible mass alone predicts a falling curve. The measured one does not fall. The gap is the observation that dark matter was proposed to explain — and the lesson also runs the modified-gravity alternative.',
  'teach.demo.tides.question':
    'The Moon pulls the ocean towards it, so there is one high tide, on the side facing the Moon.',
  'teach.demo.tides.instructor':
    'Show the Earth–Moon system, then look at the difference between the Moon’s pull on the near side, the center and the far side.',
  'teach.demo.tides.predict':
    'How many high tides pass a given coastline in a day — one or two?',
  'teach.demo.tides.visible':
    'Two. What raises a tide is the difference in the pull across the Earth, not the pull itself, and a difference has two ends.',
  'teach.demo.transit.question':
    'If we cannot see the planet, how can anyone claim to know it is there?',
  'teach.demo.transit.instructor':
    'Run the transit with the clock showing, and watch the light curve build itself as the planet crosses.',
  'teach.demo.transit.predict':
    'What does the star’s brightness do, and by how much, for a Jupiter-sized planet crossing a Sun-sized star?',
  'teach.demo.transit.visible':
    'A dip of about one per cent, repeating. The depth gives the ratio of the radii and the spacing gives the period, from a measurement of brightness alone.',

  // --- Course patterns -------------------------------------------------------
  'teach.patterns.intro':
    'Five shapes this has actually been used in. The lessons named under each are chosen at render time by the length each one declares, so a lesson that grows leaves the short-slot list on its own.',
  'teach.patterns.fits': 'Fits this slot today',
  'teach.patterns.prep': 'Preparation',
  'teach.patterns.handin': 'What is handed in',
  'teach.patterns.none': 'Nothing in the catalog currently fits this slot.',
  'teach.pattern.lecture.title': 'Lecture demonstration',
  'teach.pattern.lecture.text':
    'Ten minutes inside a lecture. Ask for a prediction, run the state on the projector, and let the measurement settle it. Lecture mode enlarges the type, borrows the light theme so the projector’s black point does not swallow the chrome, and steps through a prepared list of links with the arrow keys.',
  'teach.pattern.lecture.prep':
    'Paste a list of links into Lecture Mode once. It is remembered in the browser on that machine.',
  'teach.pattern.lecture.handin': 'Nothing — this one is spoken.',
  'teach.pattern.activity.title': 'A short in-class activity',
  'teach.pattern.activity.text':
    'Fifteen to twenty-five minutes at laptops or phones. A short investigation, or a handful of steps cut out of a longer one with the assignment builder, ending in one measurement and one sentence.',
  'teach.pattern.activity.prep':
    'Build the assignment once, hand out one link. Prerequisites between steps are checked for you.',
  'teach.pattern.activity.handin':
    'A short report exported from the notebook, or a single number and its uncertainty.',
  'teach.pattern.homework.title': 'Homework',
  'teach.pattern.homework.text':
    'A full investigation, done alone, at whatever pace. Progress is kept in the browser, so a student can stop halfway and come back. Nothing is uploaded and no account exists to lose.',
  'teach.pattern.homework.prep':
    'Post the lesson link. The instructor guide and the answer key for each investigation are in the instructor area.',
  'teach.pattern.homework.handin':
    'The exported PDF report, which carries the marked steps and the conditions each measurement was made under.',
  'teach.pattern.laboratory.title': 'Laboratory session',
  'teach.pattern.laboratory.text':
    'A two- or three-hour session built on a long investigation, with the controlled comparison and the parameter sweep done properly rather than skipped. This is where the numerical reliability check earns its place: students re-run their own result with a smaller timestep and find out whether it survives.',
  'teach.pattern.laboratory.prep':
    'One machine per pair. It runs in any current browser, offline once the page has been visited.',
  'teach.pattern.laboratory.handin':
    'A full notebook export: the sweep table, the A/B comparison, the reliability check, and a written account of what the numbers support.',
  'teach.pattern.inquiry.title': 'Open inquiry',
  'teach.pattern.inquiry.text':
    'No lesson at all. The sandbox, the whole scenario gallery, and a question the student chose. Every state they reach is a link they can send you, which is what makes an open-ended project markable without watching over their shoulder.',
  'teach.pattern.inquiry.prep':
    'Agree the question. Ask for the link to the state they started from and the link to the one they ended at.',
  'teach.pattern.inquiry.handin':
    'Two links and a notebook export — which, between them, are a reproducible result.',

  // --- Access ----------------------------------------------------------------
  'teach.access.intro':
    'What follows is a description of what has been built and tested, not a claim about how well it serves any particular reader. If something here does not work for your class, that is a defect worth reporting.',
  'teach.access.keyboard.title': 'Keyboard and screen reader',
  'teach.access.keyboard.text':
    'The interface is operable from the keyboard, including the lessons, the measuring tools and the dialogs, which trap focus and return it. Measurements and state changes are announced through a live region, and the canvas carries a text description of what is on it that updates as the system evolves. Automated checks (axe-core) and a set of manual keyboard walkthroughs run in continuous integration on every change.',
  'teach.access.motion.title': 'Motion and theme',
  'teach.access.motion.text':
    'Interface animation follows the operating system’s reduced-motion setting. Four themes are provided, including a light one built for projectors and a high-contrast dark one. Nothing on this page moves until you ask it to.',
  'teach.access.language.title': 'Spanish',
  'teach.access.language.text':
    'The interface, the lesson browser and every investigation are available in Spanish as well as English, including the step text students read and answer. The language is chosen in the interface and remembered; the Spanish lesson text is downloaded only if it is asked for.',
  'teach.access.offline.title': 'Network, cost and privacy',
  'teach.access.offline.text':
    'It is a static site. There is no server, no account, no login, no analytics and no upload: student answers and notebook entries stay in the browser they were made in. Once a student has loaded the page, it works offline, which matters for a classroom on institutional wifi. It is free and MIT licensed.',
  'teach.access.reproducible.title': 'Reproducible links',
  'teach.access.reproducible.text':
    'Any state can be turned into a URL, and the URL rebuilds it exactly — from the seed, when the world was generated, or body by body once it has been run. That is what makes a demonstration citable, an assignment identical for everyone, and a student’s claim checkable.',

  // --- Evidence --------------------------------------------------------------
  'teach.evidence.intro':
    'A simulation used for teaching is only worth as much as its physics, and the only honest way to say so is to publish the checks and let a reader run them.',
  'teach.evidence.validation.name': 'The validation suite',
  'teach.evidence.validation.text':
    'Every check the physics is held to, with its measured value, its expected value, the tolerance and the reason that tolerance is the right one. The page re-runs the whole suite in your browser on request.',
  'teach.evidence.model.name': 'How Gravitas models the universe',
  'teach.evidence.model.text':
    'What is simulated from first principles, what is an approximation, what is illustrative, and what is absent. Each claim is labeled, and the illustrative ones are labeled loudest.',
  'teach.evidence.instructors.name': 'The instructor area',
  'teach.evidence.instructors.text':
    'Teaching guides, learning objectives, answer keys, an adopter’s guide and a curriculum map. Behind one shared passphrase, because the answer keys are in it.',
  'teach.evidence.source.name': 'The source',
  'teach.evidence.source.text':
    'The whole thing, MIT licensed, with the test suite, the validation checks and the build. Nothing on this page is a claim you have to take on trust.',
  'teach.evidence.checks':
    '{passed} of {total} checks passing, last run {date}.',
  'teach.evidence.checks.unavailable':
    'Open the validation page for the current results.',

  // --- Footer ----------------------------------------------------------------
  'teach.foot.home': 'Gravitas',
  'teach.foot.model': 'The model',
  'teach.foot.validation': 'Validation',
  'teach.foot.instructors': 'Instructors',
  'teach.foot.source': 'Source',
  'teach.foot.license': 'MIT licensed',

  // --- Instructor quick-start -----------------------------------------------
  'teach.section.quickstart': 'Quick start for instructors',
  'teach.quickstart.intro':
    'Six answers for somebody deciding whether to use this on Tuesday. Everything below is checkable from this page or the ones it links to.',
  'teach.quickstart.prerequisites.title': 'What students need to know first',
  'teach.quickstart.prerequisites.text':
    'That gravity pulls two masses together and weakens with distance. Nothing else is assumed: no calculus anywhere, and each investigation states its own prerequisites on its card. Arithmetic is the only mathematics a short route needs.',
  'teach.quickstart.timing.title': 'How long things take',
  'teach.quickstart.timing.text':
    'The short routes on this page are three to five minutes each. A classroom activity is five, twenty or fifty. A full investigation prints its own estimate, and every one of these numbers is an estimate reasoned from the steps rather than a figure timed with a class — none of them has been.',
  'teach.quickstart.devices.title': 'What it runs on',
  'teach.quickstart.devices.text':
    'Any current browser. There is nothing to install, no account, and no server: the whole thing is static files. It is built to work on the kind of low-end school Chromebook that is several years old, at the low quality tier, and it keeps working with the network off once the tab has been opened.',
  'teach.quickstart.accessibility.title': 'If a student cannot use the canvas',
  'teach.quickstart.accessibility.text':
    'Every instrument prints its numbers as text beside the picture, every plot is also a table, and the simulation itself has a written description that follows what is on screen. The whole activity is operable from the keyboard, and reduced motion and high contrast are honored. What is not solved: a canvas cannot be explored by touch the way a tactile diagram can, and a student who needs that will need the numbers read to them.',
  'teach.quickstart.evidence.title': 'What students hand in',
  'teach.quickstart.evidence.text':
    'Work is kept in the student\u2019s own browser and never leaves it on its own. They export it themselves — a lab report as a PDF, or the notebook as a file — and hand that in however you already collect work. Nothing is uploaded, and there is no account to create or roster to manage.',
  'teach.quickstart.resources.title': 'What is there for you',
  'teach.quickstart.resources.text':
    'An instructor guide per investigation with expected observations, common misconceptions and discussion questions; an answer key; and an assignment builder that cuts a lesson down to the steps you want and produces a link.',

  // --- A template for an evaluation nobody has run --------------------------
  'teach.section.evaluate': 'If you want to evaluate it',
  'teach.evaluate.intro':
    'No study has been run on this software. There is no validated assessment, no measured learning gain, and nothing on this page should be read as one. What follows is a shape somebody could use to produce evidence, offered because the absence of it is easier to act on than to ignore.',
  'teach.evaluate.kit.lead':
    'The printable forms for all of this — a fidelity checklist, a twelve-item pilot pre/post assessment, a usability questionnaire, an anonymous participant-code workflow, and de-identified CSV and JSON templates — are in the',
  'teach.evaluate.kit.link': 'classroom evidence kit',
  'teach.evaluate.kit.tail':
    '. They are project-developed and unvalidated, and the page says so on every surface that shows them.',
  'teach.evaluate.objectives.title': 'Start from the objectives, not the tool',
  'teach.evaluate.objectives.text':
    'Each investigation states two or three observable objectives on its card, phrased as things a student does rather than things they appreciate. Decide which of those you actually care about before deciding what to measure; an evaluation of "engagement" answers a question nobody asked.',
  'teach.evaluate.prepost.title': 'Pre and post, with a comparison',
  'teach.evaluate.prepost.text':
    'The same items before and after, with a comparison group doing whatever you would otherwise have done. A pre/post gain with no comparison measures the passage of time as much as the intervention, which is the single most common way results like these are overstated.',
  'teach.evaluate.transfer.title': 'Ask a transfer question',
  'teach.evaluate.transfer.text':
    'A question about a system the activity never showed. Several investigations end with one — a different star, a comparable-mass pair, a survey that would have missed something — and those make reasonable models. A student who can answer only about the system they were shown has learned the system.',
  'teach.evaluate.usability.title': 'Watch, do not survey',
  'teach.evaluate.usability.text':
    'Sit behind three or four students and write down where they stop. Ten minutes of that is worth more than a hundred satisfaction ratings, and it is the only way to find the step whose instruction names a control that is off the bottom of their screen.',
  'teach.evaluate.limits.title': 'Say what it cannot show',
  'teach.evaluate.limits.text':
    'The integrator is Newtonian and the model pages say where that stops. Some lesson screens place a body from a published model rather than integrating it, and say so on the screen. An evaluation that treats every picture as a simulation will draw a conclusion the software does not support.',
  'teach.evaluate.review.title': 'Clear it first',
  'teach.evaluate.review.text':
    'Research on students, including classroom research by their own instructor, generally needs institutional review before any data is collected — and consent that is genuinely optional when the person asking also assigns the grade. Check with your board early; retrospective approval is usually not a thing.',

  // --- Feedback --------------------------------------------------------------
  'teach.section.feedback': 'Telling us what happened',
  'teach.feedback.intro':
    'This software collects nothing. There is no analytics, no telemetry, no account and no server to send anything to, which also means nobody here finds out when something does not work unless you say so.',
  'teach.feedback.issue.title': 'Report something broken',
  'teach.feedback.issue.text':
    'Open an issue on the repository. A scenario name or a lesson link, what you expected and what happened is enough; a share link reproduces the exact state you were looking at.',
  'teach.feedback.issue.link': 'Open an issue',
  'teach.feedback.contact.title': 'Say something about teaching with it',
  'teach.feedback.contact.text':
    'The same place. An issue is a fine way to describe a class that went well or badly, and it is public, which is the point — the next instructor reads it too.',
  'teach.feedback.form.title': 'Notes from a class you ran',
  'teach.feedback.form.text':
    'Optional, and entirely local. What you type here stays in this browser, is never sent anywhere, and asks for nothing that identifies you or a student. Export it when you are done and send it wherever you like, or clear it and it is gone.',
  'teach.feedback.route.label': 'Which route or investigation',
  'teach.feedback.route.hint': 'The name is enough',
  'teach.feedback.level.label': 'Who it was for',
  'teach.feedback.level.hint':
    'Course level and rough class size — no institution, please',
  'teach.feedback.worked.label': 'What worked',
  'teach.feedback.worked.hint': 'The moment something landed',
  'teach.feedback.confused.label': 'Where students got stuck',
  'teach.feedback.confused.hint':
    'The screen, the wording, or the control they could not find',
  'teach.feedback.timing.label': 'How long it actually took',
  'teach.feedback.timing.hint':
    'Against the estimate on the card — the estimates have never been timed with a class',
  'teach.feedback.wanted.label': 'What you wanted and could not do',
  'teach.feedback.wanted.hint':
    'A measurement, a control, a way to hand something in',
  'teach.feedback.form.export': 'Save these notes as a file',
  'teach.feedback.form.clear': 'Clear them',
  'teach.feedback.form.saved': 'Kept in this browser. Nothing has been sent.',
  'teach.feedback.form.cleared': 'Cleared.',
  'teach.feedback.form.empty': 'Nothing to save yet.',
  'teach.feedback.form.exported': 'Saved as {name}.',
  'teach.feedback.form.privacy':
    'No name, no email, no institution and no telemetry. Stored in this browser only, under one key you can clear above.',
};
