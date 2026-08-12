import type { RowData } from '@tanstack/react-table'
import type {
  CellType,
  CellValidateContext,
  FieldError,
} from '../registry/types.js'

/**
 * Compose the validators for a cell (C3): a `required` check, then the
 * CellType's built-in validator, then the column-level `meta.validate`. Returns
 * a synchronous `FieldError[]` when every validator is sync, otherwise a
 * Promise — the runtime handles async with last-write-wins + AbortSignal.
 */
export function runValidators<TData extends RowData>(
  value: unknown,
  cellType: CellType<any, any, TData>,
  ctx: CellValidateContext<TData>,
): FieldError[] | Promise<FieldError[]> {
  const meta = ctx.meta
  const cm = (meta.cellMeta ?? {}) as Record<string, any>
  const parts: Array<FieldError[] | Promise<FieldError[]>> = []

  if (cm.required) {
    const empty = cellType.isEmpty
      ? cellType.isEmpty(value)
      : value == null || value === ''
    if (empty) {
      parts.push([
        {
          level: 'error',
          message: typeof cm.required === 'string' ? cm.required : 'Required',
          code: 'required',
        },
      ])
    }
  }

  if (cellType.validate) parts.push(cellType.validate(value, ctx))
  if (meta.validate) parts.push(meta.validate(value as never, ctx))

  if (parts.every((p) => Array.isArray(p))) {
    return flatten(parts as FieldError[][])
  }
  return Promise.all(parts.map((p) => Promise.resolve(p))).then(flatten)
}

function flatten(lists: FieldError[][]): FieldError[] {
  const out: FieldError[] = []
  for (const l of lists) for (const e of l) out.push(e)
  return out
}

/** True when any finding is an `error` (as opposed to a `warning`). */
export function hasBlockingError(errors: FieldError[] | undefined): boolean {
  return !!errors && errors.some((e) => e.level === 'error')
}
