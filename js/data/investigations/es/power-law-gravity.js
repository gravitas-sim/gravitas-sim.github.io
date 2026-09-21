// =============================================================================
// power-law-gravity - es
// -----------------------------------------------------------------------------
// Una sombra de ../power-law-gravity.js que sólo lleva sus palabras. Se
// superpone a la lección inglesa mediante mergeTranslation() en ../i18n.js, de
// modo que nada de aquí puede alcanzar la maquinaria de la lección: ningún
// nombre de escenario, ninguna semilla, ningún identificador de widget, ninguna
// respuesta numérica, ninguna sonda.
//
// Los arreglos se alinean por índice con el inglés. `null` significa «sin
// traducir»; esa entrada conserva su inglés.
//
// Nota sobre la terminología. «Precesión absidal» es el término establecido y se
// usa sin rodeos. «Radio de referencia» para r₀. La expresión «ley de la inversa
// del cuadrado» se prefiere a cualquier calco. Al hablar del exponente se dice
// «exponente n» y no «potencia», que en castellano se confunde con la magnitud
// física.
// =============================================================================

export default {
  title: '¿Y si la gravedad no fuera inversa al cuadrado?',
  subtitle: 'Cambia el exponente y descubre qué dependía de él',
  duration: '45-60 min',
  level: 'Astronomía introductoria',
  summary:
    'Newton dijo que la gravedad decae como uno partido por la distancia al cuadrado. No a la primera, no al cubo: al cuadrado, exactamente. Esta investigación pregunta qué está haciendo ese «exactamente». Subirás y bajarás el exponente y medirás tres cosas: si la órbita sigue cerrándose, cómo depende el periodo orbital de la distancia y qué leyes de conservación sobreviven. Dos de ellas cambian de inmediato. Una no cambia en absoluto, y la razón de que no lo haga es lo más útil de la lección.',
  objectives: [
    'Enunciar qué es el exponente de una ley de la inversa del cuadrado, y por qué cambiarlo exige una distancia de referencia para significar algo',
    'Medir la precesión absidal de una órbita simulada y distinguirla del error de integración refinando el paso temporal',
    'Medir la pendiente del logaritmo del periodo frente al logaritmo del radio y usarla para inferir el exponente de la ley de fuerza',
    'Explicar por qué cambiar la constante de gravitación desplaza esa recta sin inclinarla',
    'Identificar qué leyes de conservación dependen de la forma inversa del cuadrado y cuáles se siguen de que la fuerza sea central y por pares',
  ],
  steps: [
    {
      title: 'La palabra «exactamente»',
      body: `La ley de gravitación de Newton dice que la atracción entre dos
             masas decae como uno partido por el cuadrado de la distancia que
             las separa. Todas las órbitas que has visto en Gravitas la han
             obedecido.

             \n\nEl número 2 de esa ley hace muchísimo trabajo, y es fácil
             pasarlo por alto. No es 2 porque dos sea un número cómodo. Es 2
             porque eso es lo que hace el Sistema Solar, con una precisión de
             una parte entre mil millones, y buena parte de lo que sabes sobre
             órbitas se sigue de que sea 2 y no 1,9 o 2,1.

             \n\nEsta investigación toma ese número y lo mueve. Todo lo demás
             —las masas, las posiciones iniciales, las velocidades, el
             integrador— se mantiene fijo. Luego mides qué ha cambiado.`,
      tip: 'La simulación está en pausa. No se moverá nada hasta que la dejes correr.',
    },
    {
      title: 'Por qué el experimento necesita un anclaje',
      body: `Hay una trampa en la forma obvia de hacer esto, y esquivarla es la
             razón de que esta lección tenga un número más de lo que parecería
             necesario.

             \n\nSupón que escribieras simplemente la ley como
             <strong>a = GM / r<sup>n</sup></strong> y pasaras n de 2 a 2,01.
             Descubrirías que la gravedad se debilita en todas partes —alrededor
             de un cinco por ciento a una unidad astronómica— y las órbitas
             cambiarían por ese motivo tanto como por cualquier otro. Peor aún:
             <em>cuánto</em> se debilita dependería de si has decidido medir las
             distancias en kilómetros, en unidades astronómicas o en píxeles, lo
             cual es absurdo, porque al universo le da igual qué unidades
             escribas.

             \n\nAsí que la ley que se usa aquí está anclada. Está escrita de
             modo que a una distancia elegida —el <strong>radio de referencia
             r₀</strong>, que en esta lección es <strong>1 UA</strong>— la
             atracción es <em>exactamente newtoniana sea cual sea n</em>. Más
             adentro de 1 UA una ley más empinada tira más fuerte; más afuera
             tira más flojo; y justo en 1 UA no cambia nada.

             \n\nEso convierte a n en una afirmación sobre la <em>forma</em> del
             campo gravitatorio y no sobre su intensidad global, que es la única
             versión de esta pregunta que merece la pena plantear.`,
      tip: 'r₀ = 1 UA es fijo durante toda la lección. Todos los instrumentos lo muestran.',
    },
    {
      title: '¿Importa un cambio pequeño?',
      body: `Vas a poner un planeta en una órbita ligeramente elíptica y a
             cambiar el exponente de 2 a 2,05: un cambio del dos y medio por
             ciento, a una distancia donde la intensidad de la gravedad está
             anclada y no puede cambiar en absoluto.`,
      prompt: 'Cambiar n de 2 a 2,05…',
      options: [
        'no hará casi nada: dos y medio por ciento es un cambio pequeño',
        'cambiará la órbita de forma apreciable en unas pocas vueltas',
        'expulsará al planeta del sistema de inmediato',
      ],
      because: `De forma apreciable, y rápido. La órbita sigue ligada y se
                comporta perfectamente bien —no se expulsa nada a ninguna
                parte—, pero el eje mayor de la elipse gira unos nueve grados
                cada vez que el planeta completa un ciclo de ida y vuelta, lo
                cual se nota en unas pocas vueltas. El tamaño del efecto no es
                proporcional al tamaño del cambio en n, y eso conviene
                retenerlo.`,
      tip: 'Decide antes de ejecutarlo. Lo valioso de predecir es el compromiso, no el acierto.',
    },
    {
      title: '¿Se cierra la elipse?',
      body: `Aquí está la órbita. Empieza con el ajuste <strong>n = 2</strong> y
             observa qué hace la trayectoria: el planeta recorre una elipse y
             vuelve exactamente a donde empezó. Se cierra. Ésa es la primera ley
             de Kepler, y es lo que todo el mundo imagina al imaginar una órbita.

             \n\nAhora pulsa <strong>n = 2,05</strong>. Luego
             <strong>n = 2,2</strong>. Y después, por contraste,
             <strong>n = 1,8</strong>, que es <em>menos</em> empinada que la de
             Newton.

             \n\nEl número que hay que vigilar es la <strong>precesión
             medida</strong>: el ángulo que gira el eje mayor de la elipse cada
             vez que el planeta completa un ciclo de ida y vuelta.`,
      tool: {
        title: 'Cambia el exponente y observa girar el eje',
        note: 'Todos estos números se han medido ejecutando la órbita, no se han consultado en ninguna tabla.',
      },
      checklist: [
        'Con n = 2 la precesión marca cero: la elipse se cierra',
        'Con n = 2,05 son unos nueve grados por vuelta',
        'Con n = 2,2 son unos cuarenta y tres grados',
        'Con n = 1,8 es negativa: el eje gira al revés',
      ],
      tip: 'Una precesión negativa significa que la elipse gira hacia atrás, en contra del sentido de la órbita.',
    },
    {
      title: 'Anota lo que hace el eje',
      body: `Lee la <strong>precesión medida</strong> en el instrumento para
             cada uno de estos cuatro exponentes y anótala.`,
      tool: {
        title: 'Lee la precesión en cada ajuste',
        note: 'Usa los botones de ajuste. Lee la fila «Measured precession».',
      },
      fields: [
        { label: 'n = 1,8' },
        { label: 'n = 2' },
        { label: 'n = 2,05' },
        { label: 'n = 2,2' },
      ],
      tip: 'Conserva el signo. Hacia atrás es una respuesta distinta, no una más pequeña.',
    },
    {
      title: 'Qué cierra una órbita',
      body: `Con n = 2 la elipse se cierra exactamente. Con cualquier otro
             exponente que hayas probado —más empinado o menos— no lo hace.`,
      prompt: 'La mejor manera de enunciar lo que acabas de medir es…',
      options: [
        'la gravedad sólo funciona bien cuando n = 2',
        'una órbita elíptica cerrada es una propiedad especial de la ley de la inversa del cuadrado, no de las fuerzas centrales en general',
        'la simulación pierde precisión cuando n no vale 2',
        'las órbitas sólo son estables cuando n = 2',
      ],
      because: `Las órbitas con n = 2,05 y n = 2,2 son órbitas perfectamente
                buenas: ligadas, repetitivas, dando vueltas una y otra vez.
                Simplemente no son <em>elipses cerradas</em>. El teorema de
                Bertrand, demostrado en 1873, dice que hay exactamente dos leyes
                de fuerza para las que toda órbita ligada se cierra: la inversa
                del cuadrado y un muelle que tira proporcionalmente a la
                distancia. Todo lo demás precesa. Así que la elipse cerrada no
                es un hecho general sobre la gravedad ni sobre las fuerzas
                centrales; es un hecho sobre este exponente concreto, y acabas
                de medir qué ocurre sin él.`,
    },
    {
      title: '¿O es cosa del ordenador?',
      body: `Una objeción legítima. Las simulaciones avanzan a pasos discretos, y
             recorrer una curva a pasos introduce error. Quizá el giro que acabas
             de medir sea culpa del integrador y no de la física.

             \n\nHay una forma limpia de comprobarlo. El error de integración
             depende del tamaño del paso temporal: si haces los pasos más
             pequeños, disminuye. Un efecto físico real no depende de cómo hayas
             decidido calcularlo.`,
      prompt:
        'Si la precesión con n = 2,2 es física y no numérica, hacer el paso temporal ocho veces más pequeño…',
      options: [
        'reducirá la precesión medida aproximadamente a la mitad',
        'dejará la precesión medida esencialmente igual',
        'hará crecer la precesión medida',
      ],
      because: `Esencialmente igual. Eso es lo que significa «físico» en la
                práctica: la respuesta es una propiedad del sistema, así que no
                depende de con cuánto cuidado hayas decidido calcularla. Si el
                número se hubiera movido al mover el paso temporal, te estaría
                hablando de tu aritmética y no de la gravedad.`,
    },
    {
      title: 'Refina el paso temporal',
      body: `Este instrumento ejecuta la misma órbita cuatro veces, con cuatro
             pasos temporales que abarcan un factor de ocho, y da la precesión
             en cada caso.

             \n\nEjecútalo con <strong>n = 2,2</strong> y luego con
             <strong>n = 2</strong>, y anota la dispersión: la diferencia entre
             la mayor y la menor de las cuatro lecturas.`,
      tool: {
        title: 'La misma órbita con cuatro pasos temporales',
        note: 'Lee la fila «Spread across all four».',
      },
      fields: [
        { label: 'n = 2,2: dispersión entre los cuatro pasos' },
        { label: 'n = 2,2: la precesión en sí' },
      ],
      tip: 'Compara los dos números que acabas de anotar. ¿Cómo de grande es el desacuerdo entre pasos temporales frente al efecto mismo?',
    },
    {
      title: 'Qué demuestra el refinamiento',
      body: `Con n = 2,2 las cuatro ejecuciones coinciden hasta unos cinco
             decimales mientras el paso temporal cambia en un factor de ocho. Con
             n = 2 las cuatro marcan cero.`,
      prompt: 'Esto demuestra que…',
      options: [
        'el integrador es perfecto',
        'la precesión es una propiedad de la ley de fuerza, porque no depende de con cuánto detalle se haya calculado la órbita',
        'el paso temporal ya era suficientemente pequeño desde el principio',
        'la precesión y el error de integración son lo mismo',
      ],
      because: `Éste es todo el argumento, y conviene guardarlo. El error
                numérico es una propiedad de tu <em>cálculo</em>, así que
                responde cuando cambias el cálculo. La física es una propiedad
                del <em>sistema</em>, así que no. Cambiar el paso temporal en un
                factor de ocho y obtener la misma respuesta hasta cinco
                decimales es como se distingue lo uno de lo otro; y que el
                control con n = 2 marque cero con todos los pasos dice que la
                medida no es simplemente insensible a todo.`,
    },
    {
      title: 'Periodo frente a distancia',
      body: `La tercera ley de Kepler dice que el cuadrado del periodo orbital es
             proporcional al cubo del radio orbital: P² ∝ r³. Representada con
             logaritmos en ambos ejes, eso es una recta de pendiente 3/2.

             \n\nEsa ley se midió sobre el Sistema Solar real, y es consecuencia
             de la inversa del cuadrado. Así que es legítimo preguntar en qué se
             convierte cuando el exponente no vale 2.`,
      prompt:
        'Cuando n se hace mayor que 2, la pendiente del logaritmo de P frente al logaritmo de r…',
      options: [
        'seguirá siendo 3/2: la tercera ley de Kepler es una ley',
        'se hará más empinada',
        'se hará menos empinada',
        'dejará de ser una recta',
      ],
      because: `Más empinada, y perfectamente recta todavía. La tercera ley de
                Kepler es una ley en el sentido de que resume de forma cierta y
                útil lo que hace el Sistema Solar, pero es consecuencia de la
                fuerza inversa del cuadrado y no algo independiente de ella.
                Cambia la ley de fuerza y la relación sobrevive como ley de
                potencias; lo único que se mueve es su exponente.`,
    },
    {
      title: 'Mide la pendiente',
      body: `Este instrumento coloca seis planetas en órbitas circulares que
             abarcan un factor de siete y medio en radio, cronometra lo que tarda
             cada uno en dar la vuelta y ajusta una recta a los logaritmos.

             \n\nCada planeta se lanza con la velocidad circular correcta
             <em>para la ley que está activada</em>, que no es la newtoniana en
             cuanto n se aparta de 2. Lanzarlos con la velocidad newtoniana los
             pondría en órbitas que no serían circunferencias, y estarías
             midiendo el error en lugar de la física.

             \n\nLee la <strong>pendiente medida</strong> para cada uno de estos
             exponentes.`,
      tool: {
        title: 'Seis órbitas circulares, cronometradas',
        note: 'Lee la fila «Measured slope of log P against log r».',
      },
      fields: [
        { label: 'n = 1,8: pendiente' },
        { label: 'n = 2: pendiente' },
        { label: 'n = 2,2: pendiente' },
        { label: 'n = 2,5: pendiente' },
      ],
      plot: {
        title: 'Pendiente frente a exponente',
        xLabel: 'exponente  n',
        yLabel: 'pendiente de log P frente a log r',
        note: 'Cuatro lecturas. Lo importante es el patrón que forman.',
      },
      tip: 'Tus cuatro puntos caen sobre una recta. Averigua qué recta antes de continuar.',
    },
    {
      title: 'Usa el patrón',
      body: `Mira tus cuatro lecturas. Con n = 2 la pendiente es 1,5; con
             n = 2,2 es 1,6; con n = 2,5 es 1,75; con n = 1,8 es 1,4.

             \n\nCada escalón de 0,2 en n mueve la pendiente 0,1: la pendiente
             cambia exactamente a la mitad del ritmo del exponente. Escrita, esa
             relación es <strong>pendiente = (n + 1) / 2</strong>, y puedes
             comprobarla con las cuatro lecturas.

             \n\nAhora aplícala a un exponente que no hayas medido. El
             instrumento llega hasta n = 2,9.`,
      prompt: 'Pendiente predicha de log P frente a log r con n = 2,9',
      explain: `(2,9 + 1) / 2 = 1,95. Pon el instrumento en n = 2,9 y
                compruébalo: marca 1,95. Esto es lo que significa que una
                relación sea una ley y no una tabla: responde por casos que no
                has medido. Y funciona también al revés, que es como se usa de
                verdad: una pendiente medida a partir de órbitas reales te dice
                el exponente de la fuerza que las produjo.`,
    },
    {
      title: 'Por qué esta medida en concreto',
      body: `Supón que no cambiaras el exponente en absoluto, sino que hicieras
             la gravedad un diez por ciento más débil bajando G. Las órbitas se
             frenarían y todos los periodos se alargarían.`,
      prompt: 'En la gráfica log-log de periodo frente a radio, debilitar G…',
      options: [
        'inclinaría la recta, igual que cambiar n',
        'desplazaría la recta entera hacia arriba sin inclinarla',
        'no tendría ningún efecto',
        'curvaría la recta',
      ],
      because: `Bajar G alarga todos los periodos en el mismo factor, lo que suma
                la misma cantidad a todos los puntos de una gráfica logarítmica:
                la recta sube y conserva su pendiente. Eso es lo que hace que
                esta medida merezca la pena. Casi cualquier cosa que puedas medir
                de una órbita responde a que la gravedad sea sin más más fuerte o
                más débil, de modo que un cambio observado siempre podría
                explicarse así. La pendiente no. Responde al <em>exponente</em> y
                a nada más, y por eso una pendiente medida es prueba sobre la
                forma de la ley y no sobre su intensidad.`,
    },
    {
      title: '¿Qué más se rompe?',
      body: `Acabas de romper la primera y la tercera leyes de Kepler moviendo un
             solo número. Sería razonable esperar que el resto de la mecánica se
             fuera con ellas.`,
      prompt:
        'Con n fijado en 2,2, la conservación del momento lineal y del momento angular…',
      options: [
        'fallarán las dos, como las dos leyes que ya has roto',
        'se cumplirán las dos, con la misma exactitud que con n = 2',
        'el momento angular se conservará pero el lineal fallará',
      ],
      because: `Se cumplen las dos, y hasta el último decimal que tiene la
                aritmética. Nunca fueron consecuencia del exponente: el momento
                lineal se sigue de que los dos cuerpos de un par se empujen con
                fuerzas iguales y opuestas, y el angular de que ese empuje vaya
                a lo largo de la recta que los une. Ninguno de los dos enunciados
                menciona la distancia, así que ninguno se entera de que la ley de
                distancias ha cambiado.`,
    },
    {
      title: 'Comprueba las leyes de conservación',
      body: `Tres estrellas de masas distintas, todas libres de moverse y todas
             atrayéndose entre sí bajo la ley que esté seleccionada. El
             instrumento informa de cuánto se desvía cada magnitud conservada a
             lo largo de la ejecución, como fracción de sí misma.

             \n\nLee la desviación del momento lineal y del angular con
             <strong>n = 2</strong> y con <strong>n = 2,5</strong>.`,
      tool: {
        title: 'Tres masas desiguales, atrayéndose mutuamente',
        note: 'Una desviación de 1e-15 significa que la magnitud no cambió en absoluto: ésa es la precisión de la aritmética misma.',
      },
      fields: [
        { label: 'n = 2: desviación del momento lineal' },
        { label: 'n = 2,5: desviación del momento lineal' },
        { label: 'n = 2,5: desviación del momento angular' },
      ],
      tip: 'Están escritas en notación científica. 5e-15 son cinco milésimas de billonésima.',
    },
    {
      title: 'Por qué sobrevivieron esas dos',
      body: `El momento lineal y el angular se conservan con unos quince
             decimales, y el exponente no le hace ninguna diferencia a ninguno
             de los dos.`,
      prompt: 'La razón de que el momento lineal se siga conservando es que…',
      options: [
        'la simulación lo impone directamente',
        'los dos cuerpos de cada par se siguen empujando con fuerzas iguales y opuestas, diga lo que diga la ley de distancias',
        'el momento lineal se conserva siempre en todo sistema físico',
        'el exponente no se cambió lo suficiente como para notarlo',
      ],
      because: `A cada par de cuerpos se le asigna una única magnitud de fuerza,
                aplicada a ambos en sentidos opuestos. Ésa es la tercera ley de
                Newton, y en ella no se menciona la distancia: cambia cómo
                depende la magnitud de r y las dos fuerzas siguen siendo iguales
                y opuestas, así que el momento total sigue sin poder cambiar. El
                momento angular sobrevive por una razón muy relacionada: la
                fuerza apunta a lo largo de la recta que une los cuerpos, de modo
                que no ejerce ningún giro respecto del centro, y eso también vale
                para cualquier dependencia de r.

                \n\nAsí que estas dos no son consecuencia de la inversa del
                cuadrado en absoluto. Son consecuencia de que la fuerza sea
                <em>por pares</em> y <em>central</em>, que es lo que no
                cambiaste.`,
    },
    {
      title: 'Y la energía, con una salvedad',
      body: `La energía también se conserva, pero aquí hay una trampa de verdad, y
             vale la pena verla porque es la clase de error que sobrevive a una
             revisión por pares.

             \n\nLa fórmula de la energía potencial gravitatoria que conoces,
             <strong>−GMm/r</strong>, no es un hecho general sobre la gravedad.
             Es la energía potencial <em>de la ley de la inversa del cuadrado en
             concreto</em>. Cambia el exponente y esa fórmula deja de describir
             la fuerza que estás integrando.

             \n\nSi la sigues usando igualmente, la energía total parece
             desviarse, y concluirías que tu universo no conserva la energía. Sí
             la conserva. El instrumento que acabas de usar calcula el potencial
             que corresponde de verdad a la ley activada, y por eso su cifra de
             energía se mantiene.

             \n\nEl enunciado general es que <em>cualquier</em> fuerza que
             dependa sólo de la posición conserva la energía. La inversa del
             cuadrado tampoco es especial en eso: simplemente tiene una fórmula
             célebremente pulcra.`,
      tip: 'Una ley de conservación que parece fallar suele ser una medida hecha con la definición equivocada.',
    },
    {
      title: 'Dos listas',
      body: `Todo lo que has medido se ordena en dos montones, y esa ordenación es
             el objetivo de la investigación.

             \n\n<strong>Específico de la inversa del cuadrado:</strong> la
             órbita elíptica cerrada y la pendiente 3/2 del periodo frente al
             radio. Ambas se movieron en cuanto se movió el exponente. Ambas son
             propiedades de ese exponente concreto y no de la gravedad en
             general.

             \n\n<strong>Cierto para cualquier fuerza central y por
             pares:</strong> la conservación del momento lineal, la del momento
             angular y la de la energía. Ninguna se movió lo más mínimo, porque
             ninguna dependió nunca del exponente.

             \n\nEsa segunda lista tiene un origen más profundo del que esta
             lección puede demostrar: hay un teorema, debido a Emmy Noether en
             1918, que conecta cada ley de conservación con una simetría —el
             momento lineal con que el espacio no tenga ningún lugar especial, el
             angular con que no tenga ninguna dirección especial—. Lo que has
             medido aquí es compatible con eso y no es una demostración. Lo que
             <em>sí</em> has mostrado es más estrecho y sigue mereciendo la pena:
             a estas magnitudes no les importa la dependencia radial de la
             fuerza, y a dos resultados orbitales famosos apenas les importa otra
             cosa.`,
    },
    {
      title: 'Dónde se detiene el instrumento',
      body: `El deslizador del exponente se detiene en 2,9, y la razón es un
             resultado real y no un límite del programa.

             \n\nA medida que n se acerca a 3, la precesión por órbita crece sin
             límite; puedes verlo: 9 grados con n = 2,05, 43 con n = 2,2, 151 con
             n = 2,5. Justo en n = 3 ocurre algo cualitativo: una órbita circular
             deja de ser estable. Aparta ligeramente a un planeta de la
             circunferencia y, en lugar de oscilar alrededor de ella, describe
             una espiral: o hacia dentro, hacia la estrella, o hacia fuera y
             lejos.

             \n\nEso conviene saberlo y no conviene sufrirlo, porque allí las
             órbitas se desbaratan y cuesta distinguir una inestabilidad real de
             una simulación rota. Así que el instrumento se queda por debajo y lo
             nombra en su lugar.`,
      tip: 'Una gravedad más empinada que la inversa del cubo no tiene ninguna órbita circular estable.',
    },
    {
      title: 'Una última clasificación',
      body: `Un estudiante te cuenta que ha simulado un sistema planetario y que
             las órbitas precesan de forma apreciable.`,
      prompt: '¿Qué única pregunta de seguimiento te diría más?',
      options: [
        '¿cuál es la masa de la estrella central?',
        '¿cambia la precesión si divides a la mitad el paso temporal?',
        '¿cómo de excéntricas son las órbitas?',
        '¿cuánto tiempo estuvo corriendo la simulación?',
      ],
      because: `Todas son preguntas razonables, pero sólo una separa un resultado
                de un artefacto. Una precesión que mengua cuando mengua el paso
                temporal nunca fue física. Una precesión que se queda quieta ha
                sobrevivido a la única prueba que podía matarla, y sólo entonces
                merece la pena preguntar qué la causa. Has usado exactamente esta
                prueba en esta lección, y es la costumbre que más vale la pena
                llevarse de ella.`,
    },
    {
      title: 'Qué ha sido esto y qué no',
      body: `Una última puntualización, porque sería fácil marcharse con una
             conclusión mayor de la que sostienen las pruebas.

             \n\nEsto ha sido un <strong>experimento controlado dentro de una
             simulación</strong>, no una teoría de la gravedad. La ley de
             potencias con radio de referencia no es algo que nadie proponga como
             descripción del universo; es un mando deliberadamente simple,
             elegido porque girarlo aísla una pregunta. Las alternativas reales a
             la gravedad newtoniana no se parecen a esto.

             \n\nLas órbitas del Sistema Solar real <em>sí</em> precesan: la de
             Mercurio de manera célebre, 43 segundos de arco por siglo más de lo
             que puede explicar la gravedad newtoniana con todos los demás
             planetas incluidos. Eso lo explicó en 1915 la relatividad general,
             que no es un cambio del exponente y no es lo que hace este modelo. El
             parecido merece notarse y la explicación no es la misma.

             \n\nLo que sí puedes llevarte es el método. Cuando un resultado
             cambie, pregunta de qué dependía; cuando no cambie, pregunta por qué
             no; y cuando una simulación te diga algo sorprendente, cambia el paso
             temporal antes de creértelo.`,
    },
  ],
};
