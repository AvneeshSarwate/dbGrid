import type { ApiResponse, TableSummary, TableMeta, RowData } from '@dbgrid/shared'

const BASE = '/api'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const body = (await res.json()) as ApiResponse<T>
  if (!body.ok) {
    const err = new Error(body.error.message) as Error & { code: string; fieldErrors?: Record<string, string> }
    err.code = body.error.code
    err.fieldErrors = body.error.fieldErrors
    throw err
  }
  return body.data
}

export const api = {
  getTables: () => request<TableSummary[]>('/tables'),

  getTableMeta: (tableName: string) => request<TableMeta>(`/tables/${tableName}/meta`),

  getRows: (tableName: string) => request<RowData[]>(`/tables/${tableName}/rows`),

  createRow: (tableName: string, data: Record<string, unknown>) =>
    request<RowData>(`/tables/${tableName}/rows`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateRow: (tableName: string, id: number, data: Record<string, unknown>) =>
    request<RowData>(`/tables/${tableName}/rows/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteRow: (tableName: string, id: number) =>
    request<{ deleted: boolean }>(`/tables/${tableName}/rows/${id}`, {
      method: 'DELETE',
    }),
}
