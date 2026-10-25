"""
Writes tests/fixtures/detection/oracle-provenance.json (Prompt 183).

    <venv>/bin/python -I tools/detection-oracle/provenance.py <repository root>

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
    "format": "gravitas.detection-oracle-provenance/1",
    "prompt": 183,
    "oracle": "photutils " + pk["photutils"] + " with astropy " + pk["astropy"] + ", numpy " + pk["numpy"] + " and scipy " + pk["scipy"],
    "identity": "Independent, cited implementations; no Gravitas code ran: photutils.background.Background2D (MedianBackground, StdBackgroundRMS), astropy.stats.SigmaClip, astropy.convolution (Gaussian2DKernel, convolve), photutils.segmentation (detect_sources, SourceCatalog), photutils.psf (fit_fwhm, CircularGaussianPRF, MoffatPSF), scipy.interpolate.RegularGridInterpolator, scipy.optimize.least_squares.",
    "retrieved": "2026-10-23",
    "index": "https://pypi.org/simple (pip default index; no mirror, no pip.conf, no PIP_* variable); the virtual environment is Prompt 180's, in which nothing was added for this prompt",
    "python": sys.version.split()[0] + " (" + platform.platform() + ", " + platform.machine() + ")",
    "packages": pk,
    "install": "python3.10 -m venv <scratchpad>/oracle180; <venv>/bin/python -m pip install --only-binary :all: numpy scipy astropy photutils (the resolved versions above); the venv is not committed and no package is",
    "run": "cd <empty scratchpad directory>; <venv>/bin/python -I tools/detection-oracle/oracle.py tests/fixtures/detection/oracle-inputs.json tests/fixtures/detection/oracle-results.json; then Prettier",
    "inputsFrom": "node tools/detection-oracle/make-inputs.mjs (tools/detection-synth.mjs: detector-kernel frames of fixed seeds, whole ADU), then Prettier",
    "revisions": [
        "1: the oracle's first run, before js/measure/detect.js existed, showed two flaws in the committed algorithm (a constant background beyond the outer box centres; one global sum of squares for the smoothed noise); thresholds.json and DETECTION.md record both corrections, a74b4357",
        "2: oracle.py gained fwhmTight (the Gaussian fit again by scipy least_squares at tolerances of 1e-15) after the first comparison showed photutils.psf.fit_fwhm converges only to about 1e-4; every earlier number is unchanged and the inputs are the same bytes",
    ],
    "parameters": {
        "mesh": "Background2D(box_size=16, filter_size=1, exclude_percentile=100, mask, SigmaClip(sigma=3, maxiters=10, cenfunc=median, stdfunc=std), MedianBackground(sigma_clip=None), StdBackgroundRMS(sigma_clip=None)); maps by RegularGridInterpolator(linear, bounds_error=False, fill_value=None) at pixel positions, i.e. the first and last interval continued; the noise floored at half the smallest box value",
        "smoothing": "Gaussian2DKernel(x_stddev=FWHM/2.3548, size 2 ceil(3 sigma) + 1, mode center, sum 1); the smoothed image as matrices of the weights as they land (repeated edge pixel, masked pixel removed, renormalised), agreeing with astropy convolve(boundary='extend', nan_treatment='interpolate') to 1e-12 (convolveAgreement in the results); the smoothed noise sqrt(sum w^2 sigma^2)",
        "segmentation": "detect_sources(smoothed, 4 x smoothed noise, npixels=5, connectivity=8, mask)",
        "catalog": "SourceCatalog(background-subtracted unsmoothed electrons, segmentation, mask); area, xcentroid, ycentroid, semimajor_sigma, semiminor_sigma, orientation, ellipticity, fwhm, max_value, segment_flux",
        "gaussian": "photutils.psf.fit_fwhm(xypos=catalog centroid, fwhm=catalog fwhm, fit_shape=(2R+1, 2R+1)), R = ceil(2.5 max(FWHM0, 2.5)), unweighted, background subtracted and held at zero; fwhmTight: least_squares(trf, bounds, x_scale=jac, tolerances 1e-15) over CircularGaussianPRF",
        "moffat": "least_squares(trf, bounds on fwhm and beta, x_scale=jac, tolerances 1e-15) over MoffatPSF, each pixel the mean of 5 by 5 sub-pixel midpoints, unweighted, start beta 3",
    },
    "selection": "a fit is made for a source with segment flux of at least 2000 electrons, its square of 2R+1 pixels inside the frame, no other source centroid within R+3 pixels, in frames with no mask",
    "conventions": "pixel (0, 0) is the centre of the first pixel; electrons are bias-subtracted ADU times the gain 1.5",
    "files": {
        p: sha(p)
        for p in [
            "tests/fixtures/detection/oracle-inputs.json",
            "tests/fixtures/detection/oracle-results.json",
            "tools/detection-oracle/oracle.py",
            "tools/detection-oracle/make-inputs.mjs",
            "tools/detection-synth.mjs",
        ]
    },
    "references": [
        "Bradley, L. et al., photutils (Zenodo release " + pk["photutils"] + ")",
        "Astropy Collaboration 2022, ApJ 935, 167",
        "Harris, C. R. et al. 2020, Nature 585, 357 (numpy)",
        "Virtanen, P. et al. 2020, Nature Methods 17, 261 (scipy)",
        "Bertin, E. and Arnouts, S. 1996, A&AS 117, 393 (SExtractor: the segment moments and the 1/12 rule)",
    ],
}
with open(root + "tests/fixtures/detection/oracle-provenance.json", "w") as fh:
    json.dump(rec, fh, indent=2)
    fh.write("\n")
