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
  put('worldGeneration', rec.worldGeneration);
  put('interventionEpoch', rec.interventionEpoch);
  // The direction the star was watched from when the samples were taken, not
  // wherever the sliders happen to be now.
  if (rec.geometry) {
    put('observer', {
      positionAngleDeg: rec.geometry.positionAngleDeg ?? null,
      inclinationDeg: rec.geometry.inclinationDeg ?? null,
    });
  }
  put('recordedAt', rec.recordedAt);
  put('scheduleFingerprint', rec.scheduleFingerprint);
  if (report?.uncertainty?.spec?.seed) {
    put('uncertaintySeed', report.uncertainty.spec.seed);
  }
  return out;
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
