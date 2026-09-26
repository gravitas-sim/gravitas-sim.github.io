// =============================================================================
// /observatory/ en español
// -----------------------------------------------------------------------------
// El catálogo propio del espacio de observación, que solo lee
// js/observatory/i18n.js. Los mensajes que escriben los módulos del espacio
// (por qué un cambio no se puede hacer, qué falla en un archivo importado)
// están en inglés en esos módulos y se muestran marcados como inglés.
// =============================================================================

export const ES_OBSERVATORY = {
  'obs.doc.title': 'Observatorio | Gravitas',
  'obs.main.label': 'Observatorio',
  'obs.lang.label': 'Idioma',
  'obs.title': 'Observatorio',
  'obs.intro':
    'Observaciones reales, y tus propios archivos, como gráfica, tabla e imagen a la vez. Lo que seleccionas en una queda seleccionado en todas; enmascara, anota, pliega, agrupa y convierte; deshaz cualquier cosa; y guarda exactamente lo que hiciste.',
  'obs.back': 'Volver a Gravitas',
  'obs.catalog': 'Instalar más datos desde el catálogo',

  'obs.open.title': 'Abrir una observación',
  'obs.open.fixture': 'Una observación real',
  'obs.open.button': 'Abrir',
  'obs.opening': 'Abriendo…',
  'obs.opened': 'Abierta: {title}.',
  'obs.openFailed': 'No se pudo abrir: {why}',
  'obs.kind.time-series': 'Series temporales',
  'obs.kind.spectrum': 'Espectros',
  'obs.kind.table': 'Catálogo',
  'obs.kind.image': 'Imagen',
  'obs.fixture.tess-light-curve': 'HD 209458: curva de luz de TESS, sector 56',
  'obs.fixture.sdss-a': 'SDSS DR18: una estrella A',
  'obs.fixture.sdss-g': 'SDSS DR18: una estrella G',
  'obs.fixture.sdss-k': 'SDSS DR18: una estrella K',
  'obs.fixture.sdss-m': 'SDSS DR18: una estrella M',
  'obs.fixture.gwosc-events': 'Cinco eventos de ondas gravitacionales (GWOSC)',
  'obs.fixture.tess-aperture': 'HD 209458: la máscara de apertura de TESS',

  'obs.import.file': 'O importa tu propio archivo',
  'obs.import.hint':
    'CSV, texto separado por tabuladores o por punto y coma, o JSON, hasta 5 MB y 200.000 filas. No sale de este dispositivo.',
  'obs.import.title': 'Revisa lo que vas a importar',
  'obs.import.summary':
    '{rows} filas y {columns} columnas, {delimiter}, {header}.',
  'obs.import.delimiter.comma': 'separadas por comas',
  'obs.import.delimiter.tab': 'separadas por tabuladores',
  'obs.import.delimiter.semicolon': 'separadas por punto y coma',
  'obs.import.delimiter.json': 'leídas como JSON',
  'obs.import.withHeader': 'con una fila de encabezado',
  'obs.import.noHeader':
    'sin fila de encabezado, así que las columnas van numeradas',
  'obs.import.previewCaption': 'Las primeras {n} filas, tal como vienen',
  'obs.import.kind': 'Qué tipo de datos son',
  'obs.import.chooseKind': 'Elige…',
  'obs.import.choose': 'Elige…',
  'obs.import.titleLabel': 'Título',
  'obs.import.decimalComma': 'Los números usan coma decimal',
  'obs.import.timeTitle': 'El eje del tiempo',
  'obs.import.timeFormat': 'Cómo cuenta',
  'obs.import.timeScale': 'Escala de tiempo',
  'obs.import.spectralTitle': 'El eje espectral',
  'obs.import.medium': 'Longitudes de onda medidas en',
  'obs.import.frame': 'Sistema de referencia',
  'obs.import.framePlaceholder': 'observado',
  'obs.import.columnsTitle': 'Columnas',
  'obs.import.unitRule':
    'Cada columna de números necesita una unidad. No se supone nada: elige una, elige «sin unidad» para un cociente, o indica que no consta.',
  'obs.import.stats':
    '{numbers} números de {min} a {max}; {missing} faltan, escritos como {tokens}.',
  'obs.import.statsText': 'Texto: {numbers} de {n} valores son números.',
  'obs.import.blank': 'en blanco',
  'obs.import.use': 'Qué es «{column}»',
  'obs.import.unit': 'La unidad de «{column}»',
  'obs.import.of': 'La incertidumbre de',
  'obs.import.chooseUnit': 'Elige una unidad…',
  'obs.import.useSuggestion': 'Usar {unit}, según el encabezado',
  'obs.import.suggestionUsed':
    'La unidad de {column} es ahora la que nombra su encabezado. Compruébala.',
  'obs.import.go': 'Importar',
  'obs.import.cancel': 'Cancelar',
  'obs.import.notYet':
    'Aún no se ha importado: quedan {n} cosas por resolver, listadas arriba.',
  'obs.import.readBackDiffers':
    'Un archivo que guardó esta página. Sus {n} cambios, hechos de nuevo aquí, no dan la observación que contiene: los números que se muestran son los de esta versión.',
  'obs.import.onLine': 'Línea {line}: {message}',
  'obs.import.readBack':
    'Un archivo que guardó esta página, leído entero: sus {n} cambios hechos de nuevo, y se pueden deshacer.',
  'obs.use.ignore': 'Dejar fuera',
  'obs.use.x': 'A lo largo del eje',
  'obs.use.value': 'Un valor',
  'obs.use.uncertainty': 'Una incertidumbre (una sigma)',
  'obs.use.label': 'Texto',
  'obs.timeFormat.JD': 'Fecha juliana (JD)',
  'obs.timeFormat.MJD': 'Fecha juliana modificada (MJD)',
  'obs.timeFormat.BJD': 'Fecha juliana baricéntrica (BJD)',
  'obs.timeFormat.BTJD': 'Fecha baricéntrica de TESS (BTJD = BJD − 2457000)',
  'obs.timeFormat.relative': 'Tiempo desde la primera fila',
  'obs.scale.unknown': 'Desconocida',
  'obs.medium.vacuum': 'el vacío',
  'obs.medium.air': 'el aire',
  'obs.medium.unknown': 'un medio desconocido',
  'obs.frame.rest': 'el sistema en reposo',
  'obs.unit.none': 'Sin unidad (un cociente)',
  'obs.unit.notStated': 'unidad no indicada',
  'obs.dim.ratio': 'Cocientes',
  'obs.dim.time': 'Tiempo',
  'obs.dim.length': 'Longitud y longitud de onda',
  'obs.dim.frequency': 'Frecuencia',
  'obs.dim.flux-per-wavelength': 'Flujo por longitud de onda',
  'obs.dim.flux-per-frequency': 'Flujo por frecuencia',
  'obs.dim.magnitude': 'Magnitud',
  'obs.dim.mass': 'Masa',
  'obs.dim.angle': 'Ángulo',
  'obs.dim.velocity': 'Velocidad',
  'obs.dim.temperature': 'Temperatura',
  'obs.dim.count-rate': 'Tasa de cuentas',
  'obs.dim.count': 'Cuentas',
  'obs.dim.pixel': 'Píxeles',

  'obs.source.origin': 'Qué es',
  'obs.source.credit': 'Créditos',
  'obs.source.object': 'Objeto',
  'obs.source.position': 'AR {ra}°, Dec {dec}° ({frame})',
  'obs.source.facility': 'Observado con',
  'obs.source.license': 'Licencia',
  'obs.source.retrieved': 'Obtenido',
  'obs.source.citations': 'Cita',
  'obs.source.file': 'Archivo',
  'obs.source.fileValue': '{name}, {kb} KB',
  'obs.origin.observed': 'Una observación',
  'obs.origin.model': 'Un modelo',
  'obs.origin.compilation': 'Valores publicados, recopilados',
  'obs.origin.imported': 'Tu archivo',

  'obs.seeing.title': 'Lo que estás viendo',
  'obs.seeing.imported':
    'Es tu archivo. Gravitas no ha comprobado de dónde salen sus números.',
  'obs.seeing.drawnAll': 'Se dibujan las {n} filas que tienen números.',
  'obs.seeing.drawnSome':
    'Se dibujan {drawn} de {n} puntos: el más bajo y el más alto de cada columna de píxeles, lo que conserva cada pico y cada caída. La tabla y los dos archivos guardados tienen los {n}.',
  'obs.seeing.notPlotted':
    '{n} filas no tienen valor en uno de los dos ejes y no se dibujan.',
  'obs.seeing.masked':
    '{n} filas están enmascaradas: se dibujan huecas, quedan fuera de los cálculos y se conservan al guardar.',
  'obs.seeing.missing': '{column}: faltan {n} valores.',
  'obs.seeing.sigma':
    '{column}: las barras son una desviación típica, según los datos.',
  'obs.seeing.interval':
    '{column}: las barras son el intervalo del {level} %, según los datos.',
  'obs.seeing.noUncertainty':
    '{column}: no consta ninguna incertidumbre para estos valores, así que no hay barras. Eso no quiere decir que sean exactos.',
  'obs.seeing.time':
    'El tiempo se cuenta como {format}, en la escala de tiempo {scale}.',
  'obs.seeing.timeUnknown':
    'El tiempo se cuenta como {format}; la escala de tiempo es desconocida.',
  'obs.seeing.spectral': 'Longitudes de onda en {medium}, en {frame}.',

  'obs.note.crop':
    'Recortado por {column}, de {min} a {max}: se conservan {kept} de {of} filas. Notas fuera del intervalo: {droppedAnnotations} eliminadas.',
  'obs.note.mask':
    'Enmascaraste {rows} filas. Las filas enmascaradas se dibujan huecas, quedan fuera de los cálculos y se conservan al guardar.',
  'obs.note.normalize':
    'Se dividió {column}, y su incertidumbre, por la mediana, {median} {unit}: ahora los valores son relativos.',
  'obs.note.fold':
    'Plegado con un período de {period} {unit} desde una época de {epoch}: el eje es ahora la fase, de −0,5 a 0,5.',
  'obs.note.bin':
    'Se promediaron {rows} filas en {bins} intervalos de {width} {unit}. La incertidumbre de cada intervalo combina la de sus puntos; se dejaron fuera {masked} filas enmascaradas.',
  'obs.note.binScatter':
    'Se promediaron {rows} filas en {bins} intervalos de {width} {unit}. Las filas no tienen incertidumbre, así que la de cada intervalo es el error típico de la dispersión de sus puntos, y un intervalo de un solo punto no tiene.',
  'obs.note.restFrame':
    'Llevado al sistema en reposo con z = {z}: cada longitud de onda dividida por 1 + z.',

  'obs.axes.x': 'Horizontal',
  'obs.axes.y': 'Vertical',
  'obs.keys':
    'Arrastra sobre la gráfica o la imagen, o haz clic en la tabla, para seleccionar. Con el teclado: las flechas mueven, Mayús con una flecha selecciona, Espacio añade o quita una, Escape borra la selección. Ctrl+Z deshace un cambio.',
  'obs.plot.role': 'gráfica',
  'obs.plot.label': '{y} frente a {x}, {n} puntos',
  'obs.image.role': 'cuadrícula de píxeles',
  'obs.image.label':
    'La imagen, de {w} por {h} píxeles, con la fila más baja abajo',
  'obs.legend.entry': '{value}, {n} píxeles: {meanings}',
  'obs.legend.source': 'Qué significan los bits: {source}',
  'obs.describe.row': 'Fila {row} de {n}{masked}: {values}.',
  'obs.describe.masked': ', enmascarada',
  'obs.describe.pixel':
    'Columna {x}, fila {y}{masked}: {value}, {meaning}. Ascensión recta {ra}°, declinación {dec}°.',

  'obs.selection.count': '{n} seleccionadas',
  'obs.selection.clear': 'Borrar la selección',
  'obs.selectionCleared':
    'Las filas están numeradas de otra forma, así que se borró la selección.',
  'obs.mask.label': 'Por qué se dejan fuera (opcional)',
  'obs.mask.go': 'Enmascarar la selección',
  'obs.mask.reader': 'Enmascaraste {n} filas: {label}',
  'obs.mask.source': '{n} filas venían enmascaradas: {label}',
  'obs.mask.unlabelled': 'sin motivo indicado',
  'obs.mask.remove': 'Quitar la máscara',
  'obs.note.label': 'Una nota sobre la selección',
  'obs.note.go': 'Añadir la nota',
  'obs.note.show': 'Filas {first} a {last}',
  'obs.note.remove': 'Quitar',
  'obs.marks.title': 'Máscaras y notas',
  'obs.undo': 'Deshacer',
  'obs.redo': 'Rehacer',
  'obs.undid': 'Deshecho: {change}.',
  'obs.redid': 'Rehecho: {change}.',
  'obs.applied': 'Hecho: {change}.',
  'obs.refused': 'Ese cambio no se puede hacer: {why}.',
  'obs.replayFailed':
    'Un cambio guardado no se pudo hacer en esta observación ({why}), así que se dejó fuera.',
  'obs.op.crop': 'recorte',
  'obs.op.mask': 'máscara',
  'obs.op.unmask': 'máscara quitada',
  'obs.op.convert': 'cambio de unidad',
  'obs.op.timeFormat': 'cambio de formato de tiempo',
  'obs.op.normalize': 'división por la mediana',
  'obs.op.fold': 'plegado',
  'obs.op.bin': 'agrupación',
  'obs.op.restFrame': 'paso al sistema en reposo',
  'obs.op.annotate': 'nota',
  'obs.op.unannotate': 'nota quitada',

  'obs.changes.title': 'Cambiar lo que estás viendo',
  'obs.changes.hint':
    'Cada cambio se puede deshacer, y el archivo guardado los enumera todos.',
  'obs.crop.min': 'Conservar desde',
  'obs.crop.max': 'hasta',
  'obs.crop.go': 'Recortar',
  'obs.normalize.go': 'Dividir por la mediana',
  'obs.fold.period': 'Período',
  'obs.fold.epoch': 'Época (un instante de mitad de tránsito)',
  'obs.fold.go': 'Plegar',
  'obs.bin.width': 'Anchura del intervalo',
  'obs.bin.go': 'Agrupar',
  'obs.rest.z': 'Corrimiento al rojo z',
  'obs.rest.go': 'Llevar al sistema en reposo',
  'obs.convert.column': 'Convertir',
  'obs.convert.to': 'a',
  'obs.convert.go': 'Convertir',
  'obs.time.to': 'Contar el tiempo como',
  'obs.time.go': 'Cambiar',

  'obs.table.rows': 'Filas {first} a {last} de {n}.',
  'obs.table.row': 'Fila',
  'obs.table.masked': '(enmascarada)',
  'obs.table.missing': 'falta',
  'obs.table.prev': 'Filas anteriores',
  'obs.table.next': 'Filas siguientes',
  'obs.export.json': 'Guardar como JSON (todo, con tus cambios)',
  'obs.export.csv': 'Guardar las filas como CSV',
  'obs.fit.title': 'Ajustar un modelo (diagnóstico)',
  'obs.arc.title':
    'O busca las épocas de Gaia de una estrella en el CDS (en vivo, opcional)',
  'obs.ms.title': 'Medir, y el flujo',
};
