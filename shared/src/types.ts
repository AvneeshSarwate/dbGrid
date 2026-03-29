export type ColumnKind = 'string' | 'number' | 'json'

export type ColumnMeta = {
  name: string
  label: string
  kind: ColumnKind
  nullable: boolean
  editable: boolean
  width?: number
}

export type TableMeta = {
  name: string
  label: string
  primaryKey: 'id'
  columns: ColumnMeta[]
}

export type TableSummary = {
  name: string
  label: string
  columns: Array<{ name: string; kind: ColumnKind; nullable: boolean }>
}

// API envelope types
export type ApiSuccess<T> = { ok: true; data: T }
export type ApiError = {
  ok: false
  error: {
    code: string
    message: string
    fieldErrors?: Record<string, string>
  }
}
export type ApiResponse<T> = ApiSuccess<T> | ApiError

// Grid query DTO (future-compatible for server-side ops)
export type SortItem = { col: string; dir: 'asc' | 'desc' }

export type GridQuery = {
  page?: number
  pageSize?: number
  sort?: SortItem[]
  filters?: Record<string, unknown>
}

// Row types
export type RowData = Record<string, unknown> & { id: number }
