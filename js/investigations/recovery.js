// =============================================================================
// After a wrong answer: a way back (Roadmap III Prompt 276)
// -----------------------------------------------------------------------------
// Lazy: fetched the first time a checked number is wrong, never before. It
// fills the slot js/investigations/stepView.js leaves under the "not yet" line
// with two things, each asked for by a button and neither shown unbidden:
//
//   a generated hint ladder, only on a step whose author wrote no hints. It is
//   made from what the step's check declares and nothing else: the unit the
//   answer is wanted in, the power of ten the declared answer lies in, and,
//   only where the check itself is a formula over the student's measurements,
//   that formula. A step that declares no unit has no units rung, an answer of
//   zero has no order of magnitude, and a step whose check is not a formula
//   has no formula rung: a question that asks for reasoning is never turned
//   into a formula nobody wrote. Every rung says it was generated.
//
//   "Try again with the instrument explained", where the step has an
//   instrument with an explainer (js/explainers.js): it opens that explainer,
//   through the panel's own button, and the answer is still the student's.
//
// A step with authored hints keeps them as they are (stepView.js hintBlock);
// the worked explanation stays behind them. Nothing here is a score, a streak
// or a lock.
//
// The attempts record: the wrong number on screen is appended to the step's
// `:tries` sub-key of `responses` when the slot is filled (one per line, as
// typed, not the same one twice in a row, at most eight: the first tries say
// where a student began). The rungs taken are kept under `:gen`. Both are
// additive: `attempts` still counts every check, `:first` still holds the
// first answer, and an older build keeps a sub-key and reads nothing from it.
// =============================================================================

// It imports nothing: what it needs of the lesson engine (the authored ladder,
// the escape, the language) is handed to it, and the explainers are asked for
// when a step has an instrument. A static import here would make the bundler
// cut a shared chunk out of the lesson's own, one more request on every
// lesson for a module most visits never load.

/** How many wrong answers are kept for one step, and how much of each. */
export const TRIES_LIMIT = 8;
export const TRY_LENGTH = 40;

/** @param {*} stored - A `:tries` value @returns {Array<string>} In order */
export const triesOf = stored =>
  typeof stored === 'string' ? stored.split('\n').filter(Boolean) : [];

/** The rungs a generated ladder can hold, in the order offered. */
export const GENERATED_RUNGS = Object.freeze(['units', 'magnitude', 'formula']);

const WORDS = {
  en: {
    note: 'Generated from this step’s own check, not written by its author.',
    ask: 'Show a generated hint ({n} of {total}): {name}',
    shown: 'Generated hint shown.',
    name: {
      units: 'the units',
      magnitude: 'the order of magnitude',
      formula: 'the formula',
    },
    head: {
      units: 'The units.',
      magnitude: 'The order of magnitude.',
      formula: 'The formula.',
    },
    units:
      'The answer is wanted in {unit}. Check the unit of each number you used before you combined them.',
    magnitude:
      'The answer is between {lo} and {hi}{unit}. If yours is outside that, look for a slipped power of ten.',
    negative:
      'The answer is negative, and its size is between {lo} and {hi}{unit}. If yours is outside that, look for a slipped power of ten or a lost sign.',
    formula:
      'This step checks your number against a rule over your own measurements: {expr}',
    where: '{name} is “{label}”, from “{title}”',
    explain: 'Try again with the instrument explained',
    explained:
      'The explanation of the instrument is open on its panel. Your answer is still yours to change.',
  },
  es: {
    note: 'Generada a partir de la comprobación de este paso; no la escribió su autor.',
    ask: 'Mostrar una pista generada ({n} de {total}): {name}',
    shown: 'Pista generada a la vista.',
    name: {
      units: 'las unidades',
      magnitude: 'el orden de magnitud',
      formula: 'la fórmula',
    },
    head: {
      units: 'Las unidades.',
      magnitude: 'El orden de magnitud.',
      formula: 'La fórmula.',
    },
    units:
      'La respuesta se pide en {unit}. Comprueba la unidad de cada número que usaste antes de combinarlos.',
    magnitude:
      'La respuesta está entre {lo} y {hi}{unit}. Si la tuya queda fuera, busca una potencia de diez mal puesta.',
    negative:
      'La respuesta es negativa y su tamaño está entre {lo} y {hi}{unit}. Si la tuya queda fuera, busca una potencia de diez mal puesta o un signo perdido.',
    formula:
      'Este paso comprueba tu número con una regla sobre tus propias medidas: {expr}',
    where: '{name} es «{label}», de «{title}»',
    explain: 'Intentar de nuevo con el instrumento explicado',
    explained:
      'La explicación del instrumento está abierta en su panel. Tu respuesta sigue siendo tuya para cambiarla.',
  },
};

const fill$ = (text, vars) =>
  text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

/**
 * The power of ten a number lies in: the k with 10^k <= |x| < 10^(k+1).
 * The powers are read from text ("1e3"), which is exact, so the edge cases
 * (1000, 0.001) do not depend on how a platform rounds a logarithm.
 * @param {number} x - Finite and not zero
 * @returns {number} k
 */
export function decadeOf(x) {
  const a = Math.abs(x);
  let k = Math.floor(Math.log10(a));
  while (Number(`1e${k + 1}`) <= a) k++;
  while (Number(`1e${k}`) > a) k--;
  return k;
}

/**
 * The ladder a step's own check supports, when its author wrote no hints.
 *
 * Pure. Each rung holds only what the step declares: nothing is computed that
 * the check does not already hold, and no rung states the answer.
 *
 * @param {object} step - A step as the engine has it (a formula already bound)
 * @param {Array<object>} [steps] - The lesson's steps, to name what a formula reads
 * @param {number} [authored] - How many hints its author wrote
 *   (js/answerFeedback.js hintLadder)
 * @returns {Array<object>} Rungs of GENERATED_RUNGS, in order; empty for a
 *   step that is not a checked number or that has authored hints
 */
export function generatedLadder(step, steps = [], authored = 0) {
  if (step?.kind !== 'numeric' || authored > 0) return [];
  const out = [];
  const unit =
    typeof step.unit === 'string' && step.unit.trim() ? step.unit.trim() : null;
  if (unit) out.push({ id: 'units', unit });
  if (Number.isFinite(step.answer) && step.answer !== 0) {
    out.push({
      id: 'magnitude',
      exponent: decadeOf(step.answer),
      negative: step.answer < 0,
      unit,
    });
  }
  const f = step.formula;
  if (f && typeof f.expr === 'string' && f.expr.trim()) {
    out.push({
      id: 'formula',
      expr: f.expr.trim(),
      of: Object.entries(f.of && typeof f.of === 'object' ? f.of : {}).map(
        ([name, ref]) => {
          const [sid, field] = String(ref).split('.');
          const at = steps.find(s => s?.sid === sid);
          const from = at?.fields?.find(x => x?.id === field);
          return {
            name,
            label: from?.label ?? field ?? '',
            title: at?.title ?? sid,
          };
        }
      ),
    });
  }
  return out;
}

/** The rungs recorded under a step's `:gen` key, in the order taken. */
export const generatedTaken = stored =>
  String(stored ?? '')
    .split(',')
    .filter(x => GENERATED_RUNGS.includes(x));

/** Ten to a power, as a reader writes it: 0.001, 1000, or 10 with an exponent. */
function power(e, es) {
  if (e >= 0 && e <= 5) return `1${'0'.repeat(e)}`;
  if (e < 0 && e >= -4) return `0${es ? ',' : '.'}${'0'.repeat(-e - 1)}1`;
  return `10<sup>${e < 0 ? '−' : ''}${Math.abs(e)}</sup>`;
}

const escape = s =>
  String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

/** Lesson prose may carry the four inline tags; anything else is text. */
const plain = s =>
  escape(String(s ?? '').replace(/<\/?(strong|em|sub|sup)>/g, ''));

/**
 * One rung's sentence, as HTML.
 * @param {object} rung - From generatedLadder
 * @param {string} [language] - 'es', or anything else for English
 * @returns {string}
 */
export function rungText(rung, language = 'en') {
  const w = WORDS[language === 'es' ? 'es' : 'en'];
  const es = language === 'es';
  const unit = rung.unit ? ` ${escape(rung.unit)}` : '';
  if (rung.id === 'units') return fill$(w.units, { unit: escape(rung.unit) });
  if (rung.id === 'magnitude')
    return fill$(rung.negative ? w.negative : w.magnitude, {
      lo: power(rung.exponent, es),
      hi: power(rung.exponent + 1, es),
      unit,
    });
  const where = rung.of
    .map(o =>
      fill$(w.where, {
        name: escape(o.name),
        label: plain(o.label),
        title: plain(o.title),
      })
    )
    .join('; ');
  return `${fill$(w.formula, { expr: `<code>${escape(rung.expr)}</code>` })}${where ? `. ${where}.` : '.'}`;
}

/** The `:tries` value with one more wrong answer (see the header). */
export function withTry(stored, answer) {
  const tries = triesOf(stored);
  const text = String(answer ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, TRY_LENGTH);
  if (text && tries.at(-1) !== text && tries.length < TRIES_LIMIT)
    tries.push(text);
  return tries.length ? tries.join('\n') : undefined;
}

/**
 * Fill the slot under a wrong answer, and keep that answer with the tries.
 *
 * @param {object} h - The step view's host (js/investigations/stepView.js
 *   bindStepInputs): els, responses, stepId, currentStep, steps, save
 * @param {Function} announce - Say it aloud
 * @param {Function} getLocale - The reader's language
 * @param {Function} hintsFor - The step's authored hints (js/answerFeedback.js)
 * @param {?string} [focus] - Which rung to put focus on after drawing
 * @returns {Promise<void>}
 */
export async function fill(h, announce, getLocale, hintsFor, focus = null) {
  const els = h.els();
  const slot = els.body.querySelector('[data-recover]');
  if (!slot) return;
  const step = h.currentStep();
  const id = h.stepId();
  const responses = h.responses();
  // The attempts record: the wrong answer on screen, once.
  const tries = withTry(responses[`${id}:tries`], responses[id]);
  if (tries && tries !== responses[`${id}:tries`]) {
    responses[`${id}:tries`] = tries;
    h.save();
  }
  const language = getLocale() === 'es' ? 'es' : 'en';
  const w = WORDS[language];
  const ladder = generatedLadder(
    step,
    h.steps?.() ?? [],
    hintsFor(step)?.ladder.length ?? 0
  );
  const taken = generatedTaken(responses[`${id}:gen`]);
  const next = ladder.find(r => !taken.includes(r.id));
  // The instrument explained: only where the step has an instrument, its
  // panel is showing and that instrument has an explainer to open.
  const button = els.toolExplain;
  let explain = false;
  if (step?.tool?.id && button && !button.closest('[hidden]')) {
    try {
      const m = await import('../explainers.js');
      explain = Boolean(m.explainerKeyFor(step.tool.id));
    } catch {
      /* offline and not cached: the button is not offered */
    }
    if (!slot.isConnected) return;
  }
  const parts = ladder
    .filter(r => taken.includes(r.id))
    .map(
      r =>
        `<p class="inv-hint" data-gen="${r.id}" tabindex="-1"><strong>${escape(w.head[r.id])}</strong> ${rungText(r, language)}</p>`
    );
  if (ladder.length)
    parts.push(`<p class="inv-gen-note">${escape(w.note)}</p>`);
  const buttons = [
    next
      ? `<button type="button" class="ui-button subtle inv-hint-btn" data-gen-next="${next.id}">${escape(
          fill$(w.ask, {
            n: ladder.indexOf(next) + 1,
            total: ladder.length,
            name: w.name[next.id],
          })
        )}</button>`
      : '',
    explain
      ? `<button type="button" class="ui-button subtle inv-hint-btn" data-recover-explain>${escape(w.explain)}</button>`
      : '',
  ].join('');
  slot.innerHTML = `${parts.join('')}${buttons ? `<div class="inv-hint-row">${buttons}</div>` : ''}`;
  slot.hidden = !slot.innerHTML;

  // The buttons are made again with the slot, so a handler set on one goes
  // with it: nothing is left listening.
  const more = slot.querySelector('[data-gen-next]');
  if (more)
    more.onclick = () => {
      responses[`${id}:gen`] = [...taken, more.dataset.genNext].join(',');
      h.save();
      fill(h, announce, getLocale, hintsFor, more.dataset.genNext);
    };
  const explained = slot.querySelector('[data-recover-explain]');
  if (explained)
    explained.onclick = () => {
      if (button.getAttribute('aria-expanded') !== 'true') button.click();
      button.focus();
      announce(w.explained);
    };
  if (focus) {
    const shown = slot.querySelector(`[data-gen="${focus}"]`);
    shown?.focus();
    announce(`${w.shown} ${shown?.textContent ?? ''}`);
  }
}
