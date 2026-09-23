# Bundled gravitational-wave data

Two datasets, both released by the Gravitational Wave Open Science Center under
CC BY 4.0, and real data in two different senses:

- `gw150914.js` - one event, eight traces, 23 KB. The discovery paper's figure
  data, reproduced and not reprocessed. Nothing in it was drawn, fitted,
  adjusted or invented by this project.
- `gwoscEvents.js` - five events, one detector's strain each, 59 KB. Recorded
  strain that this project whitens and measures, with every step recorded in
  `gwoscEventsProvenance.js`. See [Five events](#five-events-from-the-open-archive)
  below.

Both are generated. Do not edit them.

```bash
npm run gw:data     # download, process, write the module
npm run gw:check    # verify the checked-in module against the cached sources
```

`npm run gw:check` passes `--offline`, so it fails rather than silently
re-downloading if `.gw-cache/` is missing. `npm run gw:data` populates that
cache from the URLs below on its first run.

## Source

The figure data behind:

> B. P. Abbott _et al._ (LIGO Scientific Collaboration and Virgo
> Collaboration), **Observation of Gravitational Waves from a Binary Black Hole
> Merger**, Phys. Rev. Lett. **116**, 061102 (2016).
> [doi:10.1103/PhysRevLett.116.061102](https://doi.org/10.1103/PhysRevLett.116.061102),
> [arXiv:1602.03837](https://arxiv.org/abs/1602.03837)

Released by the Gravitational Wave Open Science Center at
<https://gwosc.org/events/GW150914/>, under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), from
`https://gwosc.org/GW150914data/P150914/`.

Acknowledgment, reproduced in the application beside the data:

> This research has made use of data or software obtained from the
> Gravitational Wave Open Science Center (gwosc.org), a service of the LIGO
> Scientific Collaboration, the Virgo Collaboration, and KAGRA.

## What each trace is

| Trace                                    | File                                | What it is                                                                    |
| ---------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| `observed-H1`, `observed-L1`             | `fig1-observed-{H,L}.txt`           | Measured strain. Real data.                                                   |
| `reconstruction-H1`, `reconstruction-L1` | `fig1-waveform-{H,L}.txt`           | The collaboration's numerical-relativity waveform. A model, theirs, not ours. |
| `residual-H1`, `residual-L1`             | `fig1-residual-{H,L}.txt`           | Data minus reconstruction. What is left is noise.                             |
| `separation-H1`                          | `fig2-keplerian-separation-H.txt`   | Effective black-hole separation in Schwarzschild radii. A published estimate. |
| `velocity-H1`                            | `fig2-postNewtonian-velocity-H.txt` | Post-Newtonian relative velocity in units of _c_. A published estimate.       |

The time axis on every trace is seconds after GPS 1126259462, which is
2015-09-14 09:50:45 UTC — the axis the published figures use.

## What was done to it here

1. Parsed the published two-column text as-is.
2. Decimated from 16384 Hz. The six strain traces kept every fourth sample with
   no anti-alias filter, which is safe only because the collaboration
   band-passed them to 35–350 Hz before publication; the build re-measures the
   power above the new Nyquist frequency on every run and refuses to write if
   it exceeds 0.1%. The measured values are 0.00007% to 0.014%. The two
   figure-2 curves are smooth rather than band-passed, so they were
   block-averaged by sixteen instead, which low-pass filters and decimates in
   one step.
3. Quantized to 16-bit integers with a per-trace scale. The largest resulting
   error is recorded per trace and is at worst 7e-5 in the published units.
4. Base64 encoded, little-endian.

## What was _not_ done to it

- No time shift between detectors.
- No sign inversion.
- No additional filtering, whitening, normalization or alignment.

The relative time shift and sign between Hanford and Livingston are **measured**
by the build and recorded in `PROVENANCE.findings`, not applied. As published,
the two observed traces correlate at −0.757 with Livingston leading Hanford by
7.3 ms; the two reconstructions correlate at −0.977 at 7.6 ms. The lesson asks
a student to find that for themselves from the traces on screen. Applying it
silently would have removed the thing being taught.

## What the collaboration had already done

Band-passed 35–350 Hz, and band-rejected the instrumental line frequencies.
This is why the traces look like a chirp instead of like a wall of seismic
noise, and the interface says so wherever they are drawn.

## Five events from the open archive

```bash
npm run gwosc:data        # download, process, write both modules
npm run gwosc:check       # structure only, offline; what the quick gate runs
npm run gwosc:provenance  # regenerate from the cached sources and compare byte for byte
```

`gwosc:provenance` fails if `.gwosc-cache/` is missing rather than passing on
structure, and every file read is checked against its pinned SHA-256 and byte
count before it is parsed. `gwosc:data` populates the cache from the pinned
URLs on its first run. `GRAVITAS_GWOSC_CACHE` points the tool at a different
cache, which is how `tests/gwoscEvents.test.js` hands it an empty one and a
corrupt one and checks that it refuses both.

### The events

| Event    | Catalog values | Strain release | Detector | Window      | Why it is here                                                                               |
| -------- | -------------- | -------------- | -------- | ----------- | -------------------------------------------------------------------------------------------- |
| GW150914 | GWTC-2.1 v4    | GWTC-1 v3      | H1       | −2.5/+0.5 s | The first, and the event the lab's model is built around; it agrees with the model           |
| GW170817 | GWTC-1 v3      | GWTC-1 v3      | H1       | −6/+0.5 s   | Two neutron stars: the highest catalog signal-to-noise ratio, and no pixel above the noise   |
| GW190412 | GWTC-2.1 v4    | GWTC-2.1 v4    | L1       | −2.5/+0.5 s | Clearly unequal masses, between GW150914 and GW190814 in chirp mass                          |
| GW190521 | GWTC-2.1 v4    | GWTC-2.1 v4    | L1       | −2.5/+0.5 s | The heaviest: a burst of a few cycles, almost all merger and very little inspiral            |
| GW190814 | GWTC-2.1 v3    | GWTC-2.1 v3    | L1       | −2.5/+0.5 s | The lightest black-hole track, visible for most of a second, with a 2.6-solar-mass companion |

The control lists them in the order they were recorded, not by mass, because
the lesson asks for a ranking by chirp mass made from the measurements.

GW150914's catalog values are GWTC-2.1's re-analysis, whose strain stays
attached to the GWTC-1 version; GW170817 is not in GWTC-2.1 at all. Both facts
are shown beside the values. Windows are what the lesson reads plus a margin.

The detector drawn is the LIGO detector with the larger Q-scan energy within
0.1 s of the catalog time, excluding any with a transient GWOSC documents in
the window. That excludes GW170817's Livingston recording, which has a
digital-to-analog saturation about 1.1 s before the merger
(<https://gwosc.org/events/GW170817/>).

Four candidates were tested and left out, each for a stated reason recorded in
`PROVENANCE.selection`: GW151226 and GW170608 are too faint pixel by pixel to
follow, GW170814 would repeat GW150914, and GW200115 shows nothing above the
noise.

### What was done to it here

1. Parsed GWOSC's 32-second, 4096 Hz text strain, refusing anything that is not
   exactly that many finite samples.
2. Estimated each detector's noise from the same 32 seconds: Welch's method,
   4-second Hann segments at half overlap, combined by a bias-corrected median
   (`js/gw/psd.js`). The black-hole events exclude the three seconds around the
   merger so the signal is not measured as noise; GW170817 is in band for the
   whole file and excludes nothing.
3. Whitened by that estimate between 20 and 400 Hz with `js/gw/match.js`
   `whiten()` - never by the design curve in `js/gw/noise.js` - and divided by
   the standard deviation away from the tapered ends, so the samples are in
   units of the noise.
4. Cut to the window on the 4096 Hz grid, then kept every fourth sample. No
   further filter is needed because whitening zeroed everything above 400 Hz;
   the power above the new 512 Hz Nyquist frequency is measured on every build
   and must be under 0.1%. It is 0.001% to 0.008%.
5. Quantized to 16 bits with one scale per event. The build refuses to write if
   the slice table - the frequencies the lesson reads - moves by more than 1%
   between full precision and 16 bits. Eight bits failed that test.
6. Base64 encoded, little-endian.

Thirteen megabytes of gzipped source in ten files become 49 KB of base64
payload in a 59 KB module; the provenance record beside it is 19 KB and is
imported by nothing in the application.

### What was _not_ done to it

- No gating, glitch subtraction, time shift or sign change.
- No template, matched filter, fit or parameter estimate. Nothing here is a
  detection statistic.
- No chirp mass is measured. One was built from pairs of points on the map and
  rejected: it failed on two of the five events and ran 16 per cent high on
  the one where it was stable.

### What is measured from it, in the browser

The time-frequency map (`js/gw/qscan.js`), the last instant anything in it
clears a noise threshold derived from the number of pixels searched, the
loudest frequency at fixed times before that instant, and the noise level at
100 Hz. Everything else on the screen is a catalog value or the lab's model,
under a heading that says which.

## GW170817

Bundled now, as the fifth event above, and the blocker this section used to
record is what the second dataset was built to remove. The event page's
4096-second files are 72 and 77 MB; the 32-second, 4096 Hz release is 1.3 MB
per detector, and the Welch estimate, the whitening and the Q-transform that a
bundled excerpt needed are `js/gw/psd.js`, `js/gw/match.js` and
`js/gw/qscan.js`. What this section said about the teaching product still
holds: the chirp is not measurable pixel by pixel in whitened strain, and the
lesson is built on exactly that. The lab's neutron-star preset is still a
model, and says so.
