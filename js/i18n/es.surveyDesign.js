// Las palabras de los paneles de diseño de censos, en español (Prompt 215).
export const ES_SURVEYDESIGN = {
  'sdW.facility.0': 'LCO 0,35 m, QHY600 (V)',
  'sdW.facility.1': 'LCO 1,0 m, Sinistro (V)',
  'sdW.facility.2': 'Rubin 8,4 m, cámara LSST (r)',
  'sdW.class.0': 'Clase euclídea (pendiente de los conteos 0,6)',
  'sdW.class.1': 'Clase aplanada (pendiente 0,4)',
  'sdW.class.2': 'Clase empinada (pendiente 1,0)',
  'sdW.v.seconds': '{t} s',
  'sdW.v.mag': '{m} mag',
  'sdW.v.deg2': '{a} grados²',
  'sdW.v.nights': '{n} noches',
  'sdW.v.sigma': '{s} sigma',
  'sdW.t.title': 'Profundo o ancho: el compromiso a tiempo fijo',
  'sdW.t.note':
    'Las mismas noches pueden dedicarse a exposiciones largas que alcanzan fuentes débiles en un área pequeña, o a exposiciones cortas que cubren un área grande con menos profundidad. Cada exposición cuesta además su tiempo muerto. Las curvas muestran el área observada y las fuentes encontradas frente a la exposición; la mejor exposición para la clase es donde las fuentes encontradas alcanzan su máximo. Todos los números son un modelo con límites declarados, y la clase es un modelo didáctico, no una población real.',
  'sdW.t.control.facility': 'Instalación',
  'sdW.t.control.cls': 'Clase de fuente',
  'sdW.t.control.exposure': 'Exposición por apuntado',
  'sdW.t.control.nights': 'Noches',
  'sdW.axis.exposure': 'Exposición (log10 de segundos)',
  'sdW.axis.logcount': 'log10 del área (grados²) o de las fuentes encontradas',
  'sdW.legend.area': 'Área observada',
  'sdW.legend.found': 'Fuentes encontradas',
  'sdW.legend.chosen': 'Tu exposición',
  'sdW.legend.optimum': 'Mejor exposición hallada',
  'sdW.row.model': 'Modelo',
  'sdW.m.trade':
    'La ecuación del CCD para una fuente puntual con filtro adaptado, el área que compran las noches (el campo entre el ciclo de exposición más tiempo muerto), los conteos de la clase y la completitud de un umbral de 5 sigma',
  'sdW.t.row.setup': 'Montaje',
  'sdW.t.v.setup':
    'seeing {fwhm} arcsec, cielo {sky} mag por arcsec², campo {fov} grados², tiempo muerto {oh} s por imagen (tabla citada; el rendimiento es supuesto)',
  'sdW.t.row.depth': 'Profundidad',
  'sdW.t.v.depth':
    '{m} a 5 sigma (se encuentra la mitad de las fuentes tan brillantes)',
  'sdW.t.row.area': 'Área y tiempo',
  'sdW.t.v.area':
    '{a} grados² en {p} apuntados de {t} s más {o} s de tiempo muerto',
  'sdW.t.row.found': 'Fuentes encontradas',
  'sdW.t.v.found':
    '{n}, más o menos {s} (un conteo de Poisson; los censos reales dispersan más)',
  'sdW.t.row.best': 'Mejor exposición',
  'sdW.t.v.best':
    'con unos {t} s se encontraron más fuentes; la regla limitada por el cielo da {r} s, que se queda corta porque la fuente y el detector añaden ruido',
  'sdW.t.v.deepwins':
    'con unos {t} s se encontraron más fuentes (los conteos de esta clase crecen más rápido que 0,8 dex por magnitud, así que gana la exposición más larga mostrada)',
  'sdW.t.row.rule': 'La regla',
  'sdW.t.v.rule':
    'Limitada por el cielo, la profundidad gana 1,25 mag por década de exposición, así que los conteos crecen como la exposición elevada a {b} mientras el área cae como uno entre la exposición: lo profundo gana solo donde los conteos crecen más rápido que 0,8 dex por magnitud (esta clase: {a})',
  'sdW.row.assumes': 'Deja fuera',
  'sdW.t.a':
    'agrupamiento y varianza cósmica (los conteos son de Poisson), aglomeración, polvo, la Luna, el tiempo (se supone una fracción despejada de 0,6), cambios de campo más allá de 5 s, y toda población real: la clase es una ley de potencias declarada',
  'sdW.p.title': 'Un plan de censo y lo que encontraría',
  'sdW.p.note':
    'Elige una instalación, una exposición, un número de visitas a apilar, noches y un umbral de detección. El panel da la profundidad, el área, las fuentes que el plan encontraría, los falsos positivos que deja pasar y si cumple tu objetivo. El recuadro es un trozo de cielo sintético: las fuentes encontradas van rellenas, las perdidas vacías y las cruces son falsos positivos.',
  'sdW.p.control.facility': 'Instalación',
  'sdW.p.control.cls': 'Clase de fuente',
  'sdW.p.control.exposure': 'Exposición por visita',
  'sdW.p.control.visits': 'Visitas apiladas',
  'sdW.p.control.nights': 'Noches',
  'sdW.p.control.threshold': 'Umbral de detección',
  'sdW.p.control.depth': 'Profundidad objetivo',
  'sdW.p.control.area': 'Área objetivo',
  'sdW.axis.patchx': 'Posición a lo ancho del recuadro',
  'sdW.axis.patchy': 'Posición a lo alto del recuadro',
  'sdW.legend.found2': 'Encontrada',
  'sdW.legend.missed': 'Perdida',
  'sdW.legend.false': 'Falso positivo',
  'sdW.p.row.depth': 'Profundidad',
  'sdW.p.v.depth':
    '{m} en el umbral (se encuentra la mitad); la profundidad a 5 sigma es {m5}',
  'sdW.p.row.area': 'Área y tiempo',
  'sdW.p.v.area':
    '{a} grados² en {p} apuntados de {v} x {t} s, usando {u} horas de {h}',
  'sdW.p.row.found': 'Fuentes encontradas',
  'sdW.p.v.found':
    '{n} (intervalo del 68 por ciento de {lo} a {hi}) de {s} en la clase hasta esa profundidad',
  'sdW.p.row.false': 'Falsos positivos',
  'sdW.p.v.false': '{n} esperados; fiabilidad {r} por ciento',
  'sdW.p.v.unreliable':
    ', así que la mayoría de las detecciones serían falsas: poco fiable',
  'sdW.p.row.verdict': 'Veredicto',
  'sdW.p.v.feasible': 'viable: alcanza la profundidad y el área objetivo',
  'sdW.p.v.not': 'no viable: {why}',
  'sdW.reason.depth': 'no es lo bastante profundo',
  'sdW.reason.area': 'no cubre el área',
  'sdW.reason.time': 'no cabe ningún apuntado en las noches',
  'sdW.reason.saturates': 'el cielo llena los píxeles en una exposición',
  'sdW.reason.reliability': 'demasiadas detecciones son falsas',
  'sdW.reason.outside-count-model':
    'la profundidad está fuera del rango de la clase',
  'sdW.p.row.patch': 'El recuadro',
  'sdW.p.v.patch':
    'un trozo de cielo sintético de {a} arcmin por {a} arcmin: se encuentran {n} de las {s} fuentes generadas; un censo de este tamaño esperaría unas {e}',
  'sdW.p.row.source': 'Qué números están citados',
  'sdW.p.v.source':
    'la tabla de la instalación da la escala de píxel, el ruido de lectura, el campo y el tiempo de ciclo; el rendimiento, la corriente oscura y el cambio de apuntado son supuestos',
  'sdW.p.a':
    'Solo conteos de Poisson, una clase de ley de potencias que es un modelo didáctico, ruido gaussiano y una tasa de falsos positivos de elementos independientes: un detector real es peor. La profundidad es para una fuente puntual con el filtro adaptado.',
  'sdW.c.title': 'Dos telescopios, una pregunta',
  'sdW.c.note':
    'El mismo objetivo, una profundidad sobre un área, para dos instalaciones. El panel da las visitas que cada una necesita para alcanzar la profundidad, las horas para cubrir el área y el cociente. Un campo ancho y un espejo grande ayudan de formas distintas: el espejo hace cada apuntado más profundo, el campo cubre más cielo en cada apuntado.',
  'sdW.c.control.a': 'Primera instalación',
  'sdW.c.control.b': 'Segunda instalación',
  'sdW.c.control.exposure': 'Exposición por visita',
  'sdW.c.control.depth': 'Profundidad objetivo',
  'sdW.c.control.area': 'Área objetivo',
  'sdW.axis.facility': 'Instalación (primera, segunda)',
  'sdW.axis.hours': 'log10 de las horas para alcanzar el objetivo',
  'sdW.legend.hours': 'Horas hasta el objetivo',
  'sdW.c.row.a': 'Primera',
  'sdW.c.row.b': 'Segunda',
  'sdW.c.v.each':
    '{v} visitas de {t} s en cada uno de {p} apuntados: {h} horas ({n} noches)',
  'sdW.c.v.cannot': 'no puede: {why}',
  'sdW.c.row.ratio': 'Cociente',
  'sdW.c.v.ratio': 'la segunda tarda {r} veces lo que la primera',
  'sdW.c.row.rate': 'Ritmo de censo',
  'sdW.c.v.rate': '{a} frente a {b} grados² por hora a esta profundidad',
  'sdW.c.row.rule': 'La regla práctica',
  'sdW.c.v.rule':
    'Limitado por el cielo, el tiempo hasta una profundidad va como el seeing al cuadrado entre la capacidad de recoger luz: {r} aquí para un apuntado. El campo fija entonces el área que cubre cada apuntado.',
  'sdW.reason.saturates2': 'la exposición llena los píxeles de cielo',
  'sdW.reason.not-reachable':
    'ningún apilado de esta exposición alcanza la profundidad',
  'sdW.c.a':
    'El mismo umbral de detección y la misma exposición por visita en ambas, un rendimiento supuesto de 0,5 cada una, sin solapes ni huecos entre apuntados y la misma fracción despejada. Otra exposición cambiaría la respuesta.',
};
