// =============================================================================
// Las palabras de los instrumentos de interiores, en español
// -----------------------------------------------------------------------------
// Las registra js/interiorsWidgets.js al cargar la familia. Ids intW.*; las
// mismas claves están en en.interiors.js.
// =============================================================================

export const ES_INTERIORS = {
  'intW.row.source': 'Qué es esto',
  'intW.row.how': 'Qué se deja fuera',
  'intW.p.title': 'Dentro de una estrella: un politropo',
  'intW.p.note':
    'Una estrella cuya presión sigue P = K ρ^(1 + 1/n), construida con la ecuación de Lane-Emden. Las curvas van del centro (izquierda) a la superficie (derecha): densidad (azul), presión (naranja), temperatura de un gas ideal (discontinua) y la fracción de la masa que hay dentro de ese radio (gris). El punto es el radio que contiene la mitad de la masa.',
  'intW.p.control.n': 'Índice politrópico n',
  'intW.p.control.mass': 'Masa de la estrella',
  'intW.p.control.radius': 'Radio de la estrella',
  'intW.p.preset.sun': 'El Sol como n = 3 (Eddington)',
  'intW.p.preset.dwarf': 'Una enana roja como n = 3/2',
  'intW.p.preset.uniform': 'Densidad uniforme, n = 0',
  'intW.p.preset.centred': 'Muy condensada en el centro, n = 4,5',
  'intW.p.axisR': 'radio, como fracción del de la estrella',
  'intW.p.axisY': 'fracción del valor central (o de la masa)',
  'intW.p.legend': 'densidad · presión · temperatura · masa interior',
  'intW.p.value.source':
    'Un modelo: un politropo del índice que elijas, escalado a una masa y un radio',
  'intW.p.value.how':
    'Sin generación de energía, opacidad ni convección (fijarían el índice y el radio, no se siguen de ellos); la temperatura supone un gas ideal con peso molecular medio 0,6, así que falla por encima de unas 10 masas solares, donde importa la presión de radiación',
  'intW.p.row.n': 'Índice politrópico n',
  'intW.p.row.mass': 'Masa',
  'intW.p.row.radius': 'Radio',
  'intW.p.row.xi1': 'Radio adimensional ξ₁ (primer cero de θ)',
  'intW.p.row.massConst': 'Masa adimensional −ξ₁² θ′(ξ₁)',
  'intW.p.row.ratio': 'Densidad central dividida por la densidad media',
  'intW.p.row.rhoMean': 'Densidad media',
  'intW.p.row.rhoC': 'Densidad central',
  'intW.p.row.pC': 'Presión central',
  'intW.p.row.tC': 'Temperatura central',
  'intW.p.row.half':
    'Radio que contiene la mitad de la masa, como fracción del de la estrella',
  'intW.p.row.approx': 'Qué aproxima',
  'intW.p.approx.0':
    'Nada real: una bola uniforme, el límite de un fluido incompresible',
  'intW.p.approx.low':
    'Una estrella totalmente convectiva (una enana roja) o una enana blanca de poca masa',
  'intW.p.approx.mid':
    'Una estrella como el Sol o más caliente, donde la radiación lleva la energía: n = 3 es el modelo estándar de Eddington',
  'intW.p.approx.high':
    'Una estrella muy condensada en el centro: un núcleo denso en una envoltura tenue, como una gigante',
  'intW.w.title': 'Enanas blancas: masa y radio',
  'intW.w.note':
    'Una enana blanca sostenida por un gas frío de electrones degenerados (la ecuación de estado de Chandrasekhar), integrada hacia fuera desde la densidad central que elijas. La curva son todas esas estrellas; el punto es la tuya; la línea discontinua es la masa a la que se acerca la curva sin pasarla. No se dibuja ninguna enana blanca observada.',
  'intW.w.control.rho': 'Densidad central',
  'intW.w.control.muE': 'Nucleones por electrón, μₑ',
  'intW.w.preset.light': 'Una enana de baja densidad',
  'intW.w.preset.typical': 'Una enana típica, 0,6 masas solares',
  'intW.w.preset.heavy': 'Una enana densa cerca del límite',
  'intW.w.preset.hydrogen': 'Una estrella de hidrógeno hipotética, μₑ = 1',
  'intW.w.axisM': 'masa, masas solares',
  'intW.w.axisR': 'radio, radios solares (log)',
  'intW.w.legend': 'todas las enanas · la tuya · el límite',
  'intW.w.value.source':
    'Un modelo: un gas de electrones degenerado, frío e ideal, los iones solo aportan la masa, sin correcciones',
  'intW.w.value.how':
    'Las interacciones de Coulomb entre iones y electrones, las capas de composición, la temperatura finita, la relatividad general y las capturas de electrones e inestabilidades que acaban con una enana real algo por debajo del límite; el radio es unos pocos por ciento demasiado grande frente a las mejores relaciones publicadas',
  'intW.w.value.rel':
    'Relativista: las velocidades de los electrones se acercan a c',
  'intW.w.value.nonrel': 'No relativista: los electrones son lentos',
  'intW.w.row.rho': 'Densidad central',
  'intW.w.row.muE': 'Nucleones por electrón μₑ',
  'intW.w.row.x': 'Momento de Fermi central, en unidades de mₑc',
  'intW.w.row.regime': 'Régimen en el centro',
  'intW.w.row.mass': 'Masa',
  'intW.w.row.radius': 'Radio',
  'intW.w.row.radiusKm': 'Radio, en kilómetros',
  'intW.w.row.mean': 'Densidad media',
  'intW.w.row.limit': 'Masa límite para este μₑ',
  'intW.w.row.fraction': 'Masa dividida por el límite',
  'intW.s.title': 'Escalar la secuencia principal',
  'intW.s.note':
    'Las estrellas de edad cero de los modelos MIST (puntos, ocho masas) frente al exponente que predice un argumento de escala (líneas: una ajustada entre 0,5 y 2 masas solares, discontinua, y otra entre 2 y 40). La escala fija la pendiente, no la altura; las líneas se deslizan para ajustarse.',
  'intW.s.control.quantity': 'Magnitud',
  'intW.s.control.opacity': 'Ley de opacidad',
  'intW.s.control.energy': 'Fuente de energía',
  'intW.s.control.model': 'Modelo de edad cero',
  'intW.s.quantity.L': 'Luminosidad',
  'intW.s.quantity.R': 'Radio',
  'intW.s.quantity.tau': 'Vida en la secuencia principal',
  'intW.s.opacity.es': 'Dispersión de electrones',
  'intW.s.opacity.kramers': 'Kramers',
  'intW.s.energy.cno': 'Ciclo CNO (empinado)',
  'intW.s.energy.pp': 'Cadena protón-protón',
  'intW.s.preset.massive': 'Luminosidad de las estrellas masivas',
  'intW.s.preset.low': 'Luminosidad de las estrellas de poca masa',
  'intW.s.preset.radius': 'Radio de las estrellas masivas',
  'intW.s.preset.life': 'Vidas',
  'intW.s.axisM': 'masa, masas solares (log)',
  'intW.s.axisY.L': 'log₁₀ de la luminosidad, solar',
  'intW.s.axisY.R': 'log₁₀ del radio, solar',
  'intW.s.axisY.tau': 'log₁₀ de la vida en la secuencia principal, años',
  'intW.s.legend':
    'modelos MIST de edad cero · exponente predicho, dos intervalos',
  'intW.s.value.source':
    'Un argumento de escala frente a estrellas modelo MIST, que son modelos, no estrellas observadas',
  'intW.s.value.how':
    'La homología supone que toda estrella es una copia a escala con una sola ley de opacidad y una sola reacción en todo su interior; las estrellas reales cambian de ambas del núcleo a la superficie y de poca masa a mucha, y eso es lo que miden los residuos',
  'intW.s.row.predicted': 'Exponente que predice la escala',
  'intW.s.row.fitLow': 'Exponente ajustado entre 0,5 y 2 masas solares',
  'intW.s.row.rmsLow':
    'Dispersión en torno al exponente predicho, de 0,5 a 2 masas solares (dex)',
  'intW.s.row.fitHigh': 'Exponente ajustado entre 2 y 40 masas solares',
  'intW.s.row.rmsHigh':
    'Dispersión en torno al exponente predicho, de 2 a 40 masas solares (dex)',
  'intW.s.row.model': 'Modelo elegido, masa',
  'intW.s.row.lum': 'Su luminosidad',
  'intW.s.row.rad': 'Su radio',
  'intW.s.row.life': 'Su vida en la secuencia principal (MIST)',
  'intW.s.row.nuclear': 'Escala de tiempo nuclear 0,007 × 0,1 M c² ÷ L',
};
