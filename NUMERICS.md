# Numerical routines

`js/numeric/` holds five small modules of numerical routines, each with a
contract and a named consumer: root finding on a bracket, quadrature,
interpolation on a table, small dense linear algebra and a polynomial
least-squares fit. Prompt 152 extracts only what the first consumers of
Roadmap III need, validates each routine against closed forms, independent
methods and published test problems, and moves the two consumers that are proved
bit for bit onto them: `js/kernels/cosmology/flrw.js` onto `quadrature.js` and
`js/inference/fit.js` onto `linalg.js`. The first-visit ceiling rose by 2,300
bytes for it (see "Costs and waits"). The decision is D-R10-28 in
`DECISION_REGISTER.md`.

It is not a numerical library. The integrators of the Sandbox, the 3-D kernel
and the mission core, the period searches (D-KERNEL-06) and the periodogram
family stay where they are, because their contracts differ and a consolidation
needs a proof of identical outputs and a measured reason. Each consumer imports
the one module it needs; there is no index and no re-export.

## The routines

<!-- numeric-routines:begin -->

| Module | Export | Contract | Consumer |
| --- | --- | --- | --- |
| `roots.js` | `brent` | Zero of a continuous f on a bracket with a sign change (RangeError without one); bracket under 2 eps abs(x) + xTol/2 at stop; at most maxIter evaluations; converged says which | 200, 227 |
| `roots.js` | `newton` | Newton with df; with `bracket` a step that leaves it or fails to halve the last is bisected, so it cannot diverge; without one, plain Newton, converged false on a zero or non-finite step | 200, 227 |
| `quadrature.js` | `gaussLegendre` | Composite 16-point Gauss-Legendre, `panels` equal panels, exact for degree 31 per panel; the rule and the arithmetic of `js/kernels/cosmology/flrw.js` | 255, 200 |
| `quadrature.js` | `adaptive` | Panels bisected until one panel and its halves agree to max(absTol, relTol abs(whole)), halved per split; value, an error estimate (not a bound), evaluations, converged; cannot see a feature narrower than its first panel's node spacing | 200 |
| `interp.js` | `locate` | Index i in [0, n - 2] with xs[i] <= x < xs[i + 1]; the end intervals serve x outside | 219, 255 |
| `interp.js` | `linear` | Piecewise-linear on a table; outside it clamps, extrapolates or gives NaN; NaN in, NaN out | 219, 255 |
| `interp.js` | `cubicSpline` | C2 cubic spline, natural or clamped (end slopes d0, d1); `at` and `slope`; a bad table is a RangeError when it is built; fourth order when clamped | 219, 255 |
| `linalg.js` | `cholesky` | Lower factor of a symmetric positive-definite matrix, or null | 154, 256 |
| `linalg.js` | `solveSpd` | A x = b for symmetric positive-definite A, or null; `js/inference/fit.js`'s routine, operation for operation | 154, 256 |
| `linalg.js` | `invertSpd` | The inverse of a symmetric positive-definite matrix, or null; fit.js's, operation for operation | 154, 256 |
| `linalg.js` | `solve` | A x = b for any square A by elimination with partial pivoting; null when a pivot is not above n eps times the largest entry, or the answer is not finite | 154, 256 |
| `linalg.js` | `inverse` | The inverse of any square matrix through `solve`, or null | 154, 256 |
| `linalg.js` | `eigenSymmetric` | Eigenvalues and unit eigenvectors of a symmetric matrix by cyclic Jacobi, largest first (2 x 2 and 3 x 3 are the cases asked for); fit.js's, operation for operation; the stop test is absolute (1e-30), so scale first | 154, 256 |
| `polyfit.js` | `polyfit` | Weighted polynomial least squares by Householder QR in the scaled variable t = (x - center)/halfWidth; coefficients in t, covariance, chi-square, `at`; RangeError for too few or non-finite data, null for a rank-deficient design | 213 |

<!-- numeric-routines:end -->

Units: none. Every routine is dimensionless and works in the caller's units;
the caller owns the unit (`js/units.js`) and the conversion. Determinism: none
draws a random number and none reads a clock; `roots.js`, `polyfit.js` and the
linear algebra use only `+ - * /`, `abs` and `sqrt`, so the same function and
data give the same answer on every Node. The quadrature and the spline call no
transcendental function themselves; a transcendental integrand differs between
Node 20 and Node 24 in the last bit, and so does the integral (the cosmology
kernel's tests already say so). Convergence and tolerances are in each
routine's header and in the table above; every refusal is a RangeError or a
null, never a number.

## What was in the tree, and what was decided

The candidate table of the contract's first step. "Compatible" means the same
operations in the same order, so an adopter's outputs keep every bit; where the
algorithms differ the difference changes bits on near-singular or hard inputs,
and nothing here claims otherwise.

| Candidate | Consumer prompts | In the tree today | Contracts compatible? | Decision |
| --- | --- | --- | --- | --- |
| Brent root finding | 200, 227 | none that is bracketed and general: `js/kernels/sky/events.js` `bisect` (40 fixed halvings, tolerance in seconds), `js/cr3bp.js` `collinearPoints` (bisection to machine width), `js/kernels/sky/solar.js` `solveAngle` | no: fixed iteration counts and stopping rules that pin their kernels' outputs | extract; the existing ones stay in their domains |
| Newton with a bracket | 200, 227 | `solveKepler` in `js/orbital.js` and `js/lab3d/elements.js` (a fixed tolerance; `elements.js` is a source of the instructor bundle) | no: different tolerance, and one is in the bundle's closure | extract; the Kepler solvers stay (D-R10-18, D-R10-25) |
| Linear interpolation on a table | 219, 255 | value lerps only (`js/utils.js` clamps t, `js/bodyDrawSky.js`, `js/stellar/tracks.js`), `js/rvSurvey.js` `interpolate`, `js/lab3d/snapshot.js` `interpolate` (state Hermite) | no: they blend two values, they do not look a table up | extract the table form; the lerps stay |
| Cubic spline | 219, 255 | none | n/a | extract |
| Composite Gauss-Legendre | 255, 200 | `js/kernels/cosmology/flrw.js` `gl` (the tables and the panel arithmetic); `js/kernels/lensing/microlensing.js` `gauss` (one panel; the midpoint is (a + b)/2 where flrw's is a + 0.5(b - a), so one ulp of the node differs) | flrw.js: identical, proved; microlensing.js: one ulp, not proved | extract from flrw.js; flrw.js adopted; microlensing.js waits for a bounded difference |
| Adaptive quadrature | 200 | none (`js/kernels/radiation/photometry.js` `integrate` is a trapezoid over a tabulated band: data, not a function) | n/a | extract; the trapezoid stays |
| Cholesky, SPD solve and inverse, Jacobi eigenvalues | 154, 256 | `js/inference/fit.js` `solveSpd`, `invertSpd`, `eigenSymmetric` (the authority) | identical, proved | extract; fit.js adopted |
| General solve and inverse | 154, 256 | `js/kernels/galactic/motion.js` `solve` and `invert` (elimination, the same operation order as `solve` here, no singularity test: unproved), `js/kernels/variables/fit.js` `invertAndSolve` (Gauss-Jordan), `js/kernels/detector/lightcurve.js` `invert3` (cofactors), `js/inference/rvCircular.js` and `js/inference/infer.js` `solve3` (an in-place elimination with a 1e-14 test; Cramer with a 1e-300 test) | no for four of the five: different algorithms and singularity contracts | extract the elimination; the five stay until a consumer shows a measured reason |
| Polynomial least squares | 213 | none (`js/kernels/variables/fit.js` `harmonicFit` is a Fourier series; the Observatory's models are in `js/inference/`) | n/a | extract (QR, because the normal equations square the condition number) |
| Fast Fourier transform | 221 | none | n/a | not extracted: 221 adds it with its own validation, if its gate passes |
| Integrators (Sandbox, 3-D kernel, mission core) | none | `js/engine/`, `js/lab3d/`, `js/mission/` | no: different contracts | not extracted |
| Periodograms and period searches | none | the variables kernel's GLS, `js/measure/periodogram.js` | n/a | not extracted (D-KERNEL-06); a consolidation needs a proof of identical outputs and a measured reason |

### The delta table (7.5.9)

| Area | Existing authority | Missing behavior | Adopter | Duplication removed |
| --- | --- | --- | --- | --- |
| Symmetric linear algebra | `js/inference/fit.js` | `cholesky` as an export, a general `solve`/`inverse`, an eigensolver that is not private | 154, 256 (statistics, combined contours); `fit.js` itself | `fit.js`: its three routines (738 B gzipped) |
| Quadrature | `js/kernels/cosmology/flrw.js` | an exported rule, adaptive refinement | 255, 200; `flrw.js` itself | `flrw.js`: its tables and rule (407 B gzipped) |
| Root finding | none | a bracketed solver | 200, 227 | none |
| Interpolation | none | table lookup and a spline | 219, 255 | none |
| Polynomial fit | none | a stable polynomial least-squares fit | 213 | none |

## Validation

Seeded, deterministic, written before the routines were run
(`tools/numeric-cases.mjs`; `npm run validate:numeric` prints the table and
`--write` puts it below; `tests/numericRoutines.test.js` runs the same cases in
the suite). The five kinds the validation contract (7.5.8) asks of a kernel:

- **Analytic**: closed forms the routines do not compute (square roots,
  Kepler's equation as a residual, the Hilbert matrix's integer inverse,
  second-difference eigenvalues, exact polynomials, the convergence order of
  each interpolant).
- **Oracle**: the code a routine would replace, compared bit for bit in one
  process (`tests/fixtures/numericLegacy/` holds verbatim copies of fit.js's
  symmetric routines and flrw.js's rule at 2a6ce1c5, so the proof outlives the
  day a consumer adopts the module; the live `fit.js` and the live cosmology
  kernel are compared too); independent methods written in the cases (plain
  bisection, composite Simpson, the quadratic and trigonometric eigenvalue
  formulas, the normal equations, the straight-line formula, replication for
  weights); and the spline's defining conditions.
- **Ensemble**: seeded random problems against a bound stated beforehand (two
  thousand cubics, a thousand polynomials, three hundred smooth functions
  against the classical clamped-spline bound, five hundred linear systems, a
  thousand noisy datasets with the coverage of the stated covariance).
- **Negative**: every refusal, and the limits the routines state (an adaptive
  rule that misses a peak narrower than its first panel's spacing and says it
  converged; plain Newton diverging where the bracketed one does not).
- **Authentic**: published test problems (the Wien, Planck and omega
  constants, the Stefan-Boltzmann integral, K(m = 0.5), Wilkinson's W21+, the
  NIST StRD Wampler 1 and 2 datasets, the cosmology kernel's own distance
  table).

Two engines: CI runs Node 20 and a Mac runs Node 24, and `Math.log`, `exp`,
`cos`, `sin`, `atan` and `**` with a non-integer exponent differ in the last
bit between them. Nothing stores a digest or a golden of a value that passes
through one of them; every bit comparison is of two code paths in one process,
every closed form is held to a tolerance orders above an ulp, and the only seeded
draws are mulberry32's integer arithmetic. Three of the first run's results
were corrected, and are stated so that no bound looks fitted: Newton's safeguard
lost accuracy at the rounding floor of a near-double root (a step smaller than
half an ulp of x counted as leaving the bracket and sent the iteration to
bisection: 53 evaluations and a residual of 4e-14, now 7 and under 1e-15), which
was a bug in the routine and is fixed there; one expected value in I1 was wrong
(the clamped end value is 7, not 1); and P6 first asked for a relative error
point by point at y = 1 of a fit whose data reach 3.2e6, which least squares does
not promise (the error is bounded in norm), so it asks for a bound relative to the
largest y, which the routine meets by five orders.

<!-- numeric-validation:begin -->

| Case | Kind | Measure | Value | Bound | |
| --- | --- | --- | --- | --- | --- |
| **R1** Brent on functions with a known root | analytic | x^2 - 2 | 1.414 | 1.414 ± 1e-13 | pass |
|  |  | Wallis cubic | 2.095 | 2.095 ± 1e-13 | pass |
|  |  | sin x near pi | 3.142 | 3.142 ± 1e-13 | pass |
|  |  | x^9 at 0 | -1e-14 | 0 ± 1e-11 | pass |
|  |  | x^9 converged | 1 | = 1 | pass |
|  |  | root at an end, iterations | 0 | = 0 | pass |
|  |  | root at an end, x | 0 | = 0 | pass |
| **R2** Newton: the square root of two, and the speed of the convergence | analytic | sqrt 2 | 1.414 | 1.414 ± 1e-15 | pass |
|  |  | iterations | 5 | 0 ± 6 | pass |
|  |  | bracketed, sqrt 2 from a start outside | 1.414 | 1.414 ± 1e-12 | pass |
| **R3** Kepler's equation as a residual | analytic | brent residual | 4e-15 | 0 ± 1e-14 | pass |
|  |  | bracketed newton residual | 9e-16 | 0 ± 1e-14 | pass |
| **R4** Brent against plain bisection, and against bracketed Newton | oracle | brent vs bisection | 5e-14 | 0 ± 2e-12 | pass |
|  |  | brent vs bracketed newton | 5e-14 | 0 ± 2e-12 | pass |
|  |  | brent iterations on cos x - x | 7 | 0 ± 12 | pass |
|  |  | bisection steps on the same bracket | 40 | = 40 | pass |
| **R5** Two thousand seeded cubics | ensemble | cubics used | 1 | = 1 | pass |
|  |  | roots outside the bound | 0 | = 0 | pass |
| **R6** What the root finders refuse or report | negative | brent, no sign change, RangeError | 1 | = 1 | pass |
|  |  | brent, NaN at an end, RangeError | 1 | = 1 | pass |
|  |  | newton bracket, no sign change, RangeError | 1 | = 1 | pass |
|  |  | brent, 3 iterations allowed, converged | 0 | = 0 | pass |
|  |  | newton at a stationary point, converged | 0 | = 0 | pass |
|  |  | plain newton on atan from 3, converged | 0 | = 0 | pass |
|  |  | bracketed newton on atan from 3 | 0 | 0 ± 1e-10 | pass |
|  |  | bracketed newton on atan, converged | 1 | = 1 | pass |
| **R7** Roots of three physical equations, to published digits | authentic | Wien displacement root | 4.965 | 4.965 ± 1e-13 | pass |
|  |  | Planck frequency-peak root | 2.821 | 2.821 ± 1e-13 | pass |
|  |  | omega constant | 0.5671 | 0.5671 ± 1e-13 | pass |
|  |  | Dottie number | 0.7391 | 0.7391 ± 1e-13 | pass |
| **Q1** Gauss-Legendre on integrals with a closed form | analytic | sin on [0, pi] | 2 | 2 ± 1e-14 | pass |
|  |  | e^x on [0, 1] | 1.718 | 1.718 ± 1e-15 | pass |
|  |  | x^31 on [0, 1] | 0.03125 | 0.03125 ± 1e-15 | pass |
|  |  | Runge function, 8 panels | 0.5494 | 0.5494 ± 1e-13 | pass |
|  |  | reversed limits | -2 | -2 ± 1e-14 | pass |
|  |  | zero width | 0 | = 0 | pass |
|  |  | Einstein-de Sitter in u = ln(1 + z), relative | 1 | 1 ± 1e-14 | pass |
| **Q2** Adaptive Gauss-Legendre reaches its tolerance and says so | analytic | 4/(1 + x^2) | 3.142 | 3.142 ± 1e-9 | pass |
|  |  | 4/(1 + x^2) converged | 1 | = 1 | pass |
|  |  | e^-x on [0, 10] | 1 | 1 ± 1e-9 | pass |
|  |  | sqrt(x) on [0, 1] | 0.6667 | 0.6667 ± 1e-8 | pass |
|  |  | narrow peak, split at it | 2e-3 | 2e-3 ± 1e-10 | pass |
| **Q3** Bit for bit against the cosmology kernel's own rule | oracle | rule vs flrw.js gl, results differing in a bit | 0 | = 0 | pass |
|  |  | kernel distances, times and age, differing in a bit | 0 | = 0 | pass |
|  |  | results compared | 197 | = 197 | pass |
| **Q4** Against composite Simpson, an independent rule | oracle | gaussLegendre, 8 panels, relative | 1e-14 | 0 ± 1e-12 | pass |
|  |  | adaptive, relative | 1e-14 | 0 ± 1e-12 | pass |
| **Q5** Random polynomials, exact, and random oscillations, covered | ensemble | polynomials outside 1e-14 of their scale | 0 | = 0 | pass |
|  |  | oscillations outside 10 x error + 1e-13 | 0 | = 0 | pass |
|  |  | oscillations that needed a split (the test is not vacuous) | 1 | = 1 | pass |
| **Q6** What adaptive quadrature cannot see, and says | negative | NaN integrand, converged | 0 | = 0 | pass |
|  |  | step, converged | 0 | = 0 | pass |
|  |  | step, value | 0.3333 | 0.3333 ± 1e-5 | pass |
|  |  | missed peak, value | 8e-183 | 0 ± 1e-12 | pass |
|  |  | missed peak, converged (true: it cannot know) | 1 | = 1 | pass |
| **Q7** Three integrals with published values | authentic | Stefan-Boltzmann integral, relative to pi^4/15 | 1 | 1 ± 1e-9 | pass |
|  |  | Gaussian integral | 1.772 | 1.772 ± 1e-12 | pass |
|  |  | K(m = 0.5) | 1.854 | 1.854 ± 1e-12 | pass |
| **I1** Lines and cubics are reproduced; the interval search | analytic | linear on a line | 9e-16 | 0 ± 1e-12 | pass |
|  |  | extrapolate beyond the end | 10 | 10 ± 1e-12 | pass |
|  |  | clamp beyond the end | 7 | = 7 | pass |
|  |  | natural spline on a line | 9e-16 | 0 ± 1e-12 | pass |
|  |  | clamped spline on a cubic | 4e-15 | 0 ± 1e-11 | pass |
|  |  | clamped spline slope on a cubic | 9e-15 | 0 ± 1e-10 | pass |
|  |  | locate, wrong answers | 0 | = 0 | pass |
| **I2** Convergence order: 2 for linear, 4 for the clamped spline | analytic | linear, 11 to 21 nodes | 1.984 | 2 ± 0.3 | pass |
|  |  | linear, 21 to 41 nodes | 1.996 | 2 ± 0.3 | pass |
|  |  | clamped spline, 11 to 21 nodes | 4.013 | 4 ± 0.5 | pass |
|  |  | clamped spline, 21 to 41 nodes | 4.003 | 4 ± 0.5 | pass |
| **I3** The spline against its defining conditions and a second evaluation | oracle | values at the nodes | 0 | 0 ± 1e-12 | pass |
|  |  | slope jump across interior nodes | 4e-9 | 0 ± 1e-8 | pass |
|  |  | end curvature | 1e-6 | 0 ± 1e-4 | pass |
|  |  | coefficient form vs the evaluation | 9e-16 | 0 ± 1e-12 | pass |
| **I4** Three hundred seeded smooth functions against the classical bound | ensemble | points outside the bound | 0 | = 0 | pass |
|  |  | worst error as a fraction of the bound | 0.2488 | 0.1 ± 0.9 | pass |
| **I5** Tables the routines refuse, and the end conditions | negative | decreasing x | 1 | = 1 | pass |
|  |  | repeated x | 1 | = 1 | pass |
|  |  | length mismatch | 1 | = 1 | pass |
|  |  | NaN y | 1 | = 1 | pass |
|  |  | one point | 1 | = 1 | pass |
|  |  | NaN query, linear | 1 | = 1 | pass |
|  |  | outside a table, nan mode | 1 | = 1 | pass |
|  |  | two points, at the middle | 3 | 3 ± 1e-15 | pass |
|  |  | two points, slope | 2 | 2 ± 1e-15 | pass |
| **I6** The cosmology kernel's distances, tabulated and interpolated | authentic | relative error of the interpolated distance | 9e-6 | 0 ± 2e-5 | pass |
| **L1** The Hilbert matrix and its exact integer inverse | analytic | n = 3, invertSpd | 2e-15 | 0 ± 1e-11 | pass |
|  |  | n = 3, inverse | 4e-15 | 0 ± 1e-11 | pass |
|  |  | n = 3, solveSpd columns | 2e-15 | 0 ± 1e-11 | pass |
|  |  | n = 3, solve columns | 4e-15 | 0 ± 1e-11 | pass |
|  |  | n = 4, invertSpd | 1e-13 | 0 ± 3e-10 | pass |
|  |  | n = 4, inverse | 1e-13 | 0 ± 3e-10 | pass |
|  |  | n = 4, solveSpd columns | 1e-13 | 0 ± 3e-10 | pass |
|  |  | n = 4, solve columns | 1e-13 | 0 ± 3e-10 | pass |
|  |  | n = 5, invertSpd | 2e-12 | 0 ± 1e-8 | pass |
|  |  | n = 5, inverse | 4e-13 | 0 ± 1e-8 | pass |
|  |  | n = 5, solveSpd columns | 2e-12 | 0 ± 1e-8 | pass |
|  |  | n = 5, solve columns | 4e-13 | 0 ± 1e-8 | pass |
|  |  | n = 6, invertSpd | 9e-11 | 0 ± 3e-7 | pass |
|  |  | n = 6, inverse | 1e-10 | 0 ± 3e-7 | pass |
|  |  | n = 6, solveSpd columns | 9e-11 | 0 ± 3e-7 | pass |
|  |  | n = 6, solve columns | 1e-10 | 0 ± 3e-7 | pass |
| **L2** Small eigenvalue problems with closed forms, and an exact factor | analytic | 2 x 2, larger | 3 | 3 ± 1e-14 | pass |
|  |  | 2 x 2, smaller | 1 | 1 ± 1e-14 | pass |
|  |  | 3 x 3, 2 + sqrt 2 | 3.414 | 3.414 ± 1e-13 | pass |
|  |  | 3 x 3, 2 | 2 | 2 ± 1e-13 | pass |
|  |  | 3 x 3, 2 - sqrt 2 | 0.5858 | 0.5858 ± 1e-13 | pass |
|  |  | 3 x 3, A v - lambda v | 9e-16 | 0 ± 1e-13 | pass |
|  |  | 3 x 3, |v| - 1 | 2e-16 | 0 ± 1e-13 | pass |
|  |  | Cholesky factor, entries differing | 0 | = 0 | pass |
| **L3** Bit for bit against js/inference/fit.js, the authority | oracle | solveSpd and invertSpd vs the fixture, differing in a bit | 0 | = 0 | pass |
|  |  | solveSpd and invertSpd vs live fit.js, differing in a bit | 0 | = 0 | pass |
|  |  | eigenSymmetric vs the fixture, differing in a bit | 0 | = 0 | pass |
|  |  | numbers compared (a count, so the test is not empty) | 1 | = 1 | pass |
| **L4** Eigenvalues against closed forms, and two solvers against each other | oracle | 2 x 2 eigenvalues vs the quadratic formula | 3e-15 | 0 ± 1e-11 | pass |
|  |  | 3 x 3 eigenvalues vs the trigonometric formula, of the norm | 6e-16 | 0 ± 1e-12 | pass |
|  |  | solve vs solveSpd, relative | 2e-15 | 0 ± 1e-9 | pass |
|  |  | well-conditioned systems compared | 1 | = 1 | pass |
| **L5** Five hundred seeded systems: residuals, inverses, reconstructions | ensemble | solve and solveSpd residuals outside the bound | 0 | = 0 | pass |
|  |  | A times its inverse outside the bound | 0 | = 0 | pass |
|  |  | eigen-decompositions outside 1e-12 | 0 | = 0 | pass |
| **L6** Matrices the routines must refuse | negative | cholesky, indefinite | 1 | = 1 | pass |
|  |  | solveSpd, indefinite | 1 | = 1 | pass |
|  |  | invertSpd, semidefinite | 1 | = 1 | pass |
|  |  | solve, rank one | 1 | = 1 | pass |
|  |  | inverse, rank one | 1 | = 1 | pass |
|  |  | solve, singular in floating point | 1 | = 1 | pass |
|  |  | solve, NaN entry | 1 | = 1 | pass |
|  |  | eigenSymmetric, indefinite is fine | -1 | -1 ± 1e-14 | pass |
| **L7** The Wilkinson W21+ matrix | authentic | largest | 10.75 | 10.75 ± 1e-9 | pass |
|  |  | second largest | 10.75 | 10.75 ± 1e-9 | pass |
|  |  | third largest is well below | 1 | = 1 | pass |
|  |  | sum of the eigenvalues, the trace | 110 | 110 ± 1e-11 | pass |
| **P1** Exact polynomials are recovered, with a degree of freedom to spare | analytic | quadratic, largest deviation | 5e-15 | 0 ± 1e-12 | pass |
|  |  | cubic, largest deviation | 2e-14 | 0 ± 1e-12 | pass |
|  |  | constant, value | 7 | 7 ± 1e-14 | pass |
|  |  | residual chi-square | 5e-29 | 0 ± 1e-20 | pass |
|  |  | degrees of freedom | 17 | = 17 | pass |
|  |  | unweighted fit says its covariance is scaled | 1 | = 1 | pass |
| **P2** Conditioning: degree 10 on x = 1000 to 5000 | analytic | largest deviation, in units of the largest y | 3e-16 | 0 ± 1e-10 | pass |
| **P3** Against the normal equations, a straight-line formula and replication | oracle | QR vs normal equations, coefficients | 1e-14 | 0 ± 1e-9 | pass |
|  |  | degree 1 vs Sxy/Sxx | 1e-16 | 0 ± 1e-12 | pass |
|  |  | weights vs copies, coefficients | 1e-15 | 0 ± 1e-11 | pass |
| **P4** Coverage of the stated uncertainty on a thousand seeded datasets | ensemble | 1-sigma coverage, coefficient 0, sigma given | 0.7 | 0.683 ± 0.06 | pass |
|  |  | 1-sigma coverage, coefficient 1, sigma given | 0.719 | 0.683 ± 0.06 | pass |
|  |  | 1-sigma coverage, coefficient 2, sigma given | 0.704 | 0.683 ± 0.06 | pass |
|  |  | 1-sigma coverage, coefficient 3, sigma given | 0.704 | 0.683 ± 0.06 | pass |
|  |  | joint 95% region, sigma given | 0.958 | 0.95 ± 0.03 | pass |
|  |  | 1-sigma coverage, coefficient 0, scaled | 0.685 | 0.674 ± 0.06 | pass |
|  |  | 1-sigma coverage, coefficient 1, scaled | 0.7 | 0.674 ± 0.06 | pass |
|  |  | 1-sigma coverage, coefficient 2, scaled | 0.684 | 0.674 ± 0.06 | pass |
|  |  | 1-sigma coverage, coefficient 3, scaled | 0.692 | 0.674 ± 0.06 | pass |
| **P5** Fits the routine refuses, and the one it flags | negative | degree = points - 1, RangeError | 1 | = 1 | pass |
|  |  | NaN y, RangeError | 1 | = 1 | pass |
|  |  | sigma zero, RangeError | 1 | = 1 | pass |
|  |  | two distinct x, degree 3 | 1 | = 1 | pass |
|  |  | all x equal, degree 1 | 1 | = 1 | pass |
|  |  | given sigma is not scaled | 0 | = 0 | pass |
| **P6** NIST StRD Wampler 1 and 2 | authentic | Wampler 1, largest deviation over the largest y | 1e-16 | 0 ± 1e-11 | pass |
|  |  | Wampler 1, value at 0 (certified 1) | 1 | 1 ± 1e-8 | pass |
|  |  | Wampler 1, slope at 0 (certified 1) | 1 | 1 ± 1e-6 | pass |
|  |  | Wampler 2, largest deviation over the largest y | 3e-16 | 0 ± 1e-11 | pass |
|  |  | Wampler 2, value at 0 (certified 1) | 1 | 1 ± 1e-8 | pass |
|  |  | Wampler 2, slope at 0 (certified 0.1) | 0.1 | 0.1 ± 1e-6 | pass |

<!-- numeric-validation:end -->

## Dependencies (the 7.2.5 evaluation)

Evaluated on size, licence and maintenance from the npm registry's metadata on
2026-10-20; nothing was installed and no accuracy was measured, because size
decides it. Registry unpacked sizes, not gzipped bundle sizes.

| Package | Covers | Licence | Unpacked | Last published | Verdict |
| --- | --- | --- | --- | --- | --- |
| `ml-matrix` 6.15.1 | dense linear algebra, QR, eigen | MIT | 1.11 MB | 2026-10-19 | no: a large library for five routines of about 60 lines each |
| `mathjs` 15.2.0 | everything | Apache-2.0 | 9.4 MB | 2026-04-07 | no |
| `numeric` 1.2.6 | linear algebra, spline | none stated | not stated | 2022-06-22 | no: no licence, unmaintained |
| `simple-statistics` 7.12.1 | statistics (154's concern) | ISC | 1.35 MB | 2026-09-27 | not for these routines; a question for 154 |
| `d3-interpolate` 3.0.1 | value interpolation, not table lookup | ISC | 70 KB | 2022-06-14 | no: wrong contract |
| `ml-regression-polynomial` 4.0.0 | polynomial fit | MIT | 24 KB | 2026-04-18 | no: pulls a matrix library, and its conditioning is unmeasured here |
| `cubic-spline` 3.0.3 | natural spline | MIT | 8 KB | 2022-06-14 | no: no clamped end, no slope |
| `integrate-adaptive-simpson` 1.1.1 | adaptive Simpson | MIT | not stated | 2022-06-19 | no: Simpson is lower order than the rule already in the tree |

The first-visit install has 95 bytes of room, so any dependency that ships a
file to a page fails the data budget before its accuracy matters. The
validation cases are the acceptance test any later candidate would face.

## Costs and waits

Measured on this tree (Mac, Node 24; the gate is CI's, Node 20, whose zlib
differs by a few hundred bytes of gzip over an install this size).

- **The routines in the install.** The five modules are about 8.2 KB gzipped
  (roots 1.6, quadrature 1.45, interpolation 1.5, linear algebra 1.9,
  polynomial fit 1.7). `quadrature.js` and `linalg.js` are imported by
  `flrw.js` and `fit.js` and are installed. A module no page imports is not
  needed offline, so the build does not install `roots.js`, `interp.js` and
  `polyfit.js` (per-file `NEVER_PRECACHED` entries in
  `tools/build-service-worker.mjs`, about 4.8 KB gzipped); the first adopter of
  each deletes its entry, and `tests/numericRoutines.test.js` fails until it
  does.
- **The first-visit tier.** Before: 5,175,201 of 5,175,296 bytes (95 bytes of
  room). After the two adoptions: 5,177,543 (the two modules add 3,377 and the
  adoptions free 1,035, the 1,145 of the two removed bodies less their import
  lines: +2,342 net), an overrun of 2,247 over the old ceiling. The ceiling in `tools/data-budget.json` is raised to 5,177,596, the overrun
  rounded up to the next 100, with 53 bytes of room (Carl, in chat, 2026-10-20:
  "Allow the raise"; the standing size approval does not cover this file). The
  idle tier is untouched.
- **Routes.** With both adopted and the modules installed, every one of the 30
  routes of `tools/route-budget.mjs` is identical to the base in requests and
  kilobytes in both configurations (the sources, and the build), so no request
  ceiling is approached and none moved; the module line ceilings are unchanged.
- **The static screen** (`tools/key-registry-free.mjs`, which counts every
  literal dynamic import as a load) puts `flrw.js`, `microlensing.js`, `fit.js`,
  `infer.js` and `photometry.js` on five pages (the front door, the instructor
  portal, the Observatory, the Studio and the course packs, through lazy
  families), `rvCircular.js` on two and `cr3bp.js` on one; the measurement above
  is what a visitor actually pays.

| Consumer | Moves to | Equivalence | Source saved (gzipped, before its import line) | Module added | State |
| --- | --- | --- | --- | --- | --- |
| `js/kernels/cosmology/flrw.js` (the integrals of 255) | `quadrature.js` | bit for bit, proved (Q3) | 407 B | 1,450 B | adopted |
| `js/inference/fit.js` (the SPD routines of 154, 256) | `linalg.js` | bit for bit, proved (L3) | 738 B | 1,927 B | adopted |
| `js/kernels/lensing/microlensing.js` | `quadrature.js` | one ulp of the midpoint, not proved | 340 B | (shared) | waits for a committed tolerance |
| `js/kernels/galactic/motion.js`, `variables/fit.js`, `detector/lightcurve.js`, `inference/rvCircular.js`, `inference/infer.js` | `linalg.js` | different algorithms | not computed | (shared) | waits for a measured reason |
| Consumers 154, 200, 213, 219, 227, 255, 256 | the module each needs | new code | 0 | 1.45 to 1.9 KB each | their own prompts; `roots`, `interp` and `polyfit` carry 1.6, 1.5 and 1.7 KB into the install when their first adopter lands |

Nothing in this prompt is a closure file of the instructor bundle's sources,
and none was edited; `js/lab3d/elements.js` (`solveKepler`) is one, and is not a
candidate.
