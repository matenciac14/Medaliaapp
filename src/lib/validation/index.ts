// Zod v4 — API compatible
import { z } from 'zod'

// ── Schemas reutilizables ────────────────────────────────────────────────────

export const emailSchema = z
  .string()
  .min(1, 'El correo es obligatorio.')
  .email('El correo no es válido.')
  .max(254, 'El correo es demasiado largo.')
  .transform(v => v.toLowerCase().trim())

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(72, 'La contraseña es demasiado larga.')

export const nameSchema = z
  .string()
  .min(1, 'El nombre es obligatorio.')
  .max(100, 'El nombre es demasiado largo.')
  .transform(v => v.trim())

export const roleSchema = z.enum(['ATHLETE', 'COACH'])

export const timezoneSchema = z.string().max(60).optional()

export const localeSchema = z.string().max(20).optional()

// ── Helper para parsear y devolver el primer error ───────────────────────────

type ParseOk<T> = { ok: true; data: T }
type ParseFail = { ok: false; error: string }

export function parseBody<T>(
  schema: z.ZodType<T>,
  data: unknown
): ParseOk<T> | ParseFail {
  const result = schema.safeParse(data)
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'Datos inválidos.'
    return { ok: false, error: message }
  }
  return { ok: true, data: result.data }
}
