// Imported first by the galactic tests: the instruments fetch their packs'
// sidecar files when their module loads, so fetch has to be the repository's
// by then. (Not a test: Jest runs only *.test.js.)
import { diskFetch } from '../tools/authoring/galacticPacks.mjs';

globalThis.fetch = diskFetch;
