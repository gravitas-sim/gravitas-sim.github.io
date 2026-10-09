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
  'lightW.loading': 'cargando las bandas…',
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
};
