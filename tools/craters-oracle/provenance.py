"""
Writes tests/fixtures/craters/oracle-provenance.json (Prompt 195).

    <venv>/bin/python -I tools/craters-oracle/provenance.py <repository root>

Records what produced the pinned fixtures: the package versions of the venv it
runs in, the parameters, the retrieval date and the SHA-256 of the fixtures and
scripts as committed. Never run by a test.
"""

import hashlib
import json
import platform
import sys
from importlib.metadata import version

root = sys.argv[1].rstrip("/") + "/"
pk = {n: version(n) for n in ["numpy", "scipy"]}


def sha(p):
    return hashlib.sha256(open(root + p, "rb").read()).hexdigest()


rec = {
    "format": "gravitas.craters-oracle-provenance/1",
    "prompt": 195,
    "oracle": "scipy " + pk["scipy"] + " (stats.chi2.ppf, stats.beta.ppf, stats.pareto.fit) with numpy " + pk["numpy"] + " (random.default_rng)",
    "identity": "An independent implementation of the statistics from their definitions; no Gravitas code ran. Garwood's exact Poisson interval from chi-square quantiles, the Clopper-Pearson interval of a binomial proportion from beta quantiles and the density ratio p / (1 - p) times the area ratio, the maximum-likelihood Pareto index (scipy.stats.pareto.fit with the location and scale fixed) and its exact chi-square interval. It is not a crater-statistics tool: craterstats (Michael and Neukum) is not installed in the oracle environment and nothing may be installed or fetched, so tier b4 of the contract is NOT RUN.",
    "retrieved": "2026-10-25",
    "index": "none: Prompt 180's scratch virtual environment as it was; nothing was added for this prompt",
    "python": sys.version.split()[0] + " (" + platform.platform() + ", " + platform.machine() + ")",
    "packages": pk,
    "run": "cd <empty scratchpad directory>; <venv>/bin/python -I tools/craters-oracle/oracle.py tools/craters-oracle/oracle-inputs.json tests/fixtures/craters/oracle-results.json; then Prettier",
    "committedBefore": "thresholds.json and CRATER_COUNTING.md's contract were committed (33f9c8f2) before the oracle's inputs and script existed; the oracle's inputs, script and results were committed before js/measure/craters.js, the validation tool and the tests existed",
    "parameters": {
        "list": "numpy.random.default_rng(195).pareto(1.8, 300) shifted to x = 1 km (1 + lomax), sorted large to small; area 5000 km^2",
        "curve": "20 thresholds 1 km * 2^(k/4), counts of x >= threshold, Garwood ends (chi2.ppf(a, 2N) / 2 and chi2.ppf(1 - a, 2N + 2) / 2, a = (1 - level) / 2) divided by the area",
        "ratio": "Clopper-Pearson ends (beta.ppf(a, k, n - k + 1), beta.ppf(1 - a, k + 1, n - k)) for k = na, n = na + nb, mapped to p / (1 - p) times areaB / areaA",
        "slope": "x >= dMin of the list, S = sum ln(x / dMin), the index from pareto.fit(x, floc=0, fscale=dMin), the interval chi2.ppf(a, 2n) / (2 S) to chi2.ppf(1 - a, 2n) / (2 S)",
    },
    "files": {
        p: sha(p)
        for p in [
            "tools/craters-oracle/oracle-inputs.json",
            "tools/craters-oracle/oracle.py",
            "tests/fixtures/craters/oracle-results.json",
        ]
    },
    "references": [
        "Garwood, F. 1936, Biometrika 28, 437",
        "Clopper, C. J. and Pearson, E. S. 1934, Biometrika 26, 404",
        "Clauset, A., Shalizi, C. R. and Newman, M. E. J. 2009, SIAM Review 51, 661",
        "Harris, C. R. et al. 2020, Nature 585, 357 (numpy)",
        "Virtanen, P. et al. 2020, Nature Methods 17, 261 (scipy)",
    ],
}
with open(root + "tests/fixtures/craters/oracle-provenance.json", "w") as fh:
    json.dump(rec, fh, indent=2)
    fh.write("\n")
