/**
 * Infrastructure — Prisma implementation of IPlanRepository.
 */
import type {
  IPlanRepository,
  ActivePlanContext,
  CreatePlanData,
  CreateWeekData,
  CreatedWeek,
} from '@/domain/ports/plan.repository'
import type { PlannedSession, PlannedSessionUpdate } from '@/domain/plan/plan.types'
import type { BuiltSession, GymExercise } from '@/domain/plan/session-builder'
import type { NutritionTargets } from '@/domain/ports/health-profile.repository'
import type { PrismaDbClient } from '@/lib/db/prisma-client'
import type { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getPlanWeekNumber } from '@/lib/core/week-number'
import type { Phase, SessionType as PrismaSessionType, GoalType } from '../../generated/prisma/enums'

export class PrismaPlanRepository implements IPlanRepository {
  constructor(private db: PrismaDbClient = prisma) {}

  async findActive(userId: string): Promise<ActivePlanContext | null> {
    const plan = await this.db.trainingPlan.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: {
        weeks: { orderBy: { weekNumber: 'asc' } },
      },
    })
    if (!plan) return null

    const currentWeek = getPlanWeekNumber(plan.startDate, plan.totalWeeks)
    const weekData = plan.weeks.find(w => w.weekNumber === currentWeek)
      ?? plan.weeks[plan.weeks.length - 1]

    const sessions = await this.findWeekSessions(plan.id, currentWeek)

    // Prefer goalType column; fall back to parsing name for legacy plans
    const goalType = plan.goalType
      ?? (plan.name.split(' — ')[0].replace(/^Plan /, '') || '')

    return {
      id: plan.id,
      userId: plan.userId,
      goalType,
      currentWeek,
      totalWeeks: plan.totalWeeks,
      phase: weekData?.phase ?? 'BASE',
      startDate: plan.startDate,
      sessions,
    }
  }

  async getTrainingAdherence(planId: string, weekNumber: number): Promise<number> {
    const sessions = await this.db.plannedSession.findMany({
      where: {
        week: { planId, weekNumber },
        type: { not: 'DESCANSO' },
      },
      select: { log: { select: { id: true } } },
    })
    if (sessions.length === 0) return 0
    const completed = sessions.filter(s => !!s.log).length
    return Math.round((completed / sessions.length) * 100)
  }

  async findWeekSessions(planId: string, weekNumber: number): Promise<PlannedSession[]> {
    const week = await this.db.planWeek.findFirst({
      where: { planId, weekNumber },
      include: { sessions: true },
    })
    if (!week) return []

    return week.sessions.map(s => ({
      id: s.id,
      dayOfWeek: s.dayOfWeek,
      type: s.type as PlannedSession['type'],
      intensity: (s.intensity ?? 'MODERATE') as PlannedSession['intensity'],
      durationMin: s.durationMin,
      description: s.detailText ?? null,   // DB column: detailText, domain field: description
      coachNotes: s.coachNote ?? null,
      zone: s.zoneTarget ?? null,
      weekNumber,
    }))
  }

  async updateSession(sessionId: string, data: PlannedSessionUpdate): Promise<void> {
    await this.db.plannedSession.update({
      where: { id: sessionId },
      data: {
        ...(data.intensity !== undefined && { intensity: data.intensity }),
        ...(data.durationMin !== undefined && { durationMin: data.durationMin }),
        ...(data.description !== undefined && { detailText: data.description }),  // domain: description → DB: detailText
        ...(data.coachNotes !== undefined && { coachNote: data.coachNotes }),
        ...(data.type !== undefined && { type: data.type as PrismaSessionType }),
        ...(data.zone !== undefined && { zoneTarget: data.zone }),
      },
    })
  }

  // ── Write operations (designed to be called inside $transaction) ─────────

  async deactivateUserPlans(userId: string): Promise<void> {
    await this.db.trainingPlan.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'COMPLETED' },
    })
  }

  async createPlan(data: CreatePlanData): Promise<{ id: string; totalWeeks: number }> {
    const plan = await this.db.trainingPlan.create({
      data: {
        userId: data.userId,
        name: data.name,
        goalType: (data.goalType as GoalType | undefined) ?? null,
        totalWeeks: data.totalWeeks,
        status: 'ACTIVE',
        // 'TEMPLATE' is not in PlanSource enum — map to 'AI' as closest equivalent
        generatedBy: data.generatedBy === 'TEMPLATE' ? 'AI' : data.generatedBy,
        startDate: data.startDate,
        endDate: data.endDate,
        hrZones: data.hrZones as unknown as Prisma.InputJsonValue,
      },
    })
    return { id: plan.id, totalWeeks: plan.totalWeeks }
  }

  async createWeeks(weeks: CreateWeekData[]): Promise<CreatedWeek[]> {
    return Promise.all(
      weeks.map(w =>
        this.db.planWeek.create({
          data: {
            planId: w.planId,
            weekNumber: w.weekNumber,
            phase: w.phase as Phase,
            volumeKm: w.volumeKm,
            focusDescription: w.focusDescription,
            isRecoveryWeek: w.isRecoveryWeek,
            startDate: w.startDate,
            endDate: w.endDate,
          },
          select: { id: true, weekNumber: true },
        })
      )
    )
  }

  async createSessions(sessions: BuiltSession[]): Promise<void> {
    await this.db.plannedSession.createMany({
      data: sessions.map(s => ({
        weekId: s.weekId,
        dayOfWeek: s.dayOfWeek,
        type: s.type as PrismaSessionType,
        intensity: s.intensity,
        durationMin: s.durationMin,
        zoneTarget: s.zoneTarget,
        detailText: s.detailText,
        date: s.date,
      })),
    })
  }

  async upsertNutrition(userId: string, targets: NutritionTargets): Promise<void> {
    await this.db.nutritionPlan.upsert({
      where: { userId },
      create: { userId, ...targets },
      update: targets,
    })
  }

  async findExercisesByNames(names: string[]): Promise<GymExercise[]> {
    const all = await this.db.exercise.findMany({
      where: { isGlobal: true },
      select: { id: true, name: true, muscleGroups: true, equipment: true },
    })
    // Return all exercises that match any of the requested names (partial, case-insensitive)
    return all.filter(e =>
      names.some(
        n => e.name.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(e.name.toLowerCase())
      )
    ) as GymExercise[]
  }
}
