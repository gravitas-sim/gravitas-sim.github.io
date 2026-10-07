// =============================================================================
// The analysis laboratory on /experiments/, in English
// -----------------------------------------------------------------------------
// Lazy, with the panel (js/experiments/analysisPanel.js), which hands it to
// the page's translator (js/experiments/i18n.js addMessages) when it opens.
// Nothing here is in the page's start-up catalog.
// =============================================================================

export const EN_ANALYSIS = {
  'lab.title': 'Analyze: uncertainty, sensitivity, distribution',
  'lab.intro':
    'Read a result closely: how strongly the measurement follows the setting, where its uncertainty comes from (the seeds, or the integration step), and what the result cannot tell you. Every interval is a 95% confidence interval, not a probability that the answer lies in it.',
  'lab.source.none':
    'No result yet: run an experiment above, or open one saved from this page.',
  'lab.source.run': 'The last run: {title}, {trials} trials ({hash}).',
  'lab.source.file': 'Opened {name}: {title}, {trials} trials ({hash}).',
  'lab.open': 'Open a saved result',
  'lab.open.bad': 'That file is not a saved experiment result: {reason}',
  'lab.metric': 'Measurement',
  'lab.resamples': 'Resamples',
  'lab.seed': 'Seed for the resampling',
  'lab.axis': 'Plot against',
  'lab.run': 'Analyze',
  'lab.cancel': 'Cancel',
  'lab.forecast': 'About {draws} random draws: {time} on this device.',
  'lab.forecast.seconds': 'about {seconds} s',
  'lab.forecast.instant': 'under a second',
  'lab.refuse.notAResult': 'This is not an experiment result.',
  'lab.refuse.noMetric': 'The result has no measurement called {metric}.',
  'lab.refuse.noTrials': 'No trial finished with a value to analyze.',
  'lab.refuse.tooManyDraws':
    'That is {draws} draws, more than {max} this device allows. Use fewer resamples.',
  'lab.step.intro':
    'A simulation that ignores its seed has one uncertainty left: how much its numbers move when the time step changes. Run the same experiment at another step (the form’s Integration step), or open one saved at another step, and choose it here.',
  'lab.step.compare': 'Compare with the same experiment at another step',
  'lab.step.open': 'Open the same experiment at another step',
  'lab.step.none': 'No comparison',
  'lab.step.option': 'The run at {step} ({hash})',
  'lab.step.with':
    'Compared with the same experiment at {step}: the values move by up to {rel}%. That difference is the scale of the numerical error, not a bound on it.',
  'lab.step.caption':
    '{metric} at each setting at {a} and at {b}, and their difference.',
  'lab.running': 'Analyzing…',
  'lab.done': 'Analyzed {trials} trials at {cells} settings in {seconds} s.',
  'lab.canceled': 'Analysis canceled. Nothing from it was kept.',
  'lab.failed': 'The analysis stopped: {why}',

  'lab.h.summary': 'What it says',
  'lab.h.warnings': 'What it does not say',
  'lab.h.trials': 'Every trial',
  'lab.h.cells': 'Each setting',
  'lab.h.sensitivity': 'How the measurement follows the setting',
  'lab.h.shares': 'The setting, and the seed',
  'lab.h.distribution': 'The distribution of every finished trial',
  'lab.h.methods': 'Methods',
  'lab.h.step': 'The integration step',
  'lab.noWarnings': 'Nothing here calls for caution.',

  'lab.summary.trend':
    'Across {values} values of {param}, {metric} runs from {first} to {last}. A straight line through the means has a slope of {slope} ± {se} {unit} per unit of the setting.',
  'lab.summary.trend2d':
    'Over a grid of {values} settings of {param} and {param2}, {metric} runs from {lo} to {hi}.',
  'lab.summary.sampled':
    'Across {values} randomly drawn values of {param}, {metric} runs from {lo} to {hi}. Its rank correlation with the setting is {rho} (95%: {rhoLo} to {rhoHi}).',
  'lab.summary.share':
    'The setting accounts for {share}% of the scatter, and the seeds for the rest; the chance of a share this large if the setting made no difference is {p}.',
  'lab.summary.share2d':
    '{param} accounts for {a}% of the scatter, {param2} for {b}%, the two together beyond their separate effects for {ab}%, and the seeds for {seeds}%.',
  'lab.summary.identical':
    'Every seed gave the same value at every setting, so all of the variation is the setting’s, and none of it is scatter.',
  'lab.summary.noShare':
    'With one trial at each setting, how much of the scatter is the seed cannot be measured.',
  'lab.summary.left':
    '{left} of {trials} trials did not finish, and are not in these numbers.',

  'lab.warn.oneSeed':
    'Each setting ran once, so no scatter was measured and no interval can be given. In these laboratory scenarios the seed changes nothing anyway; the uncertainty that matters is the integration step’s. Run the experiment again at another step and compare the two here.',
  'lab.warn.oneSeedStepped':
    'Each setting ran once, so no scatter was measured. The slopes are judged instead against how much each value moved when the step changed.',
  'lab.warn.deterministic':
    'Every seed gave the same value at every setting: these scenarios do not depend on the seed. There is no scatter to put an interval on, so none is given, and no change can be tested against noise. The uncertainty that matters is the integration step’s: run the experiment again at another step and compare the two here.',
  'lab.warn.deterministicStepped':
    'Every seed gave the same value at every setting, so the uncertainty here is the integration step’s. The slopes are judged against how much each value moved when the step changed.',
  'lab.warn.stepSensitive':
    'Changing the step from {a} to {b} moves the measurement by up to {rel}%: numerical error of about that size is in every number here.',
  'lab.warn.reference.otherExperiment':
    'The result chosen for comparison is not the same experiment at another step, so it was not compared.',
  'lab.warn.reference.sameStep':
    'The result chosen for comparison ran at the same step, so it says nothing about the integration’s error.',
  'lab.warn.fewTrials':
    '{cells} settings have fewer than five finished trials. Their intervals are wide, and rest on the scatter being roughly normal.',
  'lab.warn.emptyCells':
    '{cells} settings have no finished trial at all. Nothing is known there.',
  'lab.warn.survivors':
    '{trials} trials did not finish ({statuses}). The numbers are of the trials that did, which may not be typical: survivors are a biased sample.',
  'lab.warn.notResolved':
    'The setting’s effect is not resolved from the seed-to-seed scatter (p = {p}). This experiment cannot tell whether the setting matters over this range.',
  'lab.warn.noTrend':
    'The rank correlation’s interval includes zero ({lo} to {hi}): no trend is resolved.',
  'lab.warn.seedsDominate':
    'Most of the scatter ({share}%) is between seeds at the same setting, not between settings.',
  'lab.warn.nonMonotonic':
    'The measurement rises and falls across the range ({turns} resolved turn(s)). One measured value can come from more than one setting, so the setting cannot be read back from a measurement.',
  'lab.warn.flat':
    'From {from} to {to} the measurement does not change beyond its scatter. There the setting is not identifiable from this measurement.',
  'lab.warn.edgeMax':
    'The largest mean is at the end of the range ({at}). The peak may lie beyond it.',
  'lab.warn.edgeMin':
    'The smallest mean is at the end of the range ({at}). The minimum may lie beyond it.',
  'lab.warn.unbalanced':
    'The grid is incomplete or its settings have different numbers of trials, so the shares add to one only approximately.',
  'lab.warn.wideRange':
    'The values span a factor of {ratio}. The median and its interval say more than the mean.',

  'lab.col.trial': 'Trial',
  'lab.col.trials': 'Trials',
  'lab.col.n': 'Finished',
  'lab.col.mean': 'Mean',
  'lab.col.meanCi': 'Mean, 95%',
  'lab.col.median': 'Median',
  'lab.col.medianCi': 'Median, 95%',
  'lab.col.range68': '16th to 84th percentile',
  'lab.col.at': 'At',
  'lab.col.slope': 'Slope',
  'lab.col.slopeSe': 'Its error',
  'lab.col.elasticity': 'Elasticity',
  'lab.col.resolved': 'Resolved?',
  'lab.col.numErr': 'Numerical error of the slope',
  'lab.col.diff': 'Difference',
  'lab.col.rel': 'Relative',
  'lab.col.effect': 'Mean over the other setting',
  'lab.col.part': 'Part of the scatter',
  'lab.col.share': 'Share',
  'lab.col.binLo': 'From',
  'lab.col.binHi': 'To',
  'lab.col.count': 'Trials',
  'lab.yes': 'yes',
  'lab.no': 'no',
  'lab.unknown': 'cannot tell',
  'lab.none': '—',
  'lab.interaction': 'both together',
  'lab.seeds': 'the seeds',
  'lab.cells.caption':
    '{metric} at each setting: the mean with a Student t interval, the median with a bootstrap interval, and the middle 68% of the trials.',
  'lab.sens.caption':
    'Local slopes of the mean, by finite differences, in {unit} per unit of the setting. A slope is resolved when it is more than twice its error. The elasticity is the percentage change of the measurement for a 1% change of the setting.',
  'lab.main.caption':
    'The mean of {metric} at each value of {param}, averaged over {param2}.',
  'lab.shares.caption':
    'How the scatter of {metric} divides between the settings and the seeds.',
  'lab.bins.caption': 'The trials in {bins} groups of equal size, by {param}.',
  'lab.trend.line':
    'Trend: {slope} ± {se} {unit} per unit of the setting: a least-squares line through the means, its error from their scatter about the line.',
  'lab.rho': 'Rank correlation (Spearman): {rho}, 95% from {lo} to {hi}.',
  'lab.hist.caption':
    'How many trials gave each range of {metric}: {bins} bins, by the Freedman-Diaconis rule. The table below holds the same counts.',
  'lab.hist.label': 'Histogram of {metric} over {n} trials',
  'lab.quantiles':
    'Percentiles 2.5, 16, 50, 84 and 97.5: {q025}, {q16}, {q50}, {q84}, {q975}.',
  'lab.plot.caption':
    'Each point is one trial. Drag across the plot, or use the arrow keys and Shift, to select trials; the table and the summary below follow the selection.',
  'lab.selected.none':
    'No trials selected. Select some in the plot or the table.',
  'lab.selected':
    '{n} trials selected: mean {mean}, median {median}, from {min} to {max}.',
  'lab.selected.interval': ' 95% interval of the mean: {lo} to {hi}.',
  'lab.table.rows': 'Rows {first} to {last} of {n}.',
  'lab.row': 'Row',
  'lab.missing': 'did not finish',
  'lab.masked': 'masked',
  'lab.notStated': 'unit not stated',
  'lab.save.json': 'Save the analysis (JSON)',
  'lab.save.csv': 'Save the settings table (CSV)',
  'lab.methods':
    'Analysis {tool} {version} of result {hash}, measurement {metric}, seed "{seed}". Intervals are at 95%: for a mean, Student’s t with the sample standard deviation; for a median, the percentile bootstrap (Efron and Tibshirani 1993) with {resamples} resamples, given only for five or more finished trials. Local slopes are finite differences of the means with their errors combined in quadrature. The trend is an ordinary least-squares line through the means, its error from their scatter about it. The share of the scatter is eta² of a one-way analysis of variance, tested against "the setting makes no difference" by {permutations} random permutations (p = (1 + k)/(1 + B), Phipson and Smyth 2010). Rank correlation is Spearman’s, with a bootstrap interval. Where every seed gives the same value, no interval or test is given: the numerical uncertainty is then the difference from the same experiment at another integration step, and a slope is resolved when it is more than twice the slope of that difference. Trials that did not finish are counted and left out. The experiment’s manifest is in the saved analysis, whole.',
};
