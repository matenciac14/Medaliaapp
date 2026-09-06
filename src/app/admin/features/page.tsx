import { getAllTierFeatureConfigs } from '@/infrastructure/db/tier_feature_config.repository'
import FeatureConfigClient from './_components/FeatureConfigClient'

export const dynamic = 'force-dynamic'

export default async function AdminFeaturesPage() {
  const rawConfigs = await getAllTierFeatureConfigs()

  // Serializar dates para el client component
  const configs = Object.fromEntries(
    Object.entries(rawConfigs).map(([k, v]) => [
      k,
      { ...v, updatedAt: v.updatedAt.toISOString() },
    ])
  ) as Parameters<typeof FeatureConfigClient>[0]['initialConfigs']

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Features por tipo de usuario</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configura qué funcionalidades tiene cada tipo de usuario. Los cambios aplican a las próximas activaciones.
        </p>
      </div>

      <FeatureConfigClient initialConfigs={configs} />
    </div>
  )
}
