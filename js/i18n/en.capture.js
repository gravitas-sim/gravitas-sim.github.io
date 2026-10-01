// =============================================================================
// The words for a captured frame's provenance line, in English
// -----------------------------------------------------------------------------
// The second line a screenshot or a clip of a real system carries under its
// title: where the scenario's numbers come from (js/data/realSystemSources.js).
// Split out of ./en.js because every page that imports the main catalog - the
// Studio among them - would otherwise download them, and only a capture reads
// them. js/ui.js loads this and ./es.capture.js before the first capture.
// =============================================================================

export const EN_CAPTURE = {
  'capture.caption.sources': 'parameters: {sources}',
  'capture.caption.approximate.some': 'some approximate',
  'capture.caption.approximate.all': 'approximate, unsourced',
};
