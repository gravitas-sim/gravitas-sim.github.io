// =============================================================================
// The interiors instruments' words, in English
// -----------------------------------------------------------------------------
// Registered by js/interiorsWidgets.js when the family loads, so no other page
// carries them. intW.* ids. The same keys are in es.interiors.js.
// =============================================================================

export const EN_INTERIORS = {
  'intW.row.source': 'What this is',
  'intW.row.how': 'What is left out',
  'intW.p.title': 'Inside a star: a polytrope',
  'intW.p.note':
    'A star whose pressure follows P = K ρ^(1 + 1/n), built from the Lane-Emden equation. The curves run from the center (left) to the surface (right): density (blue), pressure (orange), temperature for an ideal gas (dashed) and the fraction of the mass inside that radius (gray). The dot is the radius that holds half the mass.',
  'intW.p.control.n': 'Polytropic index n',
  'intW.p.control.mass': 'Mass of the star',
  'intW.p.control.radius': 'Radius of the star',
  'intW.p.preset.sun': 'The Sun as n = 3 (Eddington)',
  'intW.p.preset.dwarf': 'A red dwarf as n = 3/2',
  'intW.p.preset.uniform': 'Uniform density, n = 0',
  'intW.p.preset.centred': 'Centrally condensed, n = 4.5',
  'intW.p.axisR': 'radius, as a fraction of the star’s',
  'intW.p.axisY': 'fraction of the central value (or of the mass)',
  'intW.p.legend': 'density · pressure · temperature · mass inside',
  'intW.p.value.source':
    'A model: a polytrope of the index you choose, scaled to a mass and a radius',
  'intW.p.value.how':
    'No energy generation, opacity or convection (they would set the index and the radius, not follow from it); the temperature assumes an ideal gas with a mean molecular weight of 0.6, so it fails above about 10 solar masses where radiation pressure matters',
  'intW.p.row.n': 'Polytropic index n',
  'intW.p.row.mass': 'Mass',
  'intW.p.row.radius': 'Radius',
  'intW.p.row.xi1': 'Dimensionless radius ξ₁ (first zero of θ)',
  'intW.p.row.massConst': 'Dimensionless mass −ξ₁² θ′(ξ₁)',
  'intW.p.row.ratio': 'Central density divided by the mean density',
  'intW.p.row.rhoMean': 'Mean density',
  'intW.p.row.rhoC': 'Central density',
  'intW.p.row.pC': 'Central pressure',
  'intW.p.row.tC': 'Central temperature',
  'intW.p.row.half':
    'Radius holding half the mass, as a fraction of the star’s',
  'intW.p.row.approx': 'What it approximates',
  'intW.p.approx.0':
    'Nothing real: a uniform ball, the limit of an incompressible fluid',
  'intW.p.approx.low':
    'A fully convective star (a red dwarf) or a low-mass white dwarf',
  'intW.p.approx.mid':
    'A star like the Sun or hotter, where radiation carries the energy: n = 3 is Eddington’s standard model',
  'intW.p.approx.high':
    'A very centrally condensed star: a dense core in a tenuous envelope, like a giant',
  'intW.w.title': 'White dwarfs: mass and radius',
  'intW.w.note':
    'A white dwarf held up by a cold gas of degenerate electrons (Chandrasekhar’s equation of state), integrated outward from the central density you choose. The curve is every such star; the dot is yours; the dashed line is the mass the curve approaches and never passes. No observed white dwarfs are drawn.',
  'intW.w.control.rho': 'Central density',
  'intW.w.control.muE': 'Nucleons per electron, μₑ',
  'intW.w.preset.light': 'A low-density dwarf',
  'intW.w.preset.typical': 'A typical dwarf, 0.6 solar masses',
  'intW.w.preset.heavy': 'A dense dwarf near the limit',
  'intW.w.preset.hydrogen': 'A hypothetical hydrogen star, μₑ = 1',
  'intW.w.axisM': 'mass, solar masses',
  'intW.w.axisR': 'radius, solar radii (log)',
  'intW.w.legend': 'every dwarf · yours · the limit',
  'intW.w.value.source':
    'A model: a cold, ideal degenerate electron gas, the ions only supply the mass, no corrections',
  'intW.w.value.how':
    'Coulomb interactions between ions and electrons, the composition layers, finite temperature, general relativity, and the electron captures and instabilities that end a real dwarf a little below the limit; the radius is a few percent too large against the best published relations',
  'intW.w.value.rel': 'Relativistic: the electrons’ speeds are near c',
  'intW.w.value.nonrel': 'Non-relativistic: the electrons are slow',
  'intW.w.row.rho': 'Central density',
  'intW.w.row.muE': 'Nucleons per electron μₑ',
  'intW.w.row.x': 'Central Fermi momentum, in units of mₑc',
  'intW.w.row.regime': 'Regime at the center',
  'intW.w.row.mass': 'Mass',
  'intW.w.row.radius': 'Radius',
  'intW.w.row.radiusKm': 'Radius, in kilometers',
  'intW.w.row.mean': 'Mean density',
  'intW.w.row.limit': 'Limiting mass for this μₑ',
  'intW.w.row.fraction': 'Mass divided by the limit',
  'intW.s.title': 'Scaling the main sequence',
  'intW.s.note':
    'The zero-age stars of the MIST models (dots, eight masses) against the exponent a scaling argument predicts (lines: one fitted over 0.5 to 2 solar masses, dashed, and one over 2 to 40). The scaling fixes the slope, not the height; the lines are slid to fit.',
  'intW.s.control.quantity': 'Quantity',
  'intW.s.control.opacity': 'Opacity law',
  'intW.s.control.energy': 'Energy source',
  'intW.s.control.model': 'Zero-age model',
  'intW.s.quantity.L': 'Luminosity',
  'intW.s.quantity.R': 'Radius',
  'intW.s.quantity.tau': 'Main-sequence life',
  'intW.s.opacity.es': 'Electron scattering',
  'intW.s.opacity.kramers': 'Kramers',
  'intW.s.energy.cno': 'CNO cycle (steep)',
  'intW.s.energy.pp': 'Proton-proton chain',
  'intW.s.preset.massive': 'Luminosity of massive stars',
  'intW.s.preset.low': 'Luminosity of low-mass stars',
  'intW.s.preset.radius': 'Radius of massive stars',
  'intW.s.preset.life': 'Lifetimes',
  'intW.s.axisM': 'mass, solar masses (log)',
  'intW.s.axisY.L': 'log₁₀ of the luminosity, solar',
  'intW.s.axisY.R': 'log₁₀ of the radius, solar',
  'intW.s.axisY.tau': 'log₁₀ of the main-sequence life, years',
  'intW.s.legend': 'MIST zero-age models · predicted exponent, two ranges',
  'intW.s.value.source':
    'A scaling argument set against MIST model stars, which are themselves models, not observed stars',
  'intW.s.value.how':
    'Homology assumes every star is a scaled copy with one opacity law and one reaction throughout; real stars change both from the core to the surface and from low mass to high, which is what the residuals measure',
  'intW.s.row.predicted': 'Exponent the scaling predicts',
  'intW.s.row.fitLow': 'Exponent fitted over 0.5 to 2 solar masses',
  'intW.s.row.rmsLow':
    'Scatter about the predicted exponent, 0.5 to 2 solar masses (dex)',
  'intW.s.row.fitHigh': 'Exponent fitted over 2 to 40 solar masses',
  'intW.s.row.rmsHigh':
    'Scatter about the predicted exponent, 2 to 40 solar masses (dex)',
  'intW.s.row.model': 'Selected model, mass',
  'intW.s.row.lum': 'Its luminosity',
  'intW.s.row.rad': 'Its radius',
  'intW.s.row.life': 'Its main-sequence life (MIST)',
  'intW.s.row.nuclear': 'Nuclear timescale 0.007 × 0.1 M c² ÷ L',
};
