// Las palabras de los instrumentos de atmósfera, en español (Prompt 200).
// Las mismas claves que en.atmospheres.js; sin revisar por un hablante nativo.
export const ES_ATMOSPHERES = {
  'atmW.row.model': 'Modelo',
  'atmW.row.assumes': 'Lo que deja fuera',
  'atmW.refused': 'Sin solución en este modelo',
  'atmW.on': 'la del planeta',
  'atmW.off': 'la mía',
  'atmW.at.surface': 'superficie',
  'atmW.at.bar': 'nivel de 1 bar',
  'atmW.control.body': 'Planeta',
  'atmW.axis.temperature': 'Temperatura (K)',
  'atmW.body.venus': 'Venus',
  'atmW.body.earth': 'Tierra',
  'atmW.body.mars': 'Marte',
  'atmW.body.jupiter': 'Júpiter',
  'atmW.body.uranus': 'Urano',
  'atmW.body.neptune': 'Neptuno',
  'atmW.m.eq': 'Temperatura de equilibrio (de emisión)',
  'atmW.m.gr': 'Equilibrio radiativo gris, cierre de Eddington',
  'atmW.m.sc': 'Altura de escala isoterma',
  'atmW.a.eq':
    'el calor interno; cualquier efecto invernadero; una superficie (es la temperatura de un cuerpo negro que irradia lo que el planeta absorbe); un albedo geométrico (aquí el albedo es el albedo de Bond)',
  'atmW.a.gr':
    'la convección; las nubes; la absorción de luz solar dentro de la atmósfera; cualquier dependencia de la opacidad con la longitud de onda (opacidad gris); el cierre de Eddington es cerca de un 4 por ciento más cálido arriba',
  'atmW.a.sc':
    'una temperatura que cambie con la altura; una gravedad que cambie con la altura; la mezcla por encima de la homopausa; el grosor de la atmósfera (no lo tiene: la presión solo sigue bajando)',
  'atmW.b.title':
    '¿Qué temperatura le da a un planeta la luz del Sol por sí sola?',
  'atmW.b.note':
    'La temperatura de equilibrio es la de un cuerpo negro que irradia lo que el planeta absorbe. No es la temperatura del suelo. Compárala con la temperatura medida en la superficie (en el nivel de 1 bar para un planeta gigante, que no tiene superficie) y lee la diferencia.',
  'atmW.b.control.own': 'Albedo',
  'atmW.b.control.albedo': 'Mi albedo de Bond',
  'atmW.b.control.redistribution': 'Calor llevado al lado nocturno',
  'atmW.b.row.teq': 'Temperatura de equilibrio',
  'atmW.b.row.measured': 'Temperatura medida, {where}',
  'atmW.b.row.difference': 'Medida menos de equilibrio',
  'atmW.b.row.reading': 'Qué dice la diferencia',
  'atmW.b.reading.terrestrial':
    'La superficie está más cálida de lo que da la luz solar por sí sola: la atmósfera retiene calor.',
  'atmW.b.reading.terrestrial.below':
    'La superficie no está más cálida de lo que da la luz solar por sí sola.',
  'atmW.b.reading.giant':
    'Un planeta gigante no tiene superficie y además emite calor propio que este modelo deja fuera: la diferencia no es un efecto invernadero.',
  'atmW.b.row.layer': 'Emisividad de una capa que daría la temperatura medida',
  'atmW.b.row.gray': 'Profundidad óptica gris que daría la temperatura medida',
  'atmW.b.axis.x': 'Distancia al Sol (UA)',
  'atmW.b.legend.model':
    'Temperatura de equilibrio a cualquier distancia, con el albedo fijado para {body}',
  'atmW.b.legend.emission':
    'Temperatura de equilibrio de cada planeta, con su albedo',
  'atmW.b.legend.measured': 'Temperatura medida de cada planeta',
  'atmW.g.title': 'Dos modelos de efecto invernadero, un planeta',
  'atmW.g.note':
    'Una capa absorbente y una atmósfera gris con una profundidad óptica son modelos distintos. Sus números libres, una emisividad y una profundidad óptica, son magnitudes distintas, y dan la misma temperatura del suelo solo para valores que coincidan. La curva azul es la solución de Eddington; la curva verde discontinua es la solución gris exacta, para ver cuánto se aleja la aproximación del cálculo completo.',
  'atmW.g.control.tau': 'Profundidad óptica (modelo gris)',
  'atmW.g.control.emissivity': 'Emisividad (una capa)',
  'atmW.g.row.te': 'Temperatura de equilibrio',
  'atmW.g.row.measured': 'Temperatura medida en la superficie',
  'atmW.g.row.gray': 'Temperatura del suelo, modelo gris',
  'atmW.g.row.layer': 'Temperatura del suelo, una capa',
  'atmW.g.row.needLayer': 'Emisividad de una capa que da la temperatura medida',
  'atmW.g.row.needGray': 'Profundidad óptica que da la temperatura medida',
  'atmW.g.row.gap': 'Eddington frente a la solución gris exacta, arriba',
  'atmW.g.axis.x': 'Profundidad óptica desde arriba',
  'atmW.g.legend.eddington': 'Eddington',
  'atmW.g.legend.exact': 'Gris exacto',
  'atmW.g.legend.ground': 'Modelo gris: el suelo',
  'atmW.g.legend.layer': 'Una capa: el suelo',
  'atmW.s.title': '¿Con qué rapidez se enrarece el aire?',
  'atmW.s.note':
    'En una atmósfera isoterma la presión baja en el mismo factor en cada altura de escala. La altura de escala no es el grosor de la atmósfera: no hay un tope, y la presión sigue bajando.',
  'atmW.s.control.own': 'Temperatura',
  'atmW.s.control.temperature': 'Mi temperatura',
  'atmW.s.axis.x': 'Altura sobre la superficie (km)',
  'atmW.s.axis.y': 'Presión como fracción de la presión en la superficie',
  'atmW.s.legend.chosen': '{body} a la temperatura fijada',
  'atmW.s.row.height': 'Altura de escala',
  'atmW.s.row.third':
    'Presión a tres alturas de escala, como parte del valor en la superficie',
  'atmW.s.row.inputs': 'Datos de entrada',
  'atmW.s.value.inputs':
    'T = {T} K, peso molecular medio {mu}, gravedad {g} m/s²',
  // <bands>
  'atmW.m.tx': 'Onaq-vagrtengrq genafzvffvba',
  'atmW.a.tx':
    'n grzcrengher gung punatrf jvgu urvtug; pybhqf naq unmrf; fpnggrevat; zber guna bar nofbeore; cerffher oebnqravat; yvzo qnexravat naq gur cynarg’f cngu npebff gur fgne; n erfbyirq fcrpgehz (guvf vf n qrcgu bire rnpu anzrq onaq); gur gnoyr vf n flagurgvp nofbeore, abg n zbyrphyr',
  'atmW.x.title': 'Jung qbrf bar onaq’f qrcgu fnl nobhg gur ngzbfcurer?',
  'atmW.x.note':
    'Guerr onaqf bs n flagurgvp nofbeore. N fgebat onaq vf qrrcre guna n jrnx bar ol nobhg bar fpnyr urvtug bs gur ngzbfcurer sbe rirel snpgbe r va nofbecgvba.',
  'atmW.x.control.t': 'Grzcrengher',
  'atmW.x.control.x': 'Nohaqnapr, ybt bs zvkvat engvb',
  'atmW.x.control.p': 'Ersrerapr cerffher, ybt bs one',
  'atmW.x.axis.x': 'Jniryratgu (µz)',
  'atmW.x.axis.y': 'Genafvg qrcgu (ccz)',
  'atmW.x.legend.depth': 'Onaq qrcgu',
  'atmW.x.legend.err': 'Qrcgu cyhf gur zbqry’f fgngrq reebe',
  'atmW.x.legend.errLow': 'Qrcgu zvahf gur zbqry’f fgngrq reebe',
  'atmW.x.row.diff': 'Fgebat onaq zvahf jrnx onaq',
  'atmW.x.row.h': 'Fpnyr urvtug',
  'atmW.x.row.err': 'Fgngrq reebe bs gur ngzbfcurevp cneg',
  'atmW.x.row.say': 'Jung vg fnlf',
  'atmW.x.say':
    'N qvssrerapr bs {d} ccz vf pbafvfgrag jvgu guvf nofbeore ng n fpnyr urvtug bs {h} xz haqre gur nffhzcgvbaf yvfgrq.',
  // </bands>
  'atmW.m.ec': 'Oynpxobql cyhf bar onaq (rpyvcfr)',
  'atmW.a.ec':
    'n qnl fvqr gung vf abg havsbez; n onaq gung rzvgf vafgrnq bs nofbeovat; ersyrpgrq yvtug va gur fnzr onaq (n qrcgu vf abg ghearq vagb n grzcrengher jurer vg pbhyq znggre); nal fgehpgher va gur ngzbfcurer orybj gur fxva',
  'atmW.e.title': 'Ubj ubg vf gur qnl fvqr?',
  'atmW.e.note':
    'Gur rpyvcfr qrcgu vf gur cynarg’f funer bs gur yvtug. Na nofbeovat onaq frrf gur pbbyre fxva, fb vgf qrcgu qvcf.',
  'atmW.e.control.tp': 'Cynarg grzcrengher',
  'atmW.e.control.ts': 'Fgne grzcrengher',
  'atmW.e.control.tau': 'Onaq bcgvpny qrcgu',
  'atmW.e.axis.x': 'Jniryratgu (µz)',
  'atmW.e.axis.y': 'Rpyvcfr qrcgu (%)',
  'atmW.e.legend.cont': 'Ab nofbeore',
  'atmW.e.legend.dip': 'Jvgu gur 4.3 µz onaq nofbeovat',
  'atmW.e.row.bt': 'Oevtugarff grzcrengher, 3.6 gb 4.5 µz',
  'atmW.m.ph': 'Ynzoreg-fcurer cunfr pheir',
  'atmW.a.ph':
    'n cynarg gung vf abg n Ynzoreg fcurer (erny cunfr shapgvbaf qvssre); gurezny cunfr inevngvba; pybhqf; cbynevfngvba; gur nyorqb sbhaq vf gur nyorqb bs n Ynzoreg fcurer',
  'atmW.p.title': 'Jung qbrf n cunfr pheir fnl nobhg nyorqb?',
  'atmW.p.note':
    'Gur qnfurq pheir vf nabgure fcurer, n Ybzzry-Frryvtre bar: gur fnzr cynarg pna or svg ol obgu, naq bayl gur funcr gryyf gurz ncneg.',
  'atmW.p.control.ag': 'Trbzrgevp nyorqb',
  'atmW.p.control.a': 'Beovg fvmr, va cynarg enqvv',
  'atmW.p.axis.x': 'Cunfr natyr (qrterrf)',
  'atmW.p.axis.y': 'Cynarg gb fgne syhk (ccz)',
  'atmW.p.legend.lambert': 'Ynzoreg fcurer',
  'atmW.p.legend.ls': 'Ybzzry-Frryvtre fcurer',
  'atmW.p.row.bond': 'Obaq nyorqb bs n Ynzoreg fcurer',
};
