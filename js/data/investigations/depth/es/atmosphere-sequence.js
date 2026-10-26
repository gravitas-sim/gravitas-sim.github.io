// Las investigaciones de atmósfera, más a fondo: las palabras en español, paso a paso con ../atmosphere-sequence.js (D-R10-81).
// Sin lectura por una persona que lea español con fluidez.

// Por qué Venus es caliente, pasos más profundos: paso a paso con el inglés.
export const WHY_VENUS_IS_HOT_DEEPER = {
  steps: [
    {
      title: 'La Tierra sin albedo',
      body: 'El albedo de Bond fija cuánta luz solar absorbe un planeta. Pon el planeta en <strong>Tierra</strong>, cambia el albedo a <strong>la mía</strong> y ponlo en <strong>0</strong>: un planeta que lo absorbe todo. Lee la nueva temperatura de equilibrio y cuánto más cálida es que con el propio albedo de la Tierra, 254 K.',
      fields: [
        { label: 'Temperatura de equilibrio de la Tierra con albedo 0' },
        { label: 'Cuánto más cálida que con su propio albedo' },
      ],
    },
    {
      title: '¿Con qué rapidez se enrarece el aire?',
      body: 'En una atmósfera isoterma la presión baja en el mismo factor, 1/e o un 37 por ciento, en cada <strong>altura de escala</strong> <em>H</em> = <em>kT</em>/(<em>&mu;m</em><sub>u</sub><em>g</em>). No es el grosor de la atmósfera: no hay un tope. Lee la altura de escala de <strong>Venus</strong> a su temperatura superficial, y la de la <strong>Tierra</strong>.',
      fields: [
        { label: 'Altura de escala de Venus' },
        { label: 'Altura de escala de la Tierra' },
      ],
    },
  ],
};

// Dos modelos de efecto invernadero, pasos más profundos: paso a paso con el inglés.
export const TWO_GREENHOUSE_MODELS_DEEPER = {
  steps: [
    {
      title: 'Marte en los dos modelos',
      body: 'Marte tiene una atmósfera fina. Pon el planeta en <strong>Marte</strong> y lee la emisividad de una capa y la profundidad óptica que dan su temperatura superficial medida, 210 K.',
      fields: [
        { label: 'Emisividad que da 210 K' },
        { label: 'Profundidad óptica que da 210 K' },
      ],
    },
    {
      title: 'Una unidad en cada modelo',
      body: 'Pon el planeta en <strong>Tierra</strong>. Da al modelo de una capa una emisividad de <strong>1</strong> (una capa que absorbe todo el infrarrojo) y al modelo gris una profundidad óptica de <strong>1</strong>. Lee la temperatura del suelo que da cada uno.',
      fields: [
        {
          label: 'Temperatura del suelo, modelo gris con profundidad óptica 1',
        },
        { label: 'Temperatura del suelo, una capa con emisividad 1' },
      ],
    },
    {
      title: 'Dónde se detiene el modelo gris',
      body: 'El perfil gris es la solución de Eddington. Existe una solución gris numéricamente exacta y el instrumento la dibuja discontinua. Mira lo alto de la atmósfera, con profundidad óptica 0, y lee cuánto más cálida es la curva de Eddington que la gris exacta, como porcentaje.\n\nEsa diferencia es el error de la aproximación. Un límite mayor es la palabra <em>gris</em>: la opacidad real depende de la longitud de onda, y la luz solar y el infrarrojo del planeta se absorben de maneras muy distintas, algo que este modelo no puede representar.',
      fields: [{ label: 'Eddington frente al gris exacto, arriba' }],
    },
  ],
};

export default {
  'why-venus-is-hot': WHY_VENUS_IS_HOT_DEEPER,
  'two-greenhouse-models': TWO_GREENHOUSE_MODELS_DEEPER,
};
