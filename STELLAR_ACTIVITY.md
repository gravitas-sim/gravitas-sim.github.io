# Stellar rotation and flares (Prompt 220)

What a star's light curve says about how fast it spins and how active it is:
the period of the spot modulation with its factor-two alias kept in view, and
the flares with their equivalent durations and their frequency distribution.
Part A (this document) is the kernel, its validation, the packs and the
investigations. Part B (ages from the spin, flare energies in erg) is gated and
is recorded in [ACTIVITY_AGES_GATE.md](ACTIVITY_AGES_GATE.md) once measured;
nothing in Part A converts a period to an age or an equivalent duration to an
energy.

## Validation contract

The bounds are in `tests/fixtures/stellar-activity/thresholds.json`, committed
before the kernel, the oracle, the validator, any pack or any lesson existed.
A crossed bound is a failed check, recorded in
`tests/fixtures/stellar-activity/failed-legs.json` and left failing; only Carl
resets one. The legs follow section 7.5 rule 8:

- **(a) Analytic cases:** a spot at the disc centre against its closed form; a
  hemisphere-sized spot covers the whole disc; a spot behind the limb changes
  nothing and the deficit is continuous through the limb; exact periodicity and
  mirror symmetry; two antipodal equal spots have the half period; differential
  rotation changes the period of a spot to P_eq / (1 - k sin^2 lat); the flare
  template's integral (1.827046 amp t_1/2) and its conservation under exposure
  integration; the equivalent duration of a boxcar; the closed-form
  maximum-likelihood slope and its exact interval.
- **(b) Independent oracle:** `tools/stellar-activity-oracle/oracle.py`, which
  shares no code with the kernel: a brute-force sky-plane pixel integral for the
  spot flux; Astropy's `LombScargle` for the period; and an implementation of
  the flare rule written from its text with `scipy.signal.medfilt`.
- **(c) Ensemble coverage:** the stated 95 per cent interval of the period
  covers the truth on 200 seeded spotted stars; the equivalent-duration interval
  on 300 injected flares; the exact slope interval on 500 draws; injection and
  recovery completeness by amplitude and width.
- **(d) Misspecified and negative cases:** white noise returns "no signal"; a
  baseline under two cycles returns "not constrained"; a double-dip light curve
  returns the factor-two alias as a candidate, never one period; an evolving
  spot widens the interval; spot modulation alone raises no flare.
- **(e) Authentic data:** AU Mic (TESS sector 1) against the period of Gilbert et
  al. (2022) within its stated uncertainty; EK Draconis (sector 16) against the
  span of the literature values, whose disagreement is the differential rotation
  the model states as a limit; the flare rate of AU Mic against the published
  count as an applicability check.

## Kernel

`js/kernels/activity/` (pure; no DOM, no clock; the draws come from the named streams of Prompt 149):

- **`spots.js`:** `spotDeficit(gamma, rho, u1, u2)`, `spottedFlux(t, spec)`, `shearPeriods`. A circular spot of angular radius rho
  at angle gamma from the line of sight hides the integral of I(mu) mu over its visible part, with I(mu) = 1 - u1 (1 - mu) - u2 (1 - mu)^2.
  In polar coordinates about the spot's centre mu = a + b cos(phi) with a = cos(gamma) cos r and b = sin(gamma) sin r, so the azimuthal
  integral is a sum of closed-form integrals of cos^k(phi) over the visible arc and only the radial integral is numerical; it is split where
  the ring touches or leaves the limb and each piece is mapped to remove the square-root behaviour at its ends. The flux is
  1 - sum (1 - c_j) D_j / [pi (1 - u1/3 - u2/6)].
- **`rotation.js`:** `rotationPeriod(t, y)`: the Lomb-Scargle peak of `js/kernels/variables/period.js` (read unchanged), its false-alarm
  probability under white noise ((1 - z)^((N - 3)/2) per independent frequency), a four-harmonic refinement, a profile interval at 95 per cent for
  one parameter widened by sqrt((1 + r1) / (1 - r1)) for the residuals' lag-1 correlation, and the factor-two alias always among the candidates:
  verdicts `no-signal`, `not-constrained` (fewer than two cycles), `double-period` (the odd and even dips differ at p < 0.001, the peak is the
  half period) and `period-with-alias` (twice the peak is listed, marked untestable when the baseline holds fewer than two cycles of it).
  `rotationFromLightCurve` drops the upward outliers a flare-free quiescent model flags, bins to 30 minutes and searches.
- **`flares.js`:** the Davenport et al. (2014) template, `quiescentModel`, `detectFlares` (the form of the Chang et al. 2015 criteria, N1 = 3,
  N2 = 2, N3 = 3, this contract's choice), the equivalent duration with its uncertainty, `cumulativeFrequency`, `powerLawSlope` (maximum
  likelihood, exact interval from chi-square with 2 n degrees of freedom), `scanEdMin` and `completenessEd`. Each flare carries `edWindow`
  (the trapezoid over its window, the measured lower bound) and `ed` (the template fitted with a free local baseline, so the tail the noise hides is
  counted) with `edSigma` from 16 parametric-bootstrap refits times an empirical factor 1.35 (the bootstrap treats the quiescent model as exact;
  1.35 is the ratio measured on 180 injections unrelated to the validation ensemble).
- **`synthetic.js`:** `syntheticActivity(spec)`: spots, flares drawn from a power law in ED, noise, and the truth manifest.

### Assumptions and limits, stated where the kernel is used

- The period is that of the latitudes the spots occupy (differential rotation, here P_eq / (1 - k sin^2 lat), is a stated limit and not fitted); the
  interval is a floor: spot evolution moves the period by more than it says, which is why the widening factor is reported. On AU Mic it is 2.9 and
  on EK Draconis 6.2.
- The false-alarm probability assumes white noise; a star with correlated noise has a larger real one.
- A double-dip light curve cannot be told from a single dip at half the period unless the dips differ; photometry alone cannot, and the kernel says so.
- The equivalent duration is in the band (TESS, 600 to 1000 nm). Nothing here converts it to an energy: Part B was gated and its verdict is B
  (ACTIVITY_AGES_GATE.md, on the branch docs/activity-ages-gate; register row D-R10-220-90).
- A flare whose shape is not the template (several peaks) is fitted anyway; `fit.chi2` and `fit.dof` are how far from it.
- No spot evolution, no faculae, no penumbra; no 20-second cadence; the frame branch (Prompt 185) is not built.

## Data

Two TESS SPOC 2-minute light curves (public domain NASA/MAST data, acknowledgement requested), fetched by the coordinator and pinned
(D-R10-220-01): AU Microscopii sector 1 (TIC 441420236; `tess-au-mic-s1`, every kept 2-minute cadence, 17,687 rows; sidecar 189 KB, 90 KB
gzipped, in no precache tier) and EK Draconis sector 16 (TIC 159613900; `tess-ek-dra-s16`, 30-minute bins, 1,055 rows). Built by
`tools/data-packs/activity.mjs`; loaded by `js/activityData.js`.

## Results (`npm run activity:validate`, Node 24.4.0; the same on Node 22 is repeated at the milestone)

| Check | Status | Measured |
|---|---|---|
| A1.centre | pass | `{"maxRelativeError":1.2519904248926223e-14}` |
| A2.full | pass | `{"maxAbsError":5.551115123125783e-17}` |
| A3.hidden | pass | `{"hidden":0,"maxStepRelative":0.00015662522966348617}` |
| A4.periodic | pass | `{"maxAbsError":1.1102230246251565e-16}` |
| A5.antipodal | pass | `{"maxAbsError":2.220446049250313e-16,"peakRelativeError":0.00007048812758689849}` |
| A6.shear | pass | `{"maxAbsError":1.1102230246251565e-16,"Plat":3.398912778900547}` |
| A7.template | pass | `{"analyticRelative":6.509109355212395e-7,"numericRelative":8.286496551829841e-10,"sampledRelative":0.000011790739595591707}` |
| A8.edBox | pass | `{"ed":23.400000000000023,"truth":24,"relative":0.024999999999999023}` |
| A9.slope | pass | `{"alphaAbsError":0,"intervalAbsError":0.000009408328245141817,"interval":[1.193346077032802,1.8971827813764732]}` |
| B1.spotOracle | pass | `{"configs":24,"failures":0,"maxRelative":0.00266047409381066,"maxAbsolute":0.000005860390034917451}` |
| B2.periodogram | pass | `{"peakRelative":0.000019013940959479184,"maxPowerDifference":4.445450896284342e-9}` |
| B3.flareOracle | pass | `{"kernel":20,"oracle":20,"fracKernel":1,"fracOracle":1,"medianEd":0.000004543854121522649}` |
| B4.periodOracle | fail | `{"maxRelative":0.008400739228736754,"synthetic":0.008400739228736754,"authentic":{"auMic":0.001895033057851394,"ekDra":0.00207343814369544}}` |
| B5.harmonicOracle | pass | `{"maxRelative":2.2142763675347165e-9,"scope":"the three curves (the authentic series are in E1 and E3)"}` |
| C1.periodCoverage | pass | `{"coverage":0.9587628865979382,"answered":194,"n":200,"verdicts":{"period-with-alias":194,"no-signal":6}}` |
| C2.edCoverage | pass | `{"coverage":0.9366666666666666,"detectedFraction":0.9966777408637874,"injected":301}` |
| C3.slopeCoverage | pass | `{"coverage":0.948,"n":500}` |
| C4.completeness | pass | `{"table":[{"ampSigma":5,"tHalfMin":4,"completeness":0.08,"n":200},{"ampSigma":5,"tHalfMin":10,"completeness":0.675,"n":200},{"ampSigma":5,"tHalfMin...` |
| D1.noise | pass | `{"fraction":0.985}` |
| D2.shortBaseline | pass | `{"fraction":1}` |
| D3.doubleDipEqual | pass | `{"pairOk":100,"primaryOk":0,"peakOk":100,"excluded":0,"n":100}` |
| D4.doubleDipUnequal | fail | `{"pairOk":100,"primaryOk":100,"peakOk":0,"excluded":0,"n":100}` |
| D4b.doubleDipSlightlyUnequal | pass | `{"pairOk":100,"primaryOk":100,"peakOk":100,"excluded":100,"n":100}` |
| D5.evolving | pass | `{"medianEvolving":1.7108439665991644,"p95Stationary":1.034470309302196}` |
| D6.spotsNotFlares | pass | `{"fraction":1,"flaresFound":0}` |
| E1.auMicPeriod | pass | `{"verdict":"period-with-alias","period":4.856314477909049,"interval":[4.849217368505929,4.86341054558703],"widening":2.94650755486832,"candidates":...` |
| E3.ekDraPeriod | pass | `{"verdict":"period-with-alias","period":2.555118973372504,"interval":[2.5320302137594344,2.5785946524383867],"widening":6.244997998398396,"candidat...` |
| E2.auMicFlares | pass | `{"flares":76,"oracleFlares":69,"keptDays":24.56527777777778,"perDay":3.0937977045287495,"published":1.855,"sigma":0.00034028106882310954,"fracKerne...` |
| E4.auMicFfd | pass | `{"edMin":8.95260615828037,"n":29,"alpha":1.9195311335382335,"interval":[1.6158244316183263,2.2831516646726673],"flaresAbove":29}` |
| B5.authentic | pass | `{"auMic":[4.856314477909049,4.8563146455711115],"ekDra":[2.555118973372504,2.5551636408773115],"binsAuMic":1199}` |

Two legs fail and stay failing and labelled (`tests/fixtures/stellar-activity/failed-legs.json`): **B4** compares the kernel's refined period with the
oracle's sinusoid peak (the sinusoid peak is biased on a non-sinusoidal, sheared curve; the kernel's recovers the true period to 1e-4 and its
Lomb-Scargle peak agrees with the oracle's to 1e-5, B2), and **D4**, whose premise (the peak at half the period for radii 16 and 9 degrees) did not
hold (the peak was the period and the verdict correct). Five amendments (AM1 to AM5) were recorded in the thresholds file, none moving a bound:
the flare rule's quiescent mask and window end (found when C2 first measured coverage 0.05), the added legs B5 and D4b, and a second quiescent
stage in the oracle. C2's first run, before AM2, is in the file's history.

## Not built in this part

The panels, the investigations "How fast does the star spin?" and "Flares", their Spanish, instructor materials and the model-page section;
the sunspot and solar-rotation link (194's authentic leg e1.authentic.G2 fails, 12.4 against 13.9 deg/day, and no sunspot-number series ships).
