// The server side of RFC 6455, as little of it as a classroom relay needs:
// the upgrade handshake, masked client text frames up to a size limit, ping,
// pong and close. Anything else (binary, fragmented or oversized frames, an
// unmasked client frame) closes the connection with the code the RFC names.
// Node built-ins only; the spike may not add a package.

import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/**
 * Accept an HTTP upgrade as a WebSocket, or refuse it.
 * @returns {object|null} A connection with send(), close() and an onmessage hook
 */
export function accept(req, socket, { maxPayload = 16384 } = {}) {
  const key = req.headers['sec-websocket-key'];
  if (
    req.headers.upgrade?.toLowerCase() !== 'websocket' ||
    req.headers['sec-websocket-version'] !== '13' ||
    typeof key !== 'string' ||
    Buffer.from(key, 'base64').length !== 16
  ) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    return null;
  }
  const acceptKey = createHash('sha1')
    .update(key + GUID)
    .digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${acceptKey}\r\n\r\n`
  );
  socket.setNoDelay(true);

  const conn = {
    ip: req.socket.remoteAddress,
    open: true,
    onmessage: () => {},
    onclose: () => {},
    send(text) {
      if (!conn.open) return;
      const body = Buffer.from(text, 'utf8');
      const n = body.length;
      const head =
        n < 126
          ? Buffer.from([0x81, n])
          : n < 65536
            ? Buffer.from([0x81, 126, n >> 8, n & 255])
            : (() => {
                const h = Buffer.alloc(10);
                h[0] = 0x81;
                h[1] = 127;
                h.writeBigUInt64BE(BigInt(n), 2);
                return h;
              })();
      socket.write(Buffer.concat([head, body]));
    },
    close(code = 1000) {
      if (!conn.open) return;
      conn.open = false;
      const b = Buffer.alloc(4);
      b[0] = 0x88;
      b[1] = 2;
      b.writeUInt16BE(code, 2);
      socket.end(b);
      conn.onclose(code);
    },
  };

  let buf = Buffer.alloc(0);
  socket.on('data', chunk => {
    buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
    while (conn.open) {
      if (buf.length < 2) return;
      const fin = buf[0] & 0x80;
      const op = buf[0] & 0x0f;
      const masked = buf[1] & 0x80;
      let len = buf[1] & 0x7f;
      let at = 2;
      if (len === 126) {
        if (buf.length < 4) return;
        len = buf.readUInt16BE(2);
        at = 4;
      } else if (len === 127) {
        if (buf.length < 10) return;
        const big = buf.readBigUInt64BE(2);
        if (big > BigInt(maxPayload)) return conn.close(1009);
        len = Number(big);
        at = 10;
      }
      if (!masked) return conn.close(1002);
      if (len > maxPayload) return conn.close(1009);
      if (buf.length < at + 4 + len) return;
      const mask = buf.subarray(at, at + 4);
      const data = Buffer.from(buf.subarray(at + 4, at + 4 + len));
      for (let i = 0; i < len; i++) data[i] ^= mask[i & 3];
      buf = buf.subarray(at + 4 + len);
      if (op === 0x8) return conn.close(1000);
      if (op === 0x9) {
        socket.write(Buffer.concat([Buffer.from([0x8a, data.length]), data]));
        continue;
      }
      if (op === 0xa) continue;
      if (op !== 0x1 || !fin) return conn.close(1003);
      conn.onmessage(data.toString('utf8'));
    }
  });
  const gone = () => {
    if (!conn.open) return;
    conn.open = false;
    conn.onclose(1006);
  };
  socket.on('close', gone);
  socket.on('error', gone);
  return conn;
}
