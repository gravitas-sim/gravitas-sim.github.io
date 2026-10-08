// =============================================================================
// Key groups: the runtime half of tools/key-groups.mjs
// -----------------------------------------------------------------------------
// The production build rewrites each message catalog's keys so a run of
// neighbours that share a dotted prefix writes the prefix once. This turns
// that compact form back into the object the source file declares: the same
// keys, in the same order, with the same values. The source files are never
// written in the compact form; only the bundler emits it.
//
// The argument alternates keys and entries:
//   a string entry is the value of that key;
//   an array entry holds the value of that key (any other value);
//   an object entry is a group, whose keys are appended to the prefix;
//   the key 0 stands for a spread: its entry is copied in as it is.
// =============================================================================

export function keyGroups(list) {
  const out = {};
  for (let i = 0; i < list.length; i += 2) {
    const k = list[i];
    const v = list[i + 1];
    if (k === 0) Object.assign(out, v);
    else if (typeof v === 'string') out[k] = v;
    else if (Array.isArray(v)) out[k] = v[0];
    else for (const j in v) out[k + j] = v[j];
  }
  return out;
}
