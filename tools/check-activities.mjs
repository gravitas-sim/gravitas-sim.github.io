#!/usr/bin/env node
// =============================================================================
// Are the classroom activities coherent?
// -----------------------------------------------------------------------------
//   npm run activities:check
//
// An activity points at steps in a lesson by permanent id. Nothing stops a
// lesson being revised underneath it: a step renamed, a scenario retuned, a
// measurement removed. At run time that degrades gracefully - the assignment
// machinery classifies a step as missing or changed and says so - but a
// built-in activity shipped with the application should not be relying on that
// politeness. It should fail a build.
//
// So this resolves every format against the real lesson and the real scenario
// catalogue and checks the things that would otherwise be found by a class:
// that every step id exists, that ids are unique, that a format still has steps
// after resolution, that the physical claims a format is entitled to make are
// still true of the scenario it opens, that every message id it names exists in
// both languages, and that the duration estimates are labelled as estimates.
// =============================================================================

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const { ACTIVITIES, allFormats } = await import(
  `${REPO}/js/data/activities.js`
);
const { resolvedSteps } = await import(`${REPO}/js/activities/activities.js`);
const { INVESTIGATIONS } = await import(`${REPO}/js/data/investigations.js`);
const { SCENARIO_INFO } = await import(`${REPO}/js/data/scenarioInfo.js`);
const { EN_TEACHING } = await import(`${REPO}/js/i18n/en.teaching.js`);
const { ES_TEACHING } = await import(`${REPO}/js/i18n/es.teaching.js`);

const problems = [];
const note = (where, what) => problems.push(`${where}: ${what}`);

/** Every message id an activity or format names. */
function messageIds(activity) {
  const ids = [
    activity.titleId,
    activity.questionId,
    activity.audienceId,
    activity.prerequisitesId,
    ...activity.objectiveIds,
  ];
  for (const format of activity.formats) {
    ids.push(format.nameId, format.forId, format.introId, format.closingId);
  }
  return ids;
}

// The duration text is one template with the minutes substituted in, so this
// is checked once rather than once per format. It has to read as an estimate:
// none of these has been timed with a class.
for (const [lang, cat] of [
  ['English', EN_TEACHING],
  ['Spanish', ES_TEACHING],
]) {
  const text = cat['teach.activity.duration'];
  if (typeof text !== 'string') {
    note('durations', `no ${lang} teach.activity.duration`);
  } else if (!/about|approx|estimate|~|unos|aproximad|estimac/i.test(text)) {
    note(
      'durations',
      `the ${lang} duration "${text}" does not read as an estimate`
    );
  }
}

const seenActivities = new Set();
const seenAssignmentIds = new Set();

for (const activity of ACTIVITIES) {
  const where = `activity "${activity.id}"`;

  if (seenActivities.has(activity.id))
    note(where, 'two activities share an id');
  seenActivities.add(activity.id);

  const lesson = INVESTIGATIONS.find(l => l.id === activity.lesson);
  if (!lesson) {
    note(where, `names lesson "${activity.lesson}", which does not exist`);
    continue;
  }
  if (!Object.hasOwn(SCENARIO_INFO, activity.scenario)) {
    note(where, `names scenario "${activity.scenario}", which does not exist`);
  }

  for (const id of messageIds(activity)) {
    if (!Object.hasOwn(EN_TEACHING, id))
      note(where, `no English message "${id}"`);
    if (!Object.hasOwn(ES_TEACHING, id))
      note(where, `no Spanish message "${id}"`);
  }

  if (!activity.objectiveIds.length || activity.objectiveIds.length > 3) {
    note(where, 'wants two or three observable objectives');
  }

  const sids = new Set(lesson.steps.map(s => s.sid));
  const seenFormats = new Set();

  for (const format of activity.formats) {
    const fw = `${where}, format "${format.id}"`;

    if (seenFormats.has(format.id)) note(fw, 'two formats share an id');
    seenFormats.add(format.id);

    if (seenAssignmentIds.has(format.assignmentId)) {
      note(
        fw,
        `assignment id "${format.assignmentId}" is used twice - two
        formats would share one progress namespace`.replace(/\s+/g, ' ')
      );
    }
    seenAssignmentIds.add(format.assignmentId);

    if (!format.steps.length) note(fw, 'has no steps');
    const dupes = format.steps.filter((s, i) => format.steps.indexOf(s) !== i);
    if (dupes.length) note(fw, `lists ${dupes.join(', ')} more than once`);

    for (const sid of format.steps) {
      if (!sids.has(sid)) note(fw, `names step "${sid}", which does not exist`);
    }

    const resolvedFormat = resolvedSteps(lesson, format);
    if (resolvedFormat.unknown.length) {
      note(fw, `unresolvable steps: ${resolvedFormat.unknown.join(', ')}`);
    }
    if (!resolvedFormat.sids.length) note(fw, 'resolves to no steps at all');

    // A format that resolves to far more than it asked for is not the format
    // its duration claims to be.
    const grew = resolvedFormat.sids.length - format.steps.length;
    if (grew > format.steps.length) {
      note(
        fw,
        `asks for ${format.steps.length} steps and resolves to ` +
          `${resolvedFormat.sids.length}; the estimate cannot be right`
      );
    }

    if (!Number.isFinite(format.minutes) || format.minutes <= 0) {
      note(fw, 'has no usable duration estimate');
    }

    // The duration has to read as an estimate in both languages. A number
    // presented as fact is the one thing the brief for this was explicit
    // about, and it is cheap to check.
  }

  // The claims the formats are entitled to make, against the lesson that
  // backs them. Checked here rather than trusted: `sweptArea` is the
  // difference between demonstrating the second law and asserting it.
  if (activity.physics?.sweptArea) {
    const hasWedges = lesson.steps.some(s => s.type === 'wedges');
    if (!hasWedges) {
      note(
        where,
        'claims a swept-area demonstration, but the lesson has no wedges step'
      );
    }
  }
}

if (problems.length) {
  console.error('Classroom activities are not usable:\n');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const formats = allFormats();
console.log(
  `Classroom activities OK: ${ACTIVITIES.length} activity, ` +
    `${formats.length} formats, all steps resolve.`
);
for (const { activity, format } of formats) {
  const lesson = INVESTIGATIONS.find(l => l.id === activity.lesson);
  const r = resolvedSteps(lesson, format);
  const added = r.added.length ? ` (+${r.added.length} required)` : '';
  console.log(
    `  ${activity.id}/${format.id}: ${format.steps.length} chosen, ` +
      `${r.sids.length} run${added}, ~${format.minutes} min`
  );
}
