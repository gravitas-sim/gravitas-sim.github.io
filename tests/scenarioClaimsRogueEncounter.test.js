import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { SCENARIO_PRESETS } from '../js/scenarios.js';
import { SCENARIO_REVISIONS, currentRevision } from '../js/shareState.js';

// =============================================================================
// Rogue Encounter (`rogue-encounter`): what its card says, held to the run
// -----------------------------------------------------------------------------
// The scenario review found two asteroids overlapping at the start under each
// seed, no planet captured by the hole under either, and an ejection test that
// counted 16 planets and giants unbound before anything had happened
// (D-R4-463-02). Revision 2 spreads 40 asteroids over 350 to 600 units instead
// of 80 over 350 to 450; a claim committed before its run measures ejection
// from a bound start; and the card no longer promises capture.
// =============================================================================

const ROOT = path.resolve(import.meta.dirname, '..');
const ID = 'rogue-encounter';
const read = f => readFileSync(path.join(ROOT, f), 'utf8');
const member = () =>
  JSON.parse(read('tests/fixtures/scenario-review/record.json')).members[ID];

describe('Rogue Encounter: the corrected world', () => {
  test('it is revision 2, and revision 1 keeps its 80 asteroids in the narrow band', () => {
    expect(currentRevision(ID)).toBe(2);
    const entry = SCENARIO_REVISIONS[ID];
    expect(entry.earlier).toEqual({ 1: 'retained' });
    expect(entry.rows[1].num_asteroids).toBe(80);
    const pop = entry.geometry[1].steps[0].rule.params;
    expect([pop.asteroidInner, pop.asteroidSpan]).toEqual([350, 100]);
    expect(SCENARIO_PRESETS[ID].num_asteroids).toBe(40);
  });

  test('the card promises what both seeds show, in both languages', () => {
    const card = src =>
      new RegExp(
        `'scenario\\.${ID}\\.summary':\\s*'((?:[^'\\\\]|\\\\.)*)'`
      ).exec(src)[1];
    const en = card(read('js/i18n/en.js'));
    const es = card(read('js/i18n/es.js'));
    expect(en).toContain('swallow some planets and fling others out');
    expect(en).not.toContain('capture');
    expect(es).toContain('engulle algunos planetas y expulsa otros');
    expect(es).not.toContain('captura');
  });
});

describe('Rogue Encounter: the review run', () => {
  const rows = claim => member().rows.filter(r => r.claim === claim);

  test('nothing starts overlapping, under either seed', () => {
    expect(rows('start-overlap')).toHaveLength(6);
    for (const r of rows('start-overlap'))
      expect([r.seed, r.rate, r.value]).toEqual([r.seed, r.rate, 0]);
  });

  test('planets bound to the star are flung out, and some fall into the hole, under both seeds', () => {
    for (const r of rows('ejection-bound'))
      expect([r.seed, r.rate, r.pass, r.value >= 1]).toEqual([
        r.seed,
        r.rate,
        true,
        true,
      ]);
    for (const r of rows('disruption'))
      expect([r.seed, r.rate, r.pass]).toEqual([r.seed, r.rate, true]);
  });

  test('the ejection claim it supersedes stays on the record, and capture still never happens', () => {
    const v = member().verdictSuggested;
    expect(v.superseded).toEqual(['ejection']);
    expect(v.failing).toEqual(['capture']);
    expect(rows('capture').every(r => r.value === 0)).toBe(true);
  });
});
