// =============================================================================
// Radiation kernel: loading the data packs
// -----------------------------------------------------------------------------
// The only module that names the pack files, so that a page which uses the
// kernel's arithmetic does not download bandpasses it never asks for, and so
// that tests/dataPacks.test.js can hold the rule "nothing names a lazy pack but
// its loader". Each loader is a dynamic import: one request, on first use.
// =============================================================================

export const loadBandpasses = () =>
  import('../../data/radiation/bandpasses.js');
export const loadLines = () => import('../../data/radiation/lines.js');
export const loadExtinction = () =>
  import('../../data/radiation/extinction.js');
export const loadBolometric = () =>
  import('../../data/radiation/bolometric.js');

// Non-commercial (CC BY-NC 3.0 IGO, credit ESA/Gaia/DPAC): the one pack under
// those terms, kept apart so no other band is covered by them. Its PACK carries
// `license.nonCommercial: true` for an interface to show.
export const loadGaiaBandpasses = () =>
  import('../../data/radiation/gaiaBandpasses.js');
