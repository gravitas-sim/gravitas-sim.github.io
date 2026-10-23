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
