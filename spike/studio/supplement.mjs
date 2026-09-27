// Supplementary evidence, outside the fixed edit script: the half of edit 3
// Twelve Nights cannot take (a numeric answer's tolerance), on the first lesson
// that has one, and the derived artifacts the scenario edit reaches.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as S from './core.mjs';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ev = JSON.parse(readFileSync(path.join(REPO, 'spike/studio/evidence.json'), 'utf8'));
const { stepFingerprint } = await import(pathToFileURL(path.join(REPO, 'js/investigations/progressBackup.js')));
const evaluate = async t => (await import(`data:text/javascript;base64,${Buffer.from(t).toString('base64')}`)).default;
const { INVESTIGATIONS } = await import(pathToFileURL(path.join(REPO, 'js/data/investigations.js')));
let found = null;
for (const inv of INVESTIGATIONS) {
  const i = inv.steps.findIndex(s => s.kind === 'numeric' && typeof s.tolerance === 'number');
  if (i >= 0) { found = { id: inv.id, index: i, sid: inv.steps[i].sid, tolerance: inv.steps[i].tolerance }; break; }
}
const file = `js/data/investigations/${found.id}.js`;
const src = readFileSync(path.join(REPO, file), 'utf8');
const r = S.applyEdit(src, { kind: 'lesson' }, { op: 'set', path: ['steps', found.index, 'tolerance'], value: found.tolerance * 2 });
const before = await evaluate(src);
const after = await evaluate(r.source);
const shapeSame = JSON.stringify(S.shapeOf(S.locate(S.parseSource(src), { kind: 'lesson' }).root)) === JSON.stringify(S.shapeOf(S.locate(S.parseSource(r.source), { kind: 'lesson' }).root));
const codeSame = JSON.stringify(S.codeOf(src)) === JSON.stringify(S.codeOf(r.source));
ev.supplement = {
  toleranceEdit: {
    lesson: found.id,
    sid: found.sid,
    tolerance: [found.tolerance, after.steps[found.index].tolerance],
    fingerprintChanged: stepFingerprint(before.steps[found.index]) !== stepFingerprint(after.steps[found.index]),
    otherStepsUnchanged: before.steps.every((s, i) => i === found.index || stepFingerprint(s) === stepFingerprint(after.steps[i])),
    shapeSame,
    codeSame,
  },
  artifactsTheScenarioEditReaches: {
    'sw-manifest.js': 'sw:check detects; npm run sw:manifest regenerates',
    'e2e/golden/world-construction.json': 'e2e/worldConstruction.spec.js detects (count 128 -> 178); GRAVITAS_UPDATE_WORLD_GOLDEN=1 regenerates; the spec then passes',
    'manual (scenarios.tex, investigations.tex, PDF)': 'manual:check detects (steps 683 -> 684); npm run manual regenerates; the check then passes',
    'images/scenarios/alien-dyson-swarm-collapse.webp': 'NOT detected: thumbnails:check checks presence only; npm run thumbnails regenerates',
    'instructors/materials.enc.json': 'instructors:check detects; only a maintainer with the passphrase regenerates',
  },
};
writeFileSync(path.join(REPO, 'spike/studio/evidence.json'), `${JSON.stringify(ev, null, 2)}\n`);
console.log(JSON.stringify(ev.supplement.toleranceEdit));
