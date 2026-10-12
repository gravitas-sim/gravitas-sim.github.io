// =============================================================================
// The Sky Lab's number formatting
// -----------------------------------------------------------------------------
// The code is in ./view.js, which the page loads anyway, so the page needs one
// request fewer (the Sky Lab's route budget counts them). The lazy instruments
// and the tests still import it from here.
// =============================================================================

export { fmt, round, prettyDesignation } from './view.js';
