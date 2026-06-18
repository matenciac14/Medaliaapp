import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import Anthropic from '@anthropic-ai/sdk'
import { rateLimitAsync } from '@/lib/rate-limit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Eres un asistente experto en nutrición. Tu única tarea es extraer datos nutricionales de imágenes de etiquetas de alimentos y devolverlos como JSON.

Devuelve SOLO un objeto JSON válido con esta estructura exacta (sin markdown, sin explicaciones):
{
  "name": "nombre del producto (string)",
  "category": "una de: PROTEIN | CARB | FAT | VEGETABLE | FRUIT | DAIRY | LEGUME",
  "kcalPer100g": número,
  "proteinPer100g": número,
  "carbsPer100g": número,
  "fatPer100g": número,
  "fiberPer100g": número o null,
  "calciumMg": número o null,
  "ironMg": número o null,
  "potassiumMg": número o null,
  "vitaminCMg": número o null,
  "magnesiumMg": número o null,
  "servingG": número (tamaño de porción en gramos, o 100 si no está especificado),
  "servingLabel": "descripción de porción (ej: '1 taza (240g)') o null"
}

Reglas:
- Todos los valores numéricos son por 100g
- Si la etiqueta muestra valores por porción, conviértelos a por 100g
- Infiere la categoría según el tipo de alimento
- Si un micronutriente no aparece en la etiqueta, devuelve null
- Si el nombre no está claro, usa una descripción genérica del alimento`

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`food-scan:${session.user.id}`, { limit: 20, windowMs: 60 * 60_000 }) // 20/hora
  if (!allowed) return NextResponse.json({ error: 'Límite de escaneos alcanzado. Intenta más tarde.' }, { status: 429 })

  const { image, mimeType } = await req.json()
  if (!image) return NextResponse.json({ error: 'Imagen requerida' }, { status: 400 })

  // Limitar tamaño del payload de imagen (~5MB en base64 ≈ 3.75MB real)
  if (typeof image !== 'string' || image.length > 7_000_000) {
    return NextResponse.json({ error: 'Imagen demasiado grande. Máximo 5MB.' }, { status: 400 })
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType ?? 'image/jpeg',
                data: image,
              },
            },
            {
              type: 'text',
              text: 'Extrae los datos nutricionales de esta etiqueta y devuelve el JSON.',
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const data = JSON.parse(cleaned)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[foods/scan] AI error:', err)
    return NextResponse.json(
      { error: 'No se pudo procesar la imagen. Intenta con otra foto o agrega el alimento manualmente.' },
      { status: 422 }
    )
  }
}
