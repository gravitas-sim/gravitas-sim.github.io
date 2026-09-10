// =============================================================================
// lives-of-stars - es
// -----------------------------------------------------------------------------
// A shadow of ../lives-of-stars.js carrying only its words. Laid over the
// English lesson by mergeTranslation() in ../i18n.js, so anything absent here
// keeps its English and nothing here can reach the lesson's machinery: no
// scenario name, no seed, no widget id, no numeric answer, no probe.
//
// Arrays line up by index with the English. `null` means "not translated";
// that entry keeps its English. Units and bare numerals are left out, because
// they are notation rather than language.
// =============================================================================

export default {
  title: 'Vidas de las estrellas',
  subtitle: 'De las nubes a los restos cósmicos, por ocho trazas publicadas',
  level: 'Astronomía introductoria',
  summary:
    'Una estrella no es tanto una cosa como un proceso que lleva su tiempo. A lo largo de treinta y cuatro pasos sigues tres de ellos desde una nube en contracción hasta lo que dejan atrás: una estrella de masa solar hasta una enana blanca, una de diez masas solares hasta una estrella de neutrones y una de cuarenta hasta un agujero negro, leyendo cada etapa en el mismo diagrama y las mismas trazas publicadas. También conocerás a la estrella que no hace nada de esto: una enana roja que seguirá quemando hidrógeno cuando el Universo tenga cien veces su edad actual.',
  objectives: [
    'Seguir una estrella por el diagrama H-R desde antes de formarse hasta después de apagarse',
    'Decir qué alimenta una estrella en cada etapa y qué significa que una etapa termine',
    'Explicar por qué dejar la secuencia principal significa el hidrógeno del núcleo y no todo el hidrógeno',
    'Comparar lo que duran las fases de verdad con lo que les concede una animación',
    'Explicar por qué las estrellas más pesadas terminan de otro modo que el Sol, y por qué no todas terminan igual entre sí',
    'Decir por qué un agujero negro no tiene sitio en este diagrama',
    'Nombrar una limitación de los modelos sobre los que se apoya toda la lección',
  ],
  steps: [
    {
      title: 'Tres estrellas, tres futuros',
      body: 'En el escenario: una enana roja de una quinta parte de masa solar, una estrella como el Sol y una estrella de veinte masas solares. Las tres están ahora en su secuencia principal, fusionando hidrógeno en el núcleo.\n\nLas tres se detendrán. Comprométete con lo que crees que pasa y con cuál llega antes. No se espera que aciertes; el paso 34 te pide que vuelvas a mirar tu respuesta.',
      prompt: '¿Cuál de estas tres cambia más deprisa, y cómo termina?',
      options: [
        'La enana roja, porque lo pequeño se consume rápido. Se apaga.',
        'El Sol, porque está en medio. Explota.',
        'La de 20 M☉, porque es la que pierde energía más deprisa de las tres. Su núcleo colapsa.',
        'Las tres tardan más o menos lo mismo. Una estrella es una estrella.',
      ],
      because:
        'La más pesada, con muchísima diferencia: su secuencia principal dura 8,7 millones de años frente a los 9.900 millones del Sol y al billón y pico de la enana roja. «Pierde energía más deprisa» es la razón correcta: es cien mil veces más luminosa que el Sol, y la luz es combustible que se va. Las respuestas sobre las otras dos son las dos imágenes equivocadas más comunes y las dos se corrigen más adelante: la enana roja no se consume rápido, apenas cambia, y el Sol no explota.',
      tip: 'Si has hecho «Un universo de estrellas» este escenario te resultará familiar. Si no, los seis pasos siguientes repasan todo lo que esta lección necesita de aquella.',
    },
    {
      title: 'Antes de la estrella',
      body: 'Todas las estrellas de aquí empiezan en el mismo sitio: una nube de gas, fría y tenue y mucho mayor que nada de lo que llegarán a ser.\n\nLo que la hace colapsar es su propia gravedad. Nada la empuja; cada parte de ella tira de todas las demás, y en cuanto una región es lo bastante densa para que su propia gravedad venza a la presión que la sostiene, cae hacia dentro y sigue cayendo.\n\nEl panel lo muestra como una ilustración, y la lectura se niega a ponerle números. Lee por qué.',
      checklist: [
        'Mira el panel «la estrella ahora»: una nube que se contrae hacia un centro que se ilumina',
        'Lee el pie que hay debajo',
        'Lee las dos filas de la lista: «Etapa» y «Por qué no hay números»',
        'Fíjate en que el diagrama de la izquierda está vacío: todavía no se dibuja nada',
        'Pulsa «Fase siguiente» una vez y observa cómo aparece un punto en el diagrama',
        'Pulsa «Fase anterior» para volver a la nube',
      ],
      tip: 'El diagrama está vacío a propósito. Una nube no tiene fotosfera, así que no tiene temperatura superficial ni luminosidad, y colocarla en algún punto de estos ejes sería inventarse las dos.',
    },
    {
      title: '¿Con qué funciona?',
      body: 'Pulsa <strong>Fase siguiente</strong> para llegar al primer punto que el modelo describe de verdad: una estrella de la presecuencia principal. Ya tiene superficie, así que tiene un sitio en el diagrama.\n\nTambién es muy luminosa: la primera muestra del modelo la sitúa en cincuenta y seis veces la emisión del Sol, con una superficie a 4.100 K y un radio quince veces el solar. Pero todavía no hace lo que hace el Sol.\n\nAntes de mirar la lectura, comprométete.',
      prompt: 'Una estrella de la presecuencia principal brilla porque…',
      options: [
        'ha empezado a fusionar hidrógeno en el núcleo, solo que más despacio',
        'sigue contrayéndose y libera energía gravitatoria al encogerse',
        'refleja la luz de la nube que la rodea',
        'está caliente desde el Big Bang',
      ],
      because:
        'Está cayendo sobre sí misma, y algo que cae libera energía. La mitad de la energía gravitatoria que libera una nube de gas en contracción la calienta y la otra mitad se radia, y esa mitad radiada es lo que estás viendo. Todavía no hay fusión sostenida de hidrógeno. Esto importa más allá de la contabilidad: una estrella que brilla no es necesariamente una estrella que fusiona, y que empiece la fusión no es lo mismo que llegar a la secuencia principal.',
      tip: 'La fila «Sobre esta fase» de la lectura tiene la versión completa, incluido lo que hace el deuterio antes de que arranque el hidrógeno.',
    },
    {
      title: 'Encogerse, y brillar mientras lo hace',
      body: 'Mueve el cursor por la etapa de presecuencia principal y observa el radio. Usa el deslizador de edad o las flechas del teclado: aquí nada exige esperar a una animación.\n\nAnota el radio cerca del principio de la etapa y cerca del final, y la edad en cada caso.',
      fields: [
        { label: 'Radio al principio' },
        { label: 'Radio cerca del final' },
        { label: 'Edad en la segunda lectura' },
      ],
      tip: 'Esta etapa dura unos 42 millones de años para una estrella de masa solar: una fracción de un uno por ciento de su vida, y la lectura lo dice en la fila «Esta fase».',
    },
    {
      title: '¿Hacia dónde por el diagrama?',
      body: 'Sigue el marcador por la etapa de presecuencia principal y mira adónde va en el diagrama. La línea gris tenue es la traza completa; la línea brillante es por donde ha pasado la estrella hasta ahora.\n\nRecuerda los ejes: más caliente a la izquierda, más luminoso hacia arriba.',
      prompt:
        'A lo largo de la presecuencia principal, un modelo de masa solar se mueve…',
      options: [
        'hacia arriba y a la derecha, más brillante y más frío',
        'hacia abajo y luego a la izquierda: más débil al encogerse, y luego más caliente según se calienta el núcleo',
        'recto hacia abajo por el diagrama, a temperatura constante',
        'a ninguna parte: se queda en un punto hasta que empieza la fusión',
      ],
      because:
        'Primero abajo y luego a la izquierda. Encogerse a temperatura superficial aproximadamente constante la hace más débil, porque hay menos superficie; después, según se calienta el interior, la temperatura superficial sube y se mueve a la izquierda. La forma de ese camino es un resultado real del modelo y no un adorno, y es uno de los sitios donde el diagrama trabaja: dos magnitudes que puedes medir desde lejos trazan lo que ocurre dentro de algo que no puedes ver.',
      tip: 'Una confusión frecuente que conviene zanjar ya: este diagrama no es un mapa de dónde están las estrellas en el espacio. Es una gráfica de dos propiedades. Dos estrellas juntas en él pueden no estar cerca en absoluto.',
    },
    {
      title: 'La llegada',
      body: 'Pulsa <strong>Fase siguiente</strong>. La fase de la lectura cambia a <em>secuencia principal</em>: la fusión de hidrógeno en el núcleo ya es estable, y es lo que sostiene la estrella.\n\nEsta es la secuencia principal de edad cero, el comienzo de la parte larga. Anota dónde está la estrella.',
      fields: [
        { label: 'Temperatura superficial' },
        { label: 'Luminosidad' },
        { label: 'Edad' },
      ],
      tip: 'La fusión no empezó en este instante: empezó antes y fue creciendo. Lo que pasa aquí es que se convierte en lo que sostiene la estrella, que es lo que significa la secuencia principal.',
    },
    {
      title: 'El Sol, hoy',
      body: 'Pon la edad en 4.600 millones de años, donde está el Sol ahora. Puedes escribir en el deslizador de edad o moverlo con las flechas.\n\nAnota las tres propiedades. Son los valores del modelo para una estrella de masa solar a esa edad, y son parecidos a los del Sol medido sin haber sido ajustados a él.',
      fields: [
        { label: 'Temperatura superficial' },
        { label: 'Luminosidad' },
        { label: 'Radio' },
      ],
      tip: 'Temperatura superficial, no temperatura del núcleo. El núcleo del Sol está a unos 15 millones de K; su superficie, a 5.772. Nada en esta lección dibuja nunca una temperatura de núcleo.',
    },
    {
      title: 'Diez mil millones de años, medidos',
      body: 'Ahora ve hasta el final de la secuencia principal: pulsa <strong>Fase siguiente</strong> o arrastra el cursor hasta justo antes de que cambie la fase.\n\nAnota dónde acaba y calcula cuánto se ha iluminado a lo largo de su vida en la secuencia principal. El punto de llegada lo mediste hace dos pasos.',
      fields: [
        { label: 'Luminosidad al llegar' },
        { label: 'Luminosidad al final' },
        { label: 'Cuántas veces más brillante' },
        { label: 'Edad al final' },
      ],
      tip: 'La fila «Se ha movido» de la lectura lleva la cuenta por ti según avanzas.',
    },
    {
      title: 'Entonces y ahora, lado a lado',
      body: 'En el escenario de comparación hay dos versiones de la misma estrella: el modelo de masa solar al llegar, y el mismo modelo al final de su secuencia principal.\n\nLee los dos radios y guarda la comparación en el cuaderno. Este es el cambio más pequeño de toda la lección y aun así es una estrella casi tres cuartas partes más grande.',
      fields: [{ label: 'Radio al llegar' }, { label: 'Radio al final' }],
      tip: 'Las dos son la misma estrella. Nada más en esta lección fija un modelo a dos edades, y merece la pena notar que al escenario de comparación no le importa.',
    },
    {
      title: '¿Qué se agota exactamente?',
      body: 'La secuencia principal termina. Algo se ha consumido.\n\nPiensa dónde ocurre la fusión antes de responder. El Sol es hidrógeno en un 71 por ciento de su masa, y la fusión solo ocurre donde hace suficiente calor y suficiente densidad.',
      prompt:
        'Cuando una estrella deja la secuencia principal, ¿qué se ha agotado?',
      options: [
        'Todo el hidrógeno de la estrella',
        'El hidrógeno del núcleo, donde hacía suficiente calor para fusionarlo',
        'La gravedad de la estrella',
        'Su helio, que llevaba fusionando desde el principio',
      ],
      because:
        'Solo el hidrógeno del núcleo, un pequeño porcentaje de la masa de la estrella. Casi todo el hidrógeno sigue ahí, en la envoltura, donde nunca ha hecho suficiente calor para fusionarlo y de donde no baja mezclado hasta el núcleo. Por eso pasa lo que pasa después: una capa de ese hidrógeno, justo fuera del núcleo agotado, ya está lo bastante caliente para arder, y la estrella no se apaga. Se vuelve muchísimo más brillante. Este es el malentendido más común sobre la evolución estelar y los cuatro pasos siguientes van de él.',
      tip: 'Una estrella no tiene forma de remover hidrógeno fresco hasta su núcleo; una como el Sol, al menos. La de 0,2 masas solares del paso 22 sí, y por eso su vida es tan distinta.',
    },
    {
      title: 'Qué está ardiendo ahora',
      body: 'Activa el <strong>esquema del interior</strong> y avanza desde el final de la secuencia principal.\n\nTen cuidado con lo que es esta imagen. Las trazas incluidas son magnitudes de superficie: una temperatura, una luminosidad, una masa. No contienen ninguna estructura radial, así que los tamaños de las capas que ves están elegidos para verse y no significan nada. Lo que la imagen sí lleva es qué proceso libera la energía, y eso la fase de la traza sí lo determina.',
      checklist: [
        'Pulsa «Esquema del interior» para activarlo',
        'En la secuencia principal: un núcleo lleno, quemando hidrógeno',
        'Pulsa «Fase siguiente» para llegar a la rama de las gigantes rojas',
        'Ahora: un anillo fuera del núcleo, y un núcleo que ya no es la fuente de energía',
        'Lee la fila «El interior» de la lista, que dice lo que la imagen no es',
        'Vuelve a apagar el esquema y fíjate en que no cambia nada más',
      ],
      tip: 'El núcleo no ha dejado de importar: se contrae y se calienta, y eso es lo que pone la capa de alrededor lo bastante caliente para arder. Solo ha dejado de ser de donde sale la energía.',
    },
    {
      title: 'El núcleo se encoge, la estrella se hincha',
      body: 'Las dos cosas que pasan a la vez son la parte más difícil de sostener en la cabeza de toda esta historia, y son opuestas: el núcleo se contrae y la envoltura se expande enormemente.\n\nSigue la rama de las gigantes rojas desde su inicio hasta su punta y anota la estrella en los dos extremos. Usa <strong>Fase siguiente</strong> para encontrar los límites.',
      fields: [
        { label: 'Radio al inicio de la rama' },
        { label: 'Radio en la punta' },
        { label: 'Temperatura superficial en la punta' },
      ],
      tip: 'Su superficie está más fría porque está repartida sobre cien veces el radio, diez mil veces el área. Cada metro cuadrado radia menos, y hay tantos más que el total sube en un factor de mil.',
    },
    {
      title: '¿Hacia dónde va?',
      body: 'Tienes los números: más fría en la superficie, mucho más luminosa en total. Antes de mirar la traza, deduce qué significa eso para el diagrama.\n\nMás caliente es a la izquierda. Más luminoso es hacia arriba.',
      prompt: 'Al dejar la secuencia principal, la estrella se mueve…',
      options: [
        'arriba y a la izquierda: más brillante y más caliente',
        'arriba y a la derecha: más brillante y más fría',
        'abajo y a la derecha: más débil y más fría',
        'por la secuencia principal hasta una posición más baja',
      ],
      because:
        'Arriba y a la derecha, y la línea brillante del diagrama la muestra haciendo exactamente eso. «Arriba y a la derecha» es una combinación que la secuencia principal no contiene nunca, y por eso la región de las gigantes está en otro sitio del diagrama en vez de ser una prolongación de la banda. Y fíjate en lo que no hace: no baja deslizándose por la secuencia principal. Eso no lo hace nada.',
      tip: 'Estás viendo al diagrama ganarse el sueldo. Dos números medibles, y el camino que trazan te dice que la estrella ha dejado de quemar hidrógeno en su núcleo.',
    },
    {
      title: 'La gigante, medida',
      body: 'Sitúate en la punta de la rama de las gigantes rojas —lo más grande y lo más fría que llega a estar esta estrella en esta rama— y anota las tres propiedades juntas, más su masa.\n\nGuárdalo en el cuaderno: el paso 15 lo compara con lo que mediste en el paso 9.',
      fields: [
        { label: 'Temperatura superficial' },
        { label: 'Luminosidad' },
        { label: 'Radio' },
        { label: 'Masa ahora' },
      ],
      tip: 'Dos mil cuatrocientas veces la emisión del Sol desde una superficie a la mitad de su temperatura. Solo el área puede hacer eso.',
    },
    {
      title: 'A escala',
      body: 'Cambia el panel de la estrella entre <strong>tamaño real</strong> y <strong>ajustar al recuadro</strong> y mueve el cursor adelante y atrás entre la secuencia principal y la rama de las gigantes.\n\nEn modo de tamaño real toda la vida se dibuja en una escala fijada por lo mayor que llega a ser la estrella. Por eso es un punto durante casi toda su vida: es un punto comparada con lo que llega a ser.',
      checklist: [
        'Pon el panel de la estrella en tamaño real',
        'Sitúate en la secuencia principal y fíjate en que la estrella es apenas una marca',
        'Lee el pie: da la fracción del radio máximo de la propia estrella',
        'Ve a la punta de la rama de las gigantes y mira cómo el disco llena el panel',
        'Cambia a «ajustar al recuadro» y vuelve a la secuencia principal',
        'Vuelve a leer el pie: ahora dice que el tamaño no significa nada',
      ],
      tip: 'Las dos imágenes son honestas y responden a preguntas distintas. La que miente es una imagen que cambia de escala sin decirlo.',
    },
    {
      title: 'No se limita a seguir hinchándose',
      body: 'Pulsa <strong>Fase siguiente</strong> más allá de la punta. El helio se enciende en el núcleo, y después la estrella lo quema durante un tiempo.\n\nMira lo que hace el marcador. No sigue subiendo hacia la derecha.',
      prompt: 'Después de que se encienda el helio, la estrella del modelo…',
      options: [
        'continúa suavemente hacia valores mayores y más fríos',
        'cae bruscamente en luminosidad y vuelve hacia valores más calientes, y luego sale de nuevo',
        'vuelve exactamente a donde estaba en la secuencia principal',
        'deja de cambiar hasta que muere',
      ],
      because:
        'Cae y se mueve a la izquierda, y luego vuelve a subir por la rama asintótica de las gigantes. El núcleo se sostiene ahora quemando helio en vez de contrayéndose, y una estrella sostenida de otra manera se sitúa en otro sitio. Este paso existe porque «y luego se hace cada vez más grande y más roja hasta que muere» es una historia más ordenada que la verdad, y esta lección sigue la secuencia real de cada traza en vez de enderezarla. Masas distintas hacen cosas distintas aquí; el modelo de 5 masas solares se desvía más a la izquierda que este.',
      tip: 'La propia etapa de encendido del helio dura menos de dos millones de años: la fila «Esta fase» de la lectura la sitúa en torno al 0,02 por ciento de la vida de la estrella.',
    },
    {
      title: 'Perdiéndose a sí misma',
      body: 'Avanza por la rama asintótica de las gigantes. La estrella se hincha otra vez, y esta vez pasa algo más: está expulsando sus capas exteriores.\n\nObserva la fila <strong>Masa</strong>. Anota lo que le queda al final de la etapa de pulsos térmicos y con lo que empezó.',
      fields: [
        { label: 'Masa al nacer' },
        { label: 'Masa al final de la AGB' },
        { label: 'Perdida' },
      ],
      tip: 'Las capas dibujadas alrededor de la estrella en el panel son ese material perdido, con semilla fija para que estén en el mismo sitio en cada ejecución. Son una ilustración de una cantidad que el modelo sí registra, no una simulación de un viento.',
    },
    {
      title: '¿Eso es una explosión?',
      body: 'Acaba de desprenderse media estrella. Suena violento.\n\nNo lo es. Comprométete antes de seguir leyendo.',
      prompt:
        'Una estrella de masa solar que se desprende de la mitad de su masa al final de su vida es…',
      options: [
        'una supernova: así es como explotan las estrellas como el Sol',
        'un viento lento a lo largo de cientos de miles de años, sin ninguna explosión',
        'una colisión con otra estrella',
        'la estrella colapsando hacia dentro, no hacia fuera',
      ],
      because:
        'Un viento. Fuerte para una estrella, lentísimo para una explosión: el material se va a lo largo de cientos de miles de años a decenas de kilómetros por segundo, no a las decenas de miles que alcanza una supernova. No detona nada y no colapsa nada. La lectura de esta traza lo dice donde nombra el final: «¿Una supernova visible? No. Aquí no explota nada.» El Sol no va a explotar, y el paso donde algo sí lo hace está a diecinueve pasos de aquí.',
      tip: 'Una supernova necesita un núcleo lo bastante masivo para colapsar. El del Sol acabará en torno a 0,54 masas solares, y la degeneración de los electrones sostiene eso indefinidamente.',
    },
    {
      title: 'Una nebulosa planetaria, que no está hecha de planetas',
      body: 'La envoltura se ha ido. Lo que queda en medio es el núcleo desnudo —muy caliente, porque era el interior de una estrella— y el gas de alrededor brilla porque ese núcleo lo ilumina.\n\nEl nombre es un accidente histórico. Observadores del siglo XVIII vieron discos pequeños, redondos y verdosos en sus telescopios, pensaron que parecían planetas, y el nombre se quedó. No hay planetas de por medio ni los hubo nunca.\n\nDos cosas que este modelo no te dice. Cuándo se hace visible la nebulosa no es el instante en que se fue la envoltura: el gas tiene que ser ionizado por la estrella central, cosa que ocurre según esa estrella se calienta a lo largo de miles de años. Y cuánto dura —unas decenas de miles de años antes de dispersarse— tampoco está en estas trazas. Se sigue a la estrella; al gas no.',
      tip: 'El núcleo desnudo cruza el diagrama casi en horizontal en esta etapa: su luminosidad apenas cambia mientras su temperatura superficial sube de unos 5.000 K a casi 100.000 K.',
    },
    {
      title: 'La brasa',
      body: 'Ve hasta el final de la traza. Lo que queda es una enana blanca: el núcleo desnudo, que ya no fusiona nada, enfriándose.\n\nAnótalo. Y piensa en la última fila que estás a punto de leer: sigue emitiendo más luz que el Sol, y no hay fusión en ninguna parte de ella.',
      fields: [
        { label: 'Temperatura superficial' },
        { label: 'Luminosidad' },
        { label: 'Radio' },
      ],
      tip: 'Una enana blanca no es una estrella normal pequeña. Nada la sostiene contra la gravedad salvo la resistencia de sus propios electrones a que los aprieten más, y eso no se agota.',
    },
    {
      title: 'Cuánto duró de verdad cada parte',
      body: 'El cursor ha dedicado más o menos el mismo tiempo de pantalla a cada etapa. La estrella no.\n\nLa fila <strong>Esta fase</strong> de la lectura da la duración real de la etapa en la que estés y la porción de la reproducción que se lleva. Visita dos etapas y compara.',
      fields: [
        { label: 'La secuencia principal dura' },
        { label: 'La rama de las gigantes rojas dura' },
        { label: 'La AGB de pulsos térmicos dura' },
      ],
      tip: 'Pulsa «Cambiar lo que marca el cursor» para pasar al ritmo del tiempo y mira cómo todo lo posterior a la secuencia principal se reduce al último tramo. Los dos relojes son honestos sobre cosas distintas.',
    },
    {
      title: 'La estrella que no hace nada de esto',
      body: 'Cambia al modelo de 0,2 masas solares. Está en su secuencia principal, como el Sol.\n\nTambién han pasado 13.800 millones de años desde que empezó el Universo. Predice qué aspecto tiene esta estrella a la edad actual del Sol, y después a la edad del Universo.',
      prompt: 'Una estrella de 0,2 M☉, entre 4.600 y 13.800 millones de años…',
      options: [
        'se convierte en una gigante roja, como hará el Sol, solo que antes',
        'apenas ha cambiado: un pequeño porcentaje en luminosidad',
        'ya ha muerto y ha dejado una enana blanca',
        'se ha consumido y se ha apagado',
      ],
      because:
        'No pasa casi nada. Entre 4.600 y 13.800 millones de años su luminosidad va de 0,00478 a 0,00496 solares —menos de un cuatro por ciento— y su radio de 0,221 a 0,224 radios solares. Es totalmente convectiva, así que puede remover hidrógeno fresco hasta su núcleo en vez de quedarse con el que ya hay, y quema lo que tiene extraordinariamente despacio. Su secuencia principal dura 1,1 billones de años. Las dos respuestas equivocadas de aquí son las dos formas en que se suele enseñar a pensar en las estrellas pequeñas, y las dos les dan el futuro del Sol.',
      tip: 'Pulsa «Fase siguiente» y fíjate en que no hay adónde ir: esta traza tiene una presecuencia principal y una secuencia principal, y ahí se acaba.',
    },
    {
      title: 'La misma edad, dos estrellas',
      body: 'Una comparación controlada, y conviene tener claro de qué tipo: esta es <em>la misma edad</em>, no la misma fracción de una vida. Las dos estrellas tienen 4.600 millones de años. Una va por la mitad de su secuencia principal y la otra ha hecho cuatro milésimas de la suya.\n\nAnota las dos y la razón entre sus luminosidades.',
      fields: [
        { label: 'Estrella tipo Sol, luminosidad a 4,6 Gyr' },
        { label: 'Estrella de 0,2 M☉, luminosidad a 4,6 Gyr' },
        { label: 'Cuántas veces más brillante es la tipo Sol' },
      ],
      tip: 'Comparar a la misma edad y comparar a la misma fracción de una vida son experimentos distintos y responden a preguntas distintas. El paso 33 te pide elegir uno a propósito.',
    },
    {
      title: 'Veinte masas solares',
      body: 'Ahora el otro extremo. Cambia al modelo de 20 masas solares y mira dónde está en la secuencia principal: unas 43.000 luminosidades solares, a 35.000 K.\n\nTiene veinte veces el combustible del Sol. Predice cuánto dura su secuencia principal.',
      prompt:
        'La vida en la secuencia principal de una estrella de 20 M☉ es de unos…',
      options: [
        '200.000 millones de años: veinte veces la del Sol',
        '10.000 millones de años: más o menos como la del Sol',
        '9 millones de años',
        '9.000 años',
      ],
      because:
        'Nueve millones de años: alrededor de una milésima de la del Sol. Veinte veces el combustible y cuarenta mil veces el ritmo de gastarlo. Esta es la consecuencia más útil de lo pronunciada que es la relación entre masa y luminosidad, y es la razón de que las estrellas masivas de cualquier región de una galaxia sean siempre las jóvenes: una estrella así no puede ser vieja, porque nada tan brillante dura.',
      tip: 'La lectura la da como 8,65 Myr en la fila «Esta fase» mientras estás en la secuencia principal.',
    },
    {
      title: 'Lo que eso cuesta',
      body: 'Pon los dos números uno al lado del otro: cuánta más luz, y cuánto menos tiempo.\n\nLee la luminosidad de la secuencia principal de cada estrella y la duración de la secuencia principal en la fila «Esta fase».',
      fields: [
        { label: 'Tipo Sol, luminosidad' },
        { label: '20 M☉, luminosidad' },
        { label: 'Tipo Sol, secuencia principal' },
        { label: '20 M☉, secuencia principal' },
      ],
      tip: 'Puedes guardar la traza tipo Sol con «Guardar esta traza para comparar» y luego cambiar de estrella: la línea discontinua se queda en el diagrama detrás de la nueva.',
    },
    {
      title: 'Una supergigante, y qué arde dentro',
      body: 'Sigue al modelo de 20 masas solares más allá de su secuencia principal con el esquema del interior activado. Se expande hasta más de mil radios solares —cinco veces el radio de la órbita de la Tierra— mientras pierde casi seis masas solares por su viento.\n\nEl esquema cambia cuando cambia la fuente de energía. Recuerda lo que es: una imagen de qué proceso está funcionando, no una estructura.',
      checklist: [
        'Activa el esquema del interior',
        'Recorre: secuencia principal, expansión, encendido del helio, combustión de helio en el núcleo',
        'Mira cómo la fila Radio pasa de 1.000 radios solares',
        'Mira cómo la fila Masa baja de 20 hacia 14',
        'Llega a «Combustión avanzada», la última fase que tiene este modelo',
        'Lee lo que dice la lectura sobre dónde se detiene la traza',
      ],
      tip: 'Seis masas solares perdidas por un viento: más que la masa entera de la mayoría de las estrellas. Las estrellas masivas devuelven casi todo lo que son al espacio antes de hacer nada dramático.',
    },
    {
      title: 'Por qué no puede seguir',
      body: 'Una estrella masiva quema hidrógeno hasta helio, helio hasta carbono y oxígeno y —más allá de donde se detienen estas trazas— carbono hasta cosas más pesadas, en capas, cada etapa más rápida que la anterior.\n\nLa secuencia termina en el hierro. Todo lo anterior al hierro libera energía al fusionarse; el hierro no. Fusionar hierro consume energía en vez de darla.\n\nLa estrella se ha estado sosteniendo contra su propia gravedad con la energía liberada en su núcleo.',
      prompt:
        'En dos o tres frases: ¿por qué un núcleo de hierro acaba con la estrella, cuando un núcleo de helio no lo hizo?',
      tip: 'Estas trazas se detienen en el encendido del carbono, antes de que pase nada de eso. Todo lo que va del carbono en adelante se describe aquí con palabras y no está en el modelo: la lectura dice dónde se detuvo y con cuánta masa.',
    },
    {
      title: 'Dos destinos distintos en una estrella',
      body: 'El núcleo está a punto de colapsar. Las capas exteriores —casi toda la masa de la estrella— están muy lejos y todavía no hacen nada.\n\nPredice qué le pasa a cada una.',
      prompt: 'Cuando el núcleo colapsa, el núcleo y la envoltura…',
      options: [
        'colapsan juntos hacia el remanente',
        'salen despedidos los dos y no queda nada',
        'el núcleo colapsa en un remanente compacto y la envoltura puede salir despedida',
        'la envoltura colapsa primero y aplasta el núcleo',
      ],
      because:
        'Se separan. El núcleo colapsa en cosa de un segundo hasta algo de unas decenas de kilómetros; si la envoltura sale despedida es una pregunta aparte con una respuesta aparte, y no siempre es que sí. Donde la explosión tiene éxito, los restos y el remanente son dos objetos distintos con dos destinos distintos: los restos enriquecen el medio interestelar, el remanente se queda. Donde falla, la envoltura vuelve a caer y no hay ninguna supernova brillante. Los pasos 29 y 31 son esos dos casos.',
      tip: 'Esta es una predicción sobre la receta de final del modelo, no sobre la traza: la traza ya se ha detenido aquí, y la lectura lo dice.',
    },
    {
      title: 'Una estrella de neutrones, y cómo lo sabemos',
      body: 'Lleva el modelo de 10 masas solares hasta el final. La traza se detiene en el encendido del carbono con 9,4 masas solares restantes; lo que pasa después no está en ella.\n\nLa lectura te dice de dónde sale la respuesta en su lugar. Anota lo que dice y fíjate en lo cuidadosamente que está redactado.',
      fields: [
        { label: 'Masa del remanente' },
        { label: 'Masa cuando se detuvo la traza' },
      ],
      tip: 'Los anillos que se expanden en el panel son una ilustración de un suceso, no un cálculo de él, y se mantienen fuera del diagrama a propósito: el brillo de una supernova es un transitorio que dura semanas y no es la luminosidad fotosférica de la estrella.',
    },
    {
      title: 'Qué pequeña, y por qué quizá nunca la veas',
      body: 'La enana blanca que mediste en el paso 20 tenía unas dos veces el radio de la Tierra y contenía 0,54 masas solares. Esta estrella de neutrones contiene unas 1,4 masas solares en unos veinte kilómetros de diámetro.\n\nSe dice a menudo que las estrellas de neutrones son púlsares. Piensa qué exige esa afirmación.',
      prompt: 'Una estrella de neutrones se observa como púlsar cuando…',
      options: [
        'siempre: toda estrella de neutrones es un púlsar',
        'gira, tiene un campo magnético fuerte y su haz da la casualidad de que nos barre',
        'está lo bastante cerca para verla',
        'todavía está dentro de su resto de supernova',
      ],
      because:
        'Tres condiciones, y la última es suerte. Un púlsar es una estrella de neutrones cuyo haz da la casualidad de apuntarnos una vez por rotación; si la geometría no acompaña no vemos los pulsos por cerca que esté. Muchas estrellas de neutrones no se observan como púlsares, y las más viejas se frenan y dejan de producir pulsos detectables al margen de la geometría. Nada de esto está modelado en este laboratorio: el final que hay aquí es una masa y un tipo, y llamarlo púlsar sería añadir una afirmación que el modelo no hace.',
      tip: 'Veinte kilómetros para 1,4 masas solares son unos cien millones de toneladas en una cucharadita. No tiene fotosfera en el sentido habitual, y por eso no tiene sitio en el diagrama.',
    },
    {
      title: 'Y una que probablemente no explota',
      body: 'Cambia al modelo de 40 masas solares y llévalo hasta el final.\n\nLee con atención toda la sección del final. Contiene tres reconocimientos que el caso de la estrella de neutrones no necesitaba, y son el motivo de este paso.',
      fields: [
        { label: 'Masa cuando se detuvo la traza' },
        { label: 'Masa mínima del remanente según las fuentes' },
        { label: 'Máxima' },
      ],
      tip: 'Mira el diagrama: la línea brillante se detiene donde se detiene el modelo y no la continúa nada. Un agujero negro no tiene fotosfera, así que no tiene temperatura ni luminosidad que dibujar, y ponerlo en log(0) o en un punto inventado sería mentir sobre lo que se sabe.',
    },
    {
      title: '¿Qué es esta?',
      body: 'Cuatro descripciones. Sin nombres, sin masas.\n\n<strong>A.</strong> 3.300 K en la superficie, 1.100 luminosidades solares, 100 radios solares.\n\n<strong>B.</strong> 48.000 K, 1,6 luminosidades solares, 0,018 radios solares.\n\n<strong>C.</strong> 3.300 K, 0,007 luminosidades solares, 0,24 radios solares.\n\n<strong>D.</strong> 4.600 K, 0,5 luminosidades solares, 1,1 radios solares.\n\nPon cualquiera de ellas en el diagrama con el cursor libre y usa <strong>Usar el modelo más cercano</strong> para ver qué pasa cerca.',
      prompt: '¿Cuál de las cuatro es la más difícil de precisar?',
      options: [
        'A: cinco de los modelos incluidos pasan cerca, en cuatro etapas distintas y dos masas distintas',
        'B: caliente y débil podría ser muchas cosas',
        'C: pequeña, fría y débil es la más vaga de las cuatro',
        'D: no hay nada del paquete ni remotamente cerca',
      ],
      because:
        'La A, y no por poco. Cinco modelos pasan cerca de ese punto: una estrella de masa solar en la rama de las gigantes rojas, la misma en el encendido del helio, la misma en la rama asintótica temprana, la misma durante sus pulsos térmicos, y una estrella de dos masas solares en SUS pulsos térmicos. Cuatro etapas y dos masas, y todas dan los mismos tres números. La B es lo contrario: pasa cerca un solo modelo, porque nada salvo una enana blanca es tan caliente y tan débil a la vez, y la temperatura y la luminosidad juntas la obligan a ser diminuta. La D también es inequívoca dentro de este paquete: una estrella de masa solar todavía en contracción, de unos 15 millones de años. La C es el caso intermedio interesante: la masa queda fijada en 0,2 masas solares porque no vive nada más ahí, pero la ETAPA no: podría estar en la secuencia principal o todavía contrayéndose hacia ella, y los números no las separan. «No hay información suficiente» es una respuesta real, y una lección que nunca la da enseña el hábito equivocado.',
      tip: 'Por eso las regiones del diagrama están sombreadas en vez de delimitadas, y por eso el laboratorio enumera todos los modelos cercanos en vez de elegir uno. Una estrella no es gigante por cruzar una línea.',
    },
    {
      title: 'Tu propia comparación',
      body: 'Elige dos de los ocho modelos y compáralos, pero elige a propósito <em>qué tipo</em> de comparación estás haciendo.\n\n<strong>La misma edad</strong> pregunta qué aspecto tienen ahora dos estrellas nacidas a la vez. <strong>La misma fracción de vida</strong> pregunta qué aspecto tienen dos estrellas en la misma etapa. Son preguntas distintas y dan respuestas distintas; el paso 23 era del primer tipo.\n\nPredice primero, mide después y guarda la comparación.',
      fields: [
        { label: 'Primera estrella, masa' },
        { label: 'Segunda estrella, masa' },
        { label: 'Primera estrella, luminosidad medida' },
        { label: 'Segunda estrella, luminosidad' },
      ],
      tip: 'Usa «Guardar esta traza para comparar» para dejar el camino de la primera estrella en el diagrama como línea discontinua mientras miras la segunda.',
    },
    {
      title: 'De vuelta a las tres estrellas',
      body: 'En el paso 1 se te mostraron una enana roja, una estrella tipo Sol y una de veinte masas solares y se te preguntó cuál cambia más deprisa y cómo termina cada una. Tu respuesta está guardada y nada la ha sobrescrito.\n\nAhora has seguido a las tres, más un modelo de cuarenta masas solares que termina como agujero negro. Escribe el relato que darías ahora.\n\nUn requisito: nombra una limitación de los modelos sobre los que se apoya toda esta lección. Hay varias y las lecturas te las han ido contando.',
      prompt:
        'Explica qué determina cómo vive una estrella y cómo termina, citando al menos dos de tus propias medidas, y nombra una cosa que estos modelos no te dicen.',
      tip: 'Tu cuaderno tiene cada medida con el modelo del que salió, la etapa en la que se tomó y —cuando un final se citó en vez de calcularse— el artículo del que se citó.',
    },
  ],
};
