// The 3-D lab's "Describe the view" action: its English
// (js/lab3d/view/describe.js). Spanish in ./es.lab3dDescribe.js, with the same
// ids. Every sentence states a number or a setting the page already shows; none
// says what it means.

export const EN_LAB3DDESCRIBE = {
  'd.heading': 'Description of the view',
  'd.none': 'There is no system to describe yet.',
  'd.mode.kepler':
    'Run mode: Kepler-only; each body follows its own two-body orbit, so no orbit changes. One tick is {tick}.',
  'd.mode.nbody':
    'Run mode: N-body, {scheme}, step {step}; one tick is {tick}.',
  'd.mode.adaptive':
    'Run mode: N-body, {scheme}, tolerance {tol}; one tick is {tick}.',
  'd.mode.precomputed':
    'Run mode: a precomputed run played back ({source}); one tick is {tick}.',
  'd.clock': 'The clock reads {t}.',
  'd.bodies': '{n} live bodies: {names}.',
  'd.bodies.more': '{n} live bodies: {names}, and {more} more.',
  'd.setup':
    'Frame: {frame}. Reference plane: {plane}. Projection: {projection}.',
  'd.camera':
    'The camera looks from {above}° {side} the reference plane, {around}° around it, and the view is {size} times as tall as the system.',
  'd.above': 'above',
  'd.below': 'below',
  'd.reach':
    'The farthest body from the center of mass is {name}, at {distance}.',
  'd.orbit': '{name} about {primary}: a = {a}, e = {e}, i = {i}°.',
  'd.orbit.unbound': '{name} about {primary}: unbound, e = {e}, i = {i}°.',
  'd.orbits.more': 'And {more} more orbits are in the orbits table.',
  'd.mutual': 'Mutual inclination of {a} and {b}: {angle}°.',
  'd.held':
    'A step of the investigation is asking for a measurement, so the orbit numbers are left out. Check the answer, or show it, to have them.',
  'd.unit.au': 'AU',
  'd.unit.day': 'd',
  'd.unit.length': 'length units',
  'd.unit.time': 'time units',
};
