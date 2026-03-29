import { z } from 'zod'

/**
 * Zod schema for number fields - accepts decimals, negatives, scientific notation.
 * Validates on commit, not per-keystroke.
 */
export const numberValue = z.union([
  z.number(),
  z.string().transform((val, ctx) => {
    const trimmed = val.trim()
    if (trimmed === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Required' })
      return z.NEVER
    }
    const num = Number(trimmed)
    if (!Number.isFinite(num)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid number' })
      return z.NEVER
    }
    return num
  }),
])

export const nullableNumberValue = z.union([
  z.null(),
  z.number(),
  z.string().transform((val, ctx) => {
    const trimmed = val.trim()
    if (trimmed === '') return null
    const num = Number(trimmed)
    if (!Number.isFinite(num)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid number' })
      return z.NEVER
    }
    return num
  }),
])

/**
 * Zod schema for JSON fields - validates JSON.parse on commit.
 */
export const jsonValue = z.union([
  z.record(z.unknown()),
  z.array(z.unknown()),
  z.string().transform((val, ctx) => {
    const trimmed = val.trim()
    if (trimmed === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Required' })
      return z.NEVER
    }
    try {
      return JSON.parse(trimmed) as unknown
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid JSON' })
      return z.NEVER
    }
  }),
])

export const nullableJsonValue = z.union([
  z.null(),
  z.record(z.unknown()),
  z.array(z.unknown()),
  z.string().transform((val, ctx) => {
    const trimmed = val.trim()
    if (trimmed === '') return null
    try {
      return JSON.parse(trimmed) as unknown
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid JSON' })
      return z.NEVER
    }
  }),
])

export const stringValue = z.string().min(1, 'Required')
export const nullableStringValue = z.string().nullable().transform(v => (v === '' ? null : v))

/**
 * Parse a number from string input. Returns the number or an error message.
 */
export function parseNumber(input: string): { ok: true; value: number } | { ok: false; error: string } {
  const trimmed = input.trim()
  if (trimmed === '') return { ok: false, error: 'Required' }
  const num = Number(trimmed)
  if (!Number.isFinite(num)) return { ok: false, error: 'Invalid number' }
  return { ok: true, value: num }
}

/**
 * Parse JSON from string input. Returns the parsed value or an error message.
 */
export function parseJson(input: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = input.trim()
  if (trimmed === '') return { ok: false, error: 'Required' }
  try {
    return { ok: true, value: JSON.parse(trimmed) }
  } catch {
    return { ok: false, error: 'Invalid JSON' }
  }
}
