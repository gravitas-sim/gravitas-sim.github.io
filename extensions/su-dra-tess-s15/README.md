# SU Draconis, observed by TESS

A data-pack extension: 26 days of an RR Lyrae star's light, TESS sector 15,
from the SPOC light curve MAST serves.

SU Dra is a fundamental-mode RR Lyrae star with no Blazhko modulation. Its
light nearly doubles and fades again every 0.66 days. The pack is checked
against Monson et al. (2017, AJ 153, 96, Table 1): a 20-harmonic Fourier
series fits best at 0.660408 d, where they give 0.66042001 d.

Built with the SDK's public API only:

```bash
GRAVITAS_PACKS_CACHE=<dir holding the FITS file> node extensions/su-dra-tess-s15/build.mjs
npm run sdk -- validate extensions/su-dra-tess-s15
npm run sdk -- test extensions/su-dra-tess-s15
npm run sdk -- pack extensions/su-dra-tess-s15
```

Why not RR Lyrae itself: the TESS Input Catalog lists it at Tmag 16.6 against
its V of 7.2. SPOC sized a 4-pixel aperture for a faint star and took 92% of
its light for contamination, so its PDCSAP flux goes negative. `build.mjs`
has the details.
