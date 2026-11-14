// Qué registra un CCD, más a fondo: las palabras en español, paso a paso con ../what-a-ccd-records.js.
export default {
  steps: [
    {
      title: 'El desfase en electrones',
      body: `El convertidor da cuentas, y cada cuenta representa un número de electrones, la <strong>ganancia</strong> que acabas de leer. Multiplicar una cuenta por la ganancia da electrones. El nivel del sesgo es de 500,4 cuentas.`,
      prompt: 'El nivel del sesgo, en electrones',
      hints: [
        'El nivel del sesgo en cuentas por la ganancia en electrones por cuenta.',
      ],
      worked:
        '500,4 × 1,516 = 759 electrones. El desfase es grande frente al ruido de lectura de 8 electrones, y ese es su sentido: una cuenta de 500 deja sitio para que el ruido vaya a un lado o al otro sin llegar a cero.',
      feedback: {
        close: 'Casi. Multiplica las cuentas por la ganancia.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: una ganancia cercana a 1,5 convierte cientos de cuentas en cientos de electrones.',
        off: 'cuentas × ganancia.',
      },
    },
    {
      title: 'Cuándo importa la corriente oscura',
      body: `La corriente oscura de un píxel también añade ruido: los electrones que reúne en un tiempo t tienen una varianza igual a su número, 0,1 × t. El ruido de lectura añade una varianza que es su cuadrado, una vez por lectura. Usa un ruido de lectura de 8,05 electrones y una corriente oscura de 0,100 electrones por segundo.`,
      prompt:
        'La exposición en que la varianza de la corriente oscura iguala la del ruido de lectura, en segundos',
      hints: ['Iguala 0,100 × t a 8,05², cerca de 64,8.'],
      worked:
        '8,05² = 64,8 y 64,8 ÷ 0,100 = 648 segundos. Por debajo de unos once minutos el ruido de lectura pesa más que el ruido de la corriente oscura en un píxel normal, así que en una exposición corta la oscura importa como un desfase que restar, no como ruido.',
      feedback: {
        close:
          'Casi. Divide el cuadrado del ruido de lectura entre la corriente oscura.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el cuadrado del ruido de lectura es de unos 65 electrones al cuadrado, y la corriente oscura hace una décima de electrón por segundo.',
        off: 'ruido de lectura al cuadrado ÷ corriente oscura.',
      },
    },
    {
      title: 'Cuán grande es la corrección',
      body: `La estrella B leía 47.296 electrones en bruto y 54.083 tras el campo plano.`,
      prompt:
        'El factor por el que el campo plano multiplicó la luz de la estrella B',
      hints: ['La luz calibrada dividida entre la luz en bruto.'],
      worked:
        '54.083 ÷ 47.296 = 1,14: el campo plano elevó la luz de la estrella B un 14 por ciento. Sus píxeles estaban a cerca del 87 por ciento del promedio, y 1 ÷ 0,875 = 1,14.',
      feedback: {
        close: 'Casi. Divide la luz calibrada entre la luz en bruto.',
        'wrong-order-of-magnitude':
          'Un factor cercano a uno: aquí el campo plano cambia una estrella en decenas por ciento, no en órdenes de magnitud.',
        off: 'calibrada ÷ en bruto.',
      },
    },
    {
      title: 'Cuánto de la estrella D se pierde',
      body: `La luz calibrada de la estrella D es de 1.097.121 electrones y la verdad de la tabla es de 1.799.605.`,
      prompt:
        'La parte de la luz de la estrella D que nunca se registró, en porcentaje',
      hints: ['Uno menos la luz medida entre la luz verdadera, por cien.'],
      worked:
        '1 − 1.097.121 ÷ 1.799.605 = 0,390, o un 39 por ciento. Los píxeles más brillantes llegaron al pozo completo y el resto de su luz no se guardó.',
      feedback: {
        close:
          'Casi. Divide la luz medida entre la luz verdadera y toma el resto.',
        'wrong-order-of-magnitude':
          'Una fracción del total: una parte de la luz de la estrella, entre nada y toda.',
        off: '100 × (verdad − medida) ÷ verdad.',
      },
    },
    {
      title: 'A cuántas barras de error equivale',
      body: `El error de la tabla para la estrella D es de 1.060 electrones: solo ruido de fotones y de lectura. La diferencia es la verdad, 1.799.605, menos la luz medida, 1.097.121.`,
      prompt: 'La diferencia, en unidades de la barra de error',
      hints: [
        'La diferencia en electrones dividida entre el error en electrones.',
      ],
      worked:
        '(1.799.605 − 1.097.121) ÷ 1.060 = 663 barras de error. Una barra de error de solo ruido no puede ver una pérdida sistemática: ningún cuidado con la estadística habría señalado esta estrella, solo los valores de los píxeles en el pozo completo.',
      feedback: {
        close: 'Casi. Divide la diferencia entre el error.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la diferencia son cientos de miles de electrones y el error cerca de mil.',
        off: '(verdad − medida) ÷ error.',
      },
    },
  ],
};
