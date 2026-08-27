import { mdToHtml } from './md.js';
import { createAnimator, ANIMATE_CSS } from './animate.js';

export { ANIMATE_CSS };

export const RUNTIME_CSS = `
.fm-tooltip {
  position: absolute; z-index: 40; max-width: 34ch; pointer-events: none;
  padding: .6em .8em; border-radius: 10px; opacity: 0;
  transition: opacity .14s ease;
  background: var(--surface); color: var(--ink);
  border: 1px solid var(--border);
  box-shadow: 0 10px 30px rgb(0 0 0 / .22);
  font-size: 1rem; line-height: 1.4;
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
@media (prefers-reduced-motion: reduce) {
  .fm-tooltip, .fm-modal-backdrop, .fm-modal { transition: none; }
}
`.trim();

const FOCUSABLE = 'a[href], button, [tabindex]:not([tabindex="-1"])';
const cssEscape = (s) => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&'));

export function attachRuntime(root, config = {}) {
  const details = config.details ?? {};
  const model = config.model ?? { nodes: [], edges: [] };
  const doc = root.ownerDocument;

  const tooltip = doc.createElement('div');
  tooltip.className = 'fm-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  root.appendChild(tooltip);

  // The modal is fixed-position chrome. Mounting it inside the pannable canvas
  // let the canvas capture the pointer and swallow clicks meant for the modal,
  // so it lives on the styled root instead (which still supplies the tokens).
  const chromeHost = root.closest('.fm-root') ?? doc.body;

  const backdrop = doc.createElement('div');
  backdrop.className = 'fm-modal-backdrop';
  backdrop.innerHTML = '<div class="fm-modal" role="dialog" aria-modal="true" aria-labelledby="fm-modal-title">'
    + '<button class="fm-modal-close" type="button" aria-label="Close details">&times;</button>'
    + '<p class="fm-modal-eyebrow"></p><h2 id="fm-modal-title"></h2>'
    + '<p class="fm-modal-lede"></p><div class="fm-modal-body"></div></div>';
  chromeHost.appendChild(backdrop);

  const modal = backdrop.querySelector('.fm-modal');
  const closeBtn = backdrop.querySelector('.fm-modal-close');
  let lastFocus = null;
  let hoverPauses = 0;

  const animator = createAnimator(root, model, {
    mode: config.animationMode ?? 'pulse',
    prefersReducedMotion: config.prefersReducedMotion,
    onStep: config.onStep,
    scrollTo: config.scrollTo,
  });

  const elFor = (id) => root.querySelector(`.fm-node[data-node-id="${cssEscape(id)}"]`);

  function showTooltip(el) {
    const id = el.dataset.nodeId;
    const detail = details[id];
    if (!detail?.tooltip) return;
    tooltip.textContent = detail.tooltip;
    tooltip.dataset.open = 'true';
    const box = el.getBoundingClientRect();
    const host = root.getBoundingClientRect();
    tooltip.style.left = `${box.left - host.left + box.width / 2 + root.scrollLeft}px`;
    tooltip.style.top = `${box.top - host.top - 12 + root.scrollTop}px`;
    tooltip.style.transform = 'translate(-50%, -100%)';
  }

  function hideTooltip() {
    tooltip.dataset.open = 'false';
  }

  // Everything that freezes motion goes through these two, so the pulse, the
  // walkthrough, and the auto-scroll always stop and start together.
  function pauseAll() {
    animator.pause();
    config.onPause?.();
  }

  function resumeAll() {
    animator.resume();
    config.onResume?.();
  }

  function pauseForHover() {
    hoverPauses += 1;
    if (hoverPauses === 1) pauseAll();
  }

  function resumeAfterHover() {
    hoverPauses = Math.max(0, hoverPauses - 1);
    if (hoverPauses === 0 && backdrop.dataset.open !== 'true') resumeAll();
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
    backdrop.dataset.open = 'true';
    pauseAll();
    hideTooltip();
    closeBtn.focus();
  }

  function closeModal() {
    if (backdrop.dataset.open !== 'true') return;
    backdrop.dataset.open = 'false';
    if (hoverPauses === 0) resumeAll();
    if (lastFocus?.focus) lastFocus.focus();
    lastFocus = null;
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
        next.focus();
        showTooltip(next);
      }
    }
  }

  const onOver = (e) => {
    const n = e.target.closest?.('.fm-node');
    if (n) {
      showTooltip(n);
      pauseForHover();
    }
  };
  const onOut = (e) => {
    const n = e.target.closest?.('.fm-node');
    if (n) {
      hideTooltip();
      resumeAfterHover();
    }
  };
  const onFocusIn = (e) => {
    const n = e.target.closest?.('.fm-node');
    if (n) {
      showTooltip(n);
      pauseForHover();
    }
  };
  const onFocusOut = (e) => {
    const n = e.target.closest?.('.fm-node');
    if (n) {
      hideTooltip();
      resumeAfterHover();
    }
  };
  const onClick = (e) => {
    const n = e.target.closest?.('.fm-node');
    if (n?.dataset.hasDetail === 'true') openModal(n.dataset.nodeId);
  };
  const onBackdrop = (e) => {
    if (e.target === backdrop) closeModal();
  };

  root.addEventListener('pointerover', onOver);
  root.addEventListener('pointerout', onOut);
  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('focusout', onFocusOut);
  root.addEventListener('click', onClick);
  backdrop.addEventListener('click', onBackdrop);
  closeBtn.addEventListener('click', closeModal);
  doc.addEventListener('keydown', onKeyDown);

  return {
    animator,
    setAnimationMode: (mode) => animator.setMode(mode),
    pause: pauseAll,
    resume: resumeAll,
    focusNode: (id) => {
      const el = elFor(id);
      if (el) {
        el.focus();
        showTooltip(el);
      }
    },
    openModal,
    closeModal,
    destroy() {
      animator.destroy();
      root.removeEventListener('pointerover', onOver);
      root.removeEventListener('pointerout', onOut);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
      root.removeEventListener('click', onClick);
      backdrop.removeEventListener('click', onBackdrop);
      closeBtn.removeEventListener('click', closeModal);
      doc.removeEventListener('keydown', onKeyDown);
      tooltip.remove();
      backdrop.remove();
    },
  };
}
