import { useState, useCallback, useRef } from 'react'

export type SaveMode = 'immediate' | 'explicit'

export type DirtyCellMap = Record<string, Record<number, Record<string, unknown>>>
export type ValidationErrorMap = Record<string, Record<number, Record<string, string>>>

// Per-table view state for filter/sort/pagination persistence
export type TableViewState = {
  sortModel: Array<{ colId: string; sort: 'asc' | 'desc' }>
  filterModel: Record<string, unknown>
  page: number
}

export function useAppStore() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [saveMode, setSaveMode] = useState<SaveMode>('immediate')
  const [dirtyMap, setDirtyMap] = useState<DirtyCellMap>({})
  const [errorMap, setErrorMap] = useState<ValidationErrorMap>({})
  const viewStatesRef = useRef<Record<string, TableViewState>>({})

  const stageDirtyCell = useCallback((table: string, rowId: number, col: string, value: unknown) => {
    setDirtyMap(prev => ({
      ...prev,
      [table]: {
        ...prev[table],
        [rowId]: {
          ...prev[table]?.[rowId],
          [col]: value,
        },
      },
    }))
  }, [])

  const clearDirtyCell = useCallback((table: string, rowId: number, col: string) => {
    setDirtyMap(prev => {
      const tableMap = { ...prev[table] }
      if (tableMap[rowId]) {
        const rowMap = { ...tableMap[rowId] }
        delete rowMap[col]
        if (Object.keys(rowMap).length === 0) {
          delete tableMap[rowId]
        } else {
          tableMap[rowId] = rowMap
        }
      }
      return { ...prev, [table]: tableMap }
    })
  }, [])

  const clearDirtyTable = useCallback((table: string) => {
    setDirtyMap(prev => {
      const next = { ...prev }
      delete next[table]
      return next
    })
  }, [])

  const setValidationError = useCallback((table: string, rowId: number, col: string, msg: string) => {
    setErrorMap(prev => ({
      ...prev,
      [table]: {
        ...prev[table],
        [rowId]: {
          ...prev[table]?.[rowId],
          [col]: msg,
        },
      },
    }))
  }, [])

  const clearValidationError = useCallback((table: string, rowId: number, col: string) => {
    setErrorMap(prev => {
      const tableMap = { ...prev[table] }
      if (tableMap[rowId]) {
        const rowMap = { ...tableMap[rowId] }
        delete rowMap[col]
        if (Object.keys(rowMap).length === 0) {
          delete tableMap[rowId]
        } else {
          tableMap[rowId] = rowMap
        }
      }
      return { ...prev, [table]: tableMap }
    })
  }, [])

  const clearValidationErrorsForTable = useCallback((table: string) => {
    setErrorMap(prev => {
      const next = { ...prev }
      delete next[table]
      return next
    })
  }, [])

  const getDirtyCount = useCallback((table: string) => {
    const tableMap = dirtyMap[table]
    if (!tableMap) return 0
    let count = 0
    for (const rowId of Object.keys(tableMap)) {
      count += Object.keys(tableMap[Number(rowId)]).length
    }
    return count
  }, [dirtyMap])

  const hasDirtyChanges = useCallback((table: string) => {
    return getDirtyCount(table) > 0
  }, [getDirtyCount])

  const getViewState = useCallback((table: string): TableViewState => {
    if (!viewStatesRef.current[table]) {
      viewStatesRef.current[table] = { sortModel: [], filterModel: {}, page: 0 }
    }
    return viewStatesRef.current[table]
  }, [])

  const setViewState = useCallback((table: string, state: Partial<TableViewState>) => {
    viewStatesRef.current[table] = { ...getViewState(table), ...state }
  }, [getViewState])

  return {
    selectedTable,
    setSelectedTable,
    saveMode,
    setSaveMode,
    dirtyMap,
    stageDirtyCell,
    clearDirtyCell,
    clearDirtyTable,
    errorMap,
    setValidationError,
    clearValidationError,
    clearValidationErrorsForTable,
    getDirtyCount,
    hasDirtyChanges,
    getViewState,
    setViewState,
  }
}

export type AppStore = ReturnType<typeof useAppStore>
