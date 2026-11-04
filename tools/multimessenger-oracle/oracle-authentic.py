#!/usr/bin/env python3
"""
astropy's time conversions for the authentic-table leg B2 of the multi-messenger kernel (Prompt 244).

    python3 tools/multimessenger-oracle/oracle-authentic.py > tests/fixtures/multimessenger/oracle-astropy-times.json

Reads the UTC calendar instants pinned in oracle-results.json (those with second < 60 and a year up to 2024, so each
is a real UTC instant) and writes, for each, astropy's GPS time and Fermi mission elapsed time (SI seconds since
2001-01-01T00:00:00 UTC) from astropy's own (erfa) leap-second table. It reads no leap-second list the project holds:
the kernel's result under the list Carl supplies is compared with this in tools/multimessenger-validate.mjs (B2).
Run offline, never by a test. In the session's Python astropy's leap-second auto-update fails at its PyYAML import before
any network access, so the table is erfa's bundled one; run it with the network off elsewhere.
"""
import json
import sys
from pathlib import Path

from astropy.time import Time, TimeDelta

FIX = Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "multimessenger"
rows = json.loads((FIX / "oracle-results.json").read_text())["time"]
t0 = Time("2001-01-01T00:00:00", scale="utc")
out = []
for r in rows:
    u = r["utc"]
    if u["second"] >= 60 or u["year"] > 2024:
        continue
    sec = u["second"]
    whole = int(sec)
    frac = sec - whole
    iso = f'{u["year"]:04d}-{u["month"]:02d}-{u["day"]:02d}T{u["hour"]:02d}:{u["minute"]:02d}:{whole:02d}'
    t = Time(iso, scale="utc") + TimeDelta(frac, format="sec")
    out.append({"utc": u, "gps": float(t.gps), "met": float((t.tai - t0.tai).to("s").value)})
json.dump({
    "format": "gravitas.multimessenger-oracle-astropy-times/1",
    "note": "astropy.time (erfa leap seconds) GPS and Fermi MET of the instants of oracle-results.json; pinned, never run by a test",
    "astropy": __import__("astropy").__version__,
    "rows": out,
}, sys.stdout, separators=(",", ":"))
sys.stdout.write("\n")
