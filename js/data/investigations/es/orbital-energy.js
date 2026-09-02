// =============================================================================
// orbital-energy - es
// -----------------------------------------------------------------------------
// A shadow of ../orbital-energy.js carrying only its words. Laid over the English lesson
// by mergeTranslation() in ../i18n.js, so anything absent here keeps its
// English and nothing here can reach the lesson's machinery: no scenario name,
// no seed, no widget id, no numeric answer, no probe.
//
// Arrays line up by index with the English. `null` means "not translated";
// that entry keeps its English.
// =============================================================================

export default {
  title: 'Ligado, no ligado y escape',
  subtitle: 'Descubre qué decide si algo vuelve o no',
  duration: '35-45 min',
  level: 'Astronomía introductoria',
  summary:
    'Lanza algo desde un planeta y descubre qué decide si vuelve a caer, gira para siempre o se marcha y no regresa jamás. Avanza desde el experimento hasta la idea que hay detrás: todo objeto cercano a una estrella lleva consigo una cantidad de energía, y el signo de ese único número resuelve la cuestión. Termina con un visitante interestelar real y decide por ti mismo si volverá.',
  objectives: [
    'Describir qué le ocurre a un objeto lanzado a medida que su velocidad supera el punto de escape',
    'Explicar con tus propias palabras por qué una energía total menor que cero significa que un objeto está atrapado',
    'Indicar aproximadamente cuál es la velocidad de escape en la superficie de la Tierra, y qué significa',
    'Explicar por qué escapar no significa que la gravedad haya dejado de tirar',
    'Decir qué le ocurre a la velocidad de escape para un cuerpo más masivo, y para una distancia inicial mayor',
    'Decidir, a partir de su trayectoria, si un objeto real está ligado al Sol',
  ],
  steps: [
    {
      title: '¿Con cuánta fuerza habría que lanzarlo?',
      body: 'Lanza una pelota y cae. Lánzala con más fuerza y cae más lejos. Newton se hizo la pregunta obvia que venía después, en un experimento mental que dibujó en 1687: pon un cañón en una montaña tan alta que esté por encima del aire y dispáralo horizontalmente. ¿Qué ocurre si sigues cargando más pólvora?\n\nSu respuesta fue que, en algún momento, el suelo se curva y se aleja por debajo de la bala tan deprisa como la bala cae, y esta deja de caer del todo. Da la vuelta entera y te golpea por la espalda. Eso es una órbita, y es la razón por la que un satélite se mantiene arriba: no porque haya escapado de la gravedad, sino porque está cayendo y fallando continuamente.\n\n¿Y si cargas aún más pólvora? A cierta velocidad se marcha y no vuelve. En algún punto entre esos dos desenlaces hay una línea divisoria. Encontrar esa línea, y entender qué decide de qué lado cae cada cosa, es todo el contenido de esta lección.\n\nEn los siguientes pasos dispararás tú mismo el cañón de Newton.',
      tip: 'Todavía no hay que medir nada. El panel de la derecha aparecerá en un momento con un cañón en él.',
    },
    {
      title: 'Cárgalo con poca pólvora',
      body: 'El primer disparo sale de la cima de la montaña de lado a <strong>6 kilómetros por segundo</strong>. Eso es rápido: unas veinte veces la velocidad del sonido, y mucho más rápido que cualquier bala.\n\nComprométete con una respuesta antes de dispararlo.',
      prompt: 'Disparada de lado a 6 km/s, la bala de cañón…',
      options: [
        'dará la vuelta a la Tierra y seguirá dando vueltas',
        'recorrerá una gran distancia y luego caerá al suelo',
        'abandonará la Tierra y no volverá nunca',
        'se detendrá y caerá en vertical',
      ],
      because:
        'Vuelve a caer. Seis kilómetros por segundo suena enorme, y lo es, pero no basta: la bala sube, se frena, da la vuelta y cae. Todo proyectil disparado alguna vez en la Tierra ha hecho esto.',
    },
    {
      title: 'Dispáralo',
      body: 'Ahí está el disparo. La trayectoria verde es la bala de cañón, lanzada de lado desde la superficie, y aterriza muy lejos, dando casi la vuelta al mundo.\n\nPulsa <strong>Ejecutar</strong> para dispararla de nuevo, y usa el deslizador de velocidad para probar algunas más. No te preocupes todavía por las barras de la parte inferior del panel: volverás a ellas.',
      checklist: [
        'Observa cómo el disparo de 6 km/s vuelve a caer',
        'Prueba 3 km/s y observa cuánto más corto es el vuelo',
        'Sube la velocidad hasta que la bala dé la vuelta entera sin aterrizar',
        'Anota aproximadamente la velocidad a la que eso ocurre por primera vez',
      ],
      tip: 'El cañón está a 320 km de altura, que es más o menos donde vuela la estación espacial y con seguridad por encima del aire. Desde allí, la velocidad mínima que da la vuelta completa sin tocar el suelo es de unos 7,7 km/s. Por eso los cohetes se inclinan y vuelan de lado en vez de subir en vertical: subir es la parte fácil, ir lo bastante rápido de lado es la difícil.',
    },
    {
      title: 'Cárgalo a tope',
      body: 'Ahora dobla la pólvora. Esta vez la bala sale a <strong>14 kilómetros por segundo</strong>.',
      prompt: 'Disparada de lado a 14 km/s, la bala de cañón…',
      options: [
        'dará la vuelta a la Tierra en un círculo muy grande',
        'volverá a caer, solo que mucho más tarde',
        'se marchará por una trayectoria abierta y no volverá nunca',
        'orbitará un tiempo y después caerá lentamente en espiral',
      ],
      because:
        'Se marcha para siempre. La trayectoria ya no es un bucle cerrado: se abre, y la bala sigue alejándose cuando está mucho más allá de todo lo que hay en la pantalla. Nada la trae de vuelta.',
    },
    {
      title: 'Dispáralo otra vez',
      body: 'La trayectoria ha cambiado de naturaleza. No es un bucle muy grande: no es un bucle en absoluto. La bala sale y sigue saliendo.\n\nFíjate en que ahora el panel dice que la trayectoria es <em>abierta</em>, y que la línea de "hasta dónde llega" no tiene ninguna respuesta que dar.',
      checklist: [
        'Observa cómo el disparo de 14 km/s se marcha por una trayectoria abierta',
        'Prueba 16 km/s y confirma que se marcha más rápido y más recto',
        'Baja de nuevo a 9 km/s y confirma que ese sí vuelve',
        'Lee la línea "¿vuelve?" en cada caso',
      ],
    },
    {
      title: 'Encuentra la línea divisoria',
      body: 'En algún punto entre 9 y 12 km/s la respuesta pasa de <em>sí, vuelve</em> a <em>no, se ha ido</em>.\n\nMueve el deslizador con cuidado y encuentra dónde. Merece la pena ir despacio en el último tramo: justo por debajo de la línea, la bala sale a una distancia absurda y aun así da la vuelta.',
      checklist: [
        'Encuentra la velocidad mínima a la que la respuesta cambia a "se marcha para siempre"',
        'Ponte justo por debajo de ella y lee hasta dónde llega antes de girar',
        'Ponte justo por encima y confirma que la trayectoria nunca se cierra',
        'Fíjate en que el cambio es súbito: hay una velocidad divisoria bien definida',
      ],
      tip: 'A 10,9 km/s la bala llega más allá de 350 radios terrestres, más lejos que la Luna, y aun así regresa. A 10,92 no da la vuelta jamás. Las dos parecen idénticas durante el primer tramo del vuelo, que es exactamente por lo que los astrónomos quieren un número y no una imagen.',
    },
    {
      title: '¿Dónde está la línea?',
      body: 'Acabas de encontrarla a mano.',
      prompt:
        'La velocidad divisoria para una bala disparada desde la superficie de la Tierra se acerca más a…',
      options: ['8 km/s', '12 km/s', '20 km/s', '40 km/s'],
      because:
        'Desde el cañón es 10,9 km/s, así que 12 es con diferencia la más próxima. Desde el suelo mismo es 11,2 km/s, y ese es el número que merece la pena llevar encima: unas 25.000 millas por hora, o unas cuarenta veces la velocidad del sonido. Toda nave espacial que haya partido hacia otro planeta tuvo que recibir al menos esto. Fíjate en que ambas cifras difieren, y en que el cañón sobre su torre necesita algo menos. Esa es una pista a la que volverás.',
    },
    {
      title: '¿Qué es lo que decide esto en realidad?',
      body: 'Podrías quedarte aquí con una regla práctica: por encima de 11,2 km/s se marcha, por debajo vuelve. Pero ese número no es fundamental, y cambia por completo si te sitúas en otro lugar. Algo por debajo de él está haciendo el trabajo de verdad.\n\nUn objeto cercano a un planeta lleva dos clases de energía a la vez.\n\n<strong>La energía de movimiento</strong> es la obvia: cuanto más rápido va, más tiene. Nunca es negativa, y solo es cero si el objeto está quieto.\n\n<strong>La energía de posición</strong> es la rara. Estar hundido en la gravedad de un planeta es como estar en el fondo de un pozo: para salir hay que trepar, y trepar cuesta. La física lleva la cuenta de esto llamando <em>negativa</em> a la energía de posición, y llamando cero al valor que tiene cuando estás infinitamente lejos y libre del planeta por completo. En lo hondo del pozo es un número negativo grande. Muy lejos, es uno pequeño.\n\nSuma las dos y obtienes la <strong>energía total</strong>, y ese total no cambia mientras el objeto vuela. Acelera al entrar, frena al salir: las dos se intercambian de un lado a otro y la suma se queda quieta.',
      tip: 'Las energías se muestran por kilogramo, y por eso el panel nunca pregunta cuánto pesa la bala. Resulta que no importa, y verás por qué en breve.',
    },
    {
      title: 'Observa el total',
      body: 'Las tres barras de la parte inferior del panel son esas energías, con una línea gruesa que marca el <strong>cero</strong>.\n\nLa barra verde es la energía de movimiento, por encima de la línea. La barra azul es la energía de posición, por debajo. La tercera barra es el total, y es la que hay que vigilar.\n\nMueve el deslizador de velocidad despacio y observa cómo la barra del total sube y cruza la línea.',
      checklist: [
        'A 6 km/s, comprueba que la barra del total está por debajo de la línea de cero',
        'A 9 km/s sigue por debajo, pero es más corta',
        'Encuentra la velocidad a la que la barra del total desaparece en la línea de cero',
        'Compara esa velocidad con la línea divisoria que encontraste antes',
        'Por encima de ella, observa que la barra del total ha pasado al otro lado',
      ],
      tip: 'La velocidad a la que la energía total cruza el cero es exactamente la velocidad a la que la trayectoria deja de cerrarse. No es una coincidencia. Es el mismo hecho contado de dos maneras distintas.',
    },
    {
      title: 'Leer el signo',
      body: 'Ya has visto que la energía total pasa de estar por debajo de cero a estar por encima, y la trayectoria pasa de cerrada a abierta, en el mismo instante.',
      prompt: 'Un objeto cuya energía total es menor que cero está…',
      options: [
        'ligado: no puede escapar, por mucho que esperes',
        'no ligado: acabará por marcharse',
        'a punto de caer en línea recta sobre el planeta',
        'viajando más rápido que la velocidad de escape',
      ],
      because:
        'Menor que cero significa ligado. Para llegar infinitamente lejos, un objeto necesitaría un total de al menos cero, porque eso es en lo que se convierte la energía de posición allí fuera y la energía de movimiento no puede ser negativa para compensar la diferencia. Por debajo de cero simplemente no puede llegar, así que la gravedad acaba ganando siempre y le da la vuelta.',
    },
    {
      title: 'Alrededor de una órbita real',
      body: 'Eso era un lanzamiento. Ahora observa una órbita entera.\n\nEn la simulación hay dos planetas girando alrededor de una estrella. El <strong>naranja</strong> va por una órbita estirada: se acerca mucho y corre, luego se aleja y se arrastra. Púlsalo.\n\nEl panel muestra sus dos energías como barras, y las representa frente al tiempo debajo. Obsérvalo durante una vuelta completa.',
      checklist: [
        'Pulsa el Orbitador Excéntrico naranja en la simulación',
        'Observa cómo la línea verde sube al acercarse rápido',
        'Observa cómo la línea azul baja en ese mismo momento',
        'Confirma que la línea blanca del total se mantiene plana mientras las otras dos se mueven',
        'Comprueba que el total permanece por debajo de la línea de cero durante toda la vuelta',
      ],
      tip: 'Este es el intercambio. Caer hacia dentro convierte energía de posición en energía de movimiento, y volver a trepar la convierte de nuevo. No se gana ni se pierde nada, y por eso la órbita se repite para siempre.',
    },
    {
      title: 'Lo que se mantiene',
      body: 'A lo largo de una vuelta de esa órbita estirada, la velocidad del planeta cambió en un factor grande y su distancia cambió aún más.',
      prompt:
        '¿Cuál de estas se mantuvo esencialmente constante durante toda la vuelta?',
      options: [
        'la energía de movimiento',
        'la energía de posición',
        'la suma de las dos',
        'ninguna: todo cambió',
      ],
      because:
        'El total. Las otras dos se intercambiaron cantidades grandes de un lado a otro y su suma no se movió, que es lo que te permitió leer un único número y saber que la órbita era cerrada. Una órbita no puede decidir por sí sola volverse no ligada: algo tendría que llegar y añadirle energía.',
    },
    {
      title: 'Velocidad de escape',
      body: 'La velocidad divisoria tiene nombre: <strong>velocidad de escape</strong>. Es la velocidad a la que la energía total sale exactamente cero, que es lo más lento que puedes ser lanzado sin volver jamás.\n\nEscrita, es\n\n<strong>v<sub>escape</sub> = √( 2 G M / r )</strong>\n\ndonde M es la masa del cuerpo del que te marchas y r es lo lejos que ya estás de su centro. No tendrás que despejarla. Lo que importa es lo que dice, que son dos cosas:\n\n<strong>Más masa hace el escape más difícil.</strong> M está arriba, así que un cuerpo más pesado exige una velocidad mayor.\n\n<strong>Empezar más lejos hace el escape más fácil.</strong> r está abajo, así que cuanto más lejos empieces, menos necesitas. No es porque la gravedad se haya rendido contigo; es porque ya has hecho parte de la subida.\n\nFíjate en lo que <em>no</em> aparece ahí: la masa de lo que escapa. Un grano de polvo y un acorazado necesitan exactamente la misma velocidad, por la misma razón por la que una pluma y un martillo caen a la vez en la Luna.',
      tip: 'La raíz cuadrada es la razón por la que doblar la distancia no reduce a la mitad la velocidad que necesitas. La divide por 1,4 aproximadamente.',
    },
    {
      title: 'Un malentendido frecuente',
      body: 'Una nave espacial se lanza desde la Tierra a 12 km/s, cómodamente por encima de la velocidad de escape. Una semana después está mucho más allá de la Luna y sigue alejándose.',
      prompt: 'En ese momento, la gravedad de la Tierra…',
      options: [
        'ya no actúa sobre ella: ha escapado',
        'sigue tirando de ella hacia atrás y sigue frenándola',
        'la empuja hacia fuera, que es lo que significa escapar',
        'queda exactamente cancelada por su velocidad',
      ],
      because:
        'Sigue tirando, y sigue frenándola. Escapar no apaga la gravedad, y no hay ninguna distancia a la que la gravedad se detenga. Lo que escapar significa es que la nave tiene energía suficiente para que ese frenado nunca llegue a detenerla del todo: sigue perdiendo velocidad para siempre y nunca se le acaba. Por debajo de la velocidad de escape, ese mismo frenado sí la detiene, y entonces todo ocurre al revés.',
    },
    {
      title: 'En otro lugar completamente distinto',
      body: 'Todo lo anterior ha tratado de marcharse de la Tierra. La velocidad de escape depende de aquello de lo que te marchas.',
      prompt:
        'De pie sobre la superficie de cada uno, ¿de cuál haría falta la velocidad más alta para escapar?',
      options: ['la Luna', 'la Tierra', 'Júpiter', 'el Sol'],
      because:
        'El Sol, con diferencia: unos 618 km/s desde su superficie, más de cincuenta veces la de la Tierra. El Sol tiene un tercio de millón de veces la masa de la Tierra y, aunque su superficie está además mucho más lejos de su centro, la masa gana.',
    },
    {
      title: 'Más masa, más difícil marcharse',
      body: 'Aquí tienes cuatro cuerpos reales con sus velocidades de escape reales, todas medidas de pie sobre la superficie.\n\nLa barra del Sol se sale del gráfico a propósito. Dibujada a la misma escala que las demás sería diez veces más larga que el panel, lo cual da una impresión bastante fiel de la situación.',
      checklist: [
        'Lee la velocidad de escape desde la Luna y desde la Tierra',
        'Compara la Tierra con Júpiter y anota aproximadamente el factor entre ellas',
        'Observa que el Sol se sale de la escala por completo',
        'Convéncete de que el orden coincide con el orden de sus masas',
      ],
      tip: 'Los 2,4 km/s de la Luna son la razón por la que el módulo lunar del Apolo pudo ser una caja endeble forrada de aluminio con un solo motor pequeño, mientras que sacar a esos mismos astronautas de la Tierra exigió un cohete de 110 metros.',
    },
    {
      title: 'Más lejos, más fácil marcharse',
      body: 'Ahora deja los cuerpos como están y cambia el punto de partida.\n\nEl deslizador aleja tu punto de partida del centro, medido en múltiplos del radio de cada cuerpo. Arrástralo y observa cómo todas las barras encogen a la vez.',
      checklist: [
        'Lee la velocidad de escape de la Tierra en la superficie',
        'Muévete a 4 radios y léela de nuevo',
        'Averigua a qué distancia hay que estar para que baje de 5 km/s',
        'Confirma que encogen todas las barras, no solo la de la Tierra',
        'Observa que el orden de los cuerpos no cambia nunca',
      ],
      tip: 'Nada relativo a la Tierra cambia cuando mueves el deslizador. Lo único que cambió es cuánta subida has hecho ya.',
    },
    {
      title: 'Empezar más lejos',
      body: 'Se dispara un cohete desde la superficie de la Tierra, y un cohete idéntico desde una estación espacial que la orbita muy por encima.',
      prompt:
        'Comparado con la superficie, escapar desde la estación espacial necesita…',
      options: [
        'más velocidad, porque está más lejos del suelo',
        'menos velocidad, porque ya está parcialmente fuera de la gravedad de la Tierra',
        'exactamente la misma velocidad: la velocidad de escape es una propiedad de la Tierra',
        'ninguna velocidad, porque allí arriba la gravedad es cero',
      ],
      because:
        'Menos. La velocidad de escape no es una propiedad de un planeta por sí solo, es una propiedad de un planeta y de un lugar. Cuanto más alto empieces, menos subida queda, así que menos velocidad necesitas para terminarla. Esta es una razón por la que las misiones interplanetarias a menudo se ensamblan en órbita en lugar de lanzarse de una vez.',
    },
    {
      title: 'Tres formas, una sola ley',
      body: 'Una última cosa que mirar antes de aplicar todo esto.\n\nLas curvas tenues son tres lanzamientos desde el mismo punto: uno por debajo de la velocidad de escape, uno exactamente en ella y uno por encima. La curva blanca gruesa es la tuya. Mueve el deslizador y obsérvala cambiar de una a otra.\n\nEstas formas tienen nombre. Por debajo de la velocidad de escape la trayectoria es una <strong>elipse</strong>, un bucle cerrado. Exactamente en la velocidad de escape es una <strong>parábola</strong>. Por encima es una <strong>hipérbola</strong>, una curva abierta que a lo lejos se endereza hasta ser una recta.\n\nLos nombres no son lo importante. Lo importante es que las tres salen de la misma ley de la gravedad actuando sobre el mismo planeta. Nada de la física cambió entre ellas. Solo cambió la energía.',
      checklist: [
        'Pon el deslizador por debajo de 1 y confirma que la trayectoria se cierra',
        'Ponlo exactamente en 1 y observa que se abre, pero por muy poco',
        'Ponlo por encima de 1 y ve cómo la trayectoria se endereza al marcharse',
        'Observa cómo la línea de "energía total" cambia de signo al cruzar 1',
      ],
      tip: 'Los astrónomos leen esto al revés. Mide suficiente trayectoria de un objeto como para deducir su forma, y habrás aprendido si está ligado sin haber tenido que observarlo durante una órbita entera.',
    },
    {
      title: 'Algo que vino de fuera',
      body: 'El 19 de octubre de 2017, un telescopio de rastreo en Hawái captó un objeto tenue en movimiento. En cuestión de días quedó claro que no se comportaba como nada del Sistema Solar.\n\nTodo lo que orbita el Sol sigue una trayectoria cerrada. Este no. Su trayectoria medida era abierta: entró desde la dirección de la constelación de Lyra, rodeó el Sol por dentro de la órbita de Mercurio a 87 kilómetros por segundo y se marchó. Se le llamó <strong>1I/ʻOumuamua</strong>, «explorador» o «mensajero de lejos» en hawaiano, y el «1I» significa que fue el primer objeto interestelar que se haya capturado jamás.\n\nEstá en pantalla ahora, en su órbita real, con la Tierra mostrada como referencia de escala. Obsérvalo entrar.',
      tip: 'Se descubrió cuando ya se marchaba, pasado el Sol y apagándose. Nadie lo ha visto desde 2018, y nadie volverá a verlo.',
    },
    {
      title: 'Compruébalo tú mismo',
      body: 'No te fíes de la palabra de nadie. Ahora tienes una prueba.\n\nPulsa el visitante y lee el signo de su energía total. Después pulsa la Tierra, lee el suyo y compara.',
      checklist: [
        'Pulsa 1I/ʻOumuamua y lee el signo de su energía total',
        'Pulsa la Tierra y lee el signo de su energía total',
        'Observa cómo el visitante rodea el Sol y empieza a alejarse de nuevo',
        'Confirma que su trayectoria no se cierra nunca, por mucho que observes',
      ],
      tip: 'Su trayectoria es una hipérbola con una excentricidad de 1,20. Todo cometa registrado antes que este tenía una excentricidad menor que 1, que es otra manera de decir que todos ellos estaban ligados al Sol.',
    },
    {
      title: '¿Volverá?',
      body: 'El visitante ya ha pasado el Sol y se aleja de nuevo, todavía frenándose mientras el Sol tira de él.',
      prompt:
        '¿Acabará ʻOumuamua por frenarse hasta detenerse, dar la vuelta y entrar en órbita alrededor del Sol? Di por qué sí o por qué no, usando lo que has medido.',
      rubric:
        'No. Su energía total es mayor que cero, así que no está ligado: la atracción del Sol lo sigue frenando pero no puede detenerlo nunca, y seguirá alejándose cuando esté arbitrariamente lejos. Se valora señalar que su trayectoria es abierta en lugar de un bucle cerrado, o que su excentricidad es mayor que 1. Una respuesta errónea frecuente es que la gravedad deja de actuar sobre él una vez que está lo bastante lejos, y merece la pena corregirla: la gravedad sigue tirando para siempre, y el objeto escapa de todos modos.',
    },
    {
      title: 'Lo que has deducido',
      body: 'Empezaste disparando un cañón y haciéndote una pregunta que podría hacer un niño: ¿vuelve? Al final has sido capaz de responder esa misma pregunta sobre un objeto procedente de otro sistema estelar, usando un solo número.\n\nLas cinco cosas que merece la pena conservar:\n\n<strong>La gravedad no se apaga nunca.</strong> Un objeto que escapa sigue siendo atraído hacia atrás durante todo el trayecto. Escapa de todos modos.\n\n<strong>Ligado significa atrapado.</strong> Energía total menor que cero: el objeto no puede llegar al infinito, así que la gravedad acaba dándole la vuelta.\n\n<strong>No ligado significa que se ha ido.</strong> Energía total mayor que cero: se marcha y sigue en movimiento cuando ya está muy lejos.\n\n<strong>La velocidad de escape es la línea divisoria</strong>, la velocidad a la que el total sale exactamente cero.\n\n<strong>Depende de dónde estás, no solo de qué abandonas.</strong> Más masa la sube. Empezar más lejos la baja.\n\nEse último punto es la razón por la que no hay una única respuesta a «con qué rapidez hay que ir para escapar de la Tierra». Depende de dónde empieces. Y es la razón por la que la manera honesta de plantear la pregunta nunca fue en términos de velocidad. Fue en términos de energía.',
      tip: 'La misma prueba decide cuestiones mucho mayores: si una estrella escapa del cúmulo en el que nació, si una galaxia retiene el gas expulsado por sus supernovas, y si la Vía Láctea y Andrómeda están ligadas entre sí. Lo están.',
    },
  ],
};
