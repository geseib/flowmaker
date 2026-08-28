import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildStandaloneSvg, fileNameFor } from '../src/svg.js';
import { resolveDocument } from '../src/app.js';
import { STYLE_KEYS } from '../src/constants.js';

const doc = resolveDocument(readFileSync(new URL('../samples/order-processing.md', import.meta.url), 'utf8'));
const make = (over = {}) => buildStandaloneSvg({
  meta: doc.meta,
  model: doc.model,
  details: doc.details,
  styleKey: doc.meta.style,
  paletteKey: doc.meta.palette,
  density: doc.meta.density,
  colorBy: doc.meta.colorBy,
  ...over,
});

// --- the file name ---------------------------------------------------------

test('the diagram names the file, with spaces as underscores', () => {
  assert.equal(fileNameFor('Order Processing', 'svg'), 'Order_Processing.svg');
  assert.equal(fileNameFor('Engineering Organisation', 'html'), 'Engineering_Organisation.html');
});

test('the title keeps its capitals, since it is a name and not a slug', () => {
  assert.equal(fileNameFor('KYC Onboarding', 'svg'), 'KYC_Onboarding.svg');
});

test('characters a filesystem would argue with are removed', () => {
  assert.equal(fileNameFor('Q3/Q4: Rollout?', 'svg'), 'Q3_Q4_Rollout.svg');
  assert.equal(fileNameFor('a\\b*c|d', 'svg'), 'a_b_c_d.svg');
  assert.equal(fileNameFor('  padded  ', 'svg'), 'padded.svg');
  assert.equal(fileNameFor('a   b', 'svg'), 'a_b.svg', 'a run of spaces is one underscore');
});

test('a diagram with no usable title still saves', () => {
  for (const bad of ['', '   ', null, undefined, '///', '...']) {
    const name = fileNameFor(bad, 'svg');
    assert.equal(name, 'flow.svg', `"${bad}" produced ${name}`);
  }
});

test('a very long title is trimmed rather than rejected', () => {
  const name = fileNameFor('word '.repeat(80), 'svg');
  assert.ok(name.length <= 125, `name is ${name.length} long`);
  assert.ok(name.endsWith('.svg'));
  assert.equal(name.includes(' '), false);
});

// --- the file --------------------------------------------------------------

test('it is a standalone SVG document, not a fragment', () => {
  const svg = make();
  assert.match(svg, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<svg /);
  assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.ok(svg.trimEnd().endsWith('</svg>'));
  assert.equal((svg.match(/<svg /g) ?? []).length, 1, 'one root, not a nested pair');
});

test('it declares a real size, so it does not open at zero', () => {
  const svg = make();
  const root = /<svg [^>]*>/.exec(svg)[0];
  const w = Number(/ width="([\d.]+)"/.exec(root)[1]);
  const h = Number(/ height="([\d.]+)"/.exec(root)[1]);
  assert.ok(w >= doc.model.bounds.w, 'at least as wide as the diagram');
  assert.ok(h > doc.model.bounds.h, 'taller than the diagram, to seat the caption');
  assert.match(svg, new RegExp(`viewBox="0 0 ${w} ${h}"`));
});

test('it carries no script and reaches no network', () => {
  const svg = make();
  assert.equal(/<script/i.test(svg), false);
  assert.equal(/https?:\/\//.test(svg.replace(/xmlns="[^"]*"/g, '')), false);
  assert.equal(svg.includes('@import'), false);
  assert.equal(svg.includes('data:image'), false);
});

test('the style travels with it rather than being left to the viewer', () => {
  const svg = make();
  assert.match(svg, /<style>/);
  assert.match(svg, /--c1:\s*#/, 'the palette is resolved into the file');
  assert.match(svg, /\.fm-node\[data-tone="4"\]/, 'the tone rules travel too');
  assert.match(svg, /class="fm-root"/, 'the root carries the tokens');
});

test('every choice is baked in', () => {
  assert.notEqual(make({ styleKey: 'bold-brutal' }), make({ styleKey: 'blueprint' }));
  assert.notEqual(make({ paletteKey: 'ember' }), make({ paletteKey: 'forest' }));
  assert.notEqual(make({ density: 'marquee' }), make({ density: 'compact' }));
  assert.notEqual(make({ colorBy: 'level' }), make({ colorBy: 'type' }));
});

test('the ground is painted, so it is not transparent over a dark page', () => {
  assert.match(make(), /<rect class="fm-svg-ground"[^>]*fill="var\(--ground\)"/);
});

test('the caption names the diagram', () => {
  const svg = make();
  assert.ok(svg.includes(doc.meta.title));
  assert.ok(svg.includes(doc.meta.subtitle));
  assert.match(svg, /<title>/, 'and it has an accessible name');
});

test('a diagram with no title is saved without a caption or its gap', () => {
  const bare = make({ meta: { title: '', subtitle: '' } });
  const h = Number(/ height="([\d.]+)"/.exec(/<svg [^>]*>/.exec(bare)[0])[1]);
  assert.equal(h, doc.model.bounds.h, 'no caption, no header space');
  assert.equal(bare.includes('fm-caption-title'), false);
});

test('step summaries survive as the viewer\'s own tooltips', () => {
  const svg = make();
  const first = Object.values(doc.details)[0];
  assert.ok(svg.includes(`<title>${first.tooltip}`));
});

test('the pulse is pre-drawn, and a still diagram carries none', () => {
  assert.match(make({ animationMode: 'pulse' }), /offset-path/);
  assert.equal(make({ animationMode: 'off' }).includes('offset-path'), false);
});

test('every style saves', () => {
  for (const styleKey of STYLE_KEYS) {
    const svg = make({ styleKey });
    assert.match(svg, /^<\?xml/, `${styleKey} produced no document`);
    assert.ok(svg.includes('fm-node'), `${styleKey} produced no diagram`);
  }
});

test('the same diagram always saves the same file', () => {
  assert.equal(make(), make());
});
