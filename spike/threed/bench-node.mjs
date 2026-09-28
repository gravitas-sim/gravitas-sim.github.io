import { readFileSync, writeFileSync } from 'node:fs';
import { determinism, speed, systemAsNumbers } from './bench.js';
const file = new URL('./initial.json', import.meta.url);
if (process.argv.includes('--write')) writeFileSync(file, JSON.stringify(systemAsNumbers(10)));
const initial = JSON.parse(readFileSync(file, 'utf8'));
console.log(JSON.stringify({ engine: `node ${process.version}`, hashes: await determinism(initial), speed: process.argv.includes('--speed') ? speed() : null }));
