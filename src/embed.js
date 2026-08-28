import { DENSITY, DEFAULTS } from './constants.js';
import { getPalette, deriveTokens } from './palettes.js';
import { getStyle } from './styles/index.js';
import { renderSvg, styleCss } from './render.js';
import { ANIMATE_CSS } from './animate.js';

// Rewrites every selector so the rules cannot reach anything outside the
// embed's own wrapper. Without this, dropping a diagram into a page would
// restyle whatever else on that page happened to use the same class names.
export function scopeCss(css, scope) {
  const source = String(css).replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  let i = 0;

  while (i < source.length) {
    const open = source.indexOf('{', i);
    if (open === -1) break;
    const prelude = source.slice(i, open).trim();

    let depth = 1;
    let j = open + 1;
    while (j < source.length && depth > 0) {
      if (source[j] === '{') depth += 1;
      else if (source[j] === '}') depth -= 1;
      j += 1;
    }
    const body = source.slice(open + 1, j - 1);

    if (prelude.startsWith('@')) {
      // Conditional groups wrap rules, so scope what is inside them. Keyframes
      // and font faces hold no selectors and pass through untouched.
      if (/^@(media|supports|layer|container|scope)\b/.test(prelude)) {
        out.push(`${prelude}{${scopeCss(body, scope)}}`);
      } else {
        out.push(`${prelude}{${body}}`);
      }
    } else if (prelude !== '') {
      const selector = prelude
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          // The style sheets hang their tokens on .fm-root, which is the
          // wrapper itself rather than something inside it.
          if (part === '.fm-root') return scope;
          if (part.startsWith('.fm-root')) return scope + part.slice('.fm-root'.length);
          return `${scope} ${part}`;
        })
        .join(',');
      out.push(`${selector}{${body}}`);
    }
    i = j;
  }
  return out.join('\n');
}

// A stable id per diagram, so two embeds on one page keep their own styling and
// so the same document always produces the same snippet.
function embedId(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fm-${(h >>> 0).toString(36)}`;
}

const SHELL = `
.fm-embed-scroll { overflow-x: auto; max-width: 100%; }
.fm-embed-scroll svg { display: block; max-width: none; height: auto; }
.fm-embed-caption { margin: 0 0 .75em; font-family: var(--font); }
.fm-embed-caption strong { display: block; color: var(--ink); font-size: 1.25rem; font-weight: 800; line-height: 1.2; }
.fm-embed-caption span { color: var(--ink-dim); font-size: .95rem; }
.fm-node { cursor: default; }
`.trim();

// A self-contained fragment: the diagram with every choice already applied, no
// interface, and no script. It is meant to be pasted into another document, so
// hovering a step uses the browser's own tooltip and the pulse runs on CSS
// alone.
export function buildEmbed(input) {
  const meta = input.meta ?? {};
  const style = getStyle(input.styleKey ?? DEFAULTS.style);
  const palette = getPalette(input.paletteKey ?? DEFAULTS.palette);
  const density = DENSITY[input.density] ? input.density : DEFAULTS.density;
  const tokens = deriveTokens(palette, { dark: style.dark });
  const animated = (input.animationMode ?? 'pulse') === 'pulse';

  const id = embedId([
    meta.title ?? '', style.key, palette.key, density,
    input.model?.nodes?.length ?? 0, input.model?.bounds?.w ?? 0,
  ].join('|'));
  const scope = `#${id}`;

  const svg = renderSvg(input.model, {
    styleKey: style.key,
    palette,
    meta,
    details: input.details,
    // No script travels with the snippet, so the step summaries become the
    // browser's own tooltips and the pulse is pre-drawn.
    nativeTitles: true,
    pulses: animated,
    colorBy: input.colorBy ?? DEFAULTS.colorBy,
  });

  const css = scopeCss(
    [styleCss(style.key, tokens, density), SHELL, animated ? ANIMATE_CSS : ''].join('\n'),
    scope,
  );

  const caption = meta.title
    ? `<p class="fm-embed-caption"><strong>${escapeText(meta.title)}</strong>`
      + (meta.subtitle ? `<span>${escapeText(meta.subtitle)}</span>` : '')
      + '</p>'
    : '';

  return `<div id="${id}" class="flowmaker-embed">
<style>
${css}
</style>
${caption}<div class="fm-embed-scroll">
${svg}
</div>
</div>`;
}

function escapeText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
