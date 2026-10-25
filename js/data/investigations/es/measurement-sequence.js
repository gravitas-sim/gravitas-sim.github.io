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

/** By lesson id: what instructorLocale.js registers. */
// La investigación de Júpiter (Prompt 193): paso a paso con el inglés.
export const WEIGHING_JUPITER = {
  title: 'Pesar Júpiter con sus lunas',
  subtitle:
    'Cuatro lunas, un ritmo de observación que puede medirlas y la tercera ley de Kepler',
  objectives: [
    'Identificar las cuatro lunas galileanas noche tras noche, con las efemérides como comprobación, y leer a qué distancia de Júpiter está cada una',
    'Hallar el período y el radio de órbita de una luna a partir de una sinusoide ajustada a sus distancias en el tiempo',
    'Decir por qué una imagen por noche no puede dar el período de Ío, y qué muestreo sí puede',
    'Convertir un período y un radio en la masa de Júpiter con la tercera ley de Kepler, y decir qué incluye la incertidumbre',
  ],
  steps: [
    {
      title: 'Júpiter y cuatro puntos de luz',
      body: 'Con unos prismáticos, Júpiter tiene cuatro pequeñas compañeras en línea: Ío, Europa, Ganímedes y Calisto, las lunas que vio Galileo en enero de 1610. Esta investigación las mide. Las imágenes de aquí son <strong>sintéticas</strong>: no se observó ninguna imagen de Júpiter para esta investigación. Cada una se hizo con las posiciones reales de las lunas en las noches del 20 de noviembre al 30 de diciembre de 2025 (JPL Horizons, efemérides de satélites JUP365), y luego se le dio el disco de Júpiter, el brillo de las lunas, desenfoque atmosférico y ruido del detector. Para una imagen real de las lunas, mira la página de lunas de Júpiter de la NASA, science.nasa.gov/jupiter/moons.\n\nEl este está a la derecha y el ecuador de Júpiter es horizontal. Hay 51 imágenes: tres noches largas de imágenes horarias, del 5 al 7 de diciembre, y una imagen por noche, a las 08:00 UT, en las demás. Activa la superposición para ver dónde sitúan las efemérides cada luna: es la comprobación de quién es quién.',
    },
    {
      title: '¿Quién es quién?',
      body: 'La imagen 13 es la noche del 4 de diciembre. Cuatro lunas están en línea, con la superposición activa: I, E, G y C.',
      prompt: 'En la imagen 13, ¿qué luna está más lejos de Júpiter?',
      options: ['Ío', 'Europa', 'Ganímedes', 'Calisto'],
      misconceptions: [
        {
          say: 'Ganímedes es la más brillante y la mayor, pero el brillo no dice a qué distancia está. Lee la distancia de cada luna a Júpiter en la lectura.',
        },
      ],
      hints: [
        'La lectura da la distancia de cada luna al este o al oeste de Júpiter.',
      ],
      because:
        'Calisto, a 26,3 radios de Júpiter al este. La superposición y las posiciones medidas coinciden: cuanto más lejos orbita una luna, más lejos puede estar de Júpiter, y Calisto es la más externa.',
    },
    {
      title: '¿Cuánto se mueve una luna en una hora?',
      body: 'Las imágenes 14 a 34 son horarias, en tres noches. Pon la imagen en <strong>14</strong> (06:00 UT del 5 de diciembre) y lee a qué distancia de Júpiter está Ganímedes, en radios de Júpiter. Luego pon la imagen en <strong>16</strong>, dos horas después, y léela otra vez. Escribe la primera distancia y cuánto se movió en las dos horas.',
      fields: [
        { label: 'Distancia de Ganímedes a Júpiter en la imagen 14' },
        { label: 'Cuánto se movió entre la imagen 14 y la imagen 16' },
      ],
    },
    {
      title: 'El período de Ío y su distancia',
      body: 'Cada imagen da una distancia medida para cada luna. El instrumento las ha reunido: la distancia de Ío a Júpiter frente al tiempo, con la sinusoide que mejor se ajusta. Deja el muestreo en <strong>1</strong>, la secuencia diseñada, y lee el <strong>período</strong> de Ío en días y su <strong>amplitud</strong> en radios de Júpiter. La amplitud es la mayor distancia de Ío a Júpiter, que para una órbita circular vista de canto es el radio de la órbita.',
      fields: [
        { label: 'Período de Ío' },
        { label: 'Radio de la órbita de Ío' },
      ],
    },
    {
      title: '¿Y si tuvieras una imagen por noche?',
      body: 'La mayoría de quienes observan Júpiter toman una imagen por noche, a la misma hora. Ío da la vuelta en 1,77 días. Toma solo las 30 imágenes de una por noche y pide el período de Ío, buscando los períodos que buscaría un observador, mayores de dos días.',
      prompt:
        'El período hallado para Ío con imágenes de una por noche sería&hellip;',
      options: [
        'unos 1,77 días, el verdadero',
        'unos 0,9 días, la mitad del verdadero',
        'unos 2,3 días, un período que no es el de Ío',
        'ningún período: los puntos se dispersarían',
      ],
      hints: [
        'Una imagen al día no puede seguir una luna que da la vuelta en menos de dos días. ¿Qué vería en su lugar?',
      ],
      because:
        'Unos 2,3 días. Una imagen cada día ve la luna a 0,565 vueltas al día como si diera 1 − 0,565 = 0,435 vueltas al día, un período de 2,30 días, y nada en las imágenes dice cuál es el correcto. El paso siguiente lo muestra.',
    },
    {
      title: 'Ío con una imagen por noche',
      body: 'Pon el muestreo en <strong>0</strong>: una vez por noche, con los períodos buscados mayores de 2 días. Lee el período de Ío.',
      fields: [{ label: 'Período de Ío con imágenes de una por noche' }],
    },
    {
      title: 'Lo que has deducido',
      body: 'Identificaste las lunas con las efemérides como comprobación, viste a Ganímedes moverse 0,9 radios de Júpiter en dos horas y ajustaste Ío: 1,77 días a 5,9 radios de Júpiter. Y viste por qué importa el ritmo de observación: muestreado una vez por noche, Ío da una respuesta limpia, 2,3 días, que es falsa. Las noches horarias son lo que hace medible a Ío. Las imágenes eran sintéticas, hechas con las posiciones reales de las lunas; una noche real añadiría nubes, deriva y píxeles malos. Los pasos más profundos pesan Júpiter con estos períodos y radios.',
    },
  ],
};

export default {
  'what-is-a-measurement': WHAT_IS_A_MEASUREMENT,
  'what-does-plus-minus-claim': WHAT_DOES_PLUS_MINUS_CLAIM,
  'when-the-method-must-refuse': WHEN_THE_METHOD_MUST_REFUSE,
  'measuring-the-moon': MEASURING_THE_MOON,
  'how-far-is-that-star': HOW_FAR_IS_THAT_STAR,
  'a-binary-stars-orbit': A_BINARY_STARS_ORBIT,
  'weighing-jupiter': WEIGHING_JUPITER,
};
