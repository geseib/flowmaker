import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveDocument } from '../src/app.js';
import { DEFAULTS, STYLE_KEYS, DENSITY_KEYS, LOOP_KEYS } from '../src/constants.js';
import { PALETTES } from '../src/palettes.js';

const sample = readFileSync(new URL('../samples/order-processing.md', import.meta.url), 'utf8');

test('a valid document resolves with no warnings', () => {
  const r = resolveDocument(sample);
  assert.deepEqual(r.warnings, []);
  assert.ok(r.model.nodes.length >= 8);
});

test('every resolved meta field is valid and never null', () => {
  const r = resolveDocument('```mermaid\nflowchart LR\nA-->B\n```\n');
  assert.ok(STYLE_KEYS.includes(r.meta.style));
  assert.ok(PALETTES.some((p) => p.key === r.meta.palette));
  assert.ok(DENSITY_KEYS.includes(r.meta.density));
  assert.ok(LOOP_KEYS.includes(r.meta.loops));
  assert.equal(typeof r.meta.title, 'string');
});

test('an invalid frontmatter value falls back with a warning', () => {
  const md = '---\nstyle: nope\npalette: nope\ndensity: huge\nloops: sideways\n---\n\n```mermaid\nflowchart LR\nA-->B\n```\n';
  const r = resolveDocument(md);
  assert.equal(r.meta.style, DEFAULTS.style);
  assert.equal(r.meta.palette, DEFAULTS.palette);
  assert.equal(r.meta.density, DEFAULTS.density);
  assert.equal(r.meta.loops, DEFAULTS.loops);
  assert.equal(r.warnings.filter((w) => w.code === 'INVALID_META_VALUE').length, 4);
});

test('a detail section matching no node is reported by id', () => {
  const md = '```mermaid\nflowchart LR\nA-->B\n```\n\n## A — A\n> Tip.\n\n## ZZZ — Ghost\n> Orphan.\n';
  const w = resolveDocument(md).warnings.find((x) => x.code === 'UNMATCHED_DETAIL');
  assert.ok(w && w.message.includes('ZZZ'));
});

test('a node with no detail section is reported but still renders', () => {
  const md = '```mermaid\nflowchart LR\nA-->B\n```\n\n## A — A\n> Only A.\n';
  const r = resolveDocument(md);
  assert.ok(r.warnings.find((x) => x.code === 'MISSING_DETAIL')?.message.includes('B'));
  assert.equal(r.model.nodes.length, 2);
});

test('an unsupported diagram type surfaces its warning and renders nothing', () => {
  const r = resolveDocument('```mermaid\nsequenceDiagram\nAlice->>Bob: Hi\n```\n');
  assert.ok(r.warnings.some((w) => w.code === 'UNSUPPORTED_DIAGRAM_TYPE'));
  assert.deepEqual(r.model.nodes, []);
});

test('empty input resolves without throwing', () => {
  const r = resolveDocument('');
  assert.ok(r.warnings.some((w) => w.code === 'NO_MERMAID_BLOCK'));
  assert.deepEqual(r.model.nodes, []);
});

test('explicit overrides beat frontmatter', () => {
  const r = resolveDocument(sample, { style: 'bold-brutal', density: 'marquee', loops: 'wrap' });
  assert.equal(r.meta.style, 'bold-brutal');
  assert.equal(r.meta.density, 'marquee');
  assert.equal(r.meta.loops, 'wrap');
  assert.ok(r.model.edges.some((e) => e.isWrap), 'the loops override reaches layout');
});

test('resolution is deterministic', () => {
  assert.deepEqual(resolveDocument(sample), resolveDocument(sample));
});

test('the colouring mode resolves, and an unknown one warns rather than breaking', () => {
  const md = ['---', 'title: T', 'colorBy: level', '---', '', '```mermaid', 'flowchart LR', 'A --> B', '```'].join('\n');
  assert.equal(resolveDocument(md).meta.colorBy, 'level');

  const bad = md.replace('colorBy: level', 'colorBy: rainbow');
  const r = resolveDocument(bad);
  assert.equal(r.meta.colorBy, 'type', 'it falls back to the default');
  assert.ok(r.warnings.some((w) => /colorBy/i.test(w.message ?? '') || /colorBy/i.test(w.code ?? '')));
});

test('a control overrides what the file asked for', () => {
  const md = ['---', 'title: T', 'colorBy: level', '---', '', '```mermaid', 'flowchart LR', 'A --> B', '```'].join('\n');
  assert.equal(resolveDocument(md, { colorBy: 'group' }).meta.colorBy, 'group');
});
