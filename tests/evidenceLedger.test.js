import { describe, test, expect } from '@jest/globals';

// =============================================================================
// The evidence ledger (Roadmap II, Prompt 70, parts 1 and 2)
// -----------------------------------------------------------------------------
// Every producer's entry holds its result as an envelope with where it was
// kept; an entry from before envelopes reads as one made after; the student's
// words are the only part that changes; and the report says the same numbers
// in English and Spanish.
// =============================================================================

import { webcrypto } from 'node:crypto';
import { TextDecoder } from 'node:util';
import { registerMessages, setLocale } from '../js/i18n/index.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import { ES_DEFERRED } from '../js/i18n/es.deferred.js';
import { EN_REPORT } from '../js/i18n/en.report.js';
import { ES_REPORT } from '../js/i18n/es.report.js';
import {
  SOURCE,
  annotate,
  buildEntry,
  provenanceOf,
  quantity,
  reviveEntry,
  snapshotFingerprint,
  withContext,
} from '../js/notebook/entry.js';
import { observedEntry } from '../js/notebook/observed.js';
import { artifactEntry } from '../js/notebook/artifactEntry.js';
import {
  deriveEnvelope,
  envelopeOf,
  evidenceRows,
  ledgerDigest,
  ledgerRecord,
  observedRows,
} from '../js/notebook/ledger.js';
import { buildLedgerReport } from '../js/notebook/report.js';
import { artifact, validateArtifact } from '../js/platform/artifact.js';

Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  value: webcrypto,
});

registerMessages('en', { ...EN_DEFERRED, ...EN_REPORT });
registerMessages('es', { ...ES_DEFERRED, ...ES_REPORT });

const at = 1_800_000_000_000;
const ctx = { lesson: 'keplers-laws', step: 'fit', assignment: 'a1' };
const sim = (source, extra = {}) =>
  withContext(ctx, () =>
    buildEntry({
      source,
      title: source,
      capturedAt: at,
      quantities: [
        quantity({
          label: 'Period',
          value: 3.5247,
          unit: 'd',
          uncertainty: 0.0012,
        }),
        quantity({ label: 'K', value: 85.2, unit: 'm/s', kind: 'truth' }),
        quantity({ label: 'chi2', value: 1.1, unit: '' }),
      ],
      provenance: provenanceOf({
        scenario: 'kepler',
        seed: 's1',
        integrator: 'rk4',
        timestep: 0.01,
        flags: ['truth-revealed'],
      }),
      ...extra,
    })
  );

const node = {
  id: 'n1',
  tool: 'line',
  version: '1.0.0',
  at: 2,
  params: { window: [6400, 6700] },
  quantities: [
    {
      id: 'ew',
      value: 7.01,
      unit: 'Angstrom',
      kind: 'measured',
      error: 0.16,
      errorKind: 'assumed',
    },
    { id: 'rest', value: 6564.61, unit: 'Angstrom', kind: 'assumed' },
    {
      id: 'velocity',
      value: -241,
      unit: 'km/s',
      kind: 'derived',
      error: 9.5,
    },
  ],
  warnings: [{ code: 'errorsFromScatter' }],
};
const source = {
  id: 'builtin:x',
  title: 'A star',
  source: { kind: 'builtin', id: 'sdss', version: '1' },
  license: { status: 'public-domain' },
  credit: 'SDSS',
  citations: [{ text: 'Abdurro’uf et al. 2022' }],
};
const digest = 'a'.repeat(64);

const every = () => [
  ...[
    SOURCE.RV_FIT,
    SOURCE.BENCH_COMPARISON,
    SOURCE.BENCH_RELIABILITY,
    SOURCE.BENCH_SWEEP,
    SOURCE.GW_OBSERVATION,
    SOURCE.STELLAR_LAB,
    SOURCE.BINARY_ORBIT,
    SOURCE.HORIZON_TRIALS,
  ].map(s => sim(s)),
  observedEntry({
    node,
    source,
    digest,
    changes: [{ op: 'crop' }, { op: 'normalize' }],
    title: 'Line',
    labels: { quantity: q => q.id, note: q => q.kind },
    capturedAt: at,
    context: { page: 'observatory', observation: source.id },
  }),
  observedEntry({
    node: {
      ...node,
      tool: 'guide:exo-star',
      quantities: [{ id: 's1', value: 1288, unit: '', kind: 'measured' }],
      warnings: [],
    },
    source,
    digest,
    changes: [],
    title: 'Guide',
    labels: { quantity: q => q.id, note: q => q.kind },
    steps: [['s1', 'done']],
    capturedAt: at,
    context: { page: 'observatory', guide: 'exo-star', path: 'intro' },
  }),
  artifactEntry({
    source: SOURCE.INFERENCE_FIT,
    title: 'Fit',
    capturedAt: at,
    context: { page: 'observatory' },
    envelope: artifact({
      id: 'fit-1',
      source: { kind: 'inference', id: 'rv', version: '1', digest },
      quantities: [
        {
          id: 'P',
          value: 3.5,
          unit: 'd',
          uncertainty: { kind: 'sigma', sigma: 0.01, basis: 'data' },
          origin: 'fitted',
        },
      ],
    }),
  }),
];

describe('every producer writes an envelope with where it was kept', () => {
  test('each entry holds a valid gravitas.artifact/1 and its context', () => {
    for (const e of every()) {
      const env = e.snapshot.artifact;
      expect(validateArtifact(env)).toEqual([]);
      expect(env.quantities.length).toBeGreaterThan(0);
      expect(env.provenance.context).toBeTruthy();
      expect(envelopeOf(e)).toBe(env);
    }
  });

  test('a lesson capture names the lesson, the step and the assignment', () => {
    const e = sim(SOURCE.RV_FIT);
    expect(e.snapshot.context).toEqual(ctx);
    expect(e.snapshot.artifact.provenance.context).toEqual(ctx);
    const env = e.snapshot.artifact;
    expect(env.source).toMatchObject({ kind: 'simulation', id: 'kepler' });
    expect(env.provenance.settings).toMatchObject({
      integrator: 'rk4',
      step: 0.01,
      seed: 's1',
    });
    expect(env.warnings).toContain('truth-revealed');
    expect(env.quantities.map(q => [q.unit, q.origin])).toEqual([
      ['d', 'measured'],
      ['m/s', 'truth'],
      ['', 'measured'],
    ]);
  });

  test('a measurement on data cites the data by digest and keeps its assumption', () => {
    const e = every().find(x => x.source === 'observatory');
    const env = e.snapshot.artifact;
    expect(env.source).toMatchObject({ kind: 'pipeline', id: 'line', digest });
    expect(env.quantities.map(q => [q.id, q.origin])).toEqual([
      ['ew', 'measured'],
      ['velocity', 'derived'],
      ['assumed:rest', 'assumed'],
    ]);
    expect(env.quantities[0].uncertainty.basis).toBe('assumed');
    expect(env.provenance.citations).toEqual(['Abdurro’uf et al. 2022']);
    expect(e.snapshot.observed.rows).toBeUndefined();
  });
});

describe('an entry kept before envelopes were written', () => {
  test('reads as one made after, and is not rewritten', () => {
    const now = sim(SOURCE.RV_FIT);
    const old = JSON.parse(JSON.stringify(now));
    delete old.snapshot.artifact;
    delete old.snapshot.context;
    old.fingerprint = snapshotFingerprint(old.snapshot);
    const revived = reviveEntry(old);
    expect(revived.tampered).toBeUndefined();
    expect(revived.snapshot.artifact).toBeUndefined();
    const projected = envelopeOf(revived);
    expect(validateArtifact(projected)).toEqual([]);
    expect(projected.quantities).toEqual(now.snapshot.artifact.quantities);
  });

  test('an old observed entry with rows is read from its fields', () => {
    const e = every().find(x => x.source === 'observatory');
    const t = id => (id.startsWith('led.') ? EN_REPORT[id] : id);
    const rows = observedRows(e.snapshot.observed, t);
    expect(rows.map(r => r[0])).toContain('Tool');
    expect(observedRows({ rows: [['a', 'b']] }, t)).toEqual([['a', 'b']]);
  });
});

describe('the student may change only their own words', () => {
  test('annotate leaves the snapshot, its envelope and its checksum alone', () => {
    const e = sim(SOURCE.RV_FIT);
    const n = annotate(e, { claim: 'my claim', title: 'mine' });
    expect(n.snapshot).toBe(e.snapshot);
    expect(n.fingerprint).toBe(e.fingerprint);
    expect(Object.isFrozen(n.snapshot.artifact.quantities[0])).toBe(true);
    expect(() => {
      'use strict';
      n.snapshot.artifact.quantities[0].value = 9;
    }).toThrow();
  });

  test('an edited envelope no longer matches its checksum', () => {
    const e = sim(SOURCE.RV_FIT);
    const raw = JSON.parse(JSON.stringify(e));
    raw.snapshot.artifact.quantities[0].value = 9;
    expect(reviveEntry(raw).tampered).toBe(true);
  });
});

describe('the ledger rows and digest', () => {
  test('one row per quantity, with the same numbers in both languages', async () => {
    const entries = every();
    await setLocale('en', { persist: false });
    const { t: te } = await import('../js/i18n/index.js');
    const en = evidenceRows(entries, te, 'en');
    await setLocale('es', { persist: false });
    const es = evidenceRows(entries, te, 'es');
    expect(en.length).toBe(es.length);
    expect(en.map(r => [r.value, r.unitId, r.half, r.origin])).toEqual(
      es.map(r => [r.value, r.unitId, r.half, r.origin])
    );
    expect(en.some(r => r.label !== es.find(x => x.id === r.id)?.label)).toBe(
      false
    );
    await setLocale('en', { persist: false });
  });

  test('the digest is stable and moves with any value', async () => {
    const entries = every();
    const a = await ledgerDigest(ledgerRecord(entries));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await ledgerDigest(ledgerRecord(entries))).toBe(a);
    const other = every();
    other[0] = sim(SOURCE.RV_FIT, {
      quantities: [quantity({ label: 'x', value: 1.0000001, unit: 'd' })],
    });
    expect(await ledgerDigest(ledgerRecord(other))).not.toBe(a);
  });

  test('a unit the registry does not know is carried as a warning, not guessed', () => {
    const env = deriveEnvelope({
      id: 'x',
      quantities: [
        { label: 'a', value: 1, unit: 'furlongs', kind: 'measured' },
      ],
    });
    expect(env.quantities[0].unit).toBeNull();
    expect(env.warnings).toContain('unit:q1:furlongs');
    expect(validateArtifact(env)).toEqual([]);
  });
});

describe('the report', () => {
  const text = bytes => new TextDecoder('latin1').decode(bytes);

  test('is tagged, prints the evidence table and states a digest, in both languages', async () => {
    const entries = every();
    for (const loc of ['en', 'es']) {
      await setLocale(loc, { persist: false });
      const out = text(await buildLedgerReport({ entries, locale: loc }));
      expect(out).toContain('/StructTreeRoot');
      expect(out).toContain('/MarkInfo');
      expect(out).toContain('/S /Table');
      expect(out).toContain('/S /TH');
      expect(out).toContain(
        loc === 'en' ? 'Evidence ledger' : 'Registro de evidencia'
      );
      expect(out).toContain('3.5247'.replace('.', loc === 'es' ? ',' : '.'));
    }
    await setLocale('en', { persist: false });
  });
});
