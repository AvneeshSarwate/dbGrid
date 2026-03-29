import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { TableSummary, TableMeta, RowData } from '@dbgrid/shared'
import { api } from './api.js'

export function useTablesQuery() {
  return useQuery<TableSummary[]>({
    queryKey: ['tables'],
    queryFn: api.getTables,
  })
}

export function useTableMetaQuery(tableName: string | null) {
  return useQuery<TableMeta>({
    queryKey: ['tableMeta', tableName],
    queryFn: () => api.getTableMeta(tableName!),
    enabled: !!tableName,
  })
}

export function useTableRowsQuery(tableName: string | null) {
  return useQuery<RowData[]>({
    queryKey: ['tableRows', tableName],
    queryFn: () => api.getRows(tableName!),
    enabled: !!tableName,
  })
}

export function useCreateRowMutation(tableName: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createRow(tableName, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tableRows', tableName] })
    },
  })
}

export function useUpdateRowMutation(tableName: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.updateRow(tableName, id, data),
    onSuccess: (_data, variables) => {
      // Optimistically update cache
      queryClient.setQueryData<RowData[]>(['tableRows', tableName], (old) => {
        if (!old) return old
        return old.map(row => (row.id === variables.id ? { ...row, ...variables.data } : row))
      })
    },
  })
}

export function useDeleteRowMutation(tableName: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteRow(tableName, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tableRows', tableName] })
    },
  })
}
