// =============================================================================
// Las palabras de los instrumentos de medición y afirmación, en español
// -----------------------------------------------------------------------------
// Las registra js/claimWidgets.js cuando carga la familia. Ids claimW.*. Las
// mismas claves están en en.claim.js. Sin lectura por una persona que lea
// español con fluidez.
// =============================================================================

export const ES_CLAIM = {
  'claimW.row.source': 'Qué es esto',
  'claimW.row.how': 'Qué se deja fuera',
  'claimW.m.title': 'Marcar una estrella',
  'claimW.m.note':
    'Un cuadro sintético con una estrella desenfocada. Cada cruz es una marca, el lugar donde una persona cuidadosa pondría su centro; el anillo es la media de las marcas. La posición verdadera de la estrella se fijó al hacer el cuadro.',
  'claimW.m.legend': 'marcas · media · posición verdadera',
  'claimW.m.control.n': 'Cuántas marcas',
  'claimW.m.control.blur': 'Ancho de la estrella',
  'claimW.m.control.offset': 'Desplazamiento de cada marca',
  'claimW.m.control.truth': 'La posición verdadera',
  'claimW.m.truth.shown': 'mostrada',
  'claimW.m.truth.hidden': 'oculta',
  'claimW.m.preset.five': 'Cinco marcas',
  'claimW.m.preset.twenty': 'Veinte marcas',
  'claimW.m.value.source':
    'Sintético: una estrella desenfocada en una posición que eligió la lección, marcada por un modelo de persona cuidadosa',
  'claimW.m.row.n': 'Marcas hechas',
  'claimW.m.row.marks': 'Las marcas, (x, y) en píxeles',
  'claimW.m.row.meanX': 'Posición x media',
  'claimW.m.row.meanY': 'Posición y media',
  'claimW.m.row.sdX': 'Dispersión de las marcas en x',
  'claimW.m.row.sdY': 'Dispersión de las marcas en y',
  'claimW.m.row.seX': 'Error estándar de x',
  'claimW.m.row.seY': 'Error estándar de y',
  'claimW.m.row.truth': 'Posición verdadera',
  'claimW.m.row.errX': 'Error de la media en x',
  'claimW.m.row.errSe': 'Ese error en errores estándar',
  'claimW.m.value.how':
    'Las marcas se dispersan al azar alrededor de un centro, sin desplazamiento salvo que se ponga uno; el ruido de cielo es solo para la imagen',
  'claimW.c.title': 'Comprobar una afirmación repitiéndola',
  'claimW.c.note':
    'Un conjunto sembrado de repeticiones de una medición cuyo valor verdadero se conoce. Cada barra es el intervalo que declara una repetición; las barras que fallan la verdad son discontinuas. La tabla las cuenta todas.',
  'claimW.c.legend':
    'intervalo que contiene la verdad · intervalo que la falla · la verdad',
  'claimW.c.control.case': 'Qué medición',
  'claimW.c.control.k': 'Semiancho del intervalo',
  'claimW.c.control.repeats': 'Repeticiones',
  'claimW.c.control.form': 'Forma del intervalo',
  'claimW.c.control.rate': 'Tasa verdadera',
  'claimW.c.case.symmetric': 'Un instrumento honesto',
  'claimW.c.case.biased': 'Un instrumento preciso y sesgado',
  'claimW.c.case.parallax': 'Una distancia a partir de un paralaje',
  'claimW.c.case.upper': 'Un límite superior sobre una cuenta',
  'claimW.c.form.symmetric': 'simétrica, llevada a primer orden',
  'claimW.c.form.asymmetric': 'asimétrica, llevada a través de la división',
  'claimW.c.value.source':
    'Sintético: repeticiones sembradas de una medición, con el valor verdadero conocido',
  'claimW.c.row.case': 'Medición',
  'claimW.c.row.repeats': 'Repeticiones contadas',
  'claimW.c.row.truth': 'Valor verdadero',
  'claimW.c.row.interval': 'Intervalo declarado',
  'claimW.c.value.interval': '± {k} σ',
  'claimW.c.value.upper': 'Un límite superior del 95 por ciento',
  'claimW.c.row.hits': 'Intervalos que contienen la verdad',
  'claimW.c.row.coverage': 'Cobertura',
  'claimW.c.row.coverageSe': 'Incertidumbre de la cobertura',
  'claimW.c.row.unbounded': 'Sin extremo superior',
  'claimW.c.row.first': 'Las cinco primeras repeticiones',
  'claimW.c.value.how':
    'La dispersión es conocida y gaussiana (o de Poisson para la cuenta); las repeticiones reales rara vez vienen con la verdad con que compararlas',
  'claimW.p.title': 'Cuando los datos no fijan un parámetro',
  'claimW.p.note':
    'Dos análisis de datos sintéticos. Uno tiene datos que solo fijan el producto de la masa de un planeta y el seno de la inclinación de su órbita; la imagen es el chi cuadrado del mejor ajuste con cada masa de prueba. El otro ajusta una recta a seis puntos.',
  'claimW.p.control.case': 'Qué análisis',
  'claimW.p.control.mass': 'Masa de prueba',
  'claimW.p.control.terms': 'Términos del ajuste',
  'claimW.p.case.product': 'un producto de dos parámetros',
  'claimW.p.case.line': 'una recta por seis puntos',
  'claimW.p.terms.line': 'una recta (dos términos)',
  'claimW.p.terms.parabola': 'una parábola (tres términos)',
  'claimW.p.axisM': 'masa de prueba, masas de Júpiter (escala logarítmica)',
  'claimW.p.axisChi': 'chi cuadrado del mejor ajuste',
  'claimW.p.axisX': 'x (puntos con barras de error de una sigma)',
  'claimW.p.value.source':
    'Sintético: un producto de dos parámetros, y seis puntos de una curva, con la verdad conocida',
  'claimW.p.row.product': 'Lo que fijan los datos (m × s)',
  'claimW.p.row.s': 'Mejor inclinación, el seno s, con esta masa',
  'claimW.p.row.chi': 'Chi cuadrado de ese ajuste',
  'claimW.p.row.low1': 'Masa más pequeña dentro de una subida de 1',
  'claimW.p.row.low2': 'Masa más pequeña dentro de una subida de 3,84',
  'claimW.p.row.high': 'Masa máxima',
  'claimW.p.value.lower': '{m} masas de Júpiter',
  'claimW.p.value.none': 'No acotada: sin cota superior',
  'claimW.p.row.points': 'Puntos',
  'claimW.p.row.dof': 'Grados de libertad',
  'claimW.p.row.slope': 'Pendiente',
  'claimW.p.row.curve': 'Coeficiente del término al cuadrado',
  'claimW.p.row.chi2': 'Chi cuadrado',
  'claimW.p.row.reduced': 'Chi cuadrado reducido',
  'claimW.p.row.pvalue': 'Valor p',
  'claimW.p.value.how':
    'El perfil usa la verosimilitud y ningún a priori; el caso de la recta supone los errores indicados y una curva suave',
};
