// =============================================================================
// The radiation and photometry kernel (Roadmap II, Prompt 82)
// -----------------------------------------------------------------------------
// Pure modules: no DOM, no module state, no imports from the application except
// the unit registry (js/units/registry.js, itself pure). They run in Node and in
// a Worker alike. The kernel does not import its data: bandpasses, the line
// list, the extinction law and the bolometric-correction law are data packs
// (js/data/radiation/*), handed in by the caller, so a page that wants the
// arithmetic does not pay for the bands. RADIATION.md describes the whole.
// =============================================================================

export * from './constants.js';
export * from './planck.js';
export * from './photometry.js';
export * from './magnitudes.js';
export * from './extinction.js';
export * from './doppler.js';
export * from './lines.js';
export * from './units.js';
