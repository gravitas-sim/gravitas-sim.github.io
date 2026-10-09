# Sky Lab gate: sky, time and coordinates

Roadmap II, Prompt 87. Should Gravitas teach the sky with a Sky Lab: an
astronomical time and coordinate kernel, a horizon and celestial-sphere view, a
small star catalogue and planetary positions?

The thresholds were committed before any prototype existed
(`spike/sky/THRESHOLDS.md`, 2b01d350, 2026-10-09 14:03; two errata df16fe84,
written before any candidate ran). The prototype and every measurement are on
the unmerged branch `spike/sky-time-coords` (c8a9532c). This PR is
documentation only. It changes no production code, no route budget and no
ceiling.

## Verdicts

| Piece | Verdict | Why, in one line | Supplies it |
|---|---|---|---|
| Time kernel | **A** | Julian date, sidereal time, nutation, precession, delta-T, TDB-TT all inside their thresholds | `js/observingWindow.js` plus ~4 KB new |
| Coordinates | **B** | Everything passes except refraction below 5 degrees, 19.1' against ERFA (limit 4') | spike `coords.js` |
| Renderer | **B** | 1,000 stars pass only on a quiet machine (13.5 ms) and miss on a busy one (14.1-17.5 ms, limit 16); 518 stars pass (7.4 ms) | spike `render.js` |
| Catalogue | **C** | Accuracy and size pass, but redistribution cannot be confirmed (rights, below) | none |
| Sun and Moon | **B** | The shipped Sun misses (0.0162 degree, limit 0.01); the replacement passes at 0.00955; Moon A | `js/observingWindow.js` Moon, spike Sun |
| Planets | **B** | Mercury to Jupiter pass; Saturn misses by 0.0043 degree (0.2043 against 0.2) | spike `planets.js` |

**Overall for Prompts 88-89: C as the rules are written** (the worst of time,
coordinates, renderer and catalogue). The only blocker is the catalogue's rights,
which is Carl's decision, not a technical one. If Carl accepts the Yale Bright
Star Catalogue on the data-pack "no licence stated, credited, retrievable"
basis (the Horizons precedent, DATA_PACKS.md), the foundation is B on the slices
below. Nothing in 88-89 should start before that decision.

## Measurements

Reference: PyERFA 2.0.1.5 (IAU SOFA), seeded sample (seed 87), 2,000 cases per
test; published values from Meeus, *Astronomical Algorithms* 2nd ed., and USNO.
`measure.mjs`: 49 pass, 2 fail, 32 reported. `browser-check.mjs`: 14 of 14 on
the final runs.

| Id | Test | Measured | Limit |
|---|---|---|---|
| T1.1 | Julian date vs Meeus ch. 7 and ERFA 1900-2100 | exact | 1e-9 d |
| T1.2 | mean sidereal time vs ERFA `gmst06`; Meeus 12.a and 12.b | 0.019 s; 0.00002 s | 1 s; 0.01 s |
| T1.3 | apparent sidereal time vs `gst06a`; Meeus 12.a | 0.020 s; 0.0001 s | 1 s; 0.01 s |
| T1.4 | delta-T, table of IERS values, half-years 1972-2023 | 0.069 s | 1.0 s |
| T1.4 | the same with the polynomial alone | **4.7 s** (2.5 s at 2020) | reported |
| T1.5 | rigorous precession vs `pmat06`; first order within 50 years | 0.30"; 0.33' | 2"; 1' |
| T1.6 | TDB-TT, two terms vs `dtdb` | 0.040 ms | 0.2 ms |
| T2.1 | altitude/azimuth vs Meeus 13.b and `hd2ae` | 0.00003 deg; 3e-13 deg | 0.001; 1e-6 |
| T2.2 | J2000 to ecliptic of date vs `eqec06` | 0.30" | 2" |
| T2.3 | whole chain vs `atco13`, apparent altitude 5 degrees and up | 0.43' (0.67' for the renderer's matrix frame, no aberration) | 1' |
| T2.3 | the same, 0 to 5 degrees | **19.1'** | 4' |
| T2.4, T2.5 | refraction round trip; airmass 37.92, 1.995, 2.904 | 0.062'; within 0.0009 | 0.1'; 0.005, 0.01 |
| T5.1 | apparent Sun vs ERFA 1900-2100, replacement series | 0.00955 deg | 0.01 |
| T5.1 | the shipped `solarPosition` as is | **0.0162 deg** (0.0136 with nutation) | 0.01 |
| T5.2 | equinoxes and solstices 2024 vs USNO | 7.8 min | 15 min |
| T5.3 | Moon longitude, latitude vs `moon98`; Meeus 47.a | 0.0002, 0.0026 deg; 7 km | 0.02; 10 km |
| T5.4 | phase angle; illuminated fraction | 0.010 deg; 0.0001 | 0.5; 0.01 |
| T5.5 | 1,237 new and full Moons 2000-2050; Meeus 49.a | 1.1 min; 0.6 min | 5 min |
| T5.6 | topocentric Moon alt/az vs ERFA-based | 0.0022 deg | 0.1 |
| T6.1 | Standish series vs `plan94`, 1900-2050: Mercury, Venus, Mars, Jupiter, **Saturn** | 0.014, 0.023, 0.051, 0.175, **0.2043** deg | 0.2 |
| T6.2 | the series vs the DE441 pack, 2025-2045 (Venus, Mars, Jupiter) | 0.025, 0.040, 0.070 deg | 0.1 |
| T6.3, T6.4 | pack reader vs its raw rows; Venus vs Meeus 33.a | 4e-6 deg; 0.004 deg | 0.01; 0.2 |
| T4.2-T4.5 | 904 stars to V 4.5: gzipped; stored vs source; epoch 1900-2100 vs `pmsafe` | 20.5 KB; 0.24"; 0.016' | 30 KB; 10"; 1' |
| T3.1, T3.2, T3.4 | drawing equals table (253,426 objects); axe at 1440 and 360 px; phone | 0 mismatches, 0.0079 deg; 0 violations; no scroll, controls >= 24 px, labels 12 px | 0.01 deg; 0; |
| T3.3 | redraw, 1,000 stars + Sun, Moon, 5 planets, 4x CPU throttle, median | 13.5 ms quiet; 14.1, 16.1, 17.4, 17.5 ms on a busy machine; 29.9 ms at a load spike | 16 ms |
| T3.3 | the same with 518 stars; with 300 | 7.4 ms; 5.4-6.1 ms | 16 ms |
| T7.1 | route bytes of the prototype | 87.2 KB in 9 requests from the sources; 21.8 KB (9.9 KB gzipped) in 1 from a build | 100 KB, 12; 40 KB, 3 |

### What did not go as the thresholds hoped

- **Refraction at the horizon (T2.3, 0-5 degrees) fails by the number.** The
  cause is the reference: ERFA's refraction model saturates at about 11' below
  3 degrees, while the Bennett and Saemundsson fits (Meeus ch. 16) give 20-29'
  at 1 degree and 0 degrees, which is what a standard atmosphere does. Above 4
  degrees they agree within 1'. The threshold stays failed. The slice below
  validates the near-horizon band against published refraction tables instead,
  with its own criterion.
- **The shipped Sun fails T5.1** (0.0162 degree). Its constant (280.4606) is the
  Almanac's, which folds the aberration offset in, so adding aberration or
  nutation does not help (0.0161 with both added, my first attempt, which
  double counted). Meeus ch. 25's three-term series passes at 0.00955, a
  margin of 4.5%.
- **The delta-T polynomial alone fails T1.4** (4.7 s); only the table of
  measured values passes. The table is the IERS series itself, so its January
  nodes are in-sample; the July points (interpolated) are 0.069 s. It needs one
  new number a year.
- **Saturn misses T6.1 by 0.0043 degree** (95th percentile 0.18).
- **Renderer cost is load-sensitive.** The median at 4x throttle was 13.5 ms
  on a quiet machine and 14.1-17.5 ms across five runs under a load of 6 to 11
  on 12 cores; the first version of the page was 18.6 ms before its writes were
  cut to one transform per object. The table (500 rows) and equatorial map cost
  130-140 ms at 4x, so they are redrawn only when the sky settles (250 ms after
  the last change), not per frame during a time-lapse.
- **Harness slips, corrected before the final runs, not by moving a threshold:**
  T3.1c was first judged in drawing units rather than the stated 0.01 degree;
  T3.3f first counted the click's own draw and judged frame interval rather than
  "at most one redraw per frame" (60 redraws in 60 frames, final).

## Rights (T4.1): why the catalogue is C

- **Yale Bright Star Catalogue, 5th rev. ed.** (Hoffleit and Warren, CDS V/50;
  9,110 entries). Its ReadMe, the Harvard page and HEASARC's page state no
  licence and no permission to redistribute. CDS's rules
  (cds.unistra.fr/vizier-org/licences_vizier.html) say VizieR data are free for
  scientific use with the original authors cited, that commercial use depends on
  the origin, and to read the catalogue's own ReadMe for any copyright. So use
  with citation is confirmed; redistribution of a derived subset is not.
- **Hipparcos and Tycho** (ESA): ESA's catalogue page states the CC BY-NC 3.0
  IGO licence and "Credit: ESA". The non-commercial term does not sit with this
  project's CC-BY-4.0 content, so it is out as a shipped file.
- **Traditional names** come from the BSC's own remarks (65 of 904 stars); the
  IAU WGSN list carries only a request to cite. Both are unconfirmed.
- Gaia (CC BY-SA, ESA) is open but saturates and loses astrometric quality at
  the bright end; not pursued.

The star file is therefore **not committed** to the spike either; the builder and
its checksums are (BSC `catalog` sha256 69797549...afd, `notes` 4614517e...a0c,
retrieved 2026-10-09). Carl's options: (1) accept the BSC under the data-pack
"no-license-stated" basis with citation (the Horizons precedent), which makes
the catalogue A at 904 stars, 20.5 KB gzipped; (2) ask Yale/NASA ADC in
writing; (3) hand-author about 25 named stars' positions (still facts from the
same source, so no cleaner).

## Rejected alternatives

- **Aladin Lite v3** (CDS): LGPL-3.0; `aladin.js` is 1,837,432 bytes (1.8 MB)
  against a 100 KB ceiling; WebGL2 and a WebAssembly engine, and it fetches HiPS
  tiles from CDS servers, which breaks "nothing leaves the browser without an
  opt-in" and offline use. Consistent with D-VO-05 (C, ratified).
- **Stellarium Web Engine**: AGPL-3.0 with a contributor licence agreement; a
  C and WebAssembly engine with remote sky data; the AGPL's network clause
  does not fit a permissively licensed teaching site; no byte measure was
  needed to reject it on licence and provenance.

## What a Sky Lab adds, and what it needs from the 3-D lab

- **Twelve Nights** already computes its schedule with `js/observingWindow.js`
  (airmass, twilight, Moon separation); the Sky Lab view would show the sky at
  each of its epochs from the same kernel, so it gains a picture and no new
  numbers. **Design the Schedule** does not use that module (its schedule lives
  in the radial-velocity panel), so it would need a bridge to gain visibility
  and airmass; that is a slice of its own, not part of 88.
- **Seasons, lunar phases, equation of time:** the Sky Lab alone (Sun's
  declination, altitude, day length; phase angle). **Eclipse conditions** (a
  syzygy within the node's latitude limit) also, with the Moon's latitude from
  the series. The 3-D lab (LAB3D.md) has no spin, axial tilt or tides and its
  eclipse lesson is orbit geometry, so it supplies neither; it would add shadow
  cones only if a later prompt wants them.

## Exact production slices (what 88 may build, once Carl decides the rights)

1. **Time kernel (A):** `js/observingWindow.js` stays; add delta-T (the 54-value
   table plus a stated extrapolation), nutation, apparent sidereal time,
   rigorous precession and TDB-TT as a module of about 4 KB, with the
   fixtures and the ERFA-based tests of `measure.mjs` (reference values pinned,
   ERFA not needed at run time). Table needs a yearly update.
2. **Coordinates (B):** the chain and the Bennett/Saemundsson refraction,
   validated at altitude >= 5 degrees (1'); below 5 degrees show the value with
   its stated spread and add a criterion against published refraction tables
   before claiming any number there.
3. **Renderer (B):** SVG horizon view and equatorial map, one transform write
   per object, 518 stars (V <= 4.0) by default and up to 1,000 on request,
   table redrawn when settled; the accessible table is required, not optional.
   Keep the route at or under 100 KB from the sources and 40 KB from a build.
4. **Catalogue (C until decided):** BSC subset V <= 4.5 (904 stars, 20.5 KB
   gzipped), lazy file, if and only if Carl accepts the rights basis.
5. **Sun and Moon (B):** replace `solarPosition` with the three-term series plus
   nutation and aberration; keep the Moon as it is; the Moon's topocentric
   parallax is new (0.0022 degree).
6. **Planets (B):** the Standish Table 1 series (1.2 KB gzipped), Mercury to
   Jupiter; Saturn shown with its 0.21 degree tolerance stated or left out;
   Uranus and Neptune (0.033, 0.019 degree) optional. The DE441 pack is not
   used: 78.6 KB gzipped, four bodies, 2025-2045 only.

Not authorised: any ceiling raise; the star file in the repository before the
rights decision; a claim that refraction below 5 degrees matches a standard.

## Scientific assumptions

UTC is taken as UT1 (up to 0.9 s, 0.004 degree); delta-T beyond 2025 is
extrapolated at 0.1 s per year and is a range, not an accuracy; aberration is
omitted in the renderer's matrix frame (0.35' at most); proper motion is linear
with radial velocity and parallax neglected (0.016' over 1900-2100); the Sun
and Moon series are called with TT (UT as TT adds 0.011 degree to the Moon).

## Reproduce

`spike/sky/README.md` on the spike branch. Strings of the prototype for
translation: 38 in a catalogue in both locales (not translated by the gate).
