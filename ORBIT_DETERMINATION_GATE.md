# The orbit-determination gate (Prompt 197, part A)

Prompt 197 turns three positions of a moving point of light into an orbit and then predicts where the point will be. This
gate decides how much of that Gravitas may claim. The contract here and in
`tests/fixtures/orbit-determination-gate/thresholds.json` was committed before any orbit was determined and before the
prototype existed. The prototype lives on the never-merged branch `spike/orbit-determination-gate`; Part B (the kernel,
the packs, the validation tiers, the investigations, the model page section) is built afterwards, within the verdict
only, and is not built by this PR.

## What an orbit from three observations rests on

An observation is two numbers, a direction. Three observations are six numbers and an orbit is six numbers (the state at
one epoch), so three observations determine an orbit exactly, with no redundancy to tell the solver it is wrong. That is
Gauss's problem (1809): given three directions from a moving observer at three times, find the heliocentric distance of
the object at the middle time by solving an eighth-degree polynomial, then the velocity from the `f` and `g` series, and
refine until the two-body motion reproduces the three directions.

The difficulty is geometric. The range of an object cannot be told from its angular velocity along the observer's own
path except through the curvature of that path: the Earth turns through 0.017 radian in a day and 1.03 radian in sixty,
and an object seen twice in one night has its range and its sky motion traded against each other almost perfectly. The
determination is then ill-conditioned: a tiny change in a direction moves the orbit by a great deal, and Gauss's
polynomial still returns a root. The contract therefore (1) chooses an arc whose geometry determines the orbit, (2)
states a conditioning threshold before looking, (3) refuses, with a named status and no orbit, on an arc that crosses it,
and (4) judges the prediction at epochs the determination never saw.

Everything else is an assumption. The determination is two-body: the Sun's pull alone, no planetary perturbations, no
non-gravitational force. The real motion of a main-belt asteroid is perturbed, mostly by Jupiter, so an unperturbed
element set predicts its position only to the model's own error, which grows with the time from the epoch. That error is
computed here, by integrating the perturbed motion, and it sets the tolerance; the test never asks an unperturbed element
set to agree with a perturbed ephemeris beyond it.

## The forward model and the pack

Observations are geocentric astrometric directions in the ecliptic of J2000.0: the unit vector from the Earth's centre
(the committed pack `ephemeris-packs/solar-system-2025-2045.json`, JPL DE441, Venus, Earth, Mars and Jupiter,
heliocentric) at the receive time to the asteroid one light time earlier, no aberration. The perturbed truth integrates
the asteroid under the Sun and the pack's four planets (mass ratios typed from the DE-series values by recall, request R0).
Mercury, Saturn, Uranus, Neptune and the Moon's offset are absent from the pack. By the tidal estimate `m r / d^3` at a
main-belt distance Saturn is 2 percent of Jupiter, Mars 0.3 percent, Mercury less: the computed model error `E` is a
lower bound within a few percent. A real observatory is up to one Earth radius (4.26e-5 AU) from the geocentre and moves
a direction by that over the range: 5.9 arcseconds at 1.5 AU, 29 at 0.3 AU, 176 at 0.05 AU. The synthetic legs are
geocentric and free of it; the authentic legs apply the station's parallax constants (request R3); the near-Earth case is
excluded on this ground.

## What is in the repository, and what is not

Present: the pack above (positions to 1.05 km, so 7e-9 AU), the orbital layer (`js/orbital/layer.js`), the mission core's
two-body and Lambert code, the mover track (`js/measure/mover-track.js`, Prompt 186) and the orbit fitter for visual
binaries (`js/measure/orbit-fit.js`, Prompt 187, a different problem: relative astrometry of a bound pair).

Absent, and a request for Carl (nothing is downloaded or installed): the Minor Planet Center's observation records of a
main-belt asteroid over one apparition (R1), its published MPCORB orbit (R2), the observatory-code table with the parallax
constants (R3), and a published check of the planetary mass ratios (R0). They are listed with their provenance rules in
`thresholds.json` (`dataRequests`, `intake`). No authentic observation is read, simulated or recalled.

## The legs, the decision function and the slices

Every bound is in the fixture. The synthetic ensemble is twelve main-belt objects drawn in the oracle (a 2.2 to 3.3 AU, e
0 to 0.25, i 0 to 20 degrees, at opposition at `t2`, which is JD 2460900.5 + 380 k), each observed with 0.5 arcsecond
noise, 100 draws per arc. Arcs are named by their half span `T` in days: the curated arc `T60` (observations at `t2` - 60,
`t2` and `t2` + 60), the ill-conditioned arcs `T0.5`, `T1` and `T2`, a sweep, and the longer arc `L240` (thirteen
observations, 20 days apart, over 240 days). The withheld epochs are `Wn` = `t2` + 61 (the next night) and `Wf` = `t2` + 121.

| Leg | What it asks | Data |
|---|---|---|
| F1 | two-body propagation conserves energy and angular momentum to 1e-11 and returns after a round trip to 1e-11 AU | none |
| F2 | the spike's propagation against the oracle's DOP853 integration: at most 1e-9 AU | none |
| F3 | the spike's Earth position against the oracle's independent decoding of the pack: at most 1e-9 AU | none |
| F4 | the spike's observed direction against the oracle's, at every epoch: at most 0.001 arcsecond | none |
| F5 | noise-free curated arcs: Gauss then polish recovers the state at `t2` to 1e-8 AU on all twelve objects | none |
| G1 | the curated arc with noise: status ok on at least 95 percent of 1,200 draws | none |
| G2 | kappa of the curated arc at the true state is at most 1,000 on at least eleven of twelve objects | none |
| G3 | at `Wn` and `Wf`: the distance to the oracle's unperturbed reference is within `tol(W)`, and the distance to the perturbed truth within `Efit + 3.44 sigma`, on at least 97 percent of ok draws | none |
| G4 | on two-body truth, the 95 and 68 percent prediction ellipses cover the truth at 0.92 to 0.98 and 0.60 to 0.76 | none |
| G5 | the next-night 95 percent semi-major axis is at most 600 arcseconds on at least 90 percent of ok draws | none |
| H1 | the ill-conditioned arcs return ok on at most 1 percent of draws, every other draw a named status and no orbit, and kappa at the true state above the threshold on every object | none |
| H2 | the median kappa does not rise with the half span over 1, 2, 5, 10, 20, 40, 60 and 90 days | none |
| L1 | least squares on `L240`: ok on at least 95 percent, within tolerance on at least 97 percent, median `Wf` ellipse no larger than the curated arc's | none |
| N1 | twelve synthetic near-Earth objects over [-5, 0, 5] days: no draw ok, at least 90 percent nearEarth or illConditioned, and no main-belt draw nearEarth | none |
| P1 | Laplace's method on the curated arc, beside Gauss's: reported, never judged | none |
| A1 | the curated authentic arc determines (ok, kappa at most 1,000) | R1, R2, R3 |
| A2 | the authentic prediction is within `tol(W)` of the independent unperturbed propagation of the published elements | R1, R2, R3 |
| A3 | the authentic prediction is within `Efit + 3.44 sigma + 1.5 arcseconds` of the published observation nearest each withheld epoch | R1, R2, R3 |
| A4 | the least-squares fit of the longer authentic arc predicts the withheld observations and has a weighted RMS residual of at most 2 arcseconds | R1, R2, R3 |

The conditioning measure is `kappa`, the ratio of the largest to the smallest singular value of the Jacobian of the
observations with respect to the six state components, every column scaled to unit norm, at the determined state. The
threshold is 1,000, fixed a priori: the turning angle of the Earth's path over the arc (1.03 radian for `T60`, 0.017 for
`T1`) puts the curated arc near 10 to 100 and a single-night pair above 10,000, and 1,000 is the geometric middle of the
gap; no run adjusts it, and a run that puts the curated arc above it fails G2.

The withheld tolerance is `tol(W) = E(W) + Efit(W) + 3.44 sigmaMajor(W)`: `E(W)` is the distance, at the epoch, between the
perturbed truth and the unperturbed propagation of the osculating state at `t2`; `Efit(W)` the same between the perturbed
truth and the best unperturbed orbit fitted to the noise-free arc; `sigmaMajor` the formal prediction's larger
one-standard-deviation semi-axis. By the triangle inequality the distance of the prediction from the reference is below
it unless the noise leaves its 99.7 percent ellipse or the linearization fails, which is what the rate bound measures.
The tolerance is a statement about the unperturbed model's own error, computed and recorded; no number from Horizons
enters it.

**A**: F1 to F5, G1 to G5, H1, H2, L1, N1 and A1 to A3 pass: the curated arc determines and predicts within tolerance and
the ill-conditioned arc refuses. **B**: F1 to F5, H1, H2, L1, N1 and A4 pass: least squares over a longer arc only; no
three-observation determination. **C**: otherwise: no orbit determination, and the investigation ships as mover
identification and rate measurement. The first match from the top. A leg that cannot run for want of data is NOT RUN,
which is not a pass; the verdict that follows from NOT RUN legs is a pending one and the same function gives A or B when
the data arrive and the legs run. A bound that proves unmeasurable fails its leg; only Carl resets a bound; a failed leg
is reported and left failing.

The near-Earth case is outside every verdict. N1 judges only that the pipeline refuses it with a named status: the
geocentric approximation costs 29 arcseconds at 0.3 AU and 176 at 0.05, the topocentric position is the station's, and a
near-Earth determination is a later prompt's.
