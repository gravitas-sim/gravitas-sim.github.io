// The radio kernel (Roadmap III Prompt 241, RADIO.md): the 21-cm line and the
// Doppler scale, the LSR transform, the fixed longitude mask and the geometry of
// a sightline, the terminal-velocity edge, the tangent-point circular speed with
// its interval, the column density under the thin assumption, and a labelled
// synthetic HI spectrum generator. Pure modules: no DOM, no clock. The pulsar
// work of Prompt 242 will join this directory.
export * from './constants.js';
export * from './lsr.js';
export * from './geometry.js';
export * from './edge.js';
export * from './tangent.js';
export * from './column.js';
export * from './synthetic.js';
