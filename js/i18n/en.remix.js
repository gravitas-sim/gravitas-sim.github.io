// =============================================================================
// The words for opening an investigation link, in English
// -----------------------------------------------------------------------------
// Read by js/remix/open.js and js/remix/panel.js, which load only when a link
// like this is opened or a remix is made.
// =============================================================================

export const EN_REMIX = {
  'remix.error.wrongKind': 'That is not an investigation link.',
  'remix.error.newerVersion':
    'That link was made by a newer Gravitas than this one. Reload the page, or ask for the investigation as a file.',
  'remix.error.corrupt':
    'That link is incomplete or was cut short in transit. Ask for it again, or for the investigation as a file.',
  'remix.error.tooLarge':
    'That link holds more than a link can carry. Ask for it as a file.',
  'remix.error.notPack': 'That link does not hold an investigation.',
  'remix.error.notInstalled':
    '“{id}” is not installed in this browser. Install it from the catalog first.',
  'remix.error.noOriginal':
    'That investigation was made from “{id}”, which this Gravitas does not have.',
  'remix.error.invalid':
    'That investigation cannot be opened: {field} {message}',
  'remix.notice.opened':
    '“{title}” is an instructor’s version of “{original}”. The science is the original’s; the words and the order are the instructor’s.',
};
