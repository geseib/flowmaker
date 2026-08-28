import { DENSITY } from './constants.js';
import { layout } from './layout.js';
import { renderSvg } from './render.js';
import { getPalette } from './palettes.js';
import { attachRuntime } from './runtime.js';
import { createCanvas } from './canvas.js';
import { browserMeasure } from './measure.js';
import { showIconsFor } from './icons.js';

const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export function bootExport() {
  const data = window.__FLOWMAKER_DATA__;
  if (!data) return;
  const root = document.getElementById('fm-root');
  const host = document.getElementById('fm-canvas');
  const stage = document.getElementById('fm-stage');
  if (!root || !host || !stage) return;
  const spec = DENSITY[data.density] ?? DENSITY.standard;

  // Re-run layout on load with real measurement, so one exported file is
  // correct on a 4K marquee and on a phone.
  const model = layout(data.graph, {
    direction: data.direction,
    density: data.density,
    measure: browserMeasure(spec, FONT_STACK),
    iconSpace: showIconsFor(data.styleKey),
    loops: data.loops,
    layout: data.layout,
  });

  stage.innerHTML = renderSvg(model, {
    styleKey: data.styleKey,
    palette: getPalette(data.paletteKey),
    meta: data.meta,
    details: data.details,
    colorBy: data.colorBy,
  });

  let runtimeRef = null;
  const canvas = createCanvas(host, model, {
    speed: data.speed,
    seamTitle: data.meta?.title,
    seamSubtitle: data.meta?.subtitle,
    // Scrolling by hand during a walkthrough carries the highlight along and
    // holds the auto-advance while the viewer looks around.
    onUserScroll: () => {
      if (runtimeRef?.getMode?.() !== 'walkthrough') return;
      const id = canvas.nearestNodeToCentre();
      if (id) runtimeRef.goToId(id);
      runtimeRef.deferAdvance(2500);
    },
  });
  const runtime = attachRuntime(host, {
    details: data.details,
    model,
    animationMode: data.animationMode,
    speed: data.speed,
    scrollTo: (node) => canvas.scrollToNode(node),
    // Hovering a step freezes the crawl as well as the pulse.
    onPause: () => canvas.pauseAutoScroll(),
    onResume: () => canvas.resumeAutoScroll(),
  });

  const setScroll = (on) => {
    if (on) canvas.startAutoScroll();
    else canvas.stopAutoScroll();
    for (const b of root.querySelectorAll('[data-fm-action="toggle-scroll"]')) {
      b.setAttribute('aria-pressed', String(on));
    }
  };

  let scrollBeforePresent = false;
  const setPresenting = (on) => {
    root.dataset.present = String(on);
    root.querySelector('#fm-present-tools').hidden = !on;
    if (on) {
      scrollBeforePresent = canvas.isAutoScrolling();
      setScroll(true);
      restart();
      root.requestFullscreen?.().catch(() => { /* denied: in-page mode still applies */ });
    } else {
      setScroll(scrollBeforePresent);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    }
    requestAnimationFrame(() => canvas.fitDefault());
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.dataset.present === 'true') setPresenting(false);
  });
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && root.dataset.present === 'true') setPresenting(false);
  });

  if (data.autoScroll ?? data.animationMode === 'pulse') setScroll(true);

  const restart = () => {
    canvas.restartAutoScroll();
    runtime.restart();
  };

  const setPressed = (action) => {
    for (const b of root.querySelectorAll('[data-fm-action^="anim-"]')) {
      b.setAttribute('aria-pressed', String(b.dataset.fmAction === action));
    }
  };
  setPressed(`anim-${data.animationMode === 'walkthrough' ? 'walk' : data.animationMode}`);

  root.addEventListener('click', (e) => {
    const speedBtn = e.target.closest('[data-fm-speed]');
    if (speedBtn) {
      const next = Number(speedBtn.dataset.fmSpeed);
      canvas.setSpeed(next);
      runtime.setSpeed(next);
      for (const b of root.querySelectorAll('[data-fm-speed]')) {
        b.setAttribute('aria-pressed', String(Number(b.dataset.fmSpeed) === next));
      }
      return;
    }
    const action = e.target.closest('[data-fm-action]')?.dataset.fmAction;
    if (!action) return;
    if (action === 'anim-pulse') { runtime.setAnimationMode('pulse'); setPressed(action); setScroll(true); }
    if (action === 'anim-walk') { runtime.setAnimationMode('walkthrough'); setPressed(action); setScroll(false); }
    if (action === 'anim-off') { runtime.setAnimationMode('off'); setPressed(action); setScroll(false); }
    if (action === 'fit-width') canvas.fitDefault();
    if (action === 'zoom-in') canvas.zoomBy(1.2);
    if (action === 'zoom-out') canvas.zoomBy(1 / 1.2);
    if (action === 'toggle-scroll') setScroll(!canvas.isAutoScrolling());
    if (action === 'restart') restart();
    if (action === 'present') setPresenting(true);
    if (action === 'exit-present') setPresenting(false);
  });

}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootExport);
  else bootExport();
}
