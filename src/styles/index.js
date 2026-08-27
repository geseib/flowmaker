import neonCircuit from './neon-circuit.js';
import executiveClean from './executive-clean.js';
import blueprint from './blueprint.js';
import softDepth from './soft-depth.js';
import boldBrutal from './bold-brutal.js';
import infographic from './infographic.js';
import accentRail from './accent-rail.js';

// Order must match STYLE_KEYS in src/constants.js.
export const STYLES = [neonCircuit, executiveClean, blueprint, softDepth, boldBrutal, infographic, accentRail];

export function getStyle(key) {
  return STYLES.find((s) => s.key === key)
    ?? STYLES.find((s) => s.key === 'executive-clean')
    ?? STYLES[0];
}
