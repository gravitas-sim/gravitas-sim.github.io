#!/usr/bin/env node
// =============================================================================
// A card picture for a lesson that stages its own scene
// -----------------------------------------------------------------------------
//   npm run cards           write them
//   npm run cards:check     fail if a committed card is stale or missing
//
// Most lessons borrow the capture of the scenario they open in, which is
// honest because that is what the reader will see. A lesson that stands its
// own stars on the canvas opens in no scenario at all, so there is nothing to
// borrow - and borrowing one anyway would be a card advertising a system the
// lesson never shows, which tests/investigationsData.test.js exists to stop.
//
// So the card is rendered from the lesson's own opening stage: the same star
// list, resolved through the same MIST tracks, drawn with the same body
// renderer, at the same compressed scale. It is a picture of the first screen
// because it is made out of the first screen.
//
// Deterministic by construction. The stage is arithmetic over a declaration,
// the tracks are bundled data, and the renderer is handed a fixed clock - so
// two runs on two machines produce the same bytes, which is what lets --check
// be a check rather than a coin toss.
// =============================================================================

import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { serveStatic } from './static-server.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'images/investigations');
const PORT = 8129;
const SIZE = { width: 640, height: 400 };

const check = process.argv.includes('--check');

/**
 * Lessons that stage their own opening scene, and therefore need a card.
 *
 * What decides is the *first* step. A card is a picture of the first screen,
 * so a lesson that stands up its own scene there has no scenario capture it
 * could borrow honestly. A lesson that stages a screen part way through - the
 * Goldilocks Question stages one ellipse on screen 27, because its
 * habitable-zone scenarios are deliberately circular - still opens in a
 * scenario, and drawing it a card here would make its card a picture of
 * screen 27 instead of screen 1.
 */
const staged = INVESTIGATIONS.filter(inv => inv.steps[0]?.stage);

if (!staged.length) {
  console.log('No self-staged lessons: nothing to draw.');
  process.exit(0);
}

const server = await serveStatic({ root: ROOT, port: PORT });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 2 });
await page.route('**/__card', r =>
  r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html>' })
);
await page.goto(`http://127.0.0.1:${PORT}/__card`);

let stale = 0;
for (const inv of staged) {
  const stage = inv.steps.find(s => s.stage).stage;
  const png = await page.evaluate(
    async ({ stage, size, id }) => {
      const { rowLayout, displayRadius } = await import('/js/lesson/stage.js');
      const { stateAtAge, stateAtSample, trackBounds } =
        await import('/js/stellar/tracks.js');
      const { hypotheticalAt } = await import('/js/stellar/hr.js');
      const { starColor } = await import('/js/bodyVisuals.js');

      const resolve = spec => {
        if (Number.isFinite(spec.teffK) && Number.isFinite(spec.lumSun)) {
          return hypotheticalAt(spec.teffK, spec.lumSun);
        }
        const b = trackBounds(spec.track);
        if (!b) return null;
        if (Number.isFinite(spec.at)) return stateAtSample(spec.track, spec.at);
        return stateAtAge(
          spec.track,
          Number.isFinite(spec.ageYr)
            ? spec.ageYr
            : b.startYr + (b.endYr - b.startYr) * 0.4
        );
      };

      // A quiet field, from a fixed pattern rather than a generator: a card
      // that changed its stars every run could never be checked.
      //
      // Offset by the lesson id, because two lessons can legitimately open on
      // the same source - the beginner and advanced gravitational-wave lessons
      // both start at the same 36+29 pair - and byte-identical cards side by
      // side in the catalogue read as a bug. The field is acknowledged
      // decoration and carries no claim, so varying it costs nothing and the
      // hash keeps it as reproducible as the fixed pattern was.
      function field(g, c) {
        let seed = 7;
        for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
        g.fillStyle = 'rgba(220,230,255,0.55)';
        for (let k = 0; k < 160; k++) {
          g.fillRect(
            (k * 137 + 11 + seed) % c.width,
            (k * 71 + 29 + seed * 3) % c.height,
            1.2,
            1.2
          );
        }
      }

      if (stage.hole || stage.equalMass) {
        // One dark disc, or a dark disc beside a star, with the orbits the
        // opening screen actually shows.
        return drawHoleCard(
          stage.hole || stage.equalMass,
          Boolean(stage.equalMass),
          size
        );
      }
      if (stage.starPair) {
        // Two stars on circular orbits about their balance point, drawn at the
        // arm lengths the masses imply - so the card is a picture of the
        // lesson's first screen for the same reason the others are.
        return drawStarPairCard(stage.starPair, size);
      }
      if (stage.binary) {
        // Two compact objects, at the separation the opening screen opens at.
        // No track to resolve: the card is the picture, not the model.
        const kinds = stage.binary.kinds || ['bh', 'bh'];
        return drawBinaryCard(kinds, size);
      }
      const models = (stage.stars || []).map(resolve).filter(Boolean);
      const places = rowLayout(models.length, {
        spacing: stage.spacing ?? 95,
        perRow: stage.perRow ?? 0,
      });
      const radii = models.map(m => displayRadius(m.radiusSun, stage.scale));

      function drawHoleCard(spec, paired, size) {
        const c = document.createElement('canvas');
        c.width = size.width;
        c.height = size.height;
        const g = c.getContext('2d');
        g.fillStyle = '#05070d';
        g.fillRect(0, 0, c.width, c.height);
        field(g, c);
        const cy = c.height / 2;
        const centres = paired
          ? [
              { x: c.width * 0.28, hole: true },
              { x: c.width * 0.72, hole: false },
            ]
          : [{ x: c.width / 2, hole: true }];
        for (const { x, hole } of centres) {
          const radii = paired ? [78] : [52, 78, 108, 142];
          g.strokeStyle = 'rgba(180,200,255,0.28)';
          g.lineWidth = 1;
          for (const r of radii) {
            g.beginPath();
            g.arc(x, cy, r, 0, Math.PI * 2);
            g.stroke();
            g.fillStyle = 'rgba(220,232,255,0.9)';
            g.beginPath();
            g.arc(x + r, cy, 2.6, 0, Math.PI * 2);
            g.fill();
          }
          const R = hole ? 20 : 15;
          const glow = g.createRadialGradient(x, cy, R, x, cy, R * 3);
          glow.addColorStop(
            0,
            hole ? 'rgba(150,190,255,0.26)' : 'rgba(255,215,130,0.42)'
          );
          glow.addColorStop(1, 'rgba(150,190,255,0)');
          g.fillStyle = glow;
          g.beginPath();
          g.arc(x, cy, R * 3, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = hole ? '#000000' : '#ffd97d';
          g.beginPath();
          g.arc(x, cy, R, 0, Math.PI * 2);
          g.fill();
        }
        return c.toDataURL('image/webp', 0.9);
      }

      function drawStarPairCard(spec, size) {
        const c = document.createElement('canvas');
        c.width = size.width;
        c.height = size.height;
        const g = c.getContext('2d');
        g.fillStyle = '#05070d';
        g.fillRect(0, 0, c.width, c.height);
        field(g, c);
        const m1 = spec.m1 ?? 2;
        const m2 = spec.m2 ?? 2;
        const total = m1 + m2;
        const cx = c.width / 2;
        const cy = c.height / 2;
        const span = c.width * 0.3;
        const r1 = span * (m2 / total);
        const r2 = span * (m1 / total);
        // The two orbits, then the balance point, then the stars: the same
        // three things the opening screen shows, in the same order.
        g.strokeStyle = 'rgba(180,200,255,0.30)';
        g.lineWidth = 1;
        for (const r of [r1, r2]) {
          g.beginPath();
          g.arc(cx, cy, r, 0, Math.PI * 2);
          g.stroke();
        }
        g.strokeStyle = 'rgba(255,235,150,0.85)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(cx - 7, cy);
        g.lineTo(cx + 7, cy);
        g.moveTo(cx, cy - 7);
        g.lineTo(cx, cy + 7);
        g.stroke();
        [
          { x: cx - r1, colour: '#ffd97d' },
          { x: cx + r2, colour: '#8fd4ff' },
        ].forEach(({ x, colour }) => {
          const glow = g.createRadialGradient(x, cy, 0, x, cy, 30);
          glow.addColorStop(0, `${colour}88`);
          glow.addColorStop(1, `${colour}00`);
          g.fillStyle = glow;
          g.beginPath();
          g.arc(x, cy, 30, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = colour;
          g.beginPath();
          g.arc(x, cy, 11, 0, Math.PI * 2);
          g.fill();
        });
        return c.toDataURL('image/webp', 0.9);
      }

      function drawBinaryCard(kinds, size) {
        const c = document.createElement('canvas');
        c.width = size.width;
        c.height = size.height;
        const g = c.getContext('2d');
        g.fillStyle = '#05070d';
        g.fillRect(0, 0, c.width, c.height);
        field(g, c);
        const cx = c.width / 2;
        const cy = c.height / 2;
        kinds.forEach((kind, i) => {
          const x = cx + (i === 0 ? -46 : 52);
          const r = kind === 'ns' ? 9 : 17;
          const glow = g.createRadialGradient(x, cy, r, x, cy, r * 3);
          glow.addColorStop(0, 'rgba(150,190,255,0.28)');
          glow.addColorStop(1, 'rgba(150,190,255,0)');
          g.fillStyle = glow;
          g.beginPath();
          g.arc(x, cy, r * 3, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = kind === 'ns' ? '#dfe9ff' : '#000000';
          g.beginPath();
          g.arc(x, cy, r, 0, Math.PI * 2);
          g.fill();
        });
        return c.toDataURL('image/webp', 0.9);
      }

      const c = document.createElement('canvas');
      c.width = size.width;
      c.height = size.height;
      const g = c.getContext('2d');
      g.fillStyle = '#05070d';
      g.fillRect(0, 0, c.width, c.height);
      field(g, c);

      const spanX = Math.max(
        ...places.map((p, i) => Math.abs(p.x) + radii[i]),
        1
      );
      const zoom = Math.min(3, (c.width * 0.38) / spanX);
      for (let i = 0; i < models.length; i++) {
        const rgb = starColor(models[i].teffK);
        const x = c.width / 2 + places[i].x * zoom;
        const y = c.height / 2;
        const r = Math.max(2.5, radii[i] * zoom);
        const glow = g.createRadialGradient(x, y, 0, x, y, r * 2.6);
        glow.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.5)`);
        glow.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
        g.fillStyle = glow;
        g.beginPath();
        g.arc(x, y, r * 2.6, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
      return c.toDataURL('image/webp', 0.9);
    },
    { stage, size: SIZE, id: inv.id }
  );

  const bytes = Buffer.from(png.split(',')[1], 'base64');
  const file = resolve(OUT, `${inv.id}.webp`);
  const have = existsSync(file) ? await readFile(file) : null;
  if (have && have.equals(bytes)) {
    console.log(`  ok   ${inv.id}.webp`);
    continue;
  }
  stale++;
  if (check) {
    console.error(
      `  FAIL ${inv.id}.webp is ${have ? 'out of date' : 'missing'}`
    );
    continue;
  }
  await mkdir(OUT, { recursive: true });
  await writeFile(file, bytes);
  console.log(
    `  wrote ${inv.id}.webp (${(bytes.length / 1024).toFixed(1)} KB)`
  );
}

await browser.close();
server.close?.();

if (check && stale) {
  console.error('\nRun `npm run cards`.');
  process.exit(1);
}
console.log(`\n${staged.length} self-staged lesson(s).`);
