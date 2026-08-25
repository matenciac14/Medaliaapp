'use client'

import { useState } from 'react'
import { translateBodyPart, translateTarget } from '@/lib/gym-labels'
import { LazyGif } from '@/components/LazyGif'
import type { Exercise } from '@/domain/exercise/exercise.types'

type GridExercise = {
  id: string
  name: string
  nameEs: string | null
  bodyPart: string
  target: string
  equipment: string
  gif: string | null
  coachId: string | null
}

export default function ExercisesGrid({ exercises }: { exercises: GridExercise[] }) {
  const [detail, setDetail] = useState<Exercise | null>(null)
  const [loading, setLoading] = useState(false)

  async function openModal(id: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/coach/gym/exercises/${id}`)
      if (res.ok) setDetail(await res.json())
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {exercises.map(ex => {
          const gif = ex.gif
          return (
            <button
              key={ex.id}
              onClick={() => openModal(ex.id)}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow group text-left"
            >
              {/* GIF thumbnail */}
              <div className="bg-gray-50 aspect-square overflow-hidden">
                {gif ? (
                  <LazyGif
                    src={gif}
                    alt={ex.nameEs ?? ex.name}
                    containerClassName="w-full h-full"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-200">
                    <svg className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM14.25 8.625a3.375 3.375 0 1 1 6.75 0 3.375 3.375 0 0 1-6.75 0ZM1.5 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM17.25 19.128l-.001.144a2.25 2.25 0 0 1-.233.96 10.088 10.088 0 0 0 5.06-1.01.75.75 0 0 0 .42-.643 4.875 4.875 0 0 0-6.957-4.611 8.586 8.586 0 0 1 1.71 5.157v.003Z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3 flex flex-col gap-2">
                <p className="font-semibold text-sm text-gray-900 line-clamp-2 leading-snug">
                  {ex.nameEs ?? ex.name}
                </p>
                <div className="flex flex-wrap gap-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">
                    {translateBodyPart(ex.bodyPart)}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                    {translateTarget(ex.target)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">{ex.equipment}</span>
                  {ex.coachId ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-orange-50 text-orange-600">
                      Tuyo
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-600">
                      Global
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl px-8 py-6 shadow-xl">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin mx-auto" />
          </div>
        </div>
      )}

      {/* Detail modal — EX-09 */}
      {detail && (
        <ExerciseModal exercise={detail} onClose={() => setDetail(null)} />
      )}
    </>
  )
}

function ExerciseModal({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* GIF */}
        {exercise.gif && (
          <div className="bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={exercise.gif}
              alt={exercise.nameEs ?? exercise.name}
              className="w-full max-h-64 object-contain"
            />
          </div>
        )}

        <div className="p-5 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black leading-tight" style={{ color: '#1e3a5f' }}>
                {exercise.nameEs ?? exercise.name}
              </h2>
              {exercise.nameEs && (
                <p className="text-xs text-gray-400 mt-0.5">{exercise.name}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            <Badge color="blue">{translateBodyPart(exercise.bodyPart)}</Badge>
            <Badge color="indigo">{translateTarget(exercise.target)}</Badge>
            {exercise.difficulty && <Badge color="orange">{exercise.difficulty}</Badge>}
            {exercise.mechanic && <Badge color="gray">{exercise.mechanic}</Badge>}
            {exercise.force && <Badge color="gray">{exercise.force}</Badge>}
            {exercise.equipment && <Badge color="gray">{exercise.equipment}</Badge>}
          </div>

          {/* Muscles */}
          {exercise.secondaryMuscles.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                Músculos secundarios
              </p>
              <div className="flex flex-wrap gap-1.5">
                {exercise.secondaryMuscles.map(m => (
                  <Badge key={m} color="gray">{m}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {(exercise.instructionsEs.length > 0 || exercise.instructions.length > 0) && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Instrucciones
              </p>
              <ol className="flex flex-col gap-2">
                {(exercise.instructionsEs.length > 0
                  ? exercise.instructionsEs
                  : exercise.instructions
                ).map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-700 leading-snug">
                    <span
                      className="shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white mt-0.5"
                      style={{ backgroundColor: '#1e3a5f' }}
                    >
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Description */}
          {exercise.description && (
            <p className="text-sm text-gray-500 leading-relaxed">{exercise.description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

const BADGE_STYLES: Record<string, string> = {
  blue:   'bg-blue-50 text-blue-700',
  indigo: 'bg-indigo-50 text-indigo-700',
  orange: 'bg-orange-50 text-orange-700',
  gray:   'bg-gray-100 text-gray-600',
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${BADGE_STYLES[color] ?? BADGE_STYLES.gray}`}>
      {children}
    </span>
  )
}
