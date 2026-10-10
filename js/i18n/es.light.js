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
  'lightW.kf.title': 'Demostrador de Kirchhoff',
  'lightW.kf.note':
    'Un cuerpo negro caliente, una nube de gas de hidrógeno, un detector. Pon la fuente detrás de la nube, o mira la nube sola, y fija las dos temperaturas y cuánto gas hay. El detector ve lo que dice la física: la luz que la nube quita a la fuente, más el brillo propio de la nube.',
  'lightW.kf.control.mode': 'Lo que mira el detector',
  'lightW.kf.control.Ts': 'Temperatura de la fuente',
  'lightW.kf.control.Tc': 'Temperatura de la nube',
  'lightW.kf.control.tau': 'Gas en la nube (profundidad óptica de cada línea)',
  'lightW.kf.mode.both': 'la fuente, a través de la nube',
  'lightW.kf.mode.cloud': 'la nube sola',
  'lightW.kf.mode.source': 'la fuente sola',
  'lightW.kf.view.zoom': 'acercar a H-alfa',
  'lightW.kf.preset.source': 'Un sólido caliente, sin nube',
  'lightW.kf.preset.cool': 'Una nube fría delante de una fuente más caliente',
  'lightW.kf.preset.hot': 'Una nube caliente, sin fuente detrás',
  'lightW.kf.tag': 'Calculado: un modelo, no una medición',
  'lightW.kf.axisYAll': 'brillo, escalado al mayor de la vista',
  'lightW.kf.axisYZoom': 'brillo ÷ el continuo junto a la línea',
  'lightW.kf.axisYCloud': 'brillo ÷ el cuerpo negro de la propia nube',
  'lightW.kf.value.kind':
    'Calculado: una nube uniforme de hidrógeno delante de un cuerpo negro, con la ecuación de transferencia',
  'lightW.kf.row.sees': 'Lo que ve el detector',
  'lightW.kf.case.continuum':
    'Un continuo liso y ninguna línea: una fuente caliente y densa',
  'lightW.kf.case.absorption':
    'Un continuo con líneas oscuras de absorción: la nube está más fría que la fuente',
  'lightW.kf.case.bright':
    'Un continuo con líneas brillantes de emisión encima: la nube está más caliente que la fuente',
  'lightW.kf.case.none':
    'Un continuo liso y ninguna línea: la nube y la fuente tienen la misma temperatura',
  'lightW.kf.case.emission':
    'Líneas brillantes de emisión sobre un fondo oscuro: un gas caliente y tenue visto solo',
  'lightW.kf.row.centre':
    'En el centro de H-alfa, brillo respecto del de la fuente',
  'lightW.kf.row.ratio':
    'El cuerpo negro de la nube en H-alfa respecto del de la fuente: dónde termina una línea gruesa',
  'lightW.kf.row.ew': 'Ancho equivalente de H-alfa (positivo es absorción)',
  'lightW.kf.value.how':
    'El nodo de medición ajusta un continuo recto por las dos ventanas grises junto a la línea y suma lo que la línea quita dentro de la ventana teñida. Un ancho negativo es una línea que añade luz. El modelo no tiene ruido, así que no se imprime incertidumbre.',
  'lightW.kf.row.boltz':
    'Átomos de hidrógeno en n = 2 respecto de n = 1 a la temperatura de la nube (un modelo)',
  'lightW.kf.value.boltz':
    '{r}, solo con el factor de Boltzmann; deja fuera la ionización, así que sigue subiendo donde las líneas de Balmer reales se debilitan',
  'lightW.kf.value.cite':
    'Ecuación de transferencia para una capa sin dispersión; función de Planck del núcleo de radiación de Gravitas; longitudes de onda de Balmer de la lista de líneas (NIST ASD, Morton 2000); los anchos de línea y la igualdad de intensidades son simplificaciones didácticas',
};
