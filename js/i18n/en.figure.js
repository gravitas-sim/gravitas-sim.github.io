// =============================================================================
// The figure builder, in English
// -----------------------------------------------------------------------------
// Its own catalog because it is its own page: /figure/ is a separate bundle
// that only an author opens, and its strings have no business in the
// application's start-up or deferred catalogs. js/figure/i18n.js reads this
// and ./es.figure.js and nothing else.
// =============================================================================

export const EN_FIGURE = {
  'fig.doc.title': 'Figure builder | Gravitas',
  'fig.title': 'Make an interactive figure',
  // The page's own landmark: its preview frame holds the application's.
  'fig.main.label': 'Figure builder',
  'fig.lang.label': 'Language',
  'fig.intro':
    'Turn a Gravitas simulation into a figure for a course page or an article: choose what it shows and how, check it in the preview, and copy the markup. Nothing you type here is sent anywhere; the figure is the link.',
  'fig.back': 'Back to Gravitas',

  'fig.what.title': 'What it shows',
  'fig.what.link.label': 'A Gravitas link',
  'fig.what.link.hint':
    'In Gravitas, set the simulation up, open Share and choose “Build a figure”, or copy the link and paste it here.',
  'fig.what.or': 'or start from a scenario',
  'fig.what.scenario.label': 'Scenario',
  'fig.what.seed.label': 'Seed',
  'fig.what.seed.hint':
    'The same seed builds the same world every time. Leave it as it is unless you want a different one.',
  'fig.what.start.label': 'When the figure opens',
  'fig.what.start.running': 'running',
  'fig.what.start.paused': 'paused',
  'fig.status.link': '{scenario}, {bodies}',
  'fig.status.seeded': '{scenario}, built from seed {seed}',
  'fig.status.bodies.one': '1 object written out',
  'fig.status.bodies.many': '{n} objects written out',
  'fig.status.bodies.seeded': 'built from its seed',
  'fig.error.link.foreign':
    'That link is not a Gravitas simulation link. Copy one from Share in Gravitas.',
  'fig.error.link.unreadable':
    'That link could not be read. It may have been cut short when it was copied.',
  'fig.error.seed': 'A seed is letters and digits only.',

  'fig.look.title': 'How it looks',
  'fig.look.lang.label': 'Language of the figure',
  'fig.look.lang.reader': 'the reader’s',
  'fig.look.theme.label': 'Theme',
  'fig.look.theme.reader': 'the reader’s',
  'fig.look.theme.midnight': 'Midnight',
  'fig.look.theme.deep': 'Deep Space',
  'fig.look.theme.observatory': 'Observatory',
  'fig.look.theme.daylight': 'Daylight',
  'fig.look.aspect.label': 'Shape',
  'fig.look.controls.label': 'Show the play controls',
  'fig.look.motion.label': 'Reduce motion',
  'fig.look.quality.label': 'Low-cost rendering, for older machines',
  'fig.look.reset.label': 'Reset returns to',
  'fig.look.reset.authored': 'exactly this state',
  'fig.look.reset.scenario': 'the scenario as it starts',

  'fig.words.title': 'Words around it',
  'fig.words.name.label': 'Title',
  'fig.words.name.hint':
    'What a screen reader announces for the figure. Leave it empty to use the scenario’s name.',
  'fig.words.caption.label': 'Caption',
  'fig.words.fallback.label': 'Add a link to the figure under it',
  'fig.words.fallback.text': 'Open this figure in Gravitas',

  'fig.page.title': 'Controlling it from your page',
  'fig.page.intro':
    'Optional. If your page will send the figure play, pause, reset or load messages, give its origin. The figure obeys that origin and no other; without one it listens to nobody.',
  'fig.page.origin.label': 'Your page’s origin',
  'fig.page.origin.placeholder': 'https://your-course.example.edu',
  'fig.page.origin.bad':
    'An origin is https:// and a host name, with nothing after it, like https://your-course.example.edu.',
  'fig.page.docs': 'How the messages work',

  'fig.preview.title': 'Preview',
  'fig.preview.frame': 'Preview of the figure',

  'fig.out.title': 'Copy it',
  'fig.out.markup.label': 'Markup for your page',
  'fig.out.link.label': 'Plain link',
  'fig.out.copy.markup': 'Copy markup',
  'fig.out.copy.link': 'Copy link',
  'fig.out.copied': 'Copied.',
  'fig.out.copyFailed': 'Could not copy. Select the text and copy it yourself.',
  'fig.out.none': 'Choose what the figure shows first.',

  'fig.frame.title': 'Gravitas simulation: {scenario}',
};
