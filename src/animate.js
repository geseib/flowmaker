export const ANIMATE_CSS = `
.fm-pulse {
  fill: var(--c3);
  filter: drop-shadow(0 0 calc(var(--stroke) * 3) var(--c3));
  pointer-events: none;
}
.fm-pulse[data-back="true"] { fill: var(--c4); filter: drop-shadow(0 0 calc(var(--stroke) * 3) var(--c4)); }
.fm-root[data-anim="off"] .fm-layer-pulses { display: none; }
.fm-root[data-paused="true"] .fm-pulse { animation-play-state: paused; }
@keyframes fm-travel { from { offset-distance: 0%; } to { offset-distance: 100%; } }
@keyframes fm-dash { to { stroke-dashoffset: -1000; } }
.fm-root[data-anim="walkthrough"] .fm-node { transition: opacity .32s ease; }
.fm-root[data-anim="walkthrough"] .fm-edge { transition: opacity .32s ease; }
@media (prefers-reduced-motion: reduce) {
  .fm-pulse { animation: none !important; display: none; }
  .fm-node, .fm-edge { transition: none !important; }
}
`.trim();

// Rank-major, order-minor. Guarantees termination on cyclic graphs and reads
// left-to-right on screen, which is what a booth audience follows.
export function walkOrder(model) {
  return [...(model.nodes ?? [])]
    .map((n, i) => ({ id: n.id, rank: n.rank ?? 0, order: n.order ?? 0, i }))
    .sort((a, b) => (a.rank - b.rank) || (a.order - b.order) || (a.i - b.i))
    .map((n) => n.id);
}

const PULSE_MS = { marquee: 2600, standard: 2000, compact: 1700 };
const STEP_MS = { marquee: 2800, standard: 2000, compact: 1500 };

export function createAnimator(root, model, opts = {}) {
  const doc = root.ownerDocument;
  const svg = root.querySelector('svg');
  const reduced = opts.prefersReducedMotion
    ?? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

  const state = {
    mode: reduced ? 'off' : (opts.mode ?? 'pulse'),
    playing: false,
    paused: false,
    activeIndex: -1,
  };
  const order = walkOrder(model);
  let pulseLayer = null;
  let timer = null;

  function clearPulses() {
    pulseLayer?.remove();
    pulseLayer = null;
  }

  // One dot per edge, positioned with CSS motion paths so the dot follows the
  // exact routed geometry, including the back-edge gutter arcs.
  function buildPulses() {
    clearPulses();
    if (!svg) return;
    const spec = model.density === 'marquee' ? 7 : model.density === 'compact' ? 3 : 4.5;
    pulseLayer = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
    pulseLayer.setAttribute('class', 'fm-layer-pulses');
    pulseLayer.setAttribute('aria-hidden', 'true');
    const duration = PULSE_MS[model.density] ?? PULSE_MS.standard;
    model.edges.forEach((e, i) => {
      if (!e.path) return;
      const dot = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('class', 'fm-pulse');
      dot.setAttribute('cx', '0');
      dot.setAttribute('cy', '0');
      dot.setAttribute('r', String(spec));
      if (e.isBackEdge) dot.setAttribute('data-back', 'true');
      dot.style.offsetPath = `path("${e.path}")`;
      dot.style.offsetRotate = '0deg';
      dot.style.animation = `fm-travel ${duration}ms linear infinite`;
      // Stagger by index so the whole diagram does not strobe in lockstep.
      dot.style.animationDelay = `${(i % 5) * (duration / 5)}ms`;
      pulseLayer.appendChild(dot);
    });
    svg.appendChild(pulseLayer);
  }

  function paintWalk() {
    const activeId = order[state.activeIndex];
    for (const el of root.querySelectorAll('.fm-node')) {
      const isActive = el.dataset.nodeId === activeId;
      el.dataset.active = isActive ? 'true' : 'false';
      el.dataset.dimmed = state.mode === 'walkthrough' && !isActive ? 'true' : 'false';
    }
    for (const el of root.querySelectorAll('.fm-edge')) {
      const touching = el.dataset.edge?.split('__').includes(activeId);
      el.style.opacity = state.mode === 'walkthrough' && !touching ? '.45' : '';
    }
    if (activeId && opts.onStep) opts.onStep(activeId, state.activeIndex, order.length);
    if (activeId && opts.scrollTo) opts.scrollTo(model.nodes.find((n) => n.id === activeId));
  }

  function clearWalkPaint() {
    for (const el of root.querySelectorAll('.fm-node')) {
      el.dataset.active = 'false';
      el.dataset.dimmed = 'false';
    }
    for (const el of root.querySelectorAll('.fm-edge')) el.style.opacity = '';
  }

  function tick() {
    if (state.paused || state.mode !== 'walkthrough' || !state.playing) return;
    state.activeIndex = (state.activeIndex + 1) % Math.max(1, order.length);
    paintWalk();
  }

  function stopTimer() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function startTimer() {
    stopTimer();
    if (state.mode !== 'walkthrough' || !state.playing || state.paused) return;
    timer = setInterval(tick, STEP_MS[model.density] ?? STEP_MS.standard);
  }

  function applyMode() {
    root.dataset.anim = state.mode;
    stopTimer();
    clearPulses();
    clearWalkPaint();
    if (state.mode === 'pulse') {
      buildPulses();
      state.playing = true;
    } else if (state.mode === 'walkthrough') {
      if (state.activeIndex < 0) state.activeIndex = 0;
      state.playing = true;
      paintWalk();
      startTimer();
    } else {
      state.playing = false;
    }
  }

  applyMode();

  return {
    setMode(mode) {
      state.mode = ['pulse', 'walkthrough', 'off'].includes(mode) ? mode : 'off';
      applyMode();
    },
    play() {
      state.playing = true;
      root.dataset.paused = 'false';
      startTimer();
    },
    stop() {
      state.playing = false;
      stopTimer();
    },
    pause() {
      state.paused = true;
      root.dataset.paused = 'true';
      stopTimer();
    },
    resume() {
      state.paused = false;
      root.dataset.paused = 'false';
      startTimer();
    },
    next() {
      state.activeIndex = (state.activeIndex + 1) % Math.max(1, order.length);
      paintWalk();
    },
    prev() {
      state.activeIndex = (state.activeIndex - 1 + order.length) % Math.max(1, order.length);
      paintWalk();
    },
    getState: () => ({ ...state, activeId: order[state.activeIndex] ?? null, total: order.length }),
    destroy() {
      stopTimer();
      clearPulses();
      clearWalkPaint();
    },
  };
}
