"""Pins craterstats 3.2.1's own output on the gate's grid (Prompt 196, R3).
Run: <new venv>/bin/python -I craterstats_pin.py <repo root>
"""
import json, sys
import numpy as np
import craterstats as cst

root = sys.argv[1]
fn = cst.gm.filename(cst.__file__, 'p') + 'config/functions.txt'
ora = json.load(open(f"{root}/tests/fixtures/crater-chronology-gate/oracle-results.json"))
cf = cst.Chronologyfn(fn, 'Moon, Neukum (1983)')
pf83 = cst.Productionfn(fn, 'Moon, Neukum (1983)')
pf01 = cst.Productionfn(fn, 'Moon, Neukum et al. (2001)')
a0 = -3.0768
D = ora["D"]
out = {
    "tool": {"craterstats": "3.2.1", "numpy": np.__version__, "flags": "python -I"},
    "D": D, "T": ora["T"],
    "pf1983": [float(pf83.evaluate('cumulative', d, a0=a0)) for d in D],
    "pf2001": [float(pf01.evaluate('cumulative', d, a0=a0)) for d in D],
    "n1": [float(cf.N1(t)) for t in ora["T"]],
}
out["age"] = [float(cf.t(n1=n)) for n in out["n1"]]
json.dump(out, open(f"{root}/tests/fixtures/crater-chronology-gate/craterstats-results.json", "w"), indent=1)
print("craterstats pin written")
