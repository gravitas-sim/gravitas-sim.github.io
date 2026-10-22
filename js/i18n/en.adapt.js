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
    'Change the order of the steps, say something of your own on a step, and say when it is due. Each change is checked against the steps the investigation itself depends on before the link is made, and a change that would make a step ask about something else is refused, naming the step it needs.',
  'adapt.order': 'Order of the steps',
  'adapt.order.empty': 'Choose steps above to set their order.',
  'adapt.up': 'Earlier',
  'adapt.down': 'Later',
  'adapt.remove': 'Remove',
  'adapt.up.label': 'Move “{step}” earlier',
  'adapt.down.label': 'Move “{step}” later',
  'adapt.remove.label': 'Remove “{step}” from the activity',
  'adapt.note': 'Your words for this step (optional)',
  'adapt.note.en': 'English',
  'adapt.note.es': 'Spanish',
  'adapt.due': 'When it is due, in your own words (optional)',
  'adapt.due.help':
    'For example “Friday 9 October, before lab; three tries”. Students read it under the title. Nothing is checked or enforced.',
  'adapt.marking': 'Print the marking note in the student’s lab report',
  'adapt.more': 'Start the “More” sections',
  'adapt.more.depth': 'As the depth sets them',
  'adapt.more.open': 'Open',
  'adapt.more.shut': 'Shut',
  'adapt.moved': 'Moved “{step}”.',
  'adapt.removed': 'Removed “{step}”.',
  'adapt.refused': 'Not changed: {why}',
  'adapt.problem.requires.later':
    '“{step}” reads “{needs}”, so “{needs}” has to come first.',
  'adapt.problem.requires.absent':
    '“{step}” reads “{needs}”, which this activity does not include.',
  'adapt.problem.when.later':
    '“{step}” answers “{needs}”, so “{needs}” has to come first.',
  'adapt.problem.when.absent':
    '“{step}” answers “{needs}”, which this activity does not include.',
  'adapt.problem.reveal.earlier':
    'The answer to the prediction “{step}” arrives at “{needs}”, which has to come after it.',
  'adapt.problem.reveal.absent':
    'The answer to the prediction “{step}” arrives at “{needs}”, which this activity does not include.',
  'adapt.problem.setup.world':
    '“{step}” is about the world “{needs}” builds, so it has to stay after it and before the next world.',
  'adapt.problem.scene.scene':
    '“{step}” keeps the scene “{needs}” sets up, so it has to stay under it.',
  'adapt.problem.depth': '“{step}” is deeper than this activity’s depth.',
  'adapt.report.title': 'This activity was made with an earlier version',
  'adapt.report.lead':
    'Since it was made, the investigation has changed under it. You can keep it as it was made, or update it to the lesson as it is now.',
  'adapt.report.rewritten':
    'Rewritten, so what is answered is not what was asked: {steps}. Answers already saved to these steps are set aside.',
  'adapt.report.removed':
    'No longer in the investigation, so left out: {steps}.',
  'adapt.report.graph': 'Now out of order or incomplete',
  'adapt.report.same':
    'Steps whose words changed but not their questions, instruments or answers are not listed: nothing a student answers has moved.',
  'adapt.report.keep': 'Keep it as it was made',
  'adapt.report.repin': 'Update it to the current lesson',
  'adapt.report.kept': 'Kept as it was made.',
  'adapt.report.repinned':
    'A new activity for the lesson as it is now. It is a different activity from the old one: students who used the old link start the rewritten steps afresh, and nothing already saved is changed.',
  'adapt.report.link': 'The updated activity’s link',
  'adapt.report.open': 'Open the updated activity',
  'adapt.report.nothing': 'Nothing is left to update.',
  'adapt.due.shown': 'Due: {due}',
  'adapt.note.from': 'From your instructor',
};
