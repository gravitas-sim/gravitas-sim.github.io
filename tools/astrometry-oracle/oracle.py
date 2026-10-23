"""
The independent oracle of Prompt 181 (ASTROMETRY.md). Offline; no Gravitas code runs here.

    cd <empty scratchpad directory>
    <venv>/bin/python -I <repository>/tools/astrometry-oracle/oracle.py \
        <repository>/tests/fixtures/astrometry/oracle-inputs.json \
        <repository>/tests/fixtures/astrometry/oracle-results.json

Reads the inputs tools/astrometry-oracle/make-inputs.mjs wrote and computes, with astropy
(wcslib through astropy.wcs, and astropy.wcs.utils.fit_wcs_from_points) and scipy
(scipy.linalg.orthogonal_procrustes):

  projection    pixel to sky of the synthetic truth WCS on a grid
  fit           the noisy five-star fit (TAN, no SIP, the tangent point given) and the pixel of
                each of 25 sky points under it
  registration  the rotation and translation between two frames' sources (Procrustes with a
                determinant check, centroid translation)
  header        pixel to sky of the authentic TESS header on its pixels and a margin

Every pixel is FITS (origin 1), as the inputs say. Never run by a test.
"""

import json
import sys

import numpy as np
from astropy import units as u
from astropy.coordinates import SkyCoord
from astropy.wcs import WCS
from astropy.wcs.utils import fit_wcs_from_points
from scipy.linalg import orthogonal_procrustes

src, dst = sys.argv[1], sys.argv[2]
with open(src) as fh:
    inp = json.load(fh)


def wcs_from(h, cd=True):
    w = WCS(naxis=2)
    w.wcs.ctype = list(h["ctype"])
    w.wcs.crpix = list(h["crpix"])
    w.wcs.crval = list(h["crval"])
    if "cd" in h and h["cd"] is not None:
        w.wcs.cd = np.array(h["cd"], dtype=float)
    else:
        w.wcs.cdelt = list(h["cdelt"])
        w.wcs.pc = np.array(h["pc"], dtype=float)
    w.wcs.set()
    return w


out = {"format": "gravitas.astrometry-oracle-results/1", "prompt": 181}

# projection
w = wcs_from(inp["projection"]["wcs"])
px = np.array(inp["projection"]["pixels"], dtype=float)
ra, dec = w.all_pix2world(px[:, 0], px[:, 1], 1)
out["projection"] = {"world": [[float(a), float(b)] for a, b in zip(ra, dec)]}

# fit: fit_wcs_from_points takes 0-based pixel coordinates (it evaluates wcs_pix2world at origin 0)
stars = inp["fit"]["stars"]
xy = (np.array([s["x"] for s in stars]) - 1.0, np.array([s["y"] for s in stars]) - 1.0)
world = SkyCoord([s["ra"] for s in stars] * u.deg, [s["dec"] for s in stars] * u.deg, frame="icrs")
tangent = SkyCoord(inp["fit"]["tangent"][0] * u.deg, inp["fit"]["tangent"][1] * u.deg, frame="icrs")
fitted = fit_wcs_from_points(xy, world, proj_point=tangent, projection="TAN", sip_degree=None)
sky = np.array(inp["fit"]["sky"], dtype=float)
fx, fy = fitted.all_world2pix(sky[:, 0], sky[:, 1], 1)
out["fit"] = {
    "pixels": [[float(a), float(b)] for a, b in zip(fx, fy)],
    "crpix": [float(v) for v in fitted.wcs.crpix],
    "crval": [float(v) for v in fitted.wcs.crval],
    "cd": [[float(v) for v in row] for row in fitted.pixel_scale_matrix],
}

# registration: b = R a + t. orthogonal_procrustes minimises |A R' - B| for rows, so R = R'^T.
pairs = inp["registration"]["pairs"]
A = np.array([p["a"] for p in pairs], dtype=float)
B = np.array([p["b"] for p in pairs], dtype=float)
ca, cb = A.mean(axis=0), B.mean(axis=0)
Rp, _ = orthogonal_procrustes(A - ca, B - cb)
R = Rp.T
t = cb - R @ ca
out["registration"] = {
    "theta": float(np.arctan2(R[1, 0], R[0, 0])),
    "t": [float(t[0]), float(t[1])],
    "det": float(np.linalg.det(R)),
}

# the authentic header
h = inp["header"]
wh = wcs_from(h["wcs"])
hp = np.array(h["pixels"], dtype=float)
hra, hdec = wh.all_pix2world(hp[:, 0], hp[:, 1], 1)
out["header"] = {"world": [[float(a), float(b)] for a, b in zip(hra, hdec)]}

with open(dst, "w") as fh:
    json.dump(out, fh, indent=2)
    fh.write("\n")
