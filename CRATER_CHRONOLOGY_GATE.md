# The crater-chronology gate (Prompt 196, part A)

Prompt 195 counts craters and ranks surfaces by age. This gate decides whether Gravitas may go further and state an
absolute age: N(>=1 km) turned into gigayears through the lunar production and chronology functions, with an interval
whose counting error and approximation error are told apart. The contract here and in
`tests/fixtures/crater-chronology-gate/thresholds.json` was committed before any age was computed and before the
prototype existed. The prototype lives on the never-merged branch `spike/crater-chronology-gate`; Part B (the kernel,
the validation group, the investigations' upper depth, the model page section) is built afterwards, within the verdict
only, and is not built by this PR.

## What an absolute age rests on

A count of craters of diameter at least `dMin` over an area `A` is a Poisson count `n`. The production function
`N_PF(>=D)` (Neukum 1983; Neukum, Ivanov and Hartmann 2001) gives the shape of the cumulative distribution of a
surface that has only been cratered, and the chronology function
`N1(T) = c1 (exp(lambda T) - 1) + c2 T` gives the density of craters of 1 km or more after `T` Ga (c1 = 5.44e-14,
lambda = 6.93 per Ga, c2 = 8.38e-4 per km^2 per Ga). The count is converted to the 1 km equivalent
`N1 = (n / A) N_PF(>=1) / N_PF(>=dMin)`, its Garwood interval is mapped through the same factor, and the inverse
chronology `T(N1)` gives the age and its interval. The shape of `N1(T)` is the whole difficulty of the method: above
3.5 Ga the exponential term is the larger and the age is insensitive to the count (a 10 percent change in the
count moves the age by about 0.016 Ga near 3.9 Ga and 0.035 Ga near 3.5 Ga); below it the linear term dominates and
the age is nearly proportional to the count (0.3 Ga near 3 Ga).

Everything that is not the Poisson count is an assumption the interval does not contain. The age of a surface assumes
that the craters accumulated at the rates the chronology says (calibrated on the Apollo and Luna sites, 3.0 to about
3.95 Ga, and on a few young craters, with a gap between), that no secondaries are counted (below 1 km they dominate
young surfaces), that the surface is not saturated (above about 3 percent of geometric saturation `1.54 D^-2` per km^2
the count is a lower limit), that the count is complete down to `dMin` (the completeness leg, I1), and that the
surface is one unit that was formed at one time and not a resurfaced one (a count of large craters on a mare dates the
older ground below the lava, not the lava). The chronology is a model fitted to those samples: recovering a calibration
site's age from the count the curve was fitted to is a test of consistency, and only a recount made later on other
imagery says anything about accuracy.

## What is in the repository, and what is not

Absent, and a request for Carl (nothing is downloaded or installed): the sample ages of the returned-sample sites, their
published counts with areas and diameter ranges, the papers behind the functions (the coefficients here are typed by
recall and have not been read against them), craterstats, and any person's crater marks on the frames.
`thresholds.json` lists the requests as R0 to R5 with the source of each.

Present: Prompt 195's regions (`frames/craters-regions.json`, four regions with area, pixel scale and a 20 km list). The
Mare Tranquillitatis box includes the Apollo 11 site, but it is a 25 by 15 degree box (340,889 km^2) counted at 20 km,
and at 20 km a mare box counts the older craters that the lava partly buried, so it is not a count of Apollo 11's
surface and is not used as one.

## The legs, the decision function and the slices

Every bound is in the fixture.

| Leg | What it asks | Data |
|---|---|---|
| F1 | the functions are what the contract says: 10^a0 equals the linear coefficient; the inverse round-trips to 1e-9; N_PF strictly decreasing in D and N1 strictly increasing in T; an independent Python implementation agrees to 1e-9 (an implementation check, it shares the recalled coefficients) | none |
| F2 | the 95 percent age interval covers the true age at 0.94 or more in each of 24 cells of a seeded ensemble (six ages, two areas, two `dMin`) | none |
| F3 | each refusal case returns a named status and no age (`dMin` under 1 km, under 5 craters, saturated, older than the chronology, an invalid count or diameter, a Martian region), and at most 5 percent of 500 control surfaces are refused or flagged | none |
| R1 | the age recovered from each retrieved published count is within the committed tolerance of the sample age (the recovered 1 km density within a factor of 1.5 of the density at the sample age), at no fewer than six sites | R0, R1, R2 |
| R2 | the sample age is inside the counting interval widened by the RMS misfit of R1, at every site | R0, R1, R2 |
| R3 | at least two sites whose published count is a recount made after 2001, not the calibration count, are within the same tolerance | R0, R1, R2 |
| O1 | the expected count on the committed Moon frames, from the production function at 3.5 Ga, above the 8-pixel limit is at least 30 | none |
| O2 | a person's counts on the frames give an age within the R1 tolerance of the age from the regional list | R5 |
| I1 | the completeness correction by crater-like injection recovers a published count; recognition at `dMin` at least 0.9 | R5, R2 |
| M1 | no age is returned for Mars (no returned sample, no radiometric anchor) | none |

**A**: F1, F2, F3, R1, R2, R3, O1 and O2 pass: the lesson ages the student's own count. **B**: F1, F2, F3, R1, R2 and R3
pass: the lesson teaches the chronology on the reference table and does not age the student's count. **C**: otherwise: no
absolute age, Prompt 195 stands, Prompt 206 lists the chronology as a reading step. The first match from the top. A leg
that cannot run for want of data is NOT RUN, which is not a pass; the verdict C that follows is a pending C and the same
function gives B or A once the data arrive and the legs run. A bound that proves unmeasurable fails its leg; only Carl
resets a bound; a failed leg is reported and left failing.

Mars is outside every verdict. The Martian chronology (Hartmann and Neukum 2001) and production function (Ivanov 2001)
are the lunar ones scaled by impact rate, velocity, gravity and an atmosphere cut-off, with no returned sample to
anchor them, so a Martian count may be drawn against a labelled model isochron and never returns an age.

## The measurement and the verdict: C (pending)

Spike `spike/crater-chronology-gate` (commit a909eba9, never merged): the functions as the contract states them, an
independent Python implementation (`python -I`, numpy 2.2.6 and scipy 1.15.3, nothing of Gravitas run), and the harness
`tools/crater-chronology-gate.mjs`. The record is `tests/fixtures/crater-chronology-gate/record.json`, the oracle's output
`oracle-results.json`, and `tests/craterChronologyGate.test.js` holds both against the committed bounds. The bounds are
the committed ones (one correction, c1, recorded in the thresholds before any age was computed).

| Leg | Measured | Bound | |
|---|---|---|---|
| F1.a0 (10^a0 against c2) | 1.0e-4 | 1e-3 | pass |
| F1.inverse (T to N1 to T) | 2e-16 | 1e-9 | pass |
| F1.monotone | 0 violations | 0 | pass |
| F1.oracle (independent implementation) | 5e-14 | 1e-9 | pass |
| F2.coverage, 24 cells of 4,000 trials | minimum 0.9435 (T 2 Ga, 2e5 km^2, dMin 1 km) | 0.94 | pass |
| F3 refusal cases (nine) | nine named statuses, no age | 0 wrong | pass |
| F3 control (500 surfaces) | 0 refused or flagged | 0.05 | pass |
| O1 expected count at 3.5 Ga, highland box | **1.95** (dMin 16.2 km, 304,982 km^2) | 30 | **fail** |
| O1 expected count at 3.5 Ga, mare box | **2.18** (dMin 16.2 km, 340,889 km^2) | 30 | **fail** |
| R1, R2, R3 (published counts at the sample sites) | NOT RUN | | |
| O2 (a person's counts on the frames) | NOT RUN | | |
| I1 (completeness by crater-like injection) | NOT RUN | | |
| M1 (no Martian age) | holds by construction: the harness refuses a Martian region | 0 ages | pass |

Verdict by the committed function: **C**, and a pending C. F1, F2 and F3 pass, so the functions are implemented as
stated and the interval covers; but B needs R1 to R3 to pass and none could be run, because the sample ages and the
published counts are not in the repository and nothing was downloaded. The same function gives B when those legs run
and pass. A is out of reach on the committed frames, whatever R1 to R3 give: O1 fails as committed. A lunar frame at
2.02 km per pixel counts craters of 16 km and over (Prompt 195's 8 pixel rule), and a 3.5 Ga surface of either box
carries about two craters of that size, against the 30 the interval needs. Nothing was moved or restated: the bound
is Carl's to reset, and the honest alternatives are a finer frame (a lunar frame at 100 to 200 m per pixel would
count from about 1 to 2 km) or a larger area, neither of which is in the repository.

An observation, not a leg and not an age: the committed lists hold 72 (highland) and 21 (mare) craters of 20 km or
more, against the two a 3.5 Ga surface would carry at 16 km. The large craters on those boxes are therefore far
older ground than 3.5 Ga, and in the mare box they are the craters the lava did not bury, which is why a count of
large craters on a mare dates the basement and not the lava.

Two things in the record the reader should weigh. First, the F1 oracle shares the recalled coefficients with the
spike, so its agreement (5e-14) is a check of the code and says nothing about the table; F1.a0 is the only check on a
coefficient (10^a0 = 8.3809e-4 against c2 = 8.38e-4, within 1.0e-4), and R0 (reading the papers) is what checks the
rest. Second, one case was corrected in the harness after its first run: F3's saturated case (n = 50 over 100 km^2 at
2 km) returned `beyondChronology`, because that surface is also older than the chronology reaches, so the case did
not isolate its rule; it became n = 6 over 100 km^2, which does. No bound moved.

## What each verdict builds, and what is asked

**B** (the likely outcome once R0 to R3 are run): the kernel's functions, the 1 km equivalent, the inverse chronology
with its counting interval and the approximation floor from R1, the refusals above; the investigation's upper depth
teaches the chronology on the reference table of published counts and sample ages and does not age the student's own
count; the model page's chronology section states the interval and what it assumes. **C** (as it stands): nothing is
built; Prompt 195's relative ages stand and Prompt 206's unit lists the chronology as a reading step.

For Carl, the requests (`thresholds.json`, `dataRequests`): the two Space Science Reviews papers that carry the
functions (R0), the table of sample ages (R1), the published counts at the sites with their areas and at least one
recount after 2001 (R2), craterstats in the oracle environment (R3), the Martian references to name the factor between
the published production functions (R4), and a person to mark craters on a frame finer than the present ones (R5),
for O2 and I1.

## Not done in this gate

R1 to R3 (no sample ages or published counts in hand), O2 and I1 (the completeness correction by injection needs the
recognition measured on crater-like features and a person or a published detector to recover them) are NOT RUN, and
their methods are the contract above. No count on any frame is made by anyone, and none is simulated. Part B is not
built: it is authorized only by a verdict of A or B, and the verdict is a pending C.
