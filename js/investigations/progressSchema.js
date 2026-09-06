// =============================================================================
// What a lesson's saved progress is, and how older saves become it
// -----------------------------------------------------------------------------
// Progress used to be keyed by a step's position: `tides:7` meant "the eighth
// screen of Tides". Position is not identity. Insert a step at the top and
// every answer below it now belongs to the question above the one it answers -
// silently, and plausibly, because the answers are still there and still look
// like answers.
//
// The first attempt at fixing that matched steps by a *structural fingerprint*
// built from type, kind, widget id, scenario and field ids. That is not an
// identity either. In `detect-this-planet`, steps 1 and 5 are both four-option
// predict steps, so their fingerprints are the same string; swapping them moved
// one answer onto the other's question and reported nothing moved. Steps 2, 6
// and 9 collide the same way, as do 4 and 10, and 12 and 14.
//
// So identity is now an explicit `sid` written into the lesson and never
// changed: minted by tools/add-step-ids.mjs, enforced by author:check, and
// listed in STRUCTURAL so a translation cannot supply one. It survives
// reordering, rewording and translation, because it is derived from none of
// them.
//
// This module owns the stored shape and the migration into it. It is pure and
// DOM-free so the migration can be tested directly, which matters more here
// than usual: a migration bug is not a broken screen, it is a student's work
// quietly attached to the wrong questions.
// =============================================================================

/**
 * The stored shape's version.
 *
 * 1: implicit (no `schema` key). Keyed by step index; `visited` and `stepIndex`
 *    are indices.
 * 2: keyed by step sid; `visited` is a list of sids and the position is
 *    `stepSid`. A numeric answer gained a `:locale` sub-key recording the
 *    convention it was typed under. That was deliberately additive rather than
 *    a version 3: a build without the sub-key reads such a payload correctly
 *    apart from the locale, whereas bumping the version would make every older
 *    build refuse an entire lesson's progress to fix one field. Answers stored
 *    before it existed have no `:locale`, and the reader falls back - see
 *    localeOfAnswer in js/answerParse.js.
 */
export const PROGRESS_SCHEMA = 2;

/** Anything newer than this we do not understand and must not rewrite. */
export const MAX_READABLE_SCHEMA = PROGRESS_SCHEMA;

/**
 * The response-key prefix for one step.
 *
 * Sub-keys hang off it with a further colon - `:shown`, `:tool:<control>`,
 * `:<fieldId>` - which is why a sid may not contain one.
 *
 * @param {string} lessonId - The lesson
 * @param {string} sid - The step's stable id
 * @returns {string} The key prefix
 */
export const stepKey = (lessonId, sid) => `${lessonId}:${sid}`;

/**
 * Whether a value is usable as a stable step id.
 *
 * Rejects anything numeric so that a v1 payload and a v2 payload can never be
 * confused for one another, and anything containing a colon so the sub-key
 * scheme above stays unambiguous.
 *
 * @param {*} sid - Candidate
 * @returns {boolean} Whether it is well formed
 */
export const isValidSid = sid =>
  typeof sid === 'string' &&
  sid.length > 0 &&
  sid.length <= 80 &&
  !sid.includes(':') &&
  !/^\d+$/.test(sid);

/** @param {object} lesson - A merged lesson @returns {Array<string>} Its sids, in order */
export const sidsOf = lesson =>
  Array.isArray(lesson?.steps) ? lesson.steps.map(s => s?.sid) : [];

/**
 * Index of a step by its sid.
 *
 * @param {object} lesson - A merged lesson
 * @param {string} sid - The step's stable id
 * @returns {number} Its index, or -1
 */
export const indexOfSid = (lesson, sid) => sidsOf(lesson).indexOf(sid);

/** The shape `readProgress` returns when there is nothing usable to read. */
const EMPTY = () => ({
  responses: {},
  attempts: {},
  visited: new Set(),
  stepSid: null,
  startedAt: null,
  schema: PROGRESS_SCHEMA,
  migrated: false,
  notes: [],
});

/**
 * Re-key a v1 payload from indices onto sids.
 *
 * The only information a v1 payload carries about which step an answer belongs
 * to is its position, so position is what the migration has to use. That is
 * right whenever the lesson has not been reordered since the save, which is the
 * ordinary case, and wrong if it has - and nothing in the payload distinguishes
 * the two.
 *
 * So the migration does it, says it did, and does not destroy the original: the
 * caller keeps the v1 blob under a separate key and surfaces `notes` to the
 * reader. That is the difference between reporting uncertainty and guessing.
 *
 * @param {object} data - The parsed v1 payload
 * @param {object} lesson - The lesson as it is today
 * @returns {object} The same shape `readProgress` returns
 */
export function migrateFromV1(data, lesson) {
  const sids = sidsOf(lesson);
  const out = EMPTY();
  out.migrated = true;

  const lessonId = lesson?.id;
  const rekeyed = {};
  let carried = 0;
  let orphaned = 0;

  /** `<lesson>:<index>` and `<lesson>:<index>:<rest>` -> `<lesson>:<sid>...` */
  const rekey = key => {
    const prefix = `${lessonId}:`;
    if (!key.startsWith(prefix)) return null;
    const rest = key.slice(prefix.length);
    const cut = rest.indexOf(':');
    const head = cut === -1 ? rest : rest.slice(0, cut);
    const tail = cut === -1 ? '' : rest.slice(cut);
    if (!/^\d+$/.test(head)) return null;
    const sid = sids[Number(head)];
    return sid ? `${prefix}${sid}${tail}` : null;
  };

  for (const [key, value] of Object.entries(data?.responses || {})) {
    const next = rekey(key);
    if (next) {
      rekeyed[next] = value;
      carried++;
    } else {
      orphaned++;
    }
  }
  out.responses = rekeyed;

  const attempts = {};
  for (const [key, value] of Object.entries(data?.attempts || {})) {
    const next = rekey(key);
    if (next) attempts[next] = value;
  }
  out.attempts = attempts;

  for (const i of Array.isArray(data?.visited) ? data.visited : []) {
    const sid = sids[Number(i)];
    if (sid) out.visited.add(sid);
  }

  const at = Number(data?.stepIndex);
  out.stepSid = Number.isInteger(at) && sids[at] ? sids[at] : (sids[0] ?? null);
  out.startedAt = typeof data?.startedAt === 'string' ? data.startedAt : null;

  if (carried > 0) {
    out.notes.push({
      code: 'migratedByPosition',
      carried,
      // Stated rather than resolved: the payload cannot tell us whether the
      // lesson was edited between the save and now.
      certain: false,
    });
  }
  if (orphaned > 0) out.notes.push({ code: 'orphanedKeys', orphaned });
  return out;
}

/**
 * Read whatever is in storage into the shape the engine works with.
 *
 * Total: every malformed, truncated, hand-edited or future payload produces an
 * empty result and a note rather than a throw, because the alternative is a
 * lesson that will not open.
 *
 * @param {*} data - The parsed payload, or anything at all
 * @param {object} lesson - The lesson as it is today
 * @returns {{responses: object, attempts: object, visited: Set<string>,
 *   stepSid: ?string, startedAt: ?string, schema: number, migrated: boolean,
 *   notes: Array<object>}} The progress
 */
export function readProgress(data, lesson) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return EMPTY();

  const schema = Number(data.schema);
  if (!Number.isFinite(schema)) return migrateFromV1(data, lesson);

  if (schema > MAX_READABLE_SCHEMA) {
    // A newer build wrote this. Refusing to read it is right; refusing to
    // *overwrite* it is the caller's job, and is why this is a note and not
    // silence.
    const out = EMPTY();
    out.notes.push({ code: 'schemaTooNew', schema });
    return out;
  }

  const known = new Set(sidsOf(lesson));
  const out = EMPTY();
  out.schema = schema;

  const prefix = `${lesson?.id}:`;
  /** Keep only keys that name a step this lesson still has. */
  const keep = (source, into) => {
    let dropped = 0;
    for (const [key, value] of Object.entries(source || {})) {
      if (!key.startsWith(prefix)) {
        dropped++;
        continue;
      }
      const rest = key.slice(prefix.length);
      const cut = rest.indexOf(':');
      const sid = cut === -1 ? rest : rest.slice(0, cut);
      if (!known.has(sid)) {
        dropped++;
        continue;
      }
      into[key] = value;
    }
    return dropped;
  };

  const droppedResponses =
    data.responses &&
    typeof data.responses === 'object' &&
    !Array.isArray(data.responses)
      ? keep(data.responses, out.responses)
      : 0;
  if (data.attempts && typeof data.attempts === 'object') {
    keep(data.attempts, out.attempts);
  }

  for (const sid of Array.isArray(data.visited) ? data.visited : []) {
    if (known.has(sid)) out.visited.add(sid);
  }

  out.stepSid = known.has(data.stepSid)
    ? data.stepSid
    : (sidsOf(lesson)[0] ?? null);
  out.startedAt = typeof data.startedAt === 'string' ? data.startedAt : null;

  // A step that has been removed from the lesson since the save. The answer is
  // gone from the working set and the reader is told how much.
  if (droppedResponses > 0) {
    out.notes.push({ code: 'removedSteps', dropped: droppedResponses });
  }
  return out;
}

/**
 * The object to persist.
 *
 * @param {object} state - {lesson, responses, attempts, visited, stepSid, startedAt}
 * @returns {object} A serializable v2 payload
 */
export function writeProgress({
  lesson,
  responses,
  attempts,
  visited,
  stepSid,
  startedAt,
}) {
  return {
    schema: PROGRESS_SCHEMA,
    lesson: lesson?.id ?? null,
    stepSid: stepSid ?? null,
    responses: { ...responses },
    attempts: { ...attempts },
    visited: [...(visited || [])],
    startedAt: startedAt ?? null,
  };
}
