"""The independent oracle of the orbit-determination gate (Prompt 197, part A).

Run as:  python3 -I oracle.py PACK_SIDECAR.json OUT.json

Nothing of Gravitas runs here. It decodes the ephemeris pack's coefficients itself
(layout in the pack header), draws the synthetic objects the contract's rule
describes, integrates the perturbed and the unperturbed motion with DOP853, forms
the geocentric light-time-corrected directions, and fits the best two-body orbit
to the noise-free perturbed observations (Efit). Every number it writes is a
function of the contract in tests/fixtures/orbit-determination-gate/thresholds.json.
"""
import base64
import json
import math
import struct
import sys

import numpy as np
from numpy.polynomial import chebyshev as C
from scipy.integrate import solve_ivp
from scipy.optimize import least_squares

AU_KM = 149597870.7
K = 0.01720209895
MU = K * K
CLIGHT = 173.1446326846693
RATIOS = {"venus": 2.4478383e-6, "earth": 3.0404326e-6, "mars": 3.2271560e-7, "jupiter": 9.5479194e-4}
KMS_TO_AUD = 86400.0 / AU_KM

OFFSETS = [-120, -100, -90, -80, -60, -40, -20, -10, -5, -2, -1, -0.5, 0, 0.5, 1, 2, 5, 10, 20, 40, 60, 80, 90, 100, 120, 61, 121]
OFFSETS = sorted(set(OFFSETS))
CURATED = [-60, 0, 60]
LONGER = [-120, -100, -80, -60, -40, -20, 0, 20, 40, 60, 80, 100, 120]
WITHHELD = [61, 121]
NEO_OFFSETS = [-5, 0, 5]


class Pack:
    def __init__(self, sidecar):
        d = json.load(open(sidecar))
        p = d["pack"]
        self.start = p["range"]["startJd"]
        self.stop = p["range"]["stopJd"]
        self.tab = {}
        for b in p["bodies"]:
            raw = base64.b64decode(d["data"][b["id"]])
            n = b["degree"]
            per = 16 + 4 * (n - 1)
            segs = b["segments"]
            assert len(raw) == segs * 3 * per
            c = np.zeros((segs, 3, n + 1))
            o = 0
            for s in range(segs):
                for ax in range(3):
                    c0, c1 = struct.unpack_from("<dd", raw, o)
                    rest = struct.unpack_from("<%df" % (n - 1), raw, o + 16)
                    c[s, ax, 0] = c0
                    c[s, ax, 1] = c1
                    c[s, ax, 2:] = rest
                    o += per
            self.tab[b["id"]] = (c, b["segmentDays"], segs)

    def pos(self, body, jd):
        c, days, segs = self.tab[body]
        k = min(segs - 1, max(0, int(math.floor((jd - self.start) / days))))
        a = self.stop - days if k == segs - 1 else self.start + k * days
        if jd > a + days:
            k = segs - 1
            a = self.stop - days
        x = (jd - a) / (days / 2.0) - 1.0
        return np.array([C.chebval(x, c[k, ax]) for ax in range(3)]) / AU_KM


def kepler_E(M, e):
    M = math.fmod(M, 2 * math.pi)
    E = M + e * math.sin(M) if e < 0.8 else math.pi
    for _ in range(100):
        d = (E - e * math.sin(E) - M) / (1 - e * math.cos(E))
        E -= d
        if abs(d) < 1e-15:
            break
    return E


def rot(Om, inc, om):
    cO, sO, ci, si, co, so = math.cos(Om), math.sin(Om), math.cos(inc), math.sin(inc), math.cos(om), math.sin(om)
    return np.array(
        [
            [cO * co - sO * so * ci, -cO * so - sO * co * ci, sO * si],
            [sO * co + cO * so * ci, -sO * so + cO * co * ci, -cO * si],
            [so * si, co * si, ci],
        ]
    )


def elements_to_state(a, e, inc, Om, om, M):
    E = kepler_E(M, e)
    r = a * (1 - e * math.cos(E))
    pf_r = np.array([a * (math.cos(E) - e), a * math.sqrt(1 - e * e) * math.sin(E), 0.0])
    pf_v = np.array([-math.sqrt(MU * a) / r * math.sin(E), math.sqrt(MU * a * (1 - e * e)) / r * math.cos(E), 0.0])
    R = rot(Om, inc, om)
    return R @ pf_r, R @ pf_v


def state_to_elements(r, v):
    rn = np.linalg.norm(r)
    h = np.cross(r, v)
    energy = v @ v / 2 - MU / rn
    a = -MU / (2 * energy)
    ev = np.cross(v, h) / MU - r / rn
    e = np.linalg.norm(ev)
    return a, e, math.degrees(math.acos(h[2] / np.linalg.norm(h)))


def rhs_two(t, y):
    r = y[:3]
    rn = np.linalg.norm(r)
    return np.concatenate([y[3:], -MU * r / rn**3])


def make_rhs_n(pack):
    def rhs(t, y):
        r = y[:3]
        rn = np.linalg.norm(r)
        a = -MU * r / rn**3
        for body, mr in RATIOS.items():
            rp = pack.pos(body, t)
            d = rp - r
            a = a + MU * mr * (d / np.linalg.norm(d) ** 3 - rp / np.linalg.norm(rp) ** 3)
        return np.concatenate([y[3:], a])

    return rhs


class Traj:
    """A dense trajectory from a state at t2, both directions."""

    def __init__(self, rhs, t2, y0, back, fwd, max_step):
        kw = dict(method="DOP853", rtol=1e-13, atol=1e-16, dense_output=True, max_step=max_step)
        self.f = solve_ivp(rhs, (t2, t2 + fwd), y0, **kw)
        self.b = solve_ivp(rhs, (t2, t2 - back), y0, **kw)
        self.t2 = t2

    def pos(self, t):
        s = self.f if t >= self.t2 else self.b
        return s.sol(t)[:3]


def direction(traj, pack, t):
    R = pack.pos("earth", t)
    tau = 0.0
    for _ in range(8):
        rho = traj.pos(t - tau) - R
        tau = np.linalg.norm(rho) / CLIGHT
    rho = traj.pos(t - tau) - R
    n = np.linalg.norm(rho)
    return math.atan2(rho[1], rho[0]) % (2 * math.pi), math.asin(rho[2] / n), n


def unit(lam, bet):
    return np.array([math.cos(bet) * math.cos(lam), math.cos(bet) * math.sin(lam), math.sin(bet)])


def sep_arcsec(l1, b1, l2, b2):
    d = np.linalg.norm(unit(l1, b1) - unit(l2, b2))
    return 2 * math.asin(min(1.0, d / 2)) * 206264.80624709636


def draw_main_belt(rng, pack, t2):
    a = rng.uniform(2.2, 3.3)
    e = rng.uniform(0.0, 0.25)
    inc = math.radians(rng.uniform(0.0, 20.0))
    Om = rng.uniform(0, 2 * math.pi)
    om = rng.uniform(0, 2 * math.pi)
    Re = pack.pos("earth", t2)
    Lon_e = math.atan2(Re[1], Re[0])

    def f(M):
        r, _ = elements_to_state(a, e, inc, Om, om, M)
        d = math.atan2(r[1], r[0]) - Lon_e
        return (d + math.pi) % (2 * math.pi) - math.pi

    grid = np.linspace(0, 2 * math.pi, 3601)
    vals = [f(M) for M in grid]
    M2 = None
    for i in range(len(grid) - 1):
        if vals[i] * vals[i + 1] < 0 and abs(vals[i]) < 1 and abs(vals[i + 1]) < 1:
            lo, hi = grid[i], grid[i + 1]
            for _ in range(80):
                mid = 0.5 * (lo + hi)
                if f(lo) * f(mid) <= 0:
                    hi = mid
                else:
                    lo = mid
            M2 = 0.5 * (lo + hi)
            break
    assert M2 is not None
    return dict(a=a, e=e, i=inc, Om=Om, om=om, M=M2)


def draw_neo(rng, pack, t2):
    Re = pack.pos("earth", t2)
    h = 1e-3
    Ve = (pack.pos("earth", t2 + h) - pack.pos("earth", t2 - h)) / (2 * h)
    while True:
        rho = rng.uniform(0.05, 0.4)
        d = rng.normal(size=3)
        d /= np.linalg.norm(d)
        dv = rng.uniform(3.0, 15.0) * KMS_TO_AUD
        w = rng.normal(size=3)
        w /= np.linalg.norm(w)
        r = Re + rho * d
        v = Ve + dv * w
        a, e, inc = state_to_elements(r, v)
        if a > 0 and e < 0.95 and a * (1 - e) > 0.3 and a < 6:
            return r, v, rho


def observe(traj, pack, t2, offsets):
    out = []
    for o in offsets:
        lam, bet, rho = direction(traj, pack, t2 + o)
        out.append((lam, bet, rho))
    return out


def fit_two_body(pack, t2, y0, offsets, truth, back, fwd):
    """Best two-body orbit (state at t2) to noise-free observations (lam cos(bet), bet)."""

    def resid(p):
        tr = Traj(rhs_two, t2, p, back, fwd, 2.0)
        res = []
        for o, (lt, bt) in zip(offsets, truth):
            lam, bet, _ = direction(tr, pack, t2 + o)
            dl = ((lam - lt + math.pi) % (2 * math.pi)) - math.pi
            res += [dl * math.cos(bt), bet - bt]
        return np.array(res) * 206264.80624709636

    scale = np.array([1e-3, 1e-3, 1e-3, 1e-5, 1e-5, 1e-5])
    sol = least_squares(resid, y0, x_scale=scale, xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=60)
    return sol.x, float(np.sqrt(np.mean(sol.fun**2)))


def main(sidecar, out):
    pack = Pack(sidecar)
    rng = np.random.default_rng(197)
    rhs_n = make_rhs_n(pack)
    objs = []
    for k in range(12):
        t2 = 2460900.5 + 380 * k
        el = draw_main_belt(rng, pack, t2)
        r2, v2 = elements_to_state(el["a"], el["e"], el["i"], el["Om"], el["om"], el["M"])
        y0 = np.concatenate([r2, v2])
        tr_n = Traj(rhs_n, t2, y0, 140, 130, 0.5)
        tr_2 = Traj(rhs_two, t2, y0, 140, 270, 0.5)
        obs_n = observe(tr_n, pack, t2, OFFSETS)
        obs_2 = observe(tr_2, pack, t2, OFFSETS)
        # F2: positions of the two-body integration at fixed offsets
        f2 = {str(o): list(tr_2.pos(t2 + o)) for o in [-120, -60, 61, 121, 260]}
        rec = dict(
            id=k,
            t2=t2,
            elements=dict(
                aAu=el["a"], e=el["e"], iDeg=math.degrees(el["i"]), nodeDeg=math.degrees(el["Om"]),
                omegaDeg=math.degrees(el["om"]), meanAnomalyDeg=math.degrees(el["M"]),
            ),
            state=dict(r=list(r2), v=list(v2)),
            offsets=OFFSETS,
            nbody=dict(lam=[o[0] for o in obs_n], bet=[o[1] for o in obs_n], rho=[o[2] for o in obs_n]),
            twobody=dict(lam=[o[0] for o in obs_2], bet=[o[1] for o in obs_2], rho=[o[2] for o in obs_2]),
            f2=f2,
        )
        # E(W): unperturbed reference against perturbed truth
        idx = {o: i for i, o in enumerate(OFFSETS)}
        rec["E"] = {
            str(w): sep_arcsec(obs_n[idx[w]][0], obs_n[idx[w]][1], obs_2[idx[w]][0], obs_2[idx[w]][1]) for w in WITHHELD
        }
        # Efit(W) for the curated and the longer arcs
        for name, arc in (("T60", CURATED), ("L240", LONGER)):
            truth = [(obs_n[idx[o]][0], obs_n[idx[o]][1]) for o in arc]
            x, rms = fit_two_body(pack, t2, y0, arc, truth, 140, 130)
            tr_f = Traj(rhs_two, t2, x, 140, 130, 0.5)
            ef = {}
            for w in WITHHELD:
                lam, bet, _ = direction(tr_f, pack, t2 + w)
                ef[str(w)] = sep_arcsec(lam, bet, obs_n[idx[w]][0], obs_n[idx[w]][1])
            rec["Efit_" + name] = dict(state=list(x), rmsArcsec=rms, atW=ef)
        objs.append(rec)
        print("object", k, "E", rec["E"], "Efit60", rec["Efit_T60"]["atW"], "Efit240", rec["Efit_L240"]["atW"], flush=True)

    neos = []
    for k in range(12):
        t2 = 2460900.5 + 380 * k
        r2, v2, rho = draw_neo(rng, pack, t2)
        y0 = np.concatenate([r2, v2])
        tr_n = Traj(rhs_n, t2, y0, 10, 10, 0.1)
        obs_n = observe(tr_n, pack, t2, NEO_OFFSETS)
        a, e, inc = state_to_elements(r2, v2)
        neos.append(
            dict(id=k, t2=t2, rangeAu=rho, aAu=a, e=e, iDeg=inc, state=dict(r=list(r2), v=list(v2)),
                 offsets=NEO_OFFSETS, nbody=dict(lam=[o[0] for o in obs_n], bet=[o[1] for o in obs_n], rho=[o[2] for o in obs_n]))
        )
        print("neo", k, "range", rho, "a", a, "e", e, flush=True)

    earth = []
    for j in range(50):
        jd = 2460800.0 + 4500.0 * j / 49.0
        earth.append([jd] + list(pack.pos("earth", jd)))
    versions = dict(python=sys.version.split()[0], numpy=np.__version__)
    import scipy

    versions["scipy"] = scipy.__version__
    json.dump(dict(format="gravitas.orbit-determination-gate-oracle/1", seed=197, versions=versions, objects=objs, neos=neos, earth=earth), open(out, "w"), separators=(",", ":"))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
