/**
 * Dependency-free QR Code encoder (byte mode, versions 1–10, EC levels L/M/Q/H).
 * Produces the module matrix; the `qr` cell type renders it to inline SVG so a QR
 * cell needs no runtime dependency. Verified bit-for-bit against the `qrcode`
 * reference library in tests (a dev-only dependency). Follows ISO/IEC 18004.
 */

export type QrEcLevel = 'L' | 'M' | 'Q' | 'H'
export interface QrMatrix {
  /** Side length in modules. */
  size: number
  /** `modules[row][col]` — true = dark. */
  modules: boolean[][]
}

const LEVELS: QrEcLevel[] = ['L', 'M', 'Q', 'H']
/** Format-info 2-bit EC indicator: M=0, L=1, H=2, Q=3. */
const EC_INDICATOR: Record<QrEcLevel, number> = { M: 0, L: 1, H: 2, Q: 3 }

// EC block table (ISO/IEC 18004), versions 1–10 × [L,M,Q,H]:
// [ecCodewordsPerBlock, [[blockCount, dataCodewordsPerBlock], ...]]
type BlockSpec = [number, [number, number][]]
const EC_TABLE: Record<number, BlockSpec[]> = {
  1: [[7, [[1, 19]]], [10, [[1, 16]]], [13, [[1, 13]]], [17, [[1, 9]]]],
  2: [[10, [[1, 34]]], [16, [[1, 28]]], [22, [[1, 22]]], [28, [[1, 16]]]],
  3: [[15, [[1, 55]]], [26, [[1, 44]]], [18, [[2, 17]]], [22, [[2, 13]]]],
  4: [[20, [[1, 80]]], [18, [[2, 32]]], [26, [[2, 24]]], [16, [[4, 9]]]],
  5: [[26, [[1, 108]]], [24, [[2, 43]]], [18, [[2, 15], [2, 16]]], [22, [[2, 11], [2, 12]]]],
  6: [[18, [[2, 68]]], [16, [[4, 27]]], [24, [[4, 19]]], [28, [[4, 15]]]],
  7: [[20, [[2, 78]]], [18, [[4, 31]]], [18, [[2, 14], [4, 15]]], [26, [[4, 13], [1, 14]]]],
  8: [[24, [[2, 97]]], [22, [[2, 38], [2, 39]]], [22, [[4, 18], [2, 19]]], [26, [[4, 14], [2, 15]]]],
  9: [[30, [[2, 116]]], [22, [[3, 36], [2, 37]]], [20, [[4, 16], [4, 17]]], [24, [[4, 12], [4, 13]]]],
  10: [[18, [[2, 68], [2, 69]]], [26, [[4, 43], [1, 44]]], [24, [[6, 19], [2, 20]]], [28, [[6, 15], [2, 16]]]],
}
/** Alignment-pattern centre coordinates per version. */
const ALIGN: Record<number, number[]> = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
}

// ---- GF(256) arithmetic (primitive poly 0x11d) ----
const EXP = new Uint8Array(256)
const LOG = new Uint8Array(256)
;(() => {
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
})()
const gmul = (a: number, b: number): number =>
  a === 0 || b === 0 ? 0 : EXP[(LOG[a] + LOG[b]) % 255]

function rsGenerator(degree: number): Uint8Array {
  const result = new Uint8Array(degree)
  result[degree - 1] = 1
  let root = 1
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gmul(result[j], root)
      if (j + 1 < degree) result[j] ^= result[j + 1]
    }
    root = gmul(root, 2)
  }
  return result
}
function rsRemainder(data: number[], degree: number): number[] {
  const gen = rsGenerator(degree)
  const result = new Uint8Array(degree)
  for (const b of data) {
    const factor = b ^ result[0]
    for (let i = 0; i < degree - 1; i++) result[i] = result[i + 1]
    result[degree - 1] = 0
    for (let j = 0; j < degree; j++) result[j] ^= gmul(gen[j], factor)
  }
  return Array.from(result)
}

const utf8 = (s: string): number[] => Array.from(new TextEncoder().encode(s))

function chooseVersion(byteLen: number, level: QrEcLevel): number {
  for (let v = 1; v <= 10; v++) {
    const [, groups] = EC_TABLE[v][LEVELS.indexOf(level)]
    const totalData = groups.reduce((s, [c, d]) => s + c * d, 0)
    const ccBits = v <= 9 ? 8 : 16
    const needBits = 4 + ccBits + 8 * byteLen
    if (needBits <= totalData * 8) return v
  }
  return -1
}

/** Build the interleaved final codeword sequence (data blocks + EC blocks). */
function makeCodewords(bytes: number[], version: number, level: QrEcLevel): number[] {
  const [ecPerBlock, groups] = EC_TABLE[version][LEVELS.indexOf(level)]
  const totalData = groups.reduce((s, [c, d]) => s + c * d, 0)
  const bits: number[] = []
  const push = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1)
  }
  push(0b0100, 4) // byte mode
  push(bytes.length, version <= 9 ? 8 : 16)
  for (const b of bytes) push(b, 8)
  const cap = totalData * 8
  for (let i = 0; i < 4 && bits.length < cap; i++) bits.push(0) // terminator
  while (bits.length % 8 !== 0) bits.push(0)
  const pad = [0xec, 0x11]
  for (let i = 0; bits.length < cap; i++) push(pad[i % 2], 8)

  const dataCw: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j]
    dataCw.push(v)
  }

  const blocks: number[][] = []
  const ecBlocks: number[][] = []
  let idx = 0
  for (const [count, dataPerBlock] of groups) {
    for (let c = 0; c < count; c++) {
      const blk = dataCw.slice(idx, idx + dataPerBlock)
      idx += dataPerBlock
      blocks.push(blk)
      ecBlocks.push(rsRemainder(blk, ecPerBlock))
    }
  }
  const out: number[] = []
  const maxData = Math.max(...blocks.map((b) => b.length))
  for (let i = 0; i < maxData; i++) for (const b of blocks) if (i < b.length) out.push(b[i])
  for (let i = 0; i < ecPerBlock; i++) for (const e of ecBlocks) out.push(e[i])
  return out
}

const maskFn = (m: number, r: number, c: number): boolean => {
  switch (m) {
    case 0: return (r + c) % 2 === 0
    case 1: return r % 2 === 0
    case 2: return c % 3 === 0
    case 3: return (r + c) % 3 === 0
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0
    case 5: return ((r * c) % 2) + ((r * c) % 3) === 0
    case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0
    default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
  }
}

function computeFormatBits(level: QrEcLevel, mask: number): number {
  const data = (EC_INDICATOR[level] << 3) | mask
  let rem = data
  for (let i = 0; i < 10; i++) {
    rem <<= 1
    if (rem & 0x400) rem ^= 0x537
  }
  return ((data << 10) | rem) ^ 0x5412
}
function computeVersionBits(version: number): number {
  let rem = version
  for (let i = 0; i < 12; i++) {
    rem <<= 1
    if (rem & 0x1000) rem ^= 0x1f25
  }
  return (version << 12) | rem
}

/** Encode `text` to a QR module matrix. Throws if it doesn't fit in versions 1–10. */
export function qrMatrix(text: string, level: QrEcLevel = 'M', forceMask?: number): QrMatrix {
  const bytes = utf8(text)
  const version = chooseVersion(bytes.length, level)
  if (version < 0) throw new Error('qr: content too long for versions 1–10')
  const size = 17 + 4 * version
  const mods: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const fn: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const set = (r: number, c: number, v: boolean, reserve = true) => {
    mods[r][c] = v
    if (reserve) fn[r][c] = true
  }

  // Finder patterns + separators
  const finder = (r0: number, c0: number) => {
    for (let dr = -1; dr <= 7; dr++)
      for (let dc = -1; dc <= 7; dc++) {
        const r = r0 + dr
        const c = c0 + dc
        if (r < 0 || r >= size || c < 0 || c >= size) continue
        const inRing =
          (dr >= 0 && dr <= 6 && (dc === 0 || dc === 6)) ||
          (dc >= 0 && dc <= 6 && (dr === 0 || dr === 6))
        const inCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4
        set(r, c, inRing || inCore)
      }
  }
  finder(0, 0)
  finder(0, size - 7)
  finder(size - 7, 0)

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    set(6, i, i % 2 === 0)
    set(i, 6, i % 2 === 0)
  }

  // Alignment patterns
  const centres = ALIGN[version]
  for (const r of centres)
    for (const c of centres) {
      if ((r <= 7 && c <= 7) || (r <= 7 && c >= size - 8) || (r >= size - 8 && c <= 7)) continue
      for (let dr = -2; dr <= 2; dr++)
        for (let dc = -2; dc <= 2; dc++) {
          const ring = Math.max(Math.abs(dr), Math.abs(dc))
          set(r + dr, c + dc, ring !== 1)
        }
    }

  // Dark module
  set(4 * version + 9, 8, true)

  // Reserve format-info areas (filled later)
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      fn[8][i] = true
      fn[i][8] = true
    }
  }
  for (let i = 0; i < 8; i++) {
    fn[8][size - 1 - i] = true
    fn[size - 1 - i][8] = true
  }
  // Reserve version-info areas (v7+)
  if (version >= 7) {
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 3; j++) {
        fn[i][size - 11 + j] = true
        fn[size - 11 + j][i] = true
      }
  }

  // Place data (zigzag, MSB first), remaining modules stay 0
  const cw = makeCodewords(bytes, version, level)
  let bitIdx = 0
  const totalBits = cw.length * 8
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5 // skip the vertical timing column, then continue at 3
    for (let vert = 0; vert < size; vert++) {
      const upward = ((right + 1) & 2) === 0
      for (let j = 0; j < 2; j++) {
        const c = right - j
        const r = upward ? size - 1 - vert : vert
        if (fn[r][c]) continue
        let dark = false
        if (bitIdx < totalBits) {
          dark = ((cw[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1) === 1
          bitIdx++
        }
        mods[r][c] = dark
      }
    }
  }

  // Choose the mask with the lowest penalty
  const applyMask = (m: number, apply: boolean) => {
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++) if (!fn[r][c] && maskFn(m, r, c)) mods[r][c] = apply ? !mods[r][c] : mods[r][c]
  }
  let bestMask = forceMask ?? 0
  if (forceMask == null) {
    let bestPenalty = Infinity
    for (let m = 0; m < 8; m++) {
      applyMask(m, true)
      placeFormat(mods, size, computeFormatBits(level, m))
      const p = penalty(mods, size)
      if (p < bestPenalty) {
        bestPenalty = p
        bestMask = m
      }
      applyMask(m, true) // undo (XOR is its own inverse)
    }
  }
  applyMask(bestMask, true)
  placeFormat(mods, size, computeFormatBits(level, bestMask))
  if (version >= 7) placeVersion(mods, size, computeVersionBits(version))

  return { size, modules: mods }
}

function placeFormat(mods: boolean[][], size: number, bits: number): void {
  const bit = (i: number) => ((bits >> i) & 1) === 1
  // Copy 1 — down the left of the top-left finder, then across its bottom.
  for (let i = 0; i <= 5; i++) mods[i][8] = bit(i)
  mods[7][8] = bit(6)
  mods[8][8] = bit(7)
  mods[8][7] = bit(8)
  for (let i = 9; i <= 14; i++) mods[8][14 - i] = bit(i)
  // Copy 2 — bits 0–7 across the top-right (row 8), bits 8–14 up the bottom-left (col 8).
  for (let i = 0; i <= 7; i++) mods[8][size - 1 - i] = bit(i)
  for (let i = 8; i <= 14; i++) mods[size - 15 + i][8] = bit(i)
  mods[size - 8][8] = true // always-dark module
}

function placeVersion(mods: boolean[][], size: number, bits: number): void {
  for (let i = 0; i < 18; i++) {
    const b = ((bits >> i) & 1) === 1
    const r = Math.floor(i / 3)
    const c = i % 3
    mods[r][size - 11 + c] = b
    mods[size - 11 + c][r] = b
  }
}

function penalty(mods: boolean[][], size: number): number {
  let score = 0
  // Rule 1: runs of ≥5 same-colour modules in rows/cols
  for (let r = 0; r < size; r++) {
    let runC = 1
    let runR = 1
    for (let c = 1; c < size; c++) {
      if (mods[r][c] === mods[r][c - 1]) runC++
      else {
        if (runC >= 5) score += runC - 2
        runC = 1
      }
      if (mods[c][r] === mods[c - 1][r]) runR++
      else {
        if (runR >= 5) score += runR - 2
        runR = 1
      }
    }
    if (runC >= 5) score += runC - 2
    if (runR >= 5) score += runR - 2
  }
  // Rule 2: 2×2 blocks of the same colour
  for (let r = 0; r < size - 1; r++)
    for (let c = 0; c < size - 1; c++) {
      const v = mods[r][c]
      if (v === mods[r][c + 1] && v === mods[r + 1][c] && v === mods[r + 1][c + 1]) score += 3
    }
  // Rule 3: finder-like patterns (1:1:3:1:1 with 4 light) in rows/cols
  const pat1 = [true, false, true, true, true, false, true, false, false, false, false]
  const pat2 = [false, false, false, false, true, false, true, true, true, false, true]
  const matches = (get: (i: number) => boolean, start: number, pat: boolean[]) => {
    for (let k = 0; k < pat.length; k++) if (get(start + k) !== pat[k]) return false
    return true
  }
  for (let r = 0; r < size; r++)
    for (let c = 0; c <= size - 11; c++) {
      if (matches((i) => mods[r][i], c, pat1) || matches((i) => mods[r][i], c, pat2)) score += 40
      if (matches((i) => mods[i][r], c, pat1) || matches((i) => mods[i][r], c, pat2)) score += 40
    }
  // Rule 4: dark/light balance (ISO/IEC 18004 §8.8.2, matching the qrcode ref:
  // k = |ceil(darkPercent / 5) - 10|, which is asymmetric around 50%).
  let dark = 0
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (mods[r][c]) dark++
  const k = Math.abs(Math.ceil(((dark * 100) / (size * size)) / 5) - 10)
  score += k * 10
  return score
}
