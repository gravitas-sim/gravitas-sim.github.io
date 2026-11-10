// One run of an ensemble record in a fresh Node process, for the replay legs of the
// validator and its tests: `node tools/experiment-ensemble-child.mjs <serial|pool> <record.json>`
// prints the finished record as JSON on one line. 'serial' runs every trial in this
// process; 'pool' runs one real worker_threads realm per trial on the Worker pool.
import { readFileSync } from 'node:fs';
import { Worker } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const repo = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..'
);
const [mode, file] = process.argv.slice(2);
const manifest = JSON.parse(readFileSync(file, 'utf8'));
const { runSerial, startEnsemble } = await import(
  pathToFileURL(path.join(repo, 'js/experiments/ensemble/run.js'))
);
let record;
if (mode === 'serial') record = await runSerial(manifest);
else {
  const shim = pathToFileURL(
    path.join(repo, 'tools/experiment-ensemble-worker-shim.mjs')
  );
  const worker = pathToFileURL(
    path.join(repo, 'js/experiments/ensemble/worker.js')
  ).href;
  const spawn = () => {
    const w = new Worker(shim, { workerData: { worker } });
    const o = {
      postMessage: m => w.postMessage(m),
      terminate: () => w.terminate(),
      onmessage: null,
      onerror: null,
    };
    w.on('message', data => o.onmessage?.({ data }));
    w.on('error', e =>
      o.onerror?.({ message: e.message, preventDefault() {} })
    );
    return o;
  };
  record = await startEnsemble(manifest, { spawn, concurrency: 3 }).run();
}
process.stdout.write(`${JSON.stringify(record)}\n`);
