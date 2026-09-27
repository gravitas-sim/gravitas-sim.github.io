// =============================================================================
// Stars and their populations: the guided investigations in English
// -----------------------------------------------------------------------------
// js/observatory/guides/populations.js loads these with the suite, so the
// runner carries none of them. A step's words are gd.<guide>.<step>.{title,
// text}, with .ok and .no for a step that is checked and .opt.<option> for
// each choice (the ids are in js/observatory/guides/populations.js).
// Paragraphs are separated by a blank line. {value} in an .ok message is the
// number the check found, or the one typed.
// =============================================================================

export const EN_POPULATIONS = {
  'gd.suite.populations.intro':
    'Five guides with real observations: four SDSS spectra, SDSS photometry and SEGUE spectroscopy of the open cluster NGC 2420, MIST’s model isochrones, and a TESS light curve of an RR Lyrae star. They go from what a spectrum says, through a cluster’s color–magnitude diagram and who belongs to it, to ages from models and a star that varies. Every number a step checks comes from the data or from a cited source it names; the isochrones are a model, and are compared with the stars, never mistaken for them.',
  'gd.target.sdss-a': 'the A star’s spectrum (SDSS)',
  'gd.target.sdss-g': 'the G star’s spectrum (SDSS)',
  'gd.target.sdss-k': 'the K star’s spectrum (SDSS)',
  'gd.target.sdss-m': 'the M star’s spectrum (SDSS)',
  'gd.target.photometry': 'NGC 2420’s photometry (SDSS)',
  'gd.target.segue': 'NGC 2420’s spectroscopic parameters (SEGUE)',
  'gd.target.isochrones': 'MIST’s isochrones in SDSS g and r (a model)',
  'gd.target.su-dra': 'SU Draconis’s light curve (TESS)',
  'gd.target.hd209458-lc': 'HD 209458’s light curve (TESS)',

  'gd.show.ew': '{value} ± {error} Å',
  'gd.show.pipelineStar': '{type}; {teff} K; log g {logg}; [Fe/H] {feh}',
  'gd.show.sunGravity': 'The Sun’s log g, for comparison',
  'gd.show.within': 'Stars in this table within {r} arcmin of the center',
  'gd.show.halfRadius': 'Half of the cluster’s members, by Gaia, lie within',
  'gd.show.halfRadiusValue': '{r} arcmin, of {n} members ({ref})',
  'gd.show.ring':
    '{n} stars from {lo} to {hi} arcmin: {density} per square arcminute',
  'gd.show.inner': 'Around the cluster',
  'gd.show.outer': 'Clear of the cluster',
  'gd.show.faintLimit': 'Counted to',
  'gd.show.leeRv': 'The cluster’s velocity, from SEGUE in 2008',
  'gd.show.leeRvValue':
    '{rv} km/s, a spread of {sd} km/s among {n} members ({ref})',
  'gd.show.window': 'Stars from {lo} to {hi} km/s',
  'gd.show.fehMembers': 'Your members’ median (SEGUE’s pipeline, DR18)',
  'gd.show.fehLee': 'SEGUE’s pipeline in 2008 (DR6)',
  'gd.show.fehHigh': 'High-resolution optical spectra',
  'gd.show.fehApogee': 'APOGEE’s infrared spectra',
  'gd.show.fit.mid': 'Your comparison at [Fe/H] {feh}',
  'gd.show.fit.solar': 'Your comparison at [Fe/H] {feh}',
  'gd.show.fit.map': 'At [Fe/H] {feh}, with the dust map’s reddening',
  'gd.show.fitValue': '{age} Gyr; m − M {dm}; E(g − r) {e}; statistic {s}',
  'gd.show.dustMap': 'The dust map toward NGC 2420',
  'gd.show.litGaia': '{age} Gyr; m − M {dm}; A_V {av}',
  'gd.show.litWebda': '{age} Gyr; m − M {dm}; E(B − V) {ebv}; [Fe/H] {feh}',
  'gd.show.halfRange':
    'Half the folded light curve’s range (1st to 99th percentile)',
  'gd.show.sineAmplitude': 'The period search’s sinusoid: its amplitude',
  'gd.show.meanV': 'SU Dra’s mean V magnitude',
  'gd.show.av': 'Its extinction in V, A_V',
  'gd.show.suFeh': 'Its [Fe/H]',
  'gd.show.relation': 'An RR Lyrae star’s absolute magnitude, adopted',
  'gd.show.mv': 'M_V for SU Dra, by that relation',
  'gd.show.parallax': 'SU Dra’s parallax, from the Hubble Space Telescope',
  'gd.show.parallaxDistance': 'The distance it gives, 1 / parallax',
  'gd.show.parallaxRange': '{d} pc (one standard error: {lo} to {hi} pc)',
  'gd.show.candleDistance': 'The distance as a standard candle',
  'gd.show.transitPeriod': 'HD 209458 b’s orbital period',
  'gd.show.foundPeriod': 'Your period search found',
  'gd.show.periodRatio': 'The orbital period over the one found',

  'gd.show.how.halpha':
    'Computed in this page for all four spectra, exactly as the line tool measures with its H-alpha preset: a straight continuum through the windows either side of the line, and the area the line takes out of it. The errors come from the scatter in the continuum windows: these spectra carry no error per sample.',
  'gd.show.how.pipeline':
    'Not measured here. SDSS’s pipeline compares each spectrum with the ELODIE library of stars whose parameters are known, and these are the catalogued type and parameters of the best match (SDSS DR18’s SpecObj table): a nearest template, no better than the library, which holds few metal-poor stars. The Sun’s gravity is from its nominal mass and radius.',
  'gd.show.how.core':
    'Counted in this page, from the center your distance column was made with (or the adopted one): this table’s stars within each radius. The half-member radius is Cantat-Gaudin et al.’s, from Gaia’s positions, proper motions and parallaxes, which do not suffer from SDSS’s crowding.',
  'gd.show.how.rings':
    'Counted in this page, from the center your distance column was made with: the stars brighter than g = 20 in a ring about the cluster and in a ring clear of it, each over its area. If the stars in front of the cluster and behind it are spread evenly, the outer ring’s density is theirs everywhere.',
  'gd.show.how.rv':
    'Published: Lee et al. (2008b) chose 130 members from SEGUE’s spectra of the cluster by color, velocity and metallicity together, and give their mean velocity and its spread.',
  'gd.show.how.neighbors':
    'Counted in this page, in the SEGUE table as it came: the stars in your window, and in a window of the same width on either side of it.',
  'gd.show.how.feh':
    'Your median is computed in this page from the members your crop kept. The others are published, each from its own stars, spectra and method.',
  'gd.show.how.fits':
    'Your own comparisons, as the measurement panel gave them. The statistic is the mean of each star’s squared distance from the shifted curve, in the tool’s scaled units, each capped: the smaller, the closer. It is not a probability.',
  'gd.show.how.dustMap':
    'Not measured here: the reddening of Schlegel, Finkbeiner & Davis’s (1998) dust map toward the cluster, as Lee et al. (2008b) quote it, made into E(g − r) with Schlafly & Finkbeiner’s (2011) coefficients. The map measures the dust along the whole line of sight; at NGC 2420’s height above the Galaxy’s plane, nearly all of it lies in front of the cluster.',
  'gd.show.how.literature':
    'Published values, each from its own data and models: Cantat-Gaudin et al. fitted Gaia’s photometry with PARSEC isochrones, a different model from MIST; the WEBDA values collect earlier studies.',
  'gd.show.how.shape':
    'Computed in this page from the light curve: half the spread between its 1st and 99th percentiles, beside the amplitude of the sinusoid your period search fitted.',
  'gd.show.how.candle':
    'Adopted, not measured here: SU Dra’s mean V magnitude, extinction and [Fe/H] from Benedict et al.’s (2011) Table 1, and their relation between an RR Lyrae star’s [Fe/H] and its absolute V magnitude. The light curve gives none of these; it says what kind of star this is.',
  'gd.show.how.parallax':
    'Adopted: the parallax Benedict et al. (2011) measured with the Hubble Space Telescope’s Fine Guidance Sensors.',
  'gd.show.how.harmonic':
    'The orbital period is Stassun et al.’s (2017); the other is your period search’s, on the TESS light curve.',

  // --- 1. What a spectrum says --------------------------------------------------

  'gd.pop-spectra.title': '1. What a spectrum says',
  'gd.pop-spectra.summary':
    'Hydrogen and a molecular band, temperature, and a star whose type does not say how luminous it is.',
  'gd.pop-spectra.intro.title': 'Four stars, four spectra',
  'gd.pop-spectra.intro.text':
    'A star’s spectrum is its light spread out by wavelength. The dark lines in it are light absorbed in the star’s atmosphere, and which lines are strong depends above all on how hot that atmosphere is. A spectral type, A, G, K or M, records that.\n\nYou will measure two features in four SDSS spectra, one star of each type, all observed in 2008: the hydrogen line H-alpha, and a band of titanium oxide molecules. Then you will meet a star its type does not describe.',
  'gd.pop-spectra.predict-lines.title': 'Predict: the strongest hydrogen line',
  'gd.pop-spectra.predict-lines.text':
    'H-alpha is absorbed by hydrogen atoms whose electron is already in the second energy level. In a cool atmosphere few are; in a very hot one most of the hydrogen is ionized. Which of the four stars will absorb the most H-alpha?',
  'gd.pop-spectra.predict-lines.opt.a': 'The A star',
  'gd.pop-spectra.predict-lines.opt.g': 'The G star, like the Sun',
  'gd.pop-spectra.predict-lines.opt.k': 'The K star',
  'gd.pop-spectra.predict-lines.opt.m': 'The M star',
  'gd.pop-spectra.open-a.title': 'Open the A star’s spectrum',
  'gd.pop-spectra.open-a.text':
    'Open the A star’s SDSS spectrum. Its details, beside the plot, say what was done to it before you see it: trimmed to the range all four share and averaged three samples to one, and nothing else.',
  'gd.pop-spectra.open-a.ok':
    'Open. Its wavelengths are in vacuum, as SDSS records them.',
  'gd.pop-spectra.halpha.title': 'Measure H-alpha',
  'gd.pop-spectra.halpha.text':
    'In the measurement panel, choose “Spectral line: continuum, equivalent width, center” and the H-alpha preset. It fills in the line’s window, a continuum window on either side at this star’s redshift, and the line’s rest wavelength. Measure.\n\nThe equivalent width is the width of a strip of continuum holding as much light as the line takes out: a line’s strength in Å, whatever the star’s brightness.',
  'gd.pop-spectra.halpha.ok':
    'An equivalent width of {value} Å. The result also gives the line’s center, and from it the star’s velocity along the line of sight.',
  'gd.pop-spectra.ew.title': 'How strong?',
  'gd.pop-spectra.ew.text':
    'What is the A star’s H-alpha equivalent width, in Å?',
  'gd.pop-spectra.ew.ok':
    '{value} Å: a strong line. The next step sets it beside the other three.',
  'gd.pop-spectra.ew.no':
    'That is not what your measurement gave: the equivalent width is the first quantity in its result.',
  'gd.pop-spectra.rank.title': 'The four side by side',
  'gd.pop-spectra.rank.text':
    'The panel measures H-alpha in all four spectra the same way. The line weakens from A to G to K to M. What sets that order, above all?',
  'gd.pop-spectra.rank.opt.temperature': 'How hot each star’s atmosphere is',
  'gd.pop-spectra.rank.opt.composition': 'How much hydrogen each star has',
  'gd.pop-spectra.rank.opt.distance': 'How far away each star is',
  'gd.pop-spectra.rank.ok':
    'Temperature. Stars of every type are mostly hydrogen; what changes is how many of its atoms are excited enough to absorb H-alpha. (The M star’s line is also partly filled in by light its chromosphere emits, as an M dwarf’s often is.)',
  'gd.pop-spectra.rank.no':
    'Not that. Stars are mostly hydrogen whatever their type, and an equivalent width is a ratio to the star’s own continuum, so its distance divides out. What else differs from star to star?',
  'gd.pop-spectra.open-m.title': 'Open the M star’s spectrum',
  'gd.pop-spectra.open-m.text':
    'Now open the M star’s spectrum. Beyond 7000 Å its continuum is broken into steps: bands of titanium oxide, molecules that survive only in a cool atmosphere.',
  'gd.pop-spectra.open-m.ok': 'Open.',
  'gd.pop-spectra.tio5.title': 'Measure a molecular band',
  'gd.pop-spectra.tio5.text':
    'A band has no continuum on both sides, so the line tool cannot measure it. In the measurement panel, choose “Band index on a spectrum (TiO5 and others)” and the TiO5 preset: the mean flux from 7126 to 7135 Å over the mean from 7042 to 7046 Å (Reid, Hawley & Gizis 1995). Its windows are air wavelengths, and the tool moves them to this spectrum’s vacuum ones. Measure.',
  'gd.pop-spectra.tio5.ok': 'A TiO5 index of {value}.',
  'gd.pop-spectra.tio5-value.title': 'How deep?',
  'gd.pop-spectra.tio5-value.text':
    'What is the M star’s TiO5 index? Near 1 means no band; the lower it is, the deeper the band.',
  'gd.pop-spectra.tio5-value.ok':
    '{value}: the band takes about a third of the light. The A, G and K stars’ TiO5 is between 0.94 and 0.98, hardly a band at all: measure one if you like.',
  'gd.pop-spectra.tio5-value.no':
    'That is not what your measurement gave: the index is the first quantity in its result.',
  'gd.pop-spectra.velocity.title': 'How fast?',
  'gd.pop-spectra.velocity.text':
    'The line tool compared H-alpha’s measured center with its rest wavelength, 6564.61 Å in vacuum. What velocity along the line of sight does that give the A star, in km/s? Negative is toward us.',
  'gd.pop-spectra.velocity.ok':
    '{value} km/s. The Sun and the stars around it circle the Galaxy together, and their velocities relative to one another are mostly a few tens of km/s. This star’s is several times that.',
  'gd.pop-spectra.velocity.no':
    'That is not what your measurement gave: the velocity is among the quantities in its result, with its uncertainty.',
  'gd.pop-spectra.gravity.title': 'A type is not a luminosity',
  'gd.pop-spectra.gravity.text':
    'The panel lists what SDSS’s pipeline found each star most like: the catalogued type, temperature, surface gravity (log g, in cgs units) and [Fe/H] of the best-matching star in a library of known stars. The G, K and M stars’ gravities are near the Sun’s: they are dwarfs, on the main sequence. The A star’s is ten times smaller, although the type of its match, A1V, calls it a dwarf too.\n\nAt a given mass, the gravity at a star’s surface falls as the square of its radius. What does the A star’s low gravity say?',
  'gd.pop-spectra.gravity.opt.dwarf':
    'It is a main-sequence A star, as its type says',
  'gd.pop-spectra.gravity.opt.larger':
    'It is larger, and so more luminous, than a main-sequence star of its temperature',
  'gd.pop-spectra.gravity.opt.cannot': 'Gravity says nothing about size',
  'gd.pop-spectra.gravity.ok':
    'Larger. A tenth of the gravity at a similar mass is about three times the radius, and at the same temperature about ten times the light. A type is read from how a spectrum looks, and gives the temperature; two stars of one type can differ in luminosity by more than two types do.',
  'gd.pop-spectra.gravity.no':
    'Look at the gravities again. A surface gravity is GM / R², so a star with a tenth of another’s gravity, and a similar mass, is about three times its size.',
  'gd.pop-spectra.halo.title': 'Where is it from?',
  'gd.pop-spectra.halo.text':
    'Put the A star’s numbers together: a low gravity, a metallicity about a fiftieth of the Sun’s ([Fe/H] −1.67, the pipeline’s), and a velocity of about 240 km/s toward us. Stars born in the Galaxy’s disk are richer in metals and move with its rotation. Where is this star from?',
  'gd.pop-spectra.halo.opt.disk': 'The Galaxy’s disk, like the Sun',
  'gd.pop-spectra.halo.opt.halo': 'The Galaxy’s halo: an old star',
  'gd.pop-spectra.halo.opt.cannot': 'Nothing can be said',
  'gd.pop-spectra.halo.ok':
    'The halo, most probably. Metal-poor, fast and of low gravity, it is what the halo’s old stars look like when they burn helium in their cores, on the horizontal branch, where a star of less than the Sun’s mass can be as hot as an A star. One star’s numbers make that likely, not certain.',
  'gd.pop-spectra.halo.no':
    'Its metallicity is a fiftieth of the Sun’s and its velocity several times a disk star’s: both point away from the disk.',
  'gd.pop-spectra.wrap.title': 'What a spectrum says',
  'gd.pop-spectra.wrap.text':
    'A spectrum’s lines give the temperature of a star’s atmosphere: hydrogen at its strongest in the A star, molecules only in the coolest. By themselves they do not say how luminous the star is: the A star here looks like a main-sequence star and has the gravity of a much larger one. Gravity, composition and motion come from finer measurements, and a pipeline’s values from the library it compares with.\n\nNext: a cluster, whose stars are all at one distance, so that their brightnesses can be compared.',

  // --- 2. A cluster's color-magnitude diagram -----------------------------------

  'gd.pop-cmd.title': '2. A cluster’s color–magnitude diagram',
  'gd.pop-cmd.summary':
    'NGC 2420 in SDSS’s photometry, and what the survey left out: the crowded core, the saturated giants, and the stars in front and behind.',
  'gd.pop-cmd.intro.title': 'A cluster at one distance',
  'gd.pop-cmd.intro.text':
    'NGC 2420 is an open cluster in Gemini, about 2.5 kiloparsecs away: a few hundred stars born together, at one distance and of one age. Plot their brightness against their color and the main sequence, its turnoff and the giants appear as in a Hertzsprung–Russell diagram, because a color is a temperature and, at one distance, a magnitude is a luminosity.\n\nYou will make that diagram from SDSS’s photometry of the field, and then find out what the survey could not measure.',
  'gd.pop-cmd.open.title': 'Open NGC 2420’s photometry',
  'gd.pop-cmd.open.text':
    'Open the photometry: every star SDSS measured cleanly within 14 arcminutes of the cluster’s center, with its g (green) and r (red) magnitudes and their errors. Its details list the reductions made to it; you will need them.',
  'gd.pop-cmd.open.ok':
    'Open. It opens as a map of the sky: RA across, Dec up.',
  'gd.pop-cmd.color.title': 'Make a color',
  'gd.pop-cmd.color.text':
    'A color is a difference of two magnitudes: g − r is larger for a redder, cooler star. In “Change what you are looking at”, make a new column from g, minus the column r, and add it. Then plot g up and your new column across. A magnitude axis runs bright at the top.',
  'gd.pop-cmd.color.ok':
    'Your color is a new column, its errors the two magnitudes’ in quadrature, and the change is in the list: the saved file records it.',
  'gd.pop-cmd.predict-core.title': 'Predict: the center',
  'gd.pop-cmd.predict-core.text':
    'On the sky, where will this table have the most stars per square arcminute?',
  'gd.pop-cmd.predict-core.opt.most':
    'At the center, where the cluster is densest',
  'gd.pop-cmd.predict-core.opt.even': 'The same everywhere',
  'gd.pop-cmd.predict-core.opt.fewest':
    'At the center, fewer than anywhere else',
  'gd.pop-cmd.radius.title': 'How far from the center?',
  'gd.pop-cmd.radius.text':
    'Make a second column: each star’s distance from the cluster’s center. Under “New column: distance from a position”, the position is filled in with the adopted center (RA 114.602°, Dec +21.575°, from Cantat-Gaudin et al. 2020). Add the distance, in arcminutes.',
  'gd.pop-cmd.radius.ok': 'Every star now has its distance from the center.',
  'gd.pop-cmd.core.title': 'Count the core',
  'gd.pop-cmd.core.text':
    'How many stars in this table lie within 3 arcminutes of the center? In the measurement panel, “Filter the rows” counts them: keep the rows whose distance is below 3, and measure.',
  'gd.pop-cmd.core.ok':
    '{value}. By Gaia’s count, half of the cluster’s members lie within about 3.2 arcminutes of its center.',
  'gd.pop-cmd.core.no':
    'Count again: filter the rows whose distance is below 3; the rows kept are the count.',
  'gd.pop-cmd.why-core.title': 'Why so few?',
  'gd.pop-cmd.why-core.text':
    'The panel sets this table’s counts beside Gaia’s. A cluster’s center is its densest part, not its emptiest. Why is it nearly empty here?',
  'gd.pop-cmd.why-core.opt.none': 'The cluster has no core',
  'gd.pop-cmd.why-core.opt.crowding':
    'SDSS could not measure stars so crowded together',
  'gd.pop-cmd.why-core.opt.dust': 'Dust hides the center',
  'gd.pop-cmd.why-core.ok':
    'Crowding. SDSS’s photometric pipeline was built for fields where stars are well apart; where their images overlap it finds few of them, and the clean flag this table was cut on drops those it measured badly. The pack’s details say so, and An et al. (2008) remeasured such clusters for that reason. The core is missing from the table, not from the sky.',
  'gd.pop-cmd.why-core.no':
    'Gaia, whose positions do not need a clean picture of a crowded field, counts half the members within 3.2 arcminutes. What could make a survey miss the most crowded stars?',
  'gd.pop-cmd.field.title': 'Stars that are not the cluster’s',
  'gd.pop-cmd.field.text':
    'Every star in the direction of the cluster is in this table, those in front of it and behind it too. The panel counts the stars brighter than g = 20 in a ring about the cluster, 3 to 8 arcminutes out, and in a ring clear of it, 10 to 14.14 arcminutes out.\n\nIf the field’s stars are spread evenly, what share of the inner ring’s stars belong to the field? It is the outer ring’s density over the inner’s.',
  'gd.pop-cmd.field.ok':
    '{value}. Most of the stars in this part of the diagram are not the cluster’s: a cluster’s diagram is the cluster’s and its field’s until something tells them apart.',
  'gd.pop-cmd.field.no':
    'Divide the outer ring’s density by the inner ring’s, as the panel gives them.',
  'gd.pop-cmd.bright.title': 'The brightest star',
  'gd.pop-cmd.bright.text':
    'Now the other end. What is the smallest g, the brightest star, in the table? In the measurement panel, “Describe a column” gives a column’s smallest and largest values.',
  'gd.pop-cmd.bright.ok':
    'g = {value}. At 2.5 kiloparsecs, the cluster’s brightest red giants should be brighter than that.',
  'gd.pop-cmd.bright.no':
    'Describe the column g: its smallest value is the brightest star.',
  'gd.pop-cmd.why-bright.title': 'Where are the giants?',
  'gd.pop-cmd.why-bright.text':
    'SDSS’s camera saturates near g = 14: a brighter star fills its pixels past what they can count. Of the stars the pack dropped as not clean, its details say how many were brighter than g = 14.5. What happened to the cluster’s brightest giants?',
  'gd.pop-cmd.why-bright.opt.none': 'The cluster has none',
  'gd.pop-cmd.why-bright.opt.saturated': 'They saturated, and were dropped',
  'gd.pop-cmd.why-bright.opt.far': 'They are too far away to see',
  'gd.pop-cmd.why-bright.ok':
    'Saturated. The top of this diagram is cut by the camera, its center by crowding, and its bottom by how faint SDSS can measure: each a selection, and none of them the cluster.',
  'gd.pop-cmd.why-bright.no':
    'The pack’s details give the reason: find the reduction about the stars brighter than g = 14.5.',
  'gd.pop-cmd.faint.title': 'The faint end',
  'gd.pop-cmd.faint.text':
    'The pack itself cut the table at g = 22.5, where SDSS’s photometry becomes incomplete. How many stars did that cut drop? The reductions say.',
  'gd.pop-cmd.faint.ok':
    '{value} stars, about as many as the table keeps. The faint limit is a choice the pack made and states: a diagram’s faint edge is the survey’s, or its builder’s, never the cluster’s.',
  'gd.pop-cmd.faint.no':
    'Find the reduction that begins “psfMag_g:” in the details.',
  'gd.pop-cmd.wrap.title': 'What the diagram is made of',
  'gd.pop-cmd.wrap.text':
    'The diagram you made is NGC 2420 seen through SDSS: without its crowded core, without its brightest giants, cut at g = 22.5, and mostly field stars in the ring about it. None of that is hidden, each is written in the pack’s details, and none of it is the cluster.\n\nNext: telling the cluster’s stars from the field’s.',

  // --- 3. Who belongs? --------------------------------------------------------------

  'gd.pop-members.title': '3. Who belongs?',
  'gd.pop-members.summary':
    'SEGUE’s velocities pick the cluster out of its field, not perfectly, and three methods give three metallicities.',
  'gd.pop-members.intro.title': 'A velocity in common',
  'gd.pop-members.intro.text':
    'A cluster’s stars move through the Galaxy together; the field’s stars move every which way. A star’s velocity along the line of sight, measured from the Doppler shift of its spectrum, can tell them apart where a position cannot.\n\nSDSS’s SEGUE survey took spectra of stars in NGC 2420’s field, and its pipeline measured each one’s velocity, temperature, gravity and [Fe/H]. You will choose members by velocity, and weigh what that choice leaves in.',
  'gd.pop-members.open.title': 'Open SEGUE’s parameters',
  'gd.pop-members.open.text':
    'Open the SEGUE table: each star’s radial velocity (rv), and its temperature, surface gravity and [Fe/H] from SEGUE’s pipeline, each with its uncertainty, with its g and r. It opens with the velocity across and [Fe/H] up.',
  'gd.pop-members.open.ok': 'Open.',
  'gd.pop-members.predict-rv.title': 'Predict: the velocities',
  'gd.pop-members.predict-rv.text':
    'What will the velocities of the stars in this field look like?',
  'gd.pop-members.predict-rv.opt.one': 'One narrow peak: all cluster',
  'gd.pop-members.predict-rv.opt.spread': 'A broad spread: all field',
  'gd.pop-members.predict-rv.opt.two': 'A narrow peak on a broad spread',
  'gd.pop-members.crop.title': 'Choose members by velocity',
  'gd.pop-members.crop.text':
    'The cluster’s stars pile up in a narrow column of velocity, near 75 km/s. Crop the velocity to that column: in “Change what you are looking at”, keep from about 65 to about 85 km/s (the ends are yours: the lower between 55 and 72, the upper between 78 and 95), and crop. The stars left are your members.',
  'gd.pop-members.crop.ok':
    'Cropped. The other stars are gone from the view and kept in the data: the crop can be undone.',
  'gd.pop-members.members.title': 'How many?',
  'gd.pop-members.members.text': 'How many stars did your crop keep?',
  'gd.pop-members.members.ok': '{value} members, chosen by velocity alone.',
  'gd.pop-members.members.no':
    'The crop’s note, in the list of changes, gives the rows it kept.',
  'gd.pop-members.rv.title': 'Their velocity',
  'gd.pop-members.rv.text':
    'What is your members’ median velocity, in km/s? In the measurement panel, “Describe a column” gives it for the column rv. The panel sets the published value beside it.',
  'gd.pop-members.rv.ok':
    '{value} km/s, within a few km/s of the published velocity, from other members and an earlier version of the same pipeline.',
  'gd.pop-members.rv.no':
    'Describe the column rv, with your crop in place: its median is the answer.',
  'gd.pop-members.field.title': 'Who is in the window by chance?',
  'gd.pop-members.field.text':
    'Field stars have velocities too, and some fall in your window. The panel counts the stars in your window and in a window as wide on either side of it. If the field’s velocities change slowly across the window, how many field stars does it hold? Take the mean of the two neighbors.',
  'gd.pop-members.field.ok':
    'About {value}. That is an upper estimate, since some of the cluster’s own stars, with larger errors, fall in the neighbors too; but a velocity cut leaves some field stars in, and a few members out.',
  'gd.pop-members.field.no':
    'Add the two neighboring windows’ counts, from the panel, and halve the sum.',
  'gd.pop-members.feh.title': 'Their metallicity',
  'gd.pop-members.feh.text':
    'What is your members’ median [Fe/H], by SEGUE’s pipeline? Describe the column feh.',
  'gd.pop-members.feh.ok':
    '{value}: about half the Sun’s iron, by this pipeline’s scale.',
  'gd.pop-members.feh.no':
    'Describe the column feh, with your crop in place: its median is the answer.',
  'gd.pop-members.feh-why.title': 'Three metallicities',
  'gd.pop-members.feh-why.text':
    'The panel sets your median beside three published values for this cluster, from SEGUE’s pipeline in 2008, from high-resolution optical spectra, and from APOGEE’s infrared spectra of its giants. They differ by more than their stated errors. What does that say?',
  'gd.pop-members.feh-why.opt.segue': 'SEGUE’s value is the right one',
  'gd.pop-members.feh-why.opt.apogee': 'APOGEE’s value is the right one',
  'gd.pop-members.feh-why.opt.systematics':
    'Each method has its own scale: the cluster’s [Fe/H] is uncertain by a few tenths',
  'gd.pop-members.feh-why.ok':
    'Each method has its own scale. A pipeline’s [Fe/H] is calibrated against stars whose [Fe/H] others measured, and Lee et al. (2008b) found SEGUE’s reading near-solar stars about 0.3 dex low in 2008. The spread between methods is the uncertainty that matters, and the next investigation has to live with it.',
  'gd.pop-members.feh-why.no':
    'Each value comes with a small error, and they disagree by more than those errors. What can make careful measurements disagree like that?',
  'gd.pop-members.giants.title': 'Where are the giants?',
  'gd.pop-members.giants.text':
    'How many of your members have a surface gravity below log g = 3.5, the giants? “Filter the rows” counts them: keep the rows whose logg is below 3.5.',
  'gd.pop-members.giants.ok':
    '{value}. SEGUE added its targets in NGC 2420’s field between g = 14.5 and 20.5 (Lee et al. 2008b), and the cluster’s brightest giants are brighter than that: another selection, made before any spectrum was taken.',
  'gd.pop-members.giants.no':
    'Filter your members for logg below 3.5; the rows kept are the count.',
  'gd.pop-members.wrap.title': 'Membership is a choice',
  'gd.pop-members.wrap.text':
    'A velocity window keeps most of the cluster’s stars and some of the field’s; its ends are a choice, and the members it gives are only as good as it. The survey chose its targets before that, and missed the giants. And the cluster’s metallicity depends on whose method you trust.\n\nNext: comparing your members with models of stars of one age.',

  // --- 4. Ages from models --------------------------------------------------------------

  'gd.pop-age.title': '4. Ages from models',
  'gd.pop-age.summary':
    'MIST’s isochrones against the members: an age and a distance, and how metallicity and reddening trade against them.',
  'gd.pop-age.intro.title': 'A model of stars of one age',
  'gd.pop-age.intro.text':
    'A star’s place in a color–magnitude diagram depends on its mass and its age. An isochrone is a model’s answer for stars of one age and one composition: where each mass would be, computed with a model of how stars evolve. As a cluster ages, its main sequence burns away from the top down, and the isochrone that matches its turnoff dates it.\n\nYou will compare your members with MIST’s isochrones (Choi et al. 2016), shifted by a distance and a reddening, and find out what the comparison can and cannot decide.',
  'gd.pop-age.open-model.title': 'Open the model',
  'gd.pop-age.open-model.text':
    'Open MIST’s isochrones. It opens as a theoretical Hertzsprung–Russell diagram, log temperature across (rising to the right, not to the left as the diagram is usually drawn) and log luminosity up, with seven ages from 1 to 4 Gyr at three metallicities. Read its details.',
  'gd.pop-age.open-model.ok': 'Open.',
  'gd.pop-age.model.title': 'Model or measurement?',
  'gd.pop-age.model.text':
    'Where do this table’s numbers come from? Its details say.',
  'gd.pop-age.model.opt.observed': 'Observations of stars',
  'gd.pop-age.model.opt.model': 'A model’s calculations',
  'gd.pop-age.model.ok':
    'A model’s. Its details say “What it is: A model”, and no star was observed to make it: its g and r are what MIST computes a star of each mass would show. It is compared with the stars; it is never one of them.',
  'gd.pop-age.model.no':
    'Look at the details again: what does it say the table’s origin is?',
  'gd.pop-age.open.title': 'Open the members again',
  'gd.pop-age.open.text': 'Open SEGUE’s table of NGC 2420.',
  'gd.pop-age.open.ok': 'Open.',
  'gd.pop-age.crop.title': 'Keep the members',
  'gd.pop-age.crop.text':
    'Crop the velocity to the cluster’s window, as in the last investigation: from about 65 to about 85 km/s.',
  'gd.pop-age.crop.ok': 'Cropped to your members.',
  'gd.pop-age.color.title': 'Their diagram',
  'gd.pop-age.color.text':
    'Make a new column from g, minus the column r, and plot g up and your color across.',
  'gd.pop-age.color.ok': 'Your members’ color–magnitude diagram.',
  'gd.pop-age.fit-mid.title': 'Compare with the isochrones',
  'gd.pop-age.fit-mid.text':
    'In the measurement panel, choose “Compare with model curves (isochrones)” and the model metallicity −0.25, between the pipelines’ values. For each age it shifts the isochrone by every distance modulus and reddening in the ranges given, and finds the shift that puts the members closest to it. Keep the other settings and measure: it takes a few seconds.',
  'gd.pop-age.fit-mid.ok':
    'The closest isochrone is log age {value}; it is drawn over your points.',
  'gd.pop-age.age-mid.title': 'An age',
  'gd.pop-age.age-mid.text': 'What age does it give, in Gyr?',
  'gd.pop-age.age-mid.ok': '{value} Gyr, at this metallicity.',
  'gd.pop-age.age-mid.no':
    'The age is among the quantities in the comparison’s result.',
  'gd.pop-age.dm-mid.title': 'A distance',
  'gd.pop-age.dm-mid.text':
    'And what distance modulus, m − M? The distance is 10^((m − M)/5 + 1) parsecs.',
  'gd.pop-age.dm-mid.ok': 'm − M = {value}.',
  'gd.pop-age.dm-mid.no':
    'The distance modulus is among the quantities in the comparison’s result.',
  'gd.pop-age.fit-solar.title': 'Another metallicity',
  'gd.pop-age.fit-solar.text':
    'Measure again with the model metallicity 0, the Sun’s, nearer APOGEE’s value.',
  'gd.pop-age.fit-solar.ok': 'The closest isochrone is log age {value}.',
  'gd.pop-age.dm-solar.title': 'Its distance',
  'gd.pop-age.dm-solar.text': 'What distance modulus does it give?',
  'gd.pop-age.dm-solar.ok':
    'm − M = {value}. A metal-richer star is redder at the same mass, so the solar isochrone must sit elsewhere to meet the same points.',
  'gd.pop-age.dm-solar.no':
    'The distance modulus is among the quantities in the second comparison’s result.',
  'gd.pop-age.better.title': 'Which fits better?',
  'gd.pop-age.better.text':
    'The panel sets your two comparisons side by side. Which isochrone lies closer to the members, by the statistic?',
  'gd.pop-age.better.opt.metal-poor': '[Fe/H] −0.25',
  'gd.pop-age.better.opt.solar': '[Fe/H] 0',
  'gd.pop-age.better.ok':
    'That one, by about a tenth of the statistic, and it stays ahead at other scales and caps. But the two give ages over a gigayear apart, and the stars alone cannot give the metallicity: a redder isochrone and a larger reddening can meet the same points.',
  'gd.pop-age.better.no':
    'Compare the two statistics in the panel: the smaller is the closer.',
  'gd.pop-age.fit-map.title': 'Take the reddening from a map',
  'gd.pop-age.fit-map.text':
    'The comparison chose its own reddening. A dust map gives one instead: E(g − r) ≈ 0.042 toward NGC 2420 (the panel says how). Measure at [Fe/H] −0.25 again with the reddening fixed: from 0.042 to 0.042.',
  'gd.pop-age.fit-map.ok': 'The closest isochrone is now log age {value}.',
  'gd.pop-age.age-map.title': 'Another age',
  'gd.pop-age.age-map.text': 'What age does it give now, in Gyr?',
  'gd.pop-age.age-map.ok':
    '{value} Gyr. A few hundredths of a magnitude of reddening moved the age by more than half a gigayear. Try [Fe/H] −0.5 at the map’s reddening too: it fits about as well as −0.25.',
  'gd.pop-age.age-map.no':
    'The age is among the quantities of the comparison you just made.',
  'gd.pop-age.decided.title': 'Is that the cluster’s age?',
  'gd.pop-age.decided.text':
    'The panel lists published values: an age of 1.7 Gyr from Gaia’s photometry and another model, 2.2 Gyr from earlier studies, and distance moduli from 12.06 to 12.54. Your comparisons give an age that is the closest isochrone’s. Is it the cluster’s age?',
  'gd.pop-age.decided.opt.yes': 'Yes: the comparison measured it',
  'gd.pop-age.decided.opt.model':
    'It is MIST’s age for the metallicity and reddening assumed',
  'gd.pop-age.decided.opt.no': 'No: isochrones cannot date a cluster',
  'gd.pop-age.decided.ok':
    'MIST’s age, for what was assumed. Another model’s physics gives another age for the same stars, and the metallicity, the reddening and the extinction law were all choices. A cluster’s age is a model’s reading of its diagram, and should be quoted with the model.',
  'gd.pop-age.decided.no':
    'Think about what went into the number: a model of stellar evolution, a metallicity you chose, and a reddening either fitted or taken from a map.',
  'gd.pop-age.distance.title': 'How far?',
  'gd.pop-age.distance.text':
    'Your solar-metallicity comparison also gave a distance. What is it, in parsecs?',
  'gd.pop-age.distance.ok':
    '{value} pc, close to Cantat-Gaudin et al.’s 2587 pc, which uses Gaia’s parallaxes as well as its photometry. At [Fe/H] −0.25 the same stars sit about 300 pc nearer.',
  'gd.pop-age.distance.no':
    'The distance is among the quantities of your comparison at [Fe/H] 0.',
  'gd.pop-age.wrap.title': 'What an isochrone can tell',
  'gd.pop-age.wrap.text':
    'An isochrone comparison turns a diagram into an age and a distance, but only through a model, a metallicity and a reddening, and those trade against one another: bluer by metallicity or bluer by less dust, older and nearer or younger and farther. The model is the lens; the stars are the data.\n\nLast: a star whose light changes, and a distance from that.',

  // --- 5. A star that varies ------------------------------------------------------------

  'gd.pop-variable.title': '5. A star that varies',
  'gd.pop-variable.summary':
    'An RR Lyrae star’s period and light curve, its distance as a standard candle, and a period search fooled by a transit.',
  'gd.pop-variable.intro.title': 'A star that pulsates',
  'gd.pop-variable.intro.text':
    'Some stars swell and shrink, and brighten and fade with it, as regularly as a clock. RR Lyrae stars are old stars on the horizontal branch, where the first investigation’s A star most probably is too, that pulsate in less than a day; because they all have nearly the same luminosity, a measured one gives a distance.\n\nYou will measure SU Draconis’s period in 26 days of TESS’s light, look at its light curve’s shape, and find its distance.',
  'gd.pop-variable.predict.title': 'Predict: how fast?',
  'gd.pop-variable.predict.text':
    'How long will SU Draconis take to go from its brightest to its brightest again?',
  'gd.pop-variable.predict.opt.hours': 'Hours',
  'gd.pop-variable.predict.opt.days': 'Several days',
  'gd.pop-variable.predict.opt.months': 'Months',
  'gd.pop-variable.open.title': 'Open SU Draconis’s light curve',
  'gd.pop-variable.open.text':
    'Open SU Draconis’s TESS light curve, from sector 15 in 2019. It comes from the catalog, and is installed in your browser the first time.',
  'gd.pop-variable.open.ok':
    'Open. Its flux is relative: divided by its median, as its details say.',
  'gd.pop-variable.period.title': 'Search for the period',
  'gd.pop-variable.period.text':
    'In the measurement panel, choose “Period search (Lomb-Scargle)”, keep its range and measure. It fits a sinusoid at each of many trial periods and reports the one that fits best.',
  'gd.pop-variable.period.ok': 'A period of {value} days.',
  'gd.pop-variable.period-value.title': 'The period',
  'gd.pop-variable.period-value.text': 'What period did it find, in days?',
  'gd.pop-variable.period-value.ok':
    '{value} days, about 16 hours. Monson et al. (2017) give 0.66042 days from years of observations.',
  'gd.pop-variable.period-value.no':
    'The period is the first quantity in the search’s result.',
  'gd.pop-variable.fold.title': 'Fold it',
  'gd.pop-variable.fold.text':
    'Fold the light curve on that period: the search’s result has a button, “Fold at this period”. Every cycle is laid over the first.',
  'gd.pop-variable.fold.ok':
    'Folded at {value} days: every cycle lies on the first.',
  'gd.pop-variable.amplitude.title': 'How much does it change?',
  'gd.pop-variable.amplitude.text':
    'What amplitude did the search’s sinusoid have, as a fraction of the mean flux?',
  'gd.pop-variable.amplitude.ok':
    '{value}. Look at the folded light curve: a fast rise and a slow decline, not a sine.',
  'gd.pop-variable.amplitude.no':
    'The amplitude is among the quantities in the search’s result.',
  'gd.pop-variable.shape.title': 'Not a sine',
  'gd.pop-variable.shape.text':
    'The panel sets half of the folded light curve’s range beside the sinusoid’s amplitude. Why is the sinusoid’s smaller?',
  'gd.pop-variable.shape.opt.sine':
    'The light curve is a sine, and the noise makes its range larger',
  'gd.pop-variable.shape.opt.sawtooth':
    'The light curve is not a sine: a sharp peak a sine cannot reach',
  'gd.pop-variable.shape.ok':
    'Not a sine. A single sinusoid fitted to a sawtooth misses its peak; the rest of the shape is in its harmonics, at half the period, a third and so on. The period is right; the amplitude is only the sinusoid’s.',
  'gd.pop-variable.shape.no':
    'Look at the folded curve: does it rise and fall alike?',
  'gd.pop-variable.candle.title': 'A standard candle',
  'gd.pop-variable.candle.text':
    'A period of about 0.66 days and a sawtooth of this size say SU Dra is an RR Lyrae star pulsating in its fundamental mode, and such stars have nearly the same absolute magnitude, which depends a little on their metallicity. The panel gives the adopted values.\n\nWith M_V from the relation, the distance is 10^((V − A_V − M_V)/5 + 1) parsecs. What is it?',
  'gd.pop-variable.candle.ok':
    '{value} pc. The light curve gave the kind of star; the kind gave its luminosity, and that, with its brightness, gave the distance.',
  'gd.pop-variable.candle.no':
    'Work it out from the panel: first M_V from the relation, then the distance from V, A_V and M_V.',
  'gd.pop-variable.parallax.title': 'Against a parallax',
  'gd.pop-variable.parallax.text':
    'The Hubble Space Telescope measured SU Dra’s parallax, the tiny shift of its position as the Earth goes round the Sun. The panel gives the distance it implies. Do the two distances agree, within two of the parallax’s standard errors?',
  'gd.pop-variable.parallax.opt.agree': 'They agree',
  'gd.pop-variable.parallax.opt.disagree': 'They disagree',
  'gd.pop-variable.parallax.ok':
    'They agree. But not independently: SU Dra’s parallax was one of the five that set the relation’s zero point, so this agreement tests the arithmetic more than the candle. A fair test uses a star that played no part in the calibration.',
  'gd.pop-variable.parallax.no':
    'Compare the candle’s distance with the parallax’s range in the panel.',
  'gd.pop-variable.dust.title': 'Behind more dust',
  'gd.pop-variable.dust.text':
    'SU Dra lies far from the Galaxy’s plane, behind little dust. Suppose it lay behind 0.3 magnitudes more extinction in V than the table gives, and looked as bright as it does. What distance would the candle give, counting that dust?',
  'gd.pop-variable.dust.ok':
    '{value} pc, about an eighth nearer. Leave that dust out and the star is placed too far by the same factor: a standard candle is only as good as the extinction taken off it.',
  'gd.pop-variable.dust.no':
    'Use the same formula with A_V increased by 0.3: 10^((V − A_V − 0.3 − M_V)/5 + 1).',
  'gd.pop-variable.transit.title': 'A period search fooled',
  'gd.pop-variable.transit.text':
    'The same search on another star: open HD 209458’s TESS light curve, whose planet transits every 3.52 days, and run the period search with its default range.',
  'gd.pop-variable.transit.ok': 'It found {value} days.',
  'gd.pop-variable.harmonic.title': 'Why that period?',
  'gd.pop-variable.harmonic.text':
    'The panel sets the planet’s orbital period beside the one found. Their ratio is close to a whole number. Why?',
  'gd.pop-variable.harmonic.opt.two': 'There are two planets',
  'gd.pop-variable.harmonic.opt.harmonic':
    'A brief dip is not a sine: the search locked on a harmonic',
  'gd.pop-variable.harmonic.opt.noise': 'Noise, by chance',
  'gd.pop-variable.harmonic.ok':
    'A harmonic. A transit is a short dip once an orbit, and no single sinusoid fits it; its power is spread over the harmonics, and this one won. The box search of the exoplanet guides looks for a dip instead, and finds the orbit. A method’s answer is only as good as its model of the signal.',
  'gd.pop-variable.harmonic.no':
    'The ratio is nearly exactly 2, and HD 209458 has one known transiting planet. What does fitting a sine to a brief dip do?',
  'gd.pop-variable.wrap.title': 'Time as a measurement',
  'gd.pop-variable.wrap.text':
    'A light curve’s period and shape say what kind of star it is, and the kind can say how luminous it is: a distance from a clock. Its limits are the calibration’s, the extinction’s and the method’s: a sinusoid finds SU Dra’s period and misses a transit’s.\n\nThat is the end of the suite. The notebook holds your answers and the measurements behind them.',
};
