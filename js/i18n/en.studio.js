// =============================================================================
// The words for the Scenario Studio (/studio/), in English
// -----------------------------------------------------------------------------
// Imported by js/studioPage.js alone. The page also reads strings the
// application already has in both languages - the Settings panel's labels,
// the scenario titles and tags, the rail's instrument names, and the Orbital
// System Builder's and precise placement's field labels and errors - so what
// is here is only what the Studio says that nothing else does.
// =============================================================================

export const EN_STUDIO = {
  'studio.title': 'Scenario Studio',
  'studio.intro':
    'Make a scenario as data: the settings it runs under, the bodies it starts with, the seed that makes it the same world every time, and the instruments it opens with. Save it as a file the Gravitas SDK can check and package, or open it in Gravitas as a link.',
  'studio.back': 'Back to Gravitas',
  'studio.lang.label': 'Language',
  'studio.toolbar.label': 'Scenario file',
  'studio.action.new': 'New scenario',
  'studio.action.fromLabel': 'Start from a built-in scenario',
  'studio.action.from': 'Start from it',
  'studio.from.generated': 'Generated from settings',
  'studio.from.handBuilt': 'Settings only (bodies placed by code)',
  'studio.action.open': 'Open a file',
  'studio.action.save': 'Save as a file',
  'studio.action.copy': 'Copy link',
  'studio.action.openApp': 'Open in Gravitas',
  'studio.action.preview': 'Preview',
  'studio.action.undo': 'Undo',
  'studio.action.redo': 'Redo',
  'studio.action.newSeed': 'New seed',
  'studio.drafts.label': 'Drafts in this browser',
  'studio.drafts.open': 'Open draft',
  'studio.drafts.delete': 'Delete draft',
  'studio.storage.failed':
    'This browser is not keeping drafts, so a closed tab loses your work. Save it as a file.',
  'studio.copyOf': '{title} (a copy)',

  'studio.section.about': 'About the scenario',
  'studio.section.world': 'Settings',
  'studio.section.bodies': 'Bodies',
  'studio.section.instruments': 'Instruments',
  'studio.section.start': 'How it starts',
  'studio.language.en': 'English',
  'studio.language.es': 'Spanish',
  'studio.field.id': 'Identifier',
  'studio.hint.id':
    'Lower-case words joined by hyphens, such as three-body-figure-eight. The file and the SDK use it.',
  'studio.field.version': 'Version',
  'studio.field.title': 'Title ({language})',
  'studio.field.summary': 'Summary ({language})',
  'studio.field.tags': 'Tags, up to four',
  'studio.field.open': 'Panels open at the start',
  'studio.field.tools': 'Tools out at the start',
  'studio.field.seed': 'Seed',
  'studio.hint.seed':
    'A whole number from 0 to 4294967295. The same seed builds the same world.',
  'studio.field.zoom': 'Zoom',
  'studio.hint.zoom':
    'Screen pixels per simulation unit. Blank for the default.',
  'studio.field.inclination': 'Observer inclination (degrees)',
  'studio.hint.inclination': '90 is edge-on, 0 face-on. Blank for edge-on.',
  'studio.field.paused': 'Start paused',
  'studio.hint.settings':
    'Blank is the Gravitas default, shown in gray. Only the settings a scenario can carry are here; bounds are written under each number.',
  'studio.hint.range': 'From {min} to {max}.',
  'studio.group.physics': 'Physics',
  'studio.group.population': 'Generated population',
  'studio.group.display': 'Time and display',
  'studio.value.on': 'On',
  'studio.value.off': 'Off',
  'studio.value.none': 'None',
  'studio.value.default': 'Default ({value})',
  'studio.setting.star_only_gravity': 'Only stars pull',
  'studio.setting.max_timestep': 'Largest integration step (time units)',
  'studio.setting.min_interaction_distance':
    'Softening length (simulation units)',
  'studio.setting.enable_star_merging': 'Stars merge on contact',
  'studio.setting.bh_masses': 'Black-hole masses, one each (solar masses)',
  'studio.setting.num_micro_stars': 'Micro stars',
  'studio.setting.micro_star_high_velocity': 'Fast micro stars',
  'studio.setting.test_star_slingshot': 'A test star on a slingshot pass',
  'studio.setting.bh_layout': 'Black-hole layout',
  'studio.setting.preset_zoom': 'Starting zoom',
  'studio.setting.bh_environment': 'Black-hole surroundings',
  'studio.setting.bh_disk_inclination': 'Accretion-disk inclination (degrees)',
  'studio.hint.bodies':
    'A scenario either generates its population from the settings under its seed, or brings its own bodies. Adding bodies switches the generated population off.',
  'studio.system.heading': 'An orbital system',
  'studio.system.none':
    'A star, and what orbits it, entered as orbits rather than as positions and velocities.',
  'studio.system.add': 'Add an orbital system',
  'studio.system.remove': 'Remove the orbital system',
  'studio.typed.heading': 'Typed bodies',
  'studio.typed.body': 'Body {n}',
  'studio.typed.add': 'Add a body by position and velocity',
  'studio.typed.remove': 'Remove body {n}',
  'studio.hint.instruments':
    'They open when the scenario does, as if a reader had pressed them on the rail.',

  'studio.checks.heading': 'Checks',
  'studio.checks.valid': 'The scenario is valid.',
  'studio.checks.count':
    '{count} problem(s) to fix before the scenario can be saved.',
  'studio.checks.none': 'Nothing to fix.',
  'studio.checks.caution': 'Caution: {text}',
  'studio.caution.handBuilt':
    '{scenario} places its bodies by code, so only its settings were copied. This scenario builds the world those settings generate, which is not the same one.',
  'studio.caution.unbound':
    '{name} moves at {speed} against the rest, more than the {escape} that is enough to escape them (simulation units per time unit), so it will probably leave. This treats everything else as one mass at its barycenter: an estimate, not a proof.',
  'studio.caution.step':
    'The integration step is longer than this system needs. A step of at most {step} time units gives its shortest orbit five hundred steps.',
  'studio.diff.heading': 'Changes',
  'studio.diff.none': 'No changes since it was opened or saved.',
  'studio.diff.count': '{count} change(s) since it was opened or saved.',
  'studio.diff.added': 'added',
  'studio.diff.removed': 'removed',
  'studio.diff.changed': 'changed',
  'studio.preview.heading': 'Preview',
  'studio.preview.frame': 'Gravitas, running this scenario',
  'studio.raw.heading': 'Raw data',
  'studio.raw.label': 'The scenario file, as JSON',
  'studio.raw.apply': 'Apply',
  'studio.raw.revert': 'Revert',
  'studio.raw.notJson': 'That is not valid JSON: {error}. Nothing was changed.',
  'studio.raw.applied': 'Applied. Undo takes it back.',

  'studio.status.new': 'A new scenario. It is saved in this browser as you go.',
  'studio.status.restored': 'Your draft {id} is back where you left it.',
  'studio.status.started': 'Started from {scenario}.',
  'studio.status.startedDropped':
    'Started from {scenario}. Settings a scenario file cannot carry were left out: {keys}.',
  'studio.status.saved': 'Saved {file}.',
  'studio.status.copied': 'The link is on the clipboard.',
  'studio.status.copyFailed': 'The browser would not copy the link.',
  'studio.status.previewed':
    'The preview shows the scenario as a link opens it.',
  'studio.status.fixFirst': 'Fix the problems listed under Checks first.',
  'studio.status.undone': 'Undone.',
  'studio.status.redone': 'Redone.',
  'studio.status.draftOpened': 'Opened the draft {id}.',
  'studio.status.draftDeleted': 'Deleted the draft {id}.',
  'studio.status.draftInUse':
    'That is the scenario you are editing; open another first.',
  'studio.file.unreadable': 'That file could not be read as JSON.',
  'studio.file.notPack':
    'That file is neither a Gravitas scenario nor an Orbital System Builder file.',
  'studio.file.newer':
    'That file was made by a newer version of Gravitas (format version {version}). Reload the page and try again.',
  'studio.file.opened': 'Opened {id}.',
  'studio.conflict.heading': 'A draft with this identifier already exists',
  'studio.conflict.text':
    'Your draft {id} is different from the file. These fields differ:',
  'studio.conflict.replace': 'Replace my draft with the file',
  'studio.conflict.both': 'Keep both',
  'studio.conflict.cancel': 'Cancel',
  'studio.conflict.kept': 'The file is open as {id}; your draft is kept.',
  'studio.conflict.cancelled': 'Nothing was opened.',

  'studio.error.notObject': 'This is not an object.',
  'studio.error.unknownField':
    '“{key}” is not something a scenario file holds.',
  'studio.error.format': 'This is not a Gravitas scenario file.',
  'studio.error.formatVersion':
    'This format version is not one this Gravitas reads.',
  'studio.error.id':
    'Lower-case words joined by hyphens, such as three-body-figure-eight.',
  'studio.error.version': 'A version such as 1.0.0.',
  'studio.error.localesEn':
    'A scenario is always in English, and may be in Spanish too.',
  'studio.error.locale': 'Gravitas has no interface in “{locale}”.',
  'studio.error.text': 'A text in each language.',
  'studio.error.textMissing':
    'Write this in every language the scenario declares.',
  'studio.error.textLong': 'At most {max} characters.',
  'studio.error.textUnsafe': 'Plain text only: no markup and no web addresses.',
  'studio.error.textLocale':
    '“{locale}” is not one of the scenario’s languages.',
  'studio.error.tags': 'At most four tags.',
  'studio.error.tag': '“{tag}” is not a scenario tag.',
  'studio.error.tagsRepeat': 'A tag is chosen twice.',
  'studio.error.seed': 'A whole number from 0 to 4294967295.',
  'studio.error.settings': 'The settings are not readable.',
  'studio.error.settingUnknown':
    '“{key}” is not a setting a scenario can carry.',
  'studio.error.bool': 'On or off.',
  'studio.error.numbers':
    'Up to {max} numbers from {low} to {high}, separated by commas.',
  'studio.error.option': 'One of: {options}.',
  'studio.error.int': 'A whole number.',
  'studio.error.number': 'A number.',
  'studio.error.range': 'Outside the range {min} to {max}.',
  'studio.error.zoom': 'A zoom greater than 0 and at most 1000.',
  'studio.error.pan': 'A pan of x and y in pixels.',
  'studio.error.observer': 'An inclination and a position angle.',
  'studio.error.list': 'A list.',
  'studio.error.instrument': '“{id}” is not on the rail.',
  'studio.error.listRepeat': 'Chosen twice.',
  'studio.error.system': 'The orbital system needs a list of bodies.',
  'studio.error.tooMany': 'At most {max} bodies.',
  'studio.error.name': 'A plain name of at most 40 characters.',
  'studio.error.populationWithBodies':
    'Set this to 0: a scenario with its own bodies does not also generate them.',
};
