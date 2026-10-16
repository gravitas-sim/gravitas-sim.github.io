// =============================================================================
// How far a reader has got, read from this browser's storage
// -----------------------------------------------------------------------------
// The Library and Home show progress they do not own: each surface saves its
// own, under its own key, and this only reads. Nothing is written, and nothing
// leaves the browser.
//
//   lesson        gravitas_investigation_<id>, the steps seen (js/investigations.js)
//   observatory   gravitas_guides, one record per guide (js/observatory/guidePanel.js)
//   lab3d         gravitas_lab3d_guide_<id>_<path> (js/lab3d/view/guidePanel.js)
//   mission       gravitas_missionlab_<id>_<path> (js/mission/lab/guidePanel.js)
//
// A lesson says how many of its steps were seen, so it can be finished. A
// guide's record says only that it was opened and where on its path the
// reader is, so a guide is "in progress" once opened, and never claimed done.
// =============================================================================

const read = key => {
  try {
    return JSON.parse(window.localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
};

const opened = value =>
  value && typeof value === 'object' && Object.keys(value).length > 0;

/**
 * The progress of one Library entry, in the shape the browser's filters read.
 * @param {object} entry - A library.json entry
 * @returns {{started: boolean, done: number, total: number}} Progress
 */
export function progressOf(entry) {
  const id = String(entry?.id || '').replace(/^[a-z]+:/, '');
  const total = entry?.steps || 0;
  let started = false;
  let done = 0;
  if (entry?.format === 'lesson') {
    const saved = read(`gravitas_investigation_${id}`);
    started = Boolean(saved);
    done = Array.isArray(saved?.visited) ? saved.visited.length : 0;
  } else if (entry?.format === 'observatory') {
    started = opened(read('gravitas_guides')?.[id]);
  } else if (entry?.format === 'lab3d' || entry?.format === 'mission') {
    const prefix =
      entry.format === 'lab3d'
        ? 'gravitas_lab3d_guide_'
        : 'gravitas_missionlab_';
    started = ['intro', 'advanced'].some(p =>
      opened(read(`${prefix}${id}_${p}`))
    );
  }
  // A guide is never counted finished: its record cannot say so.
  return { started, done, total: entry?.format === 'lesson' ? total : 0 };
}
