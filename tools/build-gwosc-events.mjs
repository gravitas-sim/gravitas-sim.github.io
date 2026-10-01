#!/usr/bin/env node
// =============================================================================
// The five GWOSC events, as a data pack
// -----------------------------------------------------------------------------
//   npm run gwosc:data         fetch what is missing, build, write the module
//                              and data-packs/gwosc-five-events.json
//   npm run gwosc:check        verify both, no network; and rebuild from the
//                              cache when the cache is there
//   npm run gwosc:provenance   the same, failing when the strain is not cached
//
// GRAVITAS_GWOSC_CACHE=<dir> reads another cache, as the tests do. The
// transformation is tools/data-packs/gwosc-events.mjs; the build, check and
// rebuild are the ones every data pack goes through
// (tools/build-data-packs.mjs runDataset(), DATA_PACKS.md).
// =============================================================================

import { runDataset } from './build-data-packs.mjs';

await runDataset('gwosc-five-events', process.argv.slice(2));
