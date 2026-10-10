// =============================================================================
// Las palabras de los instrumentos de lentes, en español
// -----------------------------------------------------------------------------
// Las mismas claves que en.lensing.js; las registra js/lensingWidgets.js.
// =============================================================================

export const ES_LENSING = {
  'lensW.row.source': 'Qué es esto',
  'lensW.row.how': 'Lo que se deja fuera',
  'lensW.b.title': 'La luz que se curva',
  'lensW.b.note':
    'Un rayo de luz pasa junto a una masa puntual. La línea muestra cuánto se curva el rayo según su distancia de máximo acercamiento; la línea gris es el Sol, la de color es la masa que elegiste, el punto es por donde pasa el rayo. La parte sombreada está a menos de diez radios de Schwarzschild, donde no se puede confiar en la fórmula.',
  'lensW.b.control.mass': 'Masa de la lente',
  'lensW.b.control.impact': 'Máximo acercamiento del rayo',
  'lensW.b.preset.sun': 'Luz rozando el Sol',
  'lensW.b.preset.far': 'A cien radios solares',
  'lensW.b.preset.ten': 'Una estrella de diez masas solares',
  'lensW.b.preset.bh': 'Un agujero negro de 100 millones de Soles',
  'lensW.b.axisB': 'máximo acercamiento, log₁₀ de radios solares',
  'lensW.b.axisA': 'log₁₀ de la desviación, segundos de arco',
  'lensW.b.legend':
    'el Sol · tu masa · este rayo · demasiado cerca para fiarse',
  'lensW.b.value.source':
    'Un modelo: una masa puntual y un rayo de luz, en campo débil',
  'lensW.b.value.how':
    'Lente delgada, campo débil, una masa puntual: la desviación es 4GM/(c²b), válida solo muy fuera del radio de Schwarzschild',
  'lensW.b.row.mass': 'Masa de la lente',
  'lensW.b.row.impact': 'Máximo acercamiento',
  'lensW.b.row.rs': 'Radio de Schwarzschild 2GM/c²',
  'lensW.b.row.ratio':
    'Máximo acercamiento dividido por el radio de Schwarzschild',
  'lensW.b.row.alpha': 'Desviación del rayo, 4GM/(c² b)',
  'lensW.b.row.newton': 'La mitad: la desviación de una partícula newtoniana',
  'lensW.b.row.valid': '¿Es fiable aquí la fórmula de campo débil?',
  'lensW.b.value.valid': 'Sí: el rayo pasa a más de 10 radios de Schwarzschild',
  'lensW.b.value.invalid':
    'No: el rayo pasa a menos de 10 radios de Schwarzschild, y la relatividad general da otra respuesta',
  'lensW.p.title': 'El plano de la lente',
  'lensW.p.note':
    'El cielo alrededor de una lente, en unidades de su radio de Einstein (el anillo de trazos). El disco naranja es la fuente, las formas azules son las imágenes que la lente hace de ella. La fuente está al doble de distancia que la lente. Con desplazamiento cero las imágenes se unen en un anillo.',
  'lensW.p.control.kind': 'Tipo de lente',
  'lensW.p.kind.point': 'Una masa puntual',
  'lensW.p.kind.sis': 'Una esfera isoterma singular (una galaxia)',
  'lensW.p.control.mass': 'Masa dentro del radio de Einstein',
  'lensW.p.control.dist': 'Distancia a la lente',
  'lensW.p.control.y':
    'Desplazamiento de la fuente respecto de la lente (radios de Einstein)',
  'lensW.p.control.size': 'Radio de la fuente (radios de Einstein)',
  'lensW.p.preset.star': 'Un Sol a 4 kpc',
  'lensW.p.preset.ring': 'Una galaxia a 1 Gpc, fuente justo detrás',
  'lensW.p.preset.offset': 'Lo mismo, con la fuente a un lado',
  'lensW.p.preset.sis': 'Una galaxia isoterma, fuente a un lado',
  'lensW.p.legend': 'lente · anillo de Einstein · fuente · imágenes',
  'lensW.p.value.source':
    'Un modelo: una lente delgada, una fuente, en campo débil; la fuente está al doble de distancia que la lente',
  'lensW.p.value.how':
    'Distancias euclídeas (la fuente al doble de la distancia de la lente), sin cosmología, sin elipticidad ni cizalla, una lente circular',
  'lensW.p.value.noDelay': 'No se calcula para esta lente',
  'lensW.p.row.mass': 'Masa dentro del radio de Einstein',
  'lensW.p.row.thetaMas': 'Radio de Einstein, en milisegundos de arco',
  'lensW.p.row.thetaArcsec': 'Radio de Einstein, en segundos de arco',
  'lensW.p.row.radius': 'Radio de Einstein en la lente',
  'lensW.p.row.sigma':
    'Dispersión de velocidades de una galaxia que hace este anillo',
  'lensW.p.row.count': 'Imágenes',
  'lensW.p.row.outer': 'Imagen exterior, en radios de Einstein',
  'lensW.p.row.inner': 'Imagen interior, en radios de Einstein',
  'lensW.p.row.muOuter': 'Amplificación de la imagen exterior',
  'lensW.p.row.muInner':
    'Amplificación de la imagen interior (negativa: invertida)',
  'lensW.p.row.total': 'Amplificación total',
  'lensW.p.row.delay': 'Retraso de la luz entre las dos imágenes',
  'lensW.m.title': 'Una lente que pasa',
  'lensW.m.note':
    'El brillo de una estrella cuando una lente pasa por delante. La lente cruza el radio de Einstein en el tiempo tE, que depende a la vez de la masa, la distancia y la velocidad. La curva es el flujo sobre su nivel base. Con el suceso sintético activado, los puntos grises son un suceso sintético con ruido.',
  'lensW.m.control.mass': 'Masa de la lente',
  'lensW.m.control.dist': 'Distancia a la lente (la fuente está a 8 kpc)',
  'lensW.m.control.speed': 'Velocidad transversal de la lente',
  'lensW.m.control.u0': 'Máximo acercamiento (radios de Einstein)',
  'lensW.m.control.fs': 'Parte de la luz que es de la fuente',
  'lensW.m.control.rho': 'Radio de la fuente (radios de Einstein)',
  'lensW.m.control.data': 'Suceso sintético con ruido',
  'lensW.m.data.on': 'Activado',
  'lensW.m.data.off': 'Desactivado',
  'lensW.m.preset.typical': 'Un suceso típico del bulbo',
  'lensW.m.preset.finite': 'Un paso muy cercano, fuente finita',
  'lensW.m.preset.blend': 'El mismo suceso, con la mitad de la luz mezclada',
  'lensW.m.preset.data': 'Ajusta el suceso sintético',
  'lensW.m.axisT': 'tiempo desde el máximo acercamiento, días',
  'lensW.m.axisF': 'flujo sobre el nivel base',
  'lensW.m.legend': 'la curva de luz del modelo',
  'lensW.m.legendData': 'la curva de luz del modelo · datos sintéticos',
  'lensW.m.value.source':
    'Un modelo: una lente puntual que pasa junto a una estrella; los datos, cuando se muestran, son sintéticos con verdad conocida',
  'lensW.m.value.how':
    'Una lente puntual, disco uniforme para la fuente, movimiento recto y a velocidad constante; sin paralaje, oscurecimiento del limbo, lente binaria ni segunda fuente',
  'lensW.m.value.pm': '{v} ± {e} {u}',
  'lensW.m.row.thetaE': 'Radio de Einstein, ángulo',
  'lensW.m.row.radius': 'Radio de Einstein en la lente',
  'lensW.m.row.tE': 'Tiempo de cruce tE',
  'lensW.m.row.peak': 'Flujo máximo sobre el nivel base',
  'lensW.m.row.above': 'Tiempo más brillante que 1,34 veces el nivel base',
  'lensW.m.row.near': 'Masa para este tE a 2 kpc y 100 km/s',
  'lensW.m.row.far': 'Masa para este tE a 6 kpc y 300 km/s',
  'lensW.m.row.chi': 'Tu modelo frente a los datos, chi cuadrado por punto',
  'lensW.m.row.fitHeld.tE': 'Mejor ajuste sin mezcla: tE',
  'lensW.m.row.fitHeld.u0': 'Mejor ajuste sin mezcla: máximo acercamiento',
  'lensW.m.row.fitHeld.chi': 'Mejor ajuste sin mezcla: chi cuadrado por punto',
  'lensW.m.row.fitFree.tE': 'Mejor ajuste con mezcla libre: tE',
  'lensW.m.row.fitFree.u0':
    'Mejor ajuste con mezcla libre: máximo acercamiento',
  'lensW.m.row.fitFree.chi':
    'Mejor ajuste con mezcla libre: chi cuadrado por punto',
  'lensW.m.row.fitFree.fs':
    'Mejor ajuste con mezcla libre: parte de la luz de la fuente',
};
