// =============================================================================
// A merger does not throw away the frame the reader was watching from
// -----------------------------------------------------------------------------
// Binary BH inspirals and merges: that is the whole scenario. A reader who
// selects one of the two black holes as their reference frame is, at the moment
// the merger happens, watching from a body that no longer exists.
// resolveFrameOrigin() then answers "no origin", the frame offset drops to
// (0,0), and the camera jumps by however far the pair was from the world
// origin. Which is the report: the view jumps in the Binary BH sandbox.
//
// The merge event now carries the id of what the two became, and the frame
// moves onto it. Nobody in the world frame is affected, which is the other half
// of the requirement.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  WORLD,
  BARYCENTER,
  OBJECT,
  setFrame,
  frameState,
  resetFrameModule,
  transferFrame,
} from '../js/referenceFrame.js';

beforeEach(() => {
  resetFrameModule();
});

describe('an object frame tied to a progenitor', () => {
  test('moves onto the merger product', () => {
    setFrame(OBJECT, 11);
    expect(transferFrame([11, 12], 30)).toBe(true);
    expect(frameState()).toEqual({ mode: OBJECT, objectId: 30 });
  });

  test('moves whichever of the two it was watching', () => {
    setFrame(OBJECT, 12);
    expect(transferFrame([11, 12], 30)).toBe(true);
    expect(frameState().objectId).toBe(30);
  });

  test('is left alone when the merger has no product to offer', () => {
    // Better a frame on a body that is about to be reported as gone, which
    // falls back to the world frame through the existing path, than a frame
    // pointing at an id that never existed.
    setFrame(OBJECT, 11);
    expect(transferFrame([11, 12], null)).toBe(false);
    expect(frameState().objectId).toBe(11);
  });
});

describe('everyone else', () => {
  test('a reader in the world frame is untouched', () => {
    setFrame(WORLD);
    expect(transferFrame([11, 12], 30)).toBe(false);
    expect(frameState()).toEqual({ mode: WORLD, objectId: null });
  });

  test('a reader on the barycenter is untouched', () => {
    setFrame(BARYCENTER);
    expect(transferFrame([11, 12], 30)).toBe(false);
    expect(frameState()).toEqual({ mode: BARYCENTER, objectId: null });
  });

  test('a reader framed on an uninvolved body is untouched', () => {
    setFrame(OBJECT, 99);
    expect(transferFrame([11, 12], 30)).toBe(false);
    expect(frameState().objectId).toBe(99);
  });
});
