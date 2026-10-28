// The atmosphere instruments' words, in English (Prompt 200). The model and
// what-it-leaves-out lines are fixed text per model (the kernel names the same
// models in English), so they translate by key.
export const EN_ATMOSPHERES = {
  'atmW.row.model': 'Model',
  'atmW.row.assumes': 'What it leaves out',
  'atmW.refused': 'No solution in this model',
  'atmW.on': 'planet’s own',
  'atmW.off': 'my own',
  'atmW.at.surface': 'surface',
  'atmW.at.bar': '1 bar level',
  'atmW.control.body': 'Planet',
  'atmW.axis.temperature': 'Temperature (K)',
  'atmW.body.venus': 'Venus',
  'atmW.body.earth': 'Earth',
  'atmW.body.mars': 'Mars',
  'atmW.body.jupiter': 'Jupiter',
  'atmW.body.uranus': 'Uranus',
  'atmW.body.neptune': 'Neptune',
  'atmW.m.eq': 'Equilibrium (emission) temperature',
  'atmW.m.gr': 'Gray radiative equilibrium, Eddington closure',
  'atmW.m.sc': 'Isothermal scale height',
  'atmW.a.eq':
    'internal heat; any greenhouse effect; a surface (this is the temperature of a black body that radiates what the planet absorbs); a geometric albedo (the albedo here is the Bond albedo)',
  'atmW.a.gr':
    'convection; clouds; absorption of sunlight inside the atmosphere; any dependence of opacity on wavelength (gray opacity); the Eddington closure is about 4 percent warm at the top',
  'atmW.a.sc':
    'a temperature that changes with height; gravity that changes with height; mixing above the homopause; the thickness of the atmosphere (it has none: the pressure only falls)',
  'atmW.b.title': 'What temperature does sunlight alone give a planet?',
  'atmW.b.note':
    'The equilibrium temperature is the temperature of a black body that radiates what the planet absorbs. It is not the temperature of the ground. Set it beside the temperature measured at the surface (at the 1 bar level for a giant planet, which has no surface) and read the difference.',
  'atmW.b.control.own': 'Albedo',
  'atmW.b.control.albedo': 'My Bond albedo',
  'atmW.b.control.redistribution': 'Heat carried to the night side',
  'atmW.b.row.teq': 'Equilibrium temperature',
  'atmW.b.row.measured': 'Measured temperature, {where}',
  'atmW.b.row.difference': 'Measured minus equilibrium',
  'atmW.b.row.reading': 'What the difference says',
  'atmW.b.reading.terrestrial':
    'The surface is warmer than sunlight alone gives: the atmosphere keeps heat in.',
  'atmW.b.reading.terrestrial.below':
    'The surface is not warmer than sunlight alone gives.',
  'atmW.b.reading.giant':
    'A giant planet has no surface, and it also gives off heat of its own that this model leaves out: the difference is not a greenhouse effect.',
  'atmW.b.row.layer':
    'Emissivity of one layer that would give the measured temperature',
  'atmW.b.row.gray':
    'Gray optical depth that would give the measured temperature',
  'atmW.b.axis.x': 'Distance from the Sun (AU)',
  'atmW.b.legend.model':
    'Equilibrium temperature at any distance, with the albedo set for {body}',
  'atmW.b.legend.emission':
    'Equilibrium temperature of each planet, its own albedo',
  'atmW.b.legend.measured': 'Measured temperature of each planet',
  'atmW.g.title': 'Two greenhouse models, one planet',
  'atmW.g.note':
    'One absorbing layer and a gray atmosphere with an optical depth are different models. Their free numbers, an emissivity and an optical depth, are different quantities, and they give the same ground temperature only for matching values. The blue curve is the Eddington solution; the dashed green curve is the exact gray solution, so you can see how far the approximation is from the full calculation.',
  'atmW.g.control.tau': 'Optical depth (gray model)',
  'atmW.g.control.emissivity': 'Emissivity (one layer)',
  'atmW.g.row.te': 'Equilibrium temperature',
  'atmW.g.row.measured': 'Measured surface temperature',
  'atmW.g.row.gray': 'Ground temperature, gray model',
  'atmW.g.row.layer': 'Ground temperature, one layer',
  'atmW.g.row.needLayer':
    'Emissivity of one layer that gives the measured temperature',
  'atmW.g.row.needGray': 'Optical depth that gives the measured temperature',
  'atmW.g.row.gap': 'Eddington against the exact gray solution, at the top',
  'atmW.g.axis.x': 'Optical depth from the top',
  'atmW.g.legend.eddington': 'Eddington',
  'atmW.g.legend.exact': 'Exact gray',
  'atmW.g.legend.ground': 'Gray model: the ground',
  'atmW.g.legend.layer': 'One layer: the ground',
  'atmW.s.title': 'How quickly does the air thin out?',
  'atmW.s.note':
    'In an isothermal atmosphere the pressure falls by the same factor over every scale height. The scale height is not the thickness of the atmosphere: there is no top, and the pressure only keeps falling.',
  'atmW.s.control.own': 'Temperature',
  'atmW.s.control.temperature': 'My temperature',
  'atmW.s.axis.x': 'Height above the surface (km)',
  'atmW.s.axis.y': 'Pressure as a fraction of the surface pressure',
  'atmW.s.legend.chosen': '{body} at the temperature set',
  'atmW.s.row.height': 'Scale height',
  'atmW.s.row.third':
    'Pressure at three scale heights, as a share of the surface value',
  'atmW.s.row.inputs': 'Inputs',
  'atmW.s.value.inputs':
    'T = {T} K, mean molecular weight {mu}, gravity {g} m/s²',
  // <bands>
  'atmW.m.tx': 'Band-integrated transmission',
  'atmW.a.tx':
    'a temperature that changes with height; clouds and hazes; scattering; more than one absorber; pressure broadening; limb darkening and the planet’s path across the star; a resolved spectrum (this is a depth over each named band); the table is a synthetic absorber, not a molecule',
  'atmW.x.title': 'What does one band’s depth say about the atmosphere?',
  'atmW.x.note':
    'Three bands of a synthetic absorber. A strong band is deeper than a weak one by about one scale height of the atmosphere for every factor e in absorption.',
  'atmW.x.control.t': 'Temperature',
  'atmW.x.control.x': 'Abundance, log of mixing ratio',
  'atmW.x.control.p': 'Reference pressure, log of bar',
  'atmW.x.axis.x': 'Wavelength (µm)',
  'atmW.x.axis.y': 'Transit depth (ppm)',
  'atmW.x.legend.depth': 'Band depth',
  'atmW.x.legend.err': 'Depth plus the model’s stated error',
  'atmW.x.legend.errLow': 'Depth minus the model’s stated error',
  'atmW.x.row.diff': 'Strong band minus weak band',
  'atmW.x.row.h': 'Scale height',
  'atmW.x.row.err': 'Stated error of the atmospheric part',
  'atmW.x.row.say': 'What it says',
  'atmW.x.say':
    'A difference of {d} ppm is consistent with this absorber at a scale height of {h} km under the assumptions listed.',
  // </bands>
  'atmW.m.ec': 'Blackbody plus one band (eclipse)',
  'atmW.a.ec':
    'a day side that is not uniform; a band that emits instead of absorbing; reflected light in the same band (a depth is not turned into a temperature where it could matter); any structure in the atmosphere below the skin',
  'atmW.e.title': 'How hot is the day side?',
  'atmW.e.note':
    'The eclipse depth is the planet’s share of the light. An absorbing band sees the cooler skin, so its depth dips.',
  'atmW.e.control.tp': 'Planet temperature',
  'atmW.e.control.ts': 'Star temperature',
  'atmW.e.control.tau': 'Band optical depth',
  'atmW.e.axis.x': 'Wavelength (µm)',
  'atmW.e.axis.y': 'Eclipse depth (%)',
  'atmW.e.legend.cont': 'No absorber',
  'atmW.e.legend.dip': 'With the 4.3 µm band absorbing',
  'atmW.e.row.bt': 'Brightness temperature, 3.6 to 4.5 µm',
  'atmW.m.ph': 'Lambert-sphere phase curve',
  'atmW.a.ph':
    'a planet that is not a Lambert sphere (real phase functions differ); thermal phase variation; clouds; polarisation; the albedo found is the albedo of a Lambert sphere',
  'atmW.p.title': 'What does a phase curve say about albedo?',
  'atmW.p.note':
    'The dashed curve is another sphere, a Lommel-Seeliger one: the same planet can be fit by both, and only the shape tells them apart.',
  'atmW.p.control.ag': 'Geometric albedo',
  'atmW.p.control.a': 'Orbit size, in planet radii',
  'atmW.p.axis.x': 'Phase angle (degrees)',
  'atmW.p.axis.y': 'Planet to star flux (ppm)',
  'atmW.p.legend.lambert': 'Lambert sphere',
  'atmW.p.legend.ls': 'Lommel-Seeliger sphere',
  'atmW.p.row.bond': 'Bond albedo of a Lambert sphere',
};
