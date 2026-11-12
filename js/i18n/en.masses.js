// The mass panels' words, in English (Prompt 218). The assumption lines are fixed
// text, so they translate by key.
export const EN_MASSES = {
  'masW.on': 'on',
  'masW.off': 'off',
  'masW.v.deg': '{x}°',
  'masW.axis.phase': 'Orbital phase',
  'masW.axis.flux': 'Relative flux',
  'masW.axis.rv': 'Radial velocity minus the systemic velocity (km/s)',
  'masW.axis.logM': 'log10 of the mass (solar masses)',
  'masW.axis.logR': 'log10 of the radius (solar radii)',
  'masW.axis.logL': 'log10 of the luminosity (solar luminosities)',
  'masW.legend.star1': 'Star 1, data',
  'masW.legend.star2': 'Star 2, data',
  'masW.legend.model1': 'Star 1, fit',
  'masW.legend.model2': 'Star 2, fit',
  'masW.legend.flux': 'Synthetic light curve',
  'masW.legend.fit': 'Fit',
  'masW.legend.zams': 'MIST, zero age',
  'masW.legend.tams': 'MIST, end of the main sequence',
  'masW.legend.star': 'Solved stars',
  'masW.m.title': 'Minimum masses from velocities',
  'masW.m.note':
    'Two Doppler curves of one orbit give the ratio of the masses and the size of the orbit times sin i, so every mass is a minimum: the true mass is larger by 1 / sin³ i, and without an eclipse or another measurement the inclination is not known. Choose the inclination to see what the masses would be. A single-lined orbit gives only the mass function. Every data set here is synthetic.',
  'masW.m.control.system': 'System',
  'masW.m.control.inc': 'Inclination you assume',
  'masW.m.system.0': 'two lines, no eclipse',
  'masW.m.system.1': 'one line',
  'masW.row.data': 'Data',
  'masW.v.data':
    '{n} velocities of each star, {s} km/s per point; orbit fitted',
  'masW.v.data1':
    '{n} velocities of one star, {s} km/s per point; orbit fitted',
  'masW.row.orbit': 'Orbit',
  'masW.v.orbit': 'period {p} ± {ps} d, e = {e}',
  'masW.row.K1': 'K1, star 1',
  'masW.row.K2': 'K2, star 2',
  'masW.v.K': '{v} ± {s} km/s',
  'masW.row.q': 'Mass ratio M2 / M1',
  'masW.v.q': '{v} ± {s}, which is K1 / K2',
  'masW.row.asini': 'a sin i',
  'masW.v.asini': '{v} ± {s} solar radii',
  'masW.row.min1': 'Minimum mass of star 1',
  'masW.row.min2': 'Minimum mass of star 2',
  'masW.v.min': 'at least {v} ± {s} solar masses (M sin³ i)',
  'masW.row.atInc': 'At your inclination',
  'masW.v.atInc':
    'i = {i}°: star 1 would be {a}, star 2 {b} solar masses; the true inclination is not in these data',
  'masW.row.mf': 'Mass function',
  'masW.v.mf':
    '{v} ± {s} solar masses: the one number a single line fixes; no mass of either star follows from it',
  'masW.row.min': 'Minimum companion mass',
  'masW.v.minCompanion':
    'at least {v} solar masses, for a primary of {m} solar masses that you were told, and i = 90°',
  'masW.v.atIncCompanion':
    'i = {i}°: the companion would be {v} solar masses, for the same primary',
  'masW.row.assumes': 'Assumes',
  'masW.a.min':
    'Two stars on one Kepler orbit, the velocities as given with their error bars, one systemic velocity; the masses are minima until an inclination is known',
  'masW.a.sb1':
    'One star’s velocities only; the primary’s mass is a number you were given, not measured, so the companion’s mass is a minimum conditional on it',
  'masW.row.refused': 'Refused',
  'masW.s.title': 'Weigh the stars',
  'masW.s.note':
    'One fit of the eclipse light curve and both radial-velocity curves, sharing one orbit. The light curve gives the inclination and the radii as fractions of the orbit; the velocities give the size of the orbit and the mass ratio. Together: the masses and radii of both stars, with the uncertainty of the whole fit carried through. Every data set here is synthetic; the truth is shown when asked.',
  'masW.s.control.system': 'System',
  'masW.s.control.lines': 'Stars with a velocity curve',
  'masW.s.control.view': 'Curve shown',
  'masW.s.control.truth': 'Show what made the data',
  'masW.s.system.0': 'F-star pair',
  'masW.s.system.1': 'eccentric pair',
  'masW.s.system.2': 'low-mass pair',
  'masW.s.system.3': 'hot pair',
  'masW.s.view.0': 'light curve',
  'masW.s.view.1': 'velocities',
  'masW.s.lines.1': 'one (single-lined)',
  'masW.s.lines.2': 'both',
  'masW.row.system': 'Data',
  'masW.v.system':
    '{n} light-curve rows ({f} per point), {r} velocities per star ({s} km/s per point), period {p} d',
  'masW.row.geometry': 'From the eclipses',
  'masW.v.geometry': 'inclination {i}° ± {si}, R1/a = {r1}, R2/a = {r2}',
  'masW.row.masses': 'Masses',
  'masW.v.massesPair': 'M1 = {a} ± {sa}, M2 = {b} ± {sb} solar masses',
  'masW.v.massesOpen':
    'M1 = {a}, M2 = {b} solar masses, not constrained ({why})',
  'masW.row.radii': 'Radii',
  'masW.v.radiiPair': 'R1 = {a} ± {sa}, R2 = {b} ± {sb} solar radii',
  'masW.v.radiiOpen': 'R1 = {a}, R2 = {b} solar radii, not constrained ({why})',
  'masW.row.sep': 'Orbit',
  'masW.v.sep': 'semi-major axis {a} ± {sa} solar radii, mass ratio {q} ± {sq}',
  'masW.row.logg': 'Surface gravity',
  'masW.v.logg': 'log g = {a} and {b} (cgs)',
  'masW.row.share': 'Inclination in the mass',
  'masW.v.share':
    'the inclination carries {x} percent of the variance of M1: the eclipse fixes it so well that the masses’ uncertainty is the velocities’',
  'masW.row.verdict': 'What the data fix',
  'masW.verdict.constrained':
    'constrained: every fitted parameter is fixed to its stated uncertainty',
  'masW.verdict.open': 'not constrained: {names}',
  'masW.why.rank': 'the data leave a direction open',
  'masW.why.bound': 'it sits on its bound',
  'masW.why.uncertain': 'its uncertainty is over a quarter of its value',
  'masW.why.derived': 'it follows from a parameter the data leave open',
  'masW.why.singular': 'the covariance is singular',
  'masW.row.chi2': 'Goodness of fit',
  'masW.v.chi2':
    'reduced chi-square {c} on {d} degrees of freedom; correlated-noise factor {b}',
  'masW.row.single': 'One line only',
  'masW.v.single':
    'no second velocity curve, so no mass ratio: the fit returns the mass function {f} solar masses and, for a primary of {m} solar masses that you were told, a companion of at least {v}. It does not return a mass, with or without the eclipse',
  'masW.row.truth': 'What made it',
  'masW.v.truth':
    'M1 {a}, M2 {b} solar masses; R1 {c}, R2 {d} solar radii; inclination {i}°; K1 {k1}, K2 {k2} km/s',
  'masW.a.solve':
    'The detached model of the inference core (two spheres on one Kepler orbit, limb darkening fixed, no third light) and its velocity curves from the same orbit; the masses use the nominal solar GM, the radii the nominal solar radius',
  'masW.d.title': 'Masses and radii against MIST',
  'masW.d.note':
    'The stars you have solved, with their masses and radii (or luminosities) against the MIST tracks at solar composition. The lower line is a star just born on the main sequence and the upper one a star at its end; a main-sequence star should sit between them. Temperatures are inputs: star 1’s is given, star 2’s follows from the fitted surface brightness ratio in the 0.8 micrometer band.',
  'masW.d.control.view': 'Vertical axis',
  'masW.d.control.systems': 'Systems solved',
  'masW.d.control.band': 'MIST band',
  'masW.d.view.0': 'radius',
  'masW.d.view.1': 'luminosity',
  'masW.row.star': 'System {id}, star {n}',
  'masW.v.starR': '{m} ± {sm} solar masses, {r} ± {sr} solar radii; {where}',
  'masW.v.starL':
    '{m} ± {sm} solar masses, luminosity {l} ± {sl} solar, temperature {t} ± {st} K; {where}',
  'masW.where.in': 'inside the MIST band',
  'masW.where.out': 'outside the MIST band',
  'masW.row.band': 'The band',
  'masW.v.band':
    'MIST v1.2, solar composition, no rotation: zero-age and terminal-age main sequences from 0.2 to 40 solar masses',
  'masW.row.limits': 'Limits',
  'masW.a.diagram':
    'The systems here are synthetic: their radii and temperatures were read from these tracks at a stated fraction of main-sequence life and rounded; they agree with MIST by construction, and a real star may not',
  'masW.vb.title': 'Weighing a visual pair',
  'masW.vb.note':
    'Two stars on the sky, seen as one orbit. When both are resolved, each star’s own motion about the moving center of mass gives the mass fraction, and the orbit with a parallax gives the mass sum: together, both masses. When the pair is not resolved, the photocenter (the center of the light) traces the same ellipse scaled by (l − B), the light fraction minus the mass fraction, so the orbit with a parallax gives only a mass function, and a companion’s mass needs a light fraction and a primary mass you state, and has a second root. Every data set here is synthetic.',
  'masW.vb.control.system': 'System',
  'masW.vb.control.view': 'What is seen',
  'masW.vb.control.arc': 'Arc observed (periods)',
  'masW.vb.control.snr': 'Parallax signal-to-noise',
  'masW.vb.system.0': 'A, a faint companion',
  'masW.vb.system.1': 'B, nearly equal stars',
  'masW.vb.system.2': 'C, a low-mass companion',
  'masW.vb.view.0': 'both stars resolved',
  'masW.vb.view.1': 'one photocenter',
  'masW.vb.axis.east': 'East offset (arcseconds)',
  'masW.vb.axis.north': 'North offset (arcseconds)',
  'masW.vb.legend.star1': 'Star 1 about the center of mass',
  'masW.vb.legend.star2': 'Star 2 about the center of mass',
  'masW.vb.legend.fit1': 'Star 1, fitted',
  'masW.vb.legend.fit2': 'Star 2, fitted',
  'masW.vb.legend.photocentre': 'Photocenter, data',
  'masW.vb.legend.photocentreFit': 'Photocenter, fitted',
  'masW.vb.legend.relative': 'Relative orbit of the pair (the truth)',
  'masW.vb.row.data': 'Data',
  'masW.vb.v.dataBoth':
    '{n} epochs of both stars over {a} periods, {s} milliarcseconds per axis for each; parallax {p} ± {sp} milliarcseconds ({frame})',
  'masW.vb.v.dataPhot':
    '{n} epochs of the photocenter over {a} periods, {s} milliarcseconds per axis; parallax {p} ± {sp} milliarcseconds ({frame})',
  'masW.vb.row.orbit': 'Orbit',
  'masW.vb.v.orbit':
    'period {p} ± {ps} years, semi-major axis {a} ± {as} milliarcseconds, eccentricity {e}',
  'masW.vb.row.sum': 'Mass sum',
  'masW.vb.v.sum':
    '{v} solar masses; 68 percent between {lo} and {hi}, 95 percent between {lo2} and {hi2}',
  'masW.vb.row.frame': 'Parallax frame',
  'masW.vb.row.fraction': 'Mass fraction of star 2',
  'masW.vb.v.fraction':
    'B = {v} ± {s}; the stars’ own ellipses are in the ratio {r} : 1',
  'masW.vb.row.masses': 'Masses',
  'masW.vb.v.masses':
    'M1 {a} solar masses (68 percent {alo} to {ahi}), M2 {b} solar masses (68 percent {blo} to {bhi})',
  'masW.vb.row.function': 'Photocenter mass function',
  'masW.vb.v.function':
    '{v} solar masses, 68 percent between {lo} and {hi}: a mass function, not a mass',
  'masW.vb.row.naive': 'If it were read as the mass sum',
  'masW.vb.v.naive':
    'the number above is {x} of the true sum {t}: the photocenter’s ellipse is smaller than the pair’s by the factor |l − B| = {f}, and the mass by its cube',
  'masW.vb.row.given': 'What you state',
  'masW.vb.v.given':
    'the companion’s light fraction l = {l} ± {sl} and the primary’s mass {m} ± {sm} solar masses',
  'masW.vb.row.root': 'Companion, root {n}',
  'masW.vb.v.rootAbove':
    'M2 = {m} solar masses (68 percent {lo} to {hi}), B = {b}: the companion carries a larger share of the mass than of the light',
  'masW.vb.v.rootBelow':
    'M2 = {m} solar masses (68 percent {lo} to {hi}), B = {b}: ambiguous root, the companion would be lighter than its share of the light; the orbit alone does not choose',
  'masW.vb.row.truth': 'What made it',
  'masW.vb.v.truth':
    'M1 {a}, M2 {b} solar masses (sum {c}, B {bb}); light fraction l {l}; parallax {p} milliarcseconds; the photocenter’s axis is {f} of the pair’s',
  'masW.vb.row.refused': 'Refused',
  'masW.vb.row.companion': 'Companion',
  'masW.vb.a':
    'The apparent-orbit fit of the relative offsets (or of the photocenter about the barycenter); a parallax with its frame statement; a constant offset and a proper motion fitted with the mass fraction. Common-mode frame errors, a third body and radial-velocity coupling are not modeled; the data are synthetic',
  'masW.vb.frame.absolute': 'absolute',
  'masW.vb.frame.absolute.long':
    'the parallax is absolute (corrected to the stated source); the correction and its uncertainty are in the parallax given',
  'masW.vb.frame.relative': 'relative to the reference stars',
  'masW.vb.frame.relative.long':
    'the parallax is relative to the reference stars of its frame, which is smaller than the absolute parallax by their mean parallax: the distance and the mass sum read high by that much',
};
