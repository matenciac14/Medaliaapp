/**
 * Re-exports from infrastructure mapper so presentation components can continue
 * importing from this path without changes.
 *
 * The canonical implementation lives in:
 *   src/infrastructure/db/coach-athlete.mapper.ts
 */
export { mapCoachAthleteRelation as mapRelation, type MappedAthlete } from '@/infrastructure/db/coach-athlete.mapper'
