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
    'Fits the series in view with a transit or an orbit, or a table with a line, a quadratic or a power law, in background workers, by weighted least squares: a bounded grid, then refinement. Every uncertainty the fit gives is shown separately, with what it assumes.',
  'obs.fit.model': 'Model',
  'obs.fit.model.transit-quadratic':
    'A transit (circular orbit, quadratic limb darkening)',
  'obs.fit.model.rv-keplerian': 'A radial-velocity orbit (Keplerian)',
  'obs.fit.model.poly-1': 'A straight line (y against x)',
  'obs.fit.model.poly-2': 'A quadratic (y against x)',
  'obs.fit.model.power-law': 'A power law (y = A x^p)',
  'obs.fit.center': 'Center of x, x0 ({unit})',
  'obs.fit.exposure': 'Exposure of each point ({unit})',
  'obs.fit.dilution': "Other stars' share of the light, 0 to 1",
  'obs.fit.stellarRadius':
    "The star's radius, in solar radii (adopted, for the planet's)",
  'obs.fit.stellarRadiusSigma': 'Its uncertainty, in solar radii',
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
  'obs.fit.empty':
    'No fit yet. Choose a model above and press Fit; the result and its uncertainties appear here.',
  'obs.fit.cancel': 'Cancel',
  'obs.fit.export': 'Save the fit (JSON)',
  'obs.fit.keep': 'Keep the fit in the notebook',
  'obs.fit.nb.title': 'Fit: {model}',
  'obs.fit.nb.added':
    'Kept in the evidence notebook, with the digest of the rows it read.',
  'obs.fit.nb.failed': 'It could not be kept in the notebook: {why}.',
  'obs.fit.running': 'Fitting…',
  'obs.fit.done': 'Fitted in {seconds} s.',
  'obs.fit.failed': 'The fit did not finish ({status}). {why}',
  'obs.fit.canceled': 'canceled by the reader',
  'obs.fit.refuse.fewRows':
    'A fit needs at least five rows, and {rows} can be used. Unmask rows or open a larger table.',
  'obs.fit.refuse.xPositive':
    'A power law needs every x above zero. Mask the rows where x is zero or negative, or choose another model.',
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
  'obs.fit.param.c0': 'Value at the center',
  'obs.fit.param.c1': 'Slope at the center',
  'obs.fit.param.c2': 'Curvature term',
  'obs.fit.param.A': 'Value at x = 1',
  'obs.fit.param.p': 'Exponent',
  'obs.fit.param.depth': 'Depth at mid-transit',
  'obs.fit.param.T14': 'Total duration',
  'obs.fit.param.inclination': 'Inclination',
  'obs.fit.param.u1': 'Limb darkening u1',
  'obs.fit.param.u2': 'Limb darkening u2',
  'obs.fit.param.Rp': 'Planet radius',
  'obs.fit.param.e': 'Eccentricity',
  'obs.fit.param.omega': 'Argument of periastron',

  // Comparing fits (js/analysis/modelCompare.js), and the correlations.
  'obs.fit.cmp.title': 'Compare the fits',
  'obs.fit.cmp.intro':
    'Every fit made here is listed. Choose two or more of the same rows, and a constant (no signal) is compared with them. The numbers say which model the data prefer and by how much; none of them is the probability that a model is true.',
  'obs.fit.cmp.label': 'Fit {n}: {model}, every parameter free',
  'obs.fit.cmp.labelFixed': 'Fit {n}: {model}, with {fixed}',
  'obs.fit.cmp.run': 'Compare the chosen fits',
  'obs.fit.cmp.constant': 'A constant (no signal)',
  'obs.fit.cmp.caption':
    'The fits to {n} rows, by the Akaike and Bayesian information criteria. Lower is better; the weight is the relative support among these models only.',
  'obs.fit.cmp.nestedCaption':
    'Each model that is another with parameters fixed: the likelihood-ratio statistic, its degrees of freedom, and the chance of a statistic this large if the simpler model were right.',
  'obs.fit.cmp.residualCaption':
    'What is left over by each model: the scatter in units of the uncertainties (1 for a model that fits), the share beyond three, a runs test of the signs (beyond ±2 is structure), and the lag-one correlation.',
  'obs.fit.cmp.pBoundary': '{p}, conservative',
  'obs.fit.cmp.col.model': 'Model',
  'obs.fit.cmp.col.k': 'Fitted numbers k',
  'obs.fit.cmp.col.chi2': 'χ²',
  'obs.fit.cmp.col.m2lnL': '−2 ln L',
  'obs.fit.cmp.col.aic': 'AIC',
  'obs.fit.cmp.col.daic': 'ΔAIC',
  'obs.fit.cmp.col.weight': 'Akaike weight',
  'obs.fit.cmp.col.bic': 'BIC',
  'obs.fit.cmp.col.dbic': 'ΔBIC',
  'obs.fit.cmp.col.simpler': 'Simpler',
  'obs.fit.cmp.col.fuller': 'Fuller',
  'obs.fit.cmp.col.delta': 'Δ(−2 ln L)',
  'obs.fit.cmp.col.df': 'Degrees of freedom',
  'obs.fit.cmp.col.p': 'p',
  'obs.fit.cmp.col.rms': 'Scatter / uncertainty',
  'obs.fit.cmp.col.beyond3': 'Beyond 3',
  'obs.fit.cmp.col.runsZ': 'Runs test z',
  'obs.fit.cmp.col.lag1': 'Lag-one correlation',
  'obs.fit.cmp.col.beta': 'Red-noise β',
  'obs.fit.cmp.preferred.none':
    'The data do not choose: {aic} has the lowest AIC, but another model is within 2, and both have substantial support.',
  'obs.fit.cmp.preferred.weak':
    '{aic} is preferred, weakly: the next model is 2 to 4 above it in AIC.',
  'obs.fit.cmp.preferred.positive':
    '{aic} is preferred: the next model is 4 to 10 above it in AIC, with considerably less support.',
  'obs.fit.cmp.preferred.strong':
    '{aic} is strongly preferred: every other model is more than 10 above it in AIC.',
  'obs.fit.cmp.refused.otherData':
    '{label} was fitted to other rows (another mask or observation), so its likelihood is of other data and it is left out.',
  'obs.fit.cmp.refused.notFitted': '{label} did not finish, and is left out.',
  'obs.fit.cmp.warn.criteriaDisagree':
    'AIC prefers {aic} and BIC prefers {bic}. BIC penalizes each fitted number more for a large data set; when they disagree the extra parameters buy only a modest improvement.',
  'obs.fit.cmp.warn.scaledErrors':
    'A fit rescaled its uncertainties to make χ² match its degrees of freedom. The criteria use the stated uncertainties, which are then too small, and favor a model with more parameters.',
  'obs.fit.cmp.warn.unweighted':
    'The data have no uncertainties, so the noise level is one more fitted number for every model, estimated from its own residuals.',
  'obs.fit.cmp.warn.poorBest':
    'Even the preferred model, {label}, leaves a reduced χ² of {reducedChi2}: the best of these models does not describe the data to within their uncertainties.',
  'obs.fit.cmp.warn.structuredResiduals':
    'The preferred model’s residuals have structure (runs test z = {z}): something in the data is not in any of these models.',
  'obs.fit.cmp.warn.degenerate':
    '{label} has two parameters the data constrain only together (see its correlations): its best values are not identifiable one by one.',
  'obs.fit.cmp.warn.atBound':
    '{label} ended with a parameter at the edge of its range: its likelihood may be higher outside it.',
  'obs.fit.cmp.warn.boundary':
    'Where a simpler model fixes a parameter at the edge of the fuller model’s range (a depth or semi-amplitude of zero), the chi-square p-value is conservative: the true one is smaller, about half (Self and Liang 1987).',
  'obs.fit.cmp.warn.tooManyModels': 'Only the first {max} fits are compared.',
  'obs.fit.cmp.warnTitle': 'Read with care',
  'obs.fit.cmp.noWarnings': 'Nothing in this comparison calls for caution.',
  'obs.fit.cmp.methods':
    'Comparison {tool} {version}. −2 ln L is computed from each fit’s residuals and the data’s uncertainties, with the fit’s jitter added in quadrature where it has one; k is the number of values the fit chose (its rows less its degrees of freedom). AIC = −2 ln L + 2k (Akaike 1974), AICc its small-sample correction (Hurvich and Tsai 1989), BIC = −2 ln L + k ln n (Schwarz 1978); Akaike weights and the strength of preference follow Burnham and Anderson (2002). Nested models are tested by the likelihood ratio against chi-square (Wilks 1938). Fits are compared only on the same rows with the same uncertainties.',
  'obs.fit.cmp.export': 'Save the comparison (JSON)',
  'obs.fit.corr.title': 'Which parameters the data separate',
  'obs.fit.corr.caption':
    'The correlations of the fitted parameters’ estimates, at the best fit.',
  'obs.fit.corr.strong': '(strong)',
  'obs.fit.corr.legend':
    'A correlation near +1 or −1 means the data constrain a combination of the two, not each: raising one and changing the other fits almost as well. Their separate uncertainties are then larger than they look, and more data of a different kind is what separates them.',
};
