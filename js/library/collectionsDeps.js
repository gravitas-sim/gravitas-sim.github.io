import { ID_COURSE_PACK, KEY_COLLECTIONS } from '../names.js';
import { readJson, writeJson } from '../storage/local.js';
import { PLATFORM_API } from '../platform/catalog.generated.js';
import { validateCoursePack } from '../course/pack.js';
import { bind } from './collections.js';
import { entryIdOfItem } from './format.js';

// =============================================================================
// The real dependencies of js/library/collections.js (Roadmap III Prompt 164)
// -----------------------------------------------------------------------------
// Importing this module binds them. The kit's editor and the tests do; the
// Library and the course home do not, because each of them already holds these
// functions and hands them over itself (see the header of collections.js).
// =============================================================================

/** The record, read and written through the storage module. */
export const deps = Object.freeze({
  read: () => readJson(KEY_COLLECTIONS, null),
  write: record => writeJson(KEY_COLLECTIONS, record, 'courses'),
  entryIdOfItem,
  format: ID_COURSE_PACK,
  validate: pack => validateCoursePack(pack, { locales: ['en', 'es'] }),
  platform: PLATFORM_API,
});

bind(deps);
