// The two ways to put an investigation back, named by what they touch, in
// English. "Reset the scene" never touches answers; "Start this investigation
// over" deletes them. Every control, name, tooltip, dialog and help line that
// speaks of either takes its words from here.
export const EN_RESET = {
  'reset.scene': 'Reset the scene',
  'reset.scene.hint':
    "Rebuilds this step's scene. Your answers are not changed.",
  'reset.scene.none':
    'Reset the scene is off on this step: it has no scene or instrument to rebuild.',
  'reset.did.scene':
    'The scene is back at the start of this step. Your answers are not changed.',
  'reset.did.tool':
    'The instrument is back at the start of this step. Your answers are not changed.',
  'reset.did.both':
    'The scene and instrument are back at the start of this step. Your answers are not changed.',
  'reset.restart': 'Start this investigation over',
  'reset.restart.hint':
    "Deletes this investigation's saved answers and starts again at step 1. It asks first, and you can undo it until you close this investigation.",
  'reset.ask.title': 'Start this investigation over?',
  'reset.ask.count': 'Saved answers and readings that will be deleted:',
  'reset.ask.parts': 'Answers: {a}. Readings: {r}.',
  'reset.ask.scene': 'The scene is reset too, from the start of step 1.',
  'reset.ask.assigned':
    "This is an activity: its saved answers go too. Your instructor's version of the activity does not change.",
  'reset.ask.lost':
    'Discarding removes them from this device. Download a backup first if you may want them back. You can also undo until you close this investigation.',
  'reset.ask.lost.mem':
    'This browser is not keeping your answers, so they are only in this tab. Discarding removes them from the tab. Download a backup first if you may want them back. You can also undo until you close this investigation.',
  'reset.ask.none': 'Nothing is saved here yet, so no answers will be deleted.',
  'reset.ask.progress':
    'Your place and the steps you have visited are reset. You can undo until you close this investigation.',
  'reset.ask.backup': 'Download a backup first',
  'reset.ask.go': 'Discard answers and start over',
  'reset.ask.cancel': 'Cancel',
  'reset.undo.said': {
    one: 'Started over. 1 saved answer or reading was deleted. You can undo until you close this investigation.',
    other:
      'Started over. {n} saved answers and readings were deleted. You can undo until you close this investigation.',
  },
  'reset.undo.none':
    'Started over. Nothing had been saved, so only your place was reset. You can undo until you close this investigation.',
  'reset.undo': 'Undo',
  'reset.undo.done': 'Your answers and readings are back.',
  'reset.leave': "Leave this investigation's scene: {what}",
  'reset.leave.hint': "Leaves this investigation's scene. {what}",
  'reset.help.title': 'Starting over',
  'saved.scene.leave':
    'The scene you set up is not saved. When you come back, it is rebuilt from the start of this step.',
  'saved.scene.back':
    'The scene is rebuilt from the start of this step. The scene you set up last time is not kept.',
};
