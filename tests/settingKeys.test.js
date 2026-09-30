// =============================================================================
// The Composer's list of setting names is the application's
// -----------------------------------------------------------------------------
// js/data/settingKeys.js carries the keys of DEFAULT_SETTINGS so the Composer
// need not load js/appState.js for them. A setting added to one and not the
// other would be refused in a lesson the application could run, or accepted
// in one it could not.
// =============================================================================

import { test, expect } from '@jest/globals';

import { DEFAULT_SETTINGS } from '../js/appState.js';
import { SETTING_KEYS } from '../js/data/settingKeys.js';

test('every setting, in its order, and no other', () => {
  const keys = Object.keys(DEFAULT_SETTINGS);
  const missing = keys.filter(k => !SETTING_KEYS.includes(k));
  const extra = SETTING_KEYS.filter(k => !keys.includes(k));
  // Say which to add or remove, not only that they differ.
  expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  expect([...SETTING_KEYS]).toEqual(keys);
});
