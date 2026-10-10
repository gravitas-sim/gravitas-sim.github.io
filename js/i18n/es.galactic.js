// =============================================================================
// Las palabras de los instrumentos galácticos, en español
// -----------------------------------------------------------------------------
// Registradas por js/galacticWidgets.js al cargar la familia (como es.light.js).
// =============================================================================

export const ES_GALACTIC = {
  'galW.loading': 'cargando los datos de Gaia…',
  'galW.row.source': 'Qué es esto',
  'galW.sm.title': 'El movimiento del Sol',
  'galW.sm.note':
    'Estrellas de Gaia DR3 con velocidad radial, cada una convertida en una velocidad (U hacia el centro galáctico, V en el sentido de la rotación, W hacia el polo norte galáctico). El movimiento del Sol es menos la velocidad media de las estrellas que conservas.',
  'galW.sm.control.maxPc': 'Usar estrellas más cercanas que',
  'galW.sm.control.frame': 'Medir la V del Sol respecto de',
  'galW.sm.control.view': 'Imagen',
  'galW.sm.view.uv': 'Velocidades, U contra V',
  'galW.sm.view.sky': 'Mapa del cielo de las estrellas y el ápex',
  'galW.sm.frame.stars': 'la media de estas estrellas',
  'galW.sm.frame.stromberg': 'el LSR por la corrección de Strömberg',
  'galW.sm.frame.schonrich': 'el LSR de Schönrich et al. 2010',
  'galW.sm.preset.near': 'Dentro de 100 pc',
  'galW.sm.preset.far': 'Dentro de 1.000 pc',
  'galW.sm.preset.lsr': 'LSR de Strömberg, mapa',
  'galW.sm.axisU': 'U, km/s (velocidad de las estrellas vista desde el Sol)',
  'galW.sm.axisV': 'V, km/s',
  'galW.sm.apex': 'ápex',
  'galW.sm.skyNote':
    'Coordenadas galácticas, Hammer-Aitoff, l = 0° en el centro',
  'galW.sm.value.source':
    'Medido: astrometría y velocidades radiales de Gaia DR3 (ESA/Gaia/DPAC)',
  'galW.sm.row.n': 'Estrellas usadas',
  'galW.sm.row.U': 'U del Sol (hacia el centro galáctico)',
  'galW.sm.row.V': 'V del Sol (sentido de la rotación)',
  'galW.sm.row.W': 'W del Sol (hacia el polo norte galáctico)',
  'galW.sm.row.speed': 'Rapidez',
  'galW.sm.row.apex': 'Ápex (hacia dónde va el Sol)',
  'galW.sm.value.apex': 'l = {l}°, b = {b}°',
  'galW.sm.row.sigmaU': 'Dispersión de velocidades de las estrellas σ_U',
  'galW.sm.row.lag': 'Retraso de Strömberg, σ_U² ÷ 80 km/s',
  'galW.sm.row.frame': 'V se mide respecto de',
  'galW.sm.about.stars':
    'la media de las estrellas conservadas, que se retrasan respecto de la rotación de la Galaxia',
  'galW.sm.about.stromberg':
    'el sistema local en reposo, tomando el retraso de las estrellas de su propia dispersión (unos 4 km/s)',
  'galW.sm.about.schonrich':
    'el sistema local en reposo de Schönrich, Binney y Dehnen 2010, que sostienen que el retraso depende de la metalicidad (12,24 km/s)',
  'galW.sm.row.assume': 'Supuesto en uso',
  'galW.sm.value.assume':
    'V = {v} km/s se toma de la literatura, no se mide aquí; U y W se siguen midiendo.',
  'galW.rd.title': 'El disco que gira',
  'galW.rd.note':
    'Dos mediciones. Las constantes de Oort A y B a partir de los movimientos propios de 1.570 estrellas de Gaia, y la rapidez circular de la Vía Láctea según el radio, de Bhattacharjee et al. 2014 (el conjunto de R0 = 8,3 kpc y V0 = 244 km/s), frente a un modelo de bulbo, disco y halo.',
  'galW.rd.control.view': 'Imagen',
  'galW.rd.view.oort': 'Constantes de Oort, de los movimientos propios',
  'galW.rd.view.curve': 'Curva de rotación y modelo de masa',
  'galW.rd.control.weight': 'El ajuste de Oort pondera las estrellas',
  'galW.rd.weight.distance': 'por la distancia (1 ÷ paralaje²)',
  'galW.rd.weight.none': 'todas por igual',
  'galW.rd.control.fit': 'Parámetros del modelo',
  'galW.rd.fit.mine': 'de mis deslizadores',
  'galW.rd.fit.halo': 'mejor ajuste, con halo',
  'galW.rd.fit.stars': 'mejor ajuste, solo estrellas (sin halo)',
  'galW.rd.control.mdisk': 'Masa del disco',
  'galW.rd.control.rd': 'Longitud de escala del disco',
  'galW.rd.control.vh': 'Rapidez del halo, lejos',
  'galW.rd.control.rc': 'Radio del núcleo del halo',
  'galW.rd.preset.oort': 'Constantes de Oort',
  'galW.rd.preset.stars': 'Solo estrellas',
  'galW.rd.preset.halo': 'Con un halo',
  'galW.rd.axisL': 'Longitud galáctica l, grados',
  'galW.rd.axisY': '4,74 μ_l × … km/s/kpc',
  'galW.rd.axisR': 'distancia al centro, kpc',
  'galW.rd.axisV': 'rapidez circular, km/s',
  'galW.rd.value.oort':
    'Medido: movimientos propios de Gaia DR3, ajustados juntos para A, B y el movimiento del Sol',
  'galW.rd.row.n': 'Estrellas usadas',
  'galW.rd.row.A': 'A de Oort',
  'galW.rd.row.B': 'B de Oort',
  'galW.rd.row.omega':
    'A − B, la velocidad angular de la órbita circular local',
  'galW.rd.row.v0': 'Rapidez circular en el Sol, (A − B) × 8,3 kpc',
  'galW.rd.row.weight': 'El ajuste',
  'galW.rd.about.distance':
    'pondera cada estrella por 1 ÷ paralaje², porque las estrellas más cercanas son las que más se dispersan en estas unidades',
  'galW.rd.about.none':
    'pondera todas las estrellas por igual, así que dominan las más cercanas, con la mayor dispersión',
  'galW.rd.value.curve':
    'Medido: puntos publicados de la curva de rotación, tres conjuntos citados en el paquete de datos (este es el de R0 = 8,3 kpc). Las curvas son un modelo.',
  'galW.rd.row.points': 'Puntos (2 a 25 kpc)',
  'galW.rd.row.chi2': 'χ² frente a los puntos',
  'galW.rd.row.reduced': 'χ² reducido',
  'galW.rd.row.disc': 'Masa del disco',
  'galW.rd.row.halo': 'Rapidez del halo, lejos',
  'galW.rd.row.atSun': 'A 8,3 kpc',
  'galW.rd.value.atSun':
    'modelo {total} km/s: estrellas y gas {visible}, halo {halo}',
  'galW.rd.row.how': 'El modelo',
  'galW.rd.value.how':
    'Un bulbo fijo en 1,5 × 10¹⁰ M☉, un disco exponencial y un halo de rapidez constante lejos. Los errores se acotan abajo en 3 km/s. En los ajustes el disco está acotado en 8 × 10¹⁰ M☉, porque un disco sin cota puede ajustar la curva solo y no explicar nada.',
  'galW.cm.title': 'Pertenencia a un cúmulo por movimiento',
  'galW.cm.note':
    'Las 993 estrellas de Gaia DR3 más brillantes que G = 17,5 a menos de 14 minutos de arco del cúmulo abierto NGC 2420. Se ajustan juntos un cúmulo y un campo; cada estrella recibe una probabilidad de pertenecer al cúmulo, no una etiqueta.',
  'galW.cm.control.view': 'Imagen',
  'galW.cm.view.pm': 'Movimientos propios',
  'galW.cm.view.cmd': 'Diagrama color-magnitud',
  'galW.cm.control.dims': 'El ajuste usa',
  'galW.cm.dims.two': 'solo el movimiento propio',
  'galW.cm.dims.three': 'movimiento propio y paralaje',
  'galW.cm.control.threshold':
    'Contar como miembro por encima de la probabilidad',
  'galW.cm.preset.pm': 'Movimientos propios',
  'galW.cm.preset.cmd': 'Color y magnitud',
  'galW.cm.preset.strict': 'Estricto: 0,99',
  'galW.cm.axisPmRa': 'movimiento propio en ascensión recta, mas/año',
  'galW.cm.axisPmDec': 'en declinación, mas/año',
  'galW.cm.axisC': 'BP − RP, color',
  'galW.cm.axisG': 'magnitud G (más brillante arriba)',
  'galW.cm.value.source':
    'Medido: astrometría y fotometría de Gaia DR3 (ESA/Gaia/DPAC). La pertenencia es un ajuste de modelo.',
  'galW.cm.row.n': 'Estrellas en la tabla',
  'galW.cm.row.members': 'Estrellas por encima del umbral de probabilidad',
  'galW.cm.row.expected':
    'Miembros esperados, la suma de todas las probabilidades',
  'galW.cm.row.uncertain': 'Estrellas con una probabilidad entre 0,1 y 0,9',
  'galW.cm.row.pm': 'Movimiento propio del cúmulo',
  'galW.cm.value.pm': '{a}, {d} mas/año (ascensión recta, declinación)',
  'galW.cm.row.width':
    'Dispersión del cúmulo en movimiento propio (antes de los errores)',
  'galW.cm.row.parallax': 'Paralaje medio de los miembros',
  'galW.cm.row.distance': 'Distancia a partir de ese paralaje',
  'galW.cm.value.distance':
    '{d} kpc, como 1 ÷ paralaje, sin corrección del punto cero (unos 0,02 mas) y sin comprobar con otro método',
  'galW.cm.row.how': 'El ajuste',
  'galW.cm.value.how':
    'Una gaussiana estrecha para el cúmulo y una ancha para el campo, ajustadas juntas por maximización de la esperanza desde valores iniciales fijos; los errores propios de cada estrella ensanchan ambas.',
  'galW.sky.view': 'Imagen',
  'galW.sky.view.galactic': 'Mapa galáctico de las fuentes',
  'galW.sky.view.vectors': 'Vectores de movimiento propio en el cielo',
  'galW.sky.aria.map':
    'Mapa de {n} fuentes en coordenadas galácticas, proyección de Hammer-Aitoff',
  'galW.sky.note.map':
    '{n} fuentes ubicadas por su longitud y latitud galácticas; sus valores están en la tabla de abajo.',
  'galW.sky.aria.vectors':
    'Flechas de movimiento propio de {n} fuentes, con la ascensión recta creciendo hacia la izquierda',
  'galW.sky.note.vectors':
    '{n} fuentes, cada una con una flecha según su movimiento propio; la mediana del movimiento propio es {v} mas/año y su flecha mide cerca de una veinteava parte de la imagen, todas en la misma escala.',
  'galW.sky.scale':
    'la ascensión recta crece hacia la izquierda; flechas en una escala, mediana {v} mas/año',
};
