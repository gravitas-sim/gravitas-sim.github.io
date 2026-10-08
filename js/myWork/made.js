// =============================================================================
// What a student built or ran: scenarios and experiments kept in My work
// -----------------------------------------------------------------------------
// Roadmap II Prompt 74 (MY_WORK.md). One record per thing, kept under its own
// key in the `made` collection (js/storage/index.js), so a backup file, one
// item's export and an import carry it like everything else a student owns.
//
//   kind 'scenario'    a world the student saved from the Sandbox's share
//                      dialog, a system built in the Orbital System Builder, or
//                      a scenario opened from an instructor's link and changed.
//                      It keeps the name, the seed, the settings that differ from
//                      the defaults, the share link that rebuilds it and, when
//                      one made it, the scenario's identity (`derivedFrom`:
//                      {id, version}, the identity a link carries in `x.pack`).
//   kind 'experiment'  a run of the experiment runner: its manifest and result.
//
// A record is data only: nothing in it is run. `attachedTo` names notebook
// entries ("the system I measured"); the report, the submission token and the
// review page read that (ledgerReport.js, submissionToken.js).
//
// Lazy: nothing on a lesson's path imports this. No DOM.
// =============================================================================

export const MADE_FORMAT = 'gravitas.made';
export const MADE_VERSION = 1;
export const MADE_PREFIX = 'gravitas_made_';
export const MADE_COLLECTION = 'made';
const ITEM_LIMIT = 512 * 1024;

/** The most links a token carries whole; longer ones travel as a file. */
export const TOKEN_LINK_MAX = 1500;
/** How many things one report hands in. */
export const TOKEN_MADE = 4;

const FRAGMENT = /^[0-9][A-Za-z0-9_-]{0,}$/;
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

/** The identity a scenario pack gives a link: {id, version}, or null. */
export const identityOf = p =>
  isObj(p) && typeof p.id === 'string' && typeof p.version === 'string'
    ? { id: p.id.slice(0, 80), version: p.version.slice(0, 40) }
    : null;

const newId = () =>
  `m${Date.now().toString(36)}${Math.floor(Math.random() * 46656)
    .toString(36)
    .padStart(3, '0')}`;

/** The build the page is, or null where nothing says. */
export const buildOf = () =>
  globalThis.document?.querySelector('meta[name="gravitas-revision"]')
    ?.content || null;

/**
 * A scenario record.
 * @param {object} a
 * @param {string} a.name - What the student calls it
 * @param {'sandbox'|'builder'} a.from - Where it was made
 * @param {object} a.payload - The share payload the link was made from
 * @param {string} a.fragment - The link's fragment, without the '#'
 * @param {?object} [a.system] - The Orbital System Builder file, if one made it
 * @param {?string} [a.app] - The build
 * @returns {object} A record
 */
export function scenarioRecord({
  name,
  from,
  payload,
  fragment,
  system = null,
  app = buildOf(),
}) {
  const settings = { ...(payload.d || {}), ...(payload.a || {}) };
  return {
    format: MADE_FORMAT,
    formatVersion: MADE_VERSION,
    id: newId(),
    kind: 'scenario',
    from,
    name: str(name, 120) || str(payload.s, 80) || 'Scenario',
    savedAt: new Date().toISOString(),
    app,
    attachedTo: [],
    scenario: {
      id: str(payload.s, 120) || null,
      seed: String(payload.seed ?? ''),
      settings,
      bodies: Array.isArray(payload.b) ? payload.b.length : null,
      link: fragment,
      derivedFrom: identityOf(payload.x?.pack),
      ...(system ? { system } : {}),
    },
  };
}

/** The trials a stored result drops when it would not fit: the file has them. */
const withoutTrials = r => ({ ...r, trials: [], trialsKept: false });

/**
 * An experiment record, from the runner's result (gravitas.experiment-result/1).
 * @param {object} result - The runner's result
 * @param {string} name
 * @param {boolean} [slim] - Leave the trials out
 * @returns {object} A record
 */
export function experimentRecord(result, name, slim = false) {
  const kept = slim ? withoutTrials(result) : result;
  return {
    format: MADE_FORMAT,
    formatVersion: MADE_VERSION,
    id: newId(),
    kind: 'experiment',
    from: 'runner',
    name: str(name, 120) || 'Experiment',
    savedAt: new Date().toISOString(),
    app: str(result?.engine?.app, 40) || buildOf(),
    attachedTo: [],
    experiment: {
      hash: str(result?.hash, 64),
      engine: isObj(result?.engine)
        ? {
            fingerprint: str(result.engine.fingerprint, 16) || null,
            app: str(result.engine.app, 40) || null,
          }
        : null,
      result: JSON.parse(JSON.stringify(kept)),
    },
  };
}

/**
 * Whether a value is a record this build can read, with the reason if not.
 * @param {*} v
 * @returns {{ok: boolean, record?: object, reason?: string}}
 */
export function readMade(v) {
  if (!isObj(v) || v.format !== MADE_FORMAT)
    return { ok: false, reason: 'format' };
  if (!Number.isInteger(v.formatVersion) || v.formatVersion > MADE_VERSION)
    return { ok: false, reason: 'newer' };
  if (typeof v.id !== 'string' || !/^[a-z0-9-]{3,40}$/.test(v.id))
    return { ok: false, reason: 'id' };
  const attached = Array.isArray(v.attachedTo)
    ? v.attachedTo.filter(x => typeof x === 'string').slice(0, 60)
    : [];
  const base = {
    format: MADE_FORMAT,
    formatVersion: MADE_VERSION,
    id: v.id,
    from: str(v.from, 20),
    name: str(v.name, 120) || v.id,
    savedAt: str(v.savedAt, 40) || null,
    app: str(v.app, 40) || null,
    attachedTo: attached,
  };
  if (v.kind === 'scenario') {
    const s = v.scenario;
    if (!isObj(s) || typeof s.link !== 'string' || !FRAGMENT.test(s.link))
      return { ok: false, reason: 'scenario' };
    return {
      ok: true,
      record: {
        ...base,
        kind: 'scenario',
        scenario: {
          id: str(s.id, 120) || null,
          seed: str(String(s.seed ?? ''), 80),
          settings: isObj(s.settings) ? s.settings : {},
          bodies: Number.isInteger(s.bodies) ? s.bodies : null,
          link: s.link,
          derivedFrom: identityOf(s.derivedFrom),
          ...(isObj(s.system) ? { system: s.system } : {}),
        },
      },
    };
  }
  if (v.kind === 'experiment') {
    const e = v.experiment;
    if (!isObj(e) || !isObj(e.result?.manifest))
      return { ok: false, reason: 'experiment' };
    return {
      ok: true,
      record: {
        ...base,
        kind: 'experiment',
        experiment: {
          hash: str(e.hash, 64),
          engine: isObj(e.engine)
            ? {
                fingerprint: str(e.engine.fingerprint, 16) || null,
                app: str(e.engine.app, 40) || null,
              }
            : null,
          result: e.result,
        },
      },
    };
  }
  return { ok: false, reason: 'kind' };
}

const keyOf = id => `${MADE_PREFIX}${id}`;
const reasonOf = e =>
  e?.reason || (e?.name === 'QuotaExceededError' ? 'quota' : 'unavailable');

/**
 * Keep a record. An experiment too large to keep whole is kept without its
 * trials (the downloaded file has them), and says so.
 * @param {object} record
 * @param {Storage} [storage]
 * @returns {{ok: boolean, reason?: string, slim?: boolean, record: object}}
 */
export function saveMade(record, storage) {
  const attempt = r => {
    try {
      const text = JSON.stringify(r);
      // The limit local.js states for the collection. Written here rather than
      // reached through it: this module is imported from the Sandbox, and a
      // second importer would split local.js into a chunk of its own that
      // every lesson then fetches (STORAGE.md, "Still direct").
      if (text.length > ITEM_LIMIT)
        throw Object.assign(new Error('made: record too large'), {
          name: 'QuotaExceededError',
          reason: 'itemTooLarge',
        });
      (storage ?? globalThis.localStorage).setItem(keyOf(r.id), text);
      return null;
    } catch (e) {
      return reasonOf(e);
    }
  };
  let reason = attempt(record);
  if (reason === 'itemTooLarge' && record.kind === 'experiment') {
    const slim = {
      ...record,
      experiment: {
        ...record.experiment,
        result: withoutTrials(record.experiment.result),
      },
    };
    reason = attempt(slim);
    return reason
      ? { ok: false, reason, record }
      : { ok: true, slim: true, record: slim };
  }
  return reason ? { ok: false, reason, record } : { ok: true, record };
}

/** Every record kept, newest first. A damaged or newer one is left out. */
export function listMade(storage) {
  const s = storage ?? globalThis.localStorage;
  const out = [];
  try {
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (!k?.startsWith(MADE_PREFIX)) continue;
      try {
        const r = readMade(JSON.parse(s.getItem(k)));
        if (r.ok) out.push(r.record);
      } catch {
        /* a damaged record is skipped */
      }
    }
  } catch {
    /* no storage: nothing is kept */
  }
  return out.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
}

/** Where a record opens: the Sandbox on its link, or the experiment runner. */
export const hrefOf = r =>
  r.kind === 'scenario' ? `/#${r.scenario.link}` : '/experiments/';

/** The file a record stands for: the builder's system file, or the result. */
export function fileOf(r) {
  const slug =
    r.name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'made';
  if (r.kind === 'experiment')
    return {
      name: `experiment-${r.experiment.hash || slug}.json`,
      json: r.experiment.result,
    };
  return r.scenario.system
    ? { name: `${slug}.gravitas-system.json`, json: r.scenario.system }
    : null;
}

/**
 * The things attached to some notebook entries, for a report.
 * @param {string[]} entryIds
 * @param {Storage} [storage]
 * @returns {object[]} Records, newest first
 */
export function attachedTo(entryIds, storage) {
  const want = new Set(entryIds);
  return listMade(storage).filter(r => r.attachedTo.some(id => want.has(id)));
}
