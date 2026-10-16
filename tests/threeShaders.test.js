// The build prunes and rewrites three.js's shader chunks (tools/three-shaders.mjs).
// It must change nothing the 3-D view can draw: every chunk a program the view
// can reach includes must survive, and every literal must keep its tokens.
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  KEPT_PROGRAMS,
  joinTokens,
  lex,
  minifyGlsl,
  minifySource,
  pruneShaderChunks,
  shaderLiterals,
  unreachableChunks,
} from '../tools/three-shaders.mjs';

const SOURCE = readFileSync('vendor/three/three.module.js', 'utf8');
const INCLUDE = /#include\s*<([\w./]+)>/g;

/** What a GLSL compiler sees, minus whitespace: tokens, with directives marked. */
function items(text) {
  const clean = text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, '');
  const out = [];
  for (const raw of clean.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) out.push(`D:${line.replace(/\s+/g, ' ')}`);
    else out.push(...lex(line));
  }
  return out;
}

describe('GLSL whitespace', () => {
  test('a space survives only where two tokens would run together', () => {
    expect(joinTokens(lex('vec3( 0.0 )'))).toBe('vec3(0.0)');
    expect(joinTokens(lex('a + +b'))).toBe('a+ +b');
    expect(joinTokens(lex('a - -b'))).toBe('a- -b');
    expect(joinTokens(lex('a / /b'))).toBe('a/ /b');
    expect(joinTokens(lex('float x = 1.0 ;'))).toBe('float x=1.0;');
    expect(joinTokens(lex('x < <y'))).toBe('x< <y');
  });

  test('preprocessor lines keep their own line', () => {
    const out = minifyGlsl(
      '\n\t// c\n\tfloat a = 1.0;\n\t#ifdef X\n\t\tfloat b = 2.0; /* d */\n\t#endif\n'
    );
    expect(out).toBe('\nfloat a=1.0;\n#ifdef X\nfloat b=2.0;\n#endif\n');
  });

  test('a literal it cannot prove is left alone', () => {
    expect(minifyGlsl('#define A 1 \\\n 2')).toBeNull();
    expect(minifyGlsl('a \\n b')).toBeNull();
  });

  test('every shader literal in three keeps its tokens and directives', () => {
    const literals = shaderLiterals(SOURCE);
    expect(literals.length).toBeGreaterThan(100);
    let changed = 0;
    for (const { raw } of literals) {
      const out = minifyGlsl(raw);
      if (out === null || out === raw) continue;
      changed++;
      expect(items(out)).toEqual(items(raw));
      // Joined lines may hold only code; a directive is alone on its line.
      for (const line of out.split('\n'))
        if (line.includes('#')) expect(line.trim().startsWith('#')).toBe(true);
    }
    expect(changed).toBeGreaterThan(100);
  });

  test('whitespace the pass leaves is no whitespace the renderer reads', () => {
    // three reads #include and #pragma unroll_loop_* line by line.
    const out = minifySource(SOURCE);
    expect(out.length).toBeLessThan(SOURCE.length - 8000);
    expect(out).toMatch(/#pragma unroll_loop_start\nfor\(int i=0;/);
    expect(out).not.toMatch(/\/\/ /);
  });
});

describe('unreachable shader chunks', () => {
  const found = unreachableChunks(SOURCE);
  const pruned = pruneShaderChunks(SOURCE);

  test('the vendored file has the shape the pruner reads', () => {
    expect(found).not.toBeNull();
    expect(found.texts.size).toBeGreaterThan(100);
    expect(found.dropped.length).toBeGreaterThan(20);
    expect(found.bytes).toBeGreaterThan(20000);
    expect(pruned).not.toBeNull();
  });

  test('what the kept programs include is still there', () => {
    const after = unreachableChunks(pruned);
    // Nothing a surviving chunk includes was emptied: the second pass finds
    // exactly the chunks the first emptied.
    expect(new Set(after.dropped)).toEqual(new Set(found.dropped));
    const empty = new Set(
      [...after.texts].filter(([, t]) => t.length <= 2).map(([n]) => n)
    );
    for (const [name, text] of after.texts) {
      if (empty.has(name)) continue;
      for (const m of text.matchAll(INCLUDE)) {
        const target = after.texts.has(m[1]) ? m[1] : after.alias.get(m[1]);
        expect(target).toBeDefined();
        expect(empty.has(target)).toBe(false);
      }
    }
  });

  test('the programs the 3-D view draws with are among those kept', () => {
    expect(KEPT_PROGRAMS).toEqual(
      expect.arrayContaining(['basic', 'standard', 'depth', 'distanceRGBA'])
    );
    for (const name of [
      'meshphysical_vert',
      'meshphysical_frag',
      'meshbasic_vert',
      'meshbasic_frag',
      'lights_physical_fragment',
      'lights_fragment_begin',
      'tonemapping_pars_fragment',
      'colorspace_pars_fragment',
      'opaque_fragment',
    ])
      expect(found.dropped).not.toContain(name);
    for (const name of [
      'meshphong_frag',
      'meshtoon_frag',
      'points_frag',
      'sprite_frag',
    ])
      expect(found.dropped).toContain(name);
  });

  test('the 3-D view exports no class that would reach a pruned program', () => {
    const tools = readFileSync('tools/vendor-deps.mjs', 'utf8');
    const entry = tools.match(
      /out: 'vendor\/three\/three\.module\.js'[\s\S]*?entry: \[([\s\S]*?)\]\.join/
    )[1];
    const names = [...entry.matchAll(/\b([A-Z]\w+)\b/g)].map(m => m[1]);
    expect(names.length).toBeGreaterThan(10);
    const materials = names.filter(n => /Material$/.test(n));
    // Anything else needs its program kept in tools/three-shaders.mjs
    // (KEPT_PROGRAMS) and the chunks it includes with it.
    expect(materials.sort()).toEqual([
      'LineBasicMaterial',
      'MeshStandardMaterial',
    ]);
    for (const n of names)
      expect(n).not.toMatch(
        /^(Points|Sprite|Shader|RawShader|ShaderLib|ShaderChunk|UniformsLib)/
      );
  });
});
