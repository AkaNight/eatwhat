import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow: string
  title: string
  action?: ReactNode
}

export function PageHeader({ eyebrow, title, action }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {action}
    </header>
  )
}
