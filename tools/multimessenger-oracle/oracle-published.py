#!/usr/bin/env python3
"""
Independent references for the authentic-data legs B2b, B4o and E1b of the multi-messenger gate (Prompt 244 follow-up).

    python3 -E tools/multimessenger-oracle/oracle-published.py > tests/fixtures/multimessenger/oracle-published.json

Reads only the supplied files under tests/fixtures/multimessenger/authentic/ and authentic-thresholds.json. It imports
no Gravitas code and no project code of any kind. Run offline, never by a test; its output is pinned and the validator
compares the kernel with the pinned output (tools/multimessenger-validate.mjs).

  parse    the leap-seconds.list parsed with re and datetime (B2b): entries, '#$' and '#@' numbers
  bound    the first-order speed bound (v_GW - v_EM)/v_EM = c (dt - tau)/D in exact rational arithmetic (B4o): c and the
           astronomical unit as exact integers, the parsec as 648000/pi astronomical units, pi from a Machin series
           (no constant typed), rounded half up to the printed figures
  delay    the trigger instant of the burst built from the FITS header's own reference epoch (MJDREFI + MJDREFF, TT) plus
           the elapsed seconds, then differenced from the pack's merger time on GPS through astropy.time (E1b); the
           leap-second table is astropy's (erfa's), which is not the list under test. Sockets are disabled in the script.
"""
import hashlib
import json
import re
import socket
import sys
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP, getcontext
from fractions import Fraction
from pathlib import Path



def _offline(*a, **k):
    raise OSError('this oracle runs offline')


socket.socket = _offline  # nothing may leave the machine, astropy's leap-second auto-update included
socket.create_connection = _offline

FIX = Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "multimessenger"
AUTH = FIX / "authentic"

# --- parse ------------------------------------------------------------------------------------------------------------
text = (AUTH / "leap-seconds.list").read_text()
entries, expiry, updated = [], None, None
for raw in text.splitlines():
    line = raw.strip()
    if line.startswith("#@"):
        expiry = int(line[2:].strip())
    elif line.startswith("#$"):
        updated = int(line[2:].strip())
    elif line and not line.startswith("#"):
        m = re.match(r"^(\d+)\s+(\d+)", line)
        if m:
            ntp, off = int(m.group(1)), int(m.group(2))
            d = datetime(1900, 1, 1) + timedelta(seconds=ntp)
            entries.append({"ntp": ntp, "from": d.strftime("%Y-%m-%d"), "taiMinusUtc": off})
parse = {"entries": entries, "expiryNtp": expiry, "lastUpdateNtp": updated}

# --- bound (exact rational) -------------------------------------------------------------------------------------------
getcontext().prec = 80


def arctan_inv(n):  # arctan(1/n) as a Decimal, alternating series
    n = Decimal(n)
    term = 1 / n
    total, k = term, 1
    while abs(term) > Decimal(10) ** -78:
        term = -term / (n * n)
        k += 2
        total += term / k
    return total


PI = 4 * (4 * arctan_inv(5) - arctan_inv(239))  # Machin
C = 299792458
AU = 149597870700
pc_m = Fraction(Decimal(648000) / PI) * AU
mpc_m = pc_m * 10**6

pub = json.loads((AUTH / "published-bound.json").read_text())
dt = Fraction(str(pub["delay"]["value"]))
tau_min = Fraction(str(pub["emissionDelay"]["min"]))
tau_max = Fraction(str(pub["emissionDelay"]["max"]))
dist = Fraction(str(pub["distance"]["value"])) * mpc_m
x_up = C * (dt - tau_min) / dist  # photons later than gravity by dt - tau: gravity faster (upper end)
x_lo = C * (dt - tau_max) / dist  # the largest delay assumed: gravity slower (lower end)
exact = lambda x: 1 / (1 - x) - 1  # noqa: E731  (the exact form of the same relation)


def round_sf(x, sf):
    d = Decimal(x.numerator) / Decimal(x.denominator)
    if d == 0:
        return 0.0
    exp = d.adjusted()
    q = Decimal(1).scaleb(exp - sf + 1)
    return float(d.quantize(q, rounding=ROUND_HALF_UP))


sf = pub["bound"]["printedSignificantFigures"]
printed = {"lower": float(pub["bound"]["lower"]), "upper": float(pub["bound"]["upper"])}
rounded = {"lower": round_sf(x_lo, sf), "upper": round_sf(x_up, sf)}
bound = {
    "inputs": {"delayS": float(dt), "distanceMpc": float(pub["distance"]["value"]), "tauMinS": float(tau_min), "tauMaxS": float(tau_max)},
    "mpcMetres": float(mpc_m),
    "firstOrder": {"lower": float(x_lo), "upper": float(x_up)},
    "exact": {"lower": float(exact(x_lo)), "upper": float(exact(x_up))},
    "printedSignificantFigures": sf,
    "rounded": rounded,
    "printed": printed,
    "roundedEqualsPrinted": rounded == printed,
}

# --- delay ------------------------------------------------------------------------------------------------------------
import astropy  # noqa: E402
from astropy.time import Time, TimeDelta  # noqa: E402

trig = json.loads((AUTH / "grb-trigger.json").read_text())
thr = json.loads((FIX / "authentic-thresholds.json").read_text())
header = trig["header"]
assert header["TIMESYS"] == "TT" and header["TIMEUNIT"] == "s"
mjdref_i = int(header["MJDREFI"])
mjdref_f = float(str(header["MJDREFF"]).replace("D", "e"))
met = float(trig["trigger"]["value"])
t0 = Time(mjdref_i, mjdref_f, format="mjd", scale="tt")
t_trig = t0 + TimeDelta(met, format="sec")
merger_gps = thr["packMergerGps"]["value"]
t_merger = Time(merger_gps, format="gps")
delta = (t_trig.tai - t_merger.tai).to("s").value
epoch_utc = t0.utc.isot
delay = {
    "astropy": astropy.__version__,
    "referenceEpoch": {"mjdrefI": mjdref_i, "mjdrefF": mjdref_f, "scale": "tt", "asUtc": epoch_utc},
    "triggerMetS": met,
    "triggerGps": float(t_trig.gps),
    "triggerUtc": t_trig.utc.isot,
    "packMergerGps": merger_gps,
    "triggerMinusMergerS": float(delta),
}

json.dump(
    {
        "format": "gravitas.multimessenger-oracle-published/1",
        "note": "independent references for B2b, B4o and E1b; pinned, never run by a test (python -E, no Gravitas code)",
        "python": sys.version.split()[0],
        "inputs": {
            name: hashlib.sha256(path.read_bytes()).hexdigest()
            for name, path in {
                "leap-seconds.list": AUTH / "leap-seconds.list",
                "published-bound.json": AUTH / "published-bound.json",
                "grb-trigger.json": AUTH / "grb-trigger.json",
                "authentic-thresholds.json": FIX / "authentic-thresholds.json",
            }.items()
        },
        "parse": parse,
        "bound": bound,
        "delay": delay,
    },
    sys.stdout,
    indent=1,
)
sys.stdout.write("\n")
