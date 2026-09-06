import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { loadAthleteData } from '@/infrastructure/db/athlete_loader'
import { getPlanPageData } from './_lib/get_plan_data'
import PlanClient from './_components/PlanClient'
import PlanTrackingClient from './_components/PlanTrackingClient'
import PlanCompletedClient from './_components/PlanCompletedClient'

export default async function PlanPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const isB2B = session.user.isB2B ?? false

  // JWT may be stale post-onboarding — verify DB before showing tracking state
  if (!session.user.features?.plan) {
    const { activePlanMeta } = await loadAthleteData(session.user.id, ['activePlanMeta'])
    if (!activePlanMeta) {
      // No plan feature + no active plan → fetch calWeek for tracking mode
      const data = await getPlanPageData(session.user.id, isB2B)
      return (
        <PlanTrackingClient
          isB2B={isB2B}
          initialCalendarWeek={data.initialCalendarWeek}
          nutritionTarget={data.nutritionTarget}
          weightData={data.weightData}
          bodyMeasures={data.bodyMeasures}
        />
      )
    }
  }

  const data = await getPlanPageData(session.user.id, isB2B)

  if (data.state === 'active' && data.plan) {
    return (
      <PlanClient
        plan={data.plan}
        weeks={data.weeks}
        initialCalendarWeek={data.initialCalendarWeek}
        nutritionTarget={data.nutritionTarget}
        weightData={data.weightData}
        checkInData={data.checkInData}
        bodyMeasures={data.bodyMeasures}
        hrZones={data.hrZones}
        coachName={data.coachName}
        raceDays={data.raceDays}
        pendingSuggestionsCount={data.pendingSuggestionsCount}
        todayConsumed={data.todayConsumed}
        isB2B={isB2B}
      />
    )
  }

  if (data.state === 'completed' && data.completedPlan) {
    return (
      <PlanCompletedClient
        isB2B={isB2B}
        planName={data.completedPlan.name}
        totalWeeks={data.completedPlan.totalWeeks}
        endDate={data.completedPlan.endDate}
        sessionsLogged={data.completedPlan.sessionsLogged}
        sessionsTotal={data.completedPlan.sessionsTotal}
        recoveryDaysSinceEnd={data.completedPlan.recoveryDaysSinceEnd}
        completedAdherencePct={data.completedPlan.completedAdherencePct}
        lastWeekSessions={data.completedPlan.lastWeekSessions}
        phases={data.completedPlan.phases}
        currentWeek={data.completedPlan.totalWeeks}
        nutritionTarget={data.nutritionTarget}
        weightData={data.weightData}
        checkInData={data.checkInData}
        bodyMeasures={data.bodyMeasures}
        hrZones={data.hrZones}
      />
    )
  }

  // No active plan, no completed plan → tracking mode
  return (
    <PlanTrackingClient
      isB2B={isB2B}
      initialCalendarWeek={data.initialCalendarWeek}
      nutritionTarget={data.nutritionTarget}
      weightData={data.weightData}
      bodyMeasures={data.bodyMeasures}
    />
  )
}
