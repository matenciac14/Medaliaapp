/**
 * Lógica pura para clasificación de alertas operativas del admin.
 * Sin dependencias de Prisma, Next.js ni ningún framework.
 */

export const PENDING_ATHLETE_THRESHOLD_HOURS = 48
export const COACH_WITHOUT_ATHLETES_THRESHOLD_DAYS = 7

export type AlertSeverity = 'high' | 'medium'

export type AthleteAlert = {
  type: 'athlete_pending'
  severity: AlertSeverity
  userId: string
  name: string | null
  email: string
  createdAt: Date
  hoursWaiting: number
}

export type CoachAlert = {
  type: 'coach_no_athletes'
  severity: AlertSeverity
  userId: string
  name: string | null
  email: string
  createdAt: Date
  daysWithoutAthletes: number
}

export type OperationalAlert = AthleteAlert | CoachAlert

/**
 * Determina si un atleta B2B lleva demasiado tiempo en estado "pendiente"
 * sin que el coach lo haya activado.
 *
 * @param createdAt  Fecha de registro del atleta
 * @param now        Momento actual (inyectado para facilitar tests)
 * @param thresholdHours  Horas de espera máxima antes de alertar (default 48)
 */
export function isAthleteStuckInPending(
  createdAt: Date,
  now: Date,
  thresholdHours = PENDING_ATHLETE_THRESHOLD_HOURS,
): boolean {
  const hoursWaiting = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
  return hoursWaiting >= thresholdHours
}

/**
 * Horas que lleva un atleta esperando activación desde su registro.
 */
export function hoursSinceCreation(createdAt: Date, now: Date): number {
  return Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60))
}

/**
 * Determina si un coach lleva demasiados días registrado sin tener atletas activos.
 *
 * @param createdAt       Fecha de registro del coach
 * @param athleteCount    Número de atletas activos actuales
 * @param now             Momento actual (inyectado para facilitar tests)
 * @param thresholdDays   Días máximos sin atletas antes de alertar (default 7)
 */
export function isCoachWithoutAthletes(
  createdAt: Date,
  athleteCount: number,
  now: Date,
  thresholdDays = COACH_WITHOUT_ATHLETES_THRESHOLD_DAYS,
): boolean {
  if (athleteCount > 0) return false
  const daysRegistered = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  return daysRegistered >= thresholdDays
}

/**
 * Días que lleva un coach registrado.
 */
export function daysSinceCreation(createdAt: Date, now: Date): number {
  return Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Construye un AthleteAlert si el atleta supera el umbral de espera.
 * Devuelve null si no hay alerta.
 */
export function buildAthleteAlert(
  user: { id: string; name: string | null; email: string; createdAt: Date },
  now: Date,
): AthleteAlert | null {
  const hoursWaiting = hoursSinceCreation(user.createdAt, now)
  if (hoursWaiting < PENDING_ATHLETE_THRESHOLD_HOURS) return null
  return {
    type: 'athlete_pending',
    severity: hoursWaiting >= 96 ? 'high' : 'medium',
    userId: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    hoursWaiting,
  }
}

/**
 * Construye un CoachAlert si el coach supera el umbral sin atletas.
 * Devuelve null si no hay alerta.
 */
export function buildCoachAlert(
  user: { id: string; name: string | null; email: string; createdAt: Date },
  athleteCount: number,
  now: Date,
): CoachAlert | null {
  if (!isCoachWithoutAthletes(user.createdAt, athleteCount, now)) return null
  const daysWithoutAthletes = daysSinceCreation(user.createdAt, now)
  return {
    type: 'coach_no_athletes',
    severity: daysWithoutAthletes >= 14 ? 'high' : 'medium',
    userId: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    daysWithoutAthletes,
  }
}
