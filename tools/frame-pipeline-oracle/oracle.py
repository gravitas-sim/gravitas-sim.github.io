"""
The independent oracle for Prompt 185 (the frame pipeline), run offline, never
by Gravitas.

    python -I oracle.py inputs.json results.json

Reads the raw frames and the calibration set written by make-inputs.mjs (whole
detector counts) and, with numpy, scipy, astropy and photutils, reduces the
sequence by the standard recipe of CCD photometry (Howell, Handbook of CCD
Astronomy) without any Gravitas code:

  * masters: the bias is the numpy median of the bias frames; the dark the median
    of the bias-subtracted darks (counts at the dark exposure); the flat the mean
    of the flats less the bias and the scaled dark, divided by its own mean
  * each frame: (raw - bias - exposure / dark exposure x dark) / flat, in counts,
    times the gain, in electrons
  * the pointing: the shift of each frame from the first by an FFT
    cross-correlation of the Gaussian-smoothed star fields (scipy.signal.
    fftconvolve, scipy.ndimage.gaussian_filter) with a parabolic sub-pixel peak;
    a translation only, so the field's small turn is not modelled
  * photometry: photutils CircularAperture with method 'exact', and a sky from a
    CircularAnnulus through ApertureStats (sum_method center, a 3 sigma clip,
    5 iterations, astropy SigmaClip, the mean of what remains); net electrons =
    aperture sum - sky x the exact area; the stars at their true reference
    positions plus the shift
  * the differential magnitude of the target against the comparison stars
    summed: -2.5 log10 (F_target / sum F_comparison); the same for the check star
  * the sinusoid: astropy LombScargle (floating mean) over the same period limits
    as the Gravitas run (4 median cadences to half the baseline) on a fine
    frequency grid, with model_parameters at the peak

It writes the differential light curves, the shifts, the fit, and three
calibrated frames (electrons, float64 little-endian, base64) for the calibration
check. Nothing here imports Gravitas code. Run with `-I` from a directory that
holds no other Python, with the script kept apart from the data.
"""

import base64
import json
import sys
import zlib

import numpy as np
from astropy.stats import SigmaClip
from astropy.timeseries import LombScargle
from photutils.aperture import (
    ApertureStats,
    CircularAnnulus,
    CircularAperture,
    aperture_photometry,
)
from scipy.ndimage import gaussian_filter
from scipy.signal import fftconvolve

inp = json.load(open(sys.argv[1]))
W, H = inp["width"], inp["height"]
GAIN = inp["gain"]
EXP = inp["exposure"]


def decode(b64):
    raw = zlib.decompress(base64.b64decode(b64))
    return np.frombuffer(raw, dtype="<u2").astype(np.float64).reshape(H, W)


bias = np.median(np.stack([decode(b) for b in inp["bias"]]), axis=0)
dark_stack = np.stack([decode(b) - bias for b in inp["dark"]])
dark = np.median(dark_stack, axis=0)  # counts at darkExposure
dexp = inp["darkExposure"]
fexp = inp["flatExposure"]
flat_raw = np.mean(
    np.stack([decode(b) - bias - (fexp / dexp) * dark for b in inp["flat"]]), axis=0
)
flat = flat_raw / np.mean(flat_raw)

frames = []
for b in inp["frames"]:
    counts = (decode(b) - bias - (EXP / dexp) * dark) / flat
    frames.append(counts * GAIN)  # electrons

# the pointing
def smooth(img):
    return gaussian_filter(img - np.median(img), 1.5)


def peak_shift(ref, img):
    a, b = smooth(ref), smooth(img)
    cc = fftconvolve(b, a[::-1, ::-1], mode="full")
    iy, ix = np.unravel_index(np.argmax(cc), cc.shape)

    def sub(m, c, p):
        d = m - 2 * c + p
        return 0.5 * (m - p) / d if d != 0 else 0.0

    dy = (iy - (H - 1)) + sub(cc[iy - 1, ix], cc[iy, ix], cc[iy + 1, ix])
    dx = (ix - (W - 1)) + sub(cc[iy, ix - 1], cc[iy, ix], cc[iy, ix + 1])
    return float(dx), float(dy)


shifts = [[0.0, 0.0]] + [list(peak_shift(frames[0], f)) for f in frames[1:]]

stars = {s["id"]: (s["x"], s["y"]) for s in inp["stars"]}
ap = inp["aperture"]
clip = SigmaClip(sigma=3, maxiters=5)


def net_flux(data, pos):
    aperture = CircularAperture([pos], r=ap["r"])
    annulus = CircularAnnulus([pos], r_in=ap["rIn"], r_out=ap["rOut"])
    total = aperture_photometry(data, aperture, method="exact")["aperture_sum"][0]
    sky = ApertureStats(data, annulus, sum_method="center", sigma_clip=clip).mean[0]
    return float(total - sky * aperture.area)


flux = {sid: [] for sid in stars}
for k, f in enumerate(frames):
    for sid, (x, y) in stars.items():
        flux[sid].append(net_flux(f, (x + shifts[k][0], y + shifts[k][1])))
flux = {k: np.array(v) for k, v in flux.items()}
ens = sum(flux[c] for c in inp["comparison"])
dm = -2.5 * np.log10(flux[inp["target"]] / ens)
chk = -2.5 * np.log10(flux[inp["check"]] / ens)

t = np.array(inp["times"])
base = t[-1] - t[0]
cad = float(np.median(np.diff(t)))
fmin, fmax = 1 / (base / 2), 1 / (4 * cad)
freq = np.linspace(fmin, fmax, 400001)
ls = LombScargle(t, dm)
power = ls.power(freq)
f_best = freq[int(np.argmax(power))]
theta = ls.model_parameters(f_best)
fit = {
    "period": float(1 / f_best),
    "amplitude": float(np.hypot(theta[1], theta[2])),
    "offset": float(theta[0]),
}

pinned = {}
for k in (0, 17, 47):
    pinned[str(k)] = base64.b64encode(frames[k].astype("<f8").tobytes()).decode()

json.dump(
    {
        "format": "gravitas.frame-pipeline-oracle-results/1",
        "prompt": 185,
        "dm": [float(v) for v in dm],
        "check": [float(v) for v in chk],
        "shifts": shifts,
        "fit": fit,
        "calibratedFrames": pinned,
    },
    open(sys.argv[2], "w"),
)
