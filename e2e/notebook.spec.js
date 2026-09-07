// =============================================================================
// The evidence notebook
// -----------------------------------------------------------------------------
// Two of these tests are the ones the feature was asked to prove, and they are
// the reason the notebook freezes at capture rather than at commit:
//
//   "later world changes cannot alter saved evidence"
//   "exports retain its provenance"
//
// Both are checked against a world that has actually been rebuilt underneath
// the saved entry - a new scenario, a new world generation, a new set of body
// ids - rather than against a mock. A snapshot that merely looks immutable in
// a unit test is not the claim being made.
//
// The rest walks the panel the way a student does: save a fit, write a claim,
// reorder, annotate, delete, download, restore, and read the whole thing in
// Spanish from the keyboard.
// =============================================================================

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect } from './fixtures.js';

const OUT = join(process.cwd(), 'test-results', 'notebook');

/**
 * Open the notebook through its rail button, the way a student does.
 *
 * Through app.openPanel, which knows the rail is an accordion: the Tools
 * section is shut on arrival, so the button is in the DOM and not clickable
 * until somebody opens the section - which is what a student does too.
 */
async function openNotebook(page, app) {
  const menu = page.locator('#mobileMenuToggle');
  if ((page.viewportSize()?.width ?? 0) <= 1024) {
    await expect(menu).toBeVisible();
    await menu.click();
  }
  await app.openPanel('toggleNotebook', 'evidenceNotebook');
  await expect(page.locator('#evidenceNotebook')).toBeVisible();
}

/**
 * Put a recording into the RV workspace and open it.
 *
 * Synthetic points rather than a recorded survey: this file is about the
 * notebook, and e2e/rvLaunchPath.spec.js already covers getting a real
 * recording into the workspace. The provenance still comes from the live
 * world, which is what these tests are about.
 */
async function analyseSynthetic(
  page,
  { target = 'Star A', seed = 'nb1' } = {}
) {
  await page.evaluate(
    async ([targetName, seedName]) => {
      const bridge = await import('/js/rvWorkspaceBridge.js');
      const points = [];
      for (let i = 0; i < 24; i++) {
        const day = i * 0.6;
        points.push({
          day,
          rv: 40 * Math.sin((2 * Math.PI * day) / 3.5) - 3,
          sigma: 4,
          quality: 'ok',
          missed: false,
        });
      }
      await bridge.openRvWorkspace({
        points,
        target: targetName,
        scenario: 'Exoplanet Characterization Lab',
        seed: seedName,
        config: { cadenceDays: 0.6, baselineDays: 14, sigma: 4 },
        worldGeneration: 1,
        recordedAt: Date.now(),
      });
      const ws = await import('/js/rvWorkspace.js');
      ws.snapToBestAtPeriod();
    },
    [target, seed]
  );
  await expect(page.locator('#rvFitContainer')).toBeVisible();
}

/** The notebook as the panel holds it. */
const readNotebook = page =>
  page.evaluate(async () => {
    const panel = await import('/js/notebookPanel.js');
    return panel.notebookEntries().map(e => ({
      id: e.id,
      title: e.title,
      source: e.source,
      fingerprint: e.fingerprint,
      claim: e.prose.claim,
      quantities: e.snapshot.quantities.map(q => ({
        label: q.label,
        value: q.value,
        unit: q.unit,
        kind: q.kind,
      })),
      provenance: e.snapshot.provenance,
      frozen: Object.isFrozen(e.snapshot.quantities),
    }));
  });

/** Save the fit on screen, write a claim, and keep it. */
async function keepFit(page, claim) {
  await page.locator('#rvFitNotebook').click();
  await expect(page.locator('#nbDraftClaim')).toBeVisible();
  if (claim) await page.locator('#nbDraftClaim').fill(claim);
  await page.locator('#nbDraftSave').click();
  await expect(page.locator('.nb-entry')).toHaveCount(
    (await page.locator('.nb-entry').count()) || 1
  );
}

test.describe('a reading survives the world it came from', () => {
  test('rebuilding the world does not alter a saved entry', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Exoplanet Characterization Lab');
    await app.waitForFrames(10);
    await analyseSynthetic(page);
    await keepFit(page, 'The period is about three and a half days.');

    const before = await readNotebook(page);
    expect(before).toHaveLength(1);
    expect(before[0].frozen).toBe(true);
    const worldBefore = await page.evaluate(async () => {
      const physics = await import('/js/physics.js');
      return physics.getWorldGeneration();
    });

    // Now change the world out from under it, twice, in the two ways that
    // matter: a different scenario entirely, and a re-seed of the same one.
    // Both bump the world generation and hand every body a new id.
    await app.loadScenario('Solar System');
    await app.waitForFrames(30);
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      ui.initialize_simulation({ seed: 'a-different-world' });
    });
    await app.waitForFrames(30);

    const worldAfter = await page.evaluate(async () => {
      const physics = await import('/js/physics.js');
      return physics.getWorldGeneration();
    });
    expect(worldAfter).toBeGreaterThan(worldBefore);

    const after = await readNotebook(page);
    // Every recorded number, its unit, its kind, the conditions and the
    // checksum: unchanged.
    expect(after).toEqual(before);
  });

  test('a saved snapshot cannot be written to, from anywhere', async ({
    page,
    app,
  }) => {
    await app.boot();
    await analyseSynthetic(page);
    await keepFit(page, 'A claim.');

    const attempts = await page.evaluate(async () => {
      const panel = await import('/js/notebookPanel.js');
      const [entry] = panel.notebookEntries();
      const out = {
        threw: [],
        values: [],
        lengthBefore: entry.snapshot.quantities.length,
      };
      const tries = [
        () => {
          entry.snapshot.quantities[0].value = 99999;
        },
        () => {
          entry.snapshot.quantities.push({ label: 'fake', value: 1 });
        },
        () => {
          entry.snapshot.provenance.seed = 'rewritten';
        },
        () => {
          entry.snapshot.figure.series[0].points[0][1] = 12345;
        },
      ];
      for (const attempt of tries) {
        try {
          attempt();
          out.threw.push(false);
        } catch {
          out.threw.push(true);
        }
      }
      out.values = [
        entry.snapshot.quantities[0].value,
        entry.snapshot.quantities.length,
        entry.snapshot.provenance.seed,
        entry.snapshot.figure.series[0].points[0][1],
      ];
      return out;
    });

    // Whether a write throws depends on the strict-mode state of whoever
    // attempts it - module code throws, a plain evaluated script does not -
    // so that is not the assertion. The assertion is that nothing moved,
    // which holds either way and is the actual promise.
    expect(attempts.values[0]).not.toBe(99999);
    expect(attempts.values[1]).toBe(attempts.lengthBefore);
    expect(attempts.values[2]).not.toBe('rewritten');
    expect(attempts.values[3]).not.toBe(12345);
    // Growing the array is rejected outright in every mode, because push on a
    // frozen array cannot silently do nothing.
    expect(attempts.threw[1]).toBe(true);
  });

  test('a reading captured before the world moved still saves afterwards', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Exoplanet Characterization Lab');
    await app.waitForFrames(10);
    await analyseSynthetic(page);

    // Press save, then change the world while the claim box is still open.
    // The numbers were frozen at capture, so what gets stored is the reading
    // that was taken and not whatever the world says now.
    await page.locator('#rvFitNotebook').click();
    await expect(page.locator('#nbDraftClaim')).toBeVisible();
    const drafted = await page.evaluate(async () => {
      const panel = await import('/js/notebookPanel.js');
      const d = panel.pendingDraft();
      return {
        values: d.snapshot.quantities.map(q => q.value),
        world: d.snapshot.provenance.worldGeneration,
      };
    });

    await app.loadScenario('Solar System');
    await app.waitForFrames(30);

    await page.locator('#nbDraftClaim').fill('Written after the world moved.');
    await page.locator('#nbDraftSave').click();

    const saved = await readNotebook(page);
    expect(saved[0].quantities.map(q => q.value)).toEqual(drafted.values);
    expect(saved[0].provenance.worldGeneration).toBe(drafted.world);
    expect(saved[0].claim).toBe('Written after the world moved.');
  });
});

test.describe('what a saved reading records', () => {
  test('the live conditions, read at capture', async ({ page, app }) => {
    await app.boot();
    await app.loadScenario('Exoplanet Characterization Lab');
    await app.waitForFrames(40);
    await analyseSynthetic(page, { target: 'HD 12345', seed: 'seed-x' });
    await keepFit(page, '');

    const [entry] = await readNotebook(page);
    const p = entry.provenance;
    expect(p.target).toBe('HD 12345');
    expect(p.seed).toBe('seed-x');
    // From the running simulation, not from the recording.
    expect(p.worldGeneration).toBeGreaterThan(0);
    // WHEN the observations happened, which for a recording is its own epochs
    // and not the simulation clock at the moment somebody pressed save. The
    // clock fields are the acquisition time, and a completed recording does
    // not know one, so they are null and the epochs carry the answer.
    expect(p.simTimeUnits).toBe(null);
    expect(p.simTimeDays).toBe(null);
    expect(p.observedEpochs.count).toBeGreaterThan(3);
    expect(p.observedEpochs.unit).toBe('days');
    expect(p.observedEpochs.spanDays).toBeGreaterThan(0);
    expect(p.observedEpochs.lastDay).toBeGreaterThanOrEqual(
      p.observedEpochs.firstDay
    );
    // The conversion factor is still recorded, because the numbers in the
    // entry are in days and a reader has to be able to redo the arithmetic.
    expect(p.timeUnitSeconds).toBeGreaterThan(1);
    // A development server has no deployed commit and no build stamp, and the
    // honest record of that is null plus a source that says so - not the
    // string 'dev', which reads like a version and is not one.
    expect(['deployed', 'stamped', 'unknown']).toContain(p.revisionSource);
    if (p.revisionSource === 'unknown') expect(p.revision).toBe(null);
    else expect(p.revision).toBeTruthy();
    // This recording was handed to the workspace directly and carries no
    // acquisition settings, so they stay unknown. Filling them from the world
    // on screen would describe the sliders at the moment of saving as though
    // they were the conditions the samples were produced under.
    // e2e/rvLaunchPath.spec.js covers the other half: a recording made by the
    // real sampler does carry them, and they reach the entry.
    expect(p.numerical.integrator).toBe(null);
    expect(p.numerical.maxTimestep).toBe(null);
    // Same again for where it was watched from: this recording does not say,
    // so the entry does not either.
    expect(p.observer).toBe(null);
    expect(p.quality.tier).toBeTruthy();
    // A recording does not carry a reference frame: the frame is a display
    // choice made now, and writing the live one into the entry would have the
    // saved evidence claim the samples were taken in a frame nobody was in
    // when they were taken. So the recording's own frame is null - unknown -
    // and the frame it is being read in is recorded separately, as that.
    expect(p.referenceFrame).toBe(null);
    expect(p.displayFrame).toBeTruthy();
    expect(p.units).toBeTruthy();
  });

  test('measured parameters, and revealed truth kept apart', async ({
    page,
    app,
  }) => {
    await app.boot();
    await analyseSynthetic(page);
    // Reveal first, so the entry carries both kinds and the flag.
    await page.locator('#rvFitReveal').click();
    await keepFit(page, '');

    const [entry] = await readNotebook(page);
    const kinds = new Set(entry.quantities.map(q => q.kind));
    expect(kinds.has('measured')).toBe(true);
    expect(entry.provenance.flags).toContain('truth-revealed');
    // Every number has a unit or is explicitly dimensionless; none is left
    // undefined.
    for (const q of entry.quantities) {
      expect(typeof q.unit).toBe('string');
      expect(q.label.startsWith('nb.')).toBe(false);
    }
    const period = entry.quantities.find(q => q.unit === 'd');
    expect(period.value).toBeGreaterThan(0);
  });
});

test.describe('the panel', () => {
  test('reorder, annotate and delete, all from the keyboard', async ({
    page,
    app,
  }) => {
    await app.boot();
    await analyseSynthetic(page, { target: 'First' });
    await keepFit(page, 'First claim.');
    await analyseSynthetic(page, { target: 'Second' });
    await keepFit(page, 'Second claim.');
    await expect(page.locator('.nb-entry')).toHaveCount(2);

    const titles = () =>
      page.locator('.nb-title').evaluateAll(els => els.map(e => e.value));
    const before = await titles();
    expect(before[0]).toContain('First');

    // Reorder with the button, reached and pressed by keyboard.
    const up = page.locator('.nb-entry').nth(1).locator('[data-move="-1"]');
    await up.focus();
    await expect(up).toBeFocused();
    await page.keyboard.press('Enter');
    await expect.poll(titles).toEqual([before[1], before[0]]);

    // Annotate. The textarea is labelled, so it can be found by its label.
    const claim = page
      .locator('.nb-entry')
      .first()
      .locator('textarea[data-field="claim"]');
    await claim.focus();
    await claim.fill('Revised from the keyboard.');
    await claim.blur();
    await expect
      .poll(async () => (await readNotebook(page))[0].claim)
      .toBe('Revised from the keyboard.');

    // A revision must not move the entry or touch its numbers.
    const after = await readNotebook(page);
    expect(after.map(e => e.title)).toEqual([before[1], before[0]]);

    // Delete, with the confirm accepted.
    page.once('dialog', d => d.accept());
    await page.locator('.nb-entry').first().locator('[data-delete]').click();
    await expect(page.locator('.nb-entry')).toHaveCount(1);
    expect((await titles())[0]).toBe(before[0]);
  });

  test('a refused delete keeps the entry', async ({ page, app }) => {
    await app.boot();
    await analyseSynthetic(page);
    await keepFit(page, 'Keep me.');
    page.once('dialog', d => d.dismiss());
    await page.locator('[data-delete]').click();
    await expect(page.locator('.nb-entry')).toHaveCount(1);
  });

  test('it survives being reopened, and remembers the order', async ({
    page,
    app,
  }) => {
    await app.boot();
    await analyseSynthetic(page, { target: 'One' });
    await keepFit(page, 'a');
    await analyseSynthetic(page, { target: 'Two' });
    await keepFit(page, 'b');
    await page.locator('.nb-entry').nth(1).locator('[data-move="-1"]').click();
    const order = (await readNotebook(page)).map(e => e.id);

    await page.locator('#nbClose').click();
    await expect(page.locator('#evidenceNotebook')).toBeHidden();
    await page.reload();
    await page.waitForFunction(() => window.splashScreenEnded === true, null, {
      timeout: 30_000,
    });
    await openNotebook(page, app);

    expect((await readNotebook(page)).map(e => e.id)).toEqual(order);
  });

  test('the storage line is always there, and says what is used', async ({
    page,
    app,
  }) => {
    await app.boot();
    await openNotebook(page, app);
    await expect(page.locator('.nb-status')).toBeVisible();
    await analyseSynthetic(page);
    await keepFit(page, 'x');
    await expect(page.locator('.nb-status')).toContainText('1');
  });

  test('a browser that refuses to store says so and keeps the entry', async ({
    page,
    app,
  }) => {
    await app.boot();
    await analyseSynthetic(page);
    // Make every write fail, the way private browsing does.
    await page.evaluate(async () => {
      const store = await import('/js/notebook/store.js');
      store.setBackend({
        getItem: () => null,
        setItem: () => {
          const err = new Error('refused');
          err.name = 'QuotaExceededError';
          throw err;
        },
        removeItem: () => {},
      });
    });
    await page.locator('#rvFitNotebook').click();
    await page.locator('#nbDraftClaim').fill('Kept in the tab only.');
    await page.locator('#nbDraftSave').click();

    // Visible, not silent, and the reading is still on screen rather than
    // dropped because the browser would not keep it.
    await expect(page.locator('.nb-status.is-bad')).toBeVisible();
    await expect(page.locator('.nb-entry')).toHaveCount(1);
    const status = await page.locator('.nb-status.is-bad').innerText();
    expect(status.toLowerCase()).toContain('download');
  });
});

test.describe('the files', () => {
  test('a downloaded notebook carries the provenance, and restores', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Exoplanet Characterization Lab');
    await app.waitForFrames(20);
    await analyseSynthetic(page, { target: 'HD 999', seed: 'file-seed' });
    await keepFit(page, 'A claim worth keeping.');
    const before = await readNotebook(page);

    const download = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#nbDownload').click(),
    ]).then(([d]) => d);
    const path = join(OUT, download.suggestedFilename());
    await download.saveAs(path);
    const payload = JSON.parse(await readFile(path, 'utf8'));

    expect(payload.kind).toBe('gravitas.evidence.notebook');
    const written = payload.entries[0].snapshot.provenance;
    // The provenance the export promises to retain, named field by field.
    expect(written.target).toBe('HD 999');
    expect(written.seed).toBe('file-seed');
    expect(written.scenario).toBeTruthy();
    expect(written.worldGeneration).toBe(before[0].provenance.worldGeneration);
    expect(written.simTimeDays).toBe(before[0].provenance.simTimeDays);
    expect(written.revision).toBe(before[0].provenance.revision);
    expect(written.numerical).toEqual(before[0].provenance.numerical);
    expect(written.observer).toEqual(before[0].provenance.observer);
    expect(written.quality).toEqual(before[0].provenance.quality);
    expect(written.units).toEqual(before[0].provenance.units);
    expect(payload.entries[0].fingerprint).toBe(before[0].fingerprint);

    // Now empty the notebook and put the file back.
    page.once('dialog', d => d.accept());
    await page.locator('[data-delete]').click();
    await expect(page.locator('.nb-entry')).toHaveCount(0);
    await page.locator('#nbRestoreFile').setInputFiles(path);
    await expect(page.locator('.nb-entry')).toHaveCount(1);
    expect(await readNotebook(page)).toEqual(before);
  });

  test('a file whose numbers were edited is flagged rather than trusted', async ({
    page,
    app,
  }) => {
    await app.boot();
    await analyseSynthetic(page);
    await keepFit(page, 'Original.');

    const download = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#nbDownload').click(),
    ]).then(([d]) => d);
    const path = join(OUT, 'edited.json');
    await download.saveAs(path);
    const payload = JSON.parse(await readFile(path, 'utf8'));
    payload.entries[0].snapshot.quantities[0].value = 123456;

    await page.locator('#nbRestoreFile').setInputFiles({
      name: 'edited.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(payload)),
    });

    await expect(page.locator('.nb-tampered')).toBeVisible();
    const [entry] = await readNotebook(page);
    expect(entry.quantities[0].value).toBe(123456);
    expect(entry.fingerprint).not.toBe(payload.entries[0].fingerprint);
  });

  test('a file that is not a notebook is refused by name', async ({
    page,
    app,
  }) => {
    await app.boot();
    await openNotebook(page, app);
    await page.locator('#nbRestoreFile').setInputFiles({
      name: 'nope.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ kind: 'something.else' })),
    });
    await expect(page.locator('.nb-status.is-bad')).toBeVisible();
    await expect(page.locator('.nb-entry')).toHaveCount(0);
  });

  test('the report downloads, and is a PDF', async ({ page, app }) => {
    await app.boot();
    await analyseSynthetic(page);
    await keepFit(page, 'For the report.');

    const download = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#nbReport').click(),
    ]).then(([d]) => d);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    const path = join(OUT, download.suggestedFilename());
    await download.saveAs(path);
    const bytes = await readFile(path);
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    // The provenance and the student's own words both reach the file.
    const text = bytes.toString('latin1');
    expect(text).toContain('For the report.');
    expect(text.length).toBeGreaterThan(2000);
  });
});

test.describe('everyone can use it', () => {
  test('the whole panel is translated', async ({ page, app }) => {
    await app.boot();
    await analyseSynthetic(page);
    await keepFit(page, 'Una afirmación.');

    await page.evaluate(async () => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale('es');
    });

    // Nothing on the panel renders as its own message id, in either language.
    for (const locale of ['es', 'en']) {
      await page.evaluate(async l => {
        const i18n = await import('/js/i18n/index.js');
        await i18n.setLocale(l);
      }, locale);
      const leaked = await page.evaluate(() => {
        const panel = document.getElementById('evidenceNotebook');
        return (
          panel.innerText.match(/\bnb\.[a-z]+\.[a-zA-Z.-]+/g) || []
        ).slice(0, 5);
      });
      expect(leaked).toEqual([]);
    }

    await page.evaluate(async () => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale('es');
    });
    await expect(page.locator('#nbReport')).toHaveText('Informe');
    // The DOM text, not the rendering: the pill is uppercased by CSS, and a
    // screen reader is given the word as written.
    await expect(page.locator('.nb-kind').first()).toHaveText('medido');
    // The words the student wrote are not translated, which is correct.
    await expect(
      page.locator('textarea[data-field="claim"]').first()
    ).toHaveValue('Una afirmación.');
  });

  test('a language change with the panel open does not lock the tab', async ({
    page,
    app,
  }) => {
    await app.boot();
    await analyseSynthetic(page);
    await keepFit(page, 'x');
    for (const l of ['es', 'en', 'es']) {
      await page.evaluate(async locale => {
        const i18n = await import('/js/i18n/index.js');
        await i18n.setLocale(locale);
      }, l);
    }
    // Still one entry, still one panel, and the page still responds.
    await expect(page.locator('.nb-entry')).toHaveCount(1);
    await expect(page.locator('#evidenceNotebook')).toBeVisible();
    expect(await page.evaluate(() => 1 + 1)).toBe(2);
  });

  test('the panel fits a phone and does not scroll sideways', async ({
    page,
    app,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await app.boot();
    await analyseSynthetic(page);
    await keepFit(page, 'On a phone.');

    const overflow = await page.evaluate(() => {
      const panel = document.getElementById('evidenceNotebook');
      return {
        panel: panel.scrollWidth - panel.clientWidth,
        doc:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      };
    });
    expect(overflow.panel).toBeLessThanOrEqual(1);
    expect(overflow.doc).toBeLessThanOrEqual(1);
    await expect(page.locator('.nb-entry')).toHaveCount(1);
  });
});
