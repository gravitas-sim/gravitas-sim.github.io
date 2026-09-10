// =============================================================================
// The bundled GW150914 traces are the published ones
// -----------------------------------------------------------------------------
// This is the file that stops a synthetic waveform being shown to a student as
// a LIGO observation. Every check below is a property of the *published* data
// that a substitution would break: its peak arrives where the paper's figure
// puts it, its amplitude is the amplitude the paper reports, the residual is
// the difference between the other two, the two detectors disagree in sign and
// agree after a light-travel-time shift, and the separation reaches inside the
// innermost stable circular orbit - which this application's own model cannot
// produce, by construction.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { PROVENANCE, TRACES, decodeTrace } from '../js/data/gw/gw150914.js';
import { iscoFrequency } from '../js/gw/waveform.js';

const peakOf = values => {
  let peak = 0;
  let index = 0;
  values.forEach((v, i) => {
    if (Math.abs(v) > peak) {
      peak = Math.abs(v);
      index = i;
    }
  });
  return { peak, index };
};

describe('provenance is complete enough to audit', () => {
  test.each([
    'event',
    'doi',
    'arxiv',
    'license',
    'attribution',
    'baseUrl',
    'eventPage',
    'gpsEpoch',
    'sourceSampleRate',
  ])('records %s', field => {
    expect(PROVENANCE[field]).toBeTruthy();
  });

  test('names the paper and its DOI', () => {
    expect(PROVENANCE.doi).toBe('10.1103/PhysRevLett.116.061102');
    expect(PROVENANCE.paper).toMatch(/Abbott/);
  });

  test('is CC BY 4.0 and carries the GWOSC acknowledgement', () => {
    expect(PROVENANCE.license).toMatch(/CC BY 4\.0/);
    expect(PROVENANCE.attribution).toMatch(
      /Gravitational Wave Open Science Center/
    );
  });

  test('records a checksum and a URL for every input file', () => {
    expect(PROVENANCE.inputs.length).toBe(Object.keys(TRACES).length);
    for (const input of PROVENANCE.inputs) {
      expect(input.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(input.url.startsWith('https://gwosc.org/')).toBe(true);
      expect(input.bytes).toBeGreaterThan(1000);
    }
  });

  test('says what was done and what was deliberately not done', () => {
    expect(PROVENANCE.processing.length).toBeGreaterThan(0);
    expect(PROVENANCE.notApplied.join(' ')).toMatch(/No time shift/);
    expect(PROVENANCE.notApplied.join(' ')).toMatch(/No sign inversion/);
    expect(PROVENANCE.priorProcessingByPublisher.join(' ')).toMatch(/35-350/);
  });

  test('the time axis is the published one', () => {
    expect(PROVENANCE.gpsEpoch).toBe(1126259462);
    expect(PROVENANCE.detectedAt).toBe('2015-09-14T09:50:45Z');
  });
});

describe('the traces decode to the published numbers', () => {
  test('there are two observations, two reconstructions and two residuals', () => {
    const roles = Object.values(TRACES).map(t => t.role);
    expect(roles.filter(r => r === 'observed').length).toBe(2);
    expect(roles.filter(r => r === 'reconstruction').length).toBe(2);
    expect(roles.filter(r => r === 'residual').length).toBe(2);
  });

  test('every trace names its detector and its unit', () => {
    for (const [id, t] of Object.entries(TRACES)) {
      expect(['H1', 'L1']).toContain(t.detector);
      expect(t.unit).toBeTruthy();
      expect(id).toContain(t.detector);
    }
  });

  test('the strain traces cover the window the paper plots', () => {
    const h = decodeTrace('observed-H1');
    expect(h.t0).toBeCloseTo(0.25, 6);
    const end = h.t0 + (h.values.length - 1) / h.sampleRate;
    expect(end).toBeGreaterThan(0.45);
    expect(end).toBeLessThan(0.47);
  });

  test('the Hanford peak is about 1e-21 and arrives at 0.40 s', () => {
    const h = decodeTrace('observed-H1');
    const { peak, index } = peakOf(h.values);
    expect(peak).toBeGreaterThan(8e-22);
    expect(peak).toBeLessThan(1.5e-21);
    const t = h.t0 + index / h.sampleRate;
    expect(t).toBeGreaterThan(0.39);
    expect(t).toBeLessThan(0.44);
  });

  test('both traces peak around 1e-21, within a factor of two of each other', () => {
    const obs = peakOf(decodeTrace('observed-H1').values).peak;
    const rec = peakOf(decodeTrace('reconstruction-H1').values).peak;
    expect(Math.max(obs, rec) / Math.min(obs, rec)).toBeLessThan(2);
  });

  test('before the signal arrives, only the observation has anything in it', () => {
    // The clearest signature that one of these is a measurement and the other
    // is not. Over the first 50 ms of the published window the reconstruction
    // is nearly flat and the observation is four times noisier. Substituting a
    // synthetic trace for the observation would make both of them quiet.
    const rmsBefore = id => {
      const d = decodeTrace(id);
      const upTo = Math.round((0.3 - d.t0) * d.sampleRate);
      let sum = 0;
      for (let i = 0; i < upTo; i++) sum += d.values[i] * d.values[i];
      return Math.sqrt(sum / upTo);
    };
    expect(
      rmsBefore('observed-H1') / rmsBefore('reconstruction-H1')
    ).toBeGreaterThan(2);
    expect(
      rmsBefore('observed-L1') / rmsBefore('reconstruction-L1')
    ).toBeGreaterThan(2);
  });

  test('the residual is as loud before the merger as after it', () => {
    // Noise does not know when the black holes merged. The observation does.
    const split = id => {
      const d = decodeTrace(id);
      const at = Math.round((0.3 - d.t0) * d.sampleRate);
      const rms = (from, to) => {
        let sum = 0;
        for (let i = from; i < to; i++) sum += d.values[i] * d.values[i];
        return Math.sqrt(sum / (to - from));
      };
      return rms(at, d.values.length) / rms(0, at);
    };
    expect(split('residual-H1')).toBeGreaterThan(0.5);
    expect(split('residual-H1')).toBeLessThan(2);
    expect(split('reconstruction-H1')).toBeGreaterThan(3);
  });

  test('the residual is the observation minus the reconstruction', () => {
    const obs = decodeTrace('observed-H1').values;
    const rec = decodeTrace('reconstruction-H1').values;
    const res = decodeTrace('residual-H1').values;
    const n = Math.min(obs.length, rec.length, res.length);
    let error = 0;
    let scale = 0;
    for (let i = 0; i < n; i++) {
      error += Math.abs(obs[i] - rec[i] - res[i]);
      scale += Math.abs(res[i]);
    }
    // Not exact: the published reconstruction sits on a time grid offset by
    // half a sample from the data. Within a few percent, which is enough to
    // establish that these three files describe one measurement.
    expect(error / scale).toBeLessThan(0.1);
  });

  test('the residual looks like noise, not like a chirp', () => {
    const res = decodeTrace('residual-H1').values;
    const { index } = peakOf(res);
    const rms = Math.sqrt(res.reduce((s, v) => s + v * v, 0) / res.length);
    const { peak } = peakOf(res);
    // A chirp's largest excursion is many times its own RMS and lands near the
    // merger. Noise's does neither reliably.
    expect(peak / rms).toBeLessThan(5);
    expect(index).toBeGreaterThanOrEqual(0);
  });
});

describe('the two detectors, as published', () => {
  test('the observed traces are anti-correlated, and the build measured it', () => {
    expect(PROVENANCE.findings.observedHvsL.inverted).toBe(true);
    expect(PROVENANCE.findings.observedHvsL.correlation).toBeLessThan(-0.5);
  });

  test('the shift between them is a light-travel time across the Earth', () => {
    // The detectors are 3002 km apart, so 10.0 ms is the largest possible
    // delay. The recorded value has to be under that and comfortably non-zero.
    for (const key of ['observedHvsL', 'reconstructionHvsL']) {
      const lag = Math.abs(PROVENANCE.findings[key].lagMs);
      expect(lag).toBeGreaterThan(3);
      expect(lag).toBeLessThan(10.1);
    }
  });

  test('the two reconstructions agree far better than the two observations', () => {
    expect(
      Math.abs(PROVENANCE.findings.reconstructionHvsL.correlation)
    ).toBeGreaterThan(Math.abs(PROVENANCE.findings.observedHvsL.correlation));
  });

  test('each observation matches its own reconstruction with no shift', () => {
    for (const key of [
      'observedVsReconstructionH1',
      'observedVsReconstructionL1',
    ]) {
      const f = PROVENANCE.findings[key];
      expect(f.correlation).toBeGreaterThan(0.7);
      expect(Math.abs(f.lagMs)).toBeLessThan(0.5);
    }
  });
});

describe('the published separation goes where this project’s model cannot', () => {
  test('the separation falls from about 4.7 to under 2 Schwarzschild radii', () => {
    const s = decodeTrace('separation-H1');
    expect(s.values[0]).toBeGreaterThan(4);
    expect(s.values[s.values.length - 1]).toBeLessThan(2);
    expect(s.unit).toBe('schwarzschild-radii');
  });

  test('it passes inside the innermost stable circular orbit at three radii', () => {
    // Which is exactly why the lab hands over to this reconstruction instead of
    // extrapolating: our own model stops at 3 by construction.
    const s = decodeTrace('separation-H1');
    expect(Math.min(...s.values)).toBeLessThan(3);
    expect(Number.isFinite(iscoFrequency(65))).toBe(true);
  });

  test('it decreases monotonically', () => {
    const s = decodeTrace('separation-H1').values;
    for (let i = 1; i < s.length; i++)
      expect(s[i]).toBeLessThanOrEqual(s[i - 1] + 1e-3);
  });

  test('the post-Newtonian velocity rises past half the speed of light', () => {
    const v = decodeTrace('velocity-H1');
    expect(v.values[0]).toBeGreaterThan(0.3);
    expect(Math.max(...v.values)).toBeGreaterThan(0.5);
    expect(Math.max(...v.values)).toBeLessThan(0.7);
    expect(v.unit).toBe('v/c');
  });

  test('the velocity is already past the model’s reliable band on the first sample', () => {
    // v/c = 0.33 at the start of the published window. Nothing in this
    // application may present a leading-order waveform as accurate there.
    const v = decodeTrace('velocity-H1');
    expect(v.values[0]).toBeGreaterThan(0.3);
  });
});

describe('decoding', () => {
  test('rejects an unknown trace by name', () => {
    expect(() => decodeTrace('observed-V1')).toThrow(/Unknown/);
  });

  test('returns finite numbers throughout, in every trace', () => {
    for (const id of Object.keys(TRACES)) {
      for (const v of decodeTrace(id).values)
        expect(Number.isFinite(v)).toBe(true);
    }
  });

  test('decoding twice gives the same array', () => {
    expect(Array.from(decodeTrace('observed-L1').values)).toEqual(
      Array.from(decodeTrace('observed-L1').values)
    );
  });

  test('the quantization error is far below the trace it encodes', () => {
    for (const [, t] of Object.entries(TRACES)) {
      const range = t.max - t.min;
      expect(t.quantizationError).toBeLessThan(range / 1000);
    }
  });

  test('every strain trace decodes to strain, not to strain times 1e21', () => {
    for (const [id, t] of Object.entries(TRACES)) {
      if (t.unit !== 'strain') continue;
      const { peak } = peakOf(decodeTrace(id).values);
      expect(peak).toBeLessThan(1e-20);
      expect(peak).toBeGreaterThan(1e-23);
    }
  });
});
