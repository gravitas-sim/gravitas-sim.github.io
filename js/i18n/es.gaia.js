// Las palabras de los paneles de astrometría de Gaia, en español (Prompt 233, Parte B). Los
// datos del primer panel son números que fija el estudiante, no una estrella; el segundo panel
// usa el paquete real de NGC 2420 y dice lo que quitan sus cortes. Texto fijo, se traduce por clave.
export const ES_GAIA = {
  'gaiaW.loading': 'cargando los datos de Gaia…',
  'gaiaW.none': 'ninguno',
  'gaiaW.off': 'desactivado',
  'gaiaW.on': 'activado',
  'gaiaW.d.title': 'De la paralaje a la distancia',
  'gaiaW.d.note':
    'Una paralaje mide 1 ÷ distancia, con un error. No es la distancia. Este panel dibuja la verosimilitud de cada distancia para los números que fijas. Su máximo es 1 ÷ la paralaje corregida y, sin una distribución previa, eso es todo lo que dice. Una distancia puntual necesita una paralaje corregida de al menos {n} veces su error. Activa la distribución previa para ver qué añade y qué supone. Los números los fijas tú: no es una estrella de Gaia.',
  'gaiaW.d.control.plx': 'Paralaje observada',
  'gaiaW.d.control.err': 'Error de la paralaje',
  'gaiaW.d.control.zp': 'Desfase del punto cero',
  'gaiaW.d.control.prior': 'Distribución previa de la distancia',
  'gaiaW.d.control.L': 'Longitud de escala de la previa',
  'gaiaW.d.control.range': 'Dibujar hasta',
  'gaiaW.d.control.mu': 'Movimiento propio',
  'gaiaW.d.prior.0': 'ninguna',
  'gaiaW.d.prior.1': 'densidad exponencialmente decreciente',
  'gaiaW.d.preset.good': 'Bien medida',
  'gaiaW.d.preset.low': 'Señal baja',
  'gaiaW.d.preset.negative': 'Paralaje negativa',
  'gaiaW.d.axis.x': 'Distancia, kpc',
  'gaiaW.d.axis.y': 'Verosimilitud relativa',
  'gaiaW.d.legend.likelihood': 'Verosimilitud',
  'gaiaW.d.legend.prior': 'Previa (escalada)',
  'gaiaW.d.legend.posterior': 'Posterior',
  'gaiaW.d.legend.interval': 'Intervalo, 68 por ciento',
  'gaiaW.d.row.input': 'La medición',
  'gaiaW.d.v.input':
    'Paralaje observada {p} mas, error {e} mas; desfase del punto cero aplicado: {z}.',
  'gaiaW.d.row.corrected': 'Paralaje corregida',
  'gaiaW.d.v.corrected':
    '{w} mas, error {s} mas: {k} veces su error (una distancia puntual necesita {n}).',
  'gaiaW.d.row.status': 'Qué respalda',
  'gaiaW.d.status.ok':
    'una distancia: la paralaje corregida es al menos {n} veces su error',
  'gaiaW.d.status.low-signal':
    'señal baja: la verosimilitud tiene un máximo, pero es ancha y abierta por el lado lejano; no es una distancia medida',
  'gaiaW.d.status.prior-dominated':
    'dominada por la previa: la respuesta sigue a la previa tanto como a la paralaje',
  'gaiaW.d.status.likelihood-only':
    'sin distancia: la paralaje corregida es cero o negativa, así que hay una verosimilitud y nada más',
  'gaiaW.d.row.distance': 'Distancia según la verosimilitud',
  'gaiaW.d.v.distance':
    '{d} kpc (1 ÷ {w} mas, el máximo de la verosimilitud); intervalo del 68 por ciento de {lo} a {hi} kpc.',
  'gaiaW.d.v.distanceOpen':
    '{d} kpc (1 ÷ {w} mas, el máximo de la verosimilitud); intervalo del 68 por ciento desde {lo} kpc hacia fuera, sin extremo lejano: la verosimilitud no baja a distancias grandes.',
  'gaiaW.d.v.noDistance':
    'Ninguna. Una paralaje corregida de {w} mas tiene una verosimilitud, dibujada arriba, y ninguna distancia: no descarta ninguna distancia grande y no da ninguna.',
  'gaiaW.d.row.posterior': 'Con la previa',
  'gaiaW.d.v.posterior':
    'Mediana posterior {m} kpc, moda {o} kpc, intervalo del 68 por ciento de colas iguales de {lo} a {hi} kpc, para una densidad espacial que decrece como exp(−r ÷ L) con L = {L} kpc (una previa de la distancia de r² exp(−r ÷ L), con máximo en 2 L). Cambia L y la respuesta se mueve.',
  'gaiaW.d.row.assumes': 'Qué supone',
  'gaiaW.d.assume.none':
    'Errores gaussianos de la paralaje del tamaño indicado y el punto cero que fijas. No dice nada sobre dónde están las estrellas.',
  'gaiaW.d.assume.edsd':
    'Las estrellas muestreadas tienen una densidad espacial que decrece como exp(−r ÷ L) a lo largo de la línea de visión, y la muestra es completa en las distancias dibujadas: ningún corte de magnitud ni de paralaje la reduce, y un corte cambia la previa (Astraatmadja y Bailer-Jones 2016; Bailer-Jones 2015).',
  'gaiaW.d.row.correction': 'Corrección',
  'gaiaW.d.v.correction':
    'Ninguna aparte del punto cero que fijas. No se aplica a ninguna muestra una corrección de Lutz y Kelker ni otra corrección global.',
  'gaiaW.d.row.velocity': 'Velocidad tangencial',
  'gaiaW.d.v.velocity':
    'Con {mu} mas/año: {v} km/s, intervalo de {lo} a {hi} km/s. Es la distancia y su intervalo multiplicados por {k} × {mu}.',
  'gaiaW.d.v.velocityOpen':
    'Con {mu} mas/año: {v} km/s, al menos {lo} km/s: el intervalo no tiene extremo lejano, así que la velocidad tampoco. Es la distancia y su intervalo multiplicados por {k} × {mu}.',
  'gaiaW.d.v.velocityNone':
    'Ninguna: una estrella sin distancia no tiene velocidad tangencial.',
  'gaiaW.s.title': 'Lo que Gaia conserva: NGC 2420',
  'gaiaW.s.note':
    'Las {n} estrellas de Gaia DR3 de NGC 2420 del paquete: G menor que 17,5, RUWE menor que 1,4, con paralaje y movimiento propio conocidos. Cada corte quita las estrellas que no lo cumplen, y el diagrama y la distancia son de las que quedan. Son miembros las estrellas cuyo movimiento propio por sí solo las pone en el cúmulo con probabilidad {p} o más, un contrato fijado antes de ver este resultado. La distancia lleva un punto cero por estrella y un recorte de {c} sigma, y ningún suelo sistemático, así que su intervalo es solo estadístico. No se usa el paquete del entorno solar: sus paralajes están redondeadas y no dan distancia.',
  'gaiaW.s.control.view': 'Imagen',
  'gaiaW.s.control.mag': 'Magnitud: conservar G menor que',
  'gaiaW.s.control.poe': 'Paralaje sobre error: conservar al menos',
  'gaiaW.s.control.ruwe': 'RUWE: conservar menor que',
  'gaiaW.s.control.zp': 'Punto cero por estrella',
  'gaiaW.s.view.0': 'color y magnitud',
  'gaiaW.s.view.1': 'velocidades',
  'gaiaW.s.preset.all': 'Sin cortes',
  'gaiaW.s.preset.bright': 'Solo estrellas brillantes',
  'gaiaW.s.preset.precise': 'Solo paralajes precisas',
  'gaiaW.s.preset.noZp': 'Sin punto cero',
  'gaiaW.s.axis.colour': 'BP − RP, color',
  'gaiaW.s.axis.g': 'Magnitud G (más brillante arriba)',
  'gaiaW.s.axis.vra': 'Velocidad según la ascensión recta, km/s',
  'gaiaW.s.axis.vdec': 'Velocidad según la declinación, km/s',
  'gaiaW.s.legend.members': 'Miembros conservados',
  'gaiaW.s.legend.others': 'Otras estrellas conservadas',
  'gaiaW.s.legend.removed': 'Quitadas por los cortes',
  'gaiaW.s.legend.velocity': 'Miembros conservados, a la distancia del cúmulo',
  'gaiaW.s.row.source': 'La muestra',
  'gaiaW.s.v.source':
    'NGC 2420, Gaia DR3 (paquete {v}): {n} estrellas. La consulta del propio paquete ya había descartado {d} estrellas con RUWE de 1,4 o más. Datos medidos, ESA/Gaia/DPAC, no comercial.',
  'gaiaW.s.row.cuts': 'Cortes activos',
  'gaiaW.s.v.noCuts': 'ninguno: se conserva toda estrella del paquete.',
  'gaiaW.s.cut.magnitude':
    'G menor que {x}: por sí solo quita {a} de {n} estrellas; de las que dejaron los cortes anteriores quita {r}',
  'gaiaW.s.cut.parallaxOverError':
    'paralaje sobre error de al menos {x}: por sí solo quita {a} de {n}; de las que dejaron los cortes anteriores quita {r}',
  'gaiaW.s.cut.ruwe':
    'RUWE menor que {x}: por sí solo quita {a} de {n}; de las que dejaron los cortes anteriores quita {r}',
  'gaiaW.s.row.kept': 'Estrellas que quedan',
  'gaiaW.s.v.kept':
    '{k} de {n}; {m} de ellas miembros; {u} usadas tras el recorte de {c} sigma.',
  'gaiaW.s.v.noMembers':
    '{k} de {n}; no queda ningún miembro del que tomar una distancia.',
  'gaiaW.s.row.parallax': 'Paralaje media de los miembros',
  'gaiaW.s.v.parallax':
    '{p} mas, error estadístico {e} mas; punto cero medio aplicado: {z}.',
  'gaiaW.s.row.distance': 'Distancia del cúmulo',
  'gaiaW.s.v.distance':
    '{d} kpc, intervalo estadístico de {lo} a {hi} kpc. No hay suelo sistemático: aquí no se conoce la incertidumbre del propio punto cero, así que este intervalo subestima el error.',
  'gaiaW.s.row.limit': 'No validada',
  'gaiaW.s.v.limit':
    'Esta distancia no se ha comparado con la distancia de un catálogo publicado: el tramo E1 de la validación NO SE EJECUTÓ, a la espera de la tabla que no pudo obtenerse.',
  'gaiaW.s.row.velocity': 'Velocidades tangenciales',
  'gaiaW.s.v.velocity':
    'A {d} kpc los miembros se mueven a ({a}, {b}) km/s en ascensión recta y declinación, con una dispersión de {sa} y {sb} km/s (con los errores de medida incluidos). El movimiento medio, {mu} mas/año, es {v} km/s, intervalo de {lo} a {hi} km/s (solo el intervalo estadístico de la distancia).',
  'gaiaW.s.row.zeroPoint': 'Punto cero',
  'gaiaW.s.v.zeroPointOn':
    'La corrección de Lindegren et al. (2021), por estrella, como reimplementación independiente; su propia incertidumbre no está incluida.',
  'gaiaW.s.v.zeroPointOff':
    'No aplicado: las paralajes son las del catálogo, que Lindegren et al. (2021) encuentran demasiado pequeñas en promedio.',
  'gaiaW.s.aria':
    'Diagrama color-magnitud o gráfica de velocidades de NGC 2420: {k} de {n} estrellas conservadas.',
};
