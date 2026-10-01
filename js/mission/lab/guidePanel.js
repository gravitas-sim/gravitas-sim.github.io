// =============================================================================
// The mission lab's guide panel
// -----------------------------------------------------------------------------
// Runs the guides of ./curriculum.js beside the lab: one step at a time, with
// its words (gd.* in the lab's catalogs), its input, a check against the
// reader's own lab state, and "Show me" after a wrong answer or for a "do"
// step. Progress is kept in this browser per guide and path; the report is
// a file with no clock in it (gravitas.mission-lab-report/1), so the same
// answers make the same bytes.
//
// The panel never computes: it reads the page's state and asks the page to
// apply a step's `go` (a plan patch, or a window), through `lab`.
// =============================================================================

import {
  GUIDES,
  correctOption,
  evaluate,
  stepsOn,
  wordCount,
} from './curriculum.js';

export const REPORT_FORMAT = 'gravitas.mission-lab-report';
const STORE = (guide, path) => `gravitas_missionlab_${guide}_${path}`;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat())
    if (c !== null && c !== undefined && c !== false) node.append(c);
  return node;
}

/**
 * @param {object} o
 * @param {Record<string, HTMLElement>} o.els - pick, step, list, name, report
 * @param {(id: string, vars?: object) => string} o.t
 * @param {{state(): object, apply(patch: object): Promise<void>, language(): string, num(v: number): string}} o.lab
 */
export function createGuidePanel({ els, t, lab }) {
  let guide = GUIDES[0];
  let path = 'intro';
  let index = 0;
  let progress = load();
  let feedback = '';

  function load() {
    try {
      return (
        JSON.parse(
          window.localStorage?.getItem(STORE(guide.id, path)) || '{}'
        ) || {}
      );
    } catch {
      return {};
    }
  }
  function save() {
    try {
      window.localStorage?.setItem(
        STORE(guide.id, path),
        JSON.stringify(progress)
      );
    } catch {
      /* progress lasts for this visit only */
    }
  }
  const steps = () => stepsOn(guide, path);
  const words = (s, part, vars) => t(`gd.${guide.id}.${s.id}.${part}`, vars);

  function open(id, p = path) {
    guide = GUIDES.find(g => g.id === id) || GUIDES[0];
    path = p;
    progress = load();
    index = Math.min(progress.at ?? 0, steps().length - 1);
    feedback = '';
    render();
  }

  function record(s, patch) {
    progress[s.id] = { ...(progress[s.id] || {}), ...patch };
    progress.at = index;
    save();
  }

  async function checkStep(s, input) {
    const state = lab.state();
    const r = evaluate(s, state, input);
    record(s, { input: input ?? null, passed: r.passed });
    if (r.passed)
      feedback = words(s, 'ok', {
        value: r.expected === undefined ? '' : lab.num(r.expected),
      });
    else if (s.kind === 'do') feedback = t('ml.guide.notYet');
    else if (s.kind === 'explain')
      feedback = t('ml.guide.tooShort', {
        n: s.minWords,
        have: wordCount(input),
      });
    else if (s.kind === 'answer' && !state.mission?.ok)
      feedback = t('ml.guide.computeFirst');
    else feedback = t('ml.guide.wrong');
    render();
  }

  async function showMe(s) {
    const state = lab.state();
    record(s, { shown: true });
    if (s.kind === 'do') {
      await lab.apply(s.go(state));
      return checkStep(s);
    }
    const r = evaluate(s, lab.state(), null);
    feedback =
      s.kind === 'choose'
        ? t('ml.guide.shown', {
            answer: words(s, `opt.${correctOption(s, lab.state())}`),
          })
        : t('ml.guide.shown', { answer: `${lab.num(r.expected)} ${s.unit}` });
    render();
  }

  function input(s) {
    const saved = progress[s.id]?.input ?? '';
    if (s.kind === 'choose') {
      const set = el(
        'fieldset',
        {},
        el('legend', { text: t('ml.guide.choose') })
      );
      for (const o of s.options) {
        const id = `ml-opt-${s.id}-${o}`;
        const box = el('input', {
          type: 'radio',
          name: `ml-opt-${s.id}`,
          id,
          value: o,
        });
        box.checked = saved === o;
        set.append(
          el(
            'label',
            { class: 'ml-choice', for: id },
            box,
            ` ${words(s, `opt.${o}`)}`
          )
        );
      }
      return {
        node: set,
        value: () => set.querySelector('input:checked')?.value ?? null,
      };
    }
    if (s.kind === 'answer') {
      const id = `ml-ans-${s.id}`;
      const box = el('input', {
        id,
        class: 'ui-input',
        type: 'text',
        inputmode: 'decimal',
        value: saved,
      });
      const f = el(
        'div',
        { class: 'ui-field' },
        el('label', { for: id, text: t('ml.guide.answer', { unit: s.unit }) }),
        box
      );
      return { node: f, value: () => box.value };
    }
    if (s.kind === 'explain') {
      const id = `ml-exp-${s.id}`;
      const box = el('textarea', { id, class: 'ui-textarea', rows: 4 });
      box.value = saved;
      const f = el(
        'div',
        { class: 'ui-field' },
        el('label', {
          for: id,
          text: t('ml.guide.explain', { n: s.minWords }),
        }),
        box
      );
      return { node: f, value: () => box.value };
    }
    return { node: null, value: () => null };
  }

  function render() {
    els.pick.replaceChildren(
      ...GUIDES.map(g => {
        const b = el('button', {
          type: 'button',
          class: 'ui-button',
          text: t(`gd.${g.id}.title`),
        });
        b.setAttribute('aria-pressed', String(g.id === guide.id));
        b.addEventListener('click', () => open(g.id));
        return b;
      })
    );
    for (const r of document.querySelectorAll('input[name="ml-path"]'))
      r.checked = r.value === path;
    const list = steps();
    const s = list[index];
    const box = input(s);
    const buttons = el('div', { class: 'ml-bar' });
    if (s.kind !== 'read') {
      const check = el('button', {
        type: 'button',
        class: 'ui-button is-primary',
        text: t(s.kind === 'do' ? 'ml.guide.checkDo' : 'ml.guide.check'),
      });
      check.addEventListener('click', () => checkStep(s, box.value()));
      buttons.append(check);
      const passed = progress[s.id]?.passed;
      const tried = progress[s.id] && !passed;
      const predicts = s.kind === 'choose' && s.correct === null;
      if ((s.kind === 'do' || tried) && !predicts && s.kind !== 'explain') {
        const show = el('button', {
          type: 'button',
          class: 'ui-button',
          text: t('ml.guide.showMe'),
        });
        show.addEventListener('click', () => showMe(s));
        buttons.append(show);
      }
    }
    const back = el('button', {
      type: 'button',
      class: 'ui-button',
      text: t('ml.guide.back'),
    });
    back.disabled = index === 0;
    back.addEventListener('click', () => move(-1));
    const next = el('button', {
      type: 'button',
      class: 'ui-button',
      text: t('ml.guide.next'),
    });
    next.disabled = index === list.length - 1;
    next.addEventListener('click', () => move(1));
    els.step.replaceChildren(
      el('p', {
        class: 'ml-count',
        text: t('ml.guide.count', { n: index + 1, of: list.length }),
      }),
      el('h3', { text: words(s, 'title') }),
      el('p', { text: words(s, 'body') }),
      // A read step has no input; replaceChildren would write null as text.
      box.node ?? '',
      buttons,
      el('p', {
        class: 'ml-feedback',
        role: 'status',
        'aria-live': 'polite',
        text: feedback,
      }),
      el('div', { class: 'ml-bar' }, back, next)
    );
    els.list.replaceChildren(
      ...list.map((x, i) => {
        const p = progress[x.id];
        const mark = p?.passed
          ? t('ml.guide.passed')
          : p?.shown
            ? t('ml.guide.wasShown')
            : '';
        const b = el('button', {
          type: 'button',
          class: 'ui-link',
          text: `${words(x, 'title')}${mark ? ` (${mark})` : ''}`,
        });
        if (i === index) b.setAttribute('aria-current', 'step');
        b.addEventListener('click', () => {
          index = i;
          feedback = '';
          progress.at = index;
          save();
          render();
        });
        return el('li', {}, b);
      })
    );
  }

  function move(d) {
    index = Math.max(0, Math.min(steps().length - 1, index + d));
    feedback = '';
    progress.at = index;
    save();
    render();
  }

  /** The report: every guide on this path, and the reader's plan and results. */
  function report() {
    const state = lab.state();
    const guides = GUIDES.map(g => {
      let p = {};
      try {
        p =
          JSON.parse(window.localStorage?.getItem(STORE(g.id, path)) || '{}') ||
          {};
      } catch {
        /* nothing kept */
      }
      if (g.id === guide.id) p = progress;
      return {
        guide: g.id,
        path,
        steps: stepsOn(g, path)
          .filter(s => s.kind !== 'read')
          .map(s => ({
            step: s.id,
            kind: s.kind,
            input: p[s.id]?.input ?? null,
            passed: !!p[s.id]?.passed,
            shown: !!p[s.id]?.shown,
          })),
      };
    });
    const m = state.mission?.ok ? state.mission : null;
    return {
      format: REPORT_FORMAT,
      formatVersion: 1,
      notFor: 'operational mission design or navigation',
      language: lab.language(),
      name: els.name.value.trim() || null,
      guides,
      plan: state.plan,
      results: m && {
        departDvKmS: m.patched.departDv,
        captureDvKmS: m.patched.captureDv,
        c3: m.patched.c3,
        vinfArrKmS: m.patched.vinfArr,
        directMissKm: m.direct.missKm,
        correctionDvKmS: m.correction?.dv ?? null,
        totalDvKmS: m.budget.total,
        depotPropellantKg: m.budget.interplanetary.propellantKg,
      },
    };
  }

  els.report.addEventListener('click', () => {
    const blob = new Blob([`${JSON.stringify(report(), null, 2)}\n`], {
      type: 'application/json',
    });
    const a = el('a', {
      href: URL.createObjectURL(blob),
      download: 'gravitas-mission-lab-report.json',
    });
    document.body.append(a);
    a.click();
    a.remove();
  });
  for (const r of document.querySelectorAll('input[name="ml-path"]'))
    r.addEventListener('change', () => r.checked && open(guide.id, r.value));

  return {
    open,
    render,
    report,
    current: () => ({ guide: guide.id, path, step: steps()[index].id }),
  };
}
