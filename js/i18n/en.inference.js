// =============================================================================
// The observatory's fit panel in English
// -----------------------------------------------------------------------------
// The inference core's diagnostic panel, split from the observatory's own
// strings (./en.observatory.js) for the reason every fragment here is:
// js/observatory/fitPanel.js registers it when a reader first opens the
// panel, so the page does not carry its prose at start-up. Only the panel's
// title, which the page shows closed, stays behind.
// =============================================================================

export const EN_INFERENCE = {
  'obs.fit.intro':
    'Fits the series in view with a transit or an orbit, in background workers, by weighted least squares: a bounded grid, then refinement. Every uncertainty the fit gives is shown separately, with what it assumes.',
  'obs.fit.model': 'Model',
  'obs.fit.model.transit-quadratic':
    'A transit (circular orbit, quadratic limb darkening)',
  'obs.fit.model.rv-keplerian': 'A radial-velocity orbit (Keplerian)',
  'obs.fit.exposure': 'Exposure of each point ({unit})',
  'obs.fit.dilution': "Other stars' share of the light, 0 to 1",
  'obs.fit.supersample': 'Samples across each exposure',
  'obs.fit.profiles': 'Profile every fitted parameter (slower)',
  'obs.fit.device': 'This device counts as {profile}: up to {realms} workers.',
  'obs.fit.profile.low-end': 'low-end',
  'obs.fit.profile.desktop': 'a desktop',
  'obs.fit.paramsCaption':
    'Parameters: fitted within bounds, or fixed at a value',
  'obs.fit.col.parameter': 'Parameter',
  'obs.fit.col.mode': 'Fitted or fixed',
  'obs.fit.col.lo': 'Lower bound',
  'obs.fit.col.hi': 'Upper bound',
  'obs.fit.col.value': 'Start, or fixed value',
  'obs.fit.modeOf': 'Whether {name} is fitted or fixed',
  'obs.fit.LoOf': 'Lower bound of {name}',
  'obs.fit.HiOf': 'Upper bound of {name}',
  'obs.fit.ValueOf': 'Start or fixed value of {name}',
  'obs.fit.fitted': 'fitted',
  'obs.fit.fixed': 'fixed',
  'obs.fit.derived': 'derived',
  'obs.fit.run': 'Fit',
  'obs.fit.cancel': 'Cancel',
  'obs.fit.export': 'Save the fit (JSON)',
  'obs.fit.running': 'Fitting…',
  'obs.fit.done': 'Fitted in {seconds} s.',
  'obs.fit.failed': 'The fit did not finish ({status}). {why}',
  'obs.fit.canceled': 'canceled by the reader',
  'obs.fit.refuse.tooManyRows':
    '{rows} rows is more than this device fits ({max} at most).',
  'obs.fit.refuse.tooManyEvaluations':
    'It would take about {evaluations} model evaluations, more than this device is asked to do ({max}). Fix some parameters, or leave the profiles out.',
  'obs.fit.refuse.periodRangeTooWide':
    'The period range needs about {trials} trial periods to search; narrow it (at most {max}).',
  'obs.fit.refuse.tooSlow':
    'It would take about {seconds} s on this device, longer than it is asked to run ({max} s at most). Fix some parameters, narrow the period range, or leave the profiles out.',
  'obs.fit.estimate':
    'About {seconds} s on this device, and up to {most} s if the fit converges slowly: {evaluations} model evaluations over {rows} rows.',
  'obs.fit.res.caption':
    'The fit: every parameter, and every uncertainty it has',
  'obs.fit.res.parameter': 'Parameter',
  'obs.fit.res.kind': 'Kind',
  'obs.fit.res.value': 'Value',
  'obs.fit.res.sigma': 'Sigma (error bars as given)',
  'obs.fit.res.sigmaScaled': 'Scaled by the reduced chi-square',
  'obs.fit.res.sigmaRed': 'Also by the correlated noise',
  'obs.fit.res.profile': 'Profile interval (Delta chi-square = 1)',
  'obs.fit.res.legend':
    'Sigma is the covariance of the linearized fit. It is 68% only if the model is near linear and the error bars are right: the scaled column assumes the noise is white and the error bars too small; the last column allows for noise correlated in time. The profile interval re-fits every other parameter, and can be asymmetric. None of these is a calibrated confidence region on its own; INFERENCE_CORE.md measures how often each holds the truth.',
  'obs.fit.res.x': 'time',
  'obs.fit.res.residual': 'residual',
  'obs.fit.res.plotLabel': 'Residuals of the fit, {n} points',
  'obs.fit.stat.chi2':
    'Chi-square {chi2} for {dof} degrees of freedom: reduced {reduced}.',
  'obs.fit.stat.rms': 'Residual scatter: {rms}.',
  'obs.fit.stat.beta':
    'Correlated-noise factor beta: {beta} (1 for white noise).',
  'obs.fit.stat.noBeta': 'Too few points to measure correlated noise.',
  'obs.fit.stat.rows':
    '{used} of {total} rows used: {masked} masked, {missing} missing.',
  'obs.fit.stat.search':
    '{evaluations} model evaluations; {iterations} refinement steps.',
  'obs.fit.warnTitle': 'Read with care',
  'obs.fit.notClaimed': 'What this fit does not claim',
  'obs.fit.assumptions': 'What it assumes',
  'obs.fit.warn.notConverged':
    'The refinement stopped before it converged: {why}.',
  'obs.fit.warn.atBound':
    '{parameter} ended at a bound: its interval is one-sided, and its sigma is not meaningful.',
  'obs.fit.warn.singular':
    'The covariance could not be computed: some parameter is not constrained by the data.',
  'obs.fit.warn.degenerate':
    '{a} and {b} are nearly degenerate (correlation {correlation}): the data constrain a combination of them better than either.',
  'obs.fit.warn.unweighted':
    'The data have no error bars, so the fit is unweighted and the scatter stands in for them.',
  'obs.fit.warn.scaled':
    'The reduced chi-square is {reduced}: the error bars are smaller than the scatter, and the scaled uncertainties allow for it.',
  'obs.fit.warn.correlatedNoise':
    'The residuals are correlated in time (beta {beta}): the last uncertainty column allows for it; the others do not.',
  'obs.fit.warn.droppedNoUncertainty':
    '{rows} rows without a positive error bar were left out.',
  'obs.fit.warn.notDetected':
    'No transit is detected above the noise (signal-to-noise {snr}): the fit is not identifiable, and its numbers describe noise.',
  'obs.fit.warn.noExposure':
    'No exposure is given, so each point is modeled as an instant.',
  'obs.fit.warn.timeUnitAssumed':
    'The time column does not state a time unit, so the period search took it to be days.',
  'obs.fit.param.t0': 'Mid-transit time',
  'obs.fit.param.P': 'Period',
  'obs.fit.param.k': 'Radius ratio Rp/R*',
  'obs.fit.param.aRs': 'Scaled distance a/R*',
  'obs.fit.param.b': 'Impact parameter',
  'obs.fit.param.q1': 'Limb darkening q1',
  'obs.fit.param.q2': 'Limb darkening q2',
  'obs.fit.param.tc': 'Time of conjunction',
  'obs.fit.param.K': 'Semi-amplitude K',
  'obs.fit.param.sqrtEcosw': '√e cos ω',
  'obs.fit.param.sqrtEsinw': '√e sin ω',
  'obs.fit.param.jitter': 'Jitter',
  'obs.fit.param.depth': 'Depth at mid-transit',
  'obs.fit.param.T14': 'Total duration',
  'obs.fit.param.inclination': 'Inclination',
  'obs.fit.param.u1': 'Limb darkening u1',
  'obs.fit.param.u2': 'Limb darkening u2',
  'obs.fit.param.Rp': 'Planet radius',
  'obs.fit.param.e': 'Eccentricity',
  'obs.fit.param.omega': 'Argument of periastron',
};
