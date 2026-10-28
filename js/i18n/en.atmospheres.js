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
  'atmW.row.data': 'Data',
  'atmW.m.ec': 'Blackbody plus one band (secondary eclipse)',
  'atmW.m.ph': 'Lambert-sphere phase curve',
  'atmW.a.ec':
    'a day side that is not one uniform temperature; reflected light in the same band (a depth is not turned into a temperature unless you say none is there); a band that emits instead of absorbing; anything in the atmosphere below one isothermal skin; a filter profile (the band response is flat)',
  'atmW.a.ph':
    'a planet that is not a Lambert sphere (real phase functions differ); thermal phase variation; clouds; polarisation; the albedo found is the albedo of a Lambert sphere, and the Bond albedo it gives is the same assumption times 3/2',
  'atmW.e.title': 'How hot is the day side?',
  'atmW.e.note':
    'The eclipse depth is the share of the light that disappears when the planet goes behind its star. The model turns it into the temperature of a blackbody that would give that depth in that band, a brightness temperature. The depths here are synthetic: generated from the model with noise, and no published table was compared.',
  'atmW.e.control.dataset': 'Planet',
  'atmW.e.dataset.0': 'Planet X',
  'atmW.e.dataset.1': 'Planet Y',
  'atmW.e.control.tp': 'My blackbody temperature',
  'atmW.e.control.reflected': 'Reflected light',
  'atmW.e.reflected.0': 'allow for it',
  'atmW.e.reflected.1': 'assume none',
  'atmW.e.axis.x': 'Wavelength (µm)',
  'atmW.e.axis.y': 'Eclipse depth (ppm)',
  'atmW.e.legend.data': 'Synthetic eclipse depths, four bands',
  'atmW.e.legend.model': 'Blackbody at {T} K',
  'atmW.e.data':
    'synthetic, generated from the model with noise; no published table was compared',
  'atmW.e.row.bt': 'Brightness temperature, band {band} ({lo} to {hi} µm)',
  'atmW.e.value.bt': '{T} K (95 percent: {lo} to {hi} K)',
  'atmW.e.refused':
    'not converted: reflected light could be a tenth of this depth or more',
  'atmW.e.row.chi': 'My blackbody against the four depths',
  'atmW.e.value.chi':
    'chi-square {chi} for four depths at {T} K (about 4 when a model fits)',
  'atmW.p.title': 'What does a phase curve say about albedo?',
  'atmW.p.note':
    'The planet’s reflected light follows its phase, as the Moon’s does. For a Lambert sphere the curve has one shape and its height is the albedo. The curves here are synthetic: generated from a model with noise, and no published table was compared.',
  'atmW.p.control.dataset': 'Planet',
  'atmW.p.dataset.0': 'Planet P',
  'atmW.p.dataset.1': 'Planet Q',
  'atmW.p.control.ag': 'My geometric albedo',
  'atmW.p.axis.x': 'Phase angle (degrees; 0 is full phase)',
  'atmW.p.axis.y': 'Planet to star flux (ppm)',
  'atmW.p.legend.data': 'Synthetic phase curve',
  'atmW.p.legend.model': 'Lambert sphere, albedo {A}',
  'atmW.p.data':
    'synthetic, generated from a model with noise; no published table was compared',
  'atmW.p.row.fit': 'Geometric albedo of a Lambert sphere that fits',
  'atmW.p.value.fit': '{A} (95 percent: {lo} to {hi})',
  'atmW.p.flagged': 'none: a Lambert sphere does not describe this curve',
  'atmW.p.row.bond': 'Bond albedo of that Lambert sphere',
  'atmW.p.value.bond': '{B} (3/2 times {A})',
  'atmW.p.row.mine': 'My albedo against the curve',
  'atmW.p.value.mine':
    'chi-square {chi} for {n} points (about {dof} when a model fits)',
  'atmW.p.row.chi': 'Fit against the curve',
  'atmW.p.value.chi': 'chi-square {chi} for {dof} degrees of freedom',
};
