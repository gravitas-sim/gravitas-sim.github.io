"""
Independent oracle for the tides kernel (Prompt 204, TIDAL_KERNEL.md).

    <venv>/bin/python -I tools/tides-oracle/oracle.py <inputs.json> <results.json>

numpy and scipy only; no Gravitas code runs. Every closed form is written out here
from its definition, and the constant-Q recession is integrated numerically
(scipy.integrate.solve_ivp, DOP853, rtol 1e-12) to check the kernel's closed-form
solution of da/dt = C a^(-11/2) without using that closed form.
"""

import json
import sys

import numpy as np
from scipy.integrate import solve_ivp

inp = json.load(open(sys.argv[1]))
G = inp["G"]
YEAR = inp["year"]
out = {"G": G}


def kepler_n(mu, a):
    return np.sqrt(mu / a**3)


# bulge: peak to trough
out["bulge"] = {}
for c in inp["bulge"]:
    h = 1.5 * c["h2"] * (c["perturberMass"] / c["bodyMass"]) * (c["bodyRadius"] / c["distance"]) ** 3 * c["bodyRadius"]
    out["bulge"][c["id"]] = {"height": float(h)}

# roche: coefficient, rigid and fluid (2.44, and the exact 2.4553)
out["roche"] = {}
for c in inp["roche"]:
    ratio = (c["primaryDensity"] / c["satelliteDensity"]) ** (1.0 / 3.0)
    out["roche"][c["id"]] = {
        "rigid": float(2 ** (1.0 / 3.0) * c["primaryRadius"] * ratio),
        "fluid": float(2.44 * c["primaryRadius"] * ratio),
        "fluidExact": float(2.4553 * c["primaryRadius"] * ratio),
        "inside": bool(2 ** (1.0 / 3.0) * c["primaryRadius"] * ratio < c["primaryRadius"]),
    }

# heating
out["heating"] = {}
for c in inp["heating"]:
    M = c["primaryMass"]
    m = c.get("satelliteMass", 0.0)
    a = c["semiMajorAxis"]
    n = kepler_n(G * (M + m), a)
    P = 2 * np.pi / n
    k2q = c["k2"] / c["Q"]
    e = c["eccentricity"]
    edot = 10.5 * k2q * G * M**2 * n * c["satelliteRadius"] ** 5 * e**2 / a**6
    out["heating"][c["id"]] = {"n": float(n), "period": float(P), "power": float(edot), "perOrbit": float(edot * P)}

# evolution
out["evolution"] = {}
for c in inp["evolution"]:
    M, R, m, a0 = c["primaryMass"], c["primaryRadius"], c["satelliteMass"], c["semiMajorAxis"]
    k2q = c["k2"] / c["Q"]
    mu_tot = G * (M + m)
    n0 = kepler_n(mu_tot, a0)
    s = 1.0 if c["spin"] > n0 else -1.0
    torque = 1.5 * k2q * G * m**2 * R**5 / a0**6
    dadt = 3 * k2q * (m / M) * (R / a0) ** 5 * n0 * a0
    mu = M * m / (M + m)
    I = c["alpha"] * M * R**2
    L = lambda a: mu * np.sqrt(mu_tot * a)
    dL = 0.5 * L(a0) * (s * dadt) / a0
    domega = -dL / I
    Cc = 3 * k2q * (m / M) * R**5 * np.sqrt(mu_tot)
    t_end = 0.1 * a0 / dadt if c["years"] is None else c["years"] * YEAR
    # keep the change modest: never more than the stated years, never more than 10 percent of a0
    t_end = min(t_end, 0.1 * a0 / dadt)
    fr = [0.0, 0.25, 0.5, 0.75, 1.0]
    ts = [f * t_end for f in fr]
    sol = solve_ivp(lambda t, y: [s * Cc * y[0] ** -5.5], [0, t_end], [a0], method="DOP853", t_eval=ts, rtol=1e-12, atol=1e-6)
    a_t = [float(v) for v in sol.y[0]]
    om_t = [float(c["spin"] - (L(v) - L(a0)) / I) for v in a_t]
    En = lambda a, om: -G * M * m / (2 * a) + 0.5 * I * om**2
    out["evolution"][c["id"]] = {
        "sign": s, "n": float(n0), "torque": float(torque), "dadt": float(s * dadt), "dOmegaDt": float(domega),
        "momentOfInertia": float(I), "C": float(Cc), "times": ts, "a": a_t, "omega": om_t,
        "angularMomentum": [float(L(v) + I * w) for v, w in zip(a_t, om_t)],
        "energy": [float(En(v, w)) for v, w in zip(a_t, om_t)],
    }

# locking: t = I omega / N, N = 3/2 k2/Q G m_p^2 R^5 / a^6, I = alpha m_s R^2
out["locking"] = {}
for c in inp["locking"]:
    I = c["alpha"] * c["satelliteMass"] * c["satelliteRadius"] ** 2
    N = 1.5 * (c["k2"] / c["Q"]) * G * c["perturberMass"] ** 2 * c["satelliteRadius"] ** 5 / c["semiMajorAxis"] ** 6
    t = I * c["spin"] / N
    out["locking"][c["id"]] = {"torque": float(N), "time": float(t), "years": float(t / YEAR)}

# resonance radii and the period ratio there
out["resonance"] = {}
for c in inp["resonance"]:
    ar = c["semiMajorAxis"] * (c["q"] / c["p"]) ** (2.0 / 3.0)
    out["resonance"][c["id"]] = {"radius": float(ar)}

# toomre
out["toomre"] = {}
for c in inp["toomre"]:
    kappa = np.sqrt(G * c["primaryMass"] / c["radius"] ** 3)
    coef = 3.36 if c["kind"] == "particles" else np.pi
    Q = coef * G * c["surfaceDensity"]
    Q = c["velocityDispersion"] * kappa / Q
    out["toomre"][c["id"]] = {"kappa": float(kappa), "Q": float(Q)}

json.dump(out, open(sys.argv[2], "w"), indent=2)
