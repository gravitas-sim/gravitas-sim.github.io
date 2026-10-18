#!/usr/bin/env node
// =============================================================================
// npm run storage:profile -- --capture
// -----------------------------------------------------------------------------
// Rewrites the 2.0.0 profile fixture (tests/storageProfile/profile-2.0.0.json)
// and what 2.0.0 itself makes of it (report-2.0.0.json): captured with the
// writers of the commit the v2.0.0 tag names (tests/compat/harness.js), then
// opened on that same tree. Refuses unless asked by name: the fixture is a
// statement about 2.0.0, and the test that holds the tip to it means nothing if
// it is rewritten to suit the tip.
// =============================================================================

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { archiveOld } from '../tests/compat/harness.js';

export const PROFILE = 'tests/storageProfile/profile-2.0.0.json';
export const REPORT = 'tests/storageProfile/report-2.0.0.json';

if (!process.argv.includes('--capture')) {
  console.error(
    'Refusing to recapture the 2.0.0 profile. Pass --capture to say you mean it:\n' +
      'the fixture describes what 2.0.0 stored, and the tip is judged against it.'
  );
  process.exit(2);
}
const { tree, cleanup } = archiveOld();
try {
  const node = (script, ...args) =>
    execFileSync(process.execPath, [script, ...args], {
      encoding: 'utf8',
      maxBuffer: 1 << 26,
    });
  node('tests/storageProfile/capture.mjs', tree, PROFILE);
  const report = node('tests/storageProfile/inspect.mjs', tree, PROFILE)
    .trim()
    .split('\n')
    .at(-1);
  writeFileSync(
    path.resolve(REPORT),
    JSON.stringify(JSON.parse(report), null, 1) + '\n'
  );
  console.log(`wrote ${PROFILE} and ${REPORT}`);
} finally {
  cleanup();
}
