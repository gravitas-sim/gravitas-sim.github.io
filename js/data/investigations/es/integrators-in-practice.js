// Integradores en la práctica - español, paso a paso con ../integrators-in-practice.js.
export default {
  title: 'Integradores en la práctica',
  subtitle:
    'Cuatro maneras de dar un paso, comparadas por la energía que pierde cada una en un sistema real, en Python en la página de cálculo',
  objectives: [
    'Decir qué es la deriva de energía de una integración numérica, y por qué un método que no conserva la energía puede seguir siendo útil',
    'Ejecutar un cuaderno de Python revisado sobre un sistema del Constructor de sistemas orbitales y leer sus cuatro derivas de energía',
    'Mostrar con dos tamaños de paso que un método de segundo orden mejora unas cuatro veces al reducir el paso a la mitad, y uno de cuarto orden mucho más',
    'Comparar la deriva del cuaderno con el motor de Gravitas con el mismo paso, y decir por qué la deriva final de un método simpléctico es un mal número para citar',
  ],
  steps: [
    {
      title: 'Un sistema, cuatro maneras de dar un paso',
      body: `Un integrador convierte fuerzas en una trayectoria dando pasos pequeños. Gravitas usa por defecto el <strong>Euler simpléctico</strong> y ofrece en los Ajustes el <strong>Verlet de velocidad</strong> y el <strong>Runge-Kutta de cuarto orden</strong>. Un cuarto método, el <strong>Euler explícito</strong> que casi todos escriben primero, no está en la aplicación, y el cuaderno lo añade para que veas por qué.
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
      body: `Pulsa <strong>Iniciar el entorno</strong>, espera, y luego <strong>Ejecutar el cuaderno</strong>. Lee los cinco números que devuelve e introdúcelos aquí. La página los muestra en porcentaje; el último es cuántos pasos dio cada método.`,
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
      title: 'Reduce el paso a la mitad',
      body: `En la página de cálculo pon <strong>pasos</strong> en <strong>1000</strong>, deja los períodos en 3 y ejecuta de nuevo; tarda aproximadamente el doble. Introduce ahora las derivas del Verlet de velocidad y del Runge-Kutta 4, y cuántas veces menor es cada una que antes (el número anterior dividido por el nuevo, como cociente positivo).`,
      fields: [
        { label: 'Verlet de velocidad, 1000 pasos' },
        { label: 'Runge-Kutta 4, 1000 pasos' },
        { label: 'Verlet: mejora' },
        { label: 'Runge-Kutta 4: mejora' },
      ],
    },
    {
      title: 'Frente a la aplicación',
      body: `Los tres esquemas del cuaderno son los tres de la aplicación. El motor de Gravitas, con este sistema y su propio paso de 0,0278 unidades de tiempo, dio <strong>+0,002299 %</strong> para el Verlet de velocidad y <strong>&minus;1,217&times;10<sup>&minus;7</sup> %</strong> para el Runge-Kutta 4 en los mismos tres períodos. Ese paso es el período del par más cercano dividido por unos <strong>438</strong>. Pon <strong>pasos</strong> en 438 y ejecuta de nuevo.`,
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
      title: 'Lo que calculaste',
      body: `Cuatro integradores, un sistema, los mismos diez mil pasos. El Euler explícito ganó energía igual a la mitad del tamaño de la inicial; el Euler simpléctico y el Verlet de velocidad la mantuvieron en unas milésimas de porcentaje y la dejaron oscilar en lugar de crecer; el Runge-Kutta 4 la mantuvo cien mil veces mejor. Reducir el paso a la mitad compró cuatro veces para un método de segundo orden y más para uno de cuarto orden, y con el paso propio de la aplicación el cuaderno y el motor dieron los mismos números para los dos métodos cuya deriva final sí es una propiedad.
             \n\nLo que los números no dicen: es un sistema, una duración y ningún encuentro cercano. El cuaderno no tiene suavizado, ni fusiones, ni relatividad, que la aplicación puede activar. Y una deriva de energía pequeña no es una órbita exacta: un método puede conservar la energía y aun así poner un cuerpo en el lugar equivocado de su órbita. La ejecución es tuya: su cápsula registra el hash del cuaderno y el de la entrada, así que un informe puede citarla.`,
    },
  ],
};
