import { DENSITY, DENSITY_KEYS, DIRECTION_KEYS, LOOP_KEYS, LAYOUT_KEYS, COLOR_BY_KEYS, SPEEDS, DEFAULT_SPEED } from './constants.js';
import { PALETTES, getPalette, deriveTokens } from './palettes.js';
import { STYLES, getStyle } from './styles/index.js';
import { renderSvg, styleCss } from './render.js';
import { RUNTIME_CSS, attachRuntime, ANIMATE_CSS } from './runtime.js';
import { CANVAS_CSS, createCanvas } from './canvas.js';
import { browserMeasure } from './measure.js';
import { showIconsFor } from './icons.js';
import { buildExport } from './export.js';
import { buildEmbed } from './embed.js';
import { buildStandaloneSvg, fileNameFor } from './svg.js';
import { resolveDocument } from './app.js';
import { documentToHtml } from './md.js';
import { renderMermaidPreview } from './mermaid-preview.js';
import { AUTHORING_PROMPT } from './prompt.js';
import { replaceMermaidBlock } from './parse.js';

const STORE_KEY = 'flowmaker.prefs.v1';
// What each colouring mode keys off, said plainly rather than as its key.
const COLOR_BY_LABELS = { type: 'Node type', level: 'Level', group: 'Group', tag: 'Tag' };
// How long the walkthrough waits after someone scrolls the canvas by hand.
const WALK_SCROLL_HOLD_MS = 2500;
const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const SAMPLE_FILES = [
  ['order-processing.md', 'Order Processing'],
  ['product-development-lifecycle.md', 'Product Development Lifecycle'],
  ['interviewing-and-selection.md', 'Interviewing & Selection'],
  ['customer-onboarding-kyc.md', 'Customer Onboarding & KYC'],
  ['incident-response.md', 'Incident Response'],
  ['org-chart.md', 'Engineering Organisation'],
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
<div class="fm-app">
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
      <button type="button" data-action="copy-prompt"
        title="Copies a prompt for an AI assistant. It explains this file format and has the assistant interview you for the steps, decisions, loop-backs, and per-step detail, then write the .md for you.">Copy prompt</button>
      <button type="button" data-action="refresh" title="Re-render (the editor also refreshes on its own)">Refresh</button>
      <button type="button" data-action="restart" title="Restart the flow from the beginning" aria-label="Restart">&#8635;</button>
      <button type="button" data-action="present" title="Present full screen" aria-label="Present full screen">&#9974;</button>
      <button type="button" data-action="download-svg" title="Save the diagram as one .svg file: vector, every choice baked in, no script. Type is set in the reader's system fonts rather than an embedded face.">Save SVG</button>
      <button type="button" data-action="download" class="fm-primary">Export HTML</button>
    </div>
  </header>

  <div class="fm-body">
    <aside class="fm-rail">
      <h2>Style</h2><div id="fm-style-list" class="fm-style-list"></div>
      <h2>Palette</h2><div id="fm-palette-list" class="fm-palette-list"></div>
      <label title="Which nodes wear which of the palette's four colours">Colour by <select id="fm-colorby"></select></label>
      <h2>Layout</h2>
      <label title="Flow arranges the steps in layers; Tree hangs a hierarchy, for an org chart">Arrangement <select id="fm-layout"></select></label>
      <label>Density <select id="fm-density"></select></label>
      <label>Direction <select id="fm-direction"></select></label>
      <label title="How a loop back to an earlier step is drawn">Loops <select id="fm-loops"></select></label>
      <h2>Motion</h2>
      <div class="fm-seg">
        <button type="button" data-action="anim-pulse" aria-pressed="true">Pulse</button>
        <button type="button" data-action="anim-walkthrough" aria-pressed="false">Walk</button>
        <button type="button" data-action="anim-off" aria-pressed="false">Still</button>
      </div>
      <div class="fm-seg" style="margin-top:.4rem">
        <button type="button" data-action="toggle-scroll" aria-pressed="false">Auto-scroll</button>
      </div>
    </aside>

    <main class="fm-main">
      <section class="fm-panel">
        <div class="fm-panel-tabs">
          <button type="button" data-view="flow" aria-pressed="true">Beautiful Flow</button>
          <button type="button" data-view="mermaid" aria-pressed="false">Mermaid</button>
          <button type="button" data-view="document" aria-pressed="false">Document</button>
          <div class="fm-zoom">
            <button type="button" data-action="zoom-out" aria-label="Zoom out">&minus;</button>
            <span id="fm-zoom-label">100%</span>
            <button type="button" data-action="zoom-in" aria-label="Zoom in">+</button>
            <button type="button" data-action="fit-width">Fit width</button>
            <button type="button" data-action="fit-height">Fit height</button>
            <button type="button" data-action="actual">1:1</button>
            <span class="fm-ctl-sep" aria-hidden="true"></span>
            ${SPEEDS.map((v) => `<button type="button" data-speed="${v}" title="Playback speed"
              aria-pressed="${v === DEFAULT_SPEED}">${v}&times;</button>`).join('')}
          </div>
        </div>
        <div class="fm-views" id="fm-views" data-view="flow">
          <div class="fm-view fm-root" data-view="flow">
            <div class="fm-canvas" id="fm-canvas"><div class="fm-stage" id="fm-stage"></div></div>
          </div>
          <div class="fm-view fm-mermaid-view" data-view="mermaid" id="fm-mermaid-view"></div>
          <article class="fm-view fm-doc" data-view="document" id="fm-doc-out"></article>
        </div>
      </section>

      <section class="fm-panel fm-panel-editor">
        <div class="fm-panel-tabs">
          <button type="button" data-pane="markdown" aria-pressed="true">Markdown</button>
          <button type="button" data-pane="mermaid" aria-pressed="false">Mermaid</button>
          <button type="button" data-pane="html" aria-pressed="false" title="A self-contained snippet with no toolbar, for pasting into another document">Embed HTML</button>
          <div class="fm-zoom">
            <button type="button" data-action="refresh">Refresh</button>
            <button type="button" data-action="copy-code">Copy</button>
            <button type="button" data-action="download-embed">Download</button>
          </div>
        </div>
        <div class="fm-panes" id="fm-panes" data-pane="markdown">
          <textarea id="fm-editor" class="fm-pane" data-pane="markdown" spellcheck="false" aria-label="FlowMaker markdown source"></textarea>
          <textarea id="fm-mermaid-edit" class="fm-pane" data-pane="mermaid" spellcheck="false" aria-label="Mermaid source"></textarea>
          <pre id="fm-code-out" class="fm-pane fm-code" data-pane="html"></pre>
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
      <button type="button" data-action="restart" aria-label="Restart" title="Restart from the beginning">&#8635;</button>
      <button type="button" data-action="exit-present" class="fm-present-exit" aria-label="Exit presentation" title="Exit (Esc)">&times;</button>
    </div>
  </div>
</div>
`;

export function mountStudio(root) {
  const doc = root.ownerDocument ?? document;
  const state = {
    source: STARTER_DOC,
    overrides: (({ style, palette, density }) => ({ style, palette, density }))(loadPrefs()),
    animationMode: 'pulse',
    speed: loadPrefs().speed ?? DEFAULT_SPEED,
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
  const docOut = el('#fm-doc-out');
  const mermaidEdit = el('#fm-mermaid-edit');
  const panes = el('#fm-panes');
  const views = el('#fm-views');
  const mermaidView = el('#fm-mermaid-view');
  const warnStrip = el('#fm-warnings');
  const fmRoot = root.querySelector('.fm-app');

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
  el('#fm-layout').innerHTML = LAYOUT_KEYS
    .map((k) => `<option value="${k}">${k[0].toUpperCase()}${k.slice(1)}</option>`).join('');
  el('#fm-loops').innerHTML = LOOP_KEYS
    .map((k) => `<option value="${k}">${k[0].toUpperCase()}${k.slice(1)}</option>`).join('');
  el('#fm-colorby').innerHTML = COLOR_BY_KEYS
    .map((k) => `<option value="${k}">${COLOR_BY_LABELS[k]}</option>`).join('');

  function setSpeed(value) {
    state.speed = SPEEDS.includes(value) ? value : DEFAULT_SPEED;
    state.canvas?.setSpeed(state.speed);
    state.runtime?.setSpeed(state.speed);
    for (const b of root.querySelectorAll('[data-speed]')) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === state.speed));
    }
    savePrefs({ ...loadPrefs(), speed: state.speed });
  }

  function setAutoScroll(on) {
    state.autoScroll = on;
    if (on && crawlAllowed()) state.canvas?.startAutoScroll();
    else state.canvas?.stopAutoScroll();
    for (const b of root.querySelectorAll('[data-action="toggle-scroll"]')) {
      b.setAttribute('aria-pressed', String(on));
    }
  }

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
      loops: r.meta.loops,
      layout: r.meta.layout,
      colorBy: r.meta.colorBy,
      animationMode: state.animationMode,
      autoScroll: state.autoScroll,
      speed: state.speed,
    };
  }

  // The pane shows an embeddable snippet: the diagram with every choice
  // applied and no interface, for pasting into another document. The Export
  // button still produces the full standalone page.
  function refreshExport() {
    const r = state.resolved;
    codeOut.textContent = buildEmbed({
      meta: r.meta,
      model: r.model,
      details: r.details,
      styleKey: r.meta.style,
      paletteKey: r.meta.palette,
      density: r.meta.density,
      colorBy: r.meta.colorBy,
      animationMode: state.animationMode,
    });
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

    const svg = renderSvg(resolved.model, {
      styleKey: activeStyle.key,
      palette,
      meta: resolved.meta,
      details: resolved.details,
      colorBy: resolved.meta.colorBy,
    });
    stage.innerHTML = svg;

    state.canvas = createCanvas(canvasHost, resolved.model, {
      speed: state.speed,
      seamTitle: resolved.meta.title,
      seamSubtitle: resolved.meta.subtitle,
      onZoom: (z) => { el('#fm-zoom-label').textContent = `${Math.round(z * 100)}%`; },
      // Scrolling the canvas by hand during a walkthrough moves the highlight to
      // whichever step you have scrolled to, rather than fighting you.
      onUserScroll: () => {
        if (state.animationMode !== 'walkthrough') return;
        const id = state.canvas?.nearestNodeToCentre();
        if (id) state.runtime?.goToId(id);
        // Hold the auto-advance while they are still scrolling.
        state.runtime?.deferAdvance(WALK_SCROLL_HOLD_MS);
      },
    });
    state.runtime = attachRuntime(canvasHost, {
      details: resolved.details,
      model: resolved.model,
      animationMode: state.animationMode,
      speed: state.speed,
      scrollTo: (node) => state.canvas.scrollToNode(node),
      // Hovering a step, focusing it, or opening its card freezes the crawl too.
      // The arrows move the diagram, and the walkthrough's highlight rides along
      // with them, the same way it follows a drag.
      onNudge: (key) => state.canvas?.nudge(key) ?? false,
      onPause: () => state.canvas?.pauseAutoScroll(),
      onResume: () => state.canvas?.resumeAutoScroll(),
    });
    setAutoScroll(state.autoScroll ?? scrollDefaultFor(state.animationMode));

    // The reading view leads with the same diagram, then the step details.
    docOut.innerHTML = documentToHtml({ ...resolved, svg });
    // The plain baseline, in mermaid's default look.
    mermaidView.innerHTML = renderMermaidPreview(resolved.model);
    // Keep the mermaid editor in step, unless the user is typing in it.
    if (doc.activeElement !== mermaidEdit) mermaidEdit.value = resolved.mermaidSrc;
    refreshExport();

    for (const b of root.querySelectorAll('[data-style]')) {
      b.setAttribute('aria-pressed', String(b.dataset.style === activeStyle.key));
    }
    for (const b of root.querySelectorAll('[data-palette]')) {
      b.setAttribute('aria-pressed', String(b.dataset.palette === palette.key));
    }
    el('#fm-density').value = resolved.meta.density;
    el('#fm-direction').value = resolved.meta.direction;
    el('#fm-loops').value = resolved.meta.loops;
    el('#fm-layout').value = resolved.meta.layout;
    el('#fm-colorby').value = resolved.meta.colorBy;
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

  // In a walkthrough the highlight drives the view. Letting the crawl run at the
  // same time means it overwrites scrollLeft every tick, cancelling the smooth
  // scroll to each step, so the active step never reaches the middle.
  function crawlAllowed() {
    return state.animationMode !== 'walkthrough';
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
      restart();
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
  const schedule = (fn) => {
    clearTimeout(debounce);
    debounce = setTimeout(fn, 250);
  };

  editor.addEventListener('input', () => schedule(() => {
    state.source = editor.value;
    render();
  }));

  mermaidEdit.addEventListener('input', () => schedule(() => {
    state.source = replaceMermaidBlock(state.source, mermaidEdit.value);
    editor.value = state.source;
    render();
  }));

  function showView(name) {
    views.dataset.view = name;
    for (const b of root.querySelectorAll('button[data-view]')) {
      b.setAttribute('aria-pressed', String(b.dataset.view === name));
    }
    if (name === 'flow') requestAnimationFrame(() => state.canvas?.fitDefault());
  }

  function showPane(name) {
    panes.dataset.pane = name;
    for (const b of root.querySelectorAll('[data-pane]')) {
      if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', String(b.dataset.pane === name));
    }
  }

  // The async clipboard is unavailable over plain http and in some embedded
  // contexts, so fall back to a selection copy rather than failing silently.
  async function copyText(text, button) {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      const scratch = doc.createElement('textarea');
      scratch.value = text;
      scratch.setAttribute('readonly', '');
      scratch.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      doc.body.appendChild(scratch);
      scratch.select();
      try {
        ok = doc.execCommand('copy');
      } catch {
        ok = false;
      }
      scratch.remove();
    }
    if (!ok) {
      // Telling someone to press a key with nothing selected is worse than
      // saying nothing. Show the text instead, selected and ready to copy.
      showCopyFallback(text);
      return;
    }
    if (!button) return;
    const original = button.dataset.label ?? button.textContent;
    button.dataset.label = original;
    button.textContent = 'Copied';
    setTimeout(() => { button.textContent = button.dataset.label ?? original; }, 1600);
  }

  function showCopyFallback(text) {
    root.querySelector('.fm-copy-fallback')?.remove();
    const overlay = doc.createElement('div');
    overlay.className = 'fm-copy-fallback';
    overlay.innerHTML = '<div class="fm-copy-card">'
      + '<p>Your browser blocked the clipboard. The text is selected below.</p>'
      + '<textarea readonly aria-label="Text to copy"></textarea>'
      + '<button type="button">Close</button></div>';
    const area = overlay.querySelector('textarea');
    area.value = text;
    overlay.querySelector('button').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    root.appendChild(overlay);
    area.focus();
    area.select();
  }

  const saveAs = (text, type, name) => {
    const blob = new Blob([text], { type });
    const a = doc.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const savedName = (ext, suffix = '') => {
    const title = state.resolved?.meta.title;
    return suffix ? fileNameFor(`${title ?? 'flow'}${suffix}`, ext) : fileNameFor(title, ext);
  };

  function downloadHtml(text, suffix = '') {
    saveAs(text, 'text/html', savedName('html', suffix));
  }

  function restart() {
    state.canvas?.restartAutoScroll();
    state.runtime?.restart();
  }

  async function loadText(text) {
    state.source = text;
    editor.value = text;
    // Deliberately keep state.overrides. Once someone has picked a style,
    // palette, or density, that choice survives switching documents; the new
    // file's frontmatter only applies to whatever they have not chosen.
    render();
    // Open on the title, the way the loop does.
    requestAnimationFrame(restart);
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
    const speedBtn = e.target.closest('button[data-speed]');
    if (speedBtn) {
      setSpeed(Number(speedBtn.dataset.speed));
      return;
    }
    const viewBtn = e.target.closest('button[data-view]');
    if (viewBtn) {
      showView(viewBtn.dataset.view);
      return;
    }
    const paneBtn = e.target.closest('button[data-pane]');
    if (paneBtn) {
      showPane(paneBtn.dataset.pane);
      return;
    }
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'refresh') {
      clearTimeout(debounce);
      state.source = panes.dataset.pane === 'mermaid'
        ? replaceMermaidBlock(state.source, mermaidEdit.value)
        : editor.value;
      editor.value = state.source;
      render();
      return;
    }
    if (action === 'restart') {
      restart();
      return;
    }
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
    if (action === 'copy-prompt') copyText(AUTHORING_PROMPT, e.target.closest('[data-action]'));
    if (action === 'copy-code') copyText(codeOut.textContent, e.target.closest('[data-action]'));
    if (action === 'download-embed') {
      downloadHtml(codeOut.textContent, '-embed');
      return;
    }
    if (action === 'download') {
      saveAs(
        buildExport(exportInput(), { runtimeJs: window.__FM_RUNTIME_BUNDLE__ ?? '' }),
        'text/html',
        savedName('html'),
      );
    }
    if (action === 'download-svg') {
      const r = state.resolved;
      saveAs(buildStandaloneSvg({
        meta: r.meta,
        model: r.model,
        details: r.details,
        styleKey: r.meta.style,
        paletteKey: r.meta.palette,
        density: r.meta.density,
        colorBy: r.meta.colorBy,
        animationMode: state.animationMode,
      }), 'image/svg+xml', savedName('svg'));
    }
  });

  for (const [id, key] of [['fm-density', 'density'], ['fm-direction', 'direction'],
    ['fm-loops', 'loops'], ['fm-layout', 'layout'], ['fm-colorby', 'colorBy']]) {
    el(`#${id}`).addEventListener('change', (ev) => {
      state.overrides[key] = ev.target.value;
      render();
    });
  }

  editor.value = state.source;
  render();
  showPane('markdown');
  showView('flow');
  setSpeed(state.speed);
  requestAnimationFrame(restart);
  const api = { render, state };
  // Handy for debugging in the console and for driving the app from tests.
  if (typeof window !== 'undefined') window.__flowmaker = api;
  return api;
}
