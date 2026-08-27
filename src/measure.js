import { MAX_LABEL_W } from './constants.js';

function estimate(label, { fontSize, padX, padY, minNodeW, nodeH }) {
  const charW = fontSize * 0.58;
  const maxTextW = MAX_LABEL_W - padX * 2;
  const oneLineW = String(label).length * charW;
  const lines = Math.max(1, Math.ceil(oneLineW / maxTextW));
  return {
    w: Math.round(Math.min(MAX_LABEL_W, Math.max(minNodeW, oneLineW + padX * 2))),
    h: Math.round(Math.max(nodeH, lines * fontSize * 1.35 + padY * 2)),
  };
}

// Real measurement with the actual font, so a browser layout matches what the
// user sees. Falls back to the estimator under Node so layout stays testable.
export function browserMeasure(spec, fontFamily) {
  if (typeof document === 'undefined') return (label) => estimate(label, spec);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('data-fm-measure', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden';
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('font-size', String(spec.fontSize));
  text.setAttribute('font-family', fontFamily);
  text.setAttribute('font-weight', '700');
  svg.appendChild(text);
  document.body.appendChild(svg);

  const widthOf = (s) => {
    text.textContent = s;
    try {
      return text.getComputedTextLength();
    } catch {
      return s.length * spec.fontSize * 0.58;
    }
  };

  return (label) => {
    const maxTextW = MAX_LABEL_W - spec.padX * 2;
    const words = String(label).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && widthOf(candidate) > maxTextW) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    const widest = lines.length ? Math.max(...lines.map(widthOf)) : 0;
    return {
      w: Math.round(Math.min(MAX_LABEL_W, Math.max(spec.minNodeW, widest + spec.padX * 2))),
      h: Math.round(Math.max(spec.nodeH, Math.max(1, lines.length) * spec.fontSize * 1.35 + spec.padY * 2)),
      lines,
    };
  };
}

export function cleanupMeasure() {
  if (typeof document === 'undefined') return;
  for (const el of document.querySelectorAll('svg[data-fm-measure="true"]')) el.remove();
}
