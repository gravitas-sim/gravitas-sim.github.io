// =============================================================================
// A course as a Thin Common Cartridge (an instructor module, Roadmap III
// Prompt 169)
// -----------------------------------------------------------------------------
// An instructor expects a course to import into Canvas, Moodle, D2L or
// Blackboard. A live tool connection (LTI) is a service and is out of scope
// (D-CLASS-04); a cartridge is a file, so it needs none.
//
// The profile, chosen and why: COURSE_PACKS.md "Common Cartridge". In short,
// the 1EdTech Thin Common Cartridge Profile v1.0 over Common Cartridge v1.3: a
// cartridge of web links and nothing else (the one imsmanifest.xml and one web
// link XML file per link), so no web content, no assessments and no service.
//
// What the cartridge holds, from a course
// -----------------------------------------------------------------------------
// - One folder (a module on most platforms) for each unit, in order.
// - One web link for each item that has an address, opening it in Gravitas:
//   the link the course already makes (js/course/links.js), which encodes the
//   pin and the depth, in the cartridge's language. A reading with no address
//   is left out and reported.
// - A first folder holding the course home link (and, for a course with a
//   teacher guide, a link to it for instructors).
// - Where a unit's items have notes for instructors: one link for instructors
//   to the course home, and, only when the instructor asks for it, the notes
//   themselves as that link's description (Thin CC has no pages to put them
//   on, and a platform that ignores the instructor role would show them).
// - The text follows the page's language; the course's own words fall back to
//   English as the course home does.
//
// What it never holds: student data, a grade return, an LTI link, a file other
// than XML, a date or anything that varies between runs. The manifest text is
// deterministic and is what the tests compare; the archive is a stored (not
// deflated) ZIP, which is valid and the same bytes everywhere, and no test
// stores a digest of it.
//
// Imports nothing: the course builder and the kit load it lazily and hand it
// what they already hold (the page's modules are shared, a duplicate would be
// a request on the route).
// =============================================================================

import { tr } from './instructorCartridgeText.js';

/** The profile and where its rules were read, for COURSE_PACKS.md and the tests. */
export const PROFILE = Object.freeze({
  name: 'Thin Common Cartridge',
  schema: 'IMS Thin Common Cartridge',
  schemaVersion: '1.3.0',
  profileVersion: '1.0',
  base: 'Common Cartridge 1.3',
  extension: 'imscc',
});

export const NS = Object.freeze({
  cp: 'http://www.imsglobal.org/xsd/imsccv1p3/imscp_v1p1',
  lomm: 'http://ltsc.ieee.org/xsd/imsccv1p3/LOM/manifest',
  lomr: 'http://ltsc.ieee.org/xsd/imsccv1p3/LOM/resource',
  wl: 'http://www.imsglobal.org/xsd/imsccv1p3/imswl_v1p3',
  xsi: 'http://www.w3.org/2001/XMLSchema-instance',
});

const SCHEMA_AT = Object.freeze({
  cp: 'http://www.imsglobal.org/profile/cc/ccv1p3/ccv1p3_imscp_v1p2_v1p0.xsd',
  lomm: 'http://www.imsglobal.org/profile/cc/ccv1p3/LOM/ccv1p3_lommanifest_v1p0.xsd',
  lomr: 'http://www.imsglobal.org/profile/cc/ccv1p3/LOM/ccv1p3_lomresource_v1p0.xsd',
  wl: 'http://www.imsglobal.org/profile/cc/ccv1p3/ccv1p3_imswl_v1p3.xsd',
});

const text = (v, locale) => (v && (v[locale] || v.en)) || '';

/** XML text or attribute: markup escaped and characters XML 1.0 cannot hold dropped. */
export const esc = s =>
  String(s ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** An identifier a manifest can use: it starts with a letter and holds no odd character. */
const nc = (prefix, id) =>
  `${prefix}-${String(id).replace(/[^A-Za-z0-9._-]/g, '-')}`;

/** Minutes as the course home says them: "40 min", "25–40 min", "4.5 h". */
export function duration(r, locale) {
  if (!r) return '';
  const T = (id, vars) => tr(locale, id, vars);
  const num = n => (locale === 'es' ? String(n).replace('.', ',') : String(n));
  if (r.hi < 90)
    return r.lo === r.hi
      ? T('c.min', { n: num(r.lo) })
      : T('c.minRange', { lo: num(r.lo), hi: num(r.hi) });
  const h = n => Math.round((n / 60) * 2) / 2;
  return h(r.lo) === h(r.hi)
    ? T('c.hour', { n: num(h(r.lo)) })
    : T('c.hourRange', { lo: num(h(r.lo)), hi: num(h(r.hi)) });
}

/**
 * What an item is called in a language, from the facts a page has (the course
 * home's rule): its own title, the lesson's, the data's, the scenario's.
 * @param {object} item
 * @param {object} facts - js/course/api.js courseFacts()
 * @param {'en'|'es'} locale
 * @param {(id: string) => string} [scenarioName] - the page's scenario titles
 */
export function itemTitle(item, facts, locale, scenarioName = id => id) {
  return (
    text(item.title, locale) ||
    (item.lesson && text(facts.lessons.get(item.lesson)?.title, locale)) ||
    (item.kind === 'pack' && item.pack) ||
    (item.kind === 'guide' && item.guide) ||
    (item.kind === 'dataset' &&
      (text(facts.datasets.get(item.dataset)?.title, locale) ||
        item.dataset)) ||
    (item.kind === 'scenario' && scenarioName(item.scenario)) ||
    item.id
  );
}

/**
 * Each item's links, in each of the pack's languages, and the course home's:
 * what the builder keeps in its verdict (js/coursePage.js makeLinks), for the
 * kit, which has no verdict.
 * @param {object} pack
 * @param {{itemsOf: Function, itemLink: Function, courseLink: Function, root: string}} lib
 * @returns {Promise<{items: Map<string, object>, course: string}>}
 */
export async function linksOf(pack, { itemsOf, itemLink, courseLink, root }) {
  const items = new Map();
  for (const { item } of itemsOf(pack)) {
    const entry = {};
    for (const locale of pack.locales) {
      const link = await itemLink(item, {
        root,
        locale,
        level: pack.courseLevel,
      });
      if (link) entry[locale] = link.href;
    }
    items.set(item.id, entry);
  }
  return { items, course: (await courseLink(pack, { root })).url };
}

/**
 * What buildCartridge reads of a manifest, without the manifest: for the kit,
 * which has links and times but not js/course/manifest.js (a module the course
 * builder also imports, which a lazy import from the kit would split into a
 * chunk of its own on the builder's route).
 * @param {object} pack
 * @param {{items: Map<string, object>, course: string}} links - linksOf()
 * @param {{items: Map<string, ?{lo: number, hi: number}>}} time - js/course/review.js estimate()
 * @param {Function} itemsOf - js/course/pack.js itemsOf
 */
export const manifestLike = (pack, links, time, itemsOf) => ({
  course: { home: links.course },
  items: itemsOf(pack).map(({ item }) => ({
    id: item.id,
    links: links.items.get(item.id) || {},
    minutes: time.items.get(item.id),
  })),
});

const lomString = (p, tag, locale, value) =>
  `<${p}:${tag}><${p}:string language="${locale}">${esc(value)}</${p}:string></${p}:${tag}>`;

const role = (p, name) =>
  `<${p}:intendedEndUserRole><${p}:source>IMSGLC_CC_Rolesv1p2</${p}:source><${p}:value>${name}</${p}:value></${p}:intendedEndUserRole>`;

/** One web link: its manifest resource and its descriptor file. */
function weblink({ id, title, description, href, roles, locale }) {
  const resource = `    <resource identifier="${esc(nc('r', id))}" type="imswl_xmlv1p3">
      <metadata>
        <lomr:lom>
          <lomr:general>
            <lomr:identifier><lomr:catalog>GUID</lomr:catalog><lomr:entry>${esc(nc('r', id))}</lomr:entry></lomr:identifier>
            ${lomString('lomr', 'title', locale, title)}
            ${lomString('lomr', 'description', locale, description)}
          </lomr:general>
          <lomr:educational>
            ${roles.map(r => role('lomr', r)).join('\n            ')}
          </lomr:educational>
        </lomr:lom>
      </metadata>
      <file href="${esc(nc('r', id))}.xml"/>
    </resource>`;
  const file = `<?xml version="1.0" encoding="UTF-8"?>
<webLink xmlns="${NS.wl}" xmlns:xsi="${NS.xsi}" xsi:schemaLocation="${NS.wl} ${SCHEMA_AT.wl}">
  <title>${esc(title)}</title>
  <url href="${esc(href)}" target="_blank"/>
</webLink>
`;
  return { id, title, resource, file, path: `${nc('r', id)}.xml` };
}

const LEARNER = ['Learner', 'Instructor'];
const INSTRUCTOR = ['Instructor'];

/**
 * The cartridge for a course, in one language.
 *
 * @param {object} pack - A valid /2 pack (a collection too)
 * @param {object} manifest - js/course/manifest.js courseManifest() of it: each
 *   item's links by language and its time, and the course home's link
 * @param {{locale?: 'en'|'es', name: (item: object) => string,
 *   notes?: boolean}} opts - `name` says what an item is called (the page's
 *   own naming, or `itemTitle`), `notes` puts the notes for instructors in the
 *   cartridge
 * @returns {{file: string, locale: string, manifest: string,
 *   parts: Array<{path: string, text: string}>,
 *   counts: {modules: number, links: number}, left: Array<{id: string, name: string}>}}
 */
export function buildCartridge(
  pack,
  manifest,
  { locale = 'en', name, notes = false }
) {
  const T = (id, vars) => tr(locale, id, vars);
  const byId = new Map(manifest.items.map(i => [i.id, i]));
  const title = text(pack.title, locale) || pack.id;
  const ident = nc('gravitas', `${pack.id}-${pack.version}-${locale}`);
  const home = manifest.course.home || null;
  const links = [];
  const left = [];
  const folders = [];

  const homeFolder = [];
  if (home) {
    homeFolder.push(
      weblink({
        id: 'course-home',
        title: T('c.home.title', { title }),
        description: T('c.home.desc'),
        href: home,
        roles: LEARNER,
        locale,
      })
    );
    if (pack.teacherGuide)
      homeFolder.push(
        weblink({
          id: 'teacher-guide',
          title: T('c.guide.title'),
          description: notes
            ? text(pack.teacherGuide, locale)
            : T('c.guide.desc'),
          href: home,
          roles: INSTRUCTOR,
          locale,
        })
      );
    folders.push({
      id: 'home',
      title: T('c.home'),
      links: homeFolder,
    });
  }

  for (const unit of pack.units) {
    const members = [];
    const noted = [];
    for (const item of unit.items) {
      const m = byId.get(item.id);
      const href = m?.links?.[locale] || m?.links?.en;
      const label = name(item);
      if (!href) {
        left.push({ id: item.id, name: label });
        continue;
      }
      const kind = T(`c.kind.${item.kind}`);
      const time = duration(m.minutes, locale);
      const note = text(item.studentNote, locale);
      const path =
        item.path && item.path !== 'core' ? T(`c.path.${item.path}`) : '';
      members.push(
        weblink({
          id: item.id,
          title: label,
          description: `${kind}${time ? `, ${time}` : ''}.${path ? ` ${path}` : ''}${note ? ` ${note}` : ''}`,
          href,
          roles: LEARNER,
          locale,
        })
      );
      const teacher = text(item.teacherNote, locale);
      if (teacher) noted.push(`${label}: ${teacher}`);
    }
    if (home && noted.length)
      members.push(
        weblink({
          id: `notes-${unit.id}`,
          title: T('c.notes.title', { unit: text(unit.title, locale) }),
          description: notes
            ? T('c.notes.text', {
                unit: text(unit.title, locale),
                notes: noted.join(' '),
              })
            : T('c.notes.desc'),
          href: home,
          roles: INSTRUCTOR,
          locale,
        })
      );
    folders.push({
      id: `unit-${unit.id}`,
      title: text(unit.title, locale) || unit.id,
      links: members,
    });
  }
  for (const f of folders) links.push(...f.links);

  const folderXml = f => `        <item identifier="${esc(nc('f', f.id))}">
          <title>${esc(f.title)}</title>
${f.links
  .map(
    l =>
      `          <item identifier="${esc(nc('i', l.id))}" identifierref="${esc(nc('r', l.id))}"><title>${esc(l.title)}</title></item>`
  )
  .join('\n')}
        </item>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${esc(ident)}" xmlns="${NS.cp}" xmlns:lomm="${NS.lomm}" xmlns:lomr="${NS.lomr}" xmlns:xsi="${NS.xsi}" xsi:schemaLocation="${NS.cp} ${SCHEMA_AT.cp} ${NS.lomm} ${SCHEMA_AT.lomm} ${NS.lomr} ${SCHEMA_AT.lomr}">
  <metadata>
    <schema>${PROFILE.schema}</schema>
    <schemaversion>${PROFILE.schemaVersion}</schemaversion>
    <lomm:lom>
      <lomm:general>
        <lomm:identifier><lomm:catalog>GUID</lomm:catalog><lomm:entry>${esc(ident)}</lomm:entry></lomm:identifier>
        ${lomString('lomm', 'title', locale, title)}
        <lomm:language>${locale}</lomm:language>
        ${lomString('lomm', 'description', locale, text(pack.summary, locale) || title)}
      </lomm:general>
      <lomm:rights>
        ${lomString('lomm', 'description', locale, T('c.rights'))}
      </lomm:rights>
    </lomm:lom>
  </metadata>
  <organizations>
    <organization identifier="${esc(nc('o', pack.id))}" structure="rooted-hierarchy">
      <title>${esc(title)}</title>
      <item identifier="${esc(nc('root', pack.id))}">
${folders.map(folderXml).join('\n')}
      </item>
    </organization>
  </organizations>
  <resources>
${links.map(l => l.resource).join('\n')}
  </resources>
</manifest>
`;
  return {
    file: `${pack.id}-${locale}.${PROFILE.extension}`,
    locale,
    manifest: xml,
    parts: links.map(l => ({ path: l.path, text: l.file })),
    counts: { modules: folders.length, links: links.length },
    left,
  };
}

// --- The archive: a stored ZIP -------------------------------------------------

let CRC = null;

/** CRC-32 (ZIP's), computed here so no runtime has to have it. */
export function crc32(bytes) {
  if (!CRC) {
    CRC = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++)
    c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * A ZIP of stored entries (no compression: a cartridge is a few dozen small
 * XML files, and a stored archive is valid and identical on every machine).
 * The date is a fixed stamp so the same cartridge is the same bytes.
 * @param {Array<{path: string, bytes: Uint8Array}>} entries - in order
 * @returns {Uint8Array}
 */
export function zipStored(entries) {
  const enc = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  const put = (v, n) => {
    const a = new Uint8Array(n);
    for (let i = 0; i < n; i++) a[i] = (v / 2 ** (8 * i)) & 0xff;
    return a;
  };
  const u16 = v => put(v, 2);
  const u32 = v => put(v, 4);
  const cat = parts => {
    const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
    let at = 0;
    for (const p of parts) (out.set(p, at), (at += p.length));
    return out;
  };
  for (const e of entries) {
    const name = enc.encode(e.path);
    const crc = crc32(e.bytes);
    const common = [
      u16(20), // version needed
      u16(0x0800), // UTF-8 names
      u16(0), // stored
      u16(0), // time
      u16(0x21), // date: 1980-01-01
      u32(crc),
      u32(e.bytes.length),
      u32(e.bytes.length),
      u16(name.length),
      u16(0),
    ];
    chunks.push(cat([u32(0x04034b50), ...common, name]), e.bytes);
    central.push(
      cat([
        u32(0x02014b50),
        u16(20),
        ...common,
        u16(0), // comment
        u16(0), // disk
        u16(0), // internal attributes
        u32(0), // external attributes
        u32(offset),
        name,
      ])
    );
    offset += 30 + name.length + e.bytes.length;
  }
  const start = offset;
  const size = central.reduce((s, c) => s + c.length, 0);
  return cat([
    ...chunks,
    ...central,
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(central.length),
    u16(central.length),
    u32(size),
    u32(start),
    u16(0),
  ]);
}

/**
 * A built cartridge as the archive's bytes: the manifest first, then each link.
 * @param {{manifest: string, parts: Array<{path: string, text: string}>}} built
 * @returns {Uint8Array}
 */
export function cartridgeBytes(built) {
  const enc = new TextEncoder();
  return zipStored(
    [{ path: 'imsmanifest.xml', text: built.manifest }, ...built.parts].map(
      p => ({ path: p.path, bytes: enc.encode(p.text) })
    )
  );
}
