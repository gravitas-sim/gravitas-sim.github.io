// =============================================================================
// Las palabras de la herramienta de imágenes a curva de luz, en español
// -----------------------------------------------------------------------------
// Las registra js/observatory/imageSequence.js cuando la herramienta se abre
// por primera vez (con el traductor del Observatorio), de modo que ninguna otra
// página las carga. Identificadores obs.sq.*; el título del panel está en
// es.observatory.js (está en la página antes de que cargue la herramienta).
// El español no ha sido leído por un hablante fluido.
// =============================================================================

export const ES_IMAGESEQUENCE = {
  'obs.sq.help':
    'Convierte una pila de imágenes en una curva de luz, paso a paso. Una secuencia inventada con las imágenes del laboratorio de calibración (una estrella variable, cinco estrellas de comparación, nubes que atenúan todas las estrellas a la vez y un telescopio que se mueve un poco entre imágenes) se calibra, sus estrellas se marcan una sola vez, cada imagen se alinea con la primera, las estrellas se miden en todas las imágenes, las estrellas de comparación se eligen por su brillo y su constancia, y la variable se compara con ellas. Cada paso muestra solo sus propios números.',
  'obs.sq.limits':
    'Una secuencia tiene como máximo 256 imágenes, que se leen de una en una, y cada imagen como máximo 1.398.101 píxeles; junto a ella se guardan las tres imágenes de calibración y dos copias de trabajo. Las imágenes de aquí son sintéticas, no observadas.',
  'obs.sq.seed': 'Semilla',
  'obs.sq.frames': 'Imágenes (de 5 a 256)',
  'obs.sq.amplitude': 'Semiamplitud de la variable (magnitudes)',
  'obs.sq.period': 'Periodo de la variable (días)',
  'obs.sq.jitter': 'Movimiento del apuntado (píxeles)',
  'obs.sq.lose': 'Perder el apuntado en las imágenes 11 y 12',
  'obs.sq.vary': 'Hacer que la estrella de comparación C2 también varíe',
  'obs.sq.run': 'Ejecutar el proceso',
  'obs.sq.stop': 'Parar',
  'obs.sq.recompute': 'Usar las estrellas marcadas y ejecutar de nuevo',
  'obs.sq.exclude': 'Dejar fuera las imágenes nombradas y ejecutar de nuevo',
  'obs.sq.csv': 'Guardar la curva de luz como CSV',
  'obs.sq.keep': 'Guardar en el registro',
  'obs.sq.open': 'Abrir la curva de luz en el Observatorio',
  'obs.sq.steps': 'Pasos del proceso',
  'obs.sq.prev': 'Paso anterior',
  'obs.sq.next': 'Paso siguiente',
  'obs.sq.step.calibrate': 'Calibrar',
  'obs.sq.step.marks': 'Marcas',
  'obs.sq.step.register': 'Alinear',
  'obs.sq.step.photometry': 'Fotometría',
  'obs.sq.step.comparison': 'Estrellas de comparación',
  'obs.sq.step.lightcurve': 'Curva de luz',
  'obs.sq.stepOf': 'Paso {k} de {n}: {name}',
  'obs.sq.notReached':
    'El proceso se detuvo antes de este paso, por el motivo de arriba.',
  'obs.sq.what.calibrate':
    'A cada imagen se le resta el sesgo, se le resta la oscuridad (escalada a su exposición) y se divide por el campo plano, con imágenes maestras hechas una vez a partir de las de calibración; las cuentas pasan a electrones, y un píxel que sobresale mucho de sus vecinos, aislado (un rayo cósmico), se reemplaza. Es la reducción del propio laboratorio de calibración, no una nueva.',
  'obs.sq.what.marks':
    'Las estrellas se buscan una sola vez, en la primera imagen, con el buscador de fuentes; el ancho de una estrella se mide en las más brillantes, y de él salen la apertura y el anillo de cielo. La estrella variable es la que estás midiendo; las demás son marcas que los pasos siguientes llevan de imagen en imagen.',
  'obs.sq.what.register':
    'En cada una de las otras imágenes se buscan sus propias fuentes brillantes, se vota el desplazamiento en el que coinciden más pares de estrellas, y se ajustan un desplazamiento y un pequeño giro a las estrellas que coinciden. Una imagen que no se puede alinear se nombra, y no se hace curva de luz de una secuencia con una imagen así a menos que la dejes fuera.',
  'obs.sq.what.photometry':
    'Cada marca se mide en cada imagen en su lugar alineado: la luz dentro de un círculo con bordes de píxel exactos, el cielo en un anillo a su alrededor, y el error con la ecuación del CCD, añadiendo el ruido de la oscuridad y de las propias imágenes de calibración.',
  'obs.sq.what.comparison':
    'Una estrella de comparación no debe variar. Cada candidata se compara con todas las demás sumadas; una estrella cuya dispersión es mucho mayor de lo que permiten sus errores (una probabilidad inferior a una entre mil) se marca y se deja fuera, y la prueba se repite sin ella. Se usan las estrellas constantes más brillantes, hasta cinco; marca las que prefieras y ejecuta de nuevo para cambiar la elección.',
  'obs.sq.what.lightcurve':
    'La luz de la variable se divide por la luz de las estrellas de comparación, así que las nubes que atenúan todas las estrellas a la vez se cancelan, y se forma la diferencia de magnitudes con su error. Se ajusta una sinusoide para el periodo y la semiamplitud; sus errores son los del ajuste, ensanchados si la sinusoide deja más dispersión de la que dicen los errores.',
  'obs.sq.quantities': 'Lo que midió este paso',
  'obs.sq.col.quantity': 'Magnitud',
  'obs.sq.col.value': 'Valor',
  'obs.sq.col.error': 'Error',
  'obs.sq.col.kind': 'Clase',
  'obs.sq.col.frame': 'Imagen',
  'obs.sq.col.time': 'Tiempo (días)',
  'obs.sq.col.dm': 'Magnitud diferencial',
  'obs.sq.col.sigma': 'Error',
  'obs.sq.col.dx': 'Desplazamiento en x',
  'obs.sq.col.dy': 'Desplazamiento en y',
  'obs.sq.col.turn': 'Giro (grados)',
  'obs.sq.col.matched': 'Estrellas coincidentes',
  'obs.sq.col.rms': 'Residuo rms',
  'obs.sq.col.status': 'Estado',
  'obs.sq.col.use': 'Usar',
  'obs.sq.col.star': 'Estrella',
  'obs.sq.col.x': 'x',
  'obs.sq.col.y': 'y',
  'obs.sq.col.flux': 'Luz (electrones)',
  'obs.sq.col.snr': 'Señal a ruido',
  'obs.sq.col.chi2red': 'Constancia (chi cuadrado reducido)',
  'obs.sq.kind.measured': 'medida',
  'obs.sq.kind.derived': 'derivada',
  'obs.sq.kind.assumed': 'supuesta',
  'obs.sq.q.frames': 'imágenes usadas',
  'obs.sq.q.masterBias': 'imágenes de sesgo en la maestra',
  'obs.sq.q.masterDark': 'imágenes de oscuridad en la maestra',
  'obs.sq.q.masterFlat': 'imágenes de campo plano en la maestra',
  'obs.sq.q.extraVariance':
    'ruido que añaden las maestras, por píxel (electrones al cuadrado)',
  'obs.sq.q.cosmicPixels':
    'píxeles reemplazados como rayos cósmicos, todas las imágenes',
  'obs.sq.q.cosmicMax': 'más píxeles reemplazados en una imagen',
  'obs.sq.q.marks': 'estrellas marcadas',
  'obs.sq.q.fwhm': 'ancho de una estrella, FWHM',
  'obs.sq.q.r': 'radio de la apertura',
  'obs.sq.q.rIn': 'anillo de cielo, radio interior',
  'obs.sq.q.rOut': 'anillo de cielo, radio exterior',
  'obs.sq.q.reference': 'imagen de referencia (contada desde 0)',
  'obs.sq.q.registered': 'imágenes alineadas',
  'obs.sq.q.refused': 'imágenes que no se pudieron alinear',
  'obs.sq.q.shiftRms': 'movimiento del apuntado, rms',
  'obs.sq.q.shiftMax': 'mayor desplazamiento',
  'obs.sq.q.residualRms': 'residuo de las estrellas coincidentes, rms',
  'obs.sq.q.stars': 'estrellas medidas',
  'obs.sq.q.complete': 'estrellas medidas en todas las imágenes',
  'obs.sq.q.targetSnr': 'señal a ruido de la variable (mediana)',
  'obs.sq.q.refusedTarget': 'imágenes donde no se pudo medir la variable',
  'obs.sq.q.chosen': 'estrellas de comparación usadas',
  'obs.sq.q.flagged': 'estrellas de comparación marcadas como inconstantes',
  'obs.sq.q.starStability': '{id}: constancia (chi cuadrado reducido)',
  'obs.sq.q.period': 'periodo',
  'obs.sq.q.amplitude': 'semiamplitud',
  'obs.sq.q.meanMagnitude': 'magnitud diferencial media',
  'obs.sq.q.chi2red': 'chi cuadrado reducido de la sinusoide',
  'obs.sq.q.constantP':
    'probabilidad de que una estrella constante se disperse tanto',
  'obs.sq.q.points': 'puntos de la curva de luz',
  'obs.sq.q.lc.t': 'imagen {frame}: tiempo',
  'obs.sq.q.lc.m': 'imagen {frame}: magnitud diferencial',
  'obs.sq.w.fewBias':
    'Solo {n} imágenes de sesgo hicieron la maestra; será ruidosa.',
  'obs.sq.w.alreadyCalibrated':
    'Estas imágenes ya estaban calibradas; no se restó nada.',
  'obs.sq.w.psfFallback':
    'No se pudo medir el ancho de una estrella ({reason}); se supuso un ancho de 3 píxeles.',
  'obs.sq.w.registrationRefused':
    'La imagen {frame} no se pudo alinear ({reason}): coincidieron {matched} estrellas.',
  'obs.sq.w.registrationOff':
    'Se desactivó el alineado: todas las imágenes se toman como apuntadas igual.',
  'obs.sq.w.incompleteStar':
    'La estrella {star} no se pudo medir en {frames} imágenes, así que no es candidata de comparación.',
  'obs.sq.w.targetRefused':
    'La variable no se pudo medir en la imagen {frame} ({reason}).',
  'obs.sq.w.unstableUsed':
    'La estrella {star} se marcó como inconstante y se usa de todos modos, porque la elegiste.',
  'obs.sq.w.stabilityNotRun':
    'Solo {candidates} candidatas: son pocas para comprobar si alguna varía.',
  'obs.sq.w.singleComparison':
    'Una sola estrella de comparación: su propio ruido entra en cada punto.',
  'obs.sq.w.untestedAfterRemoval':
    'La estrella {star} ya no se pudo comprobar tras quitar una estrella inconstante.',
  'obs.sq.w.scaledUncertainty':
    'La sinusoide deja más dispersión de la que dicen los errores (chi cuadrado reducido {chi2red}), así que sus errores se ensancharon.',
  'obs.sq.w.notVariable':
    'La curva es compatible con una estrella constante (probabilidad {p}); un periodo aquí no es prueba de variación.',
  'obs.sq.w.noAmplitude':
    'La amplitud ajustada es cero, así que el periodo no tiene error indicado.',
  'obs.sq.w.weakAmplitude':
    'La amplitud es menor que tres veces su error: el periodo no está bien determinado.',
  'obs.sq.perFrame': 'Desplazamiento de cada imagen',
  'obs.sq.reg.ok': 'alineada',
  'obs.sq.reg.no-match': 'ninguna estrella coincide',
  'obs.sq.reg.too-few': 'coinciden muy pocas estrellas',
  'obs.sq.reg.residual':
    'las estrellas no encajan en un desplazamiento y un giro',
  'obs.sq.reg.degenerate': 'estrellas demasiado juntas',
  'obs.sq.reg.malformed': 'posiciones inutilizables',
  'obs.sq.chooser': 'Candidatas a estrella de comparación',
  'obs.sq.useStar': 'Usar la estrella {id} como estrella de comparación',
  'obs.sq.stab.stable': 'constante',
  'obs.sq.stab.unstable': 'inconstante',
  'obs.sq.stab.untested': 'sin comprobar',
  'obs.sq.progress': 'Imagen {k} de {n}…',
  'obs.sq.stopped': 'Parado.',
  'obs.sq.axis.time': 'Tiempo',
  'obs.sq.axis.dm': 'Magnitud diferencial',
  'obs.sq.axis.sigma': 'Magnitud diferencial, error',
  'obs.sq.model': 'Sinusoide ajustada',
  'obs.sq.plot':
    'La magnitud diferencial de la estrella variable en cada imagen con sus barras de error, y la sinusoide ajustada. Más débil es más grande.',
  'obs.sq.table': 'Puntos de la curva de luz',
  'obs.sq.fit':
    'Chi cuadrado reducido de la sinusoide {chi2red}; probabilidad de que una estrella constante se disperse tanto, {p}.',
  'obs.sq.comparisonUsed': 'Estrellas de comparación usadas: {stars}.',
  'obs.sq.asymptotic':
    'El error del periodo es el asintótico de una sinusoide, y solo es una buena guía cuando la amplitud es varias veces su propio error.',
  'obs.sq.said.done':
    'Curva de luz de {points} imágenes: periodo {period} ± {sigmaPeriod} días, semiamplitud {amplitude} ± {sigmaAmplitude} magnitudes.',
  'obs.sq.said.constant':
    '{points} imágenes; la curva es compatible con una estrella constante. La mejor sinusoide tiene un periodo de {period} ± {sigmaPeriod} días y una semiamplitud de {amplitude} ± {sigmaAmplitude} magnitudes, lo que no es prueba de variación.',
  'obs.sq.said.csv': 'Guardada una tabla de {n} filas.',
  'obs.sq.said.opened': 'La curva de luz está abierta en el Observatorio.',
  'obs.sq.said.kept': 'La curva de luz se guardó en el registro.',
  'obs.sq.said.keepFailed': 'No se pudo guardar en el registro: {why}',
  'obs.sq.obsTitle': 'Curva de luz de imágenes sintéticas (semilla {seed})',
  'obs.sq.ledgerEntry': 'Curva de luz de imágenes (semilla {seed})',
  'obs.sq.csvCol.frame': 'Imagen',
  'obs.sq.csvCol.time': 'Tiempo (d)',
  'obs.sq.csvCol.dm': 'Magnitud diferencial',
  'obs.sq.csvCol.sigma': 'Error',
  'obs.sq.csvCol.target': 'Variable (e-)',
  'obs.sq.csvCol.ensemble': 'Estrellas de comparación (e-)',
  'obs.sq.no.registration':
    'No se hizo curva de luz: las imágenes {frames} no se pudieron alinear con la primera. Mira el paso de alineado, o déjalas fuera y ejecuta de nuevo.',
  'obs.sq.no.photometry':
    'No se hizo curva de luz: la variable no se pudo medir en las imágenes {frames} (saturada, enmascarada o en el borde). Déjalas fuera y ejecuta de nuevo.',
  'obs.sq.no.no-comparison':
    'No se hizo curva de luz: no queda ninguna estrella de comparación (todas las candidatas son demasiado débiles o están marcadas como inconstantes).',
  'obs.sq.no.target-not-found':
    'La estrella variable no está entre las estrellas marcadas.',
  'obs.sq.no.no-marks':
    'No se encontró ninguna estrella en la imagen de referencia.',
  'obs.sq.no.too-many-frames':
    'Una secuencia tiene como máximo {limit} imágenes; esta tiene {count}.',
  'obs.sq.no.too-few-frames':
    'Hacen falta al menos {need} imágenes; quedan {used}.',
  'obs.sq.no.too-large':
    'Estas imágenes son demasiado grandes para tenerlas a la vez con las tres maestras y las copias de trabajo.',
  'obs.sq.no.no-masters':
    'Estas imágenes están en bruto y no se dieron imágenes de calibración.',
  'obs.sq.no.frame-shape':
    'La imagen {frames} no tiene el tamaño de la primera.',
  'obs.sq.no.bad-parameter': 'Un ajuste está fuera de rango ({name}).',
  'obs.sq.no.bad-frame': 'Las imágenes no tienen un tamaño utilizable.',
  'obs.sq.no.no-frames': 'No hay imágenes.',
  'obs.sq.no.raw-frame': 'Una imagen sigue en bruto.',
  'obs.sq.no.invalid': 'La descripción de una imagen no es válida.',
  'obs.sq.no.display-only':
    'Estas imágenes son solo para mostrar y no se puede medir su luz.',
  'obs.sq.no.incomplete-contract':
    'El contrato de píxeles de las imágenes está incompleto.',
  'obs.sq.no.no-contract': 'Las imágenes no declaran un contrato de píxeles.',
  'obs.sq.no.not-flux': 'Los valores de los píxeles no miden luz.',
  'obs.sq.no.lossy-history':
    'Los píxeles pasaron por un paso que no conserva la luz medida.',
  'obs.sq.no.no-background': 'No se pudo estimar el cielo.',
};
