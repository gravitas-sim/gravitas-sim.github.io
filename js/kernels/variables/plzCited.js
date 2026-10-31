// =============================================================================
// The cited numbers of the metallicity term (Prompt 223)
// -----------------------------------------------------------------------------
// Read from the papers' text, not measured here; tests/variablesII.test.js holds
// them equal to tests/fixtures/variables-ii/citations.json, which carries the
// place in each paper.
//
//   riess2022   Z_W = -0.217 +- 0.046 mag/dex, the Wesenheit magnitude's
//               dependence on [O/H] relative to the Sun (Riess et al. 2022, ApJ
//               934, L7, Section 6.2 and equation 1)
//   breuval2022 gamma = -0.280 +- 0.078 mag/dex, the same term from a different
//               fit (Breuval et al. 2022, ApJ 939, 89, Table 4, W_H)
//   hosts       the mean [O/H] of each galaxy's Cepheids (Riess et al. 2022,
//               Table 3; the LMC from Section 3.4), dex
//   range       the span of the mean [O/H] of that calibration's samples
// =============================================================================

export const CITED_PLZ = Object.freeze({
  riess2022: Object.freeze({ gamma: -0.217, sigma: 0.046, zRef: 0 }),
  breuval2022: Object.freeze({ gamma: -0.28, sigma: 0.078 }),
  hosts: Object.freeze({
    lmc: Object.freeze({ value: -0.29, sigma: 0.02 }),
    n4258: Object.freeze({ value: -0.1, sigma: 0.05 }),
    m101: Object.freeze({ value: 0.1, sigma: 0.05 }),
  }),
  range: Object.freeze([-0.72, 0.17]),
});
