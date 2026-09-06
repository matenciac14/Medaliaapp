'use client'

import { useState, useEffect, useCallback } from 'react'
import { KpiCard } from '@/app/_components/kpi_card'
import { getDisplayStatus } from '@/lib/coach/payment_status'
import type { DisplayStatus } from '@/lib/coach/payment_status'
import { formatCurrency as fmt } from '@/lib/utils/format_currency'

// ─── Types ───────────────────────────────────────────────────────────────────

type StoredStatus = 'PENDING' | 'PAID'

type Payment = {
  id: string
  athleteId: string
  amount: number
  currency: string
  description: string | null
  dueDate: string
  paidAt: string | null
  status: StoredStatus
  notes: string | null
  createdAt: string
  athlete: { id: string; name: string | null; email: string }
}

type Athlete = {
  id: string
  name: string | null
  email: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<DisplayStatus, { label: string; bg: string; text: string }> = {
  PENDING:  { label: 'Pendiente', bg: '#fef9c3', text: '#854d0e' },
  PAID:     { label: 'Pagado',    bg: '#dcfce7', text: '#166534' },
  OVERDUE:  { label: 'Vencido',   bg: '#fee2e2', text: '#991b1b' },
}


function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FinanzasPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Form state
  const [athleteId, setAthleteId] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('COP')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')

  // Filters
  const [filterStatus, setFilterStatus] = useState<DisplayStatus | 'ALL'>('ALL')
  const [filterAthlete, setFilterAthlete] = useState<string>('ALL')

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/coach/payments')
    const data = await res.json()
    setPayments(data.payments ?? [])
    setLoading(false)
  }, [])

  const fetchAthletes = useCallback(async () => {
    const res = await fetch('/api/coach/dashboard/athletes')
    const data = await res.json()
    // mapRelation returns {id, name, email, ...}
    setAthletes((data.athletes ?? []).map((a: { id: string; name: string; email: string }) => ({
      id: a.id, name: a.name, email: a.email,
    })))
  }, [])

  useEffect(() => {
    fetchPayments()
    fetchAthletes()
  }, [fetchPayments, fetchAthletes])

  async function handleCreate() {
    if (!athleteId || !amount || !dueDate) {
      setFormError('Completa todos los campos obligatorios.')
      return
    }
    setSaving(true)
    setFormError(null)
    const res = await fetch('/api/coach/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        athleteId, amount: Number(amount), currency, description: description.trim() || undefined,
        dueDate, notes: notes.trim() || undefined,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setFormError(data.error ?? 'Error al guardar.')
    } else {
      setPayments(prev => [data.payment, ...prev])
      setShowForm(false)
      setAthleteId(''); setAmount(''); setDescription(''); setDueDate(''); setNotes('')
    }
    setSaving(false)
  }

  async function handleMarkPaid(paymentId: string) {
    const res = await fetch(`/api/coach/payments/${paymentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PAID' }),
    })
    const data = await res.json()
    if (res.ok) {
      setPayments(prev => prev.map(p => p.id === paymentId ? data.payment : p))
    }
  }

  async function handleDelete(paymentId: string) {
    const res = await fetch(`/api/coach/payments/${paymentId}`, { method: 'DELETE' })
    if (res.ok) setPayments(prev => prev.filter(p => p.id !== paymentId))
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const overdue  = payments.filter(p => getDisplayStatus(p) === 'OVERDUE')
  const pending  = payments.filter(p => getDisplayStatus(p) === 'PENDING')
  const paid     = payments.filter(p => p.status === 'PAID')
  const totalOverdue  = overdue.reduce((s, p) => s + Number(p.amount), 0)
  const totalPending  = pending.reduce((s, p) => s + Number(p.amount), 0)
  const totalPaidMonth = paid
    .filter(p => p.paidAt && new Date(p.paidAt).getMonth() === new Date().getMonth())
    .reduce((s, p) => s + Number(p.amount), 0)

  const byAthlete = filterAthlete === 'ALL' ? payments : payments.filter(p => p.athleteId === filterAthlete)
  const filtered  = filterStatus  === 'ALL' ? byAthlete : byAthlete.filter(p => getDisplayStatus(p) === filterStatus)

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto" style={{ backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Finanzas</h1>
          <p className="text-sm text-gray-400 mt-0.5">Registro de pagos por atleta</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setFormError(null) }}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          {showForm ? 'Cancelar' : '+ Registrar pago'}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <KpiCard
          label="Vencido"
          value={overdue.length > 0 ? fmt(totalOverdue, 'COP') : '—'}
          sub={`${overdue.length} pago${overdue.length !== 1 ? 's' : ''}`}
          color="#dc2626"
          center
        />
        <KpiCard
          label="Pendiente"
          value={pending.length > 0 ? fmt(totalPending, 'COP') : '—'}
          sub={`${pending.length} pago${pending.length !== 1 ? 's' : ''}`}
          color="#854d0e"
          center
        />
        <KpiCard
          label="Cobrado (mes)"
          value={totalPaidMonth > 0 ? fmt(totalPaidMonth, 'COP') : '—'}
          sub={`${paid.length} total`}
          color="#166534"
          center
        />
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nuevo pago</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1.5">Atleta *</label>
              <select
                value={athleteId}
                onChange={e => setAthleteId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
              >
                <option value="">Seleccionar atleta</option>
                {athletes.map(a => (
                  <option key={a.id} value={a.id}>{a.name ?? a.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Monto *</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="150000"
                min="1"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Moneda</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
              >
                <option value="COP">COP</option>
                <option value="USD">USD</option>
                <option value="MXN">MXN</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Fecha vencimiento *</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Descripción</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ej: Mensualidad junio"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Notas internas</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Pago en efectivo, transferencia, etc."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
            />
          </div>
          {formError && <p className="text-xs text-red-500">{formError}</p>}
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#ea580c' }}
            >
              {saving ? 'Guardando...' : 'Guardar pago'}
            </button>
          </div>
        </div>
      )}

      {/* Athlete filter */}
      {athletes.length > 1 && (
        <div className="mb-3">
          <select
            value={filterAthlete}
            onChange={e => setFilterAthlete(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
          >
            <option value="ALL">Todos los atletas</option>
            {athletes.map(a => (
              <option key={a.id} value={a.id}>{a.name ?? a.email}</option>
            ))}
          </select>
        </div>
      )}

      {/* Status filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['ALL', 'OVERDUE', 'PENDING', 'PAID'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
            style={filterStatus === s
              ? { backgroundColor: '#1e3a5f', color: 'white', borderColor: '#1e3a5f' }
              : { backgroundColor: 'white', color: '#6b7280', borderColor: '#e5e7eb' }
            }
          >
            {s === 'ALL' ? 'Todos' : STATUS_CONFIG[s].label}
            {s !== 'ALL' && (
              <span className="ml-1.5 opacity-70">
                ({s === 'OVERDUE' ? overdue.length : s === 'PENDING' ? pending.length : paid.length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading && (
        <div className="text-center py-16 text-gray-400 text-sm">Cargando pagos...</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center shadow-sm">
          <div className="text-4xl mb-3">💳</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">Sin registros</h2>
          <p className="text-gray-400 text-sm">
            {filterStatus === 'ALL'
              ? 'Registra el primer pago para hacer seguimiento de tus cobros.'
              : `No hay pagos con estado "${STATUS_CONFIG[filterStatus as DisplayStatus]?.label}".`}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filtered.map(p => {
              const cfg = STATUS_CONFIG[getDisplayStatus(p)]
              return (
                <div key={p.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {p.athlete.name ?? p.athlete.email}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: cfg.bg, color: cfg.text }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-base font-black" style={{ color: '#ea580c' }}>
                        {fmt(p.amount, p.currency)}
                      </span>
                      {p.description && (
                        <span className="text-xs text-gray-400">· {p.description}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-400">
                        Vence: {fmtDate(p.dueDate)}
                      </span>
                      {p.paidAt && (
                        <span className="text-xs text-green-600">· Pagado: {fmtDate(p.paidAt)}</span>
                      )}
                      {p.notes && (
                        <span className="text-xs text-gray-400">· {p.notes}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.status !== 'PAID' && (
                      <button
                        onClick={() => handleMarkPaid(p.id)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-green-50"
                        style={{ borderColor: '#16a34a', color: '#16a34a' }}
                      >
                        Marcar pagado
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
