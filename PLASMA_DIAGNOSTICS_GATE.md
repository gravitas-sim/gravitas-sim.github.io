# The plasma-diagnostics gate (Prompt 247, Part B)

Roadmap III, Prompt 247, Part B. A gate on a physical claim: whether Gravitas can report an electron temperature from the
[O III] auroral-to-nebular line ratio and an electron density from the [S II] doublet ratio, each with an interval and a stated
domain, against an independent nebular-analysis pipeline. **It has no verdict. Every leg is NOT RUN, because the atomic data
and the independent pipeline it needs are not in the tree and were not fetched (Carl's overnight delegation, 2026-11-05).**
Nothing is built within it: no diagnostic kernel, no diagnostic-ratio panel, no majors step "the temperature and density from
ratios". Until the files arrive the consumers take the C alternative: a reading step, and Prompt 253's "From a nebula to a
galaxy" uses the line tools only (Appendix C).

## What was committed first

`tests/fixtures/ism/gate-thresholds.json` was committed (f95e1990) before any atomic datum, diagnostic code, oracle output or
spectrum for this gate existed, together with the Part A thresholds. It states the verdict rule (A: both diagnostics pass G1 to
G6; B: exactly one; C: neither; **not decided** while G1, G2, G3 or G6 is NOT RUN), what the gate needs, and six legs:

| Leg | What | Bound | State |
| --- | --- | --- | --- |
| G1 | the atomic-data source, version, licence reading with retrieval date and SHA-256 recorded and the file present; the code reads no value that is not in it | recorded and present | NOT RUN |
| G2 | the diagnostic curves (auroral-to-nebular [O III] against temperature at a fixed low density; the [S II] doublet against density at a fixed temperature) against the oracle's on 12-point grids chosen by rule between the oracle's own limits | 1e-3 relative | NOT RUN |
| G3 | the temperature and the density recovered from given ratios against the oracle's inversion, inside the domains | 5e-3 relative | NOT RUN |
| G4 | 68.27 percent interval coverage over 300 seeded flux sets, auroral line at least 5 sigma | 0.602 to 0.763 | NOT RUN |
| G5 | the domain of each diagnostic (the interval between its low- and high-limit ratios, computed from the pinned atomic data and shrunk by 10 percent of the ratio range at each end, not typed): outside it is refused `outside-domain`; an auroral line under 5 sigma `low-signal` | by construction | NOT RUN |
| G6 | the supplied H II region and planetary nebula spectra, measured under ISM-RULE-1 and de-reddened, against the pipeline on the same line fluxes | 2 combined sigma | NOT RUN |

A threshold that proves unmeasurable fails the gate on that threshold and only Carl resets it (7.5 rule 4); here nothing
is unmeasurable, the inputs are absent, which is why the legs are NOT RUN and not failed.

## The fetch request (what Carl would supply)

1. **Atomic data.** One named atomic-data compilation with its version, holding the transition probabilities and the collision
   strengths (or the collisional rate coefficients) of O++ and S+, its licence read with a retrieval date, and the file's SHA-256, in
   `tests/fixtures/ism/atomic/`. The diagnostic code reads the pinned file and contains no atomic number. Rights are decided per
   source and per redistribution form (7.5 rule 4).
2. **The independent pipeline.** One cited nebular-analysis package installed in a pinned virtual environment (its version
   recorded; the package's own atomic data, if it ships one, is the atomic data of request 1 and its version is recorded from
   the install), run on the ratios of G2 and G3, its output pinned as `tests/fixtures/ism/pipeline/result.json` as
   `{package, version, atomicData, ratios, temperatures, densities, limits}`. A package that is not independent of the atomic
   data of request 1 makes G2 and G3 a test of the arithmetic only, and the document says so.
3. **The spectra.** An SDSS H II region spectrum and a planetary nebula spectrum, each with the lines the ratios need (the
   [O III] 4363, 4959 and 5007 lines and the [S II] 6716 and 6731 lines), under the rights and rule of
   [ISM.md](ISM.md) requests 1 and 5; the line pack needs the oxygen and sulphur lines first.

## What follows

Nothing runs until the three arrive. When they do: a session reads this file, measures G1 to G6 against the committed
thresholds, records the verdict and its register row, and builds only what the verdict allows (A: both diagnostics behind the
disclosure with their intervals and domains; B: the one; C: the reading step). No bound moves in the meantime.

<!-- Listed in DOCUMENTS.md. -->
