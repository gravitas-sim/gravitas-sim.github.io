// =============================================================================
// Lessons that arrive as capability packages
// -----------------------------------------------------------------------------
// For each investigation a package provides, hand the lesson registry a loader
// that goes through the resolver, and the same for its translations. Imported
// by the lesson engine; the registry itself never imports the platform.
// =============================================================================

import { LESSONS } from './catalog.generated.js';
import { loadBuiltin } from './resolver.js';
import { provideLessonLoaders } from '../data/investigations/registry.js';

for (const [id, [entry, translations]] of Object.entries(LESSONS)) {
  provideLessonLoaders(id, {
    lesson: () => loadBuiltin(entry),
    translations: Object.fromEntries(
      Object.entries(translations).map(([locale, ref]) => [
        locale,
        () => loadBuiltin(ref),
      ])
    ),
  });
}
