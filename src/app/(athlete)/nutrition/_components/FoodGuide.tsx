'use client'

import { useState } from 'react'
import AddFoodModal from './AddFoodModal'
import type { FoodItem } from './types'

export type { FoodItem }

interface Props {
  foods: FoodItem[]
  proteinTarget: number
  carbsTarget: number
  fatTarget: number
  kcalTarget: number
}

type CategoryKey = 'PROTEIN' | 'DAIRY' | 'LEGUME' | 'CARB' | 'FRUIT' | 'FAT' | 'VEGETABLE'

const CATEGORIES: { key: CategoryKey; label: string; emoji: string; macro: 'protein' | 'carbs' | 'fat' | null }[] = [
  { key: 'PROTEIN',   label: 'Proteínas',   emoji: '🥩', macro: 'protein' },
  { key: 'DAIRY',     label: 'Lácteos',     emoji: '🥛', macro: 'protein' },
  { key: 'LEGUME',    label: 'Legumbres',   emoji: '🫘', macro: 'protein' },
  { key: 'CARB',      label: 'Carbohidratos', emoji: '🍚', macro: 'carbs' },
  { key: 'FRUIT',     label: 'Frutas',      emoji: '🍌', macro: 'carbs' },
  { key: 'FAT',       label: 'Grasas',      emoji: '🥑', macro: 'fat' },
  { key: 'VEGETABLE', label: 'Vegetales',   emoji: '🥦', macro: null },
]

// Badges de micronutrientes para atletas
function getMicroBadges(food: FoodItem): { label: string; color: string }[] {
  const badges: { label: string; color: string }[] = []
  if ((food.ironMg ?? 0) >= 2)     badges.push({ label: '⚡ Hierro',    color: 'bg-red-50 text-red-700 border-red-100' })
  if ((food.calciumMg ?? 0) >= 100) badges.push({ label: '🦴 Calcio',   color: 'bg-blue-50 text-blue-700 border-blue-100' })
  if ((food.potassiumMg ?? 0) >= 350) badges.push({ label: '🔋 Potasio', color: 'bg-yellow-50 text-yellow-700 border-yellow-100' })
  if ((food.vitaminCMg ?? 0) >= 20)  badges.push({ label: '🍊 Vit C',   color: 'bg-orange-50 text-orange-700 border-orange-100' })
  if ((food.magnesiumMg ?? 0) >= 50) badges.push({ label: '💪 Magnesio', color: 'bg-purple-50 text-purple-700 border-purple-100' })
  if ((food.fiberPer100g ?? 0) >= 5) badges.push({ label: '🌾 Fibra',   color: 'bg-green-50 text-green-700 border-green-100' })
  return badges
}

function r(n: number) { return Math.round(n) }

function FoodCard({ food, proteinTarget, carbsTarget, fatTarget, kcalTarget }: {
  food: FoodItem
  proteinTarget: number
  carbsTarget: number
  fatTarget: number
  kcalTarget: number
}) {
  const [expanded, setExpanded] = useState(false)

  // Macros por porción típica
  const ratio = food.servingG / 100
  const sP    = food.proteinPer100g * ratio
  const sC    = food.carbsPer100g   * ratio
  const sF    = food.fatPer100g     * ratio
  const sKcal = food.kcalPer100g    * ratio

  // % de la meta diaria que cubre la porción típica
  const pctProtein = proteinTarget > 0 ? (sP / proteinTarget) * 100 : 0
  const pctCarbs   = carbsTarget   > 0 ? (sC / carbsTarget)   * 100 : 0
  const pctFat     = fatTarget     > 0 ? (sF / fatTarget)     * 100 : 0
  const pctKcal    = kcalTarget    > 0 ? (sKcal / kcalTarget) * 100 : 0

  const badges = getMicroBadges(food)

  // Determinar el macro principal de este alimento para la barra destacada
  const cat = food.category
  let mainPct = pctKcal
  let mainLabel = 'de tus calorías'
  let barColor = 'bg-gray-400'
  if (cat === 'PROTEIN' || cat === 'DAIRY' || cat === 'LEGUME') {
    mainPct = pctProtein; mainLabel = 'de tu proteína diaria'; barColor = 'bg-blue-500'
  } else if (cat === 'CARB' || cat === 'FRUIT') {
    mainPct = pctCarbs; mainLabel = 'de tus carbohidratos diarios'; barColor = 'bg-yellow-500'
  } else if (cat === 'FAT') {
    mainPct = pctFat; mainLabel = 'de tus grasas diarias'; barColor = 'bg-green-500'
  }

  const cappedPct = Math.min(mainPct, 100)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 leading-tight">{food.name}</p>
            {food.servingLabel && (
              <p className="text-xs text-gray-400 mt-0.5">{food.servingLabel} · {r(food.servingG)}g</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-[#1e3a5f]">{r(sKcal)} kcal</p>
            <p className="text-xs text-gray-400">por porción</p>
          </div>
        </div>

        {/* Macros por porción — resumen visual */}
        <div className="flex gap-3 mt-2.5 flex-wrap">
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
            P {r(sP)}g
          </span>
          <span className="text-xs font-semibold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">
            C {r(sC)}g
          </span>
          <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
            G {r(sF)}g
          </span>
        </div>

        {/* Barra — % de la meta cubierto por 1 porción */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-400">{r(cappedPct)}% {mainLabel}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${cappedPct}%` }}
            />
          </div>
        </div>
      </button>

      {/* Expanded: detalle completo */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3">
          {/* Tabla macros por 100g vs porción */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Valores nutricionales</p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white rounded-lg p-2 border border-gray-100">
                <p className="text-gray-400 text-[10px]">Por 100g</p>
                <p className="font-bold text-gray-700 mt-0.5">{r(food.kcalPer100g)} kcal</p>
                <p className="text-blue-600 font-medium">{food.proteinPer100g}g P</p>
                <p className="text-yellow-600">{food.carbsPer100g}g C</p>
                <p className="text-green-600">{food.fatPer100g}g G</p>
              </div>
              <div className="bg-[#1e3a5f]/5 rounded-lg p-2 border border-[#1e3a5f]/10">
                <p className="text-gray-400 text-[10px]">Por porción ({r(food.servingG)}g)</p>
                <p className="font-bold text-[#1e3a5f] mt-0.5">{r(sKcal)} kcal</p>
                <p className="text-blue-700 font-semibold">{r(sP)}g P</p>
                <p className="text-yellow-700">{r(sC)}g C</p>
                <p className="text-green-700">{r(sF)}g G</p>
              </div>
              <div className="bg-white rounded-lg p-2 border border-gray-100">
                <p className="text-gray-400 text-[10px]">Para tu meta</p>
                <p className="font-bold text-gray-700 mt-0.5 text-[10px]">{r(pctKcal)}% kcal</p>
                <p className="text-blue-600 text-[10px]">{r(pctProtein)}% prot.</p>
                <p className="text-yellow-600 text-[10px]">{r(pctCarbs)}% carbs</p>
                <p className="text-green-600 text-[10px]">{r(pctFat)}% grasa</p>
              </div>
            </div>
          </div>

          {/* Cuánto comer para cubrir el macro principal */}
          {(cat === 'PROTEIN' || cat === 'DAIRY' || cat === 'LEGUME') && proteinTarget > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
              <p className="text-xs text-blue-800">
                <span className="font-semibold">Para tus {r(proteinTarget)}g de proteína:</span>{' '}
                necesitarías {r((proteinTarget / food.proteinPer100g) * 100)}g de {food.name.toLowerCase()} ({r((proteinTarget / sP))} porciones)
              </p>
            </div>
          )}

          {/* Micronutrientes */}
          {badges.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Destacado en micronutrientes</p>
              <div className="flex flex-wrap gap-1.5">
                {badges.map(b => (
                  <span key={b.label} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${b.color}`}>
                    {b.label}
                  </span>
                ))}
              </div>
              {(food.fiberPer100g ?? 0) > 0 && (
                <p className="text-[10px] text-gray-400 mt-1.5">
                  Fibra: {food.fiberPer100g}g/100g
                  {(food.calciumMg ?? 0) > 0 ? ` · Ca: ${r(food.calciumMg!)}mg` : ''}
                  {(food.ironMg ?? 0) > 0 ? ` · Fe: ${food.ironMg}mg` : ''}
                  {(food.potassiumMg ?? 0) > 0 ? ` · K: ${r(food.potassiumMg!)}mg` : ''}
                </p>
              )}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )
}

export default function FoodGuide({ foods: initialFoods, proteinTarget, carbsTarget, fatTarget, kcalTarget }: Props) {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('PROTEIN')
  const [allFoods, setAllFoods] = useState<FoodItem[]>(initialFoods)
  const [showAddModal, setShowAddModal] = useState(false)

  const categoryFoods = allFoods.filter(f => f.category === activeCategory)
  const activeCat = CATEGORIES.find(c => c.key === activeCategory)!

  function handleFoodAdded(food: FoodItem) {
    setAllFoods(prev => [...prev, food])
    setActiveCategory(food.category as CategoryKey)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Guía de alimentos</h2>
          <p className="text-xs text-gray-400 mt-0.5">Toca un alimento para ver cuánto comer</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#1e3a5f] bg-[#1e3a5f]/8 hover:bg-[#1e3a5f]/15 px-3 py-1.5 rounded-lg transition-colors"
        >
          + Agregar
        </button>
      </div>

      {showAddModal && (
        <AddFoodModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleFoodAdded}
        />
      )}

      {/* Category scroll tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
              activeCategory === cat.key
                ? 'bg-[#1e3a5f] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Context: what this category contributes */}
      {activeCat.macro && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-600">
          {activeCat.macro === 'protein' && (
            <>Tu meta de proteína hoy: <span className="font-bold text-blue-700">{r(proteinTarget)}g</span></>
          )}
          {activeCat.macro === 'carbs' && (
            <>Tu meta de carbohidratos hoy: <span className="font-bold text-yellow-700">{r(carbsTarget)}g</span></>
          )}
          {activeCat.macro === 'fat' && (
            <>Tu meta de grasas hoy: <span className="font-bold text-green-700">{r(fatTarget)}g</span></>
          )}
          {' '}— cada barra muestra cuánto de tu meta cubre 1 porción típica
        </div>
      )}

      {/* Food list */}
      {categoryFoods.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-400">No hay alimentos en esta categoría aún</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categoryFoods.map(food => (
            <FoodCard
              key={food.id}
              food={food}
              proteinTarget={proteinTarget}
              carbsTarget={carbsTarget}
              fatTarget={fatTarget}
              kcalTarget={kcalTarget}
            />
          ))}
        </div>
      )}

      <p className="text-[10px] text-gray-300 text-center pt-1">
        Valores de referencia USDA/ICBF · {allFoods.length} alimentos en la biblioteca
      </p>
    </div>
  )
}
