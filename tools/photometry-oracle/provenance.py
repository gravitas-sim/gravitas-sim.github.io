"""
Writes tests/fixtures/photometry/oracle-provenance.json (Prompt 180).

    <venv>/bin/python -I tools/photometry-oracle/provenance.py <repository root>

Records what produced the pinned fixtures: the package versions of the venv it
runs in, the parameters, the retrieval date, the index, and the SHA-256 of the
fixtures and scripts as committed. Never run by a test.
"""

import hashlib
import json
import platform
import sys
from importlib.metadata import version

root = sys.argv[1].rstrip("/") + "/"
pk = {n: version(n) for n in ["photutils", "astropy", "numpy", "scipy", "pyerfa", "astropy-iers-data", "PyYAML", "packaging"]}


def sha(p):
    return hashlib.sha256(open(root + p, "rb").read()).hexdigest()


rec = {
    "format": "gravitas.photometry-oracle-provenance/1",
    "prompt": 180,
    "oracle": "photutils " + pk["photutils"] + " with astropy " + pk["astropy"] + ", numpy " + pk["numpy"] + " and scipy " + pk["scipy"],
    "identity": "Independent, cited implementations; no Gravitas code ran: photutils.aperture.aperture_photometry (CircularAperture, CircularAnnulus), photutils.centroids.centroid_com, astropy.stats.sigma_clip, astropy.modeling.fitting.FittingWithOutlierRemoval with LinearLSQFitter and models.Planar2D.",
    "retrieved": "2026-10-23",
    "index": "https://pypi.org/simple (pip default index; no mirror, no pip.conf, no PIP_* variable)",
    "python": sys.version.split()[0] + " (" + platform.platform() + ", " + platform.machine() + ")",
    "packages": pk,
    "install": "python3.10 -m venv <scratchpad>/oracle180; <venv>/bin/python -m pip install --only-binary :all: numpy scipy astropy photutils (the resolved versions above); the venv is not committed and no package is",
    "run": "cd <empty scratchpad directory>; <venv>/bin/python -I tools/photometry-oracle/oracle.py tests/fixtures/photometry/oracle-inputs.json tests/fixtures/photometry/oracle-results.json; then Prettier",
    "inputsFrom": "node tools/photometry-oracle/make-inputs.mjs (detector-kernel frames of fixed seeds), then Prettier",
    "revisions": [
        "1: results first pinned at 265ac3bd",
        "2: oracle.py gained the `settled` flag on the flux-weighted centroid (the window loop stops on the first window it has been in and says it did not settle); every number of revision 1 is unchanged, and the inputs are the same bytes",
    ],
    "parameters": {
        "apertures": "CircularAperture, methods exact and center; the aperture error from a variance plane max(e, 0) + readNoise^2 (photutils sums error^2 times the weight)",
        "annulus": "CircularAnnulus.to_mask(method=center); sigma_clip(sigma=3, maxiters=4, cenfunc=median, stdfunc=mad_std); mean, std with ddof=1",
        "plane": "FittingWithOutlierRemoval(LinearLSQFitter(), sigma_clip, niter=4, sigma=3, maxiters=1, cenfunc=median, stdfunc=mad_std) on Planar2D, coordinates relative to the aperture centre",
        "centroid": "photutils.centroids.centroid_com on a (2 half + 1) square window of the background-subtracted electrons, the window moved to the rounded centroid until it stops; Gaussian-weighted: the cutout times exp(-d^2/2 sigma^2) about the current position, to a fixed point (1e-10 pixel)",
    },
    "conventions": "pixel (0, 0) is the centre of the first pixel; electrons are bias-subtracted ADU times the gain 1.5",
    "files": {
        p: sha(p)
        for p in [
            "tests/fixtures/photometry/oracle-inputs.json",
            "tests/fixtures/photometry/oracle-results.json",
            "tools/photometry-oracle/oracle.py",
            "tools/photometry-oracle/make-inputs.mjs",
        ]
    },
    "references": [
        "Bradley, L. et al., photutils (Zenodo release " + pk["photutils"] + ")",
        "Astropy Collaboration 2022, ApJ 935, 167",
        "Harris, C. R. et al. 2020, Nature 585, 357 (numpy)",
        "Virtanen, P. et al. 2020, Nature Methods 17, 261 (scipy)",
    ],
}
with open(root + "tests/fixtures/photometry/oracle-provenance.json", "w") as fh:
    json.dump(rec, fh, indent=2)
    fh.write("\n")
