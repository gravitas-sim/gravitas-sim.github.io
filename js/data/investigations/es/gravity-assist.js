// =============================================================================
// gravity-assist - es
// -----------------------------------------------------------------------------
// A shadow of ../gravity-assist.js carrying only its words. Laid over the
// English lesson by mergeTranslation() in ../i18n.js, so anything absent here
// keeps its English and nothing here can reach the lesson's machinery: no
// scenario name, no seed, no numeric answer, no unit token.
//
// `expect` is deliberately absent. Its `unit` and `accept` entries are tokens
// the answer parser matches against, not prose, and a translated copy of them
// would stop the parser recognising what a student typed.
//
// Arrays line up by index with the English. `null` means "not translated";
// that entry keeps its English.
// =============================================================================

export default {
  title: '¿De dónde saca su velocidad una asistencia gravitatoria?',
  subtitle:
    'El mismo sobrevuelo, medido en dos sistemas de referencia, con dos respuestas distintas',
  duration: '15-20 min',
  level: 'Astronomía introductoria',
  summary:
    'La Voyager 2 llegó a Júpiter a diez kilómetros por segundo y se marchó a veintiséis. Júpiter no quemó combustible por ella. Haz tú mismo la misma maniobra, mídela en el sistema del planeta y en uno inercial, lánzala por los dos lados del planeta a la vez, y averigua por qué las dos medidas no coinciden, y quién pagó en realidad.',
  objectives: [
    'Predecir si un sobrevuelo gana o pierde velocidad según por qué lado del planeta pase',
    'Decir qué cambia y qué no puede cambiar una asistencia gravitatoria, en el sistema del planeta y en uno inercial',
    'Explicar el cambio de velocidad como la rotación de un vector sumado a otro, y no como un empujón',
    'Identificar de dónde sale la energía y mostrar que el balance de momento lineal cuadra',
    'Decir por qué el sistema del planeta es exactamente inercial sin estrella y solo aproximadamente con una',
    'Distinguir una rapidez que depende del sistema de referencia de las magnitudes que el conjunto conserva en todos ellos',
  ],
  steps: [
    {
      title: 'La Voyager se marchó más rápido de lo que llegó',
      body: `En julio de 1979 la Voyager 2 pasó junto a Júpiter. Se acercó a unos
             diez kilómetros por segundo respecto del Sol y se marchó a unos
             veintiséis. Con los motores apagados.
             \n\nEsto no es una curiosidad. Todas las misiones al sistema solar
             exterior han dependido de ello: la Voyager no habría llegado a
             Neptuno, la Cassini no habría llegado a Saturno y la New Horizons
             no habría llegado a Plutón en menos de una década sin tomar
             prestada velocidad de algún planeta por el camino.
             \n\nLa pregunta es la evidente, y tiene una respuesta de verdad y no
             un truco. <strong>¿De dónde salió la velocidad?</strong>`,
      tip: 'La Voyager 2 sigue alejándose a unos 15 km/s, casi todo prestado por Júpiter, Saturno, Urano y Neptuno, uno tras otro.',
    },
    {
      title: 'El sobrevuelo más simple posible',
      body: `En pantalla está la versión menos recargada de esa maniobra que
             podría construirse. Un planeta de cinco masas de Júpiter, a la
             deriva por el espacio vacío a 2,83 kilómetros por segundo. Una nave
             de una masa terrestre que cruza su camino. <strong>Nada más en
             absoluto</strong>: ni estrella, ni otros planetas, ni luz.
             \n\nLa estrella ausente es lo importante. Sin nada más en el
             universo, el planeta viaja en línea perfectamente recta a velocidad
             perfectamente constante, lo que significa que su punto de vista es
             un sistema <em>inercial</em>: tan bueno para medir como cualquier
             otro, y sin aceleración.
             \n\nEso importa porque la respuesta a la pregunta de la Voyager va a
             ser un desacuerdo entre dos sistemas de referencia, y es mucho más
             fácil fiarse de un desacuerdo cuando uno de los dos es exactamente
             correcto y no casi correcto.`,
      tip: 'Se cree que los planetas errantes, a la deriva entre las estrellas sin sol propio, son abundantes. Este es un recurso didáctico, pero no es un objeto imposible.',
    },
    {
      title: '¿Por qué lado?',
      body: `La nave puede pasar por cualquiera de los dos lados del planeta: por
             delante, en la dirección hacia la que este se dirige, o por detrás,
             por el espacio que acaba de dejar atrás.
             \n\nUna de esas opciones acelera la nave y la otra la frena.
             Comprométete antes de ejecutar nada.`,
      prompt: 'Para ganar velocidad, la nave debería pasar:',
      options: [
        'Por delante del planeta, para que su gravedad tire de ella hacia adelante',
        'Por detrás del planeta, por el espacio que acaba de dejar libre',
        'Por cualquiera: la ganancia depende de lo cerca que pase, no del lado',
        'Directamente hacia el planeta, para recibir el tirón más fuerte posible',
      ],
      because: `Por detrás. La intuición de que el planeta "tira de ella hacia
                adelante" desde delante es la natural y equivoca el signo: a una
                nave que pasa por delante del planeta se la tira hacia
                <em>atrás</em> respecto del movimiento de este. Al pasar por
                detrás, se la arrastra en la dirección en que el planeta va.`,
    },
    {
      title: 'Lánzala',
      body: `El panel de <strong>asistencia gravitatoria</strong> ya está
             abierto. Está fijado en un parámetro de impacto de
             <strong>+40</strong>, que hace pasar a la nave por detrás del
             planeta, y el encuentro dura unos nueve segundos.
             \n\nPulsa <strong>Lanzarla</strong>. Mira cómo se curva la
             trayectoria. Después lee las dos columnas: son toda la lección, y
             no coinciden.`,
      checklist: [
        'Observa cómo se curva la estela mientras la nave rodea el planeta',
        'Lee la columna izquierda: la velocidad respecto del planeta, antes y después',
        'Lee la columna derecha: la velocidad respecto de todo lo demás, antes y después',
        'Fíjate en que solo una de las dos ha cambiado',
        'Pulsa "Sistema del planeta" y mira el mismo encuentro redibujado desde el punto de vista del planeta',
      ],
      tip: 'El botón de sistema de referencia reexpresa toda la imagen, estelas incluidas, en el sistema del planeta. Ahí el planeta se queda quieto y la nave pasa barriendo una hipérbola.',
    },
    {
      title: 'Las dos columnas',
      body: `Con el sobrevuelo terminado, lee cuatro velocidades del panel. Están
             en kilómetros por segundo.`,
      fields: [
        { label: 'Respecto del planeta, antes', unit: 'km/s', hint: 'km/s' },
        { label: 'Respecto del planeta, después', unit: 'km/s', hint: 'km/s' },
        {
          label: 'Respecto de todo lo demás, antes',
          unit: 'km/s',
          hint: 'km/s',
        },
        {
          label: 'Respecto de todo lo demás, después',
          unit: 'km/s',
          hint: 'km/s',
        },
      ],
    },
    {
      title: '¿Cómo pueden ser ciertas las dos cosas?',
      body: `Respecto del planeta: 4,343 km/s antes y 4,343 km/s después; el
             panel da el cambio como tres partes en cien mil millones, que es
             cero a cualquier precisión que importe.
             \n\nRespecto de todo lo demás: 3,32 km/s antes y 5,89 km/s después.
             Un aumento del setenta y ocho por ciento.
             \n\nLas dos medidas son de la misma nave en los mismos dos
             instantes.`,
      prompt: 'La razón de que no coincidan es:',
      options: [
        'La gravedad del planeta realizó trabajo sobre la nave, y el sistema del planeta no puede verlo',
        'La velocidad depende de respecto a qué se mida, y los dos sistemas se mueven uno respecto del otro',
        'Una de las dos medidas es una aproximación',
        'La energía no se conserva durante una asistencia gravitatoria',
      ],
      because: `La velocidad no es una propiedad de un objeto. Es una propiedad
                de un objeto <em>y</em> de algo contra lo que medirla, y las dos
                columnas miden contra cosas distintas. No se aproximó nada -sin
                estrella presente los dos números son exactos- y no apareció
                energía de ninguna parte. La pantalla siguiente es la aritmética.`,
    },
    {
      title: 'Es un vector, rotado',
      body: `Aquí está todo el mecanismo, y no es un empujón.
             \n\nEn el sistema del planeta, el encuentro solo puede hacerle una
             cosa a la velocidad de la nave: <strong>girarla</strong>. La
             longitud no puede cambiar, porque la nave cae hacia el planeta y
             vuelve a subir exactamente la misma profundidad, así que llega
             exactamente con la velocidad con la que entró. La tuya giró 58,6
             grados.
             \n\nPara volver al otro sistema, suma la velocidad del propio
             planeta. Ese es todo el truco:
             \n\n<strong>v(todo lo demás) = v(planeta) + v(respecto del planeta)</strong>
             \n\nAntes del encuentro esos dos vectores se cancelan en parte y la
             suma es corta. Después, el segundo ha sido rotado, así que en parte
             se refuerzan y la suma es larga. Las mismas dos longitudes, otro
             ángulo entre ellas, otro total. Nadie empujó nada.`,
      tip: 'Por eso la maniobra se explica a veces como hacer rebotar una pelota de tenis en un tren en marcha. La pelota se marcha del tren a la velocidad con la que llegó, en el sistema del tren; en el de la estación se marcha mucho más rápido.',
    },
    {
      title: 'Ahora el otro lado, los dos a la vez',
      body: `Si la ganancia viene de sumar un vector rotado, entonces rotarlo
             hacia el otro lado debería restar en vez de sumar.
             \n\nPodrías pulsar <strong>El otro lado</strong> y lanzarla otra
             vez, pero entonces los números que acabas de anotar estarían fuera
             de la pantalla mientras lees los nuevos, y la comparación que vas a
             hacer es entre dos de ellos a la vez.
             \n\nAsí que abre <strong>Los dos lados, guardados uno al lado del
             otro</strong> bajo el panel y pulsa <strong>Ejecutar los dos
             pasos</strong>. Lanza <strong>+40</strong> y <strong>−40</strong>,
             reconstruyendo el encuentro desde la misma configuración de partida
             cada vez para que el signo del parámetro de impacto sea lo único que
             cambia, y conserva los dos. Tarda alrededor de <strong>un
             minuto</strong>.`,
      checklist: [
        'Observa cómo se ejecutan los dos pasos y lee la tabla cuando se estabilice',
        'Busca la fila que es igual en las dos columnas, y la fila que no lo es',
        'Comprueba la fila de máxima aproximación: los dos pasos se acercaron igual',
        'Lee la fila «Encuentro» del final: los dos deberían decir que se midieron a la entrada y a la salida',
      ],
      tip: 'La desviación es idéntica por los dos lados: 58,63 grados. Solo cambia su sentido, y la tabla muestra los dos.',
    },
    {
      title: 'Dos pasos, tres números',
      body: `Lee esto en la tabla de comparación. La fila de <em>cambio de
             rapidez</em> lleva signo: una columna ganó y la otra perdió. La
             fila de <em>cambio de velocidad</em> es una longitud, así que no
             tiene signo, y es la fila que merece mirarse dos veces.`,
      fields: [
        { label: 'Rapidez ganada pasando por detrás', hint: 'km/s' },
        {
          label: 'Rapidez perdida pasando por delante (como número positivo)',
          hint: 'km/s',
        },
        {
          label: 'Cambio de velocidad, en cualquiera de las columnas',
          hint: 'km/s',
        },
      ],
      tip: 'La advertencia bajo la tabla dice con qué precisión coinciden los dos cambios de velocidad. En el laboratorio aislado son unas pocas partes en 10¹³, que es el integrador y no la física.',
    },
    {
      title: '¿Por qué la pérdida es menor que la ganancia?',
      body: `Las dos columnas siguen en pantalla, que es para lo que sirve
             ejecutarlas juntas. Pasando por detrás, la nave fue de 3,32 a 5,89
             km/s: una ganancia de 2,57. Pasando por delante, fue de 3,32 a
             1,64: una pérdida de 1,67.
             \n\nMismo planeta, misma velocidad de aproximación, misma máxima
             aproximación con un error de una parte en 10¹², misma desviación
             con un error de una parte en 10¹², geometría especular, y los dos
             cambios no son del mismo tamaño. La tabla informa de esas cuatro
             coincidencias, así que la asimetría no se puede achacar a ninguna
             de ellas.`,
      prompt: 'La mejor explicación es:',
      options: [
        'La simulación pierde algo de energía en el paso perdedor',
        'La velocidad es la longitud de una suma de vectores, y las longitudes no se suman y restan de forma simétrica',
        'La gravedad del planeta es más fuerte por el lado de atrás',
        'El paso perdedor se acercó más al planeta',
      ],
      because: `Geometría, no física. El <em>cambio de velocidad</em> tiene el
                mismo tamaño en los dos casos: es la misma rotación del mismo
                vector, así que su módulo es idéntico. Pero la rapidez es la
                <em>longitud</em> de la suma resultante, y sumar un vector de
                longitud fija a otro con ángulos distintos no cambia esa longitud
                de forma simétrica. Si dudas de la cuarta opción, mira la fila
                de máxima aproximación: es de 0,234 AU en los dos pasos, y la
                tabla dice con qué precisión.`,
    },
    {
      title: '¿Cuánto hay que llevarse?',
      body: `Hay un límite duro a lo que puede hacer un solo sobrevuelo, y sale
             directamente de la imagen de la pantalla anterior. Lo máximo que
             puede hacer el encuentro es invertir por completo la velocidad
             relativa: un giro de 180 grados, que exige un paso rasante. En ese
             caso el cambio de velocidad es el doble de la velocidad de
             aproximación.
             \n\nTu nave se aproximó a 4,343 km/s respecto del planeta.`,
      prompt:
        'El mayor cambio de velocidad que podría producir cualquier sobrevuelo de este planeta a esta velocidad de aproximación, en km/s',
      unit: 'km/s',
      hints: {
        concept: `Una inversión completa lleva la velocidad relativa de apuntar
                  en un sentido a apuntar exactamente en el contrario. ¿Cuánto
                  ha cambiado?`,
        method: `El doble de la velocidad de aproximación.`,
      },
      worked: `2 × 4,343 = 8,686 km/s. Tu paso real consiguió 2,57 km/s de
               ganancia, bastante por debajo del techo, porque un giro de 58
               grados queda muy lejos de una inversión.`,
      because: `Unos 8,7 km/s. Fíjate en qué fija ese techo: la
                <strong>velocidad de aproximación</strong>, no la masa del
                planeta. Un planeta más pesado curva más la trayectoria y por
                tanto se acerca más al techo, pero no puede subirlo. Por eso las
                asistencias valen tanto en el sistema solar exterior -una nave
                que pasa despacio junto a Júpiter tiene poca velocidad de
                aproximación y un giro grande- y tan poco en Mercurio.`,
    },
    {
      title: 'Alguien pagó eso',
      body: `Vuelve a lanzar el paso ganador con el parámetro de impacto otra vez
             en <strong>+40</strong>, y esta vez lee la parte de abajo del panel:
             el cambio de velocidad del propio planeta, y el balance de momento
             lineal que hay debajo.`,
      fields: [
        {
          label: 'El cambio de velocidad del planeta',
          unit: 'mm/s',
          hint: 'mm/s',
        },
        {
          label:
            'Con qué precisión coinciden los dos cambios de momento, en por ciento',
          unit: '%',
          hint: 'por ciento',
        },
      ],
    },
    {
      title: 'Entonces, ¿de dónde salió la energía?',
      body: `La energía cinética de la nave se multiplicó por tres. El planeta se
             frenó unos cuatro milímetros por segundo -una parte en un millón de
             su propia velocidad- y los dos cambios de momento lineal coinciden
             con una diferencia menor que una centésima de por ciento.`,
      prompt: 'En este sistema aislado, la energía extra de la nave salió de:',
      options: [
        'De ninguna parte: las asistencias gravitatorias crean energía de verdad',
        'La energía cinética del planeta, que bajó en la misma cantidad',
        'El campo gravitatorio, que quedó permanentemente alterado',
        'El integrador de la simulación, como error numérico acumulado',
      ],
      because: `La energía cinética del planeta. Es un objeto mucho más pesado
                moviéndose un poco más despacio, y la aritmética cuadra: un
                cambio fraccionario diminuto en una energía cinética enorme es un
                cambio fraccionario enorme en una diminuta. La cuarta opción
                merece descartarse y no solo ignorarse: el panel muestra los dos
                cambios de momento coincidiendo con una diferencia menor que una
                centésima de por ciento, mucho más ajustado de lo que podría ser
                cualquier error acumulado. Lo que queda tampoco es error: las
                lecturas se toman a distancia finita, donde los dos cuerpos
                todavía se atraen muy ligeramente, así que la cifra es menor en
                una máquina que puede integrar el encuentro con pasos más finos.
                La tuya no será la misma que la de tu vecino, y las dos
                descartan la cuarta opción.`,
    },
    {
      title: '¿El sistema de quién, exactamente?',
      body: `Un cabo suelto, y del tipo interesante.
             \n\nToda la lección se apoya en la columna izquierda: la rapidez
             relativa al planeta no cambia. Pero el planeta contra el que mides
             no es el mismo planeta antes y después: retrocedió. La advertencia
             de la comparación dice cuánto: unos cuatro milímetros por segundo,
             que es exactamente una millonésima del propio cambio de velocidad
             de la nave, porque la nave es una millonésima de la masa del
             planeta.
             \n\nAsí que «el sistema del planeta» nombra un sistema inercial a
             la entrada y otro ligeramente distinto a la salida.`,
      prompt: 'Dicho eso, la rapidez invariable de la columna izquierda es:',
      options: [
        'Una aproximación, buena hasta una parte en un millón porque la nave es ligera',
        'Exacta de todos modos: la rapidez de un cuerpo respecto de otro vuelve a su valor anterior a la misma separación, sean cuales sean las dos masas',
        'Incorrecta, y el panel debería medir respecto del baricentro',
        'Exacta solo porque la nave es mucho más ligera que el planeta',
      ],
      because: `Exacta, y no porque la nave sea ligera. Dos cuerpos que caen el
                uno hacia el otro y vuelven a separarse forman un problema de
                Kepler en su coordenada <em>relativa</em>, y ese problema
                devuelve la misma rapidez relativa a la misma separación para
                cualquier par de masas. Haz la nave tan pesada como el planeta y
                la columna izquierda seguiría sin moverse.
                \n\nLo que cambia la masa finita es qué sistemas estás
                nombrando. Vale la pena ser preciso sobre qué sobrevive al
                cambio de sistema y qué no: la <strong>rapidez</strong> depende
                del sistema y las dos columnas no coinciden; el <strong>cambio
                de velocidad</strong> es el mismo vector en todo sistema
                inercial, que es por lo que los dos pasos dan el mismo; y el
                <strong>momento lineal total</strong> del conjunto se conserva,
                que es la fila que el panel llama el balance.`,
      tip: 'El panel lo comprueba en vez de afirmarlo: el cambio de velocidad del planeta dividido por el de la nave debería ser igual a la razón de masas, y la advertencia dice si lo es.',
    },
    {
      title: 'Opcional: ¿cuánto compra pasar más cerca?',
      body: `<strong>Opcional, y lleva unos tres minutos.</strong> Sáltalo si la
             sesión es corta; nada de lo que sigue depende de esto.
             \n\nTodo lo anterior usó un solo parámetro de impacto. Abre
             <strong>Opcional: barrer lo cerca que pasa</strong> y pulsa
             <strong>Ejecutar el barrido</strong>. Lanza cinco pasos por el lado
             que gana -<strong>20, 30, 40, 60 y 90</strong>- manteniendo fijos
             la velocidad de aproximación, el planeta, la nave, el integrador y
             el umbral de medida, y sin variar nada más.
             \n\nEl más cercano de ellos pasa a 0,076 AU del planeta, unos tres
             radios y medio del planeta. Más cerca de eso y el paso deja de ser
             un sobrevuelo y pasa a ser una colisión, y por eso el barrido para
             donde para y no en cero.`,
      checklist: [
        'Predice, antes de que termine: ¿pasar más cerca gana siempre más rapidez?',
        'Lee la columna del giro: debería crecer sin pausa según el paso se acerca',
        'Lee la columna de cambio de rapidez que tiene al lado',
        'Mira la gráfica: los círculos huecos son el giro y los cuadrados rellenos el cambio de rapidez',
      ],
      tip: 'Detener está ahí si lo necesitas. Un barrido detenido conserva los pasos que voló y marca los que nunca alcanzó, en lugar de presentar cuatro puntos como cinco.',
    },
    {
      title: 'Opcional: lee los cinco',
      body: `Dos filas de la tabla y una resta que necesitarás en la pantalla
             siguiente.`,
      fields: [
        { label: 'Giro en el paso más cercano, b = 20', hint: 'grados' },
        { label: 'Cambio de rapidez en b = 20', hint: 'km/s' },
        { label: 'Cambio de rapidez en b = 30', hint: 'km/s' },
      ],
    },
    {
      title: 'Opcional: ¿gana siempre el giro mayor?',
      body: `En tus cinco pasos, el más cercano giró más y ganó más. La
             conclusión evidente es que un giro mayor siempre significa una
             ganancia mayor.
             \n\nAntes de aceptarla, mira para qué <em>sirve</em> el giro. El
             encuentro rota la velocidad de la nave relativa al planeta, y luego
             ese vector rotado se suma a la propia velocidad del planeta. La suma
             es más larga cuando los dos apuntan en la misma dirección.`,
      prompt: 'Así que la mayor ganancia posible con este planeta vendría de:',
      options: [
        'El paso más cercano posible, ya que es el que más gira la velocidad',
        'El paso que gira la velocidad relativa hasta que apunta en la dirección en que se mueve el planeta, y ni un grado más',
        'El paso más ancho, ya que un giro suave desperdicia menos rapidez',
        'Cualquier paso; la ganancia depende solo de la velocidad de aproximación',
      ],
      because: `La segunda. Girar solo ayuda mientras lleva la velocidad relativa
                hacia la dirección en que viaja el planeta; sigue girando más
                allá de esa alineación y los dos vectores vuelven a discrepar y
                la suma se acorta. Aquí la velocidad relativa entrante está a 131
                grados del movimiento del planeta, así que <strong>131
                grados</strong> es el giro que más valdría, y el paso más cercano
                que el planeta sobrevive alcanza unos 97. La loma tiene cima y
                este laboratorio no puede llegar a ella: el paso que giraría 131
                grados pasa a 0,02 AU, que es por dentro del planeta.
                \n\nAsí que tus cinco puntos están todos en la ladera
                ascendente de una curva que sí se da la vuelta. Que aquí ganara
                el giro mayor es un hecho sobre esta geometría, no una regla
                sobre los sobrevuelos.`,
      tip: 'La advertencia bajo la gráfica dice lo mismo, y lo dice salgan como salgan tus cinco.',
    },
    {
      title: 'Opcional: dilo con tus propios números',
      body: `Tu tabla tiene cinco giros y cinco cambios de rapidez. Calcula
             aproximadamente cuánta rapidez compró cada grado extra de giro,
             entre los dos pasos más anchos y luego entre los dos más cercanos.`,
      prompt:
        'Con esas dos cifras, explica en dos o tres frases por qué el barrido es evidencia de que existe un punto de retorno, aunque ninguno de tus cinco pasos esté más allá de él.',
      rubric: `Crédito completo por leer el RENDIMIENTO DECRECIENTE en sus propios
               números y conectarlo con la imagen vectorial. Entre b = 90 y
               b = 60 la ganancia sube unos 0,043 km/s por grado extra de giro;
               entre b = 30 y b = 20 sube unos 0,023 km/s por grado, la mitad
               por cada grado comprado. Una magnitud cuyos incrementos se
               encogen hacia cero se acerca a un máximo, y la imagen vectorial
               dice dónde: en el giro que alinea la velocidad relativa con el
               movimiento del planeta, 131 grados aquí.
               \n\nCrédito también por notar que los cinco puntos por sí solos
               no pueden localizar el punto de retorno, solo mostrar el
               acercamiento. Respuestas erróneas habituales: «la ganancia se
               está aplanando, así que se quedará plana» (una curva con máximo
               baja después de él, y la geometría dice que esta lo hace); «el
               paso más cercano ganó más, así que más cerca siempre es mejor»
               (cierto de estos cinco y de nada más allá); y tratar el punto de
               retorno como un artefacto numérico y no como geometría: reducir
               el paso a la mitad no lo movería.`,
    },
    {
      title: 'Ahora vuelve a poner una estrella',
      body: `Todo lo anterior era exacto y algo irreal: los planetas de verdad no
             van a la deriva solos por el espacio vacío, sino orbitando
             estrellas.
             \n\nEste es el mismo planeta, ahora en órbita circular a cinco AU de
             una estrella parecida al Sol, a 13,4 km/s. La misma nave, el mismo
             tipo de encuentro. La energía que gana la nave sale ahora de la
             <em>órbita</em> del planeta, que es lo que pasa de verdad en
             Júpiter.
             \n\nPero se ha renunciado a algo. Ahora el planeta acelera -está
             tomando una curva-, así que su sistema ya no es inercial, y la
             estrella también tira de la nave. La columna izquierda ya no estará
             exactamente igual. Fíjate en cuán cerca lo está.`,
      tip: 'El Júpiter real se frena unos 10⁻²⁵ metros por segundo por cada Voyager. En toda la edad del sistema solar, todas las naves lanzadas juntas no han alterado su órbita de forma medible.',
    },
    {
      title: 'Lánzala y vigila el residuo',
      body: `Pulsa <strong>Lanzarla</strong>. Este encuentro es mucho más rápido:
             la nave solo se sigue mientras está lo bastante cerca del planeta
             como para que el sobrevuelo signifique algo.
             \n\nLee las tres cosas: las dos columnas como antes, y el párrafo de
             abajo que ahora aparece.`,
      checklist: [
        'Lee la columna derecha: la velocidad respecto de la ESTRELLA, antes y después',
        'Lee la columna izquierda y fíjate en que ya no está exactamente igual',
        'Lee el residuo en la nota de abajo, y el radio de Hill que cita',
        'Compara la desviación medida con la predicción de dos cuerpos que tiene al lado: ya tampoco coinciden',
      ],
      tip: 'Déjalo correr después de tomar las lecturas y mira cómo la nave se aleja por una órbita mucho más ancha que aquella con la que llegó.',
    },
    {
      title: '¿Qué te está diciendo el residuo?',
      body: `Respecto de la estrella, la nave pasó de unos 13,7 a unos 19,8 km/s:
             una ganancia real del 45 por ciento, y el objetivo de toda la
             maniobra.
             \n\nRespecto del planeta pasó de 8,48 a 8,51 km/s: un cambio de un
             tercio de por ciento, donde la versión aislada daba tres partes en
             cien mil millones. La desviación medida es de 34,2 grados frente a
             una predicción de dos cuerpos de 36,3.`,
      prompt: 'Esas dos discrepancias se describen mejor como:',
      options: [
        'Error numérico que un paso de integración más pequeño eliminaría',
        'Un efecto real: el sistema del planeta acelera y la estrella también tira de la nave, así que el encuentro solo es aproximadamente de dos cuerpos',
        'Prueba de que el resultado aislado estaba mal',
        'La nave perdiendo energía a favor de la estrella',
      ],
      because: `Física, no aritmética. Tratar un sobrevuelo como un encuentro
                aislado de dos cuerpos empalmado en una órbita heliocéntrica se
                llama <strong>aproximación de cónicas empalmadas</strong>, y es
                lo que usan de verdad quienes diseñan misiones para un primer
                cálculo. El residuo que has medido es su error, y el hecho de que
                puedas medirlo es lo que la convierte en una aproximación y no en
                un apaño. Reducir el paso de integración a la mitad no lo
                encogería, porque no es un problema del paso.`,
    },
    {
      title: 'Lo que has medido y lo que deja fuera',
      body: `Has medido una asistencia gravitatoria dos veces.
             \n\n· Pasando por detrás de un planeta, una nave gana velocidad
             respecto de todo salvo del planeta; pasando por delante, la pierde.
             \n· Respecto del planeta no cambia nada, y de forma exacta cuando su
             sistema de referencia es de verdad inercial.
             \n· Los dos lados cambian la velocidad en la misma cantidad y la
             rapidez en cantidades distintas, y lo primero es igual en todos los
             sistemas de referencia mientras que lo segundo no.
             \n· La ganancia es la rotación de un vector sumado a otro, y está
             limitada al doble de la velocidad de aproximación por muy pesado que
             sea el planeta.
             \n· El planeta paga, en momento lineal, exactamente lo que la nave
             gana.
             \n· Con una estrella presente todo eso sigue siendo cierto y nada de
             ello es ya exacto, y el tamaño del error es algo que puedes leer en
             un panel.
             \n\nTres límites antes de llevarte esto a ninguna parte. Es
             <strong>bidimensional</strong>: los sobrevuelos reales se apuntan en
             tres dimensiones y la componente fuera del plano es la mayor parte
             del problema de diseño. La nave tiene <strong>una masa
             terrestre</strong>, unas 10²² veces la de una sonda real, elegida
             para que el retroceso del planeta sea un número que puedas leer y no
             una afirmación que tengas que creerte: la física es idéntica, el
             retroceso no. Y el planeta de aquí es un <strong>punto</strong>: sin
             atmósfera que rozar, sin lunas que esquivar y sin el cinturón de
             radiación que estuvo a punto de acabar con la Galileo.`,
      tip: 'La sonda Parker Solar Probe es la misma idea al revés: siete sobrevuelos de Venus por el lado de delante, cada uno quitando velocidad a propósito para poder caer más cerca del Sol.',
    },
  ],
};
