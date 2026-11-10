// The crossmatch kernel (Prompt 263, CROSSMATCH.md): epoch propagation, a cone
// search, a nearest-neighbour match with a shifted-match false-rate estimate,
// the joined table and its record, and populations. No shipped module imports it.
export * from './constants.js';
export * from './geometry.js';
export { propagateCatalog } from './epoch.js';
export * from './match.js';
export * from './population.js';
export * from './record.js';
export * from './packs.js';
