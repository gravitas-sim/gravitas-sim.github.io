// =============================================================================
// SPIKE (Prompt 18): a VOTable, read strictly, TABLEDATA only
// -----------------------------------------------------------------------------
// VOTable is the IVOA's XML table format, and what a TAP service answers in.
// This reads the one serialization a page can read without a binary decoder,
// TABLEDATA, and refuses the rest by name: BINARY, BINARY2 and FITS need a
// base64 and a type decoder each, and a malformed binary stream fails far
// less legibly than malformed XML.
//
// It keeps what the conversion needs and nothing it has to trust: each
// FIELD's name, datatype, unit, UCD and description; the rows, as strings,
// converted by datatype; and the INFO QUERY_STATUS, whose OVERFLOW means the
// service stopped at MAXREC and the table is not the whole answer.
//
// XML is parsed by the browser's DOMParser. Measured in Chromium, Firefox and
// WebKit (spike/vo/evidence/xml-hostile.json): none resolves an external
// entity, so a hostile DTD reaches neither the network nor the disk, and all
// three stop a "billion laughs" expansion in under 70 ms. But an unresolved
// entity parses as an empty cell, silently, so any DOCTYPE is refused: a
// VOTable never needs one.
// =============================================================================

export class VotableError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'VotableError';
    this.code = code;
  }
}

// A long is not here: it is kept as its digits. A Gaia source_id is 19
// digits, past the 2^53 a double holds exactly, and Number() rounds
// 1058066262817534336 (SU Dra) to 1058066262817534300, which is no star at
// all. This spike's own cone-query test caught it: the id it handed on to
// the epoch query was the rounded one.
const NUMERIC = new Set(['short', 'int', 'float', 'double', 'unsignedByte']);

/**
 * @param {string} text - The VOTable document
 * @param {{parser?: DOMParser}} [opts]
 * @returns {{fields: object[], rows: Array<Array<number|string|null>>,
 *   status: string|null, overflow: boolean, description: string|null}}
 */
export function parseVotable(text, { parser = new DOMParser() } = {}) {
  const doc = parser.parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length)
    throw new VotableError('malformed', 'not well-formed XML');
  if (doc.doctype) throw new VotableError('doctype', 'a VOTable has no DOCTYPE; this one does');
  const root = doc.documentElement;
  if (!root || root.localName !== 'VOTABLE')
    throw new VotableError('notVotable', `the document is <${root?.localName}>`);
  const byName = name => [...doc.getElementsByTagNameNS('*', name)];
  const statusInfo = byName('INFO').find(i => i.getAttribute('name') === 'QUERY_STATUS');
  const status = statusInfo?.getAttribute('value') ?? null;
  if (status === 'ERROR')
    throw new VotableError(
      'serviceError',
      (statusInfo.textContent || 'the service reported an error').trim()
    );
  const tables = byName('TABLE');
  if (tables.length !== 1)
    throw new VotableError('tables', `${tables.length} tables; one is expected`);
  const table = tables[0];
  for (const bad of ['BINARY', 'BINARY2', 'FITS']) {
    if (table.getElementsByTagNameNS('*', bad).length)
      throw new VotableError('serialization', `${bad} serialization is not read`);
  }
  const fields = [...table.getElementsByTagNameNS('*', 'FIELD')].map(f => ({
    name: f.getAttribute('name'),
    datatype: f.getAttribute('datatype'),
    unit: f.getAttribute('unit'),
    ucd: f.getAttribute('ucd'),
    arraysize: f.getAttribute('arraysize'),
    description:
      f.getElementsByTagNameNS('*', 'DESCRIPTION')[0]?.textContent.trim() ?? null,
  }));
  if (!fields.length) throw new VotableError('noFields', 'the table has no FIELD');
  const data = table.getElementsByTagNameNS('*', 'TABLEDATA')[0];
  if (!data) throw new VotableError('noData', 'no TABLEDATA');
  const rows = [];
  for (const tr of data.getElementsByTagNameNS('*', 'TR')) {
    const tds = [...tr.getElementsByTagNameNS('*', 'TD')];
    if (tds.length !== fields.length)
      throw new VotableError(
        'rowWidth',
        `a row has ${tds.length} cells for ${fields.length} fields`
      );
    rows.push(
      tds.map((td, i) => {
        const raw = td.textContent.trim();
        if (raw === '') return null;
        if (NUMERIC.has(fields[i].datatype) && !fields[i].arraysize) {
          const v = Number(raw);
          return Number.isFinite(v) ? v : null;
        }
        if (fields[i].datatype === 'long' && !fields[i].arraysize) {
          return /^-?\d+$/.test(raw) ? raw : null;
        }
        return raw;
      })
    );
  }
  const desc = byName('DESCRIPTION').find(d => d.parentNode === root || d.parentNode?.localName === 'RESOURCE');
  return {
    fields,
    rows,
    status,
    overflow: status === 'OVERFLOW',
    description: desc?.textContent.trim() ?? null,
  };
}
