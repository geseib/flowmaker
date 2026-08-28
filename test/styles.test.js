import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STYLES, getStyle } from '../src/styles/index.js';
import { STYLE_KEYS, DENSITY, DENSITY_KEYS } from '../src/constants.js';
import { styleCss } from '../src/render.js';
import { PALETTES, deriveTokens } from '../src/palettes.js';

// The renderer emits identical markup for every style, so every style has to
// have an opinion about every element it can produce. A style that forgets one
// inherits whatever the previous style set, which is how slots leak.
const REQUIRED = [
  '.fm-root', '.fm-svg', '.fm-subgraph rect', '.fm-subgraph text',
  '.fm-node-shape', '.fm-node-label', '.fm-node-icon', '.fm-node-badge',
  '.fm-node-rail', '.fm-edge', '.fm-edge-label', '.fm-arrow', '.fm-arrow-alert',
  '.fm-wrap-tag circle', '.fm-wrap-tag-text',
  '.fm-node:hover', '.fm-node:focus-visible', '[data-dimmed="true"]',
  '[data-active="true"]', '.fm-edge[data-back="true"]',
];

const cssFor = (style, density = DENSITY.standard, palette = PALETTES[0]) =>
  style.css(deriveTokens(palette, { dark: style.dark }), density);

test('all seven styles are registered in spec order', () => {
  assert.deepEqual(STYLES.map((s) => s.key), STYLE_KEYS);
});

test('each style declares a name and a dark flag', () => {
  for (const s of STYLES) {
    assert.equal(typeof s.name, 'string');
    assert.ok(s.name.length > 0);
    assert.equal(typeof s.dark, 'boolean');
  }
});

test('every style covers the full selector contract at every density', () => {
  for (const s of STYLES) {
    for (const density of DENSITY_KEYS) {
      const css = cssFor(s, DENSITY[density]);
      for (const sel of REQUIRED) {
        assert.ok(css.includes(sel), `${s.key} @${density} is missing "${sel}"`);
      }
    }
  }
});

test('no style reaches the network or embeds a raster', () => {
  for (const s of STYLES) {
    const css = cssFor(s);
    assert.equal(/https?:\/\//.test(css), false, `${s.key} contains a network URL`);
    assert.equal(css.includes('@import'), false, `${s.key} contains an @import`);
    assert.equal(css.includes('data:image'), false, `${s.key} embeds a raster image`);
  }
});

test('every style consumes all four palette swatches', () => {
  for (const s of STYLES) {
    const css = cssFor(s);
    for (const v of ['--c1', '--c2', '--c3', '--c4']) {
      assert.ok(css.includes(v), `${s.key} never uses ${v}`);
    }
  }
});

test('every style works with every palette without throwing', () => {
  for (const s of STYLES) {
    for (const p of PALETTES) {
      assert.ok(cssFor(s, DENSITY.marquee, p).length > 200);
    }
  }
});

const hidden = (css, selector) =>
  new RegExp(`${selector.replace('.', '\\.')}\\s*\\{[^}]*display:\\s*none`).test(css);

test('only Infographic shows the icon and its ring', () => {
  for (const s of STYLES) {
    const css = cssFor(s);
    const shows = !hidden(css, '.fm-node-icon');
    assert.equal(shows, s.key === 'infographic', `${s.key} icon visibility is wrong`);
    const badge = !hidden(css, '.fm-node-badge');
    assert.equal(badge, s.key === 'infographic', `${s.key} icon ring visibility is wrong`);
  }
});

test('only Accent Rail shows the accent rail', () => {
  for (const s of STYLES) {
    const shows = !hidden(cssFor(s), '.fm-node-rail');
    assert.equal(shows, s.key === 'accent-rail', `${s.key} rail visibility is wrong`);
  }
});

test('Infographic is outlined, not filled: cards take the surface colour', () => {
  const css = cssFor(getStyle('infographic'));
  assert.match(css, /\.fm-node-shape\s*\{[^}]*fill:\s*var\(--surface\)/, 'cards must be outlined');
  assert.match(css, /\.fm-node-shape\s*\{[^}]*stroke:\s*var\(--tone\)/, 'the colour lives in the border');
});

test('Accent Rail colours the rail rather than the whole card', () => {
  const css = cssFor(getStyle('accent-rail'));
  assert.match(css, /\.fm-node-rail\s*\{[^}]*fill:\s*var\(--tone\)/);
  assert.match(css, /\.fm-node-shape\s*\{[^}]*fill:\s*var\(--surface\)/);
});

test('bold-brutal uses the marquee type scale verbatim', () => {
  const css = cssFor(getStyle('bold-brutal'), DENSITY.marquee);
  assert.ok(css.includes(`${DENSITY.marquee.fontSize}px`));
});

test('an unknown style key falls back rather than throwing', () => {
  assert.ok(getStyle('nonexistent'));
  assert.equal(getStyle('nonexistent').key, 'executive-clean');
});

test('style css generation is deterministic', () => {
  for (const s of STYLES) {
    assert.equal(cssFor(s, DENSITY.standard, PALETTES[2]), cssFor(s, DENSITY.standard, PALETTES[2]));
  }
});

// --- the swatch a node wears ------------------------------------------------

test('every style takes its node colour from the tone, not from a fixed swatch', () => {
  for (const s of STYLES) {
    const css = cssFor(s);
    // A node's own colour must be indirect, so the colouring mode can redirect
    // it. Edges, wrap tags, and the alert colour are not per-node and stay put.
    const nodeRules = css.split('\n').filter((line) => /^\.fm-node[^-]/.test(line) || /^\.fm-node-(shape|rail|label|icon|badge|rule)/.test(line));
    for (const line of nodeRules) {
      if (line.includes('data-active') || line.includes(':focus') || line.includes(':hover')) continue;
      assert.equal(/var\(--c[123](-ink|-soft)?\)/.test(line), false,
        `${s.key} pins a node to a fixed swatch: ${line.trim()}`);
    }
  }
});

test('the tone rules cover all four swatches, once, for every style', () => {
  for (const s of STYLES) {
    const css = styleCss(s.key, deriveTokens(PALETTES[0], { dark: s.dark }), 'standard');
    for (const n of [0, 2, 3, 4]) {
      assert.ok(css.includes(`.fm-node[data-tone="${n}"]`), `${s.key} has no rule for tone ${n}`);
    }
    assert.match(css, /\.fm-node \{[^}]*--tone:\s*var\(--c1\)/, `${s.key} has no default tone`);
  }
});
