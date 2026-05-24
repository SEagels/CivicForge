# CivicForge Graph And iOS-Style UI Design

Date: 2026-05-24

## Purpose

Add an Obsidian-inspired knowledge graph to CivicForge and refresh the interface toward a simple, polished, iOS-like desktop study tool.

This changes an earlier scope decision. CivicForge originally avoided a graph view to keep the MVP focused. The new graph should be implemented as a civil-service essay material relationship graph, not as a full Obsidian clone.

## Product Scope

The feature should help the user see how essay materials connect across topics, tags, question types, and explicit Markdown links. It should support review and recall, not general-purpose knowledge management.

In scope:

- A new `知识图谱` navigation item.
- Graph nodes for materials, topics, tags, question types, and material types.
- Graph edges from material metadata and explicit `[[素材标题]]` links.
- Search, category filters, neighbor highlighting, and selected-node details.
- Clicking a material node jumps to Library with that material selected.
- A visual refresh toward iOS-style simplicity: neutral surfaces, lighter borders, smoother transitions, clearer spacing, less visual weight.

Out of scope:

- Full Obsidian vault semantics.
- Plugin architecture.
- Graph persistence tables in phase one of this feature.
- Automatic semantic similarity links.
- Cloud sync or account features.

## Recommended Technical Approach

Use `d3-force` for graph layout and keep rendering in React/SVG.

Reasons:

- It is lighter and more controllable than a large graph UI library.
- It supports the force-directed behavior users expect from an Obsidian-like graph.
- React keeps the UI consistent with the current app.
- SVG is adequate for the current local single-user material scale.

Avoid `react-force-graph` or `vis-network` for now. They would be faster to wire up but harder to make visually consistent with CivicForge's desired iOS-like style.

## Graph Domain Model

Create `src/features/graph/graphModel.ts`.

Graph node kinds:

- `material`
- `topic`
- `tag`
- `questionType`
- `materialType`

Graph edge kinds:

- `material-topic`
- `material-tag`
- `material-question-type`
- `material-type`
- `material-link`

Material links are parsed from Markdown with the pattern `[[title]]`. A link is created only when the referenced title matches an active material title exactly after trimming whitespace.

Node IDs should be stable:

- Material: `material:<material.id>`
- Topic: `topic:<topicId>`
- Tag: `tag:<normalizedTag>`
- Question type: `question-type:<questionTypeId>`
- Material type: `material-type:<materialType>`

Graph construction should be pure and testable. It receives active materials and returns `{ nodes, edges }` without touching React state or storage.

## Graph UI

Create:

- `src/features/graph/GraphPanel.tsx`
- `src/features/graph/GraphCanvas.tsx`
- `src/features/graph/graphModel.test.ts`

Graph page structure:

- Left/top controls: search, node type toggles, edge type toggles.
- Main canvas: SVG force-directed graph.
- Right/details area: selected node title, type, connected counts, and actions.

Interactions:

- Hover a node highlights direct neighbors and dims unrelated nodes.
- Click a node selects it.
- Click a material node action opens Library and selects that material.
- Search filters visible nodes by title/name and keeps connected edges only when both endpoints are visible.
- Empty graph state explains that materials, tags, topics, and `[[素材标题]]` links create graph connections.

Force layout:

- Use deterministic initial positions derived from node index to reduce visual jumps.
- Use moderate charge and link distance so the graph is readable in a desktop window.
- Re-run layout when materials or filters change.
- Keep animations restrained. The graph should feel responsive, not constantly moving.

## App Integration

Update `src/features/materials/MaterialLibrary.tsx`:

- Extend `AppView` with `graph`.
- Add a `知识图谱` nav button.
- Render `GraphPanel` for graph view.
- Add a callback from graph to Library:
  - select the material id
  - clear review focus
  - switch to Library

The graph should use `activeMaterials`, not archived materials.

## iOS-Style UI Refresh

The visual target is iOS Settings / Notes style adapted to a desktop study tool.

Design direction:

- Background: cool white and neutral gray, not beige.
- Navigation: lighter sidebar, calmer selected state, tighter labels.
- Panels: fewer heavy card effects, thinner borders, limited shadows.
- Buttons: restrained primary color, consistent hover/focus states.
- Motion: 120-180ms transitions for hover, active view, buttons, selected cards.
- Editor: less framed, more Typora-like reading/writing surface.
- Dark mode: neutral graphite, not brown-black.

Implementation should revise CSS tokens in `src/styles/global.css` before broad component rewrites. Keep the layout responsive work from commit `6660e36`.

## Dependency Change

Add:

```text
d3-force
@types/d3-force
```

Reason: force-directed layout is core graph behavior. The dependency is focused and widely used.

## Testing

Add unit tests for:

- Graph builds topic/tag/question/material-type edges.
- `[[素材标题]]` creates material-to-material edges.
- Missing wiki links do not create edges.
- Duplicate links do not duplicate edges.
- Filtering keeps only visible nodes and valid edges.

Existing checks must still pass:

```powershell
npx vitest run --reporter=verbose
npm run typecheck
npm run build
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"; npx tauri build
```

Browser smoke checks:

- Dashboard renders in the refreshed style.
- Library remains usable.
- Graph page renders non-empty graph from sample materials.
- Settings remains responsive.
- Narrow-width layout does not horizontally overflow.

## Acceptance Criteria

- `知识图谱` appears in navigation.
- Sample data produces a visible graph with material, topic, tag, question type, and material type nodes.
- Markdown `[[素材标题]]` creates a visible material-link edge.
- Search and toggles update graph visibility.
- Clicking a material node can open Library with that material selected.
- UI style is visibly simpler, cooler, and closer to iOS system-app polish.
- Responsive behavior from the previous phase remains intact.
- All automated checks and Tauri build pass.

