// =============================================================================
// The gradebook adapters, by name
// -----------------------------------------------------------------------------
// Each adapter is a module of its own and is fetched when its button is
// pressed, so the review page carries none of them until an instructor asks for
// one. The model and the marks are shared and small.
// =============================================================================

/** The adapters, each loaded on demand. */
export const ADAPTERS = Object.freeze({
  canvas: {
    file: 'canvas',
    load: () => import('./canvas.js').then(m => ({ write: m.canvasCsv, ...m })),
  },
  moodle: {
    file: 'moodle',
    load: () => import('./moodle.js').then(m => ({ write: m.moodleCsv, ...m })),
  },
  d2l: {
    file: 'd2l',
    load: () => import('./d2l.js').then(m => ({ write: m.d2lCsv, ...m })),
  },
});
