// =============================================================================
// Messages that arrive with the chunk that needs them
// -----------------------------------------------------------------------------
// Strings for panels nobody sees on a first visit: the two scenario-specific
// instruments, the radial velocity analysis workspace, and the transit noise
// budget. Together they are about twelve kilobytes of prose, and every visitor
// was downloading all of it at start-up so that four scenarios and one lesson
// widget could have their labels.
//
// They are a separate catalogue rather than part of js/i18n/en.js because a
// single object cannot be code-split: esbuild follows the static import and
// the whole thing lands in the entry graph. The bridges that load those panels
// register these through registerMessages() at the same moment, so a reader
// who opens one gets the strings and a reader who does not never fetches them.
//
// Everything else about them is normal. The audit and the i18n tests merge
// both halves, so coverage, placeholder and length checks still see one
// catalogue.
// =============================================================================

export const EN_DEFERRED = {
  'binaryRun.close.hint': 'Hide the binary run panel',
  'assist.close.hint': 'Hide the gravity assist panel',
  'rvfit.close.hint': 'Hide the analysis workspace',
  'rvfit.period': 'Period',
  'rvfit.amplitude': 'Amplitude K',
  'rvfit.phase': 'Phase',
  'rvfit.gamma': 'Systemic velocity',
  'rvfit.minPeriod': 'Search from',
  'rvfit.maxPeriod': 'to',
  'rvfit.snap': 'Best fit at this period',
  'rvfit.search': 'Search this range',
  'rvfit.reveal': 'Reveal simulation truth',
  'rvfit.status.none': 'No recording',
  'rvfit.status.tooFew': 'Not enough measurements',
  'rvfit.status.points': '{used} measurements fitted, {dropped} excluded',
  'rvfit.status.degraded':
    '({n} of those were interpolated across frames too coarse to resolve the curve, so they are held out of the fit.)',
  'rvfit.status.unverified':
    '({n} were interpolated with too little history to estimate the error, which is unknown rather than small. They are fitted.)',
  'rvfit.noStats':
    'This model cannot be scored against these measurements. Check the period.',
  'rvfit.tooFew':
    'A circular model has four parameters, so it needs at least three usable measurements and this recording has {n}.',
  'rvfit.chi2': 'Reduced \u03c7\u00b2 {reduced}, residual RMS {rms} m/s',
  'rvfit.noChi2':
    'Residual RMS {rms} m/s. No reduced \u03c7\u00b2, because these measurements carry no usable uncertainties and a \u03c7\u00b2 computed from invented weights would not mean anything.',
  'rvfit.rivalsList':
    'Periods fitting within \u0394\u03c7\u00b2 = 1 of the best: {list}. Nothing in this data distinguishes them.',
  'rvfit.oneMinimum':
    'One clear minimum in the searched range. That is a statement about this range and this sampling, not a detection.',
  'rvfit.structured':
    'The residuals change sign {runs} times where {expected} would be expected by chance. They have a shape, so the circular model is missing something.',
  'rvfit.unstructured':
    'The residuals change sign {runs} times against {expected} expected by chance, which is what scattered noise looks like.',
  'rvfit.truth':
    'The simulation used: period {period} d, K {K} m/s, systemic velocity {gamma} m/s.',
  'rvfit.noTruth':
    'This recording does not carry its generating parameters, so there is nothing to reveal.',
  'rvfit.badBounds':
    'The search needs a range with a positive lower bound below the upper one.',
  'rvfit.noData': 'Take a recording first',
  'rvfit.noSearch': 'Run a bounded search to see the \u03c7\u00b2 curve',
  'rvfit.plot.time': 'measurements and model',
  'rvfit.plot.folded': 'folded on the trial period',
  'rvfit.plot.residuals': 'residuals',
  'rvfit.plot.periodogram': '\u03c7\u00b2 against period',
  'rvfit.rivals': '{n} periods fit about equally well',
  'rvfit.hint':
    'A circular single-planet model: period, amplitude, phase and systemic velocity, and nothing else. When it does not fit, the residuals will show a shape rather than absorbing the problem into a parameter \u2014 which is the reason for keeping the model this restrictive. The lowest point on the periodogram is not an answer: on sparsely sampled data several periods routinely fit equally well, and the ones that do are listed beneath it.',
  'assist.impact': 'Impact parameter (+ behind, \u2212 ahead)',
  'assist.run': 'Fly it',
  'assist.flip': 'Other side',
  'assist.planetFrame': 'Planet\u2019s frame',
  'assist.side': 'Passed',
  'assist.side.leading': 'in front of the planet',
  'assist.side.trailing': 'behind the planet',
  'assist.closest': 'Closest approach',
  'assist.closest.value': '{au} AU ({radii} planet radii)',
  'assist.deflection': 'Turned by',
  'assist.deflection.value': '{measured}\u00b0 (two-body: {predicted}\u00b0)',
  'assist.frame.planet': 'Relative to the planet',
  'assist.frame.inertial': 'Relative to everything else',
  'assist.before': 'Before',
  'assist.after': 'After',
  'assist.change': 'Change',
  'assist.change.value': '{delta} km/s ({percent}%)',
  'assist.recoil': 'What it cost the planet',
  'assist.recoil.value': '{dv} mm/s, or {ratio} of its own speed',
  'assist.ledger':
    'The spacecraft gained {probe} of momentum and the planet lost {planet} \u2014 the same number to {mismatch}%. Nothing was created; it was transferred.',
  'assist.maxDeltaV':
    'No flyby of this planet at this approach speed can change the velocity by more than {max} km/s, which is twice the approach speed and needs a full reversal.',
  'assist.status.idle': 'Not started',
  'assist.status.inbound': 'Approaching',
  'assist.status.outbound': 'Departing',
  'assist.status.done': 'Flyby complete',
  'assist.status.lost': 'The spacecraft did not survive the pass',
  'assist.caveat.pending':
    'A star is present, so the numbers on the left will not match exactly. How closely they do is the measure of the approximation, and it appears here once the flyby finishes.',
  'assist.caveat.helio':
    'The speed relative to the planet changed by {residual}% across this encounter, and in the isolated version it changes by nothing at all. That residual is the approximation: the planet is accelerating, so its frame is not inertial, and the star pulls on the spacecraft too. Readings were taken {gate} AU out, against a Hill radius of {hill} AU \u2014 the distance beyond which the star, not the planet, is what the spacecraft is really orbiting. This is the patched-conic approximation, and it is what mission designers actually use.',
  'assist.hint':
    'The two columns describe the same encounter at the same two moments. The left one cannot change, because the planet does no work on the spacecraft in the planet\u2019s own frame. The right one changes because a vector of fixed length has been rotated and then added to the planet\u2019s velocity. Nothing is created: the planet is slowed by exactly the momentum the spacecraft gains.',
  'binaryRun.planetA': 'Planet start (a / a_binary)',
  'binaryRun.periods': 'Binary periods to run',
  'binaryRun.timestep': 'Integration step',
  'binaryRun.start': 'Run',
  'binaryRun.halve': 'Repeat at half the step',
  'binaryRun.progress': 'Integrated',
  'binaryRun.progress.value': '{done} of {asked} binary periods, {steps} steps',
  'binaryRun.drift': 'Energy drift',
  'binaryRun.step': 'Step actually used',
  'binaryRun.step.varied': '{mean} mean, {max} largest',
  'binaryRun.encounters': 'Close encounters',
  'binaryRun.closest': 'Closest to the other star',
  'binaryRun.farthest': 'Farthest out',
  'binaryRun.orbit': "Planet's orbit now",
  'binaryRun.orbit.value': 'a = {a} separations, e = {e}',
  'binaryRun.orbit.open': 'e = {e}, an open orbit — no longer closing',
  'binaryRun.maxEcc': 'Highest eccentricity reached',
  'binaryRun.status.idle': 'Not started',
  'binaryRun.status.running': 'Running',
  'binaryRun.status.finished': 'Finished',
  'binaryRun.outcome.notStarted':
    'Set a starting radius and a number of binary periods, then run.',
  'binaryRun.outcome.running': 'Running: {periods} of {asked} binary periods.',
  'binaryRun.outcome.survived':
    'The planet survived this integration of {periods} binary periods. That is a statement about this run and not about the future: instability here is often slow, and the published study this is compared against ran for ten thousand binary periods.',
  'binaryRun.outcome.ejected':
    'The planet was ejected after {periods} binary periods. It ended up unbound from both stars and more than ten binary separations out, so it is leaving rather than on a wide orbit.',
  'binaryRun.outcome.collided':
    'The planet hit a star after {periods} binary periods. The stars here are drawn about ten times life size and the collision distance is the drawn size, so read this as "it passed within about 0.06 AU of a star" rather than as a measured impact.',
  'binaryRun.outcome.unreliable':
    'This run cannot be believed. Energy changed by {drift}%, past the {limit}% screen, which means the step stopped resolving something the outcome depends on — almost always a close approach. What happened to the planet after that is about the arithmetic. Repeat it at half the step.',
  'binaryRun.outcome.vanished':
    'The planet left the simulation without being recorded as a collision. There is no physical claim to make about that; start the run again.',
  'binaryRun.boundary.inside':
    'Holman & Wiegert put the critical radius for this mass ratio and eccentricity at {critical} binary separations; this planet started at {a}, on the surviving side.',
  'binaryRun.boundary.outside':
    'Holman & Wiegert put the critical radius for this mass ratio and eccentricity at {critical} binary separations; this planet started at {a}, on the disrupted side.',
  'binaryRun.boundary.tooClose':
    'This planet started at {a} binary separations and Holman & Wiegert put the critical radius at {critical}. That is inside the fit\u2019s own uncertainty, so it does not predict either way.',
  'binaryRun.boundary.extrapolated':
    'These values are outside the range the fit was made over, so that figure is an extrapolation.',
  'binaryRun.boundary.source':
    'Source: Holman & Wiegert 1999, AJ 117, 621. The fit assumes a massless planet, coplanar and prograde with the binary, starting on a circular orbit, and defines survival as lasting 10\u2074 binary periods. It is a fit to where the transition mostly sits, and the paper reports islands of instability inside it and of stability outside it.',
  'binaryRun.hint':
    'An outcome here describes this integration and no more. Instability in these systems is often slow: a planet can circle quietly for hundreds of binary periods before its orbit is walked out of the system, so "survived" is a statement about the run you did, not about the future. Energy drift is a screen and not a certificate \u2014 the test that settles an outcome is repeating the run at half the step and getting the same answer.',
  'exoW.readout.depthOverNoise': 'Depth over noise',
  'exoW.readout.totalNoise': 'Total noise on the depth',
  'exoW.readout.photonAfterAveraging': 'Photon noise, after averaging',
  'exoW.readout.correlatedFloor': 'Correlated floor',
  'exoW.readout.inTransitHours': 'Hours spent in transit',
  'exoW.readout.ceiling': 'Best possible, with infinite observing',
  'exoW.whatSwampsATransit': 'What a transit is competing with',
  'exoW.whatSwampsATransit.note':
    'Photon noise is quoted per hour and averages down over the whole in-transit time. The other two are correlated on the timescale of a transit and do not average down at all.',
  'exoW.transitDepth': 'Transit depth',
  'exoW.photonNoise': 'Photon and read noise',
  'exoW.stellarNoise': 'Starspots and granulation',
  'exoW.instrumentNoise': 'Instrument and atmosphere',
  'exoW.transitDuration': 'Transit duration',
  'exoW.transitsObserved': 'Transits observed',
  'exoW.ppmAxis': 'parts per million',
  'exoW.depthMarker': 'depth',
  'exoW.depthOverNoise': 'depth / noise = {ratio}',
  'exoW.noise.photon': 'photon',
  'exoW.noise.stellar': 'stellar',
  'exoW.noise.instrument': 'instrument',
  'exoW.noise.total': 'total',
  'exoW.preset.hotJupiterKepler': 'Hot Jupiter, Kepler',
  'exoW.preset.hotJupiterKepler.note':
    'A HAT-P-7 b-like hot Jupiter: 6,400 ppm deep, a four-hour transit, and six hundred of them over four years from a stable platform above the atmosphere. The easy end of the problem.',
  'exoW.preset.sameFromTheGround': 'Same planet, from the ground',
  'exoW.preset.sameFromTheGround.note':
    'The identical planet and the identical depth, through air. Scintillation and airmass trends are correlated on exactly the timescale of a transit, so they set a floor that more nights cannot lower.',
  'exoW.preset.superEarthTess': 'Super-Earth, TESS',
  'exoW.preset.superEarthTess.note':
    'Pi Mensae c: twice Earth\u2019s radius around a naked-eye star, 290 ppm. A real TESS detection, and not a comfortable one.',
  'exoW.preset.rockyTess': 'Rocky planet in the habitable zone, TESS',
  'exoW.preset.rockyTess.note':
    'TOI-700 d: about Earth\u2019s size, but around a small red star, so the depth is a respectable 550 ppm. The difficulty is a 37-day period \u2014 roughly one transit per TESS sector, and it took a year of them.',
  'exoW.preset.earthTwin': 'Earth twin, TESS',
  'exoW.preset.earthTwin.note':
    'An Earth around a Sun, seen by TESS: 84 ppm, a thirteen-hour transit, one transit a year. The longest transit here and the least detectable planet, which is worth sitting with.',

  // --- The numerical reliability check ---------------------------------------
  // Deliberately careful wording throughout. There is no string here that says
  // a result is accurate, because a convergence check cannot establish that:
  // the strongest thing it supports is that halving the step did not move the
  // answer, which is a much smaller claim.
  'reliability.title': 'Numerical reliability',
  'reliability.hint':
    'Runs this experiment twice over the same simulated time - once at the step the engine is taking and once at half of it - and reports which conclusions survive.',
  'reliability.run': 'Check against a halved step',
  'reliability.cancel': 'Stop',
  'reliability.running': 'Running {phase} of 2, {percent}% of the way',
  'reliability.phase.coarse': 'the run at the current step',
  'reliability.phase.fine': 'the run at half the step',
  'reliability.cost':
    'Two runs of {duration} simulated units took {seconds}s: {coarseSub} substeps per frame, then {fineSub}.',
  'reliability.steps': 'Step {coarse} against {fine}',
  'reliability.export': 'Export this check',

  'reliability.verdict.converging':
    'Halving the step did not move this result.',
  'reliability.verdict.unresolved':
    'Halving the step moved this result. It is a statement about the timestep, not about the system.',
  'reliability.verdict.incomparable':
    'These two runs are not measurements of the same thing, so nothing can be concluded from the difference.',
  'reliability.verdict.diverged':
    'The two paths separated, but the aggregate measurements held.',

  'reliability.reason.missingRun': 'One of the two runs is missing.',
  'reliability.reason.noDuration': 'A run covered no simulated time.',
  'reliability.reason.differentDurations':
    'The runs covered different amounts of simulated time.',
  'reliability.reason.differentSystems':
    'The runs ended with different numbers of bodies - something merged or was destroyed in one and not the other. That is a finding in itself, and a more interesting one than any number here.',
  'reliability.reason.noStep': 'The integration step could not be read.',
  'reliability.reason.stepNotHalved':
    'The second run was not more finely integrated than the first.',
  'reliability.reason.noMeasurement':
    'Nothing was measured that could be compared.',
  'reliability.reason.trajectoryDiverged':
    'The paths agreed at the start and parted later, which is what chaos looks like rather than what a bad step looks like.',
  'reliability.reason.disagreedFromTheStart':
    'The paths disagreed from the beginning. Nothing chaotic about that: the coarser run was not resolving the motion.',
  'reliability.reason.outcomeMoved':
    'The measured outcome changed by more than the tolerance.',
  'reliability.reason.aggregateMovedToo':
    'The paths separated and the aggregate moved as well, so there is nothing left to fall back on.',
  'reliability.reason.substepCeiling':
    'This scenario is already integrating at {n} substeps per frame, and the engine will not take twice as many. A finer run cannot be made here, so no comparison is offered rather than one against a run at the same step.',
  'reliability.reason.noExperiment': 'Capture a starting state first.',
  'reliability.reason.recording': 'A run is being recorded.',
  'reliability.reason.alreadyRunning': 'A check is already running.',
  'reliability.reason.noMetrics': 'Choose at least one quantity to measure.',
  'reliability.reason.cancelled': 'Stopped. The world is back where it was.',

  'reliability.conservationIsNotAccuracy':
    'Energy and angular momentum are shown as separate evidence, not as the verdict. A well-conserved run can still be wrong: energy is one number, and a close approach can be resolved far too coarsely without disturbing it.',
  'reliability.conservationNotExpected':
    'This model is not a closed system, so a drifting energy is it working as designed rather than a fault. The drift figures are reported but decide nothing.',
  'reliability.driftDidNotFall':
    'The energy drift did not fall when the step was halved. That is a reason to look harder, not a verdict - the verdict above was computed without it.',
  'reliability.chaosSeparates':
    'Two runs of a chaotic system separate eventually however finely they are integrated, and both can still be numerically useful. What matters is that they agreed early: a badly resolved pair disagrees from the first close approach.',
  'reliability.quoteStatistics':
    'Quote the aggregates from this run rather than positions at a given time.',
  'reliability.stillNotProof':
    'That is not the same as the result being right. It means this step is not what is deciding it.',
  'reliability.agrees': 'unchanged within {tolerance}',
  'reliability.moved': 'moved by {change}',
  'reliability.noValue': 'not measured',

  // --- The A/B experiment bench ---------------------------------------------
  // Moved out of the start-up catalogue. The bench is loaded on first press
  // and most visitors never press it, so its prose has no business being
  // downloaded by everyone; js/experimentsBridge.js registers this before the
  // panel builds its markup. bench.error.load stays in the base catalogue,
  // because it is what the bridge says when this very import fails.
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

  // --- The parameter sweep ----------------------------------------------------
  'sweep.title': 'Parameter sweep',
  'sweep.hint':
    'Runs the same scenario several times, changing one parameter and nothing else, and reports how the measurement moves with it.',
  'sweep.scenario': 'Scenario',
  'sweep.parameter': 'Parameter',
  'sweep.from': 'From',
  'sweep.to': 'to',
  'sweep.count': 'Values',
  'sweep.duration': 'Simulated time per trial',
  'sweep.run': 'Run the sweep',
  'sweep.cancel': 'Stop',
  'sweep.export': 'Export the sweep',
  'sweep.guided': 'Guided example',
  'sweep.progress': 'Trial {trial} of {total}, {percent}%',
  'sweep.done':
    '{ok} of {total} trials measured, {failed} failed, {cancelled} not run. {seconds}s.',
  'sweep.range': 'Allowed range {min} to {max}',
  'sweep.settings':
    'Every other initial condition is the scenario default at seed {seed}. {integrator}, {substeps} substeps per frame, step {step}.',

  'sweep.param.planetA': 'Planet\u2019s starting orbit',
  'sweep.param.impact': 'Impact parameter',
  'sweep.param.vInfinity': 'Approach speed far away',
  'sweep.unit.separations': 'binary separations',
  'sweep.unit.simUnits': 'simulation units',
  'sweep.unit.simVelocity': 'simulation velocity units',

  'sweep.status.ok': 'measured',
  'sweep.status.buildFailed': 'the world would not build at this value',
  'sweep.status.bodiesMissing':
    'the bodies this measurement needs were not there',
  'sweep.status.notFinite': 'the measurement did not come out as a number',
  'sweep.status.lostBody':
    'a body was destroyed during this trial, so the later samples are of a different system',
  'sweep.status.cancelled': 'not run',

  'sweep.reason.parameterNotSweepable':
    'That parameter cannot be swept in this scenario. Only a scenario\u2019s own laboratory variables survive the rebuild each trial needs.',
  'sweep.reason.valueCount':
    'A sweep needs between {min} and {max} values. Two values is the A/B comparison the bench already does.',
  'sweep.reason.rangeNotNumeric': 'The range must be two numbers.',
  'sweep.reason.rangeEmpty': 'The range starts and ends at the same value.',
  'sweep.reason.outOfRange':
    'Outside the range this parameter is defined over here, which is {min} to {max}.',
  'sweep.reason.crossesExcluded':
    'That range passes through {from} to {to}, where the scenario does not describe a flyby at all.',
  'sweep.reason.duration':
    'Simulated time per trial must be between {min} and {max}.',
  'sweep.reason.noMetrics': 'Choose at least one quantity to measure.',
  'sweep.reason.notReady': 'The bench is still loading.',
  'sweep.reason.alreadyRunning': 'A sweep is already running.',
  'sweep.reason.recording': 'A run is being recorded.',

  'sweep.summary.changed':
    '{metric} moved from {min} to {max} across the range.',
  'sweep.summary.monotonic': 'It changed in one direction throughout.',
  'sweep.summary.turned':
    'It turned over rather than moving in one direction, so the interesting value is somewhere inside the range rather than at an end.',
  'sweep.summary.flat':
    '{metric} did not move measurably across this range. That is a result about this range and this duration, not about the parameter.',
  'sweep.partial':
    'Some trials did not produce a measurement, so this describes the values that ran rather than the range that was asked for.',

  // The guided example. One question, one parameter, and a note about what the
  // answer does and does not establish.
  'sweep.guide.title': 'How far out can a planet orbit one star of a pair?',
  'sweep.guide.body':
    'This sweeps the planet\u2019s starting orbit from close in to well out, holding the stars, the seed and the timestep fixed, and measures how far the planet gets from its star. Close in, the orbit is the planet\u2019s own and the distance barely changes. Further out the second star starts to matter, and past a point the planet stops being in orbit at all.',
  'sweep.guide.after':
    'Read where the measurement stops behaving smoothly - that is the boundary this scenario has, at this duration. A longer run can only move it inwards: an orbit that survived 20 binary periods has not been shown to survive 200.',
  'sweep.guide.run': 'Run the guided sweep',

  // --- Classroom assignments --------------------------------------------------
  // Every one of these is shown from a lazy chunk - the builder, the link
  // bridge, or the lesson panel with an assignment open - so none of them has
  // any business in a first-time visitor's download. Registered by
  // ensureDeferredMessages() before any of those render.
  'assign.title': 'Build an assignment',
  'assign.hint':
    'Choose the steps to set. Steps that build the world another step is about are added for you, and shown below where they land.',
  'assign.close': 'Close',
  'assign.name': 'Assignment name',
  'assign.intro': 'Instructions for students (optional)',
  'assign.selectAll': 'Select all',
  'assign.selectNone': 'Clear',
  'assign.count':
    '{chosen} chosen, {included} included, of {total} in the lesson',
  'assign.build': 'Make the link',
  'assign.print': 'Printable instructions',
  'assign.download': 'Save as a file',
  'assign.link': 'Assignment link',
  'assign.link.ok': 'A comfortable {n} characters.',
  'assign.link.long':
    'This link is {n} characters, above the {limit} that mail clients and course systems reliably carry. Fewer steps would shorten it; a truncated link fails at the student\u2019s end, where nobody can fix it.',
  'assign.added.setup':
    'Added: this builds the {scenario} world that \u201c{step}\u201d is about.',
  'assign.added.summary':
    '{n} step(s) were added because the steps you chose are about the worlds they build.',
  'assign.subtitle': '{n} steps of {lesson} ({total} in the full lesson)',
  'assign.print.steps': '{n} steps',
  'assign.print.open': 'Open the assignment at this address:',
  'assign.print.id': 'Assignment {id}, issued {date}.',

  'assign.error.nothingSelected': 'Choose at least one step.',
  'assign.error.noLesson': 'That lesson could not be read.',
  'assign.error.unknownSteps':
    'This assignment names steps the lesson does not have.',
  'assign.error.tooManySteps': 'An assignment can hold at most {max} steps.',
  'assign.error.titleTooLong': 'That name is too long.',
  'assign.error.introTooLong': 'Those instructions are too long.',
  'assign.error.notAnObject': 'That link does not contain an assignment.',
  'assign.error.wrongKind': 'That link is not an assignment link.',
  'assign.error.badVersion': 'That assignment link is malformed.',
  'assign.error.newerVersion':
    'That assignment was made by a newer version of Gravitas. Reload the page and try again.',
  'assign.error.badLesson': 'That assignment does not name a lesson.',
  'assign.error.badId': 'That assignment has no usable identifier.',
  'assign.error.noSteps': 'That assignment contains no steps.',
  'assign.error.badStepId':
    'That assignment names a step in a form we cannot use.',
  'assign.error.duplicateSteps': 'That assignment lists the same step twice.',
  'assign.error.fingerprintMismatch': 'That assignment link is incomplete.',
  'assign.error.badText': 'That assignment link is malformed.',
  'assign.error.unexpectedField':
    'That file carries a \u201c{field}\u201d field, which an assignment never has. It was not made by this tool and has not been opened.',
  'assign.error.notJson': 'That file is not an assignment.',
  'assign.error.corrupt':
    'That link looks incomplete. Mail clients sometimes break long links across lines.',
  'assign.error.noStepsLeft':
    'None of this assignment\u2019s steps are in the lesson any more. It was probably set against an older version.',
  'assign.notice.changed':
    '{n} step(s) have been rewritten since this was set. Those start blank rather than showing an answer to a question that is no longer being asked.',
  'assign.notice.missing':
    '{n} step(s) are no longer in the lesson and have been left out.',

  // --- The manoeuvre planner ---------------------------------------------------
  'burn.title': 'Manoeuvre planner',
  'burn.close': 'Hide the manoeuvre planner',
  'burn.body': 'Body',
  'burn.about': 'In orbit about {name}. Delta-v is measured relative to it.',
  'burn.noPrimary':
    'This body is not clearly in orbit around anything, so there is no frame to plan a burn in.',
  'burn.radial': 'Radial \u0394v',
  'burn.transverse': 'Transverse \u0394v',
  'burn.frame':
    'Radial points away from the primary; transverse is perpendicular to it, the way the body is going. The two coincide with \u201calong the velocity\u201d only where the radial velocity is zero \u2013 everywhere on a circular orbit, and at periapsis and apoapsis of an ellipse.',
  'burn.quantity': 'Quantity',
  'burn.before': 'Now',
  'burn.after': 'After',
  'burn.periapsis': 'Periapsis',
  'burn.apoapsis': 'Apoapsis',
  'burn.energy': 'Specific energy',
  'burn.angularMomentum': 'Specific angular momentum',
  'burn.period': 'Period',
  'burn.none': '\u2014',
  'burn.magnitude': 'Total \u0394v {dv}.',
  'burn.becomesUnbound':
    'This burn puts the body on an escape trajectory. It has no apoapsis and no period: it leaves and does not come back.',
  'burn.staysUnbound':
    'The body is already on an escape trajectory and this burn does not capture it.',
  'burn.becomesBound':
    'This burn captures the body into a closed orbit from an escape trajectory.',
  'burn.twoBody':
    'The predicted orbit is the osculating two-body orbit about this primary: it is what would happen if these were the only two bodies in the universe. Every other body is ignored, so in a system where another mass matters the real trajectory will drift away from this prediction \u2013 quickly, if the other mass is close.',
  'burn.apply': 'Apply burn',
  'burn.undo': 'Undo last burn',
  'burn.export': 'Export burn log',
  'burn.logRow':
    'Burn {n}: {body} at t = {time}, radial {radial}, transverse {transverse}.',

  // --- The investigations panel ------------------------------------------------
  // js/investigations.js is the only module that reads these and it is loaded
  // on demand, so a visitor who never opens a lesson was downloading all of
  // them. Registered by ensureInvestigations() before initInvestigations()
  // runs. The dozen that stay in the base catalogue are on static buttons in
  // index.html, translated by the boot sweep, plus the two the loader itself
  // says when a lesson fails before its chunk arrives.
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

  'inv.step.counter': 'Step {n} of {total}',
  'inv.step.kind.read': 'read',
  'inv.step.kind.predict': 'predict',
  'inv.step.kind.explore': 'explore',
  'inv.step.kind.measure': 'measure',
  'inv.step.kind.question': 'question',
  'inv.step.kind.ellipse': 'explore',
  'inv.step.kind.wedges': 'explore',
  'inv.save.saved': 'Progress saved on this device',
  'inv.save.full':
    'Progress could not be saved: this browser\u2019s storage is full. Your answers are still here, but they will be lost when you close the tab. Download a progress backup to keep them.',
  'inv.save.unavailable':
    'Progress cannot be saved in this browser \u2014 private browsing usually blocks it. Your answers are still here, but they will be lost when you close the tab. Download a progress backup to keep them.',
  'inv.save.authoring':
    'Authoring preview \u2014 nothing is saved, and no student\u2019s progress is touched.',
  'inv.save.foreign':
    'Saved progress from a newer version of Gravitas was found and left untouched. Your answers work here but are not being saved.',
  'inv.progress.migrated':
    'Carried {n} saved answers over from an older format, matched by position. If this lesson has changed since you last opened it, check that each answer is on the question you meant.',
  'inv.progress.removedSteps':
    'Discarded {n} saved answers for steps this lesson no longer has.',
  'inv.progress.foreign':
    'Your saved progress for this lesson was written by a newer version of Gravitas and could not be read. It has been left where it is rather than overwritten.',
  'inv.backup.downloaded': 'Progress backup downloaded.',
  'inv.backup.restored': 'Progress restored.',
  'inv.backup.restoredMoved':
    'Progress restored. {moved} answers were matched to steps that have moved since the backup was made.',
  'inv.backup.restoredPartly':
    'Progress restored, but {dropped} steps in the backup are no longer in this lesson and their answers were left out.',
  'inv.backup.restoredUncertain':
    'Restored {applied} answers. {n} could not be placed because their steps have changed since the backup was made; they are still in the file you restored from.',
  'inv.backup.tooLarge': 'That file is too large to be a progress backup.',
  'inv.backup.notJson': 'That file is not readable as JSON.',
  'inv.backup.failed': 'That backup could not be read.',
  'inv.backup.invalid.notAnObject': 'That file is not a progress backup.',
  'inv.backup.invalid.notABackup':
    'That is a JSON file, but not a Gravitas progress backup.',
  'inv.backup.invalid.noVersion':
    'That backup has no version and cannot be read safely.',
  'inv.backup.invalid.tooNew':
    'That backup was made by a newer version of Gravitas than this one.',
  'inv.backup.invalid.noLesson':
    'That backup does not say which investigation it belongs to.',
  'inv.backup.invalid.noProgress': 'That backup contains no progress.',
  'inv.backup.invalid.badResponses':
    'That backup\u2019s answers are not in a readable form.',
  'inv.backup.invalid.badVisited':
    'That backup\u2019s step history is not in a readable form.',
  'inv.backup.invalid.badAttempts':
    'That backup\u2019s attempt counts are not readable, so it was not applied.',
  'inv.backup.invalid.badStartedAt':
    'That backup\u2019s start time is not a readable date, so it was not applied.',
  'inv.backup.invalid.badPosition':
    'That backup does not say readably which step it stopped on, so it was not applied.',
  'inv.backup.invalid.badSteps':
    'That backup\u2019s step list is damaged, so it was not applied.',
  'inv.backup.wrongLesson':
    'That backup is for \u201c{backup}\u201d, and \u201c{open}\u201d is open. Open that investigation first.',
  'inv.backup.confirmReplace':
    'Replace your current answers with the backup? You have {n} answers recorded, and this cannot be undone.',
  'inv.answer.matches': 'That matches.',
  'inv.answer.notYet': 'Not yet. Check your working and try again.',
  'inv.answer.oneGood': 'One good answer:',
  'inv.answer.placeholder': 'Your value',
  'inv.answer.placeholderUnit': 'Your value in {unit}',
  'inv.answer.converted': '(read as {value} {target})',
  'inv.answer.blank': 'There is nothing in the box yet — type a number.',
  'inv.answer.notANumber':
    'That is not a number I can read. Digits, a decimal point and an exponent like 3e5 or 3×10^5 all work.',
  'inv.answer.ambiguous':
    'I cannot tell which separator is the decimal point. Write it with one decimal separator, or use a space between thousands.',
  'inv.answer.unknownUnit': 'I do not recognise the unit “{unit}”.',
  'inv.answer.wrongDimension':
    '“{unit}” is a unit of {got}, and this answer should be a {want}.',
  'inv.answer.unitNotAllowed':
    'This step does not take “{unit}”. Answer in one of: {allowed}.',
  'inv.answer.unitExpected':
    'This step expects the number in {expected}, so I cannot use “{unit}”. Convert it yourself and give the number.',
  'inv.answer.trailingText':
    'I do not know what to do with “{text}” after the number.',
  'inv.dimension.time': 'time',
  'inv.dimension.length': 'length',
  'inv.dimension.speed': 'speed',
  'inv.dimension.mass': 'mass',
  'inv.dimension.angle': 'angle',
  'inv.hint.ask': 'I could use a hint',
  'inv.hint.reveal': 'Show me how it is done',
  'inv.hint.concept': 'Think about:',
  'inv.hint.method': 'How to get at it:',
  'inv.hint.worked': 'Worked through:',
  'inv.hint.given': 'Hint shown.',
  'inv.hint.revealed': 'Worked explanation shown.',
  'inv.hint.taken': '{n} hint(s) taken',
  'inv.hint.takenRevealed': '{n} hint(s) taken, worked answer shown',
  'inv.misconception.radiusForDiameter':
    'That is half the value asked for — check whether the question wants a radius or a diameter.',
  'inv.misconception.diameterForRadius':
    'That is twice the value asked for — check whether the question wants a radius or a diameter.',
  'inv.misconception.peakToPeakForSemiAmplitude':
    'That is the full peak-to-peak range. K is half of it: the distance from the middle of the curve to one extreme, not from one extreme to the other.',
  'inv.misconception.semiAmplitudeForPeakToPeak':
    'That is the semi-amplitude K. The peak-to-peak range is twice it.',
  'inv.misconception.daysForYears':
    'That looks like the value in days, and the question asks for years.',
  'inv.misconception.yearsForDays':
    'That looks like the value in years, and the question asks for days.',
  'inv.misconception.radiansForDegrees':
    'That looks like the angle in radians, and the question asks for degrees.',
  'inv.answer.check': 'Check',

  // --- The restricted three-body teaching mode ---------------------------------
  'cr3bp.title': 'Restricted three-body mode',
  'cr3bp.close': 'Hide the three-body overlay',
  'cr3bp.convention':
    'Units: the two bodies are one apart, their total mass is one, and the frame turns with them about their barycentre. The heavier sits at \u2212\u03bc, the lighter at 1\u2212\u03bc. C = 2\u03a9 \u2212 v\u00b2 with v measured in the rotating frame, so a LARGER C means a SLOWER tracer and a SMALLER accessible region \u2014 the opposite direction to every other energy here. (This convention omits the \u03bc(1\u2212\u03bc)/2 term some texts add, which puts C\u2084 at 3\u2212\u03bc+\u03bc\u00b2 rather than 3.)',
  'cr3bp.valid':
    'Circular restricted three-body problem, \u03bc = {mu}. The shaded region is where this tracer\u2019s energy forbids it to be.',
  'cr3bp.invalid.title': 'The overlay is off:',
  'cr3bp.invalid.bodyCount':
    'this needs exactly two massive bodies, and the system does not have two.',
  'cr3bp.invalid.eccentric':
    'the two bodies are not on a circular orbit, so the Lagrange points and the forbidden region would be moving and the diagram would be of no particular instant.',
  'cr3bp.invalid.tracerTooHeavy':
    'the third body is heavy enough to move the other two, so it is not a test particle and the restricted problem does not describe it.',
  'cr3bp.invalid.noTracer': 'there is no light third body to describe.',
  'cr3bp.invalid.thirdMass': 'a third massive body is present.',
  'cr3bp.noTracer': 'No tracer, so no Jacobi constant.',
  'cr3bp.jacobi': 'Jacobi constant C = {C}',
  'cr3bp.point': 'Point',
  'cr3bp.reachableHere': 'Energy permits',
  'cr3bp.yes': 'yes',
  'cr3bp.no': 'no',
  'cr3bp.stableMark': '(stable)',
  'cr3bp.toGate': 'C would have to fall by {d} for the {gate} neck to open.',
  'cr3bp.regime.separated':
    'Every route between the two bodies is closed. The tracer is confined to the region it started in.',
  'cr3bp.regime.l1Open':
    'The neck at L1 is open: the energy no longer separates the two bodies. Whether the tracer goes through is a different question.',
  'cr3bp.regime.l2Open':
    'L1 and L2 are both open, so the exterior is energetically reachable as well as the other body\u2019s region.',
  'cr3bp.regime.l3Open':
    'Only two small forbidden islands remain, around L4 and L5.',
  'cr3bp.regime.unrestricted':
    'Nothing anywhere is energetically forbidden to this tracer.',
  'cr3bp.routh.below':
    '\u03bc is below Routh\u2019s value of {mu}, so L4 and L5 are linearly stable. The three collinear points never are, at any mass ratio.',
  'cr3bp.routh.above':
    '\u03bc is above Routh\u2019s value of {mu}, so none of the five is stable \u2014 not even L4 and L5.',
  'cr3bp.claims.title': 'Three claims that are not the same claim',
  'cr3bp.claims.accessible':
    'Energetically accessible: the Jacobi constant does not forbid the tracer from being at that point. That is all the shading says.',
  'cr3bp.claims.reachable':
    'Will actually travel there: a separate question, and this overlay cannot answer it. An open neck is a gap in a wall, not a route through it; the tracer may orbit for ever on one side of an opening it never uses. Only integrating the trajectory settles it.',
  'cr3bp.claims.stable':
    'Stable: a third question again. It means a tracer displaced slightly from an equilibrium returns rather than leaves, and it is true here only of L4 and L5, and only below Routh\u2019s mass ratio. Nothing in a zero-velocity curve implies it.',

  // --- The exoplanet lesson widgets ---------------------------------------------
  // js/exoplanetWidgets.js is reached only through js/widgets.js, which is
  // reached only from js/investigations.js - all of it lazy. These were in the
  // start-up catalogue for a widget nobody sees until they open a lesson.
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
  'exoW.whatYourScheduleSees': 'What your schedule sees',
  'exoW.theDashedCurveIsTheTruth':
    'The dashed curve is the planet as the simulation knows it, drawn here to teach. A real survey has only the points.',
  'exoW.daysBetweenMeasurements': 'Days between measurements',
  'exoW.numberOfMeasurements': 'Number of measurements',
  'exoW.measurementUncertainty': 'Measurement uncertainty',
  'exoW.noiseSeed': 'Noise seed',
  'exoW.scheduleAIntensive': 'Schedule A: one cycle',
  'exoW.scheduleAIntensive.note':
    'Twelve measurements spread across a single orbit. Every part of the cycle is looked at once.',
  'exoW.scheduleBPatient': 'Schedule B: one cycle apart',
  'exoW.scheduleBPatient.note':
    'The same twelve measurements over eleven times the baseline, one taken every 3.52 days. The planet completes almost exactly one orbit between them.',
  'exoW.aSmallerPlanet': 'A smaller planet',
  'exoW.aBetterSpectrograph': 'A better spectrograph',
  'exoW.aSmallerPlanet.note':
    'A Neptune instead of a Jupiter, on the good schedule. The signal is now comparable to the error bars.',
  'exoW.aBetterSpectrograph.note':
    'The same Neptune, measured eight times more precisely. Nothing about the planet or the schedule changed.',
  'exoW.daysAxis': 'Days',
  'exoW.phaseAxis': 'Phase',
  'exoW.idealSignalOverlay': 'dashed: ideal signal (teaching overlay)',
  'exoW.foldedOnTheTruePeriod': 'folded on the true period',
  'exoW.measurementsTaken': 'Measurements',
  'exoW.phaseCoverage': 'Phase coverage',
  'exoW.binsOfTheCycle': 'bins of the cycle',
  'exoW.scatterOfTheMeasurements': 'Scatter of the measurements',
  'exoW.scatterExpectedFromNoise': 'Scatter expected from noise alone',
  'exoW.scatterVsConstantVelocity': 'Against a constant velocity',
  'exoW.needsAnErrorBar': 'needs an uncertainty to compare against',
  'exoW.whatThatDoesNotSay': 'What that does not say',
  'exoW.excessScatterIsNotAPlanet':
    'Extra scatter means the velocity is not constant. It does not identify a planet, a period or a mass.',
};
