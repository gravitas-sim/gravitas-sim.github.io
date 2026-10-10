// El límite, más a fondo: las palabras en español, paso a paso con ../the-limit.js.
export default {
  steps: [
    {
      title: 'La densidad media a mano',
      body: 'La enana típica tiene una masa de 0,597 masas solares (1 masa solar = 1,989 × 10<sup>30</sup> kg) y un radio de 8.864 km. La densidad media es la masa ÷ (4/3 π R³). Dala en unidades de 10<sup>5</sup> g/cm³ (1 g/cm³ son 1.000 kg/m³); el instrumento indica el mismo número.',
      prompt: 'La densidad media de la enana blanca típica',
      hints: [
        'Masa: 1,188 × 10³⁰ kg. Volumen: 4,19 × (8,864 × 10⁶ m)³ = 2,92 × 10²¹ m³.',
      ],
      worked:
        '1,188 × 10³⁰ ÷ 2,918 × 10²¹ = 4,07 × 10⁸ kg/m³, que son 4,07 × 10⁵ g/cm³: unas 290.000 veces la densidad media del Sol, 1,41 g/cm³. Una cucharadita pesaría unas dos toneladas.',
      feedback: {
        close: 'Casi. Comprueba el cubo del radio y la conversión de unidades.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: convierte el radio a metros antes de elevar al cubo, y los kg/m³ a g/cm³ al final.',
        off: 'ρ = M ÷ (4/3 π R³) con R en metros, y luego divide entre 1.000 y entre 10⁵.',
      },
    },
    {
      title: 'Lo que compra una densidad cien veces mayor',
      body: 'Subir la densidad central de 10⁹ a 10¹¹ g/cm³ llevó la masa de 1,367 a 1,450 masas solares. Halla cuánta masa añadió ese aumento de cien veces, como porcentaje de los 1,367.',
      prompt: 'Aumento de masa, como porcentaje',
      hints: [
        'Resta las dos masas y divide entre 1,367; luego multiplica por 100.',
      ],
      worked:
        '(1,450 − 1,367) ÷ 1,367 = 6,1 por ciento. De 10⁷ a 10⁹ g/cm³ la masa había pasado de 0,81 a 1,37; el siguiente aumento de cien veces añade un seis por ciento, y el siguiente añadiría menos de un uno por ciento. La masa se satura porque la presión es ρ^(4/3) ahí, y el techo es donde ese exponente deja de dar una estrella estable.',
      feedback: {
        close:
          'Casi. El aumento es la diferencia dividida por la masa de partida.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el aumento es de pocos por ciento, no de pocos cientos.',
        off: '100 × (1,450 − 1,367) ÷ 1,367.',
      },
    },
  ],
};
