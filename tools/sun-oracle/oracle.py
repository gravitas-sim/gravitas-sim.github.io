"""Independent oracle for the solar kernel (Prompt 194).

No Gravitas code. numpy (ray tracing, rotation matrices), pyerfa through astropy's
dependency (the Earth's heliocentric position, precession, obliquity) and scipy.constants
(sigma, au). Run offline: python -I oracle.py oracle-inputs.json > oracle-results.json
"""
import hashlib
import json
import sys

import astropy
import erfa
import numpy as np
import scipy
import scipy.constants as sc
from astropy.time import Time

DEG = np.pi / 180.0


def rz(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def rx(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def pixel_to_heliographic(px, py, d):
    """Ray tracing: observer at (0, 0, D) in units of the solar radius, image frame
    x right (west), y up (north), z toward the observer."""
    R_AU = 6.957e8 / sc.au
    D = d["distanceAu"] / R_AU
    theta_sun = np.arcsin(1.0 / D)
    X = (px - d["cx"]) / d["radiusPx"]
    Y = (d["cy"] - py) / d["radiusPx"]
    r = np.hypot(X, Y)
    a = np.arctan2(Y, X)
    theta = r * theta_sun
    o = np.array([0.0, 0.0, D])
    ray = np.array([np.sin(theta) * np.cos(a), np.sin(theta) * np.sin(a), -np.cos(theta)])
    b = o @ ray
    disc = b * b - (o @ o - 1.0)
    t = -b - np.sqrt(disc)
    p = o + t * ray
    # image frame -> solar-aligned observer frame: rotate by -P about z
    p1 = rz(-d["pDeg"] * DEG) @ p
    # observer frame -> heliographic: rotate by -B0 about x
    h = rx(-d["b0Deg"] * DEG) @ p1
    lat = np.degrees(np.arcsin(np.clip(h[1], -1, 1)))
    lon = np.degrees(np.arctan2(h[0], h[2]))
    to_obs = o - p
    mu = float(p @ to_obs / np.linalg.norm(to_obs))
    return {
        "latDeg": float(lat),
        "lonStonyDeg": float(lon),
        "lonCarringtonDeg": float((d["l0Deg"] + lon) % 360.0),
        "mu": mu,
    }


def mean_ecliptic_matrix(jd_tdb1, jd_tdb2):
    """GCRS -> mean ecliptic and equinox of date."""
    eps = erfa.obl06(jd_tdb1, jd_tdb2)
    return rx(-eps) @ erfa.pmat06(jd_tdb1, jd_tdb2), eps


def sub_earth(jd_ut):
    t = Time(jd_ut, format="jd", scale="utc")
    tdb = t.tdb
    pvh, pvb = erfa.epv00(tdb.jd1, tdb.jd2)
    earth_helio = pvh[0]
    M, eps = mean_ecliptic_matrix(tdb.jd1, tdb.jd2)
    e = M @ (earth_helio / np.linalg.norm(earth_helio))  # Sun -> Earth
    s = -e
    I = 7.25 * DEG
    K = (73.6667 + 1.3958333 * (jd_ut - 2396758.0) / 36525.0) * DEG
    pole = np.array([np.sin(I) * np.sin(K), -np.sin(I) * np.cos(K), np.cos(I)])
    node = np.array([np.cos(K), np.sin(K), 0.0])
    nc = np.array([0.0, np.sin(eps), np.cos(eps)])
    b0 = np.degrees(np.arcsin(pole @ e))
    ncp = nc - (nc @ s) * s
    ncp /= np.linalg.norm(ncp)
    pp = pole - (pole @ s) * s
    east = np.cross(nc, s)
    east /= np.linalg.norm(east)
    P = np.degrees(np.arctan2(pp @ east, pp @ ncp))
    e_eq = e - (e @ pole) * pole
    eta = np.degrees(np.arctan2(np.cross(node, e_eq) @ pole, node @ e_eq))
    theta = (jd_ut - 2398220.0) * 360.0 / 25.38
    L0 = (eta - theta) % 360.0
    return {"jdUt": jd_ut, "pDeg": float(P), "b0Deg": float(b0), "l0Deg": float(L0)}


def earth_rate_sidereal(jd0, jd1):
    """Mean heliocentric longitude rate in the fixed J2000 mean ecliptic, deg/day."""
    eps0 = 84381.406 / 3600.0 * DEG
    out = []
    for jd in (jd0, jd1):
        tdb = Time(jd, format="jd", scale="utc").tdb
        pvh, _ = erfa.epv00(tdb.jd1, tdb.jd2)
        v = rx(-eps0) @ pvh[0]
        out.append(np.degrees(np.arctan2(v[1], v[0])))
    d = (out[1] - out[0] + 180.0) % 360.0 - 180.0
    return float(d / (jd1 - jd0))


def earth_rate_equator(jd0, jd1):
    """Mean rate of the sub-Earth point along the solar equator from the node,
    deg/day: daily steps of L0 from the vector construction (each step is about
    -13 degrees, so it cannot alias), plus Carrington's 360 / 25.38."""
    n = int(np.ceil(jd1 - jd0))
    jds = [jd0 + (jd1 - jd0) * i / n for i in range(n + 1)]
    l0 = [sub_earth(j)["l0Deg"] for j in jds]
    total = sum(((b - a + 540.0) % 360.0) - 180.0 for a, b in zip(l0[:-1], l0[1:]))
    return float(total / (jd1 - jd0) + 360.0 / 25.38)


def irradiance(S, d, R=6.957e8):
    S1 = S * d * d
    L = 4 * np.pi * sc.au**2 * S1
    T = (L / (4 * np.pi * R**2 * sc.sigma)) ** 0.25
    return {"fluxAt1Au": float(S1), "luminosityW": float(L), "teffK": float(T)}


def main(path):
    raw = open(path, "rb").read()
    inp = json.loads(raw)
    res = {
        "format": "gravitas.sun-oracle-results/1",
        "prompt": 194,
        "provenance": {
            "python": sys.version.split()[0],
            "numpy": np.__version__,
            "scipy": scipy.__version__,
            "astropy": astropy.__version__,
            "pyerfa": erfa.__version__,
            "inputsSha256": hashlib.sha256(raw).hexdigest(),
            "scriptSha256": hashlib.sha256(open(__file__, "rb").read()).hexdigest(),
            "offline": True,
            "installed": "nothing",
        },
        "pixels": [
            {"x": p[0], "y": p[1], **pixel_to_heliographic(p[0], p[1], inp["disk"])}
            for p in inp["pixels"]
        ],
        "ephemeris": [sub_earth(j) for j in inp["ephemerisInstantsJdUt"]],
        "rates": [
            {
                "jd0": a,
                "jd1": b,
                "degPerDay": earth_rate_sidereal(a, b),
                "equatorDegPerDay": earth_rate_equator(a, b),
            }
            for a, b in inp["rateWindowsJdUt"]
        ],
        "irradiance": [
            {**i, **irradiance(i["fluxWm2"], i["distanceAu"], inp["rSunM"])}
            for i in inp["irradiance"]
        ],
    }
    json.dump(res, sys.stdout, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main(sys.argv[1])
