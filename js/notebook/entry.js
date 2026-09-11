// =============================================================================
// One piece of evidence
// -----------------------------------------------------------------------------
// A notebook entry is two things joined, and the whole design is about keeping
// them apart:
//
//   the snapshot   numbers, a figure and the conditions they were taken under.
//                  Written once, at capture, and never again. Frozen, not by
//                  convention but by Object.freeze, because the failure this
//                  guards against is not somebody deciding to rewrite history
//                  - it is a panel that still holds a reference to an array it
//                  handed over, mutating it on the next frame, and quietly
//                  editing evidence a student wrote a claim about last week.
//
//   the prose      the claim, the evidence for it, the limitations. The
//                  student's own words, revised as often as they like.
//
// Annotating produces a new entry that shares the *same frozen snapshot
// object*. So there is no code path, correct or buggy, that changes a recorded
// number: the only writable half is the half a student is supposed to write.
//
// Measured, analytic, revealed
// -----------------------------------------------------------------------------
// Every quantity carries which of the three it is. A student who writes "my
// measured period agrees with the model" needs the report to show whether the
// second number was measured, predicted from theory, or read out of the
// simulation's own state - and the last of those is not a measurement at all.
// A figure's series carry the same tag, so a curve read off the truth is drawn
// differently from one fitted to data.
//
// Pure: no DOM, no storage, no imports from a panel. The capture helpers in
// capture.js turn instrument output into these; store.js persists them.
// =============================================================================

/** Bumped when the entry shape changes. See migrateEntry(). */
export const SCHEMA_VERSION = 1;

/**
 * Where a number came from.
 *
 * The distinction the report has to preserve. `MEASURED` is something the
 * student obtained from data the instrument produced; `ANALYTIC` is what a
 * closed-form model says should happen; `TRUTH` is the simulation's own state,
 * available only because this is a simulation and unavailable in any real
 * observation.
 */
export const KIND = Object.freeze({
  MEASURED: 'measured',
  ANALYTIC: 'analytic',
  TRUTH: 'truth',
});

/** All three, in the order a report lists them. */
export const KINDS = [KIND.MEASURED, KIND.ANALYTIC, KIND.TRUTH];

/** Which instrument an entry was captured from. */
export const SOURCE = Object.freeze({
  RV_FIT: 'rv-fit',
  BENCH_COMPARISON: 'bench-comparison',
  BENCH_RELIABILITY: 'bench-reliability',
  BENCH_SWEEP: 'bench-sweep',
  GW_OBSERVATION: 'gw-observation',
  STELLAR_LAB: 'stellar-lab',
  BINARY_ORBIT: 'binary-orbit',
  HORIZON_TRIALS: 'horizon-trials',
});

/** The sources this build can capture from. */
export const SOURCES = [
  SOURCE.RV_FIT,
  SOURCE.BENCH_COMPARISON,
  SOURCE.BENCH_RELIABILITY,
  SOURCE.BENCH_SWEEP,
  SOURCE.GW_OBSERVATION,
  SOURCE.STELLAR_LAB,
  SOURCE.BINARY_ORBIT,
  SOURCE.HORIZON_TRIALS,
];

/** How long a student's prose may be, per field. */
export const LIMITS = Object.freeze({
  title: 120,
  claim: 600,
  evidence: 900,
  limitations: 900,
  quantities: 40,
  seriesPoints: 400,
  series: 6,
});

/**
 * Freeze an object and everything under it.
 *
 * Recursive on purpose: freezing the entry alone would leave its quantity
 * array and its sample arrays writable, which is the whole hazard - the arrays
 * are what a panel keeps a reference to.
 *
 * @param {*} value - Anything
 * @returns {*} The same value, deeply frozen
 */
export function deepFreeze(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const key of Object.getOwnPropertyNames(value)) {
    deepFreeze(value[key]);
  }
  return value;
}

/** A finite number, or null. Keeps NaN and Infinity out of stored evidence. */
const num = v => (Number.isFinite(v) ? Number(v) : null);

/** Trim and cap a student-supplied string. */
const text = (v, max) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

/** Prose kept as typed apart from length: paragraphs are the student's. */
const prose = (v, max) =>
  String(v ?? '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, max);

/**
 * One recorded number.
 *
 * `unit` is required in the sense that omitting it stores the empty string and
 * the report prints the number bare - which is the honest rendering of a
 * number whose unit nobody recorded, and is visible enough that it gets fixed.
 *
 * @param {object} spec
 * @param {string} spec.label - What it is
 * @param {number} spec.value - The number
 * @param {string} [spec.unit] - Its unit
 * @param {string} [spec.kind] - One of KIND; measured by default
 * @param {?number} [spec.uncertainty] - Plus or minus, same unit
 * @param {string} [spec.note] - A qualification that travels with it
 * @returns {object} A quantity
 */
export function quantity({
  label,
  value,
  unit = '',
  kind = KIND.MEASURED,
  uncertainty = null,
  note = '',
}) {
  return {
    label: text(label, 80),
    value: num(value),
    unit: String(unit ?? ''),
    kind: KINDS.includes(kind) ? kind : KIND.MEASURED,
    uncertainty: num(uncertainty),
    note: text(note, 160),
  };
}

/**
 * One curve in a figure.
 *
 * Points are `[x, y]` pairs, thinned by the caller if need be: the cap here is
 * a refusal to store an unbounded array, not a plotting decision.
 *
 * @param {object} spec
 * @param {string} spec.label - Legend text
 * @param {Array<Array<number>>} spec.points - [[x, y], ...]
 * @param {string} [spec.kind] - One of KIND
 * @param {string} [spec.style] - 'line' or 'points'
 * @param {Array<number>} [spec.errors] - Half-height error bars, per point
 * @returns {object} A series
 */
export function figureSeries({
  label,
  points = [],
  kind = KIND.MEASURED,
  style = 'line',
  errors = null,
}) {
  const clean = [];
  for (const p of points) {
    const x = num(Array.isArray(p) ? p[0] : p?.x);
    const y = num(Array.isArray(p) ? p[1] : p?.y);
    if (x === null || y === null) continue;
    clean.push([x, y]);
    if (clean.length >= LIMITS.seriesPoints) break;
  }
  return {
    label: text(label, 60),
    kind: KINDS.includes(kind) ? kind : KIND.MEASURED,
    style: style === 'points' ? 'points' : 'line',
    points: clean,
    errors: Array.isArray(errors)
      ? errors.slice(0, clean.length).map(e => num(e) ?? 0)
      : null,
  };
}

/**
 * A figure: axes, their units, and up to a handful of series.
 *
 * @param {object} spec
 * @param {string} spec.title - Caption
 * @param {string} spec.xLabel - Horizontal axis, unit included
 * @param {string} spec.yLabel - Vertical axis, unit included
 * @param {Array<object>} spec.series - From figureSeries()
 * @param {boolean} [spec.logX] - Draw the horizontal axis logarithmically
 * @returns {?object} A figure, or null when there is nothing to draw
 */
export function figure({ title, xLabel, yLabel, series = [], logX = false }) {
  const kept = series.filter(s => s?.points?.length).slice(0, LIMITS.series);
  if (!kept.length) return null;
  return {
    title: text(title, 90),
    xLabel: text(xLabel, 60),
    yLabel: text(yLabel, 60),
    logX: Boolean(logX),
    series: kept,
  };
}

/**
 * The conditions a measurement was taken under.
 *
 * Every field is optional and every absent one is stored as null rather than
 * dropped. That is deliberate: a report that omits the seed reads as though
 * seeds do not matter, while one that prints "seed: not recorded" tells a
 * reader the measurement is not reproducible and why.
 *
 * @param {object} spec - As many of the fields below as are known
 * @returns {object} A provenance block
 */
export function provenanceOf({
  scenario = null,
  target = null,
  simTimeDays = null,
  simTimeSeconds = null,
  simTimeUnits = null,
  timeUnitSeconds = null,
  revisionSource = null,
  worldGeneration = null,
  interventionEpoch = null,
  seed = null,
  revision = null,
  integrator = null,
  timestep = null,
  simSpeed = null,
  substeps = null,
  referenceFrame = null,
  displayFrame = null,
  observer = null,
  units = null,
  quality = null,
  flags = [],
  initialStateHash = null,
  recordedAt = null,
  observedEpochs = null,
  analysedAt = null,
  scheduleFingerprint = null,
  uncertaintySeed = null,
  uncertainty = null,
} = {}) {
  return {
    scenario: scenario === null ? null : String(scenario),
    target: target === null ? null : String(target),
    // WHEN THE READING WAS TAKEN, which for a live instrument is the clock
    // now and for a completed recording is not known from the clock at all -
    // see observedEpochs below, which is where a recording's acquisition time
    // lives. Null here means the source does not know; it is never filled in
    // from the world on screen.
    //
    // Days for a reader, seconds for anybody reproducing it, and the raw
    // simulation clock under its own name. All three, because the clock is in
    // simulation time units whose length depends on the gravitational
    // constant: a reader given only "seconds" cannot check the arithmetic, and
    // a reader given a number labelled seconds that is really units has been
    // told something false.
    simTimeUnits: num(simTimeUnits),
    simTimeSeconds: num(simTimeSeconds),
    simTimeDays: num(simTimeDays),
    /** Seconds in one simulation time unit, so the conversion is checkable. */
    timeUnitSeconds: num(timeUnitSeconds),
    // Which world. Body ids restart from a counter on a rebuild, so this is
    // the only field that distinguishes two runs of the same scenario.
    worldGeneration: num(worldGeneration),
    // How many times a body's state was changed by hand before this reading.
    interventionEpoch: num(interventionEpoch),
    seed: seed === null ? null : String(seed),
    // The build. Null where there is none - a development server has neither
    // a deployed commit nor a stamp - because a fabricated version number
    // would be worse than an admitted absence. See revisionSource below.
    revision: revision === null ? null : String(revision),
    /**
     * Whether the revision identifies the deployed build, a local one, or
     * nothing at all. An unknown build and an inferred one are different
     * facts and a report that conflates them cannot be audited.
     */
    revisionSource: revisionSource === null ? null : String(revisionSource),
    numerical: {
      integrator: integrator === null ? null : String(integrator),
      maxTimestep: num(timestep),
      simSpeed: num(simSpeed),
      substeps: num(substeps),
    },
    /**
     * The frame the MEASUREMENTS were taken in, or null when the source does
     * not record one. Never filled in from the world on screen: a display
     * choice made later is not a fact about an older recording.
     */
    referenceFrame: referenceFrame === null ? null : String(referenceFrame),
    /** The frame the reader happened to be viewing in when they saved. */
    displayFrame: displayFrame === null ? null : String(displayFrame),
    observer: observer ? { ...observer } : null,
    units: units ? { ...units } : null,
    // The rendering tier and measured frame rate at capture. A reading taken
    // while the tier had dropped is still a reading, but a student comparing
    // two of them should be able to see that one was taken under load.
    quality: quality ? { ...quality } : null,
    // Anything the instrument wants to warn about, as short ids the report and
    // both locales can name: 'truth-revealed', 'degraded-epochs', 'capped'.
    flags: [...new Set((flags || []).filter(Boolean).map(String))].sort(),
    initialStateHash:
      initialStateHash === null ? null : String(initialStateHash),
    /** Wall-clock stamp from the instrument. Not a simulation time. */
    recordedAt: recordedAt === null ? null : String(recordedAt),
    /**
     * When the observations were made, in the recording's own units.
     *
     * Acquisition metadata, and the answer to the question the simulation
     * clock was being made to answer badly: a fit of a recording taken over
     * days 0 to 5.7 is evidence about days 0 to 5.7, whatever the clock said
     * when somebody pressed save.
     */
    observedEpochs: observedEpochs
      ? {
          count: num(observedEpochs.count),
          firstDay: num(observedEpochs.firstDay),
          lastDay: num(observedEpochs.lastDay),
          spanDays: num(observedEpochs.spanDays),
          unit: observedEpochs.unit ? String(observedEpochs.unit) : null,
        }
      : null,
    /**
     * When the entry was made, as opposed to when the data was taken.
     *
     * Analysis metadata, kept beside the display frame and the build for the
     * same reason: none of the three is a fact about how the observations
     * were generated.
     */
    analysedAt: analysedAt === null ? null : String(analysedAt),
    /** Which observing schedule produced the measurements. */
    scheduleFingerprint:
      scheduleFingerprint === null ? null : String(scheduleFingerprint),
    /** The Monte Carlo seed, when an uncertainty analysis was kept with it. */
    uncertaintySeed: uncertaintySeed === null ? null : String(uncertaintySeed),
    /**
     * The whole reproducible Monte Carlo block, when one was kept with this
     * reading. Copied rather than referenced: the panel's report is replaced
     * on the next run, and an entry holding a reference would silently gain a
     * different interval.
     */
    uncertainty: uncertainty ? JSON.parse(JSON.stringify(uncertainty)) : null,
  };
}

/** Counts ids handed out, so two in one millisecond cannot collide. */
let idSequence = 0;

/**
 * A fresh entry id: time-ordered, then a sequence, then a random tail.
 *
 * The same construction as the experiment store's, and for the same reason -
 * randomness alone collides often enough to overwrite somebody's work when a
 * loop captures a batch inside one millisecond.
 *
 * @returns {string} An id
 */
export function newEntryId() {
  const now = Date.now().toString(36);
  const seq = (idSequence++).toString(36);
  const rand = Math.floor(Math.random() * 0x100000)
    .toString(36)
    .padStart(4, '0');
  return `e${now}-${seq}${rand}`;
}

/**
 * A snapshot as text, with keys in a fixed order at every depth.
 *
 * Written out rather than handed to JSON.stringify's replacer argument. That
 * argument takes a key allowlist and applies it at *every* level, so passing
 * the top-level keys filtered out every nested one: the first version of this
 * hashed `{v, capturedAt, quantities, figure, provenance}` with all their
 * contents dropped, and the checksum did not move when a recorded value was
 * edited. Which is the one thing it exists to detect.
 *
 * @param {*} value - Anything JSON can hold
 * @returns {string} A stable serialisation
 */
function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys
    .map(k => `${JSON.stringify(k)}:${canonical(value[k])}`)
    .join(',')}}`;
}

/**
 * Short checksum over a snapshot, for the export.
 *
 * FNV-1a, the same non-cryptographic construction the lab report's completion
 * code uses, and with the same caveat: it makes casual editing visible, it
 * does not prove anything about who wrote the file. What it is actually for is
 * the check this feature promises - that the numbers in an exported report are
 * the numbers that were captured.
 *
 * @param {object} snapshot - An entry's snapshot
 * @returns {string} Checksum
 */
export function snapshotFingerprint(snapshot) {
  const text_ = canonical(snapshot);
  let h = 0x811c9dc5;
  for (let i = 0; i < text_.length; i++) {
    h ^= text_.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).toUpperCase().padStart(7, '0');
}

/**
 * Build an entry.
 *
 * The snapshot half is assembled and frozen here; the prose half is whatever
 * the student had typed at the moment they pressed save, and may be empty -
 * an entry saved with an empty claim is a reading they intend to write about,
 * not an error.
 *
 * @param {object} spec
 * @param {string} spec.source - One of SOURCE
 * @param {string} spec.title - What this entry is
 * @param {Array<object>} [spec.quantities] - From quantity()
 * @param {?object} [spec.figure] - From figure()
 * @param {object} [spec.provenance] - From provenanceOf()
 * @param {object} [spec.prose] - claim, evidence, limitations
 * @param {number} [spec.capturedAt] - Epoch ms; defaults to now
 * @param {string} [spec.id] - Reuse an id, for restore
 * @returns {object} A frozen-snapshot entry
 */
export function buildEntry({
  source,
  title,
  quantities = [],
  figure: fig = null,
  provenance = null,
  prose: written = null,
  capturedAt = Date.now(),
  id = null,
}) {
  const snapshot = deepFreeze({
    v: SCHEMA_VERSION,
    capturedAt: Number(capturedAt) || Date.now(),
    quantities: quantities
      .filter(Boolean)
      .slice(0, LIMITS.quantities)
      .map(q => ({ ...q })),
    figure: fig ? { ...fig } : null,
    provenance: provenance || provenanceOf(),
  });
  return {
    id: id || newEntryId(),
    source: SOURCES.includes(source) ? source : String(source || ''),
    title: text(title, LIMITS.title),
    prose: {
      claim: prose(written?.claim, LIMITS.claim),
      evidence: prose(written?.evidence, LIMITS.evidence),
      limitations: prose(written?.limitations, LIMITS.limitations),
    },
    snapshot,
    fingerprint: snapshotFingerprint(snapshot),
  };
}

/**
 * Revise the prose, keeping the snapshot byte for byte.
 *
 * Returns a new entry sharing the *same* frozen snapshot object rather than a
 * copy of it, so this cannot alter the evidence even if a future edit here got
 * it wrong. The title is prose too - it is the student's heading, not part of
 * the reading.
 *
 * @param {object} entry - An existing entry
 * @param {object} changes - Any of title, claim, evidence, limitations
 * @returns {object} The revised entry
 */
export function annotate(entry, changes = {}) {
  if (!entry) return entry;
  const next = { ...entry.prose };
  for (const key of ['claim', 'evidence', 'limitations']) {
    if (key in changes) next[key] = prose(changes[key], LIMITS[key]);
  }
  return {
    ...entry,
    title: 'title' in changes ? text(changes.title, LIMITS.title) : entry.title,
    prose: next,
    // Not recomputed: the snapshot is the same object, so its fingerprint is
    // the same string. Recomputing would be equivalent and would invite the
    // reader to think annotation touches the snapshot.
    snapshot: entry.snapshot,
    fingerprint: entry.fingerprint,
    revisedAt: Date.now(),
  };
}

/**
 * Whether a value is an entry this build can read.
 *
 * Used on restore, where the input is a file a student chose. Returns a reason
 * rather than throwing, because every refusal has to be something the panel
 * can say out loud.
 *
 * @param {*} value - A parsed candidate
 * @returns {{ok: boolean, reason: string}} Verdict
 */
export function validateEntry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, reason: 'not-an-entry' };
  }
  if (typeof value.id !== 'string' || !value.id) {
    return { ok: false, reason: 'no-id' };
  }
  const snap = value.snapshot;
  if (!snap || typeof snap !== 'object') {
    return { ok: false, reason: 'no-snapshot' };
  }
  if (Number(snap.v) > SCHEMA_VERSION) {
    return { ok: false, reason: 'from-a-newer-version' };
  }
  if (!Array.isArray(snap.quantities)) {
    return { ok: false, reason: 'no-quantities' };
  }
  if (snap.quantities.length > LIMITS.quantities) {
    return { ok: false, reason: 'too-many-quantities' };
  }
  for (const q of snap.quantities) {
    if (!q || typeof q.label !== 'string') {
      return { ok: false, reason: 'bad-quantity' };
    }
    if (q.kind && !KINDS.includes(q.kind)) {
      return { ok: false, reason: 'unknown-kind' };
    }
  }
  if (snap.figure && !Array.isArray(snap.figure.series)) {
    return { ok: false, reason: 'bad-figure' };
  }
  return { ok: true, reason: '' };
}

/**
 * Rebuild an entry from a validated payload, re-freezing the snapshot.
 *
 * The fingerprint is recomputed and compared rather than trusted: a restored
 * file whose numbers were edited by hand is still readable evidence, but the
 * panel and the report say it no longer matches its own checksum.
 *
 * @param {object} value - A payload that passed validateEntry
 * @returns {object} The entry, with `tampered` set when the checksum moved
 */
export function reviveEntry(value) {
  const snapshot = deepFreeze(JSON.parse(JSON.stringify(value.snapshot)));
  const fingerprint = snapshotFingerprint(snapshot);
  return {
    id: value.id,
    source: String(value.source || ''),
    title: text(value.title, LIMITS.title),
    prose: {
      claim: prose(value.prose?.claim, LIMITS.claim),
      evidence: prose(value.prose?.evidence, LIMITS.evidence),
      limitations: prose(value.prose?.limitations, LIMITS.limitations),
    },
    snapshot,
    fingerprint,
    ...(value.revisedAt ? { revisedAt: Number(value.revisedAt) || 0 } : {}),
    // Only ever true for a file that says one thing and hashes to another.
    ...(value.fingerprint && value.fingerprint !== fingerprint
      ? { tampered: true }
      : {}),
  };
}
