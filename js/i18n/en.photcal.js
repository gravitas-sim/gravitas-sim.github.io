// The photometric-calibration instrument's words, in English (Prompt 212). The model and
// what-it-leaves-out lines are fixed text, so they translate by key. The extinction here is
// ATMOSPHERIC; the interstellar extinction of the radiation model is a different quantity.
export const EN_PHOTCAL = {
  'pcW.title': 'From counts to magnitudes',
  'pcW.note':
    'A synthetic night of standard stars: their catalog magnitudes and colors are known, and the instrument’s magnitudes are made from a stated truth with noise. The fit finds the zero point, the extinction of the air and the color term; the plot shows what is left over; one target star is calibrated with the uncertainty the fit leaves. The extinction here is the atmosphere’s, in magnitudes per airmass, not the dust between the stars.',
  'pcW.chart': 'Calibration of a synthetic night',
  'pcW.control.night': 'The night',
  'pcW.control.stars': 'Standard stars used',
  'pcW.control.noise': 'Noise of each measurement',
  'pcW.control.reach': 'Highest airmass observed',
  'pcW.control.model': 'Model',
  'pcW.control.prior': 'Use a cited site coefficient',
  'pcW.control.view': 'Plot',
  'pcW.control.colour': 'Target color index',
  'pcW.control.airmass': 'Target airmass',
  'pcW.control.truth': 'Show the truth',
  'pcW.night.0': 'clear night',
  'pcW.night.1': 'one narrow airmass range',
  'pcW.night.2': 'color-dependent extinction',
  'pcW.model.0': 'first order',
  'pcW.model.1': 'with color-dependent extinction',
  'pcW.view.0': 'Bouguer line',
  'pcW.view.1': 'residuals against airmass',
  'pcW.view.2': 'residuals against color',
  'pcW.toggle.0': 'off',
  'pcW.toggle.1': 'on',
  'pcW.v.mmag': '{n} mmag',
  'pcW.axis.airmass': 'airmass',
  'pcW.axis.colour': 'color index of the standard',
  'pcW.axis.bouguer': 'm − M (magnitudes), color term removed',
  'pcW.axis.residual': 'residual (magnitudes)',
  'pcW.legend.used': 'standards used',
  'pcW.legend.out': 'excluded: above the airmass limit',
  'pcW.legend.fit': 'fit: slope k = {k}',
  'pcW.legend.res': 'residuals, with their errors',
  'pcW.legend.zero': 'zero',
  'pcW.row.model': 'Model',
  'pcW.m':
    'A synthetic night with a stated truth: M − m = Z1 − k (X − 1) + c C, with Z1 the zero point at unit airmass, k the extinction of the atmosphere in magnitudes per airmass, c a color term and X the airmass; weighted least squares, the error of a star’s catalog magnitude shared by its observations',
  'pcW.row.status': 'Status',
  'pcW.row.night': 'Night',
  'pcW.v.night': '{n} standard stars, {o} measurements, airmass {lo} to {hi}',
  'pcW.row.excluded': 'Excluded',
  'pcW.v.excluded':
    '{n} measurements above airmass {lim}, where a straight line in airmass is not trusted, left out and flagged',
  'pcW.row.zero': 'Zero point at airmass 1',
  'pcW.v.zero': '{z} mag',
  'pcW.v.zeroOpen':
    'not constrained: the standards were all seen at nearly one airmass, so the zero point and the extinction cannot be told apart',
  'pcW.row.k': 'Extinction of the air, k',
  'pcW.v.perAirmass': 'mag per airmass',
  'pcW.v.fromPrior': '(from the cited table; the night could not fix it)',
  'pcW.row.c': 'Color term, c',
  'pcW.row.k2': 'Extinction’s dependence on color, k2',
  'pcW.v.pm': '{v} ± {s}',
  'pcW.v.notConstrained': 'not constrained by this night',
  'pcW.row.fit': 'The fit',
  'pcW.v.fit':
    'chi-square {c} on {d} degrees of freedom (p = {p}); the residuals scatter by {r} mmag',
  'pcW.v.fitNone': 'no degrees of freedom left, so nothing checks the fit',
  'pcW.row.nested': 'Is there more in the data?',
  'pcW.v.nested':
    'adding a color-dependent extinction lowers chi-square by {d} (p = {p})',
  'pcW.row.target': 'Target star',
  'pcW.v.target':
    'instrumental magnitude {m}; calibrated magnitude {M} ± {s}; 95 percent interval {lo} to {hi}',
  'pcW.row.truth': 'Truth of the synthetic night',
  'pcW.v.truth': 'Z1 {z}, k {k}, c {c}; the target’s true magnitude {M}',
  'pcW.row.flags': 'Flags',
  'pcW.v.noflags': 'none',
  'pcW.flag.excluded': 'a measurement was excluded',
  'pcW.flag.airmass-above-limit':
    'a standard above the airmass limit was excluded',
  'pcW.flag.lack-of-fit':
    'lack of fit: the stated errors were widened by the scatter',
  'pcW.flag.colour-term-not-constrained':
    'the color term is not constrained: a stated systematic was added',
  'pcW.flag.extinction-from-prior': 'the extinction is the cited coefficient',
  'pcW.flag.extinction-not-constrained': 'the extinction is not constrained',
  'pcW.flag.second-order-not-constrained':
    'the color-dependent extinction is not constrained',
  'pcW.flag.second-order-extinction-suspected':
    'a color-dependent extinction is suspected',
  'pcW.flag.no-degrees-of-freedom': 'no degrees of freedom',
  'pcW.flag.colour-assumed-typical': 'the target’s color was assumed',
  'pcW.refuse.empty-night': 'no measurements',
  'pcW.refuse.no-usable-standards': 'no standard star is usable',
  'pcW.refuse.rank-deficient':
    'the night cannot fix the terms asked for: no solution',
  'pcW.refuse.bad-input': 'a measurement is not usable',
  'pcW.refuse.airmass-above-limit':
    'refused: the target is above the airmass limit',
  'pcW.refuse.extinction-not-constrained':
    'refused: the extinction is not constrained and the target is not at the standards’ airmass',
  'pcW.refuse.no-solution': 'no solution',
  'pcW.row.assumes': 'It assumes',
  'pcW.a':
    'the extinction is constant through the night; the catalog magnitudes are right; the measurements are free of aperture and flat-field errors; one straight line in airmass and in color describes the instrument; the target has the color you set. The night is synthetic.',
  'pcW.action.keep': 'Keep the calibration in my notebook',
  'pcW.keep.title': 'Photometric calibration of a synthetic night',
  'pcW.keep.q.zero-point': 'Zero point at airmass 1',
  'pcW.keep.q.extinction': 'Extinction of the air (per airmass)',
  'pcW.keep.q.colour-term': 'Color term',
  'pcW.keep.q.colour-extinction': 'Extinction’s dependence on color',
  'pcW.keep.q.zero-point-outside-atmosphere':
    'Zero point outside the atmosphere',
  'pcW.keep.q.magnitude': 'Calibrated magnitude of the target',
};
