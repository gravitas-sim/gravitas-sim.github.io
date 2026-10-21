import { describe, test, expect } from '@jest/globals';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

import { createLedger, createPool } from '../js/workers/pool.js';
import { LIMITS } from '../js/dataKinds/limits.js';
import { readFits } from '../js/dataKinds/fits.js';
import { planFitsRead, readFitsOnPool } from '../js/dataKinds/fitsJob.js';
import { REFUSE, hdu, image, tanCards } from '../tools/data-kinds-cases.mjs';

// =============================================================================
// Prompt 157: reading a FITS file on the pool
// -----------------------------------------------------------------------------
// Real worker_threads Workers behind the pool's `spawn`, running
// js/dataKinds/fitsJob.js's protocol (tests/fixtures/dataKindsNodeWorker.mjs):
// the buffers really move, termination is really termination, and the memory
// ledger really holds what the job declared.
// =============================================================================

const WORKER = fileURLToPath(
  new URL('./fixtures/dataKindsNodeWorker.mjs', import.meta.url)
);

/** A pool whose realms are real Workers, counted. */
function harness(opts = {}) {
  const book = createLedger(opts.caps ?? {});
  const spawned = [];
  let live = 0;
  let peak = 0;
  const spawn = () => {
    const w = new Worker(WORKER);
    const api = {
      onmessage: null,
      onerror: null,
      onmessageerror: null,
      postMessage: (m, t) => w.postMessage(m, t),
      terminate: () => {
        live--;
        return w.terminate();
      },
    };
    live++;
    peak = Math.max(peak, live);
    w.on('message', data => api.onmessage?.({ data }));
    w.on('error', e => api.onerror?.(e));
    w.on('messageerror', e => api.onmessageerror?.(e));
    spawned.push(w);
    return api;
  };
  const pool = createPool({
    spawn,
    book,
    concurrency: opts.concurrency ?? 2,
    jobBytes: opts.jobBytes ?? Infinity,
    memoryBytes: opts.memoryBytes ?? Infinity,
  });
  return { pool, book, spawned, peak: () => peak, live: () => live };
}

/** A file's bytes as a buffer nobody else shares. */
const owned = buf => new Uint8Array(buf).buffer;

describe('a FITS file read on the pool', () => {
  test('the plane equals the in-process read, and the buffers moved', async () => {
    const file = image({
      bitpix: 16,
      width: 256,
      height: 200,
      cards: [...tanCards(), ['BSCALE', 0.5], ['BZERO', 7]],
      values: Array.from(
        { length: 256 * 200 },
        (_, i) => ((i * 7919) % 30000) - 15000
      ),
    });
    const want = readFits(file);
    const source = owned(file);
    const h = harness();
    const r = await readFitsOnPool(h.pool, source);
    expect(r.ok).toBe(true);
    expect(source.byteLength).toBe(0); // the file's bytes belong to the realm now
    expect(r.image.values.buffer.byteLength).toBe(8 * 256 * 200); // the plane moved back
    expect(r.image.values.length).toBe(want.values.length);
    for (let i = 0; i < want.values.length; i++)
      if (!Object.is(r.image.values[i], want.values[i]))
        throw new Error(`pixel ${i}`);
    expect(r.image.wcs).toEqual(want.wcs);
    expect(r.image.decodedBytes).toBe(want.decodedBytes);
    expect(r.geometry).toMatchObject({
      width: 256,
      height: 200,
      fileBytes: file.length,
    });
    expect(h.live()).toBe(0);
    expect(h.book.snapshot().bytes).toBe(0);
  });

  test('a view of part of a buffer is copied: the bytes around it do not move', async () => {
    const file = image({ bitpix: 8, width: 4, height: 4 });
    const big = new Uint8Array(file.length + 100);
    big.set(file, 50);
    const view = big.subarray(50, 50 + file.length);
    const plan = planFitsRead(view);
    expect(plan.ok).toBe(true);
    expect(plan.job.transfer[0]).not.toBe(big.buffer);
    expect(plan.job.transfer[0].byteLength).toBe(file.length);
    const h = harness();
    expect((await readFitsOnPool(h.pool, view)).ok).toBe(true);
    expect(big.buffer.byteLength).toBe(file.length + 100);
  });

  test('the job declares the file and the Float64 plane', () => {
    const file = image({ bitpix: -32, width: 100, height: 50 });
    const plan = planFitsRead(file);
    expect(plan.job.memoryBytes).toBe(file.length + 8 * 100 * 50);
    expect(plan.job.kind).toBe('fits-read');
    expect(plan.geometry.decodedBytes).toBe(40000);
  });

  test('a refusal is an answer: the same code and words as the in-process reader', async () => {
    const names = [
      'an empty buffer',
      'a cube, 2 x 2 x 2',
      'a tile-compressed image',
      'BITPIX 64',
      'NAXIS1 = 8193',
      'SIN projection',
      'an infinite pixel, BITPIX -32',
      'BSCALE = 0',
      'SIP distortion by suffix',
    ];
    const h = harness();
    for (const name of names) {
      const [, build, code] = REFUSE.find(r => r[0] === name);
      const file = build();
      let want;
      try {
        readFits(file);
      } catch (e) {
        want = e;
      }
      const r = await readFitsOnPool(h.pool, owned(file));
      expect({ name, ok: r.ok, code: r.code }).toEqual({
        name,
        ok: false,
        code,
      });
      expect(r.message).toBe(want.message);
    }
  });

  test('a job over the pool’s share is refused before a realm starts', async () => {
    const file = image({ bitpix: 16, width: 1024, height: 1024 });
    const h = harness({ jobBytes: 4 * 1024 * 1024 });
    const r = await readFitsOnPool(h.pool, owned(file));
    expect(r).toMatchObject({ ok: false, code: 'resourceLimit' });
    expect(h.spawned.length).toBe(0);
  });

  test('the aggregate cap holds: two reads that cannot share the ledger run one after the other', async () => {
    const file = () => image({ bitpix: 16, width: 512, height: 512 });
    const one = planFitsRead(file()).job.memoryBytes;
    const h = harness({ caps: { memoryBytes: one + 1000 }, concurrency: 2 });
    const [a, b] = await Promise.all([
      readFitsOnPool(h.pool, owned(file())),
      readFitsOnPool(h.pool, owned(file())),
    ]);
    // Separate runs on one page ledger: each pool run asks the ledger, so the page's cap serializes them.
    expect([a.ok, b.ok]).toEqual([true, true]);
    expect(h.peak()).toBe(1);
    expect(h.book.snapshot().bytes).toBe(0);
  });

  test('a read the ledger could never admit is refused', async () => {
    const file = image({ bitpix: 16, width: 512, height: 512 });
    const h = harness({ caps: { memoryBytes: 1024 * 1024 } });
    expect(await readFitsOnPool(h.pool, owned(file))).toMatchObject({
      ok: false,
      code: 'resourceLimit',
    });
  });

  test('cancelling terminates the realm and frees its memory', async () => {
    // 2,048 x 2,048 pixels of 8 bytes: the largest file; decoding it takes long enough to catch.
    const file = image({
      bitpix: -64,
      width: 2048,
      height: 2048,
      values: new Array(2048 * 2048).fill(1.5),
    });
    expect(file.length).toBeLessThanOrEqual(LIMITS.maxFileBytes);
    const source = owned(file);
    const controller = new AbortController();
    const h = harness();
    const pending = readFitsOnPool(h.pool, source, {
      signal: controller.signal,
    });
    expect(h.book.snapshot().bytes).toBeGreaterThan(0);
    controller.abort();
    const r = await pending;
    expect(r).toMatchObject({ ok: false, code: 'canceled' });
    expect(h.live()).toBe(0);
    expect(h.book.snapshot().bytes).toBe(0);
  });

  test('cancelled before it begins: nothing is transferred', async () => {
    const source = owned(image({ bitpix: 8, width: 2, height: 2 }));
    const controller = new AbortController();
    controller.abort();
    const h = harness();
    expect(
      await readFitsOnPool(h.pool, source, { signal: controller.signal })
    ).toMatchObject({ ok: false, code: 'canceled' });
    expect(source.byteLength).toBeGreaterThan(0);
    expect(h.spawned.length).toBe(0);
  });

  test('a file the page can refuse by its header never reaches a realm', async () => {
    const h = harness();
    const r = await readFitsOnPool(
      h.pool,
      owned(hdu({ bitpix: 16, axes: [8193, 1], data: Buffer.alloc(0) }))
    );
    expect(r).toMatchObject({ ok: false, code: 'too-large' });
    expect(h.spawned.length).toBe(0);
  });
});
