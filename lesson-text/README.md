# Spanish lesson text, keyed by step id

The text a person edits. The app never imports these files: `npm run
lesson-text` writes the index-aligned files it loads (`js/data/investigations/es`,
`js/data/investigations/depth/es`, and the `*_ES` statements of the
`js/data/investigations/*-sequence.js` modules), and `npm run lesson-text:check`
fails if any is out of date. Never edit a written file by hand.

- `es/<id>.js` a lesson's Spanish; `depth-es/<id>.js` its deeper steps;
  `sequences/<name>-sequence.js` the `*_ES` constants of a sequence module.
- In each, `steps` is an object with one entry per English step, filed under the
  step's sid. The header comment of a file is the one the written file carries
  (it says arrays line up by index: that is true of the written file).
- An insert needs one Spanish step under its sid and a run of the generator; a
  Spanish step whose sid the lesson no longer has, and an English step with no
  Spanish step, fail `npm run author:check` (`i18n/steps`).

See CONTRIBUTING_CONTENT.md and TRANSLATION.md.
