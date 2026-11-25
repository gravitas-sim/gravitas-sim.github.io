import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// =============================================================================
// Gravity Assist around a star (`gravity-assist-heliocentric`): the card's
// exchange, held to the review's run
// -----------------------------------------------------------------------------
// The card said the planet "is slowed by exactly the momentum it gained". Near
// a star that cannot hold: the planet's own orbital turning over the flyby is a
// million times the spacecraft's push, and the star takes a share of the
// exchange, so the committed momentum claim failed (D-R4-463-02). The card now
// says what does hold - the planet's orbit loses the energy the spacecraft
// gained, far too little to notice - and the claim that supersedes the momentum
// one was committed before its first run (claims.json). The panel's momentum
// ledger line, which compared the same two changes, is not shown here.
// =============================================================================

const ROOT = path.resolve(import.meta.dirname, '..');
const ID = 'gravity-assist-heliocentric';
const read = f => readFileSync(path.join(ROOT, f), 'utf8');
const json = f => JSON.parse(read(f));

describe('Gravity Assist around a star: the card and the review', () => {
  test('the energy claim supersedes the momentum claim, which stays on the record', () => {
    const claims = json('tests/fixtures/scenario-review/claims.json').members[
      ID
    ].claims;
    const energy = claims.find(c => c.id === 'energy');
    expect(energy.supersedes).toBe('momentum');
    expect([energy.tolerance, energy.unnoticed]).toEqual([0.02, 1e-6]);
    expect(claims.some(c => c.id === 'momentum')).toBe(true);
  });

  test('the energy exchange balances to 2% at every frame rate, and the planet barely notices', () => {
    const m = json('tests/fixtures/scenario-review/record.json').members[ID];
    const rows = m.rows.filter(r => r.claim === 'energy');
    expect(rows).toHaveLength(3);
    for (const r of rows) {
      expect([r.rate, r.pass, r.value < 0.02]).toEqual([r.rate, true, true]);
      const shift = Number(
        /differs from the control run's by (\S+) of it/.exec(r.note)[1]
      );
      expect([r.rate, shift < 1e-6]).toEqual([r.rate, true]);
    }
    // The superseded claim still fails, as measured, and no longer decides.
    expect(
      m.rows.filter(r => r.claim === 'momentum').every(r => r.pass === false)
    ).toBe(true);
    expect(m.verdictSuggested.verdict).toBe('KEEP');
    expect(m.verdictSuggested.superseded).toEqual(['momentum']);
  });

  test('the card says energy, not exact momentum, in both languages', () => {
    const card = src =>
      new RegExp(
        `'scenario\\.${ID}\\.summary':\\s*'((?:[^'\\\\]|\\\\.)*)'`
      ).exec(src)[1];
    const en = card(read('js/i18n/en.js'));
    const es = card(read('js/i18n/es.js'));
    expect(en).toContain(
      'the planet’s orbit loses the energy the spacecraft gained, far too little to notice'
    );
    expect(en).not.toContain('exactly the momentum');
    expect(es).toContain(
      'la órbita del planeta pierde, sin que se note, la energía que ganó la nave'
    );
    expect(es).not.toContain('exactamente en el momento lineal');
  });

  test('the panel leaves the momentum ledger empty around a star', () => {
    const src = read('js/assistPanel.js');
    expect(src).toMatch(
      /!run\.planetDeltaP \|\|\s*activeMode\(\) === 'heliocentric'/
    );
  });
});
