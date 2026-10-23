"""
The independent oracle for Prompt 180 (photometry), run offline, never by Gravitas.

    python -I oracle.py inputs.json results.json

Reads the frames and cases written by make-inputs.mjs and computes, with
photutils (and astropy, numpy), on the SAME pixels the tests use:

  * aperture sums by photutils.aperture.aperture_photometry, methods 'exact'
    and 'center', with the aperture error from a variance plane
  * the sigma-clipped annulus mean (photutils.aperture.CircularAnnulus,
    centre-method mask; astropy.stats.sigma_clip, median centre, mad_std,
    3 sigma, 4 iterations)
  * a local plane through the annulus
    (astropy.modeling.fitting.FittingWithOutlierRemoval with LinearLSQFitter and
    models.Planar2D, the same clipping) and the plane summed under the exact
    aperture
  * centroids by photutils.centroids.centroid_com in a window that is moved to
    the rounded position until it stops, flux-weighted, and the
    Gaussian-weighted fixed point (centroid_com of the cutout times a Gaussian
    centred on the current position)

Pixel (0, 0) is the centre of the first pixel, as in photutils. Nothing here
imports Gravitas code. Run with `-I` from a directory that holds no other
Python, with the script kept apart from the data.
"""

import base64
import json
import sys

import numpy as np
from astropy.modeling import fitting, models
from astropy.stats import sigma_clip
from photutils.aperture import CircularAnnulus, CircularAperture, aperture_photometry
from photutils.centroids import centroid_com

inputs = json.load(open(sys.argv[1]))
GAIN = inputs["gain"]
READ = inputs["readNoise"]
CLIP = inputs["clip"]

frames = {}
for f in inputs["frames"]:
    adu = np.frombuffer(base64.b64decode(f["adu"]), dtype="<i2").astype(float)
    e = adu.reshape(f["height"], f["width"]) * GAIN
    frames[f["id"]] = {"e": e, "var": np.maximum(e, 0.0) + READ**2}


def clip(vals):
    return sigma_clip(
        vals,
        sigma=CLIP["sigma"],
        maxiters=CLIP["maxiters"],
        cenfunc="median",
        stdfunc="mad_std",
        masked=True,
    )


def annulus_pixels(shape, x, y, r_in, r_out):
    """Coordinates of the annulus pixels (centre method) that lie in the frame."""
    ann = CircularAnnulus((x, y), r_in, r_out)
    m = ann.to_mask(method="center")
    h, w = shape
    b = m.bbox
    yy, xx = np.mgrid[b.iymin : b.iymax, b.ixmin : b.ixmax]
    keep = (m.data > 0) & (xx >= 0) & (xx < w) & (yy >= 0) & (yy < h)
    return xx[keep], yy[keep]


results = {"apertures": [], "centroids": []}

for c in inputs["cases"]:
    fr = frames[c["frame"]]
    e, var = fr["e"], fr["var"]
    x, y, r, r_in, r_out = c["x"], c["y"], c["r"], c["rIn"], c["rOut"]
    ap = CircularAperture((x, y), r)
    out = {"case": c}
    for method in ("exact", "center"):
        t = aperture_photometry(e, ap, error=np.sqrt(var), method=method)
        out["sum_" + method] = float(t["aperture_sum"][0])
        out["err_" + method] = float(t["aperture_sum_err"][0])
    # the annulus mean
    xs, ys = annulus_pixels(e.shape, x, y, r_in, r_out)
    vals = e[ys, xs]
    good = clip(vals).compressed()
    out["annulus"] = {
        "n_all": int(vals.size),
        "n": int(good.size),
        "level": float(good.mean()),
        "scatter": float(good.std(ddof=1)),
    }
    # the local plane, coordinates relative to the aperture centre
    fitter = fitting.FittingWithOutlierRemoval(
        fitting.LinearLSQFitter(),
        sigma_clip,
        niter=CLIP["maxiters"],
        sigma=CLIP["sigma"],
        maxiters=1,
        cenfunc="median",
        stdfunc="mad_std",
    )
    plane, mask = fitter(models.Planar2D(0.0, 0.0, 0.0), xs - x, ys - y, vals)
    # the plane summed under the exact aperture
    mm = ap.to_mask(method="exact")
    b = mm.bbox
    gy, gx = np.mgrid[b.iymin : b.iymax, b.ixmin : b.ixmax]
    inside = (gx >= 0) & (gx < e.shape[1]) & (gy >= 0) & (gy < e.shape[0])
    wt = np.where(inside, mm.data, 0.0)
    pv = plane(gx - x, gy - y)
    out["plane"] = {
        "n": int((~mask).sum()),
        "intercept": float(plane.intercept.value),
        "slope_x": float(plane.slope_x.value),
        "slope_y": float(plane.slope_y.value),
        "sum_under_exact": float((pv * wt).sum()),
        "area_exact": float(wt.sum()),
    }
    results["apertures"].append(out)

for c in inputs["centroids"]:
    fr = frames[c["frame"]]
    e = fr["e"]
    x0, y0, half, sw = c["x0"], c["y0"], c["half"], c["sigmaW"]
    xs, ys = annulus_pixels(e.shape, x0, y0, c["rIn"], c["rOut"])
    bg = float(clip(e[ys, xs]).compressed().mean())

    def cut(ix, iy):
        sl = (slice(iy - half, iy + half + 1), slice(ix - half, ix + half + 1))
        yy, xx = np.mgrid[sl]
        return e[sl] - bg, xx.astype(float), yy.astype(float)

    # flux-weighted: move the window to the rounded centroid until it stops
    # (a centroid on the edge between two windows gives each a position on the
    # other's side: the loop stops on the first window it has been in, and the
    # result says it did not settle)
    ix, iy = int(round(x0)), int(round(y0))
    seen = set()
    settled = False
    for _ in range(50):
        seen.add((ix, iy))
        d, xx, yy = cut(ix, iy)
        gx, gy = centroid_com(d)
        cx, cy = ix - half + gx, iy - half + gy
        nx, ny = int(round(cx)), int(round(cy))
        if (nx, ny) == (ix, iy):
            settled = True
            break
        if (nx, ny) in seen:
            break
        ix, iy = nx, ny
    flux = {"x": float(cx), "y": float(cy), "window": [ix, iy], "settled": settled}
    # Gaussian-weighted fixed point
    cx, cy = float(x0), float(y0)
    for _ in range(500):
        ix, iy = int(round(cx)), int(round(cy))
        d, xx, yy = cut(ix, iy)
        wgt = np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * sw * sw))
        gx, gy = centroid_com(d * wgt)
        nx, ny = ix - half + gx, iy - half + gy
        done = np.hypot(nx - cx, ny - cy) < 1e-10
        cx, cy = nx, ny
        if done:
            break
    gauss = {"x": float(cx), "y": float(cy), "window": [int(round(cx)), int(round(cy))]}
    results["centroids"].append(
        {"case": c, "background": bg, "flux": flux, "gaussian": gauss}
    )

with open(sys.argv[2], "w") as fh:
    json.dump(results, fh, indent=1, sort_keys=True)
    fh.write("\n")
