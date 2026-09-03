// =============================================================================
// butterfly-effect - es
// -----------------------------------------------------------------------------
// Una sombra de ../butterfly-effect.js que sólo lleva sus palabras. Se
// superpone a la lección inglesa mediante mergeTranslation() en ../i18n.js, de
// modo que nada de aquí puede alcanzar la maquinaria de la lección: ningún
// nombre de escenario, ninguna semilla, ningún identificador de widget, ninguna
// respuesta numérica, ninguna sonda.
//
// Los arreglos se alinean por índice con el inglés. `null` significa «sin
// traducir»; esa entrada conserva su inglés.
// =============================================================================

export default {
  title: 'El efecto mariposa en el espacio',
  subtitle:
    'Ejecuta el mismo sistema dos veces y descubre cuánto dura la respuesta',
  duration: '55-70 min',
  level: 'Astronomía introductoria',
  summary:
    'Dos ejecuciones de las mismas tres estrellas, partiendo de posiciones que difieren en mil quinientos kilómetros dentro de un sistema de ciento treinta millones de kilómetros, acaban en sitios completamente distintos. Entremedias no ocurre nada aleatorio: la simulación es determinista, y ejecutarla dos veces con exactamente los mismos números da exactamente el mismo resultado. Por el camino medirás un caso que parece caos y no lo es, pondrás un número a la rapidez con la que falla la predicción, y comprobarás que ese número es una propiedad de la física y no del ordenador.',
  objectives: [
    'Mostrar que un sistema determinista puede ser impredecible, y explicar por qué no es lo mismo',
    'Distinguir la divergencia exponencial de la deriva lineal que muestran de todos modos dos órbitas casi idénticas',
    'Medir un tiempo de crecimiento a partir de un intervalo log-lineal, y explicar por qué una ejecución corta da una estimación y no un exponente de Lyapunov',
    'Comprobar si una divergencia calculada sobrevive a un paso temporal menor y a otro integrador, y rechazarla si no lo hace',
    'Explicar por qué «tres cuerpos» y «caótico» no son la misma afirmación',
  ],
  steps: [
    {
      title: 'Una palabra desgastada por el uso',
      body: `En pantalla hay tres estrellas de seis masas solares cada una,
             situadas en los vértices de un triángulo equilátero y girando
             alrededor de su centro común como si fueran un objeto rígido. No es
             casualidad que encajen tan bien: es una solución exacta del problema
             de los tres cuerpos, hallada por Lagrange en 1772, y si los números
             se ajustan con precisión el triángulo gira para siempre sin cambiar
             de forma.

             \n\nAquí no girará para siempre. Obsérvalo el tiempo suficiente y se
             deshace. De eso trata esta investigación, y la palabra que suele
             acompañarla —<strong>caos</strong>— está tan desgastada por el uso
             que conviene decir de entrada lo que <em>no</em> significa.

             \n\nCaos no significa aleatorio. No significa desordenado. No
             significa que el ordenador se haya rendido. Significa una cosa muy
             concreta, que vas a medir: dos inicios casi iguales conducen a
             futuros completamente distintos, y la diferencia crece de forma
             <em>exponencial</em>.

             \n\nTodo en esta lección apunta a distinguir eso de tres cosas con
             las que se confunde habitualmente.`,
      tip: 'La simulación está en pausa. No se moverá nada hasta que la dejes correr.',
    },
    {
      title: 'Los mismos números, dos veces',
      body: `Antes que nada, la pregunta más básica que existe sobre una
             simulación.

             \n\nSupón que grabas este sistema durante cuarenta segundos, después
             devuelves cada estrella exactamente a donde empezó —las mismas
             posiciones, las mismas velocidades, todo igual— y lo grabas otros
             cuarenta segundos.`,
      prompt: 'Las dos grabaciones serán…',
      options: [
        'idénticas, hasta el último decimal',
        'casi idénticas, con diferencias aleatorias diminutas',
        'perceptiblemente distintas, porque el ordenador redondea de otra manera cada vez',
        'completamente distintas, porque el sistema es caótico',
      ],
      because: `Idénticas, hasta el último decimal. Esto importa más de lo que
                parece. Una simulación es aritmética: los mismos números en el
                mismo orden dan el mismo resultado siempre, en la misma máquina y
                en el mismo navegador. No hay ninguna tirada de dados en el
                motor. Lo que estás a punto de ver no es aleatoriedad, y
                demostrarlo <em>primero</em> es lo que hace que el resto de la
                lección signifique algo.`,
    },
    {
      title: 'Cómo ejecutar lo mismo dos veces',
      body: `Hacerlo a mano es imposible: no puedes devolver tres estrellas a su
             sitio a ojo. El <strong>Banco A/B</strong>, en Herramientas, existe
             precisamente para esto.

             \n\nFunciona en seis movimientos:

             \n\n<strong>Capturar inicio</strong> registra el mundo tal como está:
             la semilla, el reloj, la posición y la velocidad de cada estrella, y
             cuál es cuál. <strong>Grabar</strong> lo ejecuta y lo muestrea.
             <strong>Volver al inicio</strong> lo restituye todo, exactamente.
             Después cambias una cosa, vuelves a grabar y comparas.

             \n\nAbre ahora el banco (Herramientas → Banco A/B), pon al
             experimento un nombre que reconozcas y pulsa
             <strong>Capturar inicio</strong>. Después marca
             <strong>Posición</strong> y <strong>Energía total</strong> para que
             las ejecuciones lleven lo que esta lección necesita.`,
      tip: 'El banco mantiene las dos ejecuciones sobre el mismo eje de tiempo simulado, que es lo que las hace comparables.',
    },
    {
      title: 'El control de reproducibilidad',
      body: `Ejecuta el experimento idéntico dos veces, sin cambiar
             <em>nada</em> entre una y otra.

             \n\nGraba la ejecución A durante unos cuarenta segundos. Pulsa
             <strong>Volver al inicio</strong>. Graba la ejecución B durante
             aproximadamente lo mismo, otra vez sin cambiar nada.

             \n\nEl instrumento de abajo mide la distancia entre las dos
             ejecuciones: cuán separadas están las dos versiones del sistema,
             sumando sobre las tres estrellas, en cada instante de tiempo
             simulado.`,
      checklist: [
        'Captura el inicio y graba la ejecución A',
        'Vuelve al inicio',
        'Graba la ejecución B sin cambiar nada',
        'Lee la separación que informa el instrumento',
      ],
      rubric: `La separación debería ser exactamente cero durante toda la
               ejecución, y el instrumento debería decir que «las dos ejecuciones
               son idénticas». Puntuación completa por informar de cero y
               reconocer lo que establece: el motor es determinista, así que
               cualquier diferencia que se vea más adelante tiene una causa
               señalable. Puntuación parcial por informar de cero sin conectarlo
               con lo que sigue. Si un estudiante informa de una separación no
               nula aquí, lo más probable es que haya cambiado algún ajuste entre
               las ejecuciones; la propia línea «qué cambió entre las
               ejecuciones» del banco lo dirá.`,
    },
    {
      title: 'Qué demuestra el cero',
      body: `Tus dos ejecuciones se separaron exactamente nada.`,
      prompt: 'La conclusión correcta a partir de eso es…',
      options: [
        'este sistema no es caótico',
        'la simulación es determinista: la misma entrada da siempre la misma salida',
        'la simulación es precisa',
        'cuarenta segundos es demasiado poco para ver nada',
      ],
      because: `Determinista, y nada más. El determinismo es una afirmación sobre
                la <em>regla</em>: dado un estado, el siguiente se sigue sin
                ningún elemento de azar. No dice nada sobre la precisión —una
                simulación determinista puede estar deterministamente
                equivocada— ni sobre si el sistema es caótico. Ésas son las dos
                preguntas siguientes, en ese orden.`,
    },
    {
      title: 'Un control, antes del caso interesante',
      body: `Ahora dos estrellas, no tres. Es el escenario <strong>Par
             binario</strong>: dos estrellas girando en torno a su centro de
             masas común en una órbita cerrada y repetitiva. El movimiento de dos
             cuerpos es el único problema gravitatorio completamente resuelto
             —lo resolvió Newton— y no tiene nada de caótico. Es el control.

             \n\nVamos a hacerle algo que parece que no debería importar: mover
             una estrella lateralmente <strong>1500 km</strong> antes de empezar,
             y dejar todo lo demás igual.

             \n\nMil quinientos kilómetros es aproximadamente la distancia de
             Londres a Roma. Las dos estrellas están aquí a cuatro unidades
             astronómicas, es decir, seiscientos millones de kilómetros. Así que
             el empujón es de una parte en cuatrocientas mil del sistema.

             \n\nUna nota práctica: este par tarda cuatro años en dar una vuelta,
             así que la lección ha subido la velocidad de simulación para esta
             sección. Eso cambia la rapidez con la que lo miras y nada de la
             física: ambas ejecuciones usan el mismo paso, así que la comparación
             entre ellas no se ve afectada.`,
    },
    {
      title: 'Un empujón a una estrella de un binario',
      body: `Captura el inicio, graba la ejecución A, vuelve al inicio, aplica el
             empujón de 1500 km y graba la ejecución B.`,
      prompt:
        'A lo largo de unas cuantas órbitas, la distancia entre las dos ejecuciones probablemente…',
      options: [
        'se quedará en 1500 km, porque la órbita es estable',
        'crecerá de forma sostenida, más o menos en proporción al tiempo que esperes',
        'se duplicará, y volverá a duplicarse, y otra vez: cada vez más deprisa',
        'se reducirá a cero cuando la órbita se cierre',
      ],
      because: `Crece más o menos en proporción al tiempo. La razón: mover un poco
                una estrella cambia un poco su periodo orbital. Dos relojes que
                marchan a ritmos ligeramente distintos se desfasan de forma
                sostenida: al cabo del doble de tiempo, el doble de desfase. Nada
                se acelera. Esto es <em>deriva de fase</em>, y es lo que más a
                menudo se confunde con el caos.`,
    },
    {
      title: 'Mide el binario',
      body: `Hazlo. Captura, ejecución A, vuelve al inicio, empuja una estrella
             1500 km en x, ejecución B.

             \n\nEl control de perturbación del banco aplica el empujón por ti y
             registra exactamente qué cambió, de modo que el número no es algo
             que debas recordar después: queda guardado con el experimento y se
             imprime en tu informe.

             \n\nFíjate en dos cosas del instrumento: la forma de la separación en
             la gráfica <strong>lineal</strong>, y lo que hace en la
             <strong>logarítmica</strong>.`,
      checklist: [
        'Aplica la perturbación de 1500 km a una estrella',
        'Graba ambas ejecuciones durante al menos cuatro órbitas',
        'Lee el factor de crecimiento y el r² de la recta',
        'Anota si el instrumento da un tiempo de crecimiento',
      ],
      rubric: `Espera un factor de crecimiento del orden de cien a lo largo de
               cuatro o cinco órbitas, un ajuste lineal con r² ≈ 0,99 o mejor y
               —esto es lo importante— <strong>ningún tiempo de
               crecimiento</strong>: el instrumento debería negarse, informando de
               que la separación crece en proporción al tiempo y no de forma
               exponencial. La puntuación completa exige advertir la negativa y
               leerla como un resultado y no como una avería.`,
    },
    {
      title: 'El instrumento se negó',
      body: `El instrumento informó de un factor de crecimiento pero se negó a dar
             un tiempo de crecimiento, diciendo que la separación crece
             linealmente.`,
      prompt: 'Esa negativa es…',
      options: [
        'una limitación del programa: cualquier curva creciente admite un ajuste exponencial',
        'correcta, y es justo el objetivo: el crecimiento lineal no es exponencial, y llamarlo caos sería un error',
        'consecuencia de que la ejecución es demasiado corta',
        'porque las órbitas de dos cuerpos no son deterministas',
      ],
      because: `Correcta, y es justo el objetivo. Puedes forzar una recta a través
                del logaritmo de <em>cualquier</em> serie creciente y leer en la
                pendiente un número con unidades de tiempo. Ese número parecería
                exactamente un tiempo de Lyapunov y no significaría nada. El
                instrumento comprueba si la exponencial ajusta de verdad —y si
                una recta ajusta mejor— antes de citar ninguno. Un instrumento
                que siempre da una respuesta no está midiendo nada.`,
    },
    {
      title: 'Lineal, en números',
      body: `Supón que la separación en tu binario creció de 1500 km a unos
             100 000 km a lo largo de cuatro órbitas, en proporción al tiempo.`,
      prompt:
        'Con ese comportamiento, ¿a qué distancia estarían aproximadamente las dos ejecuciones tras cuarenta órbitas, en km?',
      unit: 'km',
      because: `Aproximadamente un millón de kilómetros: diez veces más tiempo da
                unas diez veces más separación, porque el crecimiento es
                proporcional al tiempo. Retén ese número. En el caso de tres
                cuerpos que estás a punto de ejecutar, diez veces más tiempo no
                da diez veces más: da algo con muchos más ceros.`,
    },
    {
      title: 'De vuelta al triángulo',
      body: `Otra vez tres estrellas, en la configuración equilátera de Lagrange.

             \n\nUnas palabras sobre por qué esta disposición en concreto.
             Lagrange demostró en 1772 que tres cuerpos situados en los vértices
             de un triángulo equilátero, girando al ritmo adecuado, son una
             solución exacta: el triángulo conserva su forma para siempre. Setenta
             años más tarde Gascheau determinó cuándo esa solución es
             <em>estable</em>, y la respuesta es una desigualdad limpia: se cumple
             sólo si

             \n\n<strong>27(m₁m₂ + m₂m₃ + m₃m₁) &lt; (m₁ + m₂ + m₃)²</strong>

             \n\nPara tres masas iguales el lado izquierdo es 81m² y el derecho
             9m². La desigualdad falla por un factor de nueve. Así que esta
             solución exacta y perfectamente regular es <em>inestable</em>: el
             triángulo está en equilibrio sobre el filo de un cuchillo, y
             cualquier desviación crece.

             \n\nNo es un defecto de la simulación. Es un teorema sobre el problema
             de los tres cuerpos, y es la razón de que se eligiera esta
             configuración para el laboratorio: empieza perfectamente ordenada,
             así que no hay duda sobre cuál era el estado inicial, y se aparta de
             ese orden de una manera que podemos medir.`,
    },
    {
      title: 'El mismo empujón, tres cuerpos',
      body: `El mismo experimento que con el binario: captura, ejecución A,
             vuelve, empuja una estrella 1500 km, ejecución B. El triángulo mide
             aquí 0,87 UA de lado —130 millones de kilómetros—, así que el empujón
             es de una parte en noventa mil.`,
      prompt: 'Comparadas con el binario, las dos ejecuciones se separarán…',
      options: [
        'a un ritmo parecido: 1500 km son 1500 km',
        'más despacio, porque tres cuerpos reparten la perturbación entre ellos',
        'muchísimo más deprisa, y a un ritmo acelerado',
        'nada en absoluto, porque la solución equilátera es exacta',
      ],
      because: `Muchísimo más deprisa, y acelerando. Comprométete con eso antes de
                medirlo, porque el tamaño del efecto cuesta de creer hasta que se
                ha visto el número.`,
    },
    {
      title: 'Mide el triple',
      body: `Ejecútalo. Captura el inicio, graba la ejecución A unos cuarenta
             segundos, vuelve al inicio, aplica la misma perturbación de 1500 km a
             <strong>Alfa</strong> y graba la ejecución B durante aproximadamente
             lo mismo.

             \n\nEsta vez fíjate sobre todo en la gráfica logarítmica. En la
             lineal no pasa casi nada y después pasa todo de golpe. En la
             logarítmica esos mismos datos son una recta, y una recta en una
             gráfica logarítmica es el aspecto que tiene el crecimiento
             exponencial.`,
      checklist: [
        'Captura el inicio y graba la ejecución A',
        'Vuelve al inicio y perturba Alfa 1500 km',
        'Graba la ejecución B',
        'Lee el tiempo de crecimiento y el intervalo ajustado',
      ],
      rubric: `Espera un tiempo de crecimiento de aproximadamente 6 a 8 segundos
               simulados, un ajuste log-lineal con r² por encima de 0,98 y un
               crecimiento total de seis o siete órdenes de magnitud. La
               puntuación completa exige el tiempo de crecimiento con su
               intervalo ajustado, no sólo «divergió». Un estudiante que informe
               de un valor muy fuera de 5–9 s probablemente ha grabado ejecuciones
               de duraciones muy distintas; el banco informa del solapamiento que
               realmente usó.`,
    },
    {
      title: 'Anota lo que mediste',
      body: `Lee estos valores en el instrumento y anótalos. Van a tu informe.`,
      fields: [
        {
          label: 'tiempo de crecimiento',
          unit: 'segundos simulados',
          hint: '6,9',
        },
        { label: 'calidad del ajuste r²', unit: '', hint: '0,99' },
        {
          label: 'factor de crecimiento total',
          unit: '× la separación inicial',
          hint: '2e7',
        },
      ],
    },
    {
      title: 'Qué es un tiempo de crecimiento',
      body: `El instrumento ajustó una recta al logaritmo de la separación y
             convirtió la pendiente en un tiempo. Ese tiempo, que suele escribirse
             τ, es lo que tarda la diferencia entre las dos ejecuciones en crecer
             un factor e, es decir, unas 2,7 veces.

             \n\nAsí que tras un τ las dos ejecuciones están 2,7 veces más
             separadas que al principio. Tras dos, unas 7,4 veces. Tras diez, unas
             22 000 veces. Tras veinte, unos 500 millones de veces. El crecimiento
             no es rápido al principio, y eso es justo lo que lo hace traicionero:
             durante los primeros segundos las dos ejecuciones se ven idénticas en
             pantalla.

             \n\nFíjate en lo que el instrumento sombreó en la gráfica. No ajusta
             toda la ejecución. Al principio la separación sigue siendo
             esencialmente la propia perturbación y aún no ha empezado a crecer; al
             final deja de crecer porque las estrellas se han reorganizado por
             completo y ya no queda sistema en el que separarse más. Sólo el tramo
             intermedio es exponencial, y citar un ritmo ajustado a los extremos
             planos sería citar un ritmo más lento que el real.`,
    },
    {
      title: '¿Cuánto dura una predicción?',
      body: `Toma tu τ. Empiezas conociendo las posiciones de las estrellas con
             una precisión de 1500 km, y quieres saber cuándo las dos ejecuciones
             estarán separadas una unidad astronómica entera —150 millones de km,
             aproximadamente el tamaño de todo el sistema—.

             \n\nEso es un factor de crecimiento de 100 000, y ln(100 000) ≈ 11,5.`,
      prompt:
        'Con tu τ, ¿cuánto tiempo es eso aproximadamente, en segundos simulados?',
      unit: 'segundos simulados',
      because: `Unos 11,5 τ, así que con τ ≈ 6,9 s son aproximadamente 80 segundos
                simulados: tres rotaciones del triángulo. Todo lo que sabías sobre
                dónde estarían las estrellas desaparece en tres vueltas, a partir
                de un error inicial del ancho de un país.`,
    },
    {
      title: 'Comprar más tiempo',
      body: `Supón que eso no te satisface y mejoras tu medida de las posiciones
             iniciales en un factor de mil: de 1500 km a 1,5 km.`,
      prompt: '¿Cuánto más dura tu predicción?',
      options: [
        'mil veces más',
        'unos siete τ más: unos cincuenta segundos extra',
        'unos mil τ más',
        'nada: la mejora se borra inmediatamente',
      ],
      because: `Unos ln(1000) ≈ 6,9 τ más. Ésta es la aritmética cruel del caos, y
                es toda su consecuencia práctica: como el error crece
                exponencialmente, reducirlo sólo te compra tiempo de forma
                <em>logarítmica</em>. Una medida mil veces mejor compra siete
                tiempos de crecimiento. Una medida un millón de veces mejor compra
                catorce. No hay ninguna medida lo bastante buena para dar
                predicción a largo plazo, y eso es una afirmación sobre el sistema,
                no sobre tus instrumentos.`,
    },
    {
      title: 'La objeción que deberías tener',
      body: `Ésta es la objeción que cualquier persona cuidadosa debería plantear
             a estas alturas.

             \n\nLa simulación no resuelve las ecuaciones exactamente. Avanza el
             tiempo en pasos pequeños, y cada paso comete un pequeño error
             aritmético. Esos errores también son diferencias entre las dos
             ejecuciones, y también crecen. Entonces, ¿cómo sabes que la
             divergencia que mediste es la física y no simplemente los errores
             acumulados del integrador?

             \n\nEs una pregunta legítima y tiene una respuesta legítima:
             <strong>cambia la numérica y mira si cambia la respuesta.</strong>

             \n\nSi la divergencia es física, calcularla con más precisión da el
             mismo ritmo. Si es un artefacto del paso temporal, reducirlo a la
             mitad lo cambiará, normalmente mucho. Esa prueba no es opcional. Sin
             ella, la medida es una propiedad del programa.`,
    },
    {
      title: 'Antes de refinar',
      body: `Estás a punto de repetir la comparación de tres cuerpos con el paso
             temporal reducido y con otro integrador.`,
      prompt:
        'Si la divergencia que mediste es física, el tiempo de crecimiento…',
      options: [
        'se reducirá más o menos a la mitad, porque el paso se redujo a la mitad',
        'se mantendrá aproximadamente igual',
        'se duplicará aproximadamente',
        'será imposible de medir',
      ],
      because: `Se mantendrá aproximadamente igual. Eso es exactamente lo que
                significa «físico» aquí: la respuesta pertenece al sistema y no a
                la forma en que se calculó. Si se mueve mucho, el informe honesto
                no es un número más pequeño, sino «numéricamente no resuelto».`,
    },
    {
      title: 'El control numérico',
      body: `Repite la comparación de tres cuerpos dos veces más:

             \n\n<strong>Una con un paso temporal menor.</strong> En Ajustes, pon
             la velocidad de simulación a la mitad de lo que estaba. Eso reduce a
             la mitad el paso que da el integrador en cada fotograma.

             \n\n<strong>Otra con un integrador distinto.</strong> En Ajustes,
             cambia de Euler simpléctico a Verlet de velocidades, o a RK4.

             \n\nCada vez, usa la acción <strong>registrar como control
             numérico</strong> del banco, que guarda el tiempo de crecimiento bajo
             una etiqueta en lugar de sobrescribir tu resultado principal. El
             instrumento informa entonces de si las tres respuestas coinciden.`,
      checklist: [
        'Repite la comparación a la mitad de velocidad de simulación',
        'Repítela con otro integrador',
        'Registra cada una como control numérico',
        'Lee el veredicto de refinamiento',
      ],
      rubric: `Los tres tiempos de crecimiento deberían coincidir dentro de un
               veinte por ciento aproximadamente, y el instrumento debería
               informar del resultado como resuelto. Los valores medidos para esta
               configuración con tres integradores y tres pasos temporales van de
               6,8 a 7,6 segundos simulados. La puntuación completa exige informar
               de la dispersión y extraer la conclusión: la divergencia es una
               propiedad del sistema de tres cuerpos y no del integrador. Un
               estudiante cuyos valores discrepen enormemente probablemente ha
               cambiado otra cosa al mismo tiempo; la comparación de parámetros
               del banco lo nombrará.`,
    },
    {
      title: 'Leer el veredicto',
      body: `Imagina un sistema distinto en el que repetir la comparación con la
             mitad del paso temporal diera un tiempo de crecimiento tres veces
             mayor, y RK4 diera uno cinco veces menor.`,
      prompt: 'Lo correcto sería informar de que ese sistema…',
      options: [
        'tiene como resultado la media de los tres valores',
        'tiene el valor de RK4, porque RK4 es el integrador más preciso',
        'está numéricamente no resuelto, y no debe citarse ningún tiempo de crecimiento',
        'es más caótico que el que mediste',
      ],
      because: `Numéricamente no resuelto, y sin citar ningún número. Promediar
                tres números que discrepan no produce uno mejor. Tomar la
                respuesta del integrador más preciso es tentador y sigue estando
                mal: si la respuesta depende del integrador, ninguno la ha
                resuelto, y lo correcto es reducir el paso hasta que coincidan, o
                declarar honestamente que no lo hacen. Esto no es hipotético: dos
                de las configuraciones consideradas para este laboratorio se
                comportaron exactamente así y fueron descartadas por ello.`,
    },
    {
      title: 'No todos los sistemas de tres cuerpos',
      body: `Se dice muy a menudo que el problema de los tres cuerpos <em>es</em>
             caótico. No es cierto, y los contraejemplos son famosos.

             \n\nVuelve a la desigualdad de Gascheau. Para tres masas
             <em>iguales</em> la solución equilátera es inestable: ése es el
             sistema que mediste. Pero haz que un cuerpo sea mucho más pesado que
             los otros dos y la misma desigualdad se cumple, y la configuración
             equilátera pasa a ser <em>estable</em>. No es una curiosidad: es la
             razón de que Júpiter tenga miles de asteroides troyanos sesenta grados
             por delante y por detrás de él, y de que lleven ahí miles de millones
             de años.

             \n\nY en el año 2000 Chenciner y Montgomery demostraron la existencia
             de una órbita de tres cuerpos en la que tres masas iguales se
             persiguen a lo largo de un ocho, para siempre y de forma estable.
             Tres cuerpos, masas comparables, sin caos.

             \n\nAsí que «tres cuerpos» no es la misma afirmación que «caótico». Lo
             que hace caótico a un sistema es una propiedad de su configuración
             concreta, y la manera de averiguarlo es la medida que acabas de
             hacer.`,
    },
    {
      title: '¿Cuál de éstos es caos?',
      body: `Cuatro sistemas, cada uno ejecutado dos veces desde inicios que
             difieren en una perturbación diminuta.`,
      prompt:
        '¿Qué observación es prueba de dependencia sensible de las condiciones iniciales?',
      options: [
        'Las dos ejecuciones se mantienen exactamente iguales durante toda la ejecución',
        'La separación crece de forma sostenida en proporción al tiempo transcurrido',
        'La separación crece un factor e cada pocos segundos, al mismo ritmo con tres integradores distintos',
        'La separación salta de forma impredecible de una muestra a otra',
      ],
      because: `Crecimiento por un factor fijo por unidad de tiempo —exponencial—
                y confirmado por refinamiento. La primera es el control de
                reproducibilidad y muestra determinismo. La segunda es deriva de
                fase, que muestra cualquier órbita perturbada. La cuarta tampoco es
                caos: una separación que salta de una muestra a la siguiente es
                ruido, y en una simulación determinista suele significar que algo
                va mal en la medida más que algo interesante en la física.`,
    },
    {
      title: 'Determinista e impredecible',
      body: `Has demostrado dos cosas que suenan contradictorias: la simulación es
             exactamente reproducible, y su comportamiento a largo plazo no puede
             predecirse.`,
      prompt:
        'En dos o tres frases, explica cómo pueden ser ciertas las dos a la vez.',
      rubric: `Puntuación completa por la distinción entre la <em>regla</em> y el
               <em>conocimiento del estado</em>: las ecuaciones determinan
               completamente el futuro a partir del presente, así que ejecutar los
               mismos números dos veces da el mismo resultado, pero cualquier
               conocimiento real del presente es aproximado, y en un sistema
               caótico las aproximaciones crecen exponencialmente hasta volverse
               inútiles. Crédito también por observar que predecir exige conocer el
               estado inicial y no sólo la ley. Errores frecuentes que conviene
               buscar: «el ordenador introduce aleatoriedad» (no lo hace: el
               estudiante lo demostró en el control de reproducibilidad) y «el caos
               significa que las reglas dejan de funcionar» (las reglas nunca
               cambian).`,
    },
    {
      title: 'Mueve el horizonte',
      body: `Un último experimento, y éste lo diseñas tú.

             \n\nRepite la comparación de tres cuerpos con un tamaño de
             perturbación <em>distinto</em>: diez veces menor, o cien veces mayor.
             El banco te deja escribir el número.

             \n\nAntes de ejecutarlo, predice qué cambiará: el tiempo de
             crecimiento, el momento en que las dos ejecuciones se vuelven
             visiblemente distintas, o ambos.`,
      checklist: [
        'Ejecuta la comparación con una perturbación diez veces menor',
        'Compara el tiempo de crecimiento con tu primera medida',
        'Compara cuánto tardan las dos ejecuciones en dejar de verse idénticas',
        'Di cuál de los dos cambió y cuál no',
      ],
      rubric: `El tiempo de crecimiento debería quedar esencialmente igual: es una
               propiedad del sistema, no de la perturbación. Lo que cambia es el
               <em>desplazamiento</em>: una perturbación diez veces menor tarda
               unos ln(10) ≈ 2,3 tiempos de crecimiento más en alcanzar la misma
               separación, así que las ejecuciones permanecen juntas unos dieciséis
               segundos más y nada más. La puntuación completa exige separar el
               ritmo del horizonte: el ritmo lo fija la física, el horizonte se
               mueve logarítmicamente con lo bien que conozcas el inicio.`,
    },
    {
      title: 'De qué es modelo esto',
      body: `Las tres estrellas son un laboratorio, no una observación. Ningún
             sistema real tiene tres estrellas exactamente iguales en un triángulo
             equilátero exacto, y ése es el objetivo: la configuración se eligió
             porque empieza en un estado que podemos especificar exactamente, de
             modo que la única diferencia entre dos ejecuciones sea la que
             introdujimos nosotros.

             \n\nPero el comportamiento no es sólo de laboratorio. Es la razón de
             que las predicciones meteorológicas sirvan para una semana y no para
             un mes: Lorenz encontró la misma sensibilidad exponencial en un
             modelo de convección en 1963, y la expresión «efecto mariposa» viene
             del título de una charla suya sobre ello. Es la razón de que la
             estabilidad a largo plazo del Sistema Solar siga siendo una pregunta
             de investigación y no un cálculo cerrado: los planetas interiores
             tienen un tiempo de Lyapunov de unos pocos millones de años, así que
             sus posiciones no pueden predecirse más allá de unos cien millones de
             años por bien que se midan hoy. Y es la razón de que una nave en una
             trayectoria por un campo gravitatorio de varios cuerpos necesite
             correcciones de rumbo y no sólo un buen lanzamiento.

             \n\nUna salvedad honesta sobre tu propio número. Lo que mediste es una
             estimación de un ritmo de crecimiento local sobre una ventana finita,
             a partir de una perturbación, en una dirección. Un exponente de
             Lyapunov verdadero se define como un límite sobre tiempo infinito,
             promediado sobre el atractor. El tuyo es una buena medida de aula de
             lo deprisa que <em>este</em> sistema pierde la pista de <em>esta</em>
             perturbación, y la comprobación de refinamiento te dice que no es un
             artefacto. No es la cantidad asintótica que lleva ese nombre, y
             presentarlo como tal sería afirmar de más.`,
    },
    {
      title: 'De dónde salen estos resultados',
      body: `Las afirmaciones de esta investigación, y dónde comprobarlas:

             \n\n<strong>Lagrange, J.-L. (1772).</strong> <em>Essai sur le problème
             des trois corps.</em> La solución equilátera.

             \n\n<strong>Gascheau, G. (1843).</strong> Comptes Rendus de l'Académie
             des Sciences 16, 393. El criterio de estabilidad
             27(m₁m₂+m₂m₃+m₃m₁) &lt; (m₁+m₂+m₃)², que explica por qué tres masas
             iguales en los vértices de un triángulo se separan y los troyanos de
             Júpiter no.

             \n\n<strong>Poincaré, H. (1890).</strong> «Sur le problème des trois
             corps et les équations de la dynamique». Acta Mathematica 13, 1. El
             trabajo que mostró por primera vez que el problema de los tres cuerpos
             tiene soluciones demasiado complicadas para escribirlas, y el origen
             de la disciplina moderna.

             \n\n<strong>Lorenz, E. N. (1963).</strong> «Deterministic Nonperiodic
             Flow». Journal of the Atmospheric Sciences 20, 130. Dependencia
             sensible, en un modelo meteorológico, con la expresión que le dio
             nombre.

             \n\n<strong>Chenciner, A. y Montgomery, R. (2000).</strong> «A
             remarkable periodic solution of the three-body problem in the case of
             equal masses». Annals of Mathematics 152, 881. La órbita en ocho: tres
             masas iguales, sin caos.

             \n\n<strong>Boekholt, T. C. N., Portegies Zwart, S. F. y Valtonen, M.
             (2020).</strong> «Gargantuan chaotic gravitational three-body systems
             and their irreversibility to the Planck length». Monthly Notices of the
             Royal Astronomical Society 493, 3932. Hasta dónde llega realmente la
             impredecibilidad de los sistemas de tres cuerpos.

             \n\n<strong>Laskar, J. y Gastineau, M. (2009).</strong> «Existence of
             collisional trajectories of Mercury, Mars and Venus with the Earth».
             Nature 459, 817. El tiempo de Lyapunov del propio Sistema Solar, y lo
             que implica para predecirlo.`,
    },
    {
      title: 'Qué has establecido',
      body: `Por orden, y cada punto medido en lugar de afirmado:

             \n\n<strong>La simulación es determinista.</strong> Dos ejecuciones
             desde inicios idénticos fueron idénticas hasta el último decimal.

             \n\n<strong>No toda divergencia es caos.</strong> Un sistema de dos
             cuerpos con el mismo empujón de 1500 km se separó de forma sostenida,
             en proporción al tiempo. El instrumento se negó a darle un tiempo de
             crecimiento, y hizo bien.

             \n\n<strong>El sistema de tres cuerpos divergió exponencialmente.</strong>
             El mismo empujón creció un factor e cada siete segundos simulados
             aproximadamente: un factor de diez millones a lo largo de la ejecución.

             \n\n<strong>Y eso es física, no aritmética.</strong> El ritmo sobrevivió
             a reducir el paso temporal a la mitad y a cambiar de integrador.

             \n\n<strong>Y no va del número tres.</strong> Existen configuraciones
             estables de tres cuerpos, y una de ellas explica que los asteroides
             troyanos de Júpiter sigan ahí.

             \n\nGenera tu informe para conservar los números, la perturbación que
             aplicaste y la gráfica de divergencia.`,
    },
  ],
};
