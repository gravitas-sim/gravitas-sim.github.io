// =============================================================================
// NGC 2420: SEGUE stellar parameters
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs from
// sdss-dr18-ngc2420-segue.csv, sdss-dr18-ngc2420-segue-counts.csv;
// `npm run packs:check` verifies it offline and `npm run packs:provenance`
// rebuilds it from the pinned raw product and compares byte for byte.
//
// THIS IS AN OBSERVATION. The full record - sources, checksums, every step of
// the transformation and the check it passed - is data-packs/sdss-dr18-ngc2420-segue.json.
// This module carries only what an instrument shows: PACK, to label and credit
// the data, and SERIES, the numbers, which js/tableObservation.js decodes.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'sdss-dr18-ngc2420-segue',
  version: '1.0.0',
  title: 'NGC 2420: SEGUE stellar parameters',
  object: {
    name: 'NGC 2420',
    identifiers: ['NGC 2420'],
    ra: 114.602,
    dec: 21.575,
    frame: 'ICRS, epoch J2000',
  },
  facility: {
    observatory: 'SDSS',
    instrument:
      '2.5 m Sloan Foundation Telescope, Apache Point Observatory, SDSS spectrographs (R ~ 1800)',
    pipeline: 'SEGUE Stellar Parameter Pipeline, DR18 (sppParams)',
  },
  dataType: 'catalog',
  origin: 'observed',
  credit:
    'SDSS DR18 SEGUE spectroscopy and SSPP parameters (Almeida et al. 2023; Lee et al. 2008a)',
  license: {
    status: 'public-domain',
    statement:
      'SDSS data are in the public domain. SDSS asks that work using them acknowledge the survey and cite the data release (NOTICE).',
  },
  retrieved: '2026-09-27',
  columns: [
    {
      id: 'ra',
      name: 'ra',
      unit: 'deg',
      description: 'right ascension of the fiber, ICRS',
    },
    {
      id: 'dec',
      name: 'dec',
      unit: 'deg',
      description: 'declination of the fiber, ICRS',
    },
    {
      id: 'g',
      name: 'g',
      unit: 'mag',
      description:
        "the star's SDSS g PSF magnitude (psfMag_g of its best photometric object), not corrected for extinction",
    },
    {
      id: 'r',
      name: 'r',
      unit: 'mag',
      description: 'its SDSS r PSF magnitude, the same way',
    },
    {
      id: 'rv',
      name: 'radial velocity',
      unit: 'km/s',
      description: 'heliocentric radial velocity (ELODIERVFINAL, SSPP)',
    },
    {
      id: 'rv_err',
      name: 'radial velocity error',
      unit: 'km/s',
      uncertaintyOf: 'radial velocity',
      description: 'its error (ELODIERVFINALERR)',
    },
    {
      id: 'teff',
      name: 'Teff',
      unit: 'K',
      description: 'adopted effective temperature (TEFFADOP, SSPP)',
    },
    {
      id: 'teff_err',
      name: 'Teff error',
      unit: 'K',
      uncertaintyOf: 'Teff',
      description: 'its uncertainty (TEFFADOPUNC)',
    },
    {
      id: 'logg',
      name: 'log g',
      unit: 'dex',
      description: 'adopted surface gravity, log of cm/s^2 (LOGGADOP, SSPP)',
    },
    {
      id: 'logg_err',
      name: 'log g error',
      unit: 'dex',
      uncertaintyOf: 'log g',
      description: 'its uncertainty (LOGGADOPUNC)',
    },
    {
      id: 'feh',
      name: '[Fe/H]',
      unit: 'dex',
      description: 'adopted iron abundance relative to the Sun (FEHADOP, SSPP)',
    },
    {
      id: 'feh_err',
      name: '[Fe/H] error',
      unit: 'dex',
      uncertaintyOf: '[Fe/H]',
      description: 'its uncertainty (FEHADOPUNC)',
    },
    {
      id: 'snr',
      name: 'S/N',
      unit: '',
      description: 'the spectrum’s mean signal-to-noise per pixel (SNR, SSPP)',
    },
  ],
  masks: [
    {
      column: 'seguePrimary',
      rule: 'a second spectrum of a star already in the table is dropped',
      dropped: 0,
    },
    {
      column: 'teffadop',
      rule: 'a spectrum for which SSPP adopted no parameters is dropped',
      dropped: 65,
    },
  ],
  reductions: [
    'Every spectrum within 30 arcmin of the adopted center: the region SEGUE targeted around the cluster (Lee et al. 2008b). SEGUE chose its targets by color and magnitude, and on any one plate two fibers could not be placed within 55 arcsec of each other, so this is not every star there.',
    'Positions are rounded to 0.00002 degree (0.07 arcsec), velocities to 0.01 km/s, Teff to 1 K, log g and [Fe/H] to 0.001 dex.',
    "The spectrum ids are left out; the query in the pack's manifest returns them.",
  ],
};

/** The series, encoded as SERIES.encoding says; see js/tableObservation.js. */
export const SERIES = {
  encoding: 'table-columns/1',
  n: 517,
  columns: [
    {
      type: 'int16',
      offset: 114.59684,
      step: 0.00002,
      data: 'KUv5Sp9WkUkDSuFNsjHWQMs5EUK4P+s4bD3yRmtDPDueQW01GDhWRm03mEl2RfZGlEVvO9gzCD4AEPsfPBRuGeIG1hjPGrUvXihLHlI3biTiKaQavhojIDsnfyCeGAEijB9PGBQcACJS+S7xat823kr9MuvUAjgUkw7JDOsIqgpwCZEMwxIHCUUTwg6rEmoMxxbBFDELuhJzDjAUAPsW/yQFBPcXARz99QDgAhj9LgN8BIn6yAjGAGMGwggTBYMKKvuYBkXrKe248YTzPes3877y0fgL8QL5iuun7ifzEfc37Xv5m/T31YbYjsRY0KO0SsSw1wfmgOdD2JHjxtVW5djTmuGf2ffRauUt60fUzNML2kjP7ro2xYPJf8yCxSPIeMDOvDnOj8hRu/fNDMoTxCHGncTjzZzATrORuLa0y7JCwt+qpKMyt1bIctRc2I64h67l04C+zsyg19e6/9EizPm9KNfXzri6xcLuvhzQe9ml1zzt+94D6SztvvMy63ffy9h155jjMOgK5EPdquVx4S/lceHq4VjklRKSCNMQ1Ag/+QXy3AXO+Av30faP+xv7H/cV9kvvUfdE8QLzZvH/7YTsR+5t9zPz9PY09/H+7vw+B0z/qwFm/w3vDQN8BlEGsv4aBjUDLgH7/KUAlf0H+/cVKAcfDJseTRofGHEUzRF/Fl0MrQ73CNkXRhTTCBIJBRAVGDUSlkMtINozeybPJekbBxw+HOUjaRwNIB4iciBzHAMm3SUmH3EbhSLCHBsgqhgXJMglPURFSa5FPzIYKOgp1kOzVLExEkqrOyUqHz2pUIxDIzorVxkuvCtpX4lg6EWEMoU8/kEERyU0ckvtME1H90N0NE9ZQDH1RzoaFSCMI+YvSS5vIIwl5CIrJ0IoXB7KKdkrmyapLJQcpybC5hYZ4Q/qCkMUgxQQGMwM9RinFiEH+xIeCmwWbwirChMREA5bAaYIQQeN99L6lvk3BXMONv2/CMD5Q/tJAWAHI/t+Bgr2g+2U6Wjz+vRY7dDxd8oj89DvDO/W85X0xuv57w3v7fTj9m7hPtZZ1JXZHNZx0oTl+dcw64rlzuf904vpwNRQtz3HS7dTvc7K08Xevv3Lm7RWvOTIQMpNt724UrfauHaf/sJPtTe61vr6BWLKds6210XWOt1k3Q3cb9D/2erVDdSx1ODdk9R41HwQ/vEu5kTqnfPi6Rr0OuqP9Tj1A/Hp65bl1eln7QX0rPUeAyT91Aay/Y4GmPeI/tT4nAx6/aIAmAjJ/hn4mRO3EiwTeRAeHiIYHhtpGtMWbBD+EB8TZQ+rDC8WMRLNDOUvPiRtHjgsFCmMJg40hTd9R48wByqAM0A0wyX1LdBFWDhEPaU92kYeLvFMYi8=',
    },
    {
      type: 'int16',
      offset: 21.5635,
      step: 0.00002,
      data: 'JNwO6R/iHeBW5TL72sLtuW2+x75j37zUq8WK0+fJEssJxF3pHd2k8O77ngLg+DbYaOdd9enfIO0DvrXE2rljwVK5qNAWzKXL7fTc8IfH0scx0abrDfpf3O739ekD8Yvyvf1y/Tj0+vhxo1O9/btvrFnCpbsIuzjKm+4X37PXy/Ah5jbJTOOV6R7eUvvm/Tb169q29lL5p+336S/6E/w31wzc+PdS5W/3y+kU0MLIlfSK/470Z/8F+dT74AeEBNUEIwHh8g/mW9hIzvXy/8wp04/K4tg89WjdPPnS773YnAFH6sbjJPxJvz+9b7xpwTfAbcUk+C78GNx3yIbtMNTp0aXOA/Tj5tL8ZcYP/Sn4YgOb2EL2ANvV8pvlQdTRyGvwaeqP5DXZec2PBMX/t/YP99X5+QJE6E3mG/wP/S7V1vESyLzsqix2L808CEiyQn1HkQsNLyU4CTYOIBQe4DhqJWInhy6+OVFDyjPOO/BRW1joULhHgg9cK9cXsDBJIc0pMD//MJ5EchOqDVgVywTPIP8U2QTZFo9c+E/dU+RUsk6OUOBPI1g7RqQi7B5RPB02djJrGXUSjBCvHAoKTgdYBcgPMwnEDHkQOQeiE6EViUVWK8pBgxlwIUJOyjMTCkcVrgxCQ24M+QlnKFdNJxobEfogmkksKjJBwA0LHuAYsjCUCrUJAA3fDUMDOwgzEUsgbBtBB2gDaU1GUhJRTVM1Ro8nATbxHQY+Bi2+ObEXCx4cOT0OjBJ+DjwX7Q/OEJMHWiQ9LCAKZjmrJk8vKjiVNII3lCOgFrZKZQuAGnASuz7pBFEp4yVfDdUGHCB3IFbi3r7WvdPGT9EvxPDA/8Nq5pXlX/NtBRLzvPfgB1OrtPEU4PW4ddPu3tm0SvT7q67xLOpm5Xz8evRHBt8C99JnpVrzk9bs2drIerpO5wjyK/eV7UgDzvKs/ET67f9396n76wIk7fnso84w/EX66P4B633nSf2n3wTBwt90uve+++j50gTwUNbhulvSNeQ9xXD3A7wh/dTgw/mt6KPrtwJX/j8DEAK09njvy9El2W/i575ew6EANwBV+ZXsIv2VAtjyOPEg2dDpj/zT43DTrL8P2lru1dv29Lbyxd/rAAYkcA0cQ1MlNxOfGaMbMlSoUzMORin5QKBREyRfGbg5oBX3EjsPMhI5MlkR5BoxF75OD0UjKXM0o0opINUqoy53UEYhWhWDCfsSHw0HF34XgwViE9IG6BVGRAIShApCHakQOTo9DZEI5wjJR6kuEROKQyopBUdsCcs6vD61EsATQh7qDVoJHhEHCgMIbAZ4J3U4SDLhRMkyzSykQII5bBzwEPIIVhLmLFkKBxf8EzI8FCCpPiAWfCQoRa8leUw=',
    },
    {
      type: 'int16',
      offset: 17.284,
      step: 0.001,
      data: 'Wfek/cD9m/j0+cL1+QMr/L8BL/mCAnIE9AKvAZ7/mwK1/nwCUvdt/0QEhgF9/gj2QAJQAVH6BQCn/Y8BpgLH/83/8P2NAJIAYfIkBMn/YwWG+db9uv+q/MgBX/5eBM0E9gGOA5ICaALYAwICmPou+43+qP/9/Qz6QAAd/o4A5wTf+ir9Rf/b92b/Pv6gAxED8AGD/sz/KwPH+NkEAIDLA/P/AIBkBACAcv+P+rD1AIAAgACA6AQAgACAAIAAgPQDAIAMAtf+ggRH/jz4I/ypAXT+0//n/2z3AwI2+W0AAIDZ/0f7AIAAAkr9MAX8BB4D5wMi+5b2MgAzAR7/yP44BTADdPpb+GP+oQVcAAr2oQH5AWMAo/b7/tT+NP0IAm79Qvd/+q36iwKIANz+OQSi/x4E4f2FA2ABKwPv/QMB5PaIAQD2FwHB/2IDBgTqAQn/cfekBJ343AGT/sv/wADBAccB6wGA+R78zwKq/wgAPPss/tL3eQIqAl74EgWs+Gr/R/sOBWb+dfa0/371VgIf/tL8igVfAav9fPew/7n/6vs8BFL/zwD2/aT8bvkB/30BBfjJAkIBevVbANr8mv3QAz0EBQPh/9kBAIBtAA78TAIZ+I4Bpf57AMz4dwAAgAT/AIDVAQCAAIDY+kH8HwBlAD8D9fQc9rr2VgMM/6YB2/5F/3r4HfrL/db+6v1x/F4BOfo4AJP9RwAG/2AC+/y8A8X8Kv/u9BoDxf8CAdn2MAG4/akD+gRnAwD3//XdAW372vrx/0YAMAR3/zsDMPoeAPcDFQMeAIMEbfaG+Tn/lwIT/1z+n/2i9bEEPPZq/a8FugbuB44FIgdXDfEIdw1HBsEJtQyOBUj5RPP6Bb8GpwmCCdwKPQmjCtcKZwtKBioNtAu8CO8LTgjMCIQKKAe+ClQIrwnwCdALfQrSDAgI5gY7CACAAgsAgBAGAID2CKIIAICqCjkGPQgAgACAAIAsDEgKAIDABRIJPAr+CDEJHwYkDB/32gdsCt0LPQy9BtUJawcAgBoG6QpZBf0GwQl/DKcFAICBB9cFvAuSBEMG/QraCscHhQXcCKUMRQcLCH8GbgV1C8AFqwgIB2EJ/AUFCq8G3QqMCW4MhAupDGUHYQZhBTYF1wqmDGIKAgr9C1EK9gm5BrQGtQOYDF8GxgbqDDYGLAefA1kKrQtPCXoJAAYQDF0FeAhECSEH8AyRCS4IXA3qCZ4NTQoRB4IIAIDvCACAXguzBv8IAIAeCg8LfAXfBgCAKwdVCiUIqwc8B74JPQrKCG0KmgWoDDYHUgWADAgLrQdZBqcMiAf3B+kHBgkNDZIMUgtdCLQLtwe2B/IIrATbB78KjQU9CJUFfAqPB/gMmQloBz0LQwU=',
    },
    {
      type: 'int16',
      offset: 16.737,
      step: 0.001,
      data: 'aviK/qT8q/m++fr2qwNA/P4BzfgYAgwEoQL9Afb/pAJ+/0wCh/jq//0DkAEP/wD3FgLlAIT7gQCI/ZYBvAJ+AEwAjf4SAR4B4vTRA08AXARs+ov+HwCL/ZcBF//VA1oExAFMA3YClQIzAwoCsfmq+hn/bwDp/gX7kwDr/u0A4gMJ+0n+BwD8+Mr/3f5EA9gC4gEf/ykA3gLh+QwEAICQA40AAID3AwCAxv+r++v2AIAAgACANgQAgACAAIAAgJ8DAICLAUr/tAPW/m75MP3NAfz+MABIAEz4FAJw+soAAIB1ACz8AIAnAl78nwQ+BAcDnwM1/Nb3cwCRAbz/Xf95BNACdfuw+Sn/gwStAPT2hgHOAeAA7PeE/m7/N/7UAT7+SviN+4z7LQLvAGT/5gNmAN4Dnf75ArsBIgOd/kYB0PdkAV33GwB8AO4CogPwAaL/0/b2A+D5oQE0//j/TwFIAuoB0gGw+gr9VAIyAIUAGvzy/j/5rQIdAnf4WgSt+eX/2vxsBH//jPcCAKP3VgLK/iH8aQStAYD+Z/hKAA4AyPzUA60A7f+U/pr9tfqL/54BXPnWAnEBqPamAMX9af5uA9UD+wJeABECAIDYAPr8/gE9+ZwBIP/3AJL64wAAgH7/AICnAQCAAIDT+0n9kADoAAwDFvd395/3TgOM/8gB//60/7H5KPuC/m3/mf5D/YoBWPt/AF7+sgCd/2EC+P0sA579Nf+M9tMCQQDGADL4MwG4/YMDdwRBA2j46Pf8AYX82ftwAK0AogMqACQDNftFAKcDogL5/yUE2few+vj/ugIh/1/+bv6h9k0EFveD/IAGTwUDCAUF1AXtCnIH6Qp3BQwIagrgBNT64Pk1BbUG3weyB9QKuwfBCNIKGgm3BZMKcwl4B14JAQfXBpoIIwbuCQgHmwdSCIcJewhPCsAG9gXxBgCAqQgAgEcFAIB8ByIHAIAJCC8F3wYAgACAAICMCVIIAIDkBNIHkwmLB/oHQwXFCS74lwaZCLYJjwmsBRwI9AUAgHoFMgngBO4FCwgTChUFAIBjBsEEyAmtBHYFEQkoCUgHVgZcBwwKQgbpBrwFGgVFCdEFKAcnBogHBgZUCJsFqQgJCDcKJAkZCkwGOQXNBG4Gpgj0CR0LVgi5CUsIRQjGBZcF/AQdCvcFtgVnCmsF/QVwBM0ItQmzB5kHOAWrCXoEHge4BwkGXwpkCBcH9goICAYLfQj+BfMGAIBSBwCAHAl4BV0HAIBJCPsItgQWBgCAPgaqCMcGgwY0BqgH2Qh3B9cIzAT9CSgG2wQKCv4ITwZyBScKIgbdBlwIkQeFCiMKEwkTB2MJfQZWB28HFgV8BhoJ7ATCBrsElwhVBnwKEQgcBkYJEAY=',
    },
    {
      type: 'int16',
      offset: 47.46,
      step: 0.01,
      data: '9/cjDyj73/IT+fDqEAch9ifiiP8F958PH/bL5gjtku5A+RHzK/uhBJYPuADwCDz/D/oDFATmgwXMDIX8Uw5u6OIU4Q0q7oMHJPr7EekEVfRs+JkQsgtS+UgBSQvnAIwMlws0Cy77hgUZEWYNmuac/5sMn/1mB1kCVQoLAcv1MQkmJwP/2ftpCoELggtcC2QKDwn4C1kKDAz8Cj0EQgyE5NP+hQZIC1gKIApXCicMggraCnAKuAzqChwMrQp+CyoMcQn5Ar//UOjp/wYKSvUb/BHyTeVWCq4WyAsYCsr6wQoi9MwK/wpm9koGAws756PuteFXCRMMHdKz76MK9ACPArgDFes+CzcMJv/0C9XzcvFzES4Z2/I69ET7PfoY/f/tNwDBChX9+NfhBUALdvQW834QX/pb/Gb0x/3d/ZELVgtoBxDz7QyU8HL3Jf+l7SsGXR0AFbgKTA8W7zMNBASH4T3yvgdOCjbc9gRG+iYF0/QrCnIKwAkiITgu1fpM9FMK5RE99VnvYgmy74L0WgqVEZwqnwYnCq4V7gVqAYP7e/v1CBv2JgFK9UkJugkrCoUKmAkm/HAKIwpLCkIL5AmZ9rQJ+ApmC70MffZpCrAIm/Up+3TwTQzfA+0FEBHRCo4KlQun6Kft+An79w/6Ugtl6SUE7eiOCbPwl/Cb/8btaPWCBiYKvAnoCvMJIgqjCW4LvQd6Co0KSv9/+NT2qO/b+tHtz0KT+BgFQft581sKBf3L7XTrVg2ZDGgJRwlFAUkKegNxG24Lb9/FC9724PCTBrPg0fCjDhkLqwnUCVbmiVQR9Gjaqw2u+mzj5PAD7vhBGQGFFzAlWu4G/NMhq/loDCQMIPLTC4IS4voaBsUQVgqnDMUATvJG6vb3/gtMAtL03Q2wBYINtPka9GgKhwGE/N8KM/s+BKAMqQ2aCs4KYAuzCzMIQ+54+z8KfQqhC+IM/grbCsILdgk+DBQKbAvmCyELUgt2948ATvEFFO36YQsfC/UJowxO8ED8bgc4EILWH/MfDYALgAnWCssLpAqQDE0LagsFDEAJifE0+A/lnw/Y8sEAd6sdCrMEfO+8CnsKU/Dq8qACLgzl9aLr4f2+CUcMkgwC6icL3f2AC6b/hPKhH3AFrwvKCP0r6PY8CusG9wtBGo8legNnDMEDzAkI8bL7bA+8EPvtOQkmDLjywwsGDUPvbQypCxoMQetd36gCB/JgC1oOUQrtCsXtqAmTCyAIsgnK+TkMpguHDEILUfEODAUMeAy2Ax0MOwt0BkoMmPtODUztOgy7DWILlQosC4wMi/S8ChoOMAxhDPYAbAxh9ezadgqaDDj9EQto+J8FPkBU/Zf9KQvp++T98gPnU7nvjvq2B6wUYf4=',
    },
    {
      type: 'int16',
      offset: 4.66,
      step: 0.01,
      data: 'uv7y/rj+qP6Z/qT+OP+2/i3/kP42//n+A/8D/9b+Gf8G/wD/rv7P/jD/6f7K/qf+3v77/r/+/P6r/gb/Q/8Z/z//8v4t/w3/rv7W/+z+F/+m/uT+3/7o/tr+3f4O/2H//P4x/w//Lf8U/93+t/6j/t3+H//p/rr++/78/gT/Ef+p/tv+J/+h/uj+3v7z/gv/6v7u/tz+H/+t/gz/of4L//3+xf5R/7b+zf68/pv+IP/5/tf+Tv/+/i3/ov78/hv/pf4D/8X+C//x/rH+1v4t/+b+7/7f/pb+Pf+x/vD+8P4p/7/+CP8h/5H+a/8O/wP/Jf/A/qv+0f4A/9P+4v4e/wP/w/6u/uL+N//c/pb+vP7k/gP/qv6d/hb/7P7z/vD+sf69/sv+5P4g/17/B/8C/z//yf4A/x7/Jv8b/1z/sf79/r7+wf4H/+X+8/72/u/+Zv74/qX+B/++/rz+6f4H/wD/5P6f/rD+0/7S/u3+tP7W/pr+2f5D/4n+/v6d/s/+sv4B/8P+m/7b/sj+1v62/rT+9f7J/hb/l/73/r3+yf4V/+n+lv7V/rv+n/6+/tL+qf7l/sn+k/7A/rL+uv4L/+v+0v69/sj+EP/F/uT+wP6p/sf+sv7g/p7+yf6f/rn+2v69/sv+xP6r/s/+xP7h/tX+y/6d/pT+FADI/sv+l/7D/rL+qf6s/sH+tv6y/r7+qf69/q/++/7D/uz+x/4H/7X+z/6q/un+6P6p/qL+wf6K/ur+Gv/i/qr+k/7v/q3+s/7Q/sv+BP/n/uj+yv6+/i7/xP7M/vf+n/6t/vz+Sv+7/uz+yv6x/iL/iP6A/okAzP6OAMv+3/76/xr/CADP/hj/hP+4/qf+qf7O/kr/OP/8/oEA9f4U/0gAUP8f/wkAbP8C/2X/DP9U/1D/6f6e/+7+7P5L/23/W/+q//L+0/73/hr/oP/S/8D+9/72/u/+2f5T/7j+If/o/hj/uP6C/yX/2/64/iz/mf/2/k//z/6F/5P+6/5Z/9f/cP/y/jD/2P4C/8b+cP+2/tX+GP+i/8n+F//l/sD+fv/K/sn+Q/9Y/w3/6P/7/sz//f7h/tn+6P5m/wj/9v7D/hf/Ff8e/9P+cv/2/9P/tP+R/+X+v/64/pP/U/+W/2kBHP9l/wn/FP/4/tD+l/+j/8T+s/6o/8r+zv6B/zv/g/8E///+t/5o/6n+6/78/sj+pf8G/9H+DAAS//D/I//C/t/+yP77/o7+df++/vj+lv8N/zf/rf7M/rH+y/60/+v+3f7M/hj/Kv/v/jn/sP56/9f+rv67/07/6f67/qP/1f7d/pkB6P5//5n/KP/k/mH/yP5I//f+D//p/lH/xv4I/63+Jv/x/or/Df/H/mj/Wv8=',
    },
    {
      type: 'int16',
      offset: 6289,
      step: 1,
      data: 'cABu//z5sQAy/HcB9Ptn/db9zvuf+6b7hfsu/YH9bfwP/2j8lwAh/lb7F/2e/l0ADPwq+6MAyP3O/CT9mP3i/vr+Xf8x/vP9PggB/AT+cPo1AHX/Wv5KAIP8Ef9p+637YPxi/Jn8FP0O+3z9N/q3+z/+Z/8zAIoAKP76/z7+p/pr/X4BoP/AAV/+PP8e/NL8xvwb/0/+MfzLAfL6mAFH/FP/Yvvu+94ATP72AMgBzfph/cD9FPzU/H/8rwHB/PL7tgEQ/Sz++/r4/sIBVwGD/Tb/LP5k/sUA1/yAAUn+Of5a/qQAQfxh/f36VfsS+//8IPyXALoB8Pzh/a3+4P6h+1f7IAC3AdD+Tvrm/ff/nPyc/Er+uQE0+4H+/f/u+6P/9gDmAIv/I/uR/gz/9ftT/yn8gP+Z+zT+2/w6/zn9uwFI/AkC/vk1/+T7Ufzj/CL/j/ql+/YBBvxA/9b9//1W/jn97/yBAXUAvPut/tv+RQB1/0cBFP1O/Mj99PrfAJv+swCA+yH/fQGC/hsG3fxj/436pfrX/Zv/lgDS/hv+CAAH/MT+l/sk/ygAgAEB/rD91QH4/LH9OgEe/hAAtv/M+0782vxs/pP97Pw//ngAu/yvAJj9n/4M/nwBV/59Adz+Kv1+/Ej88v5FAMMAQ/4z/lX8Mwa3AZQAsPsj/nr9Nf0Z/uMBOAFE/wP/if86AJj9CwEG/tb/sP5L/678iACZ+7H/ffyAAxb8ZP5N+woCJP0O/SL9Cfx+/BYCjQUT/acA1AD1/kL+NPt5/w/9dAB1/Qv8+vu2/OL73wGXARL/qvz1/E/8hP90AAr8PP/l+pP/qvlR/TH7x/kI+Jz5wfce+1/5IflJ+yACAgCG+lX8j/mB+V38YPka+Qf8tfiH+mH4pPhT+nv4y/ke+Nf4U/rN+hT6XPn6+Gn4nvhZ+BL6t/oE+gL5s/gp/hH7A/mw+cX5xfk5+Zv79flE+v74I/ub+C35N/vi+sL5evvd+Sb6ifuX+MMBFvoU+fL4F/i6+iP5w/ki+g77kfmm+836Rvkb+ET7/Phi+of6Gvib/cv6/fgf+aL74f6O+S34k/oa+uz61Pt/+JH9vfnu+uL4nvy7+Hn63vgX+UD4rfjW+Dn6lvqV+8EA5PgQ+BEAgPnv+Hr5PvmE+v75rgGD+Kv6m/rg97X6NPqy/2b5vPiL+fz4OfuW+F/7OPpb+aH61Pfl+Hr6Gvgi+Tb4N/nM+qD5EPpM+b4Bjfh5+o35i/hV+dT4C/u++kn7mfr7+D76YfqP+jL53vna+er4YPuZ+IX6k/vS+Mf4w/mW+jv4j/kD+in9nvkv+BT4qfi2+YP4ffqP+6v5Hf6p+Wn5RPu/+YH60fjq+Zv43Pkh+uH4ZP8=',
    },
    {
      type: 'int16',
      offset: 167,
      step: 1,
      data: 'a/9r/5z/aP96/1//k/93/33/iP+O/5z/g/9l/3P/lf9v/5D/Z/9q/9T/df9p/3P/d/+S/4z/gP9t/4z/yP9y/3z/af92/4v/r//A/3X/jP9q/23/af9p/37/dP+V/4P/df92/3z/gf+j/2//p/91/2//ef9y/2b/cf9v/4f/ff90/3f/cP9l/2n/dP9i/5D/cP94/3X/if9i/zYAe/+B/37/l/+F/3v/dP9t/2n/4v9z/3//nv+9/3X/bP9r/23/c/+B/3D/m/9k/3b/d/9u/33/cv9//3H/bv9y/3b/a/9w/2T/e/9u/6n/e/+R/3//tv9v/27/b/96/23/g/++/43/av9p/3D/qv+E/27/g/+T/2//cP+I/3H/af9+/3T/ev94/2z/jf+O/6X/kv9r/2f/bv+K/3D/h/9t/4T/Zv91/2L/ov96/2j/j/9u/3b/mv9x/3L/f/9t/3L/cP+H/2f/iP9w/2z/fP91/3L/b/9x/3z/b/+W/3j/c/9t/2r/c/+B/3X/gf+D/47/bf9n/4T/ef92/4v/bv97/3//cf+C/4P/hP9+/3j/c//G/4n/d/+J/4P/bv+E/3j/dv90/5P/df9//4j/ef+B/3z/gv90/4L/f/+B/3P/gf93/3z/j/+T/3L/iv91/4H/e/9s/3T/lv90/4T/kP9z/4T/a/+E/3n/fv9v/3T/iv91/2D/jv+D/2f/lv+I/4z/cv+D/2z/nf9q/37/hP9l/3P/hv92/4T/if+E/2j/kf9//23/d/+Q/3f/oP+D/4X/gf9j/7f/if+B/6n/c/91/5T/gf94/2L/df91/6b/aP9s/5T/q/+2/3D/gP9y/7L/qf+I/6L/5f+M/5L/i//u/5T/xf+W/5T/gv+t/7f/oP+C/5b/m/+T/8P/tf/1/5L/lf+u/2z/av+G/6P/jP+X/3//of+g/6j/ef/4/3r/oP+e/3//i/+k/7P/lP97/7f/qv+t/4n/l/+q/4v/pv9q/5j//v+b/4D/3/+a/9j/jP+Q/6D/df+J/27/vf98/5n/ov/C/2P/hv+//5b/x/+Y/6X/Yv+V/2j/g/+Y/83/iP9y/8b/kP97/63/j/+s/7b/fv+X/37/sf+9/2z/tP8NAIj/l/+G/3z/rv+1/4D/3v/R/8T/hv93/2v/dv+n/3H/XP+H/43/hP9z/2P/YP9k/3j/l/+b/7D/bf96/53/0v9w/4r/wf+n/5H/hf+U/4P/o/+L/27/pf+I/33/kP+W/6j/av9q/3r/gv+lAHD/gf9m/9n/p/+J/2X/c/8uAGn/cP/v/6j/cP+w/6L/lf+i/9P/d//l/6T/nP9s/5r/kf+m/4j/b/9r/83/dv/b/3r/kf96/47/q/+U/5L/rf8=',
    },
    {
      type: 'int16',
      offset: 2.811,
      step: 0.001,
      data: 'WwNABGoGQgQABS8ElAZBBb4DHwHwBbUGjwXhBJMFIgZFA4QEOgNSBdwExQPJBJQE8QRTBn0EPATEBS4FCAYtBFYEYASABEAD+QTTADkEgwWABBoFJQWlBDUGoASABnUGEAWpBhsFLwSCBfEEDfvuBeEDqQOcBFQEKwU0BLUD/QbABbEENQTLA/wE/gQhBq0FkgWiBMAEVQYHBGIAjgMdBfUDVAQbBqoEAAUnBLEDMAV2BR8FqAY2BpUElQMSBqUFMAQZBZYEMwYZBAwENAMqBWIERAUxBXgEgAW4A/QEWAUfBZYEwAWfBGMG/gUGBx0FEAalBEgDQwUFBfMEDwTvBRIGigTWA5gE1wWUBIYDjgSnBYQEswOkBpkE1wTwBYEDRwR2BB4EpgWKBZEEGwaKBPEF9AM0BlsDDgUyBF8FqAM7BaYEogbBBPUGUAbOBcME8QbJBtoEsABpBdYFqAW4BZYFeQZsBHoE6QY5BTUFlwW1BKkEwAVoAC8E5wXDBAoF0gSkBuEE0AMWBYYFYAU7BZUHXwaiBSUE0ANFBEcFOQTaBvEEiwVlBUMFsQQW/k4GvwQyBasFNgOqBeAE+wRBBEkGywVjBRAGKgaaBcgE5AbKA2kFjAWiBQoEDQWrBA8FDwatBb8GxQXtBGgE6wRTBY0FvgXDA90EsPpTBd4F9QUxBYYEkQS4BVIFNwXNBIEFYQRMBTcFZAWDBekEfwMaBk0EtQW2BI8GRAV7BHQEKQYpBhoEtQUxBj4E1QQBBcoEigRdBTgFGgdhBMAFjgOGBfAFIQayA6MG7QONBDkFEQbmBZr9MAUiBLwEzQS/BQwFWQa0AYUFzwWkAy4GJgI9BloGSwY0BtkEVgQMBkkEmQZiBOID1QULBXcD7AQyByUG+QS1BnkEyQbA/DAFOAb8BdYFEwUwBT8EVQTdA7wFUQZZBQAGdQV8BPIFxwWFBTcFavg5BQMHGQYrBSgGcQZWBI4FdQZhBv0FygW/BdcFEv79BNwD+gWDBZAFEQPhBoMFMwSiBtUFHAVdBs0FjgWLBBQGZQZvBnEF5QNrBBYG5ARNBTEGAAMaBT4DJwYUBYcG0QUTBGEFUQULBucFtQQFBccFTwVXBT0FugQuBIMG3gZHBk8DGwVVBIQHEAYkBgoGygUJBywHGAO2A1oGAgY1A6IGYwbhBXIF8gMzBToGZQYfBVIGbgY7BooGvwUtBvEFUwV3BWoCzwRfBjMG7waOBsgDEgVlBp8E9wOkBkMFxQbfBWEGFQZo/UYGwQUoBU0EDgbyBsEGYAZLAw8G4QUSBRUFWAZ5Bj0G8QUWBmX/zQZxBO8DKwVMBREFFgaPBMYFYwTnBagGwQVaBmUGOQMSB8EGUwYFBhoG+gM=',
    },
    {
      type: 'int16',
      offset: 0.578,
      step: 0.001,
      data: '8v3+/SL+8v0m/u391/0A/gD+J/4G/sr9Kv7Z/fr9Ff4O/g7+9P3n/Ur+If7y/er9Gf41/un9xP0I/tr9E/78/fH9Cv4E/v/9OP4d/g3+V/4D/uX9C/75/f79Bf4H/ij+Tv7j/fn95f0H/hX+Ff4U/gL+HP7H/RD+/P37/Rn+7v35/en9QP7v/fT98/0b/hT+Dv7a/ev98P3+/UECEv7o/Qj+Q/4P/gX+6v30/R3+/f35/QT+IP5B/tD91f0L/h/+7P0S/vX9UP78/fn93P0I/sT97P3v/eH9Of71/e/97P3+/eD9OP7//Qb+F/7V/RX+Uf7V/Sj+Ev4l/v/9+P0z/hP+Af4Z/uv92P4Y/gr+J/4e/hb+7f0Z/vX9Qf7v/Q3+5P3k/er9FP4J/vr9hP4E/jb+Bv4u/sH9G/7i/Rz+0f0g/gf+9P3z/fr9fv79/eX9xv3y/fL94P3Z/en9+f39/RX+Hf7c/d39A/7t/fD9Df7f/db9C/5H/gD+R/7f/QH+8f3a/e397P3v/dX9Ev7g/fr9f/7+/ej96v0B/un9/P2i/v79G/78/e/93v2AAOv99/0G/gn+B/7c/eD92f1W/gz+Jf7w/ez9Dv7s/eT9I/7a/fn96/0R/sb97P3O/df9A/4i/iL+9/3f/Qn+JP7q/Qn+y/3v/fb9L/7t/eH9Ev72/ev91/3c/d79G/7K/Qb+CP7z/dL9/v3o/fv99f01/ub9PP6P/jb+4v0k/u79D/4R/hb+U/4m/v/9gP72/d792v3z/er9Mv7Q/Qv+B/4G/ob+Fv4u/j/+1P3h/Sb+EP4X/gv+Ev7V/UX+6/1U/jf+5P3y/Uz+fv5A/kL+CgBI/sH+mv5J/g3+1/3+/ST+Af5z/tX9iv4u/iT/l/4w/sD+C/4M/uX90v0Z/mP+Ef7W/br+i/7E/hz/c/6Q/p3+Kv4//ob+GP6G/lj+nv5W/l3+rP5L/lv+4P2F/rv+Lf72/nn+2/34/Rz+Yv5a/ub9ZgFx/tP9Hv77/U/+qf/a/b/9jf6y/nn+a/44/m/+V/4v/mP+s/4S/lH+i/4S/if+5f7F/ij+P/5c/hT+Y/56/hn+CP7W/kv+df4a/vL9P/5e/ov+3v27/sr9zf35/dD91/0c/hj+Pv7H/Vf/Jf6Z/nn+UP4m/u79SP79/lL+VP5Q/+P9Pv5U/oP+K/+I/hz+C/7C/iz+Vv46/gf+A//Z/hL++P1R/qr/cv4k/nD+AP53/t79k/4d/tn+af5+/lL+GP5v/kf+Vf5MAFT+W/7C/kP+8/2E/sX+Mv4C/l/+MP5v/p7+JP70/QH/Uf5R/u/9tf4I/hT+7P1T/u79LP7D/VH+E/4s/uH9S/4O/g7+sv4G/hH/+/1o/if+d/4=',
    },
    {
      type: 'int16',
      offset: -0.784,
      step: 0.001,
      data: '5wAMAksBPAK3AecBSwDrAWUBDwGIATMDjgCYAcIAQwCKAPUALwHCAa4BFgPiAakB0wGo/ysCCAHIATgCmwJPAdoAzwBhAOUAcgD8/rMA+gFGAsUB1AERAToB8AEzAUkBcgE+AcQBDAGnAbgCIvwVAVQAfABnAVEB3QHKAFIBcQDR/64CBAADAi8BzQHRARkC6wD0AUICIgEHAkX/vgFUAvsBJwJhAeEBgQGmAZAB0AFqAe4BSgKoAfsB5wFsAecA4wGvATwCPALxALMBKwGJAOQB6wDSAQUDuAG/AVECvAGlAAECgwGPAZgCPACcABICcgDCAeAB5wBBANwBpgHaAecACQH7AXUBKgKiAcoBPAPPAfgAGQKfALP/TQC0AIMAMgKjAUcAgADVAR4C5QEcAVcBSgJMAYoAdQKjAJj/sgERAT4BA//f/3QB8AFDAQcBt/9MAcgBGgHcAUkBVQFiAEwBTQFJAj4CswFfARIB+QDmAEoC9AFl/oACUgJVAlwCmwEDAYsB+wHZAf4B9AH7Aa/+IQJOAib9iALgAGEC6QCjAesA6gP3AP0BVAJ0ALcB/wFUAvkBAwKrAboBIALYAD0BEAIFAtQB9P8ZAmIC+QFmAXcC0wHxAHUC7wEBAksC0wG1Ac0B2AHtAUoB+AHbAI4BdAPoAfoBq/vrAcQBNgKYAQcC8wEEAsQB9QH3AQoCfwHhAe4BYgDSAaMBhgEXAuwBl/45Ap0AYwGQAPgBzAHMAVYEaAJ2AQICsAOQAEICdwLwAQcCaP/eAJACDQGNATIBrAFJAb4BAgIaAggBZv7+AHz+5gBwACADmgHK/9H7PgDX/DMA9gCd/asAzvxmAeQBpADIAagBKwEbAuL/yAHOASMAzQHUAQsB0wFJ/PIADgHIASkBkf8E/O8BMQEhAbYBbQLnAAYCIQJyAQ0BtQF3Ab8BzgAhAf0BLALSAb8Bw/5RAjMCugAlAZkBpgHPAVYCmQGSAfMAxwDPARIB8v35AWgB+wH0ALcA3wG8AMj/+QHuAdABOAKAAeUBWgI1AaUBiAGaAEgBBgA3A3ABUwGAAbcAwv1bAiQB0AETAkEBrwCyATABKgLbAtcBOQH9AZUBGwLZ/17+MgL/AS8BYQGkAU0AHAJc/Yr+LgGNAB8D/QHh/8z+N/+sAIQBAAKfALEBNAC++/sAJgEXAvAA7gGFAaoBwAE3ARICkfw7AJ0CW/3AAWcB8AHbAZgAbQHNAawBHQCBApABYwF1Ad4B1QDjAbMBmAHL+/gBEQI8AvQBAQH4ATv+2gGRAXABIgIcApgBWgEvAk/+QAHAAeH7HgKCAQQBtAEmAdkA3gF3AO0AfwB8AP8ASgIQApkBuACV/ZH/GwJCAgcArgA=',
    },
    {
      type: 'int16',
      offset: 0.126,
      step: 0.001,
      data: 'j/+i/5n/iv+r/5n/1P+s/6H/qP+5/5b/0v+h/5v/rv+M/8j/j/+Y/6z/u/+V/5b/rv+n/5X/o/+i/7b/n/+f/5//mv+S/7H/GwCy/5//tv+U/4//mv+c/5f/m//T/8b/uv+s/6T/kf/S/5n/pv+w/5n/mf+R/6D/n/+c/4r/if+v/6D/nf+j/57/kf+h/7r/kP+P/6b/uv+r/0oAoP+3/6P/tv/o/6X/lv+O/6H/xv+3/7P/v/+7/73/nf+r/63/pv+Z/5n/pf+S/6n/nv+n/5v/nf+f/4f/of+c/5v/mv+f/5H/tv+l/5L/mf+E/63/3f+U/6f/lv+a/5X/p/+T/6H/lf+W/53/rv+y/57/iv+F/5f/mf+9/4r/lv+j/4//n/+1/4//xv+p/+P/kP+V/6n/if+9/4b/s/+n/6H/kv+2/6j/xP/C/8f/mP+Z/5//yv+u/6D/qv+N/5X/lf+f/6H/qf+j/5b/x/+W/4z/jv+S/6H/lf+T/5X/n/+l/5n/mP+m/67/o/+k/5P/qf+Q/6D/iv+0/7j/p/+a/5b/jf+E/5//rf+t/5f/pv98AK//ov+Z/8b/tf+k/7L/h/+T/6X/jP+g/43/u/+S/43/oP+q/5L/kf+W/73/tP+w/5n/vP+g/4T/o/+P/6j/qf+F/6r/tf+T/6j/tv+P/5f/rf+k/53/pv+X/5//i/+k/7z/uf+m/5j/t/+R/7j/uP+m/7D/uf+a/8L/rv+U/63/nv+u/5X/uf+5/7n/sP+v/6r/rv+G/6z/m/+o/5T/tf+n/43/vv+q/5v/pf+r/6n/rv+n/7//mP+u/53/jv+E/+L/vf+u/6H/kf/R/7j/tf/L/7f/uf+Q/6P/oP/D/8f/s/+7/7b/u/+8/6D/vf+s/7z/v/+6/7j/m/+y/8D/k//A/6n/xf+m/7f/tP+w/4//tP+m/7L/vv+t/6z/u/+4/7D/vP+2/57/yP/Q/73/kv+2/7j/uf+y/7L/vP+2/7n/yP+8/8D/uP/P/7X/zP+3/7D/4P+5/8b/u/+z/7P/uv+4/73/wv+Q/5n/v/+n/4v/v/+0/7H/iv+i/8D/mv+n/6P/v/+4/6//t/+1/7X/lf+4/5r/vP/E/7D/uv+x/8j/j/+t/7T/vP/U/5r/qP+6/8H/u/+m/9P/rP/1/4//o//T/7X/r/+T/+b/vP++/73/t/+4/4P/wP/A/5X/wP+u/6j/uP+8/8D/qv+d/6H///+4/5z/vv+G/6P/w//G/7L/hP/K/7T/1f+t/5z/k//D/6v/tv+7/7//g/+5/77/lv+2/77/3/+h/8n/kv+f/9X/mv/C/73/y/+e/8f/xP+4/67/mf+5/7H/hv+M/5T/uf+X/7D/vf+0/77/lf8=',
    },
    {
      type: 'int16',
      offset: 47.63,
      step: 0.01,
      data: 'EAYg/o0AFQVlBGQHRfRpAHf3UAWQ94H00/bj9zL74/az/Cz3SQbB+zn1ovgO/U0HUvit+TADKPts/ZD3qfXw+Yj5Y/3L+Yf5ygg/9Tr7d/RgBGv+ufrs/7v4kf079Xn0d/jq9U73XPbE9dX3OAQ1A5/8mvp3/bcDJvrn/dr5AfXsAs7+/Pv7Bdr7vP1u9vH2b/hi/VX7vvYzBZn0EQaN9ej68fgk9WEDAPzgAn0HGfRV+bz5fvSr9Yf1LQaH9531dAXz94/8tfQd/WcF9v8n+Dj8Cvvx+mgG5fciBN/5ZvrX+jQCS/bu95sAWvSE9Kv2rfU5AvEG0fpK+QH8Ev1p9Mr2zAJeBZ/9CPRc+osH9fgt+Hz64QaP/eH7Lv+T+Hb9SQbYAqYCp/dm94b0VvWN+xD1kv5H9oP5evVa/XD3uAZ893IG+frN+6n2h/Y694v7LAfN9awFjfgO/h78pvoI+fP33Pj2BJUBIfg0/O36PQIO/oIG/vcE+ZUGF/WDBYX85QJf9Zn+mAeX/LkHXvj9/psCN/UT+pz+dgY5+3P7NQGq9PX7ffsE/wQBHAVI/XP5sgWk99n5jwd7+7EAgv/N9jX2tPck/Cv5jPhM+3cBmfiwBdz4q/2G+hMFMvvBBjL9Nvhs+TT41vwtA4cBXPsJ+0r5DwiPB2oH1vZe/av5Tf4X/cgFJATY/0n9DP9fAen56gPS+6v///qv/YP4fwCk9YIAVf24Bwr3A/w9/ZAG9vkHAFX2JvSS9q4GUAez+AYCxAJs+/z67PVl/PT28AO4+z/2r/dQ/ET1NQcWBF78n/ea/fr+p//iB9X0hgeeAdH23PeF9CP5Zfdb8Z/0T/HI9xn0kvGI+NgKsg6g90T2MvSz9LjxmfQm87Hx5fLy91rxZPJ39GzyiPVM9mzz/fYM8mT1kPTP86HyZfOK8eH1APd/9crzAfM781X4c/S49ED1NfZy8mT4YvRH9tTzOfhI8h7zj/aA+Kfz4fHt8wTzgffM8XsM+vRk8sjx/vFi957zjPY09aD3PPL9+KT2v/On8df4m/Pz9f74A/LF+eD3s/J88lD14Par9GnxPPaf9Rj3T/hG8jf3jfTo9qDzZfeI87/2L/Ji85nx0vFp8p/2Bfjf+CX3IfP98cfxmPMx8lvztvNm98j3LfrZ8fP3u/eF8Uf4QPcp+z7z0vFS9Oz0Nvg08sX5//SK9Nv2KvKG9MP1VfGt9E7xZ/M69zj21Pbp9JoNt/L/9xf17PEA9PLy6/n39v741vZr87D1AvYV94f0YfMv9fryVvny8bb2afnu8d7yd/YL+NDxNPe39Vz0zPSK8dfx9PJW9aLyCfe39RT1Hfph9r/yufhl9Sv6ZvTE97/xOfTm9gbzU/g=',
    },
  ],
};
