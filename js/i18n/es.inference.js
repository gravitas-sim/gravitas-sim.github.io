// =============================================================================
// El panel de ajuste del observatorio, en español
// -----------------------------------------------------------------------------
// The Spanish shadow of js/i18n/en.inference.js, registered with it.
// =============================================================================

export const ES_INFERENCE = {
  'obs.fit.intro':
    'Ajusta la serie a la vista con un tránsito o una órbita, o una tabla con una recta, una parábola o una ley de potencias, en procesos en segundo plano, por mínimos cuadrados ponderados: una rejilla acotada y después un refinamiento. Cada incertidumbre que da el ajuste se muestra por separado, con lo que supone.',
  'obs.fit.model': 'Modelo',
  'obs.fit.model.transit-quadratic':
    'Un tránsito (órbita circular, oscurecimiento al limbo cuadrático)',
  'obs.fit.model.rv-keplerian': 'Una órbita de velocidad radial (kepleriana)',
  'obs.fit.model.poly-1': 'Una recta (y frente a x)',
  'obs.fit.model.poly-2': 'Una parábola (y frente a x)',
  'obs.fit.model.power-law': 'Una ley de potencias (y = A x^p)',
  'obs.fit.center': 'Centro de x, x0 ({unit})',
  'obs.fit.exposure': 'Exposición de cada punto ({unit})',
  'obs.fit.dilution': 'Parte de la luz que viene de otras estrellas, de 0 a 1',
  'obs.fit.stellarRadius':
    'El radio de la estrella, en radios solares (adoptado, para el del planeta)',
  'obs.fit.stellarRadiusSigma': 'Su incertidumbre, en radios solares',
  'obs.fit.supersample': 'Muestras a lo largo de cada exposición',
  'obs.fit.profiles': 'Perfilar cada parámetro ajustado (más lento)',
  'obs.fit.device':
    'Este dispositivo cuenta como {profile}: hasta {realms} procesos.',
  'obs.fit.profile.low-end': 'de gama baja',
  'obs.fit.profile.desktop': 'un ordenador de escritorio',
  'obs.fit.paramsCaption':
    'Parámetros: ajustados dentro de sus límites, o fijados en un valor',
  'obs.fit.col.parameter': 'Parámetro',
  'obs.fit.col.mode': 'Ajustado o fijo',
  'obs.fit.col.lo': 'Límite inferior',
  'obs.fit.col.hi': 'Límite superior',
  'obs.fit.col.value': 'Inicio, o valor fijo',
  'obs.fit.modeOf': 'Si {name} se ajusta o se fija',
  'obs.fit.LoOf': 'Límite inferior de {name}',
  'obs.fit.HiOf': 'Límite superior de {name}',
  'obs.fit.ValueOf': 'Valor inicial o fijo de {name}',
  'obs.fit.fitted': 'ajustado',
  'obs.fit.fixed': 'fijo',
  'obs.fit.derived': 'derivado',
  'obs.fit.run': 'Ajustar',
  'obs.fit.empty':
    'Aún no hay ajuste. Elige un modelo arriba y pulsa Ajustar; el resultado y sus incertidumbres aparecen aquí.',
  'obs.fit.cancel': 'Cancelar',
  'obs.fit.export': 'Guardar el ajuste (JSON)',
  'obs.fit.keep': 'Guardar el ajuste en el cuaderno',
  'obs.fit.nb.title': 'Ajuste: {model}',
  'obs.fit.nb.added':
    'Guardado en el cuaderno de evidencia, con el resumen de las filas que leyó.',
  'obs.fit.nb.failed': 'No se pudo guardar en el cuaderno: {why}.',
  'obs.fit.running': 'Ajustando…',
  'obs.fit.done': 'Ajustado en {seconds} s.',
  'obs.fit.failed': 'El ajuste no terminó ({status}). {why}',
  'obs.fit.canceled': 'cancelado por el lector',
  'obs.fit.refuse.fewRows':
    'Un ajuste necesita al menos cinco filas y solo se pueden usar {rows}. Desenmascara filas o abre una tabla mayor.',
  'obs.fit.refuse.xPositive':
    'Una ley de potencias necesita que todas las x sean mayores que cero. Enmascara las filas en que x es cero o negativa, o elige otro modelo.',
  'obs.fit.refuse.tooManyRows':
    '{rows} filas son más de las que ajusta este dispositivo (como máximo {max}).',
  'obs.fit.refuse.tooManyEvaluations':
    'Harían falta unas {evaluations} evaluaciones del modelo, más de las que se piden a este dispositivo ({max}). Fija algunos parámetros o deja fuera los perfiles.',
  'obs.fit.refuse.periodRangeTooWide':
    'El intervalo de períodos requiere unos {trials} períodos de prueba; redúcelo (como máximo {max}).',
  'obs.fit.refuse.tooSlow':
    'Tardaría unos {seconds} s en este dispositivo, más de lo que se le pide ({max} s como máximo). Fija algunos parámetros, reduce el intervalo de períodos o deja fuera los perfiles.',
  'obs.fit.estimate':
    'Unos {seconds} s en este dispositivo, y hasta {most} s si el ajuste converge despacio: {evaluations} evaluaciones del modelo sobre {rows} filas.',
  'obs.fit.res.caption':
    'El ajuste: cada parámetro y cada incertidumbre que tiene',
  'obs.fit.res.parameter': 'Parámetro',
  'obs.fit.res.kind': 'Tipo',
  'obs.fit.res.value': 'Valor',
  'obs.fit.res.sigma': 'Sigma (barras de error tal como vienen)',
  'obs.fit.res.sigmaScaled': 'Escalada por el chi cuadrado reducido',
  'obs.fit.res.sigmaRed': 'También por el ruido correlacionado',
  'obs.fit.res.profile': 'Intervalo del perfil (Delta chi cuadrado = 1)',
  'obs.fit.res.legend':
    'Sigma es la covarianza del ajuste linealizado. Es un 68 % solo si el modelo es casi lineal y las barras de error son correctas: la columna escalada supone ruido blanco y barras demasiado pequeñas; la última admite ruido correlacionado en el tiempo. El intervalo del perfil vuelve a ajustar los demás parámetros y puede ser asimétrico. Ninguno es por sí solo una región de confianza calibrada; INFERENCE_CORE.md mide con qué frecuencia contiene cada uno el valor verdadero.',
  'obs.fit.res.x': 'tiempo',
  'obs.fit.res.residual': 'residuo',
  'obs.fit.res.plotLabel': 'Residuos del ajuste, {n} puntos',
  'obs.fit.stat.chi2':
    'Chi cuadrado {chi2} con {dof} grados de libertad: reducido {reduced}.',
  'obs.fit.stat.rms': 'Dispersión de los residuos: {rms}.',
  'obs.fit.stat.beta':
    'Factor de ruido correlacionado beta: {beta} (1 para ruido blanco).',
  'obs.fit.stat.noBeta': 'Muy pocos puntos para medir el ruido correlacionado.',
  'obs.fit.stat.rows':
    'Se usan {used} de {total} filas: {masked} enmascaradas, {missing} faltan.',
  'obs.fit.stat.search':
    '{evaluations} evaluaciones del modelo; {iterations} pasos de refinamiento.',
  'obs.fit.warnTitle': 'Léase con cuidado',
  'obs.fit.notClaimed': 'Lo que este ajuste no afirma',
  'obs.fit.assumptions': 'Lo que supone',
  'obs.fit.warn.notConverged':
    'El refinamiento se detuvo antes de converger: {why}.',
  'obs.fit.warn.atBound':
    '{parameter} terminó en un límite: su intervalo es de un solo lado y su sigma no tiene sentido.',
  'obs.fit.warn.singular':
    'No se pudo calcular la covarianza: algún parámetro no está limitado por los datos.',
  'obs.fit.warn.degenerate':
    '{a} y {b} son casi degenerados (correlación {correlation}): los datos limitan mejor una combinación de ambos que cada uno.',
  'obs.fit.warn.unweighted':
    'Los datos no tienen barras de error, así que el ajuste no está ponderado y la dispersión ocupa su lugar.',
  'obs.fit.warn.scaled':
    'El chi cuadrado reducido es {reduced}: las barras de error son menores que la dispersión, y las incertidumbres escaladas lo tienen en cuenta.',
  'obs.fit.warn.correlatedNoise':
    'Los residuos están correlacionados en el tiempo (beta {beta}): la última columna de incertidumbre lo tiene en cuenta; las demás no.',
  'obs.fit.warn.droppedNoUncertainty':
    'Se dejaron fuera {rows} filas sin una barra de error positiva.',
  'obs.fit.warn.notDetected':
    'No se detecta ningún tránsito por encima del ruido (señal/ruido {snr}): el ajuste no es identificable y sus números describen ruido.',
  'obs.fit.warn.noExposure':
    'No se indica exposición, así que cada punto se modela como un instante.',
  'obs.fit.warn.timeUnitAssumed':
    'La columna de tiempo no indica una unidad de tiempo, así que la búsqueda del período la tomó en días.',
  'obs.fit.param.t0': 'Instante de mitad de tránsito',
  'obs.fit.param.P': 'Período',
  'obs.fit.param.k': 'Cociente de radios Rp/R*',
  'obs.fit.param.aRs': 'Distancia escalada a/R*',
  'obs.fit.param.b': 'Parámetro de impacto',
  'obs.fit.param.q1': 'Oscurecimiento al limbo q1',
  'obs.fit.param.q2': 'Oscurecimiento al limbo q2',
  'obs.fit.param.tc': 'Instante de conjunción',
  'obs.fit.param.K': 'Semiamplitud K',
  'obs.fit.param.sqrtEcosw': '√e cos ω',
  'obs.fit.param.sqrtEsinw': '√e sen ω',
  'obs.fit.param.jitter': 'Jitter',
  'obs.fit.param.c0': 'Valor en el centro',
  'obs.fit.param.c1': 'Pendiente en el centro',
  'obs.fit.param.c2': 'Término de curvatura',
  'obs.fit.param.A': 'Valor en x = 1',
  'obs.fit.param.p': 'Exponente',
  'obs.fit.param.depth': 'Profundidad en mitad del tránsito',
  'obs.fit.param.T14': 'Duración total',
  'obs.fit.param.inclination': 'Inclinación',
  'obs.fit.param.u1': 'Oscurecimiento al limbo u1',
  'obs.fit.param.u2': 'Oscurecimiento al limbo u2',
  'obs.fit.param.Rp': 'Radio del planeta',
  'obs.fit.param.e': 'Excentricidad',
  'obs.fit.param.omega': 'Argumento del periastro',

  // Comparar ajustes (js/analysis/modelCompare.js), y las correlaciones.
  'obs.fit.cmp.title': 'Comparar los ajustes',
  'obs.fit.cmp.intro':
    'Aquí aparece cada ajuste hecho. Elige dos o más de las mismas filas y se comparan con ellos, además, una constante (sin señal). Las cifras dicen qué modelo prefieren los datos y por cuánto; ninguna es la probabilidad de que un modelo sea cierto.',
  'obs.fit.cmp.label': 'Ajuste {n}: {model}, todos los parámetros libres',
  'obs.fit.cmp.labelFixed': 'Ajuste {n}: {model}, con {fixed}',
  'obs.fit.cmp.run': 'Comparar los ajustes elegidos',
  'obs.fit.cmp.constant': 'Una constante (sin señal)',
  'obs.fit.cmp.caption':
    'Los ajustes a {n} filas, según los criterios de información de Akaike y bayesiano. Menor es mejor; el peso es el apoyo relativo solo entre estos modelos.',
  'obs.fit.cmp.nestedCaption':
    'Cada modelo que es otro con parámetros fijados: el estadístico de razón de verosimilitudes, sus grados de libertad y la probabilidad de un estadístico así de grande si el modelo más sencillo fuera el correcto.',
  'obs.fit.cmp.residualCaption':
    'Lo que deja cada modelo: la dispersión en unidades de las incertidumbres (1 para un modelo que ajusta), la parte más allá de tres, un test de rachas de los signos (más allá de ±2 hay estructura) y la correlación con desfase uno.',
  'obs.fit.cmp.pBoundary': '{p}, conservador',
  'obs.fit.cmp.col.model': 'Modelo',
  'obs.fit.cmp.col.k': 'Números ajustados k',
  'obs.fit.cmp.col.chi2': 'χ²',
  'obs.fit.cmp.col.m2lnL': '−2 ln L',
  'obs.fit.cmp.col.aic': 'AIC',
  'obs.fit.cmp.col.daic': 'ΔAIC',
  'obs.fit.cmp.col.weight': 'Peso de Akaike',
  'obs.fit.cmp.col.bic': 'BIC',
  'obs.fit.cmp.col.dbic': 'ΔBIC',
  'obs.fit.cmp.col.simpler': 'Más sencillo',
  'obs.fit.cmp.col.fuller': 'Más completo',
  'obs.fit.cmp.col.delta': 'Δ(−2 ln L)',
  'obs.fit.cmp.col.df': 'Grados de libertad',
  'obs.fit.cmp.col.p': 'p',
  'obs.fit.cmp.col.rms': 'Dispersión / incertidumbre',
  'obs.fit.cmp.col.beyond3': 'Más allá de 3',
  'obs.fit.cmp.col.runsZ': 'z del test de rachas',
  'obs.fit.cmp.col.lag1': 'Correlación con desfase uno',
  'obs.fit.cmp.col.beta': 'β de ruido rojo',
  'obs.fit.cmp.preferred.none':
    'Los datos no eligen: {aic} tiene el AIC más bajo, pero otro modelo está a menos de 2, y ambos tienen un apoyo considerable.',
  'obs.fit.cmp.preferred.weak':
    'Se prefiere {aic}, débilmente: el siguiente modelo está de 2 a 4 por encima en AIC.',
  'obs.fit.cmp.preferred.positive':
    'Se prefiere {aic}: el siguiente modelo está de 4 a 10 por encima en AIC, con bastante menos apoyo.',
  'obs.fit.cmp.preferred.strong':
    'Se prefiere claramente {aic}: todos los demás modelos están más de 10 por encima en AIC.',
  'obs.fit.cmp.refused.otherData':
    '{label} se ajustó a otras filas (otra máscara u otra observación), así que su verosimilitud es de otros datos y se deja fuera.',
  'obs.fit.cmp.refused.notFitted': '{label} no terminó y se deja fuera.',
  'obs.fit.cmp.warn.criteriaDisagree':
    'El AIC prefiere {aic} y el BIC prefiere {bic}. El BIC penaliza más cada número ajustado cuando hay muchos datos; si discrepan, los parámetros adicionales solo mejoran algo el ajuste.',
  'obs.fit.cmp.warn.scaledErrors':
    'Un ajuste reescaló sus incertidumbres para que χ² igualara sus grados de libertad. Los criterios usan las incertidumbres declaradas, que entonces son demasiado pequeñas, y favorecen el modelo con más parámetros.',
  'obs.fit.cmp.warn.unweighted':
    'Los datos no tienen incertidumbres, así que el nivel de ruido es un número ajustado más en cada modelo, estimado a partir de sus propios residuos.',
  'obs.fit.cmp.warn.poorBest':
    'Incluso el modelo preferido, {label}, deja un χ² reducido de {reducedChi2}: el mejor de estos modelos no describe los datos dentro de sus incertidumbres.',
  'obs.fit.cmp.warn.structuredResiduals':
    'Los residuos del modelo preferido tienen estructura (z del test de rachas = {z}): hay algo en los datos que no está en ninguno de estos modelos.',
  'obs.fit.cmp.warn.degenerate':
    '{label} tiene dos parámetros que los datos solo fijan juntos (mira sus correlaciones): sus mejores valores no son identificables uno a uno.',
  'obs.fit.cmp.warn.atBound':
    '{label} terminó con un parámetro en el borde de su intervalo: su verosimilitud puede ser mayor fuera de él.',
  'obs.fit.cmp.warn.boundary':
    'Cuando un modelo más sencillo fija un parámetro en el borde del intervalo del modelo más completo (una profundidad o semiamplitud nula), el valor p de chi-cuadrado es conservador: el verdadero es menor, más o menos la mitad (Self y Liang 1987).',
  'obs.fit.cmp.warn.tooManyModels':
    'Solo se comparan los primeros {max} ajustes.',
  'obs.fit.cmp.warnTitle': 'Léelo con cuidado',
  'obs.fit.cmp.noWarnings': 'Nada en esta comparación pide cautela.',
  'obs.fit.cmp.methods':
    'Comparación {tool} {version}. −2 ln L se calcula a partir de los residuos de cada ajuste y las incertidumbres de los datos, con el jitter del ajuste sumado en cuadratura cuando lo tiene; k es el número de valores que eligió el ajuste (sus filas menos sus grados de libertad). AIC = −2 ln L + 2k (Akaike 1974), AICc su corrección para muestras pequeñas (Hurvich y Tsai 1989), BIC = −2 ln L + k ln n (Schwarz 1978); los pesos de Akaike y la fuerza de la preferencia siguen a Burnham y Anderson (2002). Los modelos anidados se contrastan con la razón de verosimilitudes frente a chi-cuadrado (Wilks 1938). Solo se comparan ajustes a las mismas filas con las mismas incertidumbres.',
  'obs.fit.cmp.export': 'Guardar la comparación (JSON)',
  'obs.fit.corr.title': 'Qué parámetros separan los datos',
  'obs.fit.corr.caption':
    'Las correlaciones de las estimaciones de los parámetros ajustados, en el mejor ajuste.',
  'obs.fit.corr.strong': '(fuerte)',
  'obs.fit.corr.legend':
    'Una correlación cercana a +1 o −1 significa que los datos fijan una combinación de los dos, no cada uno: subir uno y cambiar el otro ajusta casi igual de bien. Sus incertidumbres por separado son entonces mayores de lo que parecen, y lo que los separa son más datos de otro tipo.',
  'obs.fit.truth.title': 'Comparar con la verdad',
  'obs.fit.truth.caption':
    'Lo que produjo esta observación sintética, junto a lo que recuperó el ajuste.',
  'obs.fit.truth.col.truth': 'Valor de entrada (verdad)',
  'obs.fit.truth.col.recovered': 'Recuperado',
  'obs.fit.truth.col.sigma': 'Su incertidumbre',
  'obs.fit.truth.col.pull': 'Diferencia en sigmas',
  'obs.fit.truth.col.within': 'Verdad dentro de 1 sigma',
  'obs.fit.truth.yes': 'sí',
  'obs.fit.truth.no': 'no',
  'obs.fit.truth.unfitted': 'Este ajuste no los estimó: {list}.',
  'obs.fit.truth.legend':
    'La verdad se conoce solo porque Gravitas hizo los datos; una observación real no la tiene. Si el modelo es correcto y el ruido es el declarado, la verdad queda dentro de una sigma en unos dos parámetros de cada tres y dentro de dos sigmas en unos 95 de cada 100. Una diferencia mayor no es un error que ocultar: así se ven el ruido rojo, los valores atípicos o un modelo equivocado.',
  'obs.cmp.intro':
    'Superpone un modelo a los datos y muestra lo que queda. Nunca ajusta: cada número de abajo es el que se dio al modelo y dice de qué clase es. Mueve un elemento para ver qué hace.',
  'obs.cmp.source': 'Origen del modelo',
  'obs.cmp.src.system': 'Un sistema (una estrella y su planeta)',
  'obs.cmp.src.analytic': 'Un modelo con nombre y valores',
  'obs.cmp.src.inference': 'El último ajuste del panel de ajuste',
  'obs.cmp.system': 'Sistema',
  'obs.cmp.sys.hd209458': 'HD 209458 y su planeta',
  'obs.cmp.sys.sun-jupiter': 'El Sol y Júpiter',
  'obs.cmp.observed': 'Observado mediante',
  'obs.cmp.model.transit': 'una curva de luz de tránsito',
  'obs.cmp.model.radial-velocity': 'una curva de velocidad radial',
  'obs.cmp.move': 'Mover un elemento',
  'obs.cmp.reset': 'Volver al sistema tal como se dio',
  'obs.cmp.el.periodDays': 'Periodo (d)',
  'obs.cmp.el.epochDays': 'Época de la anomalía media (d)',
  'obs.cmp.el.e': 'Excentricidad',
  'obs.cmp.el.omegaDeg': 'Argumento del periastro (grados)',
  'obs.cmp.el.meanAnomalyDeg': 'Anomalía media en la época (grados)',
  'obs.cmp.el.massEarth': 'Masa del planeta (masas terrestres)',
  'obs.cmp.el.radiusEarth': 'Radio del planeta (radios terrestres)',
  'obs.cmp.el.inclinationDeg': 'Inclinación (grados)',
  'obs.cmp.el.starMassSun': 'Masa de la estrella (masas solares)',
  'obs.cmp.el.starRadiusSun': 'Radio de la estrella (radios solares)',
  'obs.cmp.el.baselineFlux': 'Flujo de referencia',
  'obs.cmp.el.systemicKmS': 'Velocidad sistémica (km/s)',
  'obs.cmp.plotLabel': 'Los datos con el modelo encima: {n} puntos.',
  'obs.cmp.resLabel': 'Residuos, los datos menos el modelo: {n} puntos.',
  'obs.cmp.res.x': 'x',
  'obs.cmp.res.residual': 'Datos menos modelo',
  'obs.cmp.stat.weighted':
    'Chi cuadrado {chi2} para {n} puntos y {dof} grados de libertad; chi cuadrado reducido {red}. Menos dos veces el logaritmo de la verosimilitud: {m2lnL}.',
  'obs.cmp.stat.plain':
    'Los datos no declaran incertidumbres, así que el objetivo es la suma de los residuos al cuadrado, {value}, con una raíz cuadrática media de {rms} en la unidad de los datos.',
  'obs.cmp.stat.dof':
    'Los grados de libertad cuentan solo los parámetros que un ajuste estimó ({fitted}); un valor puesto a mano no es uno de ellos.',
  'obs.cmp.pattern.ok':
    'Los residuos son compatibles con los errores declarados en todas las regiones de los datos.',
  'obs.cmp.pattern.head': 'Dónde falla el modelo:',
  'obs.cmp.pattern.over':
    'de {from} a {to} el modelo queda por encima de los datos',
  'obs.cmp.pattern.under':
    'de {from} a {to} el modelo queda por debajo de los datos',
  'obs.cmp.pattern.run':
    'La racha más larga de residuos con un mismo signo es de {run} puntos.',
  'obs.cmp.params': 'Lo que se dio al modelo',
  'obs.cmp.col.parameter': 'Parámetro',
  'obs.cmp.col.value': 'Valor',
  'obs.cmp.col.kind': 'Clase',
  'obs.cmp.kind.fitted': 'ajustado (un ajuste lo estimó)',
  'obs.cmp.kind.fixed': 'fijo (un ajuste lo mantuvo)',
  'obs.cmp.kind.derived': 'derivado (se sigue de los demás)',
  'obs.cmp.kind.assumed': 'supuesto (dado al modelo)',
  'obs.cmp.moved': 'movido por ti',
  'obs.cmp.table.caption': 'Los datos, el modelo y el residuo, fila por fila.',
  'obs.cmp.col.data': 'Datos',
  'obs.cmp.col.model': 'Modelo',
  'obs.cmp.col.residual': 'Residuo',
  'obs.cmp.col.normalised': 'En sigmas',
  'obs.cmp.keep': 'Añadir la comparación al cuaderno',
  'obs.cmp.kept': 'Añadido al cuaderno.',
  'obs.cmp.keepFailed': 'No se añadió: {why}',
  'obs.cmp.refused': 'No se puede comparar: {why}.',
  'obs.cmp.noFit':
    'Primero haz un ajuste en el panel de ajuste; su resultado será entonces un origen de modelo aquí.',
  'obs.cmp.cite':
    'La comparación cita los datos por un resumen de sus filas y el modelo por su identidad y valores, e indica qué números fueron ajustados, fijos, derivados o supuestos.',
};
