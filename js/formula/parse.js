// =============================================================================
// The formula language: tokens and a recursive-descent parser
// -----------------------------------------------------------------------------
// A closed language for a derived column or quantity. Nothing a student types
// is ever run as code: the text is read into a tree of numbers, names, the
// four operators and a power, parentheses and a fixed list of functions, and
// the evaluator (./engine.js) walks that tree. This file contains no eval and
// no Function constructor (tests/formula.test.js reads it to prove so), no
// assignment, no conditional, no loop, no string except a unit in to(), no
// property access and no user-defined function.
//
//   expr   = term { ("+" | "-") term }
//   term   = unary { ("*" | "/") unary }
//   unary  = ("-" | "+") unary | power
//   power  = atom [ "^" unary ]            right-associative: 2^3^2 is 2^9
//   atom   = number [ "[" unit "]" ] | name | "{" id "}" | call | "(" expr ")"
//   call   = name "(" [ arg { sep arg } ] ")"
//   arg    = expr | 'unit'                 a quoted unit, only in to(x, 'km/s')
//
// A number is read by the shared reader (js/answerParse.js) in the locale's
// convention: 1.5 in English, 1,5 in Spanish. Because a comma is then a
// decimal mark in Spanish, arguments are separated by ";" always, and by ","
// also in English. A name is letters, digits and _ (not starting with a digit)
// and is a constant or a column or quantity id; a column whose id has other
// characters is written in braces, {flux-err}. A unit follows its number in
// square brackets, 5[km/s]. Hostile input is bounded: the text, the tokens,
// the depth of nesting and the nodes are each limited, and every refusal is a
// FormulaError with a code, not a stack overflow.
//
// Pure: no DOM. Browser and Node alike.
// =============================================================================

// The shared number reader (js/answerParse.js parseNumber) is handed in by the
// surface that loads this module, with useNumberReader(): importing it here
// would take it out of the bundles that already carry it and into a chunk of
// their own, one more request on every route. Until one is registered a plain
// reader stands in, with the locale's decimal mark and no more.
let readNumber = raw => {
  const value = Number(String(raw).split(',').join('.'));
  return Number.isFinite(value) ? { ok: true, value, rest: '' } : { ok: false };
};
export const useNumberReader = f => {
  readNumber = f;
};

export const LIMITS = Object.freeze({
  chars: 400,
  tokens: 200,
  depth: 20,
  nodes: 150,
  rows: 20000,
});

/** Every code a FormulaError carries; js/i18n/en.formula.js words each. */
export const CODES = Object.freeze([
  'length',
  'tokens',
  'char',
  'number',
  'empty',
  'expected',
  'end',
  'unexpected',
  'adjacent',
  'depth',
  'nodes',
  'unit',
  'unknownId',
  'noUnit',
  'interval',
  'notConstrained',
  'failed',
  'limit',
  'limitMixed',
  'limitNonMonotone',
  'string',
  'dimension',
  'angleMix',
  'opaque',
  'power',
  'fractional',
  'unknownFn',
  'arity',
  'conversion',
  'dimensionless',
  'notAngle',
  'rows',
  'data',
]);

/**
 * Why a formula was refused. `code` names the reason, `vars` fills its words
 * (js/i18n/en.formula.js), and `at` is the [start, end) of the text it is
 * about, when it is about some.
 */
export class FormulaError extends Error {
  constructor(code, vars = {}, at = null) {
    super(`formula: ${code}`);
    this.name = 'FormulaError';
    this.code = code;
    this.vars = vars;
    this.at = at;
  }
}
export const fail = (code, vars, s, e) => {
  throw new FormulaError(code, vars, s === undefined ? null : [s, e]);
};

const OPS = {
  '+': '+',
  '-': '-',
  '−': '-',
  '*': '*',
  '×': '*',
  '·': '*',
  '/': '/',
  '÷': '/',
  '^': '^',
  '(': '(',
  ')': ')',
  ';': ',',
};
const SUPERSCRIPT = { '²': 2, '³': 3 };
const NAME = /[\p{L}_][\p{L}\p{Nd}_]*/uy;
const BRACED = /\{([^{}\s]{1,64})\}/y;
const QUOTED = /'([^']{1,24})'|"([^"]{1,24})"/y;
const BRACKET = /\s*\[([^\]]{1,24})\]/y;

/**
 * The text as tokens: {k: 'num' | 'name' | 'ref' | 'str' | 'op', ...} with the
 * [s, e) it came from.
 * @param {string} src - The formula
 * @param {string} [locale] - 'en' or 'es': the decimal mark and the separator
 * @returns {object[]}
 */
export function tokenize(src, locale = 'en') {
  const text = String(src ?? '');
  if (text.length > LIMITS.chars) fail('length', { max: LIMITS.chars });
  const es = String(locale).startsWith('es');
  const mark = es ? ',' : '.';
  const NUMBER = new RegExp(
    `(?:\\d+(?:[${mark}]\\d+)?|[${mark}]\\d+)(?:[eE][+-]?\\d+)?`,
    'y'
  );
  const out = [];
  for (let i = 0; i < text.length;) {
    if (out.length >= LIMITS.tokens) fail('tokens', { max: LIMITS.tokens });
    const ch = text[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    NUMBER.lastIndex = i;
    let m = NUMBER.exec(text);
    if (m) {
      const raw = m[0];
      const read = readNumber(raw[0] === mark ? `0${raw}` : raw, locale);
      const e = i + raw.length;
      if (!read.ok || read.rest || raw.length > 40)
        fail('number', { text: raw }, i, e);
      const tok = { k: 'num', v: read.value, s: i, e };
      BRACKET.lastIndex = e;
      const u = BRACKET.exec(text);
      if (u) {
        tok.unit = u[1].trim();
        tok.e = e + u[0].length;
      }
      out.push(tok);
      i = tok.e;
      continue;
    }
    NAME.lastIndex = i;
    if ((m = NAME.exec(text))) {
      out.push({ k: 'name', n: m[0], s: i, e: i + m[0].length });
      i += m[0].length;
      continue;
    }
    BRACED.lastIndex = i;
    if ((m = BRACED.exec(text))) {
      out.push({ k: 'ref', n: m[1], s: i, e: i + m[0].length });
      i += m[0].length;
      continue;
    }
    QUOTED.lastIndex = i;
    if ((m = QUOTED.exec(text))) {
      out.push({ k: 'str', v: m[1] ?? m[2], s: i, e: i + m[0].length });
      i += m[0].length;
      continue;
    }
    if (Object.hasOwn(SUPERSCRIPT, ch)) {
      out.push({ k: 'op', v: '^', s: i, e: i + 1 });
      out.push({ k: 'num', v: SUPERSCRIPT[ch], s: i, e: i + 1 });
      i++;
      continue;
    }
    if (ch === ',' && !es) {
      out.push({ k: 'op', v: ',', s: i, e: i + 1 });
      i++;
      continue;
    }
    if (Object.hasOwn(OPS, ch)) {
      out.push({ k: 'op', v: OPS[ch], s: i, e: i + 1 });
      i++;
      continue;
    }
    fail('char', { char: ch }, i, i + 1);
  }
  return out;
}

/**
 * The text as a tree. Every node has `t` (its kind) and `s`, `e`, the [s, e)
 * of the text it stands for: num (`v`, and `unit` text if it has one), name or
 * ref (`n`), neg (`a`), bin (`o`, `a`, `b`), call (`f`, `args`), str (`v`).
 *
 * @param {string} src - The formula
 * @param {string} [locale] - 'en' or 'es'
 * @returns {object} The root
 * @throws {FormulaError}
 */
export function parse(src, locale = 'en') {
  const toks = tokenize(src, locale);
  if (!toks.length) fail('empty');
  let p = 0;
  let nodes = 0;
  let depth = 0;
  const node = (n, s, e) => {
    if (++nodes > LIMITS.nodes) fail('nodes', { max: LIMITS.nodes });
    return { ...n, s, e };
  };
  const at = () => toks[p];
  const isOp = v => at()?.k === 'op' && at().v === v;
  const down = () => {
    if (++depth > LIMITS.depth) fail('depth', { max: LIMITS.depth });
  };
  const near = () => at() ?? toks[toks.length - 1];
  const expect = v => {
    if (!isOp(v)) {
      const t = near();
      fail('expected', { want: v }, t.s, t.e);
    }
    return toks[p++];
  };

  const binary = (next, ops) => () => {
    let a = next();
    while (at()?.k === 'op' && ops.includes(at().v)) {
      const o = toks[p++].v;
      const b = next();
      a = node({ t: 'bin', o, a, b }, a.s, b.e);
    }
    return a;
  };
  const unary = () => {
    down();
    let r;
    if (isOp('-') || isOp('+')) {
      const t = toks[p++];
      const a = unary();
      r = t.v === '-' ? node({ t: 'neg', a }, t.s, a.e) : a;
    } else r = power();
    depth--;
    return r;
  };
  const power = () => {
    const a = atom();
    if (!isOp('^')) return a;
    p++;
    const b = unary();
    return node({ t: 'bin', o: '^', a, b }, a.s, b.e);
  };
  const atom = () => {
    const t = at();
    if (!t) fail('end', {}, toks[toks.length - 1].e, toks[toks.length - 1].e);
    p++;
    if (t.k === 'num')
      return node(
        { t: 'num', v: t.v, ...(t.unit === undefined ? {} : { unit: t.unit }) },
        t.s,
        t.e
      );
    if (t.k === 'ref') return node({ t: 'ref', n: t.n }, t.s, t.e);
    if (t.k === 'str') return node({ t: 'str', v: t.v }, t.s, t.e);
    if (t.k === 'name') {
      if (!isOp('(')) return node({ t: 'name', n: t.n }, t.s, t.e);
      p++;
      const args = [];
      down();
      if (!isOp(')')) {
        for (;;) {
          args.push(at()?.k === 'str' ? atom() : expr());
          if (isOp(',')) p++;
          else break;
        }
      }
      depth--;
      const close = expect(')');
      return node({ t: 'call', f: t.n, args }, t.s, close.e);
    }
    if (t.v === '(') {
      down();
      const inner = expr();
      depth--;
      const close = expect(')');
      return { ...inner, s: t.s, e: close.e };
    }
    fail('unexpected', { text: String(src).slice(t.s, t.e) }, t.s, t.e);
  };
  const term = binary(unary, ['*', '/']);
  const expr = binary(term, ['+', '-']);

  const root = expr();
  if (p < toks.length) {
    const t = at();
    fail(
      t.k === 'num' || t.k === 'name' || t.k === 'ref'
        ? 'adjacent'
        : 'unexpected',
      { text: String(src).slice(t.s, t.e) },
      t.s,
      t.e
    );
  }
  return root;
}
