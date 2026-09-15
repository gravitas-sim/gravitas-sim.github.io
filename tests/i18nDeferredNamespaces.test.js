// =============================================================================
// The list of late namespaces has to be the real one
// -----------------------------------------------------------------------------
// js/i18n/deferredNamespaces.js decides which missing ids are worth reporting
// at start-up and which are merely early. A list that has drifted fails in the
// quietest possible way: a namespace added to the deferred catalog and not to
// the list brings the false warnings back, and one removed from the catalog
// and left in the list holds a genuinely missing id until something else
// happens to settle it.
//
// So it is regenerated here from the catalogs themselves and compared.
// =============================================================================

import {
  DEFERRED_NAMESPACES,
  mayBeDeferred,
} from '../js/i18n/deferredNamespaces.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import { ES_DEFERRED } from '../js/i18n/es.deferred.js';

const namespaceOf = id => id.split('.')[0];

describe('the deferred namespace list', () => {
  const actual = [
    ...new Set(
      [...Object.keys(EN_DEFERRED), ...Object.keys(ES_DEFERRED)].map(
        namespaceOf
      )
    ),
  ].sort();

  test('is exactly what the deferred catalogs use', () => {
    expect([...DEFERRED_NAMESPACES].sort()).toEqual(actual);
  });

  test('is sorted and free of duplicates, so a diff of it is readable', () => {
    expect([...DEFERRED_NAMESPACES]).toEqual([...DEFERRED_NAMESPACES].sort());
    expect(new Set(DEFERRED_NAMESPACES).size).toBe(DEFERRED_NAMESPACES.length);
  });

  test('recognizes a real deferred id and refuses an invented one', () => {
    const real = Object.keys(EN_DEFERRED)[0];
    expect(mayBeDeferred(real)).toBe(true);
    expect(mayBeDeferred('definitelyNotANamespace.nope')).toBe(false);
    // A bare id with no namespace is not deferred-capable either.
    expect(mayBeDeferred('nope')).toBe(false);
  });

  test('every deferred id has a namespace, so the check can never be vacuous', () => {
    const bare = Object.keys(EN_DEFERRED).filter(id => !id.includes('.'));
    expect(bare).toEqual([]);
  });
});
