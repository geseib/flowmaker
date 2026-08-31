# Attached artifacts — design

**Goal:** When a step is in focus, show the documents, data stores, and services
it takes in and puts out, as cards above the flow, connected to the step by
arrows that point the right way.

## The problem

A flow diagram shows the order work happens in. It does not show what each step
consumes and produces, and that is often the thing a reader actually needs: which
system of record this touches, which document comes out of it, which third party
it calls. Putting that on the diagram permanently turns a readable spine into a
thicket. Putting it only in the detail card means nobody sees it while looking at
the diagram.

So: show it, but only for the step in focus, and only above the flow where there
is whitespace.

## Authoring

No new syntax. A node tagged `:::input` or `:::output` is not a step; it is
something attached to the step it connects to.

```mermaid
REQUEST[(Product Request)]:::input --> DRAFT[Draft Technical Design]
DRAFT --> SPEC[(Technical Spec)]:::output
DRAFT --> GATEWAY[Policy Service]:::output
```

Why this rather than a new field:

- It is valid mermaid, so the file still renders correctly on GitHub, showing
  the real relationship rather than hiding it in metadata.
- The arrow direction is already written down, so "which way does the arrow
  point" is never something the author states twice and gets wrong once.
- It composes: `:::input` is a class, so the icon resolves from the label the
  way it already does, and `colorBy: tag` keeps working.

`input` and `output` are the only two tags. What kind of thing it is — document,
data store, service — comes from the icon, which is resolved from the label or
forced with `:::icon-<name>` exactly as elsewhere. A service that is called is an
output; a service that returns something the step needs is an input.

`input` and `output` join `c1`–`c4` and `icon-*` as reserved class names, so they
never become colour categories.

## What the layout does

Attached artifacts are lifted out of the graph before ranking: they are not
steps, they must not occupy a rank, and they must not change where anything else
sits. Turning them on or off must leave the diagram identical.

A node is lifted when it is tagged `input` or `output` **and** has exactly one
edge, connecting it to a node that is not itself an attachment. Anything else —
an attachment with two edges, or two attachments wired to each other — stays in
the flow as an ordinary step and reports a warning. Silently dropping a
relationship the author drew is worse than drawing it plainly.

Each lifted node becomes `{ id, label, icon, direction }` on its host's
`attachments` array, in declaration order.

## What it looks like

Cards sit in a band above the focused step, which is already centred by the
walkthrough.

```
   ┌─────────────┐  ┌─────────────┐            ┌─────────────┐
   │ ▤ Product    │  │ ▤ Customer  │            │ ▤ Technical │
   │   Request    │  │   Record    │            │    Spec     │
   │ DOCUMENT     │  │ DATA STORE  │            │ DOCUMENT    │
   └──────┬──────┘  └──────┬──────┘            └──────▲──────┘
          └────────┬───────┘                          │
                   ▼                                  │
            ┌──────────────────┐                      │
 ───────────│   Draft Design   │──────────────────────┘
            └──────────────────┘
```

- **Inputs left of centre, outputs right.** The flow reads left to right, so
  things arriving come from the upstream side and things produced leave toward
  the downstream side. Position and arrow direction say the same thing, which is
  what makes it readable without a legend.
- **Arrowheads only at the destination** — into the step for an input, into the
  card for an output. Direction carries the meaning, so it survives being read
  badly on a projector, and colour is not asked to do work it cannot do.
- **The same card as the walkthrough's detail card**: one card vocabulary in the
  whole tool.
- **A vertical flow rotates it**: for `TD` and `BT` the band goes to the side.
- **At most four cards**, two each way, with a `+N more` chip. A step with nine
  attachments becomes a wall, and a wall is worse than a summary.
- **Nothing at rest.** No focus, no band. It is an overlay, so the diagram never
  reflows and never jumps.
- **The rest of the flow dims** while the band is open, so the step and its
  attachments read as one unit rather than as more diagram.

## When it shows

- The walkthrough's active step, following the walk.
- A step that has been clicked.

Not on hover: hover already shows the tooltip, and a band that flickers as the
pointer crosses the diagram is worse than no band.

While a detail card is open it is hidden, and it returns when that card closes.

## What this is not

An artifact carried on an arrow — `A -->|doc: Product Request| B` — stays as it
is. A thing handed from one step to the next is a different statement from a
thing one step consumes or produces, and both are worth saying. They may be
worth unifying later; not now.

## Testing

- Lifting is a pure function: given a graph, the steps and the attachments come
  out separated, and the remaining graph is byte-identical to the same diagram
  written without the attachments.
- An attachment with two edges stays a step and warns.
- Placement is pure: given a focused node's rect, the viewport, and the flow
  direction, the band's side and each card's position come out, never covering
  the node.
- The cap holds, and the overflow count is right.
