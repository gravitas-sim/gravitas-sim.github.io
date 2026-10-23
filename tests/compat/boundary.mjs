// =============================================================================
// The planned extensions of Roadmap III, as fixtures against the 2.0.0 readers
// -----------------------------------------------------------------------------
// Each entry takes a corpus record (the same fixture tests/compat/matrix.test.js
// uses) and adds the field a later prompt plans to write, then asks the 2.0.0
// reader what it says. The outcome is one of:
//
//   refused   the old reader says so, in its own words: safe, and a boundary
//             where it is not made on purpose (a capability-required refusal)
//   ignored   the old reader accepts the record and drops the field without a
//             word: silent misreading, which the compatibility policy forbids
//             for anything a new reader needs (FORMATS.md)
//
// `expect` is what the committed list says today. A change in either reader
// flips it, and the test fails until the list (and 176's content) is updated.
// =============================================================================

const clone = x => JSON.parse(JSON.stringify(x));

export const BOUNDARY = [
  {
    id: 'collection-profile',
    prompt: 164,
    kind: 'course-pack',
    plans: 'an additive `profile: "collection"` on the course package',
    // A collection as the current writer makes one: the first unit alone, no
    // objectives, prerequisites, level or term, no needs and no optional path.
    mutate: doc => {
      const {
        objectives: _o,
        prerequisites: _p,
        courseLevel: _l,
        ...rest
      } = clone(doc);
      const unit = rest.units[0];
      return {
        ...rest,
        profile: 'collection',
        units: [
          {
            ...unit,
            items: unit.items
              .filter(i => i.kind === 'lesson' && (i.path ?? 'core') === 'core')
              .map(({ needs: _n, objectives: _i, ...i }) => i),
          },
        ],
      };
    },
    expect: 'refused',
  },
  {
    id: 'course-term',
    prompt: 168,
    kind: 'course-pack',
    plans: 'a `term` label on the course package, written only when named',
    mutate: doc => ({ ...clone(doc), term: 'Spring 2027' }),
    expect: 'refused',
  },
  {
    id: 'resume-in-progress-record',
    prompt: 163,
    kind: 'progress-store',
    plans:
      'the one resume record carried as a field of the progress record (not built: Prompt 163 keeps it a sidecar key, `resume-record`)',
    mutate: doc => ({
      ...clone(doc),
      resume: { item: 'tides', pathway: null, step: 'guess' },
    }),
    expect: 'ignored',
  },
  {
    id: 'asymmetric-interval',
    prompt: 150,
    kind: 'artifact',
    plans:
      'a stated confidence level on the (already asymmetric) interval: `level`',
    mutate: doc => {
      const d = clone(doc);
      d.quantities[0].uncertainty = {
        kind: 'interval',
        lo: 0.0143,
        hi: 0.0151,
        level: 0.68,
        basis: 'data',
      };
      return d;
    },
    expect: 'ignored',
  },
  {
    id: 'not-constrained-state',
    prompt: 150,
    kind: 'artifact',
    plans: 'the states "not constrained", "failed", "assumed", "model-limited"',
    mutate: doc => {
      const d = clone(doc);
      d.quantities[0].uncertainty = { kind: 'not-constrained' };
      return d;
    },
    expect: 'refused',
  },
  {
    id: 'fit-result-record',
    prompt: 150,
    kind: 'artifact',
    plans: 'a fit-result record carried by the envelope',
    mutate: doc => ({
      ...clone(doc),
      fit: {
        model: 'transit',
        parameters: [],
        covariance: { order: [], values: [] },
      },
    }),
    expect: 'ignored',
  },
  {
    id: 'correlation-reference',
    prompt: 150,
    kind: 'artifact',
    plans: 'a correlation reference between quantities that share data',
    mutate: doc => {
      const d = clone(doc);
      d.quantities[0].correlatedWith = [{ id: 'period', rho: 0.4 }];
      return d;
    },
    expect: 'ignored',
  },
  {
    id: 'workspace-marks',
    prompt: 179,
    kind: 'observation',
    plans:
      'the image mark set as `workspace.marks`, a `gravitas.image-marks/1` block, written only when the reader marked an image (it nests eight deep; the 2.0.0 file reader stops at six and refuses the file as "nested too deep")',
    mutate: doc => ({
      ...clone(doc),
      workspace: {
        openedFrom: { kind: 'builtin', id: 'compat', version: null },
        openedAs: 'compat:series',
        changes: [],
        source: null,
        marks: {
          format: 'gravitas.image-marks',
          formatVersion: 1,
          step: 'image-marks',
          version: 1,
          refine: 1,
          frames: [
            {
              id: 'compat:image',
              width: 64,
              height: 64,
              digest: '0'.repeat(64),
              used: true,
            },
          ],
          marks: [
            {
              id: 'm1',
              kind: 'point',
              frame: 0,
              tag: 'star',
              pts: [[30, 20]],
              result: { pts: [[30.2, 20.1]], sigma: 0.07, sigmaR: null },
            },
          ],
        },
      },
    }),
    expect: 'refused',
  },
  {
    id: 'rubric-criterion-semantics',
    prompt: 172,
    kind: 'investigation-pack',
    plans:
      'a `kind`, `depth` and `weight` on a rubric criterion of a written step',
    mutate: doc => {
      const d = clone(doc);
      const step = d.steps.find(s => s.type === 'question' && s.rubric);
      step.rubricCriteria = [
        {
          name: { en: 'Gets the number' },
          kind: 'correctness',
          levels: [
            { label: { en: 'Full' }, text: { en: 'Within tolerance.' } },
            { label: { en: 'Not yet' }, text: { en: 'Outside it.' } },
          ],
        },
      ];
      return d;
    },
    expect: 'refused',
  },
  {
    id: 'ensemble-fields',
    prompt: 265,
    kind: 'experiment',
    plans:
      'named streams, the stream fork per trial and the kernel versions on the experiment record',
    mutate: doc => ({
      ...clone(doc),
      streams: ['a', 'b'],
      fork: 'per-trial',
      kernels: { stellar: '1.0.0' },
    }),
    expect: 'ignored',
  },
];
