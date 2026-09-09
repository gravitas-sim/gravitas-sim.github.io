// =============================================================================
// The object-type glyphs
// -----------------------------------------------------------------------------
// These replaced eight emoji, and the reasons they replaced them are the
// properties worth testing: one per type, one size, no platform font involved,
// no text of their own, and always hidden from assistive technology because the
// name is always beside them.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  GLYPH_TYPES,
  hasGlyph,
  glyphMarkup,
  glyphElement,
} from '../js/objectGlyphs.js';

/** The eight the picker offers. Kept here rather than imported, deliberately:
 *  if js/ui.js grows a ninth type this test should fail, not follow along. */
const PICKER_TYPES = [
  'Star',
  'Planet',
  'GasGiant',
  'Asteroid',
  'Comet',
  'WhiteDwarf',
  'NeutronStar',
  'BlackHole',
];

describe('there is one for every type the picker offers', () => {
  test('all eight, and nothing else', () => {
    expect([...GLYPH_TYPES].sort()).toEqual([...PICKER_TYPES].sort());
  });

  test.each(PICKER_TYPES)('%s has one', type => {
    expect(hasGlyph(type)).toBe(true);
    expect(glyphMarkup(type)).toContain('<svg');
  });

  test('an unknown type gets nothing rather than the wrong picture', () => {
    expect(hasGlyph('Tardis')).toBe(false);
    expect(glyphMarkup('Tardis')).toBe('');
    expect(glyphElement('Tardis')).toBeNull();
  });
});

describe('they are drawings, not characters', () => {
  test.each(PICKER_TYPES)('%s contains no text and no emoji', type => {
    const markup = glyphMarkup(type);
    // No <text>, and nothing outside the Basic Multilingual Plane - which is
    // where every emoji this replaced lived.
    expect(markup).not.toContain('<text');
    expect(markup).not.toMatch(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });

  test.each(PICKER_TYPES)('%s is drawn at one size', type => {
    const markup = glyphMarkup(type);
    expect(markup).toContain('viewBox="0 0 16 16"');
    expect(markup).toContain('width="16"');
    expect(markup).toContain('height="16"');
  });

  test.each(PICKER_TYPES)('%s is hidden from assistive technology', type => {
    // Every place one appears also shows the type's name as text, so the glyph
    // is decoration. An icon must never be the only thing distinguishing two
    // rows, and it must never be announced twice.
    expect(glyphMarkup(type)).toContain('aria-hidden="true"');
    expect(glyphMarkup(type)).toContain('focusable="false"');
  });
});

describe('they use the theme, not their own colours', () => {
  test.each(PICKER_TYPES)('%s draws from a class hue token', type => {
    // Black holes carry one literal: the horizon, which is black in every
    // theme because that is the whole idea.
    const markup = glyphMarkup(type);
    expect(markup).toMatch(/var\(--hue-[a-z]+\)/);
  });

  test('each type has a hue of its own', () => {
    const hues = PICKER_TYPES.map(t => {
      const m = glyphMarkup(t).match(/var\(--hue-([a-z]+)\)/);
      return m ? m[1] : null;
    });
    expect(new Set(hues).size).toBe(PICKER_TYPES.length);
  });
});

describe('the shapes are distinguishable from one another', () => {
  test('no two types produce the same drawing', () => {
    const bodies = PICKER_TYPES.map(t =>
      glyphMarkup(t).replace(/^<svg[^>]*>/, '')
    );
    expect(new Set(bodies).size).toBe(PICKER_TYPES.length);
  });

  test('a class can be asked for, for a caller that needs its own', () => {
    expect(glyphMarkup('Star', { className: 'preview-glyph' })).toContain(
      'class="preview-glyph"'
    );
  });
});
