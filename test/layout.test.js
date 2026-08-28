import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layout, removeCycles, assignRanks, orderRanks } from '../src/layout.js';
import { parseMermaid } from '../src/mermaid.js';
import { readdirSync, readFileSync } from 'node:fs';
import { resolveDocument } from '../src/app.js';

const build = (src, opts = {}) => layout(parseMermaid(src), opts);
const byId = (m, id) => m.nodes.find((n) => n.id === id);
const overlaps = (a, b) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const chain = (n) => ['flowchart LR', ...Array.from({ length: n - 1 }, (_, i) =>
  `N${i} --> N${i + 1}`)].join('\n');

// --- ranking and cycles ----------------------------------------------------

test('an acyclic graph keeps every edge as a forward edge', () => {
  const g = parseMermaid('flowchart LR\nA --> B --> C');
  const { forward, back } = removeCycles(g.nodes, g.edges);
  assert.equal(forward.length, 2);
  assert.deepEqual(back, []);
});

test('a cycle contributes exactly one back edge', () => {
  const g = parseMermaid('flowchart LR\nA --> B --> C\nC --> A');
  const { forward, back } = removeCycles(g.nodes, g.edges);
  assert.equal(forward.length, 2);
  assert.equal(back.length, 1);
  assert.deepEqual([back[0].from, back[0].to], ['C', 'A']);
});

test('a self loop is a back edge and never reaches ranking', () => {
  const g = parseMermaid('flowchart LR\nA --> A');
  const { forward, back } = removeCycles(g.nodes, g.edges);
  assert.deepEqual(forward, []);
  assert.equal(back.length, 1);
});

test('longest-path ranking puts a node after all of its predecessors', () => {
  const g = parseMermaid('flowchart LR\nA --> B\nA --> C\nB --> D\nC --> D\nA --> D');
  const { forward } = removeCycles(g.nodes, g.edges);
  const ranks = assignRanks(g.nodes, forward);
  assert.equal(ranks.get('A'), 0);
  assert.equal(ranks.get('B'), 1);
  assert.equal(ranks.get('D'), 2, 'the long path wins over the direct A->D edge');
});

test('ordering assigns every node an integer lane', () => {
  const g = parseMermaid('flowchart LR\nA1 --> B2\nA2 --> B1\nA1 --> B1\nA2 --> B2');
  const { forward } = removeCycles(g.nodes, g.edges);
  const order = orderRanks(g.nodes, forward, assignRanks(g.nodes, forward));
  assert.equal(order.size, g.nodes.length);
  for (const v of order.values()) assert.equal(Number.isInteger(v), true);
});

// --- placement -------------------------------------------------------------

test('LR places later ranks strictly to the right', () => {
  const m = build('flowchart LR\nA[Start] --> B[Middle] --> C[End]');
  assert.ok(byId(m, 'A').x + byId(m, 'A').w <= byId(m, 'B').x);
  assert.ok(byId(m, 'B').x + byId(m, 'B').w <= byId(m, 'C').x);
});

test('RL and BT mirror LR and TD', () => {
  assert.ok(byId(build('flowchart LR\nA --> B'), 'A').x < byId(build('flowchart LR\nA --> B'), 'B').x);
  const rl = build('flowchart RL\nA --> B');
  assert.ok(byId(rl, 'A').x > byId(rl, 'B').x);
  const bt = build('flowchart BT\nA --> B');
  assert.ok(byId(bt, 'A').y > byId(bt, 'B').y);
});

test('no two nodes overlap in a branching graph', () => {
  const m = build('flowchart LR\nA --> B\nA --> C\nA --> D\nB --> E\nC --> E\nD --> E');
  for (let i = 0; i < m.nodes.length; i += 1) {
    for (let j = i + 1; j < m.nodes.length; j += 1) {
      assert.equal(overlaps(m.nodes[i], m.nodes[j]), false,
        `${m.nodes[i].id} overlaps ${m.nodes[j].id}`);
    }
  }
});

test('bounds contain every node and nothing is placed negative', () => {
  const m = build('flowchart LR\nsubgraph s [Lane]\nA --> B\nend\nB --> C\nC --> A');
  for (const n of m.nodes) {
    assert.ok(n.x >= 0 && n.y >= 0, `${n.id} has a negative coordinate`);
    assert.ok(n.x + n.w <= m.bounds.w + 0.5);
    assert.ok(n.y + n.h <= m.bounds.h + 0.5);
  }
});

test('a subgraph box encloses every one of its members', () => {
  const m = build(['flowchart LR', 'subgraph sdlc [SDLC]', 'B[Build] --> T[Test]', 'end',
    'A[Plan] --> B', 'T --> D[Deploy]'].join('\n'));
  const box = m.subgraphs.find((s) => s.id === 'sdlc');
  for (const id of ['B', 'T']) {
    const n = byId(m, id);
    assert.ok(n.x >= box.x && n.x + n.w <= box.x + box.w, `${id} escapes horizontally`);
    assert.ok(n.y >= box.y && n.y + n.h <= box.y + box.h, `${id} escapes vertically`);
  }
});

test('marquee nodes are larger than compact ones', () => {
  const big = build('flowchart LR\nA[Reserve Inventory] --> B', { density: 'marquee' });
  const small = build('flowchart LR\nA[Reserve Inventory] --> B', { density: 'compact' });
  assert.ok(byId(big, 'A').w > byId(small, 'A').w);
  assert.ok(byId(big, 'A').h > byId(small, 'A').h);
});

test('reserving icon space makes nodes taller, and only when asked', () => {
  const src = 'flowchart LR\nA[Capture Payment] --> B[Ship Order]';
  const plain = build(src);
  const withIcons = build(src, { iconSpace: true });
  assert.ok(byId(withIcons, 'A').h > byId(plain, 'A').h, 'the icon and its ring need room');
});

// --- loop-backs ------------------------------------------------------------

test('a short loop stays a real line in the gutter', () => {
  const m = build('flowchart LR\nA --> B --> C\nC --> B');
  const back = m.edges.find((e) => e.isBackEdge);
  assert.equal(back.isWrap, false, 'one rank back is easy to follow as a line');
  const lowest = Math.max(...m.nodes.map((n) => n.y + n.h));
  const ys = [...back.path.matchAll(/-?\d+(?:\.\d+)?[ ,](-?\d+(?:\.\d+)?)/g)].map((mm) => Number(mm[1]));
  assert.ok(Math.max(...ys) > lowest, 'it must dip below every node');
});

test('a long loop becomes a matching pair of tagged connectors', () => {
  const m = build(`${chain(6)}\nN5 --> N0`);
  const back = m.edges.find((e) => e.isBackEdge);
  assert.equal(back.isWrap, true, 'five ranks back is a wrap, not a line');
  assert.equal(back.wrapTags.length, 2);
  assert.deepEqual(back.wrapTags.map((t) => t.role), ['out', 'in']);
  assert.equal(back.wrapTags[0].tag, back.wrapTags[1].tag, 'both ends share one letter');
  assert.match(back.tag, /^[A-Z]$/);
});

test('the wrap connector anchors under its own two nodes, not across the diagram', () => {
  const m = build(`${chain(6)}\nN5 --> N0`);
  const back = m.edges.find((e) => e.isWrap);
  const [out, into] = back.wrapTags;
  const source = byId(m, 'N5');
  const target = byId(m, 'N0');
  assert.ok(Math.abs(out.x - (source.x + source.w / 2)) < 1, 'the out tag sits under its source');
  assert.ok(Math.abs(into.x - (target.x + target.w / 2)) < 1, 'the in tag sits under its target');
  assert.ok(out.y > source.y + source.h, 'tags hang below the flow');
});

test('several long loops each get their own letter', () => {
  const m = build(`${chain(8)}\nN7 --> N0\nN6 --> N1`);
  const wraps = m.edges.filter((e) => e.isWrap);
  assert.equal(wraps.length, 2);
  assert.notEqual(wraps[0].tag, wraps[1].tag);
});

test('wrap tags stay inside the diagram bounds', () => {
  const m = build(`${chain(7)}\nN6 --> N0`);
  for (const e of m.edges.filter((x) => x.isWrap)) {
    for (const t of e.wrapTags) {
      assert.ok(t.y + (e.tagRadius ?? 0) <= m.bounds.h + 0.5, 'a tag must not fall outside the canvas');
      assert.ok(t.x >= 0 && t.x <= m.bounds.w);
    }
  }
});

test('loops: line forces even a long loop to stay a real line', () => {
  const m = build(`${chain(8)}\nN7 --> N0`, { loops: 'line' });
  const back = m.edges.find((e) => e.isBackEdge);
  assert.equal(back.isWrap, false);
  assert.ok(back.path.length > 6);
});

test('loops: wrap forces even a one-rank loop into tagged connectors', () => {
  const m = build('flowchart LR\nA --> B --> C\nC --> B', { loops: 'wrap' });
  const back = m.edges.find((e) => e.isBackEdge);
  assert.equal(back.isWrap, true);
  assert.equal(back.wrapTags.length, 2);
});

test('loops: auto is the threshold behaviour and is the default', () => {
  const src = `${chain(8)}\nN7 --> N0\nN2 --> N1`;
  assert.deepEqual(build(src), build(src, { loops: 'auto' }));
  const m = build(src);
  assert.equal(m.edges.filter((e) => e.isWrap).length, 1, 'only the long loop wraps');
  assert.equal(m.edges.filter((e) => e.isBackEdge && !e.isWrap).length, 1);
});

test('every edge produces a non-empty path, wrapped or not', () => {
  const m = build(`${chain(6)}\nN5 --> N0\nN2 --> N1`);
  for (const e of m.edges) {
    assert.ok(e.path.startsWith('M'), `${e.from}->${e.to} has no path`);
  }
});

test('layout is deterministic', () => {
  const src = `${chain(6)}\nN5 --> N0\nN2 --> N1`;
  assert.deepEqual(build(src), build(src));
});

test('an empty graph yields empty, valid bounds', () => {
  const m = layout({ direction: 'LR', nodes: [], edges: [], subgraphs: [], warnings: [] });
  assert.deepEqual(m.nodes, []);
  assert.ok(m.bounds.w >= 0 && m.bounds.h >= 0);
});

// --- nested groups ---------------------------------------------------------

const boxesOf = (src) => {
  const model = layout(parseMermaid(src), {});
  return {
    model,
    boxes: model.subgraphs.filter((s) => s.w > 0),
    by: Object.fromEntries(model.subgraphs.map((s) => [s.id, s])),
  };
};
const contains = (p, c) => c.x >= p.x && c.y >= p.y && c.x + c.w <= p.x + p.w && c.y + c.h <= p.y + p.h;
const boxesTouch = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const NESTED = [
  'flowchart LR',
  'subgraph outer [Outer]',
  '  subgraph inner [Inner]',
  '    A[One] --> B[Two]',
  '  end',
  '  B --> C[Three]',
  'end',
  'C --> D[Four]',
].join('\n');

test('a group declared inside another records which one', () => {
  const { by } = boxesOf(NESTED);
  assert.equal(by.inner.parent, 'outer');
  assert.equal(by.outer.parent, null);
});

test('a group is drawn around the groups nested in it, not beside them', () => {
  const { by } = boxesOf(NESTED);
  assert.ok(contains(by.outer, by.inner), 'the inner box escapes its parent');
});

test('the two borders do not touch, so the nesting is visible', () => {
  const { by } = boxesOf(NESTED);
  assert.ok(by.inner.x - by.outer.x >= 12, 'no clearance on the left');
  assert.ok((by.outer.x + by.outer.w) - (by.inner.x + by.inner.w) >= 12, 'none on the right');
  assert.ok(by.inner.y - by.outer.y >= 12, 'the parent label has nowhere to sit');
});

test('a group holds its own steps as well as its nested groups', () => {
  const { model, by } = boxesOf(NESTED);
  const node = (id) => model.nodes.find((n) => n.id === id);
  for (const id of ['A', 'B']) assert.ok(contains(by.inner, node(id)), `${id} is outside inner`);
  for (const id of ['A', 'B', 'C']) assert.ok(contains(by.outer, node(id)), `${id} is outside outer`);
});

test('a step outside every group stays outside them', () => {
  const { model, by } = boxesOf(NESTED);
  const d = model.nodes.find((n) => n.id === 'D');
  assert.equal(boxesTouch(by.outer, d), false, 'D was swept into a group it is not in');
});

test('nesting goes as deep as it is written', () => {
  const { by } = boxesOf([
    'flowchart LR',
    'subgraph a [A]',
    '  subgraph b [B]',
    '    subgraph c [C]',
    '      X[One] --> Y[Two]',
    '    end',
    '  end',
    'end',
  ].join('\n'));
  assert.ok(contains(by.b, by.c), 'C escapes B');
  assert.ok(contains(by.a, by.b), 'B escapes A');
  assert.equal(by.a.depth, 2);
  assert.equal(by.c.depth, 0);
});

test('groups that are not nested do not overlap each other', () => {
  const { boxes } = boxesOf([
    'flowchart LR',
    'subgraph one [One]', '  A --> B', 'end',
    'subgraph two [Two]', '  C --> D', 'end',
    'B --> C',
  ].join('\n'));
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      if (contains(a, b) || contains(b, a)) continue;
      assert.equal(boxesTouch(a, b), false, `${a.id} overlaps ${b.id} without containing it`);
    }
  }
});

test('a group declared inside itself is drawn rather than hanging the layout', () => {
  const graph = parseMermaid('flowchart LR\nsubgraph a [A]\n  X --> Y\nend');
  graph.subgraphs[0].parent = 'a';
  const model = layout(graph, {});
  assert.equal(model.subgraphs.length, 1);
  assert.ok(model.subgraphs[0].w > 0);
});

test('every sample keeps its nested groups inside their parents', () => {
  const dir = new URL('../samples/', import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const doc = resolveDocument(readFileSync(new URL(file, dir), 'utf8'));
    const by = Object.fromEntries(doc.model.subgraphs.map((s) => [s.id, s]));
    const boxes = doc.model.subgraphs.filter((s) => s.w > 0);
    for (const b of boxes) {
      if (b.parent && by[b.parent]) {
        assert.ok(contains(by[b.parent], b), `${file}: ${b.id} escapes ${b.parent}`);
      }
    }
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        if (contains(a, b) || contains(b, a)) continue;
        assert.equal(boxesTouch(a, b), false, `${file}: ${a.id} overlaps ${b.id}`);
      }
    }
  }
});
