"""
Writes tests/fixtures/injection/oracle-provenance.json (Prompt 184).

    <venv>/bin/python -I tools/injection-oracle/provenance.py <repository root>

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
    "format": "gravitas.injection-oracle-provenance/1",
    "prompt": 184,
    "oracle": "photutils " + pk["photutils"] + " with astropy " + pk["astropy"] + ", numpy " + pk["numpy"] + " and scipy " + pk["scipy"],
    "identity": "Independent, cited implementations; no Gravitas code ran: scipy.special.erf (the pixel-integrated Gaussian), numpy.random.Generator.poisson (the shot noise), photutils.background.Background2D (MedianBackground, StdBackgroundRMS), astropy.stats.SigmaClip, astropy.convolution (Gaussian2DKernel, convolve), photutils.segmentation (detect_sources, SourceCatalog), scipy.interpolate.RegularGridInterpolator, scipy.stats.beta.ppf (the exact binomial interval).",
    "retrieved": "2026-10-23",
    "index": "https://pypi.org/simple (pip default index; no mirror, no pip.conf, no PIP_* variable); the virtual environment is Prompt 180's, in which nothing was added for this prompt",
    "python": sys.version.split()[0] + " (" + platform.platform() + ", " + platform.machine() + ")",
    "packages": pk,
    "install": "python3.10 -m venv <scratchpad>/oracle180; <venv>/bin/python -m pip install --only-binary :all: numpy scipy astropy photutils (the resolved versions above); the venv is not committed and no package is",
    "run": "cd <empty scratchpad directory>; <venv>/bin/python -I tools/injection-oracle/oracle.py tests/fixtures/injection/oracle-inputs.json tests/fixtures/injection/oracle-results.json; then Prettier",
    "inputsFrom": "node tools/injection-oracle/make-inputs.mjs (a blank detector-kernel frame of a fixed seed in whole ADU and a plan of 4000 sources from the injection stream, both packed as base64), then Prettier",
    "committedBefore": "the oracle's inputs, script and results were committed before js/measure/inject.js existed; thresholds.json and INJECTION.md were committed before the oracle ran",
    "parameters": {
        "rendering": "a circular Gaussian of the stated FWHM (3 pixels) integrated over each pixel as the product of two separable differences of 0.5 (1 + erf) at the pixel edges, total electrons F",
        "noise": "numpy.random.default_rng(seed in the inputs).poisson(expected electrons of every pixel) added to the frame's electrons (whole ADU times the gain 1.5), one draw per pixel per trial, trials in order",
        "mesh": "Background2D(box_size=16, filter_size=1, exclude_percentile=100, SigmaClip(sigma=3, maxiters=10, cenfunc=median, stdfunc=std), MedianBackground(sigma_clip=None), StdBackgroundRMS(sigma_clip=None)); maps by RegularGridInterpolator(linear, bounds_error=False, fill_value=None), the noise floored at half the smallest box value",
        "smoothing": "Gaussian2DKernel(x_stddev=FWHM/2.3548, size 2 ceil(3 sigma) + 1, mode center, sum 1) as matrices of the weights as they land (repeated edge pixel), agreeing with astropy convolve(boundary='extend') to the value recorded as convolveAgreement; the smoothed noise sqrt(sum w^2 sigma^2) over the same weights",
        "segmentation": "detect_sources(smoothed, 4 x smoothed noise, npixels=5, connectivity=8); SourceCatalog(background-subtracted unsmoothed electrons, segmentation) centroids",
        "recovery": "a detection within 2 pixels of an injected source answers it, the nearest pairs first, each detection at most one source; a detection answering none and not within 2 pixels of a detection of the blank frame is extra",
        "interval": "the exact (Clopper-Pearson) interval: lo = beta.ppf(a/2, k, n - k + 1) (0 for k = 0), hi = beta.ppf(1 - a/2, k + 1, n - k) (1 for k = n), a = 1 - level",
    },
    "conventions": "pixel (0, 0) is the centre of the first pixel; electrons are bias-subtracted ADU times the gain 1.5",
    "files": {
        p: sha(p)
        for p in [
            "tests/fixtures/injection/oracle-inputs.json",
            "tests/fixtures/injection/oracle-results.json",
            "tools/injection-oracle/oracle.py",
            "tools/injection-oracle/make-inputs.mjs",
            "tools/detection-synth.mjs",
        ]
    },
    "references": [
        "Bradley, L. et al., photutils (Zenodo release " + pk["photutils"] + ")",
        "Astropy Collaboration 2022, ApJ 935, 167",
        "Harris, C. R. et al. 2020, Nature 585, 357 (numpy)",
        "Virtanen, P. et al. 2020, Nature Methods 17, 261 (scipy)",
        "Clopper, C. J. and Pearson, E. S. 1934, Biometrika 26, 404 (the exact binomial interval)",
    ],
}
with open(root + "tests/fixtures/injection/oracle-provenance.json", "w") as fh:
    json.dump(rec, fh, indent=2)
    fh.write("\n")
