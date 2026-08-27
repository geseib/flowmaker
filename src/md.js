import { esc } from './escape.js';

const SAFE_URL = /^(https?:\/\/|mailto:|#|\/)/i;

// Inline spans. Input is already escaped, so these only add markup.
function inline(text) {
  return text
    .replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_whole, label, href) => {
      const url = href.replace(/&amp;/g, '&');
      if (!SAFE_URL.test(url)) return label;
      return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });
}

const isTableDivider = (line) => /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes('-');
const cells = (line) => line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());

// Renders the whole document as a reading view: the title and subtitle, then
// every step in flow order with its tooltip as a lede and its detail body
// beneath. Steps in the graph with no section are listed so the gap is visible.
export function documentToHtml({ meta, model, details, svg }) {
  const esc2 = (v) => esc(String(v ?? ''));
  const head = `<header class="fm-doc-head"><h1>${esc2(meta?.title)}</h1>`
    + (meta?.subtitle ? `<p>${esc2(meta.subtitle)}</p>` : '')
    + '</header>';

  // The reading view leads with the flow itself. The caller passes the already
  // rendered SVG so this module never has to know about the renderer.
  const figure = svg ? `<figure class="fm-doc-figure">${svg}</figure>` : '';

  const steps = (model?.nodes ?? []).map((n) => {
    const d = details?.[n.id];
    const label = d?.title || n.label || n.id;
    const lede = d?.tooltip ? `<p class="fm-doc-lede">${esc2(d.tooltip)}</p>` : '';
    const body = d?.bodyMd
      ? mdToHtml(d.bodyMd)
      : '<p class="fm-doc-missing">No detail section for this step.</p>';
    return `<section class="fm-doc-step" data-step="${esc2(n.id)}">`
      + `<p class="fm-doc-eyebrow">${esc2(n.id)}</p>`
      + `<h2>${esc2(label)}</h2>${lede}<div class="fm-doc-body">${body}</div></section>`;
  }).join('');

  return `${head}${figure}<div class="fm-doc-steps">${steps}</div>`;
}

export function mdToHtml(md) {
  const source = String(md ?? '').replace(/\r\n?/g, '\n').trimEnd();
  if (source.trim() === '') return '';

  const lines = source.split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // Fenced code: emit verbatim, escaped.
    const fence = line.match(/^\s*(`{3,}|~{3,})\s*(\S*)\s*$/);
    if (fence) {
      const body = [];
      i += 1;
      while (i < lines.length && !new RegExp(`^\\s*${fence[1][0]}{3,}\\s*$`).test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      out.push(`<pre><code>${esc(body.join('\n'))}</code></pre>`);
      continue;
    }

    // Table: a header row followed by a divider row.
    if (line.includes('|') && isTableDivider(lines[i + 1] ?? '')) {
      const head = cells(line).map((c) => `<th>${inline(esc(c))}</th>`).join('');
      i += 2;
      const body = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        body.push(`<tr>${cells(lines[i]).map((c) => `<td>${inline(esc(c))}</td>`).join('')}</tr>`);
        i += 1;
      }
      out.push(`<table><thead><tr>${head}</tr></thead><tbody>${body.join('')}</tbody></table>`);
      continue;
    }

    // Headings: h3 and below, so a modal never competes with the page h1/h2.
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = Math.min(6, Math.max(3, heading[1].length));
      out.push(`<h${level}>${inline(esc(heading[2].trim()))}</h${level}>`);
      i += 1;
      continue;
    }

    // Blockquote.
    if (/^\s*>/.test(line)) {
      const body = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        body.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      out.push(`<blockquote>${inline(esc(body.join(' ')))}</blockquote>`);
      continue;
    }

    // Lists.
    const bullet = /^\s*[-*+]\s+(.*)$/;
    const numbered = /^\s*\d+[.)]\s+(.*)$/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const re = ordered ? numbered : bullet;
      const items = [];
      while (i < lines.length && re.test(lines[i])) {
        items.push(`<li>${inline(esc(lines[i].match(re)[1]))}</li>`);
        i += 1;
      }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }

    // Paragraph: consume until a blank line or a construct starts.
    const para = [];
    while (i < lines.length && lines[i].trim() !== ''
      && !/^\s*(#{1,6}\s|>|[-*+]\s|\d+[.)]\s|`{3,}|~{3,})/.test(lines[i])
      && !(lines[i].includes('|') && isTableDivider(lines[i + 1] ?? ''))) {
      para.push(lines[i].trim());
      i += 1;
    }
    if (para.length) out.push(`<p>${inline(esc(para.join(' ')))}</p>`);
  }

  return out.join('\n');
}
