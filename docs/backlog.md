# Bst-Table — Working backlog

_Actionable "what's next" list, derived from [`COVERAGE.md`](../COVERAGE.md) (status source of
truth) and phased per [`Plan.md`](../Plan.md) PART 3. Snapshot: **v0.41.1, 2026-08-24**._

> **How to use this doc.** [`COVERAGE.md`](../COVERAGE.md) is the **source of truth for status**;
> this file is the **working list you tick off**. When an item ships: follow the
> [`CLAUDE.md`](../CLAUDE.md) §13 Definition of Done (code + test · §12 registry row · demo · README ·
> CHANGELOG · version bump), flip its status in `COVERAGE.md`, then check its box here. Keep the two
> in sync — don't let this backlog drift from the matrix.

**Effort:** **S** small · **M** medium · **L** large.
**Status:** 🟡 partial (started) · ❌ pending (not started).

**Snapshot tally (v0.41.1):** original spec 58 → ✅ 55 · 🟡 2 · ❌ 1 · extended X1–X29 → ✅ 13 ·
🟡 3 · ❌ 7 · ⏭️ 1 skipped · ⚪ 5 optional _(X8 Find shipped, unreleased)_. This backlog lists the
**12 open items** (5 partial + 7 pending); the ⚪ optional / ⏭️ skipped items are parked at the
bottom and are **not** work-to-do.

---

## Phase 6 — Chrome & filtering  _(in progress — closest to done)_

Self-contained **M**-effort features that build on foundations already shipped. Finish this phase first.

- [x] **X8 · Find** — ✅ done (unreleased) — **M**
  Search box that **highlights matches and jumps between them** (Next/Prev), hiding nothing —
  distinct from the global filter (which removes non-matches). Shipped: `enableFind` (+ `BstFindOptions`),
  adapters' `showFind`, ⌘/Ctrl+F · Enter/F3 · Esc, "n / m" counter, in-place `<mark>` + cell tint.
  _Done:_ the Find control cycles matches with a visible highlight + "n of m", no rows removed.
- [ ] **X10 · Managed row dragging** — ❌ pending — **M**
  Drag to **reorder rows**. Builds on the existing column drag-drop mechanism.
  _Done when:_ rows reorder via a drag handle, with an `onRowOrderChange`-style callback.

_(X7 tool-panel sidebar is ⏭️ deliberately skipped — see parked list.)_

---

## Phase 4 remainder — foundation, scale & quality

The backend/scale/quality items the higher tiers depend on. Includes two original-spec partials
(I4, A6) that live here by nature.

- [ ] **I4 · Backend reconcile** — 🟡 partial — **M**
  Change-set + single-call `onSave` shipped (v0.30.0); still need to **apply the server's response
  back into cells/rows** — server-authoritative values + partial-failure handling.
  _Done when:_ a save round-trips authoritative values into the grid and per-row failures surface.
- [ ] **X20 · Accessibility / ARIA audit** — 🟡 partial — **M**
  Keyboard nav shipped; needs a formal `role="grid"` / `aria-*` pass + an axe/WCAG audit.
  _Done when:_ axe reports clean on the rendered grid and roles/focus management are documented.
- [ ] **A6 · Prove the 1M-row tier end-to-end** — 🟡 partial — **L**
  Workflow + 10k-client-virtual tiers ✅; the **1M-row migration tier** (server DataSource + windowed
  fetch + virtualization) is not yet proven end-to-end. Pairs with X16.
  _Done when:_ a 1M-row server-mode demo sustains the perf gates (interaction < 200ms, bounded memory).
- [ ] **X22 / I5 · Live / streaming updates** — ❌ pending — **L**
  WebSocket / parent-driven **live merge** with a dirty-cell conflict policy. (X22 and original-spec
  I5 are the same item.) Depends on I4 reconcile.
  _Done when:_ external updates merge into the grid without clobbering in-flight edits.

---

## Phase 7 — Hierarchy, analytics & scale

Heavier features; schedule after Phase 6 closes.

- [ ] **X17 · Calculated / formula columns** — 🟡 partial — **M**
  `accessorFn` already gives derived values; needs a **first-class calc / expression column** surface.
  _Done when:_ a column can be defined by an expression over other columns, with a builder/config.
- [ ] **X16 · Advanced server-side row model (SSRM)** — 🟡 partial — **L**
  DataSource covers sort/filter/page; missing **lazy server-side grouping / pivot / tree + transactions**.
  Pairs with A6. _Done when:_ grouped/large data expands lazily against the server without full load.
- [ ] **X15 · Integrated charts** — ❌ pending — **L**
  Select a range → **chart from grid data** (uPlot / Recharts, both MIT). Today only in-cell
  sparkline/KPI exist. _Done when:_ a selected range renders an interactive chart from live values.

---

## Phase 8 — Polish & parity tail  _(in progress)_

- [ ] **X28 · Cell flashing on data change** — ❌ pending — **S**
  Briefly highlight changed cells (live-data feedback). Pairs with X22 live updates.
  _Done when:_ a value change flashes the cell, behind a toggle.
- [ ] **X25 · Row / column animations** — ❌ pending — **S/M**
  Move / sort transitions for rows and columns.
  _Done when:_ reorder/sort animate smoothly, respecting `prefers-reduced-motion`.
- [ ] **X29 · Aligned grids** — ❌ pending — **M**
  Two or more grids **sharing column state** (width/order/pin) so they stay in lockstep.
  _Done when:_ linked grids mirror column sizing/order changes.

---

## Recommended pick-up order

1. **X8 · Find** — high value, no dependency on unfinished work, cleanly scoped → best single next ask.
2. **X10 · Managed row dragging** — closes out Phase 6.
3. **I4 · Backend reconcile** → unblocks **X22 / I5** live updates.
4. **X20 · a11y audit** — production-hardening, do before broad adoption.
5. Then the Phase 7 analytics block (**X17 → X16 → X15**), with **A6** proven alongside **X16**.
6. Phase 8 polish (**X28 → X25 → X29**) as the tail.

---

## Parked — not work-to-do

**⏭️ Skipped**

- **X7 · Tool-panel sidebar** — deliberately not built (2026-08-17); redundant with the toolbar's
  Columns menu (show/hide · pin · reorder · group) + Filters button. Prototyped and reverted.

**⚪ Optional / out of scope** (rationale in [`COVERAGE.md`](../COVERAGE.md) "Optional — kept but out of scope")

- **X12 · Fill handle** (drag corner to fill / increment) — range selection + clipboard copy/paste cover bulk-fill needs; no consuming app needs the drag gesture yet.
- **X13 · Tree data** (self-referencing hierarchy) — master-detail + grouping cover current needs.
- **X14 · Pivoting** — grouping + aggregation cover current reporting needs.
- **X18 · Cell notes / comments** — annotation feature outside current scope.
- **X19 · Localization / i18n** (`localeText`) — call-site string overrides suffice for target apps.
- **X24 · RTL support** — no RTL-locale app consumes the grid yet.

_Revisit any parked item only if a consuming app needs it; then give it a phase and move it up._
