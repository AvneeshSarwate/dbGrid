import { useState } from 'react'
import type { TableSummary } from '@dbgrid/shared'

type Props = {
  tables: TableSummary[]
  selectedTable: string | null
  onSelectTable: (name: string) => void
}

export function Sidebar({ tables, selectedTable, onSelectTable }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggleExpand = (name: string) => {
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }))
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">Tables</div>
      <ul className="table-list">
        {tables.map(t => (
          <li key={t.name}>
            <div
              className={`table-item ${selectedTable === t.name ? 'active' : ''}`}
              onClick={() => onSelectTable(t.name)}
            >
              <button
                className="expand-btn"
                onClick={e => { e.stopPropagation(); toggleExpand(t.name) }}
              >
                {expanded[t.name] ? '▾' : '▸'}
              </button>
              <span className="table-name">{t.label}</span>
            </div>
            {expanded[t.name] && (
              <ul className="column-list">
                {t.columns.map(c => (
                  <li key={c.name} className="column-item">
                    <span className="col-name">{c.name}</span>
                    <span className="col-type">{c.kind}{c.nullable ? '?' : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </aside>
  )
}
