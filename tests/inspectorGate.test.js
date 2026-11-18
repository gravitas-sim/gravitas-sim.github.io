/**
 * @jest-environment jsdom
 */
// =============================================================================
// The inspector's door answers before the card has arrived
// -----------------------------------------------------------------------------
// js/inspectorGate.js stands in for the card (js/inspectorWindow.js) until the
// first selection fetches it. What it must do meanwhile is held here: hide is
// harmless, the type mapping and the lesson's suppression flag are the same
// ones the card reads, and the card is fetched once, on the first show.
// =============================================================================

/* global document, window */
import { describe, test, expect } from '@jest/globals';

const gate = await import('../js/inspectorGate.js');
const { state } = await import('../js/appState.js');

describe('before the card has been fetched', () => {
  test('it is not loaded, and hiding it does nothing and does not throw', () => {
    expect(gate.inspectorLoaded()).toBe(false);
    expect(() => gate.hideObjectInspector()).not.toThrow();
    expect(gate.inspectorLoaded()).toBe(false);
  });

  test('the type of a body is read from its class, then its obj_type', () => {
    expect(gate.inspectorTypeFor({ kind: 'StarObject' })).toBe('Star');
    expect(gate.inspectorTypeFor({ kind: 'BlackHole' })).toBe('BlackHole');
    expect(gate.inspectorTypeFor({ obj_type: 'Comet' })).toBe('Comet');
    expect(gate.inspectorTypeFor(null)).toBe('Planet');
  });

  test('the suppression flag is held here and read by the card', () => {
    expect(gate.isInspectorSuppressed()).toBe(false);
    gate.setInspectorSuppressed(true);
    expect(gate.isInspectorSuppressed()).toBe(true);
    gate.setInspectorSuppressed(false);
    expect(gate.isInspectorSuppressed()).toBe(false);
  });
});

describe('a selection that is waiting on the card', () => {
  const ready = () => {
    // The card's header buttons are there for the fetch these shows start,
    // and stay, so the wiring lands on them whenever it happens.
    if (!document.getElementById('inspectorClose'))
      document.body.innerHTML =
        '<div id="objectInspector"></div>' +
        '<button id="inspectorClose"></button>' +
        '<button id="inspectorDelete"></button>';
    window.splashScreenEnded = true;
    window.isSplashActive = false;
  };

  test('is pending, and selected at once, until a hide cancels it', () => {
    ready();
    const object = { id: 7 };
    gate.showObjectInspector(object, 'Planet');
    expect(gate.inspectorLoaded()).toBe(false);
    expect(gate.inspectorPending()).toBe(true);
    expect(state.selectedObject).toEqual({ object, type: 'Planet' });

    gate.hideObjectInspector();
    expect(gate.inspectorPending()).toBe(false);
    expect(state.selectedObject).toBeNull();
  });

  test('two quick shows leave one pending wish, and one hide clears it', () => {
    ready();
    gate.showObjectInspector({ id: 1 }, 'Planet');
    gate.showObjectInspector({ id: 2 }, 'Star');
    expect(gate.inspectorPending()).toBe(true);
    expect(state.selectedObject.object.id).toBe(2);
    gate.hideObjectInspector();
    expect(gate.inspectorPending()).toBe(false);
    expect(state.selectedObject).toBeNull();
  });
});

describe('the first show', () => {
  test('fetches the card once, and wires its header buttons', async () => {
    // The splash has not ended, so the card declines to open: this is about
    // the fetch, not the card.
    window.splashScreenEnded = false;
    const object = { id: 1 };
    gate.showObjectInspector(object, 'Planet');
    const mod = await gate.ensureInspector();
    expect(gate.inspectorLoaded()).toBe(true);
    expect(typeof mod.showObjectInspector).toBe('function');
    expect(await gate.ensureInspector()).toBe(mod);
    expect(document.getElementById('inspectorClose').onclick).toBe(
      mod.hideObjectInspector
    );
  });
});
