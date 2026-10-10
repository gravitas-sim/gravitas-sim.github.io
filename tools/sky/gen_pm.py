#!/usr/bin/env python3
"""ERFA pmsafe positions (with parallax and radial velocity, which the kernel
neglects) of the pack's stars at 1900.0, 2050.0 and 2100.0, from the raw
catalogue itself, thinned to every fourth star plus every star that moves more
than 1 arcsecond a year. Writes tests/fixtures/sky/pmsafe.json.
usage: python3 tools/sky/gen_pm.py [.packs-cache/cds-v50-bsc5-catalog.gz]"""
import sys, json, math, gzip, os, warnings
import erfa
warnings.simplefilter('ignore')
src = sys.argv[1] if len(sys.argv) > 1 else '.packs-cache/cds-v50-bsc5-catalog.gz'
D2R = math.pi / 180
def num(s, f=1.0):
    s = s.strip(); return None if s == '' else float(s) * f
rows = []
for l in gzip.open(src, 'rt', encoding='latin1'):
    if len(l.strip()) < 100: continue
    hr = int(l[0:4]); v = num(l[102:107])
    if v is None or v > 4.5: continue
    rah, ram, ras = num(l[75:77]), num(l[77:79]), num(l[79:83])
    if rah is None: continue
    sgn = -1 if l[83] == '-' else 1
    ded, dem, des = num(l[84:86]), num(l[86:88]), num(l[88:90])
    ra = (rah + ram / 60 + ras / 3600) * 15 * D2R
    de = sgn * (ded + dem / 60 + des / 3600) * D2R
    pmra, pmde = (num(l[148:154]) or 0.0), (num(l[154:160]) or 0.0)
    pmr = pmra * D2R / 3600 / math.cos(de)
    pmd = pmde * D2R / 3600
    px = num(l[161:166]) or 0.0; rv = num(l[166:170]) or 0.0
    res = {}
    for ep in (1900.0, 2050.0, 2100.0):
        jd1 = 2451545.0 + (ep - 2000.0) * 365.25
        a, b, c, e, f, g = erfa.pmsafe(ra, de, pmr, pmd, px, rv, 2451545.0, 0.0, jd1, 0.0)
        res[str(int(ep))] = [round(a / D2R, 7), round(b / D2R, 7)]
    rows.append({'hr': hr, 'pm': math.hypot(pmra, pmde), 'at': res})
out = [{'hr': r['hr'], 'at': r['at']} for i, r in enumerate(rows) if i % 4 == 0 or r['pm'] > 1.0]
dest = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tests', 'fixtures', 'sky', 'pmsafe.json')
json.dump(out, open(dest, 'w'), separators=(',', ':'))
print(len(out))
