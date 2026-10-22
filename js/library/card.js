// =============================================================================
// One card for every kind of thing in the Library
// -----------------------------------------------------------------------------
// A lesson, a guide, a classroom format, a world, a dataset, a course and an
// experiment are all one card: a picture when the source has one, what it is
// and where it runs, its title and summary, the facts a reader chooses by
// (time, steps, level, arithmetic) and how far they have got. The whole card
// is one link, to the page that runs the thing: the Library never runs
// anything itself, so its links are the canonical ones (LIBRARY.md).
//
// No DOM here: the page puts the markup in place. `t` and `pick` are the
// page's translator and its {en, es} reader.
// =============================================================================

const escape = s =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** How long it takes, in words, or ''. */
export function durationText(d, t) {
  if (!d) return '';
  return d.min === d.max
    ? t('lib.card.minutes', { n: d.max })
    : t('lib.card.range', { min: d.min, max: d.max });
}

/**
 * The card.
 * @param {object} entry - A library.json entry
 * @param {object} o
 * @param {Function} o.t - Translator
 * @param {Function} o.pick - Reads an {en, es} pair
 * @param {string} o.progress - 'new', 'going' or 'done'
 * @param {object} [o.shown] - Each internal kind to the kind a student sees
 * @param {string} [o.why] - The fields a search matched, in words
 * @param {boolean} [o.details] - Add the link to the item's own page
 * @param {boolean} [o.compact] - No picture or summary
 * @param {string} [o.path] - The pathway it is listed in ('seq:<id>')
 * @returns {string} One <li>
 */
export function libraryCardHtml(
  entry,
  { t, pick, progress, shown, why, details, compact, path }
) {
  const facts = [
    durationText(entry.duration, t),
    entry.steps && entry.kind !== 'course'
      ? t('lib.card.steps', { n: entry.steps })
      : '',
    entry.depths ? t('lib.card.depths', { n: entry.depths }) : '',
    entry.level ? t(`lib.level.${entry.level}`) : '',
    entry.calculation ? t(`lib.calculation.${entry.calculation}`) : '',
  ].filter(Boolean);
  const badge =
    progress && progress !== 'new'
      ? `<span class="ui-badge is-accent lib-progress" data-progress="${progress}">${escape(t(`lib.progress.${progress}`))}</span>`
      : '';
  const shot =
    entry.thumbnail && !compact
      ? `<img class="lib-shot" src="/${escape(entry.thumbnail)}" alt="" loading="lazy" decoding="async" width="640" height="360" />`
      : '';
  const kind = shown?.[entry.kind] ?? entry.kind;
  return `<li class="lib-card${shot ? '' : ' is-plain'}${compact ? ' is-compact' : ''}" data-entry="${escape(entry.id)}" data-kind="${escape(entry.kind)}">
<a class="lib-link" href="${escape(entry.route)}">${shot}<span class="lib-body">
<span class="lib-badges"><span class="ui-badge">${escape(t(`lib.badge.${kind}`))}</span><span class="ui-badge">${escape(t(`lib.format.${entry.format}`))}</span>${badge}</span>
<span class="lib-title">${escape(pick(entry.title))}</span>
${entry.summary && !compact ? `<span class="lib-summary">${escape(pick(entry.summary))}</span>` : ''}
${why ? `<span class="lib-why">${escape(why)}</span>` : ''}
${facts.length ? `<span class="lib-facts">${facts.map(f => `<span>${escape(f)}</span>`).join('')}</span>` : ''}
</span></a>${details ? `<a class="lib-details" href="?item=${escape(entry.id)}${path ? `&amp;path=${escape(path)}` : ''}">${escape(t('lib.card.details'))}</a>` : ''}</li>`;
}
