// An inference realm without a Worker: the real js/inference/inferenceWorker.js,
// run in this thread behind the same message interface, so a test goes through
// the scheduler and the realm's own message handling (js/inference/rvClient.js
// setRvSpawn). Messages are delivered a macrotask later, as a Worker's are.

import { setRvSpawn } from '../js/inference/rvClient.js';

let ready = null;
let current = null;

const factory = () => {
  const realm = {
    onmessage: null,
    terminated: false,
    postMessage: data =>
      setTimeout(() => {
        if (!realm.terminated) globalThis.self.onmessage({ data });
      }, 0),
    terminate() {
      realm.terminated = true;
    },
  };
  current = realm;
  return realm;
};

export const reinstallRealm = () => setRvSpawn(factory);

export function installRealm() {
  ready ??= (async () => {
    globalThis.self = {
      postMessage: data => setTimeout(() => current?.onmessage?.({ data }), 0),
    };
    await import('../js/inference/inferenceWorker.js');
  })();
  return ready.then(reinstallRealm);
}

export function uninstallRealm() {
  setRvSpawn(null);
}
