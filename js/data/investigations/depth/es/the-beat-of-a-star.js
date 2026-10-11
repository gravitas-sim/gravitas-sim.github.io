// El latido de una estrella, más a fondo: las palabras en español, paso a paso con ../the-beat-of-a-star.js.
export default {
  steps: [
    {
      title: 'La anchura a partir de la duración de la serie',
      body: 'La anchura de un pico de la búsqueda de periodos es aproximadamente P² ÷ T, donde P es el periodo y T la duración de la serie. La serie de SU Draconis tiene 39,4 ciclos de 0,66041 días (el instrumento da ambos), así que T = 39,4 × 0,66041 días. Calcula P² ÷ T y compáralo con la anchura que leíste.',
      prompt: 'P² ÷ T para SU Draconis, en días',
      hints: ['T = 39,4 × 0,66041 = 26,0 días. P² = 0,436 días².'],
      worked:
        'T = 26,02 días y P² = 0,4361 días², así que P² ÷ T = 0,0168 días, frente a 0,0167 leído en la búsqueda. La anchura la fija cuánto tiempo se observa, no la estrella: duplica la serie y el pico será la mitad de ancho.',
      feedback: {
        close:
          'Casi. Comprueba T = ciclos × periodo, y luego eleva el periodo al cuadrado.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: P² es 0,44 días² y T es 26 días, así que el cociente es de unas centésimas.',
        off: '(0,66041)² ÷ (39,4 × 0,66041), que es 0,66041 ÷ 39,4.',
      },
    },
    {
      title: 'Cuánto se desfasa',
      body: 'Un periodo de plegado un 2 por ciento demasiado largo se equivoca en 0,02 de ciclo en cada ciclo. A lo largo de los 39,4 ciclos de la serie esos errores se suman. Da la deriva total del último ciclo respecto del primero, en ciclos.',
      prompt: 'Deriva a lo largo de toda la serie, en ciclos',
      hints: [
        'Los ciclos de la serie por la parte de ciclo que se pierde en cada uno: 39,4 × 0,02. Estrictamente el periodo de plegado es 1,02 veces demasiado largo, lo que cambia la tercera cifra.',
      ],
      worked:
        '39,4 ciclos × 0,02 son 0,79 ciclos, o 0,77 usando exactamente el periodo de plegado (1,02 P). En cualquier caso el final de la serie va desfasado casi un ciclo, por eso los puntos plegados se abren en una banda. Una deriva de una décima de ciclo aún parecería una curva; por eso el error del periodo debe estar muy por debajo de 1 ÷ 39,4, el 2,5 por ciento.',
      feedback: {
        close: 'Casi. Multiplica los ciclos por el error de cada ciclo.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: 39 ciclos a 0,02 cada uno son menos de un ciclo.',
        off: '39,4 × 0,02 da 0,79; dividir entre 1,02 da 0,77.',
      },
    },
    {
      title: 'Un alias a mano',
      body: 'Toma la frecuencia verdadera, 1 ÷ 0,66041 días, y réstale un ciclo por día, la frecuencia de muestreo de quien observa una vez por noche. El periodo de lo que queda es el alias más largo. Compáralo con los 1,945 días del instrumento.',
      prompt: 'El periodo del alias más largo, en días',
      hints: ['1 ÷ 0,66041 = 1,5142 por día. Resta 1 y luego invierte.'],
      worked:
        '1,5142 − 1 = 0,5142 por día, y 1 ÷ 0,5142 = 1,945 días. Suma un ciclo por día en su lugar y obtienes 2,5142 por día, o 0,3977 días. Una frecuencia verdadera f se confunde con |f − n| para cada entero n, así que cada estrella tiene infinitos alias y quien observa de noche ve los más fuertes.',
      feedback: {
        close: 'Casi. Trabaja en frecuencia, resta 1 por día y luego invierte.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: resta en frecuencia (por día), no en días.',
        off: '1 ÷ (1 ÷ 0,66041 − 1).',
      },
    },
    {
      title: 'El pico y el periodo afinado',
      body: 'Para Eta Aquilae el pico más alto de la búsqueda está en 7,502 días, y el periodo afinado es 7,226 días. Su diferencia, dividida por la anchura del pico, 2,12 días, dice qué parte de la anchura del pico movió el afinado a la respuesta.',
      prompt: 'El desplazamiento como fracción de la anchura del pico',
      hints: ['(7,502 − 7,226) ÷ 2,12.'],
      worked:
        '0,276 ÷ 2,12 = 0,13. El afinado movió la respuesta un octavo de la anchura: bien dentro del pico, así que es un afinado y no una respuesta distinta. Observa que el desplazamiento (0,28 días) es nueve veces el error del bootstrap (0,030 días): el bootstrap mide cómo oscila la respuesta con el ruido, no lo bien que el método sitúa el periodo.',
      feedback: {
        close:
          'Casi. Resta primero los dos periodos y luego divide entre la anchura.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la diferencia es 0,28 días y la anchura 2,12.',
        off: '(7,502 − 7,226) ÷ 2,12.',
      },
    },
    {
      title: 'Cuántos sigma del catálogo',
      body: 'El Catálogo General de Estrellas Variables da el periodo de Eta Aquilae como 7,1766 días, tras décadas de observación. La serie midió 7,226 ± 0,030 días. Expresa la diferencia en unidades del error del bootstrap.',
      prompt: 'La diferencia en errores del bootstrap',
      hints: ['(7,226 − 7,1766) ÷ 0,030.'],
      worked:
        '0,0498 ÷ 0,030 = 1,7. Una diferencia de 1,7σ es corriente, pero el bootstrap trata los puntos como independientes y los vecinos de una curva de luz suave no lo son, así que su error es un mínimo y la incertidumbre verdadera es mayor. Lo honesto es decir que la serie concuerda con el catálogo y no habría podido hacerlo mejor con 3,7 ciclos.',
      feedback: {
        close: 'Casi. Divide la diferencia entre 0,030, no entre el periodo.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la diferencia es 0,05 días y σ es 0,03.',
        off: '(7,226 − 7,1766) ÷ 0,030.',
      },
    },
  ],
};
