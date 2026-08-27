export const STYLE_KEYS = [
  'neon-circuit', 'executive-clean', 'blueprint', 'soft-depth', 'bold-brutal', 'infographic',
];

export const DENSITY_KEYS = ['marquee', 'standard', 'compact'];

export const DIRECTION_KEYS = ['LR', 'RL', 'TD', 'BT'];

export const DEFAULTS = {
  style: 'executive-clean',
  palette: 'harbor',
  direction: 'LR',
  density: 'standard',
};

// Hard cap on node width. Beyond this a label wraps instead of stretching.
export const MAX_LABEL_W = 460;

export const DENSITY = {
  marquee:  { fontSize: 30, labelFontSize: 22, padX: 40, padY: 28, rankGap: 190, laneGap: 76, stroke: 5, minNodeW: 260, nodeH: 104, corner: 18 },
  standard: { fontSize: 18, labelFontSize: 13, padX: 24, padY: 16, rankGap: 120, laneGap: 46, stroke: 2.5, minNodeW: 170, nodeH: 66, corner: 12 },
  compact:  { fontSize: 13, labelFontSize: 10, padX: 14, padY: 10, rankGap: 82, laneGap: 30, stroke: 1.5, minNodeW: 120, nodeH: 46, corner: 8 },
};
