// =============================================================================
// A browser-shaped hole, just big enough for the physics to fall through
// -----------------------------------------------------------------------------
// js/physics.js reaches for `document.getElementById('simulationCanvas')` at
// module scope, which is fine in a browser and fine under jsdom and fatal in
// plain node. The validation runner has to work in plain node, because the whole
// point of `npm run validate:physics` is that a reviewer can run it without a
// test framework, a browser or a build step.
//
// This is deliberately the smallest shim that lets the physics modules load: no
// rendering, no layout, no events that do anything. Nothing in the validation
// suite touches the DOM, so a stub that silently absorbs calls is honest here in
// a way it would not be in a UI test. If a check ever needs a real element, that
// check is testing the wrong thing.
//
// Under jsdom (jest) `document` already exists and this is a no-op, so the same
// checks run unmodified in both places.
// =============================================================================

/** A canvas context whose every method exists and does nothing. */
function stubContext() {
  const gradient = { addColorStop() {} };
  return new Proxy(
    {},
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop !== 'string') return undefined;
        if (/^create(Linear|Radial|Conic)Gradient$/.test(prop)) {
          return () => gradient;
        }
        if (prop === 'measureText') return () => ({ width: 0 });
        return () => undefined;
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    }
  );
}

/** A canvas element with the handful of properties the modules read. */
function stubCanvas() {
  return {
    width: 800,
    height: 600,
    style: {},
    getContext: () => stubContext(),
    addEventListener() {},
    removeEventListener() {},
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
    }),
  };
}

/**
 * Install the shim, unless a DOM is already present.
 *
 * @returns {boolean} True if a shim was installed, false if a real (or jsdom)
 *   document was already there
 */
export function installDomShim() {
  if (typeof globalThis.document !== 'undefined') return false;

  const canvas = stubCanvas();
  globalThis.document = {
    getElementById: () => canvas,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => stubCanvas(),
    addEventListener() {},
    removeEventListener() {},
    documentElement: { style: {}, classList: { contains: () => false } },
    body: { appendChild() {}, classList: { contains: () => false } },
  };

  globalThis.window = {
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
    devicePixelRatio: 1,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    getComputedStyle: () => ({ getPropertyValue: () => '#ffffff' }),
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    },
  };
  globalThis.getComputedStyle = globalThis.window.getComputedStyle;
  globalThis.CustomEvent = globalThis.window.CustomEvent;
  if (typeof globalThis.performance === 'undefined') {
    globalThis.performance = { now: () => 0 };
  }
  return true;
}
