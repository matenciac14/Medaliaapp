/**
 * Domain use case — pure computation for gym session completion.
 *
 * Extracted from api/gym/session/complete/route.ts (PERF-04).
 * No Prisma imports, no Next.js. Receives pre-fetched maps, returns decisions.
 */

// ── Input types ───────────────────────────────────────────────────────────────

export type SetInput = {
  workoutExerciseId?: string
  exerciseName?: string | null
  setNumber: number
  weightKg: number | null
  repsCompleted: number | null
  completed: boolean
}

/** Maps workoutExerciseId → exerciseId */
export type WeToExIdMap = Map<string, string>

/** Maps workoutExerciseId → exercise name */
export type WeNameMap = Map<string, string>

/** Maps workoutExerciseId → planned set count */
export type WeSetsCountMap = Map<string, number>

/** Maps exercise name → current workoutExerciseId — used to recover orphan sets after template edits */
export type WeNameToWeIdMap = Map<string, string>

/** Maps exerciseId → historical max weight (kg) */
export type MaxPerExercise = Map<string, number>

/** Maps exercise name → historical max weight (kg) — for free sessions */
export type MaxPerFreeExerciseName = Map<string, number>

// ── Pure functions ────────────────────────────────────────────────────────────

/**
 * Returns true if a set with a workout exercise ID is a new PR.
 * Requires `weExIdMap` (workoutExerciseId → exerciseId) and `maxPerExercise` (exerciseId → max kg).
 */
export function isPRSet(
  weId: string | undefined,
  weightKg: number | null,
  completed: boolean,
  weExIdMap: WeToExIdMap,
  maxPerExercise: MaxPerExercise,
): boolean {
  if (!completed || weightKg === null || !weId) return false
  const exId = weExIdMap.get(weId)
  return exId ? weightKg > (maxPerExercise.get(exId) ?? 0) : false
}

/**
 * Returns true if a free-session set (identified by exercise name) is a new PR.
 */
export function isPRByName(
  exerciseName: string | null | undefined,
  weightKg: number | null,
  completed: boolean,
  maxPerFreeExerciseName: MaxPerFreeExerciseName,
): boolean {
  if (!completed || weightKg === null || !exerciseName) return false
  return weightKg > (maxPerFreeExerciseName.get(exerciseName) ?? 0)
}

// ── Progression ───────────────────────────────────────────────────────────────

export type ProgressionUpdate = {
  workoutExerciseId: string
  suggestedNextWeightKg: number
}

const PROGRESSION_UP_THRESHOLD   = 0.9  // >90% sets → +2.5 kg
const PROGRESSION_DOWN_THRESHOLD = 0.6  // <60% sets → −2.5 kg
const PROGRESSION_STEP_KG        = 2.5

/**
 * Computes weight progression suggestions per exercise.
 *   completedRatio > 90% → max weight + 2.5 kg
 *   completedRatio < 60% → max weight − 2.5 kg (floor 0)
 *   otherwise             → no suggestion
 *
 * `weNameToWeIdMap` is optional. When provided, orphan sets (workoutExerciseId=null
 * but exerciseName known) are recovered by looking up the current workoutExerciseId
 * for that exercise. This handles the case where the coach edited the template and
 * old WorkoutExercise records were deleted (onDelete: SetNull).
 */
export function computeProgressionUpdates(
  sets: SetInput[],
  weSetsCountMap: WeSetsCountMap,
  weNameToWeIdMap?: WeNameToWeIdMap,
): ProgressionUpdate[] {
  const byWeId = new Map<string, SetInput[]>()
  for (const s of sets) {
    let weId = s.workoutExerciseId
    // Recover orphan set: no workoutExerciseId but exerciseName maps to a current exercise
    if (!weId && s.exerciseName && weNameToWeIdMap) {
      weId = weNameToWeIdMap.get(s.exerciseName)
    }
    if (!weId) continue
    const arr = byWeId.get(weId) ?? []
    arr.push(s)
    byWeId.set(weId, arr)
  }

  const updates: ProgressionUpdate[] = []
  for (const [weId, weSets] of byWeId) {
    const targetSets    = weSetsCountMap.get(weId) ?? weSets.length
    const completedCount = weSets.filter(s => s.completed).length
    const ratio          = targetSets > 0 ? completedCount / targetSets : 0
    const weights        = weSets.map(s => s.weightKg ?? 0).filter(w => w > 0)
    if (weights.length === 0) continue
    const maxWeight = Math.max(...weights)

    if (ratio > PROGRESSION_UP_THRESHOLD) {
      updates.push({ workoutExerciseId: weId, suggestedNextWeightKg: maxWeight + PROGRESSION_STEP_KG })
    } else if (ratio < PROGRESSION_DOWN_THRESHOLD) {
      updates.push({ workoutExerciseId: weId, suggestedNextWeightKg: Math.max(maxWeight - PROGRESSION_STEP_KG, 0) })
    }
  }

  return updates
}

// ── Calorie estimation ────────────────────────────────────────────────────────

/**
 * Estimates calories burned from session duration and average calories-per-minute
 * across exercises. Falls back to 5 kcal/min (~MET 4 for strength, 70 kg person).
 */
export function estimateCalories(
  durMin: number | undefined,
  caloriesPerMinuteValues: (number | null | undefined)[],
): number | null {
  if (!durMin || durMin <= 0) return null
  const cpmValues = caloriesPerMinuteValues.filter((v): v is number => v != null)
  const avgCpm = cpmValues.length > 0
    ? cpmValues.reduce((a, b) => a + b, 0) / cpmValues.length
    : 5.0
  return Math.round(durMin * avgCpm)
}

// ── WeId sanitization ─────────────────────────────────────────────────────────

/**
 * Validates a workoutExerciseId against the locally-fetched maps.
 * Returns null when the ID is absent or not found in the DB-fetched maps —
 * preventing FK constraint errors when the coach deletes+recreates template exercises.
 */
export function sanitizeWeId(
  weId: string | undefined,
  weNameMap: WeNameMap,
  weExIdMap: WeToExIdMap,
): string | null {
  if (!weId) return null
  return weNameMap.has(weId) || weExIdMap.has(weId) ? weId : null
}

// ── PR summary ────────────────────────────────────────────────────────────────

export type PRRecord = {
  exerciseName: string | null
  weightKg: number | null
}

/** Collects new PRs from a list of sets using workoutExerciseId-based detection. */
export function collectPRsByWeId(
  sets: SetInput[],
  weNameMap: WeNameMap,
  weExIdMap: WeToExIdMap,
  maxPerExercise: MaxPerExercise,
): PRRecord[] {
  return sets
    .filter(s => isPRSet(s.workoutExerciseId, s.weightKg, s.completed, weExIdMap, maxPerExercise))
    .map(s => ({ exerciseName: weNameMap.get(s.workoutExerciseId ?? '') ?? null, weightKg: s.weightKg }))
}

/** Collects new PRs from a list of free-session sets using exercise-name-based detection. */
export function collectPRsByName(
  sets: SetInput[],
  maxPerFreeExerciseName: MaxPerFreeExerciseName,
): PRRecord[] {
  return sets
    .filter(s => isPRByName(s.exerciseName, s.weightKg, s.completed, maxPerFreeExerciseName))
    .map(s => ({ exerciseName: s.exerciseName ?? null, weightKg: s.weightKg }))
}
