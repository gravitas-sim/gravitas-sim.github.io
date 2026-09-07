import { test, expect } from './fixtures.js';

test('the lesson configuration behaves as designed', async ({ page, app }) => {
  test.setTimeout(240000);
  await app.boot();
  await app.loadScenario('Exoplanet Characterization Lab');
  await app.waitForFrames(10);
  await app.openPanel('toggleRadialVelocity', 'rvContainer');
  await page.locator('#rvSurveyEnabled').check();
  await page.locator('#rvSurveyBaseline').fill('24.673');
  await page.locator('#rvSurveySigma').fill('8');
  await page.locator('#rvSurveySeed').fill('schedule-1');
  await page.locator('#rvSurveyCompareEnabled').check();
  await page.locator('#rvSurveyShape').selectOption('regular');
  await page.locator('#rvSurveyShapeB').selectOption('irregular');
  await page.locator('#rvSurveyEpochs').fill('8');
  await page.locator('#rvSurveyJitter').fill('0.45');
  await page.locator('#rvSurveyJitter').blur();
  // Run the clock faster: seven orbits at the default rate is a long wait.
  await page.evaluate(async () => {
    const { SETTINGS } = await import('/js/appState.js');
    SETTINGS.simulation_speed = 8;
  });
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          const rv = await import('/js/radialVelocity.js');
          const c = rv.radialVelocityComparison();
          return c?.report ? true : false;
        }),
      { timeout: 200000 }
    )
    .toBe(true);
  const out = await page.evaluate(async () => {
    const rv = await import('/js/radialVelocity.js');
    const c = rv.radialVelocityComparison();
    return {
      arms: c.report.arms.map(a => ({
        kind: a.kind, taken: a.taken,
        P: a.fit?.periodDays, K: a.fit?.amplitudeMs,
        win: a.window?.worstPeak, atBound: a.fit?.atBound,
      })),
      controlled: c.report.controls.controlled,
      caveats: c.report.caveats,
      coarse: rv.radialVelocitySurvey().measurements.filter(m => m.quality === 'degraded').length,
      text: document.getElementById('rvSurveyCompareReport').textContent,
    };
  });
  console.log(JSON.stringify(out, null, 1));
});
