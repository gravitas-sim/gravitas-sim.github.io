// =============================================================================
// Spike: the lighter route, a derived column from an expression
// -----------------------------------------------------------------------------
// What the Observatory's `derive` transform would become if it took a formula
// instead of a sum of columns: arithmetic, powers, a closed list of
// functions, and the observation's own columns by id. A tokenizer and a
// recursive-descent parser build a tree; evaluating it walks the tree once per
// row. Nothing is ever passed to eval or Function, there are no loops,
// assignments or calls outside the list, and a missing value (NaN) stays
// missing. Units are the reader's to state: the result is dimensionless unless
// they say otherwise, because a unit algebra is a separate piece of work.
// =============================================================================

const FUNCTIONS = {
  sqrt: [1, Math.sqrt],
  abs: [1, Math.abs],
  exp: [1, Math.exp],
  ln: [1, Math.log],
  log10: [1, Math.log10],
  sin: [1, Math.sin],
  cos: [1, Math.cos],
  tan: [1, Math.tan],
  asin: [1, Math.asin],
  acos: [1, Math.acos],
  atan2: [2, Math.atan2],
  min: [2, Math.min],
  max: [2, Math.max],
};
const CONSTANTS = { pi: Math.PI, e: Math.E };
const MAX_LENGTH = 500;
const MAX_NODES = 200;

function tokens(text) {
  const out = [];
  const re = /\s*(?:(\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)|([A-Za-z_][\w-]*)|(\*\*|[-+*/^(),]))/y;
  let at = 0;
  while (at < text.length) {
    if (/^\s*$/.test(text.slice(at))) break;
    re.lastIndex = at;
    const m = re.exec(text);
    if (!m) throw new Error(`cannot read "${text.slice(at, at + 10)}"`);
    at = re.lastIndex;
    if (m[1] !== undefined) out.push({ t: 'num', v: Number(m[1]) });
    else if (m[2] !== undefined) out.push({ t: 'id', v: m[2] });
    else out.push({ t: 'op', v: m[3] === '**' ? '^' : m[3] });
  }
  return out;
}

/** Parse a formula over the given column ids into a tree, or say why not. */
export function parse(text, columns) {
  if (typeof text !== 'string' || text.length > MAX_LENGTH)
    throw new Error(`a formula of at most ${MAX_LENGTH} characters`);
  const ts = tokens(text);
  let i = 0;
  let nodes = 0;
  const node = n => {
    if (++nodes > MAX_NODES) throw new Error('the formula is too long');
    return n;
  };
  const peek = v => ts[i] && ts[i].t === 'op' && ts[i].v === v;
  const expect = v => {
    if (!peek(v)) throw new Error(`expected "${v}"`);
    i++;
  };
  const sum = () => {
    let a = product();
    while (peek('+') || peek('-')) a = node({ op: ts[i++].v, a, b: product() });
    return a;
  };
  const product = () => {
    let a = unary();
    while (peek('*') || peek('/')) a = node({ op: ts[i++].v, a, b: unary() });
    return a;
  };
  const unary = () => (peek('-') ? (i++, node({ op: 'neg', a: unary() })) : power());
  const power = () => {
    const a = atom();
    return peek('^') ? (i++, node({ op: '^', a, b: unary() })) : a;
  };
  const atom = () => {
    const t = ts[i++];
    if (!t) throw new Error('the formula ends too soon');
    if (t.t === 'num') return node({ num: t.v });
    if (t.t === 'op' && t.v === '(') {
      const e = sum();
      expect(')');
      return e;
    }
    if (t.t === 'id') {
      // Own properties only: "constructor" and "__proto__" are on every
      // object's prototype, and a formula must not reach them.
      if (Object.hasOwn(FUNCTIONS, t.v)) {
        const [arity, fn] = FUNCTIONS[t.v];
        expect('(');
        const args = [sum()];
        while (peek(',')) (i++, args.push(sum()));
        expect(')');
        if (args.length !== arity) throw new Error(`${t.v} takes ${arity}`);
        return node({ fn, args });
      }
      if (Object.hasOwn(CONSTANTS, t.v)) return node({ num: CONSTANTS[t.v] });
      if (columns.includes(t.v)) return node({ column: t.v });
      throw new Error(`there is no column or function "${t.v}"`);
    }
    throw new Error(`unexpected "${t.v}"`);
  };
  const tree = sum();
  if (i !== ts.length) throw new Error(`unexpected "${ts[i].v}"`);
  return tree;
}

/** The formula's value at every row. */
export function evaluate(tree, values, rows) {
  const at = (n, r) => {
    if (n.num !== undefined) return n.num;
    if (n.column) {
      const v = values[n.column][r];
      return typeof v === 'number' ? v : NaN;
    }
    if (n.fn) return n.fn(...n.args.map(a => at(a, r)));
    const a = at(n.a, r);
    if (n.op === 'neg') return -a;
    const b = at(n.b, r);
    switch (n.op) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '*':
        return a * b;
      case '/':
        return a / b;
      default:
        return a ** b;
    }
  };
  const out = new Float64Array(rows);
  for (let r = 0; r < rows; r++) out[r] = at(tree, r);
  return out;
}
