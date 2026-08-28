import { DEFAULTS, STYLE_KEYS, DENSITY_KEYS, DIRECTION_KEYS, LOOP_KEYS, LAYOUT_KEYS, COLOR_BY_KEYS, ICON_MODE_KEYS } from './constants.js';
import { PALETTES } from './palettes.js';
import { parseDocument } from './parse.js';
import { parseMermaid } from './mermaid.js';
import { layout } from './layout.js';
import { showIcons } from './icons.js';

const PALETTE_KEYS = PALETTES.map((p) => p.key);

function pick(field, value, allowed, fallback, warnings) {
  if (value === null || value === undefined) return fallback;
  if (allowed.includes(value)) return value;
  warnings.push({
    code: 'INVALID_META_VALUE',
    message: `"${value}" is not a valid ${field}. Using "${fallback}". Valid values: ${allowed.join(', ')}.`,
  });
  return fallback;
}

export function resolveDocument(mdText, overrides = {}, measure) {
  const doc = parseDocument(mdText);
  const warnings = [...doc.warnings];

  const graph = parseMermaid(doc.mermaidSrc);
  warnings.push(...graph.warnings);

  const meta = {
    title: doc.meta.title ?? 'Untitled Flow',
    subtitle: doc.meta.subtitle ?? '',
    style: overrides.style ?? pick('style', doc.meta.style, STYLE_KEYS, DEFAULTS.style, warnings),
    palette: overrides.palette ?? pick('palette', doc.meta.palette, PALETTE_KEYS, DEFAULTS.palette, warnings),
    density: overrides.density ?? pick('density', doc.meta.density, DENSITY_KEYS, DEFAULTS.density, warnings),
    direction: overrides.direction
      ?? pick('direction', doc.meta.direction, DIRECTION_KEYS, graph.direction ?? DEFAULTS.direction, warnings),
    loops: overrides.loops ?? pick('loops', doc.meta.loops, LOOP_KEYS, DEFAULTS.loops, warnings),
    layout: overrides.layout ?? pick('layout', doc.meta.layout, LAYOUT_KEYS, DEFAULTS.layout, warnings),
    colorBy: overrides.colorBy ?? pick('colorBy', doc.meta.colorBy, COLOR_BY_KEYS, DEFAULTS.colorBy, warnings),
    icons: overrides.icons ?? pick('icons', doc.meta.icons, ICON_MODE_KEYS, DEFAULTS.icons, warnings),
  };

  // The cross-check parse.js could not do: it has no node list.
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  const orphans = Object.keys(doc.details).filter((id) => !nodeIds.has(id));
  if (orphans.length) {
    warnings.push({
      code: 'UNMATCHED_DETAIL',
      message: `These detail sections match no node in the diagram: ${orphans.join(', ')}. Node IDs are case-sensitive.`,
    });
  }
  const undocumented = [...nodeIds].filter((id) => !(id in doc.details));
  if (undocumented.length) {
    warnings.push({
      code: 'MISSING_DETAIL',
      message: `These steps have no detail section, so they render without a tooltip or modal: ${undocumented.join(', ')}.`,
    });
  }

  const model = layout(graph, {
    layout: meta.layout,
    onWarning: (w) => warnings.push(w),
    direction: meta.direction,
    density: meta.density,
    measure,
    iconSpace: showIcons(meta.style, meta.icons),
    loops: meta.loops,
  });

  return { meta, graph, details: doc.details, model, warnings, mermaidSrc: doc.mermaidSrc };
}
