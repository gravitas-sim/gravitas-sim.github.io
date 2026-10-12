// =============================================================================
// Evidence and My work in the mission lab: the panel
// -----------------------------------------------------------------------------
// Loaded when a reader presses "Evidence and My work", so the lab carries none
// of it at start-up (js/missionLabPage.js). Four things, each built on a module
// that has no DOM and is tested alone:
//
//   Keep a result    the timeline of events, the maneuvers, the delta-v
//                    budget, or the patched conic against the propagated
//                    flight becomes an envelope (../evidence.js) and an entry
//                    in the evidence notebook, where the report cites it and
//                    My work lists it
//   The comparison   the patched-conic design drawn over the spacecraft flown
//                    directly, each as its distance from Mars by day, with the
//                    residual between them under it, and the numbers in a table
//   Save the mission the plan file the lab writes, to My work
//                    (js/myWork/made.js), which the lab opens again
//   A link           the plan in a link (../link.js), which opens the lab on
//                    it and from which the figure builder makes a figure
//
// It reaches the lab only through the page's labApi (js/missionLabPage.js): the
// plan, the mission the Worker returned, the plan file, the language and the
// lab's own words. It never solves anything.
// =============================================================================

import { EN_MISSIONEVIDENCE } from '../../i18n/en.missionEvidence.js';
import { KINDS, missionEnvelope, overlaySeries } from '../evidence.js';
import { planFragment } from '../link.js';
import { artifactEntry } from '../../notebook/artifactEntry.js';
import { SOURCE } from '../../notebook/entry.js';
import {
  load as loadNotebook,
  save as saveNotebook,
} from '../../notebook/store.js';
import {
  MADE_FORMAT,
  MADE_VERSION,
  buildOf,
  newId,
  saveMade,
} from '../../myWork/made.js';

const CATALOGS = { en: EN_MISSIONEVIDENCE, es: {} };
const loadSpanish = async () => {
  if (!Object.keys(CATALOGS.es).length)
    CATALOGS.es = (
      await import('../../i18n/es.missionEvidence.js')
    ).ES_MISSIONEVIDENCE;
};

const SVG = 'http://www.w3.org/2000/svg';
const COLORS = { patched: '#f5d76e', direct: '#9be38a', residual: '#ff7a59' };
/** The charts' floors, km: a smaller value is drawn at the bottom edge. */
const FLOOR_KM = 0.1;
const FLOOR_DISTANCE_KM = 1;
const EVERY = 5;

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c) node.append(c);
  return node;
};
const svg = (tag, attrs = {}, text) => {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (text !== undefined) node.textContent = text;
  return node;
};

/**
 * @param {HTMLElement} root - The section the panel fills
 * @param {object} lab - The page's labApi (js/missionLabPage.js)
 * @returns {{show: Function, hide: Function, loadLanguage: Function,
 *   redraw: Function}}
 */
export function createEvidencePanel(root, lab) {
  const t = (id, vars) => {
    const entry = CATALOGS[lab.language()]?.[id] ?? CATALOGS.en[id];
    if (entry === undefined) return id;
    return vars
      ? entry.replace(/\{(\w+)\}/g, (w, n) =>
          Object.hasOwn(vars, n) ? String(vars[n]) : w
        )
      : entry;
  };
  const num = (v, sig = 5) =>
    Number.isFinite(v)
      ? new Intl.NumberFormat(lab.language(), {
          maximumSignificantDigits: sig,
        }).format(v)
      : '-';
  const km = v => t('mle.unit.km', { v: num(v, 5) });
  const ready = () => lab.mission()?.ok === true;

  // What the reader has typed or been told survives a redraw.
  const memory = {
    kind: KINDS[0],
    name: '',
    keep: '',
    save: '',
    link: '',
  };
  let drawn = false;

  /** What a quantity is called, in the reader's language. */
  function quantityLabel(q) {
    const own = `mle.q.${q.id}`;
    if (t(own) !== own) return t(own);
    const m = /^(event|burn)\.(\w+?)(?:\.(jd|dv|propellant|massBefore))?$/.exec(
      q.id
    );
    if (m) {
      const name = lab.t(`ml.event.${m[2]}`);
      return t(m[1] === 'event' ? 'mle.q.event' : `mle.q.burn.${m[3]}`, {
        name,
      });
    }
    return q.id;
  }
  const title = kind =>
    t(`mle.title.${kind}`, { date: lab.mission().plan.depart.date });

  // --- Keeping a result ------------------------------------------------------------
  function keep(kind) {
    const result = lab.mission();
    const envelope = missionEnvelope(kind, result);
    if (!envelope) return t('mle.keep.none');
    try {
      const entry = artifactEntry({
        source: SOURCE.MISSION_LAB,
        envelope,
        title: title(kind),
        labels: {
          quantity: quantityLabel,
          note: q => (q.origin === 'assumed' ? t('mle.note.assumed') : ''),
        },
        context: { page: 'mission' },
      });
      const loaded = loadNotebook();
      if (!loaded.ok) throw new Error(t('mle.keep.whyUnavailable'));
      const saved = saveNotebook([...loaded.entries, entry]);
      if (!saved.ok)
        throw new Error(
          saved.reason === 'unavailable'
            ? t('mle.keep.whyUnavailable')
            : t('mle.keep.whyFull')
        );
      return t('mle.keep.kept');
    } catch (err) {
      return t('mle.keep.failed', { why: err.message });
    }
  }

  // --- The comparison --------------------------------------------------------------

  /**
   * Both charts, from the overlay series: each flight's distance from Mars
   * above, the residual below, both logarithmic (the distances span eight
   * decades) with a floor under which a value is drawn at the bottom edge.
   */
  function chart(rows, tof) {
    const W = 640;
    const H = 420;
    const L = 92;
    const R = 12;
    const top = { y0: 24, y1: 170, floor: FLOOR_DISTANCE_KM };
    const bot = { y0: 236, y1: 372, floor: FLOOR_KM };
    const xOf = d => L + (d / tof) * (W - L - R);
    const decades = (box, values) => {
      box.lo = Math.log10(box.floor);
      box.hi = Math.max(
        box.lo + 1,
        Math.ceil(Math.log10(Math.max(...values, box.floor)))
      );
    };
    decades(
      top,
      rows.flatMap(r => [r.patched, r.direct])
    );
    decades(
      bot,
      rows.map(r => r.residual)
    );
    const yOf = (box, v) =>
      box.y1 -
      ((Math.log10(Math.max(v, box.floor)) - box.lo) / (box.hi - box.lo)) *
        (box.y1 - box.y0);
    const s = svg('svg', {
      viewBox: `0 0 ${W} ${H}`,
      role: 'img',
      'aria-label': alt(rows, tof),
    });
    const line = (pts, color, dash) =>
      svg('polyline', {
        points: pts.map(p => p.map(x => x.toFixed(1)).join(',')).join(' '),
        fill: 'none',
        stroke: color,
        'stroke-width': 1.8,
        ...(dash ? { 'stroke-dasharray': '5 3' } : {}),
      });
    const text = (x, y, anchor, size, value) =>
      svg(
        'text',
        {
          x,
          y,
          'text-anchor': anchor,
          fill: 'currentColor',
          'font-size': size,
        },
        value
      );
    const axes = (box, label) => {
      s.append(
        svg('line', {
          x1: L,
          x2: W - R,
          y1: box.y1,
          y2: box.y1,
          stroke: 'currentColor',
        }),
        svg('line', {
          x1: L,
          x2: L,
          y1: box.y0,
          y2: box.y1,
          stroke: 'currentColor',
        }),
        text(L, box.y0 - 8, 'start', 12, label)
      );
      for (let e = Math.ceil(box.lo); e <= box.hi; e++)
        s.append(
          text(L - 6, yOf(box, 10 ** e) + 4, 'end', 11, num(10 ** e, 3))
        );
      for (let i = 0; i <= 4; i++) {
        const day = (tof * i) / 4;
        s.append(
          svg('line', {
            x1: xOf(day),
            x2: xOf(day),
            y1: box.y1,
            y2: box.y1 + 4,
            stroke: 'currentColor',
          })
        );
        if (box === bot)
          s.append(text(xOf(day), box.y1 + 18, 'middle', 11, num(day, 3)));
      }
    };
    axes(top, t('mle.cmp.distance'));
    axes(bot, t('mle.cmp.residual'));
    s.append(
      text((L + W - R) / 2, H - 6, 'middle', 12, t('mle.cmp.days')),
      line(
        rows.map(r => [xOf(r.day), yOf(top, r.patched)]),
        COLORS.patched
      ),
      line(
        rows.map(r => [xOf(r.day), yOf(top, r.direct)]),
        COLORS.direct,
        true
      ),
      line(
        rows.map(r => [xOf(r.day), yOf(bot, r.residual)]),
        COLORS.residual
      )
    );
    return s;
  }

  function alt(rows, tof) {
    const last = rows[rows.length - 1];
    const peak = rows.reduce((a, b) => (b.residual > a.residual ? b : a));
    return t('mle.cmp.alt', {
      tof: num(tof, 4),
      pEnd: km(last.patched),
      dEnd: km(last.direct),
      first: km(rows[0].residual),
      max: km(peak.residual),
      day: num(peak.day, 4),
      last: km(last.residual),
    });
  }

  function comparison() {
    const box = el('div', { class: 'mle-compare' });
    const rows = ready() ? overlaySeries(lab.mission()) : [];
    if (!rows.length) {
      box.append(el('p', { text: t('mle.cmp.none') }));
      return box;
    }
    const plan = lab.mission().plan;
    const tof = plan.depart.tofDays;
    const legend = el(
      'div',
      { class: 'ui-legend' },
      ...['patched', 'direct'].map(id =>
        el(
          'span',
          {},
          el('span', {
            class: 'ui-swatch',
            style: `background:${COLORS[id]}`,
          }),
          ` ${lab.t(`ml.views.${id}`)}`
        )
      ),
      el(
        'span',
        {},
        el('span', {
          class: 'ui-swatch',
          style: `background:${COLORS.residual}`,
        }),
        ` ${t('mle.cmp.col.residual')}`
      )
    );
    const picked = rows.filter(
      (_, i) => i % EVERY === 0 || i === rows.length - 1
    );
    box.append(
      el('figure', {}, chart(rows, tof)),
      legend,
      el('p', {
        class: 'ui-hint',
        text: plan.correct
          ? t('mle.cmp.corrected', { day: num(plan.correct.day, 4) })
          : t('mle.cmp.uncorrected'),
      }),
      el(
        'div',
        { class: 'ui-table-wrap', tabindex: '0', role: 'region' },
        el(
          'table',
          { class: 'ui-table' },
          el('caption', {
            text: t('mle.cmp.table', { n: num((tof * EVERY) / 60, 3) }),
          }),
          el(
            'thead',
            {},
            el(
              'tr',
              {},
              ['day', 'patched', 'direct', 'residual'].map(c =>
                el('th', { scope: 'col', text: t(`mle.cmp.col.${c}`) })
              )
            )
          ),
          el(
            'tbody',
            {},
            picked.map(r =>
              el(
                'tr',
                {},
                el('th', { scope: 'row', text: num(r.day, 4) }),
                el('td', { text: km(r.patched) }),
                el('td', { text: km(r.direct) }),
                el('td', { text: km(r.residual) })
              )
            )
          )
        )
      )
    );
    return box;
  }

  // --- Layout ----------------------------------------------------------------------
  const field = (label, control) =>
    el(
      'div',
      { class: 'ui-field' },
      el('label', { for: control.id, text: label }),
      control
    );

  function build() {
    const kindSelect = el(
      'select',
      { class: 'ui-select', id: 'mle-kind' },
      KINDS.map(k => el('option', { value: k, text: t(`mle.kind.${k}`) }))
    );
    kindSelect.value = memory.kind;
    kindSelect.addEventListener(
      'change',
      () => (memory.kind = kindSelect.value)
    );
    const keepStatus = el('p', {
      class: 'ui-hint',
      role: 'status',
      id: 'mle-keep-status',
      text: memory.keep,
    });
    const keepButton = el('button', {
      type: 'button',
      class: 'ui-button',
      id: 'mle-keep',
      text: t('mle.keep.button'),
    });
    keepButton.disabled = !ready();
    keepButton.addEventListener('click', () => {
      memory.keep = keep(memory.kind);
      keepStatus.textContent = memory.keep;
    });

    const nameInput = el('input', {
      class: 'ui-input',
      id: 'mle-name',
      type: 'text',
      maxlength: '120',
      placeholder: t('mle.save.defaultName'),
    });
    nameInput.value = memory.name;
    nameInput.addEventListener('input', () => (memory.name = nameInput.value));
    const saveStatus = el('p', {
      class: 'ui-hint',
      role: 'status',
      id: 'mle-save-status',
      text: memory.save,
    });
    const saveButton = el('button', {
      type: 'button',
      class: 'ui-button',
      id: 'mle-save',
      text: t('mle.save.button'),
    });
    saveButton.disabled = !ready();
    saveButton.addEventListener('click', () => {
      const file = lab.planFile();
      if (!file) {
        memory.save = t('mle.save.none');
      } else {
        const out = saveMade({
          format: MADE_FORMAT,
          formatVersion: MADE_VERSION,
          id: newId(),
          kind: 'mission',
          from: 'mission-lab',
          name: (memory.name.trim() || t('mle.save.defaultName')).slice(0, 120),
          savedAt: new Date().toISOString(),
          app: buildOf(),
          attachedTo: [],
          mission: { file },
        });
        memory.save = out.ok
          ? t('mle.save.saved')
          : t('mle.save.failed', { why: out.reason });
      }
      saveStatus.textContent = memory.save;
    });

    const fragment = ready() ? planFragment(lab.plan()) : null;
    const linkInput = el('input', {
      class: 'ui-input',
      id: 'mle-link',
      type: 'text',
      readonly: true,
    });
    linkInput.value = fragment
      ? `${location.origin}/mission/lab/#${fragment}`
      : '';
    const linkStatus = el('p', {
      class: 'ui-hint',
      role: 'status',
      id: 'mle-link-status',
      text: ready() && !fragment ? t('mle.link.none') : memory.link,
    });
    const copyButton = el('button', {
      type: 'button',
      class: 'ui-button',
      id: 'mle-copy',
      text: t('mle.link.copy'),
    });
    copyButton.disabled = !fragment;
    copyButton.addEventListener('click', async () => {
      linkInput.select();
      try {
        await navigator.clipboard.writeText(linkInput.value);
        memory.link = t('mle.link.copied');
      } catch {
        memory.link = t('mle.link.manual');
      }
      linkStatus.textContent = memory.link;
    });

    const closeButton = el('button', {
      type: 'button',
      class: 'ui-button is-small',
      id: 'mle-close',
      text: t('mle.close'),
    });
    closeButton.addEventListener('click', hide);

    root.replaceChildren(
      el('h2', { id: 'mle-h', text: t('mle.heading'), tabindex: '-1' }),
      el('p', { text: t('mle.intro') }),
      el('h3', { text: t('mle.keep.heading') }),
      field(t('mle.keep.kind'), kindSelect),
      keepButton,
      keepStatus,
      ...(ready()
        ? []
        : [el('p', { class: 'ui-hint', text: t('mle.keep.none') })]),
      el('h3', { text: t('mle.cmp.heading') }),
      el('p', { text: t('mle.cmp.intro') }),
      comparison(),
      el('h3', { text: t('mle.save.heading') }),
      el('p', { text: t('mle.save.hint') }),
      field(t('mle.save.name'), nameInput),
      el(
        'div',
        { class: 'ui-toolbar' },
        saveButton,
        el('a', {
          class: 'ui-button',
          href: '/my-work/',
          text: t('mle.save.open'),
        })
      ),
      saveStatus,
      el('h3', { text: t('mle.link.heading') }),
      el('p', { text: t('mle.link.hint') }),
      field(t('mle.link.label'), linkInput),
      copyButton,
      linkStatus,
      closeButton
    );
  }

  let watching = false;
  function show() {
    root.hidden = false;
    build();
    drawn = true;
    // A result arrives when the lab computes: the panel looks again.
    if (!watching) {
      watching = true;
      lab.onChange(() => {
        if (!root.hidden) build();
      });
    }
    root.querySelector('#mle-h')?.focus();
  }
  function hide() {
    root.hidden = true;
    document.getElementById('ml-evidence')?.focus();
  }
  return {
    show,
    hide,
    /** The catalog of a language, before the page switches to it. */
    async loadLanguage(lang) {
      if (lang === 'es') await loadSpanish();
    },
    /** The page switched, or a result arrived: the words and numbers are redrawn. */
    redraw() {
      if (drawn && !root.hidden) build();
    },
  };
}
