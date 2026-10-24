"""
Writes tests/fixtures/orbit-fit/oracle-provenance.json (Prompt 187).

    <venv>/bin/python -I tools/orbit-fit-oracle/provenance.py <repository root>

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
pk = {n: version(n) for n in ["astropy", "numpy", "scipy", "pyerfa", "photutils"]}


def sha(p):
    return hashlib.sha256(open(root + p, "rb").read()).hexdigest()


rec = {
    "format": "gravitas.orbit-fit-oracle-provenance/1",
    "prompt": 187,
    "oracle": "scipy " + pk["scipy"] + " (optimize.brentq, least_squares, curve_fit) with numpy " + pk["numpy"] + " and astropy " + pk["astropy"] + " (SkyCoord.position_angle, constants, units)",
    "identity": "Independent, cited implementations; no Gravitas code ran: an own Kepler solver (scipy.optimize.brentq on E - e sin E = M), own rotations (numpy matrices), the Thiele-Innes model fitted by scipy.optimize.least_squares (method trf, three-point differences, diff_step 1e-6, x_scale jac, tolerances 1e-15), the covariance inv(J^T J); a weighted straight line fitted by scipy.optimize.curve_fit with absolute sigmas; astropy.coordinates.SkyCoord.position_angle for the local position angle; astropy.constants (GM_sun, au) and astropy.units for Kepler's third-law constant; numpy.random.default_rng for epochs, positions and noise.",
    "retrieved": "2026-10-24",
    "index": "https://pypi.org/simple (pip default index; no mirror, no pip.conf, no PIP_* variable); the virtual environment is Prompt 180's, in which nothing was added for this prompt",
    "python": sys.version.split()[0] + " (" + platform.platform() + ", " + platform.machine() + ")",
    "packages": pk,
    "install": "python3.10 -m venv <scratchpad>/oracle180; <venv>/bin/python -m pip install --only-binary :all: numpy scipy astropy photutils (the resolved versions above); the venv is not committed and no package is",
    "run": "cd <empty scratchpad directory>; <venv>/bin/python -I tools/orbit-fit-oracle/oracle.py tools/orbit-fit-oracle/oracle-inputs.json tests/fixtures/orbit-fit/oracle-results.json; then Prettier",
    "committedBefore": "thresholds.json and ASTROMETRY.md's contract were committed before the oracle's inputs and script existed; the oracle's inputs, script and results were committed before the validation tool, the tests and the panel existed",
    "parameters": {
        "orbit": "a = elements in arcseconds, degrees, years; north and east offsets from R_z(Omega) R_x(i) R_z(omega) applied to the orbital-plane position (a (cos E - e), a sqrt(1-e^2) sin E, 0); epochs: an even grid over arc x P from startYear, the ten or more interior epochs jittered by +-0.3 of the spacing (numpy.random.default_rng(noiseSeed), uniform, drawn first); noise: sigma x standard normals (n by 2, north then east) drawn next from the same generator",
        "fit": "scipy.optimize.least_squares(method='trf', jac='3-point', diff_step=1e-6, x_scale='jac', xtol=ftol=gtol=1e-15, max_nfev=2000) on (P, e, T, A, B, F, G) (elliptical) or (P, A, B, F, G) with T fixed at 0 and epochs referred to the first (circular); residuals in sigma units; started at 1.01 P, 1.03 e, T + 0.01 P and 1.02 or 0.98 times the Thiele-Innes constants; sigma of P and of a by the gradient of a = (hypot(A+G, B-F) + hypot(A-G, B+F)) / 2 through inv(J^T J)",
        "track": "static sources uniform in a square of fieldArcsec; the mover x0 + v t, y0 + v t with v = rate (sin PA, cos PA) in arcseconds per hour east and north; error sigma added in the tangent plane to every position of every frame; inverse gnomonic projection to (ra, dec); the fit is on the mover's tangent-plane offsets rebuilt by the forward gnomonic projection, scipy.optimize.curve_fit(absolute_sigma=True) per axis about the mean epoch; the local position angle by astropy SkyCoord.position_angle from the line's position at the mean epoch to its position one hour later",
        "kepler": "4 pi^2 au^3 / (GM_sun (365.25 d)^2) with astropy.constants au and GM_sun (IAU 2015 nominal)",
    },
    "conventions": "positions in arcseconds (north, east), epochs decimal Julian years (orbits) and Julian dates (tracks), angles in degrees, position angle from north through east, rates in arcseconds per hour",
    "files": {
        p: sha(p)
        for p in [
            "tools/orbit-fit-oracle/oracle-inputs.json",
            "tools/orbit-fit-oracle/oracle.py",
            "tests/fixtures/orbit-fit/oracle-results.json",
        ]
    },
    "references": [
        "Astropy Collaboration 2022, ApJ 935, 167",
        "Harris, C. R. et al. 2020, Nature 585, 357 (numpy)",
        "Virtanen, P. et al. 2020, Nature Methods 17, 261 (scipy)",
        "Thiele, T. N. 1883, Astron. Nachr. 104, 245; Innes, R. T. A. 1927 (the Thiele-Innes constants)",
        "Heintz, W. D. 1978, Double Stars (the elements and their conventions)",
    ],
}
with open(root + "tests/fixtures/orbit-fit/oracle-provenance.json", "w") as fh:
    json.dump(rec, fh, indent=2)
    fh.write("\n")
