// =============================================================================
// The previous versions the current readers still read (Prompt 290)
// -----------------------------------------------------------------------------
// FORMATS.md says, per format, what its reader does with the previous version.
// A format that reads one needs a fixture of that version here, so the claim is
// run and not only written. Two kinds:
//
//   corpus   the 2.0.0 writer wrote the previous version, so the corpus kind
//            (kinds/<kind>.mjs, run against the archived 2.0.0 tree by
//            previous.test.js) holds it: the test checks the fixture really is
//            that version, and matrix.test.js already has the current reader
//            read it losslessly;
//   inline   the previous version is older than 2.0.0 (or 2.0.0 wrote the
//            current one), so the fixture is the document itself, below, and
//            previous.test.js hands it to the current reader.
//
// `row` is the format's row in tools/formats.mjs. The test fails a row that
// reads a previous version and has no entry here.
// =============================================================================

export const FIXTURES = {
  'setup-v0': { cadenceDays: 10, sigmaMs: 2, baselineDays: 300 },
  'share-link-v1': { v: 1, s: 'Solar System', seed: 'abc' },
  'scenario-name': 'Solar System',
  'store-v1': {
    id: 'old-1',
    name: 'Old comparison',
    scenario: 'binary-pair',
    runA: { samples: [{ t: 0, d: 1 }], recordedAt: 1 },
    runB: { samples: [{ t: 0, d: 2 }], recordedAt: 2 },
  },
  'store-v2': {
    v: 2,
    id: 'old-2',
    name: 'Old comparison',
    scenario: 'binary-pair',
    runs: { A: { samples: [{ t: 0, d: 1 }], recordedAt: 1 } },
    units: {},
  },
  'assignment-v1': {
    k: 'gravitas.assignment',
    v: 1,
    l: 'tides',
    i: 'a1',
    s: ['guess'],
  },
  'progress-v1': {
    lesson: 'tides',
    responses: { 'tides:0': 0 },
    attempts: { 'tides:0': 1 },
    visited: [0],
    stepIndex: 0,
    startedAt: '2026-10-01T00:00:00.000Z',
  },
  'backup-v1': {
    kind: 'gravitas.investigation.progress',
    version: 1,
    savedAt: '2026-10-01T00:00:00.000Z',
    lesson: { id: 'tides', title: 'Tides', stepCount: 2 },
    progress: {
      stepIndex: 0,
      startedAt: null,
      visited: [0],
      responses: { 'tides:0': 0 },
      attempts: { 'tides:0': 1 },
    },
    steps: [{ index: 0, fingerprint: 'x' }],
  },
  'token-v1': {
    v: 1,
    b: { lesson: { id: 'tides' }, progress: { responses: {} }, steps: [] },
  },
  'results-v1': {
    kind: 'gravitas.submission-results',
    version: 1,
    submissions: [],
  },
  'course-pack-v1': {
    format: 'gravitas.course-pack',
    formatVersion: 1,
    id: 'old-course',
    version: '1.0.0',
    title: { en: 'Old course' },
    locales: ['en'],
    units: [
      { id: 'u1', title: { en: 'Unit' }, lessons: [{ lesson: 'tides' }] },
    ],
  },
  'expectations-v1': {
    format: 'gravitas.instructor-expectations',
    formatVersion: 1,
    lessons: { tides: { 1: 'About 12 hours' } },
  },
  'flow-v1': {
    format: 'gravitas.instructor-flow',
    formatVersion: 1,
    lessons: { tides: [{ steps: '1-2', text: 'Predict, then check.' }] },
  },
};

/** The retired id's manifest, as the first release wrote it: an existing fixture. */
export const RETIRED_EXPERIMENT =
  'tests/fixtures/experiment-formats/main-16d0f24-manifest.json';

export const PREVIOUS = [
  {
    row: 'gravitas.observing-setup',
    previous: 'version 0 (the survey configuration, no format)',
    inline: 'setup-v0',
  },
  {
    row: 'gravitas.artifact (with the extended uncertainty states, a correlation or a fit)',
    previous: 'gravitas.artifact/1',
    corpus: 'artifact',
    version: 1,
  },
  {
    row: 'world share link',
    previous: 'link version 1 (the scenario by its English name)',
    inline: 'share-link-v1',
  },
  {
    row: 'built-in scenario id',
    previous: 'the English name',
    inline: 'scenario-name',
  },
  {
    row: 'gravitas.experiment',
    previous: 'gravitas-experiment, the retired id, version 0',
    file: RETIRED_EXPERIMENT,
  },
  {
    row: 'gravitas.experiment (with an ensemble block)',
    previous: 'gravitas.experiment/1',
    corpus: 'experiment',
    version: 1,
  },
  {
    row: 'experiment store',
    previous: 'versions 1 and 2',
    inline: ['store-v1', 'store-v2'],
  },
  {
    row: 'gravitas.investigation-pack (with criterion kinds, depths or weights)',
    previous: 'gravitas.investigation-pack/1',
    corpus: 'investigation-pack',
    version: 1,
  },
  {
    row: 'gravitas.question-bank (with criterion kinds, depths or weights)',
    previous: 'gravitas.question-bank/1',
    corpus: 'question-bank',
    version: 1,
  },
  {
    row: 'gravitas.assignment',
    previous: 'assignment/1',
    inline: 'assignment-v1',
  },
  {
    row: 'investigation progress',
    previous: 'schema 1 (keyed by step index)',
    inline: 'progress-v1',
  },
  {
    row: 'gravitas.investigation.progress',
    previous: 'version 1 (keyed by step index)',
    inline: 'backup-v1',
  },
  { row: 'submission token', previous: 'token version 1', inline: 'token-v1' },
  {
    row: 'gravitas.submission-results',
    previous: 'version 1 (no points)',
    inline: 'results-v1',
  },
  {
    row: 'gravitas.course-pack (builder form)',
    previous: 'gravitas.course-pack/1',
    inline: 'course-pack-v1',
  },
  {
    row: 'gravitas.course-pack (builder form, with a profile, a term or outcomes)',
    previous: 'gravitas.course-pack/2',
    corpus: 'course-pack',
    version: 2,
  },
  {
    row: 'course home link',
    previous: 'c1 and c2',
    inline: 'course-pack-v1',
    corpusLink: 'course-home-link',
    prefix: 'c2',
  },
  {
    row: 'investigation link',
    previous: 'i1',
    corpusLink: 'investigation-link',
    prefix: 'i1',
  },
  {
    row: 'gravitas.instructor-expectations',
    previous: 'version 1 (keyed by step number)',
    inline: 'expectations-v1',
  },
  {
    row: 'gravitas.instructor-flow',
    previous: 'version 1 (blocks named by step numbers)',
    inline: 'flow-v1',
  },
];
