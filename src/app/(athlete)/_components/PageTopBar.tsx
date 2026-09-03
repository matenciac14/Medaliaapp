import type { ReactNode } from 'react'

type PageTopBarProps = {
  title: string
  subtitle?: string
  center?: ReactNode
  right?: ReactNode
}

export default function PageTopBar({ title, subtitle, center, right }: PageTopBarProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 h-[72px]">
      <div className="min-w-0 shrink-0">
        <h1 className="text-[20px] font-bold text-gray-900 leading-tight truncate">{title}</h1>
        {subtitle && (
          <p className="text-[13px] text-gray-400 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      {center && <div className="flex-1 flex justify-center">{center}</div>}
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}
