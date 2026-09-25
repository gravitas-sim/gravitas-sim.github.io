// =============================================================================
// El panel de ajuste del observatorio, en español
// -----------------------------------------------------------------------------
// The Spanish shadow of js/i18n/en.inference.js, registered with it.
// =============================================================================

export const ES_INFERENCE = {
  'obs.fit.intro':
    'Ajusta la serie a la vista con un tránsito o una órbita, en procesos en segundo plano, por mínimos cuadrados ponderados: una rejilla acotada y después un refinamiento. Cada incertidumbre que da el ajuste se muestra por separado, con lo que supone.',
  'obs.fit.model': 'Modelo',
  'obs.fit.model.transit-quadratic':
    'Un tránsito (órbita circular, oscurecimiento al limbo cuadrático)',
  'obs.fit.model.rv-keplerian': 'Una órbita de velocidad radial (kepleriana)',
  'obs.fit.exposure': 'Exposición de cada punto ({unit})',
  'obs.fit.dilution': 'Parte de la luz que viene de otras estrellas, de 0 a 1',
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
  'obs.fit.cancel': 'Cancelar',
  'obs.fit.export': 'Guardar el ajuste (JSON)',
  'obs.fit.running': 'Ajustando…',
  'obs.fit.done': 'Ajustado en {seconds} s.',
  'obs.fit.failed': 'El ajuste no terminó ({status}). {why}',
  'obs.fit.canceled': 'cancelado por el lector',
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
  'obs.fit.param.depth': 'Profundidad en mitad del tránsito',
  'obs.fit.param.T14': 'Duración total',
  'obs.fit.param.inclination': 'Inclinación',
  'obs.fit.param.u1': 'Oscurecimiento al limbo u1',
  'obs.fit.param.u2': 'Oscurecimiento al limbo u2',
  'obs.fit.param.Rp': 'Radio del planeta',
  'obs.fit.param.e': 'Excentricidad',
  'obs.fit.param.omega': 'Argumento del periastro',
};
