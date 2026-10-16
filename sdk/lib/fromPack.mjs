// =============================================================================
// `sdk init <type> <id> --from <pack>`: a pack an author already made
// -----------------------------------------------------------------------------
// The Composer (/studio/lesson/) saves an investigation pack, the course
// builder (/studio/course/) a course pack, the Scenario Studio (/studio/) a
// scenario pack. This turns one of those files into a package that `sdk
// validate`, `sdk test` and `sdk review` run on, with nothing hand-copied and
// no manifest to edit: the manifest is written from the pack, and the README
// starts with the Author and Sources headings CONTRIBUTING_CONTENT.md asks for.
//
// What it decides, so the author does not:
//   - the package id is the id the author typed; a pack saved under another id
//     is written under that one (the extension must provide the id its file
//     carries), and the change is reported
//   - the version is the pack's own, or 0.1.0
//   - authored text is CC BY 4.0
//   - both languages are carried from the pack: a pack that declares English and
//     Spanish and has no Spanish title is refused here, with what to do, rather
//     than failing `sdk review` later; a pack that declares English only
//     becomes an English-only package and its README says so
//   - a remix names the investigation it came from, in the manifest's
//     citations and the README's Sources
// Nothing here reads a file or parses JSON: the CLI gives it the parsed pack.
// =============================================================================

/** The pack format each package type wraps. */
export const PACK_FORMATS = {
  'investigation-pack': 'gravitas.investigation-pack',
  'course-pack': 'gravitas.course-pack',
  'scenario-pack': 'gravitas.scenario-pack',
};

const LANGUAGES = { en: 'English', es: 'Spanish' };
const SEMVER = /^\d+\.\d+\.\d+$/;
const isText = v => typeof v === 'string' && v.trim() !== '';

/** A refusal the CLI prints as it is, with exit status 2. */
export class FromError extends Error {}

/** The type a pack's own `format` names, or undefined. */
export const typeOfPack = from =>
  Object.entries(PACK_FORMATS).find(([, f]) => f === from?.format)?.[0];

/**
 * What a pack says about itself, checked just far enough to write a manifest.
 * The rest is `sdk validate`'s.
 * @param {string} type - The package type asked for
 * @param {string} id - The package's id
 * @param {unknown} from - The parsed pack
 * @param {string} [source] - The file's name, for messages
 * @returns {{pack: object, rewritten: boolean, title: object, version: string,
 *   locales: string[], citations: object[], derivedFrom?: object}}
 */
export function readPack(type, id, from, source = 'the pack') {
  if (!PACK_FORMATS[type])
    throw new FromError(
      '--from is for an investigation-pack, a course-pack or a scenario-pack: the file the Composer, the course builder or the Scenario Studio saved'
    );
  if (!from || typeof from !== 'object' || Array.isArray(from))
    throw new FromError(`${source}: not a Gravitas pack (it is not an object)`);
  if (typeof from.format !== 'string')
    throw new FromError(
      `${source}: not a Gravitas pack (it has no "format" field)`
    );
  const named = typeOfPack(from);
  if (named !== type)
    throw new FromError(
      named
        ? `${source} is a ${from.format}; run init ${named} for it, not init ${type}`
        : `${source} is a ${from.format}, which is not a pack init can wrap (${Object.values(PACK_FORMATS).join(', ')})`
    );

  const titleOf =
    from.title && typeof from.title === 'object' ? from.title : {};
  if (!isText(titleOf.en))
    throw new FromError(
      `${source}: the pack has no English title (title.en); set one and save it again`
    );
  const declared = Array.isArray(from.locales)
    ? from.locales
    : Object.keys(titleOf).filter(l => LANGUAGES[l] && isText(titleOf[l]));
  const unknown = declared.filter(l => !LANGUAGES[l]);
  if (unknown.length)
    throw new FromError(
      `${source}: the pack declares a language the catalog does not carry (${unknown.join(', ')}); English and Spanish are the two`
    );
  if (!declared.includes('en')) declared.unshift('en');
  const title = { en: titleOf.en };
  if (declared.includes('es')) {
    if (!isText(titleOf.es))
      throw new FromError(
        `${source}: the pack declares English and Spanish but has no Spanish title (title.es). ` +
          'Write it (in the Composer, the Translation panel) and save again, or remove "es" from the pack’s locales to make an English-only package. ' +
          'Gravitas does not translate a package for you.'
      );
    title.es = titleOf.es;
  }

  const rewritten = from.id !== id;
  const pack = rewritten ? { ...from, id } : from;
  const version = SEMVER.test(from.version) ? from.version : '0.1.0';
  const d = from.derivedFrom;
  const steps = d?.digest ? ` (steps ${d.digest})` : '';
  const citations =
    d && typeof d === 'object' && isText(d.id)
      ? [
          {
            text: `A remix of the Gravitas investigation "${d.id}" version ${d.version}${steps}, itself CC BY 4.0`,
          },
        ]
      : [];
  return {
    pack,
    rewritten,
    title,
    version,
    locales: declared,
    citations,
    derivedFrom: citations.length ? d : undefined,
  };
}

const KIND = {
  'investigation-pack':
    'an investigation-pack extension: a guided investigation as data',
  'course-pack':
    'a course-pack extension: an ordering of lessons Gravitas already has',
  'scenario-pack':
    'a scenario-pack extension: settings, a seed and bodies, as data',
};
const FILE = {
  'investigation-pack': 'investigation.json',
  'course-pack': 'course.json',
  'scenario-pack': 'scenario.json',
};

/** The README `sdk review` reads: Author and Sources, and what languages. */
export function readmeFor(type, id, name, info, { author, sources } = {}) {
  const languages = info.locales.map(l => LANGUAGES[l]).join(' and ');
  const sourceLines = [];
  if (sources) sourceLines.push(sources);
  if (info.citations.length)
    sourceLines.push(
      `${info.citations[0].text}. The changes are in ${FILE[type]}.`
    );
  if (!sourceLines.length)
    sourceLines.push(
      'What it is based on ("original work" is a complete answer).'
    );
  return `# ${info.title.en}

${KIND[type][0].toUpperCase()}${KIND[type].slice(1)}, made from \`${name}\` with \`npm run sdk -- init ${type} ${id} --from ${name}\`. Its text is in \`${FILE[type]}\`.

## Author

${author || 'Who wrote this, in the words you want printed.'}

## Sources

${sourceLines.join('\n\n')}

## Languages

${info.locales.length > 1 ? `${languages}, in every string.` : `${languages} only; the pack declares one language.`}

## License

The text is CC BY 4.0, the license of Gravitas's own teaching material.
`;
}

/** What `init` should remind the author of after writing the package. */
export const reminders = ({ author }) =>
  author
    ? []
    : [
        'README.md: the Author line is still the placeholder; pass --author "<name>" or write it, in the words you want printed',
      ];
