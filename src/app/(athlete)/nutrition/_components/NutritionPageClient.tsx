'use client'

import { useState, type ReactNode } from 'react'
import ConsumedModal from './ConsumedModal'
import DeficitHeroCard from './DeficitHeroCard'
import NutritionSummaryDonut from './NutritionSummaryDonut'
import ProximaComidaCard from './ProximaComidaCard'
import MealListInline from './MealListInline'

type ConsumedData = { kcal: number; proteinG: number; carbsG: number; fatG: number }
type TargetData = { kcal: number; proteinG: number; carbsG: number; fatG: number }
type NextMealData = { label: string; time: string; foods: string; kcal: number; proteinG: number } | null
type MealCheckItem = { mealType: string; label: string; foods: string; kcal: number; isLogged: boolean }

type Props = {
  // Slots rendered by server
  headerSlot: ReactNode
  proposalSlot: ReactNode
  activitySlot: ReactNode
  phaseBannerSlot: ReactNode
  macroCardsSlot: ReactNode
  mealPlanSlot: ReactNode
  pendingBannerSlot: ReactNode
  mealCardsSlot: ReactNode
  menuLinksSlot: ReactNode
  trackingSectionSlot: ReactNode
  hydrationSlot: ReactNode
  adherenceSlot: ReactNode
  tipSlot: ReactNode
  emptyMealPlanSlot: ReactNode
  coachBannerSlot: ReactNode
  weeklyMenuSlot: ReactNode
  initSlot: ReactNode
  foodGuideSlot: ReactNode
  // Data for client-only components
  consumed: ConsumedData | null
  target: TargetData | null
  nextMeal: NextMealData
  mealChecklist: MealCheckItem[]
  hasMealPlan: boolean
  state: 'sin-plan' | 'con-plan' | 'b2b'
}

export default function NutritionPageClient({
  headerSlot, proposalSlot, activitySlot, phaseBannerSlot, macroCardsSlot,
  mealPlanSlot, pendingBannerSlot, mealCardsSlot, menuLinksSlot, trackingSectionSlot,
  hydrationSlot, adherenceSlot, tipSlot, emptyMealPlanSlot, coachBannerSlot,
  weeklyMenuSlot, initSlot, foodGuideSlot,
  consumed, target, nextMeal, mealChecklist, hasMealPlan, state,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  const consumedSafe = consumed ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  const targetSafe = target ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }

  // ── Sidebar content (reused in desktop right column + mobile inline) ──
  const sidebarContent = (
    <div className="space-y-4">
      {/* Hydration */}
      {hydrationSlot}

      {/* Adherence */}
      {adherenceSlot}

      {/* Distribution donut (only with consumed data) */}
      {target && state !== 'sin-plan' && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Distribucion hoy</p>
          <NutritionSummaryDonut consumed={consumedSafe} target={targetSafe} />
        </div>
      )}

      {/* Tip */}
      {tipSlot}

      {/* Next meal */}
      {nextMeal && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Proxima comida</p>
          <ProximaComidaCard
            mealLabel={nextMeal.label}
            scheduledTime={nextMeal.time}
            foods={nextMeal.foods}
            kcal={nextMeal.kcal}
            proteinG={nextMeal.proteinG}
          />
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* ─── Desktop: 2-column layout ─── */}
      <div className="hidden lg:grid lg:grid-cols-5 lg:gap-6 lg:items-start">
        {/* LEFT — Main column (3/5) */}
        <div className="lg:col-span-3 space-y-5">
          {headerSlot}
          {proposalSlot}
          {activitySlot}
          {phaseBannerSlot}
          {macroCardsSlot}
          {initSlot}

          {/* State-specific content */}
          {state === 'sin-plan' && emptyMealPlanSlot}

          {state === 'con-plan' && target && (
            <DeficitHeroCard
              consumed={consumedSafe}
              target={targetSafe}
              onViewConsumed={() => setModalOpen(true)}
              onRegister={() => {
                const el = document.getElementById('tracking')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}
            />
          )}

          {state === 'b2b' && coachBannerSlot}

          {weeklyMenuSlot}
          {pendingBannerSlot}
          {mealCardsSlot}
          {mealPlanSlot}
          {menuLinksSlot}

          <div id="tracking">{trackingSectionSlot}</div>

          {foodGuideSlot}
        </div>

        {/* RIGHT — Sidebar (2/5) */}
        <div className="lg:col-span-2">
          {sidebarContent}
        </div>
      </div>

      {/* ─── Mobile: single column ─── */}
      <div className="lg:hidden space-y-5">
        {headerSlot}
        {proposalSlot}
        {activitySlot}
        {phaseBannerSlot}
        {macroCardsSlot}
        {initSlot}

        {state === 'sin-plan' && emptyMealPlanSlot}

        {state === 'con-plan' && target && (
          <DeficitHeroCard
            consumed={consumedSafe}
            target={targetSafe}
            onViewConsumed={() => setModalOpen(true)}
            onRegister={() => {
              const el = document.getElementById('tracking-mobile')
              el?.scrollIntoView({ behavior: 'smooth' })
            }}
          />
        )}

        {state === 'b2b' && coachBannerSlot}

        {/* Hydration inline */}
        {hydrationSlot}

        {/* Meal checklist (mobile — inline list) */}
        {hasMealPlan && mealChecklist.length > 0 && (
          <MealListInline
            meals={mealChecklist}
            totalLogged={mealChecklist.filter(m => m.isLogged).length}
            totalPlanned={mealChecklist.length}
          />
        )}

        {/* Next meal highlight */}
        {nextMeal && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-[#ea580c] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Proxima</span>
              <span className="text-sm font-bold text-[#1e3a5f]">{nextMeal.label}</span>
              <span className="ml-auto text-sm font-bold text-[#ea580c]">~{nextMeal.kcal} kcal</span>
            </div>
            <p className="text-xs text-gray-500">{nextMeal.foods}</p>
            <button
              onClick={() => {
                const el = document.getElementById('tracking-mobile')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="w-full h-10 rounded-xl bg-[#ea580c] text-white text-sm font-bold hover:opacity-90 transition-opacity"
            >
              + Registrar {nextMeal.label.toLowerCase()}
            </button>
          </div>
        )}

        {weeklyMenuSlot}
        {pendingBannerSlot}
        {mealCardsSlot}
        {mealPlanSlot}
        {menuLinksSlot}

        {/* Adherence */}
        {adherenceSlot}

        {/* Tip */}
        {tipSlot}

        <div id="tracking-mobile">{trackingSectionSlot}</div>

        {foodGuideSlot}
      </div>

      {/* Consumed modal */}
      <ConsumedModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
