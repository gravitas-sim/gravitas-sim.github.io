// Las palabras de los paneles de imagen directa, en español (Prompt 230). Los instrumentos son
// ejemplos didácticos y los paneles lo dicen.
export const ES_DIRECTIMAGING = {
  'dirW.contrast.title': 'Ver un planeta junto a su estrella',
  'dirW.contrast.note':
    'Dos problemas distintos separan a un telescopio de un planeta. El planeta debe estar lo bastante lejos de su estrella en el cielo (un ángulo) y debe ser lo bastante brillante frente al resplandor de la estrella (un cociente de flujos, el contraste). La escala de difracción λ/D es del telescopio; el ángulo de trabajo interno de un coronógrafo es otro número, propio del instrumento. Los cuatro instrumentos de aquí son ejemplos didácticos: sus ángulos de trabajo y sus pisos de contraste no son las especificaciones de ningún instrumento real.',
  'dirW.control.system': 'Planeta',
  'dirW.control.distance': 'Distancia',
  'dirW.control.telescope': 'Instrumento',
  'dirW.control.phase': 'Ángulo de fase',
  'dirW.control.band': 'Longitud de onda',
  'dirW.band.0': 'la del instrumento',
  'dirW.band.1': '10 µm, IR medio',
  'dirW.control.plots': 'Mostrar el gráfico',
  'dirW.system.0': 'Tierra',
  'dirW.system.1': 'Júpiter',
  'dirW.system.2': 'gigante joven',
  'dirW.system.3': 'Júpiter caliente',
  'dirW.systemName.0': 'la Tierra alrededor del Sol',
  'dirW.systemName.1': 'Júpiter alrededor del Sol',
  'dirW.systemName.2':
    'un gigante joven alrededor de una estrella fría (un sustituto, no un planeta de catálogo)',
  'dirW.systemName.3':
    'un Júpiter caliente alrededor del Sol (un sustituto, no un planeta de catálogo)',
  'dirW.tel.0': '0,25 m, visible',
  'dirW.tel.1': '2,4 m, visible',
  'dirW.tel.2': '8 m, IR cercano',
  'dirW.tel.3': '6 m, visible',
  'dirW.on': 'sí',
  'dirW.off': 'no',
  'dirW.axis.wavelength': 'log10 de la longitud de onda, en micrómetros',
  'dirW.axis.contrast': 'log10 del contraste (planeta sobre estrella)',
  'dirW.axis.mass': 'log10 de la masa, en masas de Júpiter',
  'dirW.axis.axis': 'log10 del semieje mayor, en UA',
  'dirW.axis.angle': 'log10 del ángulo en el cielo, en segundos de arco',
  'dirW.legend.reflected': 'Luz estelar reflejada',
  'dirW.legend.thermal': 'Emisión térmica',
  'dirW.legend.total': 'Total',
  'dirW.legend.floor': 'Piso de contraste (ejemplo)',
  'dirW.legend.at': 'En la longitud de onda de este instrumento',
  'dirW.legend.solar': 'Sistema solar',
  'dirW.legend.imaged': 'Planetas con imagen directa (archivo)',
  'dirW.legend.iwa': 'Ángulo de trabajo interno (ejemplo)',
  'dirW.row.system': 'Planeta',
  'dirW.v.system':
    '{n}: visto desde {d} pársecs con un ángulo de fase de {a} grados; órbita de {r} UA, estrella de {t} K',
  'dirW.row.separation': 'Separación',
  'dirW.v.separation':
    '{s} segundos de arco en el cielo: {r} UA, que es el radio de la órbita por el seno del ángulo de fase',
  'dirW.row.scale': 'Escala de difracción',
  'dirW.v.scale':
    'λ/D es {x} segundos de arco para {D} m a {w} micrómetros, y la separación es {k} λ/D. λ/D es la escala de difracción del telescopio. No es el ángulo de trabajo interno de un coronógrafo.',
  'dirW.row.iwa': 'Ángulo de trabajo interno',
  'dirW.v.iwa':
    '{n} λ/D, es decir {a} segundos de arco: un valor didáctico de este ejemplo, no una especificación citada de ningún instrumento',
  'dirW.row.contrast': 'Contraste',
  'dirW.v.contrast':
    'reflejado {r}, térmico {t}, total {c}: el planeta es {k} veces más débil que su estrella a {w} micrómetros',
  'dirW.row.verdict': '¿Puede verlo este instrumento?',
  'dirW.v.observable':
    'Fuera del ángulo de trabajo interno y más brillante que el piso de contraste de {f}: este instrumento de ejemplo podría verlo. El panel no modela la supresión de la luz estelar, así que es una condición necesaria y no una predicción.',
  'dirW.v.notObservable': 'No observable con este instrumento: {r}.',
  'dirW.reason.inside-inner-working-angle':
    'el planeta está dentro del ángulo de trabajo interno indicado',
  'dirW.reason.below-contrast-floor':
    'el planeta es más débil que el piso de contraste indicado de {f}',
  'dirW.row.temperature': 'Temperatura',
  'dirW.v.irradiated':
    'El planeta se dibuja como un cuerpo negro a {t} K, lo que le da la luz de su estrella sola (un albedo de Bond de {b}).',
  'dirW.v.selfLuminous':
    'El planeta se dibuja como un cuerpo negro a {t} K, la temperatura indicada. La luz de la estrella sola solo lo calentaría a {e} K: brilla con su propio calor, y por eso se pueden fotografiar los gigantes jóvenes.',
  'dirW.row.assumes': 'Supone',
  'dirW.a':
    'Planeta y estrella como cuerpos negros; una esfera de Lambert con el albedo geométrico indicado; una órbita circular; la separación es el radio de la órbita por el seno del ángulo de fase; el contraste es un cociente de flujos de los cuerpos sin resolver; sin supresión de la luz estelar, ruido de moteado ni tiempo de exposición. Donde el gráfico baja de 10⁻¹⁶ se dibuja en ese valor.',
  'dirW.arch.title': 'El sistema solar y los planetas con imagen directa',
  'dirW.arch.note':
    'Los planetas del sistema solar y los planetas con imagen directa del Archivo de Exoplanetas de la NASA, en escala logarítmica. Los planetas con imagen directa son los que se pueden fotografiar: lejanos, masivos y jóvenes. No son una muestra de los planetas que existen.',
  'dirW.control.view': 'Gráfico',
  'dirW.view.0': 'órbita y masa',
  'dirW.view.1': 'ángulo y masa',
  'dirW.row.table': 'La tabla',
  'dirW.v.table':
    '{n} planetas con imagen directa en la tabla del archivo; {m} tienen semieje mayor y masa, y {k} también distancia',
  'dirW.row.imaged': 'Los planetas con imagen directa',
  'dirW.v.imaged':
    'semieje mayor mediano de {a} UA y masa mediana de {m} masas de Júpiter; {h} de {n} son más pesados que Júpiter y {b} están más allá de la órbita de Neptuno',
  'dirW.row.solar': 'El sistema solar',
  'dirW.v.solar':
    'visto desde {d} pársecs sus planetas están entre {lo} segundos de arco (Mercurio) y {hi} segundos de arco (Neptuno) del Sol',
  'dirW.row.window': 'Con este instrumento',
  'dirW.v.window':
    'El ángulo de trabajo interno de ejemplo es {a} segundos de arco: {i} de {k} planetas con imagen directa y {s} de los 8 planetas del sistema solar están fuera de él. Solo la separación: aquí no se juzga el contraste.',
  'dirW.row.source': 'Fuente',
  'dirW.v.source':
    'Archivo de Exoplanetas de la NASA, Planetary Systems Composite Parameters, método de descubrimiento Imaging, consultado el 2026-10-31 (se pide dar crédito; no se recuperaron las referencias de cada planeta). El ángulo es el semieje mayor entre la distancia, no la separación proyectada de una época.',
};
