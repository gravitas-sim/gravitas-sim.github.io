#!/usr/bin/env node
// =============================================================================
// The four SDSS DR18 spectra, as a data pack
// -----------------------------------------------------------------------------
//   npm run spectra:data         fetch what is missing, build, write the module
//                                and data-packs/sdss-dr18-stellar-spectra.json
//   npm run spectra:check        verify both, no network; and rebuild from the
//                                cache when the cache is there
//   npm run spectra:provenance   the same, failing when the CSVs are not cached
//
// The transformation is tools/data-packs/sdss-spectra.mjs; the build, check
// and rebuild are the ones every data pack goes through
// (tools/build-data-packs.mjs runDataset(), DATA_PACKS.md).
// =============================================================================

import { runDataset } from './build-data-packs.mjs';

await runDataset('sdss-dr18-stellar-spectra', process.argv.slice(2));
