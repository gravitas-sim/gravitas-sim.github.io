// =============================================================================
// Las investigaciones guiadas del Observatorio de exoplanetas, en español
// -----------------------------------------------------------------------------
// The Spanish of ./en.exoplanet.js, id for id: js/observatory/guides/
// exoplanet.js loads both with the suite.
// =============================================================================

export const ES_EXOPLANET = {
  'gd.target.hd209458': 'la curva de luz de HD 209458',
  'gd.target.hd209458-aperture': 'la imagen de la apertura de HD 209458',
  'gd.target.kepler13-sap': 'la curva de luz recogida (SAP) de Kepler-13',
  'gd.target.kepler13-pdcsap':
    'la curva de luz corregida (PDCSAP) de Kepler-13',
  'gd.show.crowdHd': 'HD 209458: CROWDSAP',
  'gd.show.crowdK13': 'Kepler-13: CROWDSAP',
  'gd.show.shareA':
    'La parte de Kepler-13A en la luz del par, según el catálogo',
  'gd.show.adoptedRadius': 'El radio de HD 209458, adoptado',
  'gd.show.depthOf': '{target}: profundidad',
  'gd.show.ppm': '{value} ± {error} partes por millón',
  'gd.show.period': 'Periodo usado',
  'gd.show.published': 'k {k}; R* {rs} R☉; Rp {rp} RJ',
  'gd.show.odd': 'Tránsitos impares: profundidad',
  'gd.show.even': 'Tránsitos pares: profundidad',
  'gd.show.apart': 'Su diferencia, en unidades de su incertidumbre',
  'gd.show.significance': 'La profundidad, en unidades de su incertidumbre',
  'gd.show.sigmas': '{value} (hace falta {limit} para que cuente)',
  'gd.show.primary': 'El tránsito: profundidad',
  'gd.show.secondary': 'Media órbita después: profundidad',
  'gd.show.epoch': 'Época de la caja más profunda',
  'gd.show.count': 'Tránsitos en la curva de luz',
  'gd.show.simStar': 'La estrella de la simulación: radio',
  'gd.show.simPlanet': 'El planeta de la simulación: radio',
  'gd.show.rsunRjup': 'Radios de Júpiter en un radio solar',
  'gd.show.simLink': 'Abrir la investigación de tránsitos en Gravitas',
  'gd.show.how.crowding':
    'El valor de HD 209458 viene de la cabecera del archivo de SPOC del que se hizo su conjunto de datos; el de Kepler-13, de su conjunto de datos; la parte de A, de las magnitudes del TESS Input Catalog.',
  'gd.show.how.stellarRadius':
    'Adoptado, no medido aquí: una curva de luz da k, y el radio tiene que venir de la estrella.',
  'gd.show.how.depths':
    'Calculado en esta página: el flujo medio ponderado a menos de un cuarto de la duración del tránsito de su centro, frente a la media a más de una duración de él y de media órbita después, con el periodo adoptado y la época en la que la caída es más profunda. La incertidumbre incluye el ruido correlacionado en el tiempo, medido en la luz fuera de los tránsitos.',
  'gd.show.how.published':
    'NASA Exoplanet Archive, tabla Planetary Systems, consultada el 2026-09-26: el cociente de radios de cada análisis, el radio de la estrella (radios solares) y el del planeta (radios de Júpiter).',
  'gd.show.how.oddEven':
    'Calculado en esta página: la profundidad de los tránsitos impares y la de los pares, medidas como las profundidades de la investigación 4.',
  'gd.show.how.secondary':
    'Calculado en esta página: la misma profundidad, medida media órbita después del tránsito en lugar de en él.',
  'gd.show.how.count':
    'Calculado en esta página: las órbitas en las que la curva de luz tiene puntos dentro de la mitad central del tránsito.',
  'gd.show.how.simulation':
    'El HD 209458 de la simulación (js/data/exoplanetSystems.js) y los radios nominales del Sol y de Júpiter de la IAU.',
  'gd.exo-star.title': '1. ¿De quién es la luz?',
  'gd.exo-star.summary':
    'Las marcas de calidad, los píxeles que se sumaron y una segunda estrella en los mismos píxeles.',
  'gd.exo-star.intro.title': 'Antes del planeta, la luz',
  'gd.exo-star.intro.text':
    'Una curva de luz es un registro de la luz que cayó en unos pocos píxeles de una cámara, cadencia a cadencia. Antes de que pueda decir algo sobre un planeta hay que saber tres cosas: qué cadencias se conservaron, qué píxeles se sumaron y de quién es la luz que cayó en ellos.\n\nAbrirás la curva de luz de TESS de HD 209458 y el mapa de su apertura, y después Kepler-13, donde la respuesta a la última pregunta son dos estrellas.',
  'gd.exo-star.open.title': 'Abre la curva de luz de HD 209458',
  'gd.exo-star.open.text':
    'Abre la curva de luz de TESS de HD 209458 del sector 56, observada en septiembre de 2022. Los detalles de la observación, junto a la gráfica, enumeran en orden cada reducción hecha antes de que la veas.',
  'gd.exo-star.open.ok':
    'Abierta. La lista de reducciones de sus detalles es la historia de la curva de luz.',
  'gd.exo-star.quality.title': 'Lo que quitaron las marcas de calidad',
  'gd.exo-star.quality.text':
    'TESS marca en una columna QUALITY las cadencias en las que no confía: las tomadas mientras la nave descargaba sus ruedas de reacción, o mientras la luz dispersa inundaba la cámara, entre otras. Este paquete descarta cada cadencia marcada antes de promediar el resto en intervalos de 20 minutos.\n\n¿Cuántas cadencias descartó la máscara QUALITY? Lo dice la reducción que empieza por «QUALITY:».',
  'gd.exo-star.quality.ok':
    '{value} cadencias. El conjunto de datos descarta cada cadencia marcada en lugar de decidir qué marcas son inofensivas, y dice cuántas.',
  'gd.exo-star.quality.no':
    'Eso no es lo que dicen las reducciones. Busca la que empieza por «QUALITY:» en los detalles de la observación.',
  'gd.exo-star.aperture.title': 'Los píxeles que se sumaron',
  'gd.exo-star.aperture.text':
    'Abre la imagen de la apertura de HD 209458: las marcas de cada píxel dicen cómo lo usó el procesado. En el panel de medidas, elige «Apertura sobre la imagen», mide «Píxeles con una marca activada», elige la marca «in the optimal aperture, summed into the light curve» (valor 2) y mide.\n\nLa curva de luz es la suma de esos píxeles, y por tanto de cada estrella cuya luz cae en ellos.',
  'gd.exo-star.aperture.ok':
    '{value} píxeles. La herramienta también da su área en el cielo: la luz de cada estrella dentro de ella está en esta curva de luz.',
  'gd.exo-star.predict-share.title': 'Predice: dos estrellas, una apertura',
  'gd.exo-star.predict-share.text':
    'Kepler-13 es un par de estrellas separadas unos 1,2 segundos de arco en el TESS Input Catalog, mucho más cerca que el ancho de un píxel de TESS, y casi igual de brillantes. Las dos caen en una misma apertura.\n\nPredice: ¿qué parte de la luz de la apertura de Kepler-13 es de la estrella más brillante, A?',
  'gd.exo-star.predict-share.opt.all':
    'Toda: el procesado solo registra su objetivo',
  'gd.exo-star.predict-share.opt.most': 'Casi toda, más del 80 por ciento',
  'gd.exo-star.predict-share.opt.half': 'Más o menos la mitad',
  'gd.exo-star.predict-share.opt.quarter': 'Más o menos un cuarto',
  'gd.exo-star.share.title': 'La parte de A en la luz del par',
  'gd.exo-star.share.text':
    'El TESS Input Catalog da a la estrella A una magnitud TESS de 10,2306 y a la B de 10,4852 (Stassun et al. 2019). Las magnitudes son logarítmicas: una estrella Δm magnitudes más débil da 10^(−0,4 Δm) veces tanta luz.\n\n¿Qué fracción de la luz de las dos estrellas es de A? Responde con un número entre 0 y 1: la luz de A dividida entre la de A y B juntas.',
  'gd.exo-star.share.ok':
    '{value}: apenas más de la mitad. B da casi tanta luz como A.',
  'gd.exo-star.share.no':
    'No exactamente. B da 10^(−0,4 × 0,2546) veces la luz de A, así que la parte de A es 1 ÷ (1 + eso).',
  'gd.exo-star.open-k13.title': 'Abre la curva de luz de Kepler-13',
  'gd.exo-star.open-k13.text':
    'Abre la curva de luz de TESS de Kepler-13 del sector 14, observada en julio y agosto de 2019, tal como se recogió: el flujo SAP, la suma de los píxeles de la apertura antes de cualquier corrección. No viene con Gravitas: el botón la instala desde el catálogo en este navegador, donde se queda para usarla sin conexión, y la abre.',
  'gd.exo-star.open-k13.ok':
    'Abierta. Sus detalles tienen una reducción que no tienen los de HD 209458: la estimación del procesado de a quién pertenece la luz de la apertura.',
  'gd.exo-star.crowdsap.title':
    'Lo que dice el procesado sobre la contaminación',
  'gd.exo-star.crowdsap.text':
    'SPOC, el procesado que hizo esta curva de luz, estima qué parte de la luz de la apertura es del objetivo, a partir de las estrellas del catálogo y de un modelo de cómo se reparte la luz de cada una sobre los píxeles. Guarda esa fracción como CROWDSAP.\n\n¿Cuánto vale CROWDSAP para Kepler-13? Lo da la reducción que empieza por «crowding:».',
  'gd.exo-star.crowdsap.ok':
    '{value}. El procesado solo atribuye a Kepler-13A cerca del 55 por ciento de la luz de la apertura.',
  'gd.exo-star.crowdsap.no':
    'Eso no es lo que dicen los detalles. Busca la reducción que empieza por «crowding:»; el número va después de CROWDSAP.',
  'gd.exo-star.why-not-equal.title': 'Por qué difieren los dos números',
  'gd.exo-star.why-not-equal.text':
    'CROWDSAP se parece a la parte de la luz del par que calculaste con el catálogo, pero no es igual. ¿Por qué?',
  'gd.exo-star.why-not-equal.opt.aperture':
    'La apertura solo recoge parte de la luz de cada estrella, y otras más débiles añaden un poco',
  'gd.exo-star.why-not-equal.opt.noise':
    'CROWDSAP se mide con la dispersión de la curva de luz, que es ruidosa',
  'gd.exo-star.why-not-equal.opt.wrong':
    'Uno de los dos números tiene que ser un error',
  'gd.exo-star.why-not-equal.ok':
    'Sí. CROWDSAP solo cuenta la luz dentro de la apertura: cuánta luz de cada estrella cae allí depende de dónde está cada una sobre los píxeles, y estrellas más débiles del catálogo añaden algo. Las magnitudes cuentan toda la luz de las dos estrellas.',
  'gd.exo-star.why-not-equal.no':
    'Fíjate en qué cuenta cada número: las magnitudes, toda la luz de las dos estrellas; CROWDSAP, solo la que cae dentro de la apertura.',
  'gd.exo-star.wrap.title': 'Limpia y contaminada',
  'gd.exo-star.wrap.text':
    'La apertura de HD 209458 no guarda casi nada más que HD 209458; la de Kepler-13 guarda poco más de la mitad de Kepler-13A. La curva de luz corregida del procesado, el flujo PDCSAP, resta la parte de la luz de las otras estrellas usando CROWDSAP; el flujo recogido SAP la conserva. Así que en una apertura contaminada un tránsito es menos profundo en el flujo SAP, en la parte de la luz que no es de su estrella. La investigación 4 mide cuánto.',
  'gd.exo-find.title': '2. Encuentra el tránsito',
  'gd.exo-find.summary':
    'Una búsqueda de caja, un periodo, una época y un plegado.',
  'gd.exo-find.intro.title': 'Una caída que se repite',
  'gd.exo-find.intro.text':
    'Un planeta en tránsito atenúa su estrella en la misma cantidad, durante el mismo tiempo, una vez en cada órbita. Una búsqueda de caja busca justo eso: para cada periodo de prueba pliega la curva de luz, encuentra la mejor caída con forma de caja y se queda con el periodo cuya caída más destaca.\n\nLa curva de luz es la de HD 209458: 28 días de ella.',
  'gd.exo-find.predict-count.title': 'Predice: ¿cuántos tránsitos?',
  'gd.exo-find.predict-count.text':
    'HD 209458 b se descubrió en 1999 por el bamboleo de su estrella, que dio una órbita de unos tres días y medio. Predice: ¿cuántos de sus tránsitos caben en los 28 días del sector 56?',
  'gd.exo-find.predict-count.opt.one': 'Uno o dos',
  'gd.exo-find.predict-count.opt.three': 'Unos tres',
  'gd.exo-find.predict-count.opt.seven': 'Siete u ocho',
  'gd.exo-find.predict-count.opt.twenty': 'Veinte o más',
  'gd.exo-find.search.title': 'Búscalo',
  'gd.exo-find.search.text':
    'En el panel de medidas, elige «Búsqueda de tránsitos (mínimos cuadrados de caja)» y mide con sus ajustes predeterminados. Da el mejor periodo, una época (un instante de centro de tránsito), la duración y la profundidad de la caja, y cuánto destaca el mejor pico sobre el resto de la búsqueda (SDE).',
  'gd.exo-find.search.ok': 'Encontrado: un periodo de {value} días.',
  'gd.exo-find.period.title': 'El periodo',
  'gd.exo-find.period.text':
    '¿Qué periodo encontró la búsqueda de caja, en días? Cópialo de su resultado.',
  'gd.exo-find.period.ok': '{value} días.',
  'gd.exo-find.period.no':
    'Ese no es el periodo de la búsqueda. Copia el periodo de su resultado en el panel de medidas.',
  'gd.exo-find.minutes-off.title': '¿Cuánto se acerca un sector?',
  'gd.exo-find.minutes-off.text':
    'Stassun et al. (2017) dan como periodo de HD 209458 b 3,52474859 ± 0,00000038 días, a partir de tránsitos repartidos a lo largo de muchos años. ¿En cuántos minutos difiere de él el periodo de tu búsqueda de caja? (Un día tiene 1440 minutos; da el tamaño de la diferencia).',
  'gd.exo-find.minutes-off.ok':
    '{value} minutos. Un sector guarda unos ocho tránsitos, así que un periodo desviado un minuto mueve el último unos ocho minutos, una parte pequeña de un tránsito de tres horas: un sector fija el periodo solo a grandes rasgos, y la rejilla de periodos de prueba de la búsqueda añade su propio paso.',
  'gd.exo-find.minutes-off.no':
    'No exactamente: resta un periodo del otro y multiplica por 1440.',
  'gd.exo-find.fold.title': 'Pliégala',
  'gd.exo-find.fold.text':
    'Pliega la curva de luz con el periodo y la época de la búsqueda: su resultado tiene un botón, «Plegar con este periodo», que lo hace. Plegar pone cada órbita encima de la primera, así que cada tránsito cae en la fase cero.',
  'gd.exo-find.fold.ok':
    'Plegada con {value} días: los tránsitos quedan en la fase cero, uno encima de otro.',
  'gd.exo-find.no-error.title': 'De dónde sale una incertidumbre',
  'gd.exo-find.no-error.text':
    'La búsqueda de caja dio un periodo, pero ninguna incertidumbre. ¿De dónde sale la incertidumbre de un periodo?',
  'gd.exo-find.no-error.opt.grid':
    'Del espaciado de los periodos de prueba de la búsqueda',
  'gd.exo-find.no-error.opt.fit':
    'De un ajuste de un modelo de tránsito, cuya covarianza da a cada parámetro un error típico',
  'gd.exo-find.no-error.opt.none': 'Un periodo medido con datos no tiene',
  'gd.exo-find.no-error.ok':
    'Sí. El espaciado de prueba es lo fino que miró la búsqueda, no lo bien que fijan los datos el periodo. Un ajuste de un modelo de tránsito, en la investigación 3, da el periodo con un error, y dice cuánto fiarse de él.',
  'gd.exo-find.no-error.no':
    'El espaciado de los periodos de prueba dice lo fino que miró la búsqueda, no lo bien que fijan los datos el periodo.',
  'gd.exo-find.wrap.title': 'Encontrado, todavía no medido',
  'gd.exo-find.wrap.text':
    'Un periodo, una época y una profundidad de una búsqueda: basta para decir dónde están los tránsitos, no todavía qué los produjo. Una caja tiene una profundidad; un planeta tiene un tamaño. La investigación 3 ajusta un modelo que distingue las dos cosas.',
  'gd.exo-fit.title': '3. Ajusta el tránsito',
  'gd.exo-fit.summary':
    'El cociente de radios, lo que los datos no pueden separar y el radio del planeta.',
  'gd.exo-fit.intro.title': 'Un modelo de un tránsito',
  'gd.exo-fit.intro.text':
    'El modelo de tránsito del panel de ajuste es un disco oscuro que cruza una estrella más brillante en el centro que en el borde (oscurecimiento hacia el limbo), en una órbita circular. Sus parámetros son el periodo y la época, el cociente k entre el radio del planeta y el de la estrella, el tamaño de la órbita en radios estelares (a/R*), a qué distancia del centro de la estrella pasa el planeta (el parámetro de impacto, b) y dos parámetros de oscurecimiento hacia el limbo.\n\nEl ajuste encuentra los valores que acercan más el modelo a los datos, ponderados por los errores de los datos, y sus incertidumbres.',
  'gd.exo-fit.fit.title': 'Ajusta el tránsito de HD 209458',
  'gd.exo-fit.fit.text':
    'Abre el panel de ajuste sobre la curva de luz de HD 209458, sin plegar. Elige el modelo de tránsito, deja en 0 la parte de la luz que viene de otras estrellas y ajusta.',
  'gd.exo-fit.fit.ok': 'Ajustado: k = {value}.',
  'gd.exo-fit.ratio.title': 'El cociente de radios',
  'gd.exo-fit.ratio.text':
    '¿Qué cociente de radios k encontró tu ajuste? Cópialo de la tabla de resultados.',
  'gd.exo-fit.ratio.ok':
    '{value}. El planeta tapa k² del disco de la estrella, pero la estrella es más brillante en el centro que en el borde, así que la profundidad no es exactamente k²: por eso da k un ajuste, y no la profundidad sola.',
  'gd.exo-fit.ratio.no':
    'Copia k de la tabla de resultados: la fila del cociente de radios.',
  'gd.exo-fit.pair.title': 'Lo que los datos no pueden separar',
  'gd.exo-fit.pair.text':
    'Mira la tabla «Qué parámetros separan los datos» bajo el ajuste. Un valor cercano a +1 o −1 significa que dos parámetros pueden compensarse entre sí sin apenas cambiar el ajuste. ¿Cuál de estos pares correlaciona más tu ajuste?',
  'gd.exo-fit.pair.opt.b-aRs': 'b y a/R*',
  'gd.exo-fit.pair.opt.k-t0': 'k y la época',
  'gd.exo-fit.pair.opt.P-t0': 'El periodo y la época',
  'gd.exo-fit.pair.opt.q1-P':
    'El primer parámetro de oscurecimiento hacia el limbo y el periodo',
  'gd.exo-fit.pair.ok':
    'Sí. Una órbita más amplia que cruza cerca del centro de la estrella dura más o menos lo mismo que una más cercana que cruza más cerca del borde, y esta curva de luz apenas las distingue. Por eso también avisa el ajuste de que algunos parámetros están mal determinados.',
  'gd.exo-fit.pair.no':
    'Busca la entrada de la tabla más alejada de cero, y los dos parámetros que une.',
  'gd.exo-fit.residuals.title': '¿Son los residuos solo ruido?',
  'gd.exo-fit.residuals.text':
    'El ajuste da beta: cuánto más se dispersan los residuos, promediados en la escala de tiempo del tránsito, de lo que lo haría un ruido independiente (Pont, Zucker y Queloz 2006). Beta cerca de 1 significa que los residuos se comportan como ruido blanco; por encima de 1, están correlacionados en el tiempo, y las incertidumbres deben crecer con él.\n\n¿Cuánto vale beta en tu ajuste?',
  'gd.exo-fit.residuals.ok':
    'Beta = {value}. La columna «También por el ruido correlacionado» de la tabla de resultados lo tiene en cuenta: esas son las incertidumbres que hay que citar.',
  'gd.exo-fit.residuals.no':
    'Copia beta de la lista de estadísticos bajo la tabla de resultados.',
  'gd.exo-fit.radius.title': 'De un cociente a un radio',
  'gd.exo-fit.radius.text':
    'k es un cociente: el radio del planeta es k veces el de la estrella, y el radio de la estrella no está en la curva de luz. Esta investigación adopta R* = 1,19 ± 0,02 radios solares (Stassun et al. 2017). Escríbelo, con su incertidumbre, en los campos del radio de la estrella del panel de ajuste, y ajusta de nuevo.',
  'gd.exo-fit.radius.ok':
    'Ajustado con el radio de la estrella: el ajuste deriva ahora el radio del planeta, Rp = {value} radios de Júpiter, con la incertidumbre de la estrella sumada a la del ajuste.',
  'gd.exo-fit.planet-radius.title': 'El radio del planeta',
  'gd.exo-fit.planet-radius.text':
    '¿Qué radio del planeta Rp derivó el ajuste, en radios de Júpiter?',
  'gd.exo-fit.planet-radius.ok':
    '{value} radios de Júpiter. Stassun et al. (2017) dan 1,39 ± 0,02.',
  'gd.exo-fit.planet-radius.no':
    'Copia Rp de las filas derivadas de la tabla de resultados.',
  'gd.exo-fit.torres.title': '¿Qué estrella?',
  'gd.exo-fit.torres.text':
    'Torres, Winn y Holman (2008) dan en cambio 1,155 radios solares como radio de la estrella. Con tu k, ¿cuál sería el radio del planeta con su estrella? Rp = k × R*, y un radio solar son 9,7312 radios de Júpiter.',
  'gd.exo-fit.torres.ok':
    '{value} radios de Júpiter: una estrella un 3 por ciento menor da un planeta un 3 por ciento menor. El radio de un planeta es tan bueno como el de su estrella, y ninguna curva de luz puede comprobar el de la estrella.',
  'gd.exo-fit.torres.no': 'Multiplica tu k por 1,155 y por 9,7312.',
  'gd.exo-fit.wrap.title': 'Lo que decidió el ajuste, y lo que supuso',
  'gd.exo-fit.wrap.text':
    'La curva de luz decidió k y la forma del tránsito, y decidió a/R* y b solo juntos. El radio del planeta necesitó un número más, el de la estrella, adoptado de la bibliografía y arrastrado con su incertidumbre. El panel de ajuste nombra cada parámetro como ajustado, fijo o derivado: esa lista es la declaración honesta de lo que decidieron los datos.',
  'gd.exo-dilution.title': '4. Una estrella que no está sola',
  'gd.exo-dilution.summary':
    'Kepler-13: la luz de una compañera oculta buena parte del tránsito, y la curva de luz no puede decir de quién es el planeta.',
  'gd.exo-dilution.intro.title': 'Dos estrellas, un tránsito',
  'gd.exo-dilution.intro.text':
    'Kepler-13 es el par de la investigación 1: dos estrellas casi iguales, a 1,2 segundos de arco, en una misma apertura de TESS. Un planeta transita una de ellas cada 1,76 días. Aquí mides cuánto del tránsito oculta la luz de la otra estrella, qué hace eso con el tamaño del planeta y qué no puede decirte la curva de luz por sí sola.',
  'gd.exo-dilution.open-sap.title': 'Abre la curva de luz recogida',
  'gd.exo-dilution.open-sap.text':
    'Abre la curva de luz SAP de Kepler-13: la luz de la apertura tal como se recogió, con la de todas las estrellas.',
  'gd.exo-dilution.open-sap.ok': 'Abierta.',
  'gd.exo-dilution.open-pdcsap.title': 'Abre la curva de luz corregida',
  'gd.exo-dilution.open-pdcsap.text':
    'Abre ahora la curva de luz PDCSAP del mismo sector: las mismas cadencias, con las correcciones del procesado, una de las cuales resta la parte de la luz de las otras estrellas suponiendo que la luz que importa es la del objetivo, A.',
  'gd.exo-dilution.open-pdcsap.ok': 'Abierta. Compara el tránsito en cada una.',
  'gd.exo-dilution.predict-ratio.title': 'Predice: ¿cuánto menos profundo?',
  'gd.exo-dilution.predict-ratio.text':
    'Predice: ¿cómo es la profundidad del tránsito en la luz recogida (SAP) comparada con la de la luz corregida (PDCSAP)?',
  'gd.exo-dilution.predict-ratio.opt.same':
    'La misma: corregir la luz no puede cambiar una caída',
  'gd.exo-dilution.predict-ratio.opt.crowdsap':
    'Menos profunda, más o menos en el factor CROWDSAP',
  'gd.exo-dilution.predict-ratio.opt.double': 'El doble de profunda',
  'gd.exo-dilution.ratio.title': 'Las dos profundidades, medidas igual',
  'gd.exo-dilution.ratio.text':
    'Esta página mide la profundidad de cada tránsito de la misma manera: el flujo medio en la mitad central del tránsito frente a la media lejos de él, con el periodo de 1,763588 días (Esteves et al. 2015) y la época en la que la caída es más profunda. ¿Cuánto da la profundidad SAP dividida entre la profundidad PDCSAP?',
  'gd.exo-dilution.ratio.ok':
    '{value}: cerca de CROWDSAP, 0,549. El flujo PDCSAP es el flujo SAP sin la parte de la luz de las otras estrellas, lo que hace la caída más profunda en 1 ÷ CROWDSAP.',
  'gd.exo-dilution.ratio.no':
    'Divide la profundidad SAP entre la profundidad PDCSAP, las dos del recuadro de arriba.',
  'gd.exo-dilution.fit-raw.title': 'Ajusta la luz recogida',
  'gd.exo-dilution.fit-raw.text':
    'Ajusta el modelo de tránsito a la curva de luz SAP dejando en 0 la parte de la luz que viene de otras estrellas: como si cada fotón de la apertura viniera de la estrella del planeta.',
  'gd.exo-dilution.fit-raw.ok': 'Ajustado: k = {value}.',
  'gd.exo-dilution.raw-ratio.title': 'El cociente, con la luz de la compañera',
  'gd.exo-dilution.raw-ratio.text':
    '¿Qué cociente de radios k encontró ese ajuste?',
  'gd.exo-dilution.raw-ratio.ok':
    '{value}. Guárdalo: el último paso lo pone junto a lo que han publicado otros.',
  'gd.exo-dilution.raw-ratio.no':
    'Copia k de la tabla de resultados del ajuste.',
  'gd.exo-dilution.dilute.title':
    '¿Cuánta luz no es de la estrella del planeta?',
  'gd.exo-dilution.dilute.text':
    'La «parte de la luz que viene de otras estrellas» del panel de ajuste es la fracción de la luz de la apertura que no es de la estrella del planeta: el modelo rellena el tránsito en esa fracción. Si la estrella es A, ¿cuánto vale, a partir de CROWDSAP?',
  'gd.exo-dilution.dilute.ok': '{value}: uno menos CROWDSAP.',
  'gd.exo-dilution.dilute.no':
    'Es la parte que no es de A: uno menos CROWDSAP.',
  'gd.exo-dilution.fit-diluted.title': 'Ajústala de nuevo, diluida',
  'gd.exo-dilution.fit-diluted.text':
    'Escribe esa parte en el panel de ajuste y ajusta de nuevo la curva de luz SAP.',
  'gd.exo-dilution.fit-diluted.ok':
    'Ajustado: k = {value}, cerca de lo que da la curva de luz corregida. Quitar la luz de la compañera de los datos, como hace el flujo PDCSAP, y ponerla en el modelo, como hace la dilución, son la misma corrección.',
  'gd.exo-dilution.if-b.title': '¿Y si el planeta orbita B?',
  'gd.exo-dilution.if-b.text':
    'Supón que el planeta orbita B. Entonces diluye su tránsito todo lo que no es luz de B, y B tiene como mucho uno menos CROWDSAP de la luz de la apertura. Sin tener en cuenta el oscurecimiento hacia el limbo, k ≈ √(profundidad ÷ la parte de la luz de la estrella del planeta).\n\nCon la profundidad SAP de arriba, ¿cuánto vale k si la estrella es B y toda la luz que no es de A es de B?',
  'gd.exo-dilution.if-b.ok':
    '{value}: mayor que para A, y aun así el menor posible. Una estrella más débil necesita un planeta más grande para la misma caída, y el radio de B no es el de A, así que el radio del planeta volvería a cambiar.',
  'gd.exo-dilution.if-b.no':
    'Divide la profundidad SAP entre uno menos CROWDSAP y saca la raíz cuadrada.',
  'gd.exo-dilution.which-star.title': '¿De quién es el planeta?',
  'gd.exo-dilution.which-star.text':
    'Solo con esta curva de luz, ¿qué estrella orbita el planeta?',
  'gd.exo-dilution.which-star.opt.a': 'A, la estrella más brillante',
  'gd.exo-dilution.which-star.opt.b': 'B, la más débil',
  'gd.exo-dilution.which-star.opt.cannot': 'La curva de luz no puede decirlo',
  'gd.exo-dilution.which-star.ok':
    'Exacto. Las dos estrellas están dentro de un mismo píxel, y cualquiera de ellas podría tener un planeta que produjera esta caída: un planeta distinto para cada una. Decidirlo requiere pruebas que no puede dar una curva de luz de las dos estrellas juntas. Los valores publicados de arriba difieren donde esta investigación dice que tienen que diferir: el cociente va de 0,065 a 0,087 y el radio de 1,41 a 2,30 radios de Júpiter, porque cada análisis eligió su propia dilución y su propio radio de la estrella.',
  'gd.exo-dilution.which-star.no':
    '¿Qué parte de la curva de luz podría distinguir el tránsito de A del de B, si las dos estrellas caen dentro de un mismo píxel?',
  'gd.exo-dilution.wrap.title': 'Un radio es un conjunto de elecciones',
  'gd.exo-dilution.wrap.text':
    'Un mismo planeta tiene cocientes de radios publicados de 0,065 a 0,087 y radios de 1,41 a 2,30 radios de Júpiter. Tus ajustes muestran de dónde sale buena parte de ese intervalo: qué luz se quita, y el radio de qué estrella multiplica k. Un ajuste sin diluir de la luz recogida da un cociente cercano al menor publicado. Cuando un resultado depende de una elección que los datos no pueden hacer, la elección forma parte del resultado.',
  'gd.exo-planet.title': '5. ¿Es un planeta?',
  'gd.exo-planet.summary':
    'Tránsitos pares e impares, media órbita después, la versión de la simulación y lo que un tránsito no puede pesar.',
  'gd.exo-planet.intro.title': 'Una caída todavía no es un planeta',
  'gd.exo-planet.intro.text':
    'Dos estrellas que se eclipsan pueden producir una caída que se repite, y también un par así cuya luz se mezcla con la de una estrella más brillante. Antes de llamar planeta a una caída, los astrónomos la ponen a prueba con la propia curva de luz: ¿son iguales los tránsitos pares y los impares, y hay una segunda caída media órbita después? Luego se preguntan qué no puede decirles la curva de luz.',
  'gd.exo-planet.predict-binary.title': 'Predice: ¿qué delata a una binaria?',
  'gd.exo-planet.predict-binary.text':
    'Predice: ¿cuál de estas cosas mostraría que una caída viene de dos estrellas que se eclipsan, no de un planeta?',
  'gd.exo-planet.predict-binary.opt.secondary':
    'Una segunda caída media órbita después',
  'gd.exo-planet.predict-binary.opt.alternate':
    'Caídas pares e impares de profundidades distintas',
  'gd.exo-planet.predict-binary.opt.vshape':
    'Una caída en forma de V en lugar de una de fondo plano',
  'gd.exo-planet.predict-binary.opt.all': 'Cualquiera de ellas',
  'gd.exo-planet.open.title': 'Abre la curva de luz de HD 209458',
  'gd.exo-planet.open.text':
    'Abre otra vez la curva de luz de HD 209458: los pasos siguientes la miden.',
  'gd.exo-planet.open.ok': 'Abierta.',
  'gd.exo-planet.odd-even.title': 'Pares e impares',
  'gd.exo-planet.odd-even.text':
    'Dos estrellas desiguales que se eclipsan, miradas con la mitad de su periodo real, alternan una caída profunda y otra menos profunda. Esta página mide por separado los tránsitos impares y los pares. ¿Difieren en más de tres veces la incertidumbre de su diferencia?',
  'gd.exo-planet.odd-even.opt.equal':
    'No: pares e impares son iguales dentro de sus incertidumbres',
  'gd.exo-planet.odd-even.opt.different': 'Sí: difieren',
  'gd.exo-planet.odd-even.ok':
    'Eso dicen los datos. Iguales dentro de sus incertidumbres no es señal de dos estrellas desiguales; distintos lo sería.',
  'gd.exo-planet.odd-even.no':
    'Compara su diferencia, en unidades de su incertidumbre, con 3.',
  'gd.exo-planet.secondary.title': 'Media órbita después',
  'gd.exo-planet.secondary.text':
    'Media órbita después de un tránsito, el planeta pasa por detrás de su estrella. Una estrella compañera que eclipsara pasaría también por detrás, y su propia parte de la luz desaparecería. Esta página mide la profundidad media órbita después del tránsito. ¿Hay ahí una caída de más de tres veces su incertidumbre?',
  'gd.exo-planet.secondary.opt.none': 'No',
  'gd.exo-planet.secondary.opt.dip': 'Sí',
  'gd.exo-planet.secondary.ok':
    'Eso dicen los datos. El eclipse de una estrella compañera se vería aquí casi siempre; la luz propia de un planeta es mucho más débil que la de una estrella.',
  'gd.exo-planet.secondary.no':
    'Compara la profundidad, en unidades de su incertidumbre, con 3.',
  'gd.exo-planet.blend.title': '¿Una estrella al fondo?',
  'gd.exo-planet.blend.text':
    'Una binaria eclipsante débil en la misma apertura también podría producir una caída, diluida por la luz de HD 209458. El CROWDSAP de SPOC para esta curva de luz es 0,99778908: esa parte de la luz de la apertura es de HD 209458, según el catálogo, y el resto es de todas las demás estrellas catalogadas.\n\n¿Cuál es la caída más profunda que podrían producir esas otras estrellas, si toda su luz desapareciera a la vez? Dala como fracción de la luz.',
  'gd.exo-planet.blend.ok':
    '{value}: una quinta parte de un uno por ciento, frente a un tránsito de uno y medio. Ninguna vecina catalogada podría producir esta caída, ni eclipsada por completo; solo podría una estrella que el catálogo no recoge, y por eso los astrónomos miran también con telescopios más nítidos.',
  'gd.exo-planet.blend.no':
    'Las otras estrellas tienen uno menos CROWDSAP de la luz.',
  'gd.exo-planet.simulation.title': 'El HD 209458 de la simulación',
  'gd.exo-planet.simulation.text':
    'La investigación de tránsitos de Gravitas y su Transit Lab simulan HD 209458 con una estrella de 1,155 radios solares y un planeta de 1,38 radios de Júpiter: valores redondeados de la bibliografía. ¿Qué cociente de radios k usa la simulación? Un radio solar son 9,7312 radios de Júpiter.',
  'gd.exo-planet.simulation.ok':
    '{value}. Ponlo junto al k que encontró tu ajuste en la investigación 3: la simulación se construye con valores publicados, tu ajuste con esta curva de luz, y no tienen por qué coincidir hasta la última cifra.',
  'gd.exo-planet.simulation.no': 'Divide 1,38 entre 1,155 × 9,7312.',
  'gd.exo-planet.mass.title': 'Lo que un tránsito no puede pesar',
  'gd.exo-planet.mass.text':
    'La curva de luz dio el tamaño de HD 209458 b. ¿Qué haría falta para conocer su masa, y con ella su densidad?',
  'gd.exo-planet.mass.opt.transit': 'Una curva de luz más larga',
  'gd.exo-planet.mass.opt.rv':
    'La velocidad radial de la estrella: su bamboleo hacia nosotros y alejándose mientras el planeta orbita',
  'gd.exo-planet.mass.opt.depth': 'Una profundidad de tránsito más precisa',
  'gd.exo-planet.mass.ok':
    'Sí. Un tránsito da un tamaño; el movimiento de la estrella da una masa (también, en planetas que tiran unos de otros, el momento de sus tránsitos). Stassun et al. (2017) dan a HD 209458 b 0,73 ± 0,04 masas de Júpiter, a partir de velocidades radiales. Gravitas todavía no trae velocidades radiales de una estrella con tránsitos, así que aquí la densidad del planeta queda sin medir; la investigación de velocidad radial trabaja con un sondeo simulado.',
  'gd.exo-planet.mass.no':
    '¿Qué medida responde al tirón del planeta sobre su estrella?',
  'gd.exo-planet.wrap.title': 'De los fotones a un planeta',
  'gd.exo-planet.wrap.text':
    'A partir de un registro de fotones encontraste un periodo, un cociente de radios y, con una estrella adoptada, un radio; pusiste la caída a prueba frente a dos maneras en que se delata una binaria eclipsante; y viste cómo una apertura contaminada oculta medio tránsito y deja sin decidir la estrella del planeta. Falta la masa del planeta, que necesita el movimiento de la estrella. Cada número que comprobaste salió de los datos por un método explicado, o se adoptó de una fuente citada y se nombró como adoptado.',
  'gd.suite.exoplanet.intro':
    'Un conjunto de investigaciones con curvas de luz reales de TESS, pensadas para hacerse en orden: de quién es la luz que guarda una curva de luz, cómo encontrar un tránsito, cómo ajustarlo, una estrella cuya luz no es toda suya, y si la caída es de verdad un planeta. Cada una usa las herramientas de esta página, y cada número que comprueba un paso sale de los datos o de una fuente citada que el paso nombra. El itinerario introductorio es el núcleo; el avanzado le añade pasos.',
};
