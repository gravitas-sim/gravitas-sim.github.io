# The independent oracle for the 3-D lab curriculum II legs (thresholds.json).
#
# Run as:  python3 -E oracle.py inputs/inputs.json > oracle-results.json
# (or only some sections, the rest copied from an earlier output of this file:
#  python3 -E oracle.py inputs/inputs.json sky old-results.json > oracle-results.json)
#
# numpy and scipy only; it reads no Gravitas code and no Gravitas number except
# the ones in the inputs file, which holds the guide systems as numbers (a body
# is its position and velocity), the gravitational constants, the observers and
# the seeded orbits the validator generated. Every formula below is written
# here from its definition, not copied from the repository:
#
#   planes      equatorial: the identity turned about +x by the obliquity (given);
#               invariable: +z along the total angular momentum about the
#               barycenter, +x the node of that plane on the system's (+z cross
#               z'), +y = z' cross x; sky: +z toward the observer (az, el), +y the
#               system's +z as it appears (z minus its part along the observer,
#               normalised), +x = y cross z.
#   elements    from r and v by h = r x v, the node n = z x h, the eccentricity
#               vector, a from the energy; Omega the angle of n, omega from n to
#               the eccentricity vector about h; angles in (-pi, pi].
#   sky         the apparent ellipse of an orbit: half the width of the shape
#               along a direction, over 200,000 points of the orbit in order
#               (a convex curve; 3,600 directions on every tenth point, then
#               five nested zooms of 201 on all of them), has its largest and
#               smallest values at the apparent semi-major and semi-minor axes;
#               the impact parameter is the least sky separation over 2,000,000
#               points on the near side, refined by bounded minimisation
#               between the neighbours.
#   kepler      Kepler's equation by brentq, positions at given times.
#   n-body      DOP853, rtol 1e-12, atol 1e-14, all bodies, Newtonian.

import json
import sys

import numpy as np
from scipy.integrate import solve_ivp
from scipy.optimize import brentq

TAU = 2 * np.pi


def unit(v):
    return v / np.linalg.norm(v)


def wrap(a):
    return a - TAU * np.round(a / TAU)


def barycentric_L(m, x, v):
    M = m.sum()
    xc = (m[:, None] * x).sum(0) / M
    vc = (m[:, None] * v).sum(0) / M
    return (m[:, None] * np.cross(x - xc, v - vc)).sum(0)


def plane_rows(kind, m, x, v, obliquity_deg=None, observer=None):
    if kind == "system":
        return np.eye(3)
    if kind == "equatorial":
        c, s = np.cos(np.radians(obliquity_deg)), np.sin(np.radians(obliquity_deg))
        return np.array([[1, 0, 0], [0, c, -s], [0, s, c]], dtype=float)
    if kind == "invariable":
        z = unit(barycentric_L(m, x, v))
        node = np.cross([0, 0, 1], z)
        xa = unit(node) if np.linalg.norm(node) > 1e-12 else np.array([1.0, 0, 0])
        return np.array([xa, np.cross(z, xa), z])
    if kind == "sky":
        az, el = np.radians(observer["az"]), np.radians(observer["el"])
        d = np.array([np.cos(el) * np.cos(az), np.cos(el) * np.sin(az), np.sin(el)])
        up = np.array([0.0, 0, 1]) - d * d[2]
        y = unit(up) if np.linalg.norm(up) > 1e-9 else np.array([0.0, 1, 0])
        return np.array([np.cross(y, d), y, d])
    raise ValueError(kind)


def elements(r, v, mu):
    h = np.cross(r, v)
    hn = np.linalg.norm(h)
    rn = np.linalg.norm(r)
    ev = ((v @ v - mu / rn) * r - (r @ v) * v) / mu
    e = np.linalg.norm(ev)
    a = 1.0 / (2.0 / rn - v @ v / mu)
    inc = np.arccos(np.clip(h[2] / hn, -1, 1))
    node = np.cross([0, 0, 1], h)
    nn = np.linalg.norm(node)
    Om = np.arctan2(node[1], node[0]) if nn > 1e-12 else 0.0
    nh = node / nn if nn > 1e-12 else np.array([1.0, 0, 0])
    hh = h / hn

    def ang(frm, to):
        return np.arctan2(np.cross(frm, to) @ hh, frm @ to)

    om = ang(nh, ev / e) if e > 1e-11 else 0.0
    ref = ev / e if e > 1e-11 else nh
    nu = ang(ref, r)
    E = 2 * np.arctan2(np.sqrt(1 - e) * np.sin(nu / 2), np.sqrt(1 + e) * np.cos(nu / 2))
    M = E - e * np.sin(E)
    return dict(a=a, e=e, i=inc, Omega=Om, omega=om, M=M, normal=hh)


def system_arrays(system):
    b = system["bodies"]
    return (
        np.array([q["m"] for q in b], float),
        np.array([q["x"] for q in b], float),
        np.array([q["v"] for q in b], float),
    )


def orbit_in(system, G, body, primary, rows):
    m, x, v = system_arrays(system)
    xr, vr = x @ rows.T, v @ rows.T
    mu = G * (m[body] + m[primary])
    out = elements(xr[body] - xr[primary], vr[body] - vr[primary], mu)
    out.pop("normal")
    return {k: float(val) for k, val in out.items()}


# --- B1: elements of each planet in several planes ------------------------------


def planes(inp):
    out = []
    for case in inp["planes"]:
        sysm = case["system"]
        G = case["G"]
        m, x, v = system_arrays(sysm)
        for plane in case["planes"]:
            rows = plane_rows(plane["kind"], m, x, v, inp["obliquityDeg"], plane.get("observer"))
            for body in case["bodies"]:
                out.append(
                    dict(
                        case=case["name"],
                        plane=plane["name"],
                        body=body,
                        **orbit_in(sysm, G, body, 0, rows),
                    )
                )
    return out


# --- F1: the mutual inclination --------------------------------------------------


def mutual(inp):
    out = []
    for case in inp["mutual"]:
        sysm, G = case["system"], case["G"]
        m, x, v = system_arrays(sysm)
        n = []
        el = []
        for body in case["bodies"]:
            e = elements(x[body] - x[0], v[body] - v[0], G * (m[body] + m[0]))
            n.append(e["normal"])
            el.append(e)
        angle = np.arctan2(np.linalg.norm(np.cross(n[0], n[1])), n[0] @ n[1])
        i1, i2 = el[0]["i"], el[1]["i"]
        dO = el[1]["Omega"] - el[0]["Omega"]
        trig = np.arccos(np.clip(np.cos(i1) * np.cos(i2) + np.sin(i1) * np.sin(i2) * np.cos(dO), -1, 1))
        out.append(dict(case=case["name"], angle=float(angle), trig=float(trig)))
    return out


# --- C1, C3: the sky -----------------------------------------------------------


def perifocal_to_system(i, Om, om):
    def rz(t):
        c, s = np.cos(t), np.sin(t)
        return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])

    def rx(t):
        c, s = np.cos(t), np.sin(t)
        return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])

    return rz(Om) @ rx(i) @ rz(om)


def orbit_points(el, N):
    Q = perifocal_to_system(el["i"], el["Omega"], el["omega"])
    E = np.linspace(0, TAU, N, endpoint=False)
    a, e = el["a"], el["e"]
    b = a * np.sqrt(1 - e * e)
    pf = np.stack([a * (np.cos(E) - e), b * np.sin(E), np.zeros_like(E)], 1)
    return pf @ Q.T


def sky_axes(observer):
    return plane_rows("sky", None, None, None, observer=observer)


def apparent(el, observer, N=200_000):
    """Semi-axes of the orbit's shadow on the sky: a brute-force projection of N
    points of the orbit, taken in order round the orbit, so that they trace a
    convex curve. The half-width of the cloud along a direction is swept over
    3,600 directions on every tenth point; then five nested zooms of 201
    directions about the largest and the smallest evaluate it on the full
    cloud, restricted (rigorously, because the extreme point of a convex curve
    moves monotonically with the direction) to the arc between the extremes at
    the window's two ends."""
    rows = sky_axes(observer)
    p = orbit_points(el, N)
    pts = np.stack([p @ rows[0], p @ rows[1]], 1)
    coarse = pts[:: N // 20000]

    def unit(theta):
        return np.stack([np.cos(theta), np.sin(theta)], -1)

    def width_of(cloud, theta):
        proj = cloud @ unit(theta).T
        return 0.5 * (proj.max(0) - proj.min(0))

    def arc(i0, i1):
        d = (i1 - i0) % N
        return (i0 + np.arange(d + 1)) % N if d <= N // 2 else (i1 + np.arange(N - d + 1)) % N

    theta = np.linspace(0, np.pi, 3600, endpoint=False)
    wd = np.concatenate([width_of(coarse, theta[lo : lo + 400]) for lo in range(0, 3600, 400)])
    out = []
    for pick in (np.argmax, np.argmin):
        c, w = float(theta[int(pick(wd))]), np.pi / 3600
        best = None
        for _ in range(5):
            ends = unit(np.array([c - w, c + w]))
            proj = pts @ ends.T  # N x 2
            cand = np.unique(
                np.concatenate(
                    [arc(int(proj[:, 0].argmax()), int(proj[:, 1].argmax())), arc(int(proj[:, 0].argmin()), int(proj[:, 1].argmin()))]
                )
            )
            fine = np.linspace(c - w, c + w, 201)
            wf = width_of(pts[cand], fine)
            j = int(pick(wf))
            c, w, best = float(fine[j]), 2 * (fine[1] - fine[0]), float(wf[j])
        out.append(best)
    return out[0], out[1]


def transit(el, observer, radius, N=2_000_000):
    rows = sky_axes(observer)
    p = orbit_points(el, N)
    u, w, depth = p @ rows[0], p @ rows[1], p @ rows[2]
    sep = np.hypot(u, w)
    sep = np.where(depth > 0, sep, np.inf)
    k = int(np.argmin(sep))
    if not np.isfinite(sep[k]):
        return None
    # Refine the smallest sky separation of the near half by bounded minimisation
    # between the neighbouring samples (the sampled orbit is only the bracket).
    from scipy.optimize import minimize_scalar

    Q = perifocal_to_system(el["i"], el["Omega"], el["omega"])
    a, e = el["a"], el["e"]
    b = a * np.sqrt(1 - e * e)

    def sep_at(E):
        pos = Q @ np.array([a * (np.cos(E) - e), b * np.sin(E), 0.0])
        return float(np.hypot(pos @ rows[0], pos @ rows[1]))

    E0 = TAU * k / N
    res = minimize_scalar(sep_at, bounds=(E0 - 2 * TAU / N, E0 + 2 * TAU / N), method="bounded", options=dict(xatol=1e-14))
    best = min(float(res.fun), float(sep[k]))
    contact = radius["star"] + radius["planet"]
    return dict(
        impact=float(best),
        transits=bool(best < contact),
        chordHalf=float(np.sqrt(max(0.0, contact**2 - best**2))) if best < contact else 0.0,
    )


def sky(inp):
    out = []
    for c in inp["sky"]:
        major, minor = apparent(c["el"], c["observer"])
        row = dict(id=c["id"], major=major, minor=minor)
        if c.get("radius"):
            row["transit"] = transit(c["el"], c["observer"], c["radius"])
        out.append(row)
    return out


# --- D1: Kepler positions ---------------------------------------------------------


def kepler_state(el, mu, t):
    a, e = el["a"], el["e"]
    n = np.sqrt(mu / a**3)
    M = el["M"] + n * t
    M = wrap(M)
    E = brentq(lambda E: E - e * np.sin(E) - M, -np.pi - 1e-9, np.pi + 1e-9, xtol=1e-15, rtol=8.9e-16)
    Q = perifocal_to_system(el["i"], el["Omega"], el["omega"])
    b = a * np.sqrt(1 - e * e)
    pos = np.array([a * (np.cos(E) - e), b * np.sin(E), 0.0])
    return (Q @ pos).tolist()


def kepler(inp):
    out = []
    for c in inp["kepler"]:
        m, x, v = system_arrays(c["system"])
        body = c["body"]
        mu = c["G"] * (m[body] + m[0])
        el = elements(x[body] - x[0], v[body] - v[0], mu)
        pos = [(np.array(kepler_state(el, mu, t)) + x[0] + v[0] * t).tolist() for t in c["times"]]
        out.append(dict(id=c["id"], positions=pos))
    return out


# --- E1 to E3, H1: N-body ----------------------------------------------------------


def accel(G, m):
    def f(t, y):
        n = len(m)
        x = y[: 3 * n].reshape(n, 3)
        v = y[3 * n :].reshape(n, 3)
        a = np.zeros_like(x)
        for i in range(n):
            for j in range(n):
                if i != j:
                    d = x[j] - x[i]
                    a[i] += G * m[j] * d / np.linalg.norm(d) ** 3
        return np.concatenate([v.ravel(), a.ravel()])

    return f


def integrate(system, G, times):
    m, x, v = system_arrays(system)
    y0 = np.concatenate([x.ravel(), v.ravel()])
    sol = solve_ivp(accel(G, m), (0.0, float(times[-1])), y0, method="DOP853", t_eval=times, rtol=1e-12, atol=1e-14)
    if not sol.success:
        raise RuntimeError(sol.message)
    n = len(m)
    return m, sol.y[: 3 * n].T.reshape(-1, n, 3), sol.y[3 * n :].T.reshape(-1, n, 3)


def resonance(inp):
    c = inp["resonance"]
    P = TAU / np.sqrt(c["G"] * (1 + c["system"]["bodies"][1]["m"]))
    times = np.arange(0, c["orbits"] + 1) * P
    m, X, V = integrate(c["system"], c["G"], times)
    phi, eb = [], []
    for k in range(len(times)):
        inner = elements(X[k, 1] - X[k, 0], V[k, 1] - V[k, 0], c["G"] * (m[1] + m[0]))
        outer = elements(X[k, 2] - X[k, 0], V[k, 2] - V[k, 0], c["G"] * (m[2] + m[0]))
        lam = lambda e: e["Omega"] + e["omega"] + e["M"]
        varpi = inner["Omega"] + inner["omega"]
        phi.append(float(wrap(2 * lam(outer) - lam(inner) - varpi)))
        eb.append(float(inner["e"]))
    return dict(period=float(P), phi=phi, eb=eb)


def precession(inp):
    c = inp["precession"]
    G = c["G"]
    P = TAU / np.sqrt(G)  # a = 1, the inner planet's own period (to its mass)
    times = np.arange(0, c["orbits"] + 1, c["every"]) * P
    sysm = c["system"]
    m0, x0, v0 = system_arrays(sysm)
    rows = plane_rows("invariable", m0, x0, v0)
    m, X, V = integrate(sysm, G, times)
    node = []
    for k in range(len(times)):
        xr, vr = X[k] @ rows.T, V[k] @ rows.T
        e = elements(xr[1] - xr[0], vr[1] - vr[0], G * (m[1] + m[0]))
        node.append(float(np.degrees(e["Omega"])))
    node = np.unwrap(np.radians(node))
    orbits = times / P
    slope = np.polyfit(orbits, np.degrees(node), 1)[0]
    return dict(orbits=orbits.tolist(), nodeDeg=np.degrees(node).tolist(), degPer100=float(100 * slope))


SECTIONS = dict(planes=planes, mutual=mutual, sky=sky, kepler=kepler, resonance=resonance, precession=precession)


def main():
    # python3 -E oracle.py inputs.json                 every section
    # python3 -E oracle.py inputs.json sky,kepler old.json
    #     only those sections, the rest copied from an earlier output of this same
    #     file (the sections are independent, so the result equals a full run)
    inp = json.load(open(sys.argv[1]))
    names = sys.argv[2].split(",") if len(sys.argv) > 2 else list(SECTIONS)
    result = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else {}
    result["oracle"] = "python3 -E, numpy %s, scipy %s" % (np.__version__, __import__("scipy").__version__)
    for name in names:
        result[name] = SECTIONS[name](inp)
    json.dump({k: result[k] for k in ["oracle", *SECTIONS]}, sys.stdout)


main()
