// =============================================================================
// Las palabras de la herramienta de superposición de catálogos, parpadeo y
// comparación, en español
// -----------------------------------------------------------------------------
// Las registra js/observatory/imageOverlay.js cuando la herramienta se abre por
// primera vez (con el traductor del Observatorio), de modo que ninguna otra
// página las lleva. Identificadores obs.ov.*; el título del panel está en
// es.observatory.js (está en la página antes de que cargue la herramienta). Sin
// revisar por una persona hispanohablante fluida.
// =============================================================================

export const ES_IMAGEOVERLAY = {
  'obs.ov.help':
    'Dos cosas que puedes hacer con una imagen cuando ya tiene coordenadas celestes: dibujar encima el catálogo y poner encima una segunda imagen para encontrar lo que se mueve o cambia. Todo se queda en tu navegador.',
  'obs.ov.overlayTitle': 'Superposición del catálogo',
  'obs.ov.overlayHelp':
    'Dibuja las estrellas brillantes y los planetas sobre la imagen, a la hora en que se tomó. Se colocan con las coordenadas celestes de la imagen: la calibración que resolviste en la herramienta de coordenadas celestes o, si no hay, la cabecera de la propia imagen. Una entrada del catálogo que cae fuera de la imagen no se dibuja ni se lista.',
  'obs.ov.stars': 'Estrellas brillantes',
  'obs.ov.planets': 'Planetas',
  'obs.ov.names': 'Nombres sobre la imagen',
  'obs.ov.magnitude': 'Estrella más débil (magnitud V)',
  'obs.ov.show': 'Mostrar los catálogos',
  'obs.ov.picture':
    'La imagen con las estrellas del catálogo rodeadas en amarillo y los planetas marcados en azul, cada planeta dentro de un círculo discontinuo que es la cota de su posición. La tabla de abajo los lista todos.',
  'obs.ov.where.calibration':
    'Coordenadas celestes: la calibración que resolviste en la herramienta de coordenadas celestes.',
  'obs.ov.where.header':
    'Coordenadas celestes: la cabecera de la propia imagen, tal como se lee (no se resuelven aquí).',
  'obs.ov.epoch.moved':
    'Época: el catálogo de estrellas da posiciones para J2000,0. Cada estrella se mueve hasta la hora de la imagen ({time}) con su movimiento propio, en línea recta; no se aplican la velocidad radial, el paralaje ni la aberración.',
  'obs.ov.epoch.notMoved':
    'Época: las estrellas se dibujan donde el catálogo las tiene en J2000,0, sin mover por su movimiento propio, porque {why}.',
  'obs.ov.why.no-time': 'la imagen no tiene hora',
  'obs.ov.why.time-scale':
    'su escala de tiempo ({scale}) no se puede pasar aquí a Tiempo Terrestre',
  'obs.ov.why.time': 'no se puede leer su hora',
  'obs.ov.planets.bound':
    'Planetas: posiciones geométricas a partir de elementos orbitales, buenas hasta {deg} grado. El círculo discontinuo muestra esa cota: sirve para encontrar el vecindario, no para medir; en la mayoría de las imágenes es mayor que la imagen.',
  'obs.ov.planets.no': 'Los planetas no se dibujan: {why}.',
  'obs.ov.counts':
    'Hay {stars} estrellas y {planets} planetas en este fotograma.',
  'obs.ov.leftOut':
    'Quedan fuera {n} estrellas más débiles por el límite de {max} entradas.',
  'obs.ov.reach':
    '{name} puede estar en el campo: su posición prevista está {pixels} píxeles fuera del fotograma, y la cota de su posición llega hasta él.',
  'obs.ov.noSigma':
    'La incertidumbre de una posición se muestra solo para una calibración resuelta aquí; la de una cabecera no se conoce.',
  'obs.ov.no.display-only':
    'Esta imagen es solo para mostrar: se puede marcar, pero una posición en ella no es una posición en el cielo, porque sus píxeles se han estirado, recodificado o nunca tuvieron sus unidades y procedencia anotadas.',
  'obs.ov.no.geometry-unrecorded':
    'La imagen cambió con un paso que mueve píxeles sin que sus coordenadas celestes lo sigan, así que sus posiciones ya no coinciden con el cielo.',
  'obs.ov.no.no-wcs':
    'Esta imagen no tiene coordenadas celestes. Resuélvelas en la herramienta de coordenadas celestes con estrellas de referencia, o abre una imagen cuya cabecera las tenga.',
  'obs.ov.no.axes':
    'La cabecera de la imagen no tiene ascensión recta y declinación como sus dos ejes ({names}).',
  'obs.ov.no.distortion':
    'La cabecera de la imagen lleva una distorsión {name}, que esta herramienta no aplica.',
  'obs.ov.no.projection':
    'La cabecera de la imagen usa la proyección {name}; aquí solo se lee TAN.',
  'obs.ov.no.incomplete':
    'La cabecera de la imagen no da un sistema de coordenadas celestes completo.',
  'obs.ov.no.singular':
    'La cabecera de la imagen da un sistema de coordenadas celestes degenerado.',
  'obs.ov.no.stars-file':
    'No se pudo cargar el archivo de estrellas brillantes. Se pide a este sitio la primera vez que se dibujan las estrellas, así que hace falta la red una vez.',
  'obs.ov.table': 'Entradas del catálogo en este fotograma (solo lectura)',
  'obs.ov.tableNote':
    'Estas filas son del catálogo, no tus marcas: no se guardan con tus marcas y no se pueden editar.',
  'obs.ov.col.name': 'Nombre',
  'obs.ov.col.kind': 'Tipo',
  'obs.ov.col.x': 'x',
  'obs.ov.col.y': 'y',
  'obs.ov.col.ra': 'Ascensión recta',
  'obs.ov.col.dec': 'Declinación',
  'obs.ov.col.mag': 'Magnitud o cota de la posición',
  'obs.ov.col.sigma': 'Incertidumbre de la posición (píxeles)',
  'obs.ov.kind.star': 'estrella',
  'obs.ov.kind.planet': 'planeta',
  'obs.ov.bound': '± {deg} grado',
  'obs.ov.planet.mercury': 'Mercurio',
  'obs.ov.planet.venus': 'Venus',
  'obs.ov.planet.mars': 'Marte',
  'obs.ov.planet.jupiter': 'Júpiter',
  'obs.ov.planet.saturn': 'Saturno',
  'obs.ov.said.drawn': 'Se dibujaron {stars} estrellas y {planets} planetas.',
  'obs.ov.compareTitle': 'Parpadear y comparar dos fotogramas',
  'obs.ov.compareHelp':
    'Pon una segunda imagen sobre esta para encontrar lo que se mueve o cambia: alterna entre ellas, ponlas lado a lado con cursores enlazados o, si son dos fotogramas calibrados, réstalas. El parpadeo y el lado a lado sirven para dos imágenes cualesquiera. La diferencia es una imagen para mirar, no una medida.',
  'obs.ov.take': 'Usar la próxima imagen que abra como segundo fotograma',
  'obs.ov.cancelTake': 'Cancelar',
  'obs.ov.clear': 'Quitar el segundo fotograma',
  'obs.ov.waiting':
    'Esperando: elige la segunda imagen con la caja de archivos de arriba, o abre uno de los ejemplos. Se lee en tu navegador.',
  'obs.ov.cancelled': 'Cancelado: la próxima imagen se abre como siempre.',
  'obs.ov.taken': 'El segundo fotograma es {title}.',
  'obs.ov.cleared': 'Se quitó el segundo fotograma.',
  'obs.ov.second': 'Segundo fotograma: {title} ({width} por {height} píxeles).',
  'obs.ov.secondNone': 'Todavía no hay segundo fotograma.',
  'obs.ov.tie': 'Cómo se alinean los fotogramas',
  'obs.ov.tie.sky': 'Coordenadas celestes',
  'obs.ov.tie.pairs': 'Estrellas emparejadas',
  'obs.ov.tie.identity': 'Mismos píxeles',
  'obs.ov.tied.sky':
    'Unidos por el cielo: los dos fotogramas tienen coordenadas celestes.',
  'obs.ov.tied.identity':
    'Unidos píxel a píxel: los fotogramas tienen el mismo tamaño y nada se mueve.',
  'obs.ov.tied.pairs':
    'Unidos con {n} estrellas emparejadas: giro {theta}° ± {sigmaTheta}°, desplazamiento {dx}, {dy} píxeles, dispersión {rms} píxel; {verdict}.',
  'obs.ov.verdict.consistent':
    'las estrellas concuerdan con un solo giro y desplazamiento',
  'obs.ov.verdict.inconsistent':
    'las estrellas NO concuerdan con un solo giro y desplazamiento: comprueba que cada pareja sea la misma estrella',
  'obs.ov.verdict.exact':
    'tres estrellas fijan el giro y el desplazamiento exactamente, así que nada comprueba la correspondencia',
  'obs.ov.noTie.sky-first':
    'Los fotogramas no se unen por el cielo. El primer fotograma: {why}',
  'obs.ov.noTie.sky-second':
    'Los fotogramas no se unen por el cielo. El segundo fotograma: {why}',
  'obs.ov.noTie.shape':
    'Los fotogramas son de {first} y {second} píxeles, así que los mismos píxeles no son los mismos lugares. Usa estrellas emparejadas o coordenadas celestes.',
  'obs.ov.noTie.too-few':
    '{n} estrellas emparejadas: hacen falta al menos {min} para alinear los fotogramas y decir con qué precisión.',
  'obs.ov.noTie.degenerate':
    'Las estrellas están a menos de {rms} píxel unas de otras en el primer fotograma, así que no pueden fijar un giro. Elige estrellas repartidas por el fotograma.',
  'obs.ov.noTie.malformed':
    'La pareja {id} no tiene dos posiciones y números positivos.',
  'obs.ov.pairCol.0': 'x del primer fotograma',
  'obs.ov.pairCol.1': 'y del primer fotograma',
  'obs.ov.pairCol.2': 'x del segundo fotograma',
  'obs.ov.pairCol.3': 'y del segundo fotograma',
  'obs.ov.addPair': 'Añadir una pareja',
  'obs.ov.pairFromCursors': 'Añadir una pareja desde los cursores',
  'obs.ov.removePair': 'Quitar',
  'obs.ov.view': 'Vista',
  'obs.ov.view.blink': 'Parpadeo',
  'obs.ov.view.side': 'Lado a lado',
  'obs.ov.view.difference': 'Diferencia',
  'obs.ov.rate': 'Ritmo del parpadeo',
  'obs.ov.rate.0.5': 'Cada 2 segundos',
  'obs.ov.rate.1': 'Una vez por segundo',
  'obs.ov.rate.2': 'Dos veces por segundo',
  'obs.ov.rate.4': 'Cuatro veces por segundo',
  'obs.ov.blinkStart': 'Empezar a parpadear',
  'obs.ov.blinkStop': 'Parar el parpadeo',
  'obs.ov.flip': 'Mostrar el otro fotograma',
  'obs.ov.reduced':
    'Tu dispositivo pide menos movimiento, así que los fotogramas no parpadean solos: usa el botón para mostrar el otro fotograma.',
  'obs.ov.showing.first': 'Se muestra el primer fotograma.',
  'obs.ov.showing.second':
    'Se muestra el segundo fotograma, llevado a los píxeles del primero.',
  'obs.ov.showing.difference':
    'Se muestra el segundo fotograma menos el primero.',
  'obs.ov.sideNote':
    'El primer fotograma y el segundo en sus propios píxeles. Cada cursor se marca en los dos; cuando los fotogramas están unidos y los cursores enlazados, mover uno mueve el otro.',
  'obs.ov.said.blinking': 'Parpadeando a {rate} por segundo.',
  'obs.ov.said.stopped': 'El parpadeo se detuvo.',
  'obs.ov.diff.legend':
    'Segundo menos primero, en {unit}: el gris es sin cambio. Una imagen para el ojo: el segundo fotograma se remuestrea por interpolación bilineal, así que esto no es una medida y no se guarda.',
  'obs.ov.noDiff.no-tie':
    'Todavía sin diferencia: los fotogramas no están unidos. Únelos antes arriba (por el cielo, con estrellas emparejadas o píxel a píxel).',
  'obs.ov.noDiff.display-only':
    'Sin diferencia: el {which} fotograma es solo para mostrar, y una diferencia necesita valores de píxel que midan luz.',
  'obs.ov.noDiff.incomplete-contract':
    'Sin diferencia: el contrato de píxeles del {which} fotograma no está completo (le falta {missing}).',
  'obs.ov.noDiff.contract-none':
    'Sin diferencia: el {which} fotograma no declara un contrato de píxeles, así que no se sabe que sus píxeles midan luz.',
  'obs.ov.noDiff.contract-invalid':
    'Sin diferencia: el contrato de píxeles del {which} fotograma no es una descripción válida.',
  'obs.ov.noDiff.contract-lossy-history':
    'Sin diferencia: los píxeles del {which} fotograma pasaron por un paso que no conserva la luz medida (un estiramiento, una codificación con pérdida o un remuestreo que no conserva el flujo).',
  'obs.ov.noDiff.not-flux':
    'Sin diferencia: los valores de píxel del {which} fotograma no miden luz.',
  'obs.ov.noDiff.calibration-state':
    'Sin diferencia: los fotogramas están en etapas distintas de calibración ({first} y {second}), así que su diferencia sería la calibración y no el cielo.',
  'obs.ov.noDiff.unit':
    'Sin diferencia: los píxeles de los fotogramas están en unidades distintas ({first} y {second}).',
  'obs.ov.noDiff.exposure':
    'Sin diferencia: los fotogramas están en una unidad de cuentas con exposiciones distintas ({first} s y {second} s), así que su diferencia sería la exposición y no el cielo.',
  'obs.ov.noDiff.shape':
    'Sin diferencia: los fotogramas son de {first} y {second} píxeles, así que los mismos píxeles no son los mismos lugares.',
  'obs.ov.noDiff.too-large':
    'Sin diferencia: guarda cuatro imágenes del fotograma a la vez, y eso es más de lo que una página puede conservar de imágenes decodificadas.',
  'obs.ov.noDiff.registration':
    'Sin diferencia: las estrellas emparejadas no concuerdan con un solo giro y desplazamiento, así que no se sabe que los fotogramas estén alineados.',
  'obs.ov.which.first': 'primer',
  'obs.ov.which.second': 'segundo',
  'obs.ov.state.raw': 'en bruto',
  'obs.ov.state.bias-subtracted': 'con el bias restado',
  'obs.ov.state.dark-subtracted': 'con el oscuro restado',
  'obs.ov.state.flat-fielded': 'con campo plano',
  'obs.ov.state.calibrated': 'calibrado',
  'obs.ov.cursorFirst': 'Cursor: primer fotograma ({x}, {y}).',
  'obs.ov.cursorSecond': 'Segundo fotograma ({x}, {y}).',
  'obs.ov.cursorSky': 'Cielo {ra} {dec}.',
  'obs.ov.picFirst':
    'El primer fotograma con su cursor. Las flechas mueven el cursor un píxel, un cuarto de píxel con Alt y cuatro con Mayús; un clic lo pone ahí.',
  'obs.ov.picSecond':
    'El segundo fotograma con su cursor. Las flechas mueven el cursor un píxel, un cuarto de píxel con Alt y cuatro con Mayús; un clic lo pone ahí.',
  'obs.ov.left': 'Cursor a la izquierda',
  'obs.ov.right': 'Cursor a la derecha',
  'obs.ov.up': 'Cursor arriba',
  'obs.ov.down': 'Cursor abajo',
  'obs.ov.step': 'Paso (píxeles)',
  'obs.ov.step.0.25': '0,25',
  'obs.ov.step.1': '1',
  'obs.ov.step.4': '4',
  'obs.ov.link': 'Enlazar los cursores',
};
