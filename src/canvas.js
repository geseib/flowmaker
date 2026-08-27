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
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  background: var(--ground);
  cursor: grab;
  touch-action: pan-x pan-y;
}
.fm-canvas[data-panning="true"] { cursor: grabbing; user-select: none; }
.fm-stage { transform-origin: 0 0; will-change: transform; margin: auto; }
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
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : 0);

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
export function advanceScroll({ pos, dir, max, dt, speed, now, holdUntil }) {
  if (max <= 1) return { pos, dir, holdUntil, moved: false };
  if (now < holdUntil) return { pos, dir, holdUntil, moved: false };

  let next = pos + dir * speed * dt;
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
  return { pos: next, dir: nextDir, holdUntil: nextHold, moved: true };
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
  let scrollTimer = null;

  const scrollAxis = () => (model.direction === 'TD' || model.direction === 'BT' ? 'top' : 'left');

  function scrollFrame(now) {
    if (scrollPaused) { lastFrame = now; return; }
    const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0;
    lastFrame = now;
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
      speed: SCROLL_PX_PER_SEC[model.density] ?? SCROLL_PX_PER_SEC.standard,
      now,
      holdUntil,
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
    scrollPos = scrollAxis() === 'left' ? container.scrollLeft : container.scrollTop;
    scrollTimer = setInterval(() => scrollFrame(nowMs()), TIMER_INTERVAL_MS);
  }

  function stopAutoScroll() {
    scrollWanted = false;
    container.dataset.autoscroll = 'false';
    if (scrollTimer !== null) { clearInterval(scrollTimer); scrollTimer = null; }
    if (dragResume !== null) { clearTimeout(dragResume); dragResume = null; }
    pausedBy.drag = false;
    syncScrollPause();
  }

  const onResize = () => {
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
    scrollToNode(node) {
      if (!node) return;
      const targetLeft = node.x * zoom - container.clientWidth / 2 + (node.w * zoom) / 2;
      const targetTop = node.y * zoom - container.clientHeight / 2 + (node.h * zoom) / 2;
      container.scrollTo({ left: Math.max(0, targetLeft), top: Math.max(0, targetTop), behavior: 'smooth' });
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
    // Send the view back to the start and travel forward again.
    restartAutoScroll() {
      scrollPos = 0;
      scrollDir = 1;
      holdUntil = 0;
      lastFrame = 0;
      container.scrollLeft = 0;
      container.scrollTop = 0;
    },
    isAutoScrolling: () => scrollWanted,
    destroy() {
      stopAutoScroll();
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      container.removeEventListener('wheel', onWheel);
      resizeObserver?.disconnect();
    },
  };
}
