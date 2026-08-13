/**
 * Field-format presets (ERP / Frappe-style, B2/B1). A named **validation +
 * input-mask** applied to a `text` or `number` cell through `cellMeta.pattern`, so
 * the common identity / finance fields an ERP form needs — Aadhaar, PAN, GSTIN,
 * IFSC, email, phone, PIN code, … — validate, mask and normalize consistently
 * without hand-writing a `meta.validate` for each column.
 *
 * ```ts
 * { id: 'aadhaar', meta: { type: 'number', editable: true, cellMeta: { pattern: 'aadhaar' } } }
 * { id: 'pan',     meta: { type: 'text',   editable: true, cellMeta: { pattern: 'pan' } } }
 * ```
 *
 * `cellMeta.pattern` accepts a **built-in name** (`'aadhaar'`), a **`RegExp`**
 * (with an optional `cellMeta.patternMessage`), or a **custom `FieldFormat`**
 * object. Register your own reusable formats with {@link defineFieldFormat} or by
 * adding to {@link FIELD_FORMATS}. Checksum validators (Aadhaar/Verhoeff,
 * GSTIN) are exported for use outside the grid too.
 */

export interface FieldFormat {
  /** Stable id. */
  name: string
  /** Human label (docs / builder UIs). */
  label: string
  /**
   * Validate a **non-empty** value → an error message, or `null` when valid.
   * Emptiness is the `required` check's job — return `null` for `''` here.
   */
  validate?: (value: string) => string | null
  /** Format the stored value for display (the mask). Default: shown as-is. */
  mask?: (value: string) => string
  /** Normalize raw editor input as the user types (uppercase / strip separators). */
  normalize?: (raw: string) => string
  /** Placeholder for an empty editor. */
  placeholder?: string
  /** `inputMode` hint for the editor (mobile keyboards). */
  inputMode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'email' | 'url' | 'search'
  /** Max input length after normalization. */
  maxLength?: number
}

/** What `cellMeta.pattern` accepts. */
export type FieldPattern = string | RegExp | FieldFormat

/* ------------------------------------------------------------ checksum helpers */

// Verhoeff (dihedral D5) — the checksum UIDAI uses for Aadhaar's 12th digit.
// Canonical multiplication (d), permutation (p) and inverse (inv) tables.
const V_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]
const V_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]
const V_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]

/** True when a numeric string carries a valid Verhoeff check digit (last digit). */
export function verhoeffValid(num: string): boolean {
  if (!/^\d+$/.test(num)) return false
  let c = 0
  const rev = num.split('').reverse()
  for (let i = 0; i < rev.length; i++) c = V_D[c][V_P[i % 8][Number(rev[i])]]
  return c === 0
}

/** The Verhoeff check digit for a numeric payload (append it to make it valid). */
export function verhoeffChecksum(payload: string): string {
  let c = 0
  const rev = payload.split('').reverse()
  for (let i = 0; i < rev.length; i++) c = V_D[c][V_P[(i + 1) % 8][Number(rev[i])]]
  return String(V_INV[c])
}

/** Aadhaar (India, UIDAI): 12 digits, first 2–9, valid Verhoeff checksum. */
export function isValidAadhaar(v: string): boolean {
  const d = v.replace(/\s/g, '')
  return /^[2-9]\d{11}$/.test(d) && verhoeffValid(d)
}

/** PAN (India Income Tax): 5 letters, 4 digits, 1 letter. */
export function isValidPan(v: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.toUpperCase())
}

const GSTIN_CP = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
/** The GSTIN 15th character (checksum) for a 14-char prefix. */
export function gstinCheckDigit(first14: string): string {
  const mod = GSTIN_CP.length // 36
  let factor = 2
  let sum = 0
  for (let i = first14.length - 1; i >= 0; i--) {
    let cp = factor * GSTIN_CP.indexOf(first14[i].toUpperCase())
    factor = factor === 2 ? 1 : 2
    cp = Math.floor(cp / mod) + (cp % mod)
    sum += cp
  }
  return GSTIN_CP[(mod - (sum % mod)) % mod]
}

/** GSTIN (India GST): 2-digit state + 10-char PAN + entity + 'Z' + checksum. */
export function isValidGstin(v: string): boolean {
  const g = v.toUpperCase()
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) return false
  return gstinCheckDigit(g.slice(0, 14)) === g[14]
}

/** IFSC (India bank branch): 4 letters, a '0', 6 alphanumerics. */
export function isValidIfsc(v: string): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.toUpperCase())
}

/** Indian passport: a letter followed by 7 digits (e.g. `A1234567`). */
export function isValidPassport(v: string): boolean {
  return /^[A-Z][0-9]{7}$/.test(v.toUpperCase())
}

/** IEC (India Import-Export Code): a PAN since 2017, or a legacy 10-digit code. */
export function isValidIec(v: string): boolean {
  const s = v.toUpperCase()
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(s) || /^[0-9]{10}$/.test(s)
}

/** ESIC number (India Employees' State Insurance): 17 digits. */
export function isValidEsic(v: string): boolean {
  return /^\d{17}$/.test(v.replace(/\D/g, ''))
}

/** PF UAN (India Universal Account Number): 12 digits. */
export function isValidUan(v: string): boolean {
  return /^\d{12}$/.test(v.replace(/\D/g, ''))
}

/** SWIFT / BIC: 6 letters (bank + country) + 2 alphanumerics, optional 3-char branch. */
export function isValidSwift(v: string): boolean {
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v.toUpperCase())
}

/** IBAN: 2-letter country + 2 check digits + BBAN, validated by the mod-97 rule. */
export function isValidIban(v: string): boolean {
  const s = v.replace(/\s/g, '').toUpperCase()
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false
  // Move the first 4 chars to the end, expand letters to numbers (A=10 … Z=35),
  // then take the long number mod 97 digit by digit (no big-int needed).
  const rearranged = s.slice(4) + s.slice(0, 4)
  let remainder = 0
  for (const ch of rearranged) {
    const chunk = ch >= 'A' && ch <= 'Z' ? String(ch.charCodeAt(0) - 55) : ch
    for (let i = 0; i < chunk.length; i++) {
      remainder = (remainder * 10 + (chunk.charCodeAt(i) - 48)) % 97
    }
  }
  return remainder === 1
}

/** Luhn (mod-10) — the checksum credit/debit card numbers (13–19 digits) carry. */
export function luhnValid(num: string): boolean {
  const s = num.replace(/\D/g, '')
  if (!/^\d{12,19}$/.test(s)) return false
  let sum = 0
  let alt = false
  for (let i = s.length - 1; i >= 0; i--) {
    let d = s.charCodeAt(i) - 48
    if (alt) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    alt = !alt
  }
  return sum % 10 === 0
}

/* ------------------------------------------------------------- format helpers */

const digitsOnly = (s: string) => s.replace(/\D/g, '')
const alnumUpper = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')

/** The built-in field formats. Extend or override by mutating this record. */
export const FIELD_FORMATS: Record<string, FieldFormat> = {
  aadhaar: {
    name: 'aadhaar',
    label: 'Aadhaar',
    validate: (v) => (isValidAadhaar(v) ? null : 'Enter a valid 12-digit Aadhaar number'),
    mask: (v) => digitsOnly(v).slice(0, 12).replace(/(\d{4})(?=\d)/g, '$1 '),
    normalize: (raw) => digitsOnly(raw).slice(0, 12),
    placeholder: '1234 5678 9012',
    inputMode: 'numeric',
    maxLength: 12,
  },
  pan: {
    name: 'pan',
    label: 'PAN',
    validate: (v) => (isValidPan(v) ? null : 'Enter a valid PAN (e.g. ABCDE1234F)'),
    mask: (v) => v.toUpperCase(),
    normalize: (raw) => alnumUpper(raw).slice(0, 10),
    placeholder: 'ABCDE1234F',
    inputMode: 'text',
    maxLength: 10,
  },
  gstin: {
    name: 'gstin',
    label: 'GSTIN',
    validate: (v) => (isValidGstin(v) ? null : 'Enter a valid 15-character GSTIN'),
    mask: (v) => v.toUpperCase(),
    normalize: (raw) => alnumUpper(raw).slice(0, 15),
    placeholder: '22AAAAA0000A1Z5',
    inputMode: 'text',
    maxLength: 15,
  },
  tan: {
    name: 'tan',
    label: 'TAN',
    validate: (v) =>
      /^[A-Z]{4}[0-9]{5}[A-Z]$/.test(v.toUpperCase()) ? null : 'Enter a valid TAN (e.g. ABCD12345E)',
    mask: (v) => v.toUpperCase(),
    normalize: (raw) => alnumUpper(raw).slice(0, 10),
    placeholder: 'ABCD12345E',
    inputMode: 'text',
    maxLength: 10,
  },
  ifsc: {
    name: 'ifsc',
    label: 'IFSC',
    validate: (v) => (isValidIfsc(v) ? null : 'Enter a valid 11-character IFSC code'),
    mask: (v) => v.toUpperCase(),
    normalize: (raw) => alnumUpper(raw).slice(0, 11),
    placeholder: 'HDFC0001234',
    inputMode: 'text',
    maxLength: 11,
  },
  email: {
    name: 'email',
    label: 'Email',
    validate: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Enter a valid email address'),
    normalize: (raw) => raw.trim(),
    placeholder: 'name@example.com',
    inputMode: 'email',
  },
  phone: {
    name: 'phone',
    label: 'Mobile (India)',
    validate: (v) =>
      /^(?:\+?91)?[6-9]\d{9}$/.test(v.replace(/[\s-]/g, '')) ? null : 'Enter a valid 10-digit mobile number',
    mask: (v) => {
      const d = v.replace(/[\s-]/g, '').replace(/^\+?91/, '')
      return d.length === 10 ? d.replace(/(\d{5})(\d{5})/, '$1 $2') : v
    },
    normalize: (raw) => raw.replace(/[^\d+]/g, '').slice(0, 13),
    placeholder: '98765 43210',
    inputMode: 'tel',
    maxLength: 13,
  },
  pincode: {
    name: 'pincode',
    label: 'PIN code (India)',
    validate: (v) => (/^[1-9]\d{5}$/.test(digitsOnly(v)) ? null : 'Enter a valid 6-digit PIN code'),
    normalize: (raw) => digitsOnly(raw).slice(0, 6),
    placeholder: '560001',
    inputMode: 'numeric',
    maxLength: 6,
  },
  url: {
    name: 'url',
    label: 'URL',
    validate: (v) => {
      try {
        new URL(/^https?:\/\//i.test(v) ? v : 'https://' + v)
        return null
      } catch {
        return 'Enter a valid URL'
      }
    },
    normalize: (raw) => raw.trim(),
    placeholder: 'https://example.com',
    inputMode: 'url',
  },
  upi: {
    name: 'upi',
    label: 'UPI ID',
    validate: (v) =>
      /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(v) ? null : 'Enter a valid UPI ID (name@bank)',
    normalize: (raw) => raw.trim().toLowerCase(),
    placeholder: 'name@bank',
    inputMode: 'text',
  },
  passport: {
    name: 'passport',
    label: 'Passport (India)',
    validate: (v) => (isValidPassport(v) ? null : 'Enter a valid passport number (e.g. A1234567)'),
    mask: (v) => v.toUpperCase(),
    normalize: (raw) => alnumUpper(raw).slice(0, 8),
    placeholder: 'A1234567',
    inputMode: 'text',
    maxLength: 8,
  },
  iec: {
    name: 'iec',
    label: 'IEC (Import-Export Code)',
    validate: (v) => (isValidIec(v) ? null : 'Enter a valid 10-character IEC'),
    mask: (v) => v.toUpperCase(),
    normalize: (raw) => alnumUpper(raw).slice(0, 10),
    placeholder: 'ABCDE1234F',
    inputMode: 'text',
    maxLength: 10,
  },
  esic: {
    name: 'esic',
    label: 'ESIC number',
    validate: (v) => (isValidEsic(v) ? null : 'Enter a valid 17-digit ESIC number'),
    normalize: (raw) => digitsOnly(raw).slice(0, 17),
    placeholder: '31001234567890123',
    inputMode: 'numeric',
    maxLength: 17,
  },
  pf: {
    name: 'pf',
    label: 'PF UAN',
    validate: (v) => (isValidUan(v) ? null : 'Enter a valid 12-digit UAN'),
    normalize: (raw) => digitsOnly(raw).slice(0, 12),
    placeholder: '100234567890',
    inputMode: 'numeric',
    maxLength: 12,
  },
  iban: {
    name: 'iban',
    label: 'IBAN',
    validate: (v) => (isValidIban(v) ? null : 'Enter a valid IBAN'),
    mask: (v) => v.toUpperCase().replace(/\s/g, '').replace(/(.{4})(?=.)/g, '$1 '),
    normalize: (raw) => alnumUpper(raw).slice(0, 34),
    placeholder: 'DE89 3704 0044 0532 0130 00',
    inputMode: 'text',
    maxLength: 34,
  },
  swift: {
    name: 'swift',
    label: 'SWIFT / BIC',
    validate: (v) => (isValidSwift(v) ? null : 'Enter a valid 8- or 11-character SWIFT/BIC'),
    mask: (v) => v.toUpperCase(),
    normalize: (raw) => alnumUpper(raw).slice(0, 11),
    placeholder: 'DEUTDEFF',
    inputMode: 'text',
    maxLength: 11,
  },
  creditCard: {
    name: 'creditCard',
    label: 'Card (Luhn)',
    validate: (v) => (luhnValid(v) ? null : 'Enter a valid card number'),
    mask: (v) => digitsOnly(v).replace(/(\d{4})(?=\d)/g, '$1 '),
    normalize: (raw) => digitsOnly(raw).slice(0, 19),
    placeholder: '4111 1111 1111 1111',
    inputMode: 'numeric',
    maxLength: 19,
  },
}

/** Identity helper for authoring a custom format with inference + a stable ref. */
export function defineFieldFormat(fmt: FieldFormat): FieldFormat {
  return fmt
}

/**
 * Resolve a `cellMeta.pattern` value to a {@link FieldFormat}: a built-in name, a
 * `RegExp` (+ optional message), or a format object. Unknown names → `null`.
 */
export function resolveFieldFormat(
  pattern: unknown,
  patternMessage?: string,
): FieldFormat | null {
  if (pattern == null || pattern === '') return null
  if (typeof pattern === 'string') return FIELD_FORMATS[pattern] ?? null
  if (pattern instanceof RegExp) {
    const re = pattern
    return {
      name: 'custom',
      label: 'Pattern',
      validate: (v) => (re.test(v) ? null : patternMessage ?? 'Invalid format'),
    }
  }
  if (typeof pattern === 'object') return pattern as FieldFormat
  return null
}
