"""Reference distances for the FLRW kernel gate, computed offline and pinned.

Tier 1: astropy.cosmology (FlatLambdaCDM / LambdaCDM, Tcmb0 = 0).
Tier 2: SciPy QUADPACK on the defining integrals, epsrel 1e-13.
Radiation: astropy with Tcmb0 = 2.7255 K, Neff = 3.046, massless neutrinos.
The grid is the one fixed in THRESHOLDS.md. Output: refs.json.
"""
import json, math, sys
import numpy as np, scipy, astropy
from scipy.integrate import quad
from astropy.cosmology import FlatLambdaCDM, LambdaCDM
import astropy.units as u

OM = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.7, 0.9, 1.0]
H0 = [50, 70, 90]
Z = [0.001, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 1.5, 2, 3, 5, 10]
C = 299792.458
MPC_KM = 3.0856775814913673e19
GYR = MPC_KM / (365.25 * 86400) / 1e9  # (1/H0) in Gyr for H0 = 1

def families(om):
    out = [("flat", 1 - om)]
    if om < 1:
        out.append(("open-lambda", (1 - om) / 2))
        out.append(("open-matter", 0.0))
    return out

def tier2(h0, om, ol, z):
    ok = 1 - om - ol
    E = lambda x: math.sqrt(om * (1 + x) ** 3 + max(ok, 0) * (1 + x) ** 2 + ol)
    dh = C / h0
    dc = dh * quad(lambda x: 1 / E(x), 0, z, epsabs=0, epsrel=1e-13, limit=500)[0]
    if ok > 1e-12:
        s = math.sqrt(ok)
        dm = dh / s * math.sinh(s * dc / dh)
    else:
        dm = dc
    lb = GYR / h0 * quad(lambda x: 1 / ((1 + x) * E(x)), 0, z, epsabs=0, epsrel=1e-13, limit=500)[0]
    return dict(dc=dc, dm=dm, dl=(1 + z) * dm, da=dm / (1 + z), lb=lb)

rows = []
for om in OM:
    for fam, ol in families(om):
        for h0 in H0:
            if fam == "flat":
                cos = FlatLambdaCDM(H0=h0, Om0=om, Tcmb0=0)
            else:
                cos = LambdaCDM(H0=h0, Om0=om, Ode0=ol, Tcmb0=0)
            for z in Z:
                a = dict(
                    dc=cos.comoving_distance(z).to(u.Mpc).value,
                    dm=cos.comoving_transverse_distance(z).to(u.Mpc).value,
                    dl=cos.luminosity_distance(z).to(u.Mpc).value,
                    da=cos.angular_diameter_distance(z).to(u.Mpc).value,
                    lb=cos.lookback_time(z).to(u.Gyr).value,
                )
                rows.append(dict(family=fam, Om=om, OL=ol, H0=h0, z=z, astropy=a, quad=tier2(h0, om, ol, z)))

# Radiation: flat family, as the neglect error in D_L.
rad = []
for om in OM:
    for h0 in H0:
        base = FlatLambdaCDM(H0=h0, Om0=om, Tcmb0=0)
        wr = FlatLambdaCDM(H0=h0, Om0=om, Tcmb0=2.7255, Neff=3.046, m_nu=0 * u.eV)
        for z in Z:
            dl0 = base.luminosity_distance(z).value
            dl1 = wr.luminosity_distance(z).value
            rad.append(dict(Om=om, H0=h0, z=z, relErrDL=(dl0 - dl1) / dl1))

json.dump(
    dict(
        versions=dict(astropy=astropy.__version__, scipy=scipy.__version__, numpy=np.__version__, python=sys.version.split()[0]),
        constants=dict(c_kms=C, mpc_km=MPC_KM, julian_year_s=365.25 * 86400),
        grid=dict(Om=OM, H0=H0, z=Z),
        rows=rows,
        radiation=rad,
    ),
    open("refs.json", "w"),
    separators=(",", ":"),
)
print(len(rows), "reference rows,", len(rad), "radiation rows")
