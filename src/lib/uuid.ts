// Hermes (production Metro bundle) does not expose `globalThis.crypto`, so
// `crypto.randomUUID()` throws — that bug shipped in TestFlight 1.0.1(2) as
// "Cannot read property 'randomUUID' of undefined". Node test env exposes
// it natively, so we prefer that path and fall through to expo-crypto's
// synchronous v4 generator on RN. The require() is lazy so vitest does not
// load expo-crypto's native binding (which throws at import time in Node).
export function randomUUID(): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Crypto = require('expo-crypto') as typeof import('expo-crypto');
  return Crypto.randomUUID();
}
