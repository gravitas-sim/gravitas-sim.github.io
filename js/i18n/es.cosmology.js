// =============================================================================
// The cosmology instruments' words, in Spanish
// -----------------------------------------------------------------------------
// Registered by js/cosmologyWidgets.js when the family loads, so no other page
// carries them. cosW.* ids. The same keys are in en.cosmology.js.
// =============================================================================

export const ES_COSMOLOGY = {
  'cosW.row.state': 'Estado',
  'cosW.loading': 'Cargando los datos',
  'cosW.row.source': 'Qué es esto',
  'cosW.h.title': 'La ley de Hubble',
  'cosW.h.note':
    'La velocidad de recesión de una galaxia frente a su distancia, con la recta que pasa por el origen. Elige las 24 nebulosas del propio Hubble de 1929, o las supernovas del Dark Energy Survey hasta un corrimiento al rojo que tú fijas, y lee la pendiente: la constante de Hubble.',
  'cosW.h.control.sample': 'Muestra',
  'cosW.h.control.zmax': 'Supernovas hasta',
  'cosW.h.sample.0': 'Las 24 nebulosas de Hubble (1929)',
  'cosW.h.sample.1': 'Supernovas del Dark Energy Survey',
  'cosW.h.preset.1929': 'Hubble 1929',
  'cosW.h.preset.modern': 'Supernovas, z hasta 0,1',
  'cosW.h.preset.far': 'Supernovas, z hasta 0,5',
  'cosW.h.axisD': 'Distancia (Mpc)',
  'cosW.h.axisV': 'Velocidad cz (km/s)',
  'cosW.h.source.1929':
    'Auténtico: Hubble 1929, PNAS 15, 168, tabla 1 (24 nebulosas)',
  'cosW.h.source.des':
    'Auténtico: DES-SN5YR (Sanchez et al. 2024); las distancias están en la escala de la publicación, H0 = 70',
  'cosW.h.row.n': 'Objetos en el ajuste',
  'cosW.h.row.h0': 'Pendiente por el origen (constante de Hubble)',
  'cosW.h.row.h0line': 'Pendiente con ordenada libre',
  'cosW.h.row.times': 'Pendiente entre 70 km/s/Mpc',
  'cosW.h.row.how': 'Cómo leerlo',
  'cosW.h.value.how.0':
    'Las distancias de Hubble eran unas siete veces demasiado pequeñas, así que su pendiente es unas siete veces demasiado grande. Su propia tabla da una pendiente cercana a 450 o 500, no 70.',
  'cosW.h.value.how.1':
    'Las distancias de las supernovas están en una escala fijada por la publicación, así que la pendiente muestra cómo cambia el ajuste con la muestra, no mide la escala: eso lo da la escala de distancias. Las supernovas lejanas quedan bajo una recta, porque la expansión no es constante.',
  'cosW.d.title': 'El diagrama de Hubble de supernovas',
  'cosW.d.note':
    'Los módulos de distancia de 1.829 supernovas de tipo Ia frente al corrimiento al rojo. La línea cálida es un universo plano de materia y constante cosmológica con la densidad y la constante de Hubble que elijas, desplazada por el único desfase que mejor ajusta. Solo errores estadísticos.',
  'cosW.d.control.om': 'Densidad de materia, Ωm (plano)',
  'cosW.d.control.h0': 'Constante de Hubble de la curva',
  'cosW.d.control.calib': 'Error en la magnitud absoluta de las supernovas',
  'cosW.d.control.view': 'Imagen',
  'cosW.d.view.0': 'Módulo de distancia frente al corrimiento',
  'cosW.d.view.1': 'Residuo respecto de un universo vacío',
  'cosW.d.preset.default': 'Ωm 0,3',
  'cosW.d.preset.best': 'Mejor ajuste, residuos',
  'cosW.d.preset.calib': '0,1 mag de error',
  'cosW.d.axisZ': 'Corrimiento al rojo',
  'cosW.d.axisMu': 'Módulo de distancia (mag)',
  'cosW.d.axisResid': 'Módulo menos el de un universo vacío (mag)',
  'cosW.d.source':
    'Auténtico: DES-SN5YR (Sanchez et al. 2024); errores estadísticos, escala de la publicación H0 = 70',
  'cosW.d.row.n': 'Supernovas',
  'cosW.d.row.om': 'Densidad de materia del mejor ajuste, Ωm',
  'cosW.d.row.interval': 'Intervalo del 68 % para Ωm',
  'cosW.d.row.chi2':
    'Chi cuadrado del mejor ajuste, con sus grados de libertad',
  'cosW.d.row.chi2at': 'Chi cuadrado de la curva elegida',
  'cosW.d.row.delta': 'Chi cuadrado por encima del mejor ajuste',
  'cosW.d.row.h0range':
    'Rango del chi cuadrado para H0 de 50 a 90 (desfase libre)',
  'cosW.d.row.implied': 'Constante de Hubble que implica ese error de magnitud',
  'cosW.d.row.perTenth': 'Cambio de H0 por 0,1 mag',
  'cosW.d.row.how': 'Cómo leerlo',
  'cosW.d.value.how':
    'Las supernovas fijan la forma de la curva, es decir Ωm; no pueden fijar la escala. Cambiar H0 y cambiar la magnitud absoluta de las supernovas desplazan todos los módulos por igual, así que el chi cuadrado no se mueve con H0. La escala viene de la escala de distancias.',
  'cosW.w.title': 'Una cuña del cielo',
  'cosW.w.note':
    '2.911 galaxias del Sloan Digital Sky Survey en una franja de 120 grados de largo y medio grado de grosor, colocadas por ascensión recta y por distancia a partir de su corrimiento al rojo. Miras la franja desde arriba: nosotros estamos abajo y cada punto es una galaxia.',
  'cosW.w.control.zmax': 'Galaxias hasta',
  'cosW.w.control.om': 'Densidad de materia usada para las distancias',
  'cosW.w.control.view': 'Imagen',
  'cosW.w.view.0': 'La cuña',
  'cosW.w.view.1': 'Galaxias por volumen frente a la distancia',
  'cosW.w.preset.wedge': 'La cuña',
  'cosW.w.preset.density': 'Densidad frente a distancia',
  'cosW.w.axisX': 'Transversal a la línea de visión (Mpc)',
  'cosW.w.axisY': 'Distancia a lo largo de la línea de visión (Mpc)',
  'cosW.w.axisR': 'Distancia (Mpc)',
  'cosW.w.axisDensity': 'Galaxias por 10^6 Mpc cúbicos',
  'cosW.w.source':
    'Auténtico: SDSS DR18, muestra principal Legacy (r < 17,77), declinación de 0 a 0,5 grados',
  'cosW.w.row.shown': 'Galaxias mostradas',
  'cosW.w.row.rmax': 'Distancia de la más lejana, en la cosmología elegida',
  'cosW.w.row.vmr':
    'Varianza entre media de los recuentos por celda (1 si no hay agrupación)',
  'cosW.w.row.near': 'Galaxias por 10^6 Mpc cúbicos, de 100 a 125 Mpc',
  'cosW.w.row.far': 'Galaxias por 10^6 Mpc cúbicos, de 300 a 325 Mpc',
  'cosW.w.row.how': 'Cómo leerlo',
  'cosW.w.value.how':
    'Las galaxias se reúnen en paredes y vacíos. El sondeo solo ve galaxias más brillantes que un límite, así que a gran distancia solo cuenta las más brillantes y la densidad cae: ese adelgazamiento es un efecto de selección, no un vacío.',
};
