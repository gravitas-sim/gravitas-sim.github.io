// Finding Planets by Their Shadows, deeper: the Spanish words, step for step with ../transit-photometry.js.
export default {
  steps: [
    {
      title: '¿Qué tan seguro es el radio?',
      body: 'Tu radio salió de una sola profundidad, y una profundidad es la diferencia de dos brillos, cada uno promediado sobre muchas exposiciones. Supón que cada exposición se dispersa 3 × 10⁻⁴ del brillo de la estrella, que un tránsito tiene 90 exposiciones dentro y la línea base 450. La incertidumbre de la profundidad es entonces σ<sub>δ</sub> = σ·√(1/n<sub>dentro</sub> + 1/n<sub>fuera</sub>).\n\nEl radio va como √δ, así que su incertidumbre fraccionaria es la mitad de la de la profundidad: σ<sub>R</sub>/R = σ<sub>δ</sub> / (2δ). La profundidad y el radio de la estrella son los que anotaste en la medición anterior; solo los tres números de arriba son nuevos. El radio de la estrella se toma aquí como exacto, que es lo siguiente que un análisis real no haría.',
      fields: [
        { label: 'Dispersión de una exposición' },
        { label: 'Exposiciones dentro del tránsito' },
        { label: 'Exposiciones en la línea base' },
        { label: 'Profundidad que mediste' },
        { label: 'Incertidumbre de la profundidad' },
        { label: 'Radio del planeta (R_Jupiter)' },
        { label: 'Su incertidumbre (R_Jupiter)' },
      ],
    },
    {
      title: 'Dalo con barra de error',
      body: 'Da el radio del planeta como un resultado: el valor, ±, y la incertidumbre del paso anterior. Cuenta como correcto cuando el rango que das se solapa con el que respalda la medición y no es más ancho que el doble de la semianchura de ese rango.',
      prompt: 'Radio del planeta en R_Jupiter, con su incertidumbre',
      placeholder: 'p. ej. 1,37 ± 0,01',
      hints: {
        concept: 'Un resultado es un valor y lo bien que se conoce.',
        method:
          'Copia el radio y su incertidumbre del paso anterior y escríbelos como valor ± incertidumbre.',
      },
      because:
        'Unos 1,37 radios de Júpiter. La dispersión fotométrica sola hace la incertidumbre minúscula; el valor publicado, 1,38, difiere más que eso, porque el radio de la estrella y el modelo de oscurecimiento del limbo también tienen incertidumbre.',
    },
    {
      title: 'Hazlo hacia delante',
      body: 'Ve en sentido contrario: de un planeta a la caída que haría. Un modelo directo toma los radios y predice la profundidad, para poder contrastarla con lo medido.\n\nSupón que el radio del planeta se conoce en 1,38 R<sub>Júpiter</sub> con un 1,5 %, y el de la estrella en 1,155 R<sub>☉</sub> con un 1,2 %. Para un tránsito por el centro de la estrella, la profundidad es δ = k²·1,2146 con k = R<sub>p</sub>/R<sub>★</sub>. Como δ va como k², su incertidumbre fraccionaria es el doble de la de k, y las de los dos radios se suman en cuadratura.',
      prompt: 'Profundidad prevista, con su incertidumbre',
      placeholder: 'p. ej. 0,0183 ± 0,0007',
      hints: {
        concept: 'El modelo es la relación de la profundidad usada al revés.',
        method:
          'k = 1,38 / (1,155 × 9,7311). Elévalo al cuadrado, multiplica por 1,2146 y toma el doble de la incertidumbre fraccionaria combinada de k.',
      },
      because:
        'El modelo predice una profundidad de 0,0183, con incertidumbre de unos 0,0007. Es el número con el que se compara una profundidad medida: no si los dos son iguales, que nunca lo son exactamente, sino si difieren más que su incertidumbre combinada.',
    },
    {
      title: '¿Concuerda el modelo?',
      body: 'Una medición dio una profundidad de 0,0179 ± 0,0004. El modelo directo predijo 0,0183 ± 0,0007. Los dos difieren en 0,0004, y sus incertidumbres se combinan en cuadratura.',
      prompt: 'Teniendo en cuenta la incertidumbre combinada, los dos…',
      options: [
        'discrepan: los números no son iguales',
        'concuerdan: difieren en menos de una incertidumbre combinada',
        'discrepan en unas tres incertidumbres combinadas',
        'no se pueden comparar, porque uno es un modelo',
      ],
      because:
        'La incertidumbre combinada es √(0,0004² + 0,0007²) = 0,0008, y la diferencia es 0,0004, la mitad. Un modelo y una medición concuerdan cuando difieren no más de lo que permiten sus incertidumbres, y estos lo hacen. La prueba no encuentra un problema; no demuestra que el modelo sea correcto.',
    },
  ],
};
