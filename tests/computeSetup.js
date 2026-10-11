// WebCrypto for the compute suites: the capsule and the notebook hashes use
// it, and Node supplies what Jest's realm lacks. Not a test file.
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
