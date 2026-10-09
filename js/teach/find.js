// =============================================================================
// The filters on /teaching/find/ (ADOPTION.md)
// -----------------------------------------------------------------------------
// The table of adoption pages is written as static HTML by
// tools/build-adoption-pages.mjs, one row per investigation and activity, each
// row carrying what it can be filtered by as data attributes. This hides the
// rows a reader's choices rule out. Without it the whole table is simply
// shown, so the page works with no script. The choices are kept in the address
// (?level=intro&chapter=3) so a link can open the table already narrowed.
// =============================================================================

/** Does a row's attribute hold the chosen value (a space-separated list)? */
const holds = (row, key, value) =>
  (row.dataset[key] || '').split(' ').includes(value);

/** Filter the table, and say how many rows remain. */
export function mountFind(root = document) {
  const form = root.getElementById('adFilters');
  const rows = [...root.querySelectorAll('#adTable tbody tr')];
  if (!form || !rows.length) return;
  const selects = [...form.querySelectorAll('select[data-filter]')];
  const params = new URLSearchParams(location.search);
  for (const s of selects) {
    const v = params.get(s.dataset.filter);
    if (v && [...s.options].some(o => o.value === v)) s.value = v;
  }
  const count = root.getElementById('adCount');
  const empty = root.getElementById('adEmpty');
  const clear = root.getElementById('adClear');
  const apply = () => {
    const chosen = selects.filter(s => s.value);
    let shown = 0;
    for (const row of rows) {
      const ok = chosen.every(s => holds(row, s.dataset.filter, s.value));
      row.hidden = !ok;
      if (ok) shown++;
    }
    const es = root.documentElement.lang === 'es';
    count.textContent = `${shown} ${es ? 'de' : 'of'} ${rows.length} ${es ? 'mostradas' : 'shown'}`;
    empty.hidden = shown > 0;
    clear.hidden = !chosen.length;
    const next = new URLSearchParams();
    for (const s of chosen) next.set(s.dataset.filter, s.value);
    history.replaceState(
      null,
      '',
      `${location.pathname}${next.size ? `?${next}` : ''}`
    );
  };
  form.addEventListener('change', apply);
  clear.addEventListener('click', () => {
    for (const s of selects) s.value = '';
    apply();
    selects[0].focus();
  });
  apply();
}
