// =============================================================================
// Las palabras del Laboratorio de la luz, en español
// -----------------------------------------------------------------------------
// Las registra js/lightWidgets.js al cargar la familia; mismos ids lightW.* que
// en js/i18n/en.light.js.
// =============================================================================

export const ES_LIGHT = {
  'lightW.bb.title': 'Explorador del cuerpo negro',
  'lightW.bb.note':
    'Un cuerpo negro calculado (ley de Planck), no la medición de ninguna estrella. La curva se escala a su propio máximo; la potencia que radia está en la lista de abajo.',
  'lightW.control.T': 'Temperatura',
  'lightW.control.pair': 'Color medido con',
  'lightW.pair.bv': 'B − V (sistema Vega)',
  'lightW.pair.gr': 'g − r (sistema AB)',
  'lightW.preset.sun': 'El Sol, 5.772 K',
  'lightW.preset.k': '{T} K',
  'lightW.axis.wavelength': 'longitud de onda, nm (escala logarítmica)',
  'lightW.visible': 'visible',
  'lightW.loading': 'cargando los datos…',
  'lightW.row.kind': 'Qué es esto',
  'lightW.value.kind': 'Calculado: ley de Planck, con el núcleo de radiación',
  'lightW.row.T': 'Temperatura',
  'lightW.row.peak':
    'Longitud de onda del máximo (por unidad de longitud de onda)',
  'lightW.row.peakNu': 'Frecuencia del máximo (por unidad de frecuencia)',
  'lightW.value.peakNu':
    '{v} THz, que no es c dividida por la longitud de onda del máximo: un espectro por unidad de frecuencia es otra curva',
  'lightW.row.exitance': 'Potencia radiada por metro cuadrado, σT⁴',
  'lightW.row.vsSun': 'Esa potencia comparada con la de 5.772 K',
  'lightW.row.color': 'Índice de color {pair}',
  'lightW.row.rgb': 'Color mostrado (sRGB)',
  'lightW.value.rgb':
    'rojo {r}, verde {g}, azul {b}, escalados para que el mayor sea 255; un cuerpo negro de más de unos 9.000 K es más azul de lo que una pantalla puede mostrar',
  'lightW.row.cite': 'Fuentes',
  'lightW.value.cite':
    'Bessell y Murphy 2012 (B, V), curvas de filtros SDSS de 2001 (g, r), CALSPEC Vega; color mostrado con el ajuste de Wyman, Sloan y Shirley 2013 a las curvas CIE 1931',
  'lightW.sp.title': 'Visor de espectros',
  'lightW.sp.note':
    'Un espectro es la luz separada por longitud de onda. Elige una estrella, mira el espectro completo con la lista de líneas encima y acércate a una línea para medir dónde está. Una estrella sintética es un modelo con un corrimiento que el visor no te dice.',
  'lightW.sp.control.src': 'Espectro',
  'lightW.sp.control.view': 'Vista',
  'lightW.sp.control.line': 'Línea que medir',
  'lightW.sp.view.all': 'espectro completo',
  'lightW.sp.view.zoom': 'acercar a una línea',
  'lightW.sp.src.a': 'Estrella A (SDSS, observada)',
  'lightW.sp.src.g': 'Estrella G (SDSS, observada)',
  'lightW.sp.src.k': 'Estrella K (SDSS, observada)',
  'lightW.sp.src.m': 'Estrella M (SDSS, observada)',
  'lightW.sp.src.s1': 'Estrella sintética 1',
  'lightW.sp.src.s2': 'Estrella sintética 2',
  'lightW.sp.src.s3': 'Estrella sintética 3',
  'lightW.sp.preset.all': 'La estrella A, espectro completo',
  'lightW.sp.preset.synth': 'Estrella sintética 1, H-alfa',
  'lightW.sp.tagObserved': 'Observada: SDSS DR18',
  'lightW.sp.tagSynthetic': 'Sintética: un modelo, no una estrella',
  'lightW.sp.kindObserved':
    'Observada: fotones de una estrella real, registrados por el espectrógrafo de SDSS',
  'lightW.sp.kindSynthetic':
    'Calculada: un espectro modelo con ruido y un corrimiento Doppler oculto',
  'lightW.sp.axisX': 'longitud de onda, Å (vacío)',
  'lightW.sp.axisYAll': 'flujo, escalado al mayor de la vista',
  'lightW.sp.axisYZoom': 'flujo ÷ continuo ajustado',
  'lightW.sp.row.src': 'Espectro',
  'lightW.sp.row.state': 'Estado',
  'lightW.sp.row.dips': 'Las caídas más profundas',
  'lightW.sp.value.dips':
    'Las cinco más profundas, cada una con el nombre de la línea más cercana de la lista; una indicación de dónde mirar, no una medición',
  'lightW.sp.row.dip': 'Caída {n}',
  'lightW.sp.value.dip':
    '{name}, en reposo {lam} Å: {depth} % por debajo del nivel a cada lado',
  'lightW.sp.row.line': 'Línea',
  'lightW.sp.value.line':
    '{name} ({species}), longitud de onda en reposo {rest} Å en el vacío',
  'lightW.sp.value.noLine':
    'No se encontró ninguna línea de absorción en la ventana: el continuo no cae aquí',
  'lightW.sp.row.center': 'Centro medido',
  'lightW.sp.row.shift':
    'Corrimiento respecto de la longitud de onda en reposo',
  'lightW.sp.row.v':
    'Velocidad, c × corrimiento ÷ reposo (positiva es alejándose)',
  'lightW.sp.row.ew': 'Ancho equivalente',
  'lightW.sp.row.depth': 'Profundidad bajo el continuo',
  'lightW.sp.row.cont': 'Ajuste del continuo',
  'lightW.sp.value.cont':
    'una recta por los {n} puntos de las dos ventanas grises sombreadas; dispersión {scatter} del continuo',
  'lightW.sp.row.how': 'Cómo se mide',
  'lightW.sp.value.how':
    'El centro es la longitud de onda media ponderada por la profundidad dentro de la ventana teñida de la línea. Las incertidumbres suponen un ruido blanco tan grande como la dispersión del continuo. La velocidad es la no relativista c × corrimiento ÷ reposo, que sirve muy por debajo de la velocidad de la luz.',
  'lightW.sp.row.catalog': 'Valor del catálogo SDSS para esta estrella',
  'lightW.sp.value.catalog':
    'z = {z}, es decir {v}; un ajuste de una plantilla a todo el espectro, no a esta línea sola',
  'lightW.sp.row.cite': 'Fuentes',
  'lightW.sp.value.cite':
    'Espectros: SDSS DR18 (Almeida et al. 2023); lista de líneas: NIST Atomic Spectra Database, longitudes de onda en el vacío según Morton 2000; medición: nodo de línea espectral de Gravitas',
  'lightW.line.h-alpha': 'H-alfa',
  'lightW.line.h-beta': 'H-beta',
  'lightW.line.h-gamma': 'H-gamma',
  'lightW.line.h-delta': 'H-delta',
  'lightW.line.ca2-k': 'Ca II K',
  'lightW.line.ca1-4227': 'Ca I 4227',
  'lightW.line.na1-d2': 'Na I D2',
  'lightW.line.mg1-b2': 'Mg I b2',
};
