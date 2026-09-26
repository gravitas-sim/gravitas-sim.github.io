// SPIKE (Prompt 18): the bounded workflow, end to end, against the live CDS.
// Every step's timing and size goes on window.voSpike for the gate's record.

import { resolveName, gaiaSourceAt, gaiaEpochs, toObservation } from './archive.js';

const $ = id => document.getElementById(id);
const out = $('out');
const err = $('err');
const record = (window.voSpike = { steps: [] });

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function section(title, html) {
  const s = document.createElement('section');
  s.innerHTML = `<h2>${esc(title)}</h2>${html}`;
  out.append(s);
  return s;
}
function fail(e) {
  err.hidden = false;
  err.textContent = `${e.code ? `${e.code}: ` : ''}${e.message}`;
  record.error = { code: e.code ?? null, message: e.message };
}
async function timed(name, fn) {
  const t0 = performance.now();
  const v = await fn();
  record.steps.push({ name, ms: Math.round(performance.now() - t0) });
  return v;
}

function plot(o) {
  const [t, m] = o.columns;
  const x0 = Math.min(...t.values);
  const x1 = Math.max(...t.values);
  const y0 = Math.min(...m.values);
  const y1 = Math.max(...m.values);
  const W = 640;
  const H = 240;
  const px = v => 40 + ((v - x0) / (x1 - x0 || 1)) * (W - 60);
  const py = v => 20 + ((v - y0) / (y1 - y0 || 1)) * (H - 50); // magnitudes: bright is up
  const dots = t.values.map((v, i) => `<circle cx="${px(v).toFixed(1)}" cy="${py(m.values[i]).toFixed(1)}" r="2.5" fill="#9ecbff"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title)}: ${t.values.length} epochs from BJD ${x0.toFixed(1)} to ${x1.toFixed(1)}, ${y0.toFixed(2)} to ${y1.toFixed(2)} mag">${dots}
<text x="40" y="${H - 8}" fill="#e8ebff" font-size="12">BJD (TDB) ${x0.toFixed(0)} to ${x1.toFixed(0)}</text></svg>`;
}

$('find').addEventListener('submit', async ev => {
  ev.preventDefault();
  out.textContent = '';
  err.hidden = true;
  record.steps = [];
  delete record.error;
  try {
    const name = $('name').value.trim();
    const pos = await timed('resolve', () => resolveName(name));
    if (!pos) {
      section('Not found', `<p>Sesame knows no object called ${esc(name)}.</p>`);
      return;
    }
    section('Position', `<p>${esc(name)}: RA ${pos.ra.toFixed(5)}°, Dec ${pos.dec.toFixed(5)}° (${esc(pos.otype)}; ${esc(pos.resolver)})</p>`);
    const found = await timed('discover', () => gaiaSourceAt(pos));
    if (!found.sources.length) {
      section('Gaia DR3', '<p>No Gaia DR3 source within 2″.</p>');
      return;
    }
    const src = found.sources[0];
    section('Gaia DR3', `<p>${found.sources.length} within 2″; the brightest: <code>${esc(src.source)}</code>, G ${src.gmag?.toFixed(2)}${src.variable ? ', flagged variable' : ''}.</p>`);
    const q = await timed('inspect', () => gaiaEpochs(src.source));
    record.bytes = q.bytes;
    record.rows = q.table.rows.length;
    const rows = q.table.fields
      .map(f => `<tr><td><code>${esc(f.name)}</code></td><td>${f.unit ? esc(f.unit) : '<em>none stated</em>'}</td><td>${esc(f.ucd)}</td><td>${esc(f.description)}</td></tr>`)
      .join('');
    section(
      'Epoch photometry, as the service describes it',
      `<p>${q.table.rows.length} rows, ${q.bytes} bytes, status ${esc(q.table.status)}${q.table.overflow ? ' (stopped at MAXREC: not every epoch)' : ''}; SHA-256 <code>${q.sha256.slice(0, 16)}…</code></p>
<table><thead><tr><th>Field</th><th>Unit</th><th>UCD</th><th>Description</th></tr></thead><tbody>${rows}</tbody></table>`
    );
    const pick = section(
      '2. Select and convert',
      `<label>Band <select id="band"><option>G</option><option>BP</option><option>RP</option></select></label> <button id="convert">Convert</button><div id="obs"></div>`
    );
    pick.querySelector('#convert').addEventListener('click', async () => {
      try {
        const t0 = performance.now();
        const o = toObservation(q, { source: src.source, band: pick.querySelector('#band').value, object: { name, ra: pos.ra, dec: pos.dec } });
        record.steps.push({ name: 'convert', ms: Math.round(performance.now() - t0) });
        record.observation = { id: o.id, points: o.columns[0].values.length, reductions: o.reductions };
        const blob = new Blob([JSON.stringify(o, null, 2)], { type: 'application/json' });
        pick.querySelector('#obs').innerHTML = `${plot(o)}
<p>${esc(o.license.status)}. ${esc(o.credit)}.</p>
<ol>${o.reductions.map(r => `<li>${esc(r)}</li>`).join('')}</ol>
<p><a download="${esc(o.id.replace(/[^\w.-]+/g, '_'))}.json" href="${URL.createObjectURL(blob)}">Save the observation (.json)</a></p>`;
      } catch (e) {
        fail(e);
      }
    });
  } catch (e) {
    fail(e);
  }
});
