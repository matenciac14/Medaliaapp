'use client'

type BenchmarkItem = {
  id: string; userId: string; coachId: string | null
  sport: string; metric: string; value: number; unit: string
  testedAt: string; notes: string | null; createdAt: string
}

const SPORT_LABELS: Record<string, string> = {
  RUNNING: 'Running', STRENGTH: 'Fuerza',
  CYCLING: 'Ciclismo', SWIMMING: 'Natación', TRIATHLON: 'Triatlón', FOOTBALL: 'Fútbol',
}

const METRIC_OPTIONS: Record<string, { metric: string; label: string; unit: string }[]> = {
  RUNNING:  [
    { metric: '5K_TIME',            label: '5K',            unit: 'seconds' },
    { metric: '10K_TIME',           label: '10K',           unit: 'seconds' },
    { metric: 'HALF_MARATHON_TIME', label: 'Media Maratón', unit: 'seconds' },
    { metric: 'MARATHON_TIME',      label: 'Maratón',       unit: 'seconds' },
  ],
  STRENGTH: [
    { metric: '1RM_SQUAT',    label: '1RM Sentadilla',  unit: 'kg' },
    { metric: '1RM_DEADLIFT', label: '1RM Peso muerto', unit: 'kg' },
    { metric: '1RM_BENCH',    label: '1RM Press banca', unit: 'kg' },
  ],
}

const METRIC_LABELS: Record<string, string> = {
  '5K_TIME': '5K', '10K_TIME': '10K', 'HALF_MARATHON_TIME': 'Media Maratón',
  'MARATHON_TIME': 'Maratón', 'FTP_WATTS': 'FTP', 'CSS_PACE': 'CSS Pace',
  '1RM_SQUAT': '1RM Sentadilla', '1RM_DEADLIFT': '1RM Peso muerto', '1RM_BENCH': '1RM Press banca',
}

interface BenchmarksTabProps {
  benchmarks: BenchmarkItem[]
  benchmarksLoading: boolean
  showBenchmarkForm: boolean
  setShowBenchmarkForm: (v: boolean) => void
  benchmarkSport: string
  setBenchmarkSport: (v: string) => void
  benchmarkMetric: string
  setBenchmarkMetric: (v: string) => void
  benchmarkValueStr: string
  setBenchmarkValueStr: (v: string) => void
  benchmarkDate: string
  setBenchmarkDate: (v: string) => void
  benchmarkNotes: string
  setBenchmarkNotes: (v: string) => void
  savingBenchmark: boolean
  handleAddBenchmark: () => void
  handleDeleteBenchmark: (id: string) => void
  formatBenchmarkValue: (value: number, unit: string, metric?: string) => string
}

export default function BenchmarksTab({
  benchmarks,
  benchmarksLoading,
  showBenchmarkForm,
  setShowBenchmarkForm,
  benchmarkSport,
  setBenchmarkSport,
  benchmarkMetric,
  setBenchmarkMetric,
  benchmarkValueStr,
  setBenchmarkValueStr,
  benchmarkDate,
  setBenchmarkDate,
  benchmarkNotes,
  setBenchmarkNotes,
  savingBenchmark,
  handleAddBenchmark,
  handleDeleteBenchmark,
  formatBenchmarkValue,
}: BenchmarksTabProps) {
  return (
    <div className="space-y-5">
      {/* Header + add button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Tests de rendimiento</h2>
          <p className="text-xs text-gray-400 mt-0.5">Registra PBs, FTP, 1RM y otros marcadores del atleta</p>
        </div>
        <button
          onClick={() => setShowBenchmarkForm(!showBenchmarkForm)}
          className="text-sm font-semibold px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          {showBenchmarkForm ? 'Cancelar' : '+ Registrar test'}
        </button>
      </div>

      {/* Add form */}
      {showBenchmarkForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nuevo benchmark</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Deporte</label>
              <select
                value={benchmarkSport}
                onChange={e => { setBenchmarkSport(e.target.value); setBenchmarkMetric(METRIC_OPTIONS[e.target.value]?.[0]?.metric ?? '') }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
              >
                {Object.entries(SPORT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Métrica</label>
              <select
                value={benchmarkMetric}
                onChange={e => setBenchmarkMetric(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
              >
                {(METRIC_OPTIONS[benchmarkSport] ?? []).map(m => (
                  <option key={m.metric} value={m.metric}>{METRIC_LABELS[m.metric] ?? m.metric}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">
                Valor {METRIC_OPTIONS[benchmarkSport]?.find(m => m.metric === benchmarkMetric)?.unit === 'seconds'
                  ? '(MM:SS o HH:MM:SS)' : METRIC_OPTIONS[benchmarkSport]?.find(m => m.metric === benchmarkMetric)?.unit === 'watts' ? '(vatios)' : '(kg)'}
              </label>
              <input
                type="text"
                value={benchmarkValueStr}
                onChange={e => setBenchmarkValueStr(e.target.value)}
                placeholder={METRIC_OPTIONS[benchmarkSport]?.find(m => m.metric === benchmarkMetric)?.unit === 'seconds' ? '25:30' : '0'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Fecha del test</label>
              <input
                type="date"
                value={benchmarkDate}
                onChange={e => setBenchmarkDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Notas (opcional)</label>
            <input
              type="text"
              value={benchmarkNotes}
              onChange={e => setBenchmarkNotes(e.target.value)}
              placeholder="Ej: pista oficial, altitud 1600m"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleAddBenchmark}
              disabled={savingBenchmark || !benchmarkValueStr}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#ea580c' }}
            >
              {savingBenchmark ? 'Guardando...' : 'Guardar benchmark'}
            </button>
          </div>
        </div>
      )}

      {benchmarksLoading && <div className="text-center py-16 text-gray-400 text-sm">Cargando benchmarks...</div>}

      {!benchmarksLoading && benchmarks.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center shadow-sm">
          <div className="text-4xl mb-3">📊</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">Sin benchmarks</h2>
          <p className="text-gray-400 text-sm">Registra los primeros tests del atleta para hacer seguimiento de su rendimiento</p>
        </div>
      )}

      {!benchmarksLoading && benchmarks.length > 0 && (() => {
        const grouped: Record<string, BenchmarkItem[]> = {}
        for (const b of benchmarks) {
          if (!grouped[b.sport]) grouped[b.sport] = []
          grouped[b.sport].push(b)
        }
        return Object.entries(grouped).map(([sport, items]) => (
          <div key={sport} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-sm font-semibold text-gray-700">{SPORT_LABELS[sport] ?? sport}</p>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map(b => (
                <div key={b.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {METRIC_LABELS[b.metric] ?? b.metric}
                      </span>
                      <span className="text-base font-black text-[#ea580c]">
                        {formatBenchmarkValue(b.value, b.unit, b.metric)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">
                        {new Date(b.testedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      {b.notes && <span className="text-xs text-gray-400">· {b.notes}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteBenchmark(b.id)}
                    className="text-xs text-gray-300 hover:text-red-400 transition-colors shrink-0"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      })()}
    </div>
  )
}
