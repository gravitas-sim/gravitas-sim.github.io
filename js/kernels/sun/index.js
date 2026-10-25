// The solar kernel (Roadmap III Prompt 194, SUN_KERNEL.md): the disc geometry of
// a solar image, the sub-Earth point, rotation from tracked spots bounded by a
// fixed-form reference law, and a flux to the Sun's luminosity and temperature.
// Pure modules with no DOM and no clock.
export * from './geometry.js';
export * from './ephemeris.js';
export * from './rotation.js';
export * from './irradiance.js';
