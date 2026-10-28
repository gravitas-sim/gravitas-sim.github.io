#!/usr/bin/env node
// =============================================================================
// The 14-day solar sequence (Prompt 194 part 2, SUN_KERNEL.md Part 2)
// -----------------------------------------------------------------------------
//   node tools/sun-frames-build.mjs --src <retrieval dir> [--check]
//
// Reads a retrieval directory holding frames/*.jpg (the SDO HMI continuum browse
// pictures), SHA256.txt, horizons2.json (JPL Horizons) and tsis.csv (LASP LISIRD
// TSIS-1 TIM), refuses anything whose SHA-256 is not the record's, and writes
//
//   frames/sun/hmiic-YYYYMMDD.jpg   the pictures, byte for byte
//   frames/sun-2024-05.json         the sidecar: each frame's disc, ephemeris and
//                                   dark clusters; three tracked groups; the
//                                   irradiance series; the sources and their terms
//
// The rules (the limb fit, the dark-pixel detector, the clusters, the tracking)
// are tests/fixtures/sun/thresholds-2.json "rules", committed before this tool
// ran. The pictures are decoded by tools/data-packs/image-decode.py (Pillow:
// Node has no JPEG decoder); every other step is here, in this file, on the
// decoded pixels. --check rebuilds the sidecar in memory and compares it with
// the file (the pictures need the retrieval directory; the sidecar's hashes are
// held to the committed pictures by tests/sunSequence.test.js).
//
// A browse picture is a display picture: the sidecar says so, and what it holds
// is an instructional reading, not astrometry.
// =============================================================================

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  diskToHeliographic,
  heliographicToDisk,
} from '../js/kernels/sun/index.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..');
const DECODER = path.join(HERE, 'data-packs/image-decode.py');
const OUT_JSON = path.join(REPO, 'frames/sun-2024-05.json');
const OUT_DIR = path.join(REPO, 'frames/sun');
const RULES = JSON.parse(
  readFileSync(path.join(REPO, 'tests/fixtures/sun/thresholds-2.json'), 'utf8')
).rules;

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const MONTHS = { May: '05' };

// ---- inputs -------------------------------------------------------------------

function parseHashes(text) {
  const out = new Map();
  for (const line of text.split('\n')) {
    const m = line.match(/^([0-9a-f]{64})\s+(\S+)$/);
    if (m) out.set(m[2], m[1]);
  }
  return out;
}

/** Horizons' rows: { date, l0Deg, b0Deg, pSkyDeg, distanceAu, deldot }. */
export function parseHorizons(json) {
  const text = JSON.parse(json).result;
  const body = text.split('$$SOE')[1].split('$$EOE')[0];
  const rows = [];
  for (const line of body.split('\n')) {
    const m = line.match(
      /^\s*(\d{4})-(\w{3})-(\d\d) 12:00\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/
    );
    if (!m) continue;
    rows.push({
      date: `${m[1]}-${MONTHS[m[2]]}-${m[3]}`,
      l0Deg: Number(m[4]),
      b0Deg: Number(m[5]),
      pSkyDeg: Number(m[6]) - 360,
      distanceAu: Number(m[8]),
      deldotKmS: Number(m[9]),
    });
  }
  return rows;
}

/** LISIRD rows: { jd, tsi1Au, sigma, tsiEarth, provisional }. */
export function parseTsis(text) {
  return text
    .trim()
    .split('\n')
    .slice(1)
    .map(line => {
      const [jd, tsi1Au, sigma, tsiEarth, provisional] = line
        .split(',')
        .map(Number);
      return { jd, tsi1Au, sigma, tsiEarth, provisional };
    });
}

function decode(bytes) {
  const ran = spawnSync('python3', ['-I', DECODER], {
    input: bytes,
    maxBuffer: 1 << 28,
  });
  if (ran.status !== 0) throw new Error(`decoder: ${ran.stderr}`);
  const buf = ran.stdout;
  const nl = buf.indexOf(10);
  const head = JSON.parse(buf.subarray(0, nl).toString('ascii'));
  return { ...head, rgb: buf.subarray(nl + 1) };
}

// ---- the rules ----------------------------------------------------------------

const luminance = ({ width, height, rgb }) => {
  const out = new Float64Array(width * height);
  for (let i = 0; i < out.length; i++)
    out[i] =
      0.299 * rgb[3 * i] + 0.587 * rgb[3 * i + 1] + 0.114 * rgb[3 * i + 2];
  return out;
};

/** The limb: centre, radius, rms of the kept rays and how many were kept. */
export function fitLimb(lum, width, height) {
  let n = 0;
  let sx = 0;
  let sy = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      // the picture's caption sits at the bottom left, outside the disc
      if (lum[y * width + x] > 60 && !(y >= 900 && x < 350)) {
        n++;
        sx += x;
        sy += y;
      }
    }
  const cx0 = sx / n;
  const cy0 = sy / n;
  const r0 = Math.sqrt(n / Math.PI);
  const at = (x, y) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const v = (i, j) => lum[j * width + i];
    return (
      v(x0, y0) * (1 - fx) * (1 - fy) +
      v(x0 + 1, y0) * fx * (1 - fy) +
      v(x0, y0 + 1) * (1 - fx) * fy +
      v(x0 + 1, y0 + 1) * fx * fy
    );
  };
  const pts = [];
  for (let a = 0; a < 360; a++) {
    const t = (a * Math.PI) / 180;
    const rr = [];
    const vv = [];
    for (let r = r0 - 25; r < r0 + 25 - 1e-9; r += 0.25) {
      rr.push(r);
      vv.push(at(cx0 + r * Math.cos(t), cy0 - r * Math.sin(t)));
    }
    let inner = 0;
    let k = 0;
    rr.forEach((r, i) => {
      if (r > r0 - 14 && r < r0 - 6) {
        inner += vv[i];
        k++;
      }
    });
    const half = inner / k / 2;
    let hit = -1;
    for (let i = 0; i < rr.length - 1; i++)
      if (vv[i] >= half && vv[i + 1] < half) {
        hit = i;
        break;
      }
    if (hit < 0) continue;
    const rpos = rr[hit] + ((vv[hit] - half) / (vv[hit] - vv[hit + 1])) * 0.25;
    pts.push([cx0 + rpos * Math.cos(t), cy0 - rpos * Math.sin(t)]);
  }
  let keep = pts.map(() => true);
  let cx = cx0;
  let cy = cy0;
  let r = r0;
  for (let pass = 0; pass < 6; pass++) {
    const q = pts.filter((_, i) => keep[i]);
    // algebraic fit: 2 a x + 2 b y + c = x^2 + y^2, normal equations
    const m = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const rhs = [0, 0, 0];
    for (const [x, y] of q) {
      const row = [2 * x, 2 * y, 1];
      const b = x * x + y * y;
      for (let i = 0; i < 3; i++) {
        rhs[i] += row[i] * b;
        for (let j = 0; j < 3; j++) m[i][j] += row[i] * row[j];
      }
    }
    const s = solve3(m, rhs);
    cx = s[0];
    cy = s[1];
    r = Math.sqrt(s[2] + cx * cx + cy * cy);
    keep = pts.map(([x, y]) => Math.abs(Math.hypot(x - cx, y - cy) - r) < 1);
  }
  const kept = pts.filter((_, i) => keep[i]);
  const res = kept.map(([x, y]) => Math.hypot(x - cx, y - cy) - r);
  const mean = res.reduce((a, b) => a + b, 0) / res.length;
  const rms = Math.sqrt(
    res.reduce((a, b) => a + (b - mean) ** 2, 0) / res.length
  );
  return { cx, cy, radiusPx: r, rmsPx: rms, rays: kept.length };
}

function solve3(m, b) {
  const a = m.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < 3; c++) {
    let p = c;
    for (let r = c + 1; r < 3; r++)
      if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    [a[c], a[p]] = [a[p], a[c]];
    for (let r = c + 1; r < 3; r++) {
      const f = a[r][c] / a[c][c];
      for (let k = c; k < 4; k++) a[r][k] -= f * a[c][k];
    }
  }
  const x = [0, 0, 0];
  for (let r = 2; r >= 0; r--) {
    let s = a[r][3];
    for (let k = r + 1; k < 3; k++) s -= a[r][k] * x[k];
    x[r] = s / a[r][r];
  }
  return x;
}

/** Dark pixels, then single-linkage clusters at 14 pixels: [{n, x, y}]. */
export function darkClusters(lum, width, height, limb) {
  const W = 41;
  const h = 20;
  // integral image for the box means, windows clipped at the edges
  const ii = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      row += lum[y * width + x];
      ii[(y + 1) * (width + 1) + x + 1] = ii[y * (width + 1) + x + 1] + row;
    }
  }
  const box = (x, y) => {
    const x0 = Math.max(0, x - h);
    const x1 = Math.min(width, x + h + 1);
    const y0 = Math.max(0, y - h);
    const y1 = Math.min(height, y + h + 1);
    const s =
      ii[y1 * (width + 1) + x1] -
      ii[y0 * (width + 1) + x1] -
      ii[y1 * (width + 1) + x0] +
      ii[y0 * (width + 1) + x0];
    return s / ((x1 - x0) * (y1 - y0));
  };
  void W;
  const pix = [];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const v = lum[y * width + x];
      if (v <= 0) continue;
      if (Math.hypot(x - limb.cx, y - limb.cy) / limb.radiusPx >= 0.985)
        continue;
      if (v < 0.62 * box(x, y)) pix.push([x, y]);
    }
  const parent = pix.map((_, i) => i);
  const find = i => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const cell = 14;
  const grid = new Map();
  pix.forEach(([x, y], i) => {
    const key = `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(i);
  });
  pix.forEach(([x, y], i) => {
    const gx = Math.floor(x / cell);
    const gy = Math.floor(y / cell);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const j of grid.get(`${gx + dx},${gy + dy}`) ?? []) {
          if (j <= i) continue;
          if (Math.hypot(pix[j][0] - x, pix[j][1] - y) <= 14)
            parent[find(j)] = find(i);
        }
  });
  const sums = new Map();
  pix.forEach(([x, y], i) => {
    const r = find(i);
    const s = sums.get(r) ?? { n: 0, sx: 0, sy: 0 };
    s.n++;
    s.sx += x;
    s.sy += y;
    sums.set(r, s);
  });
  return [...sums.values()]
    .map(s => ({ n: s.n, x: s.sx / s.n, y: s.sy / s.n }))
    .sort((a, b) => b.n - a.n || a.x - b.x);
}

const SEEDS = { G1: [452, 422], G2: [593, 276], G3: [259, 654] };
const WINDOW = 40;
const MIN_SEED = 6;
const MU_STOP = 0.25;

/** The disc of a day as the kernel's functions take it (north up: pDeg 0). */
const diskOf = d => ({
  cx: d.disc.centrePx[0],
  cy: d.disc.centrePx[1],
  radiusPx: d.disc.radiusPx,
  pDeg: 0,
  b0Deg: d.b0Deg,
  l0Deg: d.l0Deg,
  distanceAu: d.distanceAu,
});

/** The three groups' marks, by the rules of tracking. */
export function trackGroups(days) {
  const out = {};
  for (const [id, [sx, sy]] of Object.entries(SEEDS)) {
    const marks = [];
    let expect = [sx, sy];
    for (let i = 0; i < days.length; i++) {
      const d = days[i];
      const near = d.clusters
        .filter(c => c.n >= MIN_SEED)
        .map(c => ({ c, dist: Math.hypot(c.x - expect[0], c.y - expect[1]) }))
        .filter(e => e.dist <= WINDOW)
        .sort((a, b) => a.dist - b.dist)[0];
      if (!near) break;
      const disk = diskOf(d);
      const pos = diskToHeliographic(near.c.x, near.c.y, disk);
      if (pos.status === 'refused' || pos.mu < MU_STOP) break;
      marks.push({
        day: i,
        x: round(near.c.x, 1),
        y: round(near.c.y, 1),
        pixels: near.c.n,
      });
      const next = days[i + 1];
      if (!next) break;
      const lonStony =
        ((((pos.lonCarringtonDeg - next.l0Deg + 180) % 360) + 360) % 360) - 180;
      const e = heliographicToDisk(pos.latDeg, lonStony, diskOf(next));
      if (e.status === 'refused') break;
      expect = [e.x, e.y];
    }
    out[id] = marks;
  }
  return out;
}

const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
const jdOf = date => {
  const [y, m, d] = date.split('-').map(Number);
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jdn =
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045;
  return jdn; // 12:00 UT
};

// ---- the build ----------------------------------------------------------------

export function build(src, { copy }) {
  const hashes = parseHashes(
    readFileSync(path.join(src, 'SHA256.txt'), 'utf8')
  );
  const horizonsBytes = readFileSync(path.join(src, 'horizons2.json'));
  const tsisBytes = readFileSync(path.join(src, 'tsis.csv'));
  for (const [name, bytes] of [
    ['horizons2.json', horizonsBytes],
    ['tsis.csv', tsisBytes],
  ])
    if (sha256(bytes) !== hashes.get(name))
      throw new Error(`${name} is not the retrieved file (SHA-256)`);
  const eph = parseHorizons(horizonsBytes.toString('utf8'));
  const tsis = parseTsis(tsisBytes.toString('utf8'));
  if (eph.length !== 14)
    throw new Error(`${eph.length} ephemeris rows, not 14`);
  const days = [];
  for (const e of eph) {
    const ymd = e.date.replaceAll('-', '');
    const name = `frames/${ymd}_120000_1024_HMIIC.jpg`;
    const bytes = readFileSync(path.join(src, name));
    const digest = sha256(bytes);
    if (digest !== hashes.get(name))
      throw new Error(`${name} is not the retrieved file (SHA-256)`);
    const pic = decode(bytes);
    const lum = luminance(pic);
    const limb = fitLimb(lum, pic.width, pic.height);
    const clusters = darkClusters(lum, pic.width, pic.height, limb);
    const file = `frames/sun/hmiic-${ymd}.jpg`;
    if (copy) {
      mkdirSync(OUT_DIR, { recursive: true });
      copyFileSync(path.join(src, name), path.join(REPO, file));
    }
    days.push({
      date: e.date,
      jd: jdOf(e.date),
      file,
      bytes: bytes.length,
      sha256: digest,
      width: pic.width,
      height: pic.height,
      disc: {
        centrePx: [round(limb.cx, 2), round(limb.cy, 2)],
        radiusPx: round(limb.radiusPx, 2),
        limbRmsPx: round(limb.rmsPx, 3),
        rays: limb.rays,
      },
      l0Deg: e.l0Deg,
      b0Deg: e.b0Deg,
      pSkyDeg: e.pSkyDeg,
      pImageDeg: 0,
      distanceAu: e.distanceAu,
      arcsecPerPixel: round(
        (Math.asin(695700 / (e.distanceAu * 149597870.7)) * 206264.806247) /
          limb.radiusPx,
        4
      ),
      groupsRead: clustersAtLeast(clusters, 12),
      clusters: clusters
        .filter(c => c.n >= MIN_SEED)
        .map(c => [c.n, round(c.x, 1), round(c.y, 1)]),
    });
  }
  const tracks = trackGroups(
    days.map(d => ({
      ...d,
      clusters: d.clusters.map(([n, x, y]) => ({ n, x, y })),
    }))
  );
  const rows = tsis.map(r => {
    const date = new Date((r.jd - 2440587.5) * 86400000 + 0)
      .toISOString()
      .slice(0, 10);
    const fill = r.tsi1Au === 0 && r.sigma === 0 && r.tsiEarth === 0;
    return {
      date,
      jd: r.jd,
      ...(fill
        ? { fill: true }
        : {
            tsi1AuWm2: r.tsi1Au,
            sigmaWm2: r.sigma,
            tsiEarthWm2: r.tsiEarth,
            provisional: r.provisional === 1,
          }),
    };
  });
  return {
    format: 'gravitas.sun-frames',
    formatVersion: 1,
    prompt: 194,
    part: 2,
    title:
      'The Sun, 4 to 17 May 2024: HMI continuum pictures, the geometry of each and a daily irradiance series',
    displayOnly:
      'Each picture is an SDO HMI continuum BROWSE picture, a 1,024 pixel display picture; its source says browse products are not intended for science analysis. Heliographic positions read from it are an instructional measurement, labeled not astrometry (delegated ruling D-R10-92): they carry the placement uncertainty and the foreshortening and say nothing about the picture’s photometry or its own world coordinates, which it does not have.',
    northUp:
      'The pictures have solar north up and east left: pImageDeg is 0 for the pixel to heliographic conversion. pSkyDeg is Horizons’ NP.ang (the pole against celestial north) and is not used for it.',
    sources: {
      frames: {
        what: 'SDO HMI continuum, quick-look browse picture, 1,024 pixels, one a day at 12:00 UT',
        url: 'https://sdo.gsfc.nasa.gov/assets/img/browse/2024/05/DD/2024MMDD_120000_1024_HMIIC.jpg',
        credit: 'SDO/NASA and the HMI science team',
        retrieved: '2026-10-27',
        sha256Of: 'each file in days[].sha256',
      },
      ephemeris: {
        what: 'JPL Horizons API 1.2: target 10 (Sun), observer 500@399 (geocentre), daily 12:00 UT; quantities 14 (ObsSub-LON, ObsSub-LAT), 17 (NP.ang), 20 (delta, deldot); the Sun’s rotation model is Horizons’ IAU_SUN',
        credit: 'NASA/JPL Solar System Dynamics, Horizons',
        retrieved: '2026-10-27',
        sha256: sha256(horizonsBytes),
      },
      irradiance: {
        what: 'LASP LISIRD tsis_tsi_24hr: TSIS-1 TIM total solar irradiance, daily, at 1 AU and at the Earth, with its measurement uncertainty',
        instrument: 'TSIS-1 TIM (Total Irradiance Monitor)',
        credit:
          'LASP/TSIS-1 TIM team (the citation requested by the data provider)',
        retrieved: '2026-10-27',
        sha256: sha256(tsisBytes),
        note: 'The file has 13 rows, JD 2460435 to 2460447. The first six (2024-05-04 to 2024-05-09) are measured; the last seven are 0.0 with an uncertainty of 0.0, which are fill values, not a measurement of zero, and are marked fill here. 2024-05-17 is not in the file. This pack carries no irradiance value for 2024-05-10 to 2024-05-17.',
      },
      regionCounts:
        'NOAA SWPC solar region summaries were NOT retrieved. groupsRead is what the detector of this tool reads from the picture (dark clusters of at least 12 pixels, single linkage at 14 pixels), not NOAA’s numbered regions, and a split group counts as two.',
    },
    rules: RULES,
    groups: {
      G1: 'the isolated small spot near the equator',
      G2: 'the northern spread-out complex',
      G3: 'the large southern group that grows during the window',
    },
    marks: Object.fromEntries(
      Object.entries(tracks).map(([id, m]) => [id, { sigmaPx: 1.5, marks: m }])
    ),
    days,
    irradiance: rows,
  };
}

function clustersAtLeast(clusters, n) {
  return clusters.filter(c => c.n >= n).length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--src');
  const src = i > 0 ? process.argv[i + 1] : null;
  const check = process.argv.includes('--check');
  if (!src || !existsSync(src)) {
    process.stderr.write(
      'usage: node tools/sun-frames-build.mjs --src <retrieval dir> [--check]\n'
    );
    process.exit(2);
  }
  const sidecar = build(src, { copy: !check });
  const text = `${JSON.stringify(sidecar)}\n`;
  if (check) {
    const have = readFileSync(OUT_JSON, 'utf8');
    process.stdout.write(
      have === text ? 'frames/sun-2024-05.json is current\n' : 'STALE\n'
    );
    process.exit(have === text ? 0 : 1);
  }
  writeFileSync(OUT_JSON, text);
  process.stdout.write(
    `wrote frames/sun-2024-05.json (${text.length} bytes) and ${sidecar.days.length} pictures\n`
  );
}
