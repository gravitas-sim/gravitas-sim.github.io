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
  duration: '35-45 min',
  level: 'Astronomía introductoria',
  summary:
    'Recorre las tres leyes de Kepler midiendo órbitas en lugar de que te las enseñen: encuentra el foco de una elipse, observa cómo se barren áreas iguales en tiempos iguales y recupera la ley de la potencia tres medios trazándola tú mismo.',
  objectives: [
    'Indicar dónde se sitúa el cuerpo principal en una órbita elíptica, y respaldarlo con una medida',
    'Explicar por qué un cuerpo en órbita se mueve más rápido en el periastro, en términos de momento angular',
    'Medir el semieje mayor y el periodo de varios planetas y demostrar que P² ∝ a³',
    'Usar la tercera ley para predecir un periodo orbital, y decir de qué depende su constante',
  ],
  steps: [
    {
      title: 'Ocho minutos de arco',
      body: 'Durante casi toda la historia registrada las órbitas fueron círculos. Cuando las observaciones no encajaban, los astrónomos añadían más círculos —epiciclos— hasta que el modelo cuadraba. Copérnico movió el Sol al centro pero mantuvo los círculos, y su modelo no fue más preciso que el que sustituía.\n\nLo que rompió el círculo fueron los datos. Tycho Brahe pasó dos décadas midiendo posiciones planetarias con una precisión de un minuto de arco, el límite de lo posible sin telescopio. Cuando Johannes Kepler intentó ajustar las observaciones de Marte de Tycho a una órbita circular, el mejor ajuste que consiguió fallaba por ocho minutos de arco. Podría haber llamado a eso error observacional y haber seguido adelante. En vez de eso confió en las medidas de Tycho por encima de dos mil años de suposiciones, y pasó años averiguando qué curva encajaría.\n\nLa respuesta fue una elipse, con el Sol fuera de su centro.',
      quote: {
        text: 'Puesto que estos ocho minutos no podían ignorarse, ellos solos han abierto el camino a la reforma de toda la astronomía.',
        by: 'Johannes Kepler, Astronomia Nova, 1609',
      },
      tip: 'Mientras una lección está en marcha, pulsar selecciona un objeto sin abrir la ficha del inspector, y la colocación de objetos nuevos queda desactivada para que un clic accidental no altere el sistema que estás midiendo.',
    },
    {
      title: 'Lo que estás mirando',
      body: 'Una sola estrella de una masa solar está en el centro de la vista con dos cuerpos orbitándola.\n\nEl cuerpo <strong>azul pálido</strong> de la trayectoria ancha y casi redonda es el Orbitador Circular. El cuerpo <strong>naranja</strong> de la trayectoria estirada es el Orbitador Excéntrico, que se acerca mucho más a la estrella y se aleja mucho más. Las órbitas casi circulares son las que siguen la mayoría de los planetas del Sistema Solar, que es exactamente por lo que la elipse pasó desapercibida tanto tiempo.\n\nLas cuñas de colores que se abren en abanico detrás del cuerpo naranja tienen todas la misma área. Obsérvalas un momento: cerca de la estrella son estrechas y largas, lejos son anchas y cortas. Esa es la segunda ley de Kepler dibujándose sola, antes de que hayas medido nada.',
      tip: 'Todavía no hay que seleccionar nada. Si las cuñas no aparecen, pulsa el botón de reinicio junto a la barra de progreso para reconstruir el sistema.',
    },
    {
      title: '¿Dónde está la estrella?',
      body: 'Una elipse tiene un centro y dos focos. En un círculo los tres coinciden; cuanto más alargada es la elipse, más lejos del centro quedan los focos.\n\nMira la trayectoria del cuerpo naranja y dónde se sitúa la estrella dentro de ella. Comprométete con una respuesta antes de medir nada.',
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
    {
      title: 'La primera ley, y la anatomía de una elipse',
      body: '<strong>Primera ley</strong> de Kepler: todo planeta se mueve sobre una elipse, con la estrella en uno de los focos.\n\nUna elipse tiene dos focos. Su propiedad definitoria es que, para cualquier punto de la curva, las distancias a los dos focos suman siempre el mismo total. El <em>semieje mayor</em> <strong>a</strong> es la mitad del diámetro largo, y es el tamaño de la órbita. La <em>excentricidad</em> <strong>e</strong> es su forma: los focos quedan a una distancia a x e a cada lado del centro, así que e = 0 pone ambos focos en el centro y da un círculo, mientras que e acercándose a 1 estira la elipse hasta convertirla en una astilla.\n\nEl segundo foco es la parte rara. Allí no hay nada. Ninguna masa, ningún objeto, nada que lo marque. Es una consecuencia puramente geométrica de la fuerza del inverso del cuadrado.',
      tip: 'Arrastra el deslizador del paso siguiente para ver cómo se separan los focos a medida que crece e.',
    },
    {
      title: 'Cambia la forma',
      body: 'Arrastra el deslizador de excentricidad del panel contiguo. Cada magnitud se dibuja en su propio color, según la leyenda de debajo.\n\n<strong>a</strong>, el semieje mayor, es la mitad del diámetro largo y fija el <em>tamaño</em> de la órbita. Aquí se mantiene fijo en pantalla para que solo cambie la forma. <strong>b</strong> es el semieje menor, la mitad del diámetro corto. <strong>c = a x e</strong> es lo lejos que queda cada foco del centro, así que la excentricidad es simplemente la fracción de a en que la estrella está descentrada.\n\nAmbos están ligados por b = a x raíz(1 - e al cuadrado), y por eso la elipse se acorta a medida que se vuelve más excéntrica mientras su longitud se mantiene.\n\nFíjate en lo poco que tiene que crecer e antes de que la estrella se vea descentrada, y en lo difícil que es ver diferencia alguna por debajo de 0,1 aproximadamente. Por eso las órbitas casi circulares del Sistema Solar ocultaron la elipse durante dos mil años, y por eso fue Marte, uno de los planetas más excéntricos que Tycho podía medir bien, el que finalmente la delató.',
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
          note: 'Marte, y la razón por la que Kepler llegó a ello. Con e = 0,093 la desviación respecto a un círculo es justo lo bastante grande como para aparecer en medidas a simple vista con precisión de un minuto de arco.',
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
    {
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
    {
      title: 'Mide las dos órbitas',
      body: 'Pulsa el <strong>Orbitador Circular</strong> y lee sus valores en la lectura en vivo, después pulsa el <strong>Orbitador Excéntrico</strong> y lee los suyos.\n\nLa excentricidad <em>e</em> va de 0 para un círculo perfecto a algo menos de 1 para una elipse muy alargada. Para comparar: la Tierra es 0,017, Marte 0,093, Plutón 0,249 y el cometa Halley 0,967.',
      fields: [
        {
          label: 'Orbitador Circular: excentricidad e',
          unit: '',
        },
        {
          label: 'Orbitador Excéntrico: excentricidad e',
          unit: '',
        },
        {
          label: 'Orbitador Excéntrico: máximo acercamiento',
          unit: 'UA',
        },
        {
          label: 'Orbitador Excéntrico: distancia máxima',
          unit: 'UA',
        },
        {
          label: 'Semieje mayor a partir de tus dos distancias',
          unit: 'UA',
        },
      ],
    },
    {
      title: '¿Dónde se mueve más rápido?',
      body: 'La segunda ley de Kepler dice que una línea trazada de la estrella al planeta barre áreas iguales en tiempos iguales. Piensa en lo que eso obliga a hacer a la velocidad en distintos puntos de la órbita.',
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
    {
      title: 'Míralo suceder',
      body: 'Deja que la simulación corra y mantén seleccionado el planeta excéntrico. La velocidad en vivo de abajo cambia continuamente mientras da la vuelta, mientras que la forma de la órbita no cambia en absoluto.',
      checklist: [
        'Observa la lectura de velocidad cuando el planeta pasa junto a la estrella',
        'Obsérvala otra vez en el extremo lejano de la órbita',
        'Observa que el semieje mayor y la excentricidad apenas se mueven: la órbita es fija, solo cambia la posición sobre ella',
        'Fíjate en las cuñas: finas y largas cerca de la estrella, anchas y cortas lejos, pero de igual área',
      ],
    },
    {
      title: 'Áreas iguales, sea cual sea el corte',
      body: 'La órbita en pantalla está cortada en rebanadas de igual tiempo, y cada rebanada lleva etiquetada su parte del área total. Cambia cuántas rebanadas hay y observa qué les ocurre a esos números.\n\nCon 5 rebanadas cada una es el 20 %. Con 12, cada una es el 8,3 %. El número es arbitrario; lo que no es arbitrario es que siempre son iguales. El planeta tarda exactamente el mismo tiempo en recorrer el tramo de órbita de cada rebanada, tanto si ese tramo es una carrera corta y rápida junto a la estrella como un arrastre largo y lento por el lado lejano.',
      tip: 'El tiempo de cuña de abajo es la respuesta real a «áreas iguales en tiempos iguales»: es el mismo número para todas las cuñas porque todas representan el mismo intervalo.',
    },
    {
      title: 'Rápido y lento, en números',
      body: 'Ahora ponle números. Pulsa <strong>Espacio</strong> para pausar y reanudar, y atrapa el planeta en cada extremo de su órbita.\n\nAnota su velocidad cuando esté <strong>más cerca</strong> de la estrella, y de nuevo cuando esté <strong>más lejos</strong>. Vigila la lectura «Distancia a la estrella» para saber cuándo estás en cada extremo: alcanza un mínimo en el máximo acercamiento y un máximo en el extremo lejano. El cociente se calcula por ti.',
      fields: [
        {
          label: 'Velocidad en el máximo acercamiento',
          unit: 'km/s',
        },
        {
          label: 'Velocidad en el punto más lejano',
          unit: 'km/s',
        },
        {
          label: 'Cociente (rápida ÷ lenta)',
          unit: '',
        },
      ],
    },
    {
      title: 'Por qué cambia la velocidad',
      body: 'Acabas de medir un planeta acelerando y frenando sobre una órbita fija, sin nada que lo empuje y sin quemar combustible. Algo se está intercambiando, y algo más se está conservando.',
      prompt:
        'En una o dos frases, explica por qué el planeta acelera al acercarse a la estrella. ¿Qué magnitud se mantiene constante, y por qué la gravedad no la cambia?',
      rubric:
        'El momento angular L = m·v·r·sen(ángulo) se conserva porque la gravedad es una fuerza central: actúa a lo largo de la línea que une los dos cuerpos y por tanto no ejerce par respecto a la estrella. Al caer r, v debe subir para mantener el producto constante. (La energía también se conserva, con la potencial convirtiéndose en cinética; cualquiera de los dos argumentos puntúa, pero el momento angular es el que da directamente la regla de las áreas iguales.)',
    },
    {
      title: 'La tercera ley de Kepler',
      body: 'Las dos primeras leyes describen una sola órbita. La tercera relaciona órbitas <em>distintas</em> entre sí, y a Kepler le costó otra década encontrarla: el cuadrado del periodo orbital es proporcional al cubo del semieje mayor.\n\nEscrita para una estrella de una masa solar con <em>P</em> en años y <em>a</em> en UA, la constante vale exactamente 1, así que la ley se lee simplemente P² = a³. La Tierra lo cumple trivialmente: 1² = 1³.\n\nEstás a punto de ponerla a prueba contra el Sistema Solar real. Estos son los semiejes mayores reales y las masas reales, así que tus medidas deberían coincidir con una tabla de libro de texto dentro de tu error de lectura. La Tierra está aquí de verdad a 1 UA, y su periodo sale de verdad en un año.\n\nUna cosa que hay que notar de entrada: la vista está encuadrada de Mercurio a Saturno, y Urano y Neptuno ya están fuera de pantalla. Neptuno está treinta veces más lejos del Sol que la Tierra, y ninguna vista única muestra a la vez los planetas interiores y los exteriores a un tamaño útil. Eso no es una limitación de este programa. Es la razón por la que casi todos los diagramas del Sistema Solar que has visto están dibujados a una escala falsa.',
      tip: 'Usa la rueda para hacer zoom. Los planetas siguen visibles como puntos pequeños por lejos que vayas, y siguen siendo pulsables, pero solo se separan bien cuando amplías. Nada se mueve, así que tómate tu tiempo.',
    },
    {
      title: 'Mide cuatro planetas',
      body: 'Pulsa cada planeta por turno y anota su semieje mayor y su periodo. Elige cuatro que estén bien repartidos, porque un rango estrecho de <em>a</em> no distingue una ley de potencias de una recta.\n\nHay sitio para los ocho planetas, y la recta ajustada mejora visiblemente conforme los añades. Mercurio, la Tierra, Júpiter y Saturno están al alcance con el zoom inicial; aleja la vista para Urano y Neptuno.\n\nSi los planetas exteriores aplastan a los interiores en un rincón de la gráfica, pulsa <strong>Ejes logarítmicos</strong>. En una gráfica log-log una ley de potencias es una recta sea cual sea su exponente, y todos los planetas reciben el mismo espacio.\n\nTus puntos aparecen en la gráfica según los escribes. Anota lo que informa la simulación, no lo que recuerdes del Sistema Solar real.',
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
          label: 'Elevar P al cuadrado, a al cubo',
          xLabel: 'a³  (UA³)',
          yLabel: 'P²  (a²)',
        },
        note: 'En crudo, los puntos se curvan: una ley de potencias siempre lo hace. Pulsa <strong>Elevar P al cuadrado, a al cubo</strong> y deberían caer sobre una recta que pasa por el origen. Enderezar una curva eligiendo los ejes adecuados es la manera de identificar una ley de potencias, y la pendiente de esa recta es la constante de P² = k·a³.',
      },
    },
    {
      title: 'Deduce la ley, paso a paso',
      body: 'Toma tu planeta <strong>más exterior</strong>: el de mayor <em>a</em>. Copia sus dos valores en las dos primeras casillas de abajo y el resto se calcula por ti, etapa a etapa, para que veas de dónde sale el número.\n\nEleva la distancia al cubo. Eleva el periodo al cuadrado. Divide el segundo entre el primero. Si Kepler tenía razón, lo que salga no debería depender del planeta que hayas elegido.',
      fields: [
        { label: 'Semieje mayor a', unit: 'UA' },
        { label: 'Periodo P', unit: 'a' },
        { label: 'Paso 1: a³', unit: 'UA³' },
        { label: 'Paso 2: P²', unit: 'a²' },
        { label: 'Paso 3: P² ÷ a³', unit: '' },
      ],
    },
    {
      title: 'Usa la ley',
      body: 'La prueba de verdad de una ley es si predice algo que no has medido.\n\nSupón que un noveno planeta orbitara esta misma estrella con un semieje mayor de exactamente 4 UA, entre Marte y Júpiter. Nadie ha medido su periodo, porque no existe. Calcúlalo de todos modos.\n\n<strong>Paso 1.</strong> Sabes que P² = a³, y sabes que a = 4 UA.\n\n<strong>Paso 2.</strong> Eleva la distancia al cubo: a³ = 4 × 4 × 4 = 64. Así que P² = 64.\n\n<strong>Paso 3.</strong> Tienes P al cuadrado, pero la pregunta pide P. Deshaz el cuadrado con la raíz cuadrada: P = √64.\n\n¿Cuánto es?',
      prompt: 'Periodo orbital de un planeta a a = 4 UA',
      unit: 'años',
      because:
        'P = 8 años. Ahora pruébalo con un planeta que sí mediste: Júpiter está a 5,204 UA, así que a³ = 141,0 y P = √141,0 = 11,87 años. La tabla dice 11,86. Acabas de predecir el año de un planeta real a partir de nada más que su distancia.',
    },
    {
      title: 'De qué depende la constante',
      body: 'Tus cuatro planetas tenían masas descabelladamente distintas: desde un pequeño mundo rocoso hasta un gigante gaseoso cientos de veces más pesado, y todos dieron el mismo P²/a³.',
      prompt: 'La constante de P² = k·a³ depende de…',
      options: [
        'la masa del planeta',
        'la masa de la estrella',
        'la excentricidad de la órbita',
        'nada: es la misma en todo el universo',
      ],
      because:
        'Depende de la masa central: Newton demostró que k = 4π²/G(M+m) y, dado que M ≫ m para un planeta, la masa del propio planeta se cancela. Leído al revés, esta es una manera de pesar cosas que nunca podrás visitar. Mide un periodo y una distancia, y la masa sale sola. Así se pesó el Sol por primera vez, así se pesan hoy las estrellas anfitrionas de exoplanetas, y así se pesó el agujero negro de cuatro millones de masas solares del centro de la Vía Láctea, siguiendo la estrella S2 a lo largo de una órbita de dieciséis años.',
    },
    {
      title: 'Lo que añadió Newton',
      body: 'Las tres leyes de Kepler describen el Sistema Solar, pero no lo explican. Kepler las encontró ajustando curvas a los números de Tycho a lo largo de veinte años de aritmética; no tenía ni idea de <em>por qué</em> las órbitas debían ser elipses ni de por qué los periodos debían escalar así.\n\nSesenta años después Newton dedujo las tres a partir de un solo supuesto: que la gravedad decae como el inverso del cuadrado de la distancia. La elipse, las áreas iguales y la ley de la potencia tres medios salen todas como consecuencias. Y al deducirlas encontró la corrección que Kepler no podía conocer:\n\nP² = 4π² a³ / G(M + m)\n\nLa versión de Kepler suponía que la constante era la misma para todo lo que orbitara el Sol. La de Newton muestra que depende de la masa <strong>total</strong>. Para un planeta alrededor de una estrella, la masa del propio planeta es despreciable y las dos coinciden, y por eso funcionaba la versión de Kepler. Para dos estrellas de masa comparable orbitándose entre sí, no, y solo la forma de Newton es correcta.\n\nEsto es lo que convirtió una descripción de un sistema solar en una herramienta que funciona en cualquier parte.',
      tip: 'Despejada para M, esta ecuación es la manera en que se mide esencialmente toda masa estelar de la literatura.',
    },
    {
      title: 'Las mismas leyes, a cuarenta años luz',
      body: 'En pantalla está TRAPPIST-1, una enana roja real con siete planetas, ninguno de los cuales Kepler habría podido imaginar. Tiene una décima parte de la masa del Sol y sus planetas orbitan más cerca que Mercurio, así que nada de ella se parece al sistema que Kepler ajustó.\n\nLas leyes se cumplen de todos modos. Pulsa cualquier planeta y se dibujan las cuñas de área igual para su órbita; pulsa otro y se redibujan para ese. Las rebanadas de cada planeta son iguales entre sí, y cada planeta tiene su propio periodo, pero todos ellos satisfacen el mismo P al cuadrado sobre a al cubo, con la constante fijada por la masa de esta estrella en lugar de la del Sol.',
      checklist: [
        'Pulsa un planeta interior y anota su semieje mayor y su periodo',
        'Pulsa un planeta exterior y observa que ambos son mayores',
        'Anota a y P del planeta que quieras usar a continuación',
        'Fíjate en que los periodos están en días, no en años: este sistema es muy compacto',
      ],
    },
    {
      title: 'Pesa TRAPPIST-1 tú mismo',
      body: 'Elige cualquiera de los siete planetas, lee su semieje mayor y su periodo en la lectura e introdúcelos abajo. La aritmética se hace por ti etapa a etapa, para que veas de dónde sale el número.\n\nCuidado con las unidades. La lectura da los periodos en <em>días</em>, y M = a al cubo / P al cuadrado solo devuelve masas solares cuando P está en <strong>años</strong> y a en <strong>UA</strong>. Convertir es el paso donde tropieza la gente.',
      fields: [
        { label: 'Planeta que estás usando', unit: '' },
        { label: 'Semieje mayor a', unit: 'UA' },
        { label: 'Periodo P', unit: 'días' },
        { label: 'Paso 1: periodo en años (días / 365,25)', unit: 'a' },
        { label: 'Paso 2: a al cubo', unit: 'UA al cubo' },
        { label: 'Paso 3: P al cuadrado', unit: 'a al cuadrado' },
        {
          label: 'Paso 4: masa estelar = a al cubo / P al cuadrado',
          unit: 'M_sol',
        },
      ],
    },
    {
      title: 'Pesar otra estrella',
      body: 'Aquí está la recompensa. Kepler-10 es una estrella parecida al Sol a unos 600 años luz con un planeta rocoso, Kepler-10c, descubierto por tránsito. Su órbita tiene un semieje mayor de unas 0,24 UA y un periodo de unos 45 días, que son 0,123 años.\n\nUsa la forma de Newton, tomando la masa del planeta como despreciable:\n\nM = a³ / P²  (en masas solares, con a en UA y P en años)\n\n<strong>Paso 1.</strong> Eleva la distancia al cubo: 0,24³ = 0,0138.\n\n<strong>Paso 2.</strong> Eleva el periodo al cuadrado: 0,123² = 0,0151.\n\n<strong>Paso 3.</strong> Divide.',
      prompt: 'Masa de Kepler-10, en masas solares',
      unit: 'M_sol',
      because:
        'Unas 0,91 masas solares, que está a un pequeño porcentaje del valor publicado de 0,91. Acabas de pesar una estrella a 600 años luz usando nada más que una distancia, un periodo y una relación que Kepler encontró ajustando Marte. Este es el método estándar: esencialmente toda masa estelar de la literatura sobre exoplanetas procede de alguna versión de este cálculo.',
    },
    {
      title: 'Dónde falla la versión de Kepler',
      body: 'La corrección de Newton sustituye la constante de Kepler por una que depende de M + m en lugar de solo de M.',
      prompt: '¿Para qué sistema importa más esa corrección?',
      options: [
        'La Tierra orbitando el Sol',
        'Un planeta de masa joviana orbitando una estrella parecida al Sol',
        'Dos enanas blancas de igual masa orbitándose entre sí',
        'Una nave espacial orbitando la Tierra',
      ],
      because:
        'Dos masas iguales. Ahí m = M, así que M + m es el doble de lo que supone la versión de Kepler y el periodo predicho falla en un factor √2, alrededor del 41 %. En los otros tres casos el cuerpo en órbita es entre una millonésima y una milésima de la masa central y la corrección es invisible. Es exactamente este término el que permite a los astrónomos medir las masas individuales de un sistema binario en lugar de solo su suma.',
    },
    {
      title: 'Dónde te deja esto',
      body: 'Has medido la forma de una órbita, has visto a un planeta cambiar velocidad por distancia conservando el momento angular, y has recuperado una ley de potencias a partir de ocho medidas que tomaste tú mismo. Después la has usado para pesar una estrella que nunca visitarás.\n\nTodo esto salió de posiciones a simple vista registradas antes de que existiera el telescopio, por un observador que se negó a redondear ocho minutos de arco.',
      tip: 'Si vas a entregar esto para una calificación, pulsa Siguiente una vez más para introducir tu nombre y descargar tu informe de laboratorio. Si no, simplemente puedes cerrar el panel.',
    },
  ],
};
