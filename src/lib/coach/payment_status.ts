// PaymentStatus derivado — OVERDUE no existe en DB, se computa en presentación

type StoredStatus = 'PENDING' | 'PAID'
export type DisplayStatus = 'PENDING' | 'PAID' | 'OVERDUE'

export function getDisplayStatus(payment: { status: StoredStatus; dueDate: string | Date }): DisplayStatus {
  if (payment.status === 'PAID') return 'PAID'
  return new Date(payment.dueDate) < new Date() ? 'OVERDUE' : 'PENDING'
}
