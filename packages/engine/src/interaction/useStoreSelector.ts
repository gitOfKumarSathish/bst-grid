import * as React from 'react'
import type { Store } from './store.js'

/**
 * Subscribe a component to a slice of an external store with a cached snapshot,
 * so it only re-renders when its selected slice actually changes (Plan.md §2.5
 * rule 5 — per-cell interaction subscriptions). No extra dependency: the
 * snapshot is memoized against the previous state object and the previous
 * derived value.
 */
export function useStoreSelector<S, T>(
  store: Store<S>,
  selector: (state: S) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const cache = React.useRef<{ state: S; value: T } | null>(null)

  const getSnapshot = React.useCallback((): T => {
    const state = store.getState()
    const prev = cache.current
    if (prev && prev.state === state) return prev.value
    const value = selector(state)
    if (prev && isEqual(prev.value, value)) {
      cache.current = { state, value: prev.value }
      return prev.value
    }
    cache.current = { state, value }
    return value
  }, [store, selector, isEqual])

  return React.useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
}

/** Shallow array equality — handy for selecting `FieldError[]` / id lists. */
export function arrayEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}
