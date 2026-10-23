// =============================================================================
// Las palabras de la herramienta de coordenadas celestes, en español
// -----------------------------------------------------------------------------
// Registradas por js/observatory/imageCalibration.js al cargar la herramienta
// (por el traductor del Observatorio, `ctx.registerMessages`). Sin revisar por
// una persona hispanohablante fluida.
// =============================================================================

export const ES_IMAGECALIBRATION = {
  'obs.cal.intro':
    'Pon coordenadas celestes en esta imagen a partir de estrellas que sepas nombrar. Da al menos tres estrellas de referencia: dónde está cada una en la imagen (en píxeles, 1 en el centro del primer píxel, y hacia arriba) y dónde está en el cielo. La herramienta ajusta una proyección sobre el plano tangente con una escala, un giro y, si lo permites, una inclinación, y muestra lo que sobra.',
  'obs.cal.limits':
    'Es un ajuste lineal sin términos de distorsión, así que sirve para un campo de unos pocos grados o menos; un campo ancho o una imagen distorsionada se notarán en los residuos. La lectura de una posición con él vale lo que valgan las estrellas que lo fijan.',
  'obs.cal.table': 'Estrellas de referencia',
  'obs.cal.col.name': 'Estrella',
  'obs.cal.col.x': 'x (píxeles)',
  'obs.cal.col.y': 'y (píxeles)',
  'obs.cal.col.ra': 'Ascensión recta',
  'obs.cal.col.dec': 'Declinación',
  'obs.cal.col.sigma': 'Incertidumbre en píxeles',
  'obs.cal.col.remove': 'Quitar',
  'obs.cal.cell': 'Estrella {n}: {field}',
  'obs.cal.remove': 'Quitar',
  'obs.cal.removeStar': 'Quitar la estrella {n}',
  'obs.cal.removed': 'Estrella {n} quitada.',
  'obs.cal.cleared': 'Las estrellas de referencia se han borrado.',
  'obs.cal.add': 'Añadir una estrella',
  'obs.cal.marks': 'Usar mis marcas de punto',
  'obs.cal.lookup': 'Buscar posiciones por nombre',
  'obs.cal.clear': 'Borrar las estrellas',
  'obs.cal.solve': 'Resolver',
  'obs.cal.keep': 'Guardar en el registro',
  'obs.cal.coordsLabel': 'Las posiciones se escriben en',
  'obs.cal.coords.deg': 'grados',
  'obs.cal.coords.hms': 'horas y grados (hh mm ss, dd mm ss)',
  'obs.cal.modelLabel': 'Modelo',
  'obs.cal.model.affine': 'dos escalas, un giro y una inclinación',
  'obs.cal.model.similarity': 'una escala y un giro',
  'obs.cal.parityLabel': 'Orientación',
  'obs.cal.parity.-1': 'este a la izquierda con el norte arriba',
  'obs.cal.parity.1': 'en espejo: este a la derecha con el norte arriba',
  'obs.cal.parity.standard': 'este a la izquierda con el norte arriba',
  'obs.cal.parity.mirrored': 'en espejo: este a la derecha con el norte arriba',
  'obs.cal.tangentRa': 'Posición de referencia, ascensión recta (opcional)',
  'obs.cal.tangentDec': 'Posición de referencia, declinación (opcional)',
  'obs.cal.epoch':
    'Origen y época de las posiciones escritas (para el registro)',
  'obs.cal.noMarks':
    'No hay marcas de punto en esta imagen. Pon algunas antes en el panel de marcas.',
  'obs.cal.marksAdded':
    'Hay {n} marcas de punto en la tabla. Escribe dónde está cada estrella en el cielo, o búscalas por nombre.',
  'obs.cal.lookupNone':
    'Pon el nombre de una estrella en una fila, y deja vacía su posición en el cielo, para buscarla.',
  'obs.cal.lookupDone':
    '{found} posiciones buscadas en el catálogo de estrellas brillantes.',
  'obs.cal.lookupSome':
    '{found} posiciones buscadas; no se encontró, o no es una sola estrella: {missing}.',
  'obs.cal.lookupFailed':
    'No se pudo obtener el catálogo de estrellas brillantes. Escribe las posiciones.',
  'obs.cal.refuse.cell':
    'Estrella {n}: {field} no es un número que la herramienta pueda leer.',
  'obs.cal.refuse.tangent':
    'La posición de referencia debe ser una ascensión recta y una declinación, o las dos vacías.',
  'obs.cal.refuse.too-few':
    'Sin determinar: {n} estrellas son pocas. Hacen falta al menos {min} para poner coordenadas celestes en una imagen.',
  'obs.cal.refuse.collinear':
    'Sin determinar: las estrellas están sobre una recta (su dispersión transversal es el {pct} por ciento de la dispersión a lo largo, y se necesita al menos el {min} por ciento). Una fila de estrellas no puede fijar la escala ni el giro en la dirección transversal.',
  'obs.cal.refuse.too-wide':
    'Sin determinar: la estrella {id} está a más de {deg} grados de la posición de referencia. Un plano tangente no describe un campo tan ancho.',
  'obs.cal.refuse.too-wide-all':
    'Sin determinar: las estrellas están repartidas por tanto cielo que ningún plano tangente las describe.',
  'obs.cal.refuse.malformed':
    'Sin determinar: la estrella {id} tiene una posición o una incertidumbre que no es un número utilizable.',
  'obs.cal.refuse.duplicate':
    'Sin determinar: las estrellas {a} y {b} están en el mismo píxel.',
  'obs.cal.refuse.singular':
    'Sin determinar: las estrellas no fijan a la vez una escala y un giro.',
  'obs.cal.solution': 'La solución',
  'obs.cal.res.ref': 'Posición de referencia',
  'obs.cal.res.pix': 'Píxel de referencia',
  'obs.cal.res.scale': 'Escala, segundos de arco por píxel',
  'obs.cal.res.pa': 'Ángulo de posición del eje +y, grados al este del norte',
  'obs.cal.res.parity': 'Orientación',
  'obs.cal.res.skew':
    'Inclinación de los ejes respecto de un ángulo recto, grados',
  'obs.cal.res.fit': 'Lo que sobra',
  'obs.cal.res.fitValue':
    'residuo cuadrático medio de {n} estrellas: {rms} píxeles ({arcsec} segundos de arco)',
  'obs.cal.residuals': 'Residuos de las estrellas de referencia',
  'obs.cal.rcol.star': 'Estrella',
  'obs.cal.rcol.dx': 'Residuo en x (píxeles)',
  'obs.cal.rcol.dy': 'Residuo en y (píxeles)',
  'obs.cal.rcol.pix': 'Residuo (píxeles)',
  'obs.cal.rcol.arcsec': 'Residuo (segundos de arco)',
  'obs.cal.verdict.consistent':
    'Los residuos son coherentes con las incertidumbres indicadas (chi cuadrado {chi2} con {dof} grados de libertad, p = {p}).',
  'obs.cal.verdict.inconsistent':
    'Los residuos son demasiado grandes para las incertidumbres indicadas (chi cuadrado {chi2} con {dof} grados de libertad, p = {p}). Comprueba que cada estrella corresponde a su entrada del catálogo, y las posiciones en píxeles.',
  'obs.cal.verdict.exact':
    'Las estrellas fijan los números exactamente: no queda ningún grado de libertad, así que los residuos son cero y nada comprueba la correspondencia. Añade estrellas para comprobarla.',
  'obs.cal.verdictShort.consistent': 'coherente',
  'obs.cal.verdictShort.inconsistent':
    'incoherente, revisa las correspondencias',
  'obs.cal.verdictShort.exact': 'determinada exactamente, sin comprobación',
  'obs.cal.solved': 'Resuelta con {n} estrellas: {verdict}.',
  'obs.cal.sigmaAssumed':
    'A las estrellas sin incertidumbre en píxeles se les supuso una posición de {sigma} píxel, lo cual es una suposición.',
  'obs.cal.headerCheck.consistent':
    'La cabecera de la propia imagen también encaja con estas estrellas (residuo cuadrático medio {rms} píxeles).',
  'obs.cal.headerCheck.inconsistent':
    'La cabecera de la propia imagen no encaja con estas estrellas (residuo cuadrático medio {rms} píxeles): la cabecera, las correspondencias o las posiciones en píxeles son erróneas.',
  'obs.cal.header.none':
    'Esta imagen no trae coordenadas del mundo en su cabecera, así que las coordenadas celestes salen de estrellas de referencia.',
  'obs.cal.header.ok':
    'La cabecera de la imagen da una proyección sobre el plano tangente alrededor de {pos}, {scale} segundos de arco por píxel, ángulo de posición {pa} grados, {parity}. Es la de la cabecera, no se ha resuelto aquí.',
  'obs.cal.header.use': 'Usar las coordenadas de la cabecera',
  'obs.cal.header.used': 'Se usan las coordenadas de la cabecera.',
  'obs.cal.header.notSolved':
    'Son las coordenadas de la cabecera, leídas y no resueltas aquí: no hay residuos. Resuelve con estrellas de referencia para medir cuánto encajan.',
  'obs.cal.header.display-only':
    'Esta imagen es solo para mostrar: sus píxeles se han estirado o recodificado, así que no se ofrecen coordenadas celestes para ella.',
  'obs.cal.header.axes':
    'La cabecera nombra {names}: solo se leen ascensión recta y declinación, en ese orden, así que no se usan las coordenadas de la cabecera.',
  'obs.cal.header.projection':
    'La cabecera usa la proyección {name}. Solo se lee TAN, así que no se usan las coordenadas de la cabecera.',
  'obs.cal.header.distortion':
    'La cabecera lleva una distorsión {name}, que aquí no se aplica, así que no se usan las coordenadas de la cabecera.',
  'obs.cal.header.incomplete':
    'Las coordenadas del mundo de la cabecera están incompletas, así que no se usan.',
  'obs.cal.header.singular':
    'La matriz de la cabecera es singular, así que no se usan sus coordenadas.',
  'obs.cal.px': 'Píxel x',
  'obs.cal.py': 'Píxel y',
  'obs.cal.toSky': 'Mostrar la posición en el cielo',
  'obs.cal.skyRa': 'Ascensión recta',
  'obs.cal.skyDec': 'Declinación',
  'obs.cal.toPixel': 'Mostrar el píxel',
  'obs.cal.needPixel': 'Resuelve primero y da después una x y una y.',
  'obs.cal.needSky':
    'Resuelve primero y da después una ascensión recta y una declinación en la forma elegida arriba.',
  'obs.cal.pixelAt': 'Píxel x {x}, y {y}.',
  'obs.cal.pixelOutside': 'Píxel x {x}, y {y}: fuera de la imagen.',
  'obs.cal.nothing': 'No hay solución que guardar. Resuelve primero.',
  'obs.cal.ledgerEntry': 'Coordenadas celestes de {title}',
  'obs.cal.kept': 'Guardado en el registro: {n} magnitudes.',
  'obs.cal.keepFailed': 'No se pudo guardar: {why}.',
  'obs.cal.replay.invalid': 'La calibración guardada no se puede leer.',
  'obs.cal.replay.image-changed':
    'La calibración guardada se hizo con otros píxeles, así que no se usa.',
  'obs.cal.replay.differs':
    'Al resolver de nuevo con las estrellas guardadas, los números difieren de los guardados.',
  'obs.cal.q.crval.ra': 'Posición de referencia, ascensión recta',
  'obs.cal.q.crval.dec': 'Posición de referencia, declinación',
  'obs.cal.q.crpix.x': 'Píxel de referencia, x',
  'obs.cal.q.crpix.y': 'Píxel de referencia, y',
  'obs.cal.q.scale': 'Escala, segundos de arco por píxel',
  'obs.cal.q.rotation': 'Ángulo de posición del eje +y, al este del norte',
  'obs.cal.q.skew': 'Inclinación de los ejes respecto de un ángulo recto',
  'obs.cal.q.axisRatio': 'Escala en x entre escala en y',
  'obs.cal.q.centre.ra': 'Ascensión recta del centro de la imagen',
  'obs.cal.q.centre.dec': 'Declinación del centro de la imagen',
  'obs.cal.q.rms': 'Residuo cuadrático medio de las estrellas de referencia',
  'obs.cal.q.chi2': 'Chi cuadrado de los residuos',
  'obs.cal.q.dof': 'Grados de libertad',
};
