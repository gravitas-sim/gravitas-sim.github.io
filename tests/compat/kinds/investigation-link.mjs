// The investigation link (#i1...): a whole investigation pack in a fragment.
// Reader: readPackFragment -> {ok, pack} or {ok: false, reason}.
export default {
  id: 'investigation-link',
  label: 'investigation link',
  format: 'investigation link (prefix i, version 1)',
  newToOld: 'accepts',
  capabilities: 'none',
  // The record is an encoded fragment, so there is no field to add from outside.
  unknownFields: 'n/a',
  async make(load) {
    const { EXAMPLE_INVESTIGATION } = await load('js/composer/example.js');
    const { packLink } = await load('js/composer/packLink.js');
    const link = await packLink(
      JSON.parse(JSON.stringify(EXAMPLE_INVESTIGATION)),
      {
        root: 'https://example.test/',
      }
    );
    return { hash: link.fragment };
  },
  async read(load, fx) {
    const { readPackFragment } = await load('js/composer/packLink.js');
    const r = await readPackFragment(fx.hash);
    return r.ok
      ? { accepted: true, value: { id: r.pack.id, steps: r.pack.steps.length } }
      : { accepted: false, problems: [r.reason] };
  },
  async rewrite(load, fx) {
    const { readPackFragment, packLink } = await load(
      'js/composer/packLink.js'
    );
    const r = await readPackFragment(fx.hash);
    const link = await packLink(r.pack, { root: 'https://example.test/' });
    return { hash: link.fragment };
  },
};
