#!/usr/bin/env python3
"""Reference values for the Sky Lab kernel (Prompt 88), from PyERFA (IAU SOFA).

The generator of the Sky Lab gate (Prompt 87, spike/sky/gen_refs.py, seed 87),
unchanged except its last lines: the 2,000-case samples are thinned to every
k-th case (all cases within -1 to 6 degrees of altitude are kept) and written to
tests/fixtures/sky/erfa.json. No kernel code is read here. Needs pyerfa and
astropy-iers-data: python3 tools/sky/gen_refs.py
"""
import json, math, os, sys, warnings
import numpy as np
import erfa

warnings.simplefilter('ignore')
rng = np.random.default_rng(87)
D2R = math.pi / 180
AU_M = 149597870700.0
C = 299792458.0
HERE = os.path.dirname(os.path.abspath(__file__))

JD_1900 = 2415020.5          # 1900-01-01 0h
JD_2100 = 2488069.5          # 2100-12-31 0h  (2100-01-01 is 2488069.5? checked below)
jd1, jd2 = erfa.cal2jd(1900, 1, 1); JD_1900 = jd1 + jd2
jd1, jd2 = erfa.cal2jd(2100, 12, 31); JD_2100 = jd1 + jd2

N = 2000
DT_IN = 64.0  # seconds, TT - UT1, the same for every time sample (algorithms only)
out = {'meta': {'tool': 'PyERFA ' + erfa.__version__, 'seed': 87, 'N': N, 'dtIn': DT_IN,
                'range': '1900-01-01..2100-12-31'}}

def tt_of(ut1):
    return ut1 + DT_IN / 86400.0

# --- T1: time samples
ut1 = rng.uniform(JD_1900, JD_2100, N)
tt = tt_of(ut1)
gmst = erfa.gmst06(ut1, 0.0, tt, 0.0)
gst = erfa.gst06a(ut1, 0.0, tt, 0.0)
sec = 86400.0 / (2 * math.pi)
dpsi80, deps80 = erfa.nut80(tt, 0.0)
dpsi06, deps06 = erfa.nut06a(tt, 0.0)
eps0 = erfa.obl06(tt, 0.0)
# TT-TDB at the geocenter
ut_frac = np.mod(ut1 - 0.5, 1.0)  # UT1 day fraction
dtdb = erfa.dtdb(tt, 0.0, ut_frac, 0.0, 0.0, 0.0)
out['time'] = {'ut1': ut1.tolist(), 'gmstSec': (gmst * sec).tolist(), 'gstSec': (gst * sec).tolist(),
               'dpsiArcsec': (dpsi06 / D2R * 3600).tolist(), 'depsArcsec': (deps06 / D2R * 3600).tolist(),
               'dpsi80Arcsec': (dpsi80 / D2R * 3600).tolist(), 'deps80Arcsec': (deps80 / D2R * 3600).tolist(),
               'meanObliquityDeg': (eps0 / D2R).tolist(), 'tdbMinusTtSec': dtdb.tolist()}

# calendar days 1900-2100: JD of 0h by cal2jd
days = []
import datetime
d0 = datetime.date(1900, 1, 1)
nd = (datetime.date(2100, 12, 31) - d0).days + 1
ymd = []
for i in range(0, nd, 7):
    d = d0 + datetime.timedelta(days=i)
    a, b = erfa.cal2jd(d.year, d.month, d.day)
    ymd.append([d.year, d.month, d.day, float(a + b)])
out['calendar'] = ymd

# precession: random directions at random epochs, pmat06 (bias+precession)
M = 2000
v = rng.normal(size=(M, 3)); v /= np.linalg.norm(v, axis=1)[:, None]
ut = rng.uniform(JD_1900, JD_2100, M)
ttp = tt_of(ut)
ra = np.arctan2(v[:, 1], v[:, 0]) % (2 * math.pi); dec = np.arcsin(v[:, 2])
prec = []
for i in range(M):
    r = erfa.pmat06(ttp[i], 0.0)
    w = r @ v[i]
    prec.append([float(np.arctan2(w[1], w[0]) % (2 * math.pi) / D2R), float(np.arcsin(w[2]) / D2R)])
out['precession'] = {'jdTt': ttp.tolist(), 'raDeg': (ra / D2R).tolist(), 'decDeg': (dec / D2R).tolist(), 'ofDateDeg': prec}

# ecliptic of date from ICRS (eqec06 gives mean ecliptic & equinox of date)
ecl = []
for i in range(M):
    l, b = erfa.eqec06(ttp[i], 0.0, ra[i], dec[i])
    ecl.append([float(l / D2R), float(b / D2R)])
out['eclipticOfDate'] = ecl

# --- T2.1 hd2ae
H = rng.uniform(-math.pi, math.pi, N); dd = np.arcsin(rng.uniform(-1, 1, N)); ph = np.arcsin(rng.uniform(-1, 1, N))
az, el = erfa.hd2ae(H, dd, ph)
out['hd2ae'] = {'haDeg': (H / D2R).tolist(), 'decDeg': (dd / D2R).tolist(), 'latDeg': (ph / D2R).tolist(),
                'azDeg': (az / D2R).tolist(), 'altDeg': (el / D2R).tolist()}

# --- T2.3 atco13: 1962..2100 (UTC, ERFA's leap-second table), dut1 = 0
jd1, jd2 = erfa.cal2jd(1962, 1, 1); a = jd1 + jd2
utc = rng.uniform(a, JD_2100, N)
v = rng.normal(size=(N, 3)); v /= np.linalg.norm(v, axis=1)[:, None]
rc = np.arctan2(v[:, 1], v[:, 0]) % (2 * math.pi); dc = np.arcsin(v[:, 2])
lat = np.arcsin(rng.uniform(-0.95, 0.95, N)); lon = rng.uniform(-math.pi, math.pi, N)
rows = []
for i in range(N):
    u1, u2 = float(utc[i]), 0.0
    try:
        aob, zob, hob, dob, rob, eo = erfa.atco13(rc[i], dc[i], 0, 0, 0, 0, u1, u2, 0.0, lon[i], lat[i], 0.0, 0, 0, 1010.0, 10.0, 0.5, 0.55)
        aob0, zob0, *_ = erfa.atco13(rc[i], dc[i], 0, 0, 0, 0, u1, u2, 0.0, lon[i], lat[i], 0.0, 0, 0, 0.0, 10.0, 0.5, 0.55)
    except Exception as e:
        print('atco13 failed', e); continue
    # TT - UTC (UT1=UTC): ERFA's own
    y, m, d, fd = erfa.jd2cal(u1, u2)
    dat = erfa.dat(int(y), int(m), int(d), float(fd))
    rows.append({'utc': u1, 'raDeg': float(rc[i] / D2R), 'decDeg': float(dc[i] / D2R), 'latDeg': float(lat[i] / D2R),
                 'lonDeg': float(lon[i] / D2R), 'ttMinusUtSec': float(32.184 + dat),
                 'azGeomDeg': float(aob0 / D2R), 'altGeomDeg': float(90 - zob0 / D2R),
                 'azObsDeg': float(aob / D2R), 'altObsDeg': float(90 - zob / D2R)})
out['atco13'] = rows

# --- T1.4 delta-T truth: TT - UT1 = 32.184 + dAT - (UT1-UTC) from EOP 20 C04 (astropy-iers-data)
import astropy_iers_data
p = os.path.join(os.path.dirname(astropy_iers_data.__file__), 'data', 'eopc04.1962-now')
eop = {}
for line in open(p):
    if line.startswith('#') or not line.strip(): continue
    f = line.split()
    eop[int(round(float(f[4])))] = float(f[7])
dt = []
for yr in np.arange(1972.0, 2024.001, 0.5):
    y = int(yr); m = 1 if yr == y else 7
    a, b = erfa.cal2jd(y, m, 1); mjd = int(round(a + b - 2400000.5 + 0.0))
    mjd = int(round((a - 2400000.5) + b))
    if mjd not in eop: continue
    d = erfa.dat(y, m, 1, 0.0)
    dt.append({'year': float(yr), 'jd0hUtc': float(a + b), 'deltaT': 32.184 + d - eop[mjd]})
out['deltaT'] = dt
out['meta']['eopSource'] = 'IERS EOP 20 C04 (eopc04.1962-now, in astropy-iers-data), to ' + str(max(eop))

# --- Sun, Moon: geocentric apparent-of-date references
def sun_of_date(tt1):
    # light-time corrected geometric direction + annual aberration, then bias-precession-nutation
    pvh, pvb = erfa.epv00(tt1, 0.0)
    # Earth at t, Sun position at t - tau
    ve = pvb[1]  # AU/day
    dist = np.linalg.norm(pvh[0])
    tau = dist * AU_M / C / 86400.0
    pvh2, pvb2 = erfa.epv00(tt1 - tau, 0.0)
    sun_b = pvb2[0] - pvh2[0]
    u = sun_b - pvb[0]
    u /= np.linalg.norm(u)
    vel = pvb[1] / 86400.0 * AU_M / C  # fraction of c
    bm1 = math.sqrt(1 - float(vel @ vel))
    s = np.linalg.norm(pvh[0])
    ua = erfa.ab(u, vel, s, bm1)
    r = erfa.pnm06a(tt1, 0.0)
    w = r @ ua
    return w, np.linalg.norm(u) , dist

def true_ecl(w, tt1):
    dpsi, deps = erfa.nut06a(tt1, 0.0)
    eps = erfa.obl06(tt1, 0.0) + deps
    x, y, z = w
    ye = y * math.cos(eps) + z * math.sin(eps)
    ze = -y * math.sin(eps) + z * math.cos(eps)
    return math.atan2(ye, x) % (2 * math.pi), math.asin(ze / np.linalg.norm(w))

def raDec(w):
    return (math.atan2(w[1], w[0]) % (2 * math.pi)) / D2R, math.asin(w[2] / np.linalg.norm(w)) / D2R

sun = []
for i in range(N):
    w, _, dist = sun_of_date(tt[i])
    r, d = raDec(w)
    l, b = true_ecl(w, tt[i])
    sun.append({'raDeg': r, 'decDeg': d, 'lonDeg': l / D2R, 'distAu': dist})
out['sun'] = {'ut1': ut1.tolist(), 'dtIn': DT_IN, 'rows': sun}

def moon_vec(tt1):
    pv = erfa.moon98(tt1, 0.0)
    r = erfa.pnm06a(tt1, 0.0)
    return r @ pv[0], np.linalg.norm(pv[0])

moon = []
for i in range(N):
    w, distAu = moon_vec(tt[i])
    r, d = raDec(w)
    l, b = true_ecl(w, tt[i])
    # phase angle: sun-moon-earth angle at the Moon (using the geometric sun vector for distance)
    s, _, sd = sun_of_date(tt[i])
    s = s * sd
    mv = w
    cosE = float(np.dot(s, mv) / (np.linalg.norm(s) * np.linalg.norm(mv)))
    psi = math.acos(max(-1, min(1, cosE)))   # geocentric elongation
    R = np.linalg.norm(s); Dm = np.linalg.norm(mv)
    i_ang = math.atan2(R * math.sin(psi), Dm - R * math.cos(psi))
    moon.append({'raDeg': r, 'decDeg': d, 'lonDeg': l / D2R, 'latDeg': b / D2R, 'distKm': Dm * AU_M / 1000.0,
                 'elongDeg': psi / D2R, 'phaseAngleDeg': i_ang / D2R, 'illum': (1 + math.cos(i_ang)) / 2})
out['moon'] = {'rows': moon}

# --- T5.6 topocentric Moon alt/az (geometric)
lat2 = np.arcsin(rng.uniform(-0.95, 0.95, N)); lon2 = rng.uniform(-math.pi, math.pi, N)
topo = []
for i in range(N):
    w, _ = moon_vec(tt[i])           # AU, true equator/equinox of date
    xyz = erfa.gd2gc(1, float(lon2[i]), float(lat2[i]), 0.0) / AU_M      # AU in ITRS
    th = gst[i]
    ob = np.array([xyz[0] * math.cos(th) - xyz[1] * math.sin(th), xyz[0] * math.sin(th) + xyz[1] * math.cos(th), xyz[2]])
    t = w - ob
    ra_t = math.atan2(t[1], t[0]); de_t = math.asin(t[2] / np.linalg.norm(t))
    Hh = (th + lon2[i]) - ra_t
    azz, ell = erfa.hd2ae(Hh, de_t, float(lat2[i]))   # geodetic lat ~ astronomical to 0.2 deg; see note
    topo.append({'latDeg': float(lat2[i] / D2R), 'lonDeg': float(lon2[i] / D2R), 'azDeg': float(azz / D2R) % 360,
                 'altDeg': float(ell / D2R), 'raDeg': float(ra_t / D2R) % 360, 'decDeg': float(de_t / D2R)})
out['moonTopo'] = {'rows': topo}

# --- T5.5 syzygies 2000-2050, in TT as the argument
def lon_diff_arr(tt1arr):
    res = []
    for t in tt1arr:
        w, _, sd = sun_of_date(t)
        ls, _ = true_ecl(w, t)
        mw, _ = moon_vec(t)
        lm, _ = true_ecl(mw, t)
        res.append(((lm - ls) / D2R) % 360.0)
    return np.array(res)

a, b = erfa.cal2jd(2000, 1, 1); t0 = a + b
a, b = erfa.cal2jd(2050, 1, 1); t1 = a + b
grid = np.arange(t0, t1, 0.25)
ld = lon_diff_arr(grid)
def roots(target):
    s = ((ld - target + 180) % 360) - 180
    idx = np.where((s[:-1] < 0) & (s[1:] >= 0) & (np.abs(s[1:] - s[:-1]) < 90))[0]
    out_ = []
    for k in idx:
        lo, hi = grid[k], grid[k + 1]
        for _ in range(40):
            mid = 0.5 * (lo + hi)
            f = ((lon_diff_arr([mid])[0] - target + 180) % 360) - 180
            if f < 0: lo = mid
            else: hi = mid
        out_.append(0.5 * (lo + hi))
    return out_
out['syzygy'] = {'newTt': roots(0.0), 'fullTt': roots(180.0)}

# --- Planets: geocentric RA/Dec J2000 (geometric), every 10 days 1900-2050
a, b = erfa.cal2jd(1900, 1, 1); p0 = a + b
a, b = erfa.cal2jd(2050, 12, 31); p1 = a + b
pg = np.arange(p0, p1, 10.0)
planets = {str(n): [] for n in range(1, 9)}
for t in pg:
    pvh, pvb = erfa.epv00(t, 0.0)
    E = pvh[0]
    for n in range(1, 9):
        pp = erfa.plan94(t, 0.0, n)[0]   # heliocentric position, au, equatorial J2000
        g = pp - E
        r, d = raDec(g)
        planets[str(n)].append([r, d, float(np.linalg.norm(g))])
out['planets'] = {'jdTdb': pg.tolist(), 'bodies': planets}


def every(lst, k):
    return lst[::k]

def thin(o):
    t = o['time']; keys = list(t.keys())
    o['time'] = {k: every(t[k], 10) for k in keys}
    o['calendar'] = every(o['calendar'], 35)
    pr = o['precession']; o['precession'] = {k: every(pr[k], 10) for k in pr}
    o['eclipticOfDate'] = every(o['eclipticOfDate'], 10)
    h = o['hd2ae']; o['hd2ae'] = {k: every(h[k], 10) for k in h}
    keep = [r for i, r in enumerate(o['atco13']) if i % 8 == 0 or -1 <= r['altObsDeg'] <= 6]
    o['atco13'] = keep
    sn = o['sun']; o['sun'] = {'ut1': every(sn['ut1'], 10), 'dtIn': sn['dtIn'], 'rows': every(sn['rows'], 10)}
    o['moon'] = {'rows': every(o['moon']['rows'], 10)}
    o['moonTopo'] = {'rows': every(o['moonTopo']['rows'], 10)}
    o['syzygy'] = {'newTt': every(o['syzygy']['newTt'], 4), 'fullTt': every(o['syzygy']['fullTt'], 4)}
    pl = o['planets']
    o['planets'] = {'jdTdb': every(pl['jdTdb'], 25), 'bodies': {k: every(v, 25) for k, v in pl['bodies'].items() if k in ('1', '2', '4', '5', '6')}}
    return o

def rnd(x):
    if isinstance(x, float): return float('%.10g' % x)
    if isinstance(x, list): return [rnd(i) for i in x]
    if isinstance(x, dict): return {k: rnd(v) for k, v in x.items()}
    return x

out = rnd(thin(out))
dest = os.path.join(HERE, '..', '..', 'tests', 'fixtures', 'sky', 'erfa.json')
with open(dest, 'w') as f:
    json.dump(out, f, separators=(',', ':'))
print('ok', os.path.getsize(dest))
