#!/usr/bin/env python3
"""
The vetting oracle (Prompt 228): an independent implementation of the contract in
tests/fixtures/vetting/thresholds.json, on data it generates itself.

    python3 tools/vetting-oracle/oracle.py > tests/fixtures/vetting/oracle-results.json

What is independent of Gravitas: every light curve (batman, Kreidberg 2015, for each
eclipse, the two-sphere combination written here), every frame (a Gaussian point-spread
function integrated over each pixel with scipy's erf, Poisson and read noise from
numpy), and the analysis code (numpy, written from the contract, not from the kernel).
What is not independent: the definitions themselves, which are the contract's: the box,
the baseline, the red-noise factor and the verdict rules. No cited vetting package
(exovetter, lightkurve, TRICERATOPS) is installed and none was downloaded, so this is an
independent implementation of the stated tests (in form Coughlin et al. 2016 and Twicken
et al. 2018 for the light curve, Bryson et al. 2013 for the difference image), not a
cited code's output. The kernel analyses the pinned rows and frames below.

numpy, scipy, batman only. Seeds: numpy RandomState(228 + case index).
"""
import json
import math
import sys

import batman
import numpy as np
from scipy.special import erf

D = dict(zFail=3, detectFraction=0.5, minTransitsPerParity=2, minDepthSnr=3, zDetect=3,
         binaryRatio=0.1, rFail=3.44, requiredExclusionPx=1.0, minDifferenceSnr=5,
         minFramesPerSide=5)


def jround(x):
    """JavaScript's Math.round: halves go up."""
    return np.floor(np.asarray(x) + 0.5)


# ---- light curves -------------------------------------------------------------------

def kipping(q1, q2):
    return 2 * math.sqrt(q1) * q2, math.sqrt(q1) * (1 - 2 * q2)


def bm(t, t0, per, rp, a, inc, u):
    p = batman.TransitParams()
    p.t0, p.per, p.rp, p.a, p.inc, p.ecc, p.w = t0, per, rp, a, inc, 0.0, 90.0
    p.u, p.limb_dark = list(u), 'quadratic'
    return batman.TransitModel(p, t, supersample_factor=1).light_curve(p)


def planet_curve(t):
    u = kipping(0.4, 0.3)
    b, a = 0.3, 8.6
    inc = math.degrees(math.acos(b / a))
    flux = bm(t, 0.5, 3.2, 0.1, a, inc, u)
    half = 3.2 / (2 * math.pi) * math.asin(math.sqrt((1.1) ** 2 - b * b) / (a * math.sin(math.radians(inc))))
    return flux, 2 * half


def blend_curve(t):
    """Odd candidate transits: primary eclipses of a diluted binary at twice the period."""
    rsum, k, J, l3 = 0.06, 0.9, 0.5, 0.98
    ldA, ldB = (0.4, 0.22), (0.5, 0.18)
    P, tc = 6.4, 3.7
    r1 = rsum / (1 + k)
    a1 = 1 / r1
    f1 = bm(t, tc, P, k, a1, 90.0, ldA)
    f2 = bm(t, tc + P / 2, P, 1 / k, a1 / k, 90.0, ldB)
    dA = 1 - ldA[0] / 3 - ldA[1] / 6
    dB = 1 - ldB[0] / 3 - ldB[1] / 6
    L2 = J * k * k * dB / dA
    flux = (f1 + L2 * f2) / (1 + L2)
    flux = (1 - l3) * flux + l3
    # The primary's first to fourth contact at inc = 90: 2 asin(rsum) P / (2 pi)
    duration = P / math.pi * math.asin(rsum)
    return flux, duration


# ---- the analysis, from the contract --------------------------------------------------

def box_depth(t, y, dy, P, t0, Dur, phase=0.0, select=None):
    centre = t0 + phase * P
    other = t0 + 0.5 * P if phase == 0 else t0
    c = jround((t - centre) / P)
    dt = t - centre - c * P
    adt = np.abs(dt)
    co = jround((t - other) / P)
    dto = t - other - co * P
    ok = np.isfinite(y)
    if select is not None:
        ok &= select(c)
    box = ok & (adt < Dur / 4)
    base = ok & (adt > Dur) & (adt < 3 * Dur) & (np.abs(dto) > 1.5 * Dur)
    if box.sum() < 3 or base.sum() < 3:
        return None
    w = 1 / dy ** 2
    wb, wx = w[base].sum(), w[box].sum()
    mb = (w[base] * y[base]).sum() / wb
    mx = (w[box] * y[box]).sum() / wx
    cyc, counts = np.unique(c[box], return_counts=True)
    ncyc = int((counts >= 3).sum())
    per_box = max(2, int(jround(box.sum() / max(1, len(cyc)))))
    # red noise (Pont et al. 2006), blocks within one cycle and one side
    ss, M, e2 = 0.0, 0, 0.0
    side = (dt < 0).astype(int)
    key = c * 2 + (1 - side)
    for kk in np.unique(key[base]):
        idx = np.where(base & (key == kk))[0]
        idx = idx[np.argsort(t[idx])]
        for j in range(0, len(idx) - per_box + 1, per_box):
            blk = idx[j:j + per_box]
            ss += (np.sum(y[blk] - mb) / per_box) ** 2
            e2 += np.sum(dy[blk] ** 2) / per_box ** 2
            M += 1
    beta = 1.0
    if M >= 10:
        beta = max(1.0, math.sqrt(ss / M) / (math.sqrt(e2 / M) * math.sqrt(M / (M - 1))))
    sw = math.sqrt(1 / wx + 1 / wb) / mb
    return dict(depth=(mb - mx) / mb, sigma=beta * sw, beta=beta, cycles=ncyc)


def odd_even(t, y, dy, eph):
    P, t0, Dur = eph
    odd = box_depth(t, y, dy, P, t0, Dur, select=lambda c: np.abs(c) % 2 == 1)
    even = box_depth(t, y, dy, P, t0, Dur, select=lambda c: np.abs(c) % 2 == 0)
    out = dict(verdict='inconclusive', reason='too-few-transits', odd=odd, even=even)
    if (odd is None or even is None or odd['cycles'] < D['minTransitsPerParity']
            or even['cycles'] < D['minTransitsPerParity']):
        return out
    diff = odd['depth'] - even['depth']
    sig = math.hypot(odd['sigma'], even['sigma'])
    z = abs(diff) / sig
    mean = (odd['depth'] + even['depth']) / 2
    out.update(difference=diff, sigma=sig, z=z, meanDepth=mean, minDetectableDifference=D['zFail'] * sig)
    if not mean >= D['minDepthSnr'] * sig / 2:
        out['reason'] = 'no-signal'
    elif z >= D['zFail']:
        out.update(verdict='fail', reason='depths-differ')
    elif D['zFail'] * sig > D['detectFraction'] * mean:
        out['reason'] = 'low-power'
    else:
        out.update(verdict='pass', reason='depths-agree')
    return out


def secondary(t, y, dy, eph, phase=0.5):
    P, t0, Dur = eph
    prim = box_depth(t, y, dy, P, t0, Dur)
    sec = box_depth(t, y, dy, P, t0, Dur, phase=phase)
    out = dict(verdict='inconclusive', reason='no-coverage', primary=prim, secondary=sec)
    if sec is None or sec['cycles'] < D['minTransitsPerParity']:
        return out
    ul = D['zDetect'] * sec['sigma']
    out.update(depth=sec['depth'], sigma=sec['sigma'], upperLimit=ul)
    if prim is None or not prim['depth'] >= D['minDepthSnr'] * prim['sigma']:
        out['reason'] = 'no-signal'
        return out
    ratio = sec['depth'] / prim['depth']
    out['ratio'] = ratio
    detected = sec['depth'] >= ul
    if detected and ratio > D['binaryRatio']:
        out.update(verdict='fail', reason='deep-secondary')
    elif detected:
        out.update(verdict='pass', reason='detected-below-limit')
    elif ul > D['binaryRatio'] * prim['depth']:
        out['reason'] = 'low-power'
    else:
        out.update(verdict='pass', reason='not-detected')
    return out


# ---- frames ----------------------------------------------------------------------------

W = H = 17
SIGMA = 2.8 / (2 * math.sqrt(2 * math.log(2)))


def psf_image(x0, y0, electrons):
    xs = np.arange(W)
    ys = np.arange(H)
    fx = 0.5 * (erf((xs + 0.5 - x0) / (SIGMA * math.sqrt(2))) - erf((xs - 0.5 - x0) / (SIGMA * math.sqrt(2))))
    fy = 0.5 * (erf((ys + 0.5 - y0) / (SIGMA * math.sqrt(2))) - erf((ys - 0.5 - y0) / (SIGMA * math.sqrt(2))))
    return electrons * np.outer(fy, fx)


def shape_unit(times, t0=0.5, per=3.2):
    u = kipping(0.4, 0.3)
    b, a = 0.3, 8.6
    inc = math.degrees(math.acos(b / a))
    return bm(np.asarray(times), t0, per, 0.1, a, inc, u)


def frame_series(rng, eclipsed, sep=1.6, ang=40.0, rate=3000.0, q=0.3, depth=0.0105):
    eph = (3.2, 0.5, 0.12)
    times = []
    for c in range(3):
        for j in range(37):
            times.append(0.5 + c * 3.2 + 0.12 * (j / 12 - 1.5))
    times = np.array(times)
    unit = shape_unit(times)
    mid = 1 - shape_unit([0.5])[0]
    share = 1 / (1 + q) if eclipsed == 'target' else q / (1 + q)
    scale = depth / (share * mid)
    nb = (8 + sep * math.cos(math.radians(ang)), 8 + sep * math.sin(math.radians(ang)))
    dark = 0.1
    frames = []
    for k, tk in enumerate(times):
        m = 1 - scale * (1 - unit[k])
        rt = rate * m if eclipsed == 'target' else rate
        rn = rate * q * m if eclipsed == 'neighbour' else rate * q
        mean = (psf_image(8, 8, rt * 60) + psf_image(nb[0], nb[1], rn * 60)) + (3 + dark) * 60
        e = rng.poisson(mean).astype(float) + rng.normal(0, 8, mean.shape)
        frames.append(np.round(e))
    return times, frames, eph, nb


def centroid_window(img, var, x, y, half):
    """photometry.centroid()'s rule with no Gaussian weight: recentre on the rounded position until it stops."""
    cx, cy = float(x), float(y)
    seen = set()
    for _ in range(50):
        ix, iy = int(jround(cx)), int(jround(cy))
        if ix - half < 0 or iy - half < 0 or ix + half >= W or iy + half >= H:
            return None
        seen.add((ix, iy))
        sub = img[iy - half:iy + half + 1, ix - half:ix + half + 1]
        s = sub.sum()
        if not s > 0:
            return None
        gx, gy = np.meshgrid(np.arange(ix - half, ix + half + 1), np.arange(iy - half, iy + half + 1))
        nx, ny = (sub * gx).sum() / s, (sub * gy).sum() / s
        cx, cy = nx, ny
        nxt = (int(jround(cx)), int(jround(cy)))
        tie = nxt != (ix, iy) and nxt in seen
        if nxt == (ix, iy) or tie:
            v = var[iy - half:iy + half + 1, ix - half:ix + half + 1]
            sx = math.sqrt((v * (gx - cx) ** 2).sum()) / s
            sy = math.sqrt((v * (gy - cy) ** 2).sum()) / s
            return dict(x=cx, y=cy, sigmaX=sx, sigmaY=sy, window=(ix, iy))
    return None


def dic_test(times, frames, eph, target=(8, 8), half=4):
    P, t0, Dur = eph
    inT, outT = [], []
    for k, tk in enumerate(times):
        c = math.floor((tk - t0) / P + 0.5)
        dt = abs(tk - t0 - c * P)
        if dt < Dur / 4 - 1e-9:
            inT.append(k)
        elif dt > Dur + 1e-9:
            outT.append(k)
    a = np.array([frames[k] for k in inT])
    b = np.array([frames[k] for k in outT])
    Dimg = b.mean(0) - a.mean(0)
    V = b.var(0, ddof=1) / len(b) + a.var(0, ddof=1) / len(a)
    out = dict(verdict='inconclusive', reason='too-few-frames', nIn=len(inT), nOut=len(outT))
    if len(inT) < D['minFramesPerSide'] or len(outT) < D['minFramesPerSide']:
        return out
    c = centroid_window(Dimg, V, target[0], target[1], half)
    if c is None:
        out['reason'] = 'no-difference-signal'
        return out
    ix, iy = c['window']
    sl = (slice(iy - half, iy + half + 1), slice(ix - half, ix + half + 1))
    snr = Dimg[sl].sum() / math.sqrt(V[sl].sum())
    dx, dy = c['x'] - target[0], c['y'] - target[1]
    r = math.hypot(dx / c['sigmaX'], dy / c['sigmaY'])
    excl = D['rFail'] * max(c['sigmaX'], c['sigmaY'])
    out.update(dic=dict(x=c['x'], y=c['y']), offset=dict(dx=dx, dy=dy), sigma=dict(x=c['sigmaX'], y=c['sigmaY']),
               r=r, exclusionRadius=excl, snr=snr)
    if not snr >= D['minDifferenceSnr']:
        out['reason'] = 'no-difference-signal'
    elif r >= D['rFail']:
        out.update(verdict='fail', reason='off-target')
    elif excl > D['requiredExclusionPx']:
        out['reason'] = 'low-power'
    else:
        out.update(verdict='pass', reason='on-target')
    return out


def main():
    cadence = 10 / 1440
    t = np.arange(int(30 / cadence)) * cadence
    sigma = 0.0004
    cases = {}
    for i, (name, fn) in enumerate([('clean', planet_curve), ('blend', blend_curve)]):
        rng = np.random.RandomState(228 + i)
        flux, dur = fn(t)
        y = np.round(flux + sigma * rng.standard_normal(len(t)), 8)
        dy = np.full(len(t), sigma)
        eph = (3.2, 0.5, dur)
        cases[name] = dict(
            cadence=cadence, sigma=sigma, ephemeris=dict(P=3.2, t0=0.5, duration=dur), y=y.tolist(),
            oddEven=odd_even(t, y, dy, eph), secondary=secondary(t, y, dy, eph))
    frames_out = {}
    for i, (name, who) in enumerate([('onTarget', 'target'), ('blend', 'neighbour')]):
        rng = np.random.RandomState(300 + i)
        times, frames, eph, nb = frame_series(rng, who)
        res = dic_test(times, frames, eph)
        # Keep only the frames the test reads
        keep = [k for k in range(len(times)) if True]
        P, t0, Dur = eph
        used = [k for k, tk in enumerate(times)
                if (abs(tk - t0 - math.floor((tk - t0) / P + 0.5) * P) < Dur / 4 - 1e-9
                    or abs(tk - t0 - math.floor((tk - t0) / P + 0.5) * P) > Dur + 1e-9)]
        frames_out[name] = dict(
            eclipsed=who, ephemeris=dict(P=P, t0=t0, duration=Dur), target=dict(x=8, y=8),
            neighbour=dict(x=nb[0], y=nb[1]), times=[float(times[k]) for k in used],
            images=[[int(v) for v in frames[k].ravel()] for k in used], result=res)
    json.dump(dict(
        script='tools/vetting-oracle/oracle.py', numpy=np.__version__, batman=batman.__version__,
        note='independent implementation of the contract; no cited vetting package installed',
        lightCurves=cases, frames=frames_out), sys.stdout, separators=(',', ':'))


if __name__ == '__main__':
    main()
