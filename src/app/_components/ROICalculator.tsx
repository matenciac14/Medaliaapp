'use client'

import { useState } from 'react'

const HOURS_PER_ATHLETE_PER_WEEK = 1.5
const COACH_HOURLY_RATE_USD = 25
const MEDALIQ_SAVES_PCT = 0.65

export default function ROICalculator() {
  const [athletes, setAthletes] = useState(10)

  const hoursSaved = Math.round(athletes * HOURS_PER_ATHLETE_PER_WEEK * MEDALIQ_SAVES_PCT)
  const moneySaved = Math.round(hoursSaved * COACH_HOURLY_RATE_USD)

  return (
    <div className="bg-[#1e3a5f]/5 border border-[#1e3a5f]/10 rounded-2xl p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <span className="inline-block bg-[#1e3a5f]/10 text-[#1e3a5f] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-widest mb-3">
            Calculadora de ROI
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-[#1e3a5f]">
            ¿Cuánto tiempo recuperas con Medaliq?
          </h3>
          <p className="text-gray-500 text-sm mt-2">
            Tiempo en seguimiento manual: mensajes, Excel, recordatorios, ajustes de plan.
          </p>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700">
              Número de atletas
            </label>
            <span className="text-2xl font-black text-[#1e3a5f]">{athletes}</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={athletes}
            onChange={(e) => setAthletes(Number(e.target.value))}
            className="w-full h-2 bg-[#1e3a5f]/20 rounded-full appearance-none cursor-pointer accent-[#ea580c]"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
            <p className="text-3xl font-black text-[#ea580c]">{hoursSaved}h</p>
            <p className="text-sm text-gray-600 mt-1 font-medium">por semana ahorradas</p>
            <p className="text-xs text-gray-400 mt-0.5">en seguimiento y ajustes</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
            <p className="text-3xl font-black text-[#16a34a]">${moneySaved}</p>
            <p className="text-sm text-gray-600 mt-1 font-medium">USD en tiempo libre</p>
            <p className="text-xs text-gray-400 mt-0.5">a $25/h tarifa promedio coach</p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Estimado conservador — Medaliq automatiza seguimiento, recordatorios y ajustes de plan.
        </p>
      </div>
    </div>
  )
}
