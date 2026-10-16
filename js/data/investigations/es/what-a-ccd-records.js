// Qué registra un CCD - español, paso a paso con ../what-a-ccd-records.js.
export default {
  title: 'Qué registra un CCD',
  subtitle:
    'Imágenes de sesgo (bias), oscuras y de campo plano, y por qué la luz de una estrella necesita que se quiten las tres antes de ser una medida',
  objectives: [
    'Decir qué mide una imagen de sesgo, una de oscuro y una de campo plano, y leer sus números en un conjunto de calibración',
    'Mostrar que dividir por un campo plano cambia la luz medida de una estrella, y cuánto',
    'Distinguir un rayo cósmico de una estrella, y decir qué ha perdido una estrella saturada',
    'Decir qué puede y qué no puede enseñar un detector sintético sobre uno real',
  ],
  steps: [
    {
      title: 'Lo que una cámara añade a la luz',
      body: `Un CCD convierte la luz en números y deja en ellos sus propias marcas. Tres tipos de imagen, tomadas con la misma cámara, dicen cuáles son esas marcas.
             \n\nUna imagen de <strong>sesgo</strong> (bias) es una exposición de cero segundos: contiene lo que la electrónica añade a cada lectura, un desfase y el <strong>ruido de lectura</strong>. Una imagen de <strong>oscuro</strong> se toma con el obturador cerrado durante mucho tiempo: contiene los electrones que produce el calor, la <strong>corriente de oscuridad</strong>. Un <strong>campo plano</strong> es una imagen de una luz uniforme: muestra cuánto más sensibles son unos píxeles que otros, y dónde el polvo y el borde de la óptica atenúan la luz.
             \n\nEl instrumento tiene diez imágenes de sesgo, siete imágenes oscuras de 120 segundos y diez campos planos, y una imagen de 60 segundos de cuatro estrellas tomada con la misma cámara. Todo es <strong>sintético</strong>: hecho con un modelo declarado de un CCD, de modo que se conocen los números verdaderos y la tabla dice qué debe devolver cada imagen. Más brillante es más blanco; la imagen se estira con la raíz cuadrada para que se vea la estructura débil.`,
    },
    {
      title: 'El sesgo',
      body: `Elige «Una imagen de sesgo (sin exposición)». Lee el <strong>nivel del sesgo maestro</strong>, el promedio de las diez imágenes, en cuentas, y el <strong>ruido de lectura</strong>, que el instrumento halla a partir de la diferencia de dos imágenes de sesgo (el desfase se cancela en la diferencia; el ruido no).`,
      fields: [
        { label: 'Nivel del sesgo maestro (cuentas)' },
        { label: 'Ruido de lectura (electrones)' },
      ],
    },
    {
      title: 'Una exposición de nada, y 500 cuentas',
      body: `La imagen de sesgo es una exposición de cero segundos, y sus píxeles leen cerca de 500, no 0.`,
      prompt: '¿Por qué añade la cámara un desfase de 500 cuentas?',
      options: [
        'Entra luz en la cámara durante la lectura',
        'Evita que el ruido empuje un píxel por debajo de cero, adonde un contador no puede ir, de modo que no se pierde ningún valor',
        'El detector produce electrones cuando está caliente',
        'El desfase es el brillo medio del cielo',
      ],
      misconceptions: [
        {
          say: 'El obturador está cerrado en un sesgo y la exposición es de cero segundos. Lo que hay lo añade la electrónica, no la luz.',
        },
        {
          say: 'Eso es la corriente de oscuridad, y crece con la exposición. El sesgo no: es el mismo para cero segundos que para diez minutos.',
        },
      ],
      hints: [
        'Un ruido de lectura de 8 electrones empujaría por debajo de un cero verdadero a la mitad de los píxeles de un sesgo. ¿Qué hace un contador con un número negativo?',
      ],
      because:
        'El convertidor cuenta números enteros desde cero. Con el ruido sobre un cero verdadero, la mitad de los píxeles querrían ser negativos y se recortarían a cero, y el promedio saldría demasiado alto. El desfase pone el cero bien dentro del intervalo, de modo que se conservan todos los valores y el desfase se puede restar con exactitud.',
    },
    {
      title: 'El oscuro',
      body: `Elige «Una imagen oscura (obturador cerrado)» (120 segundos). Lee la <strong>corriente de oscuridad</strong>, los electrones que produce un píxel cada segundo como mediana de la imagen, y con ella calcula los electrones que reunió un píxel típico en los 120 segundos.`,
      fields: [
        { label: 'Corriente de oscuridad' },
        { label: 'Electrones en 120 segundos (un píxel)' },
      ],
    },
    {
      title: 'El campo plano',
      body: `Elige «Un campo plano (luz pareja)». Es una imagen de una luz uniforme, así que cualquier estructura que tenga es de la cámara. Lee cuánto brilla la <strong>esquina como parte del centro</strong>, y la <strong>ganancia</strong>: los electrones que representa cada cuenta, que el instrumento halla con dos imágenes de sesgo y dos de campo plano.`,
      fields: [{ label: 'Esquina, parte del centro' }, { label: 'Ganancia' }],
    },
    {
      title: 'Dividir por el campo plano',
      body: `La estrella B está cerca de una esquina de la imagen, donde el campo plano es tenue. Todavía no cambies el instrumento.`,
      prompt:
        'Después de dividir la imagen por el campo plano, la luz medida de la estrella B será&hellip;',
      options: [
        'menor que antes',
        'mayor que antes',
        'la misma, porque un campo plano solo cambia el aspecto de la imagen',
        'mayor exactamente en la parte de la esquina, el 76 por ciento',
      ],
      hints: [
        'Donde la óptica atenúa la luz, la imagen en bruto contiene menos de la estrella de lo que la estrella envió. Dividir devuelve lo perdido.',
      ],
      because:
        'Mayor. La luz de la estrella B estaba atenuada por la baja sensibilidad de la esquina, así que la imagen en bruto la subestima; dividir por un campo plano menor que 1 allí la eleva. El paso siguiente lee los dos números.',
    },
    {
      title: 'La estrella B, en bruto y calibrada',
      body: `Elige «La imagen cruda de las estrellas» y lee la <strong>luz neta en la abertura de la estrella B</strong>, en electrones. Luego elige «Tras dividir por el plano» y léela otra vez. Las dos filas contienen la <strong>verdad</strong>, la luz que el modelo dio a la estrella.`,
      fields: [
        { label: 'Estrella B, en bruto (electrones)' },
        { label: 'Estrella B, calibrada (electrones)' },
      ],
    },
    {
      title: 'Dividir, no restar',
      body: `El sesgo y el oscuro se restan. El campo plano se divide.`,
      prompt:
        '¿Por qué se divide la imagen por el campo plano en vez de restarlo?',
      options: [
        'Dividir es más rápido para el ordenador',
        'El campo plano es una sensibilidad: un píxel al 76 por ciento convierte la luz de cada estrella en el 76 por ciento de cuentas, así que multiplica la luz y la división lo deshace',
        'El campo plano contiene electrones que hay que quitar',
        'Da igual; las dos dan la misma imagen',
      ],
      misconceptions: [
        {
          say: 'El sesgo y el oscuro añaden cuentas, por eso se restan. El campo plano no añade nada: un píxel sin luz sigue en cero. Escala la luz que hay.',
        },
        {
          say: 'Restar un número cercano a 0,76 cambiaría una estrella brillante casi nada y una débil nada en absoluto. Dividir cambia cada píxel en proporción a su luz, que es lo que hizo la atenuación.',
        },
      ],
      hints: [
        '¿Qué hace un píxel al 76 por ciento a una estrella el doble de brillante?',
      ],
      because:
        'La sensibilidad multiplica: cuentas = sensibilidad × luz. Deshacer un producto es una división, píxel a píxel. El sesgo y el oscuro se suman a las cuentas, así que se restan primero, y el campo plano se divide al final, cuando ya no están; un campo plano dividido en una imagen que todavía tuviera bias escalaría también el bias.',
    },
    {
      title: 'Rayos cósmicos y la estrella saturada',
      body: `Elige «Rayos cósmicos enmascarados». El instrumento marca los píxeles que sobresalen mucho de sus vecinos, algo que una estrella, suave en varios píxeles, no hace. Lee el número de <strong>píxeles de rayos cósmicos marcados</strong> y el número de <strong>píxeles saturados</strong> en la imagen en bruto, los píxeles de la estrella D que llegaron al pozo completo.`,
      fields: [
        { label: 'Píxeles de rayos cósmicos marcados' },
        { label: 'Píxeles saturados' },
      ],
    },
    {
      title: 'La estrella demasiado brillante',
      body: `Mira la estrella D en la tabla. Su luz calibrada es de cerca de 1,1 millones de electrones, frente a una verdad de 1,8 millones, y su barra de error es la más pequeña de las cuatro en proporción a su luz.`,
      prompt:
        '¿Por qué la luz medida de la estrella D es un 39 por ciento demasiado baja, con una barra de error diminuta?',
      options: [
        'El campo plano estaba mal en el lugar de la estrella',
        'La máscara de rayos cósmicos quitó parte de la estrella',
        'Sus píxeles más brillantes se llenaron hasta el pozo completo y dejaron de contar; la luz que perdieron ya no está, y la barra de error solo conoce el ruido',
        'Una estrella más brillante tiene una corrección de abertura mayor',
      ],
      misconceptions: [
        {
          say: 'La máscara marca píxeles sueltos que destacan bruscamente, y el núcleo de una estrella no lo hace. Los 13 píxeles saturados son de la propia estrella.',
        },
        {
          say: 'Una corrección de abertura es una fracción pequeña y conocida. Aquí falta un 39 por ciento, de los píxeles que estaban llenos.',
        },
      ],
      hints: [
        '¿Cuántos electrones puede contener un píxel, y qué pasa con un píxel que recibe más?',
      ],
      because:
        'Un píxel contiene como máximo el pozo completo, aquí 50.000 electrones. La luz que pasa de eso se pierde, no se guarda, así que la luz medida es un límite inferior. La barra de error cuenta solo el ruido de fotones y de lectura; no puede saber de una carga que nunca se registró. El remedio es una exposición más corta, no una calibración.',
    },
    {
      title: 'Lo que calculaste',
      body: `Una imagen de sesgo da el desfase (500 cuentas) y el ruido de lectura (8 electrones); un oscuro da la corriente de oscuridad (0,1 electrón por segundo y píxel); un campo plano da la sensibilidad de cada píxel, y la esquina recibe cerca del 76 por ciento de la luz del centro. El sesgo y el oscuro se restan, y el campo plano se divide al final. La estrella B, cerca de una esquina, leía un 12 por ciento de menos hasta que se aplicó el campo plano; un rayo cósmico se marca porque es agudo, y una estrella saturada no se puede reparar.
             \n\nLa cámara es <strong>sintética</strong>: cada número sale de un modelo declarado, sin blooming, sin no linealidad, con un campo plano para todos los colores y una estrella perfectamente redonda. Una cámara real añade todo eso, y cada una de sus imágenes de calibración tiene que ser tomada, revisada y combinada por alguien. Esto muestra para qué sirve cada imagen; no sustituye tomarlas.`,
    },
  ],
};
