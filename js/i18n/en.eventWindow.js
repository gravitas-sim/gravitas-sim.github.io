// =============================================================================
// The words of a lesson step's event window, in English
// -----------------------------------------------------------------------------
// Imported by js/investigations/eventWindow.js when a step with a pause-at-event
// watch opens, for the one locale in use. Not in en.js, whose text is an input
// of the instructor materials' digest. Replay and Rewind to here are the
// transport's own words (transport.replay, transport.rewind in en.js).
// =============================================================================

export const EN_EVENT_WINDOW = {
  'window.armed':
    'The watch is armed for you: the scene stops by itself at the event.',
  'window.foreign':
    'Your own watch is armed, so this step has not armed one. Disarm yours in the Pause at event panel to use the step’s.',
  'window.refused':
    'The watch could not be armed here; the Pause at event panel says why.',
  'window.wait': 'Replay is offered once the event has happened.',
  'window.at': 'Stopped at: {kind}.',
  'window.limit':
    'The event is older than the recorded history, which keeps the last {frames} frames (about {seconds} s of running, {span} of simulated time here), so it cannot be replayed. Arm the watch again to catch the next one.',
  'window.armAgain': 'Arm again',
  'window.atEvent': 'Replay: at the event.',
  'window.jumped':
    'Showing the recorded frame at the event. The LIVE button puts the scene back.',
  'window.replayHelp':
    'Replay plays the recorded frames around the event, then puts the live scene back exactly. Comma and period step through them; Escape stops. Trails restart, and particles are not recorded.',
  'window.rewindWhy':
    'Replay or step back to a frame first: Rewind to here makes that frame the scene.',
  'window.rewindDrops':
    'Rewind to here makes the frame shown the scene and drops the history after it.',
};
