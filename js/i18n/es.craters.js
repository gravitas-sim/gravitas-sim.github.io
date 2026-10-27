// Las palabras de los instrumentos de cráteres, en español (Prompt 195).
// Las mismas claves que en.craters.js; sin revisar por un hablante nativo.
export const ES_CRATERS = {
  'crW.on': 'sí',
  'crW.off': 'no',
  'crW.loading': 'La imagen se está cargando.',
  'crW.failed': 'No se pudo cargar la imagen o las listas.',
  'crW.row.how': 'Estado',
  'crW.row.picture': 'La imagen',
  'crW.row.source': 'De dónde vienen los cráteres',
  'crW.row.assumes': 'Lo que deja fuera',
  'crW.region.moon-highland': 'Tierras altas lunares',
  'crW.region.moon-mare': 'Mar lunar',
  'crW.region.mars-highland': 'Tierras altas de Marte',
  'crW.region.mars-plains': 'Llanuras de Marte',
  'crW.source.moon':
    'El catálogo LU78287GT (Salamuniccar y otros 2013), hecho por sus autores a partir de datos lunares; la imagen es el mapa de Clementine. No son marcas sobre esta imagen.',
  'crW.source.mars':
    'La base de datos de Robbins (Robbins y Hynek 2012), hecha por sus autores a partir de datos de Marte; la imagen es el mapa en color de Viking, 1 km por píxel. No son marcas sobre esta imagen.',
  'crW.alt.moon-highland':
    'Un mapa de Clementine de las tierras altas del sur de la Luna, de 350 por 200 píxeles a 2,02 km por píxel: terreno claro y accidentado, lleno de cráteres que se solapan. {n} círculos marcan los cráteres del catálogo de al menos {dmin} km de diámetro.',
  'crW.alt.moon-mare':
    'Un mapa de Clementine del Mar de la Tranquilidad y sus bordes, de 325 por 223 píxeles a 2,02 km por píxel: terreno oscuro y liso con pocos cráteres grandes. {n} círculos marcan los cráteres del catálogo de al menos {dmin} km de diámetro.',
  'crW.alt.mars-highland':
    'Un mapa en color de Viking de Terra Sabaea, unas tierras altas de Marte, de 713 por 712 píxeles a 1 km por píxel: terreno densamente craterizado. {n} círculos marcan los cráteres del catálogo de al menos {dmin} km de diámetro.',
  'crW.alt.mars-plains':
    'Un mapa en color de Viking de Elysium Planitia, unas llanuras de lava jóvenes, de 712 por 712 píxeles a 1 km por píxel: terreno liso con pocos cráteres. {n} círculos marcan los cráteres del catálogo de al menos {dmin} km de diámetro.',
  'crW.refused.below-completeness':
    'Sin comparación: esto queda por debajo de los {km} km a partir de los cuales el recuento es completo',
  'crW.refused.below-resolution':
    'Sin comparación: un cráter tan pequeño abarca demasiados pocos píxeles para colocarlo',
  'crW.refused.not-constrained':
    'Sin comparación: ninguna de las dos regiones tiene un cráter tan grande',
  'crW.refused.too-few':
    'Sin ajuste: menos de 5 cráteres de al menos este tamaño ({n} aquí), o todos del mismo tamaño',
  'crW.refused.diameter': 'Sin diámetro: no se puede medir el círculo',
  // crater-regions
  'crW.r.title': '¿Cuál de dos superficies tiene más cráteres por área?',
  'crW.r.note':
    'Dos regiones de un mismo mundo, contadas por los autores de un catálogo: los círculos son suyos y nadie ha marcado estas imágenes. Elige el diámetro a partir del cual contar y lee la densidad de cada región con su intervalo y el cociente de las dos con su intervalo. Un cociente de densidades no es una edad en años.',
  'crW.r.control.pair': 'Mundo',
  'crW.r.control.view': 'Imagen de',
  'crW.r.control.dmin': 'Contar cráteres de al menos',
  'crW.r.control.circles': 'Los círculos del catálogo',
  'crW.pair.0': 'Luna',
  'crW.pair.1': 'Marte',
  'crW.view.0': 'la región de aspecto más antiguo',
  'crW.view.1': 'la otra región',
  'crW.r.row.region': '{region}',
  'crW.r.value.region':
    '{n} cráteres de al menos {dmin} km de diámetro en {area} mil km²: {density} por millón de km² (95 por ciento: {iv})',
  'crW.value.interval': '{lo} a {hi}',
  'crW.r.row.ratio': 'Cociente de densidades, la primera entre la segunda',
  'crW.r.value.ratio': '{r} (95 por ciento: {lo} a {hi})',
  'crW.r.value.noratio':
    'indefinido: la segunda región no tiene ninguno; el cociente es al menos {lo}',
  'crW.r.row.verdict': 'Lo que dice el intervalo',
  'crW.r.verdict.a':
    '{a} tiene la densidad más alta, y el intervalo excluye el 1',
  'crW.r.verdict.b':
    '{b} tiene la densidad más alta, y el intervalo excluye el 1',
  'crW.r.verdict.none':
    'ninguna diferencia significativa: el intervalo contiene el 1, así que estos recuentos no pueden distinguir las dos',
  'crW.r.assumes':
    'una edad en años; una misma función de producción para las dos superficies; la saturación, la renovación parcial de la superficie o los cráteres secundarios (muchos cráteres pequeños hechos a la vez por un solo impacto grande); lo que queda por debajo del diámetro a partir del cual el recuento es completo; la incertidumbre de las áreas, que no está en el intervalo',
  // crater-sfd
  'crW.s.title': '¿Cuántos cráteres hay de al menos este tamaño, por área?',
  'crW.s.note':
    'El gráfico acumulado de tamaño y frecuencia del catálogo de una región: para cada diámetro D, el número de cráteres de al menos ese tamaño por millón de km², con un intervalo de Poisson del 95 por ciento en cada punto. Una línea discontinua es la ley de potencias ajustada por encima del diámetro que elijas. «Un recuento que se queda corto» deja fuera los cráteres más pequeños por debajo del límite de completitud, como lo haría un recuento de la imagen.',
  'crW.s.control.region': 'Región',
  'crW.s.control.dmin': 'Ajustar cráteres de al menos',
  'crW.s.control.miss':
    'Un recuento que se queda corto: los más pequeños omitidos',
  'crW.s.legend.counted': 'Contados (completos)',
  'crW.s.legend.under': 'Por debajo del límite de completitud',
  'crW.s.legend.fit': 'Ley de potencias, índice {b}',
  'crW.s.axis.x': 'Diámetro D (km, escala logarítmica)',
  'crW.s.axis.y':
    'Cráteres de al menos D, por millón de km² (escala logarítmica)',
  'crW.s.row.list': 'La lista',
  'crW.s.value.list':
    '{n} de los {all} cráteres del catálogo de al menos 20 km de diámetro, en {area} mil km²',
  'crW.s.row.limit': 'Límite de completitud',
  'crW.s.value.limit':
    '{km} km, fijado para esta imagen: el recuento se toma como completo de ahí hacia arriba, y no por debajo',
  'crW.s.row.missed': 'Omitidos',
  'crW.s.value.missed':
    'los {k} más pequeños de los {of} cráteres de menos de {km} km: un recuento que se queda corto, hecho con la lista publicada',
  'crW.s.row.warn': 'Aviso',
  'crW.s.value.warn':
    'el ajuste empieza en {dmin} km, por debajo del límite de completitud de {km} km: el índice no es fiable',
  'crW.s.row.n': 'Cráteres en el ajuste',
  'crW.s.value.n': '{n} cráteres de al menos {dmin} km de diámetro',
  'crW.s.row.index': 'Índice acumulado b, N(≥D) ∝ D⁻ᵇ',
  'crW.s.value.index': '{b} (95 por ciento: {lo} a {hi})',
  'crW.s.row.unbiased': 'Índice, forma insesgada (n − 1) / S',
  'crW.s.row.constancy': '¿Es la misma la pendiente más arriba?',
  'crW.s.value.constancy.ok':
    'Por encima de {d2} km el índice es {b2} (z = {z}): coherente con una sola pendiente',
  'crW.s.value.constancy.flag':
    'Por encima de {d2} km el índice es {b2} (z = {z}): la pendiente no es constante, así que hay un quiebre, una caída o una mezcla de poblaciones en el ajuste',
  'crW.s.value.constancy.none':
    'No se ha ejecutado: menos de 5 cráteres por encima de {d2} km',
  'crW.s.assumes':
    'una caída a diámetros pequeños (incompletitud o saturación) no se corrige; una sola ley de potencias por encima del diámetro elegido; cráteres independientes (los secundarios agrupados rompen los intervalos); una edad en años',
  // crater-budget
  'crW.b.title': '¿Qué diámetro tiene este cráter y con cuánta seguridad?',
  'crW.b.note':
    'Las tierras altas del sur de la Luna, un mapa de Clementine. Tu círculo tiene un centro y un punto del borde; el instrumento convierte su radio en kilómetros con la escala del mapa, corrige la vista si lo permites y da el diámetro con los cuatro términos de su incertidumbre. Se pueden mostrar los círculos del catálogo para comparar.',
  'crW.b.control.cx': 'Centro, a lo ancho',
  'crW.b.control.cy': 'Centro, hacia abajo',
  'crW.b.control.r': 'Punto del borde, distancia al centro',
  'crW.b.control.angle': 'Punto del borde, dirección',
  'crW.b.control.recognition': 'Dónde está el borde: incertidumbre',
  'crW.b.control.correct': 'Corregir la vista',
  'crW.b.control.dmin': 'Contando cráteres de al menos',
  'crW.b.control.catalogue': 'Los círculos del catálogo',
  'crW.b.row.scale': 'Escala del mapa',
  'crW.b.value.scale': '{s} ± {sigma} km por píxel en el centro del disco',
  'crW.b.row.view': 'La vista en tu círculo',
  'crW.b.value.view':
    '{rho} del camino del centro del disco a su borde; cos E = {cosE} (una vista cenital tiene cos E = 1)',
  'crW.b.row.across': 'A lo ancho del círculo',
  'crW.b.value.across': '{px} píxeles',
  'crW.b.row.diameter': 'Diámetro',
  'crW.b.value.diameter': '{D} ± {sigma} km ({rel})',
  'crW.b.row.scaleTerm': 'Incertidumbre de la escala',
  'crW.b.row.fitTerm': 'Incertidumbre de colocar el círculo',
  'crW.b.row.recognitionTerm': 'Incertidumbre de dónde está el borde',
  'crW.b.row.foreshorteningTerm': 'Incertidumbre de la vista',
  'crW.b.row.biggest': 'El término mayor',
  'crW.b.term.scale': 'la escala',
  'crW.b.term.fit': 'colocar el círculo',
  'crW.b.term.recognition': 'dónde está el borde',
  'crW.b.term.foreshortening': 'la vista',
  'crW.b.row.correction': 'La corrección de la vista',
  'crW.b.value.correction':
    'alarga el radio en {factor}; sin ella el diámetro sería {D} km',
  'crW.b.value.nocorrection':
    'no aplicada: la vista se toma como cenital y el diámetro sale {D} km',
  'crW.b.row.chance': 'Probabilidad de que mida al menos {dmin} km',
  'crW.b.row.catalogue': 'El cráter del catálogo bajo tu centro',
  'crW.b.value.catalogue': '{D} km. El catálogo es otra medida, no la verdad.',
  'crW.b.row.small': 'Aviso',
  'crW.b.value.small':
    'un cráter de menos de {px} píxeles de ancho es demasiado pequeño para colocarlo: una comparación de recuentos lo rechaza',
  'crW.b.row.age': 'Edad en años',
  'crW.b.value.age':
    'no se da: necesita una función de producción, una corrección por saturación y secundarios, y una corrección de completitud comprobada con cráteres de tamaño conocido, que aquí no han pasado su prueba',
  'crW.b.assumes':
    'una región plana vista según un solo eje alargado; un sigma de cos E de la vista a partir de un píxel en el disco; la incertidumbre de dónde está el borde, que fijas tú y no es una medida; la incertidumbre del recuento, que esto no suma',
};
