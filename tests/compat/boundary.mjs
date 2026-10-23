// =============================================================================
// The 3.0.0 format boundary, as fixtures against the 2.0.0 readers
// -----------------------------------------------------------------------------
// Each entry takes a corpus record (the same fixture tests/compat/matrix.test.js
// uses) and adds the field a later prompt writes (or plans to), then asks the
// 2.0.0 reader what it says. The outcome is one of:
//
//   refused   the old reader says so, in its own words: safe, and a boundary
//             where it is not made on purpose (a capability-required refusal)
//   ignored   the old reader accepts the record and drops the field without a
//             word: silent misreading, which the compatibility policy forbids
//             for anything a new reader needs (FORMATS.md)
//
// `expect` is what the committed list says today. A change in either reader
// flips it, and the test fails until the list is updated.
//
// Prompt 176 settled the list. An entry with a `boundary` is carried across the
// 3.0.0 boundary, and says, for the format it belongs to:
//
//   format, from, to   the format, the version 2.0.0 knows and the one a
//                      payload with this change is written as (the same
//                      number when the version is not what refuses it)
//   rule               the writer's rule: the lowest version that carries
//                      the payload, so what needs nothing new is written as
//                      2.0.0 wrote it
//   write              what the current writer makes of the variant (the
//                      stamp the writer puts on it): the file or link as it
//                      is saved, which is what a rolled-back build is handed
//   says               what the 2.0.0 reader says of it, recorded and held
//                      by tests/compat/boundary.test.js
//   requires           the capability a reader needs to open it
//   rollback           what happens when a 2.0.0 build is handed the written
//                      payload after a rollback: refused, or opens-without
//                      (it opens, and the new field is not used)
//
// An entry without one is not carried: `note` says why (2.0.0 reads it, or
// it is not built and its own prompt carries it).
// =============================================================================

const clone = x => JSON.parse(JSON.stringify(x));

// What the current writers do to a document on its way to a file or a link:
// the lowest version that carries it (js/course/pack.js withVersion,
// js/platform/investigation.js withVersion, js/platform/artifact.js
// artifactVersion). They are read when an entry is run, not when this file is
// imported (tools/formats.mjs imports it for the table).
const coursePack = async d =>
  (await import('../../js/course/pack.js')).withVersion(d);
const investigationPack = async d =>
  (await import('../../js/platform/investigation.js')).withVersion(d);
const artifactEnvelope = async d => {
  const { artifactVersion } = await import('../../js/platform/artifact.js');
  return { ...d, formatVersion: artifactVersion(d) };
};
const asIs = async d => d;

/** A course pack /3 as a course home link holds it, made by the current writer. */
async function courseHomeLinkOf(pack) {
  const { courseLink } = await import('../../js/course/links.js');
  const link = await courseLink(pack, { root: 'https://example.test/' });
  return { hash: link.url.split('#')[1] };
}

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
    boundary: {
      format: 'gravitas.course-pack',
      from: 2,
      to: 3,
      rule: 'a collection is written as /3; a course, which has no profile, stays /2',
      write: coursePack,
      says: 'formatVersion formatVersion',
      requires: 'a reader of gravitas.course-pack/3 (Gravitas 3.0.0)',
      rollback: 'refused',
    },
  },
  {
    id: 'course-term',
    prompt: 168,
    kind: 'course-pack',
    plans: 'a `term` label on the course package, written only when named',
    mutate: doc => ({ ...clone(doc), term: 'Spring 2027' }),
    expect: 'refused',
    boundary: {
      format: 'gravitas.course-pack',
      from: 2,
      to: 3,
      rule: 'a pack with a term is written as /3; one without stays /2',
      write: coursePack,
      says: 'formatVersion formatVersion',
      requires: 'a reader of gravitas.course-pack/3 (Gravitas 3.0.0)',
      rollback: 'refused',
    },
  },
  {
    id: 'course-outcomes',
    prompt: 174,
    kind: 'course-pack',
    plans:
      "the instructor's own `outcomes` on the course package and the `outcomes` mapping on an objective, written only when entered",
    mutate: doc => {
      const d = clone(doc);
      d.outcomes = [{ id: 'orbits', text: { en: 'Explain how orbits work' } }];
      if (d.objectives?.length) d.objectives[0].outcomes = ['orbits'];
      return d;
    },
    expect: 'refused',
    boundary: {
      format: 'gravitas.course-pack',
      from: 2,
      to: 3,
      rule: 'a pack with outcomes, or an objective mapped to them, is written as /3; one without stays /2',
      write: coursePack,
      says: 'formatVersion formatVersion',
      requires: 'a reader of gravitas.course-pack/3 (Gravitas 3.0.0)',
      rollback: 'refused',
    },
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
    note: 'not built as a field: Prompt 163 keeps the resume record a sidecar key (resume-record), which 2.0.0 never reads',
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
    note: 'not a boundary: 2.0.0 already reads and checks `level` on an interval, so a build that reads /1 opens it',
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
    boundary: {
      format: 'gravitas.artifact',
      from: 1,
      to: 2,
      rule: 'an envelope with an uncertainty state beyond sigma, interval and none is written as /2; legacyView() hands a 2.0.0 reader the /1 form, with the loss listed',
      write: artifactEnvelope,
      says: 'formatVersion version',
      requires: 'a reader of gravitas.artifact/2 (Gravitas 3.0.0)',
      rollback: 'refused',
    },
  },
  {
    id: 'fit-result-record',
    prompt: 150,
    kind: 'artifact',
    plans: 'a fit-result record carried by the envelope',
    mutate: doc => ({
      ...clone(doc),
      fit: {
        model: { id: 'transit', version: '1.0.0' },
        parameters: ['depth'],
        covariance: { order: ['depth'], values: [[1e-8]], units: [''] },
        convergence: { converged: true },
      },
    }),
    expect: 'ignored',
    boundary: {
      format: 'gravitas.artifact',
      from: 1,
      to: 2,
      rule: 'an envelope with a fit-result record is written as /2; one without stays /1',
      write: artifactEnvelope,
      says: 'formatVersion version',
      requires: 'a reader of gravitas.artifact/2 (Gravitas 3.0.0)',
      rollback: 'refused',
    },
  },
  {
    id: 'correlation-reference',
    prompt: 150,
    kind: 'artifact',
    plans: 'a correlation reference between quantities that share data',
    mutate: doc => {
      const d = clone(doc);
      d.quantities.push({
        id: 'period',
        value: 3.52,
        unit: 'd',
        uncertainty: { kind: 'sigma', sigma: 0.01, basis: 'data' },
        origin: 'measured',
      });
      d.quantities[0].correlatedWith = [{ id: 'period', rho: 0.4 }];
      return d;
    },
    expect: 'ignored',
    boundary: {
      format: 'gravitas.artifact',
      from: 1,
      to: 2,
      rule: 'an envelope with a correlation between quantities is written as /2; one without stays /1',
      write: artifactEnvelope,
      says: 'formatVersion version',
      requires: 'a reader of gravitas.artifact/2 (Gravitas 3.0.0)',
      rollback: 'refused',
    },
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
    boundary: {
      format: 'gravitas.observation',
      from: 1,
      to: 1,
      rule: 'written only when marks exist, so a save without marks is the bytes it always was; the version stays 1 because the 2.0.0 file reader checks nesting before the version and would never name one',
      write: asIs,
      says: 'nested too deep',
      requires: 'a workspace import that reads eight levels (workspace.marks)',
      rollback: 'refused',
    },
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
    boundary: {
      format: 'gravitas.investigation-pack',
      from: 1,
      to: 2,
      rule: 'a pack, or a question bank, with a criterion that sets a kind, a depth or a weight is written as /2; one that sets none stays /1',
      write: investigationPack,
      says: 'newer',
      requires: 'a reader of gravitas.investigation-pack/2 (Gravitas 3.0.0)',
      rollback: 'refused',
    },
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
    note: 'not built: Prompt 265 writes these and carries its own boundary row when it does',
  },
  {
    id: 'course-home-link-3',
    prompt: 164,
    kind: 'course-home-link',
    plans:
      'a course home link for a /3 pack (a collection, a term or outcomes) carries prefix c3',
    mutate: async () => {
      const { INTRO_ASTRONOMY } =
        await import('../../js/data/courses/intro-astronomy.js');
      return courseHomeLinkOf({
        ...clone(INTRO_ASTRONOMY),
        term: 'Spring 2027',
      });
    },
    expect: 'refused',
    boundary: {
      format: 'course home link',
      from: 2,
      to: 3,
      rule: "the prefix is the pack's lowest version: c3 only for a pack that needs /3, c2 for every other course",
      write: asIs,
      says: 'newerVersion',
      requires: 'a course home that reads c3 (Gravitas 3.0.0)',
      rollback: 'refused',
    },
  },
  {
    id: 'investigation-link-2',
    prompt: 172,
    kind: 'investigation-link',
    plans:
      'an investigation link for a /2 pack (a criterion with a kind, a depth or a weight) carries prefix i2',
    mutate: async fx => {
      const { readPackFragment, packLink } =
        await import('../../js/composer/packLink.js');
      const r = await readPackFragment(fx.hash);
      const pack = clone(r.pack);
      const step = pack.steps.find(x => x.type === 'question');
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
      const link = await packLink(pack, { root: 'https://example.test/' });
      return { hash: link.fragment };
    },
    expect: 'refused',
    boundary: {
      format: 'investigation link',
      from: 1,
      to: 2,
      rule: "the prefix is the pack's lowest version: i2 only for a pack that needs /2, i1 for every other",
      write: asIs,
      says: 'newerVersion',
      requires: 'an investigation link that reads i2 (Gravitas 3.0.0)',
      rollback: 'refused',
    },
  },
  {
    id: 'bank-criterion-semantics',
    prompt: 172,
    kind: 'question-bank',
    plans:
      'a `kind`, `depth` and `weight` on the rubric criterion of a written item in a question bank',
    mutate: doc => ({
      ...clone(doc),
      items: [
        ...clone(doc.items),
        {
          id: 'why-ellipse',
          version: 1,
          kind: 'short',
          prompt: { en: 'Why is an orbit an ellipse?' },
          rubric: { en: 'Names the inverse-square force.' },
          scoring: { points: 2, attempts: 'first' },
          a11y: { textOnly: true },
          rubricCriteria: [
            {
              name: { en: 'Names the force' },
              kind: 'reasoning',
              weight: 2,
              levels: [
                { label: { en: 'Full' }, text: { en: 'Names it.' } },
                { label: { en: 'Not yet' }, text: { en: 'Does not.' } },
              ],
            },
          ],
        },
      ],
    }),
    expect: 'refused',
    boundary: {
      format: 'gravitas.question-bank',
      from: 1,
      to: 2,
      rule: 'a bank with a criterion that sets a kind, a depth or a weight is written as /2; one that sets none stays /1 (bankVersion)',
      write: async d => {
        const { bankVersion } =
          await import('../../js/platform/questionBank.js');
        return { ...d, formatVersion: bankVersion(d.items) };
      },
      says: 'formatVersion formatVersion',
      requires: 'a reader of gravitas.question-bank/2 (Gravitas 3.0.0)',
      rollback: 'refused',
    },
  },
  {
    id: 'assignment-link-presentation',
    prompt: 175,
    kind: 'assignment-link',
    plans:
      "the instructor's sentence on a step (`x`), a due line (`u`), the marking-note choice (`m`) and the disclosure default (`mo`) on an assignment link, each written only when set",
    mutate: async fx => {
      const { readAssignmentLink } =
        await import('../../js/assignments/assignmentLink.js');
      const { assignmentLink } =
        await import('../../js/assignments/assignmentLink.js');
      const r = await readAssignmentLink(fx.fragment);
      const a = {
        ...clone(r.assignment),
        x: { [r.assignment.s[0]]: ['Read this first.', 'Lee esto primero.'] },
        u: 'Friday',
        m: 1,
        mo: 'shut',
      };
      const link = await assignmentLink(a, 'https://example.test/');
      return { fragment: link.fragment };
    },
    // 2.0.0 opens the link and carries the fields without showing them.
    expect: 'ignored',
    boundary: {
      format: 'gravitas.assignment',
      from: 1,
      to: 1,
      rule: 'written only when set, so an assignment that sets none is the bytes it was; the version stays what it was (2 only for a package pin or a depth) because the fields change what is shown, not which steps there are or in what order (`s`)',
      write: asIs,
      says: null,
      requires: 'none: a 2.0.0 build opens the link and does not show them',
      rollback: 'opens-without',
    },
  },
];

/**
 * The link kinds whose payload changed at 3.0.0, with what the supported-link
 * policy (SURFACE_RETIREMENT_GATE.md, decision D-R10-44: class R, a link that
 * carries state) says of each version. No version is superseded: every
 * writer writes the lowest version that carries its payload, so the older
 * prefix is still the one written for the payload it always carried and no
 * period has started. A period starts, for a version, when a later major
 * supersedes it and its writer stops writing it.
 */
export const LINKS = [
  {
    link: 'course home link',
    prefix: 'c',
    versions: 'c1 (read, migrated), c2 (written), c3 (written, new)',
    written: 'c3 only for a pack that needs /3; every other course is c2',
    old: 'a 2.0.0 course home refuses c3 by reason code (newerVersion)',
  },
  {
    link: 'investigation link',
    prefix: 'i',
    versions: 'i1 (written), i2 (written, new)',
    written: 'i2 only for a pack that needs /2; every other pack is i1',
    old: 'a 2.0.0 build refuses i2 by reason code (newerVersion)',
  },
  {
    link: 'assignment link',
    prefix: 'a',
    versions: 'a1 (written), a2 (written)',
    written:
      'unchanged: `x`, `u`, `m` and `mo` are written only when set and do not change the version',
    old: 'a 2.0.0 build opens it and does not show them (the corpus entry assignment-link-presentation)',
  },
  {
    link: 'world share link',
    prefix: '(none)',
    versions: 'v1 (read), v2 (written)',
    written: 'unchanged by 3.0.0',
    old: 'not affected',
  },
];
