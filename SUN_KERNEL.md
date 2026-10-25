# The Sun as a measurement: disc geometry, rotation from spots and the solar constant

Prompt 194 (Roadmap III, R14, production kernel). The kernel in `js/kernels/sun/`:
a pixel on a solar disc image becomes a heliographic latitude and longitude from the
standard disc geometry; tracked spot positions become a synodic and a sidereal rate
with an uncertainty, a warning near the limb and refusals; rates at stated latitudes
are compared with a fixed-form reference law, of which only the equatorial term is
fitted by default and never more coefficients than there are distinct latitudes; a
measured flux becomes the Sun's luminosity and effective temperature through the
radiation kernel. No function fits an unrestricted latitude law.

## The validation contract (committed first)

`tests/fixtures/sun/thresholds.json` fixed every definition, every bound and every
refusal code before `js/kernels/sun/`, the validation tool, the oracle's results and
the tests existed (Roadmap III, 7.5.8; commit `f7baba69`, the note on its rounded figures `2264f861`, the
oracle `215b60f2`, the kernel `0f15db4e`). A check that a measurement crosses is a failed check; only Carl
resets a bound.

| Tier | Checks |
| --- | --- |
| (a) analytic or synthetic | a1 pixel to heliographic to pixel round trips, four disks; a2 closed forms (centre, limbs, P, B0, mu, the perspective limb, monotone); a3 the law and Carrington's constants; a4 the Earth's rate at perihelion, aphelion and over a sidereal year; a5 the secant sigma; a6 the flux chain against the IAU 2015 nominal values; a7 a synthetic spot at the law's rate recovered by the fitting path; a8 the equatorial-term fit in closed form |
| (b) independent oracle | b1 five pinned pixels against numpy ray tracing; b2 P, B0, L0 at six instants against a vector construction from astropy's (pyerfa) Sun and Carrington's elements, and the Earth's rate over three windows; b3 the flux chain against scipy.constants; b4 a cited solar-coordinates package: NOT RUN |
| (c) coverage | c1 the sidereal rate (2,000 tracks), c2 the equatorial term (2,000 draws), c3 the luminosity (2,000 draws) |
| (d) widen, refuse, say "not constrained" | d1 a limb track against a disc track: a warning, `precise` false, a sigma three times larger; d2 coverage of the widened interval; d3 nineteen hostile inputs each with its code; d4 two latitudes cannot fix three coefficients |
| (e) authentic data | e1 the 14-day HMI sequence's rates against the law; e2 the measured irradiance series' luminosity: both NOT RUN |

## Result

`npm run sun:validate`: 71 rows, 67 pass, **1 fail** (left failing), 3 NOT RUN. In
detail: the round trips agree to 7e-13 degree and 2e-13 pixel; five pixels agree with the
oracle's ray tracing to 4.5e-11 degree (mu 3e-12); P, B0 and L0 agree with the oracle to
0.0057, 0.0006 and 0.0080 degree over six instants (bound 0.02); the Earth's rate to
2.5e-4 degree a day (bound 5e-4); the flux chain is exact against scipy.constants
(1.8e-16) and gives 3.8275e26 W and 5771.83 K from 1361 W/m2 at 1 AU against the IAU
nominal 3.828e26 W and 5772 K (1.2e-4 relative, 0.17 K). Coverage of 95 percent
intervals: rate 0.9655, equatorial term 0.969, luminosity 0.948. A limb track returns the
foreshortening warning, `precise` false and a rate sigma 3.33 times a disc track's
(0.599 against 0.180 degrees per day); at 1 px of noise 341 of 2,000 limb tracks are
refused (a point within mu 0.1 of the limb, or a rate its own sigma does not constrain)
and the 1,659 returned cover at 0.959.

### The failed leg

`a7.noiseFree.synodicRoute` fails as committed: 0.008035 degree a day against 0.002.
The committed route adds the Earth's ecliptic rate to the Stonyhurst synodic rate. A
feature's Stonyhurst longitude loses the sub-Earth point's rate **along the solar
equator** (dL0/dt plus 360 / 25.38), and the equator is inclined 7.25 degrees, so the two
differ by up to 1 / cos 7.25 - 1 = 0.8 percent of a degree a day with a sign that follows
the season (the measured errors at 15 degrees are -0.0079, +0.0075, -0.0077, +0.0080
across the four start dates; weighted and unweighted fits give the same, so it is not the
weights). The bound was a guess about curvature, not this term. The leg stays failing
(`tests/fixtures/sun/failed-legs.json`, held by `tests/sun.test.js`). The kernel's own
sidereal rate now corrects with the equatorial rate (`earthRateInSolarEquator`), and two
rows were ADDED after the failure to hold that: `a7.noiseFree.equatorRoute` (8.0e-5 under
the same 0.002) and `b2.rateEquator` (2.4e-4 against the oracle's daily L0 steps, under
the committed 5e-4). Neither stands in for the failed leg; restating it is Carl's. The
Carrington route (a fit of the Carrington longitude, no Earth rate) recovers the rate to
7e-15 and is reported beside the other as a self-consistency check.

### Honest notes on order

- The thresholds file carries one correction, written before any kernel code existed: the
  degrees-per-day figures quoted for the primary law were rounded by hand and wrong in the
  fourth decimal (typed values are the microradians per second; no check depends on the
  rounded text).
- The oracle's first run gave B0 of -38 degrees: the oracle's ecliptic rotation had the
  wrong sign (B0 cannot exceed 7.25 degrees). It was fixed in the oracle before any
  kernel number was compared. The oracle later gained `equatorDegPerDay` (after the a7
  failure above).
- Two harness defects were fixed before their rows were judged: a6's series check first
  compared against a raw sum-of-squares reference that cancels to nine digits (the
  committed 1e-12 bound is now held with a shifted-sum reference), and d3's "mu below 0.1"
  input first used longitudes that are still above mu 0.1.
- Every bound in the table above is the committed one; `thresholds.json` was not edited
  after the correction note.

## What is built, and what is not

Built: the kernel (item 2 of the prompt), its validation and this document.

Not built, because each needs data the repository does not hold, and nothing may be
fetched without Carl's word per request:

- **Item 1, the packs**: a 14-day daily HMI continuum sequence with each frame's date,
  disk centre, radius, P and B0 in a sidecar, and a daily total-solar-irradiance series.
  The repository holds one SDO frame (`sdo-hmi-continuum-20240510`, Prompt 189): a
  1,024-pixel browse picture of one day, **display-only** under 189's rule ("a picture
  permits marking and refuses photometry and astrometry"), whose source terms say browse
  products are "not intended for science analysis or publication" without the PI's
  consent. It has no stated disk geometry. No irradiance value is in the repository.
- **Tier b4 and tier e**: NOT RUN, with the reason in the validator's note.
- **Items 3 and 4**, the investigations ("The turning Sun", "The Sun's power"), the
  misconceptions, the alt text from the sidecar's group counts and the model page
  section: they measure the frames and the series, so they wait for them. Nothing
  student-facing was added; no Spanish; no closure file (the investigations would append
  to the four shared measurement-sequence files already in the closure).

### What would unblock the rest (a request, not made)

| Need | Source | Licence | Size |
| --- | --- | --- | --- |
| Fourteen daily HMI continuum frames, one a day at 12:00 UT. Recommended window 2024-05-04 to 2024-05-17 (it contains the frame already in the packs); the groups at two latitudes must be confirmed by looking at the frames before they are committed | A: the SDO browse pictures `https://sdo.gsfc.nasa.gov/assets/img/browse/YYYY/MM/DD/YYYYMMDD_120000_1024_HMIIC.jpg` (static files). B: JSOC `hmi.Ic_noLimbDark_720s` FITS (an export request, not a static file; 189 dropped such requests) | SDO data rules: not copyrighted unless noted, credit; browse products not for science analysis (A needs Carl's ruling that marking spots on a display-only frame is within that, and that 189's display-only contract admits a heliographic reading that is not astrometry); B is science data with the same credit | A: 14 x about 216 KB = 3 MB; B: about 10 MB each (about 150 MB, never committed; resampled to 1,024 pixels by a build tool, about 340 KB a frame as a base64 frames file) |
| The sub-Earth coordinates and the distance for the 14 instants | JPL Horizons, one observer-table request, target Sun, observer geocentre, quantities sub-observer longitude and latitude (L0, B0), north-pole position angle (P) and the distance | JPL's public service, credit | about 3 KB (this kernel's `subEarth` agrees with the Horizons-class oracle to 0.008 degree; a pack should still pin Horizons' own values) |
| A daily total-solar-irradiance series over the window | NASA, LASP TSIS-1 TIM daily L3 (the SORCE TIM series ended in 2020) | NASA and LASP open data with a citation request (terms to be read at retrieval) | under 2 KB |
| The active-region group count per day, for the frames' alt text | NOAA SWPC Solar Region Summary | US Government work, public domain | 14 files of about 3 KB, or one |
| A re-reading of the two laws' coefficients, and a sunspot-tracer law | Howard, Harvey and Forgach (1990), Snodgrass and Ulrich (1990), and a sunspot law (Newton and Nunn 1951; Howard, Gilman and Gilman 1984) | the coefficients only, cited | none to commit; the session cannot read the papers |
| For tier b4: a cited solar-coordinates package in the oracle environment | sunpy (PyPI), in a new virtual environment | BSD-2 | tens of MB, not committed |

Whether the frames ship as app packs (the data budget has 4,337 B raw and 781 B gzip of
room, so they would not) or as lazy `NEVER_PRECACHED` files is a decision for Carl, as at
189, 193 and 195.

## The model

Everything is a closed form or a weighted least-squares line; `js/kernels/sun/` is pure.

**Geometry** (Thompson 2006, A&A 449, 791; Meeus ch. 29). The image has north up and east
left; `dx = x - cx` to the right (solar west), `dy = cy - y` up (north); the pole is at
position angle P, counterclockwise from up. Offsets in radii are rotated by -P to
(x', y'); orthographic, `z' = sqrt(1 - x'^2 - y'^2)`,
`sin(lat) = y' cos B0 + z' sin B0`, `lon = atan2(x', z' cos B0 - y' sin B0)`, Carrington
longitude `L0 + lon`. With a distance the observer is at `D = d / R_sun` radii, the disc
subtends `theta_sun = asin(1 / D)`, the normalised radius is linear in angle and the
heliocentric angle is `rho = asin(sin(theta) / sin(theta_sun)) - theta`: the limb is at
90 degrees minus 0.27 degree. `mu` is the cosine of the angle between the normal and the
line of sight. The inverse tilts by B0, projects along the ray and rotates by +P.

**Uncertainty.** The placement sigma (default 1 px) goes to a longitude and latitude sigma
by the secant: the half difference of the position at plus and minus one sigma along x and
along y, in quadrature, a displaced point outside the disc clamped to the limb. At mu 0.2
it is five times the centre value. A point within mu 0.35 of the limb adds the warning
`foreshortening` and the result is not precise; one within 0.1 is not used (`limb`).

**Rotation from a track.** The weighted least-squares line of Stonyhurst longitude against
time (weights from the secant sigmas; the sigma of the rate is inflated by the square root
of chi-square per degree of freedom when that exceeds one, never reduced). The sidereal
rate is the synodic rate plus the Earth's rate along the solar equator. A fit of the
Carrington longitude gives the sidereal rate minus 360 / 25.38 directly and is reported as
a check. Fewer than three usable points, or a rate whose sigma exceeds half its size, is
refused.

**The law, and the bound on what can be fitted.** `omega = A + B sin^2 + C sin^4`,
sidereal degrees per day. Primary: Howard, Harvey and Forgach (1990) 2.894, -0.428,
-0.370 microradians per second (14.3263, -2.1188, -1.8316 degrees a day); second, for the
tracer systematic only: Snodgrass and Ulrich (1990) 2.851, -0.343, -0.474. **Both are
typed from the publications and were not re-read (`checked: false`), and neither law's
tracer is sunspots** (small magnetic features, Doppler features), so a spot group can sit
a few percent off. The two laws differ by at most 0.21 degree a day at the latitudes
tested; a comparison carries a stated 0.3 degree a day floor of group-to-group scatter in
quadrature. `fitRotationLaw` fits only the coefficients named free (default A), refuses
more free coefficients than distinct latitudes (`under-determined`: two latitudes cannot
determine three coefficients), and says so when the number free equals the number of
observations (`zeroDof`, no goodness of fit).

**The Sun's power.** `S1 = S d^2`, `L = 4 pi AU^2 S1`, `Teff = (L / (4 pi R^2 sigma))^(1/4)`
through the radiation kernel's `effectiveTemperature`; sigmas in quadrature. A series is
corrected to 1 AU, averaged, and its standard error taken from the scatter. 1361 W/m2 is
the IAU 2015 B3 nominal solar constant used here as the *reference value of the check*,
not as a measurement.

**The sub-Earth point.** Meeus ch. 29 with the sky kernel's Sun: P, B0 and L0 (geometric,
no light-time turn of the surface, which is about 0.08 degree and was not measured here).

## Limits stated, not hidden

- No authentic frame, spot or irradiance value has been measured with this kernel; the
  recovery is shown on synthetic spots at the law's rate, on pinned oracle positions and
  on the reference constants.
- Sunspots are not points on a sphere: the Wilson depression, proper motion within a
  group and group evolution are not modelled; the Birge inflation widens the interval for
  scatter it sees, not for a bias.
- The law is a reference, not a fit to this Sun's rotation that day; individual groups
  scatter about it.
- A browse JPEG is a display picture. Heliographic positions read from one carry the
  placement sigma and the foreshortening, and nothing about the picture's photometry or
  its own world coordinates (which it does not have).
- Carrington's elements are old mean elements; Horizons-pinned values in a pack can
  differ from `subEarth` by the light-time turn (0.08 degree) and by the elements.

## Files

`js/kernels/sun/{geometry,ephemeris,rotation,irradiance,index}.js`, `tools/sun-validate.mjs`
(`npm run sun:validate`), `tools/sun-oracle/{oracle.py,oracle-inputs.json}`,
`tests/fixtures/sun/{thresholds,oracle-results,failed-legs}.json`, `tests/sun.test.js`.
The kernel is listed in `NEVER_PRECACHED` (`tools/build-service-worker.mjs`) though no page
imports it yet, so a later panel that imports it installs nothing. Register row D-R10-79.
