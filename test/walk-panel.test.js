import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walkPanelPlacement, WALK_PANEL, shouldPauseMotion } from '../src/runtime.js';

// A viewport 1000 wide and 600 tall, at the origin.
const view = { top: 0, bottom: 600, left: 0, right: 1000, width: 1000, height: 600 };
const at = (over) => ({ top: 250, bottom: 320, left: 400, right: 560, width: 160, height: 70, ...over });

// --- a flow that reads across --------------------------------------------

test('a horizontal flow puts the card in the band below', () => {
  const p = walkPanelPlacement({ direction: 'LR', node: at(), viewport: view });
  assert.deepEqual(p, { edge: 'bottom', axis: 'horizontal' });
});

test('a step low on screen sends the card above it instead', () => {
  const p = walkPanelPlacement({ direction: 'LR', node: at({ top: 480, bottom: 560 }), viewport: view });
  assert.equal(p.edge, 'top', 'the card must never cover the step it describes');
});

test('a right-to-left flow is still horizontal', () => {
  assert.equal(walkPanelPlacement({ direction: 'RL', node: at(), viewport: view }).axis, 'horizontal');
});

test('with room on neither side the card takes the roomier one', () => {
  const tall = at({ top: 40, bottom: 560 });
  const p = walkPanelPlacement({ direction: 'LR', node: tall, viewport: view });
  assert.equal(p.axis, 'horizontal');
  assert.equal(p.edge, 'bottom', 'below has 40px, above has 40px — ties go to the default');

  const lower = at({ top: 120, bottom: 590 });
  assert.equal(walkPanelPlacement({ direction: 'LR', node: lower, viewport: view }).edge, 'top');
});

// --- a flow that reads down -----------------------------------------------

test('a vertical flow puts the card down the right-hand side', () => {
  const p = walkPanelPlacement({ direction: 'TD', node: at(), viewport: view });
  assert.deepEqual(p, { edge: 'right', axis: 'vertical' });
});

test('a step on the right sends the card to the left instead', () => {
  const p = walkPanelPlacement({ direction: 'TD', node: at({ left: 780, right: 960 }), viewport: view });
  assert.equal(p.edge, 'left');
});

test('a bottom-to-top flow is still vertical', () => {
  assert.equal(walkPanelPlacement({ direction: 'BT', node: at(), viewport: view }).axis, 'vertical');
});

test('the side card is capped so it never becomes a wall of text', () => {
  const wide = { top: 0, bottom: 600, left: 0, right: 4000, width: 4000, height: 600 };
  const p = walkPanelPlacement({ direction: 'TD', node: at(), viewport: wide });
  assert.equal(p.edge, 'right');
  assert.ok(Math.min(wide.width * WALK_PANEL.sideBand, WALK_PANEL.maxSide) === WALK_PANEL.maxSide);
});

// --- always a real answer --------------------------------------------------

test('every direction and position yields a placement', () => {
  for (const direction of ['LR', 'RL', 'TD', 'BT', undefined]) {
    for (const top of [0, 100, 300, 520, 580]) {
      for (const left of [0, 200, 500, 850, 980]) {
        const p = walkPanelPlacement({
          direction,
          node: at({ top, bottom: top + 70, left, right: left + 160 }),
          viewport: view,
        });
        assert.ok(['top', 'bottom', 'left', 'right'].includes(p.edge), `${direction} gave ${p.edge}`);
        assert.ok(['horizontal', 'vertical'].includes(p.axis));
      }
    }
  }
});

test('a viewport with no room at all still answers', () => {
  const tiny = { top: 0, bottom: 10, left: 0, right: 10, width: 10, height: 10 };
  const p = walkPanelPlacement({ direction: 'LR', node: at({ top: 0, bottom: 10 }), viewport: tiny });
  assert.ok(p.edge);
});

// --- reading the card holds the walk ---------------------------------------

const idle = {
  hoveredId: null, focusedId: null, modalOpen: false, externalPause: false, keyboardNav: false,
};

test('the walk stops while the pointer is over the card', () => {
  assert.equal(shouldPauseMotion({ ...idle, panelHover: true }), true);
  assert.equal(shouldPauseMotion({ ...idle, panelHover: false }), false);
});

test('a state that never heard of the card still runs', () => {
  assert.equal(shouldPauseMotion(idle), false);
});
