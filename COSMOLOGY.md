# Cosmology kernel and Hubble-diagram data (Roadmap II, Prompt 91)

Built on the verdicts of [COSMOLOGY_GATE.md](COSMOLOGY_GATE.md). Status: kernel,
data, forward model and fits done and tested; the three instruments and the
four investigations landed in #254 (D-COSMO-14).

## Kernel: `js/kernels/cosmology/`

`flrw.js` gives comoving, transverse, luminosity and angular-diameter
distances (Mpc), lookback time and age (Gyr), the distance modulus, and the
wedge conversion, for flat and open Lambda-CDM (the open matter-only family is
Omega_L = 0). Assumptions, all of them: homogeneity and isotropy; w = -1;
radiation neglected (under 0.5% in distance to z = 5, so that is the teaching
range); no peculiar velocities or growth of structure. Closed universes are
refused with `ClosedModelError`. `fit.js` holds the Hubble-law and flat
Lambda-CDM supernova models for the inference core, a synthetic-diagram
generator, and the H0 degeneracy profile.

## Validation (`npm run cosmology:validate`)

| Check | Bar | Measured |
|---|---|---|
| 900 grid points x 5 quantities against astropy 6.0.1 | 1e-6 | 1.8e-12 |
| against quadrature | 1e-9 | 9.1e-16 |
| open matter-only, 60-digit Mattig (D-COSMO-12) | 1e-10 | under 1e-14 |
| DES-SN5YR flat fit, Omega_m (published 0.352 +- 0.017) | 0.08 | 0.3607 (0.349 to 0.372) |
| chi-square range over H0 50 to 90, offset free | flat | 1.4e-12 |
| 68% interval coverage, 200 seeded synthetic diagrams | 60 to 76% | 67.5% (bias +0.004) |

References: `tests/fixtures/cosmology-refs.json` (read by tests only).

## Data packs (`tools/data-packs/cosmology.mjs`, sidecars in `cosmology/`)

`hubble-1929-table1` (public domain), `des-sn5yr-hd` (CC BY 4.0; statistical
errors, H0 = 70 scale, 75 down-weighted rows kept), `sdss-dr18-redshift-slice`
(public domain; flux-limited), `coma-cluster-quoted` (the scenario's four
numbers; only the dispersion has a checked citation). The raw Hubble table and
DES CSV are committed beside the tool. Loader: `js/cosmologyData.js`. Forward
model: `hubble-diagram`. Not built: Pantheon+, SPARC, Faber-Jackson, Coma from SDSS.

## Not done

Nothing from the original list: the instruments (hubble-law, hubble-diagram,
redshift-wedge), the four investigations, their Spanish and depth files,
instructor material and e2e landed in #254, which also gave The First Rung
(#252) its Hubble-constant step. Still not built are the datasets named under
Data packs (Pantheon+, SPARC, Faber-Jackson, Coma from SDSS); the Coma pack's
radius and masses stay unsourced teaching values.
