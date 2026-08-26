type Props = {
  pct: number
  color?: string
  className?: string
}

export default function ProgressBar({ pct, color = 'bg-[#ea580c]', className = '' }: Props) {
  return (
    <div className={`h-1 bg-gray-100 rounded-full overflow-hidden ${className}`}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  )
}
