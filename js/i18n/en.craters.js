// The crater instruments' words, in English (Prompt 195). The statements of what
// each model leaves out are fixed text per instrument, so they translate by key.
export const EN_CRATERS = {
  'crW.on': 'on',
  'crW.off': 'off',
  'crW.loading': 'The picture is loading.',
  'crW.failed': 'The picture or the lists could not be loaded.',
  'crW.row.how': 'Status',
  'crW.row.picture': 'The picture',
  'crW.row.source': 'Where the craters come from',
  'crW.row.assumes': 'What it leaves out',
  'crW.region.moon-highland': 'Lunar highland',
  'crW.region.moon-mare': 'Lunar mare',
  'crW.region.mars-highland': 'Martian highland',
  'crW.region.mars-plains': 'Martian plains',
  'crW.source.moon':
    'The catalog LU78287GT (Salamuniccar and others 2013), by its authors from lunar data; the picture is the Clementine map. Not marks on this picture.',
  'crW.source.mars':
    'The Robbins database (Robbins and Hynek 2012), by its authors from Mars data; the picture is the Viking color map, 1 km per pixel. Not marks on this picture.',
  'crW.alt.moon-highland':
    'A Clementine map of the lunar southern highlands, 350 by 200 pixels at 2.02 km per pixel: bright, rough ground crowded with overlapping craters. {n} circles mark the catalog’s craters at least {dmin} km across.',
  'crW.alt.moon-mare':
    'A Clementine map of Mare Tranquillitatis and its margins, 325 by 223 pixels at 2.02 km per pixel: dark, smooth ground with few large craters. {n} circles mark the catalog’s craters at least {dmin} km across.',
  'crW.alt.mars-highland':
    'A Viking color map of Terra Sabaea, a Martian highland, 713 by 712 pixels at 1 km per pixel: densely cratered ground. {n} circles mark the catalog’s craters at least {dmin} km across.',
  'crW.alt.mars-plains':
    'A Viking color map of Elysium Planitia, young lava plains, 712 by 712 pixels at 1 km per pixel: smooth ground with few craters. {n} circles mark the catalog’s craters at least {dmin} km across.',
  'crW.refused.below-completeness':
    'No comparison: this is below the {km} km at which the count is complete',
  'crW.refused.below-resolution':
    'No comparison: a crater this small spans too few pixels to place',
  'crW.refused.not-constrained':
    'No comparison: neither region has a crater this large',
  'crW.refused.too-few':
    'No fit: fewer than 5 craters at least this large ({n} here), or all of them the same size',
  'crW.refused.diameter': 'No diameter: the circle cannot be measured',
  // crater-regions
  'crW.r.title': 'Which of two surfaces has more craters, per area?',
  'crW.r.note':
    'Two regions of one world, counted by the authors of a catalog: the circles are theirs, and nobody has marked these pictures. Choose the diameter above which to count, then read each region’s density with its interval and the ratio of the two with its interval. A density ratio is not an age in years.',
  'crW.r.control.pair': 'World',
  'crW.r.control.view': 'Picture of the region',
  'crW.r.control.dmin': 'Count craters at least',
  'crW.r.control.circles': 'The catalog’s circles',
  'crW.pair.0': 'Moon',
  'crW.pair.1': 'Mars',
  'crW.view.0': 'first',
  'crW.view.1': 'second',
  'crW.r.row.region': '{region}',
  'crW.r.value.region':
    '{n} craters at least {dmin} km across in {area} thousand km²: {density} per million km² (95 percent: {iv})',
  'crW.value.interval': '{lo} to {hi}',
  'crW.r.row.ratio': 'Density ratio, first over second',
  'crW.r.value.ratio': '{r} (95 percent: {lo} to {hi})',
  'crW.r.value.noratio':
    'undefined: the second region has none; the ratio is at least {lo}',
  'crW.r.row.verdict': 'What the interval says',
  'crW.r.verdict.a': '{a} has the higher density, and the interval excludes 1',
  'crW.r.verdict.b': '{b} has the higher density, and the interval excludes 1',
  'crW.r.verdict.none':
    'no significant difference: the interval holds 1, so these counts cannot tell the two apart',
  'crW.r.assumes':
    'an age in years; one production function for both surfaces; saturation, partial resurfacing, or secondary craters (many small craters made at once by one large impact); anything below the diameter at which the count is complete; the uncertainty of the areas, which is not in the interval',
  // crater-sfd
  'crW.s.title': 'How many craters are there at least this large, per area?',
  'crW.s.note':
    'The cumulative size-frequency plot of one region’s catalog: for each diameter D, the number of craters at least that large per million km², with a 95 percent Poisson interval on each point. A dashed line is the power law fitted above the diameter you choose. “A count that stops short” leaves out the smallest craters below the completeness limit, as a count of the picture would.',
  'crW.s.control.region': 'Region',
  'crW.s.control.dmin': 'Fit craters at least',
  'crW.s.control.miss': 'A count that stops short: smallest left out',
  'crW.s.legend.counted': 'Counted (complete)',
  'crW.s.legend.under': 'Below the completeness limit',
  'crW.s.legend.fit': 'Power law, index {b}',
  'crW.s.axis.x': 'Diameter D (km, log scale)',
  'crW.s.axis.y': 'Craters at least D, per million km² (log scale)',
  'crW.s.row.list': 'The list',
  'crW.s.value.list':
    '{n} of the catalog’s {all} craters at least 20 km across, in {area} thousand km²',
  'crW.s.row.limit': 'Completeness limit',
  'crW.s.value.limit':
    '{km} km, stated for this picture: the count is taken to be complete from there up, and not below',
  'crW.s.row.missed': 'Left out',
  'crW.s.value.missed':
    'the {k} smallest of the {of} craters under {km} km: a count that stops short, made from the published list',
  'crW.s.row.warn': 'Warning',
  'crW.s.value.warn':
    'the fit starts at {dmin} km, under the {km} km completeness limit: the index is not trustworthy',
  'crW.s.row.n': 'Craters in the fit',
  'crW.s.value.n': '{n} craters at least {dmin} km across',
  'crW.s.row.index': 'Cumulative index b, N(≥D) ∝ D⁻ᵇ',
  'crW.s.value.index': '{b} (95 percent: {lo} to {hi})',
  'crW.s.row.unbiased': 'Index, unbiased form (n − 1) / S',
  'crW.s.row.constancy': 'Is the slope the same higher up?',
  'crW.s.value.constancy.ok':
    'Above {d2} km the index is {b2} (z = {z}): consistent with one slope',
  'crW.s.value.constancy.flag':
    'Above {d2} km the index is {b2} (z = {z}): the slope is not constant, so a break, a roll-off or a mix of populations is in the fit',
  'crW.s.value.constancy.none': 'Not run: fewer than 5 craters above {d2} km',
  'crW.s.assumes':
    'a roll-off at small diameters (incompleteness or saturation) is not corrected; one power law above the diameter chosen; craters that are independent (clustered secondaries break the intervals); an age in years',
  // crater-budget
  'crW.b.title': 'What is the diameter of this crater, and how sure are you?',
  'crW.b.note':
    'The Moon’s southern highlands, a Clementine map. Your circle has a center and a rim point; the instrument turns its radius into kilometers with the map’s scale, corrects for the view if you let it, and gives the diameter with the four terms of its uncertainty. The catalog’s circles can be shown to compare.',
  'crW.b.control.cx': 'Center, across',
  'crW.b.control.cy': 'Center, down',
  'crW.b.control.r': 'Rim point, distance from the center',
  'crW.b.control.angle': 'Rim point, direction',
  'crW.b.control.recognition': 'Where the rim is: uncertainty',
  'crW.b.control.correct': 'Correct for the view',
  'crW.b.control.dmin': 'Counting craters at least',
  'crW.b.control.catalogue': 'The catalog’s circles',
  'crW.b.row.scale': 'Scale of the map',
  'crW.b.value.scale': '{s} ± {sigma} km per pixel at the center of the disc',
  'crW.b.row.view': 'The view at your circle',
  'crW.b.value.view':
    '{rho} of the way from the center of the disc to its edge; cos E = {cosE} (a view straight down has cos E = 1)',
  'crW.b.row.across': 'Across the circle',
  'crW.b.value.across': '{px} pixels',
  'crW.b.row.diameter': 'Diameter',
  'crW.b.value.diameter': '{D} ± {sigma} km ({rel})',
  'crW.b.row.scaleTerm': 'Uncertainty from the scale',
  'crW.b.row.fitTerm': 'Uncertainty from placing the circle',
  'crW.b.row.recognitionTerm': 'Uncertainty from where the rim is',
  'crW.b.row.foreshorteningTerm': 'Uncertainty from the view',
  'crW.b.row.biggest': 'The largest term',
  'crW.b.term.scale': 'the scale',
  'crW.b.term.fit': 'placing the circle',
  'crW.b.term.recognition': 'where the rim is',
  'crW.b.term.foreshortening': 'the view',
  'crW.b.row.correction': 'The view’s correction',
  'crW.b.value.correction':
    'stretches the radius by {factor}; without it the diameter would read {D} km',
  'crW.b.value.nocorrection':
    'not applied: the view is taken as straight down, and the diameter reads {D} km',
  'crW.b.row.chance': 'Chance it is at least {dmin} km across',
  'crW.b.row.catalogue': 'The catalog’s crater under your center',
  'crW.b.value.catalogue':
    '{D} km. The catalog is another measurement, not the truth.',
  'crW.b.row.small': 'Warning',
  'crW.b.value.small':
    'a crater under {px} pixels across is too small to place: a comparison of counts refuses it',
  'crW.b.row.age': 'Age in years',
  'crW.b.value.age':
    'not reported: it needs a production function, a correction for saturation and secondaries, and a completeness correction checked on craters whose sizes are known, which have not passed their test here',
  'crW.b.assumes':
    'a flat region seen along one stretched axis; a sigma for the view’s cos E from one pixel on the disc; the uncertainty of where the rim is, which you set and which is no measurement; the uncertainty of the count, which this does not add',
};
