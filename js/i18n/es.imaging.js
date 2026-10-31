// Las palabras de los paneles de imagen directa, en español (Prompt 230). Los instrumentos son
// ejemplos didácticos y los paneles lo dicen.
export const ES_IMAGING = {
  'imgW.contrast.title': 'Ver un planeta junto a su estrella',
  'imgW.contrast.note':
    'Dos problemas distintos separan a un telescopio de un planeta. El planeta debe estar lo bastante lejos de su estrella en el cielo (un ángulo) y debe ser lo bastante brillante frente al resplandor de la estrella (un cociente de flujos, el contraste). La escala de difracción λ/D es del telescopio; el ángulo de trabajo interno de un coronógrafo es otro número, propio del instrumento. Los cuatro instrumentos de aquí son ejemplos didácticos: sus ángulos de trabajo y sus pisos de contraste no son las especificaciones de ningún instrumento real.',
  'imgW.control.system': 'Planeta',
  'imgW.control.distance': 'Distancia',
  'imgW.control.telescope': 'Instrumento',
  'imgW.control.phase': 'Ángulo de fase',
  'imgW.control.plots': 'Mostrar el gráfico',
  'imgW.system.0': 'Tierra',
  'imgW.system.1': 'Júpiter',
  'imgW.system.2': 'gigante joven',
  'imgW.system.3': 'Júpiter caliente',
  'imgW.systemName.0': 'la Tierra alrededor del Sol',
  'imgW.systemName.1': 'Júpiter alrededor del Sol',
  'imgW.systemName.2':
    'un gigante joven alrededor de una estrella fría (un sustituto, no un planeta de catálogo)',
  'imgW.systemName.3':
    'un Júpiter caliente alrededor del Sol (un sustituto, no un planeta de catálogo)',
  'imgW.tel.0': '0,25 m, visible',
  'imgW.tel.1': '2,4 m, visible',
  'imgW.tel.2': '8 m, IR cercano',
  'imgW.tel.3': '6 m, visible',
  'imgW.on': 'sí',
  'imgW.off': 'no',
  'imgW.axis.wavelength': 'log10 de la longitud de onda, en micrómetros',
  'imgW.axis.contrast': 'log10 del contraste (planeta sobre estrella)',
  'imgW.axis.mass': 'log10 de la masa, en masas de Júpiter',
  'imgW.axis.axis': 'log10 del semieje mayor, en UA',
  'imgW.axis.angle': 'log10 del ángulo en el cielo, en segundos de arco',
  'imgW.legend.reflected': 'Luz estelar reflejada',
  'imgW.legend.thermal': 'Emisión térmica',
  'imgW.legend.total': 'Total',
  'imgW.legend.floor': 'Piso de contraste (ejemplo)',
  'imgW.legend.at': 'En la longitud de onda de este instrumento',
  'imgW.legend.solar': 'Sistema solar',
  'imgW.legend.imaged': 'Planetas con imagen directa (archivo)',
  'imgW.legend.iwa': 'Ángulo de trabajo interno (ejemplo)',
  'imgW.row.system': 'Planeta',
  'imgW.v.system':
    '{n}: visto desde {d} pársecs con un ángulo de fase de {a} grados; órbita de {r} UA, estrella de {t} K',
  'imgW.row.separation': 'Separación',
  'imgW.v.separation':
    '{s} segundos de arco en el cielo: {r} UA, que es el radio de la órbita por el seno del ángulo de fase',
  'imgW.row.scale': 'Escala de difracción',
  'imgW.v.scale':
    'λ/D es {x} segundos de arco para {D} m a {w} micrómetros, y la separación es {k} λ/D. λ/D es la escala de difracción del telescopio. No es el ángulo de trabajo interno de un coronógrafo.',
  'imgW.row.iwa': 'Ángulo de trabajo interno',
  'imgW.v.iwa':
    '{n} λ/D, es decir {a} segundos de arco: un valor didáctico de este ejemplo, no una especificación citada de ningún instrumento',
  'imgW.row.contrast': 'Contraste',
  'imgW.v.contrast':
    'reflejado {r}, térmico {t}, total {c}: el planeta es {k} veces más débil que su estrella a {w} micrómetros',
  'imgW.row.verdict': '¿Puede verlo este instrumento?',
  'imgW.v.observable':
    'Fuera del ángulo de trabajo interno y más brillante que el piso de contraste de {f}: este instrumento de ejemplo podría verlo. El panel no modela la supresión de la luz estelar, así que es una condición necesaria y no una predicción.',
  'imgW.v.notObservable': 'No observable con este instrumento: {r}.',
  'imgW.reason.inside-inner-working-angle':
    'el planeta está dentro del ángulo de trabajo interno indicado',
  'imgW.reason.below-contrast-floor':
    'el planeta es más débil que el piso de contraste indicado de {f}',
  'imgW.row.temperature': 'Temperatura',
  'imgW.v.irradiated':
    'El planeta se dibuja como un cuerpo negro a {t} K, lo que le da la luz de su estrella sola (un albedo de Bond de {b}).',
  'imgW.v.selfLuminous':
    'El planeta se dibuja como un cuerpo negro a {t} K, la temperatura indicada. La luz de la estrella sola solo lo calentaría a {e} K: brilla con su propio calor, y por eso se pueden fotografiar los gigantes jóvenes.',
  'imgW.row.assumes': 'Supone',
  'imgW.a':
    'Planeta y estrella como cuerpos negros; una esfera de Lambert con el albedo geométrico indicado; una órbita circular; la separación es el radio de la órbita por el seno del ángulo de fase; el contraste es un cociente de flujos de los cuerpos sin resolver; sin supresión de la luz estelar, ruido de moteado ni tiempo de exposición. Donde el gráfico baja de 10⁻¹⁶ se dibuja en ese valor.',
  'imgW.arch.title': 'El sistema solar y los planetas con imagen directa',
  'imgW.arch.note':
    'Los planetas del sistema solar y los planetas con imagen directa del Archivo de Exoplanetas de la NASA, en escala logarítmica. Los planetas con imagen directa son los que se pueden fotografiar: lejanos, masivos y jóvenes. No son una muestra de los planetas que existen.',
  'imgW.control.view': 'Gráfico',
  'imgW.view.0': 'órbita y masa',
  'imgW.view.1': 'ángulo y masa',
  'imgW.row.table': 'La tabla',
  'imgW.v.table':
    '{n} planetas con imagen directa en la tabla del archivo; {m} tienen semieje mayor y masa, y {k} también distancia',
  'imgW.row.imaged': 'Los planetas con imagen directa',
  'imgW.v.imaged':
    'semieje mayor mediano de {a} UA y masa mediana de {m} masas de Júpiter; {h} de {n} son más pesados que Júpiter y {b} están más allá de la órbita de Neptuno',
  'imgW.row.solar': 'El sistema solar',
  'imgW.v.solar':
    'visto desde {d} pársecs sus planetas están entre {lo} segundos de arco (Mercurio) y {hi} segundos de arco (Neptuno) del Sol',
  'imgW.row.window': 'Con este instrumento',
  'imgW.v.window':
    'El ángulo de trabajo interno de ejemplo es {a} segundos de arco: {i} de {k} planetas con imagen directa y {s} de los 8 planetas del sistema solar están fuera de él. Solo la separación: aquí no se juzga el contraste.',
  'imgW.row.source': 'Fuente',
  'imgW.v.source':
    'Archivo de Exoplanetas de la NASA, Planetary Systems Composite Parameters, método de descubrimiento Imaging, consultado el 2026-10-31 (se pide dar crédito; no se recuperaron las referencias de cada planeta). El ángulo es el semieje mayor entre la distancia, no la separación proyectada de una época.',
};
