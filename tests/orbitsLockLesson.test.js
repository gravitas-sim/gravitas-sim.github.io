/**
 * @jest-environment jsdom
 */
// =============================================================================
// When Orbits Lock: the student ranks the ratios, captures the libration they
// ran, and predicts the wide probe before the readout
// -----------------------------------------------------------------------------
// The checks here are held against the lesson as authored: the revised steps
// are new ids with the old ones retired (and saved answers under the old ids
// come back as an earlier version), the reworded steps no longer carry the
// verdict they ask about, the refusals fire on a reading taken too soon, and
// the Spanish carries the same misconceptions and ids. The instruments' own
// Run control is in tests/motionInventory.test.js and their rows in
// tests/resonanceWidgets.test.js; the physics is tests/resonance.test.js.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import ES from '../js/data/investigations/es/when-orbits-lock.js';
import { matchMisconception } from '../js/answerFeedback.js';
import { readProgress } from '../js/investigations/progressSchema.js';
import { earlierAnswers, wasIn } from '../js/investigations/stepView.js';

const LESSON = INVESTIGATIONS.find(l => l.id === 'when-orbits-lock');
const step = sid => LESSON.steps.find(s => s.sid === sid);
const at = sid => LESSON.steps.findIndex(s => s.sid === sid);

describe('the revised steps and the ids they retire', () => {
  const PAIRS = {
    'write-down-the-ratios': 'rank-the-three-pairs',
    'record-the-laplace-libration': 'capture-the-laplace-libration',
    'record-pluto-s-libration': 'capture-pluto-s-libration',
    'record-the-tadpole': 'capture-the-tadpole',
  };

  test('each old id is retired with its successor, which is a live step, in both languages', () => {
    expect(
      Object.fromEntries(
        Object.entries(LESSON.retired).map(([id, r]) => [id, r.to])
      )
    ).toEqual(PAIRS);
    for (const [id, r] of Object.entries(LESSON.retired)) {
      expect(step(id)).toBeUndefined();
      expect(step(r.to)).toBeTruthy();
      expect(wasIn(r.was, 'en').length).toBeGreaterThan(20);
      expect(wasIn(r.was, 'es').length).toBeGreaterThan(20);
    }
  });

  test('answers saved under the old ids come back as an earlier version, and kept steps keep theirs', () => {
    const saved = {
      schema: 2,
      lesson: 'when-orbits-lock',
      stepSid: 'which-is-the-impressive-one',
      responses: {
        'when-orbits-lock:write-down-the-ratios:europaIo': '2.0075',
        'when-orbits-lock:record-the-laplace-libration:center': '180',
        'when-orbits-lock:record-pluto-s-libration:plutoPeriod': '19600',
        'when-orbits-lock:record-the-tadpole:tadpoleCenter': '296',
        'when-orbits-lock:how-close-is-close': 2,
      },
      attempts: {},
      visited: ['how-close-is-close'],
      startedAt: '2026-10-01T00:00:00.000Z',
    };
    const read = readProgress(saved, LESSON);
    expect(read.responses['when-orbits-lock:how-close-is-close']).toBe(2);
    const rows = earlierAnswers(LESSON, read.earlier.responses);
    expect(rows.map(r => [r.id, r.r.to]).sort()).toEqual(
      Object.entries(PAIRS).sort()
    );
  });

  test('the lesson has 35 core steps and the prediction sits before the readout it reveals at', () => {
    expect(LESSON.steps).toHaveLength(35);
    const p = step('predict-the-wide-probe');
    expect(p.type).toBe('predict');
    expect(p.reveal).toBe('one-last-ratio');
    expect(at('predict-the-wide-probe')).toBe(at('one-last-ratio') - 1);
    expect(p.options).toHaveLength(4);
    expect(p.answer).toBe(2);
  });

  test('later steps ask for the renamed steps, and the central loop names live steps', () => {
    expect(step('say-what-a-libration-shows').requires).toEqual([
      'capture-the-laplace-libration',
    ]);
    for (const s of LESSON.steps)
      for (const r of s.requires || []) expect(step(r)).toBeTruthy();
  });

  test('the Spanish has a step for every English step, with the same options and misconceptions', () => {
    const es = ES.steps;
    expect(es).toHaveLength(LESSON.steps.length);
    LESSON.steps.forEach((s, i) => {
      const e = es[i];
      if (!e) return;
      if (s.options && e.options)
        expect(e.options).toHaveLength(s.options.length);
      if (s.misconceptions)
        expect(e.misconceptions?.length ?? 0).toBe(s.misconceptions.length);
      if (s.fields && e.fields) expect(e.fields).toHaveLength(s.fields.length);
    });
  });
});

describe('the reworded steps ask and do not tell', () => {
  const words = sid => {
    const s = step(sid);
    return `${s.body ?? ''} ${s.prompt ?? ''} ${(s.options ?? []).join(' ')}`;
  };

  test('which-is-the-impressive-one gives neither the offsets nor the resonant status', () => {
    expect(words('which-is-the-impressive-one')).not.toMatch(
      /0\.4%|0\.7%|0\.03%|in resonance with nothing|2:1, 2:1/
    );
  });

  test('the-best-ratio-in-the gives neither moon’s verdict nor the offsets', () => {
    const b = step('the-best-ratio-in-the').body;
    expect(b).not.toMatch(
      /0\.03|0\.30|twenty-five|Pluto is in resonance|Callisto is not/
    );
  });

  test('the Laplace prediction and its reveal keep the centre and the amplitude for the capture step', () => {
    const p = step('the-laplace-argument');
    expect(`${p.because} ${p.options.join(' ')}`).not.toMatch(/180|26/);
    const w = step('what-180-means').body;
    expect(w).not.toMatch(/collapses|twice the angle|Substitute/);
  });

  test('the steps that read the instruments name Run and the speed control', () => {
    expect(step('measure-the-four-periods').body).toMatch(/Run/);
    expect(step('measure-the-four-periods').body).toMatch(/inspector/);
    expect(step('watch-the-laplace-argument').body).toMatch(
      /three and a half minutes[\s\S]*Fast button/
    );
  });

  test('the Trojan count is the one the register cites, or no number', () => {
    const all = JSON.stringify(LESSON).replace(/\s+/g, ' ');
    expect(all).not.toMatch(/ten thousand|12,000/);
    expect(all).toMatch(/more than fifteen thousand/i);
  });
});

describe('the ranking', () => {
  const v = (e, g, c) => ({ rankEuropa: e, rankGanymede: g, rankCallisto: c });
  const check = x => step('rank-the-three-pairs').validate(x);

  test('Callisto 1, Europa 2, Ganymede 3 is the order the instrument gives, at every run length probed', () => {
    expect(check(v(2, 3, 1)).level).toBe('ok');
  });

  test('a repeated rank and a wrong order are each answered in words that do not give the order', () => {
    const dup = check(v(1, 1, 2));
    expect(dup.level).toBe('warn');
    const wrong = check(v(1, 2, 3));
    expect(wrong.level).toBe('warn');
    expect(wrong.message).not.toMatch(/Callisto|2,\s*3,\s*1|Europa/);
    expect(check(v(2, 3, NaN))).toBeNull();
  });

  test('the fields and the hint carry none of the ratios', () => {
    const s = step('rank-the-three-pairs');
    expect(JSON.stringify(s.fields.map(f => f.label))).not.toMatch(/\d\.\d/);
    expect(s.body).not.toMatch(/\d\.\d/);
  });
});

describe('a reading taken too soon is refused, in words', () => {
  const laplace = o =>
    step('capture-the-laplace-libration').validate({
      center: 180,
      amplitude: 26,
      period: 2100,
      ...o,
    });
  test('an amplitude that is still a bound is refused, a converged one passes', () => {
    expect(laplace({ amplitude: 7.7 }).level).toBe('error');
    expect(laplace({ amplitude: 7.7 }).message).toMatch(/lower bound|growing/);
    expect(laplace({ amplitude: 25.5 }).level).toBe('ok');
    expect(laplace({ amplitude: 26 }).level).toBe('ok');
  });
  test('a centre on the wrong side, a circle’s worth of amplitude and a one-swing period are each caught', () => {
    expect(laplace({ center: 5 }).level).toBe('warn');
    expect(laplace({ amplitude: 200 }).level).toBe('error');
    expect(laplace({ period: 600 }).level).toBe('warn');
  });
  test('Pluto: the same refusal for a bound, and the days are converted by the student', () => {
    const p = o =>
      step('capture-pluto-s-libration').validate({
        plutoCenter: 180,
        plutoAmplitude: 80,
        plutoPeriod: 19600,
        ...o,
      });
    expect(p({}).level).toBe('ok');
    expect(p({ plutoAmplitude: 40 }).level).toBe('error');
    expect(p({ plutoPeriod: 7_160_000 }).level).toBe('warn');
    expect(p({ plutoPeriod: 7_160_000 }).message).toMatch(/365\.25/);
  });
  test('the tadpole: L4 for L5, a swing before the instrument committed, and Jupiter’s own period', () => {
    const t = o =>
      step('capture-the-tadpole').validate({
        tadpoleCenter: 296,
        tadpoleAmplitude: 24,
        tadpolePeriod: 13,
        ...o,
      });
    expect(t({}).level).toBe('ok');
    expect(t({ tadpoleCenter: 60 }).message).toMatch(/L4/);
    expect(t({ tadpoleAmplitude: 5 }).level).toBe('error');
    expect(t({ tadpolePeriod: 1 }).message).toMatch(/Jupiter’s own/);
  });
  test('the capture fields name instrument rows, and the tadpole step names its body', () => {
    for (const sid of [
      'capture-the-laplace-libration',
      'capture-pluto-s-libration',
    ])
      for (const f of step(sid).fields.filter(x => x.source))
        expect(['center', 'amplitude', 'period']).toContain(f.source.tool);
    expect(step('capture-the-tadpole').tool.read).toBe('Patroclus');
    expect(
      step('capture-pluto-s-libration').fields.find(f => f.id === 'plutoPeriod')
        .source
    ).toBeUndefined();
  });
});

describe('authored feedback on the three choice steps', () => {
  const hit = (sid, option) => matchMisconception(step(sid), option);
  test.each([
    ['the-best-ratio-in-the', 0],
    ['why-the-sky-is-the', 0],
    ['why-the-sky-is-the', 2],
    ['why-the-sky-is-the', 3],
    ['two-equilibria-one-survivor', 0],
    ['two-equilibria-one-survivor', 2],
    ['two-equilibria-one-survivor', 3],
  ])(
    '%s option %i says what is wrong with it and not what is right',
    (sid, option) => {
      const m = hit(sid, option);
      expect(m?.message?.length).toBeGreaterThan(40);
      expect(m.message).not.toMatch(/the second|the correct|answer is/i);
    }
  );
  test('the right option has no misconception', () => {
    for (const sid of [
      'the-best-ratio-in-the',
      'why-the-sky-is-the',
      'two-equilibria-one-survivor',
    ])
      expect(
        step(sid).misconceptions.some(m => m.option === step(sid).answer)
      ).toBe(false);
  });
});
