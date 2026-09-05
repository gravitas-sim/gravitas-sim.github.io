// =============================================================================
// The authoring rules
// -----------------------------------------------------------------------------
// One rule set, four callers: `npm run author:check` prints it for an author,
// tests/authoring.test.js fails CI on it, the authoring preview shows an author
// the findings for the step they are looking at, and the browser walker reads
// the same catalogue so that what it exercises and what this judges cannot
// diverge.
//
// It lives in js/ rather than in tools/ because the preview runs it in a
// browser. Nothing here touches the filesystem or the DOM: the catalogue and
// everything it is checked against arrive as arguments, gathered by
// tools/authoring/inputs.mjs in Node and by the panel itself in the browser.
//
// A rule is a generator of findings. Every finding carries the rule that raised
// it, so `npm run author:check --rules` can list what is enforced and an author
// can silence a false positive by arguing with a specific rule rather than with
// the tool.
//
// Two levels only:
//
//   error  the lesson is wrong, and a student or an instructor would meet it
//   warn   the lesson is odd, and a human should look
//
// The bar for `error` is that a reasonable author, shown the finding, would
// agree it must be fixed before shipping. Everything else is a warning, because
// a checker that cries wolf gets a --no-verify and then it is checking nothing.
// =============================================================================

import { checkAnswer, toleranceFor } from '../answerCheck.js';
import { verifyKey } from '../answerKey.js';
import {
  mergeTranslation,
  translationCoverage,
} from '../data/investigations/i18n.js';

/**
 * Step types the engine knows how to render.
 *
 * The last two are bespoke to Kepler's Laws - an interactive ellipse and the
 * equal-area wedges - and are rendered by name in js/investigations.js rather
 * than through the generic path. They are listed because they exist, not
 * because they are a pattern to copy: a new lesson should reach for a widget.
 */
export const STEP_TYPES = new Set([
  'read',
  'predict',
  'explore',
  'measure',
  'question',
  'ellipse',
  'wedges',
]);

/** Question kinds the grader knows how to judge. */
export const QUESTION_KINDS = new Set(['choice', 'short', 'numeric']);

/** Instructor-guide sections that must exist and carry something. */
export const INSTRUCTOR_REQUIRED = [
  'topic',
  'difficulty',
  'placement',
  'overview',
  'priorKnowledge',
  'keyConcepts',
  'flow',
  'features',
  'misconceptions',
  'teachingNotes',
  'discussion',
  'extensions',
  'modelNotes',
  'expectations',
];

/** Manifest fields that must equal the lesson's own. */
const MANIFEST_MIRRORED = [
  'title',
  'subtitle',
  'duration',
  'level',
  'summary',
  'thumbnail',
];

/** What each rule is for, printed by --rules. */
export const RULE_INDEX = {
  'id/lesson': 'Lesson ids exist, are kebab-case, and are unique',
  'id/file': 'A lesson lives in a file named after its id',
  'id/step': 'Derived step ids are unique within a lesson',
  'id/field': 'Response field ids are unique within a step and usable as keys',
  'content/lesson': 'Title, subtitle, duration, level, summary and thumbnail',
  'content/objectives': 'Objectives exist and say something',
  'content/duration': 'Duration is a range the card can print',
  'content/step': 'Every step has a title and a body',
  'content/completion': 'A lesson ends on a step that closes it',
  'content/prompt': 'A step that asks for something says what',
  'ref/scenario': 'setup.scenario names a scenario in the catalog',
  'ref/widget': 'tool.id names a registered widget',
  'ref/control': 'tool.values and tool.hide name controls the widget has',
  'ref/action': 'A step that expects an action names one the widget handles',
  'ref/setting': 'setup.settings keys are real settings',
  'ref/probe': 'A probe is a function, and survives being called',
  'ref/field': 'compute and validate read fields the step itself declares',
  'setup/value': 'Preset control values are inside the control range',
  'setup/camera': 'A camera setup is usable',
  'answer/shape': 'An answer is the shape its kind requires',
  'answer/tolerance': 'A numeric tolerance is positive, finite and meaningful',
  'answer/accepted': "The author's own answer is accepted by the grader",
  'answer/discriminates': 'The tolerance rejects something',
  'answer/options': 'An option list is long enough and has no repeats',
  'answer/rubric': 'A short answer carries a rubric',
  'interaction/validate': "A validator accepts the author's own hint values",
  'interaction/compute': 'A computed field survives the hint values',
  'interaction/checklist': 'A checklist asks for things',
  'interaction/animated': 'An animated widget can be rewound',
  'i18n/shape': 'A translation matches the shape of its lesson',
  'i18n/machinery': 'A translation never replaces machinery',
  'i18n/coverage': 'A translation is complete enough to ship',
  'instructor/present': 'Every lesson has instructor guidance',
  'instructor/sections': 'Every required guide section carries something',
  'instructor/expectations': 'Expectations point at steps that exist and grade',
  'instructor/attribution': 'A lesson that cites a source attributes it',
  'agree/manifest': 'The manifest says what the lesson says',
  'agree/counts': 'The manifest counts what the lesson contains',
  'agree/answerKey': 'The generated answer key verifies',
  'agree/instructorIds': 'Instructor guidance names lessons that exist',
};

const isNonEmptyString = v => typeof v === 'string' && v.trim().length > 0;
const isPlainObject = v => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * A stub of the live simulation context a probe is handed.
 *
 * Deliberately hostile: nothing selected, no elements, no bodies. A probe is
 * supposed to cope with that - it renders on the very first frame of a step,
 * before a student has clicked anything - so a probe that throws here would
 * throw in front of a class.
 */
function emptyProbeContext() {
  // Mirrors the object js/investigations.js builds. Kept in step with it by
  // tests/authoring.test.js, which fails if the engine grows a context member
  // this stub does not have: a probe calling something missing here would be
  // reported as a broken probe when the probe is fine and the stub is stale.
  return {
    selected: null,
    bodies: [],
    G: 1,
    elements: () => null,
    energy: () => null,
    distance: v => String(v),
    speed: v => String(v),
    time: v => String(v),
    mass: v => String(v),
    clock: () => 0,
    years: () => 0,
    au: v => v * 0.01,
    flux: () => 1,
    days: () => 0,
    observerAngle: () => 0,
    // Shaped as the real accessors shape them, empty rather than absent.
    // transitAnalysis() and rotationCurveState() always return an object, so a
    // stub handing back null would report every probe that reads one as broken
    // when the probe is right and the stub is wrong. clusterState() genuinely
    // can return null - fewer than three galaxies - so that one does.
    photometry: () => ({
      baseline: 1,
      transits: [],
      seen: 0,
      log: [],
      last: null,
    }),
    rotationCurve: () => ({
      bodies: [],
      center: { x: 0, y: 0, mass: 0 },
      points: [],
      G: 1,
      halo: null,
      mode: 'newtonian',
      a0: 0,
      rFitMin: 0,
      fit: null,
      visibleMass: 0,
      enclosedAtEdge: 0,
    }),
    cluster: () => null,
    haloOn: () => false,
    frame: () => ({ mode: 'world', objectId: null }),
    seenFrom: () => null,
    find: () => undefined,
    experiment: () => null,
  };
}

/** The context members the engine actually supplies, for the staleness test. */
export const PROBE_CONTEXT_KEYS = Object.keys(emptyProbeContext());

/** The hint values an author wrote against their own response fields. */
function hintValues(step) {
  const out = {};
  for (const f of step.fields || []) {
    if (f.hint === undefined || f.hint === null) continue;
    const n = Number(String(f.hint).replace(/[^0-9eE+\-.]/g, ''));
    if (Number.isFinite(n)) out[f.id] = n;
  }
  return out;
}

/**
 * Run every authoring rule.
 *
 * @param {object} inputs - From loadAuthoringInputs()
 * @returns {Array<object>} Findings, in catalogue order
 */
export function checkCatalogue(inputs, { skip = [] } = {}) {
  const findings = [];
  const {
    investigations,
    manifests,
    instructor,
    scenarios,
    settingKeys,
    widgets,
    translations,
    sources,
    gradedSteps,
  } = inputs;

  const widgetById = new Map(widgets.map(w => [w.id, w]));
  const scenarioNames = new Set(Object.keys(scenarios));
  const seenLessonIds = new Map();

  const add = (level, rule, lesson, stepIndex, message) => {
    findings.push({ level, rule, lesson, step: stepIndex, message });
  };

  for (const inv of investigations) {
    const L = inv.id || '(no id)';
    const err = (rule, i, m) => add('error', rule, L, i, m);
    const warn = (rule, i, m) => add('warn', rule, L, i, m);

    // --- Identity ------------------------------------------------------------
    if (!isNonEmptyString(inv.id)) {
      err('id/lesson', null, 'lesson has no id');
    } else {
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(inv.id)) {
        err('id/lesson', null, `id "${inv.id}" is not kebab-case`);
      }
      if (seenLessonIds.has(inv.id)) {
        err('id/lesson', null, `id "${inv.id}" is used by another lesson`);
      }
      seenLessonIds.set(inv.id, true);
      const src = sources[inv.id];
      if (src && src.text === null) {
        err('id/file', null, `no file at ${src.file} for lesson "${inv.id}"`);
      }
    }

    // --- Lesson-level content ------------------------------------------------
    for (const key of ['title', 'subtitle', 'duration', 'level', 'summary']) {
      if (!isNonEmptyString(inv[key])) {
        err('content/lesson', null, `lesson has no ${key}`);
      }
    }
    if (!isNonEmptyString(inv.thumbnail)) {
      err('content/lesson', null, 'lesson has no thumbnail');
    }
    if (
      isNonEmptyString(inv.duration) &&
      !/^\d+(-\d+)?\s*min$/.test(inv.duration)
    ) {
      warn(
        'content/duration',
        null,
        `duration "${inv.duration}" is not the "35-45 min" shape the cards print`
      );
    }
    if (!Array.isArray(inv.objectives) || inv.objectives.length === 0) {
      err('content/objectives', null, 'lesson states no objectives');
    } else {
      inv.objectives.forEach((o, i) => {
        if (!isNonEmptyString(o)) {
          err('content/objectives', null, `objective ${i + 1} is empty`);
        }
      });
    }

    const steps = Array.isArray(inv.steps) ? inv.steps : [];
    if (steps.length === 0) {
      err('content/step', null, 'lesson has no steps');
      continue;
    }

    // --- Step ids ------------------------------------------------------------
    // Positional, `${lesson}:${index}`, which cannot collide - but it is also
    // what saved progress and the instructor expectations are keyed by, so it
    // is asserted rather than assumed.
    const stepIds = steps.map((_, i) => `${inv.id}:${i}`);
    if (new Set(stepIds).size !== stepIds.length) {
      err('id/step', null, 'two steps derive the same id');
    }

    // --- Completion ----------------------------------------------------------
    const last = steps.at(-1);
    if (!isNonEmptyString(last.title) || !isNonEmptyString(last.body)) {
      err(
        'content/completion',
        steps.length - 1,
        'the last step does not close the lesson: it needs a title and a body'
      );
    }
    if (['question', 'measure', 'predict'].includes(last.type)) {
      warn(
        'content/completion',
        steps.length - 1,
        `lesson ends on a graded "${last.type}" step; every other lesson ends on a closing summary`
      );
    }

    steps.forEach((step, i) => {
      const at = i;
      const E = (rule, m) => err(rule, at, m);
      const W = (rule, m) => warn(rule, at, m);

      // --- Step content ------------------------------------------------------
      if (!STEP_TYPES.has(step.type)) {
        E('content/step', `unknown step type "${step.type}"`);
        return;
      }
      if (!isNonEmptyString(step.title)) E('content/step', 'step has no title');
      if (!isNonEmptyString(step.body)) E('content/step', 'step has no body');

      const asks = ['predict', 'question'].includes(step.type);
      if (asks && !isNonEmptyString(step.prompt)) {
        E('content/prompt', `a ${step.type} step asks nothing`);
      }

      // --- Scenario and settings --------------------------------------------
      if (step.setup) {
        const s = step.setup;
        if (s.scenario !== undefined) {
          if (!isNonEmptyString(s.scenario)) {
            E('ref/scenario', 'setup.scenario is empty');
          } else if (!scenarioNames.has(s.scenario)) {
            E('ref/scenario', `setup names no such scenario "${s.scenario}"`);
          }
        }
        if (s.settings !== undefined) {
          if (!isPlainObject(s.settings)) {
            E('ref/setting', 'setup.settings is not an object');
          } else {
            for (const key of Object.keys(s.settings)) {
              if (!settingKeys.has(key)) {
                E(
                  'ref/setting',
                  `setup.settings sets unknown setting "${key}"`
                );
              }
            }
          }
        }
        if (s.camera !== undefined) {
          if (!isPlainObject(s.camera)) {
            E('setup/camera', 'setup.camera is not an object');
          } else {
            if (s.camera.zoom !== undefined && !(s.camera.zoom > 0)) {
              E('setup/camera', `camera zoom ${s.camera.zoom} is not positive`);
            }
            if (s.camera.pan !== undefined) {
              const p = s.camera.pan;
              if (
                !isPlainObject(p) ||
                !Number.isFinite(p.x) ||
                !Number.isFinite(p.y)
              ) {
                E('setup/camera', 'camera pan is not a finite {x, y}');
              }
            }
          }
        }
        if (s.seed !== undefined && !isNonEmptyString(s.seed)) {
          E('setup/camera', 'setup.seed is not a usable seed string');
        }
        if (s.paused !== undefined && typeof s.paused !== 'boolean') {
          E('setup/camera', 'setup.paused is not a boolean');
        }
      }

      // --- Widgets -----------------------------------------------------------
      if (step.tool !== undefined) {
        if (!isPlainObject(step.tool)) {
          E('ref/widget', 'tool is not an object');
        } else {
          const w = widgetById.get(step.tool.id);
          if (!w) {
            E('ref/widget', `tool names no such widget "${step.tool.id}"`);
          } else {
            const controls = new Map((w.controls || []).map(c => [c.id, c]));

            for (const [key, raw] of Object.entries(step.tool.values || {})) {
              const c = controls.get(key);
              if (!c) {
                E(
                  'ref/control',
                  `tool.values sets "${key}", which ${w.id} has no control for`
                );
                continue;
              }
              const v = Number(raw);
              if (!Number.isFinite(v)) {
                E('setup/value', `tool.values.${key} is not a number`);
              } else if (v < c.min || v > c.max) {
                E(
                  'setup/value',
                  `tool.values.${key} = ${v} is outside the control range ${c.min}..${c.max}, so the widget can never reach it`
                );
              } else if (
                Number.isFinite(c.step) &&
                c.step > 0 &&
                !(step.tool.hide || []).includes(key)
              ) {
                // Only worth saying when the student can see the slider. A
                // hidden control set to a real measured value - a semi-major
                // axis of 0.04747 AU - is the lesson quoting a real system,
                // and there is no slider to fail to return to.
                const offGrid = Math.abs(
                  (v - c.min) / c.step - Math.round((v - c.min) / c.step)
                );
                if (offGrid > 1e-6) {
                  W(
                    'setup/value',
                    `tool.values.${key} = ${v} is not on the visible control's ${c.step} step, so a student who moves it cannot get back`
                  );
                }
              }
            }

            for (const key of step.tool.hide || []) {
              if (!controls.has(key)) {
                E(
                  'ref/control',
                  `tool.hide hides "${key}", which ${w.id} has no control for`
                );
              }
            }

            const wantsAction = ['record', 'run', 'reset', 'clear'].filter(a =>
              new RegExp(`\\b${a}\\b`, 'i').test(
                [step.tool.note, ...(step.checklist || [])]
                  .filter(Boolean)
                  .join(' ')
              )
            );
            const has = new Set(
              Array.isArray(w.actions) ? w.actions.map(a => a.id) : []
            );
            for (const a of wantsAction) {
              if (has.size > 0 && !has.has(a)) {
                W(
                  'ref/action',
                  `the step tells a student to "${a}" but ${w.id} handles only ${[...has].join(', ')}`
                );
              }
            }
          }
        }
      }

      // --- Probes ------------------------------------------------------------
      if (step.probe !== undefined) {
        if (typeof step.probe !== 'function') {
          E('ref/probe', 'probe is not a function');
        } else {
          try {
            const rows = step.probe(emptyProbeContext());
            if (!Array.isArray(rows)) {
              E(
                'ref/probe',
                'probe did not return a list of rows with nothing selected'
              );
            } else {
              for (const r of rows) {
                if (!isPlainObject(r) || !('label' in r)) {
                  E('ref/probe', 'a probe row has no label');
                  break;
                }
              }
            }
          } catch (e) {
            E('ref/probe', `probe throws with nothing selected: ${e.message}`);
          }
        }
      }

      // --- Response fields ---------------------------------------------------
      if (step.fields !== undefined) {
        if (!Array.isArray(step.fields) || step.fields.length === 0) {
          E('id/field', 'fields is not a non-empty list');
        } else {
          const ids = new Set();
          for (const f of step.fields) {
            if (!isNonEmptyString(f.id)) {
              E('id/field', 'a field has no id');
              continue;
            }
            if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(f.id)) {
              E('id/field', `field id "${f.id}" is not usable as a key`);
            }
            if (ids.has(f.id)) {
              E('id/field', `field id "${f.id}" appears twice in one step`);
            }
            ids.add(f.id);
            if (!isNonEmptyString(f.label)) {
              E('content/step', `field "${f.id}" has no label`);
            }
            if (f.compute !== undefined && typeof f.compute !== 'function') {
              E(
                'ref/field',
                `field "${f.id}" has a compute that is not a function`
              );
            }
          }

          // What a compute() actually reads.
          //
          // js/investigations.js evaluates a computed field against *this*
          // step's responses only - fieldValues() walks `step.fields` and
          // nothing else - so a compute that reaches for a field measured on an
          // earlier step gets undefined, produces NaN, and leaves the box
          // permanently blank. It looks like working code and it is dead:
          // Retrograde Motion shipped three of them, and only the browser
          // walker noticed until this rule existed.
          for (const f of step.fields) {
            if (typeof f.compute !== 'function') continue;
            const src = String(f.compute);
            const arg = /^\(?\s*([A-Za-z_$][\w$]*)/.exec(src)?.[1];
            if (!arg) continue;
            const pattern = new RegExp(`\\b${arg}\\.([A-Za-z_$][\\w$]*)`, 'g');
            const reads = new Set([...src.matchAll(pattern)].map(x => x[1]));
            for (const name of reads) {
              const base = name.replace(/_text$/, '');
              if (!ids.has(name) && !ids.has(base)) {
                E(
                  'ref/field',
                  `field "${f.id}" computes from "${name}", which this step does not declare, so it can only ever be blank`
                );
              }
            }
          }

          const hints = hintValues(step);
          const typed = step.fields.filter(
            f => typeof f.compute !== 'function'
          );
          const fullyHinted =
            typed.length > 0 && Object.keys(hints).length === typed.length;
          if (fullyHinted) {
            for (const f of step.fields) {
              if (typeof f.compute !== 'function') continue;
              try {
                const v = f.compute(hints);
                if (
                  v !== undefined &&
                  v !== null &&
                  !Number.isFinite(Number(v))
                ) {
                  W(
                    'interaction/compute',
                    `field "${f.id}" computes "${v}" from the step's own hint values`
                  );
                }
              } catch (e) {
                E(
                  'interaction/compute',
                  `field "${f.id}" throws on the step's own hint values: ${e.message}`
                );
              }
            }
          }
        }
      }

      if (step.validate !== undefined) {
        if (typeof step.validate !== 'function') {
          E('ref/field', 'validate is not a function');
        } else if (!Array.isArray(step.fields) || step.fields.length === 0) {
          E('ref/field', 'validate has no fields to read');
        } else {
          // Nothing entered yet: a validator runs on every keystroke including
          // the first, so it has to cope with an empty response set.
          try {
            const blank = step.validate({}, emptyProbeContext());
            if (blank && !['ok', 'warn', 'error'].includes(blank.level)) {
              E('ref/field', `validate returned level "${blank.level}"`);
            }
          } catch (e) {
            E(
              'ref/field',
              `validate throws on an empty response set: ${e.message}`
            );
          }

          // The author's own hint values are the model answer. A validator that
          // rejects them is telling every student who reads the hints that they
          // are wrong.
          const hints = hintValues(step);
          const complete =
            Object.keys(hints).length ===
            step.fields.filter(f => typeof f.compute !== 'function').length;
          if (complete && Object.keys(hints).length > 0) {
            const withComputed = { ...hints };
            for (const f of step.fields) {
              if (typeof f.compute !== 'function') continue;
              try {
                withComputed[f.id] = Number(f.compute(withComputed));
              } catch {
                /* already reported above */
              }
            }
            try {
              const r = step.validate(withComputed, emptyProbeContext());
              if (r && r.level === 'error') {
                E(
                  'interaction/validate',
                  `the validator rejects the step's own hint values: "${String(
                    r.message
                  )
                    .replace(/<[^>]*>/g, '')
                    .slice(0, 120)}"`
                );
              }
            } catch (e) {
              E(
                'interaction/validate',
                `validate throws on the step's own hints: ${e.message}`
              );
            }
          }
        }
      }

      if (step.plot !== undefined && !Array.isArray(step.fields)) {
        E('ref/field', 'a plot has no response fields to draw');
      }

      if (step.checklist !== undefined) {
        if (!Array.isArray(step.checklist) || step.checklist.length === 0) {
          E('interaction/checklist', 'checklist is present but empty');
        } else {
          step.checklist.forEach((c, n) => {
            if (!isNonEmptyString(c)) {
              E('interaction/checklist', `checklist item ${n + 1} is empty`);
            }
          });
        }
      }

      // --- Answers -----------------------------------------------------------
      const graded = step.type === 'predict' || step.type === 'question';
      if (!graded) return;

      if (step.type === 'question' && !QUESTION_KINDS.has(step.kind)) {
        E(
          'answer/shape',
          `question kind "${step.kind}" is not one the grader knows`
        );
        return;
      }

      const kind = step.type === 'predict' ? 'choice' : step.kind;

      if (kind === 'choice') {
        if (!Array.isArray(step.options) || step.options.length < 2) {
          E('answer/options', 'a choice needs at least two options');
          return;
        }
        step.options.forEach((o, n) => {
          if (!isNonEmptyString(o))
            E('answer/options', `option ${n + 1} is empty`);
        });
        const seen = new Set();
        for (const o of step.options) {
          const norm = String(o).trim().toLowerCase();
          if (seen.has(norm)) {
            E('answer/options', `option "${o}" appears twice`);
          }
          seen.add(norm);
        }
        if (!Number.isInteger(step.answer)) {
          E('answer/shape', 'a choice answer must be an option index');
        } else if (step.answer < 0 || step.answer >= step.options.length) {
          E(
            'answer/shape',
            `answer index ${step.answer} is outside the ${step.options.length} options`
          );
        } else if (checkAnswer(step, step.answer) !== true) {
          E(
            'answer/accepted',
            'the grader rejects the answer this step declares'
          );
        }
        if (!isNonEmptyString(step.because)) {
          E(
            'content/prompt',
            'a graded choice gives no explanation afterwards'
          );
        }
      }

      if (kind === 'numeric') {
        if (!Number.isFinite(step.answer)) {
          E('answer/shape', 'a numeric question has no finite answer');
          return;
        }
        const tol = toleranceFor(step);
        if (!Number.isFinite(tol) || tol <= 0) {
          E(
            'answer/tolerance',
            `tolerance resolves to ${tol}, which grades nothing`
          );
        } else {
          if (checkAnswer(step, step.answer) !== true) {
            E(
              'answer/accepted',
              'the grader rejects the answer this step declares'
            );
          }
          const outside = step.answer + tol * 2 + 1;
          if (checkAnswer(step, outside) === true) {
            E(
              'answer/discriminates',
              'the tolerance accepts a value it should reject'
            );
          }
          if (step.answer !== 0 && tol > Math.abs(step.answer) * 0.5) {
            W(
              'answer/tolerance',
              `tolerance ${tol} is over half the answer ${step.answer}: the question is barely graded`
            );
          }
          if (step.unit === undefined) {
            // An explicit `unit: ''` is an author saying the quantity is a
            // ratio. Only silence is a smell.
            W(
              'answer/shape',
              'a numeric question does not say whether it has a unit'
            );
          }
        }
      }

      if (kind === 'short') {
        if (!isNonEmptyString(step.rubric)) {
          E(
            'answer/rubric',
            'a short answer carries no rubric for the instructor'
          );
        }
        if (step.answer !== undefined) {
          W(
            'answer/shape',
            'a short answer declares an answer the grader ignores'
          );
        }
      }
    });

    // --- Instructor guidance -------------------------------------------------
    const guide = instructor[inv.id];
    if (!guide) {
      err('instructor/present', null, 'no instructor guidance for this lesson');
    } else {
      for (const key of INSTRUCTOR_REQUIRED) {
        const v = guide[key];
        const empty =
          v === undefined ||
          v === null ||
          (typeof v === 'string' && !v.trim()) ||
          (Array.isArray(v) && v.length === 0) ||
          (isPlainObject(v) && Object.keys(v).length === 0);
        if (empty) {
          err(
            'instructor/sections',
            null,
            `instructor guide section "${key}" is empty`
          );
        }
      }
      // Keyed by step index, which is exactly the kind of reference that goes
      // stale the moment a step is inserted above it.
      // Keyed by the 1-based step number - the same number js/answerKey.js
      // puts in `entry.step` and js/instructorDocs.js looks up. Reading them
      // 0-based shifts every expectation by one step, which is exactly the
      // silent failure this rule exists to catch, so the convention is stated
      // rather than inferred.
      for (const key of Object.keys(guide.expectations || {})) {
        const number = Number(key);
        const idx = number - 1;
        if (!Number.isInteger(number) || idx < 0 || idx >= steps.length) {
          err(
            'instructor/expectations',
            null,
            `expectations has an entry for step ${key}, which this lesson does not have`
          );
          continue;
        }
        // Any step type may carry an expected observation: js/instructorDocs.js
        // renders one against every entry in the key, not only the graded ones,
        // and "what to look for" is most of what an explore step is for. So the
        // check is that the number lands on a step and says something - which
        // is what goes stale when a step is inserted or removed.
        if (!isNonEmptyString(guide.expectations[key])) {
          err(
            'instructor/expectations',
            idx,
            `expectations for step ${key} is empty`
          );
        }
      }
    }

    // --- Source attribution --------------------------------------------------
    // A lesson that quotes somebody has to say who. `quote` is the structured
    // form and is checked; a bare quotation mark in prose is not, because prose
    // uses quotation marks for other things.
    steps.forEach((step, i) => {
      if (!step.quote) return;
      if (!isPlainObject(step.quote)) {
        err('instructor/attribution', i, 'quote is not a {text, by} object');
        return;
      }
      if (!isNonEmptyString(step.quote.text)) {
        err('instructor/attribution', i, 'a quote has no text');
      }
      if (!isNonEmptyString(step.quote.by)) {
        err('instructor/attribution', i, 'a quote is unattributed');
      }
    });

    // --- Answer key ----------------------------------------------------------
    for (const problem of verifyKey(inv)) {
      add('error', 'agree/answerKey', inv.id, null, problem);
    }
  }

  // --- Cross-artifact agreement ---------------------------------------------
  const byId = new Map(investigations.map(i => [i.id, i]));

  for (const [locale, manifest] of Object.entries(manifests)) {
    const seen = new Set();
    for (const entry of manifest) {
      seen.add(entry.id);
      const inv = byId.get(entry.id);
      if (!inv) {
        add(
          'error',
          'agree/manifest',
          entry.id,
          null,
          `the ${locale} manifest lists a lesson that does not exist`
        );
        continue;
      }
      const expected =
        locale === 'en'
          ? inv
          : mergeTranslation(inv, translations[locale]?.[inv.id]?.data);
      for (const key of MANIFEST_MIRRORED) {
        if (entry[key] !== expected[key]) {
          add(
            'error',
            'agree/manifest',
            inv.id,
            null,
            `the ${locale} manifest's ${key} is not the lesson's: ${JSON.stringify(entry[key])} vs ${JSON.stringify(expected[key])}`
          );
        }
      }
      const counts = {
        stepCount: inv.steps.length,
        gradedCount: gradedSteps(inv).length,
        objectiveCount: (inv.objectives || []).length,
      };
      for (const [key, want] of Object.entries(counts)) {
        if (entry[key] !== want) {
          add(
            'error',
            'agree/counts',
            inv.id,
            null,
            `the ${locale} manifest says ${key} ${entry[key]}, the lesson has ${want}`
          );
        }
      }
    }
    for (const inv of investigations) {
      if (!seen.has(inv.id)) {
        add(
          'error',
          'agree/manifest',
          inv.id,
          null,
          `missing from the ${locale} manifest`
        );
      }
    }
  }

  for (const id of Object.keys(instructor)) {
    if (!byId.has(id)) {
      add(
        'error',
        'agree/instructorIds',
        id,
        null,
        'instructor guidance for a lesson that does not exist'
      );
    }
  }

  // --- Translations ----------------------------------------------------------
  for (const [locale, byLesson] of Object.entries(translations)) {
    for (const [id, { data, file }] of Object.entries(byLesson)) {
      const inv = byId.get(id);
      if (!inv) {
        add(
          'error',
          'i18n/shape',
          id,
          null,
          `${file} translates a lesson that does not exist`
        );
        continue;
      }
      checkTranslationShape(inv, data, `${locale}`, (level, message, step) =>
        add(level, 'i18n/shape', id, step, message)
      );
      checkTranslationMachinery(inv, data, (level, message, step) =>
        add(level, 'i18n/machinery', id, step, message)
      );

      const cov = translationCoverage(inv, data);
      const done = cov.translated ?? cov.done ?? 0;
      const total = cov.total ?? 0;
      if (total > 0 && done / total < 0.5) {
        add(
          'warn',
          'i18n/coverage',
          id,
          null,
          `${locale} covers ${done} of ${total} strings (${Math.round((done / total) * 100)}%)`
        );
      }
    }
    for (const inv of investigations) {
      if (!byLesson[inv.id]) {
        add('warn', 'i18n/coverage', inv.id, null, `no ${locale} translation`);
      }
    }
  }

  return skip.length === 0
    ? findings
    : findings.filter(f => !skip.some(prefix => f.rule.startsWith(prefix)));
}

/**
 * Check one lesson, for the authoring preview.
 *
 * The same rules the command line runs, minus the ones that compare a lesson
 * with an artifact the browser does not have in hand - the manifest, the
 * translations, the instructor guide. What is left is everything that is a
 * property of the lesson itself, which is what an author is editing.
 *
 * @param {object} inv - One investigation
 * @param {object} refs - {widgets, scenarios, settingKeys, gradedSteps}
 * @returns {Array<object>} Findings for this lesson only
 */
export function checkLesson(inv, refs) {
  return checkCatalogue(
    {
      investigations: [inv],
      manifests: {},
      instructor: {},
      scenarios: refs.scenarios,
      settingKeys: refs.settingKeys,
      widgets: refs.widgets,
      translations: {},
      sources: {},
      gradedSteps: refs.gradedSteps,
    },
    {
      skip: [
        'agree/manifest',
        'agree/counts',
        'agree/instructorIds',
        'instructor/present',
        'instructor/sections',
        'instructor/expectations',
        'i18n/',
      ],
    }
  );
}

/**
 * A translation must be a shadow of its lesson, not a document of its own.
 *
 * mergeTranslation silently drops any key the English does not have, so a typo
 * in a shadow is invisible: the work is done, the file is committed, and the
 * string never appears. That is the single most likely way for translated
 * content to be lost, and nothing else notices it.
 */
function checkTranslationShape(
  base,
  overlay,
  locale,
  report,
  path = [],
  stepIndex = null
) {
  if (overlay === undefined || overlay === null) return;
  if (Array.isArray(base)) {
    if (!Array.isArray(overlay)) {
      report(
        'error',
        `${locale}: ${path.join('.') || 'root'} should be a list`,
        stepIndex
      );
      return;
    }
    if (overlay.length > base.length) {
      report(
        'error',
        `${locale}: ${path.join('.')} has ${overlay.length} entries for ${base.length} in English; the extras are dropped`,
        stepIndex
      );
    }
    base.forEach((item, i) => {
      if (i >= overlay.length) return;
      const nextStep = path.length === 1 && path[0] === 'steps' ? i : stepIndex;
      checkTranslationShape(
        item,
        overlay[i],
        locale,
        report,
        [...path, String(i)],
        nextStep
      );
    });
    return;
  }
  if (base && typeof base === 'object') {
    if (!isPlainObject(overlay)) {
      report(
        'error',
        `${locale}: ${path.join('.') || 'root'} should be an object`,
        stepIndex
      );
      return;
    }
    for (const key of Object.keys(overlay)) {
      if (!Object.hasOwn(base, key)) {
        report(
          'error',
          `${locale}: ${[...path, key].join('.')} is not a key the lesson has, so this translation is silently discarded`,
          stepIndex
        );
        continue;
      }
      checkTranslationShape(
        base[key],
        overlay[key],
        locale,
        report,
        [...path, key],
        stepIndex
      );
    }
  }
}

/** A translation may replace words. It may not replace anything else. */
function checkTranslationMachinery(
  base,
  overlay,
  report,
  path = [],
  stepIndex = null
) {
  if (overlay === undefined || overlay === null) return;
  if (typeof base === 'function' && overlay !== undefined && overlay !== null) {
    report('error', `${path.join('.')} translates a function`, stepIndex);
    return;
  }
  if (
    typeof base === 'number' &&
    typeof overlay === 'number' &&
    overlay !== base
  ) {
    report(
      'error',
      `${path.join('.')} changes the number ${base} to ${overlay}; a translation cannot move an answer`,
      stepIndex
    );
    return;
  }
  if (
    typeof base === 'string' &&
    overlay !== undefined &&
    typeof overlay !== 'string'
  ) {
    report(
      'error',
      `${path.join('.')} replaces a string with a ${typeof overlay}`,
      stepIndex
    );
    return;
  }
  if (Array.isArray(base) && Array.isArray(overlay)) {
    base.forEach((item, i) => {
      if (i >= overlay.length) return;
      const nextStep = path.length === 1 && path[0] === 'steps' ? i : stepIndex;
      checkTranslationMachinery(
        item,
        overlay[i],
        report,
        [...path, String(i)],
        nextStep
      );
    });
    return;
  }
  if (base && typeof base === 'object' && isPlainObject(overlay)) {
    for (const key of Object.keys(overlay)) {
      if (!Object.hasOwn(base, key)) continue;
      checkTranslationMachinery(
        base[key],
        overlay[key],
        report,
        [...path, key],
        stepIndex
      );
    }
  }
}
