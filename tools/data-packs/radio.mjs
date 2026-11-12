// =============================================================================
// Radio: the NANOGrav 15-year pulsars' spin frequencies and dispersion measures
// (Roadmap III Prompt 240; the only radio source the Prompt 239 gate released)
// -----------------------------------------------------------------------------
//   nanograv-15yr-pulsars   the 68 pulsars of the NANOGrav 15-year data set
//                           (Agazie et al. 2023, ApJL 951, L9), release v2.1.0
//                           (Zenodo 10.5281/zenodo.16051178, CC BY 4.0): each
//                           pulsar's spin frequency and dispersion measure as
//                           its published timing model states them
//
// The raw product is the release's tar.gz (638,719,668 bytes), pinned by size and
// SHA-256. The transform reads two members per pulsar, its narrowband and its
// wideband timing model (`narrowband/par/*.nb.par`, `wideband/par/*.wb.par`), and
// writes a table whose rows are a sidecar the page would fetch (`radio/*.json`),
// so that no budget that counts JavaScript counts it (as tools/data-packs/activity.mjs).
// Nothing here fetches at run time; `npm run packs:data` fetches the archive once.
//
// What the files do and do not say (D-R10-240-02): they carry no units, so the
// two units are the par-file convention of tempo2 and PINT; the dispersion measure
// of a pulsar is not the file's DM line alone (that is a fixed baseline, and the
// per-epoch DMX offsets, fitted, carry the variation), so the pack states the
// baseline plus the mean offset and the spread of the offsets; and a DM
// uncertainty exists in six of the 68 files (a frozen parameter's), so that column
// is not shipped (the gate's rule: a missing column is C for that column).
// =============================================================================

import { Buffer } from 'node:buffer';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';

import { sha256 } from './pinned.mjs';
import { ENCODING, TABLE_VERSION, encodeTable } from './table-columns.mjs';
import { asSidecar, col, decodeSidecar, described } from './variables.mjs';

const RETRIEVED = '2026-11-05';
const ROOT = 'NANOGrav15yr_PulsarTiming_v2.1.0/';
const NARROWBAND =
  /^NANOGrav15yr_PulsarTiming_v2\.1\.0\/narrowband\/par\/[^/]+\.nb\.par$/;
const WIDEBAND =
  /^NANOGrav15yr_PulsarTiming_v2\.1\.0\/wideband\/par\/[^/]+\.wb\.par$/;

// --- A tar.gz, read as a stream, keeping only the members asked for ---------------

const ascii = (buf, from, to) => {
  const end = buf.indexOf(0, from);
  return buf.toString('latin1', from, end >= 0 && end < to ? end : to);
};

async function* slices(bytes, size = 1 << 20) {
  for (let i = 0; i < bytes.length; i += size)
    yield Buffer.from(
      bytes.buffer,
      bytes.byteOffset + i,
      Math.min(size, bytes.length - i)
    );
}

/**
 * The members of a gzipped tar archive whose path `wanted` accepts, without holding
 * the others: the archive is inflated as a stream and each header read as it arrives.
 * Refuses a header whose checksum is wrong and a size it cannot read.
 * @param {Uint8Array} gz - The archive
 * @param {(path: string) => boolean} wanted
 * @returns {Promise<Map<string, Buffer>>} Path to contents, in archive order
 */
export async function tarMembers(gz, wanted) {
  const out = new Map();
  const queue = [];
  let have = 0;
  let mode = 'header';
  let remaining = 0;
  let padding = 0;
  let keep = null;
  let parts = [];
  let longName = null;
  let paxName = null;
  let blanks = 0;

  const take = n => {
    const got = [];
    let left = n;
    while (left > 0) {
      const head = queue[0];
      if (head.length <= left) {
        got.push(head);
        left -= head.length;
        queue.shift();
      } else {
        got.push(head.subarray(0, left));
        queue[0] = head.subarray(left);
        left = 0;
      }
    }
    have -= n;
    return got.length === 1 ? got[0] : Buffer.concat(got);
  };

  const header = block => {
    if (block.every(b => b === 0)) {
      blanks++;
      return;
    }
    let sum = 0;
    for (let i = 0; i < 512; i++) sum += i >= 148 && i < 156 ? 32 : block[i];
    const stored = parseInt(ascii(block, 148, 156).trim(), 8);
    if (sum !== stored) throw new Error('a tar header fails its checksum');
    if (block[124] & 0x80)
      throw new Error('a tar member size this reader does not read');
    const size = parseInt(ascii(block, 124, 136).trim() || '0', 8);
    const type = String.fromCharCode(block[156] || 48);
    const prefix =
      block.toString('latin1', 257, 262) === 'ustar'
        ? ascii(block, 345, 500)
        : '';
    let name = prefix
      ? `${prefix}/${ascii(block, 0, 100)}`
      : ascii(block, 0, 100);
    if (longName !== null) name = longName;
    if (paxName !== null) name = paxName;
    padding = (512 - (size % 512)) % 512;
    remaining = size;
    parts = [];
    keep = null;
    if (type === 'L' || type === 'x' || type === 'g') {
      keep = { meta: type };
    } else {
      longName = null;
      paxName = null;
      if ((type === '0' || type === '\0') && wanted(name)) keep = { name };
    }
    mode = size > 0 ? 'body' : padding ? 'pad' : 'header';
    if (size === 0) finish();
  };

  const finish = () => {
    if (!keep) return;
    const data = Buffer.concat(parts);
    if (keep.name !== undefined) out.set(keep.name, data);
    else if (keep.meta === 'L') longName = ascii(data, 0, data.length);
    else if (keep.meta === 'x') {
      const text = data.toString('utf8');
      for (let at = 0; at < text.length;) {
        const space = text.indexOf(' ', at);
        const len = Number(text.slice(at, space));
        const record = text.slice(space + 1, at + len - 1);
        if (record.startsWith('path=')) paxName = record.slice(5);
        at += len;
      }
    }
    keep = null;
  };

  const feed = chunk => {
    queue.push(chunk);
    have += chunk.length;
    for (;;) {
      if (mode === 'header') {
        if (have < 512 || blanks >= 2) break;
        header(take(512));
      } else if (mode === 'body') {
        const n = Math.min(have, remaining);
        if (n === 0) break;
        const piece = take(n);
        if (keep) parts.push(piece);
        remaining -= n;
        if (remaining === 0) {
          finish();
          mode = padding ? 'pad' : 'header';
        }
      } else {
        const n = Math.min(have, padding);
        if (n === 0) break;
        take(n);
        padding -= n;
        if (padding === 0) mode = 'header';
      }
    }
  };

  await pipeline(Readable.from(slices(gz)), createGunzip(), async source => {
    for await (const chunk of source) feed(chunk);
  });
  if (mode !== 'header' || blanks < 1)
    throw new Error('the archive ended inside a tar member');
  return out;
}

// --- A timing model (a par file), read for the few lines this pack needs ---------

const number = (text, what) => {
  const v = Number(text);
  if (!Number.isFinite(v)) throw new Error(`${what} is not a number: ${text}`);
  return v;
};

/**
 * What one par file says of the lines the pack keeps. The first occurrence of a
 * name wins, as a timing package reads it; DMX_nnnn lines are the per-epoch
 * offsets. Refuses a file with no pulsar name, no F0 or DM, or a DM derivative.
 * @param {string} text
 * @param {string} where - The member's name, for a message
 */
export function parsePar(text, where = 'a par file') {
  const first = new Map();
  const dmx = [];
  for (const line of text.split('\n')) {
    const t = line.trim().split(/\s+/);
    if (!t[0] || t[0].startsWith('#')) continue;
    if (/^DMX_\d+$/.test(t[0])) dmx.push(number(t[1], `${where} ${t[0]}`));
    else if (!first.has(t[0])) first.set(t[0], t.slice(1));
  }
  const need = key => {
    const v = first.get(key);
    if (!v?.length) throw new Error(`${where} has no ${key}`);
    return v;
  };
  const psr = need('PSR')[0];
  const f0 = need('F0');
  const dm = need('DM');
  if (f0[1] !== '1')
    throw new Error(`${where}: F0 is not a fitted parameter (flag ${f0[1]})`);
  for (const k of ['DM1', 'DM2'])
    if (first.has(k) && number(first.get(k)[0], k) !== 0)
      throw new Error(`${where} has a nonzero ${k}: DM is not constant`);
  if (dm[1] === '1')
    throw new Error(
      `${where}: DM is a fitted parameter, so a baseline plus offsets is not what the file holds`
    );
  need('PEPOCH');
  need('DMEPOCH');
  return {
    psr,
    f0: number(f0[0], `${where} F0`),
    dm: number(dm[0], `${where} DM`),
    dmFlag: dm[1] ?? null,
    dmUncertainty: dm.length > 2 ? number(dm[2], `${where} DM`) : null,
    dmdata: first.get('DMDATA')?.[0] ?? null,
    units: first.get('UNITS')?.[0] ?? null,
    dmx,
  };
}

const sum = xs => xs.reduce((a, b) => a + b, 0);

/** The DM at the mean of a model's epoch offsets, and the spread of DM + offset over its epochs. */
function dmSummary(par, where) {
  if (par.dmx.length < 2)
    throw new Error(`${where} has fewer than two DMX epochs`);
  const all = par.dmx.map(x => par.dm + x);
  const mean = sum(all) / all.length;
  const variance = sum(all.map(v => (v - mean) ** 2)) / (all.length - 1);
  return { mean, std: Math.sqrt(variance), n: all.length };
}

/**
 * The 68 pulsars of a release's files. A pulsar timed by one telescope alone
 * (a name that is another pulsar's name plus `ao` or `gbt`) is a second timing
 * model of the same pulsar and is not a row.
 * @param {Map<string, string>} narrow - Member path to par text, narrowband
 * @param {Map<string, string>} wide - the same, wideband
 * @returns {{rows: object[], names: string[], record: object}}
 */
export function pulsarRows(narrow, wide) {
  const read = (files, kind) => {
    const byName = new Map();
    for (const [path, text] of files) {
      const par = parsePar(text, path);
      if (byName.has(par.psr))
        throw new Error(`${par.psr} is in two ${kind} files`);
      byName.set(par.psr, { ...par, path });
    }
    return byName;
  };
  const nb = read(narrow, 'narrowband');
  const wb = read(wide, 'wideband');
  const names = [...nb.keys()].sort();
  if (JSON.stringify(names) !== JSON.stringify([...wb.keys()].sort()))
    throw new Error('the narrowband and wideband files name different pulsars');
  const single = name =>
    /(ao|gbt)$/.test(name) && nb.has(name.replace(/(ao|gbt)$/, ''));
  const kept = names.filter(n => !single(n));
  const rows = [];
  const diffs = [];
  let worstF0 = 0;
  for (const name of kept) {
    const a = nb.get(name);
    const b = wb.get(name);
    if (a.dmdata !== 'N')
      throw new Error(`${name}: narrowband file with DMDATA ${a.dmdata}`);
    if (b.dmdata !== 'Y')
      throw new Error(`${name}: wideband file with DMDATA ${b.dmdata}`);
    if (a.units !== 'TDB' || b.units !== 'TDB')
      throw new Error(`${name}: not in TDB`);
    const sa = dmSummary(a, a.path);
    const sb = dmSummary(b, b.path);
    worstF0 = Math.max(worstF0, Math.abs(a.f0 - b.f0) / a.f0);
    diffs.push([name, Math.abs(sa.mean - sb.mean)]);
    rows.push({
      f0: a.f0,
      dm: sa.mean,
      dm_wb: sb.mean,
      dmx_std: sa.std,
      dmx_n: sa.n,
    });
  }
  const ordered = diffs.map(d => d[1]).sort((x, y) => x - y);
  return {
    rows,
    names: kept,
    record: {
      narrowbandFiles: nb.size,
      widebandFiles: wb.size,
      singleTelescopeModelsLeftOut: names.filter(single),
      worstF0RelativeDifference: Number(worstF0.toPrecision(3)),
      medianDmDifference: Number(ordered[ordered.length >> 1].toPrecision(3)),
      dmDifferenceOverHalf: diffs
        .filter(d => d[1] > 0.5)
        .map(d => [d[0], Number(d[1].toPrecision(3))]),
      dmUncertaintyInFiles: kept.filter(n => nb.get(n).dmUncertainty !== null)
        .length,
    },
  };
}

// --- The pack ------------------------------------------------------------------------

const ARCHIVE = 'NANOGrav15yr_PulsarTiming_v2.1.0.tar.gz';
const COLUMNS = [
  col(
    'f0',
    'spin frequency',
    'Hz',
    1e-6,
    "the narrowband timing model's F0, in Hz by the par-file convention (the files state no unit), stored to 1e-6 Hz"
  ),
  col(
    'dm',
    'dispersion measure',
    'pc/cm3',
    1e-4,
    "the narrowband model's DM line plus the mean of its DMX epoch offsets, in pc/cm3 by the par-file convention (the files state no unit)"
  ),
  col(
    'dm_wb',
    'dispersion measure, wideband model',
    'pc/cm3',
    1e-4,
    'the same quantity from the wideband timing model of the same pulsar: the only measure of how well two fits of one data set agree, since the files carry no DM uncertainty'
  ),
  col(
    'dmx_std',
    'spread of the DM over epochs',
    'pc/cm3',
    1e-6,
    "the sample standard deviation of DM + DMX over the narrowband model's epochs: the pulsar's DM varies with time and this is by how much"
  ),
  col(
    'dmx_n',
    'DMX epochs',
    '',
    1,
    'the number of DMX epochs of the narrowband model'
  ),
];

export const NANOGRAV_15YR = {
  id: 'nanograv-15yr-pulsars',
  manifest: 'data-packs/nanograv-15yr-pulsars.json',
  capability: null,
  module: 'js/data/observations/nanograv15yrPulsars.js',
  exportName: 'nanograv15yrPulsars',
  transformVersion: TABLE_VERSION,
  table: true,
  sidecar: 'radio/nanograv-15yr-pulsars.json',
  script: 'tools/data-packs/radio.mjs',
  decode: decodeSidecar,
  // 639 MB: the default two minutes is not enough for the download.
  timeoutMs: 1_800_000,
  raw: [
    {
      file: ARCHIVE,
      url: `https://zenodo.org/api/records/16051178/files/${ARCHIVE}/content`,
      bytes: 638719668,
      sha256:
        '91476bf20d4c8baa9f5ad39c6e114b581478a5a7e269876489cafc8f62c5708f',
    },
  ],
  columns: COLUMNS,
  async build(raw) {
    const members = await tarMembers(
      raw[0],
      p => NARROWBAND.test(p) || WIDEBAND.test(p)
    );
    const text = re =>
      new Map(
        [...members]
          .filter(([p]) => re.test(p))
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([p, b]) => [p, b.toString('utf8')])
      );
    const { rows, names, record } = pulsarRows(
      text(NARROWBAND),
      text(WIDEBAND)
    );
    if (rows.length !== 68)
      throw new Error(
        `${rows.length} pulsars, not the 68 of the data set's title`
      );
    const used = [...members]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([p, b]) => `${p.slice(ROOT.length)}\t${sha256(b)}`);
    const { series, record: enc } = encodeTable(rows, this.columns);
    const meta = {
      id: this.id,
      version: '1.0.0',
      title:
        'The 68 NANOGrav 15-year pulsars: spin frequencies and dispersion measures',
      object: {
        name: 'Sixty-eight millisecond pulsars',
        identifiers: names,
        frame:
          'timing models in barycentric dynamical time (par UNITS TDB); spin frequency in Hz and dispersion measure in pc/cm3 by the par-file convention of tempo2 and PINT, which the archive does not restate',
      },
      facility: {
        observatory:
          'Arecibo, the Green Bank Telescope and the Very Large Array (NANOGrav)',
        pipeline:
          'NANOGrav 15-year data set, release v2.1.0 (Zenodo 10.5281/zenodo.16051178): narrowband and wideband timing models, narrowband/par and wideband/par',
      },
      dataType: 'catalog',
      origin: 'compilation',
      credit:
        'The NANOGrav Collaboration, the NANOGrav 15-year Data Set v2.1.0 (CC BY 4.0); Agazie et al. 2023, ApJL 951, L9',
      license: {
        status: 'cc-by-4.0',
        statement: `The Zenodo record 10.5281/zenodo.16051178 (version 2.1.0, published 2025-07-17, creator The NANOGrav Collaboration, access open) states the licence CC BY 4.0 in its licence field (the record's JSON, retrieved ${RETRIEVED}). None of the release's README files states a licence, a citation request or a condition (README and narrowband/README.narrowband were read in full, and every README of the release, including wideband, residuals, clock and the correlations', was searched for licence, copyright, citation, acknowledgement, redistribution, permission and condition terms, ${RETRIEVED}). The README names Agazie et al. 2023 and the record's DOI as the data set's description and home. Attribute: The NANOGrav Collaboration, the NANOGrav 15-year Data Set, v2.1.0, doi:10.5281/zenodo.16051178; Agazie et al. 2023, ApJL 951, L9. The table was extracted and reformatted from the timing models, and the values are summarised as the manifest states.`,
      },
      retrieved: RETRIEVED,
      columns: described(this.columns),
      masks: [],
      reductions: [
        `${rows.length} rows, one per pulsar of the data set, in the order of the pulsar names (code-unit order: B names, then J). The ${record.singleTelescopeModelsLeftOut.length} timing models fitted to one telescope's data alone (${record.singleTelescopeModelsLeftOut.join(', ')}) are second models of pulsars already in the table and are not rows.`,
        'The spin frequency is the F0 of the narrowband timing model (every file fits it), stored to 1e-6 Hz. Its uncertainty, the epoch, every other timing parameter, the times of arrival, the templates and the residuals are not kept.',
        `The DM line of a file is a fixed baseline (no file fits it; ${record.dmUncertaintyInFiles} give it an uncertainty and a zero fit flag) and the fitted per-epoch offsets (DMX_nnnn) carry the variation, so a pulsar's DM is the baseline plus the mean of the offsets (the column dm), with the sample standard deviation of baseline plus offset over the epochs (dmx_std) and the number of epochs (dmx_n). The mean is unweighted and not time-weighted. The same sum from the wideband models is dm_wb. These are not the data-set paper's tabulated DMs, which were not read.`,
        `The files carry no DM uncertainty for ${68 - record.dmUncertaintyInFiles} of the 68 pulsars and a frozen one for the other ${record.dmUncertaintyInFiles}, so the column is not shipped; the difference between dm and dm_wb is the only scatter the pack offers (median ${record.medianDmDifference} pc/cm3; ${record.dmDifferenceOverHalf.length} pulsars differ by more than 0.5: ${record.dmDifferenceOverHalf.map(d => `${d[0]} ${d[1]}`).join(', ')}).`,
        `No unit is written in the files. Hz and pc/cm3 are the par-file convention of the two packages the README names (tempo2 and PINT). The one check the data allow: every spin frequency lies between ${Math.min(...rows.map(r => r.f0)).toFixed(1)} and ${Math.max(...rows.map(r => r.f0)).toFixed(1)} Hz, periods of ${(1000 / Math.max(...rows.map(r => r.f0))).toFixed(2)} to ${(1000 / Math.min(...rows.map(r => r.f0))).toFixed(1)} ms, consistent with the data set being of millisecond pulsars.`,
      ],
    };
    const manifestRest = {
      source: {
        archive: 'Zenodo (CERN), the NANOGrav 15-year data set',
        urls: [
          this.raw[0].url,
          'https://zenodo.org/records/16051178',
          'https://doi.org/10.5281/zenodo.16051178',
        ],
        citations: [
          {
            text: 'The NANOGrav Collaboration, The NANOGrav 15-Year Data Set, public release v2.1.0 (2025-07-17), Zenodo',
            doi: '10.5281/zenodo.16051178',
          },
          {
            text: 'The NANOGrav 15-year Data Set, all versions (Zenodo concept record)',
            doi: '10.5281/zenodo.7967584',
          },
          {
            text: 'Agazie et al. 2023, ApJL 951, L9 (The NANOGrav 15-year Data Set: Observations and Timing of 68 Millisecond Pulsars)',
            doi: '10.3847/2041-8213/acda9a',
          },
        ],
      },
      raw: this.raw,
      transformation: {
        script: 'tools/data-packs/radio.mjs',
        version: TABLE_VERSION,
        options: {
          members: ['narrowband/par/*.nb.par', 'wideband/par/*.wb.par'],
          columns: this.columns.map(({ id, step }) => ({ id, step })),
        },
        steps: [
          'Inflate the archive as a stream and keep only narrowband/par/*.nb.par and wideband/par/*.wb.par (checking every tar header checksum).',
          'Read PSR, F0 (refusing a file whose F0 is not fitted), DM, DM1, DMEPOCH, PEPOCH, DMDATA, UNITS and every DMX_nnnn offset; the first occurrence of a name wins.',
          'Leave out the single-telescope models (a name that is another pulsar plus ao or gbt) and require 68 pulsars named alike in both sets.',
          'dm = DM + mean(DMX_i) and dm_wb the same from the wideband file; dmx_std = sample standard deviation of DM + DMX_i; dmx_n = the number of epochs.',
          `Store the five columns as ${ENCODING}.`,
        ],
        record: {
          rows: rows.length,
          ...record,
          membersRead: used.length,
          membersDigest: sha256(used.join('\n')),
          membersDigestOf:
            "the sorted lines 'path-below-the-release-directory TAB sha256' of every member read, joined by newlines",
          columns: enc,
        },
      },
      assumptions: [
        "The units are the par-file convention (spin frequency in Hz, dispersion measure in pc cm^-3); the archive's files do not state them.",
        "The narrowband models are the data set's primary timing models (its README); the wideband models are a second fit of the same pulsars and are used only for dm_wb.",
        "A pulsar's dispersion measure is not constant: the pack states a mean over the epochs and its spread, and a distance from it (the crude electron-density estimate used in teaching) inherits that spread and the model of the Galaxy's electron density, which is not in this pack.",
        "Every pulsar is a millisecond pulsar timed for years with a model that includes red noise; the periods are those of that model, not a single epoch's measurement.",
      ],
      compatible: { widgets: [], investigations: [] },
      offline: 'none',
    };
    return asSidecar(this, { meta, manifestRest, series });
  },
  validate(table) {
    const c = k => table.columns.find(x => x.id === k).values;
    const f0 = c('f0');
    const dm = c('dm');
    const wb = c('dm_wb');
    const periodMs = Array.from(f0, f => 1000 / f);
    const diffs = Array.from(dm, (v, i) => Math.abs(v - wb[i])).sort(
      (a, b) => a - b
    );
    const within = diffs.filter(d => d <= 0.1).length;
    const minP = Math.min(...periodMs);
    const maxP = Math.max(...periodMs);
    const ok =
      table.n === 68 &&
      minP >= 1 &&
      maxP <= 100 &&
      Array.from(dm).every(v => v > 0 && v < 1000) &&
      c('dmx_n').every(v => v >= 2) &&
      within >= 60;
    return {
      check:
        'the 68 rows have spin periods between 1 and 100 ms (a bound chosen here, not a published definition), positive dispersion measures, at least two DMX epochs each, and the narrowband and wideband dispersion measures of at least 60 pulsars agree within 0.1 pc/cm3 (a bound set after reading the files, descriptive and not a validation against a published value)',
      against: [
        {
          quantity: 'dispersion measure, wideband timing model',
          unit: 'pc/cm3',
          ref: "the archive's own wideband timing models of the same pulsars, an independent fit of the same data set",
        },
      ],
      result: {
        rows: table.n,
        minPeriodMs: Number(minP.toFixed(3)),
        maxPeriodMs: Number(maxP.toFixed(3)),
        dmAgreeWithin0p1: within,
        medianDmDifference: Number(diffs[diffs.length >> 1].toFixed(4)),
      },
      ok,
    };
  },
};

export const RADIO_PACKS = [NANOGRAV_15YR];
