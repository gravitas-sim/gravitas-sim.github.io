# Stellar structure (Roadmap II, Prompt 95)

A validated kernel, three instruments and three investigations on the interiors of stars: Lane-Emden polytropes, homology scaling set against the MIST zero-age models, and the white-dwarf mass-radius relation with its limit.

## The kernel (`js/kernels/stellar/`)

Pure modules, no DOM and no clock; SI inside. The solar and gravitational constants are the application's own (so a star is the same size everywhere in Gravitas); the other constants are CODATA 2018. The application's solar mass differs from GM/G by 0.03 percent, which is below every tolerance here.

| Module | What it holds | Held to |
|---|---|---|
| `polytrope.js` | `solvePolytrope` (Lane-Emden by RK4 from a series start at small xi; the surface by bisection on the last step), `polytrope` (memoized), `polytropeTable`, `analyticTheta` (n = 0, 1, 5), `indexFromConcentration` | Chandrasekhar's 1939 table as reproduced by Horedt (2004) for n = 0 to 4.5 in steps of one half: xi1, the dimensionless mass and the central-to-mean density ratio, each to 2 x 10^-5; the closed forms of n = 0 and 1 to 1e-9 along the whole profile; n = 5 from the closed form (infinite radius, mass sqrt 3), which satisfies the equation to finite-difference accuracy; halving the step moves xi1 by under 1e-8 |
| `star.js` | `polytropeStar` (central density, pressure, temperature, K from M, R, n and mu), `polytropeProfile`, `interiorOf` (the polytrope that goes with a Stellar Lab star, or why none does) | Eddington's standard model of the Sun: 76.4 g/cm3, 1.245e16 Pa and 1.18e7 K (mu 0.6) to 0.5 to 1 percent; the n = 0 central pressure 3GM^2/(8 pi R^4) exactly |
| `homology.js` | `homologyExponents` for any opacity law (a, b) and energy law (lambda, nu), `structureScaling`, `nuclearTimescaleYr`, `kelvinHelmholtzYr`, `dynamicalSeconds`, `zeroAgeModels` (the eight MIST tracks' zero-age states through `mainSequenceAt`), `fitPowerLaw` | the textbook exponents (3 for electron scattering, 5.5 and mu^7.5 for Kramers); the radius exponent satisfies both luminosity laws at once for every pair; the Sun's 10.4 Gyr, 31 Myr and 1,593 s; the MIST luminosity exponent 3.16 over 2 to 40 solar masses against the predicted 3 |
| `whiteDwarf.js` | Chandrasekhar's `degeneratePressure`, `degenerateDensity`, `fermiX`, `whiteDwarf` (integration in q = x^2, regular at the surface), `massRadiusCurve`, `chandrasekharMassSun` (closed form from the n = 3 polytrope), `centralXForMass` | the equation of state's two limits (8/5 A x^5 and 2 A x^4); at x = 10^4 the integrated mass is within 2e-4 of the closed-form limit 1.4559 and below it, and within 0.3 percent of Chandrasekhar's 5.836/mu_e^2; at low density M R^3 matches the n = 3/2 polytrope's constant to 3 percent |
| `workerCore.js`, `worker.js`, `client.js` | the Worker protocol (a table, a profile, the white-dwarf curve), the Worker, and the page's client (the same handler runs in place without a Worker) | a Worker played in-process answers the same numbers as the direct call |

The limit is not put in: nothing in the integration contains 1.4. The mass rises with the central density toward the limit the n = 3 closed form gives, and the instrument shows the curve approaching it.

## Assumptions (stated on screen and on the model page)

Polytropes have no energy generation, opacity or convection; they are shapes, and the index says how centrally condensed the star is. The temperature is for an ideal gas at mu = 0.6 and fails above about ten solar masses, where radiation pressure matters. Homology assumes one opacity law and one reaction throughout every star; the exponents are right where one dominates and the residuals show where it does not. The white dwarf is a cold, ideal, degenerate electron gas with ions supplying only the mass: no Coulomb corrections, composition layers, temperature, general relativity or the instabilities that end a real dwarf below the limit, so its radius is about 3 percent larger than the best published relations at 0.6 solar masses.

## The instruments (`js/interiorsWidgets.js`, family `interiors`, lazy)

`polytrope`, `wd-mass-radius`, `ms-scaling`. The white-dwarf curve is requested from the Worker when the family loads; until it answers, and wherever there is no Worker, the same function runs in place. Every number a lesson asks for is a readout row. The Stellar Lab's star card has a row, "Interior (a model)", that names the polytrope for a main-sequence star (n = 3/2 below 0.35 solar masses, n = 3 above), points to the white-dwarf model for a white dwarf, and says why none fits a giant.

## The investigations

Inside a Star (hydrostatic equilibrium, the polytrope, why the center is hot, the index as concentration), Scaling the Main Sequence (homology exponents against the MIST zero-age models, residuals, where the assumptions fail, a nuclear clock), The Limit (white-dwarf mass and radius, why heavier is smaller, the limit and how it depends on composition). English and Spanish, three depths each.

## Observed white dwarfs

None ships. A public compilation of white-dwarf masses and radii was not downloaded and its terms of use could not be confirmed in this run, so the prompt's "if rights allow" condition was not met: the mass-radius panel shows the model only. See D-STELLAR-01 in the decision register.

## Not done

A comparison of the model curve with observed white dwarfs (needs the data); radiation pressure in the polytrope's temperature; the mass-radius relation with Coulomb or finite-temperature corrections; convection or a nuclear network (the prompt's model-page section says what these would add).
