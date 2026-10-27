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

## Not done in this gate

I1 (the completeness correction by injection) needs the injection kernel's recognition measured on crater-like
features and a person or a published detector to recover them; none exists, so it is NOT RUN and its method is the
contract above. No count on any frame is made by anyone, and none is simulated.
