// =============================================================================
// The reviewed code a built-in capability package may name
// -----------------------------------------------------------------------------
// A manifest names code only as `builtin:<id>`; this is the one place an id
// becomes a module. Every entry is a literal import(), so the bundler can see it
// and give the module the chunk it would have had anyway. The list is written
// by tools/capability-registries.mjs from the `builtin:` references in
// capabilities/*.json: a package cannot add code it did not name, and a
// manifest cannot name an id the generator cannot place.
// =============================================================================

// <generated:builtins>
export const BUILTINS = {
  'widgets/power-law': () => import('../powerLawWidgets.js'),
  'data/sdss-spectra': () => import('../data/spectra/sdssSpectra.js'),
  'data/tess-hd209458-s56': () =>
    import('../data/observations/tessHd209458S56.js'),
  'data/tess-hd209458-s56-aperture': () =>
    import('../data/observations/tessHd209458S56Aperture.js'),
  'investigation/power-law-gravity': () =>
    import('../data/investigations/power-law-gravity.js'),
  'investigation/es/power-law-gravity': () =>
    import('../data/investigations/es/power-law-gravity.js'),
};

/** Where each id lives, for the tools that check it; never used to load. */
export const BUILTIN_SOURCES = {
  'widgets/power-law': 'js/powerLawWidgets.js',
  'data/sdss-spectra': 'js/data/spectra/sdssSpectra.js',
  'data/tess-hd209458-s56': 'js/data/observations/tessHd209458S56.js',
  'data/tess-hd209458-s56-aperture':
    'js/data/observations/tessHd209458S56Aperture.js',
  'investigation/power-law-gravity':
    'js/data/investigations/power-law-gravity.js',
  'investigation/es/power-law-gravity':
    'js/data/investigations/es/power-law-gravity.js',
};
// </generated:builtins>
