# The gate's independent oracle (Prompt 199 spike): numpy, scipy, astropy only.
# Written from the equations of ATMOSPHERES_GATE_I.md, not from the kernel.
# usage: python -I oracle.py inputs.json results.json
import json, sys
import numpy as np
from scipy import integrate, optimize, special
from astropy import constants as c

SIG = c.sigma_sb.value
KB = c.k_B.value
G = c.G.value
U = c.u.value
MEARTH_KG = 5.9722e24  # same value the spike widget uses; the oracle takes the inputs in Earth masses

inp = json.load(open(sys.argv[1]))
out = {}

# A1: equilibrium temperature
out['equilibrium'] = [
    float(((p['flux'] * (1 - p['albedo']) * (2 / 3 - 5 * p['eps'] / 12)) / SIG) ** 0.25)
    for p in inp['equilibrium']
]

# A3: one layer, by solving the two balance equations as a linear system in (Ts^4, TL^4)
def onelayer(te, eps):
    # layer: eps*Ts4 - 2*eps*TL4 = 0 ; top: (1-eps)*Ts4 + eps*TL4 = Te4
    A = np.array([[eps, -2 * eps], [1 - eps, eps]])
    b = np.array([0.0, te ** 4])
    if eps == 0:
        return te, te / 2 ** 0.25
    ts4, tl4 = np.linalg.solve(A, b)
    return ts4 ** 0.25, tl4 ** 0.25
out['onelayer'] = [list(map(float, onelayer(p['te'], p['eps']))) for p in inp['onelayer']]

# A4: grey Eddington closed forms (independent evaluation of the stated equations)
out['grey'] = [
    [float(p['te'] * (0.75 * (p['tau'] + 2 / 3)) ** 0.25), float(p['te'] * (1 + 0.75 * p['tau']) ** 0.25)]
    for p in inp['grey']
]

# A4: grey two-stream moment equations, solved numerically.
# Eddington closure K = J/3: dJ/dtau = 3H, dH/dtau = 0; upward-flux condition at the top F_down = pi (J - 2H) = 0;
# F = sigma Te^4 = 4 pi H; ground: sigma Tg^4 = F_up(tau_s) = pi (J + 2H).
te = inp['greyOde']['te']
H = SIG * te ** 4 / (4 * np.pi)
ode = []
for ts in inp['greyOde']['tauS']:
    sol = integrate.solve_ivp(lambda tau, y: [3 * y[1], 0.0], [0, ts], [2 * H, H], rtol=1e-12, atol=1e-30,
                              dense_output=True)
    J, Hh = sol.y[0, -1], sol.y[1, -1]
    taus = np.array([0.0, ts / 3, ts])
    T = [(np.pi * sol.sol(x)[0] / SIG) ** 0.25 for x in taus]
    Tg = (np.pi * (J + 2 * Hh) / SIG) ** 0.25
    ode.append({'tauS': ts, 'T': [float(x) for x in T], 'tau': [float(x) for x in taus], 'ground': float(Tg)})
out['greyOde'] = ode

# A5: the exact grey solution, from the Milne equation, S(tau) = (1/2) int S(t) E1(|t - tau|) dt in radiative equilibrium.
# S = tau + q(tau) normalised so the net flux is constant; below tau_max the source is its linear asymptote
# tau + q_inf with the Hopf constant q_inf = 0.7104461. Collocation at cell midpoints with piecewise-constant
# S per cell; the integral of E1(|x|) is exact (sign(x) (1 - E2(|x|))).
QINF = 0.7104461
def G1(x):
    return np.sign(x) * (1 - special.expn(2, np.abs(x)))
def milne(tau_max=30.0):
    # geometric cells near the surface (the source function varies fastest there), then uniform cells of 0.02
    edges = np.unique(np.concatenate([[0.0], np.geomspace(1e-6, 0.5, 120), np.arange(0.5, tau_max + 1e-9, 0.02)]))
    mid = 0.5 * (edges[:-1] + edges[1:])
    lam = 0.5 * (G1(edges[None, 1:] - mid[:, None]) - G1(edges[None, :-1] - mid[:, None]))
    # contribution of t > tau_max with S = t + QINF: (1/2) int_{xm}^inf (x + tau_i + QINF) E1(x) dx
    xm = tau_max - mid
    tail = 0.5 * ((np.exp(-xm) - special.expn(3, xm)) + (mid + QINF) * special.expn(2, xm))
    S = np.linalg.solve(np.eye(len(mid)) - lam, tail)
    return mid, S
mid, S = milne()
q = S - mid
out['milne'] = {'tau': mid.tolist(), 'q': q.tolist()}
# self-test values read off the solution
out['milneSelf'] = {'q0': float(q[0]), 'qInf': float(q[len(q) // 2 + 100]), 'qAtTau20': float(np.interp(20.0, mid, q)), 'cells': int(len(mid))}
# the exact T4 ratio on the requested grid, interpolated linearly in q
taus = np.array(inp['milneTau'])
qq = np.where(taus <= mid[-1], np.interp(taus, mid, q), QINF)
out['milneT'] = [float((0.75 * (t + qv)) ** 0.25) for t, qv in zip(taus, qq)]
out['milneTau'] = taus.tolist()

# S1: scale height; the e-folding check integrates the isothermal hydrostatic column
out['scale'] = [float(KB * p['t'] / (p['mu'] * U * p['g'])) for p in inp['scale']]
ef = []
for p in inp['scale'][:50]:
    Hn = KB * p['t'] / (p['mu'] * U * p['g'])
    # d ln p / dz = - mu u g / (kT)  (ideal gas, hydrostatic); find z where p = p0 / e
    sol = integrate.solve_ivp(lambda z, y: [-p['mu'] * U * p['g'] / (KB * p['t'])], [0, 5 * Hn], [0.0],
                              rtol=1e-12, atol=1e-14, dense_output=True)
    zroot = optimize.brentq(lambda z: sol.sol(z)[0] + 1.0, 0, 5 * Hn, xtol=1e-12 * Hn, rtol=1e-14)
    ef.append(float(zroot))
out['efold'] = ef

# J1: Jeans quantities with astropy constants, and the root by brentq
jeans = []
for p in inp['jeans']:
    M = p['massEarth'] * MEARTH_KG
    r = p['rKm'] * 1e3
    m = p['amu'] * U
    lam = G * M * m / (KB * p['t'] * r)
    v0 = np.sqrt(2 * KB * p['t'] / m)
    flux = v0 * (1 + lam) * np.exp(-lam) / (2 * np.sqrt(np.pi))
    eta = p['eta']
    target = 2 * np.sqrt(np.pi)
    f = lambda L_: eta * (1 + L_) * np.exp(-L_) - target
    lmin = 0.0 if f(0.0) <= 0 else optimize.brentq(f, 0.0, 1e4, xtol=1e-14, rtol=1e-14)
    jeans.append({'lambda': float(lam), 'v0': float(v0), 'flux': float(flux), 'lambdaMin': float(lmin)})
out['jeans'] = jeans
out['versions'] = {'numpy': np.__version__, 'astropy_constants': c.G.reference}
json.dump(out, open(sys.argv[2], 'w'))
print('oracle done', out['milneSelf'])
