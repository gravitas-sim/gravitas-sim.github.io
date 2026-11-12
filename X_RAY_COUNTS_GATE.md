# X-ray timing on the counts contract: the contract and the gate (Prompt 243, Part A)

A series of counts needs its contract before a period or a hardness is claimed from it: the live exposure of every bin, the
background, how dead time was treated, the good-time intervals, the time system and whether the times are barycentric, and the
energy bands. This document commits that contract, the rules for the Poisson treatment, the period search and the hardness
ratio, the verdict function and the consumers rule, and it states what was measured and what was not. The kernel that
implements the contract is in `HIGH_ENERGY.md`.

This is the kernel, contract and gate pull request of Prompt 243 (invisible: no page, panel, lesson, pack, model-page section
or instructor material). **No authentic product was supplied and nothing was fetched**, so the gate's question about real
products ("does each product's documentation fill the contract?") is NOT RUN, and the verdicts below say what that does and does
not establish.

## What was committed first, and when

`tests/fixtures/xray/thresholds.json` was committed (bc0b5673) before `js/kernels/xray/`, the validator, the oracle, any
generated series or any result existed. It holds the contract, the rules, the scenes, the seeds, the 31 legs with their bounds,
the verdict function and the consumers rule. Two amendments were recorded in it before any validator run (d58f88dc): AM1 (the
outburst rule's quiet level is the lower quartile, because with the median the rule's own refusal could never fire) and AM2
(the alias leg accepts any alias of the true frequency, because on regular sampling which alias is highest is not decided by the
sampling). One disclosure the file cannot make about itself: before the validator existed I ran the kernel once on the
orbit scene at seed 243100, which is a seed of leg A4; the cause of what I saw (an alias winning, below) is the scene's
geometry and was not used to move any bound. No bound was moved after a result; four legs fail and stay failing.

## The counts-series contract

`gravitas.counts-series/1`, a statement about each bin and about the series, checked by `validateSeries`:

| Field | Required content | Refused with |
| --- | --- | --- |
| `time` | the system (TDB, TT, UTC or MET) and `barycentric` as a boolean, stated | `timeSystem` |
| `start`, `stop`, `exposure` | bin edges in seconds since the epoch, ordered and not overlapping; live seconds per bin (0 or more; a zero-exposure bin has zero counts and is not used) | `bins`, `exposure` |
| `gti` | good-time intervals, ordered, positive, not overlapping; every live bin lies inside them and its exposure does not exceed its overlap with them | `noGti`, `gtiInvalid`, `binOutsideGti`, `exposureBeyondGti` |
| `deadTime` | `in-exposure` (the exposure is already live time) or a `fraction` per bin that reproduces the exposure from the good-time overlap to 1e-6 of the bin | `deadTime` |
| `bands` | at least one energy band, `{id, lo, hi, unit}`, ordered by energy, not overlapping, one unit; hardness needs two | `bands`, `bandsNeeded` |
| `counts` | integers of 0 or more per band, source region | `counts` |
| `background` | a region (area ratio and integer counts per band), a stated rate, or `none` with `negligible: true` | `background` |

Entry-point refusals beyond the contract: `notBarycentric` (a period search on times not stated barycentric), `undersampled`
(a minimum period under twice the widest bin), `simulations` (fewer than 99, or no seed), `noCounts`, `tooFew`, `tooLarge`,
`noQuietLevel` (an outburst rule with no quiet level). A series without good-time intervals is refused by every entry point
(leg D1); counts that are not whole numbers are refused, so a Gaussian-error series cannot be passed in disguise (D2).

## The Poisson treatment

A bin's count is Poisson. The rate is counts over live exposure; its interval is the exact (Garwood, 1936) interval at every
count, not `sqrt(N)` and not the profile interval above a hundred counts that the statistics kernel's default switches to
(which under-covers). With a background region the net rate has a profile-likelihood interval with the background rate
profiled out, constrained to 0 or more. The hardness ratio `HR = (H - S) / (H + S)` is a statement about counts in two bands,
not about flux, and it has an exact conditional-binomial (Clopper-Pearson) interval on source-region counts, mapped by
`HR = 2 p - 1`; its background-subtracted form is a profile interval. Counts are drawn by an exact sampler (inversion from
the mode), never a Gaussian approximation.

## The period-search rule

The statistic is the generalized Lomb-Scargle of `js/measure/periodogram.js` on the rate at the bin midpoints, on the grid that
module uses; the weights come from the constant-rate null (variance of a bin's rate `lambda / exposure`, fixed before the data
are looked at). **The significance is by simulation**, never by the asymptotic formula: `p = (1 + number of simulated maxima at
least the observed maximum) / (nSim + 1)` over the whole grid, each simulation Poisson counts at the same times, gaps and
exposures; `nSim` at least 99. A candidate at one of the sampling's own frequencies, or the reflection or beat of another strong
peak against one, is flagged and never reported clean; a period in the background region at the same frequency is flagged.

## The verdict function (committed in the thresholds)

Kernel verdict, from the legs on synthetic series: **A** every non-period leg and every period leg passes; **B** every non-period
leg passes and at least one period leg fails (light curves, rates, hardness and outbursts; no period claims); **C** otherwise
(display only). Period legs: A4, B3, B4, C4, C5, D3, D4, D5, D6. A background-subtracted rate or hardness may be claimed only if
B5, B6, C3 and C3b all pass, otherwise the total-count forms only. Product verdict (the roadmap's A, B, C on real products): A
needs a product that fills every required item with barycentric times stated true, kernel verdict A, and E1 passing; B needs a
product that fills the required items with the kernel verdict B or non-barycentric times; C otherwise. **With no product
supplied the product verdict is NOT ESTABLISHED and is treated as C for any statement about a real source.**

## What was measured (Node 22.23.4, Python 3.9.22 for the oracle)

31 legs: 23 pass, 4 fail, 4 NOT RUN, 0 reported. The table is `tests/fixtures/xray/results.json`; the failing legs are
`tests/fixtures/xray/failed-legs.json`.

| Leg | Result | Meaning |
| --- | --- | --- |
| A4 period recovery | **FAIL**, 19 of 20 seeds | seed 243100 returned the alias at 553.7 s (7.19 resolutions from 612.5 s) with p = 0.005 and no flag: the true peak was 0.932 of the top, and the alias rule flags a partner only when it reaches 0.8 of the top, which is exactly how an eight-fold-periodic gap pattern makes a sidelobe and the true peak close to equal |
| B6 net-hardness oracle | **FAIL** | the committed case [5, 20, 5, 20] has no net counts in either band (net rate 0 from 5 - 0.25 x 20 = 0): the kernel refuses (`noCounts`), the oracle's optimiser returns noise; the other five cases agree to 1.1e-8 against the bound 1e-4 |
| C3 net-rate coverage | **FAIL** | the profile interval at level 0.95 covers 0.872 at S = 2, B = 1 (floor 0.92); 0.926 at S = 2, B = 4; mean 0.951; the profile interval is not exact and under-covers at a few counts |
| C5 period-interval coverage | **FAIL** | 0.54 against the band 0.55 to 0.82 (100 seeds; median half-width 0.65 s) |
| B7, E0, E1, E2 | NOT RUN | no authentic file was supplied |

Passing: the exact interval's closed forms (A1, A2), binning's conservation (A3), hardness recovery (A5), outburst recovery with
no false run on 20 constant series and a refusal when the source is bright most of the time (A6), the independent oracle for the
Garwood ends, the Clopper-Pearson ends, the GLS power (against astropy and the existing periodogram module) and the simulated
significance against 19,999 independent simulations (B1 to B5), exact coverage of the hardness and rate intervals (C1, C1b, C2),
net-hardness coverage 0.913 to 0.946 (C3b), the significance's calibration under the null: 0.04 of 200 constant series reach
p <= 0.05 (C4), and every refusal and flag leg (D1 to D7).

**Gate verdicts, as computed by the committed function:** kernel verdict **B** (A4 and C5 fail; every non-period leg passes);
net forms: **total-count forms only** (B6 and C3 fail); product verdict **NOT ESTABLISHED** (no product supplied; treated as C
for real sources). The roadmap's Part A asks for A, B or C on the candidate products; that question cannot be answered without
the products, and this document does not answer it by assumption.

## The candidate products: NOT RUN

The roadmap asks for light curves of two or three X-ray binaries (a persistent source, a transient, a pulsar) from an
all-sky monitor or NICER, public domain through HEASARC, recorded per product, with each product's documentation read against
the contract. No product, product identifier, band definition or terms page was retrieved, and none is typed here from memory.
When the files arrive, each product is entered in this table with the sentence or keyword (by file and line) that fills each
row; a file's column of the right name is not documentation.

| Required item | Evidence the documentation must supply | Product 1 | Product 2 | Product 3 |
| --- | --- | --- | --- | --- |
| exposure per bin | live time per bin or the definition of the exposure column | NOT RUN | NOT RUN | NOT RUN |
| good-time intervals | a GTI table or the statement of how good time is defined | NOT RUN | NOT RUN | NOT RUN |
| time system | the time scale of the time column | NOT RUN | NOT RUN | NOT RUN |
| barycentric correction | whether it was applied | NOT RUN | NOT RUN | NOT RUN |
| two energy bands | the band edges and unit | NOT RUN | NOT RUN | NOT RUN |
| dead time | folded into the exposure, or a fraction | NOT RUN | NOT RUN | NOT RUN |
| background | a region or rate (needed only for net forms) | NOT RUN | NOT RUN | NOT RUN |

## The consumers rule (committed in the thresholds)

A synthetic-only lesson is permitted only when the kernel verdict is A, with every figure and sentence saying SYNTHETIC and
stating the claim limits, and no statement about a real source; with kernel verdict B it is permitted for hardness and
outbursts only. A real-product lesson needs a product verdict of A or B with the product's terms page saved; period statements
need A. **The verdict today is B (synthetic) and NOT ESTABLISHED (real), so only a synthetic, labelled hardness-and-outburst
lesson would be permitted, and none is built in this pull request: lessons wait for Carl's confirmation.** The prompt's
third investigation ("Black hole or neutron star?", a mass function from a public optical radial-velocity table) is not
requested: no recorded decision for such a table exists.

## Rights decisions, per source and per redistribution form (7.5, rule 4)

Nothing was retrieved, so for every candidate source the rights basis is C and nothing is shipped: no product, no catalogue row,
no band definition, no published period. The shipped path is the labelled synthetic generator, which is code (packs have no
room, and none is added). The accepted bases for a later decision are public domain (as the archive states it for the product,
recorded per product with the page's text), and nothing else is assumed.

## Files requested from Carl

Put each under `tests/fixtures/xray/authentic/` and add an entry to `SOURCES.json` there for every file: `{file, source URL,
the product as the archive names it, retrieval date, the terms file saved with it, rights basis}`. Nothing is fetched by a
session; the legs read what arrives.

1. **Three products from HEASARC, public domain as the archive states.** One per role, light-curve products that carry
   good-time intervals and at least two energy bands (an all-sky-monitor or NICER light curve, as the roadmap names). Source
   names are suggestions and yours to change: a persistent bright binary (Cyg X-1 or Sco X-1); a recurrent transient (Aql X-1
   or GX 339-4); an accreting pulsar (Her X-1, Cen X-3 or Vela X-1). **Check the pulsar's catalogue spin period before choosing
   the product: the product's widest bin must be at most half the shortest period searched, or the kernel refuses
   (`undersampled`)**, so a pulsar of seconds needs a fine-binned product (NICER, not a daily or dwell light curve) and a
   product with bins of tens of seconds suits only a pulsar of hundreds of seconds.
2. **For each product, the files:** (a) the FITS file exactly as downloaded, unmodified, with its URL and the download date;
   (b) a dump of the header of every HDU (`fitsheader`, astropy or anything that prints all keywords; say which); (c) the GTI
   extension as a two-column text table (START, STOP) if it is not in the file as a table the dump shows; (d) the column names
   with their units (they are TTYPEn and TUNITn in the dump).
3. **The header keywords the gate looks for** (common FITS timing keyword names, listed here to be checked against the files, not asserted
   to exist in them; the files decide which exist, and an absent one is evidence: it records a requirement as not filled): `TELESCOP`, `INSTRUME`, `OBJECT`, the observation or
   product identifier keyword, `DATE-OBS`, `DATE-END`, `TIMESYS`, `TIMEREF`, `TIMEUNIT`, `TIMEZERO`, `MJDREFI`, `MJDREFF` (or
   `MJDREF`), `TSTART`, `TSTOP`, `TELAPSE`, `ONTIME`, `EXPOSURE`, `LIVETIME`, `DEADC`, `CLOCKAPP`, `BACKAPP`, `BACKSCAL`, the
   `HDUCLASn` keywords, and however the product states its energy bands (keywords or columns).
4. **The terms pages, saved with the retrieval date:** the archive's data-use and citation or acknowledgement policy page that
   applies to the product, the mission's own acknowledgement requirement, and the product's description page (the one that says
   how exposure, dead time, good time, the time system and the barycentric correction are defined). Save as HTML or PDF; the
   gate reads the saved copy, not a link.
5. **`catalogue.json`, for E1 (the pulsar):** the pulsar's spin period from a catalogue the archive hosts, as printed:
   `{"source": {"table": "<the table's name as the archive prints it>", "url", "retrieved", "terms"}, "object": "...",
   "period": {"value", "sigma": or null if the table gives none, "unit", "reference", "locator"}}`. The kernel's period is
   judged against this under a fixed contract written before the file is read (band, bin width, grid, 999 simulations).
6. **`timing-package.json`, for B7 (optional but the roadmap's leg (b)):** the output of one independent X-ray timing package
   that you ran yourself on one product (its name, version, the command, its citation as printed), with the period and its
   uncertainty and a hardness over a stated interval and stated bands: `{"package": {"name", "version", "command",
   "citation"}, "product": "<file>", "period": {"value", "sigma", "unit", "method"}, "hardness": {"soft", "hard", "start",
   "stop", "value", "sigma": or null}}`. The kernel's period must agree within three combined sigma and the hardness lie inside
   the kernel's interval.

## Questions for Carl

1. A4 and C5 fail because the committed orbit scene has eight identical gap cycles, so the periodogram has an alias peak of
   nearly the true height; the committed alias rule flags a partner only at 0.8 of the top. Resetting either (a scene with an
   aperiodic gap pattern, or an alias threshold of 0.5) is yours; I did not.
2. B6's committed case [5, 20, 5, 20] has no net counts, so the kernel's refusal is right and the leg as written fails. Replace
   the case, or accept the failure as stated.
3. C3: the profile interval for a background-subtracted rate under-covers at a few counts (0.872 at S = 2, B = 1). Net forms
   are therefore total-count only. A different interval (an exact conditional or a Bayesian one) would be a new decision.
4. The files above; and a go-ahead for a synthetic, labelled hardness-and-outburst lesson, which the consumers rule permits
   today and which I have not built.

<!-- Listed in DOCUMENTS.md. -->
