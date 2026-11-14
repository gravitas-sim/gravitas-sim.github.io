// Escalar la secuencia principal - español, paso a paso con ../scaling-the-main-sequence.js.
export default {
  title: 'Escalar la secuencia principal',
  subtitle:
    'Lo que predice un argumento de escala y lo que dicen los modelos MIST',
  objectives: [
    'Decir qué supone la homología y qué puede y qué no puede predecir',
    'Leer un exponente de un argumento de escala y de un ajuste log-log a estrellas modelo, y compararlos',
    'Decir qué opacidad y qué fuente de energía fijan el exponente en cada intervalo de masa',
    'Usar los residuos para decir dónde deja de funcionar una ley de escala, y por qué',
  ],
  steps: [
    {
      title: 'Estrellas como copias a escala',
      body: `Supón que toda estrella de la secuencia principal es la misma forma a otro tamaño. Entonces, al mismo radio fraccionario, la densidad escala como M ÷ R³, la presión como M² ÷ R⁴ y, para un gas ideal, la temperatura como M ÷ R. Añade cómo se escapa la radiación (una <strong>opacidad</strong> κ ∝ ρ<sup>a</sup>T<sup>−b</sup>) y cómo se produce la energía (una tasa ∝ ρ<sup>λ</sup>T<sup>ν</sup>) y las dos deben coincidir en la luminosidad: eso fija cómo cambian L y R con M. Esto es la <strong>homología</strong>. Predice <em>exponentes</em>, no constantes.
             \n\nEl instrumento compara la predicción (líneas) con las estrellas de edad cero de los modelos MIST (puntos, ocho masas de 0,2 a 40 veces el Sol). Ambos son modelos: uno es un argumento de escala, el otro un cálculo completo de evolución estelar.`,
    },
    {
      title: '¿Seguirán los modelos la escala?',
      body: `Para estrellas donde los electrones dispersan la luz (opacidad independiente de la densidad y de la temperatura) la escala dice que la luminosidad crece como M³. Los modelos MIST entre 2 y 40 masas solares son una comprobación independiente. Todavía no leas el instrumento.`,
      prompt: 'De 2 a 40 masas solares los modelos darán un exponente&hellip;',
      options: [
        'cercano a 3, con una diferencia de un diez por ciento',
        'cercano a 5, mucho más empinado',
        'cercano a 1, mucho menos empinado',
        'que no es una ley de potencias en absoluto',
      ],
      hints: [
        'Un argumento de escala es tosco, pero no está tremendamente equivocado.',
      ],
      because:
        'Cercano a 3: el ajuste de 2 a 40 masas solares da 3,16, un cinco por ciento por encima de 3. La dispersión de 0,14 dex en torno a la recta es lo que la escala no capta. El paso siguiente lee ambas cosas.',
    },
    {
      title: 'Estrellas masivas: dispersión de electrones y ciclo CNO',
      body: `El instrumento empieza con luminosidad frente a masa con dispersión de electrones y ciclo CNO. Lee el exponente que predice la escala, el exponente ajustado a los modelos de 2 a 40 masas solares y la dispersión de esos modelos en torno al exponente predicho (en dex, factores de diez).`,
      fields: [
        { label: 'Exponente predicho' },
        { label: 'Exponente ajustado, 2 a 40 M☉' },
        { label: 'Dispersión, 2 a 40 M☉' },
      ],
    },
    {
      title:
        'Estrellas de poca masa: opacidad de Kramers y cadena protón-protón',
      body: `Carga “Luminosidad de las estrellas de poca masa”. Para estrellas de unas 0,5 a 2 masas solares la opacidad es la de Kramers (cae con la temperatura) y el hidrógeno arde por la cadena protón-protón. Lee el exponente que predice la escala y el exponente ajustado a los modelos de 0,5 a 2 masas solares.`,
      fields: [
        { label: 'Exponente predicho' },
        { label: 'Exponente ajustado, 0,5 a 2 M☉' },
      ],
    },
    {
      title: 'Usa la ley equivocada con estrellas masivas',
      body: `Vuelve a la luminosidad, deja el ciclo CNO y cambia la opacidad a <strong>Kramers</strong>. Lee el exponente que predice y la dispersión de los modelos de 2 a 40 masas solares en torno a él.`,
      fields: [
        { label: 'Exponente predicho' },
        { label: 'Dispersión, 2 a 40 M☉' },
      ],
    },
    {
      title: 'Por qué no hay un solo exponente',
      body: `El exponente ajustado es 4,4 de 0,5 a 2 masas solares y 3,2 de 2 a 40, y una sola recta por los ocho modelos deja residuos de hasta 0,36 dex.`,
      prompt: '¿Qué afirmación lo explica mejor?',
      options: [
        'Las estrellas de poca y de mucha masa están hechas de materiales distintos',
        'Procesos distintos dominan la opacidad y la fuente de energía en intervalos de masa distintos, así que el exponente cambia',
        'Los modelos MIST fallan en un extremo',
        'La luminosidad no depende de la masa',
      ],
      misconceptions: [
        {
          say: 'Todos los modelos parten de la misma composición. Lo que cambia con la masa es la temperatura central, que decide qué opacidad y qué reacciones dominan.',
        },
      ],
      hints: [
        'Compara las leyes que dieron poca dispersión en los dos intervalos: no son las mismas.',
      ],
      because:
        'Un centro más caliente (más masa) desplaza la opacidad de Kramers hacia la dispersión de electrones y la fuente de energía de la cadena protón-protón hacia el ciclo CNO, así que el exponente baja de unos 4,4 hacia 3 y menos. La escala vale dentro de un intervalo donde domina una ley y falla al cruzar el cambio.',
    },
    {
      title: 'El radio es más difícil',
      body: `Carga “Radio de las estrellas masivas”. Lee el exponente que predice la escala para el radio y el exponente ajustado a los modelos de 2 a 40 masas solares.`,
      fields: [
        { label: 'Exponente predicho' },
        { label: 'Exponente ajustado, 2 a 40 M☉' },
      ],
    },
    {
      title: 'Las vidas se siguen',
      body: `Una estrella quema una parte fija de su combustible, así que su vida es su combustible dividido por su luminosidad: escala como M ÷ L, una potencia menos que la de la luminosidad. Carga “Vidas” y lee el exponente que predice la escala y el exponente ajustado a los modelos de 2 a 40 masas solares.`,
      fields: [
        { label: 'Exponente predicho' },
        { label: 'Exponente ajustado, 2 a 40 M☉' },
      ],
    },
    {
      title: 'El reloj del Sol, de dos maneras',
      body: `Elige el modelo de 1 masa solar. El instrumento da su vida en la secuencia principal según el cálculo MIST y una escala de tiempo nuclear sencilla: el 0,7 por ciento de la masa se convierte en energía, se quema una décima parte de la masa de la estrella y la estrella brilla con la luminosidad del modelo. Lee ambas.`,
      fields: [
        { label: 'Vida en la secuencia principal (MIST)' },
        { label: 'Escala de tiempo nuclear' },
      ],
    },
    {
      title: 'Lo que has deducido',
      body: `Si las estrellas son copias a escala, las ecuaciones de estructura más una opacidad y una fuente de energía fijan exponentes: L ∝ M³ para estrellas masivas, más empinado para las de poca masa, y una vida que cae como M ÷ L. Frente a los modelos MIST de edad cero, el exponente de luminosidad de las masivas acierta en un cinco por ciento con 0,14 dex de dispersión; a poca masa la escala es una unidad demasiado empinada; el radio es más difícil que la luminosidad. Los residuos dicen dónde se rompen los supuestos: donde la opacidad y las reacciones cambian con la masa y donde la convección fija la estructura. La escala dice qué esperar; las estrellas modelo dicen hasta dónde fiarse.`,
    },
  ],
};
