"""
The independent oracle for Prompt 183 (source detection and PSF measurement),
run offline, never by Gravitas.

    python -I oracle.py inputs.json results.json

Reads the frames written by make-inputs.mjs and computes, with photutils (and
astropy, numpy, scipy), on the SAME pixels the tests use:

  * the background and noise meshes: photutils.background.Background2D, 16 pixel
    boxes, astropy SigmaClip(3 sigma, 10 iterations, median centre, std),
    MedianBackground and StdBackgroundRMS, no mesh filter, masked pixels left
    out; the maps between the box centres by scipy.interpolate.RegularGridInterpolator
    (linear, extrapolating the first and last interval to the border)
  * the smoothed image and its noise: a Gaussian2DKernel (astropy, mode center,
    sum 1) applied as effective weights (a repeated edge pixel counted where it
    lands, a masked pixel removed and the weights renormalised), checked against
    astropy.convolution.convolve (boundary 'extend', NaN treatment 'interpolate');
    the smoothed noise sqrt(sum w^2 sigma^2) from the same weights
  * the segmentation: photutils.segmentation.detect_sources on the smoothed
    image against a threshold map, connectivity 8, minimum area, mask
  * the source properties: photutils.segmentation.SourceCatalog on the
    background-subtracted, unsmoothed image (area, centroid, second moments,
    ellipticity, orientation, maximum, segment flux)
  * the Gaussian FWHM: photutils.psf.fit_fwhm (CircularGaussianPRF) on a square
    of pixels about each isolated bright source, unweighted, background zero
  * the Moffat FWHM and beta: scipy.optimize.least_squares ('trf' with bounds that
    are not active at the solution, tolerances 1e-15) over photutils.psf.MoffatPSF, each pixel the mean of 5 by 5
    sub-pixel midpoints

Pixel (0, 0) is the centre of the first pixel, as in photutils. Nothing here
imports Gravitas code. Run with `-I` from a directory that holds no other
Python, with the script kept apart from the data.
"""

import base64
import hashlib
import json
import math
import sys

import numpy as np
from astropy.convolution import Gaussian2DKernel, convolve
from astropy.stats import SigmaClip
from photutils.background import Background2D, MedianBackground, StdBackgroundRMS
from photutils.psf import MoffatPSF, fit_fwhm
from photutils.segmentation import SourceCatalog, detect_sources
from scipy.interpolate import RegularGridInterpolator
from scipy.optimize import least_squares

inputs = json.load(open(sys.argv[1]))
GAIN = inputs["gain"]
ALG = inputs["algorithm"]
BOX = ALG["background"]["box"]
CLIP = ALG["background"]["clip"]
DET = ALG["detection"]
SIGMA = DET["sigma"]
MIN_AREA = DET["minArea"]
SUB = 5  # sub-pixels per side in the Moffat model
FLUX_MIN = 2000.0  # electrons of segment flux for a fit
SEG_FLUX_MIN = FLUX_MIN


def interpolate(mesh, size):
    """Bilinear between box centres; the first and last interval continued linearly to the border."""
    n = mesh.shape[0]
    centres = (np.arange(n) + 0.5) * BOX - 0.5
    f = RegularGridInterpolator((centres, centres), mesh, method="linear", bounds_error=False, fill_value=None)
    c = np.arange(size, dtype=float)
    yy, xx = np.meshgrid(c, c, indexing="ij")
    return f(np.stack([yy, xx], axis=-1))


def sample_indices(w, h):
    idx = [j * w + i for j in range(0, h, 7) for i in range(0, w, 7)]
    idx += [0, w - 1, (h - 1) * w, h * w - 1]
    return sorted(set(idx))


def moffat_pixels(p, xs, ys):
    flux, x0, y0, fwhm, beta = p
    alpha = fwhm / (2.0 * math.sqrt(2.0 ** (1.0 / beta) - 1.0))
    off = (np.arange(SUB) + 0.5) / SUB - 0.5
    model = MoffatPSF(flux=flux, x_0=x0, y_0=y0, alpha=alpha, beta=beta)
    total = np.zeros(xs.shape)
    for dy in off:
        for dx in off:
            total += model(xs + dx, ys + dy)
    return total / (SUB * SUB)


out = {"format": "gravitas.detection-oracle-results/1", "frames": {}}
for f in inputs["frames"]:
    w, h = f["width"], f["height"]
    adu = np.frombuffer(base64.b64decode(f["adu"]), dtype="<i2").astype(float).reshape(h, w)
    e = adu * GAIN
    maskflat = np.zeros(w * h, dtype=bool)
    maskflat[np.array(f["mask"], dtype=int)] = True
    mask = maskflat.reshape(h, w)
    # the mesh
    bkg = Background2D(
        e,
        (BOX, BOX),
        mask=mask if mask.any() else None,
        filter_size=1,
        exclude_percentile=100.0,
        sigma_clip=SigmaClip(sigma=CLIP["sigma"], maxiters=CLIP["maxIterations"], cenfunc="median", stdfunc="std"),
        bkg_estimator=MedianBackground(sigma_clip=None),
        bkgrms_estimator=StdBackgroundRMS(sigma_clip=None),
    )
    level_mesh = np.array(bkg.background_mesh)
    noise_mesh = np.array(bkg.background_rms_mesh)
    level = interpolate(level_mesh, w)
    noise = np.maximum(interpolate(noise_mesh, w), 0.5 * noise_mesh.min())
    sub = e - level
    # the smoothed image
    fwhm = f["fwhm"]
    sk = fwhm / (2.0 * math.sqrt(2.0 * math.log(2.0)))
    radius = math.ceil(3.0 * sk)
    size = 2 * radius + 1
    kern = Gaussian2DKernel(x_stddev=sk, y_stddev=sk, x_size=size, y_size=size, mode="center")
    karr = np.array(kern.array)
    assert abs(karr.sum() - 1.0) < 1e-12, karr.sum()
    # effective 1-D weights as they land on each pixel (a repeated edge pixel
    # counts where it is repeated), the same along both axes
    k1 = karr[radius, :] / karr[radius, :].sum()
    Wm = np.zeros((w, w))
    for i in range(w):
        for d in range(-radius, radius + 1):
            Wm[i, min(max(i + d, 0), w - 1)] += k1[d + radius]
    valid = (~mask).astype(float)
    S = Wm @ valid @ Wm.T
    conv = (Wm @ (valid * sub) @ Wm.T) / S
    var = (Wm**2 @ (valid * noise**2) @ (Wm**2).T) / S**2
    thr = SIGMA * np.sqrt(var)
    # astropy's convolve must agree with the matrices (kept in the record)
    withnan = sub.copy()
    withnan[mask] = np.nan
    ref = convolve(withnan, kern, boundary="extend", nan_treatment="interpolate", normalize_kernel=True, preserve_nan=False)
    agree = float(np.max(np.abs(ref[~mask] - conv[~mask])))
    segm = detect_sources(conv, thr, npixels=MIN_AREA, connectivity=8, mask=mask)
    idx = sample_indices(w, h)
    rec = {
        "levelMesh": level_mesh.tolist(),
        "noiseMesh": noise_mesh.tolist(),
        "kernel": {"radius": radius},
        "convolveAgreement": agree,
        "sampleIndices": idx,
        "level": level.ravel()[idx].tolist(),
        "noise": noise.ravel()[idx].tolist(),
        "smoothed": conv.ravel()[idx].tolist(),
        "threshold": thr.ravel()[idx].tolist(),
        "sources": [],
        "segmentPixelsSha256": None,
        "fits": [],
        "moffatFits": [],
    }
    if segm is None:
        rec["segmentPixelsSha256"] = hashlib.sha256(b"").hexdigest()
        out["frames"][f["id"]] = rec
        continue
    labels = np.array(segm.data)
    rec["segmentPixelsSha256"] = hashlib.sha256(np.flatnonzero(labels.ravel() > 0).astype("<i4").tobytes()).hexdigest()
    cat = SourceCatalog(sub, segm, mask=mask)
    for k in range(len(cat)):
        s = cat[k]
        rec["sources"].append(
            {
                "label": int(s.label),
                "area": int(s.area.value),
                "x": float(s.xcentroid),
                "y": float(s.ycentroid),
                "semimajor": float(s.semimajor_sigma.value),
                "semiminor": float(s.semiminor_sigma.value),
                "orientation": float(s.orientation.value),
                "ellipticity": float(s.ellipticity),
                "fwhm": float(s.fwhm.value),
                "peak": float(s.max_value),
                "flux": float(s.segment_flux),
            }
        )
    # fits on isolated bright sources in frames without a mask
    if not mask.any():
        srcs = rec["sources"]
        for i, s in enumerate(srcs):
            if s["flux"] < SEG_FLUX_MIN:
                continue
            R = math.ceil(2.5 * max(s["fwhm"], 2.5))
            xc, yc = round(s["x"]), round(s["y"])
            if xc - R < 0 or yc - R < 0 or xc + R > w - 1 or yc + R > h - 1:
                continue
            if any(j != i and math.hypot(o["x"] - s["x"], o["y"] - s["y"]) < R + 3 for j, o in enumerate(srcs)):
                continue
            fw = float(fit_fwhm(sub, xypos=[(s["x"], s["y"])], fwhm=s["fwhm"], fit_shape=(2 * R + 1, 2 * R + 1))[0])
            rec["fits"].append({"source": i, "half": R, "fwhm": fw})
            if f["id"] == "moffat":
                cut = sub[yc - R : yc + R + 1, xc - R : xc + R + 1]
                ys, xs = np.mgrid[yc - R : yc + R + 1, xc - R : xc + R + 1].astype(float)
                p0 = [s["flux"], s["x"], s["y"], s["fwhm"], 3.0]

                def resid(p):
                    return (moffat_pixels(p, xs, ys) - cut).ravel()

                r = least_squares(
                    resid,
                    p0,
                    method="trf",
                    bounds=([-np.inf, -np.inf, -np.inf, 0.3, 1.01], [np.inf, np.inf, np.inf, 40.0, 60.0]),
                    x_scale="jac",
                    xtol=1e-15,
                    ftol=1e-15,
                    gtol=1e-15,
                    max_nfev=5000,
                )
                rec["moffatFits"].append(
                    {
                        "source": i,
                        "half": R,
                        "flux": float(r.x[0]),
                        "x": float(r.x[1]),
                        "y": float(r.x[2]),
                        "fwhm": float(r.x[3]),
                        "beta": float(r.x[4]),
                        "cost": float(r.cost),
                    }
                )
    out["frames"][f["id"]] = rec

with open(sys.argv[2], "w") as fh:
    json.dump(out, fh)
    fh.write("\n")
print("wrote", sys.argv[2], {k: len(v["sources"]) for k, v in out["frames"].items()})
