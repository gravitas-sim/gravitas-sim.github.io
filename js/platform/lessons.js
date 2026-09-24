// =============================================================================
// Lessons that arrive as capability packages
// -----------------------------------------------------------------------------
// For each investigation a package provides, hand the lesson registry a loader
// that goes through the resolver, and the same for its translations. Imported
// by the lesson engine; the registry itself never imports the platform.
// =============================================================================

import { CATALOG } from './catalog.generated.js';
import { loadBuiltin } from './resolver.js';
import { provideLessonLoaders } from '../data/investigations/registry.js';

export function installPackagedLessons(catalog = CATALOG) {
  const installed = [];
  for (const p of catalog) {
    for (const inv of p.provides?.investigations || []) {
      const translations = {};
      for (const t of p.provides?.translations || []) {
        if (t.investigation === inv.id) {
          translations[t.locale] = () => loadBuiltin(t.entry);
        }
      }
      provideLessonLoaders(inv.id, {
        lesson: () => loadBuiltin(inv.entry),
        translations,
      });
      installed.push(inv.id);
    }
  }
  return installed;
}

installPackagedLessons();
