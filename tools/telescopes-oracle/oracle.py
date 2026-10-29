"""Independent oracle for Prompt 208 (telescopes and resolution), TELESCOPES.md.

Run under `python3 -I oracle.py OUT.json` (numpy and scipy). Nothing here imports Gravitas code and nothing reads it. It
writes the reference values the JavaScript validator compares the kernel with:

  A4  the obstructed Airy intensity from scipy.special.j1 at 400 radii, the first dark ring (brentq) and the encircled
      energy inside it (scipy.integrate.quad) for obstructions 0.1, 0.2, 0.3, 0.5
  A5  the Moffat normalisation (quad to infinity) and encircled energy at five radii for four betas
  A6  the midpoint intensity of two equal Airy patterns at 0.3, 1.0 and 1.6 of the Rayleigh angle
  B1  the diffraction pattern of a sampled binary annular pupil by numpy FFT (Fraunhofer diffraction, no Bessel
      function), azimuthally averaged, at two apertures: its profile and its encircled energy
  B2  the same pattern convolved with a sampled Moffat profile by two-dimensional FFT: the combined profile, FWHM and
      encircled energy

Seed 208 (only the azimuthal sample offsets use it).
"""
import json, sys, time
import numpy as np
from scipy import integrate, optimize, special as sp
from scipy.ndimage import map_coordinates, spline_filter

ARCSEC = 206264.80624709636
SEED = 208
rng = np.random.Generator(np.random.PCG64(SEED))


def r15(x):
    """Round to 15 significant digits, recursively."""
    if isinstance(x, (float, np.floating)):
        return float(f"{float(x):.15g}")
    if isinstance(x, (list, tuple)):
        return [r15(v) for v in x]
    if isinstance(x, np.ndarray):
        return [r15(v) for v in x.tolist()]
    if isinstance(x, dict):
        return {k: r15(v) for k, v in x.items()}
    return x


# --------------------------------------------------------------------------- closed forms (scipy)
def airy(x, e):
    x = np.asarray(x, dtype=float)
    out = np.ones_like(x)
    nz = x != 0
    a = 2 * sp.j1(x[nz]) / x[nz]
    b = 2 * sp.j1(e * x[nz]) / (e * x[nz]) if e > 0 else 0.0
    out[nz] = ((a - e * e * b) / (1 - e * e)) ** 2
    return out


def first_ring(e):
    f = lambda x: sp.j1(x) - e * sp.j1(e * x)
    xs = np.linspace(0.5, 12, 2301)
    v = f(xs)
    k = np.where(np.sign(v[:-1]) * np.sign(v[1:]) < 0)[0][0]
    return optimize.brentq(f, xs[k], xs[k + 1], xtol=1e-14, rtol=1e-14)


def ee_x(x, e):
    """Encircled energy inside x: int_0^x I t dt / (2 / (1 - e^2)); the denominator is energy conservation (checked)."""
    num, _ = integrate.quad(lambda t: float(airy(np.array([t]), e)[0]) * t, 0, x, epsabs=0, epsrel=1e-13, limit=400)
    return num / (2 / (1 - e * e))


def a4():
    out = {}
    for e in (0.1, 0.2, 0.3, 0.5):
        x = np.linspace(0.0, 40.0, 400)
        ring = first_ring(e)
        out[str(e)] = {"x": x, "intensity": airy(x, e), "ring": ring, "eeRing": ee_x(ring, e)}
    # energy conservation, for the record: int to 400 of I t dt against 2/(1-e^2)
    chk = {}
    for e in (0.0, 0.3):
        num = 0.0
        edges = np.linspace(0, 400, 201)
        for lo, hi in zip(edges[:-1], edges[1:]):
            num += integrate.fixed_quad(lambda t: airy(t, e) * t, lo, hi, n=64)[0]
        chk[str(e)] = {"integral": num, "expected": 2 / (1 - e * e), "tailEstimate": 2 / (1 - e * e) * 0 + (2 / np.pi) / 400}
    out["energyCheck"] = chk
    return out


def a5():
    out = {}
    for beta in (1.5, 2.5, 4.765, 10):
        norm, _ = integrate.quad(lambda r: 2 * np.pi * r * (beta - 1) / np.pi * (1 + r * r) ** (-beta), 0, np.inf,
                                 epsabs=0, epsrel=1e-13, limit=400)
        radii = [0.5, 1.0, 2.0, 4.0, 8.0]
        ee = [integrate.quad(lambda r: 2 * np.pi * r * (beta - 1) / np.pi * (1 + r * r) ** (-beta), 0, R,
                             epsabs=0, epsrel=1e-13, limit=400)[0] for R in radii]
        out[str(beta)] = {"normalisation": norm, "radii": radii, "ee": ee}
    return out


def a6():
    x1 = sp.jn_zeros(1, 1)[0]
    out = {}
    for f in (0.3, 1.0, 1.6):
        sep = f * x1  # in x units
        mid = 2 * float(airy(np.array([sep / 2]), 0.0)[0])
        # the sum's peak is on the stars (centres) when separated enough; report the sum at a star too
        star = float(airy(np.array([0.0]), 0.0)[0] + airy(np.array([sep]), 0.0)[0])
        out[str(f)] = {"midpoint": mid, "atStar": star}
    return out


# --------------------------------------------------------------------------- pupil FFT (B1, B2)
def pupil(n_p, eps, ss=8):
    c = (np.arange(n_p * ss) + 0.5) / (n_p * ss) * 2 - 1
    X, Y = np.meshgrid(c, c)
    R = np.hypot(X, Y)
    m = ((R <= 1) & (R >= eps)).astype(float).reshape(n_p, ss, n_p, ss).mean(axis=(1, 3))
    # Binary: a pixel is open when more than half of it is. (A gray, anti-aliased edge makes the amplitude
    # transmission differ from the intensity's and biased the encircled energy by 2e-3 in the first run.)
    return (m >= 0.5).astype(float)


def pupil_psf(n_p, N, eps):
    P = np.zeros((N, N))
    P[:n_p, :n_p] = pupil(n_p, eps)
    F = np.fft.fft2(P)
    I = np.abs(F) ** 2
    return I / I[0, 0]  # peak 1 at the origin (unshifted layout), total energy conserved by Parseval


def radial_profile(I, scale, radii):
    """Azimuthal mean of I (unshifted layout, centre at index 0, wrap-around) at radii in grid units (cubic spline)."""
    N = I.shape[0]
    coef = spline_filter(I, order=3, mode="grid-wrap")  # once: the spline coefficients
    out = []
    for r in radii:
        n = max(64, int(2 * np.pi * r * 2))
        a = np.linspace(0, 2 * np.pi, n, endpoint=False) + rng.uniform(0, 2 * np.pi / n)
        xs = (r * np.cos(a)) % N
        ys = (r * np.sin(a)) % N
        out.append(map_coordinates(coef, [ys, xs], order=3, mode="grid-wrap", prefilter=False).mean())
    return np.array(out)


def encircled(I, centre_unshifted_total, R_grid, ss=4):
    """Energy inside radius R_grid (grid units) over the total, pixel sum with a sub-pixel boundary."""
    N = I.shape[0]
    idx = np.fft.fftfreq(N, d=1.0 / N)  # signed pixel offsets 0, 1, ..., -1
    X, Y = np.meshgrid(idx, idx)
    h = (np.arange(ss) + 0.5) / ss - 0.5
    cnt = np.zeros_like(I)
    for dx in h:
        for dy in h:
            cnt += (np.hypot(X + dx, Y + dy) <= R_grid)
    cnt /= ss * ss
    return float((I * cnt).sum() / I.sum())


def fwhm_of(radii, prof):
    half = prof[0] / 2
    k = np.where(prof <= half)[0][0]
    t = (prof[k - 1] - half) / (prof[k - 1] - prof[k])
    return 2 * (radii[k - 1] + t * (radii[k] - radii[k - 1]))


APERTURES = {
    "A": {"D": 0.25, "eps": 0.0, "lam": 550e-9, "seeing": 1.2},
    "B": {"D": 1.0, "eps": 0.30, "lam": 700e-9, "seeing": 0.6},
}
BETA = 4.765
N_P, N_FFT = 256, 4096  # pupil samples across the diameter, FFT size: 1/16 lambda/D per pixel, 256 lambda/D field


def b1_b2():
    out = {"B1": {}, "B2": {}}
    step = N_P / N_FFT  # lambda/D per pixel
    for name, a in APERTURES.items():
        I = pupil_psf(N_P, N_FFT, a["eps"])
        lamD = a["lam"] / a["D"] * ARCSEC  # arcsec
        # B1: profile at 0..8 lambda/D (step 0.1) and energy inside 1, 2, 3, 5 lambda/D
        rl = np.round(np.arange(0, 8.0001, 0.1), 10)
        prof = radial_profile(I, step, rl / step)
        ee_r = [1.0, 2.0, 3.0, 5.0]
        ee = [encircled(I, None, r / step) for r in ee_r]
        out["B1"][name] = {"apertureM": a["D"], "obstruction": a["eps"], "wavelengthM": a["lam"], "lambdaOverDArcsec": lamD,
                           "radiiLamD": rl, "profile": prof, "eeRadiiLamD": ee_r, "ee": ee}
        # B2: convolve with a Moffat of the stated FWHM (arcsec), sampled on the same grid
        fw = a["seeing"] / lamD / step  # FWHM in pixels
        alpha = fw / (2 * np.sqrt(2 ** (1 / BETA) - 1))
        idx = np.fft.fftfreq(N_FFT, d=1.0 / N_FFT)
        X, Y = np.meshgrid(idx, idx)
        M = (1 + (X * X + Y * Y) / alpha ** 2) ** (-BETA)
        M /= M.sum()
        C = np.real(np.fft.ifft2(np.fft.fft2(I / I.sum()) * np.fft.fft2(M)))
        C = C / C[0, 0]
        # radial profile on a fine grid, FWHM by interpolation, then the pinned radii in units of the combined FWHM
        fine = np.arange(0, 2.5 * fw + 1, 0.25)
        fine = fine[fine < N_FFT / 4]
        pf = radial_profile(C, step, fine)
        F = fwhm_of(fine, pf)  # pixels
        radii_fwhm = np.round(np.arange(0, 3.0001, 0.05), 10)
        pr = radial_profile(C, step, radii_fwhm * F)
        eeF = [1.0, 2.0, 3.0]
        ees = [encircled(C, None, f * F) for f in eeF]
        out["B2"][name] = {"apertureM": a["D"], "obstruction": a["eps"], "wavelengthM": a["lam"],
                           "seeingArcsec": a["seeing"], "beta": BETA, "fwhmArcsec": F * step * lamD,
                           "radiiFwhm": radii_fwhm, "radiiArcsec": radii_fwhm * F * step * lamD, "profile": pr,
                           "eeRadiiFwhm": eeF, "ee": ees}
    return out


if __name__ == "__main__":
    t0 = time.time()
    res = {
        "format": "gravitas.telescopes-oracle-results/1",
        "oracle": f"numpy {np.__version__}, scipy {__import__('scipy').__version__}",
        "seed": SEED,
        "pupil": {"samples": N_P, "fft": N_FFT, "pupilPixel": "open when more than half covered (8 x 8 sub-samples decide)", "lambdaOverDPerPixel": N_P / N_FFT},
        "constants": {"arcsecPerRadian": ARCSEC},
        "A4": a4(),
        "A5": a5(),
        "A6": a6(),
        **b1_b2(),
    }
    res["seconds"] = round(time.time() - t0, 1)
    with open(sys.argv[1], "w") as f:
        json.dump(r15(res), f, separators=(",", ":"))
    print("wrote", sys.argv[1], res["seconds"], "s")
