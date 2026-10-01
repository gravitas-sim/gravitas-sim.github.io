// =============================================================================
// Guided investigations in the 3-D lab: the runner
// -----------------------------------------------------------------------------
// Loaded when a reader presses "Guided investigations", or with
// ?guide=<id>[&path=advanced], so the lab carries none of it at start-up. The
// investigations are data (js/lab3d/guides/curriculum.js). This draws one
// step at a time and checks it against the lab, which it drives only
// through the page's labApi (js/lab3dLab.js): open a system, set a control,
// read the choices and the numbers the tables show.
//
//   read     text
//   do       something to do in the lab, with a button that does it, and a
//            check that looks for the result; a record step also keeps the
//            moment the reader chooses, for later answers
//   answer   a number to type, checked against what the lab's state gives
//   choose   an option, checked, or recorded when it is a prediction a
//            later step answers
//
// A reader may move on without passing a step; the progress list says which
// passed. After a wrong answer the right one can be shown, and the step then
// says it was shown rather than found. Progress is kept in this browser,
// per guide and path, and the report is a file: the same answers make the
// same bytes (reportOf below).
// =============================================================================

import {
  CURRICULUM_VERSION,
  GUIDES,
  TARGETS,
  ANSWERS,
  context,
  correctOption,
  evaluateCheck,
  record,
} from '../guides/curriculum.js';
import {
  answerMatches,
  parseAnswer,
  stepsOn,
} from '../../observatory/guides/core.js';
import { EN_LAB3DGUIDES } from '../../i18n/en.lab3dGuides.js';
import { ES_LAB3DGUIDES } from '../../i18n/es.lab3dGuides.js';

export const REPORT_FORMAT = 'gravitas.lab3d-guide-report';
export const REPORT_VERSION = 1;
const CATALOGS = { en: EN_LAB3DGUIDES, es: ES_LAB3DGUIDES };
const STORE = 'gravitas_lab3d_guide_';

/** The report a reader hands in: plain data, in a fixed order, no clock. */
export function reportOf(
  guide,
  path,
  progress,
  { name = '', locale = 'en' } = {}
) {
  const steps = stepsOn(guide, path).map(s => {
    const a = progress.answers[s.id] ?? {};
    const row = { step: s.id, kind: s.kind };
    if (s.kind === 'answer') {
      row.typed = a.typed ?? null;
      row.passed = Boolean(a.passed);
      row.shown = Boolean(a.shown);
      if (a.passed || a.shown) row.expected = a.expected ?? null;
    } else if (s.kind === 'choose') {
      row.choice = a.choice ?? null;
      row.prediction = s.correct === null;
      if (s.correct !== null) row.passed = Boolean(a.passed);
    } else if (s.kind === 'do') {
      row.passed = Boolean(a.passed);
      if (s.record && progress.records[s.id]) {
        const r = progress.records[s.id];
        row.recorded = { system: r.system, t: r.t };
      }
    }
    return row;
  });
  return {
    format: REPORT_FORMAT,
    formatVersion: REPORT_VERSION,
    curriculum: CURRICULUM_VERSION,
    guide: guide.id,
    path,
    locale,
    name,
    steps,
  };
}

const serialize = r =>
  r && {
    ...r,
    m: [...r.m],
    x: [...r.x],
    v: [...r.v],
    alive: [...r.alive],
  };
const revive = r =>
  r && {
    ...r,
    m: Float64Array.from(r.m),
    x: Float64Array.from(r.x),
    v: Float64Array.from(r.v),
    alive: Uint8Array.from(r.alive),
  };

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
 * @param {HTMLElement} root - The page's guide section (#l3-guide)
 * @param {object} lab - The page's labApi
 */
export function createGuidePanel(root, lab) {
  const tr = (id, vars) => {
    const lang = lab.language();
    const entry = CATALOGS[lang]?.[id] ?? CATALOGS.en[id];
    if (entry === undefined) return id;
    return vars
      ? entry.replace(/\{(\w+)\}/g, (w, n) =>
          Object.hasOwn(vars, n) ? String(vars[n]) : w
        )
      : entry;
  };
  const words = (g, s, part) => tr(`gd.${g.id}.${s.id}.${part}`);

  lab.addSystems(
    Object.entries(TARGETS)
      .filter(([, t]) => t.make)
      .map(([id, t]) => ({
        id,
        make: t.make,
        label: () => tr(`gd.target.${id}`),
      }))
  );

  let guide = null;
  let path = 'intro';
  let steps = [];
  let at = 0;
  let progress = null;

  const key = () => `${STORE}${guide.id}_${path}`;
  const load = () => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(key()) || 'null');
      if (saved && saved.curriculum === CURRICULUM_VERSION) {
        const records = {};
        for (const [k, r] of Object.entries(saved.records || {}))
          records[k] = revive(r);
        return { answers: saved.answers || {}, records, at: saved.at || 0 };
      }
    } catch {
      /* storage unavailable or damaged: start afresh */
    }
    return { answers: {}, records: {}, at: 0 };
  };
  const save = () => {
    try {
      const records = {};
      for (const [k, r] of Object.entries(progress.records))
        records[k] = serialize(r);
      window.localStorage.setItem(
        key(),
        JSON.stringify({
          curriculum: CURRICULUM_VERSION,
          answers: progress.answers,
          records,
          at,
        })
      );
    } catch {
      /* progress will not survive a reload; the guide still works */
    }
  };
  const ctx = () => context(lab, progress.records);
  const answerOf = s => progress.answers[s.id] ?? (progress.answers[s.id] = {});

  // --- The chooser --------------------------------------------------------------

  function chooser() {
    guide = null;
    root.hidden = false;
    root.replaceChildren(
      el(
        'div',
        {},
        el('h2', { id: 'l3-guide-h', tabindex: '-1', text: tr('g3.heading') }),
        el('p', { text: tr('g3.intro') }),
        el(
          'ul',
          {},
          GUIDES.map(g =>
            el(
              'li',
              {},
              el('h3', { text: tr(`gd.${g.id}.title`) }),
              el('p', { text: tr(`gd.${g.id}.summary`) }),
              el('p', {
                class: 'l3-step-state',
                text: tr('g3.meta', {
                  intro: g.minutes.intro,
                  advanced: g.minutes.advanced,
                }),
              }),
              el('button', {
                type: 'button',
                class: 'ui-button',
                'data-guide': g.id,
                'data-path': 'intro',
                text: tr('g3.startIntro'),
              }),
              ' ',
              el('button', {
                type: 'button',
                class: 'ui-button',
                'data-guide': g.id,
                'data-path': 'advanced',
                text: tr('g3.startAdvanced'),
              })
            )
          )
        )
      )
    );
    root.querySelector('h2').focus();
  }

  root.addEventListener('click', e => {
    const b = e.target.closest('button[data-guide]');
    if (b) begin(b.dataset.guide, b.dataset.path);
  });

  // --- A guide ----------------------------------------------------------------------

  async function begin(id, p) {
    guide = GUIDES.find(g => g.id === id);
    if (!guide) return chooser();
    path = p === 'advanced' ? 'advanced' : 'intro';
    steps = stepsOn(guide, path);
    progress = load();
    at = Math.min(progress.at, steps.length - 1);
    const url = new URL(location.href);
    url.searchParams.set('guide', guide.id);
    url.searchParams.set('path', path);
    url.searchParams.delete('system');
    history.replaceState(null, '', url);
    // The system the current step works on, or the guide's first.
    const opener =
      steps
        .slice(0, at + 1)
        .reverse()
        .find(s => s.go?.open) ?? steps.find(s => s.go?.open);
    if (opener) await lab.open(opener.go.open, TARGETS[opener.go.open]);
    draw(true);
  }

  /** Set the lab's controls a step names, with bodies by id. */
  function apply(set = {}) {
    const ids = lab.read().ids;
    const index = v => String(ids.indexOf(v));
    for (const [name, value] of Object.entries(set)) {
      let v = value;
      if (['a', 'b', 'v', 'follow'].includes(name)) v = index(value);
      if (name === 'frame' && value.startsWith('body:'))
        v = `body:${index(value.slice(5))}`;
      // The instrument first, so its body selectors exist when they are set.
      lab.set(name, v);
    }
  }

  async function go(s) {
    if (s.go?.open && lab.read().system !== s.go.open)
      await lab.open(s.go.open);
    const set = { ...(s.go?.set || {}) };
    if (set.tool) {
      apply({ tool: set.tool });
      delete set.tool;
    }
    apply(set);
    if (s.go?.play) lab.play(true);
    draw();
  }

  const status = s => {
    const a = progress.answers[s.id];
    if (!a) return 'open';
    if (a.shown) return 'shown';
    if (a.passed) return 'passed';
    if (a.choice && s.kind === 'choose' && s.correct === null)
      return 'recorded';
    return 'tried';
  };

  function draw(focus = false) {
    if (!guide) return;
    const s = steps[at];
    root.hidden = false;
    const list = el(
      'ol',
      { 'aria-label': tr('g3.progress') },
      steps.map((q, n) =>
        el(
          'li',
          {
            'data-status': status(q),
            'aria-current': n === at ? 'step' : null,
          },
          el('button', {
            type: 'button',
            class: 'l3-steplink',
            'data-at': String(n),
            text: `${words(guide, q, 'title')} (${tr(`g3.status.${status(q)}`)})`,
          })
        )
      )
    );
    const body = el(
      'div',
      {},
      el('p', {
        class: 'l3-step-state',
        text: tr('g3.where', {
          guide: tr(`gd.${guide.id}.title`),
          n: at + 1,
          of: steps.length,
          path: tr(`g3.path.${path}`),
        }),
      }),
      el('h2', {
        id: 'l3-guide-h',
        tabindex: '-1',
        text: words(guide, s, 'title'),
      }),
      el('p', { text: words(guide, s, 'text') }),
      stepControls(s),
      el('p', {
        class: 'l3-step-state',
        id: 'l3-guide-say',
        role: 'status',
        'aria-live': 'polite',
      }),
      el(
        'p',
        {},
        el('button', {
          type: 'button',
          class: 'ui-button',
          id: 'l3-guide-back',
          disabled: at === 0 ? true : null,
          text: tr('g3.back'),
        }),
        ' ',
        at < steps.length - 1
          ? el('button', {
              type: 'button',
              class: 'ui-button is-primary',
              id: 'l3-guide-next',
              text: tr('g3.next'),
            })
          : el('button', {
              type: 'button',
              class: 'ui-button is-primary',
              id: 'l3-guide-finish',
              text: tr('g3.finish'),
            }),
        ' ',
        el('button', {
          type: 'button',
          class: 'ui-button',
          id: 'l3-guide-list',
          text: tr('g3.all'),
        })
      )
    );
    // The steps, folded away: beside the view the panel has room for one step.
    const done = steps.filter(q =>
      ['passed', 'shown', 'recorded'].includes(status(q))
    ).length;
    root.replaceChildren(
      body,
      el(
        'nav',
        { 'aria-label': tr('g3.progress') },
        el(
          'details',
          {},
          el('summary', {
            text: tr('g3.stepsDone', { done, of: steps.length }),
          }),
          list
        )
      )
    );
    wire(s);
    refresh();
    if (focus) root.querySelector('h2').focus();
  }

  function stepControls(s) {
    if (s.kind === 'do')
      return el(
        'p',
        {},
        s.go
          ? el('button', {
              type: 'button',
              class: 'ui-button',
              id: 'l3-guide-do',
              text: tr('g3.do'),
            })
          : null,
        s.record ? ' ' : null,
        s.record
          ? el('button', {
              type: 'button',
              class: 'ui-button',
              id: 'l3-guide-keep',
              text: tr('g3.keep'),
            })
          : null
      );
    if (s.kind === 'answer') {
      const a = progress.answers[s.id] ?? {};
      return el(
        'p',
        {},
        el('label', {
          for: 'l3-guide-input',
          text: tr(`g3.unit.${s.expect.unit}`),
        }),
        ' ',
        el('input', {
          id: 'l3-guide-input',
          class: 'ui-input is-inline',
          type: 'text',
          inputmode: 'decimal',
          autocomplete: 'off',
          value: a.typed ?? '',
        }),
        ' ',
        el('button', {
          type: 'button',
          class: 'ui-button',
          id: 'l3-guide-check',
          text: tr('g3.check'),
        }),
        ' ',
        el('button', {
          type: 'button',
          class: 'ui-button',
          id: 'l3-guide-reveal',
          hidden: !(a.typed && !a.passed) ? true : null,
          text: tr('g3.reveal'),
        })
      );
    }
    if (s.kind === 'choose') {
      const a = progress.answers[s.id] ?? {};
      return el(
        'fieldset',
        {},
        el('legend', {
          text: tr(s.correct === null ? 'g3.predict' : 'g3.choose'),
        }),
        s.options.map(o =>
          el(
            'label',
            { class: 'l3-check' },
            el('input', {
              type: 'radio',
              name: 'l3-guide-choice',
              value: o,
              checked: a.choice === o ? true : null,
            }),
            ' ',
            words(guide, s, `opt.${o}`)
          )
        ),
        el('button', {
          type: 'button',
          class: 'ui-button',
          id: 'l3-guide-choose',
          text: tr(s.correct === null ? 'g3.record' : 'g3.check'),
        })
      );
    }
    return null;
  }

  const say = text => {
    const out = root.querySelector('#l3-guide-say');
    if (out && out.textContent !== text) out.textContent = text;
  };

  function wire(s) {
    const $ = id => root.querySelector(`#${id}`);
    $('l3-guide-back')?.addEventListener('click', () => move(at - 1));
    $('l3-guide-next')?.addEventListener('click', () => move(at + 1));
    $('l3-guide-list')?.addEventListener('click', chooser);
    $('l3-guide-finish')?.addEventListener('click', report);
    for (const b of root.querySelectorAll('button[data-at]'))
      b.addEventListener('click', () => move(Number(b.dataset.at)));
    $('l3-guide-do')?.addEventListener('click', () => go(s));
    $('l3-guide-keep')?.addEventListener('click', () => {
      progress.records[s.id] = record(lab);
      save();
      refresh(true);
    });
    $('l3-guide-check')?.addEventListener('click', () => checkAnswer(s));
    $('l3-guide-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') checkAnswer(s);
    });
    $('l3-guide-reveal')?.addEventListener('click', () => {
      const expected = ANSWERS[s.expect.answer](ctx());
      if (expected === null) return say(tr('g3.missing'));
      Object.assign(answerOf(s), { shown: true, expected });
      save();
      say(tr('g3.revealed', { value: formatted(expected) }));
    });
    $('l3-guide-choose')?.addEventListener('click', () => {
      const picked = root.querySelector(
        'input[name="l3-guide-choice"]:checked'
      )?.value;
      if (!picked) return say(tr('g3.pick'));
      const a = answerOf(s);
      a.choice = picked;
      if (s.correct === null) {
        save();
        return say(tr('g3.recorded'));
      }
      const right = correctOption(s, ctx());
      if (right === null) return say(tr('g3.missing'));
      a.passed = picked === right;
      save();
      say(words(guide, s, a.passed ? 'ok' : 'no'));
    });
  }

  const formatted = v => {
    const r =
      Math.abs(v) >= 1e-3 || v === 0
        ? Number(v.toPrecision(4))
        : Number(v.toPrecision(3));
    return lab.language() === 'es' ? String(r).replace('.', ',') : String(r);
  };

  function checkAnswer(s) {
    const input = root.querySelector('#l3-guide-input');
    const typed = input.value;
    const value = parseAnswer(typed);
    const a = answerOf(s);
    a.typed = typed;
    if (value === null) {
      save();
      return say(tr('g3.notNumber'));
    }
    const expected = ANSWERS[s.expect.answer](ctx());
    if (expected === null) {
      save();
      return say(tr('g3.missing'));
    }
    a.passed = answerMatches(value, expected, s.expect.tolerance);
    if (a.passed) a.expected = expected;
    save();
    say(words(guide, s, a.passed ? 'ok' : 'no'));
    root.querySelector('#l3-guide-reveal').hidden = a.passed;
  }

  /** Re-check a do step against the lab; the page calls this as it changes. */
  function refresh(announce = false) {
    if (!guide) return;
    const s = steps[at];
    if (s.kind !== 'do') return;
    const was = Boolean(progress.answers[s.id]?.passed);
    const ok = evaluateCheck(s.check, ctx(), s);
    if (ok && !was) {
      answerOf(s).passed = true;
      save();
      // The progress list says so too.
      const item = root.querySelector(`button[data-at="${at}"]`);
      if (item) {
        item.textContent = `${words(guide, s, 'title')} (${tr('g3.status.passed')})`;
        item.parentElement.dataset.status = 'passed';
      }
    }
    if (ok) say(words(guide, s, 'ok'));
    else if (announce || !was)
      say(
        tr(
          s.record && !progress.records[s.id] ? 'g3.keepWaiting' : 'g3.waiting'
        )
      );
  }
  lab.onChange(() => refresh());

  function move(n) {
    at = Math.max(0, Math.min(steps.length - 1, n));
    save();
    draw(true);
  }

  function report() {
    const name = root.querySelector('#l3-guide-name')?.value ?? '';
    const data = reportOf(guide, path, progress, {
      name,
      locale: lab.language(),
    });
    const passed = data.steps.filter(r => r.passed).length;
    const graded = data.steps.filter(
      r => r.kind !== 'read' && !r.prediction
    ).length;
    root.replaceChildren(
      el(
        'div',
        {},
        el('h2', { id: 'l3-guide-h', tabindex: '-1', text: tr('g3.report') }),
        el('p', { text: tr('g3.reportSummary', { passed, graded }) }),
        el(
          'p',
          {},
          el('label', { for: 'l3-guide-name', text: tr('g3.name') }),
          ' ',
          el('input', {
            id: 'l3-guide-name',
            class: 'ui-input is-inline',
            type: 'text',
            autocomplete: 'name',
            value: name,
          })
        ),
        el(
          'ol',
          {},
          data.steps
            .filter(r => r.kind !== 'read')
            .map(r => {
              const s = steps.find(q => q.id === r.step);
              const what =
                r.kind === 'answer'
                  ? (r.typed ?? '—')
                  : r.kind === 'choose'
                    ? r.choice
                      ? words(guide, s, `opt.${r.choice}`)
                      : '—'
                    : '';
              const state = r.prediction
                ? tr('g3.status.recorded')
                : r.shown
                  ? tr('g3.status.shown')
                  : r.passed
                    ? tr('g3.status.passed')
                    : tr('g3.status.open');
              return el('li', {
                text: `${words(guide, s, 'title')}: ${what}${what ? ' — ' : ''}${state}`,
              });
            })
        ),
        el(
          'p',
          {},
          el('button', {
            type: 'button',
            class: 'ui-button is-primary',
            id: 'l3-guide-save',
            text: tr('g3.save'),
          }),
          ' ',
          el('button', {
            type: 'button',
            class: 'ui-button',
            id: 'l3-guide-back',
            text: tr('g3.back'),
          }),
          ' ',
          el('button', {
            type: 'button',
            class: 'ui-button',
            id: 'l3-guide-list',
            text: tr('g3.all'),
          })
        )
      )
    );
    root.querySelector('h2').focus();
    root
      .querySelector('#l3-guide-back')
      .addEventListener('click', () => draw(true));
    root.querySelector('#l3-guide-list').addEventListener('click', chooser);
    root.querySelector('#l3-guide-save').addEventListener('click', () => {
      const final = reportOf(guide, path, progress, {
        name: root.querySelector('#l3-guide-name').value.trim().slice(0, 120),
        locale: lab.language(),
      });
      const blob = new Blob([JSON.stringify(final, null, 2) + '\n'], {
        type: 'application/json',
      });
      const a = el('a', {
        href: URL.createObjectURL(blob),
        download: `${guide.id}-${path}.report.json`,
      });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  }

  return {
    async show({ id, path: p } = {}) {
      if (id) await begin(id, p);
      else chooser();
    },
  };
}
