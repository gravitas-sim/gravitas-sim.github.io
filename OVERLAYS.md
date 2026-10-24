# Catalogue overlays, blink and compare

Roadmap III, Prompt 182. A calibrated frame can carry the catalogue's stars and
the planets, and a second frame can be laid over it, blinked against it or
subtracted from it. This file is written in the order the work was done: the
validation contract first, and the rest after the measurements.

## The validation contract (committed first)

The thresholds are in `tests/fixtures/overlay/thresholds.json` and were
committed, with this section, before `js/measure/overlay.js`, the oracle's
inputs and results or any measurement existed (the branch history shows the
order). A check that a measurement crosses is a failed check, not a reason to
move its bound, and no bound is multiplied or relaxed after a result is seen;
only Carl resets one. The checks follow the roadmap's section 7.5.8.

**What is new here.** The projection, the fit and the registration are Prompt
181's (`js/measure/astrometry.js`) and are not tested again. This prompt adds
what sits on top of them: which catalogue entries fall in a frame and where, at
the frame's time; where the planets are; how a second frame is carried onto the
first; when the two may be subtracted; and how well the fitted sky coordinates
predict a catalogue star's pixel.

**Rules fixed in advance.**

- A catalogue entry is listed only if its projected pixel is inside the frame
  (`0.5 <= x <= w + 0.5`, the same for y). An entry outside the frame is not
  given a position, not listed and not drawn: it is counted as "not in this
  frame" and nothing else.
- At most 500 entries are listed for a frame, the brightest first, and the
  number left out is stated. The 500 is the same bound the reference-star table
  of Prompt 181 holds.
- A catalogue position is the pack's J2000.0 position moved to the frame's time
  by linear proper motion (`js/kernels/sky/stars.js`). With no usable time the
  stars are listed at J2000.0 and the page says they were not moved. Planets
  need a time: with none (or a scale this page cannot move to TT: TCB, local)
  they are refused, in words. There is no aberration, precession or parallax.
- A planet is the geometric geocentric position from Standish's elements
  (`js/kernels/sky/planets.js`), good to 0.2 degree (`planetProvenance`); it is
  drawn with that bound as a circle and listed with the bound, and the page
  says a 0.2 degree circle is larger than most fields.
- The overlay needs the frame's sky coordinates: the calibration the reader
  solved (Prompt 181's panel) or, failing that, the image's own header; a
  sidecar marked display-only refuses, in the contract's words, and an image
  with neither refuses.
- Blink and side by side compare any two images, display-only included: a
  picture to look at is not a measurement. The tie between two frames is the
  sky (both have sky coordinates), matched stars (Prompt 181's registration)
  or the same pixels (same size, nothing moved).
- The difference view is allowed only when both frames carry the quantitative
  contract (`permits(.., 'photometry')`), have the same calibration state and
  the same pixel unit, and, in a count unit, the same exposure; the tie is not
  inconsistent; and the four planes it holds fit in the decoded-memory bound
  of Prompt 157. Otherwise it is refused with the reason. It is bilinear, a
  picture for the eye, never a measurement and never stored.
- Blinking runs at 0.5, 1, 2 or 4 frames a second, 1 by default; with reduced
  motion there is no timer, and a button shows the other frame.

**(a) Analytic cases.** A star at the reference position lands at CRPIX to 1e-9
pixel; a 21 by 21 grid of sky positions round-trips to 1e-7 pixel; a proper
motion of 1000 mas/yr over ten years is 10 arcsec directed east at four
declinations to 1e-4 arcsec; time scales (UTC to TT within 1 s of the 69.184 s
that astropy gives, TAI exactly 32.184 s, ISO, MJD and JD alike); a star 0.0001
pixel inside the edge is listed and 0.0001 outside is not; the cap; the planets
land where the kernel puts them; the identity registration returns the frame
bit for bit and an integer shift is exact; a rotated and shifted star keeps its
centroid within 0.02 pixel; the difference of identical frames is zero, of a
frame and itself plus 3 is 3, of a frame and itself plus a point source is the
source; the blink intervals.

**(b) An independent oracle.** `astropy.wcs` (wcslib), `astropy.coordinates`
(`SkyCoord.apply_space_motion`, `get_body` with the builtin ERFA plan94
ephemeris, `Time`) and `scipy.ndimage.map_coordinates`, run offline in the
scratch environment Prompt 180 made (numpy, scipy, astropy, photutils; nothing
added), pinned as fixtures with versions, parameters, retrieval and digests, no
Gravitas code running in it: all 904 stars of the pack through the orion truth
WCS at J2000.0 to 1e-6 pixel and at 2026-01-01 to 0.002 pixel, with the same
set of stars in the frame; the kernel's UTC to TT against astropy's to 1 s; the
five planets at five dates against plan94 to the kernel's stated 0.2 degree;
the resampling against `map_coordinates` order 1 to 1e-9; a first-frame pixel
carried to a second frame through two WCS against wcslib to 1e-6 pixel. **Not
run until Prompt 189:** an authentic frame with catalogue stars (b5, e1).

**(c) Coverage.** On a fixed seeded ensemble (3,000 trials, 5 to 8 fit stars
with 0.15 pixel noise, random truth), the stated sigma of the pixel predicted
for an exactly known catalogue star (the fit's covariance carried to that
star's pixel) covers the truth at 64 to 72 percent for one sigma and 93.5 to
97.5 percent for 1.96 sigma, per axis at five test pixels, for the affine model
and the similarity model.

**(d) Refusals.** No time, an unmovable time scale or a time that does not
parse (planets refused, stars not moved); display-only, no sky coordinates and
a header in a projection this page does not do; nine constructed pairs for the
nine reasons a difference is refused, and two accepted; a registration with two
pairs swapped refuses the difference in at least 99 percent of 300 trials; the
decoded-memory bound; fewer than three pairs.

**(e) Authentic data.** One authentic calibrated pair with catalogue stars and
a moving object, blinked and overlaid. **Not run until Prompt 189.**

**Timing.** The whole pack over a 1,024 by 1,024 frame in 250 ms or less, and a
1,024 by 1,024 carry and difference in 1,500 ms or less, in plain Node.

## What was built

- `js/measure/overlay.js` (504 lines, imports only Prompt 181's kernel and the
  sky kernel): `starsIn` and `planetsIn` (which entries fall in a frame, where,
  at what time), `skyFor` (the solved calibration wins over the header),
  `predictionSigma` (the fit's covariance carried to a catalogue star's
  pixel), `tieOf`, `carry` (bilinear), `subtract`, `differenceVerdict` (nine
  refusal codes, each with the data that explains it) and `blinkPlan`.
- `js/observatory/imageOverlay.js`, the panel "Catalogs, blink and compare" in
  the Observatory, loaded when it is first opened (a lazy file, never
  precached, listed in `NEVER_PRECACHED`); its words are two lazy catalogs,
  `js/i18n/en.imageOverlay.js` and `es.imageOverlay.js`, registered for the
  page's language and re-registered when it changes.
- Overlay: one button, boxes for the stars, the planets and the names, a
  magnitude limit, the notes (which sky coordinates, the epoch and the
  proper-motion treatment, the planets' 0.2 degree), the picture, and a table
  of read-only rows (name, kind, x, y, RA, Dec, magnitude, sigma) that holds
  exactly what is drawn. The table is the panel's own; it does not write into
  the marks table, so no measurement can come from a catalogue entry.
- Compare: "use the next image I open" holds a second frame; the tie is the
  sky, matched stars or the same pixels; the view is blink (0.5, 1, 2 or 4 a
  second, a button by hand under reduced motion), side by side with two
  cursors linked through the tie and moved by the arrow keys (Alt a quarter
  pixel, Shift four, or buttons), or the difference, refused with the reason
  unless both frames carry the quantitative contract with one calibration
  state, one unit and, in counts, one exposure. A difference is a picture, not
  a measurement, says so, and is never stored.
- The count of what is drawn and listed is bounded at 500 by the same rule as
  Prompt 181's table, and a frame pair is held only inside Prompt 157's
  decoded-memory limit (`too-large` refuses the difference).
- Nothing is fetched except the site's own `/sky/bright-stars.json`, when the
  stars are first drawn. Nothing is stored or uploaded.

## Results

`npm run overlay:validate` runs every check and prints the table; `--json`
gives the rows. Measured here, bounds as committed in `thresholds.json`.

| Check | Bound | Measured | Verdict |
|---|---|---|---|
| a1 tangent point; 21 by 21 round trip | 1e-9 px; 1e-7 px | 0; 1.8e-12 px | pass |
| a2 1000 mas/yr over ten years | 1e-4 arcsec | 7.9e-9 arcsec | pass |
| a3 time scales (UTC to TT within 1 s; exact conversions 1e-6 s) | as stated | UTC 0.056 s; TAI 1.4e-5 s; start and end 1.0e-5 s | **FAIL** (see below) |
| a4 frame edge, a5 cap of 500, a6 planets, a7 resample identity, a8 rotated centroid, a9 difference, a10 blink | as committed | all within | pass |
| b1 904 stars, orion WCS, J2000.0 / at 2026-01-01, vs astropy wcslib | 1e-6 px / 0.002 px | 1.7e-12 / 5.9e-12 px, same stars in frame | pass |
| b1 UTC to TT vs astropy | 1 s | 0.056 s | pass |
| b2 five planets, five dates vs ERFA plan94 | 0.2 deg | worst Saturn 0.170, Jupiter 0.104 deg | pass |
| b3 resample vs `map_coordinates` order 1 | 1e-9 | 2.6e-11 over 6,487 pixels | pass |
| b4 sky-map through two WCS vs wcslib | 1e-6 px | 2.0e-12 px | pass |
| c1, c2 coverage of the predicted pixel, 30,000 per model | 1 sigma 64 to 72 %; 1.96 sigma 93.5 to 97.5 % | affine 69.0 / 95.3 %; similarity 68.9 / 95.3 % | pass |
| d1 to d6 refusals (no time, display-only, nine difference reasons, 300 swapped-pair trials, decoded memory, fewer than three pairs) | as committed | 300 of 300 refused; every reason named | pass |
| f1 pack over 1,024 by 1,024; f2 carry and difference | 250 ms; 1,500 ms | 1.9 ms; 244 ms (Node, this Mac) | pass |
| b5, e1 an authentic frame with catalogue stars; one authentic pair blinked | | | **NOT RUN until Prompt 189** |

The oracle is astropy 6.1.7 (wcslib, ERFA 2.0.1.5) with scipy 1.15.3 and numpy
2.2.6, run once in the scratch environment Prompt 180 made, nothing installed,
no Gravitas code in it; `tests/fixtures/overlay/oracle-provenance.json` records
versions, parameters, digests and the two ERFA warnings that were kept.

## The leg that fails (a3.timeScales)

The committed bound for exact conversions (TAI to TT, the half-exposure shift)
is 1e-6 s. A Julian date near 2.46 million is a double whose neighbours are
2^-31 day (4.0e-5 s) apart, so no arithmetic can read a 32.184 s or 50 s shift
back from one double to 1e-6 s. The leg is reported failed, the bound is not
moved, and `tests/fixtures/overlay/failed-legs.json` holds it with its cause;
`tests/overlay.test.js` holds the measurement to that record, so a change that
fixes or worsens it cannot pass unnoticed. A second row, `x.a3.timeScalesAtResolution`,
states the same errors against one spacing of the doubles (all below it) as
evidence, not as a replacement for the failed leg.

Ruling: Carl, chat 2026-10-23 (chose "Leave failing, labelled (Recommended)" = "Keep the committed 1e-6 s, record a3 as a known failed leg with its cause (tests pin it), take #431 out of draft and merge; no threshold moved.") The leg is therefore a known failed leg, left failing and labelled: the committed 1e-6 s bound is untouched, the cause is above, and the page effect is the 5e-10 degree below.
Nothing in the page depends on it: a time off by one spacing moves the
fastest planet (about a degree a day) by 5e-10 degree, against its 0.2 degree
bound.

## Defects found in the harness while writing it

Reported because the order matters: one was found on the first run and fixed
before the leg was judged, and none changed a bound. `d2.noSky`'s history
entry lacked a version and a lossy flag, so `permits` said "invalid" instead of
"geometry-unrecorded": the case was built wrongly and was corrected. The
oracle wrote `NaN` for stars behind the tangent plane, which is not JSON: it
now writes `null` and the validator skips those entries. Two Jest cases had
placed CRPIX and a half-pixel index wrongly.

## Limits (said in the panel too)

- Planets are Standish's elements, good to 0.2 degree; the circle drawn is the
  bound, and it is larger than most frames. A planet outside the frame whose
  bound reaches the frame is listed as "may be in view".
- Stars move by linear proper motion only; no parallax, aberration or
  precession (the pack and the tangent plane are J2000.0).
- The overlay rows are not measurements and cannot be added to the marks table.
- A header the page cannot project (not TAN, or with distortion) refuses.
- Blink is not a registration check: two frames tied by the sky are as well
  aligned as their calibrations.
- The Spanish was not read by a fluent reader.

## Not run until Prompt 189

An authentic frame with catalogue stars (b5), and an authentic calibrated pair
with a moving object blinked and overlaid (e1). Nothing was downloaded and no
frame was simulated for either; the panel was driven in e2e by synthetic frames
built from the pack's own stars at the pixels the truth WCS gives, which tests
the panel and the arithmetic against the oracle, not the sky.

## Where things are

`tests/overlay.test.js` (25 tests) and `e2e/imageOverlay.spec.js` (13 tests, en
and es, axe in light and dark, 24 pixel targets at 1280 and 390, the keyboard
alone, reduced motion). `tools/overlay-validate.mjs` and `tools/overlay-oracle/`
hold the validator and the oracle script, with their fixtures in
`tests/fixtures/overlay/`.
