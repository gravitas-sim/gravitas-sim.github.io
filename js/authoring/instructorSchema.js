// =============================================================================
// One shape for instructor content, checked before anything renders it
// -----------------------------------------------------------------------------
// js/instructorDocs.js reads `c.flow.map(f => [f.steps, f.text])` and
// `c.features.map(f => [f.name, f.text])`. Both are correct for the shape they
// expect and silent for any other: a flow entry written `{steps, title, detail}`
// yields `undefined` for the text, and the PDF gets a table with its step
// ranges in the left column and nothing at all in the right. Three guides
// shipped that way, and two more had a features table with no rows in it.
//
// The same silence in the other direction cost more. `teachingNotes` was a
// plain string in one lesson instead of an array of them, and `doc.bullets()`
// iterates its argument - so a string became one bullet per character. That
// guide went out at 27 pages, 590 of them bullets reading "T", "w", "o". The
// test that should have caught it asserted `teachingNotes.length >= 4`, which
// a 900-character string passes without being an array at all.
//
// So the shapes are declared here rather than assumed at each call site, and a
// mismatch is a build failure with the lesson, the field and the fix in it.
// =============================================================================

/**
 * What each field has to be.
 *
 * `kind` is one of:
 *   text     a non-empty string, at least `min` characters
 *   list     an array of non-empty strings
 *   records  an array of objects with exactly `label` and `body` as keys
 *   object   a plain object (the shape of its values is checked elsewhere)
 *
 * A record's two halves are held to different lengths on purpose. `label` is a
 * heading or a step range - "The chirp", "18-22" - and a minimum written for
 * prose would reject every good one of them. `body` is the sentence an
 * instructor reads, and that is where thinness matters.
 */
export const INSTRUCTOR_SCHEMA = Object.freeze({
  topic: { kind: 'text', min: 3 },
  difficulty: { kind: 'text', min: 3 },
  placement: { kind: 'text', min: 40 },
  overview: { kind: 'text', min: 200 },
  priorKnowledge: { kind: 'list', min: 3, each: 10 },
  keyConcepts: {
    kind: 'records',
    label: 'heading',
    body: 'body',
    min: 3,
    labelMin: 3,
    bodyMin: 40,
  },
  flow: {
    kind: 'records',
    label: 'steps',
    body: 'text',
    min: 4,
    labelMin: 1,
    bodyMin: 20,
  },
  features: {
    kind: 'records',
    label: 'name',
    body: 'text',
    min: 3,
    labelMin: 3,
    bodyMin: 20,
  },
  misconceptions: {
    kind: 'records',
    label: 'claim',
    body: 'response',
    min: 4,
    labelMin: 10,
    bodyMin: 20,
  },
  teachingNotes: { kind: 'list', min: 4, each: 40 },
  discussion: { kind: 'list', min: 3, each: 20 },
  extensions: { kind: 'list', min: 2, each: 20 },
  modelNotes: { kind: 'text', min: 120 },
  expectations: { kind: 'object' },
});

const isPlainObject = v =>
  Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/**
 * Everything wrong with one lesson's instructor content.
 *
 * Each problem names the lesson, the field, what was found and what was
 * expected, because the failure this replaces was a blank table in a PDF
 * nobody opened.
 *
 * @param {string} id - Lesson id
 * @param {object} content - The entry from INSTRUCTOR_CONTENT
 * @param {object} [options] - `steps` is the lesson's step count, when known
 * @returns {string[]} Problems, empty when the content is canonical
 */
export function checkInstructorContent(id, content, { steps = 0 } = {}) {
  const problems = [];
  const say = m => problems.push(`${id}: ${m}`);

  if (!isPlainObject(content)) {
    say('instructor content is not an object');
    return problems;
  }

  for (const [field, rule] of Object.entries(INSTRUCTOR_SCHEMA)) {
    const value = content[field];

    if (rule.kind === 'object') {
      if (!isPlainObject(value)) say(`${field} must be an object`);
      continue;
    }

    if (rule.kind === 'text') {
      if (typeof value !== 'string') {
        say(`${field} must be a string, not ${describe(value)}`);
      } else if (value.trim().length < rule.min) {
        say(
          `${field} is ${value.trim().length} characters; at least ${rule.min} are expected`
        );
      }
      continue;
    }

    // Both remaining kinds are arrays, and "it has a .length" is not the same
    // question as "it is an array" - which is the bug this whole file is about.
    if (!Array.isArray(value)) {
      say(
        `${field} must be an array, not ${describe(value)}. ` +
          (typeof value === 'string'
            ? 'A string here renders as one bullet per character.'
            : 'The renderer will read nothing from it.')
      );
      continue;
    }
    if (value.length < rule.min) {
      say(
        `${field} has ${value.length} entr${value.length === 1 ? 'y' : 'ies'}; at least ${rule.min} are expected`
      );
    }

    value.forEach((entry, i) => {
      const at = `${field}[${i}]`;
      if (rule.kind === 'list') {
        if (typeof entry !== 'string') {
          say(`${at} must be a string, not ${describe(entry)}`);
        } else if (entry.trim().length < rule.each) {
          say(
            `${at} is ${entry.trim().length} characters; at least ${rule.each} are expected`
          );
        }
        return;
      }
      const keys = [rule.label, rule.body];
      if (!isPlainObject(entry)) {
        say(
          `${at} must be an object with ${keys.join(' and ')}, not ${describe(entry)}`
        );
        return;
      }
      const found = Object.keys(entry).sort();
      const wanted = [...keys].sort();
      if (found.join(',') !== wanted.join(',')) {
        say(
          `${at} has {${found.join(', ')}} but the renderer reads {${wanted.join(', ')}}. ` +
            'A key the renderer does not know produces a blank cell rather than an error.'
        );
        return;
      }
      for (const [key, least] of [
        [rule.label, rule.labelMin],
        [rule.body, rule.bodyMin],
      ]) {
        const text = entry[key];
        if (typeof text !== 'string' || !text.trim()) {
          say(`${at}.${key} is empty`);
        } else if (text.trim().length < least) {
          say(
            `${at}.${key} is ${text.trim().length} characters; at least ${least} are expected`
          );
        }
      }
    });
  }

  // A flow range or a prose reference to a screen the lesson does not have.
  // Appending one closing step to five lessons left every one of their flow
  // tables one screen short, and nothing said so until a test was asked.
  if (steps > 0 && Array.isArray(content.flow)) {
    for (const block of content.flow) {
      for (const n of String(block?.steps ?? '').match(/\d+/g) || []) {
        if (Number(n) < 1 || Number(n) > steps) {
          say(`flow names screen ${n}, and the lesson has ${steps}`);
        }
      }
    }
  }

  return problems;
}

/** @param {*} v - Any value @returns {string} What it is, for a message */
function describe(v) {
  if (v === undefined) return 'nothing (the field is missing)';
  if (v === null) return 'null';
  if (Array.isArray(v)) return `an array of ${v.length}`;
  return `a ${typeof v}`;
}

/**
 * Check the whole catalog.
 *
 * @param {object} catalog - INSTRUCTOR_CONTENT
 * @param {object} [lessons] - Lesson id -> step count, for the range check
 * @returns {string[]} Every problem, across every lesson
 */
export function checkInstructorCatalog(catalog, lessons = {}) {
  const problems = [];
  for (const [id, content] of Object.entries(catalog)) {
    problems.push(
      ...checkInstructorContent(id, content, { steps: lessons[id] ?? 0 })
    );
  }
  return problems;
}
