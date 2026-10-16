// The stellar-structure kernel (Roadmap II Prompt 95, STELLAR_STRUCTURE.md):
// Lane-Emden polytropes, homology scaling, nuclear-timescale estimates and the
// white-dwarf mass-radius relation. Pure modules, no DOM and no clock.
export * from './constants.js';
export * from './polytrope.js';
export * from './star.js';
export * from './homology.js';
export * from './whiteDwarf.js';
export { createStellarClient } from './client.js';
