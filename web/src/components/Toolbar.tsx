import type { SaveMode } from '../lib/store.js'

type Props = {
  tableName: string | null
  tableLabel: string | null
  saveMode: SaveMode
  onToggleSaveMode: () => void
  onAddRow: () => void
  onRefresh: () => void
  dirtyCount: number
  onSaveAll: () => void
  onDiscardAll: () => void
}

export function Toolbar({
  tableLabel,
  saveMode,
  onToggleSaveMode,
  onAddRow,
  onRefresh,
  dirtyCount,
  onSaveAll,
  onDiscardAll,
}: Props) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <span className="toolbar-title">{tableLabel ?? 'Select a table'}</span>
      </div>
      <div className="toolbar-right">
        <div className="save-mode-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={saveMode === 'explicit'}
              onChange={onToggleSaveMode}
            />
            <span>{saveMode === 'immediate' ? 'Immediate Save' : 'Explicit Save'}</span>
          </label>
        </div>
        {saveMode === 'explicit' && dirtyCount > 0 && (
          <div className="explicit-actions">
            <span className="dirty-badge">{dirtyCount} unsaved</span>
            <button className="btn btn-primary btn-sm" onClick={onSaveAll}>Save All</button>
            <button className="btn btn-secondary btn-sm" onClick={onDiscardAll}>Discard</button>
          </div>
        )}
        <button className="btn btn-secondary btn-sm" onClick={onRefresh}>Refresh</button>
        <button className="btn btn-primary btn-sm" onClick={onAddRow}>+ Add Row</button>
      </div>
    </div>
  )
}
