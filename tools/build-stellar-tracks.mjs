#!/usr/bin/env node
// =============================================================================
// The MIST v1.2 tracks, as a data pack
// -----------------------------------------------------------------------------
//   npm run stellar:data         fetch the grid if it is missing (100 MB),
//                                reduce, write the module and
//                                data-packs/mist-v12-tracks.json
//   npm run stellar:check        verify both, no network; and rebuild from the
//                                cache when the cache is there
//   npm run stellar:provenance   the same, failing when the grid is not cached
//
// The transformation is tools/data-packs/mist-tracks.mjs; the build, check and
// rebuild are the ones every data pack goes through
// (tools/build-data-packs.mjs runDataset(), DATA_PACKS.md).
// =============================================================================

import { runDataset } from './build-data-packs.mjs';

await runDataset('mist-v12-tracks', process.argv.slice(2));
