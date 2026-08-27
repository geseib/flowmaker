# FlowMaker — Design Spec

**Date:** 2026-08-27
**Status:** Approved

## 1. Purpose

FlowMaker converts a markdown file containing a mermaid `flowchart` plus per-step
detail sections into a visually striking, animated, self-contained HTML flow
diagram. It ships as a single-file studio where a user can upload or paste the
markdown, flip between the raw mermaid diagram and the beautiful rendering, flip
between the source and the generated code, choose among five visual styles and a
four-swatch color palette, and export one inline HTML file that runs from
`file://` with no network access.

The primary reading context is a **horizontally scrolling flow on a large
display** — expo marquees and trade-show booths — with a secondary requirement
that the same artifact remain legible on a narrow phone screen.

## 2. Scope

**In scope (v1)**

- Mermaid `flowchart` / `graph` only, all four directions (`LR`, `RL`, `TD`/`TB`, `BT`).
  `LR` receives the tuning attention.
- All standard flowchart node shapes, labeled edges, arrow variants, subgraphs,
  cycles / loop-back edges, and `style` / `classDef` directives.
- Five visual styles, a four-swatch palette contract, three density levels.
- Tooltip (phase one detail) and modal card (phase two detail) per step.
- Two animation modes plus off; hover, focus, modal-open, and
  `prefers-reduced-motion` all pause animation.
- Single-file inline HTML export.
- Five sample `.md` files.

**Out of scope (v1)**

- Any non-flowchart mermaid diagram type (`sequenceDiagram`, `stateDiagram`,
  `gantt`, `classDiagram`, …). These produce a clear "unsupported diagram type"
  message naming the type found.
- Editing the graph structure through direct manipulation. The mermaid text is
  the source of truth.
- Server-side anything. No backend, no persistence beyond `localStorage` for the
  last-used style/palette.

## 3. Input format

A FlowMaker document is a markdown file with three parts. Parts 1 and 3 are
optional; part 2 is required.

### 3.1 Frontmatter (optional)

```yaml
---
title: Order Processing
subtitle: From cart to fulfillment
style: neon-circuit
palette: ember
direction: LR
density: marquee
---
```

All keys optional. All values are *suggestions* that pre-select studio controls;
the studio can override any of them without modifying the file. Unknown keys are
ignored. Unknown values for a known key fall back to the default and raise a
warning.

Defaults: `style: executive-clean`, `palette: harbor`, `direction` taken from the
mermaid source, `density: standard`.

### 3.2 Mermaid block (required)

Exactly one fenced block tagged `mermaid`, containing plain, valid mermaid. It
must render correctly in GitHub and VS Code preview — this is why no FlowMaker
metadata is ever placed inside the block. If more than one mermaid block is
present, the first is used and a warning is raised for the rest.

### 3.3 Detail sections (optional)

```markdown
## A — Cart Checkout
> Customer confirms items, shipping, and payment method.

**Owner:** Storefront team
**SLA:** < 2s p95

Full prose, lists, tables, links, and inline code are supported.
```

- The heading level is `##`. The text before the first em dash, en dash, or
  hyphen-surrounded-by-spaces is the **node ID**; the remainder is the display
  title. A heading with no separator is treated entirely as a node ID.
- Node ID matching is exact and case-sensitive, matching mermaid's own behavior.
- **The first blockquote in the section is the tooltip.** Everything else in the
  section is the modal body.
- If there is no blockquote, the first paragraph becomes the tooltip and the
  entire section body becomes the modal body.
- A node with no matching section still renders; it simply carries no tooltip or
  modal affordance and is not clickable.
- A section whose ID matches no node is a **warning**, surfaced in the UI with
  the offending ID. It is never silently discarded.

## 4. Architecture

Pure-function core, two hosts (studio and export). The same rendering code runs
in both, so there is no divergence between preview and exported artifact.

```
src/
  parse.js     md text            -> { meta, mermaidSrc, details[], warnings[] }
  mermaid.js   mermaidSrc         -> { nodes[], edges[], subgraphs[], direction }
  layout.js    graph + density    -> { positions, edgePaths, bounds }
  render.js    layout + style + palette -> SVG/DOM
  runtime.js   interaction: tooltip, modal, pulse, walkthrough, pause, zoom, pan
  export.js    graph + meta + style + palette -> single inline HTML string
  styles/      five style modules (CSS custom-property sets + shape overrides)
  palettes.js  curated palettes + OKLCH derivation
  studio.js    studio shell: upload, flip tabs, controls, warnings strip
build.js       plain Node, zero dependencies: src/ -> dist/flowmaker.html
test/          node --test unit tests
samples/       five .md sample documents
```

`parse.js`, `mermaid.js`, and `layout.js` are dependency-free pure functions with
deterministic output, unit-tested under `node --test` with zero
devDependencies. Development runs the real ES modules over a static server; the
shipped studio is a single concatenated `dist/flowmaker.html`.

**Zero runtime dependencies.** Nothing is fetched at runtime — no CDN, no web
fonts. Typography uses system font stacks, with an optional embedded subset
variable font for styles that require a specific face.

## 5. Graph model

```js
{
  direction: 'LR' | 'RL' | 'TD' | 'BT',
  nodes: [{ id, label, shape, classes, subgraph }],
  edges: [{ from, to, label, kind, arrow }],   // kind: 'solid' | 'dotted' | 'thick'
  subgraphs: [{ id, label, nodeIds }]
}
```

This model is the single interchange format between the parser, the layout
engine, the renderer, and the export serializer. It is also what gets serialized
into the exported HTML file.

## 6. Layout engine

Horizontal-first layered layout. Deterministic: identical input always produces
identical coordinates.

1. **Cycle removal.** Depth-first search identifies back-edges (rework loops,
   review pushback, escalation returns). Reverse them for the duration of the
   layout; record them for restoration.
2. **Ranking.** Longest-path ranking on the resulting DAG. In `LR`, rank maps to
   column.
3. **Ordering.** Lane assignment within each rank via four sweeps of the median
   heuristic, minimizing edge crossings.
4. **Coordinate assignment.** Priority-based straightening so that the dominant
   path — the spine — runs straight through the middle of the canvas. A straight
   backbone is the single largest contributor to distance legibility.
5. **Edge routing.** Orthogonal segments with rounded corners. Restored
   back-edges route through a reserved gutter on the opposite side of the spine
   and render visually distinct (dashed, `--c4` alert color, arced) so that a
   loop reads as an intentional loop rather than a layout defect.
6. **Subgraphs.** Rendered as labeled containers. Contained nodes are
   rank-constrained so the container remains rectangular and non-overlapping.

`direction` flips the primary and cross axes; one engine serves all four
directions.

## 7. Visual system

### 7.1 Styles

| Style key | Name | Character |
|---|---|---|
| `neon-circuit` | Neon Circuit | Dark ground, glowing traces, expo hero. Pulse animation is the focal point. |
| `executive-clean` | Executive Clean | Light, corporate, restrained, print- and PDF-safe. |
| `blueprint` | Blueprint | Technical schematic — grid ground, hairline strokes, monospace labels. |
| `soft-depth` | Soft Depth | Glassy layered cards, soft shadows, pastel surfaces. |
| `bold-brutal` | Bold Brutal | Enormous type, hard edges, flat blocks, maximum distance legibility. |

### 7.2 Palette contract

Every style consumes the identical four-swatch contract, so any palette composes
with any style:

- `--c1` **Flow** — primary process nodes, spine edges
- `--c2` **Decision** — decision diamonds, branch labels
- `--c3` **Accent** — terminals (start/end), success paths
- `--c4` **Alert** — loop-backs, rework, rejection, exception paths

Each style derives its surface, text, and border tones from these four
algorithmically using OKLCH lightness ramps, guaranteeing that a custom palette
cannot produce an unreadable result. Ships with eight curated palettes presented
as four-swatch chips, plus custom hex entry.

### 7.3 Density and legibility

`density` is a first-class axis, not a zoom level. It scales font size, node
padding, stroke weight, arrowhead size, and inter-rank spacing together.

- `marquee` — label type floors at 28px at 100% zoom, contrast floors at 7:1,
  secondary text is suppressed, strokes thicken. Tuned for reading at distance.
- `standard` — balanced desktop presentation.
- `compact` — dense, for detailed inspection on a laptop.

Independently of density, the canvas provides zoom, drag-to-pan, and a
fit-width / fit-height / 1:1 control trio. Below a breakpoint the diagram reflows
to vertical stacking regardless of `direction`, so a phone reader gets a usable
sequence rather than a hairline-wide horizontal strip.

## 8. Interaction

- **Hover or focus on a node** shows the tooltip (the blockquote text) and
  **pauses all animation**. Animation resumes on exit.
- **Click or Enter on a node** opens a modal card with the full detail body.
  Focus is trapped, `Esc` closes, and focus returns to the originating node.
  Animation stays paused while the modal is open.
- **Arrow keys** move focus node to node along edges. Every interactive node is
  a real focusable element with an accessible name.
- **Animation mode** control with three states:
  - `pulse` — continuous comets travel each edge in flow direction.
  - `walkthrough` — sequential step highlight with play / pause / next / prev,
    dimming inactive steps and auto-scrolling the canvas to follow the active
    node. This is the unattended booth loop.
  - `off`.
- `prefers-reduced-motion: reduce` forces `off` on load; the user may still opt
  in explicitly.

## 9. Studio UI

```
+- Header: file name . [Upload .md] . [Load sample v] . [Export HTML] --------+
+- Rail: Style (5 cards) . Palette (4-swatch chips) . Direction . Density ----+
+- CANVAS   [ Mermaid Source  <->  Beautiful Flow ]      <- flip              |
|           horizontally scrollable, drag-to-pan, zoom, fit controls          |
+- EDITOR   [ Mermaid / MD    <->  Generated HTML  ]     <- flip              |
|           left: editable, live re-render (250ms debounce)                   |
|           right: read-only, syntax-highlighted, [Copy] [Download]           |
+- Warnings strip: parse errors and unmatched detail IDs, inline and specific -+
```

Both flip pairs are genuine CSS 3D card flips rather than tab swaps.

Input paths: file upload, drag-and-drop onto the window, paste into the editor,
and a built-in sample loader. Last-used style and palette persist in
`localStorage`; a corrupt or absent value falls back to defaults without error.

## 10. Export

A single `<!doctype html>` file containing:

- Inline `<style>` for the chosen style and palette.
- The graph model, metadata, and rendered detail content as inline JSON.
- The render and runtime code, inline and minified (target: under 40KB).

The export **re-runs layout on load** rather than baking fixed coordinates, so
one exported file is simultaneously correct on a 4K marquee and a phone. It makes
no network requests and functions correctly from `file://`.

## 11. Sample documents

Five samples, each exercising a distinct structural characteristic:

1. **Order Processing** — the canonical linear spine with a payment decision and
   a single retry loop. The baseline.
2. **Product Development Lifecycle** — business and product design, architecture
   design and governance, SDLC, and operations as four subgraph lanes, with
   review and pushback loops between them. Exercises subgraphs and multi-lane
   loop-backs.
3. **Interviewing and Candidate Selection** — screening, loops, debrief, and
   rejection paths. Exercises fan-out and multiple terminal states.
4. **Customer Onboarding and KYC** — signup, identity verification, risk scoring,
   a manual review loop, provisioning, and activation. Exercises compliance gates
   and rejection cycles, with rich detail-section content.
5. **Incident Response and On-Call Escalation** — severity triage, paging,
   mitigation, rollback, and postmortem. The heaviest loop-back and branching
   case; the layout engine's stress test.

Every sample includes complete frontmatter, a valid standalone mermaid block, and
a detail section for every node with both a tooltip blockquote and substantive
modal body content.

## 12. Testing and acceptance

**Unit (`node --test`, zero dependencies).** Parser, mermaid tokenizer, and
layout engine are pure functions verified against exact expected outputs.
Coverage includes: frontmatter edge cases, missing and duplicate mermaid blocks,
detail-section ID matching and mismatching, all node shapes, all edge kinds,
subgraph nesting, self-loops, multi-node cycles, disconnected components, and
empty graphs.

**Integration.** Every sample parses without error, lays out without overlapping
nodes or crossing-count regressions, and exports to a file that opens and renders
from `file://`.

**UAT — driving the real application in a browser, against all five samples:**

1. Layout correctness on loop-backs and subgraph lanes.
2. Marquee legibility, verified at simulated viewing distance.
3. Narrow-screen reflow to vertical stacking.
4. Exported-file fidelity against the studio preview.
5. Keyboard navigation, focus management, and contrast ratios.
6. Animation pause behavior across hover, focus, modal, and reduced-motion.

**Acceptance criteria.** All five samples render correctly in all five styles in
all three densities; export produces a working single file under 250KB including
content; no runtime network requests; no console errors; `prefers-reduced-motion`
honored; every interactive node reachable and operable by keyboard.

## 13. Build order

1. Parser, mermaid tokenizer, and layout engine, test-driven.
2. Renderer plus one style (Executive Clean) end to end against one sample.
3. **Freeze the `.md` format**, then author the five sample documents in
   parallel against the frozen contract.
4. Remaining four styles and the palette system.
5. Interaction layer: tooltip, modal, pulse, walkthrough, pause, zoom, pan.
6. Studio shell, flip tabs, and export.
7. UAT pass and UX refinement against all five samples.

## 14. Decisions and rationale

| Decision | Rationale |
|---|---|
| Single-file studio, no framework | Dogfoods the export constraint; the studio and the export share one renderer, eliminating preview-versus-artifact divergence. |
| Own parser and layout engine | Total control over horizontal scroll behavior, marquee-scale typography, and animation. Avoids inlining ~1MB of mermaid.js into every export. |
| Flowchart only | Covers all five target scenarios. Sequence and state diagrams need a different layout model and do not fit the traveling-pulse metaphor. |
| Metadata outside the mermaid block | Keeps the mermaid source portable and renderable in GitHub and VS Code. |
| Export re-lays-out on load | One file is correct on both a 4K marquee and a phone; baked coordinates would be correct on neither. |
| Four-swatch palette contract | Five styles times N palettes from one implementation, with contrast guaranteed by OKLCH derivation. |
