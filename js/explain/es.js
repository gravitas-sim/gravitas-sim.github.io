// =============================================================================
// ¿Qué estoy viendo? (español)
// -----------------------------------------------------------------------------
// Entrada por entrada, lo mismo que js/explain/en.js: qué son los ejes (o la
// imagen), qué significa un rasgo, qué se lee y qué no puede mostrar. Sin
// revisar por una persona hablante nativa.
// =============================================================================

export default {
  energy: [
    'Energía por unidad de masa (vertical) frente al tiempo o la distancia (horizontal).',
    'La energía cinética es el movimiento y la potencial la que guarda la posición; su suma se conserva sin fuerzas externas.',
    'Si el total se mantiene plano mientras las otras dos se intercambian.',
    'Un total plano muestra que el integrador es preciso, no que un sistema real no pierda nada.',
  ],
  binary: [
    'Dos órbitas dibujadas alrededor de su centro de masas común, con el tiempo en el cronómetro.',
    'La estrella más pesada se mueve menos y queda más cerca del centro de masas.',
    'El periodo, la separación y cómo se comparan las dos velocidades.',
    'Solo dos cuerpos: un tercero cambiaría todas las órbitas que se ven.',
  ],
  blackHole: [
    'Tamaños y escalas en ejes logarítmicos: cada paso es un factor de diez.',
    'El horizonte de sucesos es el radio dentro del cual escapar exigiría más que la velocidad de la luz.',
    'Cómo escala una magnitud con la masa: fíjate en la pendiente, no en la altura.',
    'No muestra lo que pasa dentro del horizonte; el modelo vale para el exterior.',
  ],
  habitability: [
    'La luz estelar que recibe un planeta, frente a su distancia a la estrella.',
    'La zona habitable es donde podría mantenerse agua líquida en la superficie según el modelo.',
    'Qué distancias caen dentro de la zona para una estrella dada.',
    'Estar en la zona no hace habitable a un planeta: el aire y el agua no están en el modelo.',
  ],
  exoplanet: [
    'El pequeño movimiento de la estrella, o su caída de luz, frente al tiempo o al ángulo.',
    'Un bamboleo o una caída delata a un planeta invisible que tira de la estrella o la cruza.',
    'El tamaño de la señal y cómo cambia con la masa, la distancia y la inclinación.',
    'Cada método ve solo parte del sistema; la inclinación de la órbita suele ser desconocida.',
  ],
  tidal: [
    'Flechas o barras de la fuerza que estira un cuerpo, frente a la distancia o la densidad.',
    'Las mareas vienen de la diferencia de gravedad a través del cuerpo, que cae como 1/distancia³.',
    'Con qué rapidez crece la fuerza de marea al acercarse los cuerpos.',
    'El límite de Roche aquí es un modelo simple; la resistencia de un cuerpo real lo cambia.',
  ],
  darkMatter: [
    'Velocidad orbital (vertical) frente a la distancia al centro (horizontal).',
    'Una curva plana a gran distancia indica más masa de la que aporta la materia visible.',
    'Si la masa visible sola puede igualar la curva medida.',
    'Un ajuste que coincide no identifica de qué está hecha la masa extra.',
  ],
  chaos: [
    'Cuánto se separan dos ejecuciones casi idénticas, frente al tiempo.',
    'Un crecimiento constante por un mismo factor es la firma del caos.',
    'Cuánto tiempo permanecen cercanas las dos ejecuciones antes de separarse.',
    'No predice el futuro lejano de una ejecución: mide cuándo falla la predicción.',
  ],
  resonance: [
    'Periodos orbitales y el ángulo entre las órbitas, frente al tiempo.',
    'Una resonancia es una razón fija de periodos, así que los cuerpos se encuentran en los mismos lugares.',
    'Si el ángulo resonante libra (oscila) o circula (sigue girando).',
    'Una razón de periodos casi exacta no es resonancia salvo que el ángulo libre.',
  ],
  stellar: [
    'Brillo (vertical, creciente hacia arriba) frente a temperatura superficial (horizontal, más caliente a la izquierda).',
    'El lugar de una estrella indica su masa y edad; la secuencia principal es donde pasan la mayor parte de su vida.',
    'Qué estrellas son más calientes, grandes o brillantes, y cómo cambia la forma con la edad.',
    'Los modelos siguen estrellas promedio; una estrella medida tiene sus propias incertidumbres.',
  ],
  stellarEvolution: [
    'El mismo diagrama con una estrella que avanza por su trayectoria al envejecer.',
    'Cada giro de la trayectoria es un cambio en la manera en que la estrella produce energía.',
    'En qué fase está la estrella y cuánto dura cada fase.',
    'El ritmo está acelerado; las fases no duran lo mismo.',
  ],
  observing: [
    'Hora de la noche frente a la altura del objetivo sobre el horizonte, y la fuerza de cada señal periódica.',
    'La masa de aire es cuánta atmósfera cruza la luz; un calendario con huecos oculta periodos.',
    'Cuándo se puede ver un objetivo y qué periodos no distingue un calendario.',
    'Un plan puede ser bueno para una noche y malo para todo un programa.',
  ],
  spectra: [
    'Brillo (vertical) frente a longitud de onda (horizontal).',
    'Las líneas oscuras de absorción marcan qué elementos y condiciones atravesó la luz de la estrella.',
    'Qué líneas son profundas y cómo cambian de una estrella a otra.',
    'Un espectro no da una distancia; da temperatura, composición y movimiento.',
  ],
  transit: [
    'Brillo de la estrella (vertical) frente al tiempo (horizontal).',
    'La caída es un planeta que cruza la estrella; su profundidad es aproximadamente el cuadrado de la razón de radios.',
    'La profundidad, la duración y cómo las cambian el ruido o una segunda estrella.',
    'Una caída por sí sola no prueba un planeta: otras estrellas y manchas pueden imitarla.',
  ],
  powerLaw: [
    'Una órbita bajo una fuerza que cae como una potencia elegida de la distancia.',
    'Una órbita que se cierra es señal de una fuerza del inverso del cuadrado; si no, gira despacio.',
    'Si la elipse se cierra y cómo depende el periodo de la distancia.',
    'Una órbita que gira puede venir de la ley de fuerza o de los pasos del ordenador; revisa el paso.',
  ],
  gw: [
    'Deformación (un estiramiento del espacio, vertical) frente al tiempo (horizontal).',
    'La señal sube en tono y tamaño según dos agujeros negros caen en espiral.',
    'El tono y la rapidez de la subida, que dependen de las masas.',
    'La masa y la distancia se compensan; una señal sola no fija las dos.',
  ],
  light: [
    'Brillo por unidad de longitud de onda (vertical) frente a la longitud de onda en escala logarítmica (horizontal).',
    'El máximo se mueve a longitudes de onda más cortas al subir la temperatura, y toda la curva sube con él.',
    'Dónde está el máximo, cómo muestrean la curva las dos bandas y el índice de color que dan.',
    'Una estrella real no es un cuerpo negro: sus líneas y saltos cambian el color medido respecto de este.',
  ],
  sky: [
    'El cielo como un modelo calculado: alturas, horas y ángulos para un lugar y una fecha.',
    'Cada lectura es un número de un modelo del Sol, la Luna, las estrellas y los planetas, listado bajo la imagen.',
    'Cómo cambia una altura, una hora o un ángulo al mover la fecha, el lugar o un límite.',
    'Es un modelo, bueno a una fracción de grado para el Sol y la Luna y a unos 0,2 grados para los planetas; no es el cielo de esta noche.',
  ],
  gwEvents: [
    'Deformación real del detector frente al tiempo, y un mapa de tono frente al tiempo.',
    'Una traza ascendente en el mapa es el chirrido de una espiral.',
    'Cuándo aparece la señal y si un modelo del suceso la sigue.',
    'El ruido es real y en los datos sin tratar suele ser mayor que la señal.',
  ],
  'plot-measure': [
    'Tus propias medidas, un punto cada una, con las magnitudes nombradas en los ejes.',
    'Una línea recta de puntos indica que las magnitudes son proporcionales o, tras una transformación, una ley de potencias.',
    'La pendiente y cuánto se acercan los puntos a ella.',
    'Una recta por pocos puntos es una hipótesis, no una prueba de la ley.',
  ],
  'plot-series': [
    'Una columna de los datos (vertical) frente a otra (horizontal), con unidades en ambas.',
    'Una barra sobre un punto es su incertidumbre; un punto hueco y gris queda fuera de todo cálculo.',
    'Tendencias, huecos y valores atípicos, y lo grandes que son las incertidumbres.',
    'Donde no hay barras, los datos no indican incertidumbre; eso no es una afirmación de precisión.',
  ],
  'plot-table': [
    'Dos columnas de una tabla de objetos, un punto por objeto.',
    'Los grupos de puntos son poblaciones; un diagrama color-magnitud ordena estrellas por temperatura y brillo.',
    'Cúmulos, secuencias y objetos aislados.',
    'Una zona densa se aclara en el dibujo; la tabla de abajo guarda todas las filas.',
  ],
  'plot-log': [
    'Un eje donde cada paso es un factor de diez.',
    'Una recta en un eje logarítmico es una ley de potencias (ambos logarítmicos) o una exponencial (uno).',
    'La pendiente en ejes log-log, que es el exponente.',
    'El cero y los valores negativos no se pueden dibujar en un eje logarítmico.',
  ],
  'plot-bars': [
    'Barras con los recuentos o valores de cada intervalo o categoría.',
    'Una barra más alta significa más valores en ese rango.',
    'La forma de la dispersión: dónde alcanza el máximo y cuánto se extiende.',
    'El ancho de los intervalos cambia el aspecto; los números junto al gráfico son exactos.',
  ],
  'plot-light-curve': [
    'Brillo (vertical) frente al tiempo (horizontal).',
    'Una caída es un oscurecimiento; una repetición regular da un periodo.',
    'La profundidad, la duración de cada caída y el tiempo entre caídas.',
    'Los huecos en los datos ocultan sucesos; unos pocos puntos no descartan una caída.',
  ],
  'plot-rv': [
    'Velocidad de la estrella en la línea de visión (vertical) frente al tiempo o la fase (horizontal).',
    'Una onda que se repite es la órbita de la estrella alrededor del centro de masas común.',
    'El periodo y la semialtura de la onda, que da la velocidad.',
    'La velocidad da la masa del planeta solo multiplicada por la inclinación desconocida de la órbita.',
  ],
  'plot-energy': [
    'Energía (vertical) frente al tiempo (horizontal), con la cinética, la potencial y la total como líneas separadas.',
    'Las líneas que se mueven en sentidos opuestos son energía que cambia de forma.',
    'Si el total es constante y cuándo alcanzan su máximo las otras.',
    'Una energía que cambia sin causa externa es señal del método numérico.',
  ],
  'plot-ellipse': [
    'Una elipse con la estrella en un foco y deslizadores para su forma.',
    'La excentricidad es lo lejos que queda la estrella del centro, como fracción del semieje mayor.',
    'Cómo cambian la forma y las dos distancias al mover el deslizador.',
    'Un dibujo a una escala; los deslizadores no cambian el tamaño de la órbita.',
  ],
  'plot-experiment': [
    'Un resultado (vertical) en cada valor del ajuste (horizontal), con un intervalo alrededor de cada promedio.',
    'Un intervalo es donde probablemente caería el promedio si se repitiera el experimento.',
    'Si el resultado cambia con el ajuste más de lo que se solapan los intervalos.',
    'Intervalos que se solapan no prueban que no haya efecto; más ensayos los estrechan.',
  ],
  'plot-compare': [
    'La misma magnitud de dos o más ejecuciones o métodos, lado a lado.',
    'Un hueco entre curvas es una diferencia entre las ejecuciones.',
    'Dónde coinciden, dónde se separan y en cuánto.',
    'Que dos simulaciones coincidan no hace correcta a ninguna.',
  ],
  'observatory-image': [
    'Una imagen del cielo, con una posición celeste en cada píxel.',
    'Las zonas brillantes son fuentes; la escala de brillo es una elección para verlas.',
    'Dónde está una fuente y cómo se compara con sus vecinas.',
    'Cambiar el contraste altera el aspecto, nunca los datos de debajo.',
  ],
  'observatory-measure': [
    'Una región elegida de los datos y el número medido en ella.',
    'Un valor medido viene con un método, un fondo y una incertidumbre declarados.',
    'El valor, su incertidumbre y lo que se supuso para obtenerlo.',
    'Otra elección de región o de fondo daría otro valor; compáralos.',
  ],
  'observatory-fit': [
    'Los datos y una curva del modelo, con las diferencias sobrantes debajo.',
    'Un buen ajuste deja diferencias que se reparten al azar en torno a cero.',
    'Los valores ajustados, sus incertidumbres y el patrón de las diferencias.',
    'Un modelo que ajusta no es por eso cierto; compara uno más simple y otro más rico.',
  ],
  'observatory-archive': [
    'Una lista de observaciones archivadas y sus fuentes.',
    'Cada entrada registra quién observó, cuándo y con qué condiciones de uso.',
    'Qué observación responde a tu pregunta y cómo se redujo.',
    'Abrir una observación no la comprueba; lee las notas sobre cómo se hizo.',
  ],
  'analysis-sweep': [
    'El resultado de muchos ensayos (vertical) en cada valor del ajuste (horizontal).',
    'La tendencia con el ajuste y la dispersión de los ensayos son cosas distintas que leer.',
    'Con qué fuerza el resultado sigue al ajuste y de dónde viene la incertidumbre.',
    'Una pendiente ajustada describe estos ensayos; no es la probabilidad de que un modelo sea cierto.',
  ],
  'analysis-models': [
    'Varias curvas de modelo ajustadas a un mismo conjunto de datos, con una puntuación cada una.',
    'Un peso es el apoyo relativo entre los modelos comparados, no la probabilidad de que uno sea cierto.',
    'Qué modelo prefieren los datos y por cuánto.',
    'Si el mejor modelo no está en la lista, los pesos no pueden decirlo.',
  ],
};
