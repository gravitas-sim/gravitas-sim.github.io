// =============================================================================
// The English catalogue: every user-facing string, exactly once
// -----------------------------------------------------------------------------
// This file is the source of truth. Nothing else in the application may carry a
// second copy of a string that appears here, and a locale file (js/i18n/es.js)
// is a set of overrides against these ids rather than an independent list.
//
// Ids are `area.component.element[.variant]`, semantic rather than derived from
// the English words, so rewording a button does not require renaming its id and
// every translation of it. `settings.label.gravitationalConstant` survives the
// day somebody decides the label should read "Gravity strength".
//
// A value is a string, or - for the handful of messages that vary with a count
// - an object of plural forms selected by Intl.PluralRules. See t() in
// js/i18n/index.js.
//
// What is deliberately NOT here
// -----------------------------------------------------------------------------
//   The investigations, and the chrome that belongs to them. A lesson is
//   continuous writing and a half-translated one is worse than an English one,
//   so the boundary is structural: a lesson is translated as a whole file under
//   js/data/investigations/<locale>/, laid over the English by
//   mergeTranslation(), and there is nothing here to fall back from.
//
//   The observing panels' internals - light curve, radial velocity, astrometry,
//   rotation curve, the 3D view. The rail buttons that open them are chrome and
//   are here; what is inside them is a later pass.
//
//   Anything a user never reads: console messages, event names, CSS classes,
//   test selectors, scenario keys, physics constants, CSV column headers.
// =============================================================================

export const EN = {
  // --- Locale and the language picker ---------------------------------------
  'locale.picker.label': 'Language',
  'locale.picker.hint': 'Change the interface language',
  // Describes how much of a locale is translated, for a picker that wants to
  // say so. It has to be specific about *what* is and is not translated:
  // "partially translated" would leave a student wondering whether the lesson
  // they are reading lost something.
  'locale.coverage.es': 'Spanish interface and investigations.',
  'locale.coverage.complete': 'Fully translated.',

  // --- Presentation: embed ---------------------------------------------------
  'embed.figure.title': 'Gravitas simulation: {scenario}',
  'embed.figure.titleGeneric': 'Gravitas interactive simulation',
  'embed.action.openFull': 'Open in Gravitas',
  'embed.action.openFull.hint':
    'Open this simulation full size in a new tab, with the full set of controls',

  // --- Presentation: the share dialog's embed half ---------------------------
  'share.action.copyEmbed': 'Copy embed code',
  'share.action.copyEmbed.hint':
    'Copy an iframe that shows exactly this simulation, ready to paste into a Canvas, Blackboard or Moodle page',
  'share.embed.copied': 'Embed code copied',
  'share.embed.copyFailed': 'Press Ctrl/Cmd + C to copy the embed code',
  'share.embed.note':
    'Paste into the HTML editor of a course page. The figure stays interactive.',

  // --- Presentation: lecture -------------------------------------------------
  'lecture.action.enter': '🎦 Lecture Mode',
  'lecture.action.enter.hint':
    'Fill the screen for projection: larger type and controls, the Daylight theme, a spotlight pointer, and arrow keys to step through a prepared sequence of links. Escape leaves.',
  'lecture.action.exit': 'Exit Lecture Mode',
  'lecture.action.exit.hint': 'Return to the normal interface (Escape)',
  'lecture.action.spotlight': 'Spotlight',
  'lecture.action.spotlight.hint':
    'Dim everything but a circle around the pointer, to direct attention on a projected simulation',
  'lecture.action.next': 'Next',
  'lecture.action.next.hint': 'Go to the next prepared state (Right Arrow)',
  'lecture.action.previous': 'Previous',
  'lecture.action.previous.hint':
    'Go to the previous prepared state (Left Arrow)',
  'lecture.action.sequence': 'Sequence',
  'lecture.action.sequence.hint': 'Prepare or load an ordered list of links',
  'lecture.sequence.heading': 'Lecture sequence',
  'lecture.sequence.intro':
    'Paste Gravitas share links, one per line, in the order you will present them. The arrow keys step through them without leaving Lecture Mode.',
  'lecture.sequence.load': 'Load sequence',
  'lecture.sequence.placeholder': 'https://gravitas-sim.online/#\u2026',
  'lecture.sequence.clear': 'Clear',
  'lecture.sequence.empty': 'No sequence loaded',
  'lecture.sequence.loaded': {
    one: '{n} state loaded',
    other: '{n} states loaded',
  },
  'lecture.sequence.rejected': {
    one: '{n} line was not a Gravitas link',
    other: '{n} lines were not Gravitas links',
  },
  'lecture.sequence.position': 'Step {n} of {total}',
  'lecture.sequence.atStart': 'Already at the first state',
  'lecture.sequence.atEnd': 'Already at the last state',
  'lecture.sequence.failed': 'That state could not be opened',

  // ===========================================================================
  // Static markup (index.html)
  // ---------------------------------------------------------------------------
  // Applied by js/i18n/dom.js through data-i18n / data-i18n-title /
  // data-i18n-aria-label / data-i18n-placeholder attributes. Ids are built from
  // the region and the element's own id, so they name the control rather than
  // its wording and survive a copy edit.
  // ===========================================================================

  // --- chrome ----------------------------------------------------------------
  'chrome.mobileMenuToggle.hint': 'Show the simulation controls',
  'chrome.tutorial.hint':
    'Open the guided tour of the simulation controls. Drag the panel to move it.',
  'chrome.mobileMenuToggle.label': 'Open controls menu',
  'chrome.text1': 'Skip to controls',
  'chrome.text2': 'Gravitas: interactive astrophysics sandbox',

  // --- export ----------------------------------------------------------------
  'export.dataExportClose.hint': 'Close',
  'export.dataExportTitle': 'Export data',
  'export.dataExportContent':
    'Everything the simulation has recorded, as CSV. Open it in a spreadsheet, or read it straight into pandas.',
  'export.dataExportScope': 'Which objects',
  'export.dataExportSelectedLabel': 'Selected object only',
  'export.dataExportScope.2': 'Every object',
  'export.dataExportContent.2':
    'Columns carry their units in the name: distances in AU, times in days, speeds in km/s, energies in joules. Positions are recorded ten times a second of real time, and the history holds the last several hundred frames.',
  'export.dataExportNotebook': 'Open the companion notebook in Colab',

  // --- footer ----------------------------------------------------------------
  'footer.theme.hint':
    'Change the interface color scheme. Observatory uses red chrome to preserve night vision; Daylight suits bright rooms and projectors (T cycles).',
  'footer.attribution.hint': 'Carl Ziegler: author of Gravitas',
  'footer.attribution.hint.2':
    'What the physics engine has been checked against: 135 checks with measured error, stated tolerance, and a reason for every tolerance. Runs live in your browser.',
  'footer.attribution.hint.3':
    'Browse or contribute to the source code on GitHub',
  'footer.attribution': 'Validated',

  // --- gallery ---------------------------------------------------------------
  'gallery.closeScenarioList.hint': 'Close the scenario gallery',
  'gallery.scenarioListCloseChip.hint': 'Close the scenario gallery',
  'gallery.scenarioSearch.hint':
    'Filter by name, description or concept. Try "neutron", "merger", "tides" or "kepler". Enter loads the first result.',
  'gallery.scenarioListCloseChip.label': 'Close',
  'gallery.scenarioSearch.label': 'Search scenarios',
  'gallery.scenarioSearch.placeholder':
    'Search scenarios, objects, or concepts…',
  'gallery.scenarioBrowserTitle': 'Explore scenarios',
  'gallery.scenarioConceptsLabel': 'Browse by concept',
  'gallery.scenarioSearchEmpty': 'All',

  // --- inspector -------------------------------------------------------------
  'inspector.inspectorPin.hint': 'Pin a copy for comparison',
  'inspector.inspectorDelete.hint': 'Delete this object',
  'inspector.inspectorClose.hint': 'Close (Esc)',
  'inspector.inspectorPin.label': 'Pin a copy of this object for comparison',
  'inspector.inspectorDelete.label': 'Delete this object',
  'inspector.inspectorClose.label': 'Close the inspector',
  'inspector.objectInspector.label': 'Inspector views',
  'inspector.pinnedInspectors.label': 'Pinned objects',
  'inspector.inspectorTitle': 'Object',
  'inspector.inspectorTabDetails': 'Details',
  'inspector.inspectorTabEnergy': 'Energy',

  // --- lecture ---------------------------------------------------------------
  'lecture.lectureBar.label': 'Lecture',

  // --- rail ------------------------------------------------------------------
  'rail.railScenario.hint': 'Show or hide the scenario controls',
  'rail.loadScenario.hint':
    'Browse the built-in scenarios by image, concept or keyword: from the Solar System to the GW150914 black-hole merger.',
  'rail.investigations.hint':
    'Guided lessons that walk you through a concept step by step, with questions and an optional lab report you can submit',
  'rail.settings.hint':
    'Open the full settings panel: object counts, gravity, visuals and performance. Structural changes restart the simulation; the rest apply live.',
  'rail.refreshScenario.hint':
    'Rebuild the current scenario from scratch, discarding anything you have added or changed.',
  'rail.resetAll.hint':
    'Restore every setting to its factory default and load the Binary Black Hole scenario.',
  'rail.cleanSim.hint':
    'Clear the universe to empty space so you can build a system from nothing by clicking and dragging.',
  'rail.railState.hint': 'Show or hide the state controls',
  'rail.save.hint':
    'Save the current objects, settings and view to this browser. Only one save slot; saving again overwrites it.',
  'rail.load.hint': 'Restore the simulation you last saved in this browser.',
  'rail.undo.hint': 'Remove the last object you placed (Z)',
  'rail.share.hint':
    'Create a link that reopens this exact simulation: hand it out as an assignment, or send back what you built (K)',
  'rail.exportData.hint':
    'Download the recorded simulation as CSV: positions, velocities and energies over time, and the light curve if it is running. Open them in Excel, or in the companion Python notebook (E)',
  'rail.railTools.hint': 'Show or hide the tools controls',
  'rail.unitToggle.hint': 'Switch between physical and simulation units (U)',
  'rail.referenceFrameSelect.hint':
    'Re-express every position, and every trail, in the frame of the barycenter or of the selected object. Unlike Follow Mode this redraws the paths themselves, so the Solar System seen from Earth shows Mars looping backwards.',
  'rail.toggleRuler.hint':
    'Lay a ruler across the scene. Drag either end onto whatever you want the distance between; the reading is given in AU and in kilometres, and it is anchored to the world, so panning and zooming move the ruler with the things it is measuring rather than changing what it says.',
  'rail.toggleProtractor.hint':
    'Measure an angle. Drag the middle handle onto the corner and the two outer handles along the directions you want the angle between - a velocity and a line to the star, say, which on an eccentric orbit is ninety degrees only at periapsis and apoapsis.',
  'rail.toggleStopwatch.hint':
    "Time things in simulated time, so pausing pauses the clock and the simulation speed does not change what you measure. With a body selected you can latch it to that body's periapsis passages and read its period off directly.",
  'rail.stopwatchMark.hint': 'Start timing from now',
  'rail.stopwatchStop.hint': 'Freeze the current reading',
  'rail.stopwatchLatch.hint':
    "Latch onto the selected body's periapsis passages, so each lap is one orbit measured from closest approach",
  'rail.stopwatchReset.hint': 'Back to zero',
  'rail.record.hint':
    'Record a clip of the simulation as it runs: an MP4 where the browser can encode one, a WebM where it cannot. The scenario name, the scale bar and the simulated clock are burned into every frame, so the clip documents itself in a slide. Recording stops itself at 3 minutes or 80 MB, whichever comes first.',
  'rail.record.stop.hint': 'Stop recording and save the clip',
  'rail.screenshot.hint':
    'Take a screenshot (or press P). The scale bar, the elapsed simulated time and any measurement tools you have out are drawn on the canvas itself, so the image documents its own scale and its own clock.',
  'rail.toggle3DView.hint':
    'Open a 3D view of the gravity well: a rubber-sheet grid that dips around each mass. Drag to orbit, scroll to zoom.',
  'rail.toggleLightCurve.hint':
    'Open the transit photometry panel: a live brightness-vs-time graph of the starlight reaching a chosen observer. Drag the observer handle on the simulation, or use the angle slider, to change viewing direction: planets crossing the star carve dips in the curve, the same way real exoplanets are detected.',
  'rail.toggleRadialVelocity.hint':
    "Open the radial velocity panel: the star's motion toward and away from us, measured the way a spectrograph measures it. A planet pulls its star around their common center of mass, and the size of that wobble is what tells us the planet's mass.",
  'rail.toggleRotationCurve.hint':
    'Open the rotation curve panel: orbital speed against distance from the center, one point per body, drawn against the speeds the visible mass alone would produce. Switch on the dark-matter halo and watch a falling curve flatten.',
  'rail.toggleAstrometry.hint':
    'Open the astrometry panel: the tiny ellipse the star traces across the sky as its planet swings it around their common center of mass. Where radial velocity fails on a face-on orbit, astrometry works best.',
  'rail.slowDown.hint': 'Decrease speed by 0.5x',
  'rail.speedUp.hint': 'Increase speed by 0.5x',
  'rail.resetView.hint': 'Recenter the camera and return to 1× zoom (R).',
  'rail.shortcuts.hint': 'Keyboard shortcuts (?)',
  'rail.railLearn.hint': 'Show or hide the learn controls',
  'rail.aboutGravitas.hint':
    'What Gravitas is, what you can do here, and where to start',
  'rail.railLearnBody.hint':
    'How Gravitas models the universe: what the simulation calculates, approximates and visualizes',
  'rail.railLearnBody.hint.2':
    'Teaching guides, answer keys and a curriculum map for instructors',
  'rail.railLearnBody.hint.3': 'Open the Gravitas user manual (PDF)',
  'rail.objectType.hint':
    'Choose what to add, then click the canvas to place it',
  'rail.mainControls.label': 'Simulation controls',
  'rail.railToolsBody.label': 'Measurement tools',
  'rail.slowDown.label': 'Decrease speed',
  'rail.speedUp.label': 'Increase speed',
  'rail.objectType.label': 'Choose an object to add',
  'rail.railScenario': 'Scenario',
  'rail.loadScenario': 'Load Scenario',
  'rail.investigations': '🎓 Investigations',
  'rail.settings': 'Settings',
  'rail.refreshScenario': 'Refresh Scenario',
  'rail.resetAll': 'Reset to Default',
  'rail.cleanSim': 'Blank Simulation',
  'rail.railState': 'State',
  'rail.save': 'Save State',
  'rail.load': 'Load State',
  'rail.undo': 'Undo Placement',
  'rail.share': '🔗 Share Link',
  'rail.exportData': '📊 Export Data',
  'rail.railTools': 'Tools',
  'rail.unitToggle': 'Physical units',
  'rail.railToolsBody': 'Frame',
  'rail.referenceFrameSelect': 'World',
  'rail.referenceFrameSelect.2': 'Barycenter',
  'rail.referenceFrameSelect.3': 'Selected object',
  'rail.toggleRuler': '📏 Ruler',
  'rail.toggleProtractor': '📐 Protractor',
  'rail.toggleStopwatch': '⏱ Stopwatch',
  'rail.stopwatchMark': '⚑ Mark',
  'rail.stopwatchStop': '■ Stop',
  'rail.stopwatchLatch': '⌖ Periapsis',
  'rail.stopwatchReset': '↺ Reset',
  'rail.screenshot': '📸 Screenshot',
  'rail.record': '🎬 Record Clip',
  'rail.record.stop': '⏹ Stop Rec',
  'capture.caption.sandbox': 'Gravitas sandbox',
  'capture.record.saved': 'Clip saved - {s}, {mb} MB',
  'capture.record.cappedSize':
    'Clip saved at the 80 MB size cap - {mb} MB. Record shorter stretches for a longer sequence.',
  'capture.record.cappedTime': 'Clip saved at the 3 minute limit - {mb} MB.',
  'capture.record.failed': 'Recording produced no video. Nothing was saved.',
  'capture.record.unsupported':
    'This browser cannot record the canvas. Safari and older browsers lack the WebM recorder; Chrome, Edge and Firefox have it.',
  'rail.toggle3DView': 'Spacetime View',
  'rail.toggleLightCurve': 'Light Curve',
  'rail.toggleRadialVelocity': 'Radial Velocity',
  'rail.toggleRotationCurve': 'Rotation Curve',
  // --- The divergence instrument ---------------------------------------------
  // --- The resonance instruments (js/resonanceWidgets.js) --------------------
  'resW.periods.title': 'Measured periods and the ratios between them',
  'resW.periods.note':
    'Periods are measured from the orbits themselves and averaged over the whole run, not read from a table. The nearest small-integer ratio is found by continued fractions, which will find one for any number at all — so the last figure on each row, how much closer than chance the ratio is, matters more than the ratio.',
  'resW.periods.axis': 'orbital period, logarithmic',
  'resW.periods.scaled': 'scale model: distances ×100, clock ×1000',
  'resW.periods.true': 'true scale',
  'resW.angle.title': 'The resonant angle',
  'resW.angle.note':
    'Top: the angle wrapped into one turn. If it visits every value the bodies take up every relative geometry in turn and there is no resonance. Bottom: the same angle unwrapped, where a circulation is a ramp and a libration is a wave. The verdict is made from the lower plot, and it is allowed to be "cannot tell yet".',
  'resW.conj.title': 'Where the two bodies line up',
  'resW.conj.note':
    'Every conjunction in the run, plotted twice: where it happened in the sky, and where the outer body was on its own orbit at the time. A resonance shows up as a clump in the second dial — and if that clump sits at 180°, every line-up happens at the outer body’s aphelion.',
  'resW.conj.sky': 'longitude in the sky',
  'resW.conj.orbit': 'position on the outer orbit',
  'resW.frame.title': 'The rotating frame',
  'resW.frame.note':
    'The same system seen from a frame turning with the secondary, which is fixed at the right and one unit out. L4 and L5 are the two triangular equilibrium points. In this frame a co-orbital body draws a closed loop around one of them; a body that is not co-orbital goes right round.',
  'resW.plot.wrapped': 'angle, wrapped into 0–360°',
  'resW.plot.unwrapped': 'the same angle, unwrapped',
  'resW.empty.no-world': 'no system loaded',
  'resW.empty.warming-up': 'watching — let the simulation run',
  'resW.empty.no-argument':
    'this system has no pair for the requested argument',
  'resW.empty.no-pair': 'the named bodies are not both here',
  'resW.empty.no-secondary': 'no secondary body to build a rotating frame on',
  'resW.empty.no-conjunctions': 'no line-up has happened yet',
  'resW.row.status': 'Status',
  'resW.row.argument': 'Argument',
  'resW.row.ratio': 'P({a}) / P({b})',
  'resW.row.watched': 'Watched for',
  'resW.row.verdict': 'Verdict',
  'resW.row.centre': 'Libration centre',
  'resW.row.amplitude': 'Amplitude',
  'resW.row.libration': 'Libration period',
  'resW.row.circulation': 'Circulation period',
  'resW.row.needed': 'What is missing',
  'resW.row.sampling': 'Sampling',
  'resW.row.pair': 'Pair',
  'resW.row.count': 'Conjunctions seen',
  'resW.row.skySpread': 'Spread in the sky',
  'resW.row.orbitSpread': 'Spread on the outer orbit',
  'resW.row.where': 'Which means',
  'resW.row.frame': 'Frame turns with',
  'resW.value.periodDays': '{days} days',
  'resW.value.periodYears': '{years} years',
  'resW.value.ratio':
    '{ratio} — nearest {p}:{q}, off by {off}% ({chance}× closer than chance)',
  'resW.value.watched': '{cycles} conjunction cycles ({days} days)',
  'resW.value.amplitudeBound': 'at least ±{amp}° — it has not turned back yet',
  'resW.value.librationPeriod':
    '{days} days = {cycles} conjunction cycles ({certainty})',
  'resW.value.measured': 'measured',
  'resW.value.provisional': 'from one swing, provisional',
  'resW.value.librationUnresolved':
    'longer than this run — any circulation would take over {cycles} conjunction cycles',
  'resW.value.circulationPeriod': '{days} days = {cycles} conjunction cycles',
  'resW.value.needed':
    'the angle has moved {drift}° so far; that is a libration of at least that width or a circulation taking {cycles} conjunction cycles, and nothing here separates them',
  'resW.value.sampling': '{n} samples, one every {every} days',
  'resW.value.spread': 'centred on {mean}°, spread ±{spread}°',
  'resW.value.tadpole': '{kind} about {centre}°, amplitude ±{amp}°',
  'resW.verdict.none': 'nothing measured yet',
  'resW.verdict.circulation':
    'CIRCULATION — the angle runs through every value, so there is no resonance',
  'resW.verdict.libration':
    'LIBRATION — the angle turns back rather than going round: the bodies are locked',
  'resW.verdict.stationary':
    'EQUILIBRIUM — the angle has not moved at all: this body is sitting at a Lagrange point',
  'resW.verdict.librationProvisional':
    'LIBRATION — the angle turned back and returned to where it began; one more reversal will confirm the period',
  'resW.inconclusive.one-reversal':
    'INCONCLUSIVE — it has turned back once, which a slowly circulating angle with a wobble on it also does',
  'resW.inconclusive.drifting-centre':
    'INCONCLUSIVE — it swings, but each swing ends further on than the last, so the centre is moving',
  'resW.inconclusive.confined':
    'INCONCLUSIVE — confined so far, but it has not turned back yet, and a slow enough circulation would look the same',
  'resW.inconclusive.ambiguous-drift':
    'INCONCLUSIVE — this run cannot tell a wide libration from a slow circulation',
  'resW.inconclusive.too-few-samples': 'INCONCLUSIVE — not enough samples yet',
  'resW.inconclusive.too-short':
    'INCONCLUSIVE — the run is shorter than twenty conjunction cycles',
  'resW.inconclusive.undersampled':
    'INCONCLUSIVE — the angle is moving too fast between samples to follow',
  'resW.inconclusive.no-window': 'INCONCLUSIVE — no time has passed',
  'resW.where.aphelion':
    'every line-up happens near the outer body’s aphelion, at its furthest',
  'resW.where.perihelion':
    'every line-up happens near the outer body’s perihelion, at its closest',
  'resW.where.side': 'the line-ups cluster, but away from either apse',
  'resW.where.scattered': 'the line-ups are spread all round the orbit',
  'resW.kind.tadpole': 'tadpole',
  'resW.kind.horseshoe': 'horseshoe',
  'chaosW.title': 'How far apart the two runs are',
  'chaosW.note':
    'The distance between Run A and Run B, added up over every body and matched by identity, at each moment of simulated time. The same data on two axes: linear above, logarithmic below. A straight line on the lower plot is exponential growth.',
  'chaosW.plot.linear': 'separation, linear scale',
  'chaosW.plot.log': 'separation, logarithmic scale',
  'chaosW.plot.empty': 'not enough overlapping samples',
  'chaosW.axis.separation': 'separation',
  'chaosW.axis.logSeparation': 'log₁₀ separation',
  'chaosW.axis.time': 'simulated time →',
  'chaosW.empty.no-runs':
    'Record Run A and Run B in the A/B Bench, then come back.',
  'chaosW.empty.no-overlap':
    'The two runs do not overlap in simulated time. Record them for similar lengths.',
  'chaosW.row.status': 'Status',
  'chaosW.row.perturbation': 'Perturbation',
  'chaosW.row.start': 'Separation at the start',
  'chaosW.row.end': 'Separation at the end',
  'chaosW.row.growth': 'Grew by',
  'chaosW.row.behaviour': 'Behaviour',
  'chaosW.row.window': 'Fitted over',
  'chaosW.row.noEstimate': 'No e-folding time because',
  'chaosW.row.straightLine': 'A straight line fits',
  'chaosW.row.refinement': 'Under refinement',
  'chaosW.value.perturbation': '{body}, {axis}, {km}',
  'chaosW.value.window': 't = {from} to {to} s  ({efolds} e-folds)',
  'chaosW.value.resolved': 'resolved — the e-folding times agree to {spread}%',
  'chaosW.verdict.none': 'nothing measured yet',
  'chaosW.verdict.identical':
    'the two runs are identical — the simulation is deterministic',
  'chaosW.verdict.bounded': 'bounded: the two runs stay close',
  'chaosW.verdict.linear':
    'growing in proportion to time — that is drift, not chaos',
  'chaosW.verdict.saturated':
    'saturated: the runs are as far apart as this system allows',
  'chaosW.verdict.exponential':
    'exponential, e-folding time {tau} s  (r² = {r2})',
  'chaosW.reject.too-few-points': 'too few usable samples to fit anything',
  'chaosW.reject.too-little-range':
    'the separation did not grow through enough e-folds. Under three, a straight line can imitate an exponential.',
  'chaosW.reject.too-short':
    'the fitted interval is shorter than two e-folding times',
  'chaosW.reject.poor-fit':
    'an exponential does not fit this well enough to quote a timescale',
  'chaosW.reject.not-growing': 'the separation is not growing',
  'chaosW.reject.no-window': 'no interval of the run is usable for a fit',
  'chaosW.reject.insufficient': 'not enough data',
  'chaosW.unresolved.need-two-estimates':
    'record the comparison again with a smaller timestep or another integrator',
  'chaosW.unresolved.behaviour-changed':
    'NOT RESOLVED — the behaviour itself changed with the numerics',
  'chaosW.unresolved.timescale-moved':
    'NOT RESOLVED — the e-folding time moved with the timestep, so it is a property of the integrator',
  // --- A/B experiment bench --------------------------------------------------
  'rail.toggleExperiments': 'A/B Bench',
  'rail.toggleExperiments.hint':
    'Open the A/B experiment bench: capture a starting state, record a baseline run, return to exactly that start, change one variable and record a second run, then compare the two on the same simulated-time axis.',
  'bench.title': 'A/B Experiment',
  'bench.untitled': 'Untitled experiment',
  'bench.copyOf': 'Copy of {name}',
  'bench.status.idle': 'No experiment',
  'bench.status.recording': 'Recording - {n} samples, {seconds} s',
  'bench.status.runs': '{n} of 2 runs recorded',
  'bench.field.name': 'Name',
  'bench.field.namePlaceholder': 'What are you testing?',
  'bench.field.primary': 'Measure distance from',
  'bench.field.chart': 'Chart',
  'bench.primary.none': 'Nothing selected',
  'bench.section.selection': 'What to measure',
  'bench.section.saved': 'Saved experiments',
  'bench.hint.selection':
    'Pick the bodies this experiment is about, then the quantities to record. A quantity that needs two bodies stays greyed out until two are chosen.',
  'bench.hint.noBodies': 'Capture a starting state first.',
  'bench.action.capture': 'Capture start',
  'bench.action.restore': 'Return to start',
  'bench.action.record': 'Record',
  'bench.action.recording': 'Recording',
  'bench.action.stop': 'Stop',
  'bench.action.save': 'Save',
  'bench.action.save.hint': 'Keep this experiment in this browser',
  'bench.action.close.hint': 'Hide the experiment bench',
  'bench.action.csv': 'Export CSV',
  'bench.action.json': 'Export JSON',
  'bench.action.share': 'Share setup',
  'bench.action.duplicate': 'Duplicate',
  'bench.action.import': 'Open a file',
  'bench.action.delete': 'Delete this experiment',
  'bench.action.confirmMultivariable': 'Yes, I changed these on purpose',
  'bench.section.perturb': 'Perturb the start',
  'bench.hint.perturb':
    'Change one coordinate of one body in the captured start by a very small amount. Run B is then restored to that perturbed state, so the two runs differ by exactly this and nothing else.',
  'bench.field.amount': 'Amount (km, or km/s)',
  'bench.axis.x': 'x position',
  'bench.axis.y': 'y position',
  'bench.axis.vx': 'x velocity',
  'bench.axis.vy': 'y velocity',
  'bench.action.perturb': 'Apply',
  'bench.action.asControl': 'Record as numerical control',
  'bench.perturb.applied':
    'Perturbed: {body}, {axis}, {km} km — one part in {fraction} of the system',
  'bench.perturb.done': 'The captured start is perturbed',
  'bench.perturb.needAmount': 'Type a perturbation that is not zero.',
  'bench.perturb.noExperiment': 'Capture a start first.',
  'bench.perturb.no-bodies':
    'This captured start has no bodies to perturb. Capture with the full state.',
  'bench.perturb.no-such-body': 'That body is not in the captured start.',
  'bench.perturb.bad-axis': 'That is not a coordinate.',
  'bench.perturb.bad-delta': 'Type a perturbation that is not zero.',
  'bench.control.row': '{label}: {behaviour}, e-folding {tau} s',
  'bench.control.recorded': 'Recorded as a control: {label}',
  'bench.control.failed':
    'Record both runs first, with positions among the measurements.',
  'bench.run.a': 'Run A',
  'bench.run.b': 'Run B',
  'bench.run.empty': 'not recorded',
  'bench.run.recorded': '{n} samples over {seconds} s',
  'bench.start.captured': 'Start: {scenario}, seed {seed}, state {hash}',
  'bench.diff.heading': 'What changed between the runs',
  'bench.diff.none': 'Nothing. Both runs used the same settings.',
  'bench.diff.incidental':
    'Also different, but not experimental variables: {list}',
  'bench.table.metric': 'Quantity',
  'bench.table.delta': 'B - A',
  'bench.table.fraction': 'Fractional',
  'bench.chart.time': 'Simulated time (s)',
  'bench.chart.label': 'Run A against Run B on a shared simulated-time axis',
  'bench.metric.position': 'Position',
  'bench.metric.separation': 'Separation',
  'bench.metric.speed': 'Speed',
  'bench.metric.velocity_x': 'Velocity, x',
  'bench.metric.velocity_y': 'Velocity, y',
  'bench.metric.distance_to_primary': 'Distance from primary',
  'bench.metric.orbital_period': 'Orbital period',
  'bench.metric.closest_approach': 'Closest approach',
  'bench.metric.total_energy': 'Total energy',
  'bench.metric.angular_momentum': 'Angular momentum',
  'bench.metric.energy_drift': 'Energy drift',
  'bench.metric.angular_drift': 'Angular momentum drift',
  'bench.metric.needs': 'Select {n} bodies to measure this',
  'bench.warn.noChange':
    'Both runs used identical settings, so any difference between them is numerical, not physical.',
  'bench.warn.multivariable':
    '{n} things changed between the runs, not one: {list}. A comparison with more than one independent variable cannot say which one caused the difference.',
  'bench.warn.identical': 'The two runs started from the same state.',
  'bench.warn.noOverlap':
    'The two runs do not overlap in simulated time, so {metric} cannot be compared.',
  'bench.warn.uneven':
    'Run {run} was sampled unevenly - its longest gap is {ratio}x its shortest. Values between samples are interpolated.',
  'bench.flash.captured': 'Start captured',
  'bench.flash.restored': 'Back to the captured start',
  'bench.flash.restoredDrift':
    'Restored, but the state hash differs - see the manifest',
  'bench.flash.stopped': 'Run recorded',
  'bench.saved': 'Experiment saved',
  'bench.saved.none': 'Nothing saved yet.',
  'bench.imported': 'Opened {name}',
  'bench.quota': '{used} KB of {total} KB used, {count} of {max} experiments',
  'bench.error.tooLarge':
    'That experiment is {size} KB and the limit is {limit} KB. Export it to a file instead.',
  'bench.error.storeFull':
    'Saved experiments would exceed {limit} KB. Delete one, or export this to a file.',
  'bench.error.tooMany':
    'You already have {limit} saved experiments. Delete one to make room.',
  'bench.error.quota':
    'This browser refused to store the experiment. Export it to a file instead.',
  'bench.error.unavailable':
    'This browser has no local storage available, so experiments cannot be kept between visits. Export to a file instead.',
  'bench.error.open': 'That experiment could not be opened ({reason}).',
  'bench.error.import': 'That file could not be read ({reason}).',
  'bench.error.load': 'The experiment bench could not be loaded.',
  'rail.toggleAstrometry': 'Astrometry',
  'rail.slowDown': '⏪ Slow',
  'rail.speedUp': 'Fast ⏩',
  'rail.resetView': 'Reset View',
  'rail.shortcuts': 'Shortcuts',
  'rail.railLearn': 'Learn',
  'rail.aboutGravitas': 'About Gravitas',
  'rail.railLearnBody': 'How the model works',
  'rail.railLearnBody.2': 'Instructor resources',
  'rail.railLearnBody.3': 'User manual (PDF)',
  'rail.objectType': '⭐ Add object',
  'rail.objectType.choose': 'Add object',
  'rail.objectType.placing': 'Click to place · Esc',
  'rail.objectType.stop': 'Stop adding',

  // --- readout ---------------------------------------------------------------
  'readout.overlayMinimize.hint': 'Minimize',
  'readout.sonificationToggle.hint': 'Enable procedural sonification',
  'readout.closeScenarioInfo.hint': 'Dismiss this scenario description',
  'readout.closeMobileInstructions.hint': 'Dismiss these touch instructions',
  'readout.mobileInstructions': 'Touch controls',
  'readout.mobileInstructions.2': 'Drag:',
  'readout.mobileInstructions.3': 'Pinch:',
  'readout.mobileInstructions.4': 'Tap an object:',
  'readout.mobileInstructions.5': 'Press and hold, then drag:',
  'readout.mobileInstructions.6': 'Double tap:',
  'readout.closeMobileInstructions': 'Got it!',

  // --- settings --------------------------------------------------------------
  'settings.settingsCloseChip.hint': 'Close settings without applying changes',
  'settings.settingsApply.hint':
    'Apply these settings. Changing object counts, placement or scenario rebuilds the simulation; everything else takes effect immediately.',
  'settings.settingsReset.hint':
    'Reset every setting in this panel back to its default value (does not apply until you press Apply).',
  'settings.settingsCancel.hint': 'Discard these changes and close the panel.',
  'settings.demoMode.hint':
    'Start demo mode - cycles through scenarios automatically',
  'settings.bhMassesCloseChip.hint': 'Close without changing the masses',
  'settings.bhMassesDone.hint': 'Confirm these black hole masses and close',
  'settings.settingsCloseChip.label': 'Close',
  'settings.bhMassesCloseChip.label': 'Close',
  'settings.settingsPanel': 'Simulation Settings',
  'settings.settingsApply': 'Apply & Restart',
  'settings.settingsReset': 'Reset to Defaults',
  'settings.settingsCancel': 'Cancel',
  'settings.demoMode': '🎬 Demo Mode',
  'settings.bhMassesDone': 'Done',

  // --- share -----------------------------------------------------------------
  'share.shareClose.hint': 'Close without copying',
  'share.shareCloseChip.hint': 'Close without copying',
  'share.shareKindSeeded.hint':
    'The scenario, its seed and any settings you changed. Short enough to paste anywhere, and rebuilds the same starting system every time.',
  'share.shareKindFull.hint':
    "Every object's position, velocity and mass, written out. Use this once the simulation has run, or after you have placed objects by hand.",
  'share.shareCopy.hint': 'Copy the link to the clipboard',
  'share.shareSeed.hint':
    'The number this system was generated from. Type one and press Enter to rebuild: give the same seed to a whole class and everyone sees the same system.',
  'share.shareReroll.hint': 'Rebuild this scenario from a new random seed',
  'share.shareCloseChip.label': 'Close',
  'share.shareContent.label': 'What the link carries',
  'share.shareTitle': 'Share this simulation',
  'share.shareContent':
    'Anyone who opens this link lands on exactly this system: no account, no setup, nothing stored on a server.',
  'share.shareKindSeeded': 'Starting setup',
  'share.shareKindSeeded.2': 'Short link. Rebuilds this system from its seed.',
  'share.shareKindFull': 'Exact state now',
  'share.shareKindFull.2': 'Longer link. Carries every object where it stands.',
  'share.shareContent.2': 'Open at the same zoom and position',
  'share.shareContent.3': 'Shareable link',
  'share.shareCopy': 'Copy',
  'share.shareStale': 'Exact state now',
  'share.shareWarning':
    'This link is long enough that some mail clients and course tools will break it across lines. Share the starting setup instead where you can, or attach the link as a file.',
  'share.shareSeedRow': 'Seed',
  'share.shareReroll': 'New',
  'share.shareContent.4':
    'The seed decides every randomised detail of this scenario. Hand out the same seed and everyone gets the same system to measure.',

  // --- tour ------------------------------------------------------------------
  'tour.tutorialClose.hint': 'Close the tour (Esc)',
  'tour.tutorialPrev.hint': 'Back to the previous step (left arrow)',
  'tour.tutorialNext.hint': 'On to the next step (right arrow)',
  'tour.tutorialPopup.label': 'Guided tour',
  'tour.tutorialClose.label': 'Close the tour',
  'tour.tutorialPopup': 'Guided tour',
  'tour.tutorialPrev': 'Back',
  'tour.tutorialNext': 'Next',

  // --- transport -------------------------------------------------------------
  'transport.timelinePlay.hint': 'Pause (Space)',
  'transport.timelineStepBack.hint': 'Step back (,)',
  'transport.timelineStepFwd.hint': 'Step forward (.)',
  'transport.timelineScrubber.hint':
    'Drag to rewind through recorded history. The simulation holds on the frame you land on until you return to live.',
  'transport.timelineLive.hint': 'Return to live (L)',
  'transport.timelineBar.label': 'Playback and timeline',
  'transport.timelinePlay.label': 'Pause simulation',
  'transport.timelineStepBack.label': 'Step back one frame',
  'transport.timelineStepFwd.label': 'Step forward one frame',
  'transport.timelineScrubber.label':
    'Scrub through recorded simulation history',
  'transport.timelineLive': '● LIVE',

  // --- welcome ---------------------------------------------------------------
  'welcome.welcomeClose.hint': 'Close and enter the sandbox',
  'welcome.welcomeClose.label': 'Close and enter the sandbox',

  // --- Themes ----------------------------------------------------------------
  'theme.midnight.label': 'Midnight',
  'theme.midnight.hint': 'Default. Near-black, high contrast.',
  'theme.deep.label': 'Deep Space',
  'theme.deep.hint': 'Softer blue, lifted surfaces.',
  'theme.observatory.label': 'Observatory',
  'theme.observatory.hint': 'Red chrome: preserves night vision.',
  'theme.daylight.label': 'Daylight',
  'theme.daylight.hint': 'Light UI for bright rooms.',

  // --- Transient messages ----------------------------------------------------
  // Toasts and the polite live region. Short by construction: they appear for a
  // second and a half over a simulation, and a sentence that needs reading
  // twice has already failed.
  'toast.undo.removed': 'Removed last placed object',
  'toast.undo.nothing': 'Nothing to undo',
  'toast.timeline.live': 'Back to live',
  'toast.view.reset': 'View reset',
  'toast.units.showing': 'Showing {units}',
  'toast.theme.changed': 'Theme: {theme}',
  'toast.speed.changed': 'Speed {speed}\u00d7',
  'toast.placement.armed': 'Drag to aim \u00b7 release to place {object}',

  // --- Sharing ---------------------------------------------------------------
  'share.link.copied': 'Link copied',
  'share.link.copyFailed': 'Press Ctrl/Cmd + C to copy the link',
  'share.link.failed': 'That link could not be opened.',
  'share.link.opened': {
    one: 'Opened a shared simulation: {scenario}, {n} object.',
    other: 'Opened a shared simulation: {scenario}, {n} objects.',
  },

  // --- Data export -----------------------------------------------------------
  'export.empty': 'There is nothing recorded to export yet.',
  'export.failed': 'Could not build that file.',
  'export.done': { one: 'Exported {n} row.', other: 'Exported {n} rows.' },
  'export.truncated':
    'Exported the first {n} rows: the recording was larger than one file.',

  // --- Scenario card and sonification ----------------------------------------
  'scenarioCard.notice.mergingDisabled': 'Object merging is disabled',
  'scenarioCard.notice.mergingDisabledLong':
    'Object merging is disabled for this scenario',
  'readout.sonification.unavailable': 'Audio N/A',
  'readout.sonification.off': '\ud83d\udd07 Sound Off',
  'readout.sonification.on': '\ud83d\udd0a Sound On',
  'settings.tooltip.generic': 'This setting controls {label}.',

  'readout.toggle.show': 'Show readout',
  'readout.toggle.hide': 'Hide',
  'readout.toggle.show.hint':
    'Show the simulation readout: object counts, zoom, speed and controls',
  'readout.toggle.hide.hint': 'Collapse the readout panel',
  'readout.toggle.show.label': 'Show the simulation readout',
  // The integrator's stored value is the English name - the physics engine and
  // every share link use it as a key - and only the label is translated.
  'settings.option.integrator.symplectic-euler': 'Symplectic Euler',
  'settings.option.integrator.velocity-verlet': 'Velocity Verlet',
  'settings.option.integrator.rk4': 'RK4',

  // --- Canvas instrumentation ------------------------------------------------
  // Drawn onto the simulation canvas rather than into the page, so these land
  // in an exported screenshot along with everything else. The `v` and `a` on the
  // arrows themselves are symbols rather than words and stay as they are.
  'instrument.stopwatch': 'stopwatch',
  'instrument.stopwatch.latched': 'stopwatch \u00b7 {body} periapsis',
  'instrument.stopwatch.body': 'body',
  'instrument.stopwatch.waiting': 'waiting for periapsis',
  'instrument.stopwatch.idle': 'press Mark to start',
  'instrument.stopwatch.state.running': 'running',
  'instrument.stopwatch.state.paused': 'paused',
  'instrument.stopwatch.state.stopped': 'stopped',
  'instrument.stopwatch.state.idle': 'idle',
  'instrument.stopwatch.mean': {
    one: 'mean of {n} lap',
    other: 'mean of {n} laps',
  },
  'vector.velocity': 'velocity',
  'vector.acceleration': 'acceleration',
  'vector.acceleration.total': 'acceleration, total',
  'vector.source': 'from {body}',

  // --- Readout counts and status ---------------------------------------------
  'readout.count.planets': 'Planets',
  'readout.count.gasGiants': 'Gas Giants',
  'readout.count.asteroids': 'Asteroids',
  'readout.count.stars': 'Stars',
  'readout.count.neutronStars': 'Neutron Stars',
  'readout.count.whiteDwarfs': 'White Dwarfs',
  'readout.count.blackHoles': 'Black Holes',
  'readout.count.particles': 'Particles',
  'readout.count.debris': 'Debris',
  'readout.count.galaxies': 'Galaxies',
  'readout.zoom': 'Zoom',
  'readout.speed': 'Sim Speed',
  'readout.status.paused': 'Paused',
  'readout.status.running': 'Running',

  // --- Why a configuration cannot conserve anything --------------------------
  // Shown under the conservation readout. Each one is a deliberate
  // simplification documented in js/physics.js, and naming it is what stops the
  // drift figure being blamed on the integrator.
  'caveat.staticBlackHole': 'a static black hole pulls without being pulled',
  'caveat.oneWayGravity': 'gravity is one-way: only some bodies are sources',
  'caveat.halo': 'the halo is a fixed background field',
  'caveat.orbitDecay': 'black-hole orbits are being damped',
  'caveat.merging': 'mergers and collisions are enabled',
  'caveat.tidalDisruption':
    'tidal stripping near a black hole removes mass from bodies',

  // --- Canvas overlay labels -------------------------------------------------
  'overlay.stableOrbit': 'Stable Orbit',
  'overlay.equalAreas': "Kepler's 2nd Law: Equal Areas",

  // --- Scenario gallery ------------------------------------------------------
  'gallery.subtitle':
    '{n} systems to explore. Search by name or concept, or browse the curriculum topics below.',
  'gallery.chip.all': 'All',
  // Four whole sentences rather than one built from fragments: a translator has
  // to be able to reorder the count, the concept and the query, and Spanish
  // does not put them where English does.
  'gallery.results.all': { one: '{n} scenario', other: '{n} scenarios' },
  'gallery.results.concept': {
    one: '{n} scenario in {concept}',
    other: '{n} scenarios in {concept}',
  },
  'gallery.results.search': {
    one: '{n} scenario matching \u201c{query}\u201d',
    other: '{n} scenarios matching \u201c{query}\u201d',
  },
  'gallery.results.searchInConcept': {
    one: '{n} scenario in {concept} matching \u201c{query}\u201d',
    other: '{n} scenarios in {concept} matching \u201c{query}\u201d',
  },

  // --- Settings chrome -------------------------------------------------------
  'settings.toggle.on': 'On',
  'settings.toggle.off': 'Off',
  'settings.info.about': 'Information about {label}',
  'settings.option.presetScenario.none': 'None',

  // --- Object inspector ------------------------------------------------------
  // The row headings the inspector prints beside a body's measured values. The
  // values themselves are numbers with unit symbols and are formatted by
  // js/format.js, which is deliberately locale-independent: a mass in an
  // exported dataset must not change its decimal separator with the interface
  // language.
  'inspector.stat.averageDensity': 'Average Density',
  'inspector.stat.chandrasekharLimit': 'Chandrasekhar Limit',
  'inspector.stat.density': 'Density',
  'inspector.stat.escapeVelocity': 'Escape Velocity',
  'inspector.stat.escapeVelocityAtRs': 'Escape Velocity at Rs',
  'inspector.stat.hawkingLifetime': 'Hawking Lifetime',
  'inspector.stat.hawkingTemperature': 'Hawking Temperature',
  'inspector.stat.iscoPeriod': 'ISCO Period',
  'inspector.stat.lifespan': 'Lifespan',
  'inspector.stat.luminosity': 'Luminosity',
  'inspector.stat.mass': 'Mass',
  'inspector.stat.orbitalPeriod': 'Orbital Period',
  'inspector.stat.position': 'Position',
  'inspector.stat.pulsar': 'Pulsar',
  'inspector.stat.radius': 'Radius',
  'inspector.stat.schwarzschildRadius': 'Schwarzschild Radius',
  'inspector.stat.spectralType': 'Spectral Type',
  'inspector.stat.speed': 'Speed',
  'inspector.stat.surfaceGravity': 'Surface Gravity',
  'inspector.stat.surfaceTemperature': 'Surface Temperature',
  'inspector.stat.tailLength': 'Tail Length',
  'inspector.stat.type': 'Type',
  'inspector.stat.velocity': 'Velocity',

  // --- Settings --------------------------------------------------------------
  // Section headings, control labels and the values of the option menus. The id
  // is built from the setting's key, which is the name the physics engine and
  // every saved link already use, so it is stable against any rewording.
  'settings.section.simulation': 'Simulation',
  'settings.section.performance': 'Performance',
  'settings.section.visuals': 'Visuals',
  'settings.section.black-holes': 'Black Holes',
  'settings.section.compact-objects': 'Compact Objects',
  'settings.section.objects': 'Objects',
  'settings.section.ui-control': 'UI & Control',
  'settings.section.educational': 'Educational',
  'settings.label.presetScenario': 'Preset Scenario',
  'settings.label.gravitationalConstant': 'Gravitational Constant',
  'settings.label.mutualGravity': 'Mutual Gravity (All)',
  'settings.label.simSpeed': 'Simulation Speed',
  'settings.label.simSize': 'Simulation Size',
  'settings.label.placement': 'Placement',
  'settings.label.integrator': 'Integrator',
  'settings.label.showConservationDiagnostics': 'Conservation Readout',
  'settings.label.useBarnesHut': 'Approximate Gravity (Barnes-Hut)',
  'settings.label.barnesHutTheta': 'Barnes-Hut Accuracy (theta)',
  'settings.label.adaptiveDetail': 'Adaptive Detail',
  'settings.label.trailColourMode': 'Trail Color',
  'settings.label.showObjectLensing': 'Gravitational Lensing',
  'settings.label.lensingQuality': 'Lensing Quality',
  'settings.label.diskDoppler': 'Accretion Disk Doppler Beaming',
  'settings.label.numBlackHoles': 'Number of Black Holes',
  // --- Galaxy gravity: the halo, MOND, and being careful about both ----------
  // --- dm-mond: the same curve, two explanations -----------------------------
  'dmW.mondTitle': 'The same curve, two explanations',
  'dmW.mondNote':
    'The halo fit and MOND, scored against the same measurements. Switch between them, and adjust the disc until each one matches. Watch what each of them needed to be told.',
  'dmW.mondModel': 'Explanation',
  'dmW.mondHaloOption': 'Dark matter halo',
  'dmW.mondMondOption': 'MOND',
  'dmW.mondPresetHalo': 'Best halo fit',
  'dmW.mondPresetMond': 'Best MOND fit',
  'dmW.mondPresetHaloNote':
    'The decomposition that generated this curve: a 3.3e10 disc and a halo whose flat speed and core radius were both adjusted until it matched. Three fitted numbers, and an exact match.',
  'dmW.mondPresetMondNote':
    'MOND with the disc it prefers: 2.1e10, about two thirds the halo fit’s stars, and no halo at all. One fitted number, and a match inside the error bars.',
  'dmW.mondShowing': 'Showing',
  'dmW.mondHaloRow': 'Halo fit',
  'dmW.mondMondRow': 'MOND fit',
  'dmW.mondThreeFitted': '3 fitted numbers',
  'dmW.mondOneFitted': '1 fitted number',
  'dmW.mondPredictedRow': 'MOND’s flat speed from this disc',
  'dmW.mondVerdict': 'What this shows',
  'dmW.mondInsideErrors': 'inside the error bars',
  'dmW.mondClose': 'close',
  'dmW.mondOff': 'off',
  'dmW.mondBothFit':
    'This explanation reproduces the measurements. So does the other one — at its own disc mass, and with a different number of fitted parameters. The curve alone does not decide between them.',
  'dmW.mondKeepAdjusting':
    'Not matching yet. Adjust the disc until this explanation reproduces the points, then try the other one.',
  'dmW.mondSynthetic': 'synthetic curve, NGC 3198 parameters',
  // --- The guided tour -------------------------------------------------------
  // Sixteen steps. Each is here because a reader who has not been told will not
  // guess it; anything discoverable by looking has been left out.
  'tutorial.stepCount': 'Step {n} of {total}',
  'tutorial.next': 'Next',
  'tutorial.finish': 'Finish',

  'tutorial.welcome.title': 'Welcome to Gravitas',
  'tutorial.welcome.body':
    "A sandbox for gravity, and a set of instruments for measuring it. Every body on screen is integrated from Newton's law of gravitation in real time: nothing here is on rails, pre-animated or scripted. If two stars merge, it is because their orbits actually brought them together.",
  'tutorial.welcome.tip':
    'This tour is sixteen steps and takes about three minutes. Use ← and → to move through it, or Escape to leave at any point.',

  'tutorial.choose.title': 'Choose what to add',
  'tutorial.choose.body':
    'This button opens a list of the eight kinds of object you can place: star, rocky planet, gas giant, asteroid, comet, white dwarf, neutron star and black hole. Each has its own mass range and its own behaviour. Choosing one <strong>arms</strong> the canvas — the button lights up and the cursor becomes a crosshair.',
  'tutorial.choose.tip':
    'Nothing is placed until you arm it, which is what stops a misjudged click on empty sky from adding a star you did not want. Press Escape, or the button again, to disarm.',

  'tutorial.place.title': 'Place it by dragging',
  'tutorial.place.body':
    'With a type chosen, press on empty space and drag before releasing. The direction and length of the drag set the launch velocity, so a short drag drops an object nearly at rest and a long one flings it away. A dashed line previews the path it will take.',
  'tutorial.place.tip':
    'Hold Shift while dragging to snap to a circular orbit around the nearest dominant mass. On a touch screen, press and hold first — a plain drag pans the view.',

  'tutorial.inspect.title': 'Inspect anything',
  'tutorial.inspect.body':
    'Click any object to open its inspector: mass, radius, temperature, orbital elements and composition, all computed from its actual state rather than looked up. The mass slider is live — push a star past about 20 solar masses and it will collapse into a black hole while you watch.',
  'tutorial.inspect.tip':
    'The Energy tab plots kinetic, potential and total energy against time. A flat total means a stable orbit; a drifting one means the orbit is decaying, the body is escaping, or the timestep is too coarse.',

  'tutorial.transport.title': 'Pause, step and speed up',
  'tutorial.transport.body':
    'The bar along the bottom controls time. Pause to study a configuration, step one frame at a time through a close encounter, or run fast to watch a system evolve over thousands of orbits.',
  'tutorial.transport.tip':
    'Space pauses and resumes. The comma and full stop keys step a single frame while paused, which is the only way to see what actually happens during a collision.',

  'tutorial.rewind.title': 'Rewind what just happened',
  'tutorial.rewind.body':
    'The same bar records history as the simulation runs. Drag the scrubber backwards to replay a merger or a slingshot you missed, then return to the present and carry on from where you were.',
  'tutorial.rewind.tip':
    'Press L to jump back to live. Rewinding does not undo anything — it is a replay of what happened, not a branch.',

  'tutorial.scenario.title': 'Start from a real system',
  'tutorial.scenario.body':
    'Fifty-three scenarios, from the Solar System and TRAPPIST-1 to GW150914, the first black-hole merger LIGO detected. Several are scale models and say so on their card. Search by name, or filter by concept.',
  'tutorial.scenario.tip':
    'Refresh Scenario rebuilds the current one from scratch if an experiment gets away from you. Every scenario is built from a seed, so the same seed gives the same world.',

  'tutorial.investigations.title': 'Guided investigations',
  'tutorial.investigations.body':
    'Twelve structured lessons that use the simulation as evidence rather than illustration. You measure something, predict what follows, and are told whether the prediction held. They cover Kepler’s laws, tides, black holes, exoplanet transits, chaos, orbital resonance and the case for dark matter.',
  'tutorial.investigations.tip':
    'Each one ends with a report you can export as a PDF, including your own measurements and answers. Progress is kept if you close the lesson and come back.',

  'tutorial.measure.title': 'Measure it yourself',
  'tutorial.measure.body':
    'A ruler, a protractor and a stopwatch that latches onto a body and times its orbit. These draw on the canvas itself, so a screenshot carries its own scale and its own clock.',
  'tutorial.measure.tip':
    'The scale bar and the elapsed simulated time are burned into every screenshot and every recorded clip, which is what makes an image taken here usable as a figure.',

  'tutorial.instruments.title': 'The instruments',
  'tutorial.instruments.body':
    'Five analysis panels that watch the running simulation: a transit light curve, a radial-velocity trace, an astrometric wobble plot, a rotation curve, and a three-dimensional view. They measure the bodies that are actually there — none of them is a canned animation.',
  'tutorial.instruments.tip':
    'The light curve, radial velocity and astrometry panels together are how every exoplanet you have heard of was found. Open all three on the same system and compare what each one can see.',

  'tutorial.rotation.title': 'Rotation curves, and two explanations',
  'tutorial.rotation.body':
    'The rotation-curve panel plots orbital speed against radius for every body, live, against what the visible mass alone predicts. In the galaxy scenarios you can choose which law governs the outskirts: visible matter only, visible matter plus a dark-matter halo, or MOND. They are mutually exclusive, and the panel labels which parameters were fitted and which are fixed.',
  'tutorial.rotation.tip':
    'Both the halo and MOND can be made to match the same curve. That is the point of the comparison, and the lesson says plainly that fitting a rotation curve does not establish which explanation is right.',

  'tutorial.bench.title': 'Compare two runs properly',
  'tutorial.bench.body':
    'The experiment bench captures a starting state, runs it, returns to exactly that state, lets you change one thing, and runs it again. It then compares the two and warns you if more than one variable moved between them.',
  'tutorial.bench.tip':
    'This is the difference between an experiment and a demonstration. Both runs can be exported, and a comparison can be shared as a link that reproduces the setup.',

  'tutorial.units.title': 'Units and themes',
  'tutorial.units.body':
    'Switch between physical units — astronomical units, solar masses, kilometres per second, years — and the raw simulation units the integrator works in. Four themes are available, including Observatory, which uses red chrome to preserve night vision, and Daylight for bright rooms.',
  'tutorial.units.tip':
    'Some scenarios are scale models rather than the real thing, and where that matters the panel says which physical scale it is reading through.',

  'tutorial.settings.title': 'Everything else',
  'tutorial.settings.body':
    'Sixty-three settings: the gravitational constant, the integrator, object counts, placement patterns, trail styles, visual effects and performance options. Structural changes rebuild the simulation; the rest take effect immediately.',
  'tutorial.settings.tip':
    'The search box at the top of the panel filters by name, so you do not have to remember which of the nine sections a setting lives in.',

  'tutorial.share.title': 'Take it with you',
  'tutorial.share.body':
    'Share a link that reproduces exactly what is on your screen — the scenario, the settings, the camera and the seed. Or take a screenshot, record a clip, or export the numbers behind any instrument as CSV.',
  'tutorial.share.tip':
    'A shared link can be opened in embed mode for a slide or a course page, and lecture mode strips the interface down for projection.',

  'tutorial.done.title': 'You are set',
  'tutorial.done.body':
    'Press <kbd>?</kbd> at any time for the full list of keyboard shortcuts, or reopen this tour from the <strong>?</strong> button in the corner. Nothing you do here can break anything — Reset restores the scenario as it shipped.',
  'tutorial.done.tip':
    'A good first experiment: load the Solar System, open the rotation curve, and see that it falls exactly as Kepler says. Then load Milky Way Rotation and see that it does not.',
  'rotation.mode.label': 'Gravity in the outskirts',
  'rotation.mode.newtonian': 'Visible only',
  'rotation.mode.newtonian.hint':
    'Newtonian gravity from the visible matter only. This is the prediction the flat curve contradicts.',
  'rotation.mode.halo': 'Halo',
  'rotation.mode.halo.hint':
    'Newtonian gravity plus a dark-matter halo. Two parameters, fitted to this galaxy.',
  'rotation.mode.mond': 'MOND',
  'rotation.mode.mond.hint':
    "Milgrom's law applied to the visible matter. No parameter is fitted to this galaxy.",
  'rotation.mond.hint':
    "Milgrom's law applied to the visible matter. No parameter is fitted to this galaxy.",
  'rotation.mond.unavailable':
    'MOND applies to galaxies. This scenario has not declared a galactic scale, so it is not offered here.',
  'rotation.mond.limits': 'What MOND does not explain',
  'rotation.mond.predicted': 'MOND predicts (from visible mass)',
  'rotation.mond.predicted.hint':
    'In simulation units, with the physical value implied by this scenario\u2019s declared galaxy scale beside it.',
  'rotation.param.fitted': 'Fitted',
  'rotation.param.fixed': 'Fixed',
  'rotation.param.haloTwo':
    'two parameters per galaxy: the flat speed and the core radius, both adjusted until the curve matches.',
  'rotation.param.mondNone':
    'no parameter is fitted here. a₀ is a constant of the proposed law, the same for every galaxy.',
  'rotation.param.newtonNone':
    'nothing is fitted. The curve is whatever the visible mass implies.',
  'caveat.mond':
    'MOND is in the force law, so gravity is not Newtonian and the usual conservation bookkeeping does not apply.',
  // --- What MOND does not do. Quoted by the model page and the lesson. -------
  'mond.limitation.clusters':
    'Galaxy clusters. MOND reduces the missing mass in clusters but does not remove it: a residual factor of about two remains, so clusters still need unseen matter of some kind.',
  'mond.limitation.bullet':
    'The Bullet Cluster. After a collision the lensing mass is displaced from the visible gas, which is what a collisionless dark component looks like and is hard for a theory in which gravity simply follows the visible matter.',
  'mond.limitation.cmb':
    'The cosmic microwave background. The relative heights of the acoustic peaks are fitted well by cold dark matter and are not reproduced by MOND without adding a dark component anyway.',
  'mond.limitation.relativistic':
    'It is not a relativistic theory. Relativistic completions exist (TeVeS and its successors) but they are more complicated than general relativity and several have been ruled out by the speed of gravitational waves.',
  'mond.limitation.interpolation':
    'The interpolating function is chosen, not derived. The theory fixes only the two limits; the shape of the transition between them is put in by hand.',
  'mond.limitation.external':
    'The external field effect. In MOND a system is affected by the gravitational field it sits in even when that field is uniform, which breaks the strong equivalence principle and makes isolated predictions harder to state.',
  'settings.filter.label': 'Search settings',
  'settings.filter.placeholder': 'Search settings',
  'settings.filter.hint':
    'Show only the settings whose name matches what you type.',
  'settings.filter.empty': 'No setting matches that.',
  'settings.label.bhMass': 'Default BH Mass (M☉)',
  'settings.label.useIndividualBhMasses': 'Use Individual BH Masses',
  'settings.label.bhBehavior': 'BH Behavior',
  'settings.label.orbitDecayRate': 'Orbit Decay Rate',
  'settings.label.numNeutronStars': 'Number of Neutron Stars',
  'settings.label.numWhiteDwarfs': 'Number of White Dwarfs',
  'settings.label.numStars': 'Number of Stars',
  'settings.label.numPlanets': 'Number of Planets',
  'settings.label.numGasGiants': 'Number of Gas Giants',
  'settings.label.enableAsteroids': 'Enable Asteroids',
  'settings.label.numAsteroids': 'Number of Asteroids',
  'settings.label.numComets': 'Number of Comets',
  'settings.label.initVelocity': 'Initial Velocity',
  'settings.label.velocityStddev': 'Velocity StdDev',
  'settings.label.inputObjectType': 'Input Object Type',
  'settings.label.showTrails': 'Show Trails',
  'settings.label.trailStyle': 'Trail Style',
  'settings.label.trailLength': 'Trail Length',
  'settings.label.showVelocityVectors': 'Show Velocity Vectors',
  'settings.label.showAccelerationVectors': 'Show Acceleration Vectors',
  'settings.label.showPotentialWell': 'Show Potential Well',
  'settings.label.showScaleBar': 'Show Scale Bar',
  'settings.label.showElapsedTime': 'Show Elapsed Time',
  'settings.label.showBhGlow': 'Show BH Glow',
  'settings.label.showAccretionDisk': 'Show Accretion Disk',
  'settings.label.realisticDiskPhysics': 'Realistic Disk Physics',
  'settings.label.showBhJets': 'Show BH Jets',
  'settings.label.starDensity': 'Star Field Density',
  'settings.label.showAmbientLighting': 'Ambient Lighting',
  'settings.label.dynamicObjectProperties': 'Dynamic Object Colors',
  'settings.label.planetBaseColor': 'Planet Base Color',
  'settings.label.starBaseColor': 'Star Base Color',
  'settings.label.interactiveAdd': 'Interactive Add',
  'settings.label.followMode': 'Follow Mode',
  'settings.label.showDynamicOverlays': 'Show Overlays',
  'settings.label.recordSimulation': 'Record Simulation',
  'settings.label.showGravitationalWaves': 'Show Gravitational Waves',
  'settings.label.habitableZoneOptimism': 'Habitable Zone Model',
  'settings.option.simSize.small': 'Small',
  'settings.option.simSize.medium': 'Medium',
  'settings.option.simSize.large': 'Large',
  'settings.option.simSize.huge': 'Huge',
  'settings.option.placement.circular': 'Circular',
  'settings.option.placement.multi-ring': 'Multi-Ring',
  'settings.option.placement.random': 'Random',
  'settings.option.placement.grid': 'Grid',
  'settings.option.placement.empty': 'Empty',
  'settings.option.trailColourMode.type': 'By type',
  'settings.option.trailColourMode.speed': 'By speed',
  'settings.option.lensingQuality.off': 'off',
  'settings.option.lensingQuality.low': 'low',
  'settings.option.lensingQuality.medium': 'medium',
  'settings.option.lensingQuality.high': 'high',
  'settings.option.bhBehavior.static': 'Static',
  'settings.option.bhBehavior.orbiting': 'Orbiting',
  'settings.option.inputObjectType.planet': 'Planet',
  'settings.option.inputObjectType.star': 'Star',
  'settings.option.inputObjectType.asteroid': 'Asteroid',
  'settings.option.inputObjectType.comet': 'Comet',
  'settings.option.inputObjectType.gasgiant': 'GasGiant',
  'settings.option.inputObjectType.neutronstar': 'NeutronStar',
  'settings.option.inputObjectType.whitedwarf': 'WhiteDwarf',
  'settings.option.trailStyle.cloud': 'Cloud',
  'settings.option.trailStyle.simple': 'Simple',
  'settings.option.trailStyle.glow': 'Glow',
  'settings.option.followMode.none': 'None',
  'settings.option.followMode.blackhole': 'BlackHole',
  'settings.option.followMode.planet': 'Planet',
  'settings.option.followMode.gasgiant': 'GasGiant',
  'settings.option.followMode.star': 'Star',
  'settings.option.followMode.asteroid': 'Asteroid',
  'settings.option.followMode.comet': 'Comet',
  'settings.option.followMode.neutronstar': 'NeutronStar',
  'settings.option.followMode.whitedwarf': 'WhiteDwarf',

  // --- Scenario catalogue ----------------------------------------------------
  // Titles and summaries for every built-in scenario. They live here rather
  // than in js/data/scenarioInfo.js so that there is one catalogue and one
  // copy of every English string; scenarioInfo.js keeps the structure - tags,
  // thumbnails - and reads its prose back out of this file. The id embeds the
  // scenario key verbatim, which is already the stable primary key, so an id
  // cannot drift away from the scenario it describes.
  'scenario.Solar System.title': 'Solar System',
  'scenario.Solar System.summary':
    'A simulation of our Solar System featuring real planets with correct masses, orbital distances, diameters, and colors. Includes Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune with their actual properties, plus real asteroids (Ceres, Vesta, Pallas) and famous comets (Halley, Hale-Bopp, Hyakutake) with authentic orbital periods and characteristics.',
  'scenario.Retrograde Mars.title':
    'Retrograde Mars: the loop that needed epicycles',
  'scenario.Retrograde Mars.summary':
    'The Sun, Earth and Mars at their real distances and periods, and nothing else. Watched from outside, both planets go round the Sun the same way and never turn back. Switch the reference frame to Earth, in Tools, and Mars stops circling and starts drawing a loop that doubles back on itself. Nothing about the physics changed; only the frame did. That loop is the observation Ptolemy built epicycles to reproduce and Copernicus explained away, and here you can turn it on and off with one control.',
  'scenario.Earth-Moon System.title': 'Earth-Moon System',
  'scenario.Earth-Moon System.summary':
    'A detailed simulation of the Earth-Moon system with accurate masses, orbital mechanics, and realistic appearances. Features Earth with its blue oceans and green continents, and the Moon with its characteristic gray surface and craters. Perfect for studying orbital dynamics and tidal effects.',
  'scenario.TRAPPIST-1 System.title': 'TRAPPIST-1 System',
  'scenario.TRAPPIST-1 System.summary':
    'A compact planetary system with seven Earth-sized worlds orbiting a cool red dwarf star just 40 light-years away. All planets are packed close to their tiny sun, with several in the habitable zone. Can you keep this delicate system stable?',
  'scenario.Three-Body Sensitivity Lab.title':
    'Three-Body Sensitivity Lab: the same start, twice',
  'scenario.Three-Body Sensitivity Lab.summary':
    'Three six-solar-mass stars at the corners of an equilateral triangle, rotating rigidly about their common centre. This is an exact solution of the three-body problem, found by Lagrange in 1772, and for three equal masses it is unstable: the triangle holds for a few turns and then comes apart. Built for one experiment - run it twice from starts that differ by fifteen hundred kilometres in a system a hundred and thirty million kilometres across, and watch how long the two runs stay together.',
  'scenario.Galilean Resonance.title': 'Galilean Resonance: the Laplace lock',
  'scenario.Galilean Resonance.summary':
    'Io, Europa and Ganymede on the 4:2:1 chain Laplace explained in 1805, with Callisto outside it for contrast. The periods are not exactly 4:2:1 — Europa takes 0.37% longer than two Io years — and that near miss is the point: what holds them is the Laplace argument, which stays near 180 degrees instead of running through every value, so the three are never all in conjunction. Callisto sits within 0.03% of 7:3 with Ganymede and is in no resonance at all. A scale model, 100 times life size.',
  'scenario.Broken Laplace Resonance.title':
    'Broken Laplace Resonance: one percent out',
  'scenario.Broken Laplace Resonance.summary':
    'The same four moons with one number changed: Europa starts one percent further from Jupiter. That is a hundred times wider than the resonance can hold, and the lock fails — the Laplace argument stops swinging about 180 degrees and starts going all the way round, once every forty-six Io orbits. Run it beside Galilean Resonance and the difference between a system that is locked and one that merely has convenient periods is on screen in under a minute.',
  'scenario.Pluto and Neptune.title':
    'Pluto and Neptune: the 3:2 that protects',
  'scenario.Pluto and Neptune.summary':
    "Pluto's orbit crosses Neptune's, and they have never come close. The 3:2 resonance is why: Pluto goes round twice for every three Neptune years, and the resonant argument librates about 180 degrees rather than circulating — so every conjunction happens near Pluto's aphelion, far outside Neptune's reach. A third body runs almost the same orbit from outside the resonance; watch what becomes of it. True scale; one second is about 270 years.",
  'scenario.Jupiter Trojans.title':
    'Jupiter Trojans: the 1:1 co-orbital resonance',
  'scenario.Jupiter Trojans.summary':
    "Two of the five Lagrange points are places a body can sit still relative to Jupiter forever, and thousands of asteroids do. A probe placed exactly at L4 does not move in Jupiter's rotating frame; the Trojan 617 Patroclus loops around L5 once every twelve and a half Jupiter years. A third probe starts one degree from L3 — an equilibrium too, and unstable — and leaves. The fourth runs a wider ordinary orbit and is in no resonance at all.",
  'scenario.Binary Pair.title': 'Binary Pair: two stars, one balance point',
  'scenario.Binary Pair.summary':
    'Two stars of two solar masses each, four AU apart, circling their common center of mass once every four years. Neither one is stationary and neither one is orbiting the other: both go round the same point in between them. Watch the trails and the balance point gives itself away.',
  'scenario.Interstellar Visitor.title': "Interstellar Visitor: 1I/'Oumuamua",
  'scenario.Interstellar Visitor.summary':
    'The first object ever seen passing through the Solar System from somewhere else, on its measured orbit: perihelion inside Mercury, eccentricity 1.20, and 87.7 km/s at closest approach. Earth is shown for scale. Select the visitor and look at the sign of its total energy: it is positive, which is the whole story. It is not bound to the Sun, it was never going to stay, and it will not be back.',
  'scenario.Transit Lab.title': 'Transit Lab: HD 209458 b',
  'scenario.Transit Lab.summary':
    'The first exoplanet ever caught crossing its star, found in 1999 after radial velocities said where to look. A hot Jupiter on a 3.5-day orbit, drawn here at true relative scale: the star is 1.155 solar radii, the planet 1.38 Jupiter radii, and the silhouette on screen is the same 12% radius ratio the light curve reports. Open the Light Curve panel and watch the 1.7% dip repeat.',
  'scenario.Spiral Galaxy.title': 'Spiral Galaxy: what we expected',
  'scenario.Spiral Galaxy.summary':
    'A galactic bulge with ninety stars orbiting it, each launched at exactly the speed the visible mass says it should have. This is the prediction, not the observation: with the mass concentrated in the middle, orbital speed falls away as the inverse square root of radius, the same way it does across the Solar System. Open the Rotation Curve panel and read the slope. Then load Milky Way Rotation and read it again.',
  'scenario.Milky Way Rotation.title':
    'Milky Way Rotation: what we actually see',
  'scenario.Milky Way Rotation.summary':
    'The same disc, with every star moving at the same speed no matter how far out it is. That is what telescopes measure in real spiral galaxies, and it is far too fast for the stars you can see to hold on to: this scenario starts with a dark-matter halo switched on, because without one the disc does not survive. Open the Rotation Curve panel and switch the halo off to watch it come apart.',
  'scenario.Coma Cluster.title': 'Coma Cluster: Zwicky, 1933',
  'scenario.Coma Cluster.summary':
    'Twenty-four galaxies swarming in a bound cluster, on randomly oriented orbits, named after the members of the real Coma Cluster that Fritz Zwicky measured. He added up the light, added up the motions, and found the second answer hundreds of times larger than the first. He called the difference dunkle Materie and was ignored for forty years. Select a galaxy to read its speed, and work the same calculation he did.',
  'scenario.Exoplanet Characterization Lab.title':
    'Exoplanet Characterization Lab',
  'scenario.Exoplanet Characterization Lab.summary':
    'HD 209458 again, but with the star free to move. In the Transit Lab it is pinned so the light curve stays centred; here both bodies orbit their common centre of mass, which is what the radial-velocity and astrometry instruments need in order to measure anything. The star circles a point 2.7 millionths of an AU away at 84 metres per second: far too small to see and easily large enough to detect. Open Radial Velocity and watch the wobble that found this planet.',
  'scenario.Blended Binary.title': 'Blended Binary: a hidden companion',
  'scenario.Blended Binary.summary':
    'The same star and planet as the Transit Lab, with a second star half a magnitude fainter sitting 300 AU away: far too close on the sky for a survey telescope to separate, and well inside one photometric aperture. Its light fills in part of the dip, so the transit measures shallower and the planet looks smaller than it is. Correcting for exactly this effect is what high-resolution imaging surveys of planet hosts are for.',
  'scenario.Black Hole Lab.title':
    'Black Hole Lab: a ten solar mass hole, and four things orbiting it',
  'scenario.Black Hole Lab.summary':
    'A single stellar-mass black hole with four bodies on stable circular orbits around it. Nothing is falling in. Gravity a long way from a black hole is the same gravity as anywhere else, and an object with sideways motion goes round it exactly as it would go round a star of the same mass. Select the black hole to read its Schwarzschild radius, its average density on that scale, its Hawking temperature and how long it has left.',
  'scenario.Habitable Zone Lab.title':
    'Habitable Zone Lab: the inner Solar System, with the zone drawn',
  'scenario.Habitable Zone Lab.summary':
    'The Sun with Venus, Earth, Mars and Ceres on their real orbits, and the circumstellar habitable zone drawn around the star from a published prescription. Venus sits inside the inner edge and Mars outside the outer one on the conservative definition, and only one of the four has liquid water on its surface today. Switch the Habitable Zone Model setting to see the optimistic band, which reaches out past Mars.',
  "scenario.Kepler's 2nd Law.title": "Kepler's 2nd Law - Equal Areas",
  "scenario.Kepler's 2nd Law.summary":
    'A planet in a nearly circular orbit and an eccentric orbiter around a central star. The area sweep visualization starts automatically for the eccentric body - watch how the wedges change shape but maintain equal area, showing why objects move faster at periapsis than at apoapsis.',
  'scenario.GW150914.title': 'GW150914: First Gravitational Wave Merger',
  'scenario.GW150914.summary':
    'Simulates the historic merger of two massive black holes (36 & 29 M☉) detected by LIGO in 2015. Watch as they spiral together, emit gravitational waves, and merge into a single, more massive black hole.',
  'scenario.Binary BH.title': 'Binary Black Hole',
  'scenario.Binary BH.summary':
    'Two stellar-mass black holes (15 & 10 M☉) locked in mutual orbit with spectacular relativistic jets. Watch as they spiral together, create gravitational waves, and eventually merge into a single, more massive black hole. The jets point in random directions for each black hole, creating a dynamic cosmic display.',
  'scenario.Triple BH System.title': 'Triple Black Hole',
  'scenario.Triple BH System.summary':
    'A chaotic three-body dance of massive black holes (20, 15, & 10 M☉) in a complex orbital arrangement. This unstable configuration will eventually eject one black hole while the remaining two merge. Demonstrates the chaotic nature of multi-body gravitational systems.',
  'scenario.Supermassive BH.title': 'Supermassive Core',
  'scenario.Supermassive BH.summary':
    'One enormous black hole (80 M☉) dominates a dense stellar swarm with 50 planets, 5 gas giants, and 100 asteroids. The intense gravitational field creates spectacular accretion disks and tidal disruption events. Similar to the environment around real supermassive black holes in galactic centers.',
  'scenario.Star Cluster.title': 'Dense Star Cluster',
  'scenario.Star Cluster.summary':
    'A gravitationally bound collection of main-sequence stars, evolved giants, and stellar remnants with mutual gravitational interactions. Watch stellar encounters, binary formation, and the dynamic evolution of this stellar community over time.',
  'scenario.Kuiper Belt.title': 'Kuiper Belt',
  'scenario.Kuiper Belt.summary':
    "An accurate simulation of our Solar System's Kuiper Belt featuring real dwarf planets (Pluto, Eris, Haumea, Makemake), large KBOs (Quaoar, Sedna, Orcus, Varuna), and smaller objects (Ixion, Huya, 2002 AW197) with realistic masses and orbital properties.",
  'scenario.Sagittarius A*.title': 'Sagittarius A*',
  'scenario.Sagittarius A*.summary':
    "The Milky Way's central supermassive black hole (4000 M☉, scaled down for simulation) with fast-moving S-stars, compact objects, and debris in extreme orbits. Witness the incredible gravitational forces and relativistic effects near our galaxy's supermassive black hole.",
  'scenario.Binary Star System.title': 'Binary Stars',
  'scenario.Binary Star System.summary':
    'A pair of suns in mutual orbit with 5 planets orbiting the binary system. The complex gravitational environment creates interesting orbital dynamics and potential habitable zones. Similar to real binary star systems like Alpha Centauri.',
  'scenario.Slingshot.title': 'Gravity Slingshot',
  'scenario.Slingshot.summary':
    'A massive black hole (60 M☉) paired with a smaller companion (3 M☉) create dramatic gravitational assists for nearby planets and gas giants. Watch objects gain tremendous velocity through close encounters, mimicking spacecraft gravity assists.',
  'scenario.Rogue Encounter.title': 'Rogue Encounter',
  'scenario.Rogue Encounter.summary':
    'A wandering black hole (30 M☉) passes through a stable planetary system with 12 planets, 4 gas giants, and asteroids. Watch the dramatic orbital disruption, planet ejection, and tidal capture events as the rogue intruder wreaks havoc.',
  'scenario.Neutron Star Collision.title': 'Neutron Star Merger',
  'scenario.Neutron Star Collision.summary':
    'Two neutron stars (1.4 M☉ each) spiral toward each other in a death dance. This rare event produces gravitational waves, gamma-ray bursts, and creates heavy elements through r-process nucleosynthesis. Based on the LIGO-detected GW170817 event.',
  'scenario.Pulsar System.title': 'Pulsar with Planets',
  'scenario.Pulsar System.summary':
    "A rapidly spinning neutron star with 3 planets in tight orbits. The pulsar's intense magnetic field and radiation create a harsh environment. Based on the first confirmed exoplanets discovered around PSR B1257+12.",
  'scenario.White Dwarf Binary.title': 'White Dwarf Binary',
  'scenario.White Dwarf Binary.summary':
    'Two white dwarf stars in a close binary system with accretion between them. One star gradually steals material from its companion, potentially leading to a Type Ia supernova. Includes debris disk and stellar remnants.',
  'scenario.Stellar Graveyard.title': 'Stellar Graveyard',
  'scenario.Stellar Graveyard.summary':
    'A dynamic collection of stellar remnants: 3 black holes, 5 neutron stars, and 8 white dwarfs with surviving planets and extensive debris fields. Watch these stellar corpses interact in their final gravitational dance.',
  'scenario.Galactic Center.title': 'Galactic Center',
  'scenario.Galactic Center.summary':
    'A supermassive black hole (4000 M☉) surrounded by high-velocity stars, stellar remnants, and dense stellar populations. Experience the extreme gravitational environment with spectacular accretion, jets, and relativistic effects.',
  'scenario.Supernova Remnant.title': 'Supernova Remnant',
  'scenario.Supernova Remnant.summary':
    'The explosive aftermath of a massive star death: a neutron star surrounded by high-velocity debris, shocked planets, and disrupted gas giants. Experience the violent and energetic environment left behind by stellar death.',
  'scenario.Compact Object Zoo.title': 'Compact Object Zoo',
  'scenario.Compact Object Zoo.summary':
    'A diverse collection of compact objects: multiple black holes, neutron stars, and white dwarfs of various masses interacting in a dense environment. Perfect for studying the different types of stellar endpoints and their interactions.',
  'scenario.Millisecond Pulsar.title': 'Millisecond Pulsar',
  'scenario.Millisecond Pulsar.summary':
    "An extremely fast-spinning neutron star (recycled pulsar) with a white dwarf companion and planetary debris. These 'recycled' pulsars are spun up by accretion and are among the most precise timekeepers in the universe.",
  'scenario.Tidal Disruption Event.title': 'Tidal Disruption',
  'scenario.Tidal Disruption Event.summary':
    'Multiple objects approach a supermassive black hole (2000 M☉) and are torn apart by extreme tidal forces. Watch as planets and gas giants are stretched, disrupted, and either ejected or accreted, creating spectacular debris streams.',
  'scenario.Intermediate Mass BH.title': 'Intermediate Mass BH',
  'scenario.Intermediate Mass BH.summary':
    'A rare intermediate-mass black hole (400 M☉) in a globular cluster environment with dense stellar populations. These elusive objects bridge the gap between stellar-mass and supermassive black holes.',
  'scenario.Galactic Collision.title': 'Galactic Collision',
  'scenario.Galactic Collision.summary':
    'Two supermassive black holes (1.2M & 1.0M M☉) with hundreds of stars representing galactic cores in collision. Witness the formation of tidal streams, stellar disruption, and the eventual merger of supermassive black holes.',
  'scenario.Micro BH Swarm.title': 'Micro BH Swarm',
  'scenario.Micro BH Swarm.summary':
    'A dynamic swarm of small black holes (0.6-1.8 M☉) with planets and gas giants in chaotic orbital dance. Watch as these stellar-mass black holes interact, merge, and create complex gravitational resonances.',
  'scenario.Exoplanet Lab.title': 'Exoplanet Lab',
  'scenario.Exoplanet Lab.summary':
    'A diverse collection of 120+ exoplanets, gas giants, and even pulsar planets around various stellar hosts. Explore the incredible diversity of planetary systems with interactive orbital mechanics and planetary interactions.',
  'scenario.Quasar Cannon.title': 'Quasar Cannon',
  'scenario.Quasar Cannon.summary':
    'A supermassive black hole is actively feeding on a dense star cluster. Watch a beam of light form as stars spiral inward.',
  'scenario.The Pinwheel Galaxy Core.title': 'The Pinwheel Galaxy Core',
  'scenario.The Pinwheel Galaxy Core.summary':
    'Two intermediate black holes in the center of a stellar disk. The disk forms a rotating pinwheel pattern as stars are slung around.',
  'scenario.Star Frisbee.title': 'Star Frisbee',
  'scenario.Star Frisbee.summary':
    'A dense stellar disk thrown past a rogue black hole. Will it be shredded or survive the flyby?',
  'scenario.Kessler Cascade.title': 'Kessler Cascade',
  'scenario.Kessler Cascade.summary':
    'Hundreds of micro‑stars orbiting chaotically, colliding and ejecting like a debris cloud.',
  'scenario.Alien Dyson Swarm Collapse.title': 'Alien Dyson Swarm Collapse',
  'scenario.Alien Dyson Swarm Collapse.summary':
    'A hypothetical Dyson swarm of artificial satellites falls into a black hole after a catastrophic orbital failure.',
  'scenario.Tidal Arm Tango.title': 'Tidal Arm Tango',
  'scenario.Tidal Arm Tango.summary':
    'Two black holes dance past each other, flinging stars into massive tidal arms like colliding galaxies.',
  'scenario.Hungry Hungry Holes.title': 'Hungry Hungry Holes',
  'scenario.Hungry Hungry Holes.summary':
    'Four black holes at the corners of a square, pulling stars from a shared central cluster.',
  'scenario.Slingshot Gauntlet.title': 'Slingshot Gauntlet',
  'scenario.Slingshot Gauntlet.summary':
    'A fast-moving star fired through a black hole obstacle course. Watch gravitational slingshots.',
  'scenario.Black Hole Billiards.title': 'Black Hole Billiards',
  'scenario.Black Hole Billiards.summary':
    'A few small black holes orbiting a supermassive one, perturbing each other and creating chaotic motion.',
  'scenario.Stellar Nursery.title': 'Stellar Nursery',
  'scenario.Stellar Nursery.summary':
    'A dense cluster of young stars around a proto-black hole. Watch interactions and ejections as the cluster evolves.',

  // --- Scenario concept tags -------------------------------------------------
  'tag.orbits-kepler.label': 'Orbits & Kepler',
  'tag.orbits-kepler.description':
    "Orbital motion, Kepler's three laws, orbital energy, and the shapes trajectories take.",
  'tag.solar-system.label': 'Solar System',
  'tag.solar-system.description':
    'Our own planets, moons, asteroids and comets, at their real relative distances.',
  'tag.exoplanets.label': 'Exoplanets',
  'tag.exoplanets.description':
    'Planets around other stars: architectures, compact systems, and how they compare with ours.',
  'tag.detection.label': 'Detection Methods',
  'tag.detection.description':
    'How planets are actually found: transit photometry, light curves, and what can confound them.',
  'tag.habitability.label': 'Habitability',
  'tag.habitability.description':
    'The circumstellar habitable zone, incident starlight, and what being inside a zone does and does not establish.',
  'tag.binary-systems.label': 'Binary Systems',
  'tag.binary-systems.description':
    'Two or more bodies orbiting a common center of mass, and the dynamics that follow.',
  'tag.tides.label': 'Tides & Disruption',
  'tag.tides.description':
    'Differential gravity: bodies stretched, stripped or torn apart by a close pass.',
  'tag.chaos.label': 'Chaos & Encounters',
  'tag.chaos.description':
    'Close passes, slingshots, ejections, and systems whose outcome depends sensitively on where they started.',
  'tag.resonance.label': 'Orbital Resonance',
  'tag.resonance.description':
    'Bodies whose periods lock into a small whole-number ratio, and the librating angle that shows the lock is real.',
  'tag.stellar-evolution.label': 'Stellar Evolution',
  'tag.stellar-evolution.description':
    'What stars leave behind: white dwarfs, neutron stars, remnants and the environments that make them.',
  'tag.compact-objects.label': 'Compact Objects',
  'tag.compact-objects.description':
    'Black holes, neutron stars and white dwarfs, and how gravity behaves close to them.',
  'tag.relativity.label': 'Relativity & Gravitational Waves',
  'tag.relativity.description':
    'Inspiralling compact binaries and merger events, in the curriculum sense: the underlying solver stays Newtonian.',
  'tag.galaxies-clusters.label': 'Galaxies & Clusters',
  'tag.galaxies-clusters.description':
    'Many-body systems at the largest scales Gravitas models: cluster dynamics, galactic centers, and encounters between them.',
  'tag.dark-matter.label': 'Dark Matter',
  'tag.dark-matter.description':
    'The two measurements that found it: rotation curves that stay flat when they should fall, and clusters whose members move far too fast for the mass that shines.',

  // --- Readout header, rail sub-headings ------------------------------------
  'readout.sonificationToggle.label': 'Sound',
  'readout.sonification.off.hint':
    'Turn on procedural sonification: orbital motion, gravitational-wave frequencies and collision signatures become live audio.',
  'readout.sonification.on.hint': 'Mute the simulation sonification',
  'readout.elapsed': 'Elapsed',
  'readout.count.empty': 'Nothing in the simulation yet',
  'readout.integrator': 'Integrator',
  'readout.drift.energy': 'Energy drift',
  'readout.drift.angular': 'Ang. momentum drift',
  'rail.sub.measure': 'Measure',
  'rail.sub.instruments': 'Instruments',
  'rail.sub.instruments.label': 'Analysis panels',
  'rail.sub.view': 'View',
  'rail.sub.share': 'Capture',

  // --- The lesson engine's own chrome ---------------------------------------
  'inv.error.scenario': 'Could not load this step’s scenario.',
  'inv.plot.placeholder': 'Values you enter appear here',
  'inv.plot.title': 'Your measurements',
  'inv.import.default': 'Use selected object',
  'inv.import.needObject': 'Select an object with a measurable orbit first.',
  'inv.import.duplicate': 'You have already recorded that one.',
  'inv.import.full': 'All rows are filled. Clear one to import again.',
  'inv.action.finish': 'Finish',
  'inv.action.next': 'Next',
  'inv.probe.unavailable': 'Readout unavailable',
  'inv.answer.correct': 'Correct.',
  'inv.answer.recorded': 'Recorded.',
  'inv.answer.model': 'Model answer shown.',
  'inv.announce.started': 'Investigation started: {title}',
  'inv.report.building': 'Building…',
  'inv.report.done': 'Lab report downloaded',
  'inv.report.failed': 'Could not build the report.',
  'inv.report.download': 'Download lab report (PDF)',
  'inv.progress.cleared': 'Progress cleared',
  'inv.progress.steps': '{done} of {total} steps',
  'inv.scenario.reset': 'Scenario reset',
  'inv.link.unknown': 'That investigation link does not match a lesson.',
  'inv.load.failed': 'That lesson could not be loaded. Try again.',
  'inv.card.loading': 'Loading…',
  'inv.card.review': 'Review lesson',
  'inv.card.start': 'Start lesson',
  'inv.card.resume': 'Resume at step {n}',
  'inv.card.complete': 'Complete',
  'inv.card.seen': '{done} of {total} steps seen',
  'inv.card.report': 'Lab report',
  'inv.card.series': '{label}, lesson {index} of {of}',
  'inv.summary.about': 'about {h} hours',
  'inv.summary.range': '{l}–{h} hours',
  'inv.summary.work': '{hours} of work',
  'inv.summary.level': 'All at {level} level.',
  'inv.summary.lessons': { one: '{n} lesson', other: '{n} lessons' },
  'inv.summary.steps': { one: '{n} step', other: '{n} steps' },
  'inv.summary.complete': '{n} complete',
  'inv.summary.going': '{n} in progress',
  'inv.card.objectives': { one: '{n} objective', other: '{n} objectives' },

  // --- Shortcuts, panels and the rest of the interface -----------------------
  'shortcut.pause': 'Pause / resume',
  'shortcut.stepBack': 'Step back one recorded frame',
  'shortcut.stepForward': 'Step forward one recorded frame',
  'shortcut.live': 'Jump back to live',
  'shortcut.pan': 'Pan the view',
  'shortcut.zoom': 'Zoom in and out',
  'shortcut.resetView': 'Reset view',
  'shortcut.investigations': 'Open the guided investigations',
  'shortcut.share': 'Share a link to this simulation',
  'shortcut.export': 'Export the recorded data as CSV',
  'shortcut.theme': 'Cycle theme',
  'shortcut.units': 'Toggle physical / simulation units',
  'shortcut.trails': 'Toggle trails',
  'shortcut.undo': 'Undo last placed object',
  'shortcut.inspect': 'Inspect an object',
  'shortcut.place': 'Place an object with velocity',
  'shortcut.snap': 'Snap to a circular orbit',
  'shortcut.lecture': 'Lecture Mode (projection)',
  'shortcut.showList': 'Show this list',
  'shortcut.closePanel': 'Close the open panel',
  'chart.autoRefresh': 'Auto-refresh active - Click to refresh now',
  'chart.refresh': 'Refresh Chart Data',
  'overlay.habitableZone': 'Habitable zone',
  'overlay.referenceFrame': 'Reference frame',
  'overlay.equalAreaSweep': 'Equal-area sweep',
  'tip.dismiss': 'Dismiss this tip',
  'objectType.rockyPlanets': 'Add Rocky Planets',
  'objectType.gasGiants': 'Add Gas Giants',
  'objectType.asteroids': 'Add Asteroids',
  'objectType.comets': 'Add Comets',
  'objectType.whiteDwarfs': 'Add White Dwarfs',
  'objectType.neutronStars': 'Add Neutron Stars',
  'objectType.blackHoles': 'Add Black Holes',
  'stopwatch.needBody': 'Select a body first, then latch the stopwatch to it',
  'hz.recentVenus': 'Recent Venus',
  'hz.runaway': 'Runaway Greenhouse',
  'hz.maximum': 'Maximum Greenhouse',
  'hz.earlyMars': 'Early Mars',
  'rv.crossingZero': 'Crossing zero',
  'rv.movingAway': 'Moving AWAY FROM US',
  'rv.movingToward': 'Moving TOWARD US',
  'welcome.scenarioGone': 'That scenario is no longer available.',
  'welcome.shownAgain': 'It will be shown again next time',
  'welcome.showAgain': 'Show this again on my next visit',
  'astrometry.keepObserving': 'Keep observing…',
  'export.downloadCsv': 'Download CSV',
  'lightCurve.relativeBrightness': 'Relative Brightness',
  'frame.barycenter': 'Barycenter',
  'view3d.loadFailed':
    'The spacetime view could not be loaded. Check your connection.',
  'tutorial.welcome': 'Welcome to Gravitas',
  'tutorial.place': 'Place an object by dragging',
  'tutorial.choose': 'Choose what you are placing',
  'tutorial.inspect': 'Inspect anything',
  'tutorial.rewind': 'Rewind what just happened',
  'tutorial.scenario': 'Start from a real system',
  'tutorial.settings': 'Units, themes and the rest',
  'tutorial.done': 'You are set',

  // --- The front door --------------------------------------------------------
  'welcomeCard.sandbox.eyebrow': 'Free exploration',
  'welcomeCard.sandbox.title': 'Sandbox',
  'welcomeCard.sandbox.text':
    'Build a system from nothing, or load one of the built-in scenarios and change it. Drag to place an object; the drag sets its velocity.',
  'welcomeCard.sandbox.cta': 'Enter the sandbox',
  'welcomeCard.investigations.eyebrow': 'Guided lessons',
  'welcomeCard.investigations.title': 'Investigations',
  'welcomeCard.investigations.text':
    'Structured astronomy activities inside the simulation: predict, experiment, measure, answer, and export a lab report.',
  'welcomeCard.investigations.cta': 'Browse investigations',
  'welcomeCard.instructors.eyebrow': 'For teaching',
  'welcomeCard.instructors.title': 'Instructors',
  'welcomeCard.instructors.text':
    'Instructor guides, learning objectives, answer keys and a curriculum map for introductory astronomy courses.',
  'welcomeCard.instructors.cta': 'Instructor resources',
  'welcomeAudience.students.title': 'For students',
  'welcomeAudience.students.text':
    'See the relationships an equation describes. Move a planet outward and watch its year lengthen; stretch an orbit and watch the starlight swing.',
  'welcomeAudience.instructors.title': 'For instructors',
  'welcomeAudience.instructors.text':
    'Six guided investigations for introductory and general-education astronomy, with instructor guides, answer keys and shareable simulation links.',
  'welcomeAudience.curious.title': 'For the curious',
  'welcomeAudience.curious.text':
    'No account, no install, nothing to read first. Load a black-hole merger and watch it, or start from empty space and see what gravity does.',
  'welcomeLink.model.label': 'How Gravitas models the universe',
  'welcomeLink.model.note':
    'What is calculated, what is approximated, and what is only drawn.',
  'welcomeLink.instructors.note': 'Guides, answer keys and a curriculum map.',

  // --- Lesson instruments ----------------------------------------------------
  // The labels, axis titles and preset names on the widgets embedded in the
  // lessons. Read through getters so a language change repaints them.
  'energyW.theMoon': 'the Moon',
  'energyW.earth': 'Earth',
  'energyW.jupiter': 'Jupiter',
  'energyW.theSun': 'the Sun',
  'energyW.total': 'TOTAL',
  'energyW.doesItComeBack': 'Does it come back?',
  'energyW.launchSpeed': 'Launch speed',
  'energyW.slow6KmS': 'Slow: 6 km/s',
  'energyW.orbit78KmS': 'Orbit: 7.8 km/s',
  'energyW.boundary109KmS': 'Boundary: 10.9 km/s',
  'energyW.fast14KmS': 'Fast: 14 km/s',
  'energyW.clearlyGoneItLeavesAlong':
    'Clearly gone. It leaves along an open path and still has speed to spare when it is far away.',
  'energyW.run': '▶ Run',
  'energyW.reset': '↺ Reset',
  'energyW.totalEnergy': 'Total energy',
  'energyW.escapeSpeedFromHere': 'Escape speed from here',
  'energyW.furthestItGets': 'Furthest it gets',
  'energyW.energyAroundOneOrbit': 'Energy around one orbit',
  'energyW.clickAPlanetInThe': 'Click a planet in the simulation',
  'energyW.watching': 'Watching',
  'energyW.energyOfMotion': 'Energy of motion',
  'energyW.howMuchTheTotalHas': 'How much the total has moved',
  'energyW.whereItIs': 'Where it is',
  'energyW.whatMakesEscapeHard': 'What makes escape hard?',
  'energyW.escapeSpeedFromFourReal':
    'Escape speed from four real bodies. Move the slider to start further out and watch every bar fall.',
  'energyW.startDistance': 'Start distance',
  'energyW.bodyRadius': '× body radius',
  'energyW.atTheSurface': 'At the surface',
  'energyW.twiceAsFarOut': 'Twice as far out',
  'energyW.tenRadiiOut': 'Ten radii out',
  'energyW.startingDistance': 'Starting distance',
  'energyW.oneLawThreeShapes': 'One law, three shapes',
  'energyW.theSamePlanetTheSame':
    'The same planet, the same launch point, the same law of gravity. Only the speed is different.',
  'energyW.speedAsAFractionOf': 'Speed, as a fraction of escape speed',
  'energyW.belowEscape': 'Below escape',
  'energyW.exactlyEscape': 'Exactly escape',
  'energyW.aboveEscape': 'Above escape',
  'energyW.shapeOfThePath': 'Shape of the path',
  'energyW.escapeSpeedHere': 'Escape speed here',
  'energyW.belowEscapeEllipse': 'below escape: ellipse',
  'energyW.escapeExactlyParabola': 'escape exactly: parabola',
  'energyW.aboveEscapeHyperbola': 'above escape: hyperbola',
  'bhW.acrossTheEventHorizon': 'across the event horizon',
  'bhW.aMarathon': 'a marathon',
  'bhW.manhattanEndToEnd': 'Manhattan, end to end',
  'bhW.oneBlackHoleDrawnTo': 'One black hole, drawn to scale',
  'bhW.massOfTheBlackHole': 'Mass of the black hole',
  'bhW.mass': 'Mass',
  'bhW.schwarzschildRadiusR': 'Schwarzschild radius, Rₛ',
  'bhW.rightAcrossTheEventHorizon': 'Right across the event horizon',
  'bhW.comparedWithTheLengthOf': 'Compared with the length of Manhattan',
  'bhW.massAgainstHorizonSize': 'Mass against horizon size',
  'bhW.setAMassPressRecord':
    'Set a mass, press Record, and the point lands on the graph. Three or four trials are plenty.',
  'bhW.recordThisTrial': '⊕ Record this trial',
  'bhW.clearTrials': '↺ Clear trials',
  'bhW.sliderIsAt': 'Slider is at',
  'bhW.squeezingTheSun': 'Squeezing the Sun',
  'bhW.radiusOfTheSqueezedSun': 'Radius of the squeezed Sun',
  'bhW.theSunToday': 'The Sun today',
  'bhW.696000KmAcrossThe':
    '696,000 km across the radius. Escape speed 618 km/s, which is about two ten-thousandths of the speed of light.',
  'bhW.earthSized': 'Earth-sized',
  'bhW.aWholeSolarMassPacked':
    'A whole solar mass packed into a ball the size of the Earth. This is roughly what a white dwarf is.',
  'bhW.twiceTheSchwarzschildRadiusThe':
    'Twice the Schwarzschild radius. The escape speed is already seven tenths of the speed of light.',
  'bhW.massUnchangedThroughout': 'Mass, unchanged throughout',
  'bhW.radiusNow': 'Radius now',
  'bhW.escapeSpeedFromTheSurface': 'Escape speed from the surface',
  'bhW.asAShareOfThe': 'As a share of the speed of light',
  'bhW.radiusInSchwarzschildRadii': 'Radius, in Schwarzschild radii',
  'bhW.airAtSeaLevel': 'Air at sea level',
  'bhW.water': 'Water',
  'bhW.aWhiteDwarf': 'A white dwarf',
  'bhW.anAtomicNucleus': 'An atomic nucleus',
  'bhW.averageDensityOnALadder': 'Average density, on a ladder',
  'bhW.horizonRadius': 'Horizon radius',
  'bhW.averageDensityOnThisScale': 'Average density on this scale',
  'bhW.comparedWithWater': 'Compared with water',
  'bhW.countingTheZeros': 'Counting the zeros',
  'bhW.multiplyTheMassBy': 'Multiply the mass by',
  'bhW.startingBlackHole': 'Starting black hole',
  'bhW.afterMultiplying': 'After multiplying',
  'bhW.volumeGained': 'Volume gained',
  'bhW.soDensityLost': 'So density lost',
  'bhW.newAverageDensity': 'New average density',
  'bhW.volumeInsideIt': 'Volume inside it',
  'bhW.averageDensity': 'Average density',
  'bhW.theSunSSurface': "The Sun's surface",
  'bhW.theMicrowaveBackground': 'The microwave background',
  'bhW.theColdestLabExperiment': 'The coldest lab experiment',
  'bhW.howColdIsIt': 'How cold is it?',
  'bhW.sagittariusA': 'Sagittarius A*',
  'bhW.hawkingTemperature': 'Hawking temperature',
  'bhW.colderThanTheMicrowaveBackground':
    'Colder than the microwave background by',
  'bhW.theMicrowaveBackgroundForScale': 'The microwave background, for scale',
  'bhW.howLongWillItLast': 'How long will it last?',
  'bhW.evaporationLifetime': 'Evaporation lifetime',
  'bhW.zerosInThatNumber': 'Zeros in that number',
  'bhW.agesOfTheUniverse': 'Ages of the universe',
  'bhW.ageOfTheUniverse': 'Age of the universe',
  'bhW.untilTheLastStarsBurn': 'Until the last stars burn out',
  'bhW.thisBlackHoleEvaporates': 'This black hole evaporates',
  'bhW.blackHoleA': 'Black Hole A',
  'bhW.aboutAsFarAsThe': 'about as far as the length of Manhattan',
  'bhW.blackHoleB': 'Black Hole B',
  'bhW.theEarth': 'the Earth',
  'bhW.aLittleUnderHalfThe': 'a little under half the radius of the Earth',
  'bhW.blackHoleC': 'Black Hole C',
  'bhW.theSun': 'the Sun',
  'bhW.aboutTwoThirdsOfThe': 'about two thirds of the radius of the Sun',
  'bhW.blackHoleD': 'Black Hole D',
  'bhW.mercurySOrbit': "Mercury's orbit",
  'bhW.aboutAFifthOfThe': 'about a fifth of the way out to Mercury',
  'bhW.fourBlackHoles': 'Four black holes',
  'bhW.showing': 'Showing',
  'bhP.manhattanEndToEnd': 'Manhattan, end to end',
  'bhP.earthSRadius': "Earth's radius",
  'bhP.theSunSRadius': "the Sun's radius",
  'bhP.mercurySOrbit': "Mercury's orbit",
  'bhP.airAtSeaLevel': 'Air at sea level',
  'bhP.water': 'Water',
  'bhP.theSunOnAverage': 'The Sun, on average',
  'bhP.rock': 'Rock',
  'bhP.lead': 'Lead',
  'bhP.aWhiteDwarf': 'A white dwarf',
  'bhP.anAtomicNucleus': 'An atomic nucleus',
  'bhP.theSurfaceOfTheSun': 'The surface of the Sun',
  'bhP.roomTemperature': 'Room temperature',
  'bhP.liquidNitrogen': 'Liquid nitrogen',
  'bhP.theMicrowaveBackground': 'The microwave background',
  'bhP.theColdestLabExperiment': 'The coldest lab experiment',
  'bhP.aHumanLifetime': 'A human lifetime',
  'bhP.sinceTheDinosaurs': 'Since the dinosaurs',
  'bhP.ageOfTheUniverse': 'Age of the universe',
  'bhP.theLastStarBurnsOut': 'The last star burns out',
  'dmW.allInTheMiddle': 'All in the middle',
  'dmW.uniformBall': 'Uniform ball',
  'dmW.exponentialDisc': 'Exponential disc',
  'dmW.haloMassKeepsGrowing': 'Halo (mass keeps growing)',
  'dmW.whereTheMassIsAnd': 'Where the mass is, and the curve it makes',
  'dmW.massDistribution': 'Mass distribution',
  'dmW.totalMassInside30Kpc': 'Total mass inside 30 kpc',
  'dmW.howSpreadOutItIs': 'How spread out it is',
  'dmW.solarSystem': 'Solar System',
  'dmW.spiralDisc': 'Spiral disc',
  'dmW.aRealStellarDiscIt':
    'A real stellar disc. It rises, peaks at about 2.2 scale lengths, and then falls away. Still not flat.',
  'dmW.whatGalaxiesDo': 'What galaxies do',
  'dmW.speedAt30Kpc': 'Speed at 30 kpc',
  'dmW.outerSlopeVR': 'Outer slope (v ∝ rⁿ)',
  'dmW.shapeOutThere': 'Shape out there',
  'dmW.massInside30Kpc': 'Mass inside 30 kpc',
  'dmW.fallingAllMassInThe': 'Falling (all mass in the middle)',
  'dmW.flatWhatGalaxiesDo': 'Flat (what galaxies do)',
  'dmW.aRealGalaxyDiscHalo': 'A real galaxy: disc + halo',
  'dmW.whatTheSpeedTellsYou': 'What the speed tells you about the mass',
  'dmW.rotationCurve': 'Rotation curve',
  'dmW.radiusMarker': 'Radius marker',
  'dmW.fallingCurve': 'Falling curve',
  'dmW.dragTheMarkerOutThe':
    'Drag the marker out. The speed drops and the enclosed mass stops growing: everything is already inside.',
  'dmW.flatCurve': 'Flat curve',
  'dmW.aRealGalaxy': 'A real galaxy',
  'dmW.massThatMustBeInside': 'Mass that must be inside',
  'dmW.goOutTwiceAsFar': 'Go out twice as far, and the enclosed mass',
  'dmW.ofWhichTheVisibleDisc': 'Of which the visible disc could account for',
  'dmW.starsOnly': 'Stars only',
  'dmW.maximumDisc': 'Maximum disc',
  'dmW.wrongScaleLength': 'Wrong scale length',
  'dmW.publishedDecomposition': 'Published decomposition',
  'dmW.fitARealGalaxy': 'Fit a real galaxy',
  'dmW.discMassTheStarsYou': 'Disc mass (the stars you can see)',
  'dmW.discScaleLength': 'Disc scale length',
  'dmW.haloStrengthItsFlatSpeed': 'Halo strength (its flat speed)',
  'dmW.haloCoreRadius': 'Halo core radius',
  'dmW.averageMiss': 'Average miss',
  'dmW.fit': 'Fit',
  'dmW.visibleMass': 'Visible mass',
  'dmW.haloMassInside30Kpc': 'Halo mass inside 30 kpc',
  'dmW.darkMassForEveryUnit': 'Dark mass for every unit of visible',
  'dmW.whatTheHaloIsHolding': 'What the halo is holding',
  'dmW.launchRadius': 'Launch radius',
  'dmW.darkMatterHalo': 'Dark matter halo',
  'dmW.runPause': '▶ Run / Pause',
  'dmW.relaunch': '↺ Relaunch',
  'dmW.haloOn': 'Halo on',
  'dmW.theStarHoldsItsOrbit':
    'The star holds its orbit. The visible disc could never do this on its own at 20 kpc.',
  'dmW.haloOff': 'Halo off',
  'dmW.halo': 'Halo',
  'dmW.launchSpeed': 'Launch speed',
  'dmW.speedTheVisibleDiscAlone': 'Speed the visible disc alone could hold',
  'dmW.distanceNow': 'Distance now',
  'dmW.verdict': 'Verdict',
  'dmW.weighAClusterByHow': 'Weigh a cluster by how fast it jitters',
  'dmW.measuredLineOfSightSpread': 'Measured line-of-sight spread σ',
  'dmW.clusterRadiusR': 'Cluster radius R',
  'dmW.mpc': 'Mpc',
  'dmW.turnIntoVUsing': 'Turn σ into ⟨v²⟩ using',
  'dmW.comaDoneRight': 'Coma, done right',
  'dmW.forgetTheFactorOf3': 'Forget the factor of 3',
  'dmW.forgetToSquareIt': 'Forget to square it',
  'dmW.massTheMotionNeeds': 'Mass the motion needs',
  'dmW.massInGalaxies': 'Mass in galaxies',
  'dmW.plusHotGasBetweenThem': 'Plus hot gas between them',
  'dmW.neededEverythingYouCanSee': 'Needed ÷ everything you can see',
  'dmW.warning': 'Warning',
  'dmW.everything': 'Everything',
  'dmW.justTheMatter': 'Just the matter',
  'dmW.justTheOrdinaryMatter': 'Just the ordinary matter',
  'dmW.justTheStars': 'Just the stars',
  'dmW.whereTheMassOfThe': 'Where the mass of the universe is',
  'dmW.zoomInOn': 'Zoom in on',
  'dmW.darkEnergy': 'Dark energy',
  'dmW.darkMatter': 'Dark matter',
  'dmW.ordinaryMatterAllOfIt': 'Ordinary matter, all of it',
  'dmW.stars': 'Stars',
  'dmW.darkMatterForEveryUnit': 'Dark matter for every unit of ordinary matter',
  'dmW.darkEnergy2': 'dark energy',
  'dmW.darkMatter2': 'dark matter',
  'exoW.whoIsActuallyMoving': 'Who is actually moving?',
  'exoW.theStarAndThePlanet':
    'The star and the planet both go round the same point. Turn the magnification up to see the star do it.',
  'exoW.planetMass': 'Planet mass',
  'exoW.orbitSize': 'Orbit size',
  'exoW.stellarWobbleShown': 'Stellar wobble shown',
  'exoW.jupiterAtJupiterSDistance': 'Jupiter, at Jupiter’s distance',
  'exoW.theSunReallyDoesThis':
    'The Sun really does this. Its reflex orbit is about one solar radius across, and it takes twelve years to go round.',
  'exoW.anEarth': 'An Earth',
  'exoW.starSOwnOrbit': 'Star’s own orbit',
  'exoW.planetSOrbit': 'Planet’s orbit',
  'exoW.planetSOrbitIsBigger': 'Planet’s orbit is bigger by',
  'exoW.bothGoRoundOnceEvery': 'Both go round once every',
  'exoW.towardUsAwayFromUs': 'Toward us, away from us',
  'exoW.inclination': 'Inclination',
  'exoW.radialVelocityNow': 'Radial velocity now',
  'exoW.whichWay': 'Which way',
  'exoW.semiAmplitudeK': 'Semi-amplitude K',
  'exoW.whatMakesTheWobbleBigger': 'What makes the wobble bigger?',
  'exoW.oneThingChangesAtA':
    'One thing changes at a time. The star, the period and the viewing angle are all held still.',
  'exoW.aNeptune': 'A Neptune',
  'exoW.aHeavyJupiter': 'A heavy Jupiter',
  'exoW.doubleTheMassAndK': 'Double the mass and K',
  'exoW.theSamePlanetTilted': 'The same planet, tilted',
  'exoW.thePlanetDoesNotChange':
    'The planet does not change. Only our viewing angle does. Watch what happens to the mass radial velocity reports.',
  'exoW.truePlanetMass': 'True planet mass',
  'exoW.edgeOn90': 'Edge-on, 90°',
  'exoW.aTransitingSystemIsClose':
    'A transiting system is close to this, which is what makes its mass a mass rather than a lower limit.',
  'exoW.faceOn5': 'Face-on, 5°',
  'exoW.almostNoRadialVelocitySignal':
    'Almost no radial-velocity signal at all. The planet is still there.',
  'exoW.kWeWouldMeasure': 'K we would measure',
  'exoW.massRvAloneReports': 'Mass RV alone reports',
  'exoW.thatIsTheTrueMass': 'That is the true mass times',
  'exoW.soRadialVelocityGives': 'So radial velocity gives',
  'exoW.theWobbleAcrossTheSky': 'The wobble across the sky',
  'exoW.astrometryMeasuresWhereTheStar':
    'Astrometry measures where the star is, not how fast it is coming at us. Nothing here is a picture of the planet.',
  'exoW.distance': 'Distance',
  'exoW.aTextbookRadialVelocityTarget':
    'A textbook radial-velocity target and a hopeless astrometric one: close in, and nearly fifty parsecs away.',
  'exoW.sunAndJupiterAt10': 'Sun and Jupiter at 10 pc',
  'exoW.theSameMethodAWide':
    'The same method, a wide orbit and a near system: hundreds of times easier.',
  'exoW.twiceAsFarAway': 'Twice as far away',
  'exoW.theStarSOrbitHas':
    'The star’s orbit has not changed at all. Only the angle it subtends has.',
  'exoW.starSReflexOrbit': 'Star’s reflex orbit',
  'exoW.angularSignature': 'Angular signature',
  'exoW.orbitalPeriod': 'Orbital period',
  'exoW.distanceChanges': 'Distance changes',
  'exoW.threeMethodsOneSystem': 'Three methods, one system',
  'exoW.tiltTheSamePlanetAnd':
    'Tilt the same planet and watch which measurements survive. No method wins everywhere.',
  'exoW.transit': 'Transit',
  'exoW.radialVelocity': 'Radial velocity',
  'exoW.astrometry': 'Astrometry',
  'exoW.together': 'Together',
  'exoW.whatDoWeActuallyKnow': 'What do we actually know?',
  'exoW.eachRowIsOneObservation':
    'Each row is one observation and what it buys. The last two rows need the ones above them.',
  'exoW.radiusFromTheTransit': 'Radius, from the transit',
  'exoW.massFromRadialVelocity': 'Mass, from radial velocity',
  'exoW.starSLuminosity': 'Star’s luminosity',
  'exoW.starSTemperature': 'Star’s temperature',
  'exoW.thePlanetThisLessonMeasured':
    'The planet this lesson measured. Large, light, and far too close to its star for the zone.',
  'exoW.planetAARockyCandidate': 'Planet A: a rocky candidate',
  'exoW.planetBPuffy': 'Planet B: puffy',
  'exoW.planetCRockyTooHot': 'Planet C: rocky, too hot',
  'exoW.aRockyDensityAndFar':
    'A rocky density, and far too close to its star for the zone. Composition alone was never the whole question.',
  'exoW.bulkDensity': 'Bulk density',
  'exoW.whichMeans': 'Which means',
  'exoW.starlightReceived': 'Starlight received',
  'exoW.modeledHabitableZone': 'Modeled habitable zone',
  'exoW.thisPlanetIs': 'This planet is',
  'binW.twoStarsOrbiting': 'Two stars, orbiting',
  'binW.bothStarsAreMovingWatch':
    'Both stars are moving. Watch them for a few seconds before reading anything off.',
  'binW.massOfStarA': 'Mass of Star A',
  'binW.massOfStarB': 'Mass of Star B',
  'binW.mark': '⚑ Mark',
  'binW.stop': '■ Stop',
  'binW.runPause': '▶ Run / Pause',
  'binW.reset': '↺ Reset',
  'binW.starADistanceFromThe': 'Star A, distance from the barycenter',
  'binW.starBDistanceFromThe': 'Star B, distance from the barycenter',
  'binW.distanceBetweenTheTwoStars': 'Distance between the two stars',
  'binW.whichStarIsCloserTo': 'Which star is closer to the balance point',
  'binW.yearsSinceYouStartedWatching': 'Years since you started watching',
  'binW.stopwatch': 'Stopwatch',
  'binW.timeForOneFullOrbit': 'Time for one full orbit',
  'binW.totalMassOfThePair': 'Total mass of the pair',
  'binW.howFarThePlanetMoves': 'How far the planet moves',
  'binW.howFarTheStarMoves': 'How far the star moves',
  'binW.theStarSWobbleCompared':
    'The star’s wobble, compared with the planet’s orbit',
  'binW.lightweightPair': 'lightweight pair',
  'binW.heavyweightPair': 'heavyweight pair',
  'binW.sameSizeOrbitDifferentMasses': 'Same size orbit, different masses',
  'binW.bothPairsAreExactlyThe':
    'Both pairs are exactly the same distance apart. Only the masses differ. Watch which one gets round first.',
  'binW.yearsElapsed': 'Years elapsed',
  'binW.separationOfEachPair': 'Separation of each pair',
  'binW.theBalancePoint': 'The balance point',
  'binW.aSeeSawBalancesWhen':
    'A see-saw balances when the heavier child sits closer to the middle. Two stars do exactly the same thing.',
  'binW.starADistanceFromThe2': 'Star A, distance from the middle',
  'binW.starBDistanceFromThe2': 'Star B, distance from the middle',
  'binW.1AuAnd2Au': '1 AU and 2 AU',
  'binW.starBIsTwiceAs':
    'Star B is twice as far out, so Star A must be twice as heavy to balance it.',
  'binW.1AuAnd3Au': '1 AU and 3 AU',
  'binW.starBIsThreeTimes':
    'Star B is three times as far out, so Star A is three times as heavy.',
  'binW.2AuAnd4Au': '2 AU and 4 AU',
  'binW.twiceAsFarAgainSo':
    'Twice as far again, so twice as heavy again. Only the ratio of the two distances matters, not the distances themselves.',
  'binW.equal2AuEach': 'Equal, 2 AU each',
  'binW.equalDistancesMeanEqualMasses':
    'Equal distances mean equal masses. This is the case you started the lesson with.',
  'binW.starAIsThisFar': 'Star A is this far from the middle',
  'binW.starBIsThisFar': 'Star B is this far from the middle',
  'binW.theHeavierStarAndBy': 'The heavier star, and by how much',
  'binW.siriusWatchedForACentury': 'Sirius, watched for a century',
  'binW.observationsUpTo': 'Observations up to',
  'binW.oneDecade': 'One decade',
  'binW.threeDotsTheyAreMoving':
    'Three dots. They are moving, but nobody could tell you the shape of the orbit from this.',
  'binW.halfAnOrbit': 'Half an orbit',
  'binW.oneFullOrbit': 'One full orbit',
  'binW.aCentury': 'A century',
  'binW.observationsPlotted': 'Observations plotted',
  'binW.yearsOfWatching': 'Years of watching',
  'binW.orbitsCompleted': 'Orbits completed',
  'binW.periodOnceTheOrbitCloses': 'Period, once the orbit closes',
  'binW.orbitSizeOnceTheOrbit': 'Orbit size, once the orbit closes',
  'tideW.thePullOnThreePoints': 'The pull on three points',
  'tideW.distanceToTheCompanion': 'Distance to the companion',
  'tideW.moonSDistance': '× Moon’s distance',
  'tideW.massOfTheCompanion': 'Mass of the companion',
  'tideW.moonSMass': '× Moon’s mass',
  'tideW.pullOnTheNearSide': 'Pull on the near side',
  'tideW.pullOnTheCentre': 'Pull on the centre',
  'tideW.pullOnTheFarSide': 'Pull on the far side',
  'tideW.nearSideMinusTheCentre': 'Near side, minus the centre',
  'tideW.farSideMinusTheCentre': 'Far side, minus the centre',
  'tideW.nearSideBiggerThanFar': 'Near side bigger than far side by',
  'tideW.towardTheCompanion': 'toward the companion',
  'tideW.whatIsLeftOver': 'what is left over',
  'tideW.tidalStrength': 'Tidal strength',
  'tideW.distance': 'Distance',
  'tideW.mass': 'Mass',
  'tideW.tidalStretch': 'Tidal stretch',
  'tideW.inFullUnits': 'In full units',
  'tideW.sevenRealTidesOnOne': 'Seven real tides, on one scale',
  'tideW.highlight': 'Highlight',
  'tideW.pairing': 'Pairing',
  'tideW.separation': 'Separation',
  'tideW.comparedWithTheLunarTide': 'Compared with the lunar tide',
  'tideW.cometIce': 'Comet ice',
  'tideW.aPorousWeaklyBoundNucleus':
    'A porous, weakly bound nucleus. Very little grip for its size, so the balance tips a long way out.',
  'tideW.theMoon': 'The Moon',
  'tideW.iron': 'Iron',
  'tideW.aDenseMetallicBodyMore':
    'A dense metallic body. More grip for its size, so it can come in closer before the balance tips.',
  'tideW.stretchAgainstGrip': 'Stretch against grip',
  'tideW.distanceFromTheEarthS': 'Distance from the Earth’s centre',
  'tideW.earthRadii': 'Earth radii',
  'tideW.densityOfTheBody': 'Density of the body',
  'tideW.itsOwnGravityAtIts': 'Its own gravity, at its surface',
  'tideW.tidalStretchAtItsSurface': 'Tidal stretch, at its surface',
  'tideW.stretchGrip': 'Stretch ÷ grip',
  'tideW.theTwoAreEqualAt': 'The two are equal at',
  'tideW.whatThatMeans': 'What that means',
  'tideW.bringAMoonInToward': 'Bring a moon in toward Saturn',
  'tideW.distanceFromSaturnSCentre': 'Distance from Saturn’s centre',
  'tideW.saturnRadii': 'Saturn radii',
  'tideW.densityOfTheMoon': 'Density of the moon',
  'tideW.porousIce': 'Porous ice',
  'tideW.whatSaturnSRingParticles':
    'What Saturn’s ring particles actually are: water ice, loosely packed. This is the case the rings themselves test.',
  'tideW.solidIce': 'Solid ice',
  'tideW.denseUnfracturedIceTheLimit':
    'Dense, unfractured ice. The limit moves inward, because a denser body grips itself harder.',
  'tideW.rock': 'Rock',
  'tideW.denserSoItHoldsTogether':
    'Denser, so it holds together closer in. The Roche limit is not one distance: it depends on what is falling in.',
  'tideW.denserStillAndTheLimit':
    'Denser still, and the limit moves in again. Change what the moon is made of and you change where it breaks.',
  'tideW.rocheLimitBodyWithNo': 'Roche limit, body with no strength',
  'tideW.rocheLimitBodyThatKeeps': 'Roche limit, body that keeps its shape',
  'tideW.stretchGripWhereYouHave': 'Stretch ÷ grip where you have put it',
  'tideW.verdict': 'Verdict',
  'tideW.forComparisonTheARing': 'For comparison, the A ring’s outer edge',
  'tideW.andMimasTheInnermostRound': 'And Mimas, the innermost round moon',
  'tideW.aSunLikeStarFalling': 'A Sun-like star falling toward a black hole',
  'tideW.blackHoleMass': 'Black hole mass',
  'tideW.stellar10M': 'Stellar, 10 M☉',
  'tideW.sagittariusA4MillionM': 'Sagittarius A*, 4 million M☉',
  'tideW.aGiant1BillionM': 'A giant, 1 billion M☉',
  'tideW.starIsTornApartAt': 'Star is torn apart at',
  'tideW.eventHorizonAt': 'Event horizon at',
  'tideW.tidalRadiusHorizon': 'Tidal radius ÷ horizon',
  'tideW.whatAnOutsideObserverSees': 'What an outside observer sees',
  'hzW.howMuchStarlightReachesThe': 'How much starlight reaches the planet?',
  'hzW.distanceFromTheStar': 'Distance from the star',
  'hzW.halfOfEarthSDistance': 'Half of Earth’s distance.',
  'hzW.earthSDistanceFromThe': 'Earth’s distance from the Sun.',
  'hzW.twiceEarthSDistance': 'Twice Earth’s distance.',
  'hzW.threeTimesEarthSDistance': 'Three times Earth’s distance.',
  'hzW.starlightReachingEachSquareMeter':
    'Starlight reaching each square meter',
  'hzW.theSameThingInPhysical': 'The same thing in physical units',
  'hzW.earthForComparison': 'Earth, for comparison',
  'hzW.theSameLightSpreadFurther': 'The same light, spread further',
  'hzW.theStarIsNotRunning':
    'The star is not running out of light. Watch the patch of light and the shell it lands on as the distance grows.',
  'hzW.theShell': 'The shell',
  'hzW.soEachSquareMeterGets': 'So each square meter gets',
  'hzW.totalEnergyCrossingTheShell': 'Total energy crossing the shell',
  'hzW.theShellIsThisMany': 'The shell is this many times bigger',
  'hzW.aDimRedDwarf': 'A dim red dwarf',
  'hzW.likeProximaCentauriTheNearest':
    'Like Proxima Centauri, the nearest star to the Sun.',
  'hzW.anOrangeDwarf': 'An orange dwarf',
  'hzW.likeAlphaCentauriB': 'Like Alpha Centauri B.',
  'hzW.theSun': 'The Sun',
  'hzW.theStarWeKnowBest': 'The star we know best.',
  'hzW.aHotterBrighterStar': 'A hotter, brighter star',
  'hzW.likeProcyonA': 'Like Procyon A.',
  'hzW.theSamePlanetADifferent': 'The same planet, a different star',
  'hzW.star': 'Star',
  'hzW.planetSDistance': 'Planet’s distance',
  'hzW.itsLuminosity': 'Its luminosity',
  'hzW.starlightThePlanetReceives': 'Starlight the planet receives',
  'hzW.habitableZoneRunsFrom': 'Habitable zone runs from',
  'hzW.thisPlanetIs': 'This planet is',
  'hzW.whereTheEdgesComeFrom': 'Where the edges come from',
  'hzW.definition': 'Definition',
  'hzW.conservative': 'Conservative',
  'hzW.optimistic': 'Optimistic',
  'hzW.definitionShown': 'Definition shown',
  'hzW.innerEdge': 'Inner edge',
  'hzW.outerEdge': 'Outer edge',
  'hzW.widthOfTheZone': 'Width of the zone',
  'hzW.earthSitsAt': 'Earth sits at',
  'hzW.aYearOnAnEccentric': 'A year on an eccentric orbit',
  'hzW.eccentricity': 'Eccentricity',
  'hzW.semiMajorAxis': 'Semi-major axis',
  'hzW.runPause': '▶ Run / Pause',
  'hzW.reset': '↺ Reset',
  'hzW.distanceRightNow': 'Distance right now',
  'hzW.starlightRightNow': 'Starlight right now',
  'hzW.closestFurthest': 'Closest / furthest',
  'hzW.starlightAtClosestFurthest': 'Starlight at closest / furthest',
  'hzW.rightNowThePlanetIs': 'Right now the planet is',
  'hzW.fractionOfTheYearInside': 'Fraction of the year inside the zone',
  'hzW.trappist1AllSevenPlanets': 'TRAPPIST-1, all seven planets',
  'hzW.zoneDefinition': 'Zone definition',
  'hzW.habitableZone': 'Habitable zone',
  'hzW.mercury': 'Mercury',
  'hzW.venus': 'Venus',
  'hzW.earth': 'Earth',
  'hzW.planetA': 'Planet A',
  'hzW.planetB': 'Planet B',
  'hzW.planetC': 'Planet C',
  'hzW.threePlanetsSimilarStarlight': 'Three planets, similar starlight',
  'hzW.showing': 'Showing',
  'transitW.howBigAShadow': 'How big a shadow?',
  'transitW.theSilhouetteOnTheLeft':
    'The silhouette on the left is drawn to scale. The curve on the right is the transit it produces.',
  'transitW.planetRadius': 'Planet radius',
  'transitW.starRadius': 'Star radius',
  'transitW.earthSun': 'Earth, Sun',
  'transitW.neptuneSun': 'Neptune, Sun',
  'transitW.jupiterSun': 'Jupiter, Sun',
  'transitW.earthTrappist1': 'Earth, TRAPPIST-1',
  'transitW.jupiterRedGiant': 'Jupiter, red giant',
  'transitW.radiusRatioRSubP': 'Radius ratio R<sub>p</sub> / R<sub>★</sub>',
  'transitW.transitDepthRSubP':
    'Transit depth (R<sub>p</sub> / R<sub>★</sub>)²',
  'transitW.sameDepthInSurveyUnits': 'Same depth in survey units',
  'transitW.photometryNeeded': 'Photometry needed',
  'transitW.theAngleYouHappenTo': 'The angle you happen to be at',
  'transitW.theChordIsThePath':
    'The chord is the path the planet takes across the disk. Slide the impact parameter until it misses.',
  'transitW.impactParameterB': 'Impact parameter b',
  'transitW.orbitSizeAR': 'Orbit size a / R★',
  'transitW.radiusRatioRpR': 'Radius ratio Rp / R★',
  'transitW.deadCenter': 'Dead center',
  'transitW.grazing': 'Grazing',
  'transitW.missedEntirely': 'Missed entirely',
  'transitW.earthAroundTheSun': 'Earth around the Sun',
  'transitW.orbitalInclinationI': 'Orbital inclination i',
  'transitW.doesItTransit': 'Does it transit?',
  'transitW.depthAtMidTransit': 'Depth at mid-transit',
  'transitW.durationAsAFractionOf': 'Duration, as a fraction of the orbit',
  'transitW.chanceARandomObserverSees': 'Chance a random observer sees it',
  'transitW.carbonMonoxide': 'carbon monoxide',
  'transitW.carbonDioxide': 'carbon dioxide',
  'transitW.thePlanetChangesSizeWith': 'The planet changes size with color',
  'transitW.wavelength': 'Wavelength',
  'transitW.cloudAndHazeCover': 'Cloud and haze cover',
  'transitW.scaleHeight': 'Scale height',
  'transitW.sodium0589M': 'Sodium, 0.589 μm',
  'transitW.water14M': 'Water, 1.4 μm',
  'transitW.theBandHubbleSInfrared':
    'The band Hubble’s infrared camera made routine, and the workhorse of atmospheric characterization before JWST.',
  'transitW.carbonDioxide43M': 'Carbon dioxide, 4.3 μm',
  'transitW.aCloudyPlanet': 'A cloudy planet',
  'transitW.transitDepth': 'Transit depth',
  'transitW.depthAboveTheBareRock': 'Depth above the bare-rock continuum',
  'transitW.apparentPlanetRadius': 'Apparent planet radius',
  'transitW.whatIsAbsorbing': 'What is absorbing',
  'transitW.aStarYouDidNot': 'A star you did not know was there',
  'transitW.companionContrastM': 'Companion contrast Δm',
  'transitW.radiusYouMeasured': 'Radius you measured',
  'transitW.equalTwinM0': 'Equal twin, Δm = 0',
  'transitW.theLessonSBinaryM': 'The lesson’s binary, Δm = 0.5',
  'transitW.theCompanionInTheBlended':
    'The companion in the Blended Binary scenario. It supplies 39% of the light and shrinks the measured planet by 22%.',
  'transitW.roboAoMedianM3': 'Robo-AO median, Δm = 3',
  'transitW.faintNeighborM6': 'Faint neighbor, Δm = 6',
  'transitW.fluxRatioFSub2': 'Flux ratio F<sub>2</sub> / F<sub>1</sub>',
  'transitW.shareOfTheLightFrom': 'Share of the light from the neighbor',
  'transitW.radiusCorrection1FSub':
    'Radius correction √(1 + F<sub>2</sub>/F<sub>1</sub>)',
  'transitW.truePlanetRadius': 'True planet radius',
  'transitW.wasItRocky': 'Was it rocky?',
  'transitW.whyNobodyNoticed': 'Why nobody noticed',
  'transitW.imageResolution': 'Image resolution',
  'transitW.fwhm': '″ FWHM',
  'transitW.companionSeparation': 'Companion separation',
  'transitW.ordinarySeeing': 'Ordinary seeing',
  'transitW.roboAoPalomar': 'Robo-AO, Palomar',
  'transitW.soarSpeckle41M': 'SOAR speckle, 4.1 m',
  'transitW.aHardCase': 'A hard case',
  'transitW.separationInUnitsOfThe': 'Separation, in units of the resolution',
  'transitW.howThePairLooks': 'How the pair looks',
  'transitW.lightFromTheCompanion': 'Light from the companion',
  'transitW.radiusCorrectionItImplies': 'Radius correction it implies',
  'transitW.thisFrameAsAShare': 'This frame, as a share of one TESS pixel',
  'energyChart.kineticEnergy': 'Kinetic Energy',
  'energyChart.potentialEnergy': 'Potential Energy',
  'energyChart.totalEnergy': 'Total Energy',

  // --- Tidal comparison table ------------------------------------------------
  'tideP.moonOnEarth': 'the Moon, on the Earth',
  'tideP.sunOnEarth': 'the Sun, on the Earth',
  'tideP.earthOnMoon': 'the Earth, on the Moon',
  'tideP.jupiterOnIo': 'Jupiter, on Io',
  'tideP.starOnHotJupiter': 'a Sun-like star, on a hot Jupiter at 0.05 AU',
  'tideP.bhOnSunFar': 'a 10 M☉ black hole, on the Sun at one AU',
  'tideP.bhOnSunNear': 'the same black hole, on the Sun at three million km',

  // --- Lesson panel chrome ---------------------------------------------------
  'inv.step.counter': 'Step {n} of {total}',
  'inv.step.kind.read': 'read',
  'inv.step.kind.predict': 'predict',
  'inv.step.kind.explore': 'explore',
  'inv.step.kind.measure': 'measure',
  'inv.step.kind.question': 'question',
  // Kepler's Laws steps 5 and 10 are their own step types - an ellipse the
  // student reshapes and a set of swept-area wedges - and neither had a badge,
  // so the first lesson in the catalogue printed the literal text
  // "inv.step.kind.ellipse" where a word should be. They are hands-on screens,
  // so they take the word the other hands-on screens already use rather than
  // introducing two more for a reader to learn.
  'inv.step.kind.ellipse': 'explore',
  'inv.step.kind.wedges': 'explore',
  'inv.action.restart': 'Restart',
  'inv.action.restart.hint': 'Clear every answer and start this lesson again',
  'inv.action.back': 'Back',
  'inv.action.back.hint': 'Previous step (Shift + Left arrow)',
  'inv.probe.title': 'Live readout',
  'objectType.stars': 'Add Stars',

  // --- Words a lesson computes ----------------------------------------------
  // Probe rows and answer-checking messages come out of functions inside the
  // lesson files, which a translation shadow cannot reach. js/i18n/lesson.js
  // looks them up by what they say. See that file.
  'lessonFn.distancesHaveToBePositiveNumbers38':
    'Distances have to be positive numbers.',
  'lessonFn.closestApproachIsLargerThanFurthest70':
    'Closest approach is larger than furthest distance: these look swapped.',
  'lessonFn.eccentric9': 'Eccentric',
  'lessonFn.semiMajorAxis15': 'semi-major axis',
  'lessonFn.clickAPlanetToSelectIt27': 'Click a planet to select it',
  'lessonFn.body4': 'Body',
  'lessonFn.noOrbitFound14': 'no orbit found',
  'lessonFn.selected8': 'Selected',
  'lessonFn.eccentricityE14': 'Eccentricity e',
  'lessonFn.closestPeriapsis19': 'Closest (periapsis)',
  'lessonFn.furthestApoapsis19': 'Furthest (apoapsis)',
  'lessonFn.currentSpeed13': 'Current speed',
  'lessonFn.selectTheEccentricOrbiter28': 'Select the Eccentric Orbiter',
  'lessonFn.distanceFromStar18': 'Distance from star',
  'lessonFn.speedNow9': 'Speed now',
  'lessonFn.speedsHaveToBePositiveRead77':
    'Speeds have to be positive. Read the "Speed now" value, which is a magnitude.',
  'lessonFn.yourClosestSpeedIsLowerThan181':
    'Your "closest" speed is lower than your "furthest" speed. That is the wrong way round for any bound orbit. Check which reading you took where, using the distance to tell them apart.',
  'lessonFn.selectAPlanet15': 'Select a planet',
  'lessonFn.atAnExtreme14': 'At an extreme?',
  'lessonFn.closestReadNow17': 'closest: read now',
  'lessonFn.furthestReadNow18': 'furthest: read now',
  'lessonFn.inBetween10': 'in between',
  'lessonFn.closestThisOrbit18': 'Closest this orbit',
  'lessonFn.furthestThisOrbit19': 'Furthest this orbit',
  'lessonFn.planet6': 'Planet',
  'lessonFn.distancesAndPeriodsMustBothBe44':
    'Distances and periods must both be positive.',
  'lessonFn.clickAPlanetToMeasureIt28': 'Click a planet to measure it',
  'lessonFn.bothValuesMustBePositive29': 'Both values must be positive.',
  'lessonFn.clickAPlanetToReRead28': 'Click a planet to re-read it',
  'lessonFn.clickAPlanet14': 'Click a planet',
  'lessonFn.noOrbit8': 'no orbit',
  'lessonFn.tooHigh8': 'too high',
  'lessonFn.checkThatAAndPCame45':
    'Check that a and P came from the same planet.',
  'lessonFn.theSemiMajorAxisLooksToo112':
    'The semi-major axis looks too large. Every orbit here is under 0.07 AU, so the value should start 0.0 something.',
  'lessonFn.thePeriodLooksTooSmallFor119':
    'The period looks too small for days. The readout gives days, and the shortest year in this system is about 1.5 of them.',
  'lessonFn.thePeriodLooksTooLargeFor79':
    'The period looks too large for days. The longest year here is about 19 of them.',
  'lessonFn.outByMoreThanAFactor97':
    'Out by more than a factor of three, which usually means a and P were read from different planets.',
  'lessonFn.clickAPlanetToReadIt25': 'Click a planet to read it',
  'lessonFn.notFound9': 'not found',
  'lessonFn.referenceFrame15': 'Reference frame',
  'lessonFn.worldNotSwitchedYet23': 'World, not switched yet',
  'lessonFn.marsDistanceFromEarth25': 'Mars: distance from Earth',
  'lessonFn.marsDirectionFromEarth26': 'Mars: direction from Earth',
  'lessonFn.selectMars11': 'Select Mars',
  'lessonFn.world5': 'World',
  'lessonFn.aBody6': 'A body',
  'lessonFn.sunDistanceFromEarth24': 'Sun: distance from Earth',
  'lessonFn.sunDirectionFromEarth25': 'Sun: direction from Earth',
  'lessonFn.baselineOutOfTransit24': 'Baseline, out of transit',
  'lessonFn.completeTransitsRecorded26': 'Complete transits recorded',
  'lessonFn.waitingForACompleteTransit30': 'Waiting for a complete transit',
  'lessonFn.clock5': 'Clock',
  'lessonFn.theBottomOfATransitSits137':
    'The bottom of a transit sits <em>below</em> the baseline, so the depth has to come out positive. Check that you have not swapped the two.',
  'lessonFn.a20DipWouldBeA153':
    'A 20% dip would be a stellar eclipse, not a planet. If you entered numbers like 98.2 and 100, enter the brightness itself rather than a percentage of it.',
  'lessonFn.thatIsShallowerThanThisSystem156':
    'That is shallower than this system can produce. Make sure the bottom value really is from the lowest point of a dip and not from the shoulder on the way in.',
  'lessonFn.goodAbout18GivingA152':
    'Good: about 1.8%, giving a radius ratio near 0.135. Hold on to that number, because the next step is going to tell you it is about 10% too big, and why.',
  'lessonFn.expectedSomewhereNear0018For153':
    'Expected somewhere near 0.018 for this system. Read the baseline from a flat stretch well away from any dip, and the bottom from the lowest point of one.',
  'lessonFn.theStarRadiusGoesInSolar93':
    'The star radius goes in solar radii, not in kilometers or in Jupiters. HD 209458 is 1.155 R☉.',
  'lessonFn.theDepthIsAFractionNot65':
    'The depth is a fraction, not a percentage: 1.8% goes in as 0.018.',
  'lessonFn.thatIsItAbout138218':
    'That is it: about 1.38 Jupiter radii, or 15.5 Earth radii. The published value from a decade of Hubble transits is 1.38 R_Jupiter. You just measured a planet 160 light years away by watching a star get slightly dimmer.',
  'lessonFn.tooLargeCheckThatYouDivided170':
    'Too large. Check that you divided the depth by 1.215 before taking the square root rather than after, and that the depth is the one you measured rather than a percentage.',
  'lessonFn.tooSmallTheMostCommonCause121':
    'Too small. The most common cause is reading the bottom of the dip from the ingress shoulder rather than the lowest point.',
  'lessonFn.theSecondStampHasToCome78':
    'The second stamp has to come after the first. Swap them, or take a fresh pair.',
  'lessonFn.atLeastOneOrbitHasTo52':
    'At least one orbit has to pass between two transits.',
  'lessonFn.countTheGapsBetweenTheTransits65':
    'Count the gaps between the transits, not the transits themselves.',
  'lessonFn.about35DaysThePublished138':
    'About 3.5 days. The published period of HD 209458 b is 3.5247 days, known to better than a tenth of a second from two decades of transits.',
  'lessonFn.thatIsTwiceThePeriodA113':
    'That is twice the period: a transit went by between your two stamps and was not counted. Put 2 in the orbits box.',
  'lessonFn.thatIsAboutHalfThePeriod166':
    'That is about half the period. Check that both stamps were taken at the bottom of a transit and not one at a transit and one at the secondary eclipse halfway between.',
  'lessonFn.expectedSomethingNear35Days131':
    'Expected something near 3.5 days. Check that the orbit count matches the difference between the two transit numbers in the readout.',
  'lessonFn.thePeriodGoesInDaysNot102':
    'The period goes in days, not years. Three and a half days, not three and a half thousandths of a year.',
  'lessonFn.theMassGoesInSolarMasses58':
    'The mass goes in solar masses. HD 209458 is 1.148 of them.',
  'lessonFn.about0047AuOneEighth372':
    'About 0.047 AU: one eighth of Mercury’s distance from the Sun, and roughly nine stellar radii out. At 1,450 K the planet’s day side is hot enough to glow dull red on its own. Nothing in planet formation theory before 1995 put a gas giant there, and working out how it arrived is still an active argument between migration through the disk and scattering off other planets.',
  'lessonFn.expectedRoughly0047AuCheck84':
    'Expected roughly 0.047 AU. Check the period is in days and the mass in solar masses.',
  'lessonFn.bothDepthsAreFractionsNotPercentages66':
    'Both depths are fractions, not percentages: 1.1% goes in as 0.011.',
  'lessonFn.theBlendedDepthHasToBe110':
    'The blended depth has to be the <em>shallower</em> of the two. Check you have not put them in the wrong boxes.',
  'lessonFn.thatIsTheResultTheBlended291':
    'That is the result. The blended curve says about 12 Earth radii; the correction of roughly ×1.28 takes it back to about 15.5, which is the 1.38 Jupiter radii you measured before the companion was there. The implied contrast should land near Δm = 0.5, which is what the companion actually is.',
  'lessonFn.theRatioIsLargerThanThis135':
    'The ratio is larger than this companion can produce. Re-read the blended depth: it should be near 0.011, not near half the clean value.',
  'lessonFn.expectedARatioNear163135':
    'Expected a ratio near 1.63 and a corrected radius near 15.5 R⊕. Check both depths came from the bottom of a dip rather than a shoulder.',
  'lessonFn.clickABodyInTheSimulation30': 'Click a body in the simulation',
  'lessonFn.nothingToOrbit16': 'nothing to orbit',
  'lessonFn.distanceFromTheStar22': 'Distance from the star',
  'lessonFn.speed5': 'Speed',
  'lessonFn.totalEnergy12': 'Total energy',
  'lessonFn.belowZero10': 'below zero',
  'lessonFn.aboveZero10': 'above zero',
  'lessonFn.boundOrUnbound16': 'Bound or unbound',
  'lessonFn.boundItComesBack20': 'bound: it comes back',
  'lessonFn.unboundItIsLeaving22': 'unbound: it is leaving',
  'lessonFn.furthestItGets16': 'furthest it gets',
  'lessonFn.forThisPracticeRunPut293':
    'For this practice run, put 2 in both boxes. You can experiment with other numbers afterwards.',
  'lessonFn.222Is8And204':
    '2 × 2 × 2 is 8, and 2 × 2 is 4, and 8 divided by 4 is 2. The pair weighs <strong>2 solar masses</strong> between them. Nobody went there. Nobody weighed anything. Two measurements of an orbit were enough.',
  'lessonFn.bothMeasurementsHaveToBePositive46':
    'Both measurements have to be positive numbers.',
  'lessonFn.thatLooksLikeOneStarS187':
    'That looks like one star’s distance from the balance point rather than the whole orbit. The orbit size is measured from one star <em>across to the other</em>: add both distances together.',
  'lessonFn.checkTheOrbitSizeAgainstThe137':
    'Check the orbit size against the rings. Star A sits on one ring and Star B on another, and the number you want is the two added together.',
  'lessonFn.checkThePeriodTimeStarA106':
    'Check the period. Time Star A from the dotted line all the way round until it crosses the same line again.',
  'lessonFn.youHaveThemTheWrongWay130':
    'You have them the wrong way round. Star A is the one that stays close to the balance point, which makes it the heavier of the two.',
  'lessonFn.threeSolarMassesAndOneSolar125':
    'Three solar masses and one solar mass. You have just weighed two individual stars, separately, using a ruler and a stopwatch.',
  'lessonFn.theTwoAddUpCorrectlyBut126':
    'The two add up correctly, but not in a three to one ratio. Count the blocks: three on Star A’s side for every one on Star B’s.',
  'lessonFn.put3InBothBoxesThe65':
    'Put 3 in both boxes: the pair is 3 AU apart with a 3 year period.',
  'lessonFn.333Is27And102':
    '3 × 3 × 3 is 27, and 3 × 3 is 9, and 27 divided by 9 is 3. Three solar masses between the two of them.',
  'lessonFn.isProportionalTo18': 'is proportional to',
  'lessonFn.howConcentratedIsThisThingOn63':
    'how concentrated is this thing, on the scale of its own horizon',
  'lessonFn.whatEarthGets15': 'what Earth gets',
  'lessonFn.distancesAndStarlightAreBothPositive50':
    'Distances and starlight are both positive numbers.',
  'lessonFn.theseDoNotAllSitOn114':
    'These do not all sit on the same relationship. Check that each starlight value was read at the distance beside it.',
  'lessonFn.everyOneOfYourReadingsSatisfies123':
    'Every one of your readings satisfies starlight x distance x distance = 1. That is the pattern, already in your own numbers.',
  'lessonFn.thoseMatchNowSayItIn298':
    'Those match. Now say it in words, and say it carefully: e, f and g lie within the modeled habitable zone. That is a statement about their orbits and their star, and it is the correct thing to say. It is not a statement that any of them has water, an atmosphere, or a surface anyone would recognize.',
  'lessonFn.rotationCurve14': 'Rotation curve',
  'lessonFn.openThePanel14': 'open the panel',
  'lessonFn.bodiesPlotted14': 'Bodies plotted',
  'lessonFn.innermost9': 'Innermost',
  'lessonFn.outermost9': 'Outermost',
  'lessonFn.fittedSlope12': 'Fitted slope',
  'lessonFn.proportionalToRadius22': 'proportional to radius',
  'lessonFn.halo4': 'Halo',
  'lessonFn.outermostStar14': 'Outermost star',
  'lessonFn.slope5': 'Slope',
  'lessonFn.luna4': 'Luna',
  'lessonFn.bodiesOnScreen16': 'Bodies on screen',
  'lessonFn.earthAndTheMoon19': 'Earth, and the Moon',
  'lessonFn.moonSDistanceNow19': 'Moon’s distance now',
  'lessonFn.buildingTheSystem20': 'building the system…',
  'lessonFn.realSeparation15': 'Real separation',
  'lessonFn.384400KmOnAverage22': '384,400 km, on average',
  'lessonFn.distancesAndTidalStrengthsAreBoth56':
    'Distances and tidal strengths are both positive numbers.',
  'lessonFn.theseDoNotAllSitOn185':
    'These do not all sit on one relationship. The usual cause is a strength read at a different distance from the one beside it: check each row against the slider position that produced it.',
  'lessonFn.massesAndTidalStrengthsAreBoth53':
    'Masses and tidal strengths are both positive numbers.',
  'lessonFn.stretchMassIsNotComingOut190':
    'Stretch ÷ mass is not coming out the same for every row. Check that the distance slider stayed put while you changed the mass: moving both at once hides the relationship you are looking for.',
  'lessonFn.bodiesBeingTracked20': 'Bodies being tracked',
  'lessonFn.whatIsSimulated17': 'What is simulated',
  'lessonFn.newtonianGravityBetweenPointMasses38':
    'Newtonian gravity between point masses',
  'lessonFn.whatIsNot11': 'What is not',
  'lessonFn.fluidFlowPressureRadiation31': 'Fluid flow, pressure, radiation',

  // --- Answer feedback -------------------------------------------------------
  'inv.answer.matches': 'That matches.',
  'inv.answer.notYet': 'Not yet. Check your working and try again.',
  'inv.answer.oneGood': 'One good answer:',
  'inv.answer.placeholder': 'Your value',
  'inv.answer.check': 'Check',
};
