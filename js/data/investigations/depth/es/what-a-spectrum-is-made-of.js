// De qué está hecho un espectro, más a fondo: las palabras en español, paso a paso con ../what-a-spectrum-is-made-of.js.
export default {
  steps: [
    {
      title: '¿Cuánto puede oscurecerse una línea?',
      body: 'Una nube espesa quita toda la luz de la fuente en el centro de una línea y solo devuelve allí su propio brillo. Así, el centro de una línea espesa queda en el brillo del cuerpo negro de la propia nube, como fracción del de la fuente: B(T<sub>n</sub>) ÷ B(T<sub>f</sub>). Para la ley de Planck a la longitud de onda λ esto es (e<sup>x ÷ T<sub>f</sub></sup> − 1) ÷ (e<sup>x ÷ T<sub>n</sub></sup> − 1), donde x = hc ÷ (λk) = 21.917&nbsp;K en H-alfa, 6.564,6&nbsp;Å.',
      prompt:
        'La fracción de la luz de la fuente que queda en el centro de una línea H-alfa espesa, fuente a 8.000 K, nube a 4.000 K',
      hints: [
        'Calcula por separado e<sup>21.917 ÷ 8.000</sup> − 1 y e<sup>21.917 ÷ 4.000</sup> − 1.',
        'Divide el primero entre el segundo y multiplica por 100. Compáralo con la fila del demostrador sobre el cuerpo negro de la propia nube.',
      ],
      worked:
        'e^(21.917 ÷ 8.000) − 1 = e^2,740 − 1 = 14,48 y e^(21.917 ÷ 4.000) − 1 = e^5,479 − 1 = 238,9, así que la fracción es 14,48 ÷ 238,9 = 0,0607, o 6,07 %. Una línea espesa no llega a cero: se detiene en el brillo de la propia nube.',
      feedback: {
        close:
          'Casi. La nube, la más fría, va en el denominador: es la exponencial mayor, así que la respuesta es una fracción pequeña.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez. Compara las dos exponenciales: una es cerca de 14 y la otra cerca de 240.',
        off: 'Fracción = (e^(x ÷ T_f) − 1) ÷ (e^(x ÷ T_n) − 1), con x = 21.917 K, por 100.',
      },
    },
    {
      title: 'Cuánta luz quita la línea',
      body: 'El <strong>ancho equivalente</strong> de una línea es el ancho de un rectángulo tan alto como el continuo que tiene la misma área que la línea: la luz que quita la línea, en Å. El demostrador lo mide con el mismo nodo que el visor de espectros. Pon una fuente de 6.000&nbsp;K vista a través de una nube de 4.000&nbsp;K con gas 3, acércate a H-alfa y léelo.',
      prompt: 'El ancho equivalente de H-alfa',
      hints: ['Es la fila «Ancho equivalente de H-alfa».'],
      worked:
        'El nodo ajusta el continuo a ambos lados y suma (1 − flujo ÷ continuo) sobre la línea, en Å: 14,16 Å, positivo porque la línea es oscura.',
      feedback: {
        close:
          'Casi. Comprueba que la fuente está a 6.000 K, la nube a 4.000 K y el gas en 3.',
        off: 'Lee la fila «Ancho equivalente de H-alfa» con la fuente vista a través de la nube.',
      },
    },
    {
      title: 'Dónde cruza el ancho por cero',
      body: 'Deja la fuente en 6.000&nbsp;K y el gas en 3, y sube la temperatura de la nube por pasos de 4.000 a 8.000&nbsp;K, leyendo cada vez el ancho equivalente. Baja desde 14&nbsp;Å, pasa por cero y se vuelve negativo (una línea brillante añade luz).',
      prompt: '¿A qué temperatura de la nube es cero el ancho equivalente?',
      options: [
        'A la temperatura de la propia fuente, 6.000 K',
        'A 5.000 K, a mitad de camino hacia la fuente',
        'A 0 K, donde la nube no emite nada',
        'Nunca llega a cero mientras haya gas',
      ],
      misconceptions: [
        {
          say: 'Una nube más fría hace una línea más profunda, no una que desaparece. Lee el ancho a 3.000 K y a 6.000 K.',
        },
      ],
      hints: [
        'El ancho es la luz que quita la nube menos la que añade. ¿Cuándo son iguales?',
      ],
      because:
        'A 6.000 K, la temperatura de la fuente. En este modelo el ancho es (1 − B(T_n) ÷ B(T_f)) por una cantidad que depende solo de cuánto gas hay, así que se anula cuando los dos cuerpos negros coinciden y cambia de signo más allá.',
    },
    {
      title: '¿Cuántos átomos pueden absorber?',
      body: 'Las líneas de Balmer vienen de átomos de hidrógeno en el segundo nivel, n = 2. El factor de Boltzmann dice cuántos hay allí, frente al estado fundamental: 4 e<sup>−10,2 eV ÷ kT</sup>, donde el 4 cuenta los estados de cada nivel. <em>Esto es un modelo</em>: cuenta solo la excitación y deja fuera la ionización, que arranca los átomos del todo cuando hace calor. El demostrador lo lista para la temperatura de la nube. Léelo a 6.000&nbsp;K y a 10.000&nbsp;K.',
      prompt:
        '¿Cuántas veces más átomos de hidrógeno hay en n = 2 a 10.000 K que a 6.000 K?',
      hints: [
        'Lee la fila «Átomos de hidrógeno en n = 2 respecto de n = 1» a cada temperatura de la nube y divide.',
      ],
      worked:
        '2,89 × 10⁻⁵ a 10.000 K y 1,08 × 10⁻⁸ a 6.000 K: el cociente es unos 2.670. Un cambio de temperatura de un factor 1,7 cambia el número de átomos que absorben en un factor de miles.',
      feedback: {
        close:
          'Casi. Divide el valor de 10.000 K entre el de 6.000 K, no al revés.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez. Las dos lecturas difieren en más de tres potencias de diez.',
        off: 'Cociente = (n2 ÷ n1 a 10.000 K) ÷ (n2 ÷ n1 a 6.000 K), leído de la lista.',
      },
    },
    {
      title: 'La parte que no cambia de signo',
      body: 'Para una nube delante de una fuente, el ancho equivalente es W<sub>eq</sub> = (1 − B(T<sub>n</sub>) ÷ B(T<sub>f</sub>)) × A, donde A, en Å, depende solo del gas (su profundidad óptica y el ancho de sus líneas) y no de ninguna de las temperaturas. Usa una fuente de 6.000&nbsp;K, gas 3 y la nube a 4.000&nbsp;K. Lee en la lista el ancho equivalente y el cociente de brillos.',
      prompt: 'A, a partir de W<sub>eq</sub> ÷ (1 − el cociente)',
      hints: [
        'La fila del cociente es un porcentaje: 15,7 % es 0,157 en la fórmula.',
        'Luego comprueba con la nube a 8.000 K: tanto el ancho como el factor 1 − cociente cambian de signo, y A sale igual.',
      ],
      worked:
        'A 4.000 K: 14,16 ÷ (1 − 0,1575) = 16,8 Å. A 8.000 K: −26,8 ÷ (1 − 2,595) = 16,8 Å. El ancho cambia de signo con la temperatura; A no, porque es una propiedad del gas.',
      feedback: {
        close:
          'Casi. Convierte el porcentaje en fracción antes de restarlo de 1.',
        off: 'A = W_eq ÷ (1 − cociente), con el cociente como fracción.',
      },
    },
    {
      title: 'El modelo frente a dos estrellas reales',
      body: 'La estrella A está cerca de 9.500&nbsp;K y la G cerca de 5.800&nbsp;K, valores típicos de sus tipos espectrales. El modelo de Boltzmann del último paso cuantitativo dice que las estrellas A deberían tener unas 2.800 veces más átomos en n = 2. En el visor de espectros, acércate a H-alfa y lee su ancho equivalente en cada estrella.',
      prompt:
        'El ancho equivalente de H-alfa de la estrella A dividido entre el de la G',
      hints: [
        'Lee la fila «Ancho equivalente» para la estrella A y luego para la G.',
      ],
      worked:
        '7,17 ± 0,21 Å en la estrella A y 3,07 ± 0,26 Å en la G: un cociente de 2,3, no de 2.800.',
      feedback: {
        close: 'Casi. Pon el ancho de la estrella A arriba.',
        off: 'Divide el ancho equivalente de H-alfa de la estrella A entre el de la G.',
      },
    },
    {
      title: 'Por qué el modelo se pasa',
      body: 'El factor de Boltzmann predice un cociente cercano a 2.800. Las estrellas dan 2,3. El modelo no es un error; está incompleto.',
      prompt: '¿Qué dos cosas deja fuera el factor de Boltzmann por sí solo?',
      options: [
        'La ionización, que quita átomos en una estrella caliente, y la saturación, que impide que una línea espesa quite más que toda la luz',
        'El movimiento de la estrella y la resolución del telescopio',
        'La distancia de la estrella y su masa',
        'Nada: los datos deben de estar mal',
      ],
      hints: [
        'Dos resultados del propio demostrador tienen que ver: una línea espesa se detiene en el brillo de la nube, y la fila de Boltzmann dice que deja fuera la ionización.',
      ],
      because:
        'La ionización y la saturación. En una estrella caliente muchos átomos de hidrógeno han perdido su electrón y no pueden absorber, por eso las líneas de Balmer reales son más fuertes cerca de 10.000 K y luego se debilitan. Y una línea no puede quitar más que toda la luz, así que su ancho crece mucho más despacio que el número de átomos que absorben. Un modelo que conserva un solo efecto sirve hasta que lo comparas con datos.',
    },
  ],
};
