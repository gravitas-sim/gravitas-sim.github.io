// =============================================================================
// Lives of Stars: the two moments a student chooses, and what the lesson no
// longer says before it asks
// -----------------------------------------------------------------------------
// The lesson is content only, so what can be tested without a browser is its
// shape and its judgments: that the three read-a-number steps are retired with
// a successor, that the successor's check accepts readings the model itself
// gives for any two moments that differ and refuses the same moment twice, a
// Myr number typed as Gyr and readings that are not from one moment, that the
// predictions open at the start of the track with no phase chosen, and that the
// step numbers the prose quotes name the steps they mean. The browser walk is
// e2e/livesOfStars.spec.js and the central experiment in
// e2e/centralExperiments.spec.js.
// =============================================================================

import { describe, expect, test } from '@jest/globals';
import LIVES from '../js/data/investigations/lives-of-stars.js';
import { stateAtAge } from '../js/stellar/tracks.js';

const steps = LIVES.steps;
const at = sid => steps.findIndex(s => s.sid === sid);
const step = sid => steps[at(sid)];
const plain = s => String(s).replace(/<[^>]*>/g, ' ');

/** What the readout prints for the 1 solar-mass track at an age, to the digits it prints. */
const readout = ageGyr => {
  const s = stateAtAge('m100', ageGyr * 1e9);
  const p3 = v => Number(v.toPrecision(3));
  return {
    age: ageGyr,
    lum: p3(s.luminositySun),
    rad: p3(s.radiusSun),
    teff: Math.round(s.teffK),
    phase: s.phase,
  };
};
const values = (a, b) => ({
  ageA: a.age,
  lumA: a.lum,
  radA: a.rad,
  teffA: a.teff,
  ageB: b.age,
  lumB: b.lum,
  radB: b.rad,
  teffB: b.teff,
});

describe('the read-a-number steps are one comparison the student designs', () => {
  test('the three are retired with the successor, which the lesson has', () => {
    const live = new Set(steps.map(s => s.sid));
    expect(Object.keys(LIVES.retired).sort()).toEqual([
      'across-the-main-sequence',
      'arriving',
      'the-sun-today',
    ]);
    for (const [id, r] of Object.entries(LIVES.retired)) {
      expect(live.has(id)).toBe(false);
      expect(r.to).toBe('compare-two-moments');
      expect(live.has(r.to)).toBe(true);
      expect(r.was.en && r.was.es).toBeTruthy();
    }
    expect(steps).toHaveLength(33);
  });

  test('no run of more than two measure steps remains', () => {
    let run = 0;
    let longest = 0;
    for (const s of steps) {
      run = s.type === 'measure' ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
    expect(longest).toBeLessThanOrEqual(2);
  });

  test('the step names no phase, can freeze a moment and keeps the capture button', () => {
    const tool = step('compare-two-moments').tool;
    expect(tool).toMatchObject({
      id: 'stellar-evolution',
      track: 'm100',
      freeze: true,
      capture: true,
      autoplay: false,
    });
    expect(tool.phase).toBeUndefined();
    expect(step('compare-two-moments').stage.stars[0].track).toBe('m100');
  });
});

describe('the check on two chosen moments', () => {
  const check = values => step('compare-two-moments').validate(values);
  const early = readout(0.457);
  const sun = readout(4.6);
  const late = readout(9.9);
  const giant = readout(11.33);
  const young = readout(0.0042);

  test('accepts any two different moments, in either order, and gives the student’s own factors', () => {
    const a = check(values(early, late));
    expect(a.level).toBe('ok');
    // 0.797 to 2.27 solar luminosities, 0.904 to 1.55 solar radii, almost the same temperature.
    expect(a.message).toMatch(/factor of 2\.8\d/);
    expect(a.message).toMatch(/almost straight up/);
    expect(check(values(late, early)).message).toBe(a.message);

    const b = check(values(sun, giant));
    expect(b.level).toBe('ok');
    expect(b.message).toMatch(/up and to the right/);
    expect(b.message).toMatch(/temperature fell/);

    const c = check(values(young, sun));
    expect(c.level).toBe('ok');
    // Down the track to the main sequence the star gets cooler-to-hotter and fainter-to-brighter.
    expect(c.message).toMatch(/up and to the left/);
  });

  test('refuses the same moment twice and a pair under ten per cent apart, saying so', () => {
    for (const pair of [
      values(sun, sun),
      values(sun, readout(5.0)),
      values(early, readout(0.9)),
    ]) {
      const r = check(pair);
      expect(r.level).toBe('error');
      expect(r.message).toMatch(/almost the same star/);
    }
  });

  test('refuses the zero-age main sequence against the first main-sequence sample: the main sequence is slow', () => {
    // 41.9 Myr and 456.8 Myr are a tenfold age apart and under seven per cent
    // apart in luminosity and about two per cent in radius.
    const zams = readout(0.0419);
    const first = readout(0.4568);
    expect(Math.abs(Math.log(first.lum / zams.lum))).toBeLessThan(0.1);
    expect(Math.abs(Math.log(first.rad / zams.rad))).toBeLessThan(0.1);
    for (const pair of [values(zams, first), values(first, zams)]) {
      const r = check(pair);
      expect(r.level).toBe('error');
      expect(r.message).toMatch(/almost the same star/);
    }
  });

  test('refuses readings that are not from one moment, and names which moment', () => {
    const r = check({ ...values(early, late), lumB: early.lum });
    expect(r.level).toBe('error');
    expect(r.message).toMatch(/second moment/);
    expect(r.message).toMatch(/do not belong together/);
    const first = check({ ...values(early, late), radA: late.rad });
    expect(first.message).toMatch(/first moment/);
  });

  test('tells a Myr number typed as Gyr, and a blank form, what to do', () => {
    expect(check({ ...values(early, late), ageA: 457 }).message).toMatch(
      /type them in Gyr/
    );
    expect(check({}).level).toBe('warn');
    expect(check({ ...values(early, late), teffA: 0 }).level).toBe('warn');
  });

  test('two equal ages cannot have different readings', () => {
    const r = check({ ...values(early, late), ageB: early.age });
    expect(r.level).toBe('warn');
    expect(r.message).toMatch(/same age/);
  });

  test('the model’s own printed readings pass the luminosity, radius and temperature tie at every age', () => {
    // L = R^2 (T / 5772 K)^4 in solar units. A reading rounded as the readout
    // prints it is within 1.5 per cent; the check allows 6.
    let worst = 0;
    for (let i = 1; i <= 400; i++) {
      const g = 0.0004 + (11.46 * i) / 400;
      const m = readout(g);
      worst = Math.max(
        worst,
        Math.abs(Math.log(m.lum / (m.rad * m.rad * (m.teff / 5772) ** 4)))
      );
    }
    expect(worst).toBeLessThan(0.02);
    // A different moment's luminosity breaks it by far more.
    const off = Math.abs(
      Math.log(early.lum / (late.rad * late.rad * (late.teff / 5772) ** 4))
    );
    expect(off).toBeGreaterThan(0.2);
  });
});

describe('the predictions open at the start of the track and say nothing', () => {
  const opens = [
    'predict-protostar-power',
    'predict-direction',
    'predict-the-red-dwarf',
    'predict-massive-lifetime',
    'predict-core-and-envelope',
  ];

  test.each(opens)('%s opens paused with no phase chosen', sid => {
    const tool = step(sid).tool;
    expect(tool.phase).toBeUndefined();
    expect(tool.at).toBeLessThan(0.06); // inside the cloud, which has no numbers
    expect(tool.autoplay).toBe(false);
  });

  test('the answers that sat before the question are in the because that shows at the reveal', () => {
    const text = sid => plain(`${step(sid).body} ${step(sid).tip ?? ''}`);
    expect(text('predict-protostar-power')).not.toMatch(
      /fifty-six|4,100|Sun does/i
    );
    expect(step('predict-protostar-power').because).toMatch(/fifty-six/);
    expect(text('predict-direction')).not.toMatch(
      /cooler|more luminous|to the left/i
    );
    expect(step('predict-direction').because).toMatch(
      /ten thousand times the area/
    );
    expect(text('not-a-supernova')).not.toMatch(/It is not|degeneracy/i);
    expect(step('not-a-supernova').because).toMatch(/electron degeneracy/);
    expect(text('predict-massive-lifetime')).not.toMatch(/8\.65/);
    expect(step('predict-massive-lifetime').because).toMatch(/8\.65 Myr/);
    // The two sentences of the step before the direction prediction that
    // stated its answer.
    const before = step('core-in-envelope-out');
    expect(plain(before.tip)).not.toMatch(/cooler|total goes up/i);
    expect(
      before.validate({ rStart: 1.65, rTip: 172.6, tTip: 3070 }).message
    ).not.toMatch(/luminous|cooler|cools|falls/i);
    expect(
      before.validate({ rStart: 1.65, rTip: 172.6, tTip: 5000 }).message
    ).not.toMatch(/cooler|cools|falls/i);
    // The cloud step does not send the student to the phase that answers the
    // next prediction, and the helium step's title does not refute an option.
    expect(step('the-cloud').checklist.some(c => /phase/i.test(c))).toBe(false);
    expect(step('helium-and-the-loop').title).not.toMatch(/simply|keep/i);
  });

  test('the first prediction returns beside the student’s own readings at the step that settles it', () => {
    const first = step('three-futures');
    const settle = step(first.reveal);
    expect(settle.sid).toBe('the-black-hole');
    expect(settle.evidence.map(e => `${e.step}.${e.field}`)).toEqual([
      'massive-versus-sun.lumBig',
      'massive-versus-sun.msSun',
      'massive-versus-sun.msBig',
    ]);
    for (const e of settle.evidence) {
      expect(at(e.step)).toBeGreaterThan(at('three-futures'));
      expect(at(e.step)).toBeLessThan(at(settle.sid));
      expect(step(e.step).fields.some(f => f.id === e.field)).toBe(true);
    }
    expect(settle.compare).toBeTruthy();
  });
});

describe('the step numbers the prose quotes name the steps they mean', () => {
  const number = sid => at(sid) + 1;
  const all = steps
    .map(s => plain(`${s.body ?? ''} ${s.tip ?? ''} ${s.because ?? ''}`))
    .join(' ');

  test('each quoted number is a step of this lesson', () => {
    const quoted = [
      ...all.matchAll(/\b[Ss]teps? (\d+)(?: and (\d+))?/g),
    ].flatMap(m => [m[1], m[2]].filter(Boolean).map(Number));
    for (const n of quoted) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(steps.length);
    }
  });

  test.each([
    ['predict-what-runs-out', /step (\d+) does/, 'predict-the-red-dwarf'],
    ['measure-the-giant', /step (\d+) compares/, 'true-size-then-and-now'],
    ['measure-the-giant', /measured at step (\d+)/, 'compare-young-and-old'],
    ['the-same-age', /Step (\d+) asks/, 'design-a-comparison'],
    ['neutron-star-scale', /at step (\d+)/, 'white-dwarf-cooling'],
    ['design-a-comparison', /step (\d+) was/, 'the-same-age'],
  ])('%s quotes the step that is %s', (sid, pattern, target) => {
    const s = step(sid);
    const m = pattern.exec(plain(`${s.body ?? ''} ${s.tip ?? ''}`));
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBe(number(target));
  });

  test('the two cases the neutron-star prediction points at are the endpoint steps', () => {
    const m = /Steps (\d+) and (\d+) are those two cases/.exec(
      plain(step('predict-core-and-envelope').because)
    );
    expect([Number(m[1]), Number(m[2])]).toEqual([
      number('the-neutron-star'),
      number('the-black-hole'),
    ]);
  });
});
