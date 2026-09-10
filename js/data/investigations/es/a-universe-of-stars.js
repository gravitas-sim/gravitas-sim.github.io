// =============================================================================
// a-universe-of-stars - es
// -----------------------------------------------------------------------------
// A shadow of ../a-universe-of-stars.js carrying only its words. Laid over the
// English lesson by mergeTranslation() in ../i18n.js, so anything absent here
// keeps its English and nothing here can reach the lesson's machinery: no
// scenario name, no seed, no widget id, no numeric answer, no probe.
//
// Arrays line up by index with the English. `null` means "not translated";
// that entry keeps its English.
// =============================================================================

export default {
  title: 'Un universo de estrellas',
  subtitle:
    'Tamaño, color y el diagrama H-R, a partir de ocho estrellas modeladas',
  duration: '70-90 min',
  level: 'Astronomía introductoria',
  summary:
    'Tres estrellas, sin etiquetas, y una conjetura sobre cuál es la mayor. A lo largo de veintiocho pasos separas las cuatro cosas que siempre se confunden entre sí —masa, radio, temperatura y luminosidad—, aprendes a leer el diagrama que las organiza, encuentras gigantes, supergigantes y enanas blancas en el lugar que ocupan realmente, averiguas por qué las estrellas más pesadas viven menos tiempo y terminas contando dos veces una población sintética para ver por qué las estrellas que puedes ver no son las estrellas que hay.',
  objectives: [
    'Distinguir masa, radio, temperatura, luminosidad y brillo aparente',
    'Leer una posición en un diagrama H-R, y saber por qué la temperatura va al revés',
    'Usar la relación entre temperatura, luminosidad y radio en ambos sentidos',
    'Decir qué es la secuencia principal y nombrar dos tipos de estrella que no están en ella',
    'Explicar por qué una gigante es una etapa de una vida y no una estrella pesada',
    'Explicar por qué una estrella con más combustible puede agotarlo antes',
    'Reconocer un efecto de selección en una muestra de estrellas',
  ],
  steps: [
    {
      title: 'Tres estrellas, sin etiquetas',
      body: 'En el escenario hay tres estrellas, dibujadas en una escala común, así que la que parece mayor <em>es</em> mayor. Sus números están apagados en este paso.\n\nAntes de que se revele nada, decide qué puede decirte de verdad esta imagen. Compromete una respuesta; se te volverá a preguntar por ella justo al final.',
      prompt: 'Solo con esta imagen, ¿de qué puedes estar seguro?',
      options: [
        'De cuál es la mayor: están dibujadas en una escala común, así que el tamaño se puede leer',
        'De cuál es la más luminosa: será la que se vea más brillante en pantalla',
        'De cuál tiene más masa: la estrella más grande es la más pesada',
        'De las tres, porque tamaño, brillo y masa van juntos',
      ],
      because:
        'Solo del tamaño. El escenario usa una única escala para las tres, así que la mayor es realmente la mayor. Las otras dos son trampas. El brillo en pantalla es una decisión de dibujo: el laboratorio dibuja igual de brillante una estrella cien mil veces más débil que el Sol, porque si no no la verías, y el pie de la imagen lo dice. Y la masa no acompaña al tamaño: cuando aparezcan los números verás que la estrella 3, la mayor de las tres, tiene alrededor de una quinta parte de la masa de la estrella 2, y que la 2 emite doce veces más luz siendo una cuarta parte de grande. Esas cuatro palabras —masa, radio, temperatura, luminosidad— son cuatro cosas distintas, y separarlas es para lo que sirven los veintisiete pasos siguientes.',
      tool: {
        note: 'Tres estrellas modeladas en una escala común. Los números están apagados en este paso a propósito.',
      },
      tip: 'El tamaño en este escenario es real. El brillo en pantalla no lo es: está elegido para que toda estrella se vea, y el pie de la imagen lo dice.',
    },
    {
      title: 'Ahora los números',
      body: 'Las mismas tres estrellas, con las etiquetas puestas. Todo lo que dibuja la imagen está también en la lista de debajo, que es de donde salen las medidas de esta lección.\n\nLee las tres temperaturas superficiales y anótalas de la más fría a la más caliente. La unidad es el kelvin: del mismo tamaño que un grado Celsius, contado desde el cero absoluto, así que una habitación templada está a unos 293 K.',
      fields: [
        { label: 'La más fría de las tres' },
        { label: 'La intermedia' },
        { label: 'La más caliente de las tres' },
      ],
      tip: 'La lista de debajo son los datos de la propia imagen. Toda medida de esta lección se puede leer ahí sin interpretar el dibujo.',
    },
    {
      title: 'Lo que la temperatura le hace al color',
      body: 'Pasa el laboratorio a un punto elegido —el botón de modo está bajo el diagrama— y mueve el cursor a izquierda y derecha por una misma línea horizontal. La izquierda es lo más caliente.\n\nEstás cambiando una sola cosa y mirando qué se sigue de ella. La estrella dibujada junto al diagrama es la misma estrella a la temperatura que hayas seleccionado.',
      checklist: [
        'Pulsa «Cambiar de modo» hasta que la lectura diga «Un punto que elegiste»',
        'Lleva el cursor al extremo izquierdo del diagrama y mira la estrella de al lado',
        'Llévalo al extremo derecho y vuelve a mirar',
        'Vuelve a unos 6.000 K y párate ahí',
        'Observa la temperatura en la lista de debajo mientras te mueves',
        'Lee el pie bajo la estrella: el color es de la estrella, el brillo no',
      ],
      tip: 'Puedes hacer clic o arrastrar sobre el diagrama, usar las flechas del teclado o escribir en los dos deslizadores: las tres cosas son lo mismo. Nada de esta lección se califica según el tono que veas.',
    },
    {
      title: 'Dos estrellas, una temperatura',
      body: 'Las dos estrellas del escenario tienen la superficie cerca de 4.300 K. Son del mismo color, porque el color sigue a la temperatura superficial y a nada más.\n\nUna de ellas emite unas trescientas veces más luz que la otra.\n\nPiensa qué significa una temperatura fija. Cada metro cuadrado de una superficie a 4.300 K radia lo mismo por segundo, sea de la estrella que sea: eso <em>es</em> una temperatura. Así que la única forma de que una de ellas emita trescientas veces más luz es tener muchísimos más metros cuadrados.',
      tip: 'La luminosidad es toda la luz que emite una estrella. El brillo aparente es cuánta te llega, y eso depende además de la distancia. Este paso trata de lo primero.',
    },
    {
      title: '¿Cuál es mayor, y por cuánto?',
      body: 'Las mismas dos estrellas. La misma temperatura superficial. Una unas trescientas veces más luminosa.\n\nCompromete una respuesta antes de medir. El razonamiento importa más que el número: la superficie de una estrella crece con el <em>cuadrado</em> del radio.',
      prompt:
        'Dos estrellas a la misma temperatura superficial, una 300 veces más luminosa. Su radio es unas…',
      options: [
        '300 veces mayor',
        '17 veces mayor',
        'el mismo: luminosidad y tamaño son propiedades separadas',
        '90.000 veces mayor',
      ],
      because:
        'Unas diecisiete, porque el área va con el cuadrado del radio y la raíz cuadrada de 300 es poco más de 17. Eso es toda la relación entre las tres magnitudes: la luz que emite una estrella es su superficie multiplicada por lo fuerte que radia cada trozo de esa superficie, y a temperatura fija el segundo factor es el mismo para las dos. Duplica el radio y cuadruplicas la luz.',
      tip: 'Radio, no diámetro. Todos los tamaños de esta lección son radios, en unidades del radio del Sol: 696.000 km.',
    },
    {
      title: 'Mídelo',
      body: 'Lee los dos radios en la lista y haz tú la división. El escenario da la razón en la línea de la segunda estrella, así que puedes comprobar tu resultado.\n\nDespués pulsa <strong>Guardar en el cuaderno</strong>. La entrada registra qué modelos eran estos y qué calculó el laboratorio, de modo que la comparación es una prueba y no un número recordado.',
      fields: [
        { label: 'Radio de la menor' },
        { label: 'Radio de la mayor' },
        { label: 'Cuántas veces mayor' },
      ],
      tip: 'Este atajo funciona porque las temperaturas coinciden. Cuando no coinciden se mueven los dos factores a la vez, que es para lo que sirve el diagrama del paso siguiente.',
    },
    {
      title: 'El diagrama, y su eje al revés',
      body: 'De aquí en adelante todo ocurre en un mismo diagrama: la temperatura a lo largo de la base, la luminosidad por el lateral, las dos logarítmicas, de modo que un paso a lo largo de un eje es una multiplicación y no una suma.\n\nUna rareza a la que conviene acostumbrarse ya: <strong>la temperatura crece hacia la izquierda.</strong> Caliente a la izquierda, frío a la derecha. No hay una buena razón: las primeras versiones de este diagrama se dibujaron contra clases espectrales que estaban ordenadas así, y desde entonces todo el mundo lo lee al revés. Pilla a cualquiera una vez. Los dos extremos del eje están rotulados.\n\nPon el cursor lo más cerca que puedas de 10.000 K y 100 luminosidades solares, y anota dónde has caído en realidad.',
      fields: [
        { label: 'Temperatura donde lo pusiste' },
        { label: 'Luminosidad ahí' },
      ],
      tip: 'Haz clic o arrastra sobre el diagrama, muévelo con las flechas del teclado o escribe números en los deslizadores. Los deslizadores son el mismo instrumento.',
    },
    {
      title: 'Encuentra el Sol',
      body: 'La superficie del Sol está a 5.772 K y su luminosidad es, por definición, una luminosidad solar. Pon ahí el cursor y lee el radio.\n\nDeberías obtener alrededor de un radio solar. No es un razonamiento circular: el laboratorio no está consultando el Sol en ninguna tabla. Está calculando un radio a partir de la temperatura y la luminosidad que has puesto, con la misma relación que usa en todas partes. Que salga 1,0 es una comprobación de que la relación hace su trabajo.',
      fields: [{ label: 'Radio que da el laboratorio' }],
      tip: 'El Sol es la referencia de las tres unidades de aquí: R☉, L☉ y M☉. Es una comodidad, no una afirmación de que sea una estrella típica. El paso 24 enseña qué aspecto tiene lo típico.',
    },
    {
      title: 'Recto hacia arriba, a una temperatura',
      body: 'Desde la posición del Sol, mueve el cursor recto hacia arriba —más brillante, la misma temperatura— hasta 10.000 luminosidades solares, y lee el radio ahí.\n\nEstás repitiendo la comparación del paso 6, pero haciéndola tú y en un rango mucho mayor.',
      fields: [{ label: 'Radio a 5.772 K y 10.000 L☉' }],
      tip: 'Fíjate en cómo cambia la clase de tamaño en la lectura según subes. Es una etiqueta pegada a una zona del diagrama, no una medida aparte.',
    },
    {
      title: 'De lado, a una luminosidad',
      body: 'Ahora en la otra dirección. Pon el cursor en 1 luminosidad solar y recorre esa línea, del lado frío de la derecha al lado caliente de la izquierda, mirando el radio.\n\nA luminosidad fija, una superficie más caliente radia muchísimo más por metro cuadrado —con la cuarta potencia de la temperatura—, así que la estrella necesita menos metros cuadrados para emitir la misma luz.',
      prompt:
        'Moviéndose a la izquierda por una línea de luminosidad constante, de 3.000 K a 30.000 K, el radio…',
      options: [
        'crece, porque las estrellas más calientes son mayores',
        'no cambia, porque la luminosidad está fija',
        'se reduce en un factor de unas 100 veces',
        'se reduce en un factor de unas 10 veces',
      ],
      because:
        'Se reduce unas cien veces. Diez veces la temperatura son diez a la cuarta —diez mil veces— de emisión por metro cuadrado, y para mantener fija la luz total el área tiene que caer esas mismas diez mil, que son cien en radio. Compruébalo en el diagrama: a 1 L(sol) el extremo frío está en unos 3,7 radios solares y el caliente en unos 0,037. Ese segundo número es territorio de enana blanca, y el paso 20 vuelve sobre él.',
      tip: 'Los dos movimientos —hacia arriba y a lo largo del diagrama— son la misma relación usada en direcciones distintas. No se está introduciendo nada nuevo.',
    },
    {
      title: 'Líneas de un mismo tamaño',
      body: 'Activa las <strong>líneas de radio constante</strong>. Cada línea de trazos une todas las parejas de temperatura y luminosidad que dan un mismo radio, y en estos ejes salen rectas.\n\nUsa la línea de 1 R☉. Busca dos puntos sobre ella con temperaturas claramente distintas y anota la luminosidad en cada uno: dos estrellas del tamaño del Sol, una caliente y otra fría.',
      fields: [
        { label: 'Punto más frío, temperatura' },
        { label: 'Su luminosidad' },
        { label: 'Punto más caliente, temperatura' },
        { label: 'Su luminosidad' },
      ],
      tip: 'Las líneas son rectas porque log L = 2 log R + 4 log T: a radio fijo eso es una recta de pendiente 4. Por eso este diagrama separa tan limpiamente las gigantes de las enanas.',
    },
    {
      title: 'Estrellas que están modeladas de verdad',
      body: 'Hasta ahora cada punto lo elegías tú. Vuelve a <strong>Una estrella modelada</strong> y la lectura cambia de naturaleza: ahora hay una masa, una edad, una fase y una vida, porque un cálculo publicado de evolución estelar puso esta estrella aquí y sabe cómo llegó.\n\nHay ocho incluidas, de 0,2, 0,5, 1, 2, 5, 10, 20 y 40 masas solares, todas con la composición del Sol y sin rotación. Recórrelas y mira dónde se sitúa cada una.',
      checklist: [
        'Pulsa «Cambiar de modo» hasta que la lectura diga «Una estrella modelada»',
        'Mueve el deslizador «Estrella modelada» de 0,2 M☉ a 40 M☉, paso a paso',
        'Observa cómo el marcador sube y va hacia la izquierda según crece la masa',
        'Lee la masa, la edad y la fase en la lista en cada parada',
        'Fíjate en que la banda que trazan los marcadores es la zona sombreada de la secuencia principal',
      ],
      tip: 'Las zonas sombreadas están dibujadas a partir de los puntos inicial y final de estas mismas trazas, así que la banda y los marcadores no pueden contradecirse.',
    },
    {
      title: 'Tres estrellas de la secuencia principal',
      body: 'Tres estrellas fijadas, las tres a mitad de su vida en la secuencia principal: 0,2, 1 y 20 masas solares.\n\nLee la temperatura y la luminosidad de la menor y de la mayor, y calcula cuántas veces más luz emite la pesada.',
      fields: [
        { label: 'Luminosidad de la estrella de 0,2 M☉' },
        { label: 'Luminosidad de la estrella de 20 M☉' },
        { label: 'Cuántas veces más luz' },
      ],
      tip: 'Ordena el escenario por luminosidad y por temperatura además de por radio: los tres criterios ponen estas estrellas en el mismo orden, y eso dejará de ser cierto en el paso 17.',
    },
    {
      title: '¿Con cuánta pendiente?',
      body: 'Tienes dos puntos de la secuencia principal: 0,2 masas solares dando unas 0,0066 luminosidades solares, y 20 masas solares dando unas 59.000.\n\nCien veces la masa, nueve millones de veces la luz. Compromete la forma de esa relación antes de comprobar las estrellas intermedias.',
      prompt:
        'A lo largo de la secuencia principal, la luminosidad crece aproximadamente como la masa elevada a…',
      options: ['1, proporcional', null, null, null],
      because:
        'Aproximadamente a 3,5, y esta medida da 3,5 casi exactamente: nueve millones son cien elevado a 3,5. No es una ley de la naturaleza —es un resumen de lo que producen los cálculos de estructura estelar para estrellas sostenidas como lo están las de la secuencia principal— y el exponente no es realmente constante: es más pronunciado cerca de una masa solar y más suave en el extremo alto. Lo que importa para el resto de la lección es que es muy pronunciado. Una estrella con diez veces la masa no emite diez veces la luz; emite miles de veces más.',
      tip: 'Cien elevado a 3,5 es diez elevado a siete, que son diez millones: bastante cerca de nueve millones para una relación tan aproximada.',
    },
    {
      title: 'Las ocho, en una comparación',
      body: 'Comprueba la tendencia en todo el conjunto y no solo en sus dos extremos. Vuelve al laboratorio, recorre el deslizador de masa por los ocho modelos y anota la luminosidad de las estrellas de 1, 5 y 20 masas solares.\n\nEsto es una comparación controlada: cada estrella está a mitad de su vida en la secuencia principal, todos los modelos tienen la misma composición y ninguna rotación, y lo único que cambia es la masa.',
      fields: [null, null, null],
      tip: 'El banco que ejecuta experimentos A/B en Gravitas mide órbitas, no estrellas, así que esta comparación se hace directamente sobre los modelos. Las notas del profesorado explican por qué las dos cosas no se pueden unir.',
    },
    {
      title: 'Qué cubre la tendencia y qué no',
      body: 'Has medido una relación muy pronunciada entre masa y luminosidad, y la has medido sobre ocho estrellas que estaban haciendo todas lo mismo: fusionar hidrógeno en el núcleo, a mitad de su vida.\n\nLa gigante del paso 4 tenía una masa de casi exactamente una masa solar y emitía 58 luminosidades solares, cincuenta veces lo que da la relación de la secuencia principal para esa masa.',
      prompt:
        'En dos o tres frases: ¿qué es la secuencia principal, y por qué la relación masa-luminosidad que has medido no se aplica a esa gigante?',
      tip: 'La palabra «secuencia» también es un accidente histórico. Es una secuencia en masa, no en el tiempo: ninguna estrella la recorre.',
    },
    {
      title: 'Dos estrellas rojas',
      body: 'Las dos estrellas del escenario tienen la superficie cerca de 3.350 K. Las dos son rojas. Las dos se clasifican como M.\n\nUna es una estrella de 0,2 masas solares fusionando hidrógeno en su núcleo. La otra empezó con una masa solar —la del Sol— y ya ha terminado de hacerlo.\n\nEl escenario está en <em>tamaños relativos reales</em>. Míralo y después comprométete.',
      prompt: 'Las dos estrellas se diferencian en radio en un factor de unas…',
      options: [
        null,
        null,
        null,
        'nada: la misma temperatura significa el mismo tamaño',
      ],
      because:
        'Unas cuatrocientas. La pequeña tiene 0,24 radios solares y la hinchada 102. Son del mismo color y de la misma temperatura, y una se tragaría a la otra doscientos millones de veces. Por eso «estrella roja» no es una categoría útil por sí sola, y es la demostración más clara de toda la lección de que el color habla de una superficie y no dice nada de un tamaño. Lo que las separa no es el color sino la luminosidad: una es una enana roja y la otra una gigante roja.',
      tip: 'Si la más pequeña aparece como un marcador y no como un disco, no es un fallo del dibujo: el pie lo dice. A esta escala es de verdad más pequeña que un píxel.',
    },
    {
      title: 'Mídelas, y mide su luz',
      body: 'Lee los dos radios y las dos luminosidades en la lista, y calcula las dos razones.\n\nDespués guarda la comparación en el cuaderno: esta es la pieza central del argumento que se te pedirá escribir al final.',
      fields: [
        { label: 'Radio de la enana' },
        { label: 'Radio de la gigante' },
        { label: 'Luminosidad de la enana' },
        { label: 'Luminosidad de la gigante' },
        { label: 'Razón de radios' },
        { label: 'Razón de luminosidades' },
      ],
      tip: 'Una gigante no es una estrella pesada. Esta tiene 0,97 masas solares —menos que el Sol, porque ya ha expulsado parte— y la enana de al lado tiene 0,2.',
    },
    {
      title: 'Y ahora una supergigante',
      body: 'Se une una tercera estrella: un modelo que empezó con veinte masas solares, al final de la traza, donde MESA dejó de seguirlo justo antes de que su núcleo colapsara.\n\nEl Sol está en el escenario como referencia, y allí donde una estrella es mayor que una órbita del sistema solar, esa órbita se dibuja como un círculo de trazos para dar escala. Es una comparación de tamaños y nada más: nadie afirma que hubiera nunca un planeta ahí.\n\nAnota su radio y su masa actual.',
      fields: [
        { label: 'Radio de la supergigante' },
        { label: 'Su masa ahora' },
      ],
      tip: 'Cambia el escenario a «ajustar cada uno» y vuelve. En ese modo cada estrella llena su propio recuadro y la ampliación aparece bajo cada una, porque los tamaños aparentes ya no son comparables.',
    },
    {
      title: 'Caliente, y casi invisible',
      body: 'De vuelta al laboratorio, en la traza de una masa solar, con el deslizador de edad marcado por fases y no por tiempo: si no, todo lo que sigue a la secuencia principal es una franja en la que no puedes caer.\n\nArrastra el deslizador de edad hasta el extremo derecho, al final mismo de la traza. Lo que queda es el núcleo desnudo de la estrella: sin fusión, solo una brasa caliente enfriándose.\n\nLee su temperatura, su luminosidad y su radio.',
      fields: [
        { label: 'Temperatura' },
        { label: 'Luminosidad' },
        { label: 'Radio' },
      ],
      tip: 'Pulsa «Cambiar lo que marca el deslizador de edad» para volver al tiempo y mira cómo todo este tramo de la traza se reduce a la última franja del deslizador. Las dos cosas son ciertas; responden a preguntas distintas.',
    },
    {
      title: 'Lee el diagrama',
      body: 'Ya has visto las cuatro zonas. Se encuentra una estrella a 30.000 K y 0,01 luminosidades solares.\n\nCalcula su radio antes de responder: puedes poner ahí el cursor en el modo libre y la lectura hará la aritmética.',
      prompt: 'Una estrella a 30.000 K y 0,01 L☉ es…',
      options: [
        'una estrella caliente de la secuencia principal, porque está a 30.000 K',
        'una enana blanca, porque esa temperatura y esa debilidad juntas la obligan a ser diminuta',
        'una gigante roja, porque es débil',
        'imposible: nada puede estar tan caliente y ser tan débil',
      ],
      because:
        'Una enana blanca. A 30.000 K cada metro cuadrado radia ferozmente, así que emitir solo una centésima de luminosidad solar exige muy poca superficie: el radio sale en unos 0,0037 radios solares, bastante menos que el tamaño de la Tierra. Una estrella de la secuencia principal a 30.000 K estaría en decenas de miles de luminosidades solares, seis millones de veces más brillante que esta. La posición en el diagrama basta para clasificarla, porque los dos ejes fijan el radio entre ambos, y para eso sirve el diagrama.',
      tip: 'Las zonas del diagrama están dibujadas como bloques suaves con el borde de trazos a propósito. Una estrella no es gigante por cruzar una línea; el sombreado resume dónde acaba cada tipo de estrella.',
    },
    {
      title: '¿Más combustible, más vida?',
      body: 'Una estrella de veinte masas solares tiene cien veces más material que una de 0,2. Cien veces el combustible.\n\nTambién has medido, en el paso 15, que emite algo así como nueve millones de veces más luz, y la luz es el combustible saliendo.\n\nComprométete antes de consultarlo.',
      prompt:
        'La vida en la secuencia principal de la estrella de 20 M☉, comparada con la de 0,2 M☉, es…',
      options: [
        'unas cien veces más larga: tiene cien veces el combustible',
        'aproximadamente igual: los dos efectos se cancelan',
        'unas cien mil veces más corta',
        'unas diez veces más corta',
      ],
      because:
        'Más de cien mil veces más corta. Esta es la consecuencia más útil de lo pronunciada que es la relación masa-luminosidad, y conviene enunciarla como una razón: lo que dura el combustible es cuánto hay dividido por lo deprisa que se va. El combustible va con la masa y el ritmo va con la luminosidad, que va aproximadamente con la masa a la 3,5. Así que la vida va con la masa dividida por la masa a la 3,5, que es uno partido por la masa a la 2,5. Cien veces la masa son cien elevado a dos y medio —cien mil— veces menos. El paso siguiente lo mide.',
      tip: 'Un coche con un depósito mayor no llega necesariamente más lejos. Depende de lo que haga el motor con él.',
    },
    {
      title: 'Cuánto dura cada una',
      body: 'La lectura da la vida total en la secuencia principal del modelo seleccionado. Recorre el deslizador de masa y anota tres de ellas.\n\nUno de estos números merece cuidado. El modelo de 0,2 masas solares da una vida en la secuencia principal de unos 1,1 <em>billones</em> de años. El Universo tiene unos 13.800 millones de años, aproximadamente una milésima de eso. Así que ninguna estrella así ha terminado su secuencia principal en ninguna parte. Esa cifra es una predicción obtenida integrando un modelo hacia adelante, no una vida observada, y no se puede contrastar con nada.',
      fields: [
        { label: 'Vida en la secuencia principal de 0,2 M☉' },
        null,
        null,
      ],
      tip: 'Aquí usa el deslizador de edad marcado por tiempo, no por fases. Marcado por tiempo, lo que ha avanzado el mando es de verdad lo que ha avanzado la vida, que es justo lo que pregunta este paso.',
    },
    {
      title: 'Cuatrocientas estrellas',
      body: 'Una población sintética: cuatrocientas estrellas extraídas de una distribución publicada de masas de nacimiento, repartidas por los últimos diez mil millones de años, cada una situada sobre las mismas trazas que has estado usando, las que van de 0,2 a 20 masas solares, que es el rango en el que se muestrea la función de masas. Es reproducible a partir de su semilla y no es un sondeo: nada en ella se ha observado y ninguna de sus estrellas es real.\n\nEl histograma las cuenta por tipo espectral: O y B son las calientes, luego A, F, G —el Sol es una G— y después K y las frías enanas M.\n\nCuenta los dos tipos más comunes.',
      fields: [
        { label: 'Cuántas son de tipo M' },
        { label: 'Cuántas son de tipo K' },
        { label: 'Cuántas son de tipo G, como el Sol' },
      ],
      tip: 'La lectura da cada recuento como número además de dibujarlo, y dice qué deja fuera la muestra: nada de polvo, nada de binarias, ninguna composición que no sea la del Sol.',
    },
    {
      title: 'Ahora solo las que podrías ver',
      body: 'Las mismas cuatrocientas estrellas: la misma muestra, no una nueva. Cambia la vista al subconjunto brillante. Cada estrella se coloca a la misma distancia, cien pársecs, y solo se conservan las que superan un corte de brillo declarado.\n\nEste es el modelo más burdo posible de lo que hace un sondeo, y es suficiente.\n\nVuelve a contar.',
      fields: [
        { label: 'Cuántas estrellas quedan' },
        { label: 'De esas, cuántas son de tipo M' },
        { label: 'Cuántas son de tipo F' },
      ],
      tip: 'El deslizador de umbral mueve el corte. Súbelo y los supervivientes son más raros y más calientes; bájalo y las enanas M vuelven. La población de debajo nunca cambia.',
    },
    {
      title: 'De qué es catálogo un catálogo de estrellas brillantes',
      body: 'Dos recuentos de una población. Dos tercios de enanas M; ninguna en absoluto cuando te quedas solo con las brillantes.\n\nTodas las estrellas que puedes ver a simple vista desde un lugar oscuro pertenecen a la segunda lista. Ni una sola enana M lo hace.',
      prompt:
        'En dos o tres frases: ¿por qué una lista de las estrellas más brillantes del cielo puede dar una impresión muy equivocada de cómo son las estrellas normalmente? Usa un número de tus dos recuentos.',
      tip: 'Esto es un efecto de selección: una conclusión sobre una muestra que en realidad es un hecho sobre cómo se eligió la muestra. No es una corrección pequeña en astronomía, y no es exclusivo de la astronomía.',
    },
    {
      title: 'Rompe una regla',
      body: 'Dos afirmaciones que suenan razonables y son las dos falsas:\n\n<strong>«Las estrellas rojas son pequeñas.»</strong>\n\n<strong>«Las estrellas más calientes son más luminosas.»</strong>\n\nElige una de las dos y rómpela con el laboratorio. Vale cualquiera de los ocho modelos a cualquier edad, y también el cursor libre, aunque si usas el cursor libre recuerda qué establece y qué no: enseña que una temperatura y una luminosidad <em>podrían</em> ir juntas, no que alguna estrella concreta lo haga.\n\nAnota las dos estrellas que hayas usado y guarda la comparación en el cuaderno como prueba.',
      fields: [
        { label: 'Temperatura de la estrella A' },
        { label: 'Luminosidad de la estrella A' },
        { label: 'Temperatura de la estrella B' },
        { label: 'Luminosidad de la estrella B' },
      ],
      tip: 'Las dos afirmaciones son ciertas para las estrellas de la secuencia principal, y por eso suenan bien. Ninguna es cierta para las estrellas en general, y aproximadamente una de cada mil estrellas cercanas al Sol es un contraejemplo de la segunda.',
    },
    {
      title: 'De vuelta a las tres estrellas',
      body: 'En el paso 1 se te enseñaron tres estrellas con los números apagados y se te preguntó qué podía decirte la imagen. Tu respuesta está guardada; nada la ha sobrescrito desde entonces.\n\nLas tres eran una estrella de secuencia principal de 0,2 masas solares, otra de secuencia principal de 5 masas solares y una gigante roja que empezó con una masa solar. La gigante era la mayor de las tres, con una quinta parte de la masa de la estrella intermedia y una doceava parte de su luminosidad.\n\nEscribe la explicación que darías ahora.',
      prompt:
        'Explica cómo se relacionan masa, temperatura, radio, luminosidad y vida, y dónde dejan de valer esas relaciones. Cita al menos dos de tus propias medidas y di si tu respuesta del paso 1 sigue en pie.',
      tip: 'Tu cuaderno tiene las medidas, con el modelo del que salió cada una. Ábrelo en otra pestaña si quieres citar un número exacto.',
    },
  ],
};
