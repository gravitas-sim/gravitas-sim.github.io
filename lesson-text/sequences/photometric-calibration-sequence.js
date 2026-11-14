export const COUNTS_TO_MAGNITUDES_ES = {
  title: 'De cuentas a magnitudes',
  subtitle:
    'Por qué una estrella se ve más débil cerca del horizonte, cómo una noche de estrellas patrón convierte cuentas en magnitudes y qué no puede decirte la calibración',
  objectives: [
    'Predecir y después leer cuánto más débil se ve la misma estrella a mayor masa de aire, y decir por qué',
    'Leer la extinción del aire, en magnitudes por masa de aire, en la pendiente de las estrellas patrón de una noche',
    'Decir que la extinción del aire no es el polvo entre las estrellas',
    'Leer una magnitud calibrada con la incertidumbre que le deja la noche',
  ],
  steps: {
    'a-night-of-standards': {
      title: 'Una noche de estrellas patrón',
      body: 'Un detector cuenta electrones; un catálogo da magnitudes. Para pasar de lo uno a lo otro el observador mide <strong>estrellas patrón</strong>, estrellas cuyas magnitudes ya se conocen, a varias alturas del cielo. Cada punto de abajo es una medida de un patrón: el eje horizontal es la <strong>masa de aire</strong> (1 en el cenit, cerca de 2 a 30 grados sobre el horizonte) y el vertical, cuánto se aparta la magnitud del propio instrumento de la del catálogo.\n\nLa noche es <strong>sintética</strong>: la hizo un modelo a partir de una verdad declarada, con ruido, para poder comprobar la respuesta después. Nadie la observó.',
    },
    'low-in-the-sky-predict': {
      title: 'Bajo en el cielo',
      body: 'La misma estrella se mide en el cenit, con masa de aire 1,05, y de nuevo más tarde, cuando ha bajado a 2,15, más del doble de aire que atravesar. Los puntos del gráfico dicen cuánto cuesta el aire.',
      prompt: 'Con la masa de aire mayor la misma estrella se ve&hellip;',
      options: [
        'igual: el brillo de una estrella no depende de dónde esté en el cielo',
        'más débil en un cuarto de magnitud, aproximadamente',
        'más débil en unas dos magnitudes y media (un factor 10)',
        'más brillante, porque está más cerca del horizonte',
      ],
      hints: [
        'Lee la pendiente de los puntos: cuántas magnitudes baja la recta por cada masa de aire más.',
      ],
      because:
        'Un cuarto de magnitud, aproximadamente: la recta cae unas 0,21 magnitudes por cada masa de aire más, y de 1,05 a 2,15 hay 1,1.',
    },
    bouguer: {
      title: 'La pendiente es el aire',
      body: 'La recta discontinua es el ajuste a los patrones y su pendiente es el <strong>coeficiente de extinción</strong>, <em>k</em>, en magnitudes por masa de aire. Léelo en la fila <em>Extinción del aire</em>. El instrumento da cuánto más débil se ve una estrella con masa de aire 2,4 que en el cenit: <em>k</em> por las 1,4 masas de aire de diferencia.',
      fields: [
        { label: 'Extinción del aire, k' },
        { label: 'Más débil con masa de aire 2,4 que en el cenit' },
      ],
    },
    'why-fainter': {
      title: '¿Por qué más débil?',
      body: 'La estrella no cambió y el telescopio no se movió. Solo cambió el cielo entre ambos.',
      prompt: '¿Por qué la misma estrella se ve más débil cerca del horizonte?',
      options: [
        'Su luz cruza más aire al bajar, y el aire absorbe y dispersa una parte de ella por cada masa de aire',
        'Está más lejos cuando está baja, así que su luz tiene que recorrer más camino',
        'La estrella se vuelve de verdad más débil al ponerse',
        'El detector responde menos a la luz que llega en diagonal',
      ],
      misconceptions: [
        {
          say: 'La estrella está a la misma distancia a cualquier altura: el camino extra son solo las últimas decenas de kilómetros, a través de la atmósfera.',
        },
        {
          say: 'La estrella es constante; cambia su altura, y con ella la cantidad de aire en medio.',
        },
        {
          say: 'El detector ve la misma luz que vería en cualquier otro sitio; llega menos luz porque arriba se quitó más.',
        },
      ],
      hints: [
        '¿Qué hay entre la estrella y el telescopio y cómo cambia su cantidad con la altura de la estrella?',
      ],
      because:
        'Más aire, más extinción: la pérdida es de unas 0,21 magnitudes por cada masa de aire, así que una estrella baja pierde más que una en el cenit.',
    },
    'not-the-dust': {
      title: 'No es el polvo',
      body: 'Los astrónomos también hablan de <em>extinción</em> para el polvo entre las estrellas, que debilita y enrojece las estrellas lejanas. La palabra es la misma.',
      prompt: '¿Es la <em>k</em> de este gráfico el polvo entre las estrellas?',
      options: [
        'No: es la atmósfera de la Tierra, en magnitudes por masa de aire, y cambia con la noche y el lugar; el polvo entre las estrellas debilita una estrella en una cantidad que no depende de dónde esté en nuestro cielo esta noche',
        'Sí: extinción es extinción, y k es el polvo de la galaxia',
        'Sí, pero solo para estrellas cerca del horizonte',
        'No: la atmósfera no debilita la luz de las estrellas',
      ],
      misconceptions: [
        {
          say: 'Son cosas distintas: el polvo está entre la estrella y lo alto de nuestra atmósfera y es el mismo a cualquier altura de la estrella; esta k está en los últimos cien kilómetros, por masa de aire. Una magnitud calibrada aquí está corregida del aire, no del polvo.',
        },
        {
          say: 'El polvo no sabe dónde está el horizonte. La parte del aire crece con la masa de aire; la del polvo no.',
        },
        {
          say: 'La pendiente de los puntos es la atmósfera debilitando la luz de las estrellas: 0,21 magnitudes por cada masa de aire.',
        },
      ],
      hints: [
        '¿Cuál de las dos cambiaría si la misma estrella se observara desde el mismo sitio una hora después?',
      ],
      because:
        'La extinción del aire depende de la masa de aire y de la noche; la extinción interestelar pertenece a la línea de visión a través de la galaxia. Una calibración quita la primera y deja la segunda en la magnitud.',
    },
    'what-a-calibration-does': {
      title: 'Qué hace una calibración',
      body: 'Una noche de patrones fija tres números: el <strong>punto cero</strong> (qué magnitud tiene una cuenta por segundo), la <strong>extinción</strong> del aire y un <strong>término de color</strong> (el instrumento ve las estrellas azules y rojas de forma algo distinta). Con ellos, cualquier estrella de las mismas imágenes recibe una magnitud calibrada, <em>con una incertidumbre</em> que sale de lo bien que la noche los fijó. Los pasos siguientes hacen una. Recuerda que la noche es sintética y que la extinción es la de la atmósfera, no la del polvo.',
    },
  },
};

export const COUNTS_TO_MAGNITUDES_DEEPER_ES = {
  steps: {
    'the-zero-point': {
      title: 'El punto cero',
      body: 'Lee la fila <em>Punto cero a masa de aire 1</em>, <strong>Z1</strong>: la magnitud calibrada de una estrella que da un electrón por segundo, observada con masa de aire 1. Lee también la extinción; el instrumento da el punto cero <em>fuera</em> de la atmósfera, Z1 menos <em>k</em>.',
      fields: [
        { label: 'Punto cero a masa de aire 1, Z1' },
        { label: 'Extinción, k' },
        { label: 'Punto cero fuera de la atmósfera' },
      ],
    },
    'calibrate-a-target': {
      title: 'Calibra una estrella problema',
      body: 'El panel mide también una estrella <strong>problema</strong>, con masa de aire 1,9 e índice de color 0,8. Lee la fila <em>Estrella problema</em>: su magnitud calibrada y la incertidumbre. Después activa <em>Mostrar la verdad</em> y compara con la magnitud que le dio el modelo.',
      fields: [
        { label: 'Magnitud calibrada' },
        { label: 'Su incertidumbre' },
        { label: 'Semianchura del intervalo del 95 por ciento' },
      ],
    },
    'the-airmass-limit': {
      title: 'Dónde se acaba una recta',
      body: 'Sube <em>Mayor masa de aire observada</em> a <strong>3,0</strong>. La noche tiene ahora patrones por encima de la masa de aire 2,5, donde el aire es espeso y ya no se fía una recta en la masa de aire. La herramienta los deja fuera y los marca. Lee cuántas medidas dejó fuera y la extinción que encuentra entonces.',
      fields: [{ label: 'Medidas dejadas fuera' }, { label: 'Extinción, k' }],
    },
    'refuse-a-target': {
      title: 'Una estrella problema con masa de aire 3',
      body: 'Ahora fija la <em>Masa de aire del problema</em> en <strong>3,0</strong>. La fila de la estrella problema dice que se rechaza.',
      prompt: '¿Por qué es mejor un rechazo que un número?',
      options: [
        'Ningún patrón se midió con fiabilidad tan bajo, así que la recta nunca se puso a prueba allí: cualquier número sería una extrapolación que los datos no pueden comprobar',
        'La herramienta no sabe calcular una magnitud por encima de la masa de aire 2',
        'Una estrella con masa de aire 3 es demasiado débil para medirla',
        'El rechazo ahorra tiempo al observador',
      ],
      misconceptions: [
        {
          say: 'La aritmética se puede hacer con cualquier masa de aire: la ecuación no se rompe. Lo que no se puede es fiarse de la respuesta.',
        },
        {
          say: 'La estrella problema es tan brillante como antes; lo que los patrones ya no cubren es la extinción allí y cómo cambia con la masa de aire.',
        },
        {
          say: 'Un rechazo dice que los datos no respaldan un número; es la respuesta honesta, no un atajo.',
        },
      ],
      hints: [
        '¿Qué sabe la calibración del aire con una masa de aire a la que no se observó ningún patrón?',
      ],
      because:
        'Una extrapolación más allá de lo probado es una conjetura disfrazada de medida. La herramienta rechaza por encima de la masa de aire 2,5 y el observador vuelve a observar la estrella problema más alto en el cielo.',
    },
    'narrow-predict': {
      title: 'Una noche con una sola masa de aire',
      body: 'Elige la noche llamada <em>un intervalo estrecho de masa de aire</em>: todos sus patrones se midieron entre las masas de aire 1,30 y 1,42, porque el observador no esperó a que el campo se moviera.',
      prompt: '¿Qué puede decir esta noche de la extinción <em>k</em>?',
      options: [
        'Nada útil: con todos los puntos en casi una misma masa de aire no se distingue la pendiente del punto cero',
        'Fija k tan bien como una noche amplia, solo que con más puntos',
        'Da k exactamente, porque la dispersión es pequeña',
        'Fija k solo si el ruido es alto',
      ],
      hints: [
        '¿Podrías trazar una pendiente por puntos que están todos sobre casi un mismo valor de la masa de aire?',
      ],
      because:
        'La pendiente es un cambio de magnitud sobre un cambio de masa de aire; si la masa de aire casi no cambia, cualquier pendiente ajusta casi igual de bien, y el punto cero y la extinción se compensan entre sí.',
    },
    'narrow-night': {
      title: 'La noche que no puede decirlo',
      body: 'Lee la fila <em>Noche</em> para el intervalo de masa de aire y después la fila <em>Término de color, c</em>. El término de color sigue fijado (los patrones cubren un amplio intervalo de color). Da el intervalo de masa de aire y el término de color.',
      fields: [
        { label: 'Masa de aire más baja' },
        { label: 'Masa de aire más alta' },
        { label: 'Intervalo' },
        { label: 'Término de color, c' },
      ],
    },
    'a-cited-coefficient': {
      title: 'Pide prestado un coeficiente',
      body: 'Activa <em>Usar un coeficiente citado del sitio</em>. La extinción se toma entonces de una tabla (el coeficiente del Observatorio Rubin para la banda r, 0,126, del artículo publicado del sondeo) con una incertidumbre <em>supuesta</em> de 0,05 magnitudes por masa de aire, porque la tabla no da ninguna. La noche puede entonces calibrar la estrella problema. Lee su magnitud calibrada y su incertidumbre.',
      fields: [
        { label: 'Magnitud calibrada' },
        { label: 'Su incertidumbre' },
        { label: 'Distancia a la verdad, 13,200' },
      ],
    },
    'how-few-standards': {
      title: '¿Cuántos patrones como mínimo?',
      body: 'En la noche despejada, baja <em>Estrellas patrón usadas</em> a <strong>2</strong> y luego a <strong>3</strong>. Dos estrellas no pueden fijar a la vez la extinción y un término de color, así que el término de color no queda determinado y la herramienta añade una incertidumbre declarada para él. Lee cada vez la incertidumbre de la estrella problema.',
      fields: [
        { label: 'Incertidumbre con 2 patrones' },
        { label: 'Incertidumbre con 3 patrones' },
        { label: 'Cociente' },
      ],
    },
    'the-color-night': {
      title: 'Una noche que la recta no ajusta',
      body: 'Elige la noche llamada <em>extinción que depende del color</em>. Aquí el aire debilita las estrellas azules algo más que las rojas, de modo que la extinción depende del color, un término que la ecuación de primer orden no tiene. Mira la fila <em>El ajuste</em> y los gráficos de residuos (elige <em>residuos frente a la masa de aire</em>): los patrones ya no se dispersan alrededor del ajuste como dicen sus errores, y la herramienta lo dice y dice por qué sospecha una extinción que depende del color.',
    },
    'second-order': {
      title: '¿Hay más en los datos?',
      body: 'Lee la fila <em>¿Hay más en los datos?</em>: cuánto baja la chi cuadrado al añadir una extinción que depende del color. Después cambia el modelo a <em>con extinción que depende del color</em> y lee el término nuevo, <em>k2</em> (<em>Dependencia de la extinción con el color</em>).',
      fields: [
        { label: 'Bajada de la chi cuadrado' },
        { label: 'Extinción que depende del color, k2' },
      ],
    },
    'a-blue-target': {
      title: 'Qué le hace a una estrella azul',
      body: 'Fija el <em>Índice de color del problema</em> en <strong>&minus;0,2</strong>, una estrella azul. Lee la magnitud calibrada en el modelo de primer orden y otra vez en el de segundo orden. La magnitud verdadera es 13,200.',
      fields: [
        { label: 'Calibrada, primer orden' },
        { label: 'Calibrada, segundo orden' },
        { label: 'Diferencia' },
      ],
    },
    'what-it-costs': {
      title: '¿Por qué no usar siempre el modelo mayor?',
      body: 'En la noche despejada el modelo de segundo orden encuentra una extinción que depende del color de −0,001, no más que su propio error. Su estrella problema es igual de buena y su extinción es menos segura: 0,0047 en vez de 0,0029.',
      prompt:
        '¿Cuándo debe ajustar un observador la extinción que depende del color?',
      options: [
        'Cuando los datos lo piden: los residuos del ajuste y la prueba del término extra dicen que hay más en los datos, y los colores y masas de aire de la noche pueden fijarlo',
        'Siempre: un modelo más general es siempre mejor',
        'Nunca: la ecuación de primer orden es la estándar',
        'Solo para estrellas rojas',
      ],
      misconceptions: [
        {
          say: 'Cada término cuesta precisión: aquí la incertidumbre de la extinción pasa de 0,0029 a 0,0047 por un término que no hace falta. Un término que los datos no pueden fijar tampoco añade más que un error mayor.',
        },
        {
          say: 'En la noche con extinción que depende del color, la respuesta de primer orden se equivoca en 0,015 para una estrella azul y lo dice con una marca; ignorar la marca no es prudencia.',
        },
        {
          say: 'El término actúa igual en estrellas azules y rojas (su efecto es proporcional al color); la estrella problema azul era la prueba mayor, pero no el único caso.',
        },
      ],
      hints: [
        'Compara las incertidumbres de la extinción en los dos modelos en la noche despejada.',
      ],
      because:
        'Un modelo mayor se elige por la evidencia, no por defecto: la prueba del término extra y los residuos deciden, y el término extra solo se ajusta cuando los patrones de la noche pueden determinarlo.',
    },
    'the-limits': {
      title: 'Qué supone la calibración',
      body: 'Una calibración lineal solo afirma lo que permite su ecuación. Supone que la extinción es constante durante la noche (las nubes, el polvo y un viento que se levanta la rompen), que las magnitudes del catálogo son correctas (sus errores los comparten todas las medidas de una estrella, y la herramienta lo incluye), que las medidas están libres de errores de apertura y de campo plano, y que una recta en la masa de aire y en el color describe el instrumento. La herramienta rechaza donde no puede respaldar un número y marca el resto: el rechazo, los errores ensanchados y las marcas son la calibración diciendo lo que no sabe. La fila <em>Supone</em> del panel lo repite. Y la extinción es la de la atmósfera, en magnitudes por masa de aire: el polvo entre las estrellas es otra corrección distinta.',
    },
  },
};
