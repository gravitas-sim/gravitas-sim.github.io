// =============================================================================
// The subset of JSON Schema the schemas in sdk/schemas use, as a checker
// -----------------------------------------------------------------------------
// No schema engine is a dependency, so the suites that hold a document to its
// schema share this: true and false as schemas, const, enum, type (one or a
// list), pattern, minLength, maxLength, minimum, maximum, exclusiveMinimum,
// exclusiveMaximum, minItems, maxItems, uniqueItems, contains, prefixItems,
// items, required, properties, additionalProperties, anyOf (for a format with
// two shapes, such as gravitas.experiment/1's 2-D and 3-D models), not, and
// $ref to the schema's own $defs ("#/$defs/name"). Not a test file (Jest runs
// *.test.js), and not Gravitas; it imports nothing, which
// tests/sdkContract.test.js holds it to.
// =============================================================================

/** A "#/$defs/name" reference, in the schema it was written in. */
function resolve(root, ref) {
  const m = /^#\/\$defs\/([A-Za-z0-9_-]+)$/.exec(ref);
  const target = m && root.$defs?.[m[1]];
  if (target === undefined) throw new Error(`cannot resolve ${ref}`);
  return target;
}

/** JSON's equality, for uniqueItems: same type, same members, any key order. */
const canonical = v =>
  Array.isArray(v)
    ? `[${v.map(canonical).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .sort()
          .map(k => `${JSON.stringify(k)}:${canonical(v[k])}`)
          .join(',')}}`
      : JSON.stringify(v);

/** The subset of JSON Schema the SDK's schemas use. */
export function valid(s, v, root = s) {
  if (s === true) return true;
  if (s === false) return false;
  if (s.$ref !== undefined && !valid(resolve(root, s.$ref), v, root))
    return false;
  if (s.const !== undefined && v !== s.const) return false;
  if (s.enum && !s.enum.includes(v)) return false;
  if (s.anyOf && !s.anyOf.some(x => valid(x, v, root))) return false;
  if (s.not !== undefined && valid(s.not, v, root)) return false;
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
    if (s.maxLength !== undefined && v.length > s.maxLength) return false;
  }
  if (typeof v === 'number') {
    if (s.minimum !== undefined && !(v >= s.minimum)) return false;
    if (s.maximum !== undefined && !(v <= s.maximum)) return false;
    if (s.exclusiveMinimum !== undefined && !(v > s.exclusiveMinimum))
      return false;
    if (s.exclusiveMaximum !== undefined && !(v < s.exclusiveMaximum))
      return false;
  }
  if (Array.isArray(v)) {
    if (s.minItems && v.length < s.minItems) return false;
    if (s.maxItems !== undefined && v.length > s.maxItems) return false;
    if (s.uniqueItems && new Set(v.map(canonical)).size !== v.length)
      return false;
    if (s.contains !== undefined && !v.some(x => valid(s.contains, x, root)))
      return false;
    const prefix = s.prefixItems || [];
    if (!prefix.every((x, i) => i >= v.length || valid(x, v[i], root)))
      return false;
    if (
      s.items !== undefined &&
      !v.slice(prefix.length).every(x => valid(s.items, x, root))
    )
      return false;
  }
  if (type === 'object') {
    for (const k of s.required || []) if (!(k in v)) return false;
    for (const [k, x] of Object.entries(v)) {
      const sub = Object.hasOwn(s.properties || {}, k)
        ? s.properties[k]
        : s.additionalProperties === undefined
          ? true
          : s.additionalProperties;
      if (!valid(sub, x, root)) return false;
    }
  }
  return true;
}
