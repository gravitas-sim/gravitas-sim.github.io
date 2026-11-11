// =============================================================================
// The words for the Motion setting, in English
// -----------------------------------------------------------------------------
// Imported by js/motionControl.js when the Settings panel is first built, and
// registered for the one locale in use. Not in en.js, whose text is an input of
// the instructor materials' digest.
// =============================================================================

export const EN_INTERACTION = {
  'motion.label': 'Motion',
  'motion.mode.system': 'Follow my device',
  'motion.mode.reduce': 'Reduced',
  'motion.mode.step': 'Step by step',
  'motion.hint':
    'Reduced stops the interface animating, whatever your device says. Step by step does that and starts the simulation paused: nothing moves until you step it with the period key or press play. Kept on this device; it is not in share links.',
  'motion.changed.system': 'Motion now follows your device.',
  'motion.changed.reduce': 'Interface animation is reduced.',
  'motion.changed.step':
    'Step by step: the simulation is paused. Press period to step, or play to run.',
  // A window moved without a drag (js/windowMove.js).
  'window.move.label': 'Move this panel',
  'window.move.arm':
    'Choose where its top left corner goes. The arrow keys move it too. Escape cancels.',
  'window.move.done': 'Panel moved.',
  'window.size.label': 'Resize this panel',
  'window.size.arm':
    'Choose where its top right corner goes. The arrow keys resize it too. Escape cancels.',
  'window.size.done': 'Panel resized.',
};
