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
      body: 'En julio de 1992 el cometa Shoemaker-Levy 9 pasó a 1,3 radios de Júpiter del centro del planeta y se rompió en pedazos. Con el par en <strong>Shoemaker-Levy 9 y Júpiter</strong>, lee el <strong>límite rígido</strong> y el <strong>límite fluido</strong>, en radios de Júpiter (R).',
      fields: [{ label: 'Límite rígido' }, { label: 'Límite fluido' }],
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
      body: 'Pon el par en <strong>Fobos y Marte</strong> y lee los dos límites en kilómetros desde el centro de Marte.',
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
      body: 'Un planeta con la masa de Saturno, 200 partículas de anillo, una luna resonante cuya resonancia 2:1 cae en el anillo y una luna pastora dentro de él. Las dos lunas pesan mucho más que Mimas y Pan, para que veinte órbitas puedan mostrar algo. El resultado honesto de la corrida registrada para esta lección es modesto: el anillo se adelgaza en la resonancia (19 partículas donde los tramos vecinos tienen 24) y el anillo sin luna queda como estaba, pero no se abre un hueco, y la pastora no deja un carril libre. Las partículas de este modelo nunca chocan, y un hueco real lo hace una resonancia que actúa sobre un anillo que sí choca.',
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
        { label: 'El alejamiento de la Luna' },
        { label: 'El alargamiento del día' },
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
      fields: [{ label: 'La distancia de la Luna' }, { label: 'El día' }],
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
      fields: [{ label: 'Calentamiento' }, { label: 'Energía en una órbita' }],
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

export default {
  'weighing-jupiter': WEIGHING_JUPITER,
  'why-rings': WHY_RINGS,
  'tides-that-move-the-moon': TIDES_THAT_MOVE_THE_MOON,
  'ios-fire': IOS_FIRE,
};
