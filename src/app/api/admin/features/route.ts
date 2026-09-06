import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAllTierFeatureConfigs, updateTierFeatureConfig } from '@/infrastructure/db/tier_feature_config.repository'
import type { AthleteUserType } from '../../../../generated/prisma/client'

const VALID_USER_TYPES: AthleteUserType[] = ['B2C_FREE', 'B2C_PRO', 'B2B']
const VALID_FEATURES = ['featurePlan', 'featureCheckin', 'featureNutrition', 'featureProgress', 'featureLog', 'featureGym']

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const configs = await getAllTierFeatureConfigs()
  return NextResponse.json({ configs })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { userType: string; feature: string; value: boolean }
  const { userType, feature, value } = body

  if (!VALID_USER_TYPES.includes(userType as AthleteUserType)) {
    return NextResponse.json({ error: 'userType inválido' }, { status: 400 })
  }
  if (!VALID_FEATURES.includes(feature)) {
    return NextResponse.json({ error: 'feature inválida' }, { status: 400 })
  }
  if (typeof value !== 'boolean') {
    return NextResponse.json({ error: 'value debe ser boolean' }, { status: 400 })
  }

  const updated = await updateTierFeatureConfig(
    userType as AthleteUserType,
    { [feature]: value },
    session.user.id
  )

  return NextResponse.json({ ok: true, config: updated })
}
