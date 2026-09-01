// Central v9 feature registration for Bst-Table — the "engine" half of the plan
// (§2.1). No UI library is imported here. In v9 the `tableFeatures({...})` object
// carries EVERYTHING: feature modules, client row-model factories, and the
// sort/filter fn registries. `tableFeatures` also type-validates prerequisites
// (e.g. `sortedRowModel` requires `rowSortingFeature`).
import {
  tableFeatures,
  createCoreRowModel,
  createSortedRowModel,
  createFilteredRowModel,
  createPaginatedRowModel,
  createExpandedRowModel,
  createGroupedRowModel,
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowExpandingFeature,
  rowPinningFeature,
  columnGroupingFeature,
  rowAggregationFeature,
  columnVisibilityFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
  columnResizingFeature,
  sortFn_basic,
  sortFn_alphanumeric,
  sortFn_alphanumericCaseSensitive,
  sortFn_datetime,
  sortFn_text,
  sortFn_textCaseSensitive,
  filterFn_includesString,
  filterFn_inNumberRange,
  aggregationFn_sum,
  aggregationFn_count,
  aggregationFn_mean,
  aggregationFn_median,
  aggregationFn_min,
  aggregationFn_max,
  aggregationFn_extent,
  aggregationFn_first,
  aggregationFn_last,
  aggregationFn_unique,
  aggregationFn_uniqueCount,
} from '@tanstack/react-table'
import type { BstColumnMeta } from './registry/types.js'
import { filterFn_bstCondition } from './filtering.js'

/** OOTB feature set the POC showcases (all v9 stock features). */
export const bstTableFeatures = tableFeatures({
  // Feature modules
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowExpandingFeature,
  rowPinningFeature,
  columnGroupingFeature,
  rowAggregationFeature,
  columnVisibilityFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
  columnResizingFeature,
  // Client-side row models (swap for server-mode later — Plan.md §2.2)
  coreRowModel: createCoreRowModel(),
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  expandedRowModel: createExpandedRowModel(),
  groupedRowModel: createGroupedRowModel(),
  // Fn registries — keys become valid `sortFn` / `filterFn` / `globalFilterFn` values
  sortFns: {
    basic: sortFn_basic,
    alphanumeric: sortFn_alphanumeric,
    datetime: sortFn_datetime,
    // v9 auto-resolves plain string columns to the `text` fn; leaving it out of
    // the registry silently fell them back to `basic`, whose null-vs-string
    // comparison is inconsistent, so null-containing string columns never sorted
    // (#5).
    text: sortFn_text,
    // Case-sensitive variants: the default fns fold case, so "Zoe" and "adam"
    // sort as if lowercase. These order uppercase before lowercase instead.
    alphanumericCaseSensitive: sortFn_alphanumericCaseSensitive,
    textCaseSensitive: sortFn_textCaseSensitive,
  },
  filterFns: {
    includesString: filterFn_includesString,
    inNumberRange: filterFn_inNumberRange,
    // Operator-aware condition filter used by the filter-builder UI (E3).
    bstCondition: filterFn_bstCondition,
  },
  // Aggregation fns for grouping (E4) — keys become valid `aggregationFn` values.
  aggregationFns: {
    sum: aggregationFn_sum,
    count: aggregationFn_count,
    mean: aggregationFn_mean,
    // Median resists outliers, so it reads better than `mean` on skewed columns
    // (salary, duration) where one extreme row drags the average.
    median: aggregationFn_median,
    min: aggregationFn_min,
    max: aggregationFn_max,
    extent: aggregationFn_extent,
    // Representative-value aggregations: `first`/`last` surface one row's value
    // for a column that is constant within the group; `unique` lists the
    // distinct values (vs `uniqueCount`, which only counts them).
    first: aggregationFn_first,
    last: aggregationFn_last,
    unique: aggregationFn_unique,
    uniqueCount: aggregationFn_uniqueCount,
  },
  // Type-only slot: types `columnDef.meta` as BstColumnMeta for every column,
  // WITHOUT global declaration merging (Plan.md §2.1). Phantom value — stripped
  // at runtime by TanStack; only its type is used.
  columnMeta: {} as BstColumnMeta,
})

export type BstTableFeatures = typeof bstTableFeatures
