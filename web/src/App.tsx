import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { RowData } from '@dbgrid/shared'
import { Sidebar } from './components/Sidebar.js'
import { Toolbar } from './components/Toolbar.js'
import { AddRowModal } from './components/AddRowModal.js'
import { ConfirmDialog } from './components/ConfirmDialog.js'
import { DataGrid } from './features/tables/DataGrid.js'
import { useTablesQuery, useTableMetaQuery, useTableRowsQuery, useCreateRowMutation, useUpdateRowMutation, useDeleteRowMutation } from './lib/hooks.js'
import { useAppStore } from './lib/store.js'
import toast from 'react-hot-toast'

export default function App() {
  const store = useAppStore()
  const queryClient = useQueryClient()

  const { data: tables = [] } = useTablesQuery()
  const { data: tableMeta } = useTableMetaQuery(store.selectedTable)
  const { data: rows = [] } = useTableRowsQuery(store.selectedTable)

  const createRow = useCreateRowMutation(store.selectedTable ?? '')
  const updateRow = useUpdateRowMutation(store.selectedTable ?? '')
  const deleteRow = useDeleteRowMutation(store.selectedTable ?? '')

  const [addRowOpen, setAddRowOpen] = useState(false)
  const [addRowErrors, setAddRowErrors] = useState<Record<string, string>>({})
  const [switchWarning, setSwitchWarning] = useState<{ open: boolean; targetTable: string }>({ open: false, targetTable: '' })

  const handleSelectTable = useCallback((name: string) => {
    if (name === store.selectedTable) return
    if (store.selectedTable && store.saveMode === 'explicit' && store.hasDirtyChanges(store.selectedTable)) {
      setSwitchWarning({ open: true, targetTable: name })
      return
    }
    store.setSelectedTable(name)
  }, [store])

  const handleConfirmSwitch = useCallback(() => {
    if (store.selectedTable) {
      store.clearDirtyTable(store.selectedTable)
      store.clearValidationErrorsForTable(store.selectedTable)
    }
    store.setSelectedTable(switchWarning.targetTable)
    setSwitchWarning({ open: false, targetTable: '' })
  }, [store, switchWarning.targetTable])

  const handleImmediateSave = useCallback(async (rowId: number, colName: string, value: unknown) => {
    await updateRow.mutateAsync({ id: rowId, data: { [colName]: value } })
  }, [updateRow])

  const handleDeleteRow = useCallback((rowId: number) => {
    deleteRow.mutate(rowId, {
      onSuccess: () => toast.success('Row deleted'),
      onError: (err) => toast.error(`Delete failed: ${err.message}`),
    })
  }, [deleteRow])

  const handleAddRow = useCallback((data: Record<string, unknown>) => {
    createRow.mutate(data, {
      onSuccess: () => {
        setAddRowOpen(false)
        setAddRowErrors({})
        toast.success('Row created')
      },
      onError: (err) => {
        const apiErr = err as Error & { fieldErrors?: Record<string, string> }
        if (apiErr.fieldErrors) {
          setAddRowErrors(apiErr.fieldErrors)
        }
        toast.error(`Create failed: ${err.message}`)
      },
    })
  }, [createRow])

  const handleSaveAll = useCallback(async () => {
    if (!store.selectedTable) return
    const tableDirty = store.dirtyMap[store.selectedTable]
    if (!tableDirty) return

    let successCount = 0
    let failCount = 0

    for (const [rowIdStr, changes] of Object.entries(tableDirty)) {
      const rowId = Number(rowIdStr)
      try {
        await updateRow.mutateAsync({ id: rowId, data: changes as Record<string, unknown> })
        successCount++
      } catch (err) {
        failCount++
        toast.error(`Row ${rowId} save failed: ${(err as Error).message}`)
      }
    }

    if (successCount > 0) {
      store.clearDirtyTable(store.selectedTable)
      queryClient.invalidateQueries({ queryKey: ['tableRows', store.selectedTable] })
      toast.success(`${successCount} row(s) saved`)
    }
    if (failCount > 0) {
      toast.error(`${failCount} row(s) failed to save`)
    }
  }, [store, updateRow, queryClient])

  const handleDiscardAll = useCallback(() => {
    if (!store.selectedTable) return
    store.clearDirtyTable(store.selectedTable)
    store.clearValidationErrorsForTable(store.selectedTable)
    queryClient.invalidateQueries({ queryKey: ['tableRows', store.selectedTable] })
    toast.success('Changes discarded')
  }, [store, queryClient])

  const handleRefresh = useCallback(() => {
    if (!store.selectedTable) return
    queryClient.invalidateQueries({ queryKey: ['tableRows', store.selectedTable] })
  }, [store.selectedTable, queryClient])

  const currentTableSummary = tables.find(t => t.name === store.selectedTable)
  const dirtyCount = store.selectedTable ? store.getDirtyCount(store.selectedTable) : 0

  return (
    <div className="app-layout">
      <Sidebar
        tables={tables}
        selectedTable={store.selectedTable}
        onSelectTable={handleSelectTable}
      />
      <div className="main-area">
        <Toolbar
          tableName={store.selectedTable}
          tableLabel={currentTableSummary?.label ?? null}
          saveMode={store.saveMode}
          onToggleSaveMode={() => store.setSaveMode(store.saveMode === 'immediate' ? 'explicit' : 'immediate')}
          onAddRow={() => setAddRowOpen(true)}
          onRefresh={handleRefresh}
          dirtyCount={dirtyCount}
          onSaveAll={handleSaveAll}
          onDiscardAll={handleDiscardAll}
        />
        <div className="grid-wrapper">
          {tableMeta && rows ? (
            <DataGrid
              tableMeta={tableMeta}
              rows={rows as RowData[]}
              store={store}
              onImmediateSave={handleImmediateSave}
              onDeleteRow={handleDeleteRow}
            />
          ) : (
            <div className="empty-state">Select a table from the sidebar</div>
          )}
        </div>
      </div>

      <AddRowModal
        open={addRowOpen}
        tableMeta={tableMeta ?? null}
        onSubmit={handleAddRow}
        onCancel={() => { setAddRowOpen(false); setAddRowErrors({}) }}
        fieldErrors={addRowErrors}
      />

      <ConfirmDialog
        open={switchWarning.open}
        title="Unsaved Changes"
        message="You have unsaved changes. Discard them and switch tables?"
        confirmLabel="Discard & Switch"
        onConfirm={handleConfirmSwitch}
        onCancel={() => setSwitchWarning({ open: false, targetTable: '' })}
      />
    </div>
  )
}
