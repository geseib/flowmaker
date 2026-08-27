import { DENSITY, DENSITY_KEYS, DIRECTION_KEYS } from './constants.js';
import { PALETTES, getPalette, deriveTokens } from './palettes.js';
import { STYLES, getStyle } from './styles/index.js';
import { renderSvg, styleCss } from './render.js';
import { RUNTIME_CSS, attachRuntime, ANIMATE_CSS } from './runtime.js';
import { CANVAS_CSS, createCanvas } from './canvas.js';
import { browserMeasure } from './measure.js';
import { showIconsFor } from './icons.js';
import { buildExport } from './export.js';
import { resolveDocument } from './app.js';

const STORE_KEY = 'flowmaker.prefs.v1';
const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const SAMPLE_FILES = [
  ['order-processing.md', 'Order Processing'],
  ['product-development-lifecycle.md', 'Product Development Lifecycle'],
  ['interviewing-and-selection.md', 'Interviewing & Selection'],
  ['customer-onboarding-kyc.md', 'Customer Onboarding & KYC'],
  ['incident-response.md', 'Incident Response'],
];

const STARTER_DOC = `---
title: Untitled Flow
subtitle: Paste your mermaid here, or load a sample
style: infographic
palette: harbor
direction: LR
density: standard
---

\`\`\`mermaid
flowchart LR
  A([Start]) --> B[Review Document]
  B --> C{Looks right?}
  C -->|No| B
  C -->|Yes| D[Capture Payment]
  D --> E([Done])
\`\`\`

## A — Start
> Where the flow begins, before any work has been done.

Replace this document with your own. Every node needs a matching \`## <id> — <Title>\` section.

## B — Review Document
> The main step, where the actual work happens.

The first blockquote becomes the hover tooltip. Everything after it becomes the click-through detail card, and it can hold lists, tables, links, and code.

## C — Looks right?
> A decision that can send the work back around for another pass.

Loop-backs are drawn in the alert colour beneath the main spine, so a rework cycle reads as intentional rather than as a layout mistake.

## D — Capture Payment
> A step whose label resolves an icon automatically in the Infographic style.

Icons come from the node label first, then from the mermaid shape. You can also force one with \`D:::icon-money\`.

## E — Done
> The terminal state, coloured with the accent swatch in every style.

Terminal nodes use the stadium or circle shapes and pick up the third palette swatch automatically.
`;

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(prefs));
  } catch {
    /* private mode: preferences simply do not persist */
  }
}

const STUDIO_HTML = `
<style id="fm-style-tag"></style>
<div class="fm-root">
  <header class="fm-topbar">
    <strong class="fm-brand">FlowMaker</strong>
    <span id="fm-title" class="fm-doc-title"></span>
    <span id="fm-subtitle" class="fm-doc-subtitle"></span>
    <div class="fm-topbar-actions">
      <label class="fm-file">Upload .md<input type="file" id="fm-upload" accept=".md,.markdown,text/markdown" hidden></label>
      <select id="fm-samples" aria-label="Load a sample">
        <option value="">Load sample&hellip;</option>
        ${SAMPLE_FILES.map(([f, n]) => `<option value="${f}">${n}</option>`).join('')}
      </select>
      <button type="button" data-action="download" class="fm-primary">Export HTML</button>
    </div>
  </header>

  <div class="fm-body">
    <aside class="fm-rail">
      <h2>Style</h2><div id="fm-style-list" class="fm-style-list"></div>
      <h2>Palette</h2><div id="fm-palette-list" class="fm-palette-list"></div>
      <h2>Layout</h2>
      <label>Density <select id="fm-density"></select></label>
      <label>Direction <select id="fm-direction"></select></label>
      <h2>Motion</h2>
      <div class="fm-seg">
        <button type="button" data-action="anim-pulse" aria-pressed="true">Pulse</button>
        <button type="button" data-action="anim-walkthrough" aria-pressed="false">Walk</button>
        <button type="button" data-action="anim-off" aria-pressed="false">Still</button>
      </div>
      <div class="fm-seg" style="margin-top:.4rem">
        <button type="button" data-action="toggle-scroll" aria-pressed="false">Auto-scroll</button>
      </div>
      <div class="fm-seg" style="margin-top:.4rem">
        <button type="button" data-action="present" class="fm-primary">Present</button>
      </div>
    </aside>

    <main class="fm-main">
      <section class="fm-panel">
        <div class="fm-panel-tabs">
          <button type="button" data-flip="fm-canvas-card" data-face="front" aria-pressed="true">Beautiful Flow</button>
          <button type="button" data-flip="fm-canvas-card" data-face="back" aria-pressed="false">Mermaid Source</button>
          <div class="fm-zoom">
            <button type="button" data-action="zoom-out" aria-label="Zoom out">&minus;</button>
            <span id="fm-zoom-label">100%</span>
            <button type="button" data-action="zoom-in" aria-label="Zoom in">+</button>
            <button type="button" data-action="fit-width">Fit width</button>
            <button type="button" data-action="fit-height">Fit height</button>
            <button type="button" data-action="actual">1:1</button>
          </div>
        </div>
        <div class="fm-flip" id="fm-canvas-card" data-face="front">
          <div class="fm-face fm-face-front">
            <div class="fm-canvas" id="fm-canvas"><div class="fm-stage" id="fm-stage"></div></div>
          </div>
          <div class="fm-face fm-face-back"><pre id="fm-mermaid-out" class="fm-code"></pre></div>
        </div>
      </section>

      <section class="fm-panel fm-panel-editor">
        <div class="fm-panel-tabs">
          <button type="button" data-flip="fm-editor-card" data-face="front" aria-pressed="true">Markdown</button>
          <button type="button" data-flip="fm-editor-card" data-face="back" aria-pressed="false">Generated HTML</button>
          <div class="fm-zoom">
            <button type="button" data-action="copy-code">Copy</button>
            <button type="button" data-action="download">Download</button>
          </div>
        </div>
        <div class="fm-flip" id="fm-editor-card" data-face="front">
          <div class="fm-face fm-face-front">
            <textarea id="fm-editor" spellcheck="false" aria-label="FlowMaker markdown source"></textarea>
          </div>
          <div class="fm-face fm-face-back"><pre id="fm-code-out" class="fm-code"></pre></div>
        </div>
      </section>
    </main>
  </div>

  <ul class="fm-warnings" id="fm-warnings" hidden aria-live="polite"></ul>
  <div class="fm-present-bar" id="fm-present-bar" hidden>
    <span class="fm-present-title" id="fm-present-title"></span>
    <div class="fm-present-actions">
      <button type="button" data-action="toggle-scroll" aria-pressed="false">Auto-scroll</button>
      <button type="button" data-action="anim-pulse">Pulse</button>
      <button type="button" data-action="anim-walkthrough">Walk</button>
      <button type="button" data-action="anim-off">Still</button>
      <button type="button" data-action="exit-present" class="fm-present-exit" aria-label="Exit presentation" title="Exit (Esc)">&times;</button>
    </div>
  </div>
</div>
`;

export function mountStudio(root) {
  const state = {
    source: STARTER_DOC,
    overrides: loadPrefs(),
    animationMode: 'pulse',
    autoScroll: true,
    presenting: false,
    resolved: null,
    canvas: null,
    runtime: null,
  };

  root.innerHTML = STUDIO_HTML;
  const el = (sel) => root.querySelector(sel);
  const styleTag = el('#fm-style-tag');
  const editor = el('#fm-editor');
  const canvasHost = el('#fm-canvas');
  const stage = el('#fm-stage');
  const codeOut = el('#fm-code-out');
  const mermaidOut = el('#fm-mermaid-out');
  const warnStrip = el('#fm-warnings');
  const fmRoot = root.querySelector('.fm-root');

  el('#fm-style-list').innerHTML = STYLES.map((s) => `
    <button type="button" class="fm-swatch-card" data-style="${s.key}" aria-pressed="false">
      <span class="fm-swatch-card-name">${s.name}</span>
    </button>`).join('');

  el('#fm-palette-list').innerHTML = PALETTES.map((p) => `
    <button type="button" class="fm-palette-chip" data-palette="${p.key}" aria-pressed="false" title="${p.name}">
      <span style="background:${p.c1}"></span><span style="background:${p.c2}"></span>
      <span style="background:${p.c3}"></span><span style="background:${p.c4}"></span>
      <em>${p.name}</em>
    </button>`).join('');

  el('#fm-density').innerHTML = DENSITY_KEYS
    .map((d) => `<option value="${d}">${d[0].toUpperCase()}${d.slice(1)}</option>`).join('');
  el('#fm-direction').innerHTML = DIRECTION_KEYS
    .map((d) => `<option value="${d}">${d}</option>`).join('');

  function exportInput() {
    const r = state.resolved;
    return {
      meta: r.meta,
      graph: r.graph,
      details: r.details,
      styleKey: r.meta.style,
      paletteKey: r.meta.palette,
      density: r.meta.density,
      direction: r.meta.direction,
      animationMode: state.animationMode,
      autoScroll: state.autoScroll,
    };
  }

  function refreshExport() {
    codeOut.textContent = buildExport(exportInput(), { runtimeJs: window.__FM_RUNTIME_BUNDLE__ ?? '' });
  }

  function render() {
    const spec = DENSITY[state.overrides.density ?? 'standard'] ?? DENSITY.standard;
    const measure = browserMeasure(spec, FONT_STACK);
    const resolved = resolveDocument(state.source, state.overrides, measure);
    state.resolved = resolved;

    const activeStyle = getStyle(resolved.meta.style);
    const palette = getPalette(resolved.meta.palette);
    const tokens = deriveTokens(palette, { dark: activeStyle.dark });

    styleTag.textContent = [
      styleCss(activeStyle.key, tokens, resolved.meta.density),
      CANVAS_CSS,
      RUNTIME_CSS,
      ANIMATE_CSS,
    ].join('\n');
    fmRoot.dataset.fmStyle = activeStyle.key;

    state.runtime?.destroy();
    state.canvas?.destroy();

    stage.innerHTML = renderSvg(resolved.model, {
      styleKey: activeStyle.key,
      palette,
      meta: resolved.meta,
      details: resolved.details,
    });

    state.canvas = createCanvas(canvasHost, resolved.model, {
      onZoom: (z) => { el('#fm-zoom-label').textContent = `${Math.round(z * 100)}%`; },
    });
    state.runtime = attachRuntime(canvasHost, {
      details: resolved.details,
      model: resolved.model,
      animationMode: state.animationMode,
      scrollTo: (node) => state.canvas.scrollToNode(node),
      // Hovering a step, focusing it, or opening its card freezes the crawl too.
      onPause: () => state.canvas?.pauseAutoScroll(),
      onResume: () => state.canvas?.resumeAutoScroll(),
    });
    if (state.autoScroll ?? scrollDefaultFor(state.animationMode)) state.canvas.startAutoScroll();

    mermaidOut.textContent = resolved.mermaidSrc;
    refreshExport();

    for (const b of root.querySelectorAll('[data-style]')) {
      b.setAttribute('aria-pressed', String(b.dataset.style === activeStyle.key));
    }
    for (const b of root.querySelectorAll('[data-palette]')) {
      b.setAttribute('aria-pressed', String(b.dataset.palette === palette.key));
    }
    el('#fm-density').value = resolved.meta.density;
    el('#fm-direction').value = resolved.meta.direction;
    el('#fm-title').textContent = resolved.meta.title;
    el('#fm-present-title').textContent = resolved.meta.title;
    el('#fm-subtitle').textContent = resolved.meta.subtitle;

    warnStrip.hidden = resolved.warnings.length === 0;
    warnStrip.innerHTML = resolved.warnings
      .map((w) => `<li><code>${w.code}</code> ${w.message.replace(/</g, '&lt;')}</li>`).join('');

    savePrefs({ style: resolved.meta.style, palette: resolved.meta.palette, density: resolved.meta.density });
  }

  // Pulse travels the flow, so the crawl rides with it. A walkthrough already
  // scrolls itself to each active step, so a second scroller would fight it.
  function scrollDefaultFor(mode) {
    return mode === 'pulse';
  }

  function setAutoScroll(on) {
    state.autoScroll = on;
    if (on) state.canvas?.startAutoScroll();
    else state.canvas?.stopAutoScroll();
    for (const b of root.querySelectorAll('[data-action="toggle-scroll"]')) {
      b.setAttribute('aria-pressed', String(on));
    }
  }

  function setPresenting(on) {
    state.presenting = on;
    root.dataset.present = String(on);
    el('#fm-present-bar').hidden = !on;
    el('#fm-present-title').textContent = state.resolved?.meta.title ?? '';
    // A booth screen wants the crawl running; leaving present mode restores
    // whatever the user had before.
    if (on) {
      state.scrollBeforePresent = state.autoScroll;
      setAutoScroll(true);
      root.requestFullscreen?.().catch(() => { /* denied: the in-page mode still applies */ });
      el('.fm-present-exit').focus();
    } else {
      setAutoScroll(state.scrollBeforePresent ?? false);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    }
    // The canvas changed size, so re-fit to the new viewport.
    requestAnimationFrame(() => state.canvas?.fitDefault());
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.presenting) setPresenting(false);
  });
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && state.presenting) setPresenting(false);
  });

  let debounce = null;
  editor.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      state.source = editor.value;
      render();
    }, 250);
  });

  async function loadText(text) {
    state.source = text;
    editor.value = text;
    state.overrides = {};
    render();
  }

  el('#fm-upload').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (file) await loadText(await file.text());
  });

  root.addEventListener('dragover', (e) => {
    e.preventDefault();
    root.dataset.dropping = 'true';
  });
  root.addEventListener('dragleave', () => { root.dataset.dropping = 'false'; });
  root.addEventListener('drop', async (e) => {
    e.preventDefault();
    root.dataset.dropping = 'false';
    const file = e.dataTransfer?.files?.[0];
    if (file) await loadText(await file.text());
  });

  el('#fm-samples').addEventListener('change', async (e) => {
    const name = e.target.value;
    if (!name) return;
    const embedded = window.__FM_SAMPLES__?.[name];
    await loadText(embedded ?? await (await fetch(`samples/${name}`)).text());
  });

  root.addEventListener('click', (e) => {
    const styleBtn = e.target.closest('[data-style]');
    if (styleBtn) {
      state.overrides.style = styleBtn.dataset.style;
      render();
      return;
    }
    const palBtn = e.target.closest('[data-palette]');
    if (palBtn) {
      state.overrides.palette = palBtn.dataset.palette;
      render();
      return;
    }
    const flip = e.target.closest('[data-flip]');
    if (flip) {
      const card = root.querySelector(`#${flip.dataset.flip}`);
      card.dataset.face = flip.dataset.face;
      for (const t of root.querySelectorAll(`[data-flip="${flip.dataset.flip}"]`)) {
        t.setAttribute('aria-pressed', String(t.dataset.face === card.dataset.face));
      }
      return;
    }
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'zoom-in') state.canvas.zoomBy(1.2);
    if (action === 'zoom-out') state.canvas.zoomBy(1 / 1.2);
    if (action === 'fit-width') state.canvas.fitWidth();
    if (action === 'fit-height') state.canvas.fitHeight();
    if (action === 'actual') state.canvas.actualSize();
    if (action.startsWith('anim-')) {
      state.animationMode = action.slice(5);
      state.runtime.setAnimationMode(state.animationMode);
      for (const b of root.querySelectorAll('[data-action^="anim-"]')) {
        b.setAttribute('aria-pressed', String(b.dataset.action === action));
      }
      setAutoScroll(scrollDefaultFor(state.animationMode));
      refreshExport();
    }
    if (action === 'toggle-scroll') setAutoScroll(!state.autoScroll);
    if (action === 'present') setPresenting(true);
    if (action === 'exit-present') setPresenting(false);
    if (action === 'copy-code') navigator.clipboard?.writeText(codeOut.textContent);
    if (action === 'download') {
      const blob = new Blob([codeOut.textContent], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${(state.resolved.meta.title || 'flow').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  });

  for (const [id, key] of [['fm-density', 'density'], ['fm-direction', 'direction']]) {
    el(`#${id}`).addEventListener('change', (ev) => {
      state.overrides[key] = ev.target.value;
      render();
    });
  }

  editor.value = state.source;
  render();
  const api = { render, state };
  // Handy for debugging in the console and for driving the app from tests.
  if (typeof window !== 'undefined') window.__flowmaker = api;
  return api;
}
