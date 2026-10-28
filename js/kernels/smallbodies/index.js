// The small-body kernel (Roadmap III Prompt 198, SMALL_BODIES.md): the belts as a
// catalog's distributions (histograms, gaps as measured depletions against a smooth
// baseline, population counts by orbit class, the survey's selection), the mean-
// motion resonance locations they are read against, and a bounded light-curve model
// (a triaxial ellipsoid, the rotation period by the two-maxima rule, the amplitude
// to an axis-ratio BOUND). Pure modules with no DOM and no clock; imported by no
// page yet.
export * from './resonances.js';
export * from './belts.js';
export * from './selection.js';
export * from './lightcurve.js';
export * from './synthetic.js';
