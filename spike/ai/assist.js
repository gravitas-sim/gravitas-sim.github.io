// =============================================================================
// Prompt 120 spike: the enforcement half of instructor-side AI assistance
// -----------------------------------------------------------------------------
// Disposable. It holds no key, names no vendor and has no default endpoint; it
// is only ever given a `fetchImpl` and an endpoint by its caller, and the gate's
// harness gives it a loopback stand-in. What it proves is whether the rules in
// THRESHOLDS.md can be enforced in code, not whether a model is any good.
//
//   enabled(store)            the flag, off unless a fresh storage says '1'
//   requestFor(...)           the allow-listed request, deterministic prompt
//   checkDraft(...)           shape, markup, numbers (R-NUM), leaks, repeats
//   callEndpoint(...)         never throws; null on every failure
//   propose(...)              request, call, check: a draft record or null
//   accept(pack, draft)       the pack with one text replaced, and provenance
// =============================================================================

import { digest } from '../../js/composer/compile.js';
import { scaffoldProblems } from '../../js/authoring/rules.js';

export const PROMPT_VERSION = 'p120-1';
export const FLAG_KEY = 'gravitas_assist';
export const USES = Object.freeze(['hint', 'spanish', 'distractor']);
/** The only keys a request may carry. */
export const ALLOW_FIELDS = Object.freeze([
  'use',
  'path',
  'kind',
  'locale',
  'text',
  'digest',
  'context',
]);
export const MAX_DRAFT = 300;
export const MAX_BODY = 8192;
export const DEFAULT_TIMEOUT_MS = 8000;

// ---------------------------------------------------------------------------
// The flag
// ---------------------------------------------------------------------------

/** Off unless the instructor turned it on in this browser. */
export function enabled(store) {
  try {
    return store?.getItem?.(FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// R-NUM: a draft that states a number is refused
// ---------------------------------------------------------------------------

const WORDS_EN =
  'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million billion';
const WORDS_ES =
  'cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciséis dieciseis diecisiete dieciocho diecinueve veinte treinta cuarenta cincuenta sesenta setenta ochenta noventa cien ciento mil millón millon';
const NUMBER_WORDS = new Set(`${WORDS_EN} ${WORDS_ES}`.split(' '));

/** The text a reader sees: tags and named entities out. */
const visible = t =>
  String(t)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-zA-Z]+;/g, ' ');
const wordsOf = t =>
  visible(t)
    .toLowerCase()
    .match(/\p{L}+/gu) || [];
const digitStrings = t =>
  (visible(t).match(/\p{Nd}+(?:[.,]\p{Nd}+)?/gu) || []).map(s =>
    s.replace(',', '.')
  );
const countNumberWords = t =>
  wordsOf(t).filter(w => NUMBER_WORDS.has(w)).length;

/**
 * Whether a text states a number, and which.
 * @param {string} text - The draft
 * @param {?string} source - For a translation, the English it came from, whose
 *   digit strings and number-word count the draft may repeat and not exceed
 * @returns {string[]} Reasons; empty when the text passes
 */
export function numberProblems(text, source = null) {
  const out = [];
  const digits = digitStrings(text);
  if (source === null) {
    if (digits.length) out.push(`states a number (${digits[0]})`);
    if (countNumberWords(text)) out.push('states a number in words');
    return out;
  }
  const have = new Map();
  for (const d of digitStrings(source)) have.set(d, (have.get(d) || 0) + 1);
  for (const d of digits) {
    if (!have.get(d))
      out.push(`adds a number the English does not have (${d})`);
    else have.set(d, have.get(d) - 1);
  }
  if (countNumberWords(text) > countNumberWords(source))
    out.push('has more number words than the English');
  return out;
}

// ---------------------------------------------------------------------------
// Draft checks
// ---------------------------------------------------------------------------

const TAG = /<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g;

/** Markup problems: only <sup>, <sub>, <em>, no attributes, named entities. */
export function markupProblems(text) {
  const out = [];
  for (const m of text.matchAll(TAG)) {
    if (!['sup', 'sub', 'em'].includes(m[1].toLowerCase()) || m[2].trim())
      out.push(`markup <${m[1]}> is not allowed`);
  }
  const bare = text.replace(TAG, '');
  if (/[<>]/.test(bare)) out.push('stray angle bracket');
  if (/&#/.test(text)) out.push('numeric character reference');
  if (/&(?![a-zA-Z]+;)/.test(text)) out.push('stray ampersand');
  return out;
}

const plain = t =>
  visible(t)
    .toLowerCase()
    .replace(/[^\p{L}\p{Nd}]+/gu, ' ')
    .trim();

/**
 * Judge a draft. Pure; the same rules whoever wrote the text.
 * @param {string} use - 'hint', 'spanish' or 'distractor'
 * @param {*} draft - What the endpoint returned
 * @param {object} ctx
 * @param {string} [ctx.en] - For 'spanish', the English source
 * @param {object} [ctx.step] - For 'hint' and 'distractor', the step as the
 *   pack holds it (its answer and options), in English
 * @returns {{ok: boolean, reasons: string[]}}
 */
export function checkDraft(use, draft, ctx = {}) {
  const reasons = [];
  if (typeof draft !== 'string' || !draft.trim())
    return { ok: false, reasons: ['not a non-empty string'] };
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000b-\u001f\u007f]/.test(draft))
    reasons.push('control characters');
  const limit =
    use === 'spanish' ? 3 * String(ctx.en || '').length + 80 : MAX_DRAFT;
  if (draft.length > limit) reasons.push(`longer than ${limit} characters`);
  if (use === 'distractor' && /\n/.test(draft))
    reasons.push('more than one line');
  reasons.push(...markupProblems(draft));
  reasons.push(
    ...numberProblems(draft, use === 'spanish' ? (ctx.en ?? '') : null)
  );
  if (use === 'hint' && ctx.step) {
    const step = { ...ctx.step, hints: [draft] };
    if (scaffoldProblems(step, true).some(f => f.rule === 'content/hint-leak'))
      reasons.push('contains the expected value');
  }
  if (use === 'distractor' && ctx.step) {
    const { options = [], answer } = ctx.step;
    const right = plain(options[answer] ?? '');
    const mine = plain(draft);
    if (
      right &&
      (mine === right || (right.length >= 8 && mine.includes(right)))
    )
      reasons.push('is the right answer');
    if (options.some((o, i) => i !== answer && plain(o) === mine))
      reasons.push('repeats an option');
  }
  return { ok: reasons.length === 0, reasons };
}

// ---------------------------------------------------------------------------
// The request: an allow-list, a deterministic prompt
// ---------------------------------------------------------------------------

const INSTRUCTIONS = {
  hint: 'Write one short hint for the instructor to review. Say what to check, never the answer. No numbers, digits or number words.',
  spanish:
    'Translate the text into Spanish for the instructor to review. Keep every number exactly as written. Add nothing.',
  distractor:
    'Write one plausible wrong option for the instructor to review, in the style of the others. No numbers, digits or number words.',
};

/**
 * What would be sent, from the instructor's own pack and nothing else.
 *
 * @param {string} use
 * @param {object} pack - The instructor's pack (never student state)
 * @param {string} path - The text's path, as collectTexts writes it
 * @param {object} text - The `{en}` text the draft is for
 * @param {string[]} [context] - Instructor-authored texts that frame it
 * @returns {{request: object, prompt: string, promptDigest: string, chars: number}}
 */
export function requestFor(use, pack, path, text, context = []) {
  const step = /^steps\[(\d+)\]/.exec(path);
  const kind = step
    ? (pack.steps?.[+step[1]]?.kind ?? pack.steps?.[+step[1]]?.type)
    : null;
  const request = {
    use,
    path,
    kind: kind ?? null,
    locale: use === 'spanish' ? 'es' : 'en',
    text: String(text?.en ?? ''),
    digest: digest(text?.en ?? ''),
    context: context.map(String),
  };
  const prompt = [
    `[${PROMPT_VERSION}] ${INSTRUCTIONS[use]}`,
    `Text: ${request.text}`,
    ...request.context.map((c, i) => `Context ${i + 1}: ${c}`),
  ].join('\n');
  return {
    request,
    prompt,
    promptDigest: digest(prompt),
    chars: prompt.length,
  };
}

// ---------------------------------------------------------------------------
// The call: never throws, null on every failure
// ---------------------------------------------------------------------------

/** The two body shapes the platform knows. An endpoint is the instructor's. */
export const ADAPTERS = Object.freeze({
  chat: {
    body: (prompt, params) => ({
      ...params,
      messages: [{ role: 'user', content: prompt }],
    }),
    read: j => ({ text: j?.choices?.[0]?.message?.content, model: j?.model }),
  },
  plain: {
    body: (prompt, params) => ({ ...params, prompt }),
    read: j => ({ text: j?.text, model: j?.model }),
  },
});

/**
 * @returns {Promise<?{text: string, model: ?string}>} Null on any failure
 */
export async function callEndpoint({
  fetchImpl,
  endpoint,
  prompt,
  params = { temperature: 0 },
  timeoutMs = DEFAULT_TIMEOUT_MS,
  signal,
}) {
  let timer;
  try {
    const adapter = ADAPTERS[endpoint?.adapter];
    if (!adapter || typeof endpoint?.url !== 'string') return null;
    const ctl = new AbortController();
    timer = setTimeout(() => ctl.abort(), timeoutMs);
    if (signal) {
      if (signal.aborted) return null;
      signal.addEventListener('abort', () => ctl.abort(), { once: true });
    }
    const res = await fetchImpl(endpoint.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(adapter.body(prompt, params)),
      signal: ctl.signal,
    });
    if (!res || !res.ok) return null;
    const raw = await res.text();
    if (typeof raw !== 'string' || !raw || raw.length > MAX_BODY) return null;
    const got = adapter.read(JSON.parse(raw));
    if (typeof got.text !== 'string') return null;
    return {
      text: got.text,
      model: typeof got.model === 'string' ? got.model : null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Request, call and check one draft.
 * @returns {Promise<?object>} A draft record, or null (disabled, failed or refused)
 */
export async function propose({
  store,
  fetchImpl,
  endpoint,
  use,
  pack,
  path,
  text,
  context,
  step,
  params = { temperature: 0 },
  timeoutMs,
  signal,
  now = () => new Date().toISOString(),
}) {
  try {
    if (!enabled(store) || !USES.includes(use)) return null;
    const built = requestFor(use, pack, path, text, context);
    const got = await callEndpoint({
      fetchImpl,
      endpoint,
      prompt: built.prompt,
      params,
      timeoutMs,
      signal,
    });
    if (!got) return null;
    const verdict = checkDraft(use, got.text.trim(), { en: text?.en, step });
    if (!verdict.ok) return null;
    return {
      draft: true,
      use,
      path,
      text: got.text.trim(),
      sourceDigest: built.request.digest,
      provenance: {
        promptVersion: PROMPT_VERSION,
        promptDigest: built.promptDigest,
        model: got.model,
        params,
        at: now(),
      },
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Accepting a draft
// ---------------------------------------------------------------------------

const clone = v => JSON.parse(JSON.stringify(v));

function locate(root, path) {
  const keys = path.match(/[^.[\]]+/g) || [];
  let node = root;
  for (const k of keys.slice(0, -1)) node = node?.[k];
  return { parent: node, key: keys[keys.length - 1] };
}

/**
 * The pack with one draft accepted. The input is not touched. A Spanish draft
 * replaces `es` and records the digest of the English it was drafted from, as
 * the composer does for a hand-written translation; a hint replaces the text's
 * `en`; a distractor is the text of the option at `path`.
 * Provenance goes to `drafted`, a field the format does not yet have.
 *
 * @returns {object} A new pack
 */
export function accept(pack, rec) {
  const out = clone(pack);
  const { parent, key } = locate(out, rec.path);
  if (!parent || !parent[key]) return out;
  if (rec.use === 'spanish') {
    parent[key].es = rec.text;
    parent[key].esOf = rec.sourceDigest;
  } else {
    parent[key].en = rec.text;
    delete parent[key].es;
    delete parent[key].esOf;
  }
  out.drafted = [
    ...(out.drafted || []),
    { path: rec.path, use: rec.use, ...rec.provenance },
  ];
  return out;
}
