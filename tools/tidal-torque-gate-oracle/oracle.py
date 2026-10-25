"""
Independent reference for the tidal-torque gate (Prompt 204, part B, TIDAL_TORQUE_GATE.md).

    <venv>/bin/python -I tools/tidal-torque-gate-oracle/oracle.py <oracle-inputs.json> <results.json>

scipy and numpy only; no Gravitas code runs. The harness's relative orbit
(two bodies under gravity plus the seam's dissipative acceleration along the
azimuthal direction) is integrated with DOP853 at rtol 1e-13, atol 1e-15, and the
semi-major axis at T = 20 initial periods is recorded from the vis-viva relation
of the relative state. The same numbers are written for the closed form's two
inputs (the initial mean motion and the rate K) so that the tool can state them.
"""

import json
import sys

import numpy as np
from scipy.integrate import solve_ivp

h = json.load(open(sys.argv[1]))
G = h["G"]
M, m, a0 = h["M"], h["m"], h["a0"]
eps0 = h["eps0"]
orbits = h["orbits"]
mu_tot = G * (M + m)
n0 = np.sqrt(mu_tot / a0**3)
T0 = 2 * np.pi / n0
s = 1.0


def rhs(t, y):
    x, yy, vx, vy = y
    r = np.hypot(x, yy)
    a_g = -mu_tot / r**3
    a_t = s * eps0 * (mu_tot / a0**2) * (a0 / r) ** 7
    return [vx, vy, a_g * x + a_t * (-yy / r), a_g * yy + a_t * (x / r)]


y0 = [a0, 0.0, 0.0, np.sqrt(mu_tot / a0)]
T = orbits * T0
ts = [k * T0 for k in range(orbits + 1)]
sol = solve_ivp(rhs, [0, T], y0, method="DOP853", t_eval=ts, rtol=1e-13, atol=1e-15)


def semi_major(state):
    x, yy, vx, vy = state
    r = np.hypot(x, yy)
    return float(1.0 / (2.0 / r - (vx * vx + vy * vy) / mu_tot))


a_series = [semi_major(sol.y[:, k]) for k in range(sol.y.shape[1])]
L_series = [float(sol.y[0, k] * sol.y[3, k] - sol.y[1, k] * sol.y[2, k]) for k in range(sol.y.shape[1])]
out = {
    "G": G, "M": M, "m": m, "a0": a0, "eps0": eps0, "orbits": orbits,
    "muTot": mu_tot, "n0": float(n0), "T0": float(T0),
    "aAtEachOrbit": a_series,
    "specificAngularMomentumAtEachOrbit": L_series,
    "aEnd": a_series[-1],
    "K": float(2 * eps0 * np.sqrt(mu_tot) * a0**5),
}
json.dump(out, open(sys.argv[2], "w"), indent=2)
