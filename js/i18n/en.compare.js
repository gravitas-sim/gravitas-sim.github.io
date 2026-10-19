// =============================================================================
// The comparison instruments' words, in English
// -----------------------------------------------------------------------------
// Registered by js/compareWidgets.js when the family loads, so no other page
// carries them. compareW.* ids.
// =============================================================================

export const EN_COMPARE = {
  'compareW.title.transit': 'Model against data: a transit',
  'compareW.note':
    'A system laid over data. Nothing is fitted: moving an element only shows what that element does, and the table says which numbers were given to the model.',
  'compareW.control.radiusEarth': 'Planet radius',
  'compareW.control.massEarth': 'Planet mass',
  'compareW.control.periodDays': 'Period',
  'compareW.control.epochDays': 'Epoch shift',
  'compareW.control.inclinationDeg': 'Inclination',
  'compareW.control.e': 'Eccentricity',
  'compareW.preset.given': 'The system as given',
  'compareW.row.kind': 'What this is',
  'compareW.value.kind': 'A system over data. Nothing is fitted.',
  'compareW.row.objective': 'Chi-square',
  'compareW.row.reduced': 'Reduced chi-square',
  'compareW.row.dof': 'Degrees of freedom',
  'compareW.row.moved': 'Elements you moved',
  'compareW.value.none': 'none',
  'compareW.row.where': 'Where the model misses',
  'compareW.value.consistent':
    'nowhere: the residuals are consistent with the stated errors',
  'compareW.value.over': 'from {from} to {to} the model is above the data',
  'compareW.value.under': 'from {from} to {to} the model is below the data',
  'compareW.row.given': 'Given to the model',
  'compareW.value.given': '{n} elements, all assumed; {d} derived from them',
  'compareW.row.error': 'Cannot compare',
  'compareW.loading': 'Making the data',
  'compareW.axis.residual': 'Residual in sigmas',
  'compareW.axis.data': 'Data and model',
  'compareW.est.result':
    'The difference is {diff}: {n} sigma. A difference that large or larger would arise by chance with probability {p}.',
  'compareW.est.which.a': 'The first estimate',
  'compareW.est.which.b': 'The second estimate',
  'compareW.est.assume.gaussian': 'This assumes the errors are Gaussian.',
  'compareW.est.assume.independent':
    'The two estimates are treated as independent, because no covariance was given.',
  'compareW.est.assume.covariance': 'Their covariance is taken into account.',
  'compareW.est.assume.sharedUnknown':
    'They share their data or calibration, so their errors move together: the uncertainty of the difference is probably smaller than this says and the difference more significant. Give their correlation to correct it.',
  'compareW.est.refused.value': 'One of the two has no value to compare.',
  'compareW.est.refused.none':
    '{which} states no uncertainty, so the two cannot be compared.',
  'compareW.est.refused.asymmetric':
    '{which} has an asymmetric interval, which this comparison cannot treat as one standard deviation.',
  'compareW.est.refused.level':
    '{which} is an interval with no stated confidence level, so it cannot be turned into a standard deviation.',
  'compareW.est.refused.limit':
    '{which} is a limit, not a measurement, so there is no difference to compare.',
  'compareW.est.refused.failed': '{which} has no result.',
  'compareW.est.refused.not-constrained':
    '{which} is not constrained by the data.',
  'compareW.est.refused.covariance':
    'The covariance given is larger than the two uncertainties allow.',
};
