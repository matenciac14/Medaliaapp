import { describe, it, expect } from 'vitest'
import {
  isPRSet,
  isPRByName,
  computeProgressionUpdates,
  collectPRsByWeId,
  collectPRsByName,
  type WeToExIdMap,
  type WeNameMap,
  type WeSetsCountMap,
  type WeNameToWeIdMap,
  type MaxPerExercise,
  type MaxPerFreeExerciseName,
  type SetInput,
} from './complete_gym_session.use_case'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const weExIdMap: WeToExIdMap = new Map([['we-1', 'ex-1'], ['we-2', 'ex-2']])
const weNameMap: WeNameMap = new Map([['we-1', 'Sentadilla'], ['we-2', 'Press banca']])
const maxPerExercise: MaxPerExercise = new Map([['ex-1', 100], ['ex-2', 80]])
const maxPerFree: MaxPerFreeExerciseName = new Map([['Peso muerto', 120]])

// ── isPRSet ───────────────────────────────────────────────────────────────────

describe('isPRSet', () => {
  it('returns true when weight > historical max', () => {
    expect(isPRSet('we-1', 110, true, weExIdMap, maxPerExercise)).toBe(true)
  })

  it('returns false when weight equals historical max', () => {
    expect(isPRSet('we-1', 100, true, weExIdMap, maxPerExercise)).toBe(false)
  })

  it('returns false when weight < historical max', () => {
    expect(isPRSet('we-1', 90, true, weExIdMap, maxPerExercise)).toBe(false)
  })

  it('returns false when not completed', () => {
    expect(isPRSet('we-1', 110, false, weExIdMap, maxPerExercise)).toBe(false)
  })

  it('returns false when weightKg is null', () => {
    expect(isPRSet('we-1', null, true, weExIdMap, maxPerExercise)).toBe(false)
  })

  it('returns false when weId is undefined', () => {
    expect(isPRSet(undefined, 110, true, weExIdMap, maxPerExercise)).toBe(false)
  })

  it('returns false when weId not in map', () => {
    expect(isPRSet('we-unknown', 200, true, weExIdMap, maxPerExercise)).toBe(false)
  })

  it('returns true when no historical max (new exercise)', () => {
    const emptyMax: MaxPerExercise = new Map()
    expect(isPRSet('we-1', 50, true, weExIdMap, emptyMax)).toBe(true)
  })
})

// ── isPRByName ────────────────────────────────────────────────────────────────

describe('isPRByName', () => {
  it('returns true when weight > historical max', () => {
    expect(isPRByName('Peso muerto', 130, true, maxPerFree)).toBe(true)
  })

  it('returns false when weight <= historical max', () => {
    expect(isPRByName('Peso muerto', 120, true, maxPerFree)).toBe(false)
  })

  it('returns false when not completed', () => {
    expect(isPRByName('Peso muerto', 130, false, maxPerFree)).toBe(false)
  })

  it('returns false when exerciseName is null', () => {
    expect(isPRByName(null, 130, true, maxPerFree)).toBe(false)
  })

  it('returns true when exercise not seen before', () => {
    expect(isPRByName('Ejercicio nuevo', 50, true, maxPerFree)).toBe(true)
  })
})

// ── computeProgressionUpdates ─────────────────────────────────────────────────

describe('computeProgressionUpdates', () => {
  const weSetsCountMap: WeSetsCountMap = new Map([['we-1', 3]])

  it('suggests max+2.5 when all sets completed', () => {
    const sets: SetInput[] = [
      { workoutExerciseId: 'we-1', setNumber: 1, weightKg: 100, repsCompleted: 8, completed: true },
      { workoutExerciseId: 'we-1', setNumber: 2, weightKg: 102, repsCompleted: 8, completed: true },
      { workoutExerciseId: 'we-1', setNumber: 3, weightKg: 100, repsCompleted: 8, completed: true },
    ]
    const updates = computeProgressionUpdates(sets, weSetsCountMap)
    expect(updates).toHaveLength(1)
    expect(updates[0].workoutExerciseId).toBe('we-1')
    expect(updates[0].suggestedNextWeightKg).toBe(104.5) // 102 + 2.5
  })

  it('suggests max+2.5 when >90% sets completed (2/3 = 66% — no change)', () => {
    // 2/3 = 66% → between thresholds → no suggestion
    const sets: SetInput[] = [
      { workoutExerciseId: 'we-1', setNumber: 1, weightKg: 100, repsCompleted: 8, completed: true },
      { workoutExerciseId: 'we-1', setNumber: 2, weightKg: 100, repsCompleted: 0, completed: false },
      { workoutExerciseId: 'we-1', setNumber: 3, weightKg: 100, repsCompleted: 8, completed: true },
    ]
    expect(computeProgressionUpdates(sets, weSetsCountMap)).toHaveLength(0)
  })

  it('suggests max-2.5 when <60% sets completed (1/3 = 33%)', () => {
    const sets: SetInput[] = [
      { workoutExerciseId: 'we-1', setNumber: 1, weightKg: 100, repsCompleted: 8, completed: true },
      { workoutExerciseId: 'we-1', setNumber: 2, weightKg: 100, repsCompleted: 0, completed: false },
      { workoutExerciseId: 'we-1', setNumber: 3, weightKg: 100, repsCompleted: 0, completed: false },
    ]
    const updates = computeProgressionUpdates(sets, weSetsCountMap)
    expect(updates).toHaveLength(1)
    expect(updates[0].suggestedNextWeightKg).toBe(97.5) // 100 - 2.5
  })

  it('floors suggested weight at 0 when decrement would go negative', () => {
    const sets: SetInput[] = [
      { workoutExerciseId: 'we-1', setNumber: 1, weightKg: 2, repsCompleted: 0, completed: false },
      { workoutExerciseId: 'we-1', setNumber: 2, weightKg: 2, repsCompleted: 0, completed: false },
      { workoutExerciseId: 'we-1', setNumber: 3, weightKg: 2, repsCompleted: 0, completed: false },
    ]
    const updates = computeProgressionUpdates(sets, weSetsCountMap)
    expect(updates).toHaveLength(1)
    expect(updates[0].suggestedNextWeightKg).toBe(0)
  })

  it('returns empty when fewer sets than planned', () => {
    const sets: SetInput[] = [
      { workoutExerciseId: 'we-1', setNumber: 1, weightKg: 100, repsCompleted: 8, completed: true },
    ]
    // 1/3 = 33% → down, but only 1 set submitted — still qualifies for down rule
    const updates = computeProgressionUpdates(sets, weSetsCountMap)
    expect(updates).toHaveLength(1)
    expect(updates[0].suggestedNextWeightKg).toBe(97.5)
  })

  it('ignores sets without workoutExerciseId when no name map provided', () => {
    const sets: SetInput[] = [
      { exerciseName: 'Libre', setNumber: 1, weightKg: 50, repsCompleted: 10, completed: true },
    ]
    expect(computeProgressionUpdates(sets, weSetsCountMap)).toHaveLength(0)
  })

  // GYM-GAP-05: orphan sets (workoutExerciseId=null after template edit) recovered via name map
  describe('with weNameToWeIdMap (orphan recovery)', () => {
    const weNameToWeIdMap: WeNameToWeIdMap = new Map([['Sentadilla', 'we-1']])

    it('recovers orphan set and computes progression when all sets completed', () => {
      const sets: SetInput[] = [
        { exerciseName: 'Sentadilla', setNumber: 1, weightKg: 100, repsCompleted: 8, completed: true },
        { exerciseName: 'Sentadilla', setNumber: 2, weightKg: 102, repsCompleted: 8, completed: true },
        { exerciseName: 'Sentadilla', setNumber: 3, weightKg: 100, repsCompleted: 8, completed: true },
      ]
      const updates = computeProgressionUpdates(sets, weSetsCountMap, weNameToWeIdMap)
      expect(updates).toHaveLength(1)
      expect(updates[0].workoutExerciseId).toBe('we-1')
      expect(updates[0].suggestedNextWeightKg).toBe(104.5)
    })

    it('recovers orphan set and suggests decrease when <60% completed', () => {
      const sets: SetInput[] = [
        { exerciseName: 'Sentadilla', setNumber: 1, weightKg: 100, repsCompleted: 8, completed: true },
        { exerciseName: 'Sentadilla', setNumber: 2, weightKg: 100, repsCompleted: 0, completed: false },
        { exerciseName: 'Sentadilla', setNumber: 3, weightKg: 100, repsCompleted: 0, completed: false },
      ]
      const updates = computeProgressionUpdates(sets, weSetsCountMap, weNameToWeIdMap)
      expect(updates).toHaveLength(1)
      expect(updates[0].workoutExerciseId).toBe('we-1')
      expect(updates[0].suggestedNextWeightKg).toBe(97.5)
    })

    it('ignores orphan set with unknown exerciseName', () => {
      const sets: SetInput[] = [
        { exerciseName: 'Ejercicio desconocido', setNumber: 1, weightKg: 80, repsCompleted: 8, completed: true },
      ]
      expect(computeProgressionUpdates(sets, weSetsCountMap, weNameToWeIdMap)).toHaveLength(0)
    })

    it('mixes orphan and non-orphan sets correctly', () => {
      const mixedWeSetsCountMap: WeSetsCountMap = new Map([['we-1', 2], ['we-2', 2]])
      const mixedNameMap: WeNameToWeIdMap = new Map([['Sentadilla', 'we-1']])
      const sets: SetInput[] = [
        // Non-orphan (has workoutExerciseId)
        { workoutExerciseId: 'we-2', setNumber: 1, weightKg: 80, repsCompleted: 8, completed: true },
        { workoutExerciseId: 'we-2', setNumber: 2, weightKg: 80, repsCompleted: 8, completed: true },
        // Orphan (no workoutExerciseId, has exerciseName)
        { exerciseName: 'Sentadilla', setNumber: 1, weightKg: 100, repsCompleted: 8, completed: true },
        { exerciseName: 'Sentadilla', setNumber: 2, weightKg: 100, repsCompleted: 8, completed: true },
      ]
      const updates = computeProgressionUpdates(sets, mixedWeSetsCountMap, mixedNameMap)
      expect(updates).toHaveLength(2)
      expect(updates.map(u => u.workoutExerciseId).sort()).toEqual(['we-1', 'we-2'])
    })
  })
})

// ── collectPRsByWeId ──────────────────────────────────────────────────────────

describe('collectPRsByWeId', () => {
  it('returns PRs for sets with weight > max', () => {
    const sets: SetInput[] = [
      { workoutExerciseId: 'we-1', setNumber: 1, weightKg: 110, repsCompleted: 5, completed: true },
      { workoutExerciseId: 'we-2', setNumber: 1, weightKg: 75, repsCompleted: 5, completed: true },
    ]
    const prs = collectPRsByWeId(sets, weNameMap, weExIdMap, maxPerExercise)
    expect(prs).toHaveLength(1)
    expect(prs[0].exerciseName).toBe('Sentadilla')
    expect(prs[0].weightKg).toBe(110)
  })

  it('returns empty when no PRs', () => {
    const sets: SetInput[] = [
      { workoutExerciseId: 'we-1', setNumber: 1, weightKg: 90, repsCompleted: 5, completed: true },
    ]
    expect(collectPRsByWeId(sets, weNameMap, weExIdMap, maxPerExercise)).toHaveLength(0)
  })
})

// ── collectPRsByName ──────────────────────────────────────────────────────────

describe('collectPRsByName', () => {
  it('returns PRs for free-session sets with weight > max', () => {
    const sets: SetInput[] = [
      { exerciseName: 'Peso muerto', setNumber: 1, weightKg: 130, repsCompleted: 3, completed: true },
      { exerciseName: 'Peso muerto', setNumber: 2, weightKg: 115, repsCompleted: 3, completed: true },
    ]
    const prs = collectPRsByName(sets, maxPerFree)
    expect(prs).toHaveLength(1)
    expect(prs[0].exerciseName).toBe('Peso muerto')
    expect(prs[0].weightKg).toBe(130)
  })

  it('returns empty for uncompleted sets', () => {
    const sets: SetInput[] = [
      { exerciseName: 'Peso muerto', setNumber: 1, weightKg: 140, repsCompleted: 0, completed: false },
    ]
    expect(collectPRsByName(sets, maxPerFree)).toHaveLength(0)
  })
})
