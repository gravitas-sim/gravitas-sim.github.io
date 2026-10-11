// Dentro de una estrella, más a fondo: las palabras en español, paso a paso con ../inside-a-star.js.
export default {
  steps: [
    {
      title: 'La temperatura a mano',
      body: 'Toma un gas de peso molecular medio μ = 0,6 sostenido contra el peso de una estrella de masa <em>M</em> y radio <em>R</em>. Igualar la energía térmica por partícula, kT, a la energía gravitatoria por partícula, GMμm<sub>u</sub> ÷ R, da una escala de temperatura T ≈ GMμm<sub>u</sub> ÷ (kR). Para el Sol, GM = 1,3275 × 10<sup>20</sup> m³/s², m<sub>u</sub> = 1,6605 × 10<sup>−27</sup> kg, k = 1,3806 × 10<sup>−23</sup> J/K y R = 6,957 × 10<sup>8</sup> m.',
      prompt: 'La escala de temperatura del Sol, en millones de kelvin',
      hints: [
        'Multiplica 1,3275 × 10²⁰ por 0,6 y por 1,6605 × 10⁻²⁷, y divide entre el producto de k y R.',
      ],
      worked:
        '1,3275 × 10²⁰ × 0,6 × 1,6605 × 10⁻²⁷ = 1,3226 × 10⁻⁷, y k R = 9,605 × 10⁻¹⁵, así que T = 1,377 × 10⁷ K: 13,8 millones de kelvin. El politropo da 11,8, un 15 por ciento menos, porque una estrella real no es uniforme: la estimación tiene el tamaño correcto y la dependencia correcta de M ÷ R, que es lo que importa.',
      feedback: {
        close: 'Casi. Comprueba el peso molecular y la conversión de unidades.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la escala es del orden de 10⁷ kelvin.',
        off: 'T = G M μ m_u ÷ (k R), y luego divide entre un millón.',
      },
    },
    {
      title: 'La presión central en unidades naturales',
      body: 'Las dimensiones dicen que la presión central de cualquier estrella es un número por GM² ÷ R⁴. Para el Sol, GM² ÷ R⁴ es 1,127 × 10<sup>15</sup> Pa. Pon el instrumento en el Sol y lee la presión central (se da en pascales); luego divide.',
      prompt: 'Presión central ÷ (GM² ÷ R⁴) para n = 3',
      hints: [
        'Lee la presión central, unos 1,25 × 10¹⁶ Pa, y divide entre 1,127 × 10¹⁵ Pa.',
      ],
      worked:
        '1,2456 × 10¹⁶ ÷ 1,127 × 10¹⁵ = 11,05. El número es 1 ÷ (4π (n + 1) θ′₁²) para el politropo, que es 11,05 para n = 3, 0,119 para n = 0 y crece con n a medida que la estrella se condensa.',
      feedback: {
        close: 'Casi. Comprueba los exponentes al dividir.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la presión es unas diez veces GM² ÷ R⁴.',
        off: 'Divide la presión central entre 1,127 × 10¹⁵ Pa.',
      },
    },
  ],
};
