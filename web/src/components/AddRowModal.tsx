import { useState, useEffect, useRef } from 'react'
import type { TableMeta } from '@dbgrid/shared'

type Props = {
  open: boolean
  tableMeta: TableMeta | null
  onSubmit: (data: Record<string, unknown>) => void
  onCancel: () => void
  fieldErrors?: Record<string, string>
}

export function AddRowModal({ open, tableMeta, onSubmit, onCancel, fieldErrors }: Props) {
  const [values, setValues] = useState<Record<string, string>>({})
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (open && tableMeta) {
      const init: Record<string, string> = {}
      for (const col of tableMeta.columns) {
        if (col.name === 'id') continue
        init[col.name] = ''
      }
      setValues(init)
    }
  }, [open, tableMeta])

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open && !el.open) el.showModal()
    else if (!open && el.open) el.close()
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tableMeta) return

    const data: Record<string, unknown> = {}
    for (const col of tableMeta.columns) {
      if (col.name === 'id') continue
      const val = values[col.name] ?? ''
      if (col.kind === 'json') {
        data[col.name] = val // let the server-side Zod parse it
      } else if (col.kind === 'number') {
        data[col.name] = val // let the server-side Zod parse it
      } else {
        data[col.name] = val === '' && col.nullable ? null : val
      }
    }
    onSubmit(data)
  }

  if (!open || !tableMeta) return null

  const editableColumns = tableMeta.columns.filter(c => c.name !== 'id')

  return (
    <dialog ref={dialogRef} className="modal-dialog add-row-modal" onClose={onCancel}>
      <div className="modal-content">
        <h3>Add Row to {tableMeta.label}</h3>
        <form onSubmit={handleSubmit}>
          {editableColumns.map(col => (
            <div key={col.name} className="form-field">
              <label>
                {col.label}
                {col.nullable && <span className="nullable-badge">nullable</span>}
                {col.kind !== 'string' && <span className="type-badge">{col.kind}</span>}
              </label>
              {col.kind === 'json' ? (
                <textarea
                  className={`json-textarea-small ${fieldErrors?.[col.name] ? 'input-error' : ''}`}
                  value={values[col.name] ?? ''}
                  onChange={e => setValues(prev => ({ ...prev, [col.name]: e.target.value }))}
                  rows={4}
                  placeholder={col.nullable ? 'null (leave empty)' : '{"key": "value"}'}
                  spellCheck={false}
                />
              ) : (
                <input
                  type="text"
                  className={fieldErrors?.[col.name] ? 'input-error' : ''}
                  value={values[col.name] ?? ''}
                  onChange={e => setValues(prev => ({ ...prev, [col.name]: e.target.value }))}
                  placeholder={col.nullable ? 'null (leave empty)' : ''}
                />
              )}
              {fieldErrors?.[col.name] && (
                <div className="error-text">{fieldErrors[col.name]}</div>
              )}
            </div>
          ))}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create</button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
