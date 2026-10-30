// =============================================================================
// Cluster fitting: the stated constants (Prompt 219, CLUSTER_FITTING.md)
// -----------------------------------------------------------------------------
// Every number a fit rests on that is not data is here, with where it comes
// from; a result carries them (`settings`) so a reader sees what was assumed.
// Committed in tests/fixtures/cluster-fit/thresholds.json before the kernel.
// =============================================================================

export const VERSION = '1.0.0';
export const MODEL_ID = 'cluster-isochrone-fixed-metallicity';

/** A_g / E(g - r) for SDSS g and r: Schlafly and Finkbeiner 2011, ApJ 737, 103, Table 6 (D-R9-05). */
export const EXTINCTION_RATIO = 3.245;
/** E(g - r) toward NGC 2420 from the dust map, as the populations guides adopt it. */
export const DEFAULT_REDDENING = 0.042;

/** The stated model of the photometric errors (typical SDSS values), per band. */
export const ERROR_MODEL = Object.freeze({
  floor: 0.015,
  sigmaAt: 0.1,
  magAt: 21.45,
});

/** The colour-magnitude window and its bins. */
export const WINDOW = Object.freeze({
  g: [14.5, 20.5],
  colour: [-0.3, 1.5],
  rowMag: 0.1,
  colourWidth: 0.04,
});
export const ROWS = Math.round((WINDOW.g[1] - WINDOW.g[0]) / WINDOW.rowMag);
export const COLS = Math.round(
  (WINDOW.colour[1] - WINDOW.colour[0]) / WINDOW.colourWidth
);

/** The contamination fraction the model assumes of the members it is given. */
export const DEFAULT_CONTAMINATION = 0.15;
/** Fewer members than this in the window and the fit says "not constrained". */
export const MINIMUM_MEMBERS = 60;
/** The cluster must beat the all-field model by this much deviance (5 sigma). */
export const DETECTION_DEVIANCE = 25;
/** The scan's steps and its bounds (log10 age in years, mag). */
export const GRID = Object.freeze({
  logAge: [9.0, 9.6],
  stepAge: 0.02,
  stepDm: 0.02,
  dm: [10.5, 13.5],
});
/** 1-sigma coverage of a central normal interval, erf(1 / sqrt 2). */
export const ONE_SIGMA = 0.6826894921370859;

/** The scaled units of the curve comparison (0.03 in colour, 0.15 in magnitude). */
export const CURVE_SCALE = Object.freeze([0.03, 0.15]);

/** Kroupa (2001): the IMF's slopes and its break, in solar masses. */
export const IMF = Object.freeze({ lo: 0.08, break: 0.5, a1: 1.3, a2: 2.3 });
