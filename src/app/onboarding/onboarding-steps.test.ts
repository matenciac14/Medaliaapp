import { describe, it, expect } from 'vitest'
import { getSteps, isStepValid, INITIAL_DATA, type WizardData } from './_types'

function make(overrides: Partial<WizardData>): WizardData {
  return { ...INITIAL_DATA, ...overrides }
}

// ---------------------------------------------------------------------------
// getSteps — estado inicial
// ---------------------------------------------------------------------------
describe('getSteps — estado inicial', () => {
  it('solo goal si no hay activityType', () => {
    expect(getSteps(INITIAL_DATA)).toEqual(['goal'])
  })
})

// ---------------------------------------------------------------------------
// getSteps — flujos por activityType
// ---------------------------------------------------------------------------
describe('getSteps — activityType FREE', () => {
  it('goal → profile → generating', () => {
    const data = make({ activityType: 'FREE', age: 30, heightCm: 170, weightKg: 70, gender: 'male' })
    expect(getSteps(data)).toEqual(['goal', 'profile', 'generating'])
  })

  it('se detiene en profile si faltan datos físicos', () => {
    const data = make({ activityType: 'FREE' })
    expect(getSteps(data)).toEqual(['goal', 'profile'])
  })
})

describe('getSteps — activityType RUNNING', () => {
  it('se detiene en goal si falta runningGoal', () => {
    const data = make({ activityType: 'RUNNING' })
    expect(getSteps(data)).toEqual(['goal'])
  })

  it('goal → profile → generating con runningGoal y datos completos', () => {
    const data = make({ activityType: 'RUNNING', runningGoal: 'GENERAL_FITNESS', age: 28, heightCm: 175, weightKg: 68, gender: 'female' })
    expect(getSteps(data)).toEqual(['goal', 'profile', 'generating'])
  })
})

describe('getSteps — activityType GYM', () => {
  it('se detiene en goal si falta gymGoal', () => {
    const data = make({ activityType: 'GYM' })
    expect(getSteps(data)).toEqual(['goal'])
  })

  it('goal → profile → generating con gymGoal y datos completos', () => {
    const data = make({ activityType: 'GYM', gymGoal: 'MUSCLE_GAIN', age: 25, heightCm: 180, weightKg: 80, gender: 'male' })
    expect(getSteps(data)).toEqual(['goal', 'profile', 'generating'])
  })
})

describe('getSteps — activityType BOTH', () => {
  it('se detiene en goal si falta gymGoal', () => {
    const data = make({ activityType: 'BOTH' })
    expect(getSteps(data)).toEqual(['goal'])
  })

  it('se detiene en goal si falta runningGoal', () => {
    const data = make({ activityType: 'BOTH', gymGoal: 'RECOMPOSITION' })
    expect(getSteps(data)).toEqual(['goal'])
  })

  it('goal → profile → generating con gymGoal + runningGoal y datos completos', () => {
    const data = make({ activityType: 'BOTH', gymGoal: 'RECOMPOSITION', runningGoal: 'RACE_5K', age: 30, heightCm: 165, weightKg: 60, gender: 'female' })
    expect(getSteps(data)).toEqual(['goal', 'profile', 'generating'])
  })
})

// ---------------------------------------------------------------------------
// getSteps — invariantes
// ---------------------------------------------------------------------------
describe('getSteps — invariantes', () => {
  it('goal siempre es el primer paso', () => {
    const cases = [
      INITIAL_DATA,
      make({ activityType: 'FREE' }),
      make({ activityType: 'RUNNING', runningGoal: 'GENERAL_FITNESS', age: 25, heightCm: 170, weightKg: 65, gender: 'male' }),
      make({ activityType: 'GYM', gymGoal: 'FAT_LOSS', age: 25, heightCm: 170, weightKg: 65, gender: 'male' }),
    ]
    cases.forEach((data) => {
      expect(getSteps(data)[0]).toBe('goal')
    })
  })

  it('generating siempre es el último cuando los datos están completos', () => {
    const cases = [
      make({ activityType: 'FREE',    age: 30, heightCm: 170, weightKg: 70, gender: 'male' }),
      make({ activityType: 'RUNNING', runningGoal: 'RACE_10K', age: 30, heightCm: 170, weightKg: 70, gender: 'female' }),
      make({ activityType: 'GYM',  gymGoal: 'MUSCLE_GAIN', age: 30, heightCm: 170, weightKg: 70, gender: 'male' }),
      make({ activityType: 'BOTH', gymGoal: 'FAT_LOSS', runningGoal: 'GENERAL_FITNESS', age: 30, heightCm: 170, weightKg: 70, gender: 'female' }),
    ]
    cases.forEach((data) => {
      const steps = getSteps(data)
      expect(steps[steps.length - 1]).toBe('generating')
    })
  })

  it('siempre tiene exactamente 3 pasos cuando está completo', () => {
    const data = make({ activityType: 'RUNNING', runningGoal: 'GENERAL_FITNESS', age: 25, heightCm: 170, weightKg: 65, gender: 'male' })
    expect(getSteps(data)).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// isStepValid
// ---------------------------------------------------------------------------
describe('isStepValid — goal', () => {
  it('false si activityType es null', () => {
    expect(isStepValid('goal', INITIAL_DATA)).toBe(false)
  })

  it('false si GYM sin gymGoal', () => {
    expect(isStepValid('goal', make({ activityType: 'GYM' }))).toBe(false)
    expect(isStepValid('goal', make({ activityType: 'BOTH' }))).toBe(false)
  })

  it('false si RUNNING sin runningGoal', () => {
    expect(isStepValid('goal', make({ activityType: 'RUNNING' }))).toBe(false)
  })

  it('true si FREE', () => {
    expect(isStepValid('goal', make({ activityType: 'FREE' }))).toBe(true)
  })

  it('true si RUNNING con runningGoal', () => {
    expect(isStepValid('goal', make({ activityType: 'RUNNING', runningGoal: 'GENERAL_FITNESS' }))).toBe(true)
  })

  it('true si GYM con gymGoal', () => {
    expect(isStepValid('goal', make({ activityType: 'GYM', gymGoal: 'FAT_LOSS' }))).toBe(true)
  })
})

describe('isStepValid — profile', () => {
  it('false si faltan datos obligatorios', () => {
    expect(isStepValid('profile', make({ age: 30, heightCm: 170, weightKg: 70 }))).toBe(false) // falta gender
    expect(isStepValid('profile', make({ age: 30, heightCm: 170, gender: 'male' }))).toBe(false) // falta weightKg
  })

  it('true si todos los datos obligatorios están', () => {
    expect(isStepValid('profile', make({ age: 25, heightCm: 170, weightKg: 65, gender: 'female' }))).toBe(true)
  })

  it('true aunque weightGoalKg y experienceLevel sean null', () => {
    const data = make({ age: 25, heightCm: 170, weightKg: 65, gender: 'male', weightGoalKg: null, experienceLevel: null })
    expect(isStepValid('profile', data)).toBe(true)
  })
})
