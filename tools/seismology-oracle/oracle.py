"""Independent oracle for the seismology gate (Roadmap III, Prompt 221).

Written from the equations in tests/fixtures/seismology-gate/thresholds.json. It imports nothing
from Gravitas: numpy for the FFT normalisation and the stochastic generator, astropy's
LombScargle for the gap periodogram, astropy.io.fits for the valid-cadence mask.

  python3 oracle.py reference OUT.json            series and spectra for legs A, B1, B2
  python3 oracle.py real SERIES.json OUT.json     astropy periodogram of a real series (B3)
  python3 oracle.py ensemble KEPLERDIR WORKDIR    the 200 + 200 + 100 synthetic series (C, D, F, G, N1, N3)
"""
import glob
import json
import os
import sys

import numpy as np

# PyYAML is not installed on this machine and astropy.table imports it at load (as for the Prompt 214
# and 220 oracles); nothing here reads YAML, so an empty module stands in. Nothing was installed.
import types

try:
    import yaml  # noqa: F401
except ModuleNotFoundError:
    sys.modules["yaml"] = types.ModuleType("yaml")

DT = 1765.5  # s
NYQ = 1e6 / (2 * DT)


def psd_fft(x, dt=DT):
    """Single-sided PSD in ppm^2/uHz, mean removed, NaN zero-filled, duty corrected."""
    x = np.asarray(x, float)
    valid = np.isfinite(x)
    n = len(x)
    nv = valid.sum()
    y = np.where(valid, x - x[valid].mean(), 0.0)
    X = np.fft.rfft(y)
    p = 2 * dt * np.abs(X) ** 2 / n * 1e-6 / (nv / n)
    if n % 2 == 0:
        p[-1] /= 2
    f = np.arange(len(X)) * 1e6 / (n * dt)
    return f[1:], p[1:]


def amp_power(t, y, freqs, dt=DT):
    """(a^2 + b^2)/2 x N_valid dt x 1e-6 from astropy's own least-squares fit of a sinusoid."""
    from astropy.timeseries import LombScargle

    y = np.asarray(y, float)
    y = y - y.mean()
    ls = LombScargle(t, y, fit_mean=False, center_data=False, nterms=1)
    out = []
    for f in freqs:
        th = ls.model_parameters(f * 1e-6)
        out.append((th[0] ** 2 + th[1] ** 2) / 2 * len(y) * dt * 1e-6)
    return np.array(out)


def cmd_reference(out):
    rng = np.random.default_rng(221001)
    res = {"dt": DT, "numpy": np.__version__}
    import astropy

    res["astropy"] = astropy.__version__
    n = 2048
    # A1: bin-centred sine, full grid
    k0 = 300
    f0 = k0 * 1e6 / (n * DT)
    tt = np.arange(n) * DT
    sine = 100 * np.sin(2 * np.pi * f0 * 1e-6 * tt + 0.7)
    f, p = psd_fft(sine)
    res["sine"] = {"n": n, "A": 100, "freq": f0, "phase": 0.7, "peak": float(p[k0 - 1]), "analytic": n * DT * 100**2 / 2 * 1e-6}
    # B1: three seeded series
    res["b1"] = []
    for i in range(3):
        x = rng.normal(0, 50, n) + 30 * np.sin(2 * np.pi * (80 + 20 * i) * 1e-6 * tt + i)
        x[rng.random(n) < 0.08 * i] = np.nan
        f, p = psd_fft(x)
        sel = np.arange(0, len(f), 7)
        res["b1"].append({"x": [None if not np.isfinite(v) else float(v) for v in x], "index": sel.tolist(), "power": p[sel].tolist()})
    # B2: gapped series at 500 frequencies (astropy)
    m = 1500
    t = np.arange(m) * DT
    keep = np.ones(m, bool)
    for s in rng.integers(0, m - 12, 12):
        keep[s : s + 12] = False
    y = rng.normal(0, 40, m) + 25 * np.sin(2 * np.pi * 123.4e-6 * t + 1.1)
    fr = np.linspace(5, 270, 500)
    res["b2"] = {"cadence": np.flatnonzero(keep).tolist(), "y": y[keep].tolist(), "freqs": fr.tolist(), "power": amp_power(t[keep], y[keep], fr).tolist()}
    # A1 gapped
    A = 100.0
    fg = 137.37
    yg = A * np.sin(2 * np.pi * fg * 1e-6 * t + 0.3)
    res["sineGapped"] = {"cadence": np.flatnonzero(keep).tolist(), "y": yg[keep].tolist(), "freq": fg, "A": A, "analytic": keep.sum() * DT * A**2 / 2 * 1e-6, "astropy": float(amp_power(t[keep], yg[keep], [fg])[0])}
    json.dump(res, open(out, "w"))


def cmd_real(series, out):
    d = json.load(open(series))
    cad = np.array(d["cadence"], float)
    y = np.array(d["y"], float)
    t = (cad - cad[0]) * DT
    fr = np.linspace(5, 270, 400)
    json.dump({"freqs": fr.tolist(), "power": amp_power(t, y, fr).tolist()}, open(out, "w"))


def mask_from_kepler(kdir, quarters):
    from astropy.io import fits

    files = sorted(glob.glob(os.path.join(kdir, "kplr*_llc.fits")))
    cads = []
    for qi in quarters:
        with fits.open(files[qi]) as h:
            d = h[1].data
            ok = (d["SAP_QUALITY"] == 0) & np.isfinite(d["PDCSAP_FLUX"]) & np.isfinite(d["TIME"])
            cads.append(d["CADENCENO"][ok])
    c = np.concatenate(cads)
    grid = np.zeros(c.max() - c.min() + 1, bool)
    grid[c - c.min()] = True
    return grid


def model_psd(f, nm, W, dnu, amp_scale=1.0, oscillate=True):
    eta2 = (np.sinc(f / (2 * NYQ))) ** 2  # np.sinc(x) = sin(pi x)/(pi x)
    a = 3382 * nm**-0.609
    b1 = 0.317 * nm**0.970
    b2 = 0.948 * nm**0.992
    k = 2 * np.sqrt(2) / np.pi
    gran = k * a**2 / b1 / (1 + (f / b1) ** 4) + k * a**2 / b2 / (1 + (f / b2) ** 4)
    p = eta2 * gran + W
    if oscillate:
        A = 39 * (nm / 155) ** -0.84 * amp_scale
        G = 0.15
        sig = 0.66 * nm**0.88 / 2.355
        eps = 0.634 + 0.63 * np.log10(dnu)
        nlo = int(np.floor((nm - 4 * sig) / dnu - eps)) - 1
        nhi = int(np.ceil((nm + 4 * sig) / dnu - eps)) + 1
        mode = np.zeros_like(f)
        for n in range(max(nlo, 1), nhi + 1):
            nu0 = dnu * (n + eps)
            for off, V in ((0.0, 1.0), (-0.121 * dnu, 0.6), (0.5 * dnu, 1.5)):
                nu = nu0 + off
                H = V**2 * A**2 / (np.pi * G) * np.exp(-((nu - nm) ** 2) / (2 * sig**2))
                mode += H / (1 + (2 * (f - nu) / G) ** 2)
        p = p + eta2 * mode
    return p


def draw_series(n, nm, W, dnu, rng, oscillate=True):
    f = np.arange(n // 2 + 1) * 1e6 / (n * DT)
    P = model_psd(f, nm, W, dnu, oscillate=oscillate)
    E = P * n / (2 * DT * 1e-6)
    X = np.sqrt(E / 2) * (rng.standard_normal(len(f)) + 1j * rng.standard_normal(len(f)))
    X[0] = 0
    X[-1] = np.sqrt(E[-1]) * rng.standard_normal()
    return np.fft.irfft(X, n=n)


def cmd_ensemble(kdir, work):
    os.makedirs(work, exist_ok=True)
    grid = mask_from_kepler(kdir, range(9, 13))[:16000]
    n = 16000
    truth = {"mask_valid": int(grid.sum()), "n": n, "ensemble": [], "dwarf": [], "domain": []}
    base = int(os.environ.get("SEISMO_SEED_BASE", 221000))
    i = 0
    for nm in (40, 70, 110, 160):
        for s in range(50):
            rng = np.random.default_rng(base + i)
            z = rng.standard_normal()
            dnu = 0.263 * nm**0.772 * (1 + 0.03 * z)
            W = (2, 6, 20)[i % 3]
            x = draw_series(n, nm, W, dnu, rng)
            x[~grid] = np.nan
            zM, zR, zT = rng.standard_normal(3)
            teff = 4800 + 150 * zT
            x.astype("<f4").tofile(os.path.join(work, f"ens-{i:03d}.f32"))
            truth["ensemble"].append({"i": i, "seed": base + i, "numax": nm, "dnu": float(dnu), "W": W, "zMass": float(zM), "zRadius": float(zR), "teffTrue": float(teff)})
            i += 1
    for j in range(200):
        rng = np.random.default_rng(base + 1000 + j)
        W = (2, 6, 20)[j % 3]
        x = draw_series(n, 3090, W, 135.1, rng, oscillate=False)
        x[~grid] = np.nan
        x.astype("<f4").tofile(os.path.join(work, f"dwarf-{j:03d}.f32"))
        truth["dwarf"].append({"i": j, "seed": base + 1000 + j, "W": W})
    for j in range(100):
        rng = np.random.default_rng(base + 2000 + j)
        nm = rng.uniform(8, 18) if j < 50 else rng.uniform(240, 270)
        dnu = 0.263 * nm**0.772
        W = (2, 6, 20)[j % 3]
        x = draw_series(n, nm, W, dnu, rng)
        x[~grid] = np.nan
        x.astype("<f4").tofile(os.path.join(work, f"domain-{j:03d}.f32"))
        truth["domain"].append({"i": j, "seed": base + 2000 + j, "numax": float(nm), "dnu": float(dnu), "W": W})
    json.dump(truth, open(os.path.join(work, "truth.json"), "w"))


if __name__ == "__main__":
    c = sys.argv[1]
    if c == "reference":
        cmd_reference(sys.argv[2])
    elif c == "real":
        cmd_real(sys.argv[2], sys.argv[3])
    elif c == "ensemble":
        cmd_ensemble(sys.argv[2], sys.argv[3])
    else:
        raise SystemExit(__doc__)
