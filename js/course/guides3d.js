// =============================================================================
// The 3-D lab's guided investigations, as a course pack may name them
// -----------------------------------------------------------------------------
// Roadmap II Prompt 105. A `guide` item opens one of the 3-D lab's
// investigations (js/lab3d/guides/curriculum.js) at a depth. The table is kept
// here, small and with no imports, so the course pages and the SDK need not
// load the lab's guides to check a pack; tests/course3d.test.js holds it to
// the guides themselves.
//
// Depth is the platform's vocabulary (DEPTH.md): the guide's introductory path
// is its core depth, and its advanced path is its advanced depth.
// =============================================================================

/** The guide ids, with the minutes each of the guide's two paths takes. */
export const GUIDES_3D = Object.freeze({
  'l3-planes': Object.freeze({ intro: 20, advanced: 30 }),
  'l3-eclipse': Object.freeze({ intro: 25, advanced: 35 }),
  'l3-mutual': Object.freeze({ intro: 20, advanced: 30 }),
  'l3-kozai': Object.freeze({ intro: 25, advanced: 35 }),
});

/** The depths a guide item may declare, and the guide path each opens. */
export const GUIDE_DEPTHS = Object.freeze({
  core: 'intro',
  advanced: 'advanced',
});
