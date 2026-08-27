const META_KEYS = ['title', 'subtitle', 'style', 'palette', 'direction', 'density'];

// Matches "## A — Title", "## A – Title", "## A - Title", or a bare "## A".
const HEADING_RE = /^##[ \t]+(.+?)(?:[ \t]*[—–][ \t]*|[ \t]+-[ \t]+)(.*)$/;
const BARE_HEADING_RE = /^##[ \t]+(.+?)[ \t]*$/;

function emptyMeta() {
  return Object.fromEntries(META_KEYS.map((k) => [k, null]));
}

function stripQuotes(value) {
  const v = value.trim();
  if (v.length >= 2 && ((v[0] === '"' && v.at(-1) === '"') || (v[0] === "'" && v.at(-1) === "'"))) {
    return v.slice(1, -1);
  }
  return v;
}

// Splits leading YAML-ish frontmatter. Only flat `key: value` pairs are
// supported, which is all the format requires. Unknown keys are ignored.
function splitFrontmatter(lines) {
  const meta = emptyMeta();
  if (lines[0]?.trim() !== '---') return { meta, rest: lines };
  const close = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
  if (close === -1) return { meta, rest: lines };
  for (const line of lines.slice(1, close)) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    if (META_KEYS.includes(key)) meta[key] = stripQuotes(line.slice(idx + 1)) || null;
  }
  return { meta, rest: lines.slice(close + 1) };
}

// Removes every fenced block tagged `mermaid`. The first is the diagram; any
// further ones are dropped with a warning. Blocks with any other info string
// are left in place so detail sections keep their code samples.
function extractMermaid(lines, warnings) {
  const kept = [];
  const blocks = [];
  let fence = null;
  let buffer = [];
  let isMermaid = false;

  for (const line of lines) {
    const open = line.match(/^([ \t]*)(`{3,}|~{3,})[ \t]*([^`\s]*)[ \t]*$/);
    if (fence === null && open) {
      fence = open[2];
      isMermaid = open[3].toLowerCase() === 'mermaid';
      buffer = [];
      if (!isMermaid) kept.push(line);
      continue;
    }
    if (fence !== null) {
      const close = line.match(/^[ \t]*(`{3,}|~{3,})[ \t]*$/);
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length) {
        if (isMermaid) blocks.push(buffer.join('\n').trim());
        else kept.push(line);
        fence = null;
        isMermaid = false;
        continue;
      }
      if (isMermaid) buffer.push(line);
      else kept.push(line);
      continue;
    }
    kept.push(line);
  }
  if (fence !== null) {
    if (isMermaid) blocks.push(buffer.join('\n').trim());
    else kept.push(...buffer);
  }

  if (blocks.length === 0) {
    warnings.push({
      code: 'NO_MERMAID_BLOCK',
      message: 'No mermaid block found. Add one fenced ```mermaid block containing a flowchart.',
    });
  }
  if (blocks.length > 1) {
    warnings.push({
      code: 'EXTRA_MERMAID_BLOCK',
      message: `Found ${blocks.length} mermaid blocks; using the first and ignoring the rest.`,
    });
  }
  return { mermaidSrc: blocks[0] ?? '', rest: kept };
}

// Splits a section body into a tooltip and a modal body.
function splitSection(bodyLines) {
  const text = bodyLines.join('\n').trim();
  if (text === '') return { tooltip: '', bodyMd: '' };

  const quoteStart = bodyLines.findIndex((l) => l.trimStart().startsWith('>'));
  if (quoteStart !== -1) {
    let end = quoteStart;
    const quote = [];
    while (end < bodyLines.length && bodyLines[end].trimStart().startsWith('>')) {
      quote.push(bodyLines[end].trimStart().replace(/^>[ \t]?/, ''));
      end += 1;
    }
    const remainder = [...bodyLines.slice(0, quoteStart), ...bodyLines.slice(end)];
    return { tooltip: quote.join(' ').trim(), bodyMd: remainder.join('\n').trim() };
  }

  // No blockquote: the first paragraph is the tooltip, the whole section is the body.
  const trimmed = [...bodyLines];
  while (trimmed.length && trimmed[0].trim() === '') trimmed.shift();
  const blank = trimmed.findIndex((l) => l.trim() === '');
  const firstPara = (blank === -1 ? trimmed : trimmed.slice(0, blank)).join(' ').trim();
  return { tooltip: firstPara, bodyMd: text };
}

function parseDetails(lines, warnings) {
  const details = {};
  let current = null;
  let buffer = [];

  const flush = () => {
    if (!current) return;
    const { tooltip, bodyMd } = splitSection(buffer);
    if (tooltip === '' && bodyMd === '') {
      warnings.push({
        code: 'EMPTY_DETAIL_SECTION',
        message: `Detail section "${current.id}" has no content. It will render without a tooltip or modal.`,
      });
    }
    details[current.id] = { id: current.id, title: current.title, tooltip, bodyMd };
    current = null;
    buffer = [];
  };

  for (const line of lines) {
    const withTitle = line.match(HEADING_RE);
    const bare = line.match(BARE_HEADING_RE);
    if (withTitle || bare) {
      flush();
      const id = (withTitle ? withTitle[1] : bare[1]).trim();
      const title = withTitle ? (withTitle[2].trim() || id) : id;
      current = { id, title };
      continue;
    }
    if (current) buffer.push(line);
  }
  flush();
  return details;
}

// Writes a new mermaid body back into the document, leaving the frontmatter and
// every detail section untouched. This is what lets the mermaid be edited on its
// own without round-tripping the whole file through a formatter.
export function replaceMermaidBlock(mdText, nextSrc) {
  const text = String(mdText ?? '').replace(/\r\n?/g, '\n');
  const body = String(nextSrc ?? '').replace(/\r\n?/g, '\n').trim();
  const lines = text.split('\n');

  let fence = null;
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const open = lines[i].match(/^([ \t]*)(`{3,}|~{3,})[ \t]*([^`\s]*)[ \t]*$/);
    if (fence === null && open && open[3].toLowerCase() === 'mermaid') {
      fence = open[2];
      start = i;
      continue;
    }
    if (fence !== null) {
      const close = lines[i].match(/^[ \t]*(`{3,}|~{3,})[ \t]*$/);
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length) {
        return [...lines.slice(0, start + 1), ...body.split('\n'), ...lines.slice(i)].join('\n');
      }
    }
  }

  // No block to replace: append one, after the frontmatter if there is any.
  const fenced = ['```mermaid', ...body.split('\n'), '```'];
  if (lines[0]?.trim() === '---') {
    const close = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
    if (close !== -1) {
      return [...lines.slice(0, close + 1), '', ...fenced, ...lines.slice(close + 1)].join('\n');
    }
  }
  return [...fenced, '', ...lines].join('\n');
}

export function parseDocument(mdText) {
  const warnings = [];
  const lines = String(mdText ?? '').replace(/\r\n?/g, '\n').split('\n');
  const { meta, rest } = splitFrontmatter(lines);
  const { mermaidSrc, rest: afterMermaid } = extractMermaid(rest, warnings);
  const details = parseDetails(afterMermaid, warnings);
  return { meta, mermaidSrc, details, warnings };
}
