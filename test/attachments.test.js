import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liftAttachments, bandLayout, directionOf, BAND } from '../src/attachments.js';
import { parseMermaid } from '../src/mermaid.js';
import { layout } from '../src/layout.js';

const lift = (src) => liftAttachments(parseMermaid(src));

const WITH = [
  'flowchart LR',
  'REQ[(Product Request)]:::input --> DRAFT[Draft Design]',
  'CUST[(Customer Record)]:::input --> DRAFT',
  'DRAFT --> SPEC[(Technical Spec)]:::output',
  'DRAFT --> REVIEW{Approved?}',
].join('\n');

const WITHOUT = [
  'flowchart LR',
  'DRAFT[Draft Design] --> REVIEW{Approved?}',
].join('\n');

// --- lifting ---------------------------------------------------------------

test('a tagged node is not a step', () => {
  const { graph } = lift(WITH);
  assert.deepEqual(graph.nodes.map((n) => n.id), ['DRAFT', 'REVIEW']);
});

test('it hangs off the step it is connected to', () => {
  const { attachments } = lift(WITH);
  assert.deepEqual([...attachments.keys()], ['DRAFT']);
  assert.deepEqual(attachments.get('DRAFT').map((a) => [a.id, a.direction]),
    [['REQ', 'in'], ['CUST', 'in'], ['SPEC', 'out']]);
});

test('the arrow decides the direction, since that is what GitHub shows', () => {
  // Tagged as an input but drawn as an outgoing arrow: believe the arrow.
  const { attachments } = lift('flowchart LR\nSTEP[Step] --> THING[(Thing)]:::input');
  assert.equal(attachments.get('STEP')[0].direction, 'out');
});

test('the kind comes from the label, the way a step\'s icon does', () => {
  const { attachments } = lift([
    'flowchart LR',
    'REQ[Product Request]:::input --> STEP[Step]',
    'STEP --> STORE[(Customer Database)]:::output',
  ].join('\n'));
  const [a, b] = attachments.get('STEP');
  assert.equal(a.icon, 'document');
  assert.equal(b.icon, 'database', 'a cylinder is a store, whatever the label says');
});

test('a shape the author chose beats a keyword that lands on the wrong word', () => {
  // "Customer Database" matches person before database if the label is asked
  // first. The cylinder is the author saying what it is.
  const { attachments } = lift('flowchart LR\nSTEP[Step] --> D[(Customer Database)]:::output');
  assert.equal(attachments.get('STEP')[0].icon, 'database');
});

test('an explicit icon still wins over the shape', () => {
  const { attachments } = lift('flowchart LR\nSTEP[Step] --> D[(Vault)]:::output\nclass D icon-lock');
  assert.equal(attachments.get('STEP')[0].icon, 'lock');
});

test('an attachment with no recognisable kind still gets a card', () => {
  const { attachments } = lift('flowchart LR\nX[Zzz Qqq]:::input --> STEP[Step]');
  assert.ok(attachments.get('STEP')[0].icon, 'every card needs an icon');
});

test('the arrows to and from an attachment leave the flow with it', () => {
  const { graph } = lift(WITH);
  assert.deepEqual(graph.edges.map((e) => [e.from, e.to]), [['DRAFT', 'REVIEW']]);
});

test('a diagram with attachments lays out exactly like one without them', () => {
  const a = layout(lift(WITH).graph, {});
  const b = layout(parseMermaid(WITHOUT), {});
  assert.deepEqual(a.nodes.map((n) => [n.id, n.x, n.y]), b.nodes.map((n) => [n.id, n.x, n.y]));
  assert.deepEqual(a.bounds, b.bounds, 'turning attachments on must not move anything');
});

test('an attachment is taken out of the group it was declared in', () => {
  const { graph } = lift([
    'flowchart LR',
    'subgraph one [One]',
    '  REQ[(Request)]:::input --> STEP[Step]',
    'end',
  ].join('\n'));
  assert.deepEqual(graph.subgraphs[0].nodeIds, ['STEP']);
});

test('a diagram with nothing tagged is returned untouched', () => {
  const graph = parseMermaid(WITHOUT);
  const r = liftAttachments(graph);
  assert.equal(r.graph, graph, 'the same object, not a copy');
  assert.equal(r.attachments.size, 0);
  assert.deepEqual(r.warnings, []);
});

// --- what is not an attachment ---------------------------------------------

test('work passing through it makes it a step, and says so', () => {
  const r = lift('flowchart LR\nA[One] --> M[(Middle)]:::input\nM --> B[Two]');
  assert.equal(r.attachments.size, 0);
  assert.ok(r.graph.nodes.some((n) => n.id === 'M'), 'it stays in the flow');
  assert.equal(r.warnings[0].code, 'ATTACHMENT_PASSES_THROUGH');
  assert.ok(r.warnings[0].message.includes('M'));
});

test('one connected to nothing is a step, and says so', () => {
  const r = lift('flowchart LR\nA[One] --> B[Two]\nLOOSE[(Loose)]:::output');
  assert.equal(r.attachments.size, 0);
  assert.equal(r.warnings[0].code, 'ATTACHMENT_NOT_ATTACHED');
});

test('a service used by several steps appears on every one of them', () => {
  const r = lift([
    'flowchart LR',
    'CONTROLS[Controls MCP]:::input --> DRAFT[Draft]',
    'CONTROLS --> CHECK[Check]',
    'CONTROLS --> GATE[Gate]',
    'DRAFT --> CHECK',
  ].join('\n'));
  assert.deepEqual(r.warnings, [], 'a shared service is the ordinary case');
  for (const host of ['DRAFT', 'CHECK', 'GATE']) {
    assert.equal(r.attachments.get(host)?.[0].label, 'Controls MCP', `missing on ${host}`);
    assert.equal(r.attachments.get(host)[0].direction, 'in');
  }
  assert.equal(r.graph.nodes.some((n) => n.id === 'CONTROLS'), false, 'it is still not a step');
});

test('a shared output appears on every step that produces it', () => {
  const r = lift([
    'flowchart LR',
    'A[One] --> LOG[(Audit Log)]:::output',
    'B[Two] --> LOG',
  ].join('\n'));
  assert.equal(r.attachments.get('A')[0].direction, 'out');
  assert.equal(r.attachments.get('B')[0].direction, 'out');
});

test('two attachments wired to each other are steps, and say so', () => {
  const r = lift('flowchart LR\nA[(One)]:::input --> B[(Two)]:::output');
  assert.equal(r.attachments.size, 0);
  assert.equal(r.warnings[0].code, 'ATTACHMENT_CHAIN');
});

test('the tags are recognised however they are written', () => {
  assert.equal(directionOf({ classes: ['input'] }), 'in');
  assert.equal(directionOf({ classes: ['OUTPUT'] }), 'out');
  assert.equal(directionOf({ classes: ['icon-doc'] }), null);
  assert.equal(directionOf({}), null);
  assert.equal(directionOf(null), null);
});

// --- the band --------------------------------------------------------------

const view = { top: 0, bottom: 800, left: 0, right: 1200, width: 1200, height: 800 };
const step = (over = {}) => ({ top: 400, bottom: 470, left: 520, right: 680, width: 160, height: 70, ...over });
const items = (...dirs) => dirs.map((direction, i) => ({ id: `A${i}`, label: `A${i}`, icon: 'document', direction }));

test('the band sits above a flow that reads across', () => {
  const r = bandLayout({ node: step(), viewport: view, items: items('in', 'out') });
  assert.equal(r.side, 'top');
  for (const c of r.cards) assert.ok(c.y + c.h <= step().top, 'a card covers the step');
});

test('inputs sit left of the step and outputs right', () => {
  const r = bandLayout({ node: step(), viewport: view, items: items('in', 'out') });
  const centre = step().left + step().width / 2;
  const inCard = r.cards.find((c) => c.direction === 'in');
  const outCard = r.cards.find((c) => c.direction === 'out');
  assert.ok(inCard.x + inCard.w <= centre, 'the input crosses the middle');
  assert.ok(outCard.x >= centre, 'the output crosses the middle');
});

test('a step near the top puts the band below it instead', () => {
  const r = bandLayout({ node: step({ top: 10, bottom: 80 }), viewport: view, items: items('in') });
  assert.equal(r.side, 'bottom');
  assert.ok(r.cards[0].y >= 80, 'the card still clears the step');
});

test('no card is placed off the edge of the view', () => {
  const r = bandLayout({ node: step({ left: 0, right: 160 }), viewport: view, items: items('in', 'in') });
  for (const c of r.cards) {
    assert.ok(c.x >= view.left, `${c.id} runs off the left`);
    assert.ok(c.x + c.w <= view.right, `${c.id} runs off the right`);
  }
});

test('a vertical flow puts the band to the side', () => {
  const r = bandLayout({ node: step(), viewport: view, items: items('in', 'out'), horizontal: false });
  assert.equal(r.side, 'right');
  for (const c of r.cards) assert.ok(c.x >= step().right, 'a card covers the step');
});

test('cards never overlap each other', () => {
  for (const horizontal of [true, false]) {
    const r = bandLayout({ node: step(), viewport: view, items: items('in', 'in', 'out', 'out'), horizontal });
    for (let i = 0; i < r.cards.length; i += 1) {
      for (let j = i + 1; j < r.cards.length; j += 1) {
        const a = r.cards[i];
        const b = r.cards[j];
        const hit = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        assert.equal(hit, false, `${a.id} overlaps ${b.id}`);
      }
    }
  }
});

test('a busy step is summarised rather than becoming a wall', () => {
  const r = bandLayout({ node: step(), viewport: view, items: items('in', 'in', 'in', 'out', 'out', 'out') });
  assert.equal(r.cards.length, BAND.max);
  assert.equal(r.overflow, 2);
});

test('a step with nothing attached shows no band at all', () => {
  const r = bandLayout({ node: step(), viewport: view, items: [] });
  assert.equal(r.side, null);
  assert.deepEqual(r.cards, []);
});

test('the arrangement is deterministic', () => {
  const args = { node: step(), viewport: view, items: items('in', 'out') };
  assert.deepEqual(bandLayout(args), bandLayout(args));
});

test('a narrow view narrows the cards rather than piling them up', () => {
  const narrow = { top: 0, bottom: 700, left: 0, right: 620, width: 620, height: 700 };
  const r = bandLayout({
    node: { top: 300, bottom: 370, left: 230, right: 390, width: 160, height: 70 },
    viewport: narrow,
    items: items('in', 'in', 'out', 'out'),
  });
  for (let i = 0; i < r.cards.length; i += 1) {
    for (let j = i + 1; j < r.cards.length; j += 1) {
      const a = r.cards[i];
      const b = r.cards[j];
      const hit = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      assert.equal(hit, false, `${a.id} overlaps ${b.id} at ${a.x}/${b.x}`);
    }
  }
  for (const c of r.cards) {
    assert.ok(c.x >= narrow.left, 'a card runs off the left');
    assert.ok(c.x + c.w <= narrow.right, 'a card runs off the right');
    assert.ok(c.w >= BAND.card.min, 'a card was narrowed past readability');
  }
});

test('a card is never narrowed below what a name can sit in', () => {
  const tiny = { top: 0, bottom: 500, left: 0, right: 300, width: 300, height: 500 };
  const r = bandLayout({
    node: { top: 200, bottom: 270, left: 70, right: 230, width: 160, height: 70 },
    viewport: tiny,
    items: items('in', 'in'),
  });
  for (const c of r.cards) assert.equal(c.w, BAND.card.min);
});
