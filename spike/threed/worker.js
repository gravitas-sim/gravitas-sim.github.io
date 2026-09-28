import { determinism, speed } from './bench.js';
self.onmessage = async ({ data }) =>
  self.postMessage({ hashes: await determinism(data.initial), speed: data.speed ? speed() : null });
