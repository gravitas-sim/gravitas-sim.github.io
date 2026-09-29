# Platform shell gate (Roadmap II, Prompt 49): acceptance criteria

Committed before any prototype code exists. The verdict in PLATFORM_MODEL.md
is judged against these and nothing else.

- **C1 reach.** Every capability is reachable within two activations from
  Home, by mouse, keyboard and touch. Measured on the prototype by a script
  that walks the navigation tree from Home and counts activations to each
  capability in the inventory.
- **C2 one shell.** One header, one navigation, one footer, one locale switch
  and one theme switch, rendered from one module on every page. The module
  costs at most **6 KB of JavaScript and 4 KB of CSS as served** (gzip, as
  GitHub Pages sends it), is precached, and no page's route budget is
  exceeded.
- **C3 accessible.** The shell passes axe (WCAG 2.2 AA rules) on every
  prototyped page in all four themes and both locales.
- **C4 responsive.** Layouts are specified at 375, 768, 1024 and 1440 px for
  the application with a lesson open and for the Observatory with an
  observation open, and the prototype pages show no horizontal overflow at
  those widths.
- **C5 taxonomy.** At most eight nouns cover every content kind now in the
  code, with a mapping from every current name to a new one.

Verdicts: **A** all five met and the model is ready for Prompt 50; **B** a
named subset is ready; **C** the model needs redesign.
