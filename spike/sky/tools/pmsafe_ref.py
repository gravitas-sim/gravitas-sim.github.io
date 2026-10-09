#!/usr/bin/env python3
"""ERFA pmsafe positions (with parallax and radial velocity) of the spike's stars
at 1900.0, 2050.0 and 2100.0, from the BSC itself. usage: pmsafe_ref.py <dir> <out.json>"""
import sys, json, math, warnings
import erfa, numpy as np
warnings.simplefilter('ignore')
d, out = sys.argv[1], sys.argv[2]
D2R = math.pi / 180
def num(s, f=1.0):
    s = s.strip(); return None if s == '' else float(s) * f
rows = {}
for l in open(d + '/V_50_catalog', encoding='latin1'):
    if len(l.strip()) < 100: continue
    hr = int(l[0:4]); v = num(l[102:107])
    if v is None or v > 4.5: continue
    rah, ram, ras = num(l[75:77]), num(l[77:79]), num(l[79:83])
    if rah is None: continue
    sgn = -1 if l[83] == '-' else 1
    ded, dem, des = num(l[84:86]), num(l[86:88]), num(l[88:90])
    ra = (rah + ram / 60 + ras / 3600) * 15 * D2R
    de = sgn * (ded + dem / 60 + des / 3600) * D2R
    pmr = (num(l[148:154]) or 0.0) * D2R / 3600 / math.cos(de)   # rad/yr of RA (pmRA is cos(dec)*dRA/dt)
    pmd = (num(l[154:160]) or 0.0) * D2R / 3600
    px = num(l[161:166]) or 0.0; rv = num(l[166:170]) or 0.0
    res = {}
    for ep in (1900.0, 2050.0, 2100.0):
        jd1 = 2451545.0 + (ep - 2000.0) * 365.25
        a, b, c, e, f, g = erfa.pmsafe(ra, de, pmr, pmd, px, rv, 2451545.0, 0.0, jd1, 0.0)
        res[str(int(ep))] = [a / D2R, b / D2R]
    rows[hr] = {'ra0': ra / D2R, 'dec0': de / D2R, 'at': res}
json.dump(rows, open(out, 'w'))
print(len(rows))
