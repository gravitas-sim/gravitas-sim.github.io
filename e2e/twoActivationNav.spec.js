// The two-activation criterion, desktop half (P58 repair R-A): keyboard at
// 1024 px per pull request, the whole matrix when GRAVITAS_E2E_NAV_FULL is set
// (the weekly job and `npm run e2e:release`). See e2e/navMatrix.js.
import { CELLS, defineNav } from './navMatrix.js';

const FULL = Boolean(process.env.GRAVITAS_E2E_NAV_FULL);

defineNav(FULL ? CELLS : [[1024, 'keyboard']], { full: FULL, graph: true });
