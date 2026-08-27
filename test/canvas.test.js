import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fitScale, shouldReflowVertical, advanceScroll, nearestNodeId,
  CANVAS_CSS, MIN_ZOOM, MAX_ZOOM, NARROW_BREAKPOINT,
} from '../src/canvas.js';

test('fit width scales the bounds to the viewport width', () => {
  assert.ok(Math.abs(fitScale({ w: 2000, h: 500 }, { w: 1000, h: 800 }, 'width') - 0.484) < 0.02);
});

test('fit height scales the bounds to the viewport height', () => {
  assert.ok(Math.abs(fitScale({ w: 2000, h: 800 }, { w: 1000, h: 400 }, 'height') - 0.46) < 0.02);
});

test('fit both takes the more constraining axis', () => {
  const s = fitScale({ w: 2000, h: 2000 }, { w: 1000, h: 400 }, 'both');
  assert.ok(s <= 0.21, `expected the height constraint to win, got ${s}`);
});

test('scale is clamped to the zoom range', () => {
  assert.equal(fitScale({ w: 100000, h: 10 }, { w: 100, h: 100 }, 'width'), MIN_ZOOM);
  assert.equal(fitScale({ w: 10, h: 10 }, { w: 100000, h: 100000 }, 'width'), MAX_ZOOM);
});

test('degenerate bounds do not produce NaN or Infinity', () => {
  for (const bounds of [{ w: 0, h: 0 }, { w: 0, h: 100 }, { w: 100, h: 0 }]) {
    const s = fitScale(bounds, { w: 800, h: 600 }, 'both');
    assert.ok(Number.isFinite(s), `got ${s} for ${JSON.stringify(bounds)}`);
    assert.ok(s >= MIN_ZOOM && s <= MAX_ZOOM);
  }
});

test('a narrow viewport with a wide flow triggers vertical reflow', () => {
  assert.equal(shouldReflowVertical(390, { w: 4200, h: 400 }), true);
  assert.equal(shouldReflowVertical(1600, { w: 4200, h: 400 }), false);
  assert.equal(shouldReflowVertical(NARROW_BREAKPOINT + 1, { w: 4200, h: 400 }), false);
});

test('a narrow viewport with an already-narrow flow does not reflow', () => {
  assert.equal(shouldReflowVertical(390, { w: 360, h: 900 }), false);
});

test('the canvas css defines pan, scroll, and the narrow breakpoint', () => {
  assert.ok(CANVAS_CSS.includes('overflow'));
  assert.ok(CANVAS_CSS.includes('.fm-canvas'));
  assert.ok(CANVAS_CSS.includes(`${NARROW_BREAKPOINT}px`));
  assert.equal(/https?:\/\//.test(CANVAS_CSS), false);
});

// --- the auto-scroll crawl -------------------------------------------------

const step = (over = {}) => advanceScroll({
  pos: 0, dir: 1, max: 1000, dt: 1 / 60, speed: 60, now: 1000, holdUntil: 0, ...over,
});

test('the crawl advances by speed times elapsed time', () => {
  const r = step();
  assert.ok(Math.abs(r.pos - 1) < 0.001, `expected 1px after 1/60s at 60px/s, got ${r.pos}`);
  assert.equal(r.moved, true);
});

test('sub-pixel steps accumulate instead of being lost', () => {
  // The bug this guards: at 120Hz each step is under a pixel, and rounding it
  // into scrollLeft every frame would leave the crawl permanently at zero.
  let pos = 0;
  let dir = 1;
  let holdUntil = 0;
  for (let i = 0; i < 240; i += 1) {
    const r = advanceScroll({ pos, dir, max: 1000, dt: 1 / 120, speed: 60, now: 1000 + i, holdUntil });
    pos = r.pos;
    dir = r.dir;
    holdUntil = r.holdUntil;
  }
  assert.ok(pos > 110 && pos < 130, `expected roughly 120px after 2s at 60px/s, got ${pos}`);
});

test('reaching the end reverses direction and starts a hold', () => {
  const r = step({ pos: 999.5, dt: 1, speed: 60, now: 5000 });
  assert.equal(r.pos, 1000);
  assert.equal(r.dir, -1);
  assert.ok(r.holdUntil > 5000, 'must hold at the end before travelling back');
});

test('reaching the start reverses direction and starts a hold', () => {
  const r = step({ pos: 0.5, dir: -1, dt: 1, speed: 60, now: 5000 });
  assert.equal(r.pos, 0);
  assert.equal(r.dir, 1);
  assert.ok(r.holdUntil > 5000);
});

test('the crawl does not move while holding at an end', () => {
  const r = step({ pos: 1000, dir: -1, now: 5000, holdUntil: 6000 });
  assert.equal(r.moved, false);
  assert.equal(r.pos, 1000);
});

test('the hold expires and travel resumes', () => {
  const r = step({ pos: 1000, dir: -1, now: 6001, holdUntil: 6000, dt: 1, speed: 60 });
  assert.equal(r.moved, true);
  assert.ok(r.pos < 1000, 'should be travelling back');
});

test('a flow that fits entirely on screen never crawls', () => {
  const r = step({ max: 0 });
  assert.equal(r.moved, false);
  assert.equal(r.pos, 0);
});

test('the crawl ping-pongs rather than running away', () => {
  let pos = 0;
  let dir = 1;
  let holdUntil = 0;
  let now = 0;
  let reversals = 0;
  for (let i = 0; i < 4000; i += 1) {
    now += 16;
    const r = advanceScroll({ pos, dir, max: 500, dt: 0.016, speed: 300, now, holdUntil });
    if (r.dir !== dir) reversals += 1;
    pos = r.pos;
    dir = r.dir;
    holdUntil = r.holdUntil;
    assert.ok(pos >= 0 && pos <= 500, `escaped the range at ${pos}`);
  }
  assert.ok(reversals >= 2, `expected several reversals, saw ${reversals}`);
});

// --- which step is nearest the middle of the view --------------------------

const row = (n) => Array.from({ length: n }, (_, i) => ({ id: `N${i}`, x: i * 200, y: 0, w: 100, h: 60 }));

test('picks the step under the middle of the viewport', () => {
  // Viewport 400 wide scrolled to 800: its centre is at 1000, which is N5.
  assert.equal(nearestNodeId(row(8), { scrollLeft: 800, clientWidth: 400 }), 'N5');
});

test('accounts for the stage offset when the diagram is centred', () => {
  // The stage sits 150px in, so the same scroll lands on an earlier step.
  const without = nearestNodeId(row(8), { scrollLeft: 800, clientWidth: 400 });
  const with150 = nearestNodeId(row(8), { scrollLeft: 800, clientWidth: 400, stageLeft: 150 });
  assert.notEqual(without, with150, 'ignoring the stage offset picks the wrong step');
  assert.equal(with150, 'N4');
});

test('accounts for zoom', () => {
  // At half scale the viewport centre (600) falls between the scaled centres of
  // N5 (525) and N6 (625); N6 is nearer.
  assert.equal(nearestNodeId(row(8), { scrollLeft: 400, clientWidth: 400, zoom: 0.5 }), 'N6');
  // The same scroll at full scale is a completely different step.
  assert.equal(nearestNodeId(row(8), { scrollLeft: 400, clientWidth: 400 }), 'N3');
});

test('measures along the flow axis for a vertical diagram', () => {
  const column = Array.from({ length: 6 }, (_, i) => ({ id: `N${i}`, x: 0, y: i * 150, w: 100, h: 60 }));
  assert.equal(nearestNodeId(column, { scrollTop: 300, clientHeight: 300, horizontal: false }), 'N3');
});

test('an empty diagram has no nearest step', () => {
  assert.equal(nearestNodeId([], { scrollLeft: 0, clientWidth: 400 }), null);
  assert.equal(nearestNodeId(undefined, undefined), null);
});
