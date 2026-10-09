# Sky, time and coordinates gate: acceptance thresholds

Roadmap II, Prompt 87. **This file is committed before any prototype code
exists and before any measurement is run.** Its commit time in git history is the
evidence. Nothing below is changed after a measurement: a piece that misses a
threshold is recorded as C for that piece with the number, never passed by
moving the line.

Base: `v2` at f043db5b. Reference tools available on the measuring machine:
ERFA 2.0.1.5 (the IAU SOFA algorithms, through PyERFA, shipped with astropy
6.0.1). Published values come from Meeus, *Astronomical Algorithms*, 2nd ed.
(1998), and the U.S. Naval Observatory's published almanac data; every fixture
cites its source.

## What is measured

- **Candidate code.** (a) `js/observingWindow.js`, the production module that
  already holds a Julian date, mean sidereal time, Alt/Az, an airmass fit, a
  low-precision Sun and a truncated lunar series (reuse is measured, not
  assumed); (b) new prototype code in `spike/sky/`: the missing pieces
  (delta-T, apparent sidereal time with nutation, precession, refraction,
  topocentric Moon, planets, renderer, catalogue). Each piece's verdict names
  which of the two supplies it.
- **Supported range.** Gregorian 1900-01-01 to 2100-12-31 for the time kernel,
  coordinates, Sun and Moon. Planets: 1900-01-01 to 2050-12-31.
- **Time arguments are Julian dates; no module reads a clock.**
- **Error is the maximum over the sample, not the mean.** Samples are fixed and
  seeded before measuring: 2,000 random instants and sites per test (seed 87),
  plus the pinned published cases.

## T1 Time kernel

| Id | Threshold |
|---|---|
| T1.1 | Julian date from a calendar date: exact (<= 1e-9 d) on every pinned Meeus ch. 7 example and equal to ERFA `cal2jd` plus the day fraction for every day 1900-2100. |
| T1.2 | Greenwich mean sidereal time: within **1 s of time** of ERFA `gmst06` over 1900-2100 (same UT1 and TT in), and within 0.01 s of Meeus Example 12.a and 12.b. The Prompt's own requirement is 1 s. |
| T1.3 | Apparent sidereal time (with nutation in longitude and the equation of the equinoxes): within **1 s** of ERFA `gst06a` over 1900-2100, and within 0.01 s of Meeus Example 12.a (13h10m46.1351s). |
| T1.4 | Delta-T (TT minus UT1) model: within **1.0 s** of the IERS value (UT1-UTC from the IERS-B series bundled in astropy-iers-data, TT-UTC from the leap-second table) for every 6 months 1972-2023; the extrapolation beyond the last measured year is stated as a range, not claimed as accuracy. The approximation (UTC taken as UT1 for civil time, UT1 error up to 0.9 s) is stated in the module header. |
| T1.5 | Precession: the rigorous IAU 1976 rotation (zeta, z, theta) within **2 arcseconds** of ERFA `pmat06` precession-only over 1900-2100 for 2,000 random directions; the first-order form (m and n rates) within **1 arcminute** for |T| <= 50 years of J2000. Both reported. |
| T1.6 | UTC to TT to TDB: TT-TDB (the periodic term) within **0.2 ms** of ERFA `dtdb` (Earth geocenter), which is the approximation the teaching kernel states; TDB is never used where TT is accurate enough, and the module says so. |

Piece verdict: A if all met; B (named slice) if only T1.5's first-order form or
T1.4's range fails; C otherwise.

## T2 Coordinates

| Id | Threshold |
|---|---|
| T2.1 | Equatorial to horizontal (hour angle, declination, latitude): within 0.001 degree of Meeus Example 13.b (Venus at Washington: A = 68.0337, h = +15.1249) and within 1e-6 degree of ERFA `hd2ae` for 2,000 random cases. |
| T2.2 | Ecliptic <-> equatorial and J2000 <-> of-date: within 1 arcsecond of ERFA (`eqec06`, `pmat06`) over 1900-2100. |
| T2.3 | Refraction (true to apparent altitude, standard atmosphere 1010 hPa, 10 C; inverse included): the whole chain J2000 RA/Dec + UTC + site to apparent Alt/Az within **1 arcminute** of ERFA `atco13` (same atmosphere, wavelength 0.55 um, UT1 = UTC, no polar motion) for apparent altitude >= 5 degrees, and within **4 arcminutes** from 0 to 5 degrees (weather-dependent; stated), 1962-2100 (the range ERFA's UTC runs). The chain includes aberration only if the arcminute budget needs it; which terms were included is stated. |
| T2.4 | Refraction inverse: apparent -> true -> apparent round trip within 0.1 arcminute for altitude >= 0 degrees. |
| T2.5 | Airmass: the existing Kasten and Young fit agrees with the published Kasten and Young (1989) horizon value 37.92 and with the table value X(30 deg) = 2.000 within 0.005 (the Prompt's visibility use). |

Piece verdict: A if all met; B if T2.3's 0-5 degree band is the only miss; C
otherwise.

## T3 Renderer (horizon and equatorial 2-D view, SVG/canvas, no WebGL)

| Id | Threshold |
|---|---|
| T3.1 | **Consistency:** every drawn star, planet, Sun and Moon carries the same numbers as its row in the list below (altitude and azimuth to 0.01 degree), computed once from one function and asserted on the DOM, for 500 random instants. |
| T3.2 | **Accessible alternative:** a semantic table (real `<table>`, `<th scope>`, caption) of everything above the horizon, sortable by name, altitude, azimuth and magnitude with the keyboard (buttons in header cells, `aria-sort`), same numbers as the drawing, in the DOM order a screen reader reads; the drawing is `role="img"` with a name and a summary sentence, and is not the only source of any fact. axe-core reports **0 violations** on the prototype page at 1440 and 360 px (WCAG 2.2 AA tags). |
| T3.3 | **Low-end cost:** one full redraw of the horizon view with the 1,000 brightest stars, the Sun, Moon and planets, in Chromium with CPU throttled 4x (the project's low-end proxy, OFFLINE_AND_LOW_END.md): median **<= 16 ms** (computation plus DOM update) over 100 redraws, and a time-lapse of 60 steps at most 1 redraw per frame. |
| T3.4 | **Phone:** at 360 x 780 CSS px: no horizontal page scroll, every interactive control >= 24 x 24 CSS px (WCAG 2.2 target size, minimum), the drawing fits the width, labels >= 11 px. |
| T3.5 | **No WebGL, no canvas-only facts, no new vendor library:** the renderer is hand-written SVG/DOM. |

Piece verdict: A if all met; B if only T3.3 fails for the full catalogue but
passes with 300 stars (that slice named); C if T3.1 or T3.2 fails.

## T4 Star catalogue

| Id | Threshold |
|---|---|
| T4.1 | **Rights:** the licence or terms of use of the source catalogue and of any name list are confirmed from the authoritative source (CDS/VizieR terms and the catalogue's own ReadMe; ESA for Hipparcos; IAU for names), and redistribution of a derived subset with attribution is permitted, or the piece is C for that source. If it cannot be confirmed, the gate records exactly that and the verdict is C. |
| T4.2 | **Content:** every star with V <= 4.5 (about 900), each with J2000 RA/Dec, proper motion, V magnitude, B-V (for colour), a Bayer/Flamsteed or Hipparcos/HR identifier, and a traditional name where one is in general use. |
| T4.3 | **Size:** the shipped data file <= **30 KB gzipped** as served (it is data fetched lazily, like the Library index; it is not route JavaScript). |
| T4.4 | **Accuracy of the subset:** stored positions reproduce the source's J2000 positions within 10 arcseconds, and positions at any epoch 1900-2100 (with proper motion) within **1 arcminute** of the source's own propagation (ERFA `pmsafe`) for every star. |
| T4.5 | **Provenance:** retrieval date, query, row count and SHA-256 recorded; every field's unit and epoch stated. |

Piece verdict: A if all met; B if rights are confirmed and only T4.3 or the V
limit must shrink (the smaller subset named); C if T4.1 is unconfirmed.

## T5 Sun and Moon

| Id | Threshold |
|---|---|
| T5.1 | Sun apparent geocentric RA/Dec: within **0.01 degree** of the reference (ERFA `epv00` Earth barycentric/heliocentric position, with aberration and nutation to the same level) over 1900-2100, 2,000 random instants. Meeus Example 25.a (1992 Oct 13: RA 198.38083, Dec -7.78507) within 0.01 degree. |
| T5.2 | Equinoxes and solstices: the instants of the Sun's apparent longitude 0, 90, 180, 270 degrees for 2024 within **15 minutes** of the USNO published times (2024-03-20 03:06, 06-20 20:51, 09-22 12:44, 12-21 09:21 UTC, minute precision). 15 minutes is what 0.01 degree is. |
| T5.3 | Moon geocentric ecliptic longitude within **0.02 degree**, latitude within 0.02 degree, over 1900-2100 against ERFA `moon98`; Meeus Example 47.a (1992 Apr 12 0h TD: lambda 133.162655, beta -3.229126, distance 368409.7 km) within 0.01 degree and 10 km. |
| T5.4 | Lunar phase angle (Sun-Moon elongation based) within **0.5 degree** of the ERFA-based reference over 1900-2100; illuminated fraction within 0.01. |
| T5.5 | New and full Moon instants (elongation 0 and 180 degrees) within **5 minutes** of the reference for every syzygy 2000-2050, and Meeus Example 49.a (new Moon 1977 Feb 18, JDE 2443192.65118) within 5 minutes. |
| T5.6 | Topocentric Moon (parallax, observer on the surface) Alt/Az within **0.1 degree** of ERFA-based astropy `AltAz` for a Moon above the horizon, 2,000 random instants and sites, no refraction. |

Piece verdict: A if all met; B if the Moon misses only T5.6 (geocentric lessons
only) or T5.5; C otherwise. Sun and Moon may be reported separately; the piece
takes the lower of the two.

## T6 Planets

| Id | Threshold |
|---|---|
| T6.1 | **Low-precision series** (JPL "Keplerian Elements for Approximate Positions of the Major Planets", Standish; Table 1, valid 1800-2050): geocentric RA/Dec of Mercury, Venus, Mars, Jupiter and Saturn within **0.2 degree** (12 arcminutes) of ERFA `plan94` (Simon et al. 1994) with the Earth from `epv00`, over 1900-2050, sampled every 10 days. Reported also for Uranus and Neptune; they are not required. |
| T6.2 | The same series for Venus, Mars and Jupiter within **0.1 degree** of the DE441 ephemeris pack in this repository (`ephemeris-packs/solar-system-2025-2045.json`, Prompt 39), 2025-2045, sampled every 5 days; the pack has no Mercury or Saturn. |
| T6.3 | **From the pack** (Chebyshev reader `js/mission/ephemeris.js`): the geocentric direction within 0.01 degree of the pack's own source (self-consistency with the pack at its nodes), in 2025-2045 only. Its bytes (the module is base64 data) are measured and reported; it is not required to be the delivered form. |
| T6.4 | **Published almanac:** geocentric positions of Venus (Meeus Example 33.a, 1992 Dec 20 0h TD: RA 21h04m41.454s, Dec -18 53 16.84) within the T6.1 tolerance. |
| T6.5 | Bytes of the series theory (JS, minified and gzipped) <= **2 KB**; the pack form (T6.3) is compared and need not meet it. |

Piece verdict: A if T6.1 (the five naked-eye planets), T6.2 and T6.4 are met;
B if a body misses T6.1 or T6.2 (that body is then named as excluded or
labelled with its tolerance); C if three or more of the five miss.

## T7 Whole-page budgets

| Id | Threshold |
|---|---|
| T7.1 | **Route bytes** for a Sky Lab page, the prototype's JavaScript as the route budget measures it: <= **100 KB** from the sources in <= **12 requests**, and <= **40 KB** from a build in <= **3 requests** (the same order as /lab3d/ and /my-work/; no existing ceiling is raised). The star data is fetched lazily and is excluded here but held by T4.3. |
| T7.2 | No production import: nothing in `js/` imports the spike; nothing is added to `build.js`, `sw-manifest.js` or a route budget. |
| T7.3 | English and Spanish: every user-visible string of the prototype goes through a catalogue; the gate lists the strings (it does not translate them). |

## Not thresholds, but evaluated and reported

- How Twelve Nights and Design the Schedule would gain from a sky view: what
  `js/observingWindow.js` already gives them (airmass, twilight, Moon
  separation) and what the view adds; measured as lines and bytes, not accuracy.
- What a seasons or eclipse-geometry lesson needs from the 3-D lab (Prompts
  35-37) versus from the Sky Lab alone.
- Rejected alternatives to be judged on measured bytes, licence and provenance:
  Stellarium Web Engine and Aladin Lite.

## Verdict rules (fixed now)

A = every threshold of the piece met, within measured bounds. B = the named
staged slice only, with its own acceptance criteria; a B never authorizes the A
scope. C = the dependent prompt does not use that piece; the number is
recorded. The gate's overall verdict for Prompts 88-89 is the worst piece among
those a foundation cannot ship without: time kernel, coordinates, renderer and
catalogue. Sun/Moon and planets may be B or C and the foundation ships without
the failing body. A threshold is not relaxed after measuring.
