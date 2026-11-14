// Anillos y arcos de Einstein, más a fondo: las palabras en español, paso a paso con ../einstein-rings-and-arcs.js.
export default {
  steps: [
    {
      title: 'La masa dentro de un anillo, a mano',
      body: 'Despejar la masa en el radio de Einstein da <em>M</em> = θ<sub>E</sub>² c² D<sub>l</sub>D<sub>s</sub> ÷ (4G D<sub>ls</sub>). Toma un anillo de 1,0 segundo de arco (4,848 × 10<sup>−6</sup> radianes) alrededor de una lente a 1 Gpc, con la fuente a 2 Gpc, de modo que D<sub>ls</sub> = 1 Gpc. Un gigaparsec son 3,086 × 10<sup>25</sup> m y una masa solar son 1,989 × 10<sup>30</sup> kg.',
      prompt: 'La masa dentro del anillo',
      hints: [
        'D_l D_s ÷ D_ls = 2 Gpc × 1 Gpc ÷ 1 Gpc = 2 Gpc = 6,171 × 10²⁵ m.',
      ],
      worked:
        'M = (4,848 × 10⁻⁶)² × (2,998 × 10⁸)² × 6,171 × 10²⁵ ÷ (4 × 6,674 × 10⁻¹¹) = 4,88 × 10⁴¹ kg = 2,46 × 10¹¹ masas solares. Es la masa dentro del anillo, de la clase que sea, y lo que dio el instrumento por tanteo.',
      feedback: {
        close: 'Casi. Comprueba D_l D_s ÷ D_ls y el factor 4G.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la masa de lente de una galaxia es del orden de 10¹¹ a 10¹² masas solares.',
        off: 'M = θ² c² D_l D_s ÷ (4 G D_ls), en kilogramos, y luego divide entre 1,989 × 10³⁰.',
      },
    },
    {
      title: 'La dispersión de velocidades de una lente',
      body: 'Una galaxia isoterma tiene un radio de Einstein θ<sub>E</sub> = 4π (σ ÷ c)² D<sub>ls</sub> ÷ D<sub>s</sub>, donde σ es la dispersión unidimensional de velocidades de sus estrellas. Toma θ<sub>E</sub> = 1,0 segundo de arco y D<sub>ls</sub> ÷ D<sub>s</sub> = 0,5, como en el instrumento. La velocidad de la luz es 299.792 km/s.',
      prompt:
        'La dispersión de velocidades que hace un anillo de un segundo de arco',
      hints: [
        'σ = c √(θ_E D_s ÷ (4π D_ls)), con θ_E en radianes y D_s ÷ D_ls = 2.',
      ],
      worked:
        'σ = 299.792 × √(4,848 × 10⁻⁶ × 2 ÷ (4π)) = 299.792 × 8,78 × 10⁻⁴ = 263 km/s: una dispersión típica de una galaxia elíptica masiva, y por eso esas galaxias son las lentes comunes. El instrumento indica la dispersión de su propio anillo.',
      feedback: {
        close: 'Casi. El cociente D_s ÷ D_ls es 2, y θ_E está en radianes.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la dispersión de velocidades de una galaxia es de unos cientos de kilómetros por segundo.',
        off: 'σ = c √(θ_E ÷ (4π × 0,5)), con θ_E = 4,848 × 10⁻⁶.',
      },
    },
  ],
};
