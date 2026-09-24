# Embedding Gravitas: gravitas-embed/1

A Gravitas simulation can sit in someone else's page as an interactive figure:
a course page, an article, a slide. This is the public contract for doing that:
what an embed URL may ask for, the messages a page may exchange with the
figure, and what the figure will and will not do. It is kept small on purpose,
so that it can stay compatible.

The easy way to make one is the **figure builder** at [`/figure/`](figure/):
bring a state from Gravitas's Share dialog (or pick a scenario and a seed),
choose how the figure opens and looks, check it in the preview and copy the
markup. Everything below is what the builder writes, for anyone writing it by
hand or controlling a figure from their own page.

## The figure's address

A figure is a Gravitas URL with `?embed=1` in its query string and a share
state in its fragment:

```text
https://gravitas-sim.online/?embed=1&ev=1&theme=daylight&reset=authored#1z…
```

- **`embed=1`** alone is the embed Gravitas has always had: the canvas, the
  transport bar and an "Open in Gravitas" link, and nothing else. A link written
  before this contract existed behaves exactly as it did.
- **`ev=1`** opts into this contract. Only then are the options below read. An
  `ev` this version does not know is read as a plain `embed=1`.
- **The fragment** is a Gravitas share state, exactly what Share produces. It
  says which world the figure shows, with its seed, settings and camera, and
  whether it opens paused.

| Option     | Values                                        | Default      | What it does                                                                 |
| ---------- | --------------------------------------------- | ------------ | ---------------------------------------------------------------------------- |
| `lang`     | `en`, `es`                                    | the reader's | the figure's language, for this page only                                    |
| `theme`    | `midnight`, `deep`, `observatory`, `daylight` | the reader's | the figure's theme, for this page only                                       |
| `controls` | `transport`, `none`                           | `transport`  | whether the play controls are shown                                          |
| `motion`   | `reduced`                                     | the reader's | reduce motion whatever the reader's setting (it only ever adds reduction)    |
| `quality`  | `low`, `full`                                 | measured     | fix the rendering tier instead of measuring the machine                      |
| `reset`    | `authored`, `scenario`                        | `scenario`   | whether Reset returns to exactly this state, or to the scenario as it starts |
| `parent`   | an origin                                     | none         | the one page whose messages the figure obeys; see [Messages](#messages)      |

Every value is from a closed list, and a value outside it is ignored. There is
no option for text, HTML, style or a URL: the figure's title, caption and
fallback link belong to the page around it. A figure remembers nothing it was
asked for; its theme and language are never written to the reader's settings.

A contract figure (`ev=1`) with its controls shown has a **Reset** button in
its transport bar.

## The markup

The builder writes an iframe in a box that holds its shape, and optionally a
caption and a link to the same figure for a reader whose platform will not show
the frame:

```text
<figure style="margin:0;">
  <div style="position:relative;width:100%;padding-top:62.5000%;">
    <iframe src="https://gravitas-sim.online/?embed=1&amp;ev=1&amp;reset=authored#1z…"
      title="Gravitas simulation: Binary Pair"
      style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
      width="800" height="500"
      loading="lazy" allowfullscreen></iframe>
  </div>
  <figcaption>Two stars in orbit. <a href="https://gravitas-sim.online/#1z…" target="_blank" rel="noopener">Open this figure in Gravitas</a></figcaption>
</figure>
```

The padding-top box, the `width`/`height` attributes and the absence of a
`sandbox` attribute are deliberate: they are what survives the HTML editors of
the learning platforms instructors actually use (`js/embedMarkup.js` says why).
Every piece of text an author typed is escaped.

## Messages

A page can talk to a figure with `postMessage`. Every message is a plain object:

```js
{ protocol: 'gravitas-embed', version: 1, type, id?, state? }
```

`id` is the page's own label for a request, up to 64 characters from
`A-Z a-z 0-9 _ . : -`, echoed in the answer. Only `load` carries `state`.

**A page may send**

| `type`  | Fields  | What happens                                                                                          |
| ------- | ------- | ----------------------------------------------------------------------------------------------------- |
| `ping`  |         | the figure answers `ready` again                                                                      |
| `play`  |         | the simulation runs                                                                                   |
| `pause` |         | the simulation pauses                                                                                 |
| `reset` |         | the figure resets, as its `reset` option says                                                         |
| `load`  | `state` | the figure shows another share state (a fragment such as `1z…`, not a URL), decoded by Gravitas first |

**The figure sends**

| `type`   | Fields                | When                                                                                               |
| -------- | --------------------- | -------------------------------------------------------------------------------------------------- |
| `ready`  | `requests`, `running` | once its first world is built; `requests` lists what it will obey                                  |
| `status` | `running`             | after a request changes it, and when the reader pauses or resumes                                  |
| `ack`    | `id`                  | a request was done                                                                                 |
| `error`  | `id`, `code`          | a request was refused: `bad-message`, `unsupported-version`, `unknown-type`, `bad-state`, `failed` |

A message is refused, not ignored, if it has a key this version does not
define, an id outside the pattern, or more than 16 KiB of JSON; a `state` must
look like a share fragment, be at most 8000 characters, and decode.

```js
const figure = document.querySelector('iframe');
const GRAVITAS = 'https://gravitas-sim.online';

window.addEventListener('message', event => {
  if (event.source !== figure.contentWindow || event.origin !== GRAVITAS)
    return;
  const m = event.data;
  if (m?.protocol !== 'gravitas-embed') return;
  if (m.type === 'ready') console.log('the figure accepts', m.requests);
  if (m.type === 'status') console.log(m.running ? 'running' : 'paused');
});

function pause() {
  figure.contentWindow.postMessage(
    { protocol: 'gravitas-embed', version: 1, type: 'pause', id: 'pause-1' },
    GRAVITAS
  );
}
```

For that to work the figure's URL must name the page's origin:
`…&ev=1&parent=https%3A%2F%2Fyour-course.example.edu#…`.

## Security model

- **No `parent` option.** The figure tells whoever framed it that it is
  `ready`, with the protocol, the version and an empty `requests` list and
  nothing else, sent to any origin because a page cannot use it for anything.
  It listens to nobody.
- **A `parent` option.** It must be exactly an origin: `https://` and a host
  name, with an optional port and nothing after, or plain `http://` on
  `localhost`/`127.0.0.1` for development. The figure then reads messages only
  from `window.parent`, and only when their origin is that one exactly. Anything
  else is dropped **without an answer**, so a page that is not the parent learns
  nothing by asking. Every answer is addressed to that origin and no other.
- **An opaque parent** (a `data:` document, or any page whose origin is
  `"null"`) can never be the configured parent, since every such page shares that
  origin. It gets `ready` only if the figure has no `parent` option.
- **Nothing reads the figure.** No message returns the reader's progress,
  submissions, lesson answers, instructor materials or anything in storage.
  `load` takes a share state that Gravitas's own decoder accepts, never a URL,
  and no message navigates the frame.

**Sandboxing.** A `sandbox` attribute on the figure's iframe, or a parent page
that is itself sandboxed without `allow-same-origin`, gives the figure an opaque
origin too, because sandboxing is inherited. The figure's scripts then cannot
load its own modules and it will not start. If the page around a figure is
sandboxed, include `allow-scripts allow-same-origin`.

## Compatibility

- `?embed=1` without `ev` will keep meaning what it means today.
- A version-1 option or message will keep meaning what it means today. New
  options or message types come with a new version, `ev=2` and `version: 2`, and
  a figure that does not know a version treats it as the plain embed, or refuses
  the message with `unsupported-version`.
- The reason unknown keys are refused rather than ignored: a page's old
  messages can never start meaning something new.

The contract is implemented in `js/embedOptions.js` (the URL),
`js/embedMessages.js` (the messages) and `js/embedBridge.js` (whom the figure
obeys), and held by `tests/embedContract.test.js`,
`e2e/embedContract.spec.js` (a parent page at another origin, a page that is
not the parent, an opaque parent, a resized frame, offline) and
`e2e/figureBuilder.spec.js`.
