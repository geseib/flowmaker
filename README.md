# FlowMaker

Turns a markdown file containing a mermaid flowchart plus per-step detail
sections into a styled, animated, self-contained HTML flow diagram.

Built for horizontal flows that have to read from across a trade-show floor and
still work on a phone. Zero dependencies: no npm packages, no CDN, no web fonts,
no network requests at runtime.

## Run it

```bash
node server.js        # http://localhost:8321
node --test 'test/*.test.js'
node build.js         # dist/flowmaker.html, one file, opens by double-click
```

## The document format

```markdown
---
title: Order Processing
subtitle: From cart to fulfillment
style: infographic       # neon-circuit | executive-clean | blueprint
                         # soft-depth | bold-brutal | infographic
palette: ember           # harbor | ember | forest | midnight
                         # slate | candy | mono | signal
direction: LR            # LR | RL | TD | BT
density: marquee         # marquee | standard | compact
---

```mermaid
flowchart LR
  A[Cart Checkout] --> B{Payment Authorized?}
  B -->|Declined| A
```

## A — Cart Checkout
> This blockquote becomes the hover tooltip.

Everything after the blockquote becomes the click-through detail card. Lists,
tables, links, and code all render.
```

The mermaid block stays plain and portable, so the same file renders correctly
on GitHub and in VS Code preview. Node IDs are exact and case-sensitive; the
studio reports any section that matches no node, and any node with no section.

## What it does

- **Six styles** — Neon Circuit, Executive Clean, Blueprint, Soft Depth,
  Bold Brutal, and Infographic. Any style composes with any palette.
- **Four-swatch palettes** — `c1` flow, `c2` decision, `c3` accent, `c4` alert.
  Surface and text tones are derived in OKLCH, so body text always clears 7:1
  against its background and node labels always clear 4.5:1.
- **Icons** — the Infographic style resolves an inline SVG icon per step from
  the label (`Capture Payment` → money, `Review Contract` → document), falling
  back to the mermaid shape. Force one with `A:::icon-money`. No emoji, no icon
  fonts, no images.
- **Loop-backs read as loops** — cycles route through a reserved gutter beneath
  the spine in the alert colour, each in its own lane.
- **Motion** — a traveling pulse along the edges, or a sequential walkthrough
  that lights each step in turn. Pulse also crawls the view along the flow.
  Hover, focus, or an open detail card freezes everything.
- **Present mode** — full-screen, no interface, just the flow and an × (or Esc).
- **Export** — one inline HTML file that re-runs layout on load, so the same
  file is correct on a 4K marquee and on a phone.

## Samples

`samples/` holds five complete flows: a linear spine with retry loops
(Order Processing), four subgraph lanes with cross-lane rework
(Product Development Lifecycle), fan-out with three terminal states
(Interviewing and Selection), compliance gates with resubmission cycles
(Customer Onboarding and KYC), and the heaviest loop-back case
(Incident Response).

## Layout

`src/parse.js` → `src/mermaid.js` → `src/layout.js` are pure, deterministic
functions with no DOM dependency, unit-tested under `node --test`. `render.js`
returns SVG markup as a string, which is why the studio preview and the exported
file cannot drift apart — they run the same renderer. `build.js` concatenates
the ES modules into one file with no build dependencies.
