// =============================================================================
// Where in a JSON file a field is, for an error a person can act on
// -----------------------------------------------------------------------------
// The validators report a problem by field path - `source.citations[0]`,
// `provides.dataPacks[1].id`. A person fixing it wants the line. This walks
// the file's text with a small JSON tokenizer and records where each value
// starts, so `locate(text, 'source.citations[0]')` is `{ line: 41, column: 7 }`.
// A path that is not in the file (a missing field) is located at its nearest
// parent that is, which is where the field has to be added.
// =============================================================================

/**
 * Every value's position in a JSON text, by field path.
 * @param {string} text - JSON
 * @returns {Map<string, {line: number, column: number}>}
 */
export function positions(text) {
  const out = new Map();
  let i = 0;
  let line = 1;
  let col = 1;
  const advance = n => {
    for (let k = 0; k < n; k++) {
      if (text[i] === '\n') {
        line++;
        col = 1;
      } else col++;
      i++;
    }
  };
  const space = () => {
    while (i < text.length && /\s/.test(text[i])) advance(1);
  };
  const string = () => {
    let s = '';
    advance(1); // opening quote
    while (i < text.length && text[i] !== '"') {
      if (text[i] === '\\') {
        s += JSON.parse(
          `"${text.slice(i, i + (text[i + 1] === 'u' ? 6 : 2))}"`
        );
        advance(text[i + 1] === 'u' ? 6 : 2);
      } else {
        s += text[i];
        advance(1);
      }
    }
    advance(1);
    return s;
  };
  const value = path => {
    space();
    out.set(path, { line, column: col });
    const c = text[i];
    if (c === '{') {
      advance(1);
      space();
      if (text[i] === '}') return advance(1);
      for (;;) {
        space();
        const key = string();
        space();
        advance(1); // colon
        value(path ? `${path}.${key}` : key);
        space();
        if (text[i] === ',') advance(1);
        else return advance(1); // closing brace
      }
    }
    if (c === '[') {
      advance(1);
      space();
      if (text[i] === ']') return advance(1);
      for (let n = 0; ; n++) {
        value(`${path}[${n}]`);
        space();
        if (text[i] === ',') advance(1);
        else return advance(1);
      }
    }
    if (c === '"') return string();
    while (i < text.length && /[^\s,\]}]/.test(text[i])) advance(1);
  };
  value('');
  return out;
}

/**
 * The line and column of a field path, or of its nearest present parent.
 * @param {string} text - JSON
 * @param {string} path - A validator's field path
 */
export function locate(text, path, table = positions(text)) {
  let p = path;
  while (p && !table.has(p)) p = p.replace(/(\.[^.[\]]+|\[\d+\])$/, '');
  return { ...(table.get(p) || { line: 1, column: 1 }), exact: p === path };
}
