import { describe, test, expect } from '@jest/globals';

// =============================================================================
// The notebook keeps fits, analyses and experiment results as envelopes
// (Roadmap II, Prompt 66, step 2)
// -----------------------------------------------------------------------------
// One capture per result kind: the entry is a notebook entry whose snapshot
// carries a gravitas.artifact/1 envelope with the digest of the data it was
// made from; the entry round-trips through the notebook file and its schema;
// its fingerprint covers the envelope; and the evidence report and the panel
// cite it by that digest, in both languages.
// =============================================================================

import { readFileSync } from 'node:fs';
import { valid } from './jsonSchemaSubset.js';
import { registerMessages } from '../js/i18n/index.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import { ES_DEFERRED } from '../js/i18n/es.deferred.js';
import {
  SOURCE,
  SOURCES,
  reviveEntry,
  validateEntry,
} from '../js/notebook/entry.js';
import {
  buildBackup,
  restoreBackup,
  validateBackup,
} from '../js/notebook/notebook.js';
import * as store from '../js/notebook/store.js';

registerMessages('en', EN_DEFERRED);
registerMessages('es', ES_DEFERRED);

const S = await import('../js/analysis/seams.js');
const A = await import('../js/analysis/sweepAnalysis.js');
const E = await import('../js/notebook/artifactEntry.js');
const { buildEvidenceReport } = await import('../js/notebook/report.js');
const { validateArtifact } = await import('../js/platform/artifact.js');
const { METRIC_UNITS } = await import('../js/experiments/metrics.js');
const { result, fitDocument, clone } =
  await import('./analysisSeamsFixtures.js');

const asText = bytes => String.fromCharCode(...bytes);
const at = 1_800_000_000_000;

/** One entry of each result kind, as the panels capture them. */
async function captures() {
  const r = result();
  const a = await A.analyzeSweep(r, {
    metric: 'orbital_period',
    resamples: 200,
    permutations: 199,
  });
  const { doc, data } = fitDocument();
  const units = { metricUnits: METRIC_UNITS };
  return {
    experiment: {
      digest: S.trialsDigest(r),
      entry: E.artifactEntry({
        source: SOURCE.EXPERIMENT_RESULT,
        envelope: S.experimentArtifact(r, {
          ...units,
          metrics: ['orbital_period'],
        }),
        title: 'Kepler check',
        capturedAt: at,
      }),
    },
    analysis: {
      digest: a.consumed[0].digest,
      entry: E.artifactEntry({
        source: SOURCE.SWEEP_ANALYSIS,
        envelope: S.analysisArtifact(a, units),
        title: 'Period against mass',
        capturedAt: at,
      }),
    },
    fit: {
      digest: S.rowsDigest(data),
      entry: E.artifactEntry({
        source: SOURCE.INFERENCE_FIT,
        envelope: S.fitArtifact(doc, {
          digest: S.rowsDigest(data),
          units: { x: 'd', y: 'm/s' },
        }),
        title: 'An orbit',
        capturedAt: at,
      }),
    },
  };
}

describe('a capture for each kind of result', () => {
  test('is a notebook entry that names its source and carries the envelope', async () => {
    const all = await captures();
    for (const [kind, source] of [
      ['experiment', 'experiment-result'],
      ['analysis', 'sweep-analysis'],
      ['fit', 'inference-fit'],
    ]) {
      const { entry, digest } = all[kind];
      expect(SOURCES).toContain(source);
      expect(entry.source).toBe(source);
      expect(validateArtifact(entry.snapshot.artifact)).toEqual([]);
      expect(entry.snapshot.artifact.source.digest).toBe(digest);
      expect(digest).toMatch(/^[0-9a-f]{8}$/);
      expect(entry.snapshot.quantities.length).toBeGreaterThan(0);
      expect(Object.isFrozen(entry.snapshot.artifact)).toBe(true);
      // The simulation's own conditions are not claimed for it.
      expect(entry.snapshot.provenance.scenario).toBeNull();
    }
    expect(
      all.fit.entry.snapshot.quantities.find(q => q.label === 'P')
    ).toMatchObject({
      unit: 'd',
      kind: 'measured',
      note: 'fitted',
    });
  });

  test('keeps an interval as plus or minus, and a fixed number without one', async () => {
    const { fit, experiment } = await captures();
    const q = experiment.entry.snapshot.quantities[0];
    expect(q.uncertainty).toBeGreaterThan(0);
    const fixed = fit.entry.snapshot.quantities.find(
      x => x.label === 'sqrtEcosw'
    );
    expect(fixed.uncertainty).toBeNull();
  });

  test('its fingerprint covers the envelope, so a changed digest is a changed entry', async () => {
    const { experiment } = await captures();
    const env = clone(experiment.entry.snapshot.artifact);
    env.source.digest = '00000000';
    const other = E.artifactEntry({
      source: SOURCE.EXPERIMENT_RESULT,
      envelope: env,
      title: 'Kepler check',
      capturedAt: at,
    });
    expect(other.fingerprint).not.toBe(experiment.entry.fingerprint);
  });

  test('is trimmed to the entry’s own limit, and says how much it left out', async () => {
    const big = result();
    const env = S.experimentArtifact(big, { metricUnits: METRIC_UNITS });
    const more = {
      ...env,
      quantities: [
        ...env.quantities,
        ...env.quantities.map(q => ({ ...q, id: `${q.id}#2` })),
        ...env.quantities.map(q => ({ ...q, id: `${q.id}#3` })),
      ],
    };
    expect(more.quantities.length).toBeGreaterThan(40);
    const e = E.artifactEntry({
      source: SOURCE.EXPERIMENT_RESULT,
      envelope: more,
      title: 'many',
    });
    expect(e.snapshot.quantities).toHaveLength(40);
    expect(e.snapshot.artifact.quantities).toHaveLength(40);
    expect(e.snapshot.artifact.warnings.at(-1)).toBe(
      `truncated:${more.quantities.length - 40}`
    );
    // Headline numbers first: every mean is kept before any spread or count.
    const isMean = q => !/\.(sd|n)\|/.test(q.id);
    expect(e.snapshot.artifact.quantities.filter(isMean)).toHaveLength(
      more.quantities.filter(isMean).length
    );
  });

  test('refuses what is not an envelope, and an envelope that cites no digest', async () => {
    const { experiment } = await captures();
    expect(() =>
      E.artifactEntry({
        source: SOURCE.INFERENCE_FIT,
        envelope: { format: 'x' },
        title: 't',
      })
    ).toThrow(/not an envelope/);
    const env = clone(experiment.entry.snapshot.artifact);
    delete env.source.digest;
    expect(() =>
      E.artifactEntry({
        source: SOURCE.EXPERIMENT_RESULT,
        envelope: env,
        title: 't',
      })
    ).toThrow(/digest/);
  });
});

describe('kept in the notebook and in its file', () => {
  test('survives a write to the store, a backup and a restore, unaltered', async () => {
    const all = await captures();
    const entries = Object.values(all).map(x => x.entry);
    const backing = new Map();
    store.setBackend({
      getItem: k => backing.get(k) ?? null,
      setItem: (k, v) => backing.set(k, String(v)),
      removeItem: k => backing.delete(k),
    });
    expect(store.save(entries)).toMatchObject({ ok: true });
    const loaded = store.load();
    expect(loaded.entries.map(e => e.snapshot.artifact.source.digest)).toEqual(
      Object.values(all).map(x => x.digest)
    );
    const file = clone(buildBackup({ entries, revision: 'abc' }));
    expect(validateBackup(file)).toEqual({ ok: true, reason: '' });
    const back = restoreBackup(file);
    expect(back.tampered).toBe(0);
    for (const [i, e] of entries.entries()) {
      expect(back.entries[i].snapshot.artifact).toEqual(e.snapshot.artifact);
      expect(reviveEntry(clone(e)).tampered).toBeUndefined();
      expect(validateEntry(clone(e)).ok).toBe(true);
    }
    const schema = JSON.parse(
      readFileSync('sdk/schemas/evidence-notebook-1.schema.json', 'utf8')
    );
    expect(valid(schema, file)).toBe(true);
    // An envelope edited by hand is caught by the checksum.
    const edited = clone(file);
    edited.entries[0].snapshot.artifact.source.digest = '00000000';
    expect(restoreBackup(edited).tampered).toBe(1);
    store.setBackend(null);
  });
});

describe('cited by the report and the panel', () => {
  test('the report names each result’s source and digest, in English', async () => {
    const all = await captures();
    const text = asText(
      buildEvidenceReport({
        entries: Object.values(all).map(x => x.entry),
        revision: 'x',
      })
    );
    expect(text).toContain(EN_DEFERRED['nb.entry.cite']);
    expect(text).not.toContain(EN_DEFERRED['nb.report.conditions']);
    for (const x of Object.values(all)) expect(text).toContain(x.digest);
    expect(text).toContain(EN_DEFERRED['nb.source.experiment-result']);
    expect(text).toContain(EN_DEFERRED['nb.source.sweep-analysis']);
    expect(text).toContain(EN_DEFERRED['nb.source.inference-fit']);
    expect(text).toContain('3f2a1c9b');
    expect(text).toContain('aaaa0000');
  });

  test('the same rows are made in Spanish, from the same envelope', async () => {
    const { experiment } = await captures();
    const say =
      catalog =>
      (id, vars = {}) =>
        (catalog[id] ?? id).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
    const env = experiment.entry.snapshot.artifact;
    const en = E.citationRows(env, say(EN_DEFERRED));
    const es = E.citationRows(env, say(ES_DEFERRED));
    expect(es.map(r => r[0])).not.toEqual(en.map(r => r[0]));
    // The identifying values are data, and are the same in both.
    expect(es.map(r => r[1]).slice(0, 4)).toEqual(
      en.map(r => r[1]).slice(0, 4)
    );
    expect(es.at(-1)[1]).toContain(experiment.digest);
    for (const [label] of es) expect(label).not.toMatch(/^nb\./);
  });

  test('every string the entry uses is in both catalogs', () => {
    for (const k of Object.keys(EN_DEFERRED).filter(k =>
      /^nb\.(cite\.|source\.(inference-fit|sweep-analysis|experiment-result)|entry\.cite)/.test(
        k
      )
    ))
      expect(ES_DEFERRED[k]).toEqual(expect.any(String));
  });
});
