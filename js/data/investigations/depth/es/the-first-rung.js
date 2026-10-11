// El primer peldaño, más a fondo: las palabras en español, paso a paso con ../the-first-rung.js.
export default {
  steps: [
    {
      title: 'Del módulo a la distancia',
      body: 'El módulo de distancia es μ = 5 log₁₀(d ÷ 10 pc), así que d = 10<sup>(μ+5)/5</sup> pársecs, que son 10<sup>(μ−25)/5</sup> megapársecs. Usa el μ = 29,403 de NGC 4258 para hallar su distancia y comprobar la cifra del instrumento.',
      prompt: 'La distancia de NGC 4258, en megapársecs',
      hints: ['(29,403 − 25) ÷ 5 = 0,8806. Luego 10 elevado a eso.'],
      worked:
        '(29,403 − 25) ÷ 5 = 0,8806, y 10^0,8806 = 7,59 megapársecs. Cada magnitud de módulo es un factor 10^0,2 = 1,58 en distancia, así que el deslizamiento de 10,9 magnitudes desde la Nube de Magallanes es un factor 153.',
      feedback: {
        close: 'Casi. Resta 25 antes de dividir entre 5, para megapársecs.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: con μ en magnitudes, 10 elevado a (μ − 25) ÷ 5 da megapársecs; sin el 25 da pársecs.',
        off: '10^((29,403 − 25) ÷ 5).',
      },
    },
    {
      title: 'El presupuesto en cuadratura',
      body: 'Los errores independientes se suman como la raíz cuadrada de la suma de sus cuadrados. Toma los cuatro términos de NGC 4258: 0,043, 0,0048, 0,00015 y 0,026 magnitudes. Súmalos en cuadratura.',
      prompt: 'El error total, en magnitudes',
      hints: [
        '0,043² = 0,00185; 0,026² = 0,00068; los otros dos son 0,00002 y nada.',
      ],
      worked:
        '0,00185 + 0,00002 + 0,00000 + 0,00068 = 0,00255, cuya raíz cuadrada es 0,0505, los 0,051 del instrumento. Sumar los cuatro sin más daría 0,074, demasiado: los errores independientes se cancelan en parte.',
      feedback: {
        close:
          'Casi. Eleva cada término al cuadrado, suma y toma la raíz cuadrada.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el total es algo más que el término mayor, 0,043.',
        off: 'raíz(0,043² + 0,0048² + 0,00015² + 0,026²).',
      },
    },
    {
      title: 'El error como parte de la distancia',
      body: 'Un error pequeño en el módulo es una fracción de la distancia: Δd ÷ d = (ln 10 ÷ 5) Δμ = 0,4605 Δμ. Toma el error total de NGC 4258, 0,051 magnitudes, y da el error de la distancia en porcentaje.',
      prompt: 'El error en la distancia, en porcentaje',
      hints: ['0,4605 × 0,051 × 100.'],
      worked:
        '0,4605 × 0,051 = 0,0235, o el 2,35 por ciento de 7,59 Mpc, que son 0,18 megapársecs, la cifra del instrumento. La distancia de la Nube sola es un error del 1,2 por ciento, y aporta el 26 por ciento de la varianza (0,026² ÷ 0,051²).',
      feedback: {
        close: 'Casi. Multiplica 0,051 por 0,4605 y por 100.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: 0,05 magnitudes son un par de por ciento en distancia.',
        off: '100 × 0,4605 × 0,051.',
      },
    },
    {
      title: 'Diez galaxias',
      body: 'Supón que diez galaxias como NGC 4258 se calibraran con la misma Nube. Sus términos de dispersión son independientes, así que el término de galaxia de su media baja a 0,043 ÷ √10. Pero la dispersión de la calibración (0,0048) y la distancia de la Nube (0,026) las comparten todas, y el término de la pendiente es despreciable. Suma los tres en cuadratura para hallar el error del módulo medio.',
      prompt: 'El error del módulo medio de diez galaxias, en magnitudes',
      hints: [
        '0,043 ÷ 3,162 = 0,0136. Luego raíz(0,0136² + 0,0048² + 0,026²).',
      ],
      worked:
        'raíz(0,0136² + 0,0048² + 0,026²) = raíz(0,000185 + 0,000023 + 0,000676) = 0,0297 magnitudes. Diez galaxias bajan el error de 0,051 a 0,030, no a 0,016: los términos compartidos no se promedian. Por eso la distancia del anclaje es el error limitante de toda la escalera, y por eso esa distancia es el número más estudiado de ella.',
      feedback: {
        close:
          'Casi. Solo el término de galaxia se divide entre √10; los otros dos no.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la respuesta queda entre los 0,026 de la Nube y los 0,051 de una sola galaxia.',
        off: 'raíz((0,043 ÷ √10)² + 0,0048² + 0,026²).',
      },
    },
  ],
};
