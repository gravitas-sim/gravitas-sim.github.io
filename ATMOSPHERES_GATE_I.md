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
