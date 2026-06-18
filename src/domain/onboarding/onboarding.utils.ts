/**
 * Pure helpers shared between web and mobile onboarding routes.
 * Eliminates duplication between /api/onboarding/generate and /api/mobile/onboarding/generate.
 * No I/O, no Prisma, no Next.js.
 */
import type { WizardData } from '@/app/onboarding/_types'

/** Maps WizardData to the goalType used by templates and the plan generator. */
export function resolveGoalType(data: WizardData): string {
  if (data.mainGoal === 'SPORT') {
    switch (data.sport) {
      case 'RUNNING':   return data.raceDistance ?? 'RACE_HALF_MARATHON'
      case 'CYCLING':   return 'RACE_CYCLING'
      case 'TRIATHLON': return 'RACE_TRIATHLON'
      case 'SWIMMING':  return 'RACE_SWIMMING'
      case 'FOOTBALL':  return 'FOOTBALL_GPP'
      case 'STRENGTH':  return 'STRENGTH_TRAINING'
      default:          return 'BODY_RECOMPOSITION'
    }
  }
  if (data.mainGoal === 'GYM' || data.mainGoal === 'BODY') return 'BODY_RECOMPOSITION'
  return 'GENERAL_FITNESS'
}

/** Builds the sportDetails JSON stored in HealthProfile. */
export function buildSportDetails(data: WizardData): Record<string, unknown> {
  if (data.mainGoal === 'SPORT') {
    switch (data.sport) {
      case 'RUNNING':
        return { raceDistance: data.raceDistance, raceDate: data.raceDate, targetTime: data.targetTime, recentBestTime: data.recentBestTime }
      case 'CYCLING':
        return { cyclingModality: data.cyclingModality, hasPowerMeter: data.hasPowerMeter, ftp: data.ftp, raceDate: data.raceDate }
      case 'SWIMMING':
        return { swimStroke: data.swimStroke, recentSwimTime: data.recentSwimTime, raceDate: data.raceDate }
      case 'TRIATHLON':
        return { triathlonDistance: data.triathlonDistance, weakestSegment: data.weakestSegment, raceDate: data.raceDate }
      case 'FOOTBALL':
        return { footballPosition: data.footballPosition, competitionLevel: data.competitionLevel, seasonPhase: data.seasonPhase }
      case 'STRENGTH':
        return { strengthStyle: data.strengthStyle }
    }
  }
  if (data.mainGoal === 'GYM')  return { gymGoal: data.gymGoal }
  if (data.mainGoal === 'BODY') return { bodyGoal: data.bodyGoal, targetDate: data.raceDate }
  return {}
}

/** Converts "MM:SS" or "HH:MM:SS" time strings to total seconds. */
export function timeStringToSecs(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null
  const parts = timeStr.split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

/** Maps goalType string to UserConfig sport fields. */
export function resolveSportConfig(goalType: string, _data: WizardData): {
  sportType: 'RUNNING' | 'CYCLING' | 'TRIATHLON' | 'SWIMMING' | 'FOOTBALL' | 'STRENGTH' | 'GENERAL'
  sportGoal: 'RACE' | 'BODY_RECOMPOSITION' | 'GENERAL_FITNESS'
} {
  const upper = goalType.toUpperCase()
  if (upper === 'RACE_CYCLING')    return { sportType: 'CYCLING',   sportGoal: 'RACE' }
  if (upper === 'RACE_TRIATHLON')  return { sportType: 'TRIATHLON', sportGoal: 'RACE' }
  if (upper === 'RACE_SWIMMING')   return { sportType: 'SWIMMING',  sportGoal: 'RACE' }
  if (upper === 'FOOTBALL_GPP')    return { sportType: 'FOOTBALL',  sportGoal: 'GENERAL_FITNESS' }
  if (upper === 'STRENGTH_TRAINING') return { sportType: 'STRENGTH', sportGoal: 'BODY_RECOMPOSITION' }
  if (upper.startsWith('RACE_'))   return { sportType: 'RUNNING',   sportGoal: 'RACE' }
  if (upper === 'BODY_RECOMPOSITION' || upper === 'WEIGHT_LOSS') {
    return { sportType: 'STRENGTH', sportGoal: 'BODY_RECOMPOSITION' }
  }
  return { sportType: 'GENERAL', sportGoal: 'GENERAL_FITNESS' }
}
