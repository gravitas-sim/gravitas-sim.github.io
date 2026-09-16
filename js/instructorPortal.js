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

// The manifest, not the lessons: this page lists titles, durations and step
// counts, and pulling in 225KB of lesson text to render a filter and ten cards
// would be the same mistake the student-facing browser used to make.
import { MANIFEST as INVESTIGATIONS } from './data/investigations/registry.js';
import { ACTIVITIES } from './data/activities.js';
import { activityTeachingFor } from './data/activityTeaching.js';
import { activityHash } from './activities/activityBridge.js';
import { EN_TEACHING } from './i18n/en.teaching.js';
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
  announce(`${file.name} downloaded.`);
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
  // Building the archive is several seconds of synchronous work on a slow
  // machine, and a button that does nothing visible for that long reads as
  // broken. Said out loud as well as shown, because the person most likely to
  // be unsure is the one who cannot see the cursor change.
  announce(`Preparing ${manifest.files.length} documents…`);
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
  announce(`All ${manifest.files.length} documents downloaded as a ZIP.`);
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
let searchTerm = '';

/** A message for the polite status line, or '' to clear it. */
function announce(message) {
  const el = $('downloadStatus');
  if (el) el.textContent = message;
}

/**
 * The eight activity documents, one card per activity and one row per format.
 *
 * They were only ever reachable through the 54-document ZIP. An instructor
 * planning one period wants one guide and one worksheet, and had to download
 * every answer key in the catalog to get them.
 */
function renderActivities() {
  const list = $('activityResources');
  if (!list) return;
  list.innerHTML = '';
  let documents = 0;

  for (const activity of ACTIVITIES) {
    const lesson = INVESTIGATIONS.find(i => i.id === activity.lesson);
    const title = EN_TEACHING[activity.titleId] || activity.id;
    const guide = byId(`activity-${activity.id}-guide`);

    const card = document.createElement('article');
    card.className = 'res-card is-investigation';

    const meta = document.createElement('div');
    meta.innerHTML = `
      <h3>${title}</h3>
      <p class="res-sub">${EN_TEACHING[activity.forId] || ''}</p>
      <p class="res-meta">
        <span>Classroom activity</span>
        <span>${activity.formats.length} format${activity.formats.length === 1 ? '' : 's'}</span>
        <span>Built from ${lesson ? lesson.title : activity.lesson}</span>
        <span>${activity.scenario || 'No fixed scenario'}</span>
      </p>`;
    card.append(meta);

    if (guide) {
      const actions = document.createElement('div');
      actions.className = 'res-actions';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ui-button';
      btn.textContent = `${title}: Activity Guide, all formats (PDF)`;
      btn.addEventListener('click', () => download(guide));
      actions.append(btn);
      card.append(actions);
      documents++;
    }

    const formats = document.createElement('ul');
    formats.className = 'res-formats';
    for (const format of activity.formats) {
      const teaching = activityTeachingFor(activity.id, format.id);
      const sheet = byId(`activity-${activity.id}-${format.id}-worksheet`);
      const name = EN_TEACHING[format.nameId] || format.id;

      const row = document.createElement('li');
      row.className = 'res-format';
      row.innerHTML = `
        <p class="res-format-name">${name}</p>
        <p class="res-meta">
          <span>~${format.minutes} min (estimate)</span>
          <span>${format.steps.length} step${format.steps.length === 1 ? '' : 's'}</span>
          <span>${EN_TEACHING[format.forId] || ''}</span>
        </p>
        <p class="res-format-purpose">${EN_TEACHING[format.introId] || ''}</p>`;

      const rowActions = document.createElement('div');
      rowActions.className = 'res-actions';
      if (sheet) {
        const w = document.createElement('button');
        w.type = 'button';
        w.className = 'ui-button';
        w.textContent = `${name}: Student Worksheet (PDF)`;
        w.addEventListener('click', () => download(sheet));
        rowActions.append(w);
        documents++;
      } else {
        // The demonstration is projected and answered aloud, so it has no
        // worksheet. Saying so beats an absent button nobody can ask about.
        const none = document.createElement('p');
        none.className = 'res-none';
        none.textContent =
          'No worksheet: this format is projected and answered aloud.';
        rowActions.append(none);
      }
      const open = document.createElement('a');
      open.className = 'ui-button is-quiet';
      open.href = `/${teaching ? activityHash(activity.id, format.id) : ''}`;
      open.textContent = `Open ${name} in Gravitas`;
      rowActions.append(open);
      row.append(rowActions);
      formats.append(row);
    }
    card.append(formats);
    list.append(card);
  }

  const el = $('activityCount');
  if (el) {
    el.textContent = `${ACTIVITIES.length} activities, ${documents} documents`;
  }
}

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

  const teachingCard = document.createElement('article');
  teachingCard.className = 'res-card';
  teachingCard.innerHTML = `
    <h3>Teaching with Gravitas</h3>
    <p>The instructional cycle, six demonstrations you can run in the page, and
       five course-use patterns. Public and translated: this is the page to send
       a colleague, a department or a curriculum committee.</p>
    <a class="ui-button" href="/teaching/">Open the showcase page</a>`;
  general.append(teachingCard);

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

  renderActivities();
  renderInvestigations();

  const search = $('resourceSearch');
  if (search && !search.dataset.wired) {
    search.dataset.wired = 'yes';
    search.addEventListener('input', () => {
      searchTerm = search.value.trim().toLowerCase();
      renderInvestigations();
    });
  }
  $('materialsVersion').textContent =
    `Materials updated ${manifest.version} — ${manifest.files.length} documents, ` +
    `generated ${manifest.generated}`;
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
    if (searchTerm) {
      const haystack =
        `${inv.title} ${inv.subtitle} ${c.topic} ${c.difficulty}`.toLowerCase();
      if (!haystack.includes(searchTerm)) continue;
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
        <span>${inv.stepCount} steps</span>
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
  const count = $('investigationCount');
  if (count) {
    count.textContent =
      shown === INVESTIGATIONS.length
        ? `${INVESTIGATIONS.length} investigations, ${INVESTIGATIONS.length * 2} documents`
        : `${shown} of ${INVESTIGATIONS.length} shown`;
  }
}

/**
 * Three duration buttons, and a select for the topics.
 *
 * Every topic used to be its own pill. There are twenty-two investigations and
 * very nearly as many distinct topics, so the filter row rendered as
 * twenty-five buttons - four lines of them above the list on a laptop, and a
 * wall on a phone. A row of pills is a good control for three or four choices
 * and a bad one for twenty-two; a select is the same capability in one line,
 * with the platform's own keyboard handling and its own long-list behavior.
 */
function buildFilters() {
  const topics = [
    ...new Set(
      INVESTIGATIONS.map(i => INSTRUCTOR_CONTENT[i.id]?.topic).filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));

  const box = $('resourceFilters');
  box.innerHTML = '';

  /** How many investigations a filter would leave showing. */
  const countFor = id => {
    if (id === 'all') return INVESTIGATIONS.length;
    return INVESTIGATIONS.filter(inv => {
      const c = INSTRUCTOR_CONTENT[inv.id];
      if (!c) return false;
      if (id === 'short') return minutesOf(inv.duration) <= 45;
      if (id === 'long') return minutesOf(inv.duration) > 45;
      return c.topic === id;
    }).length;
  };

  const buttons = [
    { id: 'all', label: 'All' },
    { id: 'short', label: '45 min or less' },
    { id: 'long', label: 'Over 45 min' },
  ];
  const paint = () => {
    box
      .querySelectorAll('.res-filter')
      .forEach(el =>
        el.setAttribute(
          'aria-pressed',
          String(el.dataset.filter === activeFilter)
        )
      );
    const sel = $('topicFilter');
    if (sel)
      sel.value = buttons.some(b => b.id === activeFilter) ? '' : activeFilter;
  };

  for (const o of buttons) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'res-filter';
    b.dataset.filter = o.id;
    // The count is part of the label, so a filter that would show nothing says
    // so before it is pressed rather than after.
    b.textContent = `${o.label} (${countFor(o.id)})`;
    b.setAttribute('aria-pressed', String(activeFilter === o.id));
    b.addEventListener('click', () => {
      activeFilter = o.id;
      paint();
      renderInvestigations();
    });
    box.append(b);
  }

  const wrap = document.createElement('div');
  wrap.className = 'res-topic';
  const label = document.createElement('label');
  label.className = 'res-topic-label';
  label.htmlFor = 'topicFilter';
  label.textContent = 'Topic';
  const select = document.createElement('select');
  select.id = 'topicFilter';
  select.className = 'res-topic-select';
  const any = document.createElement('option');
  any.value = '';
  any.textContent = `Any topic (${INVESTIGATIONS.length})`;
  select.append(any);
  for (const t of topics) {
    const o = document.createElement('option');
    o.value = t;
    o.textContent = `${t} (${countFor(t)})`;
    select.append(o);
  }
  select.addEventListener('change', () => {
    activeFilter = select.value || 'all';
    paint();
    renderInvestigations();
  });
  wrap.append(label, select);
  box.append(wrap);
  paint();
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
