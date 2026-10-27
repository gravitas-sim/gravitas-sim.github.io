# Crater counting: relative ages, size-frequency distributions and diameter uncertainty

Prompt 195 (Roadmap III, R14, production kernel). The kernel in
`js/measure/craters.js`: a circle mark becomes a diameter with an uncertainty
budget, a list of diameters over a stated area becomes the cumulative
size-frequency distribution with Poisson intervals, two lists become a relative age
with an interval, and a list gives the cumulative power-law index with an interval.
No absolute age is computed or reported anywhere: that is Prompt 196's gate.

## The validation contract (committed first)

`tests/fixtures/craters/thresholds.json` fixed every definition, every bound and
every refusal code before `js/measure/craters.js`, the validation tool, the oracle's
inputs, script and results and the tests existed (Roadmap III, 7.5.8). A check
that a measurement crosses is a failed check; only Carl resets a bound.

| Tier | Checks |
| --- | --- |
| (a) analytic | a1 Garwood closed forms and defining equations; a2 a hand-made cumulative table; a3 the diameter budget; a4 foreshortening and the footprint area; a5 the exact density ratio and its Clopper-Pearson ends; a6 the index and its chi-square interval |
| (b) independent oracle | b1 the curve and Garwood ends, b2 twelve ratio intervals, b3 the index and its interval, against scipy (`chi2.ppf`, `beta.ppf`, `pareto.fit`) and numpy on a pinned list; b4 a cited crater-statistics tool's curve: NOT RUN (craterstats is not installed and nothing may be installed or fetched) |
| (c) coverage | c1 Poisson, c2 ratio, c3 index (4,000 trials each), c4 the diameter budget's one-sigma coverage |
| (d) refuse, widen, say "not constrained" | d1 two regions of one density return "no significant difference"; d2 a density ratio of 3 is detected the right way; d3 every refusal code; d4 a roll-off the index fit does not know about is flagged |
| (e) authentic data | e1 the reference regions' published counts: NOT RUN (the regions, their published diameter lists and their frames are not in the repository) |

The contract carries one correction, recorded in the thresholds file under
`corrections`: a2's counts were written 9, 7, 3, 3, 1 where the diameters at least
15 km are four (30, 20, 20, 15), so they read 9, 7, 4, 3, 1. It was a hand-count
slip found by recounting while the validation tool was being written, before the
kernel or the tool had run; the diameters, areas, thresholds and tolerance are
unchanged. d4 (the roll-off) was committed without naming the fit's `dMin`; the tool
uses 1 km, the Pareto minimum, the only value at which the draws are a power law.

## What is built, and what is not (as of part 1; part 2 below supersedes items 1, b4 and e)

Built: the kernel (item 2 of the prompt), its validation and its documentation.
Not built, because each needs data the repository does not hold and nothing may be
fetched without Carl's word per request:

- **Item 1, the packs**: two lunar regions (a mare and an older highland or basin
  site) and one Martian region, each with a pixel scale, an area and the
  foreshortening of the view in its sidecar, and a reference table of published
  counts with citations. The repository has the Galileo Moon and HiRISE Cerberus Fossae
  packs (Prompt 189), both display-only with no stated scale (HiRISE's sidecar says
  so), and the Clementine nearside fixture (Prompt 178, 1,719 pixels across the
  disc, about 2 km per pixel, no published counts). None is a countable region with a
  published list to compare. What each missing piece is, its source and its size are in
  the next section.
- **Tier b4 and tier e** of the contract (a cited crater-statistics tool's curve; the
  reference regions' published counts): NOT RUN, with the reason in the thresholds file.
- **Items 3 and 4**, the investigations (survey, majors, upper depth), the
  misconceptions and the model page's section: they count craters in those regions, so
  they wait for them. Nothing student-facing was added; no Spanish, no closure file.

### What would unblock the rest (part 1's request; Carl granted it on 2026-10-25, see Part 2)

| Need | Source | Licence | Size |
| --- | --- | --- | --- |
| A lunar mare frame and an older highland or basin frame, each with a stated pixel scale and footprint | LROC WAC or Kaguya or Clementine map products (NASA PDS, JAXA SELENE); USGS Astrogeology | NASA and USGS products are generally public domain; JAXA's terms to be read | 0.2 to 2 MB each after cropping to a region |
| A Martian region with HiRISE or CTX at a stated scale (the Cerberus Fossae frame already in the packs lacks one) | NASA PDS, HiRISE (University of Arizona) | public domain, credit | 0.3 to 2 MB |
| Published crater diameter lists for those regions (the counts, not ages), with citations | the lunar crater database of Robbins (2019), the Head et al. (2010) Orientale and Imbrium counts, Hartmann and others for Mars (to be confirmed at the source) | each source's own terms, read before use | tens of KB as tables |
| The output of a cited crater-statistics tool (craterstats, Michael and Neukum) on one pinned list | the tool's repository | its licence to be read | a few KB; needs the tool installed in the oracle environment |

Whether the frames ship as app packs (the data budget has 4,337 B raw and 781 B gzip of
room, so they would not) or as lazy files outside every precache is a decision for Carl,
as at 189 and 193.

## The model

Everything is a closed form; `js/measure/craters.js` is pure.

**Diameter.** A circle mark has a centre and a rim point (`js/measure/marks.js`); its
radius `r` in pixels is `lengthOf`. With the scale `s` in km per pixel (a scale in metres
per pixel is converted; an angular scale is refused, it needs a distance),

    D = 2 r s f(theta, cosE),   f = sqrt(cos^2(theta) / cosE^2 + sin^2(theta))

where a view at emission angle E compresses one image axis (angle `axis`) by `cosE`, and
`theta` is the angle from that axis to the radius. `cosE = 1` is a view straight down;
`cosE < 1` without an axis is refused. The relative uncertainty is the quadrature sum of
four components, each reported: the scale's relative sigma, the fit's (the radius's sigma
`sqrt(2) sigma_point` over `r`, the placement of a hand), the recognition (a stated
fraction of `D`: where the rim is, as against where the pen was), and the foreshortening's
`sigma_cosE cos^2(theta) / (cosE^3 f^2)`.

**Area.** Stated (`km2`, with an optional relative sigma), or from the footprint of a
flat region, `pixels s^2 / cosE`, with `2 sigma_s / s` and `sigma_cosE / cosE` in quadrature.
A curved region is the caller's area.

**Cumulative distribution.** `N(>=D_k)` at the caller's thresholds (default: steps of
sqrt(2) upward from `dMin`), `density = N / area`, and the Poisson interval of Prompt 154
(`poissonInterval`, Garwood, exposure = the area) at the stated level, 0.95 by default.
That interval is counting error. What the diameters' own uncertainty does to `N` at a
threshold (a crater whose diameter is 19.5 +/- 1 km against a threshold of 20) is
reported apart as `boundary`: the expected count `sum Phi((D_i - D_k) / sigma_i)` and its
standard deviation. The two are never added. The area's relative sigma sits beside the
density and is not in the interval. `toCsv` writes the table (D, N, density, lo, hi) for
the analysis tools.

**Relative age.** Above `dMin`, counts `na`, `nb` in areas `Aa`, `Ab`. Given `n = na + nb`,
`na` is binomial with `p = la Aa / (la Aa + lb Ab)`; its exact (Clopper-Pearson) interval
maps to the density ratio `R = la / lb = p / (1 - p) Ab / Aa`. The verdict is `a older`,
`b older` or `no significant difference` (the interval holds 1). No crater above `dMin` in
either region is `not-constrained`, a refusal. A larger density above one diameter reads
as a longer exposure only under the assumptions the result carries (`AGE_ASSUMES`): one
production function and terrain type, no saturation, partial resurfacing or large share of
secondaries, a count complete above `dMin` (each region states `completeFrom` in km and a
smaller `dMin` is refused; a region's `scale` in km per pixel makes `dMin` under 8 pixels
across a refusal), independent craters, and that it is a ratio, not an age in years. The
areas' sigmas are not in the interval.

**Cumulative index.** The index `b` of `N(>=D) ~ D^-b` above `dMin`, from the `n` diameters at
least `dMin`: the maximum-likelihood estimate `n / S`, `S = sum ln(D_i / dMin)` (Clauset,
Shalizi and Newman 2009), for which `2 b S` is chi-square on `2n` degrees, so the
interval is exact: `chi2(alpha/2, 2n) / 2S` to `chi2(1 - alpha/2, 2n) / 2S`. The unbiased
`(n - 1) / S` is beside it. It is not a log-log fit of the cumulative counts, whose
points are correlated and whose errors are not Gaussian. The constancy check refits above
`2 dMin` and flags `slope-not-constant` when the two indices differ by more than two
standard errors of the difference `sqrt(se2^2 - se1^2)` (the Hausman form for nested
estimates); with fewer than 5 above `2 dMin` it is `not-run`.

## Limits

- **No absolute age**, here or anywhere in this kernel: no production or chronology
  function, no Mars scaling, no completeness correction from injections, no saturation
  or secondary correction. Prompt 196's gate decides whether any of that is reported.
- A roll-off at small diameters (incompleteness, or saturation) is not corrected. The index
  and the ratio assume the count is complete above `dMin`; the constancy check and the
  `completeFrom` refusal are the guards, and the kernel cannot tell a roll-off from a
  real break.
- The Poisson model assumes independent craters. Clustered craters (a secondary field)
  break it; the intervals are then too narrow.
- A flat region and one foreshortening axis. Limb regions, curved footprints and a
  view whose compression varies across the frame are the caller's problem.
- Diameter uncertainty is propagated to a diameter and reported at a threshold; it is not
  propagated into the interval of the count or the ratio.
- No authentic frame was measured (see above); the contract's tier e is NOT RUN. The
  validation of tiers a to d is on synthetic lists with a stated truth (seed `craters-195`,
  `js/random/streams.js`) and on one pinned list made by numpy.

## The validation, as measured (`npm run craters:validate`, Node 24 and Node 22)

Thresholds committed first (33f9c8f2); the oracle's inputs, script and results before the
kernel; the kernel and the tool after. 127 rows pass, 0 fail, 2 NOT RUN (part 1; part 2's
rows are below).

| Check | Bound (committed) | Measured |
| --- | --- | --- |
| a1 Garwood closed forms, defining equations | 1e-9 | all pass (worst below 1e-12) |
| a2 hand-made table | counts exact; density 1e-15 | exact |
| a3 diameter budget | 1e-12 | pass |
| a4 foreshortening, footprint area | 1e-12 | pass |
| a5 ratio, Clopper-Pearson equations | 1e-12; 1e-9 | pass |
| a6 index and chi-square interval | 1e-12 | pass |
| b1 curve (300 diameters, 20 thresholds, 2 levels) against scipy | counts exact; 1e-8 | counts exact; interval 1.5e-14 |
| b2 twelve ratio intervals against scipy `beta.ppf` | 1e-8 | 9.7e-15 |
| b3 index and interval against scipy `pareto.fit` and `chi2.ppf` | 1e-6; 1e-8 | 7e-15 (interval) |
| b4 a crater-statistics tool's curve | | NOT RUN |
| c1 Poisson coverage at expected 3, 10, 30, 100 (4,000 trials) | at least 0.94 | 0.988, 0.977, 0.953, 0.952 |
| c2 ratio coverage, 9 cells | at least 0.94 | 0.958 to 0.982 |
| c3 index coverage, n = 10, 30, 100 | 0.935 to 0.965 | 0.953, 0.953, 0.948 |
| c4 diameter budget one-sigma coverage | 0.66 to 0.706 | 0.687 |
| d1 same density returns "no significant difference" | at least 0.94 | 0.962 |
| d2 ratio 3 detected the right way / the wrong way | at least 0.95 / at most 0.005 | 0.970 / 0 |
| d3 17 refusal cases, no numeric result in a refusal, no age field | all | all |
| d4 roll-off flagged / control flagged (500 trials each) | at least 0.95 / at most 0.08 | 1.000 / 0.048 |
| e1 the reference regions' published counts | | NOT RUN |

In c2 a pair with no craters above `dMin` is counted as covered: the kernel refuses it
as not constrained, which says nothing false. The oracle is scipy 1.15.3 with numpy 2.2.6
(`tools/craters-oracle/`, `python -I`, run offline in the scratch environment of Prompt
180, nothing installed; its inputs and results are `oracle-inputs.json` and
`oracle-results.json`, its provenance `oracle-provenance.json`). It is an independent
implementation of the statistics, not a crater-statistics tool. `tests/craters.test.js`
asserts every row.

## Part 2: four regions, tier b4 as a published formula, tier e on the catalogues

Carl approved the data on 2026-10-25 ("Download the data needed for 195"); the main
session retrieved it (RETRIEVAL.md in the session scratchpad; URLs, byte counts,
SHA-256 and terms are copied into `tests/fixtures/craters/regions-provenance.json`).
`tests/fixtures/craters/regions-thresholds.json` fixed the four regions, the cut, the
projections, the legs and their bounds before any list was cut or any leg run
(`47e48a33`); `tools/craters-oracle/regions.py` (standard library and Pillow, no
Gravitas code) then cut the data and wrote the oracle's counts.

| Region | Box (lon E, lat) | Frame | Scale | Craters at or above 20 km | Area |
| --- | --- | --- | --- | --- | --- |
| `moon-highland` | -10 to 15, -35 to -20 | Clementine nearside (repository fixture), crop 350 x 200 px | 2.0214 +/- 0.0012 km/px at the disc centre, orthographic | 72 (LU78287GT) | 304,982 km^2 |
| `moon-mare` | 20 to 45, 0 to 15 | the same, crop 325 x 223 px | the same | 21 | 340,889 km^2 |
| `mars-highland` | 41 to 53, 1 to 13 | MDIM 2.1 colourised, 1 km/px, crop 713 x 712 px | 1.0000 km/px, east-west compressed by cos(lat) | 91 (Robbins V1) | 501,254 km^2 (sigma 0.3 percent) |
| `mars-plains` | 166 to 178, 1 to 13 | the same, crop 712 x 712 px | the same | 14 | 501,254 km^2 |

`frames/craters-regions.json` holds, per region, the area, the geometry, the stated
completeness limit (30 km on the Moon, 20 km on Mars) and the list of diameter, longitude
and latitude (nothing else). The four frames are `frames/craters-<region>.json`, the
display plane in Prompt 189's `gravitas.image-pack-planes/1` form, rows from the bottom as in
FITS, gray of red, green and blue as `displayPlane` computes it; display-only, so marks are
permitted and photometry and astrometry are refused. They are in no precache tier and in no
data pack (`tools/data-budget.json` is untouched); `build.js` copies them to `dist/`.

**Geometry for the kernel.** On the Moon the orthographic view compresses the radial
direction by cos E = sqrt(1 - (rho / R)^2) at distance rho from the disc centre, so a mark's
`foreshortening` is `{ cosE, axis }` with the axis the radial direction at that place. On Mars
the map is equirectangular: use `scale = s cos(lat)` and `cosE = cos(lat)` with the
compressed axis along y. The area is the spherical rectangle `R^2 (lon_hi - lon_lo)
(sin lat_hi - sin lat_lo)`, stated, not derived from pixels.

### Results (`npm run craters:validate`; 21 more rows, all pass or are NOT RUN)

| Leg | Committed bound | Measured |
| --- | --- | --- |
| b4 formula: density equals N / A of the Crater Analysis Techniques Working Group | 1e-15 | 0 |
| b4 formula: Garwood half-width against sqrt(N) / A, N at least 100 | 0.10 | 0.051 |
| b4 formula: the same, 30 to 99 | 0.20 | 0.086 |
| b4 formula: below 30 | reported | 0.56 |
| b4 craterstats pin | | NOT RUN (not installed) |
| e1 counts: the kernel on the committed list against an independent count from the raw catalogue, four regions | exact | exact |
| e1 area: the spherical rectangle against the script's | 1e-12 | 0 |
| e2 verdict, Moon: highland against mare above 30 km | `a older`, lower end above 1 | `a older`, R 6.39 (2.83 to 16.9), 40 and 7 craters |
| e2 verdict, Mars: highland against plains above 20 km | the same | `a older`, R 6.50 (3.68 to 12.4), 91 and 14 |
| e3 index in 1.0 to 3.5, above the completeness limit | band | highland 1.71 (n 40), mare 3.47 (n 7, 1.4 to 6.5), Mars highland 1.72 (n 91), plains 1.55 (n 14) |
| e4 the committed frames, lists and recorded sources are the ones in the provenance file | 0 mismatches | 0 |
| tier e against Head et al. 2010, a second lunar catalogue | | NOT RUN (the host refused connections) |
| tier e on the frames themselves (marks on them) | | NOT RUN (no person's marks exist; none simulated) |

Read these plainly. Tier e here is one catalogue per body: it checks that the committed
data are the catalogue's, that the kernel counts and bounds them as an independent script
does, and that the physically expected verdict (highlands older than maria and plains)
comes out with an interval excluding 1; it is not a cross-catalogue comparison and no one
has counted craters on these frames. The Moon's mare index sits 0.03 under the top of its
committed band on seven craters (its interval runs from 1.4 to 6.5): the leg passes, and
says almost nothing. The highland box takes in an edge of Mare Nubium (visible at the
left of its frame), which lowers its density and so works against the verdict, not for it.
The Moon's catalogue integrates Head's list and completes to about 8 km; a 20 km crater is
10 pixels on the Clementine frame, which is why the stated completeness is 30 km there.

### Rights

The Clementine frame is NASA/JPL/USGS (fixture provenance). The Mars frame is USGS
Astropedia, "Access constraints: Public domain", "Use constraints: None". The Moon's
catalogue is LU78287GT on USGS Astropedia, "Access Constraints: None", "Use Constraints:
Please cite authors" (cited in the file). The Mars catalogue states no licence on the
USGS collection page or on its author's page: only the regional diameter, longitude and
latitude at or above 20 km are committed, with credit, as a recorded "no licence stated,
credited" decision under Roadmap III 7.5.4 (D-R10-77), ratified by Carl: AskUserQuestion to the merge-queue session, 2026-10-25: "Keep, credited (Recommended)" = "Facts-only subset (positions and sizes), credited, and it can be removed later. The legs that need it keep running." (a facts-only subset: positions and sizes).
The full files (the Mars JPEG, the Salamuniccar zip, both Robbins answers) are not in the
repository; their size and SHA-256 are.

## Part 3: the three investigations, the instruments and the model page

Items 3 and 4 of the prompt, built on the kernel of part 1 and the regions of part 2 (D-R10-85).

| What | Where |
| --- | --- |
| The instruments, a lazy family `crater` (three instruments, drawn by the plot component or a canvas, English and Spanish) | `js/craterWidgets.js`, `js/i18n/{en,es}.craters.js` |
| Survey: Which Surface Is Older? (count the craters above a diameter in two regions, predict which is older, read the density ratio and its interval, and the verdict "no significant difference") | `which-surface-is-older` |
| Majors: Craters by Size (the size-frequency plot with error bars, the slope with its interval, the roll-off as a count that stops short, what the flag does and does not say) | `craters-by-size` |
| Upper: What a Crater Diameter Is Worth (the diameter of one circle on a map, the four terms of its uncertainty, the correction for the view, and why no age in years is reported) | `what-a-crater-diameter-is-worth` |
| The lessons, their depths (core, quantitative, advanced), their Spanish and their instructor content | appended to the four shared `js/data/investigations/{,es/,depth/,depth/es/}measurement-sequence.js` (no new closure file) and twelve one-line re-exports for the loaders |
| The model page's section, "Crater counting: what a relative age assumes" | `model/index.html#craters` |
| The numbers every step states | recomputed from the kernel in `tests/craterLessons.test.js` |

**The instruments.** `crater-regions` compares two regions at a diameter: each density with its
exact Poisson interval, the density ratio with its exact interval, the verdict and, when it applies, the
refusal (below the completeness limit, too small to place, no crater at all above the diameter).
`crater-sfd` draws one region's cumulative plot through the plot component (the chart gained an optional
`sigmaLow` so a Poisson interval, which is asymmetric, is drawn as it is), the maximum-likelihood
index with its interval and unbiased form, and the check at twice the fit diameter. `crater-budget`
turns a circle on the Clementine highlands frame into a diameter with the four terms of its uncertainty,
the view's correction with and without it, and the chance that this crater counts above a threshold.

**Nothing simulated.** The circles drawn on a picture are the catalogs' (LU78287GT for the Moon,
Robbins for Mars), at their listed positions and diameters, as ellipses (the ground circle seen
at its angle on the Moon, stretched by 1 / cos(latitude) on the Mars map). They are not marks that anyone made on the
pictures, and every row that names them says so. No participant's marks exist and none is invented. The one circle a reader
places, in `crater-budget`, starts on the catalog's crater at 112.2 km and reads 112.0 km with the view
corrected. The "count that stops short" control of `crater-sfd` is a labeled perturbation of the
published list (the smallest craters under the completeness limit are left out, smallest first); it
exists so that the slope check's flag (check d4 of the contract) can be seen at work, and it is
not data. No roll-off is visible in the committed lists above 20 km.

**Misconceptions** (each is a distractor with its own reply, or a statement in the instructor guide): a count
is not a density; a density ratio is not a ratio of ages in years; "no significant difference" is
not "the same age"; small craters do not count the same as large ones (the numerous and incomplete
ones, the first lost to saturation); resurfacing and saturation make a surface look younger and
secondary craters older; a steeper slope is not an older surface; a correction with a small
uncertainty is still a large correction; a diameter good to five percent is not what stands between a
density and an age. A prediction step shows no instrument (its readout would give the answer away) and
carries no misconception (the remix cannot carry them).

**Alt text.** Each picture's description is the first row of its readout (`crW.alt.<region>`:
what the picture shows, its scale, and how many of the catalog's circles are drawn); the canvas
is named from the instrument's title and points at that readout.

**Not done here.** An age in years, in any form (Prompt 196's gate). A count of the frames by a person
(tier e on the frames themselves). The craterstats pin (tier b4) and Head's second catalog (tier e). A
Spanish read by a fluent reader. No new closure file: the instructor bundle's closure stays at 281.

## References

- Garwood, F. 1936, Biometrika 28, 437 (the exact Poisson interval).
- Clopper, C. J. and Pearson, E. S. 1934, Biometrika 26, 404.
- Clauset, A., Shalizi, C. R. and Newman, M. E. J. 2009, SIAM Review 51, 661 (the
  maximum-likelihood power-law index).
- Hartmann, W. K. and Neukum, G. 2001, Space Sci. Rev. 96, 165 (cratering chronology; the
  counting conventions, for Prompt 196).
- Crater Analysis Techniques Working Group 1979, Icarus 37, 467 (the standard for
  counting and plotting).
