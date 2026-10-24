# The orbit-fit gate

Roadmap III, Prompt 187, Part A. A visual binary's apparent orbit is a small
fit with large degeneracies: on a short arc the period, the eccentricity and the
orientation trade against each other, and a least-squares routine will still
return numbers. This gate commits, **before any fit was run**, the criterion
below which the fitter must say "not constrained" instead of giving elements,
the synthetic test set the criterion is judged on, every bound, and the rule
that turns the measurements into a verdict (A, B or C). The prototype is spike
code on `spike/orbit-fit-gate` and is never merged; Part B builds only what the
verdict allows. The result is decision-register row D-R10-66.

This file is written in the order the work was done: the contract first (below,
to "Results"), the measurements and verdict after. A bound a measurement then
crosses is a failed leg, not a reason to move the bound; only Carl resets one,
with a register row. The numbers are in `tests/fixtures/orbit-fit/gate-thresholds.json`.

## The models

Relative astrometry of the secondary about the primary at epochs `t`: east and
north offsets `(y, x)` in arcseconds, white noise of a stated standard deviation
per axis (or position angle and separation, converted with their covariance).
Two depths, both Keplerian and both fitted by weighted least squares:

- **Circular apparent orbit** (5 parameters): a circular true orbit seen
  obliquely, `(x, y)^T = M (cos phi, sin phi)^T` with `phi = 2 pi (t - tRef) / P`
  and `M` a 2 by 2 matrix (the Thiele-Innes constants of a circle). Given `P`
  the model is linear in the four entries of `M`, so the search is one
  dimensional (variable projection).
- **Elliptical, Thiele-Innes elements** (7 parameters): the same `M`, the
  period `P` and the eccentricity vector `(h, k) = e (cos w, sin w)`, with the
  mean anomaly `M_a = n (t - tRef) - w`, Kepler's equation (the repository's one
  solver), the true longitude `theta = nu + w` and `(x, y)^T = (r/a) M (cos theta,
  sin theta)^T`. This is the Thiele-Innes model `x = A X + F Y`, `y = B X + G Y`
  with `X = cos E - e`, `Y = sqrt(1-e^2) sin E`, reached through `(A, F) =`
  rotations of `M`'s rows by `w`; the `(h, k)` form is smooth at `e = 0`, where
  the periastron is undefined and the usual `(e, T)` form is singular. The
  circular model is the nested case `h = k = 0`. Elements `(a, i, Omega, omega, e,
  T, P)` follow in closed form (`a (1 + cos i) = hypot(A + G, B - F)`, `a (1 - cos i)
  = hypot(A - G, B + F)`); astrometry alone cannot tell the ascending node from the
  descending one, so `Omega` is given in `[0, 180)` degrees with `omega` shifted
  to match, and the statement is printed with the elements.

The mass sum follows from Kepler's third law, `M = (a / parallax)^3 / P^2`
(solar masses; `a` and the parallax in the same angular unit, `P` in Julian
years), with the parallax's interval and its reference-frame statement from
Prompt 186 propagated by Prompt 150's quantities.

## The identifiability criterion (committed)

A fit returns elements only if **all** of these hold, and otherwise returns
`{ ok: false, status: 'not-constrained', code, ... }` with the first that fails:

1. **Epochs** (`epochs`): at least 6 epochs for the circular model and 8 for the
   elliptical (the parameters number 5 and 7 against two coordinates per epoch).
2. **Coverage** (`coverage`): the arc covers a stated fraction of the period at
   the upper end of the period's two-sigma range, `span / (P + 2 sigma_P) >= f`,
   with `f` = **0.40** for the circular model and **0.50** for the elliptical
   one. `P` is the fitted period and `sigma_P` its formal standard deviation
   from the covariance of the fit. A singular covariance fails this too.
3. **Conditioning** (`conditioning`): the condition number of the normal matrix
   of the fitted model, its columns scaled to unit length (so it is unit free),
   is at most **1e6** (a ratio of singular values of 1e3).
4. **A bounded period** (`period-unbounded`): the 68.27 percent chi-square
   profile interval of the period (`delta chi-square = 1`, with the other
   parameters refitted at each period) is closed at both ends inside the
   searched range, `span / 20` to `100 span`. A short arc is the case where it
   is not.
5. **Consistency** (`inconsistent`): the survival probability of the fit's
   chi-squared is at least **0.001** with at least one degree of freedom. A model
   that cannot reach the data, or a stated uncertainty that is too small, does
   not return elements.

Two things are not refusals but statements. The elliptical fit asks whether the
eccentricity is detected: **delta chi-square (circular minus elliptical) at
least 11.83** (the 99.73 percent point for two degrees of freedom). When it is
not, the elliptical call returns the circular elements and says the
eccentricity is consistent with zero (with an upper limit from the 95 percent
confidence ellipse of `(h, k)`), and gives no periastron or `omega`. And a mass
sum is given only with its parallax interval and frame statement.

## The synthetic test set (committed)

Truth orbits are drawn from the stream `orbit-fit-gate-187` (the forward models'
white noise: independent Gaussian per axis with the stated standard deviation,
the repository's seeded `stream` and `gaussian`):

- the semi-major axis is 1 arcsecond and the period is 10 years (the problem is
  scale free; the noise is a fraction of `a`);
- `cos i` uniform in `[-0.85, 0.85]`, `Omega` and `omega` uniform on the circle,
  the periastron phase uniform;
- **elliptical truths**: `e` uniform in `[0.1, 0.8]`; **circular truths**: `e = 0`;
  **eccentric misspecification truths** (for the circular model's refusal): `e`
  uniform in `[0.4, 0.8]`;
- **arcs** of **10 percent, 30 percent, 60 percent and 110 percent** of the
  period, each with **12 epochs**: the first at 0, the last at `f P`, and the ten
  between at the even positions plus a seeded uniform jitter of plus or minus 0.3
  of the spacing (amendment A1 below: the committed text said "evenly spaced");
- the stated and actual noise is **2 percent of `a`** per axis, white;
- **400 trials** per cell. Every cell is its own stream label.

The result holds for this design (12 regular epochs, 2 percent noise, the stated
orbit distribution) and is not extended to other sampling or noise by this gate;
the validation of Part B tests other cells under its own thresholds.

## Amendment A1 (before any gate run)

The first commit of this file said the 12 epochs were evenly spaced. On a
development stream (`dev187`, not the gate's stream, no gate leg run, no bound
read) a fit of a 110 percent arc returned the period 10 / 11 years for a ten-year
orbit in two trials of six: with a spacing of exactly one year and a period of
ten, the frequency `1/P + 1/spacing` aliases every harmonic of the orbit exactly,
so the two periods fit equally well and no least-squares fit can choose. That is
a property of the sampling, not of the fitter, and a regular cadence is not what
visual-binary data look like. The test set was amended to the jittered epochs
above, **before the gate stream was run once**; no criterion constant and no leg
bound moved. The exactly regular cadence is kept as one evidence row of the
validation (its refusal is a rule of Part B, `period-ambiguous`, which is
stricter than the criterion committed here: the gate below is measured on the
criterion as committed, without that rule).

## The legs (committed)

For each model `m` (the circular model on circular truths, the elliptical model
on elliptical truths). "Accepted" means the fit returned elements.

| Leg | Statement |
| --- | --- |
| G1 short arcs refuse | refusal rate at 10 percent at least 0.99 and at 30 percent at least 0.95 |
| G2 not vacuous | acceptance at 110 percent at least 0.80 |
| G3 calibrated where accepted | at 60 and 110 percent, when at least 100 trials were accepted: the 68.27 percent interval covers the truth in 0.60 to 0.76 of them and the 95 percent interval in 0.90 to 0.99, for `P` (the profile interval), `a` and `a^3 / P^2` (covariance intervals); fewer than 100 accepted is recorded and passes (the arc refused) |
| G4 recovered | at 110 percent the median of `|dP| / P` is at most 0.05 and of `|da| / a` at most 0.10, over the accepted |
| G5 misspecified (circular only) | the circular fit of the eccentric misspecification truths at 110 percent is refused in at least 0.95 |
| G6 nested (elliptical only) | the elliptical fit of circular truths at 110 percent reports a detected eccentricity in at most 0.01 |

## The verdict function (committed)

- **A**: the elliptical model passes G1 to G4 and G6. The criterion holds across
  the tested arcs; the circular depth ships too if it passes G1 to G5, and is
  absent if it does not.
- **B**: the elliptical model fails a leg and the circular model passes G1 to G5.
  Part B ships the circular apparent orbit. The elliptical fit is offered only
  above a stated coverage: one full period (the 110 percent arc) if the
  elliptical model passes G2, G3 and G4 at 110 percent and fails only at shorter
  arcs or G1; otherwise not at all.
- **C**: neither model passes. Part B builds no orbit fit; the panel reports the
  moving-object track only and Prompt 191's binary investigation ships its
  measurement-only version.

A leg that proves unmeasurable fails on that leg. The criterion's constants
(0.40, 0.50, 1e6, 0.001, 11.83, the profile range) and the test set are fixed by
this text; they are exported by the prototype and the production module and a
test holds them equal to `gate-thresholds.json`.

## What is not tested here

Irregular epochs, other noise levels, correlated errors, a binary seen through an
unknown distance error, more than two bodies, light-travel and proper-motion
terms in the relative orbit, and an authentic orbit (no authentic arc pack
exists; nothing was fetched). Part B's validation contract (committed after this
verdict and before its module) covers some of these; the rest are limits.
