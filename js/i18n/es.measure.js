// =============================================================================
// El flujo de medida del observatorio, en español
// -----------------------------------------------------------------------------
// js/observatory/measurePanel.js registra estos textos cuando un lector abre
// el panel por primera vez, para que la página no los cargue al inicio. Solo
// el título del panel, que la página muestra cerrado, queda en
// ./es.observatory.js.
// =============================================================================

export const ES_MEASURE = {
  'obs.ms.intro':
    'Mide la observación que tienes a la vista. Cada resultado registra la herramienta y su versión, sus parámetros, en qué punto de tus cambios se tomó y una suma de comprobación de los datos que vio; si cambias los datos en que se basa, indica que está desfasado.',
  'obs.ms.tool': 'Herramienta',
  'obs.ms.tool.period': 'Búsqueda de periodo (Lomb-Scargle)',
  'obs.ms.tool.box': 'Búsqueda de tránsitos (mínimos cuadrados de caja)',
  'obs.ms.tool.line': 'Línea espectral: continuo, anchura equivalente, centro',
  'obs.ms.tool.aperture': 'Apertura sobre la imagen',
  'obs.ms.tool.filter': 'Filtrar las filas',
  'obs.ms.tool.match': 'Emparejar con una segunda tabla',
  'obs.ms.none': 'Ninguna herramienta de aquí mide este tipo de observación.',
  'obs.ms.run': 'Medir',
  'obs.ms.recomputeWith': 'Recalcular {id} con estos parámetros',
  'obs.ms.cancel': 'Cancelar',
  'obs.ms.progress': 'Progreso',
  'obs.ms.running': 'Ejecutando {tool}…',
  'obs.ms.canceled': 'Cancelado.',
  'obs.ms.ran': '{id}: {tool} terminado.',
  'obs.ms.failed': '{id}: {tool} no pudo medir esto: {why}',
  'obs.ms.p.minPeriod': 'Periodo más corto ({unit})',
  'obs.ms.p.maxPeriod': 'Periodo más largo ({unit})',
  'obs.ms.p.oversample': 'Sobremuestreo',
  'obs.ms.p.durations': 'Duraciones de prueba ({unit}), separadas por comas',
  'obs.ms.p.preset': 'Línea',
  'obs.ms.p.custom': 'Otra línea: escribe las ventanas',
  'obs.ms.p.rest':
    'Longitud de onda en reposo ({unit}) para una velocidad, si la quieres',
  'obs.ms.p.lineLo': 'Ventana de la línea desde ({unit})',
  'obs.ms.p.lineHi': 'Ventana de la línea hasta ({unit})',
  'obs.ms.p.blueLo': 'Continuo azul desde ({unit})',
  'obs.ms.p.blueHi': 'Continuo azul hasta ({unit})',
  'obs.ms.p.redLo': 'Continuo rojo desde ({unit})',
  'obs.ms.p.redHi': 'Continuo rojo hasta ({unit})',
  'obs.ms.p.mode': 'Medir',
  'obs.ms.p.mode.flux': 'Flujo en un círculo, con el fondo de un anillo',
  'obs.ms.p.mode.bits': 'Píxeles con una marca activada',
  'obs.ms.p.bit': 'Marca',
  'obs.ms.p.circle': 'Solo dentro de un círculo',
  'obs.ms.p.x': 'Centro x (píxel FITS)',
  'obs.ms.p.y': 'Centro y (píxel FITS)',
  'obs.ms.p.r': 'Radio (píxeles)',
  'obs.ms.p.rIn': 'Anillo desde (píxeles)',
  'obs.ms.p.rOut': 'Anillo hasta (píxeles)',
  'obs.ms.p.gain': 'Ganancia (electrones por unidad), si se conoce',
  'obs.ms.p.column': 'Columna',
  'obs.ms.p.op': 'Prueba',
  'obs.ms.p.value': 'Valor',
  'obs.ms.p.inUnit': 'en {unit}',
  'obs.ms.p.join': 'Conservar una fila que pase',
  'obs.ms.p.join.all': 'todas las pruebas',
  'obs.ms.p.join.any': 'alguna prueba',
  'obs.ms.p.second': 'Segunda tabla (CSV, TSV o JSON)',
  'obs.ms.p.secondRead': 'Segunda tabla: {rows} filas, {columns} columnas.',
  'obs.ms.p.secondFailed': 'No se pudo leer la segunda tabla: {why}',
  'obs.ms.p.by': 'Emparejar por',
  'obs.ms.p.by.value': 'un valor',
  'obs.ms.p.by.sky': 'posición en el cielo',
  'obs.ms.p.aColumn': 'En esta tabla',
  'obs.ms.p.bColumn': 'En la segunda tabla',
  'obs.ms.p.aRa': 'Ascensión recta en esta tabla',
  'obs.ms.p.aDec': 'Declinación en esta tabla',
  'obs.ms.p.bRa': 'Ascensión recta en la segunda',
  'obs.ms.p.bDec': 'Declinación en la segunda',
  'obs.ms.p.tolerance': 'A menos de',
  'obs.ms.p.radius': 'A menos de (segundos de arco)',
  'obs.ms.p.bad': 'Revisa {field}: necesita un número.',
  'obs.ms.nodes': 'Medidas',
  'obs.ms.nodesNone': 'Todavía no se ha medido nada.',
  'obs.ms.node': '{id} · {tool}, versión {version}',
  'obs.ms.status.current': 'al día',
  'obs.ms.status.stale':
    'desfasada: los datos que midió han cambiado desde entonces',
  'obs.ms.status.failed': 'no pudo medir',
  'obs.ms.recompute': 'Recalcular',
  'obs.ms.edit': 'Cambiar sus parámetros',
  'obs.ms.remove': 'Quitar',
  'obs.ms.fold': 'Plegar con este periodo',
  'obs.ms.maskFailed': 'Enmascarar las filas que no pasan',
  'obs.ms.notebook': 'Añadir al cuaderno',
  'obs.ms.periodogram': 'Periodograma',
  'obs.ms.periodogramLabel':
    'Potencia frente al periodo de prueba: {n} periodos de prueba, el más alto en {period}.',
  'obs.ms.col.quantity': 'Magnitud',
  'obs.ms.col.value': 'Valor',
  'obs.ms.col.kind': 'Tipo',
  'obs.ms.kind.measured': 'medido',
  'obs.ms.kind.derived': 'derivado',
  'obs.ms.kind.assumed': 'supuesto',
  'obs.ms.errorKind': 'error {kind}',
  'obs.ms.q.period': 'Periodo',
  'obs.ms.q.power': 'Potencia',
  'obs.ms.q.falseAlarm': 'Probabilidad de falsa alarma',
  'obs.ms.q.amplitude': 'Amplitud',
  'obs.ms.q.points': 'Puntos usados',
  'obs.ms.q.epoch': 'Época (mitad del tránsito)',
  'obs.ms.q.duration': 'Duración',
  'obs.ms.q.depth': 'Profundidad',
  'obs.ms.q.sde': 'Eficiencia de detección de la señal',
  'obs.ms.q.ew': 'Anchura equivalente',
  'obs.ms.q.center': 'Centro de la línea',
  'obs.ms.q.rest': 'Longitud de onda en reposo',
  'obs.ms.q.velocity': 'Velocidad',
  'obs.ms.q.count': 'Píxeles',
  'obs.ms.q.centroidX': 'Centroide x',
  'obs.ms.q.centroidY': 'Centroide y',
  'obs.ms.q.ra': 'Ascensión recta',
  'obs.ms.q.dec': 'Declinación',
  'obs.ms.q.skyArea': 'Área en el cielo',
  'obs.ms.q.sum': 'Suma en el círculo',
  'obs.ms.q.area': 'Área del círculo',
  'obs.ms.q.background': 'Fondo por píxel',
  'obs.ms.q.net': 'Flujo neto',
  'obs.ms.q.kept': 'Filas conservadas',
  'obs.ms.q.dropped': 'Filas descartadas',
  'obs.ms.q.pairs': 'Parejas',
  'obs.ms.q.unmatched': 'Filas sin pareja',
  'obs.ms.q.ambiguous': 'Filas con más de un candidato',
  'obs.ms.w.unweighted': 'Sin incertidumbres: todos los puntos pesan lo mismo.',
  'obs.ms.w.notSignificant':
    'No es significativo: la probabilidad de falsa alarma es {falseAlarm}.',
  'obs.ms.w.atEdge':
    'El pico más alto está en el borde del intervalo buscado: amplíalo.',
  'obs.ms.w.fewCycles':
    'Los datos contienen menos de dos ciclos de este periodo.',
  'obs.ms.w.errorAssumesSinusoid':
    'El error del periodo supone una sinusoide en ruido blanco (Montgomery y O’Donoghue 1999); una señal de otra forma, o un ruido que no sea blanco, lo hace demasiado pequeño.',
  'obs.ms.w.weakDetection':
    'Una detección débil: eficiencia de detección de la señal {sde}.',
  'obs.ms.w.noPeriodError':
    'La búsqueda de caja no da incertidumbre para el periodo. Ajusta un modelo de tránsito para obtenerla.',
  'obs.ms.w.maskedLeftOut': 'Se dejaron fuera {n} filas enmascaradas.',
  'obs.ms.w.noErrorLeftOut': 'Se dejaron fuera {n} filas sin incertidumbre.',
  'obs.ms.w.errorsFromScatter':
    'El espectro no tiene incertidumbres, así que la de cada punto se toma como la dispersión del continuo, supuesta igual dentro de la línea.',
  'obs.ms.w.continuumPoorFit':
    'El continuo se ajusta mal: chi cuadrado reducido {reducedChi2}.',
  'obs.ms.w.noAbsorption': 'No hay absorción en la ventana de la línea.',
  'obs.ms.w.emission':
    'La línea está en emisión, así que su anchura equivalente es negativa.',
  'obs.ms.w.noiseModelAssumed':
    'El error supone solo el ruido del fondo, más el de la propia fuente si se da una ganancia.',
  'obs.ms.w.apertureCut': 'El círculo se sale del borde de la imagen.',
  'obs.ms.w.noSource': 'Nada dentro del círculo supera el fondo.',
  'obs.ms.w.noPixels': 'Ningún píxel tiene esa marca.',
  'obs.ms.w.missingValues':
    '{n} filas no tienen valor en {column} y no pasan ninguna prueba sobre ella.',
  'obs.ms.w.ambiguous':
    '{n} filas tenían más de un candidato; cada una tomó el más cercano.',
  'obs.ms.pipeline': 'El flujo',
  'obs.ms.pipe.source':
    'Abierta: {title} ({id}). SHA-256 del contenido {digest}.',
  'obs.ms.pipe.change': '{op}: una {stage}; incertidumbre {treatment}.',
  'obs.ms.pipe.measure': '{id}: {tool}, {status}.',
  'obs.ms.pipe.fit': 'Ajuste: {model}, {algorithm} {version}.',
  'obs.ms.stage.selection': 'selección',
  'obs.ms.stage.calibration': 'calibración',
  'obs.ms.stage.transformation': 'transformación',
  'obs.ms.stage.annotation': 'nota',
  'obs.ms.treat.kept': 'tal como estaba',
  'obs.ms.treat.scaled': 'escalada con los valores',
  'obs.ms.treat.scaledAssumed':
    'dividida por el mismo número, cuya propia incertidumbre no se incluye',
  'obs.ms.treat.propagated':
    'propagada, o tomada de la dispersión donde no la había',
  'obs.ms.undo': 'Deshacer',
  'obs.ms.redo': 'Rehacer',
  'obs.ms.save': 'Guardar el flujo (JSON)',
  'obs.ms.csv': 'Guardar los resultados (CSV)',
  'obs.ms.gridCsv': 'Guardar el periodograma (CSV)',
  'obs.ms.open': 'Abrir un flujo guardado',
  'obs.ms.methods': 'Métodos',
  'obs.ms.readBack.same': 'Releído: cada medida da el número que guardó.',
  'obs.ms.readBack.differs':
    'Releído: {n} medidas no dan el número que guardaron.',
  'obs.ms.readBack.migrated':
    'Se abrió un archivo guardado del Observatorio como flujo, todavía sin medidas.',
  'obs.ms.nodeSame': 'da el número que guardó',
  'obs.ms.nodeDiffers': 'no da el número que guardó',
  'obs.ms.nodeVersion': 'guardada con la versión {version} de su herramienta',
  'obs.ms.open.notJson': 'Ese archivo no es JSON.',
  'obs.ms.open.notPipeline':
    'Ese archivo no es un flujo ni un archivo guardado del Observatorio.',
  'obs.ms.open.newer':
    'Ese flujo tiene la versión de formato {version}, más nueva de la que lee este Gravitas.',
  'obs.ms.open.unknownVersion':
    'Ese flujo tiene la versión de formato {version}, que este Gravitas no conoce.',
  'obs.ms.open.incomplete':
    'A ese flujo le falta el espacio de trabajo o la lista de medidas.',
  'obs.ms.open.unknownTool':
    'Ese flujo usa una herramienta que este Gravitas no tiene: {tool}.',
  'obs.ms.open.badNode':
    'Una medida de ese flujo no tiene posición entre los cambios.',
  'obs.ms.open.workspace': 'No se pudo leer la observación de ese flujo: {why}',
  'obs.ms.notebook.added':
    'Añadida a tu cuaderno. Está en el panel del cuaderno, y en su informe, en Gravitas.',
  'obs.ms.notebook.failed': 'No se añadió al cuaderno: {why}',
  'obs.ms.nb.title': '{tool} sobre {observation}',
  'obs.ms.nb.observation': 'Observación',
  'obs.ms.nb.source': 'Fuente',
  'obs.ms.nb.digest': 'SHA-256 del contenido',
  'obs.ms.nb.license': 'Licencia',
  'obs.ms.nb.tool': 'Herramienta',
  'obs.ms.nb.params': 'Parámetros',
  'obs.ms.nb.changes': 'Cambios anteriores',
  'obs.ms.nb.noChanges': 'ninguno',
  'obs.ms.nb.assumed': 'Supuesto',
  'obs.ms.nb.warnings': 'Avisos',
  'obs.ms.m.source':
    'Los datos: {title} ({id}), {source}; SHA-256 del contenido {digest}.',
  'obs.ms.m.change': 'Cambio {n}: {op} ({params}); incertidumbre {treatment}.',
  'obs.ms.m.period':
    '{id}: un periodograma de Lomb-Scargle generalizado (Zechmeister y Kürster 2009) de {min} a {max} {unit}, sobremuestreado {over} veces, tras {at} cambios. El error del periodo supone una sinusoide en ruido blanco (Montgomery y O’Donoghue 1999); la probabilidad de falsa alarma es la de Baluev (2008).',
  'obs.ms.m.box':
    '{id}: mínimos cuadrados de caja (Kovacs, Zucker y Mazeh 2002) de {min} a {max} {unit}, duraciones de prueba {durations} {unit}, tras {at} cambios; su significación es la eficiencia de detección de la señal.',
  'obs.ms.m.line':
    '{id}: un continuo recto ajustado de {blueLo} a {blueHi} y de {redLo} a {redHi} {unit}; la anchura equivalente y el centro ponderado por la profundidad de {lineLo} a {lineHi} {unit}, con incertidumbres propagadas linealmente, tras {at} cambios.',
  'obs.ms.m.rest':
    'La velocidad es respecto a una longitud de onda en reposo de {rest} {unit}, supuesta.',
  'obs.ms.m.flux':
    '{id}: el flujo en un círculo de radio {r} píxeles en ({x}, {y}), menos la mediana de un anillo de {rIn} a {rOut} píxeles; su error supone un ruido limitado por el fondo. Tras {at} cambios.',
  'obs.ms.m.bits':
    '{id}: los píxeles con la marca {bit} activada, su número y su centroide, y la posición en el cielo del centroide según las coordenadas de la imagen. Tras {at} cambios.',
  'obs.ms.m.filter':
    '{id}: las filas conservadas donde {conditions}, tras {at} cambios.',
  'obs.ms.m.match':
    '{id}: cada fila emparejada, una a una y la más cercana primero, con una fila de la segunda tabla a menos de {tolerance}, tras {at} cambios.',
  'obs.ms.m.fit':
    'Un ajuste de modelo: {model}, {algorithm} {version}. Su propia exportación tiene el registro completo.',
  'obs.ms.and': ' y ',
  'obs.ms.or': ' o ',
};
