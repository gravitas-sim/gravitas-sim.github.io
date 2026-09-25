// =============================================================================
// El constructor de figuras, en español
// -----------------------------------------------------------------------------
// La pareja de ./en.figure.js: /figure/ es su propio paquete y solo lo abre
// quien escribe un curso o un artículo. js/figure/i18n.js lee este catálogo y
// el inglés, y ningún otro.
// =============================================================================

export const ES_FIGURE = {
  'fig.doc.title': 'Constructor de figuras | Gravitas',
  'fig.main.label': 'Constructor de figuras',
  'fig.title': 'Crea una figura interactiva',
  'fig.lang.label': 'Idioma',
  'fig.intro':
    'Convierte una simulación de Gravitas en una figura para la página de un curso o un artículo: elige qué muestra y cómo, compruébala en la vista previa y copia el código. Nada de lo que escribes aquí se envía a ninguna parte; la figura es el enlace.',
  'fig.back': 'Volver a Gravitas',

  'fig.what.title': 'Qué muestra',
  'fig.what.link.label': 'Un enlace de Gravitas',
  'fig.what.link.hint':
    'En Gravitas, prepara la simulación, abre Compartir y elige «Crear una figura», o copia el enlace y pégalo aquí.',
  'fig.what.or': 'o empieza desde un escenario',
  'fig.what.scenario.label': 'Escenario',
  'fig.what.seed.label': 'Semilla',
  'fig.what.seed.hint':
    'La misma semilla construye siempre el mismo mundo. Déjala como está si no quieres otro distinto.',
  'fig.what.start.label': 'Cuando se abre la figura',
  'fig.what.start.running': 'en marcha',
  'fig.what.start.paused': 'en pausa',
  'fig.status.link': '{scenario}, {bodies}',
  'fig.status.seeded': '{scenario}, construido con la semilla {seed}',
  'fig.status.bodies.one': '1 objeto escrito en el enlace',
  'fig.status.bodies.many': '{n} objetos escritos en el enlace',
  'fig.status.bodies.seeded': 'construido con su semilla',
  'fig.error.link.foreign':
    'Ese enlace no es de una simulación de Gravitas. Copia uno desde Compartir en Gravitas.',
  'fig.error.link.unreadable':
    'No se pudo leer ese enlace. Puede que se cortara al copiarlo.',
  'fig.error.seed': 'Una semilla solo tiene letras y cifras.',

  'fig.look.title': 'Cómo se ve',
  'fig.look.lang.label': 'Idioma de la figura',
  'fig.look.lang.reader': 'el del lector',
  'fig.look.theme.label': 'Tema',
  'fig.look.theme.reader': 'el del lector',
  'fig.look.theme.midnight': 'Medianoche',
  'fig.look.theme.deep': 'Espacio profundo',
  'fig.look.theme.observatory': 'Observatorio',
  'fig.look.theme.daylight': 'Luz de día',
  'fig.look.aspect.label': 'Forma',
  'fig.look.controls.label': 'Mostrar los controles de reproducción',
  'fig.look.motion.label': 'Reducir el movimiento',
  'fig.look.quality.label': 'Representación ligera, para equipos antiguos',
  'fig.look.reset.label': 'Restablecer vuelve a',
  'fig.look.reset.authored': 'exactamente este estado',
  'fig.look.reset.scenario': 'el escenario tal como empieza',

  'fig.words.title': 'Texto alrededor',
  'fig.words.name.label': 'Título',
  'fig.words.name.hint':
    'Lo que anuncia un lector de pantalla para la figura. Déjalo vacío para usar el nombre del escenario.',
  'fig.words.caption.label': 'Pie de figura',
  'fig.words.fallback.label': 'Añadir debajo un enlace a la figura',
  'fig.words.fallback.text': 'Abrir esta figura en Gravitas',

  'fig.page.title': 'Controlarla desde tu página',
  'fig.page.intro':
    'Opcional. Si tu página va a enviar a la figura mensajes de reproducir, pausar, restablecer o cargar, indica su origen. La figura obedece a ese origen y a ningún otro; sin él no escucha a nadie.',
  'fig.page.origin.label': 'Origen de tu página',
  'fig.page.origin.placeholder': 'https://tu-curso.example.edu',
  'fig.page.origin.bad':
    'Un origen es https:// y un nombre de servidor, sin nada detrás, como https://tu-curso.example.edu.',
  'fig.page.docs': 'Cómo funcionan los mensajes',

  'fig.preview.title': 'Vista previa',
  'fig.preview.frame': 'Vista previa de la figura',

  'fig.out.title': 'Cópiala',
  'fig.out.markup.label': 'Código para tu página',
  'fig.out.link.label': 'Enlace sencillo',
  'fig.out.copy.markup': 'Copiar el código',
  'fig.out.copy.link': 'Copiar el enlace',
  'fig.out.copied': 'Copiado.',
  'fig.out.copyFailed': 'No se pudo copiar. Selecciona el texto y cópialo tú.',
  'fig.out.none': 'Elige primero qué muestra la figura.',

  'fig.frame.title': 'Simulación de Gravitas: {scenario}',
};
