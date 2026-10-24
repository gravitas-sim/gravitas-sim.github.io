"""
The independent oracle for Prompt 189's authentic-frame legs (Prompts 180 and
183 on one TESS frame), run offline, never by Gravitas.

    python -I oracle.py <repository root> inputs.json results.json

Reads the frames file of the pack (base64 float32 planes: the pixels and the
variance), checks its SHA-256 against the inputs, and computes with photutils
(and astropy, numpy, scipy), on the SAME pixels Gravitas measured:

  * the aperture sum by photutils.aperture.aperture_photometry (method exact)
    with the aperture error from the variance plane, at the position, radius
    and annulus Gravitas chose under the analysis contract
  * the sigma-clipped annulus mean and scatter (CircularAnnulus centre-method
    mask; astropy sigma_clip, median centre, mad_std, 3 sigma, 4 iterations)
  * the flux-weighted centroid, photutils.centroids.centroid_com in a window
    moved to the rounded position until it stops
  * the background mesh: photutils.background.Background2D with ONE box
    covering the frame (the frame is smaller than Gravitas's 16 pixel box, which
    clamps to the frame), SigmaClip(3, 10 iterations, median centre, std),
    MedianBackground and StdBackgroundRMS; the maps are constant
  * the smoothed image and its noise as effective weights of the Gaussian
    kernel (astropy Gaussian2DKernel), checked against astropy.convolution
    .convolve (boundary 'extend'); the segmentation by photutils detect_sources
    (connectivity 8); the source properties by SourceCatalog
  * the Gaussian FWHM of the brightest source by photutils.psf.fit_fwhm over a
    square of pixels about it

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
from astropy.stats import SigmaClip, sigma_clip
from photutils.aperture import CircularAnnulus, CircularAperture, aperture_photometry
from photutils.background import Background2D, MedianBackground, StdBackgroundRMS
from photutils.centroids import centroid_com
from photutils.psf import fit_fwhm
from photutils.segmentation import SourceCatalog, detect_sources

root = sys.argv[1].rstrip("/") + "/"
inputs = json.load(open(sys.argv[2]))
FR = inputs["frame"]
raw = open(root + FR["file"], "rb").read()
assert hashlib.sha256(raw).hexdigest() == FR["sha256"], "the frames file is not the one the inputs name"
doc = json.loads(raw)
W, H = FR["width"], FR["height"]


def plane(name):
    p = doc["planes"][name]
    assert p["encoding"] == "float32-le"
    return np.frombuffer(base64.b64decode(p["base64"]), dtype="<f4").astype(float).reshape(H, W)


e = plane("data")
var = plane("variance")
CLIP = {"sigma": 3, "maxiters": 4}


def clip(vals):
    return sigma_clip(vals, sigma=CLIP["sigma"], maxiters=CLIP["maxiters"], cenfunc="median", stdfunc="mad_std", masked=True)


def annulus_pixels(x, y, r_in, r_out):
    m = CircularAnnulus((x, y), r_in, r_out).to_mask(method="center")
    b = m.bbox
    yy, xx = np.mgrid[b.iymin : b.iymax, b.ixmin : b.ixmax]
    keep = (m.data > 0) & (xx >= 0) & (xx < W) & (yy >= 0) & (yy < H)
    return xx[keep], yy[keep]


out = {"format": "gravitas.image-packs-oracle-results/1", "frame": FR["pack"]}

# ---- photometry ----------------------------------------------------------------
P = inputs["photometry"]
if P is not None:
    x, y, r, r_in, r_out = P["x"], P["y"], P["r"], P["rIn"], P["rOut"]
    ap = CircularAperture((x, y), r)
    t = aperture_photometry(e, ap, error=np.sqrt(var), method="exact")
    xs, ys = annulus_pixels(x, y, r_in, r_out)
    vals = e[ys, xs]
    good = clip(vals).compressed()
    ann = {"n_all": int(vals.size), "n": int(good.size), "level": float(good.mean()), "scatter": float(good.std(ddof=1))}
    # the centroid, from the start Gravitas detected
    S = P["start"]
    x0, y0, half = S["x0"], S["y0"], S["half"]
    sx, sy = annulus_pixels(x0, y0, r_in, r_out)
    bg = float(clip(e[sy, sx]).compressed().mean())

    def cut(ix, iy):
        sl = (slice(iy - half, iy + half + 1), slice(ix - half, ix + half + 1))
        return e[sl] - bg

    ix, iy = int(round(x0)), int(round(y0))
    seen = set()
    settled = False
    cx = cy = float("nan")
    for _ in range(50):
        seen.add((ix, iy))
        gx, gy = centroid_com(cut(ix, iy))
        cx, cy = ix - half + gx, iy - half + gy
        nx, ny = int(round(cx)), int(round(cy))
        if (nx, ny) == (ix, iy):
            settled = True
            break
        if (nx, ny) in seen:
            break
        ix, iy = nx, ny
    out["photometry"] = {
        "case": {"x": x, "y": y, "r": r, "rIn": r_in, "rOut": r_out},
        "sum_exact": float(t["aperture_sum"][0]),
        "err_exact": float(t["aperture_sum_err"][0]),
        "annulus": ann,
        "centroid": {
            "case": S,
            "background": bg,
            "flux": {"x": float(cx), "y": float(cy), "window": [ix, iy], "settled": settled},
        },
    }

# ---- detection -----------------------------------------------------------------
D = inputs["detection"]
bkg = Background2D(
    e,
    (H, W),
    filter_size=1,
    exclude_percentile=100.0,
    sigma_clip=SigmaClip(sigma=3, maxiters=10, cenfunc="median", stdfunc="std"),
    bkg_estimator=MedianBackground(sigma_clip=None),
    bkgrms_estimator=StdBackgroundRMS(sigma_clip=None),
)
level_mesh = np.array(bkg.background_mesh)
noise_mesh = np.array(bkg.background_rms_mesh)
assert level_mesh.shape == (1, 1), level_mesh.shape
level = np.full((H, W), float(level_mesh[0, 0]))
noise = np.full((H, W), float(noise_mesh[0, 0]))
sub = e - level
fwhm = inputs["fwhm"]
sk = fwhm / (2.0 * math.sqrt(2.0 * math.log(2.0)))
radius = math.ceil(3.0 * sk)
size = 2 * radius + 1
kern = Gaussian2DKernel(x_stddev=sk, y_stddev=sk, x_size=size, y_size=size, mode="center")
karr = np.array(kern.array)
assert abs(karr.sum() - 1.0) < 1e-12
k1 = karr[radius, :] / karr[radius, :].sum()


def weights(n):
    m = np.zeros((n, n))
    for i in range(n):
        for d in range(-radius, radius + 1):
            m[i, min(max(i + d, 0), n - 1)] += k1[d + radius]
    return m


Wx, Wy = weights(W), weights(H)
valid = np.ones((H, W))
Sw = Wy @ valid @ Wx.T
conv = (Wy @ sub @ Wx.T) / Sw
v = (Wy**2 @ (noise**2) @ (Wx**2).T) / Sw**2
thr = D["sigma"] * np.sqrt(v)
ref = convolve(sub, kern, boundary="extend", nan_treatment="interpolate", normalize_kernel=True, preserve_nan=False)
agree = float(np.max(np.abs(ref - conv)))
segm = detect_sources(conv, thr, npixels=D["minArea"], connectivity=8)
idx = sorted(set([j * W + i for j in range(0, H, 7) for i in range(0, W, 7)] + [0, W - 1, (H - 1) * W, H * W - 1]))
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
    "segmentPixelsSha256": hashlib.sha256(b"").hexdigest(),
    "fits": [],
}
if segm is not None:
    labels = np.array(segm.data)
    rec["segmentPixelsSha256"] = hashlib.sha256(np.flatnonzero(labels.ravel() > 0).astype("<i4").tobytes()).hexdigest()
    cat = SourceCatalog(sub, segm)
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
    if rec["sources"]:
        R = inputs["fwhmFit"]["half"]
        b = max(rec["sources"], key=lambda s: s["flux"])
        xc, yc = round(b["x"]), round(b["y"])
        if xc - R < 0 or yc - R < 0 or xc + R > W - 1 or yc + R > H - 1:
            rec["fitNote"] = "the brightest source is too near the edge for a square of %d pixels" % (2 * R + 1)
        else:
            fw = float(fit_fwhm(sub, xypos=[(b["x"], b["y"])], fwhm=b["fwhm"], fit_shape=(2 * R + 1, 2 * R + 1))[0])
            rec["fits"].append({"source": rec["sources"].index(b), "half": R, "fwhm": fw})
out["detection"] = rec

with open(sys.argv[3], "w") as fh:
    json.dump(out, fh)
    fh.write("\n")
print("wrote", sys.argv[3], "sources", len(rec["sources"]), "convolve agreement", agree)
