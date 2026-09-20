// Throwaway spike: can js/physics.js be evaluated inside a Worker realm?
self.onmessage = async e => {
  const target = e.data?.target || '/js/physics.js';
  try {
    const m = await import(target);
    self.postMessage({ ok: true, target, exports: Object.keys(m).length });
  } catch (err) {
    self.postMessage({
      ok: false,
      target,
      name: err?.name,
      message: String(err?.message || err),
      stack: String(err?.stack || '').split('\n').slice(0, 6),
    });
  }
};
