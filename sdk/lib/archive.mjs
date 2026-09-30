// =============================================================================
// The .gxp archive: an extension as one deterministic file
// -----------------------------------------------------------------------------
// A POSIX ustar archive, gzip-compressed, with everything that would make two
// packs of the same files differ set to a constant: entries sorted by path,
// every mtime 0, uid and gid 0, owner names empty, mode 0644, the gzip header's
// own mtime 0 and its OS byte "unknown". The same files give the same bytes on
// every machine, so an archive's SHA-256 identifies its contents and a
// reviewer can compare a submitted archive with a rebuild from the pull
// request.
//
// The first entry is always gravitas-extension.json, the manifest; the last
// is CHECKSUMS, one "sha256  path" line per other entry, so `inspect` can
// verify an archive without trusting anything in it. Nothing else is allowed:
// no directories, links, devices or absolute or `..` paths, which is also what
// `read` refuses.
//
// Written by hand because the format is small and a dependency to write tar
// would be larger than this file.
// =============================================================================

import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync, constants } from 'node:zlib';
import { ArchiveError, LIMITS, readTar } from '../../js/catalog/archive.js';

export const MANIFEST_ENTRY = 'gravitas-extension.json';
export const CHECKSUMS_ENTRY = 'CHECKSUMS';
const BLOCK = 512;
const SAFE_PATH = /^(?!\/)(?!.*(^|\/)\.\.(\/|$))[A-Za-z0-9._\-/]+$/;

const sha256 = b => createHash('sha256').update(b).digest('hex');

function octal(value, width) {
  return value.toString(8).padStart(width - 1, '0') + '\0';
}

function header(name, size) {
  const h = Buffer.alloc(BLOCK, 0);
  if (Buffer.byteLength(name) > 100)
    throw new Error(`${name}: paths are limited to 100 bytes`);
  h.write(name, 0, 'utf8');
  h.write(octal(0o644, 8), 100, 'ascii'); // mode
  h.write(octal(0, 8), 108, 'ascii'); // uid
  h.write(octal(0, 8), 116, 'ascii'); // gid
  h.write(octal(size, 12), 124, 'ascii'); // size
  h.write(octal(0, 12), 136, 'ascii'); // mtime
  h.write('        ', 148, 'ascii'); // checksum placeholder
  h.write('0', 156, 'ascii'); // regular file
  h.write('ustar\0', 257, 'ascii');
  h.write('00', 263, 'ascii');
  let sum = 0;
  for (const byte of h) sum += byte;
  h.write(octal(sum, 7) + ' ', 148, 'ascii');
  return h;
}

/**
 * Pack files into a .gxp.
 * @param {Map<string, Uint8Array>|Record<string, Uint8Array>} files - path -> bytes
 * @returns {Buffer} The archive
 */
export function pack(files) {
  const entries = new Map(files instanceof Map ? files : Object.entries(files));
  if (!entries.has(MANIFEST_ENTRY))
    throw new Error(`an extension archive needs ${MANIFEST_ENTRY}`);
  if (entries.has(CHECKSUMS_ENTRY))
    throw new Error(`${CHECKSUMS_ENTRY} is written by pack, not supplied`);
  for (const name of entries.keys()) {
    if (!SAFE_PATH.test(name))
      throw new Error(`${name}: not a relative path inside the extension`);
  }
  const ordered = [
    MANIFEST_ENTRY,
    ...[...entries.keys()].filter(n => n !== MANIFEST_ENTRY).sort(),
  ];
  const sums =
    ordered.map(n => `${sha256(entries.get(n))}  ${n}`).join('\n') + '\n';
  const parts = [];
  for (const name of [...ordered, CHECKSUMS_ENTRY]) {
    const body = Buffer.from(
      name === CHECKSUMS_ENTRY ? sums : entries.get(name)
    );
    parts.push(
      header(name, body.length),
      body,
      Buffer.alloc((BLOCK - (body.length % BLOCK)) % BLOCK)
    );
  }
  parts.push(Buffer.alloc(2 * BLOCK)); // end of archive
  const gz = gzipSync(Buffer.concat(parts), {
    level: constants.Z_BEST_COMPRESSION,
  });
  // gzip's header carries an mtime (bytes 4-7) and an OS byte (9); zlib writes
  // 0 for the first already and the platform's code for the second.
  gz[9] = 255;
  return gz;
}

/**
 * Read a .gxp, refusing anything pack would not have written.
 * @param {Uint8Array} bytes - The archive
 * @returns {{files: Map<string, Buffer>, checksums: Map<string, string>, problems: string[]}}
 */
export function read(bytes, limits = LIMITS) {
  // The catalog's own limits and walk (js/catalog/archive.js), so a file the
  // browser would refuse is refused here too: no gzip bomb inflates past
  // unpackedBytes, and every header is checked before its entry is read.
  if (bytes.length > limits.archiveBytes)
    throw new ArchiveError(
      'tooLarge',
      `${bytes.length} bytes, more than an archive may be`,
      { bytes: bytes.length, max: limits.archiveBytes }
    );
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b)
    throw new ArchiveError('notGzip', 'not a gzip stream');
  let tar;
  try {
    tar = gunzipSync(bytes, { maxOutputLength: limits.unpackedBytes });
  } catch (err) {
    if (err?.code === 'ERR_BUFFER_TOO_LARGE')
      throw new ArchiveError(
        'unpackedTooLarge',
        `decompresses to more than ${limits.unpackedBytes} bytes`,
        { max: limits.unpackedBytes }
      );
    throw new ArchiveError(
      'notGzip',
      `not a valid gzip stream: ${err.message}`
    );
  }
  const entries = readTar(
    new Uint8Array(tar.buffer, tar.byteOffset, tar.length),
    limits
  );
  const files = new Map([...entries].map(([n, b]) => [n, Buffer.from(b)]));
  const problems = [];
  const names = [...files.keys()];
  if (names[0] !== MANIFEST_ENTRY)
    problems.push(`the first entry is ${names[0]}, not ${MANIFEST_ENTRY}`);
  if (names.at(-1) !== CHECKSUMS_ENTRY)
    problems.push(`the last entry is ${names.at(-1)}, not ${CHECKSUMS_ENTRY}`);
  const checksums = new Map();
  for (const line of (files.get(CHECKSUMS_ENTRY)?.toString('utf8') || '')
    .split('\n')
    .filter(Boolean)) {
    const [sum, name] = line.split(/ {2}/);
    checksums.set(name, sum);
  }
  for (const [name, body] of files) {
    if (name === CHECKSUMS_ENTRY) continue;
    if (!checksums.has(name))
      problems.push(`${name} is not in ${CHECKSUMS_ENTRY}`);
    else if (checksums.get(name) !== sha256(body))
      problems.push(`${name} does not match its checksum`);
  }
  for (const name of checksums.keys())
    if (!files.has(name))
      problems.push(
        `${CHECKSUMS_ENTRY} lists ${name}, which is not in the archive`
      );
  return { files, checksums, problems };
}
