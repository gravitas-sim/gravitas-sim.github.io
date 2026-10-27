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

## What was retrieved, and what was not

On 2026-10-27, with Carl's consent for R0 to R3 ("Yes, R0-R3 (Recommended)"), the following was read, each in its own new
scratchpad directory, as data and never executed: craterstats 3.2.1 (BSD; the newest release that installs on the
Python available, 3.10; installed with `--only-binary` into a new venv, with scipy 1.13.1 because 3.2.1 imports
`simps`), Marchi et al. (2009), AJ 137, 4936 (arXiv:0903.5137) and Iqbal et al. (2019), Apollo 11 (arXiv:2003.03292).
URLs, sizes, SHA-256 and licences are in `tests/fixtures/crater-chronology-gate/sources.json`, with the numbers
transcribed from them (credit, no files committed).

Not retrieved, and nothing substituted from memory: the Space Science Reviews 96 papers (Neukum, Ivanov and Hartmann
2001; Stoffler and Ryder 2001: publisher page, subscription), Michael and Neukum (2010) and Robbins (2014) (closed), the
Apollo 12 and 14 recounts of Iqbal et al. (open access, but the publisher refused automated access with HTTP 403 and the
replication data of Apollo 12 sit behind a bot challenge; one attempt with a changed user agent was refused by the
permission system and was not repeated). So the coefficients are checked against craterstats' table (which cites the
papers) and the sample ages are read from Marchi et al.'s Table 1, which quotes Stoffler and Ryder's Table VI: a secondary
reading, stated as such. The published values for the sample sites are N1 densities, not the raw counts with areas.

R0 found the recalled production table wrong in the digits (correction c2): it was the Neukum (1983) polynomial typed to
four or five digits, and over 0.01 to 300 km its largest relative difference from the sourced table is 0.44. The sourced
1983 table replaced it before any R-leg was computed; the 2001 polynomial is a different set of coefficients and is
reported as a sensitivity (it is 1.32 times the 1983 one at 3 km and 2.36 times at 16 km).

Prompt 195's regions (`frames/craters-regions.json`) are as before: the Mare Tranquillitatis box includes the Apollo 11
site but is a 25 by 15 degree box counted at 20 km, so it is not a count of Apollo 11's surface.

## The legs, the decision function and the slices

Every bound is in the fixture.

| Leg | What it asks | Data |
|---|---|---|
| F1 | the functions are what the contract says: 10^a0 equals the linear coefficient; the inverse round-trips to 1e-9; N_PF strictly decreasing in D and N1 strictly increasing in T; an independent Python implementation agrees to 1e-9 (an implementation check: it shares the coefficients; the pin against craterstats checks the table) | none |
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

## The measurement and the verdict: C

Spike `spike/crater-chronology-gate` (commit 7f375930, never merged): the functions as the contract states them, an
independent Python implementation (`python -I`, numpy 2.2.6 and scipy 1.15.3, nothing of Gravitas run), craterstats 3.2.1's
own output on the same grid (R3's pin), and the harness `tools/crater-chronology-gate.mjs`. The record is
`tests/fixtures/crater-chronology-gate/record.json`; `oracle-results.json`, `craterstats-results.json` and `sources.json`
hold the inputs; `tests/craterChronologyGate.test.js` holds all of it against the committed bounds. The bounds are the
committed ones (c1 and c2 were recorded before any R-leg value was computed).

| Leg | Measured | Bound | |
|---|---|---|---|
| F1.a0, inverse, monotone | 1.0e-4, 2e-16, 0 violations | 1e-3, 1e-9, 0 | pass |
| F1.oracle (independent implementation, same coefficients) | 5e-14 | 1e-9 | pass |
| F1.craterstats (functions; age by its 0.005 Ga interpolation) | 0; 1.7e-5 Ga | 1e-9; 0.005 Ga | pass |
| F2.coverage, 24 cells of 4,000 trials | minimum 0.9435 | 0.94 | pass |
| F3 nine refusals; 500 controls | 9 of 9 named, no age; 0 flagged | all; 0.05 | pass |
| R1 sites with a published N1 | 16 rows | 6 | pass |
| R1 rows within a factor 1.5 of N1 at the sample age | 8 of 16 | all 16 | **fail** |
| R2 Apollo 11 counts whose interval (widened by 1.91) meets the sample window | 6 of 6 | all | pass |
| R3 sites with a post-2001 recount | 1 (Apollo 11; three recounts, all within 1.23) | 2 | **fail** |
| O1 expected count at 3.5 Ga above 16.2 km, highland and mare boxes | **1.95, 2.18** | 30 | **fail** |
| O2, I1 | NOT RUN | | |
| M1 (no Martian age) | holds: the harness refuses a Martian region | 0 ages | pass |

R1 in detail, the ratio of the published N1 (Marchi's NEO column) to N1 at the sample age, bound 0.667 to 1.5; the
sample age in Ga, and the age the chronology recovers from the published N1, are in the record. Within tolerance: Imbrium
Apennines 0.81, Fra Mauro 1.07, Tranquillitatis old 1.02, Taurus-Littrow 1.4986, Tranquillitatis young 1.49,
Fecunditatis 0.84, Crisium 0.79, Procellarum 1.31. Outside: Descartes 0.665 (0.2 percent under the bound), Mare Imbrium
1.69, Copernicus 1.97 and 2.01, Tycho 3.71 and 1.80, North Ray 3.13, Cone 3.33. The MBA column changes no verdict. Not
judged (not on the contract's list of sites): Nectaris Basin 3.54, Highlands 1.16.

Verdict by the committed function: **C, now a measured C and not a pending one**: F1 to F3 pass, but B needs R1 to R3
and R1 and R3 fail as committed. Nothing was moved or restated. What the failures are, said plainly. R1: of the ten rows at 3.15 to 3.92 Ga, eight are within the tolerance and
all ten recover an age within 0.45 Ga of the sample age (Crisium 2.77 for 3.22, the largest; Mare Imbrium 3.54 for 3.30 and
Procellarum 3.39 for 3.15 next; the rest within 0.11), with Descartes and Mare Imbrium the two outside; the six rows at
0.025 to 0.8 Ga are all outside, by a factor of 1.8 to 3.7 in density (recovered ages 1.6 and 1.6 for 0.8 Ga, 0.40 and 0.20
for 0.109, 0.17 for 0.053, 0.083 for 0.025). These densities are Marchi et al.'s fits under his own production function
and are not Neukum's counts; the failure of the young rows is a statement about the published densities against the
committed chronology, which is least constrained at the young end, and not a test of Neukum's own pairs, which are not
retrievable. A reset of the factor to 2 would pass Descartes, Mare Imbrium, Copernicus' ejecta and the large-crater
Tycho row and still fail four (Copernicus' floor 2.01, Tycho's small-crater row 3.71, North Ray 3.13, Cone 3.33), so no
modest reset makes R1 pass; only Carl resets a bound. R3: the leg asks for two sites and the retrievable recounts are at
one; the three Apollo 11 recounts are each within 1.23 of N1(3.58 Ga), which is consistent with the chronology at that
point and says nothing about the other sites.

O1: as before, the lunar frames at 2.02 km per pixel count craters of 16 km and over, and a 3.5 Ga surface carries about
two of them in either box against the 30 the interval needs; with the 2001 polynomial the figure is about 4.6 and 5.1,
still far below. Carl's ruling of 2026-10-27 ("Accept ceiling B (Recommended)") leaves O1 failing, its bound unchanged,
and the ceiling at B: the chronology is taught on the reference table, and the students' counts are not aged. The
function now gives C regardless, because R1 and R3 fail; it would give B only if they passed.

An observation, not a leg and not an age: the committed lists hold 72 (highland) and 21 (mare) craters of 20 km or
more, against the two a 3.5 Ga surface would carry at 16 km. The large craters on those boxes are far older ground
than 3.5 Ga, and in the mare box they are the craters the lava did not bury.

The F1 oracle shares its coefficients with the spike, so its agreement checks the code; the pin against craterstats is
what checks the table (to the digits craterstats prints; the papers were not read). F3's saturated case was corrected in
the harness after its first run (it was also older than the chronology); no bound moved.

## What each verdict builds, and what is asked

**B** (not reached; what the verdict would build if R1 and R3 passed): the kernel's functions, the 1 km equivalent, the inverse chronology
with its counting interval and the approximation floor from R1, the refusals above; the investigation's upper depth
teaches the chronology on the reference table of published counts and sample ages and does not age the student's own
count; the model page's chronology section states the interval and what it assumes. **C** (the verdict): nothing is
built; Prompt 195's relative ages stand and Prompt 206's unit lists the chronology as a reading step.

Open for Carl: R4 (the Martian references) and R5 (a person to mark craters on a finer frame) stay out by his ruling.
What would change the verdict: the raw counts of Neukum (1983) with their areas, the two Space Science Reviews papers
and a recount at a second site (Apollo 12 or 14, open access but not reachable by a script), run against the committed
bounds; or a reset of a bound, which is his alone.

## Not done in this gate

O2 (no person has marked craters on the frames) and I1 (the completeness correction by injection needs the recognition
measured on crater-like features and a person or detector to recover them) are NOT RUN, and their methods are the
contract above. No count on any frame is made by anyone, and none is simulated. Part B is not built: it is authorized
only by a verdict of A or B, and the verdict is C.
