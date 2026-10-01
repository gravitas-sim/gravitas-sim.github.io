// =============================================================================
// One copyright notice
// -----------------------------------------------------------------------------
// tools/project-metadata.mjs holds the year and the holder. The application's
// footer is generated from it (tools/docs-facts.mjs checks the marker); the
// licence files state it in prose, so they are held to it here. The footer
// used to be typed, and is the copy a reader sees.
// =============================================================================

import { test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';

import { COPYRIGHT } from '../tools/project-metadata.mjs';

test.each([
  ['LICENSE', `Copyright (c) ${COPYRIGHT.year} ${COPYRIGHT.holder}`],
  ['LICENSE-CC-BY-4.0.md', `Copyright © ${COPYRIGHT.year} ${COPYRIGHT.holder}`],
  ['LICENSES.md', `Copyright © ${COPYRIGHT.year} ${COPYRIGHT.holder}`],
])('%s states the notice', (file, notice) => {
  expect(readFileSync(file, 'utf8')).toContain(notice);
});

test('the footer carries the year as a generated fact', () => {
  const html = readFileSync('index.html', 'utf8');
  expect(html).toContain(
    `<span class="attribution-year"><!--fact:copyrightYear-->${COPYRIGHT.year}<!--/fact--></span>`
  );
});
