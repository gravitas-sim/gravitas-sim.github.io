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
      rubric:
        'Crédito completo por informar la media de las marcas (unos 31,1 píxeles) con su error estándar (unos 0,36 píxeles, la dispersión dividida entre la raíz del número de marcas), y por decir que una marca es una extracción de la dispersión, de modo que la siguiente difiere. También se acredita decir que el error estándar deja fuera un desplazamiento constante. No se acredita informar solo la primera marca, ni decir que las marcas son errores que hay que descartar.',
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
      rubric:
        'Crédito completo por decir que la afirmación 4,2 ± 0,3 (1σ) trata de repeticiones: un intervalo construido así contiene el valor verdadero en unas dos de cada tres repeticiones (68 por ciento); que la comprobación es repetir la medición muchas veces, o simularla con una verdad conocida, y contar cuántas veces el intervalo contiene la verdad; y que la afirmación es falsa si esa proporción está lejos del 68 por ciento más allá de su propia incertidumbre de conteo (por ejemplo, cerca del 36 por ciento para un instrumento sesgado). No se acredita decir que el valor verdadero está en este intervalo con probabilidad del 68 por ciento, ni que un ± pequeño significa que el valor es correcto.',
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
      rubric:
        'Crédito completo por decir que, para un parámetro que los datos no fijan (solo se acota un producto de dos), el análisis informa una cota o no acotado, con la combinación que sí se fija, en lugar de un valor; que, para un modelo que los datos rechazan (un chi cuadrado reducido muy superior a 1 y un valor p diminuto), dice que el modelo no ajusta y no da pendiente; y por nombrar la comprobación: el perfil de chi cuadrado frente al parámetro, y el chi cuadrado reducido y el valor p del ajuste. No se acredita citar el mejor ajuste con su error formal.',
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

// Las investigaciones de imágenes (Prompt 191): tres más, paso a paso con el inglés.
export const MEASURING_THE_MOON = {
  title: 'Medir la Luna',
  subtitle:
    'Marcas sobre una imagen real, una escala a partir de una longitud conocida y un tamaño en kilómetros',
  objectives: [
    'Decir por qué una imagen no tiene escala propia, y de dónde sale una escala',
    'Dar a una imagen real una escala a partir de una longitud conocida, y leer un tamaño en kilómetros de un círculo sobre ella',
    'Predecir el tamaño de un accidente antes de medirlo, y decir qué incluye la incertidumbre indicada y qué deja fuera',
    'Decir por qué esta imagen se puede marcar y medir en píxeles pero no leer su brillo',
  ],
  steps: [
    {
      title: 'Una imagen real de la Luna',
      body: 'Esta es una imagen <strong>real</strong>: la Luna, fotografiada por la sonda Galileo de la NASA el 7 de diciembre de 1992 al pasar junto a la Tierra camino de Júpiter. Es un compuesto en color realzado, mostrado aquí en gris. <em>Realzado</em> significa que se estiró el contraste para mostrar diferencias en el terreno, así que sus niveles de gris son para el ojo y no miden la luz que refleja la Luna. El Observatorio llama a una imagen así <strong>solo para mostrar</strong>: puedes marcarla y medirla en píxeles, y nada más.\n\nUna imagen no tiene escala propia. Esta mide 496 píxeles de ancho, y un píxel no es un kilómetro. Los píxeles se numeran desde abajo a la izquierda, x hacia la derecha e y hacia arriba, y el disco está recortado muy justo: su borde derecho toca la última columna. En esta investigación das a la imagen una escala y tomas una medida de ella.',
    },
    {
      title: '¿Qué da escala a una imagen?',
      body: 'Quieres una longitud sobre la imagen en kilómetros, y solo tienes píxeles.',
      prompt: 'Para convertir píxeles en kilómetros necesitas&hellip;',
      options: [
        'la fecha en que se tomó la imagen',
        'una longitud en la imagen que ya conoces en kilómetros',
        'el brillo de la Luna en la imagen',
        'el número de colores de la imagen',
      ],
      hints: [
        '¿De dónde podría salir una longitud en kilómetros, sin nada más en la imagen?',
      ],
      because:
        'Una longitud en la imagen que ya conoces. Una imagen registra ángulos y píxeles y nunca dice a qué distancia está la cosa, así que la única vía a una escala es señalar algo en ella cuyo tamaño conozcas por otros medios. Aquí es la propia Luna, cuyo diámetro medio, 3474,8 km, se midió por otros medios.',
    },
    {
      title: 'Un par de referencia a través del disco',
      body: 'Marca el ancho completo del disco con un <strong>par de referencia</strong>: una línea a lo largo de la horizontal por el centro del disco (fila 245), de su borde izquierdo a su borde derecho. Pon el extremo izquierdo en <strong>3</strong> y el derecho en <strong>496</strong>. Se toma que el par abarca 3474,8 km, el diámetro medio de la Luna. Lee su longitud en píxeles y la escala que da.\n\nEl extremo derecho está sobre la última columna del cuadro, así que el disco puede ser uno o dos píxeles más ancho que la imagen. Tenlo presente: no está en la incertidumbre que indica la herramienta.',
      fields: [
        { label: 'Longitud del par' },
        { label: 'Escala a partir del par, en km por píxel' },
      ],
    },
    {
      title: 'Por qué la escala sale de ti',
      body: 'El Observatorio puede dar a una imagen una escala en segundos de arco por píxel cuando la imagen lleva coordenadas del mundo, y se niega a hacerlo con esta imagen. La escala que acabas de hacer salió de un par que marcaste.',
      prompt: '¿Por qué la escala tiene que salir de un par que marcas tú?',
      options: [
        'La imagen la tomó una sonda, así que no tiene píxeles',
        'La imagen no lleva coordenadas ni unidades para sus píxeles, así que no se puede leer de ella ninguna escala; la única escala es la que haces a partir de una longitud conocida',
        'El Observatorio no se fía de las imágenes de la NASA',
        'Solo hace falta escala en las imágenes en color',
      ],
      misconceptions: [
        {
          say: 'Toda imagen digital tiene píxeles. Lo que a esta le falta es un registro de lo que vale un píxel en el cielo o en el terreno.',
        },
        {
          say: 'No es cuestión de confianza. Una imagen para mostrar se estiró y recodificó para el ojo, y nadie registró una escala; una escala que indicas tú es tuya, y la herramienta la muestra como tal.',
        },
      ],
      hints: ['¿Qué registra la imagen sobre sus propios píxeles?'],
      because:
        'La imagen no lleva coordenadas ni unidades, así que nada en ella dice lo que vale un píxel. Una escala hecha a partir de una longitud conocida es una medida tuya, con el supuesto escrito al lado, y es la única clase que esta imagen permite.',
    },
    {
      title: '¿Cuán ancha es la llanura oscura?',
      body: 'Cerca del centro del disco hay una gran llanura oscura, casi redonda, con su centro cerca de x = 289, y = 306. Las llanuras oscuras de la Luna son antiguas coladas de lava. Antes de medirla, mírala junto al disco entero.',
      prompt: 'De lado a lado, la llanura mide unos&hellip;',
      options: ['6 km', '60 km', '600 km', '6000 km'],
      hints: [
        'Toda la Luna mide unos 3500 km de ancho. ¿Qué parte de ella es la llanura?',
      ],
      because:
        'Unos 600 km, algo menos de una quinta parte del ancho de la Luna: la llanura abarca más o menos una quinta parte del disco y el disco mide 3475 km. El paso siguiente la mide.',
    },
    {
      title: 'Un círculo sobre la llanura',
      body: 'El par se queda a través del disco. El círculo empieza en x = 289, y = 306. Cambia el <strong>radio</strong> hasta que el círculo siga el borde de la llanura oscura, y mueve el centro si el círculo se va hacia un lado. Lee el diámetro del círculo en kilómetros.',
      fields: [{ label: 'Diámetro del círculo' }],
    },
    {
      rubric:
        'Crédito completo por nombrar dos cosas que cambian el diámetro, por ejemplo dónde se coloca el borde de la llanura (un borde suave, así que dos personas cuidadosas difieren en unos píxeles), dónde se colocan los dos extremos del par, el diámetro supuesto de la Luna, o el recorte de la imagen a la derecha, y por decir que la incertidumbre indicada de unos 6 km incluye solo el redondeo de cada colocación, y deja fuera lo suave del borde y los supuestos. No dar crédito por decir que el número es exacto, ni que más marcas del mismo tipo quitan los supuestos.',
      title: '¿Qué cambiaría el número?',
      body: 'La herramienta indica el diámetro como unos 634 &plusmn; 6 km. Dos personas que ajusten el círculo a ojo no coincidirán en 6 km.',
      prompt:
        'En dos o tres frases: nombra dos cosas que cambiarían el diámetro que obtuviste, y di cuál de ellas incluye la incertidumbre indicada.',
    },
    {
      title: 'Lo que has deducido',
      body: 'Una imagen no tiene escala hasta que se la das, y la escala que le das es una medida tuya, apoyada en una longitud que supusiste y en dos marcas que colocaste. Con ella, un círculo sobre un accidente dio un tamaño en kilómetros, unos 630 km para la llanura, y la incertidumbre indicada por la herramienta cubría solo el redondeo de tus marcas. Lo suave del borde, el recorte a la derecha y el diámetro supuesto no están en ella. Y como la imagen es para mostrar, sus niveles de gris no son luz: mediste dónde están las cosas y cuán grandes son, y nada sobre su brillo.',
    },
  ],
};

export const HOW_FAR_IS_THAT_STAR = {
  title: '¿A qué distancia está esa estrella?',
  subtitle:
    'Un desplazamiento, un movimiento y un paralaje a partir de catorce posiciones de una estrella',
  objectives: [
    'Decir por qué un desplazamiento entre dos posiciones no es una distancia, y qué supone un desplazamiento entre dos épocas',
    'Decir por qué un movimiento propio recto no puede describir una estrella con paralaje, y leer el chi cuadrado que lo dice',
    'Leer un paralaje y una distancia con un intervalo a partir de una serie bien muestreada, y decir qué afirma el intervalo',
    'Decir qué deja fuera un paralaje relativo, y por qué se rechazan muy pocas épocas',
  ],
  steps: [
    {
      title: 'Una estrella, catorce fechas',
      body: 'Se ha medido la posición de una estrella en el cielo en catorce fechas durante casi dos años. Los datos son <strong>sintéticos</strong>: se puso una estrella a una distancia y con un movimiento que elegimos, vista desde la órbita real de la Tierra, y a cada posición se le dio un error aleatorio de 4 milisegundos de arco (mas). La verdad queda oculta hasta el final.\n\nDos cosas mueven una estrella en el cielo. Su propio movimiento por el espacio, su <strong>movimiento propio</strong>, es constante. El movimiento de la Tierra alrededor del Sol hace que una estrella cercana trace un pequeño lazo una vez al año, su <strong>paralaje</strong>, y cuanto más cerca está la estrella, mayor es el lazo. Un paralaje de p segundos de arco es una distancia de 1/p pársecs.',
    },
    {
      title: '¿Da un desplazamiento una distancia?',
      body: 'Toma la primera y la última de las catorce posiciones. Difieren: la estrella se ha movido.',
      prompt: 'Ese desplazamiento entre dos posiciones&hellip;',
      options: [
        'da la distancia: cuanto mayor el desplazamiento, más cerca la estrella',
        'no distingue el movimiento propio de la estrella de un paralaje, así que no da ninguna distancia',
        'da la distancia si las dos posiciones distan un año',
        'es cero, porque las estrellas no se mueven',
      ],
      hints: [
        '¿Qué más, además de la distancia, mueve una estrella entre dos fechas?',
      ],
      because:
        'No los distingue. Entre dos fechas la estrella se ha movido por su propio movimiento y por una parte distinta de su lazo anual, y un par de posiciones no puede decir cuánto es de cada cosa. La herramienta etiqueta un resultado así como un desplazamiento bajo un supuesto de movimiento fijo, y no da paralaje ni distancia para él.',
    },
    {
      title: 'El desplazamiento, de la primera a la última',
      body: 'Pon <strong>Qué ajustar</strong> en el desplazamiento entre dos épocas y usa las 14 épocas, de modo que el desplazamiento vaya de la primera posición a la última. Lee el tamaño del desplazamiento y la velocidad que sería si todo fuera movimiento.',
      fields: [
        { label: 'Tamaño del desplazamiento' },
        {
          label:
            'Velocidad si todo fuera movimiento, en segundos de arco por año',
        },
      ],
    },
    {
      title: '¿Describe una recta la trayectoria?',
      body: 'Ahora ajusta las catorce posiciones solo con un movimiento propio: una recta a velocidad constante, sin paralaje.',
      prompt: 'Una recta&hellip;',
      options: [
        'describirá la trayectoria, porque las estrellas se mueven en línea recta',
        'no la describirá, porque el lazo anual queda fuera de cualquier recta',
        'la describirá si los errores se hacen suficientemente grandes',
        'la describirá, porque el lazo es menor que los errores',
      ],
      hints: [
        'El lazo mide unos 60 mas de ancho. ¿Cuán grande es el error de una posición?',
      ],
      because:
        'No. El lazo es unas quince veces el error de 4 mas de una posición, así que cada posición fuera de la recta lo está por mucho. Un modelo que no puede hacer un lazo no puede describir una estrella que lo hace.',
    },
    {
      title: 'La recta, juzgada',
      body: 'Pon <strong>Qué ajustar</strong> en el movimiento propio, con 14 épocas. Lee el chi cuadrado del ajuste y sus grados de libertad: 28 números (14 posiciones en dos coordenadas) menos los cuatro que tiene la recta.',
      fields: [
        { label: 'Chi cuadrado del ajuste' },
        { label: 'Grados de libertad' },
      ],
    },
    {
      title: 'Paralaje y movimiento juntos',
      body: 'Pon <strong>Qué ajustar</strong> en paralaje y movimiento, con 14 épocas. Lee el paralaje, su incertidumbre y la distancia.',
      fields: [
        { label: 'Paralaje, relativo' },
        { label: 'Incertidumbre del paralaje' },
        { label: 'Distancia, 1 sobre el paralaje' },
      ],
    },
    {
      title: 'Lo que dice el intervalo',
      body: 'La herramienta da la distancia como 16,59 pc, con un intervalo del 68 por ciento de 16,18 a 17,02 pc y un intervalo del 95 por ciento de 15,80 a 17,45 pc. El paralaje tiene una incertidumbre de 1,53 mas.',
      prompt: '¿Qué frase respalda el resultado?',
      options: [
        'La estrella está a 16,59 pc, exactamente',
        'Si las estrellas de referencia no tienen paralaje propio, la distancia es de unos 16,6 pc, y repetir la medición daría un intervalo que contiene la distancia verdadera unas dos veces de cada tres',
        'La estrella está seguramente entre 16,18 y 17,02 pc',
        'La estrella está a 16,59 pc, más o menos 1,53 pc',
      ],
      misconceptions: [
        {
          say: 'Uno sobre el paralaje es el medio de un intervalo y no una distancia exacta: con un error en el paralaje, la distancia tiene uno también, y ni siquiera es simétrico.',
        },
        {
          say: 'Un intervalo del 68 por ciento es una afirmación sobre repeticiones: una de cada tres lo fallaría. «Seguramente» es una afirmación que ningún intervalo hace.',
        },
        {
          say: 'El 1,53 es la incertidumbre del paralaje, en milisegundos de arco. El intervalo propio de la distancia sale de uno sobre los extremos del del paralaje, y no es de 1,53 pársecs.',
        },
      ],
      hints: [
        'Un intervalo dice qué harían las repeticiones, y el marco en que se mide el paralaje importa.',
      ],
      because:
        'El intervalo es una afirmación sobre repeticiones de la medición, como en ¿Qué afirma el ±?, y sobre el marco: el paralaje es relativo a las estrellas de referencia, así que la distancia nunca es menor que la verdadera si ellas tienen un paralaje propio.',
    },
    {
      title: 'Solo seis épocas',
      body: 'Pon <strong>Épocas usadas</strong> en 6, y deja paralaje y movimiento. Las seis primeras épocas cubren 0,74 de un año.',
      prompt: '¿Qué informa la herramienta?',
      options: [
        'Un paralaje del mismo tamaño, con una barra de error mayor',
        'Sin restricción: un paralaje necesita al menos ocho épocas que muestreen la órbita de la Tierra, así que no da ningún número',
        'Un paralaje de cero, porque el lazo no está completo',
        'El movimiento propio, rebautizado como paralaje',
      ],
      misconceptions: [
        {
          say: 'Con muy pocas épocas, o muy poca órbita, el lazo no queda fijado en absoluto, así que una barra más ancha seguiría ocultando que se inventó un número.',
        },
        {
          say: 'El cero también es una medición, y no es lo que dicen los datos: no dicen nada. El rechazo es la respuesta honesta.',
        },
      ],
      hints: ['Lee la línea que empieza con «Sin restricción».'],
      because:
        'Sin restricción. Un paralaje es la parte de la trayectoria de la estrella que se repite cada año, así que las épocas deben muestrear ese lazo; la herramienta exige ocho épocas durante al menos 0,9 de un año y no da ningún número por debajo. Un rechazo es un resultado, no un fallo.',
    },
    {
      rubric:
        'Crédito completo por decir que un paralaje necesita cobertura de cerca de un año porque es la parte del movimiento que se repite cada año y hay que distinguirla del movimiento propio constante, y que un paralaje relativo se mide frente a estrellas de referencia que tienen paralaje propio, así que es menor que el absoluto en su paralaje medio y la distancia que sale es demasiado grande. No dar crédito por decir que la distancia es exacta, ni que relativo significa aproximado.',
      title: 'Por qué un año, y qué significa relativo',
      body: 'Dos cosas limitaron esta distancia más allá de su intervalo: cuántas épocas había, y el marco en que se mide el paralaje.',
      prompt:
        'En dos o tres frases: ¿por qué un paralaje necesita épocas que cubran cerca de un año, y qué dice «relativo» del paralaje que lees?',
    },
    {
      title: 'Lo que has deducido',
      body: 'Un desplazamiento entre dos posiciones mezcla el movimiento propio de una estrella con un paralaje y no da distancia. Un movimiento propio recto ajustado a una estrella con paralaje lo rechaza su propio chi cuadrado, aquí 1576 con 24 grados de libertad. Con el lazo en el modelo, catorce épocas dieron 60,3 &plusmn; 1,5 mas, unos 16,6 pársecs, con un intervalo, y con seis épocas la herramienta no dio nada, que es la respuesta correcta. El paralaje es relativo a las estrellas de referencia, así que la distancia nunca es menor que la verdadera. Los datos eran sintéticos; la estrella se hizo a 16,67 pársecs, un paralaje de 60 mas, y el intervalo lo contiene.',
    },
  ],
};

export const A_BINARY_STARS_ORBIT = {
  title: 'La órbita de una estrella binaria',
  subtitle:
    'Posiciones durante dieciséis años, la órbita que fijan y la masa del par',
  objectives: [
    'Decir por qué la trayectoria de una compañera en el cielo es una elipse incluso para una órbita circular, y por qué se rechaza un modelo circular para una órbita excéntrica',
    'Leer una órbita a partir de posiciones en el tiempo, con su período, tamaño y excentricidad y sus incertidumbres',
    'Convertir el tamaño de la órbita y un paralaje en unidades astronómicas, y el período y el tamaño en una suma de masas por la tercera ley de Kepler',
    'Decir qué fijan las posiciones de una binaria y qué dejan abierto: la masa de cada estrella, el nodo y la distancia que hay tras la suma',
  ],
  steps: [
    {
      title: 'Una compañera, doce fechas',
      body: 'Una estrella binaria son dos estrellas que giran una alrededor de otra. Aquí se ha medido la posición de la más tenue, respecto de la más brillante, en doce fechas durante dieciséis años, cada una con un error de 15 milisegundos de arco. Los datos son <strong>sintéticos</strong>: una binaria de elementos que elegimos, vista en ángulo, con errores aleatorios. La verdad queda oculta hasta el final.\n\nLa trayectoria en el cielo es la órbita vista en ángulo. Su tamaño en segundos de arco, a, y su período, P, es lo que fijan las posiciones. La tercera ley de Kepler da entonces la masa del par, M = a³/P² en masas solares cuando a está en unidades astronómicas y P en años, y a en unidades astronómicas necesita la distancia: un paralaje de p segundos de arco hace a (ua) = a (segundos de arco)/p. Las posiciones solas fijan solo la <em>suma</em> de las dos masas.',
    },
    {
      title: '¿Qué forma tiene la trayectoria en el cielo?',
      body: 'Supón que la órbita verdadera fuera un círculo perfecto, inclinado respecto de verlo de frente.',
      prompt: 'La trayectoria de la compañera en el cielo sería&hellip;',
      options: [
        'siempre un círculo',
        'una elipse, salvo que la órbita se vea exactamente de frente',
        'una línea recta',
        'una espiral, porque las estrellas se atraen',
      ],
      hints: ['¿Qué aspecto tiene un círculo inclinado?'],
      because:
        'Una elipse. Un círculo visto en ángulo queda acortado en una dirección y es una elipse, así que una elipse en el cielo no significa por sí sola una órbita excéntrica. El ajuste las separa: pregunta a los datos si un círculo, visto en algún ángulo, los describe.',
    },
    {
      title: 'Primero, una órbita circular',
      body: 'Pon <strong>Modelo de órbita</strong> en circular, con las doce épocas, y lee qué dice la herramienta.',
      prompt: '¿Qué informa la herramienta?',
      options: [
        'Una órbita circular con un período de 13,3 años',
        'Sin restricción: los residuos son mucho mayores que los errores indicados, así que una órbita circular no describe estas posiciones',
        'Una órbita de excentricidad cero y la masa del par',
        'Una órbita circular, con una nota de que el ajuste es malo',
      ],
      misconceptions: [
        {
          say: 'La herramienta sí ajusta un período, 13,3 años, y luego lo rechaza: un número de un modelo que los datos rechazan no es un resultado.',
        },
        {
          say: 'Una nota no deshace el número. El chi cuadrado, 5225 con 19 grados de libertad, dice que el modelo es erróneo, y la herramienta no da órbita.',
        },
      ],
      hints: ['Lee la línea que empieza con «Sin restricción».'],
      because:
        'Se rechaza el modelo circular. Su chi cuadrado es 5225 con 19 grados de libertad: las posiciones lo fallan por unas dieciséis veces su propia barra de error cada una. La órbita es excéntrica, y los datos lo dicen.',
    },
    {
      title: 'La órbita elíptica',
      body: 'Pon <strong>Modelo de órbita</strong> en elíptica, con las doce épocas. Lee el período, el semieje mayor y la excentricidad.',
      fields: [
        { label: 'Período' },
        { label: 'Semieje mayor' },
        { label: 'Excentricidad' },
      ],
    },
    {
      title: 'La órbita en unidades astronómicas',
      body: 'El paralaje de la binaria, relativo a sus estrellas de referencia, es de 100 mas: 0,100 segundos de arco. Convierte el semieje mayor de 0,908 segundos de arco en unidades astronómicas.',
      prompt: 'El semieje mayor',
      hints: [
        'a en ua es a en segundos de arco dividido entre el paralaje en segundos de arco.',
      ],
      worked:
        '0,908 ÷ 0,100 = 9,08 ua. A 10 pársecs un segundo de arco son 10 ua, así que los 0,908 segundos de arco de la órbita son 9,08 ua, algo más que la distancia del Sol a Saturno.',
      feedback: {
        close:
          'Casi. Divide el ángulo entre el paralaje, ambos en segundos de arco.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: divide entre 0,100 segundos de arco, no entre 100.',
        off: 'a (segundos de arco) ÷ paralaje (segundos de arco).',
      },
    },
    {
      title: 'La masa del par',
      body: 'Con el paralaje en 100 mas, lee la suma de masas y su intervalo del 68 por ciento. El intervalo sale de la incertidumbre de la órbita y de la del paralaje, 4 mas, juntas.',
      fields: [
        { label: 'Suma de masas' },
        {
          label: 'Suma de masas, extremo bajo del intervalo del 68 por ciento',
        },
        {
          label: 'Suma de masas, extremo alto del intervalo del 68 por ciento',
        },
      ],
    },
    {
      title: 'Solo las seis primeras épocas',
      body: 'Pon <strong>Épocas usadas</strong> en 6 con el modelo elíptico. Las seis primeras épocas cubren siete años de una órbita de catorce.',
      prompt: '¿Qué informa la herramienta?',
      options: [
        'La misma órbita con barras de error mayores',
        'Sin restricción: una órbita elíptica necesita al menos ocho épocas, así que no da ninguna órbita',
        'En su lugar una órbita circular, porque el arco es corto',
        'Solo el período, ya que es el elemento mejor fijado',
      ],
      misconceptions: [
        {
          say: 'Con seis posiciones los siete elementos no quedan todos fijados, así que no hay órbita a la que poner barras.',
        },
        {
          say: 'La herramienta no cambia a un modelo que los datos rechazan. Un ajuste circular de esta binaria se rechaza también.',
        },
      ],
      hints: ['Lee la línea que empieza con «Sin restricción».'],
      because:
        'Sin restricción. Una órbita elíptica tiene siete parámetros y necesita al menos ocho épocas, que cubran bastante del período; seis no dan nada. Como con la estrella, el rechazo es la respuesta.',
    },
    {
      rubric:
        'Crédito completo por decir que las posiciones fijan solo la suma de las dos masas, no cada una (hace falta el movimiento de las estrellas alrededor de su centro común, o velocidades radiales, para repartirla), y que la suma depende de la distancia al cubo, así que el paralaje y su marco (relativo, de modo que la distancia y la suma salen altas) pasan a la masa. No dar crédito por decir que la suma es exacta o que el intervalo es solo el de la órbita.',
      title: 'Lo que necesita la suma',
      body: 'La suma de masas salió de una órbita y un paralaje, cada uno con una incertidumbre.',
      prompt:
        'En dos o tres frases: ¿qué no dicen las posiciones sobre las masas, y qué dato de entrada de la suma es el más peligroso de equivocar?',
    },
    {
      title: 'Lo que has deducido',
      body: 'Doce posiciones durante dieciséis años fijaron una órbita: un período de 14,13 &plusmn; 0,06 años, un semieje mayor de 0,908 segundos de arco y una excentricidad de 0,44. Un círculo se rechazó de plano, y seis épocas no dieron nada. Con un paralaje de 100 mas la órbita mide 9,08 ua de ancho y el par pesa unas 3,8 masas solares, entre 3,3 y 4,2 al 68 por ciento. Las posiciones fijan solo la suma, y la suma es el cubo de la distancia: el paralaje es el eslabón más débil. Los datos eran sintéticos, hechos con un período de 14,2 años, una excentricidad de 0,45, un semieje mayor de 0,9 segundos de arco y un paralaje de 100 mas, y el ajuste los contiene.',
    },
  ],
};

// ¿Qué superficie es más antigua?: paso a paso con el inglés (Prompt 195).
export const WHICH_SURFACE_IS_OLDER = {
  title: '¿Qué superficie es más antigua?',
  subtitle:
    'Cráteres por área en dos regiones de la Luna y de Marte, y el cociente que dice cuál es más antigua',
  objectives: [
    'Decir por qué los cráteres por área, y no los cráteres, dicen cuál de dos superficies es más antigua',
    'Contar los cráteres por encima de un diámetro en dos regiones, hallar cada densidad con su intervalo y predecir cuál es más antigua antes de leer el cociente',
    'Leer un cociente de densidades y su intervalo, y decir qué significa y qué no significa un intervalo que contiene el 1',
    'Nombrar lo que puede hacer que una superficie parezca más antigua o más joven de lo que es: la renovación de la superficie, la saturación y los cráteres secundarios',
  ],
  steps: [
    {
      title: 'Dos superficies, un reloj',
      body: 'Una superficie empieza sin cráteres y los va acumulando a medida que la golpean. Si el ritmo de impactos es más o menos el mismo en todas partes, una superficie que ha tenido más tiempo para acumularlos tiene más cráteres <strong>por área</strong>. Esa es la idea de contar cráteres: la densidad de cráteres dice cuál de dos superficies es más <strong>antigua</strong>, en relación con la otra.\n\nEl instrumento muestra dos regiones de la Luna (unas tierras altas y un mar liso y oscuro) y dos de Marte. Los círculos de las imágenes son los cráteres que enumera un <strong>catálogo</strong>, hecho por sus autores a partir de otros datos: nadie ha marcado estas imágenes, y nada de esto es un recuento tuyo. Lo que haces es elegir un diámetro, leer los números y decir qué muestran y qué no. Un cociente de densidades <em>no</em> es una edad en años.',
    },
    {
      title: '¿Cuál tiene más?',
      body: 'Piensa en dos regiones de la Luna: unas tierras altas claras y accidentadas en el sur, y el oscuro y liso Mar de la Tranquilidad. Cuenta solo los cráteres de al menos 30 km de diámetro.',
      prompt: 'Por área, las tierras altas tendrán&hellip;',
      options: [
        'más o menos la misma densidad de cráteres que el mar',
        'una densidad de cráteres mucho mayor que el mar',
        'una densidad de cráteres mucho menor que el mar, porque el mar es la región más grande',
        'una densidad mayor solo si es la región más grande: la densidad es solo el recuento',
      ],
      hints: [
        'Los mares oscuros son lava que inundó el terreno bajo mucho después de que se formaran las tierras altas. ¿Qué hace la lava fresca con los cráteres que hay debajo?',
      ],
      because:
        'Una densidad mucho mayor. La lava enterró los cráteres que ya había en el mar, así que empezó a contar de nuevo desde la inundación, mientras que las tierras altas llevan contando desde mucho antes. El paso siguiente lee los recuentos.',
    },
    {
      title: 'Cuenta los cráteres de al menos 30 km',
      body: 'Elige la <strong>Luna</strong> y pon el diámetro en <strong>30 km</strong>. Lee cuántos cráteres de al menos 30 km de diámetro tienen las tierras altas y cuántos el mar.',
      fields: [
        { label: 'Cráteres en las tierras altas lunares' },
        { label: 'Cráteres en el mar lunar' },
      ],
    },
    {
      title: 'Por millón de kilómetros cuadrados',
      body: 'Las tierras altas cubren unos 305 mil km² y el mar unos 341 mil, así que los recuentos no están en pie de igualdad. Lee la <strong>densidad</strong> de cada una, en cráteres por millón de km², en las dos filas de región.',
      fields: [
        { label: 'Densidad de las tierras altas, por millón de km²' },
        { label: 'Densidad del mar, por millón de km²' },
      ],
    },
    {
      title: '¿Cuánto más densa, y con cuánta seguridad?',
      body: 'Lee el <strong>cociente de densidades</strong>, tierras altas entre mar, y el <strong>extremo inferior de su intervalo del 95 por ciento</strong>. El intervalo se calcula exactamente a partir de los dos recuentos (un intervalo de Clopper&ndash;Pearson para la proporción de cráteres que caen en las tierras altas).',
      fields: [
        { label: 'Cociente de densidades, tierras altas entre mar' },
        { label: 'Extremo inferior del intervalo' },
      ],
    },
    {
      title: '¿Qué dice el intervalo?',
      body: 'El cociente es 6,4, con un intervalo de 2,8 a 16,9.',
      prompt: '¿Cuál es la mejor lectura?',
      options: [
        'Las tierras altas son más densas que el mar; cuánto más es incierto en un factor de unos seis',
        'Las tierras altas son 6,4 veces más antiguas que el mar, en años',
        'El intervalo es tan ancho que los recuentos no dicen nada',
        'El cociente es 6,4, y el intervalo es solo la incertidumbre del área',
      ],
      misconceptions: [
        {
          say: 'Un cociente de densidades no es un cociente de edades en años. Los cráteres se acumulan a un ritmo que ha cambiado, y convertir una densidad en años necesita una cronología y correcciones que esta investigación no aplica.',
        },
        {
          say: 'El intervalo excluye el 1, y eso es un hallazgo: las dos densidades difieren. Un intervalo ancho limita el tamaño de la diferencia, no su sentido.',
        },
        {
          say: 'El intervalo es la variación por azar en cuántos cráteres cayeron en cada área. Las áreas tienen su propia incertidumbre, menor, que no está en él.',
        },
      ],
      hints: [
        'El intervalo contiene los cocientes que los recuentos no pueden descartar. ¿Es el 1 uno de ellos?',
      ],
      because:
        'El intervalo no contiene el 1, así que las tierras altas son más densas. Su anchura, de 2,8 a 16,9, es la incertidumbre honesta de un recuento de 40 y otro de 7.',
    },
    {
      title: 'La misma pregunta en Marte',
      body: 'Pasa a <strong>Marte</strong>: unas tierras altas (Terra Sabaea) y unas llanuras de lava jóvenes (Elysium Planitia), de 12&deg; por 12&deg; cada una. En Marte el recuento es completo desde 20 km, así que pon el diámetro en <strong>20 km</strong>. Lee el cociente de densidades, tierras altas entre llanuras, y el extremo inferior de su intervalo.',
      fields: [
        { label: 'Cociente de densidades, tierras altas entre llanuras' },
        { label: 'Extremo inferior del intervalo' },
      ],
    },
    {
      title: 'Cuando el veredicto es «ninguna diferencia significativa»',
      body: 'Sube el diámetro en Marte a 60 km. Solo 12 cráteres de las tierras altas y 4 de las llanuras son tan grandes, y el instrumento lee ahora un cociente de 3,0 con un intervalo de 0,91 a 12,8, y el veredicto &ldquo;ninguna diferencia significativa&rdquo;.',
      prompt: '¿Qué significa ese veredicto?',
      options: [
        'Las dos superficies tienen la misma edad',
        'Estos recuentos, a este diámetro, no pueden distinguir las dos: el intervalo contiene el 1',
        'El recuento a 60 km está mal, porque el veredicto a 20 km era distinto',
        'Las llanuras son más antiguas, porque 4 es menor que 12',
      ],
      misconceptions: [
        {
          say: '«Ninguna diferencia significativa» no es un hallazgo de igualdad. El intervalo de 0,91 a 12,8 incluye cocientes cercanos a 1 y cocientes cercanos a 13: los recuentos los dejan todos abiertos.',
        },
        {
          say: 'Los dos son correctos. Subir el diámetro deja solo los cráteres mayores, así que hay menos y el intervalo es más ancho. El veredicto a 20 km salía de 105 cráteres, este de 16.',
        },
      ],
      hints: ['¿De cuántos cráteres sale ahora el cociente?'],
      because:
        'El intervalo, de 0,91 a 12,8, contiene el 1. Con 12 y 4 cráteres, el azar solo puede dar un cociente de 3 con dos superficies igual de antiguas. Contar hacia cráteres más pequeños, donde hay más, es lo que vuelve a estrechar el intervalo.',
    },
    {
      title:
        '¿Qué podría hacer que una superficie parezca más antigua de lo que es?',
      body: 'Un cociente de densidades supone que los cráteres cayeron de forma independiente, a un ritmo constante, y se quedaron. Las superficies reales rompen estas suposiciones. Un impacto grande lanza escombros que cavan miles de pequeños <strong>cráteres secundarios</strong> cerca, todos a la vez.',
      prompt:
        'Si esos secundarios se cuentan como cráteres normales, la superficie parecerá&hellip;',
      options: [
        'más antigua de lo que es: tiene más cráteres de los que hizo su propia historia de impactos',
        'más joven de lo que es: tantos cráteres se solapan que se borran unos a otros',
        'sin diferencia, porque los cráteres pequeños cuentan igual que los grandes',
        'sin diferencia, porque el intervalo de Poisson ya lo tiene en cuenta',
      ],
      misconceptions: [
        {
          say: 'Borrar cráteres es saturación, que hace que una superficie muy antigua parezca más joven de lo que es: los cráteres nuevos destruyen a los viejos y el recuento deja de crecer. Los secundarios hacen lo contrario.',
        },
        {
          say: 'Los cráteres pequeños no cuentan igual: son los que más afectan los secundarios y la saturación, y los más difíciles de ver por completo. Por eso se cuenta por encima de un diámetro en el que el recuento es completo.',
        },
        {
          say: 'El intervalo tiene en cuenta el azar en el número de cráteres independientes. Los secundarios no son independientes: llegan en grupos, y entonces el intervalo es demasiado estrecho.',
        },
      ],
      hints: [
        'Un cráter secundario lo hace un trozo de un impacto grande, no un impacto propio.',
      ],
      because:
        'Más antigua de lo que es. La renovación de la superficie oculta cráteres viejos y hace que parezca más joven; la saturación hace lo mismo; los secundarios añaden cráteres que no son independientes y la hacen parecer más antigua. Una edad relativa supone que nada de eso ha ocurrido, y lo dice.',
    },
    {
      title: 'Lo que has deducido',
      body: 'Por encima de 30 km las tierras altas lunares tienen 131 cráteres por millón de km² y el mar 20,5, un cociente de 6,4 con un intervalo del 95 por ciento de 2,8 a 17: las tierras altas son las más densas. En Marte por encima de 20 km las tierras altas son 6,5 veces las llanuras, de 3,7 a 12,4. Sube el diámetro y los recuentos bajan y los intervalos se ensanchan, hasta que en Marte a 60 km el veredicto pasa a ser &ldquo;ninguna diferencia significativa&rdquo;, que no es lo mismo que &ldquo;la misma edad&rdquo;. El cociente no es una edad en años: supone una sola función de producción, ninguna saturación, ninguna parte grande de secundarios y un recuento completo. Los pasos más profundos miran cómo depende el intervalo del diámetro y qué rechaza el instrumento.',
    },
  ],
};

// Cráteres por tamaño: paso a paso con el inglés.
export const CRATERS_BY_SIZE = {
  title: 'Cráteres por tamaño',
  subtitle:
    'El gráfico de tamaño y frecuencia con sus barras de error, la pendiente con su intervalo y un recuento que se queda corto',
  objectives: [
    'Leer un gráfico acumulado de tamaño y frecuencia: el número de cráteres de al menos D de diámetro, por área, con un intervalo de Poisson en cada punto',
    'Hallar la pendiente de una ley de potencias, con su intervalo, y decir cómo el número de cráteres del ajuste fija la anchura del intervalo',
    'Mostrar que un recuento que se queda corto a diámetros pequeños curva el gráfico, y decir qué dice y qué no dice la señal sobre la pendiente',
    'Decir por qué la pendiente del gráfico y el nivel del gráfico responden a preguntas distintas',
  ],
  steps: [
    {
      title: 'Un gráfico de cuántos hay, de al menos este tamaño',
      body: 'Los cráteres pequeños son muchos y los grandes pocos. El gráfico <strong>acumulado</strong> de tamaño y frecuencia cuenta, para cada diámetro <em>D</em>, todos los cráteres de al menos ese tamaño, por área. Los dos ejes son logarítmicos, así que una ley de potencias <em>N</em>(≥<em>D</em>) ∝ <em>D</em><sup>&minus;<em>b</em></sup> es una recta de pendiente &minus;<em>b</em>. Cada punto lleva un intervalo de Poisson del 95 por ciento: un recuento es incierto porque el azar decide cuántos cráteres cayeron.\n\nLos cráteres son de un catálogo, no marcas sobre la imagen. Una línea discontinua es la ley de potencias ajustada por encima del diámetro que elijas, y la lectura da su índice <em>b</em> con un intervalo. Por debajo del diámetro en el que el recuento es <em>completo</em>, los puntos se dibujan de otro color y no son fiables.',
    },
    {
      title: 'La pendiente de las tierras altas lunares',
      body: 'Elige las <strong>tierras altas lunares</strong> y ajusta los cráteres de al menos <strong>30 km</strong> de diámetro, el diámetro por encima del cual su recuento es completo. Lee el índice acumulado <em>b</em> y los dos extremos de su intervalo del 95 por ciento.',
      fields: [
        { label: 'Índice b' },
        { label: 'Extremo inferior del intervalo' },
        { label: 'Extremo superior del intervalo' },
      ],
    },
    {
      title: '¿De quién se conoce mejor la pendiente?',
      body: 'Las tierras altas lunares dieron un índice con un intervalo de 1,06 de ancho, a partir de 40 cráteres. Las tierras altas de Marte tienen 91 cráteres de al menos 20 km de diámetro, el diámetro por encima del cual su recuento es completo.',
      prompt:
        'El intervalo del índice de las tierras altas de Marte será&hellip;',
      options: [
        'más ancho, porque los cráteres de Marte son más difíciles de medir',
        'más estrecho, porque hay más cráteres en el ajuste',
        'el mismo, porque una pendiente es una pendiente sea cual sea el ajuste',
        'imposible de decir sin la pendiente',
      ],
      hints: [
        '¿Qué fija lo bien que un ajuste de máxima verosimilitud conoce su pendiente?',
      ],
      because:
        'Más estrecho. El intervalo de un índice a partir de n cráteres se estrecha aproximadamente como uno entre la raíz cuadrada de n, así que 91 cráteres conocen la pendiente mejor que 40. El paso siguiente lo lee.',
    },
    {
      title: 'La pendiente de las tierras altas de Marte',
      body: 'Elige las <strong>tierras altas de Marte</strong> y ajusta los cráteres de al menos <strong>20 km</strong> de diámetro. Lee los dos extremos del intervalo de su índice.',
      fields: [
        { label: 'Extremo inferior del intervalo' },
        { label: 'Extremo superior del intervalo' },
      ],
    },
    {
      title: 'Una pendiente a partir de siete cráteres',
      body: 'Elige el <strong>mar lunar</strong>, ajustado desde <strong>30 km</strong>. Solo siete cráteres son tan grandes. Lee su índice y el extremo superior de su intervalo.',
      fields: [
        { label: 'Índice b' },
        { label: 'Extremo superior del intervalo' },
      ],
    },
    {
      title: '¿Es distinta la pendiente del mar?',
      body: 'El índice del mar es 3,5, de 1,4 a 6,5. El de las tierras altas lunares es 1,7, de 1,2 a 2,3.',
      prompt: '¿Qué se puede decir?',
      options: [
        'El mar tiene proporcionalmente menos cráteres grandes: 3,5 es el doble de 1,7',
        'Los dos intervalos se solapan mucho, así que siete cráteres no pueden separar las pendientes',
        'El mar debe de ser la superficie más antigua, porque su pendiente es más empinada',
        'El índice del mar está mal, porque supera todos los valores publicados',
      ],
      misconceptions: [
        {
          say: 'Un índice vale lo que vale su intervalo. El intervalo de 1,4 a 6,5 incluye 1,7, así que no se descarta una pendiente igual a la de las tierras altas.',
        },
        {
          say: 'La pendiente es la forma de la distribución de tamaños: la rapidez con que bajan los recuentos con el diámetro. El nivel del gráfico, cuántos cráteres hay en total, es en lo que se basa la edad. Una pendiente más empinada no es una superficie más antigua.',
        },
      ],
      hints: [
        '¿Está el 1,7 de las tierras altas dentro del intervalo del mar?',
      ],
      because:
        'El 1,7 de las tierras altas está dentro del intervalo del mar, que es ancho porque se apoya en siete cráteres. Los datos ni muestran ni descartan una diferencia de pendiente.',
    },
    {
      title: 'Un recuento que se queda corto',
      body: 'Un recuento de una imagen pasa por alto primero los cráteres pequeños. Elige las <strong>tierras altas lunares</strong>, ajusta los cráteres de al menos <strong>20 km</strong>, por debajo de su límite de completitud de 30 km, y pon <strong>Un recuento que se queda corto</strong> en <strong>100 %</strong>: todos los cráteres de menos de 30 km quedan fuera de la lista, como los pasaría por alto un recuento de la imagen. Lee el índice y la <strong>z</strong> de la comprobación de la pendiente más arriba.',
      fields: [
        { label: 'Índice b' },
        {
          label:
            'z de la comprobación por encima del doble del diámetro del ajuste',
        },
      ],
    },
    {
      title: '¿Qué dice la señal?',
      body: 'El instrumento indica que la pendiente no es constante: el índice por encima de 40 km difiere del índice de 1,0 ajustado desde 20 km.',
      prompt: '¿Qué debes concluir?',
      options: [
        'La superficie tiene de verdad pocos cráteres pequeños, así que 1,0 es su pendiente real',
        'La lista no sigue una sola ley de potencias hasta 20 km, así que un solo índice no puede describirla; la señal no puede decir si la causa es un recuento incompleto, la saturación o un quiebre real',
        'Nada: los cráteres pequeños cuentan igual que los grandes, así que el índice vale a cualquier diámetro',
        'El ajuste falló, porque se usaron menos de cinco cráteres',
      ],
      misconceptions: [
        {
          say: 'Aquí la curva se hizo dejando cráteres fuera, así que la superficie no ha cambiado. Una caída real por saturación o por renovación de la superficie curvaría el gráfico igual, y el gráfico solo no puede decir cuál.',
        },
        {
          say: 'Los cráteres pequeños no cuentan igual: son los más numerosos y los más difíciles de contar por completo, y los primeros en perderse por saturación. Por eso el ajuste empieza en un diámetro en el que el recuento es completo.',
        },
      ],
      hints: ['¿Qué se le hizo a la lista antes del ajuste?'],
      because:
        'La señal dice que la lista no es una sola ley de potencias. No corrige nada y no nombra una causa: un recuento que se queda corto, la saturación, la renovación de la superficie y un cambio real en los impactores pueden curvar el gráfico. El remedio es ajustar solo por encima del diámetro en el que el recuento es completo.',
    },
    {
      title: 'Lo que has deducido',
      body: 'Un gráfico acumulado de tamaño y frecuencia cuenta los cráteres de al menos cada diámetro, por área, con un intervalo de Poisson en cada punto. La pendiente de las tierras altas lunares es 1,71 de 1,22 a 2,28 (40 cráteres) y la de las tierras altas de Marte 1,72 de 1,39 a 2,09 (91 cráteres): más cráteres, un intervalo más estrecho. El 3,5 del mar, a partir de 7 cráteres, es casi todo incertidumbre. Deja fuera los cráteres pequeños y el ajuste cae a 1,0 y la comprobación de la pendiente lo señala: la señal dice que una lista no es una sola ley de potencias, no por qué. La caída <em>no</em> se corrige aquí. Los pasos más profundos miran cómo se ensancha el intervalo al subir el ajuste, y por qué el ajuste no es una recta trazada por los puntos dibujados.',
    },
  ],
};

// Lo que vale el diámetro de un cráter: paso a paso con el inglés.
export const WHAT_A_CRATER_DIAMETER_IS_WORTH = {
  title: 'Lo que vale el diámetro de un cráter',
  subtitle:
    'Un círculo en un mapa, los cuatro términos de su incertidumbre y por qué no se da una edad en años',
  objectives: [
    'Convertir un círculo de un mapa en un diámetro en kilómetros, con la escala y la vista indicadas',
    'Nombrar los cuatro términos de la incertidumbre de un diámetro (la escala, colocar el círculo, dónde está el borde, la vista) y decir cuál es el mayor',
    'Decir por qué una corrección mayor que su propia incertidumbre sigue siendo una corrección, y qué cuesta omitirla',
    'Decir por qué esta investigación da un diámetro y un cociente de densidades pero ninguna edad en años',
  ],
  steps: [
    {
      title: 'De un círculo a un diámetro',
      body: 'Un diámetro en un mapa es una longitud en píxeles por la escala del mapa. Aquí el mapa es una imagen de Clementine de las tierras altas del sur de la Luna a 2,02 km por píxel, y tu círculo tiene un <strong>centro</strong> y un <strong>punto del borde</strong>. El instrumento convierte el radio del círculo en kilómetros, corrige la vista si lo permites y da el diámetro con cuatro términos de su incertidumbre: la escala, lo bien que una mano coloca un círculo, dónde está de verdad el borde y la vista.\n\nEl mapa es una vista de una esfera. Cerca del borde del disco un cráter circular se ve de soslayo y queda comprimido en la dirección hacia el centro del disco. El instrumento dibuja el círculo del suelo como la elipse que forma. El círculo de la imagen parte de un cráter del catálogo, y se pueden mostrar los círculos del propio catálogo para comparar.',
    },
    {
      title: 'Lee el diámetro',
      body: 'El círculo está puesto sobre un cráter grande, con su punto del borde a 25 píxeles del centro, en la dirección hacia el centro del disco, y la vista corregida. Lee el <strong>diámetro</strong> y su incertidumbre.',
      fields: [{ label: 'Diámetro' }, { label: 'Su incertidumbre (un sigma)' }],
    },
    {
      title: '¿Qué término es el mayor?',
      body: 'La incertidumbre del diámetro se compone de cuatro términos: la escala del mapa, lo bien que se coloca el círculo, dónde está de verdad el borde y la vista.',
      prompt: 'Para este círculo, el término mayor es&hellip;',
      options: [
        'la escala del mapa',
        'lo bien que se coloca el círculo',
        'dónde está de verdad el borde, una fracción del diámetro que fijas tú',
        'la vista, porque el cráter está cerca del borde del disco',
      ],
      hints: [
        'Una mano coloca un punto con una fracción de píxel, y el círculo mide 50 píxeles de ancho. ¿Qué fracción del diámetro es eso?',
      ],
      because:
        'Dónde está el borde. El borde de un cráter es una cresta, erosionada y solapada, y dos personas cuidadosas discrepan sobre ella en unos pocos por ciento del diámetro. La colocación de una mano y la escala son mucho menores, y la vista se conoce bien. El paso siguiente lee cada término.',
    },
    {
      title: 'Los cuatro términos',
      body: 'Lee la incertidumbre de <strong>colocar el círculo</strong> y de <strong>dónde está el borde</strong>, cada una como porcentaje del diámetro. El término de reconocimiento es tuyo: lo fijaste en un 5 por ciento, y el instrumento no sabe más.',
      fields: [
        { label: 'Incertidumbre de colocar el círculo' },
        { label: 'Incertidumbre de dónde está el borde' },
      ],
    },
    {
      title: 'Omite la vista',
      body: 'Pon <strong>Corregir la vista</strong> en no: la vista se toma como cenital y el círculo se dibuja redondo. Lee el diámetro y cuánto, en porcentaje, baja.',
      fields: [
        { label: 'Diámetro sin la corrección' },
        { label: 'Cuánto menos que con ella' },
      ],
    },
    {
      title: 'Una corrección grande, una incertidumbre pequeña',
      body: 'La vista cambia el diámetro en un diez por ciento y añade un 0,06 por ciento a su incertidumbre.',
      prompt: '¿Qué dice eso?',
      options: [
        'La corrección no importa, porque su incertidumbre es minúscula',
        'La corrección es grande y bien conocida, así que omitirla sería un error sistemático, no una incertidumbre pequeña',
        'La corrección debería descartarse, porque la imagen parece redonda sin ella',
        'La corrección es tan incierta como el diámetro, porque las dos salen del mismo círculo',
      ],
      misconceptions: [
        {
          say: 'Una incertidumbre pequeña en una corrección dice que se conoce bien, no que sea pequeña. Un efecto grande y conocido hay que aplicarlo: omitirlo desplaza todos los diámetros en el mismo sentido.',
        },
        {
          say: 'La imagen parece redonda porque la compresión es en una dirección y suave en este lugar. La elipse que dibuja el instrumento es el círculo del suelo tal como lo ve la cámara.',
        },
      ],
      hints: [
        '¿En qué se diferencia el tamaño de un efecto de lo bien que se conoce?',
      ],
      because:
        'Una corrección puede ser grande y segura. La vista la fija dónde está el cráter en el disco, que se conoce con un píxel. Omitirla no es una barra de error mayor: es una respuesta equivocada en un diez por ciento, siempre, en el mismo sentido.',
    },
    {
      title: '¿Por qué no hay edad en años?',
      body: 'Esta investigación, y las dos anteriores, dan un diámetro, una densidad y un cociente de dos densidades. Ninguna da una edad en años.',
      prompt: '¿Por qué no?',
      options: [
        'La incertidumbre del diámetro es demasiado grande para dar una edad',
        'Una edad necesita una función de producción, correcciones por saturación y cráteres secundarios y una corrección de completitud comprobada con cráteres de tamaño conocido; nada de eso ha pasado su prueba aquí',
        'Los cráteres no se pueden fechar, porque los impactos no ocurren a un ritmo constante',
        'Los intervalos de Poisson son demasiado anchos para dar una edad',
      ],
      misconceptions: [
        {
          say: 'Un diámetro bueno al cinco por ciento basta para un recuento. Los obstáculos para una edad están en otra parte: cuál fue el ritmo de impactos, y lo completo y limpio que es el recuento.',
        },
        {
          say: 'Los cráteres se pueden fechar, calibrando la densidad con muestras de edad conocida: esa es exactamente la función de cronología que necesitaría una edad. El ritmo no es constante, y la calibración dice cómo cambió.',
        },
        {
          say: 'Los intervalos son una parte de la incertidumbre de una edad, y a menudo no la mayor. El recuento tiene que ser completo, sin secundarios y por debajo de la saturación para que la densidad signifique algo en años.',
        },
      ],
      hints: ['¿Cuál de estas cosas no se ha probado aquí?'],
      because:
        'Una edad necesita varias cosas que no están aquí: una función de producción y una cronología para convertir una densidad en años, correcciones por saturación y cráteres secundarios, y una corrección de lo que pasa por alto un recuento, comprobada con cráteres de tamaño conocido. Hasta que pasen su prueba, un cociente de densidades es el hallazgo, y dice qué superficie es más antigua, no en cuántos años.',
    },
    {
      title: 'Lo que has deducido',
      body: 'Un círculo con un centro y un punto del borde a 25 píxeles dio un diámetro de 112,0 &plusmn; 5,9 km: la escala del mapa, la colocación del círculo, dónde está el borde y la vista, sumados en cuadratura, con el borde, una fracción que fijas tú, el mayor. La vista cambia el diámetro en un diez por ciento aproximadamente y su incertidumbre en un 0,06 por ciento: es una corrección que aplicar, no un error que citar. Un diámetro y un cociente de densidades es lo que da esta investigación. Una edad en años no, porque necesita una función de producción, correcciones por saturación y cráteres secundarios, y una corrección de completitud que no ha pasado su prueba.',
    },
  ],
};

// ¿Qué hay en este campo?: paso a paso con el inglés (Prompt 191, tercera parte).
export const WHAT_IS_IN_THIS_FIELD = {
  title: '¿Qué hay en este campo?',
  subtitle:
    'Las fuentes que lista un detector, el ancho de las estrellas y la curva que dice cuán débil puede ver una búsqueda',
  objectives: [
    'Decir que una lista de fuentes es lo que sobresale del ruido con un umbral, no lo que hay, y qué compra y qué cuesta bajar el umbral',
    'Leer el ancho de las estrellas de un cuadro con su incertidumbre, y decir por qué las estrellas que se añaden para probar una búsqueda deben tener ese ancho',
    'Leer una curva de completitud: la proporción de estrellas añadidas que se halla por magnitud, y las magnitudes al 50 y al 90 por ciento con un intervalo',
    'Decir de qué es respuesta una curva de completitud, de una búsqueda de un cuadro, y de qué no lo es',
  ],
  steps: [
    {
      title: 'Un cuadro, y todavía ninguna lista',
      body: 'Abajo hay un cuadro de un campo de estrellas: cuarenta estrellas, de brillantes a tenues, sobre un cielo con ruido. Un detector aún no lo ha mirado. Aquí se le piden tres cosas: qué fuentes sobresalen del ruido, qué ancho tienen las estrellas y, la que dice cuánto fiarse de las otras dos, cuán tenue habría sido la estrella que hallaría.\n\nEl cuadro es <strong>sintético</strong>: las estrellas se colocaron a partir de una tabla, y esa verdad queda oculta hasta que un paso la activa. Un cuadro real nunca la ofrece. Las magnitudes aquí son <em>instrumentales</em>: menos 2,5 por el logaritmo de los electrones por segundo, así que un número menor es una estrella más brillante, y no hay punto cero.',
    },
    {
      title: '¿Qué contendrá la lista?',
      body: 'El detector resta el cielo, suaviza el cuadro y lista cada lugar que sobresale cuatro sigmas del ruido.',
      prompt:
        'Comparada con las estrellas que se colocaron, la lista contendrá&hellip;',
      options: [
        'todas las estrellas, y nada más',
        'las estrellas más brillantes, con las más tenues sin hallar',
        'las estrellas más brillantes, y varios lugares que son solo ruido',
        'tantas fuentes como estrellas hay, sean las que sean',
      ],
      hints: ['¿Cómo se ve una estrella tenue junto al ruido del cielo?'],
      because:
        'Las estrellas más brillantes, con las más tenues sin hallar. A cuatro sigmas casi nada más que una estrella sobresale tanto del ruido, y una estrella cuya luz se reparte entre unos pocos píxeles de ruido de cielo no lo hace. Los pasos siguientes muestran qué hace un umbral más bajo.',
    },
    {
      title: '¿Cuántas fuentes?',
      body: 'Deja el <strong>Umbral</strong> en 4 sigmas. Lee cuántas fuentes lista el detector y cuántas llevan una marca.',
      fields: [
        { label: 'Fuentes listadas' },
        { label: 'Fuentes con una marca' },
      ],
    },
    {
      title: 'Un umbral más bajo',
      body: 'Pon el <strong>Umbral</strong> en 2,5 sigmas y activa <strong>Estrellas colocadas</strong> en mostradas. Lee cuántas fuentes se listan y cuántas de ellas no son una estrella colocada.',
      fields: [
        { label: 'Fuentes listadas' },
        { label: 'Fuentes que no son una estrella colocada' },
      ],
    },
    {
      title: 'El ancho de las estrellas',
      body: 'Vuelve a poner el <strong>Umbral</strong> en 4 sigmas y la verdad en oculta. El detector toma las estrellas más brillantes que son redondas y no tienen marca, ajusta una gaussiana a cada una y las combina. Lee cuántas estrellas usó y el ancho (FWHM) con su incertidumbre.',
      fields: [
        { label: 'Estrellas usadas para el ancho' },
        { label: 'Ancho de las estrellas' },
        { label: 'Su incertidumbre' },
      ],
    },
    {
      title: 'Para qué sirve el ancho',
      body: 'El instrumento siguiente añade estrellas de brillo elegido a una copia de este cuadro y hace que el detector vuelva a mirar. Pide el ancho de las estrellas que añade.',
      prompt: '¿Por qué usar el ancho que se acaba de medir?',
      options: [
        'Las estrellas añadidas deben parecerse a las reales, o se prueba el detector con otra clase de estrella',
        'El ancho fija cuán brillantes son las estrellas añadidas',
        'Una estrella más ancha es siempre más fácil de hallar para un detector',
        'La herramienta rechaza cualquier ancho que no sea el medido',
      ],
      misconceptions: [
        {
          say: 'Una estrella más ancha reparte la misma luz en más píxeles, así que cada uno es más tenue frente al mismo ruido, y es más difícil de hallar. Los últimos pasos lo muestran.',
        },
        {
          say: 'La herramienta acepta otros anchos, y los últimos pasos usan uno. Un ancho equivocado da una curva que describe la clase de estrella equivocada.',
        },
      ],
      hints: ['¿Qué se está probando: el detector, con qué estrellas?'],
      because:
        'Una curva de completitud dice cuán probable es que este detector halle estrellas como las añadidas. Si son más estrechas o más anchas que las propias del cuadro, la curva trata de estrellas que el cuadro no tiene.',
    },
    {
      title: 'Estrellas añadidas, halladas y perdidas',
      body: 'Se añadieron doce ensayos de veinte estrellas cada uno en lugares al azar, entre la magnitud menos 3,4 y menos 1,6, y el detector miró cada vez. Con el umbral en 4 sigmas y el ancho en 3 píxeles, lee la proporción hallada en el intervalo más brillante (menos 3,4 a menos 3,1) y en el que va de menos 2,5 a menos 2,2.',
      fields: [
        { label: 'Halladas, magnitud −3,4 a −3,1' },
        { label: 'Halladas, magnitud −2,5 a −2,2' },
      ],
    },
    {
      title: 'La curva',
      body: 'Las proporciones, intervalo a intervalo, son la curva de completitud de esta búsqueda de este cuadro. Lee la magnitud a la que se halla la mitad de las estrellas añadidas, y aquella a la que se hallan nueve de cada diez.',
      fields: [
        { label: 'Magnitud con el 50 por ciento hallado' },
        { label: 'Magnitud con el 90 por ciento hallado' },
      ],
    },
    {
      title: '¿Cuán tenue puede ver?',
      body: 'Una pregunta que quiere un solo número tiene por respuesta una curva.',
      prompt: '¿Cuán tenue puede ver este detector?',
      options: [
        'Hasta la magnitud −2,47: nunca se halla nada más tenue',
        'No hay un límite único: halla casi todas las estrellas más brillantes que −2,9, la mitad de las que están cerca de −2,5 y casi ninguna más tenue que −2,2',
        'Tan tenue como la fuente más tenue de su lista',
        'Hasta la magnitud en que el umbral es de 4 sigmas, una propiedad fija del telescopio',
      ],
      misconceptions: [
        {
          say: 'La mitad se halla en −2,47, y algunas más tenues también: el cinco por ciento de las estrellas añadidas en el intervalo de −2,2 a −1,9. Un límite es una elección de cuán seguro ser, no una pared.',
        },
        {
          say: 'La fuente más tenue listada es la más tenue que casualmente cruzó el umbral, con la mayoría de sus vecinas sin hallar. Una lista no recuerda lo que perdió; las estrellas añadidas lo aportan.',
        },
        {
          say: 'El umbral es un ajuste, no una propiedad del telescopio. Cámbialo y la curva se mueve, como muestra el camino más profundo.',
        },
      ],
      hints: [
        'Mira las proporciones, intervalo a intervalo, y no un solo número.',
      ],
      because:
        'Depende de cuán seguro quieras estar. La curva da la respuesta completa: el 90 por ciento en −2,87, la mitad en −2,47 y el 5 por ciento en −2,2. «Cuán tenue» sin una proporción no es una medición, y una fuente tenue listada tampoco es una respuesta.',
    },
    {
      title: 'Lo que has deducido',
      body: 'A cuatro sigmas el detector listó 30 fuentes y no marcó ninguna. A 2,5 sigmas listó 44 y siete eran solo ruido, algo que ninguna lista puede decir de sí misma. Seis estrellas limpias dieron un ancho de 3,00 &plusmn; 0,02 píxeles. Estrellas de ese ancho añadidas en lugares al azar se hallaron nueve de cada diez veces en la magnitud −2,87 y la mitad de las veces en −2,47, con casi ninguna hallada más allá de −2,2: la curva de completitud es como una búsqueda responde a «cuán tenue». Pertenece a este cuadro, este ancho y este umbral. El cuadro era sintético: cuarenta estrellas de una tabla, un cielo de 90 electrones por píxel y 8 de ruido de lectura, y un ancho de 3,0 píxeles, que la medición recuperó.',
    },
  ],
};

/** By lesson id: what instructorLocale.js registers. */
export default {
  'what-is-a-measurement': WHAT_IS_A_MEASUREMENT,
  'what-does-plus-minus-claim': WHAT_DOES_PLUS_MINUS_CLAIM,
  'when-the-method-must-refuse': WHEN_THE_METHOD_MUST_REFUSE,
  'measuring-the-moon': MEASURING_THE_MOON,
  'how-far-is-that-star': HOW_FAR_IS_THAT_STAR,
  'a-binary-stars-orbit': A_BINARY_STARS_ORBIT,
  'which-surface-is-older': WHICH_SURFACE_IS_OLDER,
  'craters-by-size': CRATERS_BY_SIZE,
  'what-a-crater-diameter-is-worth': WHAT_A_CRATER_DIAMETER_IS_WORTH,
  'what-is-in-this-field': WHAT_IS_IN_THIS_FIELD,
};
