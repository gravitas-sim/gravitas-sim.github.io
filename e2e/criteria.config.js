// =============================================================================
// Playwright configuration for the criteria that are run on demand
// -----------------------------------------------------------------------------
// e2e/*.criteria.js files state what the pilot states are measured against
// (DESIGN_SYSTEM.md, "Visual direction"). Most of them fail on the 3.0 pilots,
// which is the point of them, so they are not part of the browser suite and CI
// does not run them (playwright.config.js matches `.spec.js` files only). This
// configuration is the main one with its match changed, run on Chromium with
// one worker:
//
//   npm run e2e:criteria
//   GRAVITAS_E2E_PORT=4619 npm run e2e:criteria -- -g "I-8"
//
// A criterion moves into the suite, as a `.spec.js` with a README row, in the
// change that makes it pass.
// =============================================================================

import base from '../playwright.config.js';

export default {
  ...base,
  testDir: '.',
  testMatch: /\.criteria\.js$/,
  testIgnore: [],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  maxFailures: 0,
  // The server command in the main config is relative to the repository root.
  webServer: { ...base.webServer, cwd: '..' },
  reporter: [['list']],
  projects: base.projects.filter(p => p.name === 'chromium'),
};
