// =============================================================================
// Turning an instrument's output into a piece of evidence
// -----------------------------------------------------------------------------
// One function per source. Each takes what the instrument already computes -
// no new physics, no re-derivation - and decides three things:
//
//   which numbers are worth keeping, with their units;
//   which of them are measured, which analytic, which revealed truth;
//   what the reading is not evidence for, offered as a starting limitation.
//
// That last one is a deliberate piece of teaching. A student asked to write
// limitations from a blank box writes "none". Offered "K gives M sin i, not a
// mass" as editable text, they either keep it, sharpen it, or delete it - and
// all three are better than a blank.
//
// Pure. Every argument is data the caller has already read out of the live
// world, so these can be tested against fixed inputs and cannot themselves
// reach for a body that has since been rebuilt.
// =============================================================================

import { t } from '../i18n/index.js';
import {
  KIND,
  SOURCE,
  buildEntry,
  figure,
  figureSeries,
  provenanceOf,
  quantity,
} from './entry.js';

/**
 * The provenance a recording carries, which outranks the live world's.
 *
 * Only fields the recording actually has: an absent one is omitted rather than
 * set to null, so the caller's spread cannot overwrite a good live value with
 * a blank. The simulation clock is deliberately not among them - an analysis
 * of a completed recording happened at the recording's own epochs, and the
 * clock reading from whenever somebody pressed save is not when it was
 * observed.
 *
 * @param {object} rec - `recording` from rvWorkspace.exportReport()
 * @param {object} report - The whole report, for its own fields
 * @returns {object} Provenance overrides
 */
function recordedProvenance(rec, report) {
  const out = {};
  const put = (key, value) => {
    if (value !== undefined && value !== null) out[key] = value;
  };
  put('scenario', rec.scenario);
  put('target', rec.target);
  put('seed', rec.seed);
  // Assigned rather than put(), and the difference is the whole point.
  //
  // put() leaves a key alone when the recording does not carry it, and the
  // live world's value then survives from liveProvenance() into the entry. For
  // a recording that is never right: these two count how much the world had
  // been rebuilt and interfered with WHEN THE SAMPLES WERE TAKEN, and the
  // present's answer is a different fact wearing the same name. A recording
  // made before three burns was being filed as though it had been made after
  // them. Old recordings that cannot say leave it null, which is what this
  // codebase means by unknown.
  out.worldGeneration = rec.worldGeneration ?? null;
  out.interventionEpoch = rec.interventionEpoch ?? null;
  // The direction the star was watched from when the samples were taken, not
  // wherever the sliders happen to be now. `observer` is what the workspace
  // reports; `geometry` is the older payload shape, kept so a saved recording
  // restored from a file still knows where it was looking from.
  const geometry = rec.observer ?? rec.geometry;
  if (geometry) {
    put('observer', {
      positionAngleDeg: geometry.positionAngleDeg ?? null,
      inclinationDeg: geometry.inclinationDeg ?? null,
    });
  } else {
    out.observer = null;
  }
  put('recordedAt', rec.recordedAt);
  put('scheduleFingerprint', rec.scheduleFingerprint);
  put('units', rec.units);

  // WHEN the observations happened, in their own units, as opposed to what the
  // simulation clock said when somebody analysed them. Both used to arrive as
  // one number and it was the second one.
  put('observedEpochs', rec.epochs);
  // The clock is deliberately not carried over from the live world for a
  // recording: an analysis happened at the recording's own epochs, and the
  // reading from whenever save was pressed is not when it was observed. Null
  // is the honest answer, and observedEpochs above is the real one.
  out.simTimeUnits = null;
  out.simTimeSeconds = null;
  out.simTimeDays = null;

  // How the world was being integrated while the samples were produced. A
  // recording that does not carry this leaves it unknown rather than being
  // described by whatever the sliders say now.
  if (rec.numerical) {
    put('integrator', rec.numerical.integrator);
    put('timestep', rec.numerical.maxTimestep ?? rec.numerical.timestep);
    put('simSpeed', rec.numerical.simSpeed);
  } else {
    out.integrator = null;
    out.timestep = null;
    out.simSpeed = null;
  }

  // The reference frame is the live world's, not the recording's, and it must
  // not masquerade as a historical fact.
  //
  // A recording carries the observer geometry it was taken under - that IS a
  // fact about the measurements. It does not carry the reference frame, which
  // is a display choice made now: somebody analysing an old recording while
  // centred on a different body would otherwise have "barycentre:7" written
  // into the entry as though the samples had been taken in it. So the live
  // frame is relabelled as what it is, and the recording's own frame is
  // recorded as unknown rather than filled in from the present.
  if (rec.referenceFrame !== undefined && rec.referenceFrame !== null) {
    put('referenceFrame', rec.referenceFrame);
  } else {
    out.referenceFrame = null;
  }
  const mc = liveUncertaintyFor(report);
  if (mc) {
    put('uncertaintySeed', mc.spec.seed);
    // Everything needed to reproduce the interval, in the entry itself, so a
    // restored notebook can be checked without the recording beside it.
    put('uncertainty', {
      seed: mc.spec.seed ?? null,
      model: mc.spec.model ?? null,
      errors: mc.spec.errors ?? null,
      resampledAbout: mc.spec.resampledAbout ?? null,
      minPeriod: mc.spec.minPeriod ?? null,
      maxPeriod: mc.spec.maxPeriod ?? null,
      samples: mc.spec.samples ?? null,
      epochs: mc.spec.epochs ?? null,
      requested: mc.requested,
      completed: mc.completed,
      succeeded: mc.succeeded,
      failed: mc.failed,
      failures: { ...mc.failures },
      outcome: mc.outcome,
      cancelled: mc.cancelled,
      complete: mc.complete,
      gridLimited: mc.gridLimited,
      multimodal: mc.multimodal,
      inputsKey: mc.inputsKey ?? null,
      period: mc.period ? { ...mc.period } : null,
      K: mc.K ? { ...mc.K } : null,
      families: (mc.families || []).map(f => ({
        count: f.count,
        fraction: f.fraction,
        period: { ...f.period },
        K: { ...f.K },
      })),
      assumptions: [...(mc.assumptions || [])],
    });
  }
  return out;
}

/**
 * The uncertainty report, but only if it describes the fit being captured.
 *
 * The staleness contract, applied at the last place an interval can be
 * attached to the wrong thing. A notebook entry outlives the session, so a
 * report computed against a different recording, a different fitted model or a
 * different search range must not travel in it as though it were about these
 * numbers.
 *
 * @param {object} report - From rvWorkspace.exportReport()
 * @returns {?object} The report, or null when it is absent, refused or stale
 */
function liveUncertaintyFor(report) {
  const u = report?.uncertainty;
  if (!u?.ok) return null;
  const key = report?.uncertaintyKey ?? null;
  if (key !== null && u.inputsKey !== null && u.inputsKey !== key) return null;
  return u;
}

/** Thin an array to at most `max` points, keeping the ends. */
function thin(points, max) {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  const out = [];
  for (let i = 0; i < max; i++) out.push(points[Math.round(i * step)]);
  return out;
}

/**
 * A radial-velocity fit.
 *
 * The parameters on the sliders are `measured` even when they were placed by
 * the periodogram: they came from the data by way of the student. The revealed
 * truth, when it has been revealed, is `truth` and is labelled as such in
 * every rendering - a student who reveals and then writes "my fit is correct"
 * should have a report that shows where the second number came from.
 *
 * @param {object} spec
 * @param {object} spec.analysis - From rvWorkspace.analysis()
 * @param {object} spec.report - From rvWorkspace.exportReport()
 * @param {object} spec.provenance - The fields provenanceOf() takes
 * @returns {?object} A draft entry, or null with nothing to capture
 */
export function fromRvFit({ analysis, report, provenance = {} }) {
  if (!analysis || analysis.tooFew || !analysis.atTrial) return null;
  const trial = analysis.trial;
  const fit = analysis.atTrial;
  const truth = analysis.revealed ? analysis.truth : null;
  // The uncertainty analysis, when one was run against THIS fit. The staleness
  // check is the same one the export does: a report computed for a different
  // recording or a different model is not evidence about this one, and a
  // notebook entry is precisely where such a mismatch would survive longest
  // without being noticed. Declared here because the quantities below read it.
  const mc = liveUncertaintyFor(report);

  const quantities = [
    quantity({
      label: t('nb.rv.period'),
      value: trial.period,
      unit: 'd',
      kind: KIND.MEASURED,
    }),
    quantity({
      label: t('nb.rv.K'),
      value: trial.K,
      unit: 'm/s',
      kind: KIND.MEASURED,
      // The single most misread number in the whole exercise, so the
      // qualification is attached to the number and not left to the prose.
      note: t('nb.rv.msini'),
    }),
    quantity({
      label: t('nb.rv.gamma'),
      value: trial.gamma,
      unit: 'm/s',
      kind: KIND.MEASURED,
    }),
    quantity({
      label: t('nb.rv.rms'),
      value: fit.rms,
      unit: 'm/s',
      kind: KIND.MEASURED,
    }),
  ];

  // Null whenever the weights were invented, and then it is left out rather
  // than printed as a number a reader would take for a goodness of fit.
  if (fit.reducedChi2 !== null && fit.reducedChi2 !== undefined) {
    quantities.push(
      quantity({
        label: t('nb.rv.chi2'),
        value: fit.reducedChi2,
        unit: '',
        kind: KIND.MEASURED,
        note: t('nb.rv.chi2Note'),
      })
    );
  }

  if (mc?.period && mc?.K) {
    // A measured interval, so the bounds are measured too. Recorded as an
    // uncertainty on the parameter rather than as three separate numbers,
    // because that is what a reader quotes.
    quantities.push(
      quantity({
        label: t('nb.rv.mcPeriod'),
        value: mc.period.median,
        unit: 'd',
        kind: KIND.MEASURED,
        uncertainty: (mc.period.p84 - mc.period.p16) / 2,
        note: t('nb.rv.mcNote', { n: mc.succeeded, seed: mc.spec.seed }),
      }),
      quantity({
        label: t('nb.rv.mcK'),
        value: mc.K.median,
        unit: 'm/s',
        kind: KIND.MEASURED,
        uncertainty: (mc.K.p84 - mc.K.p16) / 2,
      })
    );
  } else if (mc?.multimodal) {
    // No single interval exists. The number that IS meaningful is how often
    // the leading alias won, and it is recorded instead of a fabricated bar.
    const top = mc.families[0];
    quantities.push(
      quantity({
        label: t('nb.rv.mcFamilies'),
        value: mc.families.length,
        unit: '',
        kind: KIND.MEASURED,
        note: t('nb.rv.mcTopFamily', {
          period: top.period.median.toPrecision(5),
          pct: (100 * top.fraction).toFixed(1),
        }),
      })
    );
  }

  if (truth) {
    quantities.push(
      quantity({
        label: t('nb.rv.truthPeriod'),
        value: truth.period,
        unit: 'd',
        kind: KIND.TRUTH,
      }),
      quantity({
        label: t('nb.rv.truthK'),
        value: truth.K,
        unit: 'm/s',
        kind: KIND.TRUTH,
      })
    );
  }

  // The phase-folded curve: the data as measured, and the model the student
  // dialled in. The model line is analytic - it is a closed-form sinusoid, not
  // something the simulation produced - and is drawn as such.
  const folded = [...(analysis.folded || [])].sort((a, b) => a.phase - b.phase);
  const data = thin(folded, 240);
  const model = thin(folded, 160);
  const fig = figure({
    title: t('nb.rv.figure'),
    xLabel: t('nb.rv.phase'),
    yLabel: t('nb.rv.velocity'),
    series: [
      figureSeries({
        label: t('nb.rv.observed'),
        kind: KIND.MEASURED,
        style: 'points',
        points: data.map(r => [r.phase, r.rv]),
        errors: data.map(r => r.sigma),
      }),
      figureSeries({
        label: t('nb.rv.model'),
        kind: KIND.ANALYTIC,
        style: 'line',
        points: model.map(r => [r.phase, r.model]),
      }),
    ],
  });

  const flags = [];
  if (analysis.revealed) flags.push('truth-revealed');
  if (mc) {
    flags.push('uncertainty-analysed');
    if (mc.multimodal) flags.push('uncertainty-multimodal');
    if (mc.outcome !== 'complete') flags.push(`uncertainty-${mc.outcome}`);
    if (mc.gridLimited) flags.push('uncertainty-grid-limited');
  } else if (report?.uncertainty && !report.uncertainty.ok) {
    flags.push('uncertainty-refused');
  } else if (report?.uncertainty) {
    flags.push('uncertainty-stale');
  }
  if (analysis.excluded?.degraded) flags.push('degraded-epochs');
  if (analysis.excluded?.unverified) flags.push('unverified-epochs');
  if (fit.reducedChi2 === null) flags.push('weights-assumed');
  if (analysis.structure && analysis.structure.runsRatio < 0.6) {
    flags.push('structured-residuals');
  }

  const rec = report?.recording || {};
  return buildEntry({
    source: SOURCE.RV_FIT,
    title: t('nb.rv.title', { target: rec.target || t('nb.unknownTarget') }),
    quantities,
    figure: fig,
    // The RECORDING's provenance wins; the live world only fills the gaps.
    //
    // This was the wrong way round and the consequence was silent corruption:
    // a student who recorded a run, switched scenario and then saved the fit
    // got an entry stamped with the scenario, world generation and observing
    // geometry of the world they were looking at rather than the one the
    // measurements came from. The reading was right and its provenance
    // described a different star.
    //
    // What the live world still supplies is what a recording genuinely does
    // not carry: the build, the rendering tier, the reference frame. Not the
    // clock - see recordedProvenance().
    provenance: provenanceOf({
      ...provenance,
      ...recordedProvenance(rec, report),
      units: rec.units ?? provenance.units ?? { velocity: 'm/s', time: 'days' },
      // What the reader was looking at when they saved, kept apart from what
      // the recording was taken in. Both are true; only one is about the
      // measurements.
      displayFrame: provenance.referenceFrame ?? null,
      flags: [...(provenance.flags || []), ...flags],
    }),
    prose: {
      limitations: [
        t('nb.rv.limit.model'),
        t('nb.rv.limit.msini'),
        ...(analysis.revealed ? [t('nb.rv.limit.revealed')] : []),
      ].join('\n'),
      evidence: t('nb.rv.evidence', {
        used: analysis.used,
        rms: fit.rms.toPrecision(3),
      }),
    },
  });
}

/**
 * An A/B comparison from the bench.
 *
 * Both columns are measured: each is a recorded run of the simulation. What
 * the entry has to preserve is which parameter differed, because a comparison
 * whose cause nobody wrote down is not evidence of anything - and the bench
 * already knows, in its parameter diff.
 *
 * @param {object} spec
 * @param {object} spec.experiment - The bench experiment record
 * @param {object} spec.comparison - From bench.compare()
 * @param {Function} spec.labelFor - metric id to a readable label
 * @param {object} [spec.provenance] - Extra provenance fields
 * @returns {?object} A draft entry
 */
export function fromBenchComparison({
  experiment,
  comparison,
  labelFor = id => id,
  provenance = {},
}) {
  if (!experiment || !comparison?.rows?.length) return null;

  const quantities = [];
  for (const row of comparison.rows) {
    if (row.a === null && row.b === null) continue;
    quantities.push(
      quantity({
        label: t('nb.bench.runA', { metric: labelFor(row.metric) }),
        value: row.a,
        unit: row.unit,
        kind: KIND.MEASURED,
      }),
      quantity({
        label: t('nb.bench.runB', { metric: labelFor(row.metric) }),
        value: row.b,
        unit: row.unit,
        kind: KIND.MEASURED,
      })
    );
  }

  // The first metric that has aligned series, drawn as two curves. One figure,
  // not six: a notebook entry is one piece of evidence and a wall of plots is
  // how a student avoids choosing which.
  let fig = null;
  const aligned = comparison.aligned || {};
  for (const metric of experiment.metrics || []) {
    const pair = aligned[metric];
    if (!pair?.a?.length || !pair?.b?.length) continue;
    const a = thin(pair.a, 200);
    const b = thin(pair.b, 200);
    fig = figure({
      title: t('nb.bench.figure', { metric: labelFor(metric) }),
      xLabel: t('nb.bench.time'),
      yLabel: labelFor(metric),
      series: [
        figureSeries({
          label: 'A',
          kind: KIND.MEASURED,
          points: a.map((v, i) => [i, v]),
        }),
        figureSeries({
          label: 'B',
          kind: KIND.MEASURED,
          points: b.map((v, i) => [i, v]),
        }),
      ],
    });
    break;
  }

  const diff = experiment.diff || {};
  const changed = (diff.variables || []).map(v => v.key || v.name || '?');
  const flags = [];
  if (diff.multivariable) flags.push('multivariable');
  for (const w of comparison.warnings || []) {
    if (w?.level === 'error') flags.push('bench-warning');
  }

  const p = experiment.provenance || {};
  return buildEntry({
    source: SOURCE.BENCH_COMPARISON,
    title: t('nb.bench.title', { name: experiment.name || '' }),
    quantities,
    figure: fig,
    provenance: provenanceOf({
      ...provenance,
      scenario: provenance.scenario ?? p.scenario ?? null,
      seed: provenance.seed ?? p.seed ?? null,
      integrator: provenance.integrator ?? p.integrator ?? null,
      timestep: provenance.timestep ?? p.timestep ?? null,
      simSpeed: provenance.simSpeed ?? p.simSpeed ?? null,
      referenceFrame: provenance.referenceFrame ?? p.referenceFrame ?? null,
      observer: provenance.observer ?? p.observer ?? null,
      units: provenance.units ?? p.units ?? null,
      initialStateHash:
        provenance.initialStateHash ?? p.initialStateHash ?? null,
      flags: [...(provenance.flags || []), ...flags],
    }),
    prose: {
      evidence: changed.length
        ? t('nb.bench.evidence', { changed: changed.join(', ') })
        : t('nb.bench.evidenceNone'),
      limitations: [
        t('nb.bench.limit.oneSeed'),
        ...(diff.multivariable ? [t('nb.bench.limit.multivariable')] : []),
      ].join('\n'),
    },
  });
}

/**
 * A one-variable sweep.
 *
 * The measured column is each trial's outcome; the summary statements - that
 * the outcome changed, that it is monotone - are descriptions of those
 * measurements and are stored as prose rather than as numbers, because they
 * are claims about a trend and not readings.
 *
 * @param {object} spec
 * @param {object} spec.sweep - From bench.latestSweep()
 * @param {Function} spec.labelFor - metric id to a readable label
 * @param {object} [spec.provenance] - Extra provenance fields
 * @returns {?object} A draft entry
 */
export function fromSweep({ sweep, labelFor = id => id, provenance = {} }) {
  if (!sweep?.trials?.length) return null;
  const metric = sweep.metrics?.[0];
  if (!metric) return null;
  const summary = (sweep.summaries || []).find(s => s.metric === metric);

  const ok = sweep.trials.filter(
    tr => tr.status === 'ok' && Number.isFinite(tr.results?.[metric])
  );
  const quantities = [
    quantity({
      label: t('nb.sweep.trials'),
      value: ok.length,
      unit: '',
      kind: KIND.MEASURED,
    }),
    quantity({
      label: t('nb.sweep.duration'),
      value: sweep.duration,
      unit: 's',
      kind: KIND.MEASURED,
      note: t('nb.sweep.durationNote'),
    }),
  ];
  if (summary) {
    quantities.push(
      quantity({
        label: t('nb.sweep.min', { metric: labelFor(metric) }),
        value: summary.min,
        unit: '',
        kind: KIND.MEASURED,
      }),
      quantity({
        label: t('nb.sweep.max', { metric: labelFor(metric) }),
        value: summary.max,
        unit: '',
        kind: KIND.MEASURED,
      })
    );
  }

  const fig = figure({
    title: t('nb.sweep.figure', {
      metric: labelFor(metric),
      parameter: sweep.parameter,
    }),
    xLabel: sweep.parameter,
    yLabel: labelFor(metric),
    series: [
      figureSeries({
        label: labelFor(metric),
        kind: KIND.MEASURED,
        style: 'points',
        points: ok
          .map(tr => [tr.value, tr.results[metric]])
          .sort((a, b) => a[0] - b[0]),
      }),
    ],
  });

  const failed = sweep.trials.length - ok.length;
  const flags = [];
  if (sweep.cancelled) flags.push('cancelled');
  if (failed) flags.push('failed-trials');

  return buildEntry({
    source: SOURCE.BENCH_SWEEP,
    title: t('nb.sweep.title', {
      parameter: sweep.parameter,
      scenario: sweep.scenario,
    }),
    quantities,
    figure: fig,
    provenance: provenanceOf({
      ...provenance,
      scenario: provenance.scenario ?? sweep.scenario ?? null,
      seed: provenance.seed ?? sweep.seed ?? null,
      timestep: provenance.timestep ?? sweep.numerics?.maxStep ?? null,
      substeps: provenance.substeps ?? sweep.numerics?.substeps ?? null,
      flags: [...(provenance.flags || []), ...flags],
    }),
    prose: {
      evidence: summary
        ? t(summary.changed ? 'nb.sweep.changed' : 'nb.sweep.flat', {
            metric: labelFor(metric),
            parameter: sweep.parameter,
            direction: t(`nb.sweep.dir.${summary.direction}`),
          })
        : t('nb.sweep.noSummary'),
      limitations: [
        t('nb.sweep.limit.oneVariable'),
        ...(failed ? [t('nb.sweep.limit.failed', { n: failed })] : []),
        ...(sweep.cancelled ? [t('nb.sweep.limit.cancelled')] : []),
      ].join('\n'),
    },
  });
}

/**
 * The binary lesson's sweep: five starting radii and what happened to each.
 *
 * Kept apart from fromSweep() above because the two record different kinds of
 * thing. A generic sweep's evidence is a metric against a parameter, and its
 * entry says how that metric moved. This one's evidence is an OUTCOME against a
 * parameter - survived, ejected, collided, or nothing established - and a
 * number that averaged those would be meaningless. So the outcomes are the
 * figure, the diagnostics behind each one are the quantities, and the
 * limitation that is always true of a finite window is written into every
 * entry rather than left to the reader.
 *
 * @param {object} spec
 * @param {object} spec.report - From binaryRunPanel.binarySweepReport()
 * @param {string} [spec.prediction] - What the student said before running it
 * @param {object} [spec.provenance] - Extra provenance fields
 * @returns {?object} A draft entry
 */
export function fromBinarySweep({ report, prediction = '', provenance = {} }) {
  if (!report?.trials?.length) return null;

  const held = report.held || {};
  const counted = outcome =>
    report.trials.filter(tr => tr.outcome === outcome).length;

  const quantities = [
    quantity({
      label: t('nb.binarySweep.trials'),
      value: report.trials.length,
      unit: '',
      kind: KIND.MEASURED,
    }),
    quantity({
      label: t('nb.binarySweep.window'),
      value: report.periods,
      unit: t('nb.binarySweep.periods'),
      kind: KIND.MEASURED,
      // The number that makes every other number in this entry conditional.
      note: t('nb.binarySweep.windowNote'),
    }),
    quantity({
      label: t('nb.binarySweep.survived'),
      value: counted('survived'),
      unit: '',
      kind: KIND.MEASURED,
      note: t('nb.binarySweep.survivedNote'),
    }),
    quantity({
      label: t('nb.binarySweep.ejected'),
      value: counted('ejected'),
      unit: '',
      kind: KIND.MEASURED,
    }),
  ];
  const unusable =
    counted('incomplete') + counted('unreliable') + counted('notRun');
  if (unusable) {
    quantities.push(
      quantity({
        label: t('nb.binarySweep.unusable'),
        value: unusable,
        unit: '',
        kind: KIND.MEASURED,
        note: t('nb.binarySweep.unusableNote'),
      })
    );
  }

  // One series per outcome, points only. A line through these would be a
  // stability boundary drawn through five samples, which is exactly the claim
  // the lesson spends its second half taking apart.
  const outcomes = [...new Set(report.trials.map(tr => tr.outcome))];
  const fig = figure({
    title: t('nb.binarySweep.figure'),
    xLabel: t('nb.binarySweep.axisX'),
    yLabel: t('nb.binarySweep.axisY'),
    series: outcomes.map((outcome, i) =>
      figureSeries({
        label: t(`binarySweep.outcome.${outcome}`),
        kind: KIND.MEASURED,
        style: 'points',
        points: report.trials
          .filter(tr => tr.outcome === outcome)
          .map(tr => [tr.value, i + 1])
          .sort((a, b) => a[0] - b[0]),
      })
    ),
  });

  const flags = [];
  if (report.cancelled) flags.push('cancelled');
  if (unusable) flags.push('failed-trials');

  const lines = report.trials.map(tr =>
    t('nb.binarySweep.line', {
      value: tr.value,
      outcome: t(`binarySweep.outcome.${tr.outcome}`),
      done: Number(tr.periodsDone ?? 0).toFixed(1),
      asked: tr.periodsAsked ?? '—',
    })
  );

  return buildEntry({
    source: SOURCE.BENCH_SWEEP,
    title: t('nb.binarySweep.title', { scenario: report.kind }),
    quantities,
    figure: fig,
    provenance: provenanceOf({
      ...provenance,
      seed: provenance.seed ?? report.seed ?? null,
      // The settings the trials were actually integrated at, from the sweep's
      // own record rather than from whatever the panel shows now.
      integrator: provenance.integrator ?? held.integrator ?? null,
      timestep: provenance.timestep ?? held.maxTimestep ?? null,
      simSpeed: provenance.simSpeed ?? held.simSpeed ?? null,
      substeps: provenance.substeps ?? report.numerics?.substeps ?? null,
      flags: [...(provenance.flags || []), ...flags],
    }),
    prose: {
      claim: prediction ? t('nb.binarySweep.predicted', { prediction }) : '',
      evidence: [t('nb.binarySweep.evidence'), ...lines].join('\n'),
      limitations: [
        t('nb.binarySweep.limit.window', { periods: report.periods }),
        t('nb.binarySweep.limit.held', {
          m1: held.m1,
          m2: held.m2,
          e: held.eccentricity,
          seed: report.seed,
        }),
        ...(unusable
          ? [t('nb.binarySweep.limit.unusable', { n: unusable })]
          : []),
        ...(report.cancelled ? [t('nb.binarySweep.limit.cancelled')] : []),
        ...(report.recheck
          ? [
              report.recheck.verdict.converged
                ? t('nb.binarySweep.limit.resolved', {
                    value: report.recheck.value,
                  })
                : t('nb.binarySweep.limit.unresolved', {
                    value: report.recheck.value,
                  }),
            ]
          : [t('nb.binarySweep.limit.noRecheck')]),
      ].join('\n'),
    },
  });
}

/**
 * A numerical-reliability check: the same state at dt and dt/2.
 *
 * The one source where the distinction this module exists for is the whole
 * point. Both runs are measured. What the check produces is not a better
 * measurement but a statement about whether the first one can be trusted, and
 * the entry keeps the drift figures rather than a verdict, because "accurate"
 * is exactly the badge the bench refuses to print.
 *
 * @param {object} spec
 * @param {object} spec.report - From bench.buildReliabilityReport()
 * @param {object} [spec.provenance] - Extra provenance fields
 * @returns {?object} A draft entry
 */
export function fromReliability({
  report,
  labelFor = id => id,
  provenance = {},
}) {
  if (!report?.metrics?.length) return null;

  const quantities = [];
  for (const m of report.metrics) {
    if (m.coarse === null && m.fine === null) continue;
    quantities.push(
      quantity({
        label: t('nb.rel.coarse', { metric: labelFor(m.metric) }),
        value: m.coarse,
        unit: m.unit || '',
        kind: KIND.MEASURED,
      }),
      quantity({
        label: t('nb.rel.fine', { metric: labelFor(m.metric) }),
        value: m.fine,
        unit: m.unit || '',
        kind: KIND.MEASURED,
        // Whether refinement moved this quantity by more than the declared
        // tolerance, attached to the number it is about. Not a verdict on the
        // run: some quantities survive refinement while others do not, and
        // that is the useful output.
        note:
          m.agrees === null
            ? ''
            : t(m.agrees ? 'nb.rel.agrees' : 'nb.rel.moved', {
                tolerance: String(report.tolerance),
              }),
      })
    );
  }

  // What the check cost, because halving the step is not free and a student
  // deciding whether to run one needs the number.
  if (Number.isFinite(report.cost?.wallMs)) {
    quantities.push(
      quantity({
        label: t('nb.rel.cost'),
        value: report.cost.wallMs / 1000,
        unit: 's',
        kind: KIND.MEASURED,
        note: t('nb.rel.costNote'),
      })
    );
  }

  // The two statistics that separate a chaotic pair from a badly resolved
  // one. The aligned paths themselves are not kept by the reliability report -
  // it summarises them and discards the rows - so there is no figure to draw
  // here, and inventing one from the summary would be worse than none.
  if (report.series) {
    quantities.push(
      quantity({
        label: t('nb.rel.earlyWorst'),
        value: report.series.earlyWorst,
        unit: '',
        kind: KIND.MEASURED,
        note: t('nb.rel.earlyNote', {
          n: String(report.series.earlySamples ?? '?'),
        }),
      }),
      quantity({
        label: t('nb.rel.worst'),
        value: report.series.worst,
        unit: '',
        kind: KIND.MEASURED,
        note: t('nb.rel.worstNote'),
      })
    );
  }

  // Flags, not a badge. The bench deliberately refuses to print "accurate"
  // and an entry that carried one would undo that in the report.
  const flags = ['reliability-check', `verdict-${report.verdict}`];

  const p = provenance || {};
  return buildEntry({
    source: SOURCE.BENCH_RELIABILITY,
    title: t('nb.rel.title', {
      scenario: p.scenario || t('nb.unknownScenario'),
    }),
    quantities,
    figure: null,
    provenance: provenanceOf({
      ...p,
      integrator: p.integrator ?? report.integrator ?? null,
      timestep: p.timestep ?? report.steps?.coarse ?? null,
      substeps: p.substeps ?? report.cost?.substeps?.coarse ?? null,
      flags: [...(p.flags || []), ...flags],
    }),
    prose: {
      evidence: t('nb.rel.evidence', {
        coarse: String(report.steps?.coarse ?? '?'),
        fine: String(report.steps?.fine ?? '?'),
        tolerance: String(report.tolerance),
      }),
      limitations: [
        t('nb.rel.limit.conservation'),
        t('nb.rel.limit.chaos'),
        t('nb.rel.limit.noFigure'),
        t(`nb.rel.limit.verdict.${report.verdict}`),
      ].join('\n'),
    },
  });
}

/**
 * The gravity-assist lesson's two-pass comparison.
 *
 * Recorded as one entry rather than two, because the whole point of the
 * experiment is the pair: an entry per pass would keep both sets of numbers
 * and lose the comparison between them, which is the thing that was measured.
 *
 * The quantities chosen are the ones that carry the argument. The velocity
 * change appears once, not twice, because it is the same on both sides and
 * saying so is the finding. The two speed changes appear separately, because
 * they are not, and reporting a single magnitude would assert a symmetry the
 * lesson exists to deny.
 *
 * @param {object} args - report, prediction, provenance
 * @returns {?object} The entry, or null if there is nothing to record
 */
export function fromAssistComparison({
  report,
  prediction = '',
  provenance = {},
}) {
  const gaining = report?.gaining ?? null;
  const losing = report?.losing ?? null;
  if (!gaining && !losing) return null;
  const held = report.held || {};
  const sides = report.sides || null;
  const audit = report.audit || null;

  const quantities = [];
  const speed = (label, value, note) =>
    quantities.push(
      quantity({
        label,
        value,
        unit: t('nb.assist.unit.speed'),
        kind: KIND.MEASURED,
        ...(note ? { note } : {}),
      })
    );

  if (gaining?.usable) {
    speed(t('nb.assist.ab.gain'), gaining.speedChange);
    speed(
      t('nb.assist.ab.deltaV'),
      gaining.deltaVMagnitude,
      t('nb.assist.ab.deltaVNote')
    );
  }
  if (losing?.usable) speed(t('nb.assist.ab.loss'), losing.speedChange);
  if (gaining?.usable) {
    quantities.push(
      quantity({
        label: t('nb.assist.ab.relResidual'),
        value: (gaining.relativeResidual ?? 0) * 100,
        unit: '%',
        kind: KIND.MEASURED,
        note: t('nb.assist.ab.relResidualNote'),
      })
    );
  }
  if (audit) {
    quantities.push(
      quantity({
        label: t('nb.assist.ab.recoil'),
        value: audit.planetRecoil,
        unit: t('nb.assist.unit.simVelocity'),
        kind: KIND.MEASURED,
        note: t('nb.assist.ab.recoilNote', {
          ratio: audit.recoilRatio,
          mass: audit.massRatio,
        }),
      })
    );
  }
  // Counted and named, so an entry made from one usable pass cannot read as an
  // entry made from two.
  const missing = [gaining, losing].filter(enc => enc && !enc.usable);
  if (missing.length) {
    quantities.push(
      quantity({
        label: t('nb.assist.incomplete'),
        value: missing.length,
        unit: '',
        kind: KIND.MEASURED,
        note: t('nb.assist.incompleteNote'),
      })
    );
  }

  // Speed before and after, in both frames, for both passes. Four points per
  // series and no line: these are two readings, not a time series, and a line
  // between them would draw an encounter nobody sampled.
  const fig = figure({
    title: t('nb.assist.ab.figure'),
    xLabel: t('nb.assist.ab.axisX'),
    yLabel: t('nb.assist.ab.axisY'),
    series: [
      ['gaining', gaining],
      ['losing', losing],
    ]
      .filter(([, enc]) => enc?.usable)
      .flatMap(([which, enc]) => [
        figureSeries({
          label: t(`nb.assist.ab.series.${which}.planet`),
          kind: KIND.MEASURED,
          style: 'points',
          points: [
            [0, enc.relBefore],
            [1, enc.relAfter],
          ],
        }),
        figureSeries({
          label: t(`nb.assist.ab.series.${which}.inertial`),
          kind: KIND.MEASURED,
          style: 'points',
          points: [
            [0, enc.inertBefore],
            [1, enc.inertAfter],
          ],
        }),
      ]),
  });

  const flags = [];
  if (report.cancelled) flags.push('cancelled');
  if (missing.length) flags.push('failed-trials');

  return buildEntry({
    source: SOURCE.BENCH_COMPARISON,
    title: t('nb.assist.ab.title'),
    quantities,
    figure: fig,
    provenance: provenanceOf({
      ...provenance,
      scenario: provenance.scenario ?? report.scenario ?? 'Gravity Assist Lab',
      seed: provenance.seed ?? report.seed ?? null,
      // What the passes were actually integrated at, from the experiment's own
      // record rather than from whatever the panel shows now.
      integrator: provenance.integrator ?? held.integrator ?? null,
      timestep: provenance.timestep ?? report.numerics?.step ?? null,
      simSpeed: provenance.simSpeed ?? held.simSpeed ?? null,
      substeps: provenance.substeps ?? report.numerics?.substeps ?? null,
      flags: [...(provenance.flags || []), ...flags],
    }),
    prose: {
      claim: prediction ? t('nb.assist.predicted', { prediction }) : '',
      evidence: [
        t('nb.assist.ab.evidence'),
        ...[
          ['gaining', gaining],
          ['losing', losing],
        ]
          .filter(([, enc]) => enc)
          .map(([which, enc]) =>
            t('nb.assist.ab.line', {
              which: t(`nb.assist.ab.which.${which}`),
              b: enc.value,
              outcome: t(`assist.encounter.${enc.outcome}`),
              turn: Number(Math.abs(enc.deflectionDeg ?? 0)).toFixed(2),
              change: Number(enc.speedChange ?? 0).toFixed(4),
            })
          ),
      ].join('\n'),
      // Ordered so the two that describe a broken run come first. The field
      // has a length limit, and a limitation that gets clipped off the end is
      // a limitation nobody reads - so the ones that say "this did not happen"
      // are never the ones at risk.
      limitations: [
        ...(missing.length
          ? [t('nb.assist.limit.incomplete', { n: missing.length })]
          : []),
        ...(report.cancelled ? [t('nb.assist.limit.cancelled')] : []),
        // Only when there are two passes to compare. With one, a ratio would
        // be a number invented out of a missing measurement.
        ...(sides
          ? [
              t('nb.assist.ab.limit.notMirrored', {
                ratio: Number(sides.speedChangeRatio ?? 0).toFixed(2),
              }),
            ]
          : []),
        t('nb.assist.ab.limit.recoil'),
        t('nb.assist.limit.gate', { gate: report.gate ?? held.gate ?? 0 }),
        t('nb.assist.limit.held', {
          vinf: held.vInfinity ?? 0,
          seed: report.seed ?? '',
        }),
      ].join('\n'),
    },
  });
}

/**
 * The gravity-assist lesson's impact-parameter sweep.
 *
 * Two quantities per pass and no fit. The question the lesson asks of these
 * five points - does the biggest turn also gain the most - is answered by
 * which point is highest, and a curve through five samples would answer a
 * question nobody asked and answer it with more confidence than five points
 * can support.
 *
 * @param {object} args - report, prediction, provenance
 * @returns {?object} The entry, or null if there is nothing to record
 */
export function fromAssistSweep({ report, prediction = '', provenance = {} }) {
  if (!report?.encounters?.length) return null;
  const held = report.held || {};
  const usable = report.encounters.filter(enc => enc.usable);
  const missing = report.encounters.filter(enc => !enc.usable);
  const verdict = report.verdict || null;

  const quantities = [
    quantity({
      label: t('nb.assist.sweep.passes'),
      value: report.encounters.length,
      unit: '',
      kind: KIND.MEASURED,
      note: t('nb.assist.sweep.passesNote', { n: usable.length }),
    }),
  ];
  if (verdict) {
    quantities.push(
      quantity({
        label: t('nb.assist.sweep.mostTurned'),
        value: verdict.mostTurned,
        unit: t('nb.assist.unit.simUnits'),
        kind: KIND.MEASURED,
      }),
      quantity({
        label: t('nb.assist.sweep.mostGained'),
        value: verdict.mostGained,
        unit: t('nb.assist.unit.simUnits'),
        kind: KIND.MEASURED,
        note: verdict.same
          ? t('nb.assist.sweep.sameNote')
          : t('nb.assist.sweep.differentNote'),
      })
    );
  }
  if (missing.length) {
    quantities.push(
      quantity({
        label: t('nb.assist.incomplete'),
        value: missing.length,
        unit: '',
        kind: KIND.MEASURED,
        note: t('nb.assist.incompleteNote'),
      })
    );
  }

  const fig = figure({
    title: t('nb.assist.sweep.figure'),
    xLabel: t('nb.assist.sweep.axisX'),
    yLabel: t('nb.assist.sweep.axisY'),
    series: [
      figureSeries({
        label: t('nb.assist.sweep.series.turn'),
        kind: KIND.MEASURED,
        style: 'points',
        points: usable
          .map(enc => [Math.abs(enc.value), Math.abs(enc.deflectionDeg)])
          .sort((a, b) => a[0] - b[0]),
      }),
      figureSeries({
        label: t('nb.assist.sweep.series.gain'),
        kind: KIND.MEASURED,
        style: 'points',
        points: usable
          .map(enc => [Math.abs(enc.value), enc.speedChange])
          .sort((a, b) => a[0] - b[0]),
      }),
    ],
  });

  const flags = [];
  if (report.cancelled) flags.push('cancelled');
  if (missing.length) flags.push('failed-trials');

  return buildEntry({
    source: SOURCE.BENCH_SWEEP,
    title: t('nb.assist.sweep.title'),
    quantities,
    figure: fig,
    provenance: provenanceOf({
      ...provenance,
      scenario: provenance.scenario ?? report.scenario ?? 'Gravity Assist Lab',
      seed: provenance.seed ?? report.seed ?? null,
      integrator: provenance.integrator ?? held.integrator ?? null,
      timestep: provenance.timestep ?? report.numerics?.step ?? null,
      simSpeed: provenance.simSpeed ?? held.simSpeed ?? null,
      substeps: provenance.substeps ?? report.numerics?.substeps ?? null,
      flags: [...(provenance.flags || []), ...flags],
    }),
    prose: {
      claim: prediction ? t('nb.assist.predicted', { prediction }) : '',
      evidence: [
        t('nb.assist.sweep.evidence'),
        ...report.encounters.map(enc =>
          t('nb.assist.sweep.line', {
            b: enc.value,
            outcome: t(`assist.encounter.${enc.outcome}`),
            turn: Number(Math.abs(enc.deflectionDeg ?? 0)).toFixed(2),
            change: Number(enc.speedChange ?? 0).toFixed(4),
          })
        ),
      ].join('\n'),
      // Same ordering rule as the comparison above, and for the same reason.
      limitations: [
        ...(missing.length
          ? [t('nb.assist.limit.incomplete', { n: missing.length })]
          : []),
        ...(report.cancelled ? [t('nb.assist.limit.cancelled')] : []),
        t('nb.assist.sweep.limit.oneSide'),
        t('nb.assist.sweep.limit.notALaw'),
        t('nb.assist.limit.gate', { gate: report.gate ?? held.gate ?? 0 }),
        t('nb.assist.limit.held', {
          vinf: held.vInfinity ?? 0,
          seed: report.seed ?? '',
        }),
      ].join('\n'),
    },
  });
}

/**
 * The chaos lesson's controlled pair, and whether it survived refinement.
 *
 * The divergence result and the refinement verdict are kept as separate
 * quantities, and the second never stands in for the first. A resolved
 * refinement says the arithmetic is not the cause; it says nothing about
 * whether anything diverged. An entry that reported only "resolved" would be
 * an entry about the integrator.
 *
 * @param {object} args - report, prediction, provenance
 * @returns {?object} The entry, or null if there is nothing to record
 */
export function fromChaosPair({ report, prediction = '', provenance = {} }) {
  if (!report?.a || !report?.b) return null;
  const v = report.verdict || null;
  const exponential = v?.behaviour === 'exponential';

  const quantities = [
    quantity({
      label: t('nb.chaosPair.interval'),
      value: Math.min(report.a.span ?? 0, report.b.span ?? 0),
      unit: t('nb.chaosPair.simSeconds'),
      kind: KIND.MEASURED,
      note: t('nb.chaosPair.intervalNote', {
        a: Number(report.a.span ?? 0).toFixed(1),
        b: Number(report.b.span ?? 0).toFixed(1),
      }),
    }),
    // The step the engine took, not the one the settings asked for. The whole
    // numerical control rests on this being a measurement.
    quantity({
      label: t('nb.chaosPair.step'),
      value: report.a.mean,
      unit: t('nb.chaosPair.simSeconds'),
      kind: KIND.MEASURED,
      note: t('nb.chaosPair.stepNote', {
        n: report.a.steps ?? 0,
        integrator: report.a.integrator ?? '?',
      }),
    }),
  ];

  if (exponential) {
    quantities.push(
      quantity({
        label: t('nb.chaosPair.tau'),
        value: v.tau,
        unit: t('nb.chaosPair.simSeconds'),
        kind: KIND.MEASURED,
        note: t('nb.chaosPair.tauNote', {
          r2: Number(v.r2 ?? 0).toFixed(3),
          from: Number(v.window?.from ?? 0).toFixed(1),
          to: Number(v.window?.to ?? 0).toFixed(1),
        }),
      }),
      quantity({
        label: t('nb.chaosPair.growth'),
        value: v.growth,
        unit: '',
        kind: KIND.MEASURED,
      })
    );
  } else if (v) {
    // The two-body counterexample lands here, and it is a result: the
    // instrument measured growth and refused to call it exponential.
    quantities.push(
      quantity({
        label: t('nb.chaosPair.behaviour'),
        value: 0,
        unit: '',
        kind: KIND.MEASURED,
        note: t(`nb.chaosPair.behaviour.${v.behaviour}`, {
          r2: Number(v.linearR2 ?? 0).toFixed(3),
        }),
      })
    );
  }

  const refinement = report.refinement || null;
  if (refinement) {
    quantities.push(
      quantity({
        label: t('nb.chaosPair.controls'),
        value: refinement.effective ?? 0,
        unit: '',
        kind: KIND.MEASURED,
        note: refinement.resolved
          ? t('nb.chaosPair.controlsResolved', {
              spread: Number((refinement.spread ?? 0) * 100).toFixed(1),
            })
          : t('nb.chaosPair.controlsUnresolved'),
      })
    );
  }

  const fig = figure({
    title: t('nb.chaosPair.figure'),
    xLabel: t('nb.chaosPair.axisX'),
    yLabel: t('nb.chaosPair.axisY'),
    series: [
      figureSeries({
        label: t('nb.chaosPair.series.separation'),
        kind: KIND.MEASURED,
        style: 'line',
        points: (report.series || []).map(p => [p.t, p.d]),
      }),
    ],
  });

  const flags = [];
  if (report.cancelled) flags.push('cancelled');
  if (refinement && !refinement.resolved) flags.push('unresolved');
  if (report.interval && !report.interval.ok) flags.push('interval-mismatch');

  return buildEntry({
    source: SOURCE.BENCH_COMPARISON,
    title: t(`nb.chaosPair.title.${report.configuration || 'triple'}`),
    quantities,
    figure: fig,
    provenance: provenanceOf({
      ...provenance,
      scenario: provenance.scenario ?? report.scenario ?? null,
      integrator: provenance.integrator ?? report.a.integrator ?? null,
      timestep: provenance.timestep ?? report.a.maxTimestep ?? null,
      simSpeed: provenance.simSpeed ?? report.a.simSpeed ?? null,
      flags: [...(provenance.flags || []), ...flags],
    }),
    prose: {
      claim: prediction ? t('nb.chaosPair.predicted', { prediction }) : '',
      evidence: [
        report.perturbation
          ? t('nb.chaosPair.evidence', {
              km: report.perturbation.km,
              axis: report.perturbation.axis,
              body: report.perturbation.bodyName ?? '',
            })
          : t('nb.chaosPair.evidenceNoPerturbation'),
        exponential
          ? t('nb.chaosPair.evidenceExponential', {
              tau: Number(v.tau).toFixed(2),
              efolds: Number(v.efolds ?? 0).toFixed(1),
            })
          : t('nb.chaosPair.evidenceOther', {
              behaviour: t(`nb.chaosPair.behaviour.${v?.behaviour || 'none'}`, {
                r2: Number(v?.linearR2 ?? 0).toFixed(3),
              }),
            }),
      ].join('\n'),
      limitations: [
        // Ordered so the ones that describe a broken run come first: the
        // field has a length limit and a clipped limitation is unread.
        ...(report.cancelled ? [t('nb.chaosPair.limit.cancelled')] : []),
        ...(report.interval && !report.interval.ok
          ? [t('nb.chaosPair.limit.interval')]
          : []),
        ...(refinement && !refinement.resolved
          ? [t('nb.chaosPair.limit.unresolved')]
          : []),
        ...(exponential
          ? [
              t('nb.chaosPair.limit.window', {
                from: Number(v.window?.from ?? 0).toFixed(1),
                to: Number(v.window?.to ?? 0).toFixed(1),
              }),
            ]
          : []),
        t('nb.chaosPair.limit.estimate'),
      ].join('\n'),
    },
  });
}

/**
 * The Lagrange lesson's controlled pair: one accessible region, two paths.
 *
 * The entry is arranged so the control comes before the result. If the two
 * arms did not have the same Jacobi constant, or the neck was not open, then
 * the two paths differ for a reason the activity was built to exclude, and
 * saying that first is the difference between evidence and a picture.
 *
 * @param {object} args - report, prediction, provenance
 * @returns {?object} The entry, or null if there is nothing to record
 */
export function fromNeckPair({ report, prediction = '', provenance = {} }) {
  const a = report?.a ?? null;
  const b = report?.b ?? null;
  if (!a?.conditions || !b?.conditions) return null;
  const c = report.comparison || null;
  const held = report.held || {};

  const quantities = [
    quantity({
      label: t('nb.neckPair.constantA'),
      value: a.conditions.C,
      unit: '',
      kind: KIND.MEASURED,
      note: t('nb.neckPair.constantNote'),
    }),
    quantity({
      label: t('nb.neckPair.constantB'),
      value: b.conditions.C,
      unit: '',
      kind: KIND.MEASURED,
    }),
    quantity({
      label: t('nb.neckPair.speed'),
      value: a.conditions.speed,
      unit: '',
      kind: KIND.MEASURED,
      note: t('nb.neckPair.speedNote', {
        a: Number(a.conditions.appliedDirection ?? 0).toFixed(1),
        b: Number(b.conditions.appliedDirection ?? 0).toFixed(1),
      }),
    }),
    quantity({
      label: t('nb.neckPair.closestA'),
      value: a.path?.closestToL1 ?? null,
      unit: '',
      kind: KIND.MEASURED,
      note: t('nb.neckPair.closestNote'),
    }),
    quantity({
      label: t('nb.neckPair.closestB'),
      value: b.path?.closestToL1 ?? null,
      unit: '',
      kind: KIND.MEASURED,
    }),
  ];

  // Both paths in the rotating frame, which is the frame the claim is made in
  // and the frame the overlay draws. Points, not a fitted anything.
  const fig = figure({
    title: t('nb.neckPair.figure'),
    xLabel: t('nb.neckPair.axisX'),
    yLabel: t('nb.neckPair.axisY'),
    series: [
      ['a', a],
      ['b', b],
    ].map(([which, arm]) =>
      figureSeries({
        label: t(`nb.neckPair.series.${which}`, {
          deg: Number(arm.conditions.direction ?? 0).toFixed(0),
        }),
        kind: KIND.MEASURED,
        style: 'points',
        points: (arm.samples || []).map(p => [p.x, p.y]),
      })
    ),
  });

  const flags = [];
  if (report.cancelled) flags.push('cancelled');
  if (c && !c.region.ok) flags.push('not-controlled');
  if (c && !c.bothComplete) flags.push('window-incomplete');

  return buildEntry({
    source: SOURCE.BENCH_COMPARISON,
    title: t('nb.neckPair.title'),
    quantities,
    figure: fig,
    provenance: provenanceOf({
      ...provenance,
      scenario: provenance.scenario ?? report.scenario ?? null,
      integrator: provenance.integrator ?? held.integrator ?? null,
      timestep: provenance.timestep ?? held.maxTimestep ?? null,
      simSpeed: provenance.simSpeed ?? held.simSpeed ?? null,
      flags: [...(provenance.flags || []), ...flags],
    }),
    prose: {
      claim: prediction ? t('nb.neckPair.predicted', { prediction }) : '',
      evidence: [
        t('nb.neckPair.evidence', {
          periods: report.periods ?? 0,
          a: Number(a.conditions.direction ?? 0).toFixed(0),
          b: Number(b.conditions.direction ?? 0).toFixed(0),
        }),
        t(a.path?.crossed ? 'nb.neckPair.crossed' : 'nb.neckPair.notCrossed', {
          which: 'A',
          t: Number(a.path?.firstCrossing ?? 0).toFixed(1),
        }),
        t(b.path?.crossed ? 'nb.neckPair.crossed' : 'nb.neckPair.notCrossed', {
          which: 'B',
          t: Number(b.path?.firstCrossing ?? 0).toFixed(1),
        }),
      ].join('\n'),
      limitations: [
        ...(c && !c.region.ok ? [t('nb.neckPair.limit.notControlled')] : []),
        ...(report.cancelled ? [t('nb.neckPair.limit.cancelled')] : []),
        ...(c && !c.bothComplete ? [t('nb.neckPair.limit.short')] : []),
        // The one that is always true, and the one the lesson exists to stop
        // a reader losing.
        t('nb.neckPair.limit.window', { periods: report.periods ?? 0 }),
        t('nb.neckPair.limit.stability'),
      ].join('\n'),
    },
  });
}

/**
 * A reading from the gravitational-wave lab, or from the published data.
 *
 * Two kinds of thing come through here and the entry has to keep them apart.
 * A modelled signal is a *model*, so its numbers are ANALYTIC and its
 * limitations name the approximation and where it stops. The GW150914 traces
 * are a *measurement*, so theirs are MEASURED and their limitations name the
 * filtering the collaboration applied before publishing. Nothing about the two
 * is merged, and a reader of the report can tell which they have.
 *
 * @param {object} spec
 * @param {object} spec.snapshot - From js/gwLab.js snapshotOf(), or a data card
 * @param {Array<Array<number>>} [spec.envelope] - [[t, h], ...], already thinned
 * @param {object} [spec.comparison] - From js/gwLab.js comparison()
 * @param {?number} [spec.similarity] - A normalised overlap, never an SNR
 * @param {object} [spec.dataProvenance] - PROVENANCE from a bundled dataset
 * @param {string} [spec.prediction] - What the student said before looking
 * @param {object} [spec.provenance] - The live world's provenance
 * @returns {?object} A notebook entry
 */
export function fromGwObservation({
  snapshot,
  envelope = null,
  comparison = null,
  similarity = null,
  dataProvenance = null,
  prediction = '',
  provenance = {},
}) {
  if (!snapshot) return null;
  const measured = Boolean(dataProvenance);
  const kind = measured ? KIND.MEASURED : KIND.ANALYTIC;
  const quantities = [];

  const add = (label, value, unit, note = '') => {
    if (value === null || value === undefined || !Number.isFinite(value))
      return;
    quantities.push(quantity({ label, value, unit, kind, note }));
  };

  if (!measured) {
    add(t('nb.gw.m1'), snapshot.m1, 'M☉', t('nb.gw.detectorFrame'));
    add(t('nb.gw.m2'), snapshot.m2, 'M☉', t('nb.gw.detectorFrame'));
    add(
      t('nb.gw.chirpMass'),
      snapshot.chirpMassSun,
      'M☉',
      t('nb.gw.detectorFrame')
    );
    add(t('nb.gw.distance'), snapshot.distanceMpc, 'Mpc');
    add(t('nb.gw.inclination'), snapshot.inclinationDeg, '°');
    add(
      t('nb.gw.effectiveDistance'),
      snapshot.effectiveDistanceMpc,
      'Mpc',
      t('nb.gw.effectiveDistanceNote')
    );
    add(t('nb.gw.frequency'), snapshot.frequencyAtCursorHz, 'Hz');
    add(t('nb.gw.toMerger'), snapshot.cursorSecondsToMerger, 's');
    add(t('nb.gw.strain'), snapshot.strainAtCursor, '');
    add(t('nb.gw.peakStrain'), snapshot.peakStrain, '');
    add(t('nb.gw.separation'), snapshot.separationRsAtCursor, 'Rs');
    add(t('nb.gw.velocity'), snapshot.vOverCAtCursor, 'v/c');
    add(t('nb.gw.isco'), snapshot.iscoHz, 'Hz');
    add(t('nb.gw.windowSeconds'), snapshot.windowSeconds, 's');
    add(t('nb.gw.cycles'), snapshot.cyclesInWindow, '');
  }
  if (similarity !== null && Number.isFinite(similarity)) {
    quantities.push(
      quantity({
        label: t('nb.gw.similarity'),
        value: similarity,
        unit: '',
        kind: KIND.MEASURED,
        note: t('nb.gw.similarityNote'),
      })
    );
  }

  const limitations = [];
  if (measured) {
    limitations.push(
      t('nb.gw.limit.published', {
        paper: dataProvenance.paper,
        doi: dataProvenance.doi,
      })
    );
    limitations.push(t('nb.gw.limit.filtered'));
    limitations.push(t('nb.gw.limit.noise'));
  } else {
    limitations.push(t('nb.gw.limit.model'));
    limitations.push(
      t('nb.gw.limit.isco', { isco: Math.round(snapshot.iscoHz) })
    );
    if (snapshot.excerpted) {
      limitations.push(
        t('nb.gw.limit.excerpt', {
          window: Number(snapshot.windowSeconds).toFixed(1),
          full: Number(snapshot.fullBandSeconds).toFixed(0),
        })
      );
    }
    if (
      snapshot.fidelityAtCursor === 'poor' ||
      snapshot.fidelityAtCursor === 'fair'
    ) {
      limitations.push(
        t('nb.gw.limit.velocity', {
          v: Number(snapshot.vOverCAtCursor).toFixed(2),
        })
      );
    }
    limitations.push(t('nb.gw.limit.response'));
    if (snapshot.noise) {
      limitations.push(
        t('nb.gw.limit.noise.synthetic', { seed: snapshot.noise.seed })
      );
    }
  }
  if (comparison && !comparison.controlled && comparison.changed.length > 1) {
    limitations.push(t('nb.gw.limit.uncontrolled'));
  }
  if (similarity !== null) limitations.push(t('nb.gw.limit.similarity'));

  const evidence = [];
  if (comparison) {
    evidence.push(
      comparison.changed.length
        ? t('nb.gw.evidence.changed', {
            changed: comparison.changed.join(', '),
            held: comparison.held.join(', ') || '—',
          })
        : t('nb.gw.evidence.identical')
    );
  }
  if (prediction) evidence.push(t('nb.gw.evidence.prediction', { prediction }));

  // The figure is built here rather than handed in, so that its point cap and
  // its kind tag are the ones every other capture uses.
  const fig =
    envelope && envelope.length
      ? figure({
          title: t('nb.gw.figure.title'),
          xLabel: t('nb.gw.figure.x'),
          yLabel: t('nb.gw.figure.y'),
          series: [
            figureSeries({
              label: measured
                ? t('nb.gw.figure.measured')
                : t('nb.gw.figure.model'),
              kind,
              style: 'line',
              points: envelope,
            }),
          ],
        })
      : null;

  return buildEntry({
    source: SOURCE.GW_OBSERVATION,
    title: measured
      ? t('nb.gw.title.data', { event: dataProvenance.event })
      : t('nb.gw.title.model'),
    quantities,
    figure: fig,
    provenance: provenanceOf({
      ...provenance,
      ...(measured
        ? {
            scenario: dataProvenance.event,
            units: { strain: 'dimensionless' },
            recordedAt: dataProvenance.detectedAt,
            flags: ['real-data'],
          }
        : {
            scenario: 'gravitational-wave lab',
            units: { strain: 'dimensionless', mass: 'detector-frame M☉' },
            flags: [
              'model',
              ...(snapshot.excerpted ? ['excerpt'] : []),
              ...(snapshot.noise ? ['synthetic-noise'] : []),
            ],
          }),
    }),
    prose: {
      evidence: evidence.join('\n'),
      limitations: limitations.join('\n'),
    },
  });
}

/**
 * A reading from the Stellar Lab.
 *
 * The distinction this entry has to keep is the one the lab is built around: a
 * point somebody chose on a diagram is not a star. A free-cursor reading
 * carries a temperature, a luminosity and the radius they imply, and no mass,
 * no age and no lifetime, because those are not determined - and it says so in
 * its limitations rather than leaving the absence to be noticed. A modelled
 * reading carries all of them and names the track and the grid.
 *
 * @param {object} spec
 * @param {object} spec.snapshot - From js/stellarLab.js snapshotOf()
 * @param {object} [spec.provenance] - The live world's provenance
 * @returns {?object} A notebook entry
 */
export function fromStellarObservation({ snapshot, provenance = {} }) {
  if (!snapshot) return null;
  const modelled = snapshot.source === 'model';
  const kind = modelled ? KIND.ANALYTIC : KIND.MEASURED;
  const quantities = [];
  const add = (label, value, unit, note = '', k = kind) => {
    if (!Number.isFinite(value)) return;
    quantities.push(quantity({ label, value, unit, kind: k, note }));
  };

  add(t('nb.stellar.teff'), snapshot.teffK, 'K');
  add(t('nb.stellar.luminosity'), snapshot.luminositySun, 'L☉');
  add(
    t('nb.stellar.radius'),
    snapshot.radiusSun,
    'R☉',
    t('nb.stellar.radiusNote'),
    KIND.ANALYTIC
  );
  if (modelled) {
    add(t('nb.stellar.mass'), snapshot.massSun, 'M☉');
    add(t('nb.stellar.initialMass'), snapshot.initialMassSun, 'M☉');
    add(t('nb.stellar.age'), snapshot.ageYr, 'yr');
    add(t('nb.stellar.mainSequence'), snapshot.mainSequenceYr, 'yr');
  }

  // Every pinned star, so a ratio written in the prose can be checked.
  snapshot.pinned.forEach((p, i) => {
    add(t('nb.stellar.pinnedRadius', { n: i + 1 }), p.radiusSun, 'R☉');
    add(t('nb.stellar.pinnedTeff', { n: i + 1 }), p.teffK, 'K');
  });

  const limitations = [];
  // The grid is named whatever the cursor was doing, because a capture that
  // carries pinned stars carries modelled stars, and an entry that does not
  // say which models is a set of numbers with no provenance.
  if (!modelled && snapshot.pinned.length) {
    limitations.push(t('nb.stellar.limit.model', { grid: snapshot.grid }));
  }
  if (modelled) {
    limitations.push(t('nb.stellar.limit.model', { grid: snapshot.grid }));
    if (snapshot.trackComplete === false) {
      limitations.push(
        t('nb.stellar.limit.incomplete', { why: snapshot.trackEndsBecause })
      );
    }
  } else {
    limitations.push(t('nb.stellar.limit.hypothetical'));
    if (snapshot.ambiguous) {
      limitations.push(
        t('nb.stellar.limit.ambiguous', { n: snapshot.nearbyCount })
      );
    }
  }
  if (snapshot.pinned.length && snapshot.sizeMode === 'fit') {
    limitations.push(t('nb.stellar.limit.fitted'));
  }
  // A reading taken from the evolutionary playback carries two more things a
  // reader needs: which stage it was at, and - where the star has ended -
  // whether the endpoint came from the track or from somebody's published
  // prescription. Without the second, a remnant mass in a notebook is a
  // number with no author.
  if (snapshot.stage && snapshot.stage !== 'track') {
    limitations.push(t(`nb.stellar.limit.stage.${snapshot.stage}`));
  }
  if (snapshot.endpointKind && !snapshot.endpointFromTrack) {
    limitations.push(
      t('nb.stellar.limit.endpointQuoted', {
        cite: snapshot.endpointSource ?? '—',
      })
    );
  }

  return buildEntry({
    source: SOURCE.STELLAR_LAB,
    // Titled by what the reading is chiefly of. A capture taken with stars on
    // the comparison stage is about those stars, and calling it "a point on
    // the H-R diagram" because the cursor happened to be in free mode
    // describes the wrong half of the panel.
    title: snapshot.pinned.length
      ? t('nb.stellar.title.comparison', { n: snapshot.pinned.length })
      : modelled
        ? t('nb.stellar.title.model')
        : t('nb.stellar.title.point'),
    quantities,
    provenance: provenanceOf({
      ...provenance,
      scenario: 'stellar lab',
      units: {
        temperature: 'K',
        luminosity: 'solar',
        radius: 'solar, photospheric',
        mass: 'solar',
      },
      grid: snapshot.grid,
      flags: [
        modelled ? 'stellar-track' : 'hypothetical-point',
        ...(snapshot.ambiguous ? ['ambiguous'] : []),
        ...(snapshot.stage ? [`stage:${snapshot.stage}`] : []),
        ...(snapshot.pace ? [`paced-by:${snapshot.pace}`] : []),
        ...(snapshot.sizeMode ? [`sizes:${snapshot.sizeMode}`] : []),
        ...(snapshot.endpointKind ? [`ends-as:${snapshot.endpointKind}`] : []),
      ],
    }),
    prose: { limitations: limitations.join('\n') },
  });
}
