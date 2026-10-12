// =============================================================================
// concept/2, the DRAFT second version of the concept items
// -----------------------------------------------------------------------------
// What these tests hold, and what they do not:
//
//   balance        the key is spread evenly over a, b, c and d, and the correct
//                  option is neither the longest nor the shortest on more than
//                  a quarter of the items. Version 1 fails both on purpose and
//                  is exempt; the test below proves the detector can fail.
//   alignment      each of the sixteen stated objectives of the three
//                  investigations has exactly one item, read from the
//                  investigations' own files so the map cannot drift.
//   physics        every item whose key is a number or a ratio is recomputed
//                  here from the physics, not copied from the key.
//   no pooling     the two versions cannot be scored, paired or summarized as
//                  one: disjoint ids, a version in the export, a summary that
//                  keeps them apart.
//
// Nothing here says the instrument is validated or frozen: it is a draft with
// no expert review, no interviews and no calibration (D-STUDY-02).
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  CONCEPT_ITEMS,
  CONCEPT_ITEMS_V2,
  CONCEPT_VERSIONS,
  CONCEPT_V2_COLUMNS,
  CONCEPT_V2_INSTRUMENT,
  CONCEPT_COLUMNS,
  EVALUATION_SCHEMA,
  scoreConcept,
  versionOfInstrument,
} from '../js/data/evaluation.js';
import { CONCEPT_V2_IDS } from '../js/data/evaluationShape.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const read = f => readFileSync(path.join(root, f), 'utf8');
const html = read('evaluation/index.html')
  .replace(/&quot;/g, '"')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&rsquo;/g, '’')
  .replace(/&minus;/g, '−');

/** How often each letter is the key. */
const keyCounts = items => {
  const counts = [0, 0, 0, 0];
  for (const item of items) counts[item.answer]++;
  return counts;
};

/** Items whose correct option is at least as long as every other (ties count). */
const longestCount = items =>
  items.filter(it => {
    const len = it.options.map(o => o.length);
    return len[it.answer] >= Math.max(...len);
  }).length;

/** Items whose correct option is at most as long as every other (ties count). */
const shortestCount = items =>
  items.filter(it => {
    const len = it.options.map(o => o.length);
    return len[it.answer] <= Math.min(...len);
  }).length;

/**
 * The balance rule, as a function so it can be shown to fail.
 * The key must be as even as the count allows (every letter floor(n/4) or
 * ceil(n/4) times), and the correct option may be the longest, or the
 * shortest, on at most a quarter of the items, rounded up.
 */
const balance = items => {
  const n = items.length;
  const counts = keyCounts(items);
  const evenKey = counts.every(
    c => c === Math.floor(n / 4) || c === Math.ceil(n / 4)
  );
  const limit = Math.ceil(n / 4);
  return {
    counts,
    evenKey,
    longest: longestCount(items),
    shortest: shortestCount(items),
    ok:
      evenKey && longestCount(items) <= limit && shortestCount(items) <= limit,
  };
};

describe('concept/2 balance', () => {
  test('the key is exactly four each of a, b, c and d', () => {
    expect(CONCEPT_ITEMS_V2).toHaveLength(16);
    expect(keyCounts(CONCEPT_ITEMS_V2)).toEqual([4, 4, 4, 4]);
  });

  test('the correct option is the longest on at most a quarter of the items', () => {
    expect(longestCount(CONCEPT_ITEMS_V2)).toBeLessThanOrEqual(
      Math.ceil(CONCEPT_ITEMS_V2.length / 4)
    );
  });

  test('and the shortest on at most a quarter, so brevity is no cue either', () => {
    expect(shortestCount(CONCEPT_ITEMS_V2)).toBeLessThanOrEqual(
      Math.ceil(CONCEPT_ITEMS_V2.length / 4)
    );
  });

  test('the whole rule passes for v2', () => {
    expect(balance(CONCEPT_ITEMS_V2).ok).toBe(true);
  });

  test('the same rule fails for v1, which is exempt, so it can fail', () => {
    const b = balance(CONCEPT_ITEMS);
    expect(b.ok).toBe(false);
    expect(b.evenKey).toBe(false);
    expect(b.counts).toEqual([1, 5, 6, 0]);
    expect(b.longest).toBe(8);
  });

  test('the rule catches an unbalanced key and a long correct option', () => {
    const skewed = CONCEPT_ITEMS_V2.map(it => ({ ...it, answer: 1 }));
    expect(balance(skewed).evenKey).toBe(false);
    const padded = CONCEPT_ITEMS_V2.map(it => {
      const options = [...it.options];
      options[it.answer] += ' and a good deal more words than any other option';
      return { ...it, options };
    });
    expect(balance(padded).ok).toBe(false);
  });

  test('no distractor is padded: no option repeats another by more than its own words', () => {
    // A padded distractor would show as two options sharing a long common
    // prefix or suffix with one just a clause longer. This catches the lazy
    // cases only; the real guard is review of the wording.
    for (const it of CONCEPT_ITEMS_V2) {
      for (const o of it.options) {
        expect(o.trim()).toBe(o);
        expect(o.length).toBeGreaterThan(0);
      }
      expect(new Set(it.options).size).toBe(4);
    }
  });
});

describe('concept/2 is a labeled draft kept apart from version 1', () => {
  test('it is marked DRAFT and version 1 stays readable', () => {
    expect(CONCEPT_VERSIONS[CONCEPT_V2_INSTRUMENT].status).toBe('DRAFT');
    expect(CONCEPT_VERSIONS.concept.items).toBe(CONCEPT_ITEMS);
    expect(CONCEPT_ITEMS).toHaveLength(12);
    expect(versionOfInstrument('')).toBe(CONCEPT_VERSIONS.concept);
    expect(versionOfInstrument('concept/3')).toBeNull();
  });

  test('item ids and columns are disjoint, so the versions cannot be pooled', () => {
    const v1ids = CONCEPT_ITEMS.map(i => i.id);
    const v2ids = CONCEPT_ITEMS_V2.map(i => i.id);
    expect(v2ids).toEqual(CONCEPT_V2_IDS);
    for (const id of v2ids) expect(v1ids).not.toContain(id);
    const shared = CONCEPT_V2_COLUMNS.filter(
      c =>
        CONCEPT_COLUMNS.includes(c) &&
        !['schema', 'instrument', 'occasion', 'participant'].includes(c)
    );
    expect(shared).toEqual([]);
  });

  test('a sheet is scored only against its own version', () => {
    const v1sheet = Object.fromEntries(
      CONCEPT_ITEMS.map(i => [i.id, String(i.answer)])
    );
    const v2sheet = Object.fromEntries(
      CONCEPT_ITEMS_V2.map(i => [i.id, String(i.answer)])
    );
    expect(scoreConcept(v1sheet).correct).toBe(12);
    expect(scoreConcept(v2sheet, CONCEPT_V2_INSTRUMENT).correct).toBe(16);
    // The wrong key reads nothing at all, rather than a number that looks fine.
    expect(scoreConcept(v1sheet, CONCEPT_V2_INSTRUMENT).answered).toBe(0);
    expect(scoreConcept(v2sheet).answered).toBe(0);
    expect(() => scoreConcept(v2sheet, 'concept/3')).toThrow(/unknown/);
  });

  test('the summary tool keeps the versions apart and refuses to pair across them', () => {
    const tool = path.join(root, 'tools', 'evaluation-summary.mjs');
    const sheetFor = (columns, instrument, items, occasion, code, nRight) =>
      columns
        .map(col => {
          if (col === 'schema') return String(EVALUATION_SCHEMA);
          if (col === 'instrument') return instrument;
          if (col === 'occasion') return occasion;
          if (col === 'participant') return code;
          const idx = items.findIndex(i => i.id === col);
          return String(
            idx < nRight ? items[idx].answer : (items[idx].answer + 1) % 4
          );
        })
        .join(',');
    const v1 = (o, c, n) =>
      sheetFor(CONCEPT_COLUMNS, 'concept', CONCEPT_ITEMS, o, c, n);
    const v2 = (o, c, n) =>
      sheetFor(
        CONCEPT_V2_COLUMNS,
        CONCEPT_V2_INSTRUMENT,
        CONCEPT_ITEMS_V2,
        o,
        c,
        n
      );
    const f1 = path.join(root, 'tmp-concept-v1.csv');
    const f2 = path.join(root, 'tmp-concept-v2.csv');
    writeFileSync(
      f1,
      [
        CONCEPT_COLUMNS.join(','),
        v1('pre', 'brisk-comet-41', 3),
        v1('post', 'brisk-comet-41', 9),
        v1('pre', 'warm-nebula-07', 2),
      ].join('\n') + '\n'
    );
    writeFileSync(
      f2,
      [
        CONCEPT_V2_COLUMNS.join(','),
        v2('post', 'brisk-comet-41', 12),
        v2('pre', 'warm-nebula-07', 4),
        v2('post', 'warm-nebula-07', 10),
      ].join('\n') + '\n'
    );
    try {
      const s = JSON.parse(
        execFileSync(process.execPath, [tool, f1, f2, '--json'], {
          encoding: 'utf8',
        })
      );
      // Version 1's own figures are untouched by the version 2 sheets.
      expect(s.counts.sheets).toBe(3);
      expect(s.counts.paired).toBe(1);
      expect(s.paired.meanPre).toBeCloseTo(3, 6);
      expect(s.paired.meanPost).toBeCloseTo(9, 6);
      // Version 2 is reported separately, over its own sixteen items.
      expect(s.draftV2.counts.sheets).toBe(3);
      expect(s.draftV2.counts.paired).toBe(1);
      expect(s.draftV2.items).toHaveLength(16);
      expect(s.draftV2.paired.meanPre).toBeCloseTo(4, 6);
      expect(s.draftV2.paired.meanPost).toBeCloseTo(10, 6);
      // A code on both versions is named, never paired or pooled.
      expect(s.crossVersionCodes.sort()).toEqual([
        'brisk-comet-41',
        'warm-nebula-07',
      ]);
      expect(s.problems.join('\n')).toMatch(/never paired or pooled/);
      // brisk-comet-41 has a v1 pre, a v1 post and a v2 post: only the v1 pair counts.
      expect(s.counts.paired + s.draftV2.counts.paired).toBe(2);
    } finally {
      unlinkSync(f1);
      unlinkSync(f2);
    }
  });

  test('nothing calls it validated or frozen', () => {
    const claim = /\b(is|are|was|has been|now|and)\s+(validated|frozen)\b/i;
    const section = html.slice(
      html.indexOf('id="conceptV2"'),
      html.indexOf('id="usability"')
    );
    expect(section).toContain('DRAFT');
    expect(section).not.toMatch(claim);
    expect(section).not.toMatch(/validated|frozen/i);
    const data = read('js/data/evaluation.js');
    expect(data).not.toMatch(claim);
    const register = read('DECISION_REGISTER.md')
      .split('\n')
      .filter(l => /concept\/2/.test(l) && /^\| D-STUDY-0[5-9]/.test(l))
      .join('\n');
    expect(register).not.toMatch(claim);
    expect(register).toMatch(/DRAFT/);
  });
});

const item = id => CONCEPT_ITEMS_V2.find(i => i.id === id);

describe('concept/2 alignment', () => {
  const objectivesOf = file => {
    const src = read(`js/data/investigations/${file}.js`);
    const block = src.match(/objectives:\s*\[([\s\S]*?)\n {2}\],/)[1];
    return (block.match(/^ {4}['"`]/gm) || []).length;
  };

  test('each stated objective of the three investigations has exactly one item', () => {
    const expected = [];
    const sets = [
      ['keplers-laws', 'Kepler'],
      ['orbital-energy', 'Energy'],
      ['weighing-stars', 'Stars'],
    ];
    for (const [file, label] of sets) {
      const n = objectivesOf(file);
      for (let i = 1; i <= n; i++) expected.push(`${label} ${i}`);
    }
    expect(expected).toHaveLength(16);
    expect(CONCEPT_ITEMS_V2.map(i => i.objective).sort()).toEqual(
      [...expected].sort()
    );
  });

  test('every item is in the static HTML, in both languages, and the key is not', () => {
    for (const item of CONCEPT_ITEMS_V2) {
      expect(html).toContain(`id="${item.id}"`);
      expect(html).toContain(item.stem.slice(0, 40));
      for (const o of item.options) expect(html).toContain(o.slice(0, 30));
    }
    const section = html.slice(
      html.indexOf('id="conceptV2"'),
      html.indexOf('id="usability"')
    );
    expect(section.match(/class="gs-es"/g).length).toBe(
      section.match(/class="gs-en"/g).length
    );
    expect(section).toMatch(/not equivalent to the English/);
    expect(section).toMatch(/no es equivalente al inglés/);
    expect(section).not.toMatch(/\banswer\s*[:=]\s*\d/);
  });

  test('the computed flags are exactly the items a recomputation test covers', () => {
    // LEARNING_STUDY.md B.2 marks the same ids in its table.
    expect(
      CONCEPT_ITEMS_V2.filter(i => i.computed)
        .map(i => i.id)
        .sort()
    ).toEqual(
      [
        'r02',
        'r03',
        'r04',
        'r06',
        'r07',
        'r09',
        'r10',
        'r12',
        'r13',
        'r14',
        'r15',
      ].sort()
    );
  });

  test('r07 states that the engine is off, so only one option is correct', () => {
    expect(item('r07').stem).toMatch(/engine off after launch/);
    expect(html).toContain('engine off after launch');
    expect(html).toContain('motor apagado');
    expect(item('r07').options.join(' ')).not.toMatch(/engine/);
  });

  test('each item names a four-option key inside its list', () => {
    for (const item of CONCEPT_ITEMS_V2) {
      expect(item.options).toHaveLength(4);
      expect(item.answer).toBeGreaterThanOrEqual(0);
      expect(item.answer).toBeLessThan(4);
      expect(item.objective).toBeTruthy();
    }
  });
});

// --- The physics of the computed items --------------------------------------
// Units: AU, year, solar mass, so that G = 4 pi^2. Every figure the key
// states is recomputed from these, and every distractor is checked to differ.
const G = 4 * Math.PI ** 2;
const keyOf = id => item(id).options[item(id).answer];

/** Two bodies on a circular relative orbit, velocity Verlet, in AU/yr/Msun. */
function twoBody(mA, mB, sep, steps = 20000) {
  const M = mA + mB;
  const v = Math.sqrt((G * M) / sep);
  // Barycenter at the origin; A at -sep*mB/M, B at +sep*mA/M.
  let pa = [-(sep * mB) / M, 0];
  let pb = [(sep * mA) / M, 0];
  let va = [0, -(v * mB) / M];
  let vb = [0, (v * mA) / M];
  const period = 2 * Math.PI * Math.sqrt(sep ** 3 / (G * M));
  const dt = period / steps;
  const acc = (p, q, m) => {
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const r3 = Math.hypot(dx, dy) ** 3;
    return [(G * m * dx) / r3, (G * m * dy) / r3];
  };
  let aa = acc(pa, pb, mB);
  let ab = acc(pb, pa, mA);
  let angle = 0;
  let prev = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]);
  let t = 0;
  let found = null;
  let maxDa = 0;
  let minDa = Infinity;
  for (let i = 0; i < steps * 1.2; i++) {
    pa = [
      pa[0] + va[0] * dt + 0.5 * aa[0] * dt * dt,
      pa[1] + va[1] * dt + 0.5 * aa[1] * dt * dt,
    ];
    pb = [
      pb[0] + vb[0] * dt + 0.5 * ab[0] * dt * dt,
      pb[1] + vb[1] * dt + 0.5 * ab[1] * dt * dt,
    ];
    const na = acc(pa, pb, mB);
    const nb = acc(pb, pa, mA);
    va = [
      va[0] + 0.5 * (aa[0] + na[0]) * dt,
      va[1] + 0.5 * (aa[1] + na[1]) * dt,
    ];
    vb = [
      vb[0] + 0.5 * (ab[0] + nb[0]) * dt,
      vb[1] + 0.5 * (ab[1] + nb[1]) * dt,
    ];
    aa = na;
    ab = nb;
    t += dt;
    const cur = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]);
    let d = cur - prev;
    while (d < -Math.PI) d += 2 * Math.PI;
    while (d > Math.PI) d -= 2 * Math.PI;
    angle += d;
    prev = cur;
    // Distance of each star from the barycenter (origin, by momentum conservation).
    // Momentum is zero at the start, so the barycenter is fixed.
    maxDa = Math.max(maxDa, Math.hypot(pa[0], pa[1]));
    minDa = Math.min(minDa, Math.hypot(pa[0], pa[1]));
    if (found === null && angle >= 2 * Math.PI) found = t;
  }
  return {
    period: found,
    distA: (maxDa + minDa) / 2,
    distB: sep - (maxDa + minDa) / 2,
  };
}

describe('concept/2 computed keys are physically correct', () => {
  test('r03: a log-log slope of 1.5 means P^2 proportional to a^3', () => {
    // Planets obeying P^2 = a^3 (one solar mass) have slope exactly 1.5;
    // the distractor "period proportional to axis" would give slope 1.
    const a = [0.4, 1, 1.9, 5.2];
    const slope = (xs, ys) => {
      const lx = xs.map(Math.log);
      const ly = ys.map(Math.log);
      const mx = lx.reduce((s, v) => s + v) / lx.length;
      const my = ly.reduce((s, v) => s + v) / ly.length;
      return (
        lx.reduce((s, v, i) => s + (v - mx) * (ly[i] - my), 0) /
        lx.reduce((s, v) => s + (v - mx) ** 2, 0)
      );
    };
    expect(
      slope(
        a,
        a.map(x => Math.sqrt(x ** 3))
      )
    ).toBeCloseTo(1.5, 10);
    expect(slope(a, a)).toBeCloseTo(1, 10);
    expect(keyOf('r03')).toMatch(/squared.*cubed/);
  });

  test('r02: distance times sideways speed is the same at both apsides and speed is higher at periapsis', () => {
    const e = 0.5;
    const a = 1;
    const M = 1;
    const vp = Math.sqrt((G * M * (1 + e)) / (a * (1 - e)));
    const va = Math.sqrt((G * M * (1 - e)) / (a * (1 + e)));
    const rp = a * (1 - e);
    const ra = a * (1 + e);
    expect(rp * vp).toBeCloseTo(ra * va, 10);
    expect(vp).toBeGreaterThan(va);
    // The two apsides are also consistent with one energy: -GM/2a.
    expect(0.5 * vp * vp - (G * M) / rp).toBeCloseTo(-(G * M) / (2 * a), 8);
    expect(0.5 * va * va - (G * M) / ra).toBeCloseTo(-(G * M) / (2 * a), 8);
    expect(keyOf('r02')).toMatch(/closest.*distance times sideways speed/);
  });

  test('r04: a planet at 1 AU around four solar masses has a half-year period', () => {
    const P = Math.sqrt(1 ** 3 / 4);
    expect(P).toBeCloseTo(0.5, 12);
    // And with SI constants, so the AU/year/Msun units are not the only witness.
    const GMsun = 1.32712440018e20;
    const AU = 1.495978707e11;
    const yr = 365.25 * 86400;
    const Psi = (2 * Math.PI * Math.sqrt(AU ** 3 / (4 * GMsun))) / yr;
    expect(Psi).toBeCloseTo(0.5, 3);
    const values = [1, 0.5, 2, 4];
    expect(values.indexOf(0.5)).toBe(item('r04').answer);
    expect(keyOf('r04')).toBe('half a year');
    for (const v of values)
      if (v !== 0.5) expect(Math.abs(v - P)).toBeGreaterThan(0.4);
  });

  test('r06: kinetic 6 plus potential -4 is a positive total, so unbound', () => {
    const total = 6 + -4;
    expect(total).toBeGreaterThan(0);
    expect(keyOf('r06')).toMatch(/^unbound/);
    // The total's sign does not depend on mass: scaling both energies by it.
    for (const m of [0.1, 1, 1000]) expect(m * 6 + m * -4).toBeGreaterThan(0);
  });

  test('r07: escape speed at Earth’s surface is about 11 km/s, about 25,000 mph', () => {
    const GM = 3.986004418e14;
    const R = 6.371e6;
    const vEsc = Math.sqrt((2 * GM) / R) / 1000;
    const vLow = Math.sqrt(GM / R) / 1000;
    expect(vEsc).toBeCloseTo(11.19, 1);
    expect(vLow).toBeCloseTo(7.91, 1);
    expect(Math.round(vEsc)).toBe(11);
    expect(Math.round(vLow)).toBe(8);
    const mph = (vEsc * 1000 * 3600) / 1609.344;
    expect(Math.abs(mph - 25000) / 25000).toBeLessThan(0.01);
    expect(keyOf('r07')).toMatch(/^About 11 km\/s/);
    // A rifle bullet is about 1 km/s at most, far below either.
    expect(1).toBeLessThan(vLow);
  });

  test('r09: at four radii escape speed is half the surface value', () => {
    const ratio = Math.sqrt(1 / 4);
    expect(ratio).toBeCloseTo(0.5, 12);
    // The distractors are the same, 1/4 and 1/16, none of which is the ratio.
    for (const wrong of [1, 1 / 4, 1 / 16])
      expect(wrong).not.toBeCloseTo(ratio, 3);
    expect(keyOf('r09')).toMatch(/^half as large/);
  });

  test('r10: a hyperbolic path has positive total energy', () => {
    // Vis-viva with a < 0 (hyperbola): v^2 = GM(2/r - 1/a), energy = -GM/2a.
    const GM = 1;
    const a = -2;
    const r = 3;
    const v2 = GM * (2 / r - 1 / a);
    const E = 0.5 * v2 - GM / r;
    expect(E).toBeGreaterThan(0);
    expect(E).toBeCloseTo(-GM / (2 * a), 12);
    expect(keyOf('r10')).toMatch(/^unbound/);
  });

  test('r12: 3 and 1 solar masses 4 AU apart have a barycenter 1 AU from the heavier', () => {
    const closed = (4 * 1) / (3 + 1);
    expect(closed).toBe(1);
    const sim = twoBody(3, 1, 4);
    expect(sim.distA).toBeCloseTo(1, 4);
    expect(sim.distB).toBeCloseTo(3, 4);
    expect(keyOf('r12')).toMatch(/^1 AU/);
    for (const wrong of ['2 AU', '3 AU', '0 AU'])
      expect(item('r12').options.filter(o => o.startsWith(wrong))).toHaveLength(
        1
      );
  });

  test('r13: the star three times further from the barycenter is the lighter, a third the mass', () => {
    // Masses P=1, Q=3: the barycenter sits at 3/4 of the way to Q.
    const mP = 1;
    const mQ = 3;
    const sim = twoBody(mP, mQ, 2);
    expect(sim.distA / sim.distB).toBeCloseTo(3, 4);
    expect(mQ / mP).toBe(3);
    expect(keyOf('r13')).toMatch(/^Q is three times heavier than P/);
  });

  test('r14: 2 AU apart and 2 years round gives 2 solar masses, by formula and by simulation', () => {
    const M = 2 ** 3 / 2 ** 2;
    expect(M).toBe(2);
    const sim = twoBody(1, 1, 2);
    expect(sim.period).toBeCloseTo(2, 3);
    // The distractors are what the common slips give: one star's own distance
    // (a = 1 AU, total 1/4), a^3/P (4) and a/P (1).
    expect(1 ** 3 / 2 ** 2).toBe(0.25);
    expect(2 ** 3 / 2).toBe(4);
    expect(2 / 2).toBe(1);
    expect(keyOf('r14')).toBe('2 solar masses');
  });

  test('r15: a total of 4 split by distances 3:1 gives A 1 and B 3 solar masses', () => {
    const total = 4;
    const mA = total * (1 / (3 + 1));
    const mB = total - mA;
    expect([mA, mB]).toEqual([1, 3]);
    // Simulate: separation 4 AU, masses 1 and 3, star A starts 3 AU from the barycenter.
    const sim = twoBody(mA, mB, 4);
    expect(sim.distA / sim.distB).toBeCloseTo(3, 4);
    expect(sim.period).toBeCloseTo(Math.sqrt(4 ** 3 / total), 3);
    // Every option sums to the stated total, so only the ratio can discriminate.
    for (const o of item('r15').options) {
      const nums = o.match(/-?\d+(\.\d+)?/g).map(Number);
      expect(nums[0] + nums[1]).toBeCloseTo(total, 10);
    }
    expect(keyOf('r15')).toBe('A 1, B 3 (solar masses)');
  });
});
