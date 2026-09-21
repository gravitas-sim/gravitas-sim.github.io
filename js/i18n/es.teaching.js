// =============================================================================
// The showcase page's words, in Spanish
// -----------------------------------------------------------------------------
// A shadow of js/i18n/en.teaching.js: the same ids, the same order, and nothing
// else. tests/teaching.test.js fails if the two key sets differ, which is what
// stops a string added on one side from reaching the page untranslated.
//
// The rules in the English file's header apply here in full, and one of them is
// worth restating because it is easy to lose in translation: this page may say
// what the software does and may not say what it achieves.
// =============================================================================

import { ES_ACTIVITIES } from './es.activities.js';

export const ES_TEACHING = {
  ...ES_ACTIVITIES,
  'teach.title': 'Enseñar con Gravitas',
  'teach.meta.description':
    'Cómo se usa Gravitas en un curso introductorio de astronomía: investigaciones guiadas, un cuaderno de evidencia, experimentos controlados y seis demostraciones que puede ejecutar en esta página.',
  'teach.nav.simulation': 'Simulación',
  'teach.nav.model': 'El modelo',
  'teach.nav.validation': 'Validación',
  'teach.nav.teaching': 'Enseñanza',
  'teach.nav.instructors': 'Docentes',
  'teach.skip': 'Saltar al contenido',
  'teach.eyebrow': 'Para docentes y quienes evalúan adoptarlo',
  'teach.lede':
    'Gravitas es un simulador gravitacional que funciona en el navegador y está hecho para enseñar. El estudiantado no mira la demostración de un resultado: lo predice, lo ejecuta, lo mide y escribe lo que encontró. Esta página muestra cómo funciona eso, qué cuesta adoptarlo y dónde comprobar la física.',

  // --- Language --------------------------------------------------------------
  'teach.lang.label': 'Idioma',
  'teach.lang.en': 'English',
  'teach.lang.es': 'Español',
  'teach.lang.switched': 'El idioma de la página cambió a español.',

  // --- At a glance -----------------------------------------------------------
  'teach.glance.investigations': 'Investigaciones guiadas',
  'teach.glance.graded': 'Pasos que se califican',
  'teach.glance.graded.value': '{graded} de {total}',
  'teach.glance.scenarios': 'Escenarios incluidos',
  'teach.glance.checks': 'Comprobaciones de física superadas',
  'teach.glance.checks.value': '{passed} de {total}',
  'teach.glance.cost': 'Costo, cuentas, instalación',
  'teach.glance.cost.value': 'Ninguno, ninguna, ninguna',
  'teach.glance.languages': 'Idiomas de la interfaz',
  'teach.glance.note':
    'Cada número de esta página se lee del catálogo y de los resultados de validación al cargar. Ninguno está escrito a mano.',

  // --- Contents --------------------------------------------------------------
  'teach.toc': 'En esta página',
  'teach.section.cycle': 'El ciclo que recorre el estudiantado',
  'teach.section.journey': 'De una predicción a un informe entregado',
  'teach.section.instruments': 'Para qué sirve cada instrumento',
  'teach.section.demos': 'Seis demostraciones que puede ejecutar aquí',
  'teach.section.patterns': 'Cinco maneras de usarlo en un curso',
  'teach.section.access': 'Acceso, idioma y reproducibilidad',
  'teach.section.evidence': 'Dónde comprobar la física',

  // --- The cycle -------------------------------------------------------------
  'teach.cycle.intro':
    'Toda investigación se apoya en los mismos cinco movimientos, y la interfaz impone el orden: la predicción se registra antes de que exista la evidencia, y después no se puede editar. Quien se equivocó sigue teniendo su respuesta a la vista cuando llega la medición, que es el momento del que trata realmente la lección.',
  'teach.cycle.predict.verb': 'Predecir',
  'teach.cycle.predict.student':
    'Comprometerse con una respuesta antes de que algo se ejecute: en una frase, un número o una elección entre resultados esbozados.',
  'teach.cycle.predict.tool':
    'Los pasos de predicción se guardan con un identificador de paso permanente y quedan bloqueados al enviarse. Pasos posteriores pueden citar la predicción textualmente.',
  'teach.cycle.test.verb': 'Probar',
  'teach.cycle.test.student':
    'Montar el sistema y ejecutarlo, o cambiar exactamente una cosa y ejecutarlo dos veces.',
  'teach.cycle.test.tool':
    'Un paso puede fijar por sí mismo el escenario, la semilla y los ajustes, de modo que veinte estudiantes parten del mundo idéntico y no de veinte intentos con el mismo control deslizante.',
  'teach.cycle.measure.verb': 'Medir',
  'teach.cycle.measure.student':
    'Leer un número de la simulación con una regla, un transportador, un cronómetro, una curva de luz o una gráfica de velocidad.',
  'teach.cycle.measure.tool':
    'Cada medición lleva su propia procedencia: qué integrador, qué paso temporal, qué marco de referencia y en qué tiempo simulado.',
  'teach.cycle.revise.verb': 'Revisar',
  'teach.cycle.revise.student':
    'Comparar la medición con la predicción y decir cuál de las dos tiene que cambiar, y por qué.',
  'teach.cycle.revise.tool':
    'La predicción original se muestra junto al resultado. Nada la sobrescribe, y una predicción equivocada se conserva en lugar de reemplazarse en silencio.',
  'teach.cycle.explain.verb': 'Explicar',
  'teach.cycle.explain.student':
    'Escribir el relato: qué se midió, bajo qué condiciones y qué establece y qué no.',
  'teach.cycle.explain.tool':
    'El cuaderno de evidencia arma con la ejecución un informe con sus números, sus ajustes y sus salvedades adjuntos.',

  // --- The journey -----------------------------------------------------------
  'teach.journey.intro':
    'Es el mismo ciclo visto desde el lado del estudiantado: las cinco cosas que ocurren realmente entre abrir un enlace y entregar algo.',
  'teach.journey.open.title': 'Abre un enlace',
  'teach.journey.open.text':
    'Un enlace de Gravitas lleva el mundo entero en la barra de direcciones: escenario, semilla, ajustes, cámara y reloj. No hay cuenta que crear, nada que instalar y nada que subir. Pegue el enlace en una página del campus virtual y todo el mundo que lo siga obtendrá el sistema idéntico.',
  'teach.journey.predict.title': 'Registra una predicción',
  'teach.journey.predict.text':
    'La lección pregunta primero y muestra después. Las predicciones se responden en la página y se guardan en el navegador con identificadores de paso que no cambian cuando se edita la lección, así que revisarla a mitad de semestre no descarta el trabajo ya hecho.',
  'teach.journey.evidence.title': 'Genera evidencia',
  'teach.journey.evidence.text':
    'Ejecuta el sistema, lo pausa en un evento, lo mide, corre una comparación A/B controlada o barre un parámetro por unos pocos valores. Cada una de esas cosas produce números y no impresiones.',
  'teach.journey.notebook.title': 'Lo captura en el cuaderno',
  'teach.journey.notebook.text':
    'Una captura toma la medición junto con las condiciones que la produjeron — integrador, paso temporal, subpasos, marco, geometría del observador, tiempo simulado, semilla del mundo — como una sola entrada atómica. Una entrada no puede quedar a medio escribir.',
  'teach.journey.submit.title': 'Entrega un informe',
  'teach.journey.submit.text':
    'El cuaderno exporta un informe en PDF o CSV, con las entradas, su procedencia y las limitaciones de la ejecución declaradas dentro. Quien prefiera una unidad de trabajo más pequeña puede recortar una tarea corta de cualquier lección con el constructor de tareas y obtener la misma exportación.',

  // --- Instruments -----------------------------------------------------------
  'teach.instruments.intro':
    'Estas son las piezas entre las que elige un docente. Cada una existe para hacer posible, para alguien de primer año, una pieza concreta de la práctica científica.',
  'teach.instruments.investigations.name': 'Investigaciones guiadas',
  'teach.instruments.investigations.text':
    'Lecciones de varios pasos que montan sus propios mundos. Los pasos están numerados, se califican cuando tienen una respuesta correcta y llevan objetivos de aprendizaje. Los prerrequisitos entre lecciones se declaran en vez de suponerse.',
  'teach.instruments.notebook.name': 'El cuaderno de evidencia',
  'teach.instruments.notebook.text':
    'Un registro continuo de qué midió el estudiantado y bajo qué condiciones. Es la diferencia entre «la órbita parecía estable» y una tabla de separaciones con el paso temporal que las produjo.',
  'teach.instruments.experiments.name': 'Experimentos A/B',
  'teach.instruments.experiments.text':
    'Dos ejecuciones sobre el mismo intervalo de tiempo simulado, que difieren en exactamente una variable, con la diferencia reportada en lugar de estimada a ojo. El estudiantado conoce la comparación controlada en un sistema donde mantener fijo todo lo demás sí es posible.',
  'teach.instruments.sweeps.name': 'Barridos de parámetros',
  'teach.instruments.sweeps.text':
    'La misma medición repetida sobre una serie corta de valores de un parámetro, tabulada. Aquí es donde una relación deja de ser una anécdota y pasa a ser una tendencia que se puede describir.',
  'teach.instruments.pause.name': 'Pausa en un evento',
  'teach.instruments.pause.text':
    'Detenerse en el máximo acercamiento, en un tránsito, en el cruce de un nodo. El momento que vale la pena discutir suele ser el más difícil de atrapar a mano, y una clase no puede hablar de un fotograma que ya pasó.',
  'teach.instruments.reliability.name': 'Comprobaciones de fiabilidad numérica',
  'teach.instruments.reliability.text':
    'Repetir la misma medición con un paso temporal menor o con otro integrador y ver si la respuesta se mueve. Un resultado que cambia al reducir el paso a la mitad es un resultado sobre la aritmética, y se le enseña al estudiantado a distinguir una cosa de la otra.',
  'teach.instruments.stellarLab.name': 'El laboratorio estelar',
  'teach.instruments.stellarLab.text':
    'Un diagrama H-R con ocho trazas evolutivas publicadas de MIST, un escenario de comparación que dibuja las estrellas fijadas a tamaños relativos reales y una población sintética reproducible. Es donde se imparten «Un universo de estrellas» y «Vidas de las estrellas», y mantiene separadas dos cosas que el alumnado confunde: una estrella modelada, que tiene masa y edad, y un punto del diagrama, que tiene radio y nada más.',
  'teach.instruments.uncertainty.name': 'Análisis de incertidumbre',
  'teach.instruments.uncertainty.text':
    'Las mediciones vienen con la dispersión que las produjo, y los ajustes reportan sus parámetros con intervalos en lugar de como números sueltos. Se le pregunta al estudiantado hasta dónde vale su número, no solo cuál es.',
  'teach.instruments.more': 'Cómo se calcula esto',

  // --- Demonstrations --------------------------------------------------------
  'teach.demos.intro':
    'Cada demostración de abajo abre un estado real y reproducible de Gravitas —el mismo tipo de enlace que produce el diálogo de compartir— como una figura interactiva. Se abren en pausa a propósito: la pregunta va antes que la evidencia. Pulse reproducir cuando la clase se haya comprometido con una respuesta.',
  'teach.demos.note':
    'Las figuras son la simulación misma, incrustada; no son un vídeo ni una animación. No se carga nada hasta que pulse Ejecutar, y cada una puede abrirse también a tamaño completo, donde están disponibles las herramientas de medición, el cuaderno y los ajustes.',
  'teach.demo.question': 'La pregunta, y la respuesta equivocada de siempre',
  'teach.demo.instructor': 'Qué hace usted',
  'teach.demo.predict': 'Qué predice la clase primero',
  'teach.demo.visible': 'Qué se vuelve visible',
  'teach.demo.run': 'Ejecutar aquí',
  'teach.demo.stop': 'Cerrar la figura',
  'teach.demo.open': 'Abrir a tamaño completo',
  'teach.demo.lesson': 'La investigación completa',
  // --- Actividades de clase ---------------------------------------------------
  'teach.activities.heading': 'Actividades de clase',
  'teach.activities.lede':
    'Formatos de enseñanza preparados, elegidos por lo que quieres que hagan los estudiantes y por el tiempo del que dispones. Cada uno abre una investigación real recortada a su duración: los mismos pasos, las mismas mediciones, las mismas pruebas en el cuaderno.',
  'teach.activities.vs.investigations':
    '¿Buscas el tema completo? Las investigaciones son las lecciones íntegras, y se pueden explorar por materia.',
  'teach.activities.browse': 'Ver todas las investigaciones',
  'teach.activities.fallback.activity':
    'No existe ninguna actividad de clase llamada «{id}». Estas son las que hay.',
  'teach.activities.fallback.format':
    'Esta actividad no tiene un formato «{id}». Estos son sus formatos.',
  'teach.activities.formats.heading': 'Formatos',
  'teach.activities.launch': 'Empezar',
  'teach.activities.launch.label': 'Empezar el formato {format} de {activity}',
  'teach.activities.instructor': 'Materiales para el profesorado',
  'teach.activities.instructor.note':
    'Notas para quien presenta, razonamiento esperado, ideas erróneas y una rúbrica. Separados de lo que ve el alumnado.',
  'teach.activities.fullLesson': 'Abrir la investigación completa',
  'teach.activities.audience': 'Para quién es',
  'teach.activities.prerequisites': 'Se da por sabido',
  'teach.activities.objectives': 'Al terminar, el alumnado sabrá',
  'teach.activities.estimate': 'Estimación: aún no cronometrada con una clase',

  'teach.demo.frameTitle': '{name}, ejecutándose en Gravitas',
  'teach.demo.meta':
    'Investigación completa: {duration} · {steps} pasos · {graded} calificados',
  'teach.demo.opened': 'La figura de {name} está cargada y en pausa.',
  'teach.demo.closed': 'Se cerró la figura de {name}.',
  'teach.demos.sequence': 'Copiar las seis como secuencia de clase',
  'teach.demos.sequence.note':
    'El modo Clase toma una lista de enlaces, uno por línea, y avanza por ellos con las flechas del teclado en un proyector. Esto copia estos seis en orden.',
  'teach.demos.sequence.done':
    'Se copiaron seis enlaces. Péguelos en el modo Clase.',
  'teach.demos.sequence.failed':
    'El portapapeles no estaba disponible. Los enlaces se listan abajo; cópielos a mano.',

  'teach.demo.retrograde.question':
    'Marte frena, se detiene e invierte su dirección en la órbita.',
  'teach.demo.retrograde.instructor':
    'Abra la figura con ambas órbitas dibujadas y los rastros activados, y pida a la clase que esboce la trayectoria de Marte vista desde la Tierra antes de que algo se mueva.',
  'teach.demo.retrograde.predict':
    '¿Marte realmente se invierte en el espacio, o hay otra cosa que produce el lazo?',
  'teach.demo.retrograde.visible':
    'Marte nunca se invierte. La Tierra, por el carril interior, lo adelanta, y la línea de visión gira hacia atrás durante unas semanas. El lazo está en la dirección en que miramos, no en el movimiento.',
  'teach.demo.assist.question':
    'Una asistencia gravitatoria crea energía: la gravedad del planeta le regala velocidad a la nave.',
  'teach.demo.assist.instructor':
    'Ejecute un solo sobrevuelo con los vectores de velocidad activados y lea las rapideces antes y después en el marco del planeta y en el de la estrella.',
  'teach.demo.assist.predict':
    'Tras el encuentro, ¿la nave va más rápido, más lento o igual? Pida una respuesta para cada marco por separado.',
  'teach.demo.assist.visible':
    'Su rapidez respecto al planeta es la misma al salir que al entrar; respecto a la estrella, no. La energía vino del planeta, que después va mediblemente más lento.',
  'teach.demo.chaos.question':
    'Un cambio diminuto en las condiciones iniciales produce una diferencia diminuta en el resultado.',
  'teach.demo.chaos.instructor':
    'Ejecute dos sistemas de tres cuerpos cuyas posiciones iniciales difieren en la cuarta cifra decimal, sobre el mismo intervalo de tiempo simulado.',
  'teach.demo.chaos.predict':
    '¿Cuánto tarda en verse la diferencia entre las dos trayectorias? Pida una votación a mano alzada en órbitas, no en segundos.',
  'teach.demo.chaos.visible':
    'La separación crece de forma aproximadamente exponencial, y lo sigue haciendo cuando se reduce el paso temporal a la mitad. Esa segunda parte es lo importante: la divergencia es la física, no la aritmética.',
  'teach.demo.rotation.question':
    'Las estrellas lejos del centro de una galaxia deben orbitar más despacio, como los planetas exteriores.',
  'teach.demo.rotation.instructor':
    'Muestre el disco con los vectores de velocidad activados y mida la rapidez orbital a varios radios.',
  'teach.demo.rotation.predict':
    'Esbocen la curva de rotación: rapidez frente a distancia al centro.',
  'teach.demo.rotation.visible':
    'La masa visible por sí sola predice una curva que cae. La medida no cae. Esa brecha es la observación que la materia oscura se propuso explicar, y la lección también ejecuta la alternativa de gravedad modificada.',
  'teach.demo.tides.question':
    'La Luna atrae el océano hacia sí, así que hay una sola marea alta, en el lado que mira a la Luna.',
  'teach.demo.tides.instructor':
    'Muestre el sistema Tierra–Luna y luego observe la diferencia entre la atracción de la Luna en el lado cercano, en el centro y en el lado lejano.',
  'teach.demo.tides.predict':
    '¿Cuántas mareas altas pasan por una costa dada en un día: una o dos?',
  'teach.demo.tides.visible':
    'Dos. Lo que levanta una marea es la diferencia de la atracción a lo largo de la Tierra, no la atracción misma, y una diferencia tiene dos extremos.',
  'teach.demo.transit.question':
    'Si no podemos ver el planeta, ¿cómo puede alguien afirmar que está ahí?',
  'teach.demo.transit.instructor':
    'Ejecute el tránsito con el reloj a la vista y observe cómo la curva de luz se construye sola mientras el planeta cruza.',
  'teach.demo.transit.predict':
    '¿Qué hace el brillo de la estrella, y en cuánto, para un planeta del tamaño de Júpiter que cruza una estrella del tamaño del Sol?',
  'teach.demo.transit.visible':
    'Una caída de alrededor del uno por ciento, que se repite. La profundidad da el cociente de los radios y el espaciado da el período, a partir de una medición de brillo y nada más.',

  // --- Course patterns -------------------------------------------------------
  'teach.patterns.intro':
    'Cinco formas en que esto se ha usado de verdad. Las lecciones nombradas en cada una se eligen al dibujar la página según la duración que cada lección declara, así que una lección que crece sale sola de la lista de espacios cortos.',
  'teach.patterns.fits': 'Hoy caben en este espacio',
  'teach.patterns.prep': 'Preparación',
  'teach.patterns.handin': 'Qué se entrega',
  'teach.patterns.none': 'Ahora mismo nada del catálogo cabe en este espacio.',
  'teach.pattern.lecture.title': 'Demostración en clase magistral',
  'teach.pattern.lecture.text':
    'Diez minutos dentro de una clase magistral. Pida una predicción, ejecute el estado en el proyector y deje que la medición lo zanje. El modo Clase agranda la tipografía, toma prestado el tema claro para que el negro del proyector no se trague la interfaz, y avanza por una lista preparada de enlaces con las flechas del teclado.',
  'teach.pattern.lecture.prep':
    'Pegue una lista de enlaces en el modo Clase una vez. Queda recordada en el navegador de esa máquina.',
  'teach.pattern.lecture.handin': 'Nada: esta es hablada.',
  'teach.pattern.activity.title': 'Una actividad corta en clase',
  'teach.pattern.activity.text':
    'De quince a veinticinco minutos en portátiles o teléfonos. Una investigación corta, o un puñado de pasos recortados de una más larga con el constructor de tareas, que termina en una medición y una frase.',
  'teach.pattern.activity.prep':
    'Construya la tarea una vez y reparta un enlace. Los prerrequisitos entre pasos se comprueban por usted.',
  'teach.pattern.activity.handin':
    'Un informe corto exportado del cuaderno, o un solo número con su incertidumbre.',
  'teach.pattern.homework.title': 'Tarea para casa',
  'teach.pattern.homework.text':
    'Una investigación completa, en solitario, al ritmo que sea. El progreso se guarda en el navegador, así que se puede parar a la mitad y volver. No se sube nada y no existe ninguna cuenta que perder.',
  'teach.pattern.homework.prep':
    'Publique el enlace de la lección. La guía docente y la clave de respuestas de cada investigación están en el área para docentes.',
  'teach.pattern.homework.handin':
    'El informe en PDF exportado, que lleva los pasos calificados y las condiciones bajo las que se hizo cada medición.',
  'teach.pattern.laboratory.title': 'Sesión de laboratorio',
  'teach.pattern.laboratory.text':
    'Una sesión de dos o tres horas construida sobre una investigación larga, con la comparación controlada y el barrido de parámetros hechos en serio y no salteados. Aquí es donde la comprobación de fiabilidad numérica se gana su lugar: el estudiantado repite su propio resultado con un paso temporal menor y averigua si sobrevive.',
  'teach.pattern.laboratory.prep':
    'Una máquina por pareja. Funciona en cualquier navegador actual, y sin conexión una vez visitada la página.',
  'teach.pattern.laboratory.handin':
    'Una exportación completa del cuaderno: la tabla del barrido, la comparación A/B, la comprobación de fiabilidad y un relato escrito de qué sostienen los números.',
  'teach.pattern.inquiry.title': 'Indagación abierta',
  'teach.pattern.inquiry.text':
    'Ninguna lección. El modo libre, la galería completa de escenarios y una pregunta elegida por la propia persona. Cada estado al que llegue es un enlace que puede enviarle, y eso es lo que hace calificable un proyecto abierto sin mirar por encima del hombro.',
  'teach.pattern.inquiry.prep':
    'Acuerden la pregunta. Pida el enlace del estado del que partieron y el del que llegaron.',
  'teach.pattern.inquiry.handin':
    'Dos enlaces y una exportación del cuaderno que, entre ellos, son un resultado reproducible.',

  // --- Access ----------------------------------------------------------------
  'teach.access.intro':
    'Lo que sigue describe lo que se ha construido y probado, no afirma nada sobre lo bien que le sirve a un lector concreto. Si algo de esto no funciona para su clase, es un defecto que vale la pena reportar.',
  'teach.access.keyboard.title': 'Teclado y lector de pantalla',
  'teach.access.keyboard.text':
    'La interfaz se opera desde el teclado, incluidas las lecciones, las herramientas de medición y los diálogos, que atrapan el foco y lo devuelven. Las mediciones y los cambios de estado se anuncian por una región activa, y el lienzo lleva una descripción textual de lo que hay en él que se actualiza según evoluciona el sistema. Comprobaciones automáticas (axe-core) y un conjunto de recorridos manuales por teclado se ejecutan en integración continua en cada cambio.',
  'teach.access.motion.title': 'Movimiento y tema',
  'teach.access.motion.text':
    'La animación de la interfaz respeta la preferencia de movimiento reducido del sistema operativo. Hay cuatro temas, incluido uno claro pensado para proyectores y uno oscuro de alto contraste. Nada de esta página se mueve hasta que usted lo pida.',
  'teach.access.language.title': 'Español',
  'teach.access.language.text':
    'La interfaz, el navegador de lecciones y todas las investigaciones están disponibles en español además de en inglés, incluido el texto de los pasos que el estudiantado lee y responde. El idioma se elige en la interfaz y se recuerda; el texto en español de las lecciones se descarga solo si se pide.',
  'teach.access.offline.title': 'Red, costo y privacidad',
  'teach.access.offline.text':
    'Es un sitio estático. No hay servidor, ni cuenta, ni inicio de sesión, ni analítica, ni subida de datos: las respuestas y las entradas del cuaderno se quedan en el navegador donde se hicieron. Una vez cargada la página, funciona sin conexión, lo que importa en un aula con wifi institucional. Es gratuito y tiene licencia MIT.',
  'teach.access.reproducible.title': 'Enlaces reproducibles',
  'teach.access.reproducible.text':
    'Cualquier estado puede convertirse en una URL, y la URL lo reconstruye exactamente: a partir de la semilla, si el mundo fue generado, o cuerpo por cuerpo una vez ejecutado. Eso es lo que hace citable una demostración, idéntica una tarea para todo el mundo, y comprobable la afirmación de un estudiante.',

  // --- Evidence --------------------------------------------------------------
  'teach.evidence.intro':
    'Una simulación usada para enseñar vale lo que vale su física, y la única manera honesta de decirlo es publicar las comprobaciones y dejar que quien lea las ejecute.',
  'teach.evidence.validation.name': 'La suite de validación',
  'teach.evidence.validation.text':
    'Cada comprobación a la que se somete la física, con su valor medido, su valor esperado, la tolerancia y la razón por la que esa tolerancia es la correcta. La página vuelve a ejecutar la suite entera en su navegador si se lo pide.',
  'teach.evidence.model.name': 'Cómo modela Gravitas el universo',
  'teach.evidence.model.text':
    'Qué se simula desde primeros principios, qué es una aproximación, qué es ilustrativo y qué está ausente. Cada afirmación va etiquetada, y las ilustrativas van etiquetadas más fuerte.',
  'teach.evidence.instructors.name': 'El área para docentes',
  'teach.evidence.instructors.text':
    'Guías docentes, objetivos de aprendizaje, claves de respuestas, una guía de adopción y un mapa curricular. Tras una única contraseña compartida, porque dentro están las claves de respuestas.',
  'teach.evidence.source.name': 'El código fuente',
  'teach.evidence.source.text':
    'Todo, con licencia MIT, con la suite de pruebas, las comprobaciones de validación y la compilación. Nada de esta página es una afirmación que haya que creer sin más.',
  'teach.evidence.checks':
    '{passed} de {total} comprobaciones superadas; última ejecución: {date}.',
  'teach.evidence.checks.unavailable':
    'Abra la página de validación para ver los resultados actuales.',

  // --- Footer ----------------------------------------------------------------
  'teach.foot.home': 'Gravitas',
  'teach.foot.model': 'El modelo',
  'teach.foot.validation': 'Validación',
  'teach.foot.instructors': 'Docentes',
  'teach.foot.source': 'Código fuente',
  'teach.foot.license': 'Licencia MIT',

  // --- Inicio rápido para docentes ------------------------------------------
  'teach.section.quickstart': 'Inicio rápido para docentes',
  'teach.quickstart.intro':
    'Seis respuestas para quien decide si usar esto el martes. Todo lo de abajo se puede comprobar desde esta página o las que enlaza.',
  'teach.quickstart.prerequisites.title': 'Qué necesitan saber antes',
  'teach.quickstart.prerequisites.text':
    'Que la gravedad atrae dos masas y se debilita con la distancia. Nada más: sin cálculo en ninguna parte, y cada investigación indica sus propios requisitos en su ficha. La aritmética es la única matemática que necesita una ruta corta.',
  'teach.quickstart.timing.title': 'Cuánto se tarda',
  'teach.quickstart.timing.text':
    'Las rutas cortas de esta página duran de tres a cinco minutos cada una. Una actividad de aula, cinco, veinte o cincuenta. Cada investigación imprime su propia estimación, y todos esos números son estimaciones razonadas a partir de los pasos, no tiempos medidos con una clase: ninguno lo ha sido.',
  'teach.quickstart.devices.title': 'Dónde funciona',
  'teach.quickstart.devices.text':
    'En cualquier navegador actual. No hay nada que instalar, ni cuenta, ni servidor: son archivos estáticos. Está pensado para funcionar en el tipo de Chromebook escolar modesto que ya tiene varios años, en el nivel de calidad bajo, y sigue funcionando sin red una vez abierta la pestaña.',
  'teach.quickstart.accessibility.title': 'Si alguien no puede usar el lienzo',
  'teach.quickstart.accessibility.text':
    'Cada instrumento imprime sus números como texto junto a la imagen, cada gráfico es también una tabla, y la simulación tiene una descripción escrita que sigue lo que hay en pantalla. Toda la actividad se maneja con el teclado, y se respetan el movimiento reducido y el alto contraste. Lo que no está resuelto: un lienzo no se explora al tacto como un diagrama táctil, y quien lo necesite necesitará que alguien le lea los números.',
  'teach.quickstart.evidence.title': 'Qué entrega el alumnado',
  'teach.quickstart.evidence.text':
    'El trabajo se guarda en el navegador del alumno y no sale de ahí por su cuenta. Lo exporta cada persona — un informe en PDF, o el cuaderno como archivo — y lo entrega como ya recojas tú el trabajo. No se sube nada, y no hay cuentas que crear ni listas que gestionar.',
  'teach.quickstart.resources.title': 'Qué hay para ti',
  'teach.quickstart.resources.text':
    'Una guía docente por investigación con observaciones esperadas, ideas previas frecuentes y preguntas de discusión; una clave de respuestas; y un generador de tareas que recorta una lección a los pasos que quieras y produce un enlace.',

  // --- Una plantilla para una evaluación que nadie ha hecho ------------------
  'teach.section.evaluate': 'Si quieres evaluarlo',
  'teach.evaluate.intro':
    'No se ha hecho ningún estudio sobre este software. No hay instrumento validado, ni ganancia de aprendizaje medida, y nada de esta página debe leerse como tal. Lo que sigue es una forma que alguien podría usar para producir evidencia, ofrecida porque su ausencia es más fácil de abordar que de ignorar.',
  'teach.evaluate.kit.lead':
    'Los formularios imprimibles de todo esto — una lista de comprobación de fidelidad, una evaluación piloto previa y posterior de doce ítems, un cuestionario de usabilidad, un flujo de códigos de participante anónimos y plantillas CSV y JSON sin identificadores — están en el',
  'teach.evaluate.kit.link': 'kit de evidencia para el aula',
  'teach.evaluate.kit.tail':
    '. Son instrumentos desarrollados por el proyecto y sin validar, y la página lo dice en cada superficie que los muestra.',
  'teach.evaluate.objectives.title':
    'Empieza por los objetivos, no por la herramienta',
  'teach.evaluate.objectives.text':
    'Cada investigación indica dos o tres objetivos observables en su ficha, redactados como cosas que el alumnado hace y no como cosas que aprecia. Decide cuáles te importan de verdad antes de decidir qué medir; evaluar «la motivación» responde a una pregunta que nadie hizo.',
  'teach.evaluate.prepost.title': 'Pre y post, con comparación',
  'teach.evaluate.prepost.text':
    'Los mismos ítems antes y después, con un grupo de comparación que haga lo que habrías hecho de todos modos. Una ganancia pre/post sin comparación mide el paso del tiempo tanto como la intervención, que es la forma más común de exagerar resultados como estos.',
  'teach.evaluate.transfer.title': 'Haz una pregunta de transferencia',
  'teach.evaluate.transfer.text':
    'Una pregunta sobre un sistema que la actividad nunca mostró. Varias investigaciones terminan con una — otra estrella, un par de masas comparables, un sondeo que se habría perdido algo — y sirven de modelo. Quien solo sabe responder sobre el sistema que vio ha aprendido ese sistema.',
  'teach.evaluate.usability.title': 'Observa, no encuestes',
  'teach.evaluate.usability.text':
    'Siéntate detrás de tres o cuatro estudiantes y anota dónde se paran. Diez minutos de eso valen más que cien valoraciones de satisfacción, y es la única forma de encontrar el paso cuya instrucción nombra un control que queda fuera de su pantalla.',
  'teach.evaluate.limits.title': 'Di lo que no puede mostrar',
  'teach.evaluate.limits.text':
    'El integrador es newtoniano y las páginas del modelo dicen dónde deja de valer. Algunas pantallas colocan un cuerpo a partir de un modelo publicado en vez de integrarlo, y lo indican. Una evaluación que trate cada imagen como una simulación sacará una conclusión que el software no respalda.',
  'teach.evaluate.review.title': 'Pide permiso primero',
  'teach.evaluate.review.text':
    'La investigación con estudiantes, incluida la que hace su propio docente en el aula, suele necesitar aprobación del comité de ética antes de recoger ningún dato, y un consentimiento que sea de verdad opcional cuando quien pide es quien pone la nota. Consúltalo pronto: la aprobación retroactiva no suele existir.',

  // --- Comentarios -----------------------------------------------------------
  'teach.section.feedback': 'Contarnos qué pasó',
  'teach.feedback.intro':
    'Este software no recoge nada. No hay analítica, ni telemetría, ni cuenta, ni servidor al que enviar nada, lo que también significa que aquí nadie se entera de que algo no funciona si no lo cuentas.',
  'teach.feedback.issue.title': 'Informar de algo que falla',
  'teach.feedback.issue.text':
    'Abre una incidencia en el repositorio. Basta con el nombre de un escenario o el enlace de una lección, qué esperabas y qué pasó; un enlace compartido reproduce el estado exacto que estabas viendo.',
  'teach.feedback.issue.link': 'Abrir una incidencia',
  'teach.feedback.contact.title': 'Contar cómo fue enseñar con ello',
  'teach.feedback.contact.text':
    'En el mismo sitio. Una incidencia sirve perfectamente para describir una clase que fue bien o mal, y es pública, que es justamente la gracia: la siguiente persona que dé clase también la lee.',
  'teach.feedback.form.title': 'Notas de una clase que diste',
  'teach.feedback.form.text':
    'Opcional y del todo local. Lo que escribas aquí se queda en este navegador, no se envía a ningún sitio y no pide nada que te identifique a ti ni a nadie. Expórtalo cuando termines y mándalo donde quieras, o bórralo y desaparece.',
  'teach.feedback.route.label': 'Qué ruta o investigación',
  'teach.feedback.route.hint': 'Con el nombre basta',
  'teach.feedback.level.label': 'Para quién era',
  'teach.feedback.level.hint':
    'Nivel del curso y tamaño aproximado del grupo; sin institución, por favor',
  'teach.feedback.worked.label': 'Qué funcionó',
  'teach.feedback.worked.hint': 'El momento en que algo encajó',
  'teach.feedback.confused.label': 'Dónde se atascaron',
  'teach.feedback.confused.hint':
    'La pantalla, la redacción o el control que no encontraban',
  'teach.feedback.timing.label': 'Cuánto duró de verdad',
  'teach.feedback.timing.hint':
    'Frente a la estimación de la ficha: esas estimaciones nunca se han cronometrado con una clase',
  'teach.feedback.wanted.label': 'Qué querías hacer y no pudiste',
  'teach.feedback.wanted.hint':
    'Una medida, un control, una forma de entregar algo',
  'teach.feedback.form.export': 'Guardar estas notas como archivo',
  'teach.feedback.form.clear': 'Borrarlas',
  'teach.feedback.form.saved':
    'Guardado en este navegador. No se ha enviado nada.',
  'teach.feedback.form.cleared': 'Borrado.',
  'teach.feedback.form.empty': 'Todavía no hay nada que guardar.',
  'teach.feedback.form.exported': 'Guardado como {name}.',
  'teach.feedback.form.privacy':
    'Sin nombre, sin correo, sin institución y sin telemetría. Se guarda solo en este navegador, bajo una clave que puedes borrar arriba.',
};
