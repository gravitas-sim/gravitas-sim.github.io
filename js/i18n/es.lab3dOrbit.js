// El editor de órbitas y la vista del cielo del laboratorio 3-D: su español
// (js/lab3d/view/orbitPanel.js). Los mismos ids que ./en.lab3dOrbit.js.

export const ES_LAB3DORBIT = {
  'o.heading': 'Editor de órbitas y vista del cielo',
  'o.intro':
    'Lee la órbita de un cuerpo alrededor del cuerpo que orbita, cambia un elemento y pulsa Aplicar para seguir desde este instante en la órbita nueva, mira la órbita como la ve un observador y compara dos órbitas entre sí. Cada número se calcula con las posiciones y velocidades de la ejecución, en el plano de referencia elegido en «Vista».',
  'o.orbit': 'Órbita',
  'o.body': 'Cuerpo',
  'o.load': 'Cargar los elementos actuales',
  'o.apply': 'Aplicar',
  'o.noPrimary':
    'Este cuerpo no orbita nada aquí (es el más pesado), así que no tiene órbita que leer ni editar.',
  'o.frame':
    'Elementos de {body} alrededor de {primary}, medidos en {plane}, en t = {t} ({scale}, en {units}).',
  'o.plane.system': 'los ejes propios del sistema',
  'o.plane.equatorial': 'el plano ecuatorial',
  'o.plane.invariable': 'el plano invariable',
  'o.plane.sky': 'el cielo de un observador',
  'o.scale.code': 'el tiempo de código del núcleo',
  'o.scale.elapsed': 'días transcurridos desde el cero del archivo',
  'o.code': 'unidades de código',
  'o.a': 'Semieje mayor a ({unit})',
  'o.e': 'Excentricidad e',
  'o.i': 'Inclinación i (grados)',
  'o.Omega': 'Nodo Ω (grados)',
  'o.omega': 'Periapsis ω (grados)',
  'o.M': 'Anomalía media M (grados)',
  'o.now': 'Ahora:',
  'o.period': 'período',
  'o.notNumber': 'El campo {field} no es un número.',
  'o.unchanged': 'No se cambió nada, así que la ejecución sigue como está.',
  'o.loaded': 'Los campos tienen los elementos que la ejecución tiene ahora.',
  'o.applied':
    'Aplicado: {body} está en la órbita nueva desde este instante, y lo que lo orbita fue con él. Nada más se movió.',
  'o.refused': 'Estos elementos fueron rechazados: {why}.',
  'o.refused.noPrimary':
    'Este cuerpo no orbita nada, así que no tiene órbita que editar.',
  'o.refused.parabolic':
    'Una parábola (e = 1) no tiene semieje mayor, así que no se puede construir con elementos.',
  'o.refused.ellipseAxis': 'Una elipse necesita un semieje mayor positivo.',
  'o.refused.hyperbolaAxis':
    'Una hipérbola necesita un semieje mayor negativo.',
  'o.refused.eccentricity': 'La excentricidad no puede ser negativa.',
  'o.refused.inclination': 'La inclinación está entre 0° y 180°.',
  'o.refused.notFinite': 'Cada elemento debe ser un número finito.',
  'o.refused.degenerate': 'Este cuerpo no tiene una órbita que leer ahora.',
  'o.sky': 'El cielo, visto por un observador',
  'o.az': 'Dirección del observador, acimut (grados desde +x hacia +y)',
  'o.el':
    'Dirección del observador, elevación (grados desde el plano de referencia)',
  'o.setObserver': 'Fijar el observador',
  'o.observerSet':
    'El observador está fijado. La figura del cielo y su tabla muestran ahora lo que ve este observador; el plano de referencia no cambia.',
  'o.observe': 'Mostrar los números en el cielo de este observador',
  'o.observing':
    'El plano de referencia es ahora el cielo de este observador: +z apunta al observador, así que una inclinación se mide desde la vista de frente.',
  'o.skyTable': 'La órbita en el cielo',
  'o.skyLabel':
    'La órbita de {body} alrededor de {primary} como la ve el observador: la mitad cercana en trazo continuo, la lejana a rayas.',
  'o.chordLabel':
    'La cuerda del tránsito: el disco de la estrella y el camino del planeta a través de él en su máxima cercanía.',
  'o.noSky':
    'No hay una órbita ligada que dibujar en el cielo para este cuerpo.',
  'o.noRadii':
    'Los cuerpos no tienen radios aquí, así que no hay tránsito que medir: son puntos.',
  'o.t.major': 'Semieje mayor aparente',
  'o.t.minor': 'Semieje menor aparente',
  'o.t.ratio': 'Menor entre mayor',
  'o.t.angle': 'Eje mayor, desde +x del cielo hacia +y',
  'o.t.top':
    'Punto más alto en el cielo (arriba es el +z del sistema tal como se ve)',
  'o.t.sep': 'Separación en el cielo ahora',
  'o.t.depth':
    'A lo largo de la línea de visión ahora (positivo: hacia el observador)',
  'o.t.nearer': 'Más cerca del observador ahora',
  'o.t.points': 'Tránsito',
  'o.t.impact': 'Parámetro de impacto',
  'o.t.impactR': 'Parámetro de impacto, en radios de la estrella',
  'o.t.transits': 'Pasa por delante de la estrella',
  'o.t.chord': 'Mitad de la cuerda a través del círculo de contacto',
  'o.yes': 'sí',
  'o.no': 'no',
  'o.pair': 'Entre dos órbitas',
  'o.other': 'Comparar con',
  'o.pairNone': 'Elige dos cuerpos distintos que orbiten algo.',
  'o.pairRead':
    'Las órbitas de {a} y {b} están inclinadas entre sí {angle}. Medido en {plane}, {a} tiene inclinación {ia} y {b} {ib}.',
  'o.resonance': 'Un par resonante',
  'o.resIn': 'Cuerpo interior',
  'o.resOut': 'Cuerpo exterior',
  'o.resJ': 'Resonancia j : (j − 1)',
  'o.resReset': 'Olvidar el rango',
  'o.resNone':
    'Elige dos cuerpos que orbiten la misma primaria en órbitas ligadas; el argumento es sobre el periapsis del cuerpo interior.',
  'o.resRead':
    'Argumento resonante, {j} λ(exterior) − {jm} λ(interior) − ϖ(interior), ahora {phi} rad. Este panel lo ha visto entre {lo} y {hi} rad: {kind}.',
  'o.librating': 'libra, y se queda a un lado del círculo',
  'o.circulating': 'circula, y da toda la vuelta',
};
