# Writes tests/fixtures/ism/constants-source.json: the constants the classical electron radius is derived
# from, as the installed astropy gives them, with the library's own reference string and uncertainty.
# Nothing here is typed from memory; run offline:
#   python3 tools/ism-oracle/constants.py > tests/fixtures/ism/constants-source.json
import json
import astropy
import astropy.constants as const

def entry(c):
    return {
        "name": c.name,
        "value": c.value,
        "unit": str(c.unit),
        "uncertainty": c.uncertainty,
        "reference": c.reference,
        "system": c.system,
    }

out = {
    "format": "gravitas.ism-constants-source/1",
    "reader": "tools/ism-oracle/constants.py (offline, no network)",
    "astropy": astropy.__version__,
    "note": "read from the installed library, not typed and not fetched; the library's reference string says which edition of the constants it holds, which is not necessarily the current one",
    "alpha": entry(const.alpha),
    "h": entry(const.h),
    "m_e": entry(const.m_e),
    "c": entry(const.c),
    "e": entry(const.e),
    "eps0": entry(const.eps0),
}
print(json.dumps(out, indent=2))
