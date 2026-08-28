import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toneOf, kindOf, tagsOf, tagOrder, TONE_COUNT } from '../src/tone.js';
import { COLOR_BY_KEYS } from '../src/constants.js';

const node = (over = {}) => ({ id: 'A', shape: 'rect', rank: 0, subgraph: null, classes: [], ...over });

test('by default the shape decides, which is how the diagrams read today', () => {
  assert.equal(toneOf(node({ shape: 'rect' })), 1);
  assert.equal(toneOf(node({ shape: 'rhombus' })), 2, 'a decision');
  assert.equal(toneOf(node({ shape: 'hexagon' })), 2);
  assert.equal(toneOf(node({ shape: 'stadium' })), 3, 'a terminal');
  assert.equal(toneOf(node({ shape: 'circle' })), 3);
});

test('by level, each tier of a hierarchy wears its own swatch', () => {
  const at = (rank) => toneOf(node({ rank }), 'level');
  assert.deepEqual([0, 1, 2, 3].map(at), [1, 2, 3, 4]);
});

test('a hierarchy deeper than the palette starts the swatches over', () => {
  assert.equal(toneOf(node({ rank: 4 }), 'level'), 1);
  assert.equal(toneOf(node({ rank: 5 }), 'level'), 2);
});

test('by level the shape no longer decides, so a decision joins its tier', () => {
  assert.equal(toneOf(node({ shape: 'rhombus', rank: 0 }), 'level'), 1);
});

test('by group, each lane wears its own swatch', () => {
  const model = { subgraphs: [{ id: 'DESIGN' }, { id: 'BUILD' }, { id: 'SHIP' }] };
  assert.equal(toneOf(node({ subgraph: 'DESIGN' }), 'group', model), 1);
  assert.equal(toneOf(node({ subgraph: 'BUILD' }), 'group', model), 2);
  assert.equal(toneOf(node({ subgraph: 'SHIP' }), 'group', model), 3);
});

test('a node in no lane keeps the flow colour rather than joining one', () => {
  const model = { subgraphs: [{ id: 'DESIGN' }] };
  assert.equal(toneOf(node({ subgraph: null }), 'group', model), 1);
  assert.equal(toneOf(node({ subgraph: 'GONE' }), 'group', model), 1);
});

test('grouping with no lanes at all is still valid, and uniform', () => {
  assert.equal(toneOf(node(), 'group', { subgraphs: [] }), 1);
  assert.equal(toneOf(node(), 'group', null), 1);
});

test('an explicit :::c4 beats every mode', () => {
  const forced = node({ classes: ['c4'], shape: 'rhombus', rank: 0 });
  for (const mode of COLOR_BY_KEYS) assert.equal(toneOf(forced, mode, { subgraphs: [] }), 4);
});

test('an unrelated class is not mistaken for a colour', () => {
  assert.equal(toneOf(node({ classes: ['icon-money'], shape: 'rect' })), 1);
  assert.equal(toneOf(node({ classes: ['c9'], shape: 'rect' })), 1);
  assert.equal(toneOf(node({ classes: ['cc1'], shape: 'rect' })), 1);
});

test('every mode returns a swatch the palette actually has', () => {
  const model = { subgraphs: [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }, { id: 'E' }] };
  for (const mode of COLOR_BY_KEYS) {
    for (let rank = 0; rank < 9; rank += 1) {
      for (const sg of [null, 'A', 'C', 'E']) {
        const t = toneOf(node({ rank, subgraph: sg }), mode, model);
        assert.ok(Number.isInteger(t) && t >= 1 && t <= TONE_COUNT, `${mode} produced ${t}`);
      }
    }
  }
});

test('an unknown mode falls back to the shape rather than failing', () => {
  assert.equal(toneOf(node({ shape: 'rhombus' }), 'nonsense'), 2);
});

test('the shape kinds are unchanged', () => {
  assert.equal(kindOf('rect'), 'process');
  assert.equal(kindOf('rhombus'), 'decision');
  assert.equal(kindOf('stadium'), 'terminal');
  assert.equal(kindOf('whatever'), 'process');
});

// --- the author's own categories -------------------------------------------

const tagged = (id, tag, over = {}) => node({ id, classes: tag ? [tag] : [], ...over });
const withNodes = (...nodes) => ({ nodes, subgraphs: [] });

test('by tag, each category the author named gets its own swatch', () => {
  const m = withNodes(tagged('A', 'vp'), tagged('B', 'employee'), tagged('C', 'contractor'));
  assert.equal(toneOf(m.nodes[0], 'tag', m), 1);
  assert.equal(toneOf(m.nodes[1], 'tag', m), 2);
  assert.equal(toneOf(m.nodes[2], 'tag', m), 3);
});

test('the same tag is the same colour wherever it appears', () => {
  const m = withNodes(tagged('A', 'vp'), tagged('B', 'employee'), tagged('C', 'vp'));
  assert.equal(toneOf(m.nodes[0], 'tag', m), toneOf(m.nodes[2], 'tag', m));
  assert.notEqual(toneOf(m.nodes[1], 'tag', m), toneOf(m.nodes[0], 'tag', m));
});

test('tags are coloured in the order they first appear, not alphabetically', () => {
  const m = withNodes(tagged('A', 'zulu'), tagged('B', 'alpha'));
  assert.equal(toneOf(m.nodes[0], 'tag', m), 1, 'zulu appears first, so zulu is c1');
  assert.equal(toneOf(m.nodes[1], 'tag', m), 2);
});

test('an untagged node keeps the flow colour rather than joining a category', () => {
  const m = withNodes(tagged('A', 'vp'), tagged('B', null));
  assert.equal(toneOf(m.nodes[1], 'tag', m), 1);
});

test('more categories than swatches start the swatches over', () => {
  const m = withNodes(...['a', 'b', 'c', 'd', 'e'].map((t, i) => tagged(`N${i}`, t)));
  assert.deepEqual(m.nodes.map((n) => toneOf(n, 'tag', m)), [1, 2, 3, 4, 1]);
});

test('an icon or a pinned swatch is not mistaken for a tag', () => {
  assert.deepEqual(tagsOf(node({ classes: ['icon-money', 'c3', 'vp'] })), ['vp']);
  assert.deepEqual(tagsOf(node({ classes: ['c1', 'icon-database'] })), []);
});

test('a pinned swatch still beats the tag it also carries', () => {
  const m = withNodes(node({ id: 'A', classes: ['vp'] }), node({ id: 'B', classes: ['employee', 'c4'] }));
  assert.equal(toneOf(m.nodes[1], 'tag', m), 4);
});

test('the tag order is stable, and reads as the legend would', () => {
  const m = withNodes(tagged('A', 'vp'), tagged('B', 'employee'), tagged('C', 'vp'));
  assert.deepEqual(tagOrder(m), ['vp', 'employee']);
  assert.deepEqual(tagOrder(m), tagOrder(m));
});

test('a diagram with no tags at all is uniform rather than broken', () => {
  const m = withNodes(node({ id: 'A' }), node({ id: 'B' }));
  assert.deepEqual(tagOrder(m), []);
  assert.deepEqual(m.nodes.map((n) => toneOf(n, 'tag', m)), [1, 1]);
});
