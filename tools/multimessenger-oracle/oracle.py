#!/usr/bin/env python3
"""
The independent oracle of the multi-messenger kernel (Roadmap III, Prompt 244).

Run offline, never by a test:

    python3 -I tools/multimessenger-oracle/oracle.py > tests/fixtures/multimessenger/oracle-results.json

Nothing here reads Gravitas code. The kernel's results are compared with these in
tools/multimessenger-validate.mjs. Pieces:

  time      integer day counts and datetime under the SYNTHETIC leap table of
            tests/fixtures/multimessenger/thresholds.json (read as data)
  bound     the exact speed-difference form in Fraction arithmetic
  volume    the cone-shell volume by quad, the Poisson probability by scipy
  distance  flat Lambda-CDM luminosity distance by scipy quad (no radiation)
  photometry  AB magnitudes by numpy trapezoid on a 0.25 nm grid from the band
            tables of tests/fixtures/multimessenger/oracle-bands.json, with this
            file's own Planck function and AB definition (photon-counting response)
  detection scipy's binomial survival function and a numpy convolution for the
            Poisson-binomial tail
"""
import json
import math
import sys
from datetime import date
from fractions import Fraction
from pathlib import Path

import numpy as np
from scipy import integrate, stats

ROOT = Path(__file__).resolve().parents[2]
FIX = ROOT / "tests" / "fixtures" / "multimessenger"
THR = json.loads((FIX / "thresholds.json").read_text())
BANDS = json.loads((FIX / "oracle-bands.json").read_text())["bands"]
rng = np.random.default_rng(THR["seeds"]["oracleNumpy"])

# ---------------------------------------------------------------------------
# time
# ---------------------------------------------------------------------------
TABLE = [(date.fromisoformat(e["from"]), e["taiMinusUtc"]) for e in THR["synthetic"]["leapTable"]]


def offset_on(d):
    v = None
    for f, o in TABLE:
        if d >= f:
            v = o
    return v


GPS_EPOCH = date(1980, 1, 6)
MET_EPOCH = date(2001, 1, 1)
MJD0 = date(1858, 11, 17)


def seconds_since(epoch, d, sod):
    """SI seconds from epoch (00:00:00 UTC) to the UTC instant (d, sod seconds into the day; sod may be 86400+ on a leap day)."""
    return (d - epoch).days * 86400 + sod + (offset_on(d) - offset_on(epoch))


def ends_with_leap(d):
    from datetime import timedelta
    return offset_on(d + timedelta(days=1)) - offset_on(d)


def stamp(d, sod):
    out = {
        "gps": float(seconds_since(GPS_EPOCH, d, sod)),
        "met": float(seconds_since(MET_EPOCH, d, sod)),
        "mjd": None if ends_with_leap(d) else float(Fraction((d - MJD0).days) + Fraction(sod) / 86400),
    }
    return out


def iso(d, sod):
    sod = Fraction(sod)
    if sod >= 86400:
        h, m, s = 23, 59, sod - 86400 + 60
    else:
        h = int(sod // 3600)
        m = int((sod - h * 3600) // 60)
        s = sod - h * 3600 - m * 60
    return {"year": d.year, "month": d.month, "day": d.day, "hour": h, "minute": m, "second": float(s)}


def time_instants():
    from datetime import timedelta
    lo, hi = date(1980, 1, 6), date(2025, 12, 31)
    span = (hi - lo).days
    rows = []
    for _ in range(200):
        d = lo + timedelta(days=int(rng.integers(0, span + 1)))
        ms = int(rng.integers(0, 86400 * 1000))
        rows.append((d, Fraction(ms, 1000)))
    for f, _ in TABLE[2:]:
        prev = f - timedelta(days=1)
        for sod in (Fraction(86399) + Fraction(1, 2), Fraction(86400), Fraction(86400) + Fraction(1, 2)):
            rows.append((prev, sod))
        rows.append((f, Fraction(0)))
        rows.append((f, Fraction(1, 2)))
        rows.append((prev, Fraction(86398)))
    out = []
    for d, sod in rows:
        s = stamp(d, sod)
        s["utc"] = iso(d, sod)
        out.append(s)
    return out


# the true delays added to the MET stamps of the first 50 instants (binary-exact values)
instants = time_instants()
delays = [float(int(rng.integers(-40, 400))) / 8 for _ in range(50)]
for i, dl in enumerate(delays):
    instants[i]["delay"] = dl
    instants[i]["metPlusDelay"] = instants[i]["met"] + dl

# ---------------------------------------------------------------------------
# bound (exact, rational)
# ---------------------------------------------------------------------------
C = Fraction(299792458)
AU = Fraction(149597870700)
PC = Fraction(648000) * AU / Fraction(math.pi)
MPC = PC * 10**6


def bound_case(delay, d_mpc, tau_min, tau_max):
    def x(tau):
        return C * (Fraction(delay) - Fraction(tau)) / (Fraction(d_mpc) * MPC)

    def exact(tau):
        v = x(tau)
        return v / (1 - v)

    return {
        "delay": delay, "distanceMpc": d_mpc, "tauMin": tau_min, "tauMax": tau_max,
        "firstOrderUpper": float(x(tau_min)), "firstOrderLower": float(x(tau_max)),
        "exactUpper": float(exact(tau_min)), "exactLower": float(exact(tau_max)),
    }


bound_cases = []
for _ in range(40):
    delay = float(int(rng.integers(-40, 161))) / 8
    d_mpc = float(int(rng.integers(4, 2001))) / 4
    tau_min = float(int(rng.integers(-16, 200))) / 8
    tau_max = tau_min + float(int(rng.integers(0, 400))) / 8
    bound_cases.append(bound_case(delay, d_mpc, tau_min, tau_max))

# also the cases of check A2 (limits read from the thresholds)
a2 = [bound_case(c["dt"], c["distanceMpc"], c["tauMin"], c["tauMax"]) for c in
      next(c for c in THR["checks"] if c["id"] == "A2.boundForms")["limits"]["cases"]]

# ---------------------------------------------------------------------------
# volume and Poisson
# ---------------------------------------------------------------------------
DEG2_PER_SR = (180.0 / math.pi) ** 2
volume = []
for c in next(c for c in THR["checks"] if c["id"] == "A6.expectedCount")["limits"]["cases"]:
    omega = c["areaDeg2"] / DEG2_PER_SR  # steradians
    vol, _ = integrate.quad(lambda r: omega * r * r, c["loMpc"], c["hiMpc"], epsabs=0, epsrel=1e-13)
    n = c["densityPerMpc3"] * vol
    volume.append({**c, "volumeMpc3": vol, "expected": n, "pNone": float(stats.poisson.pmf(0, n))})

# ---------------------------------------------------------------------------
# distance from redshift
# ---------------------------------------------------------------------------
# flat Lambda-CDM, no radiation: D_L = (1 + z) (c / H0) Int_0^z dz' / E(z'), by scipy's adaptive quadrature
# (astropy.cosmology could not be imported in the session's Python: its PyYAML dependency is missing; AM3)
b5 = next(c for c in THR["checks"] if c["id"] == "B5.hostDistance")["limits"]
H0, OM = b5["cosmology"]["H0"], b5["cosmology"]["Om"]


def luminosity_distance(z):
    integral, _ = integrate.quad(lambda x: 1.0 / math.sqrt(OM * (1 + x) ** 3 + (1 - OM)), 0.0, z,
                                 epsabs=0, epsrel=1e-13)
    return (1 + z) * (299792.458 / H0) * integral


distance = [{"z": z, "dLMpc": luminosity_distance(z)} for z in b5["redshifts"]]

# ---------------------------------------------------------------------------
# photometry
# ---------------------------------------------------------------------------
H = 6.62607015e-34
CL = 299792458.0
K = 1.380649e-23
PC_M = 648000.0 * 149597870700.0 / math.pi
MPC_M = 1e6 * PC_M


def planck_lambda(lam_m, T):
    return 2.0 * H * CL**2 / lam_m**5 / np.expm1(H * CL / (lam_m * K * T))


def ab_mag(band, T, scale):
    lam = np.asarray(band["lambdaNm"])
    s = np.asarray(band["response"])
    grid = np.arange(lam[0], lam[-1] + 1e-9, 0.25)
    sg = np.interp(grid, lam, s)
    f_lam = scale * math.pi * planck_lambda(grid * 1e-9, T) * 1e-9  # W m^-2 nm^-1
    num = np.trapz(f_lam * sg * grid, grid)
    den = CL * 1e9 * np.trapz(sg / grid, grid)
    jy = num / den / 1e-26
    return float(-2.5 * math.log10(jy / 3631.0))


b6 = next(c for c in THR["checks"] if c["id"] == "B6.kilonovaMagnitudes")["limits"]
photometry = []
for T in b6["temperaturesK"]:
    for R in b6["radiiM"]:
        scale = (R / (b6["distanceMpc"] * MPC_M)) ** 2
        mags = {b: ab_mag(BANDS[b], T, scale) for b in b6["bands"]}
        photometry.append({"T": T, "R": R, "mags": mags, "colourGI": mags["g"] - mags["i"]})

# ---------------------------------------------------------------------------
# detection
# ---------------------------------------------------------------------------
a10 = next(c for c in THR["checks"] if c["id"] == "A10.falseAlarm")["limits"]
false_alarm = []
for n in a10["n"]:
    p = float(stats.norm.sf(n))
    for k in a10["k"]:
        for N in a10["N"]:
            false_alarm.append({"n": n, "k": k, "N": N, "p": float(stats.binom.sf(k - 1, N, p))})


def poisson_binomial_tail(ps, k):
    pmf = np.array([1.0])
    for p in ps:
        pmf = np.convolve(pmf, [1 - p, p])
    return float(pmf[k:].sum())


detect = []
for _ in range(20):
    N = int(rng.integers(3, 30))
    k = int(rng.integers(1, 4))
    n = float(rng.choice([3.0, 4.0, 5.0]))
    mu = rng.uniform(-1.0, 12.0, N)
    sig = rng.uniform(0.5, 2.0, N)
    ps = stats.norm.sf(n - mu / sig)
    detect.append({"means": mu.tolist(), "sigmas": sig.tolist(), "n": n, "k": k,
                   "p": poisson_binomial_tail(ps, k)})

json.dump({
    "format": "gravitas.multimessenger-oracle-results/1",
    "note": "output of tools/multimessenger-oracle/oracle.py (numpy, scipy, astropy; no Gravitas code), pinned; never run by a test",
    "versions": {"python": sys.version.split()[0], "numpy": np.__version__, "scipy": __import__("scipy").__version__},
    "time": instants, "boundA2": a2, "boundCases": bound_cases, "volume": volume, "distance": distance,
    "photometry": photometry, "falseAlarm": false_alarm, "detection": detect,
}, sys.stdout, separators=(",", ":"))
sys.stdout.write("\n")
