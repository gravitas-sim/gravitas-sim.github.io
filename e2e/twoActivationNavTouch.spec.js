// The two-activation criterion, phone half (P58 repair R-A): touch at 375 px
// per pull request in the phone project, the whole matrix when
// GRAVITAS_E2E_NAV_FULL is set. See e2e/navMatrix.js.
import { CELLS, defineNav } from './navMatrix.js';

const FULL = Boolean(process.env.GRAVITAS_E2E_NAV_FULL);

defineNav(FULL ? CELLS : [[375, 'touch']], { full: FULL, graph: false });
