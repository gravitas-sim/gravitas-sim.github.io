"""
The independent oracle for Prompt 189's authentic legs of Prompts 181, 182, 185 and
186 (contract part 3), run offline, never by Gravitas.

    cd <empty scratchpad directory>
    <venv>/bin/python -I <repository>/tools/image-packs-oracle/oracle-authentic.py \
        <repository root> <inputs.json> <results.json>

Reads the cutout of 84 TESS full-frame images (float32 little-endian, in
electrons per second), checks its SHA-256 against the inputs, and computes with
astropy, photutils, numpy and scipy, given only what Gravitas decided:

  fit      astropy.wcs.utils.fit_wcs_from_points (TAN, no SIP) on the matched stars
           and the tangent point Gravitas used; the pixel of each of 25 sky points
           under it
  overlay  the Gaia stars carried from epoch 2016.0 to the frame's time by
           SkyCoord.apply_space_motion (no parallax, no radial velocity), and their
           pixels through the solution Gravitas fitted (astropy.wcs all_world2pix)
  photometry  for the target and each comparison star in every frame, at the
           position, radius and annulus the pipeline measured: photutils
           aperture_photometry (method exact) and the sigma-clipped annulus mean
           (astropy sigma_clip, median centre, mad_std, 3 sigma, 4 iterations,
           centre-method annulus mask); the net, and the differential magnitude
           formed by numpy
  series   astropy SkyCoord.separation of the two catalogue positions

Pixels in the inputs are FITS (origin 1) for the fit and the overlay, and zero
based (photutils) for the photometry, as the inputs say. Nothing here imports
Gravitas code.
"""

import hashlib
import json
import sys

import numpy as np
from astropy import units as u
from astropy.coordinates import SkyCoord
from astropy.stats import sigma_clip
from astropy.time import Time
from astropy.wcs import WCS
from astropy.wcs.utils import fit_wcs_from_points
from photutils.aperture import CircularAnnulus, CircularAperture, aperture_photometry

root = sys.argv[1].rstrip("/") + "/"
inputs = json.load(open(sys.argv[2]))
C = inputs["cube"]
raw = open(root + C["file"], "rb").read()
assert hashlib.sha256(raw).hexdigest() == C["sha256"], "the cutout is not the one the inputs name"
N, H, W = C["shape"]
cube = np.frombuffer(raw, dtype="<f4").reshape(N, H, W).astype(float)

out = {"format": "gravitas.image-packs-authentic-oracle-results/1", "prompt": 189, "part": 3, "sections": {}}


def clip(vals):
    return sigma_clip(vals, sigma=3, maxiters=4, cenfunc="median", stdfunc="mad_std", masked=True)


def annulus_pixels(x, y, r_in, r_out):
    m = CircularAnnulus((x, y), r_in, r_out).to_mask(method="center")
    b = m.bbox
    yy, xx = np.mgrid[b.iymin : b.iymax, b.ixmin : b.ixmax]
    keep = (m.data > 0) & (xx >= 0) & (xx < W) & (yy >= 0) & (yy < H)
    return xx[keep], yy[keep]


for name, sec in inputs["sections"].items():
    res = {}
    # ---- fit
    F = sec.get("fit")
    if F:
        st = F["stars"]
        xy = (np.array([s["x"] for s in st]) - 1.0, np.array([s["y"] for s in st]) - 1.0)
        world = SkyCoord([s["ra"] for s in st] * u.deg, [s["dec"] for s in st] * u.deg, frame="icrs")
        tangent = SkyCoord(F["tangent"][0] * u.deg, F["tangent"][1] * u.deg, frame="icrs")
        fitted = fit_wcs_from_points(xy, world, proj_point=tangent, projection="TAN", sip_degree=None)
        sky = np.array(F["sky"], dtype=float)
        fx, fy = fitted.all_world2pix(sky[:, 0], sky[:, 1], 1)
        res["fit"] = {
            "pixels": [[float(a), float(b)] for a, b in zip(fx, fy)],
            "crpix": [float(v) for v in fitted.wcs.crpix],
            "crval": [float(v) for v in fitted.wcs.crval],
            "cd": [[float(v) for v in row] for row in fitted.pixel_scale_matrix],
            "n": len(st),
        }
    # ---- overlay
    O = sec.get("overlay")
    if O:
        sol = O["solution"]
        w = WCS(naxis=2)
        w.wcs.ctype = ["RA---TAN", "DEC--TAN"]
        w.wcs.crpix = sol["crpix"]
        w.wcs.crval = sol["crval"]
        w.wcs.cd = np.array(sol["cd"], dtype=float)
        w.wcs.set()
        stars = O["stars"]
        t0 = Time(O["gaiaEpochJd"], format="jd", scale="tt")
        t1 = Time(O["epochJdTdb"], format="jd", scale="tt")  # the interval is what matters: both in one scale
        sc = SkyCoord(
            ra=np.array([s["ra"] for s in stars]) * u.deg,
            dec=np.array([s["dec"] for s in stars]) * u.deg,
            pm_ra_cosdec=np.array([s["pmra"] for s in stars]) * u.mas / u.yr,
            pm_dec=np.array([s["pmde"] for s in stars]) * u.mas / u.yr,
            frame="icrs",
            obstime=t0,
        )
        moved = sc.apply_space_motion(new_obstime=t1)
        x, y = w.all_world2pix(moved.ra.deg, moved.dec.deg, 1)
        listed = []
        pix = []
        for s, a, b in zip(stars, x, y):
            if s["g"] <= O["magnitude"] + 0.001 and 0.5 <= a <= O["width"] + 0.5 and 0.5 <= b <= O["height"] + 0.5:
                listed.append(s["hr"])
                pix.append({"hr": s["hr"], "x": float(a), "y": float(b)})
        res["overlay"] = {"stars": pix, "inFrame": listed}
    # ---- photometry
    P = sec.get("photometry")
    if P:
        ap = P["aperture"]
        r, r_in, r_out = ap["r"], ap["rIn"], ap["rOut"]
        ids = [P["target"]] + P["chosen"]
        frames = []
        for fr in P["frames"]:
            e = cube[fr["k"]]
            net = {}
            for s in fr["stars"]:
                t = aperture_photometry(e, CircularAperture((s["x"], s["y"]), r), method="exact")
                total = float(t["aperture_sum"][0])
                xs, ys = annulus_pixels(s["x"], s["y"], r_in, r_out)
                level = float(clip(e[ys, xs]).compressed().mean())
                net[s["id"]] = total - np.pi * r * r * level
            ens = sum(net[i] for i in P["chosen"])
            frames.append({"k": fr["k"], "net": net, "dm": float(-2.5 * np.log10(net[P["target"]] / ens))})
        res["photometry"] = {"frames": frames}
    out["sections"][name] = res

# ---- series
S = inputs["series"]
a = SkyCoord(S["epochs"][0]["ra"] * u.deg, S["epochs"][0]["dec"] * u.deg, frame="icrs")
b = SkyCoord(S["epochs"][1]["ra"] * u.deg, S["epochs"][1]["dec"] * u.deg, frame="icrs")
out["series"] = {"separationArcsec": float(a.separation(b).arcsec)}

with open(sys.argv[3], "w") as fh:
    json.dump(out, fh)
    fh.write("\n")
print("wrote", sys.argv[3], {k: sorted(v) for k, v in out["sections"].items()})
