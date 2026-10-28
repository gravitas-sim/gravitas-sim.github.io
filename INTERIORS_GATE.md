# Interiors gate: the two-layer inversion and Darwin-Radau oblateness

Roadmap III, Prompt 203 Part B (tranche T2, authorized by D-R10-73). The bulk comparison of Part A (density, gravity,
escape speed, equilibrium temperature, composition classes) is sound on the parameter table and is built without a gate.
Two further things are not sound everywhere: inferring a core radius from the bulk density with a two-layer model, and
predicting a planet's flattening from its rotation with the Darwin-Radau relation. This document commits what each must
satisfy, **before any prototype exists**, and then records whether they may be built whole (**A**), as the oblateness
alone (**B**) or not at all (**C**, Part A stands).

The thresholds are held in `tests/fixtures/interiors-gate/thresholds.json` and the typed inputs in
`tests/fixtures/interiors-gate/sources.json`; `tests/interiorsGate.test.js` reads both and re-derives the verdict from the
recorded checks. The text down to "Results" and those two files were committed first (the branch history shows the
order). The prototype lives on the branch `spike/interiors-gate`, which is never merged. A threshold that a measurement
crosses is a failed check, not a reason to move it; only Carl resets a threshold, with a register row. A check that was not
measured is never a pass.

## 1. The two models and their limits (committed first)

| Model                                   | Statement                                                                                                                                                                                                                                                                                                                                               | What it is not                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Two-layer constant-density interior** | A core of radius `r_c` and uniform density `rho_c` inside a mantle of uniform density `rho_m`. Mass `M = (4 pi / 3) [rho_c r_c^3 + rho_m (R^3 - r_c^3)]`, so `x^3 = (r_c / R)^3 = (rho_bar - rho_m) / (rho_c - rho_m)` with `rho_bar = 3 M / (4 pi R^3)`. Moment of inertia `C = (8 pi / 15) [rho_c r_c^5 + rho_m (R^5 - r_c^5)]`, factor `C / (M R^2)` | A structure. A density that is constant inside each layer is a mean over a layer whose density really rises with depth; the two densities are **in-situ layer means from a published reference model**, not the density of the material at the surface. Earth with uncompressed-material densities (3,300 and 7,800 kg/m3) returns a core of 5,000 km against the real 3,480 km: that failure is why the inputs are stated as in-situ means and why the model refuses anything it has no such table for                                   |
| **Darwin-Radau relation**               | For a hydrostatic body rotating rigidly, to first order in the flattening: `C / (M a^2) = (2/3) [1 - (2/5) sqrt(5 q / (2 f) - 1)]`, with `q = omega^2 a^3 / (G M)` (the equatorial radius `a`, the sidereal angular speed `omega`) and `f = (a - b) / a`; solved for the flattening, `f = (5 q / 2) / (1 + (25/4) (1 - 3 C / (2 M a^2))^2)`             | A third-order theory. The neglected terms are of order `f` itself (Earth 0.3 percent, Jupiter 6.5 percent, Saturn 9.8 percent). Not valid for a body that is not in hydrostatic equilibrium (Mars's Tharsis load, the Moon's fossil figure, a slowly rotating Venus), nor where the rotation parameter is large. The convention for `q` matters at the same order as the closure (`a^2 b` instead of `a^3` changes Jupiter's prediction by 6.5 percent): it is fixed here as `a^3`, the equatorial radius, and stated beside every result |

The Radau closure assumes a monotonic density profile; the relation is the first-order theory of Clairaut (an equation for
the flattening profile `epsilon(r)`) closed by Radau's approximation, which is what the independent oracle below tests.

**Domain, committed (the gate may not call untested work another instance of the family).**

- _Two-layer inversion:_ a body for which the pack carries in-situ layer means **and** a published core radius and moment
  of inertia to test against: **Earth and Mars**, nothing else. Mercury, the Moon (named differentiated bodies whose moment of
  inertia is published) are not tested by this gate and are refused with that reason; Venus (moment of inertia unmeasured), the
  giants and any body whose bulk density is below 3,000 kg/m3 (rock-ice or volatile rich) are refused as outside the model.
  The algebraic domain is `rho_m < rho_bar < rho_c`.
- _Darwin-Radau:_ hydrostatic bodies with `q <= 0.10`. Tested: Earth and Jupiter (`q` 0.0035 and 0.089). Saturn (`q` 0.158)
  is **outside** the tested range and is refused with that reason; Mercury, Venus, the Moon and Mars are flagged
  non-hydrostatic and refused; `C / (M a^2)` must lie in (0, 0.4).

## 2. Reference values, oracle and tolerances (committed first)

Every published value is **typed** from the cited source into `sources.json`, with `checked: false`: nothing was
downloaded and no value was re-read against its source in the session that wrote it (3). A disagreement with a source is a
defect to be found, not a tolerance to be widened.

**The independent oracle.** `tools/interiors-gate/oracle.py`, run under `python -I` with numpy and scipy and nothing else,
written from the equations, **without reading the kernel**: (i) the two-layer mass and moment by `scipy.integrate.quad`
over a piecewise-constant profile with the break at `r_c` (not the closed form), and the core radius by `brentq` on the
mass equation; (ii) the first-order Clairaut flattening of a rotating hydrostatic body for a given density profile, by
integrating Radau's equation `r d(eta)/dr + 6 D (eta + 1) + eta (eta - 1) = 6`, `D = rho(r) / rho_bar(r)`, `eta(0) = 0`,
with `solve_ivp` (rtol 1e-12), and the surface condition `5 q / (2 f) = eta_s + 2`; (iii) the exact moment of inertia of
the same profile by quadrature. Self-tests the oracle must pass before it is compared with anything: a homogeneous body
gives `eta = 0`, `C / (M a^2) = 0.4` and `f = 5 q / 4`; the `n = 1` polytrope, `rho = rho_0 sin(pi r / R) / (pi r / R)`,
gives `C / (M R^2) = (2/3)(1 - 6 / pi^2)` to 1e-8. The oracle's author is the same as the kernel's author; **no external
published interior code was available** and none is claimed.

| Id                    | Leg                                                                                                                                                                                                                                                    | Bound                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `I1.closed`           | two-layer core radius and mass: kernel against the oracle's `brentq` and `quad`, 1,500 seeded points                                                                                                                                                   | relative error at most 1e-12 (core radius 1e-10, the root finder's own)                                                               |
| `I2.moment`           | moment-of-inertia factor against `quad` on the same 1,500 points; the limit `rho_c = rho_m` gives 0.4 exactly                                                                                                                                          | relative error at most 1e-9                                                                                                           |
| `I3.earth`            | core radius from the table of in-situ means and Earth's mass and radius against the published core-mantle boundary, 3,480 km                                                                                                                           | within 2.0 percent                                                                                                                    |
| `I4.mars`             | the same for Mars against 1,830 km (about 2.3 times its published error of 40 km)                                                                                                                                                                      | within 5.0 percent                                                                                                                    |
| `I5.coverage`         | seeded ensemble (2 x 1,000 Earth-like and Mars-like synthetic bodies, truth densities drawn from the table's stated spread, `M` and `R` with 0.01 percent noise): the stated 1-sigma interval on the core radius covers the true core radius           | 1-sigma coverage in [0.63, 0.73] and 2-sigma coverage at least 0.92, in each cluster                                                  |
| `I6.moment-published` | the factor predicted from the inverted structure against the published factor (Earth 0.3307, Mars 0.364): within 10 percent; and a homogeneous body (0.4) is **ruled out** by each published factor by more than 10 times its stated error             | both                                                                                                                                  |
| `I7.refusals`         | at least 20 hostile or out-of-domain inputs (no core, core fills the body, `rho_c <= rho_m`, non-finite or non-positive inputs, Venus, Mercury, the Moon, Jupiter, a volatile-rich body) each refused with a named code and no number                  | all                                                                                                                                   |
| `O1.closed`           | Darwin-Radau forward and inverse against the oracle's closed form to 1e-12 on 1,000 seeded points; the homogeneous limit `C/(M a^2) = 0.4` returns `f = 5 q / 4` and the round trip `f -> C -> f` returns the input                                    | 1e-12                                                                                                                                 |
| `O2.radau-clairaut`   | for 200 seeded two-layer profiles and the `n = 1` polytrope: Darwin-Radau flattening from the **exact** moment of inertia against the oracle's first-order Clairaut flattening, at `q = 0.01` (the ratio `f/q` does not depend on `q` in first order)  | relative error in `f` at most 3.0 percent (the closure error is documented as under 1 percent in the moment; three times that margin) |
| `O3.earth`            | Earth's flattening from the published moment (0.3307) and rotation against the published 1/298.257                                                                                                                                                     | within 2.0 percent                                                                                                                    |
| `O4.jupiter`          | Jupiter's flattening from the published moment (0.264), `GM`, the equatorial radius and the System III period against the published `f` = 0.06487 (IAU radii)                                                                                          | within 10.0 percent (the neglected terms are of order `f`, 6.5 percent, plus a margin)                                                |
| `O5.chain`            | Earth's flattening from the **two-layer model's own** moment (I6) and rotation against the published value                                                                                                                                             | within 10.0 percent                                                                                                                   |
| `O6.coverage`         | seeded ensemble (1,000 two-layer profiles at `q` 0.0035, moment known to 0.002, `q` to 1 percent): the stated 1-sigma interval on `f` (the propagated error plus a model term of 1 percent of `f`) covers the oracle's first-order Clairaut flattening | 1-sigma coverage in [0.60, 0.76]                                                                                                      |
| `O7.refusals`         | at least 12 inputs (Saturn, Venus, Moon, Mars, Mercury, `q <= 0`, non-finite, factor 0.4 or more, factor 0 or less, `5q/(2f) - 1 < 0`, `q` above 0.10, an unknown body) each refused with a named code and no number                                   | all                                                                                                                                   |
| `B1.lazy`             | the kernel files are `NEVER_PRECACHED`, imported by no page, add 0 B to the first-visit and idle precache tiers and to the app's deferred JavaScript, and no file to the instructor closure (281 files)                                                | all four                                                                                                                              |

**(e) Authentic-data applicability, and its limit, stated before the measurement.** The two-layer legs `I3` and `I4`
are **closure tests, not independent tests**: the in-situ layer means are derived from the same published reference models
that give the core radii, so the inversion recovers the published model's own boundary, and a pass says the arithmetic,
the table and the masses are consistent and nothing more. The legs that carry independent information are `I6` (the moment
of inertia is not used in the inversion), `I5` (the stated uncertainty), `O3`, `O4` (rotation and gravity field give a
flattening that was not used to tune the relation) and `O2` (an independent integration). The published moments of Jupiter
and Earth were themselves obtained with interior models that use a hydrostatic figure theory; `O4` is therefore a
consistency check of two descriptions of one planet and not a measurement of the relation's error. This is stated here so
that no verdict is read as more than it is.

## 3. Rights for every table, with the stop rule (committed first)

A data-rights decision is per source and per intended redistribution form (Roadmap III 7.5.4). Nothing was downloaded for
this gate. The values below are single published numbers typed into a fixture with a citation, not a copied table or figure.

| Source                                                                                                                                                                                                                           | Form                      | Basis                                        | State                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| IAU Working Group on Cartographic Coordinates and Rotational Elements, Archinal et al. 2018 (Celest. Mech. Dyn. Astron. 130, 22): radii and their errors                                                                         | single values, attributed | facts with citation; no table or text copied | typed; **not re-read**; unchecked                                                                  |
| Planetary `GM` values (JPL Solar System Dynamics, the cited planetary ephemeris and spacecraft papers) and CODATA 2018 `G`                                                                                                       | single values, attributed | facts with citation                          | typed; **not re-read**; unchecked                                                                  |
| PREM (Dziewonski and Anderson 1981, Phys. Earth Planet. Inter. 25, 297): core-mantle boundary radius and the layer means derived from its masses                                                                                 | single values             | facts with citation                          | typed; unchecked                                                                                   |
| Mars: core radius and core density from InSight (Staehler et al. 2021, Science 373, 443); mantle mean density from published interior models (for example Khan et al. 2018)                                                      | single values             | facts with citation                          | typed; unchecked                                                                                   |
| Moment-of-inertia factors: Earth (Williams 1994 and standard reference values), Mars (Konopliv et al. 2016, Icarus 274, 253), Jupiter (the Juno-era interior models, for example Wahl et al. 2017, Geophys. Res. Lett. 44, 4649) | single values             | facts with citation                          | typed; unchecked; the Jupiter value is model-derived, not measured                                 |
| Rotation periods and the NASA Planetary Fact Sheets (NSSDCA) for the bulk anchors of Part A                                                                                                                                      | single values             | public domain (a U.S. Government work)       | typed; unchecked                                                                                   |
| A table of uncompressed densities of the terrestrial planets (for example Lewis, _Physics and Chemistry of the Solar System_)                                                                                                    | five values               | facts with citation                          | typed; unchecked; its stated spread is a **declared convention** (0.2 g/cm3), not a source's error |

**Stop rule.** A table whose source, terms and basis are not decided is not shipped, not simulated and not reconstructed
from memory beyond this typing. No source above was **retrieved**; Part B's verdict is therefore the verdict on the values
as typed. What would settle them is a request to Carl, written out with the verdict (the request list in the results).

## 4. Bytes (committed first)

The kernel files are lazy and `NEVER_PRECACHED`, imported by no page in this prompt's kernel and gate PR: they cost the
first-visit tier, the idle tier and the app's deferred JavaScript nothing, and add no file to the instructor closure
(`B1.lazy`). The instruments, the lessons and their words are a later PR's and carry their own bytes.

## 5. The decision function and the slices (committed first)

In order: a `common` check that is not a pass gives **C**; else an `oblateness` check that is not a pass gives **C**; else an `inversion` check that is not a pass gives **B**; else **A**. Stated plainly: A needs all legs; B is exactly "every
oblateness leg passes and some inversion leg does not"; anything in which an oblateness leg does not pass is **C**,
including "the inversion passes alone" (Appendix C names no slice "inversion only"; Carl may add one). A B authorizes only
the slice it names and never the A scope.

- **A**: Prompt 203 Part B whole: the inversion with its refusals, the oblateness from rotation and Darwin-Radau, the
  interactive cross-section, the upper depth (the moment of inertia and what it rules out) and "Why Jupiter is flattened".
- **B**: the oblateness only: the rotation-to-flattening calculation, its refusals and "Why Jupiter is flattened"; no
  inversion, no cross-section, and the upper depth's moment of inertia reads the published values without a model.
- **C**: no inversion and no oblateness; Part A stands.

---

## Results

Everything above this line is the text committed in `186ebf90`, before the prototype (Prettier has since padded the
tables; content identical). What follows was written after the measurements. The prototype is
`spike/interiors-gate` at `ad5a7d73` (never merged): the two-layer, Darwin-Radau and layer-pack modules
(`js/kernels/interiors/{twoLayer,radau,layers}.js`), the seeded inputs, the independent oracle, the measurement script
(`tools/interiors-gate/`). The record is `tests/fixtures/interiors-gate/record.json`, the pinned oracle output
`oracle-results.json`; `tests/interiorsGate.test.js` re-derives every status from them, the verdict from the decision
function, and checks that this document states it.

**Verdict: C**, by the committed decision function, on one coverage leg. Fourteen of the fifteen legs pass. `O6.coverage`
fails as committed, on the **conservative** side: the stated 1-sigma interval on the flattening covered the first-order
Clairaut truth in 79.0 percent of 1,000 profiles (committed band 0.60 to 0.76; the 2-sigma interval 98.7 percent). The interval
is the propagated error plus a committed model term of 1 percent of `f`, and `O2` measured the Radau closure's own error at
0.48 percent at worst, so the model term costs about twice what the closure does: the kernel over-reports its uncertainty, it does not
hide it. No bound was moved and the prototype was not changed to hide it (`failed-legs.json`). The decision function reads any
oblateness leg that is not a pass as C; with `O6` passing it would give **A** (the test shows this). Only Carl resets a bound:
a ruling that `O6` passes under a ruling (upper edge 0.76 to 0.80, the measured 0.79 rounded up) would make the verdict A, and the
spike's three modules, already validated, would be promoted with the tests and the instruments built on them. The
verdict is pending Carl's ratification as a register row (D-R10-203-02, DELEGATED).

### The checks

| Check | Status | Measured |
| --- | --- | --- |
| `I1.closed` | pass | mass 6.1e-16, core radius 7.8e-13 against `brentq` (8.8e-13 against the truth), 1,500 points (bounds 1e-12, 1e-10) |
| `I2.moment` | pass | 8.3e-16 against `quad` (bound 1e-9); `rho_c = rho_m` gives 0.4 exactly |
| `I3.earth` | pass | 3,479.9 km against 3,480 (0.003 percent; stated uncertainty 106 km): a closure test |
| `I4.mars` | pass | 1,827.4 km against 1,830 (0.14 percent; stated uncertainty 100 km): a closure test |
| `I5.coverage` | pass | Earth-like 1 sigma 0.672, 2 sigma 0.950; Mars-like 0.678, 0.972 |
| `I6.moment-published` | pass | Earth 0.3461 against 0.3307 (4.7 percent), Mars 0.3723 against 0.364 (2.3 percent); a homogeneous 0.4 is ruled out by 693 and 36 times the published errors |
| `I7.refusals` | pass | 23 of 23 refused, codes `input`, `layer-order`, `no-core`, `core-fills`, `volatile-rich`, `sigma`, `not-tested`, `unknown-body` |
| `O1.closed` | pass | forward and inverse 0 against the oracle (bound 1e-12), round trip 2.6e-15; homogeneous limit 0.4 |
| `O2.radau-clairaut` | pass | oracle self-tests passed (homogeneous eta 0, factor 0.4, `f/q` 1.25; polytrope factor 0.261382 against 0.261382); worst of 200 profiles 0.48 percent (x 0.63, density ratio 3.9), the `n = 1` polytrope 0.60 percent (bound 3.0) |
| `O3.earth` | pass | `q` 0.0034614, `f` 0.0033446 against 0.0033528 (0.24 percent) |
| `O4.jupiter` | pass | `q` 0.08920, `f` 0.06798 against 0.06487 (**+4.8 percent**, bound 10): inside the size of the neglected terms |
| `O5.chain` | pass | the two-layer moment 0.3461 gives `f` 0.003539 against 0.003353 (5.6 percent, bound 10) |
| `O6.coverage` | **fail** | 1 sigma 0.790 (band 0.60 to 0.76), 2 sigma 0.987; conservative |
| `O7.refusals` | pass | 18 of 18; Saturn refused with `q-range` (q 0.158 against the tested 0.10) |
| `B1.lazy` | pass | first-visit and idle precache +0 B (5,189,906 and 1,554,278 gzip bytes, equal on a Node 22 copy of the base and of this branch), deferred JavaScript and `sw-manifest.js` identical, instructor closure 281 files with none under `interiors` |

### What the verdict says, and what it does not

- **Part A stands whole.** The bulk kernel, the pack and their validation are `INTERIORS.md`.
- **Not built, on this verdict:** the two-layer inversion, the oblateness calculation, the cross-section, the upper depth's moment
  of inertia and "Why Jupiter is flattened". A C-dependent deliverable is skipped with a written reason (this one).
- **What passes is most of the science:** the arithmetic against an independent oracle, the closure of Earth and Mars, the
  predicted moments (within 5 percent, and ruling out homogeneity), the Darwin-Radau relation against Clairaut's equation (under
  0.7 percent) and against Earth and Jupiter, and the refusals, including Saturn. The two legs that carry independent information
  about the model are `I6` and `O4`: the two-layer constant-density model over-predicts Earth's moment by 4.7 percent, and
  Darwin-Radau over-predicts Jupiter's flattening by 4.8 percent. **Both are reported as the models' stated limits, not as
  errors to remove.**
- **`I3` and `I4` are closure tests**, as committed: the layer means come from the same models that give the core radii. Their
  agreement says the arithmetic, the table and the masses are consistent.
- **The convention for `q` matters at the size of the result.** With `a^2 b` in place of `a^3`, Jupiter's prediction falls by 6.5
  percent to about 2 percent below the published value. The convention was committed (`a^3`) before the measurement.

### Iterations, in the open

The oracle's first run stalled for over eight minutes and was stopped: the `n = 1` polytrope's `sin(x) - x cos(x)` loses all
precision near the centre, where the integrator starts, so the step size collapsed. The cure was a series for that term below
`x = 0.2` (commit `ad5a7d73`); no bound, input range or kernel line was touched. The oracle then ran once (273 s) and its
results are the pinned file. No check was run twice for a different answer. The kernel prototype was run once on
Earth, Mars and Jupiter before the oracle finished (to see it work), after the thresholds were committed.

### Not verified

- Every published input is typed and was **not re-read** against its source (`checked: false`): the layer means (Earth's from
  PREM's layer masses, Mars's chosen to be consistent with the published core and its core density range), the moments of
  inertia (Jupiter's is model-derived), the IAU radii, the rotation periods. The tolerances are wide enough that a one-digit
  slip would not change a status except `I4`'s Mars table, whose mantle mean was chosen to match the published core and so
  could not fail it.
- The oracle's author is the kernel's author; no external published interior code was used.
- Nothing was checked in a browser: no instrument exists yet.
- The Spanish and the lessons do not exist.

### Requests for Carl (nothing was fetched)

1. A ruling on `O6.coverage` (the 0.76 upper edge): leave it failing (verdict C stands), or reset it to 0.80 (pass under ruling,
   verdict A).
2. If A: a reader's check of the typed layer and moment values against PREM, Staehler et al. 2021, Konopliv et al. 2016 and the Juno-era
   papers (single values; facts with citation; no download needed if Carl reads them), and of the uncompressed-density table.
3. A ruling on the declared 200 kg/m3 spread of the uncompressed-density correction (Part A), or a source that states one.
