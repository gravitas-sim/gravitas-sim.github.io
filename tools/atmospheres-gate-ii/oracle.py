"""Independent oracle for the atmospheres gate II (Prompt 201).

Written from ATMOSPHERES_GATE_II.md and thresholds.json only, without reading the kernel. Run under
`python3 -I oracle.py OUT.json` (numpy, scipy, astropy). It produces seeded inputs AND truth; the JS harness runs
the kernel on the inputs and compares. Nothing here imports Gravitas code.
"""
import json, sys, time, hashlib
import numpy as np
from scipy import integrate, special
from astropy import constants as const

K_B = const.k_B.value
H_P = const.h.value
C = const.c.value
M_U = const.u.value
SIG = const.sigma_sb.value
R_JUP = const.R_jup.value
R_SUN = const.R_sun.value
SEED = 201
FLOOR = 1e-30  # m^2, continuum floor of the synthetic absorber
GAMMA_UM = 2e-4  # Lorentz half-width, micron
EULER = 0.5772156649015329


def rng_for(tag):
    return np.random.Generator(np.random.PCG64([SEED, int(hashlib.sha1(tag.encode()).hexdigest()[:8], 16)]))


# ----------------------------------------------------------------------------- Planck and the slab
def planck_l(lam, T):
    x = H_P * C / (lam * K_B * T)
    return 2 * H_P * C ** 2 / lam ** 5 / np.expm1(x)


def band_radiance(l1, l2, T):
    """mean over [l1,l2] of B_lambda, W m^-3 sr^-1 ... per metre of wavelength; quad in ln(lambda)."""
    f = lambda u: planck_l(np.exp(u), T) * np.exp(u)
    val, _ = integrate.quad(f, np.log(l1), np.log(l2), epsabs=0, epsrel=1e-13, limit=800)
    return val / (l2 - l1)


def slab_flux_over_pi(Bd, Bs, tau):
    f = lambda mu: (Bd * np.exp(-tau / mu) + Bs * (-np.expm1(-tau / mu))) * mu if mu > 0 else Bs * 0.0
    val, _ = integrate.quad(f, 0, 1, epsabs=0, epsrel=1e-13, limit=400)
    return 2 * val


# ----------------------------------------------------------------------------- Lambert and single-scattering spheres
def _phi_limits(alpha, theta):
    """phi half-range with mu0 > 0 at polar angle theta (observer on +z, sun at angle alpha from the observer)."""
    if alpha <= 0:
        return np.pi
    if alpha >= np.pi:
        return 0.0
    ct = np.cos(theta) / max(np.sin(theta), 1e-300)
    c = -ct / np.tan(alpha)
    if c <= -1:
        return np.pi
    if c >= 1:
        return 0.0
    return np.arccos(c)


def sphere_integral(alpha, weight):
    """integral over the lit, visible hemisphere of weight(mu0, mu) * mu0 * mu / ... as the caller defines, dA = sin(theta) dtheta dphi."""
    sa, ca = np.sin(alpha), np.cos(alpha)

    def inner(theta):
        pm = _phi_limits(alpha, theta)
        if pm == 0.0:
            return 0.0
        st, ct = np.sin(theta), np.cos(theta)
        g = lambda phi: weight(sa * st * np.cos(phi) + ca * ct, ct)
        v, _ = integrate.quad(g, 0, pm, epsabs=0, epsrel=1e-12, limit=200)
        return 2 * v * st

    val, _ = integrate.quad(inner, 0, np.pi / 2, epsabs=0, epsrel=1e-11, limit=400)
    return val


def lambert_phi(alpha):
    """disc-integrated Lambert sphere, normalised to 1 at alpha = 0 (integral of mu0 mu dA = 2 pi / 3 there)."""
    return sphere_integral(alpha, lambda m0, m: m0 * m) / (2 * np.pi / 3)


def hg(theta_s, g):
    return (1 - g * g) / (1 + g * g - 2 * g * np.cos(theta_s)) ** 1.5


def single_scatter_shape(alpha, g):
    """single-scattering sphere (Chandrasekhar): intensity ~ P(Theta) mu0 / (mu0 + mu); flux shape normalised at alpha = 0."""
    w = lambda m0, m: m0 * m / (m0 + m) if (m0 + m) > 0 else 0.0
    return hg(np.pi - alpha, g) * sphere_integral(alpha, w) / (hg(np.pi, g) * sphere_integral(0.0, w))


def ls_closed(alpha):
    """Lommel-Seeliger sphere phase function (Fairbairn 2005 form), 1 at alpha = 0."""
    a = np.asarray(alpha, float)
    return 1 - np.sin(a / 2) * np.tan(a / 2) * np.log(1 / np.tan(a / 4))


# ----------------------------------------------------------------------------- transmission by ray tracing
GL_S = np.polynomial.legendre.leggauss(256)
GL_X = {n: np.polynomial.legendre.leggauss(n) for n in (240, 600)}


def density_ratio(r, Rp, H, mode):
    if mode == 'const':
        return np.exp(-(r - Rp) / H)
    return np.exp(-(Rp / H) * (1 - Rp / r))  # g = GM/r^2 hydrostatic isothermal


def path_integral(b, Rp, H, mode):
    """I(b) = 2 integral_0^inf n(sqrt(b^2+s^2))/n0 ds, exact chord, Gauss-Legendre in s."""
    if mode == 'const':
        rmax = Rp + 48 * H
    else:
        rmax = Rp / (1 - 48 * H / Rp)
    smax = np.sqrt(np.maximum(rmax ** 2 - b ** 2, 0.0))
    nodes, w = GL_S
    s = 0.5 * smax[:, None] * (nodes[None, :] + 1)
    r = np.sqrt(b[:, None] ** 2 + s ** 2)
    f = density_ratio(r, Rp, H, mode)
    return 2 * 0.5 * smax * (f * w[None, :]).sum(axis=1)


def depth(Rp, Rs, T, mu, g, P0, X, sigmas, mode='inv2', deck=None, nx=240):
    """transit depth by exact ray tracing; sigmas = line-by-line cross-section samples (m^2), averaged uniformly."""
    H = K_B * T / (mu * M_U * g)
    n0 = P0 / (K_B * T)
    smax_ = float(np.max(sigmas))
    tau0 = smax_ * X * n0 * path_integral(np.array([Rp]), Rp, H, mode)[0]
    xmax = min(48.0, max(8.0, np.log(max(tau0, 1.0) / 1e-14) + 2.0))
    x0 = 0.0 if deck is None else deck / H
    if x0 >= xmax:
        xmax = x0 + 10
    nodes, w = GL_X[nx]
    x = x0 + 0.5 * (xmax - x0) * (nodes + 1)
    wx = 0.5 * (xmax - x0) * w
    b = Rp + x * H
    I = path_integral(b, Rp, H, mode)
    tau = (X * n0) * I[:, None] * sigmas[None, :]
    absorbed = 1 - np.exp(-tau).mean(axis=1)
    base = Rp if deck is None else Rp + deck
    area = base ** 2 + 2 * H * np.sum(wx * b * absorbed)
    return area / Rs ** 2


def zeff(delta, Rp, Rs):
    return Rs * np.sqrt(delta) - Rp


# ----------------------------------------------------------------------------- the synthetic absorber
BANDS = {'strong': (1.30, 1.40, 360), 'weak': (1.40, 1.50, 40), 'window': (1.55, 1.65, 0)}


def synthetic_absorber(npts=10000):
    r = rng_for('absorber')
    out = {'floor': FLOOR, 'halfWidthMicron': GAMMA_UM, 'bands': {}}
    for name, (a, b, n) in BANDS.items():
        lam = np.linspace(a, b, npts)
        centres = r.uniform(a, b, n)
        peaks = 10 ** r.uniform(-28, -24, n)
        sig = np.full(npts, FLOOR)
        for c0, p in zip(centres, peaks):
            sig += p * GAMMA_UM ** 2 / ((lam - c0) ** 2 + GAMMA_UM ** 2)
        out['bands'][name] = {'lambdaMicron': [a, b], 'lines': n, 'centres': centres.tolist(), 'peaks': peaks.tolist(), 'sigma': sig}
    return out


def draw_atmosphere(r):
    while True:
        T = r.uniform(500, 3000)
        mu = r.uniform(2.2, 4.0)
        g = np.exp(r.uniform(np.log(5), np.log(30)))
        Rp = r.uniform(0.8, 1.6) * R_JUP
        Rs = r.uniform(0.6, 1.4) * R_SUN
        P0 = np.exp(r.uniform(np.log(1e4), np.log(1e6)))  # 0.1 to 10 bar in Pa
        X = np.exp(r.uniform(np.log(1e-5), np.log(1e-2)))
        H = K_B * T / (mu * M_U * g)
        if H / Rp <= 0.01:
            return dict(T=T, mu=mu, g=g, Rp=Rp, Rs=Rs, P0=P0, X=X, H=H)


# ----------------------------------------------------------------------------- the checks' truth
def run(out_path):
    t0 = time.time()
    res = {'format': 'gravitas.atmospheres-gate-ii-oracle/1', 'seed': SEED}
    res['constants'] = {'k': K_B, 'h': H_P, 'c': C, 'mu': M_U, 'sigma': SIG, 'RJup': R_JUP, 'RSun': R_SUN}

    # self-tests of the oracle itself
    st = {}
    st['lambertAt0'] = lambert_phi(0.0)
    st['lambertAtHalfPi'] = lambert_phi(np.pi / 2) * 1.0 - 1 / np.pi
    st['lambertAtPi'] = lambert_phi(np.pi)
    al = np.array([0.3, 1.0, 2.0, 2.9])
    st['lommelSeeligerClosedVsNumeric'] = float(np.max(np.abs(np.array([single_scatter_shape(a, 0.0) for a in al]) - ls_closed(al))))
    # constant-g, pure exponential: closed-form chord integral check I(Rp) ~ sqrt(2 pi Rp H) (1 + 3H/8Rp)
    Rp_, H_ = 7e7, 5e5
    st['chordVsBessel'] = float(path_integral(np.array([Rp_]), Rp_, H_, 'const')[0] / (2 * Rp_ * special.k1e(Rp_ / H_)) - 1)
    # grid convergence of the depth (240 against 600 nodes), five draws
    r = rng_for('selftest')
    sig = synthetic_absorber(2000)['bands']['strong']['sigma']
    conv = []
    for _ in range(5):
        a = draw_atmosphere(r)
        d1 = depth(a['Rp'], a['Rs'], a['T'], a['mu'], a['g'], a['P0'], a['X'], np.array(sig), 'inv2', nx=240)
        d2 = depth(a['Rp'], a['Rs'], a['T'], a['mu'], a['g'], a['P0'], a['X'], np.array(sig), 'inv2', nx=600)
        conv.append(abs(d1 - d2) / (d2 - (a['Rp'] / a['Rs']) ** 2))
    st['depthGridConvergence'] = max(conv)
    res['selfTest'] = st

    # E1 Planck
    r = rng_for('E1')
    e1 = []
    for _ in range(400):
        T = np.exp(r.uniform(np.log(200), np.log(10000)))
        l1 = r.uniform(0.3, 29.0) * 1e-6
        l2 = min(30e-6, l1 + max(0.01e-6, r.uniform(0.01, 29.7) * 1e-6 * r.uniform(0, 1)))
        l2 = max(l2, l1 + 0.01e-6)
        e1.append({'T': T, 'l1': l1, 'l2': l2, 'B': band_radiance(l1, l2, T)})
    res['E1'] = {'points': e1,
                 'fullBand': [{'T': T, 'l1': 1e-9, 'l2': 1e-1, 'expected': SIG * T ** 4 / np.pi / (1e-1 - 1e-9)} for T in (300.0, 1000.0, 2500.0, 5800.0, 9000.0)]}

    # E2 eclipse depth: independent formula with quad band radiances
    r = rng_for('E2')
    e2 = []
    for _ in range(1000):
        Tp = r.uniform(500, 3000); Ts = r.uniform(4000, 7000); k = r.uniform(0.03, 0.16)
        l1 = r.uniform(0.5, 10) * 1e-6; l2 = l1 * r.uniform(1.05, 1.6)
        Ag = r.uniform(0, 0.6); aR = r.uniform(4, 25)
        e2.append({'Tp': Tp, 'Ts': Ts, 'k': k, 'l1': l1, 'l2': l2, 'Ag': Ag, 'aR': aR,
                   'depth': k ** 2 * band_radiance(l1, l2, Tp) / band_radiance(l1, l2, Ts) + Ag / aR ** 2})
    res['E2'] = e2

    # E3 slab
    r = rng_for('E3')
    e3 = []
    for _ in range(300):
        tau = 10 ** r.uniform(-4, 2)
        Tp = r.uniform(800, 2800); l1 = r.uniform(1, 8) * 1e-6; l2 = l1 * 1.2
        Bd = band_radiance(l1, l2, Tp); Bs = band_radiance(l1, l2, Tp / 2 ** 0.25)
        e3.append({'tau': tau, 'Tp': Tp, 'l1': l1, 'l2': l2, 'Bd': Bd, 'Bs': Bs, 'F': slab_flux_over_pi(Bd, Bs, tau)})
    res['E3'] = e3

    # E4 Lambert surface integral at 181 angles, and the phase integral
    alphas = np.linspace(0, np.pi, 181)
    res['E4'] = {'alpha': alphas.tolist(), 'phi': [lambert_phi(a) for a in alphas]}

    # phase-curve grid for E5 / N1
    grid = 0.1 + (3.04 - 0.1) * np.arange(24) / 23
    res['phaseGrid'] = {'alpha': grid.tolist(),
                        'lambert': [lambert_phi(a) for a in grid],
                        'lommel-seeliger': [single_scatter_shape(a, 0.0) for a in grid],
                        'hg+0.3': [single_scatter_shape(a, 0.3) for a in grid],
                        'hg-0.3': [single_scatter_shape(a, -0.3) for a in grid]}

    # E6 brightness temperature truth
    r = rng_for('E6')
    e6 = []
    for _ in range(2000):
        Tp = r.uniform(800, 2800); Ts = r.uniform(4500, 6500); k = r.uniform(0.05, 0.15)
        l1, l2 = 3.6e-6, 4.5e-6
        e6.append({'Tp': Tp, 'Ts': Ts, 'k': k, 'l1': l1, 'l2': l2,
                   'depth': k ** 2 * band_radiance(l1, l2, Tp) / band_radiance(l1, l2, Ts)})
    res['E6'] = e6

    # synthetic absorber
    ab = synthetic_absorber()
    res['absorber'] = {n: {k2: v for k2, v in d.items() if k2 != 'sigma'} for n, d in ab['bands'].items()}
    res['absorber']['_floor'] = FLOOR
    sigma = {n: np.array(d['sigma']) for n, d in ab['bands'].items()}
    res['absorberSigma'] = {n: sigma[n].tolist() for n in sigma}  # kept for the harness

    # X1: analytic closed form, H = 1
    taus = 10 ** np.linspace(-2, 8, 20)
    res['X1'] = {'tau0': taus.tolist(), 'integral': [float(special.exp1(t) + np.log(t) + EULER) for t in taus]}

    # X2 single wavelength, constant g, 200 draws; bands, constant g
    r = rng_for('X2')
    x2s = []
    for _ in range(200):
        a = draw_atmosphere(r)
        sg = 10 ** r.uniform(-29, -25)
        d = depth(a['Rp'], a['Rs'], a['T'], a['mu'], a['g'], a['P0'], a['X'], np.array([sg]), 'const')
        x2s.append({**a, 'sigma': sg, 'delta': d})
    res['X2single'] = x2s
    x2b = []
    for _ in range(200):
        a = draw_atmosphere(r)
        row = {**a, 'delta': {}}
        for n in BANDS:
            row['delta'][n] = depth(a['Rp'], a['Rs'], a['T'], a['mu'], a['g'], a['P0'], a['X'], sigma[n], 'const')
        x2b.append(row)
    res['X2bands'] = x2b

    # X3 regime: g(r) = GM/r^2, 2000 draws, three bands
    r = rng_for('X3')
    x3 = []
    for i in range(2000):
        a = draw_atmosphere(r)
        row = {**a, 'delta': {}}
        for n in BANDS:
            row['delta'][n] = depth(a['Rp'], a['Rs'], a['T'], a['mu'], a['g'], a['P0'], a['X'], sigma[n], 'inv2')
        x3.append(row)
    res['X3'] = x3

    # X4: scale height from strong - weak difference; keep draws whose true difference is at least 10 sigma_diff
    r = rng_for('X4')
    sdiff = np.sqrt(2) * 30e-6
    x4 = []
    tried = 0
    while len(x4) < 2000 and tried < 20000:
        tried += 1
        a = draw_atmosphere(r)
        ds = depth(a['Rp'], a['Rs'], a['T'], a['mu'], a['g'], a['P0'], a['X'], sigma['strong'], 'inv2')
        dw = depth(a['Rp'], a['Rs'], a['T'], a['mu'], a['g'], a['P0'], a['X'], sigma['weak'], 'inv2')
        if ds - dw >= 10 * sdiff:
            x4.append({**a, 'strong': ds, 'weak': dw})
    res['X4'] = {'draws': x4, 'candidates': tried, 'sigmaDiff': sdiff}

    # X6 cloud deck above both bands (4 H above the strong band's effective height), 500 draws
    r = rng_for('X6')
    x6 = []
    for _ in range(500):
        a = draw_atmosphere(r)
        ds0 = depth(a['Rp'], a['Rs'], a['T'], a['mu'], a['g'], a['P0'], a['X'], sigma['strong'], 'inv2')
        zc = max(zeff(ds0, a['Rp'], a['Rs']), 0) + 4 * a['H']
        row = {**a, 'deck': zc}
        for n in ('strong', 'weak'):
            row[n] = depth(a['Rp'], a['Rs'], a['T'], a['mu'], a['g'], a['P0'], a['X'], sigma[n], 'inv2', deck=zc)
        x6.append(row)
    res['X6'] = x6

    # Z1 reported cases: use 100 draws; the deck-only-on-strong case places the deck between the two effective heights
    r = rng_for('Z1')
    z1 = []
    for _ in range(100):
        a = draw_atmosphere(r)
        ds0 = depth(a['Rp'], a['Rs'], a['T'], a['mu'], a['g'], a['P0'], a['X'], sigma['strong'], 'inv2')
        dw0 = depth(a['Rp'], a['Rs'], a['T'], a['mu'], a['g'], a['P0'], a['X'], sigma['weak'], 'inv2')
        zs, zw = zeff(ds0, a['Rp'], a['Rs']), zeff(dw0, a['Rp'], a['Rs'])
        row = {**a, 'strong': ds0, 'weak': dw0}
        if zs > zw > 0:
            zc = 0.5 * (zs + zw)
            row['deckBetween'] = zc
            for n in ('strong', 'weak'):
                row['deck_' + n] = depth(a['Rp'], a['Rs'], a['T'], a['mu'], a['g'], a['P0'], a['X'], sigma[n], 'inv2', deck=zc)
        # a linear temperature gradient: T(z) = T (1 + f z / (5 H)), hydrostatic with g = const; plus and minus 10 percent
        for f, key in ((0.1, 'gradient+10'), (-0.1, 'gradient-10')):
            row[key] = {n: depth_gradient(a, sigma[n], f) for n in ('strong', 'weak')}
        z1.append(row)
    res['Z1'] = z1

    res['elapsedSeconds'] = time.time() - t0
    with open(out_path, 'w') as fh:
        json.dump(res, fh, allow_nan=False)
    print('oracle done', round(time.time() - t0, 1), 's;', 'selftest', json.dumps(st))


def depth_gradient(a, sigmas, f, nx=240):
    """isothermal-violating truth: T(z) = T0 (1 + f z/(5 H0)), constant g, hydrostatic: n(z) = n0 (T0/T) exp(-int dz/H(z))."""
    Rp, Rs, T0, mu, g, P0, X, H0 = (a[k] for k in ('Rp', 'Rs', 'T', 'mu', 'g', 'P0', 'X', 'H'))
    n0 = P0 / (K_B * T0)
    # n(z)/n0 = (T0/T(z)) * exp(-int_0^z dz'/H(z')), H(z)=H0*T(z)/T0, T(z)/T0 = 1 + f z/(5 H0) =: 1 + q z
    q = f / (5 * H0)

    def nratio(z):
        Tz = 1 + q * z
        return (1 / Tz) * np.exp(-(1 / (H0 * q)) * np.log(Tz)) if abs(q) > 1e-30 else np.exp(-z / H0)

    # path integral by Gauss-Legendre in s as before, with the density above
    def I_of_b(b):
        zmax = 48 * H0
        rmax = Rp + zmax
        smax = np.sqrt(np.maximum(rmax ** 2 - b ** 2, 0.0))
        nodes, w = GL_S
        s = 0.5 * smax[:, None] * (nodes[None, :] + 1)
        r = np.sqrt(b[:, None] ** 2 + s ** 2)
        z = np.maximum(r - Rp, 0)
        if f < 0:
            z = np.minimum(z, 0.95 / (-q))  # keep T positive
        return 2 * 0.5 * smax * (nratio(z) * w[None, :]).sum(axis=1)

    smax_ = float(np.max(sigmas))
    tau0 = smax_ * X * n0 * I_of_b(np.array([Rp]))[0]
    xmax = min(48.0, max(8.0, np.log(max(tau0, 1.0) / 1e-14) + 2.0))
    nodes, w = GL_X[nx]
    x = 0.5 * xmax * (nodes + 1)
    wx = 0.5 * xmax * w
    b = Rp + x * H0
    I = I_of_b(b)
    tau = (X * n0) * I[:, None] * sigmas[None, :]
    absorbed = 1 - np.exp(-tau).mean(axis=1)
    return (Rp ** 2 + 2 * H0 * np.sum(wx * b * absorbed)) / Rs ** 2


if __name__ == '__main__':
    run(sys.argv[1])
