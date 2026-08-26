'use client'

import type { AthleteData, HealthProfileData, ActivePlanData, CheckInData } from '../AthleteDetailClient'
import Stat from '../Stat'

type DailyLogEntry = { date: string; weightKg: number | null; energyLevel: number | null; hrResting: number | null; sleepHours: number | null }

const SPORT_LABELS: Record<string, string> = {
  RUNNING: 'Running', STRENGTH: 'Fuerza',
  CYCLING: 'Ciclismo', SWIMMING: 'Natación', TRIATHLON: 'Triatlón', FOOTBALL: 'Fútbol',
}

interface ResumenTabProps {
  athleteId: string
  athlete: AthleteData
  healthProfile: HealthProfileData
  activePlan: ActivePlanData
  activated: boolean
  togglingStatus: boolean
  handleToggleStatus: () => void
  resettingPwd: boolean
  resetLink: string | null
  pwdCopied: boolean
  handleResetPassword: () => void
  handleCopyPassword: () => void
  coachGoal: string
  setCoachGoal: (v: string) => void
  privateNotes: string
  setPrivateNotes: (v: string) => void
  savingCoachNotes: boolean
  coachNotesSaved: boolean
  handleSaveCoachNotes: () => void
  zones: { label: string; min: number; max: number }[]
  latestCheckIn: CheckInData | null
  checkInsSorted: CheckInData[]
  lastCheckInDaysAgo: number | null
  alerts: string[]
  dailyLogs: DailyLogEntry[]
}

function TrendSummary({ logs }: { logs: DailyLogEntry[] }) {
  const weights = logs.filter(l => l.weightKg != null).map(l => l.weightKg!)
  const energies = logs.filter(l => l.energyLevel != null).map(l => l.energyLevel!)
  const hrs = logs.filter(l => l.hrResting != null).map(l => l.hrResting!)
  const sleeps = logs.filter(l => l.sleepHours != null).map(l => l.sleepHours!)

  const avg = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : null
  const trend = (arr: number[]) => {
    if (arr.length < 2) return null
    const diff = arr[arr.length - 1] - arr[0]
    return diff > 0.2 ? 'up' : diff < -0.2 ? 'down' : 'stable'
  }
  const arrow = (t: string | null) => t === 'up' ? '\u2191' : t === 'down' ? '\u2193' : '\u2192'
  const trendColor = (t: string | null, upIsGood: boolean) => {
    if (!t || t === 'stable') return 'text-gray-500'
    return (t === 'up') === upIsGood ? 'text-green-600' : 'text-red-600'
  }

  const wFirst = weights[0]
  const wLast = weights[weights.length - 1]
  const wTrend = trend(weights)
  const eAvg = avg(energies)
  const eTrend = trend(energies)
  const hAvg = avg(hrs)
  const hTrend = trend(hrs)
  const sAvg = avg(sleeps)
  const sTrend = trend(sleeps)

  const items = [
    { label: 'Peso', value: weights.length >= 2 ? `${wFirst}\u2192${wLast} kg` : weights.length === 1 ? `${wLast} kg` : null, trend: wTrend, upIsGood: false },
    { label: 'Energia', value: eAvg != null ? `${eAvg.toFixed(1)} avg` : null, trend: eTrend, upIsGood: true },
    { label: 'FC rep.', value: hAvg != null ? `${Math.round(hAvg)} avg` : null, trend: hTrend, upIsGood: false },
    { label: 'Sueno', value: sAvg != null ? `${sAvg.toFixed(1)}h avg` : null, trend: sTrend, upIsGood: true },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {items.map(item => (
        <div key={item.label}>
          <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
          {item.value ? (
            <p className={`text-sm font-semibold ${trendColor(item.trend, item.upIsGood)}`}>
              {item.value} {arrow(item.trend)}
            </p>
          ) : (
            <p className="text-sm text-gray-300">—</p>
          )}
        </div>
      ))}
    </div>
  )
}

export default function ResumenTab({
  athleteId,
  athlete,
  healthProfile,
  activePlan,
  activated,
  togglingStatus,
  handleToggleStatus,
  resettingPwd,
  resetLink,
  pwdCopied,
  handleResetPassword,
  handleCopyPassword,
  coachGoal,
  setCoachGoal,
  privateNotes,
  setPrivateNotes,
  savingCoachNotes,
  coachNotesSaved,
  handleSaveCoachNotes,
  zones,
  latestCheckIn,
  checkInsSorted,
  lastCheckInDaysAgo,
  alerts,
  dailyLogs,
}: ResumenTabProps) {
  return (
    <div className="space-y-6">
      {/* Perfil */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Perfil del atleta</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <Stat label="Peso actual" value={healthProfile?.weightKg ? `${healthProfile.weightKg} kg` : '—'} />
          <Stat label="Peso objetivo" value={healthProfile?.weightGoalKg ? `${healthProfile.weightGoalKg} kg` : '—'} />
          <Stat label="FC reposo" value={healthProfile?.hrResting ? `${healthProfile.hrResting} bpm` : '—'} />
          <Stat
            label="Adherencia"
            value={latestCheckIn?.dietAdherencePct != null ? `${latestCheckIn.dietAdherencePct}%` : '—'}
          />
          <Stat label="Plan" value={activePlan ? activePlan.name : 'Sin plan activo'} />
          <Stat label="Semanas" value={activePlan ? `${activePlan.weeks.length}/${activePlan.totalWeeks}` : '—'} />
          <Stat label="Último check-in" value={lastCheckInDaysAgo !== null ? `Hace ${lastCheckInDaysAgo} días` : 'Sin datos'} />
          <Stat label="Email" value={athlete.email} />
          {healthProfile?.sport && (
            <Stat label="Deporte" value={SPORT_LABELS[healthProfile.sport] ?? healthProfile.sport} />
          )}
          {healthProfile?.experienceLevel && (
            <Stat label="Nivel" value={
              healthProfile.experienceLevel === 'BEGINNER' ? 'Principiante' :
              healthProfile.experienceLevel === 'INTERMEDIATE' ? 'Intermedio' :
              healthProfile.experienceLevel === 'ADVANCED' ? 'Avanzado' :
              healthProfile.experienceLevel
            } />
          )}
          {healthProfile?.ftp != null && (
            <Stat label="FTP" value={`${healthProfile.ftp} W`} />
          )}
          {latestCheckIn && (
            <>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Estrés (últ.)</p>
                <p className={`text-sm font-semibold ${latestCheckIn.stressLevel != null && latestCheckIn.stressLevel >= 7 ? 'text-red-600' : 'text-gray-800'}`}>
                  {latestCheckIn.stressLevel != null ? `${latestCheckIn.stressLevel}/10` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Motivación (últ.)</p>
                <p className={`text-sm font-semibold ${latestCheckIn.motivationLevel != null && latestCheckIn.motivationLevel <= 3 ? 'text-red-600' : 'text-gray-800'}`}>
                  {latestCheckIn.motivationLevel != null ? `${latestCheckIn.motivationLevel}/10` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Dolor (últ.)</p>
                <p className={`text-sm font-semibold ${latestCheckIn.painLevel != null && latestCheckIn.painLevel >= 5 ? 'text-red-600' : 'text-gray-800'}`}>
                  {latestCheckIn.painLevel != null ? `${latestCheckIn.painLevel}/10` : '—'}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tendencia 7 días + DailyLog */}
      {dailyLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Tendencia 7 días</h2>
          <TrendSummary logs={dailyLogs} />
          <div className="border-t border-gray-100 my-4" />
          <h3 className="text-sm font-medium text-gray-500 mb-3">Registros diarios</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Fecha', 'Peso', 'Energía', 'FC reposo', 'Sueño'].map(h => (
                    <th key={h} className="text-left py-2 pr-4 last:pr-0 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dailyLogs.map((log, i) => (
                  <tr key={i}>
                    <td className="py-2.5 pr-4 text-gray-700">{new Date(log.date).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                    <td className="py-2.5 pr-4 font-medium text-gray-900">{log.weightKg != null ? `${log.weightKg} kg` : '—'}</td>
                    <td className="py-2.5 pr-4">
                      {log.energyLevel != null ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${log.energyLevel >= 4 ? 'bg-green-100 text-green-700' : log.energyLevel >= 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {log.energyLevel}/5
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-700">{log.hrResting != null ? `${log.hrResting} bpm` : '—'}</td>
                    <td className="py-2.5 text-gray-700">{log.sleepHours != null ? `${log.sleepHours}h` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Activación / Pausa */}
      {!activated ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-800">Cuenta pendiente de activación</p>
            <p className="text-xs text-amber-600 mt-0.5">El asesorado no tiene acceso al dashboard hasta que lo actives. Recibirá todas las features Pro automáticamente.</p>
          </div>
          <button
            onClick={handleToggleStatus}
            disabled={togglingStatus}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 shrink-0"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            {togglingStatus ? 'Activando...' : 'Activar cuenta'}
          </button>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-green-800">Atleta activo — acceso Pro completo</p>
            <p className="text-xs text-green-600 mt-0.5">Pausar revierte las features al tier Free hasta que lo reactives.</p>
          </div>
          <button
            onClick={handleToggleStatus}
            disabled={togglingStatus}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 shrink-0 bg-red-500"
          >
            {togglingStatus ? 'Pausando...' : 'Pausar atleta'}
          </button>
        </div>
      )}

      {/* Reset contraseña */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">Contraseña del asesorado</p>
            <p className="text-xs text-gray-500 mt-0.5">Genera una nueva contraseña temporal si el atleta perdió acceso</p>
          </div>
          <button
            onClick={handleResetPassword}
            disabled={resettingPwd}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 shrink-0"
          >
            {resettingPwd ? 'Generando...' : 'Resetear contraseña'}
          </button>
        </div>
        {resetLink && (
          <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <span className="text-xs text-gray-500 shrink-0">Link de acceso:</span>
            <span className="text-xs text-[#1e3a5f] flex-1 truncate">Comparte este link con el atleta</span>
            <button
              onClick={handleCopyPassword}
              className="text-xs font-medium px-2 py-0.5 rounded transition-colors shrink-0"
              style={pwdCopied ? { backgroundColor: '#dcfce7', color: '#15803d' } : { backgroundColor: '#f3f4f6', color: '#374151' }}
            >
              {pwdCopied ? '✓ Copiado' : '📋'}
            </button>
          </div>
        )}
      </div>

      {/* Meta del coach + notas privadas */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Seguimiento del coach</h2>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Meta pactada con el atleta</label>
          <input
            type="text"
            value={coachGoal}
            onChange={(e) => setCoachGoal(e.target.value)}
            placeholder="ej. Bajar 5 kg en 16 semanas, completar 10K en menos de 50 min"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Notas privadas del coach <span className="text-gray-400">(el atleta no las ve)</span></label>
          <textarea
            rows={3}
            value={privateNotes}
            onChange={(e) => setPrivateNotes(e.target.value)}
            placeholder="Observaciones internas, contexto personal, historial de lesiones..."
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveCoachNotes}
            disabled={savingCoachNotes}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            {savingCoachNotes ? 'Guardando...' : 'Guardar'}
          </button>
          {coachNotesSaved && <span className="text-sm text-green-600">✓ Guardado</span>}
        </div>
      </div>

      {/* Lesiones y Condiciones médicas */}
      {healthProfile && (healthProfile.injuries.length > 0 || healthProfile.conditions.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          {healthProfile.injuries.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-700 mb-2">Lesiones</h3>
              <ul className="space-y-1">
                {healthProfile.injuries.map((injury, i) => (
                  <li key={i} className="text-sm text-gray-700">• {injury}</li>
                ))}
              </ul>
            </div>
          )}
          {healthProfile.injuries.length > 0 && healthProfile.conditions.length > 0 && (
            <div className="border-t border-gray-100" />
          )}
          {healthProfile.conditions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-700 mb-2">Condiciones médicas</h3>
              <ul className="space-y-1">
                {healthProfile.conditions.map((cond, i) => (
                  <li key={i} className="text-sm text-gray-700">• {cond}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Zonas FC */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Zonas de frecuencia cardíaca</h2>
        <div className="space-y-2">
          {zones.map((z, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: ['#93c5fd', '#4ade80', '#facc15', '#fb923c', '#f87171'][i] }}
              />
              <span className="text-gray-700 w-44">{z.label}</span>
              <span className="text-gray-500 font-mono text-xs">{z.min} – {z.max} bpm</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-5">
          <h2 className="font-semibold text-red-800 mb-3">Alertas activas</h2>
          <ul className="space-y-2">
            {alerts.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                <span>⚠</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Últimos check-ins tabla */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 overflow-x-auto">
        <h2 className="font-semibold text-gray-900 mb-4">Últimos check-ins</h2>
        {checkInsSorted.length === 0 ? (
          <p className="text-sm text-gray-400">Sin check-ins registrados aún.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="pb-2 font-medium">Semana</th>
                <th className="pb-2 font-medium">Peso</th>
                <th className="pb-2 font-medium">FC reposo</th>
                <th className="pb-2 font-medium">Sueño</th>
                <th className="pb-2 font-medium">Energía</th>
                <th className="pb-2 font-medium">Estrés</th>
                <th className="pb-2 font-medium">Motivación</th>
                <th className="pb-2 font-medium">Adherencia</th>
                <th className="pb-2 font-medium">RPE/Fatiga</th>
                <th className="pb-2 font-medium">Dolor</th>
                <th className="pb-2 font-medium">Ajustes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {checkInsSorted.map((c) => (
                <tr key={c.id}>
                  <td className="py-2.5 font-medium text-gray-700">S{c.weekNumber}</td>
                  <td className="py-2.5 text-gray-600">{c.weightKg != null ? `${c.weightKg} kg` : '—'}</td>
                  <td className="py-2.5 text-gray-600">{c.hrResting != null ? `${c.hrResting} bpm` : '—'}</td>
                  <td className="py-2.5 text-gray-600">{c.sleepScore != null ? `${c.sleepScore}/100` : '—'}</td>
                  <td className="py-2.5 text-gray-600">{c.energyLevel != null ? `${c.energyLevel}/10` : '—'}</td>
                  <td className="py-2.5">
                    {c.stressLevel != null ? (
                      <span className={c.stressLevel >= 7 ? 'text-red-600 font-semibold' : c.stressLevel >= 4 ? 'text-amber-600' : 'text-gray-600'}>
                        {c.stressLevel}/10
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-2.5">
                    {c.motivationLevel != null ? (
                      <span className={c.motivationLevel <= 3 ? 'text-red-600 font-semibold' : c.motivationLevel <= 6 ? 'text-amber-600' : 'text-green-600'}>
                        {c.motivationLevel}/10
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-2.5 text-gray-600">{c.dietAdherencePct != null ? `${c.dietAdherencePct}%` : '—'}</td>
                  <td className="py-2.5">
                    {c.hardestSessionRpe != null ? (
                      <span className={c.hardestSessionRpe >= 8 ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                        {c.hardestSessionRpe}/10
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-2.5">
                    {c.painLevel != null ? (
                      <span className={c.painLevel >= 5 ? 'text-red-600 font-semibold' : c.painLevel >= 3 ? 'text-amber-600' : 'text-gray-600'}>
                        {c.painLevel}/10
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-2.5">
                    {c.adjustmentsTriggered.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        {c.adjustmentsTriggered.length} ajuste{c.adjustmentsTriggered.length > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Log de ajustes automáticos */}
      {checkInsSorted.some((c) => c.adjustmentsTriggered.length > 0) && (
        <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5">
          <h2 className="font-semibold text-indigo-900 mb-3">Log de ajustes automáticos</h2>
          <p className="text-xs text-indigo-600 mb-4">El sistema ajustó el plan en base a los check-ins del atleta:</p>
          <ul className="space-y-3">
            {checkInsSorted
              .filter((c) => c.adjustmentsTriggered.length > 0)
              .map((c) => (
                <li key={c.id} className="bg-white rounded-lg p-3 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-indigo-700">Semana {c.weekNumber}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(c.recordedAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.adjustmentsTriggered.map((adj, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-800">{adj}</span>
                    ))}
                  </div>
                  {c.notes && (
                    <p className="text-xs text-gray-500 mt-2 italic">&quot;{c.notes}&quot;</p>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}
