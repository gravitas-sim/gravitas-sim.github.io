// =============================================================================
// The authoring preview
// -----------------------------------------------------------------------------
// `?author=<lesson-id>&step=<n>` opens a lesson at any step, shows an author
// what the checker thinks of that step, and lets them move straight to another
// one. It is the other half of `npm run author:check`: the command line says a
// step is wrong, and this is where you go to look at it.
//
// Two things it must not do.
//
// It must not touch a student's progress. A lesson normally reads its saved
// position, answers and attempt counts out of localStorage on open and writes
// them back on every interaction; in authoring mode the engine skips both, so
// previewing step 30 of Tides on the machine a class is using leaves that
// class's Tides exactly where it was. Nothing is written, and nothing is read -
// an author is shown a clean lesson, not somebody's half-finished one.
//
// It must not load unless it is asked for. The whole module - and the rule
// engine it pulls in - is imported dynamically by js/investigations.js only
// when the URL carries ?author=, so a student's download is unchanged.
// =============================================================================

import { checkLesson } from './rules.js';
import { provideLessonLoaders } from '../data/investigations/registry.js';
import { allWidgets } from '../widgets.js';
import { SCENARIO_INFO, scenarioId } from '../data/scenarioInfo.js';
import { DEFAULT_SETTINGS } from '../appState.js';
import { gradedSteps } from '../data/investigations/catalog.js';

/**
 * What the address bar is asking for.
 *
 * Accepts the query string and the hash, because an author pastes both: the
 * lesson links in the checker's output are query strings, and a hash survives
 * being edited in place without reloading the page.
 *
 * `view=student` asks for the lesson as a student meets it: no bar, no
 * findings, and still nothing read from or written to saved progress.
 *
 * @returns {?{lesson: string, step: ?number, view: 'author'|'student'}} The
 *   request, or null
 */
export function authoringRequest() {
  const fromQuery = new URLSearchParams(window.location.search);
  let lesson = fromQuery.get('author');
  let step = fromQuery.get('step');
  let view = fromQuery.get('view');

  if (!lesson) {
    const hash = window.location.hash.replace(/^#/, '');
    const fromHash = new URLSearchParams(hash);
    lesson = fromHash.get('author');
    step = step ?? fromHash.get('step');
    view = view ?? fromHash.get('view');
  }
  if (!lesson) return null;

  const n = Number(step);
  return {
    lesson,
    // 1-based in the URL, because that is the number the panel shows, the
    // number the instructor guide prints and the number the checker reports.
    step: Number.isInteger(n) && n >= 1 ? n : null,
    view: view === 'student' ? 'student' : 'author',
  };
}

/** Where the Studio's composer (/studio/lesson/) leaves the lesson it previews. */
export const DRAFT_KEY = 'gravitas_composer_preview';

/**
 * Install the composer's draft, when that is what the address bar names.
 *
 * `?author=draft-<id>` is a lesson compiled from an investigation pack in this
 * browser (js/composer/compile.js), not one in the registry. The composer
 * leaves it, English and Spanish, under DRAFT_KEY; it is data only - the pack
 * format holds no code - and it arrives through the same door a packaged
 * lesson does, so everything the engine does with a lesson it does with this.
 * The `draft-` prefix keeps it apart from every real lesson and its progress.
 *
 * @param {{lesson: string}} request - authoringRequest()
 * @returns {boolean} Whether a draft was installed
 */
export function installDraft(request) {
  if (!/^draft-[a-z0-9]+(-[a-z0-9]+)*$/.test(request.lesson)) return false;
  let stored = null;
  try {
    stored = JSON.parse(window.localStorage.getItem(DRAFT_KEY));
  } catch {
    return false;
  }
  if (stored?.lesson?.id !== request.lesson) return false;
  provideLessonLoaders(request.lesson, {
    lesson: () => Promise.resolve({ default: stored.lesson }),
    translations: stored.shadow
      ? { es: () => Promise.resolve({ default: stored.shadow }) }
      : {},
  });
  return true;
}

const els = {};
let onJump = () => {};

/** Find the bar's elements once. */
function collect() {
  if (els.bar) return els.bar;
  els.bar = document.getElementById('investigationAuthorBar');
  els.step = document.getElementById('investigationAuthorStep');
  els.of = document.getElementById('investigationAuthorOf');
  els.prev = document.getElementById('investigationAuthorPrev');
  els.next = document.getElementById('investigationAuthorNext');
  els.diag = document.getElementById('investigationAuthorDiag');
  return els.bar;
}

const escape = s =>
  String(s).replace(
    /[&<>"]/g,
    ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]
  );

/**
 * Turn the bar on and wire its controls.
 *
 * @param {Function} jump - Called with a 0-based step index
 */
export function mountAuthorBar(jump) {
  if (!collect()) return;
  onJump = jump;
  els.bar.hidden = false;
  document.body.classList.add('authoring-preview');

  els.step.addEventListener('change', () => {
    const n = els.step.valueAsNumber;
    if (Number.isInteger(n) && n >= 1) onJump(n - 1);
  });
  els.prev.addEventListener('click', () => onJump(els.step.valueAsNumber - 2));
  els.next.addEventListener('click', () => onJump(els.step.valueAsNumber));
}

/** Cached per lesson: the rules are pure, and the lesson does not change. */
let cache = { id: null, findings: [] };

function findingsFor(inv) {
  if (cache.id === inv.id) return cache.findings;
  let findings = [];
  try {
    findings = checkLesson(inv, {
      widgets: allWidgets(),
      scenarios: SCENARIO_INFO,
      scenarioId,
      settingKeys: new Set(Object.keys(DEFAULT_SETTINGS)),
      gradedSteps,
    });
  } catch (e) {
    findings = [
      {
        level: 'error',
        rule: 'preview',
        lesson: inv.id,
        step: null,
        message: `the checker itself failed: ${e.message}`,
      },
    ];
  }
  cache = { id: inv.id, findings };
  return findings;
}

/** One line per fact worth knowing about the step on screen. */
function factsFor(step, inv, index) {
  const facts = [];
  facts.push(['type', step.kind ? `${step.type} · ${step.kind}` : step.type]);
  if (step.setup?.scenario) facts.push(['scenario', step.setup.scenario]);
  if (step.setup?.seed) facts.push(['seed', step.setup.seed]);
  if (step.tool?.id) {
    const w = allWidgets().find(x => x.id === step.tool.id);
    const controls = (w?.controls || []).map(c => c.id);
    const hidden = step.tool.hide || [];
    facts.push([
      'widget',
      `${step.tool.id}${controls.length ? ` (${controls.map(c => (hidden.includes(c) ? `${c}·hidden` : c)).join(', ')})` : ''}`,
    ]);
    if (step.tool.values) {
      facts.push([
        'preset',
        Object.entries(step.tool.values)
          .map(([k, v]) => `${k}=${v}`)
          .join(' '),
      ]);
    }
  }
  if (step.probe) facts.push(['probe', 'live readout on this step']);
  if (step.fields) {
    facts.push([
      'fields',
      step.fields
        .map(f => (typeof f.compute === 'function' ? `${f.id}=fx` : f.id))
        .join(', '),
    ]);
  }
  if (step.validate) facts.push(['validate', 'runs on every keystroke']);
  if (step.answer !== undefined) {
    const tol =
      step.kind === 'numeric'
        ? ` ±${step.tolerance ?? Math.abs(step.answer) * 0.05}`
        : '';
    const shown =
      step.kind === 'numeric'
        ? `${step.answer}${tol} ${step.unit || ''}`
        : `option ${step.answer}${step.options ? ` — “${step.options[step.answer]}”` : ''}`;
    facts.push(['answer', shown]);
  }
  if (step.rubric) facts.push(['rubric', `${step.rubric.length} characters`]);
  if (step.checklist)
    facts.push(['checklist', `${step.checklist.length} items`]);
  facts.push([
    'graded',
    `${gradedSteps(inv).length} of ${inv.steps.length} steps; this one is step ${index + 1}`,
  ]);
  return facts;
}

/**
 * Redraw the bar for the step now on screen.
 *
 * @param {object} inv - The open lesson
 * @param {number} index - 0-based step index
 */
export function renderAuthorBar(inv, index) {
  if (!collect() || els.bar.hidden) return;
  const step = inv.steps[index];
  els.step.value = String(index + 1);
  els.step.max = String(inv.steps.length);
  els.of.textContent = `of ${inv.steps.length}`;
  els.prev.disabled = index === 0;
  els.next.disabled = index === inv.steps.length - 1;

  const all = findingsFor(inv);
  const mine = all.filter(f => f.step === index);
  const lessonWide = all.filter(f => f.step === null || f.step === undefined);

  const facts = factsFor(step, inv, index)
    .map(
      ([k, v]) =>
        `<div class="inv-author-fact"><span>${escape(k)}</span><code>${escape(v)}</code></div>`
    )
    .join('');

  const problems = [...mine, ...lessonWide]
    .map(
      f =>
        `<div class="inv-author-finding is-${f.level}">` +
        `<span class="inv-author-level">${f.level}</span> ${escape(f.message)}` +
        `<span class="inv-author-rule">${escape(f.rule)}</span></div>`
    )
    .join('');

  els.diag.innerHTML =
    `<div class="inv-author-facts">${facts}</div>` +
    (problems
      ? `<div class="inv-author-findings">${problems}</div>`
      : `<div class="inv-author-findings is-clean">No findings for this step.</div>`);
}
