# Bst-Table — Audit Fix Tracker

**Source:** external adoption audit ("Bst-Table Adoption Terms", CrimeTracker Pro / Crypton,
13 Aug 2026) run against a live 9,568-row NCRP police-complaint register on **v0.32.6**.
**Verified:** every claim below was re-checked against the real `packages/*/src` source
(the audit cited bundled `dist` line numbers) via a 5-cluster source audit on 2026-08-13.

## Status legend
`[ ]` todo · `[x]` done · `CONFIRMED` real in 0.32.6 · `PARTIAL` partly true ·
`STALE` not reproducible from source (reconcile with their live repro before acting).

Each fix follows the §13 Definition of Done: **code + test → §12 registry (if a toggle) →
demo → README(s) → CHANGELOG → version bump**. Ship tier-by-tier as slices.

## Progress — this session (2026-08-13)
**Done + green — the full engine suite passes (283 tests / 41 files, 0 failures):**
- **Tier 1** — #5, #19, #12/#17/#18, #4 → `__tests__/tier1Fixes.test.tsx`
- **Tier 3** — #6, #7, #8 → `__tests__/tier3Filtering.test.tsx`. (#8 fix = keep a half-built
  `between` active but treat the missing bound as **open-ended** → one-sided filter, no
  `<= NaN` grid-wipe. Chosen over "make it inactive" so it reconciles with the existing
  `datasourceHardening` design, which intentionally keeps a one-bound range active.)
- **Tier 4** — #10 (paste clears stale draft) → `tier4Editing.test.tsx`;
  #2 (row-edit Cancel discards the session's drafts) → `tier4CancelRow.test.tsx`
- **Tier 6 #24** (span footprint pre-scan) → `tier6Spanning.test.tsx`
- **Tier 5 (shadcn)** — #20 settings-sheet focus trap · #16 Columns menu stays available for
  pin/group/reorder when hiding is off → `packages/shadcn/src/__tests__/tier5Shadcn.test.tsx`

Total: **14 defects fixed, all with regression tests** (engine 283/283 green; shadcn 37/37 green;
engine + shadcn typecheck clean).

> `filtering.ts` was auto-reverted to HEAD **twice** earlier by an external writer (open
> editor buffer or a file watcher). Re-applied and currently holding. If it reverts again,
> re-apply from this file's Tier-3 notes.

**Not started — files under active concurrent rewrite (coordinate before editing):**
- **Tier 2** (coordinate space #3/#9/#21/#22/#23) — `BstTable.tsx` / `useBstTable.ts` are
  mid-rewrite for D1 virtualization, which itself reshapes the coordinate space. Do *after*
  that work lands, or it will collide and likely be clobbered.
- **Tier 5 #13/#15** (`useBstTable.ts`) · **Tier 7 MCP** — concurrently modified.
- **Tier 5 #14** (shadcn filter-toggle strand) — the real fix (clear stranded `columnFilters`
  when column filters are disabled) is engine-side in `useBstTable.ts`, which is concurrently
  modified; deferred to avoid colliding.

Remaining DoD chores for the done tiers (demo wiring, READMEs, CHANGELOG, version bump) are
pending — they touch concurrently-modified files (`CLAUDE.md`, `CHANGELOG.md`, demo) so are
best done once the tree settles.

---

## Tier 0 — Release discipline (Gate 2) — cheapest gate, unblocks adoption on its own
- [ ] **CHANGELOG in the tarball.** `CHANGELOG.md` exists at repo root (72 KB) but is in **no**
  package `files` array → not published. Wire a copy step into `version:*`/`release` and add
  `"CHANGELOG.md"` to each package `files`. *(CONFIRMED — packaging)*
- [ ] **Meaningful version bumps.** 0.32.2/0.32.4/0.32.6 shipped byte-identical `dist`. Don't
  patch-bump docs-only changes, or label them `docs:` in the changelog.
- [ ] **Publish the known-defect list** (this file) and commit to a 1.0 stability line.

## Tier 1 — Quick wins (trivial/small, high blast radius) — ✅ DONE (2026-08-13)
Code + tests landed; engine builds clean; 6 new tests in `__tests__/tier1Fixes.test.tsx` pass.
| Ref | Verdict | Source | Fix | Status |
| --- | --- | --- | --- | --- |
| **#5** text sort unregistered | CONFIRMED | `features.ts:69` | imported `sortFn_text`, added `text:` to `sortFns` | [x] |
| **#19** header Enter/Space dead | CONFIRMED | `BstTable.tsx:552` | added `onKeyDown` (Enter/Space → toggle sort) | [x] |
| **#12/#17/#18** key handler traps filter inputs | CONFIRMED | `BstTable.tsx:235` | added `isFromGridFormControl` guard to `onKeyDown`/`onCopy`/`onPaste` | [x] |
| **#4** `saveOn` never read | CONFIRMED | `runtime.ts` (+ `BstTable.tsx` editor) | exposed `runtime.saveOn`; editor `commitsOn()` gates blur/enter | [x] |

> **⚠ Shared-tree note (2026-08-13):** the working tree has concurrent in-flight work
> (row virtualization D1 / infinite datasource A2 — new `virtualization.ts`,
> `useBstInfiniteDataSource.ts`, `cells/formats.ts` + tests; heavy edits to `BstTable.tsx`,
> `COVERAGE.md`, MCP package). Its tests are currently red (`virtualization.test.tsx`,
> MCP corpus parity). Those failures are **not** from the Tier-1 fixes. Tiers 2–7 overlap
> these files — coordinate before editing on top.

## Tier 2 — Coordinate-space refactor (one change → 5 bugs) — Gate 1 core
Build one helper: **visual coordinate → real editable data row (or skip)**, consumed by
`isCellEditable`, `moveActive`, and the paste loop; align the coord space to the *painted*
body rows (top/center/bottom when row-pinning is on).
| Ref | Verdict | Source | Status |
| --- | --- | --- | --- |
| **#3** `isCellEditable` true for phantom/group rows | CONFIRMED | `runtime.ts:330-344` (esp. 338) | [ ] |
| **#9/#21** pinned rows absent from coord space | CONFIRMED | `useBstTable.ts:167-176`, `BstTable.tsx:170-176` | [ ] |
| **#22** nav lands on group rows, empties clipboard | CONFIRMED | `runtime.ts:962-1003,1024` | [ ] |
| **#23** paste onto group row discarded, still fires `onDataChange` + no-op undo | CONFIRMED | `runtime.ts:1112-1121,577-580` | [ ] |

## Tier 3 — Filtering correctness (Gate 1)
| Ref | Verdict | Source | Fix | Status |
| --- | --- | --- | --- | --- |
| **#6** `num()` coerces empty → 0 (epoch), matches `before`/`<`/`<=` | CONFIRMED | `filtering.ts:87,122,141-151` | guard empty **cell** before `num()` | [ ] |
| **#8** half-filled `between` builds garbage predicate | CONFIRMED | `filtering.ts:122,149-151` | require both bounds before `between` is active | [ ] |
| **#7** date `equals`/`between` return zero rows | CONFIRMED | `filtering.ts:130,98-99,149-151` | compare by local day; inclusive local-day `between` | [ ] |

## Tier 4 — Editing peripheral paths (Gate 1)
| Ref | Verdict | Source | Fix | Status |
| --- | --- | --- | --- | --- |
| **#2** row-edit Cancel doesn't discard drafts | CONFIRMED | `registry/defaults.tsx:749`, `runtime.ts:498` (orphaned `cancelRowSession` `:724`) | wire Cancel → `cancelRowSession` | [ ] |
| **#10** `pasteFromText` leaves stale draft, counter sticks | CONFIRMED | `runtime.ts:1165` vs `:680` | `clearCellDraft` on paste settle | [ ] |

## Tier 5 — Settings / pagination robustness (Gate 3)
| Ref | Verdict | Source | Fix | Status |
| --- | --- | --- | --- | --- |
| **#13** pagination toggle init-only | CONFIRMED | `useBstTable.ts:225-228,285-289` | controlled pagination state reacting to settings | [ ] |
| **#15** every edit resets page 1 + collapses detail | CONFIRMED | `useBstTable.ts:244` (no `autoResetExpanded`) | expose `autoResetPageIndex`/`autoResetExpanded` opt-out | [ ] |
| **#16** hiding columns menu strands pin/group/reorder | CONFIRMED | `BstTableShadcn.tsx:249,476-587` | keep an escape hatch when the only control is hidden | [ ] |
| **#14** hiding column filters strands filter state | PARTIAL | `BstTableShadcn.tsx:275`, `useBstTable.ts:322` | clear/duplicate control when toggled off | [ ] |
| **#20** shadcn settings sheet no focus trap | CONFIRMED (shadcn only) | `BstTableShadcn.tsx:600-608` | initial focus + trap + background inert | [ ] |

## Tier 6 — Spanning (Gate 3)
| Ref | Verdict | Source | Fix | Status |
| --- | --- | --- | --- | --- |
| **#24** span planner double-books slots | CONFIRMED | `spanning.ts:104-131` (109 vs 123-128) | footprint pre-scan in pass 2 | [ ] |

## Tier 7 — MCP server (Postscript)
| Claim | Verdict | Source | Fix | Status |
| --- | --- | --- | --- | --- |
| Validator is spread-blind, no caveat, false `responsivePriority` flag | CONFIRMED | `validate.ts:50-70,157-159` | detect `{...spread}`/indirection → emit "analysis partial" caveat; stop asserting absence | [ ] |
| Registry lacks `manualPagination`/`rowCount`/`autoResetPageIndex` as lintable | PARTIAL (only `autoResetPageIndex` truly unhandled) | `rules.ts:169-175`, corpus `docs[]` | add server props to the lintable set | [ ] |
| Scaffold emits code its own validator warns about | PARTIAL (editing+serverMode omits `onDataChange`) | `scaffold.ts:98-102,267-274` | emit `onDataChange` or suppress the warning for server-owned data | [ ] |

---

## Not reproducible from source — reconcile with the live repro (do NOT blind-fix)
- **#E** (editor never unmounts after commit) — *audit tagged blocking.* `commitCell` nulls
  `editingCell` on every branch (`runtime.ts:681`) and the editor is driven by `isEditing`, so
  Enter/blur unmount it. Reads **already fixed** on 0.32.6. Ask for exact config/repro.
- **#11** (sort desyncs painted vs copied selection) — *audit tagged blocking.* Selection is
  stored by `{rowId, columnId}` and remapped every render; paint and copy share `visualIndexOf`,
  so they can't diverge. Reads **misdiagnosed** — likely conflated with #22 (group-row nav),
  which is real. Their cited `useStoreSelector.js:14` is an unrelated subscription hook.

## Gate 4 — feature gaps (roadmap, not defects)
- [ ] **I4** server write-back reconciliation (server-authoritative values + partial failures) —
  most important for trusting batch mode.
- [ ] URL-serializable table state (round-trip filters/sort/columns).
- [ ] Select-all-matching that carries the **query**, never a partial id list.
- [ ] File **upload/delete** DataSource verbs (I3/B5) — view/thumbnails already done.
- [ ] Permission hook on row actions (avoid reimplementing consumer `PermissionWrapper`).
- [ ] Row virtualization (D1) — consumer rates this low; they page on the server.
