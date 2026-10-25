# Atmospheres gate I: energy balance and scale height

Roadmap III, Prompt 199 (tranche T2, authorized by D-R10-73). The first half of the atmosphere family
(the planets' energy balance, two greenhouse models, the isothermal scale height and a bounded
thermal-escape parameter) serves the introductory planets, habitability and exoplanet lessons. This
document commits what it must satisfy, **before any prototype exists**, and then records whether
Prompt 200 may build it whole (**A**), without the escape panel (**B**) or not at all (**C**).

The thresholds are held in `tests/fixtures/atmospheres-gate-i/thresholds.json` and read by
`tests/atmospheresGateI.test.js`, which also recomputes the verdict from the recorded checks. The text
down to "Results" and the thresholds file were committed first (the branch history shows the order); the
prototype lives on the branch `spike/atmospheres-gate-i`, which is never merged. A threshold that a
measurement crosses is a failed check, not a reason to move it; only Carl resets a threshold, with a
register row. A check that was not measured is never a pass.

## 1. The family and its limits (committed first)

Five models, each named as its own model, each with the failure modes the kernel prints beside every
number (`model` and `assumes` fields).

| Model | Statement | What it is not |
| --- | --- | --- |
| **Equilibrium (emission) temperature** | `T_eq = [(1 - A) S f / sigma]^(1/4)`, `S` the stellar flux at the planet, `A` the **Bond** albedo, `f = 2/3 - 5 eps / 12` for a redistribution efficiency `eps` in [0, 1] (`f = 1/4` uniform, Cowan and Agol 2011) | A surface temperature. It is the temperature of a black body that radiates what the planet absorbs. A planet with internal heat (Jupiter, Saturn, Neptune) has an observed **effective** temperature above it; the effective temperature is a measurement of the outgoing flux, the equilibrium temperature a model's output, and the kernel keeps the two names apart |
| **One-layer greenhouse** | one isothermal layer, transparent to sunlight, with emissivity and absorptivity `eps_L` in [0, 1]: `T_s = T_e [2 / (2 - eps_L)]^(1/4)`, `T_layer = T_s / 2^(1/4)` | A climate. No convection, no clouds, no shortwave absorption, one layer; it cannot exceed `2^(1/4) T_e`, so it **cannot reproduce Venus** and says so |
| **Grey radiative equilibrium (Eddington)** | `T^4(tau) = (3/4) T_e^4 (tau + 2/3)` with `tau` measured from the top, and the ground `T_g^4 = T_e^4 (1 + 3 tau_s / 4)`; optical depth `tau_s` the one free parameter | A different model from the one-layer greenhouse (they agree only at `tau_s = 4/3`). A demonstration of a temperature profile, not a climate model: grey opacity, no convection (a real lower atmosphere is convective and the radiative gradient is too steep), no clouds, no shortwave absorption. The Eddington closure is itself approximate (A5 measures how much) |
| **Isothermal scale height** | `H = k T / (mu m_u g)` | An atmosphere's thickness. Isothermal, hydrostatic, constant `g` (heights well below the radius), a well-mixed layer below the homopause; `T` and `mu` are stated, not looked up |
| **Jeans parameter and flux** | `lambda = G M m / (k T r)` at the **exobase**, `v0 = sqrt(2 k T / m)`, flux per unit exobase density `v0 (1 + lambda) exp(-lambda) / (2 sqrt(pi))` | A retention prediction. It needs a stated exobase temperature and radius, sourced per body, and says "can retain over this time only if `lambda` is at least this", with the exobase column assumed. Non-thermal escape (photochemical, ion, hydrodynamic, impact) is outside it, and so is the departure of the exobase velocity distribution from Maxwellian |

Not in this gate (and so not decided by it): spectra, transmission, emission and phase curves (gate II, Prompt
201), line-by-line transfer, clouds, a general circulation model. The gate covers the kernel, the lesson
instrument family that plots it, and their bytes; the lessons' content is Prompt 200's.

## 2. Reference values and tolerances (committed first)

Checks are identified by the ids in the thresholds file; the group of each is `core` (needed whatever the
verdict) or `escape` (needed only for the escape panel).

**Exactness against independent code.** `A1`, `A3`, `A4`, `S1` and `J1` compare the kernel with a second
implementation written without reading the kernel's source, in numpy with astropy's constants (the oracle
runs under `python -I` in a scratch virtual environment that has numpy, scipy, astropy and photutils and
nothing else). The tolerance for a closed form is 1e-12 relative (exact to rounding); the Jeans quantities
carry 1e-9 because the root is found by `brentq`. The grey model is also checked against a numerical solution of
the two-stream moment equations (`solve_ivp`, rtol 1e-12; 1e-6 in `T`).

**Eddington against the exact grey solution (`A5`).** A second oracle solves the Milne integral equation of
grey radiative equilibrium numerically (a discretisation with exact exponential-integral kernels, its own
self-test: it must return the Hopf function's `q(0) = 0.5774` and `q(infinity) = 0.7104` to 1 percent). The
Eddington profile must be within 4.0 percent in temperature for every depth from 0 to 100. This is the model's
stated error, shown to students, not a quantity to minimize.

**Published anchors (`A2`, `S2`).** Six Solar System bodies and one hot Jupiter. The values and the tolerance
of each comparison are committed before any computation:

| Body | Inputs | Published value compared | Tolerance |
| --- | --- | --- | --- |
| Venus, Earth, Mars | Bond albedos 0.76, 0.306, 0.25; stellar flux from the solar constant and the planet's distance (the application's own table); `eps = 1` | emission temperatures of about 227, 255 and 210 K (the textbook values) | 2 percent |
| Jupiter, Uranus, Neptune | Bond albedos 0.343, 0.300, 0.290 and the same flux rule | the equilibrium temperature implied by each planet's published effective temperature (124.4, 59.1, 59.3 K) and emitted-to-absorbed power ratio (1.668, 1.06, 2.61): `T_eff / ratio^(1/4)` | 1 percent |
| HD 209458 b | `T_eff` 6065 K, `R_star` 1.155 R_sun, `a` 0.04747 AU (`js/data/exoplanetSystems.js`), `A = 0`, `eps = 1` | the literature's range of equilibrium temperatures, 1,400 to 1,500 K, and the lesson's own formula (`js/data/investigations/transit-photometry.js`, `teq`) to 1e-12 | the band; 1e-12 |
| Venus, Earth, Mars (scale height) | `T` 737, 288, 210 K, `mu` 43.45, 28.97, 43.34, `g` 8.87, 9.81, 3.71 (the application's table) | fact-sheet scale heights 15.9, 8.5, 11.1 km | 5 percent |

The one-layer emissivity and the grey optical depth that **reproduce** the surface temperatures of Venus, Earth
and Mars are **reported, not asserted** (`A6`): there is no published optical depth to compare with, the two
models give different values for the same planet, and the one-layer model has no solution for Venus. That
refusal is the result.

**The escape bound (`J1` to `J4`).** The arithmetic is checked against independent code. The comparison with
**a published table at the sourced exobase conditions** needs a table this repository does not hold and a
source for each body's exobase temperature and radius; both are in the data plane and are not fetched here
(see 3).

## 3. Rights for every table, with the stop rule (committed first)

A data-rights decision is per source and per intended redistribution form (Roadmap III 7.5.4). Nothing was
downloaded for this gate. The anchors above are single published numbers typed into a fixture with a citation,
not a copied table, and **none was re-read against its source in the session that wrote them**; the fixture
records that (`checked: false`) and the production prompt may not call a number "published" until a reader with
access has checked it.

| Source | Form | Basis | State |
| --- | --- | --- | --- |
| NASA Planetary Fact Sheets (NSSDCA), Bond albedos and scale heights | single values, attributed | public domain (a U.S. Government work) | not re-read; values typed; unchecked |
| Hanel et al. 1981 (Jupiter), Pearl et al. 1990 (Uranus), Pearl and Conrath 1991 (Neptune): effective temperature, Bond albedo, emitted-to-absorbed ratio | three numbers per planet, cited | facts with citation; no table, figure or text copied | not re-read; values typed; unchecked |
| Cowan and Agol 2011 (ApJ 729, 54); Hubeny and others for the Eddington profile; Milne and Chandrasekhar for the exact grey solution | equations, cited | equations are not copyrightable; the text is not copied | cited |
| Exobase conditions per body; a published table of Jeans parameters | a table | **no source in the repository; none read; no decision exists** | **stop**: not measured |

**Stop rule.** A table whose source, terms and basis are not decided is not shipped, not simulated and not
reconstructed from memory: the check that needs it is `not-measured` and the verdict reads it as such. What would
settle it is a request to Carl, written out with the verdict.

## 4. Bytes and requests (committed first)

Prompt 160 allocated tranche T2 no deferred JavaScript and D-R10-73 replaced the allocation with a raise by each
prompt's measured overrun, so the allocation is stated as bounds the prototype must meet (`T1.*` in the thresholds
file): the kernel without the escape module, the widget module and the words (English plus a rot13 size stand-in
for Spanish, which is not a translation) at most 14.0 KiB gzipped, the whole family at most 16.0 KiB, the kernel
alone at most 5,120 B, at most 3 lazy chunks, 0 B of the first-visit precache and at most 274 B of the idle
precache (the room Carl's data budget leaves; the family's sources are `NEVER_PRECACHED`, so the family works
offline only after one online visit), and no existing route's sources or build figure rising by more than 0.2 KB.
The byte figures come from a Node 22 copy of the spike (CI's major), as the difference of the app build's
deferred total against the base.

## 5. Plots (committed first)

Every plot goes through the plot component (`js/plot/chart.js`): the temperature profile with the Eddington, the
exact and the one-layer values; the comparison of equilibrium temperatures with published ones; the Jeans-parameter
curves. `P1.plot` is checked in jsdom on the real component: path vertices where the data is, the legend
toggled from the keyboard, the keyboard readout in words, units in the axis titles, and no module outside
`js/plot/` drawing an axis.

## 6. The decision function and the slices (committed first)

In order: a `core` check that is not a pass gives **C**; else an `escape` check that is not a pass gives **B**; else
**A**. A B authorizes only the slice it names and never the A scope.

- **A**: Prompt 200 whole.
- **B**: Prompt 200 without the escape panel, the published table replacing the calculation (a table with its own
  rights decision, `J4`); Prompt 205 without the escape bar.
- **C**: stop and record. Prompts 200, 201 and 202 are not run; 203 builds the parameter table itself; 205's
  atmosphere items are removed and the Goldilocks lesson keeps its present step; 231's atmosphere item becomes a
  reading step (Appendix C, entry 199).

---

## Results

Everything above this line is the text committed in `1eeedc93`, before the prototype (the later change to
`thresholds.json` is Prettier's formatting, content identical). What follows was written after the
measurements. The prototype is `spike/atmospheres-gate-i` at `2196ac7e` (never merged): the kernel
(`js/kernels/atmospheres/`), a widget family of three instruments plotted through `js/plot/chart.js`, their
English words and a rot13 size stand-in for the Spanish, the registry entry and the `NEVER_PRECACHED` lines,
the oracle (`tools/atmospheres-gate/oracle.py`), the judge and the measurement script. The record is
`tests/fixtures/atmospheres-gate-i/record.json`; `tests/atmospheresGateI.test.js` re-derives every status from
it, the verdict from the decision function and checks that this document states it.

**Verdict: C**, by the committed decision function: two `core` checks are not passes, both about how the
family joins the existing build, and neither about the physics. Every scientific check passes; the two `escape`
checks were not measured, for want of data this repository does not hold and this session was not allowed to
fetch. The verdict is pending Carl's ratification (register row D-R10-75, DELEGATED) and Prompt 200 does not run
on it.

### The checks

| Check | Status | Measured |
| --- | --- | --- |
| `A1.equilibrium` | pass | 2,000 seeded points against numpy and astropy: relative error 0 (bound 1e-12) |
| `A2.anchors` | pass | Venus 229.1 K against 227 (0.9 percent), Earth 254.0 against 255 (0.4), Mars 209.8 against 210 (0.1); Jupiter 109.84 K against the 109.46 implied by its published pair (0.34 percent, bound 1), Uranus 0.23, Neptune 0.14; HD 209458 b 1,442.7 K, in 1,400 to 1,500 and equal to the lesson's formula (the lesson rounds 215.032 solar radii per AU; with the IAU constants the kernel gives 1,442.6 K, 1e-4 apart) |
| `A3.onelayer` | pass | 3.6e-16 against a linear solve of the two balance equations; the limits `eps = 0` and `eps = 1`; monotone |
| `A4.grey` | pass | closed forms 0; against the numerical two-stream solution 2.2e-16 (bound 1e-6), 60 depths from 0.01 to 200 |
| `A5.eddington` | pass | the oracle returned `q(0)` 0.5775 and `q(infinity)` 0.7104 (self-test passed); the Eddington profile is **3.66 percent warm at the top** (`tau = 0`) and the gap closes with depth: inside the 4.0 percent bound on 401 depths to 100 |
| `A6.report` | pass | reported, not asserted. Surface-to-emission ratio and the two models' values: Venus 3.217, one layer **no solution** (the model's maximum is 1.189), grey `tau_s` 141.5; Earth 1.134, emissivity 0.790, `tau_s` 0.870; Mars 1.001, emissivity 0.008, `tau_s` 0.005. At `tau = 1` the models give 280.4 K (one layer) and 293.3 K (grey) for an emission temperature of 255 K, and they agree only at `tau_s = 4/3` |
| `A7.refusals` | pass | 24 of 24 hostile inputs refuse with a reason and no number; every result names its model and what it leaves out |
| `S1.scale` | pass | 1e-12 against astropy constants on 1,000 points; the e-folding length of a numerically integrated isothermal column to 3e-15 |
| `S2.anchors` | pass | Venus 15.90 km (published 15.9), Earth 8.43 (8.5; 0.9 percent), Mars 10.86 (11.1; 2.2 percent) |
| `P1.plot` | pass | three plots drawn by `js/plot/chart.js`; the worst path vertex is 0.095 px from where its data is (bound 0.1); legend toggled from the keyboard; the keyboard readout speaks the values; the family contains no drawing code of its own. jsdom only (see "Not verified") |
| `T1.noescape.deferred` | pass | +4,724 B of deferred JavaScript (bound 14,336) on a Node 22.23.4 copy, kernel alone 1,488 B (bound 5,120) |
| `T1.requests` | pass | +2 lazy chunks (bound 3) |
| `T1.tier` | **fail** | first-visit precache **+46 B** (bound 0); idle +0 B (bound 274). The 46 B is the family's entry in `js/widgets.js` (202 B raw), a file the first-visit tier carries; the family's own sources add 0 B because they are `NEVER_PRECACHED` |
| `T1.routes` | **fail** | the same 202 B raises the lesson routes' sources and build figures by 0.2 KB (bound 0.2), and the transit lesson **with its instrument opened** gains **one request** (76 to 77) and 0.3 KB (bound: none gains a request); every other route is identical. Reproduced on a second run |
| `J1.arith` | pass | Jeans parameter, speed, flux per unit density and the root of the retention condition: 2.8e-15 against scipy (bound 1e-9) |
| `J2.vocabulary` | pass | the result is a bound (`canRetainOnlyIf`, the conditions it requires, a refusal without an exobase temperature and radius); no export or field says retained, lost or lifetime |
| `J3.published` | **not measured** | no published table of Jeans parameters is in the repository; nothing was fetched |
| `J4.sources` | **not measured** | no source for the exobase temperature and radius of Venus, Earth, Mars and Titan is in the repository; no rights decision exists |
| `T1.whole.deferred` | pass | +5,585 B with the escape instrument (bound 16,384); the escape module alone is 838 B |

### What the verdict says, and what it does not

- **The C is about two seam costs, and the committed bound on the first is one no widget family can meet.**
  The family registry is a generated list in `js/widgets.js`; any family adds its entry there (46 B gzipped, 0.2
  KB raw) and that file is part of the first-visit install. 0 B was my committed bound (178's, where nothing
  under `js/` imported the instrument); the first-visit room is 810 B, so no ceiling of `tools/data-budget.json`
  is touched by 46 B. The second check's request is a build-graph effect I did not isolate: the registry entry and
  the new lazy import are the only change on that route, and the standing approval of 2026-10-10 covers a route
  ceiling raised by exactly the measured overrun. I did not move either bound and did not change the prototype to
  hide either cost; both are Carl's to reset, with a register row.
- **If Carl reset those two bounds** (a recommendation, not an action: first-visit bound to the 810 B room, and one
  request on one route to the standing approval), the verdict under the same function is **B**: the escape checks
  are the only ones left, and they are unmeasured, not failed. `record.json` carries that as a counterfactual.
- **The science is not what failed.** The Eddington gap (3.66 percent at the top), the Venus refusal of the
  one-layer model and the disagreement of the two models are the lessons' content, and they came out as the
  physics says.
- **B needs data.** B's slice (Prompt 200 without the escape panel, a published table replacing the calculation)
  itself needs a rights decision for that table (`J4`). To measure A or to build B honestly Carl would have to
  approve, per request, a download of one open-access review or table with exobase temperatures, exobase radii
  and Jeans parameters for H, He, N2 and CO2 on Venus, Earth, Mars and Titan (size well under 1 MB; the licence
  must be CC BY or public domain, or be decided as its own row). **No such request was made and nothing was
  downloaded.**

### What a C removes (Appendix C, entry 199), if Carl ratifies it unchanged

Prompts 200, 201 and 202 are not run. Prompt 203 builds the parameter table itself. Prompt 205's atmosphere items
are removed and the Goldilocks lesson keeps its present step. Prompt 231's atmosphere item becomes a reading step.

### Iterations, in the open

The oracle for `A5` first discretised the Milne equation on geometric cells out to optical depth 400 and failed
its own self-test (`q(0)` 1.26 against 0.5774): the cells at depth were too wide for a linear source function.
It was refined (geometric cells to 0.5, then 0.02 wide, to depth 30; the tail beyond is the linear asymptote)
before it was compared with the kernel, whose Eddington formula was not touched and no bound moved. No other
check was run twice for a different answer.

### Not verified

- The published anchors (the textbook emission temperatures, the Bond albedos, the three giants' effective
  temperatures and power ratios, the three fact-sheet scale heights, the mean molecular weights) are numbers
  typed from the cited publications and **were not re-read against them**; each is marked `checked: false`.
  Their tolerances (1 to 5 percent) are wide enough that a one-digit slip would not change a status, but a
  reader with the sources must check them before 200 may call any of them "published".
- The three plots were drawn in jsdom through the real component, mounted beside the lesson tool canvas (which
  is hidden). The lesson tool host draws on a canvas, and a family that draws through the plot component needs
  that host seam; it was not exercised in a lesson page in a browser, and no axe or keyboard walk of a lesson
  was run.
- Bytes are from a Node 22.23.4 copy (CI's major) as differences against the tree at `5a4bd683`; the Spanish words
  are a size stand-in (rot13 of the English), not a translation, and no Spanish was written or read.
- No physics claim here has been reviewed by an external reader; the Eddington and Milne comparison, the
  Cowan and Agol redistribution factor and the Jeans flux are textbook forms I implemented, checked against
  independent numerical code, not against a published table.
