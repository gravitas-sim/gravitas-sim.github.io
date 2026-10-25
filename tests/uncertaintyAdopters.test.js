// The first adopters of the uncertainty contract (Prompt 151, part A): the one
// pattern a number is printed in, its method in both languages, and the
// notebook and ledger printing through it.

import {
  describeUncertain,
  uncertaintyMethod,
} from '../js/platform/uncertain.js';
import { quantityText } from '../js/notebook/artifactEntry.js';
import { rowValue } from '../js/notebook/ledgerReport.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import { ES_DEFERRED } from '../js/i18n/es.deferred.js';

// The reader's non-breaking spaces compared as plain ones.
const plain = s => s.replace(/\u00a0/g, ' ');
const en = id => EN_DEFERRED[id] ?? id;
const es = id => ES_DEFERRED[id] ?? id;
const q = (value, uncertainty) => ({ id: 'x', value, uncertainty });

describe('the pattern a number is printed in', () => {
  test('a sigma with its basis prints "X ± Y (method)"', () => {
    const d = describeUncertain(
      q(9.81, { kind: 'sigma', sigma: 0.02, basis: 'data' }),
      en
    );
    expect(plain(d.line)).toBe('9.810 ± 0.020 (data)');
    expect(d.method).toBe('data');
    expect(d.tip).toMatch(/error bars/);
  });

  test('an asymmetric interval, a limit and the two open states', () => {
    expect(
      plain(
        describeUncertain(
          q(1.23, { kind: 'interval', lo: 1.2, hi: 1.28, basis: 'profile' }),
          en
        ).line
      )
    ).toBe('1.230 +0.050 −0.030 (profile)');
    expect(
      describeUncertain(
        q(3.2, { kind: 'limit', bound: 'upper', basis: 'data' }),
        en
      ).line
    ).toBe('< 3.2 (limit)');
    expect(describeUncertain(q(null, { kind: 'failed' }), en).line).toBe(
      'no result'
    );
    expect(describeUncertain(q(2, { kind: 'not-constrained' }), en).line).toBe(
      'not constrained'
    );
  });

  test('a value with nothing stated has no method', () => {
    const d = describeUncertain(q(5, { kind: 'none' }), en);
    expect(d.method).toBeNull();
    expect(d.line).toBe('5.00');
  });

  test('every method has a word and a sentence in both languages', () => {
    const ids = [
      'data',
      'model',
      'scaled',
      'profile',
      'propagated',
      'stated',
      'limit',
      'exact',
    ];
    for (const id of ids)
      for (const t of [en, es]) {
        expect(t(`nb.unc.method.${id}`)).not.toBe(`nb.unc.method.${id}`);
        expect(t(`nb.unc.method.${id}.tip`)).not.toBe(
          `nb.unc.method.${id}.tip`
        );
      }
    expect(es('nb.unc.failed')).not.toBe('nb.unc.failed');
    expect(es('nb.unc.notConstrained')).not.toBe('nb.unc.notConstrained');
  });

  test('the basis names the method; the kind does where there is none', () => {
    expect(uncertaintyMethod({ kind: 'sigma', basis: 'derived' })).toBe(
      'propagated'
    );
    expect(uncertaintyMethod({ kind: 'sigma', basis: 'assumed' })).toBe(
      'stated'
    );
    expect(uncertaintyMethod({ kind: 'model-limited', floor: 1 })).toBe(
      'model'
    );
    expect(uncertaintyMethod({ kind: 'sigma', sigma: 1 })).toBeNull();
  });

  test('Spanish words follow the same pattern', () => {
    const d = describeUncertain(
      q(9.81, { kind: 'sigma', sigma: 0.02, basis: 'scaled' }),
      es,
      { locale: 'es' }
    );
    expect(d.line).toMatch(/\(reescalada\)$/);
  });
});

describe('what prints through it', () => {
  test('a notebook quantity with an envelope says its method, with its unit', () => {
    const said = quantityText(
      { unit: 'm/s' },
      q(9.81, { kind: 'sigma', sigma: 0.02, basis: 'data' }),
      en
    );
    expect(plain(said.line)).toBe('9.810 ± 0.020 m/s (data)');
    expect(plain(said.value)).toBe('9.810 ± 0.020 m/s');
  });

  test('an entry with no envelope, or no stated uncertainty, prints as before', () => {
    expect(quantityText({ unit: 'm' }, undefined, en)).toBeNull();
    expect(quantityText({ unit: 'm' }, q(1, { kind: 'none' }), en)).toBeNull();
  });

  test('a failed quantity has no unit after its words', () => {
    expect(
      quantityText({ unit: 'm' }, q(null, { kind: 'failed' }), en).line
    ).toBe('no result');
  });

  test('a ledger row prints its method, and a bare value as it always did', () => {
    const row = (value, uncertainty) => ({ value, uncertainty });
    expect(
      plain(
        rowValue(
          row(2.5, { kind: 'sigma', sigma: 0.1, basis: 'model' }),
          'en',
          en
        )
      )
    ).toBe('2.50 ± 0.10 (model)');
    expect(rowValue(row(1234.5678, { kind: 'none' }), 'en', en)).toBe(
      '1,234.57'
    );
  });
});
