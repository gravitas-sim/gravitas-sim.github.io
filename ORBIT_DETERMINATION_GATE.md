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

When the contract was written none of the following was in the repository: the Minor Planet Center's observation records of
a main-belt asteroid over one apparition (R1), its published orbit (R2), the observatory-code table with the parallax
constants (R3), and a published check of the planetary mass ratios (R0). They are listed with their provenance rules in
`thresholds.json` (`dataRequests`, `intake`). Carl allowed R1 to R3 afterwards; what the retrieval gave is below. No
authentic observation is read, simulated or recalled.

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

## The measurement

Spike `spike/orbit-determination-gate` (commit 24cef4fb, never merged): universal-variable propagation, the geocentric
light-time forward model with the committed pack, Gauss's method (the eighth-degree polynomial, the `f` and `g` series,
the universal-variable refinement with light time), Laplace's method, differential correction, kappa, the covariance and
the refusal rule, and the harness `tools/orbit-determination-gate.mjs`. The oracle is an independent Python program
(`tools/orbit-determination-gate-oracle/oracle.py` on the spike, run as `python -I`, numpy 2.0.2, scipy 1.13.1, nothing of
Gravitas run): its own decoding of the pack's coefficients, its own draw of the objects, DOP853 integration of the
perturbed and the unperturbed motion, its own light-time directions, and its own best-fit unperturbed orbits (`Efit`).
`tests/fixtures/orbit-determination-gate/oracle-results.json` is its output and `record.json` the harness's.
`tests/orbitDeterminationGate.test.js` judges every leg from the recorded numbers and the committed bounds and holds the
verdict. The bounds are the committed ones; no bound moved. Two corrections to the spike's numerics were made after the
first full run and are recorded in `record.json` (k1: the differential correction takes a small Newton step as it stands
instead of asking the cost to fall, which is flat to rounding at the minimum; k2: the central-difference steps are 1e-5 AU
and 1e-7 AU per day, because below that the rounding of the residuals divided by the step made the steps cycle at 5e-10
AU on arcs whose residual is not zero); they changed the longer-arc ok rate from 0.366 to 0.984 and no pass or fail
elsewhere.

| Leg | Measured | Bound | |
|---|---|---|---|
| F1 invariants and round trip | 1.1e-15 and 1.5e-15 AU | 1e-11 | pass |
| F2 propagation against the oracle's DOP853 | 1.0e-14 AU | 1e-9 | pass |
| F3 Earth position against the oracle's decoding | 3.4e-16 AU | 1e-9 | pass |
| F4 observed direction against the oracle's | 3.8e-10 arcsec | 0.001 | pass |
| F5 exact curated arc | state recovered to 3.2e-14 AU on 12 of 12; status ok on **11** of 12 | 12 of 12 ok | **fail** |
| G1 curated arc with noise, status ok | **0.916** (1,099 of 1,200; 100 illConditioned, all object 1; 1 noConvergence) | 0.95 | **fail** |
| G2 kappa of the curated arc at the true state | 11 of 12 at 18 to 289; object 1 at **1,539** | 11 of 12 at 1,000 | pass |
| G3 withheld epochs, `Wn` / `Wf` | 0.999 / 1.000 within `tol` of the reference; 0.998 / 1.000 within `Efit + 3.44 sigma` of the truth | 0.97 | pass |
| G4 coverage of the formal 95 and 68 percent ellipses | `Wn` 0.949, 0.678; `Wf` 0.950, 0.690 (2,199 ok draws of 2,400) | 0.92 to 0.98; 0.60 to 0.76 | pass |
| G5 next-night 95 percent semi-major axis | median 1.3 arcsec; 100 percent of ok draws under 600 | 0.90 | pass |
| H1 ill-conditioned arcs (3,600 draws) | 0 ok; kappa above 1,000 on all 36 object-arcs | 0.01 | pass |
| H2 median kappa against the half span | 87,967, 22,220, 3,704, 993, 267, 74, **37 at 60 days, 45 at 90 days** | no rise | **fail** (one rise) |
| L1 least squares on the longer arc | ok 0.984; within `tol` 1.000 and 1.000; median `Wf` semi-axis 0.41 against 3.67 arcsec (ratio 0.11) | 0.95; 0.97; 1.0 | pass |
| N1 twelve near-Earth objects (1,200 draws) | 0 ok; nearEarth 360, noConvergence 720, unphysical 120: **0.30** nearEarth or illConditioned; main belt never nearEarth | 0 ok; 0.90 | **fail** |
| P1 Laplace on the curated arc | median position error 0.65 AU raw, against 1.0e-4 AU for Gauss; the polish from Laplace's start converges on 240 of 240 | reported | not judged |
| A1 to A4 (the published arc and orbit) | NOT RUN | | |

What the measurement says. The functions are right: propagation, Earth position and the forward model agree with the
independent oracle to 1e-14 AU and 4e-10 arcsec, and noise-free curated arcs return the state to 3e-14 AU. On a
well-conditioned arc (`T60`, kappa 18 to 289 on eleven objects) the three-observation determination predicts the next night
to a median 1.0 arcsecond of the unperturbed reference against a tolerance of 2.7, and 61 days on to 3.9 against 19; the
model's own error `E` is 0.8 and 2.1 arcseconds at the two epochs, `Efit` 0.03 and 4.1, and the formal prediction
interval is honest (coverage 0.949 against 0.95). Every ill-conditioned arc refuses: none of the 3,600 draws returned an
orbit. The least-squares fit of the longer arc is nine times sharper at `Wf` than the curated arc.

The fails are the contract's own legs, not the solver's. F5 asks the exact curated arc to return status ok on every
object; object 1 (inclination 0.44 degrees, node 2.9 degrees) has kappa 1,539 and is refused, which is G2's allowed
exception and G1's 8 percent false refusal (the two legs disagree by construction: G2 lets one object in twelve exceed
the threshold, G1 lets 5 percent of draws refuse). That is a physical finding, taught in Part B: an object on the ecliptic
seen from the Earth at opposition has parallax only in longitude, and the latitude carries no range information, so
kappa rises as the inclination falls (object 2, inclination 0.7 degrees, 289; object 3, 2.6 degrees, 50). H2 asks kappa
never to rise with the half span; it falls to its minimum of 37 at 60 days and rises to 45 at 90 days (the semi-major axis
of the next-night ellipse likewise, 1.3 to 4.5 arcseconds); the cause is probably that beyond a quarter of the Earth's
orbit the observer's path stops adding curvature in the direction that matters, a reading this gate did not test. The 60 days chosen a priori is, by this record, the
best of the sweep. N1 asks 90 percent of near-Earth draws to end as nearEarth or illConditioned; none returns an orbit,
but 720 end as noConvergence and 120 as unphysical: six of the twelve objects lie within 5 percent of the Earth's
heliocentric distance, where the committed rule excludes the true root of Gauss's polynomial as the spurious Earth root,
and the others fail in the iteration. The near-Earth status is therefore **refused**, never determined, and the named
status is not the one the contract expected.

Verdict by the committed function: **C**, measured on the synthetic legs and not pending: F5, G1, H2 and N1 fail as
committed, so neither A nor B can follow, whatever the authentic legs give. The authentic legs A1 to A4 are NOT RUN (the
MPC's observations could not be retrieved; see the rulings and the retrieval below).
Part B is not built: it is authorized only by a verdict of A or B.

## What the verdict builds, and what is asked of Carl

**C** (as it stands): no kernel and no orbit-determination investigation; the survey investigation (find the mover by
blinking, mark it, see it move) and the rate measurement Prompt 186 built stand. Prompt 198's populations slice does not
depend on this verdict.

Carl's rulings of 2026-10-27 (his answers in chat, relayed by the coordinator, verbatim): on the four failed legs F5, G1,
H2 and N1, "Leave failing, labelled (Recommended)": the verdict stays C, measured, and no bound moves. On the data
requests, "Yes, R1–R3 (Recommended)": the MPC observations of one numbered main-belt asteroid, its published orbit and the
observatory-code table; R0 (a published check of the planetary mass ratios) was not in his question and was not fetched,
so the mass ratios stay typed by recall and unchecked. The recommendations of the first version of this gate (restating
the four legs) are therefore withdrawn.

What the retrieval gave (`tests/fixtures/orbit-determination-gate/sources.json`; each item fetched into its own new
directory and read as data, with the URL, date, size and SHA-256). The MPC's data page answered 403 to automated access and
was not worked around; its API host's `robots.txt` allows `/api/` and the API documentation states no licence, so the
numbers are used as facts with credit, as the roadmap says.

- **R2, the published orbit of (1) Ceres** (`/api/get-orb`, 11,550 bytes): epoch MJD 61200 TDT, ecliptic J2000, a 2.76555
  AU, e 0.07969, i 10.588 degrees, 7,376 of 8,017 optical observations over 1801 to 2026, normalized RMS 0.82, force model
  AST17 on DE431. By the intake rule Ceres meets the elements (a 2.2 to 3.3 AU, e under 0.25, i under 20 degrees, H 3.34
  under 10); the 60-observations-in-240-days condition needs R1.
- **R3, the observatory codes** (`/api/obscodes`, 215,986 bytes, not committed; the hash identifies it).
- **R1, the observations: not retrieved.** `/api/get-obs` returns HTTP 500 (`property 'json' of 'Request' object has no
  setter`) on every request, including the exact example in the MPC's own documentation; the query-string form is refused
  (501). That is a server-side fault, not a block. The old database pages are disallowed by `robots.txt`, so nothing else
  was tried. Without observations A1 to A4 cannot run and stay NOT RUN; nothing is simulated or typed from memory.

The next step is the MPC's: when `get-obs` works (or Carl supplies an 80-column file by another route he approves), A1 to
A4 run against the committed thresholds with no bound moved, and a verdict of A or B would need them and a restatement of
the four failed legs, which only Carl can make.

## Not done in this gate

A1 to A4 (the observations could not be retrieved, see above), the
topocentric observer (the sky kernel's sidereal time and the station vector), the equatorial to ecliptic edge rotation,
UTC to TDB, stellar aberration and the Moon's offset of the Earth from the Earth-Moon barycentre. Mercury, Saturn, Uranus
and Neptune are absent from the pack, so `E` is a lower bound within a few percent. Laplace's method is run and reported,
not judged. Part B (the kernel, the packs, the validation tiers, the investigations, the model page section) is not built.
