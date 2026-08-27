// Ordered longest-first so that `[[` is tried before `[` and `(((` before `((`.
const SHAPES = [
  { shape: 'doublecircle', open: '(((', close: ')))' },
  { shape: 'subroutine', open: '[[', close: ']]' },
  { shape: 'cylinder', open: '[(', close: ')]' },
  { shape: 'stadium', open: '([', close: '])' },
  { shape: 'circle', open: '((', close: '))' },
  { shape: 'hexagon', open: '{{', close: '}}' },
  { shape: 'trapezoid', open: '[/', close: '\\]' },
  { shape: 'parallelogram', open: '[/', close: '/]' },
  { shape: 'parallelogram', open: '[\\', close: '\\]' },
  { shape: 'rhombus', open: '{', close: '}' },
  { shape: 'round', open: '(', close: ')' },
  { shape: 'rect', open: '[', close: ']' },
];

// Connector forms, longest-first so `<-->` beats `-->` and `-.->` beats `---`.
const CONNECTORS = [
  { re: /^<==+>/, kind: 'thick', arrow: 'bidirectional' },
  { re: /^<-\.-*>/, kind: 'dotted', arrow: 'bidirectional' },
  { re: /^<-+>/, kind: 'solid', arrow: 'bidirectional' },
  { re: /^==+>/, kind: 'thick', arrow: 'arrow' },
  { re: /^-\.-*>/, kind: 'dotted', arrow: 'arrow' },
  { re: /^--+>/, kind: 'solid', arrow: 'arrow' },
  { re: /^==+/, kind: 'thick', arrow: 'none' },
  { re: /^-\.-+/, kind: 'dotted', arrow: 'none' },
  { re: /^---+/, kind: 'solid', arrow: 'none' },
];

const DIRECTIONS = { LR: 'LR', RL: 'RL', TD: 'TD', TB: 'TD', BT: 'BT' };

function unquote(text) {
  const t = text.trim();
  if (t.length >= 2 && t[0] === '"' && t.at(-1) === '"') return t.slice(1, -1);
  return t;
}

// Reads one node reference starting at `i`.
function readNode(line, i) {
  let j = i;
  // Node ids may contain hyphens, but a hyphen that begins a connector
  // (`-->`, `---`, `-.->`) belongs to the edge, not the id. Without this,
  // `A-->B` written without spaces parses its source node as "A--".
  while (j < line.length) {
    const c = line[j];
    if (/[A-Za-z0-9_.]/.test(c)) { j += 1; continue; }
    if (c === '-') {
      const next = line[j + 1];
      if (next === '-' || next === '>' || next === '.') break;
      j += 1;
      continue;
    }
    break;
  }
  const id = line.slice(i, j);
  if (id === '') return null;

  // Optional inline class: A:::className
  let classes = [];
  if (line.startsWith(':::', j)) {
    let k = j + 3;
    const start = k;
    while (k < line.length && /[A-Za-z0-9_-]/.test(line[k])) k += 1;
    classes = [line.slice(start, k)];
    j = k;
  }

  // Find where the label ends. Two things make this more than an indexOf:
  //
  //  - A quoted label may contain the closing bracket, as in A["Ship [x]"].
  //    Skip past the quotes before looking for it.
  //  - `[/` opens both a parallelogram (`/]`) and a trapezoid (`\\]`), so the
  //    first candidate close in SHAPES order is not necessarily the right one.
  //    Without picking the nearest, `i[/Para/] --> j[/Trap\\]` matches the
  //    trapezoid across both nodes and swallows the second one.
  const closeFrom = (openLen) => {
    const start = j + openLen;
    if (line[start] !== '"') return start;
    const quoteEnd = line.indexOf('"', start + 1);
    return quoteEnd === -1 ? start : quoteEnd + 1;
  };

  let best = null;
  for (const sh of SHAPES) {
    if (!line.startsWith(sh.open, j)) continue;
    const end = line.indexOf(sh.close, closeFrom(sh.open.length));
    if (end === -1) continue;
    const better = best === null
      || sh.open.length > best.open.length
      || (sh.open.length === best.open.length && end < best.end);
    if (better) best = { ...sh, end };
  }

  if (best) {
    return {
      id,
      classes,
      shape: best.shape,
      label: unquote(line.slice(j + best.open.length, best.end)),
      next: best.end + best.close.length,
      labelled: true,
    };
  }

  return { id, classes, shape: 'rect', label: id, next: j, labelled: false };
}

function readConnector(line, i) {
  const rest = line.slice(i);
  for (const { re, kind, arrow } of CONNECTORS) {
    const m = rest.match(re);
    if (m) return { kind, arrow, next: i + m[0].length };
  }
  return null;
}

export function parseMermaid(src) {
  const warnings = [];
  const nodeMap = new Map();
  const edges = [];
  const subgraphs = [];
  const classAssignments = new Map();
  let direction = 'LR';

  const lines = String(src ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/%%.*$/, '').trimEnd())
    .filter((l) => l.trim() !== '');

  if (lines.length === 0) return { direction, nodes: [], edges: [], subgraphs: [], warnings };

  const header = lines[0].trim();
  const headerMatch = header.match(/^(flowchart|graph)\b[ \t]*([A-Za-z]{2})?/);
  if (!headerMatch) {
    const type = header.split(/[\s({]/)[0];
    warnings.push({
      code: 'UNSUPPORTED_DIAGRAM_TYPE',
      message: `"${type}" is not a supported diagram type. FlowMaker renders mermaid flowchart / graph diagrams only.`,
    });
    return { direction, nodes: [], edges: [], subgraphs: [], warnings };
  }
  direction = DIRECTIONS[(headerMatch[2] ?? '').toUpperCase()] ?? 'LR';

  const stack = [];

  const touch = (ref) => {
    const existing = nodeMap.get(ref.id);
    if (!existing) {
      nodeMap.set(ref.id, {
        id: ref.id,
        label: ref.label,
        shape: ref.shape,
        classes: [...ref.classes],
        subgraph: stack.at(-1) ?? null,
      });
    } else {
      if (ref.labelled) {
        existing.label = ref.label;
        existing.shape = ref.shape;
      }
      for (const c of ref.classes) if (!existing.classes.includes(c)) existing.classes.push(c);
      if (existing.subgraph === null && stack.length > 0) existing.subgraph = stack.at(-1);
    }
    if (stack.length > 0) {
      const sg = subgraphs.find((s) => s.id === stack.at(-1));
      if (sg && !sg.nodeIds.includes(ref.id)) sg.nodeIds.push(ref.id);
    }
  };

  for (const raw of lines.slice(1)) {
    const line = raw.trim();

    const sg = line.match(/^subgraph[ \t]+([A-Za-z0-9_.\-]+)(?:[ \t]*\[[ \t]*(.*?)[ \t]*\])?[ \t]*$/);
    if (sg) {
      const id = sg[1];
      subgraphs.push({ id, label: unquote(sg[2] ?? id), nodeIds: [] });
      stack.push(id);
      continue;
    }
    if (/^end$/i.test(line)) {
      stack.pop();
      continue;
    }

    const cls = line.match(/^class[ \t]+([A-Za-z0-9_.,\- \t]+?)[ \t]+([A-Za-z0-9_-]+)[ \t]*$/);
    if (cls) {
      for (const id of cls[1].split(',').map((s) => s.trim()).filter(Boolean)) {
        if (!classAssignments.has(id)) classAssignments.set(id, new Set());
        classAssignments.get(id).add(cls[2]);
      }
      continue;
    }
    if (/^(classDef|style|linkStyle|click|direction)\b/.test(line)) continue;

    let i = 0;
    const first = readNode(line, i);
    if (!first) {
      warnings.push({ code: 'UNPARSED_LINE', message: `Could not parse: "${line}"` });
      continue;
    }
    touch(first);
    let prev = first;
    i = first.next;

    while (i < line.length) {
      while (line[i] === ' ' || line[i] === '\t') i += 1;

      // "-- label -->" form: opener, label, connector tail.
      const midLabel = line.slice(i).match(/^(--|-\.|==)[ \t]+([^->|]+?)[ \t]+(--+>|-\.-*>|==+>|--+|==+)/);
      let conn = null;
      let label = '';
      if (midLabel) {
        conn = readConnector(midLabel[3], 0);
        label = unquote(midLabel[2]);
        i += midLabel[0].length;
      } else {
        conn = readConnector(line, i);
        if (!conn) break;
        i = conn.next;
        if (line[i] === '|') {
          const close = line.indexOf('|', i + 1);
          if (close !== -1) {
            label = unquote(line.slice(i + 1, close));
            i = close + 1;
          }
        }
      }
      if (!conn) break;

      while (line[i] === ' ' || line[i] === '\t') i += 1;
      const next = readNode(line, i);
      if (!next) break;
      touch(next);
      edges.push({ from: prev.id, to: next.id, label, kind: conn.kind, arrow: conn.arrow });
      prev = next;
      i = next.next;
    }
  }

  for (const [id, set] of classAssignments) {
    const node = nodeMap.get(id);
    if (!node) continue;
    for (const c of set) if (!node.classes.includes(c)) node.classes.push(c);
  }

  return { direction, nodes: [...nodeMap.values()], edges, subgraphs, warnings };
}
