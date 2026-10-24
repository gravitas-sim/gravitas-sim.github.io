// Las tres investigaciones de medición y afirmación - español, paso a paso con ../measurement-sequence.js (D-R10-67).
// Un archivo para las tres: el cierre del paquete de materiales para docentes está limitado por el número de archivos.
// Sin lectura por una persona que lea español con fluidez; los mensajes que calculan los validadores quedan en inglés, como en las demás investigaciones.

export const WHAT_IS_A_MEASUREMENT = {
  title: '¿Qué es una medición?',
  subtitle: 'Marcar una estrella una y otra vez, y qué pueden decir las marcas',
  objectives: [
    'Decir por qué cinco marcas de una misma estrella son cinco números distintos, y que la dispersión pertenece al marcado y no es un error',
    'Leer la media de las marcas y su error estándar a partir de la dispersión y del número de marcas',
    'Predecir, antes de mostrar la verdad, cuán cerca de ella quedará la media de las marcas',
    'Decir qué incluye el error estándar y qué deja fuera',
  ],
  steps: [
    {
      title: 'Una estrella, marcada una y otra vez',
      body: 'Una medición de dónde está una estrella empieza con una marca sobre una imagen. El cuadro de abajo es <strong>sintético</strong>: se puso una estrella en una posición que elegimos, se la desenfocó como la desenfoca un telescopio y se le dio un poco de ruido de cielo. Cada cruz es una marca, el lugar donde una persona cuidadosa pondría el centro de la mancha borrosa.\n\nComo hicimos el cuadro, sabemos dónde está realmente la estrella. Un cuadro real nunca lo dice. Por ahora la verdad está oculta. Se muestran cinco marcas, cada una con su posición en píxeles (x, y) en la lista bajo la imagen, y el anillo es su media.',
    },
    {
      title: '¿Coincidirán las marcas?',
      body: 'Se marca cinco veces la misma estrella, cada vez con el mayor cuidado posible. Todavía no cambies el instrumento.',
      prompt: 'Las cinco posiciones serán&hellip;',
      options: [
        'todas iguales, si el marcado se hace con el suficiente cuidado',
        'algo dispersas alrededor de un centro, aunque cada marca sea cuidadosa',
        'dispersas solo porque algunas marcas son errores',
        'dispersas solo si el cuadro es malo',
      ],
      misconceptions: [
        {
          say: 'Una mancha borrosa no tiene un borde único donde poner la cruz. Dos marcas cuidadosas difieren en una fracción de píxel, y lo mismo harían dos marcas cuidadosas de una misma persona.',
        },
      ],
      hints: ['Mira dónde están las cruces sobre la mancha borrosa.'],
      because:
        'Algo dispersas. La estrella es una mancha de varios píxeles de ancho, así que incluso una marca cuidadosa cae un poco a un lado u otro, y ninguna marca es la verdad. La dispersión es una propiedad del marcado. El paso siguiente la mide.',
    },
    {
      title: 'La media y la dispersión',
      body: 'Con <strong>5</strong> marcas, lee la posición x <strong>media</strong> y la <strong>dispersión</strong> de las marcas en x, su desviación estándar. La media es la mejor posición única que dan las marcas; la dispersión dice cuánto se aparta típicamente una marca de ella.',
      fields: [
        { label: 'Media de x' },
        { label: 'Dispersión de x (desviación estándar)' },
      ],
    },
    {
      title: '¿Cuán bien se conoce la media?',
      body: 'La media de cinco marcas se conoce mejor que cualquiera de ellas. El <strong>error estándar</strong> dice cuánto mejor: es la dispersión dividida entre la raíz cuadrada del número de marcas. Léelo para las marcas en x y en y.',
      fields: [
        { label: 'Error estándar de x' },
        { label: 'Error estándar de y' },
      ],
    },
    {
      title: '¿Qué compran más marcas?',
      body: 'Vas a marcar la estrella veinte veces en lugar de cinco, que son cuatro veces más marcas.',
      prompt: 'El error estándar de la media&hellip;',
      options: [
        'seguirá más o menos igual, porque cada marca es tan cuidadosa como antes',
        'bajará a más o menos la mitad',
        'bajará a más o menos una cuarta parte',
        'bajará a cero, con suficientes marcas',
      ],
      misconceptions: [
        {
          say: 'El error estándar disminuye con la raíz cuadrada del número de marcas, así que sigue bajando y nunca llega a cero. Reducirlo a la mitad cuesta cuatro veces las marcas.',
        },
      ],
      hints: [
        'El error estándar es la dispersión dividida entre la raíz cuadrada del número de marcas.',
      ],
      because:
        'Más o menos la mitad. Cuatro veces las marcas son un factor de dos en la raíz cuadrada, así que el error estándar baja a la mitad aproximadamente. El paso siguiente lo mide.',
    },
    {
      title: 'Veinte marcas',
      body: 'Pon <strong>Cuántas marcas</strong> en 20. Lee otra vez el error estándar de x y calcula cuántas veces menor es que el error estándar con cinco marcas (0,36&nbsp;px).',
      fields: [
        { label: 'Error estándar de x, 20 marcas' },
        { label: 'Cuántas veces menor que con 5 marcas' },
      ],
    },
    {
      title: '¿Dónde está realmente la estrella?',
      body: 'De vuelta a <strong>5</strong> marcas. La posición verdadera de la estrella está oculta. Tu media es una buena estimación de ella, pero solo una estimación.',
      prompt: 'Cuando se muestre la verdad, estará&hellip;',
      options: [
        'exactamente en la media de las marcas',
        'cerca de la media, típicamente a menos de uno o dos errores estándar de ella, pero no exactamente sobre ella',
        'en la primera marca, que se hizo antes de que las demás pudieran influir',
        'en cualquier lugar del cuadro, porque cinco marcas no dicen nada de ella',
      ],
      misconceptions: [
        {
          say: 'La media es la mejor estimación que dan las marcas, no la verdad. Queda cerca de la verdad a más o menos un error estándar, que es el número que acabas de medir.',
        },
      ],
      hints: ['¿Qué dijo el error estándar sobre cuánto se desvía la media?'],
      because:
        'Cerca, pero no exactamente sobre ella. El error estándar es cuánto se aparta típicamente la media de la verdad, así que la verdad debería caer a menos de uno o dos de ellos. El paso siguiente lo muestra.',
    },
    {
      title: 'La posición verdadera',
      body: 'El anillo discontinuo marca ahora la posición <strong>verdadera</strong> de la estrella. Lee el error de tu media en x (la media menos la verdad) y ese error en unidades del error estándar.',
      fields: [
        { label: 'Error de la media en x (media menos verdad)' },
        { label: 'Ese error en errores estándar' },
      ],
    },
    {
      title: 'Una estrella dos veces más desenfocada',
      body: 'Otra noche, la misma estrella, pero la turbulencia es peor y la mancha es <strong>el doble de ancha</strong>. Pon <strong>Ancho de la estrella</strong> en 8 píxeles, con 5 marcas, y lee la dispersión y el error estándar de x.',
      fields: [{ label: 'Dispersión de x' }, { label: 'Error estándar de x' }],
    },
    {
      title: '¿Por qué se duplicaron los dos números?',
      body: 'Con la estrella el doble de ancha, la dispersión y el error estándar de x salieron los dos más o menos el doble de grandes.',
      prompt: '¿Qué dice eso?',
      options: [
        'Cuán bien se mide una posición depende de la imagen, y una imagen más borrosa da una dispersión mayor y una media peor',
        'El error estándar depende solo de cuántas marcas se hicieron',
        'Las marcas fueron menos cuidadosas la segunda noche',
        'La verdad se movió cuando la estrella se desenfocó',
      ],
      misconceptions: [
        {
          say: 'El error estándar es la dispersión entre la raíz cuadrada del número de marcas. Cambian los dos números, y este paso cambió la dispersión.',
        },
      ],
      hints: ['El número de marcas no cambió entre los dos pasos.'],
      because:
        'La dispersión viene de cuán precisamente se puede colocar una marca sobre la imagen. Una estrella más ancha es más difícil de colocar, así que la dispersión es mayor y la media del mismo número de marcas se conoce peor. Una incertidumbre pertenece a la medición y a la imagen de la que salió.',
    },
    {
      title: '¿Qué informarías?',
      body: 'Marcaste una estrella cinco veces y viste que las marcas difieren.',
      prompt:
        'En una o dos frases, di qué informarías como posición x de la estrella y por qué no informarías solo la primera marca.',
    },
    {
      title: 'Lo que has deducido',
      body: 'Las marcas cuidadosas de una misma estrella difieren, porque la mancha es borrosa, y la dispersión de las marcas dice con qué precisión se puede hacer una marca. La media de las marcas es la mejor estimación que dan, y su error estándar, la dispersión entre la raíz cuadrada del número de marcas, dice cuán cerca de la verdad queda típicamente la media. Más marcas lo reducen despacio: cuatro veces las marcas lo reducen a la mitad. Una imagen más borrosa lo aumenta. Aquí se conocía la verdad, y pudimos ver cómo la media caía a menos de un error estándar de ella. La próxima investigación pregunta qué afirma un «más menos» declarado y cómo comprobar una afirmación así.',
    },
  ],
};

export const WHAT_DOES_PLUS_MINUS_CLAIM = {
  title: '¿Qué afirma el ±?',
  subtitle: 'Comprobar una incertidumbre declarada repitiendo la medición',
  objectives: [
    'Decir qué es la cobertura: de muchas repeticiones de una medición, la parte cuyo intervalo declarado contiene el valor verdadero',
    'Comprobar una afirmación declarada de uno y de dos sigmas con un conjunto sembrado de repeticiones',
    'Decir por qué un pequeño más-menos de un instrumento sesgado es una afirmación segura y errónea',
    'Leer un intervalo asimétrico y un límite superior como afirmaciones con una cobertura propia',
  ],
  steps: [
    {
      title: 'Una afirmación que puedes comprobar',
      body: 'Una medición se informa como un valor con un intervalo: «10,0 ± 1,0». Si el intervalo es una afirmación de <strong>una sigma</strong>, dice que, en muchas repeticiones de la medición, unas dos de cada tres pondrían el valor verdadero dentro de su propio intervalo.\n\nEsa afirmación se puede comprobar, porque aquí los datos son <strong>sintéticos</strong> y el valor verdadero se conoce (10,0). La imagen muestra las primeras cuarenta de un conjunto sembrado de repeticiones: cada barra es el intervalo que declaró una repetición, la línea es la verdad. Las barras que la fallan se dibujan discontinuas. La tabla cuenta todas.',
    },
    {
      title: '¿Cuántas repeticiones contienen la verdad?',
      body: 'El instrumento realmente se dispersa 1,0, y cada repetición declara «± 1,0»: una afirmación honesta. Entre 2000 repeticiones, cuenta las que tienen el valor verdadero en su intervalo.',
      prompt: 'La parte que contiene la verdad será aproximadamente&hellip;',
      options: [
        'dos tercios (68 por ciento)',
        'diecinueve de cada veinte (95 por ciento)',
        'todas, porque la afirmación es honesta',
        'la mitad (50 por ciento)',
      ],
      misconceptions: [
        {
          say: 'Un intervalo de una sigma está hecho para contener la verdad solo unas dos veces de cada tres. Una afirmación honesta es aquella cuya cobertura coincide con lo que dice, no la que nunca falla.',
        },
      ],
      hints: [
        'Piensa en la curva normal: ¿cuánta de ella queda a menos de una sigma del centro?',
      ],
      because:
        'Unos dos tercios. Un intervalo de una sigma a cada lado contiene la verdad en el 68 por ciento de las repeticiones cuando la sigma declarada es la dispersión real. El paso siguiente las cuenta.',
    },
    {
      title: 'Cuenta las repeticiones que contienen la verdad',
      body: 'Con el intervalo en <strong>±1 σ</strong> y 2000 repeticiones, lee cuántos intervalos contienen el valor verdadero y qué parte de las repeticiones es.',
      fields: [
        { label: 'Intervalos que contienen la verdad' },
        { label: 'Parte de las repeticiones' },
      ],
    },
    {
      title: 'Ensancha el intervalo',
      body: 'Ensancha el intervalo a <strong>±2 σ</strong>. Lee otra vez la cuenta y la parte.',
      fields: [
        { label: 'Intervalos que contienen la verdad' },
        { label: 'Parte de las repeticiones' },
      ],
    },
    {
      title: 'Un pequeño más-menos de un instrumento sesgado',
      body: 'Un segundo instrumento es mucho más preciso: se dispersa solo 0,3 y declara «± 0,3». Pero lee <strong>0,4 de más</strong> siempre, y nada en su barra de error lo dice.',
      prompt:
        'La parte de sus intervalos de una sigma que contienen la verdad será&hellip;',
      options: [
        'unos dos tercios, porque su sigma declarada coincide con su dispersión',
        'unos diecinueve de cada veinte',
        'mucho menor que dos tercios',
        'mayor que dos tercios, porque su intervalo es más pequeño',
      ],
      hints: [
        'Compara el desplazamiento, 0,4, con el semiancho del intervalo, 0,3.',
      ],
      because:
        'Mucho menor. Cada repetición se desplaza más de lo que mide el intervalo de ancho, así que la mayoría de los intervalos fallan la verdad: la barra de error describe la dispersión y no dice nada del desplazamiento. El paso siguiente cuenta.',
    },
    {
      title: 'Cuéntalas',
      body: 'Lee la parte de las repeticiones que contienen la verdad con <strong>±1 σ</strong> y luego con <strong>±2 σ</strong>.',
      fields: [{ label: 'Parte con ±1 σ' }, { label: 'Parte con ±2 σ' }],
    },
    {
      title: '¿Qué dice una barra de error pequeña?',
      body: 'La barra de error del instrumento sesgado es un tercio de la del instrumento honesto, y sus intervalos contienen la verdad mucho menos veces.',
      prompt: '¿Qué te dice una incertidumbre declarada pequeña?',
      options: [
        'Que las repeticiones coinciden entre sí: la medición es precisa, y aun así puede ser inexacta',
        'Que la medición está cerca del valor verdadero',
        'Que el instrumento es mejor que uno con una barra de error mayor',
        'Que el intervalo contendrá la verdad más veces',
      ],
      misconceptions: [
        {
          say: 'Una barra de error pequeña dice que las repeticiones se agrupan. No dice nada de si el grupo está sobre la verdad: eso es otra propiedad, la exactitud, y solo una comprobación contra la verdad, o contra otro método, puede mostrarla.',
        },
      ],
      hints: [
        '¿Cuál de las dos propiedades tenía el instrumento sesgado, y cuál le faltaba?',
      ],
      because:
        'El acuerdo entre repeticiones, que es la precisión. La exactitud, la cercanía a la verdad, necesita una comprobación que no use el propio instrumento. Un más-menos declarado es una afirmación, y es una afirmación sobre la dispersión a menos que alguien haya comprobado también un desplazamiento.',
    },
    {
      title: 'Un intervalo que no es simétrico',
      body: 'El paralaje de una estrella es 3,0&nbsp;mas, medido con ±0,9&nbsp;mas, y su distancia en parsecs es 1000 dividido entre el paralaje. El intervalo del paralaje, llevado a través de esa división, <strong>no es simétrico</strong> respecto de la distancia: se extiende más por arriba que por abajo. Elige la forma <strong>asimétrica</strong> con ±1 σ y lee la cobertura, y cuántas repeticiones no tenían extremo superior, porque su intervalo de paralaje llegaba a cero.',
      fields: [
        { label: 'Parte que contiene la distancia verdadera' },
        { label: 'Repeticiones sin extremo superior' },
      ],
    },
    {
      title: 'El atajo simétrico',
      body: 'Un atajo declara la distancia con una barra de error simétrica: la distancia más o menos el error del paralaje llevado a primer orden. Elige la forma <strong>simétrica</strong> con ±1 σ y lee la cobertura.',
      fields: [{ label: 'Parte que contiene la distancia verdadera' }],
    },
    {
      title: 'Cuando no se ve lo bastante bien para medir',
      body: 'Un experimento cuenta sucesos de una fuente cuya media verdadera es 3,0 sucesos, e informa un <strong>límite superior del 95 por ciento</strong> para la tasa a partir de cada cuenta: un número por debajo del cual se afirma que está la tasa verdadera. No cambies el instrumento.',
      prompt:
        'Entre 2000 repeticiones, la parte cuyo límite superior queda por encima de la tasa verdadera será&hellip;',
      options: [
        'al menos el 95 por ciento, cerca del 95 por ciento aquí',
        'unos dos tercios',
        'exactamente 95,000 por ciento en cada muestra',
        'la mitad, porque el límite es una cota de un solo lado',
      ],
      hints: [
        'El límite está construido para contener la verdad al menos 95 veces de cada 100.',
      ],
      because:
        'Cerca del 95 por ciento, nunca por debajo por construcción. Las cuentas son números enteros, así que la cobertura no se puede ajustar a exactamente 95, y las 2000 repeticiones añaden una oscilación propia. El paso siguiente cuenta.',
    },
    {
      title: 'Comprueba el límite',
      body: 'Lee la cobertura de los límites superiores con una tasa verdadera de <strong>3,0</strong>, y luego sube la tasa a <strong>4,0</strong> y léela otra vez.',
      fields: [
        { label: 'Parte que contiene la tasa en 3,0' },
        { label: 'Parte que contiene la tasa en 4,0' },
      ],
    },
    {
      title: '¿Qué la demostraría errónea?',
      body: 'Un artículo informa un valor como «4,2 ± 0,3 (1σ)».',
      prompt:
        'En dos o tres frases: ¿qué dice esa afirmación sobre las repeticiones, cómo la comprobarías y qué tendrías que ver para que fuera errónea?',
    },
    {
      title: 'Lo que has deducido',
      body: 'Un intervalo declarado de una sigma es una afirmación sobre repeticiones: debería contener la verdad en unas dos de cada tres, y uno de dos sigmas en unas diecinueve de cada veinte. Aquí se conocía la verdad, así que la afirmación se pudo contar, y se cumplió para el instrumento honesto y falló para el sesgado, cuyo pequeño más-menos no decía nada de su desplazamiento. Un intervalo llevado a través de una división es asimétrico, y el atajo simétrico no conserva su cobertura. Un límite superior es una afirmación de al menos su cobertura. Con datos reales no se conoce la verdad, así que una afirmación solo se puede comprobar contra repeticiones o contra otro método. La última investigación de las tres pregunta qué decir cuando un método no puede dar un intervalo.',
    },
  ],
};

export const WHEN_THE_METHOD_MUST_REFUSE = {
  title: 'Cuando el método debe negarse',
  subtitle:
    'Un ajuste que fija una combinación, y un modelo que no describe los datos',
  objectives: [
    'Decir qué es un perfil: el mejor ajuste que queda cuando un parámetro se mantiene en cada valor de prueba',
    'Ver que unos datos que solo fijan un producto de dos parámetros dan una cota inferior de uno de ellos y ninguna superior',
    'Decir «no acotado» como resultado, y por qué dar un número sería inventarlo',
    'Rechazar un ajuste cuyo chi cuadrado reducido y cuyo valor p dicen que el modelo no describe los datos',
  ],
  steps: [
    {
      title: 'Dos parámetros, una medición',
      body: 'El bamboleo de una estrella mide el tirón de un planeta invisible a lo largo de nuestra línea de visión. Eso fija el producto de la masa <em>m</em> del planeta y el seno de la inclinación de su órbita, <em>s</em> (1 para una órbita vista de canto, casi 0 vista de frente). Supón que los datos dan <strong>m s = 0,85 ± 0,06</strong> masas de Júpiter. Fijan ese producto y, hasta donde llegan, nada más.\n\nEl <strong>perfil</strong> pregunta: para cada masa de prueba, ¿cuál es el mejor ajuste cuando la inclinación puede tomar el valor que mejor ajuste? Donde el ajuste no cuesta más que el mejor, la masa está permitida. Los datos son <strong>sintéticos</strong>, y no se declaran la masa ni la inclinación verdaderas.',
    },
    {
      title: '¿Qué dicen los datos sobre la masa?',
      body: 'Los datos dicen m s = 0,85 ± 0,06 masas de Júpiter, y la inclinación no se mide. Todavía no cambies el instrumento.',
      prompt: 'La masa m es&hellip;',
      options: [
        '0,85 masas de Júpiter, más o menos 0,06',
        'al menos algo menos de 0,85 masas de Júpiter, y podría ser mucho mayor',
        'entre unas 0,79 y 0,91 masas de Júpiter',
        'cualquier valor: los datos no dicen nada de ella',
      ],
      misconceptions: [
        {
          say: 'Ese es el producto, m por s. La masa sola es ese número dividido entre s, y s es como mucho 1, así que la masa es al menos el producto, y la inclinación no se mide.',
        },
      ],
      hints: ['Si s puede valer hasta 1, ¿qué le pasa a m = 0,85 ÷ s?'],
      because:
        'La masa es al menos más o menos el producto y podría ser mucho mayor, porque una s menor necesita una m mayor para dar el mismo producto. Los pasos siguientes miden la cota.',
    },
    {
      title: 'Prueba una masa de 2 masas de Júpiter',
      body: 'Pon la masa de prueba en <strong>2,0</strong> y lee la inclinación que mejor ajusta con esa masa y lo que cuesta entonces el ajuste (el chi cuadrado).',
      fields: [
        { label: 'Mejor inclinación, el seno s' },
        { label: 'Chi cuadrado de ese ajuste' },
      ],
    },
    {
      title: 'Prueba una masa de 0,5',
      body: 'Ahora pon la masa de prueba en <strong>0,5</strong>, por debajo del producto. La inclinación no puede pasar de 1, así que no ayuda. Lee la mejor inclinación y el chi cuadrado.',
      fields: [
        { label: 'Mejor inclinación, el seno s' },
        { label: 'Chi cuadrado de ese ajuste' },
      ],
    },
    {
      title: 'La masa más pequeña que permiten los datos',
      body: 'El perfil muestra el chi cuadrado del mejor ajuste con cada masa de prueba, con líneas donde ha subido 1 (un intervalo de una sigma) y 3,84 (un intervalo del 95 por ciento). Lee la masa más pequeña dentro de cada subida.',
      fields: [
        { label: 'Masa más pequeña, subida de 1' },
        { label: 'Masa más pequeña, subida de 3,84' },
      ],
    },
    {
      title: '¿Hay una masa máxima?',
      body: 'Mira el lado derecho del perfil, para masas por encima del producto.',
      prompt: '¿Fijan estos datos una masa máxima para el planeta?',
      options: [
        'No: cualquier masa mayor ajusta igual de bien, con una inclinación menor',
        'Sí: unas 0,91 masas de Júpiter, una sigma por encima del producto',
        'Sí: la masa máxima es la del medio del intervalo representado',
        'Sí, pero se necesitan más datos para conocerla',
      ],
      misconceptions: [
        {
          say: 'El producto es 0,85 ± 0,06, pero la masa es el producto dividido entre el seno, así que sumar la barra de error del producto no la acota: una inclinación suficientemente pequeña da cualquier masa.',
        },
      ],
      hints: [
        '¿Qué le pasa al chi cuadrado cuando la masa sube y la inclinación baja a la vez?',
      ],
      because:
        'No. Para cualquier masa mayor la inclinación que ajusta es menor, y el chi cuadrado se queda en su mejor valor. Con solo el producto medido, la masa tiene una cota inferior y ninguna superior.',
    },
    {
      title: '¿Qué entra en el artículo?',
      body: 'El análisis tiene que afirmar algo sobre la masa del planeta.',
      prompt: '¿Qué enunciado es honesto?',
      options: [
        'm = 0,85 ± 0,06 masas de Júpiter',
        'm es al menos 0,79 masas de Júpiter (una sigma), y los datos no fijan cota superior',
        'm = 2,0 masas de Júpiter, el medio del intervalo permitido',
        'No se puede decir nada de m',
      ],
      misconceptions: [
        {
          say: 'Ese es el producto m s, y darlo como la masa inventa una medición de la inclinación que nunca se hizo.',
        },
        {
          say: 'Los datos sí descartan las masas pequeñas. No decir nada tira un resultado real: la cota inferior.',
        },
      ],
      hints: [
        'Un informe honesto conserva lo que fijan los datos y rechaza lo que no fijan.',
      ],
      because:
        'Una cota inferior con la confianza declarada, y «no acotado» por encima. Dar una sola masa sería inventar un número que los datos no contienen; no decir nada tiraría la cota que sí contienen.',
    },
    {
      title: 'Una recta por seis puntos',
      body: 'Un segundo análisis ajusta una recta a seis puntos, cada uno con una barra de error de 0,1. Si una recta es el modelo correcto, el chi cuadrado del ajuste dividido entre sus grados de libertad, el <strong>chi cuadrado reducido</strong>, debería salir de un tamaño parecido en cada repetición del experimento. Todavía no ajustes.',
      prompt:
        'Si la recta es el modelo correcto, el chi cuadrado reducido estará cerca de&hellip;',
      options: [
        '0, porque el mejor ajuste no tiene error',
        '1',
        '6, el número de puntos',
        '100, porque los puntos se dispersan',
      ],
      hints: [
        'Cada punto debería caer a una barra de error del modelo, y el chi cuadrado suma los cuadrados de esas distancias.',
      ],
      because:
        'Cerca de 1. Cada punto debería estar a más o menos una barra de error del modelo, y los grados de libertad cuentan los puntos que no se usaron ya para fijar la recta. Un chi cuadrado reducido muy superior a 1 dice que el modelo falla.',
    },
    {
      title: 'Ajusta la recta',
      body: 'La recta se ajusta por mínimos cuadrados ponderados, y el ajuste declara una pendiente con su incertidumbre formal. Lee la pendiente, su incertidumbre formal y el chi cuadrado reducido.',
      fields: [
        { label: 'Pendiente' },
        { label: 'Incertidumbre formal de la pendiente' },
        { label: 'Chi cuadrado reducido' },
      ],
    },
    {
      title: '¿Qué debe decir el análisis?',
      body: 'La recta tiene un chi cuadrado reducido de 7,6 con cuatro grados de libertad, y un valor p inferior a 0,001: una probabilidad inferior a una entre mil de que una recta verdadera fallara los puntos tan mal.',
      prompt: '¿Qué informa el análisis?',
      options: [
        'La pendiente es 1,078 ± 0,024',
        'La recta no describe estos datos, así que su pendiente y su incertidumbre no son un resultado: de este ajuste no se afirma ninguna pendiente',
        'La pendiente es 1,078 con la incertidumbre multiplicada por la raíz cuadrada de 7,6, para que el chi cuadrado reducido sea 1',
        'La pendiente es 1,078 ± 0,024, con una nota de que el ajuste es malo',
      ],
      misconceptions: [
        {
          say: 'Reescalar los errores hace que los números parezcan coherentes y conserva un modelo que los datos ya han rechazado. La solución es otro modelo, no una barra de error mayor sobre el equivocado.',
        },
        {
          say: 'Una nota no deshace el número: la pendiente y su ± se dan como resultado, y la incertidumbre es formal solo para un modelo que ajusta.',
        },
      ],
      hints: ['Pregunta primero si el modelo describe los datos.'],
      because:
        'Se rechaza el modelo. Una incertidumbre formal solo significa algo cuando el modelo describe los datos, y aquí un chi cuadrado reducido de 7,6 con un valor p inferior a 0,001 dice que no los describe. La respuesta honesta es el rechazo y un modelo mejor, no un número.',
    },
    {
      title: 'Un modelo con un término más',
      body: 'Cambia el ajuste a una <strong>parábola</strong> (tres términos). Lee el chi cuadrado reducido y el coeficiente del término al cuadrado.',
      fields: [
        { label: 'Chi cuadrado reducido' },
        { label: 'Coeficiente del término al cuadrado' },
      ],
    },
    {
      title: '¿Qué rechazarías?',
      body: 'Has visto dos maneras en que un método puede no tener nada honesto que dar: un parámetro que los datos no fijan, y un modelo que los datos rechazan.',
      prompt:
        'En dos o tres frases: para cada una, ¿qué diría el análisis en lugar de un número, y qué comprobarías antes de dar un número?',
    },
    {
      title: 'Lo que has deducido',
      body: 'Unos datos que solo fijan un producto dan una cota inferior de un factor y ninguna por encima: el perfil es plano, y el resultado honesto es un límite inferior con «no acotado» más allá. Un número como el propio producto, o el medio del intervalo, inventaría una medición. Un ajuste cuyo chi cuadrado reducido es muy superior a 1 tiene un modelo que los datos rechazan, y su incertidumbre formal no es un resultado; un modelo con un término más puede ajustar y aun así no queda demostrado. Los dos conjuntos de datos eran sintéticos, con la verdad incorporada. El método con datos reales tendrá los mismos rechazos, y son hallazgos.',
    },
  ],
};

/** By lesson id: what instructorLocale.js registers. */
export default {
  'what-is-a-measurement': WHAT_IS_A_MEASUREMENT,
  'what-does-plus-minus-claim': WHAT_DOES_PLUS_MINUS_CLAIM,
  'when-the-method-must-refuse': WHEN_THE_METHOD_MUST_REFUSE,
};
