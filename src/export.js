import { DENSITY, DEFAULTS } from './constants.js';
import { getPalette, deriveTokens } from './palettes.js';
import { getStyle } from './styles/index.js';
import { styleCss } from './render.js';
import { RUNTIME_CSS } from './runtime.js';
import { ANIMATE_CSS } from './animate.js';
import { CANVAS_CSS } from './canvas.js';
import { esc } from './escape.js';

// JSON embedded in a <script> must not be able to terminate that script, and
// U+2028/U+2029 are literal line terminators in JavaScript string context.
const safeJson = (value) => JSON.stringify(value)
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

const SHELL_CSS = `
*, *::before, *::after { box-sizing: border-box; }
html, body { height: 100%; }
body { margin: 0; background: var(--ground); color: var(--ink); font-family: var(--font, system-ui, sans-serif); }
.fm-root { display: flex; flex-direction: column; height: 100dvh; }
.fm-header {
  display: flex; align-items: baseline; gap: 1rem; flex-wrap: wrap;
  padding: clamp(.8rem, 2vw, 1.4rem) clamp(1rem, 3vw, 2rem);
  border-bottom: 1px solid var(--border);
}
.fm-header h1 { margin: 0; font-size: clamp(1.1rem, 2.6vw, 1.9rem); line-height: 1.1; }
.fm-header p { margin: 0; color: var(--ink-dim); font-size: clamp(.85rem, 1.6vw, 1.05rem); }
.fm-controls { margin-left: auto; display: flex; gap: .4rem; align-items: center; flex-wrap: wrap; }
.fm-controls button {
  font: inherit; font-size: .9rem; padding: .4em .8em; cursor: pointer;
  border-radius: 999px; border: 1px solid var(--border);
  background: var(--surface-2); color: var(--ink);
}
.fm-controls button[aria-pressed="true"] { background: var(--c1); color: var(--c1-ink); border-color: var(--c1); }
.fm-controls button:focus-visible { outline: 2px solid var(--c2); outline-offset: 2px; }
.fm-canvas { flex: 1 1 auto; }
/* Present mode: nothing on screen but the flow and a way out. */
.fm-root[data-present="true"] .fm-header { display: none; }
.fm-present-tools { display: none; }
.fm-present-tools[hidden] { display: none; }
.fm-root[data-present="true"] .fm-present-tools:not([hidden]) {
  position: fixed; top: 1rem; right: 1rem; z-index: 60;
  display: flex; gap: .4rem; opacity: .3; transition: opacity .2s ease;
}
.fm-present-tools:hover, .fm-present-tools:focus-within { opacity: 1 !important; }
.fm-present-tools button {
  width: 2.4rem; height: 2.4rem; display: grid; place-items: center;
  border-radius: 999px; cursor: pointer; font-size: 1.2rem; line-height: 1;
  border: 1px solid var(--border); background: var(--surface-2); color: var(--ink);
}
.fm-present-tools button:focus-visible { outline: 2px solid var(--c2); outline-offset: 2px; }
`.trim();

export function buildExport(input, bundle = {}) {
  const meta = input.meta ?? {};
  const styleKey = input.styleKey ?? DEFAULTS.style;
  const paletteKey = input.paletteKey ?? DEFAULTS.palette;
  const density = DENSITY[input.density] ? input.density : DEFAULTS.density;
  const style = getStyle(styleKey);
  const palette = getPalette(paletteKey);
  const tokens = deriveTokens(palette, { dark: style.dark });

  const data = {
    meta: { title: meta.title ?? 'Flow', subtitle: meta.subtitle ?? '' },
    graph: input.graph,
    details: input.details ?? {},
    styleKey: style.key,
    paletteKey: palette.key,
    density,
    direction: input.direction ?? input.graph?.direction ?? DEFAULTS.direction,
    animationMode: input.animationMode ?? 'pulse',
    autoScroll: input.autoScroll ?? (input.animationMode ?? 'pulse') === 'pulse',
  };

  const css = [
    SHELL_CSS,
    styleCss(style.key, tokens, density),
    CANVAS_CSS,
    RUNTIME_CSS,
    ANIMATE_CSS,
  ].join('\n');

  return `<!doctype html>
<html lang="en" data-fm-style="${esc(style.key)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="${style.dark ? 'dark' : 'light'}">
<title>${esc(data.meta.title)}</title>
<style>${css}</style>
</head>
<body>
<div class="fm-root" id="fm-root" data-anim="${esc(data.animationMode)}">
  <header class="fm-header">
    <h1>${esc(data.meta.title)}</h1>
    ${data.meta.subtitle ? `<p>${esc(data.meta.subtitle)}</p>` : ''}
    <div class="fm-controls">
      <button type="button" data-fm-action="anim-pulse" aria-pressed="false">Pulse</button>
      <button type="button" data-fm-action="anim-walk" aria-pressed="false">Walkthrough</button>
      <button type="button" data-fm-action="anim-off" aria-pressed="false">Still</button>
      <button type="button" data-fm-action="toggle-scroll" aria-pressed="false">Auto-scroll</button>
      <button type="button" data-fm-action="restart" aria-label="Restart" title="Restart from the beginning">&#8635;</button>
      <button type="button" data-fm-action="present" aria-label="Present full screen" title="Present full screen">&#9974;</button>
      <button type="button" data-fm-action="fit-width">Fit</button>
      <button type="button" data-fm-action="zoom-out" aria-label="Zoom out">&minus;</button>
      <button type="button" data-fm-action="zoom-in" aria-label="Zoom in">+</button>
    </div>
  </header>
  <div class="fm-canvas" id="fm-canvas"><div class="fm-stage" id="fm-stage"></div></div>
  <div class="fm-present-tools" id="fm-present-tools" hidden>
    <button type="button" data-fm-action="restart" aria-label="Restart" title="Restart from the beginning">&#8635;</button>
    <button type="button" data-fm-action="exit-present" aria-label="Exit presentation" title="Exit (Esc)">&times;</button>
  </div>
</div>
<script>window.__FLOWMAKER_DATA__ = ${safeJson(data)};</script>
<script>${(bundle.runtimeJs ?? '').replace(/<\/(script)/gi, '<\\/$1')}</script>
</body>
</html>
`;
}
