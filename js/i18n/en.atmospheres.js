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
  'atmW.m.gr': 'Grey radiative equilibrium, Eddington closure',
  'atmW.m.sc': 'Isothermal scale height',
  'atmW.a.eq':
    'internal heat; any greenhouse effect; a surface (this is the temperature of a black body that radiates what the planet absorbs); a geometric albedo (the albedo here is the Bond albedo)',
  'atmW.a.gr':
    'convection; clouds; absorption of sunlight inside the atmosphere; any dependence of opacity on wavelength (grey opacity); the Eddington closure is about 4 percent warm at the top',
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
  'atmW.b.row.grey':
    'Grey optical depth that would give the measured temperature',
  'atmW.b.axis.x': 'Distance from the Sun (AU)',
  'atmW.b.legend.model':
    'Equilibrium temperature at any distance, with the albedo set for {body}',
  'atmW.b.legend.emission':
    'Equilibrium temperature of each planet, its own albedo',
  'atmW.b.legend.measured': 'Measured temperature of each planet',
  'atmW.g.title': 'Two greenhouse models, one planet',
  'atmW.g.note':
    'One absorbing layer and a grey atmosphere with an optical depth are different models. Their free numbers, an emissivity and an optical depth, are different quantities, and they give the same ground temperature only for matching values. The blue curve is the Eddington solution; the dashed green curve is the exact grey solution, so you can see how far the approximation is from the full calculation.',
  'atmW.g.control.tau': 'Optical depth of the whole atmosphere (grey model)',
  'atmW.g.control.emissivity': 'Emissivity of the layer (one-layer model)',
  'atmW.g.row.te': 'Equilibrium temperature',
  'atmW.g.row.measured': 'Measured surface temperature',
  'atmW.g.row.grey': 'Ground temperature, grey model',
  'atmW.g.row.layer': 'Ground temperature, one layer',
  'atmW.g.row.needLayer':
    'Emissivity of one layer that gives the measured temperature',
  'atmW.g.row.needGrey': 'Optical depth that gives the measured temperature',
  'atmW.g.row.gap': 'Eddington against the exact grey solution, at the top',
  'atmW.g.axis.x': 'Optical depth from the top',
  'atmW.g.legend.eddington': 'Eddington',
  'atmW.g.legend.exact': 'Exact grey',
  'atmW.g.legend.ground': 'Grey model: the ground',
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
};
