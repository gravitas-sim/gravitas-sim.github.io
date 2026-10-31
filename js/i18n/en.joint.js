// The joint-fit panels' words, in English (Prompt 227). The system is synthetic and the panels say
// so; the star is an input with a stated uncertainty and a source, never a fitted result.
export const EN_JOINT = {
  'jointW.fit.title': 'The planet and its star',
  'jointW.fit.note':
    'One fit of a transit and thirty velocities gives the planet’s orbit and the amplitude of the star’s wobble. The planet’s mass, radius and density also need the star’s mass and radius, which are stated, not fitted. Change what is stated and see how much of each uncertainty is the star’s.',
  'jointW.mr.title': 'Mass and radius',
  'jointW.mr.note':
    'The planet on a diagram of radius against mass, with the lines of constant density and the planets of the Solar System. Both axes are logarithms. The box is one sigma; the dashed box is what the data alone would say with the star taken as exact, which the fit does not report.',
  'jointW.control.massPct': 'Stellar mass uncertainty',
  'jointW.control.radiusPct': 'Stellar radius uncertainty',
  'jointW.control.correlation': 'Correlation of the two',
  'jointW.control.starMass': 'Stated stellar mass',
  'jointW.control.starRadius': 'Stated stellar radius',
  'jointW.control.alone': 'Show the data alone',
  'jointW.control.lines': 'Show lines of constant density',
  'jointW.on': 'on',
  'jointW.off': 'off',
  'jointW.axis.pct':
    'Uncertainty of the stellar mass and radius, percent of each',
  'jointW.axis.rho': 'Uncertainty of the planet’s density, percent',
  'jointW.axis.logM': 'log10 of the mass, in Earth masses',
  'jointW.axis.logR': 'log10 of the radius, in Earth radii',
  'jointW.legend.alone': 'The data alone',
  'jointW.legend.star': 'With the star',
  'jointW.legend.now': 'As stated',
  'jointW.legend.solar': 'Solar System',
  'jointW.legend.planet': 'This planet',
  'jointW.legend.box': 'One sigma',
  'jointW.legend.boxAlone': 'The data alone',
  'jointW.legend.density': 'Constant density {d} g/cm3',
  'jointW.row.system': 'The system',
  'jointW.row.star': 'The star (an input)',
  'jointW.row.mass': 'Mass',
  'jointW.row.radius': 'Radius',
  'jointW.row.density': 'Density',
  'jointW.row.tension': 'Does the star fit the transit?',
  'jointW.row.rates': 'What leaving the star out costs',
  'jointW.row.class': 'What the density says',
  'jointW.row.assumes': 'What it assumes',
  'jointW.v.system':
    'Synthetic: a light curve of four transits and 30 velocities from two instruments, fitted together with one period and one epoch (jitter {j} m/s, chi-square {c} for {d} degrees of freedom). Not a real star.',
  'jointW.v.star':
    'Mass {m} solar masses plus or minus {sm} percent, radius {r} solar radii plus or minus {sr} percent, correlation {rho}. Source: stated for this investigation (a catalog-like entry for a synthetic star).',
  'jointW.v.mass':
    '{v} plus or minus {s} Jupiter masses ({e} Earth masses). The data alone give plus or minus {a}, the star adds {b}; the star holds {p} percent of the variance.',
  'jointW.v.radius':
    '{v} plus or minus {s} Jupiter radii. The data alone give plus or minus {a}, the star adds {b}; the star holds {p} percent of the variance.',
  'jointW.v.density':
    '{v} plus or minus {s} g/cm3, with the star’s mass and radius inside it. The data alone give plus or minus {a}, the star adds {b}; the star holds {p} percent of the variance.',
  'jointW.v.tension':
    'The transit gives the star a density of {t} plus or minus {st} g/cm3; the stated mass and radius give {s} plus or minus {ss}. The difference is {z} sigma{flag}.',
  'jointW.v.tensionFlag':
    ' (more than 3: the stated star and the transit disagree, and the planet’s density is only as good as that star)',
  'jointW.v.rates':
    'On a seeded ensemble of {n} systems whose stars were drawn from their stated uncertainty, the one-sigma interval held the truth, with the star inside it and with the star taken as exact, {m} and {n2} percent of the time for the mass, {a} and {b} percent for the radius and {c} and {d} percent for the density. One sigma should hold it about 68 percent of the time; the star matters most for the mass.',
  'jointW.v.class':
    '{c}: a convention on bulk density (below 1.8 g/cm3 volatile-rich, 1.8 to 3 rock and ice, above 3 rocky). It cannot tell hydrogen and helium from water ice, and a large planet’s density is lower than its material’s because of its own weight.',
  'jointW.class.rocky': 'Rocky',
  'jointW.class.rock-ice': 'Rock and ice',
  'jointW.class.volatile-rich': 'Volatile-rich',
  'jointW.v.ambiguous':
    ' The density is within 2 sigma of a boundary, so the class is ambiguous.',
  'jointW.a':
    'One planet on one orbit, circular here; the star’s mass and radius are independent inputs with the stated uncertainty and correlation; the covariance is the fit’s, linearized. The numbers are first order; a Monte Carlo agrees to a few percent.',
};
