# The pulsar kernel: dispersion and folding (Prompt 242, Part A)

Find a pulsar's period and its dispersion measure in a dynamic spectrum, and say how well. This is the kernel part of
Part A of Prompt 242 (an invisible pull request: no panel, no lesson, no instructor material, nothing a student sees). It
adds the pulsar side of `js/kernels/radio/` (eleven modules, `pulsar*.js` and `dispersion.js`), its validator
`tools/pulsar-validate.mjs`, an independent oracle `tools/pulsar-oracle/`, a validation group of six checks, and the
fixtures under `tests/fixtures/pulsars/`. The pulsar panel, "A lighthouse in radio" and the model-page section are a
separate instructional pull request that waits for Carl's go-ahead; Part B (the timing model and its independent
reference, the interferometer concept; gate `docs/pulsar-timing-gate`) is a separate gate pull request and is not built.

The validation contract was committed first, in `tests/fixtures/pulsars/thresholds.json`, before any kernel, oracle
output, series or result existed. This document was written after it. A crossed bound is a failed leg and stays failing;
only Carl resets one. **The recorded run has 1 failing legs, explained below and left failing.** No
consumers rule was committed beforehand (as for 236 and 241), so the panel and the lesson wait for Carl whatever the table
says.

## What is built and what is not

Built: (1) the dispersion delay `t = K DM / f^2`, the sweep between two frequencies, the DM from a sweep and the
intra-channel smearing, with the constant `K` **derived, not typed**; (2) de-dispersion of a dynamic spectrum by shifting
channels (nearest sample, which keeps white noise white, or linear) and the channel sum; (3) folding of a series and of
every channel at a period, the fold statistic (chi-square on `nbin - 1` degrees of freedom) with its single-trial and
trial-corrected probabilities, and a period search on a grid uniform in frequency; (4) the period with an interval from the
phase drift of eight sub-integrations of whole pulses; (5) the period from the existing Lomb-Scargle periodogram
(`js/kernels/variables/period.js`) of the de-dispersed series; (6) the dispersion measure: a coarse search by the
harmonic-summed Fourier power of the de-dispersed sum over a grid of trial DMs, then a refinement from per-channel pulse
arrival times (Fourier matched filter against a leave-one-out template, a weighted line of arrival time against `1 / f^2`)
with an interval from the statistics kernel and the single-frequency refusal; (7) the distance `DM / n_e` under a stated
constant electron density, labelled; (8) a labelled synthetic dynamic-spectrum generator with a truth manifest, and a way
to take a pulsar's period and DM from a row of the NANOGrav pack.

Not built, on purpose: the panel (dynamic spectrum through the image panel, the de-dispersion control behind the
disclosure with the DM visible, the fold), the lesson, instructor materials and a model-page section; Part B; **any pack**
(packs have 0 B of room and every pulse-series row of `RADIO_DATA_GATE.md` is C, so the generator is the pack, and it is
code); spin-down, binary motion, scattering, scintillation, interference, polarisation, coherent de-dispersion, and a
blind search over spin-down or acceleration.

## The dispersion constant

A pulse crossing cold, unmagnetised plasma arrives later at a lower frequency by `K DM / f^2`, `DM` the integral of the
electron density along the path. In SI, `K = e^2 / (8 pi^2 eps0 m_e c) = alpha h / (4 pi^2 m_e)` (using
`e^2 / (4 pi eps0) = alpha hbar c`); one pc/cm3 is `PC_M x 1e6` electrons per m^2 and `1 / Hz^2 = 1e-12 / MHz^2`, which
gives `K` in seconds times MHz^2 per (pc/cm3). `h` is exact and the parsec is the IAU's. The two measured inputs, the
fine-structure constant and the electron mass, are **not typed**: `tools/pulsar-oracle/constants.py` reads them from the
`astropy.constants` that is installed (its own reference string, "CODATA 2018", and uncertainty), offline, into
`tests/fixtures/pulsars/constants-source.json`, and the module copies them from that file (a test holds them equal). That
edition may not be the current one; the effect on `K` is of order 1e-9. The oracle's own route, `e^2 / (8 pi^2 eps0 m_e c)`
from astropy's `e`, `eps0`, `m_e` and `c`, agrees with the module to 3.0e-12 relative (leg B1). **The constant the module holds is
4148.806423902492 s MHz^2 / (pc cm^-3)**, a computed number, written here from the run and not from a source.

A timing package may report a DM under a rounded conventional constant instead; a DM is only a number of the constant it
was fitted with. Every function takes `constant` and every result names it. Which convention the NANOGrav pack's DMs were
reported under is not stated in the files (the par files state no unit either), and is a question for Carl below.

## The synthetic series

An invented pulsar of period `P` and DM, a periodic profile of Gaussian components (default one, sigma 0.03 turn), observed
in 16 channels across 1200 to 1500 MHz (channel centres `fLo + (i + 1/2) df`, ascending) at 2 ms for 12 s, each sample
point-sampled at `j dt`, with white Gaussian noise of unit variance per sample from the named stream `noise`. The pulse
leaving at `(n + phase0) P` arrives in a channel at `(n + phase0) P + K DM / f^2`; intra-channel smearing is modelled by
averaging the delayed pulse over four equal sub-bands of a channel (one sub-band, the exact centre delay, in the analytic
legs). The label reads "SYNTHETIC PULSAR SERIES: an invented pulsar observed by an invented receiver ... not a measurement
of any pulsar". The truth manifest carries the period, DM, constant, phase, profile, sub-bands, noise, seed, the delay and
smearing of every channel, the sweep and its size in turns, and the expected signal-to-noise of every channel. The band, the
sampling and every parameter are round invented values.

## What the analysis does (PULSAR-RULE-1)

The rule is in `thresholds.json` (`analysisRule`, with ten amendments listed below); in words:

1. **Noise per channel** from the successive differences (1.4826 times the median absolute deviation over the square root
   of two): white noise assumed, and a pulse's sharp edges are outliers the median ignores.
2. **Coarse DM.** On a grid of trial DMs with step `(P_guess / 128) / (K |1/f_lo^2 - 1/f_hi^2|)`, de-disperse by nearest
   shifts, take the channel sum, remove its mean, zero-pad to a power of two at least twice its length, Fourier transform,
   and sum over four harmonics the largest power within `ceil(h / 2)` bins of each harmonic of the fundamental; the trial's
   value is the maximum over fundamentals in the period range. The best trial is refined by a parabola. A band so narrow that
   even the largest DM of the range sweeps under 1/128 of the period is refused `not-constrained` before any search.
3. **Period search.** The de-dispersed sum is folded at trial frequencies on a grid of spacing `1 / (T nbin 2)`; the
   statistic `chi2 = sum n_b (m_b - mean)^2 / sigma^2` has `nbin - 1` degrees of freedom for white noise and its survival
   function is the single-trial probability, multiplied by the number of trials (grid size times the number of trial DMs) and
   capped at 1: the **trial-corrected probability**, conservative and never below the single-trial one. At or above 1e-3 the
   analysis is refused `no-pulsar`. The period is the grid maximum (amendment AM5).
4. **Arrival phases.** Each channel is folded at the period, aligned at the current DM by its Fourier phase factor, and its
   phase against a template made of **all the other channels** (leave-one-out) is found by a matched filter in the Fourier
   domain: the maximum of `Re sum_k P_k conj(T_k) exp(2 pi i k phi)` over harmonics `k` whose template power exceeds nine
   times the template's noise, by a scan and bisection on the analytic derivative; the phase variance is
   `(v + a^2 v_T) / (a^2 (2 pi)^2 sum k^2 |T_k|^2)` with the template's own noise `v_T` included. A channel is used above
   signal-to-noise 5.
5. **DM line.** A weighted line of arrival time against `K / f^2` with an intercept over four or more used channels, iterated
   (the leave-one-out template makes each step overshoot by `n / (n - 1)`, so the iteration is run to convergence, not
   once). The DM standard deviation is the covariance's scaled by `sqrt(max(1, chi2 / dof))`; residuals that do not fit a line
   are flagged; the interval is the statistics kernel's `covarianceInterval`; if the 95 percent interval is wider than the
   search range the DM is refused `not-constrained`.
6. **Period interval.** Eight sub-integrations of whole pulses, aligned at the DM and summed over channels, each matched to a
   template of the other seven; a weighted line of phase against time gives a frequency offset `s`, `P_new = P / (1 - s P)`,
   two passes; the slope is multiplied by `(M - 1) / M` because the leave-one-out template makes it `M / (M - 1)` too steep
   (AM3), and the standard deviation is `P^2 sigma_s` scaled as above.

**Refusals, by code and in this order** (AM4): `no-pulsar`, `dm-at-range-edge`, `ambiguous-dm` (a second, separate maximum
of the coarse statistic outside the main lobe reaches 0.9 of the first's excess over the median), `period-at-range-edge`,
then the refinement's `too-few-channels` (under four channels carry a pulse above signal-to-noise 5), `not-constrained`
(a single frequency, a band too narrow, an interval wider than the range) and `too-few-subintegrations`; bad inputs throw a
`RadioError` with `bad-argument`, `bad-range` or `bad-frequencies`. A series at one frequency returns the period and refuses
the DM (`partial`).

**What it assumes.** White Gaussian noise of constant variance per channel; a profile of the same shape (up to scale) in
every channel; a delay of exactly `K DM / f^2`; a period constant over the observation; intra-channel smearing treated as
part of the profile and not corrected. A frequency-dependent profile moves the arrival time the way a DM does and cannot be
told from it: the residual diagnostic sees only what does not fit a line (leg R2 shows how far).

## The DM distance

`DM / n_e` for a stated uniform electron density, always with the label **"crude; assumes this electron density"**, the
density and its source in the result. The density has no default: a number typed here would be a published value from
memory, so a call without a density and its citation is refused (`missing-density`). A density range gives a distance
range. It is an order of magnitude: the electrons lie in a thin layer with arms and clumps, and a uniform density along the
whole path ignores all of it. **A cited density is a question for Carl** (below); no pulsar distance is claimed anywhere.

## Validation contract and measured table

Run `npm run pulsar:validate` (about ten minutes: the ensembles). The oracle (`tools/pulsar-oracle/oracle.py`, run
offline) regenerates every series with its own forward model and a Python port of the named random stream, and
re-implements the stated rules in numpy and scipy (`np.fft` for the harmonics, `scipy.optimize` for the arrival phases and
`np.linalg.lstsq` for the lines), with astropy for the constant and for the Lomb-Scargle power; it reads no Gravitas code.
Recorded run (Node 22.23.4; numpy 1.26.4, scipy 1.13.1, astropy 6.0.1 for the oracle run): 30 rows, 24 pass, **1 fail**, 3 reported, 2 not run.

| Leg | What | Result |
| --- | --- | --- |
| A1 | dispersion law: ratio, linear, sweep, inverse, units, refusals | pass (1.2e-15) |
| A2 | the constant equals the one derived from the pinned reading | pass (relative 0) |
| A3 | intra-channel smearing: identity and formula | pass (1.8e-16; formula departure 9.5e-5 of its bound 1.2e-4, AM6) |
| A4 | noise-free de-dispersion: centroid, conservation, fold statistic | pass (centroid 1.1e-4 turn linear, 1.1e-3 nearest; conservation 4.8e-15; statistic ratio 2.48) |
| A5 | noise-free period, six analytic worlds, bound 2e-6 relative | **FAIL**: worst 2.53e-6 (series 3 of 6); the other five 0.4e-6 to 1.1e-6; Lomb-Scargle within 0.005 of its peak width |
| A6 | noise-free DM, six worlds, bound 0.05 pc/cm3 | pass (worst 0.030) |
| A7 | fold statistic calibration under noise | pass (mean over dof 0.988; 4.75 percent below p = 0.05) |
| A8 | DM distance, label, range, refusals | pass |
| B1 | the constant against astropy's own route | pass (3.0e-12) |
| B2 | Lomb-Scargle power against astropy | pass (1.3e-13; 40 periods) |
| B3 | de-dispersion and folding against numpy, 16 channels | pass (3.3e-11 of the peak; statistic 2.6e-10) |
| B4 | DM measurement against numpy and scipy, 24 series | pass (1.7e-7 pc/cm3) |
| B5 | period and its interval against numpy and scipy | pass (3.9e-11 relative; sigma 2.6e-7) |
| B6 | a pinned toolkit's output | NOT RUN (see Rights) |
| C1 | DM interval coverage, 200 realisations | pass (0.695 at 68.27, 0.940 at 95, none refused) |
| C2 | period interval coverage, 200 realisations | pass (0.665, 0.940) |
| C3 | false alarm, 200 noise-only series | pass (all 200 refused `no-pulsar`, none returned a number) |
| C4 | blind recovery, six worlds | pass (6 of 6 inside 95 percent, both quantities) |
| C5 | detection power by amplitude | reported (full result: 100 percent at amplitude 1 and 0.5, 22.5 percent at 0.25; never a false number) |
| D1 | one frequency, narrow band | pass (partial period; DM refused `not-constrained`) |
| D2 | noise only | pass (`no-pulsar`, trial-corrected p 1, 412,723 trials) |
| D3 | DM outside the search range | pass (`dm-at-range-edge`) |
| D4 | wrong period range | pass (`no-pulsar`) |
| D5 | two channels | pass (`too-few-channels`) |
| D6 | bad inputs | pass (typed errors by code) |
| D7 | label and manifest complete | pass |
| E1 | an authentic series against a catalogue value | NOT RUN (see Rights) |
| E2 | the six NANOGrav-pack rows as parameters of synthetic series | pass (6 of 6 analysed, DM inside 95 percent; recovery, not authenticity) |
| R1 | smearing bias, 16 and 64 channels, 1 and 4 sub-bands | reported (mean z -0.23 to 0.13; sd z 0.82 to 1.04) |
| R2 | profile evolution with frequency | reported (mean z 0.50, sd 1.08; none flagged structured: it moves the DM the way a DM does) |

**The failing leg, left failing.** A5 asks the fold search plus the sub-integration refinement to recover the period of
six noise-free analytic series to a relative 2e-6; five do (0.4e-6 to 1.1e-6) and one (series 3) reaches 2.53e-6. The cause
is not found beyond this: the fold statistic is ragged below the grid (AM5), so the grid maximum is a quantised estimate and
the eight whole-pulse sub-integrations (AM10) quantise the samples again; a noise-free series has no noise to average the
quantisation out. I did not tune the kernel or the worlds to this leg, and the bound is not moved (the committed rule
is that only Carl resets one). The same kernel recovers the period inside its stated interval in every ensemble (C2 0.940 at
95 percent) and the oracle agrees with it to 4e-11 (B5), so the failure is the noise-free floor, not a wrong answer. Options
for Carl: reset the bound to 3e-6 with this record as the reason, or ask for an unbinned fit of the arrival times as a
replacement for the sub-integration slope (a design change, a new amendment); either way it is his to decide.

**The amendments, each recorded in `thresholds.json` with its reason. AM1 to AM8 were made before any validator existed; AM9 and AM10 were made after two partial validator runs and say so, with those runs' numbers:**
- AM1 (S4): the coarse DM statistic is the harmonic-summed Fourier power of the channel sum, not its variance (one design run on the design seed: the variance lobe was about 35 pc/cm3 wide and was refused as ambiguous).
- AM2 (E2): E2's search ranges, fixed before any run: DM within 10 of the catalogue row, period within 0.8 to 1.25 of the catalogue value (so E2 is not authentic).
- AM3 (S9): the sub-integration slope carries the factor (M - 1) / M that the leave-one-out template makes necessary (a derivation).
- AM4 (S4, S5): refusal precedence, `no-pulsar` first, so noise-only says so and not an arbitrary DM edge.
- AM5 (S5): the period is the grid maximum; golden-section refinement is dropped because it settled on different local maxima from the oracle's (a design change after seeing a kernel output, recorded as such).
- AM6 to AM8 (A3, A4): three arithmetic slips in committed bounds (a bound of 5e-5 from a 64-channel width; 6e-4 for one standard deviation of the nearest-sample error; a misalignment of 2 pulse widths that no kernel could meet), corrected on re-reading before the validator existed; no result involved.
- AM9 (instrument): the committed analytic periods 0.2, 0.25, 0.29 and 0.3 are whole numbers of samples, which phase-locks the sampling to the pulsar; changed after a first partial validator run (A, B, D) that showed it, with that run's numbers recorded in the amendment.
- AM10 (instrument, S9): the analytic periods follow a rule (0.2 + 0.1 frac(k (sqrt 5 - 1) / 2)) rather than my choice, and the sub-integrations hold whole pulses; changed after a second partial run (A5, A6) that showed a lattice artifact, evidence recorded.

## Rights and the authentic leg (7.5 rule 4)

Nothing was fetched, no catalogue, survey or paper value was typed, and no tool was installed. `RADIO_DATA_GATE.md`
(merged) is binding: rows P1 to P3 and K1a to K1c are C, so by Prompt 242's run condition the labelled synthetic generator
is the pack, and leg E1 (an authentic series against a catalogue value) and leg B6 (a pinned toolkit output) are NOT RUN. The
one row that passes, 16 (the NANOGrav 15-year table of periods and DMs, packed by 240), has no series in it; leg E2 uses its
periods and DMs as the parameters of synthetic series, which tests recovery, not authenticity.

**What Carl would supply to run the legs:**
(1) **E1.** A dynamic spectrum or a folded profile of one pulsar with its source, licence and a catalogue period and DM read
from the same source (a Parkes or MeerKAT archive file, or a profile of the European Pulsar Network's database), in
`tests/fixtures/pulsars/authentic/` with `{source, retrieved, licence, period, periodUnit, dm, dmUnit, constant}` and the
series as `float32` channel-major with `{nchan, nsamp, dt, frequenciesMHz}`; the validator is not yet written to read it and
says NOT RUN until it exists. The DM's constant matters: say which one the catalogue used.
(2) **B6.** `node tools/pulsar-oracle/export-series.mjs <directory>` writes the B3 series (raw float32 and a JSON header with
the truth); run a pulsar toolkit of your choice (a de-dispersion and folding package such as PRESTO or dspsr, which are named
here as examples and were not run) on it and write `tests/fixtures/pulsars/toolkit/result.json` as `{toolkit, version,
command, dm, period, periodSigma, profile: [..]}`; the leg will compare the period to the kernel's interval and the folded
profile to the kernel's.

## Open questions for Carl

1. **Reset A5 or change the method?** Leg A5 fails at 2.53e-6 against 2e-6 (above). Reset the bound, or ask for an unbinned arrival-time fit?
2. **The electron density for the distance.** `dmDistance` refuses without a cited density; none is typed here. Which value and source do you want a lesson or panel to use (the NE2001 and YMW16 models are not used; a uniform density is crude)? Until you name one, no pulsar distance is claimed.
3. **Which constant did the NANOGrav DMs use?** The pack and par files do not say; the kernel takes `constant` and names it. A statement from the source would settle whether the E2 rows' DMs are comparable.
4. **E1 and B6** wait for the files described in the Rights section (RADIO_DATA_GATE rows P1 to P3 and K1a to K1c are C).
5. **The panel and the lesson** ("A lighthouse in radio", the dynamic spectrum through the image panel, de-dispersion behind the disclosure with the DM shown) wait for your go-ahead: no consumers rule was committed. The Part B gate pull request (`docs/pulsar-timing-gate`) is the next separate piece.

## Inherited limits to state in claims built on this kernel

Every series here is synthetic: invented pulsars, an invented receiver, white noise, one profile shape in every channel and
a constant period; the authentic tier is NOT RUN. A result is a demonstration of the method on a fixed band, not a
measurement of a pulsar. The DM interval is the interval of a fit of arrival times to a `1 / f^2` law under the stated noise;
real data have scattering, scintillation, profile evolution and interference that the kernel does not see (leg R2 shows what
profile evolution does). A DM is a number of the constant it was fitted with. The distance is a crude order of magnitude under
a density the caller must cite. The period interval assumes a constant period: spin-down and binary motion would bias it
and are Part B and later.

## References

The delay law and the dispersion measure are textbook plasma physics, derived here from `alpha`, `h` and `m_e`. The
matched-filter arrival phase is Taylor's frequency-domain template matching (J. H. Taylor, 1992; the journal reference is
not in the tree and was not verified, so none is given), re-derived here with the template's own noise included and not copied from a code. The Lomb-Scargle power is Lomb 1976 and
Scargle 1982 (as `js/kernels/variables/period.js` cites them). `DECISION_REGISTER.md` D-R10-239-xx (`RADIO_DATA_GATE.md`),
D-R10-240-xx (the NANOGrav pack, `DATA_PACKS.md`) and D-R10-242-01 to -05.

<!-- Listed in DOCUMENTS.md. -->
