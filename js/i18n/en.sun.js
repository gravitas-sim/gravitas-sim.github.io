// The Sun instruments' words, in English (Prompt 194 part 2). The statements of
// what each instrument leaves out are fixed text, so they translate by key.
export const EN_SUN = {
  'sunW.on': 'on',
  'sunW.off': 'off',
  'sunW.loading': 'The pictures are loading.',
  'sunW.failed': 'The picture or the sequence could not be loaded.',
  'sunW.row.how': 'Status',
  'sunW.row.picture': 'The picture',
  'sunW.row.assumes': 'What it leaves out',
  'sunW.date': '{d} {month}',
  'sunW.month.5': 'May',
  'sunW.control.day': 'Day (a picture at 12:00 UT)',
  'sunW.control.first': 'First day used',
  'sunW.control.last': 'Last day used',
  'sunW.alt':
    'The Sun on {date} 2024 in a browse picture from the continuum camera of NASA’s Solar Dynamics Observatory (SDO), north up and east left: an orange disc with dark spots. The detector of this page reads {n} separate dark clusters of at least 12 pixels in it. These are clusters, not NOAA’s numbered regions, which were not retrieved.',
  'sunW.group.G1': 'G1, a small spot near the equator',
  'sunW.group.G3': 'G3, the large southern group',
  'sunW.mode.0': 'Track one group',
  'sunW.mode.1': 'Fit the equatorial term',
  'sunW.mode.2': 'Fit all three coefficients',
  // sun-frames
  'sunW.f.title': 'Where on the Sun is a spot?',
  'sunW.f.note':
    'Fourteen daily pictures of the Sun in May 2024. Move the crosshair with the two sliders onto a spot, then read its heliographic latitude and longitude and how uncertain they are. The rings marked G1 and G3 are the author’s marks of two groups, made by a stated rule: nobody else has marked these pictures. They are browse pictures, made to be looked at, so a position read here is a labeled instructional measurement, not astrometry.',
  'sunW.f.control.x': 'Crosshair across',
  'sunW.f.control.y': 'Crosshair down',
  'sunW.f.control.marks': 'The author’s marks of G1 and G3',
  'sunW.f.control.grid': 'Latitude and longitude grid',
  'sunW.f.row.geometry': 'The disc this day',
  'sunW.f.value.geometry':
    'Tilt of the Sun’s pole toward us B0 {b0}°, longitude of the central meridian L0 {l0}°; the limb fitted at a radius of {r} pixels, {scale} arcseconds per pixel',
  'sunW.f.row.cross': 'Crosshair at ({x}, {y}) pixels',
  'sunW.f.value.cross':
    'latitude {lat}°, longitude {lon}° from the central meridian (Carrington {car}°), mu {mu}, uncertainty {sigma}° in longitude for a placement of 1.5 pixels',
  'sunW.f.value.offdisc': 'Not on the Sun: no latitude or longitude',
  'sunW.f.row.limb': 'Warning',
  'sunW.f.value.limb':
    'Foreshortening: within mu {mu} of the limb a pixel is many degrees of longitude, the uncertainty is wide and a rate from here is not precise',
  'sunW.f.row.mark': 'Author’s mark of {id}',
  'sunW.f.value.mark':
    'latitude {lat}°, longitude {lon}°, mu {mu}, ± {sigma}° (pixel {x}, {y})',
  'sunW.f.value.nomark':
    'not marked this day (not yet on the disc, past the limb, or lost by the rule)',
  'sunW.f.assumes':
    'A browse picture is a display picture: its source says it is not for science analysis, it has no brightness calibration and no coordinates of its own, so only the position of a spot is read, with the uncertainty of placing a crosshair. A spot group is not a point, and the Sun is treated as a sphere.',
  // sun-rotation
  'sunW.r.title': 'How fast does the Sun turn at this latitude?',
  'sunW.r.note':
    'The author’s marks of one spot group over the days chosen, as longitude against time with the straight line that fits them. The rate is the line’s slope; adding the Earth’s own motion gives the Sun’s rotation against the stars. Beside it, the reference law of Howard, Harvey and Forgach (1990): its form is fixed and it was not refit here. The other two modes use both groups and fit only the equatorial term, or try all three coefficients.',
  'sunW.r.control.group': 'Group',
  'sunW.r.control.limb': 'Add the days near the limb',
  'sunW.r.control.mode': 'What to do',
  'sunW.r.legend.marks': 'Marked longitudes',
  'sunW.r.legend.fit': 'Fit, {r}° a day',
  'sunW.r.legend.law': 'Reference law',
  'sunW.r.legend.groups': 'The two groups',
  'sunW.r.legend.fitA': 'Law with A fitted, {a}° a day',
  'sunW.r.axis.t': 'Days since the first mark',
  'sunW.r.axis.lon': 'Longitude from the central meridian (°)',
  'sunW.r.axis.lat': 'Latitude (°)',
  'sunW.r.axis.rate': 'Sidereal rotation rate (° a day)',
  'sunW.r.row.group': 'Group',
  'sunW.r.row.positions': 'Positions used',
  'sunW.r.value.positions': '{n} days, at a mean latitude of {lat}°',
  'sunW.r.row.synodic': 'Synodic rate (as the Earth sees it)',
  'sunW.r.value.rate': '{r} ± {s}° a day',
  'sunW.r.row.synodicPeriod': 'Synodic period',
  'sunW.r.value.period': '{p} days',
  'sunW.r.row.earth': 'The Earth’s own motion, along the Sun’s equator',
  'sunW.r.value.earth': '{r}° a day',
  'sunW.r.row.sidereal': 'Sidereal rate (against the stars)',
  'sunW.r.row.siderealPeriod': 'Sidereal period',
  'sunW.r.value.periodRange': '{p} days (95 percent: {lo} to {hi})',
  'sunW.r.row.law': 'The reference law at this latitude',
  'sunW.r.value.law':
    '{predicted}° a day; the group is {diff}° from it, against ± {total}° (the fit and a 0.3° a day scatter between groups), z {z}',
  'sunW.r.row.birge': 'Do the marks lie on a line?',
  'sunW.r.value.birge':
    'Yes within their uncertainties (chi-square per degree of freedom {b})',
  'sunW.r.value.birgeHigh':
    'Not quite (chi-square per degree of freedom {b}): the group changes as it turns, and the rate’s uncertainty has been enlarged to match',
  'sunW.r.row.warning': 'Warning',
  'sunW.warn.foreshortening':
    'A mark is within mu {mu} of the limb, where a pixel is many degrees of longitude: the uncertainty is widened and the rate is not precise',
  'sunW.warn.limb-excluded': 'A mark within mu 0.1 of the limb was left out',
  'sunW.refused.too-few': 'No rate: fewer than three usable positions',
  'sunW.refused.limb': 'No rate: too few positions are away from the limb',
  'sunW.refused.not-constrained':
    'No rate: these positions do not constrain it (its uncertainty is more than half of it)',
  'sunW.refused.bad-time': 'No rate: all the positions are at one time',
  'sunW.refused.under-determined':
    'Refused: {free} coefficients cannot be determined from {n} groups at two latitudes; two latitudes fix at most two numbers',
  'sunW.refused.empty': 'No series',
  'sunW.refused.flux': 'No value: a flux is not a positive number',
  'sunW.r.row.latitudes': 'Latitudes of the groups',
  'sunW.r.value.latitudes': '{n} distinct latitudes: {list}',
  'sunW.r.row.fit': 'Fit',
  'sunW.r.row.A': 'Equatorial term A, fitted',
  'sunW.r.value.A': '{a} ± {s}° a day (the law’s own is {ref})',
  'sunW.r.row.held': 'Held at the law’s values',
  'sunW.r.value.held': 'B {b} and C {c}° a day',
  'sunW.r.row.chi2': 'Goodness of fit',
  'sunW.r.value.chi2': 'chi-square {chi2} on {dof} degree of freedom',
  'sunW.r.row.residual': 'Group at {lat}°',
  'sunW.r.value.residual': 'residual {res}° a day, z {z}',
  'sunW.r.assumes':
    'One group’s center is not a point: a group that grows or splits moves its own center, and that shows up as scatter the placement uncertainty does not cover. The reference law was measured on magnetic features, not sunspots, so a group can sit a few tenths of a degree a day from it. The Sun is a sphere and spots stay at one latitude.',
  'sunW.r.assumes.law':
    'The law keeps its form: only the coefficients named are fitted and the rest are held at the published values, which were typed from the paper and not re-read. With few latitudes the fit says nothing about the other coefficients; two groups are two numbers.',
  // sun-power
  'sunW.p.title': 'How much power does the Sun give out?',
  'sunW.p.note':
    'The Sun’s total irradiance, measured above the atmosphere by the TSIS-1 TIM instrument, one value a day, at the Earth. Correct each to one astronomical unit with the Earth–Sun distance, then ask what power through the whole sphere around the Sun that is, and what temperature a surface of the Sun’s size would need to give it.',
  'sunW.p.control.days': 'Days used',
  'sunW.p.control.correct': 'Correct each day to 1 AU',
  'sunW.p.legend.earth': 'As measured at the Earth',
  'sunW.p.legend.au': 'Corrected to 1 AU',
  'sunW.p.axis.day': 'Day (4 May is day 1)',
  'sunW.p.axis.flux': 'Irradiance (W/m²)',
  'sunW.p.row.instrument': 'Instrument and days',
  'sunW.p.value.instrument': '{name}, {n} days, {from} to {to}',
  'sunW.p.row.earth': 'At the Earth, first and last day',
  'sunW.p.value.earth': '{a} and {b} W/m², a fall of {fall}',
  'sunW.p.row.distance': 'Earth–Sun distance, first and last day (JPL)',
  'sunW.p.value.distance': '{a} and {b} AU',
  'sunW.p.row.au': 'At 1 AU, first and last day',
  'sunW.p.value.au': '{a} and {b} W/m², a fall of {fall}',
  'sunW.p.row.mean': 'Mean over the days used',
  'sunW.p.value.mean': '{m} ± {s} W/m² at 1 AU',
  'sunW.p.value.meanRaw': '{m} ± {s} W/m², NOT corrected to 1 AU',
  'sunW.p.row.luminosity': 'The Sun’s luminosity',
  'sunW.p.value.luminosity':
    '{l} × 10²⁶ W, ± {s} × 10²² W ({diff} percent from the nominal solar value, 3.828 × 10²⁶ W)',
  'sunW.p.row.teff': 'Effective temperature',
  'sunW.p.value.teff': '{k} ± {s} K ({diff} K from the nominal 5772 K)',
  'sunW.p.row.wrong': 'What leaving out the correction costs',
  'sunW.p.value.wrong':
    'The luminosity comes out {pct} percent too low, an error far larger than the interval above',
  'sunW.p.row.fill': 'After the last day',
  'sunW.p.value.fill':
    'The file has {n} more rows, all 0.0 with an uncertainty of 0.0: fill values, not a measurement of no sunlight. They are left out.',
  'sunW.p.assumes':
    'The interval is the scatter of these days over the square root of their number: it leaves out the instrument’s own accuracy and the Sun’s real change from day to day (here the irradiance falls over the days used). The luminosity assumes the Sun is a sphere radiating equally in every direction.',
};
