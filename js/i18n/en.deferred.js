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
};
