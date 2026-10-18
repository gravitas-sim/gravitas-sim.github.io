// A world share link (#<v><z|r><payload>): the commonest thing a student sends.
// Reader: decodePayload -> the payload, or throws in words.
export default {
  id: 'share-link',
  label: 'world share link',
  format: 'world share link (v 2)',
  newToOld: 'accepts',
  capabilities: 'none',
  // What the 2.0.0 reader does with a top-level field it does not know:
  // 'refused', 'ignored' (accepted, silently dropped), or 'n/a' (the record is
  // an encoded fragment, so there is no field to add from outside).
  unknownFields: 'n/a',
  async make(load) {
    const { encodePayload } = await load('js/shareState.js');
    return {
      fragment: await encodePayload({
        v: 2,
        s: 'binary-pair',
        seed: 'abc',
        p: 0,
      }),
    };
  },
  async read(load, fx) {
    const { decodePayload } = await load('js/shareState.js');
    try {
      return { accepted: true, value: await decodePayload(fx.fragment) };
    } catch (e) {
      return { accepted: false, problems: [String(e.message)] };
    }
  },
  async rewrite(load, fx) {
    const { decodePayload, encodePayload } = await load('js/shareState.js');
    return { fragment: await encodePayload(await decodePayload(fx.fragment)) };
  },
};
