// =============================================================================
// Revised, replaced and retired steps and investigations, in English
// -----------------------------------------------------------------------------
// Its own fragment, like ./en.adapt.js: only a page that meets saved work or a
// link naming something revised loads it (js/investigations/revisionText.js), so
// no lesson route carries it. The rule behind the words is the task-change
// contract (CONTRIBUTING_CONTENT.md, "Changing a shipped step").
// =============================================================================

export const EN_REVISIONS = {
  'rev.earlier': 'answered in an earlier version',
  'rev.heading': 'Answers from an earlier version ({n})',
  'rev.item':
    '"{was}" - your answer: {text}. Answered in an earlier version (before {release}); not marked.',
  'rev.unknown':
    'A step this investigation no longer has - your answer: {text}. Answered in an earlier version; not marked.',
  'rev.now': 'The step is now: {title}.',
  'rev.gone': 'No step replaces it.',
  'rev.replaced':
    'The step "{was}" was replaced in release {release} by "{title}".',
  'rev.removed':
    'The step "{was}" was removed in release {release}; no step replaces it.',
  'rev.inv.moved':
    'This investigation was replaced in release {release} by "{title}", which is open now.',
  'rev.inv.retired':
    'This investigation was retired in release {release} and is no longer in Gravitas.',
  'rev.inv.pin':
    'The investigation "{id}" was replaced in release {release} by "{to}".',
  'rev.inv.pinGone':
    'The investigation "{id}" was retired in release {release}; no investigation replaces it.',
};
