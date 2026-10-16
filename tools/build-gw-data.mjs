#!/usr/bin/env node
// =============================================================================
// The published GW150914 figure data, as a data pack
// -----------------------------------------------------------------------------
//   npm run gw:data         fetch what is missing, build, write the module and
//                           data-packs/gw150914-figure-data.json
//   npm run gw:check        verify both, no network; and rebuild from the
//                           cache when the cache is there
//   npm run gw:provenance   the same, failing when the traces are not cached
//
// The transformation is tools/data-packs/gw150914.mjs; the build, check and
// rebuild are the ones every data pack goes through
// (tools/build-data-packs.mjs runDataset(), DATA_PACKS.md).
// =============================================================================

import { runDataset } from './build-data-packs.mjs';

await runDataset('gw150914-figure-data', process.argv.slice(2));
