import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMermaid } from '../src/mermaid.js';

const ids = (src) => parseMermaid(src).nodes.map((n) => n.id);
const pairs = (src) => parseMermaid(src).edges.map((e) => [e.from, e.to]);

test('reads the direction and normalizes TB to TD', () => {
  assert.equal(parseMermaid('flowchart LR\nA-->B').direction, 'LR');
  assert.equal(parseMermaid('graph TB\nA-->B').direction, 'TD');
  assert.equal(parseMermaid('flowchart BT\nA-->B').direction, 'BT');
  assert.equal(parseMermaid('flowchart\nA-->B').direction, 'LR');
});

// Writing edges without spaces is ordinary mermaid, and the samples all happen
// to use spaces, so this went unnoticed: the id scanner swallowed the arrow.
test('a connector written without spaces is not absorbed into the node id', () => {
  assert.deepEqual(ids('flowchart LR\nA-->B'), ['A', 'B']);
  assert.deepEqual(pairs('flowchart LR\nA-->B'), [['A', 'B']]);
  assert.deepEqual(ids('flowchart LR\nA---B'), ['A', 'B']);
  assert.deepEqual(ids('flowchart LR\nA-.->B'), ['A', 'B']);
  assert.deepEqual(ids('flowchart LR\nA==>B'), ['A', 'B']);
  assert.deepEqual(ids('flowchart LR\nA[One]-->B[Two]'), ['A', 'B']);
});

test('a hyphen inside a node id is still allowed', () => {
  assert.deepEqual(ids('flowchart LR\norder-placed --> pick-pack'), ['order-placed', 'pick-pack']);
  assert.deepEqual(pairs('flowchart LR\norder-placed-->pick-pack'), [['order-placed', 'pick-pack']]);
});

test('recognizes every node shape', () => {
  const src = [
    'flowchart LR',
    'a[Rect] --> b(Round)',
    'c([Stadium]) --> d[[Subroutine]]',
    'e[(Cylinder)] --> f((Circle))',
    'g{Rhombus} --> h{{Hexagon}}',
    'i[/Parallelogram/] --> j[/Trapezoid\\]',
    'k(((Double)))',
  ].join('\n');
  assert.deepEqual(Object.fromEntries(parseMermaid(src).nodes.map((n) => [n.id, n.shape])), {
    a: 'rect', b: 'round', c: 'stadium', d: 'subroutine', e: 'cylinder',
    f: 'circle', g: 'rhombus', h: 'hexagon', i: 'parallelogram', j: 'trapezoid',
    k: 'doublecircle',
  });
});

test('a bare id is a rect labelled with itself, and a later definition wins', () => {
  assert.deepEqual(parseMermaid('flowchart LR\nStart --> End').nodes.map((n) => [n.label, n.shape]),
    [['Start', 'rect'], ['End', 'rect']]);
  const { nodes } = parseMermaid('flowchart LR\nA --> B\nB[Real Label]');
  assert.equal(nodes.find((n) => n.id === 'B').label, 'Real Label');
});

test('reads edge labels in both syntaxes', () => {
  const { edges } = parseMermaid('flowchart LR\nA -->|Yes| B\nA -- No --> C');
  assert.equal(edges[0].label, 'Yes');
  assert.equal(edges[1].label, 'No');
});

test('reads edge kinds and arrow variants', () => {
  const { edges } = parseMermaid('flowchart LR\nA --> B\nB -.-> C\nC ==> D\nD --- E\nE <--> F');
  assert.deepEqual(edges.map((e) => [e.kind, e.arrow]), [
    ['solid', 'arrow'], ['dotted', 'arrow'], ['thick', 'arrow'],
    ['solid', 'none'], ['solid', 'bidirectional'],
  ]);
});

test('expands a chained edge into individual edges', () => {
  assert.deepEqual(pairs('flowchart LR\nA --> B --> C'), [['A', 'B'], ['B', 'C']]);
});

test('captures subgraphs and their membership', () => {
  const src = ['flowchart LR', 'subgraph design [Business Design]',
    '  A[Ideate] --> B[Validate]', 'end', 'B --> C[Build]'].join('\n');
  const { subgraphs, nodes } = parseMermaid(src);
  assert.equal(subgraphs.length, 1);
  assert.equal(subgraphs[0].label, 'Business Design');
  assert.deepEqual(subgraphs[0].nodeIds, ['A', 'B']);
  assert.equal(nodes.find((n) => n.id === 'C').subgraph, null);
});

test('records class assignments on nodes', () => {
  const { nodes } = parseMermaid('flowchart LR\nA --> B\nclass A,B hot\nB:::cool');
  assert.deepEqual(nodes.find((n) => n.id === 'A').classes, ['hot']);
  assert.deepEqual(nodes.find((n) => n.id === 'B').classes.slice().sort(), ['cool', 'hot']);
});

test('a self loop is a real edge', () => {
  assert.deepEqual(parseMermaid('flowchart LR\nA --> A').edges,
    [{ from: 'A', to: 'A', label: '', kind: 'solid', arrow: 'arrow' }]);
});

test('an unsupported diagram type warns and names the type', () => {
  const { warnings, nodes } = parseMermaid('sequenceDiagram\n  Alice->>Bob: Hi');
  assert.equal(warnings[0].code, 'UNSUPPORTED_DIAGRAM_TYPE');
  assert.ok(warnings[0].message.includes('sequenceDiagram'));
  assert.deepEqual(nodes, []);
});

test('comments, blank lines, and quoted labels are handled', () => {
  assert.equal(parseMermaid('flowchart LR\n%% a comment\n\nA --> B\n').edges.length, 1);
  assert.equal(parseMermaid('flowchart LR\nA["Ship [expedited]"] --> B').nodes[0].label, 'Ship [expedited]');
});

test('an empty source yields an empty graph', () => {
  const g = parseMermaid('');
  assert.deepEqual(g.nodes, []);
  assert.deepEqual(g.edges, []);
});

test('parsing is deterministic', () => {
  const src = 'flowchart LR\nA[One] -->|go| B{Two}\nB --> A';
  assert.deepEqual(parseMermaid(src), parseMermaid(src));
});

test('an inline class is read on either side of the label', () => {
  const bare = parseMermaid('flowchart LR\nA:::c4 --> B');
  assert.deepEqual(bare.nodes[0].classes, ['c4']);

  // mermaid's own form for a labelled node puts the class after the bracket.
  const labelled = parseMermaid('flowchart LR\nA[Start]:::c4 --> B[End]');
  assert.deepEqual(labelled.nodes[0].classes, ['c4']);
  assert.equal(labelled.nodes[0].label, 'Start');
  assert.deepEqual(labelled.nodes[1].id, 'B');
  assert.deepEqual(labelled.edges.map((e) => [e.from, e.to]), [['A', 'B']]);
});

test('a class after the label does not swallow the connector', () => {
  const g = parseMermaid('flowchart LR\nA[Start]:::icon-money --> B{Choose?}\nB -->|Yes| C[Done]');
  assert.deepEqual(g.nodes.map((n) => n.id), ['A', 'B', 'C']);
  assert.deepEqual(g.nodes[1].shape, 'rhombus');
  assert.equal(g.edges.length, 2);
  assert.deepEqual(g.warnings, []);
});

test('a trailing colon that is not a class is left alone', () => {
  const g = parseMermaid('flowchart LR\nA[Start] --> B[End]');
  assert.deepEqual(g.nodes.map((n) => n.classes), [[], []]);
});
