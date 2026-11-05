# Writes tests/fixtures/agn/constants-source.json: the constants the Eddington luminosity is derived from
# (GM of the Sun, the proton mass, the Thomson cross section, c), as the installed astropy gives them, with the
# library's own reference string and uncertainty. Nothing here is typed from memory; run offline:
#   python3 tools/agn-oracle/constants.py > tests/fixtures/agn/constants-source.json
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
    "format": "gravitas.agn-constants-source/1",
    "reader": "tools/agn-oracle/constants.py (offline, no network)",
    "astropy": astropy.__version__,
    "note": "read from the installed library, not typed and not fetched; the library's reference string says which edition of the constants it holds, which is not necessarily the current one; GM_sun is the IAU nominal value as astropy holds it",
    "GM_sun": entry(const.GM_sun),
    "m_p": entry(const.m_p),
    "sigma_T": entry(const.sigma_T),
    "c": entry(const.c),
}
print(json.dumps(out, indent=2))
