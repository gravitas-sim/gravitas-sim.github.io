import { describe, test, expect } from '@jest/globals';
import {
  MANIFEST_VERSION,
  experimentCsv,
  experimentManifest,
  experimentManifestJson,
  exportBasename,
  importManifest,
} from '../js/experiments/exports.js';
import { METRICS } from '../js/experiments/metrics.js';

// The two files are what leaves the browser, so these read them the way a
// student's spreadsheet and a marker's eye would.

const experiment = () => ({
  id: 'x9',
  name: 'Gravity doubled',
  created: 1700000000000,
  notes: 'Does a heavier G shrink the orbit?',
  objects: [1, 2],
  primary: 1,
  metrics: [METRICS.SEPARATION, METRICS.ENERGY_DRIFT, METRICS.ORBITAL_PERIOD],
  initialState: { v: 1, s: 'Binary BH', seed: '2a' },
  provenance: {
    scenario: 'Binary BH',
    seed: '2a',
    integrator: 'Symplectic Euler',
    timestep: 0,
    simSpeed: 1,
    units: { length: 'AU', speed: 'km/s', time: 'days' },
    initialStateHash: 'deadbeef',
    referenceFrame: { mode: 'world', objectId: null },
    observer: { positionAngle: 0, inclination: 90 },
  },
  diff: {
    variables: [{ key: 'gravitational_constant', from: 1, to: 2 }],
    incidental: [],
    context: [],
    multivariable: false,
  },
  multivariableConfirmed: false,
  runs: {
    A: {
      recordedAt: 1700000001000,
      samples: [
        { t: 0, separation: 2, energy_drift: 0 },
        { t: 1, separation: 3, energy_drift: 0.01 },
      ],
      results: { separation: { value: 2.5, kind: 'mean' } },
    },
    B: {
      recordedAt: 1700000002000,
      samples: [
        { t: 0, separation: 1, energy_drift: 0 },
        { t: 1, separation: 1.5, energy_drift: 0.02 },
      ],
      results: { separation: { value: 1.25, kind: 'mean' } },
    },
  },
  comparison: { rows: [], diff: {}, warnings: [] },
});

describe('the combined CSV', () => {
  test('names the run and puts the unit in every column', () => {
    const { csv } = experimentCsv(experiment());
    const [header] = csv.split('\r\n');
    expect(header).toBe('experiment,run,t_days,separation_au,energy_drift_pct');
  });

  test('carries both runs, identified', () => {
    const { csv, rows } = experimentCsv(experiment());
    const lines = csv.trim().split('\r\n');
    expect(rows).toBe(4);
    expect(lines.filter(l => l.includes(',A,')).length).toBe(2);
    expect(lines.filter(l => l.includes(',B,')).length).toBe(2);
  });

  test('leaves out scalar metrics, which have no per-sample value', () => {
    const { csv } = experimentCsv(experiment());
    expect(csv).not.toContain('orbital_period');
  });

  test('a value the run did not record is an empty field, not a zero', () => {
    const exp = experiment();
    delete exp.runs.A.samples[0].separation;
    const { csv } = experimentCsv(exp);
    const firstRow = csv.split('\r\n')[1];
    expect(firstRow).toBe('Gravity doubled,A,0,,0');
  });

  test('a name that looks like a formula cannot become one', () => {
    const exp = experiment();
    exp.name = '=cmd|calc';
    const { csv } = experimentCsv(exp);
    expect(csv.split('\r\n')[1].startsWith('=')).toBe(false);
  });

  test('stops at the row cap and says so', () => {
    const exp = experiment();
    exp.runs.A.samples = Array.from({ length: 500 }, (_, i) => ({
      t: i,
      separation: i,
    }));
    const { rows, truncated } = experimentCsv(exp, { maxRows: 50 });
    expect(truncated).toBe(true);
    expect(rows).toBeLessThanOrEqual(51);
  });
});

describe('the JSON manifest', () => {
  test('carries the provenance a repeat needs', () => {
    const m = experimentManifest(experiment(), { appVersion: '2026.09.3' });
    expect(m.format).toBe('gravitas-experiment');
    expect(m.version).toBe(MANIFEST_VERSION);
    expect(m.app.version).toBe('2026.09.3');
    expect(m.provenance).toMatchObject({
      scenario: 'Binary BH',
      seed: '2a',
      integrator: 'Symplectic Euler',
      initialStateHash: 'deadbeef',
    });
    expect(m.provenance.units).toEqual({
      length: 'AU',
      speed: 'km/s',
      time: 'days',
    });
  });

  test('carries the selection and the parameter change', () => {
    const m = experimentManifest(experiment());
    expect(m.selection.objects).toEqual([1, 2]);
    expect(m.selection.metrics).toContain(METRICS.SEPARATION);
    expect(m.parameterChange.variables[0].key).toBe('gravitational_constant');
    expect(m.parameterChange.multivariable).toBe(false);
  });

  test('summarises the runs without carrying their samples', () => {
    const text = experimentManifestJson(experiment());
    expect(text).not.toContain('"samples": [');
    const m = JSON.parse(text);
    const a = m.runs.find(r => r.run === 'A');
    expect(a.samples).toBe(2);
    expect(a.simulatedSeconds).toBe(1);
  });

  test('carries the initial state, so the setup reproduces from the file alone', () => {
    const m = experimentManifest(experiment());
    expect(m.initialState).toEqual({ v: 1, s: 'Binary BH', seed: '2a' });
  });

  test('is stable, so two exports of one experiment diff cleanly', () => {
    const exp = experiment();
    const a = experimentManifestJson(exp).replace(/"exported":.*/, '');
    const shuffled = JSON.parse(JSON.stringify(exp));
    const b = experimentManifestJson(shuffled).replace(/"exported":.*/, '');
    expect(a).toBe(b);
  });

  test('a filename stem is safe and recognisable', () => {
    expect(exportBasename({ name: 'Gravity doubled!' })).toBe(
      'gravitas-gravity-doubled'
    );
    expect(exportBasename({ name: '' })).toBe('gravitas-experiment');
    expect(exportBasename({ name: '../../etc/passwd' })).toBe(
      'gravitas-etc-passwd'
    );
  });
});

describe('reopening an exported manifest', () => {
  test('restores the definition and the setup', () => {
    const text = experimentManifestJson(experiment());
    const { ok, experiment: back } = importManifest(text);
    expect(ok).toBe(true);
    expect(back.name).toBe('Gravity doubled');
    expect(back.metrics).toContain(METRICS.SEPARATION);
    expect(back.initialState).toEqual({ v: 1, s: 'Binary BH', seed: '2a' });
    expect(back.provenance.initialStateHash).toBe('deadbeef');
  });

  test('does not restore results, because the file does not carry them', () => {
    const { experiment: back } = importManifest(
      experimentManifestJson(experiment())
    );
    expect(back.runs).toEqual({});
  });

  test('refuses a file that is not an experiment', () => {
    expect(importManifest('{"format":"something-else"}').ok).toBe(false);
    expect(importManifest('not json at all').reason).toBe('not-json');
  });

  test('refuses a manifest from a newer version rather than misreading it', () => {
    const text = JSON.stringify({
      format: 'gravitas-experiment',
      version: MANIFEST_VERSION + 1,
    });
    expect(importManifest(text).reason).toBe('from-a-newer-version');
  });
});
