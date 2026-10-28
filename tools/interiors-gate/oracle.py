"""Independent oracle for the interiors gate (Prompt 203, INTERIORS_GATE.md).

Written from the equations, without reading the kernel. Run as
    python3 -I tools/interiors-gate/oracle.py inputs.json results.json
with numpy and scipy only.
"""
import json
import sys

import numpy as np
from scipy.integrate import quad, solve_ivp
from scipy.optimize import brentq

EPS = 1e-14


def two_layer_mass(R, rc, rm, rcore):
    f = lambda r, rho: 4 * np.pi * rho * r * r
    return (quad(f, 0, rc, args=(rcore,), epsabs=0, epsrel=EPS, limit=200)[0]
            + quad(f, rc, R, args=(rm,), epsabs=0, epsrel=EPS, limit=200)[0])


def two_layer_moment_factor(R, rc, rm, rcore, M=None):
    g = lambda r, rho: (8 * np.pi / 3) * rho * r ** 4
    C = (quad(g, 0, rc, args=(rcore,), epsabs=0, epsrel=EPS, limit=200)[0]
         + quad(g, rc, R, args=(rm,), epsabs=0, epsrel=EPS, limit=200)[0])
    if M is None:
        M = two_layer_mass(R, rc, rm, rcore)
    return C / (M * R * R)


def core_from_mass(R, M, rm, rcore):
    h = lambda rc: two_layer_mass(R, rc, rm, rcore) - M
    return brentq(h, 1e-6 * R, R * (1 - 1e-9), xtol=1e-14 * R, rtol=8.9e-16, maxiter=500)


def radau_eta_surface(D_of_r, r0, r1, eta0=0.0, breaks=()):
    """Integrate r d(eta)/dr = 6 - 6 D (eta + 1) - eta (eta - 1) from r0 to r1."""
    def rhs(r, y):
        eta = y[0]
        return [(6 - 6 * D_of_r(r) * (eta + 1) - eta * (eta - 1)) / r]
    sol = solve_ivp(rhs, (r0, r1), [eta0], method="Radau", rtol=1e-12, atol=1e-14)
    return float(sol.y[0, -1])


def two_layer_eta(x, kappa):
    """Radius 1, core radius x, density ratio kappa = rho_core / rho_mantle. eta = 0 in the homogeneous core."""
    D = lambda r: 1.0 / (1.0 + (kappa - 1.0) * x ** 3 / r ** 3)
    return radau_eta_surface(D, x, 1.0)


def two_layer_C_unit(x, kappa):
    """C/(M R^2) by quadrature, R = 1, rho_mantle = 1."""
    M = two_layer_mass(1.0, x, 1.0, kappa)
    return two_layer_moment_factor(1.0, x, 1.0, kappa, M)


def polytrope_D(r):
    xi = np.pi * r
    return xi ** 2 * np.sin(xi) / (3 * (np.sin(xi) - xi * np.cos(xi)))


def polytrope_C():
    rho = lambda r: np.sinc(r)  # sin(pi r)/(pi r)
    M = quad(lambda r: 4 * np.pi * rho(r) * r * r, 0, 1, epsabs=0, epsrel=EPS)[0]
    C = quad(lambda r: (8 * np.pi / 3) * rho(r) * r ** 4, 0, 1, epsabs=0, epsrel=EPS)[0]
    return C / M


def main(inp_path, out_path):
    inp = json.load(open(inp_path))
    out = {"seed": inp["seed"], "numpy": np.__version__}
    # I1, I2
    rows = []
    for p in inp["twoLayer"]:
        R, rm, rc_ = p["radius"], p["rhoMantle"], p["rhoCore"]
        rc = p["x"] * R
        M = two_layer_mass(R, rc, rm, rc_)
        C = two_layer_moment_factor(R, rc, rm, rc_, M)
        root = core_from_mass(R, M, rm, rc_)
        rows.append({"mass": M, "moment": C, "coreRoot": root})
    out["twoLayer"] = rows
    # O1
    rows = []
    for p in inp["radau"]:
        q, c = p["q"], p["moment"]
        s = 1 - 1.5 * c
        f = 2.5 * q / (1 + 6.25 * s * s)
        fh = 1.25 * q * p["fFrac"]            # f at or below the homogeneous value 5q/4
        c_back = (2 / 3) * (1 - 0.4 * np.sqrt(2.5 * q / fh - 1))
        rows.append({"f": f, "fFor": fh, "momentFromF": c_back})
    out["radau"] = rows
    # self tests
    hom_eta = two_layer_eta(0.5, 1.0)
    hom_C = two_layer_C_unit(0.5, 1.0)
    poly_C = polytrope_C()
    poly_target = (2 / 3) * (1 - 6 / np.pi ** 2)
    xi0 = 1e-4
    poly_eta = radau_eta_surface(polytrope_D, xi0 / np.pi, 1.0)
    out["selfTests"] = {
        "homogeneousEta": hom_eta,
        "homogeneousMoment": hom_C,
        "homogeneousF_over_q": 2.5 / (hom_eta + 2),
        "polytropeMoment": poly_C,
        "polytropeTarget": poly_target,
        "polytropeEta": poly_eta,
        "polytropeF_over_q": 2.5 / (poly_eta + 2),
    }
    # O2
    rows = []
    for p in inp["clairaut"]:
        eta = two_layer_eta(p["x"], p["kappa"])
        rows.append({"etaS": eta, "fOverQ": 2.5 / (eta + 2), "moment": two_layer_C_unit(p["x"], p["kappa"])})
    out["clairaut"] = rows
    out["polytrope"] = {"etaS": poly_eta, "fOverQ": 2.5 / (poly_eta + 2), "moment": poly_C}
    # O6
    rows = []
    for p in inp["ensembleO6"]:
        eta = two_layer_eta(p["x"], p["kappa"])
        rows.append({"fOverQ": 2.5 / (eta + 2), "moment": two_layer_C_unit(p["x"], p["kappa"])})
    out["ensembleO6"] = rows
    json.dump(out, open(out_path, "w"))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
