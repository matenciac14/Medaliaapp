type Props = {
  proteinG: number
  carbsG: number
  fatG: number
  size?: 'sm' | 'md'
}

const SIZE_CLS = {
  sm: 'text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-full px-2 py-0.5',
  md: 'text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-full px-2.5 py-1',
} as const

export default function MacroPills({ proteinG, carbsG, fatG, size = 'sm' }: Props) {
  const cls = SIZE_CLS[size]
  return (
    <div className="flex gap-2">
      <span className={cls}>P {proteinG}g</span>
      <span className={cls}>C {carbsG}g</span>
      <span className={cls}>G {fatG}g</span>
    </div>
  )
}
