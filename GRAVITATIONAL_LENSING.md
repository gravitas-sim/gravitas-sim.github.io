# Gravitational lensing (Roadmap II, Prompt 94)

A validated kernel, three instruments and three investigations on light deflection, strong-lensing geometry and microlensing.

## The kernel (`js/kernels/lensing/`)

Pure modules, no DOM and no clock; SI inside, with `ARCSEC` and `MAS` for what a reader sees.

| Module | What it holds | Held to |
|---|---|---|
| `lens.js` | `deflectionAngle` (4GM/(c²b)), `einsteinAngle`, `sisEinsteinAngle`, their inverses, `pointImages` (y = x - 1/x), `sisImages` (y = x - sign x), `pointTimeDelay` | the Sun's limb 1.75 arcsec (the app's constants give 1.7517; the tolerance is 0.01); theta_E squared = kappa M pi_rel with kappa 8.14 mas per solar mass (Gould 2000), 1.009 mas for 1 Msun at 4 kpc before 8; 4 pi (200 km/s / c)² = 1.153 arcsec; both images solve the lens equation to rounding; mu+ + mu- = 1; the delay equals the Fermat-potential difference at the two images to 1e-12 |
| `microlensing.js` | the Paczynski curve, blending (F = fs A + 1 - fs), a uniform finite source by ring integration, `timescale`, `massForTimescale` | A(1) = 3/sqrt 5; the finite-source value at u = 0 is sqrt(rho² + 4)/rho to 1e-12; an independent brute-force average of the disk to 2e-3 (the grid cannot resolve the 1/r point); the limit rho to 0; a typical bulge event of 0.3 Msun at 6 kpc and 200 km/s crosses in 16.6 days |
| `fit.js` | `MICROLENSING_MODEL` for the inference core's `createProblem` and `refine`, `fitMicrolensing` (multi-start; source and blend fluxes solved exactly), `syntheticEvent` | 30 seeds: pulls of t0, u0 and tE have mean within 0.5 and spread between 0.7 and 1.4, chi-square per point near 1; with the blend free in a blended event the pulls are still unit normal and tE is at least 1.5 times less certain than with the blend held; holding the blend at none for a blended event leaves chi-square per point above 2 and a tE biased by more than 5 sigma |

`js/forward/models/microlensing.js` is the ninth forward model: a state with the event's own parameters or a lens geometry gives a `gravitas.observation` time series labeled synthetic, with a truth manifest naming `t0`, `u0`, `tE` as fit parameters, so the inference core's names match.

## Assumptions (stated on screen and on the model page)

Thin lens; weak field (the Bending Light instrument shades the region within ten Schwarzschild radii and says when the formula cannot be trusted); a point mass or a circular singular isothermal sphere; Euclidean distances with the source at twice the lens distance in the lens plane (and 8 kpc for the Galactic microlensing geometry); no external shear, ellipticity or second lens plane; a uniform source disk; no limb darkening, parallax, lens orbital motion, binary lens or second source. The time delay is computed for the point mass only.

## The instruments (`js/lensingWidgets.js`, family `lensing`, lazy)

`light-bending`, `lens-plane`, `lens-passing`. A pointer-draggable source was not built: the widget framework has no pointer hook, and the source offset is a labeled slider that works from the keyboard. The picture is never the only place a value is: every number a lesson asks for is a readout row.

## The investigations

Bending Light (the Sun's 1.75 arcseconds, scaling, the 1919 plates, where the formula fails), Einstein Rings and Arcs (a star's ring, a galaxy's ring, weighing a galaxy by its ring, off-axis images for a point mass and an isothermal sphere, why arcs), A Lens Passing By (the peak, the crossing time, the mass-distance-speed degeneracy, blending, a finite source; the advanced depth fits a synthetic event with the blend free and held). English and Spanish, three depths each.

## Authentic data

None ships. The OGLE and MOA public event light curves were not downloaded and their terms of use were not confirmed in this run, so the prompt's stop condition applies: the lesson ships synthetic-only, labeled, with the truth in the lesson file and the fit in the instrument. See D-LENS-01 in the decision register. By Carl's instruction of 2026-10-11 (D-RIGHTS-02) the survey data is linked and never bundled: the lessons stay on the labeled synthetic event, and the model page's "Survey archives" section (`model/index.html#survey-archives`) carries the links and the citation text. OGLE: https://ogle.astrouw.edu.pl/ogle4/ews/ews.html (cite Udalski et al. 2015, Acta Astron. 65, 1, with the web address; the page asks to be contacted before publication use); MOA: https://moaprime.massey.ac.nz/alerts (no citation request found; reference Bond et al. 2001, MNRAS 327, 868); ASAS-SN: https://asas-sn.osu.edu/ (cite Shappee et al. 2014, ApJ 788, 48 and Kochanek et al. 2017, PASP 129, 104502). Read 2026-10-11.

## Not done

A published-fit comparison for a named event (needs the data); an Observatory entry for the microlensing synthetic observation beyond the generic forward-model path; an SIS time delay; binary lenses and parallax.
