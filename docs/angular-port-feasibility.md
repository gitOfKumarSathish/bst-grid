# Bst-Table → Angular — Feasibility, Strategy & Effort (R&D)

> **Question:** Bst-Table is a React grid today. Can we ship it for **Angular**, and what
> is the time/effort? **Verdict: yes — and the codebase is unusually well-positioned for it.**
> This doc is the R&D behind that answer and the recommended execution plan. No code yet.

_Date: 2026-08-17. Based on a measurement pass over `packages/engine` (10,044 non-test LOC),
the MUI/shadcn adapters, and the MCP server._

---

## 0. Headline

| | |
| --- | --- |
| **Possible?** | Yes. Lower-risk than a typical framework port. |
| **Why** | The hard part (the state engine) is **already framework-neutral** and shared via `@tanstack/table-core`; TanStack ships an **official Angular adapter** (`@tanstack/angular-table`, v9, signals); ~**40–45% of our engine is pure TypeScript** with no React; the base styling is **plain `bst-*` CSS**, not CSS-in-JS. |
| **Effort (1 senior Angular dev)** | **~6–9 months** to full parity (kernel + 1 Angular adapter + demo + MCP + docs). Midpoint ≈ **7 months**. |
| **Effort (2 devs)** | **~4–5 months** calendar. |
| **First demoable PoC** | **~6–8 weeks.** |
| **MVP (workflow-tier grids)** | **~3–4 months.** |
| **Biggest single cost** | Rewriting the **renderer** (`BstTable.tsx`, 1,556 LOC) + **cell renderers/editors** (1,248 LOC) in Angular idiom. Logic is reused; the *view* is rebuilt. |
| **Biggest strategic decision** | **Extract a shared framework-neutral kernel** (recommended) vs. fork-and-port two parallel codebases. |

---

## 1. Why this is feasible (the three de-risking facts)

1. **TanStack Table is headless and framework-neutral at its core.** Our React package wraps
   `@tanstack/react-table`, but the *engine* — sorting, filtering, grouping, pagination, selection,
   expansion, pinning, sizing, the feature-registration model — lives in `@tanstack/table-core`.
   TanStack ships an **official Angular adapter** (`@tanstack/angular-table`, v9, signal-based
   `injectTable` + `FlexRenderDirective`; requires Angular ≥19) plus `@tanstack/angular-virtual`.
   **Both React and Angular consume the identical state engine** — we don't reinvent it.

2. **~40–45% of our engine is already pure TypeScript with zero React.** The heaviest, most
   valuable file — `runtime.ts` (1,430 LOC: editing sessions, change-sets, export orchestration,
   validation) — imports only a *type* from TanStack. It runs unchanged under Angular.

3. **No CSS-in-JS in the engine.** The renderer emits plain `bst-*` classes and `data-bst-*`
   attributes (engine deps are *only* the two TanStack packages — no emotion/styled). The **base
   stylesheet is largely reusable** across React and Angular; only adapter chrome CSS differs.

---

## 2. What ports for free vs. what gets rewritten

Measured from `packages/engine/src` (non-test):

### 2a. Framework-neutral — reuse as-is (kernel) ≈ 3,900 pure-`.ts` LOC + ~700 embedded

| File | LOC | What it is | Port action |
| --- | ---: | --- | --- |
| `runtime.ts` | 1,430 | Editing/change-set/export/validation runtime | **Reuse.** Swap 1 type import `react-table`→`table-core` |
| `export.ts` | 468 | CSV / XLSX / print builders (dep-free) | **Reuse** |
| `cells/formats.ts` | 397 | ERP field formats (Aadhaar/PAN/GSTIN, Verhoeff, Luhn, mod-97…) | **Reuse** |
| `cells/qr.ts` | 357 | QR matrix generation | **Reuse** |
| `filtering.ts` | 251 | `bstCondition` operator-aware filter | **Reuse** |
| `datasource.ts` | 220 | Server DataSource contract + file verbs | **Reuse** |
| `spanning.ts` | 162 | Cell-span computation | **Reuse** |
| `interaction/store.ts` | 128 | Selection/edit interaction store | **Reuse** (external store) |
| `features.ts` | 102 | v9 `tableFeatures({...})` registration | **Reuse.** Swap import `react-table`→`angular-table` |
| `cells/richtext.ts` | 92 | HTML sanitizer + preview | **Reuse** |
| `virtualization.ts` | 89 | Virtualization resolve + bypass math | **Reuse** |
| `registry/registry.ts` | 57 | Cell-type registry container | **Reuse** |
| `validation/validate.ts` | 56 | Validator runner | **Reuse** |
| `autosize.ts` | 56 | Offscreen `canvas.measureText` sizing | **Reuse** |
| `cells/barcode.ts` | 48 | Code-128 encoding | **Reuse** |
| _embedded in React files_ | ~700 | `buildCtx` + `resolve*` (in `useBstTable`), the `SETTINGS_META`/registry data model (in `settings.ts`), most of `formatting.ts` | **Extract → reuse** |

### 2b. React-specific — rewrite in Angular idiom ≈ 5,500–5,900 LOC

| File | LOC | What it is | Port action |
| --- | ---: | --- | --- |
| `BstTable.tsx` | 1,556 | The renderer: sticky pinning, sizing/resize, filter row, selection painting, keyboard nav, editing overlays, detail/group/pinned rows, autosize, virtualization windowing, conditional-format application | **Rewrite** as `BstTableComponent` (template + directives + signals). *Hardest chunk.* |
| `registry/defaults.tsx` | 1,248 | ~17 cell types × (read + edit): text, longtext, number, date, boolean, single/multi-select (+fitChips), radio, hyperlink, files (+preview/upload), action, actionMenu, sparkline, kpi, qr, barcode, richText | **Rewrite** as Angular cell components/templates (logic pulled from kernel) |
| `useBstInfiniteDataSource.ts` | 271 | Infinite-scroll hook | **Rewrite** as Angular service (wraps neutral `datasource.ts`) |
| `cells/celltypes.tsx` | 244 | Exported cell-type components | **Rewrite** |
| `useBstDataSource.ts` | 243 | Server-mode hook | **Rewrite** as Angular service |
| `icons.tsx` | 215 | Inline-SVG icon set + context | **~50% reuse** (SVG strings port; React wrapper doesn't) |
| `BstConditionalFormatBuilder.tsx` | 211 | Format-builder UI | **Rewrite** (rules engine is neutral) |
| `BstFilterBuilder.tsx` | 197 | Filter-builder UI | **Rewrite** (predicate logic is neutral) |
| `useBstTable.ts` (glue part) | ~250 | `useTable`/`useRef` wiring | **Rewrite** as `injectTable` wrapper + runtime lifecycle service |
| `settings.ts` (hook part) | ~80 | `useBstSettings` resolution | **Rewrite** as Angular signals |
| `formatting.ts` (view part) | ~40 | ReactNode-typed bits | **Rewrite** thin |
| `interaction/useStoreSelector.ts` | small | React external-store selector | **Replace** with Angular signal bridge |

### 2c. Adapters, MCP, demo

| Package | LOC | Port action |
| --- | ---: | --- |
| **MUI adapter** | 1,951 | → **Angular Material adapter** (`@bloomskill/table-material`). Full rewrite of chrome: toolbar, search, columns menu, pagination, settings drawer, builders host, export menu, review-changes sheet, density. |
| **shadcn adapter** | 2,437 | → **Angular "unstyled/CDK" adapter** (Spartan UI / Angular CDK + Tailwind). *Second slice — not day one.* |
| **MCP server** | 4,366 | **~70% reuse.** Tools/prompts/resources architecture stays; corpus is generated from source, so it picks up Angular automatically **once** we add Angular scaffolding templates, Angular examples, and framework detection. |
| **Demo app** | large | Rewrite showcase in Angular. |

---

## 3. The core strategic decision

### Strategy A — **Shared kernel + Angular adapter** (recommended)

Refactor the engine into two layers:

- **`@bloomskill/table-kernel`** — framework-neutral TypeScript: everything in §2a. Published once,
  consumed by **both** React and Angular. Single source of truth for all logic.
- **`@bloomskill/table-react`** — today's engine, minus the kernel (React renderer + hooks + cell views).
- **`@bloomskill/table-angular`** — Angular reactivity glue (`injectTable` wrapper, signals, services)
  + `BstTableComponent` + Angular cell renderers.
- **`@bloomskill/table-material`** — Angular Material chrome adapter.

**Cost:** an upfront React-side refactor (Phase 0) to extract the kernel — moving ~16 files, swapping
`@tanstack/react-table` *type* imports to `@tanstack/table-core`, with the existing 40+ test files as
the safety net.
**Payoff:** every future feature and bug fix is written **once** in the kernel and both frameworks
inherit it. The CLAUDE.md §12 "settings-sheet parity" compile-guard and the §13 MCP corpus stay a
**single** governance surface. This is the only sane option for "one standard grid, many frameworks."

### Strategy B — **Fork & port** (faster to first pixel, worse forever)

Copy the engine, mechanically port every file to Angular, maintain two parallel logic codebases.
Reaches a running Angular grid maybe 3–4 weeks sooner, but then `runtime.ts` (1,430 LOC), export,
formats, QR/barcode, filtering, etc. exist **twice** — every fix done twice, every §12/§13 rule
enforced twice, drift guaranteed. **Not recommended** for a library whose whole premise is
standardization.

> **Recommendation: Strategy A.** The kernel extraction is a real cost but it's bounded (mechanical,
> test-guarded) and it's the difference between maintaining one library-for-N-frameworks and
> maintaining N libraries.

---

## 4. Target architecture (Strategy A)

```
@bloomskill/table-kernel     ← framework-neutral TS (runtime, export, formats, qr, barcode,
                                richtext, filtering, datasource, spanning, interaction store,
                                features registration, validation, autosize, virtualization math,
                                settings model, buildCtx/resolvers)   [React + Angular share this]
        ├── @bloomskill/table-react      (existing renderer + hooks + cell views)
        │       ├── @bloomskill/table-mui       (existing)
        │       └── @bloomskill/table-shadcn    (existing)
        └── @bloomskill/table-angular    (injectTable wrapper + BstTableComponent + cell components)
                └── @bloomskill/table-material  (Angular Material chrome)   [+ table-spartan later]

@bloomskill/table-mcp        ← one server, documents/scaffolds BOTH frameworks (corpus from source)
```

`version.ini` remains the single version source; the release flow grows from 4 to ~6–7 packages.

---

## 5. Phased execution plan & effort

Effort in **engineer-weeks**, assuming one senior engineer fluent in **both** Angular (19+, signals)
and this codebase. Ranges reflect low/high.

| Ph | Work package | Weeks | Notes / risk |
| --- | --- | ---: | --- |
| **0** | **Kernel extraction** (React side): move §2a files into `table-kernel`, swap `react-table`→`table-core` type imports, extract `buildCtx`/resolvers/settings model, re-green all tests | **2–3** | Mechanical but broad; test suite is the safety net. No Angular yet. |
| **1** | **Angular reactivity spike + skeleton**: `injectTable` wrapper, runtime lifecycle via signals/service, baseline grid (data/columns/sort/filter/paginate) with FlexRender | **1.5–2** | De-risks the reactivity-model mapping early. |
| **2** | **Renderer** — port `BstTable.tsx` → `BstTableComponent`: pinning, sizing/resize, filter row, selection paint, keyboard nav, editing overlays, detail/group/pinned rows, autosize, virtualization, conditional formatting | **4–6** | **Hardest.** Signals vs React render model; virtualization/spanning/selection edge cases. |
| **3** | **Cell-type registry + renderers/editors** — port `defaults.tsx`/`celltypes.tsx`: ~17 types × read+edit | **4–5** | Logic from kernel; views rebuilt as Angular components/templates. |
| **4** | **Interaction wiring** — editing, validation, selection, clipboard, undo/redo, row actions, batch/review, virtualization (`angular-virtual`), infinite scroll + DataSource services | **3–4** | Kernel holds the logic; Angular owns DOM events/focus/overlays. |
| **5** | **Angular Material adapter** — port MUI chrome (toolbar, search, columns menu, pagination, settings drawer, export menu, review sheet, density) | **3–4** | |
| **6** | **Builders** — filter builder + conditional-format builder as Angular components | **1.5–2** | Rule engines neutral; UI rebuilt. |
| **7** | **Demo + tests + a11y** — Angular showcase; re-achieve parity coverage (~40 test files) in an Angular harness; axe pass | **3–4** | Test rewrite is a real chunk. |
| **8** | **MCP extension + docs + release plumbing** — Angular corpus/scaffold/detection, READMEs, 6–7-package version flow | **2–3** | Corpus auto-generates once templates exist. |
| **9** | **Stabilization** — AG-grid parity audit, StackBlitz demos, buffer | **2–3** | |
| | **Total (1 senior dev)** | **26–36** | **≈ 6–9 months; midpoint ~7.** |

### Milestones (what "done" looks like along the way)

- **PoC (~6–8 weeks):** Phases 0–1 + partial 2/3 — an Angular grid that sorts/filters/paginates, a
  few cell types, basic inline editing, minimal Material chrome. Demoable to stakeholders.
- **MVP (~3–4 months):** workflow-tier parity — full cell-type registry, editing + validation +
  selection + clipboard + row actions, one Material adapter, no 1M-row/virtualization polish, no builders.
- **Full parity (~6–9 months):** everything above + virtualization + infinite scroll + server
  DataSource + builders + export + settings sheet + MCP + docs, audited against `COVERAGE.md`.

### Team scaling

- **2 engineers:** after Phases 0–1 (shared), split kernel/renderer/cells (dev A) from
  adapter/builders/demo/MCP (dev B) → **~4–5 months** calendar.
- **Solo, Angular-fluent:** ~7 months.
- **Solo, learning Angular signals on the job:** add ~30–40% → ~9–12 months.

---

## 6. Risks & findings (the R&D detail)

1. **Reactivity-model mismatch (medium).** React re-renders top-down; our `useBstTable` rebuilds
   `ctx` each render and keeps a stable runtime via `useRef`. Angular v9 `injectTable` is
   **signals**-based (zoneless-friendly). The pattern maps to `computed`/`effect`, but the custom
   interaction store (`interaction/store.ts` + `useStoreSelector`) needs an Angular signal bridge.
   Bounded; de-risk in Phase 1.
2. **`flexRender` differs (low-medium).** React `flexRender` returns `ReactNode`; Angular's renders
   `TemplateRef`/component/primitive. This is *why* the cell views (`defaults.tsx`) can't be shared —
   but the formatting/QR/barcode/richtext **logic** they call is all in the kernel.
3. **Angular ≥19 requirement (constraint, not blocker).** `@tanstack/angular-table` v9 is
   signals-based and needs Angular 19+. Confirm consumers' target Angular version.
4. **Angular adapter maturity (low).** The Angular adapter historically trailed React and its v9
   signal-proxy implementation is newer than React's. Validate its ergonomics in the Phase-1 spike
   before committing the renderer design.
5. **Test-suite rewrite (medium).** ~40 React Testing Library + vitest/jsdom files must be re-authored
   for Angular (Vitest + AnalogJS, or Jest + jest-preset-angular; Angular Testing Library / Spectator).
   Folded into Phase 7 — don't underestimate it.
6. **Kernel type-import swap (low).** Most symbols our neutral files import from `@tanstack/react-table`
   (types, feature modules, row-model + sort/filter/agg factories) re-export from `@tanstack/table-core`.
   Only `useTable`/`flexRender`/`useVirtualizer` are truly framework-bound. Verify each symbol during Phase 0.
7. **Governance surface (design-in, not a risk under Strategy A).** CLAUDE.md §12 settings-sheet parity
   (compile-enforced) and §13 MCP corpus/README/version discipline must span both frameworks. The kernel
   keeps `BstTableEngineToggles` a single source of truth so both inherit; **fork (Strategy B) doubles
   this** — a strong additional reason to prefer A.

---

## 7. Open decisions (needed to lock the estimate)

1. **Strategy A (shared kernel) vs B (fork)?** — Recommend **A**.
2. **Which Angular adapter first?** — Recommend **Angular Material** (mirrors MUI); Spartan/CDK later.
3. **Scope for v1?** — Full parity, or ship **MVP (workflow tier)** first and iterate (matches our
   slice-by-slice release habit)?
4. **Target Angular version** consumers must support (drives the ≥19 signals constraint).
5. **Team size / calendar** — solo ~7 mo, or 2 devs ~4–5 mo?
