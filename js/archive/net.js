// =============================================================================
// One request to an archive: bounded, listed, and every failure named
// -----------------------------------------------------------------------------
// The archive import (VO_ARCHIVE_GATE.md) is the one place Gravitas asks
// someone else's server for data while a reader watches. A request to another
// origin can fail in more ways than a request to this site, and the reader is
// told which:
//
//   blocked      the browser refused it: the service sends no CORS header, or
//                the network is down. A page CANNOT tell these apart - both
//                reject with the same TypeError, by design - so the message
//                names both.
//   timeout      no answer within the limit
//   rateLimited  HTTP 429, with the Retry-After the service gave - if it
//                exposes it: a page on another origin sees only the CORS-
//                safelisted headers, and Retry-After is not one, so without
//                Access-Control-Expose-Headers it reads as null
//   unavailable  HTTP 5xx
//   refused      any other 4xx
//   tooLarge     the body passed the byte limit, counted as it streamed:
//                VizieR's TAP service sends no Content-Length, so a limit
//                that read only the header would pass an answer of any size
//   wrongType    not the content type asked for
//   offList      the request, or the place a redirect ended, is not on the
//                list of services this page may talk to
//   canceled    the reader pressed Cancel
//
// The list is checked before the request and again where it ended: fetch
// follows a redirect without asking, and a service that moved, or was made to
// send a reader somewhere else, must not become a source by accident. The
// page's Content-Security-Policy (observatory/index.html) holds the same list
// a second time, in the browser, where this code cannot be argued out of it.
//
// No cookies and no referrer go with any request. A Gravitas URL can carry an
// assignment code, and none of it is CDS's business.
// =============================================================================

export class ArchiveFetchError extends Error {
  /**
   * @param {string} code - One of the codes above
   * @param {string} message - For a developer; the page translates the code
   * @param {Object} [detail] - Values the page's message may show
   */
  constructor(code, message, detail = {}) {
    super(message);
    this.name = 'ArchiveFetchError';
    this.code = code;
    this.detail = detail;
  }
}

const originOf = url => new URL(url).origin;

/**
 * @param {string} url - Absolute
 * @param {{maxBytes?: number, timeoutMs?: number, accept?: RegExp|null,
 *   allow?: string[]|null, fetchImpl?: Function, signal?: AbortSignal}} [opts]
 *   `allow` is a list of origins; null allows any, which only a test passes.
 * @returns {Promise<{bytes: Uint8Array, url: string, redirected: boolean,
 *   status: number, contentType: string}>}
 */
export async function fetchLimited(url, opts = {}) {
  const {
    maxBytes = 512_000,
    timeoutMs = 20_000,
    accept = null,
    allow = null,
    fetchImpl = globalThis.fetch,
    signal = null,
  } = opts;
  const onList = u => !allow || allow.includes(originOf(u));
  if (!onList(url)) {
    throw new ArchiveFetchError(
      'offList',
      `${originOf(url)} is not on the list`,
      {
        origin: originOf(url),
      }
    );
  }
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  // The reader's own Cancel aborts the same request.
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  const done = () => {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  };
  const aborted = () =>
    timedOut
      ? new ArchiveFetchError('timeout', `no answer in ${timeoutMs} ms`, {
          seconds: Math.round(timeoutMs / 1000),
        })
      : new ArchiveFetchError('canceled', 'canceled');

  let res;
  try {
    res = await fetchImpl(url, {
      signal: controller.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      redirect: 'follow',
    });
  } catch (err) {
    done();
    if (err?.name === 'AbortError') throw aborted();
    throw new ArchiveFetchError(
      'blocked',
      'the browser could not reach it: the service does not allow this site, or the network is down',
      { cause: String(err?.message ?? err) }
    );
  }
  const fail = (code, message, detail) => {
    done();
    controller.abort();
    return new ArchiveFetchError(code, message, detail);
  };
  if (res.url && !onList(res.url)) {
    throw fail(
      'offList',
      `redirected to ${originOf(res.url)}, which is not on the list`,
      {
        origin: originOf(res.url),
      }
    );
  }
  if (res.status === 429) {
    throw fail('rateLimited', 'the service asked for fewer requests', {
      retryAfter: res.headers.get('retry-after'),
    });
  }
  if (res.status >= 500) {
    throw fail('unavailable', `HTTP ${res.status}`, { status: res.status });
  }
  if (!res.ok) {
    throw fail('refused', `HTTP ${res.status}`, { status: res.status });
  }
  const contentType = res.headers.get('content-type') || '';
  if (accept && !accept.test(contentType)) {
    throw fail('wrongType', `answered ${contentType || 'no type'}`, {
      type: contentType || null,
    });
  }
  const declared = Number(res.headers.get('content-length'));
  if (declared > maxBytes) {
    throw fail('tooLarge', `${declared} bytes declared`, { max: maxBytes });
  }
  const chunks = [];
  let total = 0;
  try {
    const reader = res.body.getReader();
    for (;;) {
      const { done: end, value } = await reader.read();
      if (end) break;
      total += value.length;
      if (total > maxBytes) {
        reader.cancel().catch(() => {});
        throw new ArchiveFetchError('tooLarge', `more than ${maxBytes} bytes`, {
          max: maxBytes,
        });
      }
      chunks.push(value);
    }
  } catch (err) {
    if (err instanceof ArchiveFetchError) {
      done();
      controller.abort();
      throw err;
    }
    done();
    if (err?.name === 'AbortError') throw aborted();
    throw new ArchiveFetchError('blocked', String(err?.message ?? err));
  }
  done();
  const bytes = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.length;
  }
  return {
    bytes,
    url: res.url || url,
    redirected: Boolean(res.redirected),
    status: res.status,
    contentType,
  };
}

/** The SHA-256 of some bytes, as lowercase hex. */
export async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b =>
    b.toString(16).padStart(2, '0')
  ).join('');
}
