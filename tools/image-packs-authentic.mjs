// =============================================================================
// The authentic legs of Prompts 181, 182, 185 and 186 on the new data (Prompt 189, contract part 3)
// -----------------------------------------------------------------------------
// tests/fixtures/imagePacks/analysis-contract-3.json fixed, before any of this ran,
// what the 84 TESS full-frame cutouts, the Gaia DR3 subset and the Hipparcos row
// are asked, and against which bounds. This module runs those legs against the
// production modules and judges them. What an oracle (photutils, astropy; run
// offline by tools/image-packs-oracle/oracle-authentic.py, results pinned in
// tests/fixtures/imagePacks/authentic/oracle-results.json) was given is only
// what Gravitas decided: the matched stars, the solution, the apertures and the
// positions it measured. A bound is read from the earlier prompt's committed
// thresholds file where the contract names one.
// =============================================================================

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { permits } from '../js/dataKinds/contract.js';
import { adapt } from '../js/measure/photometry.js';
import { detectIn } from '../js/measure/detect.js';
import {
  fitWcs,
  fromHeader,
  pixelOf,
  skyOf,
} from '../js/measure/astrometry.js';
import { moveStar, starsIn } from '../js/measure/overlay.js';
import {
  reduceOne,
  runSequence,
  sidecarOf,
} from '../js/measure/frameSeries.js';
import { fitMotion, twoEpochShift } from '../js/measure/astrometric-series.js';
import { observationOf } from '../js/observation.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const AUTH = 'tests/fixtures/imagePacks/authentic';
const json = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const bytesOf = rel => readFileSync(path.join(ROOT, rel));
const sha = b => createHash('sha256').update(b).digest('hex');

export const CONTRACT3 = json(
  'tests/fixtures/imagePacks/analysis-contract-3.json'
);
const L = CONTRACT3.legs;
const PHOT = json('tests/fixtures/photometry/thresholds.json').checks;
const ASTRO = json('tests/fixtures/astrometry/thresholds.json').checks;
const FPIPE = json('tests/fixtures/framepipeline/thresholds.json').checks;

const DAY = 86400;
const J2000_JD = 2451545.0;
const GAIA_EPOCH_JD = 2457389.0; // J2016.0
const HIP_EPOCH_JD = 2448349.0625; // J1991.25
/** The frame the astrometry legs use (the middle one, chosen in the contract). */
const FRAME_K = 42;
/** The detection parameters of the part 1 contract, as the contract names them. */
const DETECTION = { box: 16, fwhm: 2, sigma: 4, minArea: 5 };
const GAIA_G = 16;
const MATCH = { radius: 2, isolation: 4, minMatched: 8 };
/** The target's measured centroid of the pack, carried to the cutout (the contract's (40.13, 41.64)). */
const TARGET = { x: 40.13, y: 41.64 };

const csv = text => {
  const [head, ...lines] = text.trim().split('\n');
  const keys = head.split(',');
  return lines.map(l =>
    Object.fromEntries(l.split(',').map((v, i) => [keys[i], v]))
  );
};
const num = v => Number(v);

// ---- loading ------------------------------------------------------------------

export function loadAuthentic() {
  const prov = json(`${AUTH}/provenance.json`);
  const raw = bytesOf(`${AUTH}/ffi-cutout-s56-1-2.f32`);
  const cube = new Float32Array(
    raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)
  );
  const [n, h, w] = prov.tessFfi.cutout.shape;
  const frames = prov.tessFfi.frames;
  const exposure = (frames.reduce((s, f) => s + f.exposureDays, 0) / n) * DAY;
  const times = frames.map(f => (f.tstartBtjd + f.tstopBtjd) / 2);
  const pack = json('data-packs/tess-hd209458-s56-frame.json');
  const gaiaText = bytesOf(`${AUTH}/gaia-dr3-window.csv`);
  const hipText = bytesOf(`${AUTH}/hip2-hd209458.csv`);
  const gain = pack.image.sidecar.pixels.gain.value;
  const readNoise = pack.image.sidecar.pixels.readNoise.value;
  const satRate = pack.image.sidecar.pixels.saturation.level;
  const seq = {
    id: 'tess-s56-ffi-hd209458',
    kind: 'authentic',
    count: n,
    width: w,
    height: h,
    exposure,
    times,
    gain,
    readNoise,
    fullWell: satRate * exposure,
    calibration: 'electrons',
    frameAt(k) {
      const v = new Float64Array(w * h);
      const o = k * w * h;
      for (let i = 0; i < w * h; i++) v[i] = cube[o + i] * exposure;
      return { width: w, height: h, exposure, values: v, time: times[k] };
    },
  };
  return {
    prov,
    raw,
    cube,
    n,
    w,
    h,
    exposure,
    times,
    seq,
    pack,
    satRate,
    gaiaText,
    hipText,
    gaia: csv(gaiaText.toString('utf8')),
    hip: csv(hipText.toString('utf8'))[0],
  };
}

const jdOf = btjd => btjd + 2457000;

// ---- the decisions Gravitas makes (and the oracle is given) ------------------------

/**
 * The contract's own choices are the defaults. `variant` is the second run made
 * after the first one failed (contract part 4): it drops no 'crowded' flag, matches
 * only Gaia stars of G 14 or brighter, and gives the pipeline the FWHM part 1
 * states for TESS.
 */
export const VARIANTS = {
  main: {
    dropFlags: ['saturated', 'edge', 'masked', 'crowded'],
    matchG: GAIA_G,
    params: { target: TARGET },
  },
  v2: {
    dropFlags: ['saturated', 'edge', 'masked'],
    matchG: 14,
    params: { target: TARGET, fwhm: 2 },
  },
};

export async function decide(A, opts = VARIANTS.main) {
  const out = { A, opts };
  const { seq } = A;
  // anchor WCS: the pack's, carried to the cutout
  const h0 = fromHeader(A.pack.image.sidecar.wcs);
  if (!h0.ok) throw new Error(`the pack's WCS was refused: ${h0.code}`);
  const anchor = {
    ...h0.wcs,
    crpix: [h0.wcs.crpix[0] + 35, h0.wcs.crpix[1] + 36],
  };
  out.anchor = anchor;
  // the frame the astrometry legs use
  const red = reduceOne(seq, seq.frameAt(FRAME_K));
  const frame = {
    id: `${seq.id}#${FRAME_K}`,
    width: seq.width,
    height: seq.height,
    data: red.work.values,
    sidecar: sidecarOf(seq, FRAME_K),
  };
  const a = adapt(frame, permits);
  if (!a.ok) throw new Error(`the frame was refused: ${a.code}`);
  out.cosmicFrame = red.cosmic;
  const det = detectIn(a, DETECTION);
  out.det = det;
  const tTdb = jdOf(seq.times[FRAME_K]);
  out.epochJdTdb = tTdb;
  // the catalogue at the frame's epoch (the epoch 2016.0 position, moved by proper motion)
  const stars = A.gaia
    .map((r, i) => ({
      hr: i,
      source: r.Source,
      raDeg: num(r.RA_ICRS),
      decDeg: num(r.DE_ICRS),
      v: num(r.Gmag),
      pmRaArcsecYr: num(r.pmRA || 0) / 1000,
      pmDecArcsecYr: num(r.pmDE || 0) / 1000,
      plx: num(r.Plx || 0),
      pmRaMas: num(r.pmRA || 0),
      pmDecMas: num(r.pmDE || 0),
      desig: r.Source,
      name: r.Source,
    }))
    .filter(s => s.v <= GAIA_G);
  out.stars = stars;
  // moveStar measures the motion from J2000.0; Gaia's positions are at J2016.0
  const jdForMove = J2000_JD + (tTdb - GAIA_EPOCH_JD);
  out.jdForMove = jdForMove;
  const moved = stars.map(s => ({ s, at: moveStar(s, jdForMove) }));
  out.moved = moved;
  const pred = moved
    .filter(m => m.s.v <= opts.matchG)
    .map(m => {
      const p = pixelOf(anchor, m.at.ra, m.at.dec);
      return p ? { ...m, x: p.x, y: p.y } : null;
    });
  const dets = det.ok ? det.sources : [];
  const good = dets.filter(
    s =>
      !s.flags.some(f => ['saturated', 'edge', 'masked', 'crowded'].includes(f))
  );
  const nearestStar = (x, y) => {
    let best = null;
    for (const p of pred) {
      if (!p) continue;
      const d = Math.hypot(p.x - (x + 1), p.y - (y + 1));
      if (!best || d < best.d) best = { p, d };
    }
    return best;
  };
  const nearestDet = (p, list) => {
    let best = null;
    for (const s of list) {
      const d = Math.hypot(p.x - (s.x + 1), p.y - (s.y + 1));
      if (!best || d < best.d) best = { s, d };
    }
    return best;
  };
  const pairs = [];
  for (const d of good) {
    const b = nearestStar(d.x, d.y);
    if (!b || b.d > MATCH.radius) continue;
    const back = nearestDet(b.p, dets);
    if (back.s !== d) continue;
    const crowded = pred.some(
      q =>
        q && q !== b.p && Math.hypot(q.x - b.p.x, q.y - b.p.y) < MATCH.isolation
    );
    if (crowded) continue;
    pairs.push({
      id: b.p.s.source,
      x: d.x + 1,
      y: d.y + 1,
      ra: b.p.at.ra,
      dec: b.p.at.dec,
      g: b.p.s.v,
      dist: b.d,
    });
  }
  out.pairs = pairs;
  out.fit =
    pairs.length >= 3
      ? fitWcs(
          pairs.map(p => ({ id: p.id, x: p.x, y: p.y, ra: p.ra, dec: p.dec })),
          { model: 'affine' }
        )
      : null;
  if (out.fit?.ok) {
    const grid = [];
    const sky = [];
    for (const gy of [1, 21, 41, 61, 81])
      for (const gx of [1, 21, 41, 61, 81]) {
        grid.push([gx, gy]);
        const s = skyOf(out.fit.wcs, gx, gy);
        sky.push([s.ra, s.dec]);
      }
    out.grid = grid;
    out.gridSky = sky;
    out.listed = starsIn(
      stars,
      out.fit.wcs,
      { width: seq.width, height: seq.height },
      { jdTt: jdForMove, magnitude: GAIA_G + 0.001, limit: 500 }
    );
  }
  // the pipeline
  const hooks = { check: permits, yieldNow: async () => {} };
  out.res = await runSequence(seq, opts.params, hooks);
  return out;
}

// ---- the oracle's inputs --------------------------------------------------------------

/** What the oracle is given for one run: the matched stars and solution, the apertures and the positions measured. */
function sectionInputs(D) {
  const { A, fit, res } = D;
  const sec = { fit: null, overlay: null, photometry: null };
  if (fit?.ok && D.pairs.length >= MATCH.minMatched) {
    sec.fit = {
      stars: D.pairs.map(p => ({
        id: p.id,
        x: p.x,
        y: p.y,
        ra: p.ra,
        dec: p.dec,
      })),
      tangent: fit.tangent,
      grid: D.grid,
      sky: D.gridSky,
    };
    sec.overlay = {
      solution: { crpix: fit.wcs.crpix, crval: fit.wcs.crval, cd: fit.wcs.cd },
      epochJdTdb: D.epochJdTdb,
      gaiaEpochJd: GAIA_EPOCH_JD,
      width: A.w,
      height: A.h,
      stars: D.stars.map(s => ({
        hr: s.hr,
        source: s.source,
        ra: s.raDeg,
        dec: s.decDeg,
        pmra: s.pmRaMas,
        pmde: s.pmDecMas,
        g: s.v,
      })),
      magnitude: GAIA_G,
    };
  }
  if (res?.ok) {
    const ids = [res.target, ...res.chosen];
    sec.photometry = {
      aperture: {
        r: res.aperture.r,
        rIn: res.aperture.rIn,
        rOut: res.aperture.rOut,
      },
      target: res.target,
      chosen: res.chosen,
      frames: res.used.map(k => ({
        k,
        stars: ids.map(id => {
          const st = res.frames.get(k).stars.find(q => q.id === id);
          return { id, x: st.x, y: st.y };
        }),
      })),
    };
  }
  return sec;
}

export function oracleInputs(Ds) {
  const A = Ds.main.A;
  return {
    format: 'gravitas.image-packs-authentic-oracle-inputs/1',
    prompt: 189,
    part: 3,
    contract: 'tests/fixtures/imagePacks/analysis-contract-3.json',
    cube: {
      file: `${AUTH}/ffi-cutout-s56-1-2.f32`,
      sha256: sha(A.raw),
      shape: A.prov.tessFfi.cutout.shape,
      exposureSeconds: A.exposure,
    },
    sections: Object.fromEntries(
      Object.entries(Ds).map(([k, D]) => [k, sectionInputs(D)])
    ),
    series: seriesInput(A),
  };
}

/** The Gaia row of the Hipparcos star: the brightest Gaia source within 2 arcseconds of the Hipparcos position carried to 2016.0. */
function hipMatch(A) {
  const ra = num(A.hip.RArad);
  const dec = num(A.hip.DErad);
  let best = null;
  for (const r of A.gaia) {
    const d =
      Math.hypot(
        (num(r.RA_ICRS) - ra) * Math.cos((dec * Math.PI) / 180),
        num(r.DE_ICRS) - dec
      ) * 3600;
    if (d < 2 && (!best || num(r.Gmag) < num(best.Gmag))) best = r;
  }
  return { gaia: best };
}

// ---- transit estimators ----------------------------------------------------------------

const median = a => {
  const s = Array.from(a).sort((x, y) => x - y);
  const k = s.length >> 1;
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
};
/** The midpoint of the first downward and the last upward crossing of a level. */
function crossings(t, f, level) {
  let down = null;
  let up = null;
  for (let i = 0; i + 1 < f.length; i++) {
    if (down === null && f[i] >= level && f[i + 1] < level)
      down = t[i] + ((f[i] - level) / (f[i] - f[i + 1])) * (t[i + 1] - t[i]);
    if (f[i] < level && f[i + 1] >= level)
      up = t[i] + ((level - f[i]) / (f[i + 1] - f[i])) * (t[i + 1] - t[i]);
  }
  return down === null || up === null
    ? null
    : { down, up, mid: (down + up) / 2 };
}
const pick = (t, f, ok) => {
  const tt = [];
  const ff = [];
  t.forEach((x, i) => {
    if (ok(x)) {
      tt.push(x);
      ff.push(f[i]);
    }
  });
  return [tt, ff];
};

/** The SPOC bins of the repository's light curve: times (BTJD) and flux. */
async function spoc() {
  const m = await import('../js/data/observations/tessHd209458S56.js');
  const ob = observationOf(m);
  return {
    t: Array.from(Object.values(ob.x.values)),
    f: Array.from(Object.values(ob.y.values)),
  };
}

/** Depth and centre of the SPOC curve, then of the pipeline's, by the contract's windows. */
export async function transit(D) {
  const { A, res } = D;
  const S = await spoc();
  const t0 = A.times[0];
  const t1 = A.times[A.times.length - 1];
  const mid = (t0 + t1) / 2; // the window's own middle
  // SPOC: normalise by the far baseline, find the centre, then the depth about it
  const far = pick(
    S.t,
    S.f,
    x => Math.abs(x - mid) >= 0.1 && Math.abs(x - mid) <= 0.3
  )[1];
  const fn = S.f.map(v => v / median(far));
  const cen0 = median(pick(S.t, fn, x => Math.abs(x - mid) <= 0.03)[1]);
  const cr0 = crossings(S.t, fn, 1 - (1 - cen0) / 2);
  const tc = cr0.mid;
  const oot = median(
    pick(S.t, S.f, x => Math.abs(x - tc) >= 0.075 && Math.abs(x - tc) <= 0.3)[1]
  );
  const inn = median(pick(S.t, S.f, x => Math.abs(x - tc) <= 0.04)[1]);
  const depthSpoc = 1 - inn / oot;
  const crSpoc = crossings(
    S.t,
    S.f.map(v => v / oot),
    1 - depthSpoc / 2
  );
  const spocCentre = crSpoc.mid;
  // the pipeline's curve
  const dm = Array.from(res.dm);
  const t = Array.from(res.times);
  const dmOot = median(pick(t, dm, x => Math.abs(x - tc) >= 0.075)[1]);
  const fl = dm.map(v => 10 ** (-0.4 * (v - dmOot)));
  const inF = median(pick(t, fl, x => Math.abs(x - tc) <= 0.04)[1]);
  const depthFfi = 1 - inF;
  const crFfi = crossings(t, fl, 1 - depthFfi / 2);
  // the noise leg
  const ootIdx = t
    .map((x, i) => (Math.abs(x - tc) >= 0.075 ? i : -1))
    .filter(i => i >= 0);
  const resid = ootIdx.map(i => dm[i] - dmOot);
  const rms = Math.sqrt(resid.reduce((s, v) => s + v * v, 0) / resid.length);
  const sig = median(ootIdx.map(i => res.dmSigma[i]));
  return {
    tc,
    spocCentre,
    depthSpoc,
    depthFfi,
    centreFfi: crFfi?.mid ?? null,
    nIn: pick(t, fl, x => Math.abs(x - tc) <= 0.04)[1].length,
    nOot: ootIdx.length,
    rms,
    sig,
    ratio: rms / sig,
    ootDm: dmOot,
  };
}

// ---- the legs --------------------------------------------------------------------------

/** The fit, overlay and pipeline legs of one run; `sfx` is '' for the contract's own and '.v2' for the variant. */
async function runLegs(A, D, O, sfx, add, rows) {
  const tag = sfx ? ' (variant: contract part 4)' : '';
  const fit = D.fit;
  const B5 = L['astrometry.b5.fit'];
  if (!fit?.ok || D.pairs.length < MATCH.minMatched) {
    add(`astrometry.b5.fit${sfx}`, D.pairs.length, false, {
      bound: B5.bounds,
      note: `${D.pairs.length} stars matched of ${D.det.sources?.length ?? 0} detections (the leg needs ${MATCH.minMatched})${fit && !fit.ok ? `; the fit refused with '${fit.code}'` : ''}${tag}`,
    });
    add(`astrometry.e1.frame${sfx}`, null, false, {
      bound: L['astrometry.e1.frame'].bounds,
      note: `no solution to judge: the leg above did not match enough stars${tag}`,
    });
    add(`overlay.b5.gaia${sfx}`, null, false, {
      bound: L['overlay.b5.gaia'].bounds,
      note: `no solution to overlay: the leg above did not match enough stars${tag}`,
    });
  } else if (!O?.fit) {
    add(`astrometry.b5.fit${sfx}`, null, false, {
      note: 'no oracle result for the fit',
    });
  } else {
    let worst = 0;
    D.grid.forEach(([gx, gy], i) => {
      const o = O.fit.pixels[i];
      worst = Math.max(worst, Math.hypot(o[0] - gx, o[1] - gy));
    });
    const bound = ASTRO['b2.oracleFit'].boundPix;
    add(`astrometry.b5.fit${sfx}`, worst, worst <= bound, {
      bound,
      note: `${D.pairs.length} stars matched of ${D.det.sources.length} detections (G ${Math.min(...D.pairs.map(p => p.g)).toFixed(1)} to ${Math.max(...D.pairs.map(p => p.g)).toFixed(1)}); largest difference over 25 grid pixels from astropy fit_wcs_from_points (pixels)${tag}`,
    });
    const rms = fit.stats.rmsPix;
    const E1 = L['astrometry.e1.frame'].bounds;
    const cd = fit.wcs.cd;
    add(
      `astrometry.e1.frame${sfx}`,
      rms,
      rms <= E1.rmsPix && fit.verdict === E1.verdict,
      {
        bound: E1,
        note: `residual rms ${rms.toFixed(3)} pixel (${fit.stats.rmsArcsec.toFixed(2)} arcsec) over ${fit.stats.n} stars, ${fit.stats.dof} degrees of freedom, p ${fit.stats.p.toExponential(2)}, verdict '${fit.verdict}'; scale ${(Math.sqrt(Math.abs(cd[0][0] * cd[1][1] - cd[0][1] * cd[1][0])) * 3600).toFixed(3)} arcsec/pixel${tag}`,
      }
    );
    const ours = new Map(D.listed.entries.map(e => [e.hr, e]));
    const theirs = new Map(O.overlay.stars.map(q => [q.hr, q]));
    let px = 0;
    for (const [hr, e] of ours) {
      const o = theirs.get(hr);
      if (o) px = Math.max(px, Math.hypot(o.x - e.x, o.y - e.y));
    }
    const oursSet = [...ours.keys()].sort((x, y) => x - y);
    const theirSet = O.overlay.inFrame.slice().sort((x, y) => x - y);
    const same = JSON.stringify(oursSet) === JSON.stringify(theirSet);
    const ob = L['overlay.b5.gaia'].bounds.boundPix;
    add(`overlay.b5.gaia${sfx}`, px, px <= ob && same, {
      bound: ob,
      note: `${oursSet.length} Gaia stars (G ${GAIA_G} or brighter) listed in the frame, astropy lists ${theirSet.length}: same set ${same}; largest pixel difference over the listed stars${tag}`,
    });
  }
  // the pipeline
  const res = D.res;
  const G = L['framepipeline.g1.complete'].bounds;
  if (!res.ok) {
    add(`framepipeline.g1.complete${sfx}`, 0, false, {
      bound: G,
      note: `the pipeline refused with '${res.code}'${res.frames ? ` (frames ${res.frames.join(', ')})` : ''}${res.reasons ? ` ${JSON.stringify(res.reasons)}` : ''}${tag}`,
    });
    for (const id of ['oracle', 'transit', 'noise'])
      add(`framepipeline.g1.${id}${sfx}`, null, false, {
        bound: L[`framepipeline.g1.${id}`].bounds,
        note: `no light curve: the pipeline refused${tag}`,
      });
    return;
  }
  const n = res.dm.length;
  const cosmic = res.nodes[0].quantities.find(
    q => q.id === 'cosmicPixels'
  ).value;
  add(
    `framepipeline.g1.complete${sfx}`,
    n,
    n === G.points &&
      res.refusedFrames.length === G.refusedFrames &&
      res.chosen.length >= G.comparisonAtLeast,
    {
      bound: G,
      note: `${n} points, ${res.chosen.length} comparison stars chosen (${res.chosen.join(', ')}) of ${res.comparison.candidates.length} candidates, ${res.marks.length} marks, target ${res.target}, FWHM ${res.fwhm.toFixed(2)} px, aperture ${res.aperture.r}/${res.aperture.rIn}/${res.aperture.rOut}; the cosmic-ray mask replaced ${cosmic} pixels in all${tag}`,
    }
  );
  const OR = O?.photometry;
  if (!OR)
    add(`framepipeline.g1.oracle${sfx}`, null, false, {
      note: 'no oracle result for the photometry',
    });
  else {
    const ids = [res.target, ...res.chosen];
    let worstNet = 0;
    let worstDm = 0;
    for (const f of OR.frames) {
      const fr = res.frames.get(f.k);
      for (const id of ids) {
        const mine = fr.stars.find(q => q.id === id).net;
        const theirs = f.net[id] * A.exposure;
        worstNet = Math.max(
          worstNet,
          Math.abs(mine - theirs) / Math.abs(theirs)
        );
      }
    }
    OR.frames.forEach((f, i) => {
      worstDm = Math.max(worstDm, Math.abs(res.dm[i] - f.dm));
    });
    const nb =
      PHOT['b1.apertureSumExact'].bound ??
      PHOT['b1.apertureSumExact'].boundRelative;
    const db = FPIPE['a3.lab'].bounds.dmWithin;
    add(
      `framepipeline.g1.oracle${sfx}`,
      worstNet,
      worstNet <= nb && worstDm <= db,
      {
        bound: { netRelative: nb, dmMag: db },
        note: `${ids.length} stars in ${OR.frames.length} frames against photutils (exact aperture, clipped annulus); largest relative net difference ${worstNet.toExponential(2)}, largest differential magnitude difference ${worstDm.toExponential(2)} mag${tag}`,
      }
    );
  }
  const T = await transit(D);
  D.transit = T;
  const TB = L['framepipeline.g1.transit'].bounds;
  const dd = Math.abs(T.depthFfi - T.depthSpoc);
  const dc =
    T.centreFfi === null
      ? Infinity
      : Math.abs(T.centreFfi - T.spocCentre) * 1440;
  add(
    `framepipeline.g1.transit${sfx}`,
    dd,
    dd <= TB.depthDifference && dc <= TB.centreMinutes,
    {
      bound: TB,
      note: `depth ${(T.depthFfi * 100).toFixed(3)} percent from the ${T.nIn} frames within 0.04 d of the centre (SPOC ${(T.depthSpoc * 100).toFixed(3)} percent); centre BTJD ${T.centreFfi?.toFixed(4)} (SPOC ${T.spocCentre.toFixed(4)}), ${dc.toFixed(2)} minutes apart; ${T.nOot} out-of-transit frames${tag}`,
    }
  );
  const NB = L['framepipeline.g1.noise'].bounds.ratioWithin;
  add(
    `framepipeline.g1.noise${sfx}`,
    T.ratio,
    T.ratio >= NB[0] && T.ratio <= NB[1],
    {
      bound: NB,
      note: `out-of-transit scatter ${(T.rms * 1e6).toFixed(0)} ppm against a stated ${(T.sig * 1e6).toFixed(0)} ppm per point${tag}`,
    }
  );
}

export async function authenticRows(oracle, cache = {}) {
  const rows = [];
  const add = (id, measured, pass, extra = {}) =>
    rows.push({ id, measured, pass, ...extra });
  const A = loadAuthentic();
  const Ds = {
    main: cache.main ?? (await decide(A, VARIANTS.main)),
    v2: cache.v2 ?? (await decide(A, VARIANTS.v2)),
  };
  // integrity
  {
    const P = A.prov;
    const stepOk = A.times.every(
      (t, i) =>
        i === 0 ||
        Math.abs((t - A.times[i - 1]) * DAY - 200) <=
          L['authentic.integrity'].bounds.spacingSecondsWithin
    );
    const finite = A.cube.every(Number.isFinite);
    let peak = -Infinity;
    for (const v of A.cube) if (v > peak) peak = v;
    const hashes =
      sha(A.raw) === P.tessFfi.cutout.sha256 &&
      sha(A.gaiaText) === P.gaia.subset.sha256 &&
      sha(A.hipText) === P.hipparcos.answer.sha256;
    add(
      'authentic.integrity',
      A.n,
      A.n === 84 &&
        A.raw.length === P.tessFfi.cutout.bytes &&
        finite &&
        stepOk &&
        peak < A.satRate &&
        hashes,
      {
        bound: L['authentic.integrity'].bounds,
        note: `${A.n} frames of ${A.w} by ${A.h}, all finite: ${finite}; spacing 200 s: ${stepOk}; peak ${peak.toFixed(0)} electron/s under ${A.satRate}; the three files are the ones the provenance names: ${hashes}`,
      }
    );
  }
  await runLegs(A, Ds.main, oracle?.sections?.main, '', add, rows);
  rows.push({
    id: 'overlay.e1.pair',
    measured: null,
    pass: null,
    note: L['overlay.e1.pair'].status,
  });
  await runLegs(A, Ds.v2, oracle?.sections?.v2, '.v2', add, rows);
  // 186: the motion
  {
    const SB = L['series.b6.motion'].bounds;
    const g = hipMatch(A).gaia;
    if (!g)
      add('series.b6.motion', null, false, {
        note: 'no Gaia source within 2 arcseconds of the Hipparcos position',
      });
    else {
      const mas = v => num(v) / 1000;
      const epochs = [
        {
          time: { value: HIP_EPOCH_JD, format: 'jd', scale: 'tt' },
          ra: num(A.hip.RArad),
          dec: num(A.hip.DErad),
          sigma: [mas(A.hip.e_RArad), mas(A.hip.e_DErad)],
        },
        {
          time: { value: GAIA_EPOCH_JD, format: 'jd', scale: 'tdb' },
          ra: num(g.RA_ICRS),
          dec: num(g.DE_ICRS),
          sigma: [mas(g.e_RA_ICRS), mas(g.e_DE_ICRS)],
        },
      ];
      const fm = fitMotion({ epochs });
      const sh = twoEpochShift(epochs[0], epochs[1]);
      if (!fm.ok || !sh.ok)
        add('series.b6.motion', null, false, {
          note: `refused: ${fm.code ?? sh.code}`,
        });
      else {
        const dx = Math.abs(fm.params.mux.value * 1000 - num(g.pmRA));
        const dy = Math.abs(fm.params.muy.value * 1000 - num(g.pmDE));
        const sepO = oracle?.series?.separationArcsec;
        const ds =
          sepO === undefined ? Infinity : Math.abs(sh.separation - sepO);
        const label = Boolean(fm.label) && Boolean(sh.label);
        add(
          'series.b6.motion',
          Math.max(dx, dy),
          dx <= SB.pmComponentMasPerYr &&
            dy <= SB.pmComponentMasPerYr &&
            ds <= SB.separationArcsec &&
            label,
          {
            bound: SB,
            note: `two epochs (Hipparcos 1991.25, Gaia ${g.Source} 2016.0, ${fm.spanYears.toFixed(2)} years): proper motion (${(fm.params.mux.value * 1000).toFixed(3)} +/- ${(fm.params.mux.sigma * 1000).toFixed(3)}, ${(fm.params.muy.value * 1000).toFixed(3)} +/- ${(fm.params.muy.sigma * 1000).toFixed(3)}) mas/yr against Gaia's (${g.pmRA}, ${g.pmDE}): differences ${dx.toFixed(3)} and ${dy.toFixed(3)}; Hipparcos's own (${A.hip.pmRA}, ${A.hip.pmDE}); separation ${(sh.separation * 1000).toFixed(3)} mas against astropy's, difference ${ds.toExponential(2)} arcsec; label on the results: ${label}`,
          }
        );
      }
    }
  }
  rows.push({
    id: 'series.b6.series',
    measured: null,
    pass: null,
    note: L['series.b6.series'].status,
  });
  rows.push({
    id: 'calibration.authentic',
    measured: null,
    pass: null,
    note: L['calibration.authentic'].status,
  });
  return { rows, Ds };
}

/** The oracle's inputs for series, added after the others (they need only the data). */
export function seriesInput(A) {
  const g = hipMatch(A).gaia;
  return {
    epochs: [
      { ra: num(A.hip.RArad), dec: num(A.hip.DErad) },
      { ra: num(g.RA_ICRS), dec: num(g.DE_ICRS) },
    ],
  };
}
