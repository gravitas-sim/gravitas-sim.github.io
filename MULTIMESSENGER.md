# The multi-messenger timeline: kernel and validation (Prompt 244)

One event, two messengers, many bands. This is the kernel part of Prompt 244 (an invisible pull request: no page, no
lesson, no instructor material, nothing a student sees). It adds `js/kernels/multimessenger/`, its validator
`tools/multimessenger-validate.mjs`, an independent oracle `tools/multimessenger-oracle/`, and the fixtures under
`tests/fixtures/multimessenger/`. The investigations ("The day the universe rang and flashed", "Finding transients") and
the model-page section are a separate instructional pull request that waits for Carl's go-ahead (the consumers rule
holds) and for the legs under "Authentic-data legs" to be read by him; the leap list, the published bound and the burst
trigger have arrived and B2, B4 and E1 have been run on them (below), E3 has not.

The validation contract was committed first, in `tests/fixtures/multimessenger/thresholds.json`, before any kernel, oracle
output or result existed. This document was written after it. A crossed bound is a failed leg and stays failing; only Carl
resets one.

## What is built and what is not

Built: (1) a timeline of events of the two messengers across bands, each time carrying its **system** and its
**definition**, converted to one continuous scale through a leap-second table the caller supplies; (2) the speed-of-gravity
bound as a function of the assumed intrinsic emission delay, with its refusals; (3) sky areas and the galaxy-count problem;
(4) a stated host-ranking rule with refusals, and the distance from a redshift with the peculiar-velocity uncertainty
carried; (5) an expanding-blackbody kilonova model with magnitudes and colours through the existing radiation kernel and a
declared time domain; (6) a transient-detection rule on difference-flux light curves with its exact false-alarm and
detection probabilities and its completeness on injected transients; (7) labelled synthetic data with a truth manifest.

Not built, on purpose: a fit of the kilonova model to any data, an ejecta mass, a yield or any inference from the colours;
a model of the burst's emission, jet or intrinsic delay (the delay is an assumption the caller states, never a result); a
burst-onset or T90 estimator; difference-image subtraction (the detection rule runs on light curves, the second option the
prompt names); a HEALPix map reader; a galaxy catalogue's selection function; any claim that the host ranking identifies the
host; any number typed from a paper.

## Messengers and bands

A **messenger** is a kind of carrier of information from the source: gravitational waves and photons here (neutrinos and
cosmic rays exist and are not in this event's data). Gamma rays, X-rays, ultraviolet, optical, infrared and radio light are
**bands** of the one photon messenger. `makeEvent` refuses an event whose messenger is a band (`bad-messenger`, with a hint
naming the two), a photon event without a band, a gravitational-wave event with one, a time without a system and a time
without a definition.

## Time systems

A delay between a gravitational-wave time and a gamma-ray time is a subtraction only once both are on one continuous scale.
UTC is not one: it steps by leap seconds. `timescales.js` puts every stamp on T72, the SI seconds elapsed since
1972-01-01T00:00:00 UTC, through a leap-second table the caller supplies. **No table is embedded**: the table is data (the
IERS list) and a table typed from memory is the error this module exists to avoid.

| System | Meaning |
| --- | --- |
| `GPS` | seconds since 1980-01-06T00:00:00 UTC on a continuous scale (GPS = TAI - 19 s); T72 = GPS + T72(GPS epoch) |
| `FERMI_MET` | SI seconds since 2001-01-01T00:00:00 UTC, leap seconds counted; T72 = MET + T72(2001-01-01) |
| `UTC` | an ISO 8601 string or a calendar object; second 60 is accepted on the day before a table step |
| `MJD_UTC` | days, a day taken as 86400 s; refused on the day of a leap second |

The table must satisfy the definition of GPS (TAI - UTC is 19 s at 1980-01-06) or `makeLeapTable` refuses it. The Fermi epoch
is the mission's convention as the validation contract states it; the file header the archive row carries (its `TIMESYS` and
reference-epoch keys) is requested so the claim is read, not assumed.

Limits: a double at 1.2e9 s resolves 2.4e-7 s, so conversions are good to about a microsecond and no better; dates before
1972 are refused.

Every time also states what it is the time OF (`merger-catalogue`, `instrument-trigger`, `onset`, `first-detection`, `peak`,
`other`). The offset between a catalogue's merger time and an instrument's trigger is the difference of two stated instants,
not a travel time and not an emission delay.

## The speed-of-gravity bound

Gravitational waves leave at the merger; photons leave `tau` later (the intrinsic emission delay). With the observed delay
`Dt` (photons minus gravitational waves) and distance `D`:

    Dt = tau + D/c - D/v_GW,    x = c (Dt - tau) / D,    (v_GW - c)/c = 1/(1 - x) - 1 = x to first order.

The observation fixes `Dt - tau`, so the bound depends on the **assumed** `tau` and nothing else about the source: the upper
end (gravity at most this much faster) uses the smallest emission delay assumed, `tau_min`; the lower end (at most this much
slower) uses the largest, `tau_max`. `speedBound` requires both ends, returns them with the result (`assumption`), and
`describeBound` writes a sentence that always carries them. `boundCurve` gives each end against its own assumption.

**When there is no bound.** The interval is a statement about how far the speeds can differ only if the assumption is
consistent with equal speeds, `tau_min <= Dt <= tau_max`. If the assumed minimum emission delay exceeds the observed delay
(the prompt's case), or the assumed maximum is below it, the assumption by itself excludes equal speeds: the data contradict
the assumption and bound nothing. The result is `no-bound` with null ends and a reason; the interval the assumption implies is
returned under `implied`, marked as not a bound. The roadmap's text names only the first case; the symmetric one is a decision
of this kernel (register row D-R10-244-01) and a question for Carl.

**Distance.** The bound scales as 1/D. A distance given with a lower and an upper offset uses its lower end (the
conservative choice) and says so. The observed delay's own uncertainty is not propagated (it is far below any
emission-delay assumption). The first-order form is the published form; the exact form differs from it by a relative amount
of order `x`, about 1e-15 here, and the kernel refuses a delay so large for the distance that `x` reaches 0.5.

## Localisation and the galaxy-count problem

`circleAreaDeg2` (4 pi sin^2(r/2), the half-angle form, because 2 pi (1 - cos r) loses digits at small radii: 5.5e-13 at 0.5
degrees, measured), `healpixPixelAreaDeg2` (the sky over 12 nside^2), `gaussianAreaDeg2` (-2 pi sigma^2 ln(1 - p), flat sky,
refused above 10 degrees), `expectedCount` (the density times the sky fraction times the shell volume),
`probabilityNoCandidate` (exp(-N)) and `probabilityAtLeastOne` (-expm1(-N), no cancellation), `distanceShell` and
`tangentOffsetDeg` (gnomonic offsets about a centre).

**Domain.** The shell volume reads distances as Euclidean. Check R1 reports the ratio of that volume to the comoving shell
volume of the FLRW kernel (H0 70, Om 0.3, flat) for shells of plus and minus 20 percent: 1.019 at 20 Mpc, 1.039 at 40,
1.097 at 100 and 1.196 at 200. **The stated domain is therefore up to 100 Mpc** (the largest centre within 10 percent); beyond
it the count is not offered. The domain was read from the table after the table existed; it was not tuned.

## The host rule

For candidates on a tangent plane (offsets in degrees, distances in Mpc, an optional mass weight), a gravitational-wave
distance `D_hat` with width `s_D` and a sky width `s_x`:

    weight_i  proportional to  m_i exp(-(D_i - D_hat)^2 / 2 s_D^2) exp(-(x_i^2 + y_i^2) / 2 s_x^2),  normalised.

If the true host is a candidate chosen with probability proportional to its mass and the measurements are Gaussian about it,
the weights are the posterior probabilities (check C1 holds them to that on 4,000 seeded fields). Every "if" is an assumption:
the real distance posterior is not Gaussian, the sky region is not a circular Gaussian, a catalogue is incomplete, the host
need not be in it. So the rule **ranks, and identifies only when two thresholds are met**: the top weight is at least 0.9, and
the best-fitting candidate is itself consistent with the measurements (its chi-square on 3 degrees of freedom has survival
probability at least 1e-3; the weights normalise to 1 even when every candidate is far away, and the chi-square is what
notices). Both are inputs, and the result carries what it used.

`hostDistance` gives the luminosity distance of a redshift through the FLRW kernel and carries `sigma_v / (c z)`; it flags a
result above 0.1 as peculiar-velocity-dominated (z below 0.010 at 300 km/s) rather than hiding it.

## The kilonova model

An expanding sphere that radiates as a blackbody and cools by a stated law: `R = v t`, `T = max(T_floor, T0 (t/t_ref)^-p)`,
`L = 4 pi R^2 sigma T^4`, observed `f_lambda = (R/D)^2 pi B_lambda(T)`. It is the simplest member of the class of models used
to read kilonova colours (Li and Paczynski 1998 introduced the signal). It is a **continuum model of the early, optically
thick phase only**; its default parameters (`ILLUSTRATIVE_PARAMETERS`) are labelled illustrative and are not fitted to any
event; its declared domain is 0.25 to 15 days and it refuses outside it unless told otherwise; it has no line features, no
opacity, no heating rate and no dependence on the ejected mass, so nothing in it can be inverted for a mass or a heavy-element
yield, and the module offers no such function. The colour between two bands is a function of temperature alone and is
monotone in it, so the model's colour reddens monotonically with time and is constant once the floor is reached (A9); that is
a property of the model, not a finding about any event.

## The detection rule

A source is **detected** when at least `k` epochs have difference flux of at least `n` sigma (defaults k = 2, n = 5; inputs).
Its false-alarm probability is the binomial tail `I_p(k, N-k+1)` with `p = 1 - Phi(n)`; its detection probability for a known
flux sequence is the exact Poisson-binomial upper tail; its completeness is the fraction of injected transients it detects,
with the exact (Clopper and Pearson 1934) interval. It works on **light curves**, not difference images (subtraction,
registration and the PSF are not modelled; the injection kernels of the image pipeline are), assumes independent Gaussian
epochs and does not model real cadence gaps, weather or a galaxy background. A completeness is a statement about the injected
population under the rule, not about what a survey missed.

## Synthetic data

`syntheticScene`, `syntheticGalaxyField` and `syntheticPhotometry` draw from seeded streams around a stated truth, returned
beside the data (the truth manifest) and labelled SYNTHETIC. The merger is an invented one (not GW170817); the delay, the lags
and the host are random draws; the illustrative leap table of the thresholds file (its 1972 and 1980 entries are the
definitions GPS needs, every later step is invented) is used only in tests.

## Validation contract and measured table

Thresholds are in `tests/fixtures/multimessenger/thresholds.json`; the table is `npm run multimessenger:validate` (about a
second); the pinned rows are `tests/fixtures/multimessenger/results.json`; the oracle is
`tools/multimessenger-oracle/oracle.py` (numpy, scipy and Fractions; no Gravitas code), run offline and pinned in
`oracle-results.json`. **First run: 24 legs pass, none fails, 2 are reported and 4 are NOT RUN. After the authentic-data follow-up (below): 29 pass, none fails, 2 reported, 2 NOT RUN (E1, E3).** `failed-legs.json` is empty.

| Leg | What it holds | Result |
| --- | --- | --- |
| A1 | time systems against hand-computed values (invented table), the leap second, the refusals | exact (0 s) |
| B1 | the same against an independent Python implementation on 218 instants, round trips, delay recovery across GPS and MET | within 2.4e-7 s |
| B2 | the kernel under the authentic leap list against astropy's table | pass (follow-up): 1.2e-7 s on 205 instants |
| A2, B3 | the bound against its closed forms and against exact rational arithmetic on 40 cases | 4.3e-16 relative |
| A3 | 1/D scaling, which assumption sets which end, linearity in tau, monotone widening, the lower-end distance rule | pass |
| B4 | the published paper's delay, distance, interval and printed bound | pass (follow-up): -3e-15 and +7e-16, as printed |
| D1 | no bound when the assumption excludes equal speeds; refusals | pass |
| A4, D2 | timeline ordering, offsets, quadrature uncertainty, system and definition kept; a band is not a messenger | pass |
| A5, A6 | sky areas against closed forms and Monte Carlo; counts against quadrature and scipy | 2e-16 (the 7-figure hemisphere literal: 3e-8, AM4) |
| R1 | reported: Euclidean over comoving shell volume | 1.019 to 1.196 (domain 100 Mpc) |
| A7, C1 | the host rule against its closed form and invariances; calibration on 4,000 seeded fields in five weight bins at 99.9 percent | all five bins cover; top-1 accuracy 0.696 against mean top weight 0.698 |
| C1b | reported: the rule with half the true distance width | 1 of 5 bins cover (overconfident, as expected) |
| D3 | refusals of the host rule, including a lone candidate 5 sigma away | pass |
| B5, E2 | the distance from a redshift against scipy quadrature (1.6e-16); the pack's own redshift against the pack's own distance interval | pass |
| A8, B6, A9, D4 | photosphere closed forms; AB magnitudes in seven bands against an independent integration (1e-5 mag); colour monotone; domain refusals | pass |
| A10, B7, C2, D5 | false alarm against scipy; detection probability against a numpy convolution; completeness coverage 48 of 48 cells (median interval width 0.056); refusals | pass |
| E1, E3 | authentic delay and colour trend | E1 **NOT RUN** by its committed rule (follow-up); E3 **NOT RUN** (no photometry fetched) |

**What these legs can and cannot say.** The analytic and oracle legs hold the kernel to formulas written independently. C1
and C2 hold the rule and the completeness to *self-consistency*: the ensembles are drawn from the very models the rule
assumes, so they show that the code does what the model says, not that the model describes the sky. C1 has little power
against some errors: dropping the mass term (0.5 dex of scatter) is not detected by it (the report in C1's row shows the
mass-free ranking also covering all five bins); A7 holds the mass term exactly instead. The external-reference legs B2, B4 and E1
waited for Carl's files; the follow-up below ran them. Of the four, E3 alone (the colour trend of real photometry) is still
NOT RUN, so **no measured photometry has been compared with the kilonova model**.

**Amendments** (all recorded in the thresholds file before any kernel result; none resets a bound after a result):
AM1 first-order coefficient 0.775 (arithmetic slip), AM2 the peculiar-velocity flag redshift 0.010 not 0.03 (arithmetic slip;
E2's flag at the pack's rounded redshift 0.01 is raised by a margin of 7e-4 that the rounding does not support), AM3 the
distance reference is scipy quadrature, not astropy (astropy.cosmology cannot be imported here: PyYAML is missing), AM4 the
hemisphere literal has seven significant figures, so its bound is 3e-7.

## Authentic-data legs (follow-up, 2026-11-06)

Carl's session fetched three files outside any repository (the IANA leap-second list, the paper's printed numbers and the
Fermi GBM trigger header); this follow-up copied them byte for byte into `tests/fixtures/multimessenger/authentic/` with a
`SOURCES.json` entry each (source, terms as read, retrieval date 2026-11-06, sha256). The legs' bounds were committed
**before the files were copied and before any run**, in `tests/fixtures/multimessenger/authentic-thresholds.json`
(commit ff205280), by a stated rule: every bound is inherited unchanged from `thresholds.json` or is a formula over printed
numbers and a committed form. That file says what the session had read and computed by hand beforehand (the shape of the
files, the paper's text, and two pieces of arithmetic: the bound's upper end sits 0.03 percent above the rounding midpoint,
and the delay to the trigger is about 2.05 s). Amendments AM5 to AM7 were recorded before the first run on the files; no
bound was moved after a result; one run was made and its rows are the pinned rows.

**What the paper's 1.74 s is.** The published delay is the burst's emission *onset* at the geocenter after the merger time
(the paper fits the main pulse, finds the onset 0.310 +/- 0.048 s before the instrument trigger T0GBM, corrects 3.176 ms for
the signal reaching Fermi before geocenter and reports +1.74 +/- 0.05 s), not the trigger minus the merger. The `definition`
text of `published-bound.json` (Carl's session's transcription) says the paper's definition is of the trigger; the paper's
text says onset; the disagreement is recorded in `authentic-thresholds.json` (reading R1) and the file is kept as supplied.
By E1's committed rule ("agree if and only if both are defined merger-to-trigger") **E1 is therefore NOT RUN**, with the
difference of definitions recorded and not absorbed into a tolerance. The two printed numbers needed to compare on the
paper's own definition (0.310 s with its uncertainty, the 3.176 ms) and the paper's own T0GW are in
`published-bound-supplement.json`, read by this session from the supplied text by search, with locators.

| Leg | What it holds | Result |
| --- | --- | --- |
| B2 | the kernel under the authentic list against astropy (erfa's own table) on 205 instants (up to 2024), and the list's own consistency (28 entries, first of a month, 19 s at the GPS epoch, expiry 2027-06-28) | **pass**: GPS and Fermi MET agree to 1.2e-7 s (bound 1e-6 s) |
| B2b | the list as the validator parses it equals an independent Python parse of the same bytes (28 entries, the `#$` and `#@` numbers) | **pass** (exact) |
| B4 | the kernel's interval for 1.74 s, 26 Mpc and emission delays of 0 and 10 s, rounded to one figure, equals the paper's printed pair | **pass**: -3e-15 and +7e-16 (kernel -3.087e-15 and +6.502e-16; the upper end is 0.03 percent above the rounding midpoint, so this passes on the paper's own rounding edge) |
| B4o | the same interval against exact rational arithmetic (Fractions; the parsec from 648000/pi astronomical units) | **pass**: 1.3e-16 and 1.5e-16 relative (bound 1e-9); its rounding equals the printed pair |
| E1 | merger-to-trigger delay against the published delay, if both are defined so | **NOT RUN**: the published delay is an onset (above) |
| E1b | (i) the kernel's trigger-minus-merger delay (pack merger GPS 1187008882.4, trigger MET 524666471.474598 through the authentic list) against astropy built from the header's own reference epoch in TT; (ii) against the delay the paper's numbers imply for the trigger, 1.74 + 0.310 - 0.003176 = 2.0468 s, within 0.05 + 3 sqrt(0.05^2 + 0.048^2) = 0.258 s | **pass**: kernel 2.07460 s, astropy 2.07460 s (6e-8 s apart, bound 1e-6 s); 0.028 s from the implied 2.0468 s |
| E3 | colour trend of real photometry | **NOT RUN**: no photometry was fetched |

**What these legs can and cannot say.** B2 and B2b say the kernel's time conversion under a real leap list agrees with a
second implementation to a tenth of a microsecond and that the list was read correctly; B4 and B4o say the bound function
reproduces the paper's printed interval from the paper's printed inputs (the paper's own definition of the delay as the
onset is what the 0 s emission-offset assumption is measured from); E1b says the pack's merger time and the archive's
trigger time are consistent with the paper's delay to 0.03 s once the onset-to-trigger definition is applied, and, by its
oracle part, that the Fermi mission-elapsed-time convention in the kernel equals the header's own reference epoch. E1b's
tolerance (0.26 s) is wide: it sees a leap-second, epoch or GPS/TT error (seconds) and not a conversion error below about a
quarter of a second; its expected value assumes the paper's two uncertainties are independent, which they are not known to
be. The literal difference between the kernel's 2.0746 s and the printed 1.74 s (0.335 s) is reported beside it and is the
onset-to-trigger offset, not an error. The pack's merger time (1187008882.4, 0.1 s precision) is 0.03 s from the paper's own
T0GW (1187008882.430), inside E1b's tolerance. Nothing here tests the kernel against a distance, a sky area or a host.

**The independent oracle** is `tools/multimessenger-oracle/oracle-published.py` (`python3 -E`, re, datetime, Fractions,
astropy.time; no Gravitas code; sockets disabled in the script), its output pinned in `oracle-published.json` with the
sha256 of every file it read; the validator judges a leg against it only for those exact files. `oracle-astropy-times.json`
(B2) was pinned before the list existed.

**Amendments** (all in `authentic-thresholds.json`, before any run): AM5 the printed bound ends are strings and are parsed;
AM6 E1 stays as committed and is NOT RUN because of the onset definition; AM7 the three added legs B2b, B4o and E1b.

**Verdict.** None of B2, B4 or E1b fails; E1 and E3 are NOT RUN, each with its reason. The consumers rule is unchanged: no
lesson, panel or viewer was built, and nothing here lifts it. The synthetic path still carries the kilonova.

## Rights decisions (per source, 7.5 rule 4)

| Source | Intended form | Rights basis | Status |
| --- | --- | --- | --- |
| GWOSC strain and catalogue row of GW170817 | already packed (`gwosc-five-events`) | CC BY 4.0, recorded by the existing pack | in tree; unchanged |
| Burst trigger time and light curve (NASA archive) | one row of times; a binned light curve | the Fermi data policy page (retrieved 2026-11-06) says GBM data were never proprietary; no licence text beyond that, so only the trigger time and header keywords are kept | trigger header in `authentic/grb-trigger.json`; no light curve |
| Counterpart photometry | a CC BY paper's table | CC BY 4.0 accepted; **no paper's page has been retrieved, so no table is shipped** | the synthetic illustrative kilonova is the shipped path, labelled; request below |
| Galaxy catalogue subset | a subset within the localisation | none retrieved | synthetic field, labelled |
| Leap-second list | a table | the file states it is in the public domain (retrieved 2026-11-06) | `authentic/leap-seconds.list`, a test fixture; still no table embedded in the kernel |
| Published delay, distance, interval, bound | a few numbers with citation | arXiv non-exclusive distribution licence as read on the abstract page; numbers and citation only | `authentic/published-bound.json` and the supplement |

CC BY-SA is not accepted; CC BY-NC 3.0 IGO only through the existing labelled Gaia mechanism (not used here).

## Files requested from Carl

(1 to 3 arrived 2026-11-06 and ran B2, B4 and E1/E1b, see "Authentic-data legs"; only 4, the optional photometry, is still wanted.)

Put each under `tests/fixtures/multimessenger/authentic/` and add an entry for it to `SOURCES.json` there (source URL, the
terms as read with the page's text or a saved copy, the retrieval date). The legs read them as they arrive; nothing else
changes.

1. `leap-seconds.list`: the IERS/IANA/NIST plain-text list (comment lines, then `<NTP seconds> <TAI - UTC>` lines, with the
   `#$` and `#@` lines). Runs B2.
2. `published-bound.json`: from the paper that published the speed-of-gravity bound for this event, the numbers as printed with a locator each:
   `{"source": {...}, "delay": {"value", "sigma", "definition": "trigger-minus-merger" or the paper's own, "locator"},
   "distance": {"value", "which", "locator"}, "emissionDelay": {"min", "max", "locator"},
   "bound": {"lower", "upper", "printedSignificantFigures", "form", "locator"}}`. Runs B4 and, with 3, E1. The paper's text
   or PDF alongside it, so the definition of the delay is read, not assumed.
3. `grb-trigger.json`: the burst's instrument trigger time from the archive row or file header (Fermi GBM), `{"source": {archive, product, url, terms, retrieved}, "trigger": {"value", "system":
   "FERMI_MET" or "UTC", "definition": "instrument-trigger"}, "header": {the time keywords as printed}}`. A binned light
   curve is optional and only for a later lesson.
4. `kilonova-photometry.csv` (optional; the synthetic path stands without it): one CC BY paper's table with columns
   `mjd_utc,band,ab_mag,ab_mag_err,reference`, bands named `g` and `i` (and others by the radiation pack's ids), and its
   `SOURCES.json` entry naming the paper, the table, the licence as read and the retrieval date. Runs E3.

## Inherited limits to state in claims built on this kernel

Every scene, field and photometry set is synthetic; the kilonova parameters are illustrative; the authentic tier is run for B2, B4 and
E1b and is NOT RUN for E1 (the paper's delay is an onset) and E3 (no photometry); the host ranking and the completeness are self-consistent with the models they assume and say nothing
about the sky beyond them; the speed bound is only ever shown with its emission-delay assumption.

## References

Li, L.-X. and Paczynski, B. 1998, ApJ 507, L59 (the kilonova signal). Clopper, C. J. and Pearson, E. S. 1934, Biometrika 26,
404 (the exact binomial interval). The paper that published the bound is the external reference of B4 and is cited from the
supplied file, not from this document.

<!-- Listed in DOCUMENTS.md. -->
