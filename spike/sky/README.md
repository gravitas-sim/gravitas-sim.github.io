# Sky, time and coordinates gate: the spike

**Prototype for Prompt 87. Not production code.** Nothing in `js/` imports it; it
is not in `build.js`, `sw-manifest.js` or any route budget. The decision is
`SKY_LAB_GATE.md` on the PR branch `gate/sky-time-coords`; this branch
(`spike/sky-time-coords`) is the evidence and stays unmerged.

Order of commits (git history is the evidence that the thresholds came first):

1. `THRESHOLDS.md`, before any prototype code existed.
2. Two errata to it, before any candidate was run against a reference.
3. The prototype, the reference generator and the published fixtures.
4. Measurements, the browser check and the results.

## Files

| File | What it is |
|---|---|
| `THRESHOLDS.md` | The acceptance thresholds and verdict rules, fixed first. |
| `lib/time.js` | Delta-T (IERS table 1972-2025 plus polynomial), nutation (20 terms), apparent sidereal time, precession (rigorous and first order), TDB-TT. |
| `lib/coords.js` | Equatorial to horizontal, refraction (Saemundsson and Bennett), the full J2000-to-observed chain, a per-instant frame. |
| `lib/fastframe.js` | The renderer's one-matrix-per-instant frame. |
| `lib/solar.js` | Apparent Sun, apparent and topocentric Moon, equinox and syzygy solvers, phase. |
| `lib/planets.js` | Standish's Table 1 elements and Kepler's equation. |
| `lib/stars.js`, `lib/sky.js` | Catalogue stars to an epoch; the one function the drawing and the table both read. |
| `render.js`, `index.html` | The SVG horizon view, equatorial map and the accessible table. English and Spanish strings. |
| `gen_refs.py` | Seeded (87) reference values from PyERFA 2.0.1.5 (writes `fixtures/refs.json`, not committed; about 5 MB). |
| `fixtures/published.json` | Meeus and USNO values pinned, each with its source. |
| `measure.mjs` | Runs every candidate against the fixtures and ERFA; writes `results.json`. |
| `browser-check.mjs` | Chromium: consistency, axe, 4x CPU throttle, 360 px phone; writes `results-browser.json`. |
| `bytes.mjs` | Route bytes the way `tools/route-budget.mjs` counts them. |
| `tools/` | The star-subset builder and its ERFA proper-motion check. The star data is **not** committed (rights, see the gate document); `fetch-catalogue.sh` downloads it. |

## Rerun

```sh
cd spike/sky
python3 gen_refs.py                      # needs pyerfa and astropy-iers-data
node measure.mjs                         # needs only node; 80 checks
sh tools/fetch-catalogue.sh /tmp/bsc     # downloads CDS V/50 (about 0.7 MB)
node tools/build-catalogue.mjs /tmp/bsc /tmp/bsc/stars-v50.json 5.0
node tools/build-catalogue.mjs /tmp/bsc /tmp/bsc/stars-v45.json 4.5
python3 tools/pmsafe_ref.py /tmp/bsc /tmp/bsc/pmsafe.json
node tools/check-catalogue.mjs /tmp/bsc/stars-v45.json /tmp/bsc/pmsafe.json
node browser-check.mjs /tmp/bsc/stars-v50.json 43187   # private port; Chromium
node bytes.mjs
```
