// =============================================================================
// SPIKE (Prompt 21): a WebAssembly module written byte by byte
// -----------------------------------------------------------------------------
// This machine has no WebAssembly toolchain (no wasm32 clang, Rust,
// Emscripten or wabt), and the contract allows no new npm package. So the
// purpose-built kernels are encoded directly, from a small instruction list,
// into the binary format (WebAssembly Core Specification 1.0, section 5).
// That this is possible for a hundred-instruction kernel, and what it costs
// to maintain, is itself evidence for SCIENTIFIC_KERNEL_GATE.md.
// =============================================================================

const u = n => {
  // Unsigned LEB128.
  const out = [];
  do {
    let b = n & 0x7f;
    n >>>= 7;
    if (n) b |= 0x80;
    out.push(b);
  } while (n);
  return out;
};
const s = n => {
  // Signed LEB128 (i32).
  const out = [];
  for (;;) {
    const b = n & 0x7f;
    n >>= 7;
    if ((n === 0 && !(b & 0x40)) || (n === -1 && b & 0x40)) {
      out.push(b);
      return out;
    }
    out.push(b | 0x80);
  }
};
const f64 = x => [...new Uint8Array(new Float64Array([x]).buffer)];
const vec = items => [...u(items.length), ...items.flat()];
const section = (id, bytes) => [id, ...u(bytes.length), ...bytes];
const name = str => vec([...new TextEncoder().encode(str)].map(b => [b]));

export const T = { i32: 0x7f, f64: 0x7c };

/** The instructions the kernels use, as byte builders. */
export const op = {
  get: i => [0x20, ...u(i)],
  set: i => [0x21, ...u(i)],
  tee: i => [0x22, ...u(i)],
  i32: n => [0x41, ...s(n)],
  f64: x => [0x44, ...f64(x)],
  // Memory: a f64 at byte address (the i32 on the stack) + offset.
  load: (offset = 0) => [0x2b, 3, ...u(offset)],
  store: (offset = 0) => [0x39, 3, ...u(offset)],
  iadd: [0x6a],
  isub: [0x6b],
  imul: [0x6c],
  ishl: [0x74],
  ilts: [0x48],
  igeu: [0x4f],
  ieqz: [0x45],
  fadd: [0xa0],
  fsub: [0xa1],
  fmul: [0xa2],
  fdiv: [0xa3],
  fgt: [0x64],
  flt: [0x63],
  fge: [0x66],
  ffloor: [0x9c],
  fmin: [0xa4],
  fmax: [0xa5],
  trunc: [0xaa], // i32.trunc_f64_s
  convert: [0xb7], // f64.convert_i32_s
  block: [0x02, 0x40],
  loop: [0x03, 0x40],
  if: [0x04, 0x40],
  else: [0x05],
  end: [0x0b],
  br: d => [0x0c, ...u(d)],
  brIf: d => [0x0d, ...u(d)],
  ret: [0x0f],
  select: [0x1b],
  drop: [0x1a],
};

/**
 * A module of functions over one exported memory.
 * @param {{pages: number, functions: Array<{name: string, params: number[],
 *   results: number[], locals: number[], body: number[][]}>}} spec
 * @returns {Uint8Array}
 */
export function module({ pages, functions }) {
  const types = functions.map(f => [0x60, ...vec(f.params.map(p => [p])), ...vec(f.results.map(r => [r]))]);
  const code = functions.map(f => {
    // Locals are declared in runs of one type.
    const runs = [];
    for (const l of f.locals) {
      if (runs.length && runs.at(-1)[1] === l) runs.at(-1)[0]++;
      else runs.push([1, l]);
    }
    const body = [...vec(runs.map(([n, t]) => [...u(n), t])), ...f.body.flat(Infinity), 0x0b];
    return [...u(body.length), ...body];
  });
  const bytes = [
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
    ...section(1, vec(types)),
    ...section(3, vec(functions.map((_, i) => u(i)))),
    ...section(5, vec([[0x00, ...u(pages)]])),
    ...section(
      7,
      vec([
        ...functions.map((f, i) => [...name(f.name), 0x00, ...u(i)]),
        [...name('memory'), 0x02, 0x00],
      ])
    ),
    ...section(10, vec(code)),
  ];
  // A value that is not a byte - an array nested one level too deep - would
  // become 0x00, which is `unreachable`: the module would validate and trap.
  // The first draft of the kernels did exactly that.
  const bad = bytes.findIndex(b => !Number.isInteger(b) || b < 0 || b > 255);
  if (bad >= 0) throw new Error(`byte ${bad} is ${JSON.stringify(bytes[bad])}, not a byte`);
  return new Uint8Array(bytes);
}
