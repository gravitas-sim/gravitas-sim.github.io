// The submission token carries what an uncertainty says (Prompt 151, part B):
// the ledger record's rows gain a tenth column only when there is something to
// say beyond a bare sigma, and the review page's reader takes rows of nine or
// ten columns, old tokens included.

import { describe, test, expect } from '@jest/globals';
import { webcrypto } from 'node:crypto';
import { TextEncoder } from 'node:util';

import { ledgerRecord, uncertaintyCode } from '../js/notebook/ledger.js';
import { artifactEntry } from '../js/notebook/artifactEntry.js';
import { artifact } from '../js/platform/artifact.js';
import { evidenceRowOf } from '../js/submission/results.js';
import { checkEvidence, ledgerDigest } from '../js/submission/ledgerDigest.js';
import { EN_SUBMISSIONS } from '../js/i18n/en.submissions.js';
import { ES_SUBMISSIONS } from '../js/i18n/es.submissions.js';

if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
globalThis.TextEncoder ??= TextEncoder;

describe('the code', () => {
  test('nothing to add for nothing stated', () => {
    expect(uncertaintyCode({ kind: 'none' })).toBeNull();
  });

  test('a sigma with a basis, and every other kind, carry theirs', () => {
    expect(uncertaintyCode({ kind: 'sigma', sigma: 1, basis: 'data' })).toEqual(
      ['s', 'd']
    );
    expect(
      uncertaintyCode({
        kind: 'interval',
        lo: 1,
        hi: 3,
        level: 0.95,
        basis: 'profile',
      })
    ).toEqual(['i', 'p', 1, 3, 0.95]);
    expect(
      uncertaintyCode({ kind: 'limit', bound: 'lower', basis: 'data' })
    ).toEqual(['l', 'd', 'l']);
    expect(uncertaintyCode({ kind: 'limit', bound: 'upper' })).toEqual([
      'l',
      null,
      'u',
    ]);
    expect(
      uncertaintyCode({ kind: 'model-limited', floor: 0.3, sigma: 0.1 })
    ).toEqual(['m', null, 0.3, 0.1]);
    expect(uncertaintyCode({ kind: 'assumed' })).toEqual(['a']);
    expect(uncertaintyCode({ kind: 'failed' })).toEqual(['f']);
    expect(uncertaintyCode({ kind: 'not-constrained' })).toEqual(['c']);
  });
});

describe('the record', () => {
  const entryOf = quantities =>
    artifactEntry({
      source: 'inference-fit',
      title: 'a fit',
      envelope: artifact({
        id: 'fit:x',
        source: { kind: 'inference', id: 'fit', digest: 'f'.repeat(64) },
        quantities,
      }),
    });
  const q = (id, value, uncertainty) => ({
    id,
    value,
    unit: 'm',
    uncertainty,
    origin: 'fitted',
  });

  test('a row says no more than it did when nothing is stated', () => {
    const { rows } = ledgerRecord([entryOf([q('b', 2, { kind: 'none' })])]);
    expect(rows.every(r => r.length === 9)).toBe(true);
  });

  test('a row gains a tenth column when it has something to say', () => {
    const { rows } = ledgerRecord([
      entryOf([
        q('a', 1, { kind: 'sigma', sigma: 0.1, basis: 'data' }),
        q('b', 2, { kind: 'limit', bound: 'upper', basis: 'data' }),
        q('c', null, { kind: 'failed', reason: 'singular' }),
      ]),
    ]);
    expect(rows.map(r => r.length)).toEqual([10, 10, 10]);
    expect(rows[0][9]).toEqual(['s', 'd']);
    expect(rows[0][4]).toBe(0.1);
    expect(rows[1][9]).toEqual(['l', 'd', 'u']);
    expect(rows[2][9]).toEqual(['f']);
  });

  test('a record of ten columns verifies against its digest', async () => {
    const record = ledgerRecord([
      entryOf([q('a', 1, { kind: 'sigma', sigma: 0.1, basis: 'data' })]),
    ]);
    const digest = await ledgerDigest(record);
    const check = await checkEvidence({
      d: digest,
      i: record.ids,
      n: record.total,
      r: record.rows,
    });
    expect(check.state).toBe('verified');
    const edited = JSON.parse(JSON.stringify(record.rows));
    edited[0][9] = ['s', 'm'];
    expect(
      (
        await checkEvidence({
          d: digest,
          i: record.ids,
          n: record.total,
          r: edited,
        })
      ).state
    ).toBe('mismatch');
  });
});

describe('the reader', () => {
  const nine = ['e', 'q', 3.5, 'm', 0.01, 'measured', 'inference', 'fit', 'ab'];

  test('a row of nine columns reads as it always did', () => {
    const r = evidenceRowOf(nine);
    expect(r).toMatchObject({ value: 3.5, half: 0.01, unit: 'm' });
    expect(r.uncertainty).toBeNull();
  });

  test('a row of ten reads its uncertainty by name', () => {
    expect(evidenceRowOf([...nine, ['s', 'd']]).uncertainty).toEqual({
      kind: 'sigma',
      basis: 'data',
      half: 0.01,
    });
    expect(
      evidenceRowOf([
        ...nine.slice(0, 4),
        null,
        ...nine.slice(5),
        ['l', 'd', 'l'],
      ]).uncertainty
    ).toMatchObject({ kind: 'limit', bound: 'lower', basis: 'data' });
    expect(
      evidenceRowOf([...nine, ['i', 'p', 3, 4, 0.9]]).uncertainty
    ).toMatchObject({
      kind: 'interval',
      lo: 3,
      hi: 4,
      level: 0.9,
      basis: 'profile',
    });
    expect(
      evidenceRowOf([...nine, ['m', null, 0.3, 0.1]]).uncertainty
    ).toMatchObject({ kind: 'model-limited', floor: 0.3, sigma: 0.1 });
  });

  test('a code this build does not know reads as nothing, and a malformed one too', () => {
    expect(evidenceRowOf([...nine, ['z', 'd']]).uncertainty).toBeNull();
    expect(evidenceRowOf([...nine, 'oops']).uncertainty).toBeNull();
    expect(
      evidenceRowOf([...nine, ['i', 'q', 'x', {}, 'y']]).uncertainty
    ).toMatchObject({ kind: 'interval', basis: null });
  });
});

describe('the words the review page uses', () => {
  test('every method and state has a word in both languages', () => {
    for (const id of [
      'method.data',
      'method.model',
      'method.scaled',
      'method.profile',
      'method.propagated',
      'method.stated',
      'method.exact',
      'unc.failed',
      'unc.notConstrained',
      'unc.limit.upper',
      'unc.limit.lower',
    ]) {
      expect(EN_SUBMISSIONS[`sub.evidence.${id}`]).toBeTruthy();
      expect(ES_SUBMISSIONS[`sub.evidence.${id}`]).toBeTruthy();
    }
  });
});
