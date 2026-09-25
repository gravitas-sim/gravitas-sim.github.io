// =============================================================================
// The experiment runner, in English
// -----------------------------------------------------------------------------
// Its own catalog because it is its own page: /experiments/ is a separate
// bundle, and its strings have no business in the application's start-up or
// deferred catalogs. js/experiments/i18n.js reads this and ./es.experiments.js
// and nothing else.
// =============================================================================

export const EN_EXPERIMENTS = {
  'exp.doc.title': 'Experiment runner | Gravitas',
  'exp.title': 'Run an experiment',
  'exp.lang.label': 'Language',
  'exp.intro':
    'Vary one laboratory setting across a range, run every value with several seeds, and read what changed. Each trial runs in a separate background worker, several at once, so the page stays usable; nothing is sent anywhere. Before anything runs, one trial is built and the whole experiment priced for this device, and an experiment too large for it is refused with the reason.',
  'exp.back': 'Back to Gravitas',

  'exp.what.title': 'What to run',
  'exp.what.scenario': 'Scenario',
  'exp.what.param': 'Setting to vary',
  'exp.values.title': 'Values',
  'exp.values.from': 'From',
  'exp.values.to': 'To',
  'exp.values.count': 'How many values',
  'exp.values.range': 'Allowed from {min} to {max}{exclude}.',
  'exp.values.exclude':
    ', leaving out {from} to {to}, where the probe hits the planet',
  'exp.runs.title': 'Seeds and length',
  'exp.runs.seeds': 'Seeds per value',
  'exp.runs.seedBase': 'Seed name',
  'exp.runs.seedHint':
    'Every value runs once per seed. In these laboratory scenarios the seed changes nothing about the setup, so extra seeds confirm that the answer repeats; they do not add scatter.',
  'exp.runs.duration': 'Simulated time per trial',
  'exp.measure.title': 'What to measure',
  'exp.measure.metric': 'Measurement',

  'exp.scenario.binary-planet-lab': 'Binary Planet Lab',
  'exp.scenario.circumbinary-planet-lab': 'Circumbinary Planet Lab',
  'exp.scenario.gravity-assist-lab': 'Gravity Assist Lab',
  'exp.scenario.gravity-assist-heliocentric': 'Gravity Assist: Heliocentric',
  'exp.param.binary_lab_planet_a': 'Planet orbit size (star separations)',
  'exp.param.assist_impact_parameter': 'Impact parameter (sim units)',
  'exp.param.assist_v_infinity': 'Approach speed (sim units)',
  'exp.metric.distance_to_primary': 'Mean distance to the primary',
  'exp.metric.orbital_period': 'Orbital period',
  'exp.metric.closest_approach': 'Closest approach',
  'exp.metric.speed': 'Mean speed',
  'exp.metric.separation': 'Mean separation',
  'exp.metric.total_energy': 'Total energy at the end',
  'exp.metric.angular_momentum': 'Angular momentum at the end',
  'exp.metric.energy_drift': 'Energy drift at the end',
  'exp.metric.angular_drift': 'Angular-momentum drift at the end',

  'exp.device.low-end':
    'This device counts as low-end: {cores} cores. Experiments run in at most {realms} workers and may take up to {minutes} minutes.',
  'exp.device.desktop':
    'This device counts as a desktop: {cores} cores. Experiments run in up to {realms} workers and may take up to {minutes} minutes.',
  'exp.plan.pending': 'Pricing the experiment…',
  'exp.plan.timeout': 'Building a trial to price the experiment took too long.',
  'exp.plan.failed':
    'A trial could not be built, so the experiment cannot be priced.',
  'exp.invalid': 'Not an experiment this page can run: {path} {message}.',
  'exp.estimate':
    '{trials} trials of {bodies} bodies and {steps} steps each: about {seconds} s here, in {realms} workers, timed on this device.',
  'exp.estimate.untimed':
    '{trials} trials of {bodies} bodies and {steps} steps each: about {seconds} s in {realms} workers. This device’s clock was too coarse to time a trial, so the price is a cautious guess.',
  'exp.refuse.tooManyTrials':
    '{trials} trials is more than this device runs in one experiment (at most {max}).',
  'exp.refuse.tooLong':
    'It would take about {seconds} seconds, past this device’s limit of {max}.',
  'exp.refuse.trialTooLong':
    'One trial would take about {seconds} seconds, too close to the {max}-second limit on a trial.',
  'exp.refuse.tooMuchData':
    'Its results would be about {mb} MB, past the limit of {max} MB.',
  'exp.refuse.tooManySamples':
    'It keeps {samples} samples a trial; this device keeps at most {max}.',
  'exp.refuse.wouldBeCapped':
    'Each trial would reach the sample limit after {reachable} of its {duration} units of time, and a trial cut short is left out of every average. Make the trials {reachable} units or shorter.',
  'exp.refuse.tooMuchMemory':
    'It would hold about {mb} MB at once, past this device’s limit of {max} MB.',
  'exp.refuse.tooManyRealms':
    'It asks for {realms} workers; this device runs at most {max}.',

  'exp.run': 'Run',
  'exp.cancel': 'Cancel',
  'exp.resume': 'Resume ({done} of {total} done)',
  'exp.canceled': 'Canceled from the page.',
  'exp.progress.label': 'Progress',
  'exp.progress': '{done} of {total} trials finished; {running} running.',
  'exp.done.complete':
    'Finished: {ok} of {total} trials gave a measurement, in {seconds} s.',
  'exp.done.partial':
    'Stopped early: {reason} {ok} of {total} trials gave a measurement. What finished is kept, and Resume runs the rest.',
  'exp.done.canceled':
    'Canceled. {ok} of {total} trials gave a measurement before it stopped. What finished is kept, and Resume runs the rest.',
  'exp.checkpoint.skipped':
    'The results were too large to keep in this browser, so this run cannot be resumed.',
  'exp.noWorkers':
    'This browser cannot run background workers, so experiments cannot run here.',

  'exp.results.title': 'Results',
  'exp.plot.label':
    '{metric} against {param}: {ok} trials with a measurement, {failed} without. The table below has the same numbers.',
  'exp.plot.log': '(log scale)',
  'exp.plot.caption':
    'Each dot is one trial; the line joins the mean at each value; a cross on the axis is a trial with no measurement.',
  'exp.summary.caption':
    '{metric} ({unit}) at each value, over {seeds} seed(s)',
  'exp.summary.value': 'Value',
  'exp.summary.mean': 'Mean',
  'exp.summary.min': 'Lowest',
  'exp.summary.max': 'Highest',
  'exp.summary.spread': 'Spread (s.d.)',
  'exp.summary.n': 'Trials used',
  'exp.summary.left': 'Left out',
  'exp.trials.caption': 'Every trial, in the order it was planned',
  'exp.trials.index': 'Trial',
  'exp.trials.value': 'Value',
  'exp.trials.seed': 'Seed',
  'exp.trials.status': 'Outcome',
  'exp.trials.result': 'Measurement',
  'exp.trials.steps': 'Steps',
  'exp.trials.wall': 'Time (ms)',
  'exp.download.json': 'Download the result (JSON)',
  'exp.download.csv': 'Download the trials (CSV)',
  'exp.manifest.title': 'The experiment as a file',

  'exp.status.ok': 'measured',
  'exp.status.buildFailed': 'did not build',
  'exp.status.bodiesMissing': 'bodies missing',
  'exp.status.notFinite': 'no finite value',
  'exp.status.lostBody': 'a body was lost',
  'exp.status.canceled': 'canceled',
  'exp.status.stalled': 'stalled',
  'exp.status.capped': 'sample limit reached',
  'exp.status.timeout': 'timed out',
  'exp.status.corrupt': 'unreadable answer',
  'exp.status.workerFailed': 'worker failed',
  'exp.status.resourceLimit': 'result too large',

  'exp.check.title': 'Check a saved result',
  'exp.check.hint':
    'Paste a result file this page saved, or an experiment file, to see whether it can be reproduced here and, if not, why not.',
  'exp.check.input': 'Result or experiment (JSON)',
  'exp.check.run': 'Check',
  'exp.check.notJson': 'That is not JSON.',
  'exp.check.cannot': 'This cannot be read here: {reason}.',
  'exp.check.manifest': 'An experiment this page can read. Notes: {notes}.',
  'exp.check.yes':
    'Reproducible here: the same experiment gives the same numbers on this build. Notes: {notes}.',
  'exp.check.no': 'Not reproducible here, because {reasons}.',
};
