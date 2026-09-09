// =============================================================================
// Object-type glyphs
// -----------------------------------------------------------------------------
// The eight things a reader can add, drawn as SVG rather than typed as emoji.
//
// Emoji were the wrong tool for this in three separate ways. They are drawn by
// the operating system, so the picker was Apple's glossy cartoons on a Mac, a
// flat Fluent set on Windows and, on a Linux machine without an emoji font,
// eight identical tofu boxes - a control whose entire job is to distinguish
// eight things. They have different advance widths, so the labels beside them
// started at eight different x positions and the list read as ragged. And two
// of the eight had no usable emoji at all: a white dwarf was a gemstone and a
// neutron star was a lightning bolt, which are pictures of other things.
//
// These are drawn in the same language as the canvas: the same object-class
// hues from css/tokens.css, the same shapes js/physics.js draws - a star with a
// corona, a gas giant with bands and a ring, an irregular asteroid, a comet
// with a nucleus and a tail, a black hole as a dark disc inside a bright ring.
// They are 16x16, one size, so the column is straight.
//
// They are decoration in the accessibility sense and always carry aria-hidden:
// every place that shows one also shows the type's name as text. An icon is
// never the only thing distinguishing one row from another.
// =============================================================================

/**
 * The glyphs, keyed by the object type names js/ui.js uses.
 *
 * Written as complete <svg> strings rather than assembled from parts: they are
 * constants, they are small, and a template that produced them would be harder
 * to read than the eight pictures it produced. `currentColor` is deliberately
 * absent - each glyph carries its own class hue so the set stays legible on
 * the accent-coloured armed button as well as on a panel.
 */
const GLYPHS = Object.freeze({
  // A bright core inside a soft corona, which is what StarObject.draw paints.
  Star:
    '<circle cx="8" cy="8" r="6.5" fill="var(--hue-star)" opacity="0.22"/>' +
    '<circle cx="8" cy="8" r="3.6" fill="var(--hue-star)"/>',

  // A lit limb on one side, the way a rocky planet is shaded from its star.
  Planet:
    '<circle cx="8" cy="8" r="5.4" fill="var(--hue-planet)"/>' +
    // A crescent, not a half: the second arc has to bulge the other way or the
    // path retraces the first one and encloses nothing.
    '<path d="M8 2.6A5.4 5.4 0 0 1 8 13.4A7.4 7.4 0 0 0 8 2.6z" ' +
    'fill="#000" opacity="0.3"/>',

  // Bands and a ring, with the ring passing behind the disc at the top and in
  // front of it at the bottom - the occlusion GasGiant.draw gets right.
  GasGiant:
    '<circle cx="8" cy="8" r="4.9" fill="var(--hue-gasgiant)"/>' +
    '<path d="M3.3 6.6h9.4M3.3 9.4h9.4" stroke="#000" stroke-opacity="0.25" ' +
    'stroke-width="1.1" stroke-linecap="round"/>' +
    '<ellipse cx="8" cy="8" rx="7.2" ry="2.3" fill="none" ' +
    'stroke="var(--hue-gasgiant)" stroke-width="1.1" opacity="0.85" ' +
    'transform="rotate(-18 8 8)"/>',

  // Irregular on purpose: an asteroid is the one body that is not a circle.
  Asteroid:
    '<path d="M7.4 2.9l3.6 1.1 2.1 3-0.7 3.6-3.2 2.4-3.7-0.8-2.4-2.9 ' +
    '0.4-3.7z" fill="var(--hue-asteroid)"/>' +
    '<circle cx="6.6" cy="7.2" r="1" fill="#000" opacity="0.25"/>' +
    '<circle cx="9.9" cy="9.7" r="0.7" fill="#000" opacity="0.2"/>',

  // Nucleus, coma and a tail pointing away from the light - the geometry the
  // renderer uses, not a shooting star.
  Comet:
    '<path d="M9.8 6.2L15 1.6l-3.1 6.1z" fill="var(--hue-comet)" ' +
    'opacity="0.45"/>' +
    '<path d="M8.6 8.4L14.4 4l-4.2 5.7z" fill="var(--hue-comet)" ' +
    'opacity="0.3"/>' +
    '<circle cx="6.6" cy="9.4" r="3.4" fill="var(--hue-comet)" ' +
    'opacity="0.28"/>' +
    '<circle cx="6.6" cy="9.4" r="1.7" fill="var(--hue-comet)"/>',

  // Small and very bright, with a hard limb: a dwarf is Earth-sized and hot.
  WhiteDwarf:
    '<circle cx="8" cy="8" r="5.6" fill="var(--hue-dwarf)" opacity="0.16"/>' +
    '<circle cx="8" cy="8" r="2.3" fill="var(--hue-dwarf)"/>' +
    '<circle cx="8" cy="8" r="2.3" fill="none" stroke="var(--hue-dwarf)" ' +
    'stroke-width="0.7" opacity="0.9"/>',

  // A point with two beams. Not a lightning bolt: the thing that makes a
  // neutron star recognisable is the magnetic axis, and it is what the canvas
  // draws too.
  NeutronStar:
    '<path d="M8 8L4.4 2.2M8 8l3.6 5.8" stroke="var(--hue-neutron)" ' +
    'stroke-width="1.4" stroke-linecap="round" opacity="0.55"/>' +
    '<ellipse cx="8" cy="8" rx="5.4" ry="2" fill="none" ' +
    'stroke="var(--hue-neutron)" stroke-width="0.8" opacity="0.4" ' +
    'transform="rotate(32 8 8)"/>' +
    '<circle cx="8" cy="8" r="1.9" fill="var(--hue-neutron)"/>',

  // The horizon is the black disc. The bright part is the ring around it, and
  // keeping those two separate is the same distinction the renderer makes.
  BlackHole:
    '<circle cx="8" cy="8" r="6" fill="none" stroke="var(--hue-blackhole)" ' +
    'stroke-width="1.5" opacity="0.55"/>' +
    '<ellipse cx="8" cy="8" rx="6.6" ry="2.1" fill="none" ' +
    'stroke="var(--hue-blackhole)" stroke-width="1.2" ' +
    'transform="rotate(-14 8 8)"/>' +
    '<circle cx="8" cy="8" r="3.3" fill="#05060a"/>',
});

/** The types that have a glyph, in no particular order. */
export const GLYPH_TYPES = Object.freeze(Object.keys(GLYPHS));

/**
 * Whether a type has a glyph.
 * @param {string} type - An object type name
 * @returns {boolean} True if hasGlyph
 */
export const hasGlyph = type => Object.hasOwn(GLYPHS, type);

/**
 * The SVG markup for one object type.
 *
 * Returns an empty string for an unknown type rather than throwing or
 * substituting something: a caller that has lost track of its type should show
 * the name it already has beside it, not a wrong picture.
 *
 * @param {string} type - An object type name, e.g. 'GasGiant'
 * @param {object} [options] - Options
 * @param {string} [options.className] - Class for the <svg> element
 * @returns {string} SVG markup, or '' for an unknown type
 */
export function glyphMarkup(type, { className = 'object-glyph' } = {}) {
  const body = GLYPHS[type];
  if (!body) return '';
  return (
    `<svg class="${className}" viewBox="0 0 16 16" width="16" height="16" ` +
    `aria-hidden="true" focusable="false">${body}</svg>`
  );
}

/**
 * The same thing as an element, for callers building DOM rather than strings.
 *
 * @param {string} type - An object type name
 * @param {object} [options] - Passed to glyphMarkup
 * @returns {?SVGElement} The glyph, or null for an unknown type
 */
export function glyphElement(type, options) {
  const markup = glyphMarkup(type, options);
  if (!markup) return null;
  const holder = document.createElement('div');
  holder.innerHTML = markup;
  return /** @type {?SVGElement} */ (holder.firstElementChild);
}
