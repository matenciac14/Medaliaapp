/**
 * Domain — pure functions for tier-based feature derivation.
 *
 * Reglas de negocio:
 *   - Atleta B2C: features derivadas de SubscriptionTier (no seteadas manualmente)
 *   - Entrenador: límite de asesorados activos según CoachSubscriptionTier
 *
 * NOTA: Cuando se integre Stripe/Wompi, getUserPlan() en lib/config/user-config.ts
 * deberá leer de UserSubscription.tier en DB en lugar de hardcodear 'PRO'.
 */

// ─── Tipos de dominio (espejean los enums DB, sin importar Prisma) ────────────

export type AthleteSubscriptionTier = 'TRIAL' | 'FREE' | 'PRO'

export type CoachTier = 'STARTER' | 'GROWTH' | 'PRO' | 'SCALE'

export type AthleteFeatures = {
  plan:      boolean
  checkin:   boolean
  nutrition: boolean
  progress:  boolean
  log:       boolean
  coach:     boolean   // siempre false para atletas
  gym:       boolean
}

export type CoachLimits = {
  maxAthletes: number
}

// ─── Funciones puras ──────────────────────────────────────────────────────────

/**
 * Devuelve las feature flags correspondientes al tier del atleta B2C.
 * TRIAL tiene acceso completo durante el período de prueba.
 * FREE: solo log manual (acceso mínimo post-trial).
 * PRO: acceso completo excepto panel de coach.
 */
export function computeAthleteFeatures(tier: AthleteSubscriptionTier): AthleteFeatures {
  switch (tier) {
    case 'PRO':
    case 'TRIAL':
      return {
        plan:      true,
        checkin:   true,
        nutrition: true,
        progress:  true,
        log:       true,
        coach:     false,
        gym:       true,
      }
    case 'FREE':
      return {
        plan:      false,
        checkin:   false,
        nutrition: false,
        progress:  false,
        log:       true,
        coach:     false,
        gym:       false,
      }
  }
}

/**
 * Devuelve el límite de asesorados activos para el tier del entrenador.
 * SCALE: sin límite (Infinity para que las comparaciones >= maxAthletes nunca disparen).
 */
export function getCoachLimits(tier: CoachTier): CoachLimits {
  switch (tier) {
    case 'STARTER': return { maxAthletes: 5 }
    case 'GROWTH':  return { maxAthletes: 25 }
    case 'PRO':     return { maxAthletes: 75 }
    case 'SCALE':   return { maxAthletes: Infinity }
  }
}
