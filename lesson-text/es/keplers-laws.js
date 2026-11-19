// =============================================================================
// keplers-laws - es
// -----------------------------------------------------------------------------
// A shadow of ../keplers-laws.js carrying only its words. Laid over the English lesson
// by mergeTranslation() in ../i18n.js, so anything absent here keeps its
// English and nothing here can reach the lesson's machinery: no scenario name,
// no seed, no widget id, no numeric answer, no probe.
//
// Arrays line up by index with the English. `null` means "not translated";
// that entry keeps its English.
// =============================================================================

export default {
  title: 'Las leyes de Kepler',
  subtitle: 'Mide la forma, el ritmo y la duración de órbitas reales',
  question:
    '¿Qué trayectoria sigue un planeta alrededor de su estrella, y qué fija lo rápido que se mueve y lo que dura su año?',
  medium: { name: 'la vista de la órbita en directo' },
  duration: '35-45 min',
  level: 'Astronomía introductoria',
  objectives: [
    'Indicar dónde se sitúa el cuerpo principal en una órbita elíptica, y respaldarlo con una medida',
    'Explicar por qué un cuerpo en órbita se mueve más rápido en el periastro, en términos de momento angular',
    'Medir el semieje mayor y el periodo de varios planetas y demostrar que P² ∝ a³',
    'Usar la tercera ley para predecir un periodo orbital, y decir de qué depende su constante',
  ],
  steps: {
    'eight-minutes-of-arc': {
      title: 'Tres preguntas sobre una órbita',
      body: '¿Qué trayectoria sigue un planeta alrededor de su estrella, y qué fija lo rápido que se mueve y lo que dura su año? Lo responderás en la vista de la órbita en directo: primero predices, y después mides distancias, velocidades y años en las órbitas que elijas.\n\nJohannes Kepler lo respondió hace cuatrocientos años a partir de posiciones de Marte medidas sin telescopio. Por qué confió en ellas llega después de tu primera predicción.',
      tip: 'Mientras una investigación está en marcha, pulsar selecciona un objeto sin abrir la ficha del inspector, y la colocación de objetos nuevos queda desactivada para que un clic accidental no altere el sistema que estás midiendo.',
    },
    'what-you-are-looking-at': {
      title: 'Lo que estás mirando',
      body: 'Una sola estrella de una masa solar está en el centro de la vista con dos cuerpos orbitándola.\n\nEl cuerpo <strong>azul pálido</strong> de la trayectoria ancha y casi redonda es el Orbitador Circular. El cuerpo <strong>naranja</strong> de la trayectoria estirada es el Orbitador Excéntrico, que se acerca mucho más a la estrella y se aleja mucho más. Las órbitas casi circulares son las que siguen la mayoría de los planetas del Sistema Solar, que es exactamente por lo que la elipse pasó desapercibida tanto tiempo.\n\nLa escena está en pausa y el anillo señala la estrella. Todavía no se mide nada: el paso siguiente te pide decir dónde se sitúa esa estrella dentro de la trayectoria del cuerpo naranja antes de mirar más de cerca.',
      tip: 'Todavía no hay que seleccionar nada. Si la escena se ve mal, pulsa el botón de reinicio junto a la barra de progreso para reconstruir el sistema.',
    },
    'where-is-the-star': {
      title: '¿Dónde está la estrella?',
      body: 'Una elipse tiene un centro, a mitad de su diámetro largo, y dos puntos especiales llamados focos, uno a cada lado del centro.\n\nMira la trayectoria del cuerpo naranja y dónde se sitúa la estrella dentro de ella. Comprométete con una respuesta antes de medir nada: el paso siguiente te da una manera de comprobarla.',
      prompt: 'La estrella se sitúa en…',
      options: [
        'el centro de la elipse',
        'uno de los focos de la elipse, descentrado',
        'el punto más cercano de la órbita',
        'un punto que se mueve conforme se mueve el planeta',
      ],
      because:
        'La estrella se sitúa en uno de los focos, y el otro foco está vacío: allí no hay absolutamente nada. Esto no es una casualidad del Sistema Solar: cualquier atracción con ley del inverso del cuadrado produce una sección cónica con la fuente en un foco, cosa que Newton demostró sesenta años después de que Kepler la midiera. En un círculo los dos focos se funden en el centro, y por eso una órbita de baja excentricidad parece centrada.',
    },
    'find-the-foci': {
      title: 'Encuentra el foco vacío',
      body: 'La simulación puede dibujar la elipse que sigue un planeta, con los dos focos marcados. Úsala para comprobar tu predicción con dos cosas que lees tú mismo.\n\nPrimero toma las distancias. Selecciona el <strong>Orbitador Excéntrico</strong> en la lista de objetos y pulsa <strong>Tomar la lectura</strong> junto a <em>[[closest-approach|máximo acercamiento]]</em> y de nuevo junto a <em>distancia máxima</em>.\n\nDespués activa <strong>Geometría de la órbita</strong> en la ficha del planeta. Un panel enumera los puntos que puedes medir. Elige el punto de la estrella (<em>Foco en Kepler Star</em>) y el <em>Foco vacío</em>, con el puntero o con Izquierda, Derecha y Intro en la lista. El panel da la distancia entre los dos que elegiste: escríbela. La última casilla calcula cuánto dicen tus dos distancias que deben distar los focos.',
      tip: 'El panel se puede cerrar con su X cuando tengas el número. Los dos puntos se eligen uno tras otro; elegir un tercero sustituye al más antiguo.',
      fields: [
        {
          label: 'Orbitador Excéntrico: máximo acercamiento a la estrella',
          unit: 'UA',
          misconceptions: [
            {
              say: 'Esa lectura es del Orbitador Circular. Este paso trata del Orbitador Excéntrico: selecciónalo en la lista de objetos y toma la lectura otra vez.',
            },
          ],
        },
        {
          label: 'Orbitador Excéntrico: distancia máxima a la estrella',
          unit: 'UA',
          misconceptions: [
            {
              say: 'Esa lectura es del Orbitador Circular. Este paso trata del Orbitador Excéntrico: selecciónalo en la lista de objetos y toma la lectura otra vez.',
            },
          ],
        },
        {
          label: 'Distancia entre la estrella y el foco vacío, según el panel',
          unit: 'UA',
          misconceptions: [
            {
              say: 'Esa es la distancia de la estrella al centro de la elipse, que es solo la mitad del camino hasta el foco vacío. El foco vacío queda tan lejos del centro, al otro lado, como la estrella queda de él.',
            },
            {
              say: 'Esa es la distancia entre la estrella y el punto más cercano de la órbita, o entre el foco vacío y el punto lejano. Elige el punto de la estrella y el Foco vacío, y lee la distancia entre esos dos.',
            },
            {
              say: 'Esa es la distancia entre la estrella y el punto lejano de la órbita, o entre el foco vacío y el punto cercano. Elige el punto de la estrella y el Foco vacío, y lee la distancia entre esos dos.',
            },
          ],
        },
        {
          label: 'Lo que dicen tus dos distancias que distan los focos',
          unit: 'UA',
        },
      ],
    },
    'the-first-law-and-the': {
      title: 'La primera ley, y la anatomía de una elipse',
      quote: {
        text: 'Puesto que estos ocho minutos no podían ignorarse, ellos solos han abierto el camino a la reforma de toda la astronomía.',
        by: 'Johannes Kepler, Astronomia Nova, 1609',
      },
      body: 'Tycho Brahe midió posiciones planetarias con una precisión de un minuto de arco, el límite sin telescopio. Cuando Johannes Kepler ajustó las observaciones de Marte de Tycho a un círculo, el mejor ajuste fallaba por ocho minutos de arco, y confió en las medidas por encima de dos mil años de círculos.\n\n<strong>Primera ley</strong> de Kepler: todo planeta se mueve sobre una elipse, con la estrella en uno de los focos.\n\nUna elipse tiene dos focos. Su propiedad definitoria es que, para cualquier punto de la curva, las distancias a los dos focos suman siempre el mismo total. El <em>[[semi-major-axis|semieje mayor]]</em> <strong>a</strong> es la mitad del diámetro largo, y es el tamaño de la órbita. La <em>[[eccentricity|excentricidad]]</em> <strong>e</strong> es su forma: los focos quedan a una distancia <em>a</em> × <em>e</em> a cada lado del centro, así que <em>e</em> = 0 pone ambos focos en el centro y da un círculo, mientras que e acercándose a 1 estira la elipse hasta convertirla en una astilla.\n\nEl segundo foco es la parte rara. Allí no hay nada. Ninguna masa, ningún objeto, nada que lo marque. Es una consecuencia puramente geométrica de la fuerza del inverso del cuadrado.',
      tip: 'Arrastra el deslizador del paso siguiente para ver cómo se separan los focos a medida que crece e.',
      compare:
        'La estrella se sitúa en uno de los focos y el otro foco está vacío. La separación del panel y la que dan tus dos distancias son el mismo número porque los focos son simétricos respecto al centro.',
    },
    'change-the-shape': {
      title: 'Cambia la forma',
      body: 'Arrastra el deslizador de excentricidad del panel contiguo. Cada magnitud se dibuja en su propio color, según la leyenda de debajo.\n\n<strong>a</strong>, el semieje mayor, es la mitad del diámetro largo y fija el <em>tamaño</em> de la órbita. Aquí se mantiene fijo en pantalla para que solo cambie la forma. <strong>b</strong> es el semieje menor, la mitad del diámetro corto. <strong><em>c</em> = <em>a</em> × <em>e</em></strong> es lo lejos que queda cada foco del centro, así que la excentricidad es simplemente la fracción de a en que la estrella está descentrada.\n\nAmbos están ligados por <em>b</em> = <em>a</em> × √(1 − <em>e</em>²), y por eso la elipse se acorta a medida que se vuelve más excéntrica mientras su longitud se mantiene.\n\nFíjate en lo poco que tiene que crecer e antes de que la estrella se vea descentrada, y en lo difícil que es ver diferencia alguna por debajo de 0,1 aproximadamente. Por eso las órbitas casi circulares del Sistema Solar ocultaron la elipse durante dos mil años, y por eso fue Marte, uno de los planetas más excéntricos que Tycho podía medir bien, el que finalmente la delató.',
      presets: [
        {
          label: 'Venus',
          note: 'Venus tiene la órbita más redonda de cualquier planeta. Con esta excentricidad los dos focos están casi uno encima del otro y la órbita es indistinguible de un círculo a simple vista.',
        },
        {
          label: 'Tierra',
          note: 'La Tierra. El Sol está descentrado en torno al 1,7 % de a, lo que nos sitúa unos 5 millones de km más cerca en enero que en julio. No basta para causar las estaciones, que vienen de la inclinación del eje.',
        },
        {
          label: 'Marte',
          note: 'Marte, y la razón por la que Kepler llegó a ello. Con <em>e</em> = 0,093 la desviación respecto a un círculo es justo lo bastante grande como para aparecer en medidas a simple vista con precisión de un minuto de arco.',
        },
        {
          label: 'Mercurio',
          note: 'Mercurio, el planeta más excéntrico. El avance de su perihelio, minúsculo e inexplicado por Newton, fue una de las primeras confirmaciones de la relatividad general.',
        },
        {
          label: 'Plutón',
          note: 'Plutón. Su órbita es lo bastante excéntrica como para pasar unos veinte años de cada circuito de 248 años más cerca del Sol que Neptuno.',
        },
        {
          label: 'Halley',
          note: 'El cometa Halley. Va desde el interior de la órbita de Venus hasta más allá de Neptuno en un circuito de 76 años. Con esta excentricidad la elipse es un puro largo y fino con el Sol cerca de una de sus puntas.',
        },
        {
          label: 'Hale-Bopp',
          note: 'El cometa Hale-Bopp, brillante en 1997 y que no volverá hasta dentro de unos dos mil años. Apenas ligado.',
        },
        {
          label: 'Círculo',
          note: 'Un círculo perfecto: ambos focos quedan exactamente en el centro. Los círculos son elipses; solo son el caso especial que Kepler tuvo que dejar de considerar el único caso.',
        },
      ],
    },
    'what-sits-at-the-other': {
      title: '¿Qué hay en el otro foco?',
      body: 'Acabas de ver dos focos separarse a medida que crecía la excentricidad, con uno de ellos ocupado por la estrella.',
      prompt: 'En el segundo foco de una órbita planetaria hay…',
      options: [
        'una segunda estrella, invisible',
        'el centro de masas del sistema',
        'nada en absoluto',
        'el punto donde el planeta se mueve más despacio',
      ],
      because:
        'Nada en absoluto. El foco vacío es un rasgo geométrico de la elipse, no un lugar físico, y allí no hay ningún objeto ni ninguna fuerza. El centro de masas queda muy cerca de la estrella, no en el foco lejano, y el planeta se mueve más despacio en el apoastro, que es un punto de la órbita y no de su interior.',
    },
    'where-does-it-move-fastest': {
      title: '¿Dónde se mueve más rápido?',
      body: 'La distancia del planeta excéntrico a su estrella cambia durante toda la órbita: se acerca mucho y se aleja mucho. Piensa en lo que eso hace a su velocidad y comprométete con una respuesta antes de medir nada.',
      prompt: 'El planeta excéntrico se mueve más rápido…',
      options: [
        'en su máximo acercamiento a la estrella',
        'en su punto más lejano de la estrella',
        'a la misma velocidad en todas partes',
        'a mitad de camino entre los dos',
      ],
      because:
        'Más rápido en el máximo acercamiento. Una cuña trazada cerca de la estrella es corta en radio, así que para encerrar la misma área tiene que ser larga en su arco: el planeta debe cubrir más terreno por unidad de tiempo cuando está cerca. Kepler encontró esta regla antes de encontrar la elipse, y es la razón de que el verano del hemisferio norte sea unos días más largo que el del sur: la Tierra está cerca del afelio en julio y se demora.',
    },
    'watch-it-happen': {
      title: 'Míralo suceder',
      body: 'Deja que la simulación corra y mantén seleccionado el planeta excéntrico. La velocidad en vivo de abajo cambia continuamente mientras da la vuelta, mientras que la forma de la órbita no cambia en absoluto.',
      checklist: [
        'Observa la lectura de velocidad cuando el planeta pasa junto a la estrella',
        'Obsérvala otra vez en el extremo lejano de la órbita',
        'Observa que el semieje mayor y la excentricidad apenas se mueven: la órbita es fija, solo cambia la posición sobre ella',
      ],
    },
    'equal-areas-however-you-slice': {
      title: 'Áreas iguales, sea cual sea el corte',
      body: 'La órbita en pantalla está cortada en rebanadas de igual tiempo, y cada rebanada lleva etiquetada su parte del área total. Cambia cuántas rebanadas hay y observa qué les ocurre a esos números.\n\nCon 5 rebanadas cada una es el 20 %. Con 12, cada una es el 8,3 %. El número es arbitrario; lo que no es arbitrario es que siempre son iguales. El planeta tarda exactamente el mismo tiempo en recorrer el tramo de órbita de cada rebanada, tanto si ese tramo es una carrera corta y rápida junto a la estrella como un arrastre largo y lento por el lado lejano.',
      tip: 'El tiempo de cuña de abajo es la respuesta real a «áreas iguales en tiempos iguales»: es el mismo número para todas las cuñas porque todas representan el mismo intervalo.',
    },
    'fast-and-slow-in-numbers': {
      title: 'Rápido y lento, en números',
      body: 'Ahora ponle números, y deja que la simulación encuentre los dos momentos por ti: atraparlos a mano mide tus reflejos, no la órbita.\n\nLa herramienta <strong>Pausar en un evento</strong> de abajo tiene elegidos el <strong>Orbitador Excéntrico</strong> y su estrella y, con tu predicción comprometida, está armada para el <strong>[[periapsis|periastro]]</strong>: la simulación corre hasta que el planeta llega a su punto más cercano y se detiene ahí. Selecciona el planeta en la lista de objetos y pulsa <strong>Tomar la lectura</strong> junto a la velocidad y junto a la distancia. Después fija el evento en el <strong>[[apoapsis|apoastro]]</strong>, pulsa <strong>Armar</strong> y toma las mismas dos lecturas en el extremo lejano.\n\nAmbos números se miden <strong>respecto a la estrella</strong>: la lectura resta el movimiento propio de la estrella, así que la distancia y la velocidad describen la órbita y no la deriva del par por el sistema de referencia. El cociente te lo calculamos nosotros.\n\nLa herramienta informa de cuándo <em>ocurrió</em> el evento y de cuánto se pasó la simulación al <em>detenerse</em>. Son cosas distintas: el mundo se integra por pasos y el evento cae entre dos de ellos, así que la velocidad que lees es la de un instante poco posterior al extremo. Para esta órbita la diferencia es pequeña, y lo honesto es saber que existe.',
      tip: 'Si la herramienta se niega a armar y dice que la órbita es circular, no es un fallo. En una órbita perfectamente redonda no hay punto más cercano: la tasa radial es cero en todas partes y su signo lo decide el error de redondeo, así que una vigilancia dispararía en el primer paso y en todos los siguientes. La herramienta declina y lo dice. El Eccentric Orbiter es bastante excéntrico; el Circular Orbiter no lo es, y vale la pena armarlo una vez para ver el rechazo.',
      fields: [
        {
          label: 'Velocidad en el máximo acercamiento',
          unit: 'km/s',
          misconceptions: [
            {
              say: 'Esa lectura es del Orbitador Circular. Este paso trata del Orbitador Excéntrico: selecciónalo en la lista de objetos y toma la lectura otra vez.',
            },
          ],
        },
        { label: 'Distancia a la estrella ahí', unit: 'AU' },
        {
          label: 'Velocidad en el punto más lejano',
          unit: 'km/s',
          misconceptions: [
            {
              say: 'Esa lectura es del Orbitador Circular. Este paso trata del Orbitador Excéntrico: selecciónalo en la lista de objetos y toma la lectura otra vez.',
            },
          ],
        },
        { label: 'Distancia a la estrella ahí', unit: 'AU' },
        { label: 'Cociente (rápida ÷ lenta)', unit: '' },
      ],
    },
    'why-the-speed-changes': {
      title: 'Por qué cambia la velocidad',
      body: 'Acabas de medir un planeta acelerando y frenando sobre una órbita fija, sin nada que lo empuje y sin quemar combustible. Algo se está intercambiando, y algo más se está conservando.',
      prompt:
        'En una o dos frases, explica por qué el planeta acelera al acercarse a la estrella. ¿Qué magnitud se mantiene constante, y por qué la gravedad no la cambia?',
      rubric:
        'El momento angular L = m·v·r·sen(ángulo) se conserva porque la gravedad es una fuerza central: actúa a lo largo de la línea que une los dos cuerpos y por tanto no ejerce par respecto a la estrella. Al caer r, v debe subir para mantener el producto constante. (La energía también se conserva, con la potencial convirtiéndose en cinética; cualquiera de los dos argumentos puntúa, pero el momento angular es el que da directamente la regla de las áreas iguales.)',
      compare:
        'El planeta es más rápido en su máximo acercamiento y más lento en su punto más lejano. Tus dos velocidades son la evidencia que debe explicar tu respuesta de abajo.',
    },
    'kepler-s-third-law': {
      title: 'La tercera ley de Kepler',
      body: 'Las dos primeras leyes describen una sola órbita. La tercera relaciona órbitas <em>distintas</em> entre sí, y a Kepler le costó otra década encontrarla: el cuadrado del [[period|periodo]] orbital es proporcional al cubo del semieje mayor.\n\nEscrita para una estrella de una masa solar con <em>P</em> en años y <em>a</em> en UA, la constante vale exactamente 1, así que la ley se lee simplemente <em>P</em>² = <em>a</em>³. La Tierra lo cumple trivialmente: 1² = 1³.\n\nEstás a punto de ponerla a prueba contra el Sistema Solar real. Estos son los semiejes mayores reales y las masas reales, así que tus medidas deberían coincidir con una tabla de libro de texto dentro de tu error de lectura. La Tierra está aquí de verdad a 1 UA, y su periodo sale de verdad en un año.\n\nUna cosa que hay que notar de entrada: la vista está encuadrada de Mercurio a Saturno, y Urano y Neptuno ya están fuera de pantalla. Neptuno está treinta veces más lejos del Sol que la Tierra, y ninguna vista única muestra a la vez los planetas interiores y los exteriores a un tamaño útil. Eso no es una limitación de este programa. Es la razón por la que casi todos los diagramas del Sistema Solar que has visto están dibujados a una escala falsa.',
      tip: 'Usa la rueda para hacer zoom. Los planetas siguen visibles como puntos pequeños por lejos que vayas, y siguen siendo pulsables, pero solo se separan bien cuando amplías. Nada se mueve, así que tómate tu tiempo.',
    },
    'measure-four-planets': {
      title: 'Mide los planetas',
      body: 'Selecciona un planeta y pulsa <strong>Añadir lectura</strong> para anotar juntos su semieje mayor y su periodo, con el nombre del planeta del que salieron. Elige al menos cinco, y elígelos bien repartidos, porque un rango estrecho de <em>a</em> no distingue una ley de potencias de una recta.\n\nHay sitio para los ocho planetas, y la recta ajustada mejora visiblemente conforme los añades. Mercurio, la Tierra, Júpiter y Saturno están al alcance con el zoom inicial; aleja la vista para Urano y Neptuno. Selecciona un punto de la gráfica, o una fila de la tabla, para rodear el planeta del que viene.\n\nSi los planetas exteriores aplastan a los interiores en un rincón de la gráfica, pulsa <strong>Ejes logarítmicos</strong>. En una gráfica log-log una ley de potencias es una recta sea cual sea su exponente, y todos los planetas reciben el mismo espacio.\n\nTus puntos aparecen en la gráfica según los añades. Anota lo que informa la simulación, no lo que recuerdes del Sistema Solar real.',
      fields: [
        { label: 'Planeta 1: nombre', unit: '' },
        { label: 'Planeta 1: a', unit: 'UA' },
        { label: 'Planeta 1: P', unit: 'a' },
        { label: 'Planeta 2: nombre', unit: '' },
        { label: 'Planeta 2: a', unit: 'UA' },
        { label: 'Planeta 2: P', unit: 'a' },
        { label: 'Planeta 3: nombre', unit: '' },
        { label: 'Planeta 3: a', unit: 'UA' },
        { label: 'Planeta 3: P', unit: 'a' },
        { label: 'Planeta 4: nombre', unit: '' },
        { label: 'Planeta 4: a', unit: 'UA' },
        { label: 'Planeta 4: P', unit: 'a' },
        { label: 'Planeta 5: nombre', unit: '' },
        { label: 'Planeta 5: a', unit: 'UA' },
        { label: 'Planeta 5: P', unit: 'a' },
        { label: 'Planeta 6: nombre', unit: '' },
        { label: 'Planeta 6: a', unit: 'UA' },
        { label: 'Planeta 6: P', unit: 'a' },
        { label: 'Planeta 7: nombre', unit: '' },
        { label: 'Planeta 7: a', unit: 'UA' },
        { label: 'Planeta 7: P', unit: 'a' },
        { label: 'Planeta 8: nombre', unit: '' },
        { label: 'Planeta 8: a', unit: 'UA' },
        { label: 'Planeta 8: P', unit: 'a' },
      ],
      plot: {
        title: 'Tus medidas',
        xLabel: 'a  (UA)',
        yLabel: 'P  (a)',
        transform: {
          label: 'Elevar <em>P</em> al cuadrado, <em>a</em> al cubo',
          xLabel: 'a³  (UA³)',
          yLabel: 'P²  (a²)',
        },
        note: 'En crudo, los puntos se curvan: una ley de potencias siempre lo hace. Pulsa <strong>Elevar <em>P</em> al cuadrado, <em>a</em> al cubo</strong> y deberían caer sobre una recta que pasa por el origen. Enderezar una curva eligiendo los ejes adecuados es la manera de identificar una ley de potencias, y la pendiente de esa recta es la constante de <em>P</em>² = <em>k</em>·<em>a</em>³.',
      },
      importLabel: 'Añadir lectura',
    },
    'work-the-law-out-step': {
      title: 'Deduce la ley, paso a paso',
      body: 'Toma tu planeta <strong>más exterior</strong>: el de mayor <em>a</em>. Copia sus dos valores en las dos primeras casillas de abajo y el resto se calcula por ti, etapa a etapa, para que veas de dónde sale el número.\n\nEleva la distancia al cubo. Eleva el periodo al cuadrado. Divide el segundo entre el primero. Si Kepler tenía razón, lo que salga no debería depender del planeta que hayas elegido.',
      fields: [
        { label: 'Semieje mayor a', unit: 'UA' },
        { label: 'Periodo P', unit: 'a' },
        { label: 'Paso 1: <em>a</em>³', unit: 'UA³' },
        { label: 'Paso 2: <em>P</em>²', unit: 'a²' },
        { label: 'Paso 3: <em>P</em>² ÷ <em>a</em>³', unit: '' },
      ],
    },
    'pick-a-distance': {
      title: 'Elige una órbita que nadie ha medido',
      body: 'La prueba de verdad de una ley es si predice algo que no has medido. Elige una distancia a la estrella, en UA, para un noveno planeta que no existe. Elige una que caiga en un hueco entre dos de los planetas que mediste, no encima de uno de ellos, para que la predicción signifique algo.\n\nNadie ha medido su periodo. Los dos pasos siguientes te piden que lo estimes a partir de tu gráfica y que después compruebes la estimación.',
      fields: [
        { label: 'Distancia del noveno planeta a la estrella', unit: 'UA' },
      ],
    },
    'estimate-the-year': {
      title: 'Estima su año',
      body: 'Mira tu gráfica y tu tabla. Estima el periodo orbital del planeta a la distancia que elegiste, en años. No calcules todavía una fórmula: léelo en el patrón y comprométete con un número. Queda sin marcar hasta el paso siguiente.',
      prompt: 'Periodo del noveno planeta',
    },
    'check-the-estimate': {
      title: 'Compruébala con un planeta real',
      body: 'Comprueba la estimación con el planeta cuya órbita esté más cerca de la que elegiste. Selecciona ese planeta y pulsa <strong>Tomar la lectura</strong> junto a su distancia y junto a su periodo.\n\nDespués usa la tercera ley de Kepler para calcular el periodo a tu distancia, escalando desde ese planeta, y ponlo en la última casilla. ¿Cae cerca de tu estimación?',
      fields: [
        { label: 'Planeta medido más cercano: distancia', unit: 'UA' },
        { label: 'Planeta medido más cercano: periodo', unit: 'años' },
        { label: 'Tu distancia como múltiplo de la de ese planeta', unit: '' },
        { label: 'Periodo a tu distancia, según la ley', unit: 'años' },
      ],
    },
    'compare-the-estimate': {
      compare:
        'La ley da un periodo solo a partir de la distancia. Donde tu estimación y el número de la ley difieren, la curva de la que leíste la estimación era la menos exacta de las dos.',
      title: 'Tu estimación y la ley',
      body: 'Arriba están tu estimación, el periodo que da la ley a tu distancia y el planeta desde el que lo escalaste. Una ley es más que una curva que pasa por tus puntos: dice cuál tiene que ser el periodo a una distancia que nadie ha medido, y un planeta puesto ahí estaría obligado a cumplirla.\n\nSi tu estimación se desvió, fíjate en de dónde salió: de leer a ojo una gráfica curva. Enderezar la gráfica, o usar el exponente, es para lo que sirve la ley.',
    },
    'what-the-constant-depends-on': {
      title: 'De qué depende la constante',
      body: 'Tus planetas tenían masas descabelladamente distintas, desde un pequeño mundo rocoso hasta un gigante gaseoso cientos de veces más pesado, y todos dieron el mismo <em>P</em>²/<em>a</em>³. ¿De qué depende entonces esa constante?\n\nAquí hay un planeta en una órbita circular a 1 UA. Pulsa <strong>Ejecutar A</strong> y lee su periodo; después <strong>Cambiar masa de la estrella</strong> y pulsa <strong>Ejecutar B</strong>: el mismo planeta a la misma distancia, alrededor de una estrella de doble masa. Las dos ejecuciones quedan en la tabla.',
      prompt:
        'La constante de <em>P</em>² = <em>k</em>·<em>a</em>³ depende de…',
      options: [
        'la masa del planeta',
        'la masa de la estrella',
        'la excentricidad de la órbita',
        'nada: es la misma en todo el universo',
      ],
      because:
        'Depende de la masa central: Newton demostró que <em>k</em> = 4π<sup>2</sup>/<em>G</em>(<em>M</em>+<em>m</em>) y, dado que <em>M</em> ≫ <em>m</em> para un planeta, la masa del propio planeta se cancela. Leído al revés, esta es una manera de pesar cosas que nunca podrás visitar. Mide un periodo y una distancia, y la masa sale sola. Así se pesó el Sol por primera vez, así se pesan hoy las estrellas anfitrionas de exoplanetas, y así se pesó el agujero negro de cuatro millones de masas solares del centro de la Vía Láctea, siguiendo la estrella S2 a lo largo de una órbita de dieciséis años.',
      variation: { label: 'masa de la estrella' },
    },
    'what-newton-added': {
      title: 'Lo que añadió Newton',
      body: 'Las tres leyes de Kepler describen el Sistema Solar, pero no lo explican. Kepler las encontró ajustando curvas a los números de Tycho a lo largo de veinte años de aritmética; no tenía ni idea de <em>por qué</em> las órbitas debían ser elipses ni de por qué los periodos debían escalar así.\n\nSesenta años después Newton dedujo las tres a partir de un solo supuesto: que la gravedad decae como el inverso del cuadrado de la distancia. La elipse, las áreas iguales y la ley de la potencia tres medios salen todas como consecuencias. Y al deducirlas encontró la corrección que Kepler no podía conocer:\n\n<em>P</em>² = 4π<sup>2</sup> <em>a</em>³ / <em>G</em>(<em>M</em> + <em>m</em>)\n\nLa versión de Kepler suponía que la constante era la misma para todo lo que orbitara el Sol. La de Newton muestra que depende de la masa <strong>total</strong>. Para un planeta alrededor de una estrella, la masa del propio planeta es despreciable y las dos coinciden, y por eso funcionaba la versión de Kepler. Para dos estrellas de masa comparable orbitándose entre sí, no, y solo la forma de Newton es correcta.\n\nEsto es lo que convirtió una descripción de un sistema solar en una herramienta que funciona en cualquier parte.',
      tip: 'Despejada para M, esta ecuación es la manera en que se mide esencialmente toda masa estelar de la literatura.',
    },
    'the-same-laws-forty-light': {
      title: 'Las mismas leyes, a cuarenta años luz',
      body: 'En pantalla está TRAPPIST-1, una enana roja real con siete planetas, ninguno de los cuales Kepler habría podido imaginar. Tiene una décima parte de la masa del Sol y sus planetas orbitan más cerca que Mercurio, así que nada de ella se parece al sistema que Kepler ajustó.\n\nLas leyes se cumplen de todos modos. Pulsa cualquier planeta y se dibujan las cuñas de área igual para su órbita; pulsa otro y se redibujan para ese. Las rebanadas de cada planeta son iguales entre sí, y cada planeta tiene su propio periodo, pero todos ellos satisfacen el mismo <em>P</em> al cuadrado sobre <em>a</em> al cubo, con la constante fijada por la masa de esta estrella en lugar de la del Sol.',
      checklist: [
        'Pulsa un planeta interior y anota su semieje mayor y su periodo',
        'Pulsa un planeta exterior y observa que ambos son mayores',
        'Anota a y P del planeta que quieras usar a continuación',
        'Fíjate en que los periodos están en días, no en años: este sistema es muy compacto',
      ],
    },
    'weigh-trappist-1-yourself': {
      title: 'Pesa TRAPPIST-1 tú mismo',
      body: 'Elige cualquiera de los siete planetas, lee su semieje mayor y su periodo en la lectura e introdúcelos abajo. La aritmética se hace por ti etapa a etapa, para que veas de dónde sale el número.\n\nCuidado con las unidades. La lectura da los periodos en <em>días</em>, y <em>M</em> = <em>a</em>³ / <em>P</em>² solo devuelve masas solares cuando <em>P</em> está en <strong>años</strong> y a en <strong>UA</strong>. Convertir es el paso donde tropieza la gente.',
      fields: [
        { label: 'Planeta que estás usando', unit: '' },
        { label: 'Semieje mayor a', unit: 'UA' },
        { label: 'Periodo P', unit: 'días' },
        { label: 'Paso 1: periodo en años (días / 365,25)', unit: 'a' },
        { label: 'Paso 2: <em>a</em> al cubo', unit: 'UA al cubo' },
        { label: 'Paso 3: <em>P</em> al cuadrado', unit: 'a al cuadrado' },
        {
          label: 'Paso 4: masa estelar = <em>a</em>³ / <em>P</em>²',
          unit: 'M_sol',
        },
      ],
    },
    'weighing-another-star': {
      title: 'Pesar otra estrella',
      body: 'Aquí está la recompensa. Kepler-10 es una estrella parecida al Sol a unos 600 años luz con un planeta de 2,4 radios terrestres, Kepler-10c, descubierto por [[transit|tránsito]]. Su órbita tiene un semieje mayor de unas 0,24 UA y un periodo de unos 45 días, que son 0,123 años.\n\nUsa la forma de Newton, tomando la masa del planeta como despreciable:\n\n<em>M</em> = <em>a</em>³ / <em>P</em>²  (en masas solares, con <em>a</em> en UA y <em>P</em> en años)\n\n<strong>Paso 1.</strong> Eleva la distancia al cubo: 0,24³ = 0,0138.\n\n<strong>Paso 2.</strong> Eleva el periodo al cuadrado: 0,123² = 0,0151.\n\n<strong>Paso 3.</strong> Divide.',
      prompt: 'Masa de Kepler-10, en masas solares',
      unit: 'M_sol',
      because:
        'Unas 0,91 masas solares, que está a un pequeño porcentaje del valor publicado de 0,91. Acabas de pesar una estrella a 600 años luz usando nada más que una distancia, un periodo y una relación que Kepler encontró ajustando Marte. Este es el método estándar: esencialmente toda masa estelar de la literatura sobre exoplanetas procede de alguna versión de este cálculo.',
      misconceptions: [
        {
          say: 'El periodo tiene que estar en años para esta forma de la ley. Usar 45 días en lugar de 0,123 años divide la respuesta entre 365,25².',
        },
      ],
      hints: {
        concept:
          'La versión de Newton de la tercera ley dice que el periodo y el tamaño de la órbita juntos te dan la masa de aquello que se orbita. Esa es toda la razón por la que importa.',
        method:
          '<em>M</em> = <em>a</em>³ / <em>P</em>², con <em>a</em> en UA y <em>P</em> en *años*. El periodo se da en días y también en años: usa los años.',
      },
      worked:
        '<em>a</em> = 0,24, así que <em>a</em>³ = 0,0138. <em>P</em> = 0,123 años, luego <em>P</em>² = 0,01513. 0,0138 / 0,01513 = 0,91 masas solares, dentro de un pequeño porcentaje del valor publicado.',
      feedback: {
        close:
          'Cerca. Revisa por separado el cubo y el cuadrado, y el redondeo de cada uno.',
        'wrong-unit':
          'La respuesta se pasa por un factor de 365, los días de un año. Pon el periodo en años, no en días.',
        'wrong-order-of-magnitude':
          'Te pasas en potencias de diez. Asegúrate de que el periodo esté en años, no en días: la cifra en días es mucho mayor que el mismo tiempo en años.',
        off: 'Hazlo en tres partes: <em>a</em> al cubo, luego <em>P</em> al cuadrado, y divide la primera entre la segunda.',
      },
    },
    'where-kepler-s-version-breaks': {
      title: 'Dónde falla la versión de Kepler',
      body: 'La corrección de Newton sustituye la constante de Kepler por una que depende de <em>M</em> + <em>m</em> en lugar de solo de <em>M</em>.',
      prompt: '¿Para qué sistema importa más esa corrección?',
      options: [
        'La Tierra orbitando el Sol',
        'Un planeta de masa joviana orbitando una estrella parecida al Sol',
        'Dos enanas blancas de igual masa orbitándose entre sí',
        'Una nave espacial orbitando la Tierra',
      ],
      because:
        'Dos masas iguales. Ahí <em>m</em> = <em>M</em>, así que <em>M</em> + <em>m</em> es el doble de lo que supone la versión de Kepler y el periodo predicho falla en un factor √2, alrededor del 41 %. En los otros tres casos el cuerpo en órbita es entre una millonésima y una milésima de la masa central y la corrección es invisible. Es exactamente este término el que permite a los astrónomos medir las masas individuales de un sistema binario en lugar de solo su suma.',
    },
    'where-this-leaves-you': {
      title: 'Dónde te deja esto',
      body: 'Las tres leyes no son tres hechos separados. Una sola atracción hacia la estrella, que se debilita con el cuadrado de la distancia, las produce todas, y por eso se cumplen en TRAPPIST-1 igual que aquí. Describen un cuerpo ligero que gira alrededor de otro mucho más pesado: cuando las dos masas son parecidas, como en una pareja de estrellas, las dos se mueven, y el periodo depende de su suma.',
      tip: 'Si vas a entregar esto para una calificación, pulsa Terminar para introducir tu nombre y descargar tu informe de laboratorio. Si no, simplemente puedes cerrar el panel.',
    },
  },
};
