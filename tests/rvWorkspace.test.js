import {
  loadRecording,
  currentRecording,
  trialParameters,
  setTrial,
  snapToBestAtPeriod,
  runSearch,
  lastSearch,
  revealTruth,
  isRevealed,
  truthParameters,
  analysis,
  exportReport,
  resetWorkspace,
} from '../js/rvWorkspace.js';

const point = (day, rv, sigma = 1, quality = 'ok') => ({
  day,
  rv,
  sigma,
  quality,
  missed: quality === 'missed',
  // The noiseless value the survey also records. The workspace must not read
  // this to shortcut the fit, which is what one of the tests below checks.
  truth: rv,
});

/** A recording in the shape js/rvSurvey.js and the panel produce. */
function recording({
  period = 3.2,
  K = 45,
  gamma = 5,
  n = 24,
  step = 0.37,
} = {}) {
  const points = Array.from({ length: n }, (_, i) => {
    const day = i * step;
    return point(day, gamma + K * Math.sin((2 * Math.PI * day) / period), 2);
  });
  return {
    points,
    target: 'HD 209458',
    scenario: 'Exoplanet Characterization Lab',
    seed: 'probe',
    recordedAt: '2026-09-05T00:00:00Z',
    worldGeneration: 7,
    config: { cadenceDays: step, baselineDays: n * step, sigma: 2 },
    truth: { period, K, gamma, note: 'from the simulated orbit' },
  };
}

afterEach(resetWorkspace);

describe('loading a recording', () => {
  test('it starts from a guess, not from the answer', () => {
    // The single most important property of this panel. The truth is right
    // there in the recording; the opening state must not be it.
    const r = recording();
    loadRecording(r);
    const trial = trialParameters();
    expect(trial.period).not.toBeCloseTo(r.truth.period, 2);
    expect(trial.K).not.toBeCloseTo(r.truth.K, 2);
    expect(isRevealed()).toBe(false);
  });

  test('the guess is derived from the data, so it is at least in range', () => {
    loadRecording(recording({ K: 45, gamma: 5 }));
    const trial = trialParameters();
    // Half the peak-to-peak spread, and the midpoint: crude, visible, honest.
    expect(trial.K).toBeGreaterThan(20);
    expect(trial.K).toBeLessThan(70);
    expect(trial.gamma).toBeGreaterThan(-10);
    expect(trial.gamma).toBeLessThan(20);
    expect(trial.period).toBeGreaterThan(0);
  });

  test('an empty recording leaves the workspace with nothing to say', () => {
    loadRecording({ points: [] });
    expect(analysis()).toBeNull();
    expect(exportReport()).toBeNull();
  });

  test('loading a second recording forgets the first, reveal included', () => {
    loadRecording(recording());
    revealTruth();
    expect(isRevealed()).toBe(true);
    loadRecording(recording({ period: 9 }));
    expect(isRevealed()).toBe(false);
    expect(lastSearch()).toBeNull();
  });
});

describe('adjusting parameters by hand', () => {
  test('each one moves independently', () => {
    loadRecording(recording());
    setTrial('period', 4.5);
    setTrial('K', 33);
    setTrial('phase', 1.2);
    setTrial('gamma', -8);
    expect(trialParameters()).toEqual({
      period: 4.5,
      K: 33,
      phase: 1.2,
      gamma: -8,
    });
  });

  test('a nonsense value is ignored rather than propagated', () => {
    loadRecording(recording());
    const before = trialParameters();
    setTrial('period', NaN);
    setTrial('nonsense', 5);
    setTrial('K', Infinity);
    expect(trialParameters()).toEqual(before);
  });

  test('the period cannot be dragged to zero', () => {
    loadRecording(recording());
    setTrial('period', -3);
    expect(trialParameters().period).toBeGreaterThan(0);
  });

  test('the chi-square reported is of what is dialled in, not of the best fit', () => {
    loadRecording(recording({ period: 3.2 }));
    setTrial('period', 3.2);
    setTrial('K', 1); // deliberately wrong amplitude
    const a = analysis();
    // atTrial is the best fit AT that period, which the panel labels as such;
    // the residuals are of the student's actual curve.
    expect(a.trial.K).toBe(1);
    expect(a.folded.some(f => Math.abs(f.residual) > 10)).toBe(true);
  });
});

describe('the two kinds of help', () => {
  test('snapping fixes amplitude, phase and offset but leaves the period alone', () => {
    loadRecording(recording({ period: 3.2, K: 45, gamma: 5 }));
    setTrial('period', 3.2);
    const fit = snapToBestAtPeriod();
    expect(fit).not.toBeNull();
    const trial = trialParameters();
    expect(trial.period).toBeCloseTo(3.2, 9);
    expect(trial.K).toBeCloseTo(45, 6);
    expect(trial.gamma).toBeCloseTo(5, 6);
  });

  test('the search needs bounds and refuses without them', () => {
    loadRecording(recording());
    expect(runSearch({})).toBeNull();
    expect(runSearch({ minPeriod: 5, maxPeriod: 1 })).toBeNull();
    expect(lastSearch()).toBeNull();
  });

  test('a bounded search adopts its best fit and keeps the whole curve', () => {
    loadRecording(recording({ period: 3.2, K: 45 }));
    const s = runSearch({ minPeriod: 1.5, maxPeriod: 8 });
    expect(s.bestPeriod).toBeCloseTo(3.2, 1);
    expect(trialParameters().period).toBeCloseTo(s.bestPeriod, 9);
    expect(s.grid.length).toBeGreaterThan(100);
    expect(s.minima.length).toBeGreaterThan(0);
    expect(lastSearch()).toBe(s);
  });

  test('the search never reports outside the bounds it was given', () => {
    loadRecording(recording());
    const s = runSearch({ minPeriod: 2, maxPeriod: 5 });
    expect(s.bestPeriod).toBeGreaterThanOrEqual(2);
    expect(s.bestPeriod).toBeLessThanOrEqual(5);
    for (const m of s.minima) {
      expect(m.period).toBeGreaterThanOrEqual(2 - 1e-9);
      expect(m.period).toBeLessThanOrEqual(5 + 1e-9);
    }
  });
});

describe('the truth stays hidden until it is asked for', () => {
  test('analysis carries no truth before the reveal', () => {
    loadRecording(recording());
    const a = analysis();
    expect(a.revealed).toBe(false);
    expect(a.truth).toBeNull();
    // And nothing about the generating parameters leaks through the payload.
    expect(JSON.stringify(a)).not.toMatch(/from the simulated orbit/);
  });

  test('the export says whether it was looked at', () => {
    loadRecording(recording());
    expect(exportReport().truthRevealed).toBe(false);
    expect(exportReport().truth).toBeNull();
    revealTruth();
    expect(exportReport().truthRevealed).toBe(true);
    expect(exportReport().truth.period).toBeCloseTo(3.2, 9);
  });

  test('revealing returns the generating parameters', () => {
    const r = recording({ period: 7.1, K: 22, gamma: -3 });
    loadRecording(r);
    const truth = revealTruth();
    expect(truth.period).toBeCloseTo(7.1, 9);
    expect(truth.K).toBeCloseTo(22, 9);
    expect(truth.gamma).toBeCloseTo(-3, 9);
  });

  test('a recording with no known truth has nothing to reveal, and says so', () => {
    // A run against a real signal, or one whose provenance was lost. The right
    // answer is null rather than a number reconstructed from the noiseless
    // column, which would be a guess wearing the word "truth".
    const r = recording();
    delete r.truth;
    loadRecording(r);
    expect(truthParameters()).toBeNull();
    expect(revealTruth()).toBeNull();
    expect(isRevealed()).toBe(true);
  });
});

describe('the export', () => {
  test('it carries the parameters, the assumptions and every residual', () => {
    loadRecording(recording({ n: 18 }));
    const out = exportReport();
    expect(out.parameters).toHaveProperty('period');
    expect(out.parameters).toHaveProperty('K');
    expect(out.parameters).toHaveProperty('phase');
    expect(out.parameters).toHaveProperty('gamma');
    expect(out.assumptions.join(' ')).toMatch(/circular/i);
    expect(out.residuals).toHaveLength(18);
    expect(out.residuals[0]).toHaveProperty('residual');
    expect(out.residuals[0]).toHaveProperty('sigma');
  });

  test('it carries enough provenance to reproduce the recording', () => {
    loadRecording(recording());
    const out = exportReport();
    expect(out.recording).toMatchObject({
      target: 'HD 209458',
      scenario: 'Exoplanet Characterization Lab',
      seed: 'probe',
      worldGeneration: 7,
    });
    expect(out.recording.cadenceDays).toBeGreaterThan(0);
    expect(out.recording.sigma).toBe(2);
    expect(out.recording.plannedEpochs).toBe(24);
  });

  test('it includes the search bounds when a search was run', () => {
    loadRecording(recording());
    runSearch({ minPeriod: 1, maxPeriod: 10 });
    const out = exportReport();
    expect(out.search.bounds).toEqual({ minPeriod: 1, maxPeriod: 10 });
    expect(out.search.minima.length).toBeGreaterThan(0);
  });

  test('nothing in it claims a detection or a significance', () => {
    loadRecording(recording());
    runSearch({ minPeriod: 1, maxPeriod: 10 });
    revealTruth();
    const text = JSON.stringify(exportReport()).toLowerCase();
    expect(text).not.toMatch(/detect/);
    expect(text).not.toMatch(/significan/);
    expect(text).not.toMatch(/confidence/);
  });
});

describe('recordings that are hard to analyse', () => {
  test('missed epochs are excluded and reported, not fitted', () => {
    const r = recording({ n: 12 });
    r.points[3] = {
      day: 3 * 0.37,
      rv: null,
      sigma: null,
      quality: 'missed',
      missed: true,
    };
    loadRecording(r);
    const a = analysis();
    expect(a.used).toBe(11);
    expect(a.excluded.missed).toBe(1);
    expect(a.folded).toHaveLength(11);
  });

  test('fewer than three usable points is refused rather than fitted', () => {
    loadRecording({
      points: [point(0, 1), point(1, 2)],
      truth: { period: 3, K: 1, gamma: 0 },
    });
    const a = analysis();
    expect(a.tooFew).toBe(true);
    expect(a.used).toBe(2);
  });

  test('zero-uncertainty data fits, and says the chi-square is not one', () => {
    const r = recording();
    r.points = r.points.map(p => ({ ...p, sigma: 0 }));
    loadRecording(r);
    setTrial('period', 3.2);
    snapToBestAtPeriod();
    const a = analysis();
    expect(a.atTrial.weighting).toBe('uniform');
    expect(a.atTrial.reducedChi2).toBeNull();
    expect(a.atTrial.rms).toBeLessThan(1e-6);
  });

  test('the recording is retrievable for the panel to describe', () => {
    const r = recording();
    loadRecording(r);
    expect(currentRecording()).toBe(r);
  });
});
