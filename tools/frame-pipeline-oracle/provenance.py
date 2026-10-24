"""
Writes tests/fixtures/framepipeline/oracle-provenance.json (Prompt 185).

    <venv>/bin/python -I tools/frame-pipeline-oracle/provenance.py <repository root>

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
    "format": "gravitas.frame-pipeline-oracle-provenance/1",
    "prompt": 185,
    "oracle": "photutils " + pk["photutils"] + " with astropy " + pk["astropy"] + ", numpy " + pk["numpy"] + " and scipy " + pk["scipy"],
    "identity": "Independent, cited implementations; no Gravitas code ran: numpy (median and mean masters, the calibration algebra), scipy.signal.fftconvolve and scipy.ndimage.gaussian_filter (the FFT cross-correlation that finds each frame's shift), photutils.aperture (CircularAperture with method exact, CircularAnnulus, ApertureStats with astropy SigmaClip), astropy.timeseries.LombScargle (the sinusoid).",
    "retrieved": "2026-10-23",
    "index": "https://pypi.org/simple (pip default index; no mirror, no pip.conf, no PIP_* variable); the virtual environment is Prompt 180's, in which nothing was added for this prompt",
    "python": sys.version.split()[0] + " (" + platform.platform() + ", " + platform.machine() + ")",
    "packages": pk,
    "install": "python3.10 -m venv <scratchpad>/oracle180; <venv>/bin/python -m pip install --only-binary :all: numpy scipy astropy photutils (the resolved versions above); the venv is not committed and no package is",
    "run": "cd <empty scratchpad directory>; <venv>/bin/python -I tools/frame-pipeline-oracle/oracle.py tests/fixtures/framepipeline/oracle-inputs.json tests/fixtures/framepipeline/oracle-results.json; then Prettier",
    "inputsFrom": "node tools/frame-pipeline-oracle/make-inputs.mjs (the committed scene, seed fp-b-1, 48 frames and the lab's calibration set, whole counts, each frame deflated and packed as base64), then Prettier",
    "committedBefore": "the oracle's script was committed before its results existed and before the validation tool read them; thresholds.json and FRAME_PIPELINE.md were committed before the oracle ran",
    "parameters": {
        "masters": "bias = numpy.median over the bias frames; dark = numpy.median over (dark - bias); flat = mean over (flat - bias - 5/120 dark) divided by its own mean",
        "calibration": "(raw - bias - (60 / 120) dark) / flat, in counts, times the gain 1.5",
        "shift": "scipy.signal.fftconvolve of the star field smoothed by gaussian_filter(sigma 1.5, the median removed) with the reference, the integer peak and a parabolic refinement on each axis; a translation only",
        "aperture": "CircularAperture r and CircularAnnulus r_in, r_out as Gravitas's marks stage chose them (recorded in the inputs), aperture_photometry method exact; sky = ApertureStats(annulus, method center, SigmaClip(sigma 3, maxiters 5)).mean; net = sum - sky x exact area",
        "sinusoid": "LombScargle(t, dm) (floating mean, unweighted) over frequencies from 1/(baseline/2) to 1/(4 median cadences), 400001 samples; model_parameters at the highest power",
    },
    "conventions": "pixel (0, 0) is the centre of the first pixel; electrons are counts times the gain 1.5 after calibration",
    "files": {
        p: sha(p)
        for p in [
            "tests/fixtures/framepipeline/oracle-inputs.json",
            "tests/fixtures/framepipeline/oracle-results.json",
            "tools/frame-pipeline-oracle/oracle.py",
            "tools/frame-pipeline-oracle/make-inputs.mjs",
            "tools/frame-pipeline-synth.mjs",
        ]
    },
    "references": [
        "Howell, S. B. 2006, Handbook of CCD Astronomy, 2nd ed. (Cambridge University Press): the calibration recipe and the CCD equation",
        "Bradley, L. et al., photutils (Zenodo release " + pk["photutils"] + ")",
        "Astropy Collaboration 2022, ApJ 935, 167 (astropy, LombScargle)",
        "Harris, C. R. et al. 2020, Nature 585, 357 (numpy)",
        "Virtanen, P. et al. 2020, Nature Methods 17, 261 (scipy)",
    ],
}
with open(root + "tests/fixtures/framepipeline/oracle-provenance.json", "w") as fh:
    json.dump(rec, fh, indent=2)
    fh.write("\n")
