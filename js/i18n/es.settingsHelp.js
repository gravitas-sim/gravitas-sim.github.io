// =============================================================================
// La ayuda del panel de ajustes: la sombra en español de ./en.settingsHelp.js
// -----------------------------------------------------------------------------
// Se descarga al pulsar por primera vez un botón de información, y solo para
// quien lee en español. tests/settingsInventory.test.js comprueba ambos
// archivos frente al panel.
// =============================================================================

export const ES_SETTINGSHELP = {
  'setHelp.gravitational_constant':
    'Fija G en las unidades propias de la aplicación (1 unidad de longitud = 0,01 AU; 1 M☉ = 1000 unidades de masa); el valor por defecto es 2, no el del SI. Aumentarlo hace que todos los cuerpos se muevan más rápido en pantalla, y las lecturas en unidades físicas lo compensan haciendo que cada unidad de tiempo simulada represente más tiempo real. Surte efecto de inmediato, pero los cuerpos conservan su velocidad actual, así que las órbitas preparadas para el valor anterior dejan de ser circulares.',
  'setHelp.mutual_gravity':
    'Activada: cada cuerpo atrae a todos los demás, salvo los cometas y los fragmentos, que nunca atraen a nada. Desactivada: los planetas y los asteroides sienten la gravedad pero no la ejercen, mientras que los agujeros negros, las estrellas, los gigantes gaseosos, las estrellas de neutrones y las enanas blancas siguen atrayendo. Surte efecto de inmediato, y la gravedad aproximada (Barnes-Hut) solo funciona con esta opción activada.',
  'setHelp.sim_speed':
    'Cuánto tiempo simulado transcurre por segundo real: a 1×, unas 5 unidades de tiempo, aproximadamente 13 días con la G por defecto; con 0 el movimiento se detiene. El paso de integración crece con la velocidad, así que a velocidades altas la integración es menos precisa, salvo que el escenario limite el paso. Surte efecto de inmediato; los botones de velocidad cambian este mismo valor.',
  'setHelp.sim_size':
    'Fija el tamaño de la región en la que el generador distribuye los cuerpos: Pequeña, 100 unidades (1 AU); Mediana, 200 (2 AU); Grande, 300 (3 AU); Enorme, 500 (5 AU). Un cuerpo central muy masivo la amplía para que nada empiece dentro de él. Surte efecto cuando «Aplicar y reiniciar» reconstruye la simulación.',
  'setHelp.placement':
    'Cómo distribuye el generador los cuerpos alrededor de la estrella u objeto compacto más masivo, que empieza en reposo en el centro. Circular y Anillos múltiples los colocan en anillos (20 por anillo en el segundo caso) con velocidad de órbita circular; Aleatoria los dispersa, en órbita alrededor del centro si este pesa más del triple que el resto y, si no, con velocidades al azar; Cuadrícula los coloca en una retícula cuadrada con velocidades pequeñas al azar; Vacía no distribuye nada: sirve para colocar los cuerpos a mano, así que conviene poner antes los recuentos a cero; si no, todos los cuerpos generados empiezan juntos en el centro. Surte efecto cuando «Aplicar y reiniciar» reconstruye la simulación.',
  'setHelp.num_black_holes':
    'Cuántos agujeros negros crea el generador, cada uno con la masa por defecto salvo que se fijen masas individuales. Todos los cuerpos son atraídos por ellos; si se mueven o no lo decide «Comportamiento». Surte efecto cuando «Aplicar y reiniciar» reconstruye la simulación.',
  'setHelp.bh_mass':
    'Masa de cada agujero negro generado, en masas solares (M☉). Se usa para todos salvo que las masas individuales estén activadas y se hayan fijado, y también para cualquier agujero que quede fuera de las fijadas. Surte efecto cuando «Aplicar y reiniciar» reconstruye la simulación.',
  'setHelp.use_individual_bh_masses':
    'Da a cada agujero negro su propia masa, que se fija con el botón de masas individuales que aparece cuando hay dos agujeros o más. Mientras no se fijen allí, todos usan la masa por defecto. Surte efecto cuando «Aplicar y reiniciar» reconstruye la simulación.',
  'setHelp.bh_behavior':
    '«Estático» fija cada agujero negro en su sitio (un agujero recién fusionado puede desplazarse brevemente). «En órbita» deja que los agujeros se muevan por la gravedad de los demás agujeros, con la tasa de decaimiento orbital aplicada; las estrellas, los planetas y los demás cuerpos nunca atraen a un agujero negro. Surte efecto de inmediato.',
  'setHelp.orbit_decay_rate':
    'Una aproximación sencilla a la espiral por ondas gravitatorias: en cada paso, la velocidad de un agujero negro en movimiento se reduce en esta fracción por unidad de tiempo simulada, de modo que los pares de agujeros negros se acercan en espiral. No se calcula a partir de la relatividad general, solo actúa sobre agujeros negros en «En órbita» y elimina energía, algo que la comprobación de conservación señala. Surte efecto de inmediato.',
  'setHelp.num_neutron_stars':
    'Cuántas estrellas de neutrones crea el generador, de 1,4 a 2,0 M☉ cada una salvo que el escenario fije sus masas. Siempre atraen a los demás cuerpos. Surte efecto cuando «Aplicar y reiniciar» reconstruye la simulación.',
  'setHelp.num_white_dwarfs':
    'Cuántas enanas blancas crea el generador, de 0,5 a 1,1 M☉ cada una. Siempre atraen a los demás cuerpos. Surte efecto cuando «Aplicar y reiniciar» reconstruye la simulación.',
  'setHelp.num_stars':
    'Cuántas estrellas crea el generador, con masas al azar de unas 0,2 a 6 M☉. Las estrellas siempre atraen a los demás cuerpos, y en los escenarios con una estrella central, como el sistema solar, esa estrella cuenta dentro de este número. Surte efecto cuando «Aplicar y reiniciar» reconstruye la simulación.',
  'setHelp.num_planets':
    'Cuántos planetas rocosos crea el generador, de 0,1 a 1,6 masas terrestres cada uno. Los planetas sienten la gravedad, pero solo atraen a otros cuerpos con la gravedad mutua activada. Surte efecto cuando «Aplicar y reiniciar» reconstruye la simulación; el nivel de calidad Baja crea como máximo 12.',
  'setHelp.num_gas_giants':
    'Cuántos gigantes gaseosos crea el generador, de unas 0,3 a 20 masas de Júpiter cada uno. A diferencia de los planetas rocosos, siempre atraen a los demás cuerpos. Surte efecto cuando «Aplicar y reiniciar» reconstruye la simulación; el nivel de calidad Baja crea como máximo 4.',
  'setHelp.enable_asteroids':
    'Interruptor general de los asteroides generados: si está desactivado, se ignora «Número de asteroides» y no se crea ninguno. Surte efecto cuando «Aplicar y reiniciar» reconstruye la simulación.',
  'setHelp.num_asteroids':
    'Cuántos asteroides crea el generador cuando «Activar asteroides» está activado, cada uno con la masa de Ceres. Como los planetas rocosos, solo atraen a otros cuerpos con la gravedad mutua activada. Surte efecto cuando «Aplicar y reiniciar» reconstruye la simulación; el nivel de calidad Baja crea como máximo 40.',
  'setHelp.num_comets':
    'Cuántos cometas crea el generador, de 0,001 a 0,1 veces la masa del cometa Halley cada uno. Los cometas son atraídos por todo lo demás, pero nunca atraen a nada, ni siquiera con la gravedad mutua activada. Surte efecto cuando «Aplicar y reiniciar» reconstruye la simulación; el nivel de calidad Baja crea como máximo 8.',
  'setHelp.init_velocity':
    'Escala de la velocidad inicial, en unidades de simulación (unos 6,7 km/s cada una con la G por defecto). La disposición Aleatoria da a cada cuerpo una dirección al azar y una rapidez de hasta la mitad de este valor más la mitad de la dispersión, reducida a un pequeño empuje del 30 % sobre una órbita circular cuando domina un cuerpo central; Cuadrícula da hasta ±15 % de este valor por componente, y Circular y Anillos múltiples solo lo usan si no hay cuerpo central. Surte efecto cuando «Aplicar y reiniciar» reconstruye la simulación.',
  'setHelp.velocity_stddev':
    'Dispersión aleatoria adicional que se suma a las velocidades iniciales, en las mismas unidades que «Velocidad inicial». Es una dispersión uniforme, no una desviación estándar, y solo la usa la disposición Aleatoria. Surte efecto cuando «Aplicar y reiniciar» reconstruye la simulación.',
  'setHelp.show_trails':
    'Dibuja detrás de cada cuerpo en movimiento una línea que se desvanece y muestra su trayectoria reciente; los agujeros negros no tienen traza. Es solo un efecto visual; surte efecto de inmediato.',
  'setHelp.trail_style':
    '«Nube» dibuja trazos superpuestos y difusos; «Simple», una línea fina; «Resplandor», una hilera de puntos luminosos, más brillantes donde el cuerpo iba más rápido. Es solo un efecto visual; surte efecto de inmediato.',
  'setHelp.trail_length':
    'Cuántas posiciones registradas conserva cada traza, una por paso de integración, así que una traza más larga muestra más órbita. La longitud también varía con el zoom (de 0,6× a 1,5×) y puede reducirse con «Detalle adaptativo» o con el nivel de calidad Baja. Es solo un efecto visual; surte efecto de inmediato.',
  'setHelp.trail_color_mode':
    '«Por tipo» colorea cada traza con el color del propio cuerpo o el de su tipo (las estrellas, según su temperatura). «Por velocidad» colorea cada traza en una escala de morado a amarillo según la velocidad actual del cuerpo, de modo que un cuerpo en una órbita excéntrica cambia de color al acelerar y frenar. Es solo un efecto visual; surte efecto de inmediato.',
  'setHelp.show_velocity_vectors':
    'Dibuja una flecha de velocidad (v) sobre el cuerpo seleccionado; un clic en un cuerpo lo selecciona. La flecha tiene longitud fija y solo indica la dirección, no la rapidez. Surte efecto de inmediato.',
  'setHelp.show_acceleration_vectors':
    'Dibuja la aceleración total del cuerpo seleccionado, la que de verdad usó el integrador, como una flecha de longitud fija, con flechas discontinuas a la misma escala para las ocho fuentes más intensas como máximo. Junto a la flecha de velocidad, muestra que un cuerpo no se mueve en la dirección en que se lo atrae. Surte efecto de inmediato.',
  'setHelp.show_potential_well':
    'Sombrea el fondo con el potencial gravitatorio newtoniano de los cuerpos más masivos (hasta 24), en una escala de color logarítmica, con la G actual y el mismo suavizado que la ley de fuerza. Es solo una imagen del campo y no cambia el movimiento. Surte efecto de inmediato.',
  'setHelp.show_scale_bar':
    'Dibuja una barra de escala en unidades de distancia reales en la esquina inferior izquierda del lienzo, ajustada al zoom actual y con una nota de que el tamaño de los cuerpos no está a escala; también aparece en las capturas guardadas. Surte efecto de inmediato.',
  'setHelp.show_elapsed_time':
    'Estampa el tiempo simulado (t = …) en la parte inferior de las capturas guardadas. La lectura en vivo muestra el tiempo transcurrido sea cual sea este ajuste. Surte efecto de inmediato.',
  'setHelp.show_accretion_disk':
    'Muestra u oculta el disco de acreción de los agujeros negros a los que el escenario les da uno; no puede añadir un disco a un agujero inactivo. Con «Física realista del disco» también activada, añade pequeñas partículas trazadoras en órbita alrededor de cada agujero negro. Es un efecto visual y no añade masa; surte efecto de inmediato.',
  'setHelp.realistic_disk_physics':
    'Añade hasta 150 pequeñas partículas trazadoras en órbita alrededor de cada agujero negro, que caen en espiral y son engullidas, solo mientras «Mostrar el disco de acreción» está activado. Son decorativas: no añaden masa al agujero ni afectan a ningún otro cuerpo. Surte efecto de inmediato.',
  'setHelp.disk_doppler':
    'Aumenta el brillo de las partículas trazadoras de acreción que se acercan al observador y atenúa las que se alejan, como representación cualitativa del realce Doppler relativista. Solo afecta a esas partículas, visibles cuando «Mostrar el disco de acreción» y «Física realista del disco» están activados; el disco dibujado tiene siempre su propio realce de un lado. Efecto visual; surte efecto de inmediato.',
  'setHelp.show_bh_jets':
    'Muestra los chorros relativistas de los agujeros negros que, según el escenario, lanzan uno; no puede añadir chorros a otros agujeros. Desactivado por defecto. Es solo un efecto visual; surte efecto de inmediato.',
  'setHelp.show_object_lensing':
    'Deforma el campo de estrellas de fondo alrededor de los agujeros negros, las estrellas de neutrones y las enanas blancas, como lo haría la curvatura de la luz. Es un efecto dibujado y exagerado para que se vea (la lente real de una enana blanca sería imperceptible aquí); solo curva las estrellas del fondo, no los demás cuerpos, y no influye en el movimiento. Surte efecto de inmediato, siempre que «Calidad de la lente» no esté desactivada.',
  'setHelp.lensing_quality':
    'Tamaño e intensidad de la deformación por lente alrededor de los agujeros negros: baja, 0,7×; media, 1×; alta, 1,6×; desactivada la suprime por completo, igual que el interruptor. La lente de las estrellas de neutrones y las enanas blancas se ve igual en todos los niveles. Efecto visual; surte efecto de inmediato.',
  'setHelp.star_density':
    'Densidad del campo de estrellas de fondo respecto al valor por defecto de 10 000, que equivale a la cantidad natural para el tamaño de la ventana: 5000 da la mitad de estrellas, 0 ninguna y los valores mayores más, hasta 9000 estrellas. Es solo decorativo; el campo se redibuja al aplicar el ajuste.',
  'setHelp.show_ambient_lighting':
    'Pinta el fondo con un degradado suave, de azul muy oscuro arriba a casi negro abajo; desactivada, el fondo es oscuro y uniforme. No ilumina ni sombrea los cuerpos. Surte efecto de inmediato.',
  'setHelp.dynamic_object_properties':
    'Cambia el color de un cuerpo cuando se acerca a unos cientos de unidades de un agujero negro, para que los acercamientos destaquen. Es solo un efecto de dibujo: no cambia el movimiento. Surte efecto de inmediato.',
  'setHelp.planet_base_color':
    'Color de las trazas de los planetas (en el modo «Por tipo») y de los restos cuando un agujero negro se traga un planeta, para los planetas a los que el escenario no ha dado color. Surte efecto de inmediato.',
  'setHelp.interactive_add':
    'Activado, después de elegir un tipo con «Añadir objeto», un clic en una zona vacía del lienzo coloca un cuerpo nuevo y arrastrar fija su velocidad inicial. Desactivado, la colocación queda bloqueada; las lecciones lo desactivan para fijar una escena. Surte efecto de inmediato.',
  'setHelp.follow_mode':
    'Mantiene la cámara centrada en un cuerpo del tipo elegido, o en el centro de masas de todos los cuerpos de ese tipo cuando hay varios; «Ninguno» deja la cámara libre. Solo afecta a la cámara, no al movimiento. Surte efecto de inmediato.',
  'setHelp.show_dynamic_overlays':
    'Muestra el panel de lectura en vivo sobre el lienzo: tiempo transcurrido, zoom, velocidad, recuento de cuerpos, mediciones del cronómetro, la clave de los vectores y, si está activada, la comprobación de conservación. La descripción en texto para lectores de pantalla se mantiene en ambos casos. Surte efecto de inmediato.',
  'setHelp.show_gravitational_waves':
    'Dibuja anillos que se expanden y ondulan el campo de estrellas de fondo cuando se fusionan o colapsan agujeros negros, estrellas de neutrones, enanas blancas o estrellas. Es solo un efecto visual: no cambia el movimiento, y la espiral de acercamiento proviene de la tasa de decaimiento orbital. El nivel de calidad Baja lo desactiva; surte efecto de inmediato.',
  'setHelp.habitable_zone_optimism':
    'Elige qué definición publicada de zona habitable (Kopparapu et al., 2013) muestra el anillo de una estrella: por debajo de 1,3, la zona conservadora (del efecto invernadero desbocado al invernadero máximo); desde 1,3, la optimista (del Venus reciente al Marte temprano); los valores dentro de cada intervalo son equivalentes. El anillo solo aparece en las estrellas con la zona habitable activada en el inspector del objeto o por una lección. Surte efecto de inmediato.',
  'setHelp.integrator':
    'El método numérico con el que avanzan los cuerpos. Euler simpléctico (el valor por defecto, con el que se ajustaron todos los escenarios) y Verlet de velocidades mantienen acotado el error de energía, mucho menor en Verlet; RK4 es más preciso durante unas pocas órbitas, pero su energía deriva de forma sostenida a lo largo de miles. Surte efecto de inmediato; Verlet y RK4 siempre suman la gravedad directamente, nunca con Barnes-Hut, y los agujeros negros conservan su propio paso de primer orden.',
  'setHelp.show_conservation_diagnostics':
    'Añade una comprobación de conservación a la lectura sobre el lienzo: el integrador en uso y cuánto han cambiado la energía total y el momento angular desde la medición de referencia, junto con los motivos por los que la escena no es un sistema cerrado. Solo aparece con «Mostrar las capas de datos» activado y nunca en modo incrustado. Un cambio grande no es necesariamente un error: las fusiones, los agujeros negros estáticos y el decaimiento orbital alteran esos totales por diseño.',
  'setHelp.use_barnes_hut':
    'Calcula la gravedad con un árbol de Barnes-Hut aproximado en un proceso en segundo plano en lugar de sumar cada par, lo que es más rápido en escenas con muchos cuerpos, pero usa fuerzas de una instantánea ligeramente anterior. Solo funciona con la gravedad mutua activada y el integrador Euler simpléctico; en otro caso se usa la suma exacta. Surte efecto de inmediato.',
  'setHelp.barnes_hut_theta':
    'El ángulo de apertura del árbol de Barnes-Hut: cuanto menor, más preciso y más lento. Medido en un cúmulo de 78 cuerpos, el valor por defecto 0,4 da un error medio en la fuerza cercano al 0,5 % y 0,7 cercano al 4 %, con casos extremos mucho mayores. Solo importa mientras la gravedad aproximada está realmente en uso.',
  'setHelp.adaptive_detail':
    'Cuando los fotogramas van más lentos que el objetivo de 60 por segundo, las trazas se acortan, hasta el 60 % de la longitud fijada, y vuelven a crecer cuando la máquina se recupera; se revisa cada 5 segundos. No cambia nada más, y nunca la física. Surte efecto de inmediato.',
  'setHelp.quality_tier':
    'La opción automática pasa a Baja cuando la frecuencia medida se mantiene por debajo de unos 32 fotogramas por segundo y vuelve a Completa por encima de unos 48; Completa y Baja fijan el nivel. Baja dibuja el lienzo al 70 % de resolución, desactiva la lente gravitatoria y los anillos de ondas gravitatorias, acorta las trazas, aclara el campo de estrellas y, en la siguiente reconstrucción, limita las poblaciones generadas (los escenarios con cuerpos colocados a mano los conservan todos). El dibujo cambia de inmediato, y la elección se mantiene al cargar otro escenario.',
  'settings.level.introductory.hint':
    'Los valores por defecto: unidades físicas, tres cifras significativas y la lectura de conservación desactivada. Ningún nivel oculta nada.',
  'settings.level.majors.hint':
    'Activa la lectura de conservación y muestra cuatro cifras significativas, en unidades físicas. Ningún nivel oculta nada.',
  'settings.level.advanced.hint':
    'Activa la lectura de conservación, abre «Avanzado» (el integrador y el rendimiento) y muestra seis cifras significativas en las unidades propias de la simulación. Ningún nivel oculta nada.',
};
