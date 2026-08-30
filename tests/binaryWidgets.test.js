import { describe, test, expect } from '@jest/globals';
import { binaryFacts } from '../js/binaryWidgets.js';
import { getWidget, widgetDefaults } from '../js/widgets.js';

describe('the binary the lesson is built on', () => {
  test('the barycenter sits halfway between two equal stars', () => {
    const f = binaryFacts(2, 2, 4);
    expect(f.r1).toBeCloseTo(2, 9);
    expect(f.r2).toBeCloseTo(2, 9);
  });

  test('the heavier star always stays closer to the barycenter', () => {
    // The single fact the whole mass-ratio idea rests on, checked across the
    // whole range of the sliders.
    for (let m1 = 0.5; m1 <= 5; m1 += 0.5) {
      for (let m2 = 0.5; m2 <= 5; m2 += 0.5) {
        const f = binaryFacts(m1, m2, 4);
        if (m1 > m2) expect(f.r1).toBeLessThan(f.r2);
        if (m1 < m2) expect(f.r1).toBeGreaterThan(f.r2);
      }
    }
  });

  test('the two distances always add up to the separation', () => {
    // The lesson's one likely mistake is measuring a single star's distance
    // instead of the whole orbit, so the relation had better hold exactly.
    for (const [m1, m2] of [
      [1, 1],
      [3, 1],
      [5, 0.5],
      [0.5, 5],
    ]) {
      const f = binaryFacts(m1, m2, 4);
      expect(f.r1 + f.r2).toBeCloseTo(4, 9);
    }
  });

  test('the distance ratio is the mass ratio, inverted', () => {
    const f = binaryFacts(3, 1, 4);
    expect(f.r2 / f.r1).toBeCloseTo(f.m1 / f.m2, 9);
    expect(f.r1).toBeCloseTo(1, 9);
    expect(f.r2).toBeCloseTo(3, 9);
  });

  test('period, size and total mass obey the law the lesson uses', () => {
    for (const [m1, m2, sep] of [
      [2, 2, 4],
      [3, 1, 4],
      [0.5, 0.5, 4],
      [1, 1, 2],
    ]) {
      const f = binaryFacts(m1, m2, sep);
      expect(f.sep ** 3 / f.period ** 2).toBeCloseTo(f.total, 9);
    }
  });

  test('more mass at the same separation means a quicker orbit', () => {
    const light = binaryFacts(0.5, 0.5, 4);
    const heavy = binaryFacts(2, 2, 4);
    expect(heavy.period).toBeLessThan(light.period);
    // The comparison step claims a factor of two, so it had better be one.
    expect(light.period / heavy.period).toBeCloseTo(2, 9);
  });

  test('the numbers the lesson quotes are the numbers it produces', () => {
    const mystery = binaryFacts(3, 1, 4);
    expect(mystery.sep).toBe(4);
    expect(mystery.period).toBeCloseTo(4, 9);
    expect(mystery.sep ** 3 / mystery.period ** 2).toBeCloseTo(4, 9);
    expect(mystery.r1).toBeCloseTo(1, 9);
    expect(mystery.r2).toBeCloseTo(3, 9);
    // The two practice examples
    expect(2 ** 3 / 2 ** 2).toBe(2);
    expect(3 ** 3 / 3 ** 2).toBe(3);
    // Sirius, from its real period and orbit size
    expect(19.8 ** 3 / 50.1 ** 2).toBeCloseTo(3.09, 2);
  });
});

describe('the binary instrument', () => {
  const w = getWidget('binary');

  test('the mystery masses are never shown', () => {
    const spec = { mystery: true, grid: true, barycenter: true, rows: [] };
    const v = widgetDefaults(w, {});
    const text = JSON.stringify(w.readout(v, undefined, spec));
    expect(text).not.toMatch(/[13](\.0)? M☉/);
    expect(w.readout(v, undefined, spec)).toEqual([]);
    // ...but the instrument is still running the real system underneath.
    const f = w.facts(v, spec);
    expect(f.m1).toBe(3);
    expect(f.m2).toBe(1);
  });

  test('the slider masses are ignored while the mystery is loaded', () => {
    const spec = { mystery: true };
    expect(w.facts(widgetDefaults(w, { m1: 5, m2: 5 }), spec).total).toBe(4);
  });

  test('the stopwatch measures one orbit as one period', () => {
    const spec = { mystery: true, timer: true, rows: ['timer'] };
    const v = widgetDefaults(w, {});
    w.reset(v, { autorun: true, spec });
    w.act('mark', v, spec);
    const period = w.facts(v, spec).period;
    // A quarter of a year passes per second of watching.
    for (let i = 0; i < (period / 0.25) * 60; i++) w.step(v, 1 / 60, spec);
    w.act('stop', v, spec);
    const reading = w.readout(v, undefined, spec)[0].value;
    expect(Number(reading.split(' ')[0])).toBeCloseTo(period, 1);
  });

  test('the stopwatch does not run while the picture is paused', () => {
    const spec = { mystery: true, timer: true, rows: ['timer'] };
    const v = widgetDefaults(w, {});
    w.reset(v, { autorun: true, spec });
    w.act('mark', v, spec);
    for (let i = 0; i < 60; i++) w.step(v, 1 / 60, spec);
    w.act('run', v, spec);
    const paused = w.readout(v, undefined, spec)[0].value;
    for (let i = 0; i < 600; i++) w.step(v, 1 / 60, spec);
    expect(w.readout(v, undefined, spec)[0].value).toBe(paused);
    expect(paused).toMatch(/paused/);
  });

  test('reset clears a measurement in progress', () => {
    const spec = { mystery: true, timer: true, rows: ['timer'] };
    const v = widgetDefaults(w, {});
    w.reset(v, { autorun: true, spec });
    w.act('mark', v, spec);
    for (let i = 0; i < 120; i++) w.step(v, 1 / 60, spec);
    w.act('reset', v, spec);
    w.act('reset', v, spec);
    expect(w.readout(v, undefined, spec)[0].value).toMatch(/press Mark/);
  });

  test('the stopwatch only exists on the step that asks for it', () => {
    const ids = spec => w.actions(spec).map(a => a.id);
    expect(ids({ timer: true })).toContain('mark');
    expect(ids({})).not.toContain('mark');
  });

  test('a planet makes the star move, just barely', () => {
    const f = w.facts(widgetDefaults(w, { m1: 1 }), { planet: true });
    expect(f.r1).toBeGreaterThan(0);
    expect(f.r2 / f.r1).toBeGreaterThan(500);
  });
});

describe('the see-saw', () => {
  const w = getWidget('balance');

  test('names whichever star is actually the heavier one', () => {
    const heavier = v => w.readout(v, undefined, {})[2].value;
    expect(heavier({ d1: 1, d2: 3 })).toMatch(/Star A, by 3 times/);
    expect(heavier({ d1: 3, d2: 1 })).toMatch(/Star B, by 3 times/);
    expect(heavier({ d1: 2, d2: 2 })).toMatch(/weigh the same/);
  });

  test('only the ratio of the distances matters', () => {
    expect(w.compute({ d1: 1, d2: 2 }, {}).ratio).toBe(
      w.compute({ d1: 2, d2: 4 }, {}).ratio
    );
  });

  test('splits a total mass the way the lesson does', () => {
    const c = w.compute({ d1: 1, d2: 3 }, { total: 4 });
    expect(c.blocksA).toBeCloseTo(3, 9);
    expect(c.blocksB).toBeCloseTo(1, 9);
    expect(c.blocksA + c.blocksB).toBeCloseTo(4, 9);
  });
});

describe('the real binary', () => {
  const w = getWidget('visual-binary');

  test('a century of watching covers two orbits of Sirius', () => {
    expect(w.compute({ year: 2000 }).complete).toBeCloseTo(100 / 50.1, 2);
    expect(w.compute({ year: 1950 }).complete).toBeGreaterThan(0.99);
  });

  test('adds observations as the years advance', () => {
    expect(w.compute({ year: 1910 }).points.length).toBe(3);
    expect(w.compute({ year: 2000 }).points.length).toBe(21);
  });

  test('its orbit gives the accepted mass', () => {
    expect(w.compute({ year: 2000 }).total).toBeCloseTo(3.09, 2);
  });
});
