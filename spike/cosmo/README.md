# spike/cosmo: Prompt 90 cosmology and extragalactic data gate

Disposable prototype and evidence for COSMOLOGY_GATE.md. Nothing in `js/`, the
routes or the budgets imports from here; this folder imports `js/inference/*`
and `js/plot/plot.js` read-only. `THRESHOLDS.md` was committed first.

| Step | Command |
|---|---|
| pin the SDSS answers / verify | `node fetch-sdss.mjs` / `--verify` |
| verify the DES pin | `python3 fetch-des.py` |
| derivatives, twice, byte-identical | `./reproduce.sh` |
| references (astropy 6.0.1, SciPy 1.13.1) | `python3 refs.py` (this Mac lacks PyYAML; an import-only stub was put on PYTHONPATH) |
| kernel against the references | `node validate-flrw.mjs`, `node mattig-check.mjs` |
| inference-core fits | `python3 ref-lowz.py; node hubble-fit.mjs fit; node hubble-fit.mjs coverage 200` |
| wedge through the plot component | `node wedge.mjs` |

Results are in `results/`; `SOURCES.json` holds the pins.
