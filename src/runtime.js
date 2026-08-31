import { mdToHtml } from './md.js';
import { createAnimator, ANIMATE_CSS } from './animate.js';
import { shouldNudge, walkStepFor } from './canvas.js';
import { bandLayout, BAND } from './attachments.js';
import { ICONS } from './icons.js';

export { ANIMATE_CSS };

export const RUNTIME_CSS = `
.fm-tooltip {
  /* Fixed, and mounted outside the scroller: an absolutely positioned child of
     a scroll container contributes to its scrollable area, which inflated the
     scroll range and broke the loop's arithmetic. */
  position: fixed; z-index: 40; pointer-events: none;
  /* Wide and short reads faster than a tall narrow column. width:max-content
     keeps a short tooltip tight; the cap only bites on a long one. */
  width: max-content; max-width: min(64ch, 86vw);
  padding: .7em 1em; border-radius: 10px; opacity: 0;
  transition: opacity .14s ease;
  background: var(--surface); color: var(--ink);
  border: 1px solid var(--border);
  box-shadow: 0 10px 30px rgb(0 0 0 / .22);
  font-size: 1rem; line-height: 1.45; text-wrap: pretty;
}
.fm-tooltip[data-open="true"] { opacity: 1; }
.fm-modal-backdrop {
  position: fixed; inset: 0; z-index: 50; display: grid; place-items: center;
  padding: 4vmin; background: rgb(0 0 0 / .5); opacity: 0; visibility: hidden;
  transition: opacity .18s ease, visibility .18s ease;
}
.fm-modal-backdrop[data-open="true"] { opacity: 1; visibility: visible; }
.fm-modal {
  width: min(72ch, 100%); max-height: 86vh; overflow: auto;
  background: var(--surface); color: var(--ink);
  border: 1px solid var(--border); border-radius: 16px;
  box-shadow: 0 24px 70px rgb(0 0 0 / .38);
  padding: clamp(1.2rem, 3vw, 2.2rem);
  transform: translateY(10px) scale(.985); transition: transform .18s ease;
}
.fm-modal-backdrop[data-open="true"] .fm-modal { transform: none; }
.fm-modal-eyebrow { margin: 0; color: var(--c1); font-size: .8rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.fm-modal h2 { margin: .2em 0 .6em; font-size: clamp(1.4rem, 3vw, 2rem); line-height: 1.15; }
.fm-modal-lede { color: var(--ink-dim); font-size: 1.05rem; margin: 0 0 1.2em; }
.fm-modal-body > * + * { margin-top: .9em; }
.fm-modal-body table { width: 100%; border-collapse: collapse; }
.fm-modal-body th, .fm-modal-body td { text-align: left; padding: .45em .6em; border-bottom: 1px solid var(--border); }
.fm-modal-body th { color: var(--ink-dim); font-size: .82em; letter-spacing: .06em; text-transform: uppercase; }
.fm-modal-body pre { background: var(--surface-2); padding: .8em; border-radius: 8px; overflow-x: auto; }
.fm-modal-body code { background: var(--surface-2); padding: .1em .35em; border-radius: 4px; font-size: .92em; }
.fm-modal-body blockquote { margin: 0; border-left: 3px solid var(--c1); padding-left: .9em; color: var(--ink-dim); }
.fm-modal-body a { color: var(--c1); }
.fm-modal-close {
  position: sticky; top: 0; float: right; margin: -.4rem -.4rem 0 0;
  width: 2.2rem; height: 2.2rem; border-radius: 999px; cursor: pointer;
  border: 1px solid var(--border); background: var(--surface-2); color: var(--ink);
  font-size: 1.1rem; line-height: 1;
}
.fm-modal-close:focus-visible { outline: 2px solid var(--c2); outline-offset: 2px; }

/* What a step takes in and puts out, shown while it is in focus. The cards sit
   in the whitespace above the flow — beside it when the flow runs downward —
   with inputs on the upstream side and outputs on the downstream side, so
   position and arrow direction say the same thing. */
.fm-band { position: fixed; inset: 0; z-index: 55; pointer-events: none; opacity: 0; transition: opacity .2s ease; }
.fm-band[data-open="true"] { opacity: 1; }
.fm-band-wires { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.fm-band-wire { fill: none; stroke: var(--border); stroke-width: 2; }
.fm-band-wire[data-dir="out"] { stroke: color-mix(in oklab, var(--c3) 60%, var(--border)); }
.fm-band-arrow { fill: var(--border); }
.fm-band-arrow[data-dir="out"] { fill: color-mix(in oklab, var(--c3) 60%, var(--border)); }
.fm-band-card {
  position: absolute;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: .1rem .6rem;
  align-content: center;
  padding: .6rem .75rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  color: var(--ink);
  font-family: var(--font);
  box-shadow: 0 1px 3px rgb(0 0 0 / .10), 0 10px 26px rgb(0 0 0 / .16);
  transform: translateY(6px);
  opacity: 0;
  transition: opacity .22s ease, transform .22s ease;
}
.fm-band[data-open="true"] .fm-band-card { transform: none; opacity: 1; }
.fm-band-card svg { grid-row: 1 / span 2; align-self: center; width: 22px; height: 22px; color: var(--c1); }
.fm-band-card[data-dir="out"] svg { color: var(--c3); }
.fm-band-name { font-size: .85rem; font-weight: 700; line-height: 1.25; overflow-wrap: break-word; hyphens: auto; }
.fm-band-kind { font-size: .62rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-dim); }
.fm-band-more {
  position: absolute; padding: .3rem .6rem; border-radius: 999px;
  border: 1px dashed var(--border); background: var(--surface); color: var(--ink-dim);
  font-family: var(--font); font-size: .7rem; font-weight: 700;
}
@media (prefers-reduced-motion: reduce) {
  .fm-band, .fm-band-card { transition: none; }
}

/* The walkthrough's detail card. Same content and styling as the card a click
   opens, but docked out of the way of the step it describes rather than
   covering the diagram, so the two can be read together. */
.fm-walk-panel {
  position: fixed;
  z-index: 60;
  box-sizing: border-box;
  display: grid;
  gap: 0 1.6rem;
  overflow: auto;
  padding: 1.1rem 1.3rem;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  color: var(--ink);
  font-family: var(--font);
  box-shadow: 0 2px 8px rgb(0 0 0 / .10), 0 18px 48px rgb(0 0 0 / .22);
  opacity: 0;
  visibility: hidden;
  transition: opacity .22s ease;
}
.fm-walk-panel[data-open="true"] { opacity: 1; visibility: visible; }
/* Docked below or above a horizontal flow, the card is wide: the heading takes
   a fixed measure and the detail runs alongside it rather than under it. */
.fm-walk-panel[data-axis="horizontal"] {
  grid-template-columns: minmax(14ch, 24ch) minmax(0, 1fr);
  align-items: start;
  /* Docked along the bottom edge, so only the leading corners are rounded and
     the shadow is cast upward, onto the diagram it sits in front of. */
  border-radius: 16px 16px 0 0;
  border-bottom: 0;
  box-shadow: 0 -2px 8px rgb(0 0 0 / .08), 0 -14px 40px rgb(0 0 0 / .20);
}
.fm-walk-panel[data-axis="vertical"] { grid-template-columns: minmax(0, 1fr); }
.fm-walk-panel-head { min-width: 0; }
.fm-walk-panel-eyebrow { margin: 0; color: var(--tone, var(--c1)); font-size: .72rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.fm-walk-panel h3 { margin: .15em 0 .3em; font-size: 1.25rem; line-height: 1.2; }
.fm-walk-panel-lede { margin: 0; color: var(--ink-dim); font-size: .95rem; line-height: 1.45; }
.fm-walk-panel .fm-modal-body { min-width: 0; font-size: .93rem; line-height: 1.5; }
.fm-walk-panel[data-axis="vertical"] .fm-modal-body { margin-top: .9em; }
.fm-walk-panel-step { margin: 0; color: var(--ink-dim); font-size: .72rem; font-weight: 700; letter-spacing: .1em; }
@media (prefers-reduced-motion: reduce) { .fm-walk-panel { transition: none; } }
@media (prefers-reduced-motion: reduce) {
  .fm-tooltip, .fm-modal-backdrop, .fm-modal { transition: none; }
}
`.trim();

const FOCUSABLE = 'a[href], button, [tabindex]:not([tabindex="-1"])';

// The interaction state that decides whether the diagram moves and whether a
// tooltip is showing. Kept as pure functions of an explicit state object rather
// than as incremented counters, because a counter silently goes out of balance
// the moment one pointerout is missed and the diagram then stays frozen.
export function shouldPauseMotion(s) {
  // Focus holds the pause only while someone is actually navigating by
  // keyboard, so a diagram does not move out from under them. Focus that was
  // restored by closing a card must not freeze the flow indefinitely: the
  // pointer has moved on, and nothing on screen would explain the stall.
  return s.hoveredId !== null
    || (s.focusedId !== null && s.keyboardNav)
    || s.modalOpen
    || s.panelHover === true
    || s.externalPause;
}

// Hover always shows a tooltip. Focus shows one only while someone is actually
// navigating by keyboard: focus restored programmatically after closing a card
// must not resurrect a tooltip the pointer is nowhere near.
// Focus is only worth restoring to the node for someone who was navigating by
// keyboard and needs to carry on from where they were. Handing focus back after
// a mouse click just leaves a focus ring sitting on the node with nothing to
// explain it.
export function shouldRestoreFocus(s) {
  return s.keyboardNav === true;
}

// How much of the view the walk's detail card may take, across the axis the
// flow does not use. A horizontal flow leaves whitespace above and below it, so
// the card goes there; a vertical flow leaves it to the sides.
export const WALK_PANEL = { band: 0.32, sideBand: 0.34, margin: 28, maxSide: 460 };

// How long the walkthrough waits after being stepped by hand, so a press is not
// immediately overtaken by the clock.
export const WALK_KEY_HOLD_MS = 2500;

// Where the detail card sits. A flow that reads across gets it docked along the
// bottom, always: the diagram is centred in the view, the attachments take the
// space above it, and a card that moved between top and bottom as the walk
// progressed would make the reader hunt for it every step. Fixed places are
// easier to read than clever ones.
export function walkPanelPlacement({ direction, node, viewport }) {
  const horizontal = direction === 'LR' || direction === 'RL' || direction === undefined;

  if (horizontal) return { edge: 'bottom', axis: 'horizontal' };

  const band = Math.min(viewport.width * WALK_PANEL.sideBand, WALK_PANEL.maxSide);
  const left = node.left - viewport.left;
  const right = viewport.right - node.right;
  if (right >= band) return { edge: 'right', axis: 'vertical' };
  if (left >= band) return { edge: 'left', axis: 'vertical' };
  return { edge: right >= left ? 'right' : 'left', axis: 'vertical' };
}

export function tooltipTargetId(s) {
  if (s.modalOpen) return null;
  if (s.hoveredId !== null) return s.hoveredId;
  if (s.focusedId !== null && s.keyboardNav && !s.suppressFocusTooltip) return s.focusedId;
  return null;
}
const cssEscape = (s) => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&'));

export function attachRuntime(root, config = {}) {
  const details = config.details ?? {};
  const model = config.model ?? { nodes: [], edges: [] };
  const doc = root.ownerDocument;

  const chromeHost = root.closest('.fm-root') ?? doc.body;

  const tooltip = doc.createElement('div');
  tooltip.className = 'fm-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  chromeHost.appendChild(tooltip);

  // Both the tooltip and the card are fixed-position chrome, mounted on the
  // styled root so they still inherit the palette.
  const backdrop = doc.createElement('div');
  backdrop.className = 'fm-modal-backdrop';
  backdrop.innerHTML = '<div class="fm-modal" role="dialog" aria-modal="true" aria-labelledby="fm-modal-title">'
    + '<button class="fm-modal-close" type="button" aria-label="Close details">&times;</button>'
    + '<p class="fm-modal-eyebrow"></p><h2 id="fm-modal-title"></h2>'
    + '<p class="fm-modal-lede"></p><div class="fm-modal-body"></div></div>';
  chromeHost.appendChild(backdrop);

  // The walkthrough's card: the same detail a click opens, docked clear of the
  // step it describes so both can be read at once.
  const panel = doc.createElement('div');
  panel.className = 'fm-walk-panel';
  panel.setAttribute('aria-live', 'polite');
  panel.dataset.open = 'false';
  panel.innerHTML = '<div class="fm-walk-panel-head">'
    + '<p class="fm-walk-panel-eyebrow"></p><h3></h3><p class="fm-walk-panel-lede"></p>'
    + '<p class="fm-walk-panel-step"></p></div>'
    + '<div class="fm-modal-body"></div>';
  chromeHost.appendChild(panel);

  // What the focused step takes in and puts out. An overlay, so the diagram
  // never reflows and is unchanged when nothing is in focus.
  const band = doc.createElement('div');
  band.className = 'fm-band';
  band.dataset.open = 'false';
  band.setAttribute('aria-hidden', 'true');
  chromeHost.appendChild(band);

  const modal = backdrop.querySelector('.fm-modal');
  const closeBtn = backdrop.querySelector('.fm-modal-close');
  let lastFocus = null;

  // Motion state is derived from these three, never from a counter. A counter
  // gets out of balance the moment one pointerout is missed (pointer capture,
  // the cursor leaving the window, focus restored under a modal) and the
  // diagram stays frozen forever.
  const ui = {
    hoveredId: null,
    focusedId: null,
    modalOpen: false,
    panelHover: false,
    externalPause: false,
    keyboardNav: false,
    suppressFocusTooltip: false,
  };

  let panelWanted = config.detailPanel ?? false;
  // The band belongs to whatever is in focus, and to nothing when nothing is.
  let bandWanted = config.attachmentBand ?? true;
  // The step a click put in focus, so its band can come back when a card closes.
  let selectedId = null;

  const animator = createAnimator(root, model, {
    mode: config.animationMode ?? 'pulse',
    speed: config.speed,
    prefersReducedMotion: config.prefersReducedMotion,
    onStep: (id, index, total) => {
      panelId = id;
      showBand(id);
      showWalkPanel(id, index, total);
      config.onStep?.(id, index, total);
    },
    scrollTo: config.scrollTo,
  });

  function elFor(id) {
    return root.querySelector(`.fm-node[data-node-id="${cssEscape(id)}"]`);
  }

  // --- what a step takes in and puts out -----------------------------------

  let bandId = null;

  function hideBand() {
    band.dataset.open = 'false';
    band.replaceChildren();
    bandId = null;
  }

  // A short curve from the card to the step, with the arrowhead only at the
  // destination: into the step for an input, into the card for an output.
  function wire(card, node, dir, horizontal) {
    const from = horizontal
      ? { x: card.x + card.w / 2, y: dir === 'in' ? card.y + card.h : card.y }
      : { x: dir === 'in' ? card.x : card.x + card.w, y: card.y + card.h / 2 };
    const to = horizontal
      ? { x: node.left + node.width / 2, y: card.y > node.top ? node.bottom : node.top }
      : { x: card.x > node.left ? node.right : node.left, y: node.top + node.height / 2 };
    const a = dir === 'in' ? from : to;
    const b = dir === 'in' ? to : from;
    const bend = horizontal ? Math.abs(b.y - a.y) * 0.55 : Math.abs(b.x - a.x) * 0.55;
    const c1 = horizontal ? { x: a.x, y: a.y + Math.sign(b.y - a.y) * bend } : { x: a.x + Math.sign(b.x - a.x) * bend, y: a.y };
    const c2 = horizontal ? { x: b.x, y: b.y - Math.sign(b.y - a.y) * bend } : { x: b.x - Math.sign(b.x - a.x) * bend, y: b.y };
    return { d: `M ${a.x} ${a.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`, tip: b, from: c2 };
  }

  function showBand(id) {
    const node = model.nodes.find((n) => n.id === id);
    const items = node?.attachments ?? [];
    if (!bandWanted || items.length === 0 || ui.modalOpen) {
      hideBand();
      return;
    }
    const el = elFor(id);
    if (!el) {
      hideBand();
      return;
    }

    const viewportEl = root.closest('.fm-canvas') ?? root.parentElement ?? root;
    const viewport = viewportEl.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const horizontal = model.direction !== 'TD' && model.direction !== 'BT';
    const placed = bandLayout({ node: rect, viewport, items, horizontal });
    if (!placed.side) {
      hideBand();
      return;
    }

    const NS = 'http://www.w3.org/2000/svg';
    const svg = doc.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'fm-band-wires');
    const nodes = [svg];

    placed.cards.forEach((c, i) => {
      const w = wire(c, rect, c.direction, horizontal);
      const path = doc.createElementNS(NS, 'path');
      path.setAttribute('class', 'fm-band-wire');
      path.setAttribute('d', w.d);
      path.dataset.dir = c.direction;
      svg.appendChild(path);

      // The arrowhead, pointed along the curve's last segment.
      const angle = Math.atan2(w.tip.y - w.from.y, w.tip.x - w.from.x);
      const head = doc.createElementNS(NS, 'path');
      const size = 7;
      const pt = (turn) => `${w.tip.x - size * Math.cos(angle - turn)},${w.tip.y - size * Math.sin(angle - turn)}`;
      head.setAttribute('class', 'fm-band-arrow');
      head.setAttribute('d', `M ${w.tip.x} ${w.tip.y} L ${pt(0.42)} L ${pt(-0.42)} Z`);
      head.dataset.dir = c.direction;
      svg.appendChild(head);

      const cardEl = doc.createElement('div');
      cardEl.className = 'fm-band-card';
      cardEl.dataset.dir = c.direction;
      cardEl.style.cssText = `left:${c.x}px;top:${c.y}px;width:${c.w}px;min-height:${c.h}px;transition-delay:${i * 45}ms`;
      cardEl.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[c.icon] ?? ICONS.document}</svg>`
        + `<span class="fm-band-name"></span><span class="fm-band-kind"></span>`;
      cardEl.querySelector('.fm-band-name').textContent = c.label;
      // The icon already says what kind of thing it is; the caption only has to
      // say which way it goes, which is the thing a reader is scanning for.
      cardEl.querySelector('.fm-band-kind').textContent = c.direction === 'in' ? 'Input' : 'Output';
      nodes.push(cardEl);
    });

    if (placed.overflow > 0) {
      const more = doc.createElement('div');
      more.className = 'fm-band-more';
      const last = placed.cards.at(-1);
      more.style.cssText = horizontal
        ? `left:${last.x + last.w - 60}px;top:${last.y - 30}px`
        : `left:${last.x}px;top:${last.y + last.h + 8}px`;
      more.textContent = `+${placed.overflow} more`;
      nodes.push(more);
    }

    band.replaceChildren(...nodes);
    band.dataset.open = 'true';
    bandId = id;
  }

  // --- the walkthrough's detail card ---------------------------------------

  function hideWalkPanel() {
    panel.dataset.open = 'false';
    if (ui.panelHover) {
      ui.panelHover = false;
      sync();
    }
  }

  function placeWalkPanel(el) {
    const viewportEl = root.closest('.fm-canvas') ?? root.parentElement ?? root;
    const viewport = viewportEl.getBoundingClientRect();
    const node = el.getBoundingClientRect();
    const { edge, axis } = walkPanelPlacement({ direction: model.direction, node, viewport });
    const m = WALK_PANEL.margin;
    panel.dataset.axis = axis;

    if (axis === 'horizontal') {
      // Docked flush to the bottom of the view, full width: it reads as part of
      // the frame rather than as something floating over the diagram.
      const height = Math.max(96, viewport.height * WALK_PANEL.band);
      panel.style.left = `${viewport.left}px`;
      panel.style.width = `${Math.max(0, viewport.width)}px`;
      panel.style.maxHeight = `${height}px`;
      panel.style.top = `${viewport.bottom - height}px`;
      return;
    }

    const room = edge === 'right' ? viewport.right - node.right : node.left - viewport.left;
    const width = Math.max(220, Math.min(viewport.width * WALK_PANEL.sideBand, WALK_PANEL.maxSide, room - m * 2));
    panel.style.width = `${width}px`;
    panel.style.top = `${viewport.top + m}px`;
    panel.style.maxHeight = `${Math.max(0, viewport.height - m * 2)}px`;
    panel.style.left = edge === 'right' ? `${viewport.right - m - width}px` : `${viewport.left + m}px`;
  }

  function showWalkPanel(id, index, total) {
    const detail = details[id];
    // The card is an option, and it steps aside for a card that was opened by
    // clicking. Hovering and clicking are otherwise unchanged.
    if (!detail || !panelWanted || ui.modalOpen) {
      hideWalkPanel();
      return;
    }
    const el = elFor(id);
    if (!el) {
      hideWalkPanel();
      return;
    }

    panel.querySelector('.fm-walk-panel-eyebrow').textContent = detail.id;
    panel.querySelector('h3').textContent = detail.title || detail.id;
    const lede = panel.querySelector('.fm-walk-panel-lede');
    lede.textContent = detail.tooltip ?? '';
    lede.hidden = !detail.tooltip;
    const step = panel.querySelector('.fm-walk-panel-step');
    // A pulse has no step number: nothing is counting through the diagram.
    step.textContent = Number.isFinite(index) && total ? `Step ${index + 1} of ${total}` : '';
    step.hidden = !step.textContent;
    panel.querySelector('.fm-modal-body').innerHTML = mdToHtml(detail.bodyMd);
    panel.scrollTop = 0;

    placeWalkPanel(el);
    panel.dataset.open = 'true';
  }

  // Reading the card holds the walk where it is, the same way hovering a step
  // does. Without this a long card scrolls away mid-sentence.
  // Which step the card is describing, so a view that has not moved on does not
  // rebuild the same card on every frame.
  let panelId = null;

  // In a pulse there is no active step, so the card follows whichever step the
  // view is on. With the crawl running that changes by itself; with it stopped
  // it changes when the reader moves, which is the point.
  function followView() {
    if (!panelWanted || root.dataset.anim === 'walkthrough') return;
    const id = config.nearestNodeToCentre?.();
    if (!id || id === panelId) return;
    panelId = id;
    showWalkPanel(id);
  }

  const onPanelEnter = () => { ui.panelHover = true; sync(); };
  const onPanelLeave = () => { ui.panelHover = false; sync(); };
  panel.addEventListener('pointerenter', onPanelEnter);
  panel.addEventListener('pointerleave', onPanelLeave);

  const TOOLTIP_GAP = 12;
  const TOOLTIP_EDGE = 10;

  function showTooltip(el) {
    const id = el.dataset.nodeId;
    const detail = details[id];
    if (!detail?.tooltip) return;
    tooltip.textContent = detail.tooltip;
    tooltip.dataset.open = 'true';

    // Viewport coordinates, since the tooltip is fixed.
    const box = el.getBoundingClientRect();
    const host = root.getBoundingClientRect();
    const centre = box.left + box.width / 2;

    // A wide tooltip near an edge would hang off the canvas, so keep it inside.
    const half = tooltip.offsetWidth / 2;
    const min = host.left + half + TOOLTIP_EDGE;
    const max = host.right - half - TOOLTIP_EDGE;
    const left = max < min ? centre : Math.min(Math.max(centre, min), max);

    // Above the step by default; below it when there is no room above.
    const fitsAbove = box.top - TOOLTIP_GAP - tooltip.offsetHeight >= host.top;
    const top = fitsAbove ? box.top - TOOLTIP_GAP : box.bottom + TOOLTIP_GAP;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.transform = fitsAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)';
  }

  function hideTooltip() {
    tooltip.dataset.open = 'false';
  }

  // The pulse, the walkthrough, and the auto-scroll always stop and start
  // together, and only ever as a function of the state above.
  let motionPaused = false;

  function syncMotion() {
    const shouldPause = shouldPauseMotion(ui);
    if (shouldPause === motionPaused) return;
    motionPaused = shouldPause;
    if (shouldPause) {
      animator.pause();
      config.onPause?.();
    } else {
      animator.resume();
      config.onResume?.();
    }
  }

  function syncTooltip() {
    const id = tooltipTargetId(ui);
    const el = id === null ? null : elFor(id);
    if (el) showTooltip(el);
    else hideTooltip();
  }

  function sync() {
    syncMotion();
    syncTooltip();
  }

  // The public pause/resume, for callers that want to freeze the diagram for
  // their own reasons. Kept separate from hover and modal state so neither can
  // clobber the other.
  function pauseAll() {
    ui.externalPause = true;
    sync();
  }

  function resumeAll() {
    ui.externalPause = false;
    sync();
  }

  function openModal(id) {
    const detail = details[id];
    if (!detail) return;
    lastFocus = doc.activeElement;
    backdrop.querySelector('.fm-modal-eyebrow').textContent = detail.id;
    backdrop.querySelector('#fm-modal-title').textContent = detail.title || detail.id;
    const lede = backdrop.querySelector('.fm-modal-lede');
    lede.textContent = detail.tooltip ?? '';
    lede.hidden = !detail.tooltip;
    backdrop.querySelector('.fm-modal-body').innerHTML = mdToHtml(detail.bodyMd);
    hideWalkPanel();
    hideBand();
    backdrop.dataset.open = 'true';
    ui.modalOpen = true;
    sync();
    closeBtn.focus();
  }

  function closeModal() {
    const wasOpen = backdrop.dataset.open === 'true';
    backdrop.dataset.open = 'false';
    // Cleared even when the card was not open. This flag suppresses every
    // tooltip while it is set, so if it ever survived its card the diagram
    // would go quiet permanently with nothing on screen to explain it.
    ui.modalOpen = false;
    if (!wasOpen) {
      sync();
      return;
    }

    // Focus goes back to the node for keyboard users, but that restore must not
    // resurrect the tooltip: the pointer may be nowhere near the diagram.
    ui.suppressFocusTooltip = true;
    if (shouldRestoreFocus(ui) && lastFocus?.focus) {
      lastFocus.focus();
    } else {
      // Move focus off the card before it is hidden, without parking a focus
      // ring on the node the pointer has already left.
      doc.activeElement?.blur?.();
      ui.focusedId = null;
    }
    lastFocus = null;
    const back = root.dataset.anim === 'walkthrough'
      ? animator.getState().activeId
      : selectedId;
    if (back) showBand(back);
    sync();
  }

  // Arrow keys walk the graph: forward along outgoing edges, back along incoming.
  function step(fromId, forward) {
    const edges = model.edges.filter((e) => (forward ? e.from === fromId : e.to === fromId));
    const targetId = edges[0]?.[forward ? 'to' : 'from'];
    if (targetId && targetId !== fromId) return targetId;
    const ids = model.nodes.map((n) => n.id);
    const idx = ids.indexOf(fromId);
    return ids[Math.min(ids.length - 1, Math.max(0, idx + (forward ? 1 : -1)))];
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      closeModal();
      return;
    }

    if (backdrop.dataset.open === 'true') {
      if (event.key !== 'Tab') return;
      const items = [...modal.querySelectorAll(FOCUSABLE)].filter((el) => !el.hidden);
      if (items.length === 0) return;
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && doc.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && doc.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }

    const active = doc.activeElement?.closest?.('.fm-node');
    if (!active) return;
    const id = active.dataset.nodeId;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openModal(id);
      return;
    }
    const forwardKeys = ['ArrowRight', 'ArrowDown'];
    const backKeys = ['ArrowLeft', 'ArrowUp'];
    if (forwardKeys.includes(event.key) || backKeys.includes(event.key)) {
      event.preventDefault();
      const next = elFor(step(id, forwardKeys.includes(event.key)));
      if (next) {
        ui.keyboardNav = true;
        ui.suppressFocusTooltip = false;
        next.focus();
        sync();
      }
    }
  }

  const onOver = (e) => {
    const n = e.target.closest?.('.fm-node');
    if (!n) return;
    ui.hoveredId = n.dataset.nodeId;
    sync();
  };

  const onOut = (e) => {
    const n = e.target.closest?.('.fm-node');
    if (!n || n.dataset.nodeId !== ui.hoveredId) return;
    // relatedTarget is where the pointer went; staying inside the same node
    // (crossing from its shape onto its label) is not a real exit.
    if (e.relatedTarget && n.contains(e.relatedTarget)) return;
    ui.hoveredId = null;
    sync();
  };

  // Safety net: if the pointer leaves the canvas or the window entirely, some
  // pointerout events never arrive, and without this the crawl stays frozen.
  const onLeave = () => {
    if (ui.hoveredId === null) return;
    ui.hoveredId = null;
    sync();
  };

  const onFocusIn = (e) => {
    const n = e.target.closest?.('.fm-node');
    if (!n) return;
    ui.focusedId = n.dataset.nodeId;
    sync();
  };

  const onFocusOut = (e) => {
    const n = e.target.closest?.('.fm-node');
    if (!n || n.dataset.nodeId !== ui.focusedId) return;
    ui.focusedId = null;
    sync();
  };

  const onPointerDown = () => {
    ui.keyboardNav = false;
  };

  const onNavKey = (e) => {
    if (e.key === 'Tab') {
      ui.keyboardNav = true;
      ui.suppressFocusTooltip = false;
      return;
    }
    // With no step focused, the arrows move the diagram rather than the
    // selection: the reading most people expect from a picture that scrolls.
    // A focused step keeps the step-to-step navigation a keyboard user needs.
    if (!shouldNudge(e.key, {
      typing: isTyping(doc.activeElement),
      nodeFocused: Boolean(doc.activeElement?.closest?.('.fm-node')),
      modalOpen: ui.modalOpen,
      modifier: e.metaKey || e.ctrlKey || e.altKey,
    })) return;
    // A walkthrough is a sequence, so the arrows walk it. Everything else is a
    // picture, so the arrows move the picture.
    if (root.dataset.anim === 'walkthrough') {
      const dir = walkStepFor(e.key);
      if (!dir) return;
      if (dir > 0) animator.next();
      else animator.prev();
      // Hold the auto-advance, so stepping by hand is not immediately
      // overtaken by the clock.
      animator.deferAdvance(WALK_KEY_HOLD_MS);
      e.preventDefault();
      return;
    }
    if (config.onNudge?.(e.key)) e.preventDefault();
  };

  function isTyping(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
  }

  const onClick = (e) => {
    const n = e.target.closest?.('.fm-node');
    if (!n) return;
    // Clicking a step selects it: its inputs and outputs come up, and the view
    // centres on it so the band has somewhere to sit. The detail card opens as
    // it always has, and the band is waiting again when that card closes.
    selectedId = n.dataset.nodeId;
    config.scrollTo?.(model.nodes.find((x) => x.id === selectedId));
    if (n.dataset.hasDetail === 'true') openModal(n.dataset.nodeId);
    else showBand(selectedId);
  };

  const onBackdrop = (e) => {
    if (e.target === backdrop) closeModal();
  };

  root.addEventListener('pointerover', onOver);
  root.addEventListener('pointerout', onOut);
  root.addEventListener('pointerleave', onLeave);
  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('focusout', onFocusOut);
  root.addEventListener('click', onClick);
  backdrop.addEventListener('click', onBackdrop);
  closeBtn.addEventListener('click', closeModal);
  doc.addEventListener('keydown', onKeyDown);
  doc.addEventListener('keydown', onNavKey);
  doc.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('blur', onLeave);

  return {
    animator,
    setAnimationMode: (mode) => {
      panelId = null;
      selectedId = null;
      hideBand();
      hideWalkPanel();
      animator.setMode(mode);
      // A pulse has no step to announce, so the card has to go looking.
      if (mode !== 'walkthrough') followView();
    },
    restart: () => animator.restart(),
    setSpeed: (n) => animator.setSpeed(n),
    goToId: (id) => animator.goToId(id),
    deferAdvance: (ms) => animator.deferAdvance(ms),
    getMode: () => animator.getState().mode,
    pause: pauseAll,
    resume: resumeAll,
    focusNode: (id) => {
      const el = elFor(id);
      if (el) {
        ui.keyboardNav = true;
        ui.suppressFocusTooltip = false;
        el.focus();
        sync();
      }
    },
    openModal,
    closeModal,
    hideWalkPanel,
    showBand,
    hideBand,
    // Re-place the chrome after the view has changed shape — entering full
    // screen, a window resize. Both are positioned from measurements, so they
    // are stale the moment the thing they measured moves.
    reposition() {
      const focused = root.dataset.anim === 'walkthrough'
        ? animator.getState().activeId
        : (selectedId ?? panelId);
      if (!focused) return;
      showBand(focused);
      if (panel.dataset.open === 'true') {
        const el = elFor(focused);
        if (el) placeWalkPanel(el);
      }
    },
    // The card is a preference, not a mode: it belongs to whichever animation
    // is running, and to neither when it is off.
    setDetailPanel(on) {
      panelWanted = Boolean(on);
      if (!panelWanted) {
        panelId = null;
        hideWalkPanel();
        return;
      }
      if (root.dataset.anim === 'walkthrough') {
        const id = animator.getState().activeId;
        if (id) showWalkPanel(id, animator.getState().activeIndex, animator.getState().total);
      } else {
        panelId = null;
        followView();
      }
    },
    // Called when the view has moved, by the crawl or by the reader.
    followView,
    destroy() {
      animator.destroy();
      root.removeEventListener('pointerover', onOver);
      root.removeEventListener('pointerout', onOut);
      root.removeEventListener('pointerleave', onLeave);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
      root.removeEventListener('click', onClick);
      backdrop.removeEventListener('click', onBackdrop);
      closeBtn.removeEventListener('click', closeModal);
      doc.removeEventListener('keydown', onKeyDown);
      doc.removeEventListener('keydown', onNavKey);
      doc.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('blur', onLeave);
      panel.removeEventListener('pointerenter', onPanelEnter);
      panel.removeEventListener('pointerleave', onPanelLeave);
      tooltip.remove();
      backdrop.remove();
      panel.remove();
      band.remove();
    },
  };
}
