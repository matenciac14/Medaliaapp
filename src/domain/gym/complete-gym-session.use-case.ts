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

/**
 * Computes weight progression suggestions for exercises where all planned sets were completed.
 * Suggestion = max weight lifted + 2.5 kg.
 */
export function computeProgressionUpdates(
  sets: SetInput[],
  weSetsCountMap: WeSetsCountMap,
): ProgressionUpdate[] {
  const byWeId = new Map<string, SetInput[]>()
  for (const s of sets) {
    if (!s.workoutExerciseId) continue
    const arr = byWeId.get(s.workoutExerciseId) ?? []
    arr.push(s)
    byWeId.set(s.workoutExerciseId, arr)
  }

  const updates: ProgressionUpdate[] = []
  for (const [weId, weSets] of byWeId) {
    const targetSets = weSetsCountMap.get(weId) ?? weSets.length
    const allDone = weSets.length >= targetSets && weSets.every(s => s.completed)
    if (!allDone) continue
    const weights = weSets.map(s => s.weightKg ?? 0).filter(w => w > 0)
    if (weights.length === 0) continue
    updates.push({ workoutExerciseId: weId, suggestedNextWeightKg: Math.max(...weights) + 2.5 })
  }

  return updates
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
