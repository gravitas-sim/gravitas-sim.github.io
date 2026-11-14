export const TWO_CLUSTERS_TWO_AGES_ES = {
  title: 'Dos cúmulos, dos edades',
  subtitle:
    'Ajusta una edad y una distancia a dos cúmulos de estrellas, mira cuánto se mueve cada una al cambiar la metalicidad que supones y aprende por qué la diferencia de dos edades es más estable que cada una',
  objectives: [
    'Decir cuál de dos cúmulos es más viejo por dónde sus estrellas dejan la secuencia principal',
    'Leer la edad y la distancia que da un ajuste de isocronas, con el intervalo que declara',
    'Decir que el intervalo depende de la metalicidad y el enrojecimiento supuestos, y que cambiar la metalicidad mueve la edad muchas veces su ancho',
    'Decir por qué la diferencia entre las edades de dos cúmulos, ajustados igual, es más estable que cada edad',
  ],
  steps: {
    'two-clusters': {
      title: 'Dos cúmulos',
      body: 'Un cúmulo estelar es de unos cientos a un millón de estrellas nacidas juntas, así que tienen una sola edad y están a una sola distancia. El panel muestra dos cúmulos, <strong>A</strong> y <strong>B</strong>, como los <strong>diagramas color–magnitud</strong> de sus estrellas: cada punto es una estrella, más roja a la derecha, más brillante arriba. Las estrellas están sobre una curva, la <strong>secuencia principal</strong>, que termina donde las estrellas de una masa han gastado el hidrógeno de su núcleo: el <strong>punto de giro</strong>. Cuanto más viejo el cúmulo, más débil y más rojo el punto de giro, porque solo quedan en la secuencia principal las estrellas de menor masa.\n\nLos cúmulos son <strong>sintéticos</strong>: los hizo un modelo de estrellas de una edad conocida, así que la respuesta se puede comprobar. El panel ajusta una <strong>isocrona</strong> (la curva de las estrellas de una edad) a las estrellas y da la edad y la distancia. Nunca ajusta la metalicidad: la indicas tú, y el panel lo dice.',
    },
    'which-is-older': {
      title: '¿Cuál cúmulo es más viejo?',
      body: 'Mira el punto de giro del cúmulo A en el panel (donde las estrellas se separan de la secuencia principal recta hacia las gigantes rojas), y luego elige el cúmulo B en el panel y compara.',
      prompt: 'El cúmulo más viejo es aquel cuyo punto de giro es&hellip;',
      options: [
        'Más débil y más rojo, porque solo sus estrellas de menor masa siguen en la secuencia principal',
        'Más brillante y más azul, porque las estrellas viejas son más calientes',
        'El mismo: el punto de giro no depende de la edad',
        'No medible en un diagrama, solo en un espectro',
      ],
      hints: [
        'Las estrellas masivas son brillantes y azules, y gastan antes su hidrógeno. ¿Qué estrellas quedan en la secuencia principal de un cúmulo viejo?',
      ],
      because:
        'Una estrella deja la secuencia principal cuando se acaba el hidrógeno de su núcleo, y una estrella masiva lo hace antes. En un cúmulo viejo las estrellas masivas, brillantes y azules ya se han ido; el punto de giro está en una masa menor, así que es más débil y más rojo. Por eso un diagrama color–magnitud lee una edad.',
    },
    'fit-a': {
      title: 'Ajusta el cúmulo A',
      body: 'Con el cúmulo A elegido y la metalicidad supuesta en −0,25 (los valores con que se abre el panel), lee la <strong>edad</strong> ajustada en gigaaños y el <strong>módulo de distancia</strong> en magnitudes. La curva naranja es la mejor isocrona; el intervalo es de un sigma.',
      fields: [
        { label: 'Edad del cúmulo A' },
        { label: 'Módulo de distancia' },
      ],
    },
    'fit-b': {
      title: 'Ajusta el cúmulo B',
      body: 'Elige el cúmulo B en el panel, con la misma metalicidad, y lee su edad y su módulo de distancia.',
      fields: [
        { label: 'Edad del cúmulo B' },
        { label: 'Módulo de distancia' },
      ],
    },
    'how-much-older': {
      title: '¿Cuánto más viejo?',
      body: 'Las dos edades salieron del mismo ajuste con los mismos supuestos. Réstalas.',
      fields: [{ label: 'Edad de B menos edad de A' }],
    },
    'what-the-interval-says': {
      title: 'Lo que dice el intervalo',
      body: 'El panel da cada edad con un intervalo de un sigma, de unos ±0,03 Gyr para A. Activa <em>Mostrar la verdad</em> para A: la edad con que se generó es 2,00 Gyr, y el intervalo va de 2,00 a 2,05.',
      prompt: '¿Qué afirma ese intervalo?',
      options: [
        'Cuánto se dispersaría la edad ajustada si se generara otra vez un cúmulo del mismo tipo y se ajustara igual, con todos los supuestos ciertos; unos dos de cada tres intervalos así contienen la edad verdadera',
        'Que la edad del cúmulo está seguro dentro de él',
        'Que la metalicidad se conoce con esa precisión',
        'Que los modelos de isocronas son exactos',
      ],
      misconceptions: [
        {
          say: 'Un intervalo de un sigma contiene la verdad unas dos de cada tres veces (0,67 y 0,60 para la edad y la distancia en cien cúmulos generados), y aquí por poco la pierde: 2,00 frente a 2,00 a 2,05. Eso es lo que significa un sigma.',
        },
        {
          say: 'La metalicidad no está en el intervalo: se fijó, no se ajustó. Los pasos siguientes la cambian.',
        },
      ],
      hints: [
        'El panel puede generar otra vez el mismo cúmulo y ajustarlo: lo hizo cien veces para comprobar este intervalo.',
      ],
      because:
        'El intervalo sale de cómo sube el estadístico del ajuste cuando la edad se aleja de su mejor valor, con todo lo demás fijo y verdadero. En cien cúmulos sintéticos con todos los supuestos ciertos contuvo la edad verdadera el 67 por ciento de las veces y la distancia verdadera el 60 por ciento, dentro de la banda fijada antes de la comprobación (56 a 80 por ciento). No dice nada de supuestos que sean falsos.',
    },
    'what-a-fit-gives': {
      title: 'Lo que da un ajuste',
      body: 'La edad y la distancia de un cúmulo, en este panel, son los mejores valores de dos números dado todo lo demás que supusiste: la <strong>metalicidad</strong>, el enrojecimiento por polvo, que las estrellas son simples y que el modelo de los errores de su brillo es correcto. El intervalo dice cuán bien fijan las estrellas los dos números <em>con esos supuestos</em>. Una edad merece citarse con ellos.',
    },
  },
};

export const TWO_CLUSTERS_TWO_AGES_DEEPER_ES = {
  steps: {
    'change-the-metallicity': {
      title: 'Cambia la metalicidad',
      body: 'Los metales cambian cómo arde una estrella y cómo se ve su color, así que las isocronas de distintas metalicidades difieren. Elige el cúmulo A y pon la metalicidad supuesta en <strong>−0,50</strong>, lee la edad, y luego en <strong>0</strong> (la del Sol) y léela otra vez.',
      fields: [
        { label: 'Edad con [Fe/H] −0,50' },
        { label: 'Edad con [Fe/H] 0' },
      ],
    },
    'shift-or-interval': {
      title: 'Cambio o intervalo',
      body: 'Mover la metalicidad supuesta 0,25 dex movió la edad de A 1,3 Gyr (más vieja, con −0,50) o 0,55 Gyr (más joven, con 0); su intervalo mide unos 0,05 Gyr de ancho.',
      prompt: '¿Con qué debe citarse la edad de un cúmulo?',
      options: [
        'Solo con el intervalo: es la incertidumbre del ajuste',
        'Con la metalicidad que se supuso y el cambio que produce una variación plausible de ella, que aquí es muchas veces el intervalo',
        'Con nada: la edad es la edad',
        'Con un intervalo mayor, hecho multiplicando por diez el ajustado',
      ],
      misconceptions: [
        {
          say: 'El intervalo mantiene fija la metalicidad. Un cambio de 0,25 dex mueve la edad de diez a veinticuatro anchos de intervalo, así que el intervalo solo subestima cuán bien se conoce la edad.',
        },
        {
          say: 'Un factor no es una medición. La afirmación honesta es el supuesto y lo que hace, que el panel te deja ver.',
        },
      ],
      hints: ['Compara 1,3 Gyr con 0,05 Gyr.'],
      because:
        'El intervalo del ajuste depende de la metalicidad, así que no puede incluirla. La edad que sale es la edad con esa metalicidad, y citarla con su supuesto (y el cambio que produce un intervalo plausible de metalicidad) es lo que permite al lector sopesarla. El registro del panel dice lo supuesto por esto.',
    },
    'the-difference-holds': {
      title: 'La diferencia se mantiene',
      body: 'Ahora el cúmulo B. Con [Fe/H] 0 lee su edad y réstale la del cúmulo A con 0 (1,47 Gyr). Con −0,25 la diferencia fue 1,14 Gyr. Con −0,50 el panel da la edad de B como más vieja de lo que alcanzan los modelos: el intervalo está abierto.',
      fields: [
        { label: 'Edad de B con [Fe/H] 0' },
        { label: 'Edad de B menos edad de A con 0' },
      ],
    },
    'which-is-steadier': {
      title: '¿Cuál es más estable?',
      body: 'En las tres metalicidades el cúmulo A fue de 1,47 a 3,35 Gyr y B de 2,24 a más allá de los modelos. B fue más viejo que A cada vez.',
      prompt: '¿Qué dice eso?',
      options: [
        'Que cuál cúmulo es más viejo es más estable frente a la metalicidad supuesta que cuán viejo es cada uno, cuando ambos se ajustan igual',
        'Que los cúmulos no tienen edad',
        'Que la metalicidad puede leerse de la diferencia',
        'Que el ajuste falla siempre que se cambia la metalicidad',
      ],
      misconceptions: [
        {
          say: 'Cada cúmulo tiene una edad. Lo que cambia es lo que un ajuste puede decir de ella cuando un número que no se le dio es falso.',
        },
        {
          say: 'Aquí la metalicidad nunca se ajusta; se probó ajustarla también (CLUSTER_FOUR_PARAMETER_GATE.md) y sus intervalos no cubrieron la verdad, así que no se ofrece.',
        },
      ],
      hints: ['Mira cuál cúmulo es más viejo en cada uno de los tres valores.'],
      because:
        'Un error compartido por dos ajustes, como una metalicidad falsa para ambos, desplaza ambas edades igual, así que su orden sobrevive y parte de su diferencia también. Una afirmación de cuál es más viejo, o de cuánto aproximadamente, es más estable que cada edad. Es más estable, no segura: una metalicidad distinta entre los cúmulos no se cancelaría.',
    },
    'add-binaries': {
      title: 'Añade estrellas binarias',
      body: 'Los cúmulos reales tienen estrellas binarias, cuyas dos estrellas suman su luz y quedan sobre la secuencia principal. El modelo del ajuste <em>no</em> tiene binarias. Elige el cúmulo A con [Fe/H] −0,25, pon <em>Estrellas binarias</em> en 30 por ciento, activa <em>Mostrar la verdad</em> y lee el módulo de distancia que da el ajuste y cuánto dista del 12,10 verdadero.',
      fields: [
        { label: 'Módulo de distancia con binarias' },
        { label: 'Verdadero menos ajustado' },
      ],
    },
    'no-warning': {
      title: 'Sin aviso',
      body: 'Con 30 por ciento de binarias la distancia ajustada fue 0,06 mag demasiado pequeña, unas siete veces la semianchura de su intervalo, y el panel no dijo nada.',
      prompt: '¿Por qué no se ensanchó el intervalo?',
      options: [
        'El intervalo mide cómo sube el estadístico en torno a su mejor valor dentro del modelo, y un modelo sin binarias no puede ver que su supuesto es falso',
        'Las binarias no afectan al ajuste de un cúmulo',
        'El intervalo solo se ensancha por encima de 40 por ciento de binarias',
        'La distancia es exacta hagan lo que hagan las estrellas',
      ],
      misconceptions: [
        {
          say: 'Sí afectan: 0,06 mag en la distancia aquí. En cien cúmulos con 30 por ciento de binarias los intervalos contuvieron la edad verdadera el 29 por ciento de las veces y la distancia verdadera el 8 por ciento.',
        },
      ],
      hints: ['¿Qué sabe el intervalo de las binarias?'],
      because:
        'Un intervalo es una afirmación dentro de un modelo. Cuando las estrellas vienen de algo que el modelo omite, el ajuste da un número y un intervalo estrecho y nada avisa. La comprobación de este método informa de ese comportamiento (cobertura de 0,29 para la edad y 0,08 para la distancia en cúmulos con 30 por ciento de binarias) en lugar de ocultarlo, y el panel lista «estrellas simples» entre sus supuestos.',
    },
    'a-real-cluster': {
      title: 'Un cúmulo real, y un límite',
      body: 'El panel de cúmulos del Observatorio ajusta el mismo modelo a las estrellas de un cúmulo real, NGC 2420, de SDSS y SEGUE. Con la metalicidad supuesta allí (−0,25) da 2,34 Gyr y un módulo de distancia de 11,82. Los valores publicados son 1,7 a 2,2 Gyr y 12,06 a 12,54. El ajuste <strong>no</strong> concuerda con ellos, y esto es un límite declarado del método, no una medición del cúmulo: una metalicidad supuesta distinta mueve la edad y la distancia mucho más que el intervalo, como viste. Una prueba de ajustar también la metalicidad, fijada antes de hacerla, no dio intervalos que contuvieran la verdad, así que el panel no la ofrece.',
    },
    'what-an-age-is': {
      title: 'Qué es una edad',
      body: 'La edad de un cúmulo por un ajuste es la lectura de un modelo de un diagrama, dados una metalicidad, un enrojecimiento y estrellas simples. Declara los tres con ella, cita el cambio que produce una variación plausible de ellos, y di que la diferencia de dos edades ajustadas igual es más estable que cada edad.',
    },
  },
};
