// Las palabras de los instrumentos del Sol, en español (Prompt 194, parte 2).
// Sin lectura por una persona que lea español con fluidez.
export const ES_SUN = {
  'sunW.on': 'sí',
  'sunW.off': 'no',
  'sunW.loading': 'Las imágenes se están cargando.',
  'sunW.failed': 'No se pudo cargar la imagen o la secuencia.',
  'sunW.row.how': 'Estado',
  'sunW.row.picture': 'La imagen',
  'sunW.row.assumes': 'Lo que deja fuera',
  'sunW.date': '{d} de {month}',
  'sunW.month.5': 'mayo',
  'sunW.control.day': 'Día (una imagen a las 12:00 UT)',
  'sunW.control.first': 'Primer día usado',
  'sunW.control.last': 'Último día usado',
  'sunW.alt':
    'El Sol el {date} de 2024 en una imagen de vista previa de la cámara de continuo del Observatorio de Dinámica Solar (SDO) de la NASA, con el norte arriba y el este a la izquierda: un disco naranja con manchas oscuras. El detector de esta página lee {n} grupos oscuros separados de al menos 12 píxeles. Son grupos de píxeles, no las regiones numeradas de la NOAA, que no se obtuvieron.',
  'sunW.group.G1': 'G1, una mancha pequeña cerca del ecuador',
  'sunW.group.G3': 'G3, el gran grupo del sur',
  'sunW.mode.0': 'Seguir un grupo',
  'sunW.mode.1': 'Ajustar el término ecuatorial',
  'sunW.mode.2': 'Ajustar los tres coeficientes',
  'sunW.f.title': '¿En qué lugar del Sol está una mancha?',
  'sunW.f.note':
    'Catorce imágenes diarias del Sol en mayo de 2024. Mueve la cruz con los dos deslizadores hasta una mancha y lee su latitud y su longitud heliográficas y cuán inciertas son. Los círculos marcados G1 y G3 son las marcas del autor de dos grupos, hechas con una regla declarada: nadie más ha marcado estas imágenes. Son imágenes de vista previa, hechas para mirarlas, así que una posición leída aquí es una medida didáctica con su etiqueta, no astrometría.',
  'sunW.f.control.x': 'Cruz, horizontal',
  'sunW.f.control.y': 'Cruz, vertical',
  'sunW.f.control.marks': 'Las marcas del autor de G1 y G3',
  'sunW.f.control.grid': 'Rejilla de latitud y longitud',
  'sunW.f.row.geometry': 'El disco este día',
  'sunW.f.value.geometry':
    'Inclinación del polo del Sol hacia nosotros B0 {b0}°, longitud del meridiano central L0 {l0}°; el limbo ajustado con un radio de {r} píxeles, {scale} segundos de arco por píxel',
  'sunW.f.row.cross': 'Cruz en ({x}, {y}) píxeles',
  'sunW.f.value.cross':
    'latitud {lat}°, longitud {lon}° desde el meridiano central (Carrington {car}°), mu {mu}, incertidumbre de {sigma}° en longitud para una colocación de 1,5 píxeles',
  'sunW.f.value.offdisc': 'Fuera del Sol: no hay latitud ni longitud',
  'sunW.f.row.limb': 'Aviso',
  'sunW.f.value.limb':
    'Acortamiento: a menos de mu {mu} del limbo un píxel son muchos grados de longitud, la incertidumbre es grande y una velocidad medida desde aquí no es precisa',
  'sunW.f.row.mark': 'Marca del autor de {id}',
  'sunW.f.value.mark':
    'latitud {lat}°, longitud {lon}°, mu {mu}, ± {sigma}° (píxel {x}, {y})',
  'sunW.f.value.nomark':
    'sin marcar este día (aún no está en el disco, ya pasó el limbo o la regla lo perdió)',
  'sunW.f.assumes':
    'Una imagen de vista previa es una imagen para mirar: su fuente dice que no es para análisis científico, no tiene calibración de brillo ni coordenadas propias, así que solo se lee la posición de una mancha, con la incertidumbre de colocar una cruz. Un grupo de manchas no es un punto, y el Sol se trata como una esfera.',
  'sunW.r.title': '¿Con qué rapidez gira el Sol a esta latitud?',
  'sunW.r.note':
    'Las marcas del autor de un grupo de manchas durante los días elegidos, como longitud frente al tiempo con la recta que mejor las ajusta. La velocidad es la pendiente de la recta; si se suma el movimiento propio de la Tierra se obtiene la rotación del Sol respecto de las estrellas. Al lado, la ley de referencia de Howard, Harvey y Forgach (1990): su forma es fija y aquí no se reajustó. Los otros dos modos usan los dos grupos y ajustan solo el término ecuatorial, o prueban los tres coeficientes.',
  'sunW.r.control.group': 'Grupo',
  'sunW.r.control.limb': 'Añadir los días cerca del limbo',
  'sunW.r.control.mode': 'Qué hacer',
  'sunW.r.legend.marks': 'Longitudes marcadas',
  'sunW.r.legend.fit': 'Ajuste, {r}° al día',
  'sunW.r.legend.law': 'Ley de referencia',
  'sunW.r.legend.groups': 'Los dos grupos',
  'sunW.r.legend.fitA': 'Ley con A ajustado, {a}° al día',
  'sunW.r.axis.t': 'Días desde la primera marca',
  'sunW.r.axis.lon': 'Longitud desde el meridiano central (°)',
  'sunW.r.axis.lat': 'Latitud (°)',
  'sunW.r.axis.rate': 'Velocidad de rotación sideral (° al día)',
  'sunW.r.row.group': 'Grupo',
  'sunW.r.row.positions': 'Posiciones usadas',
  'sunW.r.value.positions': '{n} días, a una latitud media de {lat}°',
  'sunW.r.row.synodic': 'Velocidad sinódica (como la ve la Tierra)',
  'sunW.r.value.rate': '{r} ± {s}° al día',
  'sunW.r.row.synodicPeriod': 'Período sinódico',
  'sunW.r.value.period': '{p} días',
  'sunW.r.row.earth':
    'El movimiento propio de la Tierra, a lo largo del ecuador del Sol',
  'sunW.r.value.earth': '{r}° al día',
  'sunW.r.row.sidereal': 'Velocidad sideral (respecto de las estrellas)',
  'sunW.r.row.siderealPeriod': 'Período sideral',
  'sunW.r.value.periodRange': '{p} días (95 por ciento: de {lo} a {hi})',
  'sunW.r.row.law': 'La ley de referencia a esta latitud',
  'sunW.r.value.law':
    '{predicted}° al día; el grupo está a {diff}° de ella, frente a ± {total}° (el ajuste y una dispersión de 0,3° al día entre grupos), z {z}',
  'sunW.r.row.birge': '¿Están las marcas sobre una recta?',
  'sunW.r.value.birge':
    'Sí, dentro de sus incertidumbres (chi cuadrado por grado de libertad {b})',
  'sunW.r.value.birgeHigh':
    'No del todo (chi cuadrado por grado de libertad {b}): el grupo cambia mientras gira, y la incertidumbre de la velocidad se ha agrandado en consecuencia',
  'sunW.r.row.warning': 'Aviso',
  'sunW.warn.foreshortening':
    'Una marca está a menos de mu {mu} del limbo, donde un píxel son muchos grados de longitud: la incertidumbre se ensancha y la velocidad no es precisa',
  'sunW.warn.limb-excluded':
    'Se dejó fuera una marca a menos de mu 0,1 del limbo',
  'sunW.refused.too-few': 'Sin velocidad: menos de tres posiciones utilizables',
  'sunW.refused.limb':
    'Sin velocidad: quedan muy pocas posiciones lejos del limbo',
  'sunW.refused.not-constrained':
    'Sin velocidad: estas posiciones no la determinan (su incertidumbre es más de la mitad de su valor)',
  'sunW.refused.bad-time':
    'Sin velocidad: todas las posiciones son del mismo instante',
  'sunW.refused.under-determined':
    'Rechazado: {free} coeficientes no se pueden determinar con {n} grupos en dos latitudes; dos latitudes fijan como mucho dos números',
  'sunW.refused.empty': 'Sin serie',
  'sunW.refused.flux': 'Sin valor: un flujo no es un número positivo',
  'sunW.r.row.latitudes': 'Latitudes de los grupos',
  'sunW.r.value.latitudes': '{n} latitudes distintas: {list}',
  'sunW.r.row.fit': 'Ajuste',
  'sunW.r.row.A': 'Término ecuatorial A, ajustado',
  'sunW.r.value.A': '{a} ± {s}° al día (el de la ley es {ref})',
  'sunW.r.row.held': 'Fijados en los valores de la ley',
  'sunW.r.value.held': 'B {b} y C {c}° al día',
  'sunW.r.row.chi2': 'Bondad del ajuste',
  'sunW.r.value.chi2': 'chi cuadrado {chi2} con {dof} grado de libertad',
  'sunW.r.row.residual': 'Grupo a {lat}°',
  'sunW.r.value.residual': 'residuo {res}° al día, z {z}',
  'sunW.r.assumes':
    'El centro de un grupo no es un punto: un grupo que crece o se divide mueve su propio centro, y eso aparece como una dispersión que la incertidumbre de colocación no cubre. La ley de referencia se midió sobre rasgos magnéticos, no sobre manchas, así que un grupo puede quedar unas décimas de grado al día de ella. El Sol es una esfera y las manchas se quedan a una latitud.',
  'sunW.r.assumes.law':
    'La ley conserva su forma: solo se ajustan los coeficientes nombrados y los demás se mantienen en los valores publicados, que se copiaron del artículo y no se volvieron a leer. Con pocas latitudes el ajuste no dice nada de los otros coeficientes; dos grupos son dos números.',
  'sunW.p.title': '¿Cuánta potencia emite el Sol?',
  'sunW.p.note':
    'La irradiancia total del Sol, medida sobre la atmósfera por el instrumento TSIS-1 TIM, un valor al día, en la Tierra. Corrige cada uno a una unidad astronómica con la distancia Tierra–Sol, y pregunta qué potencia atraviesa la esfera entera alrededor del Sol y qué temperatura necesitaría una superficie del tamaño del Sol para darla.',
  'sunW.p.control.days': 'Días usados',
  'sunW.p.control.correct': 'Corregir cada día a 1 UA',
  'sunW.p.legend.earth': 'Medida en la Tierra',
  'sunW.p.legend.au': 'Corregida a 1 UA',
  'sunW.p.axis.day': 'Día (el 4 de mayo es el día 1)',
  'sunW.p.axis.flux': 'Irradiancia (W/m²)',
  'sunW.p.row.instrument': 'Instrumento y días',
  'sunW.p.value.instrument': '{name}, {n} días, del {from} al {to}',
  'sunW.p.row.earth': 'En la Tierra, primer y último día',
  'sunW.p.value.earth': '{a} y {b} W/m², una caída de {fall}',
  'sunW.p.row.distance': 'Distancia Tierra–Sol, primer y último día (JPL)',
  'sunW.p.value.distance': '{a} y {b} UA',
  'sunW.p.row.au': 'A 1 UA, primer y último día',
  'sunW.p.value.au': '{a} y {b} W/m², una caída de {fall}',
  'sunW.p.row.mean': 'Media de los días usados',
  'sunW.p.value.mean': '{m} ± {s} W/m² a 1 UA',
  'sunW.p.value.meanRaw': '{m} ± {s} W/m², SIN corregir a 1 UA',
  'sunW.p.row.luminosity': 'La luminosidad del Sol',
  'sunW.p.value.luminosity':
    '{l} × 10²⁶ W, ± {s} × 10²² W ({diff} por ciento respecto del valor solar nominal, 3,828 × 10²⁶ W)',
  'sunW.p.row.teff': 'Temperatura efectiva',
  'sunW.p.value.teff':
    '{k} ± {s} K ({diff} K respecto de los 5772 K nominales)',
  'sunW.p.row.wrong': 'Lo que cuesta omitir la corrección',
  'sunW.p.value.wrong':
    'La luminosidad sale un {pct} por ciento demasiado baja, un error mucho mayor que el intervalo de arriba',
  'sunW.p.row.fill': 'Después del último día',
  'sunW.p.value.fill':
    'El archivo tiene {n} filas más, todas 0,0 con una incertidumbre de 0,0: son valores de relleno, no una medida de ausencia de luz solar. Se dejan fuera.',
  'sunW.p.assumes':
    'El intervalo es la dispersión de estos días dividida por la raíz de su número: deja fuera la exactitud propia del instrumento y el cambio real del Sol de un día a otro (aquí la irradiancia baja a lo largo de los días usados). La luminosidad supone que el Sol es una esfera que irradia por igual en todas las direcciones.',
};
