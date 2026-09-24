// =============================================================================
// The reviewed code a built-in capability package may name
// -----------------------------------------------------------------------------
// A manifest names code only as `builtin:<id>`. This is the one place an id
// becomes a module, and every entry is a literal import() so that the bundler
// can see it and give the module the chunk it would have had anyway - these
// are the same specifiers js/widgets.js, js/data/investigations/registry.js
// and js/stellarSpectraWidgets.js already use, so the package route costs no
// extra chunk. Nothing a package says can add to this list: it is source code,
// reviewed like any other, and tools/capabilities.mjs fails the build when a
// manifest names an id that is not here.
// =============================================================================

export const BUILTINS = {
  'model/power-law-gravity': () => import('../powerLawGravity.js'),
  'widgets/power-law': () => import('../powerLawWidgets.js'),
  'data/sdss-spectra': () => import('../data/spectra/sdssSpectra.js'),
  'investigation/power-law-gravity': () =>
    import('../data/investigations/power-law-gravity.js'),
  'investigation/es/power-law-gravity': () =>
    import('../data/investigations/es/power-law-gravity.js'),
};

/** Where each id lives, for the tools that check it; never used to load. */
export const BUILTIN_SOURCES = {
  'model/power-law-gravity': 'js/powerLawGravity.js',
  'widgets/power-law': 'js/powerLawWidgets.js',
  'data/sdss-spectra': 'js/data/spectra/sdssSpectra.js',
  'investigation/power-law-gravity':
    'js/data/investigations/power-law-gravity.js',
  'investigation/es/power-law-gravity':
    'js/data/investigations/es/power-law-gravity.js',
};
