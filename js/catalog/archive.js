// =============================================================================
// Reading a .gxp in the browser, refusing everything the SDK would not write
// -----------------------------------------------------------------------------
// The catalog page installs an extension by fetching its archive from this
// origin and reading it here: a gzip-compressed POSIX ustar archive, its first
// entry gravitas-extension.json and its last CHECKSUMS, every entry a regular
// file (sdk/lib/archive.mjs writes it; sdk/README.md has the format).
//
// An archive is data from the network, so nothing in it is trusted until it
// has passed, in this order:
//
//   size          the archive is under LIMITS.archiveBytes
//   checksum      its SHA-256 is the one the catalog names, before a byte of
//                 it is decompressed
//   inflation     it decompresses to under LIMITS.unpackedBytes, counted as
//                 it streams, so a gzip bomb stops at the limit
//   headers       each header's own checksum and the ustar magic hold; the
//                 name has no prefix field; the entry is a regular file
//   paths         relative, no `..`, no absolute path, only the characters
//                 the SDK allows, no entry twice, at most LIMITS.entries
//   bounds        every entry's data lies inside the archive
//   order         the manifest first, CHECKSUMS last
//   contents      every entry is listed in CHECKSUMS with its SHA-256, and
//                 every listed entry is there
//
// Each refusal is an ArchiveError with a stable `code`, so the page can say
// what went wrong in the reader's language. Pure but for the Web platform's
// DecompressionStream and SubtleCrypto, which Node has as well.
// =============================================================================

export const MANIFEST_ENTRY = 'gravitas-extension.json';
export const CHECKSUMS_ENTRY = 'CHECKSUMS';
const BLOCK = 512;
// The SDK's own rule (sdk/lib/archive.mjs SAFE_PATH).
const SAFE_PATH = /^(?!\/)(?!.*(^|\/)\.\.(\/|$))[A-Za-z0-9._\-/]+$/;

/** What an archive may be, in bytes and entries. */
export const LIMITS = Object.freeze({
  archiveBytes: 4 * 1024 * 1024,
  unpackedBytes: 16 * 1024 * 1024,
  entries: 64,
});

/** An archive refused, with why. */
export class ArchiveError extends Error {
  /**
   * @param {string} code - tooLarge, checksum, notGzip, unpackedTooLarge,
   *   badHeader, entryType, unsafePath, duplicate, tooManyEntries, truncated,
   *   order, unlisted, entryChecksum or missing
   * @param {string} message - In English, for logs and tests
   * @param {object} [detail]
   */
  constructor(code, message, detail = {}) {
    super(message);
    this.name = 'ArchiveError';
    this.code = code;
    this.detail = detail;
  }
}

/** Lower-case hex SHA-256 of some bytes. */
export async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b =>
    b.toString(16).padStart(2, '0')
  ).join('');
}

/** gunzip, refusing to produce more than `max` bytes. */
async function gunzip(bytes, max) {
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b)
    throw new ArchiveError('notGzip', 'not a gzip stream');
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > max) {
        await reader.cancel();
        throw new ArchiveError(
          'unpackedTooLarge',
          `decompresses to more than ${max} bytes`,
          { max }
        );
      }
      chunks.push(value);
    }
  } catch (err) {
    if (err instanceof ArchiveError) throw err;
    throw new ArchiveError(
      'notGzip',
      `not a valid gzip stream: ${err.message}`
    );
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

const ascii = (bytes, from, to) => {
  let s = '';
  for (let i = from; i < to && bytes[i] !== 0; i++)
    s += String.fromCharCode(bytes[i]);
  return s;
};
const octal = (bytes, from, to) => {
  const text = ascii(bytes, from, to).trim();
  return /^[0-7]+$/.test(text) ? parseInt(text, 8) : NaN;
};

/** A ustar header, checked; null at the end-of-archive block. */
function parseHeader(tar, at) {
  const h = tar.subarray(at, at + BLOCK);
  if (h.length < BLOCK)
    throw new ArchiveError('truncated', 'the archive ends inside a header');
  if (h.every(b => b === 0)) return null;
  let sum = 0;
  for (let i = 0; i < BLOCK; i++) sum += i >= 148 && i < 156 ? 32 : h[i];
  const stated = octal(h, 148, 156);
  if (stated !== sum || ascii(h, 257, 263) !== 'ustar')
    throw new ArchiveError('badHeader', `a header at byte ${at} is not ustar`);
  const nameBytes = h.subarray(0, 100);
  const end = nameBytes.indexOf(0);
  const name = new TextDecoder('utf-8', { fatal: true }).decode(
    nameBytes.subarray(0, end < 0 ? 100 : end)
  );
  if (h[345] !== 0)
    throw new ArchiveError(
      'unsafePath',
      `${name}: a name continued in the prefix field`
    );
  const type = String.fromCharCode(h[156] || 48);
  if (type !== '0')
    throw new ArchiveError(
      'entryType',
      `${name}: entry type ${type}; an extension archive holds regular files only`,
      { name, type }
    );
  if (!SAFE_PATH.test(name))
    throw new ArchiveError(
      'unsafePath',
      `${name}: not a relative path inside the extension`,
      { name }
    );
  const size = octal(h, 124, 136);
  if (!Number.isFinite(size))
    throw new ArchiveError('badHeader', `${name}: an unreadable size`);
  return { name, size };
}

/**
 * Read an archive the catalog names.
 * @param {Uint8Array} bytes - The archive as fetched
 * @param {{sha256?: string, limits?: object}} [opts] - The catalog's checksum
 * @returns {Promise<Map<string, Uint8Array>>} Every entry but CHECKSUMS
 * @throws {ArchiveError}
 */
export async function readArchive(bytes, { sha256, limits = LIMITS } = {}) {
  if (bytes.length > limits.archiveBytes)
    throw new ArchiveError(
      'tooLarge',
      `${bytes.length} bytes, more than an archive may be`,
      { bytes: bytes.length, max: limits.archiveBytes }
    );
  if (sha256 !== undefined) {
    const got = await sha256Hex(bytes);
    if (got !== sha256)
      throw new ArchiveError(
        'checksum',
        `the archive is not the one the catalog names (${got})`,
        { expected: sha256, got }
      );
  }
  const tar = await gunzip(bytes, limits.unpackedBytes);
  const files = new Map();
  let at = 0;
  for (;;) {
    const h = parseHeader(tar, at);
    if (!h) break;
    if (files.has(h.name))
      throw new ArchiveError('duplicate', `${h.name} appears twice`, {
        name: h.name,
      });
    if (files.size >= limits.entries)
      throw new ArchiveError(
        'tooManyEntries',
        `more than ${limits.entries} entries`
      );
    at += BLOCK;
    if (at + h.size > tar.length)
      throw new ArchiveError('truncated', `${h.name} runs past the archive`, {
        name: h.name,
      });
    files.set(h.name, tar.slice(at, at + h.size));
    at += Math.ceil(h.size / BLOCK) * BLOCK;
  }
  const names = [...files.keys()];
  if (names[0] !== MANIFEST_ENTRY || names.at(-1) !== CHECKSUMS_ENTRY)
    throw new ArchiveError(
      'order',
      `the archive runs ${names[0]} ... ${names.at(-1)}, not ${MANIFEST_ENTRY} ... ${CHECKSUMS_ENTRY}`
    );
  const listed = new Map();
  const text = new TextDecoder().decode(files.get(CHECKSUMS_ENTRY));
  for (const line of text.split('\n').filter(Boolean)) {
    const [sum, name] = line.split(/ {2}/);
    listed.set(name, sum);
  }
  files.delete(CHECKSUMS_ENTRY);
  for (const [name, body] of files) {
    if (!listed.has(name))
      throw new ArchiveError('unlisted', `${name} is not in CHECKSUMS`, {
        name,
      });
    if (listed.get(name) !== (await sha256Hex(body)))
      throw new ArchiveError(
        'entryChecksum',
        `${name} does not match its checksum`,
        { name }
      );
  }
  for (const name of listed.keys())
    if (!files.has(name))
      throw new ArchiveError(
        'missing',
        `CHECKSUMS lists ${name}, which is not in the archive`,
        { name }
      );
  return files;
}
