import Link from 'next/link'

type NutritionData = {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  label?: string
}

type ConsumedData = {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

type Props = {
  data: NutritionData | null
  variant: 'card' | 'compact' | 'banner'
  targetKcalHard?: number | null
  consumed?: ConsumedData | null
}

export default function NutritionSnapshot({ data, variant, targetKcalHard, consumed }: Props) {
  if (variant === 'banner') return <BannerVariant data={data} />
  if (variant === 'compact') return <CompactVariant data={data} consumed={consumed ?? null} />
  return <CardVariant data={data} targetKcalHard={targetKcalHard ?? null} />
}

// -- Compact: Figma ⑧ NUTRICIÓN (mobile dashboard) ---------------------------

function CompactVariant({ data, consumed: consumedData }: { data: NutritionData | null; consumed: ConsumedData | null }) {
  if (!data) return null

  const targetKcal = data.kcal
  const consumed = consumedData?.kcal ?? 0
  const remaining = Math.max(0, targetKcal - consumed)
  const pct = targetKcal > 0 ? Math.min(consumed / targetKcal, 1) : 0

  return (
    <Link href="/nutrition" className="block">
      <div className="bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-5">
        <div className="flex items-center justify-center gap-5">
          {/* Donut chart */}
          <DonutChart remaining={remaining} pct={pct} size={110} />

          {/* Right side */}
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">Calorias de hoy</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-[28px] font-black text-[#1e3a5f] leading-none tracking-tight">{targetKcal.toLocaleString('es')}</span>
              <span className="text-[11px] text-gray-400">kcal objetivo</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">{consumed.toLocaleString('es')} kcal consumidas</p>

            {/* Macro rings */}
            <div className="flex items-center justify-between mt-3 pr-2">
              <MacroRing current={consumedData?.proteinG ?? 0} target={data.proteinG} label="Prot" color="#3b82f6" bgColor="#edf2ff" />
              <MacroRing current={consumedData?.carbsG ?? 0} target={data.carbsG} label="Carbs" color="#f59e0b" bgColor="#fef9c3" />
              <MacroRing current={consumedData?.fatG ?? 0} target={data.fatG} label="Grasas" color="#22c55e" bgColor="#dcfce7" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

// -- Donut chart (SVG) --------------------------------------------------------

function DonutChart({ remaining, pct, size }: { remaining: number; pct: number; size: number }) {
  const stroke = 8
  const radius = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - pct)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
        {/* Progress ring */}
        <circle
          cx={cx} cy={cy} r={radius} fill="none"
          stroke="#f97316" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[17px] font-black text-[#1e3a5f] leading-none">{remaining.toLocaleString('es')}</span>
        <span className="text-[8px] text-gray-400 mt-0.5">restantes</span>
      </div>
    </div>
  )
}

// -- Macro ring (small colored circle + value) --------------------------------

function MacroRing({ current, target, label, color, bgColor = '#f3f4f6' }: { current: number; target: number; label: string; color: string; bgColor?: string }) {
  const size = 36
  const stroke = 3
  const radius = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * radius
  const fillPct = target > 0 ? Math.min(current / target, 1) : 0
  const dashOffset = circumference * (1 - fillPct)

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke={bgColor} strokeWidth={stroke} />
          <circle
            cx={cx} cy={cy} r={radius} fill="none"
            stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </svg>
      </div>
      <span className="text-[11px] font-bold text-[#1e3a5f]">{current}g</span>
      <span className="text-[9px] text-gray-400">{label}</span>
    </div>
  )
}

// -- Card variant (desktop hero) ----------------------------------------------

function CardVariant({ data, targetKcalHard }: { data: NutritionData | null; targetKcalHard: number | null }) {
  return (
    <Link href="/nutrition" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden block transition-shadow hover:shadow-md">
      <div className="flex h-full">
        <div className="w-1 bg-[#22c55e] shrink-0" />
        <div className="flex-1 px-4 py-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">NUTRICION HOY</p>
          {data ? (
            <>
              <p className="text-base font-black text-[#1e3a5f] leading-none mb-0.5">{data.kcal} kcal</p>
              <p className="text-[10px] text-gray-400 mb-2">de {targetKcalHard ?? data.kcal} objetivo</p>
              <div className="flex gap-2">
                <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">P {data.proteinG}g</span>
                <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">C {data.carbsG}g</span>
                <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">G {data.fatG}g</span>
              </div>
              <div className="flex justify-end mt-2">
                <span className="text-[10px] font-semibold text-[#22c55e]">Ver detalle →</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-base font-black text-[#1e3a5f] leading-none mb-0.5">Sin registros</p>
              <p className="text-[11px] text-gray-500 mb-1.5">nutricionales hoy</p>
              <div className="flex justify-end">
                <span className="text-[10px] font-semibold text-[#22c55e]">Registrar →</span>
              </div>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}

// -- Banner variant (desktop info row) ----------------------------------------

function BannerVariant({ data }: { data: NutritionData | null }) {
  return (
    <Link href="/nutrition" className="px-4 py-2.5 hover:bg-gray-50/50 transition-colors block">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs">🍎</span>
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Nutricion hoy</span>
        {data?.label && (
          <span className="text-[9px] font-bold text-white bg-[#ea580c] px-1.5 py-0.5 rounded-full uppercase ml-auto">
            {data.label}
          </span>
        )}
      </div>
      {data ? (
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="text-base font-black text-[#1e3a5f] leading-none">{data.kcal} kcal</p>
          <span className="text-[10px] text-gray-400">ajustado por sesion</span>
          <div className="w-full mt-1">
            <div className="flex gap-2">
              <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">P {data.proteinG}g</span>
              <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">C {data.carbsG}g</span>
              <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">G {data.fatG}g</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400 mt-1">Configura tu plan nutricional</p>
      )}
    </Link>
  )
}
