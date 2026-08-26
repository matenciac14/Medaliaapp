import Link from 'next/link'
import MacroPills from './MacroPills'

type NutritionData = {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  label?: string
}

type Props = {
  data: NutritionData | null
  variant: 'card' | 'compact' | 'banner'
  targetKcalHard?: number | null
}

export default function NutritionSnapshot({ data, variant, targetKcalHard }: Props) {
  if (variant === 'banner') return <BannerVariant data={data} />
  if (variant === 'compact') return <CompactVariant data={data} />
  return <CardVariant data={data} targetKcalHard={targetKcalHard ?? null} />
}

function CardVariant({ data, targetKcalHard }: { data: NutritionData | null; targetKcalHard: number | null }) {
  return (
    <Link href="/nutrition" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden block transition-shadow hover:shadow-md">
      <div className="flex h-full">
        <div className="w-1 bg-[#22c55e] shrink-0" />
        <div className="flex-1 px-4 py-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">NUTRICIÓN HOY</p>
          {data ? (
            <>
              <p className="text-base font-black text-[#1e3a5f] leading-none mb-0.5">{data.kcal} kcal</p>
              <p className="text-[10px] text-gray-400 mb-2">de {targetKcalHard ?? data.kcal} objetivo</p>
              <MacroPills proteinG={data.proteinG} carbsG={data.carbsG} fatG={data.fatG} />
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

function CompactVariant({ data }: { data: NutritionData | null }) {
  if (!data) return null
  return (
    <Link href="/nutrition" className="block bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] px-3.5 py-3">
      <div className="flex items-center mb-2">
        <span className="text-sm">🍽️</span>
        <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest ml-1.5 flex-1">Nutrición hoy</p>
        {data.label && (
          <span className="text-[9px] font-bold text-white bg-[#ea580c] px-2 py-0.5 rounded-full uppercase">
            {data.label}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-black text-[#1e3a5f] tracking-tight">{data.kcal}</span>
        <span className="text-sm font-semibold text-gray-400">kcal</span>
        {data.label && <span className="text-[10px] text-gray-400 ml-1">ajustado por sesión</span>}
      </div>
      <MacroPills proteinG={data.proteinG} carbsG={data.carbsG} fatG={data.fatG} size="md" />
    </Link>
  )
}

function BannerVariant({ data }: { data: NutritionData | null }) {
  return (
    <Link href="/nutrition" className="px-4 py-2.5 hover:bg-gray-50/50 transition-colors block">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs">🍎</span>
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Nutrición hoy</span>
        {data?.label && (
          <span className="text-[9px] font-bold text-white bg-[#ea580c] px-1.5 py-0.5 rounded-full uppercase ml-auto">
            {data.label}
          </span>
        )}
      </div>
      {data ? (
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="text-base font-black text-[#1e3a5f] leading-none">{data.kcal} kcal</p>
          <span className="text-[10px] text-gray-400">ajustado por sesión</span>
          <div className="w-full mt-1">
            <MacroPills proteinG={data.proteinG} carbsG={data.carbsG} fatG={data.fatG} />
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400 mt-1">Configura tu plan nutricional</p>
      )}
    </Link>
  )
}
