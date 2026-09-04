// =============================================================================
// Spanish
// -----------------------------------------------------------------------------
// Overrides against js/i18n/en.js. An id that is absent here falls back to the
// English catalogue, which is why this file may be partial without producing a
// blank or a half-sentence anywhere.
//
// The investigations are absent from the English catalogue as well, so they are
// not a gap here: they are English by design, and locale.coverage.es says so to
// anybody who selects this language.
//
// Conventions
// -----------------------------------------------------------------------------
//   Neutral, pan-regional Spanish. No voseo, no regionalisms; "computadora" and
//   "ordenador" are both avoided by rewriting rather than by choosing a side.
//   Second person is "usted"-neutral: instructions are written impersonally
//   ("Pulse" is avoided in favour of infinitives and noun phrases) so the
//   interface does not have to pick a register for a mixed audience.
//
//   Astronomical terms follow the usage of the Spanish-language astronomy
//   press: "agujero negro", "enana blanca", "estrella de neutrones",
//   "cinturón de Kuiper", "zona habitable", "curva de luz", "velocidad radial".
//
//   Units keep their international symbols (AU stays AU, M☉ stays M☉): those are
//   read by astronomers in every language and translating them would make the
//   readouts disagree with every textbook a student owns.
// =============================================================================

export const ES = {
  // --- Locale and the language picker ---------------------------------------
  'locale.picker.label': 'Idioma',
  'locale.picker.hint': 'Cambiar el idioma de la interfaz',
  'locale.coverage.es': 'Interfaz e investigaciones en español.',
  'locale.coverage.complete': 'Traducción completa.',

  // --- Presentation: embed ---------------------------------------------------
  'embed.figure.title': 'Simulación de Gravitas: {scenario}',
  'embed.figure.titleGeneric': 'Simulación interactiva de Gravitas',
  'embed.action.openFull': 'Abrir en Gravitas',
  'embed.action.openFull.hint':
    'Abrir esta simulación a tamaño completo en una pestaña nueva, con todos los controles',

  // --- Presentation: the share dialog's embed half ---------------------------
  'share.action.copyEmbed': 'Copiar código de inserción',
  'share.action.copyEmbed.hint':
    'Copiar un iframe que muestra exactamente esta simulación, listo para pegar en una página de Canvas, Blackboard o Moodle',
  'share.embed.copied': 'Código de inserción copiado',
  'share.embed.copyFailed': 'Pulsar Ctrl/Cmd + C para copiar el código',
  'share.embed.note':
    'Pegar en el editor HTML de una página del curso. La figura sigue siendo interactiva.',

  // --- Presentation: lecture -------------------------------------------------
  'lecture.lectureBar.label': 'Presentación',
  'lecture.action.enter': '🎦 Modo presentación',
  'lecture.action.enter.hint':
    'Ocupar toda la pantalla para proyectar: texto y controles más grandes, tema Luz de día, puntero de foco y flechas para recorrer una secuencia de enlaces preparada. Escape sale.',
  'lecture.action.exit': 'Salir del modo presentación',
  'lecture.action.exit.hint': 'Volver a la interfaz normal (Escape)',
  'lecture.action.spotlight': 'Foco',
  'lecture.action.spotlight.hint':
    'Atenuar todo salvo un círculo alrededor del puntero, para dirigir la atención sobre una simulación proyectada',
  'lecture.action.next': 'Siguiente',
  'lecture.action.next.hint':
    'Ir al siguiente estado preparado (flecha derecha)',
  'lecture.action.previous': 'Anterior',
  'lecture.action.previous.hint': 'Ir al estado anterior (flecha izquierda)',
  'lecture.action.sequence': 'Secuencia',
  'lecture.action.sequence.hint':
    'Preparar o cargar una lista ordenada de enlaces',
  'lecture.sequence.heading': 'Secuencia de la clase',
  'lecture.sequence.intro':
    'Pegar enlaces de Gravitas, uno por línea, en el orden en que se presentarán. Las flechas los recorren sin salir del modo presentación.',
  'lecture.sequence.load': 'Cargar secuencia',
  'lecture.sequence.placeholder': 'https://gravitas-sim.online/#\u2026',
  'lecture.sequence.clear': 'Vaciar',
  'lecture.sequence.empty': 'No hay ninguna secuencia cargada',
  'lecture.sequence.loaded': {
    one: '{n} estado cargado',
    other: '{n} estados cargados',
  },
  'lecture.sequence.rejected': {
    one: '{n} línea no era un enlace de Gravitas',
    other: '{n} líneas no eran enlaces de Gravitas',
  },
  'lecture.sequence.position': 'Paso {n} de {total}',
  'lecture.sequence.atStart': 'Ya está en el primer estado',
  'lecture.sequence.atEnd': 'Ya está en el último estado',
  'lecture.sequence.failed': 'No se pudo abrir ese estado',

  // --- Application chrome ----------------------------------------------------
  'chrome.mobileMenuToggle.hint': 'Mostrar los controles de la simulación',
  'chrome.mobileMenuToggle.label': 'Abrir el menú de controles',
  'chrome.tutorial.hint':
    'Abrir la visita guiada por los controles de la simulación. Arrastrar el panel para moverlo.',
  'chrome.text1': 'Ir a los controles',
  'chrome.text2': 'Gravitas: laboratorio interactivo de astrofísica',

  // --- Footer ----------------------------------------------------------------
  'footer.theme.hint':
    'Cambiar la combinación de colores de la interfaz. Observatorio usa tonos rojos para conservar la visión nocturna; Luz de día conviene a salas iluminadas y a proyectores (T alterna).',
  'footer.attribution.hint': 'Carl Ziegler: autor de Gravitas',
  'footer.attribution.hint.2':
    'Contra qué se ha comprobado el motor físico: 135 verificaciones con error medido, tolerancia declarada y una razón para cada tolerancia. Se ejecuta en directo en el navegador.',
  'footer.attribution.hint.3':
    'Consultar o contribuir al código fuente en GitHub',
  'footer.attribution': 'Validado',

  // --- Rail: scenario --------------------------------------------------------
  'rail.railScenario.hint': 'Mostrar u ocultar los controles de escenario',
  'rail.loadScenario.hint':
    'Explorar los escenarios incluidos por imagen, concepto o palabra clave: desde el sistema solar hasta la fusión de agujeros negros GW150914.',
  'rail.investigations.hint':
    'Lecciones guiadas que recorren un concepto paso a paso, con preguntas y un informe de laboratorio opcional que se puede entregar',
  'rail.settings.hint':
    'Abrir el panel completo de ajustes: número de objetos, gravedad, aspecto visual y rendimiento. Los cambios estructurales reinician la simulación; el resto se aplica en directo.',
  'rail.refreshScenario.hint':
    'Reconstruir el escenario actual desde cero, descartando todo lo añadido o modificado.',
  'rail.resetAll.hint':
    'Devolver todos los ajustes a sus valores de fábrica y cargar el escenario Agujeros negros binarios.',
  'rail.cleanSim.hint':
    'Vaciar el universo hasta dejar espacio vacío, para construir un sistema desde cero haciendo clic y arrastrando.',

  // --- Rail: state -----------------------------------------------------------
  'rail.railState.hint': 'Mostrar u ocultar los controles de estado',
  'rail.save.hint':
    'Guardar en este navegador los objetos, los ajustes y la vista actuales. Hay una sola ranura: al guardar de nuevo se sobrescribe.',
  'rail.load.hint':
    'Restaurar la última simulación guardada en este navegador.',
  'rail.undo.hint': 'Quitar el último objeto colocado (Z)',
  'rail.share.hint':
    'Crear un enlace que vuelva a abrir esta misma simulación: para repartirlo como tarea, o para devolver lo que se ha construido (K)',
  'rail.exportData.hint':
    'Descargar la simulación registrada en CSV: posiciones, velocidades y energías a lo largo del tiempo, y la curva de luz si está activa. Se abren en Excel o en el cuaderno de Python que acompaña al programa (E)',

  // --- Rail: tools -----------------------------------------------------------
  'rail.railTools.hint': 'Mostrar u ocultar las herramientas',
  'rail.unitToggle.hint':
    'Alternar entre unidades físicas y unidades de simulación (U)',
  'rail.referenceFrameSelect.hint':
    'Reexpresar todas las posiciones, y todas las trazas, en el sistema de referencia del baricentro o del objeto seleccionado. A diferencia del modo de seguimiento, esto vuelve a dibujar las trayectorias, de modo que el sistema solar visto desde la Tierra muestra a Marte describiendo un bucle hacia atrás.',
  'rail.toggleRuler.hint':
    'Tender una regla sobre la escena. Arrastrar cualquiera de sus extremos hasta aquello cuya distancia se quiera medir; la lectura se da en AU y en kilómetros, y está anclada al mundo, de modo que desplazar y ampliar la vista mueven la regla junto con lo que mide en lugar de cambiar lo que indica.',
  'rail.toggleProtractor.hint':
    'Medir un ángulo. Arrastrar el asa central hasta el vértice y las dos exteriores en las direcciones entre las que se quiere el ángulo: una velocidad y la línea hacia la estrella, por ejemplo, que en una órbita excéntrica solo forman noventa grados en el periastro y en el apoastro.',
  'rail.toggleStopwatch.hint':
    'Medir tiempos en tiempo de simulación, de modo que al pausar se detiene el cronómetro y la velocidad de simulación no altera lo medido. Con un cuerpo seleccionado se puede enganchar a sus pasos por el periastro y leer su período directamente.',
  'rail.stopwatchMark.hint': 'Empezar a contar desde ahora',
  'rail.stopwatchStop.hint': 'Congelar la lectura actual',
  'rail.stopwatchLatch.hint':
    'Engancharse a los pasos por el periastro del cuerpo seleccionado, de modo que cada vuelta sea una órbita medida desde la máxima aproximación',
  'rail.stopwatchReset.hint': 'Volver a cero',
  'rail.record.hint':
    'Grabar un clip de la simulación en marcha: un MP4 si el navegador puede codificarlo, un WebM si no. El nombre del escenario, la barra de escala y el reloj simulado se graban en cada fotograma, de modo que el clip se documenta a sí mismo en una diapositiva. La grabación se detiene sola a los 3 minutos o a los 80 MB, lo que llegue antes.',
  'rail.record.stop.hint': 'Detener la grabación y guardar el clip',
  'rail.screenshot.hint':
    'Capturar la pantalla (o pulsar P). La barra de escala, el tiempo de simulación transcurrido y las herramientas de medida que estén desplegadas se dibujan sobre el propio lienzo, de modo que la imagen documenta su escala y su reloj.',
  'rail.toggle3DView.hint':
    'Abrir una vista tridimensional del pozo gravitatorio: una malla elástica que se hunde alrededor de cada masa. Arrastrar para orbitar, rueda para ampliar.',
  'rail.toggleLightCurve.hint':
    'Abrir el panel de fotometría de tránsitos: una gráfica en directo de brillo frente a tiempo de la luz estelar que llega a un observador. Arrastrar el asa del observador sobre la simulación, o usar el control de ángulo, cambia la dirección de observación: los planetas que cruzan por delante de la estrella excavan caídas en la curva, tal como se detectan los exoplanetas reales.',
  'rail.toggleRadialVelocity.hint':
    'Abrir el panel de velocidad radial: el movimiento de la estrella hacia nosotros y en sentido contrario, medido como lo mide un espectrógrafo. Un planeta arrastra a su estrella alrededor del centro de masas común, y el tamaño de ese bamboleo es lo que revela la masa del planeta.',
  'rail.toggleRotationCurve.hint':
    'Abrir el panel de curva de rotación: velocidad orbital frente a distancia al centro, un punto por cuerpo, dibujada junto a las velocidades que produciría la masa visible por sí sola. Al activar el halo de materia oscura se ve cómo una curva descendente se aplana.',
  'rail.toggleAstrometry.hint':
    'Abrir el panel de astrometría: la diminuta elipse que la estrella traza en el cielo mientras su planeta la hace girar alrededor del centro de masas común. Donde la velocidad radial falla, en una órbita vista de frente, la astrometría funciona mejor.',
  'rail.slowDown.hint': 'Reducir la velocidad en 0,5×',
  'rail.speedUp.hint': 'Aumentar la velocidad en 0,5×',
  'rail.resetView.hint': 'Recentrar la cámara y volver a la ampliación 1× (R).',
  'rail.shortcuts.hint': 'Atajos de teclado (?)',

  // --- Rail: learn -----------------------------------------------------------
  'rail.railLearn.hint': 'Mostrar u ocultar la sección de aprendizaje',
  'rail.aboutGravitas.hint':
    'Qué es Gravitas, qué se puede hacer aquí y por dónde empezar',
  'rail.railLearnBody.hint':
    'Cómo modela Gravitas el universo: qué calcula la simulación, qué aproxima y qué solo dibuja',
  'rail.railLearnBody.hint.2':
    'Guías docentes, soluciones y un mapa curricular para el profesorado',
  'rail.railLearnBody.hint.3': 'Abrir el manual de usuario de Gravitas (PDF)',
  'rail.objectType.hint':
    'Elige qué añadir y luego haz clic en el lienzo para colocarlo',
  'rail.mainControls.label': 'Controles de la simulación',
  'rail.railToolsBody.label': 'Herramientas de medida',
  'rail.slowDown.label': 'Reducir la velocidad',
  'rail.speedUp.label': 'Aumentar la velocidad',
  'rail.objectType.label': 'Elegir un objeto para añadir',

  // --- Rail: labels ----------------------------------------------------------
  // The emoji stay: they are part of the button's shape rather than of its
  // wording, and a reader scanning the rail finds them before the text.
  'rail.railScenario': 'Escenario',
  'rail.loadScenario': 'Cargar escenario',
  'rail.investigations': '🎓 Investigaciones',
  'rail.settings': 'Ajustes',
  'rail.refreshScenario': 'Recargar escenario',
  'rail.resetAll': 'Restablecer valores',
  'rail.cleanSim': 'Simulación vacía',
  'rail.railState': 'Estado',
  'rail.save': 'Guardar estado',
  'rail.load': 'Cargar estado',
  'rail.undo': 'Deshacer colocación',
  'rail.share': '🔗 Compartir enlace',
  'rail.exportData': '📊 Exportar datos',
  'rail.railTools': 'Herramientas',
  'rail.unitToggle': 'Unidades físicas',
  'rail.railToolsBody': 'Sistema',
  'rail.referenceFrameSelect': 'Mundo',
  'rail.referenceFrameSelect.2': 'Baricentro',
  'rail.referenceFrameSelect.3': 'Objeto seleccionado',
  'rail.toggleRuler': '📏 Regla',
  'rail.toggleProtractor': '📐 Transportador',
  'rail.toggleStopwatch': '⏱ Cronómetro',
  'rail.stopwatchMark': '⚑ Marcar',
  'rail.stopwatchStop': '■ Parar',
  'rail.stopwatchLatch': '⌖ Periastro',
  'rail.stopwatchReset': '↺ Reiniciar',
  'rail.screenshot': '📸 Captura',
  'rail.record': '🎬 Grabar clip',
  'rail.record.stop': '⏹ Parar grab.',
  'capture.caption.sandbox': 'Zona de pruebas de Gravitas',
  'capture.record.saved': 'Clip guardado: {s}, {mb} MB',
  'capture.record.cappedSize':
    'Clip guardado al alcanzar el límite de 80 MB: {mb} MB. Graba tramos más cortos para una secuencia más larga.',
  'capture.record.cappedTime':
    'Clip guardado al alcanzar el límite de 3 minutos: {mb} MB.',
  'capture.record.failed': 'La grabación no produjo vídeo. No se guardó nada.',
  'capture.record.unsupported':
    'Este navegador no puede grabar el lienzo. Safari y los navegadores antiguos carecen del grabador WebM; Chrome, Edge y Firefox lo tienen.',
  'rail.toggle3DView': 'Vista espaciotemporal',
  'rail.toggleLightCurve': 'Curva de luz',
  'rail.toggleRadialVelocity': 'Velocidad radial',
  'rail.toggleRotationCurve': 'Curva de rotación',
  // --- Instrumento de divergencia ---------------------------------------------
  // --- Los instrumentos de resonancia (js/resonanceWidgets.js) ---------------
  'resW.periods.title': 'Periodos medidos y las razones entre ellos',
  'resW.periods.note':
    'Los periodos se miden de las propias órbitas y se promedian sobre toda la ejecución; no se leen de una tabla. La razón de enteros pequeños más cercana se halla por fracciones continuas, que encuentran una para cualquier número: por eso importa más la última cifra de cada fila —cuánto más cerca está la razón de lo que daría el azar— que la razón misma.',
  'resW.periods.axis': 'periodo orbital, logarítmico',
  'resW.periods.scaled': 'modelo a escala: distancias ×100, reloj ×1000',
  'resW.periods.true': 'escala real',
  'resW.angle.title': 'El ángulo resonante',
  'resW.angle.note':
    'Arriba: el ángulo plegado en una vuelta. Si recorre todos los valores, los cuerpos adoptan sucesivamente todas las geometrías relativas y no hay resonancia. Abajo: el mismo ángulo desplegado, donde una circulación es una rampa y una libración es una onda. El veredicto sale del gráfico inferior, y puede legítimamente ser «aún no se puede saber».',
  'resW.conj.title': 'Dónde se alinean los dos cuerpos',
  'resW.conj.note':
    'Cada conjunción de la ejecución, trazada dos veces: dónde ocurrió en el cielo y dónde estaba el cuerpo exterior en su propia órbita en ese momento. Una resonancia aparece como un cúmulo en el segundo disco; y si ese cúmulo está en 180°, toda alineación ocurre en el afelio del cuerpo exterior.',
  'resW.conj.sky': 'longitud en el cielo',
  'resW.conj.orbit': 'posición en la órbita exterior',
  'resW.frame.title': 'El marco rotante',
  'resW.frame.note':
    'El mismo sistema visto desde un marco que gira con el secundario, fijo a la derecha y a una unidad de distancia. L4 y L5 son los dos puntos triangulares de equilibrio. En este marco un cuerpo coorbital dibuja un lazo cerrado alrededor de uno de ellos; uno que no lo sea da la vuelta entera.',
  'resW.plot.wrapped': 'ángulo, plegado en 0–360°',
  'resW.plot.unwrapped': 'el mismo ángulo, desplegado',
  'resW.empty.no-world': 'no hay ningún sistema cargado',
  'resW.empty.warming-up': 'observando: deja correr la simulación',
  'resW.empty.no-argument':
    'este sistema no tiene un par para el argumento solicitado',
  'resW.empty.no-pair': 'los cuerpos indicados no están ambos aquí',
  'resW.empty.no-secondary':
    'no hay cuerpo secundario sobre el que construir un marco rotante',
  'resW.empty.no-conjunctions': 'aún no ha ocurrido ninguna alineación',
  'resW.row.status': 'Estado',
  'resW.row.argument': 'Argumento',
  'resW.row.ratio': 'P({a}) / P({b})',
  'resW.row.watched': 'Observado durante',
  'resW.row.verdict': 'Veredicto',
  'resW.row.centre': 'Centro de libración',
  'resW.row.amplitude': 'Amplitud',
  'resW.row.libration': 'Periodo de libración',
  'resW.row.circulation': 'Periodo de circulación',
  'resW.row.needed': 'Qué falta',
  'resW.row.sampling': 'Muestreo',
  'resW.row.pair': 'Par',
  'resW.row.count': 'Conjunciones vistas',
  'resW.row.skySpread': 'Dispersión en el cielo',
  'resW.row.orbitSpread': 'Dispersión en la órbita exterior',
  'resW.row.where': 'Lo que significa',
  'resW.row.frame': 'El marco gira con',
  'resW.value.periodDays': '{days} días',
  'resW.value.periodYears': '{years} años',
  'resW.value.ratio':
    '{ratio} — la más cercana es {p}:{q}, desviada un {off}% ({chance}× más cerca que el azar)',
  'resW.value.watched': '{cycles} ciclos de conjunción ({days} días)',
  'resW.value.amplitudeBound': 'al menos ±{amp}°: todavía no ha dado la vuelta',
  'resW.value.librationPeriod':
    '{days} días = {cycles} ciclos de conjunción ({certainty})',
  'resW.value.measured': 'medido',
  'resW.value.provisional': 'de una sola oscilación, provisional',
  'resW.value.librationUnresolved':
    'más largo que esta ejecución: cualquier circulación tardaría más de {cycles} ciclos de conjunción',
  'resW.value.circulationPeriod': '{days} días = {cycles} ciclos de conjunción',
  'resW.value.needed':
    'el ángulo se ha movido {drift}° hasta ahora; eso es una libración de al menos esa anchura o una circulación de {cycles} ciclos de conjunción, y nada aquí las distingue',
  'resW.value.sampling': '{n} muestras, una cada {every} días',
  'resW.value.spread': 'centrado en {mean}°, dispersión ±{spread}°',
  'resW.value.tadpole': '{kind} en torno a {centre}°, amplitud ±{amp}°',
  'resW.verdict.none': 'aún no se ha medido nada',
  'resW.verdict.circulation':
    'CIRCULACIÓN: el ángulo recorre todos los valores, así que no hay resonancia',
  'resW.verdict.libration':
    'LIBRACIÓN: el ángulo se da la vuelta en lugar de completar el giro; los cuerpos están enganchados',
  'resW.verdict.stationary':
    'EQUILIBRIO: el ángulo no se ha movido en absoluto; este cuerpo está en un punto de Lagrange',
  'resW.verdict.librationProvisional':
    'LIBRACIÓN: el ángulo se dio la vuelta y regresó a donde empezó; una inversión más confirmará el periodo',
  'resW.inconclusive.one-reversal':
    'NO CONCLUYENTE: se ha dado la vuelta una vez, cosa que también hace un ángulo que circula despacio con una oscilación encima',
  'resW.inconclusive.drifting-centre':
    'NO CONCLUYENTE: oscila, pero cada oscilación termina más allá que la anterior, así que el centro se desplaza',
  'resW.inconclusive.confined':
    'NO CONCLUYENTE: confinado hasta ahora, pero aún no se ha dado la vuelta, y una circulación suficientemente lenta se vería igual',
  'resW.inconclusive.ambiguous-drift':
    'NO CONCLUYENTE: esta ejecución no distingue una libración amplia de una circulación lenta',
  'resW.inconclusive.too-few-samples':
    'NO CONCLUYENTE: aún no hay muestras suficientes',
  'resW.inconclusive.too-short':
    'NO CONCLUYENTE: la ejecución es más corta que veinte ciclos de conjunción',
  'resW.inconclusive.undersampled':
    'NO CONCLUYENTE: el ángulo se mueve demasiado deprisa entre muestras para seguirlo',
  'resW.inconclusive.no-window': 'NO CONCLUYENTE: no ha transcurrido tiempo',
  'resW.where.aphelion':
    'toda alineación ocurre cerca del afelio del cuerpo exterior, en su punto más lejano',
  'resW.where.perihelion':
    'toda alineación ocurre cerca del perihelio del cuerpo exterior, en su punto más cercano',
  'resW.where.side': 'las alineaciones se agrupan, pero lejos de ambos ápsides',
  'resW.where.scattered':
    'las alineaciones están repartidas por toda la órbita',
  'resW.kind.tadpole': 'renacuajo',
  'resW.kind.horseshoe': 'herradura',
  'chaosW.title': 'Cuán separadas están las dos ejecuciones',
  'chaosW.note':
    'La distancia entre la ejecución A y la B, sumada sobre todos los cuerpos y emparejada por identidad, en cada instante de tiempo simulado. Los mismos datos en dos ejes: lineal arriba, logarítmico abajo. Una recta en la gráfica inferior es crecimiento exponencial.',
  'chaosW.plot.linear': 'separación, escala lineal',
  'chaosW.plot.log': 'separación, escala logarítmica',
  'chaosW.plot.empty': 'no hay suficientes muestras solapadas',
  'chaosW.axis.separation': 'separación',
  'chaosW.axis.logSeparation': 'log₁₀ separación',
  'chaosW.axis.time': 'tiempo simulado →',
  'chaosW.empty.no-runs':
    'Graba la ejecución A y la B en el Banco A/B y vuelve aquí.',
  'chaosW.empty.no-overlap':
    'Las dos ejecuciones no se solapan en tiempo simulado. Grábalas con duraciones parecidas.',
  'chaosW.row.status': 'Estado',
  'chaosW.row.perturbation': 'Perturbación',
  'chaosW.row.start': 'Separación al principio',
  'chaosW.row.end': 'Separación al final',
  'chaosW.row.growth': 'Creció',
  'chaosW.row.behaviour': 'Comportamiento',
  'chaosW.row.window': 'Ajustado en',
  'chaosW.row.noEstimate': 'Sin tiempo de crecimiento porque',
  'chaosW.row.straightLine': 'Una recta ajusta con',
  'chaosW.row.refinement': 'Bajo refinamiento',
  'chaosW.value.perturbation': '{body}, {axis}, {km}',
  'chaosW.value.window': 't = {from} a {to} s  ({efolds} factores e)',
  'chaosW.value.resolved':
    'resuelto: los tiempos de crecimiento coinciden dentro del {spread}%',
  'chaosW.verdict.none': 'todavía no se ha medido nada',
  'chaosW.verdict.identical':
    'las dos ejecuciones son idénticas: la simulación es determinista',
  'chaosW.verdict.bounded':
    'acotada: las dos ejecuciones se mantienen próximas',
  'chaosW.verdict.linear':
    'crece en proporción al tiempo: eso es deriva, no caos',
  'chaosW.verdict.saturated':
    'saturada: las ejecuciones están tan separadas como permite este sistema',
  'chaosW.verdict.exponential':
    'exponencial, tiempo de crecimiento {tau} s  (r² = {r2})',
  'chaosW.reject.too-few-points':
    'hay muy pocas muestras utilizables para ajustar nada',
  'chaosW.reject.too-little-range':
    'la separación no creció los suficientes factores e. Por debajo de tres, una recta puede imitar una exponencial.',
  'chaosW.reject.too-short':
    'el intervalo ajustado es más corto que dos tiempos de crecimiento',
  'chaosW.reject.poor-fit':
    'una exponencial no ajusta lo bastante bien como para citar una escala temporal',
  'chaosW.reject.not-growing': 'la separación no está creciendo',
  'chaosW.reject.no-window':
    'ningún intervalo de la ejecución sirve para un ajuste',
  'chaosW.reject.insufficient': 'no hay datos suficientes',
  'chaosW.unresolved.need-two-estimates':
    'vuelve a grabar la comparación con un paso temporal menor u otro integrador',
  'chaosW.unresolved.behaviour-changed':
    'NO RESUELTO: el comportamiento mismo cambió con la numérica',
  'chaosW.unresolved.timescale-moved':
    'NO RESUELTO: el tiempo de crecimiento se movió con el paso temporal, así que es una propiedad del integrador',
  // --- Banco de experimentos A/B ---------------------------------------------
  'rail.toggleExperiments': 'Banco A/B',
  'rail.toggleExperiments.hint':
    'Abrir el banco de experimentos A/B: captura un estado inicial, graba una ejecución de referencia, vuelve exactamente a ese inicio, cambia una variable y graba una segunda ejecución, y compara ambas sobre el mismo eje de tiempo simulado.',
  'bench.title': 'Experimento A/B',
  'bench.untitled': 'Experimento sin título',
  'bench.copyOf': 'Copia de {name}',
  'bench.status.idle': 'Sin experimento',
  'bench.status.recording': 'Grabando: {n} muestras, {seconds} s',
  'bench.status.runs': '{n} de 2 ejecuciones grabadas',
  'bench.field.name': 'Nombre',
  'bench.field.namePlaceholder': '¿Qué estás probando?',
  'bench.field.primary': 'Medir distancia desde',
  'bench.field.chart': 'Gráfica',
  'bench.primary.none': 'Nada seleccionado',
  'bench.section.selection': 'Qué medir',
  'bench.section.saved': 'Experimentos guardados',
  'bench.hint.selection':
    'Elige los cuerpos de los que trata el experimento y después las magnitudes que se van a registrar. Una magnitud que necesita dos cuerpos permanece atenuada hasta que se eligen dos.',
  'bench.hint.noBodies': 'Captura primero un estado inicial.',
  'bench.action.capture': 'Capturar inicio',
  'bench.action.restore': 'Volver al inicio',
  'bench.action.record': 'Grabar',
  'bench.action.recording': 'Grabando',
  'bench.action.stop': 'Parar',
  'bench.action.save': 'Guardar',
  'bench.action.save.hint': 'Conservar este experimento en este navegador',
  'bench.action.close.hint': 'Ocultar el banco de experimentos',
  'bench.action.csv': 'Exportar CSV',
  'bench.action.json': 'Exportar JSON',
  'bench.action.share': 'Compartir montaje',
  'bench.action.duplicate': 'Duplicar',
  'bench.action.import': 'Abrir un archivo',
  'bench.action.delete': 'Eliminar este experimento',
  'bench.action.confirmMultivariable': 'Sí, los cambié a propósito',
  'bench.section.perturb': 'Perturbar el inicio',
  'bench.hint.perturb':
    'Cambia una coordenada de un cuerpo en el inicio capturado en una cantidad muy pequeña. La ejecución B se restaura entonces a ese estado perturbado, de modo que las dos ejecuciones difieren exactamente en eso y en nada más.',
  'bench.field.amount': 'Cantidad (km, o km/s)',
  'bench.axis.x': 'posición x',
  'bench.axis.y': 'posición y',
  'bench.axis.vx': 'velocidad x',
  'bench.axis.vy': 'velocidad y',
  'bench.action.perturb': 'Aplicar',
  'bench.action.asControl': 'Registrar como control numérico',
  'bench.perturb.applied':
    'Perturbado: {body}, {axis}, {km} km — una parte en {fraction} del sistema',
  'bench.perturb.done': 'El inicio capturado está perturbado',
  'bench.perturb.needAmount': 'Escribe una perturbación distinta de cero.',
  'bench.perturb.noExperiment': 'Captura primero un inicio.',
  'bench.perturb.no-bodies':
    'Este inicio capturado no tiene cuerpos que perturbar. Captura con el estado completo.',
  'bench.perturb.no-such-body': 'Ese cuerpo no está en el inicio capturado.',
  'bench.perturb.bad-axis': 'Eso no es una coordenada.',
  'bench.perturb.bad-delta': 'Escribe una perturbación distinta de cero.',
  'bench.control.row': '{label}: {behaviour}, crecimiento {tau} s',
  'bench.control.recorded': 'Registrado como control: {label}',
  'bench.control.failed':
    'Graba primero ambas ejecuciones, con las posiciones entre las medidas.',
  'bench.run.a': 'Ejecución A',
  'bench.run.b': 'Ejecución B',
  'bench.run.empty': 'sin grabar',
  'bench.run.recorded': '{n} muestras en {seconds} s',
  'bench.start.captured': 'Inicio: {scenario}, semilla {seed}, estado {hash}',
  'bench.diff.heading': 'Qué cambió entre las ejecuciones',
  'bench.diff.none': 'Nada. Ambas ejecuciones usaron los mismos ajustes.',
  'bench.diff.incidental':
    'También difieren, pero no son variables experimentales: {list}',
  'bench.table.metric': 'Magnitud',
  'bench.table.delta': 'B - A',
  'bench.table.fraction': 'Fracción',
  'bench.chart.time': 'Tiempo simulado (s)',
  'bench.chart.label':
    'Ejecución A frente a ejecución B sobre un eje común de tiempo simulado',
  'bench.metric.position': 'Posición',
  'bench.metric.separation': 'Separación',
  'bench.metric.speed': 'Rapidez',
  'bench.metric.velocity_x': 'Velocidad, x',
  'bench.metric.velocity_y': 'Velocidad, y',
  'bench.metric.distance_to_primary': 'Distancia al primario',
  'bench.metric.orbital_period': 'Periodo orbital',
  'bench.metric.closest_approach': 'Máxima aproximación',
  'bench.metric.total_energy': 'Energía total',
  'bench.metric.angular_momentum': 'Momento angular',
  'bench.metric.energy_drift': 'Deriva de energía',
  'bench.metric.angular_drift': 'Deriva de momento angular',
  'bench.metric.needs': 'Selecciona {n} cuerpos para medir esto',
  'bench.warn.noChange':
    'Ambas ejecuciones usaron ajustes idénticos, así que cualquier diferencia entre ellas es numérica, no física.',
  'bench.warn.multivariable':
    'Cambiaron {n} cosas entre las ejecuciones, no una: {list}. Una comparación con más de una variable independiente no puede decir cuál causó la diferencia.',
  'bench.warn.identical': 'Las dos ejecuciones partieron del mismo estado.',
  'bench.warn.noOverlap':
    'Las dos ejecuciones no se solapan en tiempo simulado, así que {metric} no se puede comparar.',
  'bench.warn.uneven':
    'La ejecución {run} se muestreó de forma irregular: su intervalo mayor es {ratio} veces el menor. Los valores intermedios se interpolan.',
  'bench.flash.captured': 'Inicio capturado',
  'bench.flash.restored': 'De vuelta al inicio capturado',
  'bench.flash.restoredDrift':
    'Restaurado, pero el hash del estado difiere: consulta el manifiesto',
  'bench.flash.stopped': 'Ejecución grabada',
  'bench.saved': 'Experimento guardado',
  'bench.saved.none': 'Todavía no hay nada guardado.',
  'bench.imported': 'Se abrió {name}',
  'bench.quota':
    '{used} KB de {total} KB usados, {count} de {max} experimentos',
  'bench.error.tooLarge':
    'Ese experimento ocupa {size} KB y el límite es {limit} KB. Expórtalo a un archivo.',
  'bench.error.storeFull':
    'Los experimentos guardados superarían {limit} KB. Elimina uno o exporta este a un archivo.',
  'bench.error.tooMany':
    'Ya tienes {limit} experimentos guardados. Elimina uno para hacer sitio.',
  'bench.error.quota':
    'Este navegador se negó a almacenar el experimento. Expórtalo a un archivo.',
  'bench.error.unavailable':
    'Este navegador no tiene almacenamiento local disponible, así que los experimentos no se pueden conservar entre visitas. Exporta a un archivo.',
  'bench.error.open': 'No se pudo abrir ese experimento ({reason}).',
  'bench.error.import': 'No se pudo leer ese archivo ({reason}).',
  'bench.error.load': 'No se pudo cargar el banco de experimentos.',
  'rail.toggleAstrometry': 'Astrometría',
  'rail.slowDown': '⏪ Lento',
  'rail.speedUp': 'Rápido ⏩',
  'rail.resetView': 'Restablecer vista',
  'rail.shortcuts': 'Atajos',
  'rail.railLearn': 'Aprender',
  'rail.aboutGravitas': 'Acerca de Gravitas',
  'rail.railLearnBody': 'Cómo funciona el modelo',
  'rail.railLearnBody.2': 'Recursos para el profesorado',
  'rail.railLearnBody.3': 'Manual de usuario (PDF)',
  'rail.objectType': '⭐ Añadir objeto',
  'rail.objectType.choose': 'Añadir objeto',
  'rail.objectType.placing': 'Haz clic para colocar · Esc',
  'rail.objectType.stop': 'Dejar de añadir',

  // --- Readout ---------------------------------------------------------------
  'readout.overlayMinimize.hint': 'Minimizar',
  'readout.sonificationToggle.hint': 'Activar la sonificación generativa',
  'readout.closeScenarioInfo.hint': 'Descartar esta descripción del escenario',
  'readout.closeMobileInstructions.hint':
    'Descartar estas instrucciones táctiles',
  'readout.mobileInstructions': 'Controles táctiles',
  'readout.mobileInstructions.2': 'Arrastrar:',
  'readout.mobileInstructions.3': 'Pellizcar:',
  'readout.mobileInstructions.4': 'Tocar un objeto:',
  'readout.mobileInstructions.5': 'Mantener pulsado y arrastrar:',
  'readout.mobileInstructions.6': 'Tocar dos veces:',
  'readout.closeMobileInstructions': 'Entendido',

  // --- Guided tour -----------------------------------------------------------
  'tour.tutorialClose.hint': 'Cerrar la visita (Esc)',
  'tour.tutorialPrev.hint': 'Volver al paso anterior (flecha izquierda)',
  'tour.tutorialNext.hint': 'Pasar al siguiente paso (flecha derecha)',
  'tour.tutorialPopup.label': 'Visita guiada',
  'tour.tutorialClose.label': 'Cerrar la visita',
  'tour.tutorialPopup': 'Visita guiada',
  'tour.tutorialPrev': 'Atrás',
  'tour.tutorialNext': 'Siguiente',

  // --- Transport bar ---------------------------------------------------------
  'transport.timelinePlay.hint': 'Pausar (espacio)',
  'transport.timelineStepBack.hint': 'Retroceder un fotograma (,)',
  'transport.timelineStepFwd.hint': 'Avanzar un fotograma (.)',
  'transport.timelineScrubber.hint':
    'Arrastrar para retroceder por el historial grabado. La simulación se detiene en el fotograma elegido hasta volver al directo.',
  'transport.timelineLive.hint': 'Volver al directo (L)',
  'transport.timelineBar.label': 'Reproducción y línea de tiempo',
  'transport.timelinePlay.label': 'Pausar la simulación',
  'transport.timelineStepBack.label': 'Retroceder un fotograma',
  'transport.timelineStepFwd.label': 'Avanzar un fotograma',
  'transport.timelineScrubber.label':
    'Recorrer el historial grabado de la simulación',
  'transport.timelineLive': '● DIRECTO',

  // --- Front door ------------------------------------------------------------
  'welcome.welcomeClose.hint': 'Cerrar y entrar en el laboratorio',
  'welcome.welcomeClose.label': 'Cerrar y entrar en el laboratorio',

  // --- Settings: dialog chrome -----------------------------------------------
  'settings.settingsCloseChip.hint':
    'Cerrar los ajustes sin aplicar los cambios',
  'settings.settingsApply.hint':
    'Aplicar estos ajustes. Cambiar el número de objetos, la disposición o el escenario reconstruye la simulación; todo lo demás surte efecto de inmediato.',
  'settings.settingsReset.hint':
    'Devolver todos los ajustes de este panel a su valor por defecto (no se aplica hasta pulsar Aplicar).',
  'settings.settingsCancel.hint': 'Descartar estos cambios y cerrar el panel.',
  'settings.demoMode.hint':
    'Iniciar el modo demostración: recorre los escenarios automáticamente',
  'settings.bhMassesCloseChip.hint': 'Cerrar sin cambiar las masas',
  'settings.bhMassesDone.hint': 'Confirmar estas masas y cerrar',
  'settings.settingsCloseChip.label': 'Cerrar',
  'settings.bhMassesCloseChip.label': 'Cerrar',
  'settings.settingsPanel': 'Ajustes de la simulación',
  'settings.settingsApply': 'Aplicar y reiniciar',
  'settings.settingsReset': 'Valores por defecto',
  'settings.settingsCancel': 'Cancelar',
  'settings.demoMode': '🎬 Modo demostración',
  'settings.bhMassesDone': 'Hecho',
  'settings.toggle.on': 'Sí',
  'settings.toggle.off': 'No',
  'settings.info.about': 'Información sobre {label}',
  'settings.option.presetScenario.none': 'Ninguno',

  // --- Settings: sections ----------------------------------------------------
  'settings.section.simulation': 'Simulación',
  'settings.section.performance': 'Rendimiento',
  'settings.section.visuals': 'Aspecto visual',
  'settings.section.black-holes': 'Agujeros negros',
  'settings.section.compact-objects': 'Objetos compactos',
  'settings.section.objects': 'Objetos',
  'settings.section.ui-control': 'Interfaz y control',
  'settings.section.educational': 'Didáctico',

  // --- Settings: labels ------------------------------------------------------
  'settings.label.presetScenario': 'Escenario predefinido',
  'settings.label.gravitationalConstant': 'Constante gravitatoria',
  'settings.label.mutualGravity': 'Gravedad mutua (todos)',
  'settings.label.simSpeed': 'Velocidad de simulación',
  'settings.label.simSize': 'Tamaño de la simulación',
  'settings.label.placement': 'Disposición',
  'settings.label.integrator': 'Integrador',
  'settings.label.showConservationDiagnostics': 'Lectura de conservación',
  'settings.label.useBarnesHut': 'Gravedad aproximada (Barnes-Hut)',
  'settings.label.barnesHutTheta': 'Precisión de Barnes-Hut (theta)',
  'settings.label.adaptiveDetail': 'Detalle adaptativo',
  'settings.label.trailColourMode': 'Color de las trazas',
  'settings.label.showObjectLensing': 'Lente gravitatoria',
  'settings.label.lensingQuality': 'Calidad de la lente',
  'settings.label.diskDoppler': 'Efecto Doppler en el disco de acreción',
  'settings.label.numBlackHoles': 'Número de agujeros negros',
  // --- Gravedad galactica: el halo, MOND, y cuidado con ambos ----------------
  // --- dm-mond: la misma curva, dos explicaciones ----------------------------
  'dmW.mondTitle': 'La misma curva, dos explicaciones',
  'dmW.mondNote':
    'El ajuste con halo y MOND, evaluados con las mismas medidas. Cambia entre ellos y ajusta el disco hasta que cada uno coincida. Fijate en lo que hubo que decirle a cada uno.',
  'dmW.mondModel': 'Explicacion',
  'dmW.mondHaloOption': 'Halo de materia oscura',
  'dmW.mondMondOption': 'MOND',
  'dmW.mondPresetHalo': 'Mejor ajuste con halo',
  'dmW.mondPresetMond': 'Mejor ajuste MOND',
  'dmW.mondPresetHaloNote':
    'La descomposicion que genero esta curva: un disco de 3,3e10 y un halo cuya velocidad plana y radio de nucleo se ajustaron hasta coincidir. Tres numeros ajustados y una coincidencia exacta.',
  'dmW.mondPresetMondNote':
    'MOND con el disco que prefiere: 2,1e10, unas dos terceras partes de las estrellas del ajuste con halo, y ningun halo. Un numero ajustado y una coincidencia dentro de las barras de error.',
  'dmW.mondShowing': 'Mostrando',
  'dmW.mondHaloRow': 'Ajuste con halo',
  'dmW.mondMondRow': 'Ajuste MOND',
  'dmW.mondThreeFitted': '3 numeros ajustados',
  'dmW.mondOneFitted': '1 numero ajustado',
  'dmW.mondPredictedRow': 'Velocidad plana de MOND para este disco',
  'dmW.mondVerdict': 'Que muestra esto',
  'dmW.mondInsideErrors': 'dentro de las barras de error',
  'dmW.mondClose': 'cerca',
  'dmW.mondOff': 'lejos',
  'dmW.mondBothFit':
    'Esta explicacion reproduce las medidas. La otra tambien lo hace, con su propia masa de disco y con un numero distinto de parametros ajustados. La curva por si sola no decide entre ellas.',
  'dmW.mondKeepAdjusting':
    'Todavia no coincide. Ajusta el disco hasta que esta explicacion reproduzca los puntos, y luego prueba la otra.',
  'dmW.mondSynthetic': 'curva sintetica, parametros de NGC 3198',
  // --- La visita guiada ------------------------------------------------------
  'tutorial.stepCount': 'Paso {n} de {total}',
  'tutorial.next': 'Siguiente',
  'tutorial.finish': 'Terminar',

  'tutorial.welcome.title': 'Bienvenido a Gravitas',
  'tutorial.welcome.body':
    'Un laboratorio de gravedad y un conjunto de instrumentos para medirla. Cada cuerpo en pantalla se integra en tiempo real a partir de la ley de gravitación de Newton: aquí nada va sobre raíles ni está animado de antemano. Si dos estrellas se fusionan es porque sus órbitas las juntaron de verdad.',
  'tutorial.welcome.tip':
    'Esta visita tiene dieciséis pasos y dura unos tres minutos. Usa ← y → para avanzar, o Escape para salir en cualquier momento.',

  'tutorial.choose.title': 'Elige qué añadir',
  'tutorial.choose.body':
    'Este botón abre la lista de los ocho tipos de objeto que puedes colocar: estrella, planeta rocoso, gigante gaseoso, asteroide, cometa, enana blanca, estrella de neutrones y agujero negro. Cada uno tiene su rango de masas y su comportamiento. Elegir uno <strong>arma</strong> el lienzo: el botón se ilumina y el cursor pasa a ser una cruz.',
  'tutorial.choose.tip':
    'No se coloca nada hasta que lo armas, y eso es lo que evita que un clic mal calculado en el cielo vacío añada una estrella que no querías. Pulsa Escape, o el botón de nuevo, para desarmarlo.',

  'tutorial.place.title': 'Colócalo arrastrando',
  'tutorial.place.body':
    'Con un tipo elegido, pulsa en espacio vacío y arrastra antes de soltar. La dirección y la longitud del arrastre fijan la velocidad de lanzamiento: un arrastre corto deja el objeto casi en reposo y uno largo lo lanza lejos. Una línea discontinua previsualiza la trayectoria.',
  'tutorial.place.tip':
    'Mantén Mayúsculas mientras arrastras para ajustar a una órbita circular alrededor de la masa dominante más cercana. En pantalla táctil, mantén pulsado primero: un arrastre simple desplaza la vista.',

  'tutorial.inspect.title': 'Inspecciona cualquier cosa',
  'tutorial.inspect.body':
    'Haz clic en cualquier objeto para abrir su inspector: masa, radio, temperatura, elementos orbitales y composición, todo calculado a partir de su estado real y no consultado en una tabla. El deslizador de masa está vivo: lleva una estrella por encima de unas 20 masas solares y colapsará en un agujero negro delante de ti.',
  'tutorial.inspect.tip':
    'La pestaña de Energía representa la energía cinética, potencial y total frente al tiempo. Un total plano indica una órbita estable; uno que deriva indica que la órbita decae, que el cuerpo escapa o que el paso de tiempo es demasiado grueso.',

  'tutorial.transport.title': 'Pausa, avanza y acelera',
  'tutorial.transport.body':
    'La barra inferior controla el tiempo. Pausa para estudiar una configuración, avanza fotograma a fotograma durante un encuentro cercano, o corre rápido para ver evolucionar un sistema a lo largo de miles de órbitas.',
  'tutorial.transport.tip':
    'La barra espaciadora pausa y reanuda. Las teclas coma y punto avanzan un solo fotograma en pausa, que es la única manera de ver qué ocurre realmente durante una colisión.',

  'tutorial.rewind.title': 'Rebobina lo que acaba de pasar',
  'tutorial.rewind.body':
    'La misma barra graba el historial mientras la simulación corre. Arrastra el cursor hacia atrás para volver a ver una fusión o una asistencia gravitatoria que te perdiste, y luego vuelve al presente y continúa donde estabas.',
  'tutorial.rewind.tip':
    'Pulsa L para volver al presente. Rebobinar no deshace nada: es una reproducción de lo ocurrido, no una rama alternativa.',

  'tutorial.scenario.title': 'Empieza desde un sistema real',
  'tutorial.scenario.body':
    'Cincuenta y tres escenarios, desde el Sistema Solar y TRAPPIST-1 hasta GW150914, la primera fusión de agujeros negros detectada por LIGO. Varios son modelos a escala y lo indican en su ficha. Busca por nombre o filtra por concepto.',
  'tutorial.scenario.tip':
    'Reiniciar escenario lo reconstruye desde cero si un experimento se te va de las manos. Cada escenario se construye a partir de una semilla, así que la misma semilla da el mismo mundo.',

  'tutorial.investigations.title': 'Investigaciones guiadas',
  'tutorial.investigations.body':
    'Doce lecciones estructuradas que usan la simulación como evidencia y no como ilustración. Mides algo, predices qué se sigue y se te dice si la predicción se cumplió. Cubren las leyes de Kepler, las mareas, los agujeros negros, los tránsitos de exoplanetas, el caos, la resonancia orbital y el caso de la materia oscura.',
  'tutorial.investigations.tip':
    'Cada una termina con un informe que puedes exportar en PDF, con tus propias medidas y respuestas. El progreso se guarda si cierras la lección y vuelves.',

  'tutorial.measure.title': 'Mídelo tú mismo',
  'tutorial.measure.body':
    'Una regla, un transportador y un cronómetro que se engancha a un cuerpo y mide su órbita. Se dibujan sobre el propio lienzo, así que una captura lleva consigo su escala y su reloj.',
  'tutorial.measure.tip':
    'La barra de escala y el tiempo simulado transcurrido se graban en cada captura y en cada clip, que es lo que hace que una imagen tomada aquí sirva como figura.',

  'tutorial.instruments.title': 'Los instrumentos',
  'tutorial.instruments.body':
    'Cinco paneles de análisis que observan la simulación en marcha: una curva de luz de tránsito, una traza de velocidad radial, un diagrama de bamboleo astrométrico, una curva de rotación y una vista tridimensional. Miden los cuerpos que realmente están ahí: ninguno es una animación enlatada.',
  'tutorial.instruments.tip':
    'La curva de luz, la velocidad radial y la astrometría juntas son como se ha encontrado todo exoplaneta del que hayas oído hablar. Abre los tres sobre el mismo sistema y compara qué ve cada uno.',

  'tutorial.rotation.title': 'Curvas de rotación y dos explicaciones',
  'tutorial.rotation.body':
    'El panel de curva de rotación representa en vivo la velocidad orbital frente al radio para cada cuerpo, frente a lo que predice la masa visible por sí sola. En los escenarios de galaxia puedes elegir qué ley gobierna las afueras: solo materia visible, materia visible más un halo de materia oscura, o MOND. Son mutuamente excluyentes, y el panel indica qué parámetros se ajustaron y cuáles son fijos.',
  'tutorial.rotation.tip':
    'Tanto el halo como MOND pueden hacerse coincidir con la misma curva. Ese es el sentido de la comparación, y la lección dice con claridad que ajustar una curva de rotación no establece cuál explicación es correcta.',

  'tutorial.bench.title': 'Compara dos ejecuciones como es debido',
  'tutorial.bench.body':
    'El banco de experimentos captura un estado inicial, lo ejecuta, vuelve exactamente a ese estado, te deja cambiar una sola cosa y lo ejecuta otra vez. Después compara ambas y te avisa si se movió más de una variable entre ellas.',
  'tutorial.bench.tip':
    'Esta es la diferencia entre un experimento y una demostración. Ambas ejecuciones se pueden exportar, y una comparación se puede compartir como enlace que reproduce el montaje.',

  'tutorial.units.title': 'Unidades y temas',
  'tutorial.units.body':
    'Cambia entre unidades físicas —unidades astronómicas, masas solares, kilómetros por segundo, años— y las unidades de simulación con las que trabaja el integrador. Hay cuatro temas, entre ellos Observatorio, que usa tonos rojos para conservar la visión nocturna, y Luz de día para salas iluminadas.',
  'tutorial.units.tip':
    'Algunos escenarios son modelos a escala y no la cosa real, y cuando eso importa el panel indica a través de qué escala física está leyendo.',

  'tutorial.settings.title': 'Todo lo demás',
  'tutorial.settings.body':
    'Sesenta y tres ajustes: la constante gravitatoria, el integrador, el número de objetos, los patrones de colocación, los estilos de estela, los efectos visuales y las opciones de rendimiento. Los cambios estructurales reconstruyen la simulación; el resto se aplican al momento.',
  'tutorial.settings.tip':
    'El buscador en la parte superior del panel filtra por nombre, así no tienes que recordar en cuál de las nueve secciones vive un ajuste.',

  'tutorial.share.title': 'Llévatelo contigo',
  'tutorial.share.body':
    'Comparte un enlace que reproduce exactamente lo que hay en tu pantalla: el escenario, los ajustes, la cámara y la semilla. O haz una captura, graba un clip, o exporta en CSV los números que hay detrás de cualquier instrumento.',
  'tutorial.share.tip':
    'Un enlace compartido puede abrirse en modo incrustado para una diapositiva o una página de curso, y el modo conferencia reduce la interfaz para proyectarla.',

  'tutorial.done.title': 'Ya está',
  'tutorial.done.body':
    'Pulsa <kbd>?</kbd> en cualquier momento para ver la lista completa de atajos de teclado, o vuelve a abrir esta visita desde el botón <strong>?</strong> de la esquina. Nada de lo que hagas aquí puede romper nada: Reiniciar deja el escenario como venía.',
  'tutorial.done.tip':
    'Un buen primer experimento: carga el Sistema Solar, abre la curva de rotación y comprueba que cae exactamente como dice Kepler. Después carga Rotación de la Vía Láctea y comprueba que no.',
  'rotation.mode.label': 'Gravedad en las afueras',
  'rotation.mode.newtonian': 'Solo visible',
  'rotation.mode.newtonian.hint':
    'Gravedad newtoniana solo de la materia visible. Es la prediccion que la curva plana contradice.',
  'rotation.mode.halo': 'Halo',
  'rotation.mode.halo.hint':
    'Gravedad newtoniana mas un halo de materia oscura. Dos parametros, ajustados a esta galaxia.',
  'rotation.mode.mond': 'MOND',
  'rotation.mode.mond.hint':
    'La ley de Milgrom aplicada a la materia visible. Aqui no se ajusta ningun parametro a esta galaxia.',
  'rotation.mond.hint':
    'La ley de Milgrom aplicada a la materia visible. Aqui no se ajusta ningun parametro a esta galaxia.',
  'rotation.mond.unavailable':
    'MOND se aplica a galaxias. Este escenario no declara una escala galactica, asi que no se ofrece aqui.',
  'rotation.mond.limits': 'Lo que MOND no explica',
  'rotation.mond.predicted': 'MOND predice (a partir de la masa visible)',
  'rotation.mond.predicted.hint':
    'En unidades de simulacion, con el valor fisico que implica la escala galactica declarada de este escenario al lado.',
  'rotation.param.fitted': 'Ajustado',
  'rotation.param.fixed': 'Fijo',
  'rotation.param.haloTwo':
    'dos parametros por galaxia: la velocidad plana y el radio del nucleo, ambos ajustados hasta que la curva coincide.',
  'rotation.param.mondNone':
    'aqui no se ajusta ningun parametro. a₀ es una constante de la ley propuesta, la misma para todas las galaxias.',
  'rotation.param.newtonNone':
    'no se ajusta nada. La curva es la que implica la masa visible.',
  'caveat.mond':
    'MOND esta en la ley de fuerzas, asi que la gravedad no es newtoniana y la contabilidad habitual de conservacion no se aplica.',
  // --- Lo que MOND no consigue. Citado por la pagina del modelo y la leccion.
  'mond.limitation.clusters':
    'Cumulos de galaxias. MOND reduce la masa faltante en los cumulos pero no la elimina: queda un factor residual de unas dos veces, asi que los cumulos siguen necesitando materia no vista de algun tipo.',
  'mond.limitation.bullet':
    'El Cumulo Bala. Tras una colision la masa deducida por lentes esta desplazada del gas visible, que es el aspecto de una componente oscura sin colisiones y es dificil para una teoria en la que la gravedad sigue a la materia visible.',
  'mond.limitation.cmb':
    'El fondo cosmico de microondas. Las alturas relativas de los picos acusticos se ajustan bien con materia oscura fria y MOND no las reproduce sin anadir de todos modos una componente oscura.',
  'mond.limitation.relativistic':
    'No es una teoria relativista. Existen completaciones relativistas (TeVeS y sus sucesoras) pero son mas complicadas que la relatividad general y varias han quedado descartadas por la velocidad de las ondas gravitacionales.',
  'mond.limitation.interpolation':
    'La funcion de interpolacion se elige, no se deduce. La teoria fija solo los dos limites; la forma de la transicion entre ellos se pone a mano.',
  'mond.limitation.external':
    'El efecto de campo externo. En MOND un sistema se ve afectado por el campo gravitatorio en el que esta inmerso incluso cuando ese campo es uniforme, lo que rompe el principio de equivalencia fuerte y dificulta enunciar predicciones aisladas.',
  'settings.filter.label': 'Buscar ajustes',
  'settings.filter.placeholder': 'Buscar ajustes',
  'settings.filter.hint':
    'Muestra solo los ajustes cuyo nombre coincide con lo que escribes.',
  'settings.filter.empty': 'Ningún ajuste coincide.',
  'settings.label.bhMass': 'Masa por defecto (M☉)',
  'settings.label.useIndividualBhMasses': 'Masas individuales',
  'settings.label.bhBehavior': 'Comportamiento',
  'settings.label.orbitDecayRate': 'Tasa de decaimiento orbital',
  'settings.label.numNeutronStars': 'Número de estrellas de neutrones',
  'settings.label.numWhiteDwarfs': 'Número de enanas blancas',
  'settings.label.numStars': 'Número de estrellas',
  'settings.label.numPlanets': 'Número de planetas',
  'settings.label.numGasGiants': 'Número de gigantes gaseosos',
  'settings.label.enableAsteroids': 'Activar asteroides',
  'settings.label.numAsteroids': 'Número de asteroides',
  'settings.label.numComets': 'Número de cometas',
  'settings.label.initVelocity': 'Velocidad inicial',
  'settings.label.velocityStddev': 'Desviación de la velocidad',
  'settings.label.inputObjectType': 'Tipo de objeto que se inserta',
  'settings.label.showTrails': 'Mostrar trazas',
  'settings.label.trailStyle': 'Estilo de traza',
  'settings.label.trailLength': 'Longitud de la traza',
  'settings.label.showVelocityVectors': 'Mostrar vectores de velocidad',
  'settings.label.showAccelerationVectors': 'Mostrar vectores de aceleración',
  'settings.label.showPotentialWell': 'Mostrar el pozo de potencial',
  'settings.label.showScaleBar': 'Mostrar la barra de escala',
  'settings.label.showElapsedTime': 'Mostrar el tiempo transcurrido',
  'settings.label.showBhGlow': 'Mostrar el halo del agujero negro',
  'settings.label.showAccretionDisk': 'Mostrar el disco de acreción',
  'settings.label.realisticDiskPhysics': 'Física realista del disco',
  'settings.label.showBhJets': 'Mostrar los chorros relativistas',
  'settings.label.starDensity': 'Densidad del campo de estrellas',
  'settings.label.showAmbientLighting': 'Iluminación ambiental',
  'settings.label.dynamicObjectProperties': 'Colores dinámicos de los objetos',
  'settings.label.planetBaseColor': 'Color base de los planetas',
  'settings.label.starBaseColor': 'Color base de las estrellas',
  'settings.label.interactiveAdd': 'Añadir objetos con el ratón',
  'settings.label.followMode': 'Modo de seguimiento',
  'settings.label.showDynamicOverlays': 'Mostrar las capas de datos',
  'settings.label.recordSimulation': 'Grabar la simulación',
  'settings.label.showGravitationalWaves': 'Mostrar ondas gravitatorias',
  'settings.label.habitableZoneOptimism': 'Modelo de zona habitable',

  // --- Settings: option values -----------------------------------------------
  // Only the label is translated; the value stored in the settings, and
  // therefore in every share link, stays the English token.
  'settings.option.simSize.small': 'Pequeña',
  'settings.option.simSize.medium': 'Mediana',
  'settings.option.simSize.large': 'Grande',
  'settings.option.simSize.huge': 'Enorme',
  'settings.option.placement.circular': 'Circular',
  'settings.option.placement.multi-ring': 'Anillos múltiples',
  'settings.option.placement.random': 'Aleatoria',
  'settings.option.placement.grid': 'Cuadrícula',
  'settings.option.placement.empty': 'Vacía',
  'settings.option.trailColourMode.type': 'Por tipo',
  'settings.option.trailColourMode.speed': 'Por velocidad',
  'settings.option.lensingQuality.off': 'desactivada',
  'settings.option.lensingQuality.low': 'baja',
  'settings.option.lensingQuality.medium': 'media',
  'settings.option.lensingQuality.high': 'alta',
  'settings.option.bhBehavior.static': 'Estático',
  'settings.option.bhBehavior.orbiting': 'En órbita',
  'settings.option.inputObjectType.planet': 'Planeta',
  'settings.option.inputObjectType.star': 'Estrella',
  'settings.option.inputObjectType.asteroid': 'Asteroide',
  'settings.option.inputObjectType.comet': 'Cometa',
  'settings.option.inputObjectType.gasgiant': 'Gigante gaseoso',
  'settings.option.inputObjectType.neutronstar': 'Estrella de neutrones',
  'settings.option.inputObjectType.whitedwarf': 'Enana blanca',
  'settings.option.trailStyle.cloud': 'Nube',
  'settings.option.trailStyle.simple': 'Simple',
  'settings.option.trailStyle.glow': 'Resplandor',
  'settings.option.followMode.none': 'Ninguno',
  'settings.option.followMode.blackhole': 'Agujero negro',
  'settings.option.followMode.planet': 'Planeta',
  'settings.option.followMode.gasgiant': 'Gigante gaseoso',
  'settings.option.followMode.star': 'Estrella',
  'settings.option.followMode.asteroid': 'Asteroide',
  'settings.option.followMode.comet': 'Cometa',
  'settings.option.followMode.neutronstar': 'Estrella de neutrones',
  'settings.option.followMode.whitedwarf': 'Enana blanca',

  // --- Object inspector ------------------------------------------------------
  'inspector.inspectorPin.hint': 'Fijar una copia para comparar',
  'inspector.inspectorDelete.hint': 'Eliminar este objeto',
  'inspector.inspectorClose.hint': 'Cerrar (Esc)',
  'inspector.inspectorPin.label':
    'Fijar una copia de este objeto para comparar',
  'inspector.inspectorDelete.label': 'Eliminar este objeto',
  'inspector.inspectorClose.label': 'Cerrar el inspector',
  'inspector.objectInspector.label': 'Vistas del inspector',
  'inspector.pinnedInspectors.label': 'Objetos fijados',
  'inspector.inspectorTitle': 'Objeto',
  'inspector.inspectorTabDetails': 'Detalles',
  'inspector.inspectorTabEnergy': 'Energía',

  // Row headings. The units beside them are symbols and stay as they are: AU,
  // M☉ and km/s are read the same way in every language, and translating them
  // would put the readout at odds with every textbook a student owns.
  'inspector.stat.averageDensity': 'Densidad media',
  'inspector.stat.chandrasekharLimit': 'Límite de Chandrasekhar',
  'inspector.stat.density': 'Densidad',
  'inspector.stat.escapeVelocity': 'Velocidad de escape',
  'inspector.stat.escapeVelocityAtRs': 'Velocidad de escape en Rs',
  'inspector.stat.hawkingLifetime': 'Vida de Hawking',
  'inspector.stat.hawkingTemperature': 'Temperatura de Hawking',
  'inspector.stat.iscoPeriod': 'Período en la ISCO',
  'inspector.stat.lifespan': 'Vida estimada',
  'inspector.stat.luminosity': 'Luminosidad',
  'inspector.stat.mass': 'Masa',
  'inspector.stat.orbitalPeriod': 'Período orbital',
  'inspector.stat.position': 'Posición',
  'inspector.stat.pulsar': 'Púlsar',
  'inspector.stat.radius': 'Radio',
  'inspector.stat.schwarzschildRadius': 'Radio de Schwarzschild',
  'inspector.stat.spectralType': 'Tipo espectral',
  'inspector.stat.speed': 'Rapidez',
  'inspector.stat.surfaceGravity': 'Gravedad superficial',
  'inspector.stat.surfaceTemperature': 'Temperatura superficial',
  'inspector.stat.tailLength': 'Longitud de la cola',
  'inspector.stat.type': 'Tipo',
  'inspector.stat.velocity': 'Velocidad',

  // --- Scenario card and sonification ----------------------------------------
  'scenarioCard.notice.mergingDisabled':
    'La fusión de objetos está desactivada',
  'scenarioCard.notice.mergingDisabledLong':
    'La fusión de objetos está desactivada en este escenario',
  'readout.sonification.unavailable': 'Audio no disponible',
  'readout.sonification.off': '\ud83d\udd07 Sonido desactivado',
  'readout.sonification.on': '\ud83d\udd0a Sonido activado',
  'settings.tooltip.generic': 'Este ajuste controla {label}.',

  'readout.toggle.show': 'Mostrar el panel',
  'readout.toggle.hide': 'Ocultar',
  'readout.toggle.show.hint':
    'Mostrar el panel de la simulación: recuento de objetos, ampliación, velocidad y controles',
  'readout.toggle.hide.hint': 'Plegar el panel de la simulación',
  'readout.toggle.show.label': 'Mostrar el panel de la simulación',
  'settings.option.integrator.symplectic-euler': 'Euler simpléctico',
  'settings.option.integrator.velocity-verlet': 'Verlet de velocidades',
  'settings.option.integrator.rk4': 'RK4',

  // --- Canvas instrumentation ------------------------------------------------
  'instrument.stopwatch': 'cronómetro',
  'instrument.stopwatch.latched': 'cronómetro \u00b7 periastro de {body}',
  'instrument.stopwatch.body': 'el cuerpo',
  'instrument.stopwatch.waiting': 'esperando al periastro',
  'instrument.stopwatch.idle': 'pulsar Marcar para empezar',
  'instrument.stopwatch.state.running': 'en marcha',
  'instrument.stopwatch.state.paused': 'en pausa',
  'instrument.stopwatch.state.stopped': 'detenido',
  'instrument.stopwatch.state.idle': 'inactivo',
  'instrument.stopwatch.mean': {
    one: 'media de {n} vuelta',
    other: 'media de {n} vueltas',
  },
  'vector.velocity': 'velocidad',
  'vector.acceleration': 'aceleración',
  'vector.acceleration.total': 'aceleración total',
  'vector.source': 'de {body}',

  // --- Readout counts and status ---------------------------------------------
  'readout.count.planets': 'Planetas',
  'readout.count.gasGiants': 'Gigantes gaseosos',
  'readout.count.asteroids': 'Asteroides',
  'readout.count.stars': 'Estrellas',
  'readout.count.neutronStars': 'Estrellas de neutrones',
  'readout.count.whiteDwarfs': 'Enanas blancas',
  'readout.count.blackHoles': 'Agujeros negros',
  'readout.count.particles': 'Partículas',
  'readout.count.debris': 'Restos',
  'readout.count.galaxies': 'Galaxias',
  'readout.zoom': 'Ampliación',
  'readout.speed': 'Velocidad',
  'readout.status.paused': 'En pausa',
  'readout.status.running': 'En marcha',

  // --- Why a configuration cannot conserve anything --------------------------
  'caveat.staticBlackHole': 'un agujero negro estático atrae sin ser atraído',
  'caveat.oneWayGravity':
    'la gravedad es unidireccional: solo algunos cuerpos son fuentes',
  'caveat.halo': 'el halo es un campo de fondo fijo',
  'caveat.orbitDecay': 'las órbitas de los agujeros negros están amortiguadas',
  'caveat.merging': 'las fusiones y colisiones están activadas',
  'caveat.tidalDisruption':
    'la disrupción de marea cerca de un agujero negro quita masa a los cuerpos',

  // --- Canvas overlay labels -------------------------------------------------
  'overlay.stableOrbit': 'Órbita estable',
  'overlay.equalAreas': 'Segunda ley de Kepler: áreas iguales',

  // --- Scenario gallery ------------------------------------------------------
  'gallery.closeScenarioList.hint': 'Cerrar la galería de escenarios',
  'gallery.scenarioListCloseChip.hint': 'Cerrar la galería de escenarios',
  'gallery.scenarioSearch.hint':
    'Filtrar por nombre, descripción o concepto. Probar con «neutrones», «fusión», «mareas» o «kepler». Intro carga el primer resultado.',
  'gallery.scenarioListCloseChip.label': 'Cerrar',
  'gallery.scenarioSearch.label': 'Buscar escenarios',
  'gallery.scenarioSearch.placeholder':
    'Buscar escenarios, objetos o conceptos…',
  'gallery.scenarioBrowserTitle': 'Explorar escenarios',
  'gallery.scenarioConceptsLabel': 'Explorar por concepto',
  'gallery.scenarioSearchEmpty': 'Todos',
  'gallery.subtitle':
    '{n} sistemas por explorar. Buscar por nombre o concepto, o recorrer los temas del currículo que aparecen debajo.',
  'gallery.chip.all': 'Todos',
  'gallery.results.all': { one: '{n} escenario', other: '{n} escenarios' },
  'gallery.results.concept': {
    one: '{n} escenario en {concept}',
    other: '{n} escenarios en {concept}',
  },
  'gallery.results.search': {
    one: '{n} escenario que coincide con «{query}»',
    other: '{n} escenarios que coinciden con «{query}»',
  },
  'gallery.results.searchInConcept': {
    one: '{n} escenario en {concept} que coincide con «{query}»',
    other: '{n} escenarios en {concept} que coinciden con «{query}»',
  },

  // --- Sharing ---------------------------------------------------------------
  'share.shareClose.hint': 'Cerrar sin copiar',
  'share.shareCloseChip.hint': 'Cerrar sin copiar',
  'share.shareKindSeeded.hint':
    'El escenario, su semilla y los ajustes que se hayan cambiado. Lo bastante corto para pegarlo en cualquier sitio, y reconstruye siempre el mismo sistema inicial.',
  'share.shareKindFull.hint':
    'La posición, la velocidad y la masa de cada objeto, escritas una a una. Conviene cuando la simulación ya ha corrido, o después de colocar objetos a mano.',
  'share.shareCopy.hint': 'Copiar el enlace al portapapeles',
  'share.shareSeed.hint':
    'El número a partir del cual se generó este sistema. Escribir uno y pulsar Intro lo reconstruye: dando la misma semilla a toda la clase, todo el mundo ve el mismo sistema.',
  'share.shareReroll.hint': 'Reconstruir este escenario con una semilla nueva',
  'share.shareCloseChip.label': 'Cerrar',
  'share.shareContent.label': 'Qué lleva el enlace',
  'share.shareTitle': 'Compartir esta simulación',
  'share.shareContent':
    'Quien abra este enlace llegará exactamente a este sistema: sin cuenta, sin configuración y sin nada guardado en un servidor.',
  'share.shareKindSeeded': 'Configuración inicial',
  'share.shareKindSeeded.2':
    'Enlace corto. Reconstruye este sistema a partir de su semilla.',
  'share.shareKindFull': 'Estado exacto actual',
  'share.shareKindFull.2':
    'Enlace más largo. Lleva cada objeto donde se encuentra.',
  'share.shareContent.2': 'Abrir con la misma ampliación y posición',
  'share.shareContent.3': 'Enlace para compartir',
  'share.shareCopy': 'Copiar',
  'share.shareStale': 'Estado exacto actual',
  'share.shareWarning':
    'Este enlace es lo bastante largo como para que algunos clientes de correo y plataformas docentes lo partan en varias líneas. Conviene compartir la configuración inicial cuando sea posible, o adjuntar el enlace como archivo.',
  'share.shareSeedRow': 'Semilla',
  'share.shareReroll': 'Nueva',
  'share.shareContent.4':
    'La semilla decide cada detalle aleatorio de este escenario. Repartiendo la misma semilla, todo el mundo obtiene el mismo sistema para medir.',
  'share.link.copied': 'Enlace copiado',
  'share.link.copyFailed': 'Pulsar Ctrl/Cmd + C para copiar el enlace',
  'share.link.failed': 'No se pudo abrir ese enlace.',
  'share.link.opened': {
    one: 'Se abrió una simulación compartida: {scenario}, {n} objeto.',
    other: 'Se abrió una simulación compartida: {scenario}, {n} objetos.',
  },

  // --- Data export -----------------------------------------------------------
  'export.dataExportClose.hint': 'Cerrar',
  'export.dataExportTitle': 'Exportar datos',
  'export.dataExportContent':
    'Todo lo que la simulación ha registrado, en CSV. Se abre en una hoja de cálculo o se lee directamente con pandas.',
  'export.dataExportScope': 'Qué objetos',
  'export.dataExportSelectedLabel': 'Solo el objeto seleccionado',
  'export.dataExportScope.2': 'Todos los objetos',
  'export.dataExportContent.2':
    'Las columnas llevan sus unidades en el nombre: distancias en AU, tiempos en días, velocidades en km/s y energías en julios. Las posiciones se registran diez veces por segundo de tiempo real, y el historial guarda los últimos cientos de fotogramas.',
  'export.dataExportNotebook': 'Abrir en Colab el cuaderno que lo acompaña',
  'export.empty': 'Todavía no hay nada registrado que exportar.',
  'export.failed': 'No se pudo generar ese archivo.',
  'export.done': {
    one: 'Se exportó {n} fila.',
    other: 'Se exportaron {n} filas.',
  },
  'export.truncated':
    'Se exportaron las primeras {n} filas: la grabación no cabía en un solo archivo.',

  // --- Themes ----------------------------------------------------------------
  'theme.midnight.label': 'Medianoche',
  'theme.midnight.hint': 'Por defecto. Casi negro, mucho contraste.',
  'theme.deep.label': 'Espacio profundo',
  'theme.deep.hint': 'Azul más suave, superficies elevadas.',
  'theme.observatory.label': 'Observatorio',
  'theme.observatory.hint': 'Tonos rojos: conserva la visión nocturna.',
  'theme.daylight.label': 'Luz de día',
  'theme.daylight.hint': 'Interfaz clara para salas iluminadas.',

  // --- Transient messages ----------------------------------------------------
  'toast.undo.removed': 'Se quitó el último objeto colocado',
  'toast.undo.nothing': 'No hay nada que deshacer',
  'toast.timeline.live': 'De vuelta al directo',
  'toast.view.reset': 'Vista restablecida',
  'toast.units.showing': 'Mostrando {units}',
  'toast.theme.changed': 'Tema: {theme}',
  'toast.speed.changed': 'Velocidad {speed}×',
  'toast.placement.armed':
    'Arrastrar para apuntar · soltar para colocar {object}',

  // --- Scenario concept tags -------------------------------------------------
  'tag.orbits-kepler.label': 'Órbitas y Kepler',
  'tag.orbits-kepler.description':
    'Movimiento orbital, las tres leyes de Kepler, la energía orbital y las formas que adoptan las trayectorias.',
  'tag.solar-system.label': 'Sistema solar',
  'tag.solar-system.description':
    'Nuestros propios planetas, lunas, asteroides y cometas, a sus distancias relativas reales.',
  'tag.exoplanets.label': 'Exoplanetas',
  'tag.exoplanets.description':
    'Planetas alrededor de otras estrellas: arquitecturas, sistemas compactos y cómo se comparan con el nuestro.',
  'tag.detection.label': 'Métodos de detección',
  'tag.detection.description':
    'Cómo se encuentran realmente los planetas: fotometría de tránsitos, curvas de luz y lo que puede confundirlas.',
  'tag.habitability.label': 'Habitabilidad',
  'tag.habitability.description':
    'La zona habitable circunestelar, la luz estelar recibida y lo que estar dentro de una zona establece y no establece.',
  'tag.binary-systems.label': 'Sistemas binarios',
  'tag.binary-systems.description':
    'Dos o más cuerpos orbitando un centro de masas común, y la dinámica que se sigue de ello.',
  'tag.tides.label': 'Mareas y disrupción',
  'tag.tides.description':
    'Gravedad diferencial: cuerpos estirados, despojados o desgarrados por un paso cercano.',
  'tag.chaos.label': 'Caos y encuentros',
  'tag.chaos.description':
    'Pasos cercanos, asistencias gravitatorias, expulsiones y sistemas cuyo desenlace depende con extrema sensibilidad de dónde partieron.',
  'tag.resonance.label': 'Resonancia orbital',
  'tag.resonance.description':
    'Cuerpos cuyos periodos se enganchan en una razón de números enteros pequeños, y el ángulo librante que demuestra que el enganche es real.',
  'tag.stellar-evolution.label': 'Evolución estelar',
  'tag.stellar-evolution.description':
    'Lo que dejan atrás las estrellas: enanas blancas, estrellas de neutrones, remanentes y los entornos que los producen.',
  'tag.compact-objects.label': 'Objetos compactos',
  'tag.compact-objects.description':
    'Agujeros negros, estrellas de neutrones y enanas blancas, y cómo se comporta la gravedad cerca de ellos.',
  'tag.relativity.label': 'Relatividad y ondas gravitatorias',
  'tag.relativity.description':
    'Binarias compactas en espiral y sucesos de fusión, en el sentido curricular: el motor de cálculo subyacente sigue siendo newtoniano.',
  'tag.galaxies-clusters.label': 'Galaxias y cúmulos',
  'tag.galaxies-clusters.description':
    'Sistemas de muchos cuerpos a las mayores escalas que Gravitas modela: dinámica de cúmulos, centros galácticos y encuentros entre ellos.',
  'tag.dark-matter.label': 'Materia oscura',
  'tag.dark-matter.description':
    'Las dos medidas que la encontraron: curvas de rotación que se mantienen planas cuando deberían caer, y cúmulos cuyos miembros se mueven demasiado deprisa para la masa que brilla.',

  // --- Scenario catalogue ----------------------------------------------------
  // Proper names of missions, instruments and catalogued objects are left as
  // they are: TRAPPIST-1, HD 209458 b and GW150914 are the names a student will
  // meet in every paper and every press release in any language.
  'scenario.Solar System.title': 'Sistema solar',
  'scenario.Solar System.summary':
    'Una simulación de nuestro sistema solar con los planetas reales y sus masas, distancias orbitales, diámetros y colores correctos. Incluye Mercurio, Venus, la Tierra, Marte, Júpiter, Saturno, Urano y Neptuno con sus propiedades reales, además de asteroides auténticos (Ceres, Vesta, Palas) y cometas célebres (Halley, Hale-Bopp, Hyakutake) con sus períodos orbitales y características verdaderas.',
  'scenario.Retrograde Mars.title':
    'Marte retrógrado: el bucle que exigió epiciclos',
  'scenario.Retrograde Mars.summary':
    'El Sol, la Tierra y Marte a sus distancias y períodos reales, y nada más. Vistos desde fuera, ambos planetas giran alrededor del Sol en el mismo sentido y nunca retroceden. Al cambiar el sistema de referencia a la Tierra, en Herramientas, Marte deja de describir un círculo y dibuja un bucle que se repliega sobre sí mismo. La física no cambia; solo el sistema de referencia. Ese bucle es la observación que Ptolomeo reprodujo con epiciclos, y aquí se enciende y se apaga con un control.',
  'scenario.Earth-Moon System.title': 'Sistema Tierra-Luna',
  'scenario.Earth-Moon System.summary':
    'Una simulación detallada del sistema Tierra-Luna con masas precisas, mecánica orbital y aspecto realista. Presenta la Tierra con sus océanos azules y sus continentes verdes, y la Luna con su característica superficie gris y sus cráteres. Ideal para estudiar la dinámica orbital y los efectos de marea.',
  'scenario.TRAPPIST-1 System.title': 'Sistema TRAPPIST-1',
  'scenario.TRAPPIST-1 System.summary':
    'Un sistema planetario compacto con siete mundos del tamaño de la Tierra alrededor de una enana roja fría situada a solo 40 años luz. Todos los planetas se apiñan cerca de su diminuto sol, y varios caen en la zona habitable. ¿Se puede mantener estable un sistema tan delicado?',
  'scenario.Three-Body Sensitivity Lab.title':
    'Laboratorio de sensibilidad de tres cuerpos: el mismo inicio, dos veces',
  'scenario.Three-Body Sensitivity Lab.summary':
    'Tres estrellas de seis masas solares en los vértices de un triángulo equilátero, girando rígidamente en torno a su centro común. Es una solución exacta del problema de los tres cuerpos, hallada por Lagrange en 1772, y con masas iguales es inestable: el triángulo aguanta unas vueltas y se deshace. Está hecho para un solo experimento: ejecútalo dos veces desde inicios que difieren en mil quinientos kilómetros, y observa cuánto duran juntas.',
  'scenario.Galilean Resonance.title':
    'Resonancia galileana: el bloqueo de Laplace',
  'scenario.Galilean Resonance.summary':
    'Ío, Europa y Ganímedes en la cadena 4:2:1 que Laplace explicó en 1805, con Calisto fuera como contraste. Los periodos no son exactamente 4:2:1 — Europa tarda un 0,37 % más que dos años de Ío — y ese casi acierto es la cuestión: lo que los une es el argumento de Laplace, que se queda cerca de 180 grados en vez de recorrer todos los valores, así que las tres nunca coinciden en conjunción. Calisto queda a un 0,03 % de 7:3 con Ganímedes y no resuena con nada. Modelo a escala, 100 veces mayor.',
  'scenario.Broken Laplace Resonance.title':
    'Resonancia de Laplace rota: un uno por ciento fuera',
  'scenario.Broken Laplace Resonance.summary':
    'Las mismas cuatro lunas con un solo número cambiado: Europa parte un uno por ciento más lejos de Júpiter. Eso es cien veces más de lo que la resonancia puede sostener, y el bloqueo falla: el argumento de Laplace deja de oscilar en torno a 180 grados y empieza a dar vueltas completas, una cada cuarenta y seis órbitas de Ío. Ejecútalo junto a Resonancia galileana y la diferencia entre un sistema bloqueado y otro que solo tiene periodos convenientes aparece en pantalla en menos de un minuto.',
  'scenario.Pluto and Neptune.title':
    'Plutón y Neptuno: la resonancia 3:2 que protege',
  'scenario.Pluto and Neptune.summary':
    'La órbita de Plutón cruza la de Neptuno, y jamás se han acercado. La resonancia 3:2 es la razón: Plutón da dos vueltas por cada tres años neptunianos, y el argumento resonante libra en torno a 180 grados en vez de circular, así que toda conjunción ocurre cerca del afelio de Plutón, muy lejos del alcance de Neptuno. Un tercer cuerpo recorre casi la misma órbita desde fuera de la resonancia; observa qué le ocurre. Escala real; un segundo son unos 270 años.',
  'scenario.Jupiter Trojans.title':
    'Troyanos de Júpiter: la resonancia coorbital 1:1',
  'scenario.Jupiter Trojans.summary':
    'Dos de los cinco puntos de Lagrange son lugares donde un cuerpo puede quedarse quieto respecto a Júpiter para siempre, y miles de asteroides lo hacen. Una sonda colocada exactamente en L4 no se mueve en el marco rotante de Júpiter; el troyano 617 Patroclo rodea L5 una vez cada doce años y medio jovianos. Una tercera parte a un grado de L3 —equilibrio también, e inestable— y se marcha. La cuarta recorre una órbita corriente más ancha y no resuena con nada.',
  'scenario.Binary Pair.title':
    'Par binario: dos estrellas, un punto de equilibrio',
  'scenario.Binary Pair.summary':
    'Dos estrellas de dos masas solares cada una, separadas por cuatro AU, que dan una vuelta a su centro de masas común cada cuatro años. Ninguna está quieta y ninguna orbita a la otra: ambas giran alrededor del mismo punto situado entre ellas. Al observar las trazas, el punto de equilibrio se delata solo.',
  'scenario.Interstellar Visitor.title': 'Visitante interestelar: 1I/‘Oumuamua',
  'scenario.Interstellar Visitor.summary':
    'El primer objeto que se vio atravesar el sistema solar procedente de otro lugar, en su órbita medida: perihelio dentro de la de Mercurio, excentricidad 1,20 y 87,7 km/s en la máxima aproximación. La Tierra aparece como referencia de escala. Al seleccionar al visitante, lo que importa es el signo de su energía total: es positiva, y ahí está toda la historia. No está ligado al Sol, nunca iba a quedarse y no volverá.',
  'scenario.Transit Lab.title': 'Laboratorio de tránsitos: HD 209458 b',
  'scenario.Transit Lab.summary':
    'El primer exoplaneta que se sorprendió cruzando por delante de su estrella, hallado en 1999 después de que las velocidades radiales indicaran dónde mirar. Un júpiter caliente en una órbita de 3,5 días, dibujado aquí a escala relativa real: la estrella mide 1,155 radios solares, el planeta 1,38 radios de Júpiter, y la silueta en pantalla mantiene la misma razón de radios del 12 % que indica la curva de luz. Al abrir el panel de curva de luz se ve repetirse la caída del 1,7 %.',
  'scenario.Spiral Galaxy.title': 'Galaxia espiral: lo que esperábamos',
  'scenario.Spiral Galaxy.summary':
    'Un bulbo galáctico con noventa estrellas orbitándolo, cada una lanzada exactamente a la velocidad que le corresponde según la masa visible. Esto es la predicción, no la observación: con la masa concentrada en el centro, la velocidad orbital decae como la inversa de la raíz cuadrada del radio, igual que ocurre en el sistema solar. Al abrir el panel de curva de rotación se puede leer la pendiente. Después conviene cargar Rotación de la Vía Láctea y volver a leerla.',
  'scenario.Milky Way Rotation.title':
    'Rotación de la Vía Láctea: lo que de verdad vemos',
  'scenario.Milky Way Rotation.summary':
    'El mismo disco, con todas las estrellas moviéndose a la misma velocidad por lejos que estén. Eso es lo que miden los telescopios en las galaxias espirales reales, y es demasiado rápido para que las estrellas visibles puedan retenerlas: este escenario arranca con un halo de materia oscura activado, porque sin él el disco no sobrevive. Al abrir el panel de curva de rotación y desactivar el halo se ve cómo se deshace.',
  'scenario.Coma Cluster.title': 'Cúmulo de Coma: Zwicky, 1933',
  'scenario.Coma Cluster.summary':
    'Veinticuatro galaxias enjambrando en un cúmulo ligado, en órbitas orientadas al azar, con los nombres de los miembros del cúmulo de Coma real que midió Fritz Zwicky. Sumó la luz, sumó los movimientos y encontró que la segunda respuesta era cientos de veces mayor que la primera. Llamó a esa diferencia dunkle Materie y se le ignoró durante cuarenta años. Al seleccionar una galaxia se lee su velocidad, y se puede rehacer el mismo cálculo que hizo él.',
  'scenario.Exoplanet Characterization Lab.title':
    'Laboratorio de caracterización de exoplanetas',
  'scenario.Exoplanet Characterization Lab.summary':
    'HD 209458 otra vez, pero con la estrella libre de moverse. En el laboratorio de tránsitos está fijada para centrar la curva de luz; aquí ambos cuerpos orbitan su centro de masas común, que es lo que necesitan los instrumentos de velocidad radial y astrometría para medir algo. La estrella rodea un punto a 2,7 millonésimas de AU, a 84 metros por segundo: demasiado poco para verlo y de sobra para detectarlo. Abre Velocidad radial y observa el bamboleo que descubrió el planeta.',
  'scenario.Blended Binary.title': 'Binaria mezclada: una compañera oculta',
  'scenario.Blended Binary.summary':
    'La misma estrella y el mismo planeta que en el laboratorio de tránsitos, con una segunda estrella medio magnitud más débil situada a 300 AU: demasiado cerca en el cielo para que un telescopio de sondeo las separe, y muy dentro de una misma apertura fotométrica. Su luz rellena parte de la caída, así que el tránsito se mide menos profundo y el planeta parece más pequeño. Corregir este efecto es para lo que sirven los sondeos de imagen de alta resolución.',
  'scenario.Black Hole Lab.title':
    'Laboratorio de agujeros negros: diez masas solares y cuatro cuerpos alrededor',
  'scenario.Black Hole Lab.summary':
    'Un único agujero negro de masa estelar con cuatro cuerpos en órbitas circulares estables a su alrededor. Nada está cayendo dentro. La gravedad lejos de un agujero negro es la de cualquier otro sitio, y un objeto con movimiento transversal lo rodea igual que rodearía a una estrella de la misma masa. Al seleccionar el agujero negro se leen su radio de Schwarzschild, su densidad media a esa escala, su temperatura de Hawking y cuánto le queda de vida.',
  'scenario.Habitable Zone Lab.title':
    'Laboratorio de zona habitable: el sistema solar interior, con la zona dibujada',
  'scenario.Habitable Zone Lab.summary':
    'El Sol con Venus, la Tierra, Marte y Ceres en sus órbitas reales, y la zona habitable circunestelar dibujada alrededor de la estrella según una prescripción publicada. Venus queda dentro del borde interior y Marte fuera del exterior en la definición conservadora, y solo uno de los cuatro tiene hoy agua líquida en su superficie. Cambiando el ajuste Modelo de zona habitable se ve la franja optimista, que llega más allá de Marte.',
  "scenario.Kepler's 2nd Law.title": 'Segunda ley de Kepler: áreas iguales',
  "scenario.Kepler's 2nd Law.summary":
    'Un planeta en órbita casi circular y otro en órbita excéntrica alrededor de una estrella central. La visualización del barrido de áreas se activa automáticamente para el cuerpo excéntrico: conviene observar cómo las cuñas cambian de forma pero conservan la misma área, lo que explica por qué los objetos se mueven más deprisa en el periastro que en el apoastro.',
  'scenario.GW150914.title':
    'GW150914: la primera fusión detectada en ondas gravitatorias',
  'scenario.GW150914.summary':
    'Simula la histórica fusión de dos agujeros negros masivos (36 y 29 M☉) detectada por LIGO en 2015. Se los ve caer en espiral el uno hacia el otro, emitir ondas gravitatorias y fundirse en un único agujero negro más masivo.',

  'scenario.Binary BH.title': 'Agujeros negros binarios',
  'scenario.Binary BH.summary':
    'Dos agujeros negros de masa estelar (15 y 10 M☉) trabados en órbita mutua, con espectaculares chorros relativistas. Se los ve caer en espiral, generar ondas gravitatorias y acabar fundiéndose en un único agujero negro más masivo. Los chorros apuntan en direcciones aleatorias para cada uno, lo que produce un espectáculo cósmico en constante cambio.',
  'scenario.Triple BH System.title': 'Agujero negro triple',
  'scenario.Triple BH System.summary':
    'Una danza caótica de tres cuerpos entre agujeros negros masivos (20, 15 y 10 M☉) en una disposición orbital compleja. Esta configuración inestable acabará expulsando a uno de ellos mientras los otros dos se fusionan. Ilustra la naturaleza caótica de los sistemas gravitatorios de muchos cuerpos.',
  'scenario.Supermassive BH.title': 'Núcleo supermasivo',
  'scenario.Supermassive BH.summary':
    'Un enorme agujero negro (80 M☉) domina un denso enjambre estelar con 50 planetas, 5 gigantes gaseosos y 100 asteroides. El intenso campo gravitatorio produce espectaculares discos de acreción y sucesos de disrupción por marea. Parecido al entorno que rodea a los agujeros negros supermasivos reales en los centros galácticos.',
  'scenario.Star Cluster.title': 'Cúmulo estelar denso',
  'scenario.Star Cluster.summary':
    'Un conjunto ligado gravitatoriamente de estrellas de la secuencia principal, gigantes evolucionadas y remanentes estelares que interaccionan entre sí. Se pueden observar encuentros estelares, formación de binarias y la evolución dinámica de esta comunidad estelar con el tiempo.',
  'scenario.Kuiper Belt.title': 'Cinturón de Kuiper',
  'scenario.Kuiper Belt.summary':
    'Una simulación fiel del cinturón de Kuiper de nuestro sistema solar, con planetas enanos reales (Plutón, Eris, Haumea, Makemake), grandes objetos transneptunianos (Quaoar, Sedna, Orcus, Varuna) y cuerpos menores (Ixión, Huya, 2002 AW197), todos con masas y propiedades orbitales realistas.',
  'scenario.Sagittarius A*.title': 'Sagitario A*',
  'scenario.Sagittarius A*.summary':
    'El agujero negro supermasivo central de la Vía Láctea (4000 M☉, reducido para la simulación) con estrellas S de movimiento rápido, objetos compactos y restos en órbitas extremas. Permite presenciar las increíbles fuerzas gravitatorias y los efectos relativistas cerca del agujero negro supermasivo de nuestra galaxia.',
  'scenario.Binary Star System.title': 'Estrellas binarias',
  'scenario.Binary Star System.summary':
    'Un par de soles en órbita mutua con 5 planetas orbitando el sistema binario. El complejo entorno gravitatorio da lugar a una dinámica orbital interesante y a posibles zonas habitables. Parecido a sistemas binarios reales como Alfa Centauri.',
  'scenario.Slingshot.title': 'Asistencia gravitatoria',
  'scenario.Slingshot.summary':
    'Un agujero negro masivo (60 M☉) acompañado de una compañera menor (3 M☉) produce espectaculares asistencias gravitatorias a los planetas y gigantes gaseosos cercanos. Los objetos ganan una velocidad enorme en los encuentros próximos, igual que las sondas espaciales en sus maniobras de asistencia.',
  'scenario.Rogue Encounter.title': 'Encuentro con un intruso',
  'scenario.Rogue Encounter.summary':
    'Un agujero negro errante (30 M☉) atraviesa un sistema planetario estable con 12 planetas, 4 gigantes gaseosos y asteroides. Se observa la drástica alteración de las órbitas, la expulsión de planetas y las capturas por marea mientras el intruso siembra el caos.',
  'scenario.Neutron Star Collision.title': 'Fusión de estrellas de neutrones',
  'scenario.Neutron Star Collision.summary':
    'Dos estrellas de neutrones (1,4 M☉ cada una) caen en espiral la una hacia la otra en una danza mortal. Este suceso poco frecuente produce ondas gravitatorias, estallidos de rayos gamma y elementos pesados mediante nucleosíntesis por proceso r. Inspirado en el suceso GW170817 detectado por LIGO.',
  'scenario.Pulsar System.title': 'Púlsar con planetas',
  'scenario.Pulsar System.summary':
    'Una estrella de neutrones en rotación rápida con 3 planetas en órbitas cerradas. El intenso campo magnético y la radiación del púlsar crean un entorno hostil. Inspirado en los primeros exoplanetas confirmados, descubiertos alrededor de PSR B1257+12.',
  'scenario.White Dwarf Binary.title': 'Binaria de enanas blancas',
  'scenario.White Dwarf Binary.summary':
    'Dos enanas blancas en un sistema binario cerrado con acreción entre ellas. Una va robando material a su compañera, lo que puede acabar en una supernova de tipo Ia. Incluye disco de restos y remanentes estelares.',
  'scenario.Stellar Graveyard.title': 'Cementerio estelar',
  'scenario.Stellar Graveyard.summary':
    'Un conjunto dinámico de remanentes estelares: 3 agujeros negros, 5 estrellas de neutrones y 8 enanas blancas con planetas supervivientes y extensos campos de restos. Estos cadáveres estelares interaccionan en su última danza gravitatoria.',
  'scenario.Galactic Center.title': 'Centro galáctico',
  'scenario.Galactic Center.summary':
    'Un agujero negro supermasivo (4000 M☉) rodeado de estrellas de alta velocidad, remanentes estelares y densas poblaciones estelares. Permite experimentar un entorno gravitatorio extremo con acreción espectacular, chorros y efectos relativistas.',
  'scenario.Supernova Remnant.title': 'Remanente de supernova',
  'scenario.Supernova Remnant.summary':
    'Las consecuencias explosivas de la muerte de una estrella masiva: una estrella de neutrones rodeada de restos a gran velocidad, planetas golpeados por la onda de choque y gigantes gaseosos desbaratados. Permite experimentar el entorno violento y energético que deja tras de sí la muerte estelar.',
  'scenario.Compact Object Zoo.title': 'Zoo de objetos compactos',
  'scenario.Compact Object Zoo.summary':
    'Una colección variada de objetos compactos: varios agujeros negros, estrellas de neutrones y enanas blancas de distintas masas interaccionando en un entorno denso. Ideal para estudiar los distintos finales estelares y sus interacciones.',
  'scenario.Millisecond Pulsar.title': 'Púlsar de milisegundos',
  'scenario.Millisecond Pulsar.summary':
    'Una estrella de neutrones de rotación extremadamente rápida (púlsar reciclado) con una compañera enana blanca y restos planetarios. Estos púlsares «reciclados» son acelerados por la acreción y figuran entre los relojes más precisos del universo.',
  'scenario.Tidal Disruption Event.title': 'Disrupción por marea',
  'scenario.Tidal Disruption Event.summary':
    'Varios objetos se acercan a un agujero negro supermasivo (2000 M☉) y son desgarrados por fuerzas de marea extremas. Se ve cómo planetas y gigantes gaseosos son estirados, desbaratados y finalmente expulsados o acretados, formando espectaculares corrientes de restos.',

  'scenario.Intermediate Mass BH.title': 'Agujero negro de masa intermedia',
  'scenario.Intermediate Mass BH.summary':
    'Un raro agujero negro de masa intermedia (400 M☉) en el entorno de un cúmulo globular con poblaciones estelares densas. Estos objetos esquivos cubren el hueco entre los agujeros negros de masa estelar y los supermasivos.',
  'scenario.Galactic Collision.title': 'Colisión galáctica',
  'scenario.Galactic Collision.summary':
    'Dos agujeros negros supermasivos (1,2 y 1,0 millones de M☉) con centenares de estrellas que representan núcleos galácticos en colisión. Permite presenciar la formación de corrientes de marea, la disrupción estelar y la fusión final de los dos agujeros negros supermasivos.',
  'scenario.Micro BH Swarm.title': 'Enjambre de microagujeros negros',
  'scenario.Micro BH Swarm.summary':
    'Un enjambre dinámico de pequeños agujeros negros (0,6 a 1,8 M☉) con planetas y gigantes gaseosos en una danza orbital caótica. Estos agujeros negros de masa estelar interaccionan, se fusionan y generan resonancias gravitatorias complejas.',
  'scenario.Exoplanet Lab.title': 'Laboratorio de exoplanetas',
  'scenario.Exoplanet Lab.summary':
    'Una colección variada de más de 120 exoplanetas, gigantes gaseosos e incluso planetas de púlsar alrededor de estrellas anfitrionas muy distintas. Permite explorar la increíble diversidad de los sistemas planetarios con mecánica orbital e interacciones planetarias interactivas.',
  'scenario.Quasar Cannon.title': 'Cañón de cuásar',
  'scenario.Quasar Cannon.summary':
    'Un agujero negro supermasivo se alimenta activamente de un cúmulo estelar denso. Se ve formarse un haz de luz a medida que las estrellas caen en espiral hacia el interior.',
  'scenario.The Pinwheel Galaxy Core.title':
    'Núcleo de la galaxia del Molinete',
  'scenario.The Pinwheel Galaxy Core.summary':
    'Dos agujeros negros intermedios en el centro de un disco estelar. El disco forma un molinete giratorio a medida que las estrellas son lanzadas a su alrededor.',
  'scenario.Star Frisbee.title': 'Disco estelar volador',
  'scenario.Star Frisbee.summary':
    'Un disco estelar denso lanzado junto a un agujero negro errante. ¿Quedará hecho jirones o sobrevivirá al paso?',
  'scenario.Kessler Cascade.title': 'Cascada de Kessler',
  'scenario.Kessler Cascade.summary':
    'Centenares de microestrellas orbitando caóticamente, chocando y saliendo despedidas como una nube de restos.',
  'scenario.Alien Dyson Swarm Collapse.title':
    'Colapso de un enjambre de Dyson alienígena',
  'scenario.Alien Dyson Swarm Collapse.summary':
    'Un hipotético enjambre de Dyson de satélites artificiales cae hacia un agujero negro tras un fallo orbital catastrófico.',
  'scenario.Tidal Arm Tango.title': 'Tango de brazos de marea',
  'scenario.Tidal Arm Tango.summary':
    'Dos agujeros negros bailan al pasar uno junto al otro y lanzan estrellas formando enormes brazos de marea, como galaxias en colisión.',
  'scenario.Hungry Hungry Holes.title': 'Agujeros hambrientos',
  'scenario.Hungry Hungry Holes.summary':
    'Cuatro agujeros negros en los vértices de un cuadrado, tirando de las estrellas de un cúmulo central compartido.',
  'scenario.Slingshot Gauntlet.title': 'Circuito de asistencias gravitatorias',
  'scenario.Slingshot Gauntlet.summary':
    'Una estrella veloz disparada a través de una carrera de obstáculos de agujeros negros. Para observar asistencias gravitatorias.',
  'scenario.Black Hole Billiards.title': 'Billar de agujeros negros',
  'scenario.Black Hole Billiards.summary':
    'Unos cuantos agujeros negros pequeños orbitando uno supermasivo, perturbándose entre sí y generando un movimiento caótico.',
  'scenario.Stellar Nursery.title': 'Guardería estelar',
  'scenario.Stellar Nursery.summary':
    'Un cúmulo denso de estrellas jóvenes alrededor de un protoagujero negro. Permite observar interacciones y expulsiones a medida que el cúmulo evoluciona.',

  // --- Readout header, rail sub-headings ------------------------------------
  'readout.sonificationToggle.label': 'Sonido',
  'readout.sonification.off.hint':
    'Activar la sonificación procedimental: el movimiento orbital, las frecuencias de ondas gravitacionales y las firmas de colisión se convierten en audio en vivo.',
  'readout.sonification.on.hint': 'Silenciar la sonificación de la simulación',
  'readout.elapsed': 'Transcurrido',
  'readout.count.empty': 'Todavía no hay nada en la simulación',
  'readout.integrator': 'Integrador',
  'readout.drift.energy': 'Deriva de energía',
  'readout.drift.angular': 'Deriva de mom. angular',
  'rail.sub.measure': 'Medir',
  'rail.sub.instruments': 'Instrumentos',
  'rail.sub.instruments.label': 'Paneles de análisis',
  'rail.sub.view': 'Vista',
  'rail.sub.share': 'Capturar',

  // --- The lesson engine's own chrome ---------------------------------------
  'inv.error.scenario': 'No se pudo cargar el escenario de este paso.',
  'inv.plot.placeholder': 'Los valores que introduzcas aparecen aquí',
  'inv.plot.title': 'Tus medidas',
  'inv.import.default': 'Usar el objeto seleccionado',
  'inv.import.needObject':
    'Selecciona primero un objeto con una órbita medible.',
  'inv.import.duplicate': 'Ese ya lo has registrado.',
  'inv.import.full':
    'Todas las filas están llenas. Vacía una para importar de nuevo.',
  'inv.action.finish': 'Terminar',
  'inv.action.next': 'Siguiente',
  'inv.probe.unavailable': 'Lectura no disponible',
  'inv.answer.correct': 'Correcto.',
  'inv.answer.recorded': 'Registrado.',
  'inv.answer.model': 'Respuesta modelo mostrada.',
  'inv.announce.started': 'Investigación iniciada: {title}',
  'inv.report.building': 'Generando…',
  'inv.report.done': 'Informe de laboratorio descargado',
  'inv.report.failed': 'No se pudo generar el informe.',
  'inv.report.download': 'Descargar informe de laboratorio (PDF)',
  'inv.progress.cleared': 'Progreso borrado',
  'inv.progress.steps': '{done} de {total} pasos',
  'inv.scenario.reset': 'Escenario reiniciado',
  'inv.link.unknown':
    'Ese enlace de investigación no corresponde a ninguna lección.',
  'inv.load.failed': 'No se pudo cargar esa lección. Inténtalo de nuevo.',
  'inv.card.loading': 'Cargando…',
  'inv.card.review': 'Repasar la lección',
  'inv.card.start': 'Empezar la lección',
  'inv.card.resume': 'Continuar en el paso {n}',
  'inv.card.complete': 'Completada',
  'inv.card.seen': '{done} de {total} pasos vistos',
  'inv.card.report': 'Informe de laboratorio',
  'inv.card.series': '{label}, lección {index} de {of}',
  'inv.summary.about': 'unas {h} horas',
  'inv.summary.range': '{l}–{h} horas',
  'inv.summary.work': '{hours} de trabajo',
  'inv.summary.level': 'Todas de nivel {level}.',
  'inv.summary.lessons': { one: '{n} lección', other: '{n} lecciones' },
  'inv.summary.steps': { one: '{n} paso', other: '{n} pasos' },
  'inv.summary.complete': '{n} completada',
  'inv.summary.going': '{n} en curso',
  'inv.card.objectives': { one: '{n} objetivo', other: '{n} objetivos' },

  // --- Shortcuts, panels and the rest of the interface -----------------------
  'shortcut.pause': 'Pausar / reanudar',
  'shortcut.stepBack': 'Retroceder un fotograma grabado',
  'shortcut.stepForward': 'Avanzar un fotograma grabado',
  'shortcut.live': 'Volver al directo',
  'shortcut.pan': 'Desplazar la vista',
  'shortcut.zoom': 'Acercar y alejar',
  'shortcut.resetView': 'Restablecer la vista',
  'shortcut.investigations': 'Abrir las investigaciones guiadas',
  'shortcut.share': 'Compartir un enlace a esta simulación',
  'shortcut.export': 'Exportar los datos grabados en CSV',
  'shortcut.theme': 'Cambiar de tema',
  'shortcut.units': 'Alternar unidades físicas / de simulación',
  'shortcut.trails': 'Alternar estelas',
  'shortcut.undo': 'Deshacer el último objeto colocado',
  'shortcut.inspect': 'Inspeccionar un objeto',
  'shortcut.place': 'Colocar un objeto con velocidad',
  'shortcut.snap': 'Ajustar a una órbita circular',
  'shortcut.lecture': 'Modo presentación (proyección)',
  'shortcut.showList': 'Mostrar esta lista',
  'shortcut.closePanel': 'Cerrar el panel abierto',
  'chart.autoRefresh':
    'Actualización automática activa: pulsa para actualizar ahora',
  'chart.refresh': 'Actualizar los datos del gráfico',
  'overlay.habitableZone': 'Zona habitable',
  'overlay.referenceFrame': 'Sistema de referencia',
  'overlay.equalAreaSweep': 'Barrido de áreas iguales',
  'tip.dismiss': 'Descartar este consejo',
  'objectType.rockyPlanets': 'Añadir planetas rocosos',
  'objectType.gasGiants': 'Añadir gigantes gaseosos',
  'objectType.asteroids': 'Añadir asteroides',
  'objectType.comets': 'Añadir cometas',
  'objectType.whiteDwarfs': 'Añadir enanas blancas',
  'objectType.neutronStars': 'Añadir estrellas de neutrones',
  'objectType.blackHoles': 'Añadir agujeros negros',
  'stopwatch.needBody':
    'Selecciona primero un cuerpo y después ancla el cronómetro a él',
  'hz.recentVenus': 'Venus Reciente',
  'hz.runaway': 'Efecto invernadero desbocado',
  'hz.maximum': 'Invernadero máximo',
  'hz.earlyMars': 'Marte Temprano',
  'rv.crossingZero': 'Cruzando el cero',
  'rv.movingAway': 'ALEJÁNDOSE DE NOSOTROS',
  'rv.movingToward': 'ACERCÁNDOSE A NOSOTROS',
  'welcome.scenarioGone': 'Ese escenario ya no está disponible.',
  'welcome.shownAgain': 'Se volverá a mostrar la próxima vez',
  'welcome.showAgain': 'Mostrar esto de nuevo en mi próxima visita',
  'astrometry.keepObserving': 'Sigue observando…',
  'export.downloadCsv': 'Descargar CSV',
  'lightCurve.relativeBrightness': 'Brillo relativo',
  'frame.barycenter': 'Baricentro',
  'view3d.loadFailed':
    'No se pudo cargar la vista del espacio-tiempo. Comprueba tu conexión.',
  'tutorial.welcome': 'Bienvenido a Gravitas',
  'tutorial.place': 'Coloca un objeto arrastrando',
  'tutorial.choose': 'Elige qué estás colocando',
  'tutorial.inspect': 'Inspecciona lo que sea',
  'tutorial.rewind': 'Rebobina lo que acaba de pasar',
  'tutorial.scenario': 'Empieza desde un sistema real',
  'tutorial.settings': 'Unidades, temas y lo demás',
  'tutorial.done': 'Ya está',

  // --- The front door --------------------------------------------------------
  'welcomeCard.sandbox.eyebrow': 'Exploración libre',
  'welcomeCard.sandbox.title': 'Laboratorio',
  'welcomeCard.sandbox.text':
    'Construye un sistema desde cero, o carga uno de los escenarios incluidos y cámbialo. Arrastra para colocar un objeto; el arrastre fija su velocidad.',
  'welcomeCard.sandbox.cta': 'Entrar en el laboratorio',
  'welcomeCard.investigations.eyebrow': 'Lecciones guiadas',
  'welcomeCard.investigations.title': 'Investigaciones',
  'welcomeCard.investigations.text':
    'Actividades de astronomía estructuradas dentro de la simulación: predice, experimenta, mide, responde y exporta un informe de laboratorio.',
  'welcomeCard.investigations.cta': 'Ver las investigaciones',
  'welcomeCard.instructors.eyebrow': 'Para enseñar',
  'welcomeCard.instructors.title': 'Profesorado',
  'welcomeCard.instructors.text':
    'Guías docentes, objetivos de aprendizaje, soluciones y un mapa curricular para cursos de astronomía introductoria.',
  'welcomeCard.instructors.cta': 'Recursos para el profesorado',
  'welcomeAudience.students.title': 'Para estudiantes',
  'welcomeAudience.students.text':
    'Ve las relaciones que describe una ecuación. Aleja un planeta y observa cómo se alarga su año; estira una órbita y observa cómo oscila la luz estelar.',
  'welcomeAudience.instructors.title': 'Para el profesorado',
  'welcomeAudience.instructors.text':
    'Seis investigaciones guiadas para astronomía introductoria y de formación general, con guías docentes, soluciones y enlaces de simulación que se pueden compartir.',
  'welcomeAudience.curious.title': 'Para curiosos',
  'welcomeAudience.curious.text':
    'Sin cuenta, sin instalación, sin nada que leer antes. Carga una fusión de agujeros negros y obsérvala, o parte del espacio vacío y mira qué hace la gravedad.',
  'welcomeLink.model.label': 'Cómo modela Gravitas el universo',
  'welcomeLink.model.note':
    'Qué se calcula, qué se aproxima y qué solo se dibuja.',
  'welcomeLink.instructors.note': 'Guías, soluciones y un mapa curricular.',

  // --- Lesson instruments ----------------------------------------------------
  // Los rótulos, títulos de ejes y nombres de ajustes de los instrumentos
  // incrustados en las lecciones.
  'energyW.theMoon': 'la Luna',
  'energyW.earth': 'la Tierra',
  'energyW.jupiter': 'Júpiter',
  'energyW.theSun': 'el Sol',
  'energyW.total': 'TOTAL',
  'energyW.doesItComeBack': '¿Vuelve?',
  'energyW.launchSpeed': 'Velocidad de lanzamiento',
  'energyW.slow6KmS': 'Lento: 6 km/s',
  'energyW.orbit78KmS': 'Órbita: 7,8 km/s',
  'energyW.boundary109KmS': 'Frontera: 10,9 km/s',
  'energyW.fast14KmS': 'Rápido: 14 km/s',
  'energyW.clearlyGoneItLeavesAlong':
    'Claramente se ha ido. Se marcha por una trayectoria abierta y todavía le sobra velocidad cuando está muy lejos.',
  'energyW.run': '▶ Ejecutar',
  'energyW.reset': '↺ Reiniciar',
  'energyW.totalEnergy': 'Energía total',
  'energyW.escapeSpeedFromHere': 'Velocidad de escape desde aquí',
  'energyW.furthestItGets': 'Hasta dónde llega',
  'energyW.energyAroundOneOrbit': 'Energía a lo largo de una órbita',
  'energyW.clickAPlanetInThe': 'Pulsa un planeta en la simulación',
  'energyW.watching': 'Observando',
  'energyW.energyOfMotion': 'Energía de movimiento',
  'energyW.howMuchTheTotalHas': 'Cuánto se ha movido el total',
  'energyW.whereItIs': 'Dónde está',
  'energyW.whatMakesEscapeHard': '¿Qué hace difícil escapar?',
  'energyW.escapeSpeedFromFourReal':
    'Velocidad de escape desde cuatro cuerpos reales. Mueve el deslizador para empezar más lejos y observa cómo caen todas las barras.',
  'energyW.startDistance': 'Distancia inicial',
  'energyW.bodyRadius': '× radio del cuerpo',
  'energyW.atTheSurface': 'En la superficie',
  'energyW.twiceAsFarOut': 'Al doble de distancia',
  'energyW.tenRadiiOut': 'A diez radios',
  'energyW.startingDistance': 'Distancia de partida',
  'energyW.oneLawThreeShapes': 'Una ley, tres formas',
  'energyW.theSamePlanetTheSame':
    'El mismo planeta, el mismo punto de lanzamiento, la misma ley de la gravedad. Solo cambia la velocidad.',
  'energyW.speedAsAFractionOf':
    'Velocidad, como fracción de la velocidad de escape',
  'energyW.belowEscape': 'Por debajo del escape',
  'energyW.exactlyEscape': 'Exactamente el escape',
  'energyW.aboveEscape': 'Por encima del escape',
  'energyW.shapeOfThePath': 'Forma de la trayectoria',
  'energyW.escapeSpeedHere': 'Velocidad de escape aquí',
  'energyW.belowEscapeEllipse': 'por debajo del escape: elipse',
  'energyW.escapeExactlyParabola': 'escape exacto: parábola',
  'energyW.aboveEscapeHyperbola': 'por encima del escape: hipérbola',
  'bhW.acrossTheEventHorizon': 'de lado a lado del horizonte de sucesos',
  'bhW.aMarathon': 'un maratón',
  'bhW.manhattanEndToEnd': 'Manhattan, de punta a punta',
  'bhW.oneBlackHoleDrawnTo': 'Un agujero negro, dibujado a escala',
  'bhW.massOfTheBlackHole': 'Masa del agujero negro',
  'bhW.mass': 'Masa',
  'bhW.schwarzschildRadiusR': 'Radio de Schwarzschild, Rₛ',
  'bhW.rightAcrossTheEventHorizon': 'De lado a lado del horizonte de sucesos',
  'bhW.comparedWithTheLengthOf': 'Comparado con la longitud de Manhattan',
  'bhW.massAgainstHorizonSize': 'La masa frente al tamaño del horizonte',
  'bhW.setAMassPressRecord':
    'Fija una masa, pulsa Registrar y el punto cae en la gráfica. Con tres o cuatro ensayos basta.',
  'bhW.recordThisTrial': '⊕ Registrar este ensayo',
  'bhW.clearTrials': '↺ Borrar ensayos',
  'bhW.sliderIsAt': 'El deslizador está en',
  'bhW.squeezingTheSun': 'Comprimiendo el Sol',
  'bhW.radiusOfTheSqueezedSun': 'Radio del Sol comprimido',
  'bhW.theSunToday': 'El Sol hoy',
  'bhW.696000KmAcrossThe':
    '696 000 km de radio. Velocidad de escape 618 km/s, unas dos diezmilésimas de la velocidad de la luz.',
  'bhW.earthSized': 'Del tamaño de la Tierra',
  'bhW.aWholeSolarMassPacked':
    'Una masa solar entera comprimida en una bola del tamaño de la Tierra. Esto es aproximadamente lo que es una enana blanca.',
  'bhW.twiceTheSchwarzschildRadiusThe':
    'El doble del radio de Schwarzschild. La velocidad de escape ya es siete décimas de la velocidad de la luz.',
  'bhW.massUnchangedThroughout': 'Masa, invariable en todo momento',
  'bhW.radiusNow': 'Radio ahora',
  'bhW.escapeSpeedFromTheSurface': 'Velocidad de escape desde la superficie',
  'bhW.asAShareOfThe': 'Como fracción de la velocidad de la luz',
  'bhW.radiusInSchwarzschildRadii': 'Radio, en radios de Schwarzschild',
  'bhW.airAtSeaLevel': 'Aire a nivel del mar',
  'bhW.water': 'Agua',
  'bhW.aWhiteDwarf': 'Una enana blanca',
  'bhW.anAtomicNucleus': 'Un núcleo atómico',
  'bhW.averageDensityOnALadder': 'Densidad media, en una escalera',
  'bhW.horizonRadius': 'Radio del horizonte',
  'bhW.averageDensityOnThisScale': 'Densidad media a esta escala',
  'bhW.comparedWithWater': 'Comparado con el agua',
  'bhW.countingTheZeros': 'Contando los ceros',
  'bhW.multiplyTheMassBy': 'Multiplica la masa por',
  'bhW.startingBlackHole': 'Agujero negro de partida',
  'bhW.afterMultiplying': 'Después de multiplicar',
  'bhW.volumeGained': 'Volumen ganado',
  'bhW.soDensityLost': 'Así que la densidad perdió',
  'bhW.newAverageDensity': 'Nueva densidad media',
  'bhW.volumeInsideIt': 'Volumen en su interior',
  'bhW.averageDensity': 'Densidad media',
  'bhW.theSunSSurface': 'La superficie del Sol',
  'bhW.theMicrowaveBackground': 'El fondo de microondas',
  'bhW.theColdestLabExperiment': 'El experimento de laboratorio más frío',
  'bhW.howColdIsIt': '¿Cómo de frío está?',
  'bhW.sagittariusA': 'Sagitario A*',
  'bhW.hawkingTemperature': 'Temperatura de Hawking',
  'bhW.colderThanTheMicrowaveBackground':
    'Más frío que el fondo de microondas en',
  'bhW.theMicrowaveBackgroundForScale':
    'El fondo de microondas, como referencia',
  'bhW.howLongWillItLast': '¿Cuánto durará?',
  'bhW.evaporationLifetime': 'Vida hasta la evaporación',
  'bhW.zerosInThatNumber': 'Ceros de ese número',
  'bhW.agesOfTheUniverse': 'Edades del universo',
  'bhW.ageOfTheUniverse': 'Edad del universo',
  'bhW.untilTheLastStarsBurn': 'Hasta que se apaguen las últimas estrellas',
  'bhW.thisBlackHoleEvaporates': 'Este agujero negro se evapora',
  'bhW.blackHoleA': 'Agujero negro A',
  'bhW.aboutAsFarAsThe': 'aproximadamente la longitud de Manhattan',
  'bhW.blackHoleB': 'Agujero negro B',
  'bhW.theEarth': 'la Tierra',
  'bhW.aLittleUnderHalfThe': 'algo menos de la mitad del radio de la Tierra',
  'bhW.blackHoleC': 'Agujero negro C',
  'bhW.theSun': 'el Sol',
  'bhW.aboutTwoThirdsOfThe': 'unos dos tercios del radio del Sol',
  'bhW.blackHoleD': 'Agujero negro D',
  'bhW.mercurySOrbit': 'la órbita de Mercurio',
  'bhW.aboutAFifthOfThe':
    'aproximadamente una quinta parte del camino hasta Mercurio',
  'bhW.fourBlackHoles': 'Cuatro agujeros negros',
  'bhW.showing': 'Mostrando',
  'bhP.manhattanEndToEnd': 'Manhattan, de punta a punta',
  'bhP.earthSRadius': 'el radio de la Tierra',
  'bhP.theSunSRadius': 'el radio del Sol',
  'bhP.mercurySOrbit': 'la órbita de Mercurio',
  'bhP.airAtSeaLevel': 'Aire a nivel del mar',
  'bhP.water': 'Agua',
  'bhP.theSunOnAverage': 'El Sol, en promedio',
  'bhP.rock': 'Roca',
  'bhP.lead': 'Plomo',
  'bhP.aWhiteDwarf': 'Una enana blanca',
  'bhP.anAtomicNucleus': 'Un núcleo atómico',
  'bhP.theSurfaceOfTheSun': 'La superficie del Sol',
  'bhP.roomTemperature': 'Temperatura ambiente',
  'bhP.liquidNitrogen': 'Nitrógeno líquido',
  'bhP.theMicrowaveBackground': 'El fondo de microondas',
  'bhP.theColdestLabExperiment': 'El experimento de laboratorio más frío',
  'bhP.aHumanLifetime': 'Una vida humana',
  'bhP.sinceTheDinosaurs': 'Desde los dinosaurios',
  'bhP.ageOfTheUniverse': 'Edad del universo',
  'bhP.theLastStarBurnsOut': 'Se apaga la última estrella',
  'dmW.allInTheMiddle': 'Todo en el centro',
  'dmW.uniformBall': 'Bola uniforme',
  'dmW.exponentialDisc': 'Disco exponencial',
  'dmW.haloMassKeepsGrowing': 'Halo (la masa sigue creciendo)',
  'dmW.whereTheMassIsAnd': 'Dónde está la masa, y la curva que produce',
  'dmW.massDistribution': 'Distribución de masa',
  'dmW.totalMassInside30Kpc': 'Masa total dentro de 30 kpc',
  'dmW.howSpreadOutItIs': 'Cómo de extendida está',
  'dmW.solarSystem': 'Sistema Solar',
  'dmW.spiralDisc': 'Disco espiral',
  'dmW.aRealStellarDiscIt':
    'Un disco estelar real. Sube, alcanza un máximo hacia 2,2 longitudes de escala y después cae. Sigue sin ser plano.',
  'dmW.whatGalaxiesDo': 'Lo que hacen las galaxias',
  'dmW.speedAt30Kpc': 'Velocidad a 30 kpc',
  'dmW.outerSlopeVR': 'Pendiente exterior (v ∝ rⁿ)',
  'dmW.shapeOutThere': 'Forma allí fuera',
  'dmW.massInside30Kpc': 'Masa dentro de 30 kpc',
  'dmW.fallingAllMassInThe': 'Descendente (toda la masa en el centro)',
  'dmW.flatWhatGalaxiesDo': 'Plana (lo que hacen las galaxias)',
  'dmW.aRealGalaxyDiscHalo': 'Una galaxia real: disco + halo',
  'dmW.whatTheSpeedTellsYou': 'Qué te dice la velocidad sobre la masa',
  'dmW.rotationCurve': 'Curva de rotación',
  'dmW.radiusMarker': 'Marcador de radio',
  'dmW.fallingCurve': 'Curva descendente',
  'dmW.dragTheMarkerOutThe':
    'Arrastra el marcador hacia fuera. La velocidad cae y la masa encerrada deja de crecer: todo está ya dentro.',
  'dmW.flatCurve': 'Curva plana',
  'dmW.aRealGalaxy': 'Una galaxia real',
  'dmW.massThatMustBeInside': 'Masa que tiene que haber dentro',
  'dmW.goOutTwiceAsFar': 'Ve el doble de lejos, y la masa encerrada',
  'dmW.ofWhichTheVisibleDisc': 'De la cual el disco visible podría aportar',
  'dmW.starsOnly': 'Solo estrellas',
  'dmW.maximumDisc': 'Disco máximo',
  'dmW.wrongScaleLength': 'Longitud de escala equivocada',
  'dmW.publishedDecomposition': 'Descomposición publicada',
  'dmW.fitARealGalaxy': 'Ajusta una galaxia real',
  'dmW.discMassTheStarsYou': 'Masa del disco (las estrellas que ves)',
  'dmW.discScaleLength': 'Longitud de escala del disco',
  'dmW.haloStrengthItsFlatSpeed': 'Intensidad del halo (su velocidad plana)',
  'dmW.haloCoreRadius': 'Radio de núcleo del halo',
  'dmW.averageMiss': 'Error medio',
  'dmW.fit': 'Ajuste',
  'dmW.visibleMass': 'Masa visible',
  'dmW.haloMassInside30Kpc': 'Masa del halo dentro de 30 kpc',
  'dmW.darkMassForEveryUnit': 'Masa oscura por cada unidad de masa visible',
  'dmW.whatTheHaloIsHolding': 'Qué está sujetando el halo',
  'dmW.launchRadius': 'Radio de lanzamiento',
  'dmW.darkMatterHalo': 'Halo de materia oscura',
  'dmW.runPause': '▶ Ejecutar / Pausar',
  'dmW.relaunch': '↺ Relanzar',
  'dmW.haloOn': 'Halo activado',
  'dmW.theStarHoldsItsOrbit':
    'La estrella mantiene su órbita. El disco visible nunca podría hacerlo solo a 20 kpc.',
  'dmW.haloOff': 'Halo desactivado',
  'dmW.halo': 'Halo',
  'dmW.launchSpeed': 'Velocidad de lanzamiento',
  'dmW.speedTheVisibleDiscAlone':
    'Velocidad que el disco visible por sí solo podría sostener',
  'dmW.distanceNow': 'Distancia ahora',
  'dmW.verdict': 'Veredicto',
  'dmW.weighAClusterByHow': 'Pesa un cúmulo por lo rápido que se agita',
  'dmW.measuredLineOfSightSpread': 'Dispersión medida en la línea de visión σ',
  'dmW.clusterRadiusR': 'Radio del cúmulo R',
  'dmW.mpc': 'Mpc',
  'dmW.turnIntoVUsing': 'Convierte σ en ⟨v²⟩ usando',
  'dmW.comaDoneRight': 'Coma, bien hecho',
  'dmW.forgetTheFactorOf3': 'Olvidar el factor 3',
  'dmW.forgetToSquareIt': 'Olvidar elevarlo al cuadrado',
  'dmW.massTheMotionNeeds': 'Masa que exige el movimiento',
  'dmW.massInGalaxies': 'Masa en las galaxias',
  'dmW.plusHotGasBetweenThem': 'Más el gas caliente entre ellas',
  'dmW.neededEverythingYouCanSee': 'Necesaria ÷ todo lo que puedes ver',
  'dmW.warning': 'Advertencia',
  'dmW.everything': 'Todo',
  'dmW.justTheMatter': 'Solo la materia',
  'dmW.justTheOrdinaryMatter': 'Solo la materia ordinaria',
  'dmW.justTheStars': 'Solo las estrellas',
  'dmW.whereTheMassOfThe': 'Dónde está la masa del universo',
  'dmW.zoomInOn': 'Ampliar',
  'dmW.darkEnergy': 'Energía oscura',
  'dmW.darkMatter': 'Materia oscura',
  'dmW.ordinaryMatterAllOfIt': 'Materia ordinaria, toda ella',
  'dmW.stars': 'Estrellas',
  'dmW.darkMatterForEveryUnit':
    'Materia oscura por cada unidad de materia ordinaria',
  'dmW.darkEnergy2': 'energía oscura',
  'dmW.darkMatter2': 'materia oscura',
  'exoW.whoIsActuallyMoving': '¿Quién se mueve de verdad?',
  'exoW.theStarAndThePlanet':
    'La estrella y el planeta giran ambos alrededor del mismo punto. Sube el aumento para ver hacerlo a la estrella.',
  'exoW.planetMass': 'Masa del planeta',
  'exoW.orbitSize': 'Tamaño de la órbita',
  'exoW.stellarWobbleShown': 'Bamboleo estelar mostrado',
  'exoW.jupiterAtJupiterSDistance': 'Júpiter, a la distancia de Júpiter',
  'exoW.theSunReallyDoesThis':
    'El Sol hace esto de verdad. Su órbita de reflejo mide como un radio solar y tarda doce años en completarse.',
  'exoW.anEarth': 'Una Tierra',
  'exoW.starSOwnOrbit': 'Órbita propia de la estrella',
  'exoW.planetSOrbit': 'Órbita del planeta',
  'exoW.planetSOrbitIsBigger': 'La órbita del planeta es mayor en',
  'exoW.bothGoRoundOnceEvery': 'Ambos dan una vuelta cada',
  'exoW.towardUsAwayFromUs': 'Hacia nosotros, lejos de nosotros',
  'exoW.inclination': 'Inclinación',
  'exoW.radialVelocityNow': 'Velocidad radial ahora',
  'exoW.whichWay': 'En qué sentido',
  'exoW.semiAmplitudeK': 'Semiamplitud K',
  'exoW.whatMakesTheWobbleBigger': '¿Qué hace mayor el bamboleo?',
  'exoW.oneThingChangesAtA':
    'Cambia una cosa cada vez. La estrella, el periodo y el ángulo de visión se mantienen quietos.',
  'exoW.aNeptune': 'Un Neptuno',
  'exoW.aHeavyJupiter': 'Un Júpiter pesado',
  'exoW.doubleTheMassAndK': 'Dobla la masa y K',
  'exoW.theSamePlanetTilted': 'El mismo planeta, inclinado',
  'exoW.thePlanetDoesNotChange':
    'El planeta no cambia. Solo cambia nuestro ángulo de visión. Observa qué le pasa a la masa que informa la velocidad radial.',
  'exoW.truePlanetMass': 'Masa real del planeta',
  'exoW.edgeOn90': 'De canto, 90°',
  'exoW.aTransitingSystemIsClose':
    'Un sistema en tránsito está cerca de esto, y por eso su masa es una masa y no un límite inferior.',
  'exoW.faceOn5': 'De frente, 5°',
  'exoW.almostNoRadialVelocitySignal':
    'Casi ninguna señal de velocidad radial. El planeta sigue estando ahí.',
  'exoW.kWeWouldMeasure': 'K que mediríamos',
  'exoW.massRvAloneReports': 'Masa que informa la VR por sí sola',
  'exoW.thatIsTheTrueMass': 'Es decir, la masa real por',
  'exoW.soRadialVelocityGives': 'Así que la velocidad radial da',
  'exoW.theWobbleAcrossTheSky': 'El bamboleo por el cielo',
  'exoW.astrometryMeasuresWhereTheStar':
    'La astrometría mide dónde está la estrella, no con qué rapidez viene hacia nosotros. Aquí nada es una imagen del planeta.',
  'exoW.distance': 'Distancia',
  'exoW.aTextbookRadialVelocityTarget':
    'Un objetivo de manual para la velocidad radial y desesperado para la astrometría: muy cerca de su estrella y a casi cincuenta pársecs.',
  'exoW.sunAndJupiterAt10': 'El Sol y Júpiter a 10 pc',
  'exoW.theSameMethodAWide':
    'El mismo método, una órbita ancha y un sistema cercano: cientos de veces más fácil.',
  'exoW.twiceAsFarAway': 'Al doble de distancia',
  'exoW.theStarSOrbitHas':
    'La órbita de la estrella no ha cambiado en absoluto. Solo ha cambiado el ángulo que subtiende.',
  'exoW.starSReflexOrbit': 'Órbita de reflejo de la estrella',
  'exoW.angularSignature': 'Firma angular',
  'exoW.orbitalPeriod': 'Periodo orbital',
  'exoW.distanceChanges': 'Cambios de distancia',
  'exoW.threeMethodsOneSystem': 'Tres métodos, un sistema',
  'exoW.tiltTheSamePlanetAnd':
    'Inclina el mismo planeta y observa qué medidas sobreviven. Ningún método gana en todas partes.',
  'exoW.transit': 'Tránsito',
  'exoW.radialVelocity': 'Velocidad radial',
  'exoW.astrometry': 'Astrometría',
  'exoW.together': 'Juntas',
  'exoW.whatDoWeActuallyKnow': '¿Qué sabemos en realidad?',
  'exoW.eachRowIsOneObservation':
    'Cada fila es una observación y lo que compra. Las dos últimas filas necesitan las de arriba.',
  'exoW.radiusFromTheTransit': 'Radio, del tránsito',
  'exoW.massFromRadialVelocity': 'Masa, de la velocidad radial',
  'exoW.starSLuminosity': 'Luminosidad de la estrella',
  'exoW.starSTemperature': 'Temperatura de la estrella',
  'exoW.thePlanetThisLessonMeasured':
    'El planeta que midió esta lección. Grande, ligero y demasiado cerca de su estrella para la zona.',
  'exoW.planetAARockyCandidate': 'Planeta A: un candidato rocoso',
  'exoW.planetBPuffy': 'Planeta B: esponjoso',
  'exoW.planetCRockyTooHot': 'Planeta C: rocoso, demasiado caliente',
  'exoW.aRockyDensityAndFar':
    'Una densidad rocosa, y demasiado cerca de su estrella para la zona. La composición nunca fue toda la pregunta.',
  'exoW.bulkDensity': 'Densidad media',
  'exoW.whichMeans': 'Lo que significa',
  'exoW.starlightReceived': 'Luz estelar recibida',
  'exoW.modeledHabitableZone': 'Zona habitable modelada',
  'exoW.thisPlanetIs': 'Este planeta está',
  'binW.twoStarsOrbiting': 'Dos estrellas, orbitando',
  'binW.bothStarsAreMovingWatch':
    'Las dos estrellas se mueven. Obsérvalas unos segundos antes de leer nada.',
  'binW.massOfStarA': 'Masa de la Estrella A',
  'binW.massOfStarB': 'Masa de la Estrella B',
  'binW.mark': '⚑ Marcar',
  'binW.stop': '■ Parar',
  'binW.runPause': '▶ Ejecutar / Pausar',
  'binW.reset': '↺ Reiniciar',
  'binW.starADistanceFromThe': 'Estrella A, distancia al baricentro',
  'binW.starBDistanceFromThe': 'Estrella B, distancia al baricentro',
  'binW.distanceBetweenTheTwoStars': 'Distancia entre las dos estrellas',
  'binW.whichStarIsCloserTo':
    'Qué estrella está más cerca del punto de equilibrio',
  'binW.yearsSinceYouStartedWatching': 'Años desde que empezaste a observar',
  'binW.stopwatch': 'Cronómetro',
  'binW.timeForOneFullOrbit': 'Tiempo de una órbita completa',
  'binW.totalMassOfThePair': 'Masa total del par',
  'binW.howFarThePlanetMoves': 'Cuánto se mueve el planeta',
  'binW.howFarTheStarMoves': 'Cuánto se mueve la estrella',
  'binW.theStarSWobbleCompared':
    'El bamboleo de la estrella, comparado con la órbita del planeta',
  'binW.lightweightPair': 'par ligero',
  'binW.heavyweightPair': 'par pesado',
  'binW.sameSizeOrbitDifferentMasses':
    'Órbita del mismo tamaño, masas distintas',
  'binW.bothPairsAreExactlyThe':
    'Ambos pares están exactamente a la misma distancia. Solo difieren las masas. Observa cuál da la vuelta primero.',
  'binW.yearsElapsed': 'Años transcurridos',
  'binW.separationOfEachPair': 'Separación de cada par',
  'binW.theBalancePoint': 'El punto de equilibrio',
  'binW.aSeeSawBalancesWhen':
    'Un balancín se equilibra cuando el niño más pesado se sienta más cerca del centro. Dos estrellas hacen exactamente lo mismo.',
  'binW.starADistanceFromThe2': 'Estrella A, distancia al centro',
  'binW.starBDistanceFromThe2': 'Estrella B, distancia al centro',
  'binW.1AuAnd2Au': '1 UA y 2 UA',
  'binW.starBIsTwiceAs':
    'La Estrella B está el doble de lejos, así que la Estrella A debe ser el doble de pesada para equilibrarla.',
  'binW.1AuAnd3Au': '1 UA y 3 UA',
  'binW.starBIsThreeTimes':
    'La Estrella B está tres veces más lejos, así que la Estrella A es tres veces más pesada.',
  'binW.2AuAnd4Au': '2 UA y 4 UA',
  'binW.twiceAsFarAgainSo':
    'Otra vez el doble de lejos, así que otra vez el doble de pesada. Solo importa el cociente de las dos distancias, no las distancias en sí.',
  'binW.equal2AuEach': 'Iguales, 2 UA cada una',
  'binW.equalDistancesMeanEqualMasses':
    'Distancias iguales significan masas iguales. Este es el caso con el que empezaste la lección.',
  'binW.starAIsThisFar': 'La Estrella A está a esta distancia del centro',
  'binW.starBIsThisFar': 'La Estrella B está a esta distancia del centro',
  'binW.theHeavierStarAndBy': 'La estrella más pesada, y por cuánto',
  'binW.siriusWatchedForACentury': 'Sirio, observada durante un siglo',
  'binW.observationsUpTo': 'Observaciones hasta',
  'binW.oneDecade': 'Una década',
  'binW.threeDotsTheyAreMoving':
    'Tres puntos. Se mueven, pero nadie podría decirte la forma de la órbita a partir de esto.',
  'binW.halfAnOrbit': 'Media órbita',
  'binW.oneFullOrbit': 'Una órbita completa',
  'binW.aCentury': 'Un siglo',
  'binW.observationsPlotted': 'Observaciones representadas',
  'binW.yearsOfWatching': 'Años de observación',
  'binW.orbitsCompleted': 'Órbitas completadas',
  'binW.periodOnceTheOrbitCloses': 'Periodo, una vez que la órbita se cierra',
  'binW.orbitSizeOnceTheOrbit': 'Tamaño de la órbita, una vez que se cierra',
  'tideW.thePullOnThreePoints': 'La atracción sobre tres puntos',
  'tideW.distanceToTheCompanion': 'Distancia al compañero',
  'tideW.moonSDistance': '× la distancia de la Luna',
  'tideW.massOfTheCompanion': 'Masa del compañero',
  'tideW.moonSMass': '× la masa de la Luna',
  'tideW.pullOnTheNearSide': 'Atracción sobre el lado cercano',
  'tideW.pullOnTheCentre': 'Atracción sobre el centro',
  'tideW.pullOnTheFarSide': 'Atracción sobre el lado lejano',
  'tideW.nearSideMinusTheCentre': 'Lado cercano, menos el centro',
  'tideW.farSideMinusTheCentre': 'Lado lejano, menos el centro',
  'tideW.nearSideBiggerThanFar': 'El lado cercano supera al lejano en',
  'tideW.towardTheCompanion': 'hacia el compañero',
  'tideW.whatIsLeftOver': 'lo que queda',
  'tideW.tidalStrength': 'Intensidad de marea',
  'tideW.distance': 'Distancia',
  'tideW.mass': 'Masa',
  'tideW.tidalStretch': 'Estiramiento de marea',
  'tideW.inFullUnits': 'En unidades completas',
  'tideW.sevenRealTidesOnOne': 'Siete mareas reales, en una escala',
  'tideW.highlight': 'Resaltar',
  'tideW.pairing': 'Pareja',
  'tideW.separation': 'Separación',
  'tideW.comparedWithTheLunarTide': 'Comparada con la marea lunar',
  'tideW.cometIce': 'Hielo de cometa',
  'tideW.aPorousWeaklyBoundNucleus':
    'Un núcleo poroso y débilmente ligado. Muy poco agarre para su tamaño, así que la balanza se inclina muy lejos.',
  'tideW.theMoon': 'La Luna',
  'tideW.iron': 'Hierro',
  'tideW.aDenseMetallicBodyMore':
    'Un cuerpo metálico denso. Más agarre para su tamaño, así que puede acercarse más antes de que la balanza se incline.',
  'tideW.stretchAgainstGrip': 'Estiramiento contra agarre',
  'tideW.distanceFromTheEarthS': 'Distancia al centro de la Tierra',
  'tideW.earthRadii': 'radios terrestres',
  'tideW.densityOfTheBody': 'Densidad del cuerpo',
  'tideW.itsOwnGravityAtIts': 'Su propia gravedad, en su superficie',
  'tideW.tidalStretchAtItsSurface': 'Estiramiento de marea, en su superficie',
  'tideW.stretchGrip': 'Estiramiento ÷ agarre',
  'tideW.theTwoAreEqualAt': 'Los dos se igualan a',
  'tideW.whatThatMeans': 'Qué significa eso',
  'tideW.bringAMoonInToward': 'Acerca una luna a Saturno',
  'tideW.distanceFromSaturnSCentre': 'Distancia al centro de Saturno',
  'tideW.saturnRadii': 'radios de Saturno',
  'tideW.densityOfTheMoon': 'Densidad de la luna',
  'tideW.porousIce': 'Hielo poroso',
  'tideW.whatSaturnSRingParticles':
    'Lo que son de verdad las partículas de los anillos de Saturno: hielo de agua, poco compactado. Este es el caso que ponen a prueba los propios anillos.',
  'tideW.solidIce': 'Hielo sólido',
  'tideW.denseUnfracturedIceTheLimit':
    'Hielo denso y sin fracturar. El límite se mueve hacia dentro, porque un cuerpo más denso se agarra a sí mismo con más fuerza.',
  'tideW.rock': 'Roca',
  'tideW.denserSoItHoldsTogether':
    'Más denso, así que se mantiene unido más cerca. El límite de Roche no es una sola distancia: depende de lo que cae.',
  'tideW.denserStillAndTheLimit':
    'Más denso todavía, y el límite se mueve de nuevo hacia dentro. Cambia de qué está hecha la luna y cambias dónde se rompe.',
  'tideW.rocheLimitBodyWithNo': 'Límite de Roche, cuerpo sin resistencia',
  'tideW.rocheLimitBodyThatKeeps':
    'Límite de Roche, cuerpo que conserva su forma',
  'tideW.stretchGripWhereYouHave': 'Estiramiento ÷ agarre donde lo has puesto',
  'tideW.verdict': 'Veredicto',
  'tideW.forComparisonTheARing':
    'Como comparación, el borde exterior del anillo A',
  'tideW.andMimasTheInnermostRound': 'Y Mimas, la luna redonda más interior',
  'tideW.aSunLikeStarFalling':
    'Una estrella parecida al Sol cayendo hacia un agujero negro',
  'tideW.blackHoleMass': 'Masa del agujero negro',
  'tideW.stellar10M': 'Estelar, 10 M☉',
  'tideW.sagittariusA4MillionM': 'Sagitario A*, 4 millones de M☉',
  'tideW.aGiant1BillionM': 'Un gigante, 1000 millones de M☉',
  'tideW.starIsTornApartAt': 'La estrella se desgarra a',
  'tideW.eventHorizonAt': 'Horizonte de sucesos a',
  'tideW.tidalRadiusHorizon': 'Radio de marea ÷ horizonte',
  'tideW.whatAnOutsideObserverSees': 'Lo que ve un observador externo',
  'hzW.howMuchStarlightReachesThe': '¿Cuánta luz estelar llega al planeta?',
  'hzW.distanceFromTheStar': 'Distancia a la estrella',
  'hzW.halfOfEarthSDistance': 'La mitad de la distancia de la Tierra.',
  'hzW.earthSDistanceFromThe': 'La distancia de la Tierra al Sol.',
  'hzW.twiceEarthSDistance': 'El doble de la distancia de la Tierra.',
  'hzW.threeTimesEarthSDistance': 'Tres veces la distancia de la Tierra.',
  'hzW.starlightReachingEachSquareMeter':
    'Luz estelar que llega a cada metro cuadrado',
  'hzW.theSameThingInPhysical': 'Lo mismo en unidades físicas',
  'hzW.earthForComparison': 'La Tierra, como comparación',
  'hzW.theSameLightSpreadFurther': 'La misma luz, repartida más lejos',
  'hzW.theStarIsNotRunning':
    'La estrella no se está quedando sin luz. Observa el trozo de luz y la cáscara sobre la que cae a medida que crece la distancia.',
  'hzW.theShell': 'La cáscara',
  'hzW.soEachSquareMeterGets': 'Así que cada metro cuadrado recibe',
  'hzW.totalEnergyCrossingTheShell': 'Energía total que cruza la cáscara',
  'hzW.theShellIsThisMany': 'La cáscara es esta cantidad de veces mayor',
  'hzW.aDimRedDwarf': 'Una enana roja tenue',
  'hzW.likeProximaCentauriTheNearest':
    'Como Próxima Centauri, la estrella más cercana al Sol.',
  'hzW.anOrangeDwarf': 'Una enana naranja',
  'hzW.likeAlphaCentauriB': 'Como Alfa Centauri B.',
  'hzW.theSun': 'El Sol',
  'hzW.theStarWeKnowBest': 'La estrella que mejor conocemos.',
  'hzW.aHotterBrighterStar': 'Una estrella más caliente y más brillante',
  'hzW.likeProcyonA': 'Como Proción A.',
  'hzW.theSamePlanetADifferent': 'El mismo planeta, otra estrella',
  'hzW.star': 'Estrella',
  'hzW.planetSDistance': 'Distancia del planeta',
  'hzW.itsLuminosity': 'Su luminosidad',
  'hzW.starlightThePlanetReceives': 'Luz estelar que recibe el planeta',
  'hzW.habitableZoneRunsFrom': 'La zona habitable va de',
  'hzW.thisPlanetIs': 'Este planeta está',
  'hzW.whereTheEdgesComeFrom': 'De dónde salen los bordes',
  'hzW.definition': 'Definición',
  'hzW.conservative': 'Conservadora',
  'hzW.optimistic': 'Optimista',
  'hzW.definitionShown': 'Definición mostrada',
  'hzW.innerEdge': 'Borde interior',
  'hzW.outerEdge': 'Borde exterior',
  'hzW.widthOfTheZone': 'Anchura de la zona',
  'hzW.earthSitsAt': 'La Tierra está a',
  'hzW.aYearOnAnEccentric': 'Un año en una órbita excéntrica',
  'hzW.eccentricity': 'Excentricidad',
  'hzW.semiMajorAxis': 'Semieje mayor',
  'hzW.runPause': '▶ Ejecutar / Pausar',
  'hzW.reset': '↺ Reiniciar',
  'hzW.distanceRightNow': 'Distancia ahora mismo',
  'hzW.starlightRightNow': 'Luz estelar ahora mismo',
  'hzW.closestFurthest': 'Mínima / máxima',
  'hzW.starlightAtClosestFurthest':
    'Luz estelar en el punto más cercano / más lejano',
  'hzW.rightNowThePlanetIs': 'Ahora mismo el planeta está',
  'hzW.fractionOfTheYearInside': 'Fracción del año dentro de la zona',
  'hzW.trappist1AllSevenPlanets': 'TRAPPIST-1, los siete planetas',
  'hzW.zoneDefinition': 'Definición de la zona',
  'hzW.habitableZone': 'Zona habitable',
  'hzW.mercury': 'Mercurio',
  'hzW.venus': 'Venus',
  'hzW.earth': 'La Tierra',
  'hzW.planetA': 'Planeta A',
  'hzW.planetB': 'Planeta B',
  'hzW.planetC': 'Planeta C',
  'hzW.threePlanetsSimilarStarlight': 'Tres planetas, luz estelar parecida',
  'hzW.showing': 'Mostrando',
  'transitW.howBigAShadow': '¿Cómo de grande es la sombra?',
  'transitW.theSilhouetteOnTheLeft':
    'La silueta de la izquierda está dibujada a escala. La curva de la derecha es el tránsito que produce.',
  'transitW.planetRadius': 'Radio del planeta',
  'transitW.starRadius': 'Radio de la estrella',
  'transitW.earthSun': 'Tierra, Sol',
  'transitW.neptuneSun': 'Neptuno, Sol',
  'transitW.jupiterSun': 'Júpiter, Sol',
  'transitW.earthTrappist1': 'Tierra, TRAPPIST-1',
  'transitW.jupiterRedGiant': 'Júpiter, gigante roja',
  'transitW.radiusRatioRSubP':
    'Cociente de radios R<sub>p</sub> / R<sub>★</sub>',
  'transitW.transitDepthRSubP':
    'Profundidad del tránsito (R<sub>p</sub> / R<sub>★</sub>)²',
  'transitW.sameDepthInSurveyUnits':
    'La misma profundidad en unidades de sondeo',
  'transitW.photometryNeeded': 'Fotometría necesaria',
  'transitW.theAngleYouHappenTo': 'El ángulo en el que resulta que estás',
  'transitW.theChordIsThePath':
    'La cuerda es el camino que recorre el planeta por el disco. Desliza el parámetro de impacto hasta que falle.',
  'transitW.impactParameterB': 'Parámetro de impacto b',
  'transitW.orbitSizeAR': 'Tamaño de la órbita a / R★',
  'transitW.radiusRatioRpR': 'Cociente de radios Rp / R★',
  'transitW.deadCenter': 'Justo el centro',
  'transitW.grazing': 'Rasante',
  'transitW.missedEntirely': 'Fallado por completo',
  'transitW.earthAroundTheSun': 'La Tierra alrededor del Sol',
  'transitW.orbitalInclinationI': 'Inclinación orbital i',
  'transitW.doesItTransit': '¿Transita?',
  'transitW.depthAtMidTransit': 'Profundidad a mitad del tránsito',
  'transitW.durationAsAFractionOf': 'Duración, como fracción de la órbita',
  'transitW.chanceARandomObserverSees':
    'Probabilidad de que un observador al azar lo vea',
  'transitW.carbonMonoxide': 'monóxido de carbono',
  'transitW.carbonDioxide': 'dióxido de carbono',
  'transitW.thePlanetChangesSizeWith':
    'El planeta cambia de tamaño con el color',
  'transitW.wavelength': 'Longitud de onda',
  'transitW.cloudAndHazeCover': 'Cobertura de nubes y bruma',
  'transitW.scaleHeight': 'Altura de escala',
  'transitW.sodium0589M': 'Sodio, 0,589 μm',
  'transitW.water14M': 'Agua, 1,4 μm',
  'transitW.theBandHubbleSInfrared':
    'La banda que la cámara infrarroja del Hubble hizo rutinaria, y el caballo de batalla de la caracterización atmosférica antes del JWST.',
  'transitW.carbonDioxide43M': 'Dióxido de carbono, 4,3 μm',
  'transitW.aCloudyPlanet': 'Un planeta nuboso',
  'transitW.transitDepth': 'Profundidad del tránsito',
  'transitW.depthAboveTheBareRock':
    'Profundidad por encima del continuo de roca desnuda',
  'transitW.apparentPlanetRadius': 'Radio aparente del planeta',
  'transitW.whatIsAbsorbing': 'Qué está absorbiendo',
  'transitW.aStarYouDidNot': 'Una estrella que no sabías que estaba ahí',
  'transitW.companionContrastM': 'Contraste de la compañera Δm',
  'transitW.radiusYouMeasured': 'Radio que mediste',
  'transitW.equalTwinM0': 'Gemela idéntica, Δm = 0',
  'transitW.theLessonSBinaryM': 'La binaria de la lección, Δm = 0,5',
  'transitW.theCompanionInTheBlended':
    'La compañera del escenario de la binaria mezclada. Aporta el 39 % de la luz y encoge el planeta medido un 22 %.',
  'transitW.roboAoMedianM3': 'Mediana de Robo-AO, Δm = 3',
  'transitW.faintNeighborM6': 'Vecina tenue, Δm = 6',
  'transitW.fluxRatioFSub2': 'Cociente de flujos F<sub>2</sub> / F<sub>1</sub>',
  'transitW.shareOfTheLightFrom': 'Parte de la luz que viene de la vecina',
  'transitW.radiusCorrection1FSub':
    'Corrección del radio √(1 + F<sub>2</sub>/F<sub>1</sub>)',
  'transitW.truePlanetRadius': 'Radio real del planeta',
  'transitW.wasItRocky': '¿Era rocoso?',
  'transitW.whyNobodyNoticed': 'Por qué nadie se dio cuenta',
  'transitW.imageResolution': 'Resolución de la imagen',
  'transitW.fwhm': '″ FWHM',
  'transitW.companionSeparation': 'Separación de la compañera',
  'transitW.ordinarySeeing': 'Seeing corriente',
  'transitW.roboAoPalomar': 'Robo-AO, Palomar',
  'transitW.soarSpeckle41M': 'Moteado de SOAR, 4,1 m',
  'transitW.aHardCase': 'Un caso difícil',
  'transitW.separationInUnitsOfThe': 'Separación, en unidades de la resolución',
  'transitW.howThePairLooks': 'Qué aspecto tiene el par',
  'transitW.lightFromTheCompanion': 'Luz procedente de la compañera',
  'transitW.radiusCorrectionItImplies': 'Corrección de radio que implica',
  'transitW.thisFrameAsAShare':
    'Este encuadre, como fracción de un píxel de TESS',
  'energyChart.kineticEnergy': 'Energía cinética',
  'energyChart.potentialEnergy': 'Energía potencial',
  'energyChart.totalEnergy': 'Energía total',

  // --- Tidal comparison table ------------------------------------------------
  'tideP.moonOnEarth': 'la Luna, sobre la Tierra',
  'tideP.sunOnEarth': 'el Sol, sobre la Tierra',
  'tideP.earthOnMoon': 'la Tierra, sobre la Luna',
  'tideP.jupiterOnIo': 'Júpiter, sobre Ío',
  'tideP.starOnHotJupiter':
    'una estrella parecida al Sol, sobre un júpiter caliente a 0,05 UA',
  'tideP.bhOnSunFar': 'un agujero negro de 10 M☉, sobre el Sol a una UA',
  'tideP.bhOnSunNear':
    'el mismo agujero negro, sobre el Sol a tres millones de km',

  // --- Lesson panel chrome ---------------------------------------------------
  'inv.step.counter': 'Paso {n} de {total}',
  'inv.step.kind.read': 'lectura',
  'inv.step.kind.predict': 'predicción',
  'inv.step.kind.explore': 'exploración',
  'inv.step.kind.measure': 'medida',
  'inv.step.kind.question': 'pregunta',
  'inv.step.kind.ellipse': 'exploración',
  'inv.step.kind.wedges': 'exploración',
  'inv.action.restart': 'Reiniciar',
  'inv.action.restart.hint':
    'Borrar todas las respuestas y volver a empezar esta lección',
  'inv.action.back': 'Atrás',
  'inv.action.back.hint': 'Paso anterior (Mayús + flecha izquierda)',
  'inv.probe.title': 'Lectura en vivo',
  'objectType.stars': 'Añadir estrellas',

  // --- Words a lesson computes ----------------------------------------------
  // Probe rows and answer-checking messages come out of functions inside the
  // lesson files, which a translation shadow cannot reach. js/i18n/lesson.js
  // looks them up by what they say. See that file.
  'lessonFn.distancesHaveToBePositiveNumbers38':
    'Las distancias tienen que ser números positivos.',
  'lessonFn.closestApproachIsLargerThanFurthest70':
    'El máximo acercamiento es mayor que la distancia máxima: parecen intercambiados.',
  'lessonFn.eccentric9': 'Excéntrico',
  'lessonFn.semiMajorAxis15': 'semieje mayor',
  'lessonFn.clickAPlanetToSelectIt27': 'Pulsa un planeta para seleccionarlo',
  'lessonFn.body4': 'Cuerpo',
  'lessonFn.noOrbitFound14': 'no se encontró órbita',
  'lessonFn.selected8': 'Seleccionado',
  'lessonFn.eccentricityE14': 'Excentricidad e',
  'lessonFn.closestPeriapsis19': 'Mínima (periastro)',
  'lessonFn.furthestApoapsis19': 'Máxima (apoastro)',
  'lessonFn.currentSpeed13': 'Velocidad actual',
  'lessonFn.selectTheEccentricOrbiter28': 'Selecciona el Orbitador Excéntrico',
  'lessonFn.distanceFromStar18': 'Distancia a la estrella',
  'lessonFn.speedNow9': 'Velocidad ahora',
  'lessonFn.speedsHaveToBePositiveRead77':
    'Las velocidades tienen que ser positivas. Lee el valor «Velocidad ahora», que es un módulo.',
  'lessonFn.yourClosestSpeedIsLowerThan181':
    'Tu velocidad «mínima» es menor que tu velocidad «máxima». Eso está al revés para cualquier órbita ligada. Comprueba qué lectura tomaste dónde, usando la distancia para distinguirlas.',
  'lessonFn.selectAPlanet15': 'Selecciona un planeta',
  'lessonFn.atAnExtreme14': '¿En un extremo?',
  'lessonFn.closestReadNow17': 'mínima: lee ahora',
  'lessonFn.furthestReadNow18': 'máxima: lee ahora',
  'lessonFn.inBetween10': 'en medio',
  'lessonFn.closestThisOrbit18': 'Mínima en esta órbita',
  'lessonFn.furthestThisOrbit19': 'Máxima en esta órbita',
  'lessonFn.planet6': 'Planeta',
  'lessonFn.distancesAndPeriodsMustBothBe44':
    'Las distancias y los periodos tienen que ser positivos.',
  'lessonFn.clickAPlanetToMeasureIt28': 'Pulsa un planeta para medirlo',
  'lessonFn.bothValuesMustBePositive29':
    'Ambos valores tienen que ser positivos.',
  'lessonFn.clickAPlanetToReRead28': 'Pulsa un planeta para volver a leerlo',
  'lessonFn.clickAPlanet14': 'Pulsa un planeta',
  'lessonFn.noOrbit8': 'sin órbita',
  'lessonFn.tooHigh8': 'demasiado alto',
  'lessonFn.checkThatAAndPCame45':
    'Comprueba que a y P vinieron del mismo planeta.',
  'lessonFn.theSemiMajorAxisLooksToo112':
    'El semieje mayor parece demasiado grande. Todas las órbitas de aquí están por debajo de 0,07 UA, así que el valor debería empezar por 0,0 algo.',
  'lessonFn.thePeriodLooksTooSmallFor119':
    'El periodo parece demasiado pequeño para estar en días. La lectura da días, y el año más corto de este sistema es de unos 1,5.',
  'lessonFn.thePeriodLooksTooLargeFor79':
    'El periodo parece demasiado grande para estar en días. El año más largo de aquí es de unos 19.',
  'lessonFn.outByMoreThanAFactor97':
    'Se desvía en más de un factor tres, lo que suele significar que a y P se leyeron de planetas distintos.',
  'lessonFn.clickAPlanetToReadIt25': 'Pulsa un planeta para leerlo',
  'lessonFn.notFound9': 'no encontrado',
  'lessonFn.referenceFrame15': 'Sistema de referencia',
  'lessonFn.worldNotSwitchedYet23': 'Mundo, todavía sin cambiar',
  'lessonFn.marsDistanceFromEarth25': 'Marte: distancia a la Tierra',
  'lessonFn.marsDirectionFromEarth26': 'Marte: dirección desde la Tierra',
  'lessonFn.selectMars11': 'Selecciona Marte',
  'lessonFn.world5': 'Mundo',
  'lessonFn.aBody6': 'Un cuerpo',
  'lessonFn.sunDistanceFromEarth24': 'Sol: distancia a la Tierra',
  'lessonFn.sunDirectionFromEarth25': 'Sol: dirección desde la Tierra',
  'lessonFn.baselineOutOfTransit24': 'Línea de base, fuera del tránsito',
  'lessonFn.completeTransitsRecorded26': 'Tránsitos completos registrados',
  'lessonFn.waitingForACompleteTransit30': 'Esperando un tránsito completo',
  'lessonFn.clock5': 'Reloj',
  'lessonFn.theBottomOfATransitSits137':
    'El fondo de un tránsito queda <em>por debajo</em> de la línea de base, así que la profundidad tiene que salir positiva. Comprueba que no los hayas intercambiado.',
  'lessonFn.a20DipWouldBeA153':
    'Una caída del 20 % sería un eclipse estelar, no un planeta. Si has introducido números como 98,2 y 100, introduce el brillo en sí y no un porcentaje de él.',
  'lessonFn.thatIsShallowerThanThisSystem156':
    'Eso es menos profundo de lo que este sistema puede producir. Asegúrate de que el valor del fondo viene de verdad del punto más bajo de una caída y no del hombro de entrada.',
  'lessonFn.goodAbout18GivingA152':
    'Bien: alrededor del 1,8 %, lo que da un cociente de radios cercano a 0,135. Quédate con ese número, porque el paso siguiente va a decirte que es un 10 % demasiado grande, y por qué.',
  'lessonFn.expectedSomewhereNear0018For153':
    'Se esperaba algo cercano a 0,018 para este sistema. Lee la línea de base en un tramo plano bien alejado de cualquier caída, y el fondo en el punto más bajo de una.',
  'lessonFn.theStarRadiusGoesInSolar93':
    'El radio de la estrella va en radios solares, no en kilómetros ni en júpiteres. HD 209458 es 1,155 R☉.',
  'lessonFn.theDepthIsAFractionNot65':
    'La profundidad es una fracción, no un porcentaje: 1,8 % se introduce como 0,018.',
  'lessonFn.thatIsItAbout138218':
    'Eso es: unos 1,38 radios de Júpiter, o 15,5 radios terrestres. El valor publicado tras una década de tránsitos del Hubble es 1,38 R_Júpiter. Acabas de medir un planeta a 160 años luz observando cómo una estrella se atenuaba levemente.',
  'lessonFn.tooLargeCheckThatYouDivided170':
    'Demasiado grande. Comprueba que dividiste la profundidad entre 1,215 antes de tomar la raíz cuadrada y no después, y que la profundidad es la que mediste y no un porcentaje.',
  'lessonFn.tooSmallTheMostCommonCause121':
    'Demasiado pequeño. La causa más común es leer el fondo de la caída en el hombro de entrada en lugar de en el punto más bajo.',
  'lessonFn.theSecondStampHasToCome78':
    'La segunda marca tiene que ir después de la primera. Intercámbialas, o toma un par nuevo.',
  'lessonFn.atLeastOneOrbitHasTo52':
    'Tiene que pasar al menos una órbita entre dos tránsitos.',
  'lessonFn.countTheGapsBetweenTheTransits65':
    'Cuenta los huecos entre los tránsitos, no los tránsitos en sí.',
  'lessonFn.about35DaysThePublished138':
    'Unos 3,5 días. El periodo publicado de HD 209458 b es de 3,5247 días, conocido con precisión mejor que una décima de segundo tras dos décadas de tránsitos.',
  'lessonFn.thatIsTwiceThePeriodA113':
    'Eso es el doble del periodo: entre tus dos marcas pasó un tránsito que no se contó. Pon 2 en la casilla de órbitas.',
  'lessonFn.thatIsAboutHalfThePeriod166':
    'Eso es aproximadamente la mitad del periodo. Comprueba que ambas marcas se tomaron en el fondo de un tránsito y no una en un tránsito y otra en el eclipse secundario que hay en medio.',
  'lessonFn.expectedSomethingNear35Days131':
    'Se esperaba algo cercano a 3,5 días. Comprueba que el número de órbitas coincide con la diferencia entre los dos números de tránsito de la lectura.',
  'lessonFn.thePeriodGoesInDaysNot102':
    'El periodo va en días, no en años. Tres días y medio, no tres milésimas y media de año.',
  'lessonFn.theMassGoesInSolarMasses58':
    'La masa va en masas solares. HD 209458 tiene 1,148 de ellas.',
  'lessonFn.about0047AuOneEighth372':
    'Unas 0,047 UA: una octava parte de la distancia de Mercurio al Sol, y a unos nueve radios estelares. A 1450 K el lado diurno del planeta está lo bastante caliente para brillar con un rojo apagado por sí mismo. Nada de la teoría de formación planetaria anterior a 1995 ponía allí un gigante gaseoso, y averiguar cómo llegó sigue siendo una discusión activa entre la migración por el disco y la dispersión por otros planetas.',
  'lessonFn.expectedRoughly0047AuCheck84':
    'Se esperaban unas 0,047 UA. Comprueba que el periodo esté en días y la masa en masas solares.',
  'lessonFn.bothDepthsAreFractionsNotPercentages66':
    'Ambas profundidades son fracciones, no porcentajes: 1,1 % se introduce como 0,011.',
  'lessonFn.theBlendedDepthHasToBe110':
    'La profundidad mezclada tiene que ser la <em>menos</em> profunda de las dos. Comprueba que no las hayas puesto en las casillas equivocadas.',
  'lessonFn.thatIsTheResultTheBlended291':
    'Ese es el resultado. La curva mezclada dice unos 12 radios terrestres; la corrección de aproximadamente ×1,28 lo devuelve a unos 15,5, que son los 1,38 radios de Júpiter que mediste antes de que estuviera la compañera. El contraste implicado debería caer cerca de Δm = 0,5, que es lo que la compañera es en realidad.',
  'lessonFn.theRatioIsLargerThanThis135':
    'El cociente es mayor de lo que esta compañera puede producir. Vuelve a leer la profundidad mezclada: debería estar cerca de 0,011, no cerca de la mitad del valor limpio.',
  'lessonFn.expectedARatioNear163135':
    'Se esperaba un cociente cercano a 1,63 y un radio corregido cercano a 15,5 R⊕. Comprueba que ambas profundidades vinieron del fondo de una caída y no de un hombro.',
  'lessonFn.clickABodyInTheSimulation30': 'Pulsa un cuerpo en la simulación',
  'lessonFn.nothingToOrbit16': 'nada que orbitar',
  'lessonFn.distanceFromTheStar22': 'Distancia a la estrella',
  'lessonFn.speed5': 'Velocidad',
  'lessonFn.totalEnergy12': 'Energía total',
  'lessonFn.belowZero10': 'por debajo de cero',
  'lessonFn.aboveZero10': 'por encima de cero',
  'lessonFn.boundOrUnbound16': 'Ligado o no ligado',
  'lessonFn.boundItComesBack20': 'ligado: vuelve',
  'lessonFn.unboundItIsLeaving22': 'no ligado: se marcha',
  'lessonFn.furthestItGets16': 'hasta dónde llega',
  'lessonFn.forThisPracticeRunPut293':
    'Para este ensayo, pon 2 en ambas casillas. Después puedes experimentar con otros números.',
  'lessonFn.222Is8And204':
    '2 × 2 × 2 es 8, y 2 × 2 es 4, y 8 dividido entre 4 es 2. El par pesa <strong>2 masas solares</strong> entre los dos. Nadie fue hasta allí. Nadie pesó nada. Dos medidas de una órbita bastaron.',
  'lessonFn.bothMeasurementsHaveToBePositive46':
    'Ambas medidas tienen que ser números positivos.',
  'lessonFn.thatLooksLikeOneStarS187':
    'Eso parece la distancia de una estrella al punto de equilibrio y no la órbita entera. El tamaño de la órbita se mide de una estrella <em>a la otra</em>: suma ambas distancias.',
  'lessonFn.checkTheOrbitSizeAgainstThe137':
    'Comprueba el tamaño de la órbita con los anillos. La Estrella A está en un anillo y la Estrella B en otro, y el número que quieres es la suma de los dos.',
  'lessonFn.checkThePeriodTimeStarA106':
    'Comprueba el periodo. Cronometra la Estrella A desde la línea de puntos hasta que vuelva a cruzar la misma línea.',
  'lessonFn.youHaveThemTheWrongWay130':
    'Los tienes al revés. La Estrella A es la que se queda cerca del punto de equilibrio, lo que la convierte en la más pesada de las dos.',
  'lessonFn.threeSolarMassesAndOneSolar125':
    'Tres masas solares y una masa solar. Acabas de pesar dos estrellas individuales, por separado, usando una regla y un cronómetro.',
  'lessonFn.theTwoAddUpCorrectlyBut126':
    'Los dos suman correctamente, pero no en una proporción de tres a uno. Cuenta los bloques: tres del lado de la Estrella A por cada uno del lado de la Estrella B.',
  'lessonFn.put3InBothBoxesThe65':
    'Pon 3 en ambas casillas: el par está a 3 UA con un periodo de 3 años.',
  'lessonFn.333Is27And102':
    '3 × 3 × 3 es 27, y 3 × 3 es 9, y 27 dividido entre 9 es 3. Tres masas solares entre las dos.',
  'lessonFn.isProportionalTo18': 'es proporcional a',
  'lessonFn.howConcentratedIsThisThingOn63':
    'cómo de concentrada está esta cosa, a la escala de su propio horizonte',
  'lessonFn.whatEarthGets15': 'lo que recibe la Tierra',
  'lessonFn.distancesAndStarlightAreBothPositive50':
    'Las distancias y la luz estelar son ambas números positivos.',
  'lessonFn.theseDoNotAllSitOn114':
    'No todos caen sobre la misma relación. Comprueba que cada valor de luz estelar se leyó a la distancia que tiene al lado.',
  'lessonFn.everyOneOfYourReadingsSatisfies123':
    'Todas tus lecturas cumplen luz estelar × distancia × distancia = 1. Ese es el patrón, ya en tus propios números.',
  'lessonFn.thoseMatchNowSayItIn298':
    'Coinciden. Ahora dilo con palabras, y dilo con cuidado: e, f y g están dentro de la zona habitable modelada. Eso es una afirmación sobre sus órbitas y su estrella, y es lo correcto que decir. No es una afirmación de que ninguno de ellos tenga agua, atmósfera, o una superficie que nadie reconocería.',
  'lessonFn.rotationCurve14': 'Curva de rotación',
  'lessonFn.openThePanel14': 'abre el panel',
  'lessonFn.bodiesPlotted14': 'Cuerpos representados',
  'lessonFn.innermost9': 'El más interior',
  'lessonFn.outermost9': 'El más exterior',
  'lessonFn.fittedSlope12': 'Pendiente ajustada',
  'lessonFn.proportionalToRadius22': 'proporcional al radio',
  'lessonFn.halo4': 'Halo',
  'lessonFn.outermostStar14': 'Estrella más exterior',
  'lessonFn.slope5': 'Pendiente',
  'lessonFn.luna4': 'Luna',
  'lessonFn.bodiesOnScreen16': 'Cuerpos en pantalla',
  'lessonFn.earthAndTheMoon19': 'la Tierra y la Luna',
  'lessonFn.moonSDistanceNow19': 'Distancia de la Luna ahora',
  'lessonFn.buildingTheSystem20': 'construyendo el sistema…',
  'lessonFn.realSeparation15': 'Separación real',
  'lessonFn.384400KmOnAverage22': '384 400 km, en promedio',
  'lessonFn.distancesAndTidalStrengthsAreBoth56':
    'Las distancias y las intensidades de marea son ambas números positivos.',
  'lessonFn.theseDoNotAllSitOn185':
    'No todos caen sobre una misma relación. La causa habitual es una intensidad leída a una distancia distinta de la que tiene al lado: comprueba cada fila con la posición del deslizador que la produjo.',
  'lessonFn.massesAndTidalStrengthsAreBoth53':
    'Las masas y las intensidades de marea son ambas números positivos.',
  'lessonFn.stretchMassIsNotComingOut190':
    'Estiramiento ÷ masa no sale igual en todas las filas. Comprueba que el deslizador de distancia se quedó quieto mientras cambiabas la masa: mover ambos a la vez oculta la relación que buscas.',
  'lessonFn.bodiesBeingTracked20': 'Cuerpos seguidos',
  'lessonFn.whatIsSimulated17': 'Qué se simula',
  'lessonFn.newtonianGravityBetweenPointMasses38':
    'Gravedad newtoniana entre masas puntuales',
  'lessonFn.whatIsNot11': 'Qué no',
  'lessonFn.fluidFlowPressureRadiation31':
    'Flujo de fluidos, presión, radiación',

  // --- Answer feedback -------------------------------------------------------
  'inv.answer.matches': 'Eso coincide.',
  'inv.answer.notYet':
    'Todavía no. Revisa tu razonamiento e inténtalo de nuevo.',
  'inv.answer.oneGood': 'Una buena respuesta:',
  'inv.answer.placeholder': 'Tu valor',
  'inv.answer.check': 'Comprobar',
};
