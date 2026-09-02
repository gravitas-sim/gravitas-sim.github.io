// =============================================================================
// goldilocks-question - es
// -----------------------------------------------------------------------------
// A shadow of ../goldilocks-question.js carrying only its words. Laid over the English lesson
// by mergeTranslation() in ../i18n.js, so anything absent here keeps its
// English and nothing here can reach the lesson's machinery: no scenario name,
// no seed, no widget id, no numeric answer, no probe.
//
// Arrays line up by index with the English. `null` means "not translated";
// that entry keeps its English.
// =============================================================================

export default {
  series: 'Detección de exoplanetas',
  title: 'La cuestión de Ricitos de Oro',
  subtitle:
    'Mueve un planeta, cambia su estrella y decide qué significa de verdad «habitable»',
  duration: '40-50 min',
  level: 'Astronomía introductoria',
  summary:
    'Deduce tú mismo por qué un planeta al doble de distancia de su estrella recibe la cuarta parte de energía, por qué las estrellas tenues tienen sus zonas habitables muy pegadas, y por qué una órbita excéntrica implica que un planeta no recibe una cantidad de luz constante todo el año. Después termina con la pregunta más difícil que la expresión «zona habitable» invita a saltarse: ¿qué te dice realmente estar dentro de ella?',
  objectives: [
    'Explicar por qué la luz estelar que llega a un planeta decae rápidamente con la distancia, y usar la regla del doble de lejos, la cuarta parte',
    'Explicar por qué la zona habitable de una estrella tenue está muy cerca y la de una luminosa muy lejos',
    'Definir la zona habitable circunestelar como un rango de distancias orbitales donde el agua líquida superficial podría ser posible bajo condiciones adecuadas',
    'Decir qué fija el borde interior y qué el exterior, y por qué dos definiciones publicadas discrepan',
    'Explicar por qué un planeta en órbita excéntrica recibe cantidades de luz estelar muy distintas a lo largo de su año',
    'Leer el sistema TRAPPIST-1 frente a un modelo de zona habitable y decir dónde cae cada planeta',
    'Explicar por qué estar dentro de la zona habitable no establece que un planeta sea habitable',
  ],
  steps: [
    {
      title: '¿Qué recibe la Tierra del Sol?',
      body: 'La luz del Sol tarda ocho minutos y veinte segundos en llegarnos. Lo que llega es energía, y casi todo lo relativo a la superficie de la Tierra se sigue de cuánta de ella aterriza aquí: la temperatura, el tiempo atmosférico, si el agua está en océanos o en hielo o escapa al espacio por completo.\n\nEsa magnitud tiene nombre. El <strong>flujo estelar</strong>, o insolación, es la energía que llega cada segundo a cada metro cuadrado de un planeta. Para la Tierra son unos 1361 vatios por metro cuadrado, que es aproximadamente la potencia de un pequeño calefactor eléctrico cayendo sobre cada metro cuadrado del lado iluminado.\n\nEsta investigación trata de una sola pregunta: ¿qué decide cuánto de eso recibe un planeta, y qué te permite decir la respuesta sobre el planeta?',
      tip: 'Aquí no hace falta álgebra. Moverás un deslizador, leerás tres números en un panel y verás cómo una gráfica se dibuja sola.',
    },
    {
      title: 'Una Tierra de luz estelar',
      body: 'En lugar de arrastrar vatios por metro cuadrado, esta lección usa la propia Tierra como regla. La Tierra está a una unidad astronómica del Sol, que son 150 millones de kilómetros, y recibe lo que llamaremos <strong>una Tierra</strong> de luz estelar.\n\nEl panel contiguo muestra exactamente eso: el Sol a la izquierda, un planeta a 1 UA, y una barra para la energía que llega allí. La barra está en la marca etiquetada «lo que recibe la Tierra», porque el planeta está donde está la Tierra.\n\nTodo lo que viene a partir de aquí se mide frente a ese único número.',
      tool: {
        title: 'La Tierra, a una unidad astronómica',
        note: 'Las líneas que se abren en abanico desde la estrella son su luz, saliendo hacia fuera. El planeta intercepta lo que cruza su propio trozo de cielo.',
      },
      tip: 'Una unidad astronómica, 1 UA, es la distancia media de la Tierra al Sol. Es la vara de medir natural para cualquier cosa dentro de un sistema planetario.',
    },
    {
      title: 'Llévalo al doble de distancia',
      body: 'Ahora imagina levantar la Tierra y dejarla a 2 UA, al doble de distancia del Sol de la que está ahora. El Sol no cambia. El planeta no cambia. Solo cambia la distancia.\n\nComprométete con una respuesta antes de tocar nada.',
      prompt: 'Al doble de distancia, cada metro cuadrado del planeta recibe…',
      options: [
        'la misma cantidad de luz estelar',
        'la mitad',
        'la cuarta parte',
        'la octava parte',
      ],
      because:
        'La cuarta parte. La mitad es la respuesta que casi todo el mundo elige de primeras, y merece la pena notar por qué es errónea: la luz no se está repartiendo a lo largo de una línea, se está repartiendo sobre una superficie. Dobla la distancia y esa superficie es cuatro veces mayor. Estás a punto de medirlo en lugar de creértelo.',
    },
    {
      title: 'Tres distancias',
      body: 'El deslizador mueve el planeta. Toma una lectura en cada una de las tres distancias de abajo y anota los números, o deja este panel abierto: la pantalla siguiente te pide que los registres.\n\nEl número que hay que leer es el etiquetado <strong>luz estelar que llega a cada metro cuadrado</strong>.',
      tool: {
        title: 'Mueve el planeta',
        note: 'Usa los botones de abajo para las tres distancias, o arrastra el deslizador a cualquier punto intermedio.',
      },
      checklist: [
        'Pon el planeta a 0,5 UA y lee la luz estelar',
        'Ponlo a 1 UA y léela otra vez',
        'Ponlo a 2 UA y léela una tercera vez',
        'Fíjate en lo que ocurrió entre 1 UA y 2 UA',
      ],
      tip: 'La barra cambia de longitud y el número de debajo cambia con ella. Ambos dicen lo mismo; la barra está ahí para que el cambio se vea antes de leer las cifras.',
    },
    {
      title: 'Anota las tres',
      body: 'Pon el deslizador en cada distancia por turno y escribe lo que marque el panel. El instrumento y la gráfica están ambos en esta pantalla, así que no hay que recordar nada de la anterior: lee un valor, introdúcelo, observa cómo cae el punto.',
      fields: [
        { label: 'Distancia 1', unit: 'UA', hint: '0,5' },
        { label: 'Luz estelar allí', unit: 'Tierras', hint: '4' },
        { label: 'Distancia 2', unit: 'UA', hint: '1' },
        { label: 'Luz estelar allí', unit: 'Tierras', hint: '1' },
        { label: 'Distancia 3', unit: 'UA', hint: '2' },
        { label: 'Luz estelar allí', unit: 'Tierras', hint: '0,25' },
      ],
      plot: {
        title: 'Tus tres lecturas',
        xLabel: 'distancia  (UA)',
        yLabel: 'luz estelar  (Tierras)',
        note: 'Distancia en horizontal, luz estelar en vertical. Tres puntos bastan para ver la forma.',
      },
      tool: {
        title: 'Lee aquí cada distancia',
        note: 'Arrastra el deslizador a 0,5, luego 1, luego 2 UA. Escribe cada lectura en las casillas.',
      },
      tip: 'Las tres distancias sugeridas son solo sugerencias. Sirven tres cualesquiera, siempre que el valor de luz estelar de al lado se leyera a esa distancia.',
    },
    {
      title: 'Qué dice la gráfica',
      body: 'Mira la curva que forman tus tres puntos. Empieza alta a la izquierda, cae con fuerza y después se aplana hacia la derecha sin llegar nunca del todo a cero.',
      prompt:
        'A medida que un planeta se aleja de su estrella, la luz estelar que recibe…',
      options: [
        'cae de manera constante, la misma cantidad por cada UA extra',
        'cae deprisa al principio y luego cada vez más despacio',
        'se mantiene más o menos igual hasta que de pronto se acaba',
        'sube, porque hay más espacio del que recoger',
      ],
      because:
        'Cae deprisa cerca y despacio lejos. Ir de 0,5 UA a 1 UA cuesta tres cuartas partes de la luz estelar. Ir de 2 UA a 2,5 UA, la misma media unidad astronómica, cuesta muy poco. Esa forma es la firma de la relación que estás a punto de ver, y es por lo que la parte interior de cualquier sistema planetario es mucho más sensible a la distancia que la exterior.',
    },
    {
      title: 'La estrella no se está quedando sin luz',
      body: 'Aquí está el porqué, y no tiene nada que ver con que la luz se canse por el camino.\n\nUna estrella vierte la misma energía en todas las direcciones. Imagina esa energía cruzando una cáscara imaginaria centrada en la estrella. El panel dibuja una cáscara cada vez. Arrastra la distancia hacia fuera y observa dos cosas a la vez: el trozo de luz sigue teniendo la misma energía, y la cáscara que tiene que cubrir no para de crecer.',
      checklist: [
        'A 1 UA, fíjate en lo grande que es el trozo iluminado.',
        'Muévete a 2 UA. La cáscara tiene el doble de radio. Lee cuántas veces mayor es su área.',
        'Muévete a 3 UA y luego a 4 UA, leyendo el área cada vez: 1, 4, 9, 16.',
        'Fíjate en la línea inferior del panel: la energía total que cruza la cáscara no cambia nunca.',
      ],
      tool: {
        title: 'Una cáscara cada vez',
      },
      tip: 'La misma regla gobierna lo fuerte que suena un altavoz y lo brillante que se ve una farola. No es exclusiva de la astronomía; es lo que le ocurre a cualquier cosa que se reparte por igual en todas las direcciones.',
    },
    {
      title: 'Escribirlo, y después usarlo',
      body: 'Las áreas que acabas de leer eran 1, 4, 9 y 16: los cuadrados de 1, 2, 3 y 4. Eso no es una casualidad de las cáscaras, es lo que hace la superficie de una esfera. Dobla el radio y el área sube por cuatro.\n\nLa misma energía, cuatro veces el área, la cuarta parte en cada metro cuadrado. Escrito:\n\n<strong>luz estelar ∝ 1 / d²</strong>\n\no, en su forma completa, F = L / (4πd²), donde L es la luminosidad de la estrella y 4πd² es el área de esa cáscara. No se te pedirá despejarla. Lo que importa es la frase: <strong>al doble de distancia, la cuarta parte</strong>.\n\nAsí que, sin el panel: un planeta está tres veces más lejos de su estrella que la Tierra del Sol. Tres al cuadrado es nueve.',
      prompt: 'Luz estelar a 3 UA, en Tierras',
      unit: 'Tierras',
      because:
        'Una novena parte, o unas 0,11 Tierras. Tres veces la distancia, nueve veces el área, una novena parte de la energía en cada metro cuadrado. Júpiter está algo más lejos, a 5,2 UA, y recibe alrededor de una veintisieteava parte de lo que recibe la Tierra.',
      tip: 'Esto se llama ley del inverso del cuadrado. «Inverso» porque más distancia significa menos luz estelar, y «del cuadrado» porque es la distancia al cuadrado la que hace el trabajo.',
    },
    {
      title: 'Deja el planeta, cambia la estrella',
      body: 'Hasta ahora la estrella ha sido el Sol y solo se ha movido el planeta. Ahora dale la vuelta.\n\nPon un planeta a 1 UA, exactamente donde está la Tierra, y cambia el Sol por una enana roja: una estrella pequeña, fría y muy tenue. Las enanas rojas son con diferencia el tipo de estrella más común de la galaxia, y la estrella más cercana al Sol es una.',
      prompt: 'Ese planeta, todavía a 1 UA, recibiría ahora…',
      options: [
        'la misma luz estelar, porque no se ha movido',
        'algo menos',
        'muchísimo menos, porque la estrella emite muchísima menos luz',
        'más, porque las estrellas más frías están más cerca',
      ],
      because:
        'Muchísimo menos. La distancia es solo la mitad de la historia; la otra mitad es cuánta luz produce la estrella para empezar. Una enana roja puede ser menos de una milésima de luminosa que el Sol, y un planeta a 1 UA alrededor de una estaría recibiendo menos de una milésima de lo que recibe la Tierra.',
    },
    {
      title: 'Cuatro estrellas, un planeta',
      body: 'El planeta se queda a 1 UA. El deslizador de estrella alterna entre cuatro tipos reales de estrella de la secuencia principal, desde una enana roja tenue hasta una estrella cinco veces más luminosa que el Sol.\n\nVigila el número de la esquina superior derecha del panel mientras las recorres.',
      tool: {
        title: 'El mismo planeta, cuatro estrellas distintas',
        note: 'La luminosidad se da en Soles: 1 es el Sol, 0,0015 es una enana roja tenue. El planeta no se mueve.',
      },
      checklist: [
        'Empieza con el Sol y anota la luz estelar a 1 UA',
        'Cambia a la enana roja tenue sin mover el planeta',
        'Cambia a la enana naranja, y luego a la estrella más brillante',
        'Mira la fila de luminosidad cada vez, y la fila de luz estelar',
      ],
      tip: 'Una estrella cuatrocientas veces más tenue entrega cuatrocientas veces menos luz a un planeta a la misma distancia. Los dos números van a la par, porque la luminosidad multiplica directamente en la relación del inverso del cuadrado.',
    },
    {
      title: 'Qué hace la luminosidad',
      body: 'Ya has cambiado la estrella cuatro veces sin mover el planeta en absoluto.',
      prompt: 'A una distancia fija, la luz estelar que recibe un planeta…',
      options: [
        'no depende de la estrella, solo de la distancia',
        'es proporcional a la luminosidad de la estrella',
        'depende del tamaño de la estrella pero no de su luminosidad',
        'es la misma para todas las estrellas de la secuencia principal',
      ],
      because:
        'Es proporcional a la luminosidad. Diez veces la luminosidad, diez veces la luz estelar a la misma distancia. Combina eso con lo que descubriste antes y tienes la relación entera: la luz estelar sube con la luminosidad de la estrella y baja con el cuadrado de la distancia.',
    },
    {
      title: 'Entonces, ¿dónde tendría que estar un planeta?',
      body: 'Junta esas dos cosas y surge una pregunta obvia. Si una estrella tenue entrega mucha menos luz, entonces un planeta tendría que estar mucho más cerca de ella para recibir tanto como recibe la Tierra del Sol.\n\nLos astrónomos convierten eso en una banda, y el panel dibuja ahora una: el rango de distancias en el que la luz estelar está en un intervalo que podría permitir agua líquida en la superficie, dadas condiciones adecuadas en el planeta. Está delimitada por una línea discontinua en el lado caliente y una punteada en el frío, y los números de abajo dan sus bordes interior y exterior para la estrella que se esté mostrando.\n\nCambia la estrella y observa la banda en lugar del planeta.',
      tool: {
        title: 'Aparece la banda',
        note: 'La banda sombreada es un rango calculado de distancias orbitales, no una región física del espacio. Allí no hay nada. La escala de distancias cambia con la estrella, así que lee el eje y no los píxeles.',
      },
      checklist: [
        'Con la enana roja tenue, lee dónde empieza y dónde acaba la banda',
        'Cambia al Sol y lee la banda otra vez',
        'Cambia a la estrella más brillante y léela una tercera vez',
        'Coloca el planeta dentro de la banda para cada estrella por turno',
      ],
      tip: 'Para la enana roja la banda va de unas 0,042 a unas 0,080 UA. Para la estrella brillante va de unas 2,1 a unas 3,6 UA. Eso es un factor de cincuenta entre ambas, y es enteramente cosa de la estrella.',
    },
    {
      title: 'Estrellas tenues, bandas cercanas',
      body: 'Has visto la banda saltar de sitio a medida que cambiaba la estrella.',
      prompt:
        'Comparada con la del Sol, la banda alrededor de una estrella mucho más tenue está…',
      options: [
        'mucho más cerca de la estrella',
        'en el mismo sitio, ya que depende del planeta',
        'mucho más lejos de la estrella',
        'en el mismo sitio, ya que todas las estrellas son parecidas',
      ],
      because:
        'Mucho más cerca. Una estrella tenue entrega menos luz, así que un planeta tiene que estar más cerca para recibir la misma cantidad, y toda la banda se mueve hacia dentro con él. La relación es una raíz cuadrada: una estrella cien veces más luminosa tiene su banda diez veces más lejos. No necesitas calcular eso, pero es por lo que la banda de la estrella brillante estaba en torno a 2 y 3,5 UA mientras que la de la enana roja estaba a una vigésima de UA.',
    },
    {
      title: 'Decirlo con cuidado',
      body: 'La banda tiene nombre: la <strong>zona habitable circunestelar</strong>, abreviada normalmente como zona habitable. Merece la pena leer una vez la definición cuidadosa, porque el nombre corto invita a una afirmación mucho más fuerte de la que la idea puede sostener.\n\nLa zona habitable es <em>el rango de distancias orbitales en el que un planeta rocoso con condiciones atmosféricas adecuadas podría potencialmente mantener agua líquida en su superficie.</em>\n\nCada parte de esa frase hace trabajo. <strong>Rango</strong>, no una línea. <strong>Podría potencialmente</strong>, no lo hace. <strong>Con condiciones atmosféricas adecuadas</strong>, que es un supuesto sobre el planeta, no algo que la zona mida.\n\nLa zona se calcula enteramente a partir de la estrella. No sabe absolutamente nada de ningún planeta concreto.',
      tip: 'El agua líquida es el criterio porque es el único requisito que comparten todas las formas de vida que conocemos, y porque no tenemos manera de buscar los requisitos de una vida que no conocemos.',
    },
    {
      title: 'Ahora ponla alrededor del Sol real',
      body: 'Basta de diagramas. La simulación que hay detrás de este panel es ahora el Sol con cuatro mundos reales a su alrededor: <strong>Venus</strong> a 0,72 UA, la <strong>Tierra</strong> a 1,00, <strong>Marte</strong> a 1,52 y <strong>Ceres</strong>, el mayor asteroide, a 2,77.\n\nEl anillo verde es la zona habitable, trazada a partir de la luminosidad y la temperatura propias del Sol por el mismo código que han estado usando los paneles. Aquí nada es un boceto. Tómate un momento y mira dónde cae cada mundo.',
      checklist: [
        'Encuentra el borde interior: el círculo naranja discontinuo, etiquetado «efecto invernadero desbocado».',
        'Encuentra el borde exterior: el círculo azul discontinuo, etiquetado «invernadero máximo».',
        'Observa una vuelta completa de los mundos interiores. ¿Cuáles se quedan dentro del anillo y cuáles no entran nunca?',
        'Fíjate en que el anillo no se mueve. Pertenece a la estrella, no a ningún planeta.',
      ],
      tip: 'El anillo es un cálculo, no un objeto. No hay nada físicamente presente a 0,98 UA; esa es simplemente la distancia a la que el modelo dice que empieza un efecto invernadero desbocado para un planeta de este tipo.',
    },
    {
      title: 'Leer el Sistema Solar real',
      body: 'La zona conservadora alrededor del Sol va de unas 0,98 UA a unas 1,69 UA. Venus está a 0,72, la Tierra a 1,00, Marte a 1,52 y Ceres a 2,77.',
      prompt: '¿Qué mundos de la pantalla están dentro del anillo?',
      options: [
        'Solo la Tierra',
        'La Tierra y Marte',
        'Venus, la Tierra y Marte',
        'Los cuatro',
      ],
      because:
        'La Tierra y Marte. Venus, a 0,72 UA, está dentro del borde interior, recibiendo unas 1,9 Tierras de luz estelar; Ceres, a 2,77 UA, está muy lejos, más allá del borde exterior. Marte, a 1,52 UA, está cómodamente dentro de la zona conservadora. Esto último suele sorprender, y es el dato más útil de esta lección.',
    },
    {
      title: 'El problema de Marte',
      body: 'Marte está dentro de la zona habitable. Marte no tiene agua líquida en ningún lugar de su superficie y no la ha tenido desde hace algo así como tres mil millones de años. Su atmósfera tiene alrededor de una centésima de la presión de la de la Tierra, y su temperatura superficial media ronda los −60 °C.\n\nAsí que o el cálculo está mal, o el cálculo responde a una pregunta más estrecha de lo que sugiere el nombre.',
      prompt:
        'En dos o tres frases: ¿por qué que un Marte seco y helado esté dentro de la zona habitable no es prueba de que la zona se calculara mal?',
      tip: 'Vuelve a la definición cuidadosa de tres pantallas atrás, la que empieza «el rango de distancias orbitales». ¿Qué palabras de ella son sobre la estrella, y cuáles son supuestos sobre el planeta?',
      rubric:
        'Puntuación completa por reconocer que la zona se calcula solo a partir de la estrella y que la definición lleva un supuesto explícito sobre el planeta («un planeta rocoso con condiciones atmosféricas adecuadas»). Marte está en el lugar correcto y falla el supuesto: con alrededor de una décima parte de la masa de la Tierra no pudo retener una atmósfera gruesa, así que la presión superficial es demasiado baja para el agua líquida y apenas hay calentamiento por efecto invernadero. Se valora una respuesta que acierte con la estructura aunque nombre otro mecanismo atmosférico. No se exige la expresión «escape atmosférico». Respuesta errónea frecuente: que Marte esté en realidad fuera de la zona, o que la zona deba recalcularse para cada planeta.',
      because:
        'La zona se calcula solo a partir de la estrella, y la definición supone un planeta rocoso con condiciones atmosféricas adecuadas. Marte está en el lugar correcto y falla el supuesto: es demasiado pequeño para haber retenido una atmósfera gruesa, así que no hay presión ni calentamiento por efecto invernadero suficientes para mantener el agua líquida. La zona dijo «esta distancia podría funcionar para un planeta adecuado». Nunca dijo que Marte lo fuera.',
    },
    {
      title: 'Los dos bordes',
      body: '¿Por qué se detiene la zona en cada extremo?\n\n<strong>El borde interior.</strong> Estar más cerca de la estrella significa más energía entrante, lo que significa una superficie más cálida, lo que significa más vapor de agua en el aire. El vapor de agua es a su vez un potente gas de efecto invernadero, así que atrapa más calor, lo que evapora más agua. Pasada cierta cantidad de luz entrante esa retroalimentación se desboca, los océanos acaban en la atmósfera, y la luz ultravioleta rompe el agua de modo que el hidrógeno escapa al espacio. Ese límite se llama <strong>efecto invernadero desbocado</strong>, y fija el borde interior.\n\n<strong>El borde exterior.</strong> Estar más lejos significa menos energía y una superficie más fría. Un planeta puede compensarlo con una atmósfera de dióxido de carbono más gruesa, y por eso el borde exterior no está simplemente donde se congela el agua. Pero el dióxido de carbono tiene un límite: amontona bastante y empieza a reflejar y dispersar más luz solar de la que atrapa. Lo mejor que puede hacer una atmósfera de dióxido de carbono se llama <strong>invernadero máximo</strong>, y eso fija el borde exterior.\n\nNinguno de los dos bordes es una temperatura. Ambos son límites de cuánta luz estelar puede manejar un modelo climático.',
      tool: {
        title: 'Los dos bordes, alrededor del Sol',
        note: 'La línea discontinua es el límite del efecto invernadero desbocado. La línea punteada es el límite del invernadero máximo. La Tierra está marcada como referencia.',
      },
      tip: 'Se cree que Venus pasó por un efecto invernadero desbocado. Está a 0,72 UA, recibe unas 1,9 Tierras de luz estelar, y tiene una superficie lo bastante caliente para fundir plomo bajo una atmósfera noventa veces más pesada que la nuestra.',
    },
    {
      title: 'Dos definiciones de la misma zona',
      body: 'Las zonas habitables publicadas vienen en dos sabores, y la diferencia no es cuestión de humor.\n\nLa zona <strong>conservadora</strong> usa los dos límites que acabas de conocer, ambos salidos de un modelo climático. La zona <strong>optimista</strong> usa en su lugar dos límites empíricos, tomados de la historia de nuestro propio Sistema Solar: Venus parece no haber tenido agua superficial desde hace al menos mil millones de años, y Marte parece haber tenido algo al principio. Esos dos hechos acotan una banda más ancha.\n\nAlterna entre ellas y observa qué borde se mueve más.',
      tool: {
        title: 'Conservadora y optimista',
        note: 'Se dibujan ambas bandas. La que hayas seleccionado se rellena; la otra queda como contorno para que veas exactamente qué cambió.',
      },
      checklist: [
        'Lee los bordes interior y exterior de la zona conservadora',
        'Cambia a optimista y léelos otra vez',
        'Anota cuál de los dos bordes se movió más',
        'Fíjate en dónde queda la Tierra respecto a cada borde interior',
      ],
      tip: 'El borde interior optimista se llama Venus Reciente y el exterior optimista se llama Marte Temprano. Los nombres son literales: esos dos mundos son la evidencia.',
    },
    {
      title: 'Qué cambió en realidad',
      body: 'Has visto ambas bandas dibujadas en el mismo eje.',
      prompt: 'Pasar de la zona conservadora a la optimista cambia…',
      options: [
        'la estrella, que ahora se supone más brillante',
        'los supuestos sobre qué atmósfera podría tener un planeta, lo que mueve ambos bordes hacia fuera y hacia dentro',
        'nada físico: simplemente dibuja una banda más grande',
        'la escala de distancias del diagrama',
      ],
      because:
        'Los supuestos. Los bordes conservadores salen de un modelo climático que pregunta qué puede sobrevivir un planeta rico en agua; los optimistas salen de preguntar qué descartan nuestros propios vecinos. Ambos son defendibles y ambos están publicados. Cuál uses depende de qué pregunta estés haciendo, y un artículo que cite una zona habitable debería decir a cuál se refiere.',
    },
    {
      title: 'La definición más amplia, en el Sol real',
      body: 'De vuelta al Sistema Solar en vivo, con un cambio: la zona habitable se dibuja ahora con la definición <strong>optimista</strong>. La estrella no ha cambiado. Los planetas no han cambiado. Solo el supuesto sobre qué cuenta como borde.\n\nEl borde interior ha saltado de 0,98 UA hacia dentro, hasta <strong>0,75 UA</strong>, que es un movimiento grande en pantalla. El borde exterior apenas se ha desplazado, de 1,69 a 1,77 UA.\n\nMira con atención a Venus.',
      checklist: [
        'Encuentra el nuevo borde interior y compáralo con dónde orbita Venus, a 0,72 UA.',
        'Comprueba el borde exterior frente a Ceres, a 2,77 UA.',
        'Cuenta cuántos mundos hay ahora dentro del anillo, y compáralo con la cuenta que hiciste con la definición conservadora.',
      ],
      tip: 'El borde interior optimista es el límite de Venus Reciente, y lo fija el propio Venus: el argumento es que Venus no ha tenido agua superficial desde hace al menos mil millones de años, así que allí donde esté Venus ya tiene que ser demasiado cerca. Venus queda por tanto justo dentro de su propio límite, por unas 0,03 UA. La definición está casi tocando la evidencia con la que se construyó.',
    },
    {
      title: 'Qué compró la banda más ancha',
      body: 'Cambiar a la definición optimista movió el borde interior hacia dentro casi un cuarto de unidad astronómica.',
      prompt:
        '¿Cuántos mundos adicionales del Sistema Solar metió eso dentro de la zona?',
      options: [
        'Dos: Venus y Ceres',
        'Uno: Venus',
        'Ninguno',
        'Uno: Marte, que estaba fuera de la zona conservadora',
      ],
      because:
        'Ninguno. Venus, a 0,72 UA, sigue quedando justo dentro del borde interior optimista de 0,75, y Ceres, a 2,77, no está ni cerca del borde exterior de 1,77. Marte ya estaba dentro de la zona conservadora. Así que las dos definiciones publicadas, que discrepan sobre los bordes por un margen amplio, coinciden por completo sobre nuestro propio Sistema Solar: dos mundos en la zona, y uno de ellos es Marte.',
    },
    {
      title: 'Venus, con la regla que ya tienes',
      body: 'No necesitas un modelo climático para ver por qué Venus es un caso difícil. Venus orbita a 0,72 UA. Usa la regla de la primera mitad de esta lección: la luz estelar va como 1 / d².\n\n0,72 al cuadrado es alrededor de 0,52.',
      prompt: 'Luz estelar en Venus, en Tierras',
      unit: 'Tierras',
      because:
        'Unas 1,9 Tierras. Venus recibe casi el doble de luz estelar que la Tierra, que es lo que lo sitúa dentro del límite del efecto invernadero desbocado y fuera de la zona conservadora. Su superficie está a unos 460 °C, lo bastante caliente para fundir plomo, bajo una atmósfera noventa veces más pesada que la nuestra. Fíjate en el sentido del argumento: la luz estelar de más pone el proceso en marcha, la atmósfera lo remata.',
    },
    {
      title: 'Un año en una órbita circular',
      body: 'Hasta ahora se ha supuesto calladamente una cosa: que un planeta tiene <em>una</em> distancia a su estrella. La mayoría de los planetas que has conocido en estas lecciones están en órbitas casi circulares, y para esos es casi cierto.\n\nEl panel muestra un planeta en una órbita perfectamente circular a 1,2 UA. Debajo hay una gráfica de la luz estelar que recibe a lo largo de un año completo, con un marcador que sigue el ritmo del planeta.\n\nObserva la gráfica. Es una línea plana.',
      tool: {
        title: 'Un año circular',
        note: 'El marcador de la gráfica es la posición actual del planeta en su año. En una órbita circular la distancia no cambia nunca, así que la luz estelar tampoco.',
      },
      tip: 'La órbita de la Tierra no es exactamente circular: su excentricidad es 0,017, lo que hace variar la luz estelar alrededor de un siete por ciento a lo largo del año. Eso es poco, y no es lo que causa las estaciones.',
    },
    {
      title: 'Ahora estira la órbita',
      body: 'Dentro de un momento podrás subir la excentricidad, que estira el círculo hasta convertirlo en una elipse. La estrella se queda en uno de los focos, así que el planeta se acerca mucho por un lado de la órbita y se aleja mucho por el otro.\n\nEl semieje mayor, la media de las distancias mínima y máxima, se mantendrá igual.',
      prompt: 'En una órbita estirada, la luz estelar que recibe el planeta…',
      options: [
        'se mantendrá constante, porque la distancia media no ha cambiado',
        'variará a lo largo del año, y será mayor cuando el planeta esté más cerca',
        'variará a lo largo del año, y será mayor cuando el planeta esté más lejos',
        'caerá a cero durante parte del año',
      ],
      because:
        'Varía, y alcanza su máximo cuando el planeta está más cerca. Como la relación va con el inverso del cuadrado, un estiramiento modesto de la órbita produce un vaivén grande en la luz estelar: en la órbita que estás a punto de ejecutar, el planeta recibe siete veces más en su punto más cercano que en el más lejano.',
    },
    {
      title: 'Ejecuta un año excéntrico',
      body: 'Sube la excentricidad y observa a la vez las dos mitades del panel: el planeta dando vueltas, y el marcador trazando la gráfica de luz estelar de debajo.\n\nFíjate en <em>dónde está el planeta cuando se mueve deprisa</em>. No se mueve a velocidad constante, y nunca lo hizo: esta es la segunda ley de Kepler, y es importante para la pantalla siguiente.',
      tool: {
        title: 'Un año excéntrico',
        note: 'Ejecuta y pausa con los botones de abajo. Las dos distancias, mínima y máxima, y la luz estelar en cada una, están en las filas de debajo.',
      },
      checklist: [
        'Pon la excentricidad en torno a 0,45 y déjalo dar una vuelta completa',
        'Observa cómo el marcador atraviesa a toda velocidad el pico alto de la gráfica',
        'Observa cómo se arrastra por el valle largo y plano',
        'Compara la luz estelar en los puntos más cercano y más lejano de la lectura',
      ],
      tip: 'El pico de la gráfica es estrecho y el valle es ancho. Eso no es una decisión de dibujo: el planeta pasa de verdad la mayor parte de su año en la fría parte exterior de la órbita, y se apresura por la parte caliente.',
    },
    {
      title: 'Cruzar los bordes',
      body: 'Ahora la zona habitable está dibujada en ambas mitades del panel: como un anillo alrededor de la estrella, y como una banda horizontal en la gráfica. Son la misma información dos veces.\n\nEsta órbita concreta no se queda dentro de ella. Observa cómo el planeta abandona el anillo en un extremo de su año y vuelve en el otro, y observa cómo la línea de la gráfica sale de la banda en el mismo momento.\n\nLa lectura da ahora la fracción del <em>año</em> pasada dentro de la zona.',
      tool: {
        title: 'Dentro y fuera de la zona',
        note: 'La línea discontinua es el borde interior, la punteada el exterior, tanto en la órbita como en la gráfica.',
      },
      checklist: [
        'Déjalo correr hasta que hayas visto al planeta salir y volver',
        'Pausa mientras el planeta está fuera del anillo',
        'Lee la fracción del año pasada dentro de la zona',
        'Pon la excentricidad en 0,3 y lee esa fracción otra vez',
      ],
      tip: 'La fracción se mide en tiempo, no en distancia recorrida por el bucle. Son números distintos, porque el planeta no cubre tramos iguales de órbita en tiempos iguales.',
    },
    {
      title: 'Leer la fracción',
      body: 'Con una excentricidad de 0,45 este planeta pasa algo más de la mitad de su año dentro de la zona. Con 0,3 pasa allí unas tres cuartas partes. En una órbita circular a la misma distancia media no la abandona nunca.',
      prompt:
        '¿Qué te dice «el 56 % del año dentro de la zona» sobre la superficie del planeta?',
      options: [
        'Que tiene agua líquida el 56 % del año y hielo el resto',
        'Que se congela y se descongela dos veces al año',
        'Menos de lo que sugiere el número: describe la luz estelar que llega, no la temperatura superficial',
        'Nada en absoluto, ya que la zona habitable no es real',
      ],
      because:
        'Menos de lo que parece. La fracción describe la luz estelar entrante frente a los límites de un modelo climático. Una atmósfera y un océano transportan una cantidad enorme de calor y tardan mucho en cambiar de temperatura, así que un planeta no sigue minuto a minuto la luz que le llega, igual que una playa no se enfría en el instante en que pasa una nube. Un planeta que salga brevemente de la zona cada año puede estar perfectamente bien. El número es una señal útil, no un pronóstico.',
    },
    {
      title: 'Un sistema real, a cuarenta años luz',
      body: 'Hora de apuntar todo esto a un objeto real.\n\nTRAPPIST-1 es una estrella muy pequeña y muy fría: alrededor del nueve por ciento de la masa del Sol, apenas mayor que Júpiter, con una temperatura superficial de 2566 K frente a los 5772 del Sol. Su luminosidad medida es de 0,000553 Soles, alrededor de una milochocientosava parte de la producción del Sol. Tiene siete planetas rocosos conocidos.',
      prompt:
        'Comparada con la del Sol, la zona habitable de TRAPPIST-1 debería estar…',
      options: [
        'mucho más lejos, porque las estrellas frías necesitan más espacio',
        'más o menos en el mismo sitio, cerca de 1 UA',
        'mucho más cerca, porque la estrella es muy tenue',
        'es imposible de definir para una estrella tan pequeña',
      ],
      because:
        'Mucho más cerca. Lo dedujiste hace dos secciones: la banda sigue la raíz cuadrada de la luminosidad. Una estrella mil ochocientas veces más tenue tiene su banda unas cuarenta veces más cerca, lo que la sitúa a unas pocas centésimas de unidad astronómica.',
    },
    {
      title: 'Los siete planetas',
      body: 'Aquí está el sistema real, con la zona habitable del mismo modelo que has estado usando toda la lección, calculada a partir de la luminosidad y la temperatura medidas de TRAPPIST-1.\n\nEl eje de distancias está comprimido, porque si no los planetas interiores se amontonarían encima de la estrella. Lee los números, no los píxeles.\n\nEl segundo panel pone el Sistema Solar en el mismo eje. Todo el sistema de siete planetas cabría cómodamente dentro de la órbita de Mercurio.',
      tool: {
        title: 'TRAPPIST-1',
        note: 'Cada planeta está listado debajo con la luz estelar que recibe y dónde cae respecto a la zona modelada.',
      },
      checklist: [
        'Encuentra los planetas b y c, los más cercanos a la estrella, y lee su luz estelar',
        'Encuentra e, f y g y lee la suya',
        'Lee dónde empieza y dónde acaba la zona en UA',
        'Cambia la definición de zona a optimista y comprueba si algo cambia de categoría',
        'Compara la escala con la órbita de Mercurio en el panel inferior',
      ],
      tip: 'TRAPPIST-1b recibe unas cuatro veces lo que recibe la Tierra, y TRAPPIST-1h alrededor de una séptima parte. Los siete planetas abarcan todo ese rango dentro de seis centésimas de unidad astronómica.',
    },
    {
      title: 'Míralo correr',
      body: 'El diagrama era un diagrama. Esto es la simulación, con los siete planetas en sus órbitas reales y la zona habitable dibujada a la misma escala que todo lo demás.\n\nLa vista está unas treinta veces más ampliada que en los pasos del Sistema Solar, porque todo el sistema mide seis centésimas de unidad astronómica de lado a lado. TRAPPIST-1b completa una órbita en día y medio; h tarda diecinueve días.\n\nHay una advertencia impresa en el propio anillo. TRAPPIST-1, a 2566 K, es más fría que el rango de temperaturas que cubre el ajuste publicado, así que el modelo se evalúa en su propio límite inferior en lugar de extrapolarse más allá de sus datos. Esa es una decisión de modelado, y la etiqueta lo dice en lugar de dar el número como si fuera una medida.',
      checklist: [
        'Encuentra el anillo verde y mira qué parte del sistema abarca.',
        'Observa cómo los planetas interiores corren y los exteriores se arrastran. b da unas doce vueltas por cada vuelta de h.',
        'Pulsa cualquier planeta para abrir su ficha y leer su periodo orbital en días.',
        'Fíjate en la nota del anillo que dice que la estrella es más fría de lo que cubre el modelo.',
      ],
      tip: 'Los periodos orbitales de aquí no están escritos a mano. Salen del mismo solucionador gravitatorio que todos los demás escenarios, a partir de los semiejes mayores medidos y de la masa estelar medida. Si coinciden con los valores publicados, eso es la simulación coincidiendo con las observaciones.',
    },
    {
      title: 'Toma tú mismo las lecturas',
      body: 'En lugar de que te digan qué planetas caen dónde, léelo en el instrumento. El panel está de vuelta, en la definición conservadora.\n\nRecorre la lista de debajo de la imagen y anota la luz estelar que recibe cada uno de los tres planetas centrales, en Tierras. Después anota dónde empieza y dónde acaba la zona.',
      fields: [
        { label: 'TRAPPIST-1e recibe', unit: 'Tierras', hint: '0,65' },
        { label: 'TRAPPIST-1f recibe', unit: 'Tierras', hint: '0,37' },
        { label: 'TRAPPIST-1g recibe', unit: 'Tierras', hint: '0,25' },
        { label: 'Borde interior de la zona', unit: 'UA', hint: '0,0254' },
        { label: 'Borde exterior de la zona', unit: 'UA', hint: '0,0499' },
      ],
      tool: {
        title: 'Lee aquí los valores',
        note: 'Cada planeta está listado bajo la imagen con su distancia, la luz estelar que recibe y dónde cae respecto a la zona modelada.',
      },
      tip: 'Los tres planetas dentro de la zona reciben entre un cuarto y dos tercios de lo que recibe la Tierra. Los tres están más cerca de su estrella que Mercurio del Sol.',
    },
    {
      title: 'La pregunta que invita el nombre',
      body: 'Así que: un planeta rocoso, del tamaño adecuado, orbitando dentro de la zona habitable de su estrella.',
      prompt:
        '¿Se ha demostrado que este planeta tiene agua líquida en su superficie?',
      options: [
        'Sí: eso es lo que significa la zona habitable',
        'Sí, siempre que el planeta sea rocoso y de tamaño aproximadamente terrestre',
        'No: la zona se calcula solo a partir de la estrella y no dice nada del planeta',
        'No, pero solo porque todavía no podemos ver el planeta lo bastante bien',
      ],
      because:
        'No, y la razón no es que nuestros telescopios sean demasiado pequeños. La zona habitable se calcula a partir de la luminosidad y la temperatura de una estrella. Nada de ese cálculo sabe si el planeta tiene atmósfera, si tiene agua para empezar, de qué está hecho, o qué está haciendo su superficie. Estar dentro de la zona significa que el planeta recibe una cantidad de energía que sería compatible con agua líquida superficial si además resultaran ser ciertas muchas otras cosas.',
    },
    {
      title: 'Tres planetas que parecen prometedores',
      body: 'Para ver cuánto margen deja eso, considera tres planetas que reciben todos cerca de una Tierra de luz estelar y están todos dentro de la zona habitable de su estrella.\n\nEn el único número al que esta lección ha dedicado cuarenta minutos, son idénticos. Mira qué más se sabe de cada uno.\n\nComo referencia de nuestro propio sistema: Venus y la Tierra son casi del mismo tamaño y reciben luz estelar dentro de un factor dos la una de la otra, y sus superficies difieren en más de cuatrocientos grados. Marte recibe 0,43 Tierras y tiene una superficie que estaría mucho más caliente con una atmósfera más gruesa que la fina que tiene. La distancia importa enormemente, y no es lo único que importa.',
      tool: {
        title: 'Tres candidatos',
        note: 'Los tres reciben luz estelar parecida y los tres están dentro de la zona modelada. Todo lo demás sobre ellos difiere.',
      },
      checklist: [
        'Mira el Planeta A: qué se sabe y qué no',
        'Mira el Planeta B',
        'Mira el Planeta C, y su tamaño comparado con la Tierra',
        'Decide en cuál gastarías tiempo de telescopio antes de seguir leyendo',
      ],
      tip: 'Un planeta mayor de unos 1,6 radios terrestres no suele ser roca desnuda: tiende a haber conservado una envoltura gruesa de hidrógeno, lo que significa que no hay superficie en el sentido que nos interesa.',
    },
    {
      title: '¿Cuál observarías a continuación?',
      body: 'El tiempo de telescopio es el recurso más escaso de la astronomía. Puedes tener un espectro de uno de estos tres.\n\nLa pregunta no es cuál tiene vida. Es cuál es el más prometedor para estudiarlo.',
      prompt:
        '¿Qué planeta es el objetivo de seguimiento más sólido con esta evidencia?',
      options: [
        'El Planeta A: rocoso y del tamaño de la Tierra, sin atmósfera detectada',
        'El Planeta B: rocoso, algo mayor que la Tierra, con atmósfera detectada pero aún no caracterizada',
        'El Planeta C: 1,6 radios terrestres con una atmósfera extendida, alrededor de una estrella que emite fulguraciones con frecuencia',
        'Ninguno: sin una medida de temperatura no hay nada que elegir entre ellos',
      ],
      because:
        'El Planeta B. Es el único de los tres que es a la vez lo bastante pequeño para ser plausiblemente rocoso y del que se sabe que tiene atmósfera, y su estrella no está arrancándole activamente esa atmósfera. Esa combinación es de lo que un espectro podría decir algo de verdad. El Planeta A todavía podría tener una atmósfera demasiado fina para haberse detectado, y el Planeta C es lo bastante grande como para ser probablemente un mundo pequeño rico en gas y no uno rocoso. Nada de esto establece que B sea habitable. Establece que B es adonde debería apuntar la próxima observación.',
    },
    {
      title: 'Uno más, y ya has terminado',
      body: 'Se anuncia un nuevo descubrimiento. Un planeta rocoso, de tamaño próximo al de la Tierra, orbitando dentro de la zona habitable conservadora de su estrella y recibiendo 0,9 Tierras de luz estelar. Su estrella emite fulguraciones a menudo. Todavía no se ha medido ninguna atmósfera.\n\nUn titular lo llama una segunda Tierra.',
      prompt: '¿Qué puede concluirse honestamente de lo que se sabe?',
      options: [
        'Que el planeta es habitable',
        'Que el planeta probablemente tiene agua líquida, dados su tamaño y su posición',
        'Que recibe una cantidad de luz estelar compatible con agua líquida superficial bajo condiciones adecuadas, lo que lo hace digno de estudiarse más',
        'Nada, porque la estrella emite fulguraciones',
      ],
      because:
        'La tercera. Es un objeto genuinamente interesante y el descubrimiento merece genuinamente la pena, y todo lo que va más allá de «digno de estudiarse más» carece de apoyo. Las fulguraciones son una preocupación real sobre si sobrevive una atmósfera, pero no descartan por sí solas el planeta, y una única atmósfera sin medir es exactamente el hueco para el que sirve la próxima observación. La zona habitable hizo aquí su trabajo: les dijo a los astrónomos adónde apuntar.',
    },
    {
      title: 'Lo que has deducido',
      body: 'Partiendo de un planeta y una estrella, encontraste tú mismo todo esto:\n\n<strong>Más lejos → menos luz estelar.</strong> Al doble de distancia, la cuarta parte, porque la luz se reparte sobre una esfera cuya área crece como el cuadrado de la distancia.\n\n<strong>Estrella más luminosa → zona habitable más lejos. Estrella menos luminosa → zona habitable más cerca.</strong> Una estrella cien veces más brillante tiene su zona diez veces más lejos.\n\n<strong>Órbita excéntrica → la luz estelar cambia a lo largo del año</strong>, y el planeta pasa la mayor parte de ese año en la fría parte exterior de su órbita y no en la caliente parte interior.\n\n<strong>Estar dentro de la zona habitable no es lo mismo que ser habitable</strong>, y no se parece ni de lejos a estar habitado. La zona se calcula solo a partir de la estrella.\n\nLo que deja a la zona habitable haciendo algo genuinamente valioso, solo que no lo que sugiere su nombre. Hay miles de millones de planetas en la galaxia y un puñado de telescopios capaces de tomar sus espectros. La zona habitable es cómo decides cuáles mirar primero.\n\nEs un sitio excelente para empezar a buscar. No es la respuesta a si un mundo es habitable.',
      tip: 'La expresión «zona de Ricitos de Oro» es más antigua que la ciencia y ha hecho verdadero daño a cómo se entiende la idea. Todos los artículos profesionales usan «zona habitable circunestelar», y todos ellos se refieren a la definición cuidadosa que leíste antes.',
    },
  ],
};
