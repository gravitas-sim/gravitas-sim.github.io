// The Missing Mass, deeper: the Spanish words, step for step with ../missing-mass.js.
export default {
  steps: [
    {
      decides:
        'qué incertidumbres contar y cómo se combinan en la barra de error de la razón',
      title: '¿Qué tan seguro es ese número?',
      body: 'La razón entre la masa del halo y la visible lleva dos incertidumbres. La masa del halo va como el cuadrado de la velocidad plana, así que el fallo medio del ajuste, como fracción de esa velocidad, cuenta dos veces. Y la masa visible no se pesa: se calcula a partir de la luz, con una suposición sobre cuánta masa lleva cada unidad de luz, que es buena hasta quizá un 20 %.\n\nLos números del ajuste son los que anotaste; solo el 20 % es nuevo. Las incertidumbres fraccionarias se suman en cuadratura.',
      fields: [
        { label: 'Incertidumbre de la masa visible, como fracción' },
        { label: 'Masa del halo ÷ masa visible' },
        { label: 'Incertidumbre de la masa del halo, como fracción' },
        { label: 'Incertidumbre de la razón' },
      ],
    },
    {
      decides:
        'qué ajustes aceptar (deben llegar a AJUSTADA y mantener la masa visible dentro de lo que permite la luz), y por tanto cómo de ancho es el rango de la razón',
      title: 'Dale a la razón una barra de error con tus propios ajustes',
      body: 'Tu ajuste dio un valor de la razón entre la masa del halo y la visible. Otros ajustes reproducen los puntos igual de bien, y cada uno da una razón distinta. La dispersión entre los ajustes que aceptarías es una barra de error que hiciste tú mismo.\n\nConstruye al menos dos ajustes propios, con los cuatro deslizadores libres, y lee la razón de masa oscura de cada uno. Acepta un ajuste solo si llega a AJUSTADA y mantiene la masa visible dentro del 20 % que permite la luz alrededor de la masa visible que anotaste para tu ajuste. Luego da la razón más baja y la más alta entre los ajustes que aceptaste, y di cuáles aceptaste.',
      fields: [
        { label: 'Qué ajustes aceptaste y la regla que usaste' },
        { label: 'Razón más baja entre tus ajustes aceptados' },
        { label: 'Razón más alta entre tus ajustes aceptados' },
        { label: 'Mitad de la dispersión: la barra de error de la razón' },
      ],
    },

    {
      decides:
        'qué debería decir un resultado publicado cuando dos parámetros ajustados se compensan',
      title: '¿Por qué no dar un solo número?',
      body: 'El consejo del ajuste decía que los dos deslizadores del halo se compensan: un halo más rápido con un núcleo mayor ajusta casi tan bien como uno más lento con un núcleo menor. Di que dos ajustes, 150 km/s con un núcleo de 6 kpc y 160 km/s con uno de 9 kpc, fallan ambos en 2 km/s.',
      prompt: '¿Qué debería decir un resultado publicado?',
      options: [
        'el de núcleo menor, porque es más simple',
        'ambos parámetros juntos, con cómo varían juntos; cualquiera solo exagera lo que saben los datos',
        'el promedio de los dos, porque está en medio',
        'nada: si dos ajustes funcionan, el ajuste ha fallado',
      ],
      because:
        'Cuando dos parámetros se compensan, los datos restringen una combinación de ellos mejor que cualquiera por separado. Dar uno solo con su propia barra de error subestima su incertidumbre; el informe honesto da ambos y la covarianza, que es lo que hacen los artículos reales de curvas de rotación.',
    },
    {
      decides:
        'qué medida podría separar dos modelos que ajustan una misma curva',
      title: '¿Qué distinguiría dos modelos?',
      body: 'Un halo y una ley de gravedad modificada pueden ajustar la misma curva de rotación. La incertidumbre de tu ajuste dice cuánto margen tiene cada modelo.',
      prompt:
        'En unas frases: ¿qué habría que medir para distinguirlos, y por qué un mejor ajuste de esta sola curva no basta?',
      rubric:
        'Busca una medida que los modelos predigan distinto (el cúmulo, o una galaxia de otra masa, o las lentes) y la idea de que dos modelos que ajustan una curva dentro de su incertidumbre no han sido separados por ella.',
    },
    {
      title: 'La opción auténtica: la Vía Láctea medida',
      body: 'Todas las curvas de galaxia de esta investigación hasta ahora son un <strong>modelo</strong>: la curva de NGC 3198 se construyó con parámetros publicados y una dispersión fija añadida, y está rotulada como sintética. Aquí hay una medida. El instrumento muestra la rapidez circular de la propia Vía Láctea de 2 a 25 kpc, de Bhattacharjee, Chaudhury y Kundu (2014), que combinaron muchos trazadores. Supone que el Sol está a 8,3 kpc del centro y se mueve a 244 km/s; las citas están en el paquete de datos. Pon el modelo en un mejor ajuste sin halo y luego con uno.',
    },
    {
      decides:
        'qué ajuste leer primero, y qué dice sobre un halo el cambio del χ² reducido',
      title: 'La misma prueba con datos reales',
      body: 'Lee el χ² reducido del mejor ajuste <strong>sin halo</strong> (el disco acotado en 8 × 10<sup>10</sup> masas solares) y del mejor ajuste <strong>con halo</strong>. Compara la mejora con la que hallaste para la curva sintética.',
      fields: [
        { label: 'χ² reducido, solo estrellas' },
        { label: 'χ² reducido, con halo' },
      ],
    },
    {
      title: 'Otra manera de leer la misma curva',
      body: 'Todo lo anterior ha supuesto que la ley de la gravedad de Newton es correcta y ha preguntado qué masa tendría que haber. Hay otra manera de leer una curva de rotación plana, y está sobre la mesa desde 1983.\n\nMordehai Milgrom se dio cuenta de que las curvas dejan de caer a una <em>aceleración</em> determinada, y no a un radio o a un brillo determinados. Por debajo de unos a₀ = 1,2 × 10⁻¹⁰ m/s² —más o menos una cienmilmillonésima de la gravedad en la superficie de la Tierra— las galaxias se comportan como si la gravedad fuera más intensa de lo que dice Newton. Por encima no cambia nada, y por eso ningún laboratorio ni ninguna órbita planetaria ha visto jamás esto.\n\nSi eso es lo que ocurre, entonces lejos de una galaxia la atracción gravitatoria cae como 1/r en lugar de 1/r², y una órbita circular allí cumple\n\n<strong>v⁴ = G M a₀</strong>\n\ncon M la masa que puedes ver. No ajustada. Predicha, a partir de una constante que debe ser la misma para todas las galaxias.',
      tip: 'El instrumento se abre sobre un ajuste con halo como el que construiste. El selector de arriba pone MOND sobre los mismos puntos.',
    },
    {
      decides:
        'cuánto bajar el disco para que MOND coincida, y así cuántos números tuvo que recibir cada explicación',
      title: 'Ajústala de las dos maneras',
      body: 'Las dos explicaciones, los mismos doce puntos, evaluadas de la misma forma. Prueba cada una, y usa los dos preajustes cuando quieras ver dónde acaba cada cual.\n\nFíjate en lo que hubo que decirle a cada explicación. El halo necesita tres números elegidos para encajar con esta galaxia: cuánto pesa el disco, a qué velocidad se aplana la curva del halo y cómo de grande es su núcleo. MOND necesita uno —el disco— porque a₀ no es ajustable y es el mismo número para todas las galaxias del universo.',
      checklist: [
        'Carga el mejor ajuste con halo y lee su residuo',
        'Cambia a MOND, dejando el disco donde está',
        'Baja el disco hasta que MOND también coincida',
        'Compara cuántos números necesitó cada explicación',
      ],
      tip: 'MOND quiere un disco más ligero que el ajuste con halo, unas dos terceras partes. Una curva de rotación no puede medir directamente la masa de las estrellas, así que cuánto pesa el disco nunca quedó fijado por los datos en ninguna de las dos imágenes.',
    },
    {
      decides:
        'qué masas sumar antes de tomar la raíz cuarta, y en qué unidades',
      hints: [
        'MOND da v⁴ = G M a₀: la velocidad plana es la raíz cuarta de G M a₀.',
        'Suma primero el disco y el bulbo, y usa las unidades del instrumento, antes de tomar la raíz cuarta.',
      ],
      feedback: {
        close:
          'Cerca. Toma la raíz cuarta, no la cuadrada, e incluye el bulbo.',
        off: 'Primero la masa visible total (disco más bulbo) y luego v = (G M a₀)^(1/4).',
      },
      title: 'La predicción que hace MOND',
      body: 'La relación v⁴ = G M a₀ convierte una masa visible directamente en una velocidad plana, sin ajustar nada. Usa el disco que muestra el instrumento —2,1 × 10¹⁰ masas solares, más el pequeño bulbo de 0,05 × 10¹⁰— y el valor de a₀ de antes.\n\nEn las unidades en las que trabaja el instrumento, G a₀ = 0,0159 (km/s)⁴ por masa solar.',
      prompt: 'La velocidad plana que MOND predice para esta galaxia',
      unit: 'km/s',
      because:
        'Unos 136 km/s. Multiplica 2,15 × 10¹⁰ por 0,0159 para obtener 3,4 × 10⁸ y saca la raíz cuarta. El instrumento informa el mismo número en su propia fila.\n\nEsto es la relación de Tully-Fisher bariónica, y conviene tener claro que es una regularidad observada y no un resultado de MOND: las galaxias reales sí se sitúan sobre M ∝ v⁴, con una dispersión notablemente pequeña, sea lo que sea lo que la cause. MOND la predice. Un halo de materia oscura tiene que arreglárselas para producirla, porque no hay una razón evidente para que las propiedades de un halo sigan tan de cerca a la masa visible, y explicar esa estrechez es un problema abierto en formación de galaxias.',
    },
    {
      decides:
        'si ajustar esta curva puede zanjar entre las explicaciones, y qué otra evidencia lo haría',
      title: '¿Decide la curva?',
      body: 'Has ajustado ya la misma curva de rotación dos veces, con dos ideas incompatibles sobre lo que ocurre, y las dos funcionan.\n\nEso no es un fallo del ejercicio. Es el estado real de esta pieza concreta de evidencia, y saber qué no puede zanjar una medida forma parte de usarla tanto como saber qué sí.',
      prompt:
        'En dos o tres frases: ¿ajustar esta curva de rotación establece cuál explicación es correcta? ¿Qué tipo de evidencia haría falta en su lugar?',
    },
  ],
};
