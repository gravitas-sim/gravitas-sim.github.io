#!/usr/bin/env python3 -I
"""Builds js/data/smallbodies/numbered-h13.json from the retrieved JPL SBDB response.

  python3 -I tools/small-bodies-pack.py <retrieved numbered_H13.json>

The response is read as data and never executed. Columns kept: the asteroid's number
(spkid - 2000000), a (AU), e, i (degrees), H. Rounded to 4, 4, 3 and 2 decimals.
"""
import hashlib, json, sys
src = sys.argv[1]
raw = open(src, 'rb').read()
d = json.loads(raw)
ix = {k: n for n, k in enumerate(d['fields'])}
rows = []
for r in d['data']:
    try:
        rows.append((int(r[ix['spkid']]) - 2000000, float(r[ix['a']]), float(r[ix['e']]), float(r[ix['i']]), float(r[ix['H']])))
    except (TypeError, ValueError):
        continue
rows.sort()
out = {
    "format": "gravitas.small-body-catalog/1",
    "id": "numbered-h13",
    "label": "Numbered minor planets with absolute magnitude H < 13 (a magnitude-cut catalog, not the population)",
    "source": "NASA/JPL Small-Body Database Query API, https://ssd-api.jpl.nasa.gov/sbdb_query.api, numbered objects, H < 13",
    "credit": "JPL Small-Body Database (a U.S. Government work); credited, not endorsed",
    "retrieved": "2026-10-27",
    "retrievedSha256": hashlib.sha256(raw).hexdigest(),
    "retrievedRows": len(d['data']),
    "selection": "Numbered objects with H < 13: the large objects that were discovered and then given a number. For the main belt this is below the survey's completeness limit (about H 15 to 16), so the cut shows the belt's gaps with little discovery bias; it says nothing about small bodies, and it is not the number of bodies there are. The outer belt and the Trojans are less complete than the inner belt at the same H.",
    "downsample": "none: every numbered object with H < 13 in the response is kept",
    "columns": ["number", "a", "e", "i", "H"],
    "units": {"a": "AU", "e": "1", "i": "degree", "H": "mag"},
    "n": len(rows),
    "number": [r[0] for r in rows],
    "a": [round(r[1], 4) for r in rows],
    "e": [round(r[2], 4) for r in rows],
    "i": [round(r[3], 3) for r in rows],
    "H": [round(r[4], 2) for r in rows],
}
open('js/data/smallbodies/numbered-h13.json', 'w').write(json.dumps(out, separators=(',', ':')) + '\n')
print(len(rows))
