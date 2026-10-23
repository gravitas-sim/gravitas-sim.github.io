// =============================================================================
// The Thin Common Cartridge profile, checked (Roadmap III Prompt 169)
// -----------------------------------------------------------------------------
// js/instructorCartridge.js writes a cartridge to one profile: the 1EdTech
// (IMS) Thin Common Cartridge Profile v1.0 (Final, 1 May 2015) over Common
// Cartridge v1.3. This module is the profile's rules as a checker, written
// from the three published documents, so the cartridge is held to the
// specification and not to the code that wrote it:
//
//   [TCC]  Thin Common Cartridge Profile: Implementation Guide (for CC v1.2 and
//          v1.3), v1.0 Final, 1 May 2015: sections 3.2 (content types), 4.1 to
//          4.3 (the model, resources, content packaging, manifest,
//          organization, web link), 4.4 (inline XML), 4.5 (metadata), 5.1
//          (the package may hold the manifest and web link files only).
//   [XSD]  ccv1p3_imscp_v1p2_v1p0.xsd (the CC v1.3 manifest profile),
//          ccv1p3_lommanifest_v1p0.xsd, ccv1p3_lomresource_v1p0.xsd and
//          ccv1p3_imswl_v1p3.xsd: element order, enumerations, required
//          attributes.
//   [SCH]  The Schematron rules inside ccv1p3_imscp_v1p2_v1p0.xsd, those that
//          apply to a cartridge of web links: RULE 2b to 2d (a web link
//          resource: at most one file, no href, no dependency), 7 (a
//          dependency), 8b (a link item has no children), 9a (a file once),
//          10 (a resource with an href has the file).
//
// The schemas themselves are NOT in this repository: their licence lets a
// developer redistribute them as is only after registering with 1EdTech, which
// nobody here may do (COURSE_PACKS.md, D-R10-54). What is here is each source
// file's SHA-256 and the rules above, and `tools/cartridge-validate.mjs` runs
// the real schemas, with xmllint, over a directory the operator points it at.
// That tool and a unit test (tests/commonCartridge.test.js) hold this checker
// to xmllint's verdict on a set of broken manifests.
//
// `parse` turns text into a DOM Document (the test passes the browser's
// DOMParser, the tool passes jsdom's), so this file imports nothing.
// =============================================================================

export const NS = {
  cp: 'http://www.imsglobal.org/xsd/imsccv1p3/imscp_v1p1',
  lomm: 'http://ltsc.ieee.org/xsd/imsccv1p3/LOM/manifest',
  lomr: 'http://ltsc.ieee.org/xsd/imsccv1p3/LOM/resource',
  wl: 'http://www.imsglobal.org/xsd/imsccv1p3/imswl_v1p3',
};

const NCNAME = /^[A-Za-z_][A-Za-z0-9._-]*$/;
const ROLES = new Set(['Learner', 'Instructor']);

const kids = (el, ns, name) =>
  [...el.children].filter(
    c => c.namespaceURI === ns && (name === undefined || c.localName === name)
  );
const names = el => [...el.children].map(c => c.localName);

/**
 * Every way a cartridge departs from the profile.
 *
 * @param {(text: string) => Document} parse - Text to an XML document
 * @param {string} manifestText - imsmanifest.xml
 * @param {Map<string, string>|Record<string, string>} files - The other files of the package, by path
 * @returns {string[]} Messages with the rule's source; empty when the cartridge conforms
 */
export function checkCartridge(parse, manifestText, files) {
  const out = [];
  const bad = (rule, message) => out.push(`[${rule}] ${message}`);
  const fileMap = files instanceof Map ? files : new Map(Object.entries(files));

  const doc = parse(manifestText);
  if (doc.querySelector('parsererror') || !doc.documentElement) {
    bad('XML', 'imsmanifest.xml is not well-formed');
    return out;
  }
  const root = doc.documentElement;
  if (root.namespaceURI !== NS.cp || root.localName !== 'manifest')
    return [...out, `[XSD] the root is not {${NS.cp}}manifest`];
  if (!NCNAME.test(root.getAttribute('identifier') || ''))
    bad('XSD', 'the manifest identifier is missing or not an NCName');
  if (root.hasAttribute('version'))
    bad('TCC 4.3.2', 'the version attribute of the manifest is prohibited');
  if (names(root).join() !== 'metadata,organizations,resources')
    bad(
      'XSD',
      `the manifest holds ${names(root).join(', ')}; expected metadata, organizations, resources (no child manifest, no authorizations)`
    );

  // --- metadata ([TCC 5.2.1], [XSD]) ---------------------------------------
  const meta = kids(root, NS.cp, 'metadata')[0];
  if (meta) {
    if (names(meta).join() !== 'schema,schemaversion,lom')
      bad('XSD', `manifest metadata holds ${names(meta).join(', ')}`);
    const [schema, version] = [...meta.children];
    if (schema?.textContent !== 'IMS Thin Common Cartridge')
      bad(
        'XSD',
        'schema must be "IMS Thin Common Cartridge" (a Thin cartridge)'
      );
    if (version?.textContent !== '1.3.0')
      bad('XSD', 'schemaversion must be 1.3.0');
    const lom = kids(meta, NS.lomm, 'lom')[0];
    const general = lom && kids(lom, NS.lomm, 'general')[0];
    if (!general) bad('TCC 4.5.1', 'manifest metadata needs a lom general');
    else {
      for (const f of ['identifier', 'title', 'description'])
        if (!kids(general, NS.lomm, f).length)
          bad(
            'TCC 4.5.1',
            `manifest metadata has no ${f} (GUID, title and description are recommended)`
          );
      for (const s of general.querySelectorAll(
        'title string, description string'
      ))
        if (!s.textContent.trim())
          bad('TCC 4.5.1', 'an empty title or description');
    }
  }

  // --- organization ([TCC 4.3.3]) ------------------------------------------
  const orgs = kids(root, NS.cp, 'organizations')[0];
  const items = [];
  const refs = new Set();
  const ids = new Set();
  const unique = (id, what) => {
    if (!NCNAME.test(id || ''))
      bad('XSD', `${what} identifier "${id}" is not an NCName`);
    if (ids.has(id)) bad('XSD', `identifier "${id}" is used twice`);
    ids.add(id);
  };
  if (orgs) {
    if (orgs.hasAttribute('default'))
      bad('TCC 4.3.3', 'the default attribute of organizations is prohibited');
    const list = kids(orgs, NS.cp, 'organization');
    if (list.length > 1) bad('TCC 4.3.3', 'more than one organization');
    for (const org of list) {
      unique(org.getAttribute('identifier'), 'organization');
      if (org.getAttribute('structure') !== 'rooted-hierarchy')
        bad('TCC 4.3.3', 'structure must be "rooted-hierarchy"');
      const top = kids(org, NS.cp, 'item');
      if (top.length !== 1)
        bad(
          'TCC 4.3.3',
          `the organization must be rooted on one item (it has ${top.length})`
        );
      const rootItem = top[0];
      if (rootItem) {
        if (kids(rootItem, NS.cp, 'title').length)
          bad('TCC 4.3.3', 'the root item must not have a title');
        if (rootItem.hasAttribute('identifierref'))
          bad('TCC 4.3.3', 'the root item is a container, not a link');
        const walk = (item, depth) => {
          unique(item.getAttribute('identifier'), 'item');
          if (item.hasAttribute('parameters'))
            bad(
              'TCC 4.3.3',
              'the parameters attribute of an item is not supported'
            );
          if (depth > 0) {
            const t = kids(item, NS.cp, 'title');
            if (t.length !== 1 || !t[0].textContent.trim())
              bad(
                'TCC 4.3.3',
                `item "${item.getAttribute('identifier')}" needs one title`
              );
          }
          const children = kids(item, NS.cp, 'item');
          if (item.hasAttribute('identifierref')) {
            refs.add(item.getAttribute('identifierref'));
            items.push(item);
            // [SCH 8b] a link item may not nest other items
            if (children.length)
              bad(
                'SCH 8b',
                `link item "${item.getAttribute('identifier')}" contains child items`
              );
          }
          for (const c of children) walk(c, depth + 1);
        };
        walk(rootItem, 0);
      }
    }
  }

  // --- resources ([TCC 4.2, 4.3.4], [SCH 2, 7, 9, 10]) ----------------------
  const resources = kids(root, NS.cp, 'resources')[0];
  const found = new Map();
  const used = new Set();
  if (resources) {
    for (const r of kids(resources, NS.cp, 'resource')) {
      const id = r.getAttribute('identifier');
      unique(id, 'resource');
      found.set(id, r);
      const type = r.getAttribute('type');
      if (type !== 'imswl_xmlv1p3')
        bad(
          'TCC 4.2',
          `resource "${id}" has type "${type}": only imswl_xmlv1p3 (web links) is written here, never web content`
        );
      // [SCH 2c] / [TCC 4.3.4]
      if (r.hasAttribute('href'))
        bad(
          'SCH 2c',
          `resource "${id}" has an href, which a web link resource must not`
        );
      // [SCH 2d] / [SCH 7]
      if (kids(r, NS.cp, 'dependency').length)
        bad('SCH 2d', `resource "${id}" has a dependency`);
      // [SCH 2b], [TCC 4.3.4]: a single file
      const fs = kids(r, NS.cp, 'file');
      if (fs.length !== 1)
        bad(
          'SCH 2b',
          `resource "${id}" must hold a single file (it holds ${fs.length})`
        );
      for (const f of fs) {
        const href = f.getAttribute('href');
        if (used.has(href)) bad('SCH 9a', `file "${href}" is used twice`);
        used.add(href);
        if (!fileMap.has(href))
          bad('TCC 5.1', `file "${href}" is not in the package`);
      }
      const m = kids(r, NS.cp, 'metadata')[0];
      if (m) {
        if (
          kids(m, NS.cp, 'schema').length ||
          kids(m, NS.cp, 'schemaversion').length
        )
          bad(
            'TCC 5.2.1',
            `resource "${id}": schema and schemaversion are not permitted in resource metadata`
          );
        const lom = kids(m, NS.lomr, 'lom')[0];
        const g = lom && kids(lom, NS.lomr, 'general')[0];
        for (const f of ['identifier', 'title', 'description'])
          if (!g || !kids(g, NS.lomr, f).length)
            bad(
              'TCC 4.5.2',
              `resource "${id}" has no ${f} (GUID, title and description are required)`
            );
        const edu = lom && kids(lom, NS.lomr, 'educational')[0];
        const roles = edu
          ? kids(edu, NS.lomr, 'intendedEndUserRole').map(x =>
              x.textContent.replace(/\s+/g, '')
            )
          : [];
        if (!roles.length)
          bad('TCC 4.5.2', `resource "${id}" declares no role`);
        for (const x of roles)
          if (![...ROLES].some(v => x === `IMSGLC_CC_Rolesv1p2${v}`))
            bad('TCC 4.5.2', `resource "${id}" has the role "${x}"`);
      } else bad('TCC 4.5.2', `resource "${id}" has no metadata`);
    }
  }
  for (const ref of refs)
    if (!found.has(ref))
      bad(
        'XSD',
        `an item points at resource "${ref}", which is not in the manifest`
      );
  for (const id of found.keys())
    if (!refs.has(id))
      bad(
        'TCC 4.3.3',
        `resource "${id}" is in no item (only learner-experience resources, each in the organization)`
      );

  // --- the package: manifest and web link files only ([TCC 5.1]) --------------
  for (const [path, text] of fileMap) {
    if (!used.has(path))
      bad('TCC 5.1', `file "${path}" is in the package and in no resource`);
    if (path.includes('/'))
      bad('TCC 5.1', `file "${path}" is in a folder (no hierarchy is needed)`);
    const d = parse(text);
    const w = d.documentElement;
    if (d.querySelector('parsererror') || !w) {
      bad('XML', `file "${path}" is not well-formed`);
      continue;
    }
    if (w.namespaceURI !== NS.wl || w.localName !== 'webLink')
      bad('TCC 4.3.4', `file "${path}" is not a {${NS.wl}}webLink`);
    else {
      if (names(w).join() !== 'title,url')
        bad(
          'XSD',
          `file "${path}" holds ${names(w).join(', ')}; expected title, url`
        );
      const title = kids(w, NS.wl, 'title')[0];
      if (!title?.textContent.trim()) bad('XSD', `file "${path}" has no title`);
      const url = kids(w, NS.wl, 'url')[0];
      let ok = false;
      try {
        ok = /^https?:$/.test(new URL(url?.getAttribute('href')).protocol);
      } catch {
        /* not a URL */
      }
      if (!ok) bad('XSD', `file "${path}" has no http(s) address`);
    }
  }
  return out;
}

/**
 * Broken versions of the cartridge built for the intro-astronomy course in English (its first link is r-course-home): each change breaks one rule, and
 * the checker must refuse it. tools/cartridge-validate.mjs runs the same
 * manifests through the schemas and records where xmllint refuses them too.
 */
/**
 * A web link file with its deflated link fragments replaced by a placeholder.
 * An item that carries its own data (an assignment, a scenario, a pack, the
 * course home itself) links to the app with the data deflated into the
 * fragment, and deflate's bytes differ between Node versions (CI is Node 20,
 * the Mac Node 24), so a digest of them is not a fact about the cartridge. What
 * is left is the structure and every address a reader follows; the fragments
 * are checked by decoding them (tests/commonCartridge.test.js), not by bytes.
 * Readable fragments (\`#investigation=...\`) are kept.
 */
export const versionFree = text =>
  text.replace(
    /(href="[^"#]*)#(?!investigation=)[A-Za-z0-9_-]{24,}/g,
    '$1#<payload>'
  );

export const MUTATIONS = [
  {
    name: 'a Common Cartridge schema name instead of Thin',
    rule: 'XSD',
    change: m => m.replace('IMS Thin Common Cartridge', 'IMS Common Cartridge'),
  },
  {
    name: 'another schema version',
    rule: 'XSD',
    change: m => m.replace('<schemaversion>1.3.0', '<schemaversion>1.4.0'),
  },
  {
    name: 'web content, which a Thin cartridge never holds',
    rule: 'TCC 4.2',
    change: m => m.replace('type="imswl_xmlv1p3"', 'type="webcontent"'),
  },
  {
    name: 'an href on a web link resource',
    rule: 'SCH 2c',
    change: m =>
      m.replace(
        '<resource identifier="r-course-home" type="imswl_xmlv1p3">',
        '<resource identifier="r-course-home" type="imswl_xmlv1p3" href="r-course-home.xml">'
      ),
  },
  {
    name: 'a dependency on a web link',
    rule: 'SCH 2d',
    change: m =>
      m.replace(
        '<file href="r-course-home.xml"/>',
        '<file href="r-course-home.xml"/><dependency identifierref="r-teacher-guide"/>'
      ),
  },
  {
    name: 'two files in one resource',
    rule: 'SCH 2b',
    change: m =>
      m.replace(
        '<file href="r-course-home.xml"/>',
        '<file href="r-course-home.xml"/><file href="r-teacher-guide.xml"/>'
      ),
  },
  {
    name: 'a file that is not in the package',
    rule: 'TCC 5.1',
    change: m =>
      m.replace(
        '<file href="r-course-home.xml"/>',
        '<file href="elsewhere.xml"/>'
      ),
  },
  {
    name: 'a title on the root item',
    rule: 'TCC 4.3.3',
    change: m =>
      m.replace(
        '<item identifier="root-intro-astronomy">',
        '<item identifier="root-intro-astronomy"><title>Root</title>'
      ),
  },
  {
    name: 'a second organization',
    rule: 'TCC 4.3.3',
    change: m =>
      m.replace(
        '</organizations>',
        '<organization identifier="o2" structure="rooted-hierarchy"><item identifier="root2"/></organization></organizations>'
      ),
  },
  {
    name: 'a flat structure',
    rule: 'TCC 4.3.3',
    change: m =>
      m.replace('structure="rooted-hierarchy"', 'structure="hierarchy"'),
  },
  {
    name: 'an item that points at nothing',
    rule: 'XSD',
    change: m =>
      m.replace('identifierref="r-course-home"', 'identifierref="r-nowhere"'),
  },
  {
    name: 'a link item with a child',
    rule: 'SCH 8b',
    change: m =>
      m.replace(
        '<item identifier="i-course-home" identifierref="r-course-home"><title>',
        '<item identifier="i-course-home" identifierref="r-course-home"><item identifier="x"><title>x</title></item><title>'
      ),
  },
  {
    name: 'a version on the manifest',
    rule: 'TCC 4.3.2',
    change: m =>
      m.replace('<manifest identifier=', '<manifest version="1" identifier='),
  },
  {
    name: 'a role nobody defined',
    rule: 'TCC 4.5.2',
    change: m =>
      m.replace(
        '<lomr:value>Learner</lomr:value>',
        '<lomr:value>Student</lomr:value>'
      ),
  },
  {
    name: 'a schema element inside resource metadata',
    rule: 'TCC 5.2.1',
    change: m => m.replace('<lomr:lom>', '<schema>x</schema><lomr:lom>'),
  },
  {
    name: 'a resource in no item',
    rule: 'TCC 4.3.3',
    change: m =>
      m.replace(
        '<item identifier="i-course-home" identifierref="r-course-home"><title>',
        '<item identifier="i-course-home" identifierref="r-teacher-guide"><title>'
      ),
  },
];
