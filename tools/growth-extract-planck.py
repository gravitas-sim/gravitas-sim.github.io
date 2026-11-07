"""Reads the printed 'Plik best fit' column of Table 1 of Planck 2018 VI from Carl's saved extracted text.

python -E tools/growth-extract-planck.py <saved-text> <out.json>

Nothing is typed by hand: every value is the first number after a row label on its line, and the line
number and text are recorded beside it.
"""
import hashlib, json, re, sys, unicodedata

src, out = sys.argv[1], sys.argv[2]
raw = open(src, "rb").read()
sha = hashlib.sha256(raw).hexdigest()
lines = [unicodedata.normalize("NFKC", l) for l in raw.decode("utf-8").split("\n")]
FLOAT = r"[-+]?\d+\.\d+"

def first_float(line, after_dots=True):
    m = re.search(r"(?:\.\s){2,}\.?\s*(" + FLOAT + ")", line)
    return m.group(1) if m else None

hdr = next(i for i, l in enumerate(lines) if re.search(r"Parameter\s+Plik best fit\s+Plik \[1\]", l))
values, where = {}, []
rows = [
    ("omegaCh2", r"^\s*Ωc h2\s*\."),
    ("lnAs1e10", r"^\s*ln\(1010 As \)\s*\."),
    ("ns", r"^\s*ns\s*\."),
    ("omegaMh2", r"^\s*Ωm h2\s*\."),
    ("H0", r"^\s*H0 \[ km s−1 Mpc−1 \]\s*\."),
    ("Om", r"^\s*Ωm\s*\.\s"),
    ("sigma8", r"^\s*σ8\s*\."),
]
# the first row's label is split over lines; its numbers are on the first data line that starts with a float
for i in range(hdr + 1, hdr + 4):
    m = re.match(r"^\s*(" + FLOAT + r")\s", lines[i])
    if m:
        values["omegaBh2"] = m.group(1)
        where.append({"key": "omegaBh2", "line": i + 1, "text": lines[i].strip(), "note": "the row label (Omega_b h^2) is split over the lines before this one"})
        break
for key, pat in rows:
    for i in range(hdr + 1, hdr + 40):
        if re.search(pat, lines[i]):
            v = first_float(lines[i])
            assert v is not None, (key, lines[i])
            values[key] = v
            where.append({"key": key, "line": i + 1, "text": lines[i].strip()})
            break
    else:
        raise SystemExit("row not found: " + key)
# the pivot scale of the A_s definition: the number printed after 'pivot scale k0 =' (split over two lines)
for i, l in enumerate(lines):
    if "pivot scale k0 =" in l:
        m = re.search(r"(\d+\.\d+) Mpc", lines[i + 1]) or re.search(r"(\d+\.\d+) Mpc", lines[i + 2])
        assert m, (lines[i], lines[i + 1], lines[i + 2])
        values["k0PerMpc"] = m.group(1)
        where.append({"key": "k0PerMpc", "line": i + 1, "text": l.strip(), "next": [lines[i + 1].strip(), lines[i + 2].strip()]})
        break
else:
    raise SystemExit("pivot not found")
doc = {
    "format": "gravitas.growth-planck-best-fit/1",
    "note": "Written by tools/growth-extract-planck.py on spike/structure-growth-gate from the saved extracted text of arXiv:1807.06209 (Carl's session, 2026-11-06), by line, after thresholds.json (authentic.X1) and before the validator was run; nothing typed by hand. Values are the printed strings; Omega_m h^2 and Omega_m include one neutrino of 0.06 eV (the table caption).",
    "source": {"identifier": "arXiv:1807.06209", "savedTextSha256": sha, "rights": "D-R10-255-11 (same document, same use: printed numbers, no text reproduced)", "column": "Plik best fit, Table 1"},
    "values": values,
    "where": where,
}
open(out, "w", encoding="utf-8").write(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
print(json.dumps(values))
