"""
Writes tests/fixtures/astrometry/oracle-provenance.json (Prompt 181).

    <venv>/bin/python -I tools/astrometry-oracle/provenance.py <repository root>

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
    "format": "gravitas.astrometry-oracle-provenance/1",
    "prompt": 181,
    "oracle": "astropy " + pk["astropy"] + " (wcslib), with scipy " + pk["scipy"] + " and numpy " + pk["numpy"],
    "identity": "Independent, cited implementations; no Gravitas code ran: astropy.wcs.WCS (wcslib: all_pix2world, all_world2pix), astropy.wcs.utils.fit_wcs_from_points (projection TAN, no SIP, the tangent point given), scipy.linalg.orthogonal_procrustes.",
    "retrieved": "2026-10-23",
    "index": "https://pypi.org/simple (pip default index; no mirror, no pip.conf, no PIP_* variable); the venv is the one Prompt 180 made for its oracle (numpy, scipy, astropy, photutils and what they pull in), reused, nothing added",
    "python": sys.version.split()[0] + " (" + platform.platform() + ", " + platform.machine() + ")",
    "packages": pk,
    "install": "python3.10 -m venv <scratchpad>/oracle180; <venv>/bin/python -m pip install --only-binary :all: numpy scipy astropy photutils (the resolved versions above); the venv is not committed and no package is",
    "run": "cd <empty scratchpad directory>; <venv>/bin/python -I tools/astrometry-oracle/oracle.py tests/fixtures/astrometry/oracle-inputs.json tests/fixtures/astrometry/oracle-results.json; then Prettier",
    "inputsFrom": "node tools/astrometry-oracle/make-inputs.mjs (the scenes of thresholds.json, built by tools/astrometry-validate.mjs), then Prettier",
    "parameters": {
        "projection": "WCS(naxis=2) with ctype RA---TAN, DEC--TAN, the truth's CRPIX, CRVAL and CD; all_pix2world(x, y, 1)",
        "fit": "fit_wcs_from_points((x - 1, y - 1), SkyCoord(ra, dec, icrs), proj_point=the truth's reference position, projection='TAN', sip_degree=None) (it takes 0-based pixels); then all_world2pix(ra, dec, 1) at 25 sky points",
        "registration": "orthogonal_procrustes(A - mean(A), B - mean(B)) on rows, R = result transposed, t = mean(B) - R mean(A), theta = atan2(R[1,0], R[0,0]); the determinant is recorded",
        "header": "the authentic TESS header: CTYPE RA---TAN, DEC--TAN, CRPIX, CRVAL, CDELT, PC; all_pix2world(x, y, 1)",
    },
    "conventions": "pixels are FITS (origin 1) except as fit_wcs_from_points requires; positions in degrees",
    "files": {
        p: sha(p)
        for p in [
            "tests/fixtures/astrometry/oracle-inputs.json",
            "tests/fixtures/astrometry/oracle-results.json",
            "tools/astrometry-oracle/oracle.py",
            "tools/astrometry-oracle/make-inputs.mjs",
        ]
    },
    "references": [
        "Astropy Collaboration 2022, ApJ 935, 167",
        "Calabretta, M. R. and Greisen, E. W. 2002, A&A 395, 1077 (the WCS papers wcslib implements)",
        "Harris, C. R. et al. 2020, Nature 585, 357 (numpy)",
        "Virtanen, P. et al. 2020, Nature Methods 17, 261 (scipy)",
    ],
}
with open(root + "tests/fixtures/astrometry/oracle-provenance.json", "w") as fh:
    json.dump(rec, fh, indent=2)
    fh.write("\n")
