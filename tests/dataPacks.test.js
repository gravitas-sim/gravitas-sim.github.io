import { describe, test, expect } from '@jest/globals';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { readFits, requireColumns } from '../tools/data-packs/fits.mjs';
import {
  CANONICAL,
  pinProblem,
  pinnedBytes,
  sha256,
} from '../tools/data-packs/pinned.mjs';
import {
  agreesWithPackage,
  runtimeMeta,
  validateDataPack,
} from '../tools/data-packs/schema.mjs';
import {
  binLightCurve,
  foldedDepth,
  TRANSFORM_VERSION,
} from '../tools/data-packs/tess-light-curve.mjs';
import { PACKS } from '../tools/build-data-packs.mjs';
import { checkObservation, observationOf } from '../js/observation.js';
import { loadBuiltin, providerOf } from '../js/platform/resolver.js';
import { precacheLists } from '../tools/build-service-worker.mjs';

// =============================================================================
// Observation data packs: the format, the one production pack, and its record
// -----------------------------------------------------------------------------
// DATA_PACKS.md describes the format and OBSERVATION_DATA_PACK_GATE.md the
// decision. The raw TESS file is not in the repository, so everything here
// runs without it: the committed pack is checked against its manifest, and the
// reader and the transform are checked on synthetic FITS files built below.
// `npm run packs:provenance` is the byte-for-byte rebuild from the real file.
// =============================================================================

const REPO = process.cwd();
const read = rel => readFileSync(path.join(REPO, rel));
const json = rel => JSON.parse(read(rel).toString('utf8'));
const clone = v => JSON.parse(JSON.stringify(v));
const paths = problems => problems.map(p => p.path);
const TESS = PACKS.find(p => p.id === 'tess-hd209458-s56-lc');
const manifest = json(TESS.manifest);

// --- A FITS file, written by hand ---------------------------------------------

const card = (key, value) => {
  const v =
    typeof value === 'string'
      ? `'${value.padEnd(8)}'`
      : value === true
        ? 'T'
        : value === false
          ? 'F'
          : String(value);
  return `${key.padEnd(8)}= ${v.padStart(20)}`.padEnd(80);
};
const block = text => {
  const b = Buffer.alloc(Math.ceil(text.length / 2880) * 2880 || 2880, ' ');
  b.write(text, 'latin1');
  return b;
};
const header = cards =>
  block(cards.map(([k, v]) => card(k, v)).join('') + 'END'.padEnd(80));

/**
 * A light-curve file: a primary header and one BINTABLE with the SPOC columns,
 * big-endian as FITS is, plus a TZERO-scaled column and a repeated one.
 */
function fitsFile(rows, { object = 'TIC 420814525', sector = 56 } = {}) {
  const primary = header([
    ['SIMPLE', true],
    ['BITPIX', 8],
    ['NAXIS', 0],
    ['EXTEND', true],
    ['OBJECT', object],
    ['SECTOR', sector],
  ]);
  const rowBytes = 8 + 4 + 4 + 4 + 4 + 8;
  const data = Buffer.alloc(
    Math.ceil((rowBytes * rows.length) / 2880) * 2880 || 2880
  );
  rows.forEach(([t, f, e, q, u = 0, pair = [0, 0]], i) => {
    const o = i * rowBytes;
    data.writeDoubleBE(t, o);
    data.writeFloatBE(f, o + 8);
    data.writeFloatBE(e, o + 12);
    data.writeInt32BE(q, o + 16);
    data.writeInt32BE(u - 2147483648, o + 20); // unsigned, stored with TZERO
    data.writeFloatBE(pair[0], o + 24);
    data.writeFloatBE(pair[1], o + 28);
  });
  const table = header([
    ['XTENSION', 'BINTABLE'],
    ['BITPIX', 8],
    ['NAXIS', 2],
    ['NAXIS1', rowBytes],
    ['NAXIS2', rows.length],
    ['PCOUNT', 0],
    ['GCOUNT', 1],
    ['TFIELDS', 6],
    ['TTYPE1', 'TIME'],
    ['TFORM1', 'D'],
    ['TUNIT1', 'BJD - 2457000, days'],
    ['TTYPE2', 'PDCSAP_FLUX'],
    ['TFORM2', 'E'],
    ['TUNIT2', 'e-/s'],
    ['TTYPE3', 'PDCSAP_FLUX_ERR'],
    ['TFORM3', 'E'],
    ['TTYPE4', 'QUALITY'],
    ['TFORM4', 'J'],
    ['TTYPE5', 'CADENCENO'],
    ['TFORM5', 'J'],
    ['TZERO5', 2147483648],
    ['TTYPE6', 'CENTROID'],
    ['TFORM6', '2E'],
    ['EXTNAME', 'LIGHTCURVE'],
    ['TIMESYS', 'TDB'],
  ]);
  return new Uint8Array(Buffer.concat([primary, table, data]));
}

/** Two-minute cadences over `days`, a box transit of `depth` every `period`. */
function transitRows({
  days = 6,
  period = 2,
  depth = 0.01,
  duration = 0.1,
} = {}) {
  const rows = [];
  const dt = 2 / 1440;
  for (let i = 0; i * dt < days; i++) {
    const t = 1000 + i * dt;
    const phase = ((t % period) + period) % period;
    rows.push([
      t,
      phase < duration ? 1000 * (1 - depth) : 1000,
      0.5,
      0,
      3000000000 + i,
    ]);
  }
  return rows;
}

// --- The format ----------------------------------------------------------------

describe('the manifest format', () => {
  test('every pack has a valid manifest, and it is the one the tool pins', () => {
    for (const pack of PACKS) {
      const m = json(pack.manifest);
      expect(validateDataPack(m)).toEqual([]);
      expect(m.id).toBe(pack.id);
      expect(m.raw).toEqual(pack.raw);
      expect(m.transformation.version).toBe(pack.transformVersion);
    }
    expect(TESS.transformVersion).toBe(TRANSFORM_VERSION);
  });

  test('synthetic data is refused however complete its manifest is', () => {
    expect(
      paths(validateDataPack({ ...clone(manifest), origin: 'synthetic' }))
    ).toEqual(['origin']);
  });

  test('restricted data is refused, and a status that is not a licence needs its basis', () => {
    expect(
      paths(
        validateDataPack({
          ...clone(manifest),
          license: { status: 'restricted', statement: 'x' },
        })
      )
    ).toEqual(['license.status']);
    const cited = clone(manifest);
    cited.license = { status: 'attribution-requested', statement: 'cite us' };
    expect(paths(validateDataPack(cited))).toEqual(['license.basis']);
    cited.license.basis = 'a published table, cited';
    expect(validateDataPack(cited)).toEqual([]);
  });

  test('a time series without a time system, and a transformation without a version, are refused', () => {
    const m = clone(manifest);
    delete m.time.scale;
    m.transformation.version = 'latest';
    expect(paths(validateDataPack(m)).sort()).toEqual([
      'time.scale',
      'transformation.version',
    ]);
  });

  test('raw products are pinned by size and hash, or by a named canonical form', () => {
    const m = clone(manifest);
    delete m.raw[0].bytes;
    expect(paths(validateDataPack(m))).toEqual(['raw[0].bytes']);
    m.raw[0].canonical = 'data-lines';
    expect(validateDataPack(m)).toEqual([]);
    m.raw[0].canonical = 'whatever-changed';
    expect(paths(validateDataPack(m))).toEqual(['raw[0].canonical']);
  });

  test('a derived file outside js/data/, and coordinates without a frame, are refused', () => {
    const m = clone(manifest);
    m.derived.file = 'vendor/x.js';
    delete m.object.frame;
    expect(paths(validateDataPack(m)).sort()).toEqual([
      'derived.file',
      'object.frame',
    ]);
  });

  test('the pack and the capability package that ships it must agree', () => {
    const pkg = json(TESS.capability);
    expect(agreesWithPackage(manifest, pkg, TESS.manifest)).toEqual([]);
    const other = clone(pkg);
    other.assets[0].offline = 'core';
    expect(paths(agreesWithPackage(manifest, other, TESS.manifest))).toEqual([
      'offline',
    ]);
    other.provides.dataPacks[0].provenance = 'elsewhere.json';
    expect(paths(agreesWithPackage(manifest, other, TESS.manifest))).toEqual([
      'id',
      'offline',
    ]);
  });
});

// --- The TESS pack: units, time, flags -----------------------------------------

describe('the TESS HD 209458 pack', () => {
  test('its runtime metadata is exactly the manifest’s runtime fields', async () => {
    const mod = await import('../js/data/observations/tessHd209458S56.js');
    expect(mod.PACK).toEqual(runtimeMeta(manifest));
    expect(Object.keys(mod).sort()).toEqual(['PACK', 'SERIES']);
    // Nothing a reader never sees: no pins, URLs or transformation in the browser copy.
    expect(JSON.stringify(mod.PACK)).not.toMatch(
      /sha256|mast\.stsci\.edu|transformation/
    );
  });

  test('time is BTJD in TDB, flux is dimensionless, and the error says what it is of', () => {
    expect(manifest.time).toEqual({
      scale: 'TDB',
      reference: 'BTJD = BJD - 2457000',
      unit: 'd',
    });
    expect(manifest.columns.map(c => [c.name, c.unit])).toEqual([
      ['time', 'd'],
      ['flux', ''],
      ['flux error', ''],
    ]);
    expect(manifest.columns[2].uncertaintyOf).toBe('flux');
  });

  test('every cadence is accounted for: flagged, not finite, or kept', () => {
    const r = manifest.transformation.record;
    expect(r.flagged + r.notFinite + r.kept).toBe(r.cadences);
    expect(manifest.masks.map(k => k.dropped)).toEqual([
      r.flagged,
      r.notFinite,
      r.binsDropped,
    ]);
    expect(r.flagged).toBeGreaterThan(0);
  });

  test('it decodes to a clean series inside sector 56, at the published depth', async () => {
    const o = observationOf(
      await import('../js/data/observations/tessHd209458S56.js')
    );
    expect(checkObservation(o)).toEqual([]);
    expect(o.x.values.length).toBe(manifest.transformation.record.bins);
    expect(o.x.values[0]).toBeGreaterThan(2825); // 2022 September 2, in BTJD
    expect(o.x.values.at(-1)).toBeLessThan(2854);
    expect(o.x.scale).toBe('TDB');
    expect(o.source).toMatchObject({
      kind: 'pack',
      id: TESS.id,
      version: '1.0.0',
    });
    const depth = foldedDepth(o, TESS.period.value);
    expect(Math.abs(depth - TESS.radiusRatioSquared.value)).toBeLessThanOrEqual(
      TESS.depthTolerance
    );
    expect(Number(depth.toFixed(5))).toBe(
      manifest.validation.result.foldedDepth
    );
  });

  test('it is reached through its capability package and nothing else', async () => {
    expect(providerOf('dataPacks', TESS.id)).toBe('gravitas.tess-hd209458-s56');
    const mod = await loadBuiltin('builtin:data/tess-hd209458-s56');
    expect(mod.PACK.id).toBe(TESS.id);
    // Content only: the module imports nothing.
    expect(read(TESS.module).toString('utf8')).not.toMatch(/^\s*import\b/m);
  });
});

// --- Tampering -------------------------------------------------------------------

/** The check tool and what it reads, copied, so it can be run against a fault. */
function copyForCheck() {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'gravitas-packs-')));
  for (const rel of [
    'tools/build-data-packs.mjs',
    'tools/data-packs',
    'js/observation.js',
    // The aperture pack's check projects pixels through its world coordinates.
    'js/observatory/wcs.js',
    'js/data/observations',
    'data-packs',
    'capabilities',
  ]) {
    cpSync(path.join(REPO, rel), path.join(dir, rel), { recursive: true });
  }
  return dir;
}
const runCheck = dir => {
  try {
    execFileSync(
      'node',
      [path.join(dir, 'tools/build-data-packs.mjs'), '--check'],
      { stdio: 'pipe' }
    );
    return { ok: true, out: '' };
  } catch (err) {
    return { ok: false, out: String(err.stderr) };
  }
};

describe('a pack changed after it was built is caught', () => {
  test('the untouched copy passes', () => {
    expect(runCheck(copyForCheck())).toEqual({ ok: true, out: '' });
  });

  test('one byte of the committed series', () => {
    const dir = copyForCheck();
    const file = path.join(dir, TESS.module);
    const text = readFileSync(file, 'utf8');
    const at = text.indexOf("flux: '") + 20;
    writeFileSync(
      file,
      text.slice(0, at) + (text[at] === 'A' ? 'B' : 'A') + text.slice(at + 1)
    );
    const { ok, out } = runCheck(dir);
    expect(ok).toBe(false);
    expect(out).toContain(
      `${TESS.module} is not the file its manifest records`
    );
  });

  test('a raw pin edited in the manifest', () => {
    const dir = copyForCheck();
    const file = path.join(dir, TESS.manifest);
    const m = JSON.parse(readFileSync(file, 'utf8'));
    m.raw[0].sha256 = '0'.repeat(64);
    writeFileSync(file, JSON.stringify(m, null, 2));
    expect(runCheck(dir).out).toContain(
      'the manifest pins different raw products from the tool'
    );
  });

  test('a manifest that says something its runtime copy does not', () => {
    const dir = copyForCheck();
    const file = path.join(dir, TESS.manifest);
    const m = JSON.parse(readFileSync(file, 'utf8'));
    m.credit = 'somebody else';
    writeFileSync(file, JSON.stringify(m, null, 2));
    expect(runCheck(dir).out).toContain(
      "the module's PACK is not the manifest's runtime fields"
    );
  });

  test('a capability package that changes the offline class alone', () => {
    const dir = copyForCheck();
    const file = path.join(dir, TESS.capability);
    const pkg = JSON.parse(readFileSync(file, 'utf8'));
    pkg.assets[0].offline = 'core';
    writeFileSync(file, JSON.stringify(pkg, null, 2));
    expect(runCheck(dir).out).toContain(
      'offline is optional; gravitas.tess-hd209458-s56 says core'
    );
  });
});

// --- Pinning ---------------------------------------------------------------------

describe('a raw product is used only when it is the pinned one', () => {
  const bytes = Buffer.from(
    '#INFO request_date=2026-09-24\nHD1\t1\t2\nHD1\t2\t3\n'
  );
  const pin = {
    file: 'x.tsv',
    url: 'https://example.invalid/x',
    bytes: bytes.length,
    sha256: sha256(bytes),
  };

  test('size and hash, and a canonical form that ignores the dated header', () => {
    expect(pinProblem(bytes, pin)).toBeNull();
    expect(pinProblem(Buffer.concat([bytes, Buffer.from('x')]), pin)).toMatch(
      /bytes, not the pinned/
    );
    const canonical = {
      file: 'x.tsv',
      canonical: 'data-lines',
      sha256: sha256(CANONICAL['data-lines'](bytes)),
    };
    const redated = Buffer.from(
      bytes.toString().replace('2026-09-24', '2027-01-01')
    );
    expect(pinProblem(redated, canonical)).toBeNull();
    expect(
      pinProblem(
        Buffer.from(redated.toString().replace('\t3', '\t4')),
        canonical
      )
    ).toMatch(/data-lines are/);
  });

  test('a cached file that is not the pin is refused, and so is a download, which is never cached', async () => {
    const cache = realpathSync(
      mkdtempSync(path.join(tmpdir(), 'gravitas-pin-'))
    );
    writeFileSync(
      path.join(cache, 'x.tsv'),
      Buffer.concat([bytes, Buffer.from('!')])
    );
    await expect(pinnedBytes(pin, { cache })).rejects.toThrow(/not the pinned/);

    const empty = realpathSync(
      mkdtempSync(path.join(tmpdir(), 'gravitas-pin-'))
    );
    await expect(pinnedBytes(pin, { cache: empty })).rejects.toThrow(
      /npm run packs:data/
    );
    const served = async () => ({
      ok: true,
      arrayBuffer: async () => Buffer.from('something else'),
    });
    await expect(
      pinnedBytes(pin, { cache: empty, offline: false, fetchImpl: served })
    ).rejects.toThrow(/served different bytes/);
    await expect(pinnedBytes(pin, { cache: empty })).rejects.toThrow(
      /is not in/
    );
    const right = async () => ({ ok: true, arrayBuffer: async () => bytes });
    expect(
      Buffer.from(
        await pinnedBytes(pin, {
          cache: empty,
          offline: false,
          fetchImpl: right,
        })
      )
    ).toEqual(bytes);
    expect(Buffer.from(await pinnedBytes(pin, { cache: empty }))).toEqual(
      bytes
    );
  });
});

// --- The reader and the transform, on files built by hand ----------------------

describe('the FITS reader', () => {
  test('reads the columns a light curve uses, big-endian, with TZERO applied', () => {
    const units = readFits(
      fitsFile([[1000.5, 1234.5, 1.5, 0, 3000000001, [7, 8]]])
    );
    expect(units.map(u => u.cards.EXTNAME ?? 'PRIMARY')).toEqual([
      'PRIMARY',
      'LIGHTCURVE',
    ]);
    const { columns, unread } = units[1];
    expect(columns.TIME.values).toEqual([1000.5]);
    expect(columns.PDCSAP_FLUX.values).toEqual([1234.5]);
    expect(columns.PDCSAP_FLUX.unit).toBe('e-/s');
    expect(columns.CADENCENO.values).toEqual([3000000001]); // an unsigned 32-bit value
    expect(unread).toEqual([{ name: 'CENTROID', form: '2E' }]);
  });

  test('names what it will not read rather than guessing at it', () => {
    const [, lc] = readFits(fitsFile([[1, 1, 1, 0]]));
    expect(() => requireColumns(lc, ['CENTROID'])).toThrow(
      'column CENTROID is 2E, which this reader does not read'
    );
    expect(() => requireColumns(lc, ['SAP_FLUX'])).toThrow(
      'column SAP_FLUX is not in the table'
    );
    expect(() => readFits(new Uint8Array(2880))).toThrow(/not a FITS file/);
    const noEnd = Buffer.from(fitsFile([[1, 1, 1, 0]]));
    noEnd.fill(' ', 0, 2880);
    noEnd.write(card('SIMPLE', true), 0, 'latin1');
    expect(() => readFits(new Uint8Array(noEnd.subarray(0, 2880)))).toThrow(
      /no END card/
    );
  });
});

describe('the TESS transform', () => {
  const options = { binMinutes: 20, minPerBin: 3, errStepPpm: 5 };

  test('is repeatable: the same file gives the same series, byte for byte', () => {
    const file = fitsFile(transitRows());
    const a = binLightCurve(readFits(file), options);
    const b = binLightCurve(readFits(fitsFile(transitRows())), options);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test('keeps only good cadences, drops thin bins, and says how many of each', () => {
    const rows = transitRows({ days: 1 });
    rows[5][3] = 128; // a quality flag
    rows[6][1] = NaN;
    rows.push([rows.at(-1)[0] + 1, 1000, 0.5, 0]); // alone in its bin, a day later
    const { series, record } = binLightCurve(readFits(fitsFile(rows)), options);
    expect(record).toMatchObject({
      cadences: rows.length,
      flagged: 1,
      notFinite: 1,
      kept: rows.length - 2,
      binsDropped: 1,
    });
    expect(series.runs).toHaveLength(1);
    expect(series.n).toBe(series.runs[0][1]);
  });

  test('recovers a box transit of known depth, through the encoding', () => {
    const { series } = binLightCurve(
      readFits(fitsFile(transitRows({ depth: 0.012 }))),
      options
    );
    const o = observationOf({
      PACK: { columns: manifest.columns, time: manifest.time },
      SERIES: series,
    });
    expect(checkObservation(o)).toEqual([]);
    expect(foldedDepth(o, 2)).toBeCloseTo(0.012, 4);
    // The error: 0.5 over a median of 1000, averaged over 10 cadences, in 5 ppm steps.
    expect(o.err[0]).toBeCloseTo(0.0005 / Math.sqrt(10), 5);
  });

  test('refuses flux the encoding cannot hold, instead of clipping it', () => {
    const rows = transitRows({ depth: 0.05 }); // 5 %, beyond int16 parts per million
    expect(() => binLightCurve(readFits(fitsFile(rows)), options)).toThrow(
      /do not fit the encoding/
    );
  });
});

// --- Rights, offline, reach ------------------------------------------------------

describe('what a pack owes, and where it goes', () => {
  const notice = read('NOTICE').toString('utf8');
  const licenses = read('LICENSES.md').toString('utf8');

  test('every citation with a DOI is in NOTICE, and LICENSES.md names the scope', () => {
    for (const pack of PACKS) {
      const m = json(pack.manifest);
      for (const c of m.source.citations.filter(c => c.doi))
        expect(notice).toContain(c.doi);
      const pkg = json(pack.capability);
      for (const l of pkg.licenses) {
        expect(licenses).toContain(`\`${l.scope}\``);
        expect(pack.module.startsWith(l.scope.replace('**', ''))).toBe(true);
      }
      expect(m.license.status).not.toBe('restricted');
    }
  });

  test('no module but the builtin registry names a pack, so no route loads one it did not ask for', () => {
    const files = execFileSync('git', ['ls-files', 'js'], { encoding: 'utf8' })
      .split('\n')
      .filter(f => f.endsWith('.js'));
    for (const pack of PACKS) {
      const name = path.basename(pack.module);
      const naming = files.filter(
        f => f !== pack.module && read(f).toString('utf8').includes(name)
      );
      expect(naming).toEqual(['js/platform/builtins.js']);
    }
  });

  test('the pack is precached as optional, and its record is not precached at all', async () => {
    const { core, optional } = await precacheLists();
    for (const pack of PACKS) {
      expect(optional).toContain(pack.module);
      expect(core).not.toContain(pack.module);
      expect([...core, ...optional]).not.toContain(pack.manifest);
    }
  });
});
