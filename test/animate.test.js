import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walkOrder, ANIMATE_CSS, stepIntervalMs, pulseDurationMs } from '../src/animate.js';
import { SPEEDS, DEFAULT_SPEED } from '../src/constants.js';
import { layout } from '../src/layout.js';
import { parseMermaid } from '../src/mermaid.js';

const model = layout(parseMermaid([
  'flowchart LR',
  'A[Start] --> B{Check}',
  'B -->|Yes| C[Do]',
  'B -->|No| D[Fix]',
  'D --> B',
  'C --> E[End]',
].join('\n')));

// --- the walkthrough order -------------------------------------------------

test('the walk visits every step exactly once', () => {
  const order = walkOrder(model);
  assert.equal(order.length, model.nodes.length);
  assert.equal(new Set(order).size, order.length);
  for (const n of model.nodes) assert.ok(order.includes(n.id), `${n.id} missing from the walk`);
});

test('the walk starts at a source and never moves back a rank', () => {
  const order = walkOrder(model);
  assert.equal(order[0], 'A');
  const rankOf = Object.fromEntries(model.nodes.map((n) => [n.id, n.rank]));
  for (let i = 1; i < order.length; i += 1) {
    assert.ok(rankOf[order[i]] >= rankOf[order[i - 1]], 'the walk must not go backwards');
  }
});

test('a loop does not make the walk infinite', () => {
  assert.equal(walkOrder(model).length, model.nodes.length);
});

test('an empty model yields an empty walk', () => {
  assert.deepEqual(walkOrder({ nodes: [], edges: [] }), []);
});

test('the walk is deterministic', () => {
  assert.deepEqual(walkOrder(model), walkOrder(model));
});

// --- the animation css -----------------------------------------------------

test('the animation css defines the pulse and honours reduced motion', () => {
  assert.ok(ANIMATE_CSS.includes('@keyframes'));
  assert.ok(ANIMATE_CSS.includes('.fm-pulse'));
  assert.ok(ANIMATE_CSS.includes('prefers-reduced-motion'));
  assert.equal(/https?:\/\//.test(ANIMATE_CSS), false);
});

// --- playback speed --------------------------------------------------------

test('the offered speeds are the ones the controls show', () => {
  assert.deepEqual(SPEEDS, [0.5, 1, 2]);
  assert.ok(SPEEDS.includes(DEFAULT_SPEED));
});

test('doubling the speed halves the step interval and the pulse duration', () => {
  for (const density of ['marquee', 'standard', 'compact']) {
    assert.equal(stepIntervalMs(density, 2), stepIntervalMs(density, 1) / 2);
    assert.equal(stepIntervalMs(density, 0.5), stepIntervalMs(density, 1) * 2);
    assert.equal(pulseDurationMs(density, 2), pulseDurationMs(density, 1) / 2);
  }
});

test('a marquee walkthrough dwells longer on each step than a compact one', () => {
  assert.ok(stepIntervalMs('marquee', 1) > stepIntervalMs('compact', 1));
});

test('a nonsensical speed falls back to normal rather than freezing or racing', () => {
  for (const bad of [0, -3, NaN, undefined, 'fast']) {
    assert.equal(stepIntervalMs('standard', bad), stepIntervalMs('standard', 1));
  }
  assert.ok(stepIntervalMs('standard', 10000) >= stepIntervalMs('standard', 8));
});

test('an unknown density falls back to the standard timing', () => {
  assert.equal(stepIntervalMs('enormous', 1), stepIntervalMs('standard', 1));
  assert.equal(pulseDurationMs(undefined, 1), pulseDurationMs('standard', 1));
});
