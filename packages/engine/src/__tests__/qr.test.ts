import { describe, test, expect } from 'vitest'
import qrcode from 'qrcode'
import { qrMatrix, type QrEcLevel } from '../cells/qr'

// Verify the dep-free encoder produces the EXACT same module matrix as the
// `qrcode` reference library (a dev-only dependency), across versions + levels.
function reference(text: string, level: QrEcLevel, version: number): boolean[][] {
  // Force byte mode — the qr cell always uses byte mode (works for any content);
  // qrcode would otherwise auto-pick the more compact numeric/alphanumeric modes.
  const qr = qrcode.create([{ data: text, mode: 'byte' }] as never, {
    errorCorrectionLevel: level,
    version,
  })
  const size = qr.modules.size
  const data = qr.modules.data as Uint8Array
  const m: boolean[][] = []
  for (let r = 0; r < size; r++) {
    m.push([])
    for (let c = 0; c < size; c++) m[r].push(data[r * size + c] === 1)
  }
  return m
}

const CASES: { text: string; note: string }[] = [
  { text: 'A', note: 'v1 tiny' },
  { text: 'hello', note: 'v1' },
  { text: 'HELLO WORLD', note: 'v1 upper' },
  { text: 'https://bloomskill.example/x', note: 'url ~v2-3' },
  { text: 'The quick brown fox jumps over the lazy dog.', note: 'sentence ~v3-4' },
  { text: 'x'.repeat(100), note: 'long multi-block ~v6-10' },
  { text: 'ünïcödé — 日本 — 🎯 tail', note: 'utf-8 multibyte' },
]
const LEVELS: QrEcLevel[] = ['L', 'M', 'Q', 'H']

describe('qrMatrix — matches the qrcode reference library', () => {
  for (const { text, note } of CASES) {
    for (const level of LEVELS) {
      test(`${note} @ ${level}`, () => {
        const mine = qrMatrix(text, level)
        const ref = reference(text, level, (mine.size - 17) / 4)
        expect(mine.size).toBe(ref.length)
        for (let r = 0; r < mine.size; r++) {
          expect(mine.modules[r], `row ${r} of "${note}" @ ${level}`).toEqual(ref[r])
        }
      })
    }
  }

  test('throws when content exceeds versions 1–10', () => {
    expect(() => qrMatrix('x'.repeat(1000), 'H')).toThrow(/too long/)
  })
})
