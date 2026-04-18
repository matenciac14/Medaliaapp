import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WizardData = {
  goalType: 'RACE' | 'BODY' | 'FITNESS' | null
  raceDistance: string | null
  bodyGoal: string | null
  raceDate: string | null
  targetTime: string | null
  weightGoalKg: number | null
  age: number | null
  heightCm: number | null
  weightKg: number | null
  hrResting: number | null
  hrMax: number | null
  recentBest5k: string | null
  recentBest10k: string | null
  recentBestHalf: string | null
  lastRaceMonthsAgo: number | null
  arrivedTrained: boolean | null
  injuries: string[]
  conditions: string[]
  sleepHoursAvg: number | null
  daysPerWeek: number
  hoursPerSession: number
  city: string
  equipment: string[]
  nutritionCommitment: 'strict' | 'moderate' | 'flexible' | null
  hrTestAvailable: boolean | null
}

// ---------------------------------------------------------------------------
// Cálculos fisiológicos
// ---------------------------------------------------------------------------

function calcHrMax(age: number, hrMaxInput: number | null): number {
  if (hrMaxInput && hrMaxInput > 100) return hrMaxInput
  return Math.round(211 - 0.64 * age)
}

function calcHrZones(hrMax: number, hrResting: number | null) {
  const rest = hrResting ?? 60
  // Zonas basadas en FC de reserva (método Karvonen)
  const reserve = hrMax - rest
  return {
    z1: { min: Math.round(rest + reserve * 0.5), max: Math.round(rest + reserve * 0.6) },
    z2: { min: Math.round(rest + reserve * 0.6), max: Math.round(rest + reserve * 0.7) },
    z3: { min: Math.round(rest + reserve * 0.7), max: Math.round(rest + reserve * 0.8) },
    z4: { min: Math.round(rest + reserve * 0.8), max: Math.round(rest + reserve * 0.9) },
    z5: { min: Math.round(rest + reserve * 0.9), max: hrMax },
  }
}

function calcTDEE(
  age: number,
  heightCm: number,
  weightKg: number,
  daysPerWeek: number,
  hoursPerSession: number
): number {
  // Mifflin-St Jeor (asumiendo hombre como default — ajustar con sexo cuando se agregue)
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  // Factor de actividad aproximado
  const weeklyHours = daysPerWeek * hoursPerSession
  let factor = 1.55
  if (weeklyHours <= 3) factor = 1.375
  else if (weeklyHours <= 6) factor = 1.55
  else factor = 1.725
  return Math.round(bmr * factor)
}

// ---------------------------------------------------------------------------
// API Route
// ---------------------------------------------------------------------------

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Eres coach deportivo de élite. Dado un perfil de atleta, confirma que el plan puede generarse y da 3 recomendaciones clave personalizadas (2-3 oraciones cada una, en español). Sé directo y específico — nada genérico. Responde SOLO en JSON con esta estructura exacta: { "recommendations": [{ "title": "string", "text": "string" }] }`

export async function POST(req: NextRequest) {
  try {
    const data: WizardData = await req.json()

    // 1. Calcular zonas FC
    const hrMaxCalc = data.age
      ? calcHrMax(data.age, data.hrMax)
      : (data.hrMax ?? 180)

    const hrZones = calcHrZones(hrMaxCalc, data.hrResting)

    // 2. Calcular TDEE
    const tdee =
      data.age && data.heightCm && data.weightKg
        ? calcTDEE(data.age, data.heightCm, data.weightKg, data.daysPerWeek, data.hoursPerSession)
        : null

    // 3. Llamar a Claude Haiku con el perfil
    const profileSummary = JSON.stringify({
      objetivo: data.goalType,
      distancia: data.raceDistance,
      metaCorporal: data.bodyGoal,
      fechaCarrera: data.raceDate,
      tiempoObjetivo: data.targetTime,
      pesoObjetivo: data.weightGoalKg,
      edad: data.age,
      talla: data.heightCm,
      peso: data.weightKg,
      fcReposo: data.hrResting,
      fcMax: hrMaxCalc,
      zonasFC: hrZones,
      tdee,
      mejor5k: data.recentBest5k,
      mejor10k: data.recentBest10k,
      ultimaCarrera: data.lastRaceMonthsAgo,
      lesiones: data.injuries,
      condiciones: data.conditions,
      sueno: data.sleepHoursAvg,
      diasSemana: data.daysPerWeek,
      horasSesion: data.hoursPerSession,
      ciudad: data.city,
      equipamiento: data.equipment,
      nutricion: data.nutritionCommitment,
    })

    const aiResponse = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Perfil del atleta: ${profileSummary}`,
        },
      ],
    })

    const rawText =
      aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : '{}'

    let recommendations: { title: string; text: string }[] = []
    try {
      const parsed = JSON.parse(rawText)
      recommendations = parsed.recommendations ?? []
    } catch {
      // Si Haiku no devuelve JSON válido, continuamos sin recomendaciones
    }

    return NextResponse.json({
      success: true,
      planId: 'demo-123',
      hrZones,
      hrMax: hrMaxCalc,
      tdee,
      recommendations,
    })
  } catch (error) {
    console.error('Onboarding generate error:', error)
    return NextResponse.json(
      { error: 'Error generando el plan. Intenta de nuevo.' },
      { status: 500 }
    )
  }
}
