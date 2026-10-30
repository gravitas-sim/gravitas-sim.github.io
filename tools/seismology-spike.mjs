// The seismology gate's measurement (Prompt 221 Part A): runs the committed legs of
// tests/fixtures/seismology-gate/thresholds.json against js/stellar/seismology.js and the
// independent oracle (tools/seismology-oracle/oracle.py). The spike is never merged.
//
//   SEISMO_WORK=<dir> KEPLER_DIR=<dir> node tools/seismology-spike.mjs basic|real|ens [from to]|dwarf [from to]|domain|ekdra|report
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readFits, requireColumns } from './data-packs/fits.mjs';
import * as S from '../js/stellar/seismology.js';
import { activityCurveOf } from '../js/activityData.js';
import * as EK from '../js/data/observations/tessEkDraS16.js';

const WORK = process.env.SEISMO_WORK;
const KDIR = process.env.KEPLER_DIR;
const FIX = 'tests/fixtures/seismology';
const TH = JSON.parse(
  fs.readFileSync('tests/fixtures/seismology-gate/thresholds.json', 'utf8')
);
const DT = S.CADENCE_S;
const NYQ = 1e6 / (2 * DT);
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const out = (name, obj) => {
  fs.mkdirSync(path.join(WORK, 'res'), { recursive: true });
  fs.writeFileSync(path.join(WORK, 'res', name + '.json'), JSON.stringify(obj));
};
const load = name =>
  JSON.parse(fs.readFileSync(path.join(WORK, 'res', name + '.json'), 'utf8'));
const pct = (a, p) => {
  const s = Float64Array.from(a).sort();
  return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 1e-9))];
};

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function normal(u) {
  let a;
  do a = u();
  while (a <= 1e-12);
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * u());
}

function loadQuarter(file) {
  const units = readFits(new Uint8Array(fs.readFileSync(file)));
  const lc = units.find(u => u.cards.EXTNAME === 'LIGHTCURVE');
  const c = requireColumns(lc, [
    'TIME',
    'CADENCENO',
    'PDCSAP_FLUX',
    'SAP_QUALITY',
  ]);
  const cad = [];
  const flux = [];
  for (let i = 0; i < c.TIME.values.length; i++)
    if (
      c.SAP_QUALITY.values[i] === 0 &&
      Number.isFinite(c.PDCSAP_FLUX.values[i]) &&
      Number.isFinite(c.TIME.values[i])
    ) {
      cad.push(c.CADENCENO.values[i]);
      flux.push(c.PDCSAP_FLUX.values[i]);
    }
  return { cadence: cad, flux };
}
const kepler = qs => {
  const files = fs
    .readdirSync(KDIR)
    .filter(f => /_llc\.fits$/.test(f))
    .sort();
  return qs.map(q => loadQuarter(path.join(KDIR, files[q])));
};

function basic() {
  const ref = JSON.parse(
    fs.readFileSync(path.join(FIX, 'oracle-reference.json'), 'utf8')
  );
  const res = {};
  // A1
  {
    const r = ref.sine;
    const x = new Float64Array(r.n).map(
      (_, i) => r.A * Math.sin(2 * Math.PI * r.freq * 1e-6 * i * DT + r.phase)
    );
    const spec = S.powerSpectrum(x);
    const k0 = Math.round(r.freq / spec.df);
    const peak = spec.power[k0 - 1];
    const g = ref.sineGapped;
    const t = Float64Array.from(g.cadence, c => c * DT);
    const pg = S.periodogram(t, Float64Array.from(g.y), [g.freq])[0];
    res.A1 = {
      fft: rel(peak, r.analytic),
      gapped: rel(pg, g.analytic),
      gappedVsAstropy: rel(pg, g.astropy),
      peakNumpy: rel(peak, r.peak),
    };
  }
  // A2 Parseval
  {
    let worst = 0;
    for (let s = 0; s < 30; s++) {
      const u = rng(1000 + s);
      const n = 4000;
      const x = new Float64Array(n);
      let a = 0;
      for (let i = 0; i < n; i++) {
        a = 0.8 * a + 30 * normal(u);
        x[i] = s % 2 ? a : 40 * normal(u);
      }
      const spec = S.powerSpectrum(x);
      let m = 0;
      for (const v of x) m += v;
      m /= n;
      let v2 = 0;
      for (const v of x) v2 += (v - m) ** 2;
      v2 /= n;
      let integral = 0;
      for (const p of spec.power) integral += p * spec.df;
      worst = Math.max(worst, rel(integral, v2));
    }
    res.A2 = { worst };
  }
  // A3 white level, A4 gaps agree
  {
    let acc = 0;
    let na = 0;
    for (let s = 0; s < 20; s++) {
      const u = rng(2000 + s);
      const n = 8000;
      const x = Float64Array.from({ length: n }, () => 50 * normal(u));
      const spec = S.powerSpectrum(x);
      for (let k = 0; k < spec.freq.length; k++)
        if (spec.freq[k] >= 5 && spec.freq[k] <= 270) {
          acc += spec.power[k];
          na++;
        }
    }
    res.A3 = {
      measured: acc / na,
      expected: 2 * 50 ** 2 * DT * 1e-6,
      rel: rel(acc / na, 2 * 50 ** 2 * DT * 1e-6),
    };
    let fftSum = 0;
    let fftN = 0;
    let lsSum = 0;
    let lsN = 0;
    for (let s = 0; s < 20; s++) {
      const u = rng(3000 + s);
      const n = 8000;
      const x = Float64Array.from({ length: n }, () => 50 * normal(u));
      for (let i = 0; i < n; i += 12)
        if (u() < 0.1) for (let j = 0; j < 12 && i + j < n; j++) x[i + j] = NaN;
      const spec = S.powerSpectrum(x);
      for (let k = 0; k < spec.freq.length; k++)
        if (spec.freq[k] >= 5 && spec.freq[k] <= 270) {
          fftSum += spec.power[k];
          fftN++;
        }
      const t = [];
      const y = [];
      for (let i = 0; i < n; i++)
        if (Number.isFinite(x[i])) (t.push(i * DT), y.push(x[i]));
      const fr = Float64Array.from(
        { length: 1500 },
        (_, i) => 5 + (265 * (i + 0.5)) / 1500
      );
      const pg = S.periodogram(Float64Array.from(t), Float64Array.from(y), fr);
      for (const v of pg) ((lsSum += v), lsN++);
    }
    res.A4 = {
      fft: fftSum / fftN,
      ls: lsSum / lsN,
      rel: rel(lsSum / lsN, fftSum / fftN),
    };
  }
  // B1, B2
  {
    let worst = 0;
    for (const c of ref.b1) {
      const x = Float64Array.from(c.x, v => (v === null ? NaN : v));
      const spec = S.powerSpectrum(x);
      c.index.forEach(
        (k, j) => (worst = Math.max(worst, rel(spec.power[k], c.power[j])))
      );
    }
    res.B1 = { worst };
    const t = Float64Array.from(ref.b2.cadence, c => c * DT);
    const pg = S.periodogram(
      t,
      Float64Array.from(ref.b2.y),
      Float64Array.from(ref.b2.freqs)
    );
    let w2 = 0;
    pg.forEach((v, i) => (w2 = Math.max(w2, rel(v, ref.b2.power[i]))));
    res.B2 = { worst: w2 };
  }
  res.versions = {
    node: process.version,
    astropy: ref.astropy,
    numpy: ref.numpy,
  };
  out('basic', res);
  console.log(JSON.stringify(res, null, 1));
}

function realSeries(qs) {
  const q = kepler(qs);
  return S.prepareSeries(q);
}

function realLeg(name, qs) {
  const t0 = Date.now();
  const ser = realSeries(qs);
  const spec = S.powerSpectrum(ser.x, ser.dt);
  const r = S.analyse(spec, { seed: 221010, teff: 5329, teffSigma: 151 });
  const pub = TH.published;
  const m = r.massRadius;
  const rec = {
    name,
    quarters: qs,
    nValid: spec.nValid,
    n: spec.n,
    duty: spec.duty,
    clipped: ser.clipped,
    sigmaPpm: ser.sigma,
    detected: r.detected,
    reasons: r.reasons,
    deltaLogLike2: r.deltaLogLike2,
    combP: r.combP,
    numax: r.numax,
    numaxSigma: r.numaxSigma,
    dnu: r.dnu,
    dnuSigma: r.dnuSigma,
    background: r.background,
    onBound: r.onBound,
    mass: m?.mass,
    radius: m?.radius,
    seconds: (Date.now() - t0) / 1000,
  };
  if (r.detected) {
    rec.errors = {
      numax: rel(r.numax, pub.numaxMicroHz.value),
      dnu: rel(r.dnu, pub.deltaNuMicroHz.value),
      mass: m
        ? rel(m.mass.value, pub.massSolar_noDeltaNuCorrection.value)
        : null,
      radius: m
        ? rel(m.radius.value, pub.radiusSolar_noDeltaNuCorrection.value)
        : null,
    };
  }
  out(name, rec);
  if (name === 'real-subset') {
    const cad = [];
    const y = [];
    ser.x.forEach((v, i) => Number.isFinite(v) && (cad.push(i), y.push(v)));
    fs.writeFileSync(
      path.join(WORK, 'real-series.json'),
      JSON.stringify({ cadence: cad, y })
    );
  }
  console.log(JSON.stringify(rec, null, 1));
}

function realB3() {
  const f = path.join(WORK, 'real-series.json');
  const o = path.join(WORK, 'real-astropy.json');
  execFileSync('python3', ['tools/seismology-oracle/oracle.py', 'real', f, o], {
    stdio: 'inherit',
  });
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const a = JSON.parse(fs.readFileSync(o, 'utf8'));
  const t = Float64Array.from(d.cadence, c => c * DT);
  const pg = S.periodogram(
    t,
    Float64Array.from(d.y),
    Float64Array.from(a.freqs)
  );
  let worst = 0;
  pg.forEach((v, i) => (worst = Math.max(worst, rel(v, a.power[i]))));
  out('B3', { worst });
  fs.writeFileSync(
    path.join(FIX, 'real-reference.json'),
    JSON.stringify({
      series:
        'KIC 10318430 Q9-Q12 prepared by prepareSeries (SAP_QUALITY 0, PDCSAP, 99-cadence running median, 4.5 sigma clip)',
      n: d.y.length,
      freqs: a.freqs,
      power: a.power,
    })
  );
  console.log('B3 worst', worst);
}

function ensemble(kind, from, to) {
  const truth = JSON.parse(
    fs.readFileSync(path.join(WORK, 'ens', 'truth.json'), 'utf8')
  );
  const list = truth[kind];
  const prefix = { ensemble: 'ens', dwarf: 'dwarf', domain: 'domain' }[kind];
  for (let i = from; i < Math.min(to, list.length); i++) {
    const name = `${prefix}-${String(i).padStart(3, '0')}`;
    if (fs.existsSync(path.join(WORK, 'res', name + '.json'))) continue;
    const buf = fs.readFileSync(path.join(WORK, 'ens', name + '.f32'));
    const f32 = new Float32Array(
      buf.buffer,
      buf.byteOffset,
      buf.byteLength / 4
    );
    const x = Float64Array.from(f32);
    const t0 = Date.now();
    const spec = S.powerSpectrum(x);
    const r = S.analyse(spec, {
      seed: list[i].seed,
      teff: 4800,
      teffSigma: 150,
    });
    out(name, {
      truth: list[i],
      r: { ...r, background0: undefined },
      seconds: (Date.now() - t0) / 1000,
    });
    console.log(
      name,
      r.detected,
      r.numax?.toFixed(2),
      r.dnu?.toFixed(3),
      ((Date.now() - t0) / 1000).toFixed(1) + ' s'
    );
  }
}

async function ekdra() {
  const sidecar = JSON.parse(
    fs.readFileSync('variables/tess-ek-dra-s16.json', 'utf8')
  );
  const c = activityCurveOf({ PACK: EK.PACK, SERIES: sidecar });
  const w = 1800 / 86400;
  const cadence = Array.from(c.t, t => Math.round((t - c.t[0]) / w));
  const ser = S.prepareSeries([{ cadence, flux: Array.from(c.flux) }], {
    dt: 1800,
  });
  const spec = S.powerSpectrum(ser.x, 1800);
  const r = S.analyse(spec, { seed: 221020 });
  out('N2', {
    detected: r.detected,
    reasons: r.reasons,
    deltaLogLike2: r.deltaLogLike2,
    combP: r.combP,
    numax: r.numax,
    nValid: spec.nValid,
    n: spec.n,
    duty: spec.duty,
  });
  console.log(
    JSON.stringify({
      detected: r.detected,
      reasons: r.reasons,
      dll2: r.deltaLogLike2,
      combP: r.combP,
    })
  );
}

const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'basic') basic();
else if (cmd === 'real') {
  realLeg('real-subset', [9, 10, 11, 12]);
  realB3();
  realLeg(
    'real-full',
    Array.from({ length: 18 }, (_, i) => i)
  );
} else if (cmd === 'ens') ensemble('ensemble', +(a ?? 0), +(b ?? 200));
else if (cmd === 'dwarf') ensemble('dwarf', +(a ?? 0), +(b ?? 200));
else if (cmd === 'domain') ensemble('domain', +(a ?? 0), +(b ?? 100));
else if (cmd === 'ekdra') await ekdra();
else throw new Error('unknown command');
export { load, pct };
