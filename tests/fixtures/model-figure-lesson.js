// A fixture lesson that declares each model-drawn figure in both forms (the
// lesson's constants, and a recorded state). It is not in the catalog: no
// shipped lesson uses figures yet. tests/modelFigures.test.js checks it
// against the authoring rules, and the browser check loads it through the
// authoring preview's draft door (?author=draft-model-figures).
//
// The two recorded states were taken from the scenarios the steps name, by
// tests/modelFigureScenes.js (scenarioOrbit: 'keplers-2nd-law', the Eccentric
// Orbiter as the world builder leaves it under seed 1, G = 1 as that scenario
// runs; scenarioTransit: 'transit-lab', the planet stepped on the engine to
// 0.39 stellar radii from the star's centre on the sky and in front of it,
// the observer as the page leaves it). tests/modelFigures.test.js records them
// again and holds the fixture to them.

export const ORBIT_STATE = {
  G: 1,
  primary: { x: 0, y: 0, vx: 0, vy: 0, m: 1000 },
  body: {
    x: -15.4508497187474,
    y: 47.5528258147577,
    vx: -5.46340373825573,
    vy: -1.77516748303177,
    m: 0.000901046884837231,
  },
};

export const TRANSIT_STATE = {
  star: { x: 0, y: 0, r: 0.537129285 },
  planet: { x: 4.72687925861923, y: -0.210496127679996, r: 0.06594968230818 },
  observer: { phiDeg: 0, incDeg: 90 },
};

export const LESSON = {
  id: 'draft-model-figures',
  title: 'Figures from the model',
  subtitle: 'Pictures drawn from the same numbers as the scene',
  duration: '5-10 min',
  level: 'Introductory astronomy',
  summary:
    'A fixture: an orbit and a transit drawn from the lesson’s constants and from a recorded state.',
  thumbnail: 'images/scenarios/solar-system.webp',
  objectives: ['See an orbit’s foci and apsides', 'See a transit’s geometry'],
  steps: [
    {
      sid: 'orbit-constants',
      type: 'read',
      title: 'An orbit from its constants',
      body: 'This ellipse is drawn from a semi-major axis of 100 au and an eccentricity of 0.5.',
      figure: { from: 'orbit', params: { a: 100, e: 0.5 }, lengthUnit: 'au' },
    },
    {
      sid: 'orbit-state',
      type: 'read',
      title: 'An orbit from a recorded state',
      body: 'An orbit drawn from the positions and velocities the scene held at one moment. Its eccentricity is left out of the words.',
      figure: {
        from: 'orbit',
        params: { scenarioId: 'keplers-2nd-law', state: ORBIT_STATE },
        withhold: ['e'],
      },
    },
    {
      sid: 'transit-constants',
      type: 'read',
      title: 'A transit from its constants',
      body: 'A planet with 0.12 of the star’s radius, crossing 0.4 stellar radii from the centre.',
      figure: { from: 'transit', params: { k: 0.12, b: 0.4 } },
    },
    {
      sid: 'transit-state',
      type: 'read',
      title: 'A transit from a recorded state',
      body: 'The same kind of picture from the bodies’ positions and radii and where the observer stands.',
      figure: {
        from: 'transit',
        params: { scenarioId: 'transit-lab', state: TRANSIT_STATE },
      },
    },
    {
      sid: 'done',
      type: 'read',
      title: 'Done',
      body: 'Each picture came from numbers the model holds, and says what it leaves out.',
    },
  ],
};

export const SHADOW = {
  title: 'Figuras desde el modelo',
  subtitle: 'Dibujos hechos con los mismos números que la escena',
  duration: '5-10 min',
  level: 'Astronomía introductoria',
  summary:
    'Un caso de prueba: una órbita y un tránsito dibujados desde las constantes de la lección y desde un estado registrado.',
  objectives: [
    'Ver los focos y los ápsides de una órbita',
    'Ver la geometría de un tránsito',
  ],
  steps: [
    {
      title: 'Una órbita desde sus constantes',
      body: 'Esta elipse se dibuja con un semieje mayor de 100 ua y una excentricidad de 0,5.',
      figure: { lengthUnit: 'ua' },
    },
    {
      title: 'Una órbita desde un estado registrado',
      body: 'La misma órbita, dibujada desde las posiciones y velocidades que tenía la escena en un instante. Su excentricidad no aparece en las palabras.',
    },
    {
      title: 'Un tránsito desde sus constantes',
      body: 'Un planeta con 0,12 del radio de la estrella, que cruza a 0,4 radios estelares del centro.',
    },
    {
      title: 'Un tránsito desde un estado registrado',
      body: 'Un dibujo del mismo tipo desde las posiciones y los radios de los cuerpos y el lugar del observador.',
    },
    {
      title: 'Hecho',
      body: 'Cada dibujo salió de números que tiene el modelo, y dice lo que omite.',
    },
  ],
};
