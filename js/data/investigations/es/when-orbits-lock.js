// =============================================================================
// when-orbits-lock - es
// -----------------------------------------------------------------------------
// Una sombra de ../when-orbits-lock.js que sólo lleva sus palabras. Se
// superpone a la lección inglesa mediante mergeTranslation() en ../i18n.js, de
// modo que nada de aquí puede alcanzar la maquinaria de la lección: ningún
// nombre de escenario, ninguna semilla, ningún identificador de widget, ninguna
// respuesta numérica, ninguna sonda.
//
// Los arreglos se alinean por índice con el inglés. `null` significa «sin
// traducir»; esa entrada conserva su inglés.
//
// Nota sobre la terminología. «Libración» y «circulación» son los términos
// establecidos en castellano y se usan sin rodeos. Una órbita «tadpole» se
// traduce como órbita de renacuajo, que es como aparece en la literatura
// divulgativa en español; «horseshoe» como herradura.
// =============================================================================

export default {
  title: 'Cuando las órbitas se enganchan',
  subtitle: 'Una razón es una pista. Descubre qué cuenta como prueba',
  duration: '55-70 min',
  level: 'Astronomía introductoria',
  summary:
    'Tres de las lunas de Júpiter se marcan el compás unas a otras, Plutón cruza la órbita de Neptuno y jamás se le ha acercado, y miles de asteroides se mantienen sesenta grados por delante de Júpiter sin moverse de ahí. Los tres casos son el mismo fenómeno, y ninguno queda explicado por lo que todo el mundo cita: la razón entre los periodos. Medirás esas razones, descubrirás que la más limpia de todo el sistema pertenece a una luna que no está en ninguna resonancia, y luego medirás la magnitud que sí resuelve la cuestión: un ángulo que o bien oscila o bien da la vuelta.',
  objectives: [
    'Medir periodos orbitales y razones de periodos a partir de las propias órbitas, y hallar la razón de enteros pequeños más cercana a cada una',
    'Explicar por qué una razón casi racional es una prueba débil, usando un caso en el que la razón más limpia del sistema pertenece a un cuerpo sin resonancia alguna',
    'Construir un ángulo resonante a partir de longitudes medias y longitudes del periastro, y explicar por qué se elige la combinación cuyos coeficientes suman cero',
    'Distinguir la libración de la circulación, y reconocer los registros que no permiten separarlas',
    'Usar la libración del argumento de Laplace y del argumento 3:2 de Plutón para explicar qué protege cada resonancia',
    'Distinguir un equilibrio estable de uno inestable en los puntos de Lagrange de Júpiter, trabajando en el marco rotante',
  ],
  steps: [
    {
      title: 'Cuatro lunas y una coincidencia sospechosa',
      body: `En pantalla están las cuatro lunas que Galileo vio en enero de
             1610: Ío, Europa, Ganímedes y Calisto, girando alrededor de Júpiter
             en sus órbitas reales.

             \n\nLas tres interiores hacen algo que la exterior no hace. Ío da
             una vuelta en unos 1,77 días, Europa en unos 3,55 y Ganímedes en
             unos 7,15. Cada una tarda aproximadamente el doble que la de
             dentro, así que los tres periodos guardan más o menos la razón
             1 : 2 : 4, y Laplace demostró en 1805 que no es casualidad: las
             tres lunas se sujetan mutuamente ahí.

             \n\nLa palabra para esto es <strong>resonancia</strong>, y lo
             habitual es explicarla mediante esa razón. Esta investigación va a
             quitarte la razón de las manos para ver qué queda.

             \n\nUna advertencia antes de empezar: <strong>este escenario es un
             modelo a escala.</strong> El sistema joviano es mil veces más
             pequeño que los escenarios del Sistema Solar, tanto que la órbita
             de Ío sería más estrecha que el propio Júpiter dibujado. Por eso
             aquí toda distancia es cien veces mayor que la real y, siendo la
             gravedad newtoniana lo que es, eso hace que toda duración sea mil
             veces más larga. El instrumento hace la conversión; los indicadores
             de distancia y tiempo de la aplicación, no. Nada adimensional
             —ninguna razón, ninguna excentricidad, ningún ángulo— se ve
             afectado.`,
      tip: 'La simulación está en pausa. Nada se mueve hasta que la dejes correr.',
    },
    {
      title: '¿Cómo de cerca es cerca?',
      body: `Antes de medir nada: se dice que Ío y Europa están en una
             resonancia 2:1, es decir, que Ío da exactamente dos vueltas por
             cada una de Europa.`,
      prompt: 'Cuando midas los dos periodos, la razón será…',
      options: [
        'exactamente 2, porque eso es lo que significa «estar en resonancia»',
        'del orden de una parte en mil respecto de 2',
        'del orden de una parte en trescientas respecto de 2',
        'nada parecida a 2: la resonancia trata de otra cosa',
      ],
      because: `Una parte en trescientas: la razón medida es 2,0075, que se
                aparta un 0,37 % de 2. Está cerca, no es exacta, y la diferencia
                es demasiado grande para ser error de medida. Haga lo que haga la
                resonancia, no está volviendo la razón exactamente dos.`,
    },
    {
      title: 'Mide los cuatro periodos',
      body: `Déjalo correr. El instrumento de abajo mide el periodo de cada luna
             a partir de su órbita —de la energía y la distancia, como lo haría
             un astrónomo— y promedia sobre todo lo que ha visto, de modo que
             los números se asientan en unas pocas órbitas de Ío.

             \n\nDale medio minuto, que son unas 150 órbitas de Ío, y luego lee
             la tabla. Informa de cada periodo, de la razón entre cada luna y la
             de dentro, y de la razón de enteros pequeños más cercana a esa
             razón.

             \n\nFíjate en la última cifra de cada fila. Dice cuánto más cerca
             está la razón medida de una razón de enteros pequeños de lo que
             habría estado un número cualquiera. Esa cifra es de lo que trata
             esta lección.`,
      checklist: [
        'Deja correr la simulación unas 150 órbitas de Ío',
        'Lee los cuatro periodos',
        'Lee las tres razones y la razón de enteros pequeños más cercana a cada una',
        'Lee cuánto más cerca que el azar está cada una',
      ],
      rubric: `Se esperan periodos de unos 1,769, 3,552, 7,155 y 16,69 días, y
               razones de 2,008, 2,014 y 2,333. Puntuación completa por advertir
               que ninguna de las tres es exacta y por informar de las cifras de
               «más cerca que el azar», que rondan 2, 1 y 25: es decir, el par
               exterior, que <em>no</em> está en resonancia, tiene con
               diferencia la razón más limpia.`,
    },
    {
      title: 'Anota las razones',
      body: `Léelas del instrumento. Van a tu informe, y dos de ellas están a
             punto de usarse en tu contra.`,
      fields: [
        { label: 'Periodo de Europa ÷ el de Ío' },
        { label: 'Periodo de Ganímedes ÷ el de Europa' },
        { label: 'Periodo de Calisto ÷ el de Ganímedes' },
      ],
    },
    {
      title: '¿Cuál es la impresionante?',
      body: `Las tres razones que has medido rondan 2:1, 2:1 y 7:3
             respectivamente. Sus distancias a esas razones son de un 0,4 %, un
             0,7 % y un 0,03 % aproximadamente.

             \n\nÍo, Europa y Ganímedes están en resonancia. Calisto no lo está
             con nada.`,
      prompt:
        '¿Qué te dice eso sobre «los periodos guardan casi una razón de enteros pequeños» como prueba?',
      options: [
        'Nada: la razón de Calisto tiene que ser una coincidencia, y las coincidencias ocurren',
        'No es una prueba por sí sola: la mejor razón del sistema pertenece al cuerpo que no es resonante',
        'La medida del periodo de Calisto debe de estar mal',
        'Calisto debe de estar en una resonancia 7:3 que nadie ha advertido',
      ],
      because: `La segunda. La razón de Calisto está realmente a un 0,03 % de
                7:3 —es una medida real de un sistema real, no un artefacto— y
                Calisto realmente no es resonante. Cualquier regla que la hubiera
                declarado resonante es una regla que da respuestas falsas.

                \n\nY el motivo no es la mala suerte. Las fracciones con
                denominador pequeño son <em>densas</em>: hay unas treinta con
                denominador diez o menos en cada intervalo unidad, así que una
                razón cualquiera suele quedar a un uno o dos por ciento de
                alguna sin estar ni de lejos en resonancia. Acercarse al 0,03 %
                es llamativo —unas veinticinco veces mejor que el azar— y
                veinticinco veces mejor que el azar no demuestra nada.`,
    },
    {
      title: 'Qué es realmente una resonancia',
      body: `Aparta la razón y pregúntate qué se supone que <em>hace</em> la
             resonancia.

             \n\nDos lunas tiran una de otra con más fuerza cuando están más
             cerca, que es cuando se alinean al mismo lado de Júpiter: una
             <strong>conjunción</strong>. Cada conjunción da a cada una un
             pequeño empujón.

             \n\nSi las conjunciones ocurren en un sitio distinto cada vez, los
             empujones apuntan en direcciones distintas y se promedian a nada a
             lo largo de muchas órbitas. Ese es el caso ordinario, y es la razón
             por la que el Sistema Solar no es un caos de órbitas que
             interactúan.

             \n\nSi las conjunciones siguen ocurriendo <em>en el mismo sitio</em>,
             los empujones apuntan todos en la misma dirección y se suman. Eso es
             una resonancia. Es una afirmación sobre dónde ocurren las
             alineaciones, no sobre la razón de los periodos; y la razón sólo
             importa porque es lo que decide si las alineaciones se repiten.

             \n\nAsí que la pregunta que hay que hacer a un par de cuerpos no es
             «¿son vuestros periodos casi conmensurables?». Es
             «<strong>¿ocurren vuestras conjunciones en el mismo sitio?</strong>».`,
    },
    {
      title: '¿Dónde ocurren las alineaciones?',
      body: `Ío y Europa se alinean cada 3,5 días aproximadamente. En una
             ejecución de cien órbitas de Ío habrá docenas de alineaciones.`,
      prompt:
        'Representadas como direcciones en el cielo vistas desde Júpiter, esas conjunciones…',
      options: [
        'se repartirán uniformemente por todo el círculo',
        'se agruparán en unas pocas direcciones y se quedarán ahí',
        'irán derivando lentamente alrededor del círculo, en un solo sentido',
        'ocurrirán todas exactamente en una dirección',
      ],
      because: `Derivan, de forma constante y lenta. Es la respuesta que más
                gente falla, y conviene haberla fallado antes del paso
                siguiente. Las alineaciones no se quedan en un sitio del cielo,
                porque las propias órbitas giran. Lo que sí se queda quieto es
                algo más sutil, y encontrarlo es el resto de esta
                investigación.`,
    },
    {
      title: 'Observa las alineaciones',
      body: `Déjalo correr un minuto o así. Cada punto del disco de la izquierda
             es una conjunción Ío–Europa, situada según la dirección en la que
             ocurrió vista desde Júpiter. El disco de la derecha sitúa las
             mismas conjunciones según dónde estaba Europa en su propia órbita
             en ese momento.

             \n\nLa flecha de cada disco es la dirección media, y su
             <em>longitud</em> indica cuán apretado es el grupo: una flecha
             larga significa que están todos en el mismo sitio; un muñón, que
             están dispersos.`,
      checklist: [
        'Observa cómo se llena el disco izquierdo con 50 o más conjunciones',
        'Anota si los puntos se agrupan o se dispersan',
        'Compara con el disco derecho',
      ],
      rubric: `El disco izquierdo debería mostrar las conjunciones repartidas por
               un arco amplio en lugar de fijadas en una dirección, y la flecha
               debería ser corta. Puntuación completa por informar honestamente
               de la dispersión en lugar de informar del agrupamiento que
               predecía la respuesta equivocada del paso anterior.`,
    },
    {
      title: 'Por qué el cielo es el sitio equivocado donde mirar',
      body: `Las conjunciones no se quedan quietas en el cielo. Pero la
             resonancia es real: las tres lunas llevan enganchadas casi toda la
             edad del Sistema Solar.`,
      prompt:
        '¿Qué falla en usar «las conjunciones ocurren en una dirección fija» como prueba?',
      options: [
        'No falla nada; la resonancia debe de ser más débil de lo anunciado',
        'Una dirección en el cielo se mide contra un marco fijo, y nada de una órbita es fijo en ese marco: las propias órbitas precesan',
        'Las conjunciones son demasiado difíciles de cronometrar con precisión',
        'La prueba sólo vale para pares, y aquí hay tres lunas',
      ],
      because: `Una órbita no es algo fijo. Su eje mayor gira —precesa— por el
                tirón de las demás lunas, así que una conjunción que ocurra en el
                mismo punto <em>de la órbita</em> cada vez seguirá deslizándose
                por el cielo a medida que la órbita lo hace.

                \n\nLo cual te dice qué medir en su lugar. No la dirección en el
                espacio, sino la geometría <em>relativa a las propias
                órbitas</em>. Eso es exactamente un ángulo resonante, y por eso
                su definición parece tan quisquillosa.`,
    },
    {
      title: 'El ángulo resonante',
      body: `Aquí está la construcción. Parece arbitraria la primera vez y no lo
             es.

             \n\nTodo cuerpo en órbita tiene una <strong>longitud media</strong>,
             λ: dónde estaría si girase a ritmo constante, medida desde una
             dirección fija. Aumenta 360° en cada órbita, a un ritmo fijado por
             el periodo. También tiene una <strong>longitud del periastro</strong>,
             ϖ: la dirección del punto más cercano de la órbita. Esa apenas se
             mueve, y cuando lo hace es despacio.

             \n\nAhora toma una combinación como

             \n\n<strong>φ = 3λ<sub>exterior</sub> − 2λ<sub>interior</sub> −
             ϖ<sub>exterior</sub></strong>

             \n\ny fíjate en lo que hacen los coeficientes. Si los dos periodos
             están de verdad en razón 3:2, entonces 3λ<sub>exterior</sub> y
             2λ<sub>interior</sub> aumentan al <em>mismo</em> ritmo, y la
             diferencia entre ambos se queda quieta. El movimiento rápido se
             cancela. Lo que queda es un ángulo lento que dice dónde caen las
             conjunciones respecto del propio perihelio del cuerpo exterior: lo
             que no se escapa por precesión.

             \n\nLos coeficientes deben sumar cero —3 − 2 − 1 = 0— y eso no es un
             convenio. Es lo que hace que el ángulo no dependa de hacia dónde
             decidiste apuntar tu eje x. Una combinación que no sume cero mide tu
             sistema de coordenadas en lugar de las órbitas.

             \n\nUn ángulo así hace exactamente una de dos cosas:

             \n\n<strong>Circula.</strong> Recorre los 360°, una y otra vez. Las
             conjunciones adoptan sucesivamente todas las geometrías y los
             empujones se promedian a nada. No hay resonancia.

             \n\n<strong>Libra.</strong> Oscila de un lado a otro en torno a un
             valor y nunca completa una vuelta. Las conjunciones siguen
             ocurriendo en el mismo sitio respecto de la órbita, los empujones se
             suman, y los dos cuerpos se sujetan ahí. <em>Eso</em> es una
             resonancia, y es lo único que lo es.`,
    },
    {
      title: 'El argumento de Laplace',
      body: `Para las tres lunas interiores la combinación adecuada las
             involucra a las tres a la vez, y Laplace la halló en 1805:

             \n\n<strong>φ<sub>L</sub> = λ<sub>Ío</sub> − 3λ<sub>Europa</sub> +
             2λ<sub>Ganímedes</sub></strong>

             \n\nLos coeficientes 1 − 3 + 2 suman cero, así que no hace falta
             ninguna longitud del periastro, lo cual viene bien aquí: estas
             órbitas son casi circulares y sus direcciones de perihelio son
             difíciles de precisar.`,
      prompt: 'A lo largo de una ejecución larga, φ_L…',
      options: [
        'recorrerá los 360° una vez cada pocas órbitas de Ío',
        'se quedará en un valor y no se moverá en absoluto',
        'oscilará de un lado a otro en torno a 180° sin dar nunca la vuelta entera',
        'derivará lenta y constantemente en un sentido',
      ],
      because: `Libra en torno a 180°, y la amplitud en este modelo es de unos
                26°. Comprométete ahora, porque el instrumento se va a negar a
                confirmarlo durante el primer minuto y medio, y el motivo de esa
                negativa es lo siguiente que merece la pena entender.`,
    },
    {
      title: 'Observa el argumento de Laplace',
      body: `Ponlo en marcha y <strong>déjalo correr</strong>. Este tarda un
             rato, y la forma en que cambia de opinión es lo importante.

             \n\nEl gráfico superior es φ<sub>L</sub> plegado en una sola vuelta.
             El inferior es el mismo ángulo desplegado, de modo que una
             circulación sería una rampa recta y una libración es una onda.

             \n\nObserva la línea del veredicto en la lectura conforme avanza la
             ejecución. Dirá tres cosas distintas, en este orden:

             \n\n<strong>No concluyente: confinado.</strong> El ángulo apenas se
             ha movido, pero tampoco se ha dado la vuelta, y un ángulo que
             circulara lo bastante despacio se vería exactamente igual.

             \n\n<strong>No concluyente: se ha dado la vuelta una vez.</strong>
             Mejor, y todavía no es prueba: un ángulo camino de dar la vuelta con
             una oscilación encima también se da la vuelta una vez.

             \n\n<strong>Libración.</strong> Se dio la vuelta, regresó y volvió
             al punto de partida. Ahora sí está establecido.

             \n\nEl primer cambio llega hacia los ochenta segundos y el segundo a
             los tres minutos y medio. Lee los dos pasos siguientes mientras
             esperas, y vuelve luego.`,
      checklist: [
        'Pon en marcha la ejecución y anota el primer veredicto',
        'Anota cuándo cambia a «se ha dado la vuelta una vez»',
        'Espera al veredicto de libración',
        'Lee el centro, la amplitud y el periodo de libración',
      ],
      rubric: `Se espera una libración centrada a uno o dos grados de 180° con una
               amplitud cercana a 26°, y un periodo de libración cercano a 1.200
               órbitas de Ío, unos 2.100 días. La puntuación completa exige
               informar de las tres cosas <em>y</em> advertir que el instrumento
               se negó a dar una respuesta durante la primera parte de la
               ejecución.`,
    },
    {
      title: 'Por qué el instrumento se niega',
      body: `Un instrumento que siempre da una respuesta no está midiendo nada, y
             este está construido para decirlo.

             \n\nSupón que observas un ángulo resonante un rato y se mueve 20°.
             Encajan dos explicaciones:

             \n\n<strong>Está librando</strong> con una amplitud de al menos 10°,
             y has captado parte de una oscilación.

             \n\n<strong>Está circulando</strong>, muy despacio: a 20° por
             ejecución tardaría dieciocho ejecuciones en dar la vuelta entera.

             \n\nNada en el registro las distingue. Ni la suavidad, ni el tamaño,
             ni la forma. Sólo esperar a que se dé la vuelta lo hace, y si aún no
             se la ha dado, la respuesta honesta es que no lo sabes.

             \n\nPor eso el instrumento informa de tres estados, no de dos:
             circulación, libración y <em>no concluyente</em>. Cuando es no
             concluyente te dice qué ha descartado —«cualquier circulación
             tardaría más de mil ciclos de conjunción»—, que es un resultado real
             y no lo mismo que una resonancia.

             \n\nRetén esto. Dentro de unos pasos vas a conocer un cuerpo cuyo
             ángulo se queda en no concluyente durante toda la lección, y la
             tentación de llamarlo resonante será considerable.`,
    },
    {
      title: 'Registra la libración de Laplace',
      body: `Cuando el veredicto diga LIBRACIÓN, lee estos valores y anótalos.

             \n\nSi todavía no ha llegado, déjalo correr: necesita unos tres
             minutos y medio desde el principio.`,
      fields: [
        { label: 'centro de libración', unit: 'grados' },
        { label: 'amplitud', unit: 'grados' },
        { label: 'periodo de libración', unit: 'días' },
      ],
    },
    {
      title: 'Lo que significan los 180°',
      body: `φ<sub>L</sub> = λ<sub>Ío</sub> − 3λ<sub>Europa</sub> +
             2λ<sub>Ganímedes</sub> se sitúa en 180°.

             \n\nConsidera un momento en que Ío y Europa están en conjunción, de
             modo que λ<sub>Ío</sub> = λ<sub>Europa</sub>. Sustitúyelo y la
             expresión se colapsa: φ<sub>L</sub> pasa a ser
             2λ<sub>Ganímedes</sub> − 2λ<sub>Europa</sub>, que es el doble del
             ángulo entre Ganímedes y Europa.

             \n\nIgualar eso a 180° da el ángulo entre Ganímedes y Europa en cada
             conjunción Ío–Europa.`,
      prompt:
        '¿A cuántos grados de Europa está Ganímedes cada vez que Ío y Europa se alinean?',
      unit: 'grados',
      because: `Noventa grados: un cuarto de vuelta. Que es todo el contenido de
                la resonancia de Laplace en una frase: <strong>las tres lunas
                nunca están en conjunción a la vez.</strong> Siempre que dos se
                alinean, la tercera está a un cuarto de vuelta.

                \n\nEso es lo que protege el enganche. Tres lunas coincidiendo en
                el mismo sitio tirarían fuerte unas de otras en la misma
                dirección cada vez que ocurriera, y la configuración no
                sobreviviría. La resonancia es la disposición que hace imposible
                el encuentro.`,
    },
    {
      title: 'Un uno por ciento',
      body: `A continuación ejecutarás las mismas cuatro lunas con un solo número
             cambiado: Europa parte un uno por ciento más lejos. No difiere nada
             más: mismas masas, mismas excentricidades, mismos ángulos
             iniciales.

             \n\nUn uno por ciento en distancia es alrededor de un 1,5 % en
             periodo, así que el periodo de Europa pasa de 2,0075 veces el de Ío
             a unas 2,037 veces.`,
      prompt: 'El argumento de Laplace en el sistema modificado…',
      options: [
        'librará en torno a 180° con una amplitud algo mayor',
        'librará en torno a un centro distinto',
        'circulará: dará la vuelta entera, una y otra vez',
        'no cambiará, porque un uno por ciento es un cambio pequeño',
      ],
      because: `Circula, y deprisa: una vuelta completa cada cuarenta y siete
                órbitas de Ío aproximadamente. La resonancia sujeta el semieje
                mayor de Europa a una parte en mil; una parte en cien queda diez
                veces fuera, y fuera no hay nada.`,
    },
    {
      title: 'Rómpelo',
      body: `El mismo sistema con Europa desplazada un uno por ciento hacia
             fuera. Observa los dos gráficos.

             \n\nEn el gráfico plegado el ángulo barre ahora todos los valores en
             vez de quedarse rondando. En el desplegado es una rampa en lugar de
             una onda. El veredicto debería decir CIRCULACIÓN en unos diez
             segundos, lo que conviene comparar con los tres minutos y medio que
             necesitó el caso resonante antes de comprometerse.

             \n\nEsa asimetría no es un defecto. La circulación es fácil de
             demostrar: basta con una vuelta completa. La libración tarda más
             porque descartar una circulación lenta tarda más.`,
      checklist: [
        'Anota cuánto tarda en aparecer el veredicto',
        'Lee el periodo de circulación',
        'Compara la forma de ambos gráficos con la del caso resonante',
      ],
      rubric: `Se espera CIRCULACIÓN con un periodo cercano a 47 órbitas de Ío,
               informado en los primeros segundos de la ejecución. Puntuación
               completa por contrastar la rapidez con que llega este veredicto
               frente a lo que tardó el de libración, y por explicar por qué.`,
    },
    {
      title: 'Qué establece el par de ejecuciones',
      body: `Dos ejecuciones que difieren en un número. En una el argumento de
             Laplace libra; en la otra circula.`,
      prompt:
        '¿Qué establece el par que no establecería ninguna de las dos por separado?',
      options: [
        'Que la resonancia depende de la distancia de Europa, y que el ángulo librante es una propiedad de la configuración y no del instrumento',
        'Que el instrumento no es fiable, puesto que da respuestas distintas para sistemas casi idénticos',
        'Que un uno por ciento es un cambio grande',
        'Nada: las dos ejecuciones son de sistemas distintos y no se pueden comparar',
      ],
      because: `La primera. Un único ángulo librante podría en principio ser un
                artefacto: del integrador, de cómo se definió el ángulo, del
                trazado. El control lo descarta: mismo instrumento, mismo
                integrador, misma definición del ángulo, misma geometría inicial,
                y un número distinto, y circula. Sea lo que sea lo que mide el
                instrumento, es algo del sistema.

                \n\nEsta es la forma de un experimento controlado, y el Banco A/B
                de Herramientas está hecho para ejecutarlos. Merece la pena
                capturar ambos como pareja si quieres la comparación en tu
                informe.`,
    },
    {
      title: 'El caso incómodo',
      body: `De vuelta al sistema intacto, y ahora a Calisto: la de la razón más
             limpia de todo el sistema.

             \n\nEl instrumento ha hallado la razón de enteros pequeños más
             cercana al periodo de Calisto sobre el de Ganímedes, que es 7:3, y
             ha construido el argumento correspondiente:

             \n\n<strong>7λ<sub>Calisto</sub> − 3λ<sub>Ganímedes</sub> −
             4ϖ<sub>Calisto</sub></strong>

             \n\nCoeficientes 7 − 3 − 4 = 0, como debe ser. Esto es exactamente
             lo que harías si creyeras en la razón.

             \n\nDéjalo correr dos o tres minutos y observa qué hace el
             veredicto. Después lee la lectura con atención, sobre todo la línea
             que dice qué falta.`,
      checklist: [
        'Déjalo correr al menos dos minutos',
        'Anota todos los veredictos que dé, en orden',
        'Lee la cota que da sobre cualquier circulación',
        'Anota la amplitud, y si el instrumento la llama una cota',
      ],
      rubric: `Se espera que el veredicto pase de «confinado» a «el centro se
               desplaza» o «se ha dado la vuelta una vez», y que nunca llegue a
               LIBRACIÓN. Puntuación completa por informar de la secuencia y no
               sólo del final, y por advertir que la amplitud informada no deja
               de crecer, que es la señal.`,
    },
    {
      title: 'La mejor razón del sistema',
      body: `La razón de periodos de Calisto con Ganímedes es 2,3327, a un
             0,03 % de 7:3: unas veinticinco veces más cerca que el azar. La de
             Plutón con Neptuno, que estás a punto de conocer, queda a un 0,30 %
             de 3:2, unas cuatro veces más cerca que el azar. Plutón está en
             resonancia. Calisto no.

             \n\nEn una ejecución suficientemente larga, el argumento 7:3 de
             Calisto completa una vuelta: circula, con un periodo de unas tres
             mil órbitas de Ío. Dentro de una ejecución de duración lectiva el
             instrumento no puede verlo, y lo dice.`,
      prompt:
        'Un colega dice que el instrumento debería haber declarado resonante a Calisto, porque su ángulo se mantuvo dentro de 100° durante toda la ejecución. ¿Cuál es la mejor respuesta?',
      options: [
        'Tiene razón: 100° de 360° es confinamiento, y el confinamiento es lo que es una resonancia',
        'Mantenerse dentro de 100° es lo que parece una circulación lenta al principio; la amplitud que informó el instrumento no dejó de crecer, cosa que la de una libración no haría',
        'El ángulo era el equivocado: otra combinación habría librado',
        'La ejecución fue demasiado corta para decir nada en absoluto sobre Calisto',
      ],
      because: `La segunda, y la amplitud creciente es la prueba concreta. Una
                libración vuelve a los mismos extremos: sus máximos están todos
                más o menos en el mismo valor, vuelta tras vuelta. Cada uno de
                los de Calisto superaba al anterior, así que el centro se
                desplazaba, y un ángulo cuyo centro se desplaza va camino de dar
                la vuelta.

                \n\nLa cuarta opción es tentadora y ligeramente falsa. La
                ejecución <em>sí</em> estableció algo: cualquier circulación es
                más lenta que unos cientos de ciclos de conjunción. Es una
                restricción genuina. Sólo que no es una resonancia.`,
    },
    {
      title: 'La órbita que se cruza y nunca choca',
      body: `La órbita de Plutón cruza la de Neptuno. En el perihelio Plutón está
             a 29,7 UA del Sol; la órbita de Neptuno está a 30,1. Durante veinte
             años de cada 248, Plutón es el octavo planeta.

             \n\nEsto se advirtió en cuanto se conoció su órbita, y era un
             problema: dos cuerpos en órbitas que se cruzan deberían acabar
             encontrándose, y en escalas de tiempo del Sistema Solar «acabar» no
             es mucho. Y sin embargo Plutón lleva ahí miles de millones de años.

             \n\nCohen y Hubbard dieron con la respuesta en 1965 integrando la
             órbita hacia adelante: Plutón y Neptuno están en una resonancia 3:2.
             Plutón da dos vueltas por cada tres años neptunianos, y el argumento
             resonante

             \n\n<strong>φ = 3λ<sub>Plutón</sub> − 2λ<sub>Neptuno</sub> −
             ϖ<sub>Plutón</sub></strong>

             \n\nlibra en torno a 180° en lugar de circular.

             \n\nEste escenario está a escala real —toda distancia y todo periodo
             que informa la aplicación son los reales— pero corre deprisa: unos
             270 años por segundo, porque una sola libración de ese ángulo tarda
             veinte mil años. Se incluye un tercer cuerpo, en una órbita casi
             igual pero fuera de la resonancia. Observa qué le ocurre.`,
      tip: 'Dos desviaciones respecto de la realidad, ambas declaradas en el modelo: Gravitas es bidimensional, así que la inclinación de 17° de Plutón queda proyectada, y Plutón parte de la 3:2 exacta y no de su distancia observada. Ninguna de las dos afecta al argumento que vas a medir.',
    },
    {
      title: 'Mide la resonancia de Plutón',
      body: `Déjalo correr minuto y medio. Este llega a su veredicto deprisa: la
             libración es lo bastante amplia y rápida en estas unidades como para
             que el ángulo se dé la vuelta dos veces en noventa segundos.

             \n\nObserva el gráfico desplegado. Así es como se ve una libración
             cuando no hay ambigüedad alguna: una onda limpia, que se da la
             vuelta en los mismos dos niveles cada vez, con la banda ajustada por
             el instrumento sombreada detrás.`,
      checklist: [
        'Ejecuta unos noventa segundos',
        'Lee el veredicto, el centro y la amplitud',
        'Lee el periodo de libración en años',
        'Observa el tercer cuerpo, el Errante No Ligado, en la vista principal',
      ],
      rubric: `Se espera LIBRACIÓN en torno a 180° con una amplitud cercana a 80°
               y un periodo cercano a 19.600 años. Los valores publicados son
               180°, unos 82° y 19.670 años. Puntuación completa por los tres más
               la observación de que el ángulo del errante circula.`,
    },
    {
      title: 'Registra la libración de Plutón',
      body: `Lee estos valores del instrumento.`,
      fields: [
        { label: 'centro de libración', unit: 'grados' },
        { label: 'amplitud', unit: 'grados' },
        { label: 'periodo de libración', unit: 'años' },
      ],
    },
    {
      title: 'Dónde ocurren las alineaciones',
      body: `Ahora la misma ejecución, vista como conjunciones. El disco
             izquierdo es dónde se alinean Plutón y Neptuno vistos desde el Sol;
             el derecho es dónde estaba Plutón en su propia órbita cuando lo
             hicieron.

             \n\nCompara las dos flechas. Una es corta y otra es larga, y la
             diferencia entre ambas es todo el mecanismo de protección.`,
      checklist: [
        'Compara la dispersión en los dos discos',
        'Lee la posición media en la órbita exterior',
        'Lee la línea que da el instrumento bajo «Lo que significa»',
      ],
      rubric: `El disco izquierdo debería ser una mancha ancha; el derecho
               debería agruparse cerca de 180°, que es el afelio, con una
               dispersión de unos 38°. Puntuación completa por informar de que
               toda conjunción Plutón–Neptuno ocurre cerca del punto más alejado
               de Plutón respecto del Sol.`,
    },
    {
      title: 'Por qué 180° protege a Plutón',
      body: `Toma el argumento φ = 3λ<sub>Plutón</sub> − 2λ<sub>Neptuno</sub> −
             ϖ<sub>Plutón</sub> y evalúalo en una conjunción, donde las dos
             longitudes medias son iguales. Llama λ<sub>c</sub> a ese valor
             común. Entonces

             \n\nφ = 3λ<sub>c</sub> − 2λ<sub>c</sub> − ϖ<sub>Plutón</sub> =
             λ<sub>c</sub> − ϖ<sub>Plutón</sub>

             \n\ny ϖ<sub>Plutón</sub> es la dirección del perihelio de Plutón.`,
      prompt:
        'φ libra en torno a 180°, así que en cada conjunción Plutón está…',
      options: [
        'en el perihelio, lo más cerca del Sol',
        'a media vuelta del perihelio: en el afelio, lo más lejos del Sol',
        'a un cuarto de vuelta del perihelio',
        'en un sitio distinto cada vez, puesto que φ no es exactamente 180°',
      ],
      because: `En el afelio. La única línea de álgebra de arriba es todo el
                mecanismo: φ = 180° <em>es</em> la afirmación de que las
                conjunciones ocurren a media vuelta del perihelio de Plutón.

                \n\nPlutón cruza la órbita de Neptuno cerca del perihelio, a
                29,7 UA. Alcanza el afelio a 49,3 UA. Así que la resonancia se
                encarga de que Neptuno esté en cualquier otra parte cuando Plutón
                pasa por el tramo peligroso de su órbita, y de que ambos se
                encuentren sólo cuando Plutón está casi veinte UA más allá del
                alcance de Neptuno. En esta ejecución lo más cerca que llegan son
                16,6 UA; la cifra real, con la inclinación de Plutón incluida, es
                17,2.

                \n\nLa cuarta opción merece un momento. φ no es exactamente 180°
                —oscila 80° a cada lado— y por eso las conjunciones se reparten
                por unos 38° de la órbita de Plutón en vez de caer en un solo
                punto. La protección no necesita que caigan en un punto. Necesita
                que se mantengan lejos del perihelio, y una libración de 80° en
                torno a 180° lo consigue de sobra.`,
    },
    {
      title: 'Sesenta grados por delante',
      body: `El último caso es el más extraño, y también es una resonancia: una
             1:1.

             \n\nLagrange demostró en 1772 que si pones un tercer cuerpo ligero
             en el vértice lejano de un triángulo equilátero con el Sol y
             Júpiter, las fuerzas sobre él salen exactamente bien: rodea el Sol
             al ritmo de Júpiter y conserva su posición relativa a Júpiter para
             siempre. Hay dos vértices así, 60° por delante y 60° por detrás,
             llamados L4 y L5. Se conocen unos diez mil asteroides en ellos.

             \n\nGascheau demostró en 1843 que esos dos puntos son estables sólo
             cuando el primario supera 24,96 veces al secundario. El Sol es 1.047
             veces Júpiter, así que lo son. Hay un tercer equilibrio, L3,
             directamente opuesto a Júpiter, y ese no es estable, que es la
             comparación en torno a la cual está construido este escenario.

             \n\nNada de esto se ve desde fuera. En el marco inercial un troyano
             simplemente rodea el Sol en una órbita idéntica a la de Júpiter. Hay
             que <strong>girar con Júpiter</strong> para ver algo, que es lo que
             hace el siguiente instrumento.

             \n\nHay cuatro cuerpos de prueba en la escena: uno colocado
             exactamente en L4, el troyano real 617 Patroclo desplazado de L5,
             una sonda a un grado de L3, y otra en una órbita circular corriente
             un cuarto más ancha.`,
    },
    {
      title: 'El marco rotante',
      body: `Déjalo correr minuto y medio. En esta vista Júpiter está fijo a la
             derecha, a una unidad del Sol, y las dos cruces son L4 y L5:
             exactamente los vértices de los triángulos equiláteros.

             \n\nCuatro cuerpos, cuatro comportamientos distintos:

             \n\nLa <strong>sonda L4</strong> se queda en su cruz y no se mueve.
             Eso es un equilibrio.

             \n\n<strong>Patroclo</strong> dibuja un lazo largo y aplanado
             alrededor de L5. Es una órbita de <em>renacuajo</em>, y es lo que
             hace un troyano real: no se queda en el punto, lo rodea.

             \n\nLa <strong>sonda L3</strong> partió a un grado de un equilibrio
             y se marcha. Observa hasta dónde llega.

             \n\nLa <strong>sonda de órbita ancha</strong> no es coorbital en
             absoluto, y en este marco simplemente da vueltas y vueltas.

             \n\nLa lectura clasifica cada una. Necesita unos veinte años
             jovianos antes de comprometerse con nada, que son unos cuarenta y
             cinco segundos.`,
      checklist: [
        'Identifica los cuatro cuerpos en el marco rotante',
        'Lee el veredicto de cada uno',
        'Anota el centro y la amplitud de Patroclo',
        'Anota hasta dónde viaja la sonda L3',
      ],
      rubric: `Se espera: la sonda L4 informada como equilibrio con amplitud de
               0°; Patroclo librando en torno a unos −64° (es decir, 296°) con
               amplitud cercana a 24° y periodo cercano a 13 años jovianos; la
               sonda L3 alejándose más de 150° de donde partió; la sonda ancha
               circulando. Puntuación completa por las cuatro y por usar el marco
               rotante en lugar de la vista principal para leerlas.`,
    },
    {
      title: 'Registra el renacuajo',
      body: `Patroclo es un objeto real y esta es una medida real del tipo que se
             hace para él. Lee su libración en el instrumento del marco.

             \n\nEl periodo teórico de renacuajo para amplitud pequeña, según el
             problema restringido de tres cuerpos linealizado, es
             P<sub>Júpiter</sub> ÷ √(27μ/4) con μ la fracción de masa que
             corresponde a Júpiter, lo que da 12,47 años jovianos.`,
      fields: [
        { label: 'centro de libración, medido desde Júpiter', unit: 'grados' },
        { label: 'amplitud', unit: 'grados' },
        { label: 'periodo de libración', unit: 'años jovianos' },
      ],
    },
    {
      title: 'Dos equilibrios, un superviviente',
      body: `L3, L4 y L5 son todos puntos de equilibrio: un cuerpo colocado
             exactamente en cualquiera de ellos se queda ahí. La sonda L4 de esta
             ejecución lo demuestra. La sonda L3 partió a un grado y, en unos
             treinta años jovianos, se había alejado más de 150° de donde
             empezó.`,
      prompt: '¿Cuál es la diferencia entre L4 y L3?',
      options: [
        'L3 no es realmente un equilibrio; el desfase de un grado demuestra que el cálculo está mal',
        'Ambos son equilibrios, pero sólo L4 es estable: un pequeño desplazamiento desde L4 produce una fuerza de vuelta hacia él, y desde L3 una fuerza que aleja',
        'L3 está más lejos de Júpiter, así que su atracción es demasiado débil para sujetar nada ahí',
        'L3 es inestable porque a la sonda se le dio una velocidad equivocada',
      ],
      because: `Ambos son equilibrios; sólo L4 y L5 son estables. La distinción
                es la misma que hay entre una canica en el fondo de un cuenco y
                una canica en equilibrio sobre una cúpula. En ambos sitios la
                fuerza neta es cero. Sólo uno de los dos sobrevive a un empujón.

                \n\nEn L3 un pequeño desplazamiento crece exponencialmente, con un
                tiempo de crecimiento de unos tres años jovianos, así que un grado
                se convierte en ciento ochenta en unos veinticinco, que es lo que
                acabas de ver. No escapa del sistema: se instala en una
                <em>herradura</em>, una órbita coorbital mucho más ancha que la
                lleva más allá de ambos puntos triangulares y de vuelta. Sigue
                siendo una resonancia 1:1, y de una forma completamente distinta.

                \n\nY es la razón de que no haya asteroides en L3 y sí diez mil en
                L4 y L5. La estabilidad no es un detalle; es toda la razón de que
                exista una población.`,
    },
    {
      title: 'Una última razón',
      body: `El cuarto cuerpo de esta escena va en una órbita circular corriente
             un cuarto más ancha que la de Júpiter. Su razón de periodos con
             Júpiter es 1,4036.

             \n\nEl instrumento ha hallado la razón pequeña más cercana a eso y
             ha construido el argumento correspondiente. Mira qué ha encontrado y
             cómo de cerca está.

             \n\nDespués mira el veredicto.`,
      checklist: [
        'Lee la razón de enteros pequeños más cercana y el desfase porcentual',
        'Compara ese desfase con el 0,30 % de Plutón respecto de 3:2',
        'Lee el veredicto del argumento',
      ],
      rubric: `El instrumento debería informar de una razón más cercana de 7:5, un
               desfase de un 0,25 % aproximadamente y unas 4,6 veces más cerca
               que el azar, mejor que la 3:2 de Plutón. El veredicto para el
               ángulo coorbital debería ser circulación. Puntuación completa por
               enunciar la comparación explícitamente: este cuerpo tiene mejor
               razón que Plutón y no está en resonancia alguna.`,
    },
    {
      title: 'Qué puedes y qué no puedes concluir de una razón',
      body: `Reúne los cuatro casos.

             \n\n<strong>Ío–Europa–Ganímedes.</strong> Razones a un 0,4 % y un
             0,7 % de 2:1 aproximadamente, en torno al doble de bueno que el
             azar. El argumento de
             Laplace libra en torno a 180° con un periodo de 2.100 días.
             <em>Resonante.</em>

             \n\n<strong>Calisto–Ganímedes.</strong> Razón a un 0,03 % de 7:3,
             veinticinco veces mejor que el azar, la más limpia del sistema. El
             argumento deriva, y cada oscilación termina más allá que la
             anterior. <em>No resonante.</em>

             \n\n<strong>Plutón–Neptuno.</strong> Razón a un 0,30 % de 3:2,
             cuatro veces mejor que el azar. El argumento libra en torno a 180°
             con un periodo de 19.600 años. <em>Resonante.</em>

             \n\n<strong>La sonda ancha–Júpiter.</strong> Razón a un 0,25 % de
             7:5, casi cinco veces mejor que el azar, mejor que Plutón. El ángulo
             circula. <em>No resonante.</em>

             \n\nOrdena esos cuatro por lo cerca que está la razón y obtienes
             Calisto, la sonda, Plutón, las lunas. Ordénalos por si son
             resonantes y obtienes un orden completamente distinto. La razón no
             predice la respuesta, y nunca iba a hacerlo: es una condición
             necesaria, no suficiente. Una resonancia requiere una razón casi
             conmensurable igual que un fuego requiere oxígeno.

             \n\nLo que sí zanja la cuestión es un ángulo que se da la vuelta.`,
    },
    {
      title: 'El informe que escribirías',
      body: `Un colega te envía un par de cuerpos recién descubiertos. La razón
             de periodos es 1,9987: a un 0,065 % de 2:1, unas doce veces más
             cerca que el azar. Han integrado el sistema durante el equivalente a
             cuarenta ciclos de conjunción y el argumento resonante 2:1 se
             mantuvo dentro de 30° de un valor constante todo el tiempo,
             derivando lentamente en un sentido.`,
      prompt: '¿Qué debería afirmar el artículo?',
      options: [
        'Que el par está en resonancia 2:1, apoyándose en una razón doce veces más cerca que el azar y en un ángulo confinado',
        'Que el par no está en resonancia, puesto que el ángulo derivó',
        'Que el ángulo está confinado a menos de 30° a lo largo de cuarenta ciclos de conjunción, lo que acota cualquier circulación en unos 480 ciclos, y que hace falta una integración más larga para distinguir libración de circulación lenta',
        'Que no puede decirse nada hasta medir la razón con más precisión',
      ],
      because: `La tercera, y la aritmética que contiene es lo importante.
                Treinta grados en cuarenta ciclos son 0,75° por ciclo, así que
                los 360° completos tardarían unos 480 ciclos: doce veces más que
                la integración. Ese es un resultado real y citable, y no es una
                resonancia.

                \n\nLa primera opción es a lo que invita la regla de la razón y
                es exactamente el error contra el que está ahí Calisto. La
                segunda exagera en el otro sentido: una deriva a lo largo de una
                fracción del periodo de libración es también lo que parece una
                libración. La cuarta yerra del todo: más decimales en la razón no
                ayudarían, porque la razón nunca fue la prueba.

                \n\nEjecútalo más tiempo. Es lo único que lo zanja, y es lo que
                hicieron Cohen y Hubbard en 1965 con Plutón.`,
    },
    {
      title: 'Adónde lleva esto',
      body: `La resonancia no es una curiosidad del borde del Sistema Solar. Es
             una de las principales cosas que decidieron el aspecto que tiene el
             Sistema Solar.

             \n\n<strong>Los huecos de Kirkwood.</strong> El cinturón de
             asteroides tiene huecos justo donde el periodo de un asteroide sería
             una razón simple del de Júpiter: 3:1, 5:2, 7:3, 2:1. Ahí la
             resonancia hace lo contrario de proteger: bombea la excentricidad
             hasta que el asteroide cruza la órbita de un planeta y es eliminado.
             Mismo mecanismo, resultado opuesto, y cuál de los dos se obtiene
             depende de la geometría que sostiene la libración.

             \n\n<strong>Plutón no está solo.</strong> Se conocen centenares de
             objetos del cinturón de Kuiper en la misma 3:2 con Neptuno; se los
             llama plutinos. Se cree que fueron barridos mientras Neptuno migraba
             hacia fuera al principio de la historia del Sistema Solar, con la
             resonancia avanzando por delante y llevándose lo que atrapaba. La
             población es un fósil de aquella migración.

             \n\n<strong>Ío es el cuerpo volcánicamente más activo que se
             conoce.</strong> La resonancia de Laplace mantiene su órbita
             ligeramente excéntrica —a solas, las mareas la habrían circularizado
             hace mucho— y una órbita excéntrica significa que el apretón de
             marea de Júpiter cambia a lo largo de cada vuelta. Ese amasado es lo
             que funde el interior. Los volcanes los alimenta la resonancia.

             \n\n<strong>Y no ocurre sólo aquí.</strong> Kepler halló cadenas
             enteras: los siete planetas de TRAPPIST-1 forman una cadena
             resonante, y los cuatro de Kepler-223 también. Esas cadenas son la
             prueba más sólida que existe de que los planetas migran después de
             formarse, porque una cadena es muy difícil de construir de otro
             modo.

             \n\nTodo ello descansa en la misma medida que acabas de hacer cuatro
             veces: ¿el ángulo vuelve, o da la vuelta?`,
      tip: 'El escenario Sistema TRAPPIST-1 está en la galería si quieres ver una cadena resonante de siete eslabones.',
    },
  ],
};
