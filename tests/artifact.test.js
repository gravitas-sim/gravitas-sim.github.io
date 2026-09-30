// =============================================================================
// gravitas.artifact/1: what the envelope refuses, and why
// -----------------------------------------------------------------------------
// js/platform/artifact.js is the authority; tests/sdkContract.test.js holds its
// JSON Schema to it. This holds each rule: a quantity is a finite number, in a
// unit of the registry named by its id, with an uncertainty that says what it
// is (or that there is none) and an origin from one vocabulary.
// =============================================================================

import { describe, test, expect } from '@jest/globals';

import { artifact, validateArtifact } from '../js/platform/artifact.js';

const measured = (over = {}) => ({
  id: 'depth',
  value: 0.0146,
  unit: '',
  uncertainty: { kind: 'sigma', sigma: 0.0003, basis: 'data' },
  origin: 'measured',
  ...over,
});
const make = quantities =>
  artifact({
    id: 'r',
    source: { kind: 'pipeline', id: 'hd209458-s56' },
    quantities,
  });
const codes = doc => validateArtifact(doc).map(p => `${p.path} ${p.code}`);

describe('an envelope', () => {
  test('a measured quantity with its sigma is one', () => {
    expect(validateArtifact(make([measured()]))).toEqual([]);
  });

  test('says what made it and from what', () => {
    const doc = make([measured()]);
    expect(doc.made.app).toBe('gravitas');
    expect(codes({ ...doc, source: { kind: 'guess', id: 'x' } })).toEqual([
      'source.kind enum',
    ]);
    expect(codes({ ...doc, source: { ...doc.source, digest: 'xyz' } })).toEqual(
      ['source.digest digest']
    );
    expect(codes({ ...doc, format: 'gravitas.other' })).toEqual([
      'format format',
    ]);
  });
});

describe('a quantity', () => {
  test('is a finite number', () => {
    expect(codes(make([measured({ value: NaN })]))).toEqual([
      'quantities[0].value number',
    ]);
    expect(codes(make([measured({ value: '0.0146' })]))).toEqual([
      'quantities[0].value number',
    ]);
  });

  test('names its unit by registry id, not by a spelling of it', () => {
    expect(codes(make([measured({ unit: 'd' })]))).toEqual([]);
    expect(codes(make([measured({ unit: 'days' })]))).toEqual([
      'quantities[0].unit unit',
    ]);
    expect(codes(make([measured({ unit: 'furlongs' })]))).toEqual([
      'quantities[0].unit unit',
    ]);
  });

  test('has an origin from the one vocabulary', () => {
    expect(codes(make([measured({ origin: 'synthetic' })]))).toEqual([]);
    expect(codes(make([measured({ origin: 'observed' })]))).toEqual([
      'quantities[0].origin enum',
    ]);
  });

  test('says what its uncertainty is, or that there is none', () => {
    expect(codes(make([measured({ uncertainty: { kind: 'none' } })]))).toEqual(
      []
    );
    expect(codes(make([measured({ uncertainty: undefined })]))).toEqual([
      'quantities[0].uncertainty required',
    ]);
    expect(
      codes(make([measured({ uncertainty: { kind: 'sigma', sigma: 1 } })]))
    ).toEqual(['quantities[0].uncertainty.basis enum']);
    expect(
      codes(
        make([
          measured({
            uncertainty: { kind: 'interval', lo: 2, hi: 1, basis: 'profile' },
          }),
        ])
      )
    ).toEqual(['quantities[0].uncertainty.lo interval']);
    expect(
      codes(
        make([
          measured({
            uncertainty: {
              kind: 'interval',
              lo: 1,
              hi: 2,
              level: 95,
              basis: 'profile',
            },
          }),
        ])
      )
    ).toEqual(['quantities[0].uncertainty.level number']);
  });

  test('is named once', () => {
    expect(codes(make([measured(), measured()]))).toEqual([
      'quantities[1].id duplicate',
    ]);
  });
});
