import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldPauseMotion, tooltipTargetId } from '../src/runtime.js';

// The interaction state that drives pausing and the tooltip. Two reported bugs
// came from this logic, so it is pinned here rather than only exercised through
// the DOM.
const state = (over = {}) => ({
  hoveredId: null,
  focusedId: null,
  modalOpen: false,
  externalPause: false,
  keyboardNav: false,
  suppressFocusTooltip: false,
  ...over,
});

test('an idle diagram is not paused and shows no tooltip', () => {
  assert.equal(shouldPauseMotion(state()), false);
  assert.equal(tooltipTargetId(state()), null);
});

test('hovering a step pauses motion and shows its tooltip', () => {
  const s = state({ hoveredId: 'A' });
  assert.equal(shouldPauseMotion(s), true);
  assert.equal(tooltipTargetId(s), 'A');
});

test('moving the pointer off every step resumes motion and hides the tooltip', () => {
  const s = state({ hoveredId: null });
  assert.equal(shouldPauseMotion(s), false);
  assert.equal(tooltipTargetId(s), null);
});

test('an open card pauses motion and suppresses the tooltip behind it', () => {
  const s = state({ modalOpen: true, hoveredId: 'A' });
  assert.equal(shouldPauseMotion(s), true);
  assert.equal(tooltipTargetId(s), null, 'the tooltip must not show through the card');
});

test('focus alone pauses motion, so a keyboard user is not chasing a moving diagram', () => {
  assert.equal(shouldPauseMotion(state({ focusedId: 'A' })), true);
});

test('keyboard navigation shows a tooltip on the focused step', () => {
  const s = state({ focusedId: 'B', keyboardNav: true });
  assert.equal(tooltipTargetId(s), 'B');
});

test('focus restored after closing a card does NOT show a tooltip', () => {
  // The reported bug: closing the card returned focus to the node, which
  // re-showed the tooltip even though the pointer had moved away.
  const s = state({ focusedId: 'A', keyboardNav: true, suppressFocusTooltip: true });
  assert.equal(tooltipTargetId(s), null);
});

test('focus from a mouse click does not show a tooltip on its own', () => {
  const s = state({ focusedId: 'A', keyboardNav: false });
  assert.equal(tooltipTargetId(s), null);
});

test('hover wins over focus when they disagree', () => {
  const s = state({ hoveredId: 'A', focusedId: 'B', keyboardNav: true });
  assert.equal(tooltipTargetId(s), 'A');
});

test('the external pause is independent of hover and modal state', () => {
  assert.equal(shouldPauseMotion(state({ externalPause: true })), true);
  // Releasing it must not un-pause a diagram that is still being hovered.
  assert.equal(shouldPauseMotion(state({ externalPause: false, hoveredId: 'A' })), true);
});

test('the full hover to card to close sequence ends unpaused with no tooltip', () => {
  // Exactly the sequence that was broken: hover, click, move onto the card,
  // close it. The diagram must be moving again and no tooltip left behind.
  const s = state();

  s.hoveredId = 'A';
  assert.equal(shouldPauseMotion(s), true);
  assert.equal(tooltipTargetId(s), 'A');

  s.modalOpen = true;
  assert.equal(tooltipTargetId(s), null);

  s.hoveredId = null; // pointer moved onto the card
  assert.equal(shouldPauseMotion(s), true, 'still paused while the card is open');

  s.modalOpen = false;
  s.suppressFocusTooltip = true;
  s.focusedId = 'A'; // focus restored to the node

  assert.equal(tooltipTargetId(s), null, 'no stuck tooltip');
  assert.equal(shouldPauseMotion(s), true, 'focus still holds the pause');

  s.focusedId = null; // focus leaves as the user clicks elsewhere
  assert.equal(shouldPauseMotion(s), false, 'motion resumes');
  assert.equal(tooltipTargetId(s), null);
});
