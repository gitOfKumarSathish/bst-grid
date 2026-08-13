import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import * as React from 'react'
import {
  useBstTable,
  BstTable,
  FIELD_FORMATS,
  resolveFieldFormat,
  verhoeffValid,
  verhoeffChecksum,
  isValidAadhaar,
  isValidPan,
  isValidGstin,
  gstinCheckDigit,
  isValidIfsc,
  isValidPassport,
  isValidIec,
  isValidEsic,
  isValidUan,
  isValidSwift,
  isValidIban,
  luhnValid,
} from '../index'
import type { BstTableColumn } from '../index'

/* ------------------------------------------------------------ checksum helpers */

describe('Verhoeff (Aadhaar checksum)', () => {
  test('a payload + its check digit validates; a tampered digit does not', () => {
    for (const body of ['23456789012', '99887766554', '71234567890']) {
      const full = body + verhoeffChecksum(body)
      expect(full).toHaveLength(12)
      expect(verhoeffValid(full)).toBe(true)
      // flip the last digit → must fail (proves it's a real checksum, not a no-op)
      const bad = full.slice(0, -1) + ((Number(full.slice(-1)) + 1) % 10)
      expect(verhoeffValid(bad)).toBe(false)
    }
  })

  test('isValidAadhaar enforces 12 digits, first 2–9, and the checksum', () => {
    const valid = '23456789012' + verhoeffChecksum('23456789012')
    expect(isValidAadhaar(valid)).toBe(true)
    expect(isValidAadhaar(valid.replace(/\d{4}/, '$& ').replace(/(\d)(\d{3})/, '$1 $2'))).toBe(
      isValidAadhaar(valid),
    ) // spaces are stripped before validating
    expect(isValidAadhaar('1' + valid.slice(1))).toBe(false) // first digit 1
    expect(isValidAadhaar(valid.slice(0, 11))).toBe(false) // 11 digits
    expect(isValidAadhaar('2345 6789 0124')).toBe(isValidAadhaar('234567890124')) // whitespace-agnostic
  })
})

describe('GSTIN checksum + structure', () => {
  test('a known valid GSTIN passes; a tampered one fails', () => {
    expect(isValidGstin('27AAPFU0939F1ZV')).toBe(true) // published sample
    expect(isValidGstin('27AAPFU0939F1ZX')).toBe(false) // wrong check digit
    expect(isValidGstin('27AAPFU0939F1Z')).toBe(false) // 14 chars (too short)
  })

  test('gstinCheckDigit round-trips', () => {
    const first14 = '27AAPFU0939F1Z'
    expect(isValidGstin(first14 + gstinCheckDigit(first14))).toBe(true)
  })
})

describe('structural validators', () => {
  test('PAN', () => {
    expect(isValidPan('ABCDE1234F')).toBe(true)
    expect(isValidPan('abcde1234f')).toBe(true) // case-insensitive
    expect(isValidPan('ABCD1234F')).toBe(false) // 9 chars
    expect(isValidPan('ABCDE12345')).toBe(false) // ends with a digit
  })
  test('IFSC', () => {
    expect(isValidIfsc('HDFC0001234')).toBe(true)
    expect(isValidIfsc('HDFC1001234')).toBe(false) // 5th char must be 0
    expect(isValidIfsc('HDF0001234')).toBe(false) // too short
  })
  test('Passport (India)', () => {
    expect(isValidPassport('A1234567')).toBe(true)
    expect(isValidPassport('a1234567')).toBe(true) // case-insensitive
    expect(isValidPassport('AB123456')).toBe(false) // two letters
    expect(isValidPassport('12345678')).toBe(false) // no leading letter
  })
  test('IEC (PAN-format or legacy 10-digit)', () => {
    expect(isValidIec('ABCDE1234F')).toBe(true) // PAN-format (current)
    expect(isValidIec('1234567890')).toBe(true) // legacy 10-digit
    expect(isValidIec('ABCDE1234')).toBe(false) // 9 chars
  })
  test('ESIC (17 digits) + PF UAN (12 digits)', () => {
    expect(isValidEsic('31001234567890123')).toBe(true)
    expect(isValidEsic('3100123456789012')).toBe(false) // 16 digits
    expect(isValidUan('100234567890')).toBe(true)
    expect(isValidUan('10023456789')).toBe(false) // 11 digits
  })
  test('SWIFT / BIC (8 or 11)', () => {
    expect(isValidSwift('DEUTDEFF')).toBe(true) // 8
    expect(isValidSwift('DEUTDEFF500')).toBe(true) // 11 (branch)
    expect(isValidSwift('DEUTDE')).toBe(false) // too short
    expect(isValidSwift('DEUT12FF')).toBe(false) // country code must be letters
  })
})

describe('IBAN (mod-97) + Luhn checksums', () => {
  test('IBAN: known valid pass, tampered fail', () => {
    expect(isValidIban('DE89370400440532013000')).toBe(true) // Germany
    expect(isValidIban('GB29NWBK60161331926819')).toBe(true) // UK
    expect(isValidIban('DE89 3704 0044 0532 0130 00')).toBe(true) // spaces stripped
    expect(isValidIban('DE89370400440532013001')).toBe(false) // wrong check
    expect(isValidIban('ZZ00NOTANIBANVALUE00')).toBe(false)
  })
  test('Luhn: known valid card pass, tampered fail', () => {
    expect(luhnValid('4111111111111111')).toBe(true) // Visa test
    expect(luhnValid('5500005555555559')).toBe(true) // MasterCard test
    expect(luhnValid('4111 1111 1111 1111')).toBe(true) // separators ignored
    expect(luhnValid('4111111111111112')).toBe(false) // last digit off by one
    expect(luhnValid('123')).toBe(false) // too short
  })
})

describe('FIELD_FORMATS presets', () => {
  const ok = (name: string, v: string) => FIELD_FORMATS[name].validate!(v) == null
  test('email / phone / pincode / url / upi accept valid + reject invalid', () => {
    expect(ok('email', 'a@b.co')).toBe(true)
    expect(ok('email', 'a@b')).toBe(false)
    expect(ok('phone', '9876543210')).toBe(true)
    expect(ok('phone', '1234567890')).toBe(false) // must start 6–9
    expect(ok('pincode', '560001')).toBe(true)
    expect(ok('pincode', '060001')).toBe(false) // can't start 0
    expect(ok('url', 'https://acme.io')).toBe(true)
    expect(ok('url', 'not a url')).toBe(false)
    expect(ok('upi', 'name@okhdfc')).toBe(true)
    expect(ok('upi', 'nobank')).toBe(false)
  })
  test('masks + normalize', () => {
    expect(FIELD_FORMATS.aadhaar.mask!('234567890124')).toBe('2345 6789 0124')
    expect(FIELD_FORMATS.aadhaar.normalize!('2345-6789-0124x')).toBe('234567890124')
    expect(FIELD_FORMATS.pan.normalize!('abcde1234f')).toBe('ABCDE1234F')
    expect(FIELD_FORMATS.phone.mask!('9876543210')).toBe('98765 43210')
  })
  test('resolveFieldFormat: name, RegExp, and unknown', () => {
    expect(resolveFieldFormat('pan')).toBe(FIELD_FORMATS.pan)
    expect(resolveFieldFormat('nope')).toBeNull()
    const re = resolveFieldFormat(/^X\d+$/, 'Need X then digits')!
    expect(re.validate!('X12')).toBeNull()
    expect(re.validate!('Y12')).toBe('Need X then digits')
  })
})

/* ---------------------------------------------------------- grid integration */

type Row = { id: string; pan: string; aadhaar: number | null }
const validAadhaar = Number('23456789012' + verhoeffChecksum('23456789012'))
const seed: Row[] = [{ id: '1', pan: 'ABCDE1234F', aadhaar: validAadhaar }]
const columns: BstTableColumn<Row>[] = [
  { id: 'pan', accessorKey: 'pan', header: 'PAN', meta: { type: 'text', editable: true, cellMeta: { pattern: 'pan' } } },
  { id: 'aadhaar', accessorKey: 'aadhaar', header: 'Aadhaar', meta: { type: 'number', editable: true, cellMeta: { pattern: 'aadhaar' } } },
]

function Grid() {
  const [data, setData] = React.useState<Row[]>(seed)
  const table = useBstTable<Row>({
    data, columns, getRowId: (r) => r.id,
    enableEditing: true, enableValidation: true,
    onDataChange: setData,
  })
  return (
    <div className="bst-table-root">
      <BstTable table={table} />
      <pre data-testid="data">{JSON.stringify(data)}</pre>
    </div>
  )
}
const dataJson = () => JSON.parse(screen.getByTestId('data').textContent || '[]') as Row[]
const rows = () => screen.getAllByRole('row').slice(1)

describe('patterned cells in a grid (B1/B2)', () => {
  test('Aadhaar number cell masks its display', () => {
    render(<Grid />)
    expect(within(rows()[0]).getByText('2345 6789 0124')).toBeInTheDocument()
  })

  test('PAN cell: normalizes input to uppercase and blocks an invalid commit', () => {
    render(<Grid />)
    fireEvent.doubleClick(within(rows()[0]).getByText('ABCDE1234F'))
    const input = screen.getByDisplayValue('ABCDE1234F') as HTMLInputElement

    // lowercase input is normalized to uppercase as the user types
    fireEvent.change(input, { target: { value: 'zzzz' } })
    expect(input.value).toBe('ZZZZ')

    // an invalid PAN blocks the commit (blockCommitOnError) + shows the error
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(dataJson()[0].pan).toBe('ABCDE1234F') // unchanged
    expect(screen.getByText('Enter a valid PAN (e.g. ABCDE1234F)')).toBeInTheDocument()
  })

  test('PAN cell: a valid value commits', () => {
    render(<Grid />)
    fireEvent.doubleClick(within(rows()[0]).getByText('ABCDE1234F'))
    const input = screen.getByDisplayValue('ABCDE1234F') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'pqrsx6789z' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(dataJson()[0].pan).toBe('PQRSX6789Z')
  })
})
