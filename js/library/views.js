// =============================================================================
// The Library's topic page and item page
// -----------------------------------------------------------------------------
// Roadmap III Prompt 163. Both live in the Library's route (?topic=<subject>,
// ?item=<id>), not at addresses of their own, so the Library gains no
// destination. Loaded when one is asked for. No DOM here: each function returns
// markup and the words for the breadcrumb, and js/libraryPage.js puts them in
// place.
//
// The topic page lists, for one subject, its sequences, its courses, its
// investigations by level, its datasets and its scenarios, under the subject's
// own paragraph. The item page shows one entry's relations (what comes before,
// what comes next, what goes with it, its instructor page), the pathways it is
// in, and, when nothing comes after it, why.
// =============================================================================

const escape = s =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const LEVELS = ['beginner', 'intro'];

/** How long, in words, or ''. */
const time = (d, t) =>
  !d
    ? ''
    : d.min === d.max
      ? t('lib.card.minutes', { n: d.max })
      : t('lib.card.range', { min: d.min, max: d.max });

/**
 * One entry as a row: a link that runs it, its time, and a link to its page.
 * @param {object} entry - A library entry
 * @param {object} c - {t, pick, shown, path} (path: 'seq:id' for the item page)
 * @returns {string} One <li>
 */
export function rowHtml(entry, c) {
  const kind = c.shown?.[entry.kind] ?? entry.kind;
  const path = c.path ? `&amp;path=${escape(c.path)}` : '';
  return `<li class="lib-row" data-entry="${escape(entry.id)}" data-kind="${escape(entry.kind)}"><a class="lib-link" href="${escape(entry.route)}">${escape(c.pick(entry.title))}</a> <span class="lib-row-meta">${escape(c.t(`lib.badge.${kind}`))}${time(entry.duration, c.t) ? ` · ${escape(time(entry.duration, c.t))}` : ''}</span> <a class="lib-details" href="?item=${escape(entry.id)}${path}">${escape(c.t('lib.card.details'))}</a></li>`;
}

const list = (rows, c, ordered = false) =>
  `<${ordered ? 'ol' : 'ul'} class="lib-rows">${rows.map(e => rowHtml(e, c)).join('')}</${ordered ? 'ol' : 'ul'}>`;

const section = (title, body) =>
  body
    ? `<section class="lib-group"><h3>${escape(title)}</h3>${body}</section>`
    : '';

/**
 * The topic page of one subject.
 * @param {object} lib - The library document
 * @param {string} id - The subject id
 * @param {object} c - {t, pick, shown}
 * @returns {?{html: string, title: string}} Null when the subject is unknown
 */
export function topicView(lib, id, c) {
  const subject = lib.subjects.find(s => s.id === id);
  if (!subject) return null;
  const on = lib.entries.filter(e => e.subjects?.includes(id));
  const shown = e => c.shown?.[e.kind] ?? e.kind;
  const sequences = lib.sequences
    .map(s => [s, s.entries.filter(x => on.some(e => e.id === x)).length])
    .filter(([, n]) => n > 0)
    .map(
      ([s, n]) =>
        `<li class="lib-row"><a href="?sequence=${escape(s.id)}&amp;group=sequence">${escape(c.pick(s.title))}</a> <span class="lib-row-meta">${escape(c.t('lib.pathway.seq', { n: s.entries.length }))} · ${n}/${s.entries.length}</span></li>`
    );
  const byLevel = LEVELS.map(level => {
    const rows = on.filter(
      e => shown(e) === 'investigation' && e.level === level
    );
    return rows.length
      ? `<h4>${escape(c.t(`lib.level.${level}`))}</h4>${list(rows, c)}`
      : '';
  }).join('');
  const of = kind =>
    list(
      on.filter(e => shown(e) === kind && e.kind === kind),
      c
    );
  const html = `<article class="lib-topic" data-topic="${escape(id)}">
<h2>${escape(c.pick(subject.label))}</h2>
<p class="lib-topic-blurb">${escape(c.pick(subject.blurb))}</p>
${on.length ? '' : `<p class="ui-state is-empty">${escape(c.t('lib.topic.empty'))}</p>`}
${section(c.t('lib.topic.sequences'), sequences.length ? `<ul class="lib-rows">${sequences.join('')}</ul>` : '')}
${section(c.t('lib.topic.courses'), on.some(e => e.kind === 'course') ? of('course') : '')}
${section(c.t('lib.topic.investigations'), byLevel)}
${section(c.t('lib.topic.datasets'), on.some(e => e.kind === 'dataset') ? of('dataset') : '')}
${section(c.t('lib.topic.scenarios'), on.some(e => e.kind === 'scenario') ? of('scenario') : '')}
<p><a href="?subject=${escape(id)}">${escape(c.t('lib.topic.all'))}</a></p>
<p><a href="/teaching/alignment/">${escape(c.t('lib.topic.align'))}</a></p>
</article>`;
  return { html, title: c.pick(subject.label) };
}

/**
 * The page of one entry: its relations and its pathways.
 * @param {object} lib - The library document
 * @param {string} id - The entry id
 * @param {object} c - {t, pick, byId, shown, path}
 * @returns {?{html: string, title: string, pathway: ?{title: string, href: string}}}
 *   Null when the entry is unknown
 */
export function itemView(lib, id, c) {
  const entry = c.byId.get(id);
  if (!entry) return null;
  const rel = entry.rel;
  const of = ids => ids.map(x => c.byId.get(x)).filter(Boolean);
  const group = (title, ids) => {
    const rows = of(ids);
    return `<section class="lib-group"><h3>${escape(title)}</h3>${
      rows.length
        ? list(rows, c)
        : `<p class="ui-note">${escape(c.t('lib.item.none'))}</p>`
    }</section>`;
  };
  const named = (k, pid) =>
    k === 'seq'
      ? lib.sequences.find(s => s.id === pid)
      : c.byId.get(`course:${pid}`);
  const membership = (rel?.in ?? [])
    .map(([k, pid, n]) => {
      const p = named(k, pid);
      if (!p) return '';
      const total = k === 'seq' ? p.entries.length : 0;
      return `<li>${escape(
        k === 'seq'
          ? c.t('lib.item.in.seq', { name: c.pick(p.title), n: n + 1, total })
          : c.t('lib.item.in.course', { name: c.pick(p.title), n: n + 1 })
      )}</li>`;
    })
    .join('');
  const [pk, pid] = String(c.path || '').split(':');
  const via = pk && named(pk, pid);
  const pathway = via
    ? {
        title: c.pick(via.title),
        href: pk === 'seq' ? `?sequence=${pid}&group=sequence` : via.route,
      }
    : null;
  const html = `<article class="lib-item" data-item="${escape(id)}">
<h2>${escape(c.pick(entry.title))}</h2>
${entry.summary ? `<p>${escape(c.pick(entry.summary))}</p>` : ''}
<p><a class="ui-button lib-link" href="${escape(entry.route)}">${escape(c.t('lib.item.open'))}</a>${
    rel?.teach
      ? ` <a href="${escape(rel.teach)}">${escape(c.t('lib.item.teach'))}</a>`
      : ''
  }</p>
${membership ? `<section class="lib-group"><h3>${escape(c.t('lib.item.in'))}</h3><ul class="lib-rows">${membership}</ul></section>` : ''}
${group(c.t('lib.item.pre'), rel?.pre ?? [])}
${group(c.t('lib.item.next'), rel?.next ?? [])}
${rel?.why ? `<p class="ui-note lib-why-none">${escape(c.t(`lib.item.why.${rel.why}`))}</p>` : ''}
${group(c.t('lib.item.related'), rel?.related ?? [])}
</article>`;
  return { html, title: c.pick(entry.title), pathway };
}
