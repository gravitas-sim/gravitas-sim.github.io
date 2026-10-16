// =============================================================================
// The start-up modules the instrument families reach, imported as one
// -----------------------------------------------------------------------------
// Imported for what it does to the bundle, not for anything it exports.
//
// Every instrument family is fetched on demand (js/widgets.js), so each one is
// an entry point of its own to the bundler, and esbuild puts a module in the
// chunk shared by exactly the entry points that reach it. These thirteen are
// start-up modules that live in start-up chunks beside one another. When the
// families were part of the lesson engine, whatever reached one reached them
// all; once each family was its own entry, the stellar families reached the
// stellar models but not the dark-matter ones, the habitability family the
// TRAPPIST-1 data but not the resonant systems beside it, and three start-up
// chunks became ten - seven more requests before the front door draws, for
// every visitor, in exchange for nothing.
//
// So a family that reaches any of them imports this, and the registry imports
// the same thirteen itself: whatever reaches one reaches all of them, as it did
// before, and the chunks stay as start-up had them. They are already loaded by
// the time any family is, so this costs such a family one small request - the
// registry does not import this module, because then every lesson would pay it.
//
// tests/onDemandFamilies.test.js builds the application with the families
// lazy and with them eager and holds start-up to the same number of files,
// names the family that has to import this when it does not, and holds the
// registry's list to this one.
// =============================================================================

import './bodyVisuals.js';
import './darkMatter.js';
import './mond.js';
import './data/exoplanetSystems.js';
import './data/trappist1.js';
import './habitability.js';
import './instruments.js';
import './lesson/evolutionScene.js';
import './quality.js';
import './resonance/systems.js';
import './stellar/geometry.js';
import './stellar/mainSequence.js';
import './stellar/state.js';
