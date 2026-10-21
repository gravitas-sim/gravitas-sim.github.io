// The statistics kernel: intervals labelled by method, resampling and Monte
// Carlo propagation, residual diagnostics, comparison of two estimates, the
// selection-function object and the biases it leaves. Pure modules; see
// STATISTICS.md. Not yet imported by any shipped module (the adoption waits, see
// D-R10-31), so the build does not install them.
export * from './special.js';
export * from './intervals.js';
export * from './resample.js';
export * from './diagnostics.js';
export * from './compare.js';
export * from './selection.js';
