// =============================================================================
// Lessons and student work, each format held to its JSON Schema
// -----------------------------------------------------------------------------
// sdk/schemas has a schema for each of these (Roadmap II Prompt 61), held as
// tests/formatSchemas.test.js holds the six before them:
//
//   - documents the code itself produced fit: every activity's assignment,
//     a lab report through its token and the review page's export, and the
//     composer's example investigation and the bank it saves;
//   - documents the reader refuses, the schema refuses too. Where the reader
//     refuses for a reason no schema can state - a rule across fields, a step
//     named somewhere else in the file - the case is listed as the
//     validator's alone, and tested there; where the reader accepts what the
//     schema, which states the format as written, refuses - a number typed as
//     text, a field it never looks at - the case is listed too, so each
//     difference is one somebody chose (./schemaCorpus.js holds());
//   - every table in a schema is the code's own, and each schema's title,
//     $id and version are its row in FORMATS.md (tools/formats.mjs).
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { valid } from './jsonSchemaSubset.js';
import { LEGACY_NAMES } from './scenarioLegacyKeys.js';
import { as, holds, isItsRow } from './schemaCorpus.js';
import { encodePayload } from '../js/shareState.js';
import * as AS from '../js/assignments/assignment.js';
import { ACTIVITIES } from '../js/data/activities.js';
import { assignmentForFormat } from '../js/activities/activities.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import * as BK from '../js/investigations/progressBackup.js';
import { stepKey } from '../js/investigations/progressSchema.js';
import * as ST from '../js/submission/submissionToken.js';
import * as RS from '../js/submission/results.js';
import * as IP from '../js/platform/investigation.js';
import * as QB from '../js/platform/questionBank.js';
import { RELATIONS } from '../js/platform/relations.js';
import { packApi } from '../js/composer/api.js';
import { EXAMPLE_INVESTIGATION } from '../js/composer/example.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(path.join(REPO, file), 'utf8');
const schema = name => JSON.parse(read(`sdk/schemas/${name}.schema.json`));
const clone = v => JSON.parse(JSON.stringify(v));
const literals = (text, re) => [...text.matchAll(re)].map(m => m[1]);

describe('each schema', () => {
  test.each([
    ['investigation-pack-1', 'gravitas.investigation-pack', IP.FORMAT_VERSION],
    ['question-bank-1', 'gravitas.question-bank', QB.BANK_FORMAT_VERSION],
    ['assignment-2', 'gravitas.assignment', AS.ASSIGNMENT_SCHEMA],
    ['submission-token-2', 'submission token', ST.SUBMISSION_SCHEMA],
    ['submission-results-2', 'gravitas.submission-results', RS.RESULTS_VERSION],
  ])('%s is its row in FORMATS.md, at the version the code writes', isItsRow);
});

// --- gravitas.assignment/2 ---------------------------------------------------

describe('the assignment schema', () => {
  const s = schema('assignment-2');
  const reads = d => AS.validateAssignment(d).ok;
  const lessonFor = a => INVESTIGATIONS.find(l => l.id === a.lesson);
  const provider = { id: 'org.example.orbits', version: '1.2.0' };

  test('every activity’s assignment fits it, with a package and without', () => {
    let n = 0;
    for (const activity of ACTIVITIES)
      for (const format of activity.formats)
        for (const p of [null, provider]) {
          const built = assignmentForFormat(
            lessonFor(activity),
            activity,
            format,
            'A title',
            'An introduction.',
            p
          );
          expect(built.ok).toBe(true);
          const a = clone(built.assignment);
          expect(a.v).toBe(p ? 2 : 1);
          expect({
            id: a.i,
            reads: reads(a),
            fits: valid(s, a),
          }).toEqual({ id: a.i, reads: true, fits: true });
          n++;
        }
    expect(n).toBe(2 * ACTIVITIES.flatMap(a => a.formats).length);
    expect(n).toBeGreaterThan(10);
  });

  test('and refuses what validateAssignment refuses', () => {
    const activity = ACTIVITIES[0];
    const good = assignmentForFormat(
      lessonFor(activity),
      activity,
      activity.formats[0],
      'T',
      '',
      provider
    ).assignment;
    const cases = [
      ['both', 'an array', d => as([d])],
      ['both', 'another kind', d => (d.k = 'gravitas.activity')],
      ['both', 'version 3', d => (d.v = 3)],
      ['both', 'version 0', d => (d.v = 0)],
      ['both', 'no lesson', d => (d.l = '')],
      ['both', 'a long lesson id', d => (d.l = 'x'.repeat(81))],
      ['both', 'an id with a space', d => (d.i = 'two words')],
      ['both', 'a long id', d => (d.i = 'x'.repeat(33))],
      ['both', 'no steps', d => (d.s = [])],
      [
        'both',
        'too many steps',
        d => (d.s = d.s.concat(Array.from({ length: 61 }, (_, i) => `x${i}`))),
      ],
      ['both', 'a step id with a colon', d => (d.s[0] = 'a:b')],
      ['both', 'an empty step id', d => (d.s[0] = '')],
      ['both', 'a step twice', d => (d.s[1] = d.s[0])],
      ['both', 'a title that is not text', d => (d.t = 5)],
      ['both', 'an introduction that is not text', d => (d.n = [])],
      ['both', 'a long title', d => (d.t = 'x'.repeat(121))],
      ['both', 'a long introduction', d => (d.n = 'x'.repeat(1201))],
      ['both', 'a package without a version', d => (d.p = [d.p[0]])],
      ['both', 'a package id that is not one', d => (d.p[0] = 'orbits')],
      ['both', 'a package version that is not one', d => (d.p[1] = '1.2')],
      ['both', 'responses', d => (d.responses = {})],
      ['both', 'answers', d => (d.answers = [])],
      ['both', 'attempts', d => (d.attempts = {})],
      ['both', 'an r', d => (d.r = 1)],
      ['both', 'an a', d => (d.a = 1)],
      // One fingerprint per step.
      ['validator', 'a fingerprint short', d => d.f.pop()],
      ['lenient', 'a version as text', d => (d.v = '2')],
      ['lenient', 'a fingerprint that is not one', d => (d.f[0] = 'changed')],
      ['lenient', 'a date that is not one', d => (d.c = 'yesterday')],
    ];
    holds(s, good, reads, cases);
  });

  test('its tables are the code’s', () => {
    expect(s.properties.k.const).toBe(AS.ASSIGNMENT_KIND);
    expect(s.properties.v.enum).toEqual(
      Array.from({ length: AS.ASSIGNMENT_SCHEMA }, (_, i) => i + 1)
    );
    expect([s.properties.s.minItems, s.properties.s.maxItems]).toEqual([
      AS.MIN_STEPS,
      AS.MAX_STEPS,
    ]);
    expect(s.properties.t.maxLength).toBe(AS.MAX_TITLE);
    expect(s.properties.n.maxLength).toBe(AS.MAX_INTRO);
    const banned = read('js/assignments/assignment.js').match(
      /for \(const banned of \[([^\]]*)\]\)/
    )[1];
    expect(
      Object.entries(s.properties)
        .filter(([, v]) => v === false)
        .map(([k]) => k)
    ).toEqual(literals(banned, /'([a-z]+)'/g));
  });
});

// --- submission token/1 and gravitas.submission-results/2 --------------------

const kepler = INVESTIGATIONS.find(l => l.id === 'keplers-laws');
const RIGHT = {
  'where-is-the-star': '1',
  'what-sits-at-the-other': '2',
  'use-the-law': '8',
  'weighing-another-star': '0.91',
};

/** A lab report as a student's browser makes one. */
function report({
  responses = RIGHT,
  name = 'Ada',
  roster = null,
  assignment = null,
  savedAt = null,
} = {}) {
  const stored = {};
  for (const [sid, value] of Object.entries(responses)) {
    stored[stepKey(kepler.id, sid)] = value;
    stored[`${stepKey(kepler.id, sid)}:locale`] = 'en';
  }
  const visited = kepler.steps.slice(0, 6).map(x => x.sid);
  const backup = BK.buildBackup({
    lesson: kepler,
    responses: stored,
    attempts: { [stepKey(kepler.id, 'use-the-law')]: 2 },
    visited,
    stepSid: visited.at(-1),
    startedAt: '2026-09-01T10:00:00.000Z',
    studentName: name,
  });
  if (savedAt) backup.savedAt = savedAt;
  return ST.buildSubmission({
    backup,
    assignmentId: assignment,
    rosterId: roster,
  });
}

describe('the submission token schema', () => {
  const s = schema('submission-token-2');
  const reads = d => ST.validateSubmission(d).ok;

  test('a report, through its token and back, fits it', async () => {
    for (const sub of [
      report(),
      report({ roster: 'r-17', assignment: '260901abcd1234', name: null }),
    ]) {
      const { token } = await ST.encodeSubmission(sub);
      expect(valid(s.$defs.token, token)).toBe(true);
      expect(valid(s.$defs.token, `#${token}`)).toBe(true);
      const back = await ST.readSubmissionToken(
        `  ${token.slice(0, 40)}\n${token.slice(40)}`
      );
      expect(back.ok).toBe(true);
      expect(valid(s, back.submission)).toBe(true);
      // The backup inside is one the investigation panel would restore.
      expect(BK.validateBackup(back.submission.b).ok).toBe(true);
    }
  });

  test('a token is refused where the pattern says so', async () => {
    const { token } = await ST.encodeSubmission(report());
    const world = await encodePayload({ v: 1, s: 'Binary Pair', seed: 'x' });
    for (const bad of [
      '',
      token.replace(/-/g, '—'),
      world,
      `a${token.slice(1)}`,
    ]) {
      expect({
        bad: bad.slice(0, 12),
        reads: (await ST.readSubmissionToken(bad)).ok,
        fits: valid(s.$defs.token, bad),
      }).toEqual({ bad: bad.slice(0, 12), reads: false, fits: false });
    }
  });

  test('and refuses what validateSubmission refuses', () => {
    const cases = [
      ['both', 'an array', d => as([d])],
      ['both', 'no version', d => delete d.v],
      ['both', 'version 0', d => (d.v = 0)],
      ['both', 'version 3', d => (d.v = 3)],
      ['both', 'a version as text', d => (d.v = '1')],
      ['both', 'no backup', d => delete d.b],
      ['both', 'no lesson', d => delete d.b.lesson],
      ['both', 'a lesson with no id', d => (d.b.lesson.id = 7)],
      ['both', 'no progress', d => delete d.b.progress],
      ['both', 'no responses', d => delete d.b.progress.responses],
      ['both', 'no steps', d => delete d.b.steps],
      ['both', 'steps that are not a list', d => (d.b.steps = {})],
      // validateSubmission checks shape only; these the backup's own reader
      // refuses, and the schema states the backup as that reader does.
      [
        'lenient',
        'responses that are a list',
        d => (d.b.progress.responses = []),
      ],
      [
        'lenient',
        'a response that is an object',
        d => (d.b.progress.responses.x = {}),
      ],
      [
        'lenient',
        'an attempt count that is text',
        d => (d.b.progress.attempts.x = 'two'),
      ],
      [
        'lenient',
        'another kind of backup',
        d => (d.b.kind = 'gravitas.notebook'),
      ],
      ['lenient', 'an assignment id that is a number', d => (d.a = 5)],
      ['lenient', 'a fallback locale that is a number', d => (d.fl = 7)],
    ];
    holds(s, report({ roster: 'r', assignment: 'a' }), reads, cases);
    // What the schema calls a backup, the backup's own reader does too.
    for (const [, label, change] of cases.filter(c => c[0] === 'lenient')) {
      const d = clone(report());
      change(d);
      if (/backup|response|attempt/.test(label))
        expect({ label, backup: BK.validateBackup(d.b).ok }).toEqual({
          label,
          backup: false,
        });
    }
  });

  test('its tables are the code’s', () => {
    expect(s.properties.v.enum).toEqual([1, ST.SUBMISSION_SCHEMA]);
    expect(s.$defs.token.pattern.startsWith(`^#?${ST.SUBMISSION_TAG}`)).toBe(
      true
    );
    const b = s.$defs.backup.properties;
    expect(b.kind.const).toBe(BK.BACKUP_KIND);
    expect(b.version.enum).toEqual(
      Array.from(
        { length: BK.BACKUP_VERSION - BK.MIN_BACKUP_VERSION + 1 },
        (_, i) => BK.MIN_BACKUP_VERSION + i
      )
    );
    // The backup's fields are the ones buildBackup writes.
    const written = BK.buildBackup({ lesson: kepler });
    expect(Object.keys(b).sort()).toEqual(Object.keys(written).sort());
    expect(Object.keys(b.progress.properties).sort()).toEqual(
      [...Object.keys(written.progress), 'stepIndex'].sort()
    );
    expect(Object.keys(b.steps.items.properties).sort()).toEqual(
      Object.keys(written.steps[0]).sort()
    );
    // Every field the code writes, the evidence included, and nothing else.
    const withEvidence = ST.buildSubmission({
      backup: written,
      record: { ids: ['e1'], rows: [], total: 0 },
      digest: 'a'.repeat(64),
    });
    expect(Object.keys(s.properties).sort()).toEqual(
      Object.keys(withEvidence).sort()
    );
    expect(Object.keys(report()).sort()).toEqual(
      Object.keys(withEvidence)
        .filter(k => k !== 'ev')
        .sort()
    );
  });
});

describe('the submission results schema', () => {
  const s = schema('submission-results-2');
  const reads = d => RS.readResults(d).ok;

  /** The review page's export of a pile: a duplicate, two attempts, one refused. */
  function exported({ includeWritten = false } = {}) {
    const a = report({ roster: 'r1', savedAt: '2026-09-02T10:00:00.000Z' });
    const b = report({
      roster: 'r1',
      savedAt: '2026-09-03T10:00:00.000Z',
      responses: { ...RIGHT, 'use-the-law': '5' },
    });
    const c = report({ name: null, responses: { 'gone-step': 'x' } });
    const records = RS.annotate([
      RS.gradeSubmission(a, kepler, { kind: 'token', label: 'pasted token' }),
      RS.gradeSubmission(b, kepler, { kind: 'pdf', label: 'b.pdf' }),
      RS.gradeSubmission(clone(a), kepler, { kind: 'pdf', label: 'a.pdf' }),
      RS.gradeSubmission(c, kepler, { kind: 'backup', label: 'c.json' }),
    ]);
    return JSON.parse(
      RS.resultsJson(records, {
        includeWritten,
        refused: [{ label: 'notes.txt', reason: 'notJson' }],
        now: new Date('2026-09-04T00:00:00.000Z'),
      })
    );
  }

  test('the review page’s export fits it, and reads back', () => {
    for (const includeWritten of [false, true]) {
      const doc = exported({ includeWritten });
      const all = doc.submissions;
      expect(all.map(x => x.warnings.join(' '))).toEqual([
        'repeatedAttempt',
        'repeatedAttempt',
        'exactDuplicate repeatedAttempt',
        'noRosterId staleAnswers',
      ]);
      expect(all[3].questions.some(q => q.verdict === 'stale')).toBe(true);
      expect(reads(doc)).toBe(true);
      expect(valid(s, doc)).toBe(true);
      // Every field it writes is one the schema requires.
      expect(Object.keys(doc).sort()).toEqual([...s.required].sort());
      // `evidence` came with the ledger: optional in the schema, always written.
      expect(Object.keys(all[0]).sort()).toEqual(
        [...s.$defs.submission.required, 'evidence'].sort()
      );
      expect(s.$defs.submission.required).not.toContain('evidence');
      // `unit` was added after the file's first release: optional in the
      // schema, so a file without it still fits, and always written now.
      expect(Object.keys(all[0].questions[0]).sort()).toEqual(
        [
          ...s.$defs.question.required,
          'unit',
          'hintsTaken',
          'workedShown',
        ].sort()
      );
      expect(s.$defs.question.required).not.toContain('unit');
    }
  });

  test('and refuses what readResults refuses, where it looks', () => {
    const cases = [
      ['both', 'another kind', d => (d.kind = 'gravitas.results')],
      ['both', 'version 3', d => (d.version = 3)],
      ['both', 'no version', d => delete d.version],
      ['both', 'not an object', () => as('results')],
      // Version 1 has no points; readResults migrates it, and it is not /2.
      ['lenient', 'version 1', d => (d.version = 1)],
      // readResults checks the kind, the version and that it is plain data,
      // and nothing else: the schema is the only statement of the rest.
      ['lenient', 'no submissions', d => delete d.submissions],
      [
        'lenient',
        'a verdict it never writes',
        d => (d.submissions[0].questions[0].verdict = 'maybe'),
      ],
      [
        'lenient',
        'points as text',
        d => (d.submissions[0].counts.points = '3'),
      ],
      [
        'lenient',
        'a fingerprint that is not one',
        d => (d.submissions[0].fingerprint = 'abc'),
      ],
      [
        'lenient',
        'a source it has no reader for',
        d => (d.submissions[0].source.kind = 'email'),
      ],
      [
        'lenient',
        'a warning it never gives',
        d => d.submissions[0].warnings.push('late'),
      ],
      [
        'lenient',
        'a completion over 1',
        d => (d.submissions[0].completion = 2),
      ],
    ];
    holds(s, exported(), reads, cases);
    // A key that reaches a prototype is refused by readResults, before any
    // field is read; a schema has no word for it.
    const hostile = `{"kind":"gravitas.submission-results","version":2,"options":{"__proto__":{"x":1}}}`;
    expect(RS.readResults(hostile)).toEqual({
      ok: false,
      reason: 'notPlainData',
    });
  });

  test('its tables are the code’s', () => {
    expect(s.properties.kind.const).toBe(RS.RESULTS_KIND);
    expect(s.properties.version.const).toBe(RS.RESULTS_VERSION);
    const sub = s.$defs.submission.properties;
    const q = s.$defs.question.properties;
    expect(q.verdict.enum).toEqual([...RS.VERDICTS]);
    expect(sub.warnings.items.enum).toEqual([...RS.WARNINGS]);
    const responseFor = read('js/submission/results.js')
      .match(/function responseFor\([\s\S]*?\n\}/)[0]
      .split('\n')
      .filter(line => line.includes('status:'))
      .join('\n');
    expect(q.responseStatus.enum.sort()).toEqual(
      literals(responseFor, /'([a-z]+)'/g).sort()
    );
    // What the review page hands in, and as what.
    expect(sub.source.properties.kind.enum.sort()).toEqual(
      [
        ...new Set(
          literals(
            read('js/submissionReview.js'),
            /accept\([^;]*?'([a-z]+)'\)/g
          )
        ),
      ].sort()
    );
  });
});

// --- gravitas.investigation-pack/1 and gravitas.question-bank/1 --------------

const api = packApi();
const ciPattern = unit =>
  [...unit]
    .map(c => {
      const up = c.toUpperCase();
      if (up !== c && up.length === 1) return `[${c}${up}]`;
      return c.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    })
    .join('');
const word = w => ciPattern(w);
/** The prose rule of js/platform/checker.js, as a pattern on the raw text. */
const prosePattern = entities =>
  `^(?:(?!<(?!/?(?:strong|em|sub|sup)>)[a-zA-Z!/?]|${word('javascript:')}|${word('data:')}|${word('vbscript:')}|${word('http')}[sS]?://|${word('www.')}|&(?!(?:${entities.join('|')});)[a-zA-Z]+;)[\\s\\S])*$`;

const pack = () => clone(EXAMPLE_INVESTIGATION);
const step = (p, sid) => p.steps.find(x => x.sid === sid);
const item = p => p.bank.items[0];
/** The bank the composer saves beside a pack (js/composerPage.js saveBank). */
const bankOf = p => ({
  format: QB.BANK_FORMAT,
  formatVersion: QB.BANK_FORMAT_VERSION,
  id: `${p.id}-bank`,
  version: p.version,
  locales: p.locales,
  title: p.title,
  items: p.bank?.items || [],
});

describe('the investigation pack schema', () => {
  const s = schema('investigation-pack-1');
  const reads = d => IP.validateInvestigationPack(d, api).length === 0;

  test('the composer’s example fits it, and every pack it reads back', () => {
    const p = pack();
    expect(reads(p)).toBe(true);
    expect(valid(s, p)).toBe(true);
    expect(IP.migrateInvestigationPack(p).ok).toBe(true);
    // A pack with neither a bank nor its optional fields, and one in English only.
    const lean = pack();
    for (const k of ['prerequisites', 'thumbnail', 'bank']) delete lean[k];
    lean.steps = lean.steps.filter(x => !['period', 'again'].includes(x.sid));
    step(lean, 'guess').reveal = 'which';
    const english = pack();
    english.locales = ['en'];
    const strip = v => {
      if (Array.isArray(v)) return v.forEach(strip);
      if (v && typeof v === 'object') {
        if (typeof v.en === 'string') {
          delete v.es;
          delete v.esOf;
        }
        Object.values(v).forEach(strip);
      }
    };
    strip(english);
    for (const p2 of [lean, english])
      expect([reads(p2), valid(s, p2)]).toEqual([true, true]);
  });

  test('and refuses what validateInvestigationPack refuses', () => {
    const inline = d => step(d, 'which');
    /** The inline choice, made a numeric question with these fields. */
    const numeric = (d, fields) => {
      const q = inline(d);
      q.kind = 'numeric';
      delete q.options;
      Object.assign(q, { answer: 2, tolerance: 0.1 }, fields);
      for (const k of Object.keys(q)) if (q[k] === undefined) delete q[k];
    };
    const cases = [
      ['both', 'an id Gravitas already uses', d => (d.id = 'keplers-laws')],
      ['both', 'an id that is not public', d => (d.id = 'Reading An Orbit')],
      ['both', 'a version that is not one', d => (d.version = '1.0')],
      ['both', 'no English', d => (d.locales = ['es'])],
      ['both', 'a locale Gravitas lacks', d => d.locales.push('fr')],
      ['both', 'a duration the card cannot print', d => (d.duration = 'soon')],
      ['both', 'an unknown field', d => (d.author = 'x')],
      ['both', 'a negative seed', d => (d.seed = -1)],
      ['both', 'a seed past 32 bits', d => (d.seed = 2 ** 32)],
      ['both', 'no objectives', d => (d.objectives = [])],
      [
        'both',
        'nine objectives',
        d => (d.objectives = Array(9).fill(d.objectives[0])),
      ],
      [
        'both',
        'a prerequisite lesson that does not exist',
        d => (d.prerequisites = [{ lesson: 'nope' }]),
      ],
      [
        'both',
        'a prerequisite of two kinds',
        d =>
          (d.prerequisites = [{ lesson: 'keplers-laws', text: { en: 'x' } }]),
      ],
      ['both', 'a thumbnail of no scenario', d => (d.thumbnail = 'Nowhere')],
      ['both', 'one step', d => (d.steps = d.steps.slice(0, 1))],
      ['both', 'a first step with no scenario', d => delete d.steps[0].setup],
      [
        'both',
        'a scenario Gravitas lacks',
        d => (d.steps[0].setup.scenario = 'Nowhere'),
      ],
      [
        'both',
        'a seed that is a number, not a word',
        d => (d.steps[0].setup.seed = 7),
      ],
      ['both', 'a zoom of 0', d => (d.steps[0].setup.zoom = 0)],
      ['both', 'an unknown setup field', d => (d.steps[0].setup.speed = 2)],
      [
        'both',
        'an instrument Gravitas lacks',
        d => (d.steps[2].tool = { id: 'no-such-tool' }),
      ],
      ['both', 'a step id with a colon', d => (d.steps[2].sid = 'a:b')],
      ['both', 'a step id of digits', d => (d.steps[2].sid = '42')],
      ['both', 'a step type the engine lacks', d => (d.steps[2].type = 'quiz')],
      [
        'both',
        'a field of another type of step',
        d => (d.steps[0].checklist = [{ en: 'x' }]),
      ],
      ['both', 'an empty checklist', d => (step(d, 'watch').checklist = [])],
      [
        'both',
        'a measurement with no label',
        d => delete step(d, 'time-it').fields[0].label,
      ],
      [
        'both',
        'a measurement id that is not one',
        d => (step(d, 'time-it').fields[0].id = 'Period 1'),
      ],
      [
        'both',
        'a prediction with one option',
        d => (step(d, 'guess').options = [{ en: 'x' }]),
      ],
      [
        'both',
        'a prediction marked nowhere',
        d => delete step(d, 'guess').reveal,
      ],
      [
        'both',
        'remediation on no state',
        d => (step(d, 'again').when.is = 'maybe'),
      ],
      ['both', 'an answer past six options', d => (inline(d).answer = 6)],
      [
        'both',
        'an inline question with no scoring',
        d => delete inline(d).scoring,
      ],
      [
        'both',
        'an inline question with variants',
        d => (inline(d).variants = { shuffle: true }),
      ],
      [
        'both',
        'an inline question with accessibility',
        d => (inline(d).a11y = { textOnly: true }),
      ],
      [
        'both',
        'a short answer with no rubric',
        d => delete step(d, 'explain').rubric,
      ],
      [
        'both',
        'a short answer with a tolerance',
        d => (step(d, 'explain').tolerance = 1),
      ],
      [
        'both',
        'a bank question that says its own prompt',
        d => (step(d, 'period').prompt = { en: 'x' }),
      ],
      ['both', 'no English', d => delete d.title.en],
      ['both', 'blank English', d => (d.title.en = '  ')],
      ['both', 'a language Gravitas lacks', d => (d.title.fr = 'Lire')],
      [
        'both',
        'a stale-translation digest that is not one',
        d => (d.title.esOf = 'later'),
      ],
      ['both', 'markup', d => (d.summary.en = 'Read <a href="x">this</a>')],
      ['both', 'a script link', d => (d.summary.en = 'JavaScript:alert(1)')],
      ['both', 'a web address', d => (d.summary.en = 'See www.example.com')],
      [
        'both',
        'an upper-case tag',
        d => (d.summary.en = '<STRONG>Note</STRONG>'),
      ],
      [
        'both',
        'an entity lessons do not use',
        d => (d.summary.en = 'A &copy; B'),
      ],
      [
        'both',
        'text longer than any lesson’s',
        d => (d.summary.en = 'x'.repeat(4001)),
      ],
      ['both', 'a bank with no items', d => (d.bank = {})],
      ['both', 'an unknown bank field', d => (d.bank.title = { en: 'x' })],
      ['both', 'a bank item with no version', d => delete item(d).version],
      ['both', 'a bank item worth nothing', d => (item(d).scoring.points = 0)],
      [
        'both',
        'counting an attempt that does not exist',
        d => (item(d).scoring.attempts = 'last'),
      ],
      ['both', 'no accessibility metadata', d => delete item(d).a11y],
      [
        'both',
        'not answerable from its text, with no note why',
        d => (item(d).a11y.textOnly = false),
      ],
      ['both', 'a typed answer beside the relation', d => (item(d).answer = 2)],
      [
        'both',
        'inputs out of the relation’s range',
        d => (item(d).variants.values[0].a = 5000),
      ],
      [
        'both',
        'an input the relation lacks',
        d => (item(d).variants.values[0].e = 0.1),
      ],
      [
        'both',
        'a relation Gravitas lacks',
        d => (item(d).variants.relation = 'hubble'),
      ],
      [
        'both',
        'a tolerance of 30 percent',
        d => (item(d).variants.tolerancePct = 30),
      ],
      [
        'both',
        'in a unit the relation does not answer in',
        d => (item(d).unit = 'days'),
      ],
      [
        'both',
        'accepting a unit the parser cannot read',
        d => (item(d).expect.accept = ['fortnights']),
      ],
      [
        'both',
        'a dimension the parser lacks',
        d => (item(d).expect.dimension = 'charm'),
      ],
      [
        'both',
        'a method hint and no idea hint',
        d => delete item(d).hints.concept,
      ],
      // The choice made a number: fine as it is, and refused each way it breaks.
      ['fine', 'a numeric question', d => numeric(d, {})],
      [
        'both',
        'a misconception off by a factor that also equals a number',
        d =>
          numeric(d, {
            misconceptions: [
              { id: 'x', factor: 2, equals: 3, say: { en: 'x' } },
            ],
          }),
      ],
      ['both', 'a numeric answer of 0', d => numeric(d, { answer: 0 })],
      [
        'both',
        'a numeric answer with no tolerance',
        d => numeric(d, { tolerance: undefined }),
      ],
      // What the validator checks across the file: ids, order, the bank.
      [
        'validator',
        'two steps with one id',
        d => (d.steps[2].sid = d.steps[1].sid),
      ],
      [
        'validator',
        'a prediction marked at an earlier step',
        d => (step(d, 'guess').reveal = 'look'),
      ],
      [
        'validator',
        'a choice whose answer is not an option',
        d => (inline(d).answer = 5),
      ],
      [
        'validator',
        'a question from a missing bank item',
        d => (step(d, 'period').from = 'nope'),
      ],
      ['validator', 'a closing step that asks something', d => d.steps.pop()],
      [
        'validator',
        'a measurement named twice',
        d =>
          step(d, 'time-it').fields.push({
            id: 'period',
            label: { en: 'Again' },
          }),
      ],
      [
        'validator',
        'a requirement on a later step',
        d => (d.steps[1].requires = [d.steps[3].sid]),
      ],
      [
        'validator',
        'remediation on a step that is not graded',
        d => (step(d, 'again').when.sid = 'look'),
      ],
      [
        'validator',
        'Spanish in a pack that declares none',
        d => (d.locales = ['en']),
      ],
      [
        'validator',
        'a prompt that does not say an input',
        d => (item(d).prompt.en = 'How long is the year at {a} AU?'),
      ],
      [
        'validator',
        'variants a copied answer would pass',
        d => item(d).variants.values.push({ a: 4.05, M: 1 }),
      ],
      [
        'validator',
        'accepting units but not the one it is graded in',
        d => (item(d).expect.accept = ['d', 'days']),
      ],
      [
        'validator',
        'two bank items with one id',
        d => d.bank.items.push(clone(item(d))),
      ],
      [
        'validator',
        'markup split by a tag',
        d => (d.summary.en = 'java<em></em>script:alert(1)'),
      ],
      // A choice ignores a tolerance, so only the structural guard, which
      // runs before any rule, refuses one nested deeper than any pack is.
      [
        'validator',
        'a file nested deeper than any pack',
        d => {
          let deep = 1;
          for (let i = 0; i < 14; i++) deep = { deep };
          inline(d).tolerance = deep;
        },
      ],
      ['both', 'a pack id that is a number', d => (d.id = 2026)],
    ];
    holds(s, pack(), reads, cases);
  });

  test('its tables are the code’s', () => {
    const src = read('js/platform/investigation.js');
    const set = name =>
      literals(
        src.match(
          new RegExp(`const ${name} = new Set\\(\\[([\\s\\S]*?)\\]\\)`)
        )[1],
        /'([a-zA-Z0-9]+)'/g
      );
    expect(s.properties.format.const).toBe(IP.FORMAT);
    expect(s.properties.formatVersion.const).toBe(IP.FORMAT_VERSION);
    expect(Object.keys(s.properties).sort()).toEqual(set('PACK_FIELDS').sort());
    expect(s.properties.locales.items.enum).toEqual(api.locales);
    expect(s.properties.id.not.enum).toEqual(api.lessons);
    // A scenario by id, or by the English name a pack made before ids used.
    const scenarios = [...api.scenarios, ...LEGACY_NAMES];
    expect(s.properties.thumbnail.enum).toEqual(scenarios);
    expect(
      s.properties.prerequisites.items.anyOf[0].properties.lesson.enum
    ).toEqual(api.lessons);
    expect(s.$defs.setup.properties.scenario.enum).toEqual(scenarios);
    expect(s.$defs.tool.properties.id.enum).toEqual(api.widgets);
    expect(s.$defs.when.properties.is.enum).toEqual([...IP.WHEN_STATES]);
    // Each type of step has exactly its fields (the common ones and its own).
    const common = literals(
      src.match(/const COMMON_STEP = \[([\s\S]*?)\]/)[1],
      /'([a-zA-Z]+)'/g
    );
    const own = Object.fromEntries(
      [
        ...src
          .match(/const STEP_FIELDS = \{([\s\S]*?)\n\};/)[1]
          .matchAll(/(\w+): \[([^\]]*)\]/g),
      ].map(m => [m[1], literals(m[2], /'([a-zA-Z]+)'/g)])
    );
    expect(Object.keys(own)).toEqual(
      expect.arrayContaining([...IP.STEP_TYPES])
    );
    const branches = s.$defs.step.anyOf;
    expect(
      [...new Set(branches.map(b => b.properties.type.const))].sort()
    ).toEqual([...IP.STEP_TYPES].sort());
    for (const b of branches) {
      const type = b.properties.type.const;
      const fields = Object.keys(b.properties).sort();
      const allowed = [...common, ...own[type]];
      expect({ type, extra: fields.filter(f => !allowed.includes(f)) }).toEqual(
        { type, extra: [] }
      );
      expect(b.additionalProperties).toBe(false);
    }
    // The two question steps: from the bank, and inline, between them every field.
    const q = branches.filter(b => b.properties.type.const === 'question');
    expect(
      [...new Set(q.flatMap(b => Object.keys(b.properties)))].sort()
    ).toEqual([...common, ...own.question].sort());
    // What a bank item is, the pack's $defs say just as the bank's do.
    const bank = schema('question-bank-1');
    for (const [k, v] of Object.entries(bank.$defs))
      expect({ def: k, same: s.$defs[k] }).toEqual({ def: k, same: v });
  });
});

describe('the question bank schema', () => {
  const s = schema('question-bank-1');
  const reads = d =>
    QB.validateQuestionBankWith(d, api, IP.makeChecker).length === 0;

  test('the bank the composer saves from the example fits it', () => {
    const bank = clone(bankOf(pack()));
    expect(bank.items.map(i => i.id)).toEqual(['kepler-period']);
    expect([reads(bank), valid(s, bank)]).toEqual([true, true]);
    // The composer writes exactly these fields.
    const page = read('js/composerPage.js');
    const literal = page.match(/const bank = \{([\s\S]*?)\};/)[1];
    expect(literals(literal, /^ {4}(\w+)\b/gm)).toEqual(Object.keys(bank));
  });

  test('and refuses what validateQuestionBankWith refuses', () => {
    const one = d => d.items[0];
    // A bank of one of each kind: the example's relation item, a choice, a
    // typed number with misconceptions, and a short answer.
    const good = clone(bankOf(pack()));
    good.items.push(
      {
        id: 'which-is-faster',
        version: 1,
        kind: 'choice',
        prompt: { en: 'Which planet moves faster?' },
        options: [{ en: 'The nearer' }, { en: 'The farther' }],
        answer: 0,
        because: { en: 'Kepler&rsquo;s second law, in <em>speed</em>.' },
        variants: { shuffle: true },
        scoring: { points: 1, attempts: 'first' },
        a11y: { textOnly: true },
      },
      {
        id: 'mars-year',
        version: 3,
        kind: 'numeric',
        prompt: { en: 'How long is a year at 1.52 AU?' },
        answer: 1.88,
        tolerance: 0.05,
        unit: 'yr',
        expect: { dimension: 'time', unit: 'YR', accept: ['yr', 'Years', 'd'] },
        because: { en: 'P = a^{3/2}.' },
        hints: { concept: { en: 'Kepler.' } },
        misconceptions: [
          { id: 'squared', factor: 1.24, say: { en: 'Not squared.' } },
          { id: 'earth', equals: 1, say: { en: 'That is the Earth.' } },
        ],
        scoring: { points: 2, attempts: 'best' },
        a11y: { textOnly: false, note: { en: 'Read the table.' } },
      },
      {
        id: 'why-slower',
        version: 1,
        kind: 'short',
        prompt: { en: 'Why?' },
        rubric: { en: 'Mentions gravity.' },
        scoring: { points: 1, attempts: 'first' },
        a11y: { textOnly: true },
      }
    );
    const at = (d, id) => d.items.find(x => x.id === id);
    const cases = [
      ['both', 'another format', d => (d.format = IP.FORMAT)],
      ['both', 'version 2', d => (d.formatVersion = 2)],
      ['both', 'an id that is not public', d => (d.id = 'Orbits Bank')],
      // Tested as text, a number passed for an id until the schema said so.
      ['both', 'an id that is a number', d => (d.id = 2026)],
      [
        'both',
        'an item id that is a number',
        d => (at(d, 'why-slower').id = 7),
      ],
      [
        'both',
        'a misconception id that is a number',
        d => (at(d, 'mars-year').misconceptions[0].id = 3),
      ],
      ['both', 'a version that is not one', d => (d.version = 'one')],
      ['both', 'no title', d => delete d.title],
      ['both', 'no items', d => delete d.items],
      ['both', 'an unknown field', d => (d.author = 'x')],
      [
        'both',
        'too many items',
        d =>
          (d.items = Array.from({ length: 201 }, (_, i) => ({
            ...at(d, 'why-slower'),
            id: `q-${i}`,
          }))),
      ],
      ['both', 'an unknown item field', d => (one(d).points = 2)],
      [
        'both',
        'an item kind it lacks',
        d => (at(d, 'why-slower').kind = 'essay'),
      ],
      ['both', 'an item version of 0', d => (at(d, 'mars-year').version = 0)],
      [
        'both',
        'more points than ten',
        d => (at(d, 'mars-year').scoring.points = 11),
      ],
      ['both', 'a choice of one', d => at(d, 'which-is-faster').options.pop()],
      [
        'both',
        'a choice with no answer',
        d => delete at(d, 'which-is-faster').answer,
      ],
      [
        'both',
        'a choice with no explanation',
        d => delete at(d, 'which-is-faster').because,
      ],
      [
        'both',
        'a choice that does not shuffle',
        d => (at(d, 'which-is-faster').variants.shuffle = false),
      ],
      [
        'both',
        'a choice with inputs',
        d => (at(d, 'which-is-faster').variants = { relation: 'kepler3' }),
      ],
      [
        'both',
        'a number with options',
        d => (at(d, 'mars-year').options = [{ en: 'x' }, { en: 'y' }]),
      ],
      [
        'both',
        'a number with a long unit',
        d => (at(d, 'mars-year').unit = 'x'.repeat(17)),
      ],
      [
        'both',
        'a misconception with neither',
        d => delete at(d, 'mars-year').misconceptions[0].factor,
      ],
      [
        'both',
        'a misconception with no words',
        d => delete at(d, 'mars-year').misconceptions[1].say,
      ],
      [
        'both',
        'a negative factor',
        d => (at(d, 'mars-year').misconceptions[0].factor = -2),
      ],
      [
        'both',
        'seven misconceptions',
        d =>
          (at(d, 'mars-year').misconceptions = Array(7).fill(
            at(d, 'mars-year').misconceptions[1]
          )),
      ],
      [
        'both',
        'an expected unit of another dimension',
        d => (at(d, 'mars-year').expect.unit = 'km'),
      ],
      [
        'both',
        'an unknown expect field',
        d => (at(d, 'mars-year').expect.strict = true),
      ],
      [
        'both',
        'an unknown hint stage',
        d => (at(d, 'mars-year').hints.answer = { en: 'x' }),
      ],
      [
        'both',
        'a short answer with options',
        d => (at(d, 'why-slower').options = [{ en: 'x' }, { en: 'y' }]),
      ],
      [
        'both',
        'a short answer with variants',
        d => (at(d, 'why-slower').variants = { shuffle: true }),
      ],
      [
        'both',
        'a short answer with an expectation',
        d => (at(d, 'why-slower').expect = { dimension: 'time', unit: 'yr' }),
      ],
      [
        'validator',
        'two items with one id',
        d => (at(d, 'why-slower').id = 'mars-year'),
      ],
      [
        'validator',
        'a choice answer past its options',
        d => (at(d, 'which-is-faster').answer = 3),
      ],
      [
        'validator',
        'a prompt naming an input the relation lacks',
        d => (one(d).prompt.en += ' {e}'),
      ],
      [
        'validator',
        'Spanish in a bank that declares none',
        d => (d.locales = ['en']),
      ],
    ];
    holds(s, good, reads, cases);
  });

  test('its tables are the code’s', () => {
    expect(s.properties.format.const).toBe(QB.BANK_FORMAT);
    expect(s.properties.formatVersion.const).toBe(QB.BANK_FORMAT_VERSION);
    expect(s.properties.items.maxItems).toBe(QB.MAX_ITEMS);
    const d = s.$defs;
    const src = read('js/platform/questionBank.js');
    const fields = literals(
      src.match(/const ITEM_FIELDS = new Set\(\[([\s\S]*?)\]\)/)[1],
      /'([a-zA-Z0-9]+)'/g
    );
    expect(Object.keys(d.item.properties)).toEqual(fields);
    expect(d.item.properties.kind.enum).toEqual([...QB.ITEM_KINDS]);
    expect(d.questionRules.anyOf.map(b => b.properties.kind.const)).toEqual([
      'choice',
      'numeric',
      'numeric',
      'short',
    ]);
    expect(d.scoring.properties.points.maximum).toBe(QB.MAX_POINTS);
    expect(d.scoring.properties.attempts.enum).toEqual([...QB.ATTEMPT_RULES]);
    expect(d.prose.pattern).toBe(prosePattern(api.entities));
    expect(d.expect.properties.dimension.enum).toEqual(Object.keys(api.units));
    expect(d.expect.anyOf).toEqual(
      Object.entries(api.units).map(([dim, units]) => {
        const u = {
          type: 'string',
          pattern: `^(?:${units.map(ciPattern).join('|')})$`,
        };
        return {
          properties: {
            dimension: { const: dim },
            unit: u,
            accept: { items: u },
          },
        };
      })
    );
    // Every unit the parser reads, in any case, and nothing else.
    for (const [dim, units] of Object.entries(api.units)) {
      const re = new RegExp(
        d.expect.anyOf.find(b => b.properties.dimension.const === dim)
          .properties.unit.pattern
      );
      for (const u of units)
        expect([u, re.test(u), re.test(u.toUpperCase())]).toEqual([
          u,
          true,
          true,
        ]);
      expect(re.test('fortnights')).toBe(false);
    }
    expect(
      d.questionRules.anyOf[2].properties.variants.properties.relation.enum
    ).toEqual(Object.keys(RELATIONS));
    expect(d.relationVariants.anyOf).toEqual(
      Object.entries(RELATIONS).map(([id, r]) => ({
        required: r.output.unit === '' ? ['variants'] : ['variants', 'unit'],
        properties: {
          variants: {
            properties: {
              relation: { const: id },
              values: {
                items: {
                  type: 'object',
                  required: Object.keys(r.inputs),
                  additionalProperties: false,
                  properties: Object.fromEntries(
                    Object.entries(r.inputs).map(([k, x]) => [
                      k,
                      { type: 'number', minimum: x.min, maximum: x.max },
                    ])
                  ),
                },
              },
            },
          },
          unit: r.output.unit === '' ? false : { const: r.output.unit },
        },
      }))
    );
  });
});
