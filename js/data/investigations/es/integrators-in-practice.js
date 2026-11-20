// Integradores en la práctica - español, paso a paso con ../integrators-in-practice.js.
export default {
  title: 'Integradores en la práctica',
  subtitle:
    'Cuatro maneras de dar un paso, comparadas por la energía que pierde cada una en un sistema real, en Python en la página de cálculo',
  objectives: [
    'Decir qué es la deriva de energía de una integración numérica, y por qué un método que no conserva la energía puede seguir siendo útil',
    'Ejecutar un cuaderno de Python revisado sobre un sistema del Constructor de sistemas orbitales y leer sus cuatro derivas de energía',
    'Predecir y luego medir, con dos tamaños de paso, cuánto mejora un paso menor a un método de segundo orden y a uno de cuarto orden',
    'Comparar la deriva del cuaderno con el motor de Gravitas con el mismo paso, y decir por qué la deriva final de un método simpléctico es un mal número para citar',
  ],
  steps: [
    {
      title: 'Un sistema, cuatro maneras de dar un paso',
      body: `¿Cuánta energía pierde cada manera de dar un paso en un sistema real, y qué recupera un paso menor? Para averiguarlo ejecutarás un cuaderno de Python revisado en la página de cálculo.
             \n\nUn integrador convierte fuerzas en una trayectoria dando pasos pequeños. Gravitas usa por defecto el <strong>Euler simpléctico</strong> y ofrece en los Ajustes el <strong>Verlet de velocidad</strong> y el <strong>Runge-Kutta de cuarto orden</strong>. Un cuarto método, el <strong>Euler explícito</strong> que casi todos escriben primero, no está en la aplicación, y el cuaderno lo añade para que veas por qué.
             \n\nLa medida es la <strong>deriva de energía</strong>: tras la ejecución, 100 &times; (la energía total ahora &minus; la energía total al principio) sobre el tamaño de la energía inicial, en porcentaje. En un sistema cerrado la respuesta exacta es cero, así que cualquier deriva es del método.
             \n\nEl sistema es <strong>Kepler-16</strong>, dos estrellas y un planeta que gira alrededor de ambas, tal como lo construye la plantilla del Constructor de sistemas orbitales. El cuaderno lee el archivo guardado por el Constructor, toma un paso igual al período del par más cercano dividido por un número que tú fijas, y dura tres períodos de la órbita más ancha.
             \n\nAbre la página de cálculo en <strong>/compute/</strong> de este sitio. Solo funciona con conexión y la primera vez descarga unos 19 MB de Python, cuando pulsas el botón; no se instala nada. Elige el cuaderno <strong>Cuatro integradores en un mismo sistema</strong> y deja su entrada de ejemplo, el archivo de Kepler-16, y sus dos ajustes en 3 períodos y 500 pasos. Todavía no pulses Ejecutar.`,
    },
    {
      title: 'Cuál pierde más',
      body: `Antes de ejecutarlo: los cuatro métodos dan el mismo número de pasos, unos diez mil, de la misma longitud.`,
      prompt: '¿Qué método tendrá la mayor deriva de energía al final?',
      options: [
        'El Euler explícito, que no tiene ninguna estructura que proteja la energía',
        'El Euler simpléctico, porque es solo de primer orden',
        'El Verlet de velocidad, porque da el paso en dos mitades',
        'El Runge-Kutta 4, porque hace más aritmética por paso',
      ],
      because:
        'El Euler explícito empuja cada órbita un poco hacia fuera en cada paso, siempre en el mismo sentido, así que el error se suma. Los otros tres son simplécticos, que mantienen el error acotado, o de orden alto, que lo mantienen diminuto.',
    },
    {
      title: 'Ejecútalo: las cuatro derivas',
      body: `Esta es la <strong>ejecución de referencia</strong>: toda elección posterior de esta investigación se compara con ella, así que conserva sus ajustes, 3 períodos y 500 pasos. Pulsa <strong>Iniciar el entorno</strong>, espera, y luego <strong>Ejecutar el cuaderno</strong>. Lee la deriva de cada método y el número de pasos que dio, e introdúcelos aquí. La página muestra las derivas en porcentaje.`,
      fields: [
        { label: 'Euler explícito' },
        { label: 'Euler simpléctico' },
        { label: 'Verlet de velocidad' },
        { label: 'Runge-Kutta 4' },
        { label: 'Pasos dados' },
      ],
    },
    {
      title: 'Por qué uno se mantiene pequeño',
      body: `Abre la tabla o el gráfico del cuaderno. La deriva del Euler simpléctico y la del Verlet de velocidad no crece; oscila arriba y abajo alrededor de cero. La del Euler explícito crece sin parar.`,
      prompt:
        '¿Por qué el error de energía del esquema simpléctico se mantiene acotado?',
      options: [
        'Conserva exactamente una energía ligeramente distinta, así que la energía real solo oscila alrededor de ella',
        'Su paso es menor que el de los otros métodos',
        'Es exacto hasta la cuarta potencia del paso',
        'Casualmente está ajustado a las órbitas de Kepler',
      ],
      misconceptions: [
        {
          say: 'Los cuatro dieron el mismo paso. La diferencia está en el método, no en el paso.',
        },
        {
          say: 'Eso es el Runge-Kutta 4, que no tiene esa estructura: su deriva es diminuta pero crece, muy despacio.',
        },
      ],
      hints: [
        'Una aplicación simpléctica tiene una cantidad conservada propia, cercana a la energía.',
      ],
      because:
        'Un integrador simpléctico es el flujo exacto de un hamiltoniano cercano, así que conserva esa energía cercana para siempre, y la energía verdadera solo se desvía por la pequeña diferencia entre las dos. Por eso es el predeterminado para órbitas que deben avanzar millones de pasos.',
    },
    {
      title: 'Predice la reducción a la mitad',
      body: `Tu próxima ejecución cambia el número de pasos. Antes de elegirlo, piensa en el caso más claro: el paso reducido a la mitad, 1000 pasos por período en lugar de 500, siempre con 3 períodos. El Verlet de velocidad es un método de segundo orden y el Runge-Kutta 4 uno de cuarto orden.`,
      prompt:
        '¿Cuánto menor será la deriva de cada uno de estos dos métodos después de reducir el paso a la mitad?',
      options: [
        'Las dos, la mitad aproximadamente: el paso es la mitad de largo',
        'El Verlet de velocidad unas cuatro veces menor, y el Runge-Kutta 4 menor en un factor mucho mayor, de decenas de veces',
        'El Verlet de velocidad y el Runge-Kutta 4 unas cuatro veces menores',
        'Ninguna cambia: el tamaño de la deriva lo fija el método, no el paso',
      ],
      because:
        'Un método de orden p tiene un error que escala como el paso elevado a p, así que reducir el paso a la mitad divide el error por dos elevado a p: cuatro para un método de segundo orden, y dieciséis para uno de cuarto orden cuando el paso es tan pequeño que solo cuenta el término principal. Con estos pasos el método de cuarto orden gana más que eso.',
    },
    {
      title: 'Elige el segundo paso',
      body: `Elige un segundo número de pasos del menú: <strong>250</strong>, <strong>438</strong>, <strong>750</strong> o <strong>1000</strong> pasos por período. En la página de cálculo pon <strong>pasos</strong> en tu elección, deja los períodos en 3 y ejecuta de nuevo; una ejecución tarda más cuantos más pasos tiene. 1000 es el paso reducido a la mitad que acabas de predecir, y 438 es el paso que da la propia aplicación.
             \n\nIntroduce tu elección, las derivas que dio esa ejecución para el Verlet de velocidad y el Runge-Kutta 4, y para cada método la deriva de la ejecución de referencia de 500 pasos dividida por la deriva de esta ejecución, como cociente positivo. Un cociente mayor que uno significa que el paso menor ayudó; menor que uno, que perjudicó.`,
      fields: [
        { label: 'Pasos por período de tu segunda ejecución' },
        { label: 'Verlet de velocidad, tu segunda ejecución' },
        { label: 'Runge-Kutta 4, tu segunda ejecución' },
        { label: 'Verlet de velocidad: deriva de 500 pasos entre esta deriva' },
        { label: 'Runge-Kutta 4: deriva de 500 pasos entre esta deriva' },
      ],
    },
    {
      title: 'Frente a la aplicación',
      compare:
        'Estas son las mejoras para el número de pasos que elegiste. La predicción era sobre 1000; para el Verlet de velocidad la mejora es el cuadrado del cociente de los números de pasos, cualquiera que hayas elegido, y eso es el orden del método mostrándose.',
      body: `Los tres esquemas del cuaderno son los tres de la aplicación, así que el propio motor de Gravitas puede compararse con ellos. El motor da su propio paso de 0,0278 unidades de tiempo, que es el período del par más cercano dividido por unos <strong>438</strong>. Pon <strong>pasos</strong> en 438, deja los períodos en 3 y ejecuta de nuevo; si elegiste 438 en el paso anterior, ya tienes esta ejecución. Introduce las derivas del Verlet de velocidad, del Runge-Kutta 4 y del Euler simpléctico.`,
      fields: [
        { label: 'Verlet de velocidad, 438 pasos' },
        { label: 'Runge-Kutta 4, 438 pasos' },
        { label: 'Euler simpléctico, 438 pasos' },
      ],
    },
    {
      title: 'Un número que no es una propiedad',
      body: `El motor dio &minus;0,0022 % para el Euler simpléctico con un paso parecido. El cuaderno dio &minus;0,00016 % con 438 pasos y &minus;0,0023 % con 500. Los tres son correctos.`,
      prompt:
        '¿Qué dice esto sobre citar la deriva de un método simpléctico tras una sola ejecución?',
      options: [
        'Oscila, así que el valor final depende de en qué punto de la oscilación terminó la ejecución: conviene citar su mayor oscilación',
        'El cuaderno se equivoca con 438 pasos',
        'El motor y el cuaderno usan aritmética distinta',
        'El Euler simpléctico no tiene ninguna deriva',
      ],
      misconceptions: [
        {
          say: 'Cada uno es un valor correcto de la deriva en ese momento. La deriva es una curva, y estos son tres puntos de ella.',
        },
        {
          say: 'Tiene una deriva, pero acotada: oscila entre límites en lugar de crecer.',
        },
      ],
      hints: [
        'Mira la tabla del cuaderno: la columna del Euler simpléctico sube y baja.',
      ],
      because:
        'La deriva de un método simpléctico es una oscilación acotada. Una lectura única al final de la ejecución la sorprende en cualquier punto de la oscilación, incluso cerca de cero, así que el número honesto es el mayor valor de toda la ejecución, que está en la tabla del cuaderno, y no el último.',
    },
    {
      title: 'Qué número creer con seis órbitas',
      body: `Ejecuta el cuaderno una vez más con <strong>períodos</strong> en <strong>6</strong> y <strong>pasos</strong> de nuevo en <strong>500</strong>. Pon la deriva de cada método ahora junto a su deriva en la ejecución de referencia, que tenía 3 períodos y los mismos pasos.`,
      prompt:
        '¿La deriva con seis órbitas de qué método seguirías creyendo como tamaño de su error?',
      options: [
        'La del Runge-Kutta 4: es diminuta y sube de forma constante con la duración de la ejecución, así que su valor final es una buena medida de su error',
        'La del Verlet de velocidad: es menor que con tres órbitas, y cuanto menor la deriva, más exacto el método',
        'La del Euler simpléctico: su error está acotado, así que su valor al final de cualquier ejecución lo representa',
        'La del Euler explícito: es la única que claramente sigue creciendo, así que su número muestra la tendencia real',
      ],
      misconceptions: [
        {
          say: 'Su deriva sí bajó, de 0,001768 % con tres órbitas a 0,0001587 % con seis, pero una ejecución más larga no puede hacer más exacto a un método. El Verlet de velocidad es simpléctico: su deriva oscila, y esta ejecución terminó cerca del fondo de una oscilación. Un número menor en un momento no es un método más exacto.',
        },
        {
          say: 'Acotado no es pequeño ni constante. La deriva del Euler simpléctico pasó de −0,002317 % con tres órbitas a +0,08515 % con seis, y cambió de signo, porque su error oscila. El final de una ejecución es un punto de la oscilación; su mayor oscilación es el número que conviene citar.',
        },
        {
          say: 'La deriva del Euler explícito sí crece con claridad, hasta cerca del 60 % de la energía inicial, pero con ese tamaño la órbita ya es otra: su número dice que el método ha fallado, no cuán grande es su error.',
        },
      ],
      hints: [
        'Para cada método pon la deriva de tres órbitas y la de seis una junto a otra, y pregunta qué tipo de cambio muestra cada una: crecer, oscilar o bajar.',
      ],
      because:
        'La deriva del Runge-Kutta 4 es diminuta y crece de forma suave con la duración de la ejecución, unos 6,473×10⁻⁸ % con tres órbitas y 1,046×10⁻⁷ % con seis, así que su valor final es una buena medida de su error con esa duración. Los dos métodos simplécticos mantienen su error acotado, pero sus valores finales son fases de una oscilación: al duplicar la ejecución la del Verlet bajó once veces y la del Euler simpléctico subió treinta y siete, así que para ellos el número honesto es la mayor oscilación de la tabla del cuaderno.',
    },
    {
      title: 'Lo que calculaste',
      body: `Cuatro integradores, un sistema, los mismos diez mil pasos. El Euler explícito ganó energía igual a la mitad del tamaño de la inicial; el Euler simpléctico y el Verlet de velocidad la mantuvieron en unas milésimas de porcentaje y la dejaron oscilar en lugar de crecer; el Runge-Kutta 4 la mantuvo cien mil veces mejor. Cambiar el paso movió la deriva del Verlet de velocidad según el cuadrado del cociente de los números de pasos, cualquiera que fuera el que elegiste, y la del Runge-Kutta 4 más que según la cuarta potencia; con el paso propio de la aplicación el cuaderno y el motor dieron los mismos números para los dos métodos cuya deriva final sí es una propiedad. Duplicar la ejecución a seis órbitas mostró qué números son tamaños y cuáles son fases.
             \n\nLo que la deriva no cubre: es un sistema, unas pocas duraciones y ningún encuentro cercano. El cuaderno no tiene suavizado, ni fusiones, ni relatividad, que la aplicación puede activar. Una deriva de energía pequeña no es una órbita exacta: un método puede conservar la energía y aun así poner un cuerpo en el lugar equivocado de su órbita. Y la deriva de un método que oscila no es un solo número, termine donde termine una ejecución. La ejecución es tuya: su cápsula registra el hash del cuaderno y el de la entrada, así que un informe puede citarla.`,
    },
  ],
};
