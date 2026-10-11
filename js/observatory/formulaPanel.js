// =============================================================================
// The observatory's "derive a column by a formula"
// -----------------------------------------------------------------------------
// Loaded only when a reader asks for a formula, so the observatory's own route
// carries none of it (the formula engine, js/formula/, is most of this chunk).
// Two halves:
//
//   engineFor(h)         what the page registers with transforms.js so that
//                        the `formula` change can be checked and made, now and
//                        whenever a saved session holding one is replayed. The
//                        change is {op: 'formula', id, name, formula, locale}:
//                        the text and the locale it was typed in, so the same
//                        text reads the same on any machine.
//   mountFormulaPanel()  the form: a name, a formula, a live reading of what
//                        the formula would give (its unit, and whether its
//                        uncertainty is propagated) or why it is refused, and
//                        the names, functions and constants it may use.
//
// The column it makes keeps its formula (`derived`) so it is never taken for
// data, and its uncertainty column, where every column the formula reads has
// one, is the first-order propagation of theirs.
//
// Nothing from the page's own modules is imported here - they arrive in `h`
// and `ctx`, as they do for the other panels: a module both this chunk and the
// page reached would leave the page's bundle for a chunk of its own, one more
// request for every visitor.
// =============================================================================

import { compile, CONSTANT_NAMES, FUNCTIONS, RULE } from '../formula/engine.js';
import { FormulaError, useNumberReader } from '../formula/parse.js';
import { parseNumber } from '../answerParse.js';
import { EN_FORMULA } from '../i18n/en.formula.js';
import { ES_FORMULA } from '../i18n/es.formula.js';

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') node.textContent = v;
    else if (v !== undefined && v !== null && v !== false)
      node.setAttribute(k, v === true ? '' : String(v));
  }
  node.append(...children);
  return node;
};

const isName = id => /^[\p{L}_][\p{L}\p{N}_]*$/u.test(id);
/** How a formula writes a column: bare when it can be, else in braces. */
export const written = id => (isName(id) ? id : `{${id}}`);

const numbersOf = o =>
  o.columns.filter(c => c.role === 'value' || c.role === 'x');
const num = values =>
  Float64Array.from(values, v => (typeof v === 'number' ? v : NaN));

/**
 * The reader's words for a refusal.
 * @param {unknown} err - What compile threw
 * @param {Function} t - The page's translator
 */
export function explain(err, t) {
  if (!(err instanceof FormulaError)) throw err;
  return t(`formula.err.${err.code}`, err.vars);
}

/**
 * The change's two halves for transforms.js, with the page's own helpers.
 * @param {{columnOf: Function, maskedRows: Function, rowCount: Function,
 *   uncertaintyOf: Function, t: Function, registerMessages: Function}} h
 * @returns {{scopeOf: Function, check: Function, apply: Function}}
 */
export function engineFor(h) {
  useNumberReader(parseNumber);
  h.registerMessages({ en: EN_FORMULA, es: ES_FORMULA });
  const scopeOf = o => {
    const inputs = {};
    for (const c of numbersOf(o)) {
      const u = h.uncertaintyOf(o, c.id);
      inputs[c.id] = {
        unit: c.unit ?? null,
        uncertainty: u.sigma
          ? 'sigma'
          : u.lower || u.upper
            ? 'interval'
            : 'none',
      };
    }
    return { inputs };
  };
  const make = (o, { formula, locale }) =>
    compile(formula, scopeOf(o), { locale });
  return {
    scopeOf,
    check(o, change) {
      const { id, name, formula } = change;
      if (typeof id !== 'string' || !/^[A-Za-z][\w-]*$/.test(id))
        return 'the new column needs an id of letters, digits, _ and -';
      if (o.columns.some(c => c.id === id))
        return `there is already a column ${id}`;
      if (typeof name !== 'string' || !name.trim())
        return 'the new column needs a name';
      if (typeof formula !== 'string') return h.t('formula.err.empty');
      try {
        const { info } = make(o, change);
        if (info.unit === null)
          return h.t('obs.formula.noUnit', {
            dim: info.unitText,
            dimension: info.dimension,
          });
        return null;
      } catch (e) {
        return explain(e, h.t);
      }
    },
    apply(o, change, next) {
      const { id, name, formula, locale } = change;
      const { info, run } = make(o, change);
      const data = {};
      for (const input of info.inputs) {
        const c = h.columnOf(o, input);
        const s = h.uncertaintyOf(o, input).sigma;
        data[input] = {
          values: num(c.values),
          sigma: s ? num(s.values) : null,
        };
      }
      const out = run(data, {
        rows: h.rowCount(o),
        skip: h.maskedRows(o),
      });
      const rule = info.rule === 'first-order' ? RULE : info.rule;
      next.columns.push({
        id,
        name,
        unit: info.unit,
        role: 'value',
        derived: { formula, locale, inputs: info.inputs, rule },
        values: out.values,
      });
      if (out.sigma)
        next.columns.push({
          id: `${id}-err`,
          name: `${name} error`,
          unit: info.unit,
          role: 'uncertainty',
          of: id,
          derived: { formula, locale, propagation: RULE },
          values: out.sigma,
        });
      return {
        o: next,
        note: {
          key: 'formula',
          vars: {
            name,
            formula,
            why: h.t(`obs.formula.why.${info.rule}`, {
              lacking: info.lacking.join(', '),
            }),
            gaps: out.domain
              ? ` ${h.t('obs.formula.gaps', { n: out.domain })}`
              : '',
          },
        },
      };
    },
  };
}

/**
 * @param {HTMLElement} host - Where the form goes
 * @param {{t: Function, language: () => string, getView: () => object,
 *   engine: object, newId: (name: string) => string,
 *   apply: (change: object) => boolean}} ctx - The page's own pieces, and
 *   what engineFor() returned
 * @returns {{update: (o: object) => void, destroy: () => void}}
 */
export function mountFormulaPanel(host, ctx) {
  let panel = build(host, ctx, ['', '']);
  return {
    update: o => panel.update(o),
    /** Build the form again in the page's new language, keeping the text. */
    rebuild() {
      const typed = panel.typed();
      panel = build(host, ctx, typed);
    },
    destroy: () => host.replaceChildren(),
  };
}

function build(host, ctx, [typedName, typedText]) {
  const { t } = ctx;
  const name = el('input', {
    class: 'ui-input',
    id: 'obsFormulaName',
    type: 'text',
    autocomplete: 'off',
    value: typedName,
  });
  const text = el('input', {
    class: 'ui-input',
    id: 'obsFormulaText',
    type: 'text',
    autocomplete: 'off',
    spellcheck: 'false',
    autocapitalize: 'off',
    'aria-describedby': 'obsFormulaPreview obsFormulaHelp',
    value: typedText,
  });
  const preview = el('p', {
    class: 'ui-status',
    id: 'obsFormulaPreview',
  });
  const go = el('button', {
    class: 'ui-button',
    id: 'obsFormulaGo',
    type: 'button',
    text: t('obs.formula.go'),
  });
  const help = el('p', { id: 'obsFormulaHelp', class: 'ui-hint' });
  const field = (label, input) =>
    el('label', { class: 'ui-field' }, el('span', { text: label }), input);
  const form = el(
    'div',
    { class: 'ui-grid is-end' },
    field(t('obs.formula.name'), name),
    field(t('obs.formula.text'), text),
    el('div', {}, go)
  );
  const details = el(
    'details',
    {},
    el('summary', { text: t('obs.formula.help.title') }),
    el('p', { text: t('obs.formula.help.grammar') }),
    help
  );
  host.replaceChildren(form, preview, details);

  const scopeNow = () => ctx.engine.scopeOf(ctx.getView());
  const read = () => {
    const locale = ctx.language();
    try {
      const { info } = compile(text.value, scopeNow(), { locale });
      return { info, locale };
    } catch (e) {
      return { problem: explain(e, t), locale };
    }
  };
  const show = () => {
    const names = Object.keys(scopeNow().inputs).map(written).join(', ');
    help.textContent = t('obs.formula.help.names', {
      names: names || '–',
      functions: FUNCTIONS.join(', '),
      constants: CONSTANT_NAMES.join(', '),
    });
    if (!text.value.trim()) {
      preview.textContent = '';
      preview.classList.remove('is-error');
      return;
    }
    const { info, problem } = read();
    const noUnit = !problem && info.unit === null;
    preview.classList.toggle('is-error', !!problem || noUnit);
    preview.textContent = problem
      ? problem
      : noUnit
        ? t('obs.formula.noUnit', {
            dim: info.unitText,
            dimension: info.dimension,
          })
        : t('obs.formula.preview', {
            unit: info.unit === '' ? t('obs.formula.plain') : info.unitText,
            why: t(`obs.formula.why.${info.rule}`, {
              lacking: info.lacking.join(', '),
            }),
          });
  };
  text.addEventListener('input', show);
  go.addEventListener('click', () => {
    const label = name.value.trim();
    const done = ctx.apply({
      op: 'formula',
      id: ctx.newId(label),
      name: label,
      formula: text.value,
      locale: ctx.language(),
    });
    if (done) {
      name.value = '';
      text.value = '';
      show();
    }
  });
  show();
  return { update: show, typed: () => [name.value, text.value] };
}
