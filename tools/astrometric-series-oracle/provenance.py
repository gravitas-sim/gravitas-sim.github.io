"""
Writes tests/fixtures/astrometric-series/oracle-provenance.json (Prompt 186).

    <venv>/bin/python -I tools/astrometric-series-oracle/provenance.py <repository root>

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
pk = {n: version(n) for n in ["astropy", "numpy", "scipy", "pyerfa", "astropy-iers-data", "photutils"]}


def sha(p):
    return hashlib.sha256(open(root + p, "rb").read()).hexdigest()


rec = {
    "format": "gravitas.astrometric-series-oracle-provenance/1",
    "prompt": 186,
    "oracle": "astropy " + pk["astropy"] + " (coordinates.get_body_barycentric, time) with numpy " + pk["numpy"] + " and scipy " + pk["scipy"],
    "identity": "Independent, cited implementations; no Gravitas code ran: astropy.coordinates.get_body_barycentric('earth') with the built-in ephemeris (ERFA epv00 of pyerfa " + pk["pyerfa"] + ", nothing downloaded), astropy.time (ERFA time-scale conversions, leap-second table), scipy.optimize.least_squares (method lm, the exact spherical five-parameter astrometric model of a source with constant barycentric velocity, the normalised vector from the Earth to the source), scipy.optimize.curve_fit with absolute sigmas (straight lines in the tangent plane), numpy.random.default_rng (the noise).",
    "retrieved": "2026-10-23",
    "index": "https://pypi.org/simple (pip default index; no mirror, no pip.conf, no PIP_* variable); the virtual environment is Prompt 180's, in which nothing was added for this prompt",
    "python": sys.version.split()[0] + " (" + platform.platform() + ", " + platform.machine() + ")",
    "packages": pk,
    "install": "python3.10 -m venv <scratchpad>/oracle180; <venv>/bin/python -m pip install --only-binary :all: numpy scipy astropy photutils (the resolved versions above); the venv is not committed and no package is",
    "run": "cd <empty scratchpad directory>; <venv>/bin/python -I tools/astrometric-series-oracle/oracle.py tools/astrometric-series-oracle/oracle-inputs.json tests/fixtures/astrometric-series/oracle-results.json; then Prettier",
    "committedBefore": "thresholds.json and ASTROMETRY.md's contract were committed before the oracle's inputs and script existed, and the oracle's inputs, script and results were committed before js/measure/astrometric-series.js existed",
    "parameters": {
        "model": "x(t) = D (p0 + m (t - t0)) with D = 648000 / (pi parallax) au, p0 the unit vector of (ra, dec), m = mu_a* e_alpha + mu_d e_delta in radians per Julian year, t0 the first epoch; the apparent direction is (x - r_Earth) normalised, r_Earth the barycentric position in au from astropy; no aberration, no light deflection, no light time",
        "noise": "numpy.random.default_rng(noiseSeed): sigma-scaled normals, first the n right ascension offsets (divided by cos dec) and then the n declination offsets, in arcseconds",
        "sphericalFit": "scipy.optimize.least_squares(method='lm', x_scale='jac', xtol=ftol=gtol=1e-15), parameters the offsets in arcseconds of the first-epoch position from the truth, mu_a*, mu_d and the parallax, started at 1.05, 0.95 and 1.1 times the truth; residuals in sigma units; covariance inv(J^T J)",
        "lineFit": "xi and eta (arcsec) of a gnomonic projection about the normalised mean of the unit vectors; the weighted mean epoch as reference; scipy.optimize.curve_fit(absolute_sigma=True, an analytic Jacobian, started at 0.1 and 0.1)",
        "times": "astropy.time.Time(jd, format='jd', scale='utc'), .tt and .tdb; offsets in seconds from the two-part Julian dates",
    },
    "conventions": "angles in degrees, epochs TDB Julian dates, positions in au in the ICRS-aligned equatorial frame, proper motion mu_a* in arcseconds per Julian year (the right-ascension rate times cos dec)",
    "files": {
        p: sha(p)
        for p in [
            "tools/astrometric-series-oracle/oracle-inputs.json",
            "tools/astrometric-series-oracle/oracle.py",
            "tests/fixtures/astrometric-series/oracle-results.json",
        ]
    },
    "references": [
        "Astropy Collaboration 2022, ApJ 935, 167",
        "Harris, C. R. et al. 2020, Nature 585, 357 (numpy)",
        "Virtanen, P. et al. 2020, Nature Methods 17, 261 (scipy)",
        "Wallace, P. T. and Capitaine, N. 2006, A&A 459, 981; SOFA/ERFA epv00 (the Earth's barycentric ephemeris)",
        "Lindegren, L. et al. 2012, A&A 538, A78 (the standard astrometric model of a single star)",
    ],
}
with open(root + "tests/fixtures/astrometric-series/oracle-provenance.json", "w") as fh:
    json.dump(rec, fh, indent=2)
    fh.write("\n")
