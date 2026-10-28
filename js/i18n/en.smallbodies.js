// =============================================================================
// The small-body instruments' words, in English
// -----------------------------------------------------------------------------
// Registered by js/smallBodiesWidgets.js when the family loads, so no other page
// carries them. sbW.* ids. The same keys are in es.smallbodies.js.
// =============================================================================

export const EN_SMALLBODIES = {
  'sbW.row.source': 'What this is',
  'sbW.row.how': 'What is left out',
  'sbW.loading': 'Loading the data this instrument needs',
  'sbW.failed': 'The catalog could not be loaded',
  'sbW.refused': 'Not constrained',
  'sbW.on': 'on',
  'sbW.off': 'off',
  'sbW.b.title': 'The gaps in the belt',
  'sbW.b.note':
    'The semi-major axes of 8,886 numbered minor planets with H below 13, a real catalog from the JPL Small-Body Database. A smooth curve is fitted outside the resonance windows; a gap is how far the count inside a window falls below it.',
  'sbW.b.legend': 'objects per 0.01 AU · baseline · resonance windows',
  'sbW.b.refused': 'The windows or the fit were refused',
  'sbW.b.axis': 'semi-major axis a (AU)',
  'sbW.b.control.gap': 'Resonance window',
  'sbW.b.control.hlimit': 'Brighter than (H limit)',
  'sbW.b.control.width': 'Window width',
  'sbW.b.control.degree': 'Baseline polynomial degree',
  'sbW.b.control.classes': 'Show orbit-class counts',
  'sbW.b.control.survey': 'Show what a survey keeps',
  'sbW.b.gapName': '{id} at {a} AU',
  'sbW.b.hName': 'H below {h}',
  'sbW.b.preset.default': 'The 3:1 gap, whole catalog',
  'sbW.b.preset.five': 'The 5:2 gap',
  'sbW.b.value.source':
    'A real catalog: {n} numbered minor planets with absolute magnitude H below 13 from the JPL Small-Body Database (retrieved {date}; credit JPL, not endorsed)',
  'sbW.b.row.cut': 'What the cut is',
  'sbW.b.value.cut':
    'The objects that were found and numbered, not the objects there are. The cut keeps the large bodies, below the discovery completeness limit of the main belt, and says nothing about small bodies. The outer belt and the Trojans are less complete than the inner belt at the same H.',
  'sbW.b.value.refused':
    'The kernel refused this request (code {code}); change the window width or the H limit',
  'sbW.b.row.used': 'Objects used',
  'sbW.b.value.used':
    '{n} objects with H below {h} and a between {lo} and {hi} AU',
  'sbW.b.row.window': 'Window',
  'sbW.b.value.window': '{id}, a = {a} AU ± {half} AU',
  'sbW.b.row.found': 'Found, and expected from the baseline',
  'sbW.b.value.found': '{found} found, {expected} expected',
  'sbW.b.row.depletion': 'Depletion against the baseline',
  'sbW.b.value.depletion':
    '{d} percent, 95 percent interval {lo} to {hi} percent (a bootstrap of the catalog rows)',
  'sbW.b.row.verdict': 'Verdict',
  'sbW.verdict.resolved':
    'resolved: the interval is above zero and no warning applies',
  'sbW.verdict.not': 'not resolved: {why}',
  'sbW.reason.too-few-expected':
    'the baseline expects too few objects in the window',
  'sbW.reason.steep-baseline':
    'the baseline changes too steeply across the window',
  'sbW.reason.uneven-flanks':
    'the two sides of the window differ too much for a smooth baseline',
  'sbW.reason.interval-includes-zero': 'the interval includes zero',
  'sbW.reason.unknown': 'the interval could not be made',
  'sbW.b.row.warnings': 'Warnings',
  'sbW.warn.steep-baseline': 'the baseline is steep here',
  'sbW.warn.uneven-flanks': 'the flanks are uneven',
  'sbW.warn.edge': 'the window is near the edge of the range',
  'sbW.short.resolved': 'resolved',
  'sbW.short.not': 'not resolved',
  'sbW.b.row.other': 'The {id} window',
  'sbW.b.value.other': 'depletion {d} percent, {verdict}',
  'sbW.b.row.baseline': 'Baseline',
  'sbW.b.value.baseline':
    'A degree-{degree} polynomial in the logarithm of the count (a Poisson fit) over {bins} bins outside every window; {draws} bootstrap draws',
  'sbW.b.row.classes': 'Orbit classes',
  'sbW.b.value.classes':
    'Main belt, inner {inner}, middle {middle}, outer {outer}; Hildas {hilda}; Jupiter Trojans {trojan} (counts of what the catalog holds, not of what exists)',
  'sbW.b.row.surveyRatio': 'A magnitude-limited survey',
  'sbW.b.value.surveyRatio':
    'At one limiting magnitude a body at {inner} AU is found {ratio} times as completely as one at {outer} AU (a slope of 0.5, opposition magnitudes)',
  'sbW.b.row.surveyMean': 'The mean of what is found',
  'sbW.b.value.surveyMean':
    'A belt uniform in a would show a mean of {mean} AU in such a survey, against a true {truth} AU',
  'sbW.b.value.how':
    'The interval is sampling error only, and the baseline’s shape adds a systematic of about one standard error on test belts. A different window, degree or H limit is a different measurement. A depletion is what this catalog shows, not the share Jupiter cleared.',
  'sbW.s.title': 'How fast does it spin?',
  'sbW.s.note':
    'A synthetic light curve of a rotating ellipsoid, made with a seeded noise stream. Choose the nights, hours and noise, read the period from the peak and the amplitude from the fold, and ask for the truth only after you have answered.',
  'sbW.s.legend': 'data · periodogram · fold at the rotation period',
  'sbW.s.legendTruth': 'SYNTHETIC · the truth is shown below',
  'sbW.s.axis.time': 'time (days) · brightness',
  'sbW.s.axis.period': 'rotation period (hours, log scale)',
  'sbW.s.axis.phase': 'rotation phase, two turns',
  'sbW.s.control.target': 'Target',
  'sbW.s.control.nights': 'Nights',
  'sbW.s.control.hours': 'Hours a night',
  'sbW.s.control.noise': 'Noise',
  'sbW.s.control.cadence': 'Sampling',
  'sbW.s.control.truth': 'Show the truth',
  'sbW.s.targetName': 'Target {id}',
  'sbW.s.cadence.dense': 'dense nights (40 points)',
  'sbW.s.cadence.once': 'one point a night, 40 nights',
  'sbW.s.preset.default': 'Target A, five dense nights',
  'sbW.s.preset.once': 'Target A, one point a night',
  'sbW.s.value.source':
    'Synthetic: a triaxial ellipsoid turning about its short axis, seen at one aspect, with geometric scattering at zero phase angle and seeded Gaussian noise. Not the light of a real asteroid; the truth is withheld until you ask',
  'sbW.s.row.data': 'Observations',
  'sbW.s.value.data':
    '{n} points over {nights} nights of {hours} hours, noise {noise} mag',
  'sbW.s.value.dataOnce':
    '{n} points, one a night for {nights} nights at slightly different times, noise {noise} mag',
  'sbW.s.value.refused':
    'The kernel refused this series (code {code}); use more points or nights',
  'sbW.s.row.peak': 'Strongest peak of the periodogram',
  'sbW.s.value.peak':
    'a light period of {p} h, power {power}, false-alarm probability {fap}',
  'sbW.s.value.tiny': 'below 0.001',
  'sbW.s.row.verdict': 'Verdict',
  'sbW.s.value.notPeriodic':
    'not periodic: the strongest peak could be noise, so no period is given',
  'sbW.s.row.period': 'Rotation period (two maxima a rotation)',
  'sbW.s.value.period':
    '{p} h ± {s} h (a bootstrap of the points: a floor on the error)',
  'sbW.s.value.single': 'one period stands out',
  'sbW.s.value.ambiguous':
    'ambiguous: a second peak is nearly as strong, so the sampling cannot tell the periods apart',
  'sbW.s.row.candidates': 'The competing periods',
  'sbW.s.value.candidates': '{p1} h or {p2} h',
  'sbW.s.row.alternative': 'If there is one maximum a rotation',
  'sbW.s.value.alternative':
    '{p} h instead (an albedo marking or a shape far from an ellipsoid would give one maximum)',
  'sbW.s.row.amplitude': 'Amplitude (peak to peak)',
  'sbW.s.value.amplitude': '{a} mag, 95 percent interval {lo} to {hi} mag',
  'sbW.s.value.withheld.phase-gap':
    'withheld: a gap of {gap} of the rotation was never observed, so the fitted curve there is a guess',
  'sbW.s.value.withheld.ill-conditioned':
    'withheld: the fitted curve swings by more than a physical amplitude',
  'sbW.s.row.bound': 'The axis ratio a/b',
  'sbW.s.value.bound':
    'a/b is at least {b} (at the fitted amplitude {est}): a lower bound, equal to a/b only if seen equator-on',
  'sbW.s.row.truth': 'The truth (synthetic)',
  'sbW.s.value.truth':
    'rotation period {p} h, a/b = {ab}, b/c = {bc}, aspect {th} degrees, amplitude {amp} mag',
  'sbW.s.value.how':
    'Left out: phase angle (it changes amplitude and shape), albedo markings, shapes far from an ellipsoid and tumbling. The period assumes two maxima a rotation; the amplitude gives a lower bound on a/b and says nothing of b/c; the errors are floors.',
};
