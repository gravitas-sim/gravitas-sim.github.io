// Simple chart decimation worker
// Receives full energy history arrays and posts back trimmed updates at fixed Hz

let desiredHz = 8;
let maxPoints = 200;
let lastSent = 0;

self.onmessage = e => {
  const { type } = e.data || {};
  if (type === 'config') {
    if (typeof e.data.desiredHz === 'number') desiredHz = Math.max(1, e.data.desiredHz);
    if (typeof e.data.maxPoints === 'number') maxPoints = Math.max(50, e.data.maxPoints);
    return;
  }
  if (type === 'data') {
    const data = e.data.data;
    if (!Array.isArray(data) || data.length === 0) return;
    const now = performance.now();
    const intervalMs = 1000 / desiredHz;
    if (now - lastSent < intervalMs) return;
    lastSent = now;
    const out = data.length > maxPoints ? data.slice(data.length - maxPoints) : data;
    self.postMessage({ type: 'update', data: out });
  }
};

