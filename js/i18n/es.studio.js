// =============================================================================
// Las palabras del Estudio de escenarios (/studio/), en español
// -----------------------------------------------------------------------------
// La sombra de ./en.studio.js, con las mismas claves. Solo la importa
// js/studioPage.js, cuando el lector elige el español.
// =============================================================================

export const ES_STUDIO = {
  'studio.title': 'Estudio de escenarios',
  'studio.intro':
    'Crea un escenario como datos: los ajustes con los que se ejecuta, los cuerpos con los que empieza, la semilla que lo hace el mismo mundo cada vez y los instrumentos con los que se abre. Guárdalo como un archivo que el SDK de Gravitas puede comprobar y empaquetar, o ábrelo en Gravitas como un enlace.',
  'studio.back': 'Volver a Gravitas',
  'studio.lang.label': 'Idioma',
  'studio.toolbar.label': 'Archivo del escenario',
  'studio.action.new': 'Escenario nuevo',
  'studio.action.fromLabel': 'Empezar desde un escenario incluido',
  'studio.action.from': 'Empezar desde este',
  'studio.from.generated': 'Generados a partir de ajustes',
  'studio.from.handBuilt': 'Solo los ajustes (cuerpos colocados por código)',
  'studio.action.open': 'Abrir un archivo',
  'studio.action.save': 'Guardar como archivo',
  'studio.action.copy': 'Copiar el enlace',
  'studio.action.openApp': 'Abrir en Gravitas',
  'studio.action.preview': 'Vista previa',
  'studio.action.undo': 'Deshacer',
  'studio.action.redo': 'Rehacer',
  'studio.action.newSeed': 'Semilla nueva',
  'studio.drafts.label': 'Borradores en este navegador',
  'studio.drafts.open': 'Abrir el borrador',
  'studio.drafts.delete': 'Eliminar el borrador',
  'studio.storage.failed':
    'Este navegador no guarda borradores, así que cerrar la pestaña pierde tu trabajo. Guárdalo como archivo.',
  'studio.copyOf': '{title} (una copia)',

  'studio.section.about': 'Sobre el escenario',
  'studio.section.world': 'Ajustes',
  'studio.section.bodies': 'Cuerpos',
  'studio.section.instruments': 'Instrumentos',
  'studio.section.start': 'Cómo empieza',
  'studio.language.en': 'inglés',
  'studio.language.es': 'español',
  'studio.field.id': 'Identificador',
  'studio.hint.id':
    'Palabras en minúsculas unidas por guiones, como three-body-figure-eight. Lo usan el archivo y el SDK.',
  'studio.field.version': 'Versión',
  'studio.field.title': 'Título ({language})',
  'studio.field.summary': 'Resumen ({language})',
  'studio.field.tags': 'Etiquetas, hasta cuatro',
  'studio.field.open': 'Paneles abiertos al empezar',
  'studio.field.tools': 'Herramientas a la vista al empezar',
  'studio.field.seed': 'Semilla',
  'studio.hint.seed':
    'Un número entero de 0 a 4294967295. La misma semilla construye el mismo mundo.',
  'studio.field.zoom': 'Zoom',
  'studio.hint.zoom':
    'Píxeles de pantalla por unidad de simulación. En blanco para el valor predeterminado.',
  'studio.field.inclination': 'Inclinación del observador (grados)',
  'studio.hint.inclination':
    '90 es de canto y 0 de frente. En blanco para de canto.',
  'studio.field.paused': 'Empezar en pausa',
  'studio.hint.settings':
    'En blanco es el valor predeterminado de Gravitas, en gris. Solo están los ajustes que un escenario puede llevar; los límites aparecen bajo cada número.',
  'studio.hint.range': 'De {min} a {max}.',
  'studio.group.physics': 'Física',
  'studio.group.population': 'Población generada',
  'studio.group.display': 'Tiempo y visualización',
  'studio.value.on': 'Sí',
  'studio.value.off': 'No',
  'studio.value.none': 'Ninguno',
  'studio.value.default': 'Predeterminado ({value})',
  'studio.setting.star_only_gravity': 'Solo atraen las estrellas',
  'studio.setting.max_timestep':
    'Paso de integración máximo (unidades de tiempo)',
  'studio.setting.min_interaction_distance':
    'Longitud de suavizado (unidades de simulación)',
  'studio.setting.enable_star_merging': 'Las estrellas se fusionan al tocarse',
  'studio.setting.bh_masses':
    'Masas de los agujeros negros, una por agujero (masas solares)',
  'studio.setting.num_micro_stars': 'Microestrellas',
  'studio.setting.micro_star_high_velocity': 'Microestrellas rápidas',
  'studio.setting.test_star_slingshot':
    'Una estrella de prueba en un paso de honda',
  'studio.setting.bh_layout': 'Disposición de los agujeros negros',
  'studio.setting.preset_zoom': 'Zoom inicial',
  'studio.setting.bh_environment': 'Entorno de los agujeros negros',
  'studio.setting.bh_disk_inclination':
    'Inclinación del disco de acreción (grados)',
  'studio.hint.bodies':
    'Un escenario genera su población a partir de los ajustes con su semilla, o trae sus propios cuerpos. Añadir cuerpos desactiva la población generada.',
  'studio.system.heading': 'Un sistema orbital',
  'studio.system.none':
    'Una estrella y lo que la orbita, introducidos como órbitas y no como posiciones y velocidades.',
  'studio.system.add': 'Añadir un sistema orbital',
  'studio.system.remove': 'Quitar el sistema orbital',
  'studio.typed.heading': 'Cuerpos escritos',
  'studio.typed.body': 'Cuerpo {n}',
  'studio.typed.add': 'Añadir un cuerpo por posición y velocidad',
  'studio.typed.remove': 'Quitar el cuerpo {n}',
  'studio.hint.instruments':
    'Se abren cuando se abre el escenario, como si un lector los hubiera pulsado en el panel lateral.',

  'studio.checks.heading': 'Comprobaciones',
  'studio.checks.valid': 'El escenario es válido.',
  'studio.checks.count':
    '{count} problema(s) que resolver antes de poder guardar el escenario.',
  'studio.checks.none': 'Nada que resolver.',
  'studio.checks.caution': 'Atención: {text}',
  'studio.caution.handBuilt':
    '{scenario} coloca sus cuerpos por código, así que solo se copiaron sus ajustes. Este escenario construye el mundo que esos ajustes generan, que no es el mismo.',
  'studio.caution.unbound':
    '{name} se mueve a {speed} respecto al resto, más que los {escape} que bastan para escapar de ellos (unidades de simulación por unidad de tiempo), así que probablemente se irá. Trata todo lo demás como una sola masa en su baricentro: una estimación, no una prueba.',
  'studio.caution.step':
    'El paso de integración es más largo de lo que este sistema necesita. Un paso de como mucho {step} unidades de tiempo da a su órbita más corta quinientos pasos.',
  'studio.diff.heading': 'Cambios',
  'studio.diff.none': 'Sin cambios desde que se abrió o se guardó.',
  'studio.diff.count': '{count} cambio(s) desde que se abrió o se guardó.',
  'studio.diff.added': 'añadido',
  'studio.diff.removed': 'quitado',
  'studio.diff.changed': 'cambiado',
  'studio.preview.heading': 'Vista previa',
  'studio.preview.frame': 'Gravitas, ejecutando este escenario',
  'studio.raw.heading': 'Datos en bruto',
  'studio.raw.label': 'El archivo del escenario, en JSON',
  'studio.raw.apply': 'Aplicar',
  'studio.raw.revert': 'Revertir',
  'studio.raw.notJson': 'Eso no es JSON válido: {error}. No se cambió nada.',
  'studio.raw.applied': 'Aplicado. Deshacer lo revierte.',

  'studio.status.new':
    'Un escenario nuevo. Se guarda en este navegador a medida que trabajas.',
  'studio.status.restored': 'Tu borrador {id} está donde lo dejaste.',
  'studio.status.started': 'Se empezó desde {scenario}.',
  'studio.status.startedDropped':
    'Se empezó desde {scenario}. Se dejaron fuera los ajustes que un archivo de escenario no puede llevar: {keys}.',
  'studio.status.saved': 'Se guardó {file}.',
  'studio.status.copied': 'El enlace está en el portapapeles.',
  'studio.status.copyFailed': 'El navegador no quiso copiar el enlace.',
  'studio.status.previewed':
    'La vista previa muestra el escenario como lo abre un enlace.',
  'studio.status.fixFirst': 'Resuelve primero los problemas de Comprobaciones.',
  'studio.status.undone': 'Deshecho.',
  'studio.status.redone': 'Rehecho.',
  'studio.status.draftOpened': 'Se abrió el borrador {id}.',
  'studio.status.draftDeleted': 'Se eliminó el borrador {id}.',
  'studio.status.draftInUse':
    'Ese es el escenario que estás editando; abre otro primero.',
  'studio.file.unreadable': 'No se pudo leer ese archivo como JSON.',
  'studio.file.notPack':
    'Ese archivo no es ni un escenario de Gravitas ni un archivo del constructor de sistemas orbitales.',
  'studio.file.newer':
    'Ese archivo lo hizo una versión más reciente de Gravitas (versión de formato {version}). Recarga la página e inténtalo de nuevo.',
  'studio.file.opened': 'Se abrió {id}.',
  'studio.conflict.heading': 'Ya existe un borrador con este identificador',
  'studio.conflict.text':
    'Tu borrador {id} es distinto del archivo. Estos campos difieren:',
  'studio.conflict.replace': 'Sustituir mi borrador por el archivo',
  'studio.conflict.both': 'Conservar los dos',
  'studio.conflict.cancel': 'Cancelar',
  'studio.conflict.kept':
    'El archivo está abierto como {id}; tu borrador se conserva.',
  'studio.conflict.cancelled': 'No se abrió nada.',

  'studio.error.notObject': 'Esto no es un objeto.',
  'studio.error.unknownField':
    '«{key}» no es algo que contenga un archivo de escenario.',
  'studio.error.format': 'Esto no es un archivo de escenario de Gravitas.',
  'studio.error.formatVersion':
    'Esta versión de formato no es una que este Gravitas lea.',
  'studio.error.id':
    'Palabras en minúsculas unidas por guiones, como three-body-figure-eight.',
  'studio.error.version': 'Una versión como 1.0.0.',
  'studio.error.localesEn':
    'Un escenario siempre está en inglés, y puede estar también en español.',
  'studio.error.locale': 'Gravitas no tiene interfaz en «{locale}».',
  'studio.error.text': 'Un texto en cada idioma.',
  'studio.error.textMissing':
    'Escribe esto en cada idioma que declara el escenario.',
  'studio.error.textLong': 'Como mucho {max} caracteres.',
  'studio.error.textUnsafe': 'Solo texto: sin marcado y sin direcciones web.',
  'studio.error.textLocale':
    '«{locale}» no es uno de los idiomas del escenario.',
  'studio.error.tags': 'Como mucho cuatro etiquetas.',
  'studio.error.tag': '«{tag}» no es una etiqueta de escenario.',
  'studio.error.tagsRepeat': 'Una etiqueta está elegida dos veces.',
  'studio.error.seed': 'Un número entero de 0 a 4294967295.',
  'studio.error.settings': 'Los ajustes no se pueden leer.',
  'studio.error.settingUnknown':
    '«{key}» no es un ajuste que un escenario pueda llevar.',
  'studio.error.bool': 'Sí o no.',
  'studio.error.numbers':
    'Hasta {max} números de {low} a {high}, separados por comas.',
  'studio.error.option': 'Uno de estos: {options}.',
  'studio.error.int': 'Un número entero.',
  'studio.error.number': 'Un número.',
  'studio.error.range': 'De {min} a {max}.',
  'studio.error.zoom': 'Un zoom mayor que 0 y de como mucho 1000.',
  'studio.error.pan': 'Un desplazamiento de x e y en píxeles.',
  'studio.error.observer': 'Una inclinación y un ángulo de posición.',
  'studio.error.list': 'Una lista.',
  'studio.error.instrument': '«{id}» no está en el panel lateral.',
  'studio.error.listRepeat': 'Elegido dos veces.',
  'studio.error.system': 'El sistema orbital necesita una lista de cuerpos.',
  'studio.error.tooMany': 'Como mucho {max} cuerpos.',
  'studio.error.name': 'Un nombre sencillo de como mucho 40 caracteres.',
  'studio.error.populationWithBodies':
    'Pon esto a 0: un escenario con sus propios cuerpos no los genera también.',
};
