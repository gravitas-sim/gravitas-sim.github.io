// =============================================================================
// Listeners a mounted module can take back (Prompt 107, step 3)
// -----------------------------------------------------------------------------
// A module that mounts - a panel built into a host, a view drawn for a
// language - registers every listener through one of these, and calls off() when
// it unmounts or is rebuilt. Without it a listener put on something that
// outlives the panel (the host, window, document) stays attached to a panel that
// is gone, and every mount adds another.
//
//   const listen = listeners();
//   listen(button, 'click', onClick);          // as button.addEventListener
//   listen(window, 'resize', onResize, { passive: true });
//   listen.off();                              // every one of them, removed
//
// Built on an AbortController: one signal rides with each registration, so the
// listener behaves as it did (same type, function and options) and off() is one
// abort. The census in e2e/lessonPerformance.spec.js knows an aborted signal
// removes its listeners. A registration made after off() attaches nothing.
// A scope that is rebuilt makes a fresh one: an aborted scope holds on to what
// it was given until it is collected.
// =============================================================================

/** @returns {Function & {off: () => void, size: number}} */
export function listeners() {
  const control = new AbortController();
  const listen = (target, type, fn, options) => {
    listen.size++;
    const given = typeof options === 'boolean' ? { capture: options } : options;
    target.addEventListener(type, fn, { ...given, signal: control.signal });
  };
  listen.size = 0;
  listen.off = () => {
    control.abort();
    listen.size = 0;
  };
  return listen;
}
