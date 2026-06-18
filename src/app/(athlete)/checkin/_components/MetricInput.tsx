'use client'

interface MetricInputProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  unit?: string
  prevValue?: number | null
  step?: string
  inputMode?: 'numeric' | 'decimal'
  invertDelta?: boolean  // true = subir el valor es malo (ej. FC reposo)
}

export default function MetricInput({
  label,
  value,
  onChange,
  placeholder,
  unit,
  prevValue,
  step,
  inputMode = 'numeric',
  invertDelta = false,
}: MetricInputProps) {
  const numValue = value ? Number(value) : null
  const delta = numValue !== null && prevValue != null ? numValue - prevValue : null

  const isPositive = delta !== null && (invertDelta ? delta < 0 : delta > 0)
  const isNegative = delta !== null && (invertDelta ? delta > 0 : delta < 0)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-500">{label}</label>
        {delta !== null && (
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              isPositive
                ? 'bg-green-50 text-green-700'
                : isNegative
                ? 'bg-red-50 text-red-600'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {delta > 0 ? '+' : ''}{delta.toFixed(1)} {unit}
          </span>
        )}
      </div>
      <div className="relative">
        <input
          type="number"
          inputMode={inputMode}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={prevValue ? String(prevValue) : placeholder}
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] pr-10"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}
