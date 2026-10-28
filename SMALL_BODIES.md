# The belts from a catalog and the spin from a light curve

Prompt 198 (Roadmap III, R14, production kernel). The kernel in
`js/kernels/smallbodies/`: where the mean-motion resonances with Jupiter and Neptune sit; a
catalog's distribution in semi-major axis as a histogram; a Kirkwood gap as a **measured
depletion** against a smooth baseline fitted outside every gap, with a case-bootstrap interval, a
verdict (resolved or not resolved) and warnings; orbit-class counts (the main belt in thirds, the
Hildas, the Jupiter Trojans, the Kuiper belt's classical, plutino and twotino classes); what a
magnitude-limited survey finds of a population; and a bounded light-curve model, a triaxial
ellipsoid, from which the rotation period comes by the two-maxima rule and the amplitude gives a
**bound** on the axis ratio a/b, never the shape.

**This is the kernel, its validation, its words and one real catalog pack.** Part 2 added the
JPL Small-Body Database numbered-asteroid cut (H < 13) as a lazy pack and ran the tier-e rows on
it (below). The Kuiper-belt file was added afterwards (tier e3, below); the light curve (not
retrievable) is NOT RUN, and the two investigations, Spanish, instructor materials and the
model-page section are **not built**. Nothing in this PR is imported by a page; the kernel and the
pack are `NEVER_PRECACHED`.

## The validation contract (committed first)

`tests/fixtures/small-bodies/thresholds.json` fixed every definition, every bound and every
refusal code before `js/kernels/smallbodies/`, the validation tool, the oracle's results and the
tests existed (Roadmap III, 7.5.8; commit `c2220a5a`; the notes of corrections c1 `3f163f21` and
c2 `9014db6c`, both before a validation row existed; the oracle `f075c087`; the kernel
`fc30702e`).

| Tier | Checks |
| --- | --- |
| (a) analytic | a1 the eleven resonance axes in closed form; a2 Kepler's third law round trip and the resonance kernel's `nearestRatio` returning each entry's whole numbers; a3 the ellipsoid's projected area (three closed forms), the sphere and the pole-on aspect (no amplitude), the half period, the equator-on amplitude, the Zappala relation at 60 bodies; a4 the bound never exceeds a/b, equals it at theta = 90 and is not the shape below 60 degrees; a5 an exact baseline recovered from noise-free expected counts; a6 the survey's closed forms and the shift of the detected mean; a7 the orbit-class partition |
| (b) independent oracle | b1 the axes against numpy; b2 the projected area of 40 ellipsoids against a **surface integral** on a 2000 x 4000 grid (not the closed form); b3 six pinned series' Lomb-Scargle peaks against astropy; b4 the baseline and the depletion of five windows on three pinned synthetic catalogs against scipy's maximum-likelihood fit |
| (c) coverage | c1 the 95 percent interval of four gaps on 300 synthetic belts; c2 the roadmap's form, resamples of one catalog; c3 recovery on 300 synthetic light curves at each of two noise levels (period, amplitude, interval, bound); c4 class counts against a manifest |
| (d) refuse, widen, say "not resolved" | d1 a cut too small to show a gap, the false-positive rate on gap-free belts, the power curve; d2 thirteen refusals each with its code; d3 a sharp outer edge with no gap; d4 white noise, once-nightly sampling, dense sampling; d5 a one-maximum curve (the two-maxima rule's stated limit) |
| (e) authentic data | e1 a real catalog cut against a cited independent analysis; e2 a measured light curve: both **NOT RUN** |

The oracle is an independent implementation of the same estimator on the same synthetic catalogs.
It is **not** the roadmap's "pinned gap-depth estimate from a cited independent analysis on the
same catalog cut": that needs the catalog and is tier e1.

## Result

`npm run small-bodies:validate -- --record` (about 4 minutes on two child processes; the Jest
suite reruns only the quick groups, 23 s, and holds them to the committed `record.json`): **116
rows, 102 pass, 12 fail (left failing, Carl's ruling D-R10-198-03), 2 NOT RUN**; 102 includes 22
reported figures. In detail.

- **Axes.** The five gaps sit at 2.0648, 2.5013, 2.8246, 2.9575 and 3.2776 AU, the Hildas at
  3.9705, the Trojans at 5.2029, the plutinos at 39.402 and the twotinos at 47.732 AU, agreeing
  with numpy to 1e-16 relative and with `nearestRatio` for every entry.
- **Light-curve model.** The silhouette area agrees with the surface integral to 2.1e-7 (bound
  1e-4); the amplitude of a sphere is zero to 1e-16; the equator-on amplitude is exactly
  2.5 log10(a/b); the bound is below a/b by more than 5 percent in 98.9 percent of bodies seen at
  60 degrees or less (the bound is not the shape).
- **Period.** The Lomb-Scargle peak of six pinned series agrees with astropy to 1.2e-6; **the
  refined rotation period differs from astropy's 2/f_peak by up to 8.7e-4 (bound 5e-4): FAIL**,
  see below.
- **Depletion.** The baseline fit and the depletion of fifteen windows agree with scipy to 4.1e-9
  (bound 5e-4); the observed counts agree exactly. On noise-free expected counts the baseline's
  coefficients are recovered to 1.7e-13.
- **Coverage of 95 percent intervals, 300 synthetic belts of 8,000 candidates:** 3:1 0.927,
  5:2 0.913 (both inside 0.90 to 0.995), **7:3 0.847 and 2:1 0.787 (FAIL)**; the roadmap's
  bootstrap-resample form 0.915 (bound 0.88 to 0.995).
- **Too small, and no gap.** At 150 candidates 99.7 percent of 3:1 verdicts are "not resolved"
  (bound 0.95); on 300 gap-free belts the 3:1 window is called resolved 1.7 percent of the time
  (bound 0.08; 7.2 percent over all five windows, reported); power to resolve the 3:1 gap: 0.68 at
  500 candidates, 0.88 at 1,000, 1.00 at 2,000 and at 8,000.
- **A sharp outer edge, no gap (the 2:1 window on the main belt's cliff).** As committed, the
  fitted slope flags it in only 29 percent of 100 catalogs (**d3.warned FAIL**); the kernel's
  added flank test flags 100 percent and calls none resolved (added rows).
- **Survey.** At alpha = 0.5 and a limiting magnitude fixed, the inner belt (2.0 AU) is found 40
  times more completely than the belt's outer edge (3.5 AU); a population uniform in a over 2.0 to
  3.5 AU has a detected mean of 2.348 AU against a true 2.750 (ensemble 2.3477, quadrature 2.3471).
- **Light curves, 300 synthetic ellipsoids per noise level, 40 points a night for 5 nights of 7
  hours** (period within 0.002 / 0.003 of the truth at noise 0.01 / 0.03 mag): period 0.990 /
  **0.917 (FAIL)**; amplitude within 0.03 mag 0.940 (**FAIL**) / 0.927 (**FAIL**); coverage of the
  amplitude's interval 0.617 / 0.697 (**FAIL**); the claim a/b >= bound holds 0.947 (**FAIL**,
  one curve short) / 0.980; the period's 1.96 sigma covers 0.920 / 0.897. White noise is returned
  as not periodic in 97.3 percent of 300 series (bound 0.97); a 0.06 mag signal at 0.03 mag
  noise is found in 100 percent; once-nightly sampling is flagged in 100 percent and dense
  sampling in 0.
- **One maximum a rotation.** A single-harmonic curve of true period 6.0 h returns 12.007 h as the
  primary and lists 6 h as the alternative: the two-maxima rule's limit, demonstrated, not hidden.

### The failed legs (twelve, ten committed rows and two added ones, each held to `tests/fixtures/small-bodies/failed-legs.json`)

No bound was moved, multiplied or restated. Each leg's cause, from the measurement:

1. **b3.rotationPeriod (8.7e-4).** The K = 4 harmonic refinement at the double period moves the
   period away from the periodogram's by up to 8.7e-4 on the 21.5 h series (6 nights of 8 hours:
   the phase coverage is thin). Against the **truth** that made each series the kernel is within
   9.9e-4 and astropy's 2/f_peak within 9.1e-4 (rows `b3.vsTruth.*`), so the oracle is no closer to
   the truth; the committed leg compares two estimators, not an estimator and the truth.
2. **c1.coverage.7:3 (0.847) and 2:1 (0.787).** The bootstrap interval is sampling error only. The
   degree-4 log-polynomial baseline, bridged across masked windows (the 5:2, 7:3 and 2:1 windows
   leave little between them), misses the synthetic density's shape by a systematic of
   **-0.048 at 7:3 and +0.047 at 2:1 in depletion, about one standard error** (the sd is 0.058 and
   0.046); at 3:1 and 5:2 the bias is -0.013 and -0.009. The kernel's `assumes` list says so.
3. **d3.warned (0.29).** The steepness rule reads the fitted baseline's slope across the window,
   and a degree-4 polynomial bridging a masked cliff does not follow it, so the baseline looks
   gentle exactly where the data fall by a factor of 20 (and the window then reads as a gap, 71
   percent of the time). The kernel gained a flank test after the first run (below); the committed
   row is left failing as measured.
4. **c3 amplitude rows (0.94 and 0.927 within 0.03 mag; interval coverage 0.617 and 0.697).** About
   5 percent of curves fall in a regime the kernel itself flags (a period near a multiple of a day
   with nightly windows leaves a third of the rotation never observed: `ambiguous` or the
   `phase-gap` withholding, which counts here as a miss); among the curves the kernel calls
   `period` the amplitude is within 0.03 mag 0.986 / 0.978 of the time (added rows, passing).
   The interval is the real failure: the error has sd 0.0074 mag and no bias while the
   percentile bootstrap's half-width is 0.0052 mag, because the peak-to-peak of a fitted curve is
   an extreme-type statistic; coverage among curves called `period` is 0.646 / 0.737 (added rows,
   failing). The bound that uses the interval's lower end holds 0.993 / 1.000 of the time for those
   curves. The interval carries a note that it is a floor on the uncertainty.
5. **c3.noise0.03.period (0.917).** Low-amplitude curves (Delta m < 0.15 mag against 0.03 mag
   noise) at 15 to 20 hours, and the ambiguous long periods above; among curves called `period`
   0.953 (added row, one curve above its bound).
6. **c3.noise0.01.boundHolds (0.947, one curve under 0.95).** Withheld amplitudes count as a
   miss; among curves called `period` it holds 0.993.

### Honest notes on order

- The thresholds, the two correction notes and nothing else were committed before the kernel. The
  corrections: the window centres in the definition were typed by hand and the kernel computes
  them (at most 0.0007 AU apart); a5's depletion tolerance 1e-6 could not be met by any correct
  implementation (a midpoint rule in the bins) and became 1e-4; the harness choices the text left
  open (d4's night length, d1's reuse of the c1 catalogs).
- Before the oracle ran, one smoke run of the kernel printed the five axes, one synthetic belt's
  depletions and one light curve's period and amplitude; no bound was chosen or moved after it.
- **After the first full run** (11 failing rows) the kernel gained, and the tool gained rows for,
  three things (the kernel as first run was never committed; `fc30702e` is the version after these changes): the `uneven-flanks` warning (the counts in the two flanks of a window, each the
  window's width, outside the baseline's mask, differ by more than a factor e^1 at three sigma;
  it forces "not resolved"), the withholding of the amplitude and the bound when more than 35
  percent of the folded phase is empty (`phase-gap`) or the fitted amplitude exceeds 3 mag
  (`ill-conditioned`; one curve returned 171 mag), and `phaseGap` in the result. Their rows carry
  the suffix `.added` and the bounds of the rows they accompany; they do not replace them. The
  committed d3.notResolved leg failed on the first run (0.29) and **passes now because of the
  flank test**; the first-run figures that changed: d3.notResolved 0.29, c3 noise 0.01 boundHolds
  0.970 (a withheld amplitude now counts as a miss), amplitude 0.947, coverage 0.637. The oracle's
  b3 rows and the unchanged rows are identical.
- The oracle script stubs the `yaml` module for astropy's import (astropy.table imports PyYAML for
  ECSV input and output, which the script never uses; PyYAML is not installed and nothing may be
  downloaded).

## Part 2: the real catalog (tier e1)

**Data and rights** (Roadmap III 7.5.4, register row D-R10-198-02). The NASA/JPL Small-Body Database
Query API, numbered asteroids with H < 13, fields name, a, e, i, H, epoch and spkid, 8,886 rows,
715,136 bytes, SHA-256 `5f1d1dbd...c2fdf06`, retrieved 2026-10-27 by the main session. A U.S.
Government work, credited to JPL SBDB (public domain with credit; the terms were stated to this
session, not re-read in it). The MPC is not used. `tools/small-bodies-pack.py` reads the response
as data (never executed) and writes `js/data/smallbodies/numbered-h13.json` (number, a, e, i, H;
294 KB, 95 KB gzip; every row kept) with the source, credit, retrieval date, hash and the
selection statement in its manifest. It is a lazy `NEVER_PRECACHED` file; `data-budget.json` is
not touched.

**The selection, as the manifest states it.** The catalog is the large numbered objects that were
found (H < 13). For the main belt that is below the survey's completeness limit, so the cut shows
the gaps with little discovery bias and says nothing about small bodies; it is not the
population. (`selection.js` shows what a V-limited survey would do; this cut is magnitude-limited
instead, which is why the 3:1 depletion barely moves between H < 13, 0.880, and H < 11, 0.838.)

**The contract** was committed before any value was read (correction c3, `fad90e44`). **The
result, all e1 rows passing:** 5,871 of the 8,886 objects lie in 2.0 to 3.5 AU; the 3:1 window is
depleted by 0.880 (95 percent interval 0.829 to 0.924; 26 found where 216 were expected) and the
5:2 by 0.633 (0.565 to 0.700; 115 of 314), both "resolved"; the 7:3 (0.836) and 2:1 (0.893)
windows are called **not resolved** by the flank warning (the real counts on either side differ
by more than a factor of e; the 2:1 gap sits on the belt's outer edge); the 4:1 window holds 2.6
expected objects. The kernel agrees with scipy's maximum-likelihood fit of the same model on the
same cut to 1.7e-14, and its counts exactly. The bootstrap-resample coverage is 0.910. By the
class boxes the cut holds 183 Hildas and 1,555 Jupiter Trojans (and 375, 169 and 46 numbered
Kuiper-belt classical, plutino and twotino objects). **The roadmap's tier-b "cited independent
analysis of the same catalog cut" is NOT RUN** (none was supplied); `e1.oracle` is an independent
implementation of the same estimator, not that.

**Two kernel faults the real data found** (the synthetic ensembles could not: their values have
six random decimals): a value exactly on a bin edge (2.5 gave 49.99999999999999 in
`(a - lo) / width`) fell in the bin below, and the Poisson fit stopped on the change of the
deviance, which is quadratic at the optimum and left the coefficients 1e-5 away. Both are fixed
(an edge nudge of 1e-9; stop on the coefficients) with no bound touched, and the oracle bins in
integers. The failing legs are unchanged by them.

**Tier e3, the Kuiper-belt file.** JPL SBDB, all kinds, a 30 to 60 AU, e < 0.5, data arc over 365
days; 3,453 rows, 268,965 bytes, SHA-256 `5dd21849...b0fbd`, retrieved 2026-10-27, the rights of
the numbered cut (same answer of Carl's). Contract committed before any value was read (correction
c4, `3535a81b`); packed whole as `js/data/smallbodies/kuiper-a30-60.json` (137 KB; name, a, e,
i, H), a lazy `NEVER_PRECACHED` file. **All e3 rows pass:** 520 objects in the plutino a-window
(39.402 AU +- 0.5) against a mean of 78 in the two flanking one-AU windows (a factor of 6.7; bound
2), 169 in the twotino window against 108.5 (a factor of 1.6, reported, not bounded), 1,782 in the
classical box, the shortest arc 366 days, and every count equal to an independent numpy count of
the file. The pack's selection statement says what it is: objects observed over a year, found by
magnitude-limited surveys, so large, bright and near-perihelion objects are over-represented; the
counts are not the population's, and the plutino and twotino classes are a-windows (a proxy for
resonance, not a libration test).

**NOT RUN, with reasons.** e2: no measured light curve (the ALCDEF download is a form-based job;
the PDS path returned 404, 2026-10-27); e1.cited as above. Nothing is simulated as authentic.

## What is built, and what is not

Built: the kernel (item 2 of the prompt), its validation, the numbered-asteroid pack (item 1,
the belts' half; JPL SBDB instead of the MPC, a magnitude cut instead of a downsample) and this
document.

Not built:

- **Item 1, the rest.** An asteroid light curve under a recorded rights decision (not retrievable; the synthetic curve this kernel
  produces, labelled with its truth manifest, stands in until then).
- **Item 3, the investigations** ("The gaps in the belt", "How fast does it spin?"), their
  Spanish, instructor materials, the resonance-scenario links and the model-page section; the
  alt text and the misconception each must name. The belts one can now be built on the pack; they add lessons to the
  four shared measurement-sequence files already in the instructor closure (no closure file is
  added by this PR: 281, cap under 282).
- **Tier e**: NOT RUN, with the reason in the validator's note.

### What would unblock the rest (the first row was fetched in part 2; the others were not retrievable)

| Need | Source (candidate; identifiers unverified, to be confirmed by whoever fetches) | Licence | Size |
| --- | --- | --- | --- |
| Orbital elements a, e, i (and H, for the selection statement) of the numbered minor planets | Minor Planet Center `MPCORB` (the numbered-object file) per the roadmap; or the JPL Small-Body Database query API (`ssd-api.jpl.nasa.gov/sbdb_query.api`, fields a, e, i, H, class, numbered only), which is a U.S. Government product | MPC: terms as read at retrieval, a rights row per the roadmap's 7.5.4 is not yet written; JPL: public domain, credited | the full files are tens of MB; a cut of every 100th numbered object (about 8,000 rows, 3 numbers each at 4 decimals) is about 150 KB raw |
| A Kuiper-belt subset (classical, resonant, scattered) | the MPC distant-minor-planet list or the JPL SBDB class filter for trans-Neptunian objects | as above | a few thousand rows, under 1 MB |
| An asteroid light curve with a published period and amplitude | the PDS Small Bodies Node lightcurve archives or a published table (a single object, a few hundred points) | per source, to be read at retrieval | under 100 KB |
| The independent gap-depth analysis for tier b | a cited analysis of the same catalog cut (an independent reduction of the same file, or a published depletion at the same windows) | per source | a table |

Where the cut would live is a decision for Carl, as at 189, 193 and 195: the data budget has no
room for a pack (4,337 B raw and 781 B gzip), so it would be a lazy `NEVER_PRECACHED` file.
The downsampling rule proposed here is "every k-th numbered object by number" with k stated in the
manifest; the selection statement, in the words of `SELECTION_ASSUMES`, is part of the manifest
and of the lesson that reads it.

## The model

**Resonances.** A body at period ratio r = T_body / T_planet orbits at a = a_planet r^(2/3). A
resonance is named inner:outer, the whole numbers of orbits the inner and the outer body complete
in the same time: Jupiter 3:1 is three asteroid orbits to one of Jupiter (r = 1/3, 2.5013 AU); the
plutinos are 3:2 with Neptune, Neptune inside (r = 3/2, 39.402 AU). Jupiter's a = 5.202887 AU and
Neptune's a = 30.06952752 AU are Standish's mean elements, typed, `checked: false`. A location is
where the resonance is exact for a circular, unperturbed orbit; whether a body at it librates is
the resonant angle's question (`js/resonance/elements.js`).

**A gap as a depletion.** The bin counts (0.01 AU bins over 2.0 to 3.5 AU) outside every window
(each widened by 0.01 AU) are fitted by a Poisson regression on a degree-4 polynomial in log
density; N_exp is the integral of the fitted density over the window, N_obs the objects in it,
D = 1 - N_obs / N_exp. The interval is a case bootstrap of the objects (the baseline refit on
every draw) at 95 percent. The verdict is "resolved" when the interval's lower end is above zero
and N_exp is at least 10 and neither the baseline's slope across the window (steep-baseline) nor
the flanks (uneven-flanks) say the baseline is an interpolation over a step; otherwise "not
resolved", with the reason. A depletion is relative to a smooth curve in this catalog: not a
clearing fraction, not a dynamical result, and the numbered catalog is the objects found.

**The survey.** A magnitude-limited survey at opposition sees absolute magnitude H at
V = H + 5 log10(r (r - 1)) for a circular orbit at distance r; with N(<H) proportional to
10^(alpha H) the fraction found goes as (r (r - 1))^(-5 alpha): at alpha = 0.5 the inner belt is
found 40 times more completely than the outer edge. The model has no phase function, one slope,
one albedo and one limiting magnitude; it states the direction and the size of a bias, it does not
correct a catalog.

**A triaxial ellipsoid's light.** Axes a >= b >= c rotating about c, seen at aspect theta from the
spin axis, geometric scattering at zero phase angle: flux proportional to the silhouette area
pi sqrt(b^2 c^2 nx^2 + a^2 c^2 ny^2 + a^2 b^2 nz^2) for the unit viewing vector n in the body
frame. A convex ellipsoid shows two maxima and two minima a rotation (the flux has period
P_rot / 2), so the Lomb-Scargle peak gives P_rot = 2 / f_peak (the two-maxima rule), refined by a
four-harmonic series at the double period; the peak-to-peak amplitude of the fitted curve is
Delta m = 2.5 log10(a/b) - 1.25 log10((a^2 cos^2 + c^2 sin^2) / (b^2 cos^2 + c^2 sin^2)), at most
2.5 log10(a/b) with equality only at theta = 90 degrees, so **a/b >= 10^(0.4 Delta m)** is a
lower bound (Zappala et al. 1990), and the amplitude says nothing of b/c. The false-alarm
probability of the strongest peak is that of Horne and Baliunas (1986) with the single-frequency
form of Zechmeister and Kuerster (2009); above 0.01 the answer is "not periodic"; a second peak
at 0.9 of the first's power outside its resolution makes it "ambiguous" and lists both.

## Limits stated, not hidden

- No real catalog, light curve or period has been measured with this kernel; the recovery is on
  synthetic belts and curves with truth manifests, on pinned oracle series and on closed forms.
- The depletion's interval is sampling error only; on the validation belts the baseline's shape
  added up to one standard error (twice at the two windows between large neighbours), and the
  2:1 gap sits on the real belt's outer edge, where the kernel says "not resolved".
- The orbit classes are limits in (a, e, i) recalled from the JPL SBDB, restated and not
  retrieved; the plutino and twotino classes are a-windows, a proxy for resonance, not a
  libration test.
- A light curve at a large phase angle has another amplitude and shape than the zero-phase model
  gives; a curve with one maximum a rotation (albedo markings) has half the period the rule
  returns, and the answer carries both; a period near a multiple of a day with nightly sampling
  leaves part of the rotation unobserved and the amplitude is withheld.
- The amplitude's interval covered the true amplitude about two times in three at a stated 95
  percent; the period's bootstrap sigma is a floor on the error.
- The bound is a lower bound on a/b: it is not a shape, a b/c, or a pole.

## Files

`js/kernels/smallbodies/{resonances,belts,selection,lightcurve,synthetic,index}.js`,
`tools/small-bodies-validate.mjs` (`npm run small-bodies:validate`),
`tools/small-bodies-oracle/oracle.py`,
`tests/fixtures/small-bodies/{thresholds,oracle-inputs,oracle-results,oracle-real-results,failed-legs,record}.json`,
`js/data/smallbodies/{numbered-h13,kuiper-a30-60}.json`, `tools/small-bodies-pack.py`,
`tests/smallBodies.test.js`. The kernel is listed in `NEVER_PRECACHED`
(`tools/build-service-worker.mjs`) though no page imports it yet. Register rows D-R10-198-01 to -03.
