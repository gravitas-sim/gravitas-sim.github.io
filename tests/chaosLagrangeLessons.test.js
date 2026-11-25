// The butterfly lesson's captured readings and the Lagrange lesson's one
// prediction per idea, its nudge test and what it leaves unsaid before them.
// The physics of the nudge test is checked through the engine in
// e2e/cr3bp.spec.js and e2e/centralExperiments.spec.js.

import { INVESTIGATIONS } from '../js/data/investigations.js';
import { mergeTranslation } from '../js/data/investigations/i18n.js';
import ES_LAGRANGE from '../js/data/investigations/es/lagrange-points.js';
import { readProgress } from '../js/investigations/progressSchema.js';
import { earlierAnswers, wasIn } from '../js/investigations/stepView.js';
import { CHAOS_WIDGETS } from '../js/chaosWidgets.js';

const lesson = id => INVESTIGATIONS.find(l => l.id === id);
const LAGRANGE = lesson('lagrange-points');
const BUTTERFLY = lesson('butterfly-effect');
const at = (l, sid) => l.steps.findIndex(s => s.sid === sid);
const step = (l, sid) => l.steps.find(s => s.sid === sid);
const plain = s => String(s ?? '').replace(/<[^>]+>/g, '');

describe('lagrange-points: the merged prediction and the ids it retires', () => {
  const PAIRS = {
    'accessible-not-reachable': 'one-region-two-directions',
    'predict-same-region-same-path': 'one-region-two-directions',
  };

  test('both old ids are retired with the merged step, in both languages', () => {
    expect(
      Object.fromEntries(
        Object.entries(LAGRANGE.retired).map(([id, r]) => [id, r.to])
      )
    ).toEqual(PAIRS);
    for (const [id, r] of Object.entries(LAGRANGE.retired)) {
      expect(step(LAGRANGE, id)).toBeUndefined();
      expect(step(LAGRANGE, r.to)).toBeTruthy();
      expect(wasIn(r.was, 'en').length).toBeGreaterThan(20);
      expect(wasIn(r.was, 'es').length).toBeGreaterThan(20);
    }
  });

  test('answers saved under the old ids come back as an earlier version', () => {
    const saved = {
      schema: 2,
      lesson: 'lagrange-points',
      stepSid: 'open-the-neck',
      responses: {
        'lagrange-points:accessible-not-reachable': 2,
        'lagrange-points:predict-same-region-same-path': 2,
        'lagrange-points:predict-forbidden': 1,
      },
      attempts: {},
      visited: ['predict-forbidden'],
      startedAt: '2026-10-01T00:00:00.000Z',
    };
    const read = readProgress(saved, LAGRANGE);
    expect(read.responses['lagrange-points:predict-forbidden']).toBe(1);
    const rows = earlierAnswers(LAGRANGE, read.earlier.responses);
    expect(rows.map(r => [r.id, r.r.to]).sort()).toEqual(
      Object.entries(PAIRS).sort()
    );
  });

  test('one prediction per idea, each revealed by the step that tests it', () => {
    const merged = step(LAGRANGE, 'one-region-two-directions');
    expect(merged.type).toBe('predict');
    expect(merged.reveal).toBe('watch-it-not-cross');
    expect(step(LAGRANGE, 'watch-it-not-cross').requires).toEqual([
      'one-region-two-directions',
    ]);
    expect(step(LAGRANGE, 'predict-stability').reveal).toBe('nudge-l1-and-l4');
    // Twenty core steps still: two predictions became one, and the nudge test
    // was added.
    expect(LAGRANGE.steps).toHaveLength(20);
    expect(
      LAGRANGE.steps.filter(
        s => s.type === 'predict' && s.reveal === 'watch-it-not-cross'
      )
    ).toHaveLength(1);
  });

  test('the nudge test comes between the stability prediction and anything that answers it', () => {
    const order = [
      'stability-is-different',
      'predict-stability',
      'nudge-l1-and-l4',
      'trojans',
      'break-it',
    ].map(sid => at(LAGRANGE, sid));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order[1] + 1).toBe(order[2]);
  });

  test('no stability verdict or critical value is given before its step, in either language', () => {
    const es = mergeTranslation(LAGRANGE, ES_LAGRANGE);
    for (const l of [LAGRANGE, es]) {
      const upTo = at(l, 'nudge-l1-and-l4');
      for (const s of l.steps.slice(0, upTo)) {
        const shown = plain(
          [s.title, s.body, s.tip, s.prompt, ...(s.checklist || [])].join(' ')
        );
        expect([s.sid, shown]).not.toEqual([
          s.sid,
          expect.stringMatching(/saddle|silla|maxim|máxim|\(stable\)/i),
        ]);
      }
      const critical = plain(step(l, 'critical-order').body);
      expect(critical).not.toMatch(/\d[.,]\d{3}/);
    }
  });

  test('the closing question no longer claims a nudge nobody made', () => {
    expect(
      plain(step(LAGRANGE, 'say-what-jacobi-cannot-tell-you').body)
    ).toMatch(/nudged a\s+tracer at L1 and at L4/);
  });

  test('misconceptions name wrong options only, and the Spanish has one for each', () => {
    const es = mergeTranslation(LAGRANGE, ES_LAGRANGE);
    for (const sid of ['why-conserved-matters', 'one-region-two-directions']) {
      const en = step(LAGRANGE, sid);
      expect(en.misconceptions.length).toBeGreaterThan(0);
      for (const m of en.misconceptions) expect(m.option).not.toBe(en.answer);
      const sp = step(es, sid);
      expect(sp.misconceptions.map(m => m.say)).not.toEqual(
        en.misconceptions.map(m => m.say)
      );
      expect(sp.misconceptions).toHaveLength(en.misconceptions.length);
    }
  });
});

describe('butterfly-effect: the readings are taken, not shown', () => {
  const write = step(BUTTERFLY, 'write-down-what-you-measured');

  test('the e-folding time and the growth are taken from the instrument; r² is typed', () => {
    const sources = Object.fromEntries(
      write.fields.map(f => [f.id, f.source?.tool ?? null])
    );
    expect(sources).toEqual({ tau: 'tau', r2: null, growth: 'growth' });
    // No cue: the expected values are the answer key's.
    for (const f of write.fields) expect(f.hint).toBeUndefined();
  });

  test('the instrument lists both rows, with nothing to take before a measurement', () => {
    const [divergence] = CHAOS_WIDGETS;
    const rows = divergence.readout({}, { experiment: () => null });
    const byId = Object.fromEntries(rows.filter(r => r.id).map(r => [r.id, r]));
    expect(Object.keys(byId).sort()).toEqual(['growth', 'tau']);
    expect(byId.tau.text).toBe('');
    expect(byId.growth.text).toBe('');
  });
});
