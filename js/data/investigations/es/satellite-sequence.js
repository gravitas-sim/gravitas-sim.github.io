// La investigación de Júpiter (Prompt 193) - español, paso a paso con ../satellite-sequence.js (D-R10-74).
// Sin lectura por una persona que lea español con fluidez; los mensajes que calculan los validadores quedan en inglés, como en las demás investigaciones.

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

// Los anillos y las mareas (Prompt 204, segunda parte): paso a paso con el inglés.
export const WHY_RINGS = {
  title: '¿Por qué hay anillos?',
  subtitle:
    'Dónde se deshace una luna y dónde el tirón de una luna deja una marca en un anillo',
  objectives: [
    'Decir qué es el límite de Roche y por qué hay dos para un mismo par de cuerpos',
    'Hallar el límite de Roche rígido y el fluido de un par a partir de sus densidades, y decir si una órbita queda dentro, entre o fuera de ellos',
    'Hallar dónde cae la resonancia de una luna en un anillo y compararla con un hueco observado',
    'Decir qué muestran los escenarios y qué dejan fuera',
  ],
  steps: [
    {
      title: '¿Por qué hay anillos, y tan cerca?',
      body: 'Todos los planetas gigantes tienen anillos, y los anillos están cerca del planeta, donde el tirón del planeta sobre un cuerpo cambia más de un lado al otro del cuerpo. Esa diferencia es la <strong>marea</strong>. Un cuerpo que solo su propia gravedad mantiene unido se deshace donde la marea que lo atraviesa supera esa gravedad. Esta investigación halla dónde ocurre eso y qué más muestra un anillo.',
    },
    {
      title: 'Shoemaker-Levy 9 en Júpiter',
      body: 'En julio de 1992 el cometa Shoemaker-Levy 9 pasó a 1,3 radios de Júpiter del centro del planeta y se rompió en pedazos. Con el par en <strong>SL9, Júpiter</strong> (Shoemaker-Levy 9 y Júpiter), lee el <strong>límite rígido</strong> y el <strong>límite fluido</strong>, en radios de Júpiter (R).',
      fields: [
        { label: 'Límite rígido (radios del planeta)' },
        { label: 'Límite fluido (radios del planeta)' },
      ],
    },
    {
      title: 'Fobos y los límites',
      body: 'Fobos, la mayor de las lunas de Marte, orbita a 9 376 km del centro de Marte. Marte mide 3 389,5 km de radio y Fobos es una roca suelta, con cerca de la mitad de la densidad de Marte.',
      prompt: 'La órbita de Fobos queda&hellip;',
      options: [
        'dentro del límite rígido, donde debió haberse deshecho',
        'entre el límite rígido y el fluido',
        'fuera de ambos límites, donde nada se estira',
      ],
      hints: [
        'Calcula los dos límites con las dos densidades; el instrumento de abajo lo hace.',
      ],
      because:
        'Los dos límites con las densidades de Marte y de Fobos son 5 466 km (rígido) y 10 585 km (fluido) desde el centro de Marte; Fobos, a 9 376 km, queda entre ambos, así que solo un cuerpo unido por la gravedad sola se desharía.',
    },
    {
      title: 'Dónde queda la órbita de Fobos',
      body: 'Pon el par en <strong>Fobos, Marte</strong> y lee los dos límites en kilómetros desde el centro de Marte.',
      fields: [{ label: 'Límite rígido' }, { label: 'Límite fluido' }],
    },
    {
      title: 'Un cúmulo en un paso dentro del límite',
      body: 'Es un modelo a escala con gravedad newtoniana y nada más: un planeta y un cúmulo suelto de 60 partículas en una órbita que pasa a 1,3 radios del centro del planeta, dentro de los dos límites para la densidad del cúmulo, como hizo Shoemaker-Levy 9. Mira el paso. El cúmulo se estira en un chorro, unas dieciséis veces más largo que antes. El cúmulo es un enjambre suavizado, no una roca: es un dibujo de la marea, no de los fragmentos del cometa.',
      tip: 'Déjalo correr por el punto más cercano. La línea que dejan las partículas es el chorro.',
    },
    {
      title: 'Dónde cae la resonancia 2:1 de Mimas',
      body: 'La división de Cassini es un hueco en los anillos de Saturno. Una partícula del anillo que da dos vueltas por cada órbita de Mimas recibe el tirón de Mimas en el mismo punto de cada órbita. Con la luna en <strong>Mimas</strong>, p = 2 y q = 1, lee el <strong>radio de la resonancia 2:1</strong> en kilómetros y a qué distancia, en por ciento, queda del rasgo más cercano de los anillos.',
      fields: [
        { label: 'Radio de la resonancia 2:1' },
        { label: 'Respecto del rasgo más cercano' },
      ],
    },
    {
      title: 'Lo que muestra el escenario del anillo, y lo que no',
      body: 'Un planeta con la masa de Saturno, 200 partículas de anillo, una luna resonante cuya resonancia 2:1 cae en el anillo y una luna pastora dentro de él. Las dos lunas pesan mucho más que Mimas y Pan, para que veinte órbitas puedan mostrar algo. El resultado honesto de la corrida registrada para esta investigación es modesto: el anillo se adelgaza en la resonancia (19 partículas donde los tramos vecinos tienen 24) y el anillo sin luna queda como estaba, pero no se abre un hueco, y la pastora no deja un carril libre. Las partículas de este modelo nunca chocan, y un hueco real lo hace una resonancia que actúa sobre un anillo que sí choca.',
      tip: 'Compara el anillo con las lunas y sin ellas corriéndolo y volviéndolo a cargar.',
    },
    {
      title: 'Lo que has deducido',
      body: 'Dentro del límite de Roche un cuerpo que solo la gravedad mantiene unido se deshace, y el límite está al doble de distancia para un cuerpo que puede deformarse que para uno que no. La resonancia de una luna cae en un radio que fija solo su distancia, y la resonancia 2:1 de Mimas queda a menos de 0,6 por ciento del borde de la división de Cassini. Qué abre el hueco, y cuán vacío queda, depende de la masa de la luna y de cómo disipa el anillo, cosa que los instrumentos de aquí dejan fuera.',
    },
  ],
};

export const TIDES_THAT_MOVE_THE_MOON = {
  title: 'Mareas que mueven la Luna',
  subtitle:
    'El alejamiento de la Luna, el día que se alarga y el modelo que falla al correrlo hacia atrás',
  objectives: [
    'Decir por qué la Luna se aleja y el día se alarga, como un solo proceso',
    'Leer el alejamiento de la Luna y el alargamiento del día en un modelo de marea de Q constante y compararlos con la telemetría láser lunar y los registros de eclipses',
    'Correr el modelo hacia delante y hacia atrás y hallar dónde se detiene',
    'Decir qué supone el modelo y qué dice de él su fallo hacia atrás',
  ],
  steps: [
    {
      title: 'Un abultamiento que va por delante',
      body: 'La Luna levanta dos abultamientos en los océanos y el cuerpo de la Tierra. La Tierra gira más rápido de lo que la Luna orbita, así que el abultamiento se adelanta un poco a la línea hacia la Luna. Ese abultamiento tira de la Luna hacia delante, así que la Luna gana energía y se aleja, y la Luna tira del abultamiento hacia atrás, así que el giro de la Tierra se frena. El par intercambia momento angular; la suma se conserva. La tabla de abajo es la forma cerrada del modelo, no una simulación.',
    },
    {
      title: 'Qué tan rápido se aleja ahora la Luna',
      body: 'Con k2 = 0,30 y Q = 12 y el tiempo en 0, lee a qué ritmo se aleja la Luna, en cm por año, y cuánto se alarga el día, en milisegundos por siglo.',
      fields: [
        { label: 'El alejamiento de la Luna (cm por año)' },
        { label: 'El alargamiento del día (ms por siglo)' },
      ],
    },
    {
      title: 'Dentro de mil millones de años',
      body: 'La Luna está a unos 60 radios terrestres y se aleja unos pocos cm por año. El alejamiento se frena a medida que la Luna se aleja, porque la marea cae con fuerza con la distancia.',
      prompt: 'Dentro de mil millones de años la Luna estará a unos&hellip;',
      options: [
        '60 radios terrestres: casi no se mueve',
        '65 radios terrestres',
        '80 radios terrestres',
        '100 radios terrestres',
      ],
      hints: [
        'Mil millones de años a 3,75 cm por año serían 37 500 km si el ritmo fuera constante, y se frena en el camino.',
      ],
      because:
        'El modelo pone a la Luna a 414,6 mil km dentro de mil millones de años, unos 65 radios terrestres: el ritmo de 3,75 cm por año baja al alejarse la Luna, así que gana menos que los 37 500 km de un ritmo constante.',
    },
    {
      title: 'Mil millones de años adelante',
      body: 'Pon el tiempo en <strong>1</strong> mil millones de años y lee la distancia de la Luna en miles de km y la duración del día en horas.',
      fields: [
        { label: 'La distancia de la Luna (miles de km)' },
        { label: 'El día' },
      ],
    },
    {
      title: 'Córrelo hacia atrás',
      body: 'Pon el tiempo en <strong>&minus;2</strong> mil millones de años. El modelo no puede ir tan atrás. Lee hace cuántos miles de millones de años la órbita habría llegado a la superficie de la Tierra.',
      fields: [{ label: 'Contacto, hace miles de millones de años' }],
    },
    {
      title: 'Lo que has deducido',
      body: 'La Luna se aleja 3,75 cm por año en un modelo con una sola Q, cerca de los 3,82 medidos, y el día se alarga 2,05 ms por siglo, cerca de los 2,3 de los eclipses. Corrido hacia atrás, el mismo modelo pone a la Luna en contacto con la Tierra hace 1,58 miles de millones de años, dentro de la edad del sistema solar. Así que Q no fue constante: en una historia real cambió con los océanos y los continentes. Un parámetro que ajusta el presente no es una ley.',
    },
  ],
};

export const IOS_FIRE = {
  title: 'El fuego de Ío',
  subtitle:
    'El calentamiento de marea como energía por órbita, acotado por lo que nadie sabe del interior de Ío',
  objectives: [
    'Decir de dónde viene el calor de Ío y por qué necesita una órbita que no es del todo circular',
    'Leer el calor y la energía en una órbita en la fórmula de calentamiento de marea para un k2 y una Q dados',
    'Decir por qué la respuesta es una cota y no una predicción, y qué k2/Q necesita el calor observado',
    'Decir cómo depende el calentamiento de la excentricidad',
  ],
  steps: [
    {
      title: 'El cuerpo más volcánico que conocemos',
      body: 'Ío es el cuerpo con más actividad volcánica del sistema solar, sin ayuda del Sol. Su calor es la marea: Júpiter levanta un abultamiento en Ío, y como la órbita de Ío no es del todo circular (e = 0,0041) el abultamiento sube y baja una vez por órbita, y el rozamiento de esa flexión es calor. Cuánto depende de lo fácil que Ío se flexiona (k2) y de cuánto pierde al hacerlo (Q), y ninguno se conoce para Ío.',
    },
    {
      title: 'El calor para k2 = 1,5 y Q = 100',
      body: 'Pon k2 en 1,5 (lo máximo que puede tener un cuerpo, para un fluido), Q en 100 y la excentricidad en 0,0041. Lee el <strong>calentamiento</strong> en unidades de 10<sup>13</sup> W, y la energía en una órbita en unidades de 10<sup>19</sup> J.',
      fields: [
        { label: 'Calentamiento' },
        { label: 'Energía en una órbita (10¹⁹ J)' },
      ],
    },
    {
      title: 'Una órbita más excéntrica',
      body: 'El calentamiento es proporcional al cuadrado de la excentricidad, porque la subida y bajada del abultamiento es proporcional a ella y también el rozamiento.',
      prompt:
        'Si se duplicara la excentricidad de Ío, el calentamiento sería&hellip;',
      options: [
        'el doble',
        'cuatro veces mayor',
        'ocho veces mayor',
        'el mismo',
      ],
      hints: ['El calentamiento va como e al cuadrado.'],
      because:
        'El calentamiento va como e al cuadrado, así que duplicar la excentricidad da cuatro veces el calor: de 9,33 × 10¹³ W a 3,73 × 10¹⁴ W con k2 = 1,5 y Q = 100.',
    },
    {
      title: 'Duplicar la excentricidad',
      body: 'Pon la excentricidad en 0,0082 y lee el calentamiento en unidades de 10<sup>14</sup> W.',
      fields: [{ label: 'Calentamiento' }],
    },
    {
      title: 'Lo que la fórmula puede y no puede decir',
      body: 'Vuelve a poner la excentricidad en 0,0041. La línea <strong>Intervalo que permite el modelo</strong> es el calor para el mayor k2/Q (k2 = 1,5, Q = 5) y una milésima de él. Lee el <strong>k2/Q</strong> que necesita el valor medio del flujo de calor observado.',
      fields: [{ label: 'k2/Q que necesita el valor medio observado' }],
    },
    {
      title: 'Lo que has deducido',
      body: 'El calor de Ío viene de la marea, y la fórmula lo da como un múltiplo de k2/Q con la excentricidad al cuadrado. Para un k2 y una Q plausibles coincide con lo observado, y la fórmula sola no puede decir más, porque k2/Q no se conoce: la respuesta es una cota de tres órdenes de magnitud, y la observación elige un punto dentro de ella. Lo que el modelo deja fuera es el interior: una capa parcialmente fundida cambia cómo se flexiona Ío.',
    },
  ],
};

// Los huecos del cinturón: paso a paso con el inglés (Prompt 198, parte 3).
export const THE_GAPS_IN_THE_BELT = {
  title: 'Los huecos del cinturón',
  subtitle:
    'Un histograma de 8 886 asteroides numerados, una línea base suave ajustada fuera de las ventanas de resonancia, y la profundidad de cada hueco con un intervalo',
  objectives: [
    'Decir de qué es un recuento el histograma de un catálogo de asteroides numerados, y de qué no lo es',
    'Medir la profundidad de un hueco contra una línea base suave ajustada fuera de las ventanas de resonancia, con un intervalo bootstrap',
    'Decir por qué un hueco es un vaciamiento y no un vacío, y por qué dos huecos tienen profundidades distintas',
    'Decir cuándo una ventana no se puede medir, y que otra ventana, otro corte u otra línea base es otra medición',
  ],
  steps: [
    {
      title: 'Un catálogo de lo que se encontró',
      body: 'El <strong>JPL Small-Body Database</strong> enumera todos los planetas menores que se han descubierto y han recibido un número. Esta investigación usa los 8 886 objetos numerados con magnitud absoluta <strong>H menor que 13</strong>, los grandes (consultado el 27 de octubre de 2026; crédito JPL, sin su aval). La figura los cuenta por <strong>semieje mayor</strong> a, el tamaño de la órbita, de 2,0 a 3,5 UA: el cinturón principal. Las líneas de trazos marcan las <strong>resonancias</strong> con Júpiter, donde un asteroide da un número entero de vueltas al Sol por cada número entero de vueltas de Júpiter: 4:1, 3:1, 5:2, 7:3 y 2:1. Es un catálogo de lo que se <em>encontró</em>, no de lo que hay; el paso siguiente pregunta qué te permite decir eso.',
    },
    {
      title: '¿Qué muestra el histograma?',
      body: 'Cada barra es un recuento de objetos del catálogo. El catálogo guarda los objetos que se encontraron y se numeraron, y el corte en H menor que 13 conserva los grandes. Su propia nota dice que, para el cinturón principal, el corte es más brillante que el límite de completitud de los descubrimientos, así que los huecos se ven con poco sesgo de descubrimiento, y que el cinturón exterior y los troyanos están menos completos que el interior con la misma H.',
      prompt: '¿Qué puedes decir a partir de la figura?',
      options: [
        'Dónde están los objetos grandes que se encontraron; describe el cinturón en la medida en que los objetos grandes se encuentran todos, lo que la nota dice que ocurre en el cinturón principal',
        'Cuántos asteroides hay y cómo se reparten',
        'Las órbitas de todos los asteroides de todos los tamaños',
        'Nada: un catálogo de descubrimientos no dice nada del cielo',
      ],
      misconceptions: [
        {
          say: 'El catálogo es un recuento de objetos encontrados y numerados, no de objetos que existen. Es un recuento de los grandes, y faltan los débiles.',
        },
        {
          say: 'El corte conserva solo los cuerpos brillantes (grandes); no dice nada de los pequeños, mucho más numerosos y en su mayoría no encontrados.',
        },
        {
          say: 'Una muestra seleccionada sigue siendo evidencia, de lo que selecciona. Lo que debes hacer es decir cuál es la selección, como hace la nota del catálogo.',
        },
      ],
      hints: [
        'Pregúntate qué tuvo que ocurrir para que un objeto estuviera en el catálogo.',
      ],
      because:
        'Es un histograma de lo que se encontró con H menor que 13, y describe el cinturón principal en la medida en que los cuerpos grandes se encuentran todos. Por eso esta investigación mide los huecos, que una selección casi completa en los cuerpos grandes muestra con poco sesgo de descubrimiento, y no cuenta cuerpos.',
    },
    {
      title: '¿Qué tan vacío está el hueco 3:1?',
      body: 'Se ajusta una curva suave a los recuentos fuera de cada ventana sombreada y se lleva a través de ellas: dice cuántos objetos grandes tendría una banda de 0,05 UA de ancho en la resonancia 3:1 si el cinturón fuera suave allí.',
      prompt:
        'De ese número, el catálogo encuentra en la ventana 3:1 cerca de&hellip;',
      options: [
        'uno de cada ocho, un vaciamiento cercano al 88 por ciento',
        'la mitad, un vaciamiento cercano al 50 por ciento',
        'nueve de cada diez, un vaciamiento cercano al 10 por ciento',
        'todo: un hueco solo se ve en una figura, no en los recuentos',
      ],
      hints: [
        'El hueco se ve claramente en las barras; pregúntate cuánto bajan, no si bajan.',
      ],
      because:
        'Cerca de uno de cada ocho: 26 encontrados donde se esperan 216, un vaciamiento del 88 por ciento. Los dos pasos siguientes lo cuentan y le ponen un intervalo.',
    },
    {
      title: 'Cuenta la ventana 3:1',
      body: 'La banda sombreada es la ventana 3:1, 0,025 UA a cada lado de a = 2,5013 UA. Lee cuántos objetos del catálogo <strong>hay</strong> en la ventana y cuántos <strong>espera</strong> allí la curva suave.',
      fields: [
        { label: 'Encontrados en la ventana' },
        { label: 'Esperados según la línea base' },
      ],
    },
    {
      title: 'El vaciamiento, y cuán seguro es',
      body: 'El <strong>vaciamiento</strong> es uno menos lo encontrado entre lo esperado. El intervalo sale de remuestrear 400 veces las filas del catálogo y reajustar la línea base cada vez, así que dice cuánto se movería la profundidad con otra muestra del mismo tipo de cinturón. Lee el vaciamiento y los dos extremos de su intervalo del 95 por ciento, en por ciento.',
      fields: [
        { label: 'El vaciamiento (por ciento)' },
        { label: 'Extremo bajo del intervalo del 95 por ciento (por ciento)' },
        { label: 'Extremo alto del intervalo del 95 por ciento (por ciento)' },
      ],
    },
    {
      title: '¿Está vacío el hueco?',
      body: 'La ventana 3:1 aún contiene 26 objetos del catálogo.',
      prompt: '¿Qué debería decirse?',
      options: [
        'Es un adelgazamiento, no un agujero: la ventana está muy vaciada y se encuentran algunos cuerpos en ella',
        'No es un hueco en absoluto: un hueco no contendría nada',
        'Los 26 deben ser errores del catálogo',
        'Júpiter barrió la ventana, así que esos 26 no son asteroides de verdad',
      ],
      misconceptions: [
        {
          say: 'Un hueco en un histograma es un vaciamiento frente a lo que dicen los vecinos que cabe esperar. Nada en los datos pide cero; lo que muestran es uno de cada ocho.',
        },
        {
          say: 'Los objetos están numerados, con órbitas de muchas observaciones. Llamar errores a los incómodos es una manera de hacer que una medición salga como querías.',
        },
        {
          say: 'Son asteroides, encontrados con un semieje mayor dentro de la ventana. Por qué hay algunos cuerpos allí es una pregunta para cálculos de órbitas, que un histograma no puede responder.',
        },
      ],
      hints: ['¿Qué número muestra el instrumento para el vaciamiento?'],
      because:
        'Un vaciamiento del 88 por ciento con un intervalo del 83 al 92 por ciento: un adelgazamiento fuerte, no un vacío. El recuento de un hueco es una medición con un número, y el número no es cero.',
    },
    {
      title: 'Un hueco menos profundo: 5:2',
      body: 'Elige la ventana 5:2, en a = 2,8246 UA. Lee cuántos objetos contiene y cuán vaciada está.',
      fields: [
        { label: 'Encontrados en la ventana' },
        { label: 'El vaciamiento (por ciento)' },
      ],
    },
    {
      title: 'Lo que has deducido',
      body: 'Un histograma de los 8 886 asteroides numerados con H menor que 13 muestra los huecos en las resonancias de Júpiter. Una curva suave ajustada fuera de las ventanas dice cuántos objetos tendría cada ventana, y el vaciamiento es cuánto cae el recuento por debajo de ella: 88,0 por ciento en 3:1 (intervalo de 82,9 a 92,4) y 63,3 en 5:2 (de 56,5 a 70,0). Un hueco es un vaciamiento, no un vacío, y el catálogo es lo que se encontró, no lo que hay. Los pasos más profundos cambian la ventana, el corte y la línea base, encuentran dos ventanas que el método no puede medir, y dicen qué dice y qué no dice un vaciamiento sobre Júpiter.',
    },
  ],
};

// ¿Qué tan rápido gira?: paso a paso con el inglés (Prompt 198, parte 3).
export const HOW_FAST_DOES_IT_SPIN = {
  title: '¿Qué tan rápido gira?',
  subtitle:
    'Una curva de luz sintética, el periodo de rotación a partir de su periodograma, la amplitud, y lo que la amplitud acota de la forma',
  objectives: [
    'Leer el periodo de rotación de un asteroide en el pico más fuerte de un periodograma, con la regla de los dos máximos, y decir de qué es un piso su error',
    'Convertir la amplitud de una curva de luz en una cota inferior de la razón de ejes, y decir por qué solo es una cota',
    'Decir qué puede ocultar el muestreo: un alias, una parte del giro nunca observada o un periodo que no está',
    'Decir que los datos de aquí son sintéticos, y qué significa comprobar un método contra una verdad conocida',
  ],
  steps: [
    {
      title: 'Un punto de luz que parpadea',
      body: 'Un asteroide es un punto de luz que se hace más brillante y más débil al girar, porque un cuerpo irregular nos muestra un área distinta al rotar. Los datos de aquí son <strong>sintéticos</strong>: un elipsoide que gira, simulado para esta investigación con ruido, en cinco noches de 40 medidas cada una en una noche de 7 horas. No es la curva de luz de un asteroide real (la medida que el proyecto buscó no estaba disponible), y su periodo y su forma verdaderos quedan ocultos hasta que los pidas. Arriba: las medidas contra el tiempo. En medio: cuán bien explica cada periodo de rotación de prueba las medidas (un <strong>periodograma</strong>). Abajo: las medidas plegadas con el mejor periodo.',
    },
    {
      title: 'La luz alcanza el máximo dos veces por vuelta',
      body: 'El pico más fuerte del periodograma dice cada cuánto se repite la luz: cerca de cada tres horas. Un cuerpo alargado nos muestra su lado largo dos veces en cada vuelta, una por cada extremo.',
      prompt: 'El periodo de rotación del asteroide será de unas&hellip;',
      options: [
        'el doble del periodo de la luz, unas 6 horas',
        'lo mismo que el periodo de la luz, unas 3 horas',
        'la mitad, unas 1,5 horas',
        'cuatro veces, unas 12 horas',
      ],
      hints: ['¿Cuántos extremos brillantes tiene un cuerpo alargado?'],
      because:
        'El doble: 6,2 horas. La luz se repite cada 3,1 horas porque caben dos máximos en cada vuelta. Es la regla de los dos máximos, y vale para un cuerpo que es más o menos un elipsoide; los pasos más profundos vuelven a lo que supone.',
    },
    {
      title: 'El periodo',
      body: 'Lee el periodo de la luz en el pico más fuerte del periodograma, y el periodo de rotación que da el instrumento a partir de él con la regla de los dos máximos.',
      fields: [
        { label: 'El periodo de la luz en el pico más fuerte (horas)' },
        { label: 'El periodo de rotación (horas)' },
      ],
    },
    {
      title: 'Cuánto varía, y qué acota eso',
      body: 'La curva plegada sube y baja una <strong>amplitud</strong>, en magnitudes. Una razón de brillo de 10<sup>0,4 &times; amplitud</sup> es lo mínimo en que el eje largo puede superar al medio: la cota de <strong>a/b</strong>. Lee la amplitud y la cota.',
      fields: [{ label: 'La amplitud (mag)' }, { label: 'a/b es al menos' }],
    },
    {
      title: 'Compáralo con la verdad',
      body: 'Activa &ldquo;Mostrar la verdad&rdquo;. El periodo de rotación, la razón de ejes y el aspecto de la simulación aparecen debajo de tus medidas: es lo único que da una curva sintética y que un asteroide real nunca da.',
      prompt: '¿Cómo se comparan las medidas y la verdad?',
      options: [
        'El periodo coincide con una diferencia de 0,001 h (6,199 frente a 6,2), y la cota, 1,36, queda por debajo del a/b verdadero de 1,5, como debe ocurrir con una cota inferior',
        'Coinciden exactamente: el instrumento devuelve la verdad',
        'El periodo es correcto pero la cota está mal, pues debería ser 1,5',
        'No se pueden comparar: la verdad es inventada',
      ],
      misconceptions: [
        {
          say: 'El periodo difiere de la verdad en 0,001 h y la cota no es 1,5. Una medida está cerca de la verdad, no es igual a ella.',
        },
        {
          say: 'Una cota que fuera igual a a/b sería una medida de a/b. Solo es igual cuando el cuerpo se ve exactamente desde su ecuador, y este se ve con un aspecto de 70 grados.',
        },
        {
          say: 'Una verdad inventada es justo lo que permite comprobar un método: conoces la respuesta. Lo que no puede es sustituir a un asteroide real, cuya verdad nunca se muestra.',
        },
      ],
      hints: ['¿Debe una cota inferior ser igual a lo que acota?'],
      because:
        'El periodo de la simulación es 6,2 h y su razón de ejes a/b 1,5, vista a 70 grados del eje de giro, con una amplitud de 0,335 mag. El periodo medido está a menos de 0,001 h y la cota 1,36 queda por debajo de 1,5: ambos como deben. La verdad de un asteroide real nunca se muestra, y por eso un método hay que comprobarlo así primero.',
    },
    {
      title: 'Lo que has deducido',
      body: 'La luz de un cuerpo que gira se repite dos veces por vuelta, así que el periodo de rotación es el doble del pico más fuerte: 6,199 h aquí, de cinco noches, con un error que es un piso. La amplitud, 0,333 mag, acota la razón de ejes por debajo, a/b de al menos 1,36, y la verdad de la simulación, 1,5, queda por encima, como exige una cota. Todo es sintético. Los pasos más profundos acortan la serie, redondean el cuerpo, muestrean una vez por noche y encuentran los casos en que el instrumento dice que no puede distinguir.',
    },
  ],
};

export default {
  'weighing-jupiter': WEIGHING_JUPITER,
  'why-rings': WHY_RINGS,
  'tides-that-move-the-moon': TIDES_THAT_MOVE_THE_MOON,
  'ios-fire': IOS_FIRE,
  'the-gaps-in-the-belt': THE_GAPS_IN_THE_BELT,
  'how-fast-does-it-spin': HOW_FAST_DOES_IT_SPIN,
};
