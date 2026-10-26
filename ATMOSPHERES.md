# Atmospheres I: energy balance, two greenhouse models and the scale height

Prompt 200 (Roadmap III, T2 R14, production kernel; verdict B of Prompt 199, D-R10-75). The kernel in
`js/kernels/atmospheres/` and the planetary parameter pack beside it. **Not built here, and why:** the escape
panel and the Jeans module (verdict B: the escape data are unmeasured and any table needs its own rights decision
and a download approval), the instrument family and the three investigations (see "What is not built").

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
published numbers, not a downloaded table). There are no exobase conditions and no escape fields. The pack is a
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
