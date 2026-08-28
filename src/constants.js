export const STYLE_KEYS = [
  'neon-circuit', 'executive-clean', 'blueprint', 'soft-depth',
  'bold-brutal', 'infographic', 'accent-rail',
];

export const DENSITY_KEYS = ['marquee', 'standard', 'compact'];

export const DIRECTION_KEYS = ['LR', 'RL', 'TD', 'BT'];

// How a loop-back is drawn.
//   line  - always a real line through the gutter beneath the flow
//   wrap  - always a pair of lettered connectors, like an off-page connector
//   auto  - a line for a short loop, a wrap once it spans WRAP_MIN_SPAN ranks
// How the diagram is arranged.
//   flow - layered left to right or top to bottom, the default
//   tree - a hierarchy: one parent per box, children centred beneath it
export const LAYOUT_KEYS = ['flow', 'tree'];

// What decides which of the palette's four swatches a node wears.
export const COLOR_BY_KEYS = ['type', 'level', 'group'];

export const LOOP_KEYS = ['auto', 'line', 'wrap'];

// Playback speed multipliers offered next to the zoom controls. They scale the
// crawl, the walkthrough's step interval, and the pulse together.
export const SPEEDS = [0.5, 1, 2];
export const DEFAULT_SPEED = 1;

export const DEFAULTS = {
  style: 'executive-clean',
  palette: 'harbor',
  direction: 'LR',
  density: 'standard',
  loops: 'auto',
  layout: 'flow',
  colorBy: 'type',
};

// Hard cap on node width. Beyond this a label wraps instead of stretching.
export const MAX_LABEL_W = 460;

export const DENSITY = {
  marquee:  { fontSize: 30, labelFontSize: 22, padX: 40, padY: 28, rankGap: 190, laneGap: 76, stroke: 5, minNodeW: 260, nodeH: 104, corner: 18 },
  standard: { fontSize: 18, labelFontSize: 13, padX: 24, padY: 16, rankGap: 120, laneGap: 46, stroke: 2.5, minNodeW: 170, nodeH: 66, corner: 12 },
  compact:  { fontSize: 13, labelFontSize: 10, padX: 14, padY: 10, rankGap: 82, laneGap: 30, stroke: 1.5, minNodeW: 120, nodeH: 46, corner: 8 },
};
