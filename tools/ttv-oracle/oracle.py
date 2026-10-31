#!/usr/bin/env python3
"""
Independent oracle for Prompt 226 (TTV.md, "Validation contract").

numpy and scipy only; no Gravitas code. It reads the systems committed in
tests/fixtures/ttv/thresholds.json, integrates the planar three-body problem
(star and two planets, G = 1, star 1000 mass units, 1 time unit = 1 day) with
scipy DOP853 at rtol 1e-12, finds the transit times as events (the planet's x
equals the star's x, the planet at larger y), removes a straight-line
ephemeris and writes tests/fixtures/ttv/oracle-results.json. It also writes
its own implementation of the two cited relations (the super-period and the
first-order amplitudes of Lithwick, Xie & Wu 2012 with Laplace coefficients
by scipy quadrature).

  python3 tools/ttv-oracle/oracle.py
"""
import json
import os
import numpy as np
from scipy.integrate import solve_ivp, quad

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
THR = json.load(open(os.path.join(ROOT, 'tests/fixtures/ttv/thresholds.json')))
G = THR['constants']['G_code']
M = THR['constants']['M_star_code']


def kepler_a(period, m):
    return (G * (M + m) * (period / (2 * np.pi)) ** 2) ** (1 / 3)


def initial(sys_):
    planets = []
    lam1 = sys_['lambda1_rad']
    for period, mu, lam in (
        (sys_['P1'], sys_['mu1'], lam1),
        (sys_['P2'], sys_['mu2'], lam1 + sys_['lambda2_offset_rad']),
    ):
        m = mu * M
        a = kepler_a(period, m)
        v = a * 2 * np.pi / period
        planets.append(dict(m=m, x=a * np.cos(lam), y=a * np.sin(lam),
                            vx=-v * np.sin(lam), vy=v * np.cos(lam)))
    return planets


def transit_times(planets, t_end, rtol, atol):
    ms = [M] + [p['m'] for p in planets]
    n = len(ms)
    y0 = [0.0, 0.0, 0.0, 0.0]
    for p in planets:
        y0 += [p['x'], p['y'], p['vx'], p['vy']]

    def rhs(t, y):
        r = y.reshape(n, 4)
        a = np.zeros((n, 2))
        for i in range(n):
            for j in range(n):
                if i != j:
                    d = r[j, :2] - r[i, :2]
                    a[i] += G * ms[j] * d / np.linalg.norm(d) ** 3
        out = np.empty_like(r)
        out[:, :2] = r[:, 2:]
        out[:, 2:] = a
        return out.ravel()

    events = []
    for k in range(1, n):
        def ev(t, y, k=k):
            r = y.reshape(n, 4)
            return r[k, 0] - r[0, 0]
        ev.direction = -1
        events.append(ev)
    sol = solve_ivp(rhs, (0, t_end), np.array(y0), method='DOP853',
                    rtol=rtol, atol=atol, events=events)
    out = []
    for k, (te, ye) in enumerate(zip(sol.t_events, sol.y_events)):
        keep = [float(t) for t, y in zip(te, ye)
                if y.reshape(n, 4)[k + 1, 1] - y.reshape(n, 4)[0, 1] > 0]
        out.append(keep)
    return out


def linear_fit(times):
    t = np.array(times)
    n = np.arange(len(t))
    A = np.vstack([np.ones_like(t), n]).T
    c, *_ = np.linalg.lstsq(A, t, rcond=None)
    return float(c[0]), float(c[1]), t - A @ c


def laplace(s, j, al):
    return quad(lambda p: np.cos(j * p) * (1 - 2 * al * np.cos(p) + al * al) ** (-s),
                0, 2 * np.pi, limit=200, epsabs=1e-13, epsrel=1e-13)[0] / np.pi


def dlaplace(s, j, al):
    return s * (laplace(s + 1, j - 1, al) - 2 * al * laplace(s + 1, j, al)
                + laplace(s + 1, j + 1, al))


def fg(j, al):
    f = -0.5 * (2 * j * laplace(0.5, j, al) + al * dlaplace(0.5, j, al))
    g = 0.5 * ((2 * j - 1) * laplace(0.5, j - 1, al) + al * dlaplace(0.5, j - 1, al))
    if j == 2:
        g -= 2 * al
    return float(f), float(g)


def relations(P1, P2, mu1, mu2, j):
    ps = 1 / abs(j / P2 - (j - 1) / P1)
    delta = (P2 / P1) * (j - 1) / j - 1
    al = (P1 / P2) ** (2 / 3)
    f, g = fg(j, al)
    v1 = P1 * mu2 / (np.pi * j ** (2 / 3) * (j - 1) ** (1 / 3) * abs(delta)) * abs(f)
    v2 = P2 * mu1 / (np.pi * j * abs(delta)) * abs(g)
    return dict(superPeriod=float(ps), delta=float(delta), alpha=float(al), f=f, g=g,
                amplitudeInner=float(v1), amplitudeOuter=float(v2))


def main():
    out = {'format': 'gravitas.ttv-oracle-results/1', 'tool': 'tools/ttv-oracle/oracle.py',
           'libraries': {'numpy': np.__version__}, 'systems': {}}
    import scipy
    out['libraries']['scipy'] = scipy.__version__
    for sid in ('S1', 'S2', 'S3'):
        s = THR['systems'][sid]
        pl = initial(s)
        tt = transit_times(pl, s['baseline_d'], 1e-12, 1e-14)
        chk = transit_times(pl, s['baseline_d'], THR['oracle']['selfCheck']['rtol'],
                            THR['oracle']['selfCheck']['atol'])
        rec = {'times': tt, 'planets': []}
        selfdiff = 0.0
        for k in range(2):
            t0, p, oc = linear_fit(tt[k])
            _, _, oc2 = linear_fit(chk[k][:len(tt[k])])
            m = min(len(oc), len(oc2))
            selfdiff = max(selfdiff, float(np.max(np.abs(oc[:m] - oc2[:m]))))
            rec['planets'].append({'T0': t0, 'P': p, 'oc': [float(x) for x in oc]})
        rec['selfCheckMaxAbsDiff_d'] = selfdiff
        rec['relations'] = relations(rec['planets'][0]['P'], rec['planets'][1]['P'],
                                     s['mu1'], s['mu2'], s['j'])
        out['systems'][sid] = rec
    out['laplace'] = {'2:1': fg(2, (1 / 2) ** (2 / 3)), '3:2': fg(3, (2 / 3) ** (2 / 3))}
    path = os.path.join(ROOT, 'tests/fixtures/ttv/oracle-results.json')
    json.dump(out, open(path, 'w'))
    print('wrote', path)
    for sid, r in out['systems'].items():
        print(sid, [len(t) for t in r['times']], r['selfCheckMaxAbsDiff_d'], r['relations'])


if __name__ == '__main__':
    main()
