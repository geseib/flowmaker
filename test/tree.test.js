import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inspectTree, treeLayout } from '../src/tree.js';
import { layout } from '../src/layout.js';
import { parseMermaid } from '../src/mermaid.js';
import { resolveDocument } from '../src/app.js';

const chart = (src) => treeLayout(parseMermaid(src), {});
const centre = (m, id) => {
  const n = m.nodes.find((x) => x.id === id);
  return n.x + n.w / 2;
};
const ORG = [
  'flowchart TD',
  'CEO[Chief Executive] --> CTO[Technology]',
  'CEO --> COO[Operations]',
  'CTO --> PLAT[Platform]',
  'CTO --> PROD[Product]',
  'CTO --> SEC[Security]',
  'COO --> SUP[Support]',
].join('\n');

// --- what counts as a hierarchy -------------------------------------------

test('a tree is recognised, with its root', () => {
  const r = inspectTree(parseMermaid(ORG));
  assert.equal(r.ok, true);
  assert.deepEqual(r.roots.map((n) => n.id), ['CEO']);
});

test('a box reporting to two others is not a hierarchy, and says which', () => {
  const r = inspectTree(parseMermaid('flowchart TD\nA --> C\nB --> C'));
  assert.equal(r.ok, false);
  assert.equal(r.code, 'MULTIPLE_PARENTS');
  assert.ok(r.message.includes('C'));
});

test('a cycle is not a hierarchy, and names what is stranded', () => {
  const r = inspectTree(parseMermaid('flowchart TD\nROOT --> A\nA --> B\nB --> A'));
  assert.equal(r.ok, false);
  assert.ok(['CYCLE', 'MULTIPLE_PARENTS'].includes(r.code));
});

test('a box reporting to itself is rejected', () => {
  const r = inspectTree(parseMermaid('flowchart TD\nA --> A'));
  assert.equal(r.ok, false);
  assert.equal(r.code, 'SELF_LINK');
});

test('a chart with no top is rejected', () => {
  const r = inspectTree(parseMermaid('flowchart TD\nA --> B\nB --> A'));
  assert.equal(r.ok, false);
  assert.ok(['NO_ROOT', 'CYCLE'].includes(r.code));
});

test('several roots are a forest, which is still a chart', () => {
  const r = inspectTree(parseMermaid('flowchart TD\nA --> A1\nB --> B1'));
  assert.equal(r.ok, true);
  assert.deepEqual(r.roots.map((n) => n.id).sort(), ['A', 'B']);
});

// --- how it is arranged ----------------------------------------------------

test('every box hangs over the middle of its first and last report', () => {
  const m = chart(ORG);
  assert.ok(Math.abs(centre(m, 'CEO') - (centre(m, 'CTO') + centre(m, 'COO')) / 2) < 0.5);
  assert.ok(Math.abs(centre(m, 'CTO') - (centre(m, 'PLAT') + centre(m, 'SEC')) / 2) < 0.5);
  assert.ok(Math.abs(centre(m, 'COO') - centre(m, 'SUP')) < 0.5, 'a single report sits directly beneath');
});

test('depth becomes the level, and levels do not interleave', () => {
  const m = chart(ORG);
  const byId = Object.fromEntries(m.nodes.map((n) => [n.id, n]));
  assert.equal(byId.CEO.rank, 0);
  assert.equal(byId.CTO.rank, 1);
  assert.equal(byId.PLAT.rank, 2);
  assert.ok(byId.CEO.y + byId.CEO.h <= byId.CTO.y, 'a level clears the one above it');
  assert.ok(byId.CTO.y + byId.CTO.h <= byId.PLAT.y);
});

test('no two boxes overlap', () => {
  const m = chart(ORG);
  for (let i = 0; i < m.nodes.length; i += 1) {
    for (let j = i + 1; j < m.nodes.length; j += 1) {
      const a = m.nodes[i];
      const b = m.nodes[j];
      const hit = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      assert.equal(hit, false, `${a.id} overlaps ${b.id}`);
    }
  }
});

test('siblings sit in the order they are declared', () => {
  const m = chart(ORG);
  assert.ok(centre(m, 'PLAT') < centre(m, 'PROD'));
  assert.ok(centre(m, 'PROD') < centre(m, 'SEC'));
});

test('every reporting line is drawn, and none is a loop', () => {
  const m = chart(ORG);
  assert.equal(m.edges.length, 6);
  for (const e of m.edges) {
    assert.ok(e.path.startsWith('M'), `${e.from}->${e.to} has no line`);
    assert.equal(e.isBackEdge, false, 'a hierarchy has no loop-backs');
    assert.equal(e.isWrap, false);
  }
});

test('bounds hold every box', () => {
  const m = chart(ORG);
  for (const n of m.nodes) {
    assert.ok(n.x >= 0 && n.y >= 0, `${n.id} is placed off the canvas`);
    assert.ok(n.x + n.w <= m.bounds.w + 0.5);
    assert.ok(n.y + n.h <= m.bounds.h + 0.5);
  }
});

test('a sideways chart runs across instead of down', () => {
  const m = treeLayout(parseMermaid(ORG), { direction: 'LR' });
  const byId = Object.fromEntries(m.nodes.map((n) => [n.id, n]));
  assert.ok(byId.CEO.x + byId.CEO.w <= byId.CTO.x, 'levels run left to right');
  assert.ok(Math.abs((byId.CEO.y + byId.CEO.h / 2)
    - ((byId.CTO.y + byId.CTO.h / 2) + (byId.COO.y + byId.COO.h / 2)) / 2) < 0.5);
});

test('a name and a role on separate lines make a taller box', () => {
  const one = chart('flowchart TD\nA[Dana Reyes] --> B[X]');
  const two = chart('flowchart TD\nA["Dana Reyes<br/>Chief Executive"] --> B[X]');
  assert.ok(two.nodes[0].h > one.nodes[0].h, 'the forced break needs a second line');
});

test('the arrangement is deterministic', () => {
  assert.deepEqual(chart(ORG), chart(ORG));
});

// --- falling back ----------------------------------------------------------

test('asking for a chart of something that is not one warns and still draws it', () => {
  const warnings = [];
  const graph = parseMermaid('flowchart TD\nA --> C\nB --> C');
  const m = layout(graph, { layout: 'tree', onWarning: (w) => warnings.push(w) });
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, 'NOT_A_HIERARCHY');
  assert.ok(warnings[0].message.includes('C'));
  assert.equal(m.nodes.length, 3, 'it still renders, as a flow');
  assert.notEqual(m.layout, 'tree');
});

test('the org chart sample resolves as a hierarchy with no warnings', () => {
  const md = readFileSync(new URL('../samples/org-chart.md', import.meta.url), 'utf8');
  const r = resolveDocument(md);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.meta.layout, 'tree');
  assert.equal(r.model.layout, 'tree');
  assert.ok(r.model.nodes.length >= 10);
  const root = r.model.nodes.find((n) => n.rank === 0);
  assert.equal(root.id, 'CEO');
});
