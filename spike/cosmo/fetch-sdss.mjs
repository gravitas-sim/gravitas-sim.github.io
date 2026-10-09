// Pins the three SDSS DR18 raw products the gate evaluates. SkyServer's SQL
// endpoint answers a query with a CSV; the query text, the data release and
// the SHA-256 of the answer are the pin (SOURCES.json). Run:
//   node spike/cosmo/fetch-sdss.mjs            fetch, write, print hashes
//   node spike/cosmo/fetch-sdss.mjs --verify   fetch again, compare the hashes
// The raw answers are stored gzipped (deterministic header) in sources/.
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const ENDPOINT = 'https://skyserver.sdss.org/dr18/SkyServerWS/SearchTools/SqlSearch';

export const QUERIES = {
  'sdss-dr18-redshift-slice': `SELECT specObjID, ra, dec, z, zErr, petroMag_r
FROM SpecPhoto
WHERE class='GALAXY' AND zWarning=0 AND survey='sdss' AND sciencePrimary=1
  AND petroMag_r<17.77 AND dec BETWEEN 0 AND 2 AND ra BETWEEN 120 AND 240
  AND z BETWEEN 0.01 AND 0.2
ORDER BY specObjID`,
  'sdss-dr18-early-types': `SELECT s.specObjID, s.ra, s.dec, s.z, s.velDisp, s.velDispErr,
  p.petroMag_r, p.extinction_r, p.fracDeV_r
FROM SpecObj s JOIN PhotoObj p ON p.objID=s.bestObjID
WHERE s.class='GALAXY' AND s.zWarning=0 AND s.survey='sdss' AND s.sciencePrimary=1
  AND p.petroMag_r<17.77 AND s.velDisp BETWEEN 70 AND 400
  AND s.velDispErr<0.1*s.velDisp AND p.fracDeV_r>0.95
  AND s.z BETWEEN 0.02 AND 0.1 AND s.dec BETWEEN 0 AND 2 AND s.ra BETWEEN 120 AND 240
ORDER BY s.specObjID`,
  'sdss-dr18-coma-field': `SELECT specObjID, ra, dec, z, zErr, petroMag_r
FROM SpecPhoto
WHERE class='GALAXY' AND zWarning=0 AND survey='sdss' AND sciencePrimary=1
  AND petroMag_r<17.77 AND ra BETWEEN 187 AND 203 AND dec BETWEEN 25.5 AND 30.5
  AND z BETWEEN 0.0133 AND 0.0334
ORDER BY specObjID`,
};

async function fetchOne(cmd) {
  const url = `${ENDPOINT}?${new URLSearchParams({ cmd, format: 'csv' })}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SkyServer ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const sha = b => createHash('sha256').update(b).digest('hex');
const verify = process.argv.includes('--verify');
for (const [id, cmd] of Object.entries(QUERIES)) {
  const csv = await fetchOne(cmd);
  const file = `${here}sources/${id}.csv.gz`;
  if (verify) {
    const old = gunzipSync(readFileSync(file));
    console.log(id, 'same bytes:', sha(old) === sha(csv), sha(csv));
  } else {
    writeFileSync(file, gzipSync(csv, { level: 9 }));
    console.log(id, csv.length, 'bytes', sha(csv));
  }
}
