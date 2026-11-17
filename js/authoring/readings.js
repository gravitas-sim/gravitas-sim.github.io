// Declaring a reading a student takes (js/investigations/figures.js): the helper
// a lesson file uses to write the field, and the rule that its source exists.

const STATS = ['mean', 'n', 'se'];

/**
 * A measure field filled by the student's press: `{probe: rowId}` reads a probe
 * row, `{tool: rowId}` an instrument readout row, `{span: seriesId, stat}` the
 * mean, count or standard error over an interval of a series the step declares.
 * @param {{id: string, label: string, unit?: string}} field - As any field
 * @param {object} source - One of the three forms above
 * @returns {object} The field with its `source`
 */
export const readingField = (field, source) => ({ ...field, source });

/**
 * What is wrong with the sources a step declares: each names exactly one of
 * probe, tool or span, and the row or series it names exists.
 * @param {object} step - A lesson step
 * @param {{ctx: object, widget?: object}} where - A hostile probe context and the step's widget
 * @returns {string[]} One sentence per problem
 */
export function readingProblems(step, { ctx, widget }) {
  const bad = [];
  const rows = make => {
    try {
      return make() || [];
    } catch {
      return [];
    }
  };
  for (const f of step.fields || []) {
    const s = f.source;
    if (s === undefined) continue;
    const kinds = ['probe', 'tool', 'span'].filter(k => s?.[k] !== undefined);
    if (kinds.length !== 1)
      bad.push(`field ${f.id}: source names one of probe, tool or span`);
    else if (f.compute)
      bad.push(`field ${f.id}: a computed field takes no reading`);
    else if (kinds[0] === 'span') {
      if (typeof step.series?.[s.span] !== 'function')
        bad.push(`field ${f.id}: the step declares no series "${s.span}"`);
      if (!STATS.includes(s.stat))
        bad.push(`field ${f.id}: stat is one of ${STATS.join(', ')}`);
    } else {
      const id = s[kinds[0]];
      const have =
        kinds[0] === 'probe'
          ? rows(() => step.probe?.(ctx))
          : rows(() => {
              const v = Object.fromEntries(
                (widget?.controls || []).map(c => [c.id, c.value])
              );
              return widget?.readout(
                { ...v, ...step.tool?.values },
                widget.live ? ctx : undefined,
                step.tool
              );
            });
      if (!have.some(r => r.id === id))
        bad.push(`field ${f.id}: no ${kinds[0]} row has the id "${id}"`);
    }
  }
  return bad;
}
