# Flow Builder (Vue 3)

An interactive, drag-and-drop workflow builder inspired by n8n / Node-RED. Build flows with Start, Transform, If/Else, and End nodes; configure them in a side panel; simulate execution; and export/import workflows as JSON.

## Tech stack
- Vue 3 + TypeScript + Vite
- Vue Flow for canvas, edges, zoom/pan
- Pinia for workflow state (nodes, edges, configs, logs)

## Getting started
1) Install dependencies
```bash
npm install
```
2) Run the dev server
```bash
npm run dev
```
Open the printed local URL.

3) Production build
```bash
npm run build
npm run preview   # to serve the built output
```

## How to use
- Drag nodes from the **Node palette** onto the canvas (or click “Add”).
- Connect nodes by dragging from a source handle to a target handle.
- Select a node to edit its configuration in the right panel.
- Click **Run Workflow** to simulate the flow and view the execution log.
- **Export JSON** downloads the current graph; **Import JSON** loads a saved file.
- Use **Reset** to restore the starter example.

### Node types
- **Start**: Define an initial JSON payload (e.g., `{"message": "hello"}`).
- **Transform**: Uppercase / append text / multiply a numeric field.
- **If / Else**: Evaluate a condition; connect from the `true` and `false` handles to branch.
- **End**: Terminal node; shows the final payload in the log.

### Execution notes
- Start nodes seed the payload; edges propagate data downstream.
- Conditions route to edges attached to the `true` or `false` handles (or edges labeled `true` / `false`).
- A loop guard halts after repeated visits to the same node to avoid infinite cycles.

## Project structure
- `src/App.vue` — main layout (palette, canvas, inspector, logs) + Vue Flow setup.
- `src/stores/workflow.ts` — Pinia store for nodes, edges, configuration, run simulator, import/export.
- `src/components/nodes/BaseNode.vue` — styled node renderer with handles.
- `src/style.css` — global styling / layout.

## Notes
- Node/edge state lives in Pinia; Vue Flow is driven via `v-model` bindings.
- Import expects the exported JSON shape `{ nodes, edges }`.
