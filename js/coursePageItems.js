// =============================================================================
// A new course item of a kind (the course builder's "Add")
// -----------------------------------------------------------------------------
// Moved out of js/coursePage.js, whose line ceiling was full (Prompt 168). Only
// that page imports it, so it adds no request: esbuild inlines it.
// =============================================================================

/**
 * A new item of a kind, pinned to this build when it names a lesson.
 * @param {string} kind - lesson, assignment, scenario, guide, dataset, pack or reading
 * @param {object} d - What the page holds: freshId(base), lesson (the first
 *   lesson's id), today (YYYY-MM-DD) and scenarioTitle(id)
 * @returns {object} The item
 */
export function newItem(kind, d) {
  const { freshId, lesson, today, scenarioTitle } = d;
  const base = { kind };
  switch (kind) {
    case 'lesson':
      return { ...base, id: freshId(lesson), lesson };
    case 'assignment':
      return {
        ...base,
        id: freshId(`${lesson}-assignment`),
        lesson,
        steps: [],
        assignment: { id: 'pending', created: today },
      };
    case 'scenario': {
      const scenario = 'solar-system';
      return {
        ...base,
        id: freshId('solar-system'),
        minutes: 10,
        scenario,
        seed: 'orbit-1',
        title: { en: scenarioTitle(scenario) },
      };
    }
    case 'guide':
      return {
        ...base,
        id: freshId('l3-planes'),
        minutes: 20,
        guide: 'l3-planes',
        depth: 'core',
      };
    case 'dataset':
      return {
        ...base,
        id: freshId('tess-light-curve'),
        minutes: 15,
        dataset: 'tess-light-curve',
      };
    case 'pack':
      // Filled when its link is pasted (readPackItem).
      return {
        ...base,
        id: freshId('investigation'),
        pack: '',
        version: '1.0.0',
        link: '',
      };
    case 'reading':
      return {
        ...base,
        id: freshId('reading'),
        minutes: 20,
        title: { en: '' },
        cite: { authors: '', year: new Date().getFullYear(), source: '' },
        access: 'open',
      };
  }
  return base;
}
