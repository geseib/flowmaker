// The four-swatch contract:
//   c1 Flow | c2 Decision | c3 Accent | c4 Alert
export const PALETTES = [
  { key: 'harbor', name: 'Harbor', c1: '#2563eb', c2: '#7c3aed', c3: '#0d9488', c4: '#dc2626' },
  { key: 'ember', name: 'Ember', c1: '#ea580c', c2: '#ca8a04', c3: '#0d9488', c4: '#be123c' },
  { key: 'forest', name: 'Forest', c1: '#15803d', c2: '#a16207', c3: '#0891b2', c4: '#b91c1c' },
  { key: 'midnight', name: 'Midnight', c1: '#4f46e5', c2: '#9333ea', c3: '#0891b2', c4: '#e11d48' },
  { key: 'slate', name: 'Slate', c1: '#475569', c2: '#0f766e', c3: '#2563eb', c4: '#c2410c' },
  { key: 'candy', name: 'Candy', c1: '#db2777', c2: '#7c3aed', c3: '#0891b2', c4: '#d97706' },
  { key: 'mono', name: 'Monochrome', c1: '#374151', c2: '#6b7280', c3: '#111827', c4: '#9ca3af' },
  { key: 'signal', name: 'Signal', c1: '#0369a1', c2: '#a16207', c3: '#15803d', c4: '#dc2626' },
];

export function getPalette(key) {
  return PALETTES.find((p) => p.key === key) ?? PALETTES[0];
}

const clamp01 = (n) => Math.min(1, Math.max(0, n));

function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('')}`;
}

const srgbToLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

// sRGB <-> Oklab, per Bjorn Ottosson's reference conversion.
export function hexToOklch(hex) {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, B), h: (Math.atan2(B, A) * 180) / Math.PI };
}

export function oklchToHex({ l, c, h }) {
  const rad = (h * Math.PI) / 180;
  const A = c * Math.cos(rad);
  const B = c * Math.sin(rad);
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ].map((v) => linearToSrgb(clamp01(v)));
  return rgbToHex(rgb);
}

function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Picks whichever of near-white or near-black has the higher contrast on the
// given swatch. Every palette swatch is chosen so the winner clears 4.5:1.
function inkFor(hex) {
  const light = '#ffffff';
  const dark = '#0b0f14';
  return contrastRatio(light, hex) >= contrastRatio(dark, hex) ? light : dark;
}

// Shifts a swatch toward the ground so it can serve as a fill behind ink.
function soften(hex, dark) {
  const { l, c, h } = hexToOklch(hex);
  return oklchToHex(dark
    ? { l: Math.max(0.18, l * 0.34), c: c * 0.55, h }
    : { l: Math.min(0.97, 0.93 + l * 0.05), c: Math.min(c * 0.34, 0.06), h });
}

export function deriveTokens(palette, { dark = false } = {}) {
  const p = palette;
  const anchor = hexToOklch(p.c1);

  // Surfaces borrow the primary hue at very low chroma so the whole diagram
  // reads as one temperature rather than colored shapes on neutral grey.
  const surface = dark
    ? oklchToHex({ l: 0.19, c: Math.min(anchor.c * 0.12, 0.02), h: anchor.h })
    : oklchToHex({ l: 0.99, c: Math.min(anchor.c * 0.06, 0.006), h: anchor.h });
  const surface2 = dark
    ? oklchToHex({ l: 0.26, c: Math.min(anchor.c * 0.14, 0.025), h: anchor.h })
    : oklchToHex({ l: 0.965, c: Math.min(anchor.c * 0.09, 0.012), h: anchor.h });
  const ground = dark
    ? oklchToHex({ l: 0.13, c: Math.min(anchor.c * 0.1, 0.02), h: anchor.h })
    : oklchToHex({ l: 0.975, c: Math.min(anchor.c * 0.05, 0.008), h: anchor.h });

  // Ink is pushed until it clears 7:1 against the surface (the marquee floor).
  let ink = dark ? '#f5f8fc' : '#0a0e14';
  for (let i = 0; i < 24 && contrastRatio(ink, surface) < 7.2; i += 1) {
    const t = hexToOklch(ink);
    ink = oklchToHex({ l: clamp01(dark ? t.l + 0.02 : t.l - 0.02), c: t.c, h: t.h });
  }
  const inkTone = hexToOklch(ink);
  const inkDim = oklchToHex({ l: clamp01(dark ? inkTone.l - 0.22 : inkTone.l + 0.3), c: inkTone.c, h: inkTone.h });
  const border = dark
    ? oklchToHex({ l: 0.38, c: Math.min(anchor.c * 0.2, 0.03), h: anchor.h })
    : oklchToHex({ l: 0.87, c: Math.min(anchor.c * 0.15, 0.02), h: anchor.h });

  const tokens = {
    '--surface': surface,
    '--surface-2': surface2,
    '--ground': ground,
    '--ink': ink,
    '--ink-dim': inkDim,
    '--border': border,
  };
  for (const k of ['c1', 'c2', 'c3', 'c4']) {
    tokens[`--${k}`] = p[k];
    tokens[`--${k}-soft`] = soften(p[k], dark);
    tokens[`--${k}-ink`] = inkFor(p[k]);
  }
  return tokens;
}
