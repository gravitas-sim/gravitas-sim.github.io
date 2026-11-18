// =============================================================================
// The words of a lesson step's event window, in English
// -----------------------------------------------------------------------------
// Imported by js/investigations/eventWindow.js when a step with a pause-at-event
// watch opens, for the one locale in use. Not in en.js, whose text is an input
// of the instructor materials' digest. Replay and Rewind to here are the
// transport's own words (transport.replay, transport.rewind in en.js).
// =============================================================================

export const EN_EVENTWINDOW = {
  'window.armed': 'Armed for you: the scene stops at the event.',
  'window.foreign':
    'Your own watch is armed, so this step armed none. Disarm yours to use the step’s.',
  'window.refused':
    'The watch could not be armed; the Pause at event panel says why.',
  'window.wait': 'Replay comes once the event has happened.',
  'window.at': 'Stopped at: {kind}.',
  'window.limit':
    'The event is older than the recording (the last {frames} frames, about {seconds} s of running, {span} here). Arm again to catch the next one.',
  'window.armAgain': 'Arm again',
  'window.atEvent': 'Replay: at the event.',
  'window.jumped': 'Showing the frame at the event. LIVE puts the scene back.',
  'window.replayHelp':
    'Replay plays the frames around the event, then puts the live scene back exactly. Comma and period step; Escape stops. Particles are not recorded.',
  'window.rewindWhy': 'Replay or step back to a frame first.',
  'window.rewindDrops':
    'Rewind to here makes this frame the scene and drops later history.',
};
