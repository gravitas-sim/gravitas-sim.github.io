# Time-domain astronomy and the first rung of the distance ladder (Roadmap II Prompt 96)

**Status: partial.** The kernel, three data packs and three instruments are
built and tested. The four investigations, their Spanish and depth text,
instructor material and e2e are not (D-LADDER-02).

## What is here

| Piece | Where | What it is |
|---|---|---|
| Fourier fit, shape numbers | `js/kernels/variables/fit.js` | K-harmonic series, peak-to-peak amplitude, mean, R21, R31, phi21 |
| Period search | `period.js` | Lomb-Scargle, peak width at half power, harmonic refinement, bootstrap, alias periods |
| Leavitt's law | `ladder.js` | OLS with covariance, clipped fit, host distance with an error budget (host, anchor, slope, anchor distance), Wesenheit dust residual from the radiation kernel's law |
| Classification | `classify.js` | five synthetic classes through the periodic forward model, measured by the same pipeline, leave-one-out kNN, confusion table |
| Packs | `tools/data-packs/variables.mjs` | `tess-su-dra-s15`, `tess-eta-aql-s81`, `shoes-r22-cepheids`; rows are sidecars in `variables/` |
| Class sample | `variables/class-sample.json`, `tools/variables-sample.mjs` | the measured synthetic sample; a test holds it to the kernel |
| Instruments | `js/variablesWidgets.js` | `variable-fold`, `leavitt-law`, `variable-class`, English and Spanish words |

## Measured results

- SU Dra: refined period 0.66041 d against Monson et al. 2017's 0.66042001 d (1e-5 relative); amplitude about 0.71 mag in the TESS band.
- Eta Aql (3.7 cycles, saturated star, half the cadences flagged in sector 54, so sector 81): 7.226 d against 7.1766 d (0.7 percent); the run cannot do better.
- SU Dra seen once a night: the spectrum's strong peaks are the true period and its 1-per-day aliases (1.94 d and 0.40 d).
- LMC slope -3.290 +- 0.019 mag/dex (339 stars) against the paper's -3.284 +- 0.017.
- NGC 4258 from the LMC: mu = 29.403 +- 0.051 against the maser value 29.397 +- 0.032 (0.1 sigma); M101: 29.21 +- 0.05 (6.95 Mpc). The budget is dominated by the host's scatter (0.04 mag) and the LMC distance (0.026 mag); the slope term is below 0.003 mag.
- Wesenheit magnitude leaves 0.040 mag of extinction per magnitude of A_V (R_V 3.3, CCM89 at the HST pivot wavelengths), against 0.207 for F160W alone.
- Period recovery over seeds: pulsators within 0.5 percent; an eclipsing binary comes back at half its orbit. Classification leave-one-out: period only 0.82, with amplitude 0.88, with R21 0.99 (24 per class, seed `variables-sample`).
- Error-budget coverage (400 simulated hosts): one sigma holds 60 to 78 percent of the truths.

## Not modelled

Pulsar timing (out of scope, as the prompt says); metallicity and crowding corrections to the Cepheid relation; blends, outbursts and second periods in the classification sample; Blazhko modulation. The link to Prompt 91's Hubble-constant packs is absent because Prompt 91 has not landed.

## Rights

See D-LADDER-01 in `DECISION_REGISTER.md`.
