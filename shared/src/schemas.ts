import { z } from 'zod'
import {
  numberValue, nullableNumberValue,
  jsonValue, nullableJsonValue,
  stringValue, nullableStringValue,
} from './validation.js'

// ── Products ──────────────────────────────────────────────

export const productCreateSchema = z.object({
  name: stringValue,
  sku: stringValue,
  price: numberValue,
  discountRate: nullableNumberValue.optional().default(null),
  metadata: nullableJsonValue.optional().default(null),
})

export const productUpdateSchema = z.object({
  name: stringValue.optional(),
  sku: stringValue.optional(),
  price: numberValue.optional(),
  discountRate: nullableNumberValue.optional(),
  metadata: nullableJsonValue.optional(),
})

export type ProductCreate = z.infer<typeof productCreateSchema>
export type ProductUpdate = z.infer<typeof productUpdateSchema>

// ── Wide Metrics ──────────────────────────────────────────

export const wideMetricsCreateSchema = z.object({
  label: stringValue,
  region: stringValue,
  category: stringValue,
  metric1: numberValue,
  metric2: numberValue,
  metric3: numberValue,
  metric4: numberValue,
  metric5: numberValue,
  metric6: numberValue,
  optionalMetric1: nullableNumberValue.optional().default(null),
  optionalMetric2: nullableNumberValue.optional().default(null),
  tags: nullableJsonValue.optional().default(null),
})

export const wideMetricsUpdateSchema = z.object({
  label: stringValue.optional(),
  region: stringValue.optional(),
  category: stringValue.optional(),
  metric1: numberValue.optional(),
  metric2: numberValue.optional(),
  metric3: numberValue.optional(),
  metric4: numberValue.optional(),
  metric5: numberValue.optional(),
  metric6: numberValue.optional(),
  optionalMetric1: nullableNumberValue.optional(),
  optionalMetric2: nullableNumberValue.optional(),
  tags: nullableJsonValue.optional(),
})

export type WideMetricsCreate = z.infer<typeof wideMetricsCreateSchema>
export type WideMetricsUpdate = z.infer<typeof wideMetricsUpdateSchema>

// ── JSON Documents ────────────────────────────────────────

export const jsonDocumentsCreateSchema = z.object({
  title: stringValue,
  category: stringValue,
  version: numberValue,
  payload: jsonValue,
  notes: nullableJsonValue.optional().default(null),
})

export const jsonDocumentsUpdateSchema = z.object({
  title: stringValue.optional(),
  category: stringValue.optional(),
  version: numberValue.optional(),
  payload: jsonValue.optional(),
  notes: nullableJsonValue.optional(),
})

export type JsonDocumentsCreate = z.infer<typeof jsonDocumentsCreateSchema>
export type JsonDocumentsUpdate = z.infer<typeof jsonDocumentsUpdateSchema>

// ── Schema registry (maps table name -> create/update schemas) ──

export const createSchemas: Record<string, z.ZodTypeAny> = {
  products: productCreateSchema,
  wide_metrics: wideMetricsCreateSchema,
  json_documents: jsonDocumentsCreateSchema,
}

export const updateSchemas: Record<string, z.ZodTypeAny> = {
  products: productUpdateSchema,
  wide_metrics: wideMetricsUpdateSchema,
  json_documents: jsonDocumentsUpdateSchema,
}
