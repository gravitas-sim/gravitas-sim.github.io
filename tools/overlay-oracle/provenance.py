"""
Writes tests/fixtures/overlay/oracle-provenance.json (Prompt 182).

    <venv>/bin/python -I tools/overlay-oracle/provenance.py <repository root>

Records what produced the pinned fixtures: the package versions of the venv it runs in, the
parameters, the retrieval date, the index, and the SHA-256 of the fixtures and scripts as
committed. Never run by a test.
"""

import hashlib
import json
import platform
import sys
from importlib.metadata import version

root = sys.argv[1].rstrip("/") + "/"
pk = {n: version(n) for n in ["astropy", "numpy", "scipy", "pyerfa", "astropy-iers-data", "photutils", "PyYAML", "packaging"]}


def sha(p):
    return hashlib.sha256(open(root + p, "rb").read()).hexdigest()


rec = {
    "format": "gravitas.overlay-oracle-provenance/1",
    "prompt": 182,
    "oracle": "astropy " + pk["astropy"] + " (wcslib, ERFA " + pk["pyerfa"] + "), with scipy " + pk["scipy"] + " and numpy " + pk["numpy"],
    "identity": "Independent, cited implementations; no Gravitas code ran: astropy.wcs.WCS (wcslib: all_pix2world, all_world2pix), astropy.coordinates SkyCoord.apply_space_motion and get_body (builtin ephemeris, ERFA plan94), astropy.time.Time, scipy.ndimage.map_coordinates.",
    "retrieved": "2026-10-23",
    "index": "https://pypi.org/simple (pip default index; no mirror, no pip.conf, no PIP_* variable); the venv is the one Prompt 180 made for its oracle (numpy, scipy, astropy, photutils and what they pull in), reused, nothing added",
    "python": sys.version.split()[0] + " (" + platform.platform() + ", " + platform.machine() + ")",
    "packages": pk,
    "install": "python3.10 -m venv <scratchpad>/oracle180; <venv>/bin/python -m pip install --only-binary :all: numpy scipy astropy photutils (the resolved versions above); the venv is not committed and no package is",
    "run": "cd <empty scratchpad directory>; <venv>/bin/python -I tools/overlay-oracle/oracle.py tests/fixtures/overlay/oracle-inputs.json tests/fixtures/overlay/oracle-results.json; then Prettier",
    "inputsFrom": "node tools/overlay-oracle/make-inputs.mjs (the scenes of thresholds.json, built by tools/overlay-validate.mjs), then Prettier",
    "parameters": {
        "stars": "WCS(naxis=2) with ctype RA---TAN, DEC--TAN, the truth's CRPIX, CRVAL and CD; SkyCoord(ra, dec, pm_ra_cosdec, pm_dec, icrs, obstime=J2000.0 TT) with no distance and no radial velocity; apply_space_motion(new_obstime=Time('2026-01-01T00:00:00', scale='utc').tt); all_world2pix(ra, dec, 1)",
        "time": "Time('2026-01-01T00:00:00', scale='utc').tt, no IERS file (iers.conf.auto_download = False)",
        "planets": "get_body(name, Time(jd, format='jd', scale='tt'), ephemeris='builtin'): geocentric GCRS, the apparent direction from the Earth's center, ERFA plan94",
        "resample": "scipy.ndimage.map_coordinates(frame, [y - 1, x - 1], order=1, mode='constant', cval=nan) at the coordinates R(theta)(a - about) + about + shift, 1-based, converted to 0-based",
        "skyMap": "all_pix2world(x, y, 1) of the first WCS then all_world2pix(ra, dec, 1) of the second",
    },
    "conventions": "pixels are FITS (origin 1) except as map_coordinates requires; positions in degrees",
    "warnings": "ERFA said, and the run kept: pmsafe 'distance overridden (Note 6)' for all 904 stars (no distance was given, so ERFA takes a negligible parallax), and taiutc 'dubious year (Note 4)' for the 2026 instant (UTC to TAI beyond the leap-second table's last announced entry, taken as 37 s). Neither reaches the bounds: the proper motion is rigorous on the sphere without parallax, and the 0.056 s the kernel differs by is its delta-T for 2026.",
    "files": {
        p: sha(p)
        for p in [
            "tests/fixtures/overlay/oracle-inputs.json",
            "tests/fixtures/overlay/oracle-results.json",
            "tools/overlay-oracle/oracle.py",
            "tools/overlay-oracle/make-inputs.mjs",
        ]
    },
    "references": [
        "Astropy Collaboration 2022, ApJ 935, 167",
        "Calabretta, M. R. and Greisen, E. W. 2002, A&A 395, 1077 (the WCS papers wcslib implements)",
        "Harris, C. R. et al. 2020, Nature 585, 357 (numpy)",
        "Virtanen, P. et al. 2020, Nature Methods 17, 261 (scipy)",
    ],
}
with open(root + "tests/fixtures/overlay/oracle-provenance.json", "w") as fh:
    json.dump(rec, fh, indent=2)
    fh.write("\n")
