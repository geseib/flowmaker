import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fitScale, shouldReflowVertical, advanceScroll, nearestNodeId,
  CANVAS_CSS, MIN_ZOOM, MAX_ZOOM, NARROW_BREAKPOINT,
  nudgeStep, shouldNudge, nudgeTarget, glideAt, walkStepFor, NUDGE_MIN_PX,
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
  pos: 0, dir: 1, max: 1000, dt: 1 / 60, speed: 60, now: 1000, holdUntil: 0,
  mode: 'bounce', ...over,
});
const loopStep = (over = {}) => step({ mode: 'loop', ...over });

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

// --- the wrap-around loop --------------------------------------------------

test('the loop keeps travelling one way and wraps at the end', () => {
  const r = loopStep({ pos: 999.5, dt: 1, speed: 60 });
  assert.equal(r.wrapped, true);
  assert.equal(r.dir, 1, 'it never reverses');
  assert.ok(r.pos < 100, `should have come back round to the start, got ${r.pos}`);
});

test('wrapping carries the remainder so the speed stays even', () => {
  // 999 + 60 = 1059, which is 59 past a max of 1000.
  const r = loopStep({ pos: 999, dt: 1, speed: 60 });
  assert.ok(Math.abs(r.pos - 59) < 0.001, `expected the 59px remainder, got ${r.pos}`);
});

test('the loop never holds, so the flow keeps moving', () => {
  const r = loopStep({ pos: 999.9, dt: 1, speed: 60, now: 5000 });
  assert.equal(r.holdUntil, 0, 'a loop has no pause at the ends');
  assert.equal(r.moved, true);
});

test('a full loop covers the whole travel and returns to where it started', () => {
  let pos = 0;
  let wraps = 0;
  const max = 600;
  const speed = 300;
  const dt = 1 / 60;
  // Two full cycles at 300px/s over 600px is four seconds.
  for (let i = 0; i < 60 * 4; i += 1) {
    const r = advanceScroll({ pos, dir: 1, max, dt, speed, now: i, holdUntil: 0, mode: 'loop' });
    if (r.wrapped) wraps += 1;
    pos = r.pos;
    assert.ok(pos >= 0 && pos < max, `escaped the range at ${pos}`);
  }
  assert.equal(wraps, 2, `expected two wraps, saw ${wraps}`);
  assert.ok(pos < 5, `should be back near the start, got ${pos}`);
});

test('a flow that fits on screen still never crawls, in either mode', () => {
  assert.equal(loopStep({ max: 0 }).moved, false);
  assert.equal(step({ max: 0 }).moved, false);
});

test('bounce mode ping-pongs rather than running away', () => {
  let pos = 0;
  let dir = 1;
  let holdUntil = 0;
  let now = 0;
  let reversals = 0;
  for (let i = 0; i < 4000; i += 1) {
    now += 16;
    const r = advanceScroll({ pos, dir, max: 500, dt: 0.016, speed: 300, now, holdUntil, mode: 'bounce' });
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

// --- playback speed --------------------------------------------------------

test('speed scales the crawl proportionally', () => {
  const base = advanceScroll({ pos: 0, dir: 1, max: 1000, dt: 1, speed: 60, now: 0, holdUntil: 0 });
  const fast = advanceScroll({ pos: 0, dir: 1, max: 1000, dt: 1, speed: 120, now: 0, holdUntil: 0 });
  const slow = advanceScroll({ pos: 0, dir: 1, max: 1000, dt: 1, speed: 30, now: 0, holdUntil: 0 });
  assert.ok(Math.abs(fast.pos - base.pos * 2) < 0.001);
  assert.ok(Math.abs(slow.pos - base.pos / 2) < 0.001);
});

// --- the arrows move the diagram -------------------------------------------

test('an arrow moves the view along the axis it points', () => {
  const view = { width: 1000, height: 600 };
  assert.deepEqual(nudgeStep('ArrowRight', view), { dx: 140, dy: 0 });
  assert.deepEqual(nudgeStep('ArrowLeft', view), { dx: -140, dy: 0 });
  // 14% of 600 is under the floor, so the vertical step takes the minimum.
  assert.deepEqual(nudgeStep('ArrowDown', view), { dx: 0, dy: NUDGE_MIN_PX });
  assert.deepEqual(nudgeStep('ArrowUp', view), { dx: 0, dy: -NUDGE_MIN_PX });
  assert.deepEqual(nudgeStep('ArrowDown', { width: 1000, height: 1200 }), { dx: 0, dy: 168 });
});

test('a step is a share of the view, so it reads the same at any size', () => {
  assert.ok(nudgeStep('ArrowRight', { width: 2000, height: 900 }).dx
    > nudgeStep('ArrowRight', { width: 900, height: 900 }).dx);
});

test('a tiny view still moves a useful distance', () => {
  const step = nudgeStep('ArrowRight', { width: 200, height: 120 });
  assert.equal(step.dx, NUDGE_MIN_PX, 'a fraction of a small view would barely move');
});

test('other keys are not arrows', () => {
  for (const key of ['Enter', ' ', 'Tab', 'a', 'PageDown', 'Home']) {
    assert.equal(nudgeStep(key, { width: 1000, height: 600 }), null);
  }
});

test('the arrows move the diagram when nothing else wants them', () => {
  assert.equal(shouldNudge('ArrowRight', {}), true);
  assert.equal(shouldNudge('ArrowUp', {}), true);
});

test('typing keeps its arrows', () => {
  assert.equal(shouldNudge('ArrowRight', { typing: true }), false);
});

test('a focused step keeps step-to-step navigation', () => {
  assert.equal(shouldNudge('ArrowRight', { nodeFocused: true }), false);
});

test('an open card keeps its own keys', () => {
  assert.equal(shouldNudge('ArrowRight', { modalOpen: true }), false);
});

test('a modified arrow belongs to the browser, not the diagram', () => {
  assert.equal(shouldNudge('ArrowRight', { modifier: true }), false);
});

test('only the arrows move the diagram', () => {
  for (const key of ['Enter', 'Tab', 'k', 'PageDown', 'Escape']) {
    assert.equal(shouldNudge(key, {}), false, `${key} should not pan`);
  }
});

test('a press past the end comes back around, rather than stopping dead', () => {
  assert.deepEqual(nudgeTarget({ pos: 400, delta: 90, max: 437 }), { pos: 53, wrapped: true });
  assert.deepEqual(nudgeTarget({ pos: 10, delta: -90, max: 437 }), { pos: 357, wrapped: true });
});

test('an ordinary press just moves', () => {
  assert.deepEqual(nudgeTarget({ pos: 100, delta: 90, max: 437 }), { pos: 190, wrapped: false });
});

test('across the flow there is nothing to come around to, so it stops', () => {
  assert.deepEqual(nudgeTarget({ pos: 400, delta: 90, max: 437, wrap: false }), { pos: 437, wrapped: false });
  assert.deepEqual(nudgeTarget({ pos: 10, delta: -90, max: 437, wrap: false }), { pos: 0, wrapped: false });
});

test('a diagram that fits the screen has nowhere to go', () => {
  assert.deepEqual(nudgeTarget({ pos: 0, delta: 90, max: 0 }), { pos: 0, wrapped: false });
});

test('the glide eases from where it was to where it is going', () => {
  const g = (elapsed) => glideAt({ from: 0, to: 100, elapsed, duration: 200 }).pos;
  assert.equal(g(0), 0);
  assert.equal(glideAt({ from: 0, to: 100, elapsed: 200, duration: 200 }).done, true);
  assert.equal(g(200), 100);
  assert.ok(g(100) > 50, 'eased out: most of the distance is covered early');
  assert.ok(g(50) < g(100) && g(100) < g(150), 'and it only ever moves forward');
});

test('a glide that has run over is simply finished', () => {
  assert.deepEqual(glideAt({ from: 0, to: 100, elapsed: 9999, duration: 200 }), { pos: 100, done: true });
  assert.deepEqual(glideAt({ from: 0, to: 100, elapsed: 5, duration: 0 }), { pos: 100, done: true });
});

test('during a walkthrough the arrows step the walk, forward on right and down', () => {
  assert.equal(walkStepFor('ArrowRight'), 1);
  assert.equal(walkStepFor('ArrowDown'), 1);
  assert.equal(walkStepFor('ArrowLeft'), -1);
  assert.equal(walkStepFor('ArrowUp'), -1);
  assert.equal(walkStepFor('Enter'), 0);
});

test('following the view understands that a looping diagram repeats', () => {
  const nodes = [
    { id: 'FIRST', x: 0, y: 0, w: 100, h: 60 },
    { id: 'LAST', x: 900, y: 0, w: 100, h: 60 },
  ];
  const at = (scrollLeft, loopSpan) => nearestNodeId(nodes, {
    scrollLeft, clientWidth: 200, stageLeft: 0, zoom: 1, horizontal: true, loopSpan,
  });
  // Past the last step come the title and then the diagram again. Measured in a
  // straight line, everything out there reads as the last step for ever.
  assert.equal(at(1400, 0), 'LAST', 'without the span, it sticks at the end');
  assert.equal(at(1400, 1600), 'FIRST', 'around the loop, the start is closer');
  assert.equal(at(950, 1600), 'LAST', 'and the end is still the end while it is');
});

test('a diagram that does not loop is measured in a straight line', () => {
  const nodes = [{ id: 'A', x: 0, y: 0, w: 100, h: 60 }, { id: 'B', x: 900, y: 0, w: 100, h: 60 }];
  const at = (scrollLeft) => nearestNodeId(nodes, {
    scrollLeft, clientWidth: 200, stageLeft: 0, zoom: 1, horizontal: true,
  });
  assert.equal(at(0), 'A');
  assert.equal(at(900), 'B');
});
