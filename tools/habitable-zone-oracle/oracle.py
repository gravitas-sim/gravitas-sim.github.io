"""
Independent oracle for the habitable-zone kernel (Prompt 205, HABITABLE_ZONE_II.md).

    python3 -I tools/habitable-zone-oracle/oracle.py <inputs.json> <mistTracks.js> <results.json>

numpy and scipy only; no Gravitas code runs. The only thing read from the repository is
the DATA of the MIST pack (js/data/stellar/mistTracks.js), parsed as text: the base64
int16/int32 columns are decoded and interpolated here, not by js/stellar/tracks.js.
Every closed form is written out from its definition. Kepler's equation is solved by
scipy's brentq on a grid of mean anomalies, and the fraction of the year in a band and
the time-mean flux are computed by sampling that solution, not by the closed forms the
kernel uses.

The coefficient table below was typed by the author from Kopparapu et al. (2013, ApJ 765,
131) with the 2014 erratum (ApJ 787, L29), the same source as the kernel's table, and not
re-read: it guards against a slip in transcription, not against an error in the source.
"""

import base64
import json
import re
import sys

import numpy as np
from scipy.optimize import brentq

inp = json.load(open(sys.argv[1]))
mist_text = open(sys.argv[2], encoding="utf-8").read()
C = inp["constants"]

COEF = {
    "recentVenus": (1.7763, 1.4335e-4, 3.3954e-9, -7.6364e-12, -1.1950e-15),
    "runawayGreenhouse": (1.0385, 1.2456e-4, 1.4612e-8, -7.6345e-12, -1.7511e-15),
    "maximumGreenhouse": (0.3507, 5.9578e-5, 1.6707e-9, -3.0058e-12, -5.1925e-16),
    "earlyMars": (0.3207, 5.4471e-5, 1.5275e-9, -2.1709e-12, -3.8282e-16),
}


def s_eff(key, teff):
    s0, a, b, c, d = COEF[key]
    # numpy.polyval wants the highest power first
    return float(np.polyval([d, c, b, a, s0], teff - 5780.0))


def edges(lum, teff):
    out = {}
    for key in COEF:
        out[key] = float(np.sqrt(lum / s_eff(key, teff)))
    return out


out = {"constants": C}

# a1, a2: the limit fluxes and the edges
out["fluxes"] = {str(int(t)): {k: s_eff(k, float(t)) for k in COEF} for t in inp["teffs"]}
out["edges"] = {s["id"]: edges(s["luminosity"], s["teff"]) for s in inp["stars"]}

# a3: eccentric orbits. Kepler's equation by brentq; the time-mean flux and the fraction
# of the year in a band by sampling mean anomaly (uniform in time).
N = inp["kepler"]["samples"]
M = (np.arange(N) + 0.5) * 2 * np.pi / N


def kepler_E(Mi, e):
    if e == 0.0:
        return Mi
    return brentq(lambda E: E - e * np.sin(E) - Mi, 0.0, 2 * np.pi, xtol=1e-15, rtol=4 * np.finfo(float).eps)


out["orbits"] = {}
for o in inp["orbits"]:
    a, e, L = o["semiMajorAU"], o["eccentricity"], o["luminosity"]
    if e == 0.0:
        r = np.full(N, a)
    else:
        E = np.array([kepler_E(float(m), e) for m in M])
        r = a * (1 - e * np.cos(E))
    flux = L / r**2
    rec = {
        "periapsisFlux": L / (a * (1 - e)) ** 2,
        "apoapsisFlux": L / (a * (1 + e)) ** 2,
        "meanFluxClosed": L / (a**2 * np.sqrt(1 - e**2)),
        "meanFluxSampled": float(flux.mean()),
        "bands": [],
    }
    for lo, hi in inp["bandsOfA"]:
        r1, r2 = lo * a, hi * a
        sampled = float(np.mean((r >= r1) & (r <= r2)))
        # closed form, written out here
        def F(rr):
            if e == 0.0:
                raise AssertionError("circular orbits are handled below")
            if rr <= a * (1 - e):
                return 0.0
            if rr >= a * (1 + e):
                return 1.0
            Ee = np.arccos((1 - rr / a) / e)
            return (Ee - e * np.sin(Ee)) / np.pi
        # a circle is at one distance all year and the band includes both its ends
        closed = (1.0 if r1 <= a <= r2 else 0.0) if e == 0.0 else float(F(r2) - F(r1))
        rec["bands"].append({"innerAU": r1, "outerAU": r2, "sampled": sampled, "closed": closed})
    out["orbits"][o["id"]] = rec

# a4: the locking radius, derived here from t_lock = I omega / N inverted for a
out["locking"] = {}
G, AU, YR = C["G"], C["AU"], C["year"]
for c in inp["locking"]:
    Ms = c["starMassSun"] * C["solarMass"]
    m = c["planetMassEarth"] * C["earthMass"]
    R = c["planetRadiusEarth"] * C["earthRadius"]
    omega = 2 * np.pi / (c["spinPeriodHours"] * 3600.0)
    t = c["ageYr"] * YR
    a6 = t * 1.5 * (c["k2"] / c["Q"]) * G * Ms**2 * R**3 / (c["alpha"] * m * omega)
    a = a6 ** (1.0 / 6.0)
    out["locking"][c["id"]] = {"radiusAU": float(a / AU), "radiusM": float(a)}

# a5: the MIST pack, decoded and interpolated here


def track_columns(track_id):
    block = re.search(r"\n  %s: \{(.*?)\n  \},\n" % track_id, mist_text, re.S)
    if not block:
        raise SystemExit("track %s not found" % track_id)
    body = block.group(1)
    cols = {}
    for name in ("logAge", "logL", "logTeff"):
        m = re.search(
            name + r": \{\s*data: '([^']*)',\s*scale: ([0-9.e+-]+),\s*bits: (\d+)", body
        )
        raw = base64.b64decode(m.group(1))
        dt = "<i4" if m.group(3) == "32" else "<i2"
        cols[name] = np.frombuffer(raw, dtype=dt).astype(np.float64) / float(m.group(2))
    return cols


def at_age(cols, age):
    la = cols["logAge"]
    target = np.log10(max(age, 1.0))
    # ties: keep the last sample of each run of equal ages (the most evolved)
    keep = np.append(la[1:] != la[:-1], True)
    x = la[keep]
    logL = np.interp(target, x, cols["logL"][keep])
    logT = np.interp(target, x, cols["logTeff"][keep])
    return 10**logL, 10**logT, float(10 ** x[-1])


out["track"] = {}
ages = {inp["track"]["id"]: inp["track"]["agesYr"]}
ages.update(inp["extraTrackAges"])
for tid, agel in ages.items():
    cols = track_columns(tid)
    out["track"][tid] = {}
    for age in agel:
        L, T, last = at_age(cols, age)
        out["track"][tid][repr(float(age))] = {"luminosity": float(L), "teff": float(T), "edges": edges(float(L), float(T)), "lastAgeYr": last}

json.dump(out, open(sys.argv[3], "w"), indent=2, sort_keys=True)
print("wrote", sys.argv[3])
print("python", sys.version.split()[0], "numpy", np.__version__)
