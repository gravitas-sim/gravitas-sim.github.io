# Interiors I: bulk comparison of the planets

Prompt 203 Part A (Roadmap III, T2 R14, production kernel; authorized by D-R10-73). The kernel in
`js/kernels/interiors/` and the planetary bulk pack beside it: density, surface gravity, escape speed,
equilibrium temperature, density classes and the compression correction, each from the table's stated errors.
**Not built in this change, and why:** the comparison workbench, the investigation "What are the planets made of?",
the model page section (the instruments and lessons are a later change, as they were for Prompts 200 and 204), and all
of Part B (the two-layer inversion and the Darwin-Radau oblateness), whose gate returned **C** as committed
(`INTERIORS_GATE.md`, D-R10-203-02).

## The quantities, each named as its own model

Every result carries the radius it used; a refusal carries a code and no number.

| Quantity | Statement | What it is not |
| --- | --- | --- |
| Mass | `M = GM / G`, `GM` from the table in km^3 s^-2, `G` CODATA 2018 (6.6743e-11, error 1.5e-15) | A measurement independent of `G`: every planetary mass shares its 2.2e-5 relative error |
| Bulk density | `rho = 3 GM / (4 pi G R^3)`, `R` the **volumetric mean** radius `(a^2 b)^(1/3)` | A density at any depth. Not the density of the material: that is the compression correction below |
| Surface gravity | `g = GM / R^2`, `R` the **equatorial** radius (the fact sheets' convention); needs no `G` | The weight on a scale: no rotation term. A giant has no surface: this is the value at its 1-bar equatorial radius |
| Escape speed | `v = sqrt(2 GM / R)`, equatorial radius; needs no `G` | An atmosphere's retention (that needs an exobase; Prompt 199's verdict B) |
| Equilibrium temperature | Prompt 200's kernel: Bond albedo, distance, full redistribution; no uncertainty (the albedo table states none) | A surface temperature |
| Density class | rocky (3000 kg/m3 or more), rock-ice (1800 to 3000), volatile-rich (below 1800); a density within 2 sigma of a boundary is labelled ambiguous | A composition. Density cannot tell hydrogen and helium from water ice: Jupiter (1326) and Uranus (1270) differ by 4.4 percent, so the third class is not split |
| Compression correction | bulk density minus the tabulated uncompressed density; its uncertainty combines the bulk density's error with a **declared** 200 kg/m3 spread | A measurement of compression: bulk composition differences (Mercury's iron) are not separated from it, and the 200 kg/m3 is a convention, not an error a source states |

Uncertainties are first order and uncorrelated (the formula engine's rule). `compareBodies(ids)` returns the rows the
workbench's table and plots will draw, in the order chosen, and refuses an empty, duplicated or unknown selection.

## The pack

`js/kernels/interiors/bodies.js`: Mercury, Venus, Earth, the Moon, Mars, Jupiter, Saturn, Uranus and Neptune, with `GM`
and the mean, equatorial and polar radii as `[value, standard error]`, the Bond albedo and distance of the three bodies
the Prompt 200 pack lacks (Mercury, the Moon, Saturn), and the uncompressed densities of the five terrestrial bodies. **Typed
from the cited publications (IAU WGCCRE, Archinal et al. 2018; JPL `GM` values; the NASA Planetary Fact Sheets) and not
re-read against them; nothing was downloaded; `checked` is false and no retrieval date exists.** The six bodies of the
Prompt 200 pack take their equilibrium temperature from that pack (one source of truth, check a4).

## The validation contract (committed first)

`tests/fixtures/interiors/thresholds.json` fixed every bound in commit `186ebf90`, before the kernel, the tool, the
oracle's results and the tests existed. A crossed bound is a failed check; only Carl resets one.

| Tier | Checks |
| --- | --- |
| (a) closed forms | a1 values and first-order uncertainties against numpy on 1,000 seeded points (values 1e-12, uncertainties 1e-10), a3 the volumetric mean radius from the equatorial and polar radii (0.1 percent), b2 the compression arithmetic |
| (b) independent reference | a2 nine bodies against the fact sheet (density 1, gravity 1, escape speed 2 percent), a4 three equilibrium temperatures (2 percent) and the Prompt 200 pack equality, a5 the classes, b1 the first-order uncertainty against 200,000 numpy Monte Carlo draws per body (2 percent) |
| (c) coverage | c1: 4,000 seeded trials per cell, 27 cells (nine bodies, three quantities): the stated 1-sigma interval covers at a rate in [0.64, 0.72], the 2-sigma in [0.94, 0.97] |
| (d) refusals | d1: at least 24 hostile inputs refused with a named code and no number |

The oracle is `tools/interiors-oracle/oracle.py` (numpy 2.2.6 and astropy 6.1.7's constants under `python -I`; complex-step
derivatives and `default_rng` seed 2031), written from the equations without reading the kernel; it is the author's own
independent implementation, and **no external published code was available**. `npm run interiors:validate` prints the
table; `tests/interiors.test.js` holds every row.

## Result

`npm run interiors:validate`: 16 rows, 16 pass.

| Check | Measured | Bound |
| --- | --- | --- |
| a1 values and uncertainties against numpy (1,000 points) | 0 and 7.8e-16 | 1e-12; 1e-10 |
| a2 density, gravity, escape speed against the fact sheet (nine bodies) | 0.05, 0.18, 1.16 percent | 1, 1, 2 percent |
| a3 mean radius from equatorial and polar | 7.7e-6 | 1e-3 |
| a4 Mercury, the Moon, Saturn against black-body temperatures; the Prompt 200 pack | 0.56 percent; 0 | 2 percent; 1e-12 |
| a5 classes; Jupiter and Uranus | all as stated; 4.4 percent apart | 5 percent |
| b1 first-order uncertainty against 200,000 Monte Carlo draws | 0.45 percent | 2 percent |
| b2 the compression correction | exact; bulk exceeds uncompressed for all five | 1e-12 |
| c1 coverage, 27 cells of 4,000 trials | 1 sigma 0.670 to 0.699; 2 sigma 0.950 to 0.960 | [0.64, 0.72]; [0.94, 0.97] |
| d1 refusals | 31 of 31 | 24 |

What the numbers say, and what they do not: the escape-speed row is closest to its bound because the fact sheet rounds to
two figures (Mercury 4.3 against 4.25), not because the kernel is off. The anchors are typed numbers: they agree with
each other to the stated tolerances, which says a one-digit slip in either would have shown, not that either was read
against its source.

## Not verified

- No typed value was checked against its source (no retrieval; `checked: false`), including the uncompressed densities,
  whose 200 kg/m3 spread is a convention.
- The kernel is imported by no page; nothing about its use in a lesson, a plot or a browser was exercised.
- Equilibrium temperatures carry no uncertainty: the Prompt 200 albedo table states none.
- Part B is not built (INTERIORS_GATE.md, verdict C as committed).
