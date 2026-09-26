// =============================================================================
// SPIKE (Prompt 18): a fetch to an archive, bounded, and every failure named
// -----------------------------------------------------------------------------
// Disposable prototype code on spike/vo-archive-gateway. What it establishes
// is written up in VO_ARCHIVE_GATE.md.
//
// A request from a reader's browser to someone else's server can fail in more
// ways than a request to this site, and the reader deserves to be told which:
//
//   blocked      the browser refused it: the service sends no CORS header, or
//                the network is down. A page CANNOT tell these apart - both
//                reject with the same TypeError, by design - so the message
//                has to name both.
//   timeout      no answer within the limit
//   rateLimited  HTTP 429, with the Retry-After the service gave
//   unavailable  HTTP 5xx
//   refused      any other 4xx
//   tooLarge     the body passed the byte limit, counted as it streamed
//   wrongType    not the content type asked for
//   offList      the request, or the place a redirect ended, is not on the
//                list of services this page may talk to
//
// The list is checked twice, before the request and after it: fetch follows a
// redirect without asking, and a service that moved, or was made to send a
// reader somewhere else, must not become a source by accident.
// =============================================================================

export class ArchiveFetchError extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = 'ArchiveFetchError';
    this.code = code;
    this.detail = detail;
  }
}

/**
 * @param {string|URL} url
 * @param {{maxBytes?: number, timeoutMs?: number, accept?: RegExp,
 *   fetchImpl?: Function, allow?: string[]}} [opts] - `allow` is a list of
 *   origins; null allows any, which only a test should pass
 * @returns {Promise<{bytes: Uint8Array, url: string, redirected: boolean,
 *   status: number, contentType: string}>}
 */
export async function fetchLimited(url, opts = {}) {
  const {
    maxBytes = 2_000_000,
    timeoutMs = 20_000,
    accept = null,
    fetchImpl = fetch,
    allow = null,
  } = opts;
  const onList = u => !allow || allow.includes(new URL(u).origin);
  if (!onList(url))
    throw new ArchiveFetchError('offList', `${new URL(url).origin} is not on the list`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetchImpl(url, {
      signal: controller.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      redirect: 'follow',
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError')
      throw new ArchiveFetchError('timeout', `no answer in ${timeoutMs} ms`);
    throw new ArchiveFetchError(
      'blocked',
      'the browser could not reach it: the service does not allow this site, or the network is down',
      { cause: err.message }
    );
  }
  if (res.url && !onList(res.url)) {
    clearTimeout(timer);
    controller.abort();
    throw new ArchiveFetchError('offList', `redirected to ${new URL(res.url).origin}, which is not on the list`, {
      finalUrl: res.url,
    });
  }
  if (res.status === 429) {
    clearTimeout(timer);
    throw new ArchiveFetchError('rateLimited', 'the service asked us to slow down', {
      retryAfter: res.headers.get('retry-after'),
    });
  }
  if (res.status >= 500) {
    clearTimeout(timer);
    throw new ArchiveFetchError('unavailable', `HTTP ${res.status}`);
  }
  if (!res.ok) {
    clearTimeout(timer);
    throw new ArchiveFetchError('refused', `HTTP ${res.status}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (accept && !accept.test(contentType)) {
    clearTimeout(timer);
    throw new ArchiveFetchError('wrongType', `answered ${contentType || 'no type'}`);
  }
  const declared = Number(res.headers.get('content-length'));
  if (declared > maxBytes) {
    clearTimeout(timer);
    controller.abort();
    throw new ArchiveFetchError('tooLarge', `${declared} bytes declared`, {
      max: maxBytes,
    });
  }
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) {
        controller.abort();
        throw new ArchiveFetchError('tooLarge', `more than ${maxBytes} bytes`, {
          max: maxBytes,
        });
      }
      chunks.push(value);
    }
  } catch (err) {
    if (err instanceof ArchiveFetchError) throw err;
    if (err.name === 'AbortError')
      throw new ArchiveFetchError('timeout', `no answer in ${timeoutMs} ms`);
    throw new ArchiveFetchError('blocked', err.message);
  } finally {
    clearTimeout(timer);
  }
  const bytes = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.length;
  }
  return {
    bytes,
    url: res.url,
    redirected: res.redirected,
    status: res.status,
    contentType,
  };
}

export async function sha256Hex(bytes) {
  const d = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, '0')).join('');
}
