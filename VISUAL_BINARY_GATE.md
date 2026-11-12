# The visual-binary branch: the gate (Prompt 218, Part B)

Documentation only. The prototype is the production code of the build the verdict allows, on `feat/visual-binary`
(there is no separate spike: the kernel `js/measure/visualBinary.js` and the validator `tools/visual-binary-validate.mjs`
are what the branch ships under verdict A). The thresholds, the contract, the systems, the seeds and the verdict rule were
committed before any code (`tests/fixtures/visual-binary/thresholds.json`, commit e7d6b69a), the oracle script
(`tools/visual-binary-oracle/oracle.py`, numpy 2.2.6, scipy 1.15.3, Python 3.10.12, no Gravitas code) was committed
with three amendments recorded before the legs they touch ran (AM1 wording of the semi-major axis, AM2 the operationalisation of D8, AM3 the contract of E1),
and the oracle's results were pinned (commit ca251c21) before the kernel was run.

## What was committed

- **The photocentre contract.** With both stars shining, the photocentre in one band is the light-weighted centroid. With `B = M2/(M1 + M2)`
  and `l = L2/(L1 + L2)` the photocentre is `(l - B)` times the relative vector from the barycentre: the relative ellipse scaled by `l - B`
  (turned half a turn when `l` exceeds `B`), semi-major axis `|B - l| a`. Consequences: with a parallax the orbit gives the photocentre mass
  function `(M1 + M2)|B - l|^3`, not a mass (a dark companion gives the astrometric mass function); a companion's mass needs a stated light
  fraction and a stated primary mass, and has a second root when `f < M1 l^3` that the orbit cannot exclude.
- **The distance requirement.** A parallax with its uncertainty and a frame statement (relative: the sum reads high by `(absolute/relative)^3`;
  absolute: with the source of its correction; a literature value is a parallax with a citation); refused without them and below a signal-to-noise
  of 3 (the rule of Prompt 187, unchanged).
- **The resolved branch.** The mass fraction from each component's own offsets about the moving barycentre (a constant offset and a proper
  motion fitted with it); the mass sum through Prompt 187's fitter and `massSum`.
- **The tolerance.** Coverage of the 0.6827 interval within 0.60 to 0.76 and of the 0.95 interval within 0.90 to 0.99 on 200 seeded resolved
  systems (parallax signal-to-noise 10) for the sum, `B`, `M1` and `M2`, and on 150 photocentre systems for the companion mass; a median bias
  within three standard errors; oracle agreement within 0.1 sigma (sum), 0.05 sigma (`B`) and 5 percent (its sigma); photocentre positions
  within 1e-7 arcseconds of a two-body integration.
- **The verdict rule.** A: every leg of the groups A, B, C1 to C3 and D1 to D7 passes (the mass sum and, from the series of each component, the
  mass fraction and the two masses), with the photocentre companion mass a further slice that C4 and D8 must also pass; B: the mass-sum legs pass
  and the fraction legs do not (the mass sum only); C: a mass-sum leg fails (the visual branch is a reading step). Evaluated mechanically by the
  validator: A if every required leg passes, else B if the mass-sum legs pass, else C.

## Result (Node 22.23.4 and Node 24.4.0, `npm run visual-binary:validate`)

| Leg | What | Result |
| --- | --- | --- |
| A1 to A4 | closed Kepler case, photocentre identities, mass-function round trip with both roots, relative-parallax factor | **pass** (to 4e-15) |
| B1 | photocentre of three systems against a direct two-body integration (DOP853, rtol 1e-12) | **pass** (1.4e-12 arcsec; bound 1e-7) |
| B2, B3 | the oracle's Thiele-Innes least squares and its regression for `B`; the oracle recovers its own truth | **pass** (2e-8 sigma, 4e-9 sigma, sigma ratio 1e-10; oracle within 2.5 sigma) |
| C1 | mass-sum coverage, 200 systems | **pass** (0.665 and 0.945) |
| C2 | `B` coverage | **pass** (0.625 and 0.945) |
| C3 | `M1` and `M2` coverage | **pass** (0.655 and 0.675 at 0.6827; 0.945 and 0.945 at 0.95) |
| C4 | companion mass from a photocentre, 150 systems (149 returned) | **pass** (0.644 and 0.960) |
| C5 | median bias of the sum | **pass** (0.031 against 0.080) |
| D1 to D9 | no parallax, no frame, weak parallax, short arc, one component, swapped labels, no light fraction or no signal, both roots, relative parallax | **pass** (all 1.0; the relative-parallax factor within 4 percent of 1.204) |
| D10 | the photocentre read as the sum | **pass** (median 0.015 of the truth; the demonstration of the factor) |
| E1 | alpha Cen AB, Akeson et al. 2021 Table 8 (AM3): the sum from a, P and the parallax against the published masses | **pass, circular**: 1.98805 against 1.9880 (0.01 published sigma); the K16 column 2.0431 against 2.0428; an arithmetic and units check, since the paper's parallax is its own orbital parallax |
| P1 | one resolved fit with masses | recorded: 0.09 CPU seconds |

No leg failed, so `failed-legs.json` lists none. The coverage of `B` is at 0.625, near the low edge of its band, because the regression takes the
fitted relative orbit as exact; the band was committed first and is met.

## Verdict: A

The mass sum and, from the series of each component, the mass fraction and the two masses; and the photocentre companion mass (with both
roots), under these stated limits: every leg is on synthetic data with the gate's three systems and a stated parallax; the oracle is independent
for the photocentre and the least squares but not for the regression's model; common-mode frame errors, a third body and radial-velocity coupling
are not modelled; the photocentre route needs a barycentre-referenced series or published elements; **no independent authentic leg was run** (E1 is circular, amendment AM3 fixed it before it ran, the numbers are read by hand from Table 8, credited, the paper not stored). What an independent one
needs: a published table of the orbital elements of a visual pair (or an astrometric photocentre orbit) with a parallax and masses published
independently, fetched by Carl with its terms read and recorded (data-rights decision per source), for example the Gaia DR3 two-body-orbit table
(`gaiadr3.nss_two_body_orbit` in the ESA Gaia archive, whose columns include `period`, `eccentricity`, `a_thiele_innes`, `b_thiele_innes`,
`f_thiele_innes`, `g_thiele_innes` and `parallax`, verified against the archive's table metadata on 2026-11-03) for a source with an independent
published mass function, or the orbital elements and masses of a nearby resolved pair from a published paper (for instance the ALMA astrometry of
alpha Centauri AB, Akeson et al. 2021, arXiv:2104.10086, title and authors verified on the arXiv API on 2026-11-03; the table of elements in that
paper was not read, and its licence has to be read before any number is used). Numbers only, as for V505 Persei in Part A. The build under this
verdict is on `feat/visual-binary`: the panel `masses-visual` and three advanced steps in Weighing the Stars, for Real.

<!-- Listed in DOCUMENTS.md. -->
