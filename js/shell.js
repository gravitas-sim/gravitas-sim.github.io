// =============================================================================
// The Gravitas shell (spike, Roadmap II Prompt 49)
// -----------------------------------------------------------------------------
// One header, one navigation, one footer, one locale switch and one theme
// switch, rendered by this module on any page that calls mountShell(). The
// navigation is the disclosure pattern: five groups, each a button that shows
// its links, so every page is two activations from any other.
// =============================================================================

const WORDS = {
  en: {
    home: 'Gravitas home',
    menu: 'Menu',
    nav: 'Gravitas',
    lang: 'Language',
    theme: 'Theme',
    learn: 'Learn',
    labs: 'Labs',
    make: 'Make',
    teach: 'Teach',
    about: 'About',
    investigations: 'Investigations',
    courses: 'Courses',
    observatory: 'Observatory',
    experiments: 'Experiments',
    sandbox: 'Sandbox',
    lab3d: '3-D lab',
    missionLab: 'Mission lab',
    studio: 'Scenario Studio',
    composer: 'Investigation Composer',
    courseBuilder: 'Course builder',
    figure: 'Figure builder',
    catalog: 'Catalog',
    teaching: 'Teaching with Gravitas',
    instructors: 'Instructor resources',
    submissions: 'Submission review',
    evaluation: 'Classroom evidence kit',
    model: 'How the model works',
    validation: 'Physics validation',
    kernel: '3-D kernel diagnostics',
    mission: 'Mission core diagnostics',
    source: 'Source code',
    cite: 'Cite Gravitas',
    midnight: 'Midnight',
    deep: 'Deep space',
    observatoryTheme: 'Observatory red',
    daylight: 'Daylight',
  },
  es: {
    home: 'Inicio de Gravitas',
    menu: 'Menú',
    nav: 'Gravitas',
    lang: 'Idioma',
    theme: 'Tema',
    learn: 'Aprender',
    labs: 'Laboratorios',
    make: 'Crear',
    teach: 'Enseñar',
    about: 'Acerca de',
    investigations: 'Investigaciones',
    courses: 'Cursos',
    observatory: 'Observatorio',
    experiments: 'Experimentos',
    sandbox: 'Simulación libre',
    lab3d: 'Laboratorio 3-D',
    missionLab: 'Laboratorio de misiones',
    studio: 'Estudio de escenarios',
    composer: 'Compositor de investigaciones',
    courseBuilder: 'Creador de cursos',
    figure: 'Creador de figuras',
    catalog: 'Catálogo',
    teaching: 'Enseñar con Gravitas',
    instructors: 'Recursos para docentes',
    submissions: 'Revisión de entregas',
    evaluation: 'Kit de evidencias de aula',
    model: 'Cómo funciona el modelo',
    validation: 'Validación física',
    kernel: 'Diagnóstico del núcleo 3-D',
    mission: 'Diagnóstico de misiones',
    source: 'Código fuente',
    cite: 'Citar Gravitas',
    midnight: 'Medianoche',
    deep: 'Espacio profundo',
    observatoryTheme: 'Rojo de observatorio',
    daylight: 'Luz de día',
  },
};

/** The groups and their links: every entry page, and nothing twice. */
export const NAV = [
  ['learn', [
    ['investigations', '/#investigations'],
    ['courses', '/course/'],
    ['observatory', '/observatory/'],
    ['experiments', '/experiments/'],
  ]],
  ['labs', [
    ['sandbox', '/'],
    ['lab3d', '/3d/'],
    ['missionLab', '/mission/lab/'],
  ]],
  ['make', [
    ['studio', '/studio/'],
    ['composer', '/studio/lesson/'],
    ['courseBuilder', '/studio/course/'],
    ['figure', '/figure/'],
    ['catalog', '/catalog/'],
  ]],
  ['teach', [
    ['teaching', '/teaching/'],
    ['instructors', '/instructors/'],
    ['submissions', '/instructors/submissions/'],
    ['evaluation', '/evaluation/'],
  ]],
  ['about', [
    ['model', '/model/'],
    ['validation', '/validation/'],
    ['kernel', '/lab3d/'],
    ['mission', '/mission/'],
  ]],
];

const THEMES = ['midnight', 'deep', 'observatory', 'daylight'];
const store = (k, v) => {
  try {
    return v === undefined ? localStorage.getItem(k) : localStorage.setItem(k, v);
  } catch {
    return null;
  }
};
const esc = s =>
  String(s).replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);

/** The language the shell speaks: the stored choice, then the page's own. */
const lang = () => {
  const l = store('gravitas_locale') || document.documentElement.lang || 'en';
  return l.startsWith('es') ? 'es' : 'en';
};

/**
 * Put the shell on this page.
 *
 * @param {object} [opts]
 * @param {(lang: string) => void} [opts.onLanguage] - Re-translate the page
 *   itself; without it the page reloads, which every page already survives
 */
export function mountShell({ onLanguage } = {}) {
  const w = WORDS[lang()];
  const here = location.pathname;
  const header = document.createElement('header');
  header.className = 'gs-shell';
  header.innerHTML = `
    <a class="gs-brand" href="/" aria-label="${esc(w.home)}">GRAVITAS</a>
    <button type="button" class="gs-toggle" aria-expanded="false" aria-controls="gs-nav">${esc(w.menu)}</button>
    <nav id="gs-nav" class="gs-nav" aria-label="${esc(w.nav)}"><ul>${NAV.map(
      ([g, links]) => `<li><button type="button" aria-expanded="false" aria-controls="gs-${g}">${esc(w[g])}</button>
        <ul id="gs-${g}" hidden>${links
          .map(
            ([k, href]) =>
              `<li><a href="${href}"${href === here ? ' aria-current="page"' : ''}>${esc(w[k])}</a></li>`
          )
          .join('')}</ul></li>`
    ).join('')}</ul></nav>
    <div class="gs-controls">
      <label><span class="gs-vh">${esc(w.lang)}</span><select data-gs-lang>
        <option value="en">English</option><option value="es">Español</option></select></label>
      <label><span class="gs-vh">${esc(w.theme)}</span><select data-gs-theme>${THEMES.map(
        th => `<option value="${th}">${esc(w[th === 'observatory' ? 'observatoryTheme' : th])}</option>`
      ).join('')}</select></label>
    </div>`;
  document.body.prepend(header);

  const footer = document.createElement('footer');
  footer.className = 'gs-foot';
  footer.innerHTML = `<a href="/validation/">${esc(w.validation)}</a>
    <a href="https://github.com/gravitas-sim/gravitas-sim.github.io">${esc(w.source)}</a>
    <a href="https://github.com/gravitas-sim/gravitas-sim.github.io/blob/main/CITATION.cff">${esc(w.cite)}</a>`;
  document.body.append(footer);

  const nav = header.querySelector('.gs-nav');
  const groups = [...nav.querySelectorAll('button[aria-controls]')];
  const close = except => {
    for (const b of groups)
      if (b !== except) {
        b.setAttribute('aria-expanded', 'false');
        document.getElementById(b.getAttribute('aria-controls')).hidden = true;
      }
  };
  for (const b of groups)
    b.addEventListener('click', () => {
      const open = b.getAttribute('aria-expanded') !== 'true';
      close(b);
      b.setAttribute('aria-expanded', String(open));
      document.getElementById(b.getAttribute('aria-controls')).hidden = !open;
    });
  const toggle = header.querySelector('.gs-toggle');
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    header.classList.toggle('is-open', open);
  });
  header.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const open = groups.find(b => b.getAttribute('aria-expanded') === 'true');
    close();
    open?.focus();
  });
  document.addEventListener('click', e => {
    if (!header.contains(e.target)) close();
  });

  const langSel = header.querySelector('[data-gs-lang]');
  langSel.value = lang();
  langSel.addEventListener('change', () => {
    store('gravitas_locale', langSel.value);
    if (onLanguage) onLanguage(langSel.value);
    else location.reload();
  });
  const themeSel = header.querySelector('[data-gs-theme]');
  const setTheme = th => {
    if (th === 'midnight') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', th);
    document.documentElement.style.colorScheme =
      th === 'daylight' ? 'light' : 'dark';
  };
  themeSel.value = THEMES.includes(store('gravitas_theme'))
    ? store('gravitas_theme')
    : 'midnight';
  setTheme(themeSel.value);
  themeSel.addEventListener('change', () => {
    store('gravitas_theme', themeSel.value);
    setTheme(themeSel.value);
  });
  return { header, footer };
}
