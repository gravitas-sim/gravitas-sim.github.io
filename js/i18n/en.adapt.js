// =============================================================================
// Adapting an activity, and what changed under one, in English (Prompt 175)
// -----------------------------------------------------------------------------
// Its own fragment: only the activity builder (?assign=) and a page that opens
// an adapted or out-of-date activity read it, so it travels with ./adapt.js
// (js/assignments/adaptText.js registers it) and no lesson route carries it.
// =============================================================================

export const EN_ADAPT = {
  'adapt.title': 'Adapt the activity',
  'adapt.hint':
    'Change the order of the steps, add your own words to a step and say when it is due. Each change is checked against the steps the investigation depends on, and one that would break them is refused, naming the step.',
  'adapt.order': 'Order of the steps',
  'adapt.up': 'Earlier',
  'adapt.down': 'Later',
  'adapt.remove': 'Remove',
  'adapt.note': 'Your words for this step (optional)',
  'adapt.note.en': 'English',
  'adapt.note.es': 'Spanish',
  'adapt.due': 'When it is due, in your own words (optional)',
  'adapt.marking': 'Print the marking note in the lab report',
  'adapt.more': 'Start the “More” sections',
  'adapt.more.depth': 'As the depth sets them',
  'adapt.more.open': 'Open',
  'adapt.more.shut': 'Shut',
  'adapt.moved': 'Moved “{step}”.',
  'adapt.removed': 'Removed “{step}”.',
  'adapt.refused': 'Not changed: {why}',
  'adapt.problem.requires.later':
    '“{step}” reads “{needs}”, so that has to come first.',
  'adapt.problem.requires.absent':
    '“{step}” reads “{needs}”, which is not in the activity.',
  'adapt.problem.when.later':
    '“{step}” answers “{needs}”, so that has to come first.',
  'adapt.problem.when.absent':
    '“{step}” answers “{needs}”, which is not in the activity.',
  'adapt.problem.reveal.earlier':
    'The answer to the prediction “{step}” arrives at “{needs}”, which has to come after it.',
  'adapt.problem.reveal.absent':
    'The answer to the prediction “{step}” arrives at “{needs}”, which is not in the activity.',
  'adapt.problem.setup.world':
    '“{step}” is about the world “{needs}” builds, so it has to stay under it.',
  'adapt.problem.scene.scene':
    '“{step}” keeps the scene “{needs}” sets up, so it has to stay under it.',
  'adapt.problem.depth': '“{step}” is deeper than the activity’s depth.',
  'adapt.report.title': 'This activity was made with an earlier version',
  'adapt.report.rewritten':
    'Rewritten, so answers saved to them are set aside: {steps}.',
  'adapt.report.removed': 'No longer in the investigation: {steps}.',
  'adapt.report.keep': 'Keep it as made',
  'adapt.report.repin': 'Update it to the current investigation',
  'adapt.report.kept': 'Kept as made.',
  'adapt.report.repinned':
    'A new activity with its own id: students on the old link start the rewritten steps afresh.',
  'adapt.report.link': 'The updated activity’s link',
  'adapt.report.open': 'Open the updated activity',
  'adapt.due.shown': 'Due: {due}',
  'adapt.note.from': 'From your instructor',
};
