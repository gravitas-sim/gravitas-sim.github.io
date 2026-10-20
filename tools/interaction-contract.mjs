// =============================================================================
// Is a surface keeping the interaction contract?
// -----------------------------------------------------------------------------
// tools/interaction-contract.json is the contract as data; INTERACTION.md is the
// prose. This reads the one against the tree and says what is wrong. Pure
// functions over data the caller gathered, so tests/interactionContract.test.js
// can hand it the real tree and a tree built to fail (the same shape as
// tools/acceptance-bindings.mjs).
//
// What a registered surface has to be
// -----------------------------------------------------------------------------
//   - every key it binds is a key of the contract, with an action the contract
//     gives that key, or the surface names the declared conflict it is an
//     exception under;
//   - every binding is real: the key is written in the surface's source;
//   - a keyboard walk of its primary task, a walk of every drag it has with a
//     single-pointer alternative, and an announcement test: each is a named
//     test that exists in a named file, or the surface says why it does not
//     apply;
//   - every drag it has is registered, and a drag with no alternative is a
//     `gap` that names a check in tools/pending-acceptance.json, so the gap is
//     reported on every run and cannot be forgotten.
//
// And across the tree: a module that listens for a pointer's movement is either
// a registered drag site or an exempt one with its reason, and a letter that two
// handlers both take is a declared conflict. Neither can appear unnoticed.
// =============================================================================

const STATUSES = new Set(['met', 'gap']);
const CONFLICT_STATUSES = new Set(['declared', 'open', 'resolved']);

/**
 * Whether the source writes the key: 'ArrowLeft' quoted or as an object key
 * (`ArrowLeft: () => ...`), and ' ' or '+' only quoted.
 */
const written = (source, key) =>
  /^[A-Za-z]\w*$/.test(key)
    ? new RegExp(`\\b${key}\\b`).test(source)
    : source.includes(`'${key}'`) || source.includes(`"${key}"`);

/**
 * Check a contract against the tree.
 *
 * @param {object} contract - tools/interaction-contract.json, parsed
 * @param {object} tree - What the caller read
 * @param {(file: string) => ?string} tree.read - A file's text, or null
 * @param {Set<string>} tree.pendingIds - Ids in tools/pending-acceptance.json
 * @param {Set<string>} tree.pointerFiles - Files that listen for pointer movement
 * @returns {string[]} Problems, empty when the contract holds
 */
export function checkContract(contract, tree) {
  const problems = [];
  const bad = message => problems.push(message);
  const conflictIds = new Set(contract.conflicts.map(c => c.id));
  const dragIds = new Set(contract.drags.map(d => d.id));

  for (const c of contract.conflicts) {
    if (!CONFLICT_STATUSES.has(c.status))
      bad(
        `conflict ${c.id}: status ${c.status} is not one of ${[...CONFLICT_STATUSES]}`
      );
    if (!c.resolution) bad(`conflict ${c.id}: no resolution written`);
  }

  for (const d of contract.drags) {
    if (!STATUSES.has(d.status)) bad(`drag ${d.id}: status ${d.status}`);
    if (d.status === 'met' && !d.alternatives.length)
      bad(`drag ${d.id}: met, with no alternative named`);
    if (d.status === 'gap' && !tree.pendingIds.has(d.pending))
      bad(
        `drag ${d.id}: a gap must name a registered pending check (${d.pending})`
      );
    if (d.pending && !tree.pendingIds.has(d.pending))
      bad(`drag ${d.id}: ${d.pending} is not in tools/pending-acceptance.json`);
  }

  const bound = new Set();
  for (const s of contract.surfaces) {
    const files = [s.source, ...(s.sources || [])];
    const texts = files.map(f => [f, tree.read(f)]);
    for (const [f, text] of texts)
      if (text === null) bad(`${s.id}: source ${f} does not exist`);
    const source = texts.map(([, text]) => text || '').join('\n');
    const exceptions = s.exceptions || [];
    for (const id of exceptions)
      if (!conflictIds.has(id))
        bad(`${s.id}: exception ${id} is not a declared conflict`);

    for (const { key, action } of s.keys) {
      if (!contract.keys[key]) {
        bad(`${s.id}: ${JSON.stringify(key)} is not a key of the contract`);
        continue;
      }
      if (!contract.keys[key].includes(action) && !exceptions.length)
        bad(
          `${s.id}: ${JSON.stringify(key)} is ${action} here and the contract says ${contract.keys[key]}; ` +
            'name the conflict it is an exception under'
        );
      if (!written(source, key))
        bad(`${s.id}: the source never writes ${JSON.stringify(key)}`);
    }

    for (const id of s.drags) {
      if (!dragIds.has(id)) bad(`${s.id}: drag ${id} is not registered`);
      else if (contract.drags.find(d => d.id === id).surface !== s.id)
        bad(`${s.id}: drag ${id} names another surface`);
    }
    for (const id of s.pending || [])
      if (!tree.pendingIds.has(id))
        bad(`${s.id}: ${id} is not in tools/pending-acceptance.json`);

    const na = s.notApplicable || {};
    for (const kind of ['keyboard', 'singlePointer', 'announcement']) {
      const t = s.tests[kind];
      if (!t) {
        const owed = s.drags
          .map(id => contract.drags.find(d => d.id === id))
          .filter(d => d?.status === 'met');
        const needed =
          kind === 'keyboard' ||
          (kind === 'singlePointer' && owed.length > 0) ||
          kind === 'announcement';
        if (needed && !na[kind])
          bad(`${s.id}: no ${kind} test and no reason it does not apply`);
        continue;
      }
      const text = tree.read(t.file);
      if (text === null)
        bad(`${s.id}: ${kind} test file ${t.file} does not exist`);
      else if (!text.includes(t.title))
        bad(`${s.id}: ${t.file} has no test titled "${t.title}"`);
      else {
        const tag = `${t.file}::${t.title}`;
        if (bound.has(`${kind}:${tag}`) && kind !== 'keyboard')
          bad(`${s.id}: the ${kind} test "${t.title}" is bound twice`);
        bound.add(`${kind}:${tag}`);
      }
    }
  }

  const sites = contract.dragSites.sites;
  for (const file of tree.pointerFiles)
    if (!sites[file])
      bad(
        `${file} listens for pointer movement and is not in dragSites: register its drag or say why it is exempt`
      );
  for (const [file, what] of Object.entries(sites)) {
    if (!tree.pointerFiles.has(file))
      bad(
        `dragSites lists ${file}, which no longer listens for pointer movement`
      );
    if (Array.isArray(what))
      for (const id of what)
        if (!dragIds.has(id))
          bad(`dragSites: ${file} names the unregistered drag ${id}`);
    if (!Array.isArray(what) && !what.exempt)
      bad(
        `dragSites: ${file} is neither a list of drags nor exempt with a reason`
      );
  }
  return problems;
}

/**
 * Letters that a global shortcut and a view-pan handler both take.
 *
 * @param {string} shortcutSource - Text of the modules that register shortcuts
 * @param {string} panSource - Text of the module with the window key handler
 * @returns {string[]} Lowercase letters, sorted
 */
export function sharedLetters(shortcutSource, panSource) {
  const shortcuts = new Set(
    [...shortcutSource.matchAll(/match:\s*'([a-z])'/g)].map(m => m[1])
  );
  const pans = [
    ...panSource.matchAll(/e\.key\.toLowerCase\(\) === '([a-z])'/g),
  ].map(m => m[1]);
  return [...new Set(pans.filter(l => shortcuts.has(l)))].sort();
}
