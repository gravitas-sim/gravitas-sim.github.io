"""
The independent oracle of the Prompt 263 follow-up (the data legs).

    python3 -E tools/crossmatch-oracle/oracle_data.py \
        tests/fixtures/crossmatch/data-legs-thresholds.json ../../scratch-data \
        tests/fixtures/crossmatch/data-legs-oracle.json

Run from the repository root. The second argument is the scratch-data directory
(outside every repository) holding crossmatch263/ (the downloads, see SOURCES.json)
and gaia233/ngc2420.csv (the Gaia pack's raw file). No Gravitas code is imported or
run and nothing downloaded is run: the downloads are read as DATA. It uses numpy,
scipy and astropy as installed, and reads the committed packs with its own decoder.

  P1  D5a, D5b, D5c, D5d, D5e, D4b : the Gaia pack against the SDSS pack with the
      survey's own epochs (astropy apply_space_motion to each distinct SDSS epoch,
      astropy nearest-neighbour search), the published best-neighbour table, set
      operations of its own.
  P2  B8c.sampleIdentity, B10 : the strip with its declination from R4, scipy cKDTree
      pair counts, Landy-Szalay, a delete-one jackknife over 12 blocks, its own
      randoms (seed [2634, 1] for F1 and [2634, 2] for F2).
"""
import base64
import csv
import hashlib
import json
import math
import re
import sys
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

THR, SCRATCH, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
ROOT = "."
XM = f"{SCRATCH}/crossmatch263"


def sha(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()


def rnd(a, nd):
    return [round(float(v), nd) for v in a]


def sky(ra, dec):
    return SkyCoord(ra=np.asarray(ra) * u.deg, dec=np.asarray(dec) * u.deg)


def propagate(ra, dec, pmra, pmdec, dt_yr):
    """astropy: straight-line space motion, radial velocity 0, distance 1 kpc (from J2016.0)."""
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
    t = c.apply_space_motion(dt=np.full(n, float(dt_yr)) * u.yr)
    return t.ra.deg, t.dec.deg


def decode_series(series):
    cols = []
    for c in series["columns"]:
        raw = base64.b64decode(c["data"])
        dt_ = "<i2" if c["type"] == "int16" else "<i4"
        k = np.frombuffer(raw, dtype=dt_).astype(np.int64)
        miss = np.iinfo(np.dtype(dt_)).min
        v = c["offset"] + c["step"] * k.astype(float)
        v[k == miss] = np.nan
        cols.append(v)
    steps = [c["step"] for c in series["columns"]]
    return cols, steps


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


def read_sky_csv(path):
    """A SkyServer csv: an optional '#Table1' line, then a header and the rows."""
    lines = [l for l in open(path).read().splitlines() if not l.startswith("#")]
    return list(csv.DictReader(lines))


thr = json.load(open(THR))
RADIUS = float(thr["constants"]["radiusArcsec"])
TOL = float(thr["constants"]["tolerance"]["value"])

res = {
    "format": "gravitas.crossmatch-data-legs-oracle/1",
    "tools": {
        "python": sys.version.split()[0],
        "numpy": np.__version__,
        "scipy": scipy.__version__,
        "astropy": astropy.__version__,
        "astropyYamlStub": YAML_STUB,
        "command": "python3 -E tools/crossmatch-oracle/oracle_data.py tests/fixtures/crossmatch/data-legs-thresholds.json <scratch-data> tests/fixtures/crossmatch/data-legs-oracle.json",
    },
    "inputs": {"thresholdsSha256": sha(THR)},
}

# ------------------------------------------------------------------ P1 (D5)
gaia_rec = pack_record("gaia-dr3-ngc2420")
sdss_rec = pack_record("sdss-dr18-ngc2420-photometry")
gaia_series = json.load(open(f"{ROOT}/{gaia_rec['derived']['sidecar']['file']}"))
sdss_series = js_series(f"{ROOT}/{sdss_rec['derived']['file']}")
gv, gsteps = decode_series(gaia_series)
sv, ssteps = decode_series(sdss_series)
gcols = dict(zip([c["id"] for c in gaia_rec["columns"]], gv))
gstep = dict(zip([c["id"] for c in gaia_rec["columns"]], gsteps))
scols = dict(zip([c["id"] for c in sdss_rec["columns"]], sv))
sstep = dict(zip([c["id"] for c in sdss_rec["columns"]], ssteps))
epA = epoch_of(gaia_rec)
gaia_csv_path = f"{SCRATCH}/gaia233/ngc2420.csv"
gaia_csv_sha = sha(gaia_csv_path)
pack_raw_sha = gaia_rec["raw"][0]["sha256"]
G = read_sky_csv(gaia_csv_path)
S = read_sky_csv(f"{XM}/sdss/R1-ngc2420-mjd.csv")
res["inputs"].update(
    {
        "R1Sha256": sha(f"{XM}/sdss/R1-ngc2420-mjd.csv"),
        "gaiaCsvSha256": gaia_csv_sha,
        "gaiaCsvEqualsPackRawFile": gaia_csv_sha == pack_raw_sha,
        "R2BestNeighbourSha256": sha(f"{XM}/gaia/R2-bestneighbour.csv"),
        "R4Sha256": sha(f"{XM}/sdss/R4-slice-query.csv"),
    }
)

# D5a: row identity, in units of half the pack's own storage step
frac = {}
nG, nS = len(G), len(S)
frac["rowCounts"] = {"gaia": [nG, int(len(gcols["ra"]))], "sdss": [nS, int(len(scols["ra"]))]}
sd_map = {"ra": "ra", "dec": "dec", "g": "psfMag_g", "g_err": "psfMagErr_g", "r": "psfMag_r", "r_err": "psfMagErr_r"}
gd_map = {"ra": "ra", "dec": "dec", "pmra": "pmra", "pmdec": "pmdec"}
rowsEqual = nG == len(gcols["ra"]) and nS == len(scols["ra"])
worst = {}
if rowsEqual:
    for pid, csvcol in sd_map.items():
        x = np.array([float(r[csvcol]) for r in S])
        worst[f"sdss.{pid}"] = float(np.max(np.abs(scols[pid] - x)) / (sstep[pid] / 2))
    for pid, csvcol in gd_map.items():
        x = np.array([float(r[csvcol]) for r in G])
        worst[f"gaia.{pid}"] = float(np.max(np.abs(gcols[pid] - x)) / (gstep[pid] / 2))
res["D5a"] = {"rowCounts": frac["rowCounts"], "rowCountsEqual": bool(rowsEqual), "worstStepFraction": worst,
              "maxStepFraction": max(worst.values()) if worst else None}

# D5b: the survey's epochs
mjd = np.array([int(float(r["mjd"])) for r in S])
mjd_all = np.array([float(r["mjd"]) for r in S])
integral = bool(np.all(mjd_all == mjd))
ep = 2000.0 + (mjd - 51544.5) / 365.25
groups = sorted(set(mjd.tolist()))
res["D5b"] = {
    "mjdAreIntegers": integral,
    "distinct": [
        {"mjd": int(m), "epoch": round(2000.0 + (m - 51544.5) / 365.25, 6), "rows": int(np.sum(mjd == m))} for m in groups
    ],
    "epochMin": round(float(ep.min()), 6),
    "epochMax": round(float(ep.max()), 6),
    "spreadYears": round(float(ep.max() - ep.min()), 6),
}

okpm = np.isfinite(gcols["pmra"]) & np.isfinite(gcols["pmdec"])
gidx = np.nonzero(okpm)[0]
SB = sky(scols["ra"], scols["dec"])


def nearest_over_groups(radius):
    """per Gaia row: (b, distance) of the nearest candidate over the epoch groups (ties: lower b)."""
    best = {}
    for m in groups:
        bidx = np.nonzero(mjd == m)[0]
        Jm = 2000.0 + (m - 51544.5) / 365.25
        pra, pdec = propagate(gcols["ra"][gidx], gcols["dec"][gidx], gcols["pmra"][gidx], gcols["pmdec"][gidx], Jm - epA)
        P = sky(pra, pdec)
        idx, sep, _ = P.match_to_catalog_sky(SB[bidx])
        for k, a in enumerate(gidx):
            b = int(bidx[idx[k]])
            d = float(sep.arcsec[k])
            if d <= radius and (a not in best or (d, b) < (best[a][1], best[a][0])):
                best[int(a)] = (b, d)
    return best


def declared_pairs(radius):
    """the same with the SDSS rows at the pack's declared epoch J2000.0"""
    pra, pdec = propagate(gcols["ra"][gidx], gcols["dec"][gidx], gcols["pmra"][gidx], gcols["pmdec"][gidx], 2000.0 - epA)
    P = sky(pra, pdec)
    idx, sep, _ = P.match_to_catalog_sky(SB)
    return {(int(gidx[k]), int(idx[k])) for k in range(len(gidx)) if sep.arcsec[k] <= radius}


best = nearest_over_groups(RADIUS)
Kset = {(a, b) for a, (b, d) in best.items()}
Kdist = {(a, b): d for a, (b, d) in best.items()}
res["D5c"] = {
    "pairs": [[a, b, round(d, 9)] for (a, b), d in sorted(Kdist.items())],
    "nPairs": len(Kset),
    "excludedA": int(len(gcols["ra"]) - len(gidx)),
}
wide = nearest_over_groups(10.0)
res["D5c"]["nearestWithin10Arcsec"] = {str(a): [b, round(d, 9)] for a, (b, d) in sorted(wide.items())}

# D5d, D5e: against the published best-neighbour table
src = [r["source_id"] for r in G]
obj = [r["objID"] for r in S]
objrow = {o: i for i, o in enumerate(obj)}
srcrow = {s: i for i, s in enumerate(src)}
BN = read_sky_csv(f"{XM}/gaia/R2-bestneighbour.csv")
pub = {}
for r in BN:
    pub[srcrow[r["source_id"]]] = (r["original_ext_source_id"], float(r["angular_distance"]), r)


def compare(kpairs):
    kobj = {(a, b) for a, b in kpairs}
    pin = {(a, objrow[o]) for a, (o, d, r) in pub.items() if o in objrow}
    pin1 = {(a, objrow[o]) for a, (o, d, r) in pub.items() if o in objrow and d <= 1.0}
    n = len(kobj)
    return {
        "nK": n,
        "publishedAll": len(pub),
        "publishedInPack": len(pin),
        "publishedInPackWithin1Arcsec": len(pin1),
        "common": len(kobj & pin),
        "kernelOnly": len(kobj - pin),
        "publishedOnly1": len(pin1 - kobj),
        "kernelOnlyFraction": (len(kobj - pin) / n) if n else None,
        "publishedOnlyFraction": (len(pin1 - kobj) / n) if n else None,
    }


res["D5d"] = compare(Kset)
res["D5d"]["tolerance"] = TOL

# D5e breakdown (oracle's own)
kernel_only = sorted(Kset - {(a, objrow[o]) for a, (o, d, r) in pub.items() if o in objrow})
ko = {"differentPackObject": 0, "objectOutsidePack": 0, "noPublishedRow": 0, "ids": []}
for a, b in kernel_only:
    if a not in pub:
        ko["noPublishedRow"] += 1
    elif pub[a][0] in objrow:
        ko["differentPackObject"] += 1
    else:
        ko["objectOutsidePack"] += 1
    ko["ids"].append([src[a], obj[b]])
pin1 = sorted({(a, objrow[o]) for a, (o, d, r) in pub.items() if o in objrow and d <= 1.0} - Kset)
po = []
for a, b in pin1:
    w = wide.get(a)
    po.append({"source_id": src[a], "objID": obj[b], "publishedArcsec": pub[a][1], "kernelNearestOver10": None if w is None else [obj[w[0]], round(w[1], 6)]})
common = sorted(Kset & {(a, objrow[o]) for a, (o, d, r) in pub.items() if o in objrow})
dd = np.array([abs(Kdist[(a, b)] - pub[a][1]) for a, b in common])
pd_ = np.array([d for a, (o, d, r) in pub.items() if o in objrow])
res["D5e"] = {
    "kernelOnlySplit": {k: v for k, v in ko.items() if k != "ids"},
    "kernelOnlyIds": ko["ids"],
    "publishedOnly": po,
    "publishedDistanceInPack": {"n": int(len(pd_)), "median": float(np.median(pd_)), "p95": float(np.percentile(pd_, 95)), "max": float(pd_.max()),
                                  "over1": int(np.sum(pd_ > 1.0))},
    "commonDistanceAbsDifference": {"n": int(len(dd)), "max": float(dd.max()) if len(dd) else None, "median": float(np.median(dd)) if len(dd) else None},
    "xmFlag": {},
    "numberOfNeighbours": {},
}
for a, (o, d, r) in pub.items():
    if o in objrow:
        res["D5e"]["xmFlag"][r["xm_flag"]] = res["D5e"]["xmFlag"].get(r["xm_flag"], 0) + 1
        res["D5e"]["numberOfNeighbours"][r["number_of_neighbours"]] = res["D5e"]["numberOfNeighbours"].get(r["number_of_neighbours"], 0) + 1

# D4b: declared-epoch set against per-object-epoch set
Dset = declared_pairs(RADIUS)
res["D4b"] = {
    "declaredPairs": len(Dset),
    "perObjectPairs": len(Kset),
    "differ": len(Dset ^ Kset),
    "declaredOnly": len(Dset - Kset),
    "perObjectOnly": len(Kset - Dset),
    "publishedComparisonOfDeclared": compare(Dset),
}

# ------------------------------------------------------------------ P2 (B8c, B10)
R4 = read_sky_csv(f"{XM}/sdss/R4-slice-query.csv")
ra4 = np.array([float(r["ra"]) for r in R4])
dec4 = np.array([float(r["dec"]) for r in R4])
z4 = np.array([float(r["z"]) for r in R4])
sel = (ra4 >= 120) & (ra4 <= 240) & (dec4 >= 0) & (dec4 <= 0.5) & (z4 <= 0.12)
slice_rec = json.load(open(f"{ROOT}/cosmology/sdss-dr18-redshift-slice.json"))
pv, psteps = decode_series(slice_rec)
pra, pz = pv[0], pv[1]
ra_s, dec_s, z_s = ra4[sel], dec4[sel], z4[sel]
# AM1: both sides sorted by right ascension in units of the pack's step (R4's is not rounded), ties by redshift
key_r = np.round(ra_s / psteps[0]).astype(np.int64)
key_p = np.round(pra / psteps[0]).astype(np.int64)
o1 = np.lexsort((z_s, key_r))
o2 = np.lexsort((pz, key_p))
same_n = len(ra_s) == len(pra)
ident = None
if same_n:
    ident = max(
        float(np.max(np.abs(ra_s[o1] - pra[o2])) / (psteps[0] / 2)),
        float(np.max(np.abs(z_s[o1] - pz[o2])) / (psteps[1] / 2)),
    )
res["B8c"] = {"R4Rows": int(len(R4)), "selected": int(sel.sum()), "pack": int(len(pra)), "maxStepFraction": ident, "steps": psteps}

EDGES = np.array(thr["constants"]["stripDeclinationBins"]["edgesDeg"], dtype=float)


def uvec(ra, dec):
    a, d = np.radians(ra), np.radians(dec)
    return np.column_stack([np.cos(d) * np.cos(a), np.cos(d) * np.sin(a), np.sin(d)])


def chord(theta_deg):
    return 2 * np.sin(np.radians(theta_deg) / 2)


def self_counts(U, edges):
    t = cKDTree(U)
    cum = (t.count_neighbors(t, chord(edges)) - len(U)) / 2.0
    return np.diff(cum)


def cross_counts(U, V, edges):
    return np.diff(cKDTree(U).count_neighbors(cKDTree(V), chord(edges)).astype(float))


def ls_counts(dd, dr, rr, nd, nr):
    w = (dd / (nd * (nd - 1) / 2) - 2 * dr / (nd * nr) + rr / (nr * (nr - 1) / 2)) / (rr / (nr * (nr - 1) / 2))
    return w


def chi2_q99(df):
    from scipy.stats import chi2

    return float(chi2.ppf(0.99, df))


def block_of(ra):
    return np.clip(np.floor((ra - 120.0) / 10.0).astype(int), 0, 11)


def strip_run(ra_d, dec_d, ra_r, dec_r):
    D, R = uvec(ra_d, dec_d), uvec(ra_r, dec_r)
    nd, nr = len(D), len(R)
    dd, dr, rr = self_counts(D, EDGES), cross_counts(D, R, EDGES), self_counts(R, EDGES)
    w = ls_counts(dd, dr, rr, nd, nr)
    sigp = (1 + np.maximum(w, 0)) / np.sqrt(np.maximum(dd, 1))
    bd, br = block_of(ra_d), block_of(ra_r)
    reps = []
    for b in range(12):
        Db, Rb = D[bd != b], R[br != b]
        ddb, drb, rrb = self_counts(Db, EDGES), cross_counts(Db, Rb, EDGES), self_counts(Rb, EDGES)
        reps.append(ls_counts(ddb, drb, rrb, len(Db), len(Rb)))
    reps = np.array(reps)
    sigj = np.sqrt(11.0 / 12.0 * np.sum((reps - reps.mean(axis=0)) ** 2, axis=0))
    ok = (dd >= 5) & np.isfinite(w) & (sigj > 0)
    T = float(np.sum((w[ok] / sigj[ok]) ** 2))
    df = int(ok.sum())
    return {
        "nD": int(nd), "nR": int(nr),
        "DD": [int(v) for v in dd], "DR": [int(v) for v in dr], "RR": [int(v) for v in rr],
        "w": rnd(w, 6), "sigmaPoisson": rnd(sigp, 6), "sigmaJackknife": rnd(sigj, 6),
        "T": round(T, 4), "df": df, "quantile99": round(chi2_q99(df), 4) if df else None, "detected": bool(df > 0 and T > chi2_q99(df)),
    }


n = len(ra_s)
sd0, sd1 = math.sin(math.radians(0.0)), math.sin(math.radians(0.5))
rng1 = np.random.default_rng([2634, 1])
r1_ra = rng1.uniform(120.0, 240.0, 10 * n)
r1_dec = np.degrees(np.arcsin(rng1.uniform(sd0, sd1, 10 * n)))
rng2 = np.random.default_rng([2634, 2])
lo, hi = float(ra_s.min()), float(ra_s.max())
r2_ra = rng2.uniform(lo, hi, 10 * n)
r2_dec = np.degrees(np.arcsin(rng2.uniform(sd0, sd1, 10 * n)))
res["B10"] = {
    "edgesDeg": EDGES.tolist(),
    "seeds": {"F1": [2634, 1], "F2": [2634, 2]},
    "n": int(n),
    "extentRaDeg": [round(lo, 4), round(hi, 4)],
    "F1": strip_run(ra_s, dec_s, r1_ra, r1_dec),
    "F2": strip_run(ra_s, dec_s, r2_ra, r2_dec),
}
json.dump(res, open(OUT, "w"), indent=1)
open(OUT, "a").write("\n")
print("wrote", OUT)
