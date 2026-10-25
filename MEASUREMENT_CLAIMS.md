# Measurement, uncertainty and claim-limits investigations

Prompt 190 (Roadmap III, tranche T1B). Three short investigations on synthetic truth, one
instrument family, and the rules they teach. The register row is D-R10-67
(`DECISION_REGISTER.md`).

| Investigation | Level | Steps (core, deeper) | Claim it teaches |
| --- | --- | --- | --- |
| What Is a Measurement? (`what-is-a-measurement`) | survey | 12 core | Five marks of one star are five numbers; the spread belongs to the marking; the standard error shrinks as the root of the number of marks. |
| What Does ± Claim? (`what-does-plus-minus-claim`) | majors | 13 | A 1-sigma interval covers the truth about two times in three; an asymmetric interval and an upper limit have their own coverage; a biased instrument with small scatter is precisely wrong. |
| When the Method Must Refuse (`when-the-method-must-refuse`) | upper | 13 | A fit that constrains one combination of two parameters must say "not constrained" for each alone; a model that does not fit gets the same refusal. |

## What is synthetic

Everything. The truth is known, each lesson says so, and no authentic data are used on purpose:
the truth is the point. The instrument family is `js/claimWidgets.js` (ids `frame-marks`,
`coverage-repeats`, `profile-refusal`), lazy and never precached. The statistics are written in that
file and nowhere else (a seeded generator, Poisson inversion for a one-sided 95 percent upper limit,
weighted polynomial least squares, a chi-square survival function); the planned statistics kernel
(Prompt 154) has no first adopter yet and would have been installed for nothing.
`tests/claimInvestigations.test.js` recomputes every number a step states and checks the closed
forms (chi-square quantiles, Gehrels upper limits, the normal distribution function).

## What each claims, and where it stops

- **Marks.** The mean of n marks has standard error SD over the root of n, for scatter that is
  random and centred on the truth. It says nothing about a constant offset: a 1 px offset with 30
  marks is 6.2 standard errors from the truth and the error bar does not show it.
- **Coverage.** Over 2,000 seeded repeats the 1-sigma interval holds the truth in 68 percent and the
  2-sigma interval in 95 percent. With 100 repeats the figure is 70 percent plus or minus 4.6
  percent (its own binomial error). A biased instrument with small scatter covers 36 percent at 1
  sigma. The asymmetric (Poisson-count) interval covers 68 percent only when it is built as an
  interval of the distance to the truth; the symmetric shortcut covers 78 percent.
- **Upper limit.** At 95 percent the limit for zero counts is 2.996, for one 4.744, and so on
  (Garwood); it is a statement about the procedure, not about this one dataset.
- **Refusal.** For a product of two parameters measured to 0.06 only the product is constrained.
  The profile of chi-square against one factor is flat above a floor (0.79 at 1 sigma, 0.732 at 95
  percent): "not constrained" is the answer, and a number reported for it would be a choice made by
  the starting guess. A straight-line fit to a curved dataset has reduced chi-square 7.64 (p 3.8e-6
  on 4 degrees of freedom) and the lesson grades the refusal to report the slope as a result.

## Limits

- The Spanish is unread by a fluent reader. The validate messages of the measure steps are
  computed strings and stay English (they are not translated by content).
- No named adopter yet. The sequence places the three first in Observing and measuring.
- Offline: the three lessons and the instrument are not precached (`NEVER_PRECACHED`, D-R10-67);
  they are available offline after first use online. The instructors' portal imports the lesson
  barrel and so needs the network until those files have been fetched once.

## Where the files are

The instructor bundle's source closure is capped by file count (`tests/instructorDigest.test.js`,
raised from 270 to 274 under D-R10-67, 273 in use). So the three investigations live in four shared
files, one per kind (`measurement-sequence.js` under `js/data/investigations/`, `es/`, `depth/` and
`depth/es/`), and twelve one-line re-exports give the per-id paths that the loaders and tools build
from a lesson id. The re-exports are not imported by any closure file and stay outside the closure.
