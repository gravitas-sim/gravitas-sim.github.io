# Atmospheres I: energy balance, two greenhouse models and the scale height

Prompt 200 (Roadmap III, T2 R14, production kernel; verdict B of Prompt 199, D-R10-75). The kernel in
`js/kernels/atmospheres/` and the planetary parameter pack beside it. **Not built, and why:** the escape
panel and the Jeans module (verdict B: the escape data are unmeasured and any table needs its own rights decision
and a download approval; see "What is not built"). The kernel and the pack came first (D-R10-80); the instruments and
two investigations followed (D-R10-81, "The instruments and the lessons").

## The models, each named as its own model

Every result carries `model` (its name) and `assumes` (what it leaves out); a refusal carries a reason and no
number. Nothing here is a climate model: no convection, no clouds, no line-by-line transfer.

| Model | Statement | What it is not |
| --- | --- | --- |
| Equilibrium (emission) temperature | `T_eq = [(1 - A) S f / sigma]^(1/4)`, `A` the **Bond** albedo, `S` the stellar flux at the planet, `f = 2/3 - 5 eps / 12` for a redistribution efficiency `eps` in [0, 1] (`f = 1/4`, uniform, at `eps = 1`; Cowan and Agol 2011) | A surface temperature. Not a geometric albedo. Internal heat is ignored (the giants emit more than they absorb) |
| One-layer greenhouse | one isothermal layer, transparent to sunlight, emissivity and absorptivity `eps_L` in [0, 1]: `T_s = T_e [2 / (2 - eps_L)]^(1/4)`, `T_layer = T_s / 2^(1/4)` | A climate. At most `2^(1/4)` = 1.189 times the emission temperature: **no emissivity reaches Venus** (ratio 3.22), and the kernel says so |
| Grey radiative equilibrium (Eddington) | `T^4(tau) = (3/4) T_e^4 (tau + 2/3)`, `tau` from the top; ground `T_g^4 = T_e^4 (1 + 3 tau_s / 4)` | The one-layer model with another name: its `tau_s` is an optical depth, not an emissivity, and the two give different numbers for the same planet. The Eddington closure is 3.66 percent warm at the top against the exact grey solution |
| Isothermal scale height | `H = k T / (mu m_u g)` | An atmosphere's thickness. Isothermal, hydrostatic, constant `g` (heights well below the radius), a well-mixed layer |

References: Cowan and Agol 2011 (ApJ 729, 54) for the redistribution factor; Eddington's closure and the
Milne equation as in Chandrasekhar 1960 (*Radiative Transfer*) for the grey profile and its exact solution;
the NASA Planetary Fact Sheets (NSSDCA) for the pack; Hanel et al. 1981, Pearl et al. 1990 and Pearl and Conrath
1991 for the giants' effective temperatures and power ratios. Equations are not copied text.

## The pack

`js/kernels/atmospheres/bodies.js`: Venus, Earth, Mars, Jupiter, Uranus and Neptune with semi-major axis, Bond
albedo, the measured temperature (the surface for the three terrestrial bodies; the 1-bar level for the giants,
which have no surface and are labelled so), surface gravity, mean molecular weight and composition. Each value
names its source and carries `checked: false` (typed from the fact sheets and the publications above; **no
retrieval date can be recorded because nothing was retrieved in this session**: the pack is data typed from
published numbers, not a downloaded table). Carl read the typed anchors and pack values and said they look
correct (chat, 2026-10-25, relayed by the coordinator); every body carries `reviewedBy` and `reviewNote` for
that. It is a reader's review and **not a check against the NASA fact sheets or the cited papers**, so
`checked` stays false and no source check is claimed. There are no exobase conditions and no escape fields. The pack is a
lazy module (`NEVER_PRECACHED`), so it costs the first-visit tier nothing.

`compareWithMeasured(id, { albedo, redistribution })` returns the emission temperature beside the measured
temperature and the **difference labelled** (a surface-warming gap for the terrestrial bodies, an
emission-above-measured-level note for the giants).

## The validation contract (committed first)

`tests/fixtures/atmospheres/thresholds.json` fixed every bound before `js/kernels/atmospheres/`, the validation
tool, the oracle's results and the tests existed; it carries Prompt 199's bounds unchanged. A crossed bound is a
failed check; only Carl resets one.

| Tier | Checks |
| --- | --- |
| (a) the closed forms | a1 equilibrium, a2 anchors, a3 one layer and its limits, a4 grey forms, a6 the two models' parameters per body, s1 and s2 scale height |
| (b) independent oracle | numpy and scipy with no Gravitas code: closed forms to 1e-12; the grey two-stream moment equations by `solve_ivp` (1e-6) at three pinned optical depths (b2); the exact grey solution of the Milne equation against the Eddington profile (b1, 4.0 percent) |
| (c) fitted uncertainty | not applicable: the kernel fits and returns no uncertainty; stated, not run |
| (d) outside the domain | d1: 24 hostile inputs refused with a reason and no number, an optical depth below 0 among them |

The "independent implementation" of tier (b) is the author's own, written from the equations in numpy and scipy
(and astropy's constants) without reading the kernel; **no external published radiative-transfer code was
available**, and none is claimed. `tools/atmospheres-oracle/oracle.py` and `inputs.mjs` regenerate the pinned
results in `tests/fixtures/atmospheres/oracle-results.json` (seed 199, counts as in the thresholds file).

`npm run atmospheres:validate` prints the table; `tests/atmospheres.test.js` holds every row.

## Result

`npm run atmospheres:validate`: 42 rows, 41 pass, 0 fail, tier (c) stated as not applicable.

| Check | Measured | Bound |
| --- | --- | --- |
| a1 equilibrium, 2,000 seeded points against numpy and astropy | 0 | 1e-12 |
| a3 one layer (surface and layer, 1,000 points); eps 0 and 1; monotone | 3.6e-16 | 1e-12 |
| a4 grey closed forms (1,000 points); against the two-stream equations (60 depths, 0.01 to 200) | 0; 2.2e-16 | 1e-12; 1e-6 |
| b2 grey profile at tau_s 0.87, 10 and 141.5 against the pinned solutions | 2.0e-16, 3.4e-16, 1.4e-16 | 1e-6 |
| b1 Eddington against the exact grey solution (oracle self-test q(0) 0.5775, q(infinity) 0.7104) | **3.66 percent warm at the top**, closing with depth | 4.0 percent |
| a2 anchors: Venus 229.0 K (227), Earth 254.0 (255), Mars 209.8 (210); Jupiter, Uranus, Neptune; HD 209458 b 1,443 K, equal to the transit lesson's own formula | 0.9, 0.4, 0.1 percent; 0.34, 0.26, 0.10 percent; 0 | 2; 1 percent; 1,400 to 1,500 K, 1e-12 |
| a6 the two models per body: Venus one layer **refused** (ratio 3.22 against a maximum of 1.19), grey `tau_s` 141.6; Earth emissivity 0.790, `tau_s` 0.870; Mars 0.006 and 0.004 | reported, never asserted | |
| s1 scale height against astropy constants; as an e-folding length | 0; 3e-15 | 1e-12; 1e-6 |
| s2 Venus 15.90 km, Earth 8.43, Mars 10.86 against 15.9, 8.5, 11.1 | 0.002, 0.9, 2.2 percent | 5 percent |
| d1 hostile inputs refused with a reason and no number; every result names its model | 24 of 24 | 24 |

What the numbers say, and what they do not: the two greenhouse models disagree about the same planet because
their free parameters are different quantities (an emissivity of a single layer, an optical depth of a grey
column); the Eddington profile is a 4 percent approximation to the exact grey solution and is warmest at the
top; the anchors are textbook numbers, typed and, since, read by Carl and found correct (a reader's review, not a source check: `checked: false`), with tolerances wide enough
that a one-digit slip would not change a status. Venus's surface-to-emission ratio is 3.22: no one-layer
atmosphere gets there, and that refusal is the result, not a bug.

## The instruments and the lessons (the follow-up PR, D-R10-81)

`js/atmosphereWidgets.js` (lazy family `atmosphere`, `NEVER_PRECACHED`, words in `js/i18n/{en,es}.atmospheres.js`)
holds three instruments, each drawn by the plot component (`js/plot/chart.js`) and each with a readout that is the text
equivalent of the plot, naming its model and what it leaves out: `atmosphere-balance` (the equilibrium temperature of
six bodies beside the measured temperature, the difference labelled, a giant planet said to have no surface),
`atmosphere-greenhouse` (the one-layer model and the grey profile side by side, the Eddington curve against the exact
grey curve, the emissivity and the optical depth each model needs), and `atmosphere-scale` (the scale height and the
pressure it implies). The exact grey curve uses the Hopf function in a closed approximation (`greyTemperatureExact`,
check b3: 0.48 percent against the pinned Milne solution, bound 0.5). The instruments are not drawn on a canvas of their own.

Two investigations use them, in `js/data/investigations/atmosphere-sequence.js` and its three siblings (English, Spanish,
and the deeper steps in both), each with three depths and instructor content: **Why Venus Is Hot** (survey: predict and
read the emission temperature of Earth and Venus, the gap, the six bodies, one layer cannot reach Venus, one grey optical
depth can) and **Two Greenhouse Models** (majors: Earth fitted twice, why the numbers differ, which model can reach
Venus; deeper: Mars, one unit in each model, the limits of grey opacity). Every number a step states is recomputed from
the kernel in `tests/atmosphereLessons.test.js`. The Spanish is unread by a fluent reader.

The validation page reads a group, "Atmospheres" (`js/validation/groups/atmospheres.js`, 7 checks).

## What is not built

- **The escape panel and the Jeans module** (verdict B of Prompt 199): the escape data are unmeasured, and a table needs
  its own rights decision and a download approval from Carl; nothing was fetched. "Keeping an Atmosphere" is therefore not
  written.
- **The Goldilocks re-pointing**: the lesson has no equilibrium-temperature step (it works in stellar flux), so there
  is nothing to re-point; the transit lesson's formula is the one the kernel is tested against (check a2).
- **A sequence row** for the two lessons: the curated sequences need a message id per row in two catalogs that sit at
  their line ceilings, and the section places the lessons in no sequence.
- **A model page section**: no prose was added to the public model page.
