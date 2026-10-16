# Kepler-13A, observed by TESS

A data-pack extension: 27 days of Kepler-13's light, TESS sector 14, from the
SPOC light curve MAST serves. It is one of two, made from the same file:

- **`kepler-13-tess-s14-sap`:** the light the aperture collected (SAP).
- **`kepler-13-tess-s14-pdcsap`:** the same after SPOC's corrections
  (PDCSAP).

A data-pack extension provides one pack. So there are two directories, whose
`build.mjs` differ only in `FLUX`.

Kepler-13A has a hot Jupiter on a 1.76-day orbit, and a companion star, B,
1.2 arcseconds away and 0.25 magnitudes fainter in the TESS band. TESS's
21-arcsecond pixels cannot separate them, so the aperture holds both. SPOC's
header says only 0.549 of that light is A's (CROWDSAP).

That is why the collected transit is a little over half as deep as the
corrected one: 0.00475 against 0.00812 in 20-minute bins. It is also why the
published radius of Kepler-13Ab has ranged from 1.4 to 2.3 Jupiter radii (NASA
Exoplanet Archive). The answer depends on which star the planet orbits, and
on how much of the light is that star's.

The Exoplanet Observatory's *Diluted light* investigation is built on it.

**The checks:**
- **The corrected pack** folds on the published period to the published
  radius ratio's depth: Esteves et al. 2015, (Rp/R*)² = 0.00763, within
  0.0015. Limb and gravity darkening make the observed transit deeper.
- **The collected pack's depth** is the corrected one times CROWDSAP, within
  0.001.

Built with the SDK's public API only (SDK 1.3.0, which reads SAP and records
the crowding):

```bash
GRAVITAS_PACKS_CACHE=<dir holding the FITS file> node extensions/kepler-13-tess-s14-sap/build.mjs
npm run sdk -- validate extensions/kepler-13-tess-s14-sap
npm run sdk -- test extensions/kepler-13-tess-s14-sap
npm run sdk -- pack extensions/kepler-13-tess-s14-sap
```
