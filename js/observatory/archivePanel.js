// =============================================================================
// The observatory's archive import: a star's Gaia epochs, from CDS
// -----------------------------------------------------------------------------
// Loaded only when a reader opens it, so the observatory's own route carries
// none of it. The one live-data path in Gravitas, and the slice
// VO_ARCHIVE_GATE.md accepted, in four steps a reader sees one at a time:
//
//   1. a name, sent to CDS Sesame only when the reader presses Find;
//   2. the Gaia DR3 sources within 2 arcseconds of where Sesame puts it;
//   3. the chosen source's epoch photometry, reviewed before it is used:
//      every field and its unit or "not stated", the rows, the service's
//      status, both checksums, the license and what the conversion will do;
//   4. Open, which hands a gravitas.observation/1 to the workspace.
//
// Nothing is sent before step 1's button. Every failure is named by its code
// (js/archive/net.js, votable.js) in the reader's language. A cached answer
// says how old it is, and a stale one says why it is stale.
// =============================================================================

import { resolveName, gaiaSourcesAt, gaiaEpochs } from '../archive/cds.js';
import { idbStore } from '../archive/cache.js';
import { BANDS, toObservation } from '../archive/gaiaEpochs.js';
import { EN_ARCHIVE } from '../i18n/en.archive.js';
import { ES_ARCHIVE } from '../i18n/es.archive.js';

// Nothing from the page's own modules is imported here - they arrive in
// `ctx`, as they do for the fit panel: a module both this chunk and the page
// reached would leave the page's bundle for a chunk of its own, one more
// request for every visitor whether or not they open this panel.

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

/** The error's message in the reader's language, by its code. */
export function errorMessage(err, t) {
  const d = err?.detail ?? {};
  switch (err?.code) {
    case 'blocked':
      return t('obs.arc.err.blocked');
    case 'timeout':
      return t('obs.arc.err.timeout', { seconds: d.seconds ?? 20 });
    case 'rateLimited':
      return d.retryAfter
        ? t('obs.arc.err.rateLimitedAfter', { after: d.retryAfter })
        : t('obs.arc.err.rateLimited');
    case 'unavailable':
      return t('obs.arc.err.unavailable', { status: d.status ?? '5xx' });
    case 'refused':
      return t('obs.arc.err.refused', { status: d.status ?? '4xx' });
    case 'tooLarge':
      return t('obs.arc.err.tooLarge', { kb: Math.round((d.max ?? 0) / 1000) });
    case 'wrongType':
      return t('obs.arc.err.wrongType');
    case 'offList':
      return t('obs.arc.err.offList', { origin: d.origin ?? '' });
    case 'canceled':
      return t('obs.arc.err.canceled');
    case 'serviceError':
      return t('obs.arc.err.serviceError', { said: d.said ?? '' });
    case 'units':
      return t('obs.arc.err.units', {
        field: d.field,
        stated: d.stated,
        expected: d.expected,
      });
    case 'malformed':
    case 'doctype':
    case 'notVotable':
    case 'tables':
    case 'serialization':
    case 'noFields':
    case 'noData':
    case 'rowWidth':
      return t('obs.arc.err.votable');
    default:
      return t('obs.arc.err.other');
  }
}

/** Days, rounded, for "retrieved N days ago". */
const days = ms => Math.max(0, Math.round(ms / 86_400_000));

/** The link to CDS's own sky view at a position: zero bytes, the reader's choice. */
export function aladinLink({ ra, dec }) {
  const sign = dec < 0 ? '-' : '+';
  const target = `${ra.toFixed(5)} ${sign}${Math.abs(dec).toFixed(5)}`;
  return `https://aladin.cds.unistra.fr/AladinLite/?target=${encodeURIComponent(target)}&fov=0.2`;
}

/**
 * @param {HTMLElement} root - The panel's <details>, whose summary stays
 * @param {{t: Function, number: Function, registerMessages: Function,
 *   createPlot: Function, createSelection: Function,
 *   open: (o: object) => void, status: (text: string) => void,
 *   store?: object, fetchImpl?: Function}} ctx - The page's own pieces; a
 *   test may pass a store and a fetch
 * @returns {{rebuild: () => void, destroy: () => void}} `rebuild` builds the
 *   panel again in the page's new language, keeping what the reader typed
 */
export function mountArchivePanel(root, ctx) {
  let panel = build(root, ctx, '');
  return {
    rebuild() {
      const name = panel.name();
      panel.destroy();
      panel = build(root, ctx, name);
    },
    destroy: () => panel.destroy(),
  };
}

function build(root, ctx, initialName) {
  ctx.registerMessages({ en: EN_ARCHIVE, es: ES_ARCHIVE });
  const { t } = ctx;
  const store = ctx.store ?? idbStore();
  const net = ctx.fetchImpl ? { fetchImpl: ctx.fetchImpl } : {};
  let controller = null;

  const nameIn = el('input', {
    id: 'arcName',
    type: 'text',
    maxlength: 80,
    autocomplete: 'off',
    spellcheck: 'false',
    'aria-describedby': 'arcPrivacy',
  });
  // Rebuilt in a new language, the panel keeps what the reader typed.
  nameIn.value = initialName;
  const find = el('button', {
    id: 'arcFind',
    class: 'ui-button',
    type: 'submit',
  });
  const cancel = el('button', {
    id: 'arcCancel',
    class: 'ui-button',
    type: 'button',
    hidden: true,
  });
  const form = el(
    'form',
    { id: 'arcForm', class: 'ow-grid' },
    el('label', { class: 'ow-field' }, el('span'), nameIn),
    el('div', {}, find, ' ', cancel)
  );
  const privacy = el('p', { id: 'arcPrivacy', class: 'ow-hint' });
  const progress = el('p', {
    id: 'arcProgress',
    class: 'ow-hint',
    role: 'status',
    'aria-live': 'polite',
  });
  const error = el('p', {
    id: 'arcError',
    class: 'ow-problems',
    role: 'alert',
    hidden: true,
  });
  const results = el('div', { id: 'arcResults' });
  // The root is the panel's <details>: its summary stays, the rest is ours.
  const body = el(
    'div',
    { id: 'arcBody' },
    privacy,
    form,
    progress,
    error,
    results
  );
  root.querySelector(':scope > #arcBody')?.remove();
  root.append(body);

  privacy.textContent = t('obs.arc.privacy');
  form.querySelector('span').textContent = t('obs.arc.name');
  find.textContent = t('obs.arc.find');
  cancel.textContent = t('obs.arc.cancel');

  function busy(on, text = '') {
    find.disabled = on;
    nameIn.disabled = on;
    cancel.hidden = !on;
    progress.textContent = text;
    if (!on) controller = null;
  }
  function fail(err) {
    busy(false);
    error.hidden = false;
    error.textContent = errorMessage(err, t);
    error.dataset.code = err?.code ?? 'other';
  }
  cancel.addEventListener('click', () => controller?.abort());
  const cacheNote = c =>
    c.stale
      ? t('obs.arc.cache.stale', {
          days: days(c.ageMs),
          why: errorMessage(c.error, t),
        })
      : t('obs.arc.cache.fresh', { days: days(c.ageMs) });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = nameIn.value.trim();
    if (!name) return;
    error.hidden = true;
    results.replaceChildren();
    controller = new AbortController();
    const signal = controller.signal;
    try {
      busy(true, t('obs.arc.asking.sesame'));
      const pos = await resolveName(name, { ...net, signal, store });
      if (!pos) {
        busy(false);
        results.append(
          el('p', { id: 'arcNotFound', text: t('obs.arc.notFound', { name }) })
        );
        ctx.status(t('obs.arc.notFound', { name }));
        return;
      }
      busy(true, t('obs.arc.asking.vizier'));
      const { sources, cache } = await gaiaSourcesAt(pos, {
        ...net,
        signal,
        store,
      });
      busy(false);
      showSources(pos, sources, [pos.cache, cache]);
    } catch (err) {
      fail(err);
    }
  });

  function showSources(pos, sources, caches) {
    const where = el('p', {
      id: 'arcPosition',
      text: t('obs.arc.position', {
        name: pos.name,
        ra: pos.ra.toFixed(5),
        dec: `${pos.dec < 0 ? '−' : '+'}${Math.abs(pos.dec).toFixed(5)}`,
        type: pos.otype ?? '?',
      }),
    });
    const sky = el('a', {
      href: aladinLink(pos),
      target: '_blank',
      rel: 'noopener noreferrer',
      text: t('obs.arc.sky'),
    });
    results.replaceChildren(where, el('p', {}, sky));
    // Where the position and the sources came from, when not from CDS now.
    const old = caches.filter(c => c?.from === 'cache');
    if (old.length) {
      const c = old.find(x => x.stale) ?? old[0];
      results.append(
        el('p', { class: 'ow-hint', 'data-arc-note': '', text: cacheNote(c) })
      );
    }
    if (!sources.length) {
      results.append(
        el('p', { id: 'arcNoSource', text: t('obs.arc.noSource') })
      );
      ctx.status(t('obs.arc.noSource'));
      return;
    }
    const fieldset = el(
      'fieldset',
      { id: 'arcSources' },
      el('legend', { text: t('obs.arc.sources', { n: sources.length }) })
    );
    const vars = s => ({
      id: s.source,
      g: s.gmag === null ? '?' : ctx.number(s.gmag),
    });
    sources.forEach((s, i) => {
      const id = `arcSource${i}`;
      fieldset.append(
        el(
          'div',
          {},
          el('input', {
            type: 'radio',
            name: 'arcSource',
            id,
            value: s.source,
            checked: i === 0,
          }),
          ' ',
          el('label', {
            for: id,
            // Two literal t() calls, so the catalog audit sees both ids.
            text: s.variable
              ? t('obs.arc.sourceVariable', vars(s))
              : t('obs.arc.source', vars(s)),
          })
        )
      );
    });
    const look = el('button', {
      id: 'arcLook',
      class: 'ui-button',
      type: 'button',
      text: t('obs.arc.look'),
    });
    look.addEventListener('click', () => {
      const chosen = fieldset.querySelector('input:checked')?.value;
      if (chosen) loadEpochs(pos, chosen);
    });
    results.append(fieldset, look);
    ctx.status(t('obs.arc.sources', { n: sources.length }));
  }

  async function loadEpochs(pos, source) {
    error.hidden = true;
    root.querySelector('#arcReview')?.remove();
    controller = new AbortController();
    try {
      busy(true, t('obs.arc.asking.epochs'));
      const { answer, cache } = await gaiaEpochs(source, {
        store,
        ...net,
        signal: controller.signal,
      });
      busy(false);
      review(pos, source, answer, cache);
    } catch (err) {
      fail(err);
    }
  }

  function review(pos, source, answer, cache) {
    const box = el('section', {
      id: 'arcReview',
      'aria-labelledby': 'arcReviewTitle',
    });
    const title = el('h3', {
      id: 'arcReviewTitle',
      tabindex: '-1',
      text: t('obs.arc.review'),
    });
    const { table } = answer;
    const notes = [];
    if (cache.from === 'cache') notes.push(cacheNote(cache));
    if (cache.changed) notes.push(t('obs.arc.cache.changed'));
    if (table.overflow) notes.push(t('obs.arc.overflow'));
    const summary = el('p', {
      id: 'arcSummary',
      text: t('obs.arc.summary', {
        rows: table.rows.length,
        kb: ctx.number(answer.bytes / 1000),
        status: table.status ?? '?',
        when: answer.retrieved.slice(0, 16).replace('T', ' '),
      }),
    });
    const head = el(
      'tr',
      {},
      ...[
        t('obs.arc.col.field'),
        t('obs.arc.col.unit'),
        t('obs.arc.col.ucd'),
        t('obs.arc.col.description'),
      ].map(text => el('th', { scope: 'col', text }))
    );
    const body = el(
      'tbody',
      {},
      ...table.fields.map(f =>
        el(
          'tr',
          {},
          el('th', { scope: 'row' }, el('code', { text: f.name })),
          el('td', { text: f.unit || t('obs.arc.unit.notStated') }),
          el('td', { text: f.ucd ?? '' }),
          el('td', { text: f.description ?? '' })
        )
      )
    );
    const fields = el(
      'div',
      {
        class: 'ow-table-wrap',
        tabindex: '0',
        role: 'region',
        'aria-label': t('obs.arc.fields'),
      },
      el(
        'table',
        { id: 'arcFields' },
        el('caption', { text: t('obs.arc.fields') }),
        el('thead', {}, head),
        body
      )
    );
    const sums = el(
      'dl',
      { class: 'ow-hint', id: 'arcChecksums' },
      el('dt', { text: t('obs.arc.sha.bytes') }),
      el('dd', {}, el('code', { text: answer.sha256 })),
      el('dt', { text: t('obs.arc.sha.content') }),
      el('dd', {}, el('code', { text: answer.contentSha256 }))
    );
    const band = el(
      'select',
      { id: 'arcBand' },
      ...BANDS.map(b => el('option', { value: b, text: b }))
    );
    const bandField = el(
      'label',
      { class: 'ow-field' },
      el('span', { text: t('obs.arc.band') }),
      band
    );
    const preview = el('div', { id: 'arcPreview' });
    const openBtn = el('button', {
      id: 'arcOpen',
      class: 'ui-button',
      type: 'button',
      text: t('obs.arc.open'),
    });
    const license = el('p', { id: 'arcLicense' });
    let current = null;

    function convert() {
      try {
        current = toObservation(answer, {
          source,
          band: band.value,
          object: { name: pos.name, ra: pos.ra, dec: pos.dec },
        });
      } catch (err) {
        current = null;
        openBtn.disabled = true;
        preview.replaceChildren();
        fail(err);
        return;
      }
      error.hidden = true;
      openBtn.disabled = false;
      license.textContent = t('obs.arc.license', {
        credit: current.credit,
        license: current.license.status,
      });
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'ow-plot');
      svg.setAttribute('role', 'img');
      const n = current.columns[0].values.length;
      svg.setAttribute(
        'aria-label',
        t('obs.arc.plotLabel', { n, band: band.value })
      );
      if (n) {
        ctx
          .createPlot(svg, {
            announce: () => {},
            describe: () => '',
            number: ctx.number,
            labels: { notStated: t('obs.arc.unit.notStated') },
          })
          .draw(current, {
            xColumn: 'time',
            yColumn: 'mag',
            selection: ctx.createSelection(n),
          });
      }
      preview.replaceChildren(
        svg,
        el(
          'ol',
          { id: 'arcReductions' },
          ...current.reductions.map(r => el('li', { text: r }))
        )
      );
      openBtn.disabled = n === 0;
    }
    band.addEventListener('change', convert);
    openBtn.addEventListener('click', () => {
      if (current) ctx.open(current);
    });
    box.append(
      title,
      summary,
      ...notes.map(n =>
        el('p', { class: 'ow-hint', 'data-arc-note': '', text: n })
      ),
      fields,
      sums,
      bandField,
      license,
      preview,
      openBtn
    );
    results.append(box);
    convert();
    title.focus();
    ctx.status(t('obs.arc.reviewReady', { rows: table.rows.length }));
  }

  return {
    name: () => nameIn.value,
    destroy() {
      controller?.abort();
      body.remove();
    },
  };
}
