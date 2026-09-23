# Gravitational waves in Gravitas

What the application computes, what it only illustrates, and where the line
between the two is drawn. Written before the code, and kept beside it.

There are two entirely separate things in this repository that compute or draw
a gravitational wave, and beside them two kinds of real data. Conflating any of
them would be the single most damaging thing this feature could do, so they
are separated here first, and every number the application shows about a
gravitational wave falls under exactly one of four labels:

| Label                  | What it means                                                                                                   | Where it appears                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **SIMULATED**          | Computed from stated equations, by Gravitas or by the collaborations, and not a measurement of anything         | The lab's leading-order inspiral and synthetic noise (section B); the model track over the five events; the GW150914 NR waveform   |
| **ANALYZED REAL DATA** | Strain the LIGO detectors recorded, published by GWOSC, and read by Gravitas with a stated procedure            | The GW150914 figure traces, reproduced as published (C.1); the five GWOSC events, whitened and measured here (C.2)                 |
| **CATALOG VALUE**      | A number the collaborations published about an event - a mass, a distance, a signal-to-noise ratio - copied here | Beside the five events, under a heading that says it was not measured here, and held until the reader asks for it (C.2)             |
| **ILLUSTRATION**       | Drawn to be legible, not computed to be right                                                                   | The sandbox's inspiral, ripples and sound (section A); the lab's schematic binary (B.7)                                            |

The N-body engine generates none of the observed waveforms, and nothing here
says or implies that it does. The sandbox's binaries are the one place the
engine is involved, and their inspiral is an illustration.

---

## A. The ordinary sandbox: illustrative, and staying that way

### A.1 The inspiral

`js/scenarios.js` builds `Binary BH`, `GW150914` and the other compact-object
scenarios with `orbit_decay_rate`, a per-step multiplicative damping applied in
`js/physics.js`. It is a phenomenological knob chosen so that a binary visibly
spirals in while somebody is watching. It is **not** a radiation-reaction
calculation. It does not depend on the chirp mass, it does not obey
`da/dt ∝ -a^-3`, and the time it takes has no physical meaning.

This is fine, and it is not being changed. A sandbox whose binaries take
0.7 seconds or 157 seconds to merge - the physically correct answers - would be
a worse sandbox. What is being changed is that nothing labels it as a
gravitational-wave calculation.

### A.2 The ripples

`gravity_ripples` in `js/physics.js` is a list of expanding circles pushed at a
merger and drawn by `js/render.js`. `gw_strength` is a drawing weight between
0.08 and 1.0 chosen per merger type by eye. Illustrative. Unchanged.

### A.3 The sound

`js/audio.js` maps orbital frequency to pitch through `simFrequencyToHz` and
then **quantizes it onto a minor pentatonic scale** (`MUSICAL_SCALE`,
`quantizeMidi`). That is a deliberate design decision - it makes an arbitrary
collection of orbits sound like music rather than like a siren - and it means
the pitch you hear is not a frequency the simulation computed. It is
sonification, and the interface now says so.

The collision and merger sounds are synthesised envelopes, also designed.

### A.4 A defect found in the audit

A black-hole merger reaches `js/audio.js` twice: once as a `gravitasMerge`
window event (`js/physics.js:2751`) and once as a new entry in
`gravity_ripples` (`js/physics.js:2715`). Both call `triggerBassDrop`, so one
merger plays two overlapping bass drops. Fixed in Stage 4.

---

## B. The dedicated lab: a scoped, cited waveform model

### B.1 What is modeled

**Leading-order (quadrupole, "Newtonian" / 0PN) quasi-circular inspiral of two
point masses.** Circular orbits, no spin, no eccentricity, no tides, no
higher-order post-Newtonian terms, no merger, no ringdown.

Symbols: `m1`, `m2` component masses; `M = m1 + m2`; `Mc` the chirp mass;
`D` the luminosity distance; `iota` the inclination between the orbital angular
momentum and the line of sight; `f` the **gravitational-wave** frequency, which
is twice the orbital frequency for the dominant quadrupole mode; `tau = tc - t`
the time remaining until coalescence.

### B.2 The equations, and where they come from

    Mc = (m1 m2)^(3/5) / (m1 + m2)^(1/5)

    df/dt = (96/5) pi^(8/3) (G Mc / c^3)^(5/3) f^(11/3)

    f(tau) = (1/pi) (5 / (256 tau))^(3/8) (G Mc / c^3)^(-5/8)

    Phi(tau) = Phi_c - (16 pi / 5) K tau^(5/8),  K = f(tau) tau^(3/8)

    h_plus  = (4/D) (G Mc/c^2)^(5/3) (pi f / c)^(2/3) ((1 + cos^2 iota)/2) cos Phi
    h_cross = (4/D) (G Mc/c^2)^(5/3) (pi f / c)^(2/3) (cos iota)          sin Phi

Primary references:

- Peters, P. C. (1964), *Gravitational radiation and the motion of two point
  masses*, Phys. Rev. 136, B1224 - the orbital decay and the `f^(11/3)`
  frequency evolution.
- Maggiore, M. (2008), *Gravitational Waves, Volume 1: Theory and Experiments*,
  Oxford University Press, sections 4.1.2 and 4.1.3 - the chirp amplitude,
  the inclination factors, and the closed-form `f(tau)` and `Phi(tau)` above.
- Sathyaprakash, B. S. and Schutz, B. F. (2009), *Physics, Astrophysics and
  Cosmology with Gravitational Waves*, Living Rev. Relativity 12, 2 - the same
  results in the form usually quoted for detector work.

Two independent anchors the code is tested against rather than derived from:

- `f(tau) = 134 Hz (1.21 Msun / Mc)^(5/8) (1 s / tau)^(3/8)`, the numerical
  form quoted for a `1.4 + 1.4 Msun` binary.
- `N = (8/5) f tau` cycles remain when the frequency is `f`. For GW170817 from
  24 Hz this gives ~3700 cycles, the right order for the ~3000 usually quoted.

### B.3 Where the model stops, and why

Leading-order inspiral **diverges** at `tau -> 0`. It is not extrapolated
through that divergence. The hard stop is the innermost stable circular orbit
of a Schwarzschild black hole of the binary's total mass:

    f_ISCO = c^3 / (6^(3/2) pi G M) = 4397.05 Hz x (Msun / M)

For the three presets that is 67.7 Hz, 1570.4 Hz and 385.7 Hz. The 67.6 Hz
figure is not a bug: **an inspiral-only model covers almost none of what LIGO
actually saw from GW150914**, and saying so is one of the things the lesson is
for.

The lab does not hide the approximation degrading before it gets there. It
displays the orbital velocity parameter

    v/c = (pi G M f / c^3)^(1/3)

which is 0.408 at ISCO, and bands the signal: reliable below 0.2, degrading
from 0.2 to 0.3, unreliable above. Post-Newtonian corrections enter at relative
order `(v/c)^2`, so this is a statement about the size of the terms that have
been dropped, not a mood.

The consequence is worth stating rather than discovering: **a 65-solar-mass
binary is already at `v/c = 0.27` when it enters the band at 20 Hz.** There is
no frequency at which this model is in its own "reliable" band for a heavy
binary black hole. A pair of neutron stars is, up to about 185 Hz. That is the
real difference between the presets, it is not a switch, and it is what step 18
of the lesson asks a student to find.

For the merger and ringdown the lab **switches source** rather than
extrapolating: it shows the published GW150914 numerical-relativity
reconstruction (section C). There is no code path in which a synthesised
waveform continues past `f_ISCO`.

Explicitly not modeled, and explicitly said so in the interface:

- Binary-neutron-star post-merger. Not observed for GW170817, not modeled
  here, and not synthesised by changing an oscillator's pitch.
- Tidal disruption in a neutron-star / black-hole merger.
- Neutron-star / black-hole ringdown.
- Spin, eccentricity, precession, higher multipoles.

### B.4 Frames, conventions and units

- **Masses are detector-frame (redshifted) masses.** The waveform depends only
  on `(1+z) Mc`, so this is the honest control to expose. Source-frame masses
  are shown only where a publication supplies them - i.e. on the GW150914
  reference card. No cosmology is assumed anywhere in this feature, and no
  source-frame mass is inferred from a distance.
- **Distance** is luminosity distance in megaparsecs. Amplitude is exactly
  `1/D` at fixed detector-frame masses.
- **Time** runs to coalescence: `t = 0` at `tau = 0`, negative before. The
  model spans `t_start` (where `f = f_start`) to `t_ISCO`.
- **Detector response.** The source is placed directly overhead the detector
  with polarization angle zero, so `F_plus = 1` and `F_cross = 0` and the
  detector strain is `h_plus`. This is stated in the interface; it is the
  configuration in which a single detector is most sensitive, and it is the one
  that makes the distance-inclination degeneracy visible without four extra
  sliders. `h_cross` is still computed and plotted, because it is physical.
- The single-detector degeneracy is shown as the effective distance

      D_eff = D / ((1 + cos^2 iota) / 2)

  which is what the amplitude actually constrains. Two configurations with the
  same `D_eff` produce the same detector strain, which is step 16 of the
  lesson.
- **Strain is dimensionless.** Plots are labeled `h` and drawn in units of
  `1e-21`. Whitened data is labeled as such, in units of standard deviations,
  and never mixed on an axis with strain.

### B.5 Presets

Chosen so that the differences between them come out of the masses, not out of
a switch. None of them is a fit to a real event; the GW150914-like preset uses
the published parameters as a starting point and is labeled as a model, not as
the observation.

| Preset | m1, m2 (detector frame) | D | Mc | f_ISCO | Band from 20 Hz |
|--------|------------------------|---|----|--------|-----------------|
| Stellar-mass black holes | 36 + 29 Msun | 410 Mpc | 28.1 Msun | 67.7 Hz | 0.81 s, ~24 cycles |
| Binary neutron stars | 1.4 + 1.4 Msun | 40 Mpc | 1.22 Msun | 1570 Hz | 158 s, ~5040 cycles |
| Neutron star + black hole | 1.4 + 10 Msun | 200 Mpc | 3.00 Msun | 386 Hz | 35 s, ~1120 cycles |

The first row is *GW150914-like*, not GW150914. The published component masses
are source-frame; used here as detector-frame masses they give a chirp mass of
28.1 Msun rather than the ~30.8 Msun detector-frame value the collaboration
reports. That difference is exactly the redshift this lab declines to assume,
and the preset is named for the class of source rather than for the event.

A neutron-star preset is a **mass choice**. It does not add a tidal signature,
a post-merger oscillation or a disruption, because this model has none of
those. The interface says that where the choice is made.

### B.6 Synthetic noise

Colored Gaussian noise from a seeded generator, with a power spectral density
from a published analytic fit to the Advanced LIGO zero-detuning high-power
design curve (LIGO-T0900288), in the form given by Ajith (2011),
arXiv:1107.1267:

    S_h(f) = 1e-48 [ 0.0152 x^-4 + 0.2935 x^(9/4) + 2.7951 x^(3/2)
                     - 6.5080 x^(3/4) + 17.7622 ],   x = f / 245.4 Hz

Checked against published design values rather than against itself: the fit
gives an amplitude spectral density of 1.9e-23 /sqrt(Hz) at 20 Hz and
4.0e-24 /sqrt(Hz) at 100 Hz, both within 10% of the design curve.

The noise realization is fixed by an explicit seed and is **not** redrawn when
a parameter changes, so a controlled comparison compares the signal. A separate
control redraws it, and says that it has.

This is a design curve, not the noise LIGO actually had in 2015. The lab says
so, and the real-data section is where measured noise appears.

### B.7 What the lab does not claim

- It is not a detection pipeline. Template comparison reports **similarity**
  (a normalized inner product), never a signal-to-noise ratio, a false-alarm
  rate, or a probability.
- Listening does not classify a source. Two binaries with the same chirp mass
  and different total masses sound nearly identical for most of the band.
- The schematic binary drawn beside the signal is a **reconstruction driven by
  the waveform timeline** - separation from the Keplerian relation at the
  modeled frequency - and is drawn at a compressed scale with an exaggerated
  body size. It is labeled schematic. It is not the N-body sandbox, and the
  N-body sandbox does not drive it.

---

## C. Real data

Two datasets, and they are real data in two different senses. The first is
published figure data, reproduced and not reprocessed; the second is strain as
the detectors recorded it, which Gravitas processes and measures itself.
Neither is fetched at run time: both are committed, deferred, and served from
the site's own origin. There is no runtime request to gwosc.org.

### C.1 GW150914, as the discovery paper published it

See `js/data/gw/README.md` for the per-file provenance block: event, detector,
source URL, DOI, time window, sample rate, units, every filtering step,
attribution, license, and input and output checksums. `tools/build-gw-data.mjs`
regenerates the bundled files from the originals and `--check` verifies them.

- **GW150914 observed strain, H1 and L1.** ANALYZED REAL DATA, in the narrow
  sense that the only thing Gravitas computes from it is the lag and sign
  between the detectors. The data behind Figure 1 of Abbott et al. (2016),
  Phys. Rev. Lett. 116, 061102. Band-passed 35-350 Hz and notched by the
  collaboration before publication; the L1 trace as published is already
  time-shifted by 6.9 ms and inverted, and the lab says so beside it rather
  than doing it silently.
- **GW150914 numerical-relativity waveform, H1 and L1.** SIMULATED, by the
  collaboration. From the same figure. It is drawn and labeled differently from
  the data, and it is never described as this lab's model.
- **GW150914 residuals, H1 and L1.** Data minus reconstruction, from the same
  figure. What is left is noise, and being able to see that is the point.
- **GW150914 Keplerian separation and post-Newtonian velocity.** From Figure 2
  of the same paper. Published estimates, labeled as such.

### C.2 Five events from the open archive

`js/data/gw/gwoscEvents.js`, generated by `tools/build-gwosc-events.mjs`, with
its provenance record in `js/data/gw/gwoscEventsProvenance.js`, which nothing
in the application imports. The events, the versions, the detectors, the
windows and every processing step are in `js/data/gw/README.md`.

- **The strain.** ANALYZED REAL DATA. Thirty-two seconds of 4096 Hz strain for
  each of GW150914, GW170817, GW190412, GW190521 and GW190814, one LIGO
  detector per event, retrieved from the GWOSC event API at build time against
  pinned SHA-256 checksums.
- **The noise estimate.** Measured here, from each detector's own thirty-two
  seconds: a median Welch average of 4-second Hann segments, bias-corrected
  (`js/gw/psd.js`). The design curve in `js/gw/noise.js` is never applied to a
  real recording; whitening 2015 or 2019 strain by a design curve would claim a
  detector state nobody measured. The four black-hole events leave out the
  three seconds around the merger; GW170817 is in band for the whole file and
  cannot, which the record says.
- **The time-frequency map and what is read off it.** Measured here, in the
  browser (`js/gw/qscan.js`): a constant-Q map of the whitened strain, the last
  instant anything in it clears a noise threshold derived from the number of
  pixels searched, and the loudest frequency at fixed times before that
  instant. For GW170817 nothing clears it, and the readout says so rather than
  lowering the threshold.
- **Masses, distance, redshift, signal-to-noise ratio.** CATALOG VALUE, from
  GWTC-2.1 (GWTC-1 for GW170817), at the precision GWOSC published them.
  Held until the reader turns them on, so that a prediction can be made from
  the measurement first.
- **The dashed track.** SIMULATED: the lab's leading-order chirp for the
  catalog chirp mass times one plus the catalog redshift. Drawn only with the
  catalog shown, and never fitted.

What is not done, and why: no chirp mass is measured from the strain - an
estimate from pairs of points on the map was built, failed on two of the five
events and ran 16 per cent high on the one where it was stable, and was
rejected. No template, matched filter, parameter estimate or detection
statistic is computed anywhere. No glitch is gated or subtracted: GW170817's
Livingston recording has a documented one, so Hanford is drawn instead.

Where the map and the model disagree, `tests/gwoscEvents.test.js` decides which
is responsible by injecting a leading-order chirp into noise and reading it
back through the same procedure. The map recovers it within a sixth of the
injected frequency; GW190814, a twentieth of a second before its end, is more
than a quarter below the model. That disagreement is a property of the signal.

---

## D. Reading list for a student

Placed in the lesson, not only here.

- GWOSC's own event page for GW150914: <https://gwosc.org/events/GW150914/>
- GWOSC tutorials: <https://gwosc.org/tutorials/>
- Abbott et al. (2016), *Observation of Gravitational Waves from a Binary Black
  Hole Merger*, PRL 116, 061102, <https://arxiv.org/abs/1602.03837>
- Abbott et al. (2017), *GW170817: Observation of Gravitational Waves from a
  Binary Neutron Star Inspiral*, PRL 119, 161101,
  <https://arxiv.org/abs/1710.05832>
- Abbott et al. (2020), *GW190521: A Binary Black Hole Merger with a Total Mass
  of 150 M☉*, PRL 125, 101102, <https://arxiv.org/abs/2009.01075>
- Abbott et al. (2020), *GW190814: Gravitational Waves from the Coalescence of a
  23 Solar Mass Black Hole with a 2.6 Solar Mass Compact Object*, ApJL 896,
  L44, <https://arxiv.org/abs/2006.12611>
- Abbott et al. (2020), *GW190412: Observation of a Binary-Black-Hole
  Coalescence with Asymmetric Masses*, PRD 102, 043015,
  <https://arxiv.org/abs/2004.08342>
- The catalogs the values come from: GWTC-1, PRX 9, 031040 (2019),
  <https://arxiv.org/abs/1811.12907>, and GWTC-2.1, PRD 109, 022001 (2024),
  <https://arxiv.org/abs/2108.01045>
