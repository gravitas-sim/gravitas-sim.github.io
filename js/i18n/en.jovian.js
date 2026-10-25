// =============================================================================
// The Jupiter-moons instruments' words, in English
// -----------------------------------------------------------------------------
// Registered by js/jovianWidgets.js when the family loads, so no other page
// carries them. jovW.* ids. The same keys are in es.jovian.js.
// =============================================================================

export const EN_JOVIAN = {
  'jovW.waiting': 'Loading the moons’ positions',
  'jovW.failed': 'The moons’ positions could not be loaded',
  'jovW.moon.io': 'Io',
  'jovW.moon.europa': 'Europa',
  'jovW.moon.ganymede': 'Ganymede',
  'jovW.moon.callisto': 'Callisto',
  'jovW.moon.all': 'all four',
  'jovW.row.how': 'What is left out',
  'jovW.f.title': 'The moons night by night',
  'jovW.f.note':
    'A synthetic sequence of Jupiter and its four moons: each frame is made from the moons’ ephemeris with seeing and detector noise, east to the right, Jupiter’s projected pole up. Turn the overlay on to see where the ephemeris puts each moon, and read each moon’s distance from Jupiter’s center in Jupiter radii.',
  'jovW.f.control.frame': 'Frame',
  'jovW.f.control.overlay': 'Ephemeris overlay (0 off, 1 on)',
  'jovW.f.legend': 'I Io · E Europa · G Ganymede · C Callisto',
  'jovW.f.row.when': 'Time (UT)',
  'jovW.f.row.kind': 'How it was taken',
  'jovW.f.value.hourly': 'one of the hourly frames of a long night',
  'jovW.f.value.nightly': 'the once-a-night frame',
  'jovW.f.row.scale': 'Scale',
  'jovW.f.value.scale':
    '{px} pixels to one Jupiter radius (3 arcseconds a pixel)',
  'jovW.f.row.moon': '{moon}: east of Jupiter',
  'jovW.f.value.moon':
    '{x} Jupiter radii ({side}); the ephemeris puts it at {pred}',
  'jovW.f.value.east': 'east',
  'jovW.f.value.west': 'west',
  'jovW.f.value.hidden':
    'not measured: on the disk or blended with another moon (the ephemeris puts it at {pred})',
  'jovW.f.row.frames': 'Frames in the sequence',
  'jovW.f.value.frames':
    '{n}: {hourly} hourly over three nights, {nightly} once a night',
  'jovW.f.value.how':
    'These frames are synthetic, made for this investigation from JPL Horizons positions (JUP365): no picture of Jupiter was observed. The positions are read from each frame’s brightest pixels, near where the overlay predicts them, not typed in.',
  'jovW.p.title': 'A sinusoid for one moon',
  'jovW.p.note':
    'The measured distance of one moon east of Jupiter against time, with the sinusoid that fits best. Moon: 1 Io, 2 Europa, 3 Ganymede, 4 Callisto. Sampling: 0 once a night, 1 the designed sequence with three hourly nights.',
  'jovW.p.control.moon': 'Moon (1 to 4)',
  'jovW.p.control.cadence': 'Sampling (0 or 1)',
  'jovW.p.legend': 'measured · fitted sinusoid · days from the first frame',
  'jovW.p.row.marks': 'Measured points used',
  'jovW.p.row.period': 'Period',
  'jovW.p.row.amplitude': 'Amplitude (the orbit’s radius)',
  'jovW.p.row.amplitudeKm': 'Amplitude in kilometers',
  'jovW.p.row.fit': 'Chi-square, degrees of freedom',
  'jovW.p.row.nyquist':
    'The sampling interval, and the shortest period it can tell apart',
  'jovW.p.value.nyquist':
    'a frame every {dt} days: no period shorter than {p} days can be told from a longer one',
  'jovW.p.value.nyquistDesigned': 'hourly on three nights, then nightly',
  'jovW.p.row.alias': 'Other periods the points fit as well',
  'jovW.p.value.alias': '{p} days (chi-square {d} higher)',
  'jovW.p.value.noAlias': 'none within a chi-square of 9',
  'jovW.p.row.aliasTable':
    'Periods a once-a-night sampling cannot tell from the true one',
  'jovW.p.value.aliasTable': '{p} days',
  'jovW.p.row.search': 'Periods searched',
  'jovW.p.value.searchNightly':
    'longer than 2 days, as an observer sampling once a night would',
  'jovW.p.value.searchDesigned': 'longer than 0.3 days',
  'jovW.p.value.refused': 'Not constrained: {why}',
  'jovW.p.value.how':
    'The period is the one the Earth sees (the Earth and Jupiter move), within 0.4 percent of the moon’s orbital period; the uncertainty includes the model’s misfit, not only the noise; each point is read with an assumed 0.03 Jupiter radii.',
  'jovW.w.title': 'Weighing Jupiter',
  'jovW.w.note':
    'Kepler’s third law on the fitted period and orbit radius of a moon gives Jupiter’s GM (its mass times the gravitational constant). Moon: 0 all four, 1 Io, 2 Europa, 3 Ganymede, 4 Callisto. Correct: 1 corrects the period for the Earth’s motion, 0 does not.',
  'jovW.w.control.moon': 'Moon (0 to 4)',
  'jovW.w.control.correct': 'Correct (0 or 1)',
  'jovW.w.legend': 'GM from each moon · reference · km³/s²',
  'jovW.w.row.period': 'Period used',
  'jovW.w.row.a': 'Orbit radius',
  'jovW.w.row.gm': 'Jupiter’s GM',
  'jovW.w.row.mass': 'Jupiter’s mass',
  'jovW.w.row.ref': 'The planet’s GM in JPL’s tables',
  'jovW.w.row.ratio': 'Measured over reference',
  'jovW.w.row.rate': 'The sky frame turns by',
  'jovW.w.value.rate':
    '{rate} degrees a day (the Earth’s and Jupiter’s motion)',
  'jovW.w.row.moonValue': '{moon}',
  'jovW.w.row.mean': 'Weighted mean of the four',
  'jovW.w.row.consistency': 'Do the four agree?',
  'jovW.w.value.consistent':
    'yes: chi-square {chi2} for {dof} degrees of freedom, p = {p}',
  'jovW.w.value.inconsistent':
    'no: chi-square {chi2} for {dof} degrees of freedom, p = {p}',
  'jovW.w.value.how':
    'Jupiter is not a point: its bulge raises a moon’s apparent GM by about 0.06 percent for Io and 0.003 percent for Callisto, and a moon’s own mass adds less than 0.01 percent. Neither is removed; the reference is the planet alone.',
};
