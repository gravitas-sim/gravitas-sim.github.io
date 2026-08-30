import { NBSP } from '../js/format.js';
import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  blackHoleFacts,
  blackHoleCategory,
  newtonianEscapeSpeed,
  schwarzschildRadiusM,
  sci,
  superscript,
  massLabel,
  lengthLabel,
  yearsLabel,
  densityLabel,
  timesLabel,
  commas,
  SOLAR_MASS_KG,
  C_SI,
  AGE_OF_UNIVERSE_YEARS,
} from '../js/blackHolePhysics.js';
import {
  BLACK_HOLE_WIDGETS,
  recordedTrials,
  clearTrials,
} from '../js/blackHoleWidgets.js';
import { getWidget, widgetDefaults } from '../js/widgets.js';
import { getInvestigation } from '../js/data/investigations.js';

const widget = id => BLACK_HOLE_WIDGETS.find(w => w.id === id);

describe('the physics behind the lesson', () => {
  test('one solar mass gives the textbook Schwarzschild radius', () => {
    // 2.95 km is the number quoted in every introductory text, and the lesson
    // leans on it hard: "about three kilometres per solar mass".
    expect(blackHoleFacts(1).rsKm).toBeCloseTo(2.95, 2);
  });

  test('the radius is exactly proportional to the mass', () => {
    // The whole of section two is a student discovering this on a graph. If it
    // ever stopped being true the lesson would be teaching a falsehood.
    const five = blackHoleFacts(5).rsKm;
    expect(blackHoleFacts(10).rsKm / five).toBeCloseTo(2, 10);
    expect(blackHoleFacts(20).rsKm / five).toBeCloseTo(4, 10);
    expect(blackHoleFacts(500).rsKm / five).toBeCloseTo(100, 10);
  });

  test('the lesson quotes the right radii for 5, 10 and 20 solar masses', () => {
    expect(blackHoleFacts(5).rsKm).toBeCloseTo(14.8, 1);
    expect(blackHoleFacts(10).rsKm).toBeCloseTo(29.5, 1);
    expect(blackHoleFacts(20).rsKm).toBeCloseTo(59.1, 1);
  });

  test('the Newtonian escape speed reaches c exactly at the horizon', () => {
    // This is the coincidence the escape-speed panel is built around, and the
    // lesson says out loud that it is the right answer for the wrong reason.
    const rs = schwarzschildRadiusM(SOLAR_MASS_KG);
    expect(newtonianEscapeSpeed(SOLAR_MASS_KG, rs) / C_SI).toBeCloseTo(1, 12);
  });

  test('the escape-speed presets land where the lesson says they do', () => {
    const v = r => newtonianEscapeSpeed(SOLAR_MASS_KG, r * 1000) / C_SI;
    expect(v(696000)).toBeCloseTo(0.00206, 4); // the Sun today
    expect(v(6371)).toBeCloseTo(0.0215, 3); // Earth-sized
    expect(v(30)).toBeCloseTo(0.314, 2); // a city
    expect(v(6)).toBeCloseTo(0.702, 2); // twice the horizon
  });

  test('average density falls as mass rises', () => {
    const small = blackHoleFacts(10).density;
    const big = blackHoleFacts(1e6).density;
    expect(big).toBeLessThan(small);
    // Five extra zeros of mass, ten fewer zeros of density: the surprise the
    // whole of section four is built on.
    expect(Math.log10(small / big)).toBeCloseTo(10, 6);
  });

  test('the mass at which a black hole is thinner than water is the one quoted', () => {
    // The lesson states this outright, so it had better be true.
    expect(blackHoleFacts(1.4e8).density).toBeLessThan(1000);
    expect(blackHoleFacts(1.3e8).density).toBeGreaterThan(1000);
    // And the one at the center of M87 is thinner than air.
    expect(blackHoleFacts(6.5e9).density).toBeLessThan(1.2);
  });

  test('Hawking temperature goes as one over the mass', () => {
    expect(blackHoleFacts(1).temperature).toBeCloseTo(6.17e-8, 10);
    expect(
      blackHoleFacts(1).temperature / blackHoleFacts(2).temperature
    ).toBeCloseTo(2, 10);
  });

  test('every astrophysical black hole is colder than the microwave background', () => {
    // The lesson claims all of them are currently absorbing rather than
    // evaporating, which depends on this being true across the whole range.
    for (const m of [1, 10, 1e3, 4.3e6, 6.5e9]) {
      expect(blackHoleFacts(m).timesColderThanCMB).toBeGreaterThan(1e6);
    }
  });

  test('lifetime goes as the cube of the mass', () => {
    expect(blackHoleFacts(1).lifetimeYears / 1e67).toBeCloseTo(2.1, 1);
    expect(
      blackHoleFacts(2).lifetimeYears / blackHoleFacts(1).lifetimeYears
    ).toBeCloseTo(8, 6);
    expect(
      blackHoleFacts(3).lifetimeYears / blackHoleFacts(1).lifetimeYears
    ).toBeCloseTo(27, 6);
  });

  test('the mass factor the lesson quotes really is twenty extra zeros', () => {
    // "That is not four million times longer. It is twenty extra zeros."
    const ratio =
      blackHoleFacts(4.3e6).lifetimeYears / blackHoleFacts(1).lifetimeYears;
    expect(Math.round(Math.log10(ratio))).toBe(20);
  });

  test('Sagittarius A* comes out with its published numbers', () => {
    const f = blackHoleFacts(4.3e6);
    expect(f.rsKm / 1e6).toBeCloseTo(12.7, 1); // 12.7 million km
    expect(f.rsAU).toBeCloseTo(0.085, 3);
    expect(f.rsAU / 0.387).toBeCloseTo(0.22, 2); // a fifth of the way to Mercury
    expect(f.temperature).toBeCloseTo(1.4e-14, 15);
    expect(Math.round(Math.log10(f.lifetimeYears))).toBe(87);
    expect(f.category).toBe('Supermassive');
  });

  test('the category boundaries match the ones the lesson teaches', () => {
    expect(blackHoleCategory(8)).toBe('Stellar-Mass');
    expect(blackHoleCategory(1000)).toBe('Intermediate');
    expect(blackHoleCategory(150000)).toBe('Intermediate');
    expect(blackHoleCategory(4.3e6)).toBe('Supermassive');
  });

  test('the sizes the lesson compares things to are right', () => {
    // "about two thousand solar masses" for an Earth-sized horizon, and
    // "about two hundred and thirty thousand" for a Sun-sized one.
    expect(6371 / blackHoleFacts(1).rsKm).toBeCloseTo(2157, -2);
    expect(696000 / blackHoleFacts(1).rsKm).toBeCloseTo(235600, -3);
    expect(blackHoleFacts(1000).rsKm / 6371).toBeCloseTo(0.46, 2);
    expect(blackHoleFacts(150000).rsKm / 696000).toBeCloseTo(0.64, 2);
  });
});

describe('writing numbers down for people who do not like exponents', () => {
  test('superscripts render as digits, including the minus', () => {
    expect(superscript(67)).toBe('⁶⁷');
    expect(superscript(-14)).toBe('⁻¹⁴');
  });

  test('scientific notation drops a mantissa of one', () => {
    // The spaces around the multiplication sign are non-breaking: a value must
    // never be split from its own power of ten at the end of a line.
    expect(sci(2.1e67)).toBe(`2.1${NBSP}×${NBSP}10⁶⁷`);
    expect(sci(1e20)).toBe('10²⁰');
    expect(sci(1.4e-14)).toBe(`1.4${NBSP}×${NBSP}10⁻¹⁴`);
  });

  test('masses are written the way they would be said', () => {
    expect(massLabel(8)).toBe(`8${NBSP}M☉`);
    expect(massLabel(1000)).toBe(`1,000${NBSP}M☉`);
    expect(massLabel(150000)).toBe(`150,000${NBSP}M☉`);
    expect(massLabel(4.3e6)).toBe(`4.3${NBSP}million M☉`);
    expect(massLabel(6.5e9)).toBe(`6.5${NBSP}billion M☉`);
  });

  test('lengths pick a unit that keeps the number small', () => {
    expect(lengthLabel(29540)).toBe(`29.5${NBSP}km`);
    expect(lengthLabel(blackHoleFacts(150000).rsM)).toBe(`443,119${NBSP}km`);
    expect(lengthLabel(1.27e10)).toMatch(/AU$/);
  });

  test('spans of years stay readable across sixty orders of magnitude', () => {
    expect(yearsLabel(80)).toBe(`80${NBSP}years`);
    expect(yearsLabel(AGE_OF_UNIVERSE_YEARS)).toBe(`13.8${NBSP}billion years`);
    expect(yearsLabel(1e14)).toBe(`100${NBSP}trillion years`);
    expect(yearsLabel(2.1e67)).toBe(`2.1${NBSP}×${NBSP}10⁶⁷${NBSP}years`);
  });

  test('densities and ratios never come out as raw exponent soup', () => {
    expect(densityLabel(1000)).toBe(`1,000${NBSP}kg/m³`);
    expect(densityLabel(1.84e19)).toBe(`1.8${NBSP}×${NBSP}10¹⁹${NBSP}kg/m³`);
    expect(timesLabel(1000)).toBe(`1,000${NBSP}times`);
    expect(timesLabel(4.4e7)).toBe(`44${NBSP}million times`);
    expect(commas(1e6)).toBe('1,000,000');
  });

  test('nothing formats an impossible value into a number', () => {
    for (const f of [
      sci,
      massLabel,
      lengthLabel,
      yearsLabel,
      densityLabel,
      timesLabel,
    ]) {
      expect(f(NaN)).toBe('-');
      expect(f(Infinity)).toBe('-');
    }
  });
});

describe('the instruments', () => {
  beforeEach(() => clearTrials());

  test('every widget is registered and reachable by id', () => {
    for (const w of BLACK_HOLE_WIDGETS) {
      expect(getWidget(w.id)).toBe(w);
      expect(w.title).toBeTruthy();
      expect(typeof w.readout).toBe('function');
      expect(typeof w.draw).toBe('function');
    }
  });

  test('every preset only sets controls the widget actually has', () => {
    // A preset naming a control that does not exist writes a value nothing
    // reads, so the button looks broken rather than failing loudly.
    for (const w of BLACK_HOLE_WIDGETS) {
      const ids = new Set(w.controls.map(c => c.id));
      for (const preset of w.presets || []) {
        expect(preset.label).toBeTruthy();
        for (const key of Object.keys(preset.values)) {
          expect(ids.has(key)).toBe(true);
        }
      }
    }
  });

  test('every preset value sits inside its slider range', () => {
    for (const w of BLACK_HOLE_WIDGETS) {
      for (const preset of w.presets || []) {
        for (const [key, value] of Object.entries(preset.values)) {
          const c = w.controls.find(x => x.id === key);
          expect(value).toBeGreaterThanOrEqual(c.min);
          expect(value).toBeLessThanOrEqual(c.max);
        }
      }
    }
  });

  test('readouts survive the extremes of every slider', () => {
    for (const w of BLACK_HOLE_WIDGETS) {
      for (const end of ['min', 'max']) {
        const v = widgetDefaults(w);
        for (const c of w.controls) v[c.id] = c[end];
        const rows = w.readout(v, undefined, {});
        expect(Array.isArray(rows)).toBe(true);
        for (const row of rows) {
          expect(row.label).toBeTruthy();
          // A readout showing "NaN" or "undefined" is the failure mode a
          // student notices first and trusts least.
          expect(String(row.value)).not.toMatch(/NaN|undefined|Infinity/);
        }
      }
    }
  });

  test('control formatters never produce NaN at either end', () => {
    for (const w of BLACK_HOLE_WIDGETS) {
      for (const c of w.controls) {
        if (!c.format) continue;
        expect(c.format(c.min)).not.toMatch(/NaN|undefined/);
        expect(c.format(c.max)).not.toMatch(/NaN|undefined/);
      }
    }
  });

  test('the horizon panel reports the radius the lesson asks students to read', () => {
    const w = widget('bh-horizon');
    const rows = w.readout({ mass: 10 }, undefined, {
      rows: ['mass', 'radius', 'across'],
    });
    expect(rows[0].value).toBe(`10${NBSP}M☉`);
    expect(rows[1].value).toBe(`29.5${NBSP}km`);
    expect(rows[2].value).toBe(`59.1${NBSP}km`);
  });

  test('the trial table records, replaces and clears', () => {
    const w = widget('bh-scaling');
    const spec = { session: 'rs-vs-m' };
    w.reset({ mass: 5 }, { spec });
    for (const mass of [20, 5, 10]) w.act('record', { mass });
    // Sorted by mass regardless of the order they were taken in, which is what
    // makes the graph readable when a student doubles back.
    expect(recordedTrials().map(p => p.mass)).toEqual([5, 10, 20]);
    expect(recordedTrials()[1].rsKm).toBeCloseTo(29.5, 1);

    w.act('record', { mass: 10 });
    expect(recordedTrials()).toHaveLength(3);

    w.act('clear', { mass: 10 });
    expect(recordedTrials()).toHaveLength(0);
  });

  test('trials survive moving between the steps of one experiment', () => {
    const w = widget('bh-scaling');
    const spec = { session: 'rs-vs-m' };
    w.reset({ mass: 5 }, { spec });
    w.act('record', { mass: 5 });
    // Every slider move calls reset. If that threw the table away the
    // experiment could never collect a second point.
    w.reset({ mass: 10 }, { spec });
    expect(recordedTrials()).toHaveLength(1);
    // Arriving from a different lesson starts clean instead.
    w.reset({ mass: 10 }, { spec: { session: 'somewhere-else' } });
    expect(recordedTrials()).toHaveLength(0);
  });

  test('the escape gauge never reads over the speed of light', () => {
    const w = widget('bh-escape');
    for (const logr of [w.controls[0].min, 0.3, 1, 3, w.controls[0].max]) {
      const c = w.compute({ logr });
      expect(c.fraction).toBeGreaterThan(0);
      expect(c.fraction).toBeLessThanOrEqual(1);
    }
    expect(w.compute({ logr: w.controls[0].min }).fraction).toBeCloseTo(1, 6);
  });

  test('the zero-counting panel adds up the way the lesson says', () => {
    const w = widget('bh-blocks');
    const rows = w.readout({ zeros: 3 }, undefined, {});
    expect(rows.find(r => r.label === 'Volume gained').value).toBe(
      '3 + 3 + 3 = 9 zeros'
    );
    expect(rows.find(r => r.label === 'So density lost').value).toBe(
      '9 − 3 = 6 zeros'
    );
  });

  test('the lineup keeps its four black holes in ascending order', () => {
    const w = widget('bh-lineup');
    const rows = w.readout({ which: 0 }, undefined, {});
    expect(rows).toHaveLength(4);
    expect(rows[0].emphasis).toBe(true);
    expect(rows[3].label).toContain(`4.3${NBSP}million`);
    // The names stay anonymous until the final reveal step asks for them.
    expect(rows[3].label).not.toContain('Sagittarius');
    const named = w.readout({ which: 3 }, undefined, { named: true });
    expect(named[3].label).toContain('Sagittarius A*');
    expect(named[3].emphasis).toBe(true);
  });
});

describe('the black hole lesson', () => {
  const inv = getInvestigation('black-holes');

  test('is the length a class period can hold', () => {
    expect(inv.steps.length).toBeGreaterThanOrEqual(24);
    expect(inv.steps.length).toBeLessThanOrEqual(30);
  });

  test('asks for a prediction before every discovery', () => {
    // The three surprises are the point of the lesson, and a student who sees
    // the answer before committing to one remembers having known it all along.
    expect(
      inv.steps.filter(s => s.type === 'predict').length
    ).toBeGreaterThanOrEqual(4);
  });

  test('every tool spec names controls the widget really has', () => {
    for (const step of inv.steps) {
      if (!step.tool) continue;
      const w = getWidget(step.tool.id);
      const ids = new Set(w.controls.map(c => c.id));
      for (const key of Object.keys(step.tool.values || {})) {
        expect(ids.has(key)).toBe(true);
      }
      for (const key of step.tool.hide || []) expect(ids.has(key)).toBe(true);
    }
  });

  test('every tool value sits inside its slider range', () => {
    for (const step of inv.steps) {
      for (const [key, value] of Object.entries(step.tool?.values || {})) {
        const c = getWidget(step.tool.id).controls.find(x => x.id === key);
        expect(value).toBeGreaterThanOrEqual(c.min);
        expect(value).toBeLessThanOrEqual(c.max);
      }
    }
  });

  test('loads its own scenario and never swaps it mid-lesson', () => {
    const setups = inv.steps.filter(s => s.setup).map(s => s.setup.scenario);
    expect(setups).toEqual(['Black Hole Lab']);
    expect(inv.steps[0].setup).toBeTruthy();
  });

  test('leaves the object card reachable', () => {
    // Step one tells the student to click the black hole and compare the card
    // with the lesson. That only works if the inspector is not suppressed.
    expect(inv.lock.inspector).toBe(false);
    expect(inv.lock.placement).toBe(true);
  });

  test('never states the density claim without its caveat', () => {
    // Bodies are written wrapped in the source, so a phrase can straddle a
    // newline and a naive search would miss it.
    const text = inv.steps
      .map(s => `${s.body} ${s.because || ''} ${s.tip || ''}`)
      .join(' ')
      .replace(/\s+/g, ' ');
    expect(text).toMatch(
      /not.{0,40}a claim that the inside is a uniform ball/i
    );
    expect(text).toMatch(/general relativity/i);
    expect(text).toMatch(/not spinning/i);
  });

  test('the numeric check accepts the answer the panel shows', () => {
    const step = inv.steps.find(s => s.kind === 'numeric');
    const w = getWidget(step.tool.id);
    const rows = w.readout({ zeros: 3 }, undefined, {});
    // The student reads "3 + 3 + 3 = 9 zeros" off the panel and types 9.
    expect(rows.find(r => r.label === 'Volume gained').value).toContain(
      `= ${step.answer} zeros`
    );
  });
});
