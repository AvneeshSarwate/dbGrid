import { describe, it, expect } from 'vitest'
import { parseNumber, parseJson, numberValue, nullableNumberValue, jsonValue, nullableJsonValue } from './validation.js'

describe('parseNumber', () => {
  it('parses integers', () => {
    expect(parseNumber('42')).toEqual({ ok: true, value: 42 })
  })
  it('parses decimals', () => {
    expect(parseNumber('3.14')).toEqual({ ok: true, value: 3.14 })
  })
  it('parses negatives', () => {
    expect(parseNumber('-7.5')).toEqual({ ok: true, value: -7.5 })
  })
  it('parses scientific notation', () => {
    expect(parseNumber('1e3')).toEqual({ ok: true, value: 1000 })
    expect(parseNumber('2.5e-1')).toEqual({ ok: true, value: 0.25 })
  })
  it('rejects empty string', () => {
    expect(parseNumber('')).toEqual({ ok: false, error: 'Required' })
  })
  it('rejects non-numeric', () => {
    expect(parseNumber('abc')).toEqual({ ok: false, error: 'Invalid number' })
  })
  it('rejects Infinity', () => {
    expect(parseNumber('Infinity')).toEqual({ ok: false, error: 'Invalid number' })
  })
})

describe('parseJson', () => {
  it('parses valid JSON object', () => {
    expect(parseJson('{"a":1}')).toEqual({ ok: true, value: { a: 1 } })
  })
  it('parses valid JSON array', () => {
    expect(parseJson('[1,2]')).toEqual({ ok: true, value: [1, 2] })
  })
  it('rejects empty string', () => {
    expect(parseJson('')).toEqual({ ok: false, error: 'Required' })
  })
  it('rejects invalid JSON', () => {
    expect(parseJson('{bad')).toEqual({ ok: false, error: 'Invalid JSON' })
  })
})

describe('numberValue (Zod)', () => {
  it('passes through numbers', () => {
    expect(numberValue.parse(42)).toBe(42)
  })
  it('parses string to number', () => {
    expect(numberValue.parse('3.14')).toBe(3.14)
  })
  it('rejects empty string', () => {
    expect(() => numberValue.parse('')).toThrow()
  })
  it('rejects non-numeric string', () => {
    expect(() => numberValue.parse('abc')).toThrow()
  })
})

describe('nullableNumberValue (Zod)', () => {
  it('returns null for empty string', () => {
    expect(nullableNumberValue.parse('')).toBeNull()
  })
  it('returns null for null', () => {
    expect(nullableNumberValue.parse(null)).toBeNull()
  })
  it('parses valid number string', () => {
    expect(nullableNumberValue.parse('42')).toBe(42)
  })
})

describe('jsonValue (Zod)', () => {
  it('passes through objects', () => {
    expect(jsonValue.parse({ a: 1 })).toEqual({ a: 1 })
  })
  it('parses JSON string', () => {
    expect(jsonValue.parse('{"a":1}')).toEqual({ a: 1 })
  })
  it('rejects empty string', () => {
    expect(() => jsonValue.parse('')).toThrow()
  })
})

describe('nullableJsonValue (Zod)', () => {
  it('returns null for empty string', () => {
    expect(nullableJsonValue.parse('')).toBeNull()
  })
  it('returns null for null', () => {
    expect(nullableJsonValue.parse(null)).toBeNull()
  })
  it('parses JSON string', () => {
    expect(nullableJsonValue.parse('{"a":1}')).toEqual({ a: 1 })
  })
})
