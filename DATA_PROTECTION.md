# Data protection statement

[Español](DATA_PROTECTION.es.md)

For an institution's IT, privacy or accessibility office. This is what Gravitas stores, what it never sends, what a reader can choose to send, what an instructor receives, how long anything is kept and who to ask. It describes the software as released (2.0.0); it is a description of the design, not a legal opinion or a contract, and it makes no claim of compliance with any particular law. Every statement here is checked against the code where a test can check it, and where nothing can, it says so.

## In one paragraph

Gravitas is a static website. There is no server the project runs, no database, no account, no login, no analytics and no advertising. Everything a student does stays in the browser they are using, in that browser's own storage. The only people who receive anything are those the student gives a file or a token to.

## What is stored, and where

All of it is in the reader's browser (local storage, session storage, IndexedDB and the service worker's cache). [STORAGE.md](STORAGE.md) is the inventory, key by key, and `tests/storageInventory.test.js` fails when the code names a key that page does not. By group:

| Group | What it holds | Personal data? |
|---|---|---|
| A student's work | Progress and answers in each investigation and assignment, the evidence notebook, saved experiments, the saved sandbox world, scenarios the student made, drafts in the authoring tools | The student's own text and numbers. It can include whatever they type. |
| The student's name | The name a student types so a report or submission can carry it (`gravitas_student_name`), and the teacher's notes on the Teach page | Yes, if the student enters a real name. The name is optional for browsing and asked for only when a report or submission is made. |
| Preferences | Language, theme, units, course level, which panels are open, that a welcome was seen | No |
| The application's own state | The service worker's cache of the site's files, installed catalog extensions, cached archive answers, the version of each capability loaded | No |
| An instructor's session | The instructor materials' decryption key, in session storage, for that browser session only | The key is derived from a passphrase the instructor types; it is never written anywhere else. |

Nothing in this storage is encrypted by the application (the browser's own protections apply), so on a shared computer the usual advice holds: use a private window or clear the site's data when finished.

## What is never sent

The project has no server to send it to. Specifically, no investigation answer, name, progress record, notebook entry, saved world, preference or usage event is transmitted anywhere by the application. There is no analytics or error-reporting service, no cookie, no tracking pixel, no third-party font or script loaded from another site (the fonts and the plotting and 3-D libraries are served with the site), and no advertising. The service worker only caches the site's own files.

A shared link carries its content in the part of the address after the `#`, which a browser does not send to a server. Whoever is given the link can read what it holds, so a link is as private as the person it is given to.

The hosting itself is the ordinary kind: GitHub Pages serves the files, and like any web host it can see that a given address asked for a given page at a given time. The project operates no server and receives no logs.

## What a reader can choose to send

Two features contact another site, and only when the reader presses the control that says so:

1. **The Observatory's archive import** ("find a star's Gaia epochs at CDS (live, opt-in)"). On pressing Find, the name the reader typed, and then the position the service answered with, go to the Centre de Données astronomiques de Strasbourg (the Sesame and VizieR services) and to no one else. See [ARCHIVE_IMPORT.md](ARCHIVE_IMPORT.md). No investigation uses it. The answer is cached in the browser.
2. **The compute page** (`/compute/`, an advanced-teaching feature). The page says it is online and opt-in and loads nothing until the reader presses "Start the runtime": it then fetches the Python runtime from the runtime's content-delivery network and frames a page from the separate origin `gravitas-compute.github.io`, which runs in a sandbox with no access to the reader's storage or to the page. The reader's data is processed in the browser and is not sent to either site as part of the notebook. See [COMPUTE.md](COMPUTE.md). Both sites see an ordinary request.

Following a link out of the site (for example, to a notebook service or a reference) leaves Gravitas, and what that site collects is that site's matter.

Exporting is always an explicit action and always a file the student holds: a progress file, a backup of My work, the lab report (PDF or web page), the evidence report, a CSV of a series.

## What an instructor receives

Only what a student gives them. A student can hand in the lab report (a PDF or a web page), the submission token (text) and a progress file. The report carries the student's name if they typed one, the answers, how many attempts each took, which steps they reached, and a completion code that makes casual editing visible; it does not prove authorship. The instructor's portal reads those files in the instructor's own browser. An instructor cannot see a student's other work, and Gravitas gives an instructor no list of students, no dashboard of activity and no way to look at a student's browser.

An institution that collects such files, through a learning-management system or by email, holds them under its own policies. Gravitas is not part of that handling.

The instructor materials (answer keys and guides) are published as encrypted files. The instructor types a passphrase in the browser to read them; nothing about that is sent anywhere. See [SECURITY.md](SECURITY.md).

## What a researcher receives

Nothing. No study has been run on this software, no data has been collected from any user, and no ethics or institutional review has taken place ([LEARNING_STUDY.md](LEARNING_STUDY.md) is a design, not a result). The classroom evidence kit's instruments are forms a teacher can use in their own course and keep; the kit sends nothing to the project.

## Retention and deletion

The project keeps no copy of anything, so it has nothing to retain or delete on a student's behalf. What is stored in a browser stays until the reader clears it. My work lists what is stored and lets a student export it as a file and delete it, item by item or all of it (it asks for a downloaded copy first); clearing the site's data in the browser removes everything, including the service worker's cache. A file a student has exported or handed in is held by whoever has it.

## Children

The site asks for no age and has no accounts. It is written for university and upper-secondary courses. An institution that offers it to minors decides, under its own rules, whether a student should type a real name into a report.

## Accessibility of this statement

The statement is plain text on a web page and in the repository. The scoped accessibility report is [ACCESSIBILITY_CONFORMANCE.md](ACCESSIBILITY_CONFORMANCE.md).

## Questions and changes

Contact the maintainer, Carl Ziegler, at <Carl.Ziegler@sfasu.edu>. A security report should follow [SECURITY.md](SECURITY.md). If a release adds anything that stores more or sends anything, this statement changes in the same release, and the change is listed in [CHANGELOG.md](CHANGELOG.md).
