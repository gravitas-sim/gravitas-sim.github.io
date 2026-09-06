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
};
