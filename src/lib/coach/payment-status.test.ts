import { describe, it, expect } from 'vitest'
import { getDisplayStatus } from './payment-status'

function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString()
}

describe('getDisplayStatus', () => {
  it('retorna PAID cuando status es PAID, sin importar dueDate', () => {
    expect(getDisplayStatus({ status: 'PAID', dueDate: daysFromNow(-30) })).toBe('PAID')
  })

  it('retorna PAID cuando status es PAID y dueDate es futuro', () => {
    expect(getDisplayStatus({ status: 'PAID', dueDate: daysFromNow(7) })).toBe('PAID')
  })

  it('retorna OVERDUE cuando PENDING y dueDate pasó', () => {
    expect(getDisplayStatus({ status: 'PENDING', dueDate: daysFromNow(-1) })).toBe('OVERDUE')
  })

  it('retorna PENDING cuando PENDING y dueDate es futuro', () => {
    expect(getDisplayStatus({ status: 'PENDING', dueDate: daysFromNow(7) })).toBe('PENDING')
  })

  it('acepta dueDate como objeto Date', () => {
    const past = new Date()
    past.setDate(past.getDate() - 5)
    expect(getDisplayStatus({ status: 'PENDING', dueDate: past })).toBe('OVERDUE')
  })

  it('acepta dueDate como string ISO', () => {
    expect(getDisplayStatus({ status: 'PENDING', dueDate: daysFromNow(30) })).toBe('PENDING')
  })
})
