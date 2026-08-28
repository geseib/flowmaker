import { DENSITY, DEFAULTS } from './constants.js';
import { getPalette, deriveTokens } from './palettes.js';
import { getStyle } from './styles/index.js';
import { renderSvg, styleCss } from './render.js';
import { ANIMATE_CSS } from './animate.js';
import { esc } from './escape.js';

// A saved file is named after the diagram, so a folder of them reads as a list
// of flows rather than a list of downloads. Spaces become underscores; anything
// a filesystem or a shell would argue with is dropped rather than escaped.
export function fileNameFor(title, ext) {
  const base = String(title ?? '')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ /g, '_')
    .replace(/^[._]+|[._]+$/g, '')
    .slice(0, 120);
  return `${base || 'flow'}.${ext}`;
}

// One .svg file holding the diagram and every choice made about it: the palette
// tokens, the style, and the pulse. Vector, so it stays sharp on a marquee, and
// openable by anything that reads SVG.
//
// The type is set in a system font stack rather than an embedded face. A
// machine without those fonts substitutes its own, which shifts the text a
// little; embedding a face instead would multiply the file size and carry
// licensing that is not ours to grant.
export function buildStandaloneSvg(input) {
  const meta = input.meta ?? {};
  const style = getStyle(input.styleKey ?? DEFAULTS.style);
  const palette = getPalette(input.paletteKey ?? DEFAULTS.palette);
  const density = DENSITY[input.density] ? input.density : DEFAULTS.density;
  const tokens = deriveTokens(palette, { dark: style.dark });
  const animated = (input.animationMode ?? 'pulse') === 'pulse';

  const inner = renderSvg(input.model, {
    styleKey: style.key,
    palette,
    meta,
    details: input.details,
    // Nothing carries script into a saved file, so the step summaries become the
    // viewer's own tooltips and the pulse is pre-drawn.
    nativeTitles: true,
    pulses: animated,
    colorBy: input.colorBy ?? DEFAULTS.colorBy,
  });

  // Lift the diagram out of its own <svg> and into this one, so the file has a
  // single root that can carry the tokens.
  const body = inner.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');

  const w = input.model.bounds.w;
  const h = input.model.bounds.h;

  // No drawn caption: the file is the diagram, to be placed in a document that
  // provides its own heading. The title stays as the accessible name only.
  const css = [
    styleCss(style.key, tokens, density),
    animated ? ANIMATE_CSS : '',
  ].filter(Boolean).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" class="fm-root" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(meta.title ?? 'Flow diagram')}">
<title>${esc(meta.title ?? 'Flow diagram')}</title>
<style>
${css}
</style>
<rect class="fm-svg-ground" x="0" y="0" width="${w}" height="${h}" fill="var(--ground)"/>
${body}
</svg>`;
}
