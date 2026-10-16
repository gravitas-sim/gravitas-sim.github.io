// =============================================================================
// A 3-D system as a link: /3d/#sys1z...
// -----------------------------------------------------------------------------
// Roadmap II Prompt 105. A scenario pack that carries a `system3d` block
// (js/platform/scenario.js) opens in the 3-D lab by a link whose fragment is
// the system itself, deflated and written in base64url, the way the
// application's own share links carry a world (js/shareState.js). Nothing
// goes to a server, and no code is in it: it is the lab's own file, and the
// lab validates it exactly as it validates a file the reader chooses.
//
//   #sys1z<payload>   deflate-raw, then base64url
//   #sys1r<payload>   the JSON itself, base64url (where deflate is missing)
//
// `1` is the link's version; the payload is a gravitas.system3d/1. A fragment
// that is not this one is not read, and says why. A system too large for a
// link (over MAX_LINK_CHARS) is refused with `tooLong`, so the author is told
// to hand it over as a file instead.
//
// No imports: the lab loads this only when a link asks for it, and the Studio
// and the tests share it.
// =============================================================================

export const LINK_VERSION = 1;
/** The longest fragment a link may be: what mail clients and chat keep whole. */
export const MAX_LINK_CHARS = 8000;
/** The most a link may inflate to, so a small link cannot hold a large one. */
export const MAX_INFLATED_BYTES = 256 * 1024;
const PREFIX = `sys${LINK_VERSION}`;
const PATTERN = new RegExp(`^#?${PREFIX}([zr])([A-Za-z0-9_-]+)$`);

const toBase64Url = bytes => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromBase64Url = text => {
  const bin = atob(
    text.replace(/-/g, '+').replace(/_/g, '/') +
      '='.repeat((4 - (text.length % 4)) % 4)
  );
  return Uint8Array.from(bin, c => c.charCodeAt(0));
};

/** Everything a stream gives, stopping (with `tooLong`) past the cap. */
async function drain(readable, cap = Infinity) {
  const reader = readable.getReader();
  const parts = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > cap) {
      await reader.cancel();
      throw Object.assign(new Error('too long'), { code: 'tooLong' });
    }
    parts.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

async function through(bytes, stream, cap) {
  const writer = stream.writable.getWriter();
  // Errors surface on the read side, which reports them.
  writer.write(bytes).catch(() => {});
  writer.close().catch(() => {});
  return drain(stream.readable, cap);
}

/**
 * The link fragment of a system, without the '#'.
 * @param {object} system - A gravitas.system3d/1
 * @returns {Promise<{ok: true, fragment: string} | {ok: false, code: string}>}
 */
export async function systemFragment(system) {
  const bytes = new TextEncoder().encode(JSON.stringify(system));
  if (bytes.length > MAX_INFLATED_BYTES) return { ok: false, code: 'tooLong' };
  let kind = 'r';
  let body = bytes;
  if (typeof CompressionStream !== 'undefined') {
    body = await through(bytes, new CompressionStream('deflate-raw'));
    kind = 'z';
  }
  const fragment = `${PREFIX}${kind}${toBase64Url(body)}`;
  return fragment.length > MAX_LINK_CHARS
    ? { ok: false, code: 'tooLong' }
    : { ok: true, fragment };
}

/**
 * The system a fragment carries. It is the lab's to judge (validateSystem):
 * this says only whether the fragment is one and holds JSON.
 * @param {string} fragment - With or without the '#'
 * @returns {Promise<{ok: true, system: object} | {ok: false, code: string}>}
 */
export async function readSystemFragment(fragment) {
  const m = PATTERN.exec(String(fragment ?? ''));
  if (!m) return { ok: false, code: 'notLink' };
  if (m[2].length > MAX_LINK_CHARS) return { ok: false, code: 'tooLong' };
  try {
    let bytes = fromBase64Url(m[2]);
    if (m[1] === 'z') {
      if (typeof DecompressionStream === 'undefined')
        return { ok: false, code: 'unsupported' };
      // Stopped at the cap: a small link cannot be a large one.
      bytes = await through(
        bytes,
        new DecompressionStream('deflate-raw'),
        MAX_INFLATED_BYTES
      );
    }
    return {
      ok: true,
      system: JSON.parse(new TextDecoder().decode(bytes)),
    };
  } catch (err) {
    return {
      ok: false,
      code: err?.code === 'tooLong' ? 'tooLong' : 'unreadable',
    };
  }
}

/** Whether a fragment is one of these links (not whether it is a good one). */
export const isSystemFragment = fragment =>
  PATTERN.test(String(fragment ?? ''));
