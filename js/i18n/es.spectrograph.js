// Las palabras de los instrumentos del espectrógrafo, en español (Prompt 213, SPECTROGRAPH.md).
export const ES_SPECTROGRAPH = {
  // ---- dos líneas
  'specW.pair.title': 'Dos líneas en un espectrógrafo',
  'specW.pair.note':
    'Dos líneas iguales, intrínsecamente angostas, a 500 nm, en un espectrógrafo cuyo poder de resolución, tamaño de píxel y ruido fijas tú. La curva suave es lo que la función de dispersión del instrumento hace con el par; los puntos son los píxeles. Un espectro sintético.',
  'specW.control.R': 'Poder de resolución R (a 500 nm)',
  'specW.control.sep': 'Separación de las líneas',
  'specW.control.sampling': 'Píxeles por FWHM (muestreo)',
  'specW.control.snr': 'Señal a ruido máxima de una línea',
  'specW.snr.0': 'sin ruido',
  'specW.row.model': 'Modelo',
  'specW.m':
    'Dos líneas gaussianas a través de una función de dispersión gaussiana de ancho fijo, integradas en cada píxel, con ruido fotónico y de lectura; un espectro sintético',
  'specW.row.fwhm': 'FWHM de la función de dispersión (500 nm sobre R)',
  'specW.v.fwhm': '{w} nm',
  'specW.row.sampling': 'Muestreo (píxeles por FWHM)',
  'specW.v.sampling': '{s}: {v}',
  'specW.verdict.ok': 'al menos 2, la línea está bien muestreada',
  'specW.verdict.undersampled': 'menos de 2, submuestreada',
  'specW.verdict.severely-undersampled': 'menos de 1, muy submuestreada',
  'specW.row.sep': 'Separación',
  'specW.v.sep': '{n} nm, {f} FWHM, {p} píxeles',
  'specW.row.dip': 'Hundimiento entre las líneas (el perfil suave del modelo)',
  'specW.v.dip': '{d} por ciento',
  'specW.v.noDip':
    'ninguno: los dos picos se fundieron en uno (se separan por encima de 0,85 FWHM)',
  'specW.row.pixels': 'Picos en los píxeles (sin ruido)',
  'specW.v.pixelsTwo': 'dos',
  'specW.v.pixelsOne': 'uno',
  'specW.row.fit': 'Ajustadas como una sola línea',
  'specW.v.fitBroad':
    'FWHM {w} nm frente a los {i} nm del instrumento: ensanchada un {x} por ciento, marcada (una mezcla, o una línea con ancho propio)',
  'specW.v.fitOk':
    'FWHM {w} nm frente a los {i} nm del instrumento: compatible con una línea única sin resolver',
  'specW.v.fitNone': 'sin ajuste: {r}',
  'specW.row.assumes': 'Lo que deja fuera',
  'specW.a':
    'una sola longitud de onda, 500 nm; una función de dispersión gaussiana del mismo ancho en todas partes; sin campo plano, sin cielo, sin rayos cósmicos; las líneas son intrínsecamente angostas. Los píxeles más finos muestrean mejor la línea y no pueden separar líneas que la función de dispersión ya fundió.',
  'specW.axis.x': 'Longitud de onda desde 500 nm (nm)',
  'specW.axis.y': 'Electrones por píxel',
  'specW.legend.model': 'el par en el instrumento (modelo)',
  'specW.legend.pixels': 'los píxeles',
  'specW.legend.truth': 'las dos posiciones verdaderas',
  // ---- el arco
  'specW.arc.title': 'Calibrar un espectrógrafo con una lámpara de arco',
  'specW.arc.note':
    'Una lámpara de arco sintética (líneas de la lista del NIST, intensidades inventadas) y una estrella sintética, en un mismo espectrógrafo. El panel marca las líneas que eliges, ajusta la solución de longitud de onda, muestra los residuos y mide una línea de Balmer de la estrella con su incertidumbre.',
  'specW.control.marked': 'Líneas marcadas',
  'specW.control.degree': 'Grado de la solución',
  'specW.control.seed': 'Qué arco (sorteo de ruido)',
  'specW.control.line': 'Línea de la estrella',
  'specW.control.medium': 'Medio de la longitud de onda en reposo',
  'specW.medium.0': 'aire',
  'specW.medium.1': 'vacío',
  'specW.row.arc': 'Lámpara e instrumento',
  'specW.v.arc':
    '14 líneas aisladas de la lámpara en aire, 2048 píxeles, FWHM de dispersión 0,30 nm (R = 1500 a 450 nm), una solución cúbica sintética que el panel mantiene oculta',
  'specW.row.solution': 'La solución',
  'specW.v.solution': 'grado {d} con {n} líneas: {s}',
  'specW.state.constrained': 'restringida ({k} grados de libertad)',
  'specW.state.exactly-determined':
    'exactamente determinada: pasa por todas las líneas, su incertidumbre viene solo de los errores de las líneas y no hay residuo con que comprobarla',
  'specW.state.not-constrained': 'no restringida: {m}',
  'specW.state.refused': 'rechazada: {m}',
  'specW.row.residual': 'Residuos',
  'specW.v.residual': 'rms {r} nm; chi cuadrado reducido {c}',
  'specW.v.residualFlag':
    'rms {r} nm; chi cuadrado reducido {c}: la dispersión supera los errores, así que las incertidumbres se escalan hacia arriba',
  'specW.v.noResidual': 'ninguno: no hay residuo que leer',
  'specW.row.sigma': 'Incertidumbre de la solución a mitad del detector',
  'specW.v.sigma': '{s} nm ({p} píxel)',
  'specW.row.star': 'La línea de la estrella',
  'specW.v.star': '{n}: observada en {w} ± {s} nm (en aire)',
  'specW.v.starNone':
    'sin medida: la solución no tiene coeficientes o falló el ajuste de la línea',
  'specW.row.velocity': 'Velocidad radial',
  'specW.v.velocity':
    '{v} ± {s} km/s (longitud de onda en reposo {r} nm en {m})',
  'specW.v.velocityRefused':
    'rechazada: el espectro está calibrado en aire y la longitud de onda en reposo está en vacío; confundir ambos valdría {o} km/s aquí',
  'specW.row.ignored': 'Si se ignoraran los medios (incorrecto)',
  'specW.v.ignored':
    '{v} km/s: la longitud de onda en reposo en {m} frente a una observada en aire',
  'specW.arcA':
    'una solución cúbica de longitud de onda oculta; líneas de arco sin resolver; las intensidades relativas de la lámpara son inventadas; las mezclas (una línea con un vecino a menos de 6 FWHM) quedan fuera del marcado; sin campo plano, sin cielo; la estrella es un cuerpo negro de 6000 K con líneas de Balmer gaussianas a una velocidad que el panel no dice. Todo es sintético.',
  'specW.axis.pixel': 'Píxel',
  'specW.axis.counts': 'Electrones por píxel',
  'specW.axis.resid': 'Residuo (nm)',
  'specW.legend.arc': 'el arco (con ruido)',
  'specW.legend.mark': 'líneas marcadas',
  'specW.legend.resid': 'línea menos solución, ±1 sigma',
  'specW.legend.band': 'el 1 sigma de la solución',
  // ---- el compromiso
  'specW.trade.title': 'Resolución, luz y señal a ruido',
  'specW.trade.note':
    'Una estrella en un espectrógrafo de rendija en un telescopio de la biblioteca de instrumentos. Una rendija más estrecha da un poder de resolución mayor y deja pasar menos luz de la estrella; la curva es la señal a ruido de una línea de absorción frente al poder de resolución.',
  'specW.control.R2': 'Poder de resolución R',
  'specW.control.Rs': 'R con el que la rendija iguala al seeing',
  'specW.control.seeing': 'Seeing (FWHM)',
  'specW.control.width': 'Ancho propio de la línea (sigma)',
  'specW.control.vmag': 'Estrella (magnitud V)',
  'specW.control.facility': 'Telescopio',
  'specW.control.exposure': 'Exposición',
  'specW.facility.0': '0,35 m (Las Cumbres)',
  'specW.facility.1': '1,0 m (Las Cumbres)',
  'specW.facility.2': '8,4 m (diseño de referencia de Rubin)',
  'specW.row.slit': 'Ancho de rendija que da este R',
  'specW.v.slit':
    '{w} segundos de arco, {r} del seeing; pasa el {t} por ciento de la luz de la estrella',
  'specW.row.line': 'La línea, como la muestra el instrumento',
  'specW.v.line': 'FWHM {f} nm del instrumento y {o} nm observado; {k}',
  'specW.line.resolved':
    'la línea está resuelta (más ancha que el instrumento)',
  'specW.line.unresolved':
    'la línea no está resuelta (el instrumento fija su ancho)',
  'specW.row.snr': 'Señal a ruido de la línea (anchura equivalente 0,020 nm)',
  'specW.v.snr':
    '{s}; la línea más débil detectable a 3 sigma tiene una anchura equivalente de {e} nm',
  'specW.row.best': 'El poder de resolución que la maximiza',
  'specW.v.best': 'R = {r}, señal a ruido {s}',
  'specW.v.bestBound':
    'sin máximo dentro del rango: una línea sin resolver solo gana con el poder de resolución y la ganancia se detiene cuando la rendija es más estrecha que el disco de seeing (R sobre {r})',
  'specW.row.light': 'Luz que llega al detector',
  'specW.v.light':
    '{a} m² de área colectora, {f}; {p} electrones por nm en {t} s antes de la rendija',
  'specW.tradeA':
    'una rendija larga y seeing gaussiano, sin error de seguimiento; el poder de resolución inversamente proporcional al ancho de la rendija; el tamaño de píxel siguiendo el ancho de dispersión a 2,5 píxeles por FWHM; sin cielo, 5 electrones de ruido de lectura; un rendimiento de 0,3 para todo salvo la rendija; un flujo de V = 0 de 1,0 x 10^8 fotones por segundo por metro cuadrado por nm (un valor didáctico del orden del de Vega). Todos los números son sintéticos.',
  'specW.axis.R': 'Poder de resolución R',
  'specW.axis.snr': 'Señal a ruido de la línea',
  'specW.legend.now': 'este ajuste',
  'specW.legend.best': 'el máximo',
  'specObs.note':
    'Elige una línea e indica el poder de resolución del instrumento. La línea se ajusta como una gaussiana integrada por píxel sobre un continuo recto (el modelo de instrumento de Por qué dos líneas se vuelven una), y la velocidad se rechaza cuando la longitud de onda en reposo y el espectro no están en el mismo medio.',
  'specObs.line': 'Línea en reposo',
  'specObs.R': 'Poder de resolución del instrumento',
  'specObs.fit': 'Ajustar la línea',
  'specObs.none': 'Ninguna línea de la lista cae dentro de este espectro.',
  'specObs.notSpectrum':
    'Este panel lee un espectro con eje de longitud de onda.',
  'specObs.row.centre': 'Centro ajustado',
  'specObs.row.width': 'FWHM ajustado frente al del instrumento',
  'specObs.row.sampling': 'Muestreo (píxeles por FWHM)',
  'specObs.row.R': 'Poder de resolución que implica el ancho',
  'specObs.row.flag': 'Ensanchada',
  'specObs.row.velocity': 'Velocidad radial',
  'specObs.row.medium': 'Medio del espectro',
  'specObs.row.assumes': 'Qué supone',
  'specObs.v.centre':
    '{c} nm, incertidumbre {s} nm (errores a partir de la dispersión de los píxeles respecto al ajuste: se supone ruido blanco)',
  'specObs.v.width': '{w} nm frente a {i} nm',
  'specObs.v.R': '{r}',
  'specObs.v.broad':
    'sí: más ancha de lo que permite el instrumento, así que una mezcla o una línea con ancho propio (una marca, no una prueba)',
  'specObs.v.narrow': 'no: coherente con el ancho del instrumento',
  'specObs.v.velocity': '{v} km/s, incertidumbre {s} km/s',
  'specObs.v.refused':
    'rechazada: el espectro está en {a} y la longitud de onda en reposo en {b}; el panel nunca convierte entre medios en silencio',
  'specObs.v.unknown':
    'rechazada: el espectro no dice si sus longitudes de onda están en aire o en vacío',
  'specObs.v.fail': 'sin ajuste: {r}',
  'specObs.a':
    'Un poder de resolución constante a lo largo de la línea y una función de dispersión gaussiana; un continuo recto bajo la línea; píxeles tal como los da el archivo (un espectro remuestreado por la cadena de reducción tiene píxeles correlacionados, así que la incertidumbre es una cota inferior).',
  'specObs.plot': 'El espectro alrededor de la línea con el perfil ajustado',
};
