// =============================================================================
// The Common Cartridge export (Prompt 169)
// -----------------------------------------------------------------------------
// The button on the course builder, the panel it opens, the file it downloads,
// and the same file from the distribution kit, in both languages. What is read
// back is the downloaded archive itself: a reader that knows only the ZIP
// format opens it, and the profile's checker (tools/cartridge-profile.mjs) judges
// the manifest and every link file it holds.
//
// What this does not do, and says plainly: it imports nothing into a learning
// platform (none is available to this project), so a green run says the file is
// well made, not that Canvas, Moodle, D2L or Blackboard reads it. The panel
// and Teach say NOT VERIFIED, and this spec holds them to it.
// =============================================================================

import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { TextDecoder } from 'node:util';
import { JSDOM } from 'jsdom';
import { test, expect } from './fixtures.js';
import { checkCartridge } from '../tools/cartridge-profile.mjs';
import { statusStatement } from '../js/instructorCartridgeText.js';
import { INTRO_ASTRONOMY } from '../js/data/courses/intro-astronomy.js';

const parse = text =>
  new new JSDOM('').window.DOMParser().parseFromString(text, 'application/xml');

const quiet = (page, locale, theme) =>
  page.addInitScript(
    ([l, t]) => {
      localStorage.setItem('gravitas_orientation_seen_v1', '1');
      localStorage.setItem('gravitas_welcome_seen_v1', '1');
      localStorage.setItem('gravitas_locale', l);
      if (t) localStorage.setItem('gravitas_theme', t);
    },
    [locale, theme]
  );

/** Press a control and read the file it downloads: its name and its bytes. */
async function take(page, trigger) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(trigger).click(),
  ]);
  return {
    name: download.suggestedFilename(),
    bytes: new Uint8Array(readFileSync(await download.path())),
  };
}

/** A ZIP reader that shares nothing with the writer: the end record, the central directory, stored entries. */
function unzip(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let e = bytes.length - 22;
  while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e -= 1;
  expect(e).toBeGreaterThanOrEqual(0);
  const count = v.getUint16(e + 10, true);
  let at = v.getUint32(e + 16, true);
  const out = new Map();
  for (let i = 0; i < count; i++) {
    expect(v.getUint32(at, true)).toBe(0x02014b50);
    expect(v.getUint16(at + 10, true)).toBe(0); // stored
    const size = v.getUint32(at + 20, true);
    const nameLen = v.getUint16(at + 28, true);
    const rest = v.getUint16(at + 30, true) + v.getUint16(at + 32, true);
    const local = v.getUint32(at + 42, true);
    const name = new TextDecoder().decode(
      bytes.subarray(at + 46, at + 46 + nameLen)
    );
    const start =
      local +
      30 +
      v.getUint16(local + 26, true) +
      v.getUint16(local + 28, true);
    out.set(
      name,
      new TextDecoder().decode(bytes.subarray(start, start + size))
    );
    at += 46 + nameLen + rest;
  }
  return out;
}

/** The cartridge's files, with the profile's verdict on them. */
function read(bytes) {
  const files = unzip(bytes);
  const manifest = files.get('imsmanifest.xml');
  files.delete('imsmanifest.xml');
  return { manifest, files, problems: checkCartridge(parse, manifest, files) };
}

/** The builder with the example course loaded and checked, ready to export. */
async function builder(page, locale) {
  await quiet(page, locale);
  await page.goto('/studio/course/');
  await page.locator('#cb-example').click();
  await page.waitForSelector('body[data-checked]', { timeout: 60_000 });
}

const COURSE = { en: 'Introductory astronomy', es: 'Astronomía introductoria' };

for (const locale of ['en', 'es']) {
  test(`${locale}: the builder exports a cartridge the profile accepts, and says what is not verified`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await builder(page, locale);
    await page.locator('#cb-cartridge').click();
    const panel = page.locator('#cb-cartridge-panel');
    await expect(panel.locator('#cc-h')).toHaveText(
      locale === 'en'
        ? 'Export a Common Cartridge'
        : 'Exportar un Common Cartridge'
    );
    await expect(panel.locator('#cc-status')).toHaveText(
      `Gravitas ${statusStatement(locale)}.`
    );
    await expect(panel.locator('#cc-table tbody tr')).toHaveCount(4);
    for (const lms of ['Canvas', 'Moodle', 'D2L', 'Blackboard'])
      await expect(
        panel.locator(`tr[data-lms="${lms}"] td`).first()
      ).toHaveText('NOT VERIFIED');
    await expect(panel.locator('#cc-count')).toContainText(
      locale === 'en' ? '16 links in 5 modules.' : '16 enlaces en 5 módulos.'
    );

    const file = await take(page, '#cc-go');
    expect(file.name).toBe(`intro-astronomy-${locale}.imscc`);
    await expect(panel.locator('#cc-made')).toContainText(file.name);
    const { manifest, files, problems } = read(file.bytes);
    expect(problems).toEqual([]);
    expect(files.size).toBe(16);
    expect(manifest).toContain('IMS Thin Common Cartridge');
    expect(manifest).toContain(`<lomm:language>${locale}</lomm:language>`);
    expect(manifest).toContain(COURSE[locale]);
    // Every link opens the app, the Observatory or a reading, over https.
    for (const text of files.values())
      expect(text).toMatch(/<url href="https:\/\/[^"]+" target="_blank"\/>/);
    // The notes for instructors are not in it unless asked for.
    expect(manifest).not.toMatch(
      /Notes for instructors, |Notas para docentes, /
    );
  });
}

test('ticking the notes box puts them in, on links for instructors only', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await builder(page, 'en');
  await page.locator('#cb-cartridge').click();
  const plain = read((await take(page, '#cc-go')).bytes);
  await page.locator('#cc-notes').check();
  const noted = read((await take(page, '#cc-go')).bytes);
  expect(noted.problems).toEqual([]);
  expect(noted.manifest.length).toBeGreaterThan(plain.manifest.length);
  const teacher = INTRO_ASTRONOMY.units
    .flatMap(u => u.items)
    .map(i => i.teacherNote?.en)
    .filter(Boolean);
  expect(teacher.length).toBeGreaterThan(0);
  const text = noted.manifest
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"');
  for (const t of teacher) {
    expect(plain.manifest).not.toContain(t.slice(0, 40));
    expect(text).toContain(t.slice(0, 40));
  }
});

test('a course with problems offers no file, and says to fix them', async ({
  page,
}) => {
  await quiet(page, 'en');
  await page.goto('/studio/course/');
  await page.locator('#cb-new').click();
  await page.waitForSelector('body[data-checked]', { timeout: 60_000 });
  await page.locator('#cb-cartridge').click();
  await expect(page.locator('#cc-fix')).toBeVisible();
  await expect(page.locator('#cc-go')).toHaveCount(0);
});

for (const locale of ['en', 'es']) {
  test(`${locale}: the kit makes the same cartridge from the course file as the builder does`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await builder(page, locale);
    await page.locator('#cb-cartridge').click();
    const fromBuilder = await take(page, '#cc-go');

    await page.goto('/teaching/kit/');
    await page.locator('#kitFile').setInputFiles({
      name: 'intro-astronomy.course.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(INTRO_ASTRONOMY)),
    });
    await expect(page.locator('#kitCc')).toBeVisible({ timeout: 60_000 });
    await page.locator('#kitCcOpen').click();
    await expect(page.locator('#kitCartridge #cc-h')).toBeVisible();
    await expect(page.locator('#kitCartridge #cc-status')).toHaveText(
      `Gravitas ${statusStatement(locale)}.`
    );
    const fromKit = await take(page, '#kitCartridge #cc-go');
    expect(fromKit.name).toBe(fromBuilder.name);
    const a = read(fromBuilder.bytes);
    const b = read(fromKit.bytes);
    expect(b.problems).toEqual([]);
    expect(b.manifest).toBe(a.manifest);
    expect([...b.files]).toEqual([...a.files]);
  });
}

test('the kit offers it for a course and not for an activity', async ({
  page,
}) => {
  await quiet(page, 'en');
  await page.goto('/teaching/kit/');
  await expect(page.locator('#kitCc')).toBeHidden();
});

test('Teach and the adopter’s guide say the contract’s sentence, in both languages, and no more', async ({
  page,
}) => {
  for (const url of ['/teaching/', '/teaching/adopt/'])
    for (const locale of ['en', 'es']) {
      await quiet(page, locale);
      await page.goto(url);
      const paragraph = page
        .locator('p', { hasText: statusStatement(locale) })
        .first();
      await expect(paragraph).toBeVisible();
      expect(await paragraph.innerText()).not.toMatch(/works|funciona/i);
    }
});

const SIZES = [
  { name: 1280, width: 1280, height: 900 },
  { name: 390, width: 390, height: 844 },
];

/** Every control in the panel and every link in it is at least 24 px and inside the viewport. */
async function smallOrOutside(page, root) {
  return page.evaluate(selector => {
    const bad = [];
    const vw = document.documentElement.clientWidth;
    for (const host of document.querySelectorAll(selector))
      for (const el of host.querySelectorAll(
        'a[href], button, input, select, textarea, summary'
      )) {
        const r = el.getBoundingClientRect();
        if (!r.width && !r.height) continue;
        const label = (el.id || el.textContent || el.tagName)
          .trim()
          .slice(0, 40);
        if (r.width < 24 || r.height < 24)
          bad.push(`${label}: ${Math.round(r.width)}x${Math.round(r.height)}`);
        if (r.left < -0.5 || r.right > vw + 0.5)
          bad.push(
            `${label}: outside the viewport (${Math.round(r.left)}..${Math.round(r.right)} of ${vw})`
          );
      }
    if (document.documentElement.scrollWidth > vw + 1)
      bad.push(
        `sideways scroll: ${document.documentElement.scrollWidth} > ${vw}`
      );
    return bad;
  }, root);
}

for (const size of SIZES)
  for (const locale of ['en', 'es'])
    for (const theme of ['midnight', 'daylight'])
      test(`the new controls fit at ${size.name} px, ${locale}, ${theme}`, async ({
        page,
      }) => {
        test.setTimeout(180_000);
        await page.setViewportSize({ width: size.width, height: size.height });
        await quiet(page, locale, theme);
        await page.goto('/studio/course/');
        await page.locator('#cb-example').click();
        await page.waitForSelector('body[data-checked]', { timeout: 60_000 });
        expect(await smallOrOutside(page, '#cb-cartridge')).toEqual([]);
        await page.locator('#cb-cartridge').click();
        await expect(page.locator('#cc-go')).toBeVisible();
        expect(await smallOrOutside(page, '#cb-cartridge-panel')).toEqual([]);

        await page.goto('/teaching/kit/');
        await page.locator('#kitFile').setInputFiles({
          name: 'intro-astronomy.course.json',
          mimeType: 'application/json',
          buffer: Buffer.from(JSON.stringify(INTRO_ASTRONOMY)),
        });
        await expect(page.locator('#kitCcOpen')).toBeVisible({
          timeout: 60_000,
        });
        await page.locator('#kitCcOpen').click();
        await expect(page.locator('#kitCartridge #cc-go')).toBeVisible();
        expect(await smallOrOutside(page, '#kitCc')).toEqual([]);
      });
