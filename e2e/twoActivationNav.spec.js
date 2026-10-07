// The two-activation criterion, desktop half (P58 repair R-A). See e2e/navMatrix.js. The cells
// are chosen at module scope, so a test that is not defined is never skipped.
import { test } from './fixtures.js';
import {
  CELLS,
  targets,
  edge,
  library,
  homeBack,
  orphans,
  tabWalk,
} from './navMatrix.js';

const FULL = Boolean(process.env.GRAVITAS_E2E_NAV_FULL);

for (const [width, input] of FULL ? CELLS : [[1024, 'keyboard']]) {
  test.describe(`from Home at ${width} px by ${input}`, () => {
    test.use({ viewport: { width, height: 800 }, hasTouch: input === 'touch' });

    for (const href of targets) {
      test(`${href} is within two activations`, edge(href, width, input));
    }

    test('the Library is one activation, and every route is a second', async ({
      page,
    }) => {
      test.setTimeout(240_000);
      await library(input, FULL)({ page });
    });

    test('every shelled page shows a way back to Home, and Home is one activation', async ({
      page,
    }) => {
      test.setTimeout(240_000);
      await homeBack(input)({ page });
    });
  });
}

test.describe('the navigation graph', () => {
  test(
    'no page is an orphan: the navigation, the Library or Home links it',
    orphans
  );
  test('Home is reached by a real Tab walk to the Library link', tabWalk);
});
