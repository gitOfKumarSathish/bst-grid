/**
 * Minimal dotted-version comparison — just enough to order Bst-Table's own
 * `x.y.z` release versions. Not a full semver implementation (no ranges,
 * pre-release tags or build metadata): those live in `tools/version.ts`'s
 * `rangeAllows`, which reads package.json ranges. This orders two concrete
 * versions so a `since` can be checked against an installed version.
 */

/** Compare two `x.y.z` versions: -1 if a<b, 0 if equal, 1 if a>b. Missing/NaN parts count as 0. */
export function compareSemver(a: string, b: string): number {
  const pa = a.split('.')
  const pb = b.split('.')
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const x = Number.parseInt(pa[i] ?? '0', 10) || 0
    const y = Number.parseInt(pb[i] ?? '0', 10) || 0
    if (x !== y) return x < y ? -1 : 1
  }
  return 0
}
