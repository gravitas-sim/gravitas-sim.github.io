// =============================================================================
// A reader's own file, into the workspace
// -----------------------------------------------------------------------------
// CSV (or tab- or semicolon-separated text) and JSON, in two steps that the
// page keeps apart on purpose:
//
//   1. read() parses the file and describes it: its columns, how many values
//      in each are numbers, how many are missing and what they were spelled
//      as, and a unit the header suggests where it names one. Nothing is
//      decided yet; the page shows this as a preview.
//   2. build() takes the reader's mapping - which column is what, and the unit
//      of each - and makes an observation (./schema.js), or says why not.
//
// The rule between the two is that nothing is assumed:
//   - A numeric column needs a unit, and "not stated" (null) is a choice the
//     reader makes, never a default. A header's "(Angstrom)" is offered, and
//     the page labels it as read from the header; build() never reads it.
//   - A time column needs a format and a scale; "unknown" is a scale the
//     reader can choose, and the page then says the scale is unknown.
//   - Text where a number should be is an error naming the lines, not a zero
//     or a skipped row. The spellings of a missing value this recognizes are
//     listed, and the preview says which of them the file used.
//   - A ragged row - more or fewer fields than the header - is an error naming
//     the line. So is a file past the limits: they are what keeps a phone
//     from being asked to hold a survey.
//
// A JSON file may be a gravitas.observation/1 this workspace exported, which
// is read back whole, or rows (an array of objects) or columns (an object of
// equal-length arrays), which go through the same mapping as CSV.
//
// Pure: no DOM. Browser and Node alike.
// =============================================================================

import { FORMAT, FORMAT_VERSION, validateObservation } from './schema.js';
import { TIME_FORMATS, TIME_SCALES, dimensionOf, parseUnit } from './units.js';

export const LIMITS = Object.freeze({
  bytes: 5_000_000,
  rows: 200_000,
  columns: 50,
});

/** Spellings of a missing value in a number column. */
export const MISSING = Object.freeze([
  '',
  'NaN',
  'nan',
  'NULL',
  'null',
  'NA',
  'N/A',
  'n/a',
  'None',
  '-',
  '--',
]);
const MISSING_SET = new Set(MISSING);

const DELIMITERS = [',', '\t', ';'];

/** A number as a file writes one: no thousands separators, no units. */
const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const DECIMAL_COMMA = /^[+-]?\d+,\d+([eE][+-]?\d+)?$/;

/** Split one line on a delimiter, with quoted fields as RFC 4180 has them. */
function splitLine(line, delim) {
  const out = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === '') quoted = true;
    else if (ch === delim) {
      out.push(field);
      field = '';
    } else field += ch;
  }
  out.push(field);
  return { fields: out, open: quoted };
}

/**
 * Lines of text, with a quoted field allowed to hold a line break, and the
 * file line each starts on.
 */
function records(text, delim) {
  const lines = text.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].replace(/\r$/, '');
    const start = i + 1;
    let { fields, open } = splitLine(line, delim);
    while (open && i + 1 < lines.length) {
      line += `\n${lines[++i].replace(/\r$/, '')}`;
      ({ fields, open } = splitLine(line, delim));
    }
    out.push({ line: start, text: line, fields, open });
  }
  return out;
}

/** The delimiter that splits the first lines most consistently into columns. */
function sniffDelimiter(lines) {
  let best = ',';
  let bestScore = -1;
  for (const d of DELIMITERS) {
    const counts = lines.slice(0, 50).map(l => splitLine(l, d).fields.length);
    if (!counts.length || counts[0] < 2) continue;
    const agree = counts.filter(c => c === counts[0]).length;
    const score = agree * 100 + counts[0];
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

/** A unit a header names, as `name (unit)` or `name [unit]`. */
function headerUnit(name) {
  const m = /^(.*?)\s*[([]\s*([^)\]]+?)\s*[)\]]\s*$/.exec(name);
  if (!m) return null;
  const parsed = parseUnit(m[2]);
  return parsed.ok
    ? { unit: parsed.unit, text: m[2], medium: parsed.medium ?? null }
    : null;
}

/** What one column holds, for the preview. */
function describe(name, values, { decimalComma }) {
  let numbers = 0;
  let missing = 0;
  let commas = 0;
  const tokens = new Set();
  const text = [];
  let min = Infinity;
  let max = -Infinity;
  values.forEach((raw, i) => {
    const v = typeof raw === 'string' ? raw.trim() : raw;
    if (
      v === null ||
      v === undefined ||
      (typeof v === 'string' && MISSING_SET.has(v))
    ) {
      missing++;
      tokens.add(v ?? 'null');
      return;
    }
    let n = typeof v === 'number' ? v : NaN;
    if (typeof v === 'string') {
      if (NUMBER.test(v)) n = Number(v);
      else if (DECIMAL_COMMA.test(v)) {
        commas++;
        if (decimalComma) n = Number(v.replace(',', '.'));
      }
    }
    if (Number.isFinite(n)) {
      numbers++;
      min = Math.min(min, n);
      max = Math.max(max, n);
    } else if (text.length < 5) text.push(i);
  });
  const nonMissing = values.length - missing;
  return {
    name,
    numbers,
    missing,
    missingTokens: [...tokens],
    textRows: text,
    decimalCommas: commas,
    numeric: nonMissing > 0 && numbers === nonMissing,
    min: numbers ? min : null,
    max: numbers ? max : null,
    suggestion: headerUnit(name),
  };
}

/**
 * Read a file's text and describe it, without deciding anything.
 *
 * @param {string} text - The file, decoded
 * @param {{name?: string, bytes?: number, decimalComma?: boolean,
 *   delimiter?: string}} [opts]
 * @returns {{ok: true, table: object} | {ok: false, problems: object[]}}
 *   A table is { format, header, rows, columns, delimiter, comments,
 *   headerRow, file }; problems are { line?, message }.
 */
export function read(text, opts = {}) {
  const bytes = opts.bytes ?? text.length;
  if (bytes > LIMITS.bytes) {
    return fail(
      `the file is ${Math.round(bytes / 1e6)} MB; the workspace reads files up to ${LIMITS.bytes / 1e6} MB`
    );
  }
  const body = String(text).replace(/^\uFEFF/, '');
  if (!body.trim()) return fail('the file is empty');
  const first = body.trimStart()[0];
  const file = { name: opts.name || 'file', bytes };
  if (first === '{' || first === '[') return readJson(body, file, opts);
  return readDelimited(body, file, opts);
}

const fail = (message, line) => ({
  ok: false,
  problems: [line ? { line, message } : { message }],
});

function readDelimited(body, file, opts) {
  const allLines = body.split('\n');
  const comments = [];
  // A leading block of '#' lines is a header comment, which many
  // astronomical tables carry; it is shown, and it may name the units.
  let skip = 0;
  while (skip < allLines.length && /^\s*#/.test(allLines[skip])) {
    comments.push(allLines[skip].replace(/^\s*#\s?/, '').replace(/\r$/, ''));
    skip++;
  }
  const rest = allLines.slice(skip).join('\n');
  const delimiter =
    opts.delimiter ?? sniffDelimiter(rest.split('\n').filter(l => l.trim()));
  const recs = records(rest, delimiter)
    .map(r => ({ ...r, line: r.line + skip }))
    .filter(r => r.text.trim() !== '');
  if (!recs.length) return fail('there are no rows after the comments');
  const problems = [];
  const open = recs.find(r => r.open);
  if (open)
    problems.push({
      line: open.line,
      message: 'a quoted field is never closed',
    });

  const firstFields = recs[0].fields.map(f => f.trim());
  // A header row is one with any field that is not a number.
  const headerRow = firstFields.some(
    f => f !== '' && !NUMBER.test(f) && !DECIMAL_COMMA.test(f)
  );
  const header = headerRow
    ? firstFields
    : firstFields.map((_, i) => `column ${i + 1}`);
  const dataRecs = headerRow ? recs.slice(1) : recs;
  if (header.length > LIMITS.columns) {
    return fail(
      `the file has ${header.length} columns; the workspace reads up to ${LIMITS.columns}`
    );
  }
  if (dataRecs.length > LIMITS.rows) {
    return fail(
      `the file has ${dataRecs.length.toLocaleString('en')} rows; the workspace reads up to ${LIMITS.rows.toLocaleString('en')}`
    );
  }
  if (!dataRecs.length) return fail('there is a header and no rows');
  const seen = new Map();
  header.forEach((h, i) => {
    if (h === '')
      problems.push({
        line: recs[0].line,
        message: `column ${i + 1} has no name`,
      });
    else if (seen.has(h))
      problems.push({
        line: recs[0].line,
        message: `"${h}" names two columns`,
      });
    seen.set(h, i);
  });
  const ragged = dataRecs.filter(r => r.fields.length !== header.length);
  for (const r of ragged.slice(0, 10)) {
    problems.push({
      line: r.line,
      message: `has ${r.fields.length} fields where the header has ${header.length}`,
    });
  }
  if (ragged.length > 10) {
    problems.push({
      message: `and ${ragged.length - 10} more rows with the wrong number of fields`,
    });
  }
  if (problems.length) return { ok: false, problems };
  const rows = dataRecs.map(r => r.fields);
  return {
    ok: true,
    table: finishTable({
      format: 'delimited',
      delimiter,
      header,
      headerRow,
      rows,
      lines: dataRecs.map(r => r.line),
      comments,
      file,
      decimalComma: !!opts.decimalComma,
    }),
  };
}

function finishTable(t) {
  const columns = t.header.map((name, i) =>
    describe(
      name,
      t.rows.map(r => r[i]),
      { decimalComma: t.decimalComma }
    )
  );
  return { ...t, columns };
}

function readJson(body, file, opts) {
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    // The engine's own message differs between browsers; this one does not.
    return fail('the file starts like JSON and is not valid JSON');
  }
  if (data && data.format === FORMAT) {
    if (data.formatVersion !== FORMAT_VERSION) {
      return fail(
        `it is ${FORMAT}/${data.formatVersion}, and this workspace reads /${FORMAT_VERSION}`
      );
    }
    const observation = revive(data);
    const problems = validateObservation(observation);
    if (problems.length) {
      return {
        ok: false,
        problems: problems
          .slice(0, 10)
          .map(p => ({ message: `${p.path} ${p.message}` })),
      };
    }
    const changes = Array.isArray(data.workspace?.changes)
      ? data.workspace.changes
      : [];
    const saved = data.workspace?.source;
    if (!changes.length || !saved)
      return { ok: true, observation, changes: [] };
    // A session: the observation as opened, and the changes to make again.
    // The observation the file holds is what they must give (`expected`).
    const source = revive(saved);
    const sourceProblems = validateObservation(source);
    if (sourceProblems.length) {
      return {
        ok: false,
        problems: sourceProblems
          .slice(0, 10)
          .map(p => ({ message: `workspace.source ${p.path} ${p.message}` })),
      };
    }
    return { ok: true, observation: source, changes, expected: observation };
  }
  let header;
  let rows;
  if (Array.isArray(data)) {
    if (
      !data.length ||
      !data.every(r => r && typeof r === 'object' && !Array.isArray(r))
    ) {
      return fail(
        'a JSON array here is a list of rows, each an object of column values'
      );
    }
    header = [...new Set(data.flatMap(r => Object.keys(r)))];
    rows = data.map(r => header.map(h => (r[h] === undefined ? null : r[h])));
  } else if (data && typeof data === 'object') {
    header = Object.keys(data);
    const lengths = new Set(
      header.map(h => (Array.isArray(data[h]) ? data[h].length : -1))
    );
    if (!header.length || lengths.has(-1)) {
      return fail(
        'a JSON object here is a set of columns, each an array of values'
      );
    }
    if (lengths.size !== 1)
      return fail('its columns are not all the same length');
    const n = data[header[0]].length;
    rows = Array.from({ length: n }, (_, i) => header.map(h => data[h][i]));
  } else {
    return fail('the JSON is neither rows, columns nor an observation');
  }
  if (header.length > LIMITS.columns) {
    return fail(
      `the file has ${header.length} columns; the workspace reads up to ${LIMITS.columns}`
    );
  }
  if (rows.length > LIMITS.rows) {
    return fail(
      `the file has ${rows.length} rows; the workspace reads up to ${LIMITS.rows}`
    );
  }
  for (const [i, r] of rows.entries()) {
    const bad = r.find(v => v !== null && typeof v === 'object');
    if (bad !== undefined)
      return fail(
        `row ${i + 1} holds a nested value, which is not a column value`
      );
  }
  return {
    ok: true,
    table: finishTable({
      format: 'json',
      header,
      headerRow: true,
      rows,
      lines: rows.map((_, i) => i + 1),
      comments: [],
      file,
      decimalComma: !!opts.decimalComma,
    }),
  };
}

/** An exported observation read back: arrays to typed arrays, null to NaN. */
function revive(data) {
  return {
    ...data,
    columns: (data.columns || []).map(c => ({
      ...c,
      values:
        c.role === 'label'
          ? c.values
          : Float64Array.from(c.values || [], v => (v === null ? NaN : v)),
    })),
    masks: data.masks || [],
    annotations: data.annotations || [],
  };
}

/** A stable identity for what a reader imported: FNV-1a of the rows. */
function fingerprint(table) {
  let h = 0x811c9dc5;
  const text = JSON.stringify([table.header, table.rows]);
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const KIND_OF_X = { 'time-series': 'time', spectrum: null, table: null };

/**
 * An observation from a table and the reader's mapping of it.
 *
 * @param {object} table - read()'s table
 * @param {object} mapping - { kind, title, columns: [{ use, unit, of?, name? }]
 *   in the table's column order, use being 'x' | 'value' | 'uncertainty' |
 *   'label' | 'ignore' and unit a unit id, '' or null, each chosen;
 *   time?: { format, scale }; spectral?: { quantity, medium, frame } }
 * @returns {{ok: true, observation: object} | {ok: false, problems: object[]}}
 */
export function build(table, mapping) {
  const problems = [];
  const say = (message, extra = {}) => problems.push({ message, ...extra });
  const kind = mapping?.kind;
  if (!['time-series', 'spectrum', 'table'].includes(kind)) {
    return {
      ok: false,
      problems: [{ message: 'choose what kind of data this is' }],
    };
  }
  const uses = mapping.columns || [];
  if (uses.length !== table.header.length)
    say('every column needs a use, even if it is "ignore"');
  const used = uses
    .map((u, i) => ({ ...u, index: i, name: u.name || table.header[i] }))
    .filter(u => u.use && u.use !== 'ignore');
  const xs = used.filter(u => u.use === 'x');
  const values = used.filter(u => u.use === 'value');
  if (kind !== 'table' && xs.length !== 1)
    say(`a ${kind} needs exactly one column along the axis`);
  if (!values.length) say('choose at least one column of values');

  const columns = [];
  const ids = new Map();
  const idOf = u => {
    if (!ids.has(u.index)) {
      const base =
        (u.name || `column-${u.index + 1}`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || `column-${u.index + 1}`;
      let id = base;
      for (let k = 2; [...ids.values()].includes(id); k++) id = `${base}-${k}`;
      ids.set(u.index, id);
    }
    return ids.get(u.index);
  };

  for (const u of used) {
    const described = table.columns[u.index];
    if (u.use === 'label') {
      columns.push({
        id: idOf(u),
        name: u.name,
        role: 'label',
        unit: null,
        values: table.rows.map(r =>
          r[u.index] === null || r[u.index] === undefined
            ? null
            : String(r[u.index])
        ),
      });
      continue;
    }
    if (u.unit === undefined) {
      say(`choose a unit for "${u.name}", or say it has none`, {
        column: u.index,
      });
      continue;
    }
    const parsed = parseUnit(u.unit);
    if (!parsed.ok) {
      say(`${u.name}: ${parsed.reason}`, { column: u.index });
      continue;
    }
    const numbers = new Float64Array(table.rows.length);
    const badLines = [];
    table.rows.forEach((r, i) => {
      const raw = r[u.index];
      const v = typeof raw === 'string' ? raw.trim() : raw;
      if (
        v === null ||
        v === undefined ||
        (typeof v === 'string' && MISSING_SET.has(v))
      ) {
        numbers[i] = NaN;
      } else if (typeof v === 'number') {
        numbers[i] = v;
      } else if (NUMBER.test(v)) {
        numbers[i] = Number(v);
      } else if (table.decimalComma && DECIMAL_COMMA.test(v)) {
        numbers[i] = Number(v.replace(',', '.'));
      } else {
        badLines.push(table.lines[i]);
        numbers[i] = NaN;
      }
    });
    if (badLines.length) {
      const commas = described?.decimalCommas || 0;
      say(
        commas && !table.decimalComma
          ? `"${u.name}" writes ${commas} numbers with a decimal comma; choose "decimal comma" to read them`
          : `"${u.name}" has text where a number should be, on line${badLines.length > 1 ? 's' : ''} ${badLines.slice(0, 5).join(', ')}${badLines.length > 5 ? ` and ${badLines.length - 5} more` : ''}`,
        { column: u.index, lines: badLines.slice(0, 5) }
      );
      continue;
    }
    const col = {
      id: idOf(u),
      name: u.name,
      unit: parsed.unit
        ? parsed.unit.scale === 1
          ? parsed.unit.id
          : `${parsed.unit.scale} ${parsed.unit.id}`
        : null,
      role:
        u.use === 'x' ? 'x' : u.use === 'uncertainty' ? 'uncertainty' : 'value',
      values: numbers,
    };
    if (u.use === 'uncertainty') {
      const of = uses[u.of];
      if (!of || !['value', 'x'].includes(of.use)) {
        say(
          `"${u.name}" is an uncertainty; choose the column it is the uncertainty of`,
          { column: u.index }
        );
        continue;
      }
      col.of = idOf({
        ...of,
        index: u.of,
        name: of.name || table.header[u.of],
      });
      if (numbers.some(v => Number.isFinite(v) && v < 0)) {
        say(`"${u.name}" is an uncertainty and holds negative values`, {
          column: u.index,
        });
        continue;
      }
    }
    columns.push(col);
  }
  // An uncertainty's unit is its column's: a different one is a mistake
  // this cannot resolve for the reader.
  for (const c of columns.filter(c => c.role === 'uncertainty')) {
    const of = columns.find(d => d.id === c.of);
    if (of && of.unit !== c.unit)
      say(
        `"${c.name}" is in ${c.unit ?? 'no stated unit'} and "${of.name}" in ${of.unit ?? 'no stated unit'}; an uncertainty is in its column's unit`
      );
  }

  const x = xs[0] && columns.find(c => c.id === idOf(xs[0]));
  const y = values[0] && columns.find(c => c.id === idOf(values[0]));
  const out = {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    kind,
    id: `import:${fingerprint(table)}`,
    title: (mapping.title || table.file.name).slice(0, 120),
    object: null,
    facility: null,
    origin: 'imported',
    source: {
      kind: 'import',
      id: table.file.name,
      version: null,
      file: { name: table.file.name, bytes: table.file.bytes },
    },
    credit: null,
    license: null,
    retrieved: null,
    citations: [],
    reductions: [],
    columns,
    axes: {
      x: x?.id ?? columns[0]?.id,
      y: y?.id ?? columns[1]?.id ?? columns[0]?.id,
    },
    masks: [],
    annotations: [],
  };
  if (kind === 'time-series' && x) {
    const t = mapping.time || {};
    if (!Object.hasOwn(TIME_FORMATS, t.format))
      say(
        'choose how the time column counts: JD, MJD, BJD, BTJD or time since the first row'
      );
    if (!TIME_SCALES.includes(t.scale))
      say('choose the time scale, or "unknown"');
    if (dimensionOf(parseUnit(x.unit).unit) !== KIND_OF_X['time-series'])
      say(
        `"${x.name}" is along the axis of a time series, and its unit is not a time`
      );
    else if (TIME_FORMATS[t.format]?.offset !== null && x.unit !== 'd')
      say(`a ${t.format} counts in days, and "${x.name}" is in ${x.unit}`);
    out.time = { column: x.id, format: t.format, scale: t.scale };
  }
  if (kind === 'spectrum' && x) {
    const s = mapping.spectral || {};
    const dim = dimensionOf(parseUnit(x.unit).unit);
    const quantity =
      dim === 'length'
        ? 'wavelength'
        : dim === 'frequency'
          ? 'frequency'
          : null;
    if (!quantity)
      say(
        `"${x.name}" is along the axis of a spectrum, and its unit is neither a wavelength nor a frequency`
      );
    if (!['vacuum', 'air', 'unknown'].includes(s.medium))
      say('choose whether the wavelengths are in vacuum, in air, or unknown');
    if (typeof s.frame !== 'string' || !s.frame.trim())
      say('say what frame the spectrum is in, such as "observed"');
    out.spectral = {
      column: x.id,
      quantity,
      medium: s.medium,
      frame: (s.frame || '').trim(),
    };
  }
  if (problems.length) return { ok: false, problems };
  const schema = validateObservation(out);
  if (schema.length)
    return {
      ok: false,
      problems: schema.map(p => ({ message: `${p.path} ${p.message}` })),
    };
  return { ok: true, observation: out };
}
