import type { RowData } from '@tanstack/react-table'
import type { CellType } from './types.js'

/**
 * A cell-type registry (Plan.md §2.3, concern #2). Keyed by `CellType.id`, which
 * is matched against `columnDef.meta.type`. Adapters seed one via their preset
 * (`createMuiPreset` / `createShadcnPreset`) and may override individual types.
 */
export interface CellTypeRegistry {
  register: (ct: CellType<any, any, any>) => void
  /** Resolve a type id, falling back to `'text'` when unknown / undefined. */
  get: (id: string | undefined) => CellType<any, any, any>
  has: (id: string) => boolean
  list: () => string[]
  /** A shallow copy so adapters can extend without mutating a shared instance. */
  clone: () => CellTypeRegistry
}

export function createCellTypeRegistry(
  seed?: Array<CellType<any, any, any>>,
): CellTypeRegistry {
  const map = new Map<string, CellType<any, any, any>>()

  const register = (ct: CellType<any, any, any>) => {
    map.set(ct.id, ct)
  }
  seed?.forEach(register)

  const get = (id: string | undefined): CellType<any, any, any> => {
    const found = (id != null && map.get(id)) || map.get('text')
    if (!found) {
      throw new Error(
        `Bst-Table: no CellType "${id ?? '(none)'}" is registered and no "text" fallback exists. ` +
          `Register a preset (createMuiPreset / createShadcnPreset) or a default registry.`,
      )
    }
    return found
  }

  const registry: CellTypeRegistry = {
    register,
    get,
    has: (id) => map.has(id),
    list: () => Array.from(map.keys()),
    clone: () => createCellTypeRegistry(Array.from(map.values())),
  }
  return registry
}

/** Identity helper for authoring a CellType with full inference. */
export function defineCellType<
  TValue,
  TMeta = unknown,
  TData extends RowData = any,
>(ct: CellType<TValue, TMeta, TData>): CellType<TValue, TMeta, TData> {
  return ct
}
