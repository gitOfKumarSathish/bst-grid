# Bst-Table — runnable examples

Small, self-contained apps that import the **published** [`@bloomskill/table-engine`](https://www.npmjs.com/package/@bloomskill/table-engine)
from npm — the same code you'd write in your own project. Each is a plain **Vite + React + TS**
project, so it runs locally, on StackBlitz, or on CodeSandbox with no extra setup.

| Example | Shows |
| --- | --- |
| [`quick-start`](./quick-start) | The minimal sortable + paginated grid |
| [`editing`](./editing) | Inline editing, validation, cell types, row actions |
| [`cell-types`](./cell-types) | Sparkline · KPI · badges · chips · boolean · hyperlink · barcode |
| [`conditional-formatting`](./conditional-formatting) | Value-driven cell/row colours via `conditionalFormats` |
| [`cell-spanning`](./cell-spanning) | Merged cells via `meta.rowSpan: 'group'` |
| [`server-mode`](./server-mode) | `useBstDataSource` server-side sort/filter/paginate (runs offline via `createClientDataSource`) |

Every example runs the same way — `npm install && npm run dev`.

**Run any example locally**

```bash
cd examples/quick-start
npm install
npm run dev
```

**Open in the browser (no install)** — the engine README links each example to **StackBlitz**
(`https://stackblitz.com/github/gitOfKumarSathish/bst-grid/tree/main/examples/<name>`), which runs Vite
in-browser with an instant preview. Each example also carries a `.codesandbox/tasks.json` (Vite on port
5173) for CodeSandbox users.
