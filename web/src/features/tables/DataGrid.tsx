import { useMemo, useCallback, useRef, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { themeAlpine } from 'ag-grid-community'
import type { ColDef, CellValueChangedEvent, ICellRendererParams, SortChangedEvent, FilterChangedEvent, GridReadyEvent } from 'ag-grid-community'
import type { TableMeta, ColumnMeta, RowData } from '@dbgrid/shared'
import { parseNumber } from '@dbgrid/shared'
import type { AppStore } from '../../lib/store.js'
import { JsonEditModal } from '../../components/JsonEditModal.js'
import { ConfirmDialog } from '../../components/ConfirmDialog.js'
import toast from 'react-hot-toast'

type Props = {
  tableMeta: TableMeta
  rows: RowData[]
  store: AppStore
  onImmediateSave: (rowId: number, colName: string, value: unknown) => Promise<void>
  onDeleteRow: (rowId: number) => void
}

// JSON cell renderer - compact preview
function JsonCellRenderer(params: ICellRendererParams) {
  const val = params.value
  if (val == null) return <span className="null-value">null</span>
  const str = typeof val === 'string' ? val : JSON.stringify(val)
  const truncated = str.length > 60 ? str.slice(0, 57) + '...' : str
  return <span className="json-preview" title={str}>{truncated}</span>
}

export function DataGrid({ tableMeta, rows, store, onImmediateSave, onDeleteRow }: Props) {
  const gridRef = useRef<AgGridReact>(null)
  const [jsonEditState, setJsonEditState] = useState<{ open: boolean; rowId: number; col: ColumnMeta; value: unknown }>({
    open: false, rowId: 0, col: null as unknown as ColumnMeta, value: null,
  })
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; rowId: number }>({ open: false, rowId: 0 })

  const tableName = tableMeta.name

  // Build column definitions from TableMeta
  const columnDefs = useMemo<ColDef[]>(() => {
    const cols: ColDef[] = tableMeta.columns.map(col => {
      const def: ColDef = {
        field: col.name,
        headerName: col.label,
        width: col.width,
        editable: col.editable && col.kind !== 'json',
        sortable: true,
        filter: col.kind === 'number' ? 'agNumberColumnFilter' : col.kind === 'string' ? 'agTextColumnFilter' : false,
        cellClassRules: {
          'cell-dirty': (params) => {
            const dirty = store.dirtyMap[tableName]
            return !!dirty?.[params.data?.id]?.[col.name]
          },
          'cell-error': (params) => {
            const errors = store.errorMap[tableName]
            return !!errors?.[params.data?.id]?.[col.name]
          },
        },
      }

      if (col.kind === 'json') {
        def.cellRenderer = JsonCellRenderer
        def.onCellClicked = (params) => {
          if (!col.editable) return
          setJsonEditState({
            open: true,
            rowId: params.data.id,
            col,
            value: params.value,
          })
        }
      }

      if (col.kind === 'number') {
        def.valueFormatter = (params) => {
          if (params.value == null) return 'null'
          return String(params.value)
        }
      }

      if (col.nullable && col.kind === 'string') {
        def.valueFormatter = (params) => {
          if (params.value == null) return 'null'
          return params.value
        }
      }

      return def
    })

    // Delete action column
    cols.push({
      headerName: '',
      width: 70,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams) => (
        <button
          className="btn-delete-row"
          onClick={() => setDeleteConfirm({ open: true, rowId: params.data.id })}
          title="Delete row"
        >
          ✕
        </button>
      ),
    })

    return cols
  }, [tableMeta, store.dirtyMap, store.errorMap, tableName])

  // Merge dirty values into row data for display
  const rowData = useMemo(() => {
    const dirtyTable = store.dirtyMap[tableName]
    if (!dirtyTable || store.saveMode !== 'explicit') return rows
    return rows.map(row => {
      const dirtyRow = dirtyTable[row.id]
      if (!dirtyRow) return row
      return { ...row, ...dirtyRow }
    })
  }, [rows, store.dirtyMap, tableName, store.saveMode])

  const onCellValueChanged = useCallback(async (event: CellValueChangedEvent) => {
    const colName = event.colDef.field!
    const rowId = event.data.id as number
    const newValue = event.newValue
    const colMeta = tableMeta.columns.find(c => c.name === colName)
    if (!colMeta) return

    // Validate based on column kind
    let finalValue: unknown = newValue

    if (colMeta.kind === 'number') {
      if (newValue === '' || newValue == null) {
        if (colMeta.nullable) {
          finalValue = null
        } else {
          store.setValidationError(tableName, rowId, colName, 'Required')
          toast.error(`${colMeta.label}: Required`)
          // Revert in the grid
          event.node.setDataValue(colName, event.oldValue)
          return
        }
      } else {
        const result = parseNumber(String(newValue))
        if (!result.ok) {
          store.setValidationError(tableName, rowId, colName, result.error)
          toast.error(`${colMeta.label}: ${result.error}`)
          event.node.setDataValue(colName, event.oldValue)
          return
        }
        finalValue = result.value
      }
    }

    if (colMeta.kind === 'string') {
      if ((newValue === '' || newValue == null) && !colMeta.nullable) {
        store.setValidationError(tableName, rowId, colName, 'Required')
        toast.error(`${colMeta.label}: Required`)
        event.node.setDataValue(colName, event.oldValue)
        return
      }
      finalValue = newValue === '' && colMeta.nullable ? null : newValue
    }

    store.clearValidationError(tableName, rowId, colName)

    if (store.saveMode === 'immediate') {
      try {
        await onImmediateSave(rowId, colName, finalValue)
        toast.success('Saved')
      } catch (err) {
        toast.error(`Save failed: ${(err as Error).message}`)
        event.node.setDataValue(colName, event.oldValue)
      }
    } else {
      // Explicit mode: stage the change
      store.stageDirtyCell(tableName, rowId, colName, finalValue)
    }
  }, [tableMeta, tableName, store, onImmediateSave])

  const handleJsonSave = useCallback(async (parsedValue: unknown) => {
    const { rowId, col } = jsonEditState
    store.clearValidationError(tableName, rowId, col.name)

    if (store.saveMode === 'immediate') {
      try {
        await onImmediateSave(rowId, col.name, parsedValue)
        toast.success('Saved')
      } catch (err) {
        toast.error(`Save failed: ${(err as Error).message}`)
      }
    } else {
      store.stageDirtyCell(tableName, rowId, col.name, parsedValue)
    }

    setJsonEditState(prev => ({ ...prev, open: false }))
    // Refresh the grid to show updated value
    gridRef.current?.api.refreshCells({ force: true })
  }, [jsonEditState, tableName, store, onImmediateSave])

  const handleDeleteConfirm = useCallback(() => {
    onDeleteRow(deleteConfirm.rowId)
    setDeleteConfirm({ open: false, rowId: 0 })
  }, [deleteConfirm.rowId, onDeleteRow])

  // Persist view state
  const onSortChanged = useCallback((event: SortChangedEvent) => {
    const sortModel = event.api.getColumnState()
      .filter(c => c.sort)
      .map(c => ({ colId: c.colId, sort: c.sort as 'asc' | 'desc' }))
    store.setViewState(tableName, { sortModel })
  }, [tableName, store])

  const onFilterChanged = useCallback((event: FilterChangedEvent) => {
    const filterModel = event.api.getFilterModel()
    store.setViewState(tableName, { filterModel })
  }, [tableName, store])

  const onGridReady = useCallback((event: GridReadyEvent) => {
    const viewState = store.getViewState(tableName)
    if (viewState.filterModel && Object.keys(viewState.filterModel).length > 0) {
      event.api.setFilterModel(viewState.filterModel)
    }
    if (viewState.sortModel.length > 0) {
      const colState = event.api.getColumnState().map(c => {
        const sorted = viewState.sortModel.find(s => s.colId === c.colId)
        return sorted ? { ...c, sort: sorted.sort, sortIndex: viewState.sortModel.indexOf(sorted) } : c
      })
      event.api.applyColumnState({ state: colState })
    }
  }, [tableName, store])

  return (
    <>
      <div className="grid-container">
        <AgGridReact
          ref={gridRef}
          theme={themeAlpine}
          rowData={rowData}
          columnDefs={columnDefs}
          getRowId={(params) => String(params.data.id)}
          onCellValueChanged={onCellValueChanged}
          onSortChanged={onSortChanged}
          onFilterChanged={onFilterChanged}
          onGridReady={onGridReady}
          singleClickEdit={true}
          stopEditingWhenCellsLoseFocus={true}
          pagination={true}
          paginationPageSize={50}
          domLayout="normal"
          suppressClickEdit={false}
        />
      </div>

      <JsonEditModal
        open={jsonEditState.open}
        value={jsonEditState.value}
        nullable={jsonEditState.col?.nullable ?? false}
        onSave={handleJsonSave}
        onCancel={() => setJsonEditState(prev => ({ ...prev, open: false }))}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Row"
        message={`Are you sure you want to delete row ${deleteConfirm.rowId}?`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ open: false, rowId: 0 })}
      />
    </>
  )
}
