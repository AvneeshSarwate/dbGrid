import type { TableMeta, TableSummary } from './types.js'

export const tableRegistry: TableMeta[] = [
  {
    name: 'products',
    label: 'Products',
    primaryKey: 'id',
    columns: [
      { name: 'id', label: 'ID', kind: 'number', nullable: false, editable: false, width: 80 },
      { name: 'name', label: 'Name', kind: 'string', nullable: false, editable: true, width: 180 },
      { name: 'sku', label: 'SKU', kind: 'string', nullable: false, editable: true, width: 140 },
      { name: 'price', label: 'Price', kind: 'number', nullable: false, editable: true, width: 120 },
      { name: 'discountRate', label: 'Discount Rate', kind: 'number', nullable: true, editable: true, width: 130 },
      { name: 'metadata', label: 'Metadata', kind: 'json', nullable: true, editable: true, width: 250 },
    ],
  },
  {
    name: 'wide_metrics',
    label: 'Wide Metrics',
    primaryKey: 'id',
    columns: [
      { name: 'id', label: 'ID', kind: 'number', nullable: false, editable: false, width: 80 },
      { name: 'label', label: 'Label', kind: 'string', nullable: false, editable: true, width: 150 },
      { name: 'region', label: 'Region', kind: 'string', nullable: false, editable: true, width: 120 },
      { name: 'category', label: 'Category', kind: 'string', nullable: false, editable: true, width: 120 },
      { name: 'metric1', label: 'Metric 1', kind: 'number', nullable: false, editable: true, width: 100 },
      { name: 'metric2', label: 'Metric 2', kind: 'number', nullable: false, editable: true, width: 100 },
      { name: 'metric3', label: 'Metric 3', kind: 'number', nullable: false, editable: true, width: 100 },
      { name: 'metric4', label: 'Metric 4', kind: 'number', nullable: false, editable: true, width: 100 },
      { name: 'metric5', label: 'Metric 5', kind: 'number', nullable: false, editable: true, width: 100 },
      { name: 'metric6', label: 'Metric 6', kind: 'number', nullable: false, editable: true, width: 100 },
      { name: 'optionalMetric1', label: 'Opt Metric 1', kind: 'number', nullable: true, editable: true, width: 110 },
      { name: 'optionalMetric2', label: 'Opt Metric 2', kind: 'number', nullable: true, editable: true, width: 110 },
      { name: 'tags', label: 'Tags', kind: 'json', nullable: true, editable: true, width: 250 },
    ],
  },
  {
    name: 'json_documents',
    label: 'JSON Documents',
    primaryKey: 'id',
    columns: [
      { name: 'id', label: 'ID', kind: 'number', nullable: false, editable: false, width: 80 },
      { name: 'title', label: 'Title', kind: 'string', nullable: false, editable: true, width: 200 },
      { name: 'category', label: 'Category', kind: 'string', nullable: false, editable: true, width: 140 },
      { name: 'version', label: 'Version', kind: 'number', nullable: false, editable: true, width: 100 },
      { name: 'payload', label: 'Payload', kind: 'json', nullable: false, editable: true, width: 300 },
      { name: 'notes', label: 'Notes', kind: 'json', nullable: true, editable: true, width: 250 },
    ],
  },
]

export function getTableMeta(tableName: string): TableMeta | undefined {
  return tableRegistry.find(t => t.name === tableName)
}

export function getTableSummaries(): TableSummary[] {
  return tableRegistry.map(t => ({
    name: t.name,
    label: t.label,
    columns: t.columns.map(c => ({ name: c.name, kind: c.kind, nullable: c.nullable })),
  }))
}
