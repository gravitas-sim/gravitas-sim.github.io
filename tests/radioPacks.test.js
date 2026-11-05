import { describe, test, expect } from '@jest/globals';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import {
  NANOGRAV_15YR,
  parsePar,
  pulsarRows,
  tarMembers,
} from '../tools/data-packs/radio.mjs';
import { sha256 } from '../tools/data-packs/pinned.mjs';
import { tableOf } from '../js/tableObservation.js';
import { isUnit } from '../js/units/registry.js';
import { validateDataPack } from '../tools/data-packs/schema.mjs';
import {
  NEVER_PRECACHED,
  precacheLists,
} from '../tools/build-service-worker.mjs';

// =============================================================================
// Prompt 240: the NANOGrav 15-year pulsars pack
// -----------------------------------------------------------------------------
// The transform is tested on archives and timing models built here (the 639 MB
// release is not in the repository; `npm run packs:provenance` rebuilds the pack
// from it). The committed pack is tested for what it records and what it says of
// its rights. No number from a source is typed from memory: the values pinned
// below are the ones the release's files held when they were read on 2026-11-05,
// and a mismatch means the files or the transform changed.
// =============================================================================

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8');
const json = rel => JSON.parse(read(rel));

// --- A tar writer, enough to test the reader -------------------------------------

function header({ name, prefix = '', size = 0, type = '0' }) {
  const b = Buffer.alloc(512);
  b.write(name, 0, 'latin1');
  b.write('0000644\0', 100);
  b.write('0000000\0', 108);
  b.write('0000000\0', 116);
  b.write(`${size.toString(8).padStart(11, '0')}\0`, 124);
  b.write('00000000000\0', 136);
  b.write('        ', 148);
  b.write(type, 156);
  b.write('ustar\0', 257);
  b.write('00', 263);
  b.write(prefix, 345, 'latin1');
  let sum = 0;
  for (const v of b) sum += v;
  b.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148);
  return b;
}

function member(entry, body = Buffer.alloc(0)) {
  const data = Buffer.from(body);
  const pad = Buffer.alloc((512 - (data.length % 512)) % 512);
  return Buffer.concat([header({ ...entry, size: data.length }), data, pad]);
}

const tar = (...members) =>
  gzipSync(Buffer.concat([...members, Buffer.alloc(1024)]));

describe('the tar reader', () => {
  const big = Buffer.alloc(3000, 7);

  test('keeps the members asked for and skips the rest, whatever their size or padding', async () => {
    const gz = tar(
      member({ name: 'd/', type: '5' }),
      member({ name: 'd/skip.bin' }, big),
      member({ name: 'd/a.par' }, 'PSR J0000+0000\n'),
      member({ name: 'd/empty.par' }),
      member({ name: 'd/b.par' }, big.subarray(0, 512))
    );
    const got = await tarMembers(gz, p => p.endsWith('.par'));
    expect([...got.keys()]).toEqual(['d/a.par', 'd/empty.par', 'd/b.par']);
    expect(got.get('d/a.par').toString()).toBe('PSR J0000+0000\n');
    expect(got.get('d/empty.par').length).toBe(0);
    expect(got.get('d/b.par').equals(big.subarray(0, 512))).toBe(true);
  });

  test('joins a ustar prefix to the name, and reads a pax path', async () => {
    const long = 'x'.repeat(120);
    const record = ` path=${long}/c.par\n`;
    const pax = `${String(record.length + String(record.length + 2).length)}${record}`;
    const gz = tar(
      member({ name: 'c.par', prefix: 'deep/dir' }, 'one'),
      member({ name: 'PaxHeader', type: 'x' }, pax),
      member({ name: 'short' }, 'two')
    );
    const got = await tarMembers(gz, () => true);
    expect(got.get('deep/dir/c.par').toString()).toBe('one');
    expect(got.get(`${long}/c.par`).toString()).toBe('two');
  });

  test('refuses a header that fails its checksum and an archive that stops inside a member', async () => {
    const good = Buffer.concat([
      member({ name: 'a' }, 'hello'),
      Buffer.alloc(1024),
    ]);
    const bad = Buffer.from(good);
    bad[0] ^= 0xff;
    await expect(tarMembers(gzipSync(bad), () => true)).rejects.toThrow(
      /checksum/
    );
    await expect(
      tarMembers(gzipSync(good.subarray(0, 520)), () => true)
    ).rejects.toThrow(/ended inside/);
  });
});

// --- A timing model ----------------------------------------------------------------

const par = ({
  psr = 'J0001+0001',
  f0 = '200.5 1 1e-13',
  dm = '10.0',
  dmdata = 'N',
  dmx = [0.1, 0.3],
  extra = '',
} = {}) =>
  [
    '# a comment',
    `PSR ${psr}`,
    'UNITS TDB',
    `DMDATA ${dmdata}`,
    `F0 ${f0}`,
    'PEPOCH 56231.0',
    `DM ${dm}`,
    'DM1 0.0',
    'DMEPOCH 56231.0',
    'DMX 6.5',
    ...dmx.flatMap((v, i) => [
      `DMX_${String(i + 1).padStart(4, '0')} ${v} 1 0.007`,
      `DMXR1_${String(i + 1).padStart(4, '0')} 53000.0`,
    ]),
    extra,
  ].join('\n');

describe('a par file', () => {
  test('keeps the first occurrence of a name and every DMX offset, and not DMX or DMXR1', () => {
    const p = parsePar(par({ extra: 'F0 999 1 1\nPSR OTHER' }));
    expect(p).toMatchObject({
      psr: 'J0001+0001',
      f0: 200.5,
      dm: 10,
      dmFlag: null,
      dmUncertainty: null,
      dmdata: 'N',
      units: 'TDB',
    });
    expect(p.dmx).toEqual([0.1, 0.3]);
  });

  test('reads a frozen DM with its uncertainty', () => {
    const p = parsePar(par({ dm: '49.37 0 5.6e-05' }));
    expect(p).toMatchObject({ dm: 49.37, dmFlag: '0', dmUncertainty: 5.6e-5 });
  });

  test('refuses what the pack would misstate', () => {
    expect(() => parsePar(par({ f0: '200.5 0 1e-13' }))).toThrow(
      /not a fitted/
    );
    expect(() => parsePar(par({ dm: '10 1 0.1' }))).toThrow(/fitted parameter/);
    expect(() =>
      parsePar(par({ extra: 'DM1 1e-3' }).replace('DM1 0.0\n', ''))
    ).toThrow(/nonzero DM1/);
    expect(() => parsePar(par().replace('PSR J0001+0001\n', ''))).toThrow(
      /no PSR/
    );
    expect(() => parsePar(par({ dm: 'abc' }))).toThrow(/not a number/);
  });
});

describe('the rows', () => {
  const files = (names, make) => new Map(names.map(n => [`${n}.par`, make(n)]));
  const narrow = names =>
    files(names, n => par({ psr: n, dm: '10', dmx: [0.1, 0.3, 0.5] }));
  const wide = names =>
    files(names, n =>
      par({ psr: n, dm: '10.2', dmdata: 'Y', dmx: [0.0, 0.2, 0.4] })
    );

  test('one row per pulsar, the single-telescope models left out, the DM as baseline plus the mean offset', () => {
    const names = ['J2', 'B1', 'J2ao', 'J2gbt', 'J3gbt'];
    // J3gbt has no J3 beside it: a pulsar of its own name, so it is a row.
    const {
      rows,
      names: kept,
      record,
    } = pulsarRows(narrow(names), wide(names));
    expect(kept).toEqual(['B1', 'J2', 'J3gbt']);
    expect(record.singleTelescopeModelsLeftOut).toEqual(['J2ao', 'J2gbt']);
    const r = rows[1];
    expect(r.f0).toBe(200.5);
    expect(r.dm).toBeCloseTo(10.3, 12);
    expect(r.dm_wb).toBeCloseTo(10.4, 12);
    // DM + DMX over three epochs is 10.1, 10.3, 10.5: sample sd 0.2.
    expect(r.dmx_std).toBeCloseTo(0.2, 12);
    expect(r.dmx_n).toBe(3);
    expect(record.worstF0RelativeDifference).toBe(0);
    expect(record.medianDmDifference).toBeCloseTo(0.1, 12);
  });

  test('refuses sets that disagree about the pulsars, a narrowband file that is wideband, or too few epochs', () => {
    expect(() => pulsarRows(narrow(['A']), wide(['B']))).toThrow(
      /different pulsars/
    );
    expect(() => pulsarRows(wide(['A']), wide(['A']))).toThrow(/DMDATA Y/);
    expect(() => pulsarRows(narrow(['A']), narrow(['A']))).toThrow(/DMDATA N/);
    const one = new Map([['A.par', par({ psr: 'A', dmx: [0.1] })]]);
    expect(() => pulsarRows(one, wide(['A']))).toThrow(/fewer than two/);
    expect(() =>
      pulsarRows(
        new Map([
          ['a.par', par({ psr: 'A' })],
          ['b.par', par({ psr: 'A' })],
        ]),
        wide(['A'])
      )
    ).toThrow(/two narrowband files/);
  });
});

// --- The committed pack ----------------------------------------------------------------

describe('the NANOGrav 15-year pulsars pack', () => {
  const m = json('data-packs/nanograv-15yr-pulsars.json');
  const side = read('radio/nanograv-15yr-pulsars.json');
  const table = tableOf({ PACK: m, SERIES: JSON.parse(side) });
  const col = id => table.columns.find(c => c.id === id).values;

  test('is a valid manifest for the release the gate released, and says so', () => {
    expect(validateDataPack(m)).toEqual([]);
    expect(m).toMatchObject({
      id: 'nanograv-15yr-pulsars',
      dataType: 'catalog',
      origin: 'compilation',
      offline: 'none',
      license: { status: 'cc-by-4.0' },
    });
    expect(m.raw).toEqual([
      {
        file: 'NANOGrav15yr_PulsarTiming_v2.1.0.tar.gz',
        url: 'https://zenodo.org/api/records/16051178/files/NANOGrav15yr_PulsarTiming_v2.1.0.tar.gz/content',
        bytes: 638719668,
        sha256:
          '91476bf20d4c8baa9f5ad39c6e114b581478a5a7e269876489cafc8f62c5708f',
      },
    ]);
    expect(m.license.statement).toMatch(/CC BY 4\.0/);
    expect(m.license.statement).toMatch(/10\.5281\/zenodo\.16051178/);
    expect(m.source.citations.map(c => c.doi)).toEqual([
      '10.5281/zenodo.16051178',
      '10.5281/zenodo.7967584',
      '10.3847/2041-8213/acda9a',
    ]);
    expect(JSON.stringify(m)).not.toMatch(/\/Users\//);
  });

  test('has 68 pulsars, named in order, in a sidecar the manifest pins', () => {
    expect(table.n).toBe(68);
    const names = m.object.identifiers;
    expect(names).toHaveLength(68);
    expect(names).toEqual([...names].sort());
    expect(names).not.toContain('J1713+0747ao');
    expect(names).toContain('J1713+0747');
    expect(m.derived.sidecar).toEqual({
      file: 'radio/nanograv-15yr-pulsars.json',
      bytes: Buffer.byteLength(side),
      sha256: sha256(side),
    });
    expect(m.transformation.record.membersRead).toBe(152);
  });

  test('carries units the registry knows, and states that the files do not', () => {
    for (const c of m.columns) expect(isUnit(c.unit)).toBe(true);
    expect(m.columns.map(c => c.unit)).toEqual([
      'Hz',
      'pc/cm3',
      'pc/cm3',
      'pc/cm3',
      '',
    ]);
    expect(m.assumptions[0]).toMatch(/do not state them/);
    expect(m.object.frame).toMatch(/does not restate/);
  });

  test('holds the values the files held, to the encoding the manifest states', () => {
    const at = name => m.object.identifiers.indexOf(name);
    // J0030+0451's narrowband F0 line read 205.53069907954086655 and its DM 4.365025770649552044.
    expect(
      Math.abs(col('f0')[at('J0030+0451')] - 205.53069907954087)
    ).toBeLessThan(5e-7);
    expect(Math.abs(col('dm')[at('J0030+0451')] - 4.365)).toBeLessThan(0.01);
    for (const c of m.transformation.record.columns)
      expect(c.maxRounding).toBeLessThanOrEqual(c.step / 2 + 1e-12);
    expect(Math.min(...col('f0'))).toBeGreaterThan(29);
    expect(Math.max(...col('f0'))).toBeLessThan(642);
  });

  test('records what is not here: no DM uncertainty column, and the three disagreeing pulsars named', () => {
    expect(m.columns.some(c => /uncertain|error/i.test(c.name))).toBe(false);
    expect(m.reductions.join(' ')).toMatch(/column is not shipped/);
    expect(
      m.transformation.record.dmDifferenceOverHalf.map(d => d[0]).sort()
    ).toEqual(['J0610-2100', 'J1022+1001', 'J1024-0719']);
    expect(m.validation.result.dmAgreeWithin0p1).toBeGreaterThanOrEqual(60);
  });

  test('is in no precache tier, sidecar or record, and the record is held out by name', async () => {
    const { core, optional, idle } = await precacheLists();
    const all = [...core, ...optional, ...idle];
    for (const f of [
      m.derived.file,
      m.derived.sidecar.file,
      'data-packs/nanograv-15yr-pulsars.json',
    ])
      expect(all).not.toContain(f);
    expect(NEVER_PRECACHED.some(re => re.test(m.derived.file))).toBe(true);
    expect(read('build.js')).toContain(`'${m.derived.sidecar.file}'`);
  });

  test('is a pack of the tool that built it, and nothing fetches at run time', () => {
    expect(NANOGRAV_15YR.manifest).toBe(
      'data-packs/nanograv-15yr-pulsars.json'
    );
    expect(m.transformation.script).toBe('tools/data-packs/radio.mjs');
    expect(read('tools/data-packs/radio.mjs')).not.toMatch(/\bfetch\(/);
    expect(read(m.derived.file)).not.toMatch(/\bfetch\(/);
  });

  test('has its rights line in LICENSES.md and NOTICE', () => {
    expect(read('LICENSES.md')).toContain(
      '`js/data/observations/nanograv15yrPulsars.js`'
    );
    const notice = read('NOTICE');
    expect(notice).toContain('nanograv-15yr-pulsars:');
    expect(notice).toContain('10.3847/2041-8213/acda9a');
  });
});
