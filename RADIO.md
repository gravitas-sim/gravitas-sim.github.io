# The HI spectroscopy pathway: kernel and validation (Prompt 241)

Map the Galaxy's rotation from the hydrogen line, on a stated set of sightlines. This is the kernel part of Prompt 241
(an invisible pull request: no page, no viewer mode, no lesson, no instructor material, nothing a student sees). It adds
`js/kernels/radio/`, its validator `tools/radio-validate.mjs`, an independent oracle `tools/radio-oracle/`, a validation
group of six checks, and the fixtures under `tests/fixtures/radio/`. The spectra viewer's radio mode, the tangent-point
tool, the investigations ("The hydrogen line", "The rotation curve from scratch") and the model-page section are a separate
instructional pull request that waits for Carl's go-ahead. The pulsar kernel of Prompt 242 has joined this directory (`pulsar*.js`
and `dispersion.js`, with its own contract, oracle and table in [PULSARS.md](PULSARS.md)); nothing in it shares a leg or a
bound with the HI legs below.

The validation contract was committed first, in `tests/fixtures/radio/thresholds.json`, before any kernel, oracle output,
spectrum or result existed. This document was written after it. A crossed bound is a failed leg and stays failing; only
Carl resets one. **The recorded run has two failing legs (A1, C2), explained below and left failing.**

## What is built and what is not

Built: (1) the 21-cm rest frequency and the radio, optical and relativistic Doppler conventions on a frequency axis;
(2) the heliocentric to LSR velocity transform, with the two values of D-GAIA-03 kept as options and shown; (3) the fixed
longitude mask, the geometry of a sightline in an axisymmetric Galaxy, the tangent point and its refusals; (4) the
terminal-velocity edge rule, with the offset caused by the gas's random motions computed from the universal shape of a
smoothed tangent edge; (5) the circular speed at the tangent radius with a 68.27 and 95 percent interval from the
statistics kernel; (6) the column density from the integrated line under the optically thin assumption, with an opacity
diagnostic; (7) a synthetic HI spectrum generator with its truth manifest and label.

Not built, on purpose: the viewer, the sightline selector and the tangent-point tool (the 150 record) of part 2 of the
prompt, both investigations, instructor materials, a model-page section; **any pack** (packs have 0 B of room and every HI
row of `RADIO_DATA_GATE.md` is C, so the synthetic generator is the pack, and it is code); any fit outside the mask;
non-circular motions, a warp, a bar, gas off the plane (b is 0 on the mask); self-absorption beyond the opacity diagnostic;
correlated noise; baselines and stray radiation.

## What a spectrum measures

**Frequency to velocity.** A line observed at frequency f has the radio-convention velocity v = c (1 - f / f0), positive
receding, f0 the rest frequency; the optical convention is c (f0 / f - 1) and the relativistic c (f0^2 - f^2) / (f0^2 + f^2).
HI surveys use the radio convention and the kernel's default is the radio one. The three differ by about 1e-4 km/s at 5 km/s
and, optical against radio, by 0.3 km/s at 300 km/s; the result record names the convention.

**Heliocentric to LSR.** v_LSR = v_helio + (U cos l + V sin l) cos b + W sin b, with (U, V, W) the Sun's velocity relative to
the local standard of rest. There is no single value. D-GAIA-03 keeps two and chooses neither, and so does this kernel:
`schonrich` is (11.1, 12.24, 7.25) km/s (Schonrich, Binney and Dehnen 2010, as `js/galactic/model.js` holds it) and
`stromberg` keeps their U and W and takes V = 3.77 km/s, the Stromberg-corrected value of the register row; `none` leaves the
velocity heliocentric, and a caller may pass its own (U, V, W). Every tangent-point record shows the option, the shift it
applied, and what the circular speed would have been under each of the three.

**What the choice does (A8, exact).** In the first quadrant the circular speed at the tangent radius is
v_t(helio) + U cos l + V sin l + Theta0 sin l; in the fourth it is -v_t(helio) - U cos l + V |sin l| + Theta0 |sin l|. So a
change of the Sun's V is indistinguishable from a change of Theta0: the method measures Theta0 + V at each longitude and
nothing separates them. A change of U is different: it moves the two quadrants in opposite directions, an asymmetry between
them. The kernel does not hide this; it returns the three alternatives beside the answer.

**Geometry.** For gas on circular orbits with speed Theta(R) about the centre, the Sun at R0 moving at Theta0, a line of
sight at (l, b) has v = (Theta(R) R0 / R - Theta0) sin l cos b with R^2 = R0^2 + (d cos b)^2 - 2 R0 d cos b cos l. Inside the
solar circle (cos l > 0) the smallest R along the line is R0 |sin l|, at distance R0 cos l: the tangent point. There |v| is
largest when Theta / R falls with R (the kernel checks this for a curve: solid-body rotation fails it), so
Theta(R_t) = |v_t| + Theta0 |sin l|. No distance is needed. At or beyond 90 degrees there is no tangent point
(`no-tangent-point`).

**The fixed longitude mask.** l = 20, 25, ..., 65 and 295, 300, ..., 340 degrees, b = 0. Inside 20 degrees the tangent
radius is under 0.35 R0 and an axisymmetric circular model is not claimed; past 65 degrees the terminal velocity is within
a few gas dispersions of zero and the edge cannot be separated from the local gas. Any other longitude or latitude is
refused (`outside-mask`); the kernel never fits outside the mask. At a gas dispersion of 8 km/s the edge rule itself stops
at 60 degrees and 300 degrees (the two outermost sightlines are refused by E7; amendment AM1).

## The terminal-velocity edge rule

Near the tangent point v(d) = v_t - a (d - d_t)^2 / 2, so the gas per unit velocity goes as (v_t - v)^(-1/2): a spike at
the edge. Random motions of dispersion sigma_v smooth it. With x measured outward from the true edge in units of sigma_v,
the smoothed profile is g(x) = 2 integral_0^inf phi(x + t^2) dt (phi the standard normal; the substitution s = t^2 removes
the singularity). It is universal, so the point where it falls to a fraction f of its own peak lies a fixed distance c_f
sigma_v beyond the true edge: for f = 1/2, c_f = 0.6977, the peak is at x = -0.765 and g(0) = 2^(-3/4) Gamma(1/4) / sqrt(2
pi) exactly. The rule (committed before the kernel existed):

1. the terminal side: x = s v_LSR with s = +1 in the first quadrant, -1 in the fourth;
2. the noise from the caller, else 1.4826 times the median absolute deviation of the outermost tenth of the channels;
3. x_out, the end of the outermost run of three channels all above max(5 sigma_n, 1e-3 of the side's maximum);
4. the peak T_pk in [x_out - 5 sigma_v, x_out], refused (`edge-not-significant`) under 10 sigma_n;
5. x_e, the outermost crossing of T = T_pk / 2 by linear interpolation;
6. x_t = x_e - c_f sigma_v;
7. refused (`edge-not-separable`) if x_t is under 3 sigma_v.

It assumes uniform gas density near the tangent point, a Gaussian dispersion that is known (a stated input with its own
uncertainty), circular orbits, and an optically thin line. A saturated line moves the edge (R1); gas that does not reach the
tangent point moves it a long way (R2).

## The interval

sigma_Theta^2 = sigma_x^2 + (w / sqrt(12))^2 + (c_f sigma_sigmaV)^2 + (tau sigma_v)^2 + (sin l sigma_Theta0)^2: the noise
position of the crossing (from the slope over five channels), the channel width, the uncertainty of the assumed gas
dispersion carried through c_f, a shape term tau for the departure of a real edge from the universal one, and the
uncertainty of Theta0. The interval is the statistics kernel's `covarianceInterval`. The shape term tau = 0.05 is the one
calibrated number: it was written provisionally as 0.25 and set to 0.05 (AM2) from a noise-free design run, the maximum
departure of the recovered speed from the world's being 0.049 sigma_v. R0's uncertainty moves the point along the curve (R_t
= R0 |sin l|), not its height, and is a separate output. On the recorded ensemble the dispersion term carries 68 percent of
the variance, the shape term 16, the channel term 15 and the noise 1: **the measurement is limited by the assumed gas
dispersion, not by noise**, which is also true of real data.

## Column density

For an optically thin line, N = (32 pi k nu0^2 / (3 h c^3 A10)) integral T_B dv, about 1.81e18 cm^-2 per K km/s, computed
from the line's two atomic constants and the exact SI constants (never typed). It assumes the upper level holds three
quarters of the atoms. The thin assumption fails when the line is not thin: for a slab at spin temperature T_s the peak
optical depth is tau = -ln(1 - T_peak / T_s), and the thin estimate falls short at the peak by tau / (1 - e^-tau). The
kernel states the assumption failed when tau exceeds 0.1 (about 5 percent at the peak), returns no column when the peak
reaches T_s, and says "opacity not assessed" when it was given no spin temperature. Layered gas and cold clouds make the
thin estimate worse than the slab bound; the diagnostic is a floor on the problem.

## Synthetic spectra

A world is a rotation curve Theta(R) = Theta0 k (R / sqrt(R^2 + Rc^2)) (R / R0)^alpha (flat, rising or falling by alpha),
gas of constant density between two radii, a Gaussian dispersion, an optional spin temperature that makes the radiative
transfer exact (foreground absorption included), white noise from the named stream `noise`, on a channel axis uniform in
frequency. Every spectrum carries the label "SYNTHETIC HI SPECTRUM: an invented world ... not a measurement of the Galaxy"
and a truth manifest (tangent radius and distance, terminal velocity, the circular speed at the tangent radius, the LSR
shift, the column on the sightline, the seed). The six worlds of the contract: three curves, gas dispersion 5 and 8 km/s,
R0 = 8 kpc and Theta0 = 220 km/s (round values of an invented world, not published ones).

## Validation contract and measured table

Run `npm run radio:validate` (about five seconds). The oracle (`tools/radio-oracle/oracle.py`, run offline) uses astropy's
Doppler equivalencies, numpy for the line of sight and the forward model (a matrix over distance and channel on a finer grid,
cumulative optical depth by cumsum), scipy for the edge shape, and re-implements the stated rules; it reads no Gravitas code.
Recorded run (Node 22.23.4; numpy 1.26.4, scipy 1.13.1, astropy 5.3.2 for the oracle run): 23 rows, 16 pass, 2 FAIL, 3
reported, 2 not run, byte-reproducible.

| Leg | What | Result |
|---|---|---|
| A1 | Doppler scale | **FAIL**: the relative 1e-12 round-trip bound is below double precision (see below); the rest of the leg holds |
| A2 | LSR transform and options | pass (1e-15) |
| A3 | geometry, tangent maximum by search | pass (2e-13 km/s; distance 1.8e-7 kpc) |
| A4 | mask and refusals | pass |
| A5 | thin column against the generator | pass (7e-14; channel-width pair 2e-15) |
| A6 | universal edge, closed form | pass (g(0) to 6e-15) |
| A7 | recovery, noise-free narrow lines | pass (0.0008 km/s against 0.3) |
| A8 | LSR choice moves the answer exactly | pass (3e-14) |
| B1 | Doppler against astropy | pass (3e-11 km/s) |
| B2 | line of sight against numpy and scipy | pass (1e-13) |
| B3 | forward model against numpy | pass (thin 2.4e-4 of peak, thick 3.5e-4) |
| B4 | analysis against numpy (24 spectra, noisy) | pass (2e-13 km/s; interval widths 5e-15) |
| B5 | column coefficient and column | pass (3e-16, 9e-16) |
| B6 | edge shape against scipy | pass (3e-14) |
| B7 | a published tangent-velocity table | NOT RUN: none read (gate row 05 is C) |
| C1 | coverage on 2,827 intervals, gas dispersion drawn wrong | pass: 0.759 at 68.27 percent (band 0.60 to 0.76), 0.980 at 95 (0.90 to 0.99) |
| C2 | the same with Theta0 wrong by 8 km/s sd | **FAIL**: coverage 0.687 and 0.954 are in band, but one realisation was refused outside the allowance |
| C3 | detail | reported: coverage 0.769 (first quadrant) and 0.749 (fourth); 0.792 at 5 km/s dispersion and 0.722 at 8; median absolute error 0.46 km/s |
| D1 | refusals (no signal, not separable, bad axis, bad spectrum, missing assumptions) | pass |
| D2 | opacity diagnostic | pass (thin world 2.1 percent low and "ok"; thick world "thin assumption fails", tau 1.9, the gas 1.6 times the estimate) |
| R1 | opacity on the edge | reported: errors -0.1 km/s thin, up to 2.4 km/s in the thick world |
| R2 | streaming and a hole | reported: radial streaming of 7 km/s changes the answer by 0.13 km/s (the radial component is zero at the tangent point); a gas disk that begins at 1.1 R_t is wrong by -20 to -22 km/s |
| E1 | the HI pack against a published curve | NOT RUN: no HI spectrum in the tree |

**The two failures, left failing.** *A1:* the committed bound of 1e-12 relative on the velocity-to-frequency-to-velocity round
trip is below what a double holds for a 1.42 GHz frequency (spacing 2.4e-7 Hz, which is 5.0e-11 km/s; relative to the
smallest velocity tested, 6.1 km/s, about 8e-12). The measured 4.9e-12 is that floor. Everything else in the leg (zero at
the rest frequency, the sign, the optical identity to 5e-11 km/s, the ordering of the three conventions) holds. The
achievable bound is 1e-10 km/s absolute, and only Carl resets one. The validation group's own Doppler check uses it and
passes. *C2:* the amended refusal allowance (AM1) said a realisation refused by rule E7 is expected where the truth terminal
speed is under 3.2 times the assumed gas dispersion; one realisation (world rising:8, l = 55, repetition 19) drew an assumed
dispersion 2.2 standard deviations high (11.1 km/s), which lowers the recovered terminal speed by about c_f times the
excess, and was refused at 3.216 times (limit 3.2). The rule behaved as committed; the allowance I wrote was too tight for
the tail. The coverage measured on the other 2,837 intervals is in band. A better allowance would predict the refusal
from the draw itself (x_t = truth + c_f (sigma - sigma_assumed) under 3 sigma_assumed); I may not set it after the result.

**Amendments, all before any run** (`thresholds.json`, "amendments"): AM1 (the refusal allowance of C1 and C2: the legs said
none and rule E7 refuses at 8 km/s dispersion on the two outermost sightlines), AM2 (the shape term, set from the design
run), AM3 (the oracle finds the peak of the edge as the root of the derivative, because a flat maximum cannot be located by
comparing values to 1e-7), AM4 (the outer fraction made an explicit key), AM5 (A5's channel-width pair is at 2 km/s because
a 0.5 km/s line sampled at 1 km/s has a trapezoid error of 1.5e-2, and R2's second case is a hole because a gas disk ending
inside the tangent radius leaves a sightline with no gas).

## Rights and the authentic leg (7.5 rule 4)

Nothing was fetched and no survey, table or paper value was typed. `RADIO_DATA_GATE.md` (merged) is binding: rows 01 to 05
(HI4PI and LAB spectra, GALFA-HI, a published tangent-velocity table) are C, so by Prompt 241's run condition the labelled
synthetic generator is the pack, leg E1 and leg B7 are NOT RUN, and the existing `milky-way-rotation-curve` pack is
unchanged. The structural problem the gate found stands: the one HI4PI page read describes a column-density map with no
velocity axis. What Carl would supply to run the legs: (1) for E1, the spectra of a survey cut along the mask's longitudes
(CDS or the survey's host) with the survey's release, velocity frame, channel width, beam and licence read, so a pack can
be built; (2) for B7, `tests/fixtures/radio/authentic/published-tangent.json` with `{source, retrieved, licence,
referenceFrame, r0Kpc, theta0KmS, points: [{lDeg, vTerminalKmS, errorKmS}]}` transcribed from one paper's table. The
validator is not yet written to read either file; it will say NOT RUN until they exist.

## Open questions for Carl

1. **The two atomic constants.** The rest frequency (1420405751.768 Hz) and the spin-flip rate (2.8843e-15 per second) are
   in `HI_LINE` (`js/kernels/radio/constants.js`), typed as physical constants with no source file in the tree and not
   verified by a fetch; the module says so in its `status`. Every other number is a definition, a stated choice or computed.
   Please supply a source (a NIST or CODATA page, or the original measurement) or say to take them as caller inputs.
   *Ruling (coordinator, under Carl's overnight delegation): keep them in `HI_LINE`, labelled unverified; the coordinator
   will fetch a source himself and tell the session.*
2. **A1's bound** (above): reset to 1e-10 km/s absolute, or leave failing?
3. **C2's allowance** (above): replace the 3.2 ratio by the exact prediction from the dispersion draw, or leave failing?
4. **Stromberg's V.** D-GAIA-03's 3.77 km/s is a value from one sample; the kernel pairs it with Schonrich et al.'s U and W
   because the Stromberg relation corrects only V. If the lesson should pair it with sample values, say so.
   *Ruling (coordinator): Stromberg's V with Schonrich et al.'s U and W is acceptable and stays labelled.*
5. The standard (kinematic) LSR of the radio literature is not offered: its definition is a published number I did not
   type. A source file would let it be a third option. *Ruling (coordinator): it stays absent until a source file exists.*

## Inherited limits to state in claims built on this kernel

Every spectrum here is synthetic, from circular orbits and uniform gas; the authentic tier is NOT RUN. The recovered curve
depends on the assumed R0, Theta0, LSR choice and gas dispersion, and the interval says so (the first two enter as
Theta0 + V and R0 |sin l|). Real gas has streaming, a warp, a bar and structure near the tangent point that the
pathway's result does not see (R2); a result is a demonstration of the method on a fixed sightline set, not a measurement
of the Galaxy's mass.

## References

Schonrich, R., Binney, J. and Dehnen, W. 2010, MNRAS 403, 1829 (the Sun's motion; as `js/galactic/model.js` cites it).
The tangent-point method is textbook geometry and is derived here from the line-of-sight velocity. `DECISION_REGISTER.md`
D-GAIA-03 (the two LSR values), D-R10-239-xx (`RADIO_DATA_GATE.md`) and D-R10-241-01 to -03.

<!-- Listed in DOCUMENTS.md. -->
