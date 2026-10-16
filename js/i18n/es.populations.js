// =============================================================================
// Las estrellas y sus poblaciones: las investigaciones guiadas en español
// -----------------------------------------------------------------------------
// js/observatory/guides/populations.js las carga con la serie, así que el
// ejecutor no lleva ninguna. Las palabras de un paso son gd.<guía>.<paso>.
// {title, text}, con .ok y .no si el paso se comprueba y .opt.<opción> para
// cada opción (los identificadores están en js/observatory/guides/
// populations.js). Los párrafos se separan con una línea en blanco. {value}
// en un mensaje .ok es el número que encontró la comprobación, o el escrito.
// =============================================================================

export const ES_POPULATIONS = {
  'gd.suite.populations.intro':
    'Un conjunto de investigaciones con observaciones reales: cuatro espectros de SDSS, la fotometría de SDSS y la espectroscopia de SEGUE del cúmulo abierto NGC 2420, las isócronas del modelo MIST y una curva de luz de TESS de una estrella RR Lyrae. Van de lo que dice un espectro, pasando por el diagrama color–magnitud de un cúmulo y quién pertenece a él, hasta las edades que dan los modelos y una estrella que varía. Cada número que comprueba un paso sale de los datos o de una fuente citada que el paso nombra; las isócronas son un modelo, y se comparan con las estrellas, nunca se confunden con ellas.',
  'gd.target.sdss-a': 'el espectro de la estrella A (SDSS)',
  'gd.target.sdss-g': 'el espectro de la estrella G (SDSS)',
  'gd.target.sdss-k': 'el espectro de la estrella K (SDSS)',
  'gd.target.sdss-m': 'el espectro de la estrella M (SDSS)',
  'gd.target.photometry': 'la fotometría de NGC 2420 (SDSS)',
  'gd.target.segue': 'los parámetros espectroscópicos de NGC 2420 (SEGUE)',
  'gd.target.isochrones': 'las isócronas de MIST en g y r de SDSS (un modelo)',
  'gd.target.su-dra': 'la curva de luz de SU Draconis (TESS)',
  'gd.target.hd209458-lc': 'la curva de luz de HD 209458 (TESS)',

  'gd.show.ew': '{value} ± {error} Å',
  'gd.show.pipelineStar': '{type}; {teff} K; log g {logg}; [Fe/H] {feh}',
  'gd.show.sunGravity': 'El log g del Sol, para comparar',
  'gd.show.within': 'Estrellas de esta tabla a menos de {r} arcmin del centro',
  'gd.show.halfRadius':
    'La mitad de los miembros del cúmulo, según Gaia, están a menos de',
  'gd.show.halfRadiusValue': '{r} arcmin, de {n} miembros ({ref})',
  'gd.show.ring':
    '{n} estrellas entre {lo} y {hi} arcmin: {density} por minuto de arco cuadrado',
  'gd.show.inner': 'Alrededor del cúmulo',
  'gd.show.outer': 'Lejos del cúmulo',
  'gd.show.faintLimit': 'Contadas hasta',
  'gd.show.leeRv': 'La velocidad del cúmulo, según SEGUE en 2008',
  'gd.show.leeRvValue':
    '{rv} km/s, una dispersión de {sd} km/s entre {n} miembros ({ref})',
  'gd.show.window': 'Estrellas entre {lo} y {hi} km/s',
  'gd.show.fehMembers':
    'La mediana de tus miembros (el procesado de SEGUE, DR18)',
  'gd.show.fehLee': 'El procesado de SEGUE en 2008 (DR6)',
  'gd.show.fehHigh': 'Espectros ópticos de alta resolución',
  'gd.show.fehApogee': 'Los espectros infrarrojos de APOGEE',
  'gd.show.fit.mid': 'Tu comparación con [Fe/H] {feh}',
  'gd.show.fit.solar': 'Tu comparación con [Fe/H] {feh}',
  'gd.show.fit.map': 'Con [Fe/H] {feh} y el enrojecimiento del mapa de polvo',
  'gd.show.fitValue': '{age} Ga; m − M {dm}; E(g − r) {e}; estadístico {s}',
  'gd.show.dustMap': 'El mapa de polvo en dirección a NGC 2420',
  'gd.show.litGaia': '{age} Ga; m − M {dm}; A_V {av}',
  'gd.show.litWebda': '{age} Ga; m − M {dm}; E(B − V) {ebv}; [Fe/H] {feh}',
  'gd.show.halfRange':
    'La mitad del intervalo de la curva de luz plegada (percentiles 1 a 99)',
  'gd.show.sineAmplitude':
    'La sinusoide de la búsqueda de periodo: su amplitud',
  'gd.show.meanV': 'La magnitud V media de SU Dra',
  'gd.show.av': 'Su extinción en V, A_V',
  'gd.show.suFeh': 'Su [Fe/H]',
  'gd.show.relation': 'La magnitud absoluta de una RR Lyrae, adoptada',
  'gd.show.mv': 'M_V de SU Dra, según esa relación',
  'gd.show.parallax': 'El paralaje de SU Dra, del telescopio espacial Hubble',
  'gd.show.parallaxDistance': 'La distancia que da, 1 / paralaje',
  'gd.show.parallaxRange': '{d} pc (un error típico: de {lo} a {hi} pc)',
  'gd.show.candleDistance': 'La distancia como candela estándar',
  'gd.show.transitPeriod': 'El periodo orbital de HD 209458 b',
  'gd.show.foundPeriod': 'Tu búsqueda de periodo encontró',
  'gd.show.periodRatio': 'El periodo orbital entre el encontrado',

  'gd.show.how.halpha':
    'Calculado en esta página para los cuatro espectros, exactamente como mide la herramienta de líneas con su ajuste de H-alfa: un continuo recto por las ventanas a cada lado de la línea, y el área que la línea le quita. Los errores salen de la dispersión de las ventanas del continuo: estos espectros no traen un error por muestra.',
  'gd.show.how.pipeline':
    'No se mide aquí. El procesado de SDSS compara cada espectro con la biblioteca ELODIE de estrellas de parámetros conocidos, y estos son el tipo catalogado y los parámetros de la que mejor coincide (la tabla SpecObj de SDSS DR18): la plantilla más cercana, no mejor que la biblioteca, que tiene pocas estrellas pobres en metales. La gravedad del Sol sale de su masa y su radio nominales.',
  'gd.show.how.core':
    'Contado en esta página, desde el centro con el que hiciste la columna de distancia (o el adoptado): las estrellas de esta tabla dentro de cada radio. El radio de la mitad de los miembros es el de Cantat-Gaudin et al., a partir de las posiciones, movimientos propios y paralajes de Gaia, que no sufren el apiñamiento de SDSS.',
  'gd.show.how.rings':
    'Contado en esta página, desde el centro con el que hiciste la columna de distancia: las estrellas más brillantes que g = 20 en un anillo alrededor del cúmulo y en otro lejos de él, cada una entre su área. Si las estrellas que hay delante y detrás del cúmulo se reparten por igual, la densidad del anillo exterior es la suya en todas partes.',
  'gd.show.how.rv':
    'Publicado: Lee et al. (2008b) eligieron 130 miembros entre los espectros de SEGUE del cúmulo por color, velocidad y metalicidad a la vez, y dan su velocidad media y su dispersión.',
  'gd.show.how.neighbors':
    'Contado en esta página, en la tabla de SEGUE tal como llegó: las estrellas de tu ventana y las de una ventana igual de ancha a cada lado.',
  'gd.show.how.feh':
    'Tu mediana se calcula en esta página con los miembros que dejó tu recorte. Las demás están publicadas, cada una con sus propias estrellas, espectros y método.',
  'gd.show.how.fits':
    'Tus propias comparaciones, tal como las dio el panel de medidas. El estadístico es la media de la distancia al cuadrado de cada estrella a la curva desplazada, en las unidades escaladas de la herramienta y con un tope: cuanto menor, más cerca. No es una probabilidad.',
  'gd.show.how.dustMap':
    'No se mide aquí: el enrojecimiento del mapa de polvo de Schlegel, Finkbeiner y Davis (1998) en dirección al cúmulo, tal como lo citan Lee et al. (2008b), convertido en E(g − r) con los coeficientes de Schlafly y Finkbeiner (2011). El mapa mide el polvo de toda la línea de visión; a la altura de NGC 2420 sobre el plano de la Galaxia, casi todo está delante del cúmulo.',
  'gd.show.how.literature':
    'Valores publicados, cada uno con sus propios datos y modelos: Cantat-Gaudin et al. ajustaron la fotometría de Gaia con isócronas PARSEC, un modelo distinto de MIST; los valores de WEBDA reúnen estudios anteriores.',
  'gd.show.how.shape':
    'Calculado en esta página con la curva de luz: la mitad de la distancia entre sus percentiles 1 y 99, junto a la amplitud de la sinusoide que ajustó tu búsqueda de periodo.',
  'gd.show.how.candle':
    'Adoptado, no se mide aquí: la magnitud V media, la extinción y el [Fe/H] de SU Dra de la tabla 1 de Benedict et al. (2011), y su relación entre el [Fe/H] de una RR Lyrae y su magnitud absoluta en V. La curva de luz no da ninguno de ellos; dice qué clase de estrella es.',
  'gd.show.how.parallax':
    'Adoptado: el paralaje que midieron Benedict et al. (2011) con los sensores de guiado fino del telescopio espacial Hubble.',
  'gd.show.how.harmonic':
    'El periodo orbital es el de Stassun et al. (2017); el otro es el de tu búsqueda de periodo, en la curva de luz de TESS.',

  // --- 1. Lo que dice un espectro -----------------------------------------------

  'gd.pop-spectra.title': '1. Lo que dice un espectro',
  'gd.pop-spectra.summary':
    'El hidrógeno y una banda molecular, la temperatura, y una estrella cuyo tipo no dice cuán luminosa es.',
  'gd.pop-spectra.intro.title': 'Cuatro estrellas, cuatro espectros',
  'gd.pop-spectra.intro.text':
    'El espectro de una estrella es su luz separada por longitudes de onda. Sus líneas oscuras son luz absorbida en la atmósfera de la estrella, y qué líneas son intensas depende sobre todo de lo caliente que esté esa atmósfera. Eso es lo que recoge un tipo espectral, A, G, K o M.\n\nVas a medir dos rasgos en cuatro espectros de SDSS, una estrella de cada tipo, todos observados en 2008: la línea de hidrógeno H-alfa y una banda de moléculas de óxido de titanio. Después conocerás una estrella a la que su tipo no describe.',
  'gd.pop-spectra.predict-lines.title':
    'Predice: la línea de hidrógeno más intensa',
  'gd.pop-spectra.predict-lines.text':
    'H-alfa la absorben los átomos de hidrógeno cuyo electrón ya está en el segundo nivel de energía. En una atmósfera fría hay pocos; en una muy caliente, casi todo el hidrógeno está ionizado. ¿Cuál de las cuatro estrellas absorberá más H-alfa?',
  'gd.pop-spectra.predict-lines.opt.a': 'La estrella A',
  'gd.pop-spectra.predict-lines.opt.g': 'La estrella G, como el Sol',
  'gd.pop-spectra.predict-lines.opt.k': 'La estrella K',
  'gd.pop-spectra.predict-lines.opt.m': 'La estrella M',
  'gd.pop-spectra.open-a.title': 'Abre el espectro de la estrella A',
  'gd.pop-spectra.open-a.text':
    'Abre el espectro de SDSS de la estrella A. Sus detalles, junto a la gráfica, dicen qué se le hizo antes de que lo veas: recortado al intervalo que comparten los cuatro y promediado de tres en tres muestras, y nada más.',
  'gd.pop-spectra.open-a.ok':
    'Abierto. Sus longitudes de onda están en el vacío, como las registra SDSS.',
  'gd.pop-spectra.halpha.title': 'Mide H-alfa',
  'gd.pop-spectra.halpha.text':
    'En el panel de medidas, elige «Línea espectral: continuo, anchura equivalente, centro» y el ajuste de H-alfa. Rellena la ventana de la línea, una ventana de continuo a cada lado con el corrimiento al rojo de esta estrella, y la longitud de onda en reposo de la línea. Mide.\n\nLa anchura equivalente es la anchura de una franja de continuo que contiene tanta luz como la que quita la línea: la intensidad de una línea en Å, sea cual sea el brillo de la estrella.',
  'gd.pop-spectra.halpha.ok':
    'Una anchura equivalente de {value} Å. El resultado también da el centro de la línea y, con él, la velocidad de la estrella a lo largo de la línea de visión.',
  'gd.pop-spectra.ew.title': '¿Cuán intensa?',
  'gd.pop-spectra.ew.text':
    '¿Cuál es la anchura equivalente de H-alfa de la estrella A, en Å?',
  'gd.pop-spectra.ew.ok':
    '{value} Å: una línea intensa. El paso siguiente la pone junto a las otras tres.',
  'gd.pop-spectra.ew.no':
    'Eso no es lo que dio tu medida: la anchura equivalente es la primera cantidad de su resultado.',
  'gd.pop-spectra.rank.title': 'Las cuatro juntas',
  'gd.pop-spectra.rank.text':
    'El panel mide H-alfa en los cuatro espectros de la misma manera. La línea se debilita de A a G, a K y a M. ¿Qué fija ese orden, sobre todo?',
  'gd.pop-spectra.rank.opt.temperature':
    'Lo caliente que está la atmósfera de cada estrella',
  'gd.pop-spectra.rank.opt.composition': 'Cuánto hidrógeno tiene cada estrella',
  'gd.pop-spectra.rank.opt.distance': 'A qué distancia está cada estrella',
  'gd.pop-spectra.rank.ok':
    'La temperatura. Las estrellas de todos los tipos son sobre todo hidrógeno; lo que cambia es cuántos de sus átomos están lo bastante excitados para absorber H-alfa. (La línea de la estrella M, además, la rellena en parte la luz que emite su cromosfera, como suele pasar en una enana M.)',
  'gd.pop-spectra.rank.no':
    'Eso no. Las estrellas son sobre todo hidrógeno sea cual sea su tipo, y una anchura equivalente es un cociente con el continuo de la propia estrella, así que su distancia se cancela. ¿Qué más cambia de una estrella a otra?',
  'gd.pop-spectra.open-m.title': 'Abre el espectro de la estrella M',
  'gd.pop-spectra.open-m.text':
    'Ahora abre el espectro de la estrella M. Más allá de 7000 Å su continuo se rompe en escalones: bandas de óxido de titanio, moléculas que solo sobreviven en una atmósfera fría.',
  'gd.pop-spectra.open-m.ok': 'Abierto.',
  'gd.pop-spectra.tio5.title': 'Mide una banda molecular',
  'gd.pop-spectra.tio5.text':
    'Una banda no tiene continuo a ambos lados, así que la herramienta de líneas no puede medirla. En el panel de medidas, elige «Índice de banda en un espectro (TiO5 y otros)» y el ajuste TiO5: el flujo medio de 7126 a 7135 Å entre el medio de 7042 a 7046 Å (Reid, Hawley y Gizis 1995). Sus ventanas son longitudes de onda en el aire, y la herramienta las pasa a las del vacío de este espectro. Mide.',
  'gd.pop-spectra.tio5.ok': 'Un índice TiO5 de {value}.',
  'gd.pop-spectra.tio5-value.title': '¿Cuán profunda?',
  'gd.pop-spectra.tio5-value.text':
    '¿Cuál es el índice TiO5 de la estrella M? Cerca de 1 significa que no hay banda; cuanto menor, más profunda.',
  'gd.pop-spectra.tio5-value.ok':
    '{value}: la banda se lleva cerca de un tercio de la luz. El TiO5 de las estrellas A, G y K está entre 0,94 y 0,98, casi sin banda: mide uno si quieres.',
  'gd.pop-spectra.tio5-value.no':
    'Eso no es lo que dio tu medida: el índice es la primera cantidad de su resultado.',
  'gd.pop-spectra.velocity.title': '¿Cuán rápida?',
  'gd.pop-spectra.velocity.text':
    'La herramienta de líneas comparó el centro medido de H-alfa con su longitud de onda en reposo, 6564,61 Å en el vacío. ¿Qué velocidad a lo largo de la línea de visión da eso a la estrella A, en km/s? Negativa es hacia nosotros.',
  'gd.pop-spectra.velocity.ok':
    '{value} km/s. El Sol y las estrellas que lo rodean giran juntos alrededor de la Galaxia, y sus velocidades unas respecto de otras son casi siempre de unas decenas de km/s. La de esta estrella es varias veces mayor.',
  'gd.pop-spectra.velocity.no':
    'Eso no es lo que dio tu medida: la velocidad está entre las cantidades de su resultado, con su incertidumbre.',
  'gd.pop-spectra.gravity.title': 'Un tipo no es una luminosidad',
  'gd.pop-spectra.gravity.text':
    'El panel da aquello a lo que el procesado de SDSS encontró más parecida cada estrella: el tipo catalogado, la temperatura, la gravedad superficial (log g, en unidades cgs) y el [Fe/H] de la estrella de una biblioteca de estrellas conocidas que mejor coincide. Las gravedades de las estrellas G, K y M están cerca de la del Sol: son enanas, de la secuencia principal. La de la estrella A es diez veces menor, aunque el tipo de su pareja, A1V, también la llame enana.\n\nPara una masa dada, la gravedad en la superficie de una estrella disminuye con el cuadrado de su radio. ¿Qué dice la gravedad baja de la estrella A?',
  'gd.pop-spectra.gravity.opt.dwarf':
    'Es una estrella A de la secuencia principal, como dice su tipo',
  'gd.pop-spectra.gravity.opt.larger':
    'Es más grande, y por tanto más luminosa, que una estrella de la secuencia principal de su temperatura',
  'gd.pop-spectra.gravity.opt.cannot': 'La gravedad no dice nada del tamaño',
  'gd.pop-spectra.gravity.ok':
    'Más grande. Una décima parte de la gravedad con una masa parecida es unas tres veces el radio y, a la misma temperatura, unas diez veces la luz. Un tipo se lee en el aspecto de un espectro y da la temperatura; dos estrellas de un mismo tipo pueden diferir en luminosidad más que dos tipos distintos.',
  'gd.pop-spectra.gravity.no':
    'Mira otra vez las gravedades. Una gravedad superficial es GM / R², así que una estrella con la décima parte de la gravedad de otra, y una masa parecida, tiene unas tres veces su tamaño.',
  'gd.pop-spectra.halo.title': '¿De dónde viene?',
  'gd.pop-spectra.halo.text':
    'Junta los números de la estrella A: una gravedad baja, una metalicidad de una cincuentava parte de la del Sol ([Fe/H] −1,67, según el procesado) y una velocidad de unos 240 km/s hacia nosotros. Las estrellas nacidas en el disco de la Galaxia son más ricas en metales y se mueven con su rotación. ¿De dónde es esta estrella?',
  'gd.pop-spectra.halo.opt.disk': 'Del disco de la Galaxia, como el Sol',
  'gd.pop-spectra.halo.opt.halo': 'Del halo de la Galaxia: una estrella vieja',
  'gd.pop-spectra.halo.opt.cannot': 'No se puede decir nada',
  'gd.pop-spectra.halo.ok':
    'Del halo, lo más probable. Pobre en metales, rápida y de gravedad baja, es el aspecto que tienen las estrellas viejas del halo cuando queman helio en su núcleo, en la rama horizontal, donde una estrella de menos masa que el Sol puede ser tan caliente como una estrella A. Los números de una sola estrella lo hacen probable, no seguro.',
  'gd.pop-spectra.halo.no':
    'Su metalicidad es una cincuentava parte de la del Sol y su velocidad varias veces la de una estrella del disco: las dos apuntan lejos del disco.',
  'gd.pop-spectra.wrap.title': 'Lo que dice un espectro',
  'gd.pop-spectra.wrap.text':
    'Las líneas de un espectro dan la temperatura de la atmósfera de una estrella: el hidrógeno en su punto más intenso en la estrella A, las moléculas solo en la más fría. Por sí solas no dicen cuán luminosa es: la estrella A de aquí parece de la secuencia principal y tiene la gravedad de una mucho mayor. La gravedad, la composición y el movimiento salen de medidas más finas, y los valores de un procesado, de la biblioteca con la que compara.\n\nA continuación: un cúmulo, cuyas estrellas están todas a una distancia, de modo que sus brillos se pueden comparar.',

  // --- 2. El diagrama color-magnitud de un cúmulo -------------------------------

  'gd.pop-cmd.title': '2. El diagrama color–magnitud de un cúmulo',
  'gd.pop-cmd.summary':
    'NGC 2420 en la fotometría de SDSS, y lo que el cartografiado dejó fuera: el núcleo apiñado, las gigantes saturadas y las estrellas de delante y de detrás.',
  'gd.pop-cmd.intro.title': 'Un cúmulo a una sola distancia',
  'gd.pop-cmd.intro.text':
    'NGC 2420 es un cúmulo abierto en Géminis, a unos 2,5 kiloparsecs: unos cientos de estrellas nacidas juntas, a una misma distancia y de una misma edad. Representa su brillo frente a su color y aparecen la secuencia principal, su punto de desvío y las gigantes, como en un diagrama de Hertzsprung–Russell, porque un color es una temperatura y, a una misma distancia, una magnitud es una luminosidad.\n\nVas a hacer ese diagrama con la fotometría de SDSS del campo y después averiguar lo que el cartografiado no pudo medir.',
  'gd.pop-cmd.open.title': 'Abre la fotometría de NGC 2420',
  'gd.pop-cmd.open.text':
    'Abre la fotometría: cada estrella que SDSS midió limpiamente a menos de 14 minutos de arco del centro del cúmulo, con sus magnitudes g (verde) y r (roja) y sus errores. Sus detalles enumeran las reducciones que se le hicieron; las vas a necesitar.',
  'gd.pop-cmd.open.ok':
    'Abierta. Se abre como un mapa del cielo: AR en horizontal, Dec en vertical.',
  'gd.pop-cmd.color.title': 'Haz un color',
  'gd.pop-cmd.color.text':
    'Un color es una diferencia de dos magnitudes: g − r es mayor para una estrella más roja y más fría. En «Cambiar lo que estás viendo», haz una columna nueva a partir de g, menos la columna r, y añádela. Después representa g en vertical y tu columna nueva en horizontal. Un eje de magnitudes pone lo brillante arriba.',
  'gd.pop-cmd.color.ok':
    'Tu color es una columna nueva, con los errores de las dos magnitudes sumados en cuadratura, y el cambio está en la lista: el archivo guardado lo recoge.',
  'gd.pop-cmd.predict-core.title': 'Predice: el centro',
  'gd.pop-cmd.predict-core.text':
    'En el cielo, ¿dónde tendrá esta tabla más estrellas por minuto de arco cuadrado?',
  'gd.pop-cmd.predict-core.opt.most':
    'En el centro, donde el cúmulo es más denso',
  'gd.pop-cmd.predict-core.opt.even': 'Igual en todas partes',
  'gd.pop-cmd.predict-core.opt.fewest':
    'En el centro, menos que en ningún otro sitio',
  'gd.pop-cmd.radius.title': '¿A qué distancia del centro?',
  'gd.pop-cmd.radius.text':
    'Haz una segunda columna: la distancia de cada estrella al centro del cúmulo. En «Columna nueva: distancia a una posición», la posición viene rellena con el centro adoptado (AR 114,602°, Dec +21,575°, de Cantat-Gaudin et al. 2020). Añade la distancia, en minutos de arco.',
  'gd.pop-cmd.radius.ok': 'Cada estrella tiene ya su distancia al centro.',
  'gd.pop-cmd.core.title': 'Cuenta el núcleo',
  'gd.pop-cmd.core.text':
    '¿Cuántas estrellas de esta tabla están a menos de 3 minutos de arco del centro? En el panel de medidas, «Filtrar las filas» las cuenta: quédate con las filas cuya distancia es menor que 3 y mide.',
  'gd.pop-cmd.core.ok':
    '{value}. Según el recuento de Gaia, la mitad de los miembros del cúmulo están a menos de unos 3,2 minutos de arco de su centro.',
  'gd.pop-cmd.core.no':
    'Vuelve a contar: filtra las filas cuya distancia es menor que 3; las filas que quedan son el recuento.',
  'gd.pop-cmd.why-core.title': '¿Por qué tan pocas?',
  'gd.pop-cmd.why-core.text':
    'El panel pone los recuentos de esta tabla junto a los de Gaia. El centro de un cúmulo es su parte más densa, no la más vacía. ¿Por qué está casi vacío aquí?',
  'gd.pop-cmd.why-core.opt.none': 'El cúmulo no tiene núcleo',
  'gd.pop-cmd.why-core.opt.crowding':
    'SDSS no pudo medir estrellas tan apiñadas',
  'gd.pop-cmd.why-core.opt.dust': 'El polvo oculta el centro',
  'gd.pop-cmd.why-core.ok':
    'El apiñamiento. El procesado fotométrico de SDSS se hizo para campos con las estrellas bien separadas; donde sus imágenes se solapan encuentra pocas, y la marca de limpieza con la que se recortó esta tabla descarta las que midió mal. Los detalles del conjunto de datos lo dicen, y An et al. (2008) volvieron a medir cúmulos así por esa razón. El núcleo falta en la tabla, no en el cielo.',
  'gd.pop-cmd.why-core.no':
    'Gaia, cuyas posiciones no necesitan una imagen limpia de un campo apiñado, cuenta la mitad de los miembros a menos de 3,2 minutos de arco. ¿Qué puede hacer que un cartografiado pierda las estrellas más apiñadas?',
  'gd.pop-cmd.field.title': 'Estrellas que no son del cúmulo',
  'gd.pop-cmd.field.text':
    'Cada estrella en la dirección del cúmulo está en esta tabla, también las que están delante y detrás de él. El panel cuenta las estrellas más brillantes que g = 20 en un anillo alrededor del cúmulo, de 3 a 8 minutos de arco, y en un anillo lejos de él, de 10 a 14,14 minutos de arco.\n\nSi las estrellas del campo se reparten por igual, ¿qué parte de las estrellas del anillo interior pertenece al campo? Es la densidad del anillo exterior entre la del interior.',
  'gd.pop-cmd.field.ok':
    '{value}. La mayoría de las estrellas de esta parte del diagrama no son del cúmulo: el diagrama de un cúmulo es el del cúmulo y su campo hasta que algo los distingue.',
  'gd.pop-cmd.field.no':
    'Divide la densidad del anillo exterior entre la del interior, tal como las da el panel.',
  'gd.pop-cmd.bright.title': 'La estrella más brillante',
  'gd.pop-cmd.bright.text':
    'Ahora el otro extremo. ¿Cuál es la g más pequeña, la de la estrella más brillante, de la tabla? En el panel de medidas, «Describir una columna» da el valor menor y el mayor de una columna.',
  'gd.pop-cmd.bright.ok':
    'g = {value}. A 2,5 kiloparsecs, las gigantes rojas más brillantes del cúmulo deberían ser más brillantes que eso.',
  'gd.pop-cmd.bright.no':
    'Describe la columna g: su valor menor es la estrella más brillante.',
  'gd.pop-cmd.why-bright.title': '¿Dónde están las gigantes?',
  'gd.pop-cmd.why-bright.text':
    'La cámara de SDSS se satura cerca de g = 14: una estrella más brillante llena sus píxeles más allá de lo que pueden contar. De las estrellas que el conjunto de datos descartó por no limpias, sus detalles dicen cuántas eran más brillantes que g = 14,5. ¿Qué les pasó a las gigantes más brillantes del cúmulo?',
  'gd.pop-cmd.why-bright.opt.none': 'El cúmulo no tiene',
  'gd.pop-cmd.why-bright.opt.saturated': 'Se saturaron y se descartaron',
  'gd.pop-cmd.why-bright.opt.far': 'Están demasiado lejos para verlas',
  'gd.pop-cmd.why-bright.ok':
    'Saturadas. La parte de arriba de este diagrama la corta la cámara, el centro el apiñamiento y la de abajo lo débil que SDSS puede medir: cada una es una selección, y ninguna es el cúmulo.',
  'gd.pop-cmd.why-bright.no':
    'Los detalles del conjunto de datos dan la razón: busca la reducción sobre las estrellas más brillantes que g = 14,5.',
  'gd.pop-cmd.faint.title': 'El extremo débil',
  'gd.pop-cmd.faint.text':
    'El propio conjunto de datos cortó la tabla en g = 22,5, donde la fotometría de SDSS deja de estar completa. ¿Cuántas estrellas descartó ese corte? Lo dicen las reducciones.',
  'gd.pop-cmd.faint.ok':
    '{value} estrellas, casi tantas como las que guarda la tabla. El límite débil es una elección que hizo el conjunto de datos y que declara: el borde débil de un diagrama es el del cartografiado, o el de quien lo construyó, nunca el del cúmulo.',
  'gd.pop-cmd.faint.no':
    'Busca en los detalles la reducción que empieza por «psfMag_g:».',
  'gd.pop-cmd.wrap.title': 'De qué está hecho el diagrama',
  'gd.pop-cmd.wrap.text':
    'El diagrama que hiciste es NGC 2420 visto a través de SDSS: sin su núcleo apiñado, sin sus gigantes más brillantes, cortado en g = 22,5, y con estrellas del campo en su mayoría en el anillo que lo rodea. Nada de eso está oculto, cada cosa está escrita en los detalles del paquete, y nada de eso es el cúmulo.\n\nA continuación: distinguir las estrellas del cúmulo de las del campo.',

  // --- 3. ¿Quién pertenece? -----------------------------------------------------------

  'gd.pop-members.title': '3. ¿Quién pertenece?',
  'gd.pop-members.summary':
    'Las velocidades de SEGUE separan el cúmulo de su campo, no del todo, y tres métodos dan tres metalicidades.',
  'gd.pop-members.intro.title': 'Una velocidad en común',
  'gd.pop-members.intro.text':
    'Las estrellas de un cúmulo se mueven juntas por la Galaxia; las del campo se mueven en todas direcciones. La velocidad de una estrella a lo largo de la línea de visión, medida con el desplazamiento Doppler de su espectro, puede distinguirlas donde una posición no puede.\n\nEl cartografiado SEGUE de SDSS tomó espectros de estrellas del campo de NGC 2420, y su procesado midió la velocidad, la temperatura, la gravedad y el [Fe/H] de cada una. Vas a elegir miembros por la velocidad y a sopesar lo que esa elección deja dentro.',
  'gd.pop-members.open.title': 'Abre los parámetros de SEGUE',
  'gd.pop-members.open.text':
    'Abre la tabla de SEGUE: la velocidad radial de cada estrella (rv), y su temperatura, gravedad superficial y [Fe/H] según el procesado de SEGUE, cada una con su incertidumbre, junto con su g y su r. Se abre con la velocidad en horizontal y [Fe/H] en vertical.',
  'gd.pop-members.open.ok': 'Abierta.',
  'gd.pop-members.predict-rv.title': 'Predice: las velocidades',
  'gd.pop-members.predict-rv.text':
    '¿Cómo serán las velocidades de las estrellas de este campo?',
  'gd.pop-members.predict-rv.opt.one': 'Un pico estrecho: todo cúmulo',
  'gd.pop-members.predict-rv.opt.spread': 'Una dispersión amplia: todo campo',
  'gd.pop-members.predict-rv.opt.two':
    'Un pico estrecho sobre una dispersión amplia',
  'gd.pop-members.crop.title': 'Elige miembros por la velocidad',
  'gd.pop-members.crop.text':
    'Las estrellas del cúmulo se amontonan en una columna estrecha de velocidad, cerca de 75 km/s. Recorta la velocidad a esa columna: en «Cambiar lo que estás viendo», quédate desde unos 65 hasta unos 85 km/s (los extremos los eliges tú: el inferior entre 55 y 72, el superior entre 78 y 95) y recorta. Las estrellas que quedan son tus miembros.',
  'gd.pop-members.crop.ok':
    'Recortado. Las demás estrellas desaparecen de la vista y se quedan en los datos: el recorte se puede deshacer.',
  'gd.pop-members.members.title': '¿Cuántos?',
  'gd.pop-members.members.text': '¿Cuántas estrellas dejó tu recorte?',
  'gd.pop-members.members.ok':
    '{value} miembros, elegidos solo por la velocidad.',
  'gd.pop-members.members.no':
    'La nota del recorte, en la lista de cambios, da las filas que dejó.',
  'gd.pop-members.rv.title': 'Su velocidad',
  'gd.pop-members.rv.text':
    '¿Cuál es la velocidad mediana de tus miembros, en km/s? En el panel de medidas, «Describir una columna» la da para la columna rv. El panel pone el valor publicado a su lado.',
  'gd.pop-members.rv.ok':
    '{value} km/s, a pocos km/s de la velocidad publicada, con otros miembros y una versión anterior del mismo procesado.',
  'gd.pop-members.rv.no':
    'Describe la columna rv con tu recorte puesto: su mediana es la respuesta.',
  'gd.pop-members.field.title': '¿Quién está en la ventana por azar?',
  'gd.pop-members.field.text':
    'Las estrellas del campo también tienen velocidades, y algunas caen en tu ventana. El panel cuenta las estrellas de tu ventana y las de una ventana igual de ancha a cada lado. Si las velocidades del campo cambian poco a lo largo de la ventana, ¿cuántas estrellas del campo hay en ella? Toma la media de las dos vecinas.',
  'gd.pop-members.field.ok':
    'Unas {value}. Es una estimación por arriba, porque algunas estrellas del propio cúmulo, con errores mayores, también caen en las vecinas; pero un corte en velocidad deja dentro algunas estrellas del campo, y fuera algunos miembros.',
  'gd.pop-members.field.no':
    'Suma los recuentos de las dos ventanas vecinas, del panel, y divide entre dos.',
  'gd.pop-members.feh.title': 'Su metalicidad',
  'gd.pop-members.feh.text':
    '¿Cuál es el [Fe/H] mediano de tus miembros según el procesado de SEGUE? Describe la columna feh.',
  'gd.pop-members.feh.ok':
    '{value}: cerca de la mitad del hierro del Sol, en la escala de este procesado.',
  'gd.pop-members.feh.no':
    'Describe la columna feh con tu recorte puesto: su mediana es la respuesta.',
  'gd.pop-members.feh-why.title': 'Tres metalicidades',
  'gd.pop-members.feh-why.text':
    'El panel pone tu mediana junto a tres valores publicados para este cúmulo: del procesado de SEGUE en 2008, de espectros ópticos de alta resolución y de los espectros infrarrojos de APOGEE de sus gigantes. Difieren en más que sus errores declarados. ¿Qué dice eso?',
  'gd.pop-members.feh-why.opt.segue': 'El valor de SEGUE es el correcto',
  'gd.pop-members.feh-why.opt.apogee': 'El valor de APOGEE es el correcto',
  'gd.pop-members.feh-why.opt.systematics':
    'Cada método tiene su propia escala: el [Fe/H] del cúmulo es incierto en unas décimas',
  'gd.pop-members.feh-why.ok':
    'Cada método tiene su propia escala. El [Fe/H] de un procesado se calibra con estrellas cuyo [Fe/H] midieron otros, y Lee et al. (2008b) encontraron que en 2008 el de SEGUE leía unos 0,3 dex por debajo en estrellas de metalicidad casi solar. La diferencia entre métodos es la incertidumbre que importa, y la próxima investigación tiene que vivir con ella.',
  'gd.pop-members.feh-why.no':
    'Cada valor trae un error pequeño, y discrepan en más que esos errores. ¿Qué puede hacer que medidas cuidadosas discrepen así?',
  'gd.pop-members.giants.title': '¿Dónde están las gigantes?',
  'gd.pop-members.giants.text':
    '¿Cuántos de tus miembros tienen una gravedad superficial menor que log g = 3,5, las gigantes? «Filtrar las filas» las cuenta: quédate con las filas cuyo logg es menor que 3,5.',
  'gd.pop-members.giants.ok':
    '{value}. SEGUE añadió sus objetivos en el campo de NGC 2420 entre g = 14,5 y 20,5 (Lee et al. 2008b), y las gigantes más brillantes del cúmulo son más brillantes que eso: otra selección, hecha antes de tomar ningún espectro.',
  'gd.pop-members.giants.no':
    'Filtra tus miembros con logg menor que 3,5; las filas que quedan son el recuento.',
  'gd.pop-members.wrap.title': 'Pertenecer es una elección',
  'gd.pop-members.wrap.text':
    'Una ventana de velocidad se queda con la mayoría de las estrellas del cúmulo y con algunas del campo; sus extremos son una elección, y los miembros que da son tan buenos como ella. El cartografiado eligió sus objetivos antes, y se perdió las gigantes. Y la metalicidad del cúmulo depende del método en que confíes.\n\nA continuación: comparar tus miembros con modelos de estrellas de una misma edad.',

  // --- 4. Edades a partir de modelos ----------------------------------------------------

  'gd.pop-age.title': '4. Edades a partir de modelos',
  'gd.pop-age.summary':
    'Las isócronas de MIST frente a los miembros: una edad y una distancia, y cómo la metalicidad y el enrojecimiento se compensan con ellas.',
  'gd.pop-age.intro.title': 'Un modelo de estrellas de una misma edad',
  'gd.pop-age.intro.text':
    'El lugar de una estrella en un diagrama color–magnitud depende de su masa y de su edad. Una isócrona es la respuesta de un modelo para estrellas de una edad y una composición: dónde estaría cada masa, calculado con un modelo de cómo evolucionan las estrellas. A medida que un cúmulo envejece, su secuencia principal se consume de arriba abajo, y la isócrona que coincide con su punto de desvío lo data.\n\nVas a comparar tus miembros con las isócronas de MIST (Choi et al. 2016), desplazadas por una distancia y un enrojecimiento, y a averiguar qué puede decidir la comparación y qué no.',
  'gd.pop-age.open-model.title': 'Abre el modelo',
  'gd.pop-age.open-model.text':
    'Abre las isócronas de MIST. Se abre como un diagrama de Hertzsprung–Russell teórico, con el logaritmo de la temperatura en horizontal (creciendo hacia la derecha, no hacia la izquierda como suele dibujarse) y el de la luminosidad en vertical, con siete edades de 1 a 4 Ga en tres metalicidades. Lee sus detalles.',
  'gd.pop-age.open-model.ok': 'Abierto.',
  'gd.pop-age.model.title': '¿Modelo o medida?',
  'gd.pop-age.model.text':
    '¿De dónde salen los números de esta tabla? Lo dicen sus detalles.',
  'gd.pop-age.model.opt.observed': 'De observaciones de estrellas',
  'gd.pop-age.model.opt.model': 'De los cálculos de un modelo',
  'gd.pop-age.model.ok':
    'De un modelo. Sus detalles dicen «Qué es: Un modelo», y no se observó ninguna estrella para hacerlo: sus g y r son lo que MIST calcula que mostraría una estrella de cada masa. Se compara con las estrellas; nunca es una de ellas.',
  'gd.pop-age.model.no':
    'Mira otra vez los detalles: ¿qué dicen que es la tabla?',
  'gd.pop-age.open.title': 'Vuelve a abrir los miembros',
  'gd.pop-age.open.text': 'Abre la tabla de SEGUE de NGC 2420.',
  'gd.pop-age.open.ok': 'Abierta.',
  'gd.pop-age.crop.title': 'Quédate con los miembros',
  'gd.pop-age.crop.text':
    'Recorta la velocidad a la ventana del cúmulo, como en la investigación anterior: desde unos 65 hasta unos 85 km/s.',
  'gd.pop-age.crop.ok': 'Recortado a tus miembros.',
  'gd.pop-age.color.title': 'Su diagrama',
  'gd.pop-age.color.text':
    'Haz una columna nueva a partir de g, menos la columna r, y representa g en vertical y tu color en horizontal.',
  'gd.pop-age.color.ok': 'El diagrama color–magnitud de tus miembros.',
  'gd.pop-age.fit-mid.title': 'Compara con las isócronas',
  'gd.pop-age.fit-mid.text':
    'En el panel de medidas, elige «Comparar con curvas de modelo (isócronas)» y la metalicidad del modelo −0,25, entre los valores de los procesados. Para cada edad desplaza la isócrona por cada módulo de distancia y cada enrojecimiento de los intervalos dados, y busca el desplazamiento que deja los miembros más cerca de ella. Deja los demás ajustes y mide: tarda unos segundos.',
  'gd.pop-age.fit-mid.ok':
    'La isócrona más cercana es la de log edad {value}; está dibujada sobre tus puntos.',
  'gd.pop-age.age-mid.title': 'Una edad',
  'gd.pop-age.age-mid.text': '¿Qué edad da, en Ga?',
  'gd.pop-age.age-mid.ok': '{value} Ga, con esta metalicidad.',
  'gd.pop-age.age-mid.no':
    'La edad está entre las cantidades del resultado de la comparación.',
  'gd.pop-age.dm-mid.title': 'Una distancia',
  'gd.pop-age.dm-mid.text':
    '¿Y qué módulo de distancia, m − M? La distancia es 10^((m − M)/5 + 1) parsecs.',
  'gd.pop-age.dm-mid.ok': 'm − M = {value}.',
  'gd.pop-age.dm-mid.no':
    'El módulo de distancia está entre las cantidades del resultado de la comparación.',
  'gd.pop-age.fit-solar.title': 'Otra metalicidad',
  'gd.pop-age.fit-solar.text':
    'Mide otra vez con la metalicidad del modelo 0, la del Sol, más cerca del valor de APOGEE.',
  'gd.pop-age.fit-solar.ok':
    'La isócrona más cercana es la de log edad {value}.',
  'gd.pop-age.dm-solar.title': 'Su distancia',
  'gd.pop-age.dm-solar.text': '¿Qué módulo de distancia da?',
  'gd.pop-age.dm-solar.ok':
    'm − M = {value}. Una estrella más rica en metales es más roja con la misma masa, así que la isócrona solar tiene que colocarse en otro sitio para alcanzar los mismos puntos.',
  'gd.pop-age.dm-solar.no':
    'El módulo de distancia está entre las cantidades del resultado de la segunda comparación.',
  'gd.pop-age.better.title': '¿Cuál se ajusta mejor?',
  'gd.pop-age.better.text':
    'El panel pone tus dos comparaciones una junto a otra. ¿Qué isócrona queda más cerca de los miembros, según el estadístico?',
  'gd.pop-age.better.opt.metal-poor': '[Fe/H] −0,25',
  'gd.pop-age.better.opt.solar': '[Fe/H] 0',
  'gd.pop-age.better.ok':
    'Esa, por cerca de una décima del estadístico, y sigue por delante con otras escalas y otros topes. Pero las dos dan edades separadas por más de un gigaaño, y las estrellas solas no pueden dar la metalicidad: una isócrona más roja y un enrojecimiento mayor pueden alcanzar los mismos puntos.',
  'gd.pop-age.better.no':
    'Compara los dos estadísticos del panel: el menor es el más cercano.',
  'gd.pop-age.fit-map.title': 'Toma el enrojecimiento de un mapa',
  'gd.pop-age.fit-map.text':
    'La comparación eligió su propio enrojecimiento. Un mapa de polvo da otro: E(g − r) ≈ 0,042 hacia NGC 2420 (el panel dice cómo). Mide otra vez con [Fe/H] −0,25 y el enrojecimiento fijo: de 0.042 a 0.042.',
  'gd.pop-age.fit-map.ok':
    'La isócrona más cercana es ahora la de log edad {value}.',
  'gd.pop-age.age-map.title': 'Otra edad',
  'gd.pop-age.age-map.text': '¿Qué edad da ahora, en Ga?',
  'gd.pop-age.age-map.ok':
    '{value} Ga. Unas centésimas de magnitud de enrojecimiento movieron la edad en más de medio gigaaño. Prueba también [Fe/H] −0,5 con el enrojecimiento del mapa: se ajusta casi tan bien como −0,25.',
  'gd.pop-age.age-map.no':
    'La edad está entre las cantidades de la comparación que acabas de hacer.',
  'gd.pop-age.decided.title': '¿Es esa la edad del cúmulo?',
  'gd.pop-age.decided.text':
    'El panel da valores publicados: una edad de 1,7 Ga con la fotometría de Gaia y otro modelo, 2,2 Ga de estudios anteriores, y módulos de distancia de 12,06 a 12,54. Tus comparaciones dan una edad que es la de la isócrona más cercana. ¿Es la edad del cúmulo?',
  'gd.pop-age.decided.opt.yes': 'Sí: la comparación la midió',
  'gd.pop-age.decided.opt.model':
    'Es la edad de MIST para la metalicidad y el enrojecimiento supuestos',
  'gd.pop-age.decided.opt.no': 'No: las isócronas no pueden datar un cúmulo',
  'gd.pop-age.decided.ok':
    'La edad de MIST, para lo que se supuso. La física de otro modelo da otra edad para las mismas estrellas, y la metalicidad, el enrojecimiento y la ley de extinción fueron elecciones. La edad de un cúmulo es la lectura que un modelo hace de su diagrama, y debe citarse con el modelo.',
  'gd.pop-age.decided.no':
    'Piensa en lo que entró en el número: un modelo de evolución estelar, una metalicidad que elegiste y un enrojecimiento ajustado o tomado de un mapa.',
  'gd.pop-age.distance.title': '¿A qué distancia?',
  'gd.pop-age.distance.text':
    'Tu comparación de metalicidad solar también dio una distancia. ¿Cuál es, en parsecs?',
  'gd.pop-age.distance.ok':
    '{value} pc, cerca de los 2587 pc de Cantat-Gaudin et al., que usan los paralajes de Gaia además de su fotometría. Con [Fe/H] −0,25 las mismas estrellas quedan unos 300 pc más cerca.',
  'gd.pop-age.distance.no':
    'La distancia está entre las cantidades de tu comparación con [Fe/H] 0.',
  'gd.pop-age.wrap.title': 'Lo que puede decir una isócrona',
  'gd.pop-age.wrap.text':
    'Una comparación con isócronas convierte un diagrama en una edad y una distancia, pero solo a través de un modelo, una metalicidad y un enrojecimiento, y estos se compensan entre sí: más azul por la metalicidad o más azul por menos polvo, más vieja y más cercana o más joven y más lejana. El modelo es la lente; las estrellas son los datos.\n\nPor último: una estrella cuya luz cambia, y una distancia a partir de eso.',

  // --- 5. Una estrella que varía --------------------------------------------------------

  'gd.pop-variable.title': '5. Una estrella que varía',
  'gd.pop-variable.summary':
    'El periodo y la curva de luz de una RR Lyrae, su distancia como candela estándar, y una búsqueda de periodo engañada por un tránsito.',
  'gd.pop-variable.intro.title': 'Una estrella que pulsa',
  'gd.pop-variable.intro.text':
    'Algunas estrellas se hinchan y se encogen, y se iluminan y se apagan con ello, con la regularidad de un reloj. Las RR Lyrae son estrellas viejas de la rama horizontal, donde lo más probable es que esté también la estrella A de la primera investigación, que pulsan en menos de un día; como todas tienen casi la misma luminosidad, medir una da una distancia.\n\nVas a medir el periodo de SU Draconis en 26 días de luz de TESS, mirar la forma de su curva de luz y hallar su distancia.',
  'gd.pop-variable.predict.title': 'Predice: ¿cuán rápido?',
  'gd.pop-variable.predict.text':
    '¿Cuánto tardará SU Draconis en ir de su máximo brillo a su máximo brillo otra vez?',
  'gd.pop-variable.predict.opt.hours': 'Horas',
  'gd.pop-variable.predict.opt.days': 'Varios días',
  'gd.pop-variable.predict.opt.months': 'Meses',
  'gd.pop-variable.open.title': 'Abre la curva de luz de SU Draconis',
  'gd.pop-variable.open.text':
    'Abre la curva de luz de TESS de SU Draconis, del sector 15 en 2019. Viene del catálogo y se instala en tu navegador la primera vez.',
  'gd.pop-variable.open.ok':
    'Abierta. Su flujo es relativo: dividido por su mediana, como dicen sus detalles.',
  'gd.pop-variable.period.title': 'Busca el periodo',
  'gd.pop-variable.period.text':
    'En el panel de medidas, elige «Búsqueda de periodo (Lomb-Scargle)», deja su intervalo y mide. Ajusta una sinusoide en cada uno de muchos periodos de prueba y da el que mejor se ajusta.',
  'gd.pop-variable.period.ok': 'Un periodo de {value} días.',
  'gd.pop-variable.period-value.title': 'El periodo',
  'gd.pop-variable.period-value.text': '¿Qué periodo encontró, en días?',
  'gd.pop-variable.period-value.ok':
    '{value} días, unas 16 horas. Monson et al. (2017) dan 0,66042 días a partir de años de observaciones.',
  'gd.pop-variable.period-value.no':
    'El periodo es la primera cantidad del resultado de la búsqueda.',
  'gd.pop-variable.fold.title': 'Pliégala',
  'gd.pop-variable.fold.text':
    'Pliega la curva de luz con ese periodo: el resultado de la búsqueda tiene un botón, «Plegar con este periodo». Cada ciclo queda sobre el primero.',
  'gd.pop-variable.fold.ok':
    'Plegada con {value} días: cada ciclo queda sobre el primero.',
  'gd.pop-variable.amplitude.title': '¿Cuánto cambia?',
  'gd.pop-variable.amplitude.text':
    '¿Qué amplitud tenía la sinusoide de la búsqueda, como fracción del flujo medio?',
  'gd.pop-variable.amplitude.ok':
    '{value}. Mira la curva de luz plegada: una subida rápida y una bajada lenta, no una sinusoide.',
  'gd.pop-variable.amplitude.no':
    'La amplitud está entre las cantidades del resultado de la búsqueda.',
  'gd.pop-variable.shape.title': 'No es una sinusoide',
  'gd.pop-variable.shape.text':
    'El panel pone la mitad del intervalo de la curva de luz plegada junto a la amplitud de la sinusoide. ¿Por qué es menor la de la sinusoide?',
  'gd.pop-variable.shape.opt.sine':
    'La curva de luz es una sinusoide, y el ruido agranda su intervalo',
  'gd.pop-variable.shape.opt.sawtooth':
    'La curva de luz no es una sinusoide: un pico agudo que una sinusoide no alcanza',
  'gd.pop-variable.shape.ok':
    'No es una sinusoide. Una sola sinusoide ajustada a un diente de sierra no llega a su pico; el resto de la forma está en sus armónicos, a la mitad del periodo, a un tercio y así sucesivamente. El periodo es correcto; la amplitud es solo la de la sinusoide.',
  'gd.pop-variable.shape.no': 'Mira la curva plegada: ¿sube y baja igual?',
  'gd.pop-variable.candle.title': 'Una candela estándar',
  'gd.pop-variable.candle.text':
    'Un periodo de unos 0,66 días y un diente de sierra de este tamaño dicen que SU Dra es una RR Lyrae que pulsa en su modo fundamental, y esas estrellas tienen casi la misma magnitud absoluta, que depende un poco de su metalicidad. El panel da los valores adoptados.\n\nCon M_V de la relación, la distancia es 10^((V − A_V − M_V)/5 + 1) parsecs. ¿Cuál es?',
  'gd.pop-variable.candle.ok':
    '{value} pc. La curva de luz dio la clase de estrella; la clase dio su luminosidad y eso, con su brillo, dio la distancia.',
  'gd.pop-variable.candle.no':
    'Calcúlala con el panel: primero M_V con la relación, después la distancia con V, A_V y M_V.',
  'gd.pop-variable.parallax.title': 'Frente a un paralaje',
  'gd.pop-variable.parallax.text':
    'El telescopio espacial Hubble midió el paralaje de SU Dra, el pequeñísimo desplazamiento de su posición mientras la Tierra gira alrededor del Sol. El panel da la distancia que implica. ¿Coinciden las dos distancias, dentro de dos errores típicos del paralaje?',
  'gd.pop-variable.parallax.opt.agree': 'Coinciden',
  'gd.pop-variable.parallax.opt.disagree': 'No coinciden',
  'gd.pop-variable.parallax.ok':
    'Coinciden. Pero no de forma independiente: el paralaje de SU Dra fue uno de los cinco que fijaron el punto cero de la relación, así que esta coincidencia prueba la aritmética más que la candela. Una prueba justa usa una estrella que no participó en la calibración.',
  'gd.pop-variable.parallax.no':
    'Compara la distancia de la candela con el intervalo del paralaje en el panel.',
  'gd.pop-variable.dust.title': 'Detrás de más polvo',
  'gd.pop-variable.dust.text':
    'SU Dra está lejos del plano de la Galaxia, detrás de poco polvo. Supón que estuviera detrás de 0,3 magnitudes más de extinción en V de las que da la tabla, y se viera igual de brillante. ¿Qué distancia daría la candela, contando ese polvo?',
  'gd.pop-variable.dust.ok':
    '{value} pc, cerca de un octavo más cerca. Deja fuera ese polvo y la estrella queda demasiado lejos en el mismo factor: una candela estándar es tan buena como la extinción que se le quita.',
  'gd.pop-variable.dust.no':
    'Usa la misma fórmula con A_V aumentada en 0,3: 10^((V − A_V − 0,3 − M_V)/5 + 1).',
  'gd.pop-variable.transit.title': 'Una búsqueda de periodo engañada',
  'gd.pop-variable.transit.text':
    'La misma búsqueda en otra estrella: abre la curva de luz de TESS de HD 209458, cuyo planeta transita cada 3,52 días, y haz la búsqueda de periodo con su intervalo por defecto.',
  'gd.pop-variable.transit.ok': 'Encontró {value} días.',
  'gd.pop-variable.harmonic.title': '¿Por qué ese periodo?',
  'gd.pop-variable.harmonic.text':
    'El panel pone el periodo orbital del planeta junto al encontrado. Su cociente está cerca de un número entero. ¿Por qué?',
  'gd.pop-variable.harmonic.opt.two': 'Hay dos planetas',
  'gd.pop-variable.harmonic.opt.harmonic':
    'Una caída breve no es una sinusoide: la búsqueda se quedó con un armónico',
  'gd.pop-variable.harmonic.opt.noise': 'Ruido, por azar',
  'gd.pop-variable.harmonic.ok':
    'Un armónico. Un tránsito es una caída corta una vez por órbita, y ninguna sinusoide sola se ajusta a él; su potencia se reparte entre los armónicos, y ganó este. La búsqueda de caja de las investigaciones de exoplanetas busca una caída, y encuentra la órbita. La respuesta de un método es tan buena como su modelo de la señal.',
  'gd.pop-variable.harmonic.no':
    'El cociente es casi exactamente 2, y HD 209458 tiene un planeta en tránsito conocido. ¿Qué pasa al ajustar una sinusoide a una caída breve?',
  'gd.pop-variable.wrap.title': 'El tiempo como medida',
  'gd.pop-variable.wrap.text':
    'El periodo y la forma de una curva de luz dicen qué clase de estrella es, y la clase puede decir cuán luminosa es: una distancia a partir de un reloj. Sus límites son los de la calibración, los de la extinción y los del método: una sinusoide encuentra el periodo de SU Dra y falla con un tránsito.\n\nAquí termina la serie. El cuaderno guarda tus respuestas y las medidas que hay detrás.',
};
