import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';

import { valid } from './jsonSchemaSubset.js';
import { isItsRow } from './schemaCorpus.js';
import {
  FLAGS_CASES,
  GOOD_GRID,
  GOOD_IMAGE,
  GOOD_SEQUENCE,
  GRID_CASES,
  IMAGE_CASES,
  PACK_CASES,
  SEQUENCE_CASES,
  goodGrid,
  goodImage,
  goodSequence,
} from '../tools/data-kinds-cases.mjs';
import {
  FORMAT_VERSION,
  packPermits,
  validateGrid,
  validateImage,
  validateImageSequence,
} from '../js/dataKinds/contract.js';
import {
  runtimeDisagreement,
  runtimeMeta,
  validateDataPack,
} from '../tools/data-packs/schema.mjs';

// =============================================================================
// Prompt 157: the three formats, their schemas, and the pack manifest that
// carries them
// -----------------------------------------------------------------------------
// A schema states structure; the validator is the authority (the schemas say so).
// Held to each other: whatever the reader accepts the schema accepts, and the
// documents the reader refuses and the schema does not are a list somebody
// chose, below, each with the reason no schema can state it.
// =============================================================================

const schema = name =>
  JSON.parse(readFileSync(`sdk/schemas/${name}.schema.json`, 'utf8'));
const clone = v => JSON.parse(JSON.stringify(v));

describe('each schema is its row in FORMATS.md, at the version the code writes', () => {
  test.each([
    ['image-1', 'gravitas.image'],
    ['image-sequence-1', 'gravitas.image-sequence'],
    ['grid-1', 'gravitas.grid'],
  ])('%s', (file, name) => isItsRow(file, name, FORMAT_VERSION));
});

/**
 * Cases a schema cannot state, by label: arithmetic across fields, an order, a
 * format a string must have, a size against the page's memory, a rule that
 * depends on another field's value.
 */
const VALIDATOR_ONLY = {
  image: [
    // A number's sign and a gain's minimum are not worth three schemas.
    'bit flags with no bits are not a valid image (FLAGS_CASES has the valid ones)',
    'a gain of zero',
    'a negative read noise',
    'an assumed gain with no note',
    'an ISO time that is not one',
    '2,049 pixels square',
    'the mask pushes the frame past 64 MiB',
    'synthetic data without its truth manifest',
    'a flags image without bits',
    'a flags image whose bits have no source',
    'bits on an image that is light',
  ],
  sequence: [
    'times out of order',
    'frame indices not 0..n-1',
    'two time scales in one sequence',
    'a frame that changes the shape',
    'a shared shape that carries a time',
    'a part whose URL lacks the digest',
    'a shape that is itself too large',
  ],
  grid: [
    'an axis out of order',
    'an axis with a repeated value',
    'two axes of one name',
    'two outputs of one name',
    'the data is a value short',
    'the data is a value long',
    'no generator inputs',
    'two axes of 4,096: 16.7 million cells',
    'a part of the wrong size',
    'data and a part together',
    'a keyed layout with no keys',
  ],
};

function agree(s, good, accepts, cases) {
  expect(accepts(clone(good))).toBe(true);
  expect(valid(s, clone(good))).toBe(true);
  const validatorOnly = [];
  for (const [label, change, ok] of cases) {
    const d = clone(good);
    change(d);
    const reader = accepts(clone(d));
    const schemaSays = valid(s, clone(d));
    expect({ label, reader }).toEqual({ label, reader: ok });
    // The reader accepting what the schema refuses would make the schema a lie.
    expect({ label, reader, schemaSays: reader ? schemaSays : true }).toEqual({
      label,
      reader,
      schemaSays: true,
    });
    if (!reader && schemaSays) validatorOnly.push(label);
  }
  return validatorOnly;
}

describe('the schemas and the validators', () => {
  const imageCases = [...IMAGE_CASES, ...FLAGS_CASES].map(
    ([label, change, want]) => [label, change, want.valid]
  );

  test('image: the schema refuses nothing the reader accepts', () => {
    const only = agree(
      schema('image-1'),
      GOOD_IMAGE,
      d => validateImage(d).ok,
      imageCases
    );
    expect(only).toEqual(VALIDATOR_ONLY.image);
  });

  test('image-sequence: the schema refuses nothing the reader accepts', () => {
    const only = agree(
      schema('image-sequence-1'),
      GOOD_SEQUENCE,
      d => validateImageSequence(d).ok,
      SEQUENCE_CASES.map(([l, c, v]) => [l, c, v])
    );
    expect(only).toEqual(VALIDATOR_ONLY.sequence);
  });

  test('grid: the schema refuses nothing the reader accepts', () => {
    const only = agree(
      schema('grid-1'),
      GOOD_GRID,
      d => validateGrid(d).ok,
      GRID_CASES.map(([l, c, v]) => [l, c, v])
    );
    expect(only).toEqual(VALIDATOR_ONLY.grid);
  });
});

describe('data packs of the new kinds', () => {
  const manifest = JSON.parse(
    readFileSync('data-packs/tess-hd209458-s56-aperture.json', 'utf8')
  );
  const kit = {
    image: (w, h) => ({ ...goodImage(), width: w, height: h }),
    sequence: goodSequence,
    grid: goodGrid,
  };

  test('the manifest the cases start from is valid', () => {
    expect(validateDataPack(manifest)).toEqual([]);
  });

  test.each(PACK_CASES.map(c => [c[0], c]))('%s', (_n, [, change, want]) => {
    const m = clone(manifest);
    change(m, kit);
    const problems = validateDataPack(m);
    if (want === true) expect(problems).toEqual([]);
    else {
      expect(problems.length).toBeGreaterThan(0);
      expect(
        problems.some(p => p.path === want || p.path.startsWith(`${want}.`))
      ).toBe(true);
    }
  });

  test('the sdk schema takes the manifests of the new kinds', () => {
    const s = schema('observation-data-pack-1');
    expect(valid(s, manifest)).toBe(true);
    const seq = clone(manifest);
    seq.dataType = 'image-sequence';
    delete seq.image;
    seq.sequence = goodSequence();
    expect(valid(s, seq)).toBe(true);
    const grid = clone(manifest);
    grid.dataType = 'grid';
    delete grid.image;
    grid.grid = goodGrid();
    expect(valid(s, grid)).toBe(true);
    const withSidecar = clone(manifest);
    withSidecar.image.sidecar = kit.image(11, 13);
    expect(valid(s, withSidecar)).toBe(true);
  });

  test('the runtime copy of a new kind must carry its document', () => {
    const seq = clone(manifest);
    seq.dataType = 'image-sequence';
    delete seq.image;
    seq.sequence = goodSequence();
    const runtime = runtimeMeta(seq);
    expect(runtime.sequence).toEqual(seq.sequence);
    expect(runtimeDisagreement(runtime, seq).errors).toEqual([]);
    const bare = { ...runtime };
    delete bare.sequence;
    expect(runtimeDisagreement(bare, seq).errors.join(' ')).toMatch(
      /sequence is required/
    );
    const grid = clone(manifest);
    grid.dataType = 'grid';
    delete grid.image;
    grid.grid = goodGrid();
    const g = { ...runtimeMeta(grid) };
    delete g.grid;
    expect(runtimeDisagreement(g, grid).errors.join(' ')).toMatch(
      /grid is required/
    );
  });

  test('an image pack with no pixel contract is display-only; the aperture pack is one', async () => {
    const { PACK } =
      await import('../js/data/observations/tessHd209458S56Aperture.js');
    expect(packPermits(PACK, 'marking')).toEqual({ ok: true });
    expect(packPermits(PACK, 'photometry')).toMatchObject({
      ok: false,
      code: 'display-only',
    });
    expect(packPermits(PACK, 'astrometry')).toMatchObject({
      ok: false,
      code: 'display-only',
    });
    expect(packPermits(PACK, 'photometry').message).toMatch(
      /states no pixel contract/
    );
    const lc = await import('../js/data/observations/tessHd209458S56.js');
    expect(packPermits(lc.PACK, 'marking')).toMatchObject({
      ok: false,
      code: 'not-an-image',
    });
    const withContract = {
      ...PACK,
      image: { ...PACK.image, sidecar: goodImage() },
    };
    expect(packPermits(withContract, 'photometry')).toEqual({ ok: true });
    expect(() => packPermits(PACK, 'nothing')).toThrow(RangeError);
  });
});
