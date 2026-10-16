// =============================================================================
// Kepler's third law, as one instrument
// -----------------------------------------------------------------------------
// An example capability extension for the Gravitas Extension SDK
// (sdk/README.md): an instrument family in the shape js/widgets.js loads -
// an id, a title, a note, controls, and compute / readout / draw.
//
// Executable, so it is reviewed, vendored into Gravitas and compiled with it,
// and never installed into a running copy. It imports nothing: the numbers
// are arithmetic and the drawing uses only the canvas it is handed, so no
// Gravitas module path - none of which the SDK promises - is part of it.
//
// For a planet whose mass is negligible beside its star's, in years, AU and
// solar masses: P^2 = a^3 / M.
// =============================================================================

/** The period, in years, of an orbit of semi-major axis a (AU) round mass M (solar masses). */
export const periodYears = (a, M) => Math.sqrt((a * a * a) / M);

const PERIOD = {
  id: 'launch',
  title: 'How long is a year out there?',
  note: 'A planet on an orbit of the chosen size round a star of the chosen mass. Double the orbit and the year grows by nearly three times; double the star and it shrinks by about 30 per cent. The planet itself does not matter, as long as it is small.',
  controls: [
    {
      id: 'a',
      label: 'Orbit size (semi-major axis)',
      unit: 'AU',
      min: 0.05,
      max: 40,
      step: 0.05,
      value: 1,
      decimals: 2,
    },
    {
      id: 'M',
      label: 'Star mass',
      unit: 'M☉',
      min: 0.08,
      max: 10,
      step: 0.01,
      value: 1,
      decimals: 2,
    },
  ],
  compute(v) {
    return { years: periodYears(v.a, v.M) };
  },
  readout(v) {
    const years = periodYears(v.a, v.M);
    return [
      {
        label: 'Orbital period',
        value:
          years < 2
            ? `${(years * 365.25).toFixed(1)} days`
            : `${years.toFixed(2)} years`,
      },
      {
        label: 'Compared with Earth',
        value: `${years.toFixed(3)} × Earth's year`,
      },
    ];
  },
  draw(canvas, v) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const scale = (Math.min(w, h) * 0.45) / 40;
    const r = Math.max(2, v.a * scale);
    ctx.strokeStyle = '#8aa4c8';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd27a';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 3 + Math.sqrt(v.M), 0, Math.PI * 2);
    ctx.fill();
  },
};

export const KEPLER_THIRD_LAW_WIDGETS = [PERIOD];
