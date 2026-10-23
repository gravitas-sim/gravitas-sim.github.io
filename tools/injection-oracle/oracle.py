"""
The independent oracle for Prompt 184 (completeness by injection), run offline,
never by Gravitas.

    python -I oracle.py inputs.json results.json

Reads the frame and the plan written by make-inputs.mjs and, with numpy, scipy,
astropy and photutils, on the SAME frame and the SAME plan the tests use:

  * renders every injected source itself: a circular Gaussian of the stated FWHM
    integrated over each pixel with scipy.special.erf (a product of two
    separable pixel integrals), total electrons F; the pixels of 40 sources
    inside a 7 by 7 window are returned for the rendering check (b0)
  * injects: for every trial it adds a Poisson draw (numpy.random.Generator,
    seed in the inputs) of each pixel's expected electrons to the electrons of
    the frame (whole ADU times the gain), and detects with photutils:
    Background2D (16 pixel boxes, SigmaClip 3 sigma, 10 iterations, median
    centre, std; MedianBackground and StdBackgroundRMS; no mesh filter), the
    maps between box centres by RegularGridInterpolator (linear, the first and
    last interval continued to the border, the noise floored at half its
    smallest box value), the background-subtracted image smoothed by astropy's
    Gaussian2DKernel (effective weights, repeated edge pixel, checked against
    astropy.convolution.convolve), detect_sources on the smoothed image against
    4 times the smoothed noise (connectivity 8, 5 pixels), and SourceCatalog
    centroids of the unsmoothed background-subtracted image
  * counts: a source is recovered when a detection lies within the match radius
    of it; each detection answers at most one source (the nearest pairs first); a
    detection that answers none and is not within the match radius of one the
    blank frame already holds is extra
  * the exact binomial interval for every (k, n, level) of the inputs, as
    scipy.stats.beta.ppf (Clopper and Pearson 1934)

It writes, per trial, which injected sources were recovered and how many
detections were extra; the binning by magnitude is done by the test. Pixel
(0, 0) is the centre of the first pixel, as in photutils. Nothing here imports
Gravitas code. Run with `-I` from a directory that holds no other Python, with
the script kept apart from the data.
"""

import base64
import json
import math
import sys

import numpy as np
from astropy.convolution import Gaussian2DKernel, convolve
from astropy.stats import SigmaClip
from photutils.background import Background2D, MedianBackground, StdBackgroundRMS
from photutils.segmentation import SourceCatalog, detect_sources
from scipy.interpolate import RegularGridInterpolator
from scipy.special import erf
from scipy.stats import beta

inputs = json.load(open(sys.argv[1]))
GAIN = inputs["gain"]
W = inputs["width"]
H = inputs["height"]
FWHM = inputs["fwhm"]
ALG = inputs["algorithm"]
BOX = ALG["box"]
CLIP = ALG["clip"]
SIGMA = ALG["sigma"]
MIN_AREA = ALG["minArea"]
RADIUS = inputs["matchRadius"]
SK = FWHM / (2.0 * math.sqrt(2.0 * math.log(2.0)))

adu = np.frombuffer(base64.b64decode(inputs["frame"]["adu"]), dtype="<i2").astype(float).reshape(H, W)
base = adu * GAIN
plan = np.frombuffer(base64.b64decode(inputs["plan"]["xyF"]), dtype="<f8").reshape(-1, 3)
TRIALS = inputs["plan"]["trials"]
PER = inputs["plan"]["perTrial"]
assert plan.shape[0] == TRIALS * PER


def pixel_integral(centre, n):
    """Fraction of a Gaussian of sigma SK centred at `centre` inside each unit pixel of 0..n-1."""
    edges = np.arange(n + 1) - 0.5
    cdf = 0.5 * (1.0 + erf((edges - centre) / (SK * math.sqrt(2.0))))
    return np.diff(cdf)


def render(x, y, flux):
    return flux * np.outer(pixel_integral(y, H), pixel_integral(x, W))


def interpolate(mesh, size):
    """Bilinear between box centres; the first and last interval continued linearly to the border."""
    n = mesh.shape[0]
    centres = (np.arange(n) + 0.5) * BOX - 0.5
    f = RegularGridInterpolator((centres, centres), mesh, method="linear", bounds_error=False, fill_value=None)
    c = np.arange(size, dtype=float)
    yy, xx = np.meshgrid(c, c, indexing="ij")
    return f(np.stack([yy, xx], axis=-1))


# the smoothing weights as they land on each pixel (a repeated edge pixel counts where it is repeated)
radius = math.ceil(3.0 * SK)
size = 2 * radius + 1
kern = Gaussian2DKernel(x_stddev=SK, y_stddev=SK, x_size=size, y_size=size, mode="center")
karr = np.array(kern.array)
assert abs(karr.sum() - 1.0) < 1e-12
k1 = karr[radius, :] / karr[radius, :].sum()
Wm = np.zeros((W, W))
for i in range(W):
    for d in range(-radius, radius + 1):
        Wm[i, min(max(i + d, 0), W - 1)] += k1[d + radius]
S = Wm @ np.ones((H, W)) @ Wm.T
W2 = Wm**2
agree = 0.0


def detect(e, check=False):
    """The detections of a frame in electrons: a list of (x, y) centroids."""
    global agree
    bkg = Background2D(
        e,
        (BOX, BOX),
        filter_size=1,
        exclude_percentile=100.0,
        sigma_clip=SigmaClip(sigma=CLIP["sigma"], maxiters=CLIP["maxIterations"], cenfunc="median", stdfunc="std"),
        bkg_estimator=MedianBackground(sigma_clip=None),
        bkgrms_estimator=StdBackgroundRMS(sigma_clip=None),
    )
    level_mesh = np.array(bkg.background_mesh)
    noise_mesh = np.array(bkg.background_rms_mesh)
    level = interpolate(level_mesh, W)
    noise = np.maximum(interpolate(noise_mesh, W), 0.5 * noise_mesh.min())
    sub = e - level
    conv = (Wm @ sub @ Wm.T) / S
    var = (W2 @ noise**2 @ W2.T) / S**2
    thr = SIGMA * np.sqrt(var)
    if check:
        ref = convolve(sub, kern, boundary="extend", nan_treatment="interpolate", normalize_kernel=True, preserve_nan=False)
        agree = max(agree, float(np.max(np.abs(ref - conv))))
    segm = detect_sources(conv, thr, npixels=MIN_AREA, connectivity=8)
    if segm is None:
        return []
    cat = SourceCatalog(sub, segm)
    return [(float(cat[k].xcentroid), float(cat[k].ycentroid)) for k in range(len(cat))]


def answer(sources, found):
    """Match detections to sources, the nearest pairs first; returns the set of recovered source indices and the unused detections."""
    pairs = sorted(
        (math.hypot(sx - fx, sy - fy), i, j)
        for i, (sx, sy) in enumerate(sources)
        for j, (fx, fy) in enumerate(found)
        if math.hypot(sx - fx, sy - fy) <= RADIUS
    )
    got, used = set(), set()
    for _, i, j in pairs:
        if i in got or j in used:
            continue
        got.add(i)
        used.add(j)
    return got, [found[j] for j in range(len(found)) if j not in used]


baseline = detect(base, check=True)
rng = np.random.default_rng(inputs["oracleSeed"])
trials = []
for t in range(TRIALS):
    src = plan[t * PER : (t + 1) * PER]
    mean = np.zeros((H, W))
    for x, y, f in src:
        mean += render(x, y, f)
    e = base + rng.poisson(mean)
    found = detect(e, check=(t < 5))
    got, left = answer([(x, y) for x, y, _ in src], found)
    extra = sum(1 for fx, fy in left if not any(math.hypot(fx - bx, fy - by) <= RADIUS for bx, by in baseline))
    trials.append({"recovered": "".join("1" if i in got else "0" for i in range(PER)), "extra": extra})

# the rendering sample (b0): 7 by 7 windows of noise-free sources
half = inputs["renderSample"]["half"]
sample = []
for j in range(inputs["renderSample"]["sources"]):
    x, y, f = plan[j]
    xc, yc = int(round(x)), int(round(y))
    img = render(x, y, f)
    win = img[yc - half : yc + half + 1, xc - half : xc + half + 1]
    sample.append({"source": j, "x0": xc - half, "y0": yc - half, "values": win.ravel().tolist(), "total": float(img.sum())})

# the exact interval (b2)
intervals = []
for k, n, level in inputs["intervalCases"]:
    a = 1.0 - level
    lo = 0.0 if k == 0 else float(beta.ppf(a / 2, k, n - k + 1))
    hi = 1.0 if k == n else float(beta.ppf(1 - a / 2, k + 1, n - k))
    intervals.append([k, n, level, lo, hi])

out = {
    "format": "gravitas.injection-oracle-results/1",
    "baselineDetections": len(baseline),
    "convolveAgreement": agree,
    "trials": trials,
    "renderSample": sample,
    "intervals": intervals,
}
with open(sys.argv[2], "w") as fh:
    json.dump(out, fh)
    fh.write("\n")
print("wrote", sys.argv[2], len(trials), "trials; baseline", len(baseline), "; convolve agreement", agree)
