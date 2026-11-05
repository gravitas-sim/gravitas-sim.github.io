# Writes tests/fixtures/pulsars/constants-source.json: the two measured constants the dispersion
# constant is derived from, as the installed astropy gives them, with the library's own reference
# string and uncertainty. Nothing here is typed from memory; run offline:
#   /usr/local/bin/python3.9 tools/pulsar-oracle/constants.py > tests/fixtures/pulsars/constants-source.json
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
    "format": "gravitas.pulsar-constants-source/1",
    "reader": "tools/pulsar-oracle/constants.py (offline, no network)",
    "astropy": astropy.__version__,
    "note": "read from the installed library, not typed and not fetched; the library's reference string says which edition of the constants it holds, which is not necessarily the current one",
    "alpha": entry(const.alpha),
    "m_e": entry(const.m_e),
    "e": entry(const.e),
    "eps0": entry(const.eps0),
    "c": entry(const.c),
    "h": entry(const.h),
}
print(json.dumps(out, indent=2))
