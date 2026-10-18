// An observation: the data an Observatory workspace opens (gravitas.observation/1),
// in its file form (plain-number columns).
// Reader: validateObservation -> a list of problems.
export default {
  id: 'observation',
  label: 'observation (Observatory workspace data)',
  format: 'gravitas.observation/1',
  newToOld: 'accepts',
  capabilities: 'none',
  // What the 2.0.0 reader does with a top-level field it does not know:
  // 'refused', 'ignored' (accepted, silently dropped), or 'n/a' (the record is
  // an encoded fragment, so there is no field to add from outside).
  unknownFields: 'ignored',
  async make() {
    // As the file form holds it: columns of plain numbers (the application
    // reads them into typed arrays); NaN is a missing value and not JSON, so a
    // gap is a null.
    return {
      format: 'gravitas.observation',
      formatVersion: 1,
      kind: 'time-series',
      id: 'compat:series',
      title: 'compat series',
      object: null,
      facility: null,
      origin: 'observed',
      source: { kind: 'builtin', id: 'compat', version: null },
      credit: 'compat',
      license: { status: 'cc0' },
      retrieved: null,
      citations: [],
      reductions: [],
      columns: [
        {
          id: 't',
          name: 'time',
          unit: 'd',
          role: 'x',
          values: [0, 1, 2, 3, 4, 5],
        },
        {
          id: 'f',
          name: 'flux',
          unit: 'ppm',
          role: 'value',
          values: [10, 12, 13, 14, 16, 18],
        },
        {
          id: 'e',
          name: 'error',
          unit: 'ppm',
          role: 'uncertainty',
          of: 'f',
          values: [1, 1, 1, 1, 1, 1],
        },
      ],
      axes: { x: 't', y: 'f' },
      time: { column: 't', format: 'BTJD', scale: 'TDB' },
      masks: [],
      annotations: [],
    };
  },
  async read(load, doc) {
    const { validateObservation } = await load('js/observatory/schema.js');
    const typed = {
      ...doc,
      columns: doc.columns.map(c => ({
        ...c,
        values: Float64Array.from(c.values),
      })),
    };
    const problems = validateObservation(typed);
    return problems.length
      ? {
          accepted: false,
          problems: problems
            .slice(0, 5)
            .map(p => `${p.path} ${p.message ?? p.code}`),
        }
      : {
          accepted: true,
          value: {
            id: doc.id,
            kind: doc.kind,
            columns: doc.columns.map(c => c.id),
          },
        };
  },
  async rewrite(load, doc) {
    return doc;
  },
};
