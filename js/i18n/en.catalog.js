// =============================================================================
// /catalog/ in English
// -----------------------------------------------------------------------------
// The curated catalog's own messages, read by js/catalog/i18n.js, and by the
// observatory when it opens an installed pack (js/catalog/installed.js
// registers them there). An entry's title, summary and course text come from
// the entry itself, in each language it carries; everything the page says
// about them is here.
// =============================================================================

export const EN_CATALOG = {
  'cat.doc.title': 'Catalog | Gravitas',
  'cat.main.label': 'Catalog',
  'cat.lang.label': 'Language',
  'cat.title': 'Catalog',
  'cat.intro':
    'Data, courses and instruments for Gravitas. Everything here was reviewed before it was listed, and none of it runs code. A data pack or a course you install is kept on this device and works offline.',
  'cat.back': 'Back to Gravitas',
  'cat.observatory': 'Observatory',
  'cat.loading': 'Loading the catalog…',
  'cat.loadFailed': 'The catalog did not load: {why}',
  'cat.retry': 'Try again',
  'cat.storage.persistent':
    'Installed packs are kept in this browser until you remove them.',
  'cat.storage.memory':
    'This browser will not keep installed packs, so they last only until this page closes.',
  'cat.filter.title': 'Find',
  'cat.filter.search': 'Search',
  'cat.filter.searchHint': 'A title, an object, a license or an id',
  'cat.filter.type': 'Show',
  'cat.filter.type.all': 'Everything',
  'cat.filter.type.data-pack': 'Data packs',
  'cat.filter.type.course-pack': 'Courses',
  'cat.filter.type.built-in': 'Built into Gravitas',
  'cat.filter.type.installed': 'Installed here',
  'cat.count': '{shown} of {total} shown.',
  'cat.none': 'Nothing matches.',
  'cat.type.data-pack': 'Data pack',
  'cat.type.course-pack': 'Course',
  'cat.type.built-in': 'Built in',
  'cat.version': 'Version {version}',
  'cat.status.built-in': 'Part of Gravitas: there is nothing to install.',
  'cat.status.available': 'Not installed.',
  'cat.status.installed': 'Installed, version {version}.',
  'cat.status.update':
    'Installed, version {installed}. Version {version} is available.',
  'cat.status.newer':
    "Installed, version {installed}, which is newer than the catalog's {version}.",
  'cat.status.incompatible':
    'Needs Gravitas {needs}; this is {platform}. It cannot be installed here.',
  'cat.size': 'Size',
  'cat.size.archive': '{download} to download, {unpacked} installed',
  'cat.size.builtIn': '{bytes} when it is used',
  'cat.works': 'Works with',
  'cat.works.value': 'Gravitas {range} (this is {platform})',
  'cat.license': 'License',
  'cat.cite': 'Cite',
  'cat.reviewed': 'Reviewed',
  'cat.reviewed.value': '{date}: {checks}',
  'cat.provides': 'Provides',
  'cat.provides.dataPacks': 'data: {ids}',
  'cat.provides.courses': 'a course: {ids}',
  'cat.provides.widgetFamilies': 'instruments: {ids}',
  'cat.provides.investigations': 'lessons: {ids}',
  'cat.provides.other': '{what}: {ids}',
  'cat.object': 'Object',
  'cat.install': 'Install for offline use',
  'cat.update': 'Update to {version}',
  'cat.remove': 'Remove',
  'cat.open': 'Open in the observatory',
  'cat.showCourse': 'Show the course',
  'cat.hideCourse': 'Hide the course',
  'cat.installing': 'Installing {title}…',
  'cat.installedNow': '{title} is installed, and works offline.',
  'cat.removed': '{title} was removed.',
  'cat.breaking':
    'Version {version} is a new major version. Anything that names version {installed}, such as an assignment, may need to change.',
  'cat.error.incompatible': 'It needs a different version of Gravitas.',
  'cat.error.notInstallable':
    'It is built into Gravitas and has nothing to install.',
  'cat.error.network':
    'It did not download. Check the connection and try again.',
  'cat.error.archive':
    'It downloaded but failed a check ({check}), so it was not installed. Nothing you had installed has changed.',
  'cat.error.manifest':
    'Its manifest is not the package the catalog lists, so it was not installed.',
  'cat.error.content':
    'Its data did not pass the checks, so it was not installed.',
  'cat.error.storage':
    'This browser would not keep it. There may be no room left, or storage may be blocked.',
  'cat.check.checksum': 'its checksum is not the one the catalog names',
  'cat.check.tooLarge': 'it is larger than a pack may be',
  'cat.check.unpackedTooLarge': 'it unpacks to more than a pack may',
  'cat.check.notGzip': 'it is not a compressed archive',
  'cat.check.badHeader': 'its structure is damaged',
  'cat.check.entryType': 'it holds something other than plain files',
  'cat.check.unsafePath': 'it names a file outside itself',
  'cat.check.duplicate': 'it names a file twice',
  'cat.check.tooManyEntries': 'it holds too many files',
  'cat.check.truncated': 'it is cut short',
  'cat.check.order': 'its files are in the wrong order',
  'cat.check.unlisted': 'a file in it has no checksum',
  'cat.check.entryChecksum': 'a file in it does not match its checksum',
  'cat.check.missing': 'a file it lists is missing',
  'cat.opening': 'Opening the installed pack…',
  'cat.openMissing':
    'Nothing called {id} is installed in this browser. Install it from the catalog first.',
  'cat.openFailed': 'The installed pack could not be opened: {why}',
  'cat.course.label': 'The course: {title}',
  'cat.course.teacher': 'For the teacher',
  'cat.course.student': 'For the student',
  'cat.course.open': 'Open {title}',
};
