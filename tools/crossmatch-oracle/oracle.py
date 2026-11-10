"""
The independent oracle of Prompt 263 (crossmatch kernel and clustering gate).

    python3 -E tools/crossmatch-oracle/oracle.py tests/fixtures/crossmatch/thresholds.json \
        tests/fixtures/crossmatch/oracle-results.json

No Gravitas code is imported or run. It uses numpy, scipy and astropy as installed
(nothing downloaded is run). It reads the committed packs as DATA (a table-columns/1
decoder of its own) and writes the inputs it drew beside its results, so the
kernel is run on exactly those inputs.

  O1  propagation  : astropy SkyCoord.apply_space_motion (radial velocity 0, distance 1 kpc)
  O2  world W1     : catalogs, astropy match_to_catalog_sky pairs, shifted-match counts,
                     cone-search members
  O3  packs        : the precise Gaia pack against the SDSS pack, same operations
  O4  clustering   : a Thomas-process sample, scipy cKDTree pair counts, Landy-Szalay,
                     and the strip's pair counts

Seeds (thresholds.json, seeds.oracle): 2631 propagation, 2632 world W1 and the Thomas
sample (a spawned child), 2633 cone-search centres.
"""
import base64
import hashlib
import json
import math
import re
import sys

# astropy.table imports PyYAML at import time for table serialisation, which nothing
# here uses; PyYAML is not installed and nothing is downloaded, so an empty module
# stands in (recorded in the output as astropyYamlStub), as in Prompt 261's oracle.
import types

try:
    import yaml  # noqa: F401
    YAML_STUB = False
except ImportError:
    sys.modules["yaml"] = types.ModuleType("yaml")
    YAML_STUB = True

import astropy
import astropy.units as u
import numpy as np
import scipy
from astropy.coordinates import SkyCoord
from astropy.time import Time
from scipy.spatial import cKDTree

THR, OUT = sys.argv[1], sys.argv[2]
ROOT = "."


def sha(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()


def rnd(a, nd):
    return [round(float(v), nd) for v in a]


def sky(ra, dec, **kw):
    return SkyCoord(ra=np.asarray(ra) * u.deg, dec=np.asarray(dec) * u.deg, **kw)


def propagate(ra, dec, pmra, pmdec, dt_yr):
    """astropy: straight-line space motion, radial velocity 0, distance 1 kpc."""
    n = len(ra)
    c = SkyCoord(
        ra=np.asarray(ra) * u.deg,
        dec=np.asarray(dec) * u.deg,
        distance=np.full(n, 1000.0) * u.pc,
        pm_ra_cosdec=np.asarray(pmra) * u.mas / u.yr,
        pm_dec=np.asarray(pmdec) * u.mas / u.yr,
        radial_velocity=np.zeros(n) * u.km / u.s,
        obstime=Time(2016.0, format="jyear"),
    )
    dt = np.broadcast_to(np.asarray(dt_yr, dtype=float), (n,)) * u.yr
    t = c.apply_space_motion(dt=dt)
    return t.ra.deg, t.dec.deg


def gnomonic_inverse(x_arcsec, y_arcsec, ra0, dec0):
    """Tangent-plane offsets (arcsec; x east, y north) to (ra, dec) degrees."""
    x = np.asarray(x_arcsec) * math.pi / 648000.0
    y = np.asarray(y_arcsec) * math.pi / 648000.0
    a0, d0 = math.radians(ra0), math.radians(dec0)
    rho = np.hypot(x, y)
    c = np.arctan(rho)
    with np.errstate(invalid="ignore", divide="ignore"):
        sd = np.cos(c) * math.sin(d0) + np.where(rho > 0, y * np.sin(c) * math.cos(d0) / rho, 0.0)
    dec = np.arcsin(np.clip(sd, -1, 1))
    ra = a0 + np.arctan2(x * np.sin(c), rho * math.cos(d0) * np.cos(c) - y * math.sin(d0) * np.sin(c))
    return np.degrees(ra) % 360.0, np.degrees(dec)


def disc(rng, n, radius):
    r = radius * np.sqrt(rng.random(n))
    t = 2 * math.pi * rng.random(n)
    return r * np.cos(t), r * np.sin(t)


def nearest_pairs(A, B, radius_arcsec):
    idx, sep, _ = A.match_to_catalog_sky(B)
    s = sep.arcsec
    keep = np.nonzero(s <= radius_arcsec)[0]
    return [[int(i), int(idx[i]), float(s[i])] for i in keep]


def shifted_counts(A, B, centre, foot_arcsec, radius, dist, bearings):
    """C_k, E_k: rows of A within (foot - radius) of the shifted footprint centre, and those with a shifted B within radius."""
    out = []
    for pa in bearings:
        Bs = B.directional_offset_by(pa * u.deg, dist * u.arcsec)
        cs = centre.directional_offset_by(pa * u.deg, dist * u.arcsec)
        elig = np.nonzero(A.separation(cs).arcsec <= foot_arcsec - radius)[0]
        if len(elig) == 0:
            out.append([0, 0])
            continue
        _, sep, _ = A[elig].match_to_catalog_sky(Bs)
        out.append([int(np.count_nonzero(sep.arcsec <= radius)), int(len(elig))])
    return out


res = {
    "format": "gravitas.crossmatch-oracle-results/1",
    "tools": {
        "python": sys.version.split()[0],
        "numpy": np.__version__,
        "scipy": scipy.__version__,
        "astropy": astropy.__version__,
        "astropyYamlStub": YAML_STUB,
        "command": "python3 -E tools/crossmatch-oracle/oracle.py tests/fixtures/crossmatch/thresholds.json tests/fixtures/crossmatch/oracle-results.json",
    },
    "inputs": {"thresholdsSha256": sha(THR)},
}

# ------------------------------------------------------------------ O1
rng = np.random.default_rng(2631)
n = 300
sd = rng.uniform(-1, 1, n)
dec = np.degrees(np.arcsin(sd))
polar = rng.choice(n, 20, replace=False)
dec[polar] = np.where(rng.random(20) < 0.5, 1, -1) * (90 - rng.uniform(0, 0.5, 20))
ra = rng.uniform(0, 360, n)
pm_sd = np.full(n, 100.0)
big = rng.choice(n, 30, replace=False)
pm_sd[big] = 3000.0
pmra = rng.normal(0, 1, n) * pm_sd
pmdec = rng.normal(0, 1, n) * pm_sd
dt = rng.uniform(-30, 30, n)
ra, dec, pmra, pmdec, dt = (np.round(v, 9) for v in (ra, dec, pmra, pmdec, dt))
# the pole cases of A6: a source at dec 89.9999 moving north
ra = np.append(ra, 33.0)
dec = np.append(dec, 89.9999)
pmra = np.append(pmra, 0.0)
pmdec = np.append(pmdec, 5.0)
dt = np.append(dt, 25.0)
ra2, dec2 = propagate(ra, dec, pmra, pmdec, dt)
res["O1"] = {
    "seed": 2631,
    "ra": rnd(ra, 9), "dec": rnd(dec, 9), "pmra": rnd(pmra, 9), "pmdec": rnd(pmdec, 9), "dt": rnd(dt, 9),
    "raOut": rnd(ra2, 11), "decOut": rnd(dec2, 11),
}

# O1b (AM2, thresholds.json followUp B1b): sources within 0.1 arcsec of a pole, moving past it
rng = np.random.default_rng([2631, 1])
nb = 20
north = rng.random(nb) < 0.5
dist = rng.uniform(0.005, 0.1, nb)  # arcsec from the pole
decb = np.where(north, 90.0 - dist / 3600.0, -90.0 + dist / 3600.0)
rab = np.round(rng.uniform(0, 360, nb), 9)
shift = dist * rng.uniform(1.5, 3.0, nb)  # arcsec over dt
dtb = np.full(nb, 10.0)
pmdecb = np.where(north, 1.0, -1.0) * shift / dtb * 1000.0  # mas/yr toward the pole
pmrab = rng.normal(0, 5.0, nb)
decb = np.round(decb, 12)
pmdecb, pmrab = np.round(pmdecb, 9), np.round(pmrab, 9)
rab2, decb2 = propagate(rab, decb, pmrab, pmdecb, dtb)
res["O1b"] = {
    "seed": [2631, 1],
    "ra": rnd(rab, 9), "dec": rnd(decb, 12), "pmra": rnd(pmrab, 9), "pmdec": rnd(pmdecb, 9), "dt": rnd(dtb, 9),
    "raOut": rnd(rab2, 11), "decOut": rnd(decb2, 12),
}

# ------------------------------------------------------------------ O2 (world W1)
rng = np.random.default_rng(2632)
RA0, DEC0, R = 150.0, 30.0, 300.0
ntrue, nxa, nxb = 600, 200, 200
tx, ty = disc(rng, ntrue, R)
ax, ay = disc(rng, nxa, R)
bx, by = disc(rng, nxb, R)
pmt = rng.normal(0, 150.0, (ntrue, 2))  # true proper motion of the common objects, mas/yr
pmx = rng.normal(0, 150.0, (nxa, 2))  # extras of A
# A: truth at 2016 plus noise 0.03 arcsec per axis
axx = np.concatenate([tx, ax]) + rng.normal(0, 0.03, ntrue + nxa)
ayy = np.concatenate([ty, ay]) + rng.normal(0, 0.03, ntrue + nxa)
A_ra, A_dec = gnomonic_inverse(axx, ayy, RA0, DEC0)
A_ra, A_dec = np.round(A_ra, 10), np.round(A_dec, 10)
pm_true_all = np.vstack([pmt, pmx])
A_pm = np.round(pm_true_all + rng.normal(0, 0.3, pm_true_all.shape), 4)
# B: true objects at their 2016 position moved back 16 yr (astropy), plus 0.1 arcsec noise; extras anywhere
t_ra, t_dec = gnomonic_inverse(tx, ty, RA0, DEC0)
tb_ra, tb_dec = propagate(t_ra, t_dec, pmt[:, 0], pmt[:, 1], np.full(ntrue, -16.0))
nz = rng.normal(0, 0.1, (ntrue, 2))
tb_ra = tb_ra + nz[:, 0] / 3600.0 / np.cos(np.radians(tb_dec))
tb_dec = tb_dec + nz[:, 1] / 3600.0
e_ra, e_dec = gnomonic_inverse(bx, by, RA0, DEC0)
B_ra = np.round(np.concatenate([tb_ra, e_ra]), 10) % 360.0
B_dec = np.round(np.concatenate([tb_dec, e_dec]), 10)
Aco = sky(A_ra, A_dec)
Bco = sky(B_ra, B_dec)
# A propagated to 2000.0 by astropy, then nearest neighbour within 2 arcsec
Ap_ra, Ap_dec = propagate(A_ra, A_dec, A_pm[:, 0], A_pm[:, 1], np.full(len(A_ra), -16.0))
Ap = sky(Ap_ra, Ap_dec)
pairs = nearest_pairs(Ap, Bco, 2.0)
centre = SkyCoord(ra=RA0 * u.deg, dec=DEC0 * u.deg)
bearings = [0, 45, 90, 135, 180, 225, 270, 315]
shifts = shifted_counts(Ap, Bco, centre, R, 2.0, 40.0, bearings)
# cone search of B (no propagation)
rng3 = np.random.default_rng(2633)
cx, cy = disc(rng3, 20, R)
c_ra, c_dec = gnomonic_inverse(cx, cy, RA0, DEC0)
cones = []
for i in range(20):
    cc = SkyCoord(ra=c_ra[i] * u.deg, dec=c_dec[i] * u.deg)
    s = Bco.separation(cc).arcsec
    cones.append({"ra": round(float(c_ra[i]), 10), "dec": round(float(c_dec[i]), 10),
                  "members": {str(r): [int(j) for j in np.nonzero(s <= r)[0]] for r in (5, 20, 60)}})
res["O2"] = {
    "seed": 2632, "centre": [RA0, DEC0], "footprintArcsec": R,
    "nTrue": ntrue, "nExtraA": nxa, "nExtraB": nxb,
    "note": "A rows 0..599 are the common objects (their counterpart is B row with the same index), rows 600..799 are A-only; B rows 0..599 are common, 600..799 B-only",
    "A": {"ra": rnd(A_ra, 10), "dec": rnd(A_dec, 10), "pmra": rnd(A_pm[:, 0], 4), "pmdec": rnd(A_pm[:, 1], 4), "pmErr": 0.3, "epoch": 2016.0},
    "B": {"ra": rnd(B_ra, 10), "dec": rnd(B_dec, 10), "epoch": 2000.0},
    "propagatedA": {"ra": rnd(Ap_ra, 11), "dec": rnd(Ap_dec, 11)},
    "radiusArcsec": 2.0, "pairs": pairs,
    "shifts": {"distanceArcsec": 40.0, "bearingsDeg": bearings, "counts": shifts},
    "cones": cones,
}

# ------------------------------------------------------------------ O3 (the packs, as data)


def decode_columns(series):
    cols = []
    for c in series["columns"]:
        raw = base64.b64decode(c["data"])
        dt_ = "<i2" if c["type"] == "int16" else "<i4"
        k = np.frombuffer(raw, dtype=dt_).astype(np.int64)
        miss = np.iinfo(np.dtype(dt_)).min
        v = c["offset"] + c["step"] * k.astype(float)
        v[k == miss] = np.nan
        cols.append(v)
    return cols


def js_series(path):
    txt = open(path).read()
    i = txt.index("export const SERIES = ") + len("export const SERIES = ")
    j = txt.index("\n};", i) + 2
    body = txt[i:j]
    body = re.sub(r"(\n\s*)([A-Za-z_]\w*):", r'\1"\2":', body)
    body = body.replace("'", '"')
    body = re.sub(r",(\s*[}\]])", r"\1", body)
    return json.loads(body)


def pack_record(pid):
    return json.load(open(f"{ROOT}/data-packs/{pid}.json"))


def epoch_of(rec):
    m = re.search(r"epoch J(\d+(?:\.\d+)?)", rec["object"]["frame"])
    return float(m.group(1)) if m else None


gaia_rec = pack_record("gaia-dr3-ngc2420")
sdss_rec = pack_record("sdss-dr18-ngc2420-photometry")
gaia_series = json.load(open(f"{ROOT}/{gaia_rec['derived']['sidecar']['file']}"))
sdss_series = js_series(f"{ROOT}/{sdss_rec['derived']['file']}")
gcols = dict(zip([c["id"] for c in gaia_rec["columns"]], decode_columns(gaia_series)))
scols = dict(zip([c["id"] for c in sdss_rec["columns"]], decode_columns(sdss_series)))
epA, epB = epoch_of(gaia_rec), epoch_of(sdss_rec)
CEN = SkyCoord(ra=114.602 * u.deg, dec=21.575 * u.deg)
FOOT = 14.1421 * 60.0
okpm = np.isfinite(gcols["pmra"]) & np.isfinite(gcols["pmdec"])
gidx = np.nonzero(okpm)[0]
SB = sky(scols["ra"], scols["dec"])


def pack_pairs(epoch_b, radius):
    dt_ = epoch_b - epA
    pra, pdec = propagate(gcols["ra"][gidx], gcols["dec"][gidx], gcols["pmra"][gidx], gcols["pmdec"][gidx], np.full(len(gidx), dt_))
    P = sky(pra, pdec)
    pr = nearest_pairs(P, SB, radius)
    return [[int(gidx[a]), b, d] for a, b, d in pr], P


o3 = {"epochA": epA, "epochB": epB, "nA": int(len(gcols["ra"])), "nB": int(len(scols["ra"])), "excludedA": int(len(gcols["ra"]) - len(gidx)),
      "packs": {gaia_rec["id"]: {"version": gaia_rec["version"], "sidecarSha256": gaia_rec["derived"]["sidecar"]["sha256"]},
                sdss_rec["id"]: {"version": sdss_rec["version"], "moduleSha256": sdss_rec["derived"]["sha256"]}},
      "radii": {}}
for r in (0.5, 1.0, 2.0):
    pr, P = pack_pairs(epB, r)
    o3["radii"][str(r)] = {"pairs": [[a, b, round(d, 9)] for a, b, d in pr]}
bearings = [0, 45, 90, 135, 180, 225, 270, 315]
pr1, P1 = pack_pairs(epB, 1.0)
o3["shifts"] = {"radiusArcsec": 1.0, "distanceArcsec": 20.0, "bearingsDeg": bearings, "footprintArcsec": FOOT,
                "counts": shifted_counts(P1, SB, CEN, FOOT, 1.0, 20.0, bearings)}
base = {(a, b) for a, b, _ in pack_pairs(2000.0, 1.0)[0]}
o3["epochSensitivity"] = {}
for e in (1992.0, 1996.0, 2000.0, 2004.0, 2008.0):
    s = {(a, b) for a, b, _ in pack_pairs(e, 1.0)[0]}
    o3["epochSensitivity"][str(int(e))] = {"pairs": len(s), "differ": len(s ^ base)}
res["O3"] = o3

# ------------------------------------------------------------------ O4 (clustering)
BINS = np.array([0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1.28])
SBINS = np.array([2, 3, 4.5, 7, 10, 14, 20], dtype=float)


def uvec(ra, dec):
    a, d = np.radians(ra), np.radians(dec)
    return np.column_stack([np.cos(d) * np.cos(a), np.cos(d) * np.sin(a), np.sin(d)])


def chord(theta_deg):
    return 2 * np.sin(np.radians(theta_deg) / 2)


def self_counts(U, edges):
    t = cKDTree(U)
    cum = t.count_neighbors(t, chord(edges))
    cum = (cum - len(U)) / 2.0
    return np.diff(cum)


def cross_counts(U, V, edges):
    tu, tv = cKDTree(U), cKDTree(V)
    return np.diff(tu.count_neighbors(tv, chord(edges)).astype(float))


def ls(D, Rn, edges):
    dd, rr, dr = self_counts(D, edges), self_counts(Rn, edges), cross_counts(D, Rn, edges)
    nd, nr = len(D), len(Rn)
    w = (dd / (nd * (nd - 1) / 2) - 2 * dr / (nd * nr) + rr / (nr * (nr - 1) / 2)) / (rr / (nr * (nr - 1) / 2))
    sig = (1 + w) / np.sqrt(np.maximum(dd, 1))
    return dd, dr, rr, w, sig


rng = np.random.default_rng([2632, 1])
rho_p, sig_c, m = 5.0, 0.1, 12.5
npar = rng.poisson(rho_p * 25.0)
px = rng.uniform(-2.5, 2.5, npar)
py = rng.uniform(-2.5, 2.5, npar)
k = rng.poisson(m, npar)
dx = np.repeat(px, k) + rng.normal(0, sig_c, k.sum())
dy = np.repeat(py, k) + rng.normal(0, sig_c, k.sum())
keep = (np.abs(dx) <= 2) & (np.abs(dy) <= 2)
dx, dy = dx[keep], dy[keep]
d_ra, d_dec = gnomonic_inverse(dx * 3600, dy * 3600, 150.0, 0.0)
d_ra, d_dec = np.round(d_ra, 9), np.round(d_dec, 9)
nD = len(d_ra)
rx = rng.uniform(-2, 2, 10 * nD)
ry = rng.uniform(-2, 2, 10 * nD)
r_ra, r_dec = gnomonic_inverse(rx * 3600, ry * 3600, 150.0, 0.0)
D = uvec(d_ra, d_dec)
Rn = uvec(r_ra, r_dec)
dd, dr, rr, w, sig = ls(D, Rn, BINS)
a, b = BINS[:-1], BINS[1:]
w_true = (np.exp(-a**2 / (4 * sig_c**2)) - np.exp(-b**2 / (4 * sig_c**2))) / (math.pi * rho_p * (b**2 - a**2))
res["O4"] = {
    "seed": [2632, 1], "bins": BINS.tolist(), "n": int(nD), "box": [-2, 2], "centre": [150.0, 0.0],
    "thomas": {"rhoP": rho_p, "sigmaC": sig_c, "m": m},
    "data": {"ra": rnd(d_ra, 9), "dec": rnd(d_dec, 9)},
    "oracleRandoms": int(10 * nD),
    "DD": [int(v) for v in dd], "DR": [int(v) for v in dr], "RR": [int(v) for v in rr],
    "w": rnd(w, 6), "sigma": rnd(sig, 6), "wExactBinAverage": rnd(w_true, 6),
}
sr = decode_columns(json.load(open(f"{ROOT}/cosmology/sdss-dr18-redshift-slice.json")))[0]
SU = uvec(sr, np.full(len(sr), 0.25))
sdd = self_counts(SU, SBINS)
rng = np.random.default_rng([2632, 2])
sra = rng.uniform(120, 240, 10 * len(sr))
SR = uvec(sra, np.full(len(sra), 0.25))
sdd2, sdr, srr, sw, ssig = ls(SU, SR, SBINS)
res["O4"]["strip"] = {
    "n": int(len(sr)), "bins": SBINS.tolist(), "assumedDecDeg": 0.25, "raSha256Source": "cosmology/sdss-dr18-redshift-slice.json",
    "DD": [int(v) for v in sdd], "oracleRandoms": int(len(sra)),
    "w": rnd(sw, 6), "sigma": rnd(ssig, 6),
}
# AM1 (clustering-thresholds.json): randoms over the data's own right-ascension extent
sra2 = rng.uniform(float(sr.min()), float(sr.max()), 10 * len(sr))
SR2 = uvec(sra2, np.full(len(sra2), 0.25))
_, _, _, sw2, ssig2 = ls(SU, SR2, SBINS)
res["O4"]["stripExtent"] = {"raMin": float(sr.min()), "raMax": float(sr.max()), "oracleRandoms": int(len(sra2)), "w": rnd(sw2, 6), "sigma": rnd(ssig2, 6)}
res["inputs"]["packSha256"] = {
    "gaia/ngc2420.json": sha(f"{ROOT}/gaia/ngc2420.json"),
    "js/data/observations/sdssNgc2420Photometry.js": sha(f"{ROOT}/js/data/observations/sdssNgc2420Photometry.js"),
    "cosmology/sdss-dr18-redshift-slice.json": sha(f"{ROOT}/cosmology/sdss-dr18-redshift-slice.json"),
}
with open(OUT, "w") as f:
    json.dump(res, f, separators=(",", ":"))
    f.write("\n")
print("wrote", OUT)
