// =============================================================================
// The mission lab's guides, in Spanish
// -----------------------------------------------------------------------------
// gd.<guide>.<step>.<part>, as in ./en.missionLabGuides.js. Imported by
// js/mission/lab/i18n.js.
// =============================================================================

export const ES_MISSIONLABGUIDES = {
  'gd.target.earth-orbit': 'Órbita terrestre: el encuentro con el depósito',
  'gd.target.window-2026':
    'La ventana Tierra-Marte de 2026 sobre la DE441 del JPL',
  'gd.target.direct-flight': 'El vuelo directo, por el núcleo en 3-D validado',

  'gd.ml-orbit.title': 'En órbita terrestre: el encuentro con el depósito',
  'gd.ml-orbit.summary':
    'Encuéntrate con un depósito de propelente 100 km por encima de la órbita de estacionamiento: el encuentro de Hohmann, la espera hasta la geometría justa y cómo se compara un cambio de plano con un cambio de altura.',
  'gd.ml-orbit.intro.title': 'Un depósito que alcanzar',
  'gd.ml-orbit.intro.body':
    'El lanzamiento deja la nave en una órbita circular de 300 km con el propelente justo para llegar a un depósito que gira a 400 km, donde llena los tanques para Marte. Un encuentro es una transferencia de Hohmann cronometrada para que el depósito llegue al otro lado de la transferencia a la vez que la nave. El primer recuadro del plan tiene estos números.',
  'gd.ml-orbit.intro.ok': '',
  'gd.ml-orbit.predict.title': '¿Altura o plano?',
  'gd.ml-orbit.predict.body':
    'Antes de calcular: ¿qué cuesta más, subir los 100 km hasta la órbita del depósito o girar el plano de la órbita 5 grados sin subir?',
  'gd.ml-orbit.predict.opt.climb': 'Subir 100 km',
  'gd.ml-orbit.predict.opt.turn': 'Girar el plano 5 grados',
  'gd.ml-orbit.predict.opt.same': 'Más o menos lo mismo',
  'gd.ml-orbit.predict.ok': 'Anotado. Los pasos siguientes lo miden.',
  'gd.ml-orbit.dv.title': 'Lo que cuesta el encuentro',
  'gd.ml-orbit.dv.body':
    'Calcula la misión. ¿Cuánto cuestan juntos los dos impulsos del encuentro, en m/s? Lo da la tabla «En órbita terrestre».',
  'gd.ml-orbit.dv.ok':
    'Correcto: {value} m/s, dos impulsos de más o menos la mitad cada uno. Subir un poco en órbita baja es barato.',
  'gd.ml-orbit.wait.title': 'La espera',
  'gd.ml-orbit.wait.body':
    'El depósito debe ir por delante de la nave el ángulo justo cuando empieza la transferencia. ¿Cuánto espera la nave en la órbita de estacionamiento antes del primer impulso, en minutos?',
  'gd.ml-orbit.wait.ok':
    'Correcto: {value} minutos. La órbita más baja es más rápida, así que la nave le gana terreno al depósito hasta que el ángulo llega.',
  'gd.ml-orbit.compare.title': 'Altura o plano: medido',
  'gd.ml-orbit.compare.body':
    'La misma tabla dice cuánto costaría girar 5 grados el plano de la órbita del depósito. ¿Qué cuesta más?',
  'gd.ml-orbit.compare.opt.climb': 'La subida al depósito',
  'gd.ml-orbit.compare.opt.turn': 'Girar el plano 5 grados',
  'gd.ml-orbit.compare.opt.same': 'Más o menos lo mismo',
  'gd.ml-orbit.compare.ok':
    'Correcto. Un cambio de plano hace girar toda la velocidad orbital, 7,7 km/s en órbita baja: 5 grados de ella son 2 v sen(2,5°). Una subida pequeña cuesta una fracción de eso; solo una muy grande cuesta más. Por eso un centro de lanzamiento elige el plano de sus órbitas.',
  'gd.ml-orbit.phase.title': 'Sin esperar',
  'gd.ml-orbit.phase.body':
    'Cambia en el plan el adelanto del depósito para que la espera sea de menos de 10 minutos, y vuelve a calcular. El adelanto que necesita la transferencia está en la tabla.',
  'gd.ml-orbit.phase.ok':
    'Hecho: el depósito parte ahora justo por delante de donde lo necesita la transferencia.',
  'gd.ml-orbit.waitAgain.title': 'La espera ahora',
  'gd.ml-orbit.waitAgain.body': '¿Cuánto es la espera ahora, en minutos?',
  'gd.ml-orbit.waitAgain.ok': 'Correcto: {value} minutos.',
  'gd.ml-orbit.limits.title': 'Lo que esta parte deja fuera',
  'gd.ml-orbit.limits.body':
    'Aquí la Tierra es un punto. Su abultamiento ecuatorial gira el plano de una órbita baja varios grados al día, y la tenue atmósfera a 300 km hace bajar una órbita por rozamiento; ambas cosas importan en un encuentro real, y ninguna está en el modelo. Los impulsos son instantáneos. El encuentro en sí lo vuela el núcleo en 3-D validado en los casos de referencia (S2), y las dos naves se encuentran con un error de una parte en un billón.',
  'gd.ml-orbit.limits.ok': '',

  'gd.ml-window.title': 'Rumbo a Marte: la ventana de lanzamiento',
  'gd.ml-window.summary':
    'La oportunidad de 2026 sobre la efeméride del JPL: encuentra el día más barato para salir, lee su C3 y su velocidad de llegada y mira lo que cuesta un viaje más rápido.',
  'gd.ml-window.intro.title': 'Cada 26 meses',
  'gd.ml-window.intro.body':
    'La Tierra y Marte se alinean para una transferencia barata cada unos 26 meses. Para cualquier día de salida y cualquier tiempo de vuelo, la efeméride da las posiciones de ambos planetas, y una transferencia de Lambert alrededor del Sol las une. Hacerlo para cada par dibuja la ventana de lanzamiento.',
  'gd.ml-window.intro.ok': '',
  'gd.ml-window.predict.title': '¿Barato y rápido?',
  'gd.ml-window.predict.body':
    '¿El día más barato para salir es también el del viaje más corto?',
  'gd.ml-window.predict.opt.yes': 'Sí',
  'gd.ml-window.predict.opt.no': 'No',
  'gd.ml-window.predict.ok': 'Anotado. La ventana lo dirá.',
  'gd.ml-window.open.title': 'Dibuja la ventana',
  'gd.ml-window.open.body':
    'Calcula la ventana en la sección «La ventana de lanzamiento de 2026»: unas 19 000 transferencias de Lambert, en el Worker.',
  'gd.ml-window.open.ok':
    'Hecho: la ventana está dibujada, y debajo aparecen cuatro candidatas.',
  'gd.ml-window.best.title': 'El día más barato',
  'gd.ml-window.best.body':
    'Haz de la celda más barata el plan: pulsa «Usar esta» junto a «La más barata en delta-v». La fecha de salida y el tiempo de vuelo cambian, y la misión se vuelve a calcular.',
  'gd.ml-window.best.ok':
    'Hecho: el plan sale ahora el día más barato de la ventana.',
  'gd.ml-window.c3.title': 'C3',
  'gd.ml-window.c3.body':
    '¿Cuál es el C3 de la salida, en km²/s²? Es el cuadrado de la velocidad de exceso que debe dar la salida, y con él se clasifican los lanzadores.',
  'gd.ml-window.c3.ok':
    'Correcto: {value} km²/s². Los círculos modelo de la página de diagnóstico dan el mismo C3 en cada oportunidad; el real depende de en qué punto de sus órbitas excéntricas e inclinadas estén los planetas.',
  'gd.ml-window.fast.title': 'Un viaje más rápido',
  'gd.ml-window.fast.body':
    'Mira la ventana hacia los 200 días de vuelo. Comparado con la transferencia más barata, el viaje de 200 días más barato cuesta…',
  'gd.ml-window.fast.opt.more': 'más',
  'gd.ml-window.fast.opt.about': 'más o menos lo mismo',
  'gd.ml-window.fast.opt.less': 'menos',
  'gd.ml-window.fast.ok':
    'Correcto. Un viaje más corto necesita una órbita más rápida, y la paga en ambos extremos. Las misiones cambian delta-v por tiempo: la fila «El viaje más corto dentro de un 10 % de la más barata» es uno de esos cambios.',
  'gd.ml-window.vinf.title': 'La llegada',
  'gd.ml-window.vinf.body':
    '¿Cuál es la velocidad de exceso al llegar a Marte, en km/s? De ella dependen el impulso de captura y lo que debe aguantar el escudo térmico de un módulo de aterrizaje.',
  'gd.ml-window.vinf.ok': 'Correcto: {value} km/s.',
  'gd.ml-window.declination.title': 'Fuera del plano',
  'gd.ml-window.declination.body':
    'La velocidad de exceso de la salida apunta fuera de la eclíptica. ¿Cuántos grados? Los resultados dan su declinación.',
  'gd.ml-window.declination.ok':
    'Correcto: {value}°. La órbita de Marte está inclinada 1,85° respecto a la de la Tierra, así que una transferencia debe salir del plano de la Tierra para alcanzarla, con más pendiente cuanto más cerca de 180° esté su ángulo de transferencia. Los círculos planos de la página de diagnóstico no tienen ese ángulo.',
  'gd.ml-window.limits.title': 'Lo que esta parte deja fuera',
  'gd.ml-window.limits.body':
    'Cada celda es una transferencia de dos cuerpos entre los centros de los planetas, con el impulso de una cónica empalmada en cada extremo: la parte siguiente la vuela directamente y ve lo que eso deja fuera. Las posiciones son las del JPL, ajustadas con unos pocos km de error (la tabla está en MISSION_LAB.md). La ventana muestra una oportunidad; el paquete abarca de 2025 a 2045.',
  'gd.ml-window.limits.ok': '',

  'gd.ml-cruise.title':
    'En el camino: la cónica empalmada frente al vuelo directo',
  'gd.ml-cruise.summary':
    'Vuela la nave diseñada bajo el Sol y los planetas desde su órbita de salida real, mira por cuánto falla Marte, averigua por qué y paga una corrección.',
  'gd.ml-cruise.intro.title': 'Dos modelos de una trayectoria',
  'gd.ml-cruise.intro.body':
    'La cónica empalmada diseña por partes: una hipérbola dentro de la esfera de influencia de la Tierra, una elipse alrededor del Sol entre los centros de los planetas y una hipérbola en Marte. El laboratorio también puede volar la misma nave directamente: el núcleo en 3-D validado la integra desde su periapsis en la órbita del depósito, bajo el Sol y los planetas marcados en el plan, que parten de sus estados en la efeméride.',
  'gd.ml-cruise.intro.ok': '',
  'gd.ml-cruise.predict.title': '¿A qué distancia?',
  'gd.ml-cruise.predict.body':
    'Volada directamente y sin corrección, ¿a qué distancia de Marte estará la nave en la llegada prevista?',
  'gd.ml-cruise.predict.opt.km1e3': 'A menos de 1000 km',
  'gd.ml-cruise.predict.opt.km1e4': 'A unos 10 000 km',
  'gd.ml-cruise.predict.opt.km1e5': 'A unos 100 000 km',
  'gd.ml-cruise.predict.opt.km1e6': 'A más de 1 000 000 km',
  'gd.ml-cruise.predict.ok': 'Anotado. El paso siguiente la vuela.',
  'gd.ml-cruise.fly.title': 'Vuélala tal como se diseñó',
  'gd.ml-cruise.fly.body':
    'Los cuatro planetas marcados, partiendo de la órbita del depósito, sin corrección: calcula.',
  'gd.ml-cruise.fly.ok': 'Hecho.',
  'gd.ml-cruise.miss.title': 'El error',
  'gd.ml-cruise.miss.body':
    '¿A qué distancia de Marte está la nave en la llegada prevista, en millones de km?',
  'gd.ml-cruise.miss.ok':
    'Correcto: {value} millones de km, varias veces la distancia a la Luna, aunque cada pieza del diseño era exacta.',
  'gd.ml-cruise.test.title': 'Prueba el propio diseño',
  'gd.ml-cruise.test.body':
    'Desmarca todos los planetas y parte del centro de la Tierra, como hace la elipse de la cónica empalmada. Calcula.',
  'gd.ml-cruise.test.ok':
    'Hecho: con el Sol solo y desde el centro de la Tierra, la nave llega a unos metros. La elipse era correcta; el error viene de otra cosa.',
  'gd.ml-cruise.diagnose.title': 'Por qué falla',
  'gd.ml-cruise.diagnose.body':
    'Vuelve a marcar los planetas uno a uno y prueba ambos puntos de partida. ¿Qué causa la mayor parte del error?',
  'gd.ml-cruise.diagnose.opt.integration': 'El error de la integración',
  'gd.ml-cruise.diagnose.opt.planets':
    'La atracción de Venus, Marte y Júpiter en el camino',
  'gd.ml-cruise.diagnose.opt.earth':
    'La atracción de la Tierra sobre una nave que sale de una órbita real, que la cónica empalmada termina en su esfera de influencia',
  'gd.ml-cruise.diagnose.opt.mars': 'La atracción de Marte al llegar',
  'gd.ml-cruise.diagnose.ok':
    'Correcto. Desde el centro de la Tierra, los otros planetas mueven la llegada menos de 100 000 km. Saliendo de una órbita real, la Tierra sigue atrayendo tras la esfera de influencia y el Sol atrae dentro de ella, y la llegada se mueve millones.',
  'gd.ml-cruise.explain.title': 'Explícalo',
  'gd.ml-cruise.explain.body':
    'Con tus palabras: ¿por qué la nave de la cónica empalmada falla Marte, y por qué los diseñadores de misiones siguen partiendo de una cónica empalmada?',
  'gd.ml-cruise.explain.ok': 'Anotado para tu profesor.',
  'gd.ml-cruise.correct.title': 'Corrige la trayectoria',
  'gd.ml-cruise.correct.body':
    'Marca «Corregir la trayectoria» el día 30, con los cuatro planetas marcados y la salida desde la órbita del depósito, y calcula. La corrección vuelve a apuntar una y otra vez hasta que la nave llega a menos de 100 km.',
  'gd.ml-cruise.correct.ok': 'Hecho.',
  'gd.ml-cruise.cost.title': 'Lo que cuesta',
  'gd.ml-cruise.cost.body': '¿Cuánto cuesta la corrección, en m/s?',
  'gd.ml-cruise.cost.ok':
    'Correcto: {value} m/s, una pequeña fracción del impulso de salida. Las misiones reales llevan propelente para varias correcciones.',
  'gd.ml-cruise.late.title': 'Corregir más tarde',
  'gd.ml-cruise.late.body': 'Pasa la corrección al día 200 y calcula.',
  'gd.ml-cruise.late.ok': 'Hecho.',
  'gd.ml-cruise.lateCost.title': 'Lo que cuesta ahora',
  'gd.ml-cruise.lateCost.body': '¿Cuánto cuesta ahora, en m/s?',
  'gd.ml-cruise.lateCost.ok': 'Correcto: {value} m/s.',
  'gd.ml-cruise.early.title': 'Cuándo corregir',
  'gd.ml-cruise.early.body': 'Entonces, una corrección es más barata…',
  'gd.ml-cruise.early.opt.early': 'cuanto antes se hace',
  'gd.ml-cruise.early.opt.late': 'cuanto más tarde se hace',
  'gd.ml-cruise.early.opt.same': 'cuando sea que se haga',
  'gd.ml-cruise.early.ok':
    'Correcto. Un error de velocidad se convierte con el tiempo en un error de posición, así que el mismo error cuesta menos velocidad corregirlo pronto. Los casos de referencia (D2) vuelan cuatro correcciones para mostrarlo.',
  'gd.ml-cruise.propellant.title': 'El propelente',
  'gd.ml-cruise.propellant.body':
    '¿Cuánto propelente debe cargar el depósito para los impulsos posteriores, para esta nave, en kg? Lo da la tabla «De dónde sale el propelente».',
  'gd.ml-cruise.propellant.ok':
    'Correcto: {value} kg, varias veces la masa en seco de la propia nave. La ecuación del cohete es exponencial en el delta-v, y por eso se cuenta cada m/s.',
  'gd.ml-cruise.limits.title': 'Lo que el vuelo directo sigue dejando fuera',
  'gd.ml-cruise.limits.body':
    'El vuelo directo es un modelo mejor que la cónica empalmada, no uno real: quedan fuera la Luna, los otros planetas, la forma de la Tierra y la presión de la luz solar, cada impulso es instantáneo y cada estado se conoce exactamente. La lista bajo «Lo que este modelo deja fuera» los nombra todos. Esa es la diferencia con el software operativo: aquí los límites del modelo son la investigación; allí, eliminarlos es para lo que existen las herramientas.',
  'gd.ml-cruise.limits.ok': '',
};
