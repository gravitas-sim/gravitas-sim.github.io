// =============================================================================
// The Worker pool contract (Prompt 153, WORKER_POOL.md)
// -----------------------------------------------------------------------------
// Background work that can be cancelled, reports progress and stays inside a
// memory and concurrency budget, for jobs that are new and heavy: the inference
// core's profile likelihoods first, and later image processing and precomputed
// grids. It is the experiment scheduler's machinery (ordering by index, a
// timeout per job and for the run, a result byte cap, cancellation that
// terminates every realm) with the parts a second client needs:
//
//   typed jobs       { index, kind?, payload?, memoryBytes?, timeoutMs?,
//                      deterministic?, transfer?, stream? }; an outcome has a
//                      status from JOB and the realm's own result when it is ok
//   generations      every run has one; a `channel` makes the newest run on it
//                      supersede the last (its unfinished jobs end "stale"),
//                      and anything a realm says after its job ended is dropped
//   memory caps      a job declares its bytes; a job over `jobBytes` is refused
//                      outright, and the run waits while the ledger would go
//                      past its cap - the ledger is the page's, shared by every
//                      pool and by Workers that are not the pool's (adoptRealm)
//   transfer         a job's `transfer` buffers move into its realm (the caller
//                      no longer owns them); results are sized by their bytes
//   determinism      a job that declares `deterministic` starts only when
//                      everything submitted before it has started and nothing
//                      after it overtakes it; others may be backfilled when the
//                      head does not fit. Results are always by index
//   streams          `stream: {id, seed, labels}` reaches the realm as a fork
//                      of 149's stream per job (the job's index is the last
//                      label), so its draws never depend on scheduling
//
// Realms are disposable: one per job, terminated when it answers. Workers are
// made by an injected `spawn`, so a test can stage every way a realm fails.
// =============================================================================

/** How a job ended. The first words are the experiment scheduler's. */
export const JOB = Object.freeze({
  OK: 'ok',
  CANCELED: 'canceled',
  STALE: 'stale',
  TIMEOUT: 'timeout',
  CORRUPT: 'corrupt',
  WORKER_FAILED: 'workerFailed',
  RESOURCE_LIMIT: 'resourceLimit',
});

/** A result's size: its JSON, and the bytes of any typed array or buffer. */
export function sizeOf(v) {
  let extra = 0;
  const n = JSON.stringify(v, (k, x) => {
    if (x instanceof ArrayBuffer || ArrayBuffer.isView(x)) {
      extra += x.byteLength;
      return 0;
    }
    return x;
  }).length;
  return n + extra;
}

/**
 * What the page holds in Workers, whoever started them. `fits` is what a pool
 * asks before it starts a realm; `hold` is what a realm costs while it lives.
 */
export function createLedger(caps = {}) {
  let limit = { memoryBytes: Infinity, realms: Infinity, ...caps };
  const held = new Set();
  const watchers = new Set();
  const sum = k => [...held].reduce((n, h) => n + h[k], 0);
  const tell = () => watchers.forEach(f => f());
  return {
    configure(next) {
      limit = { ...limit, ...next };
      tell();
    },
    fits: (bytes, realms = 1) =>
      sum('bytes') + bytes <= limit.memoryBytes &&
      sum('realms') + realms <= limit.realms,
    /** Whether the caps alone, with nothing held, could ever admit it. */
    possible: (bytes, realms = 1) =>
      bytes <= limit.memoryBytes && realms <= limit.realms,
    hold(owner, bytes, realms = 1) {
      const h = { owner, bytes, realms };
      held.add(h);
      return () => held.delete(h) && tell();
    },
    watch(fn) {
      watchers.add(fn);
      return () => watchers.delete(fn);
    },
    snapshot: () => ({
      limit: { ...limit },
      bytes: sum('bytes'),
      realms: sum('realms'),
      holders: [...held].map(h => ({ ...h })),
    }),
  };
}

/** The page's ledger: the aggregate cap holds across every pool and Worker. */
export const ledger = createLedger();

/**
 * Put a Worker the page already holds (physics, chart, 3-D, mission, ...) on
 * the ledger without rewriting it: its declared bytes count against the
 * aggregate cap until it is terminated. Returns the release, for a Worker that
 * ends itself.
 */
export function adoptRealm(worker, owner, bytes, book = ledger) {
  const release = book.hold(owner, bytes);
  const end = worker.terminate.bind(worker);
  worker.terminate = () => {
    release();
    end();
  };
  return release;
}

/**
 * @param {object} opts
 * @param {() => {postMessage: Function, terminate: Function}} opts.spawn
 * @param {number} [opts.concurrency] - Realms at once from this pool
 * @param {number} [opts.memoryBytes] - Bytes this pool's realms may hold
 * @param {number} [opts.jobBytes] - The most one job may declare
 * @param {number} [opts.defaultJobBytes] - What a job that declares none holds
 * @param {object} [opts.book] - The ledger; the page's by default
 */
export function createPool(opts) {
  const {
    spawn,
    concurrency = 1,
    memoryBytes = Infinity,
    jobBytes = memoryBytes,
    defaultJobBytes = 0,
    book = ledger,
    now = () => Date.now(),
    setTimer = (fn, ms) => setTimeout(fn, ms),
    clearTimer = id => clearTimeout(id),
  } = opts;
  const channels = new Map();
  const live = new Set();
  let serial = 0;
  let suppressed = 0;
  let unwatch = null;
  let poolBytes = 0;
  const wake = () => live.forEach(pump => pump());
  // No timer for a limit that is not a number: setTimeout(Infinity) fires at once.
  const timer = (fn, ms) => (Number.isFinite(ms) ? setTimer(fn, ms) : null);

  /**
   * One run of jobs. Nothing starts until run().
   * @param {Array<object>} jobs - index is the job's position
   * @param {object} [o]
   * @param {Function} [o.accept] - (result, job) => whether it is the job's
   * @param {Function} [o.message] - (job, {jobId, generation, stream}) => what
   *   the realm is sent
   * @param {Function} [o.outcome] - (job, status, extra, result) => the record
   *   of a job that did not give a result (`result` is an oversized one)
   * @param {string} [o.channel] - Runs on one channel supersede each other
   * @param {string} [o.noun] - What a job is called in what a student may read
   * @param {string} [o.owner] - What the run is called there
   * @param {boolean} [o.deterministic] - The default for jobs that do not say
   * @param {Array<object>} [o.completed] - Outcomes already known, by index
   */
  function batch(jobs, o = {}) {
    const {
      accept = () => true,
      message = (j, m) => ({
        type: 'run',
        ...m,
        kind: j.kind,
        index: j.index,
        payload: j.payload,
      }),
      outcome = (j, status, extra) => ({ index: j.index, status, ...extra }),
      channel,
      noun = 'job',
      owner = 'pool',
      deterministic = false,
      totalTimeoutMs = Infinity,
      jobTimeoutMs = Infinity,
      maxResultBytes = Infinity,
      onJob = () => {},
      onProgress = () => {},
    } = o;
    const results = new Map();
    const resumed = new Set();
    for (const r of o.completed || []) {
      results.set(r.index, r);
      resumed.add(r.index);
    }
    const queue = jobs.filter(j => !results.has(j.index));
    const active = new Map();
    let bytes = [...results.values()].reduce((n, r) => n + sizeOf(r), 0);
    let state = 'idle';
    let stopReason = null;
    let finish = null;
    let totalTimer = null;
    let startedAt = null;
    let generation = 0;
    const need = j => j.memoryBytes ?? defaultJobBytes;

    const snapshot = () => ({
      state,
      stopReason,
      generation,
      total: jobs.length,
      done: results.size,
      resumed: resumed.size,
      running: [...active.values()].map(a => ({
        index: a.job.index,
        fraction: a.fraction,
      })),
      queued: queue.length,
      bytes,
      heldBytes: [...active.values()].reduce((n, a) => n + a.bytes, 0),
      elapsedMs: startedAt === null ? 0 : now() - startedAt,
      fraction:
        (results.size +
          [...active.values()].reduce((s, a) => s + a.fraction, 0)) /
        (jobs.length || 1),
    });

    function record(job, out) {
      results.set(job.index, out);
      onJob(out);
    }

    function settle(job, result, status = JOB.OK, extra) {
      const slot = active.get(job.index);
      // An answer after the end of its job: a stale result, dropped.
      if (!slot || slot.settled) return void suppressed++;
      slot.settled = true;
      clearTimer(slot.timer);
      try {
        slot.worker.terminate();
      } catch {
        /* already gone */
      }
      poolBytes -= slot.bytes;
      active.delete(job.index);
      // A realm's whole life, start-up and imports included, beside the job's
      // own timing: the difference is what one Worker per job costs.
      let out = {
        ...(status === JOB.OK ? result : outcome(job, status, extra, result)),
        realmMs: Math.round(now() - slot.startedAt),
      };
      const size = sizeOf(out);
      if (bytes + size > maxResultBytes) {
        out = outcome(
          job,
          JOB.RESOURCE_LIMIT,
          {
            error: `its result (${size} bytes) would take the run past ${maxResultBytes} bytes`,
          },
          result
        );
      }
      bytes += sizeOf(out);
      results.set(job.index, out);
      onJob(out);
      onProgress(snapshot());
      // After the bookkeeping, so a pump the release wakes sees this job done.
      slot.release();
      pump();
    }

    function launch(job, size) {
      const release = book.hold(`pool:${generation}.${job.index}`, size);
      let worker;
      try {
        worker = spawn();
      } catch (err) {
        record(
          job,
          outcome(job, JOB.WORKER_FAILED, {
            error: String(err?.message || err),
          })
        );
        release();
        return;
      }
      poolBytes += size;
      const slot = {
        job,
        worker,
        release,
        bytes: size,
        fraction: 0,
        settled: false,
        timer: null,
        startedAt: now(),
      };
      active.set(job.index, slot);
      const limit = job.timeoutMs ?? jobTimeoutMs;
      slot.timer = timer(() => {
        settle(job, null, JOB.TIMEOUT, {
          error: `still running after ${limit} ms`,
          wallMs: Math.round(now() - slot.startedAt),
        });
      }, limit);
      const jobId = `${generation}.${job.index}`;
      worker.onmessage = e => {
        const msg = e?.data;
        if (slot.settled) return void suppressed++;
        if (msg?.type === 'progress' && Number.isFinite(msg.fraction)) {
          slot.fraction = Math.max(0, Math.min(1, msg.fraction));
          onProgress(snapshot());
        } else if (msg?.type === 'result') {
          const r = msg.result;
          // A realm that echoes its job's id and generation must echo them.
          const mine =
            (r?.jobId === undefined || r.jobId === jobId) &&
            (r?.generation === undefined || r.generation === generation);
          if (mine && accept(r, job)) settle(job, r);
          else
            settle(job, null, JOB.CORRUPT, {
              error: `the realm answered with something that is not this ${noun}’s result`,
            });
        } else if (msg?.type === 'error') {
          settle(job, null, JOB.WORKER_FAILED, {
            error: String(msg.message || 'the realm failed'),
          });
        } else {
          settle(job, null, JOB.CORRUPT, {
            error: `the realm sent a message this ${owner} does not know`,
          });
        }
      };
      worker.onerror = e => {
        e?.preventDefault?.();
        settle(job, null, JOB.WORKER_FAILED, {
          error: String(e?.message || 'the realm did not start'),
        });
      };
      worker.onmessageerror = () =>
        settle(job, null, JOB.CORRUPT, {
          error: 'the realm’s answer could not be read',
        });
      const s = job.stream;
      const msg = message(job, {
        jobId,
        generation,
        ...(s && {
          stream: { ...s, labels: [...(s.labels || []), job.index] },
        }),
      });
      if (job.transfer?.length) worker.postMessage(msg, job.transfer);
      else worker.postMessage(msg);
    }

    function pump() {
      if (state !== 'running') return;
      // Past a job that does not fit only a job that did not ask for its place
      // may start; a deterministic job neither passes nor is passed.
      for (let i = 0; i < queue.length && active.size < concurrency;) {
        const job = queue[i];
        const fixed = job.deterministic ?? deterministic;
        if (i > 0 && fixed) break;
        const size = need(job);
        if (book.fits(size) && poolBytes + size <= memoryBytes) {
          queue.splice(i, 1);
          launch(job, size);
        } else if (fixed) break;
        else i++;
      }
      if (!active.size && !queue.length)
        end(stopReason ? 'partial' : 'complete');
    }

    function stopAll(status, reason, queued = status) {
      // The queue first: settling a running job pumps, and a pump with
      // anything still queued would start it in the middle of stopping.
      while (queue.length) {
        const j = queue.shift();
        record(j, outcome(j, queued, { error: reason }));
      }
      for (const slot of [...active.values()])
        settle(slot.job, null, status, { error: reason });
    }

    function end(final) {
      if (state === 'finished') return;
      state = 'finished';
      clearTimer(totalTimer);
      live.delete(pump);
      if (!live.size && unwatch) {
        unwatch();
        unwatch = null;
      }
      if (channels.get(channel)?.generation === generation)
        channels.delete(channel);
      const out = {
        status: final,
        stopReason,
        trials: jobs.map(j => results.get(j.index)),
        resumed: [...resumed].sort((a, b) => a - b),
        elapsedMs: now() - startedAt,
        bytes,
      };
      onProgress(snapshot());
      finish?.(out);
    }

    function stop(status, reason) {
      if (state !== 'running') return;
      stopReason = reason;
      state = 'stopping';
      stopAll(status, reason);
      state = 'running';
      end('canceled');
    }

    const self = {
      /** Start, and resolve when every job has an outcome. */
      run() {
        if (state !== 'idle') throw new Error('a batch runs once');
        state = 'running';
        startedAt = now();
        generation = ++serial;
        if (channel !== undefined) {
          const before = channels.get(channel);
          channels.set(channel, {
            generation,
            stop: reason => stop(JOB.STALE, reason),
          });
          before?.stop(`superseded by generation ${generation}`);
        }
        live.add(pump);
        if (!unwatch) unwatch = book.watch(wake);
        // A job that no wait could admit is refused now, not left to wait.
        for (let i = queue.length - 1; i >= 0; i--) {
          const size = need(queue[i]);
          if (
            !(size >= 0) ||
            size > jobBytes ||
            size > memoryBytes ||
            !book.possible(size)
          ) {
            const [j] = queue.splice(i, 1);
            record(
              j,
              outcome(j, JOB.RESOURCE_LIMIT, {
                error: `it asks for ${size} bytes, more than a worker job may hold`,
              })
            );
          }
        }
        return new Promise(resolve => {
          finish = resolve;
          totalTimer = timer(() => {
            stopReason = `the run reached its limit of ${totalTimeoutMs} ms`;
            stopAll(JOB.TIMEOUT, stopReason, JOB.CANCELED);
            pump();
          }, totalTimeoutMs);
          onProgress(snapshot());
          pump();
        });
      },
      /** Stop everything now. What finished is kept; the rest is canceled. */
      cancel: (reason = 'canceled by the reader') => stop(JOB.CANCELED, reason),
      state: snapshot,
    };
    return self;
  }

  return {
    batch,
    /** The newest generation on a channel, or 0. */
    generation: channel => channels.get(channel)?.generation || 0,
    /** End the channel's run now, its unfinished jobs "stale". */
    supersede: (channel, reason = 'superseded') =>
      channels.get(channel)?.stop(reason),
    /** Answers dropped because their job had ended. */
    stats: () => ({ suppressed, runs: live.size }),
    book,
  };
}
