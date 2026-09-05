#!/usr/bin/env node
// =============================================================================
// npm run author:new -- --id=<lesson-id> --title="..."
// -----------------------------------------------------------------------------
// Scaffolds a new investigation: the lesson module, its translation shadow, an
// instructor-guide stub, and every registration a lesson needs to exist.
//
// It exists because a lesson is not one file. Adding one by hand means touching
// six places, and forgetting any of them fails in a different way: leave it out
// of registry.js and the card is there but nothing opens; leave it out of
// investigations.js and the site is fine while the answer keys and the
// instructor PDFs quietly omit it; leave out the instructor stub and the guide
// builds with a hole in it. All six are mechanical, so they are done here.
//
//   js/data/investigations/<id>.js         the lesson
//   js/data/investigations/es/<id>.js      the Spanish shadow
//   js/data/investigations/registry.js     the lazy loader, and the translation
//   js/data/investigations.js              the synchronous barrel
//   js/data/instructorContent.js           the guide stub
//   then: npm run manifest                 regenerates both manifests
//
// Nothing is overwritten. Re-running after an edit reports what is already in
// place and touches nothing else, so it is safe to run twice.
//
//   npm run author:new -- --id=tidal-heating --title="Tidal Heating"
//   npm run author:new -- --id=tidal-heating --title="..." --dry-run
// =============================================================================

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = name => {
  const hit = argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const dryRun = argv.includes('--dry-run');

const id = flag('id');
const title = flag('title') || '';
const subtitle =
  flag('subtitle') || 'One line on what the student will measure';

if (!id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
  console.error(
    'Usage: npm run author:new -- --id=<kebab-case-id> --title="Title"\n' +
      '\n' +
      "The id is the lesson's filename, its URL and the key every other\n" +
      'artifact refers to it by, so it has to be kebab-case.'
  );
  process.exit(2);
}
if (!title) {
  console.error('A --title is required: it is what the lesson card says.');
  process.exit(2);
}

/** SCREAMING_SNAKE, for the barrel's import binding. */
const constName = id.toUpperCase().replace(/-/g, '_');

const exists = async p => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};

const done = [];
const skipped = [];

async function writeNew(file, contents) {
  if (await exists(file)) {
    skipped.push(`${file} (already there)`);
    return;
  }
  if (!dryRun) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, contents);
  }
  done.push(file);
}

/**
 * Insert a line into a file, once, before a marker.
 *
 * Anchored on text rather than a line number so that it keeps working as the
 * files around it change, and a no-op when the line is already present.
 */
async function insertOnce(file, anchor, line, { before = true } = {}) {
  const text = await readFile(file, 'utf8');
  if (text.includes(line.trim())) {
    skipped.push(`${file} (already registered)`);
    return;
  }
  const at = text.indexOf(anchor);
  if (at < 0) {
    skipped.push(
      `${file} (could not find "${anchor.slice(0, 40)}" - add by hand)`
    );
    return;
  }
  const insertion = before ? at : at + anchor.length;
  const next = text.slice(0, insertion) + line + text.slice(insertion);
  if (!dryRun) await writeFile(file, next);
  done.push(`${file} (registered)`);
}

// --- The lesson ---------------------------------------------------------------

const lesson = `// =============================================================================
// ${title}
// -----------------------------------------------------------------------------
// Content only, no imports: every step that needs a live number is handed a
// \`ctx\` by the engine, so a lesson stays a description of what is being taught
// rather than a piece of the simulation.
//
// Scaffolded by tools/new-investigation.mjs. Run \`npm run author:check\` as you
// write - it validates every step against the widget registry, the scenario
// catalog and the grader - and \`?author=${id}&step=<n>\` to look at one.
// =============================================================================

const ${constName} = {
  id: '${id}',
  thumbnail: 'images/scenarios/solar-system.webp',
  title: ${JSON.stringify(title)},
  subtitle: ${JSON.stringify(subtitle)},
  duration: '30-40 min',
  level: 'Introductory astronomy',
  lock: { placement: true, inspector: true },
  summary:
    'A paragraph for the lesson card: what the student measures, and what it lets them conclude.',
  objectives: [
    'State what the student will be able to do, in a verb they can be tested on',
    'One objective per thing the lesson actually asks for',
  ],
  steps: [
    {
      type: 'read',
      title: 'Where this starts',
      body: \`Set the scene. Two or three short paragraphs; separate them with a
             blank line.\`,
      setup: {
        scenario: 'Solar System',
        seed: '${id}',
        camera: { zoom: 1, pan: { x: 0, y: 0 } },
        paused: false,
      },
    },
    {
      type: 'predict',
      title: 'Commit before you measure',
      body: \`Ask for a commitment before there is any evidence. The point is the
             commitment, so these are recorded whether or not they are right.\`,
      prompt: 'What do you expect to happen?',
      options: [
        'The first possibility',
        'The second possibility',
        'The third possibility',
      ],
      answer: 1,
      because:
        'Why that is the answer, and why the plausible wrong ones are wrong.',
    },
    {
      type: 'explore',
      title: 'Look at it',
      body: \`Free play, with a checklist of things worth noticing.\`,
      checklist: [
        'Something specific to watch for',
        'Something else, that the next question depends on',
      ],
    },
    {
      type: 'measure',
      title: 'Write down what you measured',
      body: \`Ask for numbers. Every field needs an id, a label and a unit; a
             \\\`hint\\\` is the value you expect, and \\\`npm run author:check\\\` feeds
             the hints through \\\`validate\\\` to prove it accepts your own answer.\`,
      fields: [
        { id: 'value', label: 'The thing measured', unit: 'AU', hint: '1' },
      ],
      validate: v => {
        if (!Number.isFinite(v.value)) return null;
        if (v.value <= 0) {
          return { level: 'error', message: 'That has to be a positive number.' };
        }
        return { level: 'ok', message: 'That is the right sort of value.' };
      },
    },
    {
      type: 'question',
      kind: 'numeric',
      title: 'Use it',
      body: \`Ask them to do something with the number they measured.\`,
      prompt: 'What do you get?',
      answer: 1,
      tolerance: 0.1,
      unit: 'AU',
      because: 'The working, in a sentence or two.',
    },
    {
      type: 'read',
      title: 'What you worked out',
      body: \`Close the lesson. Say what they established, and what it does not
             yet settle.\`,
    },
  ],
};

export default ${constName};
`;

const shadow = `// =============================================================================
// ${title} - Spanish
// -----------------------------------------------------------------------------
// A translation is a *shadow* of a lesson, not a copy: an object with the same
// shape carrying only the fields that are words. Anything absent keeps its
// English, so this file can be finished a step at a time.
//
// Two rules, both enforced by \`npm run author:check\`:
//
//   a key the English lesson does not have is silently discarded, so a typo
//   here is invisible work
//   numbers, functions, widget ids, scenario names and answers are machinery
//   and must never appear
//
// Arrays line up by index: the third Spanish option translates the third
// English one.
// =============================================================================

export default {
  title: '',
  subtitle: '',
  summary: '',
  objectives: [],
  steps: [
    // { title: '', body: '' },
  ],
};
`;

const guide = `
  '${id}': {
    topic: 'The one-line topic, for the curriculum map',
    difficulty: 'Introductory',
    placement: 'Where this sits in a course, and what it follows',
    overview:
      'A paragraph for the instructor: what the lesson does and what it is for.',
    priorKnowledge: ['What a student needs before starting'],
    keyConcepts: ['The ideas the lesson is built on'],
    flow: ['A sentence per phase of the lesson'],
    features: ['Which parts of Gravitas the lesson uses'],
    misconceptions: ['A wrong idea students bring, and what corrects it'],
    teachingNotes: ['Something worth saying to a class'],
    discussion: ['A question worth asking out loud'],
    extensions: ['Where a student who finishes early can go'],
    modelNotes:
      'What the simulation simplifies, and where that matters for this lesson.',
    // Keyed by the 1-based step number - the number the panel shows and the
    // answer key prints. What an instructor should expect to see at that step.
    expectations: {},
  },
`;

await writeNew(`js/data/investigations/${id}.js`, lesson);
await writeNew(`js/data/investigations/es/${id}.js`, shadow);

// The two registry maps, each before its closing brace.
{
  const file = 'js/data/investigations/registry.js';
  const text = await readFile(file, 'utf8');
  if (text.includes(`'${id}': () => import('./${id}.js')`)) {
    skipped.push(`${file} (already registered)`);
  } else {
    const loaderLine = `  '${id}': () => import('./${id}.js'),\n`;
    const translationLine = `    '${id}': () => import('./es/${id}.js'),\n`;
    const loadersEnd = text.indexOf('};', text.indexOf('const LOADERS = {'));
    let next = text.slice(0, loadersEnd) + loaderLine + text.slice(loadersEnd);
    const transStart = next.indexOf('const TRANSLATIONS = {');
    const esEnd = next.indexOf('  },', transStart);
    next = next.slice(0, esEnd) + translationLine + next.slice(esEnd);
    if (!dryRun) await writeFile(file, next);
    done.push(`${file} (loader + translation)`);
  }
}

await insertOnce(
  'js/data/investigations.js',
  "\nimport { gradedSteps, positionIn } from './investigations/catalogue.js';",
  `import ${constName} from './investigations/${id}.js';`
);
{
  const file = 'js/data/investigations.js';
  const text = await readFile(file, 'utf8');
  const marker = 'export const INVESTIGATIONS = [';
  const at = text.indexOf(marker);
  if (at < 0) {
    skipped.push(
      `${file} (no INVESTIGATIONS array found - add ${constName} by hand)`
    );
  } else if (new RegExp(`^\\s*${constName},`, 'm').test(text)) {
    skipped.push(`${file} (already in the catalogue)`);
  } else {
    const end = text.indexOf('];', at);
    const next = text.slice(0, end) + `  ${constName},\n` + text.slice(end);
    if (!dryRun) await writeFile(file, next);
    done.push(`${file} (added to INVESTIGATIONS)`);
  }
}

{
  const file = 'js/data/instructorContent.js';
  const text = await readFile(file, 'utf8');
  if (text.includes(`'${id}': {`)) {
    skipped.push(`${file} (already has a guide)`);
  } else {
    const marker = 'export const INSTRUCTOR_CONTENT = {';
    const at = text.indexOf(marker);
    if (at < 0) {
      skipped.push(
        `${file} (no INSTRUCTOR_CONTENT found - add a stub by hand)`
      );
    } else {
      const insertion = at + marker.length;
      const next = text.slice(0, insertion) + guide + text.slice(insertion);
      if (!dryRun) await writeFile(file, next);
      done.push(`${file} (guide stub)`);
    }
  }
}

console.log(dryRun ? '\nWould create:' : '\nCreated:');
for (const d of done) console.log(`  ${d}`);
if (skipped.length) {
  console.log('\nLeft alone:');
  for (const s of skipped) console.log(`  ${s}`);
}
console.log(
  `
Next:
  npm run manifest          regenerate both manifests from the lessons
  npm run author:check      validate the new lesson, and every other one
  npm run format            the scaffold is written plainly, prettier owns it

Then open it:
  ?author=${id}&step=1

The scaffold deliberately does not pass author:check yet - the placeholder
objectives, summary and rubric text are there to be replaced, and the checker
will tell you which. Run it now to see the list you are working through.
`
);
