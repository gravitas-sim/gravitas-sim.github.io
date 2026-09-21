#!/usr/bin/env node
// =============================================================================
// npm run evaluation:summary -- <files...>
// -----------------------------------------------------------------------------
// Reads de-identified exports from /evaluation/ and prints what is in them.
// Counts, missing data, per-item pre and post, and paired change where a
// participant code links the two.
//
// What it deliberately does not do
// -----------------------------------------------------------------------------
// It prints no p-value, declares nothing significant, and never uses the word
// "gain". Those are the three things that turn a description of twenty-three
// response sheets into a claim about teaching, and a tool that made them one
// keystroke away would be the most harmful thing in this repository.
//
// It does print an interval, because a mean with no spread invites a reader to
// treat it as exact. The interval is a bootstrap percentile interval over the
// paired differences - resampling participants with replacement, which is the
// unit that was sampled - and it is a description of how much this sample
// wobbles, not an inference about a population that was never randomly drawn
// from. A convenience sample of one instructor's section supports a description
// and nothing else, and the header of the output says so every time it runs.
//
// The effect size is Cohen's dz for paired data: the mean difference divided by
// the standard deviation of the differences. Printed because reviewers ask for
// it, labelled as a standardised description of this sample, and not compared
// to any of the conventional small/medium/large thresholds, which were never
// meant for a twelve-item project-developed instrument.
// =============================================================================

import { readFile } from 'node:fs/promises';
import {
  CONCEPT_ITEMS,
  EVALUATION_KIND,
  EVALUATION_SCHEMA,
  scoreConcept,
} from '../js/data/evaluation.js';

const files = process.argv.slice(2).filter(a => !a.startsWith('--'));
const asJson = process.argv.includes('--json');

if (!files.length) {
  console.error(
    'Usage: npm run evaluation:summary -- <export.csv|export.json> [...]\n\n' +
      'Reads the de-identified exports /evaluation/ writes. Prints counts,\n' +
      'missing data, per-item pre/post and paired change. Prints no verdict.'
  );
  process.exit(2);
}

/** Split one CSV line, honouring double quotes. */
function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

/**
 * Read one file into response records, or say why not.
 *
 * Never throws on bad input: a malformed export is the normal case when
 * somebody has opened a CSV in a spreadsheet and saved it back, and the tool
 * has to name the problem rather than produce a stack trace.
 *
 * @param {string} path - File to read
 * @returns {Promise<{rows: Array<object>, problems: Array<string>}>} What it held
 */
async function readRecords(path) {
  const problems = [];
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch (err) {
    return { rows: [], problems: [`${path}: cannot read (${err.code})`] };
  }
  const trimmed = text.trim();
  if (!trimmed) return { rows: [], problems: [`${path}: empty`] };

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return { rows: [], problems: [`${path}: not valid JSON`] };
    }
    const doc = Array.isArray(parsed) ? { records: parsed } : parsed;
    if (doc.kind && doc.kind !== EVALUATION_KIND) {
      return {
        rows: [],
        problems: [`${path}: not a Gravitas evaluation export`],
      };
    }
    if (doc.schema && Number(doc.schema) > EVALUATION_SCHEMA) {
      return {
        rows: [],
        problems: [
          `${path}: schema ${doc.schema}, this tool understands ${EVALUATION_SCHEMA}`,
        ],
      };
    }
    const rows = Array.isArray(doc.records) ? doc.records : [];
    if (!rows.length) problems.push(`${path}: no records`);
    return { rows, problems };
  }

  const lines = trimmed.split(/\r?\n/).filter(l => l.trim());
  const header = splitCsvLine(lines[0]).map(h => h.trim());
  if (!header.includes('instrument') || !header.includes('occasion')) {
    return {
      rows: [],
      problems: [`${path}: header has no "instrument"/"occasion" column`],
    };
  }
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    if (cells.length !== header.length) {
      problems.push(
        `${path}: line ${i + 1} has ${cells.length} cells, header has ${header.length}`
      );
      continue;
    }
    const row = {};
    header.forEach((h, k) => {
      row[h] = cells[k];
    });
    if (row.schema && Number(row.schema) > EVALUATION_SCHEMA) {
      problems.push(`${path}: line ${i + 1} is schema ${row.schema}, skipped`);
      continue;
    }
    rows.push(row);
  }
  return { rows, problems };
}

const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = xs => {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};

/**
 * Bootstrap percentile interval over a set of differences.
 *
 * Resamples participants with replacement, which is the unit that varies.
 * Deterministic: a fixed generator, so the same data prints the same interval
 * and a reader can reproduce it. 2000 resamples, which is enough for a
 * percentile interval to be stable to the tenth of a point this prints.
 *
 * @param {number[]} xs - The paired differences
 * @param {number} [n] - Resamples
 * @returns {{lo: number, hi: number}|null} The 95% interval, or null if too few
 */
function bootstrapInterval(xs, n = 2000) {
  if (xs.length < 3) return null;
  // Mulberry32, the same generator js/rng.js uses, with a fixed seed so the
  // number in a report can be checked by running the tool again.
  let s = 0x9e3779b9;
  const rnd = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const means = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let k = 0; k < xs.length; k++)
      sum += xs[Math.floor(rnd() * xs.length)];
    means.push(sum / xs.length);
  }
  means.sort((a, b) => a - b);
  return {
    lo: means[Math.floor(0.025 * n)],
    hi: means[Math.floor(0.975 * n)],
  };
}

// --- Read everything ---------------------------------------------------------
const all = [];
const problems = [];
for (const path of files) {
  const { rows, problems: p } = await readRecords(path);
  problems.push(...p);
  for (const row of rows) all.push(row);
}

const concept = all.filter(r => (r.instrument || 'concept') === 'concept');
const pre = concept.filter(r => r.occasion === 'pre');
const post = concept.filter(r => r.occasion === 'post');

// --- Missing data, counted rather than dropped silently ----------------------
const missing = { blankItems: 0, cells: 0, sheetsWithAny: 0 };
for (const row of concept) {
  let any = false;
  for (const item of CONCEPT_ITEMS) {
    missing.cells++;
    const v = row[item.id];
    if (v === undefined || v === null || String(v).trim() === '') {
      missing.blankItems++;
      any = true;
    }
  }
  if (any) missing.sheetsWithAny++;
}

// --- Pairing -----------------------------------------------------------------
const byCode = new Map();
for (const row of concept) {
  const code = String(row.participant || '').trim();
  if (!code) continue;
  if (!byCode.has(code)) byCode.set(code, { pre: [], post: [] });
  const slot = byCode.get(code)[row.occasion];
  if (slot) slot.push(row);
}
const pairs = [];
const collisions = [];
for (const [code, sides] of byCode) {
  if (sides.pre.length > 1 || sides.post.length > 1) {
    collisions.push(
      `${code}: ${sides.pre.length} pre and ${sides.post.length} post sheets`
    );
    continue;
  }
  if (sides.pre.length === 1 && sides.post.length === 1) {
    pairs.push({
      code,
      pre: scoreConcept(sides.pre[0]),
      post: scoreConcept(sides.post[0]),
    });
  }
}
const diffs = pairs.map(p => p.post.correct - p.pre.correct);

// --- Output ------------------------------------------------------------------
const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(0)}%` : '-');
const itemRows = CONCEPT_ITEMS.map(item => {
  const rate = rows =>
    rows.length
      ? rows.filter(r => Number(r[item.id]) === item.answer).length /
        rows.length
      : null;
  return {
    id: item.id,
    domain: item.domain,
    preCorrect: rate(pre),
    postCorrect: rate(post),
    n: { pre: pre.length, post: post.length },
  };
});

const summary = {
  schema: EVALUATION_SCHEMA,
  files: files.length,
  counts: {
    sheets: concept.length,
    pre: pre.length,
    post: post.length,
    withCode: [...byCode.keys()].length,
    paired: pairs.length,
    unpairedPre: pre.filter(r => !String(r.participant || '').trim()).length,
    unpairedPost: post.filter(r => !String(r.participant || '').trim()).length,
  },
  missing,
  collisions,
  items: itemRows,
  paired: pairs.length
    ? {
        n: pairs.length,
        meanPre: mean(pairs.map(p => p.pre.correct)),
        meanPost: mean(pairs.map(p => p.post.correct)),
        meanChange: mean(diffs),
        sdChange: sd(diffs),
        dz: sd(diffs) ? mean(diffs) / sd(diffs) : null,
        interval: bootstrapInterval(diffs),
      }
    : null,
  problems,
};

if (asJson) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  const L = [];
  L.push('Classroom evidence summary');
  L.push('');
  L.push(
    'A description of the sheets in these files. Not a test of anything: this'
  );
  L.push(
    'is a convenience sample from whoever happened to be in the room, the'
  );
  L.push(
    'instrument is a project-developed pilot with no validation behind it, and'
  );
  L.push('no comparison group is implied. Nothing below is a finding.');
  L.push('');
  L.push(`  sheets              ${summary.counts.sheets}`);
  L.push(
    `  pre / post          ${summary.counts.pre} / ${summary.counts.post}`
  );
  L.push(`  carrying a code     ${summary.counts.withCode}`);
  L.push(`  paired              ${summary.counts.paired}`);
  L.push(
    `  blank answers       ${missing.blankItems} of ${missing.cells} (${pct(missing.blankItems, missing.cells)}), on ${missing.sheetsWithAny} sheet(s)`
  );
  if (collisions.length) {
    L.push('');
    L.push('  codes that could not be paired:');
    for (const c of collisions) L.push(`    ${c}`);
  }
  L.push('');
  L.push('Per item, proportion choosing the keyed response');
  L.push('  item  domain        pre     post');
  for (const r of itemRows) {
    const f = v =>
      v === null ? '   -  ' : `${(v * 100).toFixed(0)}%`.padStart(6);
    L.push(
      `  ${r.id}   ${r.domain.padEnd(13)}${f(r.preCorrect)}  ${f(r.postCorrect)}`
    );
  }
  if (summary.paired) {
    const p = summary.paired;
    L.push('');
    L.push(`Paired sheets (n = ${p.n}), score out of ${CONCEPT_ITEMS.length}`);
    L.push(`  mean before         ${p.meanPre.toFixed(2)}`);
    L.push(`  mean after          ${p.meanPost.toFixed(2)}`);
    L.push(
      `  mean change         ${p.meanChange >= 0 ? '+' : ''}${p.meanChange.toFixed(2)}` +
        (p.interval
          ? `  (bootstrap 95% interval ${p.interval.lo >= 0 ? '+' : ''}${p.interval.lo.toFixed(2)} to ${p.interval.hi >= 0 ? '+' : ''}${p.interval.hi.toFixed(2)})`
          : '  (too few pairs for an interval)')
    );
    if (p.dz !== null && Number.isFinite(p.dz)) {
      L.push(`  standardised (dz)   ${p.dz >= 0 ? '+' : ''}${p.dz.toFixed(2)}`);
    }
    L.push('');
    L.push(
      '  The interval describes how much this sample wobbles when its own'
    );
    L.push(
      '  participants are resampled. It is not a confidence statement about'
    );
    L.push(
      '  students in general, and dz is not compared to any threshold here.'
    );
  } else {
    L.push('');
    L.push('No paired sheets, so no change is reported.');
  }
  if (problems.length) {
    L.push('');
    L.push('Input problems');
    for (const p of problems) L.push(`  ${p}`);
  }
  console.log(L.join('\n'));
}
