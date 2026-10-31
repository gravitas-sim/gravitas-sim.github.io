# Vetting with ambiguity (Prompt 228)

Is it a planet? The tests that say no, and the cases that say "maybe". A transit candidate is a
periodic dip; vetting is the work of trying to reject it. This document states what the kernel
(`js/kernels/vetting/`) computes, what it assumes and leaves out, and how it was checked.
The investigation is **Planet or Not?** (`planet-or-not`, majors) and the instrument is the
panel `vetting-checklist` (`js/vettingWidgets.js` over `js/vettingField.js`).

## What is new, and what already existed (the delta table)

| Existing authority | Missing behavior | Adopter | Duplication removed |
| --- | --- | --- | --- |
| `js/observatory/guides/science.js` `boxDepth`, `oddEven`, `secondary`: a depth in the central half of the transit against a global baseline, a z-score, no verdict | a verdict with a power rule (a test passes only if it could have seen what it looks for), "inconclusive" with a reason, a local baseline, a red-noise factor, a centroid test on frames, blend candidates, a summary | the panel, the investigation, the guide `exo-dilution` (advanced steps) | none yet: the guides' goldens stay byte for byte, so `science.js` is unchanged; a test holds that the kernel's depth equals the guide's on a flat baseline. Moving the guides onto the kernel is a later, visible change |
| `js/measure/photometry.js` `centroid()` (Prompt 180) | a centroid of a difference image and a verdict | the kernel (`js/kernels/vetting/frames.js`) | uses it, does not copy it |
| `js/inference/binaries.js` (Prompt 217) | a diluted binary as a blend candidate | `js/kernels/vetting/blends.js` | uses `eclipseFlux` with `thirdLight`, does not copy it |
| `js/kernels/detector/frame.js` `simulateFrame` | a postage stamp with a neighbor | `js/kernels/vetting/frames.js` | uses it |

## The tests

Notation: the ephemeris is P (period), t0 (epoch) and T14 (first to fourth contact), all in days.
The cycle of a time t is n = round((t - t0) / P) and its offset dt = t - t0 - n P.

**Box depth.** The box is |dt| < T14 / 4 (the central half of the transit), the baseline T14 < |dt| < 3 T14,
pooled over the cycles chosen and excluding the other eclipse's neighborhood. The depth is
D = (m_base - m_box) / m_base, the means weighted by 1 / sigma^2. Its uncertainty is
sigma_D = beta sqrt(1 / W_box + 1 / W_base) / m_base. beta >= 1 is the red-noise factor of Pont,
Zucker and Queloz (2006): the root mean square of the means of consecutive blocks of baseline points
(a block has as many points as one cycle's box) over the white-noise expectation
sigma / sqrt(n) sqrt(M / (M - 1)); it is 1 with fewer than ten blocks.

**Odd and even depths.** diff = D_odd - D_even, sigma_diff = sqrt(sigma_odd^2 + sigma_even^2),
z = |diff| / sigma_diff. Verdicts, in this order: inconclusive (`too-few-transits`) with fewer than two
cycles of a parity; inconclusive (`no-signal`) when the mean depth is not 3 sigma; fail at z >= 3
(`depths-differ`); inconclusive (`low-power`) when 3 sigma_diff exceeds half the mean depth (the test
could not have seen a difference of half the depth); otherwise pass. The smallest difference the test
could have seen, 3 sigma_diff, is reported with every verdict.

**A second eclipse.** The same box at phase 0.5 (a circular orbit: another phase may be given). With
detection at 3 sigma and ratio = D_secondary / D_primary: fail (`deep-secondary`) when detected with
ratio above 0.1; pass (`detected-below-limit`) when detected and at most 0.1; inconclusive (`low-power`)
when 3 sigma_secondary exceeds a tenth of the primary depth; otherwise pass (`not-detected`). Inconclusive
(`no-coverage`) when fewer than two cycles have data in the box. The upper limit is reported.

**Where the light dips.** On a frame series: the in-transit frames are |dt| < T14 / 4, the out-of-transit
|dt| > T14. The difference image D = mean(out) - mean(in), with the per-pixel variance
s2_out / n_out + s2_in / n_in, is passed to `centroid()` of `js/measure/photometry.js` (Prompt 180; a
window of half-width 4 pixels that recenters on the rounded position until it stops). The offset of the
centroid from the target is compared with its uncertainty: r = sqrt((dx / sigma_x)^2 + (dy / sigma_y)^2),
failing at r >= 3.44 (the Rayleigh tail 0.0027). The exclusion radius is 3.44 max(sigma_x, sigma_y): a
source farther from the target than this would have been seen. Verdicts: inconclusive (`too-few-frames`)
with fewer than five frames on a side; inconclusive (`no-difference-signal`) when the summed difference
signal is below 5 times its uncertainty or the centroid refuses; fail (`off-target`); inconclusive
(`low-power`) when the exclusion radius exceeds 1 pixel; otherwise pass (`on-target`). The aperture's own
flux-weighted centroid shift (in minus out) is reported; to first order it is +delta f_n d toward a neighbor
when the target eclipses and -delta f_t d when the neighbor does (delta the observed depth, f the shares of
the light, d the separation), orders of magnitude smaller than the difference image's offset.

**Summary.** `rejected` when any test fails, `survives` when every test that ran passed and none is
inconclusive, otherwise `undecided`. Never planet, never validated. The summary is a `gravitas.artifact/1`
record in Prompt 150's uncertainty kinds: a difference with a sigma, a second-eclipse upper limit
(`limit`), a position offset with a sigma, or `failed` with the reason. A test that was not run (no frames)
is not a pass, and the summary says so.

## Candidates

Synthetic, with a truth manifest, at P = 3.2 d with a 3-minute cadence over 30 days: `planet` (js/inference/transit.js,
k = 0.1), `blend-alternating` (a diluted binary of unequal stars at 6.4 d, the target supplying 98 per cent of
the light), `blend-twin` (two equal stars at 6.4 d), `eb-secondary` (the binary at its true period). Frames:
17 by 17 pixels from the detector forward model (fwhm 2.8 px) with one neighbor at a stated separation and
brightness, one star eclipsed on the transit's own shape; detector fixed pattern, cosmic rays and
saturation are off.

## What a pass means

A pass says that the test looked for one false positive, could have seen it, and did not. It does not say
the candidate is a planet. What the tests leave, stated, not hidden:

- two equal stars at twice the period (every dip the same depth, nothing at half the period) pass the odd-even and
  second-eclipse tests by construction, and pass altogether when no frames were taken;
- a neighbor closer than the exclusion radius passes the frames;
- an eccentric binary whose second eclipse is not at the phase searched passes the second-eclipse test;
- a candidate too noisy for a test is inconclusive, and a pass at modest power only rules out differences larger than the
  smallest the test could see (the panel states it).

Validation needs evidence the tests do not give: a measured mass, or a statistical argument over the false
positives that remain.

## Domain, assumptions and limits

White noise (with the red-noise factor), a circular orbit unless a phase is given, the ephemeris given, one neighbor,
no detector effects, no reflection or ellipsoidal light in the baseline (so a strong phase curve biases the local
baseline), transits much shorter than the period (the duration must be under half of it; the kernel refuses otherwise).
Not built: a statistical blend probability, a model-shift test, a ghost or momentum-dump test, a period-doubling
search, crowding from a catalog, frames of a real candidate.

## References

Coughlin et al. 2016, ApJS 224, 12 (the Kepler robovetter's odd-even and secondary-eclipse tests); Twicken et al. 2018,
PASP 130, 064502 (the data validation reports); Bryson et al. 2013, PASP 125, 889 (the difference-image centroid
test); Pont, Zucker and Queloz 2006, MNRAS 373, 231 (the red-noise factor); Kreidberg 2015, PASP 127, 1161 (batman, the
oracle's light curves).


## Results

`npm run vetting:validate` runs every leg (about 25 seconds); `-- --write-results` rewrites
`tests/fixtures/vetting/results.json`, `failed-legs.json` and the generated `js/kernels/vetting/rates.js`.
24 bounded legs pass, none crossed its bound, one leg is a report with no bound (C8, the blind spots). The ensemble
rates, the pinned run and the three amendments are in those files; `tests/vetting.test.js` holds them.

| Leg | Result |
| --- | --- |
| A1 to A7, analytic | all pass: the box depth to 0.07 per cent of the model's, the recovered difference to 0.02 of the mean depth, the dilution identity to 5e-16, the difference-image centroid within 0.004 px of the eclipsed star at 10000 times the rates, the aperture shift within 1.2 per cent of its first-order value |
| B1 to B3, oracle | the kernel agrees with the independent implementation to machine precision on the pinned data (the same definitions, independent code, light curves and frames) |
| C1 odd-even false rejection | 0.5 per cent of 400 (bound 2) |
| C2 odd-even false acceptance | none of 400 pass; all fail |
| C3 low power | none of 400 pass either test; 399 and 400 inconclusive |
| C4 second eclipse | all 400 binaries fail; all 400 planets pass |
| C5 coverage of the difference | 69.4 per cent at one sigma (bounds 62 to 76) |
| C6 and C7 centroid | on-target 60 of 60 pass; blend 60 of 60 fail; low power 60 of 60 inconclusive; position coverage 68.3 per cent |
| D1 to D5 refusals | all hold |
| E1, E2 authentic | HD 209458 and Kepler-13 (TESS) are not rejected: both light-curve tests pass |

The authentic legs are an applicability check, not an independent validation: both planets are confirmed by
other means, and their ephemerides are the guide's own statement of them. No frames of a real candidate exist
here, so the centroid test is synthetic throughout.

## Validation contract

`tests/fixtures/vetting/thresholds.json` fixed every definition, every default and every
bound of the checks below before `js/kernels/vetting/`, the oracle script, the validator,
any panel or lesson existed, and before any output of the kernel or the oracle was
inspected. A crossed bound is a failed check, kept failing in
`tests/fixtures/vetting/failed-legs.json`; only Carl resets one. Amendments are appended to
the file's `amendments` list with their reason; the original bound stays failing.

| Leg | What it holds |
| --- | --- |
| a, analytic | noise-free box depths, odd-even differences, a secondary, the dilution identity of a blend, the difference-image centroid at the eclipsed star and the aperture centroid's analytic shift, the summary's truth table |
| b, oracle | an independent implementation (numpy, scipy, batman, its own point-spread rendering) on pinned synthetic cases: a blend, a clean transit, two frame series |
| c, ensembles | false rejection, false acceptance, the power rule (a low-signal candidate never passes) and the coverage of the stated uncertainty, on seeded ensembles; the rates are shown to the student |
| d, refusals | one odd transit, a gap, pure noise, too few frames, invalid inputs, and a summary that never says "planet" |
| e, authentic | HD 209458 and Kepler-13 from the TESS light curves the Observatory ships: no light-curve test rejects a confirmed planet |

No cited vetting package (exovetter, lightkurve, TRICERATOPS) is installed and none was
downloaded: the oracle is an independent implementation of the stated contract, so what it
checks is the code, not the choice of tests. Its limits are stated with its results.
