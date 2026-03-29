import { useState, useEffect, useRef } from 'react'

type Props = {
  open: boolean
  value: unknown
  nullable: boolean
  onSave: (value: unknown) => void
  onCancel: () => void
}

export function JsonEditModal({ open, value, nullable, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      const formatted = value != null ? JSON.stringify(value, null, 2) : ''
      setDraft(formatted)
      setError(null)
    }
  }, [open, value])

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open && !el.open) {
      el.showModal()
      setTimeout(() => textareaRef.current?.focus(), 50)
    } else if (!open && el.open) {
      el.close()
    }
  }, [open])

  const handleSave = () => {
    const trimmed = draft.trim()
    if (trimmed === '' && nullable) {
      onSave(null)
      return
    }
    if (trimmed === '') {
      setError('Required')
      return
    }
    try {
      const parsed = JSON.parse(trimmed)
      onSave(parsed)
    } catch {
      setError('Invalid JSON')
    }
  }

  if (!open) return null

  return (
    <dialog ref={dialogRef} className="modal-dialog json-modal" onClose={onCancel}>
      <div className="modal-content">
        <h3>Edit JSON</h3>
        <textarea
          ref={textareaRef}
          className={`json-textarea ${error ? 'input-error' : ''}`}
          value={draft}
          onChange={e => { setDraft(e.target.value); setError(null) }}
          rows={15}
          spellCheck={false}
        />
        {error && <div className="error-text">{error}</div>}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </dialog>
  )
}
