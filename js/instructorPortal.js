// =============================================================================
// The instructor resources area
// -----------------------------------------------------------------------------
// Gravitas is a static site on GitHub Pages. There is no server to check a
// password against, so the materials are not gated by a check: they are
// encrypted, and the passphrase is the decryption key.
//
// What that means in practice:
//
//   - instructors/materials.enc.json is public and downloadable. It is
//     ciphertext. Reading it tells an attacker nothing.
//   - The passphrase never appears in this repository, in this file, or in any
//     response the server sends. It exists only in the instructor's head and in
//     the build environment.
//   - A wrong passphrase does not fail a comparison that could be patched out
//     in the debugger. It derives the wrong key, and AES-GCM refuses to
//     authenticate the ciphertext.
//   - The honest limit: the ciphertext is public, so the security is exactly
//     the strength of the passphrase against an offline attack. The key
//     derivation is deliberately slow to make each guess expensive.
//
// The whole authentication surface is this file plus the build script. Swapping
// it for a real server-side gate later means replacing unlock() and fetching
// the manifest from an authenticated endpoint instead; nothing else changes.
// =============================================================================

import { INVESTIGATIONS } from './data/investigations.js';
import { INSTRUCTOR_CONTENT } from './data/instructorContent.js';

/** Where the encrypted bundle lives. */
const PAYLOAD_URL = '/instructors/materials.enc.json';
/** Per-tab, cleared when the tab closes. Holds the derived key, not the phrase. */
const SESSION_KEY = 'gravitas_instructor_key';

let manifest = null;
const objectUrls = [];

const $ = id => document.getElementById(id);
const b64ToBytes = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const bytesToB64 = b => btoa(String.fromCharCode(...new Uint8Array(b)));

// --- Unlocking ----------------------------------------------------------------

/**
 * Derive the content key from a passphrase.
 * @param {string} phrase - The shared passphrase
 * @param {Object} kdf - Parameters from the payload
 * @param {Uint8Array} salt - Salt from the payload
 * @returns {Promise<CryptoKey>} An extractable AES-GCM key
 */
async function deriveKey(phrase, kdf, salt) {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(phrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: kdf.iterations,
      hash: kdf.hash,
    },
    base,
    { name: 'AES-GCM', length: 256 },
    // Extractable so the session can hold the key rather than the passphrase:
    // a refresh then costs nothing instead of a second of key derivation.
    true,
    ['decrypt']
  );
}

/** Fetch and parse the encrypted payload. */
async function loadPayload() {
  const res = await fetch(PAYLOAD_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`payload ${res.status}`);
  return res.json();
}

/**
 * Decrypt the bundle with a key, returning the manifest.
 * @param {Object} payload - The encrypted payload
 * @param {CryptoKey} key - Derived key
 * @returns {Promise<Object>} The manifest
 */
async function decrypt(payload, key) {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(payload.iv) },
    key,
    b64ToBytes(payload.data)
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

/**
 * Try a passphrase.
 * @param {string} phrase - What the instructor typed
 * @returns {Promise<Object>} The manifest
 * @throws When the passphrase is wrong, or the payload cannot be fetched
 */
async function unlock(phrase) {
  const payload = await loadPayload();
  const key = await deriveKey(phrase, payload.kdf, b64ToBytes(payload.salt));
  const data = await decrypt(payload, key);
  try {
    const raw = await crypto.subtle.exportKey('raw', key);
    sessionStorage.setItem(SESSION_KEY, bytesToB64(raw));
  } catch {
    /* session storage unavailable; the instructor re-enters on refresh */
  }
  return data;
}

/** Restore a session from the key held for this tab, if there is one. */
async function resume() {
  let stored = null;
  try {
    stored = sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
  if (!stored) return null;
  try {
    const payload = await loadPayload();
    const key = await crypto.subtle.importKey(
      'raw',
      b64ToBytes(stored),
      'AES-GCM',
      true,
      ['decrypt']
    );
    return await decrypt(payload, key);
  } catch {
    // A rebuilt payload invalidates the stored key. Ask again rather than
    // leaving the page in a half-open state.
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

// --- Files --------------------------------------------------------------------

/** A blob URL for one decrypted document, made once and reused. */
function fileUrl(file) {
  if (!file._url) {
    const blob = new Blob([b64ToBytes(file.bytes)], {
      type: 'application/pdf',
    });
    file._url = URL.createObjectURL(blob);
    objectUrls.push(file._url);
  }
  return file._url;
}

const byId = id => manifest?.files.find(f => f.id === id) ?? null;

/** Hand a decrypted document to the browser. */
function download(file) {
  const a = document.createElement('a');
  a.href = fileUrl(file);
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// --- Download all, as a ZIP ---------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc32 = bytes => {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++)
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

/**
 * A stored (uncompressed) ZIP.
 *
 * Written by hand rather than pulled in as a dependency: the whole archive is
 * a dozen already-compact PDFs, and store-only ZIP is a format simple enough
 * that adding a library would cost more than it saves.
 *
 * @param {Array<{path:string, bytes:Uint8Array}>} entries - Files to archive
 * @returns {Blob} The archive
 */
function makeZip(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const enc = new TextEncoder();

  const push = arr => {
    chunks.push(arr);
    offset += arr.length;
  };
  const u16 = v => [v & 0xff, (v >> 8) & 0xff];
  const u32 = v => [
    v & 0xff,
    (v >> 8) & 0xff,
    (v >> 16) & 0xff,
    (v >>> 24) & 0xff,
  ];

  for (const e of entries) {
    const name = enc.encode(e.path);
    const crc = crc32(e.bytes);
    const local = new Uint8Array([
      ...u32(0x04034b50),
      ...u16(20), // version needed
      ...u16(0x0800), // UTF-8 names
      ...u16(0), // stored
      ...u16(0), // time
      ...u16(0x21), // date: a fixed stamp, so archives are reproducible
      ...u32(crc),
      ...u32(e.bytes.length),
      ...u32(e.bytes.length),
      ...u16(name.length),
      ...u16(0),
      ...name,
    ]);
    const localOffset = offset;
    push(local);
    push(e.bytes);
    central.push(
      new Uint8Array([
        ...u32(0x02014b50),
        ...u16(20),
        ...u16(20),
        ...u16(0x0800),
        ...u16(0),
        ...u16(0),
        ...u16(0x21),
        ...u32(crc),
        ...u32(e.bytes.length),
        ...u32(e.bytes.length),
        ...u16(name.length),
        ...u16(0),
        ...u16(0),
        ...u16(0),
        ...u16(0),
        ...u32(0),
        ...u32(localOffset),
        ...name,
      ])
    );
  }

  const centralStart = offset;
  for (const c of central) push(c);
  push(
    new Uint8Array([
      ...u32(0x06054b50),
      ...u16(0),
      ...u16(0),
      ...u16(central.length),
      ...u16(central.length),
      ...u32(offset - centralStart),
      ...u32(centralStart),
      ...u16(0),
    ])
  );
  return new Blob(chunks, { type: 'application/zip' });
}

/** Folder name for an investigation's materials inside the archive. */
const folderFor = id =>
  (INVESTIGATIONS.find(i => i.id === id)?.title ?? id).replace(
    /[/\\:*?"<>|]/g,
    ''
  );

function downloadAll() {
  const entries = manifest.files.map(f => ({
    path: f.investigation ? `${folderFor(f.investigation)}/${f.name}` : f.name,
    bytes: b64ToBytes(f.bytes),
  }));
  const url = URL.createObjectURL(makeZip(entries));
  objectUrls.push(url);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Gravitas Instructor Materials (${manifest.version}).zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// --- Dashboard ----------------------------------------------------------------

const GENERAL = [
  {
    id: 'adopters-guide',
    name: 'Adopter’s Guide',
    text: 'What Gravitas is, who it is for, how to assign it, what is graded automatically, technical requirements and accessibility.',
  },
  {
    id: 'curriculum-map',
    name: 'Curriculum Map',
    text: 'Every investigation side by side: topic, timing, difficulty, where it fits in a course, prerequisites and objectives.',
  },
];

/** Approximate minutes, for the duration filter. */
function minutesOf(duration) {
  const nums = String(duration).match(/\d+/g)?.map(Number) ?? [];
  return nums.length ? nums[nums.length - 1] : 0;
}

let activeFilter = 'all';

function renderDashboard() {
  const general = $('generalResources');
  general.innerHTML = '';
  for (const g of GENERAL) {
    const file = byId(g.id);
    if (!file) continue;
    const card = document.createElement('article');
    card.className = 'res-card';
    card.innerHTML = `
      <h3>${g.name}</h3>
      <p>${g.text}</p>`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ui-button';
    btn.textContent = `Download ${g.name} (PDF)`;
    btn.addEventListener('click', () => download(file));
    card.append(btn);
    general.append(card);
  }

  const modelCard = document.createElement('article');
  modelCard.className = 'res-card';
  modelCard.innerHTML = `
    <h3>Gravitas Model &amp; Limitations</h3>
    <p>What the simulation calculates, what it approximates and what it visualizes.
       Public: link it to students or colleagues freely.</p>
    <a class="ui-button" href="/model/">Read the model page</a>`;
  general.append(modelCard);

  const zipCard = document.createElement('article');
  zipCard.className = 'res-card';
  zipCard.innerHTML = `
    <h3>Everything, in one archive</h3>
    <p>All ${manifest.files.length} documents as a ZIP, with each investigation’s guide
       and answer key in its own folder.</p>`;
  const zipBtn = document.createElement('button');
  zipBtn.type = 'button';
  zipBtn.className = 'ui-button';
  zipBtn.textContent = 'Download all instructor materials (ZIP)';
  zipBtn.addEventListener('click', downloadAll);
  zipCard.append(zipBtn);
  general.append(zipCard);

  renderInvestigations();
  $('materialsVersion').textContent = `Materials updated ${manifest.version}`;
}

function renderInvestigations() {
  const list = $('investigationResources');
  list.innerHTML = '';
  let shown = 0;

  for (const inv of INVESTIGATIONS) {
    const c = INSTRUCTOR_CONTENT[inv.id];
    if (!c) continue;
    const mins = minutesOf(inv.duration);
    if (activeFilter === 'short' && mins > 45) continue;
    if (activeFilter === 'long' && mins <= 45) continue;
    if (
      activeFilter !== 'all' &&
      activeFilter !== 'short' &&
      activeFilter !== 'long' &&
      c.topic !== activeFilter
    ) {
      continue;
    }
    shown++;

    const card = document.createElement('article');
    card.className = 'res-card is-investigation';
    const meta = document.createElement('div');
    meta.innerHTML = `
      <h3>${inv.title}</h3>
      <p class="res-sub">${inv.subtitle}</p>
      <p class="res-meta">
        <span>${c.topic}</span>
        <span>${inv.duration}</span>
        <span>${inv.steps.length} steps</span>
        <span>${c.difficulty}</span>
      </p>`;
    card.append(meta);

    const actions = document.createElement('div');
    actions.className = 'res-actions';
    for (const [suffix, label] of [
      ['guide', 'Instructor Guide'],
      ['key', 'Answer Key'],
    ]) {
      const file = byId(`${inv.id}-${suffix}`);
      if (!file) continue;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ui-button';
      // Named in full rather than "Download", so a screen reader user hears
      // which document each of ten identical buttons actually is.
      btn.textContent = `${inv.title}: ${label} (PDF)`;
      btn.addEventListener('click', () => download(file));
      actions.append(btn);
    }
    const preview = document.createElement('a');
    preview.className = 'ui-button is-quiet';
    preview.href = `/#investigation=${encodeURIComponent(inv.id)}`;
    preview.textContent = 'Open the investigation';
    actions.append(preview);
    card.append(actions);
    list.append(card);
  }

  $('noMatches').hidden = shown > 0;
}

function buildFilters() {
  const topics = [
    ...new Set(
      INVESTIGATIONS.map(i => INSTRUCTOR_CONTENT[i.id]?.topic).filter(Boolean)
    ),
  ];
  const options = [
    { id: 'all', label: 'All' },
    ...topics.map(t => ({ id: t, label: t })),
    { id: 'short', label: '45 min or less' },
    { id: 'long', label: 'Over 45 min' },
  ];
  const box = $('resourceFilters');
  box.innerHTML = '';
  for (const o of options) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'res-filter';
    b.textContent = o.label;
    b.setAttribute('aria-pressed', String(activeFilter === o.id));
    b.addEventListener('click', () => {
      activeFilter = o.id;
      box
        .querySelectorAll('.res-filter')
        .forEach(el => el.setAttribute('aria-pressed', String(el === b)));
      renderInvestigations();
    });
    box.append(b);
  }
}

// --- Screens ------------------------------------------------------------------

function showDashboard(data) {
  manifest = data;
  $('loginScreen').hidden = true;
  $('dashboard').hidden = false;
  buildFilters();
  renderDashboard();
  $('logoutBtn').hidden = false;
  document.title = 'Instructor Resources | Gravitas';
}

function showLogin(message) {
  $('loginScreen').hidden = false;
  $('dashboard').hidden = true;
  $('logoutBtn').hidden = true;
  const err = $('loginError');
  err.textContent = message || '';
  err.hidden = !message;
  if (message) $('passwordInput').focus();
}

function logout() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  for (const u of objectUrls) URL.revokeObjectURL(u);
  objectUrls.length = 0;
  manifest = null;
  $('passwordInput').value = '';
  showLogin('');
  $('passwordInput').focus();
}

async function submitPassword(event) {
  event?.preventDefault();
  const input = $('passwordInput');
  // Trimmed to match the build script, which trims what it is given. A
  // passphrase pasted with a trailing space is the commonest way to be
  // locked out of something you have the key to.
  const phrase = input.value.trim();
  const button = $('loginSubmit');
  if (!phrase.trim()) {
    showLogin('Enter the instructor passphrase to continue.');
    return;
  }
  button.disabled = true;
  const previous = button.textContent;
  // Key derivation is deliberately slow, so the button has to say something.
  button.textContent = 'Unlocking…';
  $('loginError').hidden = true;
  try {
    const data = await unlock(phrase);
    showDashboard(data);
  } catch (err) {
    const network = String(err?.message || '').startsWith('payload');
    showLogin(
      network
        ? 'The materials could not be downloaded. Check your connection and try again.'
        : 'That passphrase did not unlock the materials. Check for stray spaces, then try again.'
    );
    input.select();
  } finally {
    button.disabled = false;
    button.textContent = previous;
  }
}

/** Wire the page up. */
export async function initInstructorPortal() {
  $('loginForm').addEventListener('submit', submitPassword);
  $('logoutBtn').addEventListener('click', logout);

  const toggle = $('togglePassword');
  toggle.addEventListener('click', () => {
    const input = $('passwordInput');
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    toggle.setAttribute('aria-pressed', String(!showing));
    toggle.textContent = showing ? 'Show' : 'Hide';
    input.focus();
  });

  const resumed = await resume();
  if (resumed) showDashboard(resumed);
  else showLogin('');
  $('portalLoading').hidden = true;
}
