'use client'

interface MetricSliderProps {
  label: string
  value: number
  onChange: (v: number) => void
  max?: number
  color: string
  lowLabel?: string
  highLabel?: string
  prevValue?: number | null
}

export default function MetricSlider({
  label,
  value,
  onChange,
  max = 10,
  color,
  lowLabel,
  highLabel,
  prevValue,
}: MetricSliderProps) {
  const pct = value > 0 ? ((value - 1) / (max - 1)) * 100 : 0

  return (
    <div className="space-y-1.5">
      {/* Label + valor */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-[#4d4d4d]">{label}</span>
        <div className="flex items-center gap-2">
          {prevValue != null && (
            <span className="text-[10px] text-gray-400">ant. {prevValue}/{max}</span>
          )}
          <span
            className="text-[13px] font-semibold tabular-nums"
            style={{ color: value > 0 ? color : '#b3b3b3' }}
          >
            {value > 0 ? `${value}/${max}` : '—'}
          </span>
        </div>
      </div>

      {/* Track container — relative para que el input absoluto se alinee */}
      <div className="relative h-[6px] rounded-full bg-[#e6e6e6]">
        {/* Fill coloreado */}
        <div
          className="absolute inset-y-0 left-0 rounded-full pointer-events-none transition-all duration-100"
          style={{ width: value > 0 ? `${pct}%` : '0%', backgroundColor: color }}
        />

        {/* Range input absoluto: más alto que la barra para que el thumb sea clickeable */}
        <input
          type="range"
          min={1}
          max={max}
          value={value || 1}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute w-full cursor-pointer opacity-0"
          style={{
            top: '50%',
            transform: 'translateY(-50%)',
            height: '22px',
            margin: 0,
            padding: 0,
          }}
        />

        {/* Thumb custom — solo visible cuando hay valor seleccionado */}
        {value > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-[14px] h-[14px] rounded-full bg-white border-2 shadow-sm pointer-events-none transition-all duration-100"
            style={{
              left: `clamp(0px, calc(${pct}% - 7px), calc(100% - 14px))`,
              borderColor: color,
            }}
          />
        )}
      </div>

      {(lowLabel || highLabel) && (
        <div className="flex justify-between mt-0.5">
          {lowLabel && <span className="text-[10px] text-[#808080]">{lowLabel}</span>}
          {highLabel && <span className="text-[10px] text-[#808080]">{highLabel}</span>}
        </div>
      )}
    </div>
  )
}
