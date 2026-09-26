// =============================================================================
// /catalog/ en español
// -----------------------------------------------------------------------------
// The Spanish shadow of js/i18n/en.catalog.js.
// =============================================================================

export const ES_CATALOG = {
  'cat.doc.title': 'Catálogo | Gravitas',
  'cat.main.label': 'Catálogo',
  'cat.lang.label': 'Idioma',
  'cat.title': 'Catálogo',
  'cat.intro':
    'Datos, cursos e instrumentos para Gravitas. Todo lo que aparece aquí se revisó antes de incluirse, y nada ejecuta código. Un paquete de datos o un curso que instales se guarda en este dispositivo y funciona sin conexión.',
  'cat.back': 'Volver a Gravitas',
  'cat.observatory': 'Observatorio',
  'cat.loading': 'Cargando el catálogo…',
  'cat.loadFailed': 'El catálogo no se cargó: {why}',
  'cat.retry': 'Intentar de nuevo',
  'cat.storage.persistent':
    'Los paquetes instalados se guardan en este navegador hasta que los quites.',
  'cat.storage.memory':
    'Este navegador no guarda los paquetes instalados, así que duran solo hasta que se cierre esta página.',
  'cat.filter.title': 'Buscar',
  'cat.filter.search': 'Buscar',
  'cat.filter.searchHint':
    'Un título, un objeto, una licencia o un identificador',
  'cat.filter.type': 'Mostrar',
  'cat.filter.type.all': 'Todo',
  'cat.filter.type.data-pack': 'Paquetes de datos',
  'cat.filter.type.course-pack': 'Cursos',
  'cat.filter.type.built-in': 'Incluido en Gravitas',
  'cat.filter.type.installed': 'Instalado aquí',
  'cat.count': 'Se muestran {shown} de {total}.',
  'cat.none': 'No hay coincidencias.',
  'cat.type.data-pack': 'Paquete de datos',
  'cat.type.course-pack': 'Curso',
  'cat.type.built-in': 'Incluido',
  'cat.version': 'Versión {version}',
  'cat.status.built-in': 'Forma parte de Gravitas: no hay nada que instalar.',
  'cat.status.available': 'No instalado.',
  'cat.status.installed': 'Instalado, versión {version}.',
  'cat.status.update':
    'Instalado, versión {installed}. Hay disponible la versión {version}.',
  'cat.status.newer':
    'Instalado, versión {installed}, más reciente que la {version} del catálogo.',
  'cat.status.incompatible':
    'Necesita Gravitas {needs}; esta es la {platform}. No se puede instalar aquí.',
  'cat.size': 'Tamaño',
  'cat.size.archive': '{download} de descarga, {unpacked} instalado',
  'cat.size.builtIn': '{bytes} cuando se usa',
  'cat.works': 'Funciona con',
  'cat.works.value': 'Gravitas {range} (esta es la {platform})',
  'cat.license': 'Licencia',
  'cat.cite': 'Citar',
  'cat.reviewed': 'Revisado',
  'cat.reviewed.value': '{date}: {checks}',
  'cat.provides': 'Contiene',
  'cat.provides.dataPacks': 'datos: {ids}',
  'cat.provides.courses': 'un curso: {ids}',
  'cat.provides.widgetFamilies': 'instrumentos: {ids}',
  'cat.provides.investigations': 'lecciones: {ids}',
  'cat.provides.other': '{what}: {ids}',
  'cat.object': 'Objeto',
  'cat.install': 'Instalar para usar sin conexión',
  'cat.update': 'Actualizar a la {version}',
  'cat.remove': 'Quitar',
  'cat.open': 'Abrir en el observatorio',
  'cat.showCourse': 'Mostrar el curso',
  'cat.hideCourse': 'Ocultar el curso',
  'cat.installing': 'Instalando {title}…',
  'cat.installedNow': '{title} está instalado y funciona sin conexión.',
  'cat.removed': 'Se quitó {title}.',
  'cat.breaking':
    'La versión {version} es una nueva versión principal. Lo que nombre la versión {installed}, como una tarea, puede necesitar cambios.',
  'cat.error.incompatible': 'Necesita otra versión de Gravitas.',
  'cat.error.notInstallable':
    'Viene incluido en Gravitas y no hay nada que instalar.',
  'cat.error.network':
    'No se descargó. Revisa la conexión e inténtalo de nuevo.',
  'cat.error.archive':
    'Se descargó pero no pasó una comprobación ({check}), así que no se instaló. Nada de lo que tenías instalado ha cambiado.',
  'cat.error.manifest':
    'Su manifiesto no es el paquete que indica el catálogo, así que no se instaló.',
  'cat.error.content':
    'Sus datos no pasaron las comprobaciones, así que no se instaló.',
  'cat.error.storage':
    'Este navegador no quiso guardarlo. Puede que no quede espacio o que el almacenamiento esté bloqueado.',
  'cat.check.checksum':
    'su suma de verificación no es la que indica el catálogo',
  'cat.check.tooLarge': 'es más grande de lo que puede ser un paquete',
  'cat.check.unpackedTooLarge': 'al descomprimirse ocupa más de lo permitido',
  'cat.check.notGzip': 'no es un archivo comprimido',
  'cat.check.badHeader': 'su estructura está dañada',
  'cat.check.entryType': 'contiene algo que no son archivos comunes',
  'cat.check.unsafePath': 'nombra un archivo fuera de sí mismo',
  'cat.check.duplicate': 'nombra un archivo dos veces',
  'cat.check.tooManyEntries': 'contiene demasiados archivos',
  'cat.check.truncated': 'está incompleto',
  'cat.check.order': 'sus archivos están en el orden equivocado',
  'cat.check.unlisted': 'un archivo no tiene suma de verificación',
  'cat.check.entryChecksum':
    'un archivo no coincide con su suma de verificación',
  'cat.check.missing': 'falta un archivo que aparece en la lista',
  'cat.opening': 'Abriendo el paquete instalado…',
  'cat.openMissing':
    'En este navegador no hay nada instalado con el nombre {id}. Instálalo antes desde el catálogo.',
  'cat.openFailed': 'No se pudo abrir el paquete instalado: {why}',
  'cat.course.label': 'El curso: {title}',
  'cat.course.teacher': 'Para el docente',
  'cat.course.student': 'Para el estudiante',
  'cat.course.open': 'Abrir {title}',
};
