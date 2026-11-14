// Dentro de una estrella - español, paso a paso con ../inside-a-star.js.
export default {
  title: 'Dentro de una estrella',
  subtitle:
    'Equilibrio hidrostático, un politropo y por qué el centro es caliente',
  objectives: [
    'Decir qué sostiene a una estrella y escribir el equilibrio que fija su estructura',
    'Leer la densidad y la temperatura centrales de una estrella modelada como politropo y decir cuán concentrada está',
    'Explicar por qué el centro de una estrella es caliente solo por su peso, y cómo escala la temperatura con la masa y el radio',
    'Decir qué deja fuera un politropo y qué estrellas reales describe',
  ],
  steps: [
    {
      title: 'Peso y presión',
      body: `Una estrella es una bola de gas que no se desploma ni estalla, así que a cada profundidad la presión que empuja hacia fuera debe equilibrar el peso del gas que hay encima. Ese equilibrio es el <strong>equilibrio hidrostático</strong>: <strong>dP/dr = −G m ρ ÷ r²</strong>, donde <em>m</em> es la masa dentro del radio <em>r</em> y ρ la densidad allí.
             \n\nLa ecuación sola no da una estrella: necesita una regla de cómo depende la presión de la densidad. Un <strong>politropo</strong> toma <em>P = K ρ<sup>1 + 1/n</sup></em>, y el equilibrio tiene entonces una única solución para cada <em>n</em>, la ecuación de Lane-Emden. El instrumento la dibuja, del centro a la izquierda a la superficie a la derecha. Es un <strong>modelo</strong>: una forma sin ninguna fuente de energía.`,
    },
    {
      title: '¿Cuán denso es el centro?',
      body: `La densidad media del Sol es 1,4 gramos por centímetro cúbico, algo más que el agua. El instrumento muestra el Sol como un politropo con <em>n</em> = 3, que pone más masa hacia el centro. Todavía no leas el instrumento.`,
      prompt: 'La densidad en el centro será&hellip;',
      options: [
        'casi la misma, 1,4 g/cm³',
        'unas cinco veces la media, 7 g/cm³',
        'unas cincuenta veces la media, 70 g/cm³',
        'unas cinco mil veces la media, 7.000 g/cm³',
      ],
      hints: [
        'El agua es 1 g/cm³ y el plomo 11 g/cm³: un gas comprimido por el peso de toda una estrella es mucho más denso que ambos.',
      ],
      because:
        'Unas cincuenta veces la media. El politropo n = 3 tiene una densidad central 54 veces la media, que son 76 g/cm³, siete veces la del plomo. El paso siguiente la lee.',
    },
    {
      title: 'El centro del Sol, como politropo',
      body: `Con <em>n</em> = 3, una masa solar y un radio solar, lee la <strong>densidad central</strong> y la <strong>temperatura central</strong>. El instrumento da la temperatura en kelvin; escríbela en millones de kelvin.`,
      fields: [
        { label: 'Densidad central' },
        { label: 'Temperatura central, millones de K' },
      ],
    },
    {
      title: 'Dónde está la masa',
      body: `El punto de la curva gris marca el radio que contiene la mitad de la masa de la estrella. Léelo, como fracción del radio de la estrella, y lee cuántas veces es más denso el centro que la media.`,
      fields: [
        { label: 'Radio que contiene la mitad de la masa' },
        { label: 'Densidad central ÷ densidad media' },
      ],
    },
    {
      title: 'El doble de masa en el mismo tamaño',
      body: `Deja el radio en 1 radio solar y pon la masa en <strong>2</strong> masas solares. Lee la densidad central y la temperatura central (en millones de kelvin). Compara cada una con los valores de una masa solar.`,
      fields: [
        { label: 'Densidad central' },
        { label: 'Temperatura central, millones de K' },
      ],
    },
    {
      title: 'Por qué el centro es caliente',
      body: `Nada en el modelo produce energía: la temperatura sale del equilibrio entre peso y presión, para un gas de iones y electrones cuya presión es ρkT ÷ (μm). Duplicar la masa con el mismo radio duplicó la temperatura central.`,
      prompt: '¿Qué afirmación explica el centro caliente?',
      options: [
        'El centro es caliente porque la fusión nuclear lo calienta',
        'Hay que sostener el peso de las capas de encima, así que la presión allí es enorme, y para un gas denso tanta presión significa una temperatura muy alta',
        'El calor fluye hacia dentro desde la superficie, más fría, y se acumula',
        'El centro es caliente porque está lejos del frío del espacio',
      ],
      misconceptions: [
        {
          say: 'La fusión necesita el calor, no al revés: empieza solo porque el centro ya está así de caliente. Aquí el modelo no tiene fusión y la temperatura es la misma.',
        },
      ],
      hints: [
        'El modelo no tiene fuente de energía. ¿Qué queda que pueda fijar la temperatura?',
      ],
      because:
        'El peso fija la presión (millones de veces la atmosférica en el centro del Sol), y la ley de los gases fija qué temperatura necesita un gas de esa densidad para suministrarla. La fusión es posible porque el centro es caliente, y repone la energía que la estrella radia, pero no fija la estructura.',
    },
    {
      title: 'Una enana roja tiene otra forma',
      body: `Carga “Una enana roja como n = 3/2”: 0,2 masas solares en 0,22 radios solares. Una estrella convectiva de arriba abajo está menos condensada en el centro. Lee la temperatura central (en millones de kelvin) y cuántas veces es más denso el centro que la media.`,
      fields: [
        { label: 'Temperatura central, millones de K' },
        { label: 'Densidad central ÷ densidad media' },
      ],
    },
    {
      title: 'El límite sin concentración',
      body: `Carga “Densidad uniforme, n = 0”: una bola de la misma densidad en todo su interior. Lee la densidad central dividida por la densidad media y el radio que contiene la mitad de la masa. Una bola uniforme tiene la mitad de su masa dentro del radio cuyo volumen es la mitad del de la estrella.`,
      fields: [
        { label: 'Densidad central ÷ densidad media' },
        { label: 'Radio que contiene la mitad de la masa' },
      ],
    },
    {
      title: 'Lo que has deducido',
      body: `Una estrella se sostiene por la presión contra su propio peso, y un politropo es la forma que toma ese equilibrio cuando la presión sigue a la densidad como una potencia. Para el Sol esa forma tiene un centro unas cincuenta veces más denso que la media y de unos doce millones de kelvin, que sale solo del peso y crece como la masa entre el radio. El modelo deja fuera de dónde viene la energía, cómo sale (opacidad y convección) y la presión de radiación que importa por encima de unas diez masas solares, así que describe formas, no estrellas. La investigación siguiente pregunta hasta dónde llega una escala simple de esas ideas en toda la secuencia principal.`,
    },
  ],
};
