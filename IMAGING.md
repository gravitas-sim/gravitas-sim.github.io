# Direct imaging: contrast and separation (Prompt 230, Part A)

Why can a telescope not see Earth from ten parsecs away? Two separate things stand in the way: an
angle (is the planet far enough from its star on the sky?) and a contrast (is it bright enough against
the star?). This document states what the kernel (`js/kernels/imaging/`) computes, what it assumes and
leaves out, and how it was checked. The investigations are **Why We Cannot See Earth From Here**
(`why-we-cannot-see-earth`) and **Architectures** (`architectures`, majors); the instruments are the panels
`imaging-contrast` and `imaging-architectures` (`js/directImagingWidgets.js` over `js/directImagingField.js`).

Part A is this document's subject. **Part B** (reference-star subtraction on the forward models' frames, its
throughput by injection, the residual noise, the short-arc orbit criterion of Prompt 187 and the lesson
"Following a planet") is the gate `docs/imaging-subtraction-gate` and has not been run. Nothing here
subtracts a point-spread function or fits an orbit.

## What is new, and what already existed (the delta table)

| Existing authority | Missing behavior | Adopter | Duplication removed |
| --- | --- | --- | --- |
| `js/kernels/radiation/planck.js` (`planckLambda`, `bandRadiance`) | the ratio of two blackbodies at a wavelength or in a band | `js/kernels/imaging/contrast.js` | uses them, does not copy them |
| `js/kernels/atmospheres/phase.js` (`lambertPhase`, the phase integral 3/2) and `equilibrium.js` (`equilibriumFromStar`) | the reflected term as a planet-to-star flux ratio, and a self-luminous flag | the same | uses them |
| `js/kernels/detector/optics.js` (`lambdaOverD`, `rayleighAngle`, from Prompt 208) | the statement that neither is a coronagraph's inner working angle, and an observability verdict that refuses without a stated working angle | `js/kernels/imaging/geometry.js` | uses them |
| `js/data/exoplanetSystems.js` (`SUN_JUPITER`), the world builder's planet table | the Solar System as a row of the same diagram as the imaged planets | `js/directImagingField.js` | the planets' values are held equal to the world builder's by a test |

## What the kernel computes

For a planet of radius `Rp` at orbital radius `a` around a star of radius `R*`:

- **Thermal contrast**, `C_th(lambda) = (Rp / R*)^2 B_lambda(Tp) / B_lambda(T*)`, or the same with the band
  integrals `integral B_lambda d lambda` over `[lambda_min, lambda_max]`. Both bodies are blackbodies at one
  temperature each.
- **Reflected contrast**, `C_ref(alpha) = A_g (Rp / a)^2 Phi(alpha)`, with the Lambert-sphere phase function
  `Phi(alpha) = [sin alpha + (pi - alpha) cos alpha] / pi` (1 at full phase, `1/pi` at quadrature).
- **Equilibrium temperature**, `T_eq = T* (R* / a)^(1/2) ((1 - A_B) f)^(1/4)`, with `f = 1/4` for uniform
  redistribution and the Bond albedo `A_B = 3/2 A_g`; the temperature a planet would have if starlight were
  all that heated it. A temperature the caller states (a young giant's own) is used as stated and flagged
  self-luminous when it exceeds twice the equilibrium.
- **Separation**, the projected angle `atan(s / d)`. A circular orbit at phase angle `alpha` has projected
  separation `a sin(alpha)` whatever its inclination: at full phase a planet is behind its star.
- **The diffraction scale** `lambda / D` and the Rayleigh angle `1.2197 lambda / D` (unobstructed), with the
  record's own statement that **neither is a coronagraph's inner working angle**. The inner working angle is
  where an instrument's suppression of starlight begins to work; it is set by the mask and the wavefront
  control, differs between instruments and is stated for the instrument. `observable()` takes it as input
  (in arcseconds or as a stated multiple of lambda / D) and **refuses** (`no-inner-working-angle`) when none
  is given: it never derives one.
- **Observability**: not observable with this instrument inside the stated inner working angle, and not
  observable below the stated contrast floor. It is a necessary condition. No coronagraph, speckle,
  adaptive-optics residual or exposure time is modeled.

## The teaching instruments

The panel offers four instruments (0.25 m visible, 2.4 m visible, 8 m near-infrared, 6 m visible) with inner
working angles of 3, 3, 2 and 3 lambda / D and contrast floors of 1e-4, 1e-9, 1e-5 and 1e-10. **These are
teaching values chosen by this prompt, not cited specifications, and no published coronagraph value was
supplied** (the prompt asks for a cited example; that part is NOT RUN, E2). The 6 m example's floor sits just below
Earth's contrast so that it is a thought experiment about what a telescope would have to do, not a statement
about any mission. The lessons and the panel say so beside every number.

## Data: the imaged planets

`js/data/imagedPlanets.js` holds the NASA Exoplanet Archive's Planetary Systems Composite Parameters rows with
discovery method Imaging, retrieved 2026-10-31 (98 rows, the TAP answer to the query in
`tools/imaging-table.mjs`, whose SHA-256 is pinned there and in the file). The archive's reference columns were
rejected by the TAP service and not retrieved, so **no per-planet source paper is recorded**; the archive's
terms page could not be read from the machine that fetched the data, so the rights record is *a public archive,
credited, terms page not read* (D-R10-230-03), and the page cites the archive. Only separations, angular sizes
and the archive's temperature column are used; **no contrast number is typed**. For these planets the
temperature column is mostly far above the irradiation equilibrium (52 of the 75 rows with a temperature and a
star exceed twice it), which is why the lesson does not draw them as irradiated planets.

## Domain, assumptions and limits

Blackbody planet and star; a Lambert sphere with a stated geometric albedo; a circular orbit; the star a point
at distance `d`; the contrast a flux ratio of the unresolved bodies. Not covered: speckle and atmospheric
residuals, non-Lambert phase functions, eccentric-orbit phase and separation, a planet's own spectrum (an
imaged planet is drawn as a blackbody at the archive's temperature, which leaves out molecular bands, clouds and
cooling with age), unresolved companions, and anything about the planets that exist: the imaged planets are the
ones that can be imaged (wide, massive, young). The separation of an imaged planet is its semi-major axis over
the distance, not the projected separation of any epoch.

## Results

`npm run imaging:validate` runs every leg (under a second); `-- --write-results` rewrites
`tests/fixtures/imaging/results.json` and `failed-legs.json`.
19 bounded legs pass, none crossed its bound, two are reports with no bound (A8, E1) and one is NOT RUN (E2).

| Leg | Result |
| --- | --- |
| A1 to A7, analytic | reflected contrast equals `A_g (Rp/a)^2` to 0; Lambert phase function exact to 4e-17 and non-increasing; the Rayleigh-Jeans limit at 0.1 m within 2.7e-4 (bound 1e-3); the bolometric limit to 2e-15; the equilibrium temperature to 2e-16 and `a -> 2a` divides it by `sqrt 2`; one AU at one parsec is one arcsecond to 8e-12; lambda / D exact, Rayleigh ratio 1.2197, `isInnerWorkingAngle` false |
| A8, report | Earth around the Sun at ten parsecs: 0.100 arcsecond; lambda / D at 550 nm is 0.454, 0.047, 0.019, 0.014 and 0.0038 arcsecond for 0.25, 2.4, 6, 8 and 30 m; reflected contrast 5.45e-10 at full phase with A_g 0.3 (the lessons use A_g 0.204 from the Bond albedo of the atmospheres table), thermal 5.9e-8 at 10 micrometres |
| B1 to B5, oracle | the kernel agrees with the independent implementation to 5e-16 (monochromatic, reflected, equilibrium, three 61-point contrast curves) and to 9e-10 in a band (the kernel's Simpson against scipy's adaptive quadrature) |
| B6 | the observability verdict agrees with the oracle's own rule in 200 of 200 cases |
| C1 | the invariants (total = thermal + reflected, reflected non-increasing in phase angle, thermal increasing in temperature, separation increasing in `a` and decreasing in `d`) hold for 500 of 500 seeded systems |
| D1 to D5 | inside the working angle, below the floor, no working angle stated, non-physical input and the self-luminous flag all behave as committed, in 100 percent of their cases |
| E1, report | 98 rows; 91 with a distance and an axis; outside the example working angles (separation only): 49, 84, 91 and 91 of the 91 for the four instruments; 52 of 75 rows exceed twice their irradiation equilibrium |
| E2, NOT RUN | no published contrast table and no cited coronagraph working angle were supplied; nothing was typed from memory |

The oracle is an independent implementation (astropy's constants, its own Planck function, scipy quadrature, the
Lambert phase function and the observability rule written from the contract). It shares the contract's definitions
and is not a cited code's output; astropy.modeling's `BlackBody` could not be used because it does not import in
the environment (no PyYAML), amendment AM2. Agreement at machine precision is the expected result of two
implementations of the same formulas, so the legs hold the formulas and the code, not the physical modeling
choices (blackbody planet, Lambert reflection); those are the lesson's stated assumptions.

## Validation contract

`tests/fixtures/imaging/thresholds.json` fixed every definition, every default and every bound of the checks
below before `js/kernels/imaging/`, the oracle script, the validator, any panel or lesson existed, and before any
output of the kernel or the oracle was inspected. A crossed bound is a failed check, kept failing in
`tests/fixtures/imaging/failed-legs.json`; only Carl resets one. Amendments are appended to the file's
`amendments` list with their reason (AM1 a wording fix in A5, AM2 the oracle's Planck function) and the original
bound stays.

| Leg | What it holds |
| --- | --- |
| a, analytic | the closed forms above, the angle of one AU at one parsec, lambda / D |
| b, oracle | an independent implementation on pinned cases (60 monochromatic, 40 band, 60 reflected, 40 equilibrium, three contrast curves, 200 observability cases) |
| c, ensemble coverage | **not applicable**: the kernel returns point values and makes no interval or coverage claim; C1 is an ensemble of invariants, not coverage |
| d, refusals | inside the working angle, below the floor, no working angle stated, non-physical input, the self-luminous flag |
| e, authentic | the pinned archive table's separations and angular sizes; no published contrast compared (NOT RUN) |

## References

Lambert-sphere phase function and phase integral: Russell 1916, as cited by the atmospheres kernel (ATMOSPHERES.md);
Cowan and Agol 2011 (ApJ 729, 54) for the redistribution factor. NASA Exoplanet Archive: https://exoplanetarchive.ipac.caltech.edu/ (credit requested; terms
page not read here). The diffraction scale and the Rayleigh angle are those of TELESCOPES.md (Prompt 208). No
published coronagraph specification and no published contrast for an imaged planet is used.
