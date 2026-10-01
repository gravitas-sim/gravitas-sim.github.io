// =============================================================================
// The subset of JSON Schema the schemas in sdk/schemas use, as a checker
// -----------------------------------------------------------------------------
// No schema engine is a dependency, so the suites that hold a document to its
// schema share this: const, enum, type (one or a list), pattern, minLength,
// minItems, items, required, properties, additionalProperties and anyOf (for
// a format with two shapes, such as gravitas.experiment/1's 2-D and 3-D
// models). Not a test file (Jest runs *.test.js), and not Gravitas.
// =============================================================================

/** The subset of JSON Schema the SDK's schemas use. */
export function valid(s, v) {
  if (s.const !== undefined && v !== s.const) return false;
  if (s.enum && !s.enum.includes(v)) return false;
  if (s.anyOf && !s.anyOf.some(x => valid(x, v))) return false;
  const type = Array.isArray(v)
    ? 'array'
    : v === null
      ? 'null'
      : Number.isInteger(v)
        ? 'integer'
        : typeof v;
  const types = s.type === undefined ? null : [s.type].flat();
  if (
    types &&
    !types.some(t => t === type || (t === 'number' && type === 'integer'))
  )
    return false;
  if (typeof v === 'string') {
    if (s.pattern && !new RegExp(s.pattern).test(v)) return false;
    if (s.minLength && v.length < s.minLength) return false;
  }
  if (Array.isArray(v)) {
    if (s.minItems && v.length < s.minItems) return false;
    if (s.items && !v.every(x => valid(s.items, x))) return false;
  }
  if (type === 'object') {
    for (const k of s.required || []) if (!(k in v)) return false;
    for (const [k, x] of Object.entries(v)) {
      const sub =
        s.properties?.[k] ??
        (s.additionalProperties === false
          ? null
          : typeof s.additionalProperties === 'object'
            ? s.additionalProperties
            : {});
      if (sub === null || !valid(sub, x)) return false;
    }
  }
  return true;
}
