/**
 * Dependency-free Code 128 (subset B) barcode encoder → bar-width pattern. The
 * `barcode` cell type renders it to inline SVG, so a barcode cell needs no runtime
 * dependency. Code 128B covers all printable ASCII (space–`~`), which is what SKUs
 * / IDs / short codes use. Verified by an encode→decode round-trip in tests.
 */

export interface BarcodeResult {
  /** Concatenated bar/space run widths (digits 1–4), starting with a bar. */
  pattern: string
  /** The encoded text (echoed for an optional human-readable line). */
  text: string
}

// Canonical Code 128 pattern table (value → 6 run widths; 106 = Stop, 7 widths).
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
]
const START_B = 104
const STOP = 106

/** Encode `text` as Code 128B. Throws on non-printable-ASCII input. */
export function code128(text: string): BarcodeResult {
  const codes: number[] = [START_B]
  for (const ch of text) {
    const v = ch.charCodeAt(0)
    if (v < 32 || v > 126) throw new Error('barcode: Code 128B supports printable ASCII (32–126) only')
    codes.push(v - 32)
  }
  let sum = codes[0]
  for (let i = 1; i < codes.length; i++) sum += codes[i] * i
  codes.push(sum % 103) // checksum
  codes.push(STOP)
  return { pattern: codes.map((c) => PATTERNS[c]).join(''), text }
}

/** Expose the pattern table + start/stop for tests (round-trip decode). */
export const _CODE128 = { PATTERNS, START_B, STOP }
