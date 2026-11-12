# The AGN luminosity-function gate (Prompt 252, Part B): no verdict

Can Gravitas show a quasar luminosity function by 1/Vmax from a flux-limited catalogue subset, with the sample's completeness
and K-corrections, against a published function? That is the gate of Prompt 252 Part B (`docs/agn-luminosity-function-gate`).
The review's correction is the reason it is a gate: a luminosity function from a flux-limited sample needs 1/Vmax with the
sample's completeness and K-corrections, and a function without them is wrong in a known direction (the Malmquist bias). This
document is the documentation part of the gate; it adds no code.

**The gate has no verdict.** Its thresholds were committed first, in `tests/fixtures/agn/gate-thresholds.json` (commit
440e4e72), before any catalogue row, completeness document, K-correction, published function, estimator or oracle output
existed, and nothing of the catalogue has been read, typed or fetched. Every leg needs a file that is not in the tree (a
catalogue subset with its completeness documentation, a K-correction source, a published function pinned as the oracle), so
every leg is **NOT RUN** (G1 to G7 in `tests/fixtures/agn/results.json`). By the gate's own rule, G1, G2, G3 or G7 NOT RUN
leaves the gate undecided, and the effective state for consumers is **C: a reading step**. Nothing is built within the gate: no
estimator, no "Counting quasars" investigation, no luminosity-function panel. A luminosity function is never presented without
its completeness correction and K-correction.

## The legs (committed in `gate-thresholds.json`)

| Leg | What it asks |
| --- | --- |
| G1 | the sample's product, release, columns, selection, flux limit, area, redistribution terms (with a retrieval date) and SHA-256 are recorded and the rights basis is accepted under rule 4 |
| G2 | the completeness as a function of magnitude and redshift is documented by the survey and loaded into 154's selection-function object; the correction is applied to every bin |
| G3 | the K-correction's source, band and range of validity are recorded; a source outside its range is refused; its own example values reproduced to 1e-3 |
| G4 | the 1/Vmax function agrees with the pinned published function in at least 80 percent of shared bins within two combined errors and no bin differs by 0.3 dex |
| G5 | each bin's interval covers a withheld half of the sample at 0.6827 on 200 seeded splits (a 3-sigma binomial band) |
| G6 | the function is refused when the completeness or the K-correction is absent, in 100 of 100 attempts |
| G7 | the Malmquist demonstration: the mean luminosity of the flux-limited sample rises with redshift and sits above the limiting-luminosity curve (cosmology kernel plus the K-correction), zero violations |

Verdict rule: **A** needs G1 to G6; **B** (the Malmquist demonstration on the sample without a luminosity function) needs G1, G2
and G7 with any of G3 to G6 failing; **C** (a reading step) when G1 or G2 fails. Any of G1, G2, G3 or G7 NOT RUN: no verdict.

## Files requested from Carl (exact)

1. **The sample (G1, G2).** One SDSS quasar catalogue subset: the exact product and data release (the catalogue name I would
   expect is the DR16 quasar catalogue by Lyke et al., unverified, from memory), the columns and rows to use (redshift,
   a magnitude in the band the sample is selected in with its error, the flag that marks the uniformly selected subsample), the
   selection and its flux limit, the survey area, the completeness documentation as a function of magnitude and redshift, the
   redistribution terms with the retrieval date, and the SHA-256 of the file. Save: the terms page text and the completeness
   document beside the file. The rights decision is per source and per redistribution form and is Carl's.
2. **The K-correction (G3).** One named K-correction source for that band (a published recipe or table), its version, its
   licence read with a retrieval date, its range of validity, and the example values it states, if any.
3. **The oracle (G4).** One published luminosity function for the same band, redshift bins and cosmology, in a table, with its
   terms read, and the conversion to the kernel's cosmology recorded.

Nothing in this document is a published number: the catalogue's name above is from memory and unverified.

<!-- Listed in DOCUMENTS.md. -->
