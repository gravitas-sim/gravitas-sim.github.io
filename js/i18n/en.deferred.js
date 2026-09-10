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
  // --- The retained comparison, and the optional sweep ---------------------
  'assist.exp.cancel': 'Stop',
  'assist.exp.keep': 'Keep in the notebook',
  'assist.exp.running': 'Pass {done} of {total}\u2026',
  'assist.exp.refused': 'It did not start ({reason}).',
  'assist.ab.title': 'Both sides, kept side by side',
  'assist.ab.hint':
    'The same encounter twice, at +40 and \u221240, rebuilt from the same baseline each time so that the sign of the impact parameter is the only difference between them.',
  'assist.ab.run': 'Run both passes',
  'assist.ab.done': '{done} of 2 passes measured, {seconds}s.',
  'assist.ab.col.gaining': 'Behind ({b})',
  'assist.ab.col.losing': 'In front ({b})',
  'assist.ab.row.side': 'Passed',
  'assist.ab.row.closest': 'Closest approach',
  'assist.ab.row.deflection': 'Turned by',
  'assist.ab.row.relBefore': 'Planet frame, before',
  'assist.ab.row.relAfter': 'Planet frame, after',
  'assist.ab.row.inertBefore': 'Inertial frame, before',
  'assist.ab.row.inertAfter': 'Inertial frame, after',
  'assist.ab.row.speedChange': 'Change in speed',
  'assist.ab.row.deltaV': 'Change in velocity',
  'assist.ab.row.encounter': 'Encounter',
  'assist.encounter.complete': 'read in and out',
  'assist.encounter.incomplete': 'never came back out \u2014 not measured',
  'assist.encounter.noBefore': 'began inside the gate \u2014 no before',
  'assist.encounter.lost': 'the spacecraft was lost',
  'assist.encounter.notRun': 'did not run',
  'assist.ab.caveat.incomplete':
    '{n} of the two passes did not produce a complete encounter ({which}), so nothing in its column is a before-and-after.',
  'assist.ab.caveat.cancelled':
    'This was stopped before it finished, so the passes that never ran are marked as such rather than left out.',
  'assist.ab.caveat.deltaV':
    'The two passes changed the velocity by the same amount to {percent}%, turned by the same angle to {deflection}%, and came equally close to {closest}%. That is the mirror image doing what a mirror image should.',
  'assist.ab.caveat.notMirrored':
    'The SPEED changes are not mirrored and were never going to be: {gain} km/s gained against {loss} km/s lost, a ratio of {ratio}. Speed is the length of a vector sum, and adding a fixed-length vector at two different angles does not lengthen and shorten that sum by the same amount.',
  'assist.ab.caveat.recoil':
    'The spacecraft has mass, so the planet recoiled by {recoil} mm/s. That recoil is {ratio} of the spacecraft\u2019s own velocity change, against a mass ratio of {mass}: the two {agree}, which is momentum conservation written as a division.',
  'assist.ab.caveat.agree': 'agree to better than a per cent',
  'assist.ab.caveat.disagree': 'do not agree, which is worth investigating',
  'assist.ab.caveat.conserved':
    'So \u201cthe planet\u2019s frame\u201d names two frames, not one: one before the encounter and one after, differing by that recoil. What survives the change is not the spacecraft\u2019s speed, which is frame-dependent, but the system\u2019s momentum (balanced to {ledger}%) and the speed relative to the planet (changed by {residual}%).',
  'assist.ab.caveat.held':
    'Held for both passes: approach speed {vinf} km/s, readings taken {gate} AU out on both legs, integration step {step}, seed {seed}.',
  'assist.sweep.title': 'Optional: sweep how close it passes',
  'assist.sweep.hint':
    'Five passes on the gaining side, from 20 to 90, with the approach speed and everything else held. All five clear the planet by at least three of its radii.',
  'assist.sweep.run': 'Run the sweep',
  'assist.sweep.done': '{n} passes, {seconds}s.',
  'assist.sweep.col.b': 'Impact parameter',
  'assist.sweep.col.deflection': 'Turned by',
  'assist.sweep.col.speedChange': 'Change in speed',
  'assist.sweep.col.closest': 'Closest approach',
  'assist.sweep.col.encounter': 'Encounter',
  'assist.sweep.plot.turn': 'turn (\u00b0)',
  'assist.sweep.plot.gain': 'speed change (km/s)',
  'assist.sweep.plot.axis': 'Impact parameter',
  'assist.sweep.caveat.incomplete':
    '{n} of the passes did not produce a complete encounter ({which}) and are left off the plot rather than drawn at a value they never measured.',
  'assist.sweep.caveat.sameTrial':
    'Across these {n} passes the largest turn and the largest speed gain are the same pass, at {b}.',
  'assist.sweep.caveat.differentTrials':
    'The largest turn was at {turned} and the largest speed gain at {gained}. They are not the same pass.',
  'assist.sweep.caveat.notALaw':
    'Neither answer is a rule. Turning the relative velocity helps only while it is being brought round towards the planet\u2019s own direction of travel; turn it past that and the gain falls again. In this laboratory that best turn is about 131\u00b0 and the closest pass the planet survives manages about 97\u00b0, so the sweep never reaches the far side of the hill.',
  'assist.sweep.caveat.held':
    'Held for every pass: approach speed {vinf} km/s, integration step {step}, seed {seed}. Only the impact parameter changed.',
  // --- The chaos lesson's controlled pair ----------------------------------
  'bench.chaos.title': 'The lesson\u2019s controlled pair',
  'bench.chaos.hint':
    'Sets the comparison up and runs both arms over the same stretch of simulated time: capture, Run A, back to the start, the nudge, Run B. Everything it does is what you would have done by hand, in the order you would have done it.',
  'bench.chaos.run': 'Set up and run both',
  'bench.chaos.runSame': 'Run it twice, unchanged',
  'bench.chaos.changedNothing':
    'Nothing was changed between the runs: this is the reproducibility control, and the separation it reports is what the engine does with identical input.',
  'bench.chaos.cancel': 'Stop',
  'bench.chaos.control': 'Numerical control',
  'bench.chaos.control.finerStep': 'half the largest step',
  'bench.chaos.control.altIntegrator': 'a different integrator',
  'bench.chaos.runControl': 'Repeat as a control',
  'bench.chaos.name.binary': 'Binary control pair',
  'bench.chaos.name.triple': 'Three-body pair',
  'bench.chaos.wrongScenario':
    'This is for the chaos lesson\u2019s two scenarios. Load the Binary Pair or the Three-Body Sensitivity Lab.',
  'bench.chaos.benchBusy':
    'The bench is holding \u201c{name}\u201d with runs recorded in it. Save it or capture a new start before running this, so nothing of yours is lost.',
  'bench.chaos.running': 'Recording run {arm}\u2026',
  'bench.chaos.changed':
    'What changed between the runs: {body} moved {km} km along {axis}, and nothing else.',
  'bench.chaos.settingsChanged':
    'Settings that also differ between the runs: {keys}. That is more than one variable, and the comparison cannot separate them.',
  'bench.chaos.settingsSame':
    'No setting differs between the two runs, so the nudge is the only difference.',
  'bench.chaos.intervals':
    'Run A covered {a} simulated seconds and Run B {b}, against {asked} asked for. The fit uses their overlap.',
  'bench.chaos.steps':
    'Measured step: {mean} on average, {min} to {max}, over {n} steps, with {integrator}. Measured rather than taken from the settings, because the engine splits a frame into at most a fixed number of substeps and which limit binds depends on the scenario.',
  'bench.chaos.exponential':
    'Exponential: e-folding time {tau} simulated seconds, r\u00b2 {r2}, fitted between {from} and {to}.',
  'bench.chaos.resolved':
    'Resolved: {n} controls that really did compute it differently agree to {spread}%.',
  'bench.chaos.unresolved.need-two-estimates':
    'Not resolved yet: this needs two repeats that computed the answer differently, and there {n} so far. Until then the divergence is a number this integrator produced.',
  'bench.chaos.unresolved.controlsIneffective':
    'Not resolved: the repeats did not actually change the arithmetic - the measured step and the integrator came out the same - so they agree with the original for no reason worth having.',
  'bench.chaos.unresolved.behaviour-changed':
    'UNRESOLVED: the repeats did not even agree about what kind of growth this is. The honest report is that this measurement is numerically unresolved, not a smaller number.',
  'bench.chaos.unresolved.timescale-moved':
    'UNRESOLVED: the e-folding times span {spread}%, which is more than refinement should move a physical answer. The honest report is that this measurement is numerically unresolved.',
  'bench.chaos.cancelled':
    'This was stopped before it finished, so at least one arm is shorter than it was asked to be.',

  // --- The Lagrange lesson's controlled pair -------------------------------
  'cr3bp.pair.title': 'Two directions, one accessible region',
  'cr3bp.pair.hint':
    'The same tracer, in the same place, at the same speed in the rotating frame, sent two different ways. Same Jacobi constant, same open neck, everything else held. Two binary periods each.',
  'cr3bp.pair.run': 'Run both directions',
  'cr3bp.pair.cancel': 'Stop',
  'cr3bp.pair.keep': 'Keep in the notebook',
  'cr3bp.pair.invalid':
    'This needs a valid restricted three-body system with a tracer in it.',
  'cr3bp.pair.benchBusy':
    'The bench is holding \u201c{name}\u201d with runs recorded in it. Save it or capture a new start first, so nothing of yours is lost.',
  'cr3bp.pair.reset':
    'Put the tracer back to ({x}, {y}) at rest in the rotating frame, so both directions start from the same stated place.',
  'cr3bp.pair.running': 'Running direction {done} of 2\u2026',
  'cr3bp.pair.done': 'Both directions, {periods} binary periods each.',
  'cr3bp.pair.col.a': 'A ({deg}\u00b0)',
  'cr3bp.pair.col.b': 'B ({deg}\u00b0)',
  'cr3bp.pair.row.start': 'Started at',
  'cr3bp.pair.row.speed': 'Rotating-frame speed',
  'cr3bp.pair.row.direction': 'Direction',
  'cr3bp.pair.row.jacobi': 'Jacobi constant',
  'cr3bp.pair.row.neck': 'L1 neck',
  'cr3bp.pair.row.crossed': 'Crossed it?',
  'cr3bp.pair.row.closest': 'Closest it came to L1',
  'cr3bp.pair.row.reach': 'x reached',
  'cr3bp.pair.row.watched': 'Watched',
  'cr3bp.pair.row.step': 'Measured step',
  'cr3bp.pair.open': 'open',
  'cr3bp.pair.closed': 'closed',
  'cr3bp.pair.crossedAt': 'yes, after {t} periods',
  'cr3bp.pair.notCrossed': 'not during this run',
  'cr3bp.pair.whole': 'the whole window',
  'cr3bp.pair.short': 'cut short',
  'cr3bp.pair.caveat.controlled':
    'The two arms had the same Jacobi constant to {d} and the same open neck, so they were allowed in exactly the same places.',
  'cr3bp.pair.caveat.missingArm':
    'One of the two arms did not run, so there is nothing to compare.',
  'cr3bp.pair.caveat.constantsDiffer':
    'The two arms did not come out with the same Jacobi constant, so they were not allowed in the same places and nothing below is evidence about trajectories.',
  'cr3bp.pair.caveat.neckClosed':
    'The L1 neck was not open for both arms, so \u201cit did not go through\u201d is a statement about a wall rather than about a path.',
  'cr3bp.pair.caveat.exteriorOpen':
    'The L2 neck was open too, so the tracer was not confined to the two stars\u2019 regions and \u201cit did not use the L1 neck\u201d is about one gap of several.',
  'cr3bp.pair.caveat.cancelled':
    'This was stopped before it finished, so at least one arm was watched for less than the window.',
  'cr3bp.pair.caveat.window':
    'Everything here is about {periods} binary periods. A path that did not use the neck in that time may use it in the next.',
  'cr3bp.pair.conclusion.notControlled':
    'The control failed, so no conclusion about paths follows from these two runs.',
  'cr3bp.pair.conclusion.windowIncomplete':
    'At least one arm was cut short, so it did not fail to cross \u2014 it was not watched long enough to say.',
  'cr3bp.pair.conclusion.sameRegionDifferentPaths':
    'Same accessible region, different paths: which is the whole point. Where the tracer is ALLOWED to go was identical between the two arms by construction, and where it WENT was not.',
  'cr3bp.pair.conclusion.sameRegionSimilarPaths':
    'These two came out similar, which is allowed: the diagram does not forbid two directions from behaving alike any more than it requires it. Nothing here says the paths had to match.',
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
  'exoW.readout.correlatedAfterTransits':
    'Within-transit term, after {n} transits',
  'exoW.readout.persistentFloor': 'Persistent floor (never averages down)',
  'exoW.readout.inTransitHours': 'Hours spent in transit',
  'exoW.readout.ceiling': 'Best possible, with infinite observing',
  'exoW.whatSwampsATransit': 'What a transit is competing with',
  'exoW.whatSwampsATransit.note':
    'Photon noise is quoted per hour and averages down over the whole in-transit time. The other two are correlated on the timescale of a transit and do not average down at all.',
  'exoW.transitDepth': 'Transit depth',
  'exoW.whitePerHour': 'White noise, \u03c3 of a 1-hour bin',
  'exoW.correlatedWithinTransit':
    'Correlated within one transit, independent between them',
  'exoW.persistentFloor': 'Coherent across the whole campaign',
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
  'reliability.reason.phaseIncomplete':
    'One of the two runs stopped before it covered the duration it was asked for, so the two are not runs of the same experiment. Repeat the check without changing the speed or leaving the tab.',
  'reliability.reason.phaseCapped':
    'One of the two runs hit the sample ceiling before it finished, so it covers less than the check claims. Shorten the duration, or slow the simulation so fewer samples cover it.',
  'reliability.reason.noStep': 'The integration step could not be read.',
  'reliability.reason.stepNotHalved':
    'The second run was not more finely integrated than the first.',
  'reliability.reason.noMeasurement':
    'Nothing was measured that could be compared.',
  'reliability.reason.trajectoryDiverged':
    'The paths agreed at the start and parted later. That rules out a scheme that was wrong from the first close approach; it does not say why they parted.',
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
  'reliability.reason.sweeping':
    'A parameter sweep is using the simulation. Wait for it to finish, or cancel it.',
  'reliability.reason.checking':
    'A reliability check is using the simulation. Wait for it to finish, or cancel it.',
  'reliability.reason.alreadyRunning': 'A check is already running.',
  'reliability.reason.noMetrics': 'Choose at least one quantity to measure.',
  'reliability.reason.cancelled': 'Stopped. The world is back where it was.',

  'reliability.conservationIsNotAccuracy':
    'Energy and angular momentum are shown as separate evidence, not as the verdict. A well-conserved run can still be wrong: energy is one number, and a close approach can be resolved far too coarsely without disturbing it.',
  'reliability.conservationNotExpected':
    'This model is not a closed system, so a drifting energy is it working as designed rather than a fault. The drift figures are reported but decide nothing.',
  'reliability.driftDidNotFall':
    'The energy drift did not fall when the step was halved. That is a reason to look harder, not a verdict - the verdict above was computed without it.',
  'reliability.divergenceObserved':
    'What this comparison shows: at these two step sizes the aggregate measurements agree, and the trajectories do not, from some point onwards.',
  'reliability.divergenceIsNotChaos':
    'That pattern does not establish chaos. A small systematic difference produces it too: a step size that shifts an orbital period by a fraction of a percent makes two runs drift apart in phase, and two sinusoids of slightly different frequency agree early and separate late for the same reason. Sensitive dependence is one explanation among several.',
  'reliability.divergenceNextStep':
    'Telling them apart needs evidence this run does not collect - how the separation grows with time, and whether it grows the same way from many nearby starts. Convergence of the aggregates, divergence of the trajectory, and evidence of chaos are three different findings.',
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
  'sweep.status.stalled': 'stopped early',
  'sweep.status.capped': 'hit the sample limit',

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
  'sweep.reason.valueExcluded':
    'These values fall between {from} and {to}, where the scenario does not describe a flyby at all: {inside}.',
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
  'sweep.incomplete':
    '{count} trials ran but did not cover the duration asked for. Their numbers are in the table and are not in the summary above: a curve drawn through them would describe a shorter experiment than the one this sweep says it ran.',
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
  'assign.added.requires':
    'Added: \u201c{step}\u201d uses what this step produces.',
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
  'inv.tool.pickable':
    'Diagram you can point at. Click or drag to move the cursor; the arrow keys move it too, and the sliders below do the same thing with numbers.',
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
  // Habitability, binary and tidal widget prose. Same boundary and same
  // reasoning as the resW/chaosW/energyW families above: js/widgets.js is
  // reached only from the lazy js/investigations.js, and each of these three
  // modules registers this catalogue itself so a direct import cannot render
  // raw ids.
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
  // --- The uncertainty analysis -------------------------------------------------
  // A parametric Monte Carlo over the recorded epochs. The strings that matter
  // most here are the assumption list and the guidance: an interval is a
  // statement about precision, and a student who reads it as a statement about
  // correctness has learned the opposite of the lesson.
  'rvfit.mc.title': 'Uncertainty analysis (optional)',
  'rvfit.mc.hint':
    'Simulates this observing run again and again — the same epochs, the same stated uncertainties, a fresh noise draw each time — and refits every one with the search you just ran. Where the refits land is how well your data pins the period down.',
  'rvfit.mc.trials': 'Trials',
  'rvfit.mc.seed': 'Noise seed',
  'rvfit.mc.seedHint':
    'The same seed reproduces the same intervals exactly, and the export carries it.',
  'rvfit.mc.run': 'Run analysis',
  'rvfit.mc.cancel': 'Cancel',
  'rvfit.mc.running': 'Trial {done} of {total}…',
  'rvfit.mc.idle': 'Not run yet.',
  'rvfit.mc.stale':
    'The recording, the fit or the search range has changed since this analysis ran, so its intervals no longer describe what is on screen. Run it again.',
  'rvfit.mc.outcome.complete': 'Every trial ran and produced a fit.',
  'rvfit.mc.outcome.cancelled':
    'Stopped by you after {done} of {total} trials.',
  'rvfit.mc.outcome.partial': '{done} of {total} trials produced a fit.',

  'rvfit.mc.refused.noFit':
    'There is no fit on screen to resample around. Set a period first.',
  'rvfit.mc.refused.tooFewPoints':
    'Only {n} usable measurements; this needs at least {need}.',
  'rvfit.mc.refused.noUncertainties':
    'This run states no uncertainties, so there is nothing to propagate. Every simulated run would be identical to your fit and the interval would come out as zero — which would read as a perfectly determined period rather than as an absence of error bars. Set a non-zero uncertainty in the observing panel and record again.',
  'rvfit.mc.refused.badBounds':
    'The period range is not a range. Check the search bounds above.',
  'rvfit.mc.refused.badTrials': 'Choose between {min} and {max} trials.',

  'rvfit.mc.failed.noSearch': 'the period search found nothing to fit',
  'rvfit.mc.failed.notFinite':
    'the solve returned a value that was not a number',

  'rvfit.mc.assume.model':
    'A circular orbit with one companion. Every interval below is conditional on that model being the right one.',
  'rvfit.mc.assume.gaussian':
    'Errors are Gaussian, with the standard deviation each epoch states.',
  'rvfit.mc.assume.independent':
    'Errors are independent between epochs: no night-to-night systematic, no drift in the instrument.',
  'rvfit.mc.assume.sigmas':
    'The stated uncertainties are correct. If they are optimistic, so is every interval here.',
  'rvfit.mc.assume.precision':
    'This measures precision, not correctness. A wrong model can produce a very tight interval.',
  'rvfit.mc.assumptions': 'These intervals are conditional on:',

  'rvfit.mc.result.single':
    'Period {median} d, from {p16} to {p84} ({pct}% of trials). Amplitude {kMedian} m/s, from {kP16} to {kP84}.',
  'rvfit.mc.result.multimodal': {
    one: 'The refits landed in {n} separate family — see below.',
    other:
      'The refits landed in {n} separate families. There is no single period with an error bar here: quoting one would average solutions that fit the data about equally well and describe nothing.',
  },
  'rvfit.mc.result.gridLimited':
    'Every trial returned the same period, which means the search grid is coarser than the uncertainty being measured. No interval is reported, because it would be a picture of the grid rather than of the data.',
  'rvfit.mc.result.incomplete':
    '{done} of {total} trials ran. The intervals below are from those {done}.',
  'rvfit.mc.result.cancelled': 'Cancelled after {done} of {total} trials.',
  'rvfit.mc.result.failures': '{n} trials produced no fit: {why}.',
  'rvfit.mc.result.epochs':
    '{n} epochs, {baseline} d baseline, {samples} grid points per trial, seed {seed}.',

  'rvfit.mc.families': 'Alias families',
  'rvfit.mc.col.share': 'Share',
  'rvfit.mc.col.period': 'Period (d)',
  'rvfit.mc.col.amplitude': 'K (m/s)',
  'rvfit.mc.col.trials': 'Trials',
  'rvfit.mc.familyRow': '{median} ({p16}–{p84})',
  'rvfit.mc.otherFamilies': {
    one: 'and {n} more family with under 1% of trials',
    other: 'and {n} more families with under 1% of trials each',
  },

  'rvfit.mc.plot.period': 'Recovered periods',
  'rvfit.mc.plot.amplitude': 'Recovered amplitudes',
  'rvfit.mc.plot.periodAxis': 'Period (days)',
  'rvfit.mc.plot.amplitudeAxis': 'K (m/s)',
  'rvfit.mc.plot.count': 'Trials per bin',
  'rvfit.mc.plot.none': 'Nothing to plot yet.',

  // The guidance the whole feature exists for. Printed under the results, not
  // in a help page: the moment a student has a tight interval on screen is the
  // moment the distinction matters.
  'rvfit.mc.guidance.heading': 'Precision is not correctness',
  'rvfit.mc.guidance.a':
    'A narrow interval says the noise in your data would not have moved the answer much. It does not say the answer is right. Fit a circular model to an eccentric orbit and you can get a period pinned to four decimal places that is wrong in the first — the interval is measuring the noise, and the model error is not noise.',
  'rvfit.mc.guidance.b':
    'So read the interval and the residuals together. A tight interval with structured residuals means a precisely determined parameter of a model that does not fit. The residual structure is the thing to believe.',
  'rvfit.mc.guidance.c':
    'And when the refits split into families, that is the honest answer: the data support several periods. More observations, or observations spaced differently, are what removes families — not more trials here. Running ten thousand trials makes each interval smoother and the families no less real.',

  // --- Widget prose, moved off the start-up path ---------------------------
  // Resonance, chaos and energy widget strings. Nothing outside a lesson can
  // render these: js/widgets.js is reached only from js/investigations.js,
  // which is lazy and whose loader registers this catalogue before any step
  // draws. Same boundary and same reasoning as the exoW.* family above it.
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
  // --- The evidence notebook ---------------------------------------------------
  // Every string a saved reading can print. The three `nb.kind.*` words are the
  // load-bearing ones: they are what separates a number the student obtained
  // from data, one a closed-form model predicts, and one read out of the
  // simulation's own state - and the last is not a measurement at all.
  'nb.title': 'Evidence notebook',
  'nb.intro':
    'Readings you have kept. Each one is frozen as it was taken, with the conditions it was taken under; the words are yours to revise, the numbers are not. Order them the way your argument runs.',
  'nb.empty':
    'Nothing kept yet. Save a fit from the radial-velocity workspace, or a result from the A/B bench, and it will appear here.',
  'nb.untitled': 'Untitled reading',
  'nb.unknownTarget': 'an unnamed target',
  'nb.unknownScenario': 'an unnamed scenario',
  'nb.nothingToSave': 'There is no completed result to keep yet.',

  'nb.kind.measured': 'measured',
  'nb.kind.analytic': 'predicted',
  'nb.kind.truth': 'revealed',

  'nb.field.title': 'Heading',
  'nb.field.claim': 'Claim',
  'nb.field.evidence': 'Supporting evidence',
  'nb.field.limitations': 'Limitations',
  'nb.placeholder.claim': 'What do you think this reading shows? One sentence.',
  'nb.placeholder.evidence':
    'Which numbers above support that, and how closely?',
  'nb.placeholder.limitations':
    'What would this reading not settle, however good it looks? One per line.',

  'nb.action.save': 'Save to notebook',
  'nb.action.report': 'Report',
  'nb.action.report.hint':
    'Download a PDF of the notebook: every entry with its numbers, its figure, your words and the conditions it was taken under.',
  'nb.action.download': 'Download',
  'nb.action.download.hint':
    'Download the notebook as a file you can keep or move to another machine. This is also the answer when the browser refuses to store it.',
  'nb.action.restore': 'Restore',
  'nb.action.restore.hint':
    'Load a notebook file. Entries you already have are replaced by their saved copies rather than duplicated.',
  'nb.action.close': 'Close the notebook',
  'nb.action.up': 'Move “{title}” earlier',
  'nb.action.down': 'Move “{title}” later',
  'nb.action.delete': 'Delete “{title}”',
  'nb.confirm.delete':
    'Delete “{title}”? The reading cannot be taken again from a world that has moved on, and this cannot be undone.',

  'nb.draft.heading': 'Keep this reading',
  'nb.draft.hint':
    'The numbers are already frozen, so you can take your time over the words — changing the simulation now will not alter what was captured.',
  'nb.draft.save': 'Keep it',
  'nb.draft.discard': 'Discard',

  'nb.entry.results': 'What was recorded',
  'nb.entry.conditions': 'Conditions it was taken under',
  'nb.entry.checksum': 'checksum {code}',
  'nb.entry.figure': {
    one: 'Figure: {title} ({n} series, drawn in the report)',
    other: 'Figure: {title} ({n} series, drawn in the report)',
  },
  'nb.entry.tampered':
    'This entry no longer matches its own checksum, so its numbers were changed outside Gravitas. It is kept as it arrived and the report says so.',

  'nb.save.ok': '{n} of {max} entries · {pct}% of the space used',
  'nb.save.unavailable':
    'This browser will not store anything, so the notebook is only in this tab. Download it before you close the page.',
  'nb.save.quota':
    'Your browser refused to store the notebook — it is probably full. The notebook is still on screen; download it now.',
  'nb.save.too-large':
    'One entry is {bytes} KB, over the {limit} KB limit for a single entry. It is still on screen; download the notebook.',
  'nb.save.total-exceeded':
    'The notebook is {bytes} KB, over the {limit} KB limit. Delete an entry or download the notebook and start a fresh one.',
  'nb.save.too-many':
    'The notebook holds the most entries it can ({limit}). Delete one, or download this notebook and start another.',
  'nb.save.from-a-newer-version':
    'The stored notebook was written by a newer Gravitas and has not been opened, so nothing has been overwritten.',
  'nb.save.unreadable':
    'The stored notebook could not be read. Nothing has been overwritten; restore from a file if you have one.',
  'nb.save.tooLarge': 'That file is too large to be a notebook.',
  'nb.save.notJson': 'That file is not readable as a notebook.',
  'nb.save.notAnObject': 'That file is not a notebook.',
  'nb.save.notANotebook': 'That file is not a Gravitas notebook.',
  'nb.save.noVersion': 'That notebook file does not say which version it is.',
  'nb.save.tooNew': 'That notebook was written by a newer Gravitas.',
  'nb.save.noEntries': 'That notebook file has no entries in it.',
  'nb.save.tooManyEntries':
    'That notebook file holds more entries than one notebook may.',
  'nb.save.not-an-entry':
    'That notebook file contains something that is not an entry.',
  'nb.save.no-id': 'An entry in that file has no identity.',
  'nb.save.no-snapshot': 'An entry in that file has no recorded reading in it.',
  'nb.save.no-quantities': 'An entry in that file records no numbers.',
  'nb.save.bad-quantity':
    'An entry in that file has an unreadable number in it.',
  'nb.save.unknown-kind':
    'An entry in that file labels a number in a way this version does not know.',
  'nb.save.bad-figure': 'An entry in that file has an unreadable figure in it.',

  'nb.source.rv-fit': 'Radial-velocity fit',
  'nb.source.bench-comparison': 'A/B comparison',
  'nb.source.bench-reliability': 'Reliability check',
  'nb.source.bench-sweep': 'Parameter sweep',

  'nb.prov.scenario': 'Scenario',
  'nb.prov.target': 'Target',
  'nb.prov.simTime': 'Simulation time',
  'nb.prov.days': '{d} days',
  'nb.prov.seed': 'Seed',
  'nb.prov.world': 'World generation',
  'nb.prov.interventions': 'Manual changes before this reading',
  'nb.prov.revision': 'Build',
  'nb.prov.numerical': 'Numerical settings',
  'nb.prov.step': 'max step {v}',
  'nb.prov.speed': 'speed {v}',
  'nb.prov.geometry': 'Observing geometry',
  'nb.prov.geometryValue': 'position angle {pa}°, inclination {inc}°',
  'nb.prov.frame': 'Reference frame',
  'nb.prov.quality': 'Rendering while measured',
  'nb.prov.qualityValue': '{tier} tier, {fps} fps',
  'nb.prov.units': 'Units',
  'nb.prov.flags': 'Noted',
  'nb.prov.stateHash': 'Initial state',

  'nb.flag.truth-revealed':
    'the simulation truth had been revealed before this was kept',
  'nb.flag.degraded-epochs': 'some epochs were degraded and were dropped',
  'nb.flag.unverified-epochs': 'some epochs were unverified',
  'nb.flag.weights-assumed':
    'the uncertainties were assumed, so there is no reduced chi-square',
  'nb.flag.structured-residuals':
    'the residuals still have a shape in them, so the model is not sufficient',
  'nb.flag.multivariable': 'more than one variable differed between the runs',
  'nb.flag.bench-warning': 'the bench raised a warning about this comparison',
  'nb.flag.cancelled': 'the run was cancelled before it finished',
  'nb.flag.failed-trials': 'some trials did not produce a result',
  'nb.flag.reliability-check': 'this is a comparison of two step sizes',
  'nb.flag.verdict-converging': 'halving the step did not move the outcome',
  'nb.flag.verdict-unresolved': 'halving the step moved the outcome',
  'nb.flag.verdict-diverged':
    'the paths separated while the aggregate held — chaos, not a bad step',
  'nb.flag.verdict-incomparable':
    'the two runs were not measurements of the same thing',

  'nb.rv.title': 'Radial-velocity fit to {target}',
  'nb.rv.mcPeriod': 'Period, with Monte Carlo interval',
  'nb.rv.mcK': 'K, with Monte Carlo interval',
  'nb.rv.mcNote':
    'half the 16th-84th percentile span over {n} trials, seed {seed}',
  'nb.rv.mcFamilies': 'Alias families the refits split into',
  'nb.rv.mcTopFamily':
    'the most populated is {period} d, winning {pct}% of trials; no single interval is meaningful',
  'nb.flag.uncertainty-analysed':
    'an uncertainty analysis was kept with this reading',
  'nb.flag.uncertainty-multimodal':
    'the refits split into several alias families, so no single interval is quoted',
  'nb.flag.uncertainty-cancelled': 'the uncertainty analysis was stopped early',
  'nb.flag.uncertainty-partial': 'some uncertainty trials produced no fit',
  'nb.flag.uncertainty-grid-limited':
    'the uncertainty interval was withheld as grid-limited',
  'nb.flag.uncertainty-refused':
    'an uncertainty analysis was attempted and refused',
  'nb.flag.uncertainty-stale':
    'an uncertainty analysis exists but was computed for a different fit, so it is not attached',
  'nb.rv.period': 'Period',
  'nb.rv.K': 'Velocity semi-amplitude K',
  'nb.rv.msini': 'gives M sin i, not a mass',
  'nb.rv.gamma': 'Systemic velocity',
  'nb.rv.rms': 'Residual RMS',
  'nb.rv.chi2': 'Reduced chi-square',
  'nb.rv.chi2Note': 'of the model as dialled in, not of a refitted one',
  'nb.rv.truthPeriod': 'Period (simulation)',
  'nb.rv.truthK': 'K (simulation)',
  'nb.rv.figure': 'Velocities folded on the trial period',
  'nb.rv.phase': 'Phase',
  'nb.rv.velocity': 'Radial velocity (m/s)',
  'nb.rv.observed': 'Observed',
  'nb.rv.model': 'Circular model',
  'nb.rv.evidence':
    '{used} epochs were fitted, leaving a residual RMS of {rms} m/s.',
  'nb.rv.limit.model':
    'A circular single-companion model: an eccentric orbit or a second companion would show up as structure in the residuals rather than as a worse period.',
  'nb.rv.limit.msini':
    'Only the line-of-sight component is measured, so K constrains M sin i and not a mass.',
  'nb.rv.limit.revealed':
    'The simulation truth was revealed before this was kept, so any agreement below is not an independent check.',

  'nb.bench.title': 'A/B comparison: {name}',
  'nb.bench.runA': '{metric}, run A',
  'nb.bench.runB': '{metric}, run B',
  'nb.bench.figure': '{metric} against simulated time',
  'nb.bench.time': 'Sample',
  'nb.bench.evidence': 'The runs differed in: {changed}.',
  'nb.bench.evidenceNone':
    'No parameter difference was recorded between the two runs.',
  'nb.bench.limit.oneSeed':
    'One seed and one pair of runs: this shows what happened, not how often it happens.',
  'nb.bench.limit.multivariable':
    'More than one variable differed, so the comparison does not isolate any single one.',

  'nb.sweep.title': '{parameter} swept in {scenario}',
  'nb.sweep.trials': 'Trials that produced a result',
  'nb.sweep.duration': 'Simulated duration per trial',
  'nb.sweep.durationNote': 'the same for every trial',
  'nb.sweep.min': '{metric}, smallest',
  'nb.sweep.max': '{metric}, largest',
  'nb.sweep.figure': '{metric} against {parameter}',
  'nb.sweep.changed':
    '{metric} changes with {parameter} across the range swept, {direction}.',
  'nb.sweep.flat':
    '{metric} does not change with {parameter} across the range swept, beyond the declared tolerance.',
  'nb.sweep.dir.increasing': 'increasing throughout',
  'nb.sweep.dir.decreasing': 'decreasing throughout',
  'nb.sweep.dir.flat': 'without a consistent direction',
  'nb.sweep.noSummary': 'Too few trials succeeded to summarise a trend.',
  'nb.sweep.limit.oneVariable':
    'One variable was swept and everything else held: nothing here says how the parameters interact.',
  'nb.sweep.limit.failed':
    '{n} trials did not produce a result, so the range is not evenly sampled.',
  'nb.sweep.limit.cancelled':
    'The sweep was cancelled, so the range was not covered as planned.',

  'nb.rel.title': 'Reliability check: {scenario}',
  'nb.rel.coarse': '{metric} at the working step',
  'nb.rel.fine': '{metric} at half the step',
  'nb.rel.agrees': 'unchanged within {tolerance}',
  'nb.rel.moved': 'moved by more than {tolerance}',
  'nb.rel.cost': 'Wall-clock cost of the check',
  'nb.rel.costNote': 'both runs together',
  'nb.rel.earlyWorst': 'Worst early disagreement between the paths',
  'nb.rel.earlyNote': 'over the first {n} samples',
  'nb.rel.worst': 'Worst disagreement over the whole run',
  'nb.rel.worstNote': 'relative to the range of the quantity',
  'nb.rel.evidence':
    'The same state was run at a step of {coarse} and of {fine}, and the two were compared against a tolerance of {tolerance}.',
  'nb.rel.limit.conservation':
    'Conserving energy is not the same as following the right trajectory: a scheme can conserve well and still be on the wrong path.',
  'nb.rel.limit.chaos':
    'In a chaotic system two useful runs separate eventually, so a separation is not by itself a sign of a bad step size.',
  'nb.rel.limit.noFigure':
    'Only the summary statistics of the two paths are kept, not the paths themselves.',
  'nb.rel.limit.verdict.converging':
    'Halving the step left the outcome alone. That is the strongest statement a convergence check supports; it is not a claim that the answer is correct.',
  'nb.rel.limit.verdict.unresolved':
    'Halving the step moved the outcome, so this reading describes the timestep as much as the system.',
  'nb.rel.limit.verdict.diverged':
    'The paths separated while the aggregate held. Quote the statistic, not the trajectory.',
  'nb.rel.limit.verdict.incomparable':
    'The two runs were not measurements of the same thing, so nothing can be concluded from their agreement or disagreement.',

  'nb.report.title': 'Evidence notebook',
  'nb.report.subtitle':
    'Readings kept from a Gravitas session, each with the conditions it was taken under.',
  'nb.report.footer': 'Gravitas — evidence notebook',
  'nb.report.student': 'Kept by',
  'nb.report.anonymous': 'not given',
  'nb.report.generated': 'Report generated',
  'nb.report.build': 'Build',
  'nb.report.entries': 'Entries',
  'nb.report.howToRead': 'How to read the numbers',
  'nb.report.readMeasured':
    'measured — obtained from data the instrument produced.',
  'nb.report.readAnalytic':
    'predicted — what a closed-form model says should happen, not an observation.',
  'nb.report.readTruth':
    'revealed — read out of the simulation’s own state. Available only because this is a simulation, and not a measurement.',
  'nb.report.tampered': {
    one: '{n} entry no longer matches its own checksum; see the note on it below.',
    other:
      '{n} entries no longer match their own checksums; see the notes on them below.',
  },
  'nb.report.source': 'Source',
  'nb.report.captured': 'Captured',
  'nb.report.checksum': 'Checksum',
  'nb.report.entryTampered':
    'This entry does not match its own checksum: its numbers were changed outside Gravitas.',
  'nb.report.results': 'What was recorded',
  'nb.report.colQuantity': 'Quantity',
  'nb.report.colValue': 'Value',
  'nb.report.colKind': 'Kind',
  'nb.report.colNote': 'Note',
  'nb.report.figure': 'Figure',
  'nb.report.conditions': 'Conditions it was taken under',
  'nb.report.noValue': 'not recorded',
  'nb.report.notRecorded': 'not recorded',

  // --- The browser's search and filters ---------------------------------------
  // Every option these describe is generated from the manifest. The subject
  // names below are the tag vocabulary the lessons declare, translated once
  // here rather than repeated in seventeen lesson files.
  'inv.filter.search.placeholder': 'Search by title, topic or subject',
  'inv.filter.query': 'Search',
  'inv.filter.subject': 'Subject',
  'inv.filter.subject.any': 'Any subject',
  'inv.filter.subject.option': '{subject} ({n})',
  'inv.filter.length': 'Time needed',
  'inv.filter.length.any': 'Any length',
  'inv.filter.length.demo': 'Demonstration (25 min or less)',
  'inv.filter.length.period': 'One class period (up to 50 min)',
  'inv.filter.length.long': 'More than a period (50 min+)',
  'inv.filter.calculation': 'Calculation',
  'inv.filter.calculation.any': 'Any amount of arithmetic',
  'inv.filter.calculation.none': 'No numbers to work out',
  'inv.filter.calculation.some': 'A few numbers to work out',
  'inv.filter.calculation.lots': 'Several numbers to work out',
  'inv.filter.progress': 'Progress',
  'inv.filter.progress.any': 'Any progress',
  'inv.filter.progress.new': 'Not started',
  'inv.filter.progress.going': 'In progress',
  'inv.filter.progress.done': 'Finished',
  'inv.filter.clear': 'Clear filters',
  'inv.filter.count': {
    one: '{n} of {total} lessons matches',
    other: '{n} of {total} lessons match',
  },

  'inv.tag.chaos': 'Chaos',
  'inv.tag.compact-objects': 'Compact objects',
  'inv.tag.exoplanets': 'Exoplanets',
  'inv.tag.galaxies': 'Galaxies',
  'inv.tag.gravity': 'Gravity',
  'inv.tag.habitability': 'Habitability',
  'inv.tag.observing': 'Observing',
  'inv.tag.orbits': 'Orbits',
  'inv.tag.resonance': 'Resonance',
  'inv.tag.solar-system': 'The solar system',
  'inv.tag.spaceflight': 'Spaceflight',
  'inv.tag.stars': 'Stars',

  'inv.empty.search': 'Nothing matches “{query}”.',
  'inv.empty.filters': 'No lesson matches all of those at once.',
  'inv.empty.relax': {
    one: 'Ignore {filter}: {n} lesson',
    other: 'Ignore {filter}: {n} lessons',
  },

  // --- The curated orders -----------------------------------------------------
  'inv.seq.heading': 'Ways through',
  'inv.seq.intro':
    'Lessons stand alone, but some build on each other. These are orders that work, with what each one assumes you have already done.',
  'inv.seq.all': 'Every lesson',
  'inv.seq.needs': 'Assumes you have done: {lessons}.',
  'inv.seq.needs.none': 'Nothing assumed. Start here.',
  'inv.seq.fit.demo': 'Fits a demonstration',
  'inv.seq.fit.period': 'Fits a class period',
  'inv.seq.fit.long': 'Longer than a period',
  'inv.seq.assign':
    'Cut a shorter activity out of this lesson with the assignment builder',

  'inv.seq.orbits.title': 'Orbital mechanics',
  'inv.seq.orbits.blurb':
    'From the shape of an orbit to moving between two of them. The first two lessons measure what orbits do; the last three spend that understanding on getting somewhere.',
  'inv.seq.orbits.keplers-laws':
    'The three laws, measured rather than recited. Everything after this refers back to the ellipse and the period–size relation you find here.',
  'inv.seq.orbits.orbital-energy':
    'Why a faster orbit is a lower one. The energy bookkeeping here is what makes a transfer burn make sense instead of looking backwards.',
  'inv.seq.orbits.hohmann-transfer':
    'The cheapest way between two circular orbits, planned and flown. Short enough to run as a demonstration once the energy argument is in place.',
  'inv.seq.orbits.gravity-assist':
    'The other way to change orbit: borrow from a planet instead of burning fuel. Reads as a companion to the transfer lesson rather than a sequel.',
  'inv.seq.orbits.lagrange-points':
    'Where the two-body picture stops being enough. A natural place to end, and the doorway into the three-body sequence.',

  'inv.seq.exoplanets.title': 'Detecting exoplanets',
  'inv.seq.exoplanets.blurb':
    'The two methods that have found nearly every known planet, then using them together on an unknown star. Longer lessons: plan on two sittings, or set part of one as homework.',
  'inv.seq.exoplanets.transit-photometry':
    'Depth, duration and noise, from a light curve you measure yourself. The vocabulary the rest of the sequence uses.',
  'inv.seq.exoplanets.radial-velocity':
    'The other half of the picture: what the star does. Transits give you size, this gives you mass, and neither alone gives you a density.',
  'inv.seq.exoplanets.detect-this-planet':
    'An unknown system with both instruments and no answer key. Worth doing only once both methods are familiar.',
  'inv.seq.exoplanets.design-the-schedule':
    'The same argument on the real instrument, where the run takes minutes and cannot be rewound. Do the analytic version first; this one asks you to plan the observing yourself.',
  'inv.seq.exoplanets.goldilocks-question':
    'What a detection does and does not tell you about whether anywhere is habitable. Needs the transit lesson; the radial-velocity one helps.',

  'inv.seq.threebody.title': 'When two bodies are not enough',
  'inv.seq.threebody.blurb':
    'Resonance, equilibrium points and sensitivity to initial conditions — the three ways adding one more body changes the answer.',
  'inv.seq.threebody.when-orbits-lock':
    'The gentlest introduction to a third body: repeated small tugs that add up. No prior three-body work needed.',
  'inv.seq.threebody.lagrange-points':
    'The equilibrium points of the restricted problem, and the rotating frame they live in. Short, and the frame is what the next lesson leans on.',
  'inv.seq.threebody.butterfly-effect':
    'Sensitive dependence, measured with a separation you watch grow. Much more convincing once you have seen an orbit that stays put.',
  'inv.seq.threebody.binary-star-planets':
    'Everything above at once: stability, resonance and chaos deciding where a planet can survive around two stars.',

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
  'cr3bp.invalid.eccentricityUnknown':
    "The pair's eccentricity could not be determined, so there is nothing here to call circular. Silence about an orbit is not evidence that it is round.",
  'cr3bp.invalid.thirdMass':
    'Other bodies here are heavy enough to matter. The restricted problem assumes everything but the two massive bodies pulls on nothing, and their combined mass is above that limit.',
  'cr3bp.invalid.unbound':
    'The two massive bodies are not on a closed orbit about each other, so there is no rotating frame to pose the problem in.',
  'cr3bp.invalid.tracerTooHeavy':
    'the third body is heavy enough to move the other two, so it is not a test particle and the restricted problem does not describe it.',
  'cr3bp.invalid.extraPotential':
    'something other than these two bodies is pulling on the third: a dark-matter halo or MOND is in force, and the Lagrange points of a modified law are not the ones drawn here.',
  'cr3bp.invalid.softenedForces':
    'the bodies are close enough together that the engine is clamping the force between them, so the close-range law being integrated is not the inverse square this picture assumes.',
  'cr3bp.invalid.noTracer': 'there is no light third body to describe.',
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

  // --- Observing schedules, and comparing two of them -------------------------
  'rvsched.shape': 'Schedule',
  'rvsched.shape.regular': 'Regular cadence',
  'rvsched.shape.irregular': 'Irregular',
  'rvsched.shape.clustered': 'Clustered',
  'rvsched.shape.explicit': 'Listed times',
  'rvsched.epochs': 'Observations',
  'rvsched.jitter': 'Scatter',
  'rvsched.clusters': 'Groups',
  'rvsched.epochList': 'Observation times (days)',
  'rvsched.gaps': 'Gaps (days, from-to)',
  'rvsched.problem.unreadable':
    '{count} entries could not be read and were ignored: {list}.',
  'rvsched.epochList.help':
    'Days from the start, separated by a comma and a space, or one per line. Decimals use a dot: write 0.5, not 0,5.',
  'rvsched.problem.decimalComma':
    'A comma between two digits could be a decimal point or a separator, and \u201c0,5 1,5\u201d means either two observations or four. Nothing was read from this list. Write decimals with a dot and separate times with a comma and a space: 0.5, 1.5. {count} entries look like decimal commas.',
  'rvsched.problem.negative':
    '{count} times are before the run starts and cannot be observed: {list}.',
  'rvsched.problem.duplicate':
    '{count} times were listed twice; an instant is one observation.',
  'rvsched.problem.tooFew':
    'A schedule needs at least {limit} times and this has {count}.',
  'rvsched.problem.overLimit':
    '{count} entries past the limit of {limit} were discarded.',
  'rvsched.problem.gapSyntax':
    'A gap is two days with a dash between them, as in 4-9. These could not be read: {list}.',
  'rvsched.problem.gapOrder': 'A gap has to end after it starts: {list}.',
  'rvsched.problem.gapRange': 'A gap cannot run past day {limit}: {list}.',
  'rvsched.problem.unusable':
    'This list cannot be observed as it stands, and the run will not fall back to a regular cadence. Correct it or choose another schedule.',
  'rvsched.note.willNotRun':
    'Nothing will be observed until the schedule above is corrected.',
  'rvsched.note.plan':
    '{planned} observations over {span} days. Schedule {id}.',
  'rvsched.note.dropped': '{count} fell inside a gap and were not observed.',
  'rvsched.compare': 'Compare with a second schedule',
  'rvsched.compare.shape': 'Second schedule',
  'rvsched.compare.waiting':
    'Observing both schedules: {a} and {b} of {planned}. The comparison appears when both are finished.',
  'rvsched.compare.arm':
    '{kind}: {used} of {planned} epochs fitted, best period {period} d, K {k} m/s, largest unobserved arc {hole}% of the cycle, worst window peak {alias}%.',
  'rvsched.compare.agree':
    'Both schedules land on the same period, within the {tolerance} d this baseline can resolve.',
  'rvsched.compare.disagree':
    'The two schedules disagree by {difference} d - more than the baseline can resolve, so the difference is in the times, not in the arithmetic.',
  'rvsched.compare.alias':
    'That difference sits on a peak in schedule {side} own window at {period} d: one of these fits is the same signal read off one alias away.',
  'rvsched.compare.uncontrolled':
    'This is not a comparison of scheduling alone - these were not held equal: {list}.',
  'rvsched.compare.control.count': 'the number of observations',
  'rvsched.compare.control.baseline': 'the baseline',
  'rvsched.compare.control.sigma': 'the stated uncertainty',
  'rvsched.compare.control.seed': 'the noise seed',
  'rvsched.compare.control.system': 'the star',
  'rvsched.compare.control.noiseModel': 'the noise model',
  'rvsched.compare.lost':
    'The {kind} arm did not fit everything it planned: {list}.',
  'rvsched.compare.lost.notReached': '{n} epochs never reached',
  'rvsched.compare.lost.missed': '{n} epochs observed as missed',
  'rvsched.compare.lost.degraded': '{n} degraded readings held out of the fit',
  'rvsched.compare.lost.unusable': '{n} readings without a usable value',
  'rvsched.compare.windowMoved':
    'What the {kind} schedule planned and what it actually sampled are not the same window: worst peak {planned}% planned against {observed}% observed.',
  'rvsched.compare.range':
    'Both arms were searched over the same range, {min} to {max} days: a best period is the best fit inside a range, and outside it nothing was tried.',
  'rvsched.compare.atBound':
    'At least one of these fits sits on the edge of the period range that was searched, which means the range decided it and not the measurements. Lengthen the baseline or widen the range before reading anything into the comparison.',
  'rvsched.compare.oneDraw':
    'One noise draw each: this says what these two schedules did on this run, not which schedule is better.',
  // --- The synthetic observing run's own controls ------------------------------
  // Eager until this release. The section is opt-in and hidden until it is
  // switched on, which is the moment the panel registers this catalogue, so
  // every visitor who never takes a recording was downloading its prose.
  'rv.survey.hint':
    'Keep only the measurements a stated schedule would actually have produced, each with an uncertainty. Nothing is recorded between them.',
  'rv.survey.cadence': 'Cadence',
  'rv.survey.baseline': 'Baseline',
  'rv.survey.sigma': 'Uncertainty',
  'rv.survey.seed': 'Noise seed',
  'rv.survey.ideal': 'Show the ideal signal (teaching overlay)',
  'rv.survey.restart': 'Restart run',
  'rv.survey.restart.hint':
    'Discard the measurements and begin the schedule again',
  'rv.survey.analyse': 'Analyse',
  'rv.survey.analyse.hint':
    'Open the analysis workspace on these measurements: fit a circular model by hand, or search a bounded range of periods.',
  'rv.survey.idealLabel': 'Ideal signal (teaching overlay, not data)',
  'rv.survey.progress': '{taken} of {planned} measurements taken.',
  'rv.survey.complete': 'The schedule is finished.',
  'rv.survey.waiting': 'Waiting for the simulation clock to advance.',
  'rv.survey.coarse':
    'The simulation is running too fast for this cadence: some measurements were read between widely spaced frames and their extremes may be flattened. Reduce the speed and restart the run.',

  // --- The binary lesson's sweep ----------------------------------------------
  'binarySweep.title': 'Sweep the starting radius',
  'binarySweep.hint':
    'The same run you have been doing by hand, at five starting radii, with everything else held fixed. Each trial reports what happened to the planet - not an average of where it was.',
  'binarySweep.run': 'Run the sweep',
  'binarySweep.cancel': 'Stop',
  'binarySweep.recheck': 'Re-run at half the step',
  'binarySweep.recheckRun': 'Check it',
  'binarySweep.keep': 'Keep in the notebook',
  'binarySweep.running': 'Trial {done} of {total}…',
  'binarySweep.done': '{n} trials, {periods} binary periods each, {seconds}s.',
  'binarySweep.refused': 'The sweep did not start ({reason}).',
  'binarySweep.col.radius': 'Start',
  'binarySweep.col.outcome': 'What happened',
  'binarySweep.col.periods': 'Periods done',
  'binarySweep.col.farthest': 'Farthest',
  'binarySweep.col.encounters': 'Close passes',
  'binarySweep.col.drift': 'Energy drift',
  'binarySweep.outcome.survived': 'still there at the end',
  'binarySweep.outcome.ejected': 'left the system',
  'binarySweep.outcome.collided': 'hit a star',
  'binarySweep.outcome.unreliable': 'not trustworthy',
  'binarySweep.outcome.incomplete': 'window not finished',
  'binarySweep.outcome.notRun': 'did not run',
  'binarySweep.short.survived': 'still there',
  'binarySweep.short.ejected': 'left',
  'binarySweep.short.collided': 'hit',
  'binarySweep.short.unreliable': 'untrusted',
  'binarySweep.short.incomplete': 'unfinished',
  'binarySweep.axis': 'Starting radius, in binary separations',
  'binarySweep.caveat.incomplete':
    '{n} trials did not finish the window, so they establish nothing about the planet either way.',
  'binarySweep.caveat.unreliable':
    '{n} trials drifted too far in energy to draw a conclusion from, whatever the planet appeared to do.',
  'binarySweep.caveat.cancelled':
    'This sweep was stopped before it finished, so the values it never reached are missing rather than uninteresting.',
  'binarySweep.caveat.window':
    'Every one of these is {periods} binary periods. The published boundary is fitted to ten thousand, and a planet can circle quietly for hundreds before its orbit is walked out - so "still there" is a statement about this window and not about the future.',
  'binarySweep.recheck.atChange': '{value} - where the outcome changes',
  'binarySweep.recheck.agreed':
    'At {value} the smaller step gives the same answer, {outcome}: that outcome is resolved at this window, which is not the same as the planet being stable.',
  'binarySweep.recheck.disagreed':
    'At {value} the smaller step does not agree ({reason}), so neither run has measured this configuration.',
  'binarySweep.recheck.reason.outcomeChanged': 'the outcome changed',
  'binarySweep.recheck.reason.unreliableRun':
    'one of the runs is untrustworthy',
  'binarySweep.recheck.reason.notFinished': 'one of the runs did not finish',

  // --- The binary sweep, kept as evidence -------------------------------------
  'nb.binarySweep.title': 'Starting radius sweep ({scenario})',
  'nb.binarySweep.trials': 'Trials',
  'nb.binarySweep.window': 'Observation window',
  'nb.binarySweep.periods': 'binary periods',
  'nb.binarySweep.windowNote':
    'Every trial was watched for this long and no longer. Nothing here is a statement about what happens afterwards.',
  'nb.binarySweep.survived': 'Still there at the end',
  'nb.binarySweep.survivedNote':
    'Survived the window. Not "stable": the published boundary is fitted to ten thousand binary periods.',
  'nb.binarySweep.ejected': 'Left the system',
  'nb.binarySweep.unusable': 'Established nothing',
  'nb.binarySweep.unusableNote':
    'Trials that did not finish the window, or drifted too far in energy to draw a conclusion from.',
  'nb.binarySweep.figure': 'What happened, against where it started',
  'nb.binarySweep.axisX': 'Starting radius (binary separations)',
  'nb.binarySweep.axisY': 'Outcome',
  'nb.binarySweep.line':
    '{value} separations: {outcome}, after {done} of {asked} periods.',
  'nb.binarySweep.evidence': 'One run at each starting radius:',
  'nb.binarySweep.predicted': 'Predicted before running it: {prediction}',
  'nb.binarySweep.limit.window':
    'Each trial is {periods} binary periods. A planet can circle quietly for hundreds before its orbit is walked out, so a survival here is about this window.',
  'nb.binarySweep.limit.held':
    'Masses {m1} and {m2}, eccentricity {e}, seed {seed}: one system, and the starting radius is the only thing that changed.',
  'nb.binarySweep.limit.unusable':
    '{n} trials established nothing and are in the figure as such rather than dropped.',
  'nb.binarySweep.limit.cancelled':
    'The sweep was stopped early, so the radii it never reached are missing rather than uninteresting.',
  'nb.binarySweep.limit.resolved':
    'The trial at {value} was re-run at half the step and gave the same outcome, so that outcome is not an artefact of the step size.',
  'nb.binarySweep.limit.unresolved':
    'The trial at {value} gave a different outcome at half the step, so neither run has measured it.',
  'nb.binarySweep.limit.noRecheck':
    'No trial was re-run at a smaller step, so none of these outcomes has been shown to be independent of the step size.',
  // --- The gravity-assist comparison and sweep, in the notebook ------------
  'nb.assist.unit.speed': 'sim velocity units',
  'nb.assist.unit.simVelocity': 'sim velocity units',
  'nb.assist.unit.simUnits': 'sim units',
  'nb.assist.predicted': 'Before running it, I predicted: {prediction}',
  'nb.assist.incomplete': 'Passes with no complete encounter',
  'nb.assist.incompleteNote':
    'No outgoing reading, so there is no before-and-after and nothing in that pass is evidence.',
  'nb.assist.limit.gate':
    'Both readings were taken {gate} units from the planet and corrected to the speed at infinity by the same amount, so the differences are what this measures.',
  'nb.assist.limit.held':
    'Only the impact parameter differed: approach speed {vinf}, integrator and step, seed {seed}.',
  'nb.assist.limit.incomplete':
    '{n} pass(es) produced no complete encounter; they are reported, not dropped.',
  'nb.assist.limit.cancelled':
    'Stopped before it finished, so it does not cover the values it was asked for.',
  'nb.assist.ab.title': 'The same flyby on both sides of the planet',
  'nb.assist.ab.gain': 'Speed change, passing behind',
  'nb.assist.ab.loss': 'Speed change, passing in front',
  'nb.assist.ab.deltaV': 'Velocity change, either side',
  'nb.assist.ab.deltaVNote':
    'The same on both sides, because it is the same rotation of the same-length vector. It is also the same in every inertial frame, unlike the speed change.',
  'nb.assist.ab.relResidual': 'Change in speed relative to the planet',
  'nb.assist.ab.relResidualNote':
    'Zero to the integrator\u2019s accuracy, and exactly zero in the two-body problem: the encounter can turn the relative velocity and cannot lengthen it.',
  'nb.assist.ab.recoil': 'The planet\u2019s recoil',
  'nb.assist.ab.recoilNote':
    'It is {ratio} of the spacecraft\u2019s own velocity change, against a mass ratio of {mass}.',
  'nb.assist.ab.figure': 'Speed before and after, in both frames',
  'nb.assist.ab.axisX': '0 = before the encounter, 1 = after',
  'nb.assist.ab.axisY': 'Speed (sim velocity units)',
  'nb.assist.ab.series.gaining.planet': 'behind: relative to the planet',
  'nb.assist.ab.series.gaining.inertial': 'behind: inertial',
  'nb.assist.ab.series.losing.planet': 'in front: relative to the planet',
  'nb.assist.ab.series.losing.inertial': 'in front: inertial',
  'nb.assist.ab.which.gaining': 'behind',
  'nb.assist.ab.which.losing': 'in front',
  'nb.assist.ab.evidence':
    'Two passes of the same encounter, rebuilt from the same baseline, differing only in the sign of the impact parameter:',
  'nb.assist.ab.line':
    '  {which} (b = {b}): {outcome}, turned {turn}\u00b0, speed change {change}',
  'nb.assist.ab.limit.notMirrored':
    'The gain and the loss are not the same size \u2014 the loss is {ratio} of the gain \u2014 and nothing requires them to be. Both passes changed the VELOCITY equally; speed is the length of a sum, and lengths do not add and subtract symmetrically.',
  'nb.assist.ab.limit.recoil':
    'The spacecraft has mass, so the planet recoils: \u201cthe planet\u2019s frame\u201d is one inertial frame before the encounter and a slightly different one after. The relative speed holds anyway \u2014 two-body, at any mass ratio \u2014 and the system conserves total momentum in every frame.',
  'nb.assist.sweep.title': 'Five impact parameters on the gaining side',
  'nb.assist.sweep.passes': 'Passes run',
  'nb.assist.sweep.passesNote': '{n} of them produced a complete encounter.',
  'nb.assist.sweep.mostTurned': 'Impact parameter that turned the most',
  'nb.assist.sweep.mostGained': 'Impact parameter that gained the most speed',
  'nb.assist.sweep.sameNote':
    'The same pass turned the most and gained the most, in this range.',
  'nb.assist.sweep.differentNote':
    'A different pass gained the most from the one that turned the most.',
  'nb.assist.sweep.figure': 'Turn and speed change against impact parameter',
  'nb.assist.sweep.axisX': 'Impact parameter (sim units)',
  'nb.assist.sweep.axisY': 'Degrees, and sim velocity units',
  'nb.assist.sweep.series.turn': 'deflection (degrees)',
  'nb.assist.sweep.series.gain': 'speed change (sim velocity units)',
  'nb.assist.sweep.evidence':
    'One side of the planet, five distances, everything else held:',
  'nb.assist.sweep.line':
    '  b = {b}: {outcome}, turned {turn}\u00b0, speed change {change}',
  'nb.assist.sweep.limit.oneSide':
    'All five passes are on the gaining side; the sweep says nothing about the losing one.',
  'nb.assist.sweep.limit.notALaw':
    'That more turn gave more speed here is a fact about this geometry, not a rule. The gain grows only while the turn brings the relative velocity round towards the planet\u2019s own direction of travel; past that it falls. Here the best turn is unreachable \u2014 the pass that would produce it hits the planet.',
  // --- The chaos pair and the neck pair, in the notebook -------------------
  'nb.chaosPair.simSeconds': 'simulated seconds',
  'nb.chaosPair.title.binary': 'The two-body control: two runs, one nudge',
  'nb.chaosPair.title.triple': 'Three bodies, two runs, one nudge',
  'nb.chaosPair.interval': 'Interval both runs cover',
  'nb.chaosPair.intervalNote':
    'Run A covered {a} and Run B {b}; the fit uses their overlap.',
  'nb.chaosPair.step': 'Measured integration step',
  'nb.chaosPair.stepNote':
    'The mean of {n} steps the engine actually took, with {integrator} \u2014 not the setting it was asked for.',
  'nb.chaosPair.tau': 'e-folding time',
  'nb.chaosPair.tauNote':
    'Fitted between {from} and {to} simulated seconds, r\u00b2 {r2}. Outside that interval the separation is still the nudge, or has stopped growing.',
  'nb.chaosPair.growth': 'Total growth factor',
  'nb.chaosPair.behaviour': 'What the separation did',
  'nb.chaosPair.behaviour.identical': 'nothing: the two runs stayed identical',
  'nb.chaosPair.behaviour.bounded': 'stayed close, without growing',
  'nb.chaosPair.behaviour.linear':
    'grew in proportion to time, straight-line fit r\u00b2 {r2} \u2014 drift, not chaos',
  'nb.chaosPair.behaviour.saturated':
    'grew and then stopped, having run out of system to get further apart in',
  'nb.chaosPair.behaviour.exponential': 'grew exponentially',
  'nb.chaosPair.behaviour.insufficient':
    'could not be classified from this run',
  'nb.chaosPair.behaviour.none': 'was not measured',
  'nb.chaosPair.controls': 'Effective numerical controls',
  'nb.chaosPair.controlsResolved':
    'Their e-folding times span {spread}%, so the answer is not a property of the arithmetic.',
  'nb.chaosPair.controlsUnresolved':
    'Not enough of them changed the arithmetic, so this measurement is numerically unresolved.',
  'nb.chaosPair.figure': 'How far apart the two runs are',
  'nb.chaosPair.axisX': 'Simulated seconds',
  'nb.chaosPair.axisY': 'Separation between the runs',
  'nb.chaosPair.series.separation': 'separation',
  'nb.chaosPair.predicted': 'Before running it, I predicted: {prediction}',
  'nb.chaosPair.evidence':
    'Two runs of the same system from the same captured start, differing by {km} km along {axis} on {body} and by nothing else.',
  'nb.chaosPair.evidenceNoPerturbation':
    'Two runs of the same system from the same captured start, with nothing changed between them.',
  'nb.chaosPair.evidenceExponential':
    'The separation grew exponentially with an e-folding time of {tau} simulated seconds, over about {efolds} e-folds.',
  'nb.chaosPair.evidenceOther': 'The separation {behaviour}.',
  'nb.chaosPair.limit.cancelled':
    'Stopped before it finished, so at least one run is shorter than it was asked to be.',
  'nb.chaosPair.limit.interval':
    'The two runs do not cover the same interval, so the fit is over less than either of them.',
  'nb.chaosPair.limit.unresolved':
    'Numerically UNRESOLVED: the repeats under different arithmetic do not agree, so this rate belongs to the computation until they do.',
  'nb.chaosPair.limit.window':
    'The rate was fitted between {from} and {to} simulated seconds and describes that interval, not the whole run.',
  'nb.chaosPair.limit.estimate':
    'A finite perturbation over a finite window gives an estimate of the divergence rate, not a Lyapunov exponent, which is a limit over infinite time.',
  'nb.neckPair.title': 'One accessible region, two directions',
  'nb.neckPair.constantA': 'Jacobi constant, direction A',
  'nb.neckPair.constantB': 'Jacobi constant, direction B',
  'nb.neckPair.constantNote':
    'Equal by construction: C is fixed by where the tracer is and how fast it is going, and neither arm differs in either.',
  'nb.neckPair.speed': 'Rotating-frame speed, both arms',
  'nb.neckPair.speedNote': 'Sent out at {a}\u00b0 and {b}\u00b0.',
  'nb.neckPair.closestA': 'Closest approach to L1, direction A',
  'nb.neckPair.closestB': 'Closest approach to L1, direction B',
  'nb.neckPair.closestNote':
    'In units of the separation, in the rotating frame the overlay draws.',
  'nb.neckPair.figure': 'Both paths, in the rotating frame',
  'nb.neckPair.axisX': 'x (separations, rotating frame)',
  'nb.neckPair.axisY': 'y (separations, rotating frame)',
  'nb.neckPair.series.a': 'direction A ({deg}\u00b0)',
  'nb.neckPair.series.b': 'direction B ({deg}\u00b0)',
  'nb.neckPair.predicted': 'Before running it, I predicted: {prediction}',
  'nb.neckPair.evidence':
    'The same tracer, the same place, the same rotating-frame speed, sent out at {a}\u00b0 and at {b}\u00b0, watched for {periods} binary periods each.',
  'nb.neckPair.crossed': 'Arm {which} crossed the L1 neck after {t}.',
  'nb.neckPair.notCrossed':
    'Arm {which} did not cross the L1 neck during this run.',
  'nb.neckPair.limit.notControlled':
    'The control failed: the two arms did not have the same accessible region, so their paths differ for a reason this activity was meant to exclude.',
  'nb.neckPair.limit.cancelled':
    'Stopped before it finished, so at least one arm was watched for less than the window.',
  'nb.neckPair.limit.short':
    'At least one arm was cut short. An arm that stopped early did not fail to cross; it was not watched long enough to say.',
  'nb.neckPair.limit.window':
    'This covers {periods} binary periods. "Did not cross during this run" is not "can never cross": an open neck says only that crossing is not forbidden, and a finite window cannot say more.',
  'nb.neckPair.limit.stability':
    'Nothing here is about stability. Whether either path would stay where it is if nudged is a separate question with its own evidence.',
  // ---------------------------------------------------------------------------
  // The gravitational-wave lab (js/gwWidgets.js, js/gwLab.js)
  // ---------------------------------------------------------------------------
  // Two rules run through all of this. The model is named as a model wherever
  // it appears, and the published data is named as a measurement wherever it
  // appears. Nothing here says "gravitational wave" without saying which.
  'gwW.lab.title': 'Gravitational-wave observing lab',
  'gwW.lab.note':
    'A model of two compact objects spiralling together, and the strain a detector would record from it. Leading-order inspiral only: it stops before the merger, and the readout says where.',
  'gwW.control.m1': 'First mass',
  'gwW.control.m2': 'Second mass',
  'gwW.control.distance': 'Distance',
  'gwW.control.inclination': 'Viewing angle',
  'gwW.control.cursor': 'Position in the signal',
  'gwW.preset.bbh': 'Two black holes',
  'gwW.preset.bbh.note':
    'Thirty-six and twenty-nine solar masses at 410 megaparsecs — the scale of the first detection. The whole inspiral above 20 Hz lasts under a second.',
  'gwW.preset.bns': 'Two neutron stars',
  'gwW.preset.bns.note':
    'Two stars of 1.4 solar masses at 40 megaparsecs. From 20 Hz this binary radiates for over two minutes, so the lab models the last eight seconds and says so.',
  'gwW.preset.nsbh': 'Neutron star and black hole',
  'gwW.preset.nsbh.note':
    'A 1.4 solar-mass neutron star with a ten solar-mass black hole. Everything different about this signal follows from the masses: the model has no tides, no disruption and no post-merger to add.',
  'gwW.action.play': 'Play / pause',
  'gwW.action.replay': 'Replay',
  'gwW.action.noise': 'Detector noise',
  'gwW.action.reroll': 'New noise',
  'gwW.action.pin': 'Pin as A',
  'gwW.action.unpin': 'Clear A',
  'gwW.panel.source': 'source (schematic)',
  'gwW.panel.strain': 'strain at the detector',
  'gwW.panel.local': 'a few cycles, close up',
  'gwW.panel.frequency': 'wave frequency',
  'gwW.panel.ring': 'free test masses at the detector',
  'gwW.axis.strain': 'h (×10⁻²¹)',
  'gwW.axis.frequency': 'Hz',
  'gwW.axis.merger': 'merger',
  'gwW.plot.isco': 'the model stops here',
  'gwW.local.span': '{ms} ms across',
  'gwW.source.notToScale': 'schematic: separation is modelled, sizes are not',
  'gwW.overlay.legend':
    'Each ring is one wave crest, where it would be now after leaving the source. The outer ones left earlier, when the orbit was slower, so they are further apart. Distances compressed, amplitude exaggerated, propagation slowed and rescaled as the frequency climbs. The centre is left out: a far-field formula does not describe it.',
  'gwW.overlay.legendStill':
    'Held still. Each ring is one wave crest, where it would be now after leaving the source. The outer ones left earlier, when the orbit was slower, so they are further apart. Distances compressed, amplitude exaggerated. The centre is left out: a far-field formula does not describe it.',
  'gwW.ring.amplified':
    'stretch and squeeze, across the wave’s path. Amplified — the real effect is a part in 10²¹.',
  'gwW.row.chirpMass': 'Chirp mass',
  'gwW.row.now': 'At the cursor',
  'gwW.value.now': '{freq}, {toMerger} before merger',
  'gwW.row.strainNow': 'Strain now',
  'gwW.row.separation': 'Separation',
  'gwW.value.separation': '{rs} Schwarzschild radii',
  'gwW.row.velocity': 'Orbital speed',
  'gwW.fidelity.good': 'v/c = {v}. Well inside where this approximation holds.',
  'gwW.fidelity.fair':
    'v/c = {v}. The terms this model drops are getting large here.',
  'gwW.fidelity.poor':
    'v/c = {v}. Too fast for this approximation — read the shape, not the numbers.',
  'gwW.fidelity.unknown': 'v/c not defined here.',
  'gwW.row.window': 'Modelled',
  'gwW.value.windowWhole':
    '{window}, {cycles} wave cycles — the whole inspiral from 20 Hz.',
  'gwW.value.windowExcerpt':
    'The last {window} of the inspiral, {cycles} wave cycles, from {from}. The whole thing from 20 Hz would be {full} and {fullCycles} cycles.',
  'gwW.row.stops': 'Where it stops',
  'gwW.value.stops':
    '{isco}, the innermost stable circular orbit. There is no merger or ringdown in this model, and it is not extrapolated past here.',
  'gwW.row.effectiveDistance': 'Distance',
  'gwW.value.effectiveDistance':
    '{d} Mpc. A single detector sees the amplitude of a source at {eff} Mpc viewed face-on.',
  'gwW.row.noise': 'Noise',
  'gwW.value.noise':
    'Simulated, from the Advanced LIGO design curve. Seed {seed} — it does not change when you change a parameter.',
  'gwW.row.comparison': 'Against A',
  'gwW.value.controlled': 'One thing changed: {changed}.',
  'gwW.value.uncontrolled':
    'More than one thing changed: {changed}. Nothing here can say which of them did it.',
  'gwW.value.identical': 'Identical to A.',
  'gwW.field.m1': 'first mass',
  'gwW.field.m2': 'second mass',
  'gwW.field.distanceMpc': 'distance',
  'gwW.field.inclinationDeg': 'viewing angle',
  'gwW.row.audio': 'Sound',
  'gwW.row.playback': 'Playback',
  'gwW.value.playback': '{speed} s of signal per second on screen',
  'gwW.real.title': 'GW150914, as published',
  'gwW.real.note':
    'Measured strain from the two LIGO detectors, released with the discovery paper. The collaboration band-passed it to 35–350 Hz before publishing; nothing else has been done to it here.',
  'gwW.control.shift': 'Shift Livingston',
  'gwW.control.invert': 'Livingston sign',
  'gwW.value.inverted': 'inverted',
  'gwW.value.asPublished': 'as published',
  'gwW.real.preset.published': 'As published',
  'gwW.real.preset.published.note':
    'Both traces exactly as released. They do not look alike, and that is the starting point rather than a problem.',
  'gwW.real.preset.aligned': 'Shifted and inverted',
  'gwW.real.preset.aligned.note':
    'Livingston moved 6.9 ms earlier and flipped in sign. Both are physical: the wave crossed the Earth, and the two detectors’ arms are turned relative to each other.',
  'gwW.real.trace.obsH': 'Hanford, measured',
  'gwW.real.trace.obsL': 'Livingston, measured',
  'gwW.real.trace.recH':
    'Hanford, the collaboration’s numerical-relativity waveform',
  'gwW.real.trace.resH': 'Hanford, measured minus waveform',
  'gwW.real.axis': 'seconds after GPS 1126259462  ({a}–{b})',
  'gwW.real.row.event': 'Event',
  'gwW.real.row.source': 'Source',
  'gwW.real.row.doi': 'DOI',
  'gwW.real.row.filtering': 'Already filtered',
  'gwW.real.value.filtering':
    'Band-passed 35–350 Hz and notched at the instrument lines, by the collaboration, before publication.',
  'gwW.real.row.applied': 'You have applied',
  'gwW.real.value.applied': '{shift} ms to Livingston, {sign}',
  'gwW.real.row.measured': 'Best match',
  'gwW.real.value.measured':
    'The two traces line up best {lag} ms apart with the sign flipped (correlation {r}).',
  'gwW.real.row.agreement': 'Agreement',
  'gwW.real.value.agreement':
    'The measurement and the waveform correlate at {r}, with no shift between them.',
  'gwW.real.row.residual': 'What is left',
  'gwW.real.value.residual':
    'Noise. It is as loud before the signal arrives as after, which is how you can tell.',
  'gwW.real.row.licence': 'Licence',
  'gwW.action.listen': 'Listen',
  'gwW.row.mapping': 'What you are hearing',
  'gwW.value.mapping.rate':
    'Played {speed} faster than it happened, so every frequency is {speed} higher: {low} rising to {high}. The chirp keeps its shape — it sweeps by a factor of {sweep}, the same as the real signal.',
  'gwW.value.mapping.shift':
    'Stretched to last {speed} longer, then shifted up by {shift} Hz: {low} rising to {high}. The shift makes it audible but flattens the chirp — it now sweeps by a factor of {sweep} where the real signal sweeps by {trueSweep}.',
  'gwW.row.notSound': 'What it is not',
  'gwW.value.notSound':
    'This is measurement data turned into sound. Gravitational waves are not sound and there is nothing for sound to travel through between here and the source.',
  'gwW.audio.playing': 'Playing the modelled signal — {low} to {high}.',
  'gwW.audio.stopped': 'Stopped.',
  'gwW.audio.refused.muted':
    'Sound is off. Turn it on with the speaker at the top of the screen, then press Listen again.',
  'gwW.audio.refused.unsupported':
    'This browser will not give the page an audio output. Everything in this lesson can be done from the plots.',
  'gwW.audio.refused.empty': 'There is nothing in this window to play.',
  // ---------------------------------------------------------------------------
  // The sound panel (js/ui.js). The button's own labels are in the eager
  // catalogue; everything below is only read once the panel is opened.
  // ---------------------------------------------------------------------------
  'sound.title': 'Sound',
  'sound.state.long.unsupported':
    'This browser will not give the page an audio output.',
  'sound.state.long.muted': 'Off. Nothing on this page can make a sound.',
  'sound.state.long.blocked':
    'On, but the browser has not let the page start its audio yet. Press a button on the page and try again.',
  'sound.state.long.ready':
    'On, and nothing is playing. That is normal — sound is permitted, not started.',
  'sound.state.long.playing': 'On, and something is playing now.',
  'sound.permission':
    'Turning sound on gives the page permission to make one. It does not mean something is playing: the sandbox is quiet when nothing is orbiting, and the lab plays only when you ask it to.',
  'sound.turnOn': 'Turn sound on',
  'sound.turnOff': 'Turn sound off',
  'sound.row.mode': 'Mode',
  'sound.row.now': 'Right now',
  'sound.row.volume': 'Volume',
  'sound.mode.sandbox': 'Simulation sounds',
  'sound.mode.signal': 'Gravitational-wave signal',
  'sound.now.nothing': 'Nothing',
  'sound.now.sandbox': 'Orbiting bodies, as tones',
  'sound.now.signal': 'A gravitational-wave signal, {seconds} s',
  'sound.preview': 'Play an example',
  'sound.stop': 'Stop',
  'sound.preview.note':
    'The example is a modelled black-hole chirp, shifted up so a laptop speaker can reproduce it. It is not the simulation’s own sound, and it is not a recording of anything.',
  'sound.lesson.link': 'Listening to spacetime: discover a merger',
  'sound.shortcut': 'Mute or unmute sound',

  // ---------------------------------------------------------------------------
  // Instrument prose moved out of the start-up download
  // ---------------------------------------------------------------------------
  // The dark-matter, transit and black-hole widget families. Nothing in the
  // entry graph can reach any of them - they are reachable only through
  // js/widgets.js, which the lazy lesson engine imports - so every visitor was
  // downloading thirteen kilobytes of instrument labels in order not to use
  // them. Each of the three modules now calls ensureDeferredMessages() itself,
  // the way js/chaosWidgets.js and js/resonanceWidgets.js already did, so a
  // test or an authoring preview that imports one directly still gets its
  // strings.
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
  'gwW.source.short': 'schematic — not to scale',
  'gwW.ring.short': 'amplified',
  'gwW.row.overlay': 'The wave pattern',
  'gwW.row.ring': 'The test masses',
  // The gravitational-wave lab's evidence (js/notebook/capture.js)
  'nb.source.gw-observation': 'Gravitational-wave observation',
  'nb.gw.title.model': 'Modelled gravitational-wave signal',
  'nb.gw.title.data': '{event}, as published',
  'nb.gw.m1': 'First mass',
  'nb.gw.m2': 'Second mass',
  'nb.gw.chirpMass': 'Chirp mass',
  'nb.gw.detectorFrame': 'detector frame; no redshift assumed',
  'nb.gw.distance': 'Luminosity distance',
  'nb.gw.inclination': 'Inclination',
  'nb.gw.effectiveDistance': 'Effective distance',
  'nb.gw.effectiveDistanceNote':
    'what one optimally oriented detector can constrain from the amplitude',
  'nb.gw.frequency': 'Wave frequency at the cursor',
  'nb.gw.toMerger': 'Time to coalescence at the cursor',
  'nb.gw.strain': 'Strain at the cursor',
  'nb.gw.peakStrain': 'Peak strain in the modelled window',
  'nb.gw.separation': 'Separation at the cursor',
  'nb.gw.velocity': 'Orbital velocity parameter at the cursor',
  'nb.gw.isco': 'Frequency at the innermost stable circular orbit',
  'nb.gw.windowSeconds': 'Length of the modelled window',
  'nb.gw.cycles': 'Wave cycles in the modelled window',
  'nb.gw.similarity': 'Similarity',
  'nb.gw.similarityNote':
    'a normalised noise-weighted overlap, 0 to 1. Not a signal-to-noise ratio and not a detection significance.',
  'nb.gw.evidence.changed':
    'Changed between the two runs: {changed}. Held fixed: {held}.',
  'nb.gw.evidence.identical': 'The two runs were identical.',
  'nb.gw.evidence.prediction': 'Predicted beforehand: {prediction}',
  'nb.gw.limit.model':
    'This is a model, not an observation: a leading-order quasi-circular inspiral of two point masses, with no spin, no eccentricity, no tides and no higher post-Newtonian terms.',
  'nb.gw.limit.isco':
    'It stops at {isco} Hz, the innermost stable circular orbit. There is no merger and no ringdown in it, and it was not extrapolated past that point.',
  'nb.gw.limit.excerpt':
    'Only the last {window} s were modelled. The whole inspiral from 20 Hz would be {full} s.',
  'nb.gw.limit.velocity':
    'At the moment recorded, the orbital velocity parameter was {v}. The terms this model drops grow as the square of that, so the numbers here are indicative rather than accurate.',
  'nb.gw.limit.response':
    'The detector response assumes the source directly overhead with polarization angle zero, so the recorded strain is the plus polarization alone.',
  'nb.gw.limit.noise.synthetic':
    'Any noise shown was simulated from the Advanced LIGO design curve with seed {seed}. It is not the noise any detector had.',
  'nb.gw.limit.uncontrolled':
    'More than one thing changed between the two runs, so this evidence cannot say which of them produced the difference.',
  'nb.gw.limit.similarity':
    'A high similarity is easy to obtain and is not evidence of a detection. Establishing that would need a template bank, a background estimate and a trials factor, none of which are here.',
  'nb.gw.limit.published':
    'Measured data, published by the collaboration: {paper}, doi:{doi}. Reproduced here, not reprocessed.',
  'nb.gw.limit.filtered':
    'The collaboration band-passed these traces to 35-350 Hz and notched the instrument lines before publishing them. What is plotted is filtered data, not raw strain.',
  'nb.gw.limit.noise':
    'These are real measurements and they contain noise. Some of what is on screen is the detector, not the source.',
  'nb.gw.figure.title': 'Strain envelope over the modelled window',
  'nb.gw.figure.x': 'Time to coalescence (s)',
  'nb.gw.figure.y': 'Strain h',
  'nb.gw.figure.model': 'Model',
  'nb.gw.figure.measured': 'Measured',
  'gwW.action.capture': 'Save to notebook',
  'gwW.row.similarity': 'Similarity to A',
  'gwW.value.similarity': '{value} out of 1',
  'gwW.value.similarity.none': 'Pin a signal as A first.',
  'gwW.row.notDetection': 'What that is not',
  'gwW.value.notDetection':
    'A normalised overlap, and nothing more. It is not a signal-to-noise ratio, a probability, or evidence that anything was detected — establishing that needs a template bank, a background estimate and a trials factor, none of which are here.',

  // ---------------------------------------------------------------------------
  // More prose moved out of the start-up download
  // ---------------------------------------------------------------------------
  // The front door, the tidal-disruption model, the activity bridge, the export
  // dialog and the lesson engine are all loaded on demand, so their strings
  // were downloaded by every visitor in order not to be read. The stellar phase
  // and class names went with them: they are read only when an inspector card
  // is built for a star, and the inspector primes this catalogue first.
  'export.empty': 'There is nothing recorded to export yet.',
  'export.failed': 'Could not build that file.',
  'export.done': { one: 'Exported {n} row.', other: 'Exported {n} rows.' },
  'export.truncated':
    'Exported the first {n} rows: the recording was larger than one file.',
  'inv.link.unknown': 'That investigation link does not match a lesson.',
  'inv.load.failed': 'That lesson could not be loaded. Try again.',
  'activity.error.noActivity':
    'There is no classroom activity called “{id}”. The teaching page lists the ones that exist.',
  'activity.error.noFormat':
    'That activity has no “{id}” format. Choose one from the teaching page.',
  'activity.error.notUsable':
    'That activity could not be opened: the investigation behind it has changed too much. Open the full investigation instead.',
  'welcome.scenarioGone': 'That scenario is no longer available.',
  'welcome.shownAgain': 'It will be shown again next time',
  'welcome.showAgain': 'Show this again on my next visit',
  'export.downloadCsv': 'Download CSV',
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
  'welcomeLink.teaching.label': 'Teaching with Gravitas',
  'welcomeLink.teaching.note':
    'How it is used in a course, with six demonstrations you can run.',
  'welcomeLink.model.label': 'How Gravitas models the universe',
  'welcomeLink.model.note':
    'What is calculated, what is approximated, and what is only drawn.',
  'welcomeLink.instructors.note': 'Guides, answer keys and a curriculum map.',
  'tideP.moonOnEarth': 'the Moon, on the Earth',
  'tideP.sunOnEarth': 'the Sun, on the Earth',
  'tideP.earthOnMoon': 'the Earth, on the Moon',
  'tideP.jupiterOnIo': 'Jupiter, on Io',
  'tideP.starOnHotJupiter': 'a Sun-like star, on a hot Jupiter at 0.05 AU',
  'tideP.bhOnSunFar': 'a 10 M☉ black hole, on the Sun at one AU',
  'tideP.bhOnSunNear': 'the same black hole, on the Sun at three million km',
  'stellar.phase.pre-main-sequence': 'Pre-main-sequence',
  'stellar.phase.main-sequence': 'Main sequence',
  'stellar.phase.red-giant-branch': 'Red giant branch',
  'stellar.phase.post-main-sequence-expansion':
    'Expanding after the main sequence',
  'stellar.phase.helium-ignition': 'Helium ignition',
  'stellar.phase.core-helium-burning': 'Core helium burning',
  'stellar.phase.early-asymptotic-giant-branch':
    'Early asymptotic giant branch',
  'stellar.phase.thermally-pulsing-agb':
    'Thermally pulsing asymptotic giant branch',
  'stellar.phase.advanced-burning': 'Advanced burning',
  'stellar.phase.post-agb-and-cooling': 'Exposed core, cooling',
  'stellar.phase.white-dwarf': 'White dwarf',
  'stellar.phase.neutron-star': 'Neutron star',
  'stellar.phase.black-hole': 'Black hole',
  'stellar.phase.unknown': 'Not modelled',
  // ---------------------------------------------------------------------------
  // The Stellar Lab (js/stellarWidgets.js, js/stellarLab.js)
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // The evolutionary playback (js/stellarEvolutionWidgets.js)
  // ---------------------------------------------------------------------------
  'stelE.title': 'A star, from start to finish',
  'stelE.note':
    'One published evolutionary track, played through. The age drives everything else — temperature, radius, luminosity, colour, current mass and phase all come from the same point on the same track. The cloud at the start and the remnant at the end are illustrations either side of what the model actually covers, and both say so.',
  'stelE.panel.diagram': 'where it has been',
  'stelE.panel.stage': 'the star now',
  'stelE.axis.hotter': '← hotter',
  'stelE.control.track': 'Star',
  'stelE.control.position': 'Through its life',
  'stelE.control.speed': 'Playback speed',
  'stelE.preset.mass': '{m} M☉',
  'stelE.action.play': 'Play',
  'stelE.action.pause': 'Pause',
  'stelE.action.restart': 'Back to the start',
  'stelE.action.prev': 'Previous phase',
  'stelE.action.next': 'Next phase',
  'stelE.action.pace': 'Change what the playhead paces',
  'stelE.action.interior': 'Interior schematic',
  'stelE.action.ghost': 'Keep this track to compare',
  'stelE.action.capture': 'Save to notebook',
  'stelE.stage.cloud': 'before the track',
  'stelE.stage.remnant': 'after the track',
  'stelE.stage.cloudCaption':
    'An illustration. No temperature, no radius, no age — the model does not describe this.',
  'stelE.action.size': 'True size, or fit the box',
  'stelE.stage.fitCaption':
    'Enlarged {n} to fill the box. The size here means nothing; switch to true scale to see the star grow.',
  'stelE.row.phaseNote': 'About this phase',
  'stelE.phaseNote.pre-main-sequence':
    'It is shining before it is fusing anything. A contracting object radiates the gravitational energy it releases as it shrinks, and that is where this light comes from. Fusion starting is not the same event as arriving on the main sequence: deuterium burns earlier and briefly, and the main sequence begins only when hydrogen fusion in the core is steady enough to hold the star up on its own.',
  'stelE.phaseNote.main-sequence':
    'Not one fixed point. A star brightens and swells slowly across its main-sequence life as helium builds in its core — the line below says by how much this one has moved so far.',
  'stelE.phaseNote.red-giant-branch':
    'What ran out was hydrogen in the CORE, not hydrogen in the star. Most of it is still there, in the envelope, and a shell of it around the spent core is what the star is burning now — which is why it is far brighter than it was on the main sequence.',
  'stelE.phaseNote.post-agb-and-cooling':
    'The envelope has gone, expanding away as a planetary nebula — a name given before anyone knew what these were, and nothing to do with planets. It is ordinary gas, lit by the exposed core, and it disperses long before the core has finished cooling. Nothing here models when it becomes visible or for how long.',
  'stelE.row.drift': 'Moved so far',
  'stelE.value.drift':
    '{lum} the luminosity it had on arrival, and {teff} in surface temperature.',
  'stelE.row.sizeMode': 'The picture',
  'stelE.value.sizeTrue':
    'One scale for the whole life, set by the largest this star ever gets ({peak}). That is why it is a speck for most of it.',
  'stelE.value.sizeFit':
    'Each moment enlarged to fill the box, so the colour and the phase stay legible. Sizes are NOT comparable between moments in this mode.',
  'stelE.stage.caption':
    'One scale for the whole life: {frac} of the {peak} it reaches at its largest.',
  'stelE.stage.tinyCaption':
    'Drawn as a marker: at the scale this star reaches later ({peak}), it is under a pixel now.',
  'stelE.row.star': 'The star',
  'stelE.value.star': 'A {m} M☉ model, followed from before it was a star',
  'stelE.row.stage': 'Stage',
  'stelE.value.cloud':
    'A collapsing cloud, drawn as an illustration. The bundled tracks begin at an object that already has a photosphere, so nothing before that point is modelled here.',
  'stelE.row.noNumbers': 'Why there are no numbers',
  'stelE.value.noNumbers':
    'Putting a cloud at a precise temperature and luminosity would be inventing them. The quantitative track begins when the model has a photosphere to report, and the readout fills in there.',
  'stelE.row.age': 'Age',
  'stelE.row.phase': 'Phase',
  'stelE.row.teff': 'Surface temperature',
  'stelE.row.luminosity': 'Luminosity',
  'stelE.row.radius': 'Radius',
  'stelE.row.mass': 'Mass',
  'stelE.value.mass': '{now} now, {born} at birth — {lost} lost to its wind',
  'stelE.row.spectral': 'Spectral type',
  'stelE.row.pace': 'The playhead',
  'stelE.value.paceTime':
    'Paced by time, logarithmically. How far it has travelled is how far through the life it is — so nearly all of it is the main sequence.',
  'stelE.value.pacePhase':
    'Paced by the track’s own samples, so every phase is reachable. It is NOT a clock: equal moves are not equal times, and the line below says by how much.',
  'stelE.row.thisPhase': 'This phase',
  'stelE.value.thisPhase':
    'Really lasts {real} — {life} of the star’s life — and gets {share} of the playback.',
  'stelE.row.interior': 'The interior',
  'stelE.value.interior':
    'A schematic of which process is releasing the energy. The bundled tracks are surface quantities and carry no radial structure at all, so the sizes of these shells are chosen to be legible and mean nothing.',
  'stelE.row.ghost': 'Compared with',
  'stelE.value.ghost':
    'The {m} M☉ track, dashed. It has no playhead of its own.',
  'stelE.row.endsAs': 'Ends as',
  'stelE.remnant.white-dwarf': 'a white dwarf',
  'stelE.remnant.neutron-star': 'a neutron star',
  'stelE.remnant.black-hole': 'a black hole',
  'stelE.remnant.uncertain': 'a neutron star or a black hole',
  'stelE.remnant.unfinished': 'nothing yet — the model stops first',
  'stelE.remnant.white-dwarf.caption':
    'The exposed core, cooling. It has a photosphere, so it keeps its place on the diagram.',
  'stelE.remnant.neutron-star.caption':
    'About 20 km across. No photosphere in the ordinary sense, so it is not plotted on the diagram.',
  'stelE.remnant.black-hole.caption':
    'No surface and no temperature to plot. The track ends and this card takes over.',
  'stelE.remnant.uncertain.caption':
    'Which one depends on the explosion model. Both are shown as possible because the sources are.',
  'stelE.remnant.unfinished.caption':
    'The track stops while the star is still fusing hydrogen. There is no endpoint to show.',
  'stelE.row.howKnown': 'How this is known',
  'stelE.value.fromTrack':
    'From the track itself: MIST followed this star all the way to a cooling white dwarf, so the mass and the position are model outputs and not a separate prescription.',
  'stelE.value.fromPrescription':
    'Not from the track. It stops at {phase} with {mass} left, and what follows is a published result quoted for a star of this mass: {cite}. Nothing here computed it.',
  'stelE.row.remnantMass': 'What is left',
  'stelE.value.remnantRange': '{m}, with the sources spanning {lo} to {hi} M☉',
  'stelE.value.remnantUnknown':
    'Somewhere between {lo} and {hi} M☉, depending on whether the star explodes at all',
  'stelE.row.supernova': 'A visible supernova?',
  'stelE.supernova.expected':
    'Expected. This is the mass range that explodes most reliably.',
  'stelE.supernova.uncertain':
    'Model-dependent. Some engines explode a star of this mass and some do not.',
  'stelE.supernova.unlikely':
    'Probably not. At this mass the likeliest route to a black hole is a failed explosion — the envelope is not expelled, it falls in. A black hole does not require a bright supernova.',
  'stelE.supernova.none': 'No. Nothing here explodes.',
  'stelE.row.offDiagram': 'Why the track stops',
  'stelE.value.offDiagram':
    'This remnant has no photosphere, so it has no temperature or luminosity to plot. The line on the diagram ends where the model ends rather than being continued to an invented point.',
  'stelE.row.transient': 'The explosion drawn here',
  'stelE.value.transient':
    'An illustration of an event, not a calculation of one, and it is kept off the diagram on purpose: a supernova’s brightness is a transient lasting weeks and is not the star’s photospheric track. How long it takes on screen has no relation to how long the explosion lasts, how long it stays visible, or how long the ejecta take to disperse.',
  'stelE.row.returned': 'Returned to space',
  'stelE.value.returned':
    '{mass} by the end of the track. Whatever an explosion adds to that is not in the model and is not counted here.',
  'stelE.row.endNote': 'In more detail',
  'stelW.lab.title': 'Stellar Lab',
  'stelW.lab.note':
    'Eight modelled stars on a Hertzsprung–Russell diagram, and a cursor you can put anywhere. Temperature increases to the left — that is a historical accident and it catches everybody once.',
  'stelW.panel.hr': 'temperature and luminosity',
  'stelW.panel.preview': 'this star',
  'stelW.panel.compare': 'pinned stars',
  'stelW.panel.population': 'a synthetic sample',
  'stelW.panel.counts': 'how many of each, all and bright',
  'stelW.axis.hotter': '← hotter',
  'stelW.axis.cooler': 'cooler →',
  'stelW.axis.luminosity': 'luminosity, L☉',
  'stelW.control.track': 'Modelled star',
  'stelW.control.age': 'Age along the track',
  'stelW.control.teff': 'Temperature',
  'stelW.control.lum': 'Luminosity',
  'stelW.control.order': 'Order by',
  'stelW.control.size': 'Sizes',
  'stelW.control.sun': 'Show the Sun',
  'stelW.control.view': 'Showing',
  'stelW.control.threshold': 'Brightness cut',
  'stelW.preset.mass': '{m} M☉',
  'stelW.preset.note.m020':
    'A small red dwarf. Modelled to the end of core hydrogen burning, which the model puts at 1.1 trillion years — a prediction about a star far younger than its own lifetime.',
  'stelW.preset.note.m050':
    'Half a solar mass. Also modelled only to the end of core hydrogen burning, at 96 billion years.',
  'stelW.preset.note.m100':
    'A solar-mass star, all the way to a cooling white dwarf. Ten billion years on the main sequence and about a billion and a half after it.',
  'stelW.preset.note.m200':
    'Twice the Sun. A tenth of the main-sequence lifetime, and it leaves a heavier white dwarf.',
  'stelW.preset.note.m500':
    'Five solar masses. A hundred million years on the main sequence, and a 0.89 solar-mass white dwarf at the end.',
  'stelW.preset.note.m1000':
    'Ten solar masses. The model stops at carbon ignition, with the star a red supergiant of 609 solar radii and nearly six-tenths of a solar mass already lost to its wind.',
  'stelW.preset.note.m2000':
    'Twenty solar masses. Nine million years, six solar masses lost, and the model stops before core collapse with the star 1,070 solar radii across.',
  'stelW.action.mode': 'Switch mode',
  'stelW.action.guides': 'Constant-radius lines',
  'stelW.action.regions': 'Regions',
  'stelW.action.pin': 'Pin this star',
  'stelW.action.unpin': 'Unpin the last',
  'stelW.action.clear': 'Clear all',
  'stelW.action.adopt': 'Use the nearest model',
  'stelW.action.capture': 'Save to notebook',
  'stelW.mode.model': 'A modelled star',
  'stelW.mode.free': 'A point you chose',
  'stelW.row.mode': 'Mode',
  'stelW.row.teff': 'Surface temperature',
  'stelW.row.luminosity': 'Luminosity',
  'stelW.row.radius': 'Radius',
  'stelW.value.radius':
    '{r} — from the temperature and the luminosity, exactly',
  'stelW.row.spectral': 'Spectral type',
  'stelW.row.class': 'Size class',
  'stelW.row.mass': 'Mass',
  'stelW.value.mass': '{now} now, {born} at birth',
  'stelW.row.age': 'Age',
  'stelW.row.phase': 'Phase',
  'stelW.action.pace': 'Change what the age slider paces',
  'stelW.row.pace': 'The age slider',
  'stelW.value.paceTime':
    'Paced by time, logarithmically. How far the handle has moved is how far through the star’s life it is — so almost all of its travel is the main sequence, and everything after it is squeezed into the last sliver.',
  'stelW.value.pacePhase':
    'Paced by the track’s own samples, so every phase is reachable. The handle is NOT a clock here: equal moves are not equal times. The age beside it is the real one.',
  'stelW.row.mainSequence': 'Main sequence',
  'stelW.value.mainSequence': '{total} in total, {left} still to come',
  'stelW.value.none': 'none',
  'stelW.row.trackEnds': 'The model stops',
  'stelW.value.trackEnds': 'at {age}, because {why}',
  'stelW.ends.tams':
    'the star reaches the end of core hydrogen burning and MESA stopped following it',
  'stelW.ends.carbon-burning':
    'carbon ignites, and what happens after that is not in this model',
  'stelW.ends.wd-cooling': 'the star has become a cooling white dwarf',
  'stelW.row.hypothetical': 'What this is',
  'stelW.value.hypothetical':
    'A temperature and a luminosity you chose, and the radius they imply. Not a mass, an age or a lifetime: a point on this diagram does not fix any of those, and the same point can be several completely different stars.',
  'stelW.row.nearby': 'Models near here',
  'stelW.value.nearbyOne': 'One model passes close: {list}',
  'stelW.value.nearbyMany':
    '{n} models pass close, and they are not the same object: {list}{more}. Nothing here can tell you which — that is what "a point does not fix a mass" means.',
  'stelW.value.nearbyMore': ', and {n} more',
  'stelW.value.nearbyItem': '{m} M☉, {phase}, at {age}',
  'stelW.value.nearbyNone':
    'No bundled model passes near this point. That does not mean no star could be here.',
  'stelW.row.outside': 'Off the plot',
  'stelW.value.outside':
    'This point is outside the range drawn. The numbers still hold; the marker is at the edge.',
  'stelW.row.pinned': 'Pinned',
  'stelW.value.pinned': '{n} of {max}',
  'stelW.row.guides': 'Constant-radius lines',
  'stelW.value.guides':
    'Straight on these axes, because log L = 2 log R + 4 log T. That is why the diagram separates giants from dwarfs at all.',
  'stelW.row.regions': 'Regions',
  'stelW.value.regions':
    'Approximate, and shaded rather than outlined on purpose. A star is not a giant because it crossed a line; the region is a summary of where large stars end up.',
  'stelW.preview.exposure': 'colour is the star’s; brightness on screen is not',
  'stelW.compare.title': 'Comparing stars',
  'stelW.compare.note':
    'Up to four pinned stars, drawn either on one common scale or each enlarged to fill its own box. The two are not the same picture and the caption says which you are looking at.',
  'stelW.compare.empty': 'Nothing pinned yet. Pin a star in the lab above.',
  'stelW.compare.anonymous': 'star {n}',
  'stelW.value.anonymous':
    'Withheld for this step — all {n} of them. You are being asked to judge by eye first.',
  'stelW.compare.sun': 'the Sun',
  'stelW.compare.magnified': 'enlarged {n}',
  'stelW.compare.subPixelShort': 'under 1 px',
  'stelW.row.subPixel': 'The smallest',
  'stelW.row.withheld': 'The numbers',
  'stelW.compare.subPixel': 'smaller than a pixel here',
  'stelW.compare.trueNote':
    'One scale for every star. Something drawn as a marker is genuinely too small to see beside the others.',
  'stelW.compare.fitNote':
    'Each star enlarged to fill its box. Apparent sizes here are NOT comparable — the magnification is printed under each one.',
  'stelW.order.radiusSun': 'radius',
  'stelW.order.teffK': 'temperature',
  'stelW.order.luminositySun': 'luminosity',
  'stelW.order.massSun': 'mass',
  'stelW.size.true': 'true relative',
  'stelW.size.fit': 'fit each',
  'stelW.size.true.long': 'True relative sizes, one common scale',
  'stelW.size.fit.long':
    'Each star fitted to its own box; sizes not comparable',
  'stelW.on': 'yes',
  'stelW.off': 'no',
  'stelW.row.orderedBy': 'Ordered by',
  'stelW.row.sizeMode': 'Sizes',
  'stelW.row.star': 'Star {n}',
  'stelW.value.star': '{teff}, {lum}, {radius}, {mass} — {ratio} the smallest',
  'stelW.value.unknownMass': 'mass unknown',
  'stelW.orbit.mercury': 'Mercury’s orbit',
  'stelW.orbit.earth': 'Earth’s orbit',
  'stelW.orbit.mars': 'Mars’s orbit',
  'stelW.orbit.jupiter': 'Jupiter’s orbit',
  'stelW.pop.title': 'A synthetic population',
  'stelW.pop.note':
    'A few hundred model stars drawn from a stated mass distribution and a stated star-formation history. Not a survey, not observed, and no star in it is a real star.',
  'stelW.pop.row.synthetic': 'What this is',
  'stelW.pop.value.synthetic':
    'A sample of a model, generated from a seed. Every star sits on the same bundled tracks the lab uses.',
  'stelW.pop.row.sample': 'The sample',
  'stelW.pop.value.sample':
    '{n} stars placed from {requested} drawn. {evolved} had already left the main sequence and were dropped rather than guessed at. Seed {seed}.',
  'stelW.pop.row.imf': 'Masses drawn from',
  'stelW.pop.value.imf':
    '{ref}, over 0.2 to 20 solar masses, with a constant star-formation rate over the last ten billion years.',
  'stelW.pop.row.threshold': 'The bright subset',
  'stelW.pop.value.threshold':
    'Every star placed at {d} pc; keeping those above {f} in relative flux leaves {kept} of {total}.',
  'stelW.pop.row.type': 'Type {type}',
  'stelW.pop.value.type':
    '{all} in the sample ({allPct}%), {bright} in the bright subset ({brightPct}%)',
  'stelW.pop.row.limits': 'What it leaves out',
  'stelW.pop.value.limits':
    'Stars that have left the main sequence, interstellar dust, binaries, and any composition but solar. All four matter for a real survey and none of them is here.',
  // The Stellar Lab's evidence
  'nb.source.stellar-lab': 'Stellar Lab',
  'nb.stellar.title.comparison': '{n} stars compared',
  'nb.stellar.title.model': 'A modelled star',
  'nb.stellar.title.point': 'A point on the H–R diagram',
  'nb.stellar.teff': 'Effective temperature',
  'nb.stellar.luminosity': 'Bolometric luminosity',
  'nb.stellar.radius': 'Photospheric radius',
  'nb.stellar.radiusNote':
    'derived from the temperature and the luminosity by the Stefan-Boltzmann relation, which is exact',
  'nb.stellar.mass': 'Current mass',
  'nb.stellar.initialMass': 'Initial mass',
  'nb.stellar.age': 'Age',
  'nb.stellar.mainSequence': 'Total main-sequence lifetime',
  'nb.stellar.pinnedRadius': 'Pinned star {n}: radius',
  'nb.stellar.pinnedTeff': 'Pinned star {n}: temperature',
  'nb.stellar.limit.model':
    'A model, not an observation: {grid}. No rotation, no binarity, no magnetic fields, and one composition.',
  'nb.stellar.limit.incomplete':
    'The track does not run to the end of the star’s life: {why}.',
  'nb.stellar.limit.hypothetical':
    'This is a temperature and a luminosity somebody chose, and the radius they imply. It has no mass, no age and no lifetime, because a point on this diagram does not determine any of them.',
  'nb.stellar.limit.ambiguous':
    '{n} bundled models pass close to this point and they are not the same object. Nothing in this reading identifies which, if any, it is.',
  'nb.stellar.limit.stage.cloud':
    'Taken before the track begins. The collapsing cloud is an illustration with no modelled temperature, radius or age.',
  'nb.stellar.limit.stage.remnant':
    'Taken after the track ends. What the star became is described below rather than computed here.',
  'nb.stellar.limit.endpointQuoted':
    'The endpoint is not from the track. It is a published result quoted for a star of this mass: {cite}. Nothing in Gravitas computed it.',
  'nb.stellar.limit.fitted':
    'The comparison was drawn with each star fitted to its own box, so the apparent sizes in it are not comparable.',
};
