// =============================================================================
// The two numbers the cooling law was calibrated to (cooling.js calibrate())
// -----------------------------------------------------------------------------
// Measured once by the validator (npm run remnants:validate) on the pin of the
// Montreal sequences (tests/fixtures/remnants/cooling-pin.json) by the rules of
// tests/fixtures/remnants/thresholds.json, and agreed by the independent oracle
// (tools/remnants-oracle/oracle.py) to 1e-14. A test recomputes them from the
// pin; if either moved, a calibration changed, and that is a decision.
//
//   TAU_YR           the law's coefficient: t = TAU (M / Msun)^(5/7) (L / Lsun)^(-5/7)
//                    in years for the table's C/O core, fitted at 0.6 solar masses
//   MODEL_DELTA_LN   the 95th percentile of |ln(t_law / t_table)| over the domain
//                    rows of 0.5, 0.6 and 1.0 solar masses: the law's own error
// =============================================================================
export const TAU_YR = 8192398.854866501;
export const MODEL_DELTA_LN = 0.1851102587627846;
