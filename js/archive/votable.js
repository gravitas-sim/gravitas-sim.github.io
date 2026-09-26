// =============================================================================
// A VOTable, read strictly: TABLEDATA only
// -----------------------------------------------------------------------------
// VOTable is the IVOA's XML table format, and what a TAP service answers in.
// This reads the one serialization a page can read without a binary decoder,
// TABLEDATA, and refuses the rest by name: BINARY, BINARY2 and FITS each need
// a base64 and a type decoder, and a malformed binary stream fails far less
// legibly than malformed XML.
//
// It keeps what a conversion needs and nothing it has to trust: each FIELD's
// name, datatype, unit, UCD and description; the rows, converted by
// datatype; and the INFO QUERY_STATUS, whose OVERFLOW means the service
// stopped at MAXREC and the table is not the whole answer.
//
// Three rules the archive gate's prototype found the hard way
// (VO_ARCHIVE_GATE.md, "What the prototype caught"):
//
//   - A `long` is kept as its digits. A Gaia source_id is 19 digits, past
//     the 2^53 a double holds exactly, and Number() rounds SU Dra's
//     1058066262817534336 to 1058066262817534300, which is no star.
//   - Any DOCTYPE is refused. No engine resolves an external entity - measured
//     in Chromium, Firefox and WebKit - but the document then parses with
//     that cell empty, silently. A VOTable never needs a DOCTYPE.
//   - A number the datatype cannot hold (NaN, 1e999, an empty cell) is null,
//     never NaN and never zero.
//
// XML is parsed by the browser's DOMParser, which does not exist in a Worker,
// so this runs on the main thread. That is why the answers it is given are
// capped at 512 KB (js/archive/cds.js): about 160 ms on a low-end device.
// =============================================================================

export class VotableError extends Error {
  /**
   * @param {string} code - malformed, doctype, notVotable, serviceError,
   *   tables, serialization, noFields, noData or rowWidth
   * @param {string} message
   * @param {Object} [detail] - Values the page's message may show
   */
  constructor(code, message, detail = {}) {
    super(message);
    this.name = 'VotableError';
    this.code = code;
    this.detail = detail;
  }
}

const NUMERIC = new Set(['short', 'int', 'float', 'double', 'unsignedByte']);

/**
 * @param {string} text - The VOTable document
 * @param {{parser?: DOMParser}} [opts]
 * @returns {{fields: Array<{name: string, datatype: string|null,
 *   unit: string|null, ucd: string|null, arraysize: string|null,
 *   description: string|null}>, rows: Array<Array<number|string|null>>,
 *   status: string|null, overflow: boolean}}
 */
export function parseVotable(text, { parser = new DOMParser() } = {}) {
  const doc = parser.parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length)
    throw new VotableError('malformed', 'not well-formed XML');
  if (doc.doctype)
    throw new VotableError(
      'doctype',
      'a VOTable has no DOCTYPE; this one does'
    );
  const root = doc.documentElement;
  if (!root || root.localName !== 'VOTABLE')
    throw new VotableError(
      'notVotable',
      `the document is <${root?.localName}>`
    );
  const all = name => [...doc.getElementsByTagNameNS('*', name)];
  const statusInfo = all('INFO').find(
    i => i.getAttribute('name') === 'QUERY_STATUS'
  );
  const status = statusInfo?.getAttribute('value') ?? null;
  if (status === 'ERROR') {
    const said = (statusInfo.textContent || '').trim();
    throw new VotableError(
      'serviceError',
      said || 'the service reported an error',
      {
        said: said.slice(0, 300),
      }
    );
  }
  const tables = all('TABLE');
  if (tables.length !== 1)
    throw new VotableError(
      'tables',
      `${tables.length} tables; one is expected`,
      {
        n: tables.length,
      }
    );
  const table = tables[0];
  for (const bad of ['BINARY', 'BINARY2', 'FITS']) {
    if (table.getElementsByTagNameNS('*', bad).length)
      throw new VotableError('serialization', `${bad} is not read`, {
        form: bad,
      });
  }
  const fields = [...table.getElementsByTagNameNS('*', 'FIELD')].map(f => ({
    name: f.getAttribute('name'),
    datatype: f.getAttribute('datatype'),
    unit: f.getAttribute('unit'),
    ucd: f.getAttribute('ucd'),
    arraysize: f.getAttribute('arraysize'),
    description:
      f.getElementsByTagNameNS('*', 'DESCRIPTION')[0]?.textContent.trim() ??
      null,
  }));
  if (!fields.length)
    throw new VotableError('noFields', 'the table has no FIELD');
  const data = table.getElementsByTagNameNS('*', 'TABLEDATA')[0];
  if (!data) throw new VotableError('noData', 'no TABLEDATA');
  const convert = fields.map(f => {
    if (f.arraysize) return raw => raw;
    if (NUMERIC.has(f.datatype))
      return raw => {
        const v = Number(raw);
        return Number.isFinite(v) ? v : null;
      };
    if (f.datatype === 'long') return raw => (/^-?\d+$/.test(raw) ? raw : null);
    return raw => raw;
  });
  const rows = [];
  for (const tr of data.getElementsByTagNameNS('*', 'TR')) {
    const tds = tr.getElementsByTagNameNS('*', 'TD');
    if (tds.length !== fields.length)
      throw new VotableError(
        'rowWidth',
        `row ${rows.length + 1} has ${tds.length} cells for ${fields.length} fields`,
        { row: rows.length + 1, cells: tds.length, fields: fields.length }
      );
    const row = new Array(fields.length);
    for (let i = 0; i < fields.length; i++) {
      const raw = tds[i].textContent.trim();
      row[i] = raw === '' ? null : convert[i](raw);
    }
    rows.push(row);
  }
  return { fields, rows, status, overflow: status === 'OVERFLOW' };
}
