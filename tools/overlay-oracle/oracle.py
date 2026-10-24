"""
The independent oracle of Prompt 182 (OVERLAYS.md). Offline; no Gravitas code runs here.

    cd <empty scratchpad directory>
    <venv>/bin/python -I <repository>/tools/overlay-oracle/oracle.py \
        <repository>/tests/fixtures/overlay/oracle-inputs.json \
        <repository>/tests/fixtures/overlay/oracle-results.json

Reads the inputs tools/overlay-oracle/make-inputs.mjs wrote and computes, with astropy (wcslib
through astropy.wcs, astropy.coordinates, astropy.time) and scipy (scipy.ndimage):

  stars     every star of the bright-star pack: its pixel through the truth WCS at J2000.0, and
            after SkyCoord.apply_space_motion (rigorous, no parallax, no radial velocity) to
            the astropy TT instant of a UTC time
  time      that UTC time as a TT Julian date (leap seconds and 32.184 s, no IERS file)
  planets   get_body with the builtin ephemeris (ERFA plan94), geocentric, in GCRS
  resample  a seeded frame carried by a rotation and shift with map_coordinates, order 1
  skyMap    a first-frame pixel carried to a second frame through two WCS

Every pixel is FITS (origin 1), as the inputs say. Never run by a test.
"""

import json
import sys

import numpy as np
from astropy import units as u
from astropy.coordinates import SkyCoord, get_body
from astropy.time import Time
from astropy.utils import iers
from astropy.wcs import WCS
from scipy.ndimage import map_coordinates

# Nothing here may reach the network: no IERS download.
iers.conf.auto_download = False
iers.conf.auto_max_age = None

src, dst = sys.argv[1], sys.argv[2]
with open(src) as fh:
    inp = json.load(fh)


def wcs_from(h):
    w = WCS(naxis=2)
    w.wcs.ctype = list(h["ctype"])
    w.wcs.crpix = list(h["crpix"])
    w.wcs.crval = list(h["crval"])
    w.wcs.cd = np.array(h["cd"], dtype=float)
    w.wcs.set()
    return w


out = {"format": "gravitas.overlay-oracle-results/1", "prompt": 182}


def num(v):
    """A float, or None where wcslib has no pixel (behind the tangent plane): JSON has no NaN."""
    v = float(v)
    return v if np.isfinite(v) else None


def pairs(a, b):
    return [[num(p), num(q)] for p, q in zip(a, b)]

# time
t_utc = Time(inp["time"]["utc"], scale="utc")
t_tt = t_utc.tt
out["time"] = {"utc": inp["time"]["utc"], "tt_jd": float(t_tt.jd1 + t_tt.jd2), "tt_jd1": float(t_tt.jd1), "tt_jd2": float(t_tt.jd2)}

# stars
w = wcs_from(inp["stars"]["wcs"])
rows = inp["stars"]["rows"]
ra = np.array([r["ra"] for r in rows])
dec = np.array([r["dec"] for r in rows])
pmra = np.array([r["pmra"] for r in rows])
pmde = np.array([r["pmde"] for r in rows])
t0 = Time(inp["stars"]["jd0"], format="jd", scale="tt")
sc = SkyCoord(
    ra=ra * u.deg,
    dec=dec * u.deg,
    pm_ra_cosdec=pmra * u.mas / u.yr,
    pm_dec=pmde * u.mas / u.yr,
    frame="icrs",
    obstime=t0,
)
x0, y0 = w.all_world2pix(ra, dec, 1)
moved = sc.apply_space_motion(new_obstime=t_tt)
x1, y1 = w.all_world2pix(moved.ra.deg, moved.dec.deg, 1)
out["stars"] = {
    "hr": [r["hr"] for r in rows],
    "j2000": pairs(x0, y0),
    "epoch": pairs(x1, y1),
    "epochSky": pairs(moved.ra.deg, moved.dec.deg),
}

# planets
pl = {}
for body in inp["planets"]["bodies"]:
    pl[body] = []
    for jd in inp["planets"]["jdTt"]:
        c = get_body(body, Time(jd, format="jd", scale="tt"), ephemeris="builtin")
        pl[body].append([float(c.ra.deg), float(c.dec.deg)])
out["planets"] = pl

# resample: b(x_a, y_a) = R(theta) (a - about) + about + shift, bilinear in the second frame
r = inp["resample"]
B = np.array(r["data"], dtype=float).reshape(r["height"], r["width"])
th = np.deg2rad(r["rotationDeg"])
c, s = np.cos(th), np.sin(th)
ys, xs = np.mgrid[1 : r["height"] + 1, 1 : r["width"] + 1].astype(float)
dx, dy = xs - r["about"][0], ys - r["about"][1]
bx = c * dx - s * dy + r["about"][0] + r["shift"][0]
by = s * dx + c * dy + r["about"][1] + r["shift"][1]
res = map_coordinates(B, [by - 1.0, bx - 1.0], order=1, mode="constant", cval=np.nan)
out["resample"] = {
    "values": [None if not np.isfinite(v) else float(v) for v in res.ravel()],
    "bx": [float(v) for v in bx.ravel()],
    "by": [float(v) for v in by.ravel()],
}

# sky map: first pixel -> sky (first WCS) -> second pixel (second WCS)
wa, wb = wcs_from(inp["skyMap"]["first"]), wcs_from(inp["skyMap"]["second"])
px = np.array(inp["skyMap"]["pixels"], dtype=float)
sra, sdec = wa.all_pix2world(px[:, 0], px[:, 1], 1)
qx, qy = wb.all_world2pix(sra, sdec, 1)
out["skyMap"] = {"second": pairs(qx, qy)}

with open(dst, "w") as fh:
    json.dump(out, fh)
