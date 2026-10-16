// The detector kernel: a CCD frame forward model, the reduction nodes and the
// CCD equation with its exposure-time calculator. Pure modules;
// see CALIBRATION_LAB.md.
export * from './frame.js';
export * from './reduce.js';
export * from './snr.js';
export * from './bands.js';
export * from './lightcurve.js';
export * from './pipeline.js';
export * from './lab.js';
