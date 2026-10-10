# The Sky Lab

Roadmap II, Prompt 88. The foundation the Sky Lab gate (`SKY_LAB_GATE.md`, Prompt
87) accepted: a pure sky kernel, a bright-star data pack, the `/sky/` page with
a horizon view, an equatorial map, a table of what is up, and five instruments
whose readings are evidence envelopes. Prompt 89 (curriculum) docks the
instruments in lessons; nothing here changes a lesson.

## What is in it

| Piece | Where | Notes |
|---|---|---|
| Time | `js/kernels/sky/time.js` | delta-T (IERS table 1972-2025, polynomial before, 0.1 s a year after), 20-term nutation, apparent sidereal time, rigorous and first-order precession, TDB - TT |
| Coordinates | `coords.js` | horizontal and equatorial, Saemundsson and Bennett refraction, the accurate per-star chain, the matrix frame the drawing uses, `refractionSpreadArcmin` |
| Sun, Moon | `solar.js`, `moon.js` | Meeus ch. 25 Sun with nutation and aberration; Meeus ch. 47 Moon with nutation and ch. 40 parallax; syzygy and season solvers; phase |
| Planets | `planets.js` | Standish Table 1 elements, Mercury to Saturn drawn; phase and elongation |
| Stars | `stars.js`, `packs.js` | unpack, linear proper motion, colour from the colour temperature |
| The sky at an instant | `sky.js` | one function the drawing and the table both read |
| Events | `events.js` | rise, transit, set, twilights, next new and full Moon, by sampling and bisection on the kernel's own positions |
| Readings | `readings.js` | the five instruments' numbers |
| Data | `data-packs/sky-bright-stars.json`, `js/data/sky/brightStars.js`, `sky/bright-stars.json`, `js/data/sky/constellations.js` | the pack, its sidecar and the figures |
| Page | `sky/index.html`, `js/skyPage.js`, `js/sky/` | the route, drawings, instruments (lazy), evidence writer (lazy) |
| Validation | `tests/skyKernel.test.js`, `tests/skyData.test.js`, `tests/fixtures/sky/`, `tools/sky/` | ERFA references pinned, ERFA not needed to run them |

## The stated approximations

- UTC is used as UT1 (under 0.9 s, 0.004 degree of rotation). Delta-T after 2025
  is an extrapolation with a range of about 0.5 s a year; it is not validated
  before 1972 (`deltaTRangeSec` returns `null`).
- Valid 1900-2100; planets are drawn 1800-2050 only.
- Positions of stars apply proper motion linearly and neglect radial velocity
  and parallax (0.016 arcminute over 1900-2100).
- Refraction is a standard atmosphere (1010 hPa, 10 C). **Below 5 degrees of
  apparent altitude the kernel makes no accuracy claim.** The gate's T2.3 limit
  there (4 arcminutes against ERFA) was missed at 19.1: ERFA's model saturates at
  11 arcminutes, the fits give 20-35. No published refraction table could be
  validated against in this prompt, so the readings carry a weather spread
  (`refractionSpreadArcmin`, 5 arcminutes at the horizon) and an envelope warning;
  the criterion against published tables the gate asked for is **not built** and is
  the open item for the horizon band. The horizon value used for rising and
  setting is the published convention, 34 arcminutes.
- The drawing's matrix frame leaves out annual aberration (0.35 arcminute at
  most); the accurate chain includes it.
- Airmass is the Kasten and Young fit for apparent altitude.

## Accuracy

Reference: PyERFA 2.0.1.5 (IAU SOFA), seeded sample (seed 87, 2,000 cases per
test in the gate; `tests/fixtures/sky/erfa.json` keeps every fifth to tenth
case and every case near the horizon). The first column is the gate's
full-sample figure, the second what `tests/skyKernel.test.js` measures on the
thinned fixture, the third the gate's limit.

| Quantity | Gate (full) | Pinned fixture | Limit |
|---|---|---|---|
| Julian date | exact | exact | 1e-9 d |
| Mean, apparent sidereal time | 0.019 s, 0.020 s | 0.019 s, 0.020 s | 1 s |
| Delta-T, 1972-2023 | 0.069 s | 0.069 s | 1.0 s |
| Precession, rigorous | 0.30" | 0.30" | 2" |
| TDB - TT | 0.040 ms | 0.036 ms | 0.2 ms |
| Whole chain, apparent altitude 5 degrees and up | 0.43' | 0.43' | 1' |
| Whole chain, 0-5 degrees | **19.1'** | 19.1' | 4' (**missed**) |
| Sun, apparent | 0.0096 degree | 0.0084 degree | 0.01 |
| Moon longitude, topocentric position | 0.0002 deg, 0.0022 deg | the same | 0.02, 0.1 |
| New and full Moon, 2000-2050 | 1.1, 0.6 min | 0.9, 1.0 min | 5 min |
| Planets vs plan94 (Mercury, Venus, Mars, Jupiter, Saturn) | 0.014, 0.023, 0.051, 0.175, **0.2043** deg | 0.011, 0.017, 0.037, 0.175, 0.200 deg | 0.2 (Saturn missed by 0.0043 in the full sample) |
| Stars vs pmsafe, 1900-2100 | 0.016' | 0.011' | 1' |
| Venus at Boston, Meeus 15.a (rise, transit, set) | | +0.4, -0.5, -0.3 min | 2 min |

The Sun of `js/observingWindow.js` misses 0.016 degree and is **not** replaced
under the lessons: the kernel has its own, and the lessons' expected values and
bytes do not move (Prompt 88, item 5, below).

## The star pack

`sky-bright-stars`: the Yale Bright Star Catalogue, 5th revised edition
(Hoffleit and Warren, CDS V/50), 904 stars to V 4.5, J2000 position, V, B-V,
proper motion, spectral type, designation, and the traditional name where the
catalogue's remark gives one in capitals (65; the catalogue's spellings, not the
IAU's). Raw files pinned gzipped as CDS serves them
(`tools/data-packs/sky/pins.json`). License status `no-license-stated`, credited,
with citation: the basis Carl instructed on 2026-10-09 (D-SKY-02). Hipparcos and
Tycho are not used (CC BY-NC 3.0 IGO).

The rows are a **sidecar**, `sky/bright-stars.json` (62 KB, 27.7 KB gzipped, inside
the gate's 30 KB), fetched by the page, because the route budget counts
JavaScript and a star table is data (as `library/library.json` is).
`tools/build-data-packs.mjs` learned the sidecar in this prompt: the manifest
records its size and checksum, `packs:check` verifies it, `packs:provenance`
rebuilds it. One column is derived: the blackbody **colour temperature** whose B-V
through the radiation kernel's Bessell-Murphy bands equals the star's. It is a
colour temperature, not an effective temperature (Sirius, B-V 0, comes out at
13,000 K, not 9,900 K).

Five stars are held to published Hipparcos positions within 1 arcsecond (the
largest offset is 0.6").

## Constellation figures

`js/data/sky/constellations.js`: 23 figures written for Gravitas (CC BY 4.0), pairs
of catalogue stars by Bayer designation. They mark patterns and are not copied
from any chart. `tests/skyData.test.js` holds every star to the pack and every line
to a sane length.

## The page

`/sky/`: place (seven named sites, a typed latitude and longitude, or "Use my
location", which asks the browser once and keeps the answer nowhere), UTC date
and time, steps and Play (off under `prefers-reduced-motion`), the two drawings
with layer controls, the table, and the instruments in a `<details>`. The drawing
writes one transform per object per frame; the table and map are redrawn when the
sky settles (250 ms after the last change during Play). Every object the drawing
shows is in the table with the same numbers; the SVG has an accessible summary.

**Evidence.** Each instrument's "Save this reading" writes a
`gravitas.artifact/1` envelope (inputs as `assumed`, results as `derived`, an
interval where the kernel has a measured bound, warnings in plain words). The
views export too: each drawing as a standalone SVG, the table as CSV (through the
shared formula-guarding writer).

**Bytes.** 89.4 KB in 12 requests from the sources, 37.9 KB in 3 from a build
(the gate's ceilings 100 KB, 40 KB). No existing ceiling moved: the deferred
total, the lesson routes and every other route are unchanged. The kernel
carries its own copy of the Moon series (`moon.js`) so the 45 KB
`js/observingWindow.js` is not on the page's path; a test holds the copy equal to
the original.

## Twelve Nights and Design the Schedule (item 5)

Not changed. Twelve Nights already reasons with airmass limits, twilight and the
Moon through `js/observingWindow.js`; switching it to the kernel would move its
expected values by seconds (the Sun differs by 0.016 degree) and add bytes to a
lesson route, which the prompt allows only with a documented correction, and none
is needed. Design the Schedule does not use that module, so giving it airmass and
twilight is the bridge the gate named a separate slice. Both are for Prompt 89.

## Not built, and why

- The refraction criterion against published tables below 5 degrees (above).
- Docking the five instruments in lessons (Prompt 89); the evidence ledger
  (notebook) is not written to, readings are files.
- A Spanish review of the page's strings by a Spanish reader.

## Reproduce

```sh
python3 tools/sky/gen_refs.py          # tests/fixtures/sky/erfa.json (needs pyerfa)
python3 tools/sky/gen_pm.py            # tests/fixtures/sky/pmsafe.json (needs the cached catalog)
node tools/data-packs/sky/pin.mjs      # only when the pins must be redone
node tools/build-data-packs.mjs        # the pack, its sidecar and its manifest
npm test -- tests/skyKernel.test.js tests/skyData.test.js
```
