// SPIKE (Prompt 87). Runs every candidate against the pinned published values and
// the ERFA references in fixtures/refs.json (python3 gen_refs.py makes it), and
// writes results.json. The thresholds are in THRESHOLDS.md and are not read here:
// the limits below are copied from it and checked by eye in the gate document.
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as OW from '../../js/observingWindow.js';
import * as T from './lib/time.js';
import * as C from './lib/coords.js';
import * as S from './lib/solar.js';
import * as P from './lib/planets.js';
import { makeFastFrame, unitVector } from './lib/fastframe.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REF = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/refs.json'), 'utf8'));
const PUB = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/published.json'), 'utf8'));
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const wrap = (d, p) => ((((d + p / 2) % p) + p) % p) - p / 2;
const max = a => a.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
const hms = s => { const m = /(\d+)h(\d+)m([\d.]+)s/.exec(s); return +m[1] * 15 + +m[2] * 0.25 + +m[3] / 240; };
const dms = s => { const m = /(-?)(\d+)d(\d+)m([\d.]+)s/.exec(s); return (m[1] ? -1 : 1) * (+m[2] + m[3] / 60 + m[4] / 3600); };
const sep = (r1, d1, r2, d2) => {
  const a = r1 * DEG, b = d1 * DEG, c = r2 * DEG, d = d2 * DEG;
  return Math.atan2(Math.hypot(Math.cos(d) * Math.sin(c - a), Math.cos(b) * Math.sin(d) - Math.sin(b) * Math.cos(d) * Math.cos(c - a)), Math.sin(b) * Math.sin(d) + Math.cos(b) * Math.cos(d) * Math.cos(c - a)) * RAD;
};
const results = [];
const rec = (id, what, value, unit, limit, extra = {}) => {
  const pass = value <= limit;
  results.push({ id, what, value, unit, limit, pass, ...extra });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${id.padEnd(7)} ${what}: ${Number(value).toPrecision(4)} ${unit} (limit ${limit})`);
};
const info = (id, what, value, unit) => {
  results.push({ id, what, value, unit, limit: null, pass: null });
  console.log(`INFO ${id.padEnd(7)} ${what}: ${typeof value === 'number' ? Number(value).toPrecision(4) : value} ${unit}`);
};
const DT = REF.meta.dtIn;
const ut = REF.time.ut1;
const tt = ut.map(u => u + DT / 86400);

// ---- T1.1 Julian date
{
  let e = 0;
  for (const c of PUB.jd) e = Math.max(e, Math.abs(OW.julianDate(c.y, c.m, c.d) - c.jd));
  rec('T1.1a', 'existing julianDate vs Meeus ch.7', e, 'd', 1e-9);
  let e2 = 0;
  for (const [y, m, d, jd] of REF.calendar) e2 = Math.max(e2, Math.abs(OW.julianDate(y, m, d) - jd));
  rec('T1.1b', 'existing julianDate vs ERFA cal2jd, weekly 1900-2100', e2, 'd', 1e-9);
  // round trip
  let e3 = 0;
  for (const [y, m, d, jd] of REF.calendar) { const c = OW.calendarDate(jd + 0.5); if (c.year !== y || c.month !== m || c.day !== d) e3++; }
  rec('T1.1c', 'calendarDate round-trip mismatches', e3, 'dates', 0);
}
// ---- T1.2 GMST
{
  const e = ut.map((u, i) => wrap(OW.greenwichMeanSiderealTime(u) * 240 - REF.time.gmstSec[i], 86400));
  rec('T1.2a', 'existing GMST vs ERFA gmst06, 1900-2100', max(e), 's of time', 1);
  const a = PUB.siderealTime[0], b = PUB.siderealTime[1];
  rec('T1.2b', 'existing GMST vs Meeus 12.a', Math.abs(wrap(OW.greenwichMeanSiderealTime(a.jdUt) - a.gmstDeg, 360)) * 240, 's of time', 0.01);
  const hmsSec = s => hms(s) * 240;
  rec('T1.2c', 'existing GMST vs Meeus 12.b', Math.abs(wrap(OW.greenwichMeanSiderealTime(b.jdUt) * 240 - hmsSec(b.gmstHms), 86400)), 's of time', 0.01);
}
// ---- T1.3 GAST and nutation
{
  const e = ut.map((u, i) => wrap(T.gastDeg(u, tt[i]) * 240 - REF.time.gstSec[i], 86400));
  rec('T1.3a', 'spike apparent sidereal time vs ERFA gst06a', max(e), 's of time', 1);
  const a = PUB.siderealTime[0];
  const g = T.gastDeg(a.jdUt, a.jdUt + 57 / 86400);
  rec('T1.3b', 'spike apparent sidereal time vs Meeus 12.a', Math.abs(wrap(g * 240 - hms(a.gastHms) * 240, 86400)), 's of time', 0.01);
  const dpsi = tt.map((t, i) => T.nutation(t).dpsiArcsec - REF.time.dpsiArcsec[i]);
  const deps = tt.map((t, i) => T.nutation(t).depsArcsec - REF.time.depsArcsec[i]);
  info('T1.3c', 'nutation dpsi (20 terms) vs ERFA nut06a, max', max(dpsi), 'arcsec');
  info('T1.3d', 'nutation deps (20 terms) vs ERFA nut06a, max', max(deps), 'arcsec');
  const nm = T.nutation(a.jdUt + 57 / 86400);
  info('T1.3e', 'Meeus 12.a dpsi/deps (-3.788, +9.443), ours', `${nm.dpsiArcsec.toFixed(3)}, ${nm.depsArcsec.toFixed(3)}`, 'arcsec');
}
// ---- T1.4 delta-T
{
  const rows = REF.deltaT;
  const tab = rows.map(r => T.deltaT(r.jd0hUtc + 0.5) - r.deltaT);
  const poly = rows.map(r => T.deltaTPolynomial(T.yearOf(r.jd0hUtc + 0.5)) - r.deltaT);
  const half = rows.filter(r => r.year % 1 !== 0), halfIdx = rows.map((r, i) => (r.year % 1 !== 0 ? i : -1)).filter(i => i >= 0);
  // note: year fraction of "1 Jul" is 0.5 in the series, so yearOf(jd) differs slightly; reported as is
  rec('T1.4a', 'table + interpolation, all half-years 1972-2023', max(tab), 's', 1.0);
  rec('T1.4b', 'table, interpolated July points only', max(halfIdx.map(i => tab[i])), 's', 1.0);
  info('T1.4c', 'Espenak-Meeus polynomial alone, max error 1972-2023', max(poly), 's');
  info('T1.4d', 'polynomial alone, error at 2020', T.deltaTPolynomial(2020.5) - 69.36, 's');
}
// ---- T1.5 precession
{
  const P2 = REF.precession;
  const e = P2.jdTt.map((t, i) => { const r = T.precessRigorous(P2.raDeg[i], P2.decDeg[i], t); return sep(r.raDeg, r.decDeg, P2.ofDateDeg[i][0], P2.ofDateDeg[i][1]) * 3600; });
  rec('T1.5a', 'IAU 1976 rigorous vs ERFA pmat06, 1900-2100', max(e), 'arcsec', 2);
  const e50 = [];
  P2.jdTt.forEach((t, i) => { if (Math.abs(t - 2451545) / 365.25 <= 50) { const r = T.precessFirstOrder(P2.raDeg[i], P2.decDeg[i], t); e50.push(sep(r.raDeg, r.decDeg, P2.ofDateDeg[i][0], P2.ofDateDeg[i][1]) * 60); } });
  rec('T1.5b', 'first order (m, n) vs ERFA, |T| <= 50 yr', max(e50), 'arcmin', 1, { n: e50.length });
  const e50b = [];
  P2.jdTt.forEach((t, i) => { if (Math.abs(t - 2451545) / 365.25 <= 50 && Math.abs(P2.decDeg[i]) < 80) { const r = T.precessFirstOrder(P2.raDeg[i], P2.decDeg[i], t); e50b.push(sep(r.raDeg, r.decDeg, P2.ofDateDeg[i][0], P2.ofDateDeg[i][1]) * 60); } });
  info('T1.5c', 'first order, |dec| < 80 deg only (where RA is well defined)', max(e50b), 'arcmin');
}
// ---- T1.6 TT - TDB
{
  const e = tt.map((t, i) => T.tdbMinusTt(t) - REF.time.tdbMinusTtSec[i]);
  rec('T1.6', 'two-term TDB-TT vs ERFA dtdb', max(e) * 1000, 'ms', 0.2);
}
// ---- T2.1 horizontal
{
  const p = PUB.horizontal[0];
  const r = OW.altAz({ hourAngleDeg: p.haDeg, declinationDeg: p.decDeg, latitudeDeg: p.latDeg });
  rec('T2.1a', 'existing altAz vs Meeus 13.b altitude', Math.abs(r.altitudeDeg - p.altDeg), 'deg', 0.001);
  rec('T2.1b', 'existing altAz vs Meeus 13.b azimuth', Math.abs(wrap(r.azimuthDeg - 180 - p.azFromSouthDeg, 360)), 'deg', 0.001);
  const H = REF.hd2ae;
  const e = H.haDeg.map((h, i) => { const q = OW.altAz({ hourAngleDeg: h, declinationDeg: H.decDeg[i], latitudeDeg: H.latDeg[i] }); return sep(q.azimuthDeg, q.altitudeDeg, H.azDeg[i], H.altDeg[i]); });
  rec('T2.1c', 'existing altAz vs ERFA hd2ae', max(e), 'deg', 1e-6);
  const e2 = H.haDeg.map((h, i) => { const q = C.toHorizontal(h, H.decDeg[i], H.latDeg[i]); return sep(q.azDeg, q.altDeg, H.azDeg[i], H.altDeg[i]); });
  info('T2.1d', 'spike toHorizontal vs hd2ae', max(e2), 'deg');
  // inverse round trip
  const e3 = H.haDeg.map((h, i) => { const q = C.toHorizontal(h, H.decDeg[i], H.latDeg[i]); const b = C.toEquatorial(q.altDeg, q.azDeg, H.latDeg[i]); return sep(wrap(b.haDeg, 360), b.decDeg, wrap(h, 360), H.decDeg[i]); });
  info('T2.1e', 'horizontal -> equatorial round trip', max(e3), 'deg');
}
// ---- T2.2 ecliptic of date
{
  const P2 = REF.precession;
  const e = P2.jdTt.map((t, i) => {
    const m = T.precessRigorous(P2.raDeg[i], P2.decDeg[i], t);
    const q = C.equatorialToEcliptic(m.raDeg, m.decDeg, T.meanObliquityDeg(t));
    return sep(q.lonDeg, q.latDeg, REF.eclipticOfDate[i][0], REF.eclipticOfDate[i][1]) * 3600;
  });
  rec('T2.2', 'J2000 -> ecliptic of date vs ERFA eqec06', max(e), 'arcsec', 2);
  const e2 = P2.jdTt.map((t, i) => {
    const m = T.precessRigorous(P2.raDeg[i], P2.decDeg[i], t);
    const q = C.equatorialToEcliptic(m.raDeg, m.decDeg, OW.meanObliquity(t));
    const back = OW.eclipticToEquatorial(q.lonDeg, q.latDeg, OW.meanObliquity(t));
    return sep(back.raDeg, back.decDeg, m.raDeg, m.decDeg) * 3600;
  });
  info('T2.2b', 'existing eclipticToEquatorial round trip', max(e2), 'arcsec');
}
// ---- T2.3 whole chain vs atco13
function chain(name, opts, limitHi, limitLo, dtMode) {
  const hi = [], lo = [], hiG = [];
  let nHi = 0, nLo = 0;
  for (const r of REF.atco13) {
    const o = C.observed({ raDeg: r.raDeg, decDeg: r.decDeg }, { jdUt: r.utc, dtSec: dtMode === 'model' ? undefined : r.ttMinusUtSec, latDeg: r.latDeg, lonDeg: r.lonDeg, ...opts });
    const eRef = sep(o.azDeg, o.altDeg, r.azObsDeg, r.altObsDeg) * 60;
    if (r.altObsDeg >= 5) { hi.push(eRef); nHi++; } else if (r.altObsDeg >= 0) { lo.push(eRef); nLo++; }
    if (r.altGeomDeg >= 5) hiG.push(sep(o.azDeg, o.altGeomDeg, r.azGeomDeg, r.altGeomDeg) * 60);
  }
  if (limitHi != null) rec(name + 'a', `chain vs atco13, observed alt >= 5 deg (n=${nHi})`, max(hi), 'arcmin', limitHi);
  if (limitLo != null) rec(name + 'b', `chain vs atco13, observed alt 0-5 deg (n=${nLo})`, max(lo), 'arcmin', limitLo);
  info(name + 'c', 'chain geometry only (no refraction) vs atco13 p=0, alt >= 5', max(hiG), 'arcmin');
}
chain('T2.3', {}, 1, 4, 'ref');
chain('T2.3x', { aberration: false }, null, null, 'ref'); // without aberration
chain('T2.3m', {}, null, null, 'model');                    // the kernel's own delta-T
// ---- the renderer's matrix frame (no aberration) against atco13, and against the full chain
{
  const hi = [];
  let agree = 0;
  for (const r of REF.atco13) {
    const u = unitVector(r.raDeg, r.decDeg);
    const f = makeFastFrame({ jdUt: r.utc, dtSec: r.ttMinusUtSec, latDeg: r.latDeg, lonDeg: r.lonDeg })(u[0], u[1], u[2]);
    if (r.altObsDeg >= 5) hi.push(sep(f.azDeg, f.altDeg, r.azObsDeg, r.altObsDeg) * 60);
    const g = C.observed({ raDeg: r.raDeg, decDeg: r.decDeg }, { jdUt: r.utc, dtSec: r.ttMinusUtSec, latDeg: r.latDeg, lonDeg: r.lonDeg, aberration: false });
    agree = Math.max(agree, sep(f.azDeg, f.altGeomDeg, g.azDeg, g.altGeomDeg) * 3600);
  }
  rec('T2.3f', 'renderer matrix frame (no aberration) vs atco13, observed alt >= 5 deg', max(hi), 'arcmin', 1);
  info('T2.3g', 'matrix frame vs the full chain without aberration (same physics, two codings)', agree, 'arcsec');
}
// ---- T2.4 refraction round trip, T2.5 airmass
{
  let e = 0;
  for (let h = 0; h <= 90; h += 0.01) {
    const app = C.apparentAltitude(h);
    e = Math.max(e, Math.abs(C.trueAltitude(app) - h) * 60);
  }
  rec('T2.4', 'refraction true->apparent->true round trip', e, 'arcmin', 0.1);
  info('T2.4b', 'refraction at true altitude 0 deg, 10 deg, 45 deg', [0, 10, 45].map(h => (C.refractionFromTrue(h) * 60).toFixed(2)).join(' / '), "arcmin");
  rec('T2.5a', 'airmass at horizon vs 37.92', Math.abs(OW.airmass(0) - 37.92), '', 0.005);
  rec('T2.5b', 'airmass at z=60 vs 1.995', Math.abs(OW.airmass(30) - 1.995), '', 0.01);
  rec('T2.5c', 'airmass at z=70 vs 2.904', Math.abs(OW.airmass(20) - 2.904), '', 0.01);
}
// ---- T5.1 Sun
{
  const S1 = REF.sun.rows;
  const run = (label, arg) => {
    const e = S1.map((r, i) => { const s = S.apparentSun(arg(i)); return sep(s.raDeg, s.decDeg, r.raDeg, r.decDeg); });
    return max(e);
  };
  rec('T5.1a', 'apparent Sun (series+nut+aberr), TT given, vs ERFA', run('tt', i => tt[i]), 'deg', 0.01);
  rec('T5.1b', 'apparent Sun, UT passed as TT', run('ut', i => ut[i]), 'deg', 0.01);
  const raw = S1.map((r, i) => { const s = OW.solarPosition(tt[i]); return sep(s.raDeg, s.decDeg, r.raDeg, r.decDeg); });
  info('T5.1c', 'existing solarPosition as is (no nutation/aberration), TT given', max(raw), 'deg');
  const dl = S1.map((r, i) => Math.abs(S.apparentSun(tt[i]).distanceAu - r.distAu));
  info('T5.1d', 'Sun distance error, max', max(dl), 'au');
  const s = PUB.sun[0];
  const a = S.apparentSun(s.jdTt);
  rec('T5.1e', 'apparent Sun vs Meeus 25.a (VSOP87 values)', sep(a.raDeg, a.decDeg, hms(s.raHms), dms(s.decDms)), 'deg', 0.01);
  info('T5.1f', 'Meeus 25.a low-accuracy lambda vs ours', Math.abs(wrap(a.longitudeDeg - s.lowAccuracyLonDeg, 360)), 'deg');
  // sanity of the fixture itself, against ERFA-based reference computed at that jd is in gen_refs (not re-run here)
}
// ---- T5.2 seasons
{
  const out = [];
  for (const s of PUB.seasons2024) {
    const ref = Date.parse(s.utc) / 86400000 + 2440587.5;
    const jdTt = S.sunLongitudeTime(s.lonDeg, ref + 69 / 86400);
    const jdUt = jdTt - T.deltaT(jdTt) / 86400;
    out.push((jdUt - ref) * 1440);
  }
  rec('T5.2', 'equinox/solstice instants vs USNO 2024 (minutes)', max(out), 'min', 15, { each: out.map(x => +x.toFixed(2)) });
}
// ---- T5.3 / T5.4 / T5.5 Moon
{
  const M = REF.moon.rows;
  const m0 = PUB.moon[0];
  const g = OW.lunarPosition(m0.jdTt);
  rec('T5.3a', 'existing lunarPosition vs Meeus 47.a longitude', Math.abs(g.longitudeDeg - m0.lonDeg), 'deg', 0.01);
  info('T5.3b', 'vs Meeus 47.a latitude / distance km', `${(g.latitudeDeg - m0.latDeg).toExponential(2)} deg / ${(g.distanceKm - m0.distKm).toFixed(2)} km`, '');
  rec('T5.3c', 'existing lunarPosition vs Meeus 47.a distance', Math.abs(g.distanceKm - m0.distKm), 'km', 10);
  const ap = S.apparentMoon(m0.jdTt);
  info('T5.3d', 'apparent Moon vs Meeus 47.a RA/Dec', sep(ap.raDeg, ap.decDeg, m0.raAppDeg, m0.decAppDeg), 'deg');
  const lonE = (argf) => M.map((r, i) => Math.abs(wrap(S.apparentMoon(argf(i)).longitudeDeg - r.lonDeg, 360)));
  const latE = (argf) => M.map((r, i) => Math.abs(S.apparentMoon(argf(i)).latitudeDeg - r.latDeg));
  rec('T5.3e', 'Moon apparent longitude vs ERFA moon98, TT given', max(lonE(i => tt[i])), 'deg', 0.02);
  rec('T5.3f', 'Moon latitude vs ERFA moon98, TT given', max(latE(i => tt[i])), 'deg', 0.02);
  info('T5.3g', 'Moon longitude, UT passed as TT', max(lonE(i => ut[i])), 'deg');
  const dist = M.map((r, i) => Math.abs(S.apparentMoon(tt[i]).distanceKm - r.distKm));
  info('T5.3h', 'Moon distance error, max', max(dist), 'km');
  const ph = (argf) => M.map((r, i) => Math.abs(S.phase(argf(i)).phaseAngleDeg - r.phaseAngleDeg));
  rec('T5.4a', 'phase angle vs ERFA-based, TT given', max(ph(i => tt[i])), 'deg', 0.5);
  rec('T5.4b', 'phase angle, UT passed as TT', max(ph(i => ut[i])), 'deg', 0.5);
  const il = M.map((r, i) => Math.abs(S.phase(tt[i]).illuminated - r.illum));
  rec('T5.4c', 'illuminated fraction vs ERFA-based', max(il), '', 0.01);
  // the module as shipped: lunarPhase(jd) uses its own Sun and Moon (mean equinox, no nutation)
  const sh = M.map((r, i) => Math.abs(OW.lunarPhase(tt[i]).phaseAngleDeg - r.phaseAngleDeg));
  info('T5.4d', 'existing lunarPhase as is, phase angle', max(sh), 'deg');
  // syzygies
  const syz = (kind, target, refs) => {
    const errs = [];
    for (const r of refs) { const t = S.syzygyTime(target, r + (Math.random() * 0)); errs.push((t - r) * 1440); }
    return errs;
  };
  const newE = REF.syzygy.newTt.map(r => (S.syzygyTime(0, r + 0.3) - r) * 1440);
  const fullE = REF.syzygy.fullTt.map(r => (S.syzygyTime(180, r - 0.3) - r) * 1440);
  rec('T5.5a', `new Moon instants vs ERFA-based 2000-2050 (n=${newE.length})`, max(newE), 'min', 5);
  rec('T5.5b', `full Moon instants vs ERFA-based 2000-2050 (n=${fullE.length})`, max(fullE), 'min', 5);
  const nm = PUB.newMoon[0];
  const t = S.syzygyTime(0, nm.jdTt);
  rec('T5.5c', 'new Moon vs Meeus 49.a', Math.abs(t - nm.jdTt) * 1440, 'min', 5);
  // unseeded guess check: from a bad guess (3 days off) does the solver still converge
  const bad = REF.syzygy.newTt.slice(0, 40).map(r => (S.syzygyTime(0, r + 3) - r) * 1440);
  info('T5.5d', 'solver started 3 days off the true new Moon, worst error', max(bad), 'min');
}
// ---- T5.6 topocentric Moon
{
  const R = REF.moonTopo.rows;
  const e = [];
  let n = 0;
  R.forEach((r, i) => {
    if (r.altDeg < 0) return;
    const t = S.topocentricMoon(ut[i], tt[i], r.latDeg, r.lonDeg);
    e.push(sep(t.azDeg, t.altDeg, r.azDeg, r.altDeg)); n++;
  });
  rec('T5.6', `topocentric Moon alt/az vs ERFA-based, above horizon (n=${n})`, max(e), 'deg', 0.1);
}
// ---- T6 planets
{
  const G = REF.planets;
  const ids = { mercury: '1', venus: '2', mars: '4', jupiter: '5', saturn: '6', uranus: '7', neptune: '8' };
  const worst = {};
  for (const [name, id] of Object.entries(ids)) {
    const e = G.jdTdb.map((jd, i) => { const p = P.geocentricEquatorial(name, jd); const r = G.bodies[id][i]; return sep(p.raDeg, p.decDeg, r[0], r[1]); });
    worst[name] = max(e);
    const required = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'].includes(name);
    if (required) rec('T6.1-' + name, `Standish series vs ERFA plan94, 1900-2050`, max(e), 'deg', 0.2);
    else info('T6.1-' + name, `Standish series vs ERFA plan94 (not required)`, max(e), 'deg');
  }
  // typical, not just worst
  for (const name of ['jupiter', 'saturn']) {
    const e = G.jdTdb.map((jd, i) => { const p = P.geocentricEquatorial(name, jd); const r = G.bodies[ids[name]][i]; return sep(p.raDeg, p.decDeg, r[0], r[1]); }).sort((a, b) => a - b);
    info('T6.1m-' + name, 'median / 95th percentile error', `${e[e.length >> 1].toFixed(4)} / ${e[Math.floor(e.length * 0.95)].toFixed(4)}`, 'deg');
  }
  results.worstPlanets = worst;
  // the pack
  const { createEphemeris } = await import('../../js/mission/ephemeris.js');
  const { PACK, DATA } = await import('../../js/data/ephemeris/solarSystem2025.js');
  const eph = createEphemeris(PACK, DATA);
  info('T6.3a', 'pack bodies', eph.bodies.join(', '), '');
  const J2 = 23.439291111 * DEG;
  const toEq = v => { const ce = Math.cos(J2), se = Math.sin(J2); const y = v[1] * ce - v[2] * se, z = v[1] * se + v[2] * ce; return [((Math.atan2(y, v[0]) * RAD) + 360) % 360, Math.atan2(z, Math.hypot(v[0], y)) * RAD]; };
  const seriesVsPack = {};
  const packVsErfa = {};
  for (const name of ['venus', 'mars', 'jupiter']) {
    let w = 0;
    for (let jd = 2460676.5 + 1; jd < 2467981.5 - 1; jd += 5) {
      const b = eph.stateAt(name, jd).r, e = eph.stateAt('earth', jd).r;
      const g = [b[0] - e[0], b[1] - e[1], b[2] - e[2]];
      const [r1, d1] = toEq(g);
      const p = P.geocentricEquatorial(name, jd);
      w = Math.max(w, sep(p.raDeg, p.decDeg, r1, d1));
    }
    seriesVsPack[name] = w;
    rec('T6.2-' + name, 'Standish series vs DE441 pack, 2025-2045', w, 'deg', 0.1);
  }
  // T6.3: the pack reader against the pack's own raw source rows (JPL Horizons, DE441)
  const { CHECK } = await import('../../js/data/ephemeris/solarSystem2025Check.js');
  const { checkRows } = await import('../../js/mission/ephemeris.js');
  for (const name of ['venus', 'mars', 'jupiter']) {
    const rb = checkRows(CHECK, name), re = checkRows(CHECK, 'earth');
    let w = 0, n = 0;
    for (let i = 0; i < rb.length; i++) {
      const j = re.findIndex(r => Math.abs(r[0] - rb[i][0]) < 1e-6);
      if (j < 0) continue;
      const g = [rb[i][1] - re[j][1], rb[i][2] - re[j][2], rb[i][3] - re[j][3]];
      const [r0, d0] = toEq(g);
      const b = eph.stateAt(name, rb[i][0]).r, e = eph.stateAt('earth', rb[i][0]).r;
      const [r1, d1] = toEq([b[0] - e[0], b[1] - e[1], b[2] - e[2]]);
      w = Math.max(w, sep(r0, d0, r1, d1)); n++;
    }
    rec('T6.3-' + name, `pack reader vs its raw DE441 rows (n=${n})`, w, 'deg', 0.01);
  }
  for (const [name, id] of [['venus', '2'], ['mars', '4'], ['jupiter', '5']]) {
    let w = 0;
    G.jdTdb.forEach((jd, i) => {
      if (jd < 2460677.5 || jd > 2467980.5) return;
      const b = eph.stateAt(name, jd).r, e = eph.stateAt('earth', jd).r;
      const [r1, d1] = toEq([b[0] - e[0], b[1] - e[1], b[2] - e[2]]);
      w = Math.max(w, sep(r1, d1, G.bodies[id][i][0], G.bodies[id][i][1]));
    });
    info('T6.3x-' + name, 'pack vs ERFA plan94 (plan94 is the looser of the two)', w, 'deg');
  }
  // Meeus 33.a Venus apparent
  const v = PUB.venus[0];
  const g = P.geocentricEquatorial('venus', v.jdTt - 0.0053);   // light-time 7.6 min
  const mean = T.precessRigorous(g.raDeg, g.decDeg, v.jdTt);
  const ap = T.apparentOfDate(mean.raDeg, mean.decDeg, v.jdTt);
  rec('T6.4', 'Standish series vs Meeus 33.a Venus apparent', sep(ap.raDeg, ap.decDeg, hms(v.raHms), dms(v.decDms)), 'deg', 0.2);
  info('T6.4b', 'Meeus 33.a distance error', Math.abs(g.distanceAu - v.distAu), 'au');
}
fs.writeFileSync(path.join(HERE, 'results.json'), JSON.stringify(results, null, 1));
const fails = results.filter(r => r.pass === false);
console.log(`\n${results.filter(r => r.pass).length} pass, ${fails.length} fail, ${results.filter(r => r.pass === null).length} info`);
