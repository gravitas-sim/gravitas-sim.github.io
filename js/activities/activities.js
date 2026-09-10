// =============================================================================
// Turning an activity format into something a student can open
// -----------------------------------------------------------------------------
// A format is a lesson id and a list of that lesson's permanent step ids. What
// a student opens is an ordinary assignment, built by js/assignments/, and
// everything below is the short walk between the two.
//
// Doing it this way rather than writing a second runner is what makes the hard
// parts already solved. resolveSelection() pulls in the setup a chosen step
// needs and every step it refers back to, to a fixed point, and reports what it
// added. Progress is stored under the assignment's id, so the demonstration and
// the full lab cannot mark each other complete. Steps travel as ids with
// structural fingerprints, so a question rewritten under the same id is
// detected instead of silently collecting an answer to a different question.
//
// The ids are fixed
// -----------------------------------------------------------------------------
// assignmentIdFor() derives an id from the lesson, the steps and the title, and
// prefixes it with today's date - right for an instructor issuing a worksheet,
// wrong here. A built-in activity has to keep the same id from one term to the
// next or a student's answers would vanish whenever the calendar turned over,
// so each format names its own and buildAssignment() is handed it.
// =============================================================================

import {
  buildAssignment,
  resolveSelection,
} from '../assignments/assignment.js';
import { stepFingerprint } from '../investigations/progressBackup.js';
import { activityById, formatById } from '../data/activities.js';

/** What went wrong, for a caller that has to show something useful. */
export const LAUNCH = Object.freeze({
  NO_ACTIVITY: 'no-activity',
  NO_FORMAT: 'no-format',
  NO_LESSON: 'no-lesson',
  NO_STEPS: 'no-steps',
});

/**
 * The assignment payload for one format.
 *
 * @param {object} lesson - The merged lesson, from the registry
 * @param {object} activity - From js/data/activities.js
 * @param {object} format - One of its formats
 * @param {string} [title] - The activity's title in the reader's language
 * @param {string} [intro] - The format's own opening, in the same
 * @returns {{ok: boolean, reason?: string, assignment?: object,
 *   added?: Array<object>, unknown?: Array<string>}} The payload, or why not
 */
export function assignmentForFormat(lesson, activity, format, title, intro) {
  if (!activity) return { ok: false, reason: LAUNCH.NO_ACTIVITY };
  if (!format) return { ok: false, reason: LAUNCH.NO_FORMAT };
  if (!lesson || !Array.isArray(lesson.steps) || !lesson.steps.length) {
    return { ok: false, reason: LAUNCH.NO_LESSON };
  }

  const resolved = resolveSelection(lesson, format.steps);
  if (!resolved.sids.length) return { ok: false, reason: LAUNCH.NO_STEPS };

  const assignment = buildAssignment({
    lesson,
    chosen: format.steps,
    title: title || activity.id,
    intro: intro || '',
    // Fixed, so a student keeps their work across terms. See the header.
    id: format.assignmentId,
    fingerprint: stepFingerprint,
  });

  return {
    ok: true,
    assignment,
    // The steps the resolver had to add - a setup, or a measurement a later
    // step refers back to. Surfaced rather than swallowed: they are part of
    // what the format actually runs, and the duration estimate has to cover
    // them.
    added: resolved.added,
    unknown: resolved.unknown,
  };
}

/**
 * The steps a format will actually run, in lesson order.
 *
 * The authored list plus whatever the resolver adds. Used by the validator, by
 * the instructor materials and by the tests, none of which should be guessing
 * at it from the authored list alone.
 *
 * @param {object} lesson - The merged lesson
 * @param {object} format - One of an activity's formats
 * @returns {{sids: Array<string>, added: Array<object>, unknown: Array<string>}}
 */
export function resolvedSteps(lesson, format) {
  return resolveSelection(lesson, format?.steps || []);
}

/**
 * Read an activity and format out of a query string.
 *
 * Both are optional and either can be wrong. A caller gets back what it can
 * use and a reason for what it cannot, because the difference between "no
 * activity was asked for" and "an activity was asked for and does not exist"
 * is the difference between showing the list and saying so.
 *
 * @param {string|URLSearchParams} query - location.search, or the parsed form
 * @returns {{activity: ?object, format: ?object, asked: boolean,
 *   reason: ?string, requested: {activity: ?string, format: ?string}}}
 */
export function routeFor(query) {
  const params =
    typeof query === 'string'
      ? new URLSearchParams(query)
      : query || new URLSearchParams();
  const wantedActivity = params.get('activity');
  const wantedFormat = params.get('format');
  const requested = { activity: wantedActivity, format: wantedFormat };

  if (!wantedActivity) {
    return {
      activity: null,
      format: null,
      asked: false,
      reason: null,
      requested,
    };
  }

  const activity = activityById(wantedActivity);
  if (!activity) {
    return {
      activity: null,
      format: null,
      asked: true,
      reason: LAUNCH.NO_ACTIVITY,
      requested,
    };
  }

  if (!wantedFormat) {
    return { activity, format: null, asked: true, reason: null, requested };
  }

  const format = formatById(activity, wantedFormat);
  if (!format) {
    // The activity is real and the format is not: show the activity with its
    // formats rather than nothing, and say which one was not found.
    return {
      activity,
      format: null,
      asked: true,
      reason: LAUNCH.NO_FORMAT,
      requested,
    };
  }

  return { activity, format, asked: true, reason: null, requested };
}

/** The canonical query string for an activity, or an activity and format. */
export function routeTo(activityId, formatId) {
  const params = new URLSearchParams();
  if (activityId) params.set('activity', activityId);
  if (formatId) params.set('format', formatId);
  const query = params.toString();
  return query ? `?${query}` : '';
}
