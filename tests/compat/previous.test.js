import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

import { FORMATS, SUPPORT_PERIOD } from '../../tools/formats.mjs';
import { PERIODS } from '../../tools/surface-gate.mjs';
import { BOUNDARY } from './boundary.mjs';
import { FIXTURES, PREVIOUS, RETIRED_EXPERIMENT } from './previous.mjs';
import { REPO, archiveOld, run } from './harness.js';
import { lesson } from './kinds/_lesson.mjs';

import { readSetup } from '../../js/forward/setup.js';
import { encodeTagged, decodePayload } from '../../js/shareState.js';
import { scenarioId } from '../../js/scenarios.js';
import { migrateExperiment } from '../../js/experiments/experimentManifest.js';
import { migrate as migrateStore } from '../../js/experiments/store.js';
import { validateAssignment } from '../../js/assignments/assignment.js';
import { readProgress } from '../../js/investigations/progressSchema.js';
import { validateBackup } from '../../js/investigations/progressBackup.js';
import { validateSubmission } from '../../js/submission/submissionToken.js';
import { readResults } from '../../js/submission/results.js';
import { migrateCoursePack } from '../../js/course/pack.js';
import { readCourseFragment } from '../../js/course/links.js';
import { readExpectations } from '../../js/instructorExpectations.js';
import { readFlow } from '../../js/instructorFlow.js';

// =============================================================================
// Every format that reads a previous version has a fixture of that version
// (Prompt 290). tests/compat/previous.mjs holds them and says which are the
// corpus's (what 2.0.0 wrote) and which are inline; this runs each through the
// current reader, and holds the table to FORMATS.md both ways: a row whose
// previous column says it reads one has an entry, and an entry names a row.
// =============================================================================

Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  value: webcrypto,
});

let old;
beforeAll(() => {
  old = archiveOld();
});
afterAll(() => old?.cleanup());

const steps = () => [{ sid: 'guess' }, { sid: 'check' }];
const reads = {
  'setup-v0': d => readSetup(d).ok,
  'share-link-v1': async d =>
    (await decodePayload(await encodeTagged('', 1, d))).s === 'solar-system',
  'scenario-name': d => scenarioId(d) === 'solar-system',
  'store-v1': d => {
    const r = migrateStore(d);
    return r.ok && r.record.v === 3 && !!r.record.runs.A && !!r.record.runs.B;
  },
  'store-v2': d => {
    const r = migrateStore(d);
    return r.ok && r.record.v === 3;
  },
  'assignment-v1': d => validateAssignment(d).ok,
  'progress-v1': d => readProgress(d, lesson()).migrated === true,
  'backup-v1': d => validateBackup(d).ok,
  'token-v1': d => validateSubmission(d).ok,
  'results-v1': d => {
    const r = readResults(d);
    return r.ok && r.doc.version === 2;
  },
  'course-pack-v1': d =>
    migrateCoursePack(d, { platform: '1.0.0' }).formatVersion === 2,
  'expectations-v1': d => {
    const r = readExpectations(d, steps);
    return (
      r.ok &&
      r.doc.formatVersion === 2 &&
      r.doc.lessons.tides.guess === 'About 12 hours'
    );
  },
  'flow-v1': d => {
    const r = readFlow(d, steps);
    return (
      r.ok &&
      r.doc.formatVersion === 2 &&
      r.doc.lessons.tides[0].from === 'guess'
    );
  },
};

const clone = v => JSON.parse(JSON.stringify(v));
const rowsThatRead = FORMATS.filter(f =>
  /^(migrates|reads|converts)/.test(f.older)
);

describe('the previous versions the readers read', () => {
  test('every row that reads a previous version has a fixture of it, and no entry names a row that is not there', () => {
    const have = new Set(PREVIOUS.map(p => p.row));
    expect(have.size).toBe(PREVIOUS.length);
    for (const f of rowsThatRead)
      expect({ row: f.name, has: have.has(f.name) }).toEqual({
        row: f.name,
        has: true,
      });
    const names = new Set(FORMATS.map(f => f.name));
    for (const p of PREVIOUS)
      expect({ row: p.row, listed: names.has(p.row) }).toEqual({
        row: p.row,
        listed: true,
      });
  });

  describe.each(PREVIOUS.filter(p => p.inline))('$row reads $previous', p => {
    test.each([p.inline].flat().map(k => [k]))(
      'the fixture %s is read',
      async key => {
        expect(await reads[key](clone(FIXTURES[key]))).toBe(true);
      }
    );
  });

  test("the retired experiment id still opens, under the first release's own manifest", () => {
    const doc = JSON.parse(readFileSync(RETIRED_EXPERIMENT, 'utf8'));
    expect(doc.format).toBe('gravitas-experiment');
    const r = migrateExperiment(doc);
    expect({ error: r.error, manifest: !!r.manifest }).toEqual({
      error: null,
      manifest: true,
    });
  });

  test.each(PREVIOUS.filter(p => p.corpus))(
    '$row: what 2.0.0 wrote ($corpus) is the previous version',
    p => {
      const made = run(old.tree, p.corpus, 'make');
      expect(made.ok).toBe(true);
      expect(made.value.formatVersion).toBe(p.version);
      // The current reader reads it (the matrix holds it lossless).
      expect(run(REPO, p.corpus, 'read', made.value).value.accepted).toBe(true);
    }
  );

  test('an investigation link of the previous prefix: i1 is what 2.0.0 wrote and the current reader reads it', () => {
    const made = run(old.tree, 'investigation-link', 'make');
    expect(made.ok).toBe(true);
    expect(made.value.hash.startsWith('i1')).toBe(true);
    expect(
      run(REPO, 'investigation-link', 'read', made.value).value.accepted
    ).toBe(true);
  });

  test('a course home link of the previous prefixes: c2 is what 2.0.0 wrote and c1 is read', async () => {
    const made = run(old.tree, 'course-home-link', 'make');
    expect(made.ok).toBe(true);
    expect(made.value.hash.startsWith('c2')).toBe(true);
    expect(
      run(REPO, 'course-home-link', 'read', made.value).value.accepted
    ).toBe(true);
    const payload = await readCourseFragment(
      await encodeTagged('c', 1, FIXTURES['course-pack-v1'])
    );
    expect(payload.formatVersion).toBe(1);
  });
});

describe('the compatibility matrix is current', () => {
  test('every boundary entry names a format the table lists, at the version it moves to', () => {
    const versions = new Map();
    for (const f of FORMATS) {
      const id = f.name.replace(/\s*\(.*\)$/, '');
      versions.set(id, [...(versions.get(id) ?? []), f.version]);
    }
    for (const e of BOUNDARY.filter(x => x.boundary)) {
      const id = e.boundary.format;
      // A link prefix is named by its link row ("course home link"), a format by its id.
      expect({ id: e.id, listed: versions.has(id) }).toEqual({
        id: e.id,
        listed: true,
      });
      expect({
        id: e.id,
        to: versions.get(id).some(v => v >= e.boundary.to),
      }).toEqual({ id: e.id, to: true });
    }
  });
});

describe('the support period', () => {
  test('FORMATS.md states the period the surface gate commits (class R)', () => {
    expect(PERIODS.R.deprecated.months).toBe(12);
    expect(PERIODS.R.readOnly.months).toBe(12);
    expect(SUPPORT_PERIOD).toMatch(/first twelve months/);
    expect(SUPPORT_PERIOD).toMatch(/twelve more/);
  });

  test('a surface the gate retired holds no record, file or link, or its formats keep their rows', () => {
    const gate = JSON.parse(readFileSync('tools/surface-gate.json', 'utf8'));
    const rows = Array.isArray(gate)
      ? gate
      : (gate.surfaces ??
        gate.records ??
        Object.values(gate).find(Array.isArray));
    const retired = rows.filter(r => r.verdict === 'RETIRE');
    expect(retired.length).toBeGreaterThan(0);
    for (const s of retired) {
      // Class L holds nothing a person keeps; class R would need its formats' readers kept.
      expect({ id: s.id, support: s.support }).toEqual({
        id: s.id,
        support: 'L',
      });
    }
  });
});
