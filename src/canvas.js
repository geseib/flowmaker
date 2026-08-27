import { nowMs } from './clock.js';

export const MIN_ZOOM = 0.15;
// Auto-scroll speed in CSS pixels per second, by density. A marquee is read
// from a distance by someone walking past, so it crawls; compact is for someone
// sitting in front of it and can move faster.
const SCROLL_PX_PER_SEC = { marquee: 42, standard: 60, compact: 75 };
const SCROLL_HOLD_MS = 1600;
export const MAX_ZOOM = 4;
export const NARROW_BREAKPOINT = 720;
const PAD = 32;

export const CANVAS_CSS = `
.fm-canvas {
  position: relative;
  display: flex;
  /* As a flex item the canvas defaults to min-width:auto, which refuses to
     shrink below its content. It then grows to the full width of the diagram,
     leaving nothing to scroll and no visible crawl. */
  min-width: 0;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  background: var(--ground);
  cursor: grab;
  touch-action: pan-x pan-y;
}
.fm-canvas[data-panning="true"] { cursor: grabbing; user-select: none; }
.fm-stage { transform-origin: 0 0; will-change: transform; margin: auto; }
/* Blank travel either side of the diagram, outside the transformed stage. */
.fm-spacer { display: grid; place-items: center; pointer-events: none; }
/* The title rides in the stretch between the end of the flow and its return,
   so the loop has a beat instead of a void. */
.fm-seam { text-align: center; padding: 0 2rem; }
.fm-seam h2 {
  margin: 0; font-family: var(--font); color: var(--ink);
  font-size: 3.4rem; font-weight: 800; line-height: 1.05; letter-spacing: -.02em;
}
.fm-seam p { margin: .5em 0 0; font-family: var(--font); color: var(--ink-dim); font-size: 1.25rem; }
.fm-canvas svg { display: block; overflow: visible; }
.fm-canvas::-webkit-scrollbar { height: 12px; width: 12px; }
.fm-canvas::-webkit-scrollbar-thumb { background: var(--border); border-radius: 999px; }
@media (max-width: ${NARROW_BREAKPOINT}px) {
  .fm-canvas[data-reflow="vertical"] { overflow-x: hidden; }
  .fm-canvas[data-reflow="vertical"] .fm-stage { width: 100%; }
}
`.trim();

const clampZoom = (z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
// The crawl's tick interval. Sixty pixels a second at 30Hz is two pixels a
// tick, which is smooth enough for a slow travel and cheap enough to leave on.
const TIMER_INTERVAL_MS = 33;
// How long after letting go of the canvas the crawl picks up again.
const DRAG_RESUME_MS = 1400;
// A window after the app scrolls the view in which scroll events are ignored,
// so following a step is not mistaken for the user scrolling.
const PROGRAMMATIC_SCROLL_MS = 700;
// How much blank travel follows the flow before it comes round again, as a
// fraction of the viewport. This is the stretch the title crosses.
const SEAM_GAP_RATIO = 0.85;

// Which step sits nearest the middle of the viewport. Pure so the choice can be
// tested without a browser: scroll events are not dispatched at all on a page
// the browser is not rendering, so this cannot be exercised end to end there.
export function nearestNodeId(nodes, view) {
  const { scrollLeft = 0, scrollTop = 0, clientWidth = 0, clientHeight = 0,
    stageLeft = 0, stageTop = 0, zoom = 1, horizontal = true } = view ?? {};
  const cx = scrollLeft + clientWidth / 2 - stageLeft;
  const cy = scrollTop + clientHeight / 2 - stageTop;
  let best = null;
  for (const n of nodes ?? []) {
    const dx = (n.x + n.w / 2) * zoom - cx;
    const dy = (n.y + n.h / 2) * zoom - cy;
    const d = horizontal ? Math.abs(dx) : Math.abs(dy);
    if (best === null || d < best.d) best = { id: n.id, d };
  }
  return best?.id ?? null;
}
// One step of the auto-scroll crawl, as a pure function of the current state.
// Extracted so the ping-pong and hold behaviour can be tested with a fake clock
// instead of a live browser frame loop.
//   pos      current scroll offset (float, sub-pixel)
//   dir      +1 travelling forward, -1 travelling back
//   max      the maximum scrollable offset
//   dt       seconds since the previous step
//   speed    pixels per second
//   now      current timestamp in ms
//   holdUntil timestamp before which the crawl waits at an end
export function advanceScroll({ pos, dir, max, dt, speed, now, holdUntil, mode = 'loop' }) {
  if (max <= 1) return { pos, dir, holdUntil, moved: false, wrapped: false };
  if (now < holdUntil) return { pos, dir, holdUntil, moved: false, wrapped: false };

  let next = pos + dir * speed * dt;

  if (mode === 'loop') {
    // Always travels one way. The scroller is padded by a viewport on each
    // side, so at max the diagram has just cleared the leading edge and at 0 it
    // is exactly at the trailing edge: resetting there continues the motion
    // rather than jumping. Carrying the remainder keeps the speed even.
    let wrapped = false;
    if (next >= max) {
      next -= max;
      wrapped = true;
    } else if (next < 0) {
      next += max;
      wrapped = true;
    }
    return { pos: next, dir, holdUntil, moved: true, wrapped };
  }

  let nextDir = dir;
  let nextHold = holdUntil;
  if (next >= max) {
    next = max;
    nextDir = -1;
    nextHold = now + SCROLL_HOLD_MS;
  } else if (next <= 0) {
    next = 0;
    nextDir = 1;
    nextHold = now + SCROLL_HOLD_MS;
  }
  return { pos: next, dir: nextDir, holdUntil: nextHold, moved: true, wrapped: false };
}

export function fitScale(bounds, viewport, mode = 'both') {
  const w = Number(bounds?.w) || 0;
  const h = Number(bounds?.h) || 0;
  const vw = Math.max(1, (Number(viewport?.w) || 0) - PAD);
  const vh = Math.max(1, (Number(viewport?.h) || 0) - PAD);
  const byW = w > 0 ? vw / w : MAX_ZOOM;
  const byH = h > 0 ? vh / h : MAX_ZOOM;
  if (mode === 'width') return clampZoom(byW);
  if (mode === 'height') return clampZoom(byH);
  return clampZoom(Math.min(byW, byH));
}

// A horizontal flow becomes an unreadable hairline once the viewport is much
// narrower than the diagram. Below the breakpoint, stack the steps instead.
export function shouldReflowVertical(viewportWidth, bounds) {
  const vw = Number(viewportWidth) || 0;
  const w = Number(bounds?.w) || 0;
  if (vw > NARROW_BREAKPOINT) return false;
  return w > vw * 1.6;
}

export function createCanvas(container, model, opts = {}) {
  const stage = container.querySelector('.fm-stage') ?? container.firstElementChild;
  const horizontalFlow = model.direction !== 'TD' && model.direction !== 'BT';
  let zoom = opts.zoom ?? 1;
  let panning = false;
  let origin = { x: 0, y: 0, left: 0, top: 0 };

  function apply() {
    stage.style.transform = `scale(${zoom})`;
    stage.style.width = `${model.bounds.w * zoom}px`;
    stage.style.height = `${model.bounds.h * zoom}px`;
    container.dataset.reflow = shouldReflowVertical(container.clientWidth, model.bounds) ? 'vertical' : 'horizontal';
    opts.onZoom?.(zoom);
  }

  const viewport = () => ({ w: container.clientWidth, h: container.clientHeight });
  // Where the diagram actually starts, including any loop spacing on the stage.
  const contentLeft = () => stage.offsetLeft;
  const contentTop = () => stage.offsetTop;

  const NO_PAN = '.fm-node, .fm-modal-backdrop, .fm-tooltip, button, a, input, select, textarea';

  function onPointerDown(e) {
    // Panning must never start on a node or on interface chrome: capturing the
    // pointer here would retarget the click and swallow it.
    if (e.target.closest(NO_PAN)) return;
    panning = true;
    // Taking hold of the canvas pauses the crawl; letting go hands it back
    // after a moment. Cancelling it outright left no way to get it going again.
    if (dragResume !== null) { clearTimeout(dragResume); dragResume = null; }
    pausedBy.drag = true;
    syncScrollPause();
    container.dataset.panning = 'true';
    container.setPointerCapture?.(e.pointerId);
    origin = { x: e.clientX, y: e.clientY, left: container.scrollLeft, top: container.scrollTop };
  }

  function onPointerMove(e) {
    if (!panning) return;
    container.scrollLeft = origin.left - (e.clientX - origin.x);
    container.scrollTop = origin.top - (e.clientY - origin.y);
  }

  function onPointerUp(e) {
    const wasPanning = panning;
    panning = false;
    container.dataset.panning = 'false';
    if (wasPanning) {
      if (dragResume !== null) clearTimeout(dragResume);
      dragResume = setTimeout(() => {
        dragResume = null;
        pausedBy.drag = false;
        lastFrame = 0;
        scrollPos = scrollAxis() === 'left' ? container.scrollLeft : container.scrollTop;
        syncScrollPause();
      }, DRAG_RESUME_MS);
    }
    try {
      container.releasePointerCapture?.(e.pointerId);
    } catch {
      /* pointer already released */
    }
  }

  // Ctrl/Cmd + wheel zooms around the cursor; a plain wheel scrolls normally.
  function onWheel(e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const box = container.getBoundingClientRect();
    const px = (container.scrollLeft + e.clientX - box.left) / zoom;
    const py = (container.scrollTop + e.clientY - box.top) / zoom;
    zoom = clampZoom(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
    apply();
    container.scrollLeft = px * zoom - (e.clientX - box.left);
    container.scrollTop = py * zoom - (e.clientY - box.top);
  }

  // The first render happens before the grid has laid out, so clientWidth and
  // clientHeight are meaningless. Wait for the first real measurement, then fit
  // once. Without this the diagram loads at a nonsense zoom.
  let autoFitDone = false;
  function fitDefault() {
    const byHeight = fitScale(model.bounds, viewport(), 'height');
    const byWidth = fitScale(model.bounds, viewport(), 'width');
    zoom = clampZoom(Math.min(1, Math.max(byHeight, byWidth)));
    apply();
  }

  // Continuous horizontal crawl for long flows. Ping-pongs rather than jumping
  // back to the start, because a hard jump reads as a glitch on a booth screen.
  let scrollDir = 1;
  let holdUntil = 0;
  let lastFrame = 0;
  let scrollWanted = false;
  // Two independent things pause the crawl: hovering a step, and dragging the
  // canvas. Deriving the flag from both rather than toggling one boolean is
  // what stops one of them from stranding the other.
  const pausedBy = { hover: false, drag: false };
  let scrollPaused = false;
  let dragResume = null;
  const syncScrollPause = () => { scrollPaused = pausedBy.hover || pausedBy.drag; };
  // The crawl advances a fraction of a pixel per frame at 120Hz, and scrollLeft
  // rounds to whole pixels, so the movement would be discarded every frame.
  // Accumulate the true position here and write the rounded value out.
  let scrollPos = 0;
  let scrollMode = opts.scrollMode ?? 'loop';
  let speedMult = Number.isFinite(opts.speed) && opts.speed > 0 ? opts.speed : 1;
  let scrollTimer = null;
  let seam = null;
  let leadSpacer = null;
  let trailSpacer = null;

  const scrollAxis = () => (model.direction === 'TD' || model.direction === 'BT' ? 'top' : 'left');

  // A viewport of blank space on each side of the diagram. It is what lets the
  // flow run off one edge and come back in at the other without a jump, and it
  // is only applied while the crawl is running so manual scrolling is not
  // padded with dead space.
  // Blank travel on each side of the diagram, as real siblings of the stage
  // rather than padding on it. The stage is transformed, so anything inside it
  // is scaled too: its padding would only have measured correctly at 100% zoom,
  // and the title would shrink with the diagram. Untransformed spacers keep the
  // scroll arithmetic in screen pixels at any zoom.
  // Where the title sits, centred in the viewport. That is the far end of the
  // scroll range: travelling on from there wraps straight into the flow.
  function seamStartPos() {
    if (!leadSpacer || !trailSpacer) return 0;
    if (scrollAxis() === 'left') {
      const trailStart = leadSpacer.offsetWidth + stage.offsetWidth;
      return Math.max(0, trailStart + trailSpacer.offsetWidth / 2 - container.clientWidth / 2);
    }
    const trailStart = leadSpacer.offsetHeight + stage.offsetHeight;
    return Math.max(0, trailStart + trailSpacer.offsetHeight / 2 - container.clientHeight / 2);
  }

  function applyLoopPadding(on) {
    if (!on) {
      leadSpacer?.remove();
      trailSpacer?.remove();
      leadSpacer = null;
      trailSpacer = null;
      seam = null;
      stage.style.margin = '';
      container.style.flexDirection = '';
      return;
    }

    const axis = scrollAxis();
    const need = axis === 'left' ? container.clientWidth : container.clientHeight;
    if (need <= 0) return;
    const gap = Math.round(need * SEAM_GAP_RATIO);

    if (!leadSpacer) {
      const doc = container.ownerDocument;
      leadSpacer = doc.createElement('div');
      leadSpacer.className = 'fm-spacer';
      leadSpacer.setAttribute('aria-hidden', 'true');
      trailSpacer = doc.createElement('div');
      trailSpacer.className = 'fm-spacer fm-spacer-trail';
      trailSpacer.setAttribute('aria-hidden', 'true');

      if (opts.seamTitle || opts.seamSubtitle) {
        seam = doc.createElement('div');
        seam.className = 'fm-seam';
        const h = doc.createElement('h2');
        h.textContent = opts.seamTitle ?? '';
        seam.appendChild(h);
        if (opts.seamSubtitle) {
          const sub = doc.createElement('p');
          sub.textContent = opts.seamSubtitle;
          seam.appendChild(sub);
        }
        trailSpacer.appendChild(seam);
      }

      container.insertBefore(leadSpacer, stage);
      stage.after(trailSpacer);
      // Auto margins would hand the spare space back to the stage.
      stage.style.margin = '0';
    }

    container.style.flexDirection = axis === 'left' ? 'row' : 'column';
    const previous = parseFloat(leadSpacer.style.flexBasis) || 0;
    if (Math.abs(previous - need) < 1) return;

    leadSpacer.style.flex = `0 0 ${need}px`;
    // The trailing side carries the extra gap: the stretch the title crosses
    // after the flow leaves and before it comes round again.
    trailSpacer.style.flex = `0 0 ${need + gap}px`;
    // Shift with it, so the diagram does not jump when the spacing changes.
    scrollPos += need - previous;
  }


  function scrollFrame(now) {
    if (scrollPaused) { lastFrame = now; return; }
    const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0;
    lastFrame = now;
    if (scrollMode === 'loop') applyLoopPadding(true);

    const axis = scrollAxis();
    const actual = axis === 'left' ? container.scrollLeft : container.scrollTop;
    const max = axis === 'left'
      ? container.scrollWidth - container.clientWidth
      : container.scrollHeight - container.clientHeight;

    // If something else moved the view (a walkthrough step, a jump to a node),
    // adopt that position rather than yanking it back.
    if (Math.abs(actual - scrollPos) > 2) scrollPos = actual;

    const step = advanceScroll({
      pos: scrollPos,
      dir: scrollDir,
      max,
      dt,
      speed: (SCROLL_PX_PER_SEC[model.density] ?? SCROLL_PX_PER_SEC.standard) * speedMult,
      now,
      holdUntil,
      mode: scrollMode,
    });
    scrollPos = step.pos;
    scrollDir = step.dir;
    holdUntil = step.holdUntil;
    if (!step.moved) return;

    if (axis === 'left') container.scrollLeft = Math.round(scrollPos);
    else container.scrollTop = Math.round(scrollPos);
  }

  // Driven by a plain interval rather than requestAnimationFrame. rAF stops
  // being delivered whenever the browser thinks the page is not being painted
  // (an occluded window, a background tab, some kiosk and secondary-display
  // setups), and an rAF-with-timer-fallback races on which one starts first, so
  // the crawl worked or did not depending on timing. One timer is predictable,
  // and the step size comes from the measured elapsed time, so the speed stays
  // correct even when the interval itself is throttled.
  function startAutoScroll() {
    scrollWanted = true;
    container.dataset.autoscroll = 'true';
    if (scrollTimer !== null) return;
    lastFrame = 0;
    holdUntil = 0;
    applyLoopPadding(scrollMode === 'loop');
    scrollPos = scrollAxis() === 'left' ? container.scrollLeft : container.scrollTop;
    scrollTimer = setInterval(() => scrollFrame(nowMs()), TIMER_INTERVAL_MS);
  }

  function stopAutoScroll() {
    scrollWanted = false;
    container.dataset.autoscroll = 'false';
    if (scrollTimer !== null) { clearInterval(scrollTimer); scrollTimer = null; }
    if (dragResume !== null) { clearTimeout(dragResume); dragResume = null; }
    applyLoopPadding(false);
    pausedBy.drag = false;
    syncScrollPause();
  }

  // A scroll the app caused must not be mistaken for the user taking the wheel.
  let programmaticUntil = 0;
  const onScroll = () => {
    if (nowMs() < programmaticUntil) return;
    if (panning || pausedBy.drag) { opts.onUserScroll?.(); return; }
    // The crawl writes scrollLeft itself, so only report a scroll it did not cause.
    if (scrollWanted && !scrollPaused) return;
    opts.onUserScroll?.();
  };

  const onResize = () => {
    if (scrollWanted && scrollMode === 'loop') applyLoopPadding(true);
    if (!autoFitDone && container.clientWidth > 1 && container.clientHeight > 1) {
      autoFitDone = true;
      if (opts.autoFit !== false) {
        fitDefault();
        return;
      }
    }
    apply();
  };

  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerup', onPointerUp);
  container.addEventListener('pointercancel', onPointerUp);
  container.addEventListener('wheel', onWheel, { passive: false });
  container.addEventListener('scroll', onScroll, { passive: true });
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(onResize) : null;
  if (resizeObserver) resizeObserver.observe(container);
  else if (opts.autoFit !== false) { autoFitDone = true; fitDefault(); }

  apply();

  return {
    setZoom(z) {
      zoom = clampZoom(z);
      apply();
    },
    zoomBy(f) {
      zoom = clampZoom(zoom * f);
      apply();
    },
    fitWidth() {
      zoom = fitScale(model.bounds, viewport(), 'width');
      apply();
    },
    fitHeight() {
      zoom = fitScale(model.bounds, viewport(), 'height');
      apply();
    },
    fitBoth() {
      zoom = fitScale(model.bounds, viewport(), 'both');
      apply();
    },
    // The default view for a horizontal flow: fill the available height so the
    // type is as large as possible, and let the user scroll sideways. Never
    // magnifies past 1:1, because an upscaled small diagram looks broken.
    fitDefault() {
      autoFitDone = true;
      fitDefault();
    },
    actualSize() {
      zoom = 1;
      apply();
    },
    getZoom: () => zoom,
    // Centre a step in the viewport. The stage is centred inside the canvas by
    // auto margins, so its own offset has to be added or the target lands short
    // and the active step drifts off screen.
    scrollToNode(node, { instant = false } = {}) {
      if (!node) return;
      const left = contentLeft() + node.x * zoom - container.clientWidth / 2 + (node.w * zoom) / 2;
      const top = contentTop() + node.y * zoom - container.clientHeight / 2 + (node.h * zoom) / 2;
      programmaticUntil = nowMs() + PROGRAMMATIC_SCROLL_MS;
      container.scrollTo({
        left: Math.max(0, left),
        top: Math.max(0, top),
        behavior: instant ? 'auto' : 'smooth',
      });
    },
    // Which step is nearest the middle of the viewport right now.
    nearestNodeToCentre() {
      return nearestNodeId(model.nodes, {
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
        clientWidth: container.clientWidth,
        clientHeight: container.clientHeight,
        stageLeft: contentLeft(),
        stageTop: contentTop(),
        zoom,
        horizontal: horizontalFlow,
      });
    },
    // Hover, focus, and an open modal all freeze the crawl, matching the
    // animation pause so the whole diagram stops together.
    pauseAutoScroll() {
      pausedBy.hover = true;
      syncScrollPause();
    },
    resumeAutoScroll() {
      pausedBy.hover = false;
      lastFrame = 0;
      scrollPos = scrollAxis() === 'left' ? container.scrollLeft : container.scrollTop;
      syncScrollPause();
    },
    startAutoScroll,
    stopAutoScroll,
    setSpeed(next) {
      speedMult = Number.isFinite(next) && next > 0 ? next : 1;
    },
    setScrollMode(mode) {
      scrollMode = mode === 'bounce' ? 'bounce' : 'loop';
      if (scrollWanted) {
        stopAutoScroll();
        startAutoScroll();
      }
    },
    // Begin at the title, so a loop opens on it rather than making the viewer
    // wait a whole cycle to find out what they are looking at.
    restartAutoScroll() {
      scrollDir = 1;
      holdUntil = 0;
      lastFrame = 0;
      scrollPos = seamStartPos();
      if (scrollAxis() === 'left') {
        container.scrollLeft = Math.round(scrollPos);
        container.scrollTop = 0;
      } else {
        container.scrollTop = Math.round(scrollPos);
        container.scrollLeft = 0;
      }
    },
    isAutoScrolling: () => scrollWanted,
    destroy() {
      stopAutoScroll();
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('scroll', onScroll);
      resizeObserver?.disconnect();
    },
  };
}
