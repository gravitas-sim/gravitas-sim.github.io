# Bundled gravitational-wave data

One event, eight traces, 23 KB. Everything here was published by somebody else
and is reproduced under their licence; nothing here was drawn, fitted, adjusted
or invented by this project.

`gw150914.js` is generated. Do not edit it.

```bash
npm run gw:data     # download, process, write the module
npm run gw:check    # verify the checked-in module against the cached sources
```

`npm run gw:check` passes `--offline`, so it fails rather than silently
re-downloading if `.gw-cache/` is missing. `npm run gw:data` populates that
cache from the URLs below on its first run.

## Source

The figure data behind:

> B. P. Abbott *et al.* (LIGO Scientific Collaboration and Virgo
> Collaboration), **Observation of Gravitational Waves from a Binary Black Hole
> Merger**, Phys. Rev. Lett. **116**, 061102 (2016).
> [doi:10.1103/PhysRevLett.116.061102](https://doi.org/10.1103/PhysRevLett.116.061102),
> [arXiv:1602.03837](https://arxiv.org/abs/1602.03837)

Released by the Gravitational Wave Open Science Center at
<https://gwosc.org/events/GW150914/>, under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), from
`https://gwosc.org/GW150914data/P150914/`.

Acknowledgement, reproduced in the application beside the data:

> This research has made use of data or software obtained from the
> Gravitational Wave Open Science Center (gwosc.org), a service of the LIGO
> Scientific Collaboration, the Virgo Collaboration, and KAGRA.

## What each trace is

| Trace | File | What it is |
|-------|------|------------|
| `observed-H1`, `observed-L1` | `fig1-observed-{H,L}.txt` | Measured strain. Real data. |
| `reconstruction-H1`, `reconstruction-L1` | `fig1-waveform-{H,L}.txt` | The collaboration's numerical-relativity waveform. A model, theirs, not ours. |
| `residual-H1`, `residual-L1` | `fig1-residual-{H,L}.txt` | Data minus reconstruction. What is left is noise. |
| `separation-H1` | `fig2-keplerian-separation-H.txt` | Effective black-hole separation in Schwarzschild radii. A published estimate. |
| `velocity-H1` | `fig2-postNewtonian-velocity-H.txt` | Post-Newtonian relative velocity in units of *c*. A published estimate. |

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

## What was *not* done to it

- No time shift between detectors.
- No sign inversion.
- No additional filtering, whitening, normalisation or alignment.

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

## GW170817

Not bundled. The event page publishes 4096-second strain files of 72 and 77 MB
and no small figure-data product; a bundled excerpt would require implementing
a Welch power spectral density estimate, a whitening filter and a Q-transform
in the build, and the honest teaching product for a binary neutron star is a
time-frequency track rather than a time series, because the chirp is not
visible by eye in whitened strain. Recorded here as a specific blocker rather
than approximated. The lab's neutron-star preset is a model, and says so.
