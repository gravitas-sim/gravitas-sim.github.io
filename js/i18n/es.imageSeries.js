// =============================================================================
// Las palabras de la herramienta de movimiento y paralaje, en español
// -----------------------------------------------------------------------------
// Las registra js/observatory/imageSeries.js cuando la herramienta se abre por
// primera vez (con el traductor del Observatorio), de modo que ninguna otra
// página las lleva. Identificadores obs.ser.*; el título del panel está en
// es.observatory.js (está en la página antes de que cargue la herramienta). Sin
// revisar por una persona hispanohablante fluida.
// =============================================================================

export const ES_IMAGESERIES = {
  'obs.ser.help':
    'Ajusta las posiciones de una fuente a lo largo del tiempo. Da su posición en cada época (escríbelas, pega una tabla o añade una fila desde la marca de la imagen abierta, que usa las coordenadas del cielo de arriba) y elige qué ajustar. Dos épocas dan solo un desplazamiento. Un paralaje se ajusta junto con el movimiento propio solo si las épocas muestrean la elipse paraláctica: al menos 8 épocas durante al menos 0,9 años, en al menos 3 de los 4 cuartos de la órbita de la Tierra.',
  'obs.ser.rows': 'Posiciones en cada época',
  'obs.ser.col.epoch': 'Época',
  'obs.ser.col.ra': 'Ascensión recta',
  'obs.ser.col.dec': 'Declinación',
  'obs.ser.col.sx': 'Incertidumbre este (segundos de arco)',
  'obs.ser.col.sy': 'Incertidumbre norte (segundos de arco)',
  'obs.ser.col.remove': 'Quitar',
  'obs.ser.removeRow': 'Quitar la fila {n}',
  'obs.ser.cell': 'Fila {n}: {col}',
  'obs.ser.format': 'Época dada como',
  'obs.ser.format.jd': 'Fecha juliana (JD)',
  'obs.ser.format.mjd': 'Fecha juliana modificada (MJD)',
  'obs.ser.scale': 'Escala de tiempo',
  'obs.ser.scale.utc': 'UTC',
  'obs.ser.scale.tt': 'TT',
  'obs.ser.scale.tdb': 'TDB',
  'obs.ser.raHours': 'Ascensión recta en horas (si no, en grados)',
  'obs.ser.addRow': 'Añadir una fila',
  'obs.ser.tag': 'Etiqueta de la fuente marcada',
  'obs.ser.noTags': 'No hay marcas de punto con etiqueta',
  'obs.ser.addMark': 'Añadir una fila desde la marca de esta imagen',
  'obs.ser.paste': 'Pegar una tabla',
  'obs.ser.pasteHelp':
    'Una época por línea: época, ascensión recta, declinación, incertidumbre este y (opcional) norte en segundos de arco, separadas por espacios, tabuladores o punto y coma (en inglés también por comas). Las líneas que empiezan por # se ignoran. Al cargar se reemplaza la tabla.',
  'obs.ser.pasteLabel': 'Filas que cargar',
  'obs.ser.pasteLoad': 'Cargar estas filas',
  'obs.ser.kind': 'Qué ajustar',
  'obs.ser.kind.shift': 'Desplazamiento de dos épocas',
  'obs.ser.kind.motion': 'Movimiento propio',
  'obs.ser.kind.joint': 'Paralaje y movimiento propio',
  'obs.ser.frame': 'Sistema de referencia de las posiciones (opcional)',
  'obs.ser.corr': 'Corrección al paralaje absoluto, mas (opcional)',
  'obs.ser.corrSigma': 'Su incertidumbre, mas',
  'obs.ser.corrSource': 'Su fuente (obligatoria con una corrección)',
  'obs.ser.fit': 'Ajustar',
  'obs.ser.csv': 'Guardar los residuos como CSV',
  'obs.ser.keep': 'Guardar en el registro',
  'obs.ser.limits':
    'Límites: un movimiento en línea recta a ritmo constante; sin movimiento orbital, sin términos relativistas, sin aberración ni desviación de la luz; las incertidumbres se toman como independientes. Un paralaje medido contra las estrellas de referencia es relativo, no absoluto.',
  'obs.ser.no.row':
    'La fila {index} no es una posición completa: necesita un número para la época, una ascensión recta, una declinación y una incertidumbre positiva.',
  'obs.ser.no.needTwo':
    'Un desplazamiento de dos épocas necesita exactamente dos filas.',
  'obs.ser.no.paste':
    'Cada línea necesita al menos cuatro valores: época, ascensión recta, declinación y una incertidumbre.',
  'obs.ser.no.noMark':
    'Elige primero una etiqueta con una marca de punto en esta imagen (el panel de marcas las coloca).',
  'obs.ser.no.noTime':
    'Esta imagen no declara una hora con su escala (UTC, TT o TDB), así que no se conoce la época: escríbela en una fila.',
  'obs.ser.no.noWcs':
    'Esta imagen aún no tiene coordenadas del cielo: resuélvelas o usa su cabecera en el panel de arriba, o escribe la posición.',
  'obs.ser.no.mismatch':
    'La hora de esta imagen está en otro formato o escala que la de la tabla: haz que coincidan o escribe la fila.',
  'obs.ser.no.ephemeris':
    'No se pudo cargar la efeméride que necesita un paralaje; se descarga la primera vez, así que necesita la red.',
  'obs.ser.no.no-series': 'No hay épocas que ajustar.',
  'obs.ser.no.too-many': 'Se rechaza una serie de más de {max} épocas.',
  'obs.ser.no.bad-epoch':
    'La fila {index} tiene una época que esta herramienta no puede leer: necesita un número, un formato (JD o MJD) y una escala de tiempo (UTC, TT o TDB).',
  'obs.ser.no.bad-position':
    'La fila {index} tiene una posición que no es una ascensión recta y una declinación en grados (u horas y minutos), o no tiene ninguna.',
  'obs.ser.no.bad-sigma':
    'La fila {index} tiene una incertidumbre que no es un número positivo de segundos de arco.',
  'obs.ser.no.too-wide':
    'La fila {index} está a más de 3600 segundos de arco de las demás: no son una sola fuente.',
  'obs.ser.no.no-baseline':
    'Las épocas distan menos de un día: no hay base temporal para medir.',
  'obs.ser.no.too-few-epochs':
    'Sin restricción: {n} épocas son pocas. Un movimiento propio necesita al menos 2, y un paralaje necesita al menos 8 épocas que muestreen la elipse paraláctica (dos épocas dan solo un desplazamiento).',
  'obs.ser.no.span':
    'Sin restricción: las épocas abarcan {spanYears} años, y un paralaje necesita al menos 0,9 años.',
  'obs.ser.no.phase-coverage':
    'Sin restricción: las épocas caen en {sectors} de los 4 cuartos de la órbita de la Tierra, y un paralaje necesita al menos 3.',
  'obs.ser.no.epoch-range':
    'Las épocas, leídas como {format} en {scale}, caen fuera de la efeméride que tiene esta herramienta (JD {startJd} a {stopJd}, de 2025 a 2045). Comprueba que son fechas julianas y no modificadas (o al revés), y la escala de tiempo.',
  'obs.ser.no.utc-before-2017':
    'El UTC anterior a 2017 necesita segundos intercalares que esta herramienta no tiene: da las épocas en TT o TDB.',
  'obs.ser.no.correction':
    'Una corrección al paralaje absoluto necesita su tamaño y su incertidumbre, ambos números en milisegundos de arco.',
  'obs.ser.no.correction-source':
    'Una corrección al paralaje absoluto necesita su fuente: no hay un valor por defecto ni universal.',
  'obs.ser.no.degenerate':
    'Las épocas no fijan el ajuste (el sistema es singular).',
  'obs.ser.no.record': 'Esto no es un registro de esta herramienta.',
  'obs.ser.said.rowAdded': 'Fila añadida: {n} filas.',
  'obs.ser.said.loaded': '{n} filas cargadas.',
  'obs.ser.said.shift':
    'Desplazamiento de dos épocas hecho. No es un paralaje.',
  'obs.ser.said.fitted':
    'Ajustado: {verdict}, chi cuadrado {chi2} con {dof} grados de libertad.',
  'obs.ser.said.csv': 'Se guardaron {n} filas como CSV.',
  'obs.ser.said.kept': 'Guardado en el registro.',
  'obs.ser.said.keepFailed': 'No se pudo guardar: {why}',
  'obs.ser.shiftLabel':
    'desplazamiento bajo una hipótesis de movimiento fijo; no es un paralaje',
  'obs.ser.shift.disp':
    'Desplazamiento: {x} ± {sx} segundos de arco al este y {y} ± {sy} segundos de arco al norte.',
  'obs.ser.shift.rate':
    'En {years} años eso son {x} segundos de arco al año al este y {y} segundos de arco al año al norte, si la fuente se movió en línea recta.',
  'obs.ser.shift.assume.0':
    'La fuente se movió en línea recta a ritmo constante entre las épocas.',
  'obs.ser.shift.assume.1':
    'No hay paralaje en el desplazamiento: con dos épocas no se distinguen un paralaje y un movimiento.',
  'obs.ser.params': 'Parámetros ajustados',
  'obs.ser.pcol.name': 'Parámetro',
  'obs.ser.pcol.value': 'Valor',
  'obs.ser.pcol.sigma': 'Incertidumbre',
  'obs.ser.pcol.unit': 'Unidad',
  'obs.ser.p.x0': 'Desplazamiento este en la época de referencia',
  'obs.ser.p.y0': 'Desplazamiento norte en la época de referencia',
  'obs.ser.p.mux': 'Movimiento propio en ascensión recta (por cos dec)',
  'obs.ser.p.muy': 'Movimiento propio en declinación',
  'obs.ser.p.parallax': 'Paralaje (relativo)',
  'obs.ser.stat':
    'Chi cuadrado {chi2} con {dof} grados de libertad, p = {p}: {verdict}.',
  'obs.ser.exactNote':
    'Con dos épocas no hay residuo que comprobar: la solución es exacta y nada la pone a prueba.',
  'obs.ser.verdict.consistent': 'coherente con las incertidumbres declaradas',
  'obs.ser.verdict.inconsistent':
    'incoherente con las incertidumbres declaradas',
  'obs.ser.verdict.exact': 'exacta',
  'obs.ser.hint.inconsistent':
    'Los residuos son mayores de lo que permiten las incertidumbres declaradas. Comprueba la escala de tiempo y el origen de las épocas, las incertidumbres declaradas y si la fuente se mueve en línea recta.',
  'obs.ser.hint.negative':
    'El paralaje es negativo en más de 3 veces su incertidumbre, algo que ninguna fuente puede tener. Comprueba la escala de tiempo y el origen de las épocas (un desfase de medio año convierte un paralaje en su negativo), las estrellas de referencia y las incertidumbres declaradas.',
  'obs.ser.dist.parallax': 'Paralaje: {p} ± {s} mas.',
  'obs.ser.corrInfo':
    'Corregido a absoluto: {abs} mas, el relativo {rel} mas más {c} mas ({source}).',
  'obs.ser.dist.value':
    'Distancia 1/paralaje: {d} pc. Léela con su intervalo: una distancia obtenida de un paralaje no es una estimación insesgada.',
  'obs.ser.dist.none': 'Sin distancia: el paralaje no es positivo.',
  'obs.ser.dist.low':
    'El paralaje es menor que {n} veces su incertidumbre ({s}): la distancia se conoce mal.',
  'obs.ser.dist.int':
    'Intervalo del {level} % de la distancia: de {lo} a {hi} pc.',
  'obs.ser.dist.open':
    'Intervalo del {level} % de la distancia: {lo} pc o más (el intervalo del paralaje llega a cero, así que nada la acota por arriba).',
  'obs.ser.dist.empty':
    'Intervalo del {level} %: el intervalo del paralaje queda por debajo de cero, así que no permite ninguna distancia.',
  'obs.ser.dist.withheld.inconsistent':
    'No se presenta ninguna distancia: los residuos son mayores de lo que permiten las incertidumbres declaradas.',
  'obs.ser.dist.withheld.negative':
    'No se presenta ninguna distancia: el paralaje es negativo en más de 3 veces su incertidumbre.',
  'obs.ser.dist.method': 'Método: {method}.',
  'obs.ser.method.profile':
    'verosimilitud perfilada del ajuste (una afirmación sobre datos repetidos, no una probabilidad)',
  'obs.ser.zp.relative':
    'Paralaje relativo: medido contra el sistema de referencia de las posiciones, no absoluto. No se aplicó ninguna corrección a absoluto. Un paralaje relativo es menor que el absoluto en el paralaje medio de las estrellas de referencia, así que la distancia que da nunca es menor que la verdadera si ese paralaje medio es positivo.',
  'obs.ser.zp.corrected':
    'Paralaje relativo más una corrección a absoluto que diste ({c} mas, de: {source}): el paralaje absoluto es tan bueno como esa corrección.',
  'obs.ser.assume.0':
    'El intervalo es un intervalo perfilado de un ajuste lineal por mínimos cuadrados con las incertidumbres declaradas: una afirmación sobre datos repetidos y no una probabilidad de la distancia.',
  'obs.ser.assume.1':
    'El intervalo de la distancia es la imagen del intervalo del paralaje por 1/paralaje, abierto por arriba cuando el intervalo llega a cero.',
  'obs.ser.assume.2':
    'Una sola distancia 1/paralaje no es una estimación insesgada: usa el intervalo.',
  'obs.ser.assume.3':
    'El paralaje es relativo al sistema de referencia: suma el paralaje medio de las estrellas de referencia, con su fuente, para hacerlo absoluto.',
  'obs.ser.resid': 'Residuos: observado menos ajustado',
  'obs.ser.rcol.n': 'Época',
  'obs.ser.rcol.jd': 'Fecha juliana (TDB)',
  'obs.ser.rcol.dx': 'Este (mas)',
  'obs.ser.rcol.dy': 'Norte (mas)',
  'obs.ser.rcol.zx': 'Este (sigma)',
  'obs.ser.rcol.zy': 'Norte (sigma)',
  'obs.ser.axis.x': 'Desplazamiento este',
  'obs.ser.axis.y': 'Desplazamiento norte',
  'obs.ser.axis.t': 'Días desde la primera época',
  'obs.ser.axis.dx': 'Residuo este',
  'obs.ser.model': 'Trayectoria ajustada',
  'obs.ser.plot.path':
    'Las posiciones en cada época como desplazamientos al este y al norte en segundos de arco, con la trayectoria ajustada',
  'obs.ser.plot.resid':
    'Los residuos al este y al norte en milisegundos de arco frente a los días desde la primera época',
  'obs.ser.csvCol.n': 'epoca',
  'obs.ser.csvCol.jd': 'jd_tdb',
  'obs.ser.csvCol.dx': 'este_segarco',
  'obs.ser.csvCol.dy': 'norte_segarco',
  'obs.ser.csvCol.zx': 'este_sigma',
  'obs.ser.csvCol.zy': 'norte_sigma',
  'obs.ser.ledgerEntry': 'Movimiento y paralaje de {title}',
  'obs.ser.q.x0': 'Desplazamiento este',
  'obs.ser.q.y0': 'Desplazamiento norte',
  'obs.ser.q.mux': 'Movimiento propio en ascensión recta',
  'obs.ser.q.muy': 'Movimiento propio en declinación',
  'obs.ser.q.parallax': 'Paralaje',
  'obs.ser.q.distance': 'Distancia',
};
