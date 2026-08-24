/**
 * Pagination chrome helpers — shared, pure logic for the adapters' "Rows per page"
 * dropdown so MUI and shadcn stay identical. Lets `pageSizeOptions` carry an `'all'`
 * entry that shows every row (the "total number of rows" choice), on top of the
 * plain numeric sizes.
 */

/** One entry a consumer can put in `pageSizeOptions` — a fixed size, or `'all'` (every row). */
export type BstPageSizeOption = number | 'all'

/** The `<option>` value the "All" choice uses in the select. */
export const PAGE_SIZE_ALL = -1

/**
 * Page size actually applied for "All". A large sentinel (not the live row count),
 * so the choice stays selected as the data changes — TanStack renders one page of
 * every row for any page size ≥ the total.
 */
export const PAGE_SIZE_ALL_APPLIED = Number.MAX_SAFE_INTEGER

/** A resolved dropdown choice: the option `value` to render and its `label`. */
export interface BstPageSizeChoice {
  value: number
  label: string
}

/**
 * Resolve the dropdown's choices plus the value that should read as selected.
 *
 * "All" is shown as selected whenever the current page size is **not** one of the
 * offered numeric sizes (i.e. it was set to the "All" sentinel, or otherwise
 * exceeds every option) — so picking a normal size like `20` still shows `20` even
 * when there are fewer than 20 rows. Pure — unit-tested.
 */
export function resolvePageSizeChoices(
  options: ReadonlyArray<BstPageSizeOption>,
  currentPageSize: number,
): { choices: BstPageSizeChoice[]; value: number } {
  const choices: BstPageSizeChoice[] = options.map((o) =>
    o === 'all' ? { value: PAGE_SIZE_ALL, label: 'All' } : { value: o, label: String(o) },
  )
  const hasAll = options.includes('all')
  const numeric = new Set(choices.map((c) => c.value).filter((v) => v !== PAGE_SIZE_ALL))
  // If the current page size isn't one of the offered sizes (a consumer set a
  // custom `pagination.pageSize` / `initialState`), surface it as its own choice so
  // the rendered <select> value ALWAYS matches an option — otherwise MUI's Select
  // warns "out-of-range value". When 'all' is offered it already represents an
  // unlisted size, so only inject a numeric choice when there's no 'all' fallback.
  if (currentPageSize > 0 && !numeric.has(currentPageSize) && !hasAll) {
    choices.push({ value: currentPageSize, label: String(currentPageSize) })
    choices.sort((a, b) => a.value - b.value) // pure numeric here (no PAGE_SIZE_ALL)
    numeric.add(currentPageSize)
  }
  const value = hasAll && !numeric.has(currentPageSize) ? PAGE_SIZE_ALL : currentPageSize
  return { choices, value }
}

/** Turn a chosen dropdown value into the page size to apply (`setPageSize`). */
export function pageSizeForChoice(value: number): number {
  return value === PAGE_SIZE_ALL ? PAGE_SIZE_ALL_APPLIED : value
}
