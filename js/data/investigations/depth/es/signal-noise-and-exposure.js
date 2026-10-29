// Señal, ruido y exposición, más a fondo: las palabras en español, paso a paso con ../signal-noise-and-exposure.js.
export default {
  steps: [
    {
      title: 'La medida ideal',
      body: `Si los fotones de la propia estrella fueran el único ruido, el ruido sería la raíz cuadrada de los electrones de la estrella. La estrella dio 33.631 electrones en la abertura.`,
      prompt: 'La señal a ruido con solo el ruido de la propia estrella',
      hints: ['La señal sobre su propia raíz cuadrada es su raíz cuadrada.'],
      worked:
        'La raíz cuadrada de 33.631 es 183. La medida llegó a 152,5, así que el cielo, la corriente oscura y el ruido de lectura costaron cerca de una sexta parte de la calidad.',
      feedback: {
        close: 'Casi. Toma la raíz cuadrada de los electrones de la estrella.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la raíz cuadrada de decenas de miles es un par de cientos.',
        off: 'La raíz cuadrada de los electrones de la estrella.',
      },
    },
    {
      title: 'La parte del ruido de lectura, una estrella brillante',
      body: `A los 60 segundos el ruido total es de 220,6 electrones, así que el ruido al cuadrado es la suma de los cuatro términos, cerca de 48.660. El ruido de lectura al cuadrado es 6.223.`,
      prompt:
        'La parte del ruido de lectura en el ruido al cuadrado, en porcentaje',
      hints: [
        'El ruido de lectura al cuadrado sobre el ruido total al cuadrado, por cien.',
      ],
      worked:
        '6.223 ÷ 220,6² = 6.223 ÷ 48.664 = 0,128, o un 12,8 por ciento. A los 240 segundos los mismos 6.223 son un 3,5 por ciento de un total mayor, y por eso la señal a ruido salió algo por encima del doble, no exactamente el doble.',
      feedback: {
        close:
          'Casi. Divide el ruido de lectura al cuadrado entre el cuadrado del ruido total.',
        'wrong-order-of-magnitude':
          'Una parte entre cero y cien por ciento: un término de cuatro.',
        off: '100 × lectura² ÷ ruido².',
      },
    },
    {
      title: 'La parte del ruido de lectura, una estrella débil',
      body: `En V = 19 y 10 segundos el ruido total es de 51,07 electrones, y el ruido de lectura al cuadrado es 2.001.`,
      prompt:
        'La parte del ruido de lectura en el ruido al cuadrado, en porcentaje',
      hints: [
        'Ruido de lectura al cuadrado sobre ruido total al cuadrado, por cien.',
      ],
      worked:
        '2.001 ÷ 51,07² = 2.001 ÷ 2.608 = 0,767, o un 77 por ciento: tres cuartas partes del ruido vienen de leer los píxeles, así que una estrella débil en una exposición corta está limitada por la cámara y no por el cielo ni por la estrella.',
      feedback: {
        close:
          'Casi. Divide el ruido de lectura al cuadrado entre el cuadrado del ruido total.',
        'wrong-order-of-magnitude': 'Una parte entre cero y cien por ciento.',
        off: '100 × lectura² ÷ ruido².',
      },
    },
    {
      title: 'Lo que cuesta la Luna',
      body: `Lee la exposición que alcanza una señal a ruido de 100 para esta estrella en un sitio oscuro (la primera elección de cielo) y bajo una Luna brillante, 89,4 segundos.`,
      prompt:
        'Cuántas veces más larga es la exposición bajo la Luna que en el sitio oscuro',
      hints: [
        'Elige «un sitio oscuro», lee la exposición para el objetivo, y divide 89,4 entre ella.',
      ],
      worked:
        '89,4 ÷ 29,3 = 3,05: la Luna triplica la exposición. La misma estrella da la misma señal; los fotones extra del cielo añaden ruido, y la única manera de recomprar la calidad perdida es el tiempo.',
      feedback: {
        close:
          'Casi. Divide la exposición de la Luna entre la del sitio oscuro.',
        'wrong-order-of-magnitude':
          'Un factor pequeño, unos pocos como mucho: las dos exposiciones son de decenas de segundos.',
        off: 'exposición con Luna ÷ exposición en sitio oscuro.',
      },
    },
    {
      title: 'Lo que promete la ley de la raíz cuadrada',
      body: `Si los fotones de la propia estrella fueran el único ruido, cuatro veces la exposición darían el doble de señal a ruido, y la estrella más débil alcanzada sería más débil en la diferencia de magnitud de un factor dos en brillo, 2,5 veces el logaritmo decimal de 2.`,
      prompt:
        'La ganancia en magnitud límite para cuatro veces la exposición según esa ley',
      hints: ['2,5 × log10(2).'],
      worked:
        '2,5 × log10(2) = 0,753 magnitudes. El instrumento dio 0,96, más que la ley: el límite débil lo fija en parte el ruido de lectura, que una imagen más larga paga una sola vez, así que para las estrellas más débiles cuatro veces el tiempo vale más de lo que dice la ley de la raíz cuadrada.',
      feedback: {
        close: 'Casi. Multiplica por 2,5 el logaritmo decimal de 2.',
        'wrong-order-of-magnitude':
          'Menos de una magnitud: un factor dos en brillo son tres cuartos de una.',
        off: '2,5 × log10(2).',
      },
    },
    {
      title: 'El presupuesto, una estrella brillante en un sitio oscuro',
      body: `Pon V = 15, 60 segundos, un radio de 5 píxeles y un sitio oscuro. La tabla da los cuatro términos del ruido al cuadrado y el ruido total.`,
      prompt:
        'La parte del término mayor en el ruido al cuadrado, en porcentaje',
      hints: [
        'Divide el mayor de los cuatro términos entre el cuadrado del ruido total.',
      ],
      worked:
        'Los fotones de la propia estrella son un 69 por ciento del ruido al cuadrado (el cielo 17, el ruido de lectura 13, la corriente oscura 1). Una estrella tan brillante está limitada por su propia luz: solo ayuda más luz.',
      feedback: {
        close:
          'Casi. Divide el término mayor entre el cuadrado del ruido total.',
        'wrong-order-of-magnitude': 'Una parte entre cero y cien por ciento.',
        off: 'El mayor de los cuatro términos, como porcentaje del ruido al cuadrado.',
      },
    },
    {
      title: 'El presupuesto, una estrella débil en una exposición corta',
      body: `Pon V = 19, 10 segundos, un radio de 3 píxeles y un sitio oscuro.`,
      prompt:
        'La parte del término mayor en el ruido al cuadrado, en porcentaje',
      hints: [
        'La estrella da aquí solo unos pocos electrones por segundo; la cámara carga su ruido de lectura a cada píxel de la abertura.',
      ],
      worked:
        'El ruido de lectura es un 77 por ciento del ruido al cuadrado. Una estrella débil en una exposición corta está limitada por la cámara, no por el cielo ni por la estrella: leer los píxeles cuesta lo mismo por larga que fuera la exposición.',
      feedback: {
        close:
          'Casi. Divide el término mayor entre el cuadrado del ruido total.',
        'wrong-order-of-magnitude': 'Una parte entre cero y cien por ciento.',
        off: 'El mayor de los cuatro términos, como porcentaje del ruido al cuadrado.',
      },
    },
    {
      title: 'El presupuesto, la misma estrella bajo una Luna brillante',
      body: `Deja V = 19 y el radio de 3 píxeles, alarga la exposición a 300 segundos y elige la Luna brillante.`,
      prompt:
        'La parte del término mayor en el ruido al cuadrado, en porcentaje',
      hints: [
        'Bajo una Luna brillante cada píxel de la abertura recoge el cielo de la Luna durante toda la exposición.',
      ],
      worked:
        'El cielo es un 97 por ciento del ruido al cuadrado. La luz extra de la Luna añade ruido en cada píxel, y a los 300 segundos el ruido de lectura se ha vuelto un error de redondeo: la estrella está limitada por el cielo, el régimen donde vale la ley de la raíz cuadrada y donde una exposición más larga rinde más.',
      feedback: {
        close:
          'Casi. Divide el término mayor entre el cuadrado del ruido total.',
        'wrong-order-of-magnitude': 'Una parte entre cero y cien por ciento.',
        off: 'El mayor de los cuatro términos, como porcentaje del ruido al cuadrado.',
      },
    },
    {
      title: 'Donde el cielo releva a la cámara',
      body: `El ruido de lectura al cuadrado se paga una vez por exposición; el ruido al cuadrado del cielo y de la corriente oscura crece con la exposición. En un sitio oscuro el cielo da 1,41 electrones por segundo en cada píxel y la corriente oscura 0,10; el ruido de lectura es de 8 electrones.`,
      prompt:
        'La exposición en que el ruido al cuadrado del cielo y de la oscuridad en un píxel iguala al ruido de lectura al cuadrado, en segundos',
      hints: ['Iguala (1,41 + 0,10) × t a 8² y despeja t.'],
      worked:
        '64 ÷ (1,408 + 0,100) = 42,4 segundos. Por debajo, el ruido de lectura de la cámara es el término mayor y una exposición más larga rinde más que la raíz cuadrada; por encima lo es el cielo y manda la ley de la raíz cuadrada. Una exposición de 10 segundos de la estrella débil estaba muy dentro del régimen limitado por la lectura; una de 300 segundos está muy fuera de él.',
      feedback: {
        close:
          'Casi. Divide el ruido de lectura al cuadrado entre los electrones por segundo que dan juntos el cielo y la oscuridad en un píxel.',
        'wrong-order-of-magnitude':
          'Decenas de segundos: 64 dividido entre cerca de 1,5.',
        off: '8² ÷ (1,41 + 0,10).',
      },
    },
  ],
};
