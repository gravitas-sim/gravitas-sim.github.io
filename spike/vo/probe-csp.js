// SPIKE (Prompt 18): the CSP probe's script. It is a file, not inline,
// because the policy it tests refuses inline script too - which is what a
// production page under this policy must live with.
const violations = [];
document.addEventListener('securitypolicyviolation', e =>
  violations.push({ blocked: e.blockedURI, directive: e.effectiveDirective })
);
const tap = (base, q) =>
  `${base}?${new URLSearchParams({ REQUEST: 'doQuery', LANG: 'ADQL', FORMAT: 'votable', MAXREC: '1', QUERY: q })}`;
const CASES = [
  ['on the list: CDS Sesame', 'https://cds.unistra.fr/cgi-bin/nph-sesame/-oxp/SNV?SU%20Dra'],
  ['on the list: VizieR TAP', tap('https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync', 'SELECT TOP 1 Source FROM "I/355/gaiadr3"')],
  ['off the list, CORS-open: SIMBAD TAP', tap('https://simbad.cds.unistra.fr/simbad/sim-tap/sync', 'SELECT TOP 1 main_id FROM basic')],
  ['off the list, CORS-open: MAST S3', 'https://stpubdata.s3.amazonaws.com/tess/public/tid/s0015/0000/0001/4284/8794/tess2019226182529-s0015-0000000142848794-0151-s_lc.fits'],
];
document.getElementById('go').addEventListener('click', async () => {
  const results = [];
  for (const [name, url] of CASES) {
    try {
      const res = await fetch(url, { method: url.endsWith('.fits') ? 'HEAD' : 'GET', credentials: 'omit', referrerPolicy: 'no-referrer' });
      results.push({ name, ok: res.ok, status: res.status });
    } catch (e) {
      results.push({ name, refused: `${e.name}: ${e.message}` });
    }
  }
  await new Promise(r => setTimeout(r, 200));
  window.cspProbe = { origin: location.origin, at: new Date().toISOString(), ua: navigator.userAgent, results, violations };
  document.getElementById('out').textContent = JSON.stringify(window.cspProbe, null, 2);
});
