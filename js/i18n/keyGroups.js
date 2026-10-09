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
//   an object with a key 0 is a group of groups: that key holds a list of the
//   same kind, read with this key's prefix;
//   the key 0 stands for a spread: its entry is copied in as it is.
// =============================================================================

function expand(list, prefix, out) {
  for (let i = 0; i < list.length; i += 2) {
    const k = list[i];
    const v = list[i + 1];
    if (k === 0) Object.assign(out, v);
    else if (typeof v === 'string') out[prefix + k] = v;
    else if (Array.isArray(v)) out[prefix + k] = v[0];
    else if (0 in v) expand(v[0], prefix + k, out);
    else for (const j in v) out[prefix + k + j] = v[j];
  }
  return out;
}

export const keyGroups = list => expand(list, '', {});
