// =============================================================================
// binary-star-planets - es
// -----------------------------------------------------------------------------
// A shadow of ../binary-star-planets.js carrying only its words. Laid over the
// English lesson by mergeTranslation() in ../i18n.js, so anything absent here
// keeps its English and nothing here can reach the lesson's machinery: no
// scenario name, no seed, no widget id, no numeric answer, no probe.
//
// Arrays line up by index with the English. `null` means "not translated";
// that entry keeps its English.
//
// One deliberate choice throughout. The English is careful never to call a
// configuration stable, and Spanish has to be careful in the same place:
// "sobrevivió a esta integración" everywhere, never "estable". The e2e suite
// checks both languages for the word.
// =============================================================================

export default {
  title: 'Planetas en estrellas binarias',
  subtitle: 'Qué sobrevive alrededor de dos estrellas, y cómo lo sabrías',
  duration: '40-50 min',
  level: 'Astronomía introductoria',
  summary:
    'La mayoría de las estrellas vienen de dos en dos, así que la mayoría de los planetas tienen que arreglárselas en un sistema con dos soles. Algunas órbitas funcionan y otras no, y la línea que las separa es más nítida de lo que imaginarías. Encuéntrala dos veces —una para un planeta alrededor de una estrella y otra para un planeta alrededor de las dos— y averigua después cuánto de lo que acabas de medir era la física y cuánto la aritmética.',
  objectives: [
    'Predecir qué órbitas planetarias en una binaria sobreviven a una integración, tanto para un planeta alrededor de una estrella como alrededor de las dos',
    'Distinguir un resultado físico —expulsión, colisión, supervivencia— de un fallo numérico de la integración que lo produjo',
    'Demostrar que repetir una ejecución con la mitad del paso, y no conservar la energía, es la prueba que zanja un resultado',
    'Decir qué puede y qué no puede establecer una integración finita sobre el destino a largo plazo de una órbita',
    'Usar una frontera de estabilidad empírica publicada dentro de sus supuestos y su rango declarados, y decir qué es lo que no cubre',
  ],
  steps: [
    {
      title: 'Dos soles',
      body: `Bastante más de la mitad de las estrellas parecidas al Sol de la
             galaxia tienen al menos una compañera. Los planetas de esos
             sistemas no son una curiosidad: son el caso normal, y lo que hay
             que explicar es la soledad del Sol.
             \n\nEn pantalla hay dos estrellas —una masa solar y media masa
             solar— separadas diez AU en una órbita de excentricidad 0,4, así
             que oscilan entre seis y catorce AU la una de la otra cada
             veintiséis años. La pequeña estela azul es un planeta de una masa
             terrestre girando alrededor de la más pesada a 1,5 AU.
             \n\nLa pregunta de los próximos cuarenta minutos es la evidente:
             <strong>¿dónde puede estar aquí un planeta y quedarse?</strong>`,
      tip: 'Alfa Centauri A y B son una versión real de esto: 1,13 y 0,97 masas solares, separadas 23,5 AU, excentricidad 0,52.',
    },
    {
      title: 'Aquí no hay nada al azar',
      body: `El escenario que está al lado de este en la galería —"Sistema
             estelar binario"— construye sus estrellas con un generador de
             números aleatorios. Está muy bien para mirarlo y no sirve para
             experimentar, porque dos cargas suyas son dos sistemas distintos y
             cualquier diferencia entre ellas no significa nada.
             \n\nEste laboratorio es lo contrario. Cada número está escrito:
             \n\n<strong>Estrella A</strong> 1,0 masas solares ·
             <strong>Estrella B</strong> 0,5 masas solares ·
             <strong>separación</strong> 10 AU ·
             <strong>excentricidad</strong> 0,4 ·
             <strong>ambos ángulos iniciales</strong> cero, en el periastro
             \n\nAsí que cuando cambies dónde empieza el planeta y lo vuelvas a
             ejecutar, el radio inicial del planeta será lo único que ha
             cambiado. Eso es lo que convierte esto en un experimento y no en
             una anécdota.`,
      tip: 'Carga el escenario dos veces y los tres cuerpos caen en posiciones y velocidades idénticas, hasta el último bit. Aquí nada lleva semilla, porque aquí nada se muestrea.',
    },
    {
      title: 'Antes de ejecutar nada',
      body: `Las estrellas están separadas diez AU de media y llegan a estar a
             seis AU la una de la otra en su máximo acercamiento. Un planeta que
             gire alrededor de la Estrella A tiene que vivir dentro de eso.
             \n\nComprométete ahora con un número. Vas a medir contra él durante
             el resto de la lección.`,
      prompt:
        '¿A qué distancia de la Estrella A crees que puede estar un planeta y sobrevivir, como fracción de la separación de 10 AU?',
      options: [
        'Casi toda ella: en cualquier punto dentro de unas 0,9 separaciones',
        'Más o menos la mitad',
        'Algo así como una quinta parte',
        'Solo muy cerca: un pequeño porcentaje',
      ],
      because: `Alrededor de una quinta parte, y para este par resulta ser algo
                menos. La zona estable es mucho más pequeña que el espacio que
                parece disponible, que es la primera sorpresa de esta lección y
                no la última.`,
    },
    {
      title: 'Lo que va a significar "sobrevivió"',
      body: `Una cuestión de vocabulario antes de medir nada, porque decide lo
             que te está permitido decir al final.
             \n\nCada ejecución de esta lección tiene una duración declarada:
             veinte periodos binarios, o cuarenta. Cuando el planeta sigue en
             órbita al terminar, el panel dirá que <strong>sobrevivió a esta
             integración</strong>. Nunca dirá que la órbita es estable, y tú
             tampoco deberías.
             \n\nLa diferencia no es puntillosa. En estos sistemas la
             inestabilidad suele ser lenta: una resonancia empuja un poco la
             excentricidad del planeta en cada pasada, los empujones se
             acumulan, y un planeta que giró tranquilo trescientos periodos se
             marcha en el trescientos uno. Veinte periodos no pueden ver eso. El
             estudio con el que compararás más adelante integró diez mil.`,
      tip: 'Esto es un hábito general más que un hecho sobre binarias. "La simulación no explotó en el tiempo que la ejecuté" es una afirmación mucho más débil que "esto es estable", y se confunden con facilidad.',
    },
    {
      title: 'Ejecútalo tal como está',
      body: `Abre <strong>Ejecución en binaria</strong> en la lista de
             Herramientas de la derecha. Viene con la configuración que hay en
             pantalla: el planeta empezando a 0,15 de la separación binaria
             —1,5 AU— y veinte periodos binarios que integrar, que son algo más
             de quinientos años y alrededor de medio minuto de observación.
             \n\nPulsa <strong>Ejecutar</strong> y mira. El planeta da unas seis
             vueltas por segundo, así que lo que puedes ver no es una órbita
             concreta sino la banda que ocupa. Fíjate en si esa banda mantiene
             su forma.`,
      checklist: [
        'Observa la banda de la estela: ¿sigue siendo un anillo, o empieza a respirar cuando las estrellas pasan cerca?',
        'Lee "Integrado" mientras sube: cuenta periodos binarios, no años',
        'Vigila la fila "Órbita actual del planeta": el semieje mayor apenas se mueve, y la excentricidad no se está quieta',
        'Vigila "Excentricidad máxima alcanzada": no vuelve a bajar',
        'Anota la deriva de energía mientras la ejecución está tranquila; querrás la comparación más adelante',
        'Déjalo terminar y lee la frase del final del panel',
      ],
      tip: 'Baja la velocidad con los controles de reproducción si quieres ver una órbita concreta en lugar de la banda.',
    },
    {
      title: 'Qué hizo la ejecución tranquila',
      body: `Con la ejecución terminada, lee cuatro números del panel.`,
      fields: [
        {
          label: 'Periodos binarios integrados',
          unit: '',
          hint: 'periodos',
        },
        {
          label: 'Distancia máxima, en separaciones binarias',
          unit: 'a',
          hint: 'separaciones',
        },
        {
          label: 'Encuentros cercanos con la Estrella B',
          unit: '',
          hint: 'nº',
        },
        {
          label: 'Deriva de energía, en por ciento',
          unit: '%',
          hint: 'por ciento',
        },
      ],
    },
    {
      title: '¿Por qué fue tan tranquilo?',
      body: `El planeta se mantuvo dentro de unas 0,62 separaciones del baricentro
             y nunca llegó a un cuarto de separación de la Estrella B.`,
      prompt:
        'El planeta a 1,5 AU apenas nota a la estrella compañera. La mejor razón es:',
      options: [
        'La Estrella B tiene solo la mitad de masa que la Estrella A',
        'El planeta está lo bastante cerca de la Estrella A como para que su tirón domine en todos los puntos de la órbita',
        'El planeta es demasiado ligero para verse afectado',
        'La Estrella B nunca se acerca a la órbita del planeta',
      ],
      because: `La cercanía, no la masa. A 1,5 AU de una estrella de 1,0 masas
                solares el planeta siente un tirón unas dieciocho veces mayor que
                el de una estrella de 0,5 masas solares a seis AU en su máximo
                acercamiento. La compañera es una perturbación y no una
                competidora, y una perturbación así de pequeña se promedia casi
                del todo.
                \n\nCasi. Vuelve a mirar la fila de excentricidad máxima de esa
                ejecución: empieza cerca de cero y termina alrededor de 0,17, y
                sube de forma sostenida en vez de oscilar. La órbita que
                "sobrevivió sin problemas" estuvo siendo bombeada todo el rato,
                despacio, y veinte periodos no bastan ni de lejos para ver dónde
                acaba. Acuérdate de esto cuando más adelante salga la palabra
                "estable".`,
    },
    {
      title: 'Aléjalo',
      body: `Ahora duplica el radio inicial del planeta, hasta 0,30 de la
             separación —3 AU—. Eso sigue siendo menos de la mitad de lo más
             cerca que llegan a estar las dos estrellas, así que el planeta no
             está en absoluto cerca de ninguna de ellas al empezar.`,
      prompt:
        'A 0,30 separaciones, a lo largo de veinte periodos binarios, esperas:',
      options: [
        'Más o menos lo de antes: un anillo algo más ancho y algo más tembloroso',
        'Un anillo que respira visiblemente pero se queda donde está',
        'Que el planeta se marche',
        'Que el planeta caiga en una de las estrellas',
      ],
      because: `Se marcha, y no tarda mucho en hacerlo. Duplicar el radio de 0,15
                a 0,30 es la diferencia entre una órbita imperturbada y ninguna
                órbita en absoluto.`,
    },
    {
      title: 'Ejecútalo a 0,30',
      body: `Pon <strong>Inicio del planeta</strong> en <strong>0,30</strong> y
             pulsa Ejecutar. El mundo se reconstruye desde cero —las mismas dos
             estrellas, los mismos ángulos iniciales, el planeta en otro sitio—
             así que este es el mismo experimento con una cosa cambiada.
             \n\nEste no llegará a veinte periodos.`,
      checklist: [
        'Observa cómo el anillo deja de ser un anillo en el primer periodo o los dos primeros',
        'Observa cómo la cifra de "Distancia máxima" pasa de 1 y luego de 5',
        'Lee cuándo se detuvo la ejecución, y por qué',
      ],
      tip: 'La ejecución se detiene sola en cuanto el planeta está desligado y a más de diez separaciones. Integrar un planeta que se marcha durante otros dieciocho periodos no diría nada.',
    },
    {
      title: '¿Cuándo se marchó?',
      body: `Lee la ejecución en el panel.`,
      fields: [
        {
          label: 'Periodos binarios completados antes de marcharse',
          unit: '',
          hint: 'periodos',
        },
        {
          label: 'Encuentros cercanos con la Estrella B',
          unit: '',
          hint: 'nº',
        },
      ],
    },
    {
      title: '¿Qué significa aquí "expulsado"?',
      body: `El panel ha llamado a eso una expulsión. Tiene dos condiciones para
             usar la palabra y necesita las dos: el planeta debe tener energía
             positiva respecto de <em>ambas</em> estrellas, y debe estar a más de
             diez separaciones binarias.`,
      prompt: '¿Por qué no basta con la energía positiva?',
      options: [
        'Porque la energía no se conserva lo bastante bien como para fiarse',
        'Porque un planeta puede estar desligado un rato durante un encuentro y volver después',
        'Porque la masa del planeta es demasiado pequeña para que la energía signifique algo',
        'Porque el baricentro se mueve, así que la energía se mide en el sistema de referencia equivocado',
      ],
      because: `Una pasada cercana le da energía al planeta y luego le quita
                parte. Durante el encuentro el planeta puede estar formalmente
                desligado un tiempo y acabar en una órbita ancha pero ligada.
                Exigir también la distancia hace que "expulsado" describa algo
                que de verdad se ha ido.`,
    },
    {
      title: 'Alguien lo ha hecho bien',
      body: `Tienes dos puntos: 0,15 sobrevive, 0,30 no. La frontera está en
             algún sitio entre medias, y encontrarla con precisión llevaría
             bastante más de cuarenta minutos.
             \n\nEn 1999 Matthew Holman y Paul Wiegert lo hicieron bien.
             Integraron partículas de prueba en binarias sobre una malla de
             razones de masas y excentricidades, diez mil periodos binarios cada
             una, y ajustaron una fórmula a dónde caía la transición:
             \n\n<strong>a_c / a_b = 0,464 − 0,380 μ − 0,631 e + 0,586 μe
             + 0,150 e² − 0,198 μe²</strong>
             \n\ndonde <strong>μ</strong> es la parte de la masa total que
             corresponde a la compañera —0,5 / 1,5 = 0,333 aquí— y
             <strong>e</strong> es la excentricidad de la binaria, 0,4. El panel
             imprime el resultado para la configuración que hayas ejecutado, y
             junto a él los supuestos que hay detrás. Calcúlalo tú primero.`,
      prompt: 'Semieje mayor crítico, en unidades de la separación binaria',
      unit: '',
      hints: {
        concept: `Seis términos, y los dos que más pesan son los dos negativos
                  grandes: una compañera más pesada y una binaria más excéntrica
                  tiran cada una de la frontera hacia dentro.`,
        method: `Recórrelos en orden: 0,464, −0,1266, −0,2524, +0,0781, +0,0240,
                 −0,0106. Súmalos.`,
      },
      worked: `0,464 − 0,1266 − 0,2524 + 0,0781 + 0,0240 − 0,0106 = 0,177. En una
               binaria de 10 AU eso son 1,77 AU, así que el planeta que ejecutaste
               a 1,5 AU estaba dentro y el de 3 AU estaba muy fuera, que es lo que
               pasó.`,
      because: `Unas 0,177 separaciones, o 1,77 AU para estas estrellas. Tus dos
                ejecuciones caen a uno y otro lado, que es el ajuste y la
                simulación de acuerdo: el único sitio de esta lección donde lo
                están sin discusión.`,
      tip: 'Holman, M. J. y Wiegert, P. A. 1999, The Astronomical Journal, 117, 621: "Long-Term Stability of Planets in Binary Systems".',
    },
    {
      title: 'Lo que el ajuste supone',
      body: `El panel enumera los supuestos que hay detrás de esa fórmula. Uno de
             ellos importa más que los demás a quien quiera usarla en un sistema
             real.`,
      prompt:
        'Los planetas de Holman y Wiegert eran partículas de prueba sin masa, en órbitas coplanarias, prógradas e inicialmente circulares. ¿Cuál de estas situaciones dejaría más claramente a un sistema real fuera del ajuste?',
      options: [
        'Un planeta de una masa terrestre en lugar de exactamente cero',
        'Un planeta en una órbita inclinada cuarenta grados respecto del plano de la binaria',
        'Una binaria con una razón de masas de 0,4 en lugar de 0,333',
        'Un planeta observado solo durante cincuenta periodos binarios',
      ],
      because: `La inclinación. El ajuste es bidimensional, y un planeta a
                cuarenta grados del plano es otro problema: uno donde el
                mecanismo de Kozai-Lidov puede cambiar inclinación por
                excentricidad y desestabilizar órbitas que el ajuste plano
                considera seguras. Las otras tres están dentro de su alcance o
                al margen: una masa terrestre es una millonésima de la estrella,
                μ = 0,4 está de sobra dentro del rango ajustado, y cuánto tiempo
                miraste no es una propiedad del sistema.`,
      tip: 'Vale la pena probar antes de seguir: ejecuta 0,20, justo fuera de la frontera. El artículo describe islas de inestabilidad dentro de la línea ajustada e islas de estabilidad fuera, y el panel se niega a predecir nada a menos de 0,02 separaciones de ella. Un ajuste a dónde está la transición la mayor parte de las veces no es un muro.',
    },
    {
      title: 'Una pregunta más difícil que "qué pasó"',
      body: `Todo lo anterior se ha creído a la simulación. Es hora de dejar de
             hacerlo.
             \n\nEl integrador hace avanzar los tres cuerpos a pasos. Entre dos
             pasos no sabe qué ha pasado; supone que las fuerzas eran las que
             había al principio. Eso está bien cuando nada cambia mucho y está
             muy mal durante una pasada cercana, cuando la fuerza sobre el planeta
             puede duplicarse y reducirse a la mitad dentro de un solo paso.
             \n\nUna pasada cercana mal resuelta le da al planeta una cantidad
             equivocada de energía. El planeta se marcha entonces, o no, por
             razones que no tienen nada que ver con la binaria. <strong>Las dos
             cosas parecen física desde fuera.</strong>`,
      tip: 'El panel muestra el paso con el que realmente integró, que no siempre es el que pediste: si la máquina va justa, el bucle de dibujado da pasos más grandes para no quedarse atrás.',
    },
    {
      title: 'La primera comprobación, y sus límites',
      body: `La guarda evidente es la energía. Los tres cuerpos forman un sistema
             cerrado, así que su energía total no puede cambiar; si el número que
             informa la simulación se ha movido, la aritmética ha fallado en
             alguna parte. El panel filtra por esto, y por encima de una décima
             de por ciento se niega directamente a informar de un resultado: no
             dice que el planeta fue expulsado, porque no lo sabe.
             \n\nPruébalo. Pon el planeta en <strong>0,50</strong> separaciones,
             lo que lo sitúa casi encima de la Estrella B, y ejecuta. No
             obtendrás una respuesta; obtendrás una queja y una instrucción. Haz
             lo que dice, y sigue haciéndolo hasta que el panel esté dispuesto a
             contarte algo.
             \n\nCon una sola reducción no bastará, y eso merece atención.
             Arreglar un acercamiento mal resuelto no es cuestión de hacerlo un
             poco mejor: o el paso resuelve la pasada o no la resuelve.`,
      checklist: [
        'Ejecuta 0,50 con el paso por defecto de 1,0 y lee la deriva: alrededor del 0,18%, muy por encima del filtro',
        'Ya que estás, mira la excentricidad del planeta: sale por encima de 100, que no es una órbita sino una explosión',
        'Fíjate en que el panel se niega a decir qué le pasó al planeta',
        'Pulsa "Repetir con la mitad del paso". La deriva es del 0,17%: prácticamente igual, y sigue rechazada',
        'Púlsalo otra vez. Con un paso de 0,25 la deriva es del 0,0023%, y ahora sí hay respuesta: el planeta chocó con una estrella, a una centésima de periodo binario',
      ],
      tip: 'Una décima de por ciento no es una constante natural. Se midió: en estas configuraciones, toda ejecución que derivó más que eso dio un resultado que cambiaba al reducir el paso a la mitad. Fíjate también en cuál resultó ser la respuesta: una colisión, no una expulsión. Dos de las cuatro cosas que le pueden pasar al planeta aquí se parecen de lejos y las distingue el panel, no el ojo.',
    },
    {
      title: 'Ahora el caso que importa',
      body: `Pon el planeta en <strong>0,25</strong> separaciones, deja el paso en
             <strong>1,0</strong> y ejecuta los veinte periodos completos.
             \n\nMira este con atención. No es una ejecución tranquila: la banda
             de la estela se estira y se deforma, y el contador de encuentros
             sube sin parar. Anota el resultado, el número de encuentros y la
             deriva de energía.
             \n\nDespués pulsa <strong>Repetir con la mitad del paso</strong>.
             Dos veces.`,
      checklist: [
        'Ejecuta 0,25 con paso 1,0: anota el resultado, los encuentros y la deriva',
        'Reduce a 0,5: anota las mismas tres cosas',
        'Reduce a 0,25: anota las mismas tres cosas',
        'Pregúntate cuál de las tres ejecuciones pondrías en un artículo',
      ],
      tip: 'Cada reducción a la mitad duplica el tiempo real. La última tarda un par de minutos; es la ejecución más importante de la lección.',
    },
    {
      title: 'Tres ejecuciones de la misma configuración',
      body: `Anota lo que dijeron las tres ejecuciones. La gracia del ejercicio
             está en el desacuerdo, así que anótalo aunque —sobre todo si—
             parezca un error.`,
      fields: [
        {
          label: 'Deriva de energía con paso 1,0, en por ciento',
          unit: '%',
          hint: 'por ciento',
        },
        {
          label: 'Deriva de energía con paso 0,25, en por ciento',
          unit: '%',
          hint: 'por ciento',
        },
        {
          label: 'Cuántas de las tres ejecuciones coincidieron en el resultado',
          unit: '',
          hint: 'de 3',
        },
      ],
    },
    {
      title: '¿Cuál de las respuestas es la buena?',
      body: `Con paso 1,0 el planeta sobrevivió veinte periodos, con decenas de
             encuentros cercanos por el camino. Con paso 0,25 fue expulsado. La
             deriva de energía estuvo por debajo de una parte en un millón en las
             dos.`,
      prompt:
        'Lo honesto que se puede informar a partir de estas ejecuciones es:',
      options: [
        'Que el planeta sobrevive, ya que la ejecución que sobrevivió conservó la energía igual de bien',
        'Que el planeta es expulsado, ya que el paso más fino siempre es más preciso',
        'Que esta configuración no está resuelta con ninguno de los dos pasos, así que ninguna ejecución establece un resultado',
        'Que la simulación está rota y hay que descartar las ejecuciones',
      ],
      because: `Ninguna de las dos ejecuciones establece nada por sí sola. El paso
                más fino es más preciso y eso es una razón para preferirlo, no
                para fiarse de él: lo que te dice una respuesta que cambia es que
                la respuesta todavía se está moviendo, y que la próxima reducción
                podría moverla otra vez. Lo que puedes afirmar es algo sobre la
                configuración —que su destino a veinte periodos no lo zanja una
                integración con estos pasos— y eso es un resultado de verdad, no
                un fracaso.`,
    },
    {
      title: 'La convergencia es la prueba',
      body: `Así que la regla que de verdad se aplica, y no es la de la energía:
             \n\n<strong>Un resultado cuenta cuando reducir el paso a la mitad lo
             deja igual.</strong>
             \n\nLa conservación de la energía es un filtro. Caza los desastres, y
             la ejecución de 0,50 que hiciste antes es un desastre que cazó. No
             puede cazar esto, porque la energía es un solo número y un encuentro
             de tres cuerpos mal resuelto puede salir mal de maneras que no
             aparecen en él.
             \n\nFíjate en lo que la convergencia <em>no</em> exige. Dos
             ejecuciones de un sistema caótico con pasos distintos divergen en
             posición casi de inmediato, y no coincidirán en cuándo se marchó el
             planeta ni adónde fue. Eso es lo esperable. Tienen que coincidir en
             <em>si</em> se marchó.`,
      tip: 'Esto es práctica habitual más que algo propio de las binarias. Un resultado de N cuerpos publicado lleva un estudio de convergencia, y quien lo revisa lo pide si no lo encuentra.',
    },
    {
      title: 'Escribe la frase',
      body: `Imagina que tuvieras que entregarle estas tres ejecuciones a otra
             persona.`,
      prompt:
        'En dos o tres frases, escribe qué informarías sobre un planeta a 0,25 separaciones binarias en este sistema, incluyendo qué hiciste para averiguarlo y qué sigues sin saber.',
      because: `Una buena respuesta nombra la configuración, dice qué se ejecutó y
                con qué pasos, informa de que el resultado cambió entre ellos y se
                queda sin dictar veredicto sobre el planeta. Algo así: "A 0,25
                separaciones, integrado durante 20 periodos binarios, el planeta
                sobrevivió con un paso de 1,0 y fue expulsado con 0,25, con la
                energía conservada mejor que 1e-6 en ambos casos. El resultado no
                ha convergido, así que esta integración no determina el destino
                del planeta; la ejecución a 0,30 separaciones, expulsada con todos
                los pasos probados, sí."`,
      rubric: `Cuatro cosas puntúan, y la cuarta es la que vale la pena discutir
               con una clase.
               \n\n(1) Se nombra la configuración: 0,25 separaciones binarias,
               en esta binaria, integrada durante 20 periodos binarios.
               \n(2) Se declara el método: la misma configuración ejecutada con
               más de un paso de integración.
               \n(3) Se informa del desacuerdo en lugar de resolverlo: el planeta
               sobrevivió con el paso grueso y fue expulsado con el fino.
               \n(4) No se dictamina nada sobre el destino del planeta.
               \n\nLa puntuación completa exige las cuatro. Lo que más se falla
               es (4): el alumnado redacta la ejecución de paso fino como si fuera
               la respuesta, con el argumento razonable de que un paso más pequeño
               es más preciso. Lo es, y eso sigue sin ser lo mismo que haber
               convergido: la siguiente reducción a la mitad podría moverlo otra
               vez. Vale la pena sacarlo en clase: quien informa "expulsado,
               porque el paso fino es mejor" ha entendido la numérica y ha sacado
               la conclusión equivocada de ella, que es un error más interesante
               que no saber.
               \n\nQuien informa de que la simulación está rota no ha visto que
               un resultado no convergido es un resultado. Señálale la ejecución
               de 0,30, que coincidió con todos los pasos probados, y pregúntale
               qué tiene de distinto.`,
      tip: 'Decir lo que no sabes no es una debilidad en un resultado. Es la mayor parte de lo que lo hace utilizable por otra persona.',
    },
    {
      title: 'Alrededor de las dos a la vez',
      body: `El otro sitio donde puede vivir un planeta en una binaria es fuera de
             las dos estrellas, girando alrededor del par como si fuera un solo
             objeto. Se llaman planetas circumbinarios y existen: Kepler-16b,
             encontrado en 2011, orbita un par de 0,69 y 0,20 masas solares cada
             229 días.
             \n\nEn pantalla están las mismas dos estrellas, con el planeta
             desplazado a 40 AU: cuatro veces su separación. Todo lo demás es
             idéntico.
             \n\nDesde lo bastante lejos, las dos estrellas empiezan a parecer un
             solo objeto de 1,5 masas solares y el planeta tiene una órbita
             kepleriana normal. La cuestión es cuánto es "lo bastante lejos".`,
      tip: 'Kepler-16b tarda unos 229 días en rodear un par que se orbita en 41. Está lo bastante lejos para verlas como una sola estrella, y justo lo bastante.',
    },
    {
      title: '¿Hacia dónde está el peligro?',
      body: `Para un planeta alrededor de una estrella, la regla era "cerca es
             seguro, lejos es peligroso". Piensa qué le pasa a un planeta
             circumbinario según lo acercas al par.`,
      prompt: 'Para un planeta que orbita a las dos estrellas, esperarías:',
      options: [
        'La misma regla: cerca del par es seguro, lejos es peligroso',
        'Lo contrario: lejos es seguro, y hay una distancia mínima por debajo de la cual falla',
        'Ninguna frontera, ya que el planeta está fuera de ambas estrellas',
        'Una frontera que depende de la masa del planeta y no de su distancia',
      ],
      because: `Lo contrario, y la razón es la aproximación. Desde lejos el par
                parece una sola masa y el planeta tiene una órbita kepleriana
                limpia. Acércalo y el planeta empieza a distinguir las dos
                estrellas por separado —el tirón que siente cambia según ellas
                giran— y ese tirón cambiante bombea su órbita. Aquí la frontera
                es un suelo y no un techo.`,
    },
    {
      title: 'Cuatro separaciones, y luego dos',
      body: `Cuarenta periodos binarios esta vez, porque un planeta circumbinario
             es lento: a 40 AU tarda unos cinco periodos binarios y medio en dar
             una vuelta, así que cuarenta periodos son solo siete órbitas del
             planeta. Conviene recordarlo al leer el resultado.
             \n\nEjecútalo tal como está, a <strong>4,0</strong> separaciones, y
             mira el anillo. Después reduce a la mitad el radio inicial, hasta
             <strong>2,0</strong> —20 AU, todavía el doble de lejos de lo que las
             estrellas están entre sí, y más lejos de lo que ninguna de las dos
             llega nunca— y ejecútalo otra vez.`,
      checklist: [
        'A 4,0: mira cómo las dos estrellas giran dentro de la órbita del planeta, y compara la distancia máxima con 4,0',
        'A 4,0: la excentricidad máxima alcanzada se asienta en torno a 0,06 y deja de subir',
        'A 2,0: mira cómo el anillo deja de cerrarse sobre sí mismo, y mira la fila de excentricidad mientras pasa',
        'A 2,0: la excentricidad pasa de 0,25 en el primer periodo binario y de 1 en el segundo; pasado 1 la órbita está abierta y el semieje mayor deja de existir',
        'A 2,0: lee el número de encuentros al terminar; puede sorprenderte',
        'A 2,0: lee cuándo se marchó',
      ],
      tip: 'En la segunda ejecución nada se acercó a nada. Esta es una forma de perder un planeta distinta de la que viste en la primera mitad de la lección.',
    },
    {
      title: 'Se marchó sin tocar nada',
      body: `Lee la ejecución.`,
      fields: [
        {
          label: 'Periodos binarios antes de marcharse',
          unit: '',
          hint: 'periodos',
        },
        {
          label: 'Encuentros cercanos',
          unit: '',
          hint: 'nº',
        },
        {
          label: 'Deriva de energía, en por ciento',
          unit: '%',
          hint: 'por ciento',
        },
      ],
    },
    {
      title: '¿Cómo, sin ninguna pasada cercana?',
      body: `Al planeta a 0,30 separaciones de la primera mitad lo lanzó fuera un
             único encuentro cercano. Este nunca estuvo a menos de dos
             separaciones de una estrella y se marchó con la misma rotundidad.`,
      prompt: '¿Qué lo empujó fuera?',
      options: [
        'Una fuga lenta de energía del integrador',
        'El tirón que siente cambia según giran las estrellas, y a esta distancia esos cambios se suman en lugar de promediarse',
        'El tirón gravitatorio de dos estrellas es más fuerte que el de una',
        'El planeta nunca estuvo realmente ligado',
      ],
      because: `Forzamiento resonante. A 2,0 separaciones el periodo orbital del
                planeta está cerca de un múltiplo entero pequeño del de la
                binaria, así que el tirón que recibe no es aleatorio: llega casi
                en la misma fase de su órbita cada vez y los pequeños empujones se
                acumulan. Lo has visto pasar: la fila de excentricidad superó 0,25
                en el primer periodo binario y 1 en el segundo, y pasado 1 una
                órbita no se cierra. La deriva de energía de siete partes en un
                millón descarta la primera opción, que es justo para lo que el
                panel la muestra.`,
    },
    {
      title: 'La frontera circumbinaria',
      body: `El mismo artículo da una segunda fórmula, para planetas alrededor de
             las dos estrellas:
             \n\n<strong>a_c / a_b = 1,60 + 5,10 e − 2,22 e² + 4,12 μ − 4,27 eμ
             − 5,09 μ² + 4,61 e²μ²</strong>
             \n\nEl panel ya la ha calculado para este sistema. Léela de ahí, o
             pon tú mismo μ = 0,333 y e = 0,4.`,
      prompt: 'Semieje mayor crítico, en unidades de la separación binaria',
      unit: '',
      hints: {
        concept: `Esta es un suelo y no un techo: el planeta tiene que empezar
                  <em>fuera</em> de a_c, no dentro.`,
        method: `1,60 + 2,04 − 0,355 + 1,373 − 0,569 − 0,566 + 0,082.`,
      },
      worked: `1,60 + 5,10(0,4) − 2,22(0,16) + 4,12(0,333) − 4,27(0,4)(0,333)
               − 5,09(0,111) + 4,61(0,16)(0,111) = 3,61 separaciones, o 36 AU.
               Así que el superviviente que ejecutaste a 4,0 estaba fuera y el de
               2,0 muy dentro, que es lo que pasó.`,
      because: `Unas 3,6 separaciones: 36 AU para estas estrellas. Fíjate en lo
                mucho más grande que es la zona excluida que en el caso
                circunestelar: un planeta circumbinario tiene que mantenerse a más
                de tres separaciones y media de las estrellas.`,
      misconceptions: [
        {
          say: `Esa es la frontera circunestelar de antes en la lección. El caso
                circumbinario tiene su propia fórmula, con coeficientes bastante
                distintos, y además es un suelo y no un techo.`,
        },
      ],
    },
    {
      title: 'Donde el ajuste y la simulación no se ponen de acuerdo',
      body: `El ajuste dice 3,61. Así que un planeta a <strong>3,0</strong>
             separaciones debería desestabilizarse, y uno a <strong>2,5</strong>
             todavía más.
             \n\nEjecuta los dos, los cuarenta periodos completos. Lee el resultado
             y después lee la <strong>distancia máxima</strong>, que es el número
             que explica el desacuerdo.`,
      checklist: [
        'Ejecuta 3,0 durante cuarenta periodos: resultado, distancia máxima y excentricidad máxima alcanzada',
        'Ejecuta 2,5 durante cuarenta periodos: las mismas tres cosas',
        'Compara las tres con la ejecución de 4,0, donde el planeta se quedó en su anillo con una excentricidad por debajo de 0,07',
        'Opcional: pon dos de ellas una al lado de la otra en el banco A/B, registrando la distancia al primario, y lee la diferencia sobre un mismo eje temporal',
      ],
      tip: 'Las dos informarán de que el planeta sobrevivió a la integración. Fíjate en lo lejos que llegó antes de volver.',
    },
    {
      title: 'Entonces, ¿quién se equivoca?',
      body: `Los dos planetas sobrevivieron cuarenta periodos binarios, y el
             ajuste dice que los dos deberían haberse desestabilizado. Pero el que
             empieza a 4,0 nunca pasó de 4,0, mientras que el de 3,0 llegó a 14
             separaciones y el de 2,5 a 25, y volvieron.`,
      prompt: 'La mejor lectura de esto es:',
      options: [
        'El ajuste publicado está mal para esta razón de masas',
        'La simulación está mal, ya que el ajuste viene de un artículo revisado por pares',
        'Cuarenta periodos binarios son muy pocos para poner a prueba una frontera calibrada a diez mil, y las enormes excursiones muestran que los planetas ya van camino de salir',
        'Los planetas circumbinarios son más estables de lo que sugiere el ajuste',
      ],
      because: `La duración de la ejecución. Holman y Wiegert llamaban estable a
                una partícula que duraba diez mil periodos binarios; tú has
                ejecutado cuarenta, que son cuatro milésimas de eso. Un planeta
                lanzado a veinticinco separaciones y de vuelta no se ha asentado en
                nada: lo están bombeando, y el bombeo no ha terminado. "Sobrevivió
                a esta integración" y "es estable" son afirmaciones distintas, y
                esta es la pantalla donde la diferencia muerde.`,
    },
    {
      title: 'La afirmación más fuerte',
      body: `Un colega te pregunta qué has averiguado sobre el planeta a 0,15
             separaciones.`,
      prompt: 'La afirmación más fuerte que respalda tu trabajo es:',
      options: [
        'Un planeta puede orbitar de forma estable a 1,5 AU en esta binaria',
        'Un planeta lanzado a 1,5 AU en órbita circular se mantuvo en ella veinte periodos binarios en esta integración, y un ajuste publicado calibrado a diez mil periodos sitúa la frontera más lejos, en 1,77 AU',
        'Los planetas suelen ser estables dentro de aproximadamente una quinta parte de una separación binaria',
        'Nada, porque veinte periodos son demasiado pocos para establecer nada',
      ],
      because: `La larga, y es larga por algo: nombra la configuración, la
                condición inicial, la duración de la integración y la evidencia
                externa, y deja al lector en condiciones de comprobar cualquiera de
                ellas. La primera afirma más de lo que una ejecución de veinte
                periodos puede respaldar. La tercera generaliza a partir de una
                razón de masas y una excentricidad. La cuarta tira un resultado de
                verdad: una ejecución convergida, con la energía bien conservada y
                de acuerdo con la literatura, vale algo, aunque no lo valga todo.`,
      tip: 'Ninguno de los límites anteriores hace inútil el ejercicio. Lo convierten en un modelo, que es lo que es toda simulación, y saber qué partes del tuyo aguantan el peso es la diferencia entre usar uno y que te use a ti.',
    },
    {
      title: 'Lo que puedes decir, y lo que el modelo deja fuera',
      body: `Has medido bastante:
             \n\n· Un planeta a 0,15 separaciones alrededor de una estrella
             sobrevivió veinte periodos binarios sin problemas, y el ajuste
             publicado coincide en que debería.
             \n· Un planeta a 0,30 fue expulsado antes de tres periodos, con todos
             los pasos probados.
             \n· Un planeta a 0,25 dio respuestas distintas con pasos distintos,
             así que su destino no lo determinan estas ejecuciones.
             \n· Un planeta circumbinario a 4,0 mantuvo su órbita cuarenta
             periodos; uno a 2,0 fue empujado fuera en tres, sin acercarse nunca a
             una estrella.
             \n· Dos configuraciones que el ajuste llama inestables sobrevivieron
             cuarenta periodos, mientras eran lanzadas visiblemente casi fuera del
             sistema.
             \n\nCada una de esas cosas es una afirmación sobre una integración
             finita de una configuración concreta. Ninguna es una afirmación sobre
             estabilidad, y las dos últimas son una buena demostración de por qué
             vale la pena mantener la distinción.
             \n\nTres límites del propio modelo, antes de que lleves nada de esto a
             un sistema real.
             \n\n<strong>Es plano.</strong> Todo lo de aquí —la simulación y el
             ajuste— es bidimensional. Las órbitas reales están inclinadas, y una
             órbita inclinada en una binaria puede cambiar su inclinación por
             excentricidad, lo que desestabiliza órbitas perfectamente seguras en
             el plano.
             \n\n<strong>El planeta es una partícula de prueba.</strong> Una masa
             terrestre frente a una masa solar. Un Júpiter perturbaría a las
             estrellas de vuelta, y un sistema con varios planetas es otro problema
             distinto.
             \n\n<strong>Las estrellas son puntos.</strong> Sin mareas, sin
             radiación, sin pérdida de masa. Una "colisión" aquí significa que el
             planeta pasó a menos de unas 0,06 AU del centro de una estrella,
             porque las estrellas se dibujan diez veces más grandes de lo real y la
             simulación colisiona con lo que dibuja.`,
      tip: 'La distancia entre "mi integración dice X" y "la naturaleza hace X" es donde vive la mayor parte del trabajo en astrofísica computacional.',
    },
  ],
};
