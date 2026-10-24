// =============================================================================
// Las palabras de las herramientas de órbita y trayectoria, en español
// -----------------------------------------------------------------------------
// Las registra js/observatory/imageOrbit.js cuando las herramientas se abren por
// primera vez (con el traductor del Observatorio), de modo que ninguna otra
// página las carga. Identificadores obs.orb.*; el título del desplegable está en
// es.observatory.js (está en la página antes de que se carguen las herramientas).
// Sin leer por un hablante fluido.
// =============================================================================

export const ES_IMAGEORBIT = {
  'obs.orb.help':
    'Dos herramientas sobre una tabla que escribes o pegas. La herramienta de órbita ajusta las posiciones relativas de una estrella binaria visual en varias épocas, como una órbita circular vista de forma oblicua o como una órbita kepleriana completa (elementos de Thiele-Innes), y dice «no restringido», con el motivo, cuando el arco es demasiado corto para sostenerla. La herramienta de trayectoria encuentra un objeto en movimiento entre las fuentes fijas de varias imágenes y mide su velocidad y su ángulo de posición. No se envía nada a ningún sitio.',
  'obs.orb.mode': 'Herramienta',
  'obs.orb.mode.orbit': 'Órbita de una estrella binaria',
  'obs.orb.mode.track': 'Trayectoria de un objeto en movimiento',
  'obs.orb.depth': 'Modelo de órbita',
  'obs.orb.depth.elliptical': 'Elíptica (elementos de Thiele-Innes)',
  'obs.orb.depth.circular': 'Circular, vista de forma oblicua',
  'obs.orb.input': 'Posiciones dadas como',
  'obs.orb.input.offsets': 'Desplazamientos norte y este (arcsec)',
  'obs.orb.input.polar': 'Separación (arcsec) y ángulo (grados)',
  'obs.orb.epochFormat': 'Época dada como',
  'obs.orb.fmt.year': 'Año juliano',
  'obs.orb.fmt.byear': 'Año besseliano',
  'obs.orb.fmt.jd': 'Fecha juliana (JD)',
  'obs.orb.fmt.mjd': 'Fecha juliana modificada (MJD)',
  'obs.orb.scale': 'Escala de tiempo',
  'obs.orb.scale.utc': 'UTC',
  'obs.orb.scale.tt': 'TT',
  'obs.orb.scale.tdb': 'TDB',
  'obs.orb.coords': 'Posiciones dadas como',
  'obs.orb.coords.offsets': 'Desplazamientos este y norte (arcsec)',
  'obs.orb.coords.sky': 'Ascensión recta y declinación (grados)',
  'obs.orb.data': 'Tabla que ajustar',
  'obs.orb.dataHelp.orbit':
    'Una época por línea, separada por espacios, tabuladores o punto y coma (en inglés también por comas): la época, luego los desplazamientos norte y este y su incertidumbre (arcsec), o la separación, el ángulo desde el norte hacia el este y la incertidumbre de cada uno. Las líneas que empiezan por # se ignoran.',
  'obs.orb.dataHelp.track':
    'Una detección por línea: la época de su imagen, luego las dos coordenadas y la incertidumbre (arcsec; para posiciones en el cielo, en grados y segundos de arco). Las detecciones con la misma época forman una imagen. Las líneas que empiezan por # se ignoran.',
  'obs.orb.plx': 'Paralaje (mas, opcional)',
  'obs.orb.plxSigma': 'Su incertidumbre (mas)',
  'obs.orb.frame': 'El paralaje es',
  'obs.orb.frame.relative': 'relativo a estrellas de referencia',
  'obs.orb.frame.absolute': 'absoluto (corregido)',
  'obs.orb.source': 'Fuente de la corrección (solo si es absoluto)',
  'obs.orb.fit': 'Ajustar la órbita',
  'obs.orb.find': 'Buscar el objeto en movimiento',
  'obs.orb.example': 'Cargar un ejemplo sintético',
  'obs.orb.csv': 'Guardar los residuos como CSV',
  'obs.orb.keep': 'Guardar en el registro',
  'obs.orb.limits':
    'Límites. Una órbita visual a partir solo de astrometría relativa deja el nodo ascendente ambiguo en 180 grados, así que el nodo se da entre 0 y 180 y el argumento se desplaza en consecuencia. La órbita se ajusta solo cuando el arco cubre bastante del periodo (al menos 0,4 para una órbita circular y 0,5 para una elíptica, en el valor superior de dos sigmas del periodo), los parámetros no están casi degenerados, el periodo está acotado por ambos lados, ningún otro periodo ajusta igual de bien y los residuos concuerdan con las incertidumbres dadas. Se probó con 12 épocas y un ruido del 2 por ciento; otros casos no los cubre esa prueba. Sin perturbaciones, tiempo de viaje de la luz ni movimiento propio relativo. Una trayectoria es una velocidad y un ángulo y nada más: tres posiciones en un arco corto no dan una órbita.',
  'obs.orb.elements': 'La órbita',
  'obs.orb.col.name': 'Elemento',
  'obs.orb.col.value': 'Valor e incertidumbre',
  'obs.orb.col.unit': 'Unidad',
  'obs.orb.el.P': 'Periodo',
  'obs.orb.el.a': 'Semieje mayor',
  'obs.orb.el.e': 'Excentricidad',
  'obs.orb.el.i': 'Inclinación',
  'obs.orb.el.Omega': 'Nodo ascendente (0 a 180)',
  'obs.orb.el.omega': 'Argumento del periastro',
  'obs.orb.el.latitude': 'Argumento de la latitud en la época de referencia',
  'obs.orb.el.T': 'Época del periastro',
  'obs.orb.u.yr': 'años',
  'obs.orb.u.mas': 'mas',
  'obs.orb.u.deg': 'grados',
  'obs.orb.u.year': 'año',
  'obs.orb.u.arcsecHour': 'arcsec por hora',
  'obs.orb.eLimit': 'menor que {e} (95 por ciento)',
  'obs.orb.period':
    'Intervalo del periodo por el perfil de chi cuadrado: de {lo} a {hi} años (68,27 por ciento), de {lo95} a {hi95} años (95 por ciento).',
  'obs.orb.criterion':
    'El arco cubre {have} del periodo en su valor superior de dos sigmas (se necesita {need}); el número de condición de la matriz normal es {kappa} (como máximo {max}); chi cuadrado {chi2} con {dof} grados de libertad, probabilidad {p}.',
  'obs.orb.ecc.detected':
    'Se detecta la excentricidad: el modelo elíptico mejora el chi cuadrado en {d} respecto del circular.',
  'obs.orb.ecc.none':
    'No se detecta la excentricidad (el modelo elíptico mejora el chi cuadrado solo en {d}), así que se muestra la órbita circular, con un límite superior de la excentricidad y sin periastro.',
  'obs.orb.ecc.circular': 'Se ajustó una órbita circular, como se eligió.',
  'obs.orb.node':
    'Sin velocidades radiales no se puede distinguir el nodo ascendente del descendente: el nodo se da entre 0 y 180 grados y el argumento se desplaza en consecuencia. La suma de masas no depende de la elección.',
  'obs.orb.mass':
    'Suma de masas por la tercera ley de Kepler: {m} masas solares, de {lo} a {hi} (68,27 por ciento) y de {lo95} a {hi95} (95 por ciento), con una simulación de Monte Carlo con semilla del paralaje y de la órbita.',
  'obs.orb.frameStatement.relative':
    'El paralaje es relativo a las estrellas de referencia de su marco, y es menor que el paralaje absoluto en su paralaje medio: la distancia y la suma de masas salen más altas en esa medida.',
  'obs.orb.frameStatement.absolute':
    'El paralaje es absoluto, corregido según «{source}»; la corrección y su incertidumbre están en el paralaje dado.',
  'obs.orb.no.mass.parallax':
    'Sin suma de masas: necesita un paralaje positivo y su incertidumbre.',
  'obs.orb.no.mass.parallax-weak':
    'Sin suma de masas: el paralaje es solo {snr} veces su incertidumbre y la suma de masas necesita al menos {need}.',
  'obs.orb.no.mass.frame':
    'Sin suma de masas: un paralaje necesita la declaración de su marco de referencia, y un paralaje absoluto necesita la fuente de su corrección.',
  'obs.orb.no.mass.no-orbit': 'Sin suma de masas: no hay órbita.',
  'obs.orb.trackParams': 'El objeto en movimiento',
  'obs.orb.rate': 'Velocidad de movimiento',
  'obs.orb.pa': 'Ángulo de posición (del norte hacia el este)',
  'obs.orb.trackFit':
    'Encontrado en {n} imágenes entre {s} fuentes fijas, moviéndose a {sig} veces la incertidumbre de su velocidad; chi cuadrado {chi2} con {dof} grados de libertad, probabilidad {p}.',
  'obs.orb.paLocal':
    'El ángulo es el local en el cielo en el objeto; el del plano tangente difiere por la convergencia de los meridianos (menos de 0,01 grados en un campo de unos minutos de arco).',
  'obs.orb.paPlane':
    'El ángulo se mide en el plano de los desplazamientos dados, desde su norte.',
  'obs.orb.resid': 'Residuos',
  'obs.orb.rcol.n': 'Fila',
  'obs.orb.rcol.year': 'Época (año)',
  'obs.orb.rcol.dx': 'Residuo norte (mas)',
  'obs.orb.rcol.dy': 'Residuo este (mas)',
  'obs.orb.rcol.zx': 'Norte, en sigmas',
  'obs.orb.rcol.zy': 'Este, en sigmas',
  'obs.orb.csvCol.n': 'fila',
  'obs.orb.csvCol.year': 'época (año)',
  'obs.orb.csvCol.x': 'norte (arcsec)',
  'obs.orb.csvCol.y': 'este (arcsec)',
  'obs.orb.csvCol.dx': 'residuo norte (arcsec)',
  'obs.orb.csvCol.dy': 'residuo este (arcsec)',
  'obs.orb.csvCol.zx': 'residuo norte (sigma)',
  'obs.orb.csvCol.zy': 'residuo este (sigma)',
  'obs.orb.axis.east': 'Desplazamiento al este',
  'obs.orb.axis.north': 'Desplazamiento al norte',
  'obs.orb.axis.t': 'Años desde la primera época',
  'obs.orb.axis.dx': 'Residuo norte',
  'obs.orb.axis.dy': 'Residuo este',
  'obs.orb.model': 'Órbita ajustada',
  'obs.orb.plot.orbit':
    'Las posiciones medidas y la órbita aparente ajustada, este frente a norte',
  'obs.orb.plot.track':
    'Las posiciones del objeto en movimiento y su recta ajustada, este frente a norte',
  'obs.orb.plot.resid': 'Residuos del ajuste frente al tiempo',
  'obs.orb.said.fitted': 'Órbita ajustada a {n} épocas.',
  'obs.orb.said.found': 'Se encontró un objeto en movimiento.',
  'obs.orb.said.csv': 'Se guardaron {n} filas como CSV.',
  'obs.orb.said.kept': 'Guardado en el registro.',
  'obs.orb.said.keepFailed': 'No se guardó: {why}',
  'obs.orb.said.example.orbit':
    'Se cargó una binaria sintética: 12 épocas de una órbita hecha por un programa a partir de elementos conocidos (a 0,9 arcsec, e 0,45, i 62, nodo 35, omega 110 grados, periodo 14,2 años, ruido de 15 mas), con un paralaje sintético de 100 mas.',
  'obs.orb.said.example.track':
    'Se cargó un campo sintético: 5 imágenes de 7 fuentes fijas y un objeto en movimiento (0,8 arcsec por hora a 60 grados, ruido de 40 mas), hecho por un programa.',
  'obs.orb.ledgerEntry.orbit': 'Órbita de una estrella binaria',
  'obs.orb.ledgerEntry.track': 'Trayectoria de un objeto en movimiento',
  'obs.orb.q.P': 'Periodo',
  'obs.orb.q.a': 'Semieje mayor',
  'obs.orb.q.e': 'Excentricidad',
  'obs.orb.q.i': 'Inclinación',
  'obs.orb.q.Omega': 'Nodo ascendente',
  'obs.orb.q.omega': 'Argumento',
  'obs.orb.q.T': 'Época del periastro',
  'obs.orb.q.mass': 'Suma de masas',
  'obs.orb.q.rate': 'Velocidad',
  'obs.orb.q.pa': 'Ángulo de posición',
  'obs.orb.no.paste':
    'La tabla no sirve: cada línea necesita al menos {n} números (revisa los separadores y la marca decimal).',
  'obs.orb.no.no-frames': 'No hay imágenes.',
  'obs.orb.no.bad-series': 'La tabla no tiene épocas.',
  'obs.orb.no.bad-epoch': 'La fila {row} no tiene una época utilizable.',
  'obs.orb.no.bad-position': 'La fila {row} no tiene una posición utilizable.',
  'obs.orb.no.bad-sigma':
    'La fila {row} necesita incertidumbres positivas (y una correlación entre -1 y 1).',
  'obs.orb.no.bad-source':
    'Una fuente no tiene una posición utilizable o queda demasiado lejos del centro del campo.',
  'obs.orb.no.span': 'Las épocas deben abarcar al menos un día.',
  'obs.orb.no.depth': 'Elige una órbita circular o una elíptica.',
  'obs.orb.no.too-many': 'La tabla es demasiado grande.',
  'obs.orb.no.too-large':
    'Las imágenes tienen demasiadas fuentes para buscar una trayectoria.',
  'obs.orb.no.epochs':
    'No restringido: una órbita de este tipo necesita al menos {need} épocas y hay {n}.',
  'obs.orb.no.coverage':
    'No restringido: el arco cubre demasiado poco del periodo. En el valor superior de dos sigmas del periodo cubre {have} de él, y esta órbita necesita {need}. Observa durante más tiempo, o pide una órbita circular si el sistema lo es.',
  'obs.orb.no.conditioning':
    'No restringido: en este arco los parámetros se compensan entre sí (el número de condición de la matriz normal es {kappa}, por encima de {max}).',
  'obs.orb.no.period-unbounded':
    'No restringido: los datos no acotan el periodo por ninguno de los dos lados o solo por uno, así que no se da ningún periodo.',
  'obs.orb.no.period-ambiguous':
    'No restringido: otro periodo, {alt} años, ajusta las épocas igual de bien, así que los datos no pueden elegir entre ellos. Lo causa una cadencia regular; añade épocas en otros intervalos.',
  'obs.orb.no.inconsistent':
    'No restringido: los residuos no concuerdan con las incertidumbres dadas (probabilidad {p}). El modelo no describe los datos (prueba el otro modelo), o las incertidumbres son demasiado pequeñas.',
  'obs.orb.no.record': 'Este no es un registro de esta herramienta.',
  'obs.orb.no.too-few-frames':
    'Una trayectoria necesita al menos 3 imágenes; hay {n}.',
  'obs.orb.no.no-mover':
    'Ningún objeto en movimiento: ninguna fuente se mueve más de 5 veces la incertidumbre de su velocidad (se encontraron {static} fuentes fijas).',
  'obs.orb.no.several-movers':
    '{movers} fuentes se mueven, así que no se elige ninguna. Quita una de la tabla para medir la otra.',
};
