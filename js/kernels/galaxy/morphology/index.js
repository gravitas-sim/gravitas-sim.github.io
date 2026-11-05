// The galaxy morphology kernel (Prompt 249, GALAXY_MORPHOLOGY.md): elliptical isophotes, the surface-brightness
// profile, the half-light radius from the curve of growth, total magnitude and colour, concentration and
// asymmetry, an unresolved refusal, a classification function that takes a caller's rule, and a labelled
// synthetic image generator with analytic truths.
export * from './constants.js';
export * from './analytic.js';
export * from './synthetic.js';
export * from './frame.js';
export * from './growth.js';
export * from './measure.js';
export * from './classify.js';
