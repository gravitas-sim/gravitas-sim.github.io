"""
Writes tests/fixtures/tides/oracle-provenance.json (Prompt 204).

    <venv>/bin/python -I tools/tides-oracle/provenance.py <repository root>

Records what produced the pinned fixtures: the package versions of the venv it
runs in, the parameters and the SHA-256 of the fixtures and scripts as committed.
Never run by a test.
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
    "format": "gravitas.tides-oracle-provenance/1",
    "prompt": 204,
    "oracle": "numpy " + pk["numpy"] + " and scipy " + pk["scipy"] + " (integrate.solve_ivp, DOP853, rtol 1e-12)",
    "identity": "An independent implementation of the closed forms from their definitions in Python floats, and a numerical integration of the constant-Q recession da/dt = C a^(-11/2) that does not use the closed-form solution the kernel uses; no Gravitas code ran.",
    "retrieved": "2026-10-25",
    "index": "none: Prompt 180's scratch virtual environment as it was; nothing was added for this prompt",
    "python": sys.version.split()[0] + " (" + platform.platform() + ", " + platform.machine() + ")",
    "packages": pk,
    "run": "cd <empty scratchpad directory>; <venv>/bin/python -I tools/tides-oracle/oracle.py tools/tides-oracle/oracle-inputs.json tests/fixtures/tides/oracle-results.json; then Prettier",
    "committedBefore": "thresholds.json and TIDAL_KERNEL.md's contract were committed (58ea49ab) before the oracle's inputs and script existed; the oracle's results were committed before js/kernels/tides/, the validation tool and the tests existed",
    "files": {
        p: sha(p)
        for p in [
            "tools/tides-oracle/oracle-inputs.json",
            "tools/tides-oracle/oracle.py",
            "tests/fixtures/tides/oracle-results.json",
        ]
    },
}
with open(root + "tests/fixtures/tides/oracle-provenance.json", "w") as fh:
    json.dump(rec, fh, indent=2)
    fh.write("\n")
