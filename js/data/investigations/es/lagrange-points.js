// =============================================================================
// lagrange-points - es
// -----------------------------------------------------------------------------
// A shadow of ../lagrange-points.js carrying only its words. Laid over the
// English lesson by mergeTranslation() in ../i18n.js, so anything absent here
// keeps its English and nothing here can reach the lesson's machinery: no
// scenario name, no seed, no numeric answer, no unit token.
//
// Arrays line up by index with the English. `null` means "not translated";
// that entry keeps its English.
// =============================================================================

export default {
  title: '¿Hasta dónde puede llegar?',
  subtitle:
    'Regiones prohibidas, cinco puntos de equilibrio y un número conservado',
  duration: '25-30 min',
  level: 'Astronomía introductoria',
  summary:
    'Dos estrellas en órbita circular y una mota de polvo que siente a las dos. Hay un número que puedes calcular sobre la mota y que te dice dónde tiene prohibido estar, y a medida que la aceleras se abren muros de uno en uno, en un orden fijo. Encuentra los cinco lugares donde la mota podría quedarse quieta, averigua a cuáles puede llegar y descubre después por qué «puede llegar» son tres preguntas distintas con el mismo abrigo.',
  objectives: [
    'Enunciar la normalización y el convenio de signo de la constante de Jacobi',
    'Predecir cómo cambia la región prohibida cuando el trazador acelera',
    'Localizar los cinco puntos de Lagrange y decir cuáles son estables',
    'Distinguir accesible energéticamente de alcanzable de verdad y de estable',
    'Identificar los valores críticos a los que se abren los cuellos de L1 y L2',
    'Decir de qué supuestos depende todo el cuadro y cuál se rompe primero',
  ],
  steps: [
    {
      title: 'Dos estrellas y una mota',
      body: `Dos estrellas se orbitan mutuamente en un círculo: una como el Sol y
             otra de una treintava parte de su masa, separadas ocho unidades
             astronómicas. El puntito rojo es un trazador: un grano de polvo, una
             nave, un asteroide. Es tan ligero que ninguna de las dos lo nota.
             \n\nEsa disposición tiene nombre: el <strong>problema restringido
             circular de los tres cuerpos</strong>. Restringido porque el tercer
             cuerpo no tira de vuelta; circular porque los otros dos van en
             círculo. Es el sistema más simple en el que dejan de valer las
             respuestas de dos cuerpos, y casi todo lo interesante que tiene lo
             resolvieron Euler, Lagrange y Jacobi antes de 1840.`,
      tip: 'El panel de tres cuerpos restringido se abrió con el escenario. Todo lo que esta lección te pide leer está ahí.',
    },
    {
      title: 'Viaja con ellas',
      body: `Mirando desde fuera, las dos estrellas giran y nada se queda quieto.
             Así que congelamos el cuadro: trabajamos en un sistema de referencia
             que <strong>gira con el par</strong>, en el que las dos estrellas
             están fijas y el trazador se mueve sobre un fondo inmóvil.
             \n\nTodo lo que sigue se mide en ese sistema, en unidades donde las
             dos estrellas están a distancia uno, su masa total es uno y la
             unidad de tiempo hace que la órbita dure 2π. La estrella pesada está
             en <strong>−μ</strong> y la ligera en <strong>1−μ</strong>, donde μ
             es la fracción de masa de la pequeña. En este sistema μ = 0,0291.
             \n\nEsas elecciones no son decorativas. Todos los números del panel
             están en estas unidades, y un valor sacado de un libro solo coincidirá
             si estaba escrito en las mismas.`,
    },
    {
      title: '¿Hay algún sitio vedado?',
      body: `El trazador tiene cierta energía. Algunos lugares exigirían más
             energía de la que tiene, no porque haya algo en medio, sino porque
             llegaría a una velocidad imaginaria, que es otra forma de decir que
             no puede llegar.
             \n\nComprométete antes de mirar el sombreado.`,
      prompt: 'Si el trazador acelera, la región que le está prohibida…',
      options: [
        'crecerá, porque tiene más camino que recorrer',
        'encogerá, porque más energía significa más sitios a los que puede llegar',
        'seguirá igual, porque la región prohibida es una propiedad de las estrellas',
        'encogerá cerca de las estrellas y crecerá lejos',
      ],
      because:
        'Más energía cinética significa que se puede permitir más del paisaje potencial, así que la región prohibida encoge. La trampa es de contabilidad y no de física: el número con el que esto se mide por convenio, la constante de Jacobi, se hace MENOR cuando el trazador va más rápido. Así que la región prohibida encoge cuando la constante baja, lo que suena al revés hasta que lo has dicho en voz alta unas cuantas veces.',
    },
    {
      title: 'Un número que no cambia',
      body: `En el sistema giratorio hay una cantidad que se mantiene fija a lo
             largo de cualquier trayectoria, por complicada que sea:
             \n\n<strong>C = 2Ω − v²</strong>
             \n\nΩ es el potencial efectivo —la gravedad de las dos estrellas más
             el término centrífugo de la rotación— y v es la velocidad del
             trazador en el sistema giratorio. C es la <strong>constante de
             Jacobi</strong>, y no es la energía: es una combinación que resulta
             conservarse cuando la energía ordinaria no lo hace.
             \n\nFíjate bien en el signo. <strong>Trazador más rápido, C más
             pequeña.</strong> En cualquier otro sitio de esta aplicación un
             número mayor significa más energía; aquí es al revés, y es lo que
             más se entiende al contrario.`,
      tip: 'El panel imprime el convenio debajo de la lectura, incluido el hecho de que algunos libros añaden una constante que desplaza toda C en μ(1−μ)/2.',
    },
    {
      title: 'Léela',
      body: `Lee la constante de Jacobi en el panel, luego usa el control de
             velocidad para dejar correr la simulación un rato y léela otra vez.`,
      fields: [{ label: 'C al principio' }, { label: 'C después de un rato' }],
      tip: 'Deberían coincidir en cuatro o cinco cifras. Cualquier diferencia es del integrador, no de la física.',
    },
    {
      title: 'Por qué un solo número vale tanto',
      body: `La trayectoria del trazador en este sistema no tiene solución
             cerrada: el problema de los tres cuerpos es célebre por eso. Pero C
             no cambia.`,
      prompt: 'Conocer C sin conocer la trayectoria te permite…',
      options: [
        'predecir exactamente dónde estará el trazador en cualquier instante futuro',
        'descartar regiones en las que el trazador no puede entrar nunca, sin resolver nada',
        'calcular cuánto tardará el trazador en llegar a un punto dado',
        'determinar si la órbita del trazador es estable',
      ],
      because:
        'Esto es lo que hace que valga la pena tener la constante de Jacobi. No puedes resolver el movimiento, pero puedes dibujar un muro: en cualquier punto donde 2Ω sea menor que C haría falta que v² fuera negativa, así que el trazador no puede estar nunca ahí. Una cantidad conservada te compra una frontera aunque no te compre una solución.',
    },
    {
      title: 'Cinco sitios donde quedarse quieto',
      body: `En el sistema giratorio hay exactamente cinco puntos donde un
             trazador colocado en reposo se quedaría en reposo: la gravedad de
             las dos estrellas y el efecto centrífugo se cancelan exactamente.
             Están marcados en pantalla.
             \n\n<strong>L1</strong> está entre las estrellas,
             <strong>L2</strong> justo más allá de la pequeña y
             <strong>L3</strong> al otro lado de la grande. Esos tres están en la
             recta que une las estrellas y los encontró Euler. <strong>L4</strong>
             y <strong>L5</strong> están en los vértices de triángulos equiláteros
             con las dos estrellas: el hallazgo de Lagrange, y el sorprendente,
             porque no hay ninguna razón evidente para que haya un punto de
             equilibrio sesenta grados a un lado.`,
      tip: 'Júpiter tiene unos 12.000 asteroides conocidos en sus L4 y L5 con el Sol. Se llaman los troyanos.',
    },
    {
      title: '¿A qué distancia está L4 de cada estrella?',
      body: `L4 forma un triángulo equilátero con las dos estrellas. Las estrellas
             están a distancia uno en estas coordenadas.`,
      prompt:
        'La distancia de L4 a cualquiera de las estrellas, en unidades de la separación',
      hints: [
        'Equilátero significa que los tres lados miden lo mismo.',
        'El lado que une las dos estrellas mide 1.',
      ],
      worked:
        'Los tres lados de un triángulo equilátero son iguales, y el lado entre las estrellas mide 1 por definición de las unidades, así que L4 está a 1 de cada una. No está en la recta que las une, y no está en el punto medio.',
    },
    {
      title: 'Los muros se abren en un orden fijo',
      body: `Cada uno de los cinco puntos tiene su propia constante de Jacobi: el
             valor que tendría un trazador sentado allí. Léelos en el panel:
             \n\n<strong>C₁ = 3,313; C₂ = 3,274; C₃ = 3,029; C₄ = C₅ =
             2,971</strong>
             \n\nEstán en orden decreciente, y ese orden es el argumento de toda
             la materia. Empieza con un trazador muy lento —C grande— y estará
             amurallado en la región donde empezó. Acelera y C baja, y al pasar
             cada uno de esos valores se abre un muro: primero el cuello de L1
             entre las dos estrellas, luego L2 hacia el mundo exterior, luego L3,
             y al final no hay nada prohibido en ninguna parte.`,
    },
    {
      title: 'Abre el cuello',
      body: `El trazador empieza casi en reposo en el sistema giratorio, así que
             su C es alta y está sellado en la región de la estrella grande: el
             panel lo dice.
             \n\nSelecciona el trazador y usa el planificador de maniobras (el
             botón ▲ del inspector) para darle un empuje transversal. Mira cómo
             baja C en el panel de tres cuerpos y cómo se retira la zona
             sombreada. Sigue hasta que el panel indique que el cuello de L1 está
             abierto.`,
      checklist: [
        'Anota la constante de Jacobi antes de ningún impulso',
        'Aplica un impulso y mira cómo baja C y encoge el sombreado',
        'Sigue hasta que el panel diga que el cuello de L1 está abierto',
        'Fíjate en que el cuello se abrió con una C concreta, y en que llegaste ahí a tu manera',
      ],
      tip: 'El panel te dice cuánto más tiene que bajar C para que se abra la siguiente puerta.',
    },
    {
      title: 'El cuello está abierto. ¿Y ahora?',
      body: `El muro entre las dos estrellas ha desaparecido. Al trazador se le
             permite energéticamente estar en cualquier punto de la región de la
             otra estrella.
             \n\nEn la pantalla siguiente lanzarás el mismo trazador desde el
             mismo sitio a la misma rapidez, dos veces, en dos direcciones
             distintas. Los dos tendrán exactamente la misma constante de
             Jacobi, asi que a los dos se les permitirá estar exactamente en los
             mismos sitios.`,
      prompt: 'Con el cuello de L1 abierto, el trazador…',
      options: [
        'cruzará a la región de la otra estrella, ya que nada se lo impide',
        'cruzará tarde o temprano, aunque le lleve muchas órbitas',
        'puede que no cruce nunca: un cuello abierto solo dice que no está prohibido',
        'se quedará en L1, ya que es el punto de equilibrio',
      ],
      because:
        'Esta es la distinción para cuya mala lectura existe todo el diagrama. Un cuello abierto es un hueco en un muro, no una ruta a través de él. La curva de velocidad cero dice dónde no puede estar el trazador; no dice absolutamente nada sobre adónde va. Un trazador puede orbitar para siempre a un lado de una abertura que nunca usa, y la única forma de averiguarlo es integrar la trayectoria y mirar.',
    },
    {
      title: '¿Mismo permiso, misma ruta?',
      body: `Dos trazadores, desde el mismo punto, a la misma rapidez en el
             sistema rotante, lanzados en dos direcciones distintas. Sus
             constantes de Jacobi son idénticas -C depende de dónde estás y a
             qué rapidez vas, y ninguna de las dos cosas difiere-, asi que la
             región prohibida sombreada es la misma imagen para los dos, con el
             mismo cuello abierto dentro.`,
      prompt: 'Dos inicios con la misma región accesible…',
      options: [
        'seguirán el mismo camino, ya que los dos disponen de la misma región',
        'seguirán caminos distintos, pero los dos usarán el cuello antes o después',
        'seguirán caminos distintos, y no hay garantía de que ninguno use el cuello',
        'seguirán caminos distintos solo si sus rapideces difieren',
      ],
      because: `Caminos distintos, y sin garantía sobre el cuello. La región
                prohibida es una afirmación sobre dónde <em>no puede</em> estar
                el trazador, y dos estados con la misma C tienen la misma, pero
                la trayectoria la decide la dirección de marcha, que el diagrama
                no contiene. Comprométete antes de ejecutarlo: la pantalla
                siguiente son las dos ejecuciones, y una de ellas se comporta de
                forma muy distinta de la otra.`,
      tip: 'Lo que hayas predicho se guarda, acertado o no. Lo que te pide la pantalla siguiente es leer lo que pasó de verdad y decir si apoya tu respuesta.',
    },
    {
      title: 'Mira cómo uno cruza y el otro no',
      body: `En el panel de tres cuerpos, abre <strong>Dos direcciones, una
             misma región accesible</strong> y pulsa <strong>Ejecutar las dos
             direcciones</strong>. Tarda alrededor de un minuto.

             \n\nDevuelve el trazador a un inicio declarado -0,6 separaciones
             hacia fuera, en reposo en el sistema rotante- y luego le da la misma
             rapidez dos veces, a <strong>30°</strong> y a <strong>130°</strong>.
             Todo lo demás se mantiene fijo: las estrellas, sus masas, su órbita
             circular, el integrador, el paso y dos periodos binarios de
             observación cada uno.

             \n\nLee la tabla desde arriba. Las cinco primeras filas son el
             control: mismo sitio, misma rapidez, misma constante de Jacobi hasta
             el último dígito, mismo cuello abierto, mismo paso medido. Las filas
             siguientes son lo que pasó, y no coinciden.`,
      checklist: [
        'Comprueba la fila de la constante de Jacobi: los dos números deberían ser idénticos',
        'Comprueba la fila del cuello de L1: abierto para los dos',
        'Lee si cada dirección cruzó, y cuándo',
        'Lee lo cerca que llegó de L1 la que no cruzó',
        'Di si eso apoya lo que predijiste en la pantalla anterior',
      ],
      rubric: `Los dos brazos deberían informar de la misma constante de Jacobi
               -3,28426, en todos los dígitos que se muestran- y de un cuello de
               L1 abierto con L2 todavía cerrado. La dirección A cruza el cuello
               a la décima parte de un periodo y vuelve; la dirección B nunca se
               acerca a L1 más de 0,17 de la separación en dos periodos
               completos, y su x nunca pasa de donde empezó. Puntuación completa
               por leer primero las filas de control y solo después el
               resultado, y por enunciar la conclusión en la forma que la
               evidencia admite: misma región accesible, caminos distintos. Un
               estudiante que escriba «B nunca puede cruzar» se ha excedido
               exactamente en la distancia de la que trata esta actividad: la
               ventana son dos periodos, y la advertencia bajo la tabla lo dice.`,
      tip: 'Todo se dibuja y se cita en el sistema rotante, el mismo en el que se dibuja la región sombreada, asi que los caminos y los muros están en las mismas coordenadas.',
    },
    {
      title: 'Una tercera pregunta',
      body: `Hasta ahora ha habido dos preguntas que suenan igual: <em>¿se le
             permite estar ahí?</em> y <em>¿irá ahí?</em>. Aquí va una tercera:
             <em>si estuviera ahí, ¿se quedaría?</em>
             \n\nEso es la <strong>estabilidad</strong>, y nada en una curva de
             velocidad cero implica nada al respecto. Los cinco puntos de Lagrange
             son equilibrios: un trazador en reposo en cualquiera de ellos se
             queda. La pregunta es qué pasa cuando se le da un empujoncito.`,
    },
    {
      title: '¿Cuáles sobreviven a un empujón?',
      body: `L1, L2 y L3 están en la recta entre las estrellas, en lo que son de
             hecho puntos de silla del potencial efectivo. L4 y L5 están, por
             raro que parezca, en máximos de dicho potencial.`,
      prompt: 'Tras un pequeño empujón, un trazador se quedaría en…',
      options: [
        'los cinco, ya que todos son equilibrios',
        'los tres puntos colineales, porque están entre las masas',
        'solo L4 y L5, y solo cuando la razón de masas es lo bastante pequeña',
        'ninguno: aquí todos los equilibrios son inestables',
      ],
      because:
        'Los tres puntos colineales son sillas: da un empujón al trazador y se va, con cualquier razón de masas. L4 y L5 son el caso contraintuitivo. Están en máximos del potencial efectivo, que suena al peor sitio para hacer equilibrio, y la fuerza de Coriolis del sistema giratorio hace volver al trazador que se marcha, metiéndolo en una pequeña órbita alrededor del punto. Eso solo funciona cuando la razón de masas está por debajo del valor de Routh, 0,03852, que este sistema, con 0,0291, cumple por poco.',
    },
    {
      title: 'Y por eso existen los troyanos',
      body: `Del Sol a Júpiter la razón de masas es 0,000955, muy por debajo del
             valor de Routh, así que los L4 y L5 de Júpiter son estables y llevan
             cuatro mil millones de años recogiendo asteroides. Lo mismo vale para
             Neptuno, Marte y la Tierra, que tiene al menos dos.
             \n\nEn cambio en L1 y L2 no se acumula nada. Aun así se ponen naves
             allí, porque un punto de silla es barato para mantenerse cerca aunque
             nada se quede solo: el JWST, en el L2 Sol–Tierra, gasta unos pocos
             metros por segundo al año en mantenimiento de posición. Si lo dejaran
             en paz se iría a la deriva en unos meses.`,
      tip: 'Este sistema tiene μ = 0,0291, cerca del 0,0385 de Routh. Sube la masa de la estrella pequeña por encima de una treintava parte de la grande y L4 y L5 dejan de ser estables; el panel te dice de qué lado de la raya estás.',
    },
    {
      title: 'Rómpelo a propósito',
      body: `Todo lo que has leído depende de supuestos que el panel comprueba
             cada vez que se reconstruye el mundo: exactamente dos cuerpos
             masivos, en órbita circular, y un tercero lo bastante ligero como
             para ignorarlo.
             \n\nAñade una tercera estrella desde el menú de objetos, o haz pesado
             al trazador. La superposición se apaga sola y te dice qué supuesto ha
             fallado.`,
      checklist: [
        'Añade un tercer cuerpo masivo y lee lo que dice el panel',
        'Quítalo y mira cómo vuelve la superposición',
      ],
      tip: 'Esto no es una limitación por la que haya que pedir disculpas. Un diagrama de un sistema que no está en pantalla sería peor que ningún diagrama.',
    },
    {
      title: '¿Cuál se rompe primero?',
      body: `Supón que dieras a las dos estrellas una órbita ligeramente excéntrica
             en lugar de circular.`,
      prompt: 'La constante de Jacobi entonces…',
      options: [
        'seguiría conservándose, ya que no depende de la forma de la órbita',
        'dejaría de conservarse, porque el sistema de referencia ya no gira uniformemente',
        'se conservaría, pero los puntos de Lagrange se moverían',
        'se volvería negativa',
      ],
      because:
        'Toda la construcción se apoya en que el sistema gire a ritmo constante, lo que exige que los dos cuerpos estén a separación constante. Haz la órbita excéntrica y el sistema acelera y frena, el potencial efectivo respira y C deja de conservarse. Hay versiones elípticas de este problema y son bastante más difíciles, y por eso el panel se niega en lugar de aproximar.',
    },
    {
      title: 'Tres afirmaciones, bien separadas',
      body: `Lo que merece la pena llevarse es que son tres afirmaciones distintas
             y el diagrama solo hace la primera:
             \n\n<strong>Accesible energéticamente.</strong> La constante de Jacobi
             no prohíbe al trazador estar ahí. Eso es lo que significa el
             sombreado, y todo lo que significa.
             \n\n<strong>Que vaya a ir realmente.</strong> Una pregunta sobre la
             trayectoria. Solo integrar la responde. Un cuello abierto es un hueco
             en un muro.
             \n\n<strong>Estable.</strong> Una pregunta sobre qué pasa tras un
             empujón. Aquí es cierto de L4 y L5, por debajo de la razón de Routh, y
             de nada más, y ninguna curva de velocidad cero lo implica.
             \n\nLas misiones se planifican con las tres. Una transferencia por el
             cuello de L1 del sistema Tierra–Luna necesita que la primera sea
             posible, que la segunda esté diseñada y que la tercera se pague con
             combustible de mantenimiento durante todo el tiempo que se espera que
             dure la nave.`,
    },
  ],
};
