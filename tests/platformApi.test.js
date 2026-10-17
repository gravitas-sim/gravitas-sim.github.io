import { describe, test, expect } from '@jest/globals';
import { readFileSync, readdirSync } from 'node:fs';
import { PLATFORM_API } from '../js/platform/manifest.js';
import { PLATFORM_API as GENERATED } from '../js/platform/catalog.generated.js';
import { satisfies } from '../js/platform/semver.js';
import { RELEASE } from '../tools/project-metadata.mjs';

describe('the platform API is its own number', () => {
  test('it differs from the release version on purpose', () => {
    // The platform API versions the extension and pack contracts; the release
    // versions the product. They were both "1.0.0" once and a reader could not
    // tell which a label meant (the catalog's "platform 1.0.0").
    expect(PLATFORM_API).toBe(GENERATED);
    expect(PLATFORM_API).not.toBe(RELEASE.version);
  });

  test("the catalog names it, and every entry's range is satisfied by it", () => {
    const catalog = JSON.parse(readFileSync('catalog/catalog.json', 'utf8'));
    expect(catalog.platform).toBe(PLATFORM_API);
    for (const e of catalog.entries)
      expect([e.id, satisfies(PLATFORM_API, e.gravitas)]).toEqual([e.id, true]);
  });

  test('every community package in extensions/ declares a satisfied range', () => {
    for (const dir of readdirSync('extensions', { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      const manifest = JSON.parse(
        readFileSync(`extensions/${dir.name}/gravitas-extension.json`, 'utf8')
      );
      expect([dir.name, satisfies(PLATFORM_API, manifest.gravitas)]).toEqual([
        dir.name,
        true,
      ]);
    }
  });

  test('where it is shown, the string says "platform API", in both languages', () => {
    for (const lang of ['en', 'es']) {
      const text = readFileSync(`js/i18n/${lang}.catalog.js`, 'utf8');
      const line = text.split('\n').find(l => l.includes("'cat.works.value'"));
      const value = text
        .slice(text.indexOf(line))
        .split('\n')
        .slice(0, 2)
        .join(' ');
      expect(value).toMatch(
        lang === 'en' ? /platform API/ : /API de plataforma/
      );
    }
  });
});
